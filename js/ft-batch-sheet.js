/* ============================================================
   📋 BATCH SHEET — one simple, Google-Sheets-style page per batch, with nothing to set up
   ------------------------------------------------------------
   Admin → 🏅 Scorecard → 📋 Batch Sheet (the first tab the Scorecard opens on). Pick a batch and every trainee who
   registered in it is on the page at once — from the moment they register, before they have done anything — in four
   tables, one under the other, all on the one page:
     1. 👥 Trainees: everyone registered in the batch (waiting for approval too), when they registered, when they were last
        on the platform, how far they are and what they were last doing.
     2. 📚 Lessons: a column per lesson — the lesson deck (✓ finished, or how far into it), the Knowledge Check score.
     3. 🛠 Practice Lab: the tools practised in, the attempts, the last practice, and each tool's attempts · average.
     4. 🏅 Scores: a column per grading system (the 🏅 Scorecard's own, js/lsh-program.js compute), the Overall and the rank.
     5. 🕒 Recent progress: everything they did, newest first: registered, opened / finished a lesson deck, Knowledge Check
        attempts, practice in the tools (Practice Lab, roleplays, random tasks), Typing & Spelling tests, Portal simulators.
   Nothing is stored here and nothing has to be started, typed or filled in: the page only reads what the platform already
   keeps (trainee:<id>, progress:<id> — the trainee's own saved progress, the Scorecard's sources, skills:<id>,
   simresults:<id>). ⬇ Download gives the whole page as a .csv file (it opens in Google Sheets or Excel).
   🔒 THE TRAINEE'S SIDE (role-based): 📋 My Progress in a trainee's top bar (#/mysheet) is the same sheet with only their
   own row — 👤 Me, 📚 Lessons, 🏅 Scores (no rank: that is the batch's) and 🕒 Recent progress — and nothing about anyone
   else: no batch picker, no other trainee, no ✏️ Fix the batch name or ↩ Bring them back. It reads only the trainee's own
   records (never the list of trainees), which is also all the Worker lets a trainee read; the trainer's actions refuse to
   run for anyone but an admin.
   ============================================================ */
(function(){
"use strict";
if(typeof window.ftAdminTab !== "function") return;
const TAB = "batchsheet";
const e = v => esc(String(v == null ? "" : v));
const B = {auto: [], people: null, loading: false, batch: "", data: null, dataKey: "", dataLoading: false, q: "", sel: null, recent: 14, fix: null};
const canon = v => typeof canonicalBatch === "function" ? canonicalBatch(v) : "";
const bLabel = b => typeof batchLabel === "function" ? batchLabel(b) : String(b || "");
const lessons = () => (typeof DAYS !== "undefined" && Array.isArray(DAYS) ? DAYS : []);
const lessonName = id => typeof ftName === "function" ? ftName(id) : "Lesson " + id;
const t = v => { const d = v ? new Date(v) : null; return d && isFinite(d) ? d : null; };
const when = v => { const d = t(v); return d ? d.toLocaleString(undefined, {month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"}) : ""; };
const day = v => { const d = t(v); return d ? d.toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"}) : ""; };
const ago = v => { const d = t(v); if(!d) return ""; const m = Math.round((Date.now() - d) / 60000);
  return m < 2 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? "" : "s"} ago`; };
const pct = n => typeof n === "number" && isFinite(n) ? Math.round(n) + "%" : "";
const tone = v => typeof v !== "number" ? "" : v >= 85 ? "gs-hi" : v >= 70 ? "gs-mid" : "gs-lo";
const letter = i => { let s = ""; i++; while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;   // a trainee session is never an admin one
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const ME = "mysheet";
const meOn = () => state.view === ME && isTrainee();
const on = () => (state.view === "admin" && state.adminTab === TAB && adminOn()) || meOn();
const rerender = () => { if(on()) render(); };

/* ---------- who is in the batch: everyone who registered, approved or not ---------- */
const statusOf = r => r.rejected ? "" : r.offboarded ? "Offboarded" : r.approved === true ? "Approved" : "Waiting for approval";
async function loadPeople(){
  if(!adminOn()){ B.people = []; return; }   // 🔒 the list of trainees is a trainer's only
  B.loading = true;
  try{
    let list = state.adminData;
    if(!list){ const keys = await sharedList("trainee:"); list = (await sharedGetMany(keys)).filter(Boolean); }
    // trainees the tidy-up archived on its own (js/ft-admin-tidy.js), not a trainer: offered back with ↩ Bring them back
    B.auto = list.filter(r => r && r.id && r.archived && r.autoArchived && !r.rejected && !r.purgedAt && !r.offboarded)
      .map(r => ({id: r.id, name: r.name || r.id, batch: bLabel(r.batch || "")}));
    B.people = list.filter(r => r && r.id && !r.archived && !r.rejected && !r.purgedAt && (r.batch || r.registeredAt))
      .map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || "", status: statusOf(r), registeredAt: r.registeredAt || "", registeredAtWas: r.registeredAtFixedAt ? r.registeredAtWas || "" : null, lastActive: r.lastActive || "",
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
const batches = () => [...new Set((B.people || []).map(p => bLabel(p.batch)).concat((B.auto || []).map(p => p.batch)).filter(Boolean))].sort();
const people = () => meOn() ? (B.me ? [B.me] : []) : (B.people || []).filter(p => bLabel(p.batch) === B.batch);

/* ---------- what the platform already keeps about each of them ---------- */
async function loadData(){
  const ppl = people(), key = B.batch + "|" + ppl.map(p => p.id).join(",");
  if(B.dataKey === key && (B.data || B.dataLoading)) return;
  B.dataKey = key; B.dataLoading = true; rerender();
  try{
    const P = window.LSH_PROGRAM || {}, S = (P.sources || []).filter(s => s.key), shared = P.shared || [];
    const own = ["progress:", "skills:", "simresults:", "transcribe:", "lor:", "daycheck:", "drive:", "feedback:"];
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
      rec[p.id] = {data, savedAt: snap && snap.savedAt, skills: at(1) || {}, sims: at(2) || {}, transcribe: at(3), lor: at(4), daycheck: at(5) || {items: {}}, drive: at(6), feedback: at(7), src: sc, score};
    });
    // the batch's 📊 Weekly Ranking reports (a trainer's: ranking:<batch>:w1–6), for the weeks' average in 🏅 Scores
    let reps = [];
    if(adminOn() && !meOn()){ const rk = w => `ranking:${String(B.batch || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
      try{ reps = (await sharedGetMany([1, 2, 3, 4, 5, 6].map(rk))).map(r => r && Array.isArray(r.cols) ? r : null); }catch(err){ reps = []; } }
    B.data = {rec, sources: S, reps, at: new Date()};
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
  return {id: "trainees", title: meOn() ? "👤 Me" : "👥 Trainees", note: meOn() ? "Your account and how far you are." : "Everyone who registered in this batch, from the moment they register — before they have done anything.",
    head: ["Trainee", "Status", "Registered", "Last on the platform", "Lesson decks finished", "Knowledge Checks passed", "Last thing they opened"],
    rows: ppl.map(p => {
      const r = (B.data.rec[p.id] || {}).data || {}, decks = L.filter(d => deckOf(p, d).finished).length;
      const dp = r["day-progress"] || p.progress || {}, kc = L.filter(d => (dp[d.id] || {}).done && typeof (dp[d.id] || {}).score === "number").length;
      const lv = r["last-view"], last = lastOpened(lv);
      const lastAt = [p.lastActive, lv && lv.at, B.data.rec[p.id] && B.data.rec[p.id].savedAt].map(t).filter(Boolean).sort((a, b) => b - a)[0];
      const st = p.status;
      return [
        {v: p.name, f: `${p.name} · ${B.batch}`, cls: "gs-name"},
        {v: st, f: st === "Waiting for approval" ? "Registered, not approved yet: approve them in 🏅 Scorecard → Trainee Audit" : st, cls: st === "Approved" ? "gs-hi" : "gs-mid"},
        {v: (when(p.registeredAt) || day(p.registeredAt)) + (p.registeredAtWas != null ? " ✎" : ""), f: p.registeredAt ? `Registered ${new Date(p.registeredAt).toLocaleString()}${p.registeredAtWas != null ? ` · ✎ fixed by a trainer${p.registeredAtWas ? ", it was " + new Date(p.registeredAtWas).toLocaleString() : ""}` : ""}` : "", cls: ""},
        {v: lastAt ? when(lastAt) : "Not yet", f: lastAt ? `${lastAt.toLocaleString()} (${ago(lastAt)})` : "Hasn't been on the platform since registering", cls: lastAt && Date.now() - lastAt < 2 * 86400000 ? "" : "gs-lo"},
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
/* 🏅 Scores: every grading system's average (the Scorecard's own compute), then — what 📈 Overall Performance showed —
   the Daily compliance (the end-of-shift check's average, trackerreview:<id>.compliance), the weeks' average out of 5 (the
   📊 Weekly Ranking reports) and the Overall % (the average of the three that have a value), ranked by it. */
const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : null; };
const avgOf = xs => { const v = xs.filter(x => typeof x === "number" && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
function weekMark(rep, id){
  const r = rep && (rep.rows || {})[id]; if(!r) return null;
  return avgOf(rep.cols.map(c => { const raw = num(((r.cells || {})[c.id] || {}).raw); return raw == null || c.type !== "score" ? null : Math.max(0, Math.min(5, raw / (num(c.max) || 5) * 5)); }));
}
function compOf(p){ const c = (((B.data.rec[p.id] || {}).src || {})["trackerreview:"] || {}).compliance || {};
  const days = Object.values(c).filter(x => x && typeof x.pct === "number"); return {pct: avgOf(days.map(x => x.pct)), n: days.length}; }
/* 💬 the day-by-day feedback a trainer sends (👥 Trainees & Batches → ✍ Feedback; feedback:<id>.days[lesson]): how many
   lessons have it, the latest one's rating, and in the bar every sent one's rating and summary. Drafts are the trainer's
   own (a trainee never sees one), so only sent feedback counts here, for the trainer and the trainee alike. */
function fbCell(p){
  const days = (((B.data.rec[p.id] || {}).feedback || {}).days) || {};
  const sent = Object.entries(days).filter(([, v]) => v && v.status === "sent").sort((a, b) => String(b[1].sentAt || "").localeCompare(String(a[1].sentAt || "")));
  const drafts = meOn() ? 0 : Object.values(days).filter(v => v && v.status === "draft").length;
  if(!sent.length) return {v: drafts ? `${drafts} draft${drafts === 1 ? "" : "s"}` : "", f: drafts ? `No feedback sent yet · ${drafts} draft${drafts === 1 ? "" : "s"} waiting to be sent (✍ Feedback)` : "No day-by-day feedback sent yet", cls: drafts ? "gs-txt gs-lo" : "gs-txt"};
  const [l0, f0] = sent[0], tone_ = r => /Strong/i.test(r || "") ? "gs-hi" : /Needs/i.test(r || "") ? "gs-lo" : "gs-mid";
  return {v: `${sent.length} sent · ${f0.rating || "—"}`, cls: "gs-txt " + tone_(f0.rating),
    f: sent.map(([l, v]) => `${lessonName(Number(l))}: ${v.rating || "—"}${v.sentAt ? " (" + day(v.sentAt) + ")" : ""}${v.summary ? " — " + String(v.summary).replace(/\s+/g, " ").slice(0, 220) : ""}`).join("  ·  ") + (drafts ? `  ·  ${drafts} draft${drafts === 1 ? "" : "s"} not sent yet` : "")};
}
function scoresTable(){
  const ppl = people(), S = B.data.sources, reps = B.data.reps || [], weeks = reps.map((r, i) => r ? i + 1 : null).filter(Boolean), me = meOn();
  const rows = ppl.map(p => { const sc = (B.data.rec[p.id] || {}).score, comp = compOf(p), ws = weeks.map(w => weekMark(reps[w - 1], p.id)), wavg = avgOf(ws);
    const overall = avgOf([sc && sc.overall, comp.pct, wavg == null ? null : wavg / 5 * 100]); return {p, sc, comp, ws, wavg, overall}; });
  const order = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall);
  order.forEach((r, i) => { r.rank = i && Math.round(order[i - 1].overall) === Math.round(r.overall) ? order[i - 1].rank : i + 1; });
  const extra = ["💬 Trainer feedback (day by day)", "Scorecard overall", "Daily compliance"].concat(me ? [] : ["Weeks average (/5)"], ["Overall %"], me ? [] : ["Rank"]);
  return {id: "scores", title: "🏅 Scores", note: me ? "Every grade the platform gives you, averaged per grading system, your trainer’s day-by-day feedback (💬: how many sent, the latest rating), your Daily compliance (the end-of-shift check) and your Overall %. Your grades in detail are under the table."
      : "Every grade, averaged per grading system (blank: nothing graded yet), the 💬 day-by-day feedback sent (how many, the latest rating; click it for each one), then the Daily compliance (the end-of-shift check), the weeks' average from 📊 Weekly Ranking, and the Overall % (the average of the three), ranked. Pick a trainee under the table for their grades in detail.",
    head: ["Trainee"].concat(S.map(s => `${s.icon || ""} ${s.label}`.trim()), extra),
    rows: rows.map(r => [{v: r.p.name, f: r.p.name, cls: "gs-name"}].concat(S.map((s, i) => { const x = r.sc && r.sc.rows ? r.sc.rows.find(y => y.s === s) || r.sc.rows[i] : null, a = x ? x.avg : null;
        return {v: pct(a), f: a == null ? `${s.label}: nothing graded yet` : `${s.label}: average of ${x.graded} grade${x.graded === 1 ? "" : "s"} = ${a}%`, cls: "gs-num " + tone(a)}; }),
      [fbCell(r.p), {v: pct(r.sc && r.sc.overall), f: r.sc && r.sc.overall != null ? `Scorecard overall = the average of the grading systems = ${r.sc.overall}%` : "Nothing graded yet", cls: "gs-num " + tone(r.sc && r.sc.overall)},
       {v: pct(r.comp.pct), f: r.comp.pct == null ? "No day checked yet (the check runs at the end of every shift)" : `The average of ${r.comp.n} day${r.comp.n === 1 ? "" : "s"}' compliance = ${Math.round(r.comp.pct)}% (each day in 📤 Daily outputs)`, cls: "gs-num " + tone(r.comp.pct)}]
      .concat(me ? [] : [{v: r.wavg == null ? "" : r.wavg.toFixed(2), f: r.wavg == null ? "No week reported yet (📊 Weekly Ranking)" : `The weeks' final averages (${weeks.map((w, i) => `W${w} ${r.ws[i] == null ? "–" : r.ws[i].toFixed(2)}`).join(", ")}) = ${r.wavg.toFixed(2)}/5`, cls: "gs-num " + tone(r.wavg == null ? null : r.wavg / 5 * 100)}],
        [{v: pct(r.overall), f: r.overall == null ? "Nothing to average yet" : `Overall % = the average of the Scorecard ${pct(r.sc && r.sc.overall) || "–"}, the Daily compliance ${pct(r.comp.pct) || "–"}${me ? "" : ` and the weeks ${r.wavg == null ? "–" : Math.round(r.wavg / 5 * 100) + "%"}`} = ${Math.round(r.overall)}%`, cls: "gs-num gs-calc gs-bold " + tone(r.overall)}],
        me ? [] : [{v: r.rank || "", f: r.rank ? `Rank ${r.rank} of ${order.length} in ${B.batch}, by the Overall %` : "Not ranked: nothing to average yet", cls: "gs-num gs-rank"}])))};
}
/* a trainee's grades in detail (what 🏅 Scorecards showed on a click): each grading system and every item in it */
function gradesHtml(){
  const ppl = people(); if(!ppl.length || !B.data) return "";
  const id = meOn() ? ppl[0].id : (B.gr && ppl.some(p => p.id === B.gr) ? B.gr : ppl[0].id), sc = (B.data.rec[id] || {}).score;
  return `<div class="bs-ck">${meOn() ? `<h4>🔎 My grades in detail</h4>` : `<label class="bs-ck-who">🔎 Grades in detail for <select onchange="FTBatchSheet.grWho(this.value)">${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>`}
    ${!sc || !sc.rows ? `<p class="bs-note">Nothing graded yet.</p>` : `<div class="bs-days">${sc.rows.filter(r => r.items && r.items.length).map(r => `<div class="bs-day"><div class="bs-day-h"><b>${e(r.s.icon || "")} ${e(r.s.label)}</b><em class="${tone(r.avg)}">${pct(r.avg) || "—"}</em></div>
      ${r.items.map(it => `<div class="bs-gr"><span>${e(it.name)}</span><b class="${tone(it.pct)}">${typeof it.pct === "number" ? pct(it.pct) : "—"}</b>${it.note ? `<small>${e(it.note)}</small>` : ""}</div>`).join("")}</div>`).join("")}</div>`}</div>`;
}
/* 📤 Daily outputs: each training day's compliance (worker.js dailyCompliance, at the end of every shift): the Daily Task
   Tracker, the Monitoring Sheet, the Typing and Spelling tests, the day's outputs (links submitted or files saved in the
   folder) and the EOD email, each a %, and their average — what 📈 Overall Performance's Daily Compliance sheet showed. */
const PART = {tracker: "Task Tracker", monitor: "Monitoring Sheet", tests: "Typing & Spelling", outputs: "Day's outputs", eod: "EOD email"};
function outputsTable(){
  const ppl = people(), comp = p => (((B.data.rec[p.id] || {}).src || {})["trackerreview:"] || {}).compliance || {};
  const dates = [...new Set(ppl.flatMap(p => Object.keys(comp(p))))].sort().slice(-30);
  const md = d => { const x = new Date(d + "T12:00:00Z"); return x.toLocaleDateString(undefined, {weekday: "short", month: "numeric", day: "numeric", timeZone: "UTC"}); };
  return {id: "outputs", title: "📤 Daily outputs", note: `${meOn() ? "Your" : "Each trainee's"} day as the end-of-shift check found it: the Task Tracker, the Monitoring Sheet, the Typing & Spelling tests, the day's outputs and the EOD email, each a %, averaged. Click a day for its parts. ${dates.length ? "" : "No day checked yet: the check runs at the end of every shift."}`,
    head: ["Trainee", "Average"].concat(dates.map(md)),
    rows: ppl.map(p => { const c = comp(p), vs = dates.map(d => c[d] && typeof c[d].pct === "number" ? c[d].pct : null), a = avgOf(vs);
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: pct(a), f: a == null ? "No day checked yet" : `The average of the days = ${pct(a)}`, cls: "gs-num gs-calc gs-bold " + tone(a)}]
        .concat(dates.map((d, i) => { const x = c[d]; if(!x) return {v: "", f: `${md(d)}: not checked`, cls: "gs-num"};
          const parts = Object.entries(x.parts || {}).filter(([, v]) => v != null).map(([k, v]) => `${PART[k] || k} ${v}%`).join(" · ");
          const tests = x.tests ? ` (typing AM ${x.tests.AM ? "✓" : "✗"}, PM ${x.tests.PM ? "✓" : "✗"}, spelling ${x.tests.SP ? "✓" : "✗"})` : "";
          return {v: pct(vs[i]), f: `${md(d)}: ${parts}${tests}${(x.submissions || []).length ? ` · submitted: ${x.submissions.join(", ")}` : ""} = ${pct(vs[i])}`, cls: "gs-num " + tone(vs[i])}; }));
    })};
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
  return {id: "recent", title: "🕒 Recent progress", note: `Everything ${meOn() ? "you" : "they"} did${B.recent ? ` in the last ${B.recent} days` : ""}, newest first: lesson decks, Knowledge Checks, practice in the tools, tests and simulators.`,
    head: ["When", "Trainee", "What", "Detail", "Score"],
    rows: list.map(x => [
      {v: when(x.at), f: x.at.toLocaleString(), cls: ""},
      {v: x.p.name, f: x.p.name, cls: "gs-name"},
      {v: x.what, f: x.what, cls: ""},
      {v: x.detail, f: x.detail, cls: "gs-txt"},
      {v: pct(x.score), f: x.score == null ? "" : `${x.score}%`, cls: "gs-num " + tone(x.score)}])};
}
/* 🛠 Practice Lab: how much each trainee uses it — the tools they have practised in, their attempts and when they last
   practised, then a column per tool (attempts · average). The Practice Lab's own grading systems come from the Scorecard
   (the same items 🏅 Scorecards counts); the AI-graded practice tools and roleplays from the trainee's work log. */
const LAB = ["sessions", "calls", "calendar", "calcheck", "calrules", "calweek", "drills", "listening", "skills", "portalsims"];
const PRACTICE = new Set(["Practice in a tool", "Roleplay practice", "Typing test", "Spelling test", "Simulator practice"]);
function practiceTable(){
  const ppl = people(), S = B.data.sources.filter(s => LAB.includes(s.id)), all = events();
  const cols = [{id: "ai", label: "🤖 Practice tools (AI-graded)"}, {id: "rp", label: "🎭 Roleplays"}].concat(S.map(s => ({id: s.id, label: `${s.icon || ""} ${s.label}`.trim(), s})));
  return {id: "practice", title: "🛠 Practice Lab", note: `${meOn() ? "How much you use" : "How much each trainee uses"} the Practice Lab: the tools practised in (of ${cols.length}), every attempt, the last time, then each tool (attempts · average score). Blank: not used yet.`,
    head: ["Trainee", "Tools used", "Attempts", "Last practice"].concat(cols.map(c => c.label)),
    rows: ppl.map(p => {
      const R = B.data.rec[p.id] || {}, wl = Array.isArray((R.data || {})["work-log"]) ? R.data["work-log"] : [];
      const cell = c => {
        if(c.id === "ai" || c.id === "rp"){
          const xs = wl.filter(w => w && (c.id === "ai" ? w.kind === "lab" : w.kind === "roleplay")), sc = xs.map(w => w.score).filter(n => typeof n === "number");
          const a = sc.length ? Math.round(sc.reduce((x, y) => x + y, 0) / sc.length) : null, last = xs.map(w => t(w.at)).filter(Boolean).sort((x, y) => y - x)[0];
          return {n: xs.length, a, f: xs.length ? `${c.label}: ${xs.length} attempt${xs.length === 1 ? "" : "s"}${a != null ? `, average ${a}%` : ""}${last ? ` · last ${last.toLocaleString()}` : ""}${xs.length ? ` · ${[...new Set(xs.map(w => w.label).filter(Boolean))].slice(0, 4).join(", ")}` : ""}` : `${c.label}: not used yet`};
        }
        const x = R.score && R.score.rows ? R.score.rows.find(y => y.s === c.s) : null, n = x ? x.graded : 0;
        return {n, a: x ? x.avg : null, f: n ? `${c.label}: ${n} graded${x.avg != null ? `, average ${x.avg}%` : ""}${x.items ? ` · ${x.items.filter(i => typeof i.pct === "number").slice(0, 4).map(i => i.name).join(", ")}` : ""}` : `${c.label}: not used yet`};
      };
      const cells = cols.map(cell), used = cells.filter(c => c.n > 0).length, total = cells.reduce((x, c) => x + c.n, 0);
      const last = all.filter(ev => ev.p.id === p.id && PRACTICE.has(ev.what)).map(ev => ev.at)[0];
      return [{v: p.name, f: p.name, cls: "gs-name"},
        {v: `${used} / ${cols.length}`, f: `${used} of the ${cols.length} Practice Lab tools used`, cls: "gs-num " + (used ? "" : "gs-lo")},
        {v: total || "", f: `${total} practice attempt${total === 1 ? "" : "s"} in all`, cls: "gs-num gs-bold"},
        {v: last ? when(last) : "Not yet", f: last ? `${last.toLocaleString()} (${ago(last)})` : "No practice yet", cls: last ? "" : "gs-lo"}]
        .concat(cells.map(c => ({v: c.n ? `${c.n}${c.a != null ? " · " + c.a + "%" : ""}` : "", f: c.f, cls: "bs-lesson " + tone(c.a)})));
    })};
}
/* 📅 Day by Day: the 16 training days (js/ft-day-activities.js, the Training Guide's own list), each activity a tick box.
   Ticked by itself where the platform already has the proof — the day's Knowledge Check passed, the Practice Session
   submitted, the trainer-recorded Mock Call / Demo, the tool's work saved — and by the trainer for the rest (the classroom,
   the GC, Drive), in daycheck:<id> = {items: {"<day>|<activity>": {done, at}}}, which a trainee reads and only a trainer
   writes (worker.js TRAINER_OWNED). The daily tests and upskill hour, repeated on every day, are left out of the count. */
// each activity's kind, for the totals across the 16 days
const KINDS = [["kc", "✍️ Knowledge Checks"], ["practice", "🛠 Practice"], ["mock", "🎙 Mock Calls & Demos"], ["class", "🏫 Classroom & outputs"]];
const kindOf = it => it.at === "tool" && it.id === "process" ? "kc" : it.at === "trainer" || /Mock call|Demo/i.test(it.kind || "") ? "mock" : it.at === "session" || it.at === "tool" ? "practice" : "class";
const DAILY_T = /^(Typing Test \(morning|Spelling Test \(once a day\)|Free Communication Upskill)/;
const dayList = () => (window.FTDays && FTDays.DAYS ? FTDays.DAYS : []);
const dayItems = d => (d.items || []).filter(it => !DAILY_T.test(it.t));
const ckKey = (d, it) => `${d.day}|${it.t}`.slice(0, 200);
const nonEmpty = v => !!v && (typeof v !== "object" || Object.keys(v).length > 0);
function autoDone(R, d, it, p){
  const src = R.src || {}, dp = (R.data || {})["day-progress"] || p.progress || {};
  if(it.at === "session"){ const runs = ((src["sessions:"] || {}).runs) || {}; const k = Object.keys(runs).find(x => x.split("|")[0] === it.id && runs[x] && runs[x].submittedAt);
    return k ? {done: true, how: "Practice Session submitted " + when(runs[k].submittedAt)} : {done: false, how: "Practice Session not submitted yet"}; }
  if(it.at === "trainer"){ const a = (((src["labreview:"] || {}).acts) || {})[it.id];
    if(!a) return {done: false, how: "Not recorded by the trainer yet (🧑‍🏫 Trainer Inputs)"};
    if(a.status === "Redo") return {done: false, how: "Trainer: Redo" + (a.score != null ? ` (${a.score}%)` : "")};
    return {done: a.status === "Passed" || a.score != null || !!a.status, how: `Trainer: ${a.status || "recorded"}${a.score != null ? ` · ${a.score}%` : ""}`}; }
  if(it.at !== "tool") return null;
  switch(it.id){
    case "process": { const ls = d.lessons || []; if(!ls.length) return null; const ok = ls.every(l => dp[l] && dp[l].done);
      return {done: ok, how: ok ? "Knowledge Check passed" : "Knowledge Check not passed yet"}; }
    case "skills": { const k = R.skills || {}, n = (k.typing || []).length + (k.spelling || []).length; return {done: n > 0, how: n ? `${n} test${n === 1 ? "" : "s"} taken` : "No test yet"}; }
    case "transcribe": { const r = ((R.transcribe || {}).r) || {}, ok = Object.values(r).some(x => x && x.submittedAt); return {done: ok, how: ok ? "Transcription submitted" : "Not submitted yet"}; }
    case "lor": return {done: nonEmpty(R.lor), how: nonEmpty(R.lor) ? "Letters drafted" : "Not started yet"};
    case "drills": case "listening": case "calcheck": case "calrules": case "calweek": case "calsim": case "callsim":
      { const v = src[(it.id === "callsim" ? "callsim" : it.id) + ":"]; return {done: nonEmpty(v), how: nonEmpty(v) ? "Done on the platform" : "Not done on the platform yet"}; }
    case "calactivity": { const v = src["calcheck:"]; return {done: nonEmpty(v), how: nonEmpty(v) ? "Checked on the Calendar Activity Check" : "Not checked yet"}; }
    default: return null;   // (the drafting guide, the MedLOR packet, the Lien BV: ticked by the trainer)
  }
}
function dayStatus(p, d){
  const R = B.data.rec[p.id] || {}, man = ((R.daycheck || {}).items) || {};
  return dayItems(d).map(it => { const a = autoDone(R, d, it, p), m = man[ckKey(d, it)];
    return {it, key: ckKey(d, it), auto: a, manual: !!(m && m.done), mAt: m && m.at, done: !!(m && m.done) || !!(a && a.done)}; });
}
function daysTable(){
  const ppl = people(), D = dayList();
  return {id: "days", title: "📅 Day by Day", note: `${meOn() ? "Your" : "Each trainee's"} activities on each training day, done of how many. ${meOn() ? "Your checklist is under the table." : "Pick a trainee under the table to tick off their activities."} ✓ = every activity of the day done.`,
    head: ["Trainee", "Days complete"].concat(KINDS.map(k => k[1]), D.map(d => `Day ${d.day}`)),
    rows: ppl.map(p => { const st = D.map(d => dayStatus(p, d)), full = st.filter(x => x.length && x.every(y => y.done)).length;
      const all = st.flat(), kind = k => all.filter(y => kindOf(y.it) === k);
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: `${full} / ${D.length}`, f: `${full} of the ${D.length} days with every activity done`, cls: "gs-num gs-bold"}]
        .concat(KINDS.map(([k, label]) => { const xs = kind(k), n = xs.filter(y => y.done).length, left = xs.filter(y => !y.done);
          return {v: xs.length ? `${n} / ${xs.length}` : "", f: `${label}, Days 1–${D.length}: ${n} of ${xs.length} done${left.length ? ". Still to do: " + left.slice(0, 6).map(y => y.it.t).join("; ") + (left.length > 6 ? "…" : "") : ""}`, cls: "bs-lesson " + (xs.length && n === xs.length ? "gs-hi" : n ? "gs-mid" : "")}; }),
          D.map((d, i) => { const x = st[i], n = x.filter(y => y.done).length, all = x.length && n === x.length;
          const left = x.filter(y => !y.done).map(y => y.it.t);
          return {v: n ? (all ? `✓ ${n}/${x.length}` : `${n}/${x.length}`) : "", f: `Day ${d.day} · ${d.role}: ${n} of ${x.length} done${left.length ? ". Still to do: " + left.slice(0, 5).join("; ") + (left.length > 5 ? "…" : "") : ""}`,
            cls: "bs-lesson " + (all ? "gs-hi" : n ? "gs-mid" : "")}; }));
    })};
}
function checklistHtml(){
  const ppl = people(); if(!ppl.length || !B.data) return "";
  const id = meOn() ? ppl[0].id : (B.ck && ppl.some(p => p.id === B.ck) ? B.ck : ppl[0].id), p = ppl.find(x => x.id === id), can = adminOn() && !meOn();
  const D = dayList(), ic = it => ({session: "🟢", trainer: "🧑‍🏫", tool: "🛠", drive: "📁", gc: "💬", room: "🏫", offline: "📴"}[it.at] || "•");
  return `<div class="bs-ck">${meOn() ? `<h4>✅ My checklist</h4>` : `<label class="bs-ck-who">✅ Checklist for <select onchange="FTBatchSheet.ckWho(this.value)">${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>`}
    <p class="bs-note">${can ? "Tick an activity when it is done. A ✓ the platform ticked itself (a Knowledge Check passed, a Practice Session submitted, a Mock Call / Demo you recorded) is already ticked." : "✓ = done. Your trainer ticks the classroom activities; the platform ticks what you do on it."}</p>
    <div class="bs-days">${D.map(d => { const st = dayStatus(p, d), n = st.filter(x => x.done).length;
      return `<div class="bs-day ${st.length && n === st.length ? "is-done" : ""}"><div class="bs-day-h"><b>Day ${d.day}</b> <span>${e(d.role)}</span><em>${n} / ${st.length}</em></div>
        ${st.map(x => `<label class="bs-item ${x.done ? "is-done" : ""}" title="${e(x.auto ? x.auto.how : "Ticked by the trainer")}${x.manual && x.mAt ? " · ticked " + e(when(x.mAt)) : ""}">
          <input type="checkbox" ${x.done ? "checked" : ""} ${can && !(x.auto && x.auto.done && !x.manual) ? "" : "disabled"} onchange="FTBatchSheet.tick('${e(p.id)}', ${e(JSON.stringify(x.key)).replace(/&quot;/g, "&quot;")}, this.checked)">
          <span>${ic(x.it)} ${e(x.it.t)}${x.auto && x.auto.done && !x.manual ? ` <small>✓ auto</small>` : x.manual ? ` <small>✓ trainer</small>` : x.auto && /Redo/.test(x.auto.how) ? ` <small class="bs-redo">Redo</small>` : ""}</span></label>`).join("")}</div>`; }).join("")}</div></div>`;
}
/* 📁 Drive links: the three links a trainee saves in 📁 My Drive links (drive:<id>, js/ft-drive.js) — the Assessment and
   Activities Folder, the Daily Task Tracker and the Monitoring Sheet — each saved or not, and whether the end-of-shift check
   could open it (trackerreview:<id>: the tracker's latest day, the Monitoring Sheet's check, the folder's screenshot look). */
const LINKS = [["folder", "📁 Assessment & Activities Folder"], ["tracker", "📋 Daily Task Tracker"], ["monitor", "📒 Monitoring Sheet"]];
const sameLink = (a, b) => String(a || "").trim() === String(b || "").trim();
/* each link's state: "none" (not saved), "ok" (opened at the last check, or not checked yet), "bad" (the last check of THIS
   link couldn't open it), "relinked" (the last check failed, but on a link the trainee has replaced since: it is checked
   again at the end of the shift), "trainer" (✓ a trainer opened it and marked it as opening: daycheck:<id>.links, for that
   very link; a new link drops it). A check from before checks recorded their link (url) counts as this link's unless the
   links were saved after it. */
function linkState(p){
  const R = B.data.rec[p.id] || {}, dv = R.drive || {}, rv = (R.src || {})["trackerreview:"] || {}, ov = ((R.daycheck || {}).links) || {};
  const days = Object.keys(rv.days || {}).sort(), lastDay = days.length ? rv.days[days[days.length - 1]] : null;
  const trRule = lastDay && (lastDay.rules || []).find(r => r.id === "sheet" && !r.pass);
  const chk = {tracker: lastDay ? {err: trRule ? trRule.detail : "", url: lastDay.url, at: lastDay.checkedAt} : null,
    monitor: rv.monitor ? {err: rv.monitor.error || "", url: rv.monitor.url, at: rv.monitor.checkedAt} : null,
    folder: rv.shots ? {err: rv.shots.error ? "the folder can't be opened by the system: share it as the course asks" : "", url: rv.shots.url, at: rv.shots.checkedAt} : null};
  const out = {};
  LINKS.forEach(([k, label]) => {
    const link = dv[k], c = chk[k], o = ov[k];
    if(!link){ out[k] = {st: "none", label}; return; }
    if(o && o.ok && sameLink(o.url, link)){ out[k] = {st: "trainer", label, link, o, c}; return; }
    // 🔁 the trainee's own check of this very link (📁 My Drive links, worker.js verifyLinks), when it is the newest
    const v = (rv.verify || {})[k];
    if(v && sameLink(v.url, link) && !v.retry && (!c || !t(c.at) || (t(v.at) && t(v.at) >= t(c.at)))){ out[k] = v.ok ? {st: "ok", label, link, c: {err: "", at: v.at}} : {st: "bad", label, link, c: {err: v.error || "the system can't open it", at: v.at}}; return; }
    if(!c || !c.err){ out[k] = {st: "ok", label, link, c}; return; }
    const ofThis = c.url ? sameLink(c.url, link) : !(t(dv.updatedAt) && t(c.at) && t(dv.updatedAt) > t(c.at));
    out[k] = {st: ofThis ? "bad" : "relinked", label, link, c};
  });
  const checked = [lastDay && lastDay.checkedAt, rv.monitor && rv.monitor.checkedAt, rv.shots && rv.shots.checkedAt, rv.verifyAt].map(t).filter(Boolean).sort((a, b) => b - a)[0];
  return {L: out, dv, checked};
}
function linkCell(x){
  if(x.st === "none") return {v: "—", f: `${x.label}: not linked yet`, cls: "bs-lesson gs-lo"};
  if(x.st === "trainer") return {v: "✓ trainer", f: `${x.label}: ${x.link} · marked as opening by a trainer ${when(x.o.at)}${x.c && x.c.err ? ` (the system's check said: ${x.c.err})` : ""}`, cls: "bs-lesson gs-hi"};
  if(x.st === "bad") return {v: "⚠ can't open", f: `${x.label}: linked (${x.link}), but ${x.c.err}${x.c.at ? ` (checked ${when(x.c.at)})` : ""}${meOn() ? "" : ". A trainer can open it and mark it ✓ under the table."}`, cls: "bs-lesson gs-mid"};
  if(x.st === "relinked") return {v: "✓ new link", f: `${x.label}: ${x.link} · saved after the last check, which couldn't open the old link; it is checked again at the end of the shift`, cls: "bs-lesson gs-hi"};
  return {v: "✓", f: `${x.label}: ${x.link}`, cls: "bs-lesson gs-hi"};
}
function linksTable(){
  const ppl = people();
  return {id: "drive", title: "📁 Drive links", note: `The three Google Drive links ${meOn() ? "you save" : "each trainee saves"} in 📁 My Drive links, and whether the system could open them at the last check (the end of every shift). ✓ linked · ✓ trainer: a trainer opened it and marked it · ⚠ linked but the system can't open it · — not linked yet.`,
    head: ["Trainee", "Linked"].concat(LINKS.map(x => x[1]), ["Last checked"]),
    rows: ppl.map(p => {
      const {L, dv, checked} = linkState(p), n = LINKS.filter(([k]) => dv[k]).length;
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: `${n} / 3`, f: `${n} of the 3 links saved${dv.linkedBy === "trainer" ? " (set by the trainer)" : ""}`, cls: "gs-num gs-bold " + (n === 3 ? "gs-hi" : n ? "gs-mid" : "gs-lo")}]
        .concat(LINKS.map(([k]) => linkCell(L[k])),
          [{v: checked ? when(checked) : "Not yet", f: checked ? `Last checked ${checked.toLocaleString()} (${ago(checked)})` : "Not checked yet: the check runs at the end of every shift", cls: checked ? "" : "gs-lo"}]);
    })};
}
/* 🔧 under the table (a trainer's): one trainee's three links — open each, ✓ mark it as opening (the manual override, when
   the trainer can open it but the system's check can't), ↩ undo, and 🔁 Check now (the same check the end of the shift runs) */
function linksFixHtml(){
  const ppl = people(); if(!ppl.length || !B.data || !adminOn() || meOn()) return "";
  const bad = ppl.filter(p => { const L = linkState(p).L; return LINKS.some(([k]) => L[k].st === "bad"); });
  const id = B.lk && ppl.some(p => p.id === B.lk) ? B.lk : (bad[0] || ppl[0]).id, p = ppl.find(x => x.id === id), {L} = linkState(p);
  const mark = {none: "—", ok: "✓", trainer: "✓ trainer", bad: "⚠ can't open", relinked: "✓ new link"};
  return `<div class="bs-ck bs-lk"><label class="bs-ck-who">🔧 Links for <select onchange="FTBatchSheet.lkWho(this.value)">${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}${bad.includes(x) ? " ⚠" : ""}</option>`).join("")}</select></label>
    <p class="bs-note">The system can only open a link it's been given access to. Open it: if it opens for you and it's the right file, <b>✓ Mark as opening</b> (it stays marked for that link; a new link is checked again). <b>🔁 Check now</b> runs the end-of-shift check on all three.</p>
    <div class="bs-lk-rows">${LINKS.map(([k]) => { const x = L[k];
      return `<div class="bs-lk-row"><span class="bs-lk-n">${e(x.label)}</span><b class="${x.st === "bad" ? "gs-mid" : x.st === "none" ? "gs-lo" : "gs-hi"}">${mark[x.st]}</b>
        ${x.link ? `<a class="btn btn-ghost btn-sm" href="${e(x.link)}" target="_blank" rel="noopener noreferrer">Open ↗</a>` : ""}
        ${x.st === "trainer" ? `<button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.lkMark('${e(id)}', '${k}', false)">↩ Undo the mark</button>`
          : x.st === "bad" ? `<button class="btn btn-navy btn-sm" onclick="FTBatchSheet.lkMark('${e(id)}', '${k}', true)">✓ Mark as opening</button>` : ""}
        ${x.st === "bad" ? `<small class="bs-lk-why">${e(x.c.err)}</small>` : ""}</div>`; }).join("")}</div>
    <div class="fp-actions"><button class="btn btn-ghost btn-sm" ${B.lkBusy ? "disabled" : ""} onclick="FTBatchSheet.lkCheck('${e(id)}')">${B.lkBusy ? "Checking…" : "🔁 Check now"}</button></div></div>`;
}
const tables = () => [traineesTable(), linksTable(), lessonsTable(), daysTable(), practiceTable(), scoresTable(), outputsTable(), recentTable()];

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
/* ---------- ✏️ Fix the batch name: a manual override for trainees registered under the wrong batch ----------
   The trainer ticks the trainees (all of the batch by default) and types the right Batch ID; each one's trainee:<id> gets
   batch = that ID, batchFrom (the old one), batchMovedAt and batchMovedBy: "trainer". worker.js keeps that batch on every
   save the trainee makes afterwards (an open tab can't write the old one back), and index.html takes it on their next save. */
function fixHtml(ppl){
  const F = B.fix; if(!F) return "";
  const others = batches().filter(b => b !== B.batch);
  return `<div class="bs-fix"><h4>✏️ Fix the batch name</h4>
    <p>Trainees registered under the wrong batch? Tick them, type the right Batch ID and press <b>Move them</b>. Their progress moves with them.</p>
    <div class="bs-fix-list">${ppl.map(p => `<label><input type="checkbox" ${F.skip[p.id] ? "" : "checked"} onchange="FTBatchSheet.fixPick('${e(p.id)}', this.checked)"> ${e(p.name)}</label>`).join("")}</div>
    <div class="bs-fix-row"><label>Move them to batch <input id="bsFixTo" list="bsFixList" value="${e(F.to)}" placeholder="e.g. B103026" oninput="FTBatchSheet.fixTo(this.value)" autocomplete="off"></label>
      <datalist id="bsFixList">${others.map(b => `<option value="${e(b)}">`).join("")}</datalist>
      <button class="btn btn-navy btn-sm" ${F.busy ? "disabled" : ""} onclick="FTBatchSheet.fixSave()">${F.busy ? "Moving…" : "Move them"}</button>
      <button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.fixClose()">Cancel</button></div>
    ${F.err ? `<p class="bs-fix-err">${e(F.err)}</p>` : ""}</div>`;
}
/* ✎ Fix a date: a trainee's Registered date and time, when it was recorded wrong. registeredAt is a field only a trainer
   writes (worker.js PROTECTED_TRAINEE_FIELDS); the old value is kept in registeredAtWas, with registeredAtFixedAt. */
const localInput = v => { const d = t(v); if(!d) return ""; const z = new Date(d - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); };
function dateHtml(ppl){
  const F = B.dfix; if(!F) return "";
  const p = ppl.find(x => x.id === F.id) || ppl[0];
  return `<div class="bs-fix"><h4>✎ Fix a date</h4><p>A trainee's <b>Registered</b> date or time is wrong? Pick them, set the right date and time and press <b>Save</b>. (A wrong Time In is fixed in 🛡 Admin Master Control → 🕘 Attendance.)</p>
    <div class="bs-fix-row"><label>Trainee <select id="bsDateWho" onchange="FTBatchSheet.dateWho(this.value)">${ppl.map(x => `<option value="${e(x.id)}" ${p && x.id === p.id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>
      <label>Registered <input type="datetime-local" id="bsDateAt" value="${e(p ? localInput(p.registeredAt) : "")}"></label>
      <button class="btn btn-navy btn-sm" ${F.busy ? "disabled" : ""} onclick="FTBatchSheet.dateSave()">${F.busy ? "Saving…" : "Save"}</button>
      <button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.dateClose()">Cancel</button></div>
    ${F.err ? `<p class="bs-fix-err">${e(F.err)}</p>` : ""}</div>`;
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
        <span class="gs-menu"><button onclick="FTBatchSheet.csv()">⬇ Download</button><button onclick="FTBatchSheet.refresh()">↻ Refresh</button><button onclick="window.print()">🖨 Print</button><button onclick="FTBatchSheet.fixOpen()">✏️ Fix the batch name</button><button onclick="FTBatchSheet.dateOpen()">✎ Fix a date</button></span></div>
      <label class="gs-batch">Batch <select onchange="FTBatchSheet.batch(this.value)">${bs.map(b => `<option ${b === B.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></label></div>
    <div class="bs-sum"><span><b>${ppl.length}</b> registered</span><span><b>${approved}</b> approved</span>${waiting ? `<span class="bs-wait"><b>${waiting}</b> waiting for approval</span>` : ""}
      <span class="bs-jump">Go to: <a href="#bs-trainees" onclick="return FTBatchSheet.go('trainees')">👥 Trainees</a> · <a href="#bs-drive" onclick="return FTBatchSheet.go('drive')">📁 Drive links</a> · <a href="#bs-lessons" onclick="return FTBatchSheet.go('lessons')">📚 Lessons</a> · <a href="#bs-days" onclick="return FTBatchSheet.go('days')">📅 Day by Day</a> · <a href="#bs-practice" onclick="return FTBatchSheet.go('practice')">🛠 Practice Lab</a> · <a href="#bs-scores" onclick="return FTBatchSheet.go('scores')">🏅 Scores</a> · <a href="#bs-outputs" onclick="return FTBatchSheet.go('outputs')">📤 Daily outputs</a> · <a href="#bs-recent" onclick="return FTBatchSheet.go('recent')">🕒 Recent progress</a></span>
      ${D && D.at ? `<span class="bs-at">Updated ${e(D.at.toLocaleTimeString())}</span>` : ""}</div>
    ${B.batch && !canon(B.batch) ? `<div class="bs-warn">⚠ <b>${e(B.batch)}</b> isn't a proper Batch ID (B + the date the batch started, MMDDYY, e.g. B103026). If these trainees belong to another batch, press <b>✏️ Fix the batch name</b>.</div>` : ""}
    ${(() => { const back = (B.auto || []).filter(p => p.batch === B.batch); return back.length ? `<div class="bs-warn bs-back">↩ <b>${back.length} trainee${back.length === 1 ? " was" : "s were"} archived automatically</b> from ${e(B.batch)} (${e(back.slice(0, 6).map(p => p.name).join(", "))}${back.length > 6 ? "…" : ""}), so ${back.length === 1 ? "they are" : "they are"} not on the Scorecard. <button class="btn btn-navy btn-sm" ${B.backBusy ? "disabled" : ""} onclick="FTBatchSheet.bringBack()">${B.backBusy ? "Bringing them back…" : "↩ Bring them back"}</button></div>` : ""; })()}
    ${fixHtml(ppl)}
    ${dateHtml(ppl)}
    <div class="gs-fbar"><span class="gs-ref" id="bsRef">${B.sel ? e(B.sel.ref) : ""}</span><span class="gs-fx">fx</span><input id="bsBar" readonly value="${B.sel ? e(B.sel.f) : "Click any cell to see what it means"}" aria-label="What the selected cell is"></div>
    ${!D || B.dataLoading ? `<p class="sc-empty">Reading the batch's progress…</p>` : D.error ? `<p class="sc-empty">Couldn't read the batch's progress. Press ↻ Refresh.</p>`
      : T.map((x, i) => x.id === "drive" ? sheetHtml(x, i).replace(/<\/section>$/, linksFixHtml() + "</section>") : x.id === "days" ? sheetHtml(x, i).replace(/<\/section>$/, checklistHtml() + "</section>") : x.id === "scores" ? sheetHtml(x, i).replace(/<\/section>$/, gradesHtml() + "</section>") : x.id === "recent" ? sheetHtml(x, i).replace('<p class="bs-note">', `<p class="bs-note"><label class="bs-period">Show <select onchange="FTBatchSheet.period(this.value)">${[[1, "today"], [7, "the last 7 days"], [14, "the last 14 days"], [30, "the last 30 days"], [0, "everything"]].map(([v, l]) => `<option value="${v}" ${B.recent === v ? "selected" : ""}>${l}</option>`).join("")}</select></label> `) : sheetHtml(x, i)).join("")}
    <p class="sc-how bs-how">Nothing to set up: this page reads what the platform already records. New trainees appear as soon as they register. Click a cell to see what it means in the bar above. ⬇ Download saves all eight tables as one file that opens in Google Sheets or Excel.</p></div>`;
}

window.FTBatchSheet = {
  batch(b){ if(!adminOn()) return; B.batch = b; B.data = null; B.dataKey = ""; B.sel = null; render(); },
  refresh(){ B.people = null; B.data = null; B.dataKey = ""; B.sel = null; if(typeof state === "object") state.adminData = null; render(); },
  period(v){ B.recent = Number(v) || 0; render(); },
  // ↩ the batch's trainees the tidy-up archived on its own come back to the active list; the batch is marked restored in
  // settings:autoarchive (done), so the tidy-up doesn't archive it again — as 📁 Batch Folders → ↩ Restore batch does
  async bringBack(){
    if(B.backBusy || !adminOn()) return;
    const back = (B.auto || []).filter(p => p.batch === B.batch); if(!back.length) return;
    B.backBusy = true; render();
    let n = 0;
    for(const p of back){
      try{ const rec = await sharedGet("trainee:" + p.id); if(!rec || !rec.archived) continue;
        const next = Object.assign({}, rec, {archived: false, restoredAt: new Date().toISOString()}); delete next.archivedAt; delete next.autoArchived;
        if(await sharedSet("trainee:" + p.id, next) !== false) n++; }catch(err){ /* the next trainee */ }
    }
    try{ const k = "settings:autoarchive", cur = (await sharedGet(k)) || {}; cur.done = Object.assign({}, cur.done || {}, {[B.batch]: cur.done && cur.done[B.batch] || new Date().toISOString()}); cur.updatedAt = new Date().toISOString(); await sharedSet(k, cur); }catch(err){}
    B.backBusy = false;
    toast(`✓ ${n} trainee${n === 1 ? " is" : "s are"} back in ${B.batch}.`);
    if(typeof state === "object") state.adminData = null;
    B.people = null; B.data = null; B.dataKey = ""; render();
  },
  dateOpen(){ if(!adminOn()) return; const p = people()[0]; B.dfix = {id: p ? p.id : "", busy: false, err: ""}; render(); },
  dateClose(){ B.dfix = null; render(); },
  dateWho(id){ if(B.dfix){ B.dfix.id = id; render(); } },
  async dateSave(){
    const F = B.dfix; if(!F || F.busy || !adminOn()) return;
    const id = (document.getElementById("bsDateWho") || {}).value || F.id, v = (document.getElementById("bsDateAt") || {}).value || "", d = v ? new Date(v) : null;
    if(!d || !isFinite(d)){ F.err = "Set the date and the time."; render(); return; }
    if(d > new Date()){ F.err = "That date is in the future."; render(); return; }
    F.busy = true; F.err = ""; render();
    try{
      const rec = await sharedGet("trainee:" + id); if(!rec) throw new Error("gone");
      const next = Object.assign({}, rec, {registeredAt: d.toISOString(), registeredAtWas: rec.registeredAtWas || rec.registeredAt || "", registeredAtFixedAt: new Date().toISOString()});
      if(await sharedSet("trainee:" + id, next) === false) throw new Error("save");
      B.dfix = null; toast(`✓ ${rec.name || "The trainee"}'s registration is now ${d.toLocaleString()}.`);
      if(typeof state === "object") state.adminData = null;
      B.people = null; B.data = null; B.dataKey = ""; render();
    }catch(err){ F.busy = false; F.err = "Couldn't save the date. Try again."; render(); }
  },
  grWho(id){ if(!adminOn()) return; B.gr = id; render(); },
  ckWho(id){ if(!adminOn()) return; B.ck = id; render(); },
  lkWho(id){ if(!adminOn()) return; B.lk = id; render(); },
  // ✓ the trainer's manual override for one link: daycheck:<id>.links[k] = {ok, url (the link it was given for), at}
  async lkMark(id, k, ok){
    if(!adminOn()) return;
    const link = ((B.data && B.data.rec[id] || {}).drive || {})[k]; if(ok && !link) return;
    try{
      const cur = (await sharedGet("daycheck:" + id)) || {items: {}}; cur.links = cur.links || {};
      if(ok) cur.links[k] = {ok: true, url: link, at: new Date().toISOString()}; else delete cur.links[k];
      cur.updatedAt = new Date().toISOString();
      if(await sharedSet("daycheck:" + id, cur) === false) throw new Error("save");
      if(B.data && B.data.rec[id]) B.data.rec[id].daycheck = cur;
      B.lk = id; toast(ok ? "✓ Marked as opening." : "Mark taken off.");
    }catch(err){ toast("Couldn't save. Try again."); }
    render();
  },
  // 🔁 the end-of-shift check, now, for one trainee: the tracker and Monitoring Sheet (/api/drive/check), the folder (/api/drive/shots)
  async lkCheck(id){
    if(!adminOn() || B.lkBusy) return;
    B.lkBusy = true; B.lk = id; render();
    let bad = 0;
    for(const [u, body] of [["/api/drive/check", {id}], ["/api/drive/shots", {ids: [id]}]]){
      try{ const r = await authFetch(u, body); if(!r.ok && r.status !== 400) bad++; }catch(err){ bad++; }
    }
    B.lkBusy = false;
    toast(bad ? "Checked, with an error reading part of it. Try again in a minute." : "✓ Checked.");
    B.data = null; B.dataKey = ""; render();
  },
  // ✅ a trainer ticks (or unticks) an activity for a trainee: daycheck:<id>, which only a trainer writes
  async tick(id, key, on){
    if(!adminOn()) return;
    try{
      const cur = (await sharedGet("daycheck:" + id)) || {items: {}}; cur.items = cur.items || {};
      if(on) cur.items[key] = {done: true, at: new Date().toISOString()}; else delete cur.items[key];
      cur.updatedAt = new Date().toISOString();
      if(await sharedSet("daycheck:" + id, cur) === false) throw new Error("save");
      if(B.data && B.data.rec[id]) B.data.rec[id].daycheck = cur;
    }catch(err){ toast("Couldn't save the tick. Try again."); }
    render();
  },
  fixOpen(){ if(!adminOn()) return; B.fix = {to: "", skip: {}, busy: false, err: ""}; render(); },
  fixClose(){ B.fix = null; render(); },
  fixPick(id, on){ if(B.fix) B.fix.skip[id] = !on; },
  fixTo(v){ if(B.fix) B.fix.to = v; },
  async fixSave(){
    const F = B.fix; if(!F || F.busy || !adminOn()) return;
    const to = canon(F.to), ids = people().filter(p => !F.skip[p.id]).map(p => p.id), from = B.batch;
    if(!to){ F.err = "That isn't a Batch ID: B and the date the batch started (MMDDYY), e.g. B103026."; render(); return; }
    if(to === from){ F.err = "They are already in that batch."; render(); return; }
    if(!ids.length){ F.err = "Tick at least one trainee."; render(); return; }
    F.busy = true; F.err = ""; render();
    let moved = 0; const at = new Date().toISOString();
    for(const id of ids){
      try{
        const rec = await sharedGet("trainee:" + id); if(!rec) continue;
        const next = Object.assign({}, rec, {batch: to, batchFrom: rec.batch || from, batchMovedAt: at, batchMovedBy: "trainer"});
        if(await sharedSet("trainee:" + id, next) !== false) moved++;
      }catch(err){ /* the next trainee */ }
    }
    B.fix = null;
    toast(moved === ids.length ? `✓ Moved ${moved} trainee${moved === 1 ? "" : "s"} to ${to}.` : `Moved ${moved} of ${ids.length}. Press ✏️ Fix the batch name again for the rest.`);
    if(typeof state === "object") state.adminData = null;
    B.people = null; B.data = null; B.dataKey = ""; B.sel = null; B.batch = moved ? to : from; render();
  },
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
    a.download = meOn() ? `My Progress ${(B.me || {}).name || ""} ${new Date().toISOString().slice(0, 10)}.csv` : `Batch Sheet ${B.batch} ${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  // for the checks
  tables: () => B.data && !B.dataLoading ? tables() : null,
  events: () => B.data ? events() : null
};

ftAdminTab(TAB, "📋 Batch Sheet", renderSheet);

/* ---------- 🔒 the trainee's own sheet: 📋 My Progress ---------- */
async function loadMe(){
  B.meLoading = true;
  try{
    const id = state.traineeId, r = (await sharedGet("trainee:" + id)) || {};   // their own record: the only trainee: key read
    B.me = {id, name: r.name || state.traineeName || id, batch: r.batch || state.traineeBatch || "", status: statusOf(r), registeredAt: r.registeredAt || "",
      lastActive: r.lastActive || "", progress: state.progress || r.dayProgress || {}, since: String(r.registeredAt || "").slice(0, 10)};
    B.batch = bLabel(B.me.batch);
  }catch(err){ B.me = {id: state.traineeId, name: state.traineeName || "", batch: state.traineeBatch || "", status: "", progress: state.progress || {}, since: ""}; }
  B.meLoading = false; B.meFor = state.traineeId; rerender();
}
function renderMine(){
  if(!B.me || B.meFor !== state.traineeId){ if(!B.meLoading){ B.me = null; B.data = null; B.dataKey = ""; loadMe(); } return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Loading your progress…</div>`; }
  loadData();
  const D = B.data, ready = D && !B.dataLoading && !D.error, T = ready ? tables() : null;
  return `<div class="card gs-card bs-card bs-mine">
    <div class="gs-top"><span class="gs-logo">📋</span><div class="gs-file"><b>My Progress · ${e(B.me.name)}</b>
      <span class="gs-menu"><button onclick="FTBatchSheet.csv()">⬇ Download</button><button onclick="FTBatchSheet.refreshMe()">↻ Refresh</button><button onclick="window.print()">🖨 Print</button></span></div>
      ${B.me.batch ? `<span class="gs-batch">Batch <b>${e(bLabel(B.me.batch))}</b></span>` : ""}</div>
    <div class="bs-sum"><span class="bs-jump">Go to: <a href="#bs-trainees" onclick="return FTBatchSheet.go('trainees')">👤 Me</a> · <a href="#bs-drive" onclick="return FTBatchSheet.go('drive')">📁 Drive links</a> · <a href="#bs-lessons" onclick="return FTBatchSheet.go('lessons')">📚 Lessons</a> · <a href="#bs-days" onclick="return FTBatchSheet.go('days')">📅 Day by Day</a> · <a href="#bs-practice" onclick="return FTBatchSheet.go('practice')">🛠 Practice Lab</a> · <a href="#bs-scores" onclick="return FTBatchSheet.go('scores')">🏅 Scores</a> · <a href="#bs-outputs" onclick="return FTBatchSheet.go('outputs')">📤 Daily outputs</a> · <a href="#bs-recent" onclick="return FTBatchSheet.go('recent')">🕒 Recent progress</a></span>
      ${D && D.at ? `<span class="bs-at">Updated ${e(D.at.toLocaleTimeString())}</span>` : ""}</div>
    <div class="gs-fbar"><span class="gs-ref" id="bsRef">${B.sel ? e(B.sel.ref) : ""}</span><span class="gs-fx">fx</span><input id="bsBar" readonly value="${B.sel ? e(B.sel.f) : "Click any cell to see what it means"}" aria-label="What the selected cell is"></div>
    ${!D || B.dataLoading ? `<p class="sc-empty">Reading your progress…</p>` : D.error ? `<p class="sc-empty">Couldn't read your progress. Press ↻ Refresh.</p>`
      : T.map((x, i) => x.id === "drive" ? sheetHtml(x, i).replace(/<\/section>$/, linksFixHtml() + "</section>") : x.id === "days" ? sheetHtml(x, i).replace(/<\/section>$/, checklistHtml() + "</section>") : x.id === "scores" ? sheetHtml(x, i).replace(/<\/section>$/, gradesHtml() + "</section>") : x.id === "recent" ? sheetHtml(x, i).replace('<p class="bs-note">', `<p class="bs-note"><label class="bs-period">Show <select onchange="FTBatchSheet.period(this.value)">${[[1, "today"], [7, "the last 7 days"], [14, "the last 14 days"], [30, "the last 30 days"], [0, "everything"]].map(([v, l]) => `<option value="${v}" ${B.recent === v ? "selected" : ""}>${l}</option>`).join("")}</select></label> `) : sheetHtml(x, i)).join("")}
    <p class="sc-how bs-how">Only you (and your trainer) see this page. It shows what the platform records as you work: your lesson decks, Knowledge Checks, practice and scores.</p></div>`;
}
FTBatchSheet.refreshMe = function(){ if(!meOn()) return; B.me = null; B.data = null; B.dataKey = ""; B.sel = null; render(); };
FTBatchSheet.openMine = function(){ goto(ME); };

// #/mysheet: a trainee's own page; anyone else is sent to the 📚 Dashboard
const __routeRender = window.render;
window.render = function(){
  if(state.view !== ME) return __routeRender.apply(this, arguments);
  if(!isTrainee()){ state.view = "modules"; return __routeRender.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-dash">${renderMine()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {[ME]: "My Progress"});
// 📋 My Progress in a trainee's top bar (never an admin's), beside 🏅 My Performance
const __top = window.renderTopbar;
window.renderTopbar = function(){
  const html = __top.apply(this, arguments);
  if(!isTrainee()) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  const nav = t.content.querySelector(".topbar .nav"); if(!nav || nav.querySelector(".bs-mybtn")) return html;
  const btn = `<button type="button" class="lp-sec bs-mybtn${state.view === ME ? " active" : ""}" onclick="goto('${ME}')" title="Your progress on one sheet: lessons, Knowledge Checks, practice and scores">📋 My Progress</button>`;
  const portal = nav.querySelector(".lp-portal");
  if(portal) portal.insertAdjacentHTML("beforebegin", btn); else nav.insertAdjacentHTML("beforeend", btn);
  if(state.view === ME) [...nav.children].forEach(b => { if(/goto\('modules'\)/.test(b.getAttribute("onclick") || "") && !b.classList.contains("bs-mybtn")) b.classList.remove("active"); });
  return t.innerHTML;
};

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
.bs-lk-rows{display:flex;flex-direction:column;gap:6px;margin:8px 0;} .bs-lk-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;font:14px Arial,sans-serif;} .bs-lk-n{min-width:240px;} .bs-lk-row b{min-width:96px;} .bs-lk-why{flex-basis:100%;color:#7A5A00;}
.bs-ck{margin:12px 0 6px;} .bs-ck h4{margin:0 0 4px;font:700 16px Arial,sans-serif;}
.bs-ck-who{font:700 15px Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;} .bs-ck-who select{font:15px Arial,sans-serif;padding:5px 8px;border:1px solid #C4C7C5;border-radius:4px;}
.bs-days{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:8px;}
.bs-day{border:1px solid #E1E3E1;border-radius:8px;padding:8px 10px;background:#fff;font:13.5px Arial,sans-serif;}
.bs-day.is-done{border-color:#A8DAB5;background:#F3FBF5;}
.bs-day-h{display:flex;align-items:baseline;gap:6px;margin-bottom:6px;} .bs-day-h span{color:#5F6368;font-size:12.5px;} .bs-day-h em{margin-left:auto;font-style:normal;font-weight:700;color:#137333;}
.bs-item{display:flex;align-items:flex-start;gap:7px;padding:3px 0;cursor:pointer;line-height:1.35;} .bs-item input{margin-top:2px;width:16px;height:16px;flex:none;}
.bs-item.is-done span{color:#137333;} .bs-item small{font-size:11px;font-weight:700;color:#5F6368;background:#F1F3F4;border-radius:999px;padding:0 6px;margin-left:3px;}
.bs-gr{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:3px 0;border-bottom:1px dashed #EEF0F2;} .bs-gr small{grid-column:1 / -1;color:#5F6368;font-size:12px;}
.bs-item small.bs-redo{color:#C5221F;background:#FCE8E6;}
.bs-back button{margin-left:8px;}
.bs-warn{margin:0 14px 10px;padding:9px 12px;border:1px solid #F4B77A;background:#FFF7ED;border-radius:6px;font:14px Arial,sans-serif;color:#7A4100;}
.bs-fix{margin:0 14px 12px;padding:12px 14px;border:1px solid #C4C7C5;border-radius:8px;background:#F8F9FA;font:14px Arial,sans-serif;}
.bs-fix h4{margin:0 0 4px;font-size:16px;} .bs-fix p{margin:0 0 8px;}
.bs-fix-list{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 10px;} .bs-fix-list label{display:flex;align-items:center;gap:6px;cursor:pointer;}
.bs-fix-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;} .bs-fix-row select{font:15px Arial,sans-serif;padding:6px 9px;border:1px solid #C4C7C5;border-radius:4px;margin-left:6px;}
.bs-fix-row input[type=datetime-local]{width:auto;}
.bs-fix-row input{font:15px Arial,sans-serif;padding:6px 9px;border:1px solid #C4C7C5;border-radius:4px;width:150px;margin-left:6px;}
.bs-fix-err{color:#C5221F;margin:8px 0 0 !important;}
@media print{ .bs-card .gs-menu,.bs-card .gs-fbar,.bs-jump,.lp-admin-tabs{display:none !important;} body.bs-wide main{padding:0;} .bs-wrap{overflow:visible;} }
`; document.head.appendChild(s); })();
})();
