/* ============================================================
   This program's setup for the LSH program layout (js/lsh-program.js, the same file in every LSH course repo):
   the pages under 📚 Training Modules, what the 🏅 Scorecard collects and the 🛠 Practice Lab's pages.
   Loaded just before js/lsh-program.js.
   Every grade the platform gives a trainee, one source each:
     ✍️ Knowledge Checks        state.progress[lesson].score, the best attempt (js/ft-process.js; 70% passes)
     🎯 Graded calls            callsim:<id>, the best graded call on each mock-call line (js/ft-simulators.js)
     📅 Calendaring Simulators  calsim:<id>, the trainer's released score on the latest submission of a week,
                                else the best automated review; plus connected simulators' results (js/ft-calendar.js)
     📝 Activities              actsub:<id>, the trainer's scored rubric on feedback that was sent (js/ft-activities.js)
   ============================================================ */
(function(){
const title = id => { const d = DAYS.find(x => x.id === id); return d ? d.title : "Lesson " + id; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const ACT_DAYS = Array.from({length:19}, (_, i) => "activities:day" + i);   // the Training Guide's Day 0 to Day 18
const CALL_LESSONS = [4, 5, 6];   // Reception, Calendar Management and Intake Mock Calls (as in js/ft-simulators.js)

window.LSH_PROGRAM = {
  // 📚 Training Modules: the lessons, then these pages (who: "trainee", "admin" or both). Their own top bar buttons
  // move here, and their pages get the section's bar of tabs.
  modules: [
    {view:"activities", icon:"📝", label:"Activities", about:"Each day’s activity: answer it and get your trainer’s feedback.", badge:() => typeof window.daUnreadCount === "function" ? window.daUnreadCount() : 0},
    {view:"process", icon:"✍️", label:"Process Questions", about:"Each lesson’s answer sheet, and the Knowledge Checks that grade it."},
    {view:"tracker", icon:"📋", label:"Task Tracker", who:"trainee", about:"Your daily task sheet, checked against the tracker rules."},
    {view:"monitoring", icon:"📒", label:"Monitoring Sheet", who:"trainee", about:"Your Training Monitoring Sheet, with feedback on each entry."},
    {view:"notes", icon:"🗒", label:"My Notes", who:"trainee", about:"Your own notes from the lessons."},
    {run:"openFocusPanel()", icon:"🎯", label:"My Focus", who:"trainee", about:"Your trainer’s feedback and what to work on next.", badge:() => typeof window.focusNewCount === "function" ? window.focusNewCount() : 0},
    {view:"orientation", icon:"🧭", label:"Orientation", who:"admin", about:"The platform orientation slides (the Blueprint PDF)."}
  ],
  pinned: () => window.FT_ORIENTATION ? [window.FT_ORIENTATION] : [],   // 📌 Training Orientation and Rules, before Lesson 1
  moduleViews: ["day", "kc"],          // a lesson and its Knowledge Check are in Training Modules too
  labViews: ["simulators", "calsim"],  // 🛠 Practice Lab: the Simulators page and the Calendaring Simulators
  shared: ACT_DAYS,   // the activities' titles
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
      }},
    {id:"activities", icon:"📝", label:"Activities", key:"actsub:",
      about:"Your trainer’s feedback on the daily activities. A scored rubric counts toward your score; a rating alone shows here.",
      items: ctx => {
        const items = (ctx.rec["actsub:"] || {}).items || {}, names = {};
        ACT_DAYS.forEach(k => (((ctx.shared[k] || {}).items) || []).forEach(a => { names[a.id] = a.title; }));
        return Object.keys(items).map(id => ({id, sub:items[id]})).filter(x => x.sub && x.sub.feedback && x.sub.feedback.status === "sent").map(({id, sub}) => {
          const fb = sub.feedback, sc = fb.scores || [], name = names[id] || "Activity";
          if(!sc.length) return {name, pct:null, note:fb.rating ? "Rated " + fb.rating : "Feedback sent"};
          const total = sc.reduce((n, x) => n + (Number(x.score) || 0), 0), max = sc.length * 5;
          return {name, pct:Math.round(total / max * 100), note:`${total}/${max} on the rubric${fb.rating ? " · " + fb.rating : ""}`};
        });
      }}
  ]
};
})();
