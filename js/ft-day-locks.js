/* ============================================================
   🔓 Every day in Day 1's order, one step at a time, each opened by the trainer (Days 2–16)
   Loaded after js/ft-day1-flow.js, which does the same for Day 1. Each day's Activity deck is its steps, in the order the
   day runs (the order of its card: the opening task, 💬 the Classroom Discussion and 🎬 Handouts / Video on a lesson's
   first day, the day's activities, ✍️ Process Questions, the homework). As on Day 1, a step is a row of the day's card,
   named as the card names it, and holds that row's slides (js/ft-day-decks.js stamps each slide with its row): the day
   card itself is read with the first row, and the ✅ End of Module divider with the last.
   settings:daysteps = {
     all:     {"<day>": n},                       the last step unlocked on each day, for every batch (0: the day is locked)
     batches: {"<batch key>": {"<day>": n}},      the same, for one batch (the higher of the two counts)
     rows:    {all: {"<day>": 1}, batches: {"<batch key>": {"<day>": 1}}}
                                                  which of those counts are card-row steps; one without it was saved when a
                                                  step was a slide of the deck, and is read through LEGACY below (and
                                                  rewritten in card-row steps the next time the trainer saves)
     sched:   {all: {"<day>": {am, pm, out}}, batches: {"<batch key>": {"<day>": {am, pm, out}}}}
                                                  ⏰ the day's time blocks, as instants (ISO): when the AM session, the PM
                                                  breakout or the outside-hours block starts, its steps unlock by themselves
     times:   {am: "08:00", pm: "13:00", out: "17:00"}   the blocks' start times the trainer schedules a day with
   }
   read with the open lessons (js/ft-updates.js ftLoadOpenDays, the same request). The trainer unlocks in
   Admin → 📅 Open Lessons → 🔓 Activity Locks: step by step, a whole time block (🌅 AM session, 🌇 PM breakout, 🏠 outside
   hours / idle time), the whole day, or on a schedule. Until a step is unlocked, for a trainee:
     • its slide shows a lock instead (and Next, the dots and the 🗺 Map don't go there); the deck goes in order, one
       slide at a time, as Day 1's does;
     • the lesson deck (💬 Classroom Discussion), its video (🎬 Handouts / Video) and its Knowledge Check (✍️ Process
       Questions) wait for their step;
     • the platform tools a step opens (🎧 Call Listening, 🧰 the LOR Drafting Activity, the Transcription Activity) wait
       for it, and the 🛠 Practice Lab's sessions, simulators and trainer activities wait until one of their days is opened.
   📚 Dashboard's lesson cards carry one segment per part of the lesson (Start for a one-part lesson, else Part 1, Part 2 …:
   a day each, or the Training Guide's own split, PARTS below), each opening its day's deck: 🔒 until the trainer opens
   the day, ✓ once the trainee has been through it.
   Only a trainee is held to it: an admin and the 👁 trainee view are not, and a day the trainee has finished (read to its
   last slide) stays open to review.
   🧑‍🏫 The trainer's deck is the trainee's deck, slide for slide, never held by the locks; what it adds is each segment's
   lock (a segment: a topic or activity, a step of the day; Day 1's are its own steps, js/ft-day1-flow.js), for the batch
   picked: the slide's 🔒 / 🔓 chip, the dots of the segments still locked, and 🔓 Segment lock in the side panel, where
   the trainer unlocks or locks the segment right there, as the pace of the training and the trainees' task completion
   call for (TRAINER below). 📚 Dashboard's segments show the trainer the same 🔒 the batch's trainees see.
   ============================================================ */
(function(){
const root = window;
const KEY = "settings:daysteps";
const ALL = 999;   // "the whole day": more steps than any day has
const SLOTS = [["am", "🌅", "AM session"], ["pm", "🌇", "PM breakout"], ["out", "🏠", "Outside hours / idle time"]];
const RANK = {am: 1, pm: 2, out: 3};
const DEF_TIMES = {am: "08:00", pm: "13:00", out: "17:00"};
const FIRST = 2, LAST = () => Math.min(16, (root.FTDays && FTDays.COUNT) || 16);
const key = b => typeof ftBatchKey === "function" ? ftBatchKey(b) : String(b || "").trim().toLowerCase();
const isTrainee = () => !!state.traineeId && !state.isAdmin && !state.adminPreview;
const esc_ = v => esc(String(v == null ? "" : v));
const decksIn = () => !!root.FT_DAY_DECKS;
const loadDecks = () => root.FTDayDecks && FTDayDecks.load ? Promise.resolve(FTDayDecks.load()) : Promise.resolve(null);
const lessonOf = n => { const l = root.FTDayDecks && FTDayDecks.lessonOfDay ? FTDayDecks.lessonOfDay(n) : null; return l == null ? null : Number(l); };
const lessonOpen = l => { try{ return typeof dayUnlocked === "function" ? !!dayUnlocked(Number(l)) : true; }catch(err){ return true; } };
const doneDays = () => { try{ return root.FTDecksDone ? FTDecksDone() : []; }catch(err){ return []; } };

/* ---------- a day's steps ---------- */
const clean = h => String(h || "").replace(/^(AM|PM|Entire Day|HOMEWORK|FOR YOUR HOMEWORK)\s*:?\s*/i, "")
  .replace(/\bClassroom Discussion\b/gi, "Classroom Activity").replace(/\s*·\s*Part \d+ of \d+$/i, "").trim();
// the time block a slide is in: its own heading's (AM, PM, entire day, homework), else the block of the slide before it
function slotOf(s, prev){
  const h = String((s.launch && s.launch.time) || s.h || "");
  if(/homework|outside|idle/i.test(h)) return "out";
  if(/^\s*PM\b/i.test(h)) return "pm";
  if(/^\s*(AM|Entire Day)\b/i.test(h)) return "am";
  return prev || "am";
}
// does slide s continue the step before it (a topic's other parts, the Call Listening log after its slide, the divider)?
const continues = (s, lead) => !!lead && (s.divider || s.id.startsWith(lead.id + "-") || (s.id === "listen" && /call listening/i.test(lead.h || "")));
// (the steps are rebuilt from the deck at most every two seconds per day: a render asks for them many times over)
const memo = {};
const extrasOf = n => { try{ return (((FTDayDecks.extras && FTDayDecks.extras()) || {}).days || {})[n] || []; }catch(err){ return []; } };
// the steps as they were before a step was a card row: a slide of the deck each (and the slides continuing it), the day
// card a step of its own. Day 1 keeps them (its own flow, js/ft-day1-flow.js, is what holds a trainee there).
function slideSteps(n, list){
  const out = []; let lead = null, slot = "am";
  list.forEach((s, i) => {
    if(s.agenda){ out.push({n: out.length + 1, label: "Activity card: today’s activities", slot: "am", from: i, to: i, ids: [s.id]}); return; }
    // 📌 From your trainer counts as a step only once the trainer has added something (a trainer always sees the slide, to add
    // to it; a trainee doesn't), so the trainer's panel and the trainee number the steps alike
    const emptyX = s.trainer && !extrasOf(n).length;
    if(out.length && (emptyX || continues(s, lead))){ const st = out[out.length - 1]; st.to = i; st.ids.push(s.id); return; }
    slot = slotOf(s, slot); lead = s;
    out.push({n: out.length + 1, label: clean(s.launch ? s.launch.t : s.h) || "Activity", slot, from: i, to: i, ids: [s.id],
      go: s.launch ? (s.launch.go || s.launch.run || "") : ""});
  });
  return out;
}
// Days 2–16: a step per row of the day's card, labelled as the card labels the row, holding the slides of that row (in the
// card's order, so each step's slides run on from one another); the day card is read with the first row, the end-of-day
// divider with the last, and a slide no row names (📌 From your trainer before the trainer has added anything) with the
// step before it. Its time block: the row's own time (AM, PM), else its slide's heading, else the block before it.
function rowSteps(n, list){
  const rows = (FTDayDecks.dayRows && FTDayDecks.dayRows(n)) || [];
  if(!rows.length) return slideSteps(n, list);
  const out = rows.map((r, k) => ({n: k + 1, label: FTDayDecks.rowLabel ? FTDayDecks.rowLabel(n, r) : r.t, slot: "", from: -1, to: -1, ids: [], go: r.go || r.run || ""}));
  let cur = 0;
  list.forEach((s, i) => {
    const k = s.row != null && out[s.row] && !(s.trainer && !extrasOf(n).length) && !s.divider ? Math.max(cur, Number(s.row)) : cur;
    const st = out[k]; if(st.from < 0) st.from = i; st.to = i; st.ids.push(s.id); cur = k;
  });
  let slot = "am", last = -1;
  out.forEach((st, k) => {
    const r = rows[k], t = String(r.time || "");
    // (a row with no slide of its own, which a day's card shouldn't have, is never reached: it sits on the step before it)
    if(st.from < 0){ st.from = st.to = Math.max(0, last); }
    last = st.to;
    const first = list.slice(st.from, st.to + 1).find(x => !x.agenda && !x.divider && !x.launch);
    slot = /^\s*AM\b/i.test(t) ? "am" : /^\s*PM\b/i.test(t) ? "pm" : r.k === "homework" ? "out" : first ? slotOf(first, slot) : slot;
    st.slot = slot;
  });
  return out;
}
function steps(n){
  n = Number(n);
  const mk = [decksIn() ? 1 : 0, !!state.isAdmin && !state.adminPreview ? 1 : 0, extrasOf(n).length, Math.floor(Date.now() / 2000)].join("|");
  if(memo[n] && memo[n].mk === mk) return memo[n].steps;
  const list = root.FTDayDecks && FTDayDecks.list ? FTDayDecks.list(n) : [];
  const out = n >= FIRST ? rowSteps(n, list) : slideSteps(n, list);
  memo[n] = {mk, steps: out};
  return out;
}
/* A count saved when a step was a slide of the deck (no rows flag): each of those old steps, as it was (the slide ids it
   held; "@…" a stop that opened the lesson, its video, its Knowledge Check or the LOR tool). It is read as the card-row
   steps that slide ids it had opened cover: the longest run of steps from the first, each with something it had opened
   (a slide cut from one of them counts, s.of), and none a stop it hadn't opened. A whole day stays the whole day. */
const LEGACY = {
  2: ["agenda", "s1", "@lesson", "@ftVideoOrAsk(2)", "s2", "s3", "@FTDayDecks.toKC(2)", "s4"],
  3: ["agenda", "s1", "@lesson", "@ftVideoOrAsk(3)", "listen", "@FTDayDecks.toKC(3)", "s2"],
  4: ["agenda", "@lesson", "@ftVideoOrAsk(4)", "s1", "s2", "s3"],
  5: ["agenda", "s1", "s2", "@lesson", "@ftVideoOrAsk(5)", "s3"],
  6: ["agenda", "s1", "s2"],
  7: ["agenda", "@lesson", "@ftVideoOrAsk(6)", "s1", "listen", "s2", "@FTDayDecks.toKC(6)"],
  8: ["agenda", "s1 s1-2 s1-3 s1-4", "s2", "s3"],
  9: ["agenda", "s1", "s2", "s3"],
  10: ["agenda", "@lesson", "@ftVideoOrAsk(7)", "s1", "s2", "@FTDayDecks.toKC(7)"],
  11: ["agenda", "s1", "@lor", "s2"],
  12: ["agenda", "s1"],
  13: ["agenda", "s1", "s2", "@lesson", "@ftVideoOrAsk(8)", "listen", "s3", "@FTDayDecks.toKC(8)"],
  14: ["agenda", "s1", "s2"],
  15: ["agenda", "s1", "s2"],
  16: ["agenda", "s1", "s2"]
};
const GATED = /^(lesson|lor)$|ftVideoOrAsk|toKC/;   // the stops a step opens (STOPS, TOOL_STOPS below)
function fromLegacy(n, v){
  n = Number(n); v = Number(v) || 0;
  const old = LEGACY[n]; if(!old || v <= 0) return v;
  if(v >= old.length) return ALL;
  if(!decksIn()) return 1;   // (until the decks are in, only "the day has started" is known)
  const had = new Set(old.slice(0, v).join(" ").split(" "));
  const list = root.FTDayDecks && FTDayDecks.list ? FTDayDecks.list(n) : [];
  let k = 0;
  for(const st of steps(n)){
    const own = list.slice(st.from, st.to + 1);
    const opened = own.some(s => s.launch ? had.has("@" + (s.launch.go || s.launch.run || "")) : (had.has(s.id) || (s.of && had.has(s.of))));
    if(!opened || (GATED.test(st.go || "") && !had.has("@" + st.go))) break;
    k = st.n;
  }
  // (a day that had started stays started: its first step, the day card with the card's first row, even where that row is a
  // stop the old count hadn't opened, as Day 4's first step, the lesson, is; a count of 0 would lock the whole day again)
  return Math.max(1, k);
}
// a saved count (all batches: k null), in card-row steps
const isRows = (o, k, n) => !!(k == null ? (((o || {}).rows || {}).all || {})[n] : ((((o || {}).rows || {}).batches || {})[k] || {})[n]);
function stepNum(o, k, n){
  const raw = k == null ? ((o || {}).all || {})[n] : (((o || {}).batches || {})[k] || {})[n];
  return isRows(o, k, n) ? Number(raw) || 0 : fromLegacy(n, raw);
}
// every count of a settings:daysteps record in card-row steps, each flagged so (the trainer's next save, the buffer's release)
// (asRows: the counts not flagged yet were just written as card-row steps, so they are only flagged)
function migrate(o, asRows){
  o = o || {}; o.all = o.all || {}; o.batches = o.batches || {};
  const rows = o.rows = {all: Object.assign({}, (o.rows || {}).all || {}), batches: JSON.parse(JSON.stringify((o.rows || {}).batches || {}))};
  Object.keys(o.all).forEach(n => { if(!rows.all[n]){ if(!asRows) o.all[n] = stepNum(o, null, n); rows.all[n] = 1; } });
  Object.keys(o.batches).forEach(b => { const x = o.batches[b] || {}; rows.batches[b] = rows.batches[b] || {};
    Object.keys(x).forEach(n => { if(!rows.batches[b][n]){ if(!asRows) x[n] = stepNum(o, b, n); rows.batches[b][n] = 1; } }); });
  return o;
}
const stepAt = (n, i) => { const st = steps(n); const x = st.find(s => i >= s.from && i <= s.to); return x ? x.n : (st.length ? st[st.length - 1].n : 1); };
// the step a slide or a launch belongs to: by the slide's id, or by what it launches
const stepWith = (n, test) => { const x = steps(n).find(test); return x ? x.n : 0; };

/* ---------- what the trainer has unlocked ---------- */
const S = () => state.ftDaySteps || {all: {}, batches: {}, sched: {all: {}, batches: {}}, times: {}};
// a batch's own setting, once the trainer has made one, stands in for the all-batches one: so a batch can be locked below
// the rest, or taken off a schedule they share (null: "none for this batch")
const own = (o, k, n) => Object.prototype.hasOwnProperty.call(o || {}, k) && Object.prototype.hasOwnProperty.call(o[k] || {}, n);
function manual(n, batch){
  const o = S(), k = key(batch);
  return own(o.batches, k, n) ? stepNum(o, k, n) : stepNum(o, null, n);
}
function schedFor(n, batch){
  const s = S().sched || {}, k = key(batch);
  return (own(s.batches, k, n) ? s.batches[k][n] : (s.all || {})[n]) || null;
}
// the latest time block that has started, by the trainer's schedule (0: none yet)
function rankNow(sc){
  if(!sc) return 0; const now = Date.now(); let r = 0;
  SLOTS.forEach(([k], i) => { const t = Date.parse(sc[k] || ""); if(isFinite(t) && t <= now) r = i + 1; });
  return r;
}
// a schedule's steps: every step up to the last one in a block that has started
function bySchedule(n, batch){
  const r = rankNow(schedFor(n, batch)); if(!r) return 0;
  if(Number(n) === 1) return [0, 6, 7, 8][r];   // Day 1's steps (js/ft-day1-flow.js): up to Process Questions in the AM, Installation of SA in the PM, Finish after hours
  if(!decksIn()){ loadDecks(); return 1; }
  let k = 0; steps(n).forEach(s => { if(RANK[s.slot] <= r) k = s.n; });
  return k;
}
/* ▶ a lesson's first day starts with its first segment open (Day 3: the lesson, 3.2), the rest 🔒 until the trainer
   unlocks each next segment; until the trainer sets the day (for the batch or all batches; 🔒 Lock the day locks it
   all). Its later days (Intake's Days 8 and 9) wait for the trainer to start them. */
const firstDay = n => { const l = lessonOf(n); return l != null && lessonOf(n - 1) !== l; };
function unlockedFor(n, batch){
  const o = S(), set = own(o.batches, key(batch), n) || Object.prototype.hasOwnProperty.call(o.all || {}, n);
  return Math.max(set ? manual(n, batch) : firstDay(n) ? 1 : 0, bySchedule(n, batch));
}
const at = n => unlockedFor(n, state.traineeBatch);
// a trainee is held on a day of Days 2–16 until they have been through it (and once the trainer's settings have loaded:
// nothing is decided before, as on Day 1)
/* 🗂 Batches already under way keep their days open: the first time an admin opens the platform with the locks, the lessons
   open at that moment are kept (settings:daysteps.legacy = {all: [lesson ids], batches: {"<batch key>": [lesson ids]}}),
   and the days of those lessons are never held for that batch. Only a lesson opened after that is locked step by step.
   Until the record is written nothing is held, so the locks never land on a trainee before it is. */
const enforced = () => !!(state.ftDaySteps && state.ftDaySteps.legacy);
// the day a batch started, from its code (B + MMDDYY: B102826 → 2026-10-28), else null
function batchStart(batch){ const m = /^b(\d{2})(\d{2})(\d{2})$/.exec(key(batch)); return m ? Date.parse(`20${m[3]}-${m[1]}-${m[2]}T00:00:00`) : null; }
function legacyOpen(n, batch){
  const g = (state.ftDaySteps || {}).legacy || {}, l = lessonOf(n), k = key(batch); if(l == null) return false;
  if((g.except || []).includes(k)) return false;   // the trainer applied the locks to this batch too
  if(((g.batches || {})[k] || []).map(Number).includes(l)) return true;
  // a lesson opened for all batches then is kept for the batches already under way, not for one that starts later
  const since = Date.parse(g.at || ""), start = batchStart(batch);
  return (g.all || []).map(Number).includes(l) && !(isFinite(since) && start != null && start > since);
}
function active(n){
  n = Number(n);
  if(!isTrainee() || !state.ftOpenDays || !enforced() || n < FIRST || n > LAST()) return false;
  if(legacyOpen(n, state.traineeBatch)) return false;
  return !doneDays().includes(n);
}
// is day n open to this trainee at all (its lesson opened, and its first step unlocked)?
function dayStarted(n){
  n = Number(n);
  if(!isTrainee() || !enforced()) return true;
  const l = lessonOf(n); if(l != null && !lessonOpen(l)) return false;
  return !active(n) || at(n) >= 1;
}
function stepOpen(n, k){ return !active(n) || (dayStarted(n) && at(n) >= k); }
const label = (n, k) => { const x = steps(n)[k - 1]; return x ? x.label : "This activity"; };
const current = n => { const k = Math.max(1, Math.min(at(n), steps(n).length)); return steps(n)[k - 1] || null; };
const lockMsg = (n, k) => at(n) < 1 ? "🔒 This part of the training opens when your trainer unlocks it."
  : `🔒 ${label(n, k)} opens when your trainer unlocks it. You are on ${label(n, Math.min(at(n), steps(n).length))}.`;

/* ---------- the decks: a locked step's slide shows its lock; in order, one slide at a time ---------- */
const prevMayGo = root.FTDay1 && FTDay1.mayGo;
function mayGo(n, i, from){
  n = Number(n);
  if(n === 1) return prevMayGo ? prevMayGo(n, i, from) : true;
  if(!active(n)) return true;
  if(!decksIn()) return true;
  const want = stepAt(n, i);
  if(!dayStarted(n) || want > at(n)){ toast(lockMsg(n, want)); return false; }
  const by = root.FTDayDecks && FTDayDecks.state && FTDayDecks.state().split ? 2 : 1;
  if(from >= 0 && i > from + by){ toast("The training goes in order: one slide at a time, with Next →."); return false; }
  return true;
}
if(root.FTDay1) FTDay1.mayGo = mayGo; else root.FTDay1 = {mayGo};
// where the trainee left off on a day (this browser), so a segment or "Go to" opens there, not on the last unlocked step
const posKey = n => `ftdlPos:${state.traineeId || "-"}:${n}`;
const posOf = n => { try{ const v = localStorage.getItem(posKey(n)); return v == null ? null : Number(v); }catch(err){ return null; } };
function keepPos(n, i){ try{ if((posOf(n) == null || i > posOf(n))) localStorage.setItem(posKey(n), String(i)); }catch(err){} }
function openCurrent(n){
  const x = current(n); if(!x){ goto("modules"); return; }
  const p = posOf(n), i = p != null && stepAt(n, p) <= at(n) ? p : p != null ? x.from : 0;
  FTDayDecks.open(n, i);
}

const NOLOAD = "The training couldn’t load. Check your connection and try again.";
/* ---------- 📚 Dashboard: the lesson's parts, one segment each ----------
   a one-part lesson's segment reads Start; a lesson in parts reads Part 1 · Part 2 … (no "Day" on the card). A part is
   one day, except where the Training Guide splits a lesson otherwise (PARTS). Which lesson a day belongs to (its locks,
   its progress) doesn't change: only the card's buttons are grouped. */
// Personal Injury Process Flow and Receptionist Training are one card pair: Day 3's classroom session (the Guide's
// "Classroom Discussion on PI Workflow, Reception Training and Call Listening") is Part 1, on the PI Process Flow card,
// titled "Personal Injury Process Flow / Reception" (CARD_TITLES); Day 4 is Part 2, on Receptionist Training's (its Day 3
// isn't a button of its own: it is that Part 1). Medical Records: Part 1 MedLOR (Days 13–15), Part 2 Lien Balance
// Verification (Day 16)
const PARTS = {4: [[4]], 8: [[13, 14, 15], [16]]};
// (a card whose parts are numbered on from another card's, or a one-part card that is a Part: the labels it shows)
const PART_LABELS = {3: ["Part 1"], 4: ["Part 2"]};
const CARD_TITLES = {3: "Personal Injury Process Flow / Reception"};
const partsOf = (lid, days) => PARTS[lid] || days.map(d => [d]);
function segState(d){
  if(!isTrainee()) return "open";
  if(d === 1){ const l = lessonOf(1); return l != null && !lessonOpen(l) ? "locked" : doneDays().includes(1) ? "done" : "open"; }
  if(!dayStarted(d)) return "locked";
  return doneDays().includes(d) ? "done" : "open";
}
function segments(lid, days, title){
  const cur = isTrainee() && root.FTNextStep && FTNextStep.place ? (p => p && p.day ? Number(p.day.day) : null)(FTNextStep.place()) : null;
  // (the trainer: a part every day of which is still locked for the batch picked shows its 🔒, and still opens, to unlock it)
  const tl = p => isTrainer() && p.every(d => !segOpenFor(d, 1));
  const titles = root.FTDayDecks && FTDayDecks.dayTitle ? FTDayDecks.dayTitle : () => "";
  const parts = partsOf(lid, days), one = parts.length === 1;
  const b = parts.map((p, k) => {
    // a day of another lesson's (Receptionist's Day 3) waits for this lesson too
    const sts = p.map(d => lessonOf(d) !== lid && isTrainee() && !lessonOpen(lid) ? "locked" : segState(d));
    const st = sts.includes("open") ? "open" : sts.every(x => x === "done") ? "done" : sts.includes("done") ? "open" : "locked";
    // the part opens on its day the trainee is on (the first one open, else the last one done); an admin, on its first
    const d = !isTrainee() ? p[0] : p[sts.indexOf("open")] || p[sts.lastIndexOf("done")] || p[0];
    const named = (PART_LABELS[lid] || [])[k], label = named || (one ? "Start" : `Part ${k + 1}`), t = titles(d) || title;
    const tlk = tl(p);
    const tip = (named ? `${label}: ${title}` : one ? title : `Part ${k + 1} of ${parts.length}`) + (st === "locked" ? ": opens when your trainer unlocks it" : `: ${t}`)
      + (tlk ? ` · 🔒 locked for ${batchName(selKey())}: open the deck to unlock it` : "");
    return `<button type="button" class="ftseg-b ${st}${tlk ? " tlocked" : ""}${p.includes(cur) ? " now" : ""}" data-day="${d}" data-days="${p.join(",")}" ${st === "locked" ? `aria-disabled="true"` : ""}
      onclick="event.stopPropagation(); FTDayLocks.launch(${d})" title="${esc_(tip)}">${st === "locked" || tlk ? "🔒 " : st === "done" ? "✓ " : ""}${label}</button>`;
  }).join("");
  return `<div class="ftseg ftseg-n${parts.length}" role="group" aria-label="${esc_((one ? "Start: " : "Training parts: ") + title)}">${b}</div>`;
}
function launch(d){
  d = Number(d);
  if(isTrainee()){
    const l = lessonOf(d);
    if(l != null && !lessonOpen(l)){ toast("🔒 This lesson opens when your trainer opens it for your batch."); return; }
    // (Lesson 1 starts on the Reading Task until it is finished, as its ▶ Start Training did)
    if(d === 1){ if(root.FTDay1 && FTDay1.active && FTDay1.active()){ FTDay1.goCurrent(); return; } if(FTDayDecks.readFirst && FTDayDecks.readFirst(1)){ FTDayDecks.slide(1, "reading"); return; } FTDayDecks.open(1, 0); return; }
    if(!dayStarted(d)){ toast("🔒 This part of the training opens when your trainer unlocks it."); return; }
    if(active(d)){ if(!decksIn()){ loadDecks().then(x => x ? launch(d) : toast(NOLOAD)); return; } openCurrent(d); return; }
  }
  FTDayDecks.open(d, 0);
}
const __grid = root.LSH_HOME_GRID_LAYOUT;
if(typeof __grid === "function") root.LSH_HOME_GRID_LAYOUT = function(ctx){
  const html = __grid.apply(this, arguments); if(!html) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  t.content.querySelectorAll(".ftli[data-days]").forEach(card => {
    const start = card.querySelector(".mc-grid > .module-start-btn"); if(!start) return;
    const lid = Number(String(card.id).replace(/^dayl-/, "")), days = card.dataset.days.split(",").map(Number).filter(Boolean);
    const head = card.querySelector(".mh-title"); if(head && CARD_TITLES[lid]) head.textContent = CARD_TITLES[lid];
    const title = (head || {}).textContent || "";
    const w = document.createElement("template"); w.innerHTML = segments(lid, days, title.trim());
    start.replaceWith(w.content.firstElementChild);
  });
  return t.innerHTML;
};

/* ---------- the lesson deck, its video, its Knowledge Check and the tools wait for their step ---------- */
// a lesson's own stops: 💬 its deck (a "lesson" launch on a day of its own card), 🎬 its video and ✍️ its Process Questions
// (each launch names its lesson). Day 3 discusses Lessons 3 and 4, so the day alone doesn't say whose stop it is.
const STOPS = {
  lesson: (s, n, l) => s.go === "lesson" && lessonOf(n) === l,
  video: (s, n, l) => new RegExp(`ftVideoOrAsk\\(${l}\\)`).test(s.go || ""),
  kc: (s, n, l) => new RegExp(`toKC\\(${l}\\)`).test(s.go || "")
};
function lessonStop(l, kind){
  for(let n = FIRST; n <= LAST(); n++){ const k = stepWith(n, s => STOPS[kind](s, n, l)); if(k) return {n, k}; }
  return null;
}
// held back for a trainee: true (and a toast) when the stop's step isn't open yet. Before the decks have loaded the steps
// aren't known, so nothing opens: "wait", and the caller tries again once they have
function held(l, kind){
  l = Number(l);
  if(!isTrainee() || !enforced() || !(l >= 2 && l <= 8)) return false;
  if(!decksIn()) return "wait";
  // a video with no stop of its own on a deck (its link is on the lesson card only) waits for its lesson's step
  const x = lessonStop(l, kind) || (kind === "video" ? lessonStop(l, "lesson") : null); if(!x || stepOpen(x.n, x.k)) return false;
  toast(lockMsg(x.n, x.k)); return true;
}
// is a lesson's stop open to this trainee by its step (no toast: a slide asks while it draws)? null where the steps don't
// hold them (not a trainee, the locks not in force, the day not held, or no such stop), so the caller keeps its own rule
function stopOpen(l, kind){
  if(!isTrainee() || !enforced() || !decksIn()) return null;
  l = Number(l); const x = lessonStop(l, kind) || (kind === "video" ? lessonStop(l, "lesson") : null); if(!x || !active(x.n)) return null;
  return stepOpen(x.n, x.k);
}
// retry fn once the decks are in (or say they couldn't load)
const later = fn => { loadDecks().then(x => x ? fn() : toast(NOLOAD)); };
// the platform tools a day's step opens: where each is, by slide
const TOOL_STOPS = {listening: s => s.ids.includes("listen"), lor: s => s.go === "lor", transcribe: (s, n) => n === 9 && (s.ids.includes("guide") || s.ids.includes("s3"))};
const toolStops = view => { const test = TOOL_STOPS[view], out = []; if(!test) return out;
  for(let n = FIRST; n <= LAST(); n++){ const k = stepWith(n, s => test(s, n)); if(k) out.push({n, k}); }
  return out; };
function toolHeld(view){
  if(!TOOL_STOPS[view] || !isTrainee() || !enforced()) return false;
  if(!decksIn()) return "wait";
  const at_ = toolStops(view);
  if(!at_.length || at_.some(x => stepOpen(x.n, x.k))) return false;
  toast(lockMsg(at_[0].n, at_[0].k)); return true;
}
// is a tool's step open on day n (a Call Listening set opens with its day's Call Listening step)?
function toolOpen(view, n){
  if(!isTrainee() || !enforced()) return true;
  if(!decksIn()){ loadDecks(); return false; }
  const x = toolStops(view).find(x => x.n === Number(n));
  return x ? stepOpen(x.n, x.k) : dayStarted(n);
}
const __goto = root.goto;
root.goto = function(view, arg){
  if(isTrainee()){
    const self = this, args = arguments;
    const h = view === "day" && arg != null ? held(arg, "lesson") : (view === "process" || view === "kc") && arg != null ? held(arg, "kc") : toolHeld(view);
    if(h === "wait"){ later(() => root.goto.apply(self, args)); return; }
    if(h) return;
  }
  return __goto.apply(this, arguments);
};
const __video = root.ftVideoOrAsk;
if(__video) root.ftVideoOrAsk = function(id){ const h = held(id, "video"); if(h === "wait"){ later(() => root.ftVideoOrAsk(id)); return; } if(h) return; return __video.apply(this, arguments); };
function wrapKC(){
  if(root.FTProcess && FTProcess.openLesson && !FTProcess.openLesson.__ftdl){
    const f = FTProcess.openLesson;
    FTProcess.openLesson = function(l){ const h = held(l, "kc"); if(h === "wait"){ later(() => FTProcess.openLesson(l)); return; } if(h) return; return f.apply(this, arguments); };
    FTProcess.openLesson.__ftdl = true;
  }
}
wrapKC();
// (🛠 the Practice Lab's sessions, simulators, tools, trainer activities and recording sets ask FTDayLocks.labOpen, below)

/* ---------- the deck: a later step's slide shows its lock ---------- */
const __render = root.render;
root.render = function(){
  wrapKC();
  const r = __render.apply(this, arguments);
  const d = root.FTDayDecks && FTDayDecks.state ? FTDayDecks.state() : null;
  if(state.view === "daydeck" && d && active(d.day) && decksIn() && steps(d.day).length){
    const n = Number(d.day), k = stepAt(n, d.i), box = document.querySelector("main.main-ftdd .ftdd-slides");
    if(dayStarted(n) && k <= at(n)) keepPos(n, d.i);
    if(box && (!dayStarted(n) || k > at(n))){
      const cur = at(n) >= 1 && dayStarted(n) ? current(n) : null;
      ftLockSlides(box, `<b>🔒 ${esc_(at(n) >= 1 ? label(n, k) : "Not open yet")}</b>
        <span>${at(n) >= 1 ? "This step opens when your trainer unlocks it. The training goes in order, one step at a time." : "This part of the training opens when your trainer unlocks it."}</span>
        ${cur ? `<button type="button" class="btn btn-navy" onclick="FTDayLocks.current(${n})">Go to ${esc_(cur.label)} →</button>`
          : `<button type="button" class="btn btn-navy" onclick="goto('modules')">← Back to 📚 Dashboard</button>`}`);
    }
  }
  return r;
};
// ⏰ a scheduled time block starts while the page is open: what it unlocks shows without a reload (no server request)
let sig = "";
setInterval(() => {
  if(document.hidden || !isTrainee() || !state.ftDaySteps) return;
  const s = []; for(let n = 1; n <= LAST(); n++) s.push(rankNow(schedFor(n, state.traineeBatch)));
  const now = s.join(",");
  const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || (document.activeElement || {}).isContentEditable;
  if(sig && now !== sig && ["daydeck", "modules", "simulators", "day"].includes(state.view)){ if(typing) return; render(); }
  sig = now;
}, 30000);

/* ---------- 🛡 Admin → 📅 Open Lessons: 🔓 Activity Locks, for all batches or one ---------- */
const A = {open: {}};
const selKey = () => state.ftOdBatch || "__all";

/* ---------- 🧑‍🏫 TRAINER: the trainer's deck, each segment's lock set right on it ----------
   The batch is the one picked in Admin → 📅 Open Lessons (state.ftOdBatch), shared with the panel there. */
const isTrainer = () => !!state.isAdmin && !state.adminPreview;
const D1 = () => root.FTDay1 || {};
const segList = n => n === 1 ? (D1().STEPS || []) : steps(n);
const segAt = (n, i) => n === 1 ? (D1().stepAt ? D1().stepAt(i) : 3) : stepAt(n, i);
const segLabel = (n, k) => n === 1 ? (D1().label ? D1().label(k) : "This activity") : label(n, k);
// the last segment open for the batch (Day 1: its own steps, at least the first; js/ft-day1-flow.js)
const segCount = (n, sel) => n === 1 ? (D1().stepsFor ? D1().stepsFor(sel) : 1) : unlockedFor(n, sel);
const lessonsFor = sel => { const o = state.ftOpenDays || {}; return [].concat(o.all || [], sel === "__all" ? [] : (o.batches || {})[sel] || []).map(Number); };
function batchName(sel){
  if(sel === "__all") return "all batches";
  const b = typeof ftKnownBatches === "function" ? ftKnownBatches().find(([k]) => k === sel) : null;
  return b && b[1] !== sel ? b[1] : String(sel).toUpperCase();
}
// the batches to pick from: the trainees' (read once if the admin pages haven't yet) and every one a setting names
let ledger = false;
function batchList(){
  if(!state.adminData && !ledger && typeof loadAdminLedgerQuiet === "function"){ ledger = true; loadAdminLedgerQuiet().then(() => { if(state.view === "daydeck") render(); }).catch(() => {}); }
  const m = new Map(typeof ftKnownBatches === "function" ? ftKnownBatches() : []);
  [S().batches, (state.ftDay1Steps || {}).batches].forEach(o => Object.keys(o || {}).forEach(k => { if(!m.has(k)) m.set(k, k.toUpperCase()); }));
  return [...m.entries()].map(([k, n]) => [k, n === k ? k.toUpperCase() : n]).sort((a, b) => a[1].localeCompare(b[1]));
}
// where segment k of day n stands for the batch picked: "lesson" (the lesson isn't open for it: 📅 Open Lessons),
// "kept" (open: the batch was under way when the locks began, or is past Day 1), "open" or "locked"
function segStatus(n, k, sel){
  n = Number(n); sel = sel || selKey();
  const l = lessonOf(n); if(l != null && !lessonsFor(sel).includes(l)) return "lesson";
  // (Day 1: past it once a later lesson is open, unless the trainer set the batch's Day 1 steps themselves)
  if(n === 1 ? lessonsFor(sel).some(id => id > 1 && id !== 12) && !(sel !== "__all" && D1().ownSteps && D1().ownSteps(sel)) : (n >= FIRST && n <= LAST() && legacyOpen(n, sel))) return "kept";
  if(n > LAST()) return "open";
  return segCount(n, sel) >= k ? "open" : "locked";
}
const segOpenFor = (d, k) => { const x = segStatus(d, k); return x === "open" || x === "kept"; };
const anyDay = n => decksIn() && segList(n).length && (Number(n) === 1 || (Number(n) >= FIRST && Number(n) <= LAST()));
const deckOk = n => isTrainer() && anyDay(n);
// (the slide's 🔓 Unlock / 🔒 Lock button is the trainer's in 👁 Trainee view too: their admin session stays signed in under it)
const canSet = n => (isTrainer() || (!!state.adminPreview && !state.isAdmin)) && anyDay(n);
const CHIP = {open: ["🔓", "Open to trainees"], kept: ["🔓", "Open to trainees"], locked: ["🔒", "Locked for trainees"], lesson: ["🔒", "Lesson not open"]};
// the slide's chip on the trainer's deck
// the slide's lock, for the batch picked, as a button: 🔒 Locked for trainees · 🔓 Unlock (this segment, and the ones before
// it), or 🔓 Open to trainees · 🔒 Lock (from this segment on); a day kept open, or a lesson not open yet, only says so
function chip(n, i){
  n = Number(n); if(!canSet(n)) return "";
  const k = segAt(n, i), x = segStatus(n, k), [ic, t] = CHIP[x], b = batchName(selKey());
  const tip = `Segment ${k} of ${segList(n).length}: ${segLabel(n, k)} · ${t} (${b})`;
  const to = x === "locked" ? k : x === "open" && (n !== 1 || k > 2) ? k - 1 : null;
  if(to == null) return `<span class="ftdl-chip ${x}" title="${esc_(tip)}">${ic} ${esc_(t)}</span>`;
  return `<button type="button" class="ftdl-chip ftdl-chipbtn ${x}" onclick="FTDayLocks.segSet(${n}, ${to})"
    title="${esc_(tip + (x === "locked" ? `: unlock it for ${b}` : `: lock it again for ${b}`))}">${ic} ${esc_(t)} <b>${x === "locked" ? "🔓 Unlock" : "🔒 Lock"}</b></button>`;
}
const dotLocked = (n, i) => { n = Number(n); return deckOk(n) && !segOpenFor(n, segAt(n, i)); };
// 🔓 Segment lock, in the side panel of the trainer's deck
function panel(n, i){
  n = Number(n); if(!deckOk(n)) return "";
  const sel = selKey(), list = segList(n), total = list.length, k = segAt(n, i), x = segStatus(n, k);
  const on = Math.min(segCount(n, sel), total), d1 = n === 1;
  const sc = d1 ? schedFor(1, sel) : schedFor(n, sel);
  const btn = (cls, to, t) => `<button type="button" class="btn ${cls} btn-sm ftdd-ctl" onclick="FTDayLocks.segSet(${n}, ${to})">${t}</button>`;
  const acts = x === "lesson"
    ? `<button type="button" class="btn btn-ghost btn-sm ftdd-ctl" onclick="state.adminTab = 'opendays'; goto('admin')">📅 Open the lesson in Open Lessons →</button>`
    // (a day the batch isn't held to: the trainer can hold it again from here, Day 1 for a batch picked, a day under
    // way when the locks began with 🔒 Lock these too)
    : x === "kept" ? (d1 ? (sel === "__all" ? `<p class="ftdd-rail-note">These batches are past Day 1, so its steps aren’t held. Pick a batch to hold it to Day 1’s steps again.</p>`
        : `<p class="ftdd-rail-note">This batch is past Day 1, so its steps aren’t held until you lock one.</p>` + (k > 1 ? btn("btn-navy", k - 1, "🔒 Lock from here") : "") + btn("btn-ghost", 1, "🔒 Lock the day"))
      : `<p class="ftdd-rail-note">Already under way when the locks began, so this day isn’t held for this batch.</p><button type="button" class="btn btn-navy btn-sm ftdd-ctl" onclick="FTDayLocks.lockLegacy()">🔒 Lock these too</button>`)
    : (x === "locked" ? btn("btn-navy", k, `🔓 Unlock this segment${k > on + 1 ? " (and the ones before it)" : ""}`) : (!d1 || k > 2) ? btn("btn-ghost", k - 1, "🔒 Lock from here") : "")
      + (on < total ? btn("btn-ghost", d1 ? 8 : ALL, "🔓 Open the whole day") : "")
      + (on > (d1 ? 1 : 0) ? btn("btn-ghost", d1 ? 1 : 0, "🔒 Lock the day") : "");
  return `<div class="ftdl-tpanel" role="group" aria-label="Segment lock">
    <p class="ftdd-rail-h">🔓 Segment lock</p>
    <select class="ftdl-tsel" aria-label="Batch" onchange="ftSetOdBatch(this.value)">
      <option value="__all" ${sel === "__all" ? "selected" : ""}>All batches</option>
      ${batchList().map(([b, name]) => `<option value="${esc_(b)}" ${sel === b ? "selected" : ""}>${esc_(name)}</option>`).join("")}
    </select>
    <p class="ftdl-tseg"><span>Segment ${k} of ${total}</span><b>${esc_(segLabel(n, k))}</b></p>
    <span class="ftdl-chip ${x}">${CHIP[x][0]} ${esc_(CHIP[x][1])}</span>
    ${x === "lesson" || x === "kept" ? "" : `<p class="ftdd-rail-note">Trainees are on: <b>${esc_(on >= 1 ? segLabel(n, on) : "nothing yet (the day is locked)")}</b>${on >= 1 ? ` · ${on} of ${total} open` : ""}</p>`}
    ${acts}
    ${sc && x !== "lesson" && x !== "kept" ? `<p class="ftdd-rail-note">⏰ On schedule: ${SLOTS.map(([s, ic]) => sc[s] ? `${ic} ${esc_(fmt(sc[s]))}` : "").filter(Boolean).join(" · ")}</p>` : ""}
  </div>`;
}
// unlock day n up to segment k (0 locks the day) for the batch picked, from the trainer's deck
function segSet(n, k){
  n = Number(n); k = Number(k) || 0;
  if(n === 1){ if(typeof root.ftSetDay1Step === "function") return root.ftSetDay1Step(Math.max(1, Math.min(8, k))); return; }
  return root.FTDayLocks.set(n, k);
}
function countFor(n){
  const o = S(), sel = selKey();
  if(sel === "__all") return {m: stepNum(o, null, n), sc: ((o.sched || {}).all || {})[n] || null};
  return {m: manual(n, sel), sc: schedFor(n, sel)};
}
const fmt = iso => { const t = Date.parse(iso || ""); return isFinite(t) ? new Date(t).toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}) : ""; };
function dayPanel(n){
  const st = steps(n), {m, sc} = countFor(n), on = Math.min(m, st.length), l = lessonOf(n);
  const title = l != null && typeof ftName === "function" ? ftName(l) : "";
  const slotEnd = k => { let x = 0; st.forEach(s => { if(RANK[s.slot] <= RANK[k]) x = s.n; }); return x; };
  const times = Object.assign({}, DEF_TIMES, S().times || {});
  const rows = SLOTS.map(([k, ic, name]) => {
    const list = st.filter(s => s.slot === k); if(!list.length) return "";
    return `<li class="ftdl-slot"><span>${ic} ${esc_(name)}</span>${slotEnd(k) > on ? `<button type="button" class="btn btn-navy btn-sm" onclick="FTDayLocks.set(${n}, ${slotEnd(k)})">🔓 Open the ${esc_(name.split(" /")[0])}</button>` : `<i>open</i>`}</li>` +
      list.map(s => `<li class="${s.n <= on ? "on" : ""}"><span>${s.n}. ${esc_(s.label)}</span>
        ${s.n <= on ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.set(${n}, ${s.n - 1})">🔒 Lock from here</button>`
          : `<button type="button" class="btn btn-navy btn-sm" onclick="FTDayLocks.set(${n}, ${s.n})">🔓 Unlock${s.n > on + 1 ? " up to here" : ""}</button>`}</li>`).join("");
  }).join("");
  const when = sc ? `⏰ On schedule: ${SLOTS.map(([k, ic]) => sc[k] ? `${ic} ${esc_(fmt(sc[k]))}` : "").filter(Boolean).join(" · ")}` : "";
  return `<details class="ftdl-day" ${A.open[n] ? "open" : ""} ontoggle="FTDayLocks.toggle(${n}, this.open)">
    <summary><b>Day ${n}</b>${title ? ` · ${esc_(title)}` : ""} <span class="ftdl-count ${on >= st.length ? "all" : on ? "part" : ""}">${on >= st.length ? "all open" : on ? `${on} of ${st.length} open` : "🔒 locked"}</span>${when ? ` <span class="ftdl-when">${when}</span>` : ""}</summary>
    <div class="ftdl-acts">
      ${on < st.length ? `<button type="button" class="btn btn-navy btn-sm" onclick="FTDayLocks.set(${n}, ${ALL})">🔓 Open the whole day</button>` : ""}
      ${on ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.set(${n}, 0)">🔒 Lock the day</button>` : ""}
      <span class="ftdl-sched">⏰ Run on <input type="date" id="ftdlDate${n}" value="${esc_(sc && sc.am ? new Date(Date.parse(sc.am)).toLocaleDateString("en-CA") : "")}">
        at 🌅 ${esc_(times.am)} · 🌇 ${esc_(times.pm)} · 🏠 ${esc_(times.out)}
        <button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.schedule(${n})">Schedule</button>
        ${sc ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.schedule(${n}, true)">Clear</button>` : ""}</span>
    </div>
    <ol class="ftdl-steps">${rows}</ol></details>`;
}
function legacyNote(sel){
  const g = S().legacy; if(!g) return "";
  if(sel !== "__all" && (g.except || []).includes(sel)) return "";
  const ls = sel === "__all" ? (g.all || []) : [].concat(g.all || [], (g.batches || {})[sel] || []);
  const names = [...new Set(ls.map(Number))].filter(l => l >= 2 && l <= 8).sort((a, b) => a - b).map(l => typeof ftName === "function" ? ftName(l) : "Lesson " + l);
  const any = (g.all || []).length || Object.values(g.batches || {}).some(x => (x || []).length);
  if(!any) return "";
  return `<p class="ftdl-legacy">🗂 Already under way when the locks began${g.at ? ` (${esc_(new Date(g.at).toLocaleDateString())})` : ""}: ${names.length ? `the days of <b>${names.map(esc_).join(", ")}</b> stay open for ${sel === "__all" ? "every batch" : "this batch"}` : "nothing for this choice"}. Lessons opened since are locked step by step.
    ${names.length ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.lockLegacy()">🔒 Lock these too</button>` : ""}</p>`;
}
function renderPanel(){
  if(!decksIn()){ loadDecks().then(() => { if(state.adminTab === "opendays") render(); }); return `<div class="card ft-open-days ftdl-admin"><h3>🔓 Activity Locks</h3><p>Loading the days…</p></div>`; }
  const sel = selKey(), times = Object.assign({}, DEF_TIMES, S().times || {});
  const days = []; for(let n = FIRST; n <= LAST(); n++) days.push(n);
  return `<div class="card ft-open-days ftdl-admin"><h3>🔓 Activity Locks: Days ${FIRST}–${LAST()}</h3>
    <p style="margin:0 0 10px;color:var(--ink-soft);font-size:14px;">Every day goes in Day 1’s order, one step at a time: each step is a row of the day’s card, in the card’s order, named as the card names it. A trainee opens only the steps you unlock, for the batch chosen above${sel === "__all" ? " (all batches)" : ""}: every lesson, activity, practical task and simulator waits for its step, and a day stays locked until you open it. Unlock step by step, a whole time block, the whole day, or put the day on a schedule and each block opens when it starts.</p>
    <p class="ftdl-times">⏰ Time blocks: 🌅 AM session <input type="time" id="ftdlTam" value="${esc_(times.am)}"> · 🌇 PM breakout <input type="time" id="ftdlTpm" value="${esc_(times.pm)}"> · 🏠 Outside hours <input type="time" id="ftdlTout" value="${esc_(times.out)}">
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.times()">Save times</button>
      <span style="display:block;margin-top:4px;font-size:12.5px;color:var(--ink-soft);">Day 1’s steps are in 🔓 Day 1 Steps above; ⏰ Day 1 can run on a schedule here too.</span>
      <span class="ftdl-sched">⏰ Day 1 runs on <input type="date" id="ftdlDate1" value="${esc_((c => c.sc && c.sc.am ? new Date(Date.parse(c.sc.am)).toLocaleDateString("en-CA") : "")(countFor(1)))}">
        <button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.schedule(1)">Schedule</button>${countFor(1).sc ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTDayLocks.schedule(1, true)">Clear</button>` : ""}</span></p>
    ${legacyNote(sel)}
    ${days.map(dayPanel).join("")}</div>`;
}
const __panel = root.renderFtDay1Steps;
root.renderFtDay1Steps = function(){ return (__panel ? __panel.apply(this, arguments) : "") + renderPanel(); };
// the lessons open for every batch, as just read from the server: what the batches already under way keep open
const legacyOf = o => ({all: ((o || {}).all || []).map(Number), batches: JSON.parse(JSON.stringify((o || {}).batches || {})), except: [], at: new Date().toISOString()});
// read a record strictly: a server that doesn't answer throws, so it is never taken for "nothing saved yet"
const strict = k => typeof sharedGetStrict === "function" ? sharedGetStrict(k) : sharedGet(k);
// the first admin to load the open lessons with the locks in place writes that record, once, from a read that worked
let legacyWriting = false;
const __loadOpen = root.ftLoadOpenDays;
if(typeof __loadOpen === "function") root.ftLoadOpenDays = async function(){
  const r = await __loadOpen.apply(this, arguments);
  if(state.isAdmin && !state.adminPreview && state.ftOpenDays && state.ftDaySteps && !state.ftDaySteps.legacy && !legacyWriting){
    legacyWriting = true;
    try{
      const [cur, od] = [await strict(KEY), await strict("settings:opendays")];
      if(cur && cur.legacy) state.ftDaySteps = Object.assign({}, state.ftDaySteps, {legacy: cur.legacy});
      else{ const next = Object.assign({}, cur || {}, {legacy: legacyOf(od)}); if(await sharedSet(KEY, next) !== false) state.ftDaySteps = Object.assign({}, state.ftDaySteps, {legacy: next.legacy}); }
    }catch(err){ /* the server didn't answer: nothing is written, and the next check tries again */ } finally{ legacyWriting = false; }
  }
  return r;
};
async function save(change, msg){
  let cur;
  try{ await loadDecks(); cur = (await strict(KEY)) || {}; }catch(err){ toast("Couldn’t reach the server, so nothing was changed. Try again."); return; }
  if(!cur.legacy){ try{ cur.legacy = legacyOf(await strict("settings:opendays")); }catch(err){ toast("Couldn’t reach the server, so nothing was changed. Try again."); return; } }
  const next = {all: Object.assign({}, cur.all || {}), batches: JSON.parse(JSON.stringify(cur.batches || {})),
    sched: {all: Object.assign({}, (cur.sched || {}).all || {}), batches: JSON.parse(JSON.stringify((cur.sched || {}).batches || {}))},
    times: Object.assign({}, DEF_TIMES, cur.times || {}), legacy: JSON.parse(JSON.stringify(cur.legacy)), rows: JSON.parse(JSON.stringify(cur.rows || {}))};
  // (the counts saved as slide steps are rewritten as card-row steps first, so the change and the rest read alike)
  migrate(next); change(next); migrate(next, true);
  const ok = await sharedSet(KEY, next);
  if(ok === false){ toast("Couldn’t save. Check your connection and try again."); return; }
  state.ftDaySteps = next; toast(msg); render();
}
root.FTDayLocks = {
  steps, at, active, stepOpen, dayStarted, mayGo, launch, segments, held, unlockedFor, stopOpen,
  // 🧑‍🏫 the trainer's deck (js/ft-day-decks.js): the slide's chip, the locked dots, 🔓 Segment lock, and its buttons
  chip, dotLocked, panel, segSet, segStatus,
  // a settings:daysteps record's counts as card-row steps (js/ft-buffer.js, before it writes one); one count of it
  migrate, stepNum: (o, batch, n) => stepNum(o, batch == null ? null : key(batch), n),
  // 🛠 the Practice Lab: may a trainee see a session, tool, trainer activity or recording set used on these days?
  labOpen: days => !isTrainee() || !days || !days.length || days.some(d => Number(d) === 1 || dayStarted(d)),
  toolOpen,
  current(n){ openCurrent(Number(n)); },
  toggle(n, o){ A.open[n] = !!o; },
  // the trainer applies the locks to the days a batch already had open (all batches: every one's)
  lockLegacy(){
    const sel = selKey();
    if(!confirm(sel === "__all" ? "Lock the days every batch already had open? Their trainees will need you to unlock each step." : "Lock the days this batch already had open? Its trainees will need you to unlock each step.")) return;
    return save(o => { if(sel === "__all") o.legacy = {all: [], batches: {}, except: [], at: o.legacy.at};
      else { o.legacy.batches = o.legacy.batches || {}; delete o.legacy.batches[sel]; o.legacy.except = [...new Set((o.legacy.except || []).concat(sel))]; } },
      "✓ The locks now apply to those days too.");
  },
  // the trainer: unlock day n up to step k (0 locks the day) for the batch chosen in Open Lessons
  set(n, k){
    const sel = selKey(), st = steps(n).length, v = Math.max(0, Math.min(ALL, Number(k) || 0));
    return save(o => { if(sel === "__all") o.all[n] = v; else (o.batches[sel] = o.batches[sel] || {})[n] = v; },
      v >= st ? `✓ Day ${n} is open, every step.` : v ? `✓ Day ${n}: unlocked up to ${label(n, v)}.` : `✓ Day ${n} is locked.`);
  },
  times(){
    const v = id => String((document.getElementById(id) || {}).value || "").trim();
    const t = {am: v("ftdlTam") || DEF_TIMES.am, pm: v("ftdlTpm") || DEF_TIMES.pm, out: v("ftdlTout") || DEF_TIMES.out};
    if(!(t.am < t.pm && t.pm < t.out)){ toast("The AM session comes first, then the PM breakout, then outside hours."); return; }
    return save(o => { o.times = t; }, "✓ Time blocks saved. Schedule a day to use them.");
  },
  // ⏰ day n runs on the date picked: each block's start, in this browser's time zone, as an instant every trainee reads alike
  schedule(n, clear){
    const sel = selKey();
    if(clear) return save(o => { if(sel === "__all") delete o.sched.all[n]; else (o.sched.batches[sel] = o.sched.batches[sel] || {})[n] = null; },
      `✓ Day ${n} is off the schedule${sel === "__all" ? "" : " for this batch"}.`);
    const date = String((document.getElementById("ftdlDate" + n) || {}).value || "").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ toast("Pick the date the day runs."); return; }
    const t = Object.assign({}, DEF_TIMES, S().times || {}), at_ = hm => new Date(`${date}T${hm}:00`).toISOString();
    const sc = {am: at_(t.am), pm: at_(t.pm), out: at_(t.out)};
    return save(o => { if(sel === "__all") o.sched.all[n] = sc; else (o.sched.batches[sel] = o.sched.batches[sel] || {})[n] = sc; },
      `✓ Day ${n} runs on ${new Date(Date.parse(sc.am)).toLocaleDateString()}: each block opens when it starts.`);
  },
  // Day 1's steps by the schedule (js/ft-day1-flow.js reads it)
  day1: batch => bySchedule(1, batch)
};

const st = document.createElement("style"); st.id = "ft-day-locks"; st.textContent = `
.ftseg{display:flex;align-items:stretch;gap:0;margin:0 14px 8px;border:1px solid #DDE1EC;border-radius:10px;overflow:hidden;background:rgba(236,238,245,.62);}
.ftseg-b{flex:1 1 0;min-width:0;padding:10px 4px;border:0;border-left:1px solid #DDE1EC;background:transparent;color:var(--navy,#1E2340);
  font:700 14.5px/1.1 'Inter',sans-serif;letter-spacing:.01em;cursor:pointer;white-space:nowrap;}
.ftseg-b:first-child{border-left:0;}
.ftseg-b:hover, .ftseg-b:focus-visible{background:#353B57;color:#fff;outline:none;}
.ftseg-b.now{background:#1E2340;color:#fff;}
.ftseg-b.done{color:#2E7D4F;} .ftseg-b.done:hover{color:#fff;}
/* the part the trainee is on and has finished: light green on the navy (.done's green would be lost on it) */
.ftseg-b.now.done{color:#9BE3B5;} .ftseg-b.now.done:hover{color:#fff;}
.ftseg-b.locked{color:#8A90A6;cursor:not-allowed;background:rgba(220,223,232,.55);} .ftseg-b.locked:hover{background:rgba(205,209,222,.8);color:#5b6178;}
.ftseg-n4 .ftseg-b{font-size:13px;padding:10px 2px;}
.dash-main .module-card.ftr-card > .ftseg, .module-card .mc-grid > .ftseg{grid-column:1 / -1;}
.dash-main .module-card.ftr-card > .ftseg{margin:auto 0 0 !important;border-width:1px 0 0;border-radius:0;}
.ftdl-admin .ftdl-day{border:1px solid var(--line);border-radius:10px;background:#fff;margin:0 0 8px;padding:6px 12px;}
.ftdl-admin summary{cursor:pointer;padding:4px 0;font-size:14.5px;}
.ftdl-count{margin-left:6px;font-size:12px;padding:2px 8px;border-radius:999px;background:#F3E3E3;color:#8A2F2F;}
.ftdl-count.part{background:#FFF1DC;color:#8A5A12;} .ftdl-count.all{background:#EAF6EE;color:#2E7D4F;}
.ftdl-when{font-size:12px;color:var(--ink-soft);}
.ftdl-acts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:6px 0 8px;}
.ftdl-sched{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13px;color:var(--ink-soft);}
.ftdl-times{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:13.5px;}
.ftdl-steps{list-style:none;margin:0 0 6px;padding:0;display:grid;gap:6px;}
.ftdl-steps li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:#fff;}
.ftdl-steps li.on{background:#EAF6EE;border-color:#B9E0C6;} .ftdl-steps li i{font-size:12.5px;color:var(--ink-soft);}
.ftdl-legacy{margin:0 0 10px;padding:8px 12px;border-radius:10px;background:#FFF7EA;border:1px solid #F0D9B5;font-size:13.5px;}
.ftdl-steps li.ftdl-slot{background:#F4F5FA;border-style:dashed;font-weight:700;}
.ftseg-b.tlocked{color:#8A90A6;background:rgba(220,223,232,.55);} .ftseg-b.tlocked:hover{background:#353B57;color:#fff;}
.ftdl-chip{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;padding:3px 10px;border-radius:999px;font:700 12px/1.3 'Inter',sans-serif;white-space:nowrap;
  background:#EAF6EE;color:#2E7D4F;border:1px solid #B9E0C6;}
.ftdl-chip.locked, .ftdl-chip.lesson{background:#F3E3E3;color:#8A2F2F;border-color:#E6C4C4;}
/* (on a day's card the slide's bar is otherwise empty: the lock floats at the ribbon's right end, so the card keeps its room) */
.ftdd-deck-ag > .ftdd-bar:has(> .ftdl-chip){position:relative;}
.ftdd-deck-ag > .ftdd-bar > .ftdl-chip{position:absolute;right:10px;bottom:calc(100% + 6px);z-index:3;box-shadow:0 2px 6px rgba(16,19,36,.25);}
.ftdl-chipbtn{cursor:pointer;} .ftdl-chipbtn b{margin-left:4px;padding:1px 8px;border-radius:999px;font-weight:800;}
.ftdl-chipbtn.locked b{background:#262B45;color:#fff;} .ftdl-chipbtn.open b{background:#fff;color:#8A2F2F;border:1px solid #E6C4C4;}
.ftdl-chipbtn:hover{filter:brightness(.96);} .ftdl-chipbtn:focus-visible{outline:2px solid #DB8437;outline-offset:2px;}
.ftdl-tpanel{display:flex;flex-direction:column;gap:6px;padding:0 0 8px;margin:0 0 4px;border-bottom:1px solid var(--line, #E3E6EE);}
.ftdl-tsel{width:100%;padding:5px 6px;border:1px solid var(--line, #DDE1EC);border-radius:8px;background:#fff;font:600 12.5px 'Inter',sans-serif;color:#262B45;}
.ftdl-tseg{margin:0;display:flex;flex-direction:column;gap:2px;font-size:12.5px;line-height:1.3;color:#262B45;}
.ftdl-tseg span{font:600 11px 'IBM Plex Mono',monospace;color:#C9742B;}
.ftdd-dot.lk{background:repeating-linear-gradient(45deg,#C9CDD9 0 2px,#EEF0F5 2px 4px);box-shadow:inset 0 0 0 1px #A9AFC2;}
.ftdd-dot.lk.on{background:#DB8437;box-shadow:0 0 0 2px #8A2F2F;}
@media(max-width:1100px){ .ftdl-tpanel{flex-direction:row;flex-wrap:wrap;align-items:center;border-bottom:0;} .ftdl-tsel{width:auto;} }
`;
document.head.appendChild(st);
})();
