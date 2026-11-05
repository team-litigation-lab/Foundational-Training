/* ============================================================
   📋 BATCH SHEET — one simple, Google-Sheets-style page per batch, with nothing to set up
   ------------------------------------------------------------
   Admin → 🏅 Scorecard → 📋 Batch Sheet (the first tab the Scorecard opens on). Pick a batch and every trainee who
   registered in it is on the page at once — from the moment they register, before they have done anything — in four
   tables, one under the other, all on the one page:
     0. 📅 Day 1–16: Detailed Scores: a column per training day (the average of its scored deliverables); under it a trainee's
        days in detail, each deliverable's score with 🧾 why it was scored that way, 🔧 what needs to be improved and ⭐ what
        they did best (dayDeliverables); then the batch's 📊 Weekly Ranking (js/ft-ranking.js FTRanking.embed).
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
// (the lessons with a ✍️ Knowledge Check: its process questions, js/ft-process.js; Lessons 3 and 5 have none)
const kcLessons = () => lessons().filter(d => typeof window.ftKcQuestions !== "function" || ftKcQuestions(d.id).length);
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
    // (👥 a revoked trainee — offboarded, rejected, on the block list — leaves the sheet: js/ft-roster.js)
    B.people = list.filter(r => r && r.id && !r.archived && !r.rejected && !r.purgedAt && (r.batch || r.registeredAt) && (!window.ftActiveTrainee || ftActiveTrainee(r, {pending: true})))
      .map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || "", status: statusOf(r), registeredAt: r.registeredAt || "", registeredAtWas: r.registeredAtFixedAt ? r.registeredAtWas || "" : null, lastActive: r.lastActive || "",
        progress: r.dayProgress || {}, since: String(r.registeredAt || "").slice(0, 10)}))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    // 🏅 the Scorecard opens on the latest batch (its Batch ID's date, B + MMDDYY: the one the facilitator is running now)
    // each time it is opened; a batch picked in the dropdown holds until the Scorecard is left
    if(!B.batch || !B.picked) B.batch = latestBatch() || B.batch;
  }catch(err){ B.people = []; }
  B.loading = false; rerender();
}
const batches = () => [...new Set((B.people || []).map(p => bLabel(p.batch)).concat((B.auto || []).map(p => p.batch)).filter(Boolean))].sort();
// the latest batch: the newest Batch ID date (B + MMDDYY), else the batch with the newest registration
function latestBatch(){
  const bs = batches(); if(!bs.length) return "";
  const dt = b => { const m = /^b(\d{2})(\d{2})(\d{2})$/i.exec(String(b || "").trim()); return m ? `20${m[3]}-${m[1]}-${m[2]}` : ""; };
  const dated = bs.filter(dt).sort((a, b) => dt(b).localeCompare(dt(a)));
  if(dated.length) return dated[0];
  const newest = (B.people || []).slice().sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)))[0];
  return newest ? bLabel(newest.batch) : bs[bs.length - 1];
}
const people = () => meOn() ? (B.me ? [B.me] : []) : (B.people || []).filter(p => bLabel(p.batch) === B.batch);

/* ---------- what the platform already keeps about each of them ---------- */
async function loadData(){
  const ppl = people(), key = B.batch + "|" + ppl.map(p => p.id).join(",");
  if(B.dataKey === key && (B.data || B.dataLoading)) return;
  B.dataKey = key; B.dataLoading = true; rerender();
  try{
    const P = window.LSH_PROGRAM || {}, S = (P.sources || []).filter(s => s.key), shared = P.shared || [];
    // (process:<id>: the Knowledge Checks' graded answers, each answer's feedback and the summary, for the scores' context)
    const own = ["progress:", "skills:", "simresults:", "transcribe:", "lor:", "daycheck:", "drive:", "feedback:", "process:"];
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
      rec[p.id] = {data, savedAt: snap && snap.savedAt, skills: at(1) || {}, sims: at(2) || {}, transcribe: at(3), lor: at(4), daycheck: at(5) || {items: {}}, drive: at(6), feedback: at(7), process: at(8) || {sets: {}}, src: sc, score};
    });
    // the batch's 📊 Weekly Ranking reports (a trainer's: ranking:<batch>:w1–6), for the weeks' average in 🏅 Scores
    let reps = [];
    if(adminOn() && !meOn()){ const rk = w => `ranking:${String(B.batch || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
      try{ reps = (await sharedGetMany([1, 2, 3, 4, 5, 6].map(rk))).map(r => r && Array.isArray(r.cols) ? r : null); }catch(err){ reps = []; } }
    if(B.dataKey !== key){ return; }   // (another read started since: that one's result is kept)
    B.data = {rec, sources: S, reps, at: new Date(), batch: B.batch, key};
    // ✍️ an answer sheet submitted but never graded ("Submitted"): graded now, once a session, then the sheet is read again
    if(adminOn() && !meOn() && window.ftKcGradeFor && !(B.kcAuto || {})[B.batch]){ (B.kcAuto = B.kcAuto || {})[B.batch] = 1; const bb = B.batch, todo = [];
      ppl.forEach(p => kcSheets().forEach(k => { const g = sheetGrade(p, k); if(g.pct == null && g.subm) todo.push({p, k}); }));
      if(todo.length) (async () => { let n = 0; for(const t of todo){ try{ if(await ftKcGradeFor(t.p.id, t.k.l, t.k.read)) n++; }catch(err){} }
        if(n){ toast(`✍️ ${n} submitted answer sheet${n === 1 ? "" : "s"} graded.`); if(B.batch === bb){ B.dataKey = ""; rerender(); } } })(); }
    // 🔁 the batch's grades saved by the broken grading (window.ftStaleGrade, js/ft-listening.js): graded again, once a
    // session, then the sheet is read again
    if(adminOn() && !meOn() && window.ftStaleGrade && !(B.regraded || {})[B.batch]){ (B.regraded = B.regraded || {})[B.batch] = 1; const bb = B.batch, jobs = [];
      ppl.forEach(p => Object.entries(((((rec[p.id] || {}).src || {})["trackerreview:"] || {}).assess) || {}).forEach(([doc, g]) => { if(ftStaleGrade(g)) jobs.push({id: p.id, doc}); }));
      if(jobs.length) (async () => { let n = 0; for(const j of jobs){ try{ const r = await authFetch("/api/assess/grade", j); if(r.ok) n++; }catch(err){} }
        if(n){ toast(`🔁 ${n} answer sheet${n === 1 ? "" : "s"} graded again (the earlier grading had marked right answers ✗).`); if(B.batch === bb){ B.dataKey = ""; rerender(); } } })(); }
    // 🔄 the batch's past training days not worked out yet (worker.js backfillCompliance), once a session: the sheet is read
    // again when any were, so 📤 Daily outputs and the scores count the whole training
    if(adminOn() && !meOn() && !(B.backfilled || {})[B.batch]){ (B.backfilled = B.backfilled || {})[B.batch] = 1; const bb = B.batch;
      authFetch("/api/compliance/backfill", {ids: ppl.map(p => p.id)}).then(r => r.json()).then(j => {
        if(j && j.filled && Object.values(j.filled).some(n => n > 0) && B.batch === bb){ B.dataKey = ""; rerender(); } }).catch(() => {}); }
    // 🔁 the Drive links not checked yet (⏳ Pending in the compliance table), checked now (worker.js verifyLinks, /api/drive/verify:
    // the system opens each one, as at the end of every shift), one trainee at a time, once a session; then the sheet is read again
    if(adminOn() && !meOn() && !(B.verified || {})[B.batch]){ (B.verified = B.verified || {})[B.batch] = 1; const bb = B.batch;
      const due = ppl.filter(p => { try{ const {L} = linkState(p); return LINKS.some(([k]) => /pending|relinked/.test(L[k].st)); }catch(err){ return false; } });
      if(due.length) (async () => { let n = 0; for(const p of due){ try{ const r = await authFetch("/api/drive/verify", {id: p.id}); const j = await r.json().catch(() => null); if(r.ok && j && !j.error) n++; }catch(err){} }
        if(n && B.batch === bb){ B.dataKey = ""; rerender(); } })(); }
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
        {v: st, f: st === "Waiting for approval" ? "Registered, not approved yet: approve them in 🛡 Admin Master Control → 👥 Trainees & Batches" : st, cls: st === "Approved" ? "gs-hi" : "gs-mid"},
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
/* ✍️ Process Questions: each answer sheet's score as the Scorecard counts it (the trainer's final score, else the graded best
   of its Knowledge Check; Day 1's 📖 Reading Task its own), the trainee's average of them, and under the table the scoring
   rationale: how each score was reached (the attempts, the overall evaluation in the facilitator's DNA, each answer's grade
   out of 10 and its feedback, the trainer's comments) for one trainee or every trainee. Read from process:<id> (the
   trainee's answers and graded attempts) and kcreview:<id> (the trainer's review). */
const kcSheets = () => { const q = window.ftKcQuestions; if(typeof q !== "function") return [];
  return lessons().filter(d => q(d.id).length).flatMap(d => { const qs = q(d.id), sets = [...new Set(qs.map(x => x.set))], rs = sets.length > 1 ? sets.find(st => st.open) : null;
    const own = {l: d.id, read: false, title: lessonName(d.id), qs: rs ? qs.filter(x => x.set !== rs) : qs};
    return rs ? [own, {l: d.id, read: true, title: "📖 " + rs.title, qs: qs.filter(x => x.set === rs)}] : [own]; }); };
function sheetGrade(p, k){
  const R = B.data.rec[p.id] || {}, proc = R.process || {}, rvAll = (R.src || {})["kcreview:"] || {}, dp = (R.data || {})["day-progress"] || p.progress || {};
  const rec = ((k.read ? proc.kcRead : proc.kc) || {})[k.l] || null, rv = ((k.read ? rvAll.read : rvAll.lessons) || {})[k.l] || {};
  const t = numOr(rv.score), x = dp[k.l] || {};
  const g = rec && rec.attempts ? rec.best : k.read ? (typeof x.readScore === "number" && x.readTrainer == null ? x.readScore : null) : (typeof x.score === "number" && x.trainerScore == null ? x.score : null);
  const pctv = t != null ? t : g, tries = rec && rec.attempts || (g != null ? 1 : 0), last = rec && rec.last;
  const sets = [...new Set(k.qs.map(q => q.set))], subm = sets.map(st => ((proc.sets || {})[st.id] || {}).submittedAt).filter(Boolean).sort()[0];
  const items = k.qs.map(q => { const it = last && (last.items || []).find(y => y.sid === q.set.id && y.i === q.i), a = ((((proc.sets || {})[q.set.id] || {}).answers) || [])[q.i];
    return {q: q.q, answer: String(a || "").trim(), score: it ? it.score : null, feedback: it ? it.feedback || "" : "", note: (rv.notes || {})[q.set.id + "|" + q.i] || ""}; });
  const how = t != null ? `the trainer's final score${g != null ? ` (graded best ${g}% of ${tries} attempt${tries === 1 ? "" : "s"})` : ""}` : g != null ? `the graded best of ${tries} attempt${tries === 1 ? "" : "s"}` : subm ? "submitted, not graded yet" : "not submitted yet";
  return {pct: pctv, trainer: t != null, how, tries, last, rv, items, subm};
}
function processTable(){
  const ppl = people(), K = kcSheets();
  return {id: "process", title: "✍️ Process Questions", note: `${meOn() ? "Your" : "Each trainee's"} score on each Process Questions answer sheet, as the Scorecard counts it: the trainer's final score (🧑‍🏫), else the graded best of its Knowledge Check (70% passes), and the average of the graded sheets. Click a cell for how it was scored; the full scoring rationale, answer by answer, is under the table.`,
    head: ["Trainee", "Average", "Sheets graded"].concat(K.map(k => k.title)),
    rows: ppl.map(p => { const gs = K.map(k => sheetGrade(p, k)), got = gs.filter(g => g.pct != null), a = avgOf(got.map(g => g.pct));
      return [{v: p.name, f: p.name, cls: "gs-name"},
        {v: pct(a), f: a == null ? "No answer sheet graded yet" : `Average = (${got.map(g => g.pct).join(" + ")}) / ${got.length} = ${Math.round(a)}%`, cls: "gs-num gs-calc gs-bold " + tone(a)},
        {v: `${got.length} / ${K.length}`, f: `${got.length} of the ${K.length} answer sheets graded`, cls: "gs-num"}]
        .concat(gs.map((g, i) => ({v: g.pct == null ? (g.subm ? "Submitted" : "") : `${g.pct}%${g.trainer ? " 🧑‍🏫" : ""}`,
          f: `${K[i].title}: ${g.pct != null ? g.pct + "% — " : ""}${g.how}${g.last && g.last.summary ? ". " + g.last.summary : ""}${g.rv.comment ? " Trainer: " + g.rv.comment : ""}${g.items.some(y => y.score != null) ? " · " + g.items.map((y, j) => `Q${j + 1} ${y.score != null ? y.score + "/10" : "–"}`).join(", ") : ""}`,
          cls: "bs-lesson " + (g.pct != null ? tone(g.pct) : g.subm ? "gs-mid" : "")})));
    })};
}
const ALL = "*";
function rationaleHtml(){
  const ppl = people(); if(!ppl.length || !B.data) return "";
  const K = kcSheets(), id = meOn() ? ppl[0].id : B.ra === ALL ? ALL : (B.ra && ppl.some(p => p.id === B.ra) ? B.ra : ppl[0].id);
  const who = id === ALL ? ppl : ppl.filter(p => p.id === id);
  const one = p => { const gs = K.map(k => sheetGrade(p, k)), got = gs.filter(g => g.pct != null), a = avgOf(got.map(g => g.pct));
    return `<div class="bs-rat">${who.length > 1 ? `<h5>${e(p.name)}</h5>` : ""}
      <div class="bs-rat-avg">Average: <b class="${tone(a)}">${pct(a) || "—"}</b>${got.length ? ` <span>= (${got.map((g, i) => g.pct).join(" + ")}) / ${got.length} graded answer sheet${got.length === 1 ? "" : "s"}</span>` : " <span>no answer sheet graded yet</span>"}</div>
      <div class="bs-days">${K.map((k, i) => { const g = gs[i]; if(g.pct == null && !g.subm && !g.items.some(y => y.answer)) return "";
        // (each answer sheet a row that opens: its title and score shut, the evaluation and each answer's grade when opened)
        return `<details class="bs-day bs-rat-d"><summary class="bs-day-h"><b>${e(k.title)}</b><span class="bs-rat-sum">${e(g.how)}</span><em class="${tone(g.pct)}">${g.pct != null ? g.pct + "%" : "—"}</em></summary>
          <p class="bs-rat-how"><b>How it was scored:</b> ${e(g.how)}${g.last && g.last.at ? `, last graded ${e(when(g.last.at))}` : ""}.</p>
          ${g.last && g.last.summary ? `<p class="bs-rat-how"><b>Evaluation:</b> ${e(g.last.summary)}</p>` : ""}
          ${g.rv.comment ? `<p class="bs-rat-how"><b>🧑‍🏫 Trainer:</b> ${e(g.rv.comment)}</p>` : ""}
          ${g.items.map((y, j) => `<div class="bs-gr"><span>Q${j + 1}. ${e(y.q)}</span><b class="${y.score == null ? "" : tone(y.score * 10)}">${y.score == null ? "—" : y.score + "/10"}</b>${y.feedback ? `<small>${e(y.feedback)}</small>` : y.answer ? "" : `<small>(unanswered)</small>`}${y.note ? `<small>🧑‍🏫 ${e(y.note)}</small>` : ""}</div>`).join("")}</details>`; }).join("") || `<p class="bs-note">Nothing submitted yet.</p>`}</div></div>`; };
  return `<div class="bs-ck">${meOn() ? `<h4>🧾 My scoring rationale</h4>` : `<label class="bs-ck-who">🧾 Scoring rationale for <select onchange="FTBatchSheet.raWho(this.value)"><option value="${ALL}" ${id === ALL ? "selected" : ""}>👥 Every trainee</option>${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>`}
    ${who.map(one).join("")}</div>`;
}
/* a trainee's grades in detail (what 🏅 Scorecards showed on a click): each grading system and every item in it */
function gradesHtml(){
  const ppl = people(); if(!ppl.length || !B.data) return "";
  const id = meOn() ? ppl[0].id : B.gr === ALL ? ALL : (B.gr && ppl.some(p => p.id === B.gr) ? B.gr : ppl[0].id);
  const who = id === ALL ? ppl : ppl.filter(p => p.id === id);
  const one = p => { const sc = (B.data.rec[p.id] || {}).score;
    if(!sc || !sc.rows) return `${who.length > 1 ? `<h5>${e(p.name)}</h5>` : ""}<p class="bs-note">Nothing graded yet.</p>`;
    const sys = sc.rows.filter(r => r.avg != null && !(r.s && r.s.noOverall));
    return `<div class="bs-rat">${who.length > 1 ? `<h5>${e(p.name)}</h5>` : ""}
      <div class="bs-rat-avg">Scorecard overall: <b class="${tone(sc.overall)}">${pct(sc.overall) || "—"}</b>${sys.length ? ` <span>= the average of ${sys.length} grading system${sys.length === 1 ? "" : "s"}: (${sys.map(r => `${r.s.label} ${Math.round(r.avg)}`).join(" + ")}) / ${sys.length}</span>` : ""}</div>
      <div class="bs-days">${sc.rows.filter(r => r.items && r.items.length).map(r => { const g = r.items.filter(it => typeof it.pct === "number");
        return `<div class="bs-day"><div class="bs-day-h"><b>${e(r.s.icon || "")} ${e(r.s.label)}</b><em class="${tone(r.avg)}">${pct(r.avg) || "—"}</em></div>
        ${g.length ? `<p class="bs-rat-how">Average = (${g.map(it => Math.round(it.pct)).join(" + ")}) / ${g.length} = ${pct(r.avg)}${r.s.noOverall ? " · not counted again in the overall" : ""}</p>` : ""}
        ${r.items.map(it => `<div class="bs-gr"><span>${e(it.name)}</span><b class="${tone(it.pct)}">${typeof it.pct === "number" ? pct(it.pct) : "—"}</b>${it.note ? `<small>${e(it.note)}</small>` : ""}</div>`).join("")}</div>`; }).join("")}</div></div>`; };
  return `<div class="bs-ck">${meOn() ? `<h4>🔎 My grades in detail</h4>` : `<label class="bs-ck-who">🔎 Grades in detail for <select onchange="FTBatchSheet.grWho(this.value)"><option value="${ALL}" ${id === ALL ? "selected" : ""}>👥 Every trainee</option>${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>`}
    ${who.map(one).join("")}</div>`;
}
/* 📅 Day 1–16: Detailed Scores — each training day's deliverables (js/ft-day-activities.js, the Training Guide's list),
   each with its score and the summarized context of that score: 🧾 why it was scored that way, 🔧 what needs to be improved
   and ⭐ what they did best. Read from what the graders already wrote: the trainer's rubric (each criterion's score and remark)
   and comment, a Practice Session's automated checks, the trainer's review and the AI evaluation, a Knowledge Check's graded
   answers (each answer's feedback) and summary, a Monitoring Sheet update's review, and the trainer's day-by-day feedback.
   The table: a column per day, the average of the day's scores; under it, a trainee's days in detail. */
const firstLine = v => { const t = String(v || "").replace(/\s+/g, " ").trim(); const m = t.match(/^(.{20,260}?[.!?])(\s|$)/); return m ? m[1] : t.slice(0, 260); };
const clip = (v, n = 420) => { const t = String(v || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const num100 = v => v != null && v !== "" && isFinite(Number(v)) ? Math.round(Number(v)) : null;
// 🧑‍🏫 a trainer-scored activity (a mock call, a demo): the rubric's criteria, their 0–5 scores and remarks
function trainerCtx(a, title){
  const rb = a.rubric && window.FT_RUBRICS && FT_RUBRICS.list ? FT_RUBRICS.list[a.rubric.key] : null, pct_ = num100(a.score) != null ? num100(a.score) : a.status === "Passed" ? 100 : null;
  const crit = rb && a.rubric ? (rb.criteria || []).map((c, i) => ({n: c.n, s: (a.rubric.scores || [])[i], fb: (a.rubric.feedback || [])[i] || ""})).filter(c => c.s != null && c.s !== "") : [];
  const byS = crit.slice().sort((x, y) => Number(y.s) - Number(x.s));
  const best = byS.filter(c => Number(c.s) >= 4).slice(0, 3).map(c => `${c.n} (${c.s}/5)${c.fb ? ": " + clip(c.fb, 160) : ""}`);
  const low = byS.slice().reverse().filter(c => Number(c.s) < 4).slice(0, 3).map(c => `${c.n} (${c.s}/5)${c.fb ? ": " + clip(c.fb, 160) : ""}`);
  const why = [crit.length ? `The trainer scored ${crit.length} criteria on the ${rb.title} rubric: weighted average ${a.rubric.avg != null ? Number(a.rubric.avg).toFixed(2) : "–"}/5${pct_ != null ? ` = ${pct_}%` : ""}` : pct_ != null ? `The trainer's score: ${pct_}%` : "",
    a.status ? `Result: ${a.status}` : "", a.comment ? clip(a.comment, 300) : ""].filter(Boolean).join(". ");
  return {name: title, pct: pct_, status: a.status || "", why, best: best.length ? best : (!crit.length && a.status === "Passed" ? ["Passed with the trainer"] : []),
    improve: low.length ? low : a.status === "Redo" ? ["The trainer asked for a redo" + (a.comment ? ": " + clip(a.comment, 200) : "")] : [], by: "🧑‍🏫 Trainer"};
}
// 🟢 a Practice Session: its latest submitted attempt's checks, the trainer's review, the AI's evaluation
function sessionCtx(R, it){
  const runs = ((R.src["sessions:"] || {}).runs) || {}, rv = ((R.src["labreview:"] || {}).sessions) || {};
  const ks = Object.keys(runs).filter(k => k.split("|")[0] === it.id && runs[k] && runs[k].submittedAt).sort((a, b) => String(runs[b].submittedAt).localeCompare(String(runs[a].submittedAt)));
  if(!ks.length) return null;
  const k = ks[0], run = runs[k], r = rv[k] || {}, ch = (run.auto && run.auto.checks) || [], ok = ch.filter(c => c.ok), bad = ch.filter(c => !c.ok);
  const t = num100(r.score), pct_ = t != null ? t : run.auto ? run.auto.pct : null;
  const why = [ch.length ? `${ok.length} of ${ch.length} checks passed (${run.auto.pct}%)` : "", t != null ? `the trainer's score: ${t}%` : "waiting for the trainer's review",
    run.attempts > 1 ? `attempt ${run.attempts}` : "", r.comment ? clip(r.comment, 260) : run.ai && run.ai.summary ? clip(run.ai.summary, 260) : ""].filter(Boolean).join(". ");
  return {name: it.t, pct: pct_, status: t != null ? "Reviewed" : "Submitted", why: why.charAt(0).toUpperCase() + why.slice(1),
    best: ok.slice(0, 3).map(c => c.label), improve: bad.slice(0, 4).map(c => c.label + (c.want ? ` (expected: ${clip(c.want, 80)})` : "")), by: "🟢 Practice Session"};
}
// ✍️ a lesson's Knowledge Check: the trainer's final score or the graded best, the summary and each answer's feedback
function kcCtx(R, p, l){
  const dp = (R.data || {})["day-progress"] || p.progress || {}, x = dp[l] || {}, rv = (((R.src["kcreview:"] || {}).lessons) || {})[l] || {};
  const g = (((R.process || {}).kc) || {})[l] || null, last = g && g.last, t = num100(rv.score), sc = t != null ? t : typeof x.score === "number" ? x.score : g && typeof g.best === "number" ? g.best : null;
  if(sc == null) return null;
  const items = (last && last.items) || [];
  const best = items.filter(q => q.score >= 8).sort((a, b) => b.score - a.score).slice(0, 2).map(q => `Answer ${(q.i != null ? q.i + 1 : "")} (${q.score}/10): ${clip(q.feedback, 220)}`.replace("Answer  ", "An answer "));
  const low = items.filter(q => q.score <= 6).sort((a, b) => a.score - b.score).slice(0, 3).map(q => `Answer ${(q.i != null ? q.i + 1 : "")} (${q.score}/10): ${clip(q.feedback, 220)}`.replace("Answer  ", "An answer "));
  const why = [`${sc}%${t != null ? " (the trainer's final score)" : ""}, ${sc >= 70 ? "passed" : "not passed yet: 70% passes"}${(x.kcAttempts || (g && g.attempts)) ? `, ${x.kcAttempts || g.attempts} attempt${(x.kcAttempts || g.attempts) === 1 ? "" : "s"}` : ""}`,
    rv.comment ? clip(rv.comment, 300) : last && last.summary ? clip(last.summary, 300) : ""].filter(Boolean).join(". ");
  return {name: `✍️ Knowledge Check: ${lessonName(l)}`, pct: sc, status: sc >= 70 ? "Passed" : "Not yet", why, best, improve: low, by: "✍️ Graded"};
}
// (a deliverable the guide lists on several days — a lesson's Knowledge Check, a Practice Session, a mock call — is scored
// once, on the last day that lists it; the days before say where its score is)
function lastDayOf(){
  if(B.lastDay) return B.lastDay;
  const m = {}; dayList().forEach(d => dayItems(d).forEach(it => {
    if(it.at === "tool" && it.id === "process") (d.lessons || []).forEach(l => { m["kc|" + l] = d.day; });
    else if(it.at === "trainer" || it.at === "session") m[it.at + "|" + it.id] = d.day; }));
  return (B.lastDay = m);
}
function dayDeliverables(p, d){
  const R = B.data.rec[p.id] || {}; R.src = R.src || {};
  const out = [], acts = (((R.src["labreview:"] || {}).acts) || {}), list = dayStatus(p, d), L = lastDayOf();
  const later = k => L[k] != null && L[k] !== d.day ? L[k] : null;
  list.forEach(x => {
    const it = x.it, lk = it.at === "trainer" || it.at === "session" ? later(it.at + "|" + it.id) : null;
    if(lk){ out.push({name: it.t, pct: null, status: `Scored on Day ${lk}`, why: `Its score is on Day ${lk}, the last day it runs.`, best: [], improve: [], by: ""}); return; }
    if(it.at === "trainer" && acts[it.id] && (acts[it.id].status || acts[it.id].score != null)){ out.push(trainerCtx(acts[it.id], it.t)); return; }
    if(it.at === "session"){ const c = sessionCtx(R, it); if(c){ out.push(c); return; } }
    if(it.at === "tool" && it.id === "process"){ const ls = d.lessons || [], here_ = ls.filter(l => !later("kc|" + l));
      const cs = here_.map(l => kcCtx(R, p, l)).filter(Boolean); if(cs.length){ out.push(...cs); return; }
      if(ls.length && !here_.length){ const n = later("kc|" + ls[0]); out.push({name: it.t, pct: null, status: `Scored on Day ${n}`, why: `The Knowledge Check's score is on Day ${n}, the last day it runs.`, best: [], improve: [], by: ""}); return; } }
    out.push({name: it.t, pct: null, status: x.done ? "Done" : "Not yet", why: x.auto ? x.auto.how : x.manual ? "Ticked done by the trainer" : "Not done yet", best: [], improve: [], by: ""});
  });
  // 📒 the day's Monitoring Sheet update, graded on Submit (js/ft-buffer.js ACTS[…].submit, trackerreview:<id>.items)
  const ACTS = (window.FTBuffer && FTBuffer.ACTS) || {}, items = ((R.src["trackerreview:"] || {}).items) || {};
  const seen = new Set();
  Object.entries(ACTS).filter(([k, a]) => a.submit && Number(k.split(":")[0]) === Number(d.day)).forEach(([, a]) => {
    const key = (a.submit.items || []).join("-"); if(seen.has(key)) return; seen.add(key);
    const r = items[key]; if(!r) return; const g = r.result || {};
    out.push({name: `📒 Monitoring Sheet items #${(a.submit.items || []).join(", #")}`, pct: num100(g.score), status: r.onTime ? "On time" : "Late",
      why: [g.score != null ? `${num100(g.score)}% from the review of the entries` : "Submitted", r.onTime ? "on time (before 5:00 PM ET)" : "late (after 5:00 PM ET)", g.context ? clip(g.context, 260) : ""].filter(Boolean).join(", ").replace(/, ([^,]*)$/, ". $1"),
      best: (g.items || []).filter(x => x.found).slice(0, 3).map(x => `#${x.n} ${x.title || ""} is in`), improve: [...(g.redFlags || []), ...(g.improve || [])].slice(0, 4).map(x => clip(x, 200)), by: "📒 Reviewed"});
  });
  // 💬 the trainer's day-by-day feedback on the day's lesson (sent only: a draft is the trainer's own)
  const fb = (((R.feedback || {}).days) || {});
  (d.lessons || []).forEach(l => { const f = fb[l]; if(f && f.status === "sent" && (f.summary || f.rating))
    out.push({name: `💬 Trainer's feedback: ${lessonName(l)}`, pct: null, status: f.rating || "", why: clip(f.summary || "", 420), best: [], improve: [], by: "💬 Trainer"}); });
  return out;
}
const dayAvg = xs => avgOf(xs.map(x => x.pct));
function dayScoresTable(){
  const ppl = people(), D = dayList();
  return {id: "dayscores", title: "📅 Day 1–16: Detailed Scores", note: `${meOn() ? "Your" : "Each trainee's"} score for each training day: the average of the day's scored deliverables (mock calls and demos, Practice Sessions, Knowledge Checks, Monitoring Sheet updates). Click a day for its deliverables. ${meOn() ? "Your days in detail, with why each was scored that way, what to improve and what you did best, are under the table." : "Pick a trainee under the table for each deliverable's score with why it was scored that way, what needs to be improved and what they did best."}`,
    head: ["Trainee", "Average"].concat(D.map(d => `Day ${d.day}`)),
    rows: ppl.map(p => { const per = D.map(d => dayDeliverables(p, d)), avgs = per.map(dayAvg), a = avgOf(avgs);
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: pct(a), f: a == null ? "No scored deliverable yet" : `The average of the days' scores = ${pct(a)}`, cls: "gs-num gs-calc gs-bold " + tone(a)}]
        .concat(D.map((d, i) => { const xs = per[i], sc = xs.filter(x => x.pct != null), done = xs.filter(x => x.pct != null || /Done|Passed/.test(x.status)).length;
          return {v: avgs[i] != null ? pct(avgs[i]) : done ? `${done}/${xs.length} done` : "", f: `Day ${d.day} · ${d.role}: ` + (xs.length ? xs.map(x => `${x.name.replace(/^\S+\s(?=Knowledge|Monitoring|Trainer)/, "")} ${x.pct != null ? x.pct + "%" : x.status || "—"}`).join(" · ") : "no deliverables")
            + (sc.length ? ` = ${pct(avgs[i])}` : ""), cls: "gs-num " + (avgs[i] != null ? tone(avgs[i]) : done ? "gs-mid" : "")}; }));
    })};
}
function dayScoresHtml(){
  const ppl = people(); if(!ppl.length || !B.data) return "";
  const id = meOn() ? ppl[0].id : (B.ds && ppl.some(p => p.id === B.ds) ? B.ds : ppl[0].id), p = ppl.find(x => x.id === id), D = dayList();
  const li = (h, xs, cls) => xs.length ? `<div class="bs-ctx ${cls}"><b>${h}</b><ul>${xs.map(x => `<li>${e(x)}</li>`).join("")}</ul></div>` : "";
  return `<div class="bs-ck bs-ds">${meOn() ? `<h4>🔎 My days in detail</h4>` : `<label class="bs-ck-who">🔎 Detailed scores for <select onchange="FTBatchSheet.dsWho(this.value)">${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>`}
    <div class="bs-ds-days">${D.map(d => { const xs = dayDeliverables(p, d), a = dayAvg(xs);
      return `<details class="bs-ds-day"${a != null ? " open" : ""}><summary><b>Day ${d.day}</b> <span>${e(d.role)}</span><em class="${tone(a)}">${a != null ? pct(a) : `${xs.filter(x => /Done|Passed/.test(x.status) || x.pct != null).length}/${xs.length} done`}</em></summary>
        ${xs.map(x => { const rich = x.pct != null || x.best.length || x.improve.length || x.by;
          return `<div class="bs-ds-it${rich ? " is-rich" : ""}"><div class="bs-ds-h"><span>${e(x.name)}</span>${x.by ? `<small>${e(x.by)}</small>` : ""}<b class="${tone(x.pct)}">${x.pct != null ? x.pct + "%" : e(x.status || "—")}</b></div>
            ${rich ? `<div class="bs-ctx bs-why"><b>🧾 Why this score</b><p>${e(x.why || "—")}</p></div>${li("⭐ What they did best", x.best, "bs-best")}${li("🔧 What needs to be improved", x.improve, "bs-imp")}
              ${!x.best.length && !x.improve.length && x.pct != null ? `<p class="bs-ctx-none">No criterion-level notes were recorded for this score.</p>` : ""}` : `<p class="bs-ctx-none">${e(x.why || "")}</p>`}</div>`; }).join("")}</details>`; }).join("")}</div></div>`;
}
// (an approval or rejection made in 🛡 Admin Master Control → 👥 Trainees & Batches: the sheet reads its trainees again, so the 👥 Trainees table shows it at once)
["approveTrainee", "rejectTrainee"].forEach(fn => { const was = window[fn]; if(typeof was !== "function") return;
  window[fn] = async function(){ const r = await was.apply(this, arguments); if(on() && adminOn()){ if(typeof state === "object") state.adminData = null; B.dataKey = ""; if(!B.loading) loadPeople(); } return r; }; });
// 📊 the Weekly Ranking (js/ft-ranking.js), below the Day 1–16 scores, for the same batch
function rankingHtml(){
  if(meOn() || !window.FTRanking || !FTRanking.embed) return "";
  // (📑 the management summary on top, js/ft-ranking-summary.js; the marks sheet under it, folded)
  const sheet = FTRanking.embed(B.batch);
  if(!window.FTRankSummary) return `<section class="bs-sec bs-rank" id="bs-ranking">${sheet}</section>`;
  return `<section class="bs-sec bs-rank" id="bs-ranking"><h3 class="bs-h">📊 Weekly Ranking</h3>${FTRankSummary.html()}
    <details class="bs-rank-sheet" ${B.rkSheet !== false ? "open" : ""} ontoggle="FTBatchSheet.rkSheet(this.open)"><summary>▸ The marks sheet: each activity's score out of 5, the week's average and the ranking (⬇ Excel, 📤 Share with the trainees)</summary>${sheet}</details></section>`;
}
/* ============================================================
   🏅 THE SIMPLIFIED SCORECARD: what the Batch Sheet opens on (the facilitator's own sheet)
     • 🏅 Score Card: a group of columns per lesson — ✍️ Knowledge Checks, 🛠 Practice, Classroom & outputs, the Average of
       the three, and the Remarks / Trainer Feedback — a row per trainee.
         ✍️ Knowledge Checks  the lesson's answer sheets (its Knowledge Check, Day 1's Reading Task too), as ✍️ Process Questions
                              counts them: the trainer's final score, else the graded best;
         🛠 Practice           the scored practice of the lesson's days: Practice Sessions, the tools' grades, and the mock
                              calls and demos the trainer scored;
         Classroom & outputs  the end-of-shift check of the lesson's training days (📤 Daily outputs: the tracker, the
                              Monitoring Sheet, the tests, the outputs, the EOD), each day its date from the Batch ID;
         Remarks              the trainer's day-by-day feedback on the lesson, as sent (its rating; the summary on a click).
     • Compliance and Platform Utilization Monitoring: the six monitored Drive links (a dropdown: pick one, and Correct /
       Wrong says whether the system opened it and it is the right file), how many are correct, and the trainee's progress
       on the platform (lesson decks finished, Knowledge Checks passed, last on the platform).
   ✍️ Process Questions, 📤 Daily outputs and 📊 Weekly Ranking follow; every other table is under ▸ More detail.
   ============================================================ */
// a lesson's training days (FTDays: a day with no lesson of its own is its lesson's, the one before)
function lessonDays(){
  if(B.ld) return B.ld; const m = {}; let last = null;
  dayList().forEach(d => { const ls = (d.lessons || []).length ? d.lessons : last ? [last] : []; if(ls.length) last = ls[ls.length - 1]; ls.forEach(l => (m[l] = m[l] || []).push(d)); });
  return (B.ld = m);
}
// training day n's date: the nth weekday from the batch's first day (its Batch ID, B + MMDDYY)
function dayDate(n){
  const m = /^b(\d{2})(\d{2})(\d{2})$/i.exec(String(B.batch || "").trim()); if(!m) return null;
  let t = Date.parse(`20${m[3]}-${m[1]}-${m[2]}T12:00:00Z`), k = 0;
  while(true){ const wd = new Date(t).getUTCDay(); if(wd >= 1 && wd <= 5){ k++; if(k >= n) return new Date(t).toISOString().slice(0, 10); } t += 864e5; if(k > 40) return null; }
}
function lessonScore(p, l){
  const R = B.data.rec[p.id] || {}, days = lessonDays()[l] || [];
  // ✍️ the lesson's answer sheets
  const kcs = kcSheets().filter(k => Number(k.l) === Number(l)).map(k => ({k, g: sheetGrade(p, k)})).filter(x => x.g.pct != null);
  const kc = avgOf(kcs.map(x => x.g.pct));
  // 🛠 the scored practice, mock calls and demos of its days (a deliverable on several days counted once)
  const seen = new Set(), prs = [];
  days.forEach(d => dayStatus(p, d).forEach(x => { const k = kindOf(x.it); if((k === "practice" || k === "mock") && x.score && !seen.has(x.it.at + "|" + x.it.id)){ seen.add(x.it.at + "|" + x.it.id); prs.push({t: x.it.t, pct: x.score.pct}); } }));
  const pr = avgOf(prs.map(x => x.pct));
  // 📤 the end-of-shift check of its days
  const comp = ((R.src || {})["trackerreview:"] || {}).compliance || {};
  const cds = days.map(d => ({n: d.day, date: dayDate(d.day)})).filter(x => x.date && comp[x.date] && typeof comp[x.date].pct === "number").map(x => ({n: x.n, date: x.date, pct: comp[x.date].pct}));
  const cl = avgOf(cds.map(x => x.pct));
  const avg = avgOf([kc, pr, cl]);
  const fb = ((((R.feedback || {}).days) || {})[l]) || null, sent = fb && fb.status === "sent" ? fb : null;
  return {kc, kcs, pr, prs, cl, cds, avg, fb: sent};
}
function scoreCardTable(){
  const ppl = people(), L = lessons().filter(d => (lessonDays()[d.id] || []).length || kcSheets().some(k => Number(k.l) === Number(d.id)));
  const P = ["✍️ Knowledge Checks", "🛠 Practice", "Classroom & outputs", "Average", "Remarks / Trainer Feedback"];
  const T = {id: "scorecard", title: "🏅 Score Card", note: `${meOn() ? "Your" : "Each trainee's"} scores, lesson by lesson: ✍️ the lesson's Knowledge Checks, 🛠 the practice, mock calls and demos scored in its days, Classroom & outputs (the end-of-shift check of its days), their Average, and the trainer's feedback. Click a cell for how it was worked out. Blank: nothing scored yet.`,
    groups: [{label: "", span: 2}].concat(L.map(d => ({label: `${d.id}. ${lessonName(d.id)}`, span: P.length}))), keep: P.indexOf("Average"),
    head: ["Trainee", "Overall"].concat(...L.map(() => P)),
    rows: ppl.map(p => { const S = L.map(d => lessonScore(p, d.id)), all = avgOf(S.map(x => x.avg));
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: pct(all), f: all == null ? "Nothing scored yet" : `Overall = the average of the lessons' averages (${S.map((x, i) => x.avg == null ? null : `${L[i].id}: ${Math.round(x.avg)}%`).filter(Boolean).join(", ")}) = ${Math.round(all)}%`, cls: "gs-num gs-calc gs-bold " + tone(all)}]
        .concat(...S.map((x, i) => { const nm = `${L[i].id}. ${lessonName(L[i].id)}`;
          return [
            {v: pct(x.kc), f: x.kc == null ? `${nm} · Knowledge Checks: not graded yet` : `${nm} · Knowledge Checks: ${x.kcs.map(y => `${y.k.title} ${y.g.pct}% (${y.g.how})`).join("; ")}`, cls: "gs-num " + tone(x.kc)},
            {v: pct(x.pr), f: x.pr == null ? `${nm} · Practice: nothing scored yet` : `${nm} · Practice: ${x.prs.map(y => `${y.t.replace(/\s*\(.*$/, "")} ${y.pct}%`).join("; ")}`, cls: "gs-num " + tone(x.pr)},
            {v: pct(x.cl), f: x.cl == null ? `${nm} · Classroom & outputs: no checked day yet` : `${nm} · Classroom & outputs: ${x.cds.map(y => `Day ${y.n} (${y.date}) ${y.pct}%`).join("; ")} — the end-of-shift check`, cls: "gs-num " + tone(x.cl)},
            {v: pct(x.avg), f: x.avg == null ? `${nm}: nothing to average yet` : `${nm} · Average = the average of ${[x.kc, x.pr, x.cl].filter(v => v != null).length} (${[x.kc, x.pr, x.cl].filter(v => v != null).map(v => Math.round(v) + "%").join(" + ")}) = ${Math.round(x.avg)}%`, cls: "gs-num gs-calc gs-bold " + tone(x.avg)},
            {v: x.fb ? (x.fb.rating || "Sent") : "", f: x.fb ? `${nm} · Trainer: ${x.fb.rating || ""}${x.fb.summary ? " — " + String(x.fb.summary).replace(/\s+/g, " ").slice(0, 400) : ""}` : `${nm}: no feedback sent yet`, cls: "gs-txt " + (x.fb ? (/Strong/i.test(x.fb.rating || "") ? "gs-hi" : /Needs/i.test(x.fb.rating || "") ? "gs-lo" : "gs-mid") : "")}]; }));
    })};
  return T;
}
// Compliance and Platform Utilization Monitoring
const LSTAT = {ok: ["✓ Correct", "gs-hi"], trainer: ["✓ Correct", "gs-hi"], bad: ["✗ Wrong", "gs-lo"], fix: ["✗ Wrong", "gs-lo"], pending: ["⏳ Pending", "gs-mid"], relinked: ["⏳ Pending", "gs-mid"], none: ["— Not linked", ""]};
function complianceTable(){
  const ppl = people();
  return {id: "compliance", title: "Compliance and Platform Utilization Monitoring", note: `${meOn() ? "Your" : "Each trainee's"} six monitored Drive links — pick one in the dropdown: Correct (the system opened it and it is the right file or folder) or Wrong (and why, on a click) — and progress on the platform.`,
    groups: [{label: "", span: 1}, {label: "Drive Links", span: 3}, {label: "Progress", span: 3}],
    head: ["Trainee", "Assessment (dropdown)", "Correct / Wrong", "Links correct", "Lesson decks", "Knowledge Checks passed", "Last on the platform"],
    rows: ppl.map(p => { const {L} = linkState(p), k = (B.dl || {})[p.id] && L[(B.dl || {})[p.id]] ? B.dl[p.id] : (LINKS.find(([k]) => !/ok|trainer/.test(L[k].st)) || LINKS[0])[0];
      const x = L[k], st = LSTAT[x.st] || ["—", ""], okN = LINKS.filter(([q]) => /ok|trainer/.test(L[q].st)).length;
      const R = B.data.rec[p.id] || {}, dp = (R.data || {})["day-progress"] || p.progress || {}, ls = lessons();
      const kl = kcLessons(), decks = ls.filter(d => deckOf(p, d).finished).length, kcs = kl.filter(d => (dp[d.id] || {}).done).length, last = p.lastActive;
      return [{v: p.name, f: p.name, cls: "gs-name"},
        {v: x.label, f: x.link || "", cls: "gs-txt bs-dl", dl: {id: p.id, k, L}},
        {v: st[0], f: `${x.label}: ${x.link ? x.link + " · " : ""}${x.st === "none" ? "not linked yet" : x.c && x.c.err ? x.c.err : st[0]}`, cls: "bs-lesson " + st[1]},
        {v: `${okN} / ${LINKS.length}`, f: LINKS.map(([q]) => `${L[q].label}: ${(LSTAT[L[q].st] || ["—"])[0]}`).join(" · "), cls: "gs-num gs-bold " + (okN === LINKS.length ? "gs-hi" : okN ? "gs-mid" : "gs-lo")},
        {v: `${decks} / ${ls.length}`, f: `${decks} of the ${ls.length} lesson decks finished`, cls: "gs-num"},
        {v: `${kcs} / ${kl.length}`, f: `${kcs} of the ${kl.length} lessons' Knowledge Checks passed (${kl.map(d => "Lesson " + d.id).join(", ")})`, cls: "gs-num"},
        {v: last ? ago(last) : "Not yet", f: last ? when(last) : "Not on the platform yet", cls: last ? "" : "gs-lo"}];
    })};
}
// a table with a row of grouped headings over its own (the lessons over their five columns) and, in the compliance
// table, the Drive link's dropdown in its cell
/* ▾/▸ retractable: a lesson's group of columns folds to its Average alone (a click on its heading), all of them at once
   (Collapse all / Expand all), and the whole table hides under its title. Kept per viewer on this browser. */
const FOLD_KEY = "lsh_bs_fold";
function foldState(){
  if(B.fold) return B.fold;
  try{ B.fold = JSON.parse(localStorage.getItem(FOLD_KEY) || "{}") || {}; }catch(err){ B.fold = {}; }
  return B.fold;
}
function foldSave(){ try{ localStorage.setItem(FOLD_KEY, JSON.stringify(B.fold || {})); }catch(err){} }
const foldOf = id => { const F = foldState(); return F[id] = F[id] || {g: [], hide: false}; };
// redraw keeping the page and the table where they were scrolled to
function foldRender(id){
  const y = window.scrollY, w = document.querySelector(`#bs-${id} .bs-wrap`), x = w ? w.scrollLeft : 0;
  foldSave(); render();
  window.scrollTo(0, y); const w2 = document.querySelector(`#bs-${id} .bs-wrap`); if(w2) w2.scrollLeft = x;
}
function groupedSheetHtml(T, ti){
  const n = T.head.length, empty = !T.rows.length, F = foldOf(T.id);
  // each column's group, and whether it is folded away (a folded group keeps one column: T.keep, else its first)
  const gOf = [], foldable = g => !!g.label && g.span > 1;
  T.groups.forEach((g, gi) => { for(let k = 0; k < g.span; k++) gOf.push([gi, k]); });
  const gone = ci => { const [gi, k] = gOf[ci] || []; return gi != null && foldable(T.groups[gi]) && F.g.includes(gi) && k !== (T.keep != null && T.keep >= 0 ? T.keep : 0); };
  const fc = ci => gone(ci) ? " gs-fold" : "";
  const cell = (c, ri, ci) => c.dl ? `<td class="${c.cls || ""}${fc(ci)}" data-t="${ti}" data-r="${ri}" data-c="${ci}"><select class="bs-dl-sel" aria-label="Drive link" onchange="FTBatchSheet.dlPick('${e(c.dl.id)}', this.value)">${LINKS.map(([k, label]) => `<option value="${k}" ${k === c.dl.k ? "selected" : ""}>${e(label)}</option>`).join("")}</select></td>`
    : `<td tabindex="0" class="${c.cls || ""}${ci === 0 ? " gs-frz" : ""}${fc(ci)}" data-t="${ti}" data-r="${ri}" data-c="${ci}" onclick="FTBatchSheet.pick(this)" onfocus="FTBatchSheet.pick(this)">${e(c.v)}</td>`;
  const folds = T.groups.map((g, gi) => foldable(g) ? gi : -1).filter(gi => gi >= 0), allIn = folds.length && folds.every(gi => F.g.includes(gi));
  const tid = e(T.id);
  const head = `<h3 class="bs-h"><button type="button" class="bs-fold-sec" onclick="FTBatchSheet.hideSec('${tid}')" aria-expanded="${!F.hide}" title="${F.hide ? "Show" : "Hide"} this table">${F.hide ? "▸" : "▾"}</button> ${e(T.title)} <span>${T.rows.length} row${T.rows.length === 1 ? "" : "s"}</span>
    ${!F.hide && folds.length > 1 ? `<button type="button" class="bs-fold-all" onclick="FTBatchSheet.foldAll('${tid}', ${allIn ? "false" : "true"})">${allIn ? "▸◂ Expand all" : "◂▸ Collapse all"}</button>` : ""}</h3>`;
  if(F.hide) return `<section class="bs-sec bs-sc bs-hidden" id="bs-${T.id}">${head}</section>`;
  let col = 0;
  return `<section class="bs-sec bs-sc" id="bs-${T.id}">${head}<p class="bs-note">${e(T.note)}${folds.length ? " Click a heading's ▾ to fold its columns away." : ""}</p>
    <div class="gs-wrap bs-wrap"><table class="gs" role="grid"><thead>
      <tr class="gs-letters"><th class="gs-corner"></th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}${fc(i)}">${letter(i)}</th>`).join("")}</tr>
      <tr class="gs-group"><th class="gs-rn"></th>${T.groups.map((g, gi) => { const c0 = col; col += g.span; const shut = foldable(g) && F.g.includes(gi);
        const lab = foldable(g) ? `<button type="button" class="bs-fold-g" onclick="FTBatchSheet.fold('${tid}', ${gi})" aria-expanded="${!shut}" title="${shut ? "Show all of its columns" : "Fold it to " + e(T.head[c0 + (T.keep != null && T.keep >= 0 ? T.keep : 0)]) + " alone"}">${shut ? "▸" : "▾"} ${e(g.label)}</button>` : e(g.label);
        return `<th colspan="${shut ? 1 : g.span}" class="${c0 === 0 ? "gs-frz" : ""}${gi % 2 ? " gs-g2" : ""}${shut ? " gs-shut" : ""}">${lab}</th>`; }).join("")}</tr>
      <tr class="gs-head"><th class="gs-rn">1</th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}${fc(i)}">${e(h)}</th>`).join("")}</tr></thead>
      <tbody>${T.rows.map((r, ri) => `<tr><th class="gs-rn">${ri + 2}</th>${r.map((c, ci) => cell(c, ri, ci)).join("")}</tr>`).join("")}
      ${empty ? `<tr class="gs-empty"><th class="gs-rn">2</th><td colspan="${n}" class="bs-none">No trainee in this batch yet.</td></tr>` : ""}</tbody></table></div></section>`;
}
// the page: the Score Card and the compliance first, then the Weekly Ranking, the Process Questions and the Daily outputs;
// every other table under ▸ More detail; the approvals and batches at the foot
const MAIN = ["scorecard", "compliance", "process", "outputs"];
function sectionsHtml(T){
  const one = (x, i) => x.id === "scorecard" || x.id === "compliance" ? groupedSheetHtml(x, i)
    : x.id === "dayscores" ? sheetHtml(x, i).replace(/<\/section>$/, dayScoresHtml() + "</section>")
    : x.id === "scores" ? sheetHtml(x, i).replace(/<\/section>$/, gradesHtml() + "</section>")
    : x.id === "process" ? sheetHtml(x, i).replace(/<\/section>$/, rationaleHtml() + "</section>")
    : x.id === "recent" ? sheetHtml(x, i).replace('<p class="bs-note">', `<p class="bs-note"><label class="bs-period">Show <select onchange="FTBatchSheet.period(this.value)">${[[1, "today"], [7, "the last 7 days"], [14, "the last 14 days"], [30, "the last 30 days"], [0, "everything"]].map(([v, l]) => `<option value="${v}" ${B.recent === v ? "selected" : ""}>${l}</option>`).join("")}</select></label> `)
    : sheetHtml(x, i);
  const at = id => T.findIndex(x => x.id === id), main = id => one(T[at(id)], at(id));
  const rest = T.map((x, i) => [x, i]).filter(([x]) => !MAIN.includes(x.id));
  return main("scorecard") + main("compliance") + rankingHtml() + main("process") + main("outputs")
    + `<details class="bs-more" ${B.more ? "open" : ""} ontoggle="FTBatchSheet.more(this.open)"><summary>▸ More detail: ${rest.map(([x]) => e(x.title)).join(" · ")}</summary>${rest.map(([x, i]) => one(x, i)).join("")}</details>`;
}
/* 📤 Daily outputs: each training day's compliance (worker.js dailyCompliance, at the end of every shift): the Daily Task
   Tracker, the Monitoring Sheet, the Typing and Spelling tests, the day's outputs (links submitted or files saved in the
   folder) and the EOD email, each a %, and their average — what 📈 Overall Performance's Daily Compliance sheet showed. */
function outputsTable(){
  const ppl = people(), comp = p => (((B.data.rec[p.id] || {}).src || {})["trackerreview:"] || {}).compliance || {};
  const dates = [...new Set(ppl.flatMap(p => Object.keys(comp(p))))].sort().slice(-30);
  const md = d => { const x = new Date(d + "T12:00:00Z"); return x.toLocaleDateString(undefined, {weekday: "short", month: "numeric", day: "numeric", timeZone: "UTC"}); };
  return {id: "outputs", title: "📤 Daily outputs", note: `${meOn() ? "Your" : "Each trainee's"} day as the end-of-shift check found it: the Task Tracker, the Monitoring Sheet, the Typing & Spelling tests, the day's outputs, the EOD email and their progress on the platform, each a %, averaged. Each day's cell has every activity's score in a little box and how the trainee did on it, in two sentences. ${dates.length ? "" : "No day checked yet: the check runs at the end of every shift."}`,
    head: ["Trainee", "Average"].concat(dates.map(md)),
    rows: ppl.map(p => { const c = comp(p), vs = dates.map(d => c[d] && typeof c[d].pct === "number" ? c[d].pct : null), a = avgOf(vs);
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: pct(a), f: a == null ? "No day checked yet" : `The average of the days = ${pct(a)}`, cls: "gs-num gs-calc gs-bold " + tone(a)}]
        .concat(dates.map((d, i) => { const x = c[d]; if(!x) return {v: "", f: `${md(d)}: not checked`, cls: "gs-num"};
          // each activity: a little box with its score, and the trainee's performance on it in two sentences at most
          const acts = dayActs(B.data.rec[p.id] || {}, d), box = v => `<b class="bs-sbox ${tone(v)}">${v == null ? "—" : Math.round(v) + "%"}</b>`;
          return {v: pct(vs[i]), csv: `${pct(vs[i])} — ${acts.map(a => `${a.label} ${a.pct == null ? "—" : a.pct + "%"}: ${a.text}`).join(" | ")}`,
            f: `${md(d)} = ${pct(vs[i])} · ${acts.map(a => `${a.label} ${a.pct == null ? "—" : a.pct + "%"}: ${a.text}${a.more ? " [" + a.more + "]" : ""}`).join(" · ")}`, cls: "bs-ocell",
            html: `<div class="bs-oday">${box(vs[i])}<span>the day</span></div><ul class="bs-oacts">${acts.map(a => `<li data-act="${e(a.k)}">${box(a.pct)}<div><b>${a.icon} ${e(a.label)}</b><span>${e(a.text)}</span></div></li>`).join("")}</ul>`}; }));
    })};
}
/* 📤 each activity of a checked day, in the Daily outputs table's cell: its score in a little box and the trainee's
   performance on it in two sentences at most — what the end-of-shift check found (each part, what is missing), with the
   trainer's comment, else the AI's review of the Task Tracker's notes / the Monitoring Sheet. (It was a 💬 Comments list
   under the table; it is now in the table itself.) */
const sent2 = (...xs) => { const out = [];
  // (sentences split without a lookbehind, which older Safari can't parse)
  xs.filter(Boolean).forEach(x => (String(x).replace(/\s+/g, " ").trim().match(/(?:[^.!?…]|[.!?…]+(?=\S))+(?:[.!?…]+|$)/g) || []).forEach(y => { y = y.trim(); if(y && /\w/.test(y)) out.push(/[.!?…]$/.test(y) ? y : y + "."); }));
  return out.slice(0, 2).map(y => y.length > 230 ? y.slice(0, 228).replace(/\s+\S*$/, "") + "…" : y).join(" "); };
const first = v => { const t = String(v || "").replace(/\s+/g, " ").trim(); const m = /^.+?[.!?](?=\s|$)/.exec(t); return m ? m[0] : t; };
function dayActs(R, d){
  const rv = (R.src || {})["trackerreview:"] || {}, c = (rv.compliance || {})[d] || {}, P = c.parts || {}, tk = (rv.days || {})[d] || null, mon = rv.monitor || null, out = [];
  const monDay = !!(mon && mon.checkedAt && (() => { const x = new Date(mon.checkedAt); return !isNaN(x) && [x.toISOString().slice(0, 10), `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`].includes(d); })());
  const unread = k => (c.unreadable || []).includes(k), share = "The system can't open it, so it isn't counted. Share it with the program's account (📁 My Drive links).";
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if(P.tracker != null || unread("tracker")){
    const rules = tk ? tk.rules || [] : [], miss = rules.filter(r => !r.pass), voice = tk && (tk.comment ? "🧑‍🏫 " + first(tk.comment) : tk.review ? "🤖 " + first(tk.review) : "");
    out.push({k: "tracker", icon: "📋", label: "Task Tracker", pct: P.tracker, text: unread("tracker") ? sent2(share)
      : sent2(rules.length ? `${rules.length - miss.length} of ${rules.length} checks met${miss.length ? `; to fix: ${miss[0].label}${miss[0].detail ? " (" + miss[0].detail + ")" : ""}` : ", nothing to fix"}.` : P.tracker ? "Updated for the day." : "Not updated for the day.", voice),
      more: [tk && tk.review ? "AI review: " + tk.review : "", tk && tk.comment ? "Trainer: " + tk.comment : ""].filter(Boolean).join(" · ")});
  }
  if(P.monitor != null || unread("monitor")){
    out.push({k: "monitor", icon: "📒", label: "Monitoring Sheet", pct: P.monitor, text: unread("monitor") ? sent2(share)
      // (the Monitoring Sheet's review is its latest check's: shown on the day it was checked only)
      : sent2(P.monitor ? `Updated for the day (${P.monitor}%).` : monDay && mon.error ? `Not counted: ${mon.error}` : "No entry for the day on the Monitoring Sheet.", monDay ? (mon.comment ? "🧑‍🏫 " + first(mon.comment) : mon.review ? "🤖 " + first(mon.review) : "") : ""),
      more: monDay && mon.review ? "AI review: " + mon.review : ""});
  }
  if(P.platform != null){ const did = (c.platform || []).slice(0, 3);
    out.push({k: "platform", icon: "🖥", label: "Platform", pct: P.platform, text: sent2(!P.platform ? "Nothing done on the platform that day." : P.platform < 100 ? "Lessons opened, but nothing finished or submitted that day." : "Finished or submitted work on the platform.", did.length ? "Did: " + did.join(", ") + "." : "")}); }
  if(c.tests || P.tests != null){ const t = c.tests || {}, took = [t.AM && "the morning typing test", t.PM && "the afternoon typing test", t.SP && "the spelling test"].filter(Boolean),
      miss = [!t.AM && "the morning typing test", !t.PM && "the afternoon typing test", !t.SP && "the spelling test"].filter(Boolean);
    out.push({k: "tests", icon: "🧪", label: "Typing & Spelling", pct: P.tests, text: sent2(took.length ? `Took ${took.join(" and ")}.` : "No test found for the day.", took.length && miss.length ? `Not found: ${miss.join(", ")}.` : took.length ? "All three tests done." : "")}); }
  if(P.outputs != null){ const sub = (c.submissions || []).slice(0, 3);
    out.push({k: "outputs", icon: "📤", label: "Day's outputs", pct: P.outputs, text: sent2(!P.outputs ? (c.folderError ? "The folder couldn't be read, so the day's outputs aren't counted." : "No output link submitted and no file saved in the folder that day.")
      : (c.links || c.saved ? [c.links ? plural(c.links, "output link") + " submitted" : "", c.saved ? plural(c.saved, "file") + " saved in the folder" : ""].filter(Boolean).join(" and ") + "." : `${plural((c.submissions || []).length, "submission")} on the platform.`),
      sub.length ? "Submitted: " + sub.join(", ") + "." : "")}); }
  if(P.eod != null){ const rules = c.eodCheck ? c.eodCheck.rules || [] : [], miss = rules.filter(r => !r.pass);
    out.push({k: "eod", icon: "✉️", label: "EOD email", pct: P.eod, text: sent2(!P.eod && !c.eodCheck ? "No EOD email for the day." : rules.length ? `Sent; ${rules.length - miss.length} of ${rules.length} checks met.` : "Sent.",
      miss.length ? `To fix: ${miss[0].label}${miss[0].detail ? " (" + miss[0].detail + ")" : ""}.` : rules.length ? "Professional, complete and on time." : "")}); }
  return out;
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
/* each activity's score, where the platform has one (the Scorecard's own sources): the day's Knowledge Checks (the trainer's
   final score, else the graded best; Day 1's 📖 Reading Task its own), the Practice Session (the trainer's score, else its
   automated checks), the Mock Call / Demo the trainer scored, and a tool's grading-system average. A classroom activity the
   trainer ticks has no score: it counts in "done", not in the average. */
const TOOL_SYS = {drills: "drills", listening: "listening", calcheck: "calcheck", calactivity: "calcheck", calrules: "calrules", calweek: "calweek", calsim: "calendar", callsim: "calls", skills: "skills"};
const numOr = v => v != null && v !== "" && isFinite(Number(v)) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : null;
function scoreOf(R, d, it, p){
  const src = R.src || {}, dp = (R.data || {})["day-progress"] || p.progress || {};
  if(it.at === "session"){
    const runs = ((src["sessions:"] || {}).runs) || {}, rv = ((src["labreview:"] || {}).sessions) || {};
    const xs = Object.keys(runs).filter(k => k.split("|")[0] === it.id && runs[k]).map(k => { const t = numOr((rv[k] || {}).score);
      return t != null ? {pct: t, how: "trainer's score"} : runs[k].submittedAt && runs[k].auto && typeof runs[k].auto.pct === "number" ? {pct: Math.round(runs[k].auto.pct), how: "automated checks"} : null; }).filter(Boolean);
    return xs.length ? {pct: Math.round(avgOf(xs.map(x => x.pct))), how: xs.map(x => `${x.pct}% (${x.how})`).join(", ")} : null;
  }
  if(it.at === "trainer"){ const a = (((src["labreview:"] || {}).acts) || {})[it.id], v = a ? numOr(a.score) : null;
    return v != null ? {pct: v, how: `trainer's score${a.status ? " · " + a.status : ""}`} : null; }
  if(it.at !== "tool") return null;
  if(it.id === "process"){
    const rv = src["kcreview:"] || {}, xs = [];
    (d.lessons || []).forEach(l => { const x = dp[l] || {}, t = numOr(((rv.lessons || {})[l] || {}).score), g = t != null ? t : typeof x.score === "number" ? x.score : null;
      if(g != null) xs.push({pct: g, how: `${lessonName(l)} ${g}%${t != null ? " (trainer's final)" : ""}`});
      const tr = numOr(((rv.read || {})[l] || {}).score), rg = tr != null ? tr : typeof x.readScore === "number" ? x.readScore : null;
      if(rg != null) xs.push({pct: rg, how: `📖 Reading Task ${rg}%${tr != null ? " (trainer's final)" : ""}`}); });
    return xs.length ? {pct: Math.round(avgOf(xs.map(x => x.pct))), how: "Knowledge Check: " + xs.map(x => x.how).join(", ")} : null;
  }
  const sys = TOOL_SYS[it.id], row = sys && R.score && R.score.rows ? R.score.rows.find(r => r.s && r.s.id === sys) : null;
  return row && row.avg != null ? {pct: Math.round(row.avg), how: `${row.s.label} average`} : null;
}
function dayStatus(p, d){
  const R = B.data.rec[p.id] || {}, man = ((R.daycheck || {}).items) || {};
  return dayItems(d).map(it => { const a = autoDone(R, d, it, p), m = man[ckKey(d, it)], sc = scoreOf(R, d, it, p);
    return {it, key: ckKey(d, it), auto: a, score: sc, manual: !!(m && m.done), mAt: m && m.at, done: !!(m && m.done) || !!(a && a.done)}; });
}
// a set of activities as a score: the average of the scored ones, with each one's score for the bar above the sheet
const scoreLine = xs => { const sc = xs.filter(y => y.score); return {avg: sc.length ? Math.round(avgOf(sc.map(y => y.score.pct))) : null, n: sc.length,
  why: sc.map(y => `${y.it.t.replace(/\s*\(.*$/, "")} ${y.score.pct}% (${y.score.how})`).join("; ")}; };
function daysTable(){
  const ppl = people(), D = dayList();
  return {id: "days", title: "📅 Day by Day", note: `${meOn() ? "Your" : "Each trainee's"} scores on each training day: the average of the day's scored activities (the Knowledge Check, the Practice Session, the Mock Call / Demo the trainer scored, the tools' grades). A day with work done but nothing scored yet shows how many are done. Click a cell for each activity's score.  ✓ = every activity of the day done.`,
    head: ["Trainee", "Average score", "Days complete"].concat(KINDS.map(k => k[1]), D.map(d => `Day ${d.day}`)),
    rows: ppl.map(p => { const st = D.map(d => dayStatus(p, d)), full = st.filter(x => x.length && x.every(y => y.done)).length;
      const all = st.flat(), kind = k => all.filter(y => kindOf(y.it) === k), dayAvgs = st.map(x => scoreLine(x).avg), avg = avgOf(dayAvgs);
      const scored = dayAvgs.map((a, i) => a == null ? null : `Day ${D[i].day} ${a}%`).filter(Boolean);
      return [{v: p.name, f: p.name, cls: "gs-name"},
        {v: pct(avg), f: avg == null ? "No scored activity yet" : `Average score = the average of the ${scored.length} scored day${scored.length === 1 ? "" : "s"} (${scored.join(", ")}) = ${Math.round(avg)}%`, cls: "gs-num gs-calc gs-bold " + tone(avg)},
        {v: `${full} / ${D.length}`, f: `${full} of the ${D.length} days with every activity done`, cls: "gs-num gs-bold"}]
        .concat(KINDS.map(([k, label]) => { const xs = kind(k), n = xs.filter(y => y.done).length, left = xs.filter(y => !y.done), sl = scoreLine(xs);
          return {v: sl.avg != null ? pct(sl.avg) : n ? `${n} / ${xs.length} done` : "", f: `${label}, Days 1–${D.length}: ${sl.avg != null ? `average ${sl.avg}% of ${sl.n} scored (${sl.why}). ` : "nothing scored yet. "}${n} of ${xs.length} done${left.length ? ". Still to do: " + left.slice(0, 6).map(y => y.it.t).join("; ") + (left.length > 6 ? "…" : "") : ""}`,
            cls: "bs-lesson " + (sl.avg != null ? tone(sl.avg) : xs.length && n === xs.length ? "gs-hi" : n ? "gs-mid" : "")}; }),
          D.map((d, i) => { const x = st[i], n = x.filter(y => y.done).length, done = x.length && n === x.length, sl = scoreLine(x);
          const left = x.filter(y => !y.done).map(y => y.it.t);
          return {v: sl.avg != null ? `${done ? "✓ " : ""}${sl.avg}%` : n ? `${done ? "✓ " : ""}${n}/${x.length} done` : "",
            f: `Day ${d.day} · ${d.role}: ${sl.avg != null ? `score ${sl.avg}% = the average of ${sl.n} scored activit${sl.n === 1 ? "y" : "ies"}: ${sl.why}. ` : "nothing scored yet. "}${n} of ${x.length} done${left.length ? ". Still to do: " + left.slice(0, 5).join("; ") + (left.length > 5 ? "…" : "") : ""}`,
            cls: "bs-lesson " + (sl.avg != null ? tone(sl.avg) : done ? "gs-hi" : n ? "gs-mid" : "")}; }));
    })};
}
// (no ✅ Checklist panel under 📅 Day by Day any more: the table shows each day; ticks saved before still count)
/* 📁 Drive links: the six monitored links a trainee saves in 📁 My Drive links (drive:<id>, js/ft-drive.js) — the Monitoring Sheet,
   the TAM, the Typing and Spelling Tests folders, the Assessments/Activities folder and the Daily Task Tracker (worker.js verifyLinks); the Assessment and
   Activities Folder, the Daily Task Tracker and the Monitoring Sheet — each saved or not, and whether the end-of-shift check
   could open it (trackerreview:<id>: the tracker's latest day, the Monitoring Sheet's check, the folder's screenshot look). */
// (the six monitored links, in the course's order: js/ft-drive.js MONITORED, checked by worker.js verifyLinks)
const LINKS = [["monitor", "📒 Monitoring Sheet"], ["tam", "📘 TAM"], ["typing", "⌨️ Typing Tests"], ["spelling", "🔤 Spelling Tests"], ["folder", "📁 Assessments/Activities"], ["tracker", "📋 Daily Task Tracker"]];
const sameLink = (a, b) => String(a || "").trim() === String(b || "").trim();
/* each link's state: "none" (not saved), "ok" (opened at the last check, or not checked yet), "bad" (the last check of THIS
   link couldn't open it), "relinked" (the last check failed, but on a link the trainee has replaced since: it is checked
   again at the end of the shift), "trainer" (✓ a trainer opened it and marked it as opening: daycheck:<id>.links, for that
   very link; a new link drops it). A check from before checks recorded their link (url) counts as this link's unless the
   links were saved after it. */
// an error that means the system couldn't open the file (not one about what is in it)
const ACCESS = err => /can.?t (be )?open|can.?t be read|share (it|each)|not shared|sign.?in/i.test(String(err || ""));
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
    // 🔁 the system's check of this very link (worker.js verifyLinks: on saving the links, on 🔁 Check now and at the end of
    // every shift), when it is the newest
    const v = (rv.verify || {})[k];
    // (✓ Mark as opening: the system opened this very link, so it stays ✓ for it, whatever a later check of its CONTENT says)
    if(v && v.ok && sameLink(v.url, link)){ out[k] = {st: "ok", label, link, c: {err: "", at: v.at}, issue: c && c.err && !ACCESS(c.err) && sameLink(c.url || link, link) ? c.err : ""}; return; }
    if(v && sameLink(v.url, link) && !v.retry && (!c || !t(c.at) || (t(v.at) && t(v.at) >= t(c.at)))){ out[k] = v.ok ? {st: "ok", label, link, c: {err: "", at: v.at}} : {st: "bad", label, link, c: {err: v.error || "the system can't open it", at: v.at}}; return; }
    // (not checked yet, or checked on another link: ⏳ Pending verification)
    if(!c || (c.url && !sameLink(c.url, link))){ out[k] = {st: "pending", label, link, c}; return; }
    if(!c.err){ out[k] = {st: "ok", label, link, c}; return; }
    // (the file opened, but its content needs a fix — the Daily Task Tracker's tab, a link that isn't a Google Sheet: not "can't open")
    if(!ACCESS(c.err)){ out[k] = {st: "fix", label, link, c}; return; }
    const ofThis = c.url ? sameLink(c.url, link) : !(t(dv.updatedAt) && t(c.at) && t(dv.updatedAt) > t(c.at));
    out[k] = {st: ofThis ? "bad" : "relinked", label, link, c};
  });
  const checked = [lastDay && lastDay.checkedAt, rv.monitor && rv.monitor.checkedAt, rv.shots && rv.shots.checkedAt, rv.verifyAt].map(t).filter(Boolean).sort((a, b) => b - a)[0];
  return {L: out, dv, checked};
}
function linkCell(x){
  if(x.st === "none") return {v: "—", f: `${x.label}: not linked yet`, cls: "bs-lesson gs-lo"};
  if(x.st === "trainer") return {v: "✓ trainer", f: `${x.label}: ${x.link} · marked as opening by a trainer ${when(x.o.at)}${x.c && x.c.err ? ` (the system's check said: ${x.c.err})` : ""}`, cls: "bs-lesson gs-hi"};
  if(x.st === "bad") return {v: "❌ Inaccessible", f: `${x.label}: linked (${x.link}), but ${x.c.err}${x.c.at ? ` (checked ${when(x.c.at)})` : ""}`, cls: "bs-lesson gs-mid"};
  if(x.st === "fix") return {v: "⚠ needs a fix", f: `${x.label}: ${x.link} · the system opens it, but: ${x.c.err}${x.c.at ? ` (checked ${when(x.c.at)})` : ""}`, cls: "bs-lesson gs-mid"};
  if(x.st === "pending") return {v: "⏳ Pending", f: `${x.label}: ${x.link} · Pending verification: not checked yet on this link (it is checked when saved, at the end of the shift and on 🔁 Check now)`, cls: "bs-lesson gs-mid"};
  if(x.st === "relinked") return {v: "⏳ Pending", f: `${x.label}: ${x.link} · Pending verification: saved after the last check, which couldn't open the old link; it is checked again at the end of the shift`, cls: "bs-lesson gs-hi"};
  return {v: "✓ opening", f: `${x.label}: ${x.link} · ✓ Mark as opening: the system opened it${x.c && x.c.at ? " " + when(x.c.at) : ""}, locked for this link${x.issue ? `. Its last check of the content says: ${x.issue}` : ""}`, cls: "bs-lesson gs-hi"};
}
function linksTable(){
  const ppl = people();
  return {id: "drive", title: "📁 Drive links", note: `The six monitored Google Drive links ${meOn() ? "you save" : "each trainee saves"} in 📁 My Drive links, and whether the system could open them at the last check (the end of every shift). ✓ opening: the system opened it, locked for that link · ⏳ Pending: a link not verified yet · ✓ trainer: a trainer opened it and marked it · ❌ Inaccessible: linked, but the system can't open it · — not linked yet.`,
    head: ["Trainee", "Linked"].concat(LINKS.map(x => x[1]), ["Last checked"]),
    rows: ppl.map(p => {
      const {L, dv, checked} = linkState(p), n = LINKS.filter(([k]) => dv[k]).length;
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: `${n} / ${LINKS.length}`, f: `${n} of the ${LINKS.length} links saved${dv.linkedBy === "trainer" ? " (set by the trainer)" : ""}`, cls: "gs-num gs-bold " + (n === LINKS.length ? "gs-hi" : n ? "gs-mid" : "gs-lo")}]
        .concat(LINKS.map(([k]) => linkCell(L[k])),
          [{v: checked ? when(checked) : "Not yet", f: checked ? `Last checked ${checked.toLocaleString()} (${ago(checked)})` : "Not checked yet: the check runs at the end of every shift", cls: checked ? "" : "gs-lo"}]);
    })};
}
// (no 🔧 "Links for" panel under the table: the six links are checked by themselves, worker.js verifyLinks; a ✓ trainer
// mark saved before still shows)
const tables = () => [scoreCardTable(), complianceTable(), processTable(), outputsTable(), dayScoresTable(), traineesTable(), linksTable(), lessonsTable(), daysTable(), practiceTable(), scoresTable(), recentTable()];

/* ---------- drawing: each table a small sheet (column letters, row numbers, the names frozen) ---------- */
function sheetHtml(T, ti){
  const n = T.head.length, empty = !T.rows.length;
  return `<section class="bs-sec" id="bs-${T.id}"><h3 class="bs-h">${e(T.title)} <span>${T.rows.length} row${T.rows.length === 1 ? "" : "s"}</span></h3><p class="bs-note">${e(T.note)}</p>
    <div class="gs-wrap bs-wrap"><table class="gs" role="grid"><thead>
      <tr class="gs-letters"><th class="gs-corner"></th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}">${letter(i)}</th>`).join("")}</tr>
      <tr class="gs-head"><th class="gs-rn">1</th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}">${e(h)}</th>`).join("")}</tr></thead>
      <tbody>${T.rows.map((r, ri) => `<tr><th class="gs-rn">${ri + 2}</th>${r.map((c, ci) => `<td tabindex="0" class="${c.cls || ""}${ci === 0 && T.id !== "recent" ? " gs-frz" : ""}" data-t="${ti}" data-r="${ri}" data-c="${ci}" onclick="FTBatchSheet.pick(this)" onfocus="FTBatchSheet.pick(this)">${c.html != null ? c.html : e(c.v)}</td>`).join("")}</tr>`).join("")}
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
  // (opened: the latest batch, unless one was picked while here)
  if(!B.picked && !meOn() && B.people){ const lb = latestBatch(); if(lb && lb !== B.batch){ B.batch = lb; B.data = null; B.dataKey = ""; B.sel = null; } }
  if(!B.batch) return `<div class="card gs-card"><p class="sc-empty">No trainee has registered yet. They appear here as soon as they register.</p></div>`;
  loadData();
  const ppl = people(), D = B.data, ready = !!D && !D.error && (!D.batch || D.batch === B.batch) && ppl.every(p => (D.rec || {})[p.id]) && (!B.dataLoading || !!D.batch);
  const T = ready ? tables() : null;
  const approved = ppl.filter(p => p.status === "Approved").length, waiting = ppl.filter(p => p.status === "Waiting for approval").length;
  return `<div class="card gs-card bs-card">
    <div class="gs-top"><span class="gs-logo">📋</span><div class="gs-file"><b>Batch Sheet · ${e(B.batch)}</b>
        <span class="gs-menu"><button onclick="FTBatchSheet.csv()">⬇ Download</button><button onclick="FTBatchSheet.refresh()">↻ Refresh</button><button onclick="FTBatchSheet.fixOpen()">✏️ Fix the batch name</button><button onclick="FTBatchSheet.dateOpen()">✎ Fix a date</button>${adminOn() && !meOn() ? `<button class="bs-upd" ${B.upd ? "disabled" : ""} onclick="FTBatchSheet.updateAll()" title="Work out every trainee's every training day again from their progress, so 📤 Daily outputs, 📊 Weekly Ranking and 🏅 Scores are current">${B.upd ? `Updating ${B.upd.n} / ${B.upd.of}…` : "🔄 Update all scores"}</button>` : ""}</span></div>
      <label class="gs-batch">Batch <select onchange="FTBatchSheet.batch(this.value)">${bs.map(b => `<option ${b === B.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></label></div>
    <div class="bs-sum">${waiting ? `<span class="bs-wait"><b>${waiting}</b> waiting for approval</span>` : ""}
      <span class="bs-jump">Go to: <a href="#bs-scorecard" onclick="return FTBatchSheet.go('scorecard')">🏅 Score Card</a> · <a href="#bs-compliance" onclick="return FTBatchSheet.go('compliance')">✅ Compliance</a> · <a href="#bs-ranking" onclick="return FTBatchSheet.go('ranking')">📊 Weekly Ranking</a> · <a href="#bs-process" onclick="return FTBatchSheet.go('process')">✍️ Process Questions</a> · <a href="#bs-outputs" onclick="return FTBatchSheet.go('outputs')">📤 Daily outputs</a> · <a href="#bs-people" onclick="return FTBatchSheet.go('people')">👥 Approvals &amp; Batches</a></span>
      ${D && D.at ? `<span class="bs-at">${ready && B.dataLoading ? "Updating…" : `Updated ${e(D.at.toLocaleTimeString())}`}</span>` : ""}</div>
    ${B.batch && !canon(B.batch) ? `<div class="bs-warn">⚠ <b>${e(B.batch)}</b> isn't a proper Batch ID (B + the date the batch started, MMDDYY, e.g. B103026). If these trainees belong to another batch, press <b>✏️ Fix the batch name</b>.</div>` : ""}
    ${(() => { const back = (B.auto || []).filter(p => p.batch === B.batch); return back.length ? `<div class="bs-warn bs-back">↩ <b>${back.length} trainee${back.length === 1 ? " was" : "s were"} archived automatically</b> from ${e(B.batch)} (${e(back.slice(0, 6).map(p => p.name).join(", "))}${back.length > 6 ? "…" : ""}), so ${back.length === 1 ? "they are" : "they are"} not on the Scorecard. <button class="btn btn-navy btn-sm" ${B.backBusy ? "disabled" : ""} onclick="FTBatchSheet.bringBack()">${B.backBusy ? "Bringing them back…" : "↩ Bring them back"}</button></div>` : ""; })()}
    ${fixHtml(ppl)}
    ${dateHtml(ppl)}
    <div class="gs-fbar"><span class="gs-ref" id="bsRef">${B.sel ? e(B.sel.ref) : ""}</span><span class="gs-fx">fx</span><input id="bsBar" readonly value="${B.sel ? e(B.sel.f) : "Click any cell to see what it means"}" aria-label="What the selected cell is"></div>
    ${!ready && !(D && D.error && !B.dataLoading) ? `<p class="sc-empty">Reading the batch's progress…</p>` : !ready ? `<p class="sc-empty">Couldn't read the batch's progress. Press ↻ Refresh.</p>`
      : sectionsHtml(T)}
    <p class="sc-how bs-how">Nothing to set up: this page reads what the platform already records. New trainees appear as soon as they register. Click a cell to see what it means in the bar above. ⬇ Download saves all ten tables as one file that opens in Google Sheets or Excel.</p></div>`;
}

// 👥 a trainee revoked, rejected, offboarded, restored or approved: the sheet reads its trainees again
// (the roster changed — someone approved, revoked, offboarded —: read again quietly, the sheet on screen staying until then)
if(typeof window.addEventListener === "function") window.addEventListener("ft-roster-changed", () => { B.dataKey = ""; B.sel = null; if(on() && B.people && !B.loading) loadPeople(); else B.people = null; });
window.FTBatchSheet = {
  batch(b){ if(!adminOn()) return; B.batch = b; B.picked = true; B.data = null; B.dataKey = ""; B.sel = null; render(); },
  refresh(){ B.people = null; B.data = null; B.dataKey = ""; B.sel = null; if(typeof state === "object") state.adminData = null; render(); },
  // 🔄 every approved trainee of the batch, one at a time (worker.js redoCompliance): each training day worked out again from
  // what the platform keeps now, their progress included; then the sheet is read again
  async updateAll(){
    if(!adminOn() || meOn() || B.upd) return;
    const ppl = people().filter(p => p.status === "Approved"); if(!ppl.length) return;
    B.upd = {n: 0, of: ppl.length}; render(); let bad = 0;
    for(const p of ppl){
      try{ await authFetch("/api/drive/verify", {id: p.id}).catch(() => null);
        const r = await authFetch("/api/compliance/backfill", {ids: [p.id], redo: true}); const j = await r.json().catch(() => null); if(!r.ok || !j || !j.ok) bad++; }catch(err){ bad++; }
      B.upd.n++; render();
    }
    B.upd = null; B.dataKey = ""; render();
    if(bad && typeof toast === "function") toast(`${bad} trainee${bad === 1 ? "" : "s"} couldn't be updated. Try 🔄 Update all scores again.`);
  },
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
  dsWho(id){ if(!adminOn()) return; B.ds = id; render(); },
  // (the compliance table's Drive link picked for a trainee; ▸ More detail open or shut)
  dlPick(id, k){ B.dl = B.dl || {}; B.dl[id] = k; render(); },
  // ▾/▸ the Score Card's (and the compliance table's) folds: a group of columns, all of them, the whole table
  fold(id, gi){ const F = foldOf(id), i = F.g.indexOf(gi); if(i >= 0) F.g.splice(i, 1); else F.g.push(gi); foldRender(id); },
  foldAll(id, on){ if(!B.data || B.dataLoading) return; const T = tables().find(x => x.id === id); if(!T) return; const F = foldOf(id);
    F.g = on ? T.groups.map((g, gi) => g.label && g.span > 1 ? gi : -1).filter(gi => gi >= 0) : []; foldRender(id); },
  hideSec(id){ const F = foldOf(id); F.hide = !F.hide; foldRender(id); },
  more(open){ B.more = !!open; },
  rkSheet(open){ B.rkSheet = !!open; },
  raWho(id){ if(!adminOn()) return; B.ra = id; render(); },
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
    for(const [u, body] of [["/api/drive/verify", {id}], ["/api/drive/check", {id}], ["/api/drive/shots", {ids: [id]}]]){
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
    tables().forEach(T => { lines.push(q(T.title.replace(/^\S+\s/, ""))); lines.push(T.head.map(q).join(",")); T.rows.forEach(r => lines.push(r.map(c => q(c.csv != null ? c.csv : c.v)).join(","))); lines.push(""); });
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
      <span class="gs-menu"><button onclick="FTBatchSheet.csv()">⬇ Download</button><button onclick="FTBatchSheet.refreshMe()">↻ Refresh</button>${window.FTTraineeLog ? `<button onclick="FTTraineeLog.open()">📜 My Log</button>` : ""}</span></div>
      ${B.me.batch ? `<span class="gs-batch">Batch <b>${e(bLabel(B.me.batch))}</b></span>` : ""}</div>
    <div class="bs-sum"><span class="bs-jump">Go to: <a href="#bs-scorecard" onclick="return FTBatchSheet.go('scorecard')">🏅 Score Card</a> · <a href="#bs-compliance" onclick="return FTBatchSheet.go('compliance')">✅ Compliance</a> · <a href="#bs-process" onclick="return FTBatchSheet.go('process')">✍️ Process Questions</a> · <a href="#bs-outputs" onclick="return FTBatchSheet.go('outputs')">📤 Daily outputs</a></span>
      ${D && D.at ? `<span class="bs-at">${ready && B.dataLoading ? "Updating…" : `Updated ${e(D.at.toLocaleTimeString())}`}</span>` : ""}</div>
    <div class="gs-fbar"><span class="gs-ref" id="bsRef">${B.sel ? e(B.sel.ref) : ""}</span><span class="gs-fx">fx</span><input id="bsBar" readonly value="${B.sel ? e(B.sel.f) : "Click any cell to see what it means"}" aria-label="What the selected cell is"></div>
    ${!D || B.dataLoading ? `<p class="sc-empty">Reading your progress…</p>` : D.error ? `<p class="sc-empty">Couldn't read your progress. Press ↻ Refresh.</p>`
      : sectionsHtml(T)}
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
  // (the Scorecard left: it opens on the latest batch again next time)
  try{ if(!on() && B.picked && !meOn()){ B.picked = false; B.batch = ""; B.data = null; B.dataKey = ""; } }catch(err){}
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
.gs .gs-fold{display:none;}
.gs .gs-group th.gs-shut{max-width:150px;overflow:hidden;text-overflow:ellipsis;}
.bs-fold-g{all:unset;cursor:pointer;display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .bs-fold-g:hover{text-decoration:underline;} .bs-fold-g:focus-visible{outline:2px solid #F4B77A;outline-offset:2px;}
.bs-fold-sec{border:0;background:none;cursor:pointer;font-size:15px;color:#1E2340;padding:0 4px 0 0;vertical-align:1px;}
.bs-fold-all{margin-left:10px;border:1px solid #C4C7C5;background:#fff;border-radius:999px;padding:3px 10px;font:700 12px Arial,sans-serif;color:#1E2340;cursor:pointer;vertical-align:2px;} .bs-fold-all:hover{border-color:#DB8437;color:#B5651F;}
.bs-hidden{padding-bottom:12px;}
.gs .gs-group th{background:#1E2340;color:#fff;font:700 13px Arial,sans-serif;text-align:left;padding:5px 10px;border-left:2px solid #fff;white-space:nowrap;} .gs .gs-group th.gs-g2{background:#33406B;}
.bs-dl-sel{font:inherit;font-size:13px;padding:2px 4px;border:1px solid #C9D1E0;border-radius:6px;background:#fff;max-width:230px;}
.bs-more,.bs-rank-sheet{margin:14px 0 6px;border:1px solid #E1E3E1;border-radius:10px;background:#FAFBFC;} .bs-more > summary,.bs-rank-sheet > summary{cursor:pointer;padding:10px 14px;font:700 14px Arial,sans-serif;color:#1E2340;list-style:none;}
.bs-more > summary::-webkit-details-marker,.bs-rank-sheet > summary::-webkit-details-marker{display:none;} .bs-more[open] > summary,.bs-rank-sheet[open] > summary{border-bottom:1px solid #E1E3E1;}
.gs td.bs-ocell{min-width:300px;max-width:340px;white-space:normal;vertical-align:top;text-align:left;padding:8px 9px;font-size:12.5px;line-height:1.4;}
.bs-oday{display:flex;align-items:center;gap:7px;margin-bottom:6px;} .bs-oday span{color:#5F6368;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;}
.bs-oacts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
.bs-oacts li{display:flex;gap:7px;align-items:flex-start;border-top:1px dashed #E1E3E1;padding-top:5px;}
.bs-oacts li > div{display:flex;flex-direction:column;min-width:0;} .bs-oacts li b{font-weight:700;color:#202124;font-size:12px;} .bs-oacts li span{color:#3C4043;}
.bs-sbox{flex:0 0 auto;display:inline-block;min-width:40px;text-align:center;border:1px solid #DADCE0;border-radius:6px;padding:2px 4px;font:700 12px Arial,sans-serif;background:#F8F9FA;color:#202124;}
.bs-sbox.gs-hi{background:#E6F4EA;border-color:#B7DFC2;color:#137333;} .bs-sbox.gs-mid{background:#FEF7E0;border-color:#F3DC8F;color:#8A5A00;} .bs-sbox.gs-lo{background:#FCE8E6;border-color:#F5C2BC;color:#B3261E;}
.bs-ds-days{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
.bs-ds-day{border:1px solid #E1E3E1;border-radius:8px;background:#fff;font:13.5px Arial,sans-serif;}
.bs-ds-day > summary{cursor:pointer;display:flex;gap:8px;align-items:center;padding:7px 10px;list-style:none;} .bs-ds-day > summary::-webkit-details-marker{display:none;}
.bs-ds-day > summary::before{content:"▸";color:#5F6368;} .bs-ds-day[open] > summary::before{content:"▾";}
.bs-ds-day > summary span{color:#5F6368;} .bs-ds-day > summary em{margin-left:auto;font-style:normal;font-weight:700;padding:1px 8px;border-radius:9px;}
.bs-ds-it{border-top:1px solid #EEF0EE;padding:7px 12px 8px 28px;} .bs-ds-h{display:flex;gap:8px;align-items:baseline;}
.bs-ds-h span{font-weight:700;color:#202124;} .bs-ds-h small{color:#5F6368;} .bs-ds-h b{margin-left:auto;padding:1px 8px;border-radius:9px;white-space:nowrap;}
.bs-ctx{margin:4px 0 0;padding:5px 9px;border-radius:6px;} .bs-ctx b{font-size:12.5px;} .bs-ctx p{margin:2px 0 0;} .bs-ctx ul{margin:2px 0 0;padding-left:18px;}
.bs-why{background:#F1F3F4;} .bs-best{background:#E6F4EA;} .bs-imp{background:#FEF7E0;} .bs-ctx-none{margin:3px 0 0;color:#5F6368;font-size:12.5px;}
.bs-rank{padding-top:6px;} .bs-rank .rk-pick select:first-child{display:none;}
.bs-ck-who{font:700 15px Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;} .bs-ck-who select{font:15px Arial,sans-serif;padding:5px 8px;border:1px solid #C4C7C5;border-radius:4px;}
.bs-days{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:8px;}
.bs-day{border:1px solid #E1E3E1;border-radius:8px;padding:8px 10px;background:#fff;font:13.5px Arial,sans-serif;}
.bs-day.is-done{border-color:#A8DAB5;background:#F3FBF5;}
.bs-day-h{display:flex;align-items:baseline;gap:6px;margin-bottom:6px;} .bs-day-h span{color:#5F6368;font-size:12.5px;} .bs-day-h em{margin-left:auto;font-style:normal;font-weight:700;color:#137333;}
.bs-item{display:flex;align-items:flex-start;gap:7px;padding:3px 0;cursor:pointer;line-height:1.35;} .bs-item input{margin-top:2px;width:16px;height:16px;flex:none;}
.bs-item.is-done span{color:#137333;} .bs-item small{font-size:11px;font-weight:700;color:#5F6368;background:#F1F3F4;border-radius:999px;padding:0 6px;margin-left:3px;}
.bs-gr{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:3px 0;border-bottom:1px dashed #EEF0F2;} .bs-gr small{grid-column:1 / -1;color:#5F6368;font-size:12px;}
.bs-item small.bs-redo{color:#C5221F;background:#FCE8E6;}
.bs-isc{font-size:12px;margin-left:4px;} .bs-rat{margin:8px 0 14px;} .bs-rat h5{margin:12px 0 4px;font:700 15px Arial,sans-serif;color:#1F1F1F;border-top:1px solid #E1E3E1;padding-top:10px;}
.bs-rat-avg{font:14px Arial,sans-serif;margin:4px 0 6px;} .bs-rat-avg b{font-size:16px;} .bs-rat-avg span{color:#5F6368;}
.bs-rat-how{margin:2px 0 6px;font-size:12.5px;color:#444746;line-height:1.4;}
.bs-rat .bs-days{grid-template-columns:1fr;gap:6px;}
/* (the scoring rationale: a row per answer sheet that opens, read in a larger size) */
.bs-rat-d{padding:0;} .bs-rat-d > summary{cursor:pointer;list-style:none;padding:10px 14px;font-size:16px;align-items:center;gap:12px;}
.bs-rat-d > summary::-webkit-details-marker{display:none;} .bs-rat-d > summary::before{content:"▸";color:#5F6368;margin-right:2px;} .bs-rat-d[open] > summary::before{content:"▾";}
.bs-rat-d > summary b{font-size:16px;} .bs-rat-d > summary em{margin-left:auto;font-size:17px;font-weight:800;font-style:normal;} .bs-rat-sum{color:#5F6368;font-size:13.5px;}
.bs-rat-d[open]{padding-bottom:10px;} .bs-rat-d > :not(summary){margin-left:14px;margin-right:14px;}
.bs-rat-d .bs-rat-how{font-size:15px;line-height:1.55;color:#202124;} .bs-rat-d .bs-gr{font-size:15px;padding:7px 0;} .bs-rat-d .bs-gr small{font-size:14px;line-height:1.5;color:#3C4043;}
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
