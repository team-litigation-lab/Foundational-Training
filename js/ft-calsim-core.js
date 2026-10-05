/* ============================================================
   Calendar Scheduler: the weeks and the helpers (no page code here, so it can be tested with node).
   Loaded before js/ft-calendar.js, which is the drag-and-drop page.
     • Times are minutes from midnight; days are 0 (Mon) to 4 (Fri).
     • A week has the attorney's fixed events (locked) and a list of tasks the trainee is told to put on the
       calendar. The trainee builds their own calendar (their events are {id, title, day, start, dur}) and
       submits it. Each task carries the attorney's rules (days, time window, finish before an event, travel buffer).
     • review() is the automated review: it matches the trainee's events to the tasks by their names, checks every task
       against the attorney's rules and scores it out of 100 (80% passes). A trainer's manual feedback comes on top.
     • flags() marks the events that clash with something else, break a court's travel time or fall outside
       business hours, so the page can show them in red while the trainee works.
   ============================================================ */
(function(root){
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const OPEN = 9 * 60, CLOSE = 17 * 60, STEP = 30, MAXEV = 60;
const t = (h, m) => h * 60 + (m || 0);
function fmt(min){ const h = Math.floor(min / 60), m = min % 60; return (h % 12 || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? " AM" : " PM"); }
const lunch = [0, 1, 2, 3, 4].map(d => ({id:"lunch" + d, title:"Lunch (attorney out)", day:d, start:t(12), end:t(13), kind:"lunch"}));

const SCENARIOS = [
  {id:"rivera", title:"Week 1 · Attorney Rivera", level:"Core",
   brief:"Attorney Rivera’s week already has a hearing, a mediation, a deposition and two meetings. Build the calendar: add each task below as an event (drag on an empty part of the week), keep clear of the fixed events, lunch and travel time, and follow each task’s notes. Then submit it to your trainer.",
   fixed:[
    {id:"review", title:"Weekly case review", day:0, start:t(9), end:t(9, 30), kind:"fixed"},
    {id:"hearing", title:"Court hearing: Smith v. Allied", day:1, start:t(9, 30), end:t(12), kind:"court", buffer:30, note:"Travel: keep 30 minutes free before and after."},
    {id:"mediation", title:"Mediation: Garcia", day:2, start:t(13), end:t(15), kind:"fixed"},
    {id:"depo", title:"Deposition: Wilson", day:3, start:t(10), end:t(11), kind:"fixed"},
    {id:"firm", title:"Firm meeting", day:4, start:t(15), end:t(16), kind:"fixed"}
   ].concat(lunch),
   tasks:[
    {id:"medprep", title:"Mediation prep: Garcia", dur:60, weight:15, rules:{beforeEvent:{id:"mediation", gap:30}}, note:"Finish at least 30 minutes before the Garcia mediation on Wednesday."},
    {id:"deposprep", title:"Deposition prep: Wilson", dur:90, weight:15, rules:{beforeDay:3}, note:"Has to happen before the day of the Wilson deposition (Thursday)."},
    {id:"consult", title:"New client consultation: Thompson", dur:60, weight:15, rules:{days:[0, 1, 2], from:t(13)}, note:"Mr. Thompson works mornings: afternoons only. He can come in Monday to Wednesday."},
    {id:"adjuster", title:"Settlement call: adjuster", dur:30, weight:10, rules:{days:[1, 2, 3], from:t(14), to:t(16)}, note:"The adjuster takes calls Tuesday to Thursday, 2:00 to 4:00 PM only."},
    {id:"records", title:"Medical records review block", dur:60, weight:10, rules:{from:t(9), to:t(12)}, note:"Attorney reviews records in the morning, before lunch."},
    {id:"urgent", title:"Urgent call: Garcia", dur:30, weight:15, rules:{days:[0, 1]}, note:"Client called in upset. The attorney promised a call within two days: Monday or Tuesday."},
    {id:"strategy", title:"Case strategy meeting with paralegal", dur:60, weight:10, rules:{days:[1, 2, 3]}, note:"The paralegal is only in Tuesday to Thursday."},
    {id:"courthouse", title:"Client signing at the courthouse: Park", dur:45, weight:10, rules:{buffer:30}, note:"Off site: leave 30 minutes free before and after for travel. Book 1 hour (the calendar works in 30-minute steps)."}
   ]},
  {id:"chen", title:"Week 2 · Attorney Chen (trial week)", level:"Advanced",
   brief:"A heavier week: a deposition, a motion hearing and a mediation are fixed, and the prep and client items have to fit around them in the right order. Prep always goes before the event it prepares for. Build the calendar and submit it to your trainer.",
   fixed:[
    {id:"intake", title:"Intake review", day:0, start:t(9), end:t(10), kind:"fixed"},
    {id:"depo", title:"Deposition: Lopez", day:1, start:t(10), end:t(12), kind:"fixed"},
    {id:"motion", title:"Motion hearing", day:2, start:t(10), end:t(11, 30), kind:"court", buffer:30, note:"Travel: keep 30 minutes free before and after."},
    {id:"trial", title:"Trial prep block (protected)", day:3, start:t(13), end:t(17), kind:"fixed"},
    {id:"mediation", title:"Mediation: Reyes", day:4, start:t(9), end:t(11), kind:"fixed"}
   ].concat(lunch),
   tasks:[
    {id:"deposprep", title:"Deposition prep: Lopez", dur:120, weight:20, rules:{beforeEvent:{id:"depo", gap:0}}, note:"Finish before the Lopez deposition starts on Tuesday."},
    {id:"hearprep", title:"Motion hearing prep", dur:60, weight:20, rules:{beforeEvent:{id:"motion", gap:30}}, note:"Done at least 30 minutes before the hearing on Wednesday (the attorney can’t start before 9:00)."},
    {id:"medprep", title:"Mediation prep: Reyes", dur:90, weight:15, rules:{beforeDay:4}, note:"Has to happen before Friday, so the client can review the numbers."},
    {id:"expert", title:"Expert consult", dur:60, weight:15, rules:{days:[2, 3], from:t(13), to:t(16)}, note:"The expert is free Wednesday or Thursday, 1:00 to 4:00 PM."},
    {id:"clientcall", title:"Client call: Reyes", dur:30, weight:15, rules:{days:[0, 3], from:t(13)}, note:"Reyes can only talk Monday or Thursday afternoons."},
    {id:"demand", title:"Demand letter review", dur:30, weight:15, rules:{days:[0, 1, 2]}, note:"Needs to go out by Wednesday: schedule it Monday to Wednesday."}
   ]}
];

const overlap = (a, b, pad) => a.day === b.day && a.start < b.end + pad && b.start < a.end + pad;
const endOf = ev => ev.start + ev.dur;

// The trainee's events plus the fixed ones, as {id, day, start, end, buffer, fixed}.
function all(scn, events){
  return scn.fixed.map(f => ({id:f.id, title:f.title, day:f.day, start:f.start, end:f.end, buffer:f.buffer || 0, fixed:true}))
    .concat((events || []).map(x => ({id:x.id, title:x.title, day:x.day, start:x.start, end:endOf(x), buffer:0, fixed:false})));
}
// Why an event of the trainee's is flagged (empty = fine).
function flags(scn, events){
  const evs = all(scn, events), out = {};
  (events || []).forEach(x => {
    const me = evs.find(e => e.id === x.id), why = [];
    const hit = evs.find(o => o.id !== x.id && overlap(me, o, 0));
    const near = !hit && evs.find(o => o.buffer && overlap(me, o, o.buffer));
    if(hit) why.push(`Overlaps “${hit.title}”`);
    else if(near) why.push(`Too close to “${near.title}” (${near.buffer} minutes of travel time)`);
    if(me.start < OPEN || me.end > CLOSE) why.push("Outside business hours (9:00 AM to 5:00 PM)");
    if(why.length) out[x.id] = why;
  });
  return out;
}
// Saved events are checked before they're used: whole slots, inside the grid, a sane title, a sane count.
function clean(events){
  const seen = {};
  return (Array.isArray(events) ? events : []).filter(x => x && typeof x === "object" && typeof x.id === "string" && !seen[x.id] && (seen[x.id] = 1)
    && Number.isInteger(x.day) && x.day >= 0 && x.day <= 4 && Number.isInteger(x.start) && x.start % STEP === 0 && x.start >= t(8)
    && Number.isInteger(x.dur) && x.dur >= STEP && x.dur % STEP === 0 && x.start + x.dur <= t(18))
    .slice(0, MAXEV).map(x => ({id:x.id.slice(0, 24), title:String(x.title || "").slice(0, 80), day:x.day, start:x.start, dur:x.dur}));
}

/* ---------- the automated review ---------- */
const PASS = 80;
const STOP = new Set(["the", "a", "an", "with", "for", "of", "and", "to", "at", "on", "in", "call", "meeting"]);
const words = x => String(x || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(w => w && !STOP.has(w));
// How well an event's name fits a task's: the share of the task's words the name has (a word counts if one starts the other).
function fit(task, title){
  const a = words(task.title), b = words(title); if(!a.length || !b.length) return 0;
  return a.filter(w => b.some(v => v === w || (w.length > 3 && v.length > 3 && (v.startsWith(w) || w.startsWith(v))))).length / a.length;
}
// Each task takes the best-fitting event not already taken (at least 60% of its words).
function match(scn, events){
  const used = {}, out = {}, pairs = [];
  scn.tasks.forEach(k => events.forEach(x => { const f = fit(k, x.title); if(f >= 0.6) pairs.push({k, x, f}); }));
  pairs.sort((p, q) => q.f - p.f);
  pairs.forEach(p => { if(!out[p.k.id] && !used[p.x.id]){ out[p.k.id] = p.x; used[p.x.id] = 1; } });
  return out;
}
function checks(scn, k, x, evs){
  const r = k.rules || {}, out = [], add = (ok, label, why) => out.push({ok:!!ok, label, why:ok ? "" : why});
  if(!x){ add(false, "On the calendar", "Not found on your calendar. Name the event after the task so it can be matched (for example “" + k.title + "”)."); return out; }
  add(true, "On the calendar", "");
  const me = {id:x.id, day:x.day, start:x.start, end:x.start + x.dur}, others = evs.filter(o => o.id !== x.id);
  const hit = others.find(o => overlap(me, o, 0)), near = !hit && others.find(o => o.buffer && overlap(me, o, o.buffer));
  add(!hit && !near, "No conflict", hit ? `Overlaps “${hit.title}” on ${DAYS[hit.day]}.` : near ? `Too close to “${near.title}”: it needs ${near.buffer} minutes of travel time.` : "");
  add(me.start >= OPEN && me.end <= CLOSE, "Business hours (9:00 AM to 5:00 PM)", `Runs ${fmt(me.start)} to ${fmt(me.end)}, outside business hours.`);
  add(x.dur >= k.dur, "Long enough", `Booked for ${x.dur} minutes; this needs ${k.dur}.`);
  if(r.days) add(r.days.includes(x.day), "Right day", `Not on ${DAYS[x.day]}: this one works ${r.days.map(d => DAYS[d].slice(0, 3)).join(", ")}.`);
  if(r.from != null || r.to != null){ const lo = r.from != null ? r.from : OPEN, hi = r.to != null ? r.to : CLOSE; add(me.start >= lo && me.end <= hi, "Right time of day", `Must fall between ${fmt(lo)} and ${fmt(hi)}.`); }
  if(r.beforeEvent){ const ev = scn.fixed.find(f => f.id === r.beforeEvent.id), gap = r.beforeEvent.gap || 0;
    add(ev && (x.day < ev.day || (x.day === ev.day && me.end + gap <= ev.start)), `Before “${ev ? ev.title : ""}”`, `Must finish${gap ? " " + gap + " minutes" : ""} before “${ev ? ev.title : ""}” (${ev ? DAYS[ev.day] + " " + fmt(ev.start) : ""}).`); }
  if(r.beforeDay != null) add(x.day < r.beforeDay, "Early enough", `Must be before ${DAYS[r.beforeDay]}.`);
  if(r.buffer){ const tight = others.find(o => overlap(me, o, r.buffer)); add(!tight, `${r.buffer}-minute travel buffer`, tight ? `Within ${r.buffer} minutes of “${tight.title}”.` : ""); }
  return out;
}
// The automated review of a calendar: {score, max, pct, passed, items:[{id, title, weight, pts, perfect, found, event, checks}], extras:[events with no task]}
function review(scn, events){
  events = clean(events);
  const evs = all(scn, events), m = match(scn, events), taken = {};
  let got = 0, max = 0;
  const items = scn.tasks.map(k => {
    const x = m[k.id]; if(x) taken[x.id] = 1;
    const cs = checks(scn, k, x, evs), pass = cs.filter(c => c.ok).length, pts = Math.round(k.weight * pass / cs.length * 10) / 10;
    got += pts; max += k.weight;
    return {id:k.id, title:k.title, weight:k.weight, pts, perfect:pass === cs.length, found:!!x, event:x || null, checks:cs};
  });
  const fl = flags(scn, events);
  const extras = events.filter(x => !taken[x.id]).map(x => ({title:x.title, day:x.day, start:x.start, why:fl[x.id] || []}));
  const pct = max ? Math.round(got / max * 100) : 0;
  return {score:Math.round(got), max, pct, passed:pct >= PASS, items, extras, done:items.filter(i => i.perfect).length};
}

const api = {DAYS, OPEN, CLOSE, STEP, MAXEV, PASS, SCENARIOS, fmt, overlap, endOf, all, flags, clean, match, review};
if(typeof module !== "undefined" && module.exports) module.exports = api; else root.FTCalCore = api;
})(typeof window !== "undefined" ? window : globalThis);
