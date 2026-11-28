/* ============================================================
   🗓 THE ATTORNEY CALENDAR MANAGEMENT ACTIVITY, ITS OWN PAGE (#/calactivity)
   (the owner: "create the cards and the instructions in a separate card (split screen to this) and link to the calendar
   simulator on the academy index, then a route to return to the lesson once done, so the scores set up in the simulator
   come in too, in real time")
     • On the left, the activity's own cards, as the Day 5 deck has them (build/day-decks.cjs FT_CAL_ACTIVITY): its
       Instructions (1–5, 6–9) and its ten Activity Items, each at the trainee's own dates (FTDayDecks.calDates).
     • On the right, the LSH Training Portal's Calendar Simulator, the Standard Training - Calendaring Activity track (the
       Academy Index's): it can't be shown inside this page (a frame here doesn't carry the trainee's Portal sign-in, it
       showed the Portal's login), so it opens beside this page, in a window on the right half of the screen, signed in.
     • ⚡ Its score comes back on its own: while the page is open, and each time the trainee comes back to it, the platform
       asks the Portal for the latest scorecard (worker.js /api/sim-scores/sync, the trainee's own) and shows it here; the
       same score is on 🏅 My Performance and the trainer's Batch Sheet (labreview:<id>.acts["atty-calendar-activity"]).
       Once a score is in, the "✓ Submitted · 📚 Back to my lesson" bar (js/ft-lab-route.js) takes the trainee back.
   ============================================================ */
(function(){
  "use strict";
  if(typeof document === "undefined") return;
  const AK = "atty-calendar-activity";
  const C = {rev: null, at: 0, busy: false, timer: null, seen: null};
  const e = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const data = () => window.FT_CAL_ACTIVITY || {ins: "", items: []};
  const isTrainee = () => !!state.traineeId && !state.isAdmin;
  const result = () => (((C.rev || {}).acts) || {})[AK] || null;

  // 🔗 the Portal's calendar, signed in (js/ft-simulators.js portalHref), on the right half of the screen
  function simUrl(){ return typeof window.ftsPortalHref === "function" ? ftsPortalHref("gcal.html") + "&track=activity" : null; }
  function openSim(){
    const url = simUrl();
    if(!url){ if(window.ftsCalsim) return ftsCalsim("activity"); return; }
    const sw = screen.availWidth || 1600, sh = screen.availHeight || 900, half = Math.floor(sw / 2), left = (screen.availLeft || 0) + half;
    const w = window.open(url, "lsh-calendar-activity", `popup=yes,left=${left},top=${screen.availTop || 0},width=${half},height=${sh}`);
    if(!w) window.open(url, "_blank", "noopener");
    C.opened = Date.now(); paint();
  }

  // ⚡ the latest score: the Portal's scorecard brought in (the trainee's own), then read back
  async function refresh(force){
    if(C.busy || (!force && Date.now() - C.at < 20000)) return;
    C.busy = true; paint();
    try{
      if(isTrainee() && typeof authFetch === "function") await authFetch("/api/sim-scores/sync", {}).catch(() => null);
      const id = state.traineeId;
      if(id && typeof sharedGet === "function") C.rev = (await sharedGet("labreview:" + id).catch(() => null)) || C.rev || {};
    }finally{ C.busy = false; C.at = Date.now(); }
    const r = result(), key = r && r.score != null ? `${r.score}|${r.simAt || r.at || ""}` : null;
    // (a new score: handed in — the way back to the lesson)
    if(key && C.seen !== null && key !== C.seen && window.ftActivityDone) ftActivityDone();
    C.seen = key; paint();
  }

  function scoreHtml(){
    if(!isTrainee()) return `<p class="ca-note">Trainers see each trainee's score on 🏅 Scorecards (📋 Batch Sheet) and 🧑‍🏫 Graders → 📝 Assessments.</p>`;
    const r = result();
    if(!r || r.score == null) return `<div class="ca-score ca-score-none"><b>No score yet</b><span>Book every item on the calendar, then press <b>Check my calendar</b> there. Your score comes in here by itself.</span></div>`;
    const by = r.source === "simulator" ? "the Calendar Simulator’s check" : "your trainer";
    return `<div class="ca-score ${r.status === "Passed" ? "ca-ok" : r.status === "Failed" ? "ca-no" : ""}"><b>${e(r.score)}%</b><span>${e(r.status || "")} · from ${by}${r.simAt || r.at ? ` · ${e(new Date(r.simAt || r.at).toLocaleString())}` : ""}</span></div>`;
  }
  function paint(){
    const box = document.getElementById("ca-live"); if(!box) return;
    box.innerHTML = scoreHtml() + `<p class="ca-sync">${C.busy ? "⏳ Checking for your score…" : C.at ? `Checked ${new Date(C.at).toLocaleTimeString()} · it checks again by itself` : ""}</p>`;
  }

  function page(){
    const d = data();
    return `<div class="ca-top"><div><p class="lp-eyebrow">Day 5 · Calendar Management</p><h1>🗓 Attorney Calendar Management Activity</h1></div>
        <button type="button" class="btn ca-back" onclick="FTLabRoute.home()">📚 Back to the lesson</button></div>
      <div class="ca-split">
        <section class="ca-left ftdd-sheet">
          <div class="ca-card"><p class="ca-card-h">📋 Instructions <span>Remember the RULES!</span></p>${d.ins}</div>
          <div class="ca-card"><p class="ca-card-h">📅 The Activity Items <span>book each one on the attorney’s calendar</span></p>${(d.items || []).join("")}</div>
        </section>
        <aside class="ca-right">
          <div class="ca-card ca-sim"><p class="ca-card-h">🗓 The Calendar Simulator</p>
            <p>The attorney’s calendar is on the <b>LSH Training Portal</b> (🎓 LSH Academy Index → Standard Training - Calendaring Activity). It opens <b>beside this page</b>, already signed in: keep these cards on the left while you book.</p>
            <button type="button" class="btn btn-navy ca-open" onclick="FTCalActivity.open()">🗓 Open the calendar beside this page ↗</button>
            <ol class="ca-steps"><li>Book every Activity Item on the calendar, with its time zone, color, location, guests, reminders and notes.</li>
              <li>Press <b>Check my calendar</b> on the simulator when you’re done.</li><li>Come back here: your score comes in by itself, then 📚 back to the lesson.</li></ol></div>
          <div class="ca-card"><p class="ca-card-h">🏅 Your score</p><div id="ca-live"></div>
            <button type="button" class="btn btn-ghost btn-sm" onclick="FTCalActivity.refresh(true)">↻ Check now</button></div>
        </aside>
      </div>`;
  }

  window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["calactivity"]);
  window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {calactivity: "Attorney Calendar Management Activity"});
  const __render = window.render;
  window.render = function(){
    if(state.view !== "calactivity"){ clearInterval(C.timer); C.timer = null; return __render.apply(this, arguments); }
    if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
    const app = document.getElementById("app");
    app.innerHTML = renderTopbar() + `<main class="main-ftdd main-ca ft-body">${page()}</main>` + renderFooter();
    try{ afterRender(); }catch(err){}
    try{ const el = document.querySelector("main.main-ca"); if(window.FTDayDecks && FTDayDecks.calDates) FTDayDecks.calDates(el); }catch(err){}
    paint(); refresh(true);
    // (⚡ while the page is open: every 45 s, and at once as the trainee comes back from the simulator's window)
    if(!C.timer) C.timer = setInterval(() => { if(state.view === "calactivity" && document.visibilityState === "visible") refresh(); }, 45000);
  };
  const back = () => { if(state.view === "calactivity") refresh(true); };
  window.addEventListener("focus", back);
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") back(); });
  window.FTCalActivity = {open: openSim, refresh, url: simUrl};

  const st = document.createElement("style"); st.id = "ft-calactivity"; st.textContent = `
main.main-ca{max-width:none !important;padding:18px clamp(16px,2vw,36px) 40px !important;display:flex;flex-direction:column;gap:14px;}
.ca-top{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.ca-top h1{margin:0;font:800 30px/1.15 'Poppins','Inter',sans-serif;color:#1E2340;}
.ca-back{background:#E9CC7E !important;color:#1E2340 !important;border:0 !important;font-weight:800 !important;}
.ca-split{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,1fr);gap:16px;align-items:start;}
main.main-ca .ca-left.ftdd-sheet{height:auto !important;max-height:none !important;overflow:visible !important;padding:0 !important;background:none !important;box-shadow:none !important;display:flex;flex-direction:column;gap:14px;}
.ca-right{position:sticky;top:12px;display:flex;flex-direction:column;gap:14px;}
.ca-card{border:2px solid #343C66;border-radius:14px;background:#fff;padding:0 16px 16px;box-shadow:0 6px 16px rgba(30,35,64,.12);}
.ca-card .ca-card-h, main.main-ca .ftdd-sheet .ca-card > p.ca-card-h{margin:0 -16px 12px !important;padding:11px 16px !important;background:#1E2340 !important;color:#fff !important;font:800 17px/1.3 'Poppins','Inter',sans-serif;border-bottom:3px solid #E8590C;border-radius:12px 12px 0 0;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;}
.ca-card .ca-card-h span{font:700 13px/1.3 'Inter',sans-serif;color:#FFD7B5;}
.ca-sim p, .ca-steps li{font-size:15px;line-height:1.5;color:#1E2340;}
.ca-open{width:100%;font-size:17px !important;padding:13px 16px !important;border-radius:12px;margin:4px 0 6px;}
.ca-steps{margin:8px 0 0;padding-left:20px;display:grid;gap:4px;}
.ca-score{display:flex;flex-direction:column;gap:2px;padding:12px 14px;border-radius:12px;background:#F1F3FA;}
.ca-score b{font:900 30px/1.1 'Poppins','Inter',sans-serif;color:#1E2340;} .ca-score span{font-size:14px;color:#3F4560;font-weight:600;}
.ca-score.ca-ok{background:#E6F6EC;} .ca-score.ca-ok b{color:#1F7A45;} .ca-score.ca-no{background:#FDECEC;} .ca-score.ca-no b{color:#B42318;}
.ca-score-none b{font-size:18px;} .ca-sync{margin:8px 0 6px;font-size:12.5px;color:#5A6080;} .ca-note{font-size:14px;color:#3F4560;}
@media (max-width:1000px){ .ca-split{grid-template-columns:minmax(0,1fr);} .ca-right{position:static;} }
`; document.head.appendChild(st);
})();
