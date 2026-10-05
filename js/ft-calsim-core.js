/* ============================================================
   Calendar Scheduler: the weeks and the helpers (no page code here, so it can be tested with node).
   Loaded before js/ft-calendar.js, which is the drag-and-drop page.
     • Times are minutes from midnight; days are 0 (Mon) to 4 (Fri).
     • A week has the attorney's fixed events (locked) and a list of tasks the trainee is told to put on the
       calendar. The trainee builds their own calendar (their events are {id, title, day, start, dur}) and
       submits it; a trainer reviews it. Nothing here scores it.
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
    {title:"Mediation prep: Garcia", dur:60, note:"Finish at least 30 minutes before the Garcia mediation on Wednesday."},
    {title:"Deposition prep: Wilson", dur:90, note:"Has to happen before the day of the Wilson deposition (Thursday)."},
    {title:"New client consultation: Thompson", dur:60, note:"Mr. Thompson works mornings: afternoons only. He can come in Monday to Wednesday."},
    {title:"Settlement call: adjuster", dur:30, note:"The adjuster takes calls Tuesday to Thursday, 2:00 to 4:00 PM only."},
    {title:"Medical records review block", dur:60, note:"Attorney reviews records in the morning, before lunch."},
    {title:"Urgent call: Garcia", dur:30, note:"Client called in upset. The attorney promised a call within two days: Monday or Tuesday."},
    {title:"Case strategy meeting with paralegal", dur:60, note:"The paralegal is only in Tuesday to Thursday."},
    {title:"Client signing at the courthouse: Park", dur:45, note:"Off site: leave 30 minutes free before and after for travel. Book 1 hour (the calendar works in 30-minute steps)."}
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
    {title:"Deposition prep: Lopez", dur:120, note:"Finish before the Lopez deposition starts on Tuesday."},
    {title:"Motion hearing prep", dur:60, note:"Done at least 30 minutes before the hearing on Wednesday (the attorney can’t start before 9:00)."},
    {title:"Mediation prep: Reyes", dur:90, note:"Has to happen before Friday, so the client can review the numbers."},
    {title:"Expert consult", dur:60, note:"The expert is free Wednesday or Thursday, 1:00 to 4:00 PM."},
    {title:"Client call: Reyes", dur:30, note:"Reyes can only talk Monday or Thursday afternoons."},
    {title:"Demand letter review", dur:30, note:"Needs to go out by Wednesday: schedule it Monday to Wednesday."}
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

const api = {DAYS, OPEN, CLOSE, STEP, MAXEV, SCENARIOS, fmt, overlap, endOf, all, flags, clean};
if(typeof module !== "undefined" && module.exports) module.exports = api; else root.FTCalCore = api;
})(typeof window !== "undefined" ? window : globalThis);
