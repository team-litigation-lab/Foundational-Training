/* ============================================================
   🔐 Trainees sign in on the LSH Training Portal only
   Trainees log in once, on the Main Portal, and open each program from
   there: they never see a sign-in form on a program's own link. The
   Portal sends them here with a signed, short-lived ticket
   (?ticket=…); the Worker checks it (/api/auth/portal) and the trainee
   is signed in, registered and waiting for approval exactly as before.
   Someone who opens this program's link directly sees a short note
   with a button back to the Portal instead of a form. Admins sign in on the
   Portal too, but every platform asks an admin for the admin password: no
   ticket signs an admin in (the Admin Portal tab on that note).
   Single sign-on is how every LSH platform works now: there is no name +
   batch form on a program's own site any more, whatever the Worker is
   configured with. The Worker needs PORTAL_SSO_SECRET (the Portal's value)
   to check a ticket; until it is set, this screen tells an administrator so
   in as many words, instead of a trainee meeting a dead end.
   Existing registrations and saved sessions are untouched.
   The same file is in every LSH course repo; change it in all of them.
   ============================================================ */
(function(){
"use strict";
var PORTAL_HOME = "https://cm-training-activity.pages.dev/";

// Take the ticket out of the address straight away, so it isn't kept in history or sent on in a refresh.
var ticket = "";
try{
  var u = new URL(location.href);
  ticket = u.searchParams.get("ticket") || "";
  if(ticket){ u.searchParams.delete("ticket"); history.replaceState(history.state, "", u.pathname + (u.search || "") + u.hash); }
}catch(e){}
// A page opened from the Portal (it carries a ticket) stays behind a plain "opening" cover until the sign-in has settled,
// so the dashboard shell, the "Signing you in…" card and the dashboard don't flash one after another.
var wantAdmin = false;
try{ wantAdmin = new URL(location.href).searchParams.get("admin") === "1"; }catch(e){}
var cover = null;
function uncover(delay){
  setTimeout(function(){ if(cover && cover.parentNode) cover.parentNode.removeChild(cover); cover = null; }, delay || 0);
}
if(ticket){
  try{
    cover = document.createElement("div");
    cover.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:#eef1f6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font:600 15px Arial,Helvetica,sans-serif;color:#0f2148";
    // A spinner and a line that moves on, so a slow sign-in reads as "working"
    // rather than a frozen grey screen. The program is a large page and the
    // sign-in is a few calls to the server, so this can be a few seconds on a
    // slow connection.
    cover.innerHTML = '<style>@keyframes lsh-spin{to{transform:rotate(360deg)}}</style>'
      + '<div style="width:34px;height:34px;border:3px solid #d3d9e6;border-top-color:#DB8437;border-radius:50%;animation:lsh-spin .8s linear infinite"></div>'
      + '<div id="portal-cover-msg">Opening your training…</div>';
    document.documentElement.appendChild(cover);
    var steps = [
      [3500, "Signing you in…"],
      [7000, "Almost there — loading your program…"]
    ];
    steps.forEach(function(s){
      setTimeout(function(){
        var m = cover && cover.querySelector("#portal-cover-msg");
        if(m) m.textContent = s[1];
      }, s[0]);
    });
    setTimeout(function(){ uncover(0); }, 10000);   // never leave the cover on if something goes wrong
  }catch(e){ cover = null; }
}
var pending = null;     // the trainee the Portal vouched for, until their registration has been processed
var notice = "";
var secretMissing = false;   // single sign-on is on but this Worker has no PORTAL_SSO_SECRET: nobody can be signed in

function esc(t){ return String(t==null?"":t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

window.portalGate = {
  active: function(){ return true; },
  // Headers for the trainee sign-in call: a signed-in trainee's own token lets the Worker renew their session.
  headers: function(){
    var h = {"Content-Type":"application/json"};
    try{ if(state.authToken) h.Authorization = "Bearer " + state.authToken; }catch(e){}
    return h;
  },
  // Runs at boot, once the engine has loaded: learns whether the Portal is the only way in, then signs in whoever arrived with a ticket.
  init: async function(){
    try{ await authStatus(); }catch(e){}
    // authStatus() above has already asked the Worker; it costs no request of its own.
    try{ secretMissing = !!(state.portalOnly && state.portalSecret === false); }catch(e){}
    // The Portal sends an administrator here as /?admin=1 (no ticket: admins type the admin password). A trainee session
    // saved in this browser (an earlier test, a shared computer) is signed out first, so the admin password prompt shows
    // instead of that trainee's dashboard.
    if(wantAdmin && state.traineeId && !state.adminToken){ try{ await logout(); }catch(e){} }
    if(!ticket){ uncover(150); return; }
    var t = ticket; ticket = "";
    // Arriving from the Portal lands on the dashboard (it has its own "Resume where you left off" button) instead of
    // jumping straight into the last slide: the engine's automatic resume is skipped once, then restored for that button.
    var resumeOrig = window.resumeWhereLeftOff;
    if(typeof resumeOrig === "function"){
      window.resumeWhereLeftOff = function(){
        window.resumeWhereLeftOff = resumeOrig;
        state.resumePending = false;
        if(state.view === "login" || state.view === "pendingApproval") return;
        state.view = "clientprofile";
        render();
      };
    }
    try{
      var r = await fetch("/api/auth/portal", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ticket:t})});
      var j = await r.json().catch(function(){ return {}; });
      // An admin from the Portal is never a trainee here: a trainee session saved in this browser (an earlier test, a
      // shared computer) is signed out first, or it would open the trainee's dashboard instead of the admin screen.
      if((j.code === "admin-password" || j.admin) && state.traineeId){ try{ await logout(); }catch(e){} }
      if(j.code === "admin-password"){ wantAdmin = true; uncover(0); return; }   // administrators always type the admin password: straight to that prompt
      if(!r.ok || !j.token){ notice = j.error || "We couldn't sign you in from the LSH Training Portal. Open the program from the Portal again."; uncover(0); return; }
      if(j.admin){ setAdminToken(j.token); uncover(250); return; }                                        // an admin signed in on the Portal: no password here (boot picks up the token)
      if(state.traineeId && state.traineeId === j.id){ setTraineeToken(j.token); uncover(250); return; }   // already signed in as them
      if(state.traineeId){ try{ await logout(); }catch(e){} }                               // someone else was signed in on this device
      setTraineeToken(j.token);
      pending = j;
    }catch(e){ notice = "We couldn't reach the server to sign you in. Check your connection and open the program from the LSH Training Portal again."; uncover(0); }
  },
  // The sign-in screen's tabs (Trainee Portal / Admin Portal) switch in place: the page isn't re-rendered.
  tab: function(t){
    var box = document.getElementById("gate-box"); if(!box) return;
    box.className = t === "admin" ? "admin" : "";
    [].forEach.call(box.querySelectorAll(".tab"), function(b){ b.classList.toggle("on", b.getAttribute("data-t") === t); });
    [].forEach.call(box.querySelectorAll(".pane"), function(p){ p.classList.toggle("on", p.getAttribute("data-p") === t); });
    if(t === "admin"){ var i = document.getElementById("gate-apass"); if(i) setTimeout(function(){ i.focus(); }, 30); }
  },
  // The admin password, checked by the Worker (/api/auth/admin) exactly as the engine's own Admin prompt does.
  admin: async function(){
    var i = document.getElementById("gate-apass"), e = document.getElementById("gate-aerr"); if(!i) return;
    var say = function(t){ if(e){ e.textContent = t; e.style.display = t ? "block" : "none"; } };
    say("");
    if(!i.value){ say("Enter the admin password."); return; }
    try{
      var res = await fetch("/api/auth/admin", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({passphrase:i.value})});
      if(!res.ok){ say("Incorrect password."); return; }
      var j = await res.json();
      setAdminToken(j.token); state.isAdmin = true; goto("admin");
    }catch(err){ say("Couldn't reach the server. Please try again."); }
  },
  // What the sign-in screen shows. With a Portal ticket it registers the trainee (the engine's own steps) on their way in.
  renderCard: function(){
    var logo = (typeof LOGO_FULL_SRC !== "undefined") ? '<img src="'+LOGO_FULL_SRC+'" alt="Legal Support Help" style="width:150px;height:auto;margin-bottom:22px;">' : "";
    if(state.isAdmin){            // an admin who came in from the Portal (or is signed in): straight to the admin screen
      setTimeout(function(){ if(state.isAdmin && state.view === "login") goto("admin"); }, 0);
      return '<div class="login-shell"><div class="login-card">'+logo
        + '<h1 style="font-size:22px;color:var(--navy);margin:0 0 8px;">Opening the admin screen…</h1></div></div>';
    }
    if(pending){
      var p = pending;
      setTimeout(function(){
        if(!pending) return;
        pending = null;
        Promise.resolve(window.submitLogin()).then(function(){ if(state.view === "login") render(); uncover(200); }, function(){ uncover(0); });
      }, 0);
      return '<div class="login-shell"><div class="login-card">'+logo
        + '<h1 style="font-size:22px;color:var(--navy);margin:0 0 8px;">Signing you in…</h1>'
        + '<p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 6px;">Opening your training from the LSH Training Portal.</p>'
        + '<input type="hidden" id="loginLastInput" value="'+esc(p.last)+'"><input type="hidden" id="loginFirstInput" value="'+esc(p.first)+'"><input type="hidden" id="loginBatchInput" value="'+esc(p.batch)+'">'
        + '<button id="loginSubmitBtn" class="btn btn-primary" style="display:none"></button>'
        + '</div></div>';
    }
    wantAdmin = false;   // /?admin=1 (and the Portal's admin launch) is handled above; the gate itself always opens on its own tabs
    var msg = notice; notice = "";
    var program = esc(String(document.title||"Training Program").replace(/^LSH\s+/,""));
    return '<style>'
      + '#gate-box{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;color:#fff;font-family:"IBM Plex Sans",Arial,Helvetica,sans-serif;'
      +   '--acc:#f97316;--acc-h:#fb923c;--glow:#132a5c;background:radial-gradient(circle at 30% 20%,var(--glow),#081226 70%)}'
      + '#gate-box.admin{--acc:#ef4444;--acc-h:#f87171;--glow:#3b0d0d}'
      + '#gate-box .gb{width:420px;max-width:100%;margin:auto;background:rgba(255,255,255,.03);border:1px solid #1e2c4d;border-top:3px solid var(--acc);border-radius:12px;padding:32px;box-shadow:0 30px 80px rgba(0,0,0,.5)}'
      + '#gate-box .brand{display:flex;align-items:center;gap:12px;margin-bottom:22px}'
      + '#gate-box .brand img{height:44px;width:auto;border-radius:8px;background:#fff;padding:4px 8px;box-sizing:border-box;border:2px solid var(--acc)}'
      + '#gate-box .brand h1{font-size:16px;font-weight:900;text-transform:uppercase;margin:0;letter-spacing:.04em}'
      + '#gate-box .brand span{display:block;font-size:10px;color:var(--acc);font-weight:700;letter-spacing:.06em}'
      + '#gate-box .tabs{display:flex;gap:6px;margin-bottom:20px;background:#0d1c3d;border-radius:8px;padding:4px}'
      + '#gate-box .tab{flex:1;text-align:center;padding:9px 6px;border-radius:6px;cursor:pointer;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;border:0;background:transparent}'
      + '#gate-box .tab.on{background:var(--acc);color:#0f2148}'
      + '#gate-box .pane{display:none}#gate-box .pane.on{display:block}'
      + '#gate-box h1{font-family:inherit;color:#fff}'
      + '#gate-box p{font-size:13px;line-height:1.5;color:#cbd5e1;margin:0 0 16px;font-weight:400;font-family:inherit}'
      + '#gate-box .err{color:#fca5a5;font-weight:700}'
      + '#gate-box label{display:block;color:#94a3b8;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}'
      + '#gate-box input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:6px;border:1px solid #1e2c4d;background:#0d1c3d;color:#fff;font-family:"IBM Plex Mono","Courier New",monospace;font-size:13px;outline:none;margin-bottom:12px}'
      + '#gate-box input:focus{border-color:var(--acc)}'
      + '#gate-box .go{display:block;width:100%;box-sizing:border-box;padding:12px;border-radius:6px;border:0;background:var(--acc);color:#0f2148;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:.05em;text-align:center;text-decoration:none;cursor:pointer}'
      + '#gate-box .go:hover{background:var(--acc-h)}'
      + '</style>'
      + '<div id="gate-box" class="admin"><div class="gb">'
      +   '<div class="brand"><img src="'+((typeof LOGO_FULL_SRC !== "undefined") ? LOGO_FULL_SRC : "/favicon.png")+'" alt="" onerror="this.style.display=\'none\'"><div><h1>Legal Support Help</h1><span>Training Interface Access</span></div></div>'
      +   '<div class="pane on" data-p="admin">'
      +     (msg ? '<p class="err">'+esc(msg)+'</p>' : '')
      +     '<p>Administrators sign in with the admin password. Trainees are signed in automatically when they open this training from the LSH Training Portal.</p>'
      +     (secretMissing ? '<p class="err">This program isn\'t connected to the LSH Training Portal yet: set PORTAL_SSO_SECRET on its Worker, to the same value as the Portal\'s. Until then no trainee can be signed in.</p>' : '')
      +     '<div id="gate-aerr" class="err" style="display:none;margin:0 0 10px;font-size:12px"></div>'
      +     '<label for="gate-apass">Admin password</label><input id="gate-apass" type="password" autocomplete="off" onkeydown="if(event.key===\'Enter\')portalGate.admin()">'
      +     '<button type="button" class="go" onclick="portalGate.admin()">Sign in</button>'
      +     '<p style="margin:14px 0 0;font-size:12px;text-align:center"><a href="'+PORTAL_HOME+'" style="color:#94a3b8">Trainee? Open this from the LSH Training Portal</a></p>'
      +   '</div>'
      + '</div></div>';
  }
};
})();
