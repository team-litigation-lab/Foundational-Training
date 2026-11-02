/* ============================================================
   📋 BATCH SHEET — one simple, Google-Sheets-style page per batch, with nothing to set up
   ------------------------------------------------------------
   Admin → 🏅 Scorecard → 📋 Batch Sheet (the first tab the Scorecard opens on). Pick a batch and every trainee who
   registered in it is on the page at once — from the moment they register, before they have done anything — in four
   tables, one under the other, all on the one page:
     1. 👥 Trainees: everyone registered in the batch (waiting for approval too), when they registered, when they were last
        on the platform, how far they are and what they were last doing.
     2. 📚 Lessons: a column per lesson — the lesson deck (✓ finished, or how far into it), the Knowledge Check score.
     3. 🏅 Scores: a column per grading system (the 🏅 Scorecard's own, js/lsh-program.js compute), the Overall and the rank.
     4. 🕒 Recent progress: everything they did, newest first: registered, opened / finished a lesson deck, Knowledge Check
        attempts, practice in the tools (Practice Lab, roleplays, random tasks), Typing & Spelling tests, Portal simulators.
   Nothing is stored here and nothing has to be started, typed or filled in: the page only reads what the platform already
   keeps (trainee:<id>, progress:<id> — the trainee's own saved progress, the Scorecard's sources, skills:<id>,
   simresults:<id>). ⬇ Download gives the whole page as a .csv file (it opens in Google Sheets or Excel).
   ============================================================ */
(function(){
"use strict";
if(typeof window.ftAdminTab !== "function") return;
const TAB = "batchsheet";
const e = v => esc(String(v == null ? "" : v));
const B = {people: null, loading: false, batch: "", data: null, dataKey: "", dataLoading: false, q: "", sel: null, recent: 14};
const bLabel = b => typeof batchLabel === "function" ? batchLabel(b) : String(b || "");
const lessons = () => (typeof DAYS !== "undefined" && Array.isArray(DAYS) ? DAYS : []);
const lessonName = id => typeof ftName === "function" ? ftName(id) : "Lesson " + id;
const t = v => { const d = v ? new Date(v) : null; return d && isFinite(d) ? d : null; };
const when = v => { const d = t(v); return d ? d.toLocaleString(undefined, {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}) : ""; };
const day = v => { const d = t(v); return d ? d.toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"}) : ""; };
const ago = v => { const d = t(v); if(!d) return ""; const m = Math.round((Date.now() - d) / 60000);
  return m < 2 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? "" : "s"} ago`; };
const pct = n => typeof n === "number" && isFinite(n) ? Math.round(n) + "%" : "";
const tone = v => typeof v !== "number" ? "" : v >= 85 ? "gs-hi" : v >= 70 ? "gs-mid" : "gs-lo";
const letter = i => { let s = ""; i++; while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const on = () => state.view === "admin" && state.adminTab === TAB;
const rerender = () => { if(on()) render(); };

/* ---------- who is in the batch: everyone who registered, approved or not ---------- */
const statusOf = r => r.rejected ? "" : r.offboarded ? "Offboarded" : r.approved === true ? "Approved" : "Waiting for approval";
async function loadPeople(){
  B.loading = true;
  try{
    let list = state.adminData;
    if(!list){ const keys = await sharedList("trainee:"); list = (await sharedGetMany(keys)).filter(Boolean); }
    B.people = list.filter(r => r && r.id && !r.archived && !r.rejected && !r.purgedAt && (r.batch || r.registeredAt))
      .map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || "", status: statusOf(r), registeredAt: r.registeredAt || "", lastActive: r.lastActive || "",
        progress: r.dayProgress || {}, since: String(r.registeredAt || "").slice(0, 10)}))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if(!B.batch){
      // the batch with the newest registration: the one the facilitator is running now
      const newest = B.people.slice().sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)))[0];
      B.batch = newest ? bLabel(newest.batch) : (batches()[batches().length - 1] || "");
    }
  }catch(err){ B.people = []; }
  B.loading = false; rerender();
}
const batches = () => [...new Set((B.people || []).map(p => bLabel(p.batch)).filter(Boolean))].sort();
const people = () => (B.people || []).filter(p => bLabel(p.batch) === B.batch);

/* ---------- what the platform already keeps about each of them ---------- */
async function loadData(){
  const ppl = people(), key = B.batch + "|" + ppl.map(p => p.id).join(",");
  if(B.dataKey === key && (B.data || B.dataLoading)) return;
  B.dataKey = key; B.dataLoading = true; rerender();
  try{
    const P = window.LSH_PROGRAM || {}, S = (P.sources || []).filter(s => s.key), shared = P.shared || [];
    const own = ["progress:", "skills:", "simresults:"];
    const want = [];
    ppl.forEach(p => { own.forEach(k => want.push(k + p.id)); S.forEach(s => want.push(s.key + p.id)); });
    const vals = [];
    for(let i = 0; i < want.length; i += 100) vals.push(...await sharedGetMany(want.slice(i, i + 100)));
    const sh = {}, shv = shared.length ? await sharedGetMany(shared) : [];
    shared.forEach((k, i) => { sh[k] = shv[i] || null; });
    const per = own.length + S.length, rec = {};
    ppl.forEach((p, i) => {
      const at = j => vals[i * per + j] || null, sc = {};
      S.forEach((s, j) => { sc[s.key] = at(own.length + j); });
      const snap = at(0), data = (snap && snap.data) || {};
      let score = null;
      try{ score = window.lshProgram ? lshProgram.compute({id: p.id, progress: data["day-progress"] || p.progress, rec: sc, shared: sh, since: p.since}) : null; }catch(err){ score = null; }
      rec[p.id] = {data, savedAt: snap && snap.savedAt, skills: at(1) || {}, sims: at(2) || {}, score};
    });
    B.data = {rec, sources: S, at: new Date()};
  }catch(err){ B.data = {rec: {}, sources: [], error: true}; }
  B.dataLoading = false; rerender();
}

/* ---------- the lesson deck: how far into it ---------- */
function deckOf(p, d){
  const r = (B.data.rec[p.id] || {}).data || {}, dp = (r["day-progress"] || p.progress || {})[d.id] || {};
  const done = Array.isArray(r["decks-done"]) && r["decks-done"].map(Number).includes(Number(d.id));
  const far = (r["slide-progress"] || {})[d.id];
  let total = 0; try{ total = typeof buildDaySlides === "function" ? buildDaySlides(d).length : 0; }catch(err){ total = 0; }
  const finished = !!(dp.studied || dp.done || done);
  const seen = typeof far === "number" ? Math.min(total || far + 1, far + 1) : 0;
  return {dp, finished, seen, total, started: finished || seen > 0};
}

/* ---------- the four tables: {title, note, head, rows:[[{v, f, cls}]]} ---------- */
function traineesTable(){
  const ppl = people(), L = lessons();
  return {id: "trainees", title: "👥 Trainees", note: "Everyone who registered in this batch, from the moment they register — before they have done anything.",
    head: ["Trainee", "Status", "Registered", "Last on the platform", "Lesson decks finished", "Knowledge Checks passed", "Last thing they opened"],
    rows: ppl.map(p => {
      const r = (B.data.rec[p.id] || {}).data || {}, decks = L.filter(d => deckOf(p, d).finished).length;
      const dp = r["day-progress"] || p.progress || {}, kc = L.filter(d => (dp[d.id] || {}).done && typeof (dp[d.id] || {}).score === "number").length;
      const lv = r["last-view"], last = lastOpened(lv);
      const lastAt = [p.lastActive, lv && lv.at, B.data.rec[p.id] && B.data.rec[p.id].savedAt].map(t).filter(Boolean).sort((a, b) => b - a)[0];
      const st = p.status;
      return [
        {v: p.name, f: `${p.name} · ${B.batch}`, cls: "gs-name"},
        {v: st, f: st === "Waiting for approval" ? "Registered, not approved yet: approve them in 🛡 Admin Master Control → Trainee Audit" : st, cls: st === "Approved" ? "gs-hi" : "gs-mid"},
        {v: day(p.registeredAt), f: p.registeredAt ? `Registered ${new Date(p.registeredAt).toLocaleString()}` : "", cls: ""},
        {v: lastAt ? ago(lastAt) : "Not yet", f: lastAt ? lastAt.toLocaleString() : "Hasn't been on the platform since registering", cls: lastAt && Date.now() - lastAt < 2 * 86400000 ? "" : "gs-lo"},
        {v: `${decks} / ${L.length}`, f: `${decks} of the ${L.length} lesson decks finished`, cls: "gs-num"},
        {v: `${kc} / ${L.length}`, f: `${kc} of the ${L.length} Knowledge Checks passed (70% passes)`, cls: "gs-num"},
        {v: last, f: lv && lv.at ? `${last} · ${new Date(lv.at).toLocaleString()}` : last, cls: "gs-txt"}];
    })};
}
function lastOpened(lv){
  if(!lv || !lv.view) return "";
  if(lv.view === "day" && lv.dayId) return `Lesson deck: ${lessonName(lv.dayId)}`;
  if(lv.view === "daydeck" && lv.deck) return `Activity deck: Day ${lv.deck.day}`;
  if(lv.view === "tool") return `Practice tool${lv.toolId ? ": " + lv.toolId : ""}`;
  if(lv.view === "knowtools") return "Know Your Tools";
  return String(lv.view);
}
function lessonsTable(){
  const ppl = people(), L = lessons();
  return {id: "lessons", title: "📚 Lessons", note: "One column per lesson: the lesson deck (✓ finished, or how many slides in) and the Knowledge Check score (70% passes). Blank: not opened yet.",
    head: ["Trainee"].concat(L.map((d, i) => `${i + 1}. ${lessonName(d.id)}`)),
    rows: ppl.map(p => [{v: p.name, f: p.name, cls: "gs-name"}].concat(L.map(d => {
      const k = deckOf(p, d), sc = typeof k.dp.score === "number" ? k.dp.score : null, tries = k.dp.kcAttempts || (k.dp.history || []).length || (sc != null ? 1 : 0);
      const deck = k.finished ? "Deck ✓" : k.seen ? `Deck ${k.seen}${k.total ? "/" + k.total : ""}` : "";
      const check = sc == null ? "" : `Check ${sc}%`;
      const f = `${lessonName(d.id)} — ` + (k.finished ? `deck finished${k.dp.studiedAt ? " " + new Date(k.dp.studiedAt).toLocaleString() : ""}` : k.seen ? `${k.seen}${k.total ? " of " + k.total : ""} slides seen` : "deck not opened yet")
        + (sc == null ? " · Knowledge Check not taken yet" : ` · Knowledge Check ${sc}%, ${tries} attempt${tries === 1 ? "" : "s"}, ${sc >= 70 ? "passed" : "not passed yet (70% passes)"}${k.dp.date ? " " + new Date(k.dp.date).toLocaleString() : ""}`);
      return {v: [deck, check].filter(Boolean).join(" · "), f, cls: "bs-lesson " + (sc != null ? tone(sc) : k.finished ? "gs-hi" : k.seen ? "gs-mid" : "")};
    })))};
}
function scoresTable(){
  const ppl = people(), S = B.data.sources;
  const rows = ppl.map(p => ({p, sc: (B.data.rec[p.id] || {}).score}));
  const order = rows.filter(r => r.sc && r.sc.overall != null).sort((a, b) => b.sc.overall - a.sc.overall);
  order.forEach((r, i) => { r.rank = i && order[i - 1].sc.overall === r.sc.overall ? order[i - 1].rank : i + 1; });
  return {id: "scores", title: "🏅 Scores", note: "Every grade the platform gives, averaged per grading system (the same as 🏅 Scorecards). Overall is their average; rank is by the Overall. A blank cell: nothing graded there yet.",
    head: ["Trainee"].concat(S.map(s => `${s.icon || ""} ${s.label}`.trim()), ["Overall", "Rank"]),
    rows: rows.map(r => [{v: r.p.name, f: r.p.name, cls: "gs-name"}].concat(S.map((s, i) => { const x = r.sc && r.sc.rows ? r.sc.rows.find(y => y.s === s) || r.sc.rows[i] : null, a = x ? x.avg : null;
        return {v: pct(a), f: a == null ? `${s.label}: nothing graded yet` : `${s.label}: average of ${x.graded} grade${x.graded === 1 ? "" : "s"} = ${a}%`, cls: "gs-num " + tone(a)}; }),
      [{v: pct(r.sc && r.sc.overall), f: r.sc && r.sc.overall != null ? `Overall = the average of the grading systems = ${r.sc.overall}%` : "Nothing graded yet", cls: "gs-num gs-calc gs-bold " + tone(r.sc && r.sc.overall)},
       {v: r.rank || "", f: r.rank ? `Rank ${r.rank} of ${order.length} in ${B.batch}` : "Not ranked: nothing graded yet", cls: "gs-num gs-rank"}]))};
}
/* Everything each trainee did, from what the platform keeps, newest first. */
function events(){
  const out = [], push = (p, at, what, detail, score) => { const d = t(at); if(d) out.push({p, at: d, what, detail: detail || "", score: typeof score === "number" ? score : null}); };
  people().forEach(p => {
    const R = B.data.rec[p.id] || {}, r = R.data || {}, dp = r["day-progress"] || p.progress || {};
    push(p, p.registeredAt, "Registered", `Batch ${B.batch}`);
    lessons().forEach(d => { const x = dp[d.id] || {};
      if(x.studiedAt) push(p, x.studiedAt, "Finished a lesson deck", lessonName(d.id));
      const hist = Array.isArray(x.history) ? x.history : [];
      hist.forEach(h => push(p, h.date, "Knowledge Check", `${lessonName(d.id)} · ${h.passed || h.score >= 70 ? "passed" : "not passed yet"}`, h.score));
      if(!hist.length && typeof x.score === "number" && x.date) push(p, x.date, "Knowledge Check", `${lessonName(d.id)} · ${x.score >= 70 ? "passed" : "not passed yet"}`, x.score);
    });
    (Array.isArray(r["work-log"]) ? r["work-log"] : []).forEach(w => {
      if(!w || w.kind === "quiz") return;   // (a Knowledge Check is listed from its lesson's attempts above)
      const what = w.kind === "lab" ? "Practice in a tool" : w.kind === "roleplay" ? "Roleplay practice" : w.kind === "task" ? "Random task" : "Practice";
      push(p, w.at, what, w.label || "", typeof w.score === "number" ? w.score : null);
    });
    const sk = R.skills || {};
    (sk.typing || []).forEach(x => push(p, x.at, "Typing test", `${x.slot || ""} · ${x.net || x.gross || 0} WPM, ${x.acc || 0}% accuracy`.replace(/^ · /, "")));
    (sk.spelling || []).forEach(x => push(p, x.at, "Spelling test", `${x.score || 0} / ${x.total || 0}`, x.total ? Math.round(100 * (x.score || 0) / x.total) : null));
    ((R.sims || {}).results || []).forEach(x => push(p, x.at, "Simulator practice", `${x.simulator || ""}${x.scenario ? " · " + x.scenario : ""}`, typeof x.score === "number" ? x.score : null));
    const lv = r["last-view"]; if(lv && lv.at) push(p, lv.at, "Opened", lastOpened(lv));
  });
  return out.sort((a, b) => b.at - a.at);
}
function recentTable(){
  const since = B.recent ? Date.now() - B.recent * 86400000 : 0;
  const list = events().filter(x => !since || +x.at >= since).slice(0, 400);
  return {id: "recent", title: "🕒 Recent progress", note: `Everything they did${B.recent ? ` in the last ${B.recent} days` : ""}, newest first: lesson decks, Knowledge Checks, practice in the tools, tests and simulators.`,
    head: ["When", "Trainee", "What", "Detail", "Score"],
    rows: list.map(x => [
      {v: when(x.at), f: x.at.toLocaleString(), cls: ""},
      {v: x.p.name, f: x.p.name, cls: "gs-name"},
      {v: x.what, f: x.what, cls: ""},
      {v: x.detail, f: x.detail, cls: "gs-txt"},
      {v: pct(x.score), f: x.score == null ? "" : `${x.score}%`, cls: "gs-num " + tone(x.score)}])};
}
const tables = () => [traineesTable(), lessonsTable(), scoresTable(), recentTable()];

/* ---------- drawing: each table a small sheet (column letters, row numbers, the names frozen) ---------- */
function sheetHtml(T, ti){
  const n = T.head.length, empty = !T.rows.length;
  return `<section class="bs-sec" id="bs-${T.id}"><h3 class="bs-h">${e(T.title)} <span>${T.rows.length} row${T.rows.length === 1 ? "" : "s"}</span></h3><p class="bs-note">${e(T.note)}</p>
    <div class="gs-wrap bs-wrap"><table class="gs" role="grid"><thead>
      <tr class="gs-letters"><th class="gs-corner"></th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}">${letter(i)}</th>`).join("")}</tr>
      <tr class="gs-head"><th class="gs-rn">1</th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}">${e(h)}</th>`).join("")}</tr></thead>
      <tbody>${T.rows.map((r, ri) => `<tr><th class="gs-rn">${ri + 2}</th>${r.map((c, ci) => `<td tabindex="0" class="${c.cls || ""}${ci === 0 && T.id !== "recent" ? " gs-frz" : ""}" data-t="${ti}" data-r="${ri}" data-c="${ci}" onclick="FTBatchSheet.pick(this)" onfocus="FTBatchSheet.pick(this)">${e(c.v)}</td>`).join("")}</tr>`).join("")}
      ${empty ? `<tr class="gs-empty"><th class="gs-rn">2</th><td colspan="${n}" class="bs-none">${T.id === "recent" ? "Nothing yet in this period." : "No trainee in this batch yet."}</td></tr>` : ""}</tbody></table></div></section>`;
}
function renderSheet(){
  if(!B.people){ if(!B.loading) loadPeople(); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Loading the batches…</div>`; }
  const bs = batches();
  if(!B.batch) return `<div class="card gs-card"><p class="sc-empty">No trainee has registered yet. They appear here as soon as they register.</p></div>`;
  loadData();
  const ppl = people(), D = B.data, ready = D && !B.dataLoading && !D.error;
  const T = ready ? tables() : null;
  const approved = ppl.filter(p => p.status === "Approved").length, waiting = ppl.filter(p => p.status === "Waiting for approval").length;
  return `<div class="card gs-card bs-card">
    <div class="gs-top"><span class="gs-logo">📋</span><div class="gs-file"><b>Batch Sheet · ${e(B.batch)}</b>
        <span class="gs-menu"><button onclick="FTBatchSheet.csv()">⬇ Download</button><button onclick="FTBatchSheet.refresh()">↻ Refresh</button><button onclick="window.print()">🖨 Print</button></span></div>
      <label class="gs-batch">Batch <select onchange="FTBatchSheet.batch(this.value)">${bs.map(b => `<option ${b === B.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></label></div>
    <div class="bs-sum"><span><b>${ppl.length}</b> registered</span><span><b>${approved}</b> approved</span>${waiting ? `<span class="bs-wait"><b>${waiting}</b> waiting for approval</span>` : ""}
      <span class="bs-jump">Go to: <a href="#bs-trainees" onclick="return FTBatchSheet.go('trainees')">👥 Trainees</a> · <a href="#bs-lessons" onclick="return FTBatchSheet.go('lessons')">📚 Lessons</a> · <a href="#bs-scores" onclick="return FTBatchSheet.go('scores')">🏅 Scores</a> · <a href="#bs-recent" onclick="return FTBatchSheet.go('recent')">🕒 Recent progress</a></span>
      ${D && D.at ? `<span class="bs-at">Updated ${e(D.at.toLocaleTimeString())}</span>` : ""}</div>
    <div class="gs-fbar"><span class="gs-ref" id="bsRef">${B.sel ? e(B.sel.ref) : ""}</span><span class="gs-fx">fx</span><input id="bsBar" readonly value="${B.sel ? e(B.sel.f) : "Click any cell to see what it means"}" aria-label="What the selected cell is"></div>
    ${!D || B.dataLoading ? `<p class="sc-empty">Reading the batch's progress…</p>` : D.error ? `<p class="sc-empty">Couldn't read the batch's progress. Press ↻ Refresh.</p>`
      : T.map((x, i) => i === 3 ? sheetHtml(x, i).replace('<p class="bs-note">', `<p class="bs-note"><label class="bs-period">Show <select onchange="FTBatchSheet.period(this.value)">${[[1, "today"], [7, "the last 7 days"], [14, "the last 14 days"], [30, "the last 30 days"], [0, "everything"]].map(([v, l]) => `<option value="${v}" ${B.recent === v ? "selected" : ""}>${l}</option>`).join("")}</select></label> `) : sheetHtml(x, i)).join("")}
    <p class="sc-how bs-how">Nothing to set up: this page reads what the platform already records. New trainees appear as soon as they register. Click a cell to see what it means in the bar above. ⬇ Download saves all four tables as one file that opens in Google Sheets or Excel.</p></div>`;
}

window.FTBatchSheet = {
  batch(b){ B.batch = b; B.data = null; B.dataKey = ""; B.sel = null; render(); },
  refresh(){ B.people = null; B.data = null; B.dataKey = ""; B.sel = null; if(typeof state === "object") state.adminData = null; render(); },
  period(v){ B.recent = Number(v) || 0; render(); },
  open(){ state.adminTab = TAB; goto("admin"); },
  go(id){ const el = document.getElementById("bs-" + id); if(el) el.scrollIntoView({behavior: "smooth", block: "start"}); return false; },
  pick(td){
    if(!B.data) return; const T = tables()[Number(td.getAttribute("data-t"))]; if(!T) return;
    const r = Number(td.getAttribute("data-r")), c = Number(td.getAttribute("data-c")), cell = (T.rows[r] || [])[c]; if(!cell) return;
    document.querySelectorAll(".bs-card .gs td.gs-sel").forEach(x => x.classList.remove("gs-sel")); td.classList.add("gs-sel");
    B.sel = {ref: `${T.title.replace(/^\S+\s/, "")}!${letter(c)}${r + 2}`, f: cell.f || String(cell.v || "")};
    const ref = document.getElementById("bsRef"), bar = document.getElementById("bsBar"); if(ref) ref.textContent = B.sel.ref; if(bar) bar.value = B.sel.f;
  },
  csv(){
    if(!B.data || B.dataLoading){ toast("The sheet is still loading."); return; }
    const q = v => { const s = String(v == null ? "" : v); return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`; };
    const lines = [];
    tables().forEach(T => { lines.push(q(T.title.replace(/^\S+\s/, ""))); lines.push(T.head.map(q).join(",")); T.rows.forEach(r => lines.push(r.map(c => q(c.v)).join(","))); lines.push(""); });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], {type: "text/csv"}));
    a.download = `Batch Sheet ${B.batch} ${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  // for the checks
  tables: () => B.data && !B.dataLoading ? tables() : null,
  events: () => B.data ? events() : null
};

ftAdminTab(TAB, "📋 Batch Sheet", renderSheet);

// the page is wide while the Batch Sheet is open: more room for the tables
const __render = window.render;
window.render = function(){
  const out = __render.apply(this, arguments);
  try{ document.body.classList.toggle("bs-wide", on()); }catch(err){}
  return out;
};

(function(){ const s = document.createElement("style"); s.id = "ft-batch-sheet"; s.textContent = `
body.bs-wide main{max-width:none !important;padding-left:18px;padding-right:18px;}
.bs-card .gs-file b{font-size:20px;}
.bs-sum{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;padding:8px 14px 10px;background:#F9FBFD;font:14px Arial,sans-serif;color:#1F1F1F;}
.bs-sum b{font-size:16px;} .bs-wait{color:#B06000;} .bs-at{margin-left:auto;color:#5F6368;font-size:12.5px;}
.bs-jump a{color:#1A73E8;text-decoration:none;font-weight:700;} .bs-jump a:hover{text-decoration:underline;}
.bs-sec{padding:14px 14px 4px;border-top:1px solid #E1E3E1;scroll-margin-top:12px;}
.bs-h{margin:0 0 2px;font:700 18px Arial,sans-serif;color:#1F1F1F;} .bs-h span{font:400 13px Arial,sans-serif;color:#5F6368;margin-left:6px;}
.bs-note{margin:0 0 8px;font:13.5px Arial,sans-serif;color:#444746;}
.bs-period select{font:13px Arial,sans-serif;padding:3px 6px;border:1px solid #C4C7C5;border-radius:4px;margin:0 6px 0 4px;}
.bs-wrap{max-height:none;border:1px solid #E1E3E1;border-radius:4px;}
.bs-card .gs{font-size:14px;} .bs-card .gs th,.bs-card .gs td{height:26px;padding:5px 10px;}
.bs-card .gs-head th{max-width:220px;min-width:110px;word-break:normal;overflow-wrap:normal;hyphens:none;}
#bs-lessons .gs-head th{min-width:170px;}
.bs-lesson{text-align:center;white-space:nowrap;}
#bsBar{flex:1 1 auto;border:0;padding:6px 10px;font:inherit;color:#1F1F1F;background:#fff;outline:none;min-width:0;}
.bs-card .gs-txt{min-width:260px;max-width:520px;}
.bs-none{color:#5F6368;font-style:italic;text-align:left !important;}
.bs-how{font-size:13.5px;}
@media print{ .bs-card .gs-menu,.bs-card .gs-fbar,.bs-jump,.lp-admin-tabs{display:none !important;} body.bs-wide main{padding:0;} .bs-wrap{overflow:visible;} }
`; document.head.appendChild(s); })();
})();
