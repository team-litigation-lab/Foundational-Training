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
     • 🗓 Attorney Calendar Management Activity (Day 5): one card with its three steps (CAL_CARDS; was window.ftCalActivityCard,
       js/ft-calendar.js) that opens this platform's own 📅 Calendaring Simulators on the activity (goto('calsim','attorney-activity')),
       where it is checked, submitted and graded.
     • Trainees: a card opens with its lesson (Admin → 📅 Open Lessons).
     • 📅 By the day: every card is filed under the first training day it is worked on (Day 3, Day 4 …), each day a
       section that folds away once all its work is ✓ Done. A card is ✓ Done when its work is in (a session or activity
       submitted, the trainer's Passed, every recording logged, a letter uploaded and checked at 70%+, a drill round at 70%+), and its button becomes
       👁 Review: the same page, on what was handed in. Filters: All · To do · ✓ Done; the day chips jump to a day.
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
window.ftsPortalHref = portalHref;   // (the activity's own page opens the Portal's calendar beside it: js/ft-calactivity.js)
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
/* 🔒 Every activity is on the Practice Lab from the start, locked: it opens for a trainee only when its day's training is
   unlocked (the trainer's 📅 Open Lessons: the day reached and started, js/ft-day-locks.js labOpen). Until then its card says
   which day it opens with and its buttons do nothing. Trainers (and 👁 Switch View) see every activity open. */
const dayOn = days => !isTrainee() || !days || !days.length || (reached([Math.min(...days)]) && (!window.FTDayLocks || FTDayLocks.labOpen([Math.min(...days)])));
const listed = () => true;
window.ftsToolOn = toolOn;   // for links between tools (js/ft-calweek.js): the same gate as the tool's card
/* ---------- ✓ Done: what the trainee has finished, read once a visit ----------
   The records each tool already keeps for 🏅 My Performance, read together: a card is ✓ Done once its work is in
   (submitted, graded, every recording logged), and its button becomes 👁 Review: it opens the same page, on what was
   handed in. The Practice Sessions and the trainer's results come with their own cards (js/ft-sessions.js). */
const DONE = {who: null, at: 0, loading: null, rec: {}, calweek: null};
const GUIDE_IDS = () => ((window.FTGuide && FTGuide.list) || []).map(g => g.id);
function loadDone(force){
  if(!isTrainee() || DONE.loading) return DONE.loading;
  if(!force && DONE.who === state.traineeId && Date.now() - DONE.at < 60000) return null;
  const id = state.traineeId, keys = ["calcheck:", "calrules:", "drills:", "listening:", "transcribe:", "simresults:", "calsim:"].map(k => k + id)
    .concat(GUIDE_IDS().map(g => `guide:${id}:${g}`));
  DONE.who = id; DONE.at = Date.now();
  const week = window.FTCalWeek && FTCalWeek.api ? FTCalWeek.api("get").then(j => j && j.record).catch(() => null) : Promise.resolve(null);
  // (the Call Listening sets as the trainer set them: how many recordings make a set ✓ Done)
  const sets = window.FTListen && FTListen.loadSets ? Promise.resolve(FTListen.loadSets()).catch(() => null) : null;
  DONE.loading = Promise.all([sharedGetMany(keys).catch(() => []), week, sets]).then(([vals, rec]) => {
    DONE.rec = {}; keys.forEach((k, i) => { DONE.rec[k.slice(0, k.indexOf(":") + 1) + (k.startsWith("guide:") ? k.split(":")[2] : "")] = (vals || [])[i] || null; });
    DONE.calweek = rec || null; DONE.loading = null;
    if(state.view === "simulators") render();
  }).catch(() => { DONE.loading = null; });
  return DONE.loading;
}
window.addEventListener("focus", () => { if(state.view === "simulators" && Date.now() - DONE.at > 60000) loadDone(true); });
const R = k => DONE.rec[k] || null;
const st = (done, live) => done ? "done" : live ? "live" : "todo";
// ✓ Done needs a passing result, not just an attempt: 70%, the platform's pass mark (a booking: 80%, the Booking Rule Check's own green)
const PASS_PCT = 70;
const prov = () => ((R("simresults:") || {}).results || []).filter(x => x && x.simulator === "Drafting — Medical Provider");
// each tool's state (todo / live / done) from its record
const TOOL_STATUS = {
  calactivity: () => { const b = (R("simresults:") || {}).best || {}, c = R("calsim:") || {};
    return st(!!b["Calendaring Activity"] || (c.submissions || []).some(x => /attorney/.test(String(x.scn || ""))), (c.autos || []).some(x => /attorney/.test(String(x.scn || "")))); },
  calcheck: () => { const c = R("calcheck:") || {}; return st(Array.isArray(c.submits) && c.submits.length > 0, c.entries && Object.keys(c.entries).length > 0); },
  calweek: () => { const w = DONE.calweek; return st(!!(w && w.submittedAt), !!(w && Array.isArray(w.events) && w.events.length)); },
  calrules: () => { const b = (R("calrules:") || {}).bookings; return st(Array.isArray(b) && b.some(x => (x.pct || 0) >= 80), Array.isArray(b) && b.length > 0); },
  transcribe: () => { const r = ((R("transcribe:") || {}).r) || {}; return st(!!((r[1] || {}).submittedAt && (r[2] || {}).submittedAt), !!((r[1] || {}).startedAt || (r[2] || {}).startedAt)); },
  lor: () => { const b = ((R("simresults:") || {}).best || {})["Drafting — LOR"]; return st(!!b && Number(b.score) >= PASS_PCT, !!b); },
  medlor: () => { const r = prov().filter(x => !/Lien Balance/i.test(String(x.scenario || ""))); return st(r.some(x => Number(x.score) >= PASS_PCT), r.length > 0); },
  lienbv: () => { const r = prov().filter(x => /Lien Balance/i.test(String(x.scenario || ""))); return st(r.some(x => Number(x.score) >= PASS_PCT), r.length > 0); }
};
const guideStatus = gid => { const g = R("guide:" + gid) || {}; return st(!!g.submittedAt, !!g.html); };
const drillStatus = sid => { const runs = (((R("drills:") || {}).runs) || []).filter(r => r.set === sid);
  return st(runs.some(r => r.total && r.score / r.total * 100 >= PASS_PCT), runs.length > 0); };

/* ---------- 📅 the calendaring cards: one per day, its steps in order ---------- */
const CAL_CARDS = [
  {kicker: "Day 5 · Calendar Management", title: "🗓 Attorney Calendar Management Activity",
   note: "Manage the attorney’s Google Calendar in Pacific Time, then check every event you entered. Two steps, in this order:",
   steps: [
     {id: "calactivity", t: "Do the activity", n: "The ten appointments and their travel blocks, each with its time zone, color, location, guests, reminders and notes.",
      b: [["Open the activity", "goto('calactivity')"]]},
     {id: "calcheck", t: "Check your calendar on the ✅ Calendar Activity Check", n: "Enter what each event holds: every field is checked against the activity, then submit it.", b: [["Check my calendar", "goto('calcheck')"]]},
     // (the curriculum has two calendaring pieces: this activity, and the Calendar Management Mock Call done live with the trainer.
     // No 3rd step: the Standard Training - Calendaring Activity (next week's calendar) and the Booking Rule Check are off the Practice Lab)
   ]}
];
// Day 6's Booking Rule Check, folded into its Practice Session's card (📅 Standard Training - Appointment Setting Mock
// Calls, session "calendaring"): after each mock call, the booking is recorded and checked against the scheduling rules
const RULES_STEP = {id: "calrules", t: "After each call: check the booking", n: "Record the booking you made on the call: consult days, phone hours, buffers, length limits, EST, the reminder, checked on the spot.", b: [["📅 Check a booking", "goto('calrules')"]]};
function foldRules(html){
  if(!html) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  const c = t.content.querySelector('.fts-card[data-sid="calendaring"]:not(.fts-locked)'); if(!c) return html;
  c.classList.add("fts-calcard");
  // (the session's days and the check's, so the card is filed under each)
  const ds = new Set(String(c.dataset.days || "").split(",").map(Number).filter(Boolean).concat(window.FTDays ? FTDays.forTool("calrules") : []));
  c.dataset.days = [...ds].sort((a, b) => a - b).join(",");
  c.insertAdjacentHTML("beforeend", `<ol class="fts-calsteps">${stepsHtml([RULES_STEP], 0)}</ol>`);
  return t.innerHTML;
}
const STEP_CHIP = {done: "✓ Done", live: "🟢 In progress", todo: "Not started"};
function calCard(c){
  const days = id => window.FTDays ? FTDays.forTool(id) : [];
  // (a step shows once its day is open; the simulator step, kept on no record here, with the card's other steps)
  const steps = c.steps;
  if(!steps.length) return null;
  const graded = steps.filter(x => TOOL_STATUS[x.id]), sts = graded.map(x => isTrainee() ? TOOL_STATUS[x.id]() : "todo");
  const status = sts.length && sts.every(x => x === "done") ? "done" : sts.some(x => x !== "todo") ? "live" : "todo";
  const all = [...new Set(steps.flatMap(x => days(x.id)))].sort((a, b) => a - b);
  const h = `<div class="card fts-card fts-calcard"><div class="fts-kicker">${esc(c.kicker)}</div><h3>${c.title}</h3>
    <p class="fts-note">${esc(c.note)}</p>
    <ol class="fts-calsteps">${stepsHtml(steps, 1)}</ol></div>`;
  return {h, days: all, status};
}
function stepsHtml(steps, from){
  return steps.map((x, i) => { const s1 = isTrainee() && TOOL_STATUS[x.id] ? TOOL_STATUS[x.id]() : "";
    return `<li class="fts-calstep${s1 ? " is-" + s1 : ""}"><div class="fts-calstep-h"><b>${from ? `${i + from}. ` : ""}${esc(x.t)}</b>${s1 ? `<span class="fts-chip fts-chip-${s1}">${STEP_CHIP[s1]}</span>` : ""}</div>
      <p>${esc(x.n)}</p><div class="fts-calstep-b">${x.b.map(([l, on, tt], j) => `<button class="btn ${j ? "btn-ghost" : s1 === "done" ? "btn-ghost" : "btn-navy"} btn-sm" type="button"${tt ? ` title="${esc(tt)}"` : ""} onclick="${on}">${s1 === "done" && !j ? "👁 Review" : esc(l)}</button>`).join(" ")}</div></li>`; }).join("");
}

/* ---------- the cards, filed by training day ---------- */
const typeTag = {session: "🟢 Practice Session", trainer: "🧑‍🏫 With your trainer", tool: "🧰 Activity", listening: "🎧 Call Listening", calendar: "📅 Calendar", drafting: "🧰 Drafting Tools", any: "📚 Any day"};
// a card's root gets its days, its type and its state: ✓ Done relabels its first button 👁 Review (the same page, on the work handed in)
function mark(html, meta){
  if(!html) return [];
  const t = document.createElement("template"); t.innerHTML = html;
  return [...t.content.children].filter(el => el.classList.contains("fts-card")).map(el => {
    const days = meta && meta.days ? meta.days : String(el.dataset.days || "").split(",").map(Number).filter(Boolean);
    // (🔒 its day not unlocked yet for this trainee: locked, its buttons off, the day it opens with on its chip)
    const lockedDay = days.length && !dayOn(days) ? Math.min(...days) : 0;
    if(lockedDay){ el.classList.add("fts-locked");
      el.querySelectorAll("button, a.btn").forEach(b => { b.setAttribute("disabled", ""); b.removeAttribute("onclick"); b.removeAttribute("href"); b.title = `Opens when Day ${lockedDay}'s training is unlocked`; }); }
    const status = el.classList.contains("fts-locked") ? "locked" : (meta && meta.status) || el.dataset.status || "todo";
    const type = (meta && meta.type) || el.dataset.type || "tool";
    el.dataset.days = days.join(","); el.dataset.status = status; el.dataset.type = type;
    // (🔑 which activity this is: a deck's activity button routes to it, js/ft-lab-route.js)
    const lsid = /FTListen\.open\('([\w-]+)'\)/.exec(el.innerHTML || "");
    const key = (meta && meta.key === "listening" && lsid ? "listening:" + lsid[1] : meta && meta.key) || (el.dataset.sid ? "session:" + el.dataset.sid : "") || (el.dataset.aid ? "trainer:" + el.dataset.aid : "");
    if(key) el.dataset.key = key;
    // (a trainer card's own "(Day 5)": the card is filed under the curriculum's day, which says it)
    const h3 = el.querySelector("h3"); if(h3) h3.innerHTML = h3.innerHTML.replace(/\s*\(Day \d+\)\s*$/, "");
    el.classList.add("fts-st-" + status);
    const k = el.querySelector(".fts-kicker");
    if(k && meta && meta.kicker) k.textContent = meta.kicker;
    // the card's top line: what it is, and where the trainee is with it
    const top = document.createElement("div"); top.className = "fts-card-top";
    const tag = document.createElement("span"); tag.className = "fts-type"; tag.textContent = typeTag[type] || ""; top.appendChild(tag);
    const chip = document.createElement("span"); chip.className = "fts-chip fts-chip-" + status;
    // (a trainer-led activity isn't the trainee's to start: it waits for the session with the trainer, who records the result)
    chip.textContent = {done: "✓ Done", live: "🟢 In progress", redo: "🔁 Redo", locked: lockedDay ? `🔒 Opens with Day ${lockedDay}` : "🔒 Locked", todo: !isTrainee() ? "" : type === "trainer" ? "⏳ With your trainer" : "Not started"}[status] || "";
    if(chip.textContent) top.appendChild(chip);
    el.insertBefore(top, el.firstChild);
    if(status === "done"){
      const b = el.querySelector(".fts-tool-act .btn-navy");
      if(b && !/Review/.test(b.textContent)){ b.textContent = "👁 Review"; b.classList.remove("btn-navy"); b.classList.add("btn-ghost"); b.title = "Done: open it again to look over what you handed in"; }
    }
    return {days, status, type, html: el.outerHTML};
  });
}
// a small card of our own (a day's Process Guide, drill set, MedLOR, Lien BV)
// (📌 on every demo's card: what the tutorial shows is the firm's own way)
const VLF = `<span class="fts-vlf">📌 This is a VLF-established protocol. The process may vary depending on the law firm you will work with.</span>`;
const miniCard = (kicker, title, note, btn, onclick) => `<div class="card fts-card"><div class="fts-kicker">${esc(kicker)}</div><h3>${title}</h3>
    <p class="fts-note">${note}</p><div class="fts-tool-act"><button class="btn btn-navy btn-sm" type="button" onclick="${onclick}">${btn}</button></div></div>`;
const dayOpen = d => reached([d]) && (!window.FTDayLocks || FTDayLocks.labOpen([d]));
function labItems(){
  // (off the Practice Lab, not in the curriculum or not the trainee's to do here: the 🩺 Medical Records practice session
  // (Day 14's MedLOR is the 🩺 MedLOR + HIPAA Drafting card), the trainer's Intake Mock Call and LV Request Demo cards, and the Intake Worksheet's
  // trainer card (the worksheet is answered on the 📦 Intake Packet & Intake Documents card). The trainer still scores them.)
  const OFF = /data-sid="(?:records|reception|intake)"|<h3>(Intake Mock Call with the trainer|Intake Worksheet|LV \(Lien Verification\) Request Demo)\b/;
  const out = [], push = (html, meta) => out.push(...mark(html, meta).filter(x => !OFF.test(x.html)));
  const tool = (fn, id, type) => typeof window[fn] === "function" && listed(id) ? push(window[fn](), {days: window.FTDays ? FTDays.forTool(id) : [], status: isTrainee() && TOOL_STATUS[id] ? TOOL_STATUS[id]() : "todo", type, key: id}) : 0;
  // (no 🧑‍🏫 With your trainer cards: the live mock calls and demos are done with the trainer, who records and scores them in
  // Trainer Inputs and Graders; the Practice Lab is the trainee's own activities)
  // (🟢 one Practice Session card: 📅 Standard Training - Appointment Setting Mock Calls, its route to the Call Sim and the Google
  // Calendar Sim, with its Booking Rule Check folded in. The Reception and Intake mock calls are done live with the trainer,
  // who scores them: no card; their pages still open from a slide or a link)
  if(window.FTSessions) push(foldRules(FTSessions.cards()));   // (Reception's and Intake's cards are taken off by OFF, below)
  // 📅 the two calendaring activities, one card each day: Day 5's Attorney Calendar Management Activity (the activity on
  // the simulator, its ✅ check, next week's calendar) and Day 6's Calendar Management Mock Calls (the bookings on the
  // Google Calendar Simulator, each recorded on the Booking Rule Check). Each step keeps its own page and its own state.
  CAL_CARDS.forEach(c => { const html = calCard(c); if(html) push(html.h, {days: html.days, status: html.status, type: "calendar", key: "calendar", kicker: `${window.FTDays ? FTDays.label(html.days) : "Day 6"} · Calendar Management`}); });
  tool("ftTranscribeCard", "transcribe", "drafting"); tool("ftLorCard", "lor", "drafting");
  const DAYMAX = window.FTDays ? FTDays.COUNT : 16;
  // (no 🩺 MedLOR + HIPAA Drafting or 🧾 Lien Balance Verification Drafting cards: not curriculum activities, only practice
  // the trainees were told of to help them with their demos. The LOR Drafting Activity, Day 11's, is the curriculum's)
  // 📦 Day 8's Intake Packet activity (its steps, done here rather than on the deck: js/ft-intake.js #/intakepacket)
  push(miniCard("Day 8 · Intake Training", "📦 Intake Packet &amp; Intake Documents", "Download and rename your assigned packet, extract and rename its documents, answer the Intake Worksheet here, then update #16 of your Monitoring Sheet.", "Open the activity", "goto('intakepacket')"),
    {days: [8], type: "tool", key: "intakepacket"});
  // (no 📘 Process Guide or 🏷 Naming & Reporting Drill cards: they only helped the trainees prepare their demos, not activities of
  // the curriculum; their pages still open from a link: #/guide, #/drills)
  if(typeof window.ftListenCards === "function") push(ftListenCards(isTrainee() ? R("listening:") : null), {type: "listening", key: "listening"});
  // 🎧 Day 3's Reception Listening Activity (5 practice calls with challenges, its 📝 Answer Sheet): in the curriculum and the
  // deck, so here too, where the activity is done
  if(window.FTListen && FTListen.pop)
    push(miniCard("Day 3 · Reception Training", "🎧 Reception Listening Activity: 5 practice calls", "Five calls with their challenges: listen, log each on the Call Listening Log, then 📝 Submit for Grading.", "Open the activity", "FTListen.open('recact')"),
      {days: [3], type: "listening", key: "recact"});
  return out;
}
// 📚 a day's lesson card and Part, as the Dashboard shows them (js/ft-day-decks.js LESSON_CARDS, js/ft-day-locks.js PARTS/CARD_TITLES)
const LESSON_PARTS = [
  {title: "Virtual Assistant Essentials", parts: [[1]]},
  {title: "Law Firm Communication", parts: [[2]]},
  {title: "Personal Injury Process Flow / Reception", parts: [[3], [4]]},
  {title: "Calendaring & Appointment Setting", parts: [[5], [6]]},
  {title: "Intake Specialist", parts: [[7], [8], [9]]},
  {title: "Claims Specialist", parts: [[10], [11], [12]]},
  {title: "Medical Records Specialist", parts: [[13], [14, 15], [16]]}];
function lessonPart(d){
  for(const c of LESSON_PARTS){ const k = c.parts.findIndex(p => p.includes(Number(d))); if(k >= 0) return {title: c.title, part: c.parts.length > 1 ? `Part ${k + 1}` : ""}; }
  return null;
}
window.ftsLessonPart = lessonPart;
// (a card on a later day of its work — Reception Mock Calls on Day 5's buffer: one line that goes to its card, on its first day)
function contRow(x, first){
  const t = document.createElement("template"); t.innerHTML = x.html; const el = t.content.firstElementChild;
  const title = el && el.querySelector("h3") ? el.querySelector("h3").textContent.trim() : "This activity";
  const key = el && el.dataset.key ? el.dataset.key : "";
  return `<button type="button" class="fts-cont-row" onclick="FTLabRoute.go(${first}, '${esc(key)}', state.ftLabFrom)"><span>↻</span><b>${esc(title)}</b><i>continues today, from Day ${first}</i><em>Go to it →</em></button>`;
}
function renderSimulators(){
  if(isTrainee()) loadDone();
  const items = labItems();
  const any = [];
  // (only scored work is on the Practice Lab: no 🧪 Calendar Practice (VA Practice Only) and no 📚 Knowledge Base card)
  // by the first day a card is worked on (Reception's Days 4–5 is under Day 4); a card the trainer can't place goes to Any day
  // (📅 strictly the curriculum: every training day reached has its section, labelled with its lesson card and Part, and a card
  // is under each day the Training Guide works it on, js/ft-day-activities.js; on a later day it says it continues)
  const byDay = {};
  items.forEach(x => { if(!x.days.length){ any.push(x); return; } const first = Math.min(...x.days);
    (byDay[first] = byDay[first] || []).push(x); });   // (under its first day only: no "continues today, from Day N" row on the days after)
  const COUNT = window.FTDays ? FTDays.COUNT : 16, upto = seesAll() ? COUNT : Math.min(COUNT, reachedDay());
  for(let d = 1; d <= upto; d++) byDay[d] = byDay[d] || [];
  // (a day with no Practice Lab work, Days 1–2's lesson decks and classroom, has no section and no chip)
  const days = Object.keys(byDay).map(Number).filter(d => byDay[d].length).sort((a, b) => a - b);
  const order = {session: 0, calendar: 1, drafting: 2, listening: 3, tool: 4, trainer: 5};
  const flt = (isTrainee() && state.ftsFilter) || "all", counted = x => x.status !== "locked" && x.type !== "any";
  const pass = x => flt === "all" || (flt === "done" ? x.status === "done" : x.status !== "done");
  const all = items.filter(counted), doneN = all.filter(x => x.status === "done").length, own = x => !x.cont;
  const last = days.length ? days[days.length - 1] : 0;
  state.ftsDayOpen = state.ftsDayOpen || {};
  const section = d => {
    const list = byDay[d].slice().sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9)), shown = list.filter(pass);
    if(!shown.length && (list.length || flt !== "all")) return "";
    const c = list.filter(counted).filter(own), dn = c.filter(x => x.status === "done").length, complete = c.length && dn === c.length;
    const info = window.FTDays ? FTDays.of(d) : null, lp = lessonPart(d);
    // a day fully done folds away (its cards stay one click off, for review); the trainer's choice of open/closed is kept
    const open = flt !== "all" || (d in state.ftsDayOpen ? state.ftsDayOpen[d] : !complete || d === last);
    // (a row a day: its label on the left (the day, its lesson card and Part, how much is done), its cards on the right,
    // every card the same size with its button at the bottom; nothing folds away: what is left is the trainee's own work)
    return `<section class="fts-group fts-day fts-row ${complete ? "fts-day-done" : ""}" id="fts-day-${d}">
      <header class="fts-row-h"><span class="fts-day-n">Day ${d}</span>${lp ? `<span class="fts-day-lp"><b>${esc(lp.title)}</b>${lp.part ? `<i>${esc(lp.part)}</i>` : ""}</span>` : `<span class="fts-day-role">${info ? esc(info.role) : ""}</span>`}
        ${isTrainee() && c.length ? `<span class="fts-day-count ${complete ? "ok" : ""}">${complete ? "✓ All done" : `${dn} of ${c.length} done`}</span>` : ""}</header>
      <div class="fts-grid">${shown.map(x => x.html).join("")}</div></section>`;
  };
  const anyShown = any.filter(pass);
  const more = !seesAll() ? `<p class="fts-sub fts-more">🔒 An activity opens when its day's training is unlocked.</p>` : "";
  return `<div class="fts-hero"><h1>🛠 Practice Lab</h1>
      <p>Your live practice, day by day. Each training day lists the activities you do on the platform: Practice Sessions, Call Listening, the calendar, drafting, Process Guides and drills. Finished work is marked <b>✓ Done</b>: open it again with <b>👁 Review</b> to look over what you handed in.</p></div>
    ${!isTrainee() ? "" : `<div class="fts-bar card">
      ${isTrainee() && all.length ? `<div class="fts-prog"><b>${doneN} of ${all.length} done</b><span class="fts-prog-bar"><i style="width:${Math.round(doneN / all.length * 100)}%"></i></span></div>` : ""}
      ${isTrainee() ? `<div class="fts-filter" role="group" aria-label="Show">${[["all", "All"], ["todo", "To do"], ["done", "✓ Done"]].map(([k, l]) => `<button type="button" class="btn btn-sm ${flt === k ? "btn-navy" : "btn-ghost"}" onclick="ftsFilter('${k}')">${l}</button>`).join("")}</div>` : ""}
    </div>`}
    ${days.map(section).join("") || (flt !== "all" ? `<p class="fts-sub">${flt === "done" ? "Nothing marked done yet." : "Everything open so far is done. 🎉"}</p>` : "")}
    ${anyShown.length ? `<details class="fts-group fts-day" id="fts-day-0" open><summary><span class="fts-day-n">Any day</span><span class="fts-day-role">Practice and reference, whenever you like</span></summary>
      <div class="fts-grid">${anyShown.map(x => x.html).join("")}</div></details>` : ""}
    ${more}`;
}
window.ftsDayToggle = (d, open) => { state.ftsDayOpen = state.ftsDayOpen || {}; state.ftsDayOpen[d] = !!open; };
window.ftsFilter = k => { state.ftsFilter = k; render(); };
window.ftsJump = d => { const el = document.getElementById("fts-day-" + d); if(!el) return; el.open = true; el.scrollIntoView({behavior: "smooth", block: "start"}); };

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
// (the Calendaring Activity opens straight on its own calendar, gcal.html?track=activity, not the Calendaring Simulators' list)
// (opened signed in: a trainee's link carries their ticket, and a trainer's who came from the main Hub, theirs, js/lsh-tool-links.js)
window.ftsCalsim = function(track, scores){ window.open(track === "activity" && !scores ? portalHref("gcal.html") + "&track=activity"
  : portalHref("calsim.html") + "&track=" + encodeURIComponent(track) + (scores ? "&view=scores" : ""), "_blank", "noopener"); };
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
  // (in its own badge inside the Day line, so it still shows where the card hides the "Day N" words: js/ft-dash-academy.js)
  return html.replace(/(<div class="mh-day">)([\s\S]*?)(<\/div>)/, (m, a, t, c)=>`${a}${t.replace(/^&nbsp;$/, "")}<span class="mh-call">${t && t !== "&nbsp;" ? `<span class="mh-call-sep"> &middot; </span>` : ""}📞 ${b.score}%</span>${c}`);
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
.fts-vlf{display:block;margin-top:8px;padding:6px 10px;border-left:4px solid #E8590C;background:#FFF6EC;border-radius:8px;font-size:13.5px;font-weight:700;color:#7A3A0A;}
.fts-locked{opacity:.6;filter:grayscale(.35);} .fts-locked button[disabled], .fts-locked a.btn[disabled]{cursor:not-allowed;} #fts-skills{scroll-margin-top:84px;}
.fts-tpl{margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-soft);} .fts-tpl li{margin:1px 0;}
.fts-file{align-self:flex-start;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;background:#f1f5f9;color:var(--navy);border-radius:6px;padding:4px 8px;overflow-wrap:anywhere;}
.fts-sample{margin:0;} .fts-sample img{display:block;width:100%;height:auto;border:1px solid var(--line,#e5e7eb);border-radius:8px;}
.fts-sample figcaption{margin-top:4px;font-size:12px;color:var(--ink-soft);}
.fts-tool-act{display:flex;gap:8px;flex-wrap:wrap;}
.fts-tool-act a.btn{text-decoration:none;}
.fts-sub a{color:var(--orange-deep);font-weight:700;}
.fts-graded{margin:0;font-size:13.5px;color:var(--navy);background:#fff7ed;border-left:3px solid #f97316;border-radius:6px;padding:6px 10px;}
/* 🛠 the Practice Lab by the day: readable cards, a few to a row, each day its own section */
main.main-sims{max-width:1320px;padding:16px 20px 40px;}
main.main-sims .fts-hero{margin-bottom:10px;} main.main-sims .fts-hero h1{font-size:24px;margin:0 0 4px;}
main.main-sims .fts-hero p{margin:0;font-size:14px;max-width:900px;}
.fts-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;padding:10px 14px;margin:0 0 14px;}   /* (no day chips: the days are rows one under the other) */
.fts-prog{display:flex;align-items:center;gap:10px;font-size:13.5px;color:var(--navy);}
.fts-prog-bar{display:inline-block;width:140px;height:8px;border-radius:99px;background:#e2e8f0;overflow:hidden;} .fts-prog-bar i{display:block;height:100%;background:#16a34a;border-radius:99px;}
.fts-filter{display:flex;gap:6px;}
.fts-jumps{display:flex;flex-wrap:wrap;gap:6px;flex:1;justify-content:flex-end;}
.fts-jump{cursor:pointer;font-size:12.5px;font-weight:700;color:var(--navy);background:#f1f5f9;border:1px solid #e2e8f0;border-radius:99px;padding:3px 10px;text-decoration:none;white-space:nowrap;}
.fts-jump small{font-weight:600;color:var(--ink-soft);} .fts-jump.ok{background:#dcfce7;border-color:#86efac;} .fts-jump.ok small{color:#166534;}
.fts-day{margin:0 0 14px;border:1px solid var(--line,#e5e7eb);border-radius:14px;background:rgba(255,255,255,.55);padding:0 14px;scroll-margin-top:120px;}
.fts-day > summary{display:flex;align-items:center;gap:12px;flex-wrap:wrap;cursor:pointer;list-style:none;padding:12px 0;}
.fts-day > summary::-webkit-details-marker{display:none;}
.fts-day > summary::before{content:"▸";color:var(--ink-soft);font-size:14px;transition:transform .15s;} .fts-day[open] > summary::before{transform:rotate(90deg);}
.fts-day-n{font-size:18px;font-weight:800;color:var(--navy);} .fts-day-role{font-size:14px;color:var(--ink-soft);font-weight:600;}
.fts-day-count{margin-left:auto;font-size:12.5px;font-weight:700;color:var(--ink-soft);background:#f1f5f9;border-radius:99px;padding:3px 10px;}
.fts-day-count.ok{background:#dcfce7;color:#166534;}
.fts-day[open] > .fts-grid{padding:0 0 14px;}
main.main-sims .fts-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr));gap:12px;}
main.main-sims .fts-card{position:relative;padding:14px 16px;gap:8px;}
main.main-sims .fts-card h3{font-size:15.5px;}
.fts-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:20px;}
main.main-sims .fts-note{font-size:13px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}
main.main-sims .fts-tool-act{margin-top:auto;padding-top:4px;}
.fts-type{font-size:11px;font-weight:700;color:var(--navy);opacity:.75;letter-spacing:.02em;}
.fts-calsteps{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}
.fts-calstep{border:1px solid var(--line,#e5e7eb);border-left:4px solid #DB8437;border-radius:10px;padding:8px 10px;background:#fff;}
.fts-calstep.is-done{border-left-color:#16a34a;} .fts-calstep.is-live{border-left-color:#2563eb;}
.fts-calstep-h{display:flex;align-items:center;gap:8px;} .fts-calstep-h b{color:var(--navy);font-size:14px;}
.fts-calstep p{margin:3px 0 7px;font-size:13px;color:var(--ink-soft);line-height:1.4;}
.fts-calstep-b{display:flex;flex-wrap:wrap;gap:6px;}
.fts-chip{margin-left:auto;font-size:11.5px;font-weight:800;border-radius:99px;padding:3px 9px;background:#f1f5f9;color:var(--ink-soft);white-space:nowrap;}
.fts-chip-done{background:#16a34a;color:#fff;} .fts-chip-live{background:#dbeafe;color:#1e40af;} .fts-chip-redo{background:#fef3c7;color:#92400e;}
main.main-sims .fts-card.fts-st-done{border-color:#86efac;box-shadow:inset 4px 0 0 #16a34a;}
/* a card says what it is and opens it: its long lists (templates, guides, recordings) and samples are inside the tool */
main.main-sims .fts-card ul, main.main-sims .fts-card ol, main.main-sims .fts-label, main.main-sims .fts-sample, main.main-sims .fts-file{display:none !important;}
main.main-sims .fts-card details.ti-rub-card ul{display:block !important;}
main.main-sims .fts-card ol.fts-calsteps{display:flex !important;}
@media(min-width:760px){ main.main-sims .fts-card.fts-calcard{grid-column:span 2;} }
/* the same line on every trainer card (the section says it once): hidden here; the trainer's own comment still shows */
main.main-sims .fts-note-std{display:none !important;}
@media(max-width:640px){ .fts-jumps{justify-content:flex-start;} .fts-bar{position:static;} main.main-sims{padding:12px 16px 32px;} }
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
