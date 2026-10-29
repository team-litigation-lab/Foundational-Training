/* ============================================================
   🛠 Practice Lab (#/simulators): the trainee's real-time Practice Sessions and the rest of the lab
   Loaded after js/ft-updates.js. A section of the top bar (js/lsh-program.js).
     • 🏛 the trainee's law firm (js/ft-firms.js), then 🟢 Practice Sessions and 🧑‍🏫 With your trainer
       (js/ft-sessions.js): real work in the CMS on the trainee's own cases, checked against their firm's rules.
     • 🧰 Drafting Tools: the document tools — the LOR Drafting Activity (js/ft-lor.js), which replaced the
       Claims Specialist Practice Session. A template is filled in on the page and comes out as a PDF under the
       trainers' naming convention, which the trainee can edit. Drafted here, never a CMS case file.
     • Open here: a CMS tool fills the window (✕ Close comes back), signed in with the trainee's ticket
       (js/lsh-tool-links.js). The Call Simulator is ☎ LSH Ring Channel's (the training phone) and the Calendaring
       Simulators are the Main Portal's: both open in their own tab, on the trainee's Portal sign-in. New tab ↗: its own tab.
     • Trainees: a card opens with its lesson (Admin → 📅 Open Lessons).
     • The main landing page (the dashboard) has no Simulators or Blueprint card: 🛠 Practice Lab is in the top bar.
   ============================================================ */
(function(){
const PORTAL = "https://cm-training-activity.pages.dev/simulators/";

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["simulators"]);

const isTrainee = ()=> !!state.traineeId && !state.isAdmin;
/* ---------- graded calls (the Call Simulator on ☎ LSH Ring Channel) ----------
   The Call Simulator is Ring Channel's: the training phone itself. A graded call taken there (a caller unknown
   until the debrief, graded on the line's Mock Calls Metrics) counts here,
   in its lesson: the Training Portal keeps the trainee's graded calls in callsim:<id> (its /api/call-results), and
   Reception (lesson 4), Calendar Management (5) and Intake (6) Mock Calls show their best graded score on the mock-call card,
   the lesson card and the dashboard. Read once a page load, and again when the trainee comes back to the tab (at most every
   two minutes), so a call just taken shows up. */
const CALL_LESSONS = [4, 5, 6];
let callsimAt = 0, callsimLoading = null;
function ftLoadCallsim(){
  if(!isTrainee() || !state.traineeId || callsimLoading) return callsimLoading;
  callsimAt = Date.now();
  callsimLoading = sharedGet("callsim:" + state.traineeId).then(v=>{
    state.ftCallsim = v && typeof v === "object" ? v : { best: {} }; callsimLoading = null;
    if(state.view === "modules" || state.view === "dashboard" || state.view === "simulators") render();
  }).catch(()=>{ state.ftCallsim = { best: {} }; callsimLoading = null; });
  return callsimLoading;
}
const callBest = (lesson)=> (state.ftCallsim && state.ftCallsim.best && state.ftCallsim.best["lesson" + lesson]) || null;
// The best graded call of a mock-call lesson, on its Practice Session's card (js/ft-sessions.js).
window.ftsGradedLine = function(lesson){
  if(!CALL_LESSONS.includes(lesson) || !isTrainee()) return "";
  if(!state.ftCallsim) ftLoadCallsim();
  const b = callBest(lesson);
  return b ? `<p class="fts-graded">🎯 Graded calls: best <b>${b.score}%</b> · ${b.calls} call${b.calls === 1 ? "" : "s"}. Counts toward this lesson.</p>`
    : `<p class="fts-graded">🎯 No graded call yet. A graded call counts toward this lesson.</p>`;
};
window.addEventListener("focus", ()=>{ if(state.ftCallsim && Date.now() - callsimAt > 120000 && (state.view === "modules" || state.view === "dashboard" || state.view === "simulators")) ftLoadCallsim(); });
// The trainee's name and batch go with the link, so their scores are saved for the trainer.
function addWho(q){
  if(isTrainee()){
    const name = state.certName || state.traineeName;
    if(name) q.set("name", name);
    if(state.traineeBatch) q.set("batch", state.traineeBatch);
  }
  return q;
}
// The Portal's Calendaring Simulators (the Google Calendar Simulator): their own tab, with the trainee's name and batch.
function portalHref(page){ return PORTAL + page + "?" + addWho(new URLSearchParams({program:"FT"})); }
// The orientation slide's "Open the Practice Lab" and the day map's daily step: the tests themselves.
window.ftsGotoSkills = function(){ goto("skills"); };

// The Practice Lab: real-time Practice Sessions at the trainee's own firm (js/ft-sessions.js, js/ft-firms.js), the activities
// done live with the trainer. The demo-preparation cards are gone: the demos are done live with the
// trainer (🧑‍🏫 With your trainer), so a card per demo only repeated them. The simulators' cards (the
// separate Calendaring Simulators, the mock-call lines and All simulators) are gone: the calls and the Google Calendar
// Simulator are tools inside their sessions (the Calendar Management Mock Calls are part of Standard Training - Appointment Setting Mock Calls).
// The 🏛 Your law firm banner is gone too: a session links to its firm's profile (🏛 The whole firm profile →).
/* 📅 By the day: a trainee sees only what their training has reached, not the whole lab at once. A day is reached when
   its first lesson is open for the batch (the trainer's 📅 Open Lessons); a session or tool shows from the first day
   that uses it (the day map, js/ft-day-activities.js), a trainer activity from its lesson. Admins and 👁 Switch View
   see everything. */
const seesAll = ()=> !isTrainee() || state.adminPreview;
function reachedDay(){
  const days = (window.FTDays && FTDays.DAYS) || [];
  let n = 1;
  days.forEach(d=>{ const l = (d.lessons || [])[0]; if(l != null && typeof window.dayUnlocked === "function" && window.dayUnlocked(l)) n = Math.max(n, d.day); });
  return n;
}
const reached = days => seesAll() || !days || !days.length || Math.min(...days) <= reachedDay();
window.ftsReached = reached;
// (and 🔓 once the trainer has opened one of the tool's days: js/ft-day-locks.js)
const toolOn = id => { const days = window.FTDays ? FTDays.forTool(id) : []; return reached(days) && (!window.FTDayLocks || FTDayLocks.labOpen(days)); };
function renderSimulators(){
  const tool = (fn, id) => typeof window[fn] === "function" && toolOn(id) ? window[fn]() : "";
  const sessions = window.FTSessions ? FTSessions.cards() + tool("ftCalWeekCard", "calweek") + tool("ftCalPracticeCard", "calpractice") + tool("ftCalRulesCard", "calrules") : "";
  const drafting = window.ftLorCard ? tool("ftLorCard", "lor") + tool("ftGuideCard", "guide") + tool("ftTranscribeCard", "transcribe") + tool("ftDrillsCard", "drills") : "";
  const trainer = window.FTSessions ? FTSessions.trainerCards() : "";
  // 📚 the Knowledge Base: a card beside the Drafting Tools (its own section when there are none yet), so the Lab fits one screen
  const KB = `<div class="card fts-card"><div class="fts-kicker">Any day</div><h3>📚 LSH Knowledge Base</h3>
        <p class="fts-note">SOPs, guides and training videos, searchable, in one place. It opens signed in.</p>
        <div class="fts-tool-act"><a class="btn btn-navy btn-sm" href="https://lsh-knowledge-base.legalsupporthelp.workers.dev/" target="_blank" rel="noopener">Open the Knowledge Base ↗</a></div></div>`;
  const more = !seesAll() ? `<p class="fts-sub fts-more">📅 More of the Practice Lab opens as your training goes on, day by day.</p>` : "";
  return `<div class="fts-hero"><h1>🛠 Practice Lab</h1>
      <p>Real work, in real time, for your law firm. Start a Practice Session, do the task live in the CMS on your assigned case, record what you did and submit it: it’s checked against your case and your firm’s rules, evaluated, and reviewed by your trainer. Each session opens with its lesson.</p></div>
    ${window.FTSessions ? `${sessions ? `<section class="fts-group"><h2>🟢 Practice Sessions</h2><p class="fts-sub">Reception and intake calls, calendaring, your case’s place in the PI process, claims and medical records requests: done live, for your firm, on your own cases.</p>
      <div class="fts-grid">${sessions}</div></section>` : ""}
    ${drafting ? `<section class="fts-group"><h2>🧰 Drafting Tools</h2><p class="fts-sub">Tools you draft in here, on this platform. You fill in the firm’s own template on the page and download the finished document as a PDF, named by the trainers’ convention — yours to edit before you download. Nothing you draft here becomes a case file in the CMS.</p>
      <div class="fts-grid">${drafting}${KB}</div></section>` : ""}
    ${trainer ? `<section class="fts-group"><h2>🧑‍🏫 With your trainer</h2><p class="fts-sub">The demos and mock calls you do live with your trainer. Your trainer records your result here.</p>
      <div class="fts-grid">${trainer}</div></section>` : ""}` : ""}
    ${drafting ? "" : `<section class="fts-group"><h2>📚 Knowledge Base</h2><p class="fts-sub">The LSH library of SOPs, guides and training videos. Look up how a task is done before you ask.</p><div class="fts-grid">${KB}</div></section>`}
    ${window.ftCasesSection ? ftCasesSection() : ""}
    ${tool("ftListenSection", "listening")}${more}`;
}

// Open here: the tool fills the window in its own panel, outside the page, so the page
// re-rendering underneath (menu, lessons opening) never reloads a simulator mid-call.
function ftsPanel(){
  let p = document.getElementById("fts-panel");
  if(p) return p;
  p = document.createElement("div");
  p.id = "fts-panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-modal", "true");
  p.innerHTML = `<div class="fts-panel-bar"><b id="fts-panel-title"></b><span>
      <a class="btn btn-ghost btn-sm" id="fts-panel-link" href="#" target="_blank" rel="noopener">New tab ↗</a>
      <button class="btn btn-ghost btn-sm" type="button" onclick="ftsFullscreen()">⛶ Full screen</button>
      <button class="btn btn-navy btn-sm" type="button" onclick="ftsClose()">✕ Close</button></span></div>
    <div class="fts-panel-body"></div>`;
  document.body.appendChild(p);
  return p;
}
// The Calendaring Simulators run on the Main Portal (own tab, the trainee's Portal sign-in); grading comes back to this program's progress.
window.ftsShowTool = (url, name)=>ftsShow(url, name);
window.ftsCalsim = function(track, scores){ window.open(portalHref("calsim.html") + "&track=" + encodeURIComponent(track) + (scores ? "&view=scores" : ""), "_blank", "noopener"); };
// Trainee Evaluations (trainers: the submissions with their AI review and feedback, and the trainees' calendars) and My Evaluations (a trainee's own calendars and the reports their trainer sent) are on the Portal.
window.ftsEvaluations = function(track, mine){ window.open(portalHref(mine ? "my-evaluations.html" : "gcal-review.html") + (track && !mine ? "&track=" + encodeURIComponent(track) : ""), "_blank", "noopener"); };
function ftsShow(url, name){
  // A Portal page needs the Portal sign-in cookie, which the browser doesn't send into a frame inside this site (it showed the
  // Portal's login box): it opens in its own tab, where the trainee is already signed in. The CMS lets Standard trainees in
  // with just their name, so its pages still open here.
  if(String(url).indexOf(PORTAL) === 0){ window.open(url, "_blank", "noopener"); return; }
  const p = ftsPanel();
  p.querySelector("#fts-panel-title").textContent = name;
  p.querySelector("#fts-panel-link").href = url;
  p.querySelector(".fts-panel-body").innerHTML = `<iframe id="ftsIframe" title="${esc(name)}" allow="microphone; clipboard-read; clipboard-write; fullscreen" allowfullscreen></iframe>`;
  // the frame's address carries the trainee's ticket, so the CMS opens signed in (js/lsh-tool-links.js)
  const f = p.querySelector("#ftsIframe");
  (window.LSHToolLinks ? LSHToolLinks.ticketed(url) : Promise.resolve(url)).then(u=>{ if(f.isConnected) f.src = u; });
  p.classList.add("open"); document.body.classList.add("fts-panel-open");
  window.scrollTo(0, 0);   // the bar is sticky, so bring it to the top before the panel measures it
  ftsTop();
}
// The top bar wraps to two rows on a narrow window, so its height is read, not assumed.
function ftsTop(){
  const bar = document.querySelector(".topbar");
  const h = bar ? Math.round(bar.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty("--fts-top", h + "px");
}
window.addEventListener("resize", ()=>{ if(document.body.classList.contains("fts-panel-open")) ftsTop(); });
window.ftsClose = function(){
  const p = document.getElementById("fts-panel"); if(!p) return;
  document.documentElement.style.removeProperty("--fts-top");
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  p.classList.remove("open"); p.querySelector(".fts-panel-body").innerHTML = ""; document.body.classList.remove("fts-panel-open");
};
window.ftsFullscreen = function(){ const f = document.getElementById("ftsIframe"); if(f && f.requestFullscreen) f.requestFullscreen().catch(()=>{}); };
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !document.fullscreenElement && document.body.classList.contains("fts-panel-open")) ftsClose(); });
// A tab in the top bar leaves the tool: the panel closes first, so 🛠 Practice Lab comes back to the lab
// itself rather than to the tool that was open on top of it.
document.addEventListener("click", e=>{
  if(!document.body.classList.contains("fts-panel-open")) return;
  if(e.target.closest && e.target.closest(".topbar .nav button, .topbar .brand")) ftsClose();
}, true);

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="simulators"){ ftsClose(); return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-sims">${renderSimulators()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
  if(isTrainee() && !state.ftCallsim) ftLoadCallsim();
  if(!isTrainee() || state.ftOpenDays) return;
  ftLoadOpenDays().then(()=>{ if(state.view==="simulators") render(); }).catch(()=>{});
};
// 📚 Dashboard, the landing page: the graded-calls stat under the progress bar, and a mock-call lesson's best
// graded call beside the sub-line of its day card (js/lsh-program.js hands the tags to the day grid, which
// js/ft-day-decks.js lays out). The page has no Simulators card: the Practice Lab is in the top bar.
(window.LSH_HOME_STATS = window.LSH_HOME_STATS || []).push(function(){
  if(!isTrainee()) return "";
  if(!state.ftCallsim) ftLoadCallsim();
  const bests = CALL_LESSONS.map(callBest).filter(Boolean);
  return `<div class="card stat fts-calls-stat" title="Your best graded call in Reception (lesson 4), Calendar Management (5) and Intake (6) Mock Calls"><div class="num">${bests.length ? Math.round(bests.reduce((n, b)=>n + b.score, 0) / bests.length) + "%" : "—"}</div><div class="lbl">Graded calls · ${bests.length} / ${CALL_LESSONS.length} lessons</div></div>`;
});
(window.LSH_HOME_LESSON_TAGS = window.LSH_HOME_LESSON_TAGS || []).push(function(d){
  const b = CALL_LESSONS.includes(d.id) && isTrainee() ? callBest(d.id) : null;
  return b ? `<span class="lp-kc fts-call-tag">📞 ${b.score}%</span>` : "";
});
// a mock-call lesson's card shows its best graded call
const __callCard = window.moduleCard;
window.moduleCard = function(d){
  const html = __callCard.apply(this, arguments), b = CALL_LESSONS.includes(d.id) && isTrainee() ? callBest(d.id) : null;
  if(!b) return html;
  return html.replace(/(<div class="mh-day">)([\s\S]*?)(<\/div>)/, (m, a, t, c)=>`${a}${t.replace(/^&nbsp;$/, "")}${t && t !== "&nbsp;" ? " &middot; " : ""}📞 ${b.score}%${c}`);
};
(function(){ const s = document.createElement("style"); s.id = "ft-simulators"; s.textContent = `
main.main-sims{max-width:1180px;margin:0 auto;padding:24px 16px 40px;}
.fts-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;}
.fts-hero p{margin:0 0 20px;color:var(--ink-soft);font-size:15px;max-width:760px;}
.fts-group{margin-bottom:28px;} .fts-group h2{margin:0 0 4px;color:var(--navy);font-size:21px;}
.fts-sub{margin:0 0 14px;color:var(--ink-soft);font-size:14px;}
.fts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:14px;}
.fts-card{padding:16px 18px;display:flex;flex-direction:column;gap:10px;}
.fts-card h3{margin:0;color:var(--navy);font-size:17px;line-height:1.3;}
.fts-kicker{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--orange-deep);}
.fts-note{margin:0;font-size:13.5px;color:var(--ink-soft);}
.fts-label{margin-top:4px;font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-soft);}
.fts-locked{opacity:.65;} #fts-skills{scroll-margin-top:84px;}
.fts-tpl{margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-soft);} .fts-tpl li{margin:1px 0;}
.fts-file{align-self:flex-start;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;background:#f1f5f9;color:var(--navy);border-radius:6px;padding:4px 8px;overflow-wrap:anywhere;}
.fts-sample{margin:0;} .fts-sample img{display:block;width:100%;height:auto;border:1px solid var(--line,#e5e7eb);border-radius:8px;}
.fts-sample figcaption{margin-top:4px;font-size:12px;color:var(--ink-soft);}
.fts-tool-act{display:flex;gap:8px;flex-wrap:wrap;}
.fts-tool-act a.btn{text-decoration:none;}
.fts-sub a{color:var(--orange-deep);font-weight:700;}
.fts-graded{margin:0;font-size:13.5px;color:var(--navy);background:#fff7ed;border-left:3px solid #f97316;border-radius:6px;padding:6px 10px;}
/* 🛠 the Practice Lab on one screen: small cards, more in a row, a slim side margin (the page shrinks the rest of the
   way to fit: js/ft-screen-fit.js) */
main.main-sims{max-width:none;padding:12px 18px 20px;}
main.main-sims .fts-hero{margin-bottom:10px;} main.main-sims .fts-hero .page-hero{padding:10px 18px !important;margin:0 !important;}
main.main-sims .fts-hero h1{font-size:20px !important;margin:0 0 2px !important;} main.main-sims .fts-hero .eyebrow{display:none;}
main.main-sims .fts-hero p{margin:0 !important;font-size:12.5px !important;max-width:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
main.main-sims .fts-group{margin-bottom:8px;} main.main-sims .fts-group h2{font-size:17px;margin:0 0 2px;}
main.main-sims .fts-sub{margin:0 0 6px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
main.main-sims .fts-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;}
@media(min-width:1500px){ main.main-sims .fts-grid{grid-template-columns:repeat(7,minmax(0,1fr));} }
@media(max-width:1300px){ main.main-sims .fts-grid{grid-template-columns:repeat(4,minmax(0,1fr));} }
@media(max-width:1000px){ main.main-sims .fts-grid{grid-template-columns:repeat(2,minmax(0,1fr));} }
@media(max-width:560px){ main.main-sims .fts-grid{grid-template-columns:minmax(0,1fr);} }
/* a card says what it is and opens it: its long lists (templates, guides, recordings) and samples are inside the tool */
main.main-sims .fts-card ul, main.main-sims .fts-card ol, main.main-sims .fts-label, main.main-sims .fts-sample, main.main-sims .fts-file{display:none !important;}
main.main-sims .fts-card{padding:8px 10px;gap:4px;}
main.main-sims .fts-card h3{font-size:14.5px;}
main.main-sims .fts-kicker{font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
main.main-sims .fts-note{font-size:12.5px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
main.main-sims .fts-graded{font-size:12px;padding:4px 8px;}
main.main-sims .fts-card .btn{padding:5px 10px;font-size:12.5px;}
main.main-sims .fts-tool-act{margin-top:auto;}
/* the same line on every trainer card (the section says it once): hidden here; the trainer's own comment still shows */
main.main-sims .fts-note-std{display:none !important;}
.fss-card h3 .fss-pill{margin-left:4px;} .fss-case{margin:0;font-size:13.5px;color:var(--navy);}
/* The panel starts below the top bar: a tool fills the rest of the window, and 📚 Dashboard and the
   other tabs stay clickable while it is open (ftsTop() keeps --fts-top on the bar's real height). */
#fts-panel{display:none;position:fixed;inset:var(--fts-top,0px) 0 0 0;z-index:9000;background:var(--bg,#f8fafc);flex-direction:column;}
#fts-panel.open{display:flex;} body.fts-panel-open{overflow:hidden;}
.fts-panel-bar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 16px;background:var(--card,#fff);border-bottom:1px solid var(--line,#e5e7eb);}
.fts-panel-bar b{color:var(--navy);font-size:14.5px;min-width:0;overflow-wrap:anywhere;} .fts-panel-bar span{display:flex;gap:8px;flex-wrap:wrap;}
.fts-panel-bar a.btn{text-decoration:none;}
.fts-panel-body{flex:1;min-height:0;} .fts-panel-body iframe{display:block;width:100%;height:100%;border:0;background:#fff;}
`; document.head.appendChild(s); })();
})();
