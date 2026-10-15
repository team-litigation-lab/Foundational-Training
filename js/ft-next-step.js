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
     day whose lesson they have not finished yet; once every lesson is finished it is the first
     day that has no lesson of its own (the Lien Negotiator days, 17 and 18), and after those
     the programme is done. Only lesson progress is read (state.progress, which the platform
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

// Where the trainee stands in the curriculum, as a day of the guide.
function place(){
  const days = (root.FTDays && FTDays.DAYS) || [];
  if(!days.length) return null;
  const pending = days.find(d => (d.lessons || []).some(l => !done(l)));
  if(pending) return {day: pending, stage: "lesson"};
  const closing = days.find(d => !(d.lessons || []).length);
  if(closing) return {day: closing, stage: "closing"};
  return {day: days[days.length - 1], stage: "complete"};
}
// The one thing to do now: the day's own lesson while it is unfinished, else its first platform step.
function nextStep(spot){
  const d = spot.day;
  const lesson = (d.lessons || []).find(l => !done(l));
  if(lesson) return {kind: "lesson", lesson, label: `Open Lesson ${lesson}: ${lessonTitle(lesson)}`, go: `goto('day',${lesson})`};
  // The day's real work first: a Practice Session, then a tool that is particular to the day.
  // The typing and spelling tests run on all 18 days, so they are never the thing to send someone to.
  const linkable = (d.items || []).filter(x => x.at === "session" || (x.at === "tool" && WHERE.tool[x.id]));
  const first = linkable.find(x => x.at === "session") || linkable.find(x => x.id !== "skills");
  if(!first) return null;
  return {kind: "step", label: first.t, go: goFor(first)};
}
function goFor(item){
  if(item.at === "session") return WHERE.session.go(item.id);
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
  if(spot.stage === "complete"){
    return `<section class="card ftn ftn-done"><h3>🎓 Every lesson is finished</h3>
      <p>You have reached the end of the ${FTDays.COUNT}-day programme. Your trainer confirms your demos and your Monitoring Sheet; your certificate follows from there.</p></section>`;
  }
  return `<section class="card ftn${just ? " ftn-just" : ""}">
    <div class="ftn-head">
      <span class="ftn-where">${just ? `✓ ${esc(lessonTitle(just))} finished` : "📍 Where you are"}</span>
      <h3>Day ${d.day} · ${esc(d.role)}</h3>
    </div>
    <div class="ftn-now">${next
      ? `<span>Your next step</span><button class="btn btn-navy btn-sm" type="button" onclick="${next.go}">${esc(next.label)} →</button>`
      : `<span>Your next step</span><b class="ftn-live">This day runs with your trainer — nothing to open here. Follow the steps below.</b>`}</div>
    <details class="ftn-more"><summary>The rest of Day ${d.day}, in the guide's order — ${(d.items || []).length} steps</summary>
      <ul class="ftn-list">${(d.items || []).map(stepRow).join("")}</ul></details>
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
let seen = null;
const finishedNow = () => { const out = []; for(const k in (state.progress || {})) if(done(k)) out.push(String(k)); return out.sort().join(","); };
const __nextAfter = root.afterRender;
root.afterRender = function(){
  const out = __nextAfter ? __nextAfter.apply(this, arguments) : undefined;
  try{
    const now = finishedNow();
    if(seen === null) seen = now;                       // the first draw of a session is not a finish
    else if(now !== seen){
      const fresh = now.split(",").filter(Boolean).find(x => !seen.split(",").includes(x));
      seen = now;
      if(fresh){ root.FT_JUST_FINISHED = Number(fresh); if(typeof render === "function") setTimeout(render, 0); }
    }
    // the "just finished" form is for that one arrival: leaving the dashboard clears it
    if(root.FT_JUST_FINISHED && state.view !== "modules" && state.view !== "dashboard") root.FT_JUST_FINISHED = null;
  }catch(err){}
  return out;
};

root.FTNextStep = {place, nextStep, card};

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
@media(max-width:700px){.ftn-step{flex-direction:column;align-items:flex-start;gap:6px;}}
`; document.head.appendChild(s); })();
})(typeof globalThis !== "undefined" ? globalThis : this);
