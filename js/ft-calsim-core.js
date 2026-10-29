/* ============================================================
   Calendaring Simulators: the tracks, the weeks and the automated review (no page code here, so it can be tested
   with node). Loaded before js/ft-calendar.js, which is the drag-and-drop page.
     • Times are minutes from midnight (Eastern Time); days are 0 (Mon) to 4 (Fri); the grid works in 15-minute steps.
     • One track, set up like a Google Calendar: Standard Training (the Foundational / Calendar Management weeks).
       A week has the attorney's fixed events and the tasks the trainee must put on the calendar.
     • The trainee's events are {id, title, day, start, dur, desc, meet, remind, guests, color}: a title, a description,
       Google Meet for video calls, an email reminder a day before, guests and a color (Google Calendar's eleven event
       colors; "" is the calendar's default), as in Google Calendar.
     • The attorney's color rule (COLOR_RULE): an event is colored by how long it is: 30 minutes Tangerine, 45 minutes
       Blueberry, 1 hour Tomato. The trainee picks the color; the review checks it.
     • review() is the automated review: it matches the events to the tasks by their names, then checks every task
       against the attorney's rules (days, time window, before/after an event, travel buffer, 15-minute gap between
       events, and the details a task calls for: description, Google Meet, email reminder, the color rule). Scored out of 100,
       80% passes. A trainer's manual feedback comes on top.
     • A second track, 🗓 Attorney Calendar Management Activity (Day 5; its scenario has kind:"activity"), is the attorney's
       own Google Calendar in Seattle (Pacific Time), July 6–15, 2026: the trainee creates every event (no fixed events) with
       Google Calendar's fields (date, start/end, the event's own time zone, location, guests, description, color, reminders).
       Its answer key (ACT_KEY, below: the 10 items and their travel blocks) is data for trainers to adjust. flags(),
       review() and cleanFor() hand an activity scenario to the activity's own code (api.act); the Standard weeks are unchanged.
   ============================================================ */
(function(root){
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const OPEN = 9 * 60, CLOSE = 17 * 60, STEP = 15, MAXEV = 60, PASS = 80;
const t = (h, m) => h * 60 + (m || 0);
function fmt(min){ const h = Math.floor(min / 60), m = min % 60; return (h % 12 || 12) + (m ? ":" + String(m).padStart(2, "0") : "") + (h < 12 ? " AM" : " PM"); }
// Google Calendar's event colors (name, fill and the darker left edge). An event's `color` is one of these ids or "" (the default).
const COLORS = [
  {id:"tomato", name:"Tomato", hex:"#d50000", edge:"#9b0000"},
  {id:"flamingo", name:"Flamingo", hex:"#e67c73", edge:"#b35a52"},
  {id:"tangerine", name:"Tangerine", hex:"#f4511e", edge:"#b83a12"},
  {id:"banana", name:"Banana", hex:"#f6bf26", edge:"#b98f14"},
  {id:"sage", name:"Sage", hex:"#33b679", edge:"#23875a"},
  {id:"basil", name:"Basil", hex:"#0b8043", edge:"#075a2f"},
  {id:"peacock", name:"Peacock", hex:"#039be5", edge:"#0277bd"},
  {id:"blueberry", name:"Blueberry", hex:"#3f51b5", edge:"#283593"},
  {id:"lavender", name:"Lavender", hex:"#7986cb", edge:"#5c6bc0"},
  {id:"grape", name:"Grape", hex:"#8e24aa", edge:"#6a1b7f"},
  {id:"graphite", name:"Graphite", hex:"#616161", edge:"#424242"}
];
const colorOf = id => COLORS.find(c => c.id === id) || null;
// The attorney's color rule: the color an event must have for its length (no rule for other lengths).
const COLOR_RULE = {30:"tangerine", 45:"blueberry", 60:"tomato"};
const COLOR_RULE_TEXT = "Color each event by how long it is: 30 minutes Tangerine, 45 minutes Blueberry, 1 hour Tomato.";
const colorFor = dur => COLOR_RULE[dur] || null;
const lunch = [0, 1, 2, 3, 4].map(d => ({id:"lunch" + d, title:"Lunch (out of office)", day:d, start:t(12), end:t(13), kind:"lunch"}));

const TRACKS = [
  {id:"standard", icon:"🎓", title:"Standard Training", where:"Foundational · Calendar Management", blurb:"The attorney’s calendar in a Google Calendar look-alike: book each task under the attorney’s rules (title, description, Google Meet for video calls, an email reminder a day before, Eastern time, 15-minute gaps), then check the calendar."},
];

const SCENARIOS = [
  {id:"rivera", track:"standard", short:"Standard · Week 1", title:"Week 1 · Attorney Rivera", level:"Core", gap:15,
   brief:"Attorney Rivera’s week already has a hearing, a mediation, a deposition and two meetings. Build the calendar: add each task below as an event (drag on an empty part of the week), keep clear of the fixed events, lunch and travel time, leave 15 minutes between events, and follow each task’s notes. Give every event a description, add Google Meet and the email reminder where the task asks for them, then submit it to your trainer.",
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
    {id:"consult", title:"New client consultation: Thompson", dur:60, weight:15, rules:{days:[0, 1, 2], from:t(13)}, needs:{remind:true}, note:"Mr. Thompson works mornings: afternoons only. He can come in Monday to Wednesday. Set the email reminder for the day before."},
    {id:"adjuster", title:"Settlement call: adjuster", dur:30, weight:10, rules:{days:[1, 2, 3], from:t(14), to:t(16)}, needs:{meet:true}, note:"The adjuster takes calls Tuesday to Thursday, 2:00 to 4:00 PM only. It’s a video call: add Google Meet."},
    {id:"records", title:"Medical records review block", dur:60, weight:10, rules:{from:t(9), to:t(12)}, note:"Attorney reviews records in the morning, before lunch."},
    {id:"urgent", title:"Urgent call: Garcia", dur:30, weight:15, rules:{days:[0, 1]}, note:"Client called in upset. The attorney promised a call within two days: Monday or Tuesday."},
    {id:"strategy", title:"Case strategy meeting with paralegal", dur:60, weight:10, rules:{days:[1, 2, 3]}, note:"The paralegal is only in Tuesday to Thursday."},
    {id:"courthouse", title:"Client signing at the courthouse: Park", dur:45, weight:10, rules:{buffer:30}, note:"Off site: leave 30 minutes free before and after for travel."}
   ]},
  {id:"chen", track:"standard", short:"Standard · Week 2", title:"Week 2 · Attorney Chen (trial week)", level:"Advanced", gap:15,
   brief:"A heavier week: a deposition, a motion hearing and a mediation are fixed, and the prep and client items have to fit around them in the right order. Prep always goes before the event it prepares for. Leave 15 minutes between events, fill in each event’s details, and submit the calendar to your trainer.",
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
    {id:"expert", title:"Expert consult", dur:60, weight:15, rules:{days:[2, 3], from:t(13), to:t(16)}, needs:{meet:true}, note:"The expert is free Wednesday or Thursday, 1:00 to 4:00 PM. Video call: add Google Meet."},
    {id:"clientcall", title:"Client call: Reyes", dur:30, weight:15, rules:{days:[0, 3], from:t(13)}, needs:{meet:true, remind:true}, note:"Reyes can only talk Monday or Thursday afternoons. Video call with an email reminder the day before."},
    {id:"demand", title:"Demand letter review", dur:30, weight:15, rules:{days:[0, 1, 2]}, note:"Needs to go out by Wednesday: schedule it Monday to Wednesday."}
   ]},
];
const trackOf = id => TRACKS.find(x => x.id === id);

const overlap = (a, b, pad) => a.day === b.day && a.start < b.end + pad && b.start < a.end + pad;
const endOf = ev => ev.start + ev.dur;
// Space an event needs around another: its travel buffer, or the week's gap (none around lunch).
const padFor = (scn, o) => Math.max(o.buffer || 0, o.kind === "lunch" ? 0 : (scn.gap || 0));
const nearWhy = (scn, o) => o.buffer ? `Too close to “${o.title}”: it needs ${o.buffer} minutes of travel time.` : `Too close to “${o.title}”: leave ${scn.gap} minutes between events.`;

function all(scn, events){
  return scn.fixed.map(f => ({id:f.id, title:f.title, day:f.day, start:f.start, end:f.end, buffer:f.buffer || 0, kind:f.kind, fixed:true}))
    .concat((events || []).map(x => ({id:x.id, title:x.title, day:x.day, start:x.start, end:endOf(x), buffer:0, kind:"mine", fixed:false})));
}
function flags(scn, events){
  if(isAct(scn)) return act.flags(scn, events);
  const evs = all(scn, events), out = {};
  (events || []).forEach(x => {
    const me = evs.find(e => e.id === x.id), why = [];
    const hit = evs.find(o => o.id !== x.id && overlap(me, o, 0));
    const near = !hit && evs.find(o => o.id !== x.id && padFor(scn, o) && overlap(me, o, padFor(scn, o)));
    if(hit) why.push(`Overlaps “${hit.title}”`); else if(near) why.push(nearWhy(scn, near));
    if(me.start < OPEN || me.end > CLOSE) why.push("Outside business hours (9:00 AM to 5:00 PM)");
    if(why.length) out[x.id] = why;
  });
  return out;
}
// Saved events are checked before they're used: whole slots, inside the grid, sane text, a sane count.
function clean(events){
  const seen = {};
  return (Array.isArray(events) ? events : []).filter(x => x && typeof x === "object" && typeof x.id === "string" && !seen[x.id] && (seen[x.id] = 1)
    && Number.isInteger(x.day) && x.day >= 0 && x.day <= 4 && Number.isInteger(x.start) && x.start % STEP === 0 && x.start >= t(8)
    && Number.isInteger(x.dur) && x.dur >= STEP && x.dur % STEP === 0 && x.start + x.dur <= t(18))
    .slice(0, MAXEV).map(x => ({id:x.id.slice(0, 24), title:String(x.title || "").slice(0, 80), day:x.day, start:x.start, dur:x.dur,
      desc:String(x.desc || "").slice(0, 300), guests:String(x.guests || "").slice(0, 200), meet:!!x.meet, remind:!!x.remind, color:colorOf(x.color) ? x.color : ""}));
}

/* ---------- the automated review ---------- */
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
  const r = k.rules || {}, nd = k.needs || {}, out = [], add = (ok, label, why) => out.push({ok:!!ok, label, why:ok ? "" : why});
  if(!x){ add(false, "On the calendar", "Not found on your calendar. Name the event after the task so it can be matched (for example “" + k.title + "”)."); return out; }
  add(true, "On the calendar", "");
  const me = {id:x.id, day:x.day, start:x.start, end:x.start + x.dur}, others = evs.filter(o => o.id !== x.id);
  const hit = others.find(o => overlap(me, o, 0)), near = !hit && others.find(o => padFor(scn, o) && overlap(me, o, padFor(scn, o)));
  add(!hit && !near, "No conflict", hit ? `Overlaps “${hit.title}” on ${DAYS[hit.day]}.` : near ? nearWhy(scn, near) : "");
  add(me.start >= OPEN && me.end <= CLOSE, "Business hours (9:00 AM to 5:00 PM)", `Runs ${fmt(me.start)} to ${fmt(me.end)}, outside business hours.`);
  add(x.dur >= k.dur, "Long enough", `Booked for ${x.dur} minutes; this needs ${k.dur}.`);
  // The attorney's color rule goes by the event's length as booked (or the task's, when the booked length has no rule).
  const len = colorFor(x.dur) ? x.dur : k.dur, want = colorOf(colorFor(len));
  if(want){ const have = colorOf(x.color); add(x.color === want.id, "Right color for its length", `${have ? have.name : "The default color"} on a ${x.dur}-minute event${x.dur === len ? "" : " (a " + len + "-minute task)"}: it should be ${want.name}. ${COLOR_RULE_TEXT}`); }
  add(String(x.desc || "").trim().length >= 5, "Description added", "Add a description to the event (what it is for, who is involved).");
  if(nd.meet) add(x.meet, "Google Meet added", "This is a video call: add Google Meet to the event.");
  if(nd.remind) add(x.remind, "Email reminder a day before", "Set an email notification 1 day before the event.");
  if(r.days) add(r.days.includes(x.day), "Right day", `Not on ${DAYS[x.day]}: this one works ${r.days.map(d => DAYS[d].slice(0, 3)).join(", ")}.`);
  if(r.from != null || r.to != null){ const lo = r.from != null ? r.from : OPEN, hi = r.to != null ? r.to : CLOSE; add(me.start >= lo && me.end <= hi, "Right time of day", `Must fall between ${fmt(lo)} and ${fmt(hi)}.`); }
  if(r.beforeEvent){ const ev = scn.fixed.find(f => f.id === r.beforeEvent.id), gap = r.beforeEvent.gap || 0;
    add(ev && (x.day < ev.day || (x.day === ev.day && me.end + gap <= ev.start)), `Before “${ev ? ev.title : ""}”`, `Must finish${gap ? " " + gap + " minutes" : ""} before “${ev ? ev.title : ""}” (${ev ? DAYS[ev.day] + " " + fmt(ev.start) : ""}).`); }
  if(r.afterEvent){ const ev = scn.fixed.find(f => f.id === r.afterEvent.id), gap = r.afterEvent.gap || 0;
    add(ev && (x.day > ev.day || (x.day === ev.day && me.start >= ev.end + gap)), `After “${ev ? ev.title : ""}”`, `Must start${gap ? " at least " + gap + " minutes" : ""} after “${ev ? ev.title : ""}” ends (${ev ? DAYS[ev.day] + " " + fmt(ev.end) : ""}).`); }
  if(r.beforeDay != null) add(x.day < r.beforeDay, "Early enough", `Must be before ${DAYS[r.beforeDay]}.`);
  if(r.buffer){ const tight = others.find(o => overlap(me, o, r.buffer)); add(!tight, `${r.buffer}-minute travel buffer`, tight ? `Within ${r.buffer} minutes of “${tight.title}”.` : ""); }
  return out;
}
// The automated review of a calendar: {score, max, pct, passed, items:[{id, title, weight, pts, perfect, found, event, checks}], extras:[events with no task]}
function review(scn, events){
  if(isAct(scn)) return act.review(scn, events);
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

/* ============================================================
   🗓 Attorney Calendar Management Activity (Day 5): the attorney's own Google Calendar, July 6–15, 2026.
   The attorney is in Seattle: the calendar shows Pacific Time (America/Los_Angeles). The trainee creates every event.
   An event: {id, title, date:"2026-07-DD", allDay, span (all-day: how many days), start, dur (minutes, in the EVENT'S OWN
              time zone), tz (a TZS id), loc, guests:[emails], desc, meet, color, reminders:[{type:"notification"|"email", n, unit}]}
   ============================================================ */
const isAct = scn => !!scn && scn.kind === "activity";
const act = (() => {
// The activity's PST / MST / CST / EST are US Pacific / Mountain / Central / Eastern Time. Offsets come from the time-zone data
// for each date (July 2026 is daylight time: PDT -7, MDT -6, CDT -5, EDT -4); `off` (the summer offset) is used only without it.
const TZS = [
  {id:"America/Los_Angeles", short:"PST", dst:"PDT", name:"Pacific Time - Los Angeles", word:"Pacific", off:-420},
  {id:"America/Denver",      short:"MST", dst:"MDT", name:"Mountain Time - Denver",     word:"Mountain", off:-360},
  {id:"America/Chicago",     short:"CST", dst:"CDT", name:"Central Time - Chicago",     word:"Central", off:-300},
  {id:"America/New_York",    short:"EST", dst:"EDT", name:"Eastern Time - New York",    word:"Eastern", off:-240}
];
const CAL_TZ = "America/Los_Angeles";
const tzOf = id => TZS.find(z => z.id === id || z.short === id) || null;
// The calendar's days: index 0 = Mon Jul 6, 2026. Two Monday-to-Sunday weeks are shown (to Sun Jul 19); the activity is days 0–9.
const FROM = "2026-07-06", BASE = Date.UTC(+FROM.slice(0, 4), +FROM.slice(5, 7) - 1, +FROM.slice(8, 10)), NDAYS = 14, LAST = 9, MAXEV = 40;
const dIdx = iso => /^\d{4}-\d{2}-\d{2}$/.test(String(iso)) ? Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - BASE) / 864e5) : NaN;
const dIso = i => new Date(BASE + i * 864e5).toISOString().slice(0, 10);
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dLabel = i => { const d = new Date(BASE + i * 864e5); return `${WD[d.getUTCDay()]} ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const fmtE = m => m >= 1440 ? "12 AM" : fmt(m);
const range = (a, b) => `${fmtE(a)} – ${fmtE(b)}`;
// A zone's offset from UTC (minutes) at an instant (minutes from FROM 00:00 UTC), cached by the hour.
const FMTS = {}, OFFS = new Map();
function offAt(tz, abs){
  const z = tzOf(tz) || TZS[0], h = Math.floor(abs / 60), k = z.id + "|" + h;
  let o = OFFS.get(k); if(o !== undefined) return o;
  o = z.off;
  try{
    const f = FMTS[z.id] || (FMTS[z.id] = new Intl.DateTimeFormat("en-US", {timeZone:z.id, hourCycle:"h23", year:"numeric", month:"numeric", day:"numeric", hour:"numeric", minute:"numeric"}));
    const ms = BASE + h * 3600000, p = {}; f.formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    const v = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - ms) / 60000); if(isFinite(v)) o = v;
  }catch(err){}
  OFFS.set(k, o); return o;
}
const abbr = (z, abs) => offAt(z.id, abs) === z.off ? z.dst : z.short;
const tzLabel = (z, abs) => { const o = offAt(z.id, abs || 0), a = Math.abs(o); return `(GMT${o < 0 ? "-" : "+"}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}) ${z.name}`; };
// Absolute minutes (UTC, from FROM 00:00 UTC) of a local date + time in a zone, and back.
function absAt(date, min, tz){ const l = dIdx(date) * 1440 + min, u = l - offAt(tz, l); return l - offAt(tz, u); }
function fromAbs(abs, tz){ const l = abs + offAt(tz, abs), d = Math.floor(l / 1440); return {day:d, date:dIso(d), start:l - d * 1440}; }
const evAbs = x => x.allDay ? {s:absAt(x.date, 0, CAL_TZ), e:absAt(dIso(dIdx(x.date) + (x.span || 1)), 0, CAL_TZ)} : (s => ({s, e:s + x.dur}))(absAt(x.date, x.start, x.tz));
// Where an event sits on the attorney's (Pacific) calendar.
function pacOf(x){ if(x.allDay) return {day:dIdx(x.date), start:0, end:1440, allDay:true, span:x.span || 1}; const a = evAbs(x), p = fromAbs(a.s, CAL_TZ); return {day:p.day, start:p.start, end:p.start + a.e - a.s}; }
// A spot on the Pacific calendar (a drag), in an event's own zone.
const fromPac = (day, start, tz) => fromAbs(absAt(dIso(day), start, CAL_TZ), tz);

const PEOPLE = [
  {name:"Martin Anthony", email:"martin@legalsupporthelp.com"},
  {name:"Michelle Velarde", email:"michelle.velarde@legalsupporthelp.com"},
  {name:"John Michael Dela Cruz", email:"john.delacruz@legalsupporthelp.com"},
  {name:"Lei Lee Abut", email:"team-litigation@legalsupporthelp.com"}
];
const [MA, MV, JD, LL] = PEOPLE.map(p => p.email), ALL4 = [MA, MV, JD, LL];
const who = em => (PEOPLE.find(p => p.email === em) || {name:em}).name;
// The activity's color legend in Google Calendar's colors (the first is the legend's; the others are accepted shades).
const CATS = {
  client:   {legend:"Green",  what:"Client Meetings",     colors:["basil", "sage"]},
  internal: {legend:"Blue",   what:"Internal Meetings",   colors:["peacock", "blueberry"]},
  court:    {legend:"Red",    what:"Court-Related Tasks", colors:["tomato"]},
  external: {legend:"Purple", what:"External Events",     colors:["grape"]},
  task:     {legend:"Yellow", what:"Internal Tasks",      colors:["banana"]},
  wellness: {legend:"Orange", what:"Personal Wellness",   colors:["tangerine"]},
  personal: {legend:"Pink",   what:"Personal Events",     colors:["flamingo"]}
};
const catText = c => `${CATS[c].legend} (${CATS[c].what}: ${CATS[c].colors.map(id => colorOf(id).name).join(" or ")})`;
const REM_UNITS = {minutes:1, hours:60, days:1440, weeks:10080};
const remMin = r => r.n * (REM_UNITS[r.unit] || 1);
const leadText = m => m && m % 10080 === 0 ? `${m / 10080} week${m === 10080 ? "" : "s"}` : m && m % 1440 === 0 ? `${m / 1440} day${m === 1440 ? "" : "s"}` : m && m % 60 === 0 ? `${m / 60} hour${m === 60 ? "" : "s"}` : `${m} minute${m === 1 ? "" : "s"}`;
const remText = r => `${r.type === "email" ? "Email" : "Notification"} ${leadText(r.min != null ? r.min : remMin(r))} before`;

/* ---------- THE ANSWER KEY (trainers: adjust here) ----------
   One entry per event the attorney's calendar should have: the ten items and their travel blocks / sub-blocks.
     id       stable: the trainer's per-item comments and the AI feedback are keyed by it (don't rename after trainees submit)
     item     the activity item (1–10) it belongs to; parent: the item's main event, for a travel block or sub-block
     title    as shown in the review; keys: what recognizes it in a trainee's title (each group is "any of these")
     date, tz, start, end   the item as given: its date, its zone (PST/MST/CST/EST), minutes from midnight in that zone.
              The review compares absolute instants: the item's local time in its own zone OR the same instant in Pacific both count.
              Keep every date inside the calendar (July 6–15, 2026; FROM / LAST above).
     allDay/after/morning   (the overnight stay) an all-day event on the date, an evening block from `after` (Pacific), a block the
              next day from 12 AM ending by `morning`; or a note on `noteOn`'s event
     cat      the legend's category; alt: other categories accepted, altWhy: what the feedback says when one is used
     loc      {any:[...]}: one of these in the location (meet:true: Google Meet added also counts);
              {from:[...], to:[...]}: a travel block: the location names a departure AND a destination ("Seattle → Washington County Court"),
              the destination side has one of `to`, the departure side one of `from` (empty = any place)
     guests   the exact guest list ([] = none)
     remind   required reminders {type, min (lead time in minutes), orOn:[ids of the same trip whose event may carry it instead]}
     travel   a travel block: also needs its own travel reminder (TRAVEL_MIN to TRAVEL_MAX minutes before, any type), apart from
              the item's required one (the trainer confirms the attorney's preference)
     notes    key details the event must carry: each {any:[words/phrases], say:"what to add"}; searched in the title and description
              (and the location when loc:true); orOn as for reminders
     info     a line the review always shows on this event (ℹ)
     weight   points out of 100 (the events add up to 90; the whole-calendar checks, CAL_W, are the other 10)
   ------------------------------------------------------------ */
const N = (say, any, o) => Object.assign({say, any}, o || {});
const GAP = "The activity gives 8:30–9:00 AM to reach SEA, right before the 9:00 AM flight: keep the given times. Your trainer may talk through a more realistic airport buffer with you.";
const KEY = [
  {id:"client", item:1, title:"Client Meeting: Alyssa Lynn Arehart", keys:[["client", "arehart", "alyssa"], ["meeting", "consult", "consultation"]],
   date:"2026-07-06", tz:"PST", start:t(10), end:t(11), cat:"client", loc:{any:["conference room b"], say:"Conference Room B"}, guests:[MA, MV],
   remind:[{type:"notification", min:15}], notes:[N("the client’s name (Alyssa Lynn Arehart)", ["arehart"]), N("the car accident case", ["car accident", "accident"]), N("that all case documents must be accessible", ["case document", "documents"])], weight:7},
  {id:"team", item:2, title:"Team Meeting (weekly check-in)", keys:[["team", "weekly"], ["meeting", "check in", "checkin", "huddle"]],
   date:"2026-07-07", tz:"MST", start:t(15), end:t(16), cat:"internal", loc:{any:["google meet", "meet google com"], meet:true, say:"Google Meet"}, guests:ALL4,
   remind:[{type:"email", min:30}], notes:[N("weekly team check-in", ["weekly", "check in", "checkin"])], weight:6},
  {id:"depo", item:3, title:"Deposition Meeting (prep with another attorney)", keys:[["deposition", "depo"], ["meeting", "prep", "preparation"]],
   date:"2026-07-08", tz:"EST", start:t(11), end:t(13), cat:"court", alt:["internal"],
   altWhy:"Blue is accepted for the deposition prep (a meeting with another attorney); Red, a court-related task, is the legend’s match.",
   loc:{any:["attorney office", "attorneys office"], say:"Attorney’s Office"}, guests:[MA, MV], remind:[{type:"email", min:1440}],
   notes:[N("that it is deposition preparation with another attorney", ["prep", "preparation"]), N("the Zoom link for remote attendees (zoom.us/deposition-meeting-02-04-25)", ["zoom us deposition meeting 02 04 25"], {loc:true})], weight:7},
  {id:"gym", item:4, title:"Gym Session", keys:[["gym", "workout", "work out", "fitness", "exercise"]],
   date:"2026-07-08", tz:"EST", start:t(6, 30), end:t(7, 30), cat:"wellness", loc:{any:["downtown seattle fitness"], say:"Downtown Seattle Fitness Center"}, guests:[],
   remind:[{type:"notification", min:10}], notes:[N("morning workout", ["workout", "work out", "exercise"])], weight:6},
  {id:"doctor", item:5, title:"Doctor’s Appointment", keys:[["doctor", "dr", "medical", "check up", "checkup", "physician", "physical", "appointment"]],
   date:"2026-07-09", tz:"PST", start:t(9), end:t(10), cat:"wellness", alt:["personal"],
   altWhy:"Pink is accepted for the doctor’s appointment (a personal event); Orange, personal wellness, is the legend’s match.",
   loc:{any:["central medical clinic"], say:"Central Medical Clinic"}, guests:[], remind:[{type:"email", min:1440}],
   notes:[N("routine check-up", ["check up", "checkup", "routine"]), N("to prepare documents or insurance details", ["insurance", "documents"])], weight:6},
  {id:"courtTo", item:6, parent:"court", travel:true, title:"Travel to Washington County Court", keys:[["travel", "drive", "commute", "transport", "leave", "depart"], ["court"]],
   date:"2026-07-10", tz:"PST", start:t(8), end:t(9), cat:"court", alt:["external"],
   altWhy:"A travel block takes its appointment’s color (Red for the court appearance); Purple is accepted.",
   loc:{from:[], to:["court"], eg:"Office → Washington County Court"}, guests:[], remind:[], notes:[], weight:3},
  {id:"court", item:6, title:"Court Appearance (hearing)", keys:[["court", "hearing"], ["appearance", "hearing", "court"]],
   date:"2026-07-10", tz:"PST", start:t(9), end:t(12), cat:"court", loc:{any:["washington county court"], say:"Washington County Court"}, guests:[],
   remind:[{type:"notification", min:30}], notes:[N("the scheduled court hearing", ["hearing"])], weight:7},
  {id:"courtBack", item:6, parent:"court", travel:true, title:"Return travel from court", keys:[["travel", "drive", "commute", "transport"], ["return", "back", "from court"]],
   date:"2026-07-10", tz:"PST", start:t(12), end:t(13), cat:"court", alt:["external"],
   altWhy:"A travel block takes its appointment’s color (Red for the court appearance); Purple is accepted.",
   loc:{from:["court"], to:[], eg:"Washington County Court → Office"}, guests:[], remind:[], notes:[], weight:3},
  {id:"statement", item:7, title:"Recorded Statement Meeting (insurance adjuster)", keys:[["recorded", "statement"], ["statement", "adjuster", "insurance"]],
   date:"2026-07-10", tz:"CST", start:t(16), end:t(17), cat:"court", alt:["client", "external"],
   altWhy:"The activity doesn’t name this one’s color: Red (a case task), Green (the client’s case) and Purple (an outside party, the adjuster) are all accepted. Your trainer confirms the attorney’s preference.",
   loc:{any:["google meet", "meet google com"], meet:true, say:"Google Meet"}, guests:ALL4, remind:[{type:"notification", min:15}],
   notes:[N("the insurance adjuster", ["adjuster"]), N("the premises liability case", ["premises liability", "premises"])], weight:6},
  {id:"toSea", item:8, parent:"networking", travel:true, title:"Transportation to Seattle Airport (SEA)", keys:[["transport", "travel", "drive", "ride", "uber", "taxi", "car", "shuttle", "commute", "leave"], ["sea", "airport", "seattle tacoma", "seatac", "sea tac"]],
   date:"2026-07-13", tz:"PST", start:t(8, 30), end:t(9), cat:"external", loc:{from:[], to:["sea", "airport", "seatac", "sea tac", "seattle tacoma"], eg:"Home → Seattle-Tacoma International Airport (SEA)"}, guests:[],
   remind:[{type:"email", min:1440, orOn:["flightOut"]}], info:GAP,
   notes:[N("confirm the flight details", ["flight"], {orOn:["flightOut"]}), N("check in luggage", ["luggage", "baggage", "bags"], {orOn:["flightOut"]}),
          N("bring travel documents", ["travel document", "documents", "passport"], {orOn:["flightOut"]}), N("bring business cards", ["business card"], {orOn:["flightOut"]}),
          N("prepare attire for the event", ["attire", "outfit", "clothes", "suit"], {orOn:["flightOut"]})], weight:4},
  {id:"flightOut", item:8, parent:"networking", travel:true, title:"Flight SEA → SFO", keys:[["flight", "fly", "flying", "plane", "boarding"], ["sfo", "san francisco"]],
   date:"2026-07-13", tz:"PST", start:t(9), end:t(12), cat:"external", loc:{from:["sea", "seattle"], to:["sfo", "san francisco"], eg:"SEA → SFO"}, guests:[], remind:[], notes:[], info:GAP, weight:4},
  {id:"arrive", item:8, parent:"networking", title:"Early arrival: Networking Dinner", keys:[["early", "arrival", "arrive"]],
   date:"2026-07-13", tz:"PST", start:t(17, 45), end:t(18), cat:"external", loc:{any:["ritz carlton", "600 stockton"], say:"The Ritz-Carlton, San Francisco"}, guests:[], remind:[], notes:[], weight:3},
  {id:"networking", item:8, title:"Networking Dinner Event", keys:[["networking", "potential client"]],
   date:"2026-07-13", tz:"PST", start:t(18), end:t(20), cat:"external", loc:{any:["600 stockton"], say:"the exact address given: The Ritz-Carlton, San Francisco (600 Stockton St, San Francisco, CA 94108)"}, guests:[],
   remind:[{type:"notification", min:30, orOn:["arrive"]}],
   notes:[N("bring business cards", ["business card"], {orOn:["arrive"]}), N("prepare a short personal introduction", ["introduction", "intro"], {orOn:["arrive"]})], weight:7},
  {id:"overnight", item:8, parent:"networking", kind:"overnight", title:"Overnight stay in San Francisco", keys:[["overnight", "stay", "lodging", "accommodation", "hotel"]],
   date:"2026-07-13", tz:"PST", allDay:true, after:t(20), morning:t(8), noteOn:"networking", cat:"external", loc:{any:["san francisco", "hotel", "ritz"], say:"San Francisco (the hotel)"}, guests:[], remind:[],
   notes:[N("confirm the hotel booking", ["hotel"]), N("plan transportation after the event", ["transport", "ride", "uber", "taxi", "car", "shuttle"])], weight:2},
  {id:"checkout", item:8, parent:"networking", travel:true, title:"Hotel check-out and travel to SFO", keys:[["check out", "checkout", "hotel"], ["travel", "airport", "sfo", "transport"]],
   date:"2026-07-14", tz:"PST", start:t(8), end:t(8, 30), cat:"external", loc:{from:["hotel", "ritz", "san francisco"], to:["sfo", "airport"], eg:"The Ritz-Carlton, San Francisco → SFO"}, guests:[],
   remind:[{type:"email", min:1440, orOn:["flightBack"]}], notes:[N("confirm the hotel check-out", ["check out", "checkout"], {orOn:["flightBack"]}), N("confirm transportation to the airport", ["transport", "ride", "uber", "taxi", "car", "shuttle"], {orOn:["flightBack"]})], weight:4},
  {id:"flightBack", item:8, parent:"networking", travel:true, title:"Flight SFO → SEA", keys:[["flight", "fly", "flying", "plane", "return"], ["sea", "seattle", "home"]],
   date:"2026-07-14", tz:"PST", start:t(10), end:t(13), cat:"external", loc:{from:["sfo", "san francisco"], to:["sea", "seattle"], eg:"SFO → SEA"}, guests:[], remind:[], notes:[], weight:3},
  {id:"docreview", item:9, title:"Document Review Session", keys:[["document", "doc", "file"], ["review"]],
   date:"2026-07-15", tz:"CST", start:t(13, 30), end:t(15), cat:"task", loc:{any:["attorney office", "attorneys office"], say:"Attorney’s Office"}, guests:[],
   remind:[{type:"notification", min:30}], notes:[N("the high-priority case file", ["high priority", "priority", "urgent"]), N("the case file to review", ["case file", "file"])], weight:6},
  {id:"family", item:10, title:"Family Dinner", keys:[["family"], ["dinner"]],
   date:"2026-07-15", tz:"MST", start:t(19), end:t(21), cat:"personal", loc:{any:["home"], say:"Home"}, guests:[],
   remind:[{type:"notification", min:60}], notes:[N("pick up groceries on the way home", ["groceries", "grocery"])], weight:6}
];
// The scoring (trainers: adjust here). A check's weight within its event; an event at the wrong time earns at most TIME_GATE of its points.
const CHECK_W = {time:3, tz:1, color:4, loc:1, guests:1, remind:4, notes:2};
const CAL_W = {overlap:5, complete:2, dupes:3};      // the whole-calendar checks (10 points)
const TIME_GATE = 0.5;
const TRAVEL_MIN = 30, TRAVEL_MAX = 1440;            // a travel block's own reminder: from 30 minutes to a day before
function prep(K){
  K.forEach(k => { k.tzId = tzOf(k.tz).id; if(!k.allDay){ k.abs = {s:absAt(k.date, k.start, k.tzId), e:absAt(k.date, k.end, k.tzId)}; const p = fromAbs(k.abs.s, CAL_TZ); k.pt = {day:p.day, start:p.start, end:p.start + k.abs.e - k.abs.s}; }
    const d = dIdx(k.date); if(!(d >= 0 && d <= LAST) && typeof console !== "undefined") console.warn(`Calendar activity key "${k.id}": ${k.date} is outside the calendar's dates.`); });
  return K;
}
prep(KEY);
const zText = (z, abs) => `${z.word} Time, ${abbr(z, abs)}`;
// What an expected event is, in one line (the review's "not found", the trainer's live review and the AI prompt).
function noteOf(k){
  const z = tzOf(k.tz), when = k.allDay ? `${dLabel(dIdx(k.date))}: all day, or an evening block from ${fmt(k.after)} Pacific (or ${dLabel(dIdx(k.date) + 1)} from 12 AM to ${fmt(k.morning)}), or a note on the Networking Dinner event`
    : `${dLabel(dIdx(k.date))}, ${range(k.start, k.end)} ${z.short}${z.id === CAL_TZ ? "" : ` (${zText(z, k.abs.s)}; ${range(k.pt.start, k.pt.end)} Pacific)`}`;
  const loc = `location: ${k.loc.any ? k.loc.say + (k.loc.meet ? " as the location, or Add Google Meet" : "") : "departure → destination, e.g. " + k.loc.eg}`;
  return [when, loc, `color ${catText(k.cat)}${k.alt ? ", or " + k.alt.map(c => CATS[c].legend).join(" / ") + " accepted" : ""}`,
    k.guests.length ? "guests: " + k.guests.map(who).join(", ") : "no guests",
    k.remind.length || k.travel ? "reminders: " + k.remind.map(remText).concat(k.travel ? [`its own travel reminder (${leadText(TRAVEL_MIN)} to ${leadText(TRAVEL_MAX)} before)`] : []).join(", ") : "",
    k.notes.length ? "notes: " + k.notes.map(n => n.say).join("; ") : ""].filter(Boolean).join(" · ");
}

/* ---------- the trainee's events, checked before they're used ---------- */
const str = (v, n) => String(v == null ? "" : v).slice(0, n);
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/i;
function cleanAct(events){
  const seen = {};
  return (Array.isArray(events) ? events : []).filter(x => x && typeof x === "object" && typeof x.id === "string" && !seen[x.id] && (seen[x.id] = 1)
      && dIdx(x.date) >= -1 && dIdx(x.date) <= NDAYS
      && (x.allDay || (Number.isInteger(x.start) && x.start >= 0 && x.start % STEP === 0 && Number.isInteger(x.dur) && x.dur >= STEP && x.dur % STEP === 0 && x.start + x.dur <= 1440)))
    .map(x => {
      const guests = [...new Set((Array.isArray(x.guests) ? x.guests : []).map(g => String(g).trim().toLowerCase()).filter(g => g.length <= 100 && EMAIL.test(g)))].slice(0, 10);
      const reminders = (Array.isArray(x.reminders) ? x.reminders : []).filter(r => r && (r.type === "email" || r.type === "notification") && REM_UNITS[r.unit] && Number.isInteger(r.n) && r.n >= 0 && r.n * REM_UNITS[r.unit] <= 40320)
        .slice(0, 5).map(r => ({type:r.type, n:r.n, unit:r.unit}));
      return {id:x.id.slice(0, 24), title:str(x.title, 100), date:x.date, allDay:!!x.allDay, span:x.allDay ? Math.max(1, Math.min(7, Number.isInteger(x.span) ? x.span : 1)) : 1,
        start:x.allDay ? 0 : x.start, dur:x.allDay ? 1440 : x.dur, tz:tzOf(x.tz) ? tzOf(x.tz).id : CAL_TZ, loc:str(x.loc, 200), guests, desc:str(x.desc, 600),
        meet:!!x.meet, color:colorOf(x.color) ? x.color : "", reminders};
    })
    // only what the calendar shows (Pacific July 6 to 19): nothing is kept that couldn't be seen, edited or deleted
    .filter(x => { const d = pacOf(x).day; return d >= 0 && d <= NDAYS - 1; })
    .slice(0, MAXEV);
}
// Whether an event can go on the calendar as entered (the editor, a drag, the keyboard): "" or what is wrong.
function valid(x){
  if(x.allDay){ const d = dIdx(x.date); return d >= 0 && d <= NDAYS - 1 ? "" : "Pick a date on the calendar (July 6 to 19)."; }
  const z = tzOf(x.tz) || TZS[0];
  if(x.start < 0 || x.start + x.dur > 1440) return `It has to end by midnight in its own time zone (${z.word} Time). For an overnight stay, use All day.`;
  const p = pacOf(x);
  if(p.day < 0 || p.day > NDAYS - 1) return `On the attorney’s Pacific calendar that is ${dLabel(p.day)}, ${fmt(p.start)}: outside the calendar’s dates (July 6 to 19). Check the date and the time zone.`;
  if(p.end > 1440) return `On the attorney’s Pacific calendar it runs past midnight (${dLabel(p.day)}, from ${fmt(p.start)}). End it by midnight Pacific; for an overnight stay, use All day.`;
  return "";
}
const timed = x => !x.allDay;
const clash = (a, b) => timed(a) && timed(b) && a.id !== b.id && (p => p.a.s < p.b.e && p.b.s < p.a.e)({a:evAbs(a), b:evAbs(b)});
const whenOf = x => { const p = pacOf(x); return p.allDay ? `${dLabel(p.day)}${p.span > 1 ? " – " + dLabel(p.day + p.span - 1) : ""}, all day` : `${dLabel(p.day)}, ${range(p.start, p.end)}`; };
// The event's own zone, when it isn't Pacific: "Mountain 3 PM – 4 PM (MDT)".
const zoneText = x => { if(x.allDay || x.tz === CAL_TZ) return ""; const z = tzOf(x.tz) || TZS[0]; return `${z.word} ${range(x.start, x.start + x.dur)} (${abbr(z, evAbs(x).s)})`; };
const stayOf = (K, m) => { const k = K.find(k => k.kind === "overnight"); return k && m[k.id] ? m[k.id].id : null; };
// The grid's warnings: overlapping events (not the overnight stay), events off the activity's dates.
function flagsAct(scn, events){
  events = cleanAct(events); const K = (scn && scn.key) || KEY, stay = stayOf(K, matchAct(K, events)), out = {};
  events.forEach(x => { const why = [], hit = x.id !== stay && events.find(o => o.id !== stay && clash(x, o)); if(hit) why.push(`Overlaps “${hit.title || "(no title)"}”`);
    const p = pacOf(x); if(p.day < 0 || p.day > LAST) why.push("Outside the activity’s dates (July 6 to 15)");
    if(!p.allDay && p.end > 1440) why.push("Runs past midnight on the attorney’s calendar");
    if(why.length) out[x.id] = why; });
  return out;
}

/* ---------- the automated review ---------- */
const normText = v => " " + String(v || "").toLowerCase().replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, " ").trim() + " ";
// a word or phrase in normalized text: short words exactly, longer ones also as the start of a word (consult → consultation)
const RES = new Map();
function has(text, phrase){
  let re = RES.get(phrase);
  if(re === undefined){ const ws = normText(phrase).trim().split(" ").filter(Boolean);
    re = ws.length ? new RegExp("\\s" + ws.map(w => w.length <= 3 ? w + "(?=\\s)" : w + "[a-z0-9]*").join("\\s+") + "(?=\\s)") : null; RES.set(phrase, re); }
  return !!re && re.test(text);
}
const titleFit = (k, title) => { const h = normText(title); return k.keys.filter(g => g.some(w => has(h, w))).length / k.keys.length; };
function overnightAt(k, x){
  const kd = dIdx(k.date);
  if(x.allDay){ const d = dIdx(x.date); return d <= kd && d + (x.span || 1) > kd; }
  const p = pacOf(x);
  return (p.day === kd && p.start >= k.after) || (p.day === kd + 1 && p.start === 0 && p.end <= k.morning);
}
// How close an event's time is to an expected one: 1 = the expected window; less further away (within 4 hours, the same day); the
// item's clock time typed in the wrong zone counts as close, so it's matched and the feedback can say so.
function timeFit(k, x){
  if(k.allDay) return overnightAt(k, x) ? (x.allDay ? 1 : 0.9 + Math.min(0.09, x.dur / 9000)) : 0;
  if(x.allDay) return 0;
  const a = evAbs(x), b = k.abs;
  if(a.s === b.s && a.e === b.e) return 1;
  const iou = Math.max(0, Math.min(a.e, b.e) - Math.max(a.s, b.s)) / (Math.max(a.e, b.e) - Math.min(a.s, b.s));
  const gap = Math.abs(a.s - b.s), near = gap <= 240 ? (1 - gap / 240) * 0.8 : 0, slip = x.date === k.date && x.start === k.start ? 0.7 : 0;
  return Math.max(iou, near, slip);
}
// Each expected event takes the best-fitting event not already taken (title first, then time).
function matchAct(K, events){
  const pairs = [];
  K.forEach(k => events.forEach(x => { const tf = titleFit(k, x.title), tm = timeFit(k, x);
    if(tf >= 0.75 || (tf >= 0.5 && tm > 0) || (tf > 0 && tm >= 0.99)){ const sc = 0.6 * tf + 0.4 * tm; if(sc >= 0.3) pairs.push({k, x, sc}); } }));
  pairs.sort((p, q) => q.sc - p.sc);
  const out = {}, used = {};
  pairs.forEach(p => { if(!out[p.k.id] && !used[p.x.id]){ out[p.k.id] = p.x; used[p.x.id] = 1; } });
  return out;
}
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
function splitTravel(raw){
  raw = String(raw || "");
  for(const re of [/\s*(?:→|➔|➝|⟶|➡|->|=>|—>|–>|>)\s*/, /\s+to\s+/i, /\s+[-–—]\s+/]){
    const i = raw.search(re); if(i < 0) continue;
    const m = raw.slice(i).match(re)[0], from = raw.slice(0, i).trim(), to = raw.slice(i + m.length).trim();
    if(from && to) return {from, to};
  }
  return null;
}
function checksAct(K, k, x, m){
  const out = [], add = (key, ok, label, why, info) => out.push({key, w:CHECK_W[key], ok:!!ok, label, why:ok ? "" : why, info:info || ""});
  const z = tzOf(k.tz), ex = tzOf(x.tz), on = o => [x].concat((o.orOn || []).map(id => m[id]).filter(Boolean));
  // 1. the time (an absolute instant: the item's own zone or Pacific both count)
  if(k.allDay){
    add("time", overnightAt(k, x), "Date and time", `Put the overnight stay on ${dLabel(dIdx(k.date))}: an All day event (best), or an evening block after the dinner (from ${fmt(k.after)}), or add it to the Networking Dinner event’s notes.`);
  }else if(x.allDay){
    add("time", false, "Date and time", `It’s an all-day event: give it its time, ${dLabel(dIdx(k.date))} ${range(k.start, k.end)} ${z.short}.`);
  }else{
    const a = evAbs(x), ok = a.s === k.abs.s && a.e === k.abs.e, slip = x.date === k.date && x.start === k.start && x.dur === k.end - k.start && x.tz !== k.tzId;
    const want = `${dLabel(dIdx(k.date))}, ${range(k.start, k.end)} ${z.short}` + (z.id === CAL_TZ ? "" : ` (${zText(z, k.abs.s)}), which is ${range(k.pt.start, k.pt.end)} on the attorney’s Pacific calendar`);
    add("time", ok, "Date and time", slip ? `You entered ${range(x.start, x.start + x.dur)} with the event in ${ex.word} Time, but the item is ${range(k.start, k.end)} ${z.short} (${z.word}). Set the event’s time zone to ${z.word} Time, or enter ${range(k.pt.start, k.pt.end)} Pacific.`
      : `On the calendar: ${whenOf(x)} Pacific. This item is ${want}.`);
    // 2. the time zone: the item's own zone or the calendar's (Pacific)
    const tzOk = (x.tz === k.tzId || x.tz === CAL_TZ) && !(slip && x.tz === CAL_TZ);
    add("tz", tzOk, "Time zone", slip ? `The item’s time is ${z.short} (${z.word}); the event is in ${ex.word} Time.`
      : `The event is set to ${ex.name}. Use the item’s own zone (${z.word} Time, ${z.short}) or the attorney’s Pacific Time.`);
  }
  // 3. the color
  const col = colorOf(x.color), main = CATS[k.cat].colors, alts = (k.alt || []).flatMap(c => CATS[c].colors);
  add("color", main.includes(x.color) || alts.includes(x.color), "Color", `${col ? col.name : "No color (the calendar’s default)"}: this one is ${catText(k.cat)}${k.alt ? `; ${k.alt.map(c => catText(c)).join(" or ")} is also accepted` : ""}.`
      + (x.color === "lavender" ? " Lavender isn’t one of the legend’s colors: Purple is Grape, Blue is Peacock." : ""),
    alts.includes(x.color) && !main.includes(x.color) ? k.altWhy : "");
  // 4. the location
  const L = normText(x.loc);
  if(k.loc.any){
    add("loc", k.loc.any.some(w => has(L, w)) || (k.loc.meet && x.meet), "Location", (x.loc ? `The location reads “${x.loc}”: it should be ` : "Add the location: ") + k.loc.say + (k.loc.meet ? " (or Add Google Meet)" : "") + ".");
  }else{
    const sp = splitTravel(x.loc), f = sp && normText(sp.from), d = sp && normText(sp.to);
    const ok = sp && (!k.loc.from.length || k.loc.from.some(w => has(f, w))) && (!k.loc.to.length || k.loc.to.some(w => has(d, w)));
    add("loc", ok, "Location (departure → destination)", !sp ? `${x.loc ? `“${x.loc}” names one place. ` : ""}A travel block’s location names where the attorney leaves from AND where they go, e.g. “${k.loc.eg}”.`
      : `“${x.loc}” doesn’t read as this trip: it goes like “${k.loc.eg}”.`);
  }
  // 5. the guests (exactly the item's)
  const miss = k.guests.filter(g => !x.guests.includes(g)), extra = x.guests.filter(g => !k.guests.includes(g));
  add("guests", sameSet(x.guests, k.guests), "Guests", [miss.length ? "Add " + miss.map(g => `${who(g)} (${g})`).join(", ") + "." : "", extra.length ? (k.guests.length ? "Remove " : "This one has no guests: remove ") + extra.join(", ") + "." : ""].filter(Boolean).join(" "));
  // 6. the reminders: the item's own, and a travel block's own travel reminder (apart from any item reminder it carries)
  if(k.remind.length || k.travel){
    const lack = k.remind.filter(r => !on(r).some(o => o.reminders.some(q => q.type === r.type && remMin(q) === r.min)));
    let tr = true, trs = [];
    if(k.travel){
      const left = x.reminders.slice();
      k.remind.concat(K.flatMap(o => o.remind.filter(r => (r.orOn || []).includes(k.id)))).forEach(r => { const i = left.findIndex(q => q.type === r.type && remMin(q) === r.min); if(i >= 0) left.splice(i, 1); });
      trs = left.filter(q => remMin(q) >= TRAVEL_MIN && remMin(q) <= TRAVEL_MAX); tr = trs.length > 0;
    }
    add("remind", !lack.length && tr, "Reminders", [lack.length ? "Add: " + lack.map(remText).join(", ") + "." : "",
      tr ? "" : `Set this travel block its own reminder, apart from the item’s: a practical lead time from ${leadText(TRAVEL_MIN)} to ${leadText(TRAVEL_MAX)} before (e.g. 1 hour), so the attorney can prepare and leave without rushing. Your trainer confirms the attorney’s preference.`].filter(Boolean).join(" "),
      k.travel && tr ? `Travel reminder: ${trs.map(remText).join(", ")}. Your trainer confirms the attorney’s preferred lead time.` : "");
  }
  // 7. the notes
  if(k.notes.length){
    const lack = k.notes.filter(n => !on(n).some(o => n.any.some(w => has(normText(o.title + " " + o.desc + (n.loc ? " " + o.loc : "")), w))));
    const empty = on(k.notes[0]).every(o => !String(o.desc).trim());
    add("notes", !lack.length && !empty, "Notes", empty ? "Add notes (the description) with the item’s details: " + k.notes.map(n => n.say).join("; ") + "." : "Add to the notes: " + lack.map(n => n.say).join("; ") + ".");
  }
  return out;
}
function reviewAct(scn, events){
  events = cleanAct(events);
  const K = (scn && scn.key) || KEY, m = matchAct(K, events), taken = {}; Object.values(m).forEach(x => { taken[x.id] = 1; });
  const items = K.map(k => {
    let x = m[k.id], via = "", cs;
    if(!x && k.noteOn && m[k.noteOn] && /overnight|hotel/i.test(m[k.noteOn].desc)){ x = m[k.noteOn]; via = "note"; }
    if(!x) cs = [{key:"found", w:1, ok:false, label:"On the calendar", why:`Not found. Add “${k.title}”: ${noteOf(k).split(" · ")[0]}.`, info:""}];
    else if(via) cs = checksAct(K, k, x, m).filter(c => c.key === "notes").concat([{key:"found", w:0, ok:true, label:"On the calendar", why:"", info:`Covered by a note on “${x.title}”.`}]);
    else cs = checksAct(K, k, x, m);
    const tw = cs.reduce((n, c) => n + c.w, 0), pw = cs.filter(c => c.ok).reduce((n, c) => n + c.w, 0);
    // an event at the wrong time earns at most TIME_GATE of its points: the attorney would be in the wrong place
    const late = cs.some(c => c.key === "time" && !c.ok), pts = x ? Math.round(k.weight * pw / (tw || 1) * (late ? TIME_GATE : 1) * 10) / 10 : 0;
    return {id:k.id, title:k.title, weight:k.weight, pts, perfect:!!x && cs.every(c => c.ok), found:!!x, via, event:x || null, checks:cs,
      info:(x && k.info ? [k.info] : []).concat(cs.map(c => c.info).filter(Boolean))};
  });
  // the whole calendar
  const stay = stayOf(K, m), missing = items.filter(i => !i.found);
  const rest = events.filter(x => !taken[x.id]), dupes = [], extras = [];
  rest.forEach(x => { const k = K.find(k => m[k.id] && titleFit(k, x.title) >= 0.75 && (normText(m[k.id].title) === normText(x.title) || (!k.allDay && clash(x, m[k.id]))));
    (k ? dupes : extras).push({x, k}); });
  // overlaps: not the overnight stay (a night away overlaps whatever the evening holds), and a duplicate isn't counted twice
  const twin = new Set(dupes.map(d => d.x.id + "|" + m[d.k.id].id)), pairs = [];
  events.forEach((a, i) => events.slice(i + 1).forEach(b => { if(a.id !== stay && b.id !== stay && clash(a, b) && !twin.has(a.id + "|" + b.id) && !twin.has(b.id + "|" + a.id)) pairs.push([a, b]); }));
  const cal = [
    {key:"overlap", w:CAL_W.overlap, ok:!pairs.length, label:"No overlapping events", why:pairs.slice(0, 6).map(([a, b]) => `“${a.title}” (${whenOf(a)}) overlaps “${b.title}” (${whenOf(b)}).`).join(" "), info:""},
    {key:"complete", w:CAL_W.complete, ok:!missing.length, label:"Every item and travel block is on the calendar", why:"Missing: " + missing.map(i => i.title).join(", ") + ".", info:""},
    {key:"dupes", w:CAL_W.dupes, ok:!dupes.length, label:"No duplicate events", why:dupes.map(d => `“${d.x.title}” (${whenOf(d.x)}) repeats “${m[d.k.id].title}”: keep one event per appointment.`).join(" "), info:""}
  ].map(c => Object.assign(c, {why:c.ok ? "" : c.why}));
  const cw = cal.filter(c => c.ok).reduce((n, c) => n + c.w, 0), cmax = CAL_W.overlap + CAL_W.complete + CAL_W.dupes;
  items.push({id:"calendar", title:"Whole calendar: no overlaps, nothing missing, no duplicates", weight:cmax, pts:cw, perfect:cal.every(c => c.ok), found:true, via:"", event:null, checks:cal, info:[]});
  // out of 100 (the events' weights and the calendar's); 100% only when every check passes (a small miss still shows as 99%)
  const got = items.reduce((n, i) => n + i.pts, 0), max = items.reduce((n, i) => n + i.weight, 0), allOk = items.every(i => i.perfect);
  const pct = allOk ? 100 : Math.min(99, Math.round(got / (max || 1) * 100));
  const fl = flagsAct(scn, events);
  return {kind:"activity", score:Math.round(got), max, pct, passed:pct >= PASS, items, done:items.filter(i => i.perfect).length,
    extras:dupes.map(d => ({title:d.x.title, when:whenOf(d.x), why:[`A duplicate of “${m[d.k.id].title}”`].concat(fl[d.x.id] || [])}))
      .concat(extras.map(d => ({title:d.x.title, when:whenOf(d.x), why:fl[d.x.id] || [], info:"Not matched to an item or travel block. If it is one, name it after the item (e.g. “Doctor’s Appointment”); if not, your trainer will look at it."})))};
}

/* ---------- the scenario: the activity's own words (verbatim), its legend, the guest directory and the ten items ---------- */
TRACKS.push({id:"activity", icon:"🗓", title:"Attorney Calendar Management Activity", where:"Day 5 · Calendar Management",
  blurb:"The attorney’s own Google Calendar (Seattle, Pacific Time), July 6–15, 2026: put every item and travel block on it with its time zone, color, location, guests, reminders and notes."});
SCENARIOS.push({id:"attorney-activity", track:"activity", kind:"activity", short:"Attorney Calendar Activity", title:"Attorney Calendar Management Activity", level:"Day 5", gap:0, fixed:[],
  brief:"Plot the ten activity items, and each item’s travel blocks, on the attorney’s Google Calendar (Pacific Time), with every detail the item gives. Run the automated review, fix what it marks, then submit to your trainer.",
  intro:"Please answer the Attorney Calendar Management Activity. Make sure to follow the instructions carefully, and don’t forget to signify done here as soon as you finish. Thanks.",
  standIn:"Here, this calendar stands in for your work Google Calendar (instruction 3), and 📤 Submit to my trainer is how you signify done.",
  instructions:[
    {t:"Manage the calendar of an attorney by reviewing and scheduling the provided appointments."},
    {t:"Review the given appointment details carefully."},
    {t:"Use your work Google Calendar for this, treating it as your attorney’s official calendar to plot all appointments."},
    {t:"Apply time-blocking and color-coding for clarity:", sub:["Green – Client Meetings", "Blue – Internal Meetings", "Red – Court-Related Tasks", "Purple – External Events", "Yellow – Internal Tasks", "Orange – Personal Wellness", "Pink – Personal Events"]},
    {t:"Add reminders with appropriate notes for each appointment to ensure all details are covered"},
    {t:"For travel blocks reminders, set a practical or reasonable reminder time for your attorney that ensures they have sufficient notice to prepare and depart without rushing, allowing enough buffer to account for traffic, last-minute preparations, and the required early arrival time at the airport or point of departure. (Need to ask Mitch’s preferences)"},
    {t:"Review the calendar to ensure there are no conflicts, such as overlapping appointments or insufficient time buffers between events."},
    {t:"For the location, if it does not provide the exact address, just manually input the location indicated in the activity item. For Travel Blocks, ensure the location is specific, including both the departure point and the destination.", sub:["e.g., John F. Kennedy International Airport → LAX"]},
    {t:"Add Guests’ email addresses (if applicable):", sub:["Martin Anthony - martin@legalsupporthelp.com", "Michelle Velarde - michelle.velarde@legalsupporthelp.com", "John Michael Dela Cruz - john.delacruz@legalsupporthelp.com", "Lei Lee Abut - team-litigation@legalsupporthelp.com"]}
  ],
  cats:CATS, people:PEOPLE,
  items:[
    {n:1, title:"Client Meeting", date:"2026-07-06", lines:[["Date", "July 06, 2026"], ["Time", "10:00 AM – 11:00 AM PST"], ["Location", "Conference Room B"],
      ["Details", "Client consultation for Alyssa Lynn Arehart regarding a car accident case. Set a reminder for 15 minutes before the meeting (notification). Ensure all case documents are accessible during the meeting."], ["Guests", "Martin Anthony & Michelle Velarde"]]},
    {n:2, title:"Team Meeting", date:"2026-07-07", lines:[["Date", "July 07, 2026"], ["Time", "3:00 PM – 4:00 PM MST"], ["Location", "Google Meet"],
      ["Details", "Weekly team check-in. Set a reminder for 30 minutes before the meeting (email)."], ["Guests", "Martin Anthony, Michelle Velarde, John Michael Dela Cruz, and Lei Lee Abut"]]},
    {n:3, title:"Deposition Meeting", date:"2026-07-08", lines:[["Date", "July 08, 2026"], ["Time", "11:00 AM – 1:00 PM EST"], ["Location", "Attorney’s Office (or Zoom for remote attendees: zoom.us/deposition-meeting-02-04-25)"],
      ["Details", "Deposition preparation with another attorney. Set a reminder 1 day before (email)."], ["Guests", "Martin Anthony & Michelle Velarde"]]},
    {n:4, title:"Gym Session", date:"2026-07-08", lines:[["Date", "July 08, 2026"], ["Time", "6:30 AM – 7:30 AM EST"], ["Location", "Downtown Seattle Fitness Center"],
      ["Details", "Morning workout. Set a 10-minute reminder before (notification)."]]},
    {n:5, title:"Doctor’s Appointment", date:"2026-07-09", lines:[["Date", "July 09, 2026"], ["Time", "9:00 AM – 10:00 AM PST"], ["Location", "Central Medical Clinic"],
      ["Details", "Routine check-up. Set a 1-day reminder to prepare any necessary documents or insurance details (email)."]]},
    {n:6, title:"Court Appearance", date:"2026-07-10", lines:[["Date", "July 10, 2026"], ["Time", "9:00 AM – 12:00 PM PST"], ["Location", "Washington County Court"],
      ["Details", "Attorney has a scheduled court hearing. Set a reminder for 30 minutes before the hearing (notification)."], ["Travel Blocks", ["- 8:00 AM – 9:00 AM for travel to court.", "- 12:00 PM – 1:00 PM for return travel."]]]},
    {n:7, title:"Recorded Statement Meeting", date:"2026-07-10", lines:[["Date", "July 10, 2026"], ["Time", "4:00 PM – 5:00 PM CST"], ["Location", "Google Meet"],
      ["Details", "Recorded statement meeting with an insurance adjuster regarding a premises liability case. Set a reminder 15 minutes before (notification)."], ["Guests", "Martin Anthony, Michelle Velarde, John Michael Dela Cruz, and Lei Lee Abut"]]},
    {n:8, title:"Networking Dinner Event", date:"2026-07-13", lines:[["Date", "July 13, 2026"], ["Time", "6:00 PM – 8:00 PM PST"], ["Location", "The Ritz-Carlton, San Francisco (600 Stockton St, San Francisco, CA 94108)"],
      ["Details", "Attorney attending a networking dinner with potential clients."],
      ["Travel Schedule for the Out-of-State Event", ["➢ Travel to San Francisco:", "▪ Date: July 13, 2026", "▪ Time:", "- 8:30 AM – 9:00 AM: Transportation to Seattle Airport (SEA).", "- 9:00 AM – 12:00 PM: Flight from Seattle (SEA) to San Francisco (SFO).",
        "▪ Note: Confirm flight details, check in luggage, bring travel documents, bring business cards ,and prepare attire for the event. Set a 1-day reminder before (email).",
        "➢ Networking Event:", "▪ Time:", "- 6:00 PM – 8:00 PM: Attend the event.", "- Arrival: Block 5:45 PM – 6:00 PM for early arrival.", "▪ Note: Bring business cards and prepare a short personal introduction. Set a 30-minute reminder before (notification).",
        "➢ Overnight Stay:", "▪ Details: Attorney will stay overnight in San Francisco.", "▪ Preparation: Confirm hotel booking and plan transportation after the event.",
        "➢ Return Travel to Seattle:", "▪ Date: July 14, 2026", "▪ Time:", "- 8:00 AM – 8:30 AM: Check out of the hotel and travel to the airport.", "- 10:00 AM – 1:00 PM: Flight from San Francisco (SFO) to Seattle (SEA).",
        "▪ Reminder: 1 day before (email): Confirm hotel check-out and transportation to the airport."]]]},
    {n:9, title:"Document Review Session", date:"2026-07-15", lines:[["Date", "July 15, 2026"], ["Time", "1:30 PM – 3:00 PM CST"], ["Location", "Attorney’s Office"],
      ["Details", "Allocate time for the attorney to review a high-priority case file. Set a 30-minute reminder before (notification)."]]},
    {n:10, title:"Family Dinner", date:"2026-07-15", lines:[["Date", "July 15, 2026"], ["Time", "7:00 PM – 9:00 PM MST"], ["Location", "Home"],
      ["Details", "Dinner with family."], ["Reminder", "1 hour before (notification): Pick up groceries on the way home."]]}
  ],
  key:KEY,
  // one "task" per expected event (and the whole calendar), so the per-task feedback, comments and live review work as for a week
  tasks:KEY.map(k => ({id:k.id, title:k.title, note:noteOf(k), weight:k.weight, item:k.item})).concat([{id:"calendar", title:"Whole calendar: no overlaps, nothing missing, no duplicates", note:"No two timed events overlap (the overnight stay aside); every item and travel block is on the calendar; no appointment is entered twice.", weight:CAL_W.overlap + CAL_W.complete + CAL_W.dupes}])
});

return {TZS, CAL_TZ, FROM, PEOPLE, CATS, KEY, REM_UNITS, TRAVEL_MIN, TRAVEL_MAX, CHECK_W, CAL_W, TIME_GATE, NDAYS, LAST, MAXEV, tzOf, tzLabel, abbr, offAt, dIdx, dIso, dLabel, fmtE, range,
  absAt, fromAbs, evAbs, pacOf, fromPac, who, remMin, remText, leadText, catText, noteOf, normText, has, titleFit, timeFit, splitTravel, whenOf, zoneText, valid, prep,
  clean:cleanAct, flags:flagsAct, match:(scn, events) => matchAct((scn && scn.key) || KEY, cleanAct(events)), review:reviewAct};
})();
const cleanFor = (scn, events) => isAct(scn) ? act.clean(events) : clean(events);

const api = {DAYS, OPEN, CLOSE, STEP, MAXEV, PASS, TRACKS, SCENARIOS, COLORS, COLOR_RULE, COLOR_RULE_TEXT, colorOf, colorFor, trackOf, fmt, overlap, endOf, all, flags, clean, match, review, isAct, cleanFor, act};
if(typeof module !== "undefined" && module.exports) module.exports = api; else root.FTCalCore = api;
})(typeof window !== "undefined" ? window : globalThis);
