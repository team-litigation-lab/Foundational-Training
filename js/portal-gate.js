/* ============================================================
   🔐 Trainees sign in on the LSH Training Portal only
   Trainees log in once, on the Main Portal, and open each program from
   there: they never see a sign-in form on a program's own link. The
   Portal sends them here with a signed, short-lived ticket
   (?ticket=…); the Worker checks it (/api/auth/portal) and the trainee
   is signed in, registered and waiting for approval exactly as before.
   Someone who opens this program's link directly sees a short note
   with a button back to the Portal instead of a form. Admins sign in on the
   Portal too and arrive with their own ticket, so they aren't asked for the
   passphrase; it stays only for someone who opens the link directly (the
   small 🛡 link on that note).
   It turns on when the Worker has PORTAL_SSO_SECRET (/api/auth/status
   says portalOnly); until then the old name + batch form stays, so
   nothing locks anyone out before the secret is set on both sides.
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
var pending = null;     // the trainee the Portal vouched for, until their registration has been processed
var notice = "";

function esc(t){ return String(t==null?"":t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

window.portalGate = {
  active: function(){ return typeof state !== "undefined" && state.portalOnly === true; },
  // Headers for the trainee sign-in call: a signed-in trainee's own token lets the Worker renew their session.
  headers: function(){
    var h = {"Content-Type":"application/json"};
    try{ if(state.authToken) h.Authorization = "Bearer " + state.authToken; }catch(e){}
    return h;
  },
  // Runs at boot, once the engine has loaded: learns whether the Portal is the only way in, then signs in whoever arrived with a ticket.
  init: async function(){
    try{ await authStatus(); }catch(e){}
    if(!ticket || !state.portalOnly) return;
    var t = ticket; ticket = "";
    try{
      var r = await fetch("/api/auth/portal", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ticket:t})});
      var j = await r.json().catch(function(){ return {}; });
      if(!r.ok || !j.token){ notice = j.error || "We couldn't sign you in from the LSH Training Portal. Open the program from the Portal again."; return; }
      if(j.admin){ setAdminToken(j.token); return; }                                        // an admin signed in on the Portal: no passphrase here (boot picks up the token)
      if(state.traineeId && state.traineeId === j.id){ setTraineeToken(j.token); return; }   // already signed in as them
      if(state.traineeId){ try{ await logout(); }catch(e){} }                               // someone else was signed in on this device
      setTraineeToken(j.token);
      pending = j;
    }catch(e){ notice = "We couldn't reach the server to sign you in. Check your connection and open the program from the LSH Training Portal again."; }
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
        Promise.resolve(window.submitLogin()).then(function(){ if(state.view === "login") render(); });
      }, 0);
      return '<div class="login-shell"><div class="login-card">'+logo
        + '<h1 style="font-size:22px;color:var(--navy);margin:0 0 8px;">Signing you in…</h1>'
        + '<p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 6px;">Opening your training from the LSH Training Portal.</p>'
        + '<input type="hidden" id="loginLastInput" value="'+esc(p.last)+'"><input type="hidden" id="loginFirstInput" value="'+esc(p.first)+'"><input type="hidden" id="loginBatchInput" value="'+esc(p.batch)+'">'
        + '<button id="loginSubmitBtn" class="btn btn-primary" style="display:none"></button>'
        + '</div></div>';
    }
    var msg = notice; notice = "";
    return '<div class="login-shell"><div class="login-card">'+logo
      + '<h1 style="font-size:22px;color:var(--navy);margin:0 0 8px;">'+esc(String(document.title||"Training Program").replace(/^LSH\s+/,""))+'</h1>'
      + (msg ? '<p style="font-size:13.5px;color:#b3261e;margin:0 0 14px;">'+esc(msg)+'</p>' : '')
      + '<p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 22px;">You sign in once, on the LSH Training Portal, and open this training from there. There is no separate sign-in here.</p>'
      + '<a class="btn btn-primary" href="'+PORTAL_HOME+'" style="width:100%;justify-content:center;padding:12px;box-sizing:border-box;text-decoration:none;">Go to the LSH Training Portal</a>'
      + '<div style="margin-top:22px;font-size:11.5px;color:var(--ink-soft);">Trainer or admin? <a href="#" onclick="event.preventDefault(); openAdmin();" style="color:var(--navy);font-weight:600;">Sign in with your passphrase</a></div>'
      + '</div></div>';
  }
};
})();
