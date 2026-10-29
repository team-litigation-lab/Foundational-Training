/* ============================================================
   This program's setup for the LSH program layout (js/lsh-program.js, the same file in every LSH course repo):
   the pages under 📚 Dashboard, what 📁 Client Profile opens, what the 🏅 Scorecard collects and the
   🛠 Practice Lab's pages.
   Loaded just before js/lsh-program.js.
   Every grade the platform gives a trainee, one source each:
     ✍️ Knowledge Checks        kcreview:<id>, the trainer's final score, else state.progress[lesson].score, the best attempt
                                (js/ft-process.js; 70% passes). ✍️ Knowledge Check (the process questions) is its
                                own feature: its own button in the top bar, no page under 📚 Dashboard and no
                                Admin tab.
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

// Each module's own activities, for the row the module gets in 📚 Dashboard (js/lsh-program.js
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
  if(typeof window.ftLorCard === "function" && l === 7)
    out.push({icon:"📄", label:"LOR Drafting Activity", go:"goto('lor')"});
  return out;
};

window.LSH_PROGRAM = {
  // 📚 Dashboard: the modules, then these pages (who: "trainee", "admin" or both). Their own top bar buttons
  // move here, and their pages get the section's bar of tabs.
  modules: [
    {view:"notes", icon:"🗒", label:"Notes", who:"trainee", about:"Your own notes from the lessons."},
    {view:"scorecard", icon:"🏅", label:"My Performance", who:"trainee", about:"Your focus, your trainer’s feedback and every grade the platform gives you, from all of its grading systems — the same scores the Main Portal's scorecard collects."},
    {view:"orientation", icon:"🧭", label:"Orientation", who:"admin", about:"The platform orientation slides (the Blueprint PDF)."}
  ],
  // No 📁 Client Profile button in the top bar — My Firm (js/ft-firms.js) is still reachable from the
  // Practice Lab (labViews below), just not as its own top-level nav item.
  caseProfile: null,
  // 📌 Setting of Training Expectations and Company Policies, then 🧰 Know Your Tools (js/ft-day-decks.js), before Lesson 1
  pinned: () => [window.FT_ORIENTATION, window.FT_TOOLS_PIN].filter(Boolean),
  moduleViews: ["day"],   // 📚 Dashboard holds the modules. ✍️ Knowledge Check (#/process) and its graded view (#/kc) are their own feature, with their own button in the top bar (js/ft-process.js)
  labViews: ["simulators", "calsim", "firm", "session", "lor", "transcribe", "guide", "skills", "drills", "calrules", "calweek", "calpractice", "listening", "shadowing"],  // 🛠 Practice Lab: its page, a Practice Session, 🏛 My Firm, the 🧰 Drafting Tools' LOR Drafting Activity (and the older Calendaring Simulators page)
  shared: ["settings:trainer-acts"],   // the trainer-led activities' names
  // the Admin screen's tabs by section (any other tab sits under 🛡 Admin Master Control)
  adminGroups: {
    admin: ["audit", "batches", "tfeedback", "firms", "sops", "dbmaint"],   // no "attendance": it is the Training Portal's /attendance.html, per program per batch
    modules: ["opendays", "curriculum", "trackers", "monitor", "drivetrackers", "fbstyle", "kcgames"],
    lab: ["calscores", "sessions", "trainerinputs", "calrules", "calweek", "listening"],
    scorecard: ["scorecards", "ranking", "sendfeedback", "skilltests"]
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
      about:"Your Daily Task Tracker and Training Progress Monitoring Sheet in your main Google Drive: the system’s checks, or your trainer’s score where they gave one.",
      items: ctx => typeof window.ftDriveItems === "function" ? window.ftDriveItems(ctx) : []},
    {id:"skills", icon:"🧪", label:"Typing & Spelling", key:"skills:",
      about:"Your daily tests, taken in the Practice Lab: your typing speed against the 60 WPM clients look for (the average of your last 10), and your spelling average.",
      items: ctx => typeof window.ftSkillItems === "function" ? window.ftSkillItems(ctx) : []},
    {id:"drills", icon:"🏷", label:"Naming & Reporting Drills", key:"drills:",
      about:"Your best round on each set of drills: the file names, Notes and Tasks entries and subject lines every demo is scored on.",
      items: ctx => typeof window.ftDrillItems === "function" ? window.ftDrillItems(ctx) : []},
    {id:"shadow", icon:"👥", label:"Shadowing", key:"shadow:",
      about:"The shadowing sessions you wrote up: who you shadowed, what they did, what you learned and what you will use. Written up in place of the TAM screenshot.",
      items: ctx => typeof window.ftShadowItems === "function" ? window.ftShadowItems(ctx) : []},
    {id:"listening", icon:"🎧", label:"Call Listening", key:"listening:",
      about:"The Call Listening recordings you logged: who called, what they wanted, how the VA handled it and a phrase worth reusing. The share of each set logged in full.",
      items: ctx => typeof window.ftListenItems === "function" ? window.ftListenItems(ctx) : []},
    {id:"calrules", icon:"📅", label:"Calendar booking rules", key:"calrules:",
      about:"Your calendar mock-call bookings, each checked against the guide’s scheduling rules: the share of rules met, practice calls and mock calls with your trainer apart.",
      items: ctx => typeof window.ftCalRuleItems === "function" ? window.ftCalRuleItems(ctx) : []},
    {id:"kcgames", icon:"🎮", label:"Knowledge Games", key:"kcgames:",
      about:"Your best game on each lesson’s Knowledge Games (practice only: the graded Knowledge Check is the score that counts).",
      items: ctx => typeof window.ftKCGameItems === "function" ? window.ftKCGameItems(ctx) : []},
    {id:"feedback", icon:"📝", label:"Trainer feedback", key:"trainerfb:",
      about:"The score your trainer gave each piece of work they reviewed: your transcriptions, video notes, process guides and letters (Admin → 📝 Send Feedback).",
      items: ctx => typeof window.ftTrainerFeedbackItems === "function" ? window.ftTrainerFeedbackItems(ctx) : []},
    {id:"ranking", icon:"📊", label:"Weekly Ranking", key:"rankshare:",
      about:"Your final average each week, out of 5, from the weekly progress report your trainer shared with you (and your rank in the batch).",
      items: ctx => Object.values(((ctx.rec["rankshare:"] || {}).weeks) || {}).filter(w => w && w.avg != null).sort((a, b) => a.week - b.week)
        .map(w => ({name:`Week ${w.week}`, pct:Math.round(Number(w.avg) / 5 * 100), note:`${Number(w.avg).toFixed(2)}/5${w.rank ? ` · rank ${w.rank} of ${w.of}` : ""}`}))},
    {id:"portalsims", icon:"🧰", label:"Portal simulators", key:"simresults:",
      about:"Your best result on each LSH Training Portal simulator you opened from this program (the Google Calendar Simulator, Medical Records Requests, …).",
      items: ctx => Object.entries(((ctx.rec["simresults:"] || {}).best) || {}).map(([name, b]) => ({name, pct:Number(b.score), note:`Best of ${plural(b.count || 1, "attempt")}`}))}
  ]
};
})();
