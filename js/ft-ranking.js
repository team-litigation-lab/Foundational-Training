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
const R = {sort: "name", act: null, people: null, loading: false, batch: "", week: 1, data: null, key: "", dataLoading: false, saveT: null, saved: true, fill: false, drafting: {}, edit: false};
const bLabel = b => typeof batchLabel === "function" ? batchLabel(b) : String(b || "");
const keyOf = (b, w) => `ranking:${String(b || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
const uid = () => Math.random().toString(36).slice(2, 9);

// the report's columns: the compliance one, the marks out of 5, and the activities scored on their own points
const COL = (label, sub, max, src) => ({id: uid(), label, sub: sub || "", max: max == null ? 5 : max, type: "score", src: src || ""});
const BASE = () => [
  {id: uid(), label: "Spelling & Typing Tests", sub: "", type: "notes", src: "skills"},
  COL("Monitoring Sheet", "", 5, "drive:Monitoring Sheet"), COL("Tracker", "", 5, "drive:Tracker")];
const TEMPLATES = {
  week1: {label: "📋 Week 1 columns", cols: () => BASE().concat([COL("PI Reading Task", "", 40), COL("Ass: Common Terms", "", 27),
    COL("Ass: Auto Liability Insurance", "", 45), COL("RC: Data Extraction", "", 125), COL("Reception Mock Calls", "", 5, "trainer:Reception Mock Call")])},
  blank: {label: "Only the trackers", cols: BASE}
};
// the facilitator's usual notes under a score (her feedback DNA's compliance wording)
const NOTES = ["Initial feedback implemented.", "Initial feedback was not fully implemented.", "Initial feedback was not implemented.",
  "Expected corrections from the initial feedback have not been fully implemented.", "Complete", "Complied; however, lacking 1 entry ()"];

const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : null; };
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
    R.people = list.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected).map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || "", progress: r.dayProgress || {}, since: String(r.registeredAt || "").slice(0, 10)}))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if(!R.batch){ const bs = batches(); R.batch = bs[bs.length - 1] || ""; }
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
  R.dataLoading = false; rerender();
}
function save(){
  if(!R.data) return; R.saved = false; R.data.updatedAt = new Date().toISOString();
  clearTimeout(R.saveT); const key = R.key, data = R.data;
  R.saveT = setTimeout(async () => { const ok = await sharedSet(key, data); R.saved = ok !== false; if(ok === false) toast("Couldn’t save the report. Check your connection."); paintSaved(); }, 700);
  paintSaved();
}
function paintSaved(){ const el = document.getElementById("rkSaved"); if(el) el.textContent = R.saved ? "✓ Saved" : "Saving…"; }
const rerender = () => { if(state.view === "admin" && state.adminTab === "ranking") render(); };

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
function srcOptions(){
  const S = (window.LSH_PROGRAM || {}).sources || [];
  return [["", "Typed by the trainer"]].concat(S.map(s => [s.id + ":", `${s.icon} ${s.label} (average)`]),
    [["drive:Tracker", "📋 Daily Task Tracker"], ["drive:Monitoring Sheet", "📋 Training Progress Monitoring Sheet"], ["calls:Reception", "🎯 Call Simulator · Reception"], ["calls:Calendar", "🎯 Call Simulator · Calendar"], ["calls:Intake", "🎯 Call Simulator · Intake"],
     // the trainer-facilitated activities' scorecards (Admin → 🧑‍🏫 Trainer Inputs: the weighted average, as a %)
     ["trainer:Reception Mock Call", "🧑‍🏫 Reception Mock Call scorecard"], ["trainer:Calendar Management Mock Call", "🧑‍🏫 Calendar Management Mock Call scorecard"],
     ["trainer:Intake Mock Call", "🧑‍🏫 Intake Mock Call scorecard"], ["trainer:Intake Packet", "🧑‍🏫 Intake Packet Demo scorecard"], ["trainer:LOR Uploading", "🧑‍🏫 LOR Demo scorecard"],
     ["trainer:MedLOR", "🧑‍🏫 MedLOR Demo scorecard"], ["trainer:LV (Lien", "🧑‍🏫 LV Demo scorecard"], ["trainer:Settlement", "🧑‍🏫 Reduction / Closing & Settlement Demo scorecard"]]);
}
async function fillFromPortal(){
  if(!R.data || R.fill) return;
  const notesCols = R.data.cols.filter(c => c.type === "notes" && c.src === "skills");
  const cols = R.data.cols.filter(c => c.type === "score" && c.src); if(!cols.length && !notesCols.length){ toast("No column is set to fill from the platform: pick a source in ✎ Columns."); return; }
  const S = ((window.LSH_PROGRAM || {}).sources || []).filter(s => s.key), ppl = people(); if(!ppl.length) return;
  R.fill = true; rerender();
  try{
    const shared = (window.LSH_PROGRAM || {}).shared || [], want = [];
    ppl.forEach(p => S.forEach(s => want.push(s.key + p.id)));
    const vals = await sharedGetMany(want.concat(shared)), sh = {};
    shared.forEach((k, i) => { sh[k] = vals[want.length + i] || null; });
    let n = 0;
    ppl.forEach((p, i) => {
      const rec = {}; S.forEach((s, j) => { rec[s.key] = vals[i * S.length + j] || null; });
      const sc = lshProgram.compute({id: p.id, progress: p.progress, rec, shared: sh, since: p.since});
      const row = rowOf(p.id);
      cols.forEach(c => {
        const cur = row.cells[c.id]; if(cur && num(cur.raw) != null) return;          // never over what the trainer typed
        const [sid, words] = [c.src.split(":")[0], c.src.split(":").slice(1).join(":").trim()];
        const src = sc.rows.find(r => r.s.id === sid); if(!src) return;
        let pct = null;
        if(!words) pct = src.avg;
        else { const it = src.items.find(x => typeof x.pct === "number" && String(x.name).toLowerCase().includes(words.toLowerCase())); pct = it ? it.pct : null; }
        if(pct == null) return;
        const max = num(c.max) || 5;
        row.cells[c.id] = Object.assign({}, cur || {}, {raw: fmt(pct / 100 * max), auto: true}); n++;
      });
    });
    // 🧪 the Spelling & Typing column: the compliance line for the column's dates (js/ft-skilltests.js)
    if(notesCols.length && window.FTSkills){
      const recs = await sharedGetMany(ppl.map(p => "skills:" + p.id)), rvs = await sharedGetMany(ppl.map(p => "trackerreview:" + p.id));
      notesCols.forEach(c => {
        const range = parseRange(c.sub);
        if(!range){ toast(`Put the dates in the “${c.label}” column first (✎ Columns), e.g. 9/28 to 10/06.`); return; }
        ppl.forEach((p, i) => { const row = rowOf(p.id), cur = row.cells[c.id];
          if(cur && String(cur.note || "").trim()) return;                                  // never over what the trainer typed
          const rec = FTSkills.withShots(recs[i], (rvs[i] || {}).shots);   // 📷 the screenshots in Drive count too
          row.cells[c.id] = Object.assign({}, cur || {}, {note: FTSkills.complianceText(rec, range[0], range[1], p.since), auto: true}); n++; });
      });
    }
    if(n) save();
    toast(n ? `⤓ Filled ${n} empty score${n === 1 ? "" : "s"} from the platform. Check them before you send the report.` : "Nothing new to fill: the platform has no grade yet for the empty cells.");
  }catch(err){ toast("Couldn’t read the trainees’ grades. Try again."); }
  R.fill = false; rerender();
}

/* ---------- ✨ Additional Notes in the facilitator's feedback DNA ---------- */
async function draftNotes(id){
  const p = people().find(x => x.id === id); if(!p || R.drafting[id]) return;
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
${String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

Return ONLY JSON: {"notes":"..."}`;
    const out = await callAIJson(prompt, 500, undefined, "grading");
    const t = String((out && out.notes) || "").trim().slice(0, 1200);
    if(t){ row.notes = row.notes ? row.notes + "\n" + t : t; save(); } else toast("The AI returned nothing. Try again.");
  }catch(err){ toast("The AI isn’t available right now. Type the notes yourself."); }
  R.drafting[id] = false; rerender();
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
    <thead><tr><th>Rank</th><th><b>Trainee Name</b></th>${cols.map(c => `<th>${head(c)}</th>`).join("")}<th><b>W${R.week} Final Average</b></th><th><b>Additional Notes</b></th></tr></thead>
    <tbody>${ranked().map(x => { const r = (R.data.rows || {})[x.p.id] || {cells: {}}; return `<tr><td style="text-align:center"><b>${x.rank || "—"}</b></td><td><b>${e(x.p.name)}</b></td>
      ${cols.map(c => `<td>${cellOut(c, (r.cells || {})[c.id])}</td>`).join("")}<td><b>${x.avg == null ? "" : fix2(x.avg) + "/5"}</b></td>
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
      <select title="Where ⤓ Fill takes this column's score from" onchange="FTRanking.col(${i}, 'src', this.value)">${opts.map(o => `<option value="${e(o[0])}"${(c.src || "") === o[0] ? " selected" : ""}>${e(o[1])}</option>`).join("")}</select>`
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
  return out.concat([{k: "avg"}, {k: "rank"}, {k: "addl"}]);
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
function grid(){
  const list = sheetRows(), sc = sheetCols(), rk = {}; ranked().forEach(x => { rk[x.p.id] = x; });
  if(!list.length) return `<p class="sc-empty">No approved trainees in ${e(R.batch)}.</p>`;
  const first = 3, last = first + list.length - 1, L = letter;
  const ev = `onfocus="FTRanking.focus(this)" onkeydown="FTRanking.key(event, this)"`;
  return `<div class="xl-fbar"><span class="xl-ref" id="xlRef">A3</span><span class="xl-fx">fx</span>
      <input id="xlBar" list="rkNotes" placeholder="Select a cell" readonly onchange="FTRanking.bar(this.value)" onkeydown="if(event.key==='Enter') this.blur()"></div>
    <div class="xl-wrap"><table class="xl"><thead>
      <tr class="xl-letters"><th class="xl-corner"></th>${sc.map((s, i) => `<th class="xl-l${s.k === "name" ? " xl-frz" : ""}">${L(i)}</th>`).join("")}</tr></thead><tbody>
      <tr class="xl-title"><th class="xl-rn">1</th><td class="xl-frz" colspan="${sc.length}"><b>${e(title())}</b></td></tr>
      <tr class="xl-head"><th class="xl-rn">2</th>${sc.map((s, i) => `<th class="${s.k === "name" ? "xl-frz " : ""}xl-h-${s.k}" data-ref="${L(i)}2">${e(headOf(s)).replace(/\n/g, "<br>")}</th>`).join("")}</tr>
      ${list.map((p, ri) => { const row = first + ri, r = rowOf(p.id), x = rk[p.id] || {};
        return `<tr class="xl-row"><th class="xl-rn">${row}</th>${sc.map((s, ci) => {
          const ref = L(ci) + row, at = `data-ri="${ri}" data-ci="${ci}" data-ref="${ref}" data-p="${e(p.id)}" data-k="${s.k}"`;
          if(s.k === "name") return `<td class="xl-frz xl-name" tabindex="0" ${at} ${ev}>${e(p.name)}</td>`;
          if(s.k === "notes"){ const cell = r.cells[s.c.id] || {};
            return `<td class="xl-td"><textarea class="xl-in xl-txt" rows="2" ${at} data-c="${s.c.id}" ${ev} placeholder="Complete / Complied; however, lacking … (dates)" onchange="FTRanking.cell('${e(p.id)}', '${s.c.id}', 'note', this.value)">${e(cell.note || "")}</textarea></td>`; }
          if(s.k === "mark5" || s.k === "raw"){ const cell = r.cells[s.c.id] || {};
            return `<td class="xl-td${cell.note ? " has-note" : ""}${cell.auto ? " is-auto" : ""}" data-cell="${e(p.id)}|${s.c.id}" title="${e(cell.note || "")}"><input class="xl-in xl-num" inputmode="decimal" ${at} data-c="${s.c.id}" ${ev} value="${e(cell.raw == null ? "" : cell.raw)}" onchange="FTRanking.cell('${e(p.id)}', '${s.c.id}', 'raw', this.value)"></td>`; }
          if(s.k === "calc"){ const m = mark(s.c, r.cells[s.c.id]);
            return `<td class="xl-calc rk-mark" tabindex="0" ${at} data-f="${e(formulaOf(s, ci, row, sc, first, last))}" data-m="${e(p.id)}|${s.c.id}" ${ev}>${m == null ? "" : fix2(m)}</td>`; }
          if(s.k === "avg") return `<td class="xl-calc xl-avg rk-avg" tabindex="0" ${at} data-f="${e(formulaOf(s, ci, row, sc, first, last))}" data-a="${e(p.id)}" ${ev}>${x.avg == null ? "" : fix2(x.avg)}</td>`;
          if(s.k === "rank") return `<td class="xl-calc xl-rank rk-rank" tabindex="0" ${at} data-f="${e(formulaOf(s, ci, row, sc, first, last))}" data-r="${e(p.id)}" ${ev}>${x.rank || ""}</td>`;
          return `<td class="xl-td xl-addl"><textarea class="xl-in xl-txt" rows="2" ${at} ${ev} placeholder="Additional notes" onchange="FTRanking.notes('${e(p.id)}', this.value)">${e(r.notes || "")}</textarea>
            <button type="button" class="xl-ai" title="Draft this trainee’s notes in the facilitator’s voice" ${R.drafting[p.id] ? "disabled" : ""} onclick="FTRanking.draft('${e(p.id)}')">${R.drafting[p.id] ? "…" : "✨"}</button></td>`;
        }).join("")}</tr>`; }).join("")}
    </tbody></table></div>
    <datalist id="rkNotes">${NOTES.map(n => `<option value="${e(n)}">`).join("")}</datalist>`;
}
// a score typed: its mark, and every row's average and rank, updated where they are (no redraw: the cursor stays put)
function paintFigures(id, cid){
  const col = R.data.cols.find(c => c.id === cid), el = [...document.querySelectorAll(".rk-mark")].find(x => x.getAttribute("data-m") === id + "|" + cid);
  if(col && el){ const m = mark(col, rowOf(id).cells[cid]); el.textContent = m == null ? "" : fix2(m); }
  ranked().forEach(x => {
    const a = [...document.querySelectorAll(".rk-avg")].find(t => t.getAttribute("data-a") === x.p.id), r = [...document.querySelectorAll(".rk-rank")].find(t => t.getAttribute("data-r") === x.p.id);
    if(a) a.textContent = x.avg == null ? "" : fix2(x.avg);
    if(r) r.textContent = x.rank || "";
  });
  const td = [...document.querySelectorAll("td[data-cell]")].find(t => t.getAttribute("data-cell") === id + "|" + cid);
  if(td) td.classList.remove("is-auto");
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
function xlsxParts(){
  const sc = sheetCols(), list = ranked(), first = 3, last = Math.max(first, first + list.length - 1), L = letter;
  const X = s => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const str = (r, s, v) => `<c r="${r}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${X(v)}</t></is></c>`;
  // the export adds the notes under the scores as one column, before Additional Notes (Excel shows a cell note only on hover)
  const cols = sc.slice(0, -1).concat([{k: "snotes"}, sc[sc.length - 1]]);
  const width = {name: 26, notes: 34, mark5: 11, raw: 12, calc: 9, avg: 12, rank: 7, snotes: 34, addl: 42};
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
  const top = `<div class="rk-bar"><div><h2>📊 Weekly Ranking Report</h2><p class="sc-about">The facilitator’s weekly progress report and ranking for a batch: each activity’s score converted to a mark out of 5, the week’s final average, and the trainees ranked by it.</p></div>
    <span class="rk-pick"><select onchange="FTRanking.batch(this.value)">${bs.length ? bs.map(b => `<option ${b === R.batch ? "selected" : ""}>${e(b)}</option>`).join("") : `<option>No batches</option>`}</select>
      <select onchange="FTRanking.week(this.value)">${[1, 2, 3, 4, 5, 6].map(w => `<option value="${w}" ${w === R.week ? "selected" : ""}>Week ${w}</option>`).join("")}</select></span></div>`;
  if(!R.batch) return `<div class="card rk">${top}<p class="sc-empty">No approved trainees yet.</p></div>`;
  if(R.dataLoading) return `<div class="card rk">${top}<p class="sc-empty">Opening ${e(title())}…</p></div>`;
  if(!R.data) return `<div class="card rk">${top}<div class="rk-start"><b>${e(title())}</b> hasn’t been started. Start it with:
      <div class="rk-acts">${Object.keys(TEMPLATES).map(k => `<button class="btn btn-ghost btn-sm" onclick="FTRanking.start('${k}')">${TEMPLATES[k].label}</button>`).join("")}
        ${R.week > 1 ? `<button class="btn btn-navy btn-sm" onclick="FTRanking.start('last')">↻ Week ${R.week - 1}’s columns</button>` : ""}</div>
      <p class="sc-about">The columns can be changed any time (✎ Columns). Nothing about a trainee is filled in until you type it or ⤓ fill it from the platform.</p></div></div>`;
  return `<div class="card rk">${top}
    <div class="rk-title"><b>${e(title())}</b><span id="rkSaved" class="rk-saved">${R.saved ? "✓ Saved" : "Saving…"}</span>
      <span class="rk-acts"><button class="btn btn-ghost btn-sm" onclick="FTRanking.toggleEdit()">✎ Columns</button>
        <button class="btn btn-ghost btn-sm" ${R.fill ? "disabled" : ""} onclick="FTRanking.fill()" title="Fill the empty score cells of the columns that have a source, from the trainees' grades on the platform">${R.fill ? "Filling…" : "⤓ Fill from the platform"}</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.sort()" title="Order the rows by name or by rank">↕ ${R.sort === "rank" ? "By rank" : "By name"}</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.copy()">📋 Copy</button><button class="btn btn-ghost btn-sm" onclick="FTRanking.print()">🖨 Print</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.download()">⬇ Word</button><button class="btn btn-navy btn-sm" onclick="FTRanking.excel()">⬇ Excel</button>
        <button class="btn btn-ghost btn-sm" onclick="FTRanking.share(this)" title="Each trainee sees their own row only: their marks, notes, average and rank">📤 ${R.data.sharedAt ? "Share again" : "Share with the trainees"}</button></span></div>
    ${R.data.sharedAt ? `<p class="rk-shared">📤 Shared with the trainees ${e(new Date(R.data.sharedAt).toLocaleString())}: each sees their own row on 📬 My Feedback and 🏅 My Performance. Changes since then reach them when you share again.</p>` : ""}
    ${R.edit ? columnsEditor() : ""}${grid()}
    <p class="sc-how">Type a score in its cell (Tab or → to the next, Enter or ↓ to the trainee below). A score out of its points gets its mark out of 5 in the grey ÷ 5 column beside it; a column out of 5 is already a mark. The grey cells are worked out (select one to see its formula in the bar): the final average is the average of the row’s marks (empty cells don’t count) and the rank follows it. A score’s note goes in the bar above the sheet (a red corner marks it). ⬇ Excel keeps the formulas; ⬇ Word is the facilitator’s report layout, ranked.</p></div>`;
}

const prevWeek = async () => { try{ const v = await sharedGet(keyOf(R.batch, R.week - 1)); return v && Array.isArray(v.cols) ? v.cols : null; }catch(err){ return null; } };
window.FTRanking = {
  batch(b){ R.batch = b; R.key = ""; R.data = null; R.edit = false; render(); },
  week(w){ R.week = Number(w) || 1; R.key = ""; R.data = null; R.edit = false; render(); },
  async start(k){
    let cols = k === "last" ? await prevWeek() : (TEMPLATES[k] || TEMPLATES.blank).cols();
    if(!cols){ toast(`Week ${R.week - 1} has no report for ${R.batch} yet.`); return; }
    cols = cols.map(c => Object.assign({}, c, {id: uid()}));
    R.data = {batch: R.batch, week: R.week, cols, rows: {}, createdAt: new Date().toISOString()}; R.edit = k !== "last"; save(); render();
  },
  toggleEdit(){ R.edit = !R.edit; render(); },
  col(i, f, v){ const c = R.data.cols[i]; if(!c) return; c[f] = f === "max" ? (num(v) > 0 ? num(v) : 5) : String(v).trim(); if(f === "type" && v === "score" && c.max == null) c.max = 5; save(); render(); },
  addCol(t){ R.data.cols.push(t === "notes" ? {id: uid(), label: "Notes", sub: "", type: "notes"} : COL("New activity", "", 5)); save(); render(); },
  delCol(i){ if(!confirm("Remove this column and its scores?")) return; const c = R.data.cols.splice(i, 1)[0]; Object.values(R.data.rows).forEach(r => { if(r.cells) delete r.cells[c.id]; }); save(); render(); },
  moveCol(i, d){ const l = R.data.cols, j = i + d; if(j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; save(); render(); },
  cell(id, cid, f, v){ const r = rowOf(id); const c = r.cells[cid] = r.cells[cid] || {}; c[f] = String(v).trim(); if(f === "raw") delete c.auto; save(); if(f === "raw") paintFigures(id, cid); },
  focus: focusCell,
  key(ev, el){
    const txt = el.tagName === "TEXTAREA", k = ev.key;
    const go = (dr, dc) => { if(moveFrom(el, dr, dc)) ev.preventDefault(); };
    if(k === "ArrowDown" && !txt) go(1, 0); else if(k === "ArrowUp" && !txt) go(-1, 0);
    else if(k === "Enter" && !ev.shiftKey && !txt){ if(el.tagName === "INPUT") el.blur(); go(ev.shiftKey ? -1 : 1, 0); }
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
  html: () => wordDoc(), mark, reload(){ R.people = null; R.key = ""; R.data = null; render(); }
};

ftAdminTab("ranking", "📊 Weekly Ranking", renderRanking);

(function(){ const s = document.createElement("style"); s.id = "ft-ranking"; s.textContent = `
.rk{padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
.rk-bar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;}
.rk-bar h2{margin:0 0 4px;}
.rk-pick{display:flex;gap:6px;}
.rk-pick select{padding:6px 10px;border-radius:8px;border:1px solid var(--line,#dfe3ec);font:inherit;}
.rk-start{border:1px dashed #C9CFDC;border-radius:12px;padding:16px;background:#F8F9FC;}
.rk-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px;}
.rk-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:15px;}
.rk-title .rk-acts{margin:0 0 0 auto;}
.rk-saved{font-size:12px;color:var(--ink-soft);}
.rk-shared{margin:0;font-size:12.5px;color:#1E7F4F;background:#E7F5EE;border-radius:8px;padding:6px 10px;}
.rk-cols{border:1px solid #E3E7F0;border-radius:12px;padding:12px;background:#F8F9FC;}
.rk-h{margin:0 0 8px;font-weight:800;}
.rk-h span{font-weight:400;color:var(--ink-soft);font-size:12.5px;}
.rk-col{display:grid;grid-template-columns:150px minmax(140px,1.4fr) minmax(140px,1fr) 110px minmax(150px,1fr) auto;gap:6px;align-items:center;margin-bottom:6px;}
.rk-col input,.rk-col select{padding:5px 8px;border:1px solid #D5DAE5;border-radius:7px;font:inherit;font-size:13px;min-width:0;}
.rk-max{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--ink-soft);}
.rk-max input{width:64px;}
.rk-col-ad{display:flex;gap:4px;}
/* the sheet: Excel's look — column letters, row numbers, gridlines, a formula bar, the header row and names frozen */
.xl-fbar{display:flex;align-items:stretch;border:1px solid #C8C8C8;border-radius:4px;background:#fff;font:13px Calibri,'Segoe UI',Arial,sans-serif;}
.xl-ref{min-width:64px;padding:5px 8px;border-right:1px solid #C8C8C8;font-weight:700;color:#217346;text-align:center;}
.xl-fx{padding:5px 10px;border-right:1px solid #C8C8C8;font-style:italic;color:#6B6B6B;font-family:Georgia,serif;}
#xlBar{flex:1 1 auto;border:0;padding:5px 8px;font:inherit;outline:none;min-width:0;}
#xlBar[readonly]{color:#444;background:#FAFAFA;}
.xl-wrap{overflow:auto;max-height:62vh;border:1px solid #C8C8C8;background:#fff;}
.xl{border-collapse:separate;border-spacing:0;font:12.5px Calibri,'Segoe UI',Arial,sans-serif;color:#1F1F1F;}
.xl th,.xl td{border-right:1px solid #D4D4D4;border-bottom:1px solid #D4D4D4;padding:0;}
.xl-letters th{position:sticky;top:0;z-index:4;background:#F3F3F3;color:#555;font-weight:400;font-size:11.5px;height:20px;text-align:center;min-width:76px;}
.xl-corner,.xl-rn{position:sticky;left:0;z-index:5;background:#F3F3F3 !important;color:#555;font-weight:400 !important;font-size:11.5px;width:34px;min-width:34px !important;text-align:center;}
.xl-corner{top:0;z-index:6;}
.xl-title td{padding:5px 8px;font-size:14px;background:#fff;}
.xl-head th{position:sticky;top:20px;z-index:3;background:#5B9A32;color:#fff;font-weight:700;font-size:11.5px;padding:5px 6px;vertical-align:middle;text-align:center;line-height:1.25;white-space:normal;}
.xl-head th.xl-h-name,.xl-head th.xl-h-notes,.xl-head th.xl-h-addl{min-width:200px;}
.xl-head th.xl-h-calc,.xl-head th.xl-h-avg,.xl-head th.xl-h-rank{background:#4A7F28;}
.xl .xl-frz{position:sticky;left:34px;z-index:2;background:#fff;}
.xl-head .xl-frz{z-index:4;background:#5B9A32;}
.xl-head th.xl-rn{color:#555;font-weight:400;}
.xl-name{padding:4px 8px !important;font-weight:700;min-width:190px;vertical-align:top;outline:none;}
.xl-td{position:relative;vertical-align:top;}
.xl-in{display:block;width:100%;border:0;border-radius:0;background:transparent;font:inherit;color:inherit;padding:4px 6px;outline:none;resize:none;}
.xl-num{text-align:right;min-width:76px;}
.xl-txt{min-width:200px;line-height:1.3;}
.xl-calc{background:#F2F2F2;text-align:right;padding:4px 8px !important;font-weight:700;vertical-align:top;outline:none;min-width:64px;}
.xl-avg{color:#1F4E2C;} .xl-rank{text-align:center;color:#B5651F;}
.xl td.xl-sel,.xl td:focus{box-shadow:inset 0 0 0 2px #217346;}
.xl-td.has-note::after{content:"";position:absolute;top:0;right:0;border-left:7px solid transparent;border-top:7px solid #D13438;}
.xl-td.is-auto::before{content:"⤓";position:absolute;bottom:1px;left:2px;font-size:9px;color:#217346;}
.xl-addl{min-width:240px;}
.xl-ai{position:absolute;top:2px;right:2px;border:1px solid #D4D4D4;background:#fff;border-radius:4px;font-size:11px;padding:0 4px;cursor:pointer;opacity:.75;}
.xl-ai:hover{opacity:1;}
@media(max-width:900px){.rk-col{grid-template-columns:1fr 1fr;}}
`; document.head.appendChild(s); })();
})();
