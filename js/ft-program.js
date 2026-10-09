/* ============================================================
   This program's setup for the LSH program layout (js/lsh-program.js, the same file in every LSH course repo):
   the pages under 📚 Training Modules, what the 🏅 Scorecard collects and the 🛠 Practice Lab's pages.
   Loaded just before js/lsh-program.js.
   Every grade the platform gives a trainee, one source each:
     ✍️ Knowledge Checks        kcreview:<id>, the trainer's final score, else state.progress[lesson].score, the best attempt
                                (js/ft-process.js; 70% passes). ✍️ Process Questions is its own feature: its own
                                button in the top bar, no page under 📚 Training Modules and no Admin tab.
     🎯 Graded calls            callsim:<id>, the best graded call on each mock-call line (js/ft-simulators.js)
     📅 Calendaring Simulators  calsim:<id>, the trainer's released score on the latest submission of a week,
                                else the best automated review; plus connected simulators' results (js/ft-calendar.js)
     🟢 Practice Sessions       sessions:<id> + labreview:<id>, the trainer's score on each session, else its automated checks (js/ft-sessions.js)
     🧑‍🏫 With your trainer       labreview:<id>, the trainer's recorded result on each trainer-led activity (js/ft-sessions.js)
     📋 Task Tracker & Monitoring  trackerreview:<id>, the Drive files' checks (or the trainer's score) (js/ft-drive.js)
     🧰 Portal simulators       simresults:<id>, the best result per Training Portal simulator (written by the Portal's /api/sim-results)
   (The Daily Activities page was taken off: the Practice Lab and the Knowledge Checks cover that work.)
   ============================================================ */
(function(){
const title = id => { const d = DAYS.find(x => x.id === id); return d ? d.title : "Lesson " + id; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const CALL_LESSONS = [4, 5, 6];   // Reception, Calendar Management and Intake Mock Calls (as in js/ft-simulators.js)

// Each module's own activities, for the row the module gets in 📚 Training Modules (js/lsh-program.js
// renders whatever this returns). Everything a trainee does for a module is reachable from the module:
// its Process Questions, its Practice Session, what it is done live with the trainer, and the Resource
// Library activity that belongs to it. `go` is what to run; `locked` greys it out with the reason.
window.ftModuleActivities = function(lesson){
  const l = Number(lesson), out = [];
  const studied = typeof window.ftModuleStudied === "function" ? window.ftModuleStudied(l) : true;
  if(typeof window.ftKcQuestions === "function" && window.ftKcQuestions(l).length)
    out.push({icon:"✍️", label:"Process Questions", go:`FTProcess.openLesson(${l})`,
      locked: studied ? "" : "Finish the module first"});
  if(window.FTSessions && typeof FTSessions.forLesson === "function")
    FTSessions.forLesson(l).forEach(a => out.push(a.kind === "session"
      ? {icon:a.icon || "🟢", label:a.title, go:`FTSessions.open('${a.id}')`}
      : {icon:a.icon || "🧑‍🏫", label:a.title, go:"goto('simulators')", note:"with your trainer"}));
  if(typeof window.ftLorCard === "function" && l === 7){
    out.push({icon:"📄", label:"1P LOR Drafting", go:"goto('lorfp')"});
    out.push({icon:"📄", label:"3P LOR Drafting", go:"goto('lortp')"});
  }
  return out;
};

window.LSH_PROGRAM = {
  // 📚 Training Modules: the lessons, then these pages (who: "trainee", "admin" or both). Their own top bar buttons
  // move here, and their pages get the section's bar of tabs.
  modules: [
    {view:"tracker", icon:"📋", label:"Task Tracker", who:"trainee", about:"Your Daily Task Tracker in your VA Output folder: its link, each day’s output links, and the daily check."},
    {view:"monitoring", icon:"📒", label:"Monitoring Sheet", who:"trainee", about:"Your Training Monitoring Sheet in your VA Output folder, checked per discussion."},
    {view:"notes", icon:"🗒", label:"My Notes", who:"trainee", about:"Your own notes from the lessons."},
    {run:"openFocusPanel()", icon:"🎯", label:"My Focus", who:"trainee", about:"Your trainer’s feedback and what to work on next.", badge:() => typeof window.focusNewCount === "function" ? window.focusNewCount() : 0},
    {view:"orientation", icon:"🧭", label:"Orientation", who:"admin", about:"The platform orientation slides (the Blueprint PDF)."}
  ],
  pinned: () => window.FT_ORIENTATION ? [window.FT_ORIENTATION] : [],   // 📌 Training Orientation and Rules, before Lesson 1
  moduleViews: ["day"],   // 📚 Training Modules holds the lessons. ✍️ Process Questions (#/process) and its graded view (#/kc) are their own feature, with their own button in the top bar (js/ft-process.js)
  labViews: ["simulators", "calsim", "firm", "session", "lor"],  // 🛠 Practice Lab: its page, a Practice Session, 🏛 My Firm, the 📚 Resource Library's LOR Drafting Activity (and the older Calendaring Simulators page)
  shared: ["settings:trainer-acts"],   // the trainer-led activities' names
  // the Admin screen's tabs by section (any other tab sits under 🛡 Admin Master Control)
  adminGroups: {
    admin: ["audit", "batches", "tfeedback", "attendance", "firms"],
    modules: ["opendays", "curriculum", "trackers", "monitor", "drivetrackers", "fbstyle"],
    lab: ["calscores", "sessions", "trainerinputs"],
    scorecard: ["scorecards"]
  },
  sources: [
    {id:"kc", icon:"✍️", label:"Knowledge Checks", key:"kcreview:",
      about:"Each lesson’s process questions, graded out of 100 in the facilitator’s feedback style. Your best attempt counts, or your trainer’s final score once they give one; 70% passes the lesson.",
      items: ctx => DAYS.filter(d => typeof window.ftKcQuestions === "function" && window.ftKcQuestions(d.id).length).map(d => {
        const p = ctx.progress[d.id] || {}, rv = (((ctx.rec["kcreview:"] || {}).lessons) || {})[d.id];
        const t = rv && rv.score != null && rv.score !== "" && isFinite(Number(rv.score)) ? Number(rv.score) : null;
        if(t != null) return {name:d.title, pct:t, note:`${t >= 70 ? "Passed" : "Not yet · 70% passes"} · trainer’s final score`};
        if(typeof p.score !== "number") return {name:d.title, pct:null, note:"Not taken yet"};
        return {name:d.title, pct:p.score, note:`${p.score >= 70 ? "Passed" : "Not yet · 70% passes"} · ${plural(p.kcAttempts || 1, "attempt")}`};
      })},
    {id:"calls", icon:"🎯", label:"Graded calls", key:"callsim:",
      about:"Your best graded call on each mock-call line of the CMS Call Simulator.",
      items: ctx => CALL_LESSONS.map(id => {
        const b = ((ctx.rec["callsim:"] || {}).best || {})["lesson" + id], name = title(id) + " · Mock Calls";
        return b ? {name, pct:Number(b.score), note:"Best of " + plural(b.calls || 1, "graded call")} : {name, pct:null, note:"No graded call yet"};
      })},
    {id:"calendar", icon:"📅", label:"Calendaring Simulators", key:"calsim:",
      about:"Each week you worked on: your trainer’s score once they release it, until then your best automated review.",
      items: ctx => {
        const d = ctx.rec["calsim:"] || {}, C = window.FTCalCore, out = [];
        const subs = d.submissions || [], autos = d.autos || [], reviews = d.reviews || {};
        ((C && C.SCENARIOS) || []).forEach(s => {
          const last = subs.filter(x => x.scn === s.id).pop(), r = last && reviews[s.id + "|" + last.at];
          const best = autos.filter(a => a.scn === s.id).reduce((m, a) => Math.max(m, Number(a.pct) || 0), -1);
          if(r && r.released !== false && r.score != null && r.score !== "") out.push({name:s.short, pct:Number(r.score), note:"Trainer’s score"});
          else if(best >= 0 || last) out.push({name:s.short, pct:best >= 0 ? best : Number(last.auto && last.auto.pct) || 0, note:last ? "Automated review · waiting for your trainer" : "Best automated review"});
        });
        const ext = {};   // connected simulators (the Portal's Calendaring Simulator, the CMS): the best result per simulator
        (d.external || []).forEach(x => { const pct = x.max > 0 ? Math.round(x.score / x.max * 100) : null; const k = x.title || "Simulator";
          if(pct != null && (!ext[k] || pct > ext[k].pct)) ext[k] = {name:k, pct, note:"Connected simulator · best result"}; });
        return out.concat(Object.values(ext));
      }},
    {id:"sessions", icon:"🟢", label:"Practice Sessions", key:"sessions:",
      about:"Your live Practice Sessions at your firm: your trainer’s score once they review one, until then its automated checks.",
      items: ctx => typeof window.ftSessionItems === "function" ? window.ftSessionItems(ctx) : []},
    {id:"trainer", icon:"🧑‍🏫", label:"With your trainer", key:"labreview:",
      about:"The demos and mock calls you do live with your trainer, as your trainer recorded them.",
      items: ctx => typeof window.ftTrainerItems === "function" ? window.ftTrainerItems(ctx) : []},
    {id:"drive", icon:"📋", label:"Task Tracker & Monitoring Sheet", key:"trackerreview:",
      about:"Your Daily Task Tracker and Training Monitoring Sheet in your VA Output folder: the system’s checks, or your trainer’s score where they gave one.",
      items: ctx => typeof window.ftDriveItems === "function" ? window.ftDriveItems(ctx) : []},
    {id:"portalsims", icon:"🧰", label:"Portal simulators", key:"simresults:",
      about:"Your best result on each LSH Training Portal simulator you opened from this program (the Google Calendar Simulator, Medical Records Requests, …).",
      items: ctx => Object.entries(((ctx.rec["simresults:"] || {}).best) || {}).map(([name, b]) => ({name, pct:Number(b.score), note:`Best of ${plural(b.count || 1, "attempt")}`}))}
  ]
};
})();
