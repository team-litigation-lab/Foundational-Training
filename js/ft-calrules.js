/* ============================================================
   📅 CALENDAR MOCK CALL: THE BOOKING RULE CHECK (Day 6)
   ------------------------------------------------------------
   The Training Guide's "Additional Activity: Calendar Management — Mock Call Scenarios": a caller asks for one of the
   firm's usual appointments, and the trainee books it on the attorney's calendar under the guide's scheduling rules.
   The trainer used to check every booking against those rules while running the call. Now, after each call, the trainee
   records the booking here (#/calrules) and it is checked on the spot:
     • the minimum information from the caller: name, callback number, DOB and DOL;
     • the slot: a weekday; new client consults only on Tuesdays and Thursdays, at most 3 a day, never after 5:00 PM;
       phone consults only 9:30 AM – 3:00 PM; follow-ups never in the morning; the meeting's length limit (30 minutes,
       45 for preparation, strategy and settlement meetings, 1 hour for conferences); a 15-minute buffer before and
       after, clear of lunch and the other bookings that day; a same-day booking only with the attorney's approval;
       the calendar in EST;
     • the alternatives: when the requested slot was taken, 2–3 other times offered;
     • the entry: the title "<Meeting type> – <Client name>", the meeting format (consultations are phone consults only),
       notes with the case context and the caller's demeanor, and an email reminder a day before.
   The trainer only scores the call itself: in Admin → 🧑‍🏫 Trainer Inputs, the Calendar Management Mock Call's
   scorecard shows the trainee's latest booking check and ⤓ fills the rule criteria from it (never over a typed score).
   Records: calrules:<id> (the trainee's own) {bookings:[{id, at, mode, scn, …the booking, checks, met, total, pct}]};
   settings:calrules (admins write, everyone reads) {lunch:"12:00-13:00"}. 🏅 My Performance shows the bookings'
   average (📅 Calendar booking rules). Admin → 🛠 Practice Lab → 📅 Booking Rules lists each trainee's bookings.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
// (a stored booking's figures, as numbers only: they are drawn into the trainer's pages)
const num = v => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : 0; };
const has = v => String(v == null ? "" : v).trim().length > 0;
const norm = v => String(v == null ? "" : v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mins = t => { const m = String(t || "").match(/^(\d{1,2}):(\d\d)/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const hhmm = n => { const h = Math.floor(n / 60), m = n % 60; return `${(h + 11) % 12 + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The guide's "Possible Scenarios / Nature of Request (to be calendared)": the title, the guide's note, and what the
// rules make of it (consult: a consultation, phone only; newClient: a new client consult; follow: a follow-up; max: minutes;
// format: the one the guide names for it).
const SCN = [
  {id:"new-pi", title:"Client Consultation: New PI Case", note:"New PI case; the client’s instructions", consult:true, newClient:true, max:30},
  {id:"doc-review", title:"Document Review Follow-Up", note:"Review contract documents; Zoom meeting", follow:true, max:30, format:"Video"},
  {id:"strategy", title:"Case Strategy Meeting", note:"Litigation planning", max:45},
  {id:"new-intake", title:"New Intake Consultation", note:"New intake consultation", consult:true, newClient:true, max:30},
  {id:"depo-prep", title:"Deposition Preparation", note:"Preparation for deposition", max:45},
  {id:"med-review", title:"Medical Records Review", note:"Review new PT notes", max:30},
  {id:"phone-consult", title:"Attorney Phone Consultation", note:"Clarification regarding demand", consult:true, max:30},
  {id:"signing", title:"Document Signing", note:"Settlement documents; in-office meeting", max:30, format:"In-office"},
  {id:"case-review", title:"Case Review Consultation", note:"Possible wrongful termination", consult:true, newClient:true, max:30},
  {id:"post-settlement", title:"Post-Settlement Meeting", note:"Ensure the full breakdown is available", max:45},
  {id:"discovery", title:"Discovery Conference", note:"Review interrogatories & RFPs", max:60},
  {id:"follow-up", title:"Follow-Up Call (Existing Client)", note:"Existing PI client; follow-up on insurance update", follow:true, max:30},
  {id:"missed-call", title:"Missed Call Consultation", note:"Contract dispute", consult:true, newClient:true, max:30},
  {id:"status", title:"Case Status Update", note:"Insurance update ready for review", max:30},
  {id:"urgent", title:"Urgent Meeting Request", note:"Urgent litigation update", max:30},
  {id:"mediation-prep", title:"Mediation Preparation Call", note:"Review mediation materials", max:45}
];
const scnOf = id => SCN.find(s => s.id === id);
const FORMATS = ["Phone", "Video", "In-office"];
const TONES = ["Easy", "Anxious", "Irritated", "Impatient", "Emotional"];
const MODES = [["practice", "Practice call"], ["trainer", "Mock call with the trainer"]];
// The guide's ✅ Scheduling Rules and 📌 Additional Notes, as the trainee reads them on the page
const RULES = ["Identify available slots only; avoid lunch, buffer time and blocked events.", "Offer 2–3 alternative times when a requested slot is unavailable.",
  "Clarify the meeting type (phone, video or in-person). All consultation meetings are phone consults only.", "The calendar is in EST. Set an email reminder a day before the event.",
  "New client consults: Tuesdays and Thursdays only, at most 3 a day, never after 5:00 PM.", "Phone consults only between 9:30 AM and 3:00 PM; the attorney calls the client, so confirm the callback number.",
  "Phone consults, status updates, follow-up calls, reviews, regular and urgent meetings and signings: 30 minutes at most. Preparation, strategy and settlement meetings: 45. Conferences: 1 hour.",
  "Follow-ups are not scheduled in the morning.", "A 15-minute buffer before and after every meeting.", "Same-day bookings need the attorney’s approval.",
  "Collect at least the caller’s name, callback number, date of birth (DOB) and date of loss (DOL)."];

/* ---------- the check ---------- */
const X = {lunch: "12:00-13:00"};
const lunchOf = () => { const m = String(X.lunch || "").match(/^(\d{1,2}:\d\d)-(\d{1,2}:\d\d)$/); return m ? [mins(m[1]), mins(m[2])] : null; };
// [rule, met (true/false, or null when it doesn't apply), what the rule asks, group]; the groups match the
// Calendar Management Mock Call scorecard's criteria (js/ft-rubrics.js)
function check(b, others){
  const s = scnOf(b.scn) || {}, start = mins(b.start), len = Number(b.length) || 0, end = start == null ? null : start + len;
  const day = b.date ? new Date(b.date + "T12:00:00").getDay() : -1, sameDay = !!b.date && b.date === (b.on || String(b.at || "").slice(0, 10));
  const phone = b.format === "Phone", lunch = lunchOf();
  const sameDate = (others || []).filter(o => o.id !== b.id && o.date === b.date && mins(o.start) != null);
  const clash = start == null ? [] : sameDate.filter(o => { const os = mins(o.start), oe = os + (Number(o.length) || 0); return start < oe + 15 && end + 15 > os; });
  const newThatDay = sameDate.filter(o => (scnOf(o.scn) || {}).newClient).length + 1;
  const alts = String(b.alts || "").split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).length;
  const title = norm(b.title), want = norm(`${s.title || ""} ${b.client || ""}`);
  return [
    ["The caller’s name, callback number, DOB and DOL", has(b.client) && String(b.callback || "").replace(/\D/g, "").length >= 10 && /^\d{4}-\d\d-\d\d$/.test(b.dob || "") && /^\d{4}-\d\d-\d\d$/.test(b.dol || "") && b.dob < b.dol, "All four, with a 10-digit number and a DOB before the DOL", "info"],
    ["On a weekday", day >= 1 && day <= 5, "Monday to Friday", "slot"],
    ["Within the meeting’s length limit", len > 0 && len <= (s.max || 30), `${s.title || "This meeting"}: ${s.max || 30} minutes at most`, "slot"],
    ["New client consults on a Tuesday or Thursday, before 5:00 PM", s.newClient ? (day === 2 || day === 4) && end != null && end <= 17 * 60 : null, "Tuesdays and Thursdays only; none after 5:00 PM", "slot"],
    ["At most 3 new client consults that day", s.newClient ? newThatDay <= 3 : null, `This would be number ${newThatDay} that day`, "slot"],
    ["Phone consults between 9:30 AM and 3:00 PM", phone ? start != null && start >= 9 * 60 + 30 && end <= 15 * 60 : null, "9:30 AM – 3:00 PM", "slot"],
    ["Follow-ups not in the morning", s.follow ? start != null && start >= 12 * 60 : null, "From 12:00 PM", "slot"],
    ["A 15-minute buffer, clear of lunch and the other bookings that day", start != null && !clash.length && !(lunch && start < lunch[1] + 15 && end + 15 > lunch[0]),
      clash.length ? `Too close to: ${clash.map(o => `${o.title || (scnOf(o.scn) || {}).title} at ${hhmm(mins(o.start))}`).join("; ")}` : lunch ? `Lunch is ${hhmm(lunch[0])} – ${hhmm(lunch[1])}` : "", "slot"],
    ["Same-day booking approved by the attorney", sameDay ? !!b.approved : null, "Ask the attorney before booking today", "slot"],
    ["The calendar in EST", !!b.est, "Eastern Time", "slot"],
    ["2–3 alternative times offered", b.unavailable ? alts >= 2 && alts <= 3 : null, b.unavailable ? `${alts} offered` : "", "alt"],
    ["The title: “Meeting type – Client name”", !!title && !!b.client && title === want, `${s.title || "Meeting type"} – ${b.client || "Client Name"}`, "entry"],
    ["The meeting format", s.consult ? b.format === "Phone" : s.format ? b.format === s.format : FORMATS.includes(b.format), s.consult ? "Consultations are phone consults only" : s.format ? `${s.format}, as requested` : "Phone, video or in-office", "entry"],
    ["Notes with the case context and the caller’s demeanor", String(b.notes || "").trim().length >= 25 && TONES.includes(b.tone), "What it’s about, instructions, and how the caller sounded", "entry"],
    ["An email reminder a day before", !!b.reminder, "Email, 1 day before", "entry"]];
}
const score = checks => { const on = checks.filter(c => c[1] !== null), met = on.filter(c => c[1]).length; return {met, total: on.length, pct: on.length ? Math.round(met / on.length * 100) : 0}; };

/* ---------- the trainee's record ---------- */
const R = {rec: null, recId: null, open: {}, draft: null, last: null, failed: false};
function load(force){
  const id = state.traineeId; if(!id) return Promise.resolve();
  if(R.recId !== id){ R.rec = null; R.failed = false; }   // (another trainee's log is never theirs to save over)
  if(!force && R.recId === id && (R.rec || R.failed)) return Promise.resolve();   // (after a failed read, only ↻ Try again reads again)
  R.recId = id;
  // (a failed read isn't an empty log: R.rec stays unset, so nothing is saved over the bookings)
  return Promise.all([sharedGetStrict("calrules:" + id), sharedGet("settings:calrules").catch(() => null)]).then(([v, st]) => {
    R.rec = v && Array.isArray(v.bookings) ? v : {bookings: []}; R.failed = false; if(st && st.lunch !== undefined) X.lunch = st.lunch;
    if(state.view === "calrules") render(); }).catch(() => { R.failed = !R.rec; if(state.view === "calrules") render(); });
}
const unread = () => { if(R.rec) return false; toast("Couldn’t load your bookings, so nothing was saved. Try again."); return true; };
const val = id => { const el = document.getElementById(id); return !el ? "" : el.type === "checkbox" ? el.checked : String(el.value || "").trim(); };
function readForm(){
  return {mode: val("crMode"), scn: val("crScn"), client: val("crClient"), callback: val("crCallback"), dob: val("crDob"), dol: val("crDol"), tone: val("crTone"),
    format: val("crFormat"), date: val("crDate"), start: val("crStart"), length: val("crLength"), title: val("crTitle"), notes: val("crNotes"),
    est: val("crEst"), reminder: val("crReminder"), approved: val("crApproved"), unavailable: val("crUnavail"), alts: val("crAlts")};
}
async function submit(){
  const b = Object.assign(readForm(), {id: "b" + Date.now().toString(36), at: new Date().toISOString(), on: todayISO()});
  if(!b.scn || !b.date || !b.start || !b.length){ toast("Pick the scenario and fill in the date, start time and length."); return; }
  await load();
  if(unread()) return;
  const checks = check(b, R.rec.bookings), sc = score(checks);
  Object.assign(b, {checks: checks.map(c => [c[0], c[1], c[2], c[3]]), met: sc.met, total: sc.total, pct: sc.pct});
  R.rec.bookings = R.rec.bookings.concat([b]).slice(-200); R.last = b.id; R.open = {[b.id]: true}; R.draft = null;
  render();
  if(await sharedSet("calrules:" + state.traineeId, R.rec) === false) toast("Couldn’t save the booking. Check your connection.");
  else toast(`✓ Booking checked: ${sc.met} of ${sc.total} rules met.`);
}
function remove(id){
  if(unread() || !confirm("Remove this booking from your log?")) return;
  R.rec.bookings = R.rec.bookings.filter(b => b.id !== id);
  sharedSet("calrules:" + state.traineeId, R.rec).then(ok => { if(ok === false) toast("Couldn’t save. Check your connection."); });
  render();
}

/* ---------- the page ---------- */
const chip = v => v === null ? `<span class="cr-na">—</span>` : v ? `<span class="cr-ok">✓</span>` : `<span class="cr-no">✗</span>`;
function checksHtml(b){
  return `<table class="cr-checks"><tbody>${(b.checks || []).map(c => `<tr class="${c[1] === null ? "na" : c[1] ? "" : "miss"}"><td>${chip(c[1])}</td><td><b>${e(c[0])}</b>${c[2] && c[1] !== true ? `<small>${e(c[2])}</small>` : ""}</td></tr>`).join("")}</tbody></table>`;
}
function bookingRow(b){
  const s = scnOf(b.scn) || {}, open = !!R.open[b.id];
  return `<div class="card cr-book ${b.id === R.last ? "new" : ""}"><button class="cr-bhead" onclick="FTCalRules.toggle('${e(b.id)}')">
      <span class="cr-pct ${b.pct >= 80 ? "ok" : b.pct >= 60 ? "mid" : "low"}">${num(b.pct)}%</span>
      <span><b>${e(b.title || s.title || "")}</b><small>${e([`${DAYS[new Date(b.date + "T12:00:00").getDay()] || ""} ${b.date}`, `${hhmm(mins(b.start) || 0)} EST`, `${b.length} min`, b.format, (MODES.find(m => m[0] === b.mode) || MODES[0])[1]].filter(x => String(x || "").trim()).join(" · "))}</small></span>
      <span class="cr-met">${num(b.met)} of ${num(b.total)} rules</span><span>${open ? "▾" : "▸"}</span></button>
    ${open ? `<div class="cr-bbody">${checksHtml(b)}<div class="cr-bact"><button class="btn btn-ghost btn-sm" onclick="FTCalRules.remove('${e(b.id)}')">🗑 Remove</button></div></div>` : ""}</div>`;
}
function formHtml(){
  const d = R.draft || {}, s = scnOf(d.scn);
  const opt = (list, cur, blank) => (blank ? `<option value="">${blank}</option>` : "") + list.map(x => { const [v, t] = Array.isArray(x) ? x : [x, x]; return `<option value="${e(v)}" ${v === cur ? "selected" : ""}>${e(t)}</option>`; }).join("");
  return `<div class="card cr-form"><h2>📝 Record a booking</h2><p class="fss-muted">Right after the call: what you put on the attorney’s calendar, as you entered it.</p>
    <div class="cr-grid">
      <label>Call <select id="crMode">${opt(MODES, d.mode || "practice")}</select></label>
      <label class="w">Scenario (nature of the request) <select id="crScn" onchange="FTCalRules.scn(this.value)">${opt(SCN.map(x => [x.id, x.title]), d.scn, "Pick the caller’s request…")}</select></label>
      ${s ? `<p class="w cr-scnnote">Guide’s note: ${e(s.note)} · ${s.max} minutes at most${s.consult ? " · phone consult only" : s.format ? " · " + e(s.format) : ""}${s.newClient ? " · new client consult" : ""}${s.follow ? " · follow-up" : ""}</p>` : ""}
      <label>Caller (client) name <input id="crClient" value="${e(d.client || "")}" autocomplete="off"></label>
      <label>Callback number <input id="crCallback" value="${e(d.callback || "")}" autocomplete="off" placeholder="(555) 555-0123"></label>
      <label>Date of birth <input type="date" id="crDob" value="${e(d.dob || "")}"></label>
      <label>Date of loss <input type="date" id="crDol" value="${e(d.dol || "")}"></label>
      <label>Meeting format <select id="crFormat">${opt(FORMATS, d.format, "Pick…")}</select></label>
      <label>Caller’s tone <select id="crTone">${opt(TONES, d.tone, "Pick…")}</select></label>
      <label>Date <input type="date" id="crDate" value="${e(d.date || "")}"></label>
      <label>Start (EST) <input type="time" id="crStart" step="900" value="${e(d.start || "")}"></label>
      <label>Length (minutes) <input type="number" id="crLength" min="15" max="120" step="15" value="${e(d.length || "")}"></label>
      <label class="w">Event title <input id="crTitle" value="${e(d.title || "")}" autocomplete="off" placeholder="Meeting type – Client Name"></label>
      <label class="w">Notes on the event <textarea id="crNotes" rows="3" placeholder="The case context, the caller’s instructions and how they sounded">${e(d.notes || "")}</textarea></label>
      <label class="ck"><input type="checkbox" id="crEst" ${d.est ? "checked" : ""}> The calendar is set to EST</label>
      <label class="ck"><input type="checkbox" id="crReminder" ${d.reminder ? "checked" : ""}> Email reminder 1 day before</label>
      <label class="ck"><input type="checkbox" id="crApproved" ${d.approved ? "checked" : ""}> Same-day booking: the attorney approved it</label>
      <label class="ck"><input type="checkbox" id="crUnavail" ${d.unavailable ? "checked" : ""} onchange="FTCalRules.keep()"> The caller’s requested slot was unavailable</label>
      ${d.unavailable ? `<label class="w">The times you offered instead (one per line, or separated by commas) <textarea id="crAlts" rows="2">${e(d.alts || "")}</textarea></label>` : ""}
    </div>
    <div class="cr-act"><button class="btn btn-navy" onclick="FTCalRules.submit()">✓ Check the booking</button></div></div>`;
}
function renderPage(){
  if(!R.rec && R.failed) return `<div class="card cr-loadfail" style="padding:24px;"><b>Couldn’t load your bookings.</b> Nothing has been changed: check your connection, then <button class="btn btn-ghost btn-sm" type="button" onclick="FTCalRules.reload().then(render)">↻ Try again</button></div>`;
  if(!R.rec){ load(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const bs = R.rec.bookings.slice().reverse(), sc = bs.length ? Math.round(bs.reduce((n, b) => n + (b.pct || 0), 0) / bs.length) : null;
  return `<div class="cr-hero"><p class="lp-eyebrow">Day 6 · Calendar Management Mock Call Scenarios</p><h1>📅 Booking Rule Check</h1>
      <p>After each calendar mock call, record the booking you made. It’s checked on the spot against the guide’s scheduling rules, so your trainer can score the call itself. ${sc != null ? `<b>Your average: ${sc}% over ${bs.length} booking${bs.length === 1 ? "" : "s"}.</b>` : ""}</p></div>
    <details class="card cr-rules"><summary>📌 The scheduling rules</summary><ul>${RULES.map(r => `<li>${e(r)}</li>`).join("")}${X.lunch ? `<li>The attorney’s lunch: ${e((lunchOf() || []).map(hhmm).join(" – "))}.</li>` : ""}</ul></details>
    ${formHtml()}
    ${bs.length ? `<h2 class="cr-h2">Your bookings</h2>${bs.map(bookingRow).join("")}` : ""}`;
}
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["calrules"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {calrules: "Booking Rule Check"});
const __render = window.render;
window.render = function(){
  if(state.view !== "calrules") return __render.apply(this, arguments);
  if(!state.traineeId){ state.view = "dashboard"; return __render.apply(this, arguments); }
  if(document.getElementById("crScn")) R.draft = readForm();   // keep what's typed across a re-render
  load();
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-cr"><a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>${renderPage()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
window.FTCalRules = {
  submit, remove, check, score, scenarios: SCN, rules: RULES,
  toggle(id){ R.open[id] = !R.open[id]; render(); },
  keep(){ render(); },
  // a scenario picked: its length limit and, for a consultation, the phone format, unless already filled in
  scn(id){ const s = scnOf(id), L = document.getElementById("crLength"), F = document.getElementById("crFormat");
    if(s && L && !L.value) L.value = String(s.max); if(s && F && !F.value) F.value = s.consult ? "Phone" : s.format || ""; render(); },
  reload: () => load(true), state: () => R
};
// 🛠 the Practice Lab's card, beside Standard Training - Appointment Setting Mock Calls
window.ftCalRulesCard = () => `<div class="card fts-card"><div class="fts-kicker">Day 6 · after each calendar mock call</div><h3>📅 Booking Rule Check</h3>
    <p class="fts-note">Record the booking you made on the call: it’s checked against the guide’s scheduling rules on the spot (consult days, phone hours, buffers, length limits, EST, the reminder).</p>
    <div class="fts-tool-act"><button class="btn btn-navy btn-sm" type="button" onclick="goto('calrules')">Check a booking</button></div></div>`;

// 🏅 My Performance: the average, practice calls and mock calls with the trainer apart
window.ftCalRuleItems = ctx => { const rec = ctx.rec["calrules:"]; if(!rec || !Array.isArray(rec.bookings) || !rec.bookings.length) return [];
  return MODES.map(([m, label]) => { const bs = rec.bookings.filter(b => (b.mode || "practice") === m); if(!bs.length) return null;
    const pct = Math.round(bs.reduce((n, b) => n + (b.pct || 0), 0) / bs.length);
    return {name: `📅 ${label}s`, pct, note: `${bs.length} booking${bs.length === 1 ? "" : "s"} checked against the scheduling rules`}; }).filter(Boolean); };

/* ---------- 🧑‍🏫 Trainer Inputs: the scorecard's rule criteria from the latest booking ---------- */
const T = {cache: {}};
const CRIT = {info: /information verification/i, slot: /slot identification/i, alt: /alternative time/i, entry: /calendar creation/i};
function latestFor(id){
  const c = T.cache[id];
  if(!c){ T.cache[id] = {loading: true}; sharedGet("calrules:" + id).then(v => { T.cache[id] = {rec: v && Array.isArray(v.bookings) ? v : {bookings: []}}; if(state.view === "admin") render(); }).catch(() => { T.cache[id] = {rec: {bookings: []}}; }); return null; }
  if(c.loading) return null;
  const bs = c.rec.bookings; return bs.slice().reverse().find(b => b.mode === "trainer") || bs[bs.length - 1] || false;
}
function groupScores(b){
  const out = {}; Object.keys(CRIT).forEach(g => { const on = (b.checks || []).filter(c => c[3] === g && c[1] !== null); if(on.length) out[g] = Math.round(on.filter(c => c[1]).length / on.length * 10) / 2; });
  return out;
}
// 🗓 the trainee's CALENDAR MANAGEMENT MOCK CALL scorecard on the Training Portal's Google Calendar Simulator (the same seven
// metrics as this one, worker.js /api/calsim-card): read once a visit, its latest card shown with ⤓ Fill from it
const P = {cache: {}};
function portalCard(id){
  const c = P.cache[id];
  if(!c){ P.cache[id] = {loading: true};
    Promise.resolve(typeof authFetch === "function" ? authFetch("/api/calsim-card", {id, op: "get"}).then(r => r.json()) : {ok: false})
      .then(j => { P.cache[id] = j && j.ok ? {cards: j.cards || [], user: j.account || ""} : {off: !!(j && j.off), error: (j && j.error) || ""}; if(state.view === "admin") render(); })
      .catch(() => { P.cache[id] = {error: "unreachable"}; });
    return null; }
  return c.loading ? null : c;
}
function portalHtml(id){
  const c = portalCard(id);
  if(c === null) return `<p class="fss-wide fss-muted cr-assist">🗓 Loading the Google Calendar Simulator’s scorecard…</p>`;
  if(c.off) return "";
  if(c.error) return `<p class="fss-wide fss-muted cr-assist">🗓 The Google Calendar Simulator’s scorecard couldn’t be read (${e(c.error)}).</p>`;
  const k = (c.cards || [])[c.cards.length - 1];
  if(!k) return `<p class="fss-wide fss-muted cr-assist">🗓 No scorecard on the Google Calendar Simulator yet${c.user ? "" : " (no Training Portal account found for this trainee’s name and batch)"}.</p>`;
  const vals = {}, notes = {};
  FT_RUBRICS.list.calendar.criteria.forEach((cr, i) => { const row = (k.rows || []).find(x => x.metric === cr.n) || (k.rows || [])[i]; if(row && row.score != null){ vals[i] = Number(row.score); if(row.feedback) notes[i] = row.feedback; } });
  return `<div class="fss-wide cr-assist"><b>🗓 Google Calendar Simulator scorecard</b> (${e(k.by || "Trainer")}, ${e(String(k.at || "").slice(0, 10))}${k.source === "foundational" ? ", saved here" : ""}): <b>${num(k.average)} / 5 · ${num(k.pct)}%</b>
    <button class="btn btn-ghost btn-sm" type="button" onclick='FTCalRules.fillCard(this, ${JSON.stringify({vals, notes}).replace(/'/g, "&#39;")})'>⤓ Fill from the simulator’s scorecard</button></div>`;
}
FTCalRules.portalCard = portalCard;
FTCalRules.fillCard = (btn, x) => {
  if(!(window.FTMockScores && FTMockScores.fillCrit)) return;
  const n = FTMockScores.fillCrit(x.vals, x.notes);
  toast(n ? `⤓ ${n} criteri${n === 1 ? "on" : "a"} filled from the Google Calendar Simulator’s scorecard` : "Those criteria already have scores: nothing typed was changed.");
};
// 🗓 a Calendar Management Mock Call saved in 🧑‍🏫 Graders, sent to the trainee's Google Calendar Simulator scorecards too (every
// criterion scored): the same card on both sides
FTCalRules.pushCard = async (id, scores, feedback, by) => {
  const rb = FT_RUBRICS.list.calendar; if(!rb || !Array.isArray(scores) || scores.length !== rb.criteria.length || scores.some(v => v == null || v === "")) return null;
  try{ const j = await (await authFetch("/api/calsim-card", {id, op: "put", by, rows: scores.map((v, i) => ({score: Number(v), feedback: (feedback || [])[i] || ""}))})).json();
    if(j && j.ok){ delete P.cache[id]; return true; } return j && j.off ? null : false; }
  catch(err){ return false; }
};
window.ftRubricAssist = (r, a) => {
  const rb = window.FT_RUBRICS && FT_RUBRICS.forAct(a); if(!rb || rb.key !== "calendar") return "";
  return portalHtml(r.id) + bookingHtml(r);
};
function bookingHtml(r){
  const b = latestFor(r.id);
  if(b === null) return `<p class="fss-wide fss-muted cr-assist">📅 Loading the trainee’s booking rule check…</p>`;
  if(!b) return `<p class="fss-wide fss-muted cr-assist">📅 No booking recorded on the Booking Rule Check yet.</p>`;
  const g = groupScores(b), miss = (b.checks || []).filter(c => c[1] === false).map(c => c[0]);
  return `<div class="fss-wide cr-assist"><b>📅 Booking rule check</b> (${e((MODES.find(m => m[0] === b.mode) || MODES[0])[1].toLowerCase())}, ${e(b.title || "")}, ${e(b.date)}): <b>${num(b.met)} of ${num(b.total)} rules met</b>${miss.length ? ` · missed: ${e(miss.join("; "))}` : ""}.
    <button class="btn btn-ghost btn-sm" type="button" onclick='FTCalRules.fill(this, ${JSON.stringify(g)})'>⤓ Fill the rule criteria (${Object.keys(g).map(k => `${k === "info" ? "Information" : k === "slot" ? "Slot & rules" : k === "alt" ? "Alternatives" : "Calendar entry"} ${g[k]}`).join(", ")})</button></div>`;
}
FTCalRules.fill = (btn, g) => {
  // (on 🧑‍🏫 Graders, the one-VA sheet: its criteria by index, through FTMockScores, never over a typed score)
  if(btn.closest(".fms") && window.FTMockScores && FTMockScores.fillCrit){
    const vals = {}; FT_RUBRICS.list.calendar.criteria.forEach((k, i) => { const grp = Object.keys(CRIT).find(x => CRIT[x].test(k.n)); if(grp && g[grp] != null) vals[i] = g[grp]; });
    const n = FTMockScores.fillCrit(vals);
    toast(n ? `⤓ ${n} criteri${n === 1 ? "on" : "a"} filled from the booking check` : "Those criteria already have scores: nothing typed was changed."); return;
  }
  const box = btn.closest(".fss-rvform"), el = box && box.querySelector("[data-rubric]"); if(!el) return;
  const rb = FT_RUBRICS.list[el.getAttribute("data-rubric")]; let n = 0, last = null;
  rb.criteria.forEach((k, i) => { const grp = Object.keys(CRIT).find(x => CRIT[x].test(k.n)); const inp = el.querySelector(`[data-crit="${i}"]`);
    if(grp && g[grp] != null && inp && String(inp.value).trim() === ""){ inp.value = g[grp]; n++; last = inp; } });
  if(last && window.FTInputs) FTInputs.calc(last);
  toast(n ? `⤓ ${n} criteri${n === 1 ? "on" : "a"} filled from the booking check` : "Those criteria already have scores: nothing typed was changed.");
};

/* ---------- 🧑‍🏫 Admin → 🛠 Practice Lab → 📅 Booking Rules ---------- */
const AD = {rows: null, loading: false, batch: "", open: {}};
// a revoked or offboarded trainee leaves the roster: drop the cached rows so the next look reloads
if(typeof window.addEventListener === "function") window.addEventListener("ft-roster-changed", () => { AD.rows = null; });
async function loadAdmin(){
  AD.loading = true;
  try{
    const people = await ftActiveRoster();
    const vals = []; const keys = people.map(r => "calrules:" + r.id).concat(["settings:calrules"]);
    vals.push(...await sharedGetMany(keys));
    const st = vals.pop(); if(st && st.lunch !== undefined) X.lunch = st.lunch;
    AD.rows = people.map((r, i) => ({id: r.id, name: r.name || r.id, batch: r.batch || "", rec: vals[i] && Array.isArray(vals[i].bookings) ? vals[i] : {bookings: []}}))
      .sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    if(!AD.batch) AD.batch = ftLatestBatch(AD.rows);
  }catch(err){ AD.rows = AD.rows || []; }
  AD.loading = false; if(state.view === "admin" && ftTabOn("calrules")) render();
}
/* 🧾 Why this score: the calendaring score's rationale, in words, from the bookings themselves — how the average is reached
   (each booking scores the rules it met out of the rules that applied to it), the rules missed most with why, the rules
   always met, and how the latest booking did against the one before. */
function whyScore(bs){
  if(!bs.length) return `<span class="fss-muted">No booking recorded yet: the score starts with the first calendar mock-call booking.</span>`;
  const avg = Math.round(bs.reduce((n, b) => n + (b.pct || 0), 0) / bs.length), last = bs[bs.length - 1], prev = bs[bs.length - 2];
  const miss = {}, met = {}, why = {}, seen = {};
  bs.forEach(b => (b.checks || []).forEach(c => { if(c[1] === null) return; seen[c[0]] = (seen[c[0]] || 0) + 1;
    if(c[1] === false){ miss[c[0]] = (miss[c[0]] || 0) + 1; if(c[2]) why[c[0]] = c[2]; } else met[c[0]] = (met[c[0]] || 0) + 1; }));
  const missed = Object.entries(miss).sort((a, b) => b[1] - a[1]).slice(0, 3), always = Object.keys(seen).filter(k => !miss[k]);
  const trend = prev ? (last.pct > prev.pct ? `up from ${num(prev.pct)}%` : last.pct < prev.pct ? `down from ${num(prev.pct)}%` : `the same as the one before`) : "";
  return `<p><b>${avg}%</b> = the average of ${bs.length} booking${bs.length === 1 ? "" : "s"}, each scored on the scheduling rules it met out of those that applied.</p>`
    + `<p>Latest: <b>${e(last.title || "booking")}</b> met ${num(last.met)} of ${num(last.total)} rules (${num(last.pct)}%)${trend ? `, ${trend}` : ""}.</p>`
    + (missed.length ? `<p class="cr-why-miss">🔧 Missed most: ${missed.map(([k, n]) => `<b>${e(k)}</b> (${n} of ${seen[k]})${why[k] ? ` — ${e(why[k])}` : ""}`).join("; ")}.</p>` : `<p class="cr-why-ok">⭐ No rule missed in any booking.</p>`)
    + (always.length && missed.length ? `<p class="cr-why-ok">⭐ Always met: ${always.slice(0, 4).map(k => e(k)).join(", ")}${always.length > 4 ? ` and ${always.length - 4} more` : ""}.</p>` : "");
}
function adminHtml(){
  if(!AD.rows){ if(!AD.loading) loadAdmin(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(), rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch);
  const lunch = lunchOf();
  return `<div class="card cr-admin"><div class="ff-bar"><div><h3>📅 Booking Rules</h3><p class="fss-muted">Each trainee’s calendar mock-call bookings, checked against the guide’s scheduling rules as they record them. You score the call itself in 🧑‍🏫 Graders: Mock Calls &amp; Demos, where the scorecard can fill its rule criteria from the latest booking.</p></div>
      <span><select onchange="FTCalRulesAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <label class="fss-muted cr-lunch">Attorney’s lunch <input type="time" id="crLunchA" value="${lunch ? `${String(Math.floor(lunch[0] / 60)).padStart(2, "0")}:${String(lunch[0] % 60).padStart(2, "0")}` : ""}"> – <input type="time" id="crLunchB" value="${lunch ? `${String(Math.floor(lunch[1] / 60)).padStart(2, "0")}:${String(lunch[1] % 60).padStart(2, "0")}` : ""}"></label>
      <button class="btn btn-ghost btn-sm" onclick="FTCalRulesAdmin.saveLunch()">💾 Save</button></span></div>
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl cr-atbl"><colgroup><col class="cr-c-who"><col class="cr-c-n"><col class="cr-c-n"><col class="cr-c-last"><col class="cr-c-why"></colgroup><thead><tr><th>Trainee</th><th>Bookings</th><th>Average</th><th>Latest</th><th>🧾 Why this score</th></tr></thead><tbody>
      ${rows.map(r => { const bs = r.rec.bookings, avg = bs.length ? Math.round(bs.reduce((n, b) => n + (b.pct || 0), 0) / bs.length) : null, last = bs[bs.length - 1];
        const why = whyScore(bs);
        return `<tr><td><b>${e(r.name)}</b><span class="fss-muted"> ${e(r.batch)}</span></td><td>${bs.length ? `<button class="btn btn-ghost btn-sm" onclick="FTCalRulesAdmin.open('${e(r.id)}')">${bs.length} ${AD.open[r.id] ? "▾" : "▸"}</button>` : "—"}</td>
          <td>${avg != null ? avg + "%" : "—"}</td><td>${last ? `${e(last.title || "")} · ${num(last.pct)}%` : "—"}</td><td class="cr-why">${why}</td></tr>
          ${AD.open[r.id] ? `<tr class="cr-aopen"><td colspan="5">${bs.slice().reverse().map(b => `<div class="cr-abook"><b>${e(b.title || "")}</b> · ${e(b.date)} ${e(hhmm(mins(b.start) || 0))} · ${e(b.length)} min · ${e(b.format || "")} · ${e((MODES.find(m => m[0] === b.mode) || MODES[0])[1])} · <b>${num(b.met)}/${num(b.total)}</b>${checksHtml(b)}</div>`).join("")}</td></tr>` : ""}`; }).join("")}
    </tbody></table></div>` : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}</div>`;
}
window.FTCalRulesAdmin = {
  batch(b){ AD.batch = b; render(); }, open(id){ AD.open[id] = !AD.open[id]; render(); }, reload: () => loadAdmin(),
  async saveLunch(){ const a = val("crLunchA"), b = val("crLunchB"); X.lunch = a && b ? `${a}-${b}` : "";
    const ok = await sharedSet("settings:calrules", {lunch: X.lunch}); toast(ok === false ? "Couldn’t save. Check your connection." : "✓ Saved: new bookings are checked against it."); render(); }
};
ftAdminTab("calrules", "📅 Booking Rules", adminHtml);

(function(){ const st = document.createElement("style"); st.id = "ft-calrules"; st.textContent = `
main.main-cr{max-width:980px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:14px;}
.cr-hero h1{margin:0 0 4px;} .cr-hero p{margin:0;color:var(--ink-soft);max-width:76ch;}
.cr-rules{padding:12px 16px;} .cr-rules summary{cursor:pointer;font-weight:700;} .cr-rules ul{margin:8px 0 0;padding-left:20px;display:grid;gap:4px;}
.cr-form{padding:16px 18px;} .cr-form h2{margin:0 0 2px;font-size:20px;}
.cr-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 12px;margin-top:12px;}
.cr-grid label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--ink-soft);}
.cr-grid label.w,.cr-grid .w{grid-column:1/-1;} .cr-grid label.ck{flex-direction:row;align-items:center;gap:8px;grid-column:span 2;font-weight:500;color:var(--ink);}
.cr-grid label{min-width:0;} .cr-grid input:not([type=checkbox]),.cr-grid select,.cr-grid textarea{box-sizing:border-box;width:100%;min-width:0;font:inherit;font-weight:400;padding:8px 10px;border:1px solid var(--line,#d6d9e0);border-radius:8px;background:var(--card,#fff);color:var(--ink);}
.cr-scnnote{margin:0;padding:8px 12px;border-radius:8px;background:#EEF3FF;color:#1F2A44;font-size:13px;}
.cr-act{margin-top:14px;} .cr-h2{margin:6px 0 0;font-size:18px;}
.cr-book{padding:0;overflow:hidden;} .cr-book.new{box-shadow:0 0 0 2px #2E7D4F;}
.cr-bhead{display:grid;grid-template-columns:64px 1fr auto 18px;gap:12px;align-items:center;width:100%;padding:12px 16px;border:0;background:none;text-align:left;cursor:pointer;font:inherit;color:var(--ink);}
.cr-bhead small{display:block;color:var(--ink-soft);font-size:12.5px;margin-top:2px;}
.cr-pct{font-weight:800;font-size:18px;text-align:center;border-radius:8px;padding:6px 0;} .cr-pct.ok{background:#E3F4EA;color:#1E6B40;} .cr-pct.mid{background:#FFF4D6;color:#8A5A00;} .cr-pct.low{background:#FDE7E5;color:#B42318;}
.cr-met{font-size:13px;color:var(--ink-soft);} .cr-bbody{padding:0 16px 14px;} .cr-bact{margin-top:8px;}
.cr-checks{width:100%;border-collapse:collapse;font-size:13.5px;} .cr-checks td{padding:5px 6px;border-top:1px solid var(--line,#eceef2);vertical-align:top;} .cr-checks td:first-child{width:22px;}
.cr-checks small{display:block;color:var(--ink-soft);} .cr-checks tr.na{opacity:.55;} .cr-checks tr.miss b{color:#B42318;}
.cr-ok{color:#1E6B40;font-weight:800;} .cr-no{color:#B42318;font-weight:800;} .cr-na{color:var(--ink-soft);}
.cr-assist{margin:6px 0;padding:8px 12px;border-radius:8px;background:#EEF3FF;color:#1F2A44;font-size:13px;line-height:1.5;} .cr-assist .btn{margin-left:6px;}
.cr-admin .ff-bar span{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;} .cr-admin label input{width:auto;}
.cr-admin .cr-lunch{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--navy);}
.cr-admin .cr-lunch input{font:inherit;font-size:13px;padding:5px 8px;border:1px solid var(--line,#d6d9e0);border-radius:8px;}
.cr-atbl{table-layout:fixed;width:100%;} .cr-atbl th, .cr-atbl td{padding:10px 12px;vertical-align:middle;}
.cr-atbl col.cr-c-who{width:20%;} .cr-atbl col.cr-c-n{width:9%;} .cr-atbl col.cr-c-last{width:18%;} .cr-atbl col.cr-c-why{width:44%;}
.cr-why p{margin:0 0 4px;font-size:13px;line-height:1.45;} .cr-why p:last-child{margin:0;} .cr-why-miss{color:#8A3B12;} .cr-why-ok{color:#1E6B3A;}
.cr-atbl td.cr-why{vertical-align:top;}
.cr-atbl td:nth-child(2), .cr-atbl td:nth-child(3), .cr-atbl th:nth-child(2), .cr-atbl th:nth-child(3){text-align:center;}
.cr-atbl td{overflow-wrap:anywhere;}
.cr-abook{padding:8px 0;border-top:1px solid var(--line,#eceef2);}
@media (max-width:720px){ .cr-grid{grid-template-columns:repeat(2,minmax(0,1fr));} .cr-grid label.ck{grid-column:1/-1;} .cr-bhead{grid-template-columns:54px 1fr 18px;} .cr-met{display:none;} }
@media (max-width:460px){ .cr-grid{grid-template-columns:1fr;} }
`; document.head.appendChild(st); })();
})();
