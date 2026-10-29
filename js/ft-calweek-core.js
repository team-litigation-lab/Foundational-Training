/* ============================================================
   📅 Standard Training - Calendaring Activity: the core (no page code here, so node and the Worker can both use it).
   Loaded before js/ft-calweek.js (the page) and imported by calweek-api.js (the Worker's controller).
   It is a standalone clone of the Standard Training calendar set-up (js/ft-calsim-core.js, Week 1 · Attorney
   Rivera): the week, its tasks and its rules are copied here and frozen, so nothing in the core calendar —
   the Calendaring Simulators, the Google Calendar Simulator on the Main Portal, their records — changes this
   activity, and nothing here changes them.
     1. The current week resolver. The business calendar is Eastern Time (the attorney's rules: "the calendar is in
        EST"). weekOf(now) gives the Monday–Friday of the week `now` falls in, worked out in Eastern Time from any
        instant (new Date() on the page, the server's UTC clock in the Worker). That week is the page's default
        viewport. On a Saturday or Sunday the viewport rolls forward to the coming week (the week that just ended
        has nothing left to book).
     2. The relative scheduling engine. Nothing is booked on a fixed date. A booking is an offset from the week
        `now` falls in: {w, d, m, dur} = weeks ahead (always ANCHOR_WEEK, 1: the next work week), the weekday
        (0 Mon … 4 Fri), minutes from midnight Eastern and the length. resolve() turns an offset into real dates
        against a clock; relativize() turns a date back into an offset. A booking saved this week therefore snaps
        to the Monday of next week whenever it is read again — the activity always sits on the week ahead of
        Date.now(), with no re-dating job. `anchor` (the Monday it was resolved against) is kept for the record only.
     3. review(): the automated check of the trainee's bookings against the cloned week's tasks and rules.
     4. PRACTICE: a second clone, VA Practice Only (Week 2 · Attorney Chen): the same engine and check, never graded.
   Times are minutes from midnight; days are 0 (Mon) to 4 (Fri); the grid works in 15-minute steps.
   ============================================================ */
(function(root){
"use strict";
const TZ = "America/New_York", TZ_LABEL = "Eastern Time (EST/EDT)";
const DAY_MS = 864e5, ANCHOR_WEEK = 1;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const OPEN = 9 * 60, CLOSE = 17 * 60, STEP = 15, MAXEV = 40, PASS = 80;
const t = (h, m) => h * 60 + (m || 0);
const deepFreeze = o => { Object.values(o).forEach(v => { if(v && typeof v === "object") deepFreeze(v); }); return Object.freeze(o); };
function fmt(min){ const h = Math.floor(min / 60), m = min % 60; return (h % 12 || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? " AM" : " PM"); }

/* ---------- 1. the current week resolver ---------- */
const DTF = {};
const dtf = tz => DTF[tz] || (DTF[tz] = new Intl.DateTimeFormat("en-US", {timeZone: tz, hourCycle: "h23", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"}));
const WD = {Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6};
// the wall clock in `tz` at an instant: {iso: "YYYY-MM-DD", wd: 0 (Sun) … 6, min}
function zoned(ms, tz){
  const p = {}; dtf(tz || TZ).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
  return {iso: `${p.year}-${p.month}-${p.day}`, wd: WD[p.weekday], min: Number(p.hour) * 60 + Number(p.minute), sec: Number(p.second)};
}
const isoDay = iso => { const m = String(iso).match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3]) : NaN; };
// calendar arithmetic on dates (no time zone involved)
const addDays = (iso, n) => new Date(isoDay(iso) + n * DAY_MS).toISOString().slice(0, 10);
// the UTC instant of a wall-clock time in `tz` (two passes settle a daylight-saving change)
function zonedToUtc(iso, min, tz){
  const want = isoDay(iso) + min * 60000;
  let ms = want;
  for(let i = 0; i < 2; i++){ const z = zoned(ms, tz); ms += want - (isoDay(z.iso) + z.min * 60000 + z.sec * 1000); }
  return ms;
}
const LONG = new Intl.DateTimeFormat("en-US", {timeZone: "UTC", weekday: "short", month: "short", day: "numeric"});
const label = iso => LONG.format(new Date(isoDay(iso)));
// The Monday–Friday of the week `now` falls in, `offset` weeks on. rollWeekend: a Saturday or Sunday counts as the coming week.
function weekOf(now, o){
  o = o || {}; const tz = o.tz || TZ, z = zoned(Number(now), tz);
  const back = (z.wd + 6) % 7;                              // days since Monday
  let monday = addDays(z.iso, -back);
  if(o.rollWeekend && back >= 5) monday = addDays(monday, 7);
  monday = addDays(monday, 7 * (Number(o.offset) || 0));
  const days = DAYS.map((_, i) => addDays(monday, i));
  return {tz, monday, friday: days[4], days,
    startUtc: zonedToUtc(monday, 0, tz), endUtc: zonedToUtc(addDays(monday, 5), 0, tz) - 1,   // Monday 00:00 → Friday 23:59:59.999
    label: `${label(monday)} – ${label(days[4])}, ${monday.slice(0, 4)}`, today: z.iso};
}
// the default viewport: this work week (a weekend shows the coming one)
const currentWeek = (now, o) => weekOf(now, Object.assign({rollWeekend: true}, o, {offset: 0}));
// where the activity is anchored: the Monday of Week + 1, relative to `now`
const nextWeek = (now, o) => weekOf(now, Object.assign({}, o, {offset: ANCHOR_WEEK, rollWeekend: false}));

/* ---------- 2. the relative scheduling engine ---------- */
// An offset {w, d, m, dur} on a real calendar, against the clock `now`.
function resolve(slot, now, o){
  const wk = weekOf(now, Object.assign({}, o, {offset: Number(slot.w) || 0, rollWeekend: false})), date = wk.days[slot.d];
  if(!date) return null;
  const startUtc = zonedToUtc(date, slot.m, wk.tz);
  return {date, day: DAYS[slot.d], startUtc, endUtc: startUtc + (Number(slot.dur) || 0) * 60000, label: `${label(date)}, ${fmt(slot.m)}`, monday: wk.monday};
}
// A real date and time back to an offset from the week `now` falls in (null on a weekend).
function relativize(iso, min, now, o){
  const tz = (o && o.tz) || TZ, here = weekOf(now, {tz}).monday, wd = (new Date(isoDay(iso)).getUTCDay() + 6) % 7;
  if(!(wd >= 0 && wd <= 4)) return null;
  return {w: Math.round((isoDay(addDays(iso, -wd)) - isoDay(here)) / (7 * DAY_MS)), d: wd, m: Number(min)};
}
// Snap a booking to the activity's anchor: always next work week, on the 15-minute grid, inside the day.
function snap(ev){
  const d = Math.max(0, Math.min(4, Math.round(Number(ev.d) || 0)));
  const m = Math.max(t(8), Math.min(t(18) - STEP, Math.round((Number(ev.m) || OPEN) / STEP) * STEP));
  const dur = Math.max(STEP, Math.min(t(4), Math.round((Number(ev.dur) || 30) / STEP) * STEP));
  return Object.assign({}, ev, {w: ANCHOR_WEEK, d, m, dur: Math.min(dur, t(18) - m)});
}

/* ---------- the cloned week: Standard Training, Attorney Rivera ---------- */
const COLORS = [["tomato", "Tomato", "#d50000"], ["flamingo", "Flamingo", "#e67c73"], ["tangerine", "Tangerine", "#f4511e"], ["banana", "Banana", "#f6bf26"],
  ["sage", "Sage", "#33b679"], ["basil", "Basil", "#0b8043"], ["peacock", "Peacock", "#039be5"], ["blueberry", "Blueberry", "#3f51b5"],
  ["lavender", "Lavender", "#7986cb"], ["grape", "Grape", "#8e24aa"], ["graphite", "Graphite", "#616161"]].map(([id, name, hex]) => ({id, name, hex}));
const colorOf = id => COLORS.find(c => c.id === id) || null;
const COLOR_RULE = {30: "tangerine", 45: "blueberry", 60: "tomato"};
const COLOR_RULE_TEXT = "Color each event by how long it is: 30 minutes Tangerine, 45 minutes Blueberry, 1 hour Tomato.";
const lunch = [0, 1, 2, 3, 4].map(d => ({id: "lunch" + d, title: "Lunch (out of office)", d, start: t(12), end: t(13), kind: "lunch"}));
const WEEK = deepFreeze({
  id: "std-calweek", version: 1, title: "Standard Training - Calendaring Activity", attorney: "Attorney Rivera", gap: 15, w: ANCHOR_WEEK,
  brief: "Attorney Rivera’s calendar for next week already has a hearing, a mediation, a deposition and two meetings. Book each task below on next week’s calendar: keep clear of the fixed events, lunch and travel time, leave 15 minutes between events, and follow each task’s notes. Give every event a description, add Google Meet and the email reminder where the task asks for them, and color it for its length.",
  fixed: [
    {id: "review", title: "Weekly case review", d: 0, start: t(9), end: t(9, 30), kind: "fixed"},
    {id: "hearing", title: "Court hearing: Smith v. Allied", d: 1, start: t(9, 30), end: t(12), kind: "court", buffer: 30, note: "Travel: keep 30 minutes free before and after."},
    {id: "mediation", title: "Mediation: Garcia", d: 2, start: t(13), end: t(15), kind: "fixed"},
    {id: "depo", title: "Deposition: Wilson", d: 3, start: t(10), end: t(11), kind: "fixed"},
    {id: "firm", title: "Firm meeting", d: 4, start: t(15), end: t(16), kind: "fixed"}
  ].concat(lunch),
  tasks: [
    {id: "medprep", title: "Mediation prep: Garcia", dur: 60, weight: 15, rules: {beforeEvent: {id: "mediation", gap: 30}}, note: "Finish at least 30 minutes before the Garcia mediation on Wednesday."},
    {id: "deposprep", title: "Deposition prep: Wilson", dur: 90, weight: 15, rules: {beforeDay: 3}, note: "Has to happen before the day of the Wilson deposition (Thursday)."},
    {id: "consult", title: "New client consultation: Thompson", dur: 60, weight: 15, rules: {days: [0, 1, 2], from: t(13)}, needs: {remind: true}, note: "Mr. Thompson works mornings: afternoons only, Monday to Wednesday. Set the email reminder for the day before."},
    {id: "adjuster", title: "Settlement call: adjuster", dur: 30, weight: 10, rules: {days: [1, 2, 3], from: t(14), to: t(16)}, needs: {meet: true}, note: "The adjuster takes calls Tuesday to Thursday, 2:00 to 4:00 PM only. It’s a video call: add Google Meet."},
    {id: "records", title: "Medical records review block", dur: 60, weight: 10, rules: {from: t(9), to: t(12)}, note: "The attorney reviews records in the morning, before lunch."},
    {id: "urgent", title: "Urgent call: Garcia", dur: 30, weight: 15, rules: {days: [0, 1]}, note: "The client called in upset. The attorney promised a call within two days: Monday or Tuesday."},
    {id: "strategy", title: "Case strategy meeting with paralegal", dur: 60, weight: 10, rules: {days: [1, 2, 3]}, note: "The paralegal is only in Tuesday to Thursday."},
    {id: "courthouse", title: "Client signing at the courthouse: Park", dur: 45, weight: 10, rules: {buffer: 30}, note: "Off site: leave 30 minutes free before and after for travel."}
  ]
});
// 🧪 VA Practice Only: a second frozen clone, of the Standard Training's other week (Week 2 · Attorney Chen, the trial week),
// for the trainee's own practice. Nothing on it is graded or sent to the trainer (js/ft-calweek.js, calweek-api.js), and it
// is a different week from the graded activity's, so practising never hands out that week's answers.
const PRACTICE = deepFreeze({
  id: "std-calpractice", version: 1, title: "Standard Training - Calendar Practice (VA Practice Only)", attorney: "Attorney Chen", gap: 15, w: ANCHOR_WEEK, practice: true,
  brief: "Practice only: nothing here is graded or sent to your trainer. Attorney Chen’s trial week for next week already has a deposition, a motion hearing, a protected trial-prep block and a mediation. Book each task on next week’s calendar around them, prep always before the event it prepares for, 15 minutes between events, and fill in each event’s details. Check it as often as you like, and start over whenever you want.",
  fixed: [
    {id: "intake", title: "Intake review", d: 0, start: t(9), end: t(10), kind: "fixed"},
    {id: "depo", title: "Deposition: Lopez", d: 1, start: t(10), end: t(12), kind: "fixed"},
    {id: "motion", title: "Motion hearing", d: 2, start: t(10), end: t(11, 30), kind: "court", buffer: 30, note: "Travel: keep 30 minutes free before and after."},
    {id: "trial", title: "Trial prep block (protected)", d: 3, start: t(13), end: t(17), kind: "fixed"},
    {id: "mediation", title: "Mediation: Reyes", d: 4, start: t(9), end: t(11), kind: "fixed"}
  ].concat(lunch),
  tasks: [
    {id: "deposprep", title: "Deposition prep: Lopez", dur: 120, weight: 20, rules: {beforeEvent: {id: "depo", gap: 0}}, note: "Finish before the Lopez deposition starts on Tuesday."},
    {id: "hearprep", title: "Motion hearing prep", dur: 60, weight: 20, rules: {beforeEvent: {id: "motion", gap: 30}}, note: "Done at least 30 minutes before the hearing on Wednesday (the attorney can’t start before 9:00)."},
    {id: "medprep", title: "Mediation prep: Reyes", dur: 90, weight: 15, rules: {beforeDay: 4}, note: "Has to happen before Friday, so the client can review the numbers."},
    {id: "expert", title: "Expert consult", dur: 60, weight: 15, rules: {days: [2, 3], from: t(13), to: t(16)}, needs: {meet: true}, note: "The expert is free Wednesday or Thursday, 1:00 to 4:00 PM. Video call: add Google Meet."},
    {id: "clientcall", title: "Client call: Reyes", dur: 30, weight: 15, rules: {days: [0, 3], from: t(13)}, needs: {meet: true, remind: true}, note: "Reyes can only talk Monday or Thursday afternoons. Video call with an email reminder the day before."},
    {id: "demand", title: "Demand letter review", dur: 30, weight: 15, rules: {days: [0, 1, 2]}, note: "Needs to go out by Wednesday: schedule it Monday to Wednesday."}
  ]
});
const WEEKS = Object.freeze({[WEEK.id]: WEEK, [PRACTICE.id]: PRACTICE});
// Every function below takes the week it works on (`wk`), the graded activity's by default.
const taskOf = (id, wk) => (wk || WEEK).tasks.find(k => k.id === id) || null;

/* ---------- the trainee's bookings: cleaned, snapped, checked ---------- */
// A booking: {task, title, w, d, m, dur, desc, meet, remind, color}. One per task; w is always the anchor week.
function clean(events, wk){
  const seen = {};
  return (Array.isArray(events) ? events : []).filter(x => x && typeof x === "object" && taskOf(x.task, wk) && !seen[x.task] && (seen[x.task] = 1)
    && Number.isFinite(Number(x.d)) && Number.isFinite(Number(x.m))).slice(0, MAXEV)
    .map(x => snap({task: x.task, title: String(x.title || taskOf(x.task, wk).title).slice(0, 80), d: x.d, m: x.m, dur: x.dur,
      desc: String(x.desc || "").slice(0, 300), meet: !!x.meet, remind: !!x.remind, color: colorOf(x.color) ? x.color : ""}));
}
const overlap = (a, b, pad) => a.d === b.d && a.start < b.end + pad && b.start < a.end + pad;
const padFor = (o, wk) => Math.max(o.buffer || 0, o.kind === "lunch" ? 0 : wk.gap);
function checks(k, x, evs, wk){
  const r = k.rules || {}, nd = k.needs || {}, out = [], add = (ok, lbl, why) => out.push({ok: !!ok, label: lbl, why: ok ? "" : why});
  if(!x){ add(false, "On the calendar", "Not booked yet."); return out; }
  add(true, "On the calendar", "");
  const me = {id: x.task, d: x.d, start: x.m, end: x.m + x.dur}, others = evs.filter(o => o.id !== x.task);
  const hit = others.find(o => overlap(me, o, 0)), near = !hit && others.find(o => padFor(o, wk) && overlap(me, o, padFor(o, wk)));
  add(!hit && !near, "No conflict", hit ? `Overlaps “${hit.title}” on ${DAYS[hit.d]}.` : near ? (near.buffer ? `Too close to “${near.title}”: it needs ${near.buffer} minutes of travel time.` : `Too close to “${near.title}”: leave ${wk.gap} minutes between events.`) : "");
  add(me.start >= OPEN && me.end <= CLOSE, "Business hours (9:00 AM to 5:00 PM)", `Runs ${fmt(me.start)} to ${fmt(me.end)}, outside business hours.`);
  add(x.dur >= k.dur, "Long enough", `Booked for ${x.dur} minutes; this needs ${k.dur}.`);
  const len = COLOR_RULE[x.dur] ? x.dur : k.dur, want = colorOf(COLOR_RULE[len]);
  if(want){ const have = colorOf(x.color); add(x.color === want.id, "Right color for its length", `${have ? have.name : "The default color"} on a ${x.dur}-minute event: it should be ${want.name}. ${COLOR_RULE_TEXT}`); }
  add(String(x.desc || "").trim().length >= 5, "Description added", "Add a description (what it is for, who is involved).");
  if(nd.meet) add(x.meet, "Google Meet added", "This is a video call: add Google Meet.");
  if(nd.remind) add(x.remind, "Email reminder a day before", "Set an email notification 1 day before the event.");
  if(r.days) add(r.days.includes(x.d), "Right day", `Not on ${DAYS[x.d]}: this one works ${r.days.map(d => DAYS[d].slice(0, 3)).join(", ")}.`);
  if(r.from != null || r.to != null){ const lo = r.from != null ? r.from : OPEN, hi = r.to != null ? r.to : CLOSE; add(me.start >= lo && me.end <= hi, "Right time of day", `Must fall between ${fmt(lo)} and ${fmt(hi)}.`); }
  if(r.beforeEvent){ const ev = wk.fixed.find(f => f.id === r.beforeEvent.id), gap = r.beforeEvent.gap || 0;
    add(x.d < ev.d || (x.d === ev.d && me.end + gap <= ev.start), `Before “${ev.title}”`, `Must finish${gap ? " " + gap + " minutes" : ""} before “${ev.title}” (${DAYS[ev.d]} ${fmt(ev.start)}).`); }
  if(r.beforeDay != null) add(x.d < r.beforeDay, "Early enough", `Must be before ${DAYS[r.beforeDay]}.`);
  if(r.buffer){ const tight = others.find(o => overlap(me, o, r.buffer)); add(!tight, `${r.buffer}-minute travel buffer`, tight ? `Within ${r.buffer} minutes of “${tight.title}”.` : ""); }
  return out;
}
// {pct, passed, score, max, done, items:[{task, title, weight, pts, perfect, found, checks}]}
function review(events, wk){
  wk = wk || WEEK; events = clean(events, wk);
  const evs = wk.fixed.map(f => ({id: f.id, title: f.title, d: f.d, start: f.start, end: f.end, buffer: f.buffer || 0, kind: f.kind}))
    .concat(events.map(x => ({id: x.task, title: x.title, d: x.d, start: x.m, end: x.m + x.dur, buffer: 0, kind: "mine"})));
  let got = 0, max = 0;
  const items = wk.tasks.map(k => {
    const x = events.find(e => e.task === k.id), cs = checks(k, x, evs, wk), pass = cs.filter(c => c.ok).length;
    const pts = Math.round(k.weight * pass / cs.length * 10) / 10; got += pts; max += k.weight;
    return {task: k.id, title: k.title, weight: k.weight, pts, perfect: pass === cs.length, found: !!x, checks: cs};
  });
  const pct = max ? Math.round(got / max * 100) : 0;
  return {score: Math.round(got), max, pct, passed: pct >= PASS, done: items.filter(i => i.perfect).length, items};
}
// The bookings on the calendar for a clock: each with its real date and time (resolved, never stored).
const placed = (events, now, o, wk) => clean(events, wk).map(x => Object.assign({}, x, {at: resolve(x, now, o)}));

const api = {TZ, TZ_LABEL, ANCHOR_WEEK, DAYS, OPEN, CLOSE, STEP, PASS, WEEK, PRACTICE, WEEKS, COLORS, COLOR_RULE, COLOR_RULE_TEXT,
  fmt, zoned, addDays, zonedToUtc, weekOf, currentWeek, nextWeek, resolve, relativize, snap, colorOf, taskOf, clean, review, placed};
root.FTCalWeekCore = api;
if(typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
