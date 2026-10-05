/* ============================================================
   Calendar Scheduler: scenarios and grading (no page code here, so it can be tested with node).
   Loaded before js/ft-calendar.js, which is the drag-and-drop page.
     • Times are minutes from midnight; days are 0 (Mon) to 4 (Fri); a placement is {day, start}.
     • A scenario has the attorney's fixed events and the requests the trainee must put on the calendar.
     • grade() checks every request against its rules and scores it out of its weight. The score is always
       worked out from the placements, never stored as a number the trainee typed, so the admin screen
       re-grades the saved placements instead of trusting a saved score.
   Rules a request can carry (all optional):
     days:[0..4]        only on these days
     from, to           the whole event inside this time window
     beforeEvent        {id, gap}: finish at least `gap` minutes before that fixed event (any earlier day also counts)
     beforeDay          on a day earlier than this one
     buffer             nothing else within this many minutes on either side (travel time)
   Always checked: scheduled, no overlap with any other event (or a fixed event's own travel buffer),
   inside business hours (9:00 to 5:00).
   ============================================================ */
(function(root){
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const OPEN = 9 * 60, CLOSE = 17 * 60, STEP = 30, PASS = 80;
const t = (h, m) => h * 60 + (m || 0);
function fmt(min){ const h = Math.floor(min / 60), m = min % 60; return (h % 12 || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? " AM" : " PM"); }
const lunch = [0, 1, 2, 3, 4].map(d => ({id:"lunch" + d, title:"Lunch (attorney out)", day:d, start:t(12), end:t(13), kind:"lunch"}));

const SCENARIOS = [
  {id:"rivera", title:"Week 1 · Attorney Rivera", level:"Core",
   brief:"Attorney Rivera’s week already has a hearing, a mediation, a deposition and two meetings. Your inbox has eight requests: drag each one onto the week so every rule is met. Read each request’s notes: the clients, the adjuster and the paralegal all have limits.",
   fixed:[
    {id:"review", title:"Weekly case review", day:0, start:t(9), end:t(9, 30), kind:"fixed"},
    {id:"hearing", title:"Court hearing: Smith v. Allied", day:1, start:t(9, 30), end:t(12), kind:"court", buffer:30, note:"Travel: keep 30 minutes free before and after."},
    {id:"mediation", title:"Mediation: Garcia", day:2, start:t(13), end:t(15), kind:"fixed"},
    {id:"depo", title:"Deposition: Wilson", day:3, start:t(10), end:t(11), kind:"fixed"},
    {id:"firm", title:"Firm meeting", day:4, start:t(15), end:t(16), kind:"fixed"}
   ].concat(lunch),
   requests:[
    {id:"medprep", title:"Mediation prep: Garcia", dur:60, weight:15, note:"Must be finished at least 30 minutes before the Garcia mediation on Wednesday.", rules:{beforeEvent:{id:"mediation", gap:30}}},
    {id:"deposprep", title:"Deposition prep: Wilson", dur:90, weight:15, note:"Has to happen before the day of the Wilson deposition (Thursday).", rules:{beforeDay:3}},
    {id:"consult", title:"New client consultation: Thompson", dur:60, weight:15, note:"Mr. Thompson works mornings: afternoons only. He can come in Monday to Wednesday.", rules:{days:[0, 1, 2], from:t(13)}},
    {id:"adjuster", title:"Settlement call: adjuster", dur:30, weight:10, note:"The adjuster takes calls Tuesday to Thursday, 2:00 to 4:00 PM only.", rules:{days:[1, 2, 3], from:t(14), to:t(16)}},
    {id:"records", title:"Medical records review block", dur:60, weight:10, note:"Attorney reviews records in the morning, before lunch.", rules:{from:t(9), to:t(12)}},
    {id:"urgent", title:"Urgent call: Garcia", dur:30, weight:15, note:"Client called in upset. The attorney promised a call within two days: Monday or Tuesday.", rules:{days:[0, 1]}},
    {id:"strategy", title:"Case strategy meeting with paralegal", dur:60, weight:10, note:"The paralegal is only in Tuesday to Thursday.", rules:{days:[1, 2, 3]}},
    {id:"courthouse", title:"Client signing at the courthouse: Park", dur:45, weight:10, note:"Off site: leave 30 minutes free before and after for travel.", rules:{buffer:30}}
   ]},
  {id:"chen", title:"Week 2 · Attorney Chen (trial week)", level:"Advanced",
   brief:"A heavier week: a deposition, a motion hearing and a mediation are fixed, and five prep and client items have to fit around them in the right order. Prep always goes before the event it prepares for.",
   fixed:[
    {id:"intake", title:"Intake review", day:0, start:t(9), end:t(10), kind:"fixed"},
    {id:"depo", title:"Deposition: Lopez", day:1, start:t(10), end:t(12), kind:"fixed"},
    {id:"motion", title:"Motion hearing", day:2, start:t(10), end:t(11, 30), kind:"court", buffer:30, note:"Travel: keep 30 minutes free before and after."},
    {id:"trial", title:"Trial prep block (protected)", day:3, start:t(13), end:t(17), kind:"fixed"},
    {id:"mediation", title:"Mediation: Reyes", day:4, start:t(9), end:t(11), kind:"fixed"}
   ].concat(lunch),
   requests:[
    {id:"deposprep", title:"Deposition prep: Lopez", dur:120, weight:20, note:"Finish before the Lopez deposition starts on Tuesday.", rules:{beforeEvent:{id:"depo", gap:0}}},
    {id:"hearprep", title:"Motion hearing prep", dur:60, weight:20, note:"Done at least 30 minutes before the hearing on Wednesday (the attorney can’t start before 9:00).", rules:{beforeEvent:{id:"motion", gap:30}}},
    {id:"medprep", title:"Mediation prep: Reyes", dur:90, weight:15, note:"Has to happen before Friday, so the client can review the numbers.", rules:{beforeDay:4}},
    {id:"expert", title:"Expert consult", dur:60, weight:15, note:"The expert is free Wednesday or Thursday, 1:00 to 4:00 PM.", rules:{days:[2, 3], from:t(13), to:t(16)}},
    {id:"clientcall", title:"Client call: Reyes", dur:30, weight:15, note:"Reyes can only talk Monday or Thursday afternoons.", rules:{days:[0, 3], from:t(13)}},
    {id:"demand", title:"Demand letter review", dur:30, weight:15, note:"Needs to go out by Wednesday: schedule it Monday to Wednesday.", rules:{days:[0, 1, 2]}}
   ]}
];

// Every event on the calendar for a placement set: the fixed ones and the placed requests.
function eventsOf(scn, place){
  const out = scn.fixed.map(f => ({id:f.id, title:f.title, day:f.day, start:f.start, end:f.end, fixed:true, buffer:f.buffer || 0}));
  scn.requests.forEach(r => { const p = place[r.id]; if(p) out.push({id:r.id, title:r.title, day:p.day, start:p.start, end:p.start + r.dur, fixed:false, buffer:(r.rules || {}).buffer || 0}); });
  return out;
}
const overlap = (a, b, pad) => a.day === b.day && a.start < b.end + pad && b.start < a.end + pad;

// Checks for one request. Each check is {ok, label, why}; a request is worth its weight times the share that pass.
function checkRequest(scn, place, r, evs){
  const p = place[r.id], k = r.rules || {}, checks = [];
  const add = (ok, label, why) => checks.push({ok:!!ok, label, why:ok ? "" : why});
  if(!p){ add(false, "On the calendar", "Not scheduled yet."); return checks; }
  const me = {id:r.id, day:p.day, start:p.start, end:p.start + r.dur};
  add(true, "On the calendar", "");
  const others = evs.filter(e => e.id !== r.id);
  const hit = others.find(e => overlap(me, e, 0));
  const near = !hit && others.find(e => e.buffer && overlap(me, e, e.buffer));
  add(!hit && !near, "No conflict",
    hit ? `Overlaps “${hit.title}” on ${DAYS[hit.day]}.` : near ? `Too close to “${near.title}”: it needs ${near.buffer} minutes of travel time.` : "");
  add(me.start >= OPEN && me.end <= CLOSE, "Business hours (9:00 AM to 5:00 PM)", `Runs ${fmt(me.start)} to ${fmt(me.end)}, outside business hours.`);
  if(k.days) add(k.days.includes(p.day), "Right day", `Not on ${DAYS[p.day]}: this one works ${k.days.map(d => DAYS[d].slice(0, 3)).join(", ")}.`);
  if(k.from != null || k.to != null){
    const lo = k.from != null ? k.from : OPEN, hi = k.to != null ? k.to : CLOSE;
    add(me.start >= lo && me.end <= hi, "Right time of day", `Must fall between ${fmt(lo)} and ${fmt(hi)}.`);
  }
  if(k.beforeEvent){
    const ev = scn.fixed.find(f => f.id === k.beforeEvent.id), gap = k.beforeEvent.gap || 0;
    add(ev && (p.day < ev.day || (p.day === ev.day && me.end + gap <= ev.start)), `Before “${ev ? ev.title : ""}”`,
      `Must finish${gap ? " " + gap + " minutes" : ""} before “${ev ? ev.title : ""}” (${ev ? DAYS[ev.day] + " " + fmt(ev.start) : ""}).`);
  }
  if(k.beforeDay != null) add(p.day < k.beforeDay, "Early enough", `Must be before ${DAYS[k.beforeDay]}.`);
  if(k.buffer){
    const tight = others.find(e => overlap(me, e, k.buffer));
    add(!tight, `${k.buffer}-minute travel buffer`, tight ? `Within ${k.buffer} minutes of “${tight.title}”.` : "");
  }
  return checks;
}

function grade(scn, place){
  place = place || {};
  const evs = eventsOf(scn, place);
  let got = 0, max = 0;
  const items = scn.requests.map(r => {
    const checks = checkRequest(scn, place, r, evs), pass = checks.filter(c => c.ok).length;
    const pts = Math.round(r.weight * pass / checks.length * 10) / 10;
    got += pts; max += r.weight;
    return {id:r.id, title:r.title, weight:r.weight, pts, perfect:pass === checks.length, placed:!!place[r.id], checks};
  });
  const pct = max ? Math.round(got / max * 100) : 0;
  return {score:Math.round(got), max, pct, passed:pct >= PASS, items, done:items.filter(i => i.perfect).length};
}

// Placements must be sane before they're graded or saved: known requests, whole slots, inside the week.
function clean(scn, place){
  const out = {};
  scn.requests.forEach(r => {
    const p = place && place[r.id];
    if(p && Number.isInteger(p.day) && p.day >= 0 && p.day <= 4 && Number.isInteger(p.start) && p.start >= t(8) && p.start % STEP === 0 && p.start + r.dur <= t(18)) out[r.id] = {day:p.day, start:p.start};
  });
  return out;
}

const api = {DAYS, OPEN, CLOSE, STEP, PASS, SCENARIOS, fmt, eventsOf, grade, clean, overlap};
if(typeof module !== "undefined" && module.exports) module.exports = api; else root.FTCalCore = api;
})(typeof window !== "undefined" ? window : globalThis);
