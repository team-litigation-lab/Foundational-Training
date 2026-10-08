/* ============================================================
   This program's setup for the LSH program layout (js/lsh-program.js, the same file in every LSH course repo):
   the pages under 📚 Training Modules, what the 🏅 Scorecard collects and the 🛠 Practice Lab's pages.
   Loaded just before js/lsh-program.js.
   Every grade the platform gives a trainee, one source each:
     ✍️ Knowledge Checks        state.progress[lesson].score, the best attempt (js/ft-process.js; 70% passes)
     🎯 Graded calls            callsim:<id>, the best graded call on each mock-call line (js/ft-simulators.js)
     📅 Calendaring Simulators  calsim:<id>, the trainer's released score on the latest submission of a week,
                                else the best automated review; plus connected simulators' results (js/ft-calendar.js)
   (The Daily Activities page was taken off: the Practice Lab and the Knowledge Checks cover that work.)
   ============================================================ */
(function(){
const title = id => { const d = DAYS.find(x => x.id === id); return d ? d.title : "Lesson " + id; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const CALL_LESSONS = [4, 5, 6];   // Reception, Calendar Management and Intake Mock Calls (as in js/ft-simulators.js)

window.LSH_PROGRAM = {
  // 📚 Training Modules: the lessons, then these pages (who: "trainee", "admin" or both). Their own top bar buttons
  // move here, and their pages get the section's bar of tabs.
  modules: [
    {view:"tracker", icon:"📋", label:"Task Tracker", who:"trainee", about:"Your daily task sheet, checked against the tracker rules."},
    {view:"monitoring", icon:"📒", label:"Monitoring Sheet", who:"trainee", about:"Your Training Monitoring Sheet, with feedback on each entry."},
    {view:"notes", icon:"🗒", label:"My Notes", who:"trainee", about:"Your own notes from the lessons."},
    {run:"openFocusPanel()", icon:"🎯", label:"My Focus", who:"trainee", about:"Your trainer’s feedback and what to work on next.", badge:() => typeof window.focusNewCount === "function" ? window.focusNewCount() : 0},
    {view:"orientation", icon:"🧭", label:"Orientation", who:"admin", about:"The platform orientation slides (the Blueprint PDF)."}
  ],
  pinned: () => window.FT_ORIENTATION ? [window.FT_ORIENTATION] : [],   // 📌 Training Orientation and Rules, before Lesson 1
  moduleViews: ["day", "kc", "process"],   // a lesson, its Knowledge Check and the answer sheets (no tab of their own: the Knowledge Check has them) are in Training Modules too
  labViews: ["simulators", "calsim"],  // 🛠 Practice Lab: the Simulators page and the Calendaring Simulators
  // the Admin screen's tabs by section (any other tab sits under 🛡 Admin Master Control)
  adminGroups: {
    admin: ["audit", "batches", "tfeedback", "attendance"],
    modules: ["opendays", "curriculum", "process", "trackers", "monitor", "fbstyle"],
    lab: ["calscores"],
    scorecard: ["scorecards"]
  },
  sources: [
    {id:"kc", icon:"✍️", label:"Knowledge Checks",
      about:"Each lesson’s process questions, graded out of 100. Your best attempt counts; 70% passes the lesson.",
      items: ctx => DAYS.filter(d => typeof window.ftKcQuestions === "function" && window.ftKcQuestions(d.id).length).map(d => {
        const p = ctx.progress[d.id] || {};
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
      }}
  ]
};
})();
