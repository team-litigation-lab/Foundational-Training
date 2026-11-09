/* ============================================================
   📊 WEEKLY RANKING REPORT — the trainer's weekly progress report and ranking, per batch
   ------------------------------------------------------------
   Admin → 🏅 Scorecard → 📊 Weekly Ranking. The facilitator's own report format, built in:
     "<BATCH> RANKING REPORT WEEK <N>" — one row per trainee, then
       • a compliance column (the Spelling & Typing Tests: what was complete, what was lacking, with dates),
       • score columns: each activity's raw score out of its points ("37.5/45") converted to a mark out of 5
         ("4.17/5"), with an optional note under it ("Initial feedback implemented."),
       • W<N> Final Average — the average of the row's marks out of 5,
       • Additional Notes,
     and the trainees ranked by the final average.
   Only the format is built in: no trainee, score or note comes with it. The trainer picks the batch and the
   week, sets the week's columns (the 📋 Week 1 columns, last week's, or their own), and types the scores, or
   ⤓ fills the empty ones from what the platform already graded (the Scorecard's sources, a column at a time).
   ✨ drafts a trainee's Additional Notes in the facilitator's feedback DNA. ⬇ Word / 📋 Copy / 🖨 Print give the
   report in the same layout, ranked.
   Saved in ranking:<batch>:w<N> (admins only; trainees never read it).
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const R = {draftRun: null, sort: "rank",   // (highest final average first; ↕ switches to A–Z)
   act: null, people: null, loading: false, batch: "", week: 1, data: null, key: "", dataLoading: false, saveT: null, saved: true, fill: false, drafting: {}, edit: false, auto: null, weekSet: false};
const bLabel = b => typeof batchLabel === "function" ? batchLabel(b) : String(b || "");
const keyOf = (b, w) => `ranking:${String(b || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
const uid = () => Math.random().toString(36).slice(2, 9);

// the report's columns: the compliance one, the marks out of 5, and the activities scored on their own points
const COL = (label, sub, max, src, period) => Object.assign({id: uid(), label, sub: sub || "", max: max == null ? 5 : max, type: "score", src: src || ""}, period ? {period} : {});
const BASE = () => [
  {id: uid(), label: "Spelling & Typing Tests", sub: "", type: "notes", src: "skills"},
  COL("Monitoring Sheet", "", 5, "day:monitor", "week"), COL("Tracker", "", 5, "day:tracker", "week")];
const TEMPLATES = {
  week1: {label: "📋 Week 1 columns", cols: () => BASE().concat([COL("PI Reading Task", "", 40, "kc:Reading Task"), COL("Ass: Common Terms", "", 27, "drive:Common Terms"),
    COL("Ass: Auto Liability Insurance", "", 45, "drive:Auto Liability"), COL("RC: Data Extraction", "", 125), COL("Reception Mock Calls", "", 5, "trainer:Reception Mock Call")])},
  blank: {label: "Only the trackers", cols: BASE}
};
/* 🔗 every report is connected to every scorecard: the Daily Compliance (the nightly check), the Drive links' compliance
   (🔗 Drive Links → ✅ Compliance: links correct of six) and 🏅 the Scorecard's overall (every grading system of js/ft-program.js,
   averaged — the same Overall as 🏅 My Performance). A column already there for one is kept as it is; only the missing ones are
   added, at the end (a 🤖 drafted report has its Daily Compliance second, autoDraft). */
// (📘 the TAM isn't a daily deliverable: it is graded only for a shadowing activity, when a trainer asks)
// (📏 Following Instructions too: each day's six Drive links as the course asks, held to the day they were checked)
const DAY_PARTS = [["monitor", "Monitoring Sheet"], ["tracker", "Tracker"], ["tests", "Typing & Spelling Tests"], ["eod", "EOD"], ["instructions", "Following Instructions"]];
// (a column made before: its Monitoring Sheet and Tracker now follow the day's checks too)
const DAY_OF = {"drive:Monitoring Sheet": "day:monitor", "drive:Tracker": "day:tracker"};
// (a TAM column a trainer typed scores in stays, as a column of their own — only the platform's TAM column goes)
const typedIn = c => !!(R.data && Object.values(R.data.rows || {}).some(r => { const x = ((r || {}).cells || {})[c.id]; return x && !x.auto && (num(x.raw) != null || String(x.note || "").trim()); }));
function connectAll(cols){ cols = cols.slice();
  cols.forEach(c => { if(c.type === "score" && DAY_OF[c.src]){ c.src = DAY_OF[c.src]; c.period = "week"; } });
  // (a TAM column added before the TAM stopped being a daily part goes again)
  cols = cols.filter(c => c.src !== "day:tam" || typedIn(c)).map(c => c.src === "day:tam" ? Object.assign(c, {src: ""}) : c);
  const out = cols.slice(), has = src => out.some(c => c.src === src);
  let n = 0;
  // 📅 each of the day's deliverables, its own column: the week's average of that part of the end-of-shift check
  // (worker.js dailyCompliance parts: the Monitoring Sheet, the Task Tracker, the TAM, the Typing & Spelling Tests, the EOD)
  DAY_PARTS.forEach(([k, label]) => { if(!has("day:" + k)){ out.push(COL(label, "", 5, "day:" + k, "week")); n++; } });
  if(!has("compliance")){ out.push(COL("Daily Compliance", "", 5, "compliance", "week")); n++; }
  if(!has("links")){ out.push(COL("Drive Links Compliance", "", 5, "links")); n++; }
  if(!has("overall")){ out.push(COL("🏅 Scorecard overall", "every grading system", 5, "overall")); n++; }
  out.added = n; return out;
}
// the facilitator's usual notes under a score (her feedback DNA's compliance wording)
const NOTES = ["Initial feedback implemented.", "Initial feedback was not fully implemented.", "Initial feedback was not implemented.",
  "Expected corrections from the initial feedback have not been fully implemented.", "Complete", "Complied; however, lacking 1 entry ()"];

const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : null; };
// a score the trainer typed (the platform's own, auto, is filled again as the scorecards change)
const typed = cur => !!(cur && num(cur.raw) != null && !cur.auto);
const fmt = n => (Math.round(n * 100) / 100).toString();
const fix2 = n => (Math.round(n * 100) / 100).toFixed(2);
// a cell's mark out of 5 (null when there is no score)
function mark(col, cell){
  const raw = num(cell && cell.raw); if(raw == null || col.type !== "score") return null;
  const max = num(col.max) || 5;
  return Math.max(0, Math.min(5, raw / max * 5));
}
function rowOf(id){ const d = R.data; d.rows[id] = d.rows[id] || {cells: {}, notes: ""}; d.rows[id].cells = d.rows[id].cells || {}; return d.rows[id]; }
function average(id){
  const r = (R.data.rows || {})[id]; if(!r) return null;
  const ms = R.data.cols.map(c => mark(c, (r.cells || {})[c.id])).filter(m => m != null);
  return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null;
}
const people = () => (R.people || []).filter(p => bLabel(p.batch) === R.batch);
function ranked(){
  const list = people().map(p => ({p, avg: average(p.id)}));
  list.sort((a, b) => (b.avg == null ? -1 : b.avg) - (a.avg == null ? -1 : a.avg) || String(a.p.name).localeCompare(String(b.p.name)));
  let r = 0, prev = null;
  return list.map((x, i) => { if(x.avg == null) return Object.assign(x, {rank: null}); if(prev == null || fix2(x.avg) !== fix2(prev)) r = i + 1; prev = x.avg; return Object.assign(x, {rank: r}); });
}

/* ---------- loading and saving ---------- */
async function loadPeople(){
  R.loading = true;
  try{
    let list = state.adminData;
    if(!list){ const keys = await sharedList("trainee:"); list = (await sharedGetMany(keys)).filter(Boolean); }
    R.people = list.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected && (!window.ftActiveTrainee || ftActiveTrainee(r))).map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || "", progress: r.dayProgress || {}, since: String(r.registeredAt || "").slice(0, 10)}))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if(!R.batch){ const bs = batches(); R.batch = bs[bs.length - 1] || ""; }
    // (opened on the batch's week now)
    if(!R.weekSet && R.batch){ R.week = weekNow(); R.weekSet = true; }
  }catch(err){ R.people = []; }
  R.loading = false; rerender();
}
const batches = () => [...new Set((R.people || []).map(p => bLabel(p.batch)).filter(Boolean))].sort();
async function loadWeek(){
  const key = keyOf(R.batch, R.week); if(R.key === key && R.data) return;
  R.key = key; R.data = null; R.dataLoading = true; rerender();
  let v = null; try{ v = await sharedGet(key); }catch(err){}
  if(R.key !== key) return;
  R.data = v && Array.isArray(v.cols) ? Object.assign({rows: {}}, v) : null;
  let named = 0;
  if(R.data) R.data.cols.forEach(c => { if(c.src) return; const k = Object.keys(KNOWN_SRC).find(x => String(c.label || "").toLowerCase().includes(x)); if(k && (KNOWN_SRC[k] === "skills") === (c.type === "notes")){ c.src = KNOWN_SRC[k]; named++; } });
  // (🔗 a report not approved yet gets the scorecards it doesn't have a column for yet: connectAll)
  // (every report, approved too: the day's deliverables and the scorecards follow what the trainees do)
  if(R.data){ const before = JSON.stringify(R.data.cols.map(c => c.src + "|" + (c.period || ""))), cc = connectAll(R.data.cols);
    if(cc.added || JSON.stringify(cc.map(c => c.src + "|" + (c.period || ""))) !== before){ R.data.cols = cc.map(c => c.id ? c : Object.assign(c, {id: uid()})); named++; } }
  if(named) save();
  R.dataLoading = false; rerender();
  // 🔄 the report follows the trainees' progress: each time it is opened (until it is approved), its empty cells fill from
  // the platform, never over what a trainer typed
  // (🤖 a draft read back before it was done — the report read again mid-draft: its fill and notes go on, finishDraft)
  if(R.data && R.data.auto && !R.data.auto.approved && R.data.auto.state !== "done") setTimeout(() => { if(R.key === key) finishDraft(key); }, 0);
  // (an approved report too: its platform-filled cells keep following the scorecards — a trainer's typed ones never change)
  else if(R.data) setTimeout(() => { if(R.key === key) fillFromPortal(true); }, 0);
}
// a column's name → the platform's grade it is filled from (for reports whose columns were made before they had a source)
const KNOWN_SRC = {"pi reading task": "kc:Reading Task", "common terms": "drive:Common Terms", "auto liability": "drive:Auto Liability",
  "monitoring sheet": "day:monitor", "tracker": "day:tracker", "eod": "day:eod", "reception mock call": "trainer:Reception Mock Call",
  "spelling & typing": "skills", "daily compliance": "compliance", "drive links compliance": "links", "scorecard overall": "overall"};
function save(){
  if(!R.data) return; R.saved = false; R.data.updatedAt = new Date().toISOString();
  clearTimeout(R.saveT); const key = R.key, data = R.data;
  R.saveT = setTimeout(async () => { const ok = await sharedSet(key, data); R.saved = ok !== false; if(ok === false) toast("Couldn’t save the report. Check your connection."); paintSaved(); }, 700);
  paintSaved();
}
function paintSaved(){ const el = document.getElementById("rkSaved"); if(el) el.textContent = R.saved ? "✓ Saved" : "Saving…"; }
const rerender = () => { if(state.view === "admin" && (state.adminTab === "ranking" || state.adminTab === "batchsheet" || state.adminTab === "weeklyreports")) render(); };

/* ---------- ⤓ fill the empty cells from what the platform already graded ---------- */
// the Scorecard's sources (js/ft-program.js) give every trainee's graded items; a column's src picks one:
// "<source id>:<words in the item's name>", e.g. "drive:Tracker", "calls:Reception", "kc:Law Firm"
// "9/28 to 10/06" (a Weekly Ranking column's dates) → ["2026-09-28", "2026-10-06"], the year from today's
function parseRange(s){
  const m = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:to|-|–|—)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i.exec(String(s || "")); if(!m) return null;
  const y = new Date().getFullYear(), yr = v => v ? (v.length === 2 ? 2000 + Number(v) : Number(v)) : null, p = n => String(n).padStart(2, "0");
  let y1 = yr(m[3]) || y, y2 = yr(m[6]) || y1; if(!m[3] && Number(m[1]) > Number(m[4])) y1 = y2 - 1;
  return [`${y1}-${p(m[1])}-${p(m[2])}`, `${y2}-${p(m[4])}-${p(m[5])}`];
}
// ⤓ Fill's week: the dates a column of the report names (the Spelling & Typing column's "9/28 to 10/06"), else the batch's
// own week N: a Batch ID is the day it started (B + MMDDYY), and week N is the seven days from start + 7 × (N − 1)
function weekRange(){
  const named = ((R.data || {}).cols || []).map(c => parseRange(c.sub)).find(Boolean); if(named) return named;
  // (a Batch ID that isn't a real date — an old or mistyped one, "B250926" — gives no start, instead of a crash)
  // (a B + DDMMYY one reads as its day: index.html batchStartDate)
  const startOf = b => (typeof batchStartDate === "function" ? batchStartDate(b) : "") || null;
  const start = [R.batch].concat(people().map(p => p.batch)).map(startOf).find(Boolean); if(!start) return null;
  const t = Date.parse(start + "T00:00:00Z") + (R.week - 1) * 7 * 864e5, iso = ms => new Date(ms).toISOString().slice(0, 10);
  if(!isFinite(t)) return null;
  return [iso(t), iso(t + 6 * 864e5)];
}
const PERIODS = [["all", "Whole training"], ["week", "This week only"]];
// the batch's week now: from its start (the Batch ID's date), 1 to 6
function weekNow(){
  const R0 = R.week; R.week = 1; const r = weekRange(); R.week = R0; if(!r) return 1;
  return Math.max(1, Math.min(6, Math.floor((Date.parse(ptToday() + "T00:00:00Z") - Date.parse(r[0] + "T00:00:00Z")) / (7 * 864e5)) + 1));
}
const ptToday = () => window.FTTrackerRules ? FTTrackerRules.ptDate() : new Date().toISOString().slice(0, 10);
// a week is over once its Friday's shift has ended (the nightly check has run: 22:30 UTC that Friday), or any day after it
// (the moment itself, not the UTC clock against the Pacific date: that Friday's Pacific evening is already the next UTC day)
function weekOver(){
  const r = weekRange(); if(!r) return false;
  const fri = new Date(Date.parse(r[0] + "T00:00:00Z") + 4 * 864e5).toISOString().slice(0, 10);
  return ptToday() > fri || Date.now() >= Date.parse(fri + "T22:30:00Z");
}
function srcOptions(){
  const S = (window.LSH_PROGRAM || {}).sources || [];
  // (not the 📊 Weekly Ranking itself: a week's report filled from the reports before it would count them twice)
  return [["", "Typed by the trainer"]].concat(S.filter(s => !s.noOverall && !s.hidden).map(s => [s.id + ":", `${s.icon} ${s.label} (average)`]),
    [["compliance", "✅ Daily compliance (the nightly check: tracker, Monitoring Sheet, tests, outputs, EOD)"], ["links", "🔗 Drive links compliance (🔗 Drive Links → ✅ Compliance: links correct of six)"], ["overall", "🏅 Scorecard overall (every grading system, averaged)"], ["day:monitor", "📅 Monitoring Sheet (the day's checks)"], ["day:tracker", "📅 Daily Task Tracker (the day's checks)"], ["day:tests", "📅 Typing & Spelling Tests (the day's three)"], ["day:eod", "📅 EOD email (the day's check)"], ["day:instructions", "📅 Following Instructions (the day's six Drive links)"], ["calls:Reception", "🎯 Call Simulator · Reception"], ["calls:Calendar", "🎯 Call Simulator · Calendar"], ["calls:Intake", "🎯 Call Simulator · Intake"],
     // the trainer-facilitated activities' scorecards (Admin → 🧑‍🏫 Trainer Inputs: the weighted average, as a %)
     ["trainer:Reception Mock Call", "🧑‍🏫 Reception Mock Call scorecard"], ["trainer:Calendar Management Mock Call", "🧑‍🏫 Calendar Management Mock Call scorecard"],
     ["trainer:Intake Mock Call", "🧑‍🏫 Intake Mock Call scorecard"], ["trainer:Intake Packet", "🧑‍🏫 Intake Packet Demo scorecard"], ["trainer:LOR Uploading", "🧑‍🏫 LOR Demo scorecard"],
     ["trainer:MedLOR", "🧑‍🏫 MedLOR Demo scorecard"], ["trainer:LV (Lien", "🧑‍🏫 LV Demo scorecard"], ["trainer:Settlement", "🧑‍🏫 Reduction / Closing & Settlement Demo scorecard"]]);
}
async function fillFromPortal(quiet){
  if(!R.data || R.fill) return;
  const notesCols = R.data.cols.filter(c => c.type === "notes" && c.src === "skills");
  const compCols = R.data.cols.filter(c => c.type === "score" && c.src === "compliance"), linkCols = R.data.cols.filter(c => c.type === "score" && c.src === "links");
  const dayCols = R.data.cols.filter(c => c.type === "score" && /^day:/.test(c.src || ""));
  const cols = R.data.cols.filter(c => c.type === "score" && c.src && c.src !== "compliance" && c.src !== "links" && !/^day:/.test(c.src)); if(!cols.length && !notesCols.length && !compCols.length && !linkCols.length && !dayCols.length){ if(!quiet) toast("No column is set to fill from the platform: pick a source in ✎ Columns."); return; }
  const S = ((window.LSH_PROGRAM || {}).sources || []).filter(s => s.key), ppl = people(); if(!ppl.length) return;
  R.fill = true; rerender();
  // (the report read again while its grades are read — FTRanking.reload —: the fill stops, it isn't the report on screen any more)
  const D = R.data, gone = () => R.data !== D;
  try{
    const shared = (window.LSH_PROGRAM || {}).shared || [], want = [];
    ppl.forEach(p => S.forEach(s => want.push(s.key + p.id)));
    const vals = await sharedGetMany(want.concat(shared)), sh = {};
    if(gone()){ R.fill = false; return; }
    shared.forEach((k, i) => { sh[k] = vals[want.length + i] || null; });
    // (a column set to "This week only": the grades dated in the week, weekRange; the daily tracker counts that week's days)
    const range = cols.some(c => c.period === "week") ? weekRange() : null;
    if(cols.some(c => c.period === "week") && !range && !quiet) toast("The week’s dates aren’t known: put them in the Spelling & Typing column (✎ Columns), e.g. 9/28 to 10/06. The weekly columns weren’t filled.");
    const inWeek = x => !!(range && x.at && String(x.at).slice(0, 10) >= range[0] && String(x.at).slice(0, 10) <= range[1]);
    let n = 0, undated = 0;
    // 🔄 a cell the platform filled (auto) follows the scorecards: filled again each time, with what they say now — a 0 or a
    // NO SUBMISSION from before the trainee's files were linked becomes their score. A trainer's own score or note is kept.
    // (and a platform-filled score its scorecard has no grade for any more — a 0 from a tracker not readable then — is cleared:
    // the cell shows what the scorecard says now, nothing when it has nothing)
    const clear = (row, c, cur) => { if(cur && cur.auto && num(cur.raw) != null){ const nx = Object.assign({}, cur); delete nx.raw; row.cells[c.id] = nx; n++; } };
    const put = (row, c, cur, v) => { const nx = Object.assign({}, cur || {}, v, {auto: true}); if(cur && cur.auto && Object.keys(v).every(k => String(cur[k]) === String(nx[k]))) return;
      row.cells[c.id] = nx; if(!(cur && cur.auto && Object.keys(v).filter(k => k !== "why").every(k => String(cur[k]) === String(nx[k])))) n++; };
    ppl.forEach((p, i) => {
      const rec = {}; S.forEach((s, j) => { rec[s.key] = vals[i * S.length + j] || null; });
      const sc = lshProgram.compute({id: p.id, progress: p.progress, rec, shared: sh, since: p.since});
      const scW = range ? lshProgram.compute({id: p.id, progress: p.progress, rec, shared: sh, since: p.since, range}) : null;
      const row = rowOf(p.id);
      cols.forEach(c => {
        const cur = row.cells[c.id]; if(typed(cur)) return;          // never over what the trainer typed
        const week = c.period === "week"; if(week && !scW) return;
        if(c.src === "overall"){ const o = (week ? scW : sc).overall; if(o == null){ clear(row, c, cur); return; }
          put(row, c, cur, {raw: fmt(o / 100 * (num(c.max) || 5)), period: week ? "week" : "all", why: `🏅 Scorecard overall${week ? " for the week" : ""}: ${Math.round(o)}% (every grading system averaged) → ${fmt(o / 20)} out of 5.`}); return; }
        const [sid, words] = [c.src.split(":")[0], c.src.split(":").slice(1).join(":").trim()];
        const src = (week ? scW : sc).rows.find(r => r.s.id === sid); if(!src) return;
        // this week's: only the grades dated in it (a source that keeps no dates can't say which week a grade was)
        const items = week ? src.items.filter(inWeek) : src.items;
        if(week && src.items.some(x => typeof x.pct === "number" && !x.at)) undated++;
        let pct = null, mark5 = null, whyIt = "";
        if(!words){ const g = items.filter(x => typeof x.pct === "number" && isFinite(x.pct)); pct = week ? (g.length ? Math.round(g.reduce((a, x) => a + x.pct, 0) / g.length) : null) : src.avg; }
        else {
          // the item named so first (the Monitoring Sheet itself, not "Monitoring Sheet items #5, #7"), else the first that
          // names the words
          const w = words.toLowerCase(), graded = items.filter(x => typeof x.pct === "number"), nm = x => String(x.name).toLowerCase();
          const it = graded.find(x => nm(x) === w || nm(x).endsWith(" " + w) || nm(x).startsWith(w + " ·")) || graded.find(x => nm(x).includes(w));
          pct = it ? it.pct : null; mark5 = it && typeof it.mark5 === "number" ? it.mark5 : null;
          if(it) whyIt = `${it.name}: ${it.pct}%${it.note ? " (" + it.note + ")" : ""}${it.at ? ", " + String(it.at).slice(0, 10) : ""}`;
        }
        if(pct == null){ clear(row, c, cur); return; }
        const max = num(c.max) || 5;
        put(row, c, cur, {raw: fmt(mark5 != null ? mark5 / 5 * max : pct / 100 * max), period: week ? "week" : "all",
          why: `${whyIt || `${src.s.label || sid}: the average of ${items.filter(x => typeof x.pct === "number").length} grade(s)${week ? " this week" : ""}`} → ${mark5 != null ? fmt(mark5) : fmt(pct / 20)} out of 5${max !== 5 ? ` (${fmt(mark5 != null ? mark5 / 5 * max : pct / 100 * max)} of ${max} points)` : ""}.`});
      });
    });
    // ✅ the Daily Compliance column: the average of the nightly check's days (trackerreview:<id>.compliance, worker.js
    // dailyCompliance) in the week (a column set to "Whole training": every day so far)
    // 📅 the day's deliverables, each its own column: the week's average of that part of each day's end-of-shift check
    // (trackerreview:<id>.compliance[<date>].parts: monitor, tracker, tam, tests, eod — a part the day had nothing to check for,
    // null, isn't counted); a column set to "Whole training": every day so far
    if(dayCols.length){
      const rvs = await sharedGetMany(ppl.map(p => "trackerreview:" + p.id)), wk = weekRange();
      if(gone()){ R.fill = false; return; }
      dayCols.forEach(c => { const k = c.src.slice(4); if(c.period === "week" && !wk) return; ppl.forEach((p, i) => {
        const row = rowOf(p.id), cur = row.cells[c.id]; if(typed(cur)) return;
        const days = Object.entries((rvs[i] || {}).compliance || {}).filter(([d, x]) => x && x.parts && typeof x.parts[k] === "number" && (c.period !== "week" || (wk && d >= wk[0] && d <= wk[1])));
        if(!days.length){ clear(row, c, cur); return; }
        const pct = days.reduce((a, [, x]) => a + x.parts[k], 0) / days.length;
        const nm = {monitor: "Monitoring Sheet", tracker: "Task Tracker", tests: "Typing & Spelling Tests", eod: "EOD email", instructions: "Following Instructions (naming, saving route, deliverables on time, Drive links)"}[k] || k;
        put(row, c, cur, {raw: fmt(pct / 100 * (num(c.max) || 5)), period: c.period === "week" ? "week" : "all", days: days.length,
          why: `${nm}, each day's end-of-shift check: ${days.sort().map(([d, x]) => `${d.slice(5).replace("-", "/")} ${x.parts[k]}%${k === "eod" && x.eodTrainer ? " (trainer)" : ""}`).join(", ")} → average ${Math.round(pct)}% → ${fmt(pct / 20)} out of 5.`}); }); });
    }
    if(compCols.length){
      const rvs = await sharedGetMany(ppl.map(p => "trackerreview:" + p.id)), wk = weekRange();
      if(gone()){ R.fill = false; return; }
      compCols.forEach(c => ppl.forEach((p, i) => {
        const row = rowOf(p.id), cur = row.cells[c.id]; if(typed(cur) || (c.period === "week" && !wk)) return;
        const days = Object.entries((rvs[i] || {}).compliance || {}).filter(([d, x]) => x && typeof x.pct === "number" && (c.period !== "week" || (wk && d >= wk[0] && d <= wk[1])));
        if(!days.length){ clear(row, c, cur); return; }
        const pct = days.reduce((a, [, x]) => a + x.pct, 0) / days.length, max = num(c.max) || 5;
        put(row, c, cur, {raw: fmt(pct / 100 * max), period: c.period === "week" ? "week" : "all", days: days.length,
          why: `Daily Compliance, each day's whole end-of-shift check (Monitoring Sheet, Tracker, tests, EOD, following instructions, outputs, platform; the TAM on a shadowing day): ${days.sort().map(([d, x]) => `${d.slice(5).replace("-", "/")} ${x.pct}%`).join(", ")} → average ${Math.round(pct)}% → ${fmt(pct / 20)} out of 5.`});
      }));
    }
    // 🔗 the Drive Links Compliance column: how many of the six monitored Drive links are ✓ Correct (📋 Batch Sheet → ✅ Compliance)
    if(linkCols.length && window.FTBatchSheet && FTBatchSheet.linksPct){
      linkCols.forEach(c => ppl.forEach(p => {
        const row = rowOf(p.id), cur = row.cells[c.id]; if(typed(cur)) return;
        const pct = FTBatchSheet.linksPct(p.id); if(pct == null) return;
        put(row, c, cur, {raw: fmt(pct / 100 * (num(c.max) || 5)), period: "all", why: `Drive links ✓ Correct: ${Math.round(pct / 100 * 6)} of 6 (${Math.round(pct)}%) → ${fmt(pct / 20)} out of 5.`});
      }));
    }
    // 🧪 the Spelling & Typing column: the compliance line for the column's dates (js/ft-skilltests.js)
    if(notesCols.length && window.FTSkills){
      const recs = await sharedGetMany(ppl.map(p => "skills:" + p.id)), rvs = await sharedGetMany(ppl.map(p => "trackerreview:" + p.id));
      if(gone()){ R.fill = false; return; }
      notesCols.forEach(c => {
        const range = parseRange(c.sub) || weekRange();
        if(!range){ if(!quiet) toast(`Put the dates in the “${c.label}” column first (✎ Columns), e.g. 9/28 to 10/06.`); return; }
        ppl.forEach((p, i) => { const row = rowOf(p.id), cur = row.cells[c.id];
          if(cur && String(cur.note || "").trim() && !(cur.auto && !cur.noteBy)) return;      // never over what the trainer typed
          const rec = FTSkills.withShots(recs[i], (rvs[i] || {}).shots);   // 📷 the screenshots in Drive count too
          put(row, c, cur, {note: FTSkills.complianceText(rec, range[0], range[1], p.since)}); });
      });
    }
    if(n) save();
    if(quiet){ if(n) toast(`🔄 ${n} score${n === 1 ? "" : "s"} updated from the scorecards.`); } else toast((n ? `⤓ Filled ${n} empty score${n === 1 ? "" : "s"} from the platform${range ? ` (this week: ${range[0]} to ${range[1]})` : ""}. Check them before you send the report.` : "Nothing new to fill: the platform has no grade yet for the empty cells.")
      + (undated ? " Some weekly columns’ sources keep no dates (Knowledge Checks, graded calls, games), so only their dated grades were counted." : ""));
  }catch(err){ if(!quiet) toast("Couldn’t read the trainees’ grades. Try again."); }
  R.fill = false; rerender();
}

/* ---------- ✨ Additional Notes in the facilitator's feedback DNA ---------- */
async function draftNotes(id, quiet){
  const p = people().find(x => x.id === id); if(!p || R.drafting[id]) return false;
  let ok = false;
  const row = rowOf(id), avg = average(id);
  const lines = R.data.cols.map(c => {
    const cell = row.cells[c.id] || {};
    if(c.type === "notes") return `${c.label}: ${cell.note || "(nothing noted)"}`;
    const m = mark(c, cell);
    return `${c.label}: ${m == null ? "not scored" : (num(c.max) === 5 ? fix2(m) + "/5" : `${cell.raw}/${c.max} = ${fix2(m)}/5`)}${cell.note ? ` (${cell.note})` : ""}`;
  });
  R.drafting[id] = true; rerender();
  try{
    const first = String(p.name).split(/\s+/)[0];
    const prompt = `You are the training facilitator of Legal Support Help writing the "Additional Notes" cell of the Week ${R.week} ranking report for one trainee Legal VA.
Trainee's first name: ${first}
This week's results:
${lines.join("\n")}
Week ${R.week} final average: ${avg == null ? "not computed" : fix2(avg) + "/5"}
${row.notes ? `The trainer's own notes so far: ${row.notes}` : ""}

Write 1–3 sentences in the facilitator's feedback DNA (below): factual and specific, naming the strongest results and the exact items that need improvement or are missing, and what is expected next week. Do not repeat every score. No greeting.

FACILITATOR'S FEEDBACK DNA:
${window.ftDnaGuide ? ftDnaGuide() : String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

Return ONLY JSON: {"notes":"..."}`;
    const out = await callAIJson(prompt, 500, undefined, "grading");
    const t = String((out && out.notes) || "").trim().slice(0, 1200);
    if(t){ row.notes = row.notes ? row.notes + "\n" + t : t; save(); ok = true; } else if(!quiet) toast("The AI returned nothing. Try again.");
  }catch(err){ if(!quiet) toast("The AI isn’t available right now. Type the notes yourself."); }
  R.drafting[id] = false; rerender();
  return ok;
}

/* ---------- the report, as the facilitator writes it (Word, copy, print) ---------- */
const title = () => `${R.batch} RANKING REPORT WEEK ${R.week}`;
function cellOut(c, cell){
  cell = cell || {};
  if(c.type === "notes") return String(cell.note || "").split("\n").map(l => `<p>${e(l)}</p>`).join("");
  const m = mark(c, cell), note = cell.note ? `<p>${e(cell.note)}</p>` : "";
  if(m == null) return note;
  return (num(c.max) === 5 ? `<p><b>${e(fmt(num(cell.raw)))}/5</b></p>` : `<p><b>${e(fmt(num(cell.raw)))}/${e(c.max)}</b></p><p><b>${fix2(m)}/5</b></p>`) + note;
}
const head = c => `<b>${e(c.label)}${c.type === "score" ? ` (${num(c.max) === 5 ? "5/5" : `${e(c.max)}/${e(c.max)}`})` : ""}${c.sub ? ":" : ""}</b>${c.sub ? `<br><b>${e(c.sub)}</b>` : ""}`;
function reportTable(){
  const cols = R.data.cols;
  return `<table class="rk-doc" border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;font-family:Calibri,Arial,sans-serif;font-size:9.5pt;">
    <thead><tr><th>Rank</th><th><b>Trainee Name</b></th>${cols.map(c => `<th>${head(c)}</th>`).join("")}<th><b>W${R.week} Final Average</b></th><th><b>AI summary of the week</b></th><th><b>Additional Notes</b></th></tr></thead>
    <tbody>${ranked().map(x => { const r = (R.data.rows || {})[x.p.id] || {cells: {}}; return `<tr><td style="text-align:center"><b>${x.rank || "—"}</b></td><td><b>${e(x.p.name)}</b></td>
      ${cols.map(c => `<td>${cellOut(c, (r.cells || {})[c.id])}</td>`).join("")}<td><b>${x.avg == null ? "" : fix2(x.avg) + "/5"}</b></td>
      <td>${e(aiText(x.p.id))}</td>
      <td>${String(r.notes || "").split("\n").filter(Boolean).map(l => `<p>${e(l)}</p>`).join("")}</td></tr>`; }).join("")}</tbody></table>`;
}
function wordDoc(){
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${e(title())}</title>
<style>@page Section1{size:11in 8.5in;mso-page-orientation:landscape;margin:0.5in;} div.Section1{page:Section1;} p{margin:0 0 3pt;} th{background:#F2F2F2;vertical-align:middle;} td{vertical-align:top;}</style></head>
<body><div class="Section1"><p style="font-family:Calibri,Arial;font-size:14pt;"><b>${e(title())}</b></p>${reportTable()}</div></body></html>`;
  return html;
}

/* ---------- the tab ---------- */
function columnsEditor(){
  const opts = srcOptions();
  return `<div class="rk-cols"><p class="rk-h">✎ This week’s columns <span>— Trainee Name, W${R.week} Final Average and Additional Notes are always there</span></p>
    ${R.data.cols.map((c, i) => `<div class="rk-col">
      <select onchange="FTRanking.col(${i}, 'type', this.value)"><option value="score"${c.type === "score" ? " selected" : ""}>Score</option><option value="notes"${c.type === "notes" ? " selected" : ""}>Compliance notes</option></select>
      <input value="${e(c.label)}" placeholder="Column name" onchange="FTRanking.col(${i}, 'label', this.value)">
      <input class="rk-sub" value="${e(c.sub)}" placeholder="Dates or items (e.g. 9/28 to 10/06)" onchange="FTRanking.col(${i}, 'sub', this.value)">
      ${c.type === "score" ? `<label class="rk-max">out of <input type="number" min="1" step="any" value="${e(c.max)}" onchange="FTRanking.col(${i}, 'max', this.value)"></label>
      <span class="rk-src"><select title="Where ⤓ Fill takes this column's score from" onchange="FTRanking.col(${i}, 'src', this.value)">${opts.map(o => `<option value="${e(o[0])}"${(c.src || "") === o[0] ? " selected" : ""}>${e(o[1])}</option>`).join("")}</select>
        ${c.src ? `<select title="⤓ Fill: this week's grades only, or the whole training's" onchange="FTRanking.col(${i}, 'period', this.value)">${PERIODS.map(o => `<option value="${o[0]}"${(c.period || "all") === o[0] ? " selected" : ""}>${o[1]}</option>`).join("")}</select>` : ""}</span>`
      : `<span></span><select title="Where ⤓ Fill takes this column's notes from" onchange="FTRanking.col(${i}, 'src', this.value)"><option value="">Typed by the trainer</option><option value="skills"${c.src === "skills" ? " selected" : ""}>🧪 Typing & Spelling log (the column’s dates)</option></select>`}
      <span class="rk-col-ad"><button class="btn btn-ghost btn-sm" title="Move left" ${i ? "" : "disabled"} onclick="FTRanking.moveCol(${i}, -1)">←</button><button class="btn btn-ghost btn-sm" title="Remove the column" onclick="FTRanking.delCol(${i})">🗑</button></span></div>`).join("")}
    <div class="rk-acts"><button class="btn btn-ghost btn-sm" onclick="FTRanking.addCol('score')">➕ Score column</button><button class="btn btn-ghost btn-sm" onclick="FTRanking.addCol('notes')">➕ Notes column</button>
      <button class="btn btn-navy btn-sm" onclick="FTRanking.toggleEdit()">✓ Done</button></div></div>`;
}
/* ---------- the sheet: the report as a spreadsheet (column letters, row numbers, a formula bar) ---------- */
// the sheet's columns: a score out of its points takes two (the points typed, and its mark out of 5 worked out)
function sheetCols(){
  const out = [{k: "name"}];
  R.data.cols.forEach(c => { if(c.type === "notes") out.push({k: "notes", c}); else if(num(c.max) === 5) out.push({k: "mark5", c}); else out.push({k: "raw", c}, {k: "calc", c}); });
  return out.concat([{k: "avg"}, {k: "rank"}, {k: "ai"}, {k: "addl"}]);
}
const letter = i => { let s = ""; i++; while(i){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
function headOf(s){
  const c = s.c || {}, sub = c.sub ? "\n" + c.sub : "";
  if(s.k === "name") return "Trainee Name";
  if(s.k === "notes") return c.label + sub;
  if(s.k === "mark5") return `${c.label} (5/5)${sub}`;
  if(s.k === "raw") return `${c.label} (${c.max}/${c.max})${sub}`;
  if(s.k === "calc") return `${c.label} ÷ 5`;
  if(s.k === "avg") return `W${R.week} Final Average`;
  if(s.k === "rank") return "Rank";
  if(s.k === "ai") return "🤖 AI summary of the week";
  return "Additional Notes";
}
// the formulas behind the worked-out cells, as the sheet (and the Excel file) has them
function formulaOf(s, ci, row, sc, first, last){
  const L = letter;
  if(s.k === "calc") return `=IF(${L(ci - 1)}${row}="","",${L(ci - 1)}${row}/${s.c.max}*5)`;
  const marks = sc.map((x, i) => x.k === "mark5" || x.k === "calc" ? L(i) + row : null).filter(Boolean);
  if(s.k === "avg") return `=IFERROR(AVERAGE(${marks.join(",")}),"")`;
  const a = L(sc.findIndex(x => x.k === "avg"));
  if(s.k === "rank") return `=IF(${a}${row}="","",RANK(${a}${row},$${a}$${first}:$${a}$${last}))`;
  return "";
}
const sheetRows = () => R.sort === "rank" ? ranked().map(x => x.p) : people();
/* ▾/▸ retractable: a column folds to a thin strip (a click on its letter) and back; Collapse all keeps the marks out of 5,
   the average, the rank and the AI summary. Kept per viewer on this browser. */
const FOLD_KEY = "lsh_rk_fold";
const foldSet = () => { if(!R.folds){ try{ R.folds = new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || "[]")); }catch(err){ R.folds = new Set(); } } return R.folds; };
const saveFolds = () => { try{ localStorage.setItem(FOLD_KEY, JSON.stringify([...foldSet()])); }catch(err){} };
const fk = s => s.c ? s.k + ":" + s.c.id : s.k;
const folded = s => s.k !== "name" && foldSet().has(fk(s));
const FD = s => folded(s) ? " xl-folded" : "";
// (the AI summary of a trainee's week, for the sheet, ⬇ Word and ⬇ Excel)
const aiText = id => { const w = window.FTRankSummary && FTRankSummary.weekSummary ? FTRankSummary.weekSummary(id) : null; return (w && w.text) || ""; };
/* 🎨 a score's colour by its mark out of 5 (Blue high, Green good, Yellow critical, Red fail), and 💬 its hover card: how the
   platform came up with it (the cell's why, kept by ⤓ fill), or that a trainer typed it, or where it will come from */
const toneCls = m0 => { const m = m0 == null || !isFinite(m0) ? null : Math.round(m0 * 100) / 100; return m == null ? "" : m >= 4.5 ? "t-ex" : m >= 3.5 ? "t-gd" : m >= 2.5 ? "t-ok" : "t-lo"; };
const TONE_TXT = {"t-ex": "🔵 High (4.5 or more).", "t-gd": "🟢 Good (3.5 to 4.49).", "t-ok": "🟡 Critical (2.5 to 3.49).", "t-lo": "🔴 Fail (below 2.5)."};
function tipOf(c, cell, p){
  const m = mark(c, cell), head = `${p.name} · ${c.label}`;
  if(num(cell.raw) == null) return `${head}: no score yet. ${howOf(c)}${String(cell.note || "").trim() ? " Note: " + cell.note : ""}`;
  const tone = TONE_TXT[toneCls(m)] || "";
  if(!cell.auto) return `${head}: ${cell.raw}${c.max && num(c.max) !== 5 ? " of " + c.max : ""} — typed by the trainer${m != null ? ` (${fix2(m)} out of 5)` : ""}. ${tone}${cell.note ? " Note: " + cell.note : ""}`;
  return `${head}: ${cell.why || howOf(c)} ${tone}${cell.note ? " Note: " + cell.note : ""}`;
}
// the hover card (one for the page: a table cell can't hold a box that leaves the sheet)
document.addEventListener("mouseover", ev => {
  const t = ev.target && ev.target.closest ? ev.target.closest(".xl [data-tip]") : null;
  let tip = document.getElementById("rkTip");
  if(!t){ if(tip) tip.style.display = "none"; return; }
  if(!tip){ tip = document.createElement("div"); tip.id = "rkTip"; document.body.appendChild(tip); }
  tip.textContent = t.getAttribute("data-tip"); tip.style.display = "block";
  const r = t.getBoundingClientRect(), w = Math.min(380, window.innerWidth - 20);
  tip.style.width = w + "px"; tip.style.left = Math.max(10, Math.min(r.left, window.innerWidth - w - 10)) + "px";
  const below = r.bottom + 8, h = tip.offsetHeight; tip.style.top = (below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 8) : below) + "px";
});
function grid(){
  const list = sheetRows(), sc = sheetCols(), rk = {}; ranked().forEach(x => { rk[x.p.id] = x; });
  if(!list.length) return `<p class="sc-empty">No approved trainees in ${e(R.batch)}.</p>`;
  const first = 3, last = first + list.length - 1, L = letter;
  const ev = `onfocus="FTRanking.focus(this)" onkeydown="FTRanking.key(event, this)"`;
  return `<div class="xl-fbar"><span class="xl-ref" id="xlRef">A3</span><span class="xl-fx">fx</span>
      <input id="xlBar" list="rkNotes" placeholder="Select a cell" readonly onchange="FTRanking.bar(this.value)" onkeydown="if(event.key==='Enter') this.blur()"></div>
    <div class="xl-wrap"><table class="xl"><thead>
      <tr class="xl-letters"><th class="xl-corner"></th>${sc.map((s, i) => `<th class="xl-l${s.k === "name" ? " xl-frz" : ""}${FD(s)}" ${s.k === "name" ? "" : `onclick="FTRanking.fold('${fk(s)}')" title="${folded(s) ? "▸ Show this column" : "▾ Fold this column away"}"`}>${folded(s) ? "▸" : L(i)}</th>`).join("")}</tr></thead><tbody>
      <tr class="xl-title"><th class="xl-rn">1</th><td class="xl-frz" colspan="${sc.length}"><b>${e(title())}</b></td></tr>
      <tr class="xl-head"><th class="xl-rn">2</th>${sc.map((s, i) => `<th class="${s.k === "name" ? "xl-frz " : ""}xl-h-${s.k}${FD(s)}" data-ref="${L(i)}2" title="${e(headOf(s))}">${folded(s) ? "" : e(headOf(s)).replace(/\n/g, "<br>")}</th>`).join("")}</tr>
      ${list.map((p, ri) => { const row = first + ri, r = rowOf(p.id), x = rk[p.id] || {};
        return `<tr class="xl-row"><th class="xl-rn">${row}</th>${sc.map((s, ci) => {
          const ref = L(ci) + row, at = `data-ri="${ri}" data-ci="${ci}" data-ref="${ref}" data-p="${e(p.id)}" data-k="${s.k}"`;
          // (a folded column: a thin strip, its value in the tooltip; ▸ on its letter brings it back)
          if(folded(s)) return `<td class="xl-fold" title="${e(headOf(s))}"></td>`;
          if(s.k === "ai"){ const w = window.FTRankSummary && FTRankSummary.weekSummary ? FTRankSummary.weekSummary(p.id) : {text: ""};
            return `<td class="xl-td xl-aisum${w.ai ? "" : " is-plain"}" tabindex="0" ${at} ${ev} title="${e(w.text || "")}"><div class="xl-clip">${w.text ? e(w.text) : `<span class="xl-wait">${w.state === "busy" ? "🤖 Summarizing the week…" : "🤖 Summarized when the week’s summary is ready (📑 above)"}</span>`}</div></td>`; }
          if(s.k === "name") return `<td class="xl-frz xl-name" tabindex="0" ${at} ${ev}>${e(p.name)}</td>`;
          if(s.k === "notes"){ const cell = r.cells[s.c.id] || {};
            return `<td class="xl-td"><textarea class="xl-in xl-txt" rows="2" ${at} data-c="${s.c.id}" ${ev} placeholder="Complete / Complied; however, lacking … (dates)" onchange="FTRanking.cell('${e(p.id)}', '${s.c.id}', 'note', this.value)">${e(cell.note || "")}</textarea></td>`; }
          if(s.k === "mark5" || s.k === "raw"){ const cell = r.cells[s.c.id] || {};
            return `<td class="xl-td${cell.note ? " has-note" : ""}${cell.auto ? " is-auto" : ""} ${toneCls(mark(s.c, cell))}" data-cell="${e(p.id)}|${s.c.id}" data-tip="${e(tipOf(s.c, cell, p))}"><input class="xl-in xl-num" inputmode="decimal" ${at} data-c="${s.c.id}" ${ev} value="${e(cell.raw == null ? "" : cell.raw)}" onchange="FTRanking.cell('${e(p.id)}', '${s.c.id}', 'raw', this.value)"></td>`; }
          if(s.k === "calc"){ const m = mark(s.c, r.cells[s.c.id]);
            return `<td class="xl-calc rk-mark ${toneCls(m)}" tabindex="0" ${at} data-tip="${e(tipOf(s.c, r.cells[s.c.id] || {}, p))}" data-f="${e(formulaOf(s, ci, row, sc, first, last))}" data-m="${e(p.id)}|${s.c.id}" ${ev}>${m == null ? "" : fix2(m)}</td>`; }
          if(s.k === "avg") return `<td class="xl-calc xl-avg rk-avg ${toneCls(x.avg)}" tabindex="0" ${at} data-tip="${e(`${p.name}'s final average: the average of their marks out of 5 (the columns with a score), ranked ${x.rank || "—"}. ${x.avg == null ? "" : TONE_TXT[toneCls(x.avg)] || ""}`)}" data-f="${e(formulaOf(s, ci, row, sc, first, last))}" data-a="${e(p.id)}" ${ev}>${x.avg == null ? "" : fix2(x.avg)}</td>`;
          if(s.k === "rank") return `<td class="xl-calc xl-rank rk-rank" tabindex="0" ${at} data-f="${e(formulaOf(s, ci, row, sc, first, last))}" data-r="${e(p.id)}" ${ev}>${x.rank || ""}</td>`;
          return `<td class="xl-td xl-addl"><textarea class="xl-in xl-txt" rows="2" ${at} ${ev} placeholder="Additional notes" onchange="FTRanking.notes('${e(p.id)}', this.value)">${e(r.notes || "")}</textarea>
            <button type="button" class="xl-ai" title="Draft this trainee’s notes in the facilitator’s voice" ${R.drafting[p.id] ? "disabled" : ""} onclick="FTRanking.draft('${e(p.id)}')">${R.drafting[p.id] ? "…" : "✨"}</button></td>`;
        }).join("")}</tr>`; }).join("")}
    </tbody></table></div>
    <div class="rk-legend"><b>Colours (out of 5):</b> <span class="t-ex">4.5–5 High</span><span class="t-gd">3.5–4.49 Good</span><span class="t-ok">2.5–3.49 Critical</span><span class="t-lo">below 2.5 Fail</span><small>Hover over a score for how the platform came up with it.</small></div>
    <datalist id="rkNotes">${NOTES.map(n => `<option value="${e(n)}">`).join("")}</datalist>`;
}
// a score typed: its mark, and every row's average and rank, updated where they are (no redraw: the cursor stays put)
function paintFigures(id, cid){
  const col = R.data.cols.find(c => c.id === cid), el = [...document.querySelectorAll(".rk-mark")].find(x => x.getAttribute("data-m") === id + "|" + cid);
  const tone = (x, m) => { if(!x) return; x.classList.remove("t-ex", "t-gd", "t-ok", "t-lo"); const t = toneCls(m); if(t) x.classList.add(t); };
  if(col && el){ const m = mark(col, rowOf(id).cells[cid]); el.textContent = m == null ? "" : fix2(m); tone(el, m); }
  ranked().forEach(x => {
    const a = [...document.querySelectorAll(".rk-avg")].find(t => t.getAttribute("data-a") === x.p.id), r = [...document.querySelectorAll(".rk-rank")].find(t => t.getAttribute("data-r") === x.p.id);
    if(a){ a.textContent = x.avg == null ? "" : fix2(x.avg); tone(a, x.avg); }
    if(r) r.textContent = x.rank || "";
  });
  const td = [...document.querySelectorAll("td[data-cell]")].find(t => t.getAttribute("data-cell") === id + "|" + cid);
  const P = people().find(x => x.id === id);
  if(td){ td.classList.remove("is-auto"); if(col){ tone(td, mark(col, rowOf(id).cells[cid])); if(P) td.setAttribute("data-tip", tipOf(col, rowOf(id).cells[cid] || {}, P)); } }
  if(col && el && P) el.setAttribute("data-tip", tipOf(col, rowOf(id).cells[cid] || {}, P));
  ranked().forEach(x => { const a = [...document.querySelectorAll(".rk-avg")].find(t => t.getAttribute("data-a") === x.p.id);
    if(a) a.setAttribute("data-tip", `${x.p.name}'s final average: the average of their marks out of 5 (the columns with a score), ranked ${x.rank || "—"}. ${x.avg == null ? "" : TONE_TXT[toneCls(x.avg)] || ""}`); });
}
// the formula bar: a score's note (typed there, shown as Excel's red corner), a worked-out cell's formula, a text cell's text
function focusCell(el){
  R.act = el;
  const ref = document.getElementById("xlRef"), bar = document.getElementById("xlBar"); if(!ref || !bar) return;
  ref.textContent = el.getAttribute("data-ref") || "";
  const k = el.getAttribute("data-k");
  if(k === "mark5" || k === "raw"){
    const cell = rowOf(el.getAttribute("data-p")).cells[el.getAttribute("data-c")] || {};
    bar.readOnly = false; bar.value = cell.note || ""; bar.placeholder = "A note under this score, e.g. Initial feedback implemented.";
  } else {
    bar.readOnly = true; bar.placeholder = "";
    bar.value = el.getAttribute("data-f") || (el.tagName === "TEXTAREA" ? el.value.replace(/\n/g, " ⏎ ") : el.textContent.trim());
  }
  document.querySelectorAll(".xl .xl-sel").forEach(x => x.classList.remove("xl-sel"));
  (el.tagName === "TD" ? el : el.closest("td")).classList.add("xl-sel");
}
function moveFrom(el, dr, dc){
  const ri = Number(el.getAttribute("data-ri")) + dr, ci = Number(el.getAttribute("data-ci")) + dc;
  const to = [...document.querySelectorAll(".xl [data-ri]")].find(x => Number(x.getAttribute("data-ri")) === ri && Number(x.getAttribute("data-ci")) === ci);
  if(to){ to.focus(); if(to.select && to.tagName === "INPUT") to.select(); return true; }
  return false;
}

/* ---------- ⬇ Excel: a real .xlsx, with the sheet's formulas live in it ---------- */
const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for(let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
// a zip of the parts, stored (no compression): all an .xlsx needs
function zipParts(files){
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  files.forEach(f => {
    const name = enc.encode(f[0]), data = enc.encode(f[1]), crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  });
  const size = central.reduce((n, b) => n + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, off, true);
  return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
// a plain one-sheet .xlsx from rows of cells (numbers stay numbers): ⬇ Excel of the 📑 summary (js/ft-ranking-summary.js)
function xlsxOf(sheet, rows){
  const X = s => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const name = X(String(sheet || "Sheet1").replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31));
  const cell = (v, r, c) => { const at = letter(c) + (r + 1);
    return typeof v === "number" && isFinite(v) ? `<c r="${at}"><v>${v}</v></c>` : `<c r="${at}" t="inlineStr"><is><t xml:space="preserve">${X(v)}</t></is></c>`; };
  const data = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => cell(v, r, c)).join("")}</row>`).join("");
  return zipParts([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data}</sheetData></worksheet>`]]);
}
function xlsxParts(){
  const sc = sheetCols(), list = ranked(), first = 3, last = Math.max(first, first + list.length - 1), L = letter;
  const X = s => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const str = (r, s, v) => `<c r="${r}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
  // the export adds the notes under the scores as one column, before Additional Notes (Excel shows a cell note only on hover)
  const cols = sc.slice(0, -1).concat([{k: "snotes"}, sc[sc.length - 1]]);
  const width = {name: 26, notes: 34, mark5: 11, raw: 12, calc: 9, avg: 12, rank: 7, snotes: 34, ai: 48, addl: 42};
  const head = s => s.k === "snotes" ? "Notes on the scores" : headOf(s);
  const rows = [`<row r="1" ht="22" customHeight="1">${str("A1", 5, title())}</row>`,
    `<row r="2" ht="48" customHeight="1">${cols.map((s, i) => str(L(i) + "2", 1, head(s))).join("")}</row>`];
  list.forEach((x, ri) => {
    const row = first + ri, r = (R.data.rows || {})[x.p.id] || {cells: {}}, cells = r.cells || {};
    rows.push(`<row r="${row}">${cols.map((s, ci) => {
      const ref = L(ci) + row;
      if(s.k === "name") return str(ref, 3, x.p.name);
      if(s.k === "notes") return str(ref, 2, (cells[s.c.id] || {}).note || "");
      if(s.k === "mark5" || s.k === "raw"){ const v = num((cells[s.c.id] || {}).raw); return v == null ? `<c r="${ref}" s="6"/>` : `<c r="${ref}" s="6"><v>${v}</v></c>`; }
      if(s.k === "calc" || s.k === "avg" || s.k === "rank") return `<c r="${ref}" s="${s.k === "rank" ? 7 : 4}"><f>${X(formulaOf(s, ci, row, cols, first, last).slice(1))}</f></c>`;
      if(s.k === "ai") return str(ref, 2, aiText(x.p.id));
      if(s.k === "snotes") return str(ref, 2, R.data.cols.filter(c => c.type === "score" && (cells[c.id] || {}).note).map(c => `${c.label}: ${cells[c.id].note}`).join("\n"));
      return str(ref, 2, r.notes || "");
    }).join("")}</row>`);
  });
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="2" topLeftCell="B3" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/><cols>${cols.map((s, i) => `<col min="${i + 1}" max="${i + 1}" width="${width[s.k] || 14}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows.join("")}</sheetData><mergeCells count="1"><mergeCell ref="A1:${L(cols.length - 1)}1"/></mergeCells>
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts>
<fonts count="4"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF5B9A32"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const sheetName = X(`Week ${R.week}`);
  return [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml", sheet], ["xl/styles.xml", styles]];
}

function renderRanking(){
  if(!R.people){ if(!R.loading) loadPeople(); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Loading the batches…</div>`; }
  const bs = batches();
  if(R.batch && R.key !== keyOf(R.batch, R.week)) loadWeek();
  const top = `<div class="rk-bar"><div><h2>📊 Weekly Ranking Report</h2><p class="sc-about">The facilitator’s weekly progress report and ranking for a batch: each activity’s score converted to a mark out of 5, the week’s final average, and the trainees ranked by it. Connected to every scorecard: the Daily Compliance, the Drive links’ compliance and 🏅 the Scorecard’s overall (every grading system), filled from the platform.</p></div>
    <span class="rk-pick"><select onchange="FTRanking.batch(this.value)">${bs.length ? bs.map(b => `<option ${b === R.batch ? "selected" : ""}>${e(b)}</option>`).join("") : `<option>No batches</option>`}</select>
      <select onchange="FTRanking.week(this.value)">${[1, 2, 3, 4, 5, 6].map(w => `<option value="${w}" ${w === R.week ? "selected" : ""}>Week ${w}</option>`).join("")}</select></span></div>`;
  if(!R.batch) return `<div class="card rk">${top}<p class="sc-empty">No approved trainees yet.</p></div>`;
  if(R.dataLoading) return `<div class="card rk">${top}<p class="sc-empty">Opening ${e(title())}…</p></div>`;
  // (a week that is over drafts its own report: autoDraft)
  if(!R.data && weekOver()){ setTimeout(autoDraft, 0); return `<div class="card rk">${top}<p class="sc-empty">🤖 Week ${R.week} is over: drafting ${e(title())} from the platform…</p></div>`; }
  if(!R.data) return `<div class="card rk">${top}<div class="rk-start"><b>${e(title())}</b> hasn’t been started. It drafts itself once the week’s Friday shift is over, or start it now with:
      <div class="rk-acts">${Object.keys(TEMPLATES).map(k => `<button class="btn btn-ghost btn-sm" onclick="FTRanking.start('${k}')">${TEMPLATES[k].label}</button>`).join("")}
        ${R.week > 1 ? `<button class="btn btn-navy btn-sm" onclick="FTRanking.start('last')">↻ Week ${R.week - 1}’s columns</button>` : ""}</div>
      <p class="sc-about">The columns can be changed any time (✎ Columns). Nothing about a trainee is filled in until you type it or ⤓ fill it from the platform.</p></div></div>`;
  return `<div class="card rk">${top}
    <div class="rk-title"><b>${e(title())}</b><span id="rkSaved" class="rk-saved">${R.saved ? "✓ Saved" : "Saving…"}</span>
      <span class="rk-acts"><button class="btn btn-ghost btn-sm" onclick="FTRanking.explain()" title="Where each column's score comes from, and one trainee's evidence">ℹ How it’s scored</button><button class="btn btn-ghost btn-sm" onclick="FTRanking.toggleEdit()">✎ Columns</button>
        <button class="btn btn-ghost btn-sm" ${R.fill ? "disabled" : ""} onclick="FTRanking.fill()" title="Fill the empty score cells of the columns that have a source, from the trainees' grades on the platform">${R.fill ? "Filling…" : "⤓ Fill from the platform"}</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.foldAll()" title="Fold every column away but the marks out of 5, the average, the rank and the AI summary (a column's letter folds or shows it alone)">${sheetCols().some(folded) ? "▸◂ Expand all" : "◂▸ Collapse all"}</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.sort()" title="${R.sort === "rank" ? "Sorted by the final average, highest first. Click for A–Z by name." : "Sorted A–Z by name. Click for highest to lowest."}">↕ ${R.sort === "rank" ? "Highest to lowest" : "A–Z"}</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.copy()">📋 Copy</button>
        <button class="btn btn-navy btn-sm" onclick="FTRanking.excel()">⬇ Excel</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.share(this)" title="Each trainee sees their own row only: their marks, notes, average and rank">📤 ${R.data.sharedAt ? "Share again" : "Share with the trainees"}</button></span></div>
    ${R.data.sharedAt ? `<p class="rk-shared">📤 Shared with the trainees ${e(new Date(R.data.sharedAt).toLocaleString())}: each sees their own row on 📬 My Feedback and 🏅 My Performance. Changes since then reach them when you share again.</p>` : ""}
    ${autoBanner()}${R.explain ? explainHtml() : ""}${R.edit ? columnsEditor() : ""}${grid()}
    <p class="sc-how">Type a score in its cell (Tab or → to the next, Enter or ↓ to the trainee below). A score out of its points gets its mark out of 5 in the grey ÷ 5 column beside it; a column out of 5 is already a mark. The grey cells are worked out (select one to see its formula in the bar): the final average is the average of the row’s marks (empty cells don’t count) and the rank follows it. A score’s note goes in the bar above the sheet (a red corner marks it). ⬇ Excel keeps the formulas; ⬇ Word is the facilitator’s report layout, ranked.</p></div>`;
}

/* ---------- 🤖 the week's report, drafted by itself ----------
   Once a batch's week is over (its Friday's shift has ended, weekOver) and nobody has started that week's report, opening it
   drafts it: last week's columns (Week 1's on the first), the Daily Compliance column in, the Spelling & Typing dates the week's,
   every empty score ⤓ filled from the platform, and each trainee's Additional Notes ✨ drafted in the facilitator's feedback DNA.
   It is marked a draft (auto: {at, state, approved: false}) until the trainer, having checked it, ✓ Approves it: only then can it
   be 📤 shared with the trainees. Opened from 📈 Overall Performance or a trainer's dashboard card too (FTRanking.open). */
const md = iso => { const [, m, d] = String(iso).split("-"); return `${+m}/${+d}`; };
async function autoDraft(){
  const key = R.key; if(!R.batch || R.auto === key) return; R.auto = key;
  let cols = R.week > 1 ? await prevWeek() : null;
  if(R.key !== key || R.data) return;
  cols = (cols || (R.week === 1 ? TEMPLATES.week1.cols() : BASE())).map(c => Object.assign({}, c, {id: uid()}));
  if(!cols.some(c => c.src === "compliance")) cols.splice(1, 0, COL("Daily Compliance", "", 5, "compliance", "week"));
  cols = connectAll(cols);
  const r = weekRange();
  // (the week's own dates on the Spelling & Typing column, not last week's)
  if(r) cols.forEach(c => { if(c.src === "skills") c.sub = `${md(r[0])} to ${md(r[1])}`; });
  R.data = {batch: R.batch, week: R.week, cols, rows: {}, createdAt: new Date().toISOString(), auto: {at: new Date().toISOString(), state: "filling", approved: false}};
  save(); rerender();
  return finishDraft(key);
}
// the draft's ⤓ fill and ✨ notes. The report can be read again while they run (↻ the Batch Sheet's 🔄 Update, FTRanking.reload,
// sets R.data to null and reads it back under the same key): each step goes on only while the draft is still the report on
// screen, and loadWeek picks a draft that isn't done back up here, so it never stops halfway at "filling…"
async function finishDraft(key){
  if(R.draftRun === key) return; R.draftRun = key;
  const D = R.data, live = () => R.key === key && R.data === D && !!D && !!D.auto && !D.auto.approved;
  try{
    if(!live()) return;
    if(R.data.auto.state === "filling"){ await fillFromPortal(); if(!live()) return; R.data.auto.state = "notes"; save(); rerender(); }
    // (the AI unavailable: the first trainee's notes fail, and the rest are left for the trainer rather than each waiting on it)
    for(const p of people()){ if(!live()) return; if(!String((rowOf(p.id).notes) || "").trim() && !(await draftNotes(p.id, true))){ if(!live()) return; R.data.auto.noNotes = true; break; } }
    if(!live()) return;
    R.data.auto.state = "done"; save(); rerender();
  }finally{
    if(R.draftRun === key) R.draftRun = null;
    // (read again meanwhile: the copy now on screen goes on from where its saved draft stopped; still being read, loadWeek does it)
    const N = R.data;
    if(R.key === key && N && N !== D && N.auto && !N.auto.approved && N.auto.state !== "done") setTimeout(() => { if(R.key === key) finishDraft(key); }, 0);
  }
}
const autoBanner = () => {
  const a = R.data && R.data.auto; if(!a) return "";
  if(a.approved) return `<p class="rk-shared">🤖 Drafted automatically ${e(new Date(a.at).toLocaleString())} · ✓ approved ${e(new Date(a.approvedAt).toLocaleString())}.</p>`;
  const st = a.state === "filling" ? "⤓ filling the scores from the platform…" : a.state === "notes" ? "✨ drafting each trainee’s notes…" : a.noNotes ? "ready for your review · the AI wasn’t available, so the Additional Notes are yours to write (✨ drafts one)" : "ready for your review";
  return `<div class="rk-auto"><b>🤖 Drafted automatically</b> ${e(new Date(a.at).toLocaleString())}: the week’s columns, every score filled from the platform (⤓) and each trainee’s notes in the facilitator’s voice. <i>${st}</i>
    <span class="rk-acts">${a.state === "done" ? `<button class="btn btn-navy btn-sm" onclick="FTRanking.approve()">✓ Approve the report</button>` : ""}</span>
    <small>Check the scores and notes, change what needs changing, then approve it. Only an approved report can be shared with the trainees.</small></div>`;
};
const prevWeek = async () => { try{ const v = await sharedGet(keyOf(R.batch, R.week - 1)); return v && Array.isArray(v.cols) ? v.cols : null; }catch(err){ return null; } };
window.addEventListener("ft-roster-changed", () => { R.people = null; });
/* ℹ HOW IT'S SCORED: where each column's score comes from (its source, as ⤓ fills it), and — for the trainee picked — the
   evidence behind their row: each Drive link, the Task Tracker's days, the Monitoring Sheet, the TAM, the tests found, the EOD
   and each day's compliance, with why a part is 0 or empty (a file the system can't read, nothing found). */
const HOW = {
  skills: "The Typing & Spelling log for the column’s dates: the tests taken on the platform and the screenshots in the trainee’s Typing Tests, Spelling Tests and Assessments/Activities folders (named with the date and AM/PM). Every weekday needs the AM and PM typing tests and the spelling test. NO SUBMISSION: nothing found for those dates.",
  "day:monitor": "The Monitoring Sheet, day by day: each day counts the classroom discussions due by then (one a training day), each entry checked for a date, 5 takeaways, questions and the understanding rated. The week’s average, out of 5. Empty: not linked, or the system can’t read the file.",
  "day:tracker": "The Daily Task Tracker, day by day: each training day’s Daily Notes and outputs on the sheet (a trainer’s score for the day where given). The week’s average, out of 5. Empty: not linked, or the system can’t read the sheet.",
  "day:tests": "The Typing & Spelling Tests, day by day: of the three a day (AM typing, PM typing, spelling), how many were taken on the platform or saved as screenshots in Drive. The week’s average, out of 5.",
  "day:instructions": "Following Instructions, day by day (strict): the naming convention (answer sheets, test screenshots), the folder structure and saving route (screenshots in the Typing / Spelling Tests folders, the six Drive links), and the deliverables on time (the three tests that day, the EOD before the end of the shift, the Task Tracker updated, answer sheets by their due time). The share followed each day; a day already over keeps what was found then, so fixing something later doesn't undo it. The week's average, out of 5.",
  "day:eod": "The EOD email, day by day: checked against its template (the subject with the date, Accomplishments, 3 learnings of 2 sentences, On queue for tomorrow, sent before the end of the shift). The week’s average, out of 5.",
  compliance: "Daily Compliance: each training day’s end-of-shift check, all of its parts together (Monitoring Sheet, Task Tracker, Typing & Spelling Tests, EOD, Following Instructions, the day’s outputs and work on the platform; the TAM on a day a trainer graded it for shadowing). The week’s average, out of 5.",
  links: "Drive Links Compliance: how many of the six monitored Drive links are ✓ Correct (🔗 Drive Links → ✅ Compliance), out of 5.",
  overall: "🏅 Scorecard overall: every grading system on the platform averaged (the same Overall as 🏅 My Performance), out of 5."
};
const howOf = c => !c.src ? "Typed by the trainer: the platform doesn’t fill it." : HOW[c.src] || (/^kc:/.test(c.src) ? `The Knowledge Check of “${c.src.slice(3)}”: its score.` : /^trainer:/.test(c.src) ? `The trainer’s scorecard for “${c.src.slice(8)}” (Trainer Inputs): its score.` : /^drive:/.test(c.src) ? `The graded “${c.src.slice(6)}” (the answer sheet graded on the platform): its score.` : `The platform’s “${c.src}” grades: their score.`) ;
function explainHtml(){
  const X = R.explain, ppl = people(), who = X.who && ppl.some(p => p.id === X.who) ? X.who : (ppl[0] || {}).id;
  if(who && X.loaded !== who && !X.loading) setTimeout(() => FTRanking.explainWho(who), 0);
  const ev = X.loaded === who ? X.ev : null, wk = weekRange();
  const pc = v => typeof v === "number" ? v + "%" : "—";
  let mine = "";
  if(ev){
    const rv = ev.rv || {}, dv = ev.dv || {}, sk = ev.sk || {}, ver = rv.verify || {}, nf = (rv.notFound || {}).keys || [];
    const LBL = {monitor: "📒 Monitoring Sheet", tam: "📘 TAM", typing: "⌨️ Typing Tests folder", spelling: "🔤 Spelling Tests folder", folder: "📁 Assessments/Activities", tracker: "📋 Daily Task Tracker"};
    const links = Object.keys(LBL).map(k => `<li><b>${LBL[k]}</b>: ${!dv[k] ? (nf.includes(k) ? "✗ not in their Drive (the batch’s Drive was searched)" : "— not linked") : ver[k] && ver[k].url === String(dv[k]).slice(0, 500) ? (ver[k].ok ? "✓ opens" : "✗ " + e(ver[k].error || "can’t be opened")) : "⏳ not checked yet"}</li>`).join("");
    const days = Object.entries(rv.days || {}).filter(([d]) => !wk || (d >= wk[0] && d <= wk[1])).sort();
    const trk = days.length ? days.map(([d, x]) => { const bad = (x.rules || []).find(r => !r.pass); return `<li>${e(d)}: ${pc(x.pct)}${bad ? ` — ${e(bad.label)}${bad.detail ? ": " + e(bad.detail) : ""}` : ""}</li>`; }).join("") : "<li>No day of the Task Tracker checked this week.</li>";
    const m = rv.monitor, mon = !m ? "Not checked yet." : m.error ? "✗ " + e(m.error) : `${m.found} of ${m.total} discussions found, ${pc(m.pct)} complete (checked ${e(String(m.checkedAt || "").slice(0, 10))}).`;
    const t = rv.tam, tam = "Not part of the daily score: graded only for a shadowing activity (📋 Batch Sheet → 📤 Daily outputs → 📘 Grade the TAM). " + (!t ? (dv.tam ? "Not graded yet." : "Not linked.") : t.error ? "✗ " + e(t.error) : `Last graded ${e(String(t.checkedAt || "").slice(0, 10))}: ${Object.keys(t.entries || {}).length} dated entr${Object.keys(t.entries || {}).length === 1 ? "y" : "ies"}.`);
    const sh = rv.shots || {}, shots = (sh.files || []), inW = x => !wk || (x.date >= wk[0] && x.date <= wk[1]);
    const tests = `On the platform: ${(sk.typing || []).filter(inW).length} typing, ${(sk.spelling || []).filter(inW).length} spelling. Screenshots in Drive: ${shots.filter(inW).length}${sh.error ? ` (✗ the folders can’t be read: ${e(sh.error)})` : (sh.unread || []).length ? ` (✗ can’t read: ${e(sh.unread.join(", "))})` : ""}${sh.checkedAt ? `, checked ${e(String(sh.checkedAt).slice(0, 10))}` : ", not checked yet"}.`;
    const comp = Object.entries(rv.compliance || {}).filter(([d]) => !wk || (d >= wk[0] && d <= wk[1])).sort();
    const P = ["monitor", "tracker", "tests", "eod", "instructions", "outputs", "platform", "tam"];
    const ctab = comp.length ? `<table class="rk-xt"><tr><th>Day</th><th>All</th>${P.map(k => `<th>${k === "tests" ? "Typing & Spelling" : k === "instructions" ? "Following Instructions" : k === "tam" ? "TAM (shadowing)" : k === "eod" ? "EOD" : k[0].toUpperCase() + k.slice(1)}</th>`).join("")}</tr>${comp.map(([d, x]) => `<tr><td>${e(d)}</td><td><b>${pc(x.pct)}</b></td>${P.map(k => `<td>${pc((x.parts || {})[k])}</td>`).join("")}</tr>`).join("")}</table>${comp.some(([, x]) => (x.unreadable || []).length) ? `<p class="rk-xn">“—” for a part: nothing to check that day, or the file can’t be read (${e([...new Set(comp.flatMap(([, x]) => x.unreadable || []))].join(", "))}).</p>` : ""}` : "<p>No day checked this week yet: each training day is checked at the end of the shift (🔄 Update all scores on the 📋 Batch Sheet runs today’s check now).</p>";
    mine = `<div class="rk-xw"><h4>🔗 Drive links</h4><ul>${links}</ul><h4>📋 Task Tracker, this week</h4><ul>${trk}</ul><h4>📒 Monitoring Sheet</h4><p>${mon}</p><h4>📘 TAM</h4><p>${tam}</p><h4>🧪 Typing & Spelling, this week</h4><p>${tests}</p><h4>✅ Each day’s check</h4>${ctab}</div>`;
  }
  return `<div class="rk-explain card"><div class="rk-xh"><b>ℹ How the scores are tracked</b><button class="btn btn-ghost btn-sm" onclick="FTRanking.explain()">✕ Close</button></div>
    <p class="rk-xn">A cell with ⤓ was filled by the platform: it is filled again from the scorecards each time the report opens and after every 🔄 Update on the 📋 Batch Sheet (approved reports too). A cell you type is kept as you typed it. Each training day is checked at the end of the shift (the Monitoring Sheet, the Task Tracker, the Typing & Spelling Tests and the EOD); 🔄 Update all scores runs today’s check now.</p>
    <ul class="rk-xcols">${(R.data.cols || []).map(c => `<li><b>${e(c.label)}</b>${c.type === "score" ? ` <small>(${e(c.max)} points → out of 5)</small>` : ""}: ${e(howOf(c))}</li>`).join("")}</ul>
    <label class="rk-xp"><b>🔎 One trainee’s evidence${wk ? ` (${e(wk[0])} to ${e(wk[1])})` : ""}:</b> <select onchange="FTRanking.explainWho(this.value)">${ppl.map(p => `<option value="${e(p.id)}" ${p.id === who ? "selected" : ""}>${e(p.name)}</option>`).join("")}</select></label>
    ${ev ? mine : `<p class="rk-xn">Reading…</p>`}</div>`;
}
window.FTRanking = {
  explain(){ R.explain = R.explain ? null : {}; rerender(); },
  async explainWho(id){ if(!R.explain) return; R.explain.who = id; R.explain.loading = true;
    let v = []; try{ v = await sharedGetMany(["trackerreview:", "drive:", "skills:"].map(k => k + id)); }catch(err){}
    if(!R.explain) return; R.explain.loading = false; R.explain.loaded = id; R.explain.ev = {rv: v[0] || {}, dv: v[1] || {}, sk: v[2] || {}}; rerender(); },
  // (📑 the management summary, js/ft-ranking-summary.js: the week on screen, its trainees and dates, and a redraw)
  ctx(){ return {batch: R.batch, week: R.week, people: people(), range: weekRange(), rerender}; },
  fold(k){ const f = foldSet(); if(f.has(k)) f.delete(k); else f.add(k); saveFolds(); rerender(); },
  foldAll(){ const f = foldSet(), sc = sheetCols();
    if(sc.some(folded)) f.clear(); else sc.forEach(s => { if(["raw", "notes", "addl"].includes(s.k)) f.add(fk(s)); });
    saveFolds(); rerender(); },
  // 📋 the Batch Sheet shows the report under its 📅 Day 1–16 scores, for the batch it shows (its own batch picker hidden there)
  embed(batch){ if(batch && R.batch !== batch){ R.batch = batch; R.key = ""; R.data = null; R.edit = false; if(!R.weekSet) R.week = weekNow(); } return renderRanking(); },
  // (the report is the Batch Sheet's batch: picking one moves the sheet too)
  batch(b){ R.batch = b; R.key = ""; R.data = null; R.edit = false; R.week = weekNow(); if(window.FTBatchSheet && (state.adminTab === "batchsheet" || state.adminTab === "weeklyreports")) FTBatchSheet.batch(b); else render(); },
  approve(){ if(!R.data || !R.data.auto) return; R.data.auto.approved = true; R.data.auto.approvedAt = new Date().toISOString(); save(); toast("✓ Approved: you can 📤 share it with the trainees now."); render(); },
  // opened on a batch's week from elsewhere (📈 Overall Performance, the trainer's dashboard card)
  open(batch, week){ if(batch) R.batch = batch; if(week){ R.week = Number(week); R.weekSet = true; } R.key = ""; R.data = null; toRanking(batch); },
  week(w){ R.week = Number(w) || 1; R.key = ""; R.data = null; R.edit = false; render(); },
  async start(k){
    let cols = k === "last" ? await prevWeek() : (TEMPLATES[k] || TEMPLATES.blank).cols();
    if(!cols){ toast(`Week ${R.week - 1} has no report for ${R.batch} yet.`); return; }
    cols = connectAll(cols.map(c => Object.assign({}, c, {id: uid()})));
    R.data = {batch: R.batch, week: R.week, cols, rows: {}, createdAt: new Date().toISOString()}; R.edit = k !== "last"; save(); render();
  },
  toggleEdit(){ R.edit = !R.edit; render(); },
  col(i, f, v){ const c = R.data.cols[i]; if(!c) return; c[f] = f === "max" ? (num(v) > 0 ? num(v) : 5) : String(v).trim(); if(f === "type" && v === "score" && c.max == null) c.max = 5; save(); render(); },
  addCol(t){ R.data.cols.push(t === "notes" ? {id: uid(), label: "Notes", sub: "", type: "notes"} : COL("New activity", "", 5)); save(); render(); },
  delCol(i){ if(!confirm("Remove this column and its scores?")) return; const c = R.data.cols.splice(i, 1)[0]; Object.values(R.data.rows).forEach(r => { if(r.cells) delete r.cells[c.id]; }); save(); render(); },
  moveCol(i, d){ const l = R.data.cols, j = i + d; if(j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; save(); render(); },
  cell(id, cid, f, v){ const r = rowOf(id); const c = r.cells[cid] = r.cells[cid] || {}; c[f] = String(v).trim(); if(f === "raw") delete c.auto; if(f === "note") c.noteBy = "trainer"; save(); if(f === "raw") paintFigures(id, cid); },
  focus: focusCell,
  key(ev, el){
    const txt = el.tagName === "TEXTAREA", k = ev.key;
    const go = (dr, dc) => { if(moveFrom(el, dr, dc)) ev.preventDefault(); };
    if(k === "ArrowDown" && !txt) go(1, 0); else if(k === "ArrowUp" && !txt) go(-1, 0);
    else if(k === "Enter" && !ev.shiftKey && !txt){ if(el.tagName === "INPUT") el.blur(); go(1, 0); }
    else if(k === "ArrowRight" && (el.tagName === "TD" || (el.tagName === "INPUT" && el.selectionStart === el.value.length))) go(0, 1);
    else if(k === "ArrowLeft" && (el.tagName === "TD" || (el.tagName === "INPUT" && el.selectionStart === 0))) go(0, -1);
  },
  // the bar: the selected score's note
  bar(v){
    const el = R.act; if(!el) return; const k = el.getAttribute("data-k"); if(k !== "mark5" && k !== "raw") return;
    const id = el.getAttribute("data-p"), cid = el.getAttribute("data-c"); FTRanking.cell(id, cid, "note", v);
    const td = el.closest("td"); if(td){ td.classList.toggle("has-note", !!String(v).trim()); td.title = String(v).trim(); }
  },
  sort(){ R.sort = R.sort === "rank" ? "name" : "rank"; render(); },
  // 📤 each trainee gets their own row of this week (rankshare:<id>, which only they and the trainers read)
  async share(btn){
    if(R.data && R.data.auto && !R.data.auto.approved){ toast("Approve the drafted report first (✓ Approve the report)."); return; }
    const list = ranked(), of = list.filter(x => x.rank).length;
    if(!of){ toast("Score the trainees first."); return; }
    if(!confirm(`Share ${title()} with the ${list.length} trainee${list.length === 1 ? "" : "s"} of ${R.batch}? Each sees only their own row: marks, notes, average and rank.`)) return;
    btn.disabled = true; let bad = 0; const at = new Date().toISOString();
    for(const x of list){
      const r = (R.data.rows || {})[x.p.id] || {cells: {}};
      const row = {batch: R.batch, week: R.week, title: title(), avg: x.avg == null ? null : Math.round(x.avg * 100) / 100, rank: x.rank, of, notes: r.notes || "", sharedAt: at,
        cols: R.data.cols.map(c => { const cell = (r.cells || {})[c.id] || {}, m = mark(c, cell); return {label: c.label, sub: c.sub || "", type: c.type, max: c.type === "score" ? num(c.max) : null, raw: cell.raw == null ? "" : cell.raw, mark: m == null ? null : Math.round(m * 100) / 100, note: cell.note || ""}; })};
      try{ const cur = (await sharedGet("rankshare:" + x.p.id)) || {}; cur.weeks = cur.weeks || {}; cur.weeks[`${R.batch}|${R.week}`] = row; if(await sharedSet("rankshare:" + x.p.id, cur) === false) bad++; }catch(err){ bad++; }
    }
    if(!bad){ R.data.sharedAt = at; save(); }
    toast(bad ? `Couldn’t share with ${bad} trainee(s). Try again.` : `📤 Shared: each trainee sees their own row.`);
    btn.disabled = false; render();
  },
  xlsxOf,
  excel(){
    const a = document.createElement("a"); a.href = URL.createObjectURL(zipParts(xlsxParts())); a.download = `${title()}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  notes(id, v){ rowOf(id).notes = String(v).trim(); save(); },
  fill: fillFromPortal, draft: draftNotes,
  download(){
    const blob = new Blob(["﻿", wordDoc()], {type: "application/msword"}), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${title()}.doc`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  async copy(){
    const html = `<p><b>${e(title())}</b></p>` + reportTable();
    try{ await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([html], {type: "text/html"}), "text/plain": new Blob([document.createRange().createContextualFragment(html).textContent], {type: "text/plain"})})]); toast("📋 Copied — paste it into the Google Doc or Word file."); }
    catch(err){ toast("Couldn’t copy. Use ⬇ Word instead."); }
  },
  print(){ const w = window.open("", "_blank"); if(!w){ toast("Allow pop-ups to print."); return; } w.document.write(wordDoc()); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); },
  // for the checks
  report: () => R.data && {title: title(), ranked: ranked().map(x => ({id: x.p.id, name: x.p.name, avg: x.avg == null ? null : fix2(x.avg), rank: x.rank}))},
  reload(){ R.people = null;
    // (🤖 a draft still being written is the newest the report can be: kept on screen, not read back from what it has saved so far)
    if(!(R.draftRun && R.draftRun === R.key && R.data)){ R.key = ""; R.data = null; }
    render(); }
};

/* 📊 no tab of its own: the report is in 📋 Batch Sheet, under 📅 Day 1–16: Detailed Scores (FTRanking.embed). An old link,
   a saved tab or FTRanking.open lands there, on the report, for the batch asked for. */
function toRanking(batch){
  state.adminTab = "weeklyreports";
  if(batch && window.FTBatchSheet && state.isAdmin) FTBatchSheet.batch(batch);
  if(state.view !== "admin") goto("admin"); else render();
  let n = 0; const t = setInterval(() => { const el = document.getElementById("bs-ranking"); if(el || ++n > 40){ clearInterval(t); if(el) el.scrollIntoView({behavior: "smooth", block: "start"}); } }, 250);
}
ftAdminTab("ranking", "📊 Weekly Ranking", () => { setTimeout(() => toRanking(R.batch), 0); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">📊 The Weekly Ranking is in 📋 Batch Sheet, under the Day 1–16 scores…</div>`; });

(function(){ const s = document.createElement("style"); s.id = "ft-ranking"; s.textContent = `
.rk{padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
.rk-bar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;}
.rk-bar h2{margin:0 0 4px;}
.rk-pick{display:flex;gap:6px;}
.rk-pick select{padding:6px 10px;border-radius:8px;border:1px solid var(--line,#dfe3ec);font:inherit;font-weight:700;}
.rk-start{border:1px dashed #C9CFDC;border-radius:12px;padding:16px;background:#F8F9FC;}
.rk-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;}
.rk-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:15px;}
.rk-title .rk-acts{margin:0 0 0 auto;}
.rk-saved{font-size:12px;color:var(--ink-soft);}
.rk-shared{margin:0;font-size:12.5px;color:#1E7F4F;background:#E7F5EE;border-radius:8px;padding:6px 10px;}
.rk-auto{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:13px;background:#FFF7ED;border:1px solid #F4B77A;border-radius:10px;padding:8px 12px;}
.rk-auto small{flex-basis:100%;color:var(--ink-soft);} .rk-auto .rk-acts{margin:0 0 0 auto;}
.rk-cols{border:1px solid #E3E7F0;border-radius:12px;padding:12px;background:#F8F9FC;}
.rk-h{margin:0 0 8px;font-weight:800;}
.rk-h span{font-weight:400;color:var(--ink-soft);font-size:12.5px;}
.rk-col{display:grid;grid-template-columns:150px minmax(140px,1.4fr) minmax(140px,1fr) 110px minmax(150px,1fr) auto;gap:6px;align-items:center;margin-bottom:6px;}
.rk-col input,.rk-col select{padding:5px 8px;border:1px solid #D5DAE5;border-radius:7px;font:inherit;font-size:13px;min-width:0;}
.rk-max{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--ink-soft);}
.rk-src{display:flex;flex-direction:column;gap:4px;} .rk-src select{width:100%;}
.rk-max input{width:64px;}
.rk-col-ad{display:flex;gap:4px;}
/* the sheet: Excel's look — column letters, row numbers, gridlines, a formula bar, the header row and names frozen */
.xl-fbar{display:flex;align-items:stretch;border:1px solid #C8C8C8;border-radius:4px;background:#fff;font:13px Calibri,'Segoe UI',Arial,sans-serif;}
.xl-ref{min-width:64px;padding:5px 8px;border-right:1px solid #C8C8C8;font-weight:700;color:#217346;text-align:center;}
.xl-fx{padding:5px 10px;border-right:1px solid #C8C8C8;font-style:italic;color:#6B6B6B;font-family:Georgia,serif;}
#xlBar{flex:1 1 auto;border:0;padding:5px 8px;font:inherit;outline:none;min-width:0;}
#xlBar[readonly]{color:#444;background:#FAFAFA;}
.xl-wrap{overflow:auto;max-height:62vh;border:1px solid #C8C8C8;background:#fff;}
.xl{border-collapse:separate;border-spacing:0;font:700 17px Calibri,'Segoe UI',Arial,sans-serif;color:#1F1F1F;}
/* (every trainee's row the same height, for balance: a long note scrolls inside its cell) */
/* (every trainee's row the same height, for balance; the text columns narrower, so the sheet leaves room for the other
   scorecards — a long note or summary scrolls inside its own cell) */
.xl-row > td,.xl-row > th{height:76px;box-sizing:border-box;}
.xl-row .xl-txt{height:72px;overflow-y:auto;font-size:15px;font-weight:700;line-height:1.3;padding:3px 6px;}
.xl-clip{max-height:66px;overflow-y:auto;}
.xl-row td.xl-aisum{font-size:14.5px;font-weight:600;line-height:1.35;padding:3px 6px;}
.xl-num{font-weight:900 !important;font-size:19px;}
.xl-calc{font-size:19px;font-weight:900 !important;}
.t-ex{background:#CFE0FF !important;color:#0A3A9E !important;} .t-gd{background:#CDEFD8 !important;color:#0F5A2A !important;}
.t-ok{background:#FFE9A3 !important;color:#6B4A00 !important;} .t-lo{background:#FBCFCB !important;color:#A0150C !important;}
.t-ex .xl-in,.t-gd .xl-in,.t-ok .xl-in,.t-lo .xl-in{color:inherit;}
.rk-legend{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:16px;font-weight:800;margin-top:6px;} .rk-legend span{padding:2px 9px;border-radius:999px;font-weight:800;} .rk-legend small{color:var(--ink-soft);}
#rkTip{position:fixed;z-index:10080;display:none;background:#1E2340;color:#fff;font:600 13px/1.45 'Segoe UI',Arial,sans-serif;padding:9px 12px;border-radius:10px;box-shadow:0 8px 24px rgba(20,24,50,.3);pointer-events:none;white-space:normal;}
.xl th,.xl td{border-right:1px solid #D4D4D4;border-bottom:1px solid #D4D4D4;padding:0;}
.xl-letters th{position:sticky;top:0;z-index:4;background:#F3F3F3;color:#555;font-weight:400;font-size:11.5px;height:20px;text-align:center;min-width:76px;}
.xl-letters th.xl-l:not(.xl-frz){cursor:pointer;} .xl-letters th.xl-l:not(.xl-frz):hover{background:#E3ECDC;}
.xl th.xl-folded,.xl td.xl-fold{min-width:14px !important;width:14px;max-width:14px;padding:0 !important;background:repeating-linear-gradient(90deg,#EEF1F4,#EEF1F4 3px,#E1E5EA 3px,#E1E5EA 6px);}
.xl-head th.xl-h-ai{min-width:260px;background:#2F5D8C;}
.xl td.xl-aisum{min-width:260px;max-width:340px;white-space:normal;font-size:12.5px;line-height:1.45;vertical-align:top;padding:5px 7px;background:#F4F8FC;color:#1E2340;}
.xl td.xl-aisum.is-plain{color:#3C4043;font-style:italic;} .xl td.xl-aisum .xl-wait{color:#80868B;font-style:italic;}
.xl-corner,.xl-rn{position:sticky;left:0;z-index:5;background:#F3F3F3 !important;color:#555;font-weight:400 !important;font-size:11.5px;width:34px;min-width:34px !important;text-align:center;}
.xl-corner{top:0;z-index:6;}
.xl-title td{padding:5px 8px;font-size:17px;background:#fff;}
.xl-head th{position:sticky;top:20px;z-index:3;background:#5B9A32;color:#fff;font-weight:900;font-size:15px;padding:5px 6px;vertical-align:middle;text-align:center;line-height:1.25;white-space:normal;}
.xl-head th,.xl-head th *{word-break:normal !important;overflow-wrap:normal !important;hyphens:none !important;}   /* (whole words in a heading: "Monitoring", never "Monitorin g") */
.xl-head th.xl-h-name{min-width:150px;} .xl-head th.xl-h-notes{min-width:150px;max-width:190px;} .xl-head th.xl-h-addl{min-width:190px;}
.xl-head th.xl-h-calc,.xl-head th.xl-h-avg,.xl-head th.xl-h-rank{background:#4A7F28;}
.xl .xl-frz{position:sticky;left:34px;z-index:2;background:#fff;}
.xl-head .xl-frz{z-index:4;background:#5B9A32;}
.xl-head th.xl-rn{color:#555;font-weight:400;}
.xl-name{padding:4px 8px !important;font-weight:900;font-size:17.5px;min-width:150px;vertical-align:middle;outline:none;}
.xl-td{position:relative;vertical-align:top;}
.xl-in{display:block;width:100%;border:0;border-radius:0;background:transparent;font:inherit;color:inherit;padding:4px 6px;outline:none;resize:none;}
.xl-num{text-align:right;min-width:76px;}
.xl-txt{min-width:150px;line-height:1.3;}
.xl-calc{background:#F2F2F2;text-align:right;padding:4px 8px !important;font-weight:700;vertical-align:top;outline:none;min-width:64px;}
.xl-avg{color:#1F4E2C;} .xl-rank{text-align:center;color:#B5651F;}
.xl td.xl-sel,.xl td:focus{box-shadow:inset 0 0 0 2px #217346;}
.xl-td.has-note::after{content:"";position:absolute;top:0;right:0;border-left:7px solid transparent;border-top:7px solid #D13438;}
.rk-explain{margin:10px 0;padding:14px 16px;border-left:5px solid var(--orange);font-size:14px;line-height:1.5;} .rk-xh{display:flex;justify-content:space-between;align-items:center;font-size:16px;color:var(--navy);margin-bottom:6px;}
.rk-xn{color:var(--ink-soft);font-size:13px;margin:4px 0;} .rk-xcols{margin:6px 0 10px;padding-left:18px;} .rk-xcols li{margin:3px 0;} .rk-xp{display:block;margin:10px 0 6px;} .rk-xp select{font:inherit;padding:4px 8px;}
.rk-xw h4{margin:10px 0 2px;color:var(--navy);font-size:14px;} .rk-xw ul{margin:2px 0;padding-left:18px;} .rk-xw p{margin:2px 0;}
.rk-xt{border-collapse:collapse;font-size:13px;margin-top:4px;} .rk-xt th,.rk-xt td{border:1px solid #E3E6EF;padding:3px 7px;text-align:center;} .rk-xt th{background:#F4F6FA;}
.xl-td.is-auto::before{content:"⤓";position:absolute;bottom:1px;left:2px;font-size:9px;color:#217346;}
.xl-addl{min-width:190px;}
.xl-ai{position:absolute;top:2px;right:2px;border:1px solid #D4D4D4;background:#fff;border-radius:4px;font-size:11px;padding:0 4px;cursor:pointer;opacity:.75;}
.xl-ai:hover{opacity:1;}
@media(max-width:900px){.rk-col{grid-template-columns:1fr 1fr;}}
`; document.head.appendChild(s); })();
})();
