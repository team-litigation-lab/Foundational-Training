/* ============================================================
   WHAT TO DO NEXT — the curriculum flow, instructed automatically
   ------------------------------------------------------------
   The Training Guide runs 18 days in a fixed order, and js/ft-day-activities.js says which
   activity belongs to which day. Until now nothing told a trainee what came after a lesson:
   finishing one showed a toast and dropped them back on 📚 Dashboard, so a trainer had to say,
   every time and to every trainee, what to open next. This works it out from the curriculum
   itself and says it, in the guide's own order.

   Where it shows:
     • 📚 Dashboard — a band at the top (window.LSH_HOME_NOTICES), every visit.
     • Right after a lesson is finished — the same band, in "you just finished this" form.

   How the position is worked out (no trainer input, nothing to set up):
     The sequence is the curriculum's own, Days 1 → 18. A trainee's place in it is the first
     day whose lesson they have not finished yet. Every day has one — Days 17–18 are taught from
     Lesson 9, Lien Negotiator Training — so when the last lesson's Process Questions pass, the
     programme is complete and the band says so. Only lesson progress is read (state.progress, which the platform
     already keeps) — the classroom and Drive steps are shown as the guide lists them, never
     ticked off here, because this program has no record of them.

   What each step links to comes from the map's own `at`/`id`:
     session → that 🟢 Practice Session · tool → 🧰 LOR, 🧪 Skill Building, ✍️ Process Questions,
     📅 the Calendaring Simulators, ☎ the Call Simulator · trainer → done live, so it is named,
     not linked · drive / gc / room → where it happens, in words.
   ============================================================ */
(function(root){
"use strict";

// The platform surfaces a step can point at. A step with no entry here is read, not clicked.
const WHERE = {
  session: {go: id => `FTSessions.open('${id}')`, note: "🛠 Practice Lab"},
  tool: {
    lor:     {go: () => "goto('lor')",           note: "🧰 Drafting Tools"},
    skills:  {go: () => "ftsGotoSkills()",       note: "🧪 Skill Building"},
    process: {go: () => "goto('process')",       note: "✍️ Process Questions"},
    calsim:  {go: () => "goto('simulators')",    note: "📅 Google Calendar Simulator"},
    callsim: {go: () => "goto('simulators')",    note: "☎ Call Simulator"}
  },
  trainer: {note: "🧑‍🏫 With your trainer"},
  drive:   {note: "📁 Your Assessments/Activities folder"},
  gc:      {note: "💬 In the training GC"},
  room:    {note: "🏫 In the classroom"}
};
// isTrainee() is private to the file that declares it, so this keeps its own copy of the test.
const forTrainee = () => !!state.traineeId && !state.isAdmin;
const done = l => !!(state.progress && state.progress[l] && state.progress[l].done);
// DAYS is script-scoped like isTrainee, so the lesson's name comes from ftName(), the engine's own.
const lessonTitle = l => { try{ return ftName(Number(l)) || ("Lesson " + l); }catch(err){ return "Lesson " + l; } };
// A step the trainee cannot act on yet is read, not clicked. A lesson opens when a trainer opens it
// for the batch (window.dayUnlocked, js/ft-updates.js), and a Practice Session has the Practice Lab's
// own gate (its lesson, the firm, and a case where the session works on one) — pointing a button
// straight at either would walk the trainee into the 🔒 locked page or past the card's own guard.
const lessonOpen = l => { try{ return typeof dayUnlocked === "function" ? !!dayUnlocked(Number(l)) : true; }catch(err){ return true; } };
const sessionOpen = id => { try{ return root.FTSessions && typeof FTSessions.openable === "function" ? !!FTSessions.openable(id) : true; }catch(err){ return true; } };
// The "✓ you just finished this" form belongs to one arrival on 📚 Dashboard: `shown` records that the
// dashboard has actually drawn it, so it is not cleared from the view the lesson was finished on.
let seen = null, shown = false, shownStudied = false;

// Where the trainee stands in the curriculum, as a day of the guide.
function place(){
  const days = (root.FTDays && FTDays.DAYS) || [];
  if(!days.length) return null;
  const pending = days.find(d => (d.lessons || []).some(l => !done(l)));
  if(pending) return {day: pending, stage: "lesson"};
  // Every day has a lesson today; this only matters if a day is ever added without one, which then
  // waits here rather than being skipped.
  const closing = days.find(d => !(d.lessons || []).length);
  if(closing) return {day: closing, stage: "closing"};
  // every lesson finished, Lesson 9 (Days 17–18) included: the programme is complete
  return {day: days[days.length - 1], stage: "complete"};
}
/* A day with a lesson runs in three phases, in this order, and only then on through the curriculum:
     1. the Lesson                — until it is studied (✓ Finish Training on its last slide)
     2. the day's Activities      — once studied: its Practice Sessions, tools and classroom work
     3. the Process Questions     — last, once the activities are done; passing them finishes the lesson
   "studied" (state.progress[l].studied) is set by ✓ Finish Training and is what unlocks the lesson's
   Process Questions (js/ft-process.js); "done" is set when they pass. Every day has a lesson
   (Days 17–18 share Lesson 9); a day added without one would have no phases, only its activities. */
const studied = l => !!(state.progress && state.progress[l] && state.progress[l].studied);
const isPQ = x => x.at === "tool" && x.id === "process";
// The day's steps as the trainee works them: on a lesson day the Process Questions move to the end,
// after every activity, because that is the order they are done in. Anything else keeps the guide's order.
function ordered(d){
  const items = d.items || [];
  return (d.lessons || []).length ? items.filter(x => !isPQ(x)).concat(items.filter(isPQ)) : items;
}
function phaseOf(d){
  const l = (d.lessons || []).find(x => !done(x));
  if(l == null) return {phase: "activities", lesson: null};       // a day with no lesson of its own
  return {phase: studied(l) ? "activities" : "lesson", lesson: l};
}
// Not every lesson has Process Questions (Calendaring, Lesson 5, has none): offering a button for a
// set that doesn't exist would open an empty page, so the step only appears where there are questions.
const hasPQ = l => { try{ return typeof window.ftKcQuestions === "function" ? window.ftKcQuestions(l).length > 0 : true; }catch(err){ return true; } };
function pqStep(l){
  return hasPQ(l) ? {label: `Process Questions: ${lessonTitle(l)}`, go: `FTProcess.openLesson(${l})`} : null;
}
// The one thing to do now, and — on a lesson day in its activities phase — the step that follows them.
function nextStep(spot){
  const d = spot.day, ph = phaseOf(d);
  if(ph.phase === "lesson"){
    const open = lessonOpen(ph.lesson);
    return {kind: "lesson", lesson: ph.lesson, open,
      label: open ? `Open Lesson ${ph.lesson}: ${lessonTitle(ph.lesson)}` : `Lesson ${ph.lesson}: ${lessonTitle(ph.lesson)}`,
      go: open ? `goto('day',${ph.lesson})` : ""};
  }
  // The day's real work first: a Practice Session, then a tool that is particular to the day. The
  // typing and spelling tests run on all 18 days, and the Process Questions come after the activities,
  // so neither is ever the thing to send someone to first.
  const linkable = (d.items || []).filter(x => x.at === "session" || (x.at === "tool" && WHERE.tool[x.id] && !isPQ(x)));
  const first = linkable.find(x => x.at === "session" && goFor(x)) || linkable.find(x => x.id !== "skills" && goFor(x));
  const then = ph.lesson != null ? pqStep(ph.lesson) : null;
  // Nothing on the platform to click is NOT the same as no activities: most of a day is classroom and
  // GC work this program can't open. The activities still come first, so the step is to work through
  // them (the list below), and the Process Questions stay the step after — never promoted over them.
  if(!first){
    // the day's own work: not its Process Questions, not the lesson's discussions, and not the
    // typing/spelling tests and upskill hour that run on every one of the 18 days
    const daily = x => x.id === "skills" || x.kind === "Upskill";
    const work = ordered(d).filter(x => !isPQ(x) && !daily(x) && x.kind !== "Discussion");
    if(!work.length) return then ? Object.assign({kind: "pq", lesson: ph.lesson}, then) : null;
    return {kind: "work", label: "Work through today’s activities below", go: "", then, lesson: ph.lesson};
  }
  return {kind: "step", label: first.t, go: goFor(first), then, lesson: ph.lesson};
}
function goFor(item){
  if(item.at === "session") return sessionOpen(item.id) ? WHERE.session.go(item.id) : "";
  const t = item.at === "tool" && WHERE.tool[item.id];
  return t ? t.go() : "";
}
function noteFor(item){
  if(item.at === "session") return WHERE.session.note;
  if(item.at === "tool") return (WHERE.tool[item.id] || {}).note || "On the platform";
  return (WHERE[item.at] || {}).note || "";
}

// One row per activity, in the guide's order for that day.
function stepRow(item){
  const go = goFor(item), note = noteFor(item);
  return `<li class="ftn-step${go ? " on" : ""}">
    <span class="ftn-what"><b>${esc(item.t)}</b><span>${esc(item.kind)} · ${esc(note)}</span></span>
    ${go ? `<button class="btn btn-ghost btn-sm" type="button" onclick="${go}">Open →</button>` : ""}</li>`;
}

function card(){
  if(!forTrainee()) return "";                      // trainers see the whole guide in Admin → 📘 Curriculum
  const spot = place(); if(!spot) return "";
  const d = spot.day, next = nextStep(spot);
  const just = root.FT_JUST_FINISHED, after = ((root.FTDays && FTDays.DAYS) || []).find(x => x.day === d.day + 1);
  // ✓ Finish Training on a lesson lands here (js/ft-process.js) with the lesson studied but not done:
  // the band says so, and that the day's activities come before its Process Questions.
  // only while that lesson is still studied-but-not-done: once its Process Questions pass, "now today's
  // activities" is no longer true, whatever the trainee did or didn't navigate through in between
  const stud = root.FT_JUST_STUDIED && !done(root.FT_JUST_STUDIED) ? root.FT_JUST_STUDIED : null;
  if(just) shown = true;                            // the dashboard has drawn the "just finished" form
  if(stud) shownStudied = true;                     // the dashboard has drawn the "studied" form
  const head = stud ? `✓ ${esc(lessonTitle(stud))} studied — now today’s activities`
    : just ? `✓ ${esc(lessonTitle(just))} finished`
    : "📍 Where you are";
  if(spot.stage === "complete"){
    return `<section class="card ftn ftn-done"><h3>🎓 Every lesson is finished</h3>
      <p>You have reached the end of the ${FTDays.COUNT}-day programme. Your trainer confirms your demos and your Monitoring Sheet; your certificate follows from there.</p></section>`;
  }
  const list = ordered(d);
  return `<section class="card ftn${just || stud ? " ftn-just" : ""}">
    <div class="ftn-head">
      <span class="ftn-where">${head}</span>
      <h3>Day ${d.day} · ${esc(d.role)}</h3>
    </div>
    <div class="ftn-now"><span>Your next step</span>${next
      ? (next.go ? `<button class="btn btn-navy btn-sm" type="button" onclick="${next.go}">${esc(next.label)} →</button>`
                 : `<b class="ftn-live">${esc(next.label)}${next.kind === "lesson" ? " — it opens as soon as that lesson is open for your batch." : next.kind === "work" ? " — in the classroom and the training GC." : " — this one isn’t open to you yet."}</b>`)
      : `<b class="ftn-live">This day runs with your trainer — nothing to open here. Follow the steps below.</b>`}</div>
    ${next && next.then ? `<div class="ftn-then"><span>When today’s activities are done</span>
      <button class="btn btn-ghost btn-sm" type="button" onclick="${next.then.go}">${esc(next.then.label)} →</button></div>` : ""}
    <details class="ftn-more"><summary>The rest of Day ${d.day}${(d.lessons || []).length ? " — lesson, activities, then Process Questions" : ", in the guide's order"} — ${list.length} steps</summary>
      <ul class="ftn-list">${list.map(stepRow).join("")}</ul></details>
    ${after ? `<p class="ftn-after">After that: <b>Day ${after.day} · ${esc(after.role)}</b>${(after.lessons || []).length ? ` — Lesson ${after.lessons.join(" and ")}` : ""}.</p>` : ""}
  </section>`;
}

(root.LSH_HOME_NOTICES = root.LSH_HOME_NOTICES || []).push(function(){
  try{ return card(); }catch(err){ return ""; }
});

/* The band takes its "you just finished this" form the first time the dashboard is drawn after a
   lesson becomes finished. Nothing here wraps the finish itself: a lesson with process questions is
   finished by its ✍️ Knowledge Check sheet, not by the ✓ Finish Training button (js/ft-process.js
   routes there and records `studied` on the way), so the only reliable signal is the record itself
   changing. This watches for that and leaves every existing route alone. */
const finishedNow = () => { const out = []; for(const k in (state.progress || {})) if(done(k)) out.push(String(k)); return out.sort().join(","); };
const __nextAfter = root.afterRender;
root.afterRender = function(){
  const out = __nextAfter ? __nextAfter.apply(this, arguments) : undefined;
  try{
    // Nobody signed in yet: a trainee's whole progress record arrives with them (the cloud restore in
    // submitLogin fills it in one go), and that arrival is not a finish — so the baseline is taken on
    // the first draw they are actually signed in for, not on the login page's empty record.
    if(!forTrainee()){ seen = null; shown = false; shownStudied = false; root.FT_JUST_FINISHED = null; root.FT_JUST_STUDIED = null; return out; }
    const now = finishedNow();
    if(seen === null) seen = now;                       // the first draw of a session is not a finish
    else if(now !== seen){
      const fresh = now.split(",").filter(Boolean).find(x => !seen.split(",").includes(x));
      seen = now;
      if(fresh){ root.FT_JUST_FINISHED = Number(fresh); shown = false; if(typeof render === "function") setTimeout(render, 0); }
    }
    // The "just finished" form is for that one arrival on 📚 Dashboard, so it waits for the dashboard
    // to draw it and is cleared when the trainee moves on. It cannot be cleared on the view the lesson
    // was finished on: a lesson with process questions finishes on its ✍️ Knowledge Check (state.view
    // "kc"), several views away from the dashboard, and clearing there would mean nobody ever saw it.
    if(root.FT_JUST_FINISHED && shown && state.view !== "modules" && state.view !== "dashboard"){
      root.FT_JUST_FINISHED = null; shown = false;
    }
    // the "studied — now today's activities" form, likewise: drawn once on the dashboard, then let go
    if(root.FT_JUST_STUDIED && shownStudied && state.view !== "modules" && state.view !== "dashboard"){
      root.FT_JUST_STUDIED = null; shownStudied = false;
    }
  }catch(err){}
  return out;
};

/* The same next step, as one line for a page that is not 📚 Dashboard.
   A lesson with process questions is finished on its ✍️ Knowledge Check, and the trainee was left
   standing there: a toast, confetti, and no way on. renderKc() puts this under a passed check, so
   the thing to do next is on the page that finished the lesson. */
function compact(justLesson){
  if(!forTrainee()) return "";
  const spot = place(); if(!spot) return "";
  const next = nextStep(spot), d = spot.day;
  const head = justLesson ? `✓ ${esc(lessonTitle(justLesson))} finished` : "What's next";
  const body = !next ? `<b class="ftn-live">Day ${d.day} runs with your trainer — nothing to open here.</b>`
    : next.go ? `<button class="btn btn-navy btn-sm" type="button" onclick="${next.go}">${esc(next.label)} →</button>`
    : `<b class="ftn-live">${esc(next.label)}${next.kind === "lesson" ? " — it opens as soon as that lesson is open for your batch." : " — this one isn’t open to you yet."}</b>`;
  return `<section class="card ftn ftn-just ftn-compact">
    <div class="ftn-head"><span class="ftn-where">${head}</span><h3>Day ${d.day} · ${esc(d.role)}</h3></div>
    <div class="ftn-now"><span>Your next step</span>${body}</div>
    <p class="ftn-after">The rest of Day ${d.day} is on <a class="ftn-link" onclick="goto('modules')">📚 Dashboard</a>.</p>
  </section>`;
}

root.FTNextStep = {place, nextStep, card, compact};

(function(){ const s = document.createElement("style"); s.id = "ft-next-step"; s.textContent = `
.ftn{padding:16px 18px;margin-bottom:14px;border-left:4px solid var(--orange);}
.ftn.ftn-just{border-left-color:var(--navy);background:#F6F9FF;}
.ftn.ftn-done{border-left-color:var(--navy);}
.ftn-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
.ftn-where{font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--orange-deep);}
.ftn.ftn-just .ftn-where{color:var(--navy);}
.ftn h3{margin:0;color:var(--navy);font-size:18px;}
.ftn-now{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 12px;border-radius:10px;background:#FFF6EC;margin-bottom:12px;}
.ftn.ftn-just .ftn-now{background:#EAF1FF;}
.ftn-now span{font-size:12.5px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;}
.ftn-live{font-size:13.5px;font-weight:500;color:var(--navy);}
/* 📚 Dashboard fits one screen (README), so the day's steps stay folded until they're asked for. */
.ftn-more > summary{font-size:12.5px;font-weight:700;color:var(--navy);cursor:pointer;padding:4px 0;list-style-position:inside;}
.ftn-more > summary:hover{text-decoration:underline;}
.ftn-more[open] > summary{margin-bottom:8px;}
.ftn-more .ftn-list{max-height:min(46vh,420px);overflow:auto;}
.ftn-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;}
.ftn-step{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 10px;border:1px solid var(--line,#e5e7eb);border-radius:8px;background:#fff;}
.ftn-step.on{border-color:#cdd9ee;}
.ftn-what{display:flex;flex-direction:column;min-width:0;}
.ftn-what b{font-size:13.5px;color:var(--navy);font-weight:600;}
.ftn-what span{font-size:12px;color:var(--ink-soft);}
.ftn-after{margin:10px 0 0;font-size:13px;color:var(--ink-soft);}
.ftn-compact{margin-top:14px;}
.ftn-then{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:6px 12px;margin:-4px 0 12px;}
.ftn-then span{font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;}
.ftn-link{color:var(--navy);font-weight:600;cursor:pointer;text-decoration:underline;}
@media(max-width:700px){.ftn-step{flex-direction:column;align-items:flex-start;gap:6px;}}
`; document.head.appendChild(s); })();
})(typeof globalThis !== "undefined" ? globalThis : this);
