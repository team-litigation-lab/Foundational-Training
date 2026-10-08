/* ============================================================
   🛠 Practice Lab (#/simulators): the trainee's real-time Practice Sessions and the rest of the lab
   Loaded after js/ft-updates.js. A section of the top bar (js/lsh-program.js).
     • 🏛 the trainee's law firm (js/ft-firms.js), then 🟢 Practice Sessions and 🧑‍🏫 With your trainer
       (js/ft-sessions.js): real work in the CMS on the trainee's own cases, checked against their firm's rules.
     • 🖥 Demo preparation: one card per demo in the Training Guide, with the training CMS's Training
       Library cases that fit it (MC-01 …, fictional PI files in the CaseManagementTraining repo,
       mock-cases.js). A case opens in the CMS with ?mock=MC-xx (view only; "Work on a practice copy"
       makes it editable). Case facts below are from mock-cases.js: if a case changes there, update its
       line here.
     • 🧪 Skill Building: the daily typing and spelling tests.
     • Open here: a CMS tool fills the window (✕ Close comes back), signed in with the trainee's ticket
       (js/lsh-tool-links.js). The Call Simulator is the CMS's. New tab ↗: its own tab.
     • Trainees: a card opens with its lesson (Admin → 📅 Open Lessons).
     • The main landing page (the dashboard) has no Simulators or Blueprint card: 🛠 Practice Lab is in the top bar.
   ============================================================ */
(function(){
const PORTAL = "https://cm-training-activity.pages.dev/simulators/";
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";

const TOOLS = {
  drill:    {icon:"☎️", name:"Front Desk Drill (CMS)", cms:"drill=1", desc:"Scored incoming calls on the Training Library cases: find the file, verify the caller, handle or route the call."},
  library:  {icon:"📚", name:"Training Library (all 20 cases)", cms:"library=1", desc:"Every mock case in the CMS, with the firm directory and front-desk rules."},
  call:     {icon:"📞", name:"Call Simulator", desc:"Practice calls on these same cases: a caller phones in, you answer by voice or typing, write the call note, and get a scored debrief."},
};

// The Training Guide's demos (its own names), the lesson each belongs to,
// the CMS program it opens in, and the Training Library cases that fit it.
const ACTIVITIES = [
  {kind:"demo", lesson:6, cms:"intake", title:"Saving Intake Packet and Extracted Intake Documents Demo", note:"Open the case, click “Work on a practice copy”, then save the documents to the case.", cases:[
    ["MC-02", "Derek Thompson", "Intake questionnaire; retainer and HIPAA sent by e-sign, not yet signed; client’s photos of the spill."],
    ["MC-13", "Nicole Adams", "Intake questionnaire; conflict check pending; store adjuster emails the client forwarded."]],
    tools:["library"]},
  {kind:"demo", lesson:7, cms:"cm", title:"LOR Uploading and Sending Demo (1P & 3P)", note:"Open the case, click “Work on a practice copy”, then record the insurance and save the LORs.", cases:[
    ["MC-01", "Maria Santos", "3P: Keystone Mutual Insurance (Kyle Brandt). 1P: UM/UIM with Harbor Point Insurance."],
    ["MC-02", "Derek Thompson", "3P: Allied Retail Casualty; the LOR goes out once the retainer is signed."],
    ["MC-12", "William Harris", "3P: Keystone Mutual Insurance (Stacy Owens); adjuster not yet assigned, liability pending."]],
    tools:["library"]},
  {kind:"demo", lesson:8, cms:"cm", title:"Sending MedLOR and Requesting Medical Bills & Records Demo", note:"Open the case, click “Work on a practice copy”, then work from its treatment providers.", cases:[
    ["MC-01", "Maria Santos", "QuickCare Urgent Care, City Spine & Rehab and Motion Physical Therapy; HIPAA signed."],
    ["MC-15", "Patricia Lewis", "St. Mary’s Hospital, Heritage Rehabilitation Center and CareFirst Home Health; her son holds a POA."],
    ["MC-08", "Tomás Rivera", "St. Mary’s Hospital and Riverton Orthopedic Associates; surgery scheduled."]],
    tools:["library"]},
  {kind:"demo", lesson:8, cms:"cm", title:"LV (Lien Verification) Request Demo", note:"Open the case, click “Work on a practice copy”, then work from its Liens.", cases:[
    ["MC-09", "Emily Nguyen", "Letter of Protection to Premier Knee & Sports Medicine ($7,850); the provider threatens collections."],
    ["MC-15", "Patricia Lewis", "Medicare (BCRC) lien; the conditional payment amount is pending."],
    ["MC-05", "Linda Garcia", "Medicare (BCRC) lien, $21,344."]],
    tools:["library"]},
  {kind:"demo", lesson:9, cms:"cm", title:"Reduction Request, Settlement Release Forms and Closing Statement Demo", note:"Open the case, click “Work on a practice copy”, then work from its Liens and Finance.", cases:[
    ["MC-11", "Ngozi Okonkwo", "$90,000 settlement; hospital lien $14,600 (reduction to $9,000 requested); Anthem Blue Shield ERISA subrogation $9,215."],
    ["MC-06", "James Wilson", "$42,000 settlement; health-fund lien reduced $6,480 → $4,320; chiropractor LOP $4,200 still pending; settlement statement in draft."]],
    tools:["library"]}
].filter(a=>DAYS.find(d=>d.id===a.lesson));   // a lesson taken off the platform (build/lessons/off/) takes its demos with it

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["simulators"]);

const isTrainee = ()=> !!state.traineeId && !state.isAdmin;
// key: a tool id, or a Training Library case id ("MC-04")
function keyHref(key, a){
  if(/^MC-\d+$/.test(key)) return cmsHref({program:a.cms, mock:key});
  const t = TOOLS[key];
  if(t.cms) return cmsHref({program: key==="drill" ? "reception" : a.cms}, t.cms);
  return callsHref(a.title);
}
// The Call Simulator is the CMS's: opened straight there (not through the Portal's call.html), so the trainee's ticket
// (js/lsh-tool-links.js) signs them in with no log-in page. Graded calls still reach callsim:<id> (the CMS reports them to
// the Portal's /api/call-results). line = the mock call's title; mode=graded lists the line's graded calls first.
function callsHref(line, graded){
  const q = new URLSearchParams({calls:"1", program:"FT", from:"standard"});
  if(line) q.set("line", line);
  if(graded) q.set("mode", "graded");
  return CMS + "?" + addWho(q);
}
// The trainee's name and batch go with the link, so their scores are saved for the trainer.
function addWho(q){
  if(isTrainee()){
    const name = state.certName || state.traineeName;
    if(name) q.set("name", name);
    if(state.traineeBatch) q.set("batch", state.traineeBatch);
  }
  return q;
}
// from=standard: the CMS lets Standard trainees in with just their name (no CMS account).
function cmsHref(params, extra){
  const q = addWho(new URLSearchParams(Object.assign({}, params, {from:"standard"})));
  return CMS + "?" + q + (extra ? "&" + extra : "");
}
/* ---------- graded calls (the CMS Call Simulator) ----------
   The main Call Simulator is the CMS's. A graded call taken there (Graded call 1, 2… on the line; the caller is unknown
   until the debrief) counts here,
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
    if(state.view === "dashboard" || state.view === "simulators") render();
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
window.addEventListener("focus", ()=>{ if(state.ftCallsim && Date.now() - callsimAt > 120000 && (state.view === "dashboard" || state.view === "simulators")) ftLoadCallsim(); });
// The Portal's Calendaring Simulators (the Google Calendar Simulator): their own tab, with the trainee's name and batch.
function portalHref(page){ return PORTAL + page + "?" + addWho(new URLSearchParams({program:"FT"})); }
function keyName(key, a){
  const c = a.cases.find(x=>x[0]===key);
  return c ? `${c[0]} · ${c[1]}` : TOOLS[key].name;
}
function lessonTitle(id){ const d = DAYS.find(x=>x.id===id); return d ? d.title : ""; }
function activityOpen(a){ return state.isAdmin || state.adminPreview || window.dayUnlocked(a.lesson); }

function renderCard(a, i){
  const open = activityOpen(a);
  const acts = key => open
    ? `<button class="btn btn-navy btn-sm" onclick="ftsOpen(${i},'${key}')">${String(keyHref(key, a)).indexOf(PORTAL) === 0 ? "Open ↗" : "Open here"}</button><a class="btn btn-ghost btn-sm" href="${esc(keyHref(key, a))}" target="_blank" rel="noopener">New tab ↗</a>`
    : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`;
  const row = (title, desc, key)=>`<div class="fts-tool">
      <div class="fts-tool-txt"><b>${title}</b><span>${esc(desc)}</span></div>
      <div class="fts-tool-act">${acts(key)}</div></div>`;
  const cases = a.cases.map(c=>row(`<span class="fts-mc">${esc(c[0])}</span> ${esc(c[1])}`, c[2], c[0])).join("");
  const tools = a.tools.map(id=>row(`${TOOLS[id].icon} ${esc(TOOLS[id].name)}`, TOOLS[id].desc, id)).join("");
  return `<div class="card fts-card ${open?"":"fts-locked"}">
    <div class="fts-kicker">${esc(lessonTitle(a.lesson))}${open ? "" : " · opens with this lesson"}</div>
    <h3>${esc(a.title)}</h3>
    ${a.note ? `<p class="fts-note">${esc(a.note)}</p>` : ""}
    <div class="fts-label">Example cases · CMS Training Library</div>
    ${cases}
    <div class="fts-label">Practice tools</div>
    ${tools}
  </div>`;
}
// 🧪 Practice Lab: Skill Building — the daily Typing and Spelling Tests (FT_SKILL_TESTS, js/ft-rules.js): the tools to
// use, when, the screenshot's file name and a sample. The Training Orientation and Rules slide points here.
function renderSkills(){
  const tests = window.FT_SKILL_TESTS || [];
  if(!tests.length) return "";
  return `<section class="fts-group" id="fts-skills"><h2>🧪 Practice Lab: Skill Building</h2>
      <p class="fts-sub">Your daily Typing and Spelling Tests. LSH’s clients look for VAs who type at least 60 WPM. Take each test with the tool below, screenshot the result with the date and time showing, and save it in your training subfolder, named exactly as shown. Missed a test? Make it up during your idle time; extra rounds are welcome.</p>
      <div class="fts-grid">${tests.map(t=>`<div class="card fts-card">
        <h3>${t.icon} ${esc(t.name)}</h3>
        <p class="fts-note"><b>When:</b> ${esc(t.when)}</p>
        <div class="fts-label">Tools to use</div>
        <div class="fts-tool-act">${t.links.map((l,i)=>`<a class="btn ${i ? "btn-ghost" : "btn-navy"} btn-sm" href="${esc(l[1])}" target="_blank" rel="noopener noreferrer">${esc(l[0])} ↗</a>`).join("")}</div>
        <div class="fts-label">Save it as</div>
        <code class="fts-file">${esc(t.file)}</code>
        <figure class="fts-sample"><a href="${esc(t.sample)}" target="_blank" rel="noopener"><img src="${esc(t.sample)}" alt="Sample ${esc(t.name.toLowerCase())} screenshot" loading="lazy"></a><figcaption>Sample: the whole screen, with the date and time showing.</figcaption></figure>
      </div>`).join("")}</div></section>`;
}
// The orientation slide's "Open the Practice Lab": 🛠 Simulators, scrolled to Skill Building.
window.ftsGotoSkills = function(){
  goto("simulators");
  setTimeout(()=>{ const el = document.getElementById("fts-skills"); if(el) el.scrollIntoView({behavior:"smooth", block:"start"}); }, 60);
};

// The Practice Lab: real-time Practice Sessions at the trainee's own firm (js/ft-sessions.js, js/ft-firms.js), the activities
// done live with the trainer, demo preparation on the CMS's cases, and Skill Building. The simulators' cards (the
// separate Calendaring Simulators, the mock-call lines and All simulators) are gone: the calls and the Google Calendar
// Simulator are tools inside their sessions (the Calendar Management Mock Calls are part of the Calendaring Practice Lab).
function firmBanner(){
  if(!isTrainee() || !window.FTFirms) return "";
  const f = FTFirms.myFirm();
  return `<div class="fts-banner" role="link" tabindex="0" onclick="goto('firm')" onkeydown="if(event.key==='Enter') goto('firm')"><span class="fts-banner-ic">🏛</span>
    <span class="fts-banner-tx"><b>${f ? esc(f.name) : "Your law firm"}</b><span>${f ? `You work for this firm: ${esc(f.location)} · ${esc(f.tz)} time. Every session is on its cases, under its rules.` : "Your trainer assigns your firm and your cases. Its rules are what your sessions are checked against."}</span></span>
    <span class="fts-banner-go">${f ? "My firm & rules →" : "Open →"}</span></div>`;
}
function renderSimulators(){
  const demos = ACTIVITIES.map(renderCard).join("");
  return `<div class="fts-hero"><h1>🛠 Practice Lab</h1>
      <p>Real work, in real time, for your law firm. Start a Practice Session, do the task live in the CMS on your assigned case, record what you did and submit it: it’s checked against your case and your firm’s rules, evaluated, and reviewed by your trainer. Each session opens with its lesson.</p></div>
    ${firmBanner()}
    ${window.FTSessions ? `<section class="fts-group"><h2>🟢 Practice Sessions</h2><p class="fts-sub">Reception and intake calls, calendaring, your case’s place in the PI process, claims and medical records requests: done live, for your firm, on your own cases.</p>
      <div class="fts-grid">${FTSessions.cards()}</div></section>
    <section class="fts-group"><h2>🧑‍🏫 With your trainer</h2><p class="fts-sub">The demos and mock calls you do live with your trainer. Your trainer records your result here.</p>
      <div class="fts-grid">${FTSessions.trainerCards()}</div></section>` : ""}
    ${demos ? demoGroup(demos) : ""}
    ${renderSkills()}`;
}
function demoGroup(cards){
  return `<section class="fts-group"><h2>🖥 Demo preparation</h2><p class="fts-sub">Before a demo with your trainer, practice its steps on these CMS cases (open one, then “Work on a practice copy”).</p><div class="fts-grid">${cards}</div></section>`;
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
window.ftsOpen = function(i, id){
  const a = ACTIVITIES[i]; if(!a || !activityOpen(a)) return;
  ftsShow(keyHref(id, a), `${keyName(id, a)} — ${a.title}`);
};
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
}
window.ftsClose = function(){
  const p = document.getElementById("fts-panel"); if(!p) return;
  if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  p.classList.remove("open"); p.querySelector(".fts-panel-body").innerHTML = ""; document.body.classList.remove("fts-panel-open");
};
window.ftsFullscreen = function(){ const f = document.getElementById("ftsIframe"); if(f && f.requestFullscreen) f.requestFullscreen().catch(()=>{}); };
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !document.fullscreenElement && document.body.classList.contains("fts-panel-open")) ftsClose(); });

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="simulators"){ ftsClose(); return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-sims">${renderSimulators()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
  if(isTrainee() && !state.ftCallsim) ftLoadCallsim();
  if(!isTrainee() || state.ftOpenDays) return;
  ftLoadOpenDays().then(()=>{ if(state.view==="simulators") render(); }).catch(()=>{});
};
// Dashboard: the graded-calls band (the main landing page has no Simulators card: the Practice Lab is in the top bar).
const __dash = window.renderDashboard;
window.renderDashboard = function(){
  const html = __dash.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin) return html;
  if(isTrainee() && !state.ftCallsim) ftLoadCallsim();
  // the dashboard band: the best graded call in each of lessons 4–6, averaged
  const bests = CALL_LESSONS.map(callBest).filter(Boolean);
  const stat = isTrainee() ? `<div class="card stat fts-calls-stat" title="Your best graded call in Reception (lesson 4), Calendar Management (5) and Intake (6) Mock Calls"><div class="num">${bests.length ? Math.round(bests.reduce((n, b)=>n + b.score, 0) / bests.length) + "%" : "—"}</div><div class="lbl">Graded calls · ${bests.length} / ${CALL_LESSONS.length} lessons</div></div>` : "";
  return html.replace(/(<div class="lbl">Lessons finished<\/div><\/div>)/, "$1" + stat);
};
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
.fts-tool-txt span.fts-mc{display:inline-block;margin-top:0;color:#fff;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;font-weight:800;background:var(--navy);color:#fff;border-radius:4px;padding:1px 6px;margin-right:4px;vertical-align:1px;}
.fts-locked{opacity:.65;} #fts-skills{scroll-margin-top:84px;}
.fts-file{align-self:flex-start;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;background:#f1f5f9;color:var(--navy);border-radius:6px;padding:4px 8px;overflow-wrap:anywhere;}
.fts-sample{margin:0;} .fts-sample img{display:block;width:100%;height:auto;border:1px solid var(--line,#e5e7eb);border-radius:8px;}
.fts-sample figcaption{margin-top:4px;font-size:12px;color:var(--ink-soft);}
.fts-tool{display:flex;gap:12px;align-items:center;justify-content:space-between;border-top:1px solid var(--line,#e5e7eb);padding-top:10px;flex-wrap:wrap;}
.fts-tool-txt{flex:1 1 200px;min-width:0;} .fts-tool-txt b{display:block;font-size:14.5px;color:var(--ink,#111827);}
.fts-tool-txt span{display:block;font-size:13px;color:var(--ink-soft);margin-top:2px;}
.fts-tool-act{display:flex;gap:8px;flex-wrap:wrap;}
.fts-tool-act a.btn{text-decoration:none;}
.fts-all .fts-card h3{font-size:16px;} .fts-sub a{color:var(--orange-deep);font-weight:700;}
.fts-banner{display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,#0b1730,#13284f);color:#fff;border-radius:18px;padding:18px 22px;margin-bottom:18px;cursor:pointer;box-shadow:0 10px 24px -14px rgba(8,18,38,.6);transition:transform .15s;}
.fts-banner:hover{transform:translateY(-2px);} .fts-banner:focus-visible{outline:3px solid #fdba74;outline-offset:2px;}
.fts-banner-ic{width:48px;height:48px;border-radius:14px;background:rgba(249,115,22,.18);border:1px solid rgba(253,186,116,.45);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
.fts-banner-tx{flex:1;min-width:0;} .fts-banner-tx b{display:block;font-size:16px;} .fts-banner-tx span{font-size:13px;color:#c7d2fe;}
.fts-graded{margin:0;font-size:13.5px;color:var(--navy);background:#fff7ed;border-left:3px solid #f97316;border-radius:6px;padding:6px 10px;}
.fss-card h3 .fss-pill{margin-left:4px;} .fss-case{margin:0;font-size:13.5px;color:var(--navy);}
.fts-banner-go{background:#f97316;color:#0f172a;font-weight:800;font-size:12px;border-radius:999px;padding:8px 16px;white-space:nowrap;}
@media (max-width:520px){ .fts-banner{flex-wrap:wrap;} .fts-banner-go{margin-left:64px;} }
#fts-panel{display:none;position:fixed;inset:0;z-index:9000;background:var(--bg,#f8fafc);flex-direction:column;}
#fts-panel.open{display:flex;} body.fts-panel-open{overflow:hidden;}
.fts-panel-bar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 16px;background:var(--card,#fff);border-bottom:1px solid var(--line,#e5e7eb);}
.fts-panel-bar b{color:var(--navy);font-size:14.5px;min-width:0;overflow-wrap:anywhere;} .fts-panel-bar span{display:flex;gap:8px;flex-wrap:wrap;}
.fts-panel-bar a.btn{text-decoration:none;}
.fts-panel-body{flex:1;min-height:0;} .fts-panel-body iframe{display:block;width:100%;height:100%;border:0;background:#fff;}
`; document.head.appendChild(s); })();
})();
