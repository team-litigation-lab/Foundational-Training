/* ============================================================
   📈 OVERALL PERFORMANCE — every trainee's whole training on one sheet, per batch
   ------------------------------------------------------------
   Admin → 🏅 Scorecard → 📈 Overall Performance (and the 📈 card on a trainer's dashboard). A sheet drawn like Google
   Sheets — column letters, row numbers, the header row and the names frozen, a formula bar that says where the selected
   cell comes from — with its sheet tabs at the foot:
     • Overall: one row per trainee: their daily compliance (the nightly check's average, worker.js dailyCompliance), each
       week's final average out of 5 (📊 Weekly Ranking, ranking:<batch>:w<N>), the weeks' average, the Scorecard's overall
       (js/lsh-program.js compute), and the Overall % (the average of the three that have a value), ranked by it;
     • Daily Compliance: a column per training day, each day's % (the formula bar lists its parts: tracker, Monitoring
       Sheet, tests, outputs, EOD);
     • Week 1 … 6: each week's report as saved (marks out of 5, final average, rank, notes), read only: ✎ opens it in
       📊 Weekly Ranking, where a week that is over drafts itself.
   Nothing is stored here: the sheet reads what the nightly check, the reports and the grades already keep. ⬇ CSV gives
   the sheet on screen.
   ============================================================ */
(function(){
"use strict";
if(typeof window.ftAdminTab !== "function") return;
const e = v => esc(String(v == null ? "" : v));
const O = {people: null, loading: false, batch: "", tab: "overall", data: null, dataKey: "", dataLoading: false, sel: null};
const bLabel = b => typeof batchLabel === "function" ? batchLabel(b) : String(b || "");
const rkKey = (b, w) => `ranking:${String(b || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
const WEEKS = [1, 2, 3, 4, 5, 6];
const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : null; };
const f2 = n => n == null ? "" : (Math.round(n * 100) / 100).toFixed(2);
const pct = n => n == null ? "" : Math.round(n) + "%";
const avg = xs => { const v = xs.filter(x => typeof x === "number" && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const letter = i => { let s = ""; i++; while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const rerender = () => { if(state.view === "admin" && state.adminTab === "overall") render(); };
const md = d => { const [, m, dd] = String(d).split("-"); return `${+m}/${+dd}`; };

/* ---------- loading ---------- */
async function loadPeople(){
  O.loading = true;
  try{
    let list = state.adminData;
    if(!list){ const keys = await sharedList("trainee:"); list = (await sharedGetMany(keys)).filter(Boolean); }
    O.people = list.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected && !r.offboarded)
      .map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || "", progress: r.dayProgress || {}, since: String(r.registeredAt || "").slice(0, 10)}))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if(!O.batch){ const bs = batches(); O.batch = bs[bs.length - 1] || ""; }
  }catch(err){ O.people = []; }
  O.loading = false; rerender();
}
const batches = () => [...new Set((O.people || []).map(p => bLabel(p.batch)).filter(Boolean))].sort();
const people = () => (O.people || []).filter(p => bLabel(p.batch) === O.batch);
// a week report's final average out of 5 for a trainee (as 📊 Weekly Ranking works it out: the marks' average)
function mark(c, cell){ const raw = num(cell && cell.raw); if(raw == null || c.type !== "score") return null; return Math.max(0, Math.min(5, raw / (num(c.max) || 5) * 5)); }
function weekAvg(rep, id){
  const r = rep && (rep.rows || {})[id]; if(!r) return null;
  return avg(rep.cols.map(c => mark(c, (r.cells || {})[c.id])));
}
async function loadData(){
  const ppl = people(), key = O.batch + "|" + ppl.map(p => p.id).join(","); if(O.dataKey === key && (O.data || O.dataLoading)) return;
  O.dataKey = key; O.dataLoading = true; rerender();
  try{
    const reps = await sharedGetMany(WEEKS.map(w => rkKey(O.batch, w)));
    const rvs = await sharedGetMany(ppl.map(p => "trackerreview:" + p.id));
    // the Scorecard's overall, as 🏅 Scorecards works it out (js/lsh-program.js compute)
    const P = window.LSH_PROGRAM || {}, S = (P.sources || []).filter(s => s.key), shared = P.shared || [], want = [];
    ppl.forEach(p => S.forEach(s => want.push(s.key + p.id)));
    const vals = await sharedGetMany(want.concat(shared)), sh = {};
    shared.forEach((k, i) => { sh[k] = vals[want.length + i] || null; });
    const sc = {};
    ppl.forEach((p, i) => { const rec = {}; S.forEach((s, j) => { rec[s.key] = vals[i * S.length + j] || null; });
      try{ sc[p.id] = window.lshProgram ? lshProgram.compute({id: p.id, progress: p.progress, rec, shared: sh, since: p.since}).overall : null; }catch(err){ sc[p.id] = null; } });
    O.data = {reps: WEEKS.map((w, i) => reps[i] && Array.isArray(reps[i].cols) ? reps[i] : null), comp: Object.fromEntries(ppl.map((p, i) => [p.id, ((rvs[i] || {}).compliance) || {}])), sc, at: new Date()};
  }catch(err){ O.data = {reps: [], comp: {}, sc: {}, error: true}; }
  O.dataLoading = false; rerender();
}

/* ---------- the sheets: header + rows of cells {v (shown), f (the formula bar), cls} ---------- */
function overallSheet(){
  const D = O.data, ppl = people(), weeks = WEEKS.filter((w, i) => D.reps[i]);
  const head = ["Trainee", "Daily Compliance", "Days checked"].concat(weeks.map(w => `Week ${w} average (/5)`), ["Weeks average (/5)", "Scorecard overall", "Overall %", "Rank"]);
  const rows = ppl.map(p => {
    const days = Object.entries(D.comp[p.id] || {}).filter(([, x]) => x && typeof x.pct === "number");
    const comp = avg(days.map(([, x]) => x.pct));
    const ws = weeks.map(w => weekAvg(D.reps[w - 1], p.id)), wavg = avg(ws), sc = D.sc[p.id];
    const overall = avg([comp, wavg == null ? null : wavg / 5 * 100, sc]);
    return {p, comp, days: days.length, ws, wavg, sc, overall};
  });
  // ranked by the Overall % (ties share a rank)
  const order = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall);
  order.forEach((r, i) => { r.rank = i && Math.round(order[i - 1].overall) === Math.round(r.overall) ? order[i - 1].rank : i + 1; });
  const tone = v => v == null ? "" : v >= 85 ? "gs-hi" : v >= 70 ? "gs-mid" : "gs-lo";
  return {head, freeze: 1, rows: rows.map(r => [
    {v: r.p.name, f: `${r.p.name} · ${O.batch}`, cls: "gs-name"},
    {v: pct(r.comp), f: r.comp == null ? "No day checked yet (the nightly check, at the end of every shift)" : `=AVERAGE(the ${r.days} days' compliance) = ${Math.round(r.comp)}%`, cls: "gs-num " + tone(r.comp)},
    {v: r.days || "", f: `${r.days} training day(s) checked`, cls: "gs-num"}]
    .concat(r.ws.map((m, i) => ({v: f2(m), f: m == null ? `Not in Week ${weeks[i]}'s report` : `Week ${weeks[i]} final average (📊 Weekly Ranking) = ${f2(m)}/5`, cls: "gs-num " + tone(m == null ? null : m / 5 * 100)})),
      [{v: f2(r.wavg), f: r.wavg == null ? "No week reported yet" : `=AVERAGE(${r.ws.filter(x => x != null).map(f2).join(", ")}) = ${f2(r.wavg)}/5`, cls: "gs-num gs-calc"},
       {v: pct(r.sc), f: r.sc == null ? "Nothing graded yet" : `🏅 Scorecard overall (every grading system's average) = ${r.sc}%`, cls: "gs-num " + tone(r.sc)},
       {v: pct(r.overall), f: r.overall == null ? "Nothing to average yet" : `=AVERAGE(Daily Compliance ${pct(r.comp) || "–"}, Weeks average ${r.wavg == null ? "–" : Math.round(r.wavg / 5 * 100) + "%"}, Scorecard ${pct(r.sc) || "–"}) = ${Math.round(r.overall)}%`, cls: "gs-num gs-calc gs-bold " + tone(r.overall)},
       {v: r.rank || "", f: r.rank ? `Rank ${r.rank} of ${order.length} in ${O.batch}, by the Overall %` : "Not ranked: nothing to average yet", cls: "gs-num gs-rank"}])), sortBy: (a, b) => (a.rank || 1e9) - (b.rank || 1e9)};
}
function complianceSheet(){
  const D = O.data, ppl = people();
  const dates = [...new Set(ppl.flatMap(p => Object.keys(D.comp[p.id] || {})))].sort();
  const PART = {tracker: "Task Tracker", monitor: "Monitoring Sheet", tests: "Typing & Spelling", outputs: "Day's outputs", eod: "EOD"};
  const head = ["Trainee"].concat(dates.map(md), ["Average"]);
  const tone = v => v == null ? "" : v >= 85 ? "gs-hi" : v >= 70 ? "gs-mid" : "gs-lo";
  return {head, freeze: 1, rows: ppl.map(p => {
    const c = D.comp[p.id] || {}, vs = dates.map(d => c[d] && typeof c[d].pct === "number" ? c[d].pct : null), a = avg(vs);
    return [{v: p.name, f: p.name, cls: "gs-name"}].concat(dates.map((d, i) => { const x = c[d];
      if(!x) return {v: "", f: `${md(d)}: not checked`, cls: "gs-num"};
      const parts = Object.entries(x.parts || {}).filter(([, v]) => v != null).map(([k, v]) => `${PART[k] || k} ${v}%`).join(" · ");
      const tests = x.tests ? ` (typing AM ${x.tests.AM ? "✓" : "✗"}, PM ${x.tests.PM ? "✓" : "✗"}, spelling ${x.tests.SP ? "✓" : "✗"})` : "";
      return {v: pct(vs[i]), f: `${md(d)}: ${parts}${tests}${(x.submissions || []).length ? ` · submitted: ${x.submissions.join(", ")}` : ""} = ${pct(vs[i])}`, cls: "gs-num " + tone(vs[i])}; }),
      [{v: pct(a), f: a == null ? "No day checked yet" : `=AVERAGE(the days) = ${pct(a)}`, cls: "gs-num gs-calc gs-bold " + tone(a)}]);
  })};
}
function weekSheet(w){
  const rep = O.data.reps[w - 1], ppl = people();
  if(!rep) return null;
  const cols = rep.cols, list = ppl.map(p => ({p, a: weekAvg(rep, p.id)})), order = list.filter(x => x.a != null).sort((a, b) => b.a - a.a);
  order.forEach((x, i) => { x.rank = i && f2(order[i - 1].a) === f2(x.a) ? order[i - 1].rank : i + 1; });
  const head = ["Trainee"].concat(cols.map(c => c.label + (c.type === "score" ? ` (/${num(c.max) || 5})` : "")), [`W${w} Final Average`, "Rank", "Additional Notes"]);
  return {head, freeze: 1, rows: list.map(x => { const r = (rep.rows || {})[x.p.id] || {cells: {}};
    return [{v: x.p.name, f: x.p.name, cls: "gs-name"}].concat(cols.map(c => { const cell = (r.cells || {})[c.id] || {};
      if(c.type === "notes") return {v: cell.note || "", f: cell.note || "", cls: "gs-txt"};
      const m = mark(c, cell); return {v: cell.raw == null ? "" : String(cell.raw), f: m == null ? `${c.label}: not scored` : `${c.label}: ${cell.raw}/${num(c.max) || 5} = ${f2(m)}/5${cell.note ? " · " + cell.note : ""}${cell.auto ? " · ⤓ filled from the platform" : ""}`, cls: "gs-num"}; }),
      [{v: f2(x.a), f: x.a == null ? "Not scored" : `=AVERAGE(the marks out of 5) = ${f2(x.a)}`, cls: "gs-num gs-calc gs-bold"}, {v: x.rank || "", f: x.rank ? `Rank ${x.rank} of ${order.length}` : "", cls: "gs-num gs-rank"},
       {v: r.notes || "", f: r.notes || "", cls: "gs-txt"}]); }), rep};
}
const current = () => O.tab === "overall" ? overallSheet() : O.tab === "comp" ? complianceSheet() : weekSheet(Number(O.tab.slice(1)));

/* ---------- drawing ---------- */
function gridHtml(sh){
  const n = sh.head.length;
  return `<div class="gs-wrap"><table class="gs" role="grid"><thead>
    <tr class="gs-letters"><th class="gs-corner"></th>${sh.head.map((h, i) => `<th class="${i < sh.freeze ? "gs-frz" : ""}">${letter(i)}</th>`).join("")}</tr>
    <tr class="gs-head"><th class="gs-rn">1</th>${sh.head.map((h, i) => `<th class="${i < sh.freeze ? "gs-frz" : ""}">${e(h)}</th>`).join("")}</tr></thead>
    <tbody>${sh.rows.map((r, ri) => `<tr><th class="gs-rn">${ri + 2}</th>${r.map((c, ci) => `<td tabindex="0" class="${c.cls || ""}${ci < sh.freeze ? " gs-frz" : ""}" data-r="${ri}" data-c="${ci}" onclick="FTOverall.pick(this)" onfocus="FTOverall.pick(this)">${e(c.v)}</td>`).join("")}${r.length < n ? "<td></td>".repeat(n - r.length) : ""}</tr>`).join("")}
      ${Array.from({length: Math.max(0, 12 - sh.rows.length)}, (_, k) => `<tr class="gs-empty"><th class="gs-rn">${sh.rows.length + k + 2}</th>${"<td></td>".repeat(n)}</tr>`).join("")}</tbody></table></div>`;
}
function renderOverall(){
  if(!O.people){ if(!O.loading) loadPeople(); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Loading the batches…</div>`; }
  const bs = batches();
  if(!O.batch) return `<div class="card gs-card"><p class="sc-empty">No approved trainees yet.</p></div>`;
  loadData();
  const D = O.data;
  const tabs = [["overall", "Overall"], ["comp", "Daily Compliance"]].concat(WEEKS.map(w => ["w" + w, `Week ${w}`]));
  const sh = D && !O.dataLoading ? current() : null;
  const weekEmpty = D && O.tab.startsWith("w") && !sh;
  return `<div class="card gs-card">
    <div class="gs-top"><span class="gs-logo">📈</span><div class="gs-file"><b>Overall Performance · ${e(O.batch)}</b>
        <span class="gs-menu"><button onclick="FTOverall.csv()">File ⬇ CSV</button><button onclick="FTOverall.refresh()">↻ Refresh</button><button onclick="FTRanking && FTRanking.open('${e(O.batch)}', ${O.tab.startsWith("w") ? Number(O.tab.slice(1)) : "null"})">📊 Weekly Ranking</button></span></div>
      <label class="gs-batch">Batch <select onchange="FTOverall.batch(this.value)">${bs.map(b => `<option ${b === O.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></label></div>
    <div class="gs-fbar"><span class="gs-ref" id="gsRef">${O.sel ? e(O.sel.ref) : ""}</span><span class="gs-fx">fx</span><input id="gsBar" readonly value="${O.sel ? e(O.sel.f) : ""}" aria-label="What the selected cell is"></div>
    ${!D || O.dataLoading ? `<p class="sc-empty">Reading the reports, the nightly checks and the grades…</p>`
      : weekEmpty ? `<div class="gs-none"><b>Week ${e(O.tab.slice(1))} has no report for ${e(O.batch)} yet.</b> It drafts itself in 📊 Weekly Ranking once the week’s Friday shift is over.
          <button class="btn btn-navy btn-sm" onclick="FTRanking.open('${e(O.batch)}', ${Number(O.tab.slice(1))})">📊 Open Week ${e(O.tab.slice(1))}</button></div>`
      : `${sh.rep && sh.rep.auto && !sh.rep.auto.approved ? `<p class="gs-draft">🤖 A draft (drafted automatically): approve it in 📊 Weekly Ranking before you share it.</p>` : ""}${gridHtml(sh)}`}
    <div class="gs-tabs" role="tablist">${tabs.map(([k, t]) => { const off = k.startsWith("w") && D && !D.reps[Number(k.slice(1)) - 1];
      return `<button role="tab" class="${O.tab === k ? "on" : ""}${off ? " off" : ""}" onclick="FTOverall.tab('${k}')">${e(t)}</button>`; }).join("")}</div>
    <p class="sc-how">Click a cell: the bar above says where it comes from. Daily Compliance is the nightly check at the end of every shift (Task Tracker, Monitoring Sheet, Typing &amp; Spelling, the day’s outputs, the EOD). A week’s average is its 📊 Weekly Ranking report (drafted automatically once the week is over, approved by you). The Overall % averages the daily compliance, the weeks’ average (as a %) and the 🏅 Scorecard overall.</p></div>`;
}

window.FTOverall = {
  batch(b){ O.batch = b; O.data = null; O.dataKey = ""; O.sel = null; render(); },
  tab(k){ O.tab = k; O.sel = null; render(); },
  refresh(){ O.people = null; O.data = null; O.dataKey = ""; render(); },
  open(){ state.adminTab = "overall"; goto("admin"); },
  pick(td){
    const sh = current(); if(!sh) return; const r = Number(td.getAttribute("data-r")), c = Number(td.getAttribute("data-c")), cell = (sh.rows[r] || [])[c]; if(!cell) return;
    document.querySelectorAll(".gs td.gs-sel").forEach(x => x.classList.remove("gs-sel")); td.classList.add("gs-sel");
    O.sel = {ref: letter(c) + (r + 2), f: cell.f || String(cell.v || "")};
    const ref = document.getElementById("gsRef"), bar = document.getElementById("gsBar"); if(ref) ref.textContent = O.sel.ref; if(bar) bar.value = O.sel.f;
  },
  csv(){
    const sh = O.data && current(); if(!sh){ toast("Nothing on this sheet yet."); return; }
    const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const text = [sh.head].concat(sh.rows.map(r => r.map(c => c.v))).map(r => r.map(q).join(",")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + text], {type: "text/csv"}));
    a.download = `Overall Performance ${O.batch} - ${O.tab === "overall" ? "Overall" : O.tab === "comp" ? "Daily Compliance" : "Week " + O.tab.slice(1)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  // for the checks
  sheet: () => O.data && current()
};

ftAdminTab("overall", "📈 Overall Performance", renderOverall);

// 📈 on a trainer's dashboard (never a trainee's, nor 👁 Trainee view): the sheet, and the week reports waiting for approval
(window.LSH_HOME_STATS = window.LSH_HOME_STATS || []).push(function(){
  if(!state.isAdmin || state.adminPreview || state.traineeId) return "";
  return `<div class="card stat gs-dash" onclick="FTOverall.open()" style="cursor:pointer;" title="Every trainee's daily compliance, weekly averages, Scorecard and rank, on one sheet">
    <div class="num">📈</div><div class="lbl">Overall Performance<span style="display:block;font-weight:400;margin-top:2px;">Daily compliance · weekly reports · rank</span></div></div>`;
});

(function(){ const s = document.createElement("style"); s.id = "ft-overall"; s.textContent = `
/* Google Sheets' look: Arial, grey headers, light gridlines, a blue selection, the sheet tabs at the foot */
.gs-card{padding:0;overflow:hidden;font-family:Arial,'Roboto',sans-serif;}
.gs-top{display:flex;align-items:center;gap:12px;padding:10px 14px 6px;background:#F9FBFD;}
.gs-logo{font-size:26px;}
.gs-file{display:flex;flex-direction:column;gap:2px;} .gs-file b{font:400 18px Arial,sans-serif;color:#1F1F1F;}
.gs-menu{display:flex;gap:2px;} .gs-menu button{border:0;background:none;font:14px Arial,sans-serif;color:#1F1F1F;padding:3px 7px;border-radius:4px;cursor:pointer;} .gs-menu button:hover{background:#E8EAED;}
.gs-batch{margin-left:auto;font:13px Arial,sans-serif;color:#444746;display:flex;align-items:center;gap:6px;}
.gs-batch select{font:14px Arial,sans-serif;padding:5px 8px;border:1px solid #C4C7C5;border-radius:4px;background:#fff;}
.gs-fbar{display:flex;align-items:stretch;border-top:1px solid #E1E3E1;border-bottom:1px solid #E1E3E1;background:#fff;font:13px Arial,sans-serif;}
.gs-ref{min-width:70px;padding:6px 10px;border-right:1px solid #E1E3E1;color:#1F1F1F;}
.gs-fx{padding:6px 10px;color:#80868B;font-style:italic;border-right:1px solid #E1E3E1;}
#gsBar{flex:1 1 auto;border:0;padding:6px 10px;font:inherit;color:#1F1F1F;background:#fff;outline:none;min-width:0;}
.gs-wrap{overflow:auto;max-height:62vh;background:#fff;}
.gs{border-collapse:separate;border-spacing:0;font:13px Arial,sans-serif;color:#1F1F1F;}
.gs th,.gs td{border-right:1px solid #E2E3E3;border-bottom:1px solid #E2E3E3;padding:4px 8px;white-space:nowrap;height:21px;}
.gs-letters th{position:sticky;top:0;z-index:3;background:#F8F9FA;color:#5F6368;font-weight:400;font-size:12px;text-align:center;min-width:90px;}
.gs-head th{position:sticky;top:30px;z-index:3;background:#F8F9FA;font-weight:700;text-align:center;white-space:normal;min-width:90px;max-width:160px;line-height:1.25;}
.gs-corner,.gs-rn{position:sticky;left:0;z-index:4;background:#F8F9FA !important;color:#5F6368;font-weight:400 !important;font-size:12px;text-align:center;width:40px;min-width:40px !important;}
.gs-corner{top:0;z-index:5;}
.gs .gs-frz{position:sticky;left:41px;z-index:2;background:#fff;box-shadow:2px 0 0 #C4C7C5;}
.gs-letters .gs-frz,.gs-head .gs-frz{z-index:4;background:#F8F9FA;}
.gs-name{font-weight:700;min-width:190px;}
.gs-num{text-align:right;} .gs-rank{text-align:center;font-weight:700;color:#B5651F;}
.gs-calc{background:#F1F3F4;} .gs-bold{font-weight:700;}
.gs-hi{color:#137333;} .gs-mid{color:#B06000;} .gs-lo{color:#C5221F;}
.gs-txt{white-space:normal !important;min-width:240px;max-width:380px;}
.gs td{cursor:cell;outline:none;} .gs td.gs-sel{box-shadow:inset 0 0 0 2px #1A73E8;}
.gs-empty td{background:#fff;}
.gs-tabs{display:flex;gap:2px;padding:4px 8px;background:#F8F9FA;border-top:1px solid #E1E3E1;overflow-x:auto;}
.gs-tabs button{border:0;background:none;padding:7px 16px;font:500 13px Arial,sans-serif;color:#444746;border-radius:6px 6px 0 0;cursor:pointer;white-space:nowrap;}
.gs-tabs button.on{background:#fff;color:#188038;box-shadow:inset 0 -3px 0 #188038;font-weight:700;}
.gs-tabs button.off{color:#9AA0A6;}
.gs-none{margin:16px;padding:14px;border:1px dashed #C4C7C5;border-radius:8px;background:#F8F9FA;display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
.gs-draft{margin:8px 14px 0;font-size:13px;background:#FFF7ED;border:1px solid #F4B77A;border-radius:6px;padding:6px 10px;}
.gs-card .sc-how,.gs-card .sc-empty{margin:10px 14px;}
`; document.head.appendChild(s); })();
})();
