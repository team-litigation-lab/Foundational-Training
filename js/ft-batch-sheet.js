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
     3. 🛠 Practice Lab: the tools practiced in, the attempts, the last practice, and each tool's attempts · average.
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
// 📊 Weekly Reports: a button of its own beside 📋 Batch Sheet — the same batch, picker and data, showing only the Weekly
// Ranking (the management summary and the marks sheet), which the Batch Sheet no longer carries
const WEEKLY = "weeklyreports";
const weeklyOn = () => state.view === "admin" && state.adminTab === WEEKLY && adminOn() && !meOn();
// 🔗 Drive Links: a button of its own too — the same batch, picker and data, showing only the Drive links (Google Drive's
// connection, the trainees with link issues, ✅ Compliance with 🔗 Link a trainee's files by hand, and 📁 Drive links),
// which the trainer's Batch Sheet no longer carries (a trainee's 📋 My Progress keeps their own)
const LINKSTAB = "drivelinks";
const linksOn = () => state.view === "admin" && state.adminTab === LINKSTAB && adminOn() && !meOn();
const e = v => esc(String(v == null ? "" : v));
// (a link the trainee saved goes into an href only as an http(s) address, escaped: a javascript: one is never a link)
const safeHref = u => /^https?:\/\//i.test(String(u || "").trim()) ? e(String(u).trim()) : "";
const B = {view: (() => { try{ return localStorage.getItem("lsh_bs_view") || "trainee"; }catch(err){ return "trainee"; } })(), auto: [], people: null, loading: false, batch: "", data: null, dataKey: "", dataLoading: false, q: "", recent: 14, fix: null};
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
// one CSV cell, quoted, with a leading = + - @ tab or CR defused so a spreadsheet doesn't run it as a formula
const csvQ = v => { const s = String(v == null ? "" : v); return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`; };
const letter = i => { let s = ""; i++; while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;   // a trainee session is never an admin one
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const ME = "mysheet";
const meOn = () => state.view === ME && isTrainee();
const on = () => (state.view === "admin" && (state.adminTab === TAB || state.adminTab === WEEKLY || state.adminTab === LINKSTAB) && adminOn()) || meOn();
// 🛡 Admin Master Control → 📁 Batches: the batch's tools (✏️ Fix the batch name, 🧹 Sweep inactive accounts, ✎ Fix a date)
// 📊 Weekly Reports: the sheet's ⬇ Download, ↻ Refresh and 🔄 Update all scores, beside the summary's ⬇ Excel (no header strip)
function weeklyActsHtml(){
  if(!weeklyOn()) return "";
  return `<button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.csv()">⬇ Download</button><button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.refresh()">↻ Refresh</button><button class="btn btn-navy btn-sm bs-upd-all" ${B.sync ? "disabled" : ""} onclick="FTBatchSheet.updateAll()">${B.sync ? `⏳ ${e(B.sync.what)}${B.sync.of ? ` ${B.sync.n}/${B.sync.of}` : ""}…` : "🔄 Update all scores"}</button>`;
}
const toolsOn = () => state.view === "admin" && state.adminTab === "batches" && adminOn() && !meOn();
const rerender = () => { if(on() || toolsOn()) render(); };

/* ---------- who is in the batch: everyone who registered, approved or not ---------- */
const statusOf = r => r.rejected ? "" : r.offboarded ? "Offboarded" : r.approved === true ? "Approved" : "Waiting for approval";
async function loadPeople(){
  if(!adminOn()){ B.people = []; return; }   // 🔒 the list of trainees is a trainer's only
  B.loading = true;
  try{
    let list = state.adminData;
    if(!list){ const keys = await sharedList("trainee:"); list = (await sharedGetMany(keys)).filter(Boolean); }
    B.all = list.filter(r => r && r.id);   // (every account, archived too: 👥 Duplicate accounts looks through them)
    // trainees the tidy-up archived on its own (js/ft-admin-tidy.js), not a trainer: offered back with ↩ Bring them back
    B.auto = list.filter(r => r && r.id && r.archived && r.autoArchived && !r.rejected && !r.purgedAt && !r.offboarded)
      .map(r => ({id: r.id, name: r.name || r.id, batch: bLabel(r.batch || ""), key: typeof batchKey === "function" ? batchKey(r) : (r.batch || "")}));   // (key: the tidy-up's own batch key, cleaned)
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
  // (the batch's first day, B + MMDDYY — or a B + DDMMYY one, read as its day: index.html batchStartDate)
  const dt = b => typeof batchStartDate === "function" ? batchStartDate(b) : "";
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
    const own = ["progress:", "skills:", "simresults:", "transcribe:", "lor:", "daycheck:", "drive:", "feedback:", "process:", "assess:"];
    // (🔁 first the scores given on the simulators — the Google Calendar Simulator's scorecard, Ring Channel's graded calls —
    // onto the mock call scorecards nobody scored here, worker.js syncSimScores: so the sheet shows them as soon as it's
    // opened or 🔄 refreshed, not only after the nightly check. Trainers only; 40 trainees a call; a failure only skips it)
    if(state.isAdmin && typeof authFetch === "function")
      for(let i = 0; i < ppl.length; i += 40){ try{ await authFetch("/api/sim-scores/sync", {ids: ppl.slice(i, i + 40).map(p => p.id)}); }catch(err){} }
    const want = [];
    ppl.forEach(p => { own.forEach(k => want.push(k + p.id)); S.forEach(s => want.push(s.key + p.id)); });
    const vals = [];
    vals.push(...await sharedGetMany(want));
    const sh = {}, shv = shared.length ? await sharedGetMany(shared) : [];
    shared.forEach((k, i) => { sh[k] = shv[i] || null; });
    const per = own.length + S.length, rec = {};
    ppl.forEach((p, i) => {
      const at = j => vals[i * per + j] || null, sc = {};
      S.forEach((s, j) => { sc[s.key] = at(own.length + j); });
      if(window.ftW1Override) sc["trackerreview:"] = ftW1Override.comp(sc["trackerreview:"], p.batch);   // W1-OVERRIDE
      if(window.ftDay1) sc["trackerreview:"] = ftDay1.comp(sc["trackerreview:"], p.batch);   // 📅 Day 1 isn't counted
      const snap = at(0), data = (snap && snap.data) || {};
      let score = null;
      try{ score = window.lshProgram ? lshProgram.compute({id: p.id, progress: data["day-progress"] || p.progress, rec: sc, shared: sh, since: p.since}) : null; }catch(err){ score = null; }
      rec[p.id] = {data, savedAt: snap && snap.savedAt, skills: at(1) || {}, sims: at(2) || {}, transcribe: at(3), lor: at(4), daycheck: at(5) || {items: {}}, drive: at(6), feedback: at(7), process: at(8) || {sets: {}}, assess: at(9) || {docs: {}}, src: sc, score};
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
    // 🔁 the Drive links not checked yet (⏳ Pending in the compliance table) or whose last check couldn't sign in to Google
    // (⚠ Can't check: a key or setting fixed since), checked now (worker.js verifyLinks, /api/drive/verify:
    // the system opens each one, as at the end of every shift), one trainee at a time, once a session; then the sheet is read again
    if(adminOn() && !meOn() && !(B.verified || {})[B.batch]){ (B.verified = B.verified || {})[B.batch] = 1; const bb = B.batch;
      const due = ppl.filter(p => { try{ const {L} = linkState(p); return LINKS.some(([k]) => /pending|relinked|unchecked/.test(L[k].st)); }catch(err){ return false; } });
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
        {v: st, f: st === "Waiting for approval" ? "Registered, not approved yet: they are approved on the Main Portal (Master Control → Registrations), and approved here when they open the program from it" : st, cls: st === "Approved" ? "gs-hi" : "gs-mid"},
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
  // (a platform TAM column from before the TAM became shadowing-only doesn't count: js/ft-ranking.js drops it on opening)
  return avgOf(rep.cols.map(c => { const cell = (r.cells || {})[c.id] || {}, raw = num(cell.raw); return raw == null || c.type !== "score" || (c.src === "day:tam" && cell.auto) ? null : Math.max(0, Math.min(5, raw / (num(c.max) || 5) * 5)); }));
}
function compOf(p){ const c = (((B.data.rec[p.id] || {}).src || {})["trackerreview:"] || {}).compliance || {};
  const days = Object.values(c).filter(x => x && typeof x.pct === "number"); return {pct: avgOf(days.map(x => x.pct)), n: days.length}; }
/* 💬 the day-by-day feedback a trainer sends (👥 Trainees & Batches → ✍ Feedback; feedback:<id>.days[lesson]): how many
   lessons have it, the latest one's rating, and in the bar every sent one's rating and summary. Drafts are the trainer's
   own (a trainee never sees one), so only sent feedback counts here, for the trainer and the trainee alike. */
const ratingTone = r => /Strong/i.test(r || "") ? "gs-hi" : /Needs/i.test(r || "") ? "gs-lo" : "gs-mid";
function fbCell(p){
  const days = (((B.data.rec[p.id] || {}).feedback || {}).days) || {};
  const sent = Object.entries(days).filter(([, v]) => v && v.status === "sent").sort((a, b) => String(b[1].sentAt || "").localeCompare(String(a[1].sentAt || "")));
  const drafts = meOn() ? 0 : Object.values(days).filter(v => v && v.status === "draft").length;
  if(!sent.length) return {v: drafts ? `${drafts} draft${drafts === 1 ? "" : "s"}` : "", f: drafts ? `No feedback sent yet · ${drafts} draft${drafts === 1 ? "" : "s"} waiting to be sent (✍ Feedback)` : "No day-by-day feedback sent yet", cls: drafts ? "gs-txt gs-lo" : "gs-txt"};
  const f0 = sent[0][1];
  return {v: `${sent.length} sent · ${f0.rating || "—"}`, cls: "gs-txt " + ratingTone(f0.rating),
    f: sent.map(([l, v]) => `${lessonName(Number(l))}: ${v.rating || "—"}${v.sentAt ? " (" + day(v.sentAt) + ")" : ""}${v.summary ? " — " + String(v.summary).replace(/\s+/g, " ").slice(0, 220) : ""}`).join("  ·  ") + (drafts ? `  ·  ${drafts} draft${drafts === 1 ? "" : "s"} not sent yet` : "")};
}
// (the Scorecard overall in words: the grading systems' average, and the trainer's added points on it, 100% at most)
const ovWhy = sc => window.lshProgram && lshProgram.overallWhy ? lshProgram.overallWhy(sc) : `the average of the grading systems = ${sc.overall}%`;
function scoresTable(){
  const ppl = people(), S = B.data.sources.filter(s => !s.hidden), reps = B.data.reps || [], weeks = reps.map((r, i) => r ? i + 1 : null).filter(Boolean), me = meOn();
  const rows = ppl.map(p => { const sc = (B.data.rec[p.id] || {}).score, comp = compOf(p), ws = weeks.map(w => weekMark(reps[w - 1], p.id)), wavg = avgOf(ws);
    const overall = avgOf([sc && sc.overall, comp.pct, wavg == null ? null : wavg / 5 * 100]); return {p, sc, comp, ws, wavg, overall}; });
  const order = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall);
  order.forEach((r, i) => { r.rank = i && Math.round(order[i - 1].overall) === Math.round(r.overall) ? order[i - 1].rank : i + 1; });
  const extra = ["💬 Trainer feedback (day by day)", "Scorecard overall", "Daily compliance"].concat(me ? [] : ["Weeks average (/5)"], ["Overall %"]);   // (no Rank: the batch is ranked on 📊 Weekly Reports only)
  return {id: "scores", title: "🏅 Scores", note: me ? "Every grade the platform gives you, averaged per grading system, your trainer’s day-by-day feedback (💬: how many sent, the latest rating), your Daily compliance (the end-of-shift check) and your Overall %. Your grades in detail are under the table."
      : "Every grade, averaged per grading system (blank: nothing graded yet), the 💬 day-by-day feedback sent (how many, the latest rating; click it for each one), then the Daily compliance (the end-of-shift check), the weeks' average from 📊 Weekly Ranking, and the Overall % (the average of the three), ranked. Pick a trainee under the table for their grades in detail.",
    head: ["Trainee"].concat(S.map(s => `${s.icon || ""} ${s.label}`.trim()), extra),
    rows: rows.map(r => [{v: r.p.name, f: r.p.name, cls: "gs-name"}].concat(S.map((s, i) => { const x = r.sc && r.sc.rows ? r.sc.rows.find(y => y.s === s) || r.sc.rows[i] : null, a = x ? x.avg : null;
        return {v: pct(a), f: a == null ? `${s.label}: nothing graded yet` : `${s.label}: average of ${x.graded} grade${x.graded === 1 ? "" : "s"} = ${a}%`, cls: "gs-num " + tone(a)}; }),
      [fbCell(r.p), {v: pct(r.sc && r.sc.overall), f: r.sc && r.sc.overall != null ? `Scorecard overall: ${ovWhy(r.sc)}` : "Nothing graded yet", cls: "gs-num " + tone(r.sc && r.sc.overall)},
       {v: pct(r.comp.pct), f: r.comp.pct == null ? "No day checked yet (the check runs at the end of every shift)" : `The average of ${r.comp.n} day${r.comp.n === 1 ? "" : "s"}' compliance = ${Math.round(r.comp.pct)}% (each day in 📤 Daily outputs)`, cls: "gs-num " + tone(r.comp.pct)}]
      .concat(me ? [] : [{v: r.wavg == null ? "" : r.wavg.toFixed(2), f: r.wavg == null ? "No week reported yet (📊 Weekly Ranking)" : `The weeks' final averages (${weeks.map((w, i) => `W${w} ${r.ws[i] == null ? "–" : r.ws[i].toFixed(2)}`).join(", ")}) = ${r.wavg.toFixed(2)}/5`, cls: "gs-num " + tone(r.wavg == null ? null : r.wavg / 5 * 100)}],
        [{v: pct(r.overall), f: r.overall == null ? "Nothing to average yet" : `Overall % = the average of the Scorecard ${pct(r.sc && r.sc.overall) || "–"}, the Daily compliance ${pct(r.comp.pct) || "–"}${me ? "" : ` and the weeks ${r.wavg == null ? "–" : Math.round(r.wavg / 5 * 100) + "%"}`} = ${Math.round(r.overall)}%`, cls: "gs-num gs-calc gs-bold " + tone(r.overall)}],
        [])))};
}
/* 📈 OVERALL PERFORMANCE (📊 Weekly Reports → 📈 Overall Performance): the whole training on one sheet, beside the week-by-week
   reports — a row per trainee, ranked: each week's final average out of 5 (its 📊 Weekly Ranking report; the week open in the
   report as it is now), the weeks' average, the Scorecard overall, the Daily compliance and the Overall % (the average of the
   three, as 🏅 Scores works it out), and the rank by the Overall %. */
function ovWeeks(){
  const reps = B.data.reps || [], s0 = typeof batchStartDate === "function" ? batchStartDate(B.batch) : "", t0 = s0 ? Date.parse(s0 + "T00:00:00Z") : NaN;
  const today = window.FTTrackerRules ? FTTrackerRules.ptDate() : new Date().toISOString().slice(0, 10);
  const now = window.ftWeeks && s0 ? ftWeeks.now(B.batch, today) : isFinite(t0) ? Math.max(1, Math.min(6, Math.floor((Date.parse(today + "T00:00:00Z") - t0) / (7 * 864e5)) + 1)) : 1;
  const last = Math.max(now, ...reps.map((r, i) => r ? i + 1 : 0));
  return Array.from({length: last}, (x, i) => i + 1);
}
// (the week open in 📊 Weekly Ranking, as it is on screen: its averages may be newer than the saved reports read with the sheet)
function liveWeek(){
  try{ const c = window.FTRanking && FTRanking.ctx ? FTRanking.ctx() : null, r = c && c.batch === B.batch && FTRanking.report ? FTRanking.report() : null;
    if(!r) return null; const m = {}; r.ranked.forEach(x => { m[x.id] = x.avg == null ? null : Number(x.avg); }); return {week: c.week, m}; }catch(err){ return null; }
}
function overallTable(){
  const ppl = people(), reps = B.data.reps || [], weeks = ovWeeks(), live = liveWeek();
  const rows = ppl.map(p => { const sc = (B.data.rec[p.id] || {}).score, comp = compOf(p);
    const ws = weeks.map(w => live && live.week === w ? (live.m[p.id] == null ? null : live.m[p.id]) : weekMark(reps[w - 1], p.id)), wavg = avgOf(ws);
    const overall = avgOf([sc && sc.overall, comp.pct, wavg == null ? null : wavg / 5 * 100]); return {p, sc, comp, ws, wavg, overall}; });
  const order = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall);
  order.forEach((r, i) => { r.rank = i && Math.round(order[i - 1].overall) === Math.round(r.overall) ? order[i - 1].rank : i + 1; });
  const sorted = order.concat(rows.filter(r => r.overall == null).sort((a, b) => String(a.p.name).localeCompare(String(b.p.name))));
  const m5 = v => v == null ? null : v / 5 * 100, n2 = v => v == null ? "" : v.toFixed(2);
  return {id: "overall", title: "📈 Overall Performance", note: `${B.batch}: the whole training, a row per trainee, ranked by the Overall %. Each week's final average out of 5 comes from its 📊 Weekly Ranking report (blank: no report for that week yet); the Overall % is the average of the Scorecard overall, the Daily compliance and the weeks' average (as a %). Hover a cell for how it was worked out.`,
    head: ["Trainee", "Rank"].concat(weeks.map(w => `W${w} final average (/5)`), ["Weeks average (/5)", "Scorecard overall", "Daily compliance", "Overall %"]),
    rows: sorted.map(r => [{v: r.p.name, f: r.p.name, cls: "gs-name"}, {v: r.rank == null ? "" : String(r.rank), f: r.rank == null ? "Not ranked: nothing to average yet" : `Rank ${r.rank} of ${order.length}, by the Overall %`, cls: "gs-rank"}]
      .concat(weeks.map((w, i) => ({v: n2(r.ws[i]), f: r.ws[i] == null ? `Week ${w}: ${reps[w - 1] || (live && live.week === w) ? "no score for this trainee in the report yet" : "no 📊 Weekly Ranking report yet"}` : `Week ${w}'s final average (📊 Weekly Ranking) = ${r.ws[i].toFixed(2)}/5`, cls: "gs-num " + tone(m5(r.ws[i]))})),
        [{v: n2(r.wavg), f: r.wavg == null ? "No week reported yet" : `The average of the weeks reported (${weeks.map((w, i) => r.ws[i] == null ? null : `W${w} ${r.ws[i].toFixed(2)}`).filter(Boolean).join(", ")}) = ${r.wavg.toFixed(2)}/5`, cls: "gs-num gs-calc " + tone(m5(r.wavg))},
         {v: pct(r.sc && r.sc.overall), f: r.sc && r.sc.overall != null ? `Scorecard overall: ${ovWhy(r.sc)}` : "Nothing graded yet", cls: "gs-num " + tone(r.sc && r.sc.overall)},
         {v: pct(r.comp.pct), f: r.comp.pct == null ? "No day checked yet (the check runs at the end of every shift)" : `The average of ${r.comp.n} day${r.comp.n === 1 ? "" : "s"}' compliance = ${Math.round(r.comp.pct)}%`, cls: "gs-num " + tone(r.comp.pct)},
         {v: pct(r.overall), f: r.overall == null ? "Nothing to average yet" : `Overall % = the average of the Scorecard ${pct(r.sc && r.sc.overall) || "–"}, the Daily compliance ${pct(r.comp.pct) || "–"} and the weeks ${r.wavg == null ? "–" : Math.round(m5(r.wavg)) + "%"} = ${Math.round(r.overall)}%`, cls: "gs-num gs-calc gs-bold " + tone(r.overall)}]))};
}
/* the Process Questions answer sheets and each one's score as the Scorecard counts it (the trainer's final score, else the
   graded best of its Knowledge Check; Day 1's 📖 Reading Task its own), for 🏅 Score Card's ✍️ Knowledge Checks. Read from
   process:<id> (the trainee's answers and graded attempts) and kcreview:<id> (the trainer's review). */
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
const ALL = "*";
/* a trainee's grades in detail (what 🏅 Scorecards showed on a click): each grading system and every item in it */
function gradesHtml(){
  const ppl = people(); if(!ppl.length || !B.data) return "";
  const id = meOn() ? ppl[0].id : B.gr === ALL ? ALL : (B.gr && ppl.some(p => p.id === B.gr) ? B.gr : ppl[0].id);
  const who = id === ALL ? ppl : ppl.filter(p => p.id === id);
  const one = p => { const sc = (B.data.rec[p.id] || {}).score;
    if(!sc || !sc.rows) return `${who.length > 1 ? `<h5>${e(p.name)}</h5>` : ""}<p class="bs-note">Nothing graded yet.</p>`;
    const sys = sc.rows.filter(r => r.avg != null && !(r.s && r.s.noOverall));
    return `<div class="bs-rat">${who.length > 1 ? `<h5>${e(p.name)}</h5>` : ""}
      <div class="bs-rat-avg">Scorecard overall: <b class="${tone(sc.overall)}">${pct(sc.overall) || "—"}</b>${sys.length ? ` <span>= the average of ${sys.length} grading system${sys.length === 1 ? "" : "s"}: (${sys.map(r => `${r.s.label} ${Math.round(r.avg)}`).join(" + ")}) / ${sys.length}${sc.extra && sc.overallBase != null ? ` = ${sc.overallBase}%, ${sc.extra.points < 0 ? "−" : "+"} ${Math.abs(sc.extra.points)} = ${pct(sc.overall)}` : ""}</span>` : ""}</div>
      <div class="bs-days">${sc.rows.filter(r => r.items && r.items.length && !r.s.hidden).map(r => { const g = r.items.filter(it => typeof it.pct === "number");
        return `<div class="bs-day"><div class="bs-day-h"><b>${e(r.s.icon || "")} ${e(r.s.label)}</b><em class="${tone(r.avg)}">${pct(r.avg) || "—"}</em></div>
        ${g.length ? `<p class="bs-rat-how">Average = (${g.map(it => Math.round(it.pct)).join(" + ")}) / ${g.length} = ${pct(r.avg)}${r.s.noOverall ? " · not counted again in the overall" : ""}</p>` : ""}
        ${r.items.map(it => `<div class="bs-gr"><span>${e(it.name)}</span><b class="${tone(it.pct)}">${typeof it.pct === "number" ? pct(it.pct) : "—"}</b>${it.note ? `<small>${e(it.note)}</small>` : ""}</div>`).join("")}</div>`; }).join("")}</div></div>`; };
  return `<div class="bs-ck">${meOn() ? `<h4>🔎 My grades in detail</h4>` : `<label class="bs-ck-who">🔎 Grades in detail for <select onchange="FTBatchSheet.grWho(this.value)"><option value="${ALL}" ${id === ALL ? "selected" : ""}>👥 Every trainee</option>${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>`}
    ${who.map(one).join("")}</div>`;
}
/* ✍️ Knowledge Checks in detail, under 🏅 Score Card: what the ✍️ Knowledge Check page shows the trainer, here too — the
   Process Questions report line (js/ft-process.js FTProcessReport), then each Knowledge Check: its score and how it was scored
   (the trainer's final, else the graded best, the attempts), when it was graded and the graded summary, the trainer's overall
   comment, and every question with the answer, its grade out of 10 with the feedback, and the trainer's comment on it. */
// 📄 the assessments answered on the platform (js/ft-assess.js): the grade (trackerreview:<id>.assess[doc]) and the answers
// (assess:<id>.docs[doc].answers), question by question, as the Knowledge Checks are
function assessRows(p){
  const A = window.FTAssess; if(!A || typeof A.docs !== "function") return [];
  const R = B.data.rec[p.id] || {}, gr = (((R.src || {})["trackerreview:"] || {}).assess) || {}, ans = (R.assess && R.assess.docs) || {};
  return A.docs().map(doc => { const g = gr[doc] || null, a = (ans[doc] || {}).answers || {}, it = (g && g.items) || {};
    const items = A.questions(doc).map(q => { const r = it[q.id] || null;
      return {q: q.q, part: q.part, answer: String(a[q.id] == null ? "" : a[q.id]).trim(), ok: r ? !!r.ok : null, pts: r && r.pts != null ? Number(r.pts) : null,
        max: r && r.max != null ? Number(r.max) : null, pending: !!(r && r.pending), note: r ? String(r.note || "") : ""}; });
    return {doc, title: A.title(doc), g, items, answered: items.some(x => x.answer)}; });
}
function kcRows(p){
  return kcSheets().map(k => { const g = sheetGrade(p, k); return {k, g}; });
}
// (who the breakdown is for: the trainee picked, or every trainee; a trainee: only themself)
function kdPick(){
  const ppl = people(), id = meOn() ? (ppl[0] || {}).id : B.kd === ALL ? ALL : (B.kd && ppl.some(p => p.id === B.kd) ? B.kd : (ppl[0] || {}).id);
  return {ppl, id, who: id === ALL ? ppl : ppl.filter(p => p.id === id)};
}
// (an assessment item with a short answer — a matching letter, a term, a date — sits five to a line, so a long Part I takes
// a few lines instead of a screen; an essay or a long answer keeps the whole width)
const kdShort = it => !it.pending && !/\n/.test(String(it.answer || "")) && String(it.answer || "").length <= 40 && String(it.note || "").length <= 60 && String(it.q || "").length <= 60;
// ✍️ one trainee's Knowledge Checks answer by answer (grade, feedback, the trainer's comments) and their 📄 Assessments item by item:
// on 🏅 Scorecard's breakdown and on the trainee's own page (single: every graded one open)
function kdOneHtml(p, single){
  const fbTone = v => typeof v !== "number" ? "" : v >= 8 ? "gs-hi" : v >= 7 ? "gs-mid" : "gs-lo";
  const one = p => { const rows = kcRows(p), R = B.data.rec[p.id] || {};
    let rep = ""; try{ rep = window.FTProcessReport ? FTProcessReport(R.process || {sets: {}}, p.batch || B.batch) : ""; }catch(err){}
    // (no "COMPLETE" on the band: it heads the Knowledge Checks; what is missing or partial still follows it)
    rep = String(rep || "").replace(/^Process Questions Responses: COMPLETE(; however, )?/, (m, h) => "Process Questions Responses" + (h ? ": " : ""));
    // (one trainee's page: no name over it, their name heads the page already)
    // (no "Knowledge Checks average · N of M graded" line, as the trainer asked: each check's own score follows; every trainee's view keeps the name)
    return `<div class="bs-kd-p">${!single ? `<h5>${e(p.name)}</h5>` : ""}
      ${rep ? `<pre class="bs-kd-rep">✍️ ${e(rep)}</pre>` : ""}
      ${rows.map(({k, g}) => { const last = g.last, rv = g.rv || {}, its = g.items, sc = its.filter(it => typeof it.score === "number");
        // (one trainee: every graded sheet open; every trainee: shut, a click opens one)
        return `<details class="bs-kd" name="bs-kd"><summary><b>${e(k.title)}</b> <span class="bs-kd-pill ${tone(g.pct)}">${g.pct != null ? g.pct + "%" : e(g.how)}</span>
            ${g.pct != null ? `<small>${e(g.how)}</small>` : ""}${sc.length ? ` <small>· ${sc.length} answer${sc.length === 1 ? "" : "s"} graded: ${sc.reduce((a, it) => a + Number(it.score), 0)}/${sc.length * 10}</small>` : ""}</summary>
          ${last && last.summary ? `<div class="bs-ctx bs-why"><b>🧾 Graded${last.at ? " " + e(when(last.at)) : ""}</b><p>${e(last.summary)}</p></div>` : ""}
          ${rv.comment ? `<div class="bs-ctx bs-best"><b>🧑‍🏫 Trainer’s overall comment</b><p>${e(rv.comment)}</p></div>` : ""}
          ${its.length ? `<ol class="bs-kd-q">${its.map(it => `<li><b>${e(it.q)}</b>
              <div class="bs-kd-a">${it.answer ? e(it.answer).replace(/\n/g, "<br>") : `<span class="bs-ctx-none">(unanswered)</span>`}</div>
              ${typeof it.score === "number" ? `<div class="bs-kd-fb ${fbTone(Number(it.score))}"><b>${e(String(it.score))}/10</b> ${e(it.feedback || "")}</div>` : it.answer && g.subm ? `<div class="bs-kd-fb"><b>—</b> not graded yet</div>` : ""}
              ${it.note ? `<div class="bs-kd-note">🧑‍🏫 ${e(it.note)}</div>` : ""}</li>`).join("")}</ol>` : ""}
        </details>`; }).join("")}
      ${(() => { const as = assessRows(p); if(!as.length) return "";
        return `<h5 class="bs-kd-sub bs-kd-sub-as">📄 Assessments</h5>` + as.map(x => { const g = x.g, pc = g && g.score != null ? numOr(g.pct) : null;
          return `<details class="bs-kd" name="bs-kd"><summary><b>${e(x.title)}</b> <span class="bs-kd-pill ${tone(pc)}">${pc != null ? pc + "%" : x.answered ? "not graded yet" : "not started"}</span>
              ${g ? `<small>${e(String(g.score))}/${e(String(g.max))} points${g.when ? " · graded " + e(g.when) : ""}${g.pending ? " · the trainer grades the essays" : ""}</small>` : ""}</summary>
            ${x.answered || g ? `<ol class="bs-kd-q bs-kd-mix">${x.items.map(it => `<li${kdShort(it) ? ' class="bs-kd-s"' : ""}><b>${e(it.q)}</b> <small>${e(it.part)}</small>
                <div class="bs-kd-a">${it.answer ? e(it.answer).replace(/\n/g, "<br>") : `<span class="bs-ctx-none">(unanswered)</span>`}</div>
                ${it.ok != null || it.pending ? `<div class="bs-kd-fb ${it.pending ? "gs-mid" : it.ok ? "gs-hi" : "gs-lo"}"><b>${it.pending ? "⏳ to the trainer" : (it.ok ? "✓" : "✗") + (it.pts != null ? ` ${it.pts}${it.max != null ? "/" + it.max : ""} pt${it.pts === 1 ? "" : "s"}` : "")}</b> ${e(it.note)}</div>` : ""}</li>`).join("")}</ol>` : ""}
          </details>`; }).join(""); })()}</div>`; };
  return one(p);
}
function kcDetailHtml(){
  if(!people().length || !B.data || !kcSheets().length) return "";
  const {ppl, id, who} = kdPick();
  const one = p => kdOneHtml(p, who.length === 1);
  return `<div class="bs-ck bs-kdw">${meOn() ? `<h4>✍️ My Knowledge Checks & Assessments in detail</h4>` : `<label class="bs-ck-who">✍️ Knowledge Checks & Assessments in detail for <select onchange="FTBatchSheet.kdWho(this.value)"><option value="${ALL}" ${id === ALL ? "selected" : ""}>👥 Every trainee</option>${ppl.map(x => `<option value="${e(x.id)}" ${x.id === id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></label>`}
    <button type="button" class="bs-dl" onclick="FTBatchSheet.kdCsv()" title="Every trainee's Knowledge Checks, answer by answer: the grade, the feedback and the trainer's comments (.csv)">⬇ Download the breakdown</button>
    <p class="bs-note">Each Knowledge Check answer by answer: the grade out of 10 with its feedback, the trainer’s comment on it, the trainer’s overall comment and final score — as on the ✍️ Knowledge Check page.</p>
    ${who.map(one).join("")}</div>`;
}
/* 📅 Day 1–16: Detailed Scores — each training day's deliverables (js/ft-day-activities.js, the Training Guide's list),
   each with its score and the summarized context of that score: 🧾 why it was scored that way, 🔧 what needs to be improved
   and ⭐ what they did best. Read from what the graders already wrote: the trainer's rubric (each criterion's score and remark)
   and comment, a Practice Session's automated checks, the trainer's review and the AI evaluation, a Knowledge Check's graded
   answers (each answer's feedback) and summary, a Monitoring Sheet update's review, and the trainer's day-by-day feedback.
   The table: a column per day, the average of the day's scores; under it, a trainee's days in detail. */
const clip = (v, n = 420) => { const t = String(v || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const num100 = v => v != null && v !== "" && isFinite(Number(v)) ? Math.round(Number(v)) : null;
// 🧑‍🏫 a trainer-scored activity (a mock call, a demo): the rubric's criteria, their 0–5 scores and remarks
// (the Result: Passed / Failed by the score, Redo only when the trainer asked for one — js/ft-rubrics.js ftResult)
const resOf = a => window.ftResult ? ftResult(a) : (a && a.status) || "Not yet";
function trainerCtx(a, title){
  const res = resOf(a), redo = res === "Redo";
  const rb = a.rubric && window.FT_RUBRICS && FT_RUBRICS.list ? FT_RUBRICS.list[a.rubric.key] : null, pct_ = num100(a.score) != null ? num100(a.score) : a.status === "Passed" ? 100 : null;
  const crit = rb && a.rubric ? (rb.criteria || []).map((c, i) => ({n: c.n, s: (a.rubric.scores || [])[i], fb: (a.rubric.feedback || [])[i] || ""})).filter(c => c.s != null && c.s !== "") : [];
  const byS = crit.slice().sort((x, y) => Number(y.s) - Number(x.s));
  const best = byS.filter(c => Number(c.s) >= 4).slice(0, 3).map(c => `${c.n} (${c.s}/5)${c.fb ? ": " + clip(c.fb, 160) : ""}`);
  const low = byS.slice().reverse().filter(c => Number(c.s) < 4).slice(0, 3).map(c => `${c.n} (${c.s}/5)${c.fb ? ": " + clip(c.fb, 160) : ""}`);
  const why = [crit.length ? `The trainer scored ${crit.length} criteria on the ${rb.title} rubric: weighted average ${a.rubric.avg != null ? Number(a.rubric.avg).toFixed(2) : "–"}/5${pct_ != null ? ` = ${pct_}%` : ""}` : pct_ != null ? `The trainer's score: ${pct_}%` : "",
    res !== "Not yet" ? `Result: ${res}${redo ? " (off the scorecards until it is done again)" : ""}` : "", a.comment ? clip(a.comment, 300) : ""].filter(Boolean).join(". ");
  return {name: title, pct: redo ? null : pct_, status: res === "Not yet" ? "" : res, why, best: best.length ? best : (!crit.length && res === "Passed" ? ["Passed with the trainer"] : []),
    improve: low.length ? low : redo ? ["The trainer asked for a redo" + (a.comment ? ": " + clip(a.comment, 200) : "")] : [], by: "🧑‍🏫 Trainer",
    // (each criterion of its scorecard, for the day's table: its own row under the mock call or demo)
    crit: crit.map(c => ({n: c.n, s: Number(c.s), fb: c.fb}))};
}
// ✍️ a lesson's Knowledge Check: the trainer's final score or the graded best, the summary and each answer's feedback
function kcCtx(R, p, l){
  const dp = (R.data || {})["day-progress"] || p.progress || {}, x = dp[l] || {}, rv = (((R.src["kcreview:"] || {}).lessons) || {})[l] || {};
  const g = (((R.process || {}).kc) || {})[l] || null, last = g && g.last, t = num100(rv.score), sc = t != null ? t : typeof x.score === "number" ? x.score : g && typeof g.best === "number" ? g.best : null;
  if(sc == null) return null;
  // (every graded answer, not a sample: 8/10 or more under ⭐, the rest under 🔧 — each with its feedback and the trainer's comment)
  const items = (last && last.items) || [], note = q => (rv.notes || {})[q.sid + "|" + q.i] || "";
  const line = q => `Answer ${q.i != null ? q.i + 1 : "?"} (${q.score}/10): ${clip(q.feedback, 400)}${note(q) ? ` — 🧑‍🏫 ${clip(note(q), 300)}` : ""}`;
  const best = items.filter(q => q.score >= 8).sort((a, b) => (a.i || 0) - (b.i || 0)).map(line);
  const low = items.filter(q => q.score < 8).sort((a, b) => (a.i || 0) - (b.i || 0)).map(line);
  const why = [`${sc}%${t != null ? " (the trainer's final score)" : ""}, ${sc >= 70 ? "passed" : "not passed yet: 70% passes"}${(x.kcAttempts || (g && g.attempts)) ? `, ${x.kcAttempts || g.attempts} attempt${(x.kcAttempts || g.attempts) === 1 ? "" : "s"}` : ""}`,
    items.length ? `${items.length} answers graded: ${items.reduce((a, q) => a + (Number(q.score) || 0), 0)}/${items.length * 10}` : "",
    last && last.summary ? clip(last.summary, 600) : "", rv.comment ? "Trainer: " + clip(rv.comment, 600) : ""].filter(Boolean).join(". ");
  return {name: `✍️ Knowledge Check: ${lessonName(l)}`, pct: sc, status: sc >= 70 ? "Passed" : "Not yet", why, best, improve: low, by: "✍️ Graded"};
}
// 📝 an activity answered on the platform and graded by its 📝 Submit for Grading (the day item's assess: Day 3's Reception
// Listening Activity): its points, each call it got fully right, and each answer the grading marked down, with its note
function assessCtx(R, it){
  const g = assessOf(R, it), o = ovOf(R, "assess:" + it.assess), auto = gradePct(g), sc = o ? numOr(o.pct) : auto; if(sc == null) return null;
  if(!g) return {name: it.t, pct: sc, status: "Trainer's score", why: `Trainer's score ${sc}%${o.note ? ": " + clip(o.note, 300) : ""}`, best: [], improve: [], by: "🧑‍🏫 Trainer"};
  const nm = k => window.FTListen && FTListen.answerName ? FTListen.answerName(it.assess, k) : k, callOf = k => Number((/^c(\d+)_/.exec(k) || [])[1]) || 0;
  // (in the calls' order: the grading keeps the answers in the order it graded them)
  const its = Object.entries(g.items || {}).filter(([, x]) => x).sort((a, b) => callOf(a[0]) - callOf(b[0]));
  const calls = [...new Set(its.map(([k]) => callOf(k)).filter(Boolean))], left = its.filter(([, x]) => x.pending).length;
  const best = calls.filter(n => its.every(([k, x]) => callOf(k) !== n || x.ok)).slice(0, 3).map(n => `${nm("c" + n)}: every answer right`);
  const improve = its.filter(([, x]) => !x.ok && !x.pending).slice(0, 4).map(([k, x]) => `${nm(k)}${x.pts > 0 ? " (partly right)" : ""}${x.note ? ": " + clip(x.note, 200) : ""}`);
  const graded = `${g.score} of ${g.max} points (${auto != null ? auto + "%" : "—"}), graded ${g.when || day(g.at)}${left ? `; ${left} answer${left === 1 ? "" : "s"} left for the trainer to grade` : ""}`;
  const why = o ? `Trainer's score ${sc}% (the grading gave ${graded})${o.note ? ": " + clip(o.note, 300) : ""}` : graded;
  return {name: it.t, pct: sc, status: o ? "Trainer's score" : "Graded", why, best, improve, by: o ? "🧑‍🏫 Trainer" : "📝 Answer Sheet"};
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
// 🗂 the day's scored work by kind, each its own section on a trainee's day: mock calls, demos, Practice Sessions, the
// assessments and graded activities, the Knowledge Checks
function groupOf(it){
  if(it.at === "trainer") return /demo/i.test(it.kind || "") || /demo/i.test(it.t || "") ? "🎓 Demos" : /mock/i.test(it.kind || "") || /mock/i.test(it.t || "") ? "☎ Mock calls" : "🧑‍🏫 With the trainer";
  if(it.at === "session") return "🟢 Practice Sessions";
  if(it.at === "tool" && it.id === "process") return "✍️ Knowledge Checks";
  if(it.assess || it.at === "drive") return "📝 Assessments & activities";
  return "📝 Assessments & activities";
}
function dayDeliverables(p, d){
  const R = B.data.rec[p.id] || {}; R.src = R.src || {};
  const out = [], acts = (((R.src["labreview:"] || {}).acts) || {}), list = dayStatus(p, d), L = lastDayOf();
  const later = k => L[k] != null && L[k] !== d.day ? L[k] : null;
  list.forEach(x => {
    // (W1-OVERRIDE: a Week 1 activity with no score reads Done, with the note)
    const it = x.it, grp = groupOf(it);
    const push = (...os) => out.push(...os.map(o => Object.assign({group: grp}, x.w1 && o.pct == null && !/Done|Passed/.test(o.status || "") ? Object.assign({}, o, {status: "Done", why: ftW1Override.NOTE + (o.why ? ". " + o.why : "")}) : o)));
    const lk = it.at === "trainer" || it.at === "session" ? later(it.at + "|" + it.id) : null;
    if(lk) return;   // (scored on the last day it runs: no "Scored on Day N" line on the days before)
    if(it.at === "trainer" && acts[it.id] && (acts[it.id].status || acts[it.id].score != null)){ push(trainerCtx(acts[it.id], it.t)); return; }
    // (Day 6's Calendar Management Mock Calls practice isn't on the scores: the scored call is the Calendar Management Mock
    // Call with the trainer)
    // (🟢 no Practice Session is on the scores: they are practice; only graded work is — Day 6's Calendar Management Mock
    // Calls practice included, its scored call being the Calendar Management Mock Call with the trainer)
    if(it.at === "session") return;
    if(it.assess){ const c = assessCtx(R, it); if(c){ push(c); return; } }
    if(it.at === "drive"){ const g = gradeByName(R, it); if(g){ push({name: it.t, pct: g.pct, status: "Graded", why: g.how, best: [], improve: [], by: "📝 Graded"}); return; } }
    if(it.at === "tool" && it.id === "process"){ const ls = d.lessons || [], here_ = ls.filter(l => !later("kc|" + l));
      const cs = here_.map(l => kcCtx(R, p, l)).filter(Boolean); if(cs.length){ push(...cs); return; }
      if(ls.length && !here_.length) return; }
    // (only what can carry a grade is listed while it has none — a mock call or demo, a Practice Session, an answer sheet, an
    // assessment, the Process Questions; a reading, a breakout's handouts, the fillable forms, the call listening and the idle
    // time's material aren't graded, so they aren't on the scores)
    if(!(it.at === "trainer" || it.at === "drive" || it.assess || (it.at === "tool" && it.id === "process"))) return;
    push({name: it.t, pct: null, status: x.done ? "Done" : "Not yet", why: x.auto ? x.auto.how : x.manual ? "Ticked done by the trainer" : "Not done yet", best: [], improve: [], by: ""});
  });
  // 📒 the day's Monitoring Sheet update, graded on Submit (js/ft-buffer.js ACTS[…].submit, trackerreview:<id>.items)
  const ACTS = (window.FTBuffer && FTBuffer.ACTS) || {}, items = ((R.src["trackerreview:"] || {}).items) || {};
  const seen = new Set();
  Object.entries(ACTS).filter(([k, a]) => a.submit && Number(k.split(":")[0]) === Number(d.day)).forEach(([, a]) => {
    const key = (a.submit.items || []).join("-"); if(seen.has(key)) return; seen.add(key);
    const r = items[key]; if(!r) return; const g = r.result || {};
    out.push({group: "📒 Monitoring Sheet items", name: `📒 Monitoring Sheet items #${(a.submit.items || []).join(", #")}`, pct: num100(g.score), status: r.onTime ? "On time" : "Late",
      why: [g.score != null ? `${num100(g.score)}% from the review of the entries` : "Submitted", r.onTime ? "on time (before 5:00 PM ET)" : "late (after 5:00 PM ET)", g.context ? clip(g.context, 260) : ""].filter(Boolean).join(", ").replace(/, ([^,]*)$/, ". $1"),
      best: (g.items || []).filter(x => x.found).slice(0, 3).map(x => `#${x.n} ${x.title || ""} is in`), improve: [...(g.redFlags || []), ...(g.improve || [])].slice(0, 4).map(x => clip(x, 200)), by: "📒 Reviewed"});
  });
  // 💬 the trainer's day-by-day feedback on the day's lesson (sent only: a draft is the trainer's own)
  const fb = (((R.feedback || {}).days) || {});
  (d.lessons || []).forEach(l => { const f = fb[l]; if(f && f.status === "sent" && (f.summary || f.rating))
    out.push({group: "💬 Trainer feedback", name: `💬 Trainer's feedback: ${lessonName(l)}`, pct: null, status: f.rating || "", why: clip(f.summary || "", 420), best: [], improve: [], by: "💬 Trainer"}); });
  return out;
}
const dayAvg = xs => avgOf(xs.map(x => x.pct));
function dayScoresTable(){
  const ppl = people(), D = dayList();
  return {id: "dayscores", title: "📅 Day 1–16: Detailed Scores", note: `${meOn() ? "Your" : "Each trainee's"} score for each training day: the average of the day's scored deliverables (mock calls and demos, Knowledge Checks, 📝 Answer Sheets graded on the platform, Monitoring Sheet updates). Click a day for its deliverables. ${meOn() ? "Your days in detail, with why each was scored that way, what to improve and what you did best, are under the table." : "Pick a trainee under the table for each deliverable's score with why it was scored that way, what needs to be improved and what they did best."}`,
    head: ["Trainee", "Average"].concat(D.map(d => `Day ${d.day}`)),
    rows: ppl.map(p => { const per = D.map(d => dayDeliverables(p, d)), avgs = per.map(dayAvg), a = avgOf(avgs);
      return [{v: p.name, f: p.name, cls: "gs-name"}, {v: pct(a), f: a == null ? "No scored deliverable yet" : `The average of the days' scores = ${pct(a)}`, cls: "gs-num gs-calc gs-bold " + tone(a)}]
        .concat(D.map((d, i) => { const xs = per[i], sc = xs.filter(x => x.pct != null), done = xs.filter(x => x.pct != null || /Done|Passed/.test(x.status)).length;
          return {v: avgs[i] != null ? pct(avgs[i]) : done ? `${done}/${xs.length} done` : "", f: `Day ${d.day} · ${d.role}: ` + (xs.length ? xs.map(x => `${x.name.replace(/^\S+\s(?=Knowledge|Monitoring|Trainer)/, "")} ${x.pct != null ? x.pct + "%" : x.status || "—"}`).join(" · ") : "no deliverables")
            + (sc.length ? ` = ${pct(avgs[i])}` : ""), cls: "gs-num " + (avgs[i] != null ? tone(avgs[i]) : done ? "gs-mid" : ""),
            parts: xs.map(x => ({name: x.name, group: x.group || "", crit: x.crit || null, v: x.pct != null ? x.pct + "%" : x.status || "—", tone: x.pct != null ? tone(x.pct) : /Done|Passed|On time/.test(x.status) ? "gs-hi" : /Not yet|Late/.test(x.status) ? "gs-lo" : "", text: x.why || ""}))}; }));
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
// (an approval or rejection made on this platform: the sheet reads its trainees again, so the 👥 Trainees table shows it at once)
["approveTrainee", "rejectTrainee"].forEach(fn => { const was = window[fn]; if(typeof was !== "function") return;
  window[fn] = async function(){ const r = await was.apply(this, arguments); if(on() && adminOn()){ if(typeof state === "object") state.adminData = null; B.dataKey = ""; if(!B.loading) loadPeople(); } return r; }; });
// 📊 the Weekly Ranking (js/ft-ranking.js), below the Day 1–16 scores, for the same batch
function rankingHtml(){
  // 🔒 a trainee: their own Weekly Progress Report, as the trainer shared it with them (rankshare:<id>: only theirs), in the
  // report's own styling — no one else's row, no editing, no ranking sheet
  if(meOn()) return window.FTRankSummary && FTRankSummary.mine ? `<section class="bs-sec bs-rank" id="bs-ranking"><h3 class="bs-h">📊 My Weekly Progress Report</h3>${FTRankSummary.mine(B.me)}</section>` : "";
  // (📊 Weekly Reports: 📅 the week's report, or 📈 Overall Performance — the whole training on one sheet)
  const sw = weeklyOn() ? `<div class="bs-wkswitch" role="tablist"><button role="tab" class="${B.wkTab !== "overall" ? "on" : ""}" onclick="FTBatchSheet.wkTab('week')">📅 Weekly report</button><button role="tab" class="${B.wkTab === "overall" ? "on" : ""}" onclick="FTBatchSheet.wkTab('overall')">📈 Overall Performance</button></div>` : "";
  if(weeklyOn() && B.wkTab === "overall") return sw + sheetHtml(Object.assign(overallTable(), {tools: `<p class="bs-ovtools"><button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.csv('overall')">⬇ Download this sheet (.csv)</button></p>`}), "ov");
  if(!window.FTRanking || !FTRanking.embed) return sw;
  // (📑 the management summary on top, js/ft-ranking-summary.js; the marks sheet under it, folded)
  const sheet = FTRanking.embed(B.batch);
  if(!window.FTRankSummary) return `${sw}<section class="bs-sec bs-rank" id="bs-ranking">${sheet}</section>`;
  // (the marks sheet under the report, always shown: no fold line over it)
  return `${sw}<section class="bs-sec bs-rank" id="bs-ranking">${FTRankSummary.html()}<div class="bs-rank-sheet">${sheet}</div></section>`;
}
/* ============================================================
   🏅 THE SIMPLIFIED SCORECARD: what the Batch Sheet opens on (the facilitator's own sheet)
     • 🏅 Score Card: a group of columns per lesson — ✍️ Knowledge Checks, 🛠 Practice, Classroom & outputs, the Average of
       the three, and the Remarks / Trainer Feedback — a row per trainee.
         ✍️ Knowledge Checks  the lesson's answer sheets (its Knowledge Check, Day 1's Reading Task too), each
                              scored as the trainer's final score, else the graded best;
         🛠 Practice           the graded work of the lesson's days: the tools' grades, the graded answer sheets, and the
                              mock calls and demos the trainer scored (no Practice Sessions: they are practice, not graded);
         Classroom & outputs  the end-of-shift check of the lesson's training days (📤 Daily outputs: the tracker, the
                              Monitoring Sheet, the tests, the outputs, the EOD), each day its date from the Batch ID;
         Remarks              the trainer's day-by-day feedback on the lesson, as sent (its rating; the summary on a click).
     • Compliance and Platform Utilization Monitoring: the six monitored Drive links (a dropdown: pick one, and Correct /
       Wrong says whether the system opened it and it is the right file), how many are correct, and the trainee's progress
       on the platform (lesson decks finished, Knowledge Checks passed, last on the platform).
   📊 Weekly Ranking and 📤 Daily outputs follow; every other table is under ▸ More detail.
   ============================================================ */
// a lesson's training days (FTDays: a day with no lesson of its own is its lesson's, the one before)
function lessonDays(){
  if(B.ld) return B.ld; const m = {}; let last = null;
  dayList().forEach(d => { const ls = (d.lessons || []).length ? d.lessons : last ? [last] : []; if(ls.length) last = ls[ls.length - 1]; ls.forEach(l => (m[l] = m[l] || []).push(d)); });
  return (B.ld = m);
}
// training day n's date: the nth weekday from the batch's first day (its Batch ID, B + MMDDYY)
function dayDate(n){
  // (a B + DDMMYY Batch ID reads as its day: index.html batchStartDate)
  const s0 = typeof batchStartDate === "function" ? batchStartDate(B.batch) : ""; if(!s0) return null;
  let t = Date.parse(`${s0}T12:00:00Z`), k = 0;
  while(true){ const wd = new Date(t).getUTCDay(); if(wd >= 1 && wd <= 5){ k++; if(k >= n) return new Date(t).toISOString().slice(0, 10); } t += 864e5; if(k > 40) return null; }
}
function lessonScore(p, l){
  const R = B.data.rec[p.id] || {}, days = lessonDays()[l] || [];
  // ✍️ the lesson's answer sheets
  const kcs = kcSheets().filter(k => Number(k.l) === Number(l)).map(k => ({k, g: sheetGrade(p, k)})).filter(x => x.g.pct != null);
  const kc = avgOf(kcs.map(x => x.g.pct));
  // 🛠 the scored practice, mock calls and demos of its days (a deliverable on several days counted once)
  const seen = new Set(), prs = [];
  // (an answer sheet graded on the platform has no id, only its assess: Day 3's Reception Listening Activity)
  days.forEach(d => dayStatus(p, d).forEach(x => { const k = kindOf(x.it), once = x.it.at + "|" + (x.it.id || x.it.assess);
    if((k === "practice" || k === "mock") && x.score && !seen.has(once)){ seen.add(once); prs.push({t: x.it.t, pct: x.score.pct}); } }));
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
  const T = {id: "scorecard", title: "🏅 Score Card", note: `${meOn() ? "Your" : "Each trainee's"} scores, lesson by lesson: ✍️ the lesson's Knowledge Checks, 🛠 the graded work of its days (the tools' grades, graded answer sheets, and the mock calls and demos the trainer scored; Practice Sessions are practice, not on the scores), Classroom & outputs (the end-of-shift check of its days), their Average, and the trainer's feedback. Click a cell for how it was worked out. Blank: nothing scored yet.`,
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
            {v: x.fb ? (x.fb.rating || "Sent") : "", f: x.fb ? `${nm} · Trainer: ${x.fb.rating || ""}${x.fb.summary ? " — " + String(x.fb.summary).replace(/\s+/g, " ").slice(0, 400) : ""}` : `${nm}: no feedback sent yet`, cls: "gs-txt " + (x.fb ? ratingTone(x.fb.rating) : "")}]; }));
    })};
  return T;
}
// Compliance and Platform Utilization Monitoring
const LSTAT = {ok: ["✓ Correct", "gs-hi"], trainer: ["✓ Correct", "gs-hi"], bad: ["✗ Wrong", "gs-lo"], fix: ["✗ Wrong", "gs-lo"], pending: ["⏳ Pending", "gs-mid"], relinked: ["⏳ Pending", "gs-mid"], unchecked: ["⚠ Can’t check", "gs-mid"], none: ["— Not linked", ""]};
// a link's mark: ✓ right, else ✗ (what: its pop-up — not checked yet included)
const markOf = x => !x.nf && /^(ok|trainer)$/.test(x.st) ? "✓" : "✗";
const markBtn = (p, k, x) => { const m = markOf(x);
  return m === "✗" ? `<button type="button" class="bs-mk bs-mk-x" onclick="event.stopPropagation();FTBatchSheet.lkPop('${e(p.id)}', '${k}')" title="What is wrong">✗</button>` : `<span class="bs-mk ${m === "✓" ? "bs-mk-ok" : "bs-mk-wait"}">${m}</span>`; };
// a trainee's six links, a cell each: the link's name and its mark
function linkMarks(p){
  let L = {}; try{ L = linkState(p).L; }catch(err){ return ""; }
  return `<div class="bs-lkg">${LINKS.map(([k, l]) => L[k] ? `<div class="bs-lkc"><span>${e(l).replace("/", "/<wbr>")}</span>${markBtn(p, k, L[k])}</div>` : "").join("")}</div>`;
}
// a trainee's lesson decks (kc false) or their lessons' Knowledge Checks (kc true), a cell each like their links: the lesson
// and ✓ (finished / passed) or ✗, with how far they got or their best score so far on a hover
function lessonMarks(p, kc){
  const ls = kc ? kcLessons() : lessons(); if(!ls.length || !B.data) return "";
  const R = B.data.rec[p.id] || {}, dp = (R.data || {})["day-progress"] || p.progress || {};
  return `<div class="bs-lkg bs-lkg-n" style="--n:${ls.length}">${ls.map(d => { const k = deckOf(p, d), x = dp[d.id] || {}, sc = typeof x.score === "number" ? Math.round(x.score) : null;
    const ok = kc ? !!x.done : k.finished;
    const tip = kc ? (ok ? `Passed${sc != null ? " with " + sc + "%" : ""}` : sc != null ? `Not passed yet: ${sc}% so far (70% passes)` : "Not taken yet")
      : ok ? "Finished" : k.seen ? `Not finished: slide ${k.seen} of ${k.total || "?"}` : "Not opened yet";
    return `<div class="bs-lkc" title="${e(lessonName(d.id))}: ${e(tip)}"><span><b>Lesson ${e(d.id)}</b><br>${e(lessonName(d.id))}</span><span class="bs-mk ${ok ? "bs-mk-ok" : "bs-mk-x"}">${ok ? "✓" : "✗"}</span></div>`; }).join("")}</div>`;
}
function complianceTable(){
  const ppl = people();
  // the six links side by side, each its own column (no dropdown to go through): ✓ Correct, ✗ Wrong (why: on a hover or a
  // click, in the formula bar), ⏳ Pending or — Not linked; how many of the six are correct first
  return {id: "compliance", title: "Compliance and Platform Utilization Monitoring", note: `${meOn() ? "Your" : "Each trainee's"} six monitored Drive links side by side — ✓ Correct (the system opened it and it is ${meOn() ? "your" : "their"} own, right file or folder), ✗ Wrong (why: hover over it, or click it), ⏳ Pending (not checked yet) or — Not linked — and progress on the platform.`,
    groups: [{label: "", span: 1}, {label: "Drive Links", span: 2 + LINKS.length}, {label: "Progress", span: 3}],
    head: ["Trainee", "Links correct"].concat(LINKS.map(([, label]) => label), ["Last checked", "Lesson decks", "Knowledge Checks passed", "Last on the platform"]),
    rows: ppl.map(p => { const {L, checked} = linkState(p), okN = LINKS.filter(([q]) => /ok|trainer/.test(L[q].st)).length;
      const R = B.data.rec[p.id] || {}, dp = (R.data || {})["day-progress"] || p.progress || {}, ls = lessons();
      const kl = kcLessons(), decks = ls.filter(d => deckOf(p, d).finished).length, kcs = kl.filter(d => (dp[d.id] || {}).done).length, last = p.lastActive;
      const linkCol = k => { const x = L[k], st = x.nf ? ["✗ Not in Drive", "gs-lo"] : x.st === "none" ? ["— Not linked", "gs-lo"] : LSTAT[x.st] || ["—", ""], m = markOf(x);
        // (🔎 not in their Drive: the batch's Drive was searched and has no such file with their name — worker.js autoLinkBatch)
        const f = `${x.label}: ${x.link ? x.link + " · " : ""}${x.nf ? `not in their Drive: the batch’s Drive was searched${x.nf !== true ? " " + when(x.nf) : ""} and has no ${x.label} with their name. They need to make it from the template and link it${x.c && x.c.err ? ` (the check said: ${x.c.err})` : ""}` : x.st === "none" ? "not linked yet" : x.c && x.c.err ? x.c.err : st[0]}`;
        return {v: m, f, tip: f, csv: st[0], html: markBtn(p, k, x), cls: "bs-lesson bs-lk " + st[1]}; };
      return [{v: p.name, f: p.name, cls: "gs-name"},
        {v: `${okN} / ${LINKS.length}`, f: LINKS.map(([q]) => `${L[q].label}: ${(LSTAT[L[q].st] || ["— Not linked"])[0]}`).join(" · "), cls: "gs-num gs-bold " + (okN === LINKS.length ? "gs-hi" : okN ? "gs-mid" : "gs-lo")}]
        .concat(LINKS.map(([k]) => linkCol(k)), [
        {v: checked ? when(checked) : "Not yet", f: checked ? `Links last checked ${checked.toLocaleString()} (${ago(checked)})` : "Not checked yet: the check runs at the end of every shift", cls: checked ? "" : "gs-lo"},
        {v: `${decks} / ${ls.length}`, f: `${decks} of the ${ls.length} lesson decks finished`, cls: "gs-num"},
        {v: `${kcs} / ${kl.length}`, f: `${kcs} of the ${kl.length} lessons' Knowledge Checks passed (${kl.map(d => "Lesson " + d.id).join(", ")})`, cls: "gs-num"},
        {v: last ? ago(last) : "Not yet", f: last ? when(last) : "Not on the platform yet", cls: last ? "" : "gs-lo"}]);
    })};
}
// a table with a row of grouped headings over its own (the lessons over their five columns; the compliance table's six
// Drive links); a cell with a tip shows it on a hover (a Drive link's why)
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
/* 🔗 A TRAINER LINKS A TRAINEE'S FILES (under ✅ Compliance): pick a trainee, paste or change any of their six Drive links and
   💾 Save — written to drive:<id> as the trainee's own would be (linkedBy: "trainer"), then checked at once (/api/drive/verify).
   For a file the automatic search couldn't find or tell apart. */
/* ✍ A TRAINER'S OWN EOD SCORE, and 📘 THE TAM FOR A SHADOWING ACTIVITY (under ✅ Compliance):
     • ✍ EOD by hand — for a day the EOD monitoring missed or ran before it was set up: the trainee, the day, a score (0–100)
       and a note; the day's compliance is worked out again (worker.js /api/eod/grade). An empty score takes it off.
     • 📘 Grade the TAM — the TAM isn't a daily part: when there is a shadowing activity, the trainer reads it here
       (worker.js /api/drive/tam), and it shows its dated entries. */
// today, as the platform's days run (Pacific time, js/ft-tracker-rules.js TZ), for the trainer's date fields
const ptToday = () => { try{ return new Intl.DateTimeFormat("en-CA", {timeZone: (window.FTTrackerRules || {}).TZ || "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date()); }catch(err){ return new Date().toISOString().slice(0, 10); } };
const isWeekdayIso = iso => { const d = new Date(iso + "T12:00:00Z").getUTCDay(); return d >= 1 && d <= 5; };
function trainerToolsHtml(){
  if(!adminOn() || meOn() || !B.data) return "";
  const ppl = people(); if(!ppl.length) return "";
  const id = B.tt && ppl.some(p => p.id === B.tt) ? B.tt : (ptCur(ppl) || ppl[0]).id, R = B.data.rec[id] || {}, rv = (R.src || {})["trackerreview:"] || {};
  const today = ptToday(), t = rv.tam, TD = B.ttD || {}, tg = rv.tamGrades || {};
  const tamOut = B.tamBusy ? "Reading the TAM…" : t && t.error ? "✗ " + t.error : Object.keys(tg).length
    ? "Graded: " + Object.entries(tg).sort().slice(-6).map(([d, x]) => `${d} ${x.pct}% (${x.words} words)`).join(" · ") : "No shadowing day graded yet.";
  const bt = B.btOut && B.btOut.id === id ? B.btOut : null;
  return `<details class="bs-le bs-tt" ${B.ttOpen ? "open" : ""} ontoggle="FTBatchSheet.ttOpen(this.open)"><summary>⏪ Backtrack a trainee · ↺ Knowledge Check retry · ✍ EOD score by hand · 📘 Grade the TAM (shadowing)</summary>
    <label class="bs-ck-who">Trainee <select onchange="FTBatchSheet.ttWho(this.value)">${ppl.map(p => `<option value="${e(p.id)}" ${p.id === id ? "selected" : ""}>${e(p.name)}</option>`).join("")}</select></label>
    <div class="bs-tt-row"><b>⏪ Backtrack</b> <button class="btn btn-ghost btn-sm" type="button" ${B.btBusy ? "disabled" : ""} onclick="FTBatchSheet.backtrack('${e(id)}')">${B.btBusy ? "Backtracking…" : "⏪ Backtrack this trainee from Day 1"}</button>
      <span class="bs-note">${bt ? e(bt.text) : "Reads their Task Tracker, Monitoring Sheet and test screenshots again for every training day since the batch started, and works each day out again (a day’s trainer score and comment are kept)."}</span></div>
    <p class="bs-note">The daily check runs at the end of every shift (and 🔄 Update runs today’s now); backtrack one trainee when their days need catching up — files linked late, a file fixed after the fact.</p>
    ${window.FTKCRetry ? `<div class="bs-tt-row"><b>↺ Knowledge Check</b> <select id="bsKcL" onchange="FTBatchSheet.ttKeep('kl', this.value)">${FTKCRetry.lessons().flatMap(x => [`<option value="${x.l}|0" ${TD.kl === x.l + "|0" ? "selected" : ""}>Lesson ${x.l}: ${e(x.title)}</option>`].concat(x.read ? [`<option value="${x.l}|1" ${TD.kl === x.l + "|1" ? "selected" : ""}>Lesson ${x.l}: Reading Task</option>`] : [])).join("")}</select>
      <input type="text" id="bsKcWhy" maxlength="300" placeholder="The technical problem (e.g. the connection dropped while grading)" style="flex:1;min-width:220px" value="${e(TD.kw || "")}" oninput="FTBatchSheet.ttKeep('kw', this.value)">
      <button class="btn btn-ghost btn-sm" type="button" ${B.kcBusy ? "disabled" : ""} onclick="FTBatchSheet.kcRetry('${e(id)}')">${B.kcBusy ? "Granting…" : "↺ Grant one more attempt"}</button></div>
    <p class="bs-note">A Knowledge Check (and its Reading Task) is taken once. For a system issue, grant one more attempt here, with the reason: it is kept with the trainee's record (also on ✍️ Knowledge Check, in the trainee's row).</p>` : ""}
    <div class="bs-tt-row"><b>✍ EOD</b> <input type="date" id="bsEodD" value="${e(TD.d || B.ttDay || today)}" max="${today}" oninput="FTBatchSheet.ttKeep('d', this.value)"> <input type="number" id="bsEodS" min="0" max="100" placeholder="Score %" style="width:90px" value="${e(TD.s || "")}" oninput="FTBatchSheet.ttKeep('s', this.value)">
      <input type="text" id="bsEodN" placeholder="Note (optional)" style="flex:1;min-width:160px" value="${e(TD.n || "")}" oninput="FTBatchSheet.ttKeep('n', this.value)"> <button class="btn btn-navy btn-sm" type="button" onclick="FTBatchSheet.eodGrade('${e(id)}')">💾 Save the EOD score</button></div>
    <p class="bs-note">For a day the EOD monitoring missed, or before it was set up. It replaces the automatic check for that day; an empty score takes it off.</p>
    <div class="bs-tt-row"><b>📘 TAM</b> <input type="date" id="bsTamD" value="${e(TD.t || today)}" max="${today}" oninput="FTBatchSheet.ttKeep('t', this.value)"> <button class="btn btn-ghost btn-sm" type="button" ${B.tamBusy ? "disabled" : ""} onclick="FTBatchSheet.tamGrade('${e(id)}')">📘 Grade the TAM for this shadowing day</button> <span class="bs-note">${e(tamOut)}</span></div>
    <p class="bs-note">The TAM is only for shadowing: it isn’t scored every day. On a day with a shadowing activity, grade it here: the day’s TAM entry (15 words or more in full, shorter half, none 0) counts in that day’s compliance.</p></details>`;
}
function linksEditHtml(){
  if(!adminOn() || meOn() || !B.data) return "";
  const ppl = people(); if(!ppl.length) return "";
  const id = B.le && ppl.some(p => p.id === B.le) ? B.le : ppl[0].id, dv = (B.data.rec[id] || {}).drive || {}, L = (() => { try{ return linkState(ppl.find(p => p.id === id)).L; }catch(err){ return {}; } })();
  const mark = k => { const x = L[k] || {}; return (LSTAT[x.st] || ["", ""])[0]; };
  // (opened from 🔗 Link files by hand on the blue bar, and drawn right under it)
  if(!B.leOpen) return "";
  return `<div class="bs-le card"><div class="bs-le-h"><b>🔗 Link a trainee’s files by hand</b><button type="button" class="btn btn-ghost btn-sm" onclick="FTBatchSheet.leOpen(false)">✕ Close</button></div>
    <label class="bs-ck-who">Trainee <select onchange="FTBatchSheet.leWho(this.value)">${ppl.map(p => `<option value="${e(p.id)}" ${p.id === id ? "selected" : ""}>${e(p.name)}</option>`).join("")}</select></label>
    <p class="bs-note">Paste each file’s or folder’s own link (open it in Drive and copy the address). 🔄 Update on ✅ Compliance finds most of them by itself; use this for any it couldn’t.</p>
    <div class="bs-le-rows">${LINKS.map(([k, label]) => `<label class="bs-le-row"><span>${e(label)}</span><input type="url" data-k="${k}" value="${e(dv[k] || "")}" placeholder="https://${/folder|typing|spelling/.test(k) ? "drive.google.com/drive/folders/…" : "docs.google.com/…"}"><small>${e(mark(k))}${(dv.auto || {})[k] ? " · found automatically" : dv.linkedBy === "trainer" && dv[k] ? " · set by a trainer" : ""}</small></label>`).join("")}</div>
    <div class="fp-actions"><button class="btn btn-navy btn-sm" type="button" ${B.leBusy ? "disabled" : ""} onclick="FTBatchSheet.leSave('${e(id)}', this)">${B.leBusy ? "Saving…" : "💾 Save and check"}</button></div></div>`;
}
// 🔄 a section's own Update (FTBatchSheet.sync): the trainer's, and its progress while it runs
const SYNC_OF = {scorecard: "scores", compliance: "links", outputs: "outputs", ranking: "ranking"};
function updBtn(id){
  const sc = SYNC_OF[id]; if(!sc || !adminOn() || meOn()) return "";
  const S = B.sync, mine = S && (S.scope === sc || S.scope === "all");
  return `<button type="button" class="bs-upd" ${S ? "disabled" : ""} onclick="FTBatchSheet.sync('${sc}')" title="${e({scores: "Run today's check for every trainee now (Monitoring Sheet, Task Tracker, Typing & Spelling, EOD) and read the scores again", links: "Find and link every trainee's Drive files, then check every trainee's links", outputs: "Run today's check for every trainee now (Monitoring Sheet, Task Tracker, Typing & Spelling, EOD)", ranking: "Read the Weekly Ranking again"}[sc])}">${mine ? `⏳ ${e(S.what)}${S.of ? ` ${S.n}/${S.of}` : ""}…` : "🔄 Update"}</button>`;
}
function groupedSheetHtml(T, ti){
  const n = T.head.length, empty = !T.rows.length, F = foldOf(T.id);
  // each column's group, and whether it is folded away (a folded group keeps one column: T.keep, else its first)
  const gOf = [], foldable = g => !!g.label && g.span > 1;
  T.groups.forEach((g, gi) => { for(let k = 0; k < g.span; k++) gOf.push([gi, k]); });
  const gone = ci => { const [gi, k] = gOf[ci] || []; return gi != null && foldable(T.groups[gi]) && F.g.includes(gi) && k !== (T.keep != null && T.keep >= 0 ? T.keep : 0); };
  const fc = ci => gone(ci) ? " gs-fold" : "";
  const cell = (c, ri, ci) => `<td tabindex="0" class="${c.cls || ""}${ci === 0 ? " gs-frz" : ""}${fc(ci)}"${c.tip || c.f ? ` title="${e(c.tip || c.f)}"` : ""} data-t="${ti}" data-r="${ri}" data-c="${ci}" onclick="FTBatchSheet.pick(this)" onfocus="FTBatchSheet.pick(this)">${c.html != null ? c.html : e(c.v)}</td>`;
  const folds = T.groups.map((g, gi) => foldable(g) ? gi : -1).filter(gi => gi >= 0), allIn = folds.length && folds.every(gi => F.g.includes(gi));
  const tid = e(T.id);
  const head = `<h3 class="bs-h"><button type="button" class="bs-fold-sec" onclick="FTBatchSheet.hideSec('${tid}')" aria-expanded="${!F.hide}" title="${F.hide ? "Show" : "Hide"} this table">${F.hide ? "▸" : "▾"}</button> ${e(T.title)} <span>${T.rows.length} row${T.rows.length === 1 ? "" : "s"}</span>
    ${!F.hide && folds.length > 1 ? `<button type="button" class="bs-fold-all" onclick="FTBatchSheet.foldAll('${tid}', ${allIn ? "false" : "true"})">${allIn ? "▸◂ Expand all" : "◂▸ Collapse all"}</button>` : ""}</h3>`;
  if(F.hide) return `<section class="bs-sec bs-sc bs-hidden" id="bs-${T.id}">${head}</section>`;
  let col = 0;
  return `<section class="bs-sec bs-sc" id="bs-${T.id}">${head}${T.id === "scorecard" ? "" : `<p class="bs-note">${e(T.note)}${folds.length ? " Click a heading's ▾ to fold its columns away." : ""}</p>`}
    <div class="gs-wrap bs-wrap"><table class="gs" role="grid"><thead>
      <tr class="gs-letters"><th class="gs-corner"></th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}${fc(i)}">${letter(i)}</th>`).join("")}</tr>
      <tr class="gs-group"><th class="gs-rn"></th>${T.groups.map((g, gi) => { const c0 = col; col += g.span; const shut = foldable(g) && F.g.includes(gi);
        const lab = foldable(g) ? `<button type="button" class="bs-fold-g" onclick="FTBatchSheet.fold('${tid}', ${gi})" aria-expanded="${!shut}" title="${shut ? "Show all of its columns" : "Fold it to " + e(T.head[c0 + (T.keep != null && T.keep >= 0 ? T.keep : 0)]) + " alone"}">${shut ? "▸" : "▾"} ${e(g.label)}</button>` : e(g.label);
        return `<th colspan="${shut ? 1 : g.span}" class="${c0 === 0 ? "gs-frz" : ""}${gi % 2 ? " gs-g2" : ""}${shut ? " gs-shut" : ""}">${lab}</th>`; }).join("")}</tr>
      <tr class="gs-head"><th class="gs-rn">1</th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}${fc(i)}">${e(h)}</th>`).join("")}</tr></thead>
      <tbody>${T.rows.map((r, ri) => `<tr><th class="gs-rn">${ri + 2}</th>${r.map((c, ci) => cell(c, ri, ci)).join("")}</tr>`).join("")}
      ${empty ? `<tr class="gs-empty"><th class="gs-rn">2</th><td colspan="${n}" class="bs-none">No trainee in this batch yet.</td></tr>` : ""}</tbody></table></div></section>`;
}
/* 🔌 Google Drive's connection (worker.js /api/drive/status), above the Drive links: ✓ connected as who, or which setting to
   fix, in plain words from Google's own reason — so a link left ⏳ Pending says why, not nothing */
function driveWhy(d){
  const x = String(d || "");
  if(/unauthorized_client/i.test(x)) return "domain-wide delegation isn’t authorized for this service account. In admin.google.com → Security → Access and data control → API controls → Manage Domain Wide Delegation, add the service account’s Client ID (its Unique ID in Google Cloud, not its email) with the scope https://www.googleapis.com/auth/drive";
  if(/invalid_grant/i.test(x) && /email|user/i.test(x)) return "GDRIVE_SA_SUBJECT isn’t a user of your Google Workspace: check its spelling (a Workspace account, not a group or a Gmail address)";
  if(/invalid_grant/i.test(x)) return "Google refused the service account’s key: GDRIVE_SA_EMAIL and GDRIVE_SA_KEY must come from the same, current JSON key file";
  if(/GDRIVE_SA_KEY isn/i.test(x)) return x;
  if(/aren.t set/i.test(x)) return "Google Drive isn’t connected: GDRIVE_SA_EMAIL and GDRIVE_SA_KEY aren’t set on the Worker";
  if(/invalid_client|deleted|disabled/i.test(x)) return "the service account or its key is disabled or deleted in Google Cloud: make a new JSON key and update GDRIVE_SA_KEY";
  return x || "Google Drive didn’t answer";
}
function driveBanner(){
  if(!adminOn() || meOn()) return "";
  const S = B.dstat;
  if(S === undefined){ B.dstat = null; authFetch("/api/drive/status", {}).then(r => r.json()).then(j => { B.dstat = j && typeof j === "object" ? j : {err: true}; rerender(); }).catch(() => { B.dstat = {err: true}; rerender(); }); return ""; }
  if(!S || S.err) return "";
  const box = (cls, html) => `<div class="bs-warn bs-dstat ${cls}">${html} <button class="btn btn-ghost btn-sm" type="button" ${B.dtest ? "disabled" : ""} onclick="FTBatchSheet.dstat()">${B.dtest ? e(B.dtest) : "🔁 Test again"}</button></div>`;
  if(!S.sa) return box("bad", `🔌 <b>Google Drive isn’t connected.</b> Add <code>GDRIVE_SA_EMAIL</code> and <code>GDRIVE_SA_KEY</code> to the Worker (Cloudflare → foundational-training → Settings → Variables and Secrets), then Deploy. Until then no link can be checked.`);
  if(!S.saOk) return box("bad", `🔌 <b>The service account can’t sign in to Google:</b> ${e(driveWhy(S.saDetail))}.`);
  if(S.subject && !S.subjectOk) return box("bad", `🔌 <b>Reading as ${e(S.subject)} doesn’t work:</b> ${e(driveWhy(S.subjectDetail))}. Meanwhile the platform works as the service account ${e(S.email)}: it reads and checks the files shared with it (trainees are told to share with that address), and saves PDFs only into folders on a Shared Drive it is a member of (elsewhere trainees use ⬇ Download PDF).
    <div class="bs-dstat-id">The Worker signs in as <code>${e(S.email)}</code>${S.clientId ? `, Client ID <code>${e(S.clientId)}</code>: this exact number has to be in the Domain-wide delegation list, with the scope <code>https://www.googleapis.com/auth/drive</code>` : ""}.<br><small>Google said: ${e(S.subjectDetail || "")}</small></div>`);
  return box("ok", `🔌 ✓ <b>Google Drive is connected</b>${S.subject ? ` and reads as <b>${e(S.subject)}</b>` : ` as the service account <b>${e(S.email)}</b> (files must be shared with it)`}.`);
}
/* 📁 ONE SHARE PER BATCH: each batch's files sit in a folder of its own, so when the system can't open the links of a batch's
   trainees (✗ "can't open it": not shared with the account it reads as), the Batch Sheet says so once for the batch, with the
   address to share its folder with (📋 Copy): one share of the batch folder, as Editor, covers every trainee in it. 🔁 Check
   them now opens each trainee's links again (worker.js /api/drive/verify). It goes away once the links open. */
/* 🔗 EVERY TRAINEE WITH A LINK ISSUE, said exactly: each of their six Drive links that isn't right — not linked, not in their
   Drive, can't be opened, not theirs, misnamed, the wrong kind — with why and the trainer's fixes there (↗ Open, ✓ Mark as
   opening, ✎ Re-link). It follows the VA's fixes by itself: while the sheet is open, the flagged trainees' files are looked for
   and their links checked again every few minutes (autoLinkBatch, then /api/drive/verify for them alone), so a link the VA has
   fixed drops off the list without anyone pressing a button. When most of the batch can't be opened at all, it says the batch
   folder isn't shared yet, with the address to share it with. */
const ISSUE_ST = /^(bad|fix|none|unchecked)$/;
function linkIssues(p){
  let L = {}; try{ L = linkState(p).L; }catch(err){ return []; }
  return LINKS.filter(([k]) => L[k] && ISSUE_ST.test(L[k].st)).map(([k, l]) => ({k, l, x: L[k]}));
}
// what is wrong with one link, in a few words (the check's full message is on a hover)
const FILE_IN = /\(("[^"]+")\)|its name is ("[^"]+")/;
function issueWhy(p, it){
  const x = it.x, err = String((x.c || {}).err || ""), file = (err.match(FILE_IN) || []).slice(1).find(Boolean) || "";
  const f = file ? ` “${e(file.replace(/^"|"$/g, ""))}”` : "";
  if(x.nf) return "Not in their Drive";
  if(x.st === "none") return "Not linked";
  if(x.st === "unchecked") return "Couldn’t check it";
  if(x.st === "pending" || x.st === "relinked") return "Not checked yet: it is checked on 🔁 Check them now and at the end of the shift";
  if(x.st === "bad" && ACCESS(err)) return /not.?found|404/i.test(String((x.c || {}).why || "")) ? "Can’t open it: not shared, or the file is gone" : "Can’t open it: not shared";
  let m;
  if(/blank template/i.test(err)) return "Blank template, not their copy";
  if((m = err.match(/This is batch (B\d{6})/i))) return `Batch ${e(m[1].toUpperCase())}’s file, not theirs`;
  if((m = err.match(/^This is (.+?)'s /))) return `${e(m[1])}’s file, not theirs`;
  if((m = err.match(/same link as your (.+?)\./i))) return `Same file as their ${e(m[1])}`;
  if(/already linked this folder/i.test(err)) return "Another trainee linked it";
  if(/isn't yours/i.test(err)) return `Not named for them:${f}`;
  if(/needs your Batch ID/i.test(err)) return `No Batch ID in the name:${f}`;
  if(/isn't your /i.test(err)) return `Wrong file:${f}`;
  if(/busy|didn.t answer/i.test(err)) return "Drive didn’t answer: check again";
  return e((err || "The system can’t open it").split(/\.\s/)[0].replace(/\.$/, ""));
}
function autoRecheck(flagged){
  // (at most every 5 minutes, never while an update runs; the sheet is read again once it's done)
  // (the first a minute after the batch was opened — not while the trainer is just arriving, or the sheet updates itself on opening)
  const now = Date.now(); if(B.autoChkFor !== B.batch){ B.autoChkFor = B.batch; B.autoChkSince = now; B.autoChkAt = 0; }
  if(!flagged.length || B.sync || B.autoChk || now - (B.autoChkSince || now) < 60e3 || now - (B.autoChkAt || 0) < 5 * 60e3) return;
  B.autoChk = true; B.autoChkAt = now; const batch = B.batch;
  (async () => {
    try{ await authFetch("/api/drive/autolink", {batch}); }catch(err){}
    for(const p of flagged){ if(B.batch !== batch) break; try{ await authFetch("/api/drive/verify", {id: p.id}); }catch(err){} }
    B.autoChk = false; if(B.batch === batch && !B.sync){ B.data = null; B.dataKey = ""; render(); }
  })();
}
function shareBanner(){
  if(!adminOn() || meOn() || !B.data) return "";
  const S = B.dstat; if(!S || S.err || !S.sa || !S.saOk) return "";   // (not connected: the 🔌 banner above says what to fix)
  const who = S.subject && S.subjectOk ? S.subject : S.email; if(!who) return "";
  const ppl = people(), withIssues = ppl.map(p => ({p, its: linkIssues(p)})).filter(r => r.its.length);
  if(!withIssues.length) return "";
  autoRecheck(withIssues.filter(r => r.its.some(it => it.x.st !== "none" || it.x.nf)).map(r => r.p));
  const access = withIssues.filter(r => r.its.some(it => it.x.st === "bad" && ACCESS((it.x.c || {}).err)));
  const opens = ppl.filter(p => (() => { try{ const {L} = linkState(p); return LINKS.some(([k]) => /ok|trainer/.test(L[k].st)); }catch(err){ return false; } })()).length;
  const fixes = (p, it) => `<div class="bs-li-acts">${safeHref(it.x.link) ? `<a class="btn btn-ghost btn-sm" href="${safeHref(it.x.link)}" target="_blank" rel="noopener" title="Open the file they linked">↗ Open</a>` : "<span></span>"}${it.x.link ? `<button class="btn btn-ghost btn-sm" type="button" onclick="FTBatchSheet.lkMark('${e(p.id)}', '${it.k}', true)" title="It opens for you and it is the right file: mark it ✓ (a trainer's override, for this link)">✓ Mark OK</button>` : "<span></span>"}<button class="btn btn-ghost btn-sm" type="button" onclick="FTBatchSheet.leWho('${e(p.id)}'); setTimeout(() => { const d = document.querySelector('.bs-le'); if(d) d.scrollIntoView({behavior: 'smooth', block: 'center'}); }, 300)">✎ ${it.x.link ? "Re-link" : "Link"}</button></div>`;
  // (the same problem on several links that aren't linked at all — nothing in their Drive yet — is one row, not one per link)
  const rowsOf = (p, its) => {
    const why = its.map(it => issueWhy(p, it)), same = its.length > 1 && its.every((it, i) => !it.x.link && why[i] === why[0]);
    const at = it => it.x.nf && it.x.nf !== true ? it.x.nf : (it.x.c || {}).at || "";
    const tip = it => { const c = it.x.c || {}; return it.x.nf ? "The batch’s Drive was searched and has no such file with their name: they need to make it from the template and link it." : [c.err, c.why ? "Google: " + c.why : ""].filter(Boolean).join(" "); };
    if(same) return [{its, l: its.length === LINKS.length ? `All ${LINKS.length} links` : its.map(it => e(it.l)).join("<br>"), why: why[0], tip: tip(its[0]), at: at(its[0]), act: fixes(p, its[0])}];
    return its.map((it, i) => ({its: [it], l: e(it.l), why: why[i], tip: tip(it), at: at(it), act: fixes(p, it)}));
  };
  const list = `<table class="bs-li"><thead><tr><th>Trainee</th><th>Right</th><th>Link</th><th>Problem</th><th>Checked</th><th>Fix</th></tr></thead>${withIssues.map(({p, its}) => {
    const rows = rowsOf(p, its);
    return `<tbody class="bs-li-p">${rows.map((r, i) => `<tr>${i ? "" : `<td class="bs-li-who" rowspan="${rows.length}"><b>${e(p.name)}</b><button class="btn btn-ghost btn-sm bs-arch1" type="button" data-id="${e(p.id)}" data-name="${e(p.name)}" onclick="FTBatchSheet.archiveOne(this.dataset.id, this.dataset.name)" title="Archive this account (someone who isn't a trainee, or who left): off the sheet and this list; Admin → Batches brings it back">🗄 Archive</button></td><td class="bs-li-n" rowspan="${rows.length}">${LINKS.length - its.length} of ${LINKS.length}</td>`}<td class="bs-li-l">${r.l}</td><td class="bs-li-why"${r.tip ? ` title="${e(r.tip)}"` : ""}>${r.why}</td><td class="bs-li-at">${r.at ? e(when(r.at)) : "—"}</td><td>${r.act}</td></tr>`).join("")}</tbody>`;
  }).join("")}</table>`;
  const recheck = `<button class="btn btn-navy btn-sm" type="button" ${B.rechecking || B.sync || B.autoChk ? "disabled" : ""} onclick="FTBatchSheet.recheckLinks()" title="Look for their files and open each link again (it also does this by itself every few minutes while this page is open)">${B.rechecking ? `Checking ${B.rechecking}…` : B.autoChk ? "Checking…" : "🔁 Check them now"}</button>`;
  const shareTo = `<div class="bs-li-share">Share ${access.length && opens <= access.length ? "the batch’s folder" : "a file the system can’t open"} with <code id="bsShareTo">${e(who)}</code> <button class="btn btn-ghost btn-sm" type="button" onclick="FTBatchSheet.copyShare()">📋 Copy</button> as <b>Editor</b>.${access.length && opens <= access.length ? " One share covers all its trainees." : ""}</div>`;
  const head = h => `<div class="bs-li-top"><div class="bs-li-h">${h}</div>${recheck}</div>`;
  // (most of the batch can't be opened at all: the batch's folder isn't shared yet — one share covers everyone)
  if(access.length && opens <= access.length) return `<div class="bs-warn bs-share">${head(`📁 <b>Batch ${e(B.batch)}’s files can’t be opened yet</b> · ${access.length} of ${ppl.length} trainees`)}${shareTo}${list}</div>`;
  return `<div class="bs-warn bs-share">${head(`🔗 <b>${withIssues.length} of ${ppl.length} trainee${ppl.length === 1 ? "" : "s"} ${withIssues.length === 1 ? "has" : "have"} Drive link issues</b> · Batch ${e(B.batch)}`)}${access.length ? shareTo : ""}${list}</div>`;
}
// the page: the Score Card and the compliance first, then the Weekly Ranking and the Daily outputs;
// every other table under ▸ More detail; the approvals and batches at the foot
const MAIN = ["scorecard", "compliance", "outputs"];
function sectionsHtml(T){
  const one = (x, i) => x.id === "compliance" ? groupedSheetHtml(x, i).replace(/<\/section>$/, trainerToolsHtml() + "</section>")
    : x.id === "scorecard" ? groupedSheetHtml(x, i).replace(/<\/section>$/, kcDetailHtml() + "</section>")
    : x.id === "dayscores" ? sheetHtml(x, i).replace(/<\/section>$/, dayScoresHtml() + "</section>")
    : x.id === "scores" ? sheetHtml(x, i).replace(/<\/section>$/, gradesHtml() + "</section>")
    : x.id === "recent" ? sheetHtml(x, i).replace('<p class="bs-note">', `<p class="bs-note"><label class="bs-period">Show <select onchange="FTBatchSheet.period(this.value)">${[[1, "today"], [7, "the last 7 days"], [14, "the last 14 days"], [30, "the last 30 days"], [0, "everything"]].map(([v, l]) => `<option value="${v}" ${B.recent === v ? "selected" : ""}>${l}</option>`).join("")}</select></label> `)
    : sheetHtml(x, i);
  const at = id => T.findIndex(x => x.id === id), main = id => one(T[at(id)], at(id));
  const rest = T.map((x, i) => [x, i]).filter(([x]) => !MAIN.includes(x.id));
  // (📊 Weekly Reports: the Weekly Ranking alone; the Batch Sheet without it — a trainee's page keeps their own report)
  if(weeklyOn()) return rankingHtml();
  // (🔗 Drive Links: the Drive links alone)
  // (🔗 Drive Links: the sheet first, Google Drive's connection and the trainees with link issues at the bottom)
  if(linksOn()) return one(T[at("compliance")], at("compliance")).replace(trainerToolsHtml(), "") + driveBanner() + shareBanner();
  // (the trainee's 📋 My Progress: everything as before, their own Drive links and report included)
  if(meOn()) return main("scorecard") + driveBanner() + shareBanner() + main("compliance") + rankingHtml() + main("outputs")
    + `<details class="bs-more" ${B.more ? "open" : ""} ontoggle="FTBatchSheet.more(this.open)"><summary>▸ More detail: ${rest.map(([x]) => e(x.title)).join(" · ")}</summary>${rest.map(([x, i]) => one(x, i)).join("")}</details>`;
  // (the trainer's 📋 Batch Sheet: no Drive links — they are on 🔗 Drive Links —; the trainer's tools under 📤 Daily outputs)
  // 👤 opening on one table per trainee (everything about them in one place); 📋 By table is the sheets side by side
  if(B.view !== "tables") return viewBar() + perTraineeHtml(T) + trainerToolsHtml();
  const restB = rest.filter(([x]) => x.id !== "drive");
  return viewBar() + main("scorecard") + main("outputs") + trainerToolsHtml()
    + `<details class="bs-more" ${B.more ? "open" : ""} ontoggle="FTBatchSheet.more(this.open)"><summary>▸ More detail: ${restB.map(([x]) => e(x.title)).join(" · ")}</summary>${restB.map(([x, i]) => one(x, i)).join("")}</details>`;
}
/* 👤 ONE TABLE PER TRAINEE (the trainer's 📋 Batch Sheet opens on it): every table of the sheet — 🏅 Score Card, 📤 Daily
   outputs day by day, the Day 1–16 scores, 👤 the trainee, 📚 Lessons, 📅 Day by Day, 🛠 Practice, 🏅 Scores, 🕒 Recent progress
   and the compliance's progress (its Drive links are on 🔗 Drive Links) — turned on its side for each trainee: one row per
   measure, its value and how it was worked out (the cell's own explanation). A trainee's card folds; the summary line has
   their Overall %, Scorecard overall and Daily compliance. No rank here: the batch is ranked on 📊 Weekly Reports only. */
const stripTags = h => String(h == null ? "" : h).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
// (no View bar: the Batch Sheet is one trainee per page; FTBatchSheet.view('tables') still lays the sheets side by side)
const viewBar = () => "";
// 🔎 beside Batch: on 📋 Batch Sheet the trainee whose page is open; on 📊 Weekly Reports one trainee's evidence (FTRanking)
function whoTopHtml(ppl){
  if(meOn() || !adminOn() || linksOn() || !ppl.length) return "";
  if(weeklyOn()) return "";   // (📊 Weekly Reports: no trainee picker; ℹ How it's scored has one trainee's evidence)
  if(B.view === "tables") return "";
  const cur = ptCur(ppl);
  return `<label class="bs-who-top">🔎 <select aria-label="Trainee" onchange="FTBatchSheet.ptPick(this.value)">${ppl.map(p => `<option value="${e(p.id)}" ${cur && p.id === cur.id ? "selected" : ""}>${e(p.name)}</option>`).join("")}</select></label>`;
}
// 📄 one trainee per page: the trainee picked with 🔎 beside Batch (kept while the batch stays the same)
function ptCur(ppl){ return ppl.find(p => p.id === B.pt) || ppl[0] || null; }
// a trainee's row of one table (the same order as people(), else by name)
function rowFor(x, p, i, n){ const rs = x.rows || []; return rs.length === n && rs[i] && stripTags(rs[i][0] && rs[i][0].v) === p.name ? rs[i] : rs.find(r => stripTags(r[0] && r[0].v) === p.name) || null; }
/* 🔎 EVERY GRADE, in the trainee's own table: each grading system of the 🏅 Scorecard (js/ft-program.js) with each of its items —
   🛠 the Practice Lab, 🟢 the Practice Sessions, 🎧 Call Listening, 📅 the Calendaring Simulators, Calendaring Activity and
   Calendar checks, ✍️ the Knowledge Checks… — its score and what it says; and the buttons to the screens where a trainer reviews
   them (📅 Calendaring, 🟢 Practice Sessions, 🎧 Call Listening), which have no buttons of their own on top any more. */
const REVIEW = [["calendaring", "📅 Review their calendaring"], ["sessions", "🟢 Review their Practice Sessions"], ["listening", "🎧 Review their Call Listening"]];
/* ✎ EDIT A SCORE (a trainer's, on a trainee's page): 🏅 Grades is gone — 📤 Daily outputs & 📅 Day scores and ✍️ Knowledge
   Checks, Assessments & Activities show every grade — so a trainer's own score goes in here: the grade picked from the list
   (each one the Scorecard lets a trainer set, js/lsh-program.js EDITABLE, by grading system), its % and, on an override, why;
   then + points on the Scorecard overall (extraRowHtml). The fields are the same as before (FTBatchSheet.editRow, editExtra). */
function editBoxHtml(p){
  if(!adminOn() || meOn()) return "";
  const sc = (B.data.rec[p.id] || {}).score, R = B.data.rec[p.id] || {};
  const can = it => !!(window.lshProgram && lshProgram.editable && lshProgram.editable(it.ref));
  const groups = sc && Array.isArray(sc.rows) ? sc.rows.filter(r => r && r.s && !r.s.hidden).map(r => ({s: r.s, items: (r.items || []).filter(can)})).filter(g => g.items.length) : [];
  const all = groups.flatMap(g => g.items);
  B.edSel = B.edSel || {};
  const ref = all.some(it => it.ref === B.edSel[p.id]) ? B.edSel[p.id] : (all[0] || {}).ref;
  const it = all.find(x => x.ref === ref) || null, v = it && typeof it.pct === "number" && isFinite(it.pct) ? Math.round(it.pct) : null;
  const o = it && lshProgram.overridable(it.ref) ? lshProgram.override(R.src, it.ref) : null, why = it ? whyOf(p, R, it) : "";
  const pick = groups.length ? `<select class="bs-ed-pick" aria-label="The grade to edit" onchange="FTBatchSheet.edPick('${e(p.id)}', this.value)">${groups.map(g =>
    `<optgroup label="${e(`${g.s.icon || ""} ${g.s.label}`.trim())}">${g.items.map(x => `<option value="${e(x.ref)}" ${x.ref === ref ? "selected" : ""}>${e(stripTags(x.name))}${typeof x.pct === "number" ? " · " + Math.round(x.pct) + "%" : ""}</option>`).join("")}</optgroup>`).join("")}</select>` : "Nothing to edit yet";
  const row = it ? `<tr class="bs-pt-ed"><td class="bs-pt-m">${pick}</td><td class="bs-pt-v ${e(tone(v))}" title="${e(`${stripTags(it.name)}: ${v != null ? v + "%" : "—"}${why ? " — " + why : ""}`)}"><input class="bs-ed" type="number" min="0" max="100" step="1" inputmode="numeric" value="${v != null ? v : ""}" placeholder="—" aria-label="${e("Score for " + stripTags(it.name))}" data-pid="${e(p.id)}" data-ref="${e(it.ref)}" onchange="FTBatchSheet.editRow(this)"><span class="bs-ed-u">%</span>${it.overridden || edited(R, it) ? ` <small class="bs-ed-mk" aria-label="edited by the trainer">✎</small>` : ""}</td>
    <td class="bs-pt-f">${e(stripTags(it.note || ""))}${lshProgram.overridable(it.ref) ? ` <input class="bs-ed-note" maxlength="600" value="${e(o ? o.note : "")}" placeholder="Why (optional)" aria-label="${e("Why the score for " + stripTags(it.name))}" data-pid="${e(p.id)}" data-ref="${e(it.ref)}" data-note="1" onchange="FTBatchSheet.editRow(this)">` : ""}</td></tr>`
    : `<tr class="bs-pt-ed"><td class="bs-pt-m" colspan="3">${pick}</td></tr>`;
  return `<tr class="bs-pt-sec"><th colspan="3">✎ Edit a score <small>(trainers only)</small></th></tr>${row}${extraRowHtml(p)}`;
}
// (✎ a mock call's or demo's score typed by the trainer, not the scorecard's average)
const edited = (R, it) => /^act:/.test(String(it.ref || "")) && !!(((((R.src || {})["labreview:"] || {}).acts) || {})[String(it.ref).slice(4)] || {}).scoreEdited;
// 💬 what a score rests on, for its hover: the trainer's rubric and comment, the graded answers, the checks — as 📅 Day 1–16
// explains a day's deliverables (trainerCtx, kcCtx, assessCtx) — else the item's own why or note
function whyOf(p, R, it){
  if(it.overridden) return stripTags(it.why || "");
  let w = "";
  try{ const m = /^(kc|act|assess):(.+)$/.exec(String(it.ref || "")), acts = (((R.src || {})["labreview:"] || {}).acts) || {};
    if(m && m[1] === "kc"){ const c = kcCtx(R, p, Number(m[2])); w = c ? c.why : ""; }
    else if(m && m[1] === "act" && acts[m[2]]){ const c = trainerCtx(acts[m[2]], it.name); w = [acts[m[2]].scoreEdited ? "Score edited by the trainer" : "", c.why].filter(Boolean).join(". "); }
    else if(m && m[1] === "assess"){ const c = assessCtx(R, {assess: m[2], t: it.name}); w = c ? c.why : ""; }
  }catch(err){ w = ""; }
  return stripTags(w || it.why || it.note || "");
}
// + the trainer's points on the Scorecard overall (labreview:<id>.extra, js/lsh-program.js setExtra): added straight onto it,
// 100% at most. A plain field at the end of 🏅 Grades, for a trainer only; the trainee sees it in their overall
function extraRowHtml(p){
  if(!adminOn() || meOn()) return "";
  const x = window.lshProgram && lshProgram.extra ? lshProgram.extra(((B.data.rec[p.id] || {}).src) || {}) : null, sc = (B.data.rec[p.id] || {}).score;
  return `<tr class="bs-pt-x"><td class="bs-pt-m">+</td><td class="bs-pt-v" title="${e(sc ? ovWhy(sc) : "")}"><input class="bs-ed" type="number" min="-100" max="100" step="0.5" value="${x ? x.points : ""}" placeholder="0" aria-label="Points added to the Scorecard overall" data-pid="${e(p.id)}" data-extra="1" onchange="FTBatchSheet.editExtra(this)"></td>
    <td class="bs-pt-f"><input class="bs-ed-note" maxlength="600" value="${e(x ? x.note : "")}" placeholder="Note (optional)" aria-label="Note on the points" data-pid="${e(p.id)}" data-extra="1" onchange="FTBatchSheet.editExtra(this)"></td></tr>`;
}
// 📝 a trainee's graded activities (worksheets and answer sheets graded on the platform, trackerreview:<id>.assess — Day 3's
// Reception Listening Activity and the like — beside the 📄 Assessments): the grade, when, and the comments
function activitiesHtml(p){
  const gr = ((((B.data.rec[p.id] || {}).src || {})["trackerreview:"] || {}).assess) || {}, forms = window.FTAssess && typeof FTAssess.docs === "function" ? FTAssess.docs() : [];
  const items = dayList().flatMap(d => (d.items || []).filter(it => it.assess && !forms.includes(it.assess)).map(it => ({d, it, g: gr[it.assess] || null})));
  if(!items.length) return "";
  return `<h5 class="bs-kd-sub bs-kd-sub-act">📝 Activities</h5>` + items.map(({d, it, g}) => { const pc = g ? numOr(g.pct) : null, notes = g ? [g.comment, g.note, g.feedback, g.summary].filter(x => typeof x === "string" && x.trim()) : [];
    return `<details class="bs-kd" name="bs-kd"><summary><b>${e(it.t.replace(/\s*\(.*$/, ""))}</b> <small>Day ${e(d.day)}</small> <span class="bs-kd-pill ${tone(pc)}">${pc != null ? pc + "%" : g && g.at ? "submitted · not graded yet" : "not submitted"}</span>
        ${g && g.score != null ? `<small>${e(String(g.score))}${g.max != null ? "/" + e(String(g.max)) : ""} points${g.when ? " · graded " + e(g.when) : g.at ? " · " + e(when(g.at)) : ""}</small>` : ""}</summary>
      ${notes.map(n => `<div class="bs-ctx bs-why"><p>🧑‍🏫 ${e(n)}</p></div>`).join("")}${actItemsHtml(it, g)}</details>`; }).join("");
}
// (each graded answer of an activity, in the calls' order: ✓ right, ✗ marked down with the grading's note, ⏳ for the trainer)
function actItemsHtml(it, g){
  const its = Object.entries((g && g.items) || {}).filter(([, x]) => x);
  if(!its.length) return g && g.score != null ? "" : `<p class="bs-kd-none">Nothing graded yet.</p>`;
  const nm = k => window.FTListen && FTListen.answerName ? FTListen.answerName(it.assess, k) : k, callOf = k => Number((/^c(\d+)_/.exec(k) || [])[1]) || 0;
  its.sort((a, b) => callOf(a[0]) - callOf(b[0]));
  return `<ul class="bs-kd-items">${its.map(([k, x]) => `<li class="${x.pending ? "is-wait" : x.ok ? "is-ok" : "is-no"}"><b>${x.pending ? "⏳" : x.ok ? "✓" : "✗"}</b> ${e(nm(k))}${x.pts != null ? ` <small>(${e(String(x.pts))} pt${Number(x.pts) === 1 ? "" : "s"})</small>` : ""}${x.note ? ` — ${e(x.note)}` : ""}</li>`).join("")}</ul>`;
}
// 📤 a date's extra lines on a trainee's page, under its activities in 📤 Daily outputs: 📅 that training day's own activities
// and their score (as 📅 Day by Day works it out), and 💬 the trainer's feedback sent that day
function dayExtras(p, d, dt){
  const out = [];
  let n = 0; for(let k = 1; k <= 40; k++) if(dayDate(k) === d){ n = k; break; }
  // (📅 that training day's scored deliverables, each with its score and why: 📅 Day 1–16: Detailed Scores, here on its day)
  if(n && dt){ const r = rowFor(dt, p, 0, 1), k = dt.head.indexOf("Day " + n), c = r && k >= 0 ? r[k] || {} : null;
    // (the day's scored work, each kind its own section — ☎ Mock calls, 🎓 Demos, 🟢 Practice Sessions, 📝 Assessments &
    // activities, ✍️ Knowledge Checks — under one heading with the day's score; no "· " rows under a summary row repeating them)
    if(c && (c.v || (c.parts || []).length)) out.push({header: true, group: `📅 Day ${n} scored work`, groupV: stripTags(c.v) || "not scored yet"},
      ...(c && Array.isArray(c.parts) ? c.parts.map(x => Object.assign({}, x, {name: stripTags(x.name).replace(/^· /, "")})) : [])); }
  const fb = (((B.data.rec[p.id] || {}).feedback || {}).days) || {}, ptd = v => { try{ return window.FTTrackerRules ? FTTrackerRules.ptDate(new Date(v)) : String(v).slice(0, 10); }catch(err){ return ""; } };
  // (a lesson's feedback already listed with the day's scored work isn't listed twice)
  const told = new Set(out.filter(x => x.group === "💬 Trainer feedback").map(x => stripTags(x.name)));
  Object.entries(fb).filter(([l, v]) => v && v.status === "sent" && v.sentAt && ptd(v.sentAt) === d && !told.has(`💬 Trainer's feedback: ${lessonName(Number(l))}`)).forEach(([l, v]) =>
    out.push({group: "💬 Trainer feedback", name: "💬 Trainer feedback", v: v.rating || "—", tone: ratingTone(v.rating), text: `${lessonName(Number(l))}${v.summary ? ": " + String(v.summary).replace(/\s+/g, " ").slice(0, 400) : ""}`}));
  return out;
}
// a table's groups that repeat the same columns (two or more): {sub: their headings, groups: [{label, cols}], cols: every index}
function matrixOf(x){
  if(!Array.isArray(x.groups) || !x.groups.length) return null;
  let at = 0; const gs = [];
  x.groups.forEach(g => { const cols = []; for(let k = 0; k < g.span; k++) cols.push(at + k); at += g.span; if(g.label && g.span > 1) gs.push({label: stripTags(g.label), cols}); });
  const sig = g => g.cols.map(k => stripTags((x.head || [])[k])).join("|");
  const same = gs.filter(g => sig(g) === sig(gs[0] || {cols: []}));
  if(same.length < 2 || same.length !== gs.length) return null;
  return {sub: same[0].cols.map(k => x.head[k]), groups: same, cols: same.flatMap(g => g.cols)};
}
// a day's activities / assessments, a row each: what, its score or status, and how it went
// (a day's parts in sections — ✅ Daily compliance, then each kind of scored work — with a section's header once, and a mock
// call's or demo's scorecard criteria, each its own row under it)
const critTone = v => v >= 4 ? "gs-hi" : v >= 3 ? "gs-mid" : "gs-lo";
const partsTable = ps => { let g0 = null;
  return `<table class="bs-parts"><thead><tr><th>Activity / assessment</th><th>Score</th><th>Details</th></tr></thead><tbody>${ps.map(x => {
    const head = x.group && x.group !== g0 ? `<tr class="bs-parts-g${x.header || /compliance/i.test(x.group) ? " bs-parts-top" : ""}"><th colspan="3">${e(x.group)}${x.groupV ? ` <span class="bs-parts-gv">${e(x.groupV)}</span>` : ""}</th></tr>` : ""; if(x.group) g0 = x.group;
    if(x.header) return head;
    return head + `<tr><td class="bs-parts-n">${e(stripTags(x.name))}</td><td class="bs-parts-v"><b class="bs-sbox ${e(x.tone || "")}" title="${e(stripTags(x.name) + ": " + stripTags(x.v) + (x.text ? " — " + stripTags(x.text) : ""))}">${e(x.v)}</b></td><td class="bs-parts-t">${e(stripTags(x.text))}</td></tr>`
      + (Array.isArray(x.crit) ? x.crit.map(c => `<tr class="bs-parts-c"><td class="bs-parts-n">↳ ${e(c.n)}</td><td class="bs-parts-v"><b class="bs-sbox ${critTone(c.s)}">${e(c.s)}/5</b></td><td class="bs-parts-t">${e(c.fb || "")}</td></tr>`).join("") : ""); }).join("")}</tbody></table>`; };
function perTraineeHtml(T){
  const all = people(); if(!all.length) return `<p class="sc-empty">No trainee in ${e(B.batch)} yet.</p>`;
  const ppl = all;   // (one trainee per page: 🔎 beside Batch)
  const skipCol = (x, k, h) => k === 0 || h === "Rank" || (x.id === "compliance" && k >= 2 && k <= 2 + LINKS.length);
  // (👥 the trainee's own record — status, registered, last on the platform, lessons… — at the bottom of their table)
  // (🏅 Score Card after the day-by-day detail; then 🔎 every grade; 👥 the trainee's own record at the very bottom)
  const use = T.filter(x => !["drive", "trainees", "scorecard"].includes(x.id)).concat(T.filter(x => x.id === "scorecard"), T.filter(x => x.id === "trainees"));
  const cur = ptCur(ppl);
  const sc = T.find(x => x.id === "scores"), col = h => sc ? sc.head.indexOf(h) : -1;
  return `<div class="bs-pts">${ppl.map((p, i) => { if(p !== cur) return "";
    const sr = sc && rowFor(sc, p, i, ppl.length), val = h => { const k = col(h); return sr && k >= 0 && sr[k] ? stripTags(sr[k].v) : ""; };
    const toneOf = c => String(c.cls || "").split(/\s+/).filter(z => /^gs-(hi|mid|lo)$/.test(z)).join(" ");
    const cellOf = h => { const k = col(h); return sr && k >= 0 ? sr[k] || {} : {}; };
    const head = [["Overall", "Overall %"], ["Scorecard", "Scorecard overall"], ["Daily compliance", "Daily compliance"]].map(([l, h]) => [l, val(h), toneOf(cellOf(h)), stripTags(cellOf(h).f)]).filter(([, v]) => v);
    // a table's rows for this trainee (keep: which measures, by heading; all of them when not given), without its heading
    const rowsOf = (x, keep) => { const r = x && rowFor(x, p, i, ppl.length); if(!r) return "";
      // (a table in groups of the same columns — 🏅 Score Card's lessons, each Knowledge Checks · Practice · Classroom & outputs ·
      // Average · Remarks — is a small grid: a row per group, a column per measure, how it was worked out on a hover)
      const M = matrixOf(x), inM = new Set(M ? M.cols : []);
      const lines = (x.head || []).map((h, k) => skipCol(x, k, h) || inM.has(k) || (keep && !keep(stripTags(h))) ? "" : (() => { const c = r[k] || {}, v = stripTags(c.v);
        const hd = stripTags(h), f = x.id === "compliance" && k === 1 ? linkMarks(p) : x.id === "compliance" && hd === "Lesson decks" ? lessonMarks(p, false)
          : x.id === "compliance" && hd === "Knowledge Checks passed" ? lessonMarks(p, true)
          : x.id === "outputs" && k >= 2 && x.dates && x.dates[k - 2] ? partsTable((Array.isArray(c.parts) ? c.parts : []).concat(dayExtras(p, x.dates[k - 2], T.find(y => y.id === "dayscores"))))
            // (🔎 a trainer: what the system reads in the trainee's Task Tracker and Monitoring Sheet for the day, worker.js /api/drive/read-check)
            + (state.isAdmin && !meOn() ? `<button type="button" class="btn btn-ghost btn-sm bs-readchk" onclick="FTBatchSheet.readCheck('${e(p.id)}','${e(x.dates[k - 2])}')">🔎 What was read from the Task Tracker and Monitoring Sheet</button>` : "")
          : Array.isArray(c.parts) && c.parts.length ? partsTable(c.parts) : e(stripTags(c.f) === v ? "" : stripTags(c.f));
        return `<tr><td class="bs-pt-m">${e(stripTags(h))}</td><td class="bs-pt-v ${e(toneOf(c))}" title="${e(stripTags(h) + ": " + (v || "—") + (stripTags(c.f) && stripTags(c.f) !== v ? " — " + stripTags(c.f) : ""))}">${v ? e(v) : "—"}</td><td class="bs-pt-f">${f}</td></tr>`; })()).join("");
      const grid = M ? `<tr><td colspan="3" class="bs-pt-mxw"><table class="bs-pt-mx"><thead><tr><th></th>${M.sub.map(h => `<th>${e(stripTags(h))}</th>`).join("")}</tr></thead><tbody>
          ${M.groups.map(g => `<tr><th>${e(g.label)}</th>${g.cols.map(k => { const c = r[k] || {}, v = stripTags(c.v); return `<td class="bs-pt-v ${e(toneOf(c))}" title="${e(stripTags(c.f))}">${v ? e(v) : "—"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></td></tr>` : "";
      return lines + grid; };
    const sec = x => { const rows = rowsOf(x); return rows ? `<tr class="bs-pt-sec"><th colspan="3">${e(x.id === "outputs" ? "📤 Daily outputs & 📅 Day scores" : x.title)}</th></tr>${rows}` : ""; };
    /* 🏅 GRADES, in one: the Overall % and its parts, the 🏅 Score Card (lesson by lesson), the Practice Lab's use, every grading
       system with each of its items, and the lessons with their dates — what 🏅 Scores, 🛠 Practice Lab, 🔎 Every grade,
       📅 Lessons & Knowledge Checks day by day and 📚 Lessons each showed a part of, the same grades over and over */
    const byId = id => T.find(x => x.id === id);
    const sub = t => `<tr class="bs-pt-sub bs-pt-gsub"><td colspan="3">${t}</td></tr>`;
    const part = (t, rows) => rows ? sub(t) + rows : "";
    // (no 🏅 Grades table: every grade is in 📤 Daily outputs & 📅 Day scores and in ✍️ Knowledge Checks, Assessments &
    // Activities; a trainer's own score and + points go in ✎ Edit a score)
    const grades = editBoxHtml(p);
    // (the sheet's tables, then 🔎 every grade, then 👥 the trainee's own record at the bottom)
    // (📦 their Day 8 Intake Packet after the 🏅 Score Card, for a trainer: js/ft-intake.js; the 📦 Intake Packets page only assigns them)
    const intake = !meOn() && window.FTIntake && typeof FTIntake.cardHtml === "function" ? FTIntake.cardHtml(p.id) : "";
    // (🏅 Grades in place of the 🏅 Score Card; Compliance and Platform Utilization Monitoring at the very bottom, after the
    // trainee's own record)
    // (📅 Day by Day: each training day's activities are in that day of 📤 Daily outputs, dayExtras)
    const inGrades = ["scores", "scorecard", "practice", "lessons", "days", "dayscores"], last = ["compliance"];
    // (✍️ in place of 📅 Day by Day: the Knowledge Checks answer by answer with the comments, the Assessments and the Activities)
    const kd = `<tr class="bs-pt-sec"><th colspan="3">✍️ Knowledge Checks, Assessments &amp; Activities</th></tr><tr><td colspan="3" class="bs-pt-kd">${kdOneHtml(p, true)}${activitiesHtml(p)}</td></tr>`;
    const body = use.filter(x => x.id !== "trainees" && !last.includes(x.id) && !inGrades.includes(x.id)).map(sec).join("") + kd + grades + intake + use.filter(x => x.id === "trainees").map(sec).join("")
      + last.map(id => use.filter(x => x.id === id).map(sec).join("")).join("");
    return `<div class="bs-pt" id="bs-pt-${e(p.id)}">
      <div class="bs-pt-h"><b>${e(p.name)}</b>${p.status && p.status !== "Approved" ? ` <i>${e(p.status)}</i>` : ""}${head.map(([l, v, t, f]) => `<span class="bs-pt-k ${e(t)}"${f ? ` title="${e(f)}"` : ""}>${e(l)} <b>${e(v)}</b></span>`).join("")}</div>
      <div class="bs-pt-wrap"><table class="bs-pt-t"><colgroup><col class="bs-pt-c1"><col class="bs-pt-c2"><col></colgroup><tbody>${body}</tbody></table>
        ${window.FTFeedback && typeof FTFeedback.inline === "function" ? (B.fbWho === p.id ? `<div class="bs-pt-fb">${FTFeedback.inline(p.id, B.batch)}<button type="button" class="btn btn-ghost btn-sm" onclick="FTBatchSheet.fbOpen('')">Close 📝 Send Feedback</button></div>`
          : `<button type="button" class="btn btn-navy btn-sm bs-pt-fbb" onclick="FTBatchSheet.fbOpen('${e(p.id)}')">📝 Send Feedback to ${e(p.name)}</button>`) : ""}</div></div>`;
  }).join("")}</div>`;
}
/* 📤 Daily outputs: each training day's compliance (worker.js dailyCompliance, at the end of every shift): the Daily Task
   Tracker, the Monitoring Sheet, the Typing and Spelling tests, the day's outputs (links submitted or files saved in the
   folder) and the EOD email, each a %, and their average — what 📈 Overall Performance's Daily Compliance sheet showed. */
/* ▸/▾ retractable by trainee and by day: a trainee's row folds to each day's score and a little box per activity (icon and %),
   a day's column folds to its score alone. Everything starts open; what a viewer folds is kept on this browser (OFOLD_KEY). */
const OFOLD_KEY = "lsh_bs_ofold";
function ofold(){
  if(B.ofold) return B.ofold;
  try{ B.ofold = JSON.parse(localStorage.getItem(OFOLD_KEY) || "{}") || {}; }catch(err){ B.ofold = {}; }
  B.ofold.rows = B.ofold.rows || {}; B.ofold.days = B.ofold.days || {}; return B.ofold;
}
function ofoldSave(){ try{ localStorage.setItem(OFOLD_KEY, JSON.stringify(B.ofold || {})); }catch(err){} }
const rowOpen = id => { const v = ofold().rows[id]; return v == null ? true : !!v; };
function outputsTable(){
  const ppl = people(), comp = p => (((B.data.rec[p.id] || {}).src || {})["trackerreview:"] || {}).compliance || {};
  const dates = [...new Set(ppl.flatMap(p => Object.keys(comp(p))))].sort().slice(-30);
  const md = d => { const x = new Date(d + "T12:00:00Z"); return x.toLocaleDateString(undefined, {weekday: "short", month: "numeric", day: "numeric", year: "numeric", timeZone: "UTC"}); };
  const F = ofold(), dayShut = d => !!F.days[d];
  const caret = (open, label) => `<span class="bs-ocaret" aria-hidden="true">${open ? "▾" : "▸"}</span><span class="bs-sr">${open ? "Fold" : "Open"} ${e(label)}</span>`;
  return {id: "outputs", dates, title: "📤 Daily outputs", note: `${meOn() ? "Your" : "Each trainee's"} day as the end-of-shift check found it: the Task Tracker, the Monitoring Sheet, the Typing & Spelling tests, the day's outputs, the EOD email and their progress on the platform, each a %, averaged. Each day's cell has every activity's score in a little box and how the trainee did on it, in two sentences. ${dates.length ? "" : "No day checked yet: the check runs at the end of every shift."}`,
    head: ["Trainee", "Average"].concat(dates.map(md)),
    headHtml: [null, null].concat(dates.map(d => `<button type="button" class="bs-ofold-btn" onclick="event.stopPropagation();FTBatchSheet.ofDay('${e(d)}')" title="${dayShut(d) ? "Open" : "Fold"} ${e(md(d))}">${caret(!dayShut(d), md(d))} ${e(md(d))}</button>`)),
    tools: ppl.length || dates.length ? `<span class="bs-otools">${ppl.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTBatchSheet.ofAll(true)">▾ Open every trainee</button><button type="button" class="btn btn-ghost btn-sm" onclick="FTBatchSheet.ofAll(false)">▸ Fold every trainee</button>` : ""}${dates.length ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTBatchSheet.ofDays(false)">▾ Open every day</button><button type="button" class="btn btn-ghost btn-sm" onclick="FTBatchSheet.ofDays(true)">▸ Fold every day</button>` : ""}<small>Click a name to open or fold that trainee's days, a day's heading to fold that day.</small></span>` : "",
    rowCls: ppl.map(p => rowOpen(p.id) ? "" : "bs-orow-f"),
    rows: ppl.map(p => { const c = comp(p), vs = dates.map(d => c[d] && typeof c[d].pct === "number" ? c[d].pct : null), a = avgOf(vs), open = rowOpen(p.id);
      return [{v: p.name, f: p.name, cls: "gs-name bs-oname", html: `<button type="button" class="bs-ofold-btn bs-oname-btn" onclick="event.stopPropagation();FTBatchSheet.ofRow('${e(p.id)}')" title="${open ? "Fold" : "Open"} ${e(p.name)}'s days">${caret(open, p.name + "'s days")} ${e(p.name)}</button>`},
        {v: pct(a), f: a == null ? "No day checked yet" : `The average of the days = ${pct(a)}`, cls: "gs-num gs-calc gs-bold " + tone(a)}]
        .concat(dates.map((d, i) => { const x = c[d]; if(!x) return {v: "", f: `${md(d)}: not checked`, cls: "gs-num" + (dayShut(d) ? " bs-ocol-f" : "")};
          // each activity: a little box with its score, and the trainee's performance on it in two sentences at most
          const acts = dayActs(B.data.rec[p.id] || {}, d), box = v => `<b class="bs-sbox ${tone(v)}">${v == null ? "—" : Math.round(v) + "%"}</b>`;
          return {v: x.day1 ? "Day 1: not counted" : x.open ? "Today: not final" : pct(vs[i]), csv: `${x.day1 ? "Day 1: not counted" : x.open ? "Today: not final" : pct(vs[i])} — ${acts.map(a => `${a.label} ${a.pct == null ? "—" : a.pct + "%"}: ${a.text}`).join(" | ")}`,
            f: `${md(d)} = ${pct(vs[i])} · ${acts.map(a => `${a.label} ${a.pct == null ? "—" : a.pct + "%"}: ${a.text}${a.more ? " [" + a.more + "]" : ""}`).join(" · ")}`,
            // (folded day: its score alone; folded trainee: the day's score and each activity's little box; open: everything)
            parts: acts.map(a => ({group: "✅ Daily compliance", name: `${a.icon} ${a.label}`, v: a.pct == null ? "—" : Math.round(a.pct) + "%", tone: tone(a.pct), text: a.text})),
            cls: "bs-ocell" + (dayShut(d) ? " bs-ocol-f" : !open ? " bs-ocell-f" : ""),
            html: dayShut(d) ? `<div class="bs-oday">${box(vs[i])}</div>`
              : !open ? `<div class="bs-oday">${box(vs[i])}<span>${x.day1 ? "Day 1 · not counted" : x.open ? "today · not final" : "the day"}</span></div><div class="bs-omini">${acts.map(a => `<span title="${e(a.label)}: ${e(a.text)}">${a.icon}${box(a.pct)}</span>`).join("")}</div>`
              : `<div class="bs-oday">${box(vs[i])}<span>${x.day1 ? "Day 1 · not counted" : x.open ? "today · not final" : "the day"}</span></div><ul class="bs-oacts">${acts.map(a => `<li data-act="${e(a.k)}">${box(a.pct)}<div><b>${a.icon} ${e(a.label)}</b><span>${e(a.text)}</span></div></li>`).join("")}</ul>`}; }));
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
  const rv = (R.src || {})["trackerreview:"] || {}, c = (rv.compliance || {})[d] || {}, P = (c.day1 ? c.day1Parts : c.open ? c.openParts : c.parts) || {}, tk = (rv.days || {})[d] || null, mon = rv.monitor || null, out = [];
  const monDay = !!(mon && mon.checkedAt && (() => { const x = new Date(mon.checkedAt); return !isNaN(x) && [x.toISOString().slice(0, 10), `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`].includes(d); })());
  const unread = k => (c.unreadable || []).includes(k), share = "The system can't open it, so it isn't counted. Share it with the program's account (📁 My Drive links).";
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  // 🤖 the day's own input graded by the AI (worker.js aiDayGrade): its score out of 100 from the six criteria, each out of 5
  const CRIT = {compliance: "Compliance", completeness: "Completeness & accuracy", personal: "Personal input", effort: "Effort", detail: "Attention to detail", professionalism: "Professionalism"};
  const aiTxt = g => g ? `Graded on the day's own entries: ${g.score}%${g.aiLikely ? " · ⚠ reads as AI-generated, not their own words" : ""}.` : "";
  const aiMore = g => g ? [Object.entries(g.crit || {}).map(([k, v]) => `${CRIT[k] || k} ${v}/5`).join(" · "), g.feedback || "", (g.flags || []).length ? "To fix: " + g.flags.join("; ") : ""].filter(Boolean).join(" · ") : "";
  if(P.tracker != null || unread("tracker")){
    const rules = tk ? tk.rules || [] : [], miss = rules.filter(r => !r.pass), voice = tk && (tk.comment ? "🧑‍🏫 " + first(tk.comment) : tk.review ? "🤖 " + first(tk.review) : "");
    out.push({k: "tracker", icon: "📋", label: "Task Tracker", pct: P.tracker, text: unread("tracker") ? sent2(share)
      : c.trackerAi ? sent2(aiTxt(c.trackerAi), c.trackerAi.feedback || "")
      : sent2(rules.length ? `${rules.length - miss.length} of ${rules.length} checks met${miss.length ? `; to fix: ${miss[0].label}${miss[0].detail ? " (" + miss[0].detail + ")" : ""}` : ", nothing to fix"}.` : P.tracker ? "Updated for the day." : "Not updated for the day.", voice),
      more: [aiMore(c.trackerAi), tk && tk.review ? "AI review: " + tk.review : "", tk && tk.comment ? "Trainer: " + tk.comment : ""].filter(Boolean).join(" · ")});
  }
  if(P.monitor != null || unread("monitor")){
    out.push({k: "monitor", icon: "📒", label: "Monitoring Sheet", pct: P.monitor, text: unread("monitor") ? sent2(share)
      // (the Monitoring Sheet's review is its latest check's: shown on the day it was checked only)
      : c.monitorAi ? sent2(aiTxt(c.monitorAi), c.monitorAi.feedback || "")
      : sent2(P.monitor ? `The entry dated ${d.slice(5, 7)}/${d.slice(8)}/${d.slice(2, 4)}: ${P.monitor}%.` : monDay && mon.error ? `Not counted: ${mon.error}` : `No entry dated ${d.slice(5, 7)}/${d.slice(8)}/${d.slice(2, 4)} on the Monitoring Sheet.`, monDay ? (mon.comment ? "🧑‍🏫 " + first(mon.comment) : mon.review ? "🤖 " + first(mon.review) : "") : ""),
      more: [aiMore(c.monitorAi), monDay && mon.review ? "AI review: " + mon.review : ""].filter(Boolean).join(" · ")});
  }
  if(P.platform != null){ const did = (c.platform || []).slice(0, 3);
    out.push({k: "platform", icon: "🖥", label: "Platform", pct: P.platform, text: sent2(!P.platform ? "Nothing done on the platform that day." : P.platform < 100 ? "Lessons opened, but nothing finished or submitted that day." : "Finished or submitted work on the platform.", did.length ? "Did: " + did.join(", ") + "." : "")}); }
  if(c.tests || P.tests != null){ const t = c.tests || {}, took = [t.AM && "the morning typing test", t.PM && "the afternoon typing test", t.SP && "the spelling test"].filter(Boolean),
      miss = [!t.AM && "the morning typing test", !t.PM && "the afternoon typing test", !t.SP && "the spelling test"].filter(Boolean);
    out.push({k: "tests", icon: "🧪", label: "Typing & Spelling", pct: P.tests, text: sent2(took.length ? `Took ${took.join(" and ")}.` : "No test found for the day.", took.length && miss.length ? `Not found: ${miss.join(", ")}.` : took.length ? "All three tests done." : "")}); }
  if(P.outputs != null){ const sub = (c.submissions || []).slice(0, 3);
    out.push({k: "outputs", icon: "📤", label: "Day's outputs", pct: P.outputs, text: sent2(!P.outputs ? (c.folderError ? "The folder couldn't be read, so the day's outputs aren't counted." : "No output link submitted and no file saved in the folder that day.")
      : (c.links || c.saved ? [c.links ? plural(c.links, "output link") + " submitted" : "", c.saved ? plural(c.saved, "file") + " saved in the folder" : ""].filter(Boolean).join(" and ") + "." : `${plural((c.submissions || []).length, "submission")} on the platform.`),
      sub.length ? "Submitted: " + sub.join(", ") + "." : ""),
      // (🏅 the scores of what was graded that day, averaged with the hand-in: worker.js dailyCompliance graded)
      more: (c.graded || []).length ? "Scores: " + c.graded.map(g => `${g.what} ${g.pct}%`).join(" · ") : ""});
    if((c.graded || []).length) out[out.length - 1].text += " Scores: " + c.graded.slice(0, 4).map(g => `${g.what} ${g.pct}%`).join(", ") + (c.graded.length > 4 ? ` and ${c.graded.length - 4} more` : "") + "."; }
  // 📏 following instructions (strict): the naming convention, the saving route and folders, the deliverables on time and the
  // six Drive links, as found that day (worker.js dailyCompliance instr)
  if(P.instructions != null){ const I = c.instr || {}, iss = (I.issues || []).slice(0, 4), LB = Object.fromEntries(LINKS);
    out.push({k: "instructions", icon: "📏", label: "Following instructions", pct: P.instructions, text: sent2(iss.length ? `${I.ok} of ${I.of} instructions followed that day. Not followed: ${iss.map(x => LB[x.k] ? `${LB[x.k].replace(/^\S+\s/, "")} (${x.why})` : x.why).join("; ")}.` : `All ${I.of} instructions followed that day.`, iss.length ? "Fixing them later doesn’t undo the day." : "")}); }
  // 📘 the TAM, on a day a trainer graded it for shadowing
  if(P.tam != null) out.push({k: "tam", icon: "📘", label: "TAM (shadowing)", pct: P.tam, text: sent2(P.tam >= 100 ? "A full entry for the day, graded for the shadowing activity." : P.tam > 0 ? "A short entry for the day: 15 words or more count in full." : "No TAM entry dated that day.")});
  if(P.eod != null){ const rules = c.eodCheck ? c.eodCheck.rules || [] : [], miss = rules.filter(r => !r.pass);
    out.push({k: "eod", icon: "✉️", label: "EOD email", pct: P.eod, text: c.eodTrainer ? sent2(`Scored by a trainer: ${c.eodTrainer.score}%.`, c.eodTrainer.note || "") : sent2(!P.eod && !c.eodCheck ? "No EOD email for the day." : rules.length ? `Sent; ${rules.length - miss.length} of ${rules.length} checks met.` : "Sent.",
      miss.length ? `To fix: ${miss[0].label}${miss[0].detail ? " (" + miss[0].detail + ")" : ""}.` : rules.length ? "Professional, complete and on time." : "")}); }
  // (📅 a Day 1 still held back as a setup day — index.html ftDay1 counts it now, so none should reach here)
  // (⏳ today's, before the shift is over: as it stands, counted once the day is over)
  const held = c.day1 ? "Day 1 (setup day): not counted" : c.open ? "Today so far: counts once the shift is over" : "";
  return held ? out.map(a => Object.assign({}, a, {pct: null, text: `${held}. Found: ${a.pct == null ? "—" : Math.round(a.pct) + "%"}. ` + a.text})) : out;
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
/* 🛠 Practice Lab: how much each trainee uses it — the tools they have practiced in, their attempts and when they last
   practiced, then a column per tool (attempts · average). The Practice Lab's own grading systems come from the Scorecard
   (the same items 🏅 Scorecards counts); the AI-graded practice tools and roleplays from the trainee's work log. */
const LAB = ["sessions", "calls", "calendar", "calcheck", "calrules", "calweek", "drills", "listening", "skills", "portalsims"];
const PRACTICE = new Set(["Practice in a tool", "Roleplay practice", "Typing test", "Spelling test", "Simulator practice"]);
function practiceTable(){
  const ppl = people(), S = B.data.sources.filter(s => LAB.includes(s.id) && !s.hidden), all = events();
  const cols = [{id: "ai", label: "🤖 Practice tools (AI-graded)"}, {id: "rp", label: "🎭 Roleplays"}].concat(S.map(s => ({id: s.id, label: `${s.icon || ""} ${s.label}`.trim(), s})));
  return {id: "practice", title: "🛠 Practice Lab", note: `${meOn() ? "How much you use" : "How much each trainee uses"} the Practice Lab: the tools practiced in (of ${cols.length}), every attempt, the last time, then each tool (attempts · average score). Blank: not used yet.`,
    head: ["Trainee", "Tools used", "Attempts", "Last practice"].concat(cols.map(c => c.label)),
    rows: ppl.map(p => {
      const R = B.data.rec[p.id] || {}, wl = Array.isArray((R.data || {})["work-log"]) ? R.data["work-log"] : [];
      const cell = c => {
        if(c.id === "ai" || c.id === "rp"){
          const xs = wl.filter(w => w && (c.id === "ai" ? w.kind === "lab" : w.kind === "roleplay")), sc = xs.map(w => w.score).filter(n => typeof n === "number");
          const a = sc.length ? Math.round(sc.reduce((x, y) => x + y, 0) / sc.length) : null, last = xs.map(w => t(w.at)).filter(Boolean).sort((x, y) => y - x)[0];
          return {n: xs.length, a, f: xs.length ? `${c.label}: ${xs.length} attempt${xs.length === 1 ? "" : "s"}${a != null ? `, average ${a}%` : ""}${last ? ` · last ${last.toLocaleString()}` : ""}${xs.length ? ` · ${[...new Set(xs.map(w => w.label).filter(Boolean))].slice(0, 4).join(", ")}` : ""}` : `${c.label}: not used yet`};
        }
        // (🧪 Typing & Spelling: every test taken is an attempt — the tests are scored on compliance, not one by one)
        const x = R.score && R.score.rows ? R.score.rows.find(y => y.s === c.s) : null, k = R.skills || {};
        const n = c.id === "skills" ? Math.max(x ? x.graded : 0, (k.typing || []).length + (k.spelling || []).length) : x ? x.graded : 0;
        return {n, a: x ? x.avg : null, f: n ? `${c.label}: ${n} ${c.id === "skills" ? "taken" : "graded"}${x && x.avg != null ? `, average ${x.avg}%` : ""}${x && x.items ? ` · ${x.items.filter(i => typeof i.pct === "number").slice(0, 4).map(i => i.name).join(", ")}` : ""}` : `${c.label}: not used yet`};
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
   submitted, the trainer-recorded Mock Call / Demo, the tool's work saved, the 📝 Answer Sheet submitted for grading — and
   by the trainer for the rest (the classroom, the GC, Drive), in daycheck:<id> = {items: {"<day>|<activity>": {done, at}}},
   which a trainee reads and only a trainer writes (worker.js TRAINER_OWNED). The daily tests and upskill hour, repeated on
   every day, are left out of the count. */
// each activity's kind, for the totals across the 16 days
const KINDS = [["kc", "✍️ Knowledge Checks"], ["practice", "🛠 Practice"], ["mock", "🎙 Mock Calls & Demos"], ["class", "🏫 Classroom & outputs"]];
// (an activity answered on the platform and graded there, assess — Day 3's Reception Listening Activity — is 🛠 Practice, as
// the tools are, so the 🏅 Score Card counts its grade)
const kindOf = it => it.at === "tool" && it.id === "process" ? "kc" : it.at === "trainer" || /Mock call|Demo/i.test(it.kind || "") ? "mock" : it.at === "session" || it.at === "tool" || it.assess ? "practice" : "class";
const DAILY_T = /^(Typing Test \(morning|Spelling Test \(once a day\)|Free Communication Upskill)/;
const dayList = () => (window.FTDays && FTDays.DAYS ? FTDays.DAYS : []);
// (not on the scorecards: the classroom lessons and discussions, the buffer times and Mock Call Preparation — nothing is
// scored there — and the daily tests, which have their own compliance)
// (nor the Confidentiality & Call Response Exercise: off the scorecards, it stays in Day 3's deck)
// (nor the 📘 Process Guides the trainee builds before a demo: off the scorecards, they stay on the Practice Lab and the decks)
// (nor the Attorney Calendar Management Activity a second time: "on the Calendaring Simulators" and "on the Calendar
// Activity Check" are the same activity, graded once through the check — calcheck: — so only the check counts)
const UNSCORED = it => !!it.sample || (it.at === "tool" && it.id === "calactivity") || it.at === "room" || /^Buffer/i.test(it.kind || "") || (it.at === "tool" && it.id === "guide") || /^Buffer Time|^Mock Call Preparation|^Confidentiality & Call Response|^📘 Process Guide/i.test(it.t || "");
const dayItems = d => (d.items || []).filter(it => !DAILY_T.test(it.t) && !UNSCORED(it));
const ckKey = (d, it) => `${d.day}|${it.t}`.slice(0, 200);
const nonEmpty = v => !!v && (typeof v !== "object" || Object.keys(v).length > 0);
// 🎧 a Transcription Activity recording's automatic score (trackerreview:<id>.transcribe[n], worker.js gradeTranscription),
// for the submission it was worked out from: it counts until the trainer records theirs, and never sets Passed or Redo
function autoTr(R, it){
  const m = /^transcription-([12])$/.exec(String(it.id || "")); if(!m) return null;
  const g = ((((R.src || {})["trackerreview:"] || {}).transcribe) || {})[m[1]], run = (((R.transcribe || {}).r) || {})[m[1]];
  return g && typeof g.pct === "number" && run && run.submittedAt && run.submittedAt === g.submittedAt ? g : null;
}
function autoDone(R, d, it, p){
  const src = R.src || {}, dp = (R.data || {})["day-progress"] || p.progress || {};
  if(it.at === "session"){ const runs = ((src["sessions:"] || {}).runs) || {}; const k = Object.keys(runs).find(x => x.split("|")[0] === it.id && runs[x] && runs[x].submittedAt);
    return k ? {done: true, how: "Practice Session submitted " + when(runs[k].submittedAt)} : {done: false, how: "Practice Session not submitted yet"}; }
  if(it.at === "trainer"){ const a = (((src["labreview:"] || {}).acts) || {})[it.id], g = a ? null : autoTr(R, it);
    if(g) return {done: true, how: `Submitted · automatic check ${g.pct}% (not reviewed by the trainer yet)`};
    if(!a) return {done: false, how: "Not recorded by the trainer yet (🧑‍🏫 Trainer Inputs)"};
    const res = resOf(a);
    if(res === "Redo") return {done: false, how: "Trainer: Redo" + (a.score != null ? ` (${a.score}%, off the scorecards)` : "")};
    return {done: res !== "Not yet", how: `Trainer: ${res === "Not yet" ? "recorded" : res}${a.score != null ? ` · ${a.score}%` : ""}`}; }
  // 📝 done once submitted for grading; until then the trainer's tick still counts (the worksheet, handed in on Drive)
  if(it.assess){ const g = assessOf(R, it); return g && g.at ? {done: true, how: `Submitted for grading ${g.when || when(g.at)}`} : null; }
  if(it.at === "drive"){ const g = gradeByName(R, it); return g ? {done: true, how: `Graded ${g.pct}%`} : null; }
  if(it.at !== "tool") return null;
  switch(it.id){
    case "process": { const ls = d.lessons || []; if(!ls.length) return null; const ok = ls.every(l => dp[l] && dp[l].done);
      if(ok) return {done: true, how: "Knowledge Check passed"};
      // (why not: the answer sheet as the trainee left it — answered and never submitted, or submitted with no grade back)
      const sets = typeof ftKcQuestions === "function" ? [...new Set(ls.flatMap(l => { try{ return ftKcQuestions(l) || []; }catch(err){ return []; } }).filter(q => q && q.set && !q.set.open).map(q => q.set))] : [], ps = (R.process || {}).sets || {};
      const answered = sets.some(x => ((ps[x.id] || {}).answers || []).some(a => String(a || "").trim())), sent = sets.some(x => (ps[x.id] || {}).submittedAt);
      return {done: false, how: sent ? "Submitted for grading, but no grade came back yet: press 🔄 Update all scores; if it stays, open the trainee's Knowledge Check"
        : answered ? "Answered but not submitted yet: the trainee still has to press 📝 Submit for Grading" : "Knowledge Check not started yet"}; }
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
   automated checks), the Mock Call / Demo the trainer scored, a tool's grading-system average, and an activity answered on
   the platform its 📝 Submit for Grading (assess). A classroom activity the trainer ticks has no score: it counts in "done",
   not in the average. */
const TOOL_SYS = {drills: "drills", listening: "listening", calcheck: "calcheck", calactivity: "calcheck", calrules: "calrules", calweek: "calweek", calsim: "calendar", callsim: "calls", skills: "skills"};
const numOr = v => v != null && v !== "" && isFinite(Number(v)) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : null;
// 📝 a day item's grade from its 📝 Submit for Grading (its assess: trackerreview:<id>.assess[…], worker.js /api/assess/grade),
// and its score: none until it is graded, nor while a broken grade waits to be graded again (window.ftStaleGrade,
// js/ft-listening.js) — not graded is no score, never a 0
const assessOf = (R, it) => ((((R.src || {})["trackerreview:"] || {}).assess) || {})[it.assess] || null;
// ✎ the trainer's own score on an item with no trainer's field of its own (labreview:<id>.overrides[ref], js/lsh-program.js)
const ovOf = (R, ref) => window.lshProgram && lshProgram.override ? lshProgram.override((R || {}).src, ref) : null;
const gradePct = g => g && g.score != null && !(window.ftStaleGrade && ftStaleGrade(g)) ? numOr(g.pct) : null;
// 📝 an assessment handed in on Drive (the day's "… — Assessment", at: "drive") by its grade on the 🏅 Scorecard: the grading
// system's item of the same name (– or — alike), so the day shows its score as the grades list does
const normName = t => String(t || "").replace(/^[^A-Za-z0-9]+/, "").replace(/[–—-]+/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
function gradeByName(R, it){
  const sc = R.score; if(!sc || !Array.isArray(sc.rows)) return null; const want = normName(it.t);
  for(const r of sc.rows) for(const x of (r.items || [])) if(typeof x.pct === "number" && isFinite(x.pct) && normName(stripTags(x.name)) === want) return {pct: Math.round(x.pct), how: stripTags(x.note || "Graded")};
  return null;
}
function scoreOf(R, d, it, p){
  if(it.at === "drive"){ const g = gradeByName(R, it); if(g) return g; }
  const src = R.src || {}, dp = (R.data || {})["day-progress"] || p.progress || {};
  // (🟢 a Practice Session is practice: off the scorecards, which count only what is graded — the mock calls and demos the
  // trainer scores, the Knowledge Checks, the graded answer sheets and tools. It still counts as done once submitted.)
  if(it.at === "session") return null;
  if(it.at === "trainer"){ const a = (((src["labreview:"] || {}).acts) || {})[it.id], v = a && resOf(a) !== "Redo" ? numOr(a.score) : null, g = a ? null : autoTr(R, it);
    return v != null ? {pct: v, how: `trainer's score · ${resOf(a)}`} : g ? {pct: Math.round(g.pct), how: "automatic check, not reviewed by your trainer yet"} : null; }
  if(it.assess){ const g = assessOf(R, it), v = gradePct(g), o = ovOf(R, "assess:" + it.assess);
    if(o) return {pct: numOr(o.pct), how: `trainer's score${v != null ? ` (graded ${v}%)` : ""}`};
    return v != null ? {pct: v, how: `${g.score} of ${g.max} points, graded ${g.when || day(g.at)}`} : null; }
  if(it.at !== "tool") return null;
  if(it.id === "process"){
    const rv = src["kcreview:"] || {}, xs = [];
    (d.lessons || []).forEach(l => { const x = dp[l] || {}, t = numOr(((rv.lessons || {})[l] || {}).score), g = t != null ? t : typeof x.score === "number" ? x.score : null;
      if(g != null) xs.push({pct: g, how: `${lessonName(l)} ${g}%${t != null ? " (trainer's final)" : ""}`});
      const tr = numOr(((rv.read || {})[l] || {}).score), rg = tr != null ? tr : typeof x.readScore === "number" ? x.readScore : null;
      if(rg != null) xs.push({pct: rg, how: `📖 Reading Task ${rg}%${tr != null ? " (trainer's final)" : ""}`}); });
    return xs.length ? {pct: Math.round(avgOf(xs.map(x => x.pct))), how: "Knowledge Check: " + xs.map(x => x.how).join(", ")} : null;
  }
  // (less the grading system's items a day scores on their own, assess: Day 3's Reception Listening Activity is in 🎧 Call
  // Listening's grades, and scored on Day 3 by itself, so the Call Listening step's score doesn't count it a second time)
  const sys = TOOL_SYS[it.id], row = sys && R.score && R.score.rows ? R.score.rows.find(r => r.s && r.s.id === sys) : null;
  const g = row ? (row.items || []).filter(x => typeof x.pct === "number" && isFinite(x.pct) && !x.assess) : [];
  return g.length ? {pct: Math.round(avgOf(g.map(x => x.pct))), how: `${row.s.label} average`} : null;
}
function dayStatus(p, d){
  const R = B.data.rec[p.id] || {}, man = ((R.daycheck || {}).items) || {};
  return dayItems(d).map(it => { const a = autoDone(R, d, it, p), m = man[ckKey(d, it)], sc = scoreOf(R, d, it, p);
    const w1 = !!(window.ftW1Override && ftW1Override.dayOn(p.batch, d.day)) && !(m && m.done) && !(a && a.done);   // W1-OVERRIDE
    return {it, key: ckKey(d, it), auto: w1 ? {done: true, how: ftW1Override.NOTE} : a, score: sc, manual: !!(m && m.done), mAt: m && m.at, done: w1 || !!(m && m.done) || !!(a && a.done), w1}; });
}
// a set of activities as a score: the average of the scored ones, with each one's score for the bar above the sheet
const scoreLine = xs => { const sc = xs.filter(y => y.score); return {avg: sc.length ? Math.round(avgOf(sc.map(y => y.score.pct))) : null, n: sc.length,
  why: sc.map(y => `${y.it.t.replace(/\s*\(.*$/, "")} ${y.score.pct}% (${y.score.how})`).join("; ")}; };
function daysTable(){
  const ppl = people(), D = dayList();
  return {id: "days", title: "📅 Day by Day", note: `${meOn() ? "Your" : "Each trainee's"} scores on each training day: the average of the day's scored activities (the Knowledge Check, the Mock Call / Demo the trainer scored, the tools' grades, a 📝 Answer Sheet graded on the platform). A day with work done but nothing scored yet shows how many are done. Click a cell for each activity's score.  ✓ = every activity of the day done.`,
    head: ["Trainee", "Average score", "Days complete"].concat(KINDS.map(k => k[1]), D.map(d => `Day ${d.day}`)),
    rows: ppl.map(p => { const st = D.map(d => dayStatus(p, d)), full = st.filter(x => x.length && x.every(y => y.done)).length;
      const all = st.flat(), kind = k => all.filter(y => kindOf(y.it) === k), dayAvgs = st.map(x => scoreLine(x).avg), avg = avgOf(dayAvgs);
      const scored = dayAvgs.map((a, i) => a == null ? null : `Day ${D[i].day} ${a}%`).filter(Boolean);
      return [{v: p.name, f: p.name, cls: "gs-name"},
        {v: pct(avg), f: avg == null ? "No scored activity yet" : `Average score = the average of the ${scored.length} scored day${scored.length === 1 ? "" : "s"} (${scored.join(", ")}) = ${Math.round(avg)}%`, cls: "gs-num gs-calc gs-bold " + tone(avg)},
        {v: `${full} / ${D.length}`, f: `${full} of the ${D.length} days with every activity done`, cls: "gs-num gs-bold"}]
        .concat(KINDS.map(([k, label]) => { const xs = kind(k), n = xs.filter(y => y.done).length, left = xs.filter(y => !y.done), sl = scoreLine(xs);
          return {v: sl.avg != null ? pct(sl.avg) : n ? `${n} / ${xs.length} done` : "", f: `${label}, Days 1–${D.length}: ${sl.avg != null ? `average ${sl.avg}% of ${sl.n} scored (${sl.why}). ` : "nothing scored yet. "}${n} of ${xs.length} done${left.length ? ". Still to do: " + left.slice(0, 6).map(y => y.it.t).join("; ") + (left.length > 6 ? "…" : "") : ""}`,
            cls: "bs-lesson " + (sl.avg != null ? tone(sl.avg) : xs.length && n === xs.length ? "gs-hi" : n ? "gs-mid" : ""),
            // (in the trainee's table, a table: each activity, its score or Done / Not yet, and how it was found)
            parts: xs.map(y => ({name: y.it.t, v: y.score ? y.score.pct + "%" : y.done ? "Done" : "Not yet", tone: y.score ? tone(y.score.pct) : y.done ? "gs-hi" : "gs-lo",
              text: y.score ? y.score.how || "" : y.manual ? "Ticked done by the trainer" : (y.auto && y.auto.how) || ""}))}; }),
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
    // (✗ not theirs — the template, another trainee's, misnamed: worker.js ownCheck — stands, whatever a later check of
    // its content says, until the link changes)
    if(v && v.ok === false && v.mine === false && sameLink(v.url, link)){ out[k] = {st: "bad", label, link, c: {err: v.error || "it isn't the trainee's own", at: v.at}}; return; }
    if(v && v.ok && sameLink(v.url, link)){ out[k] = {st: "ok", label, link, c: {err: "", at: v.at}, issue: c && c.err && !ACCESS(c.err) && sameLink(c.url || link, link) ? c.err : ""}; return; }
    if(v && sameLink(v.url, link) && !v.retry && (!c || !t(c.at) || (t(v.at) && t(v.at) >= t(c.at)))){ out[k] = v.ok ? {st: "ok", label, link, c: {err: "", at: v.at}} : {st: "bad", label, link, c: {err: v.error || "the system can't open it", why: v.why || "", at: v.at}}; return; }
    // (not checked yet, or checked on another link: ⏳ Pending verification — or ⚠ Can't check, when the last try couldn't sign
    // in to Google Drive at all: rv.verifyError, worker.js verifyLinks, with Google's reason)
    if(!c || (c.url && !sameLink(c.url, link))){ const ve = rv.verifyError && !(t(rv.verifyAt) && t(rv.verifyAt) > t(rv.verifyError.at)) ? rv.verifyError : null;
      out[k] = ve ? {st: "unchecked", label, link, c: {err: "The system couldn't check it: " + driveWhy(ve.detail), at: ve.at}} : {st: "pending", label, link, c}; return; }
    if(!c.err){ out[k] = {st: "ok", label, link, c}; return; }
    // (the file opened, but its content needs a fix — the Daily Task Tracker's tab, a link that isn't a Google Sheet: not "can't open")
    if(!ACCESS(c.err)){ out[k] = {st: "fix", label, link, c}; return; }
    const ofThis = c.url ? sameLink(c.url, link) : !(t(dv.updatedAt) && t(c.at) && t(dv.updatedAt) > t(c.at));
    out[k] = {st: ofThis ? "bad" : "relinked", label, link, c};
  });
  // 🔎 not in their Drive (worker.js autoLinkBatch: the batch's Drive searched, no such file with their name): said so exactly
  const nf = (rv.notFound || {}).keys || [];
  // (only while it still holds: no link, or one the system can't open that was neither saved nor checked since that search.
  // A link the VA saved after it, or one that opens — the file IS there, the check says what is wrong with it — isn't
  // "not in their Drive")
  const nfAt = t((rv.notFound || {}).at);
  LINKS.forEach(([k]) => { const x = out[k]; if(!x || !nf.includes(k)) return;
    const since = nfAt && [x.c && x.c.at, ((rv.verify || {})[k] || {}).at].map(t).some(a => a && a > nfAt);
    const stale = since || (nfAt && t(dv.updatedAt) > nfAt);
    if(x.st === "none" || (x.st === "bad" && ACCESS((x.c || {}).err) && !stale)) x.nf = rv.notFound.at || true; });
  const checked = [lastDay && lastDay.checkedAt, rv.monitor && rv.monitor.checkedAt, rv.shots && rv.shots.checkedAt, rv.verifyAt].map(t).filter(Boolean).sort((a, b) => b - a)[0];
  return {L: out, dv, checked};
}
function linkCell(x){
  const nfWhy = x.nf ? ` · NOT IN THEIR DRIVE: the batch's Drive was searched${x.nf !== true ? " " + when(x.nf) : ""} and has no ${x.label} with their name. They need to make it (from the template) and link it` : "";
  if(x.st === "none") return {v: x.nf ? "✗ Not in Drive" : "—", f: `${x.label}: not linked yet${nfWhy}`, cls: "bs-lesson gs-lo"};
  if(x.st === "trainer") return {v: "✓ trainer", f: `${x.label}: ${x.link} · marked as opening by a trainer ${when(x.o.at)}${x.c && x.c.err ? ` (the system's check said: ${x.c.err})` : ""}`, cls: "bs-lesson gs-hi"};
  if(x.st === "bad") return {v: x.nf ? "✗ Not in Drive" : "❌ Inaccessible", f: `${x.label}: linked (${x.link}), but ${x.c.err}${x.c.at ? ` (checked ${when(x.c.at)})` : ""}${nfWhy}`, cls: "bs-lesson gs-mid"};
  if(x.st === "fix") return {v: "⚠ needs a fix", f: `${x.label}: ${x.link} · the system opens it, but: ${x.c.err}${x.c.at ? ` (checked ${when(x.c.at)})` : ""}`, cls: "bs-lesson gs-mid"};
  if(x.st === "unchecked") return {v: "⚠ Can’t check", f: `${x.label}: ${x.link} · ${x.c.err}`, cls: "bs-lesson gs-mid"};
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
const tables = () => [scoreCardTable(), complianceTable(), outputsTable(), dayScoresTable(), traineesTable(), linksTable(), lessonsTable(), daysTable(), practiceTable(), scoresTable(), recentTable()];

/* ---------- drawing: each table a small sheet (column letters, row numbers, the names frozen) ---------- */
function sheetHtml(T, ti){
  const n = T.head.length, empty = !T.rows.length;
  return `<section class="bs-sec" id="bs-${T.id}"><h3 class="bs-h">${e(T.title)} <span>${T.rows.length} row${T.rows.length === 1 ? "" : "s"}</span></h3><p class="bs-note">${e(T.note)}</p>${T.tools || ""}
    <div class="gs-wrap bs-wrap"><table class="gs" role="grid"><thead>
      <tr class="gs-letters"><th class="gs-corner"></th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}">${letter(i)}</th>`).join("")}</tr>
      <tr class="gs-head"><th class="gs-rn">1</th>${T.head.map((h, i) => `<th class="${i === 0 ? "gs-frz" : ""}">${T.headHtml && T.headHtml[i] != null ? T.headHtml[i] : e(h)}</th>`).join("")}</tr></thead>
      <tbody>${T.rows.map((r, ri) => `<tr${T.rowCls && T.rowCls[ri] ? ` class="${T.rowCls[ri]}"` : ""}><th class="gs-rn">${ri + 2}</th>${r.map((c, ci) => `<td tabindex="0" class="${c.cls || ""}${ci === 0 && T.id !== "recent" ? " gs-frz" : ""}"${c.f ? ` title="${e(c.f)}"` : ""} data-t="${ti}" data-r="${ri}" data-c="${ci}" onclick="FTBatchSheet.pick(this)" onfocus="FTBatchSheet.pick(this)">${c.html != null ? c.html : e(c.v)}</td>`).join("")}</tr>`).join("")}
      ${empty ? `<tr class="gs-empty"><th class="gs-rn">2</th><td colspan="${n}" class="bs-none">${T.id === "recent" ? "Nothing yet in this period." : "No trainee in this batch yet."}</td></tr>` : ""}</tbody></table></div></section>`;
}
/* ---------- ✏️ Fix the batch name: a manual override for trainees registered under the wrong batch ----------
   The trainer ticks the trainees (all of the batch by default) and types the right Batch ID; each one's trainee:<id> gets
   batch = that ID, batchFrom (the old one), batchMovedAt and batchMovedBy: "trainer". worker.js keeps that batch on every
   save the trainee makes afterwards (an open tab can't write the old one back), and index.html takes it on their next save. */
/* 👥 DUPLICATE ACCOUNTS: one person with two accounts (an older Batch ID change made a second one), where one of them is in
   this batch. Each account shows its batch, when it registered and was last on, and how much progress it holds; the
   trainer keeps the one on the right Batch ID (the one in this batch, with the most progress, is picked first) and 👥 Merge
   moves everything of the other into it and deletes it (worker.js mergeAccounts), so the Scorecard reads one profile. */
const slugOf = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
function dupGroups(){
  if(!adminOn() || meOn() || !Array.isArray(B.all)) return [];
  // (active accounts only — approved, or waiting for approval: an archived, offboarded or rejected one is 🧹 swept, not merged)
  const live = B.all.filter(r => r.name && !r.mergedInto && (window.ftActiveTrainee ? ftActiveTrainee(r, {pending: true}) : !r.archived && !r.rejected && !r.offboarded && !r.purgedAt)), by = {};
  live.forEach(r => { (by[slugOf(r.name)] = by[slugOf(r.name)] || []).push(r); });
  const done = r => Object.values(r.dayProgress || {}).filter(x => x && x.done).length;
  return Object.values(by).filter(g => g.length > 1 && g.some(r => bLabel(r.batch || "") === B.batch))
    .map(g => g.map(r => ({id: r.id, name: r.name, batch: r.batch || "", reg: r.registeredAt || "", last: r.lastActive || "", done: done(r),
      st: r.offboarded ? "offboarded" : r.archived ? "archived" : r.approved === true ? "approved" : "waiting"}))
      .sort((a, b) => (bLabel(b.batch) === B.batch) - (bLabel(a.batch) === B.batch) || b.done - a.done || String(b.last).localeCompare(String(a.last))));
}
function dupHtml(){
  const G = dupGroups(); if(!G.length) return "";
  B.dupKeep = B.dupKeep || {};
  return `<div class="bs-warn bs-dup"><b>👥 ${G.length === 1 ? `${e(G[0][0].name)} has ${G[0].length} accounts` : `${G.length} trainees have more than one account`}</b> — the Scorecard can read only one. Keep the one on the right Batch ID; 👥 Merge moves everything of the other into it and deletes it.
    ${G.map(g => { const key = slugOf(g[0].name), keep = B.dupKeep[key] && g.some(a => a.id === B.dupKeep[key]) ? B.dupKeep[key] : g[0].id;
      return `<table class="bs-dup-t"><thead><tr><th>Keep</th><th>Account</th><th>Batch</th><th>Registered</th><th>Last on</th><th>Lessons done</th><th>Status</th></tr></thead><tbody>
        ${g.map(a => `<tr${a.id === keep ? ' class="bs-dup-keep"' : ""}><td><input type="radio" name="dup-${e(key)}" ${a.id === keep ? "checked" : ""} onchange="FTBatchSheet.dupKeep('${e(key)}', '${e(a.id)}')" aria-label="Keep ${e(a.id)}"></td>
          <td><code>${e(a.id)}</code></td><td>${e(a.batch)}${bLabel(a.batch) === B.batch ? " (this batch)" : ""}</td><td>${a.reg ? e(when(a.reg)) : "—"}</td><td>${a.last ? e(ago(a.last)) : "—"}</td><td>${a.done}</td><td>${e(a.st)}</td></tr>`).join("")}</tbody></table>
        <button class="btn btn-navy btn-sm" type="button" ${B.dupBusy ? "disabled" : ""} onclick="FTBatchSheet.dupMerge('${e(key)}')">${B.dupBusy === key ? "Merging…" : `👥 Merge into ${e(keep)}`}</button>`; }).join("")}</div>`;
}
/* 🧹 SWEEP INACTIVE ACCOUNTS (the menu's 🧹, a trainer's): every account whose access is gone — offboarded, rejected, archived
   (a past batch's, an old or mistyped Batch ID's), on the block list — and the leftovers of accounts deleted before, listed
   (worker.js sweepList) with a tick each; ⬇ Back up and sweep downloads every record of the ticked ones as one .json file
   first, then removes them from the platform, one account at a time (worker.js sweepOne). Active trainees (approved or
   waiting) and a cleared batch's records kept for the Main Portal are never listed. */
const WHY = {offboarded: "🚫 Offboarded", rejected: "⛔ Rejected", archived: "📦 Archived", blocked: "🔒 Blocked", leftover: "🗑 Leftover records"};
function sweepHtml(){
  const W = B.sweep; if(!W || !adminOn()) return "";
  const head = `<div class="bs-fix bs-sweep"><h4>🧹 Sweep inactive accounts</h4>`;
  if(W.loading) return head + `<p>Looking through every account on the platform…</p></div>`;
  if(W.err) return head + `<p>Couldn’t list them: ${e(W.err)}</p><div class="bs-fix-row"><button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.sweepClose()">Close</button></div></div>`;
  const rows = W.accounts.map(a => Object.assign({}, a)).concat(W.leftovers.map(l => ({id: l.id, name: l.id.split("--")[0].replace(/-/g, " "), batch: l.id.split("--")[1] || "", why: "leftover", kinds: l.kinds})));
  if(!rows.length) return head + `<p>✓ Nothing to sweep: every account on the platform is active.</p><div class="bs-fix-row"><button class="btn btn-ghost btn-sm" onclick="FTBatchSheet.sweepClose()">Close</button></div></div>`;
  const on = rows.filter(r => !W.skip[r.id]), count = {}; rows.forEach(r => { count[r.why] = (count[r.why] || 0) + 1; });
  return head + `<p>Every account whose access is gone, and the records left behind by accounts deleted before. <b>⬇ Back up and sweep</b> downloads all their records as one file first, then removes them from the platform for good; a swept account can’t sign in again. Active trainees and cleared batches’ records (kept for the Main Portal) are never listed.</p>
    <p class="bs-sweep-sum">${Object.entries(count).map(([k, n]) => `<span>${WHY[k] || k}: <b>${n}</b></span>`).join("")} <button class="btn btn-ghost btn-sm" type="button" onclick="FTBatchSheet.sweepAll(${on.length ? "false" : "true"})">${on.length ? "Untick all" : "Tick all"}</button></p>
    <div class="bs-sweep-list"><table class="bs-dup-t"><thead><tr><th></th><th>Trainee</th><th>Batch</th><th>Why</th><th>Registered</th><th>Last on</th><th>Lessons done</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><input type="checkbox" ${W.skip[r.id] ? "" : "checked"} onchange="FTBatchSheet.sweepPick('${e(r.id)}', this.checked)" aria-label="Sweep ${e(r.id)}"></td>
        <td>${e(r.name)}<br><code>${e(r.id)}</code></td><td>${e(r.batch)}</td><td>${WHY[r.why] || e(r.why)}${r.kinds ? `<br><small>${e(r.kinds.join(", "))}</small>` : ""}</td>
        <td>${r.registeredAt ? e(when(r.registeredAt)) : "—"}</td><td>${r.lastActive ? e(ago(r.lastActive)) : "—"}</td><td>${r.done != null ? r.done : "—"}</td></tr>`).join("")}</tbody></table></div>
    <div class="bs-fix-row"><button class="btn btn-navy btn-sm" type="button" ${W.busy || !on.length ? "disabled" : ""} onclick="FTBatchSheet.sweepGo()">${W.busy ? e(W.busy) : `⬇ Back up and sweep ${on.length}`}</button>
      <button class="btn btn-ghost btn-sm" type="button" ${W.busy ? "disabled" : ""} onclick="FTBatchSheet.sweepClose()">Cancel</button></div></div>`;
}
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
  if(!B.picked && !meOn() && B.people){ const lb = latestBatch(); if(lb && lb !== B.batch){ B.batch = lb; B.data = null; B.dataKey = ""; } }
  if(!B.batch) return `<div class="card gs-card"><p class="sc-empty">No trainee has registered yet. They appear here as soon as they register.</p></div>`;
  loadData();
  const ppl = people(), D = B.data, ready = !!D && !D.error && (!D.batch || D.batch === B.batch) && ppl.every(p => (D.rec || {})[p.id]) && (!B.dataLoading || !!D.batch);
  const T = ready ? tables() : null;
  // 🔄 the sheet brings itself up to date on opening a batch (links found and checked, today's daily check run for every
  // trainee, the Weekly Ranking read again): once a session, and not again within 6 hours of the last update
  if(ready && adminOn() && !B.sync && !(B.autoSync = B.autoSync || {})[B.batch]){ B.autoSync[B.batch] = 1; let last = 0;
    try{ last = Number(localStorage.getItem("ft_bs_sync:" + B.batch)) || 0; }catch(err){}
    if(Date.now() - last > 6 * 3600e3) setTimeout(() => FTBatchSheet.sync("all", true), 1500); }
  const waiting = ppl.filter(p => p.status === "Waiting for approval").length;
  if(weeklyOn()) return `<div class="card gs-card bs-card bs-weekly">${!ready && !(D && D.error && !B.dataLoading) ? `<p class="sc-empty">Reading the batch's progress…</p>` : !ready ? `<p class="sc-empty">Couldn't read the batch's progress. Press ↻ Refresh.</p>` : sectionsHtml(T)}</div>`;
  // (the page's banner holds the sheet's controls on one line: ⬇ Download, ↻ Refresh, 🔄 Update all scores, ◀ / ▶, Batch, 🔎, Updated)
  const controls = `<div class="bs-ctl"><div class="gs-top"><div class="gs-file">        <span class="gs-menu"><button onclick="FTBatchSheet.csv()">⬇ Download</button><button onclick="FTBatchSheet.refresh()">↻ Refresh</button>${adminOn() && !meOn() ? `<button class="${B.leOpen ? "bs-le-on" : ""}" onclick="FTBatchSheet.leOpen(${B.leOpen ? "false" : "true"})">🔗 Link files by hand</button>` : ""}${adminOn() && !meOn() ? `<button class="bs-upd bs-upd-all" ${B.sync ? "disabled" : ""} onclick="FTBatchSheet.updateAll()" title="Find and link every trainee's Drive files, check every trainee's links, run today's check for every trainee (Monitoring Sheet, Task Tracker, Typing &amp; Spelling, EOD) and read the Weekly Ranking again">${B.sync ? `⏳ ${e(B.sync.what)}${B.sync.of ? ` ${B.sync.n}/${B.sync.of}` : ""}…` : "🔄 Update all scores"}</button>` : ""}</span></div>
      <span class="gs-batch bs-batchmenu"><label>Batch <select onchange="FTBatchSheet.batch(this.value)">${bs.map(b => `<option ${b === B.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></label>${whoTopHtml(ppl)}
${D && D.at ? `<span class="bs-at">${ready && B.dataLoading ? "Updating…" : `Updated ${e(D.at.toLocaleTimeString())}`}</span>` : ""}</span></div></div>`;
  const banner = ftBanner(linksOn() ? "Drive Links" : "Batch Sheet", "", "", controls);
  return `${banner}${linksEditHtml()}<div class="card gs-card bs-card">
    <div class="bs-sum">${waiting ? `<span class="bs-wait"><b>${waiting}</b> waiting for approval</span>` : ""}
</div>
    ${B.batch && !canon(B.batch) ? `<div class="bs-warn">⚠ <b>${e(B.batch)}</b> isn't a proper Batch ID (B + the date the batch started, MMDDYY, e.g. B103026). If these trainees belong to another batch, use <b>✏️ Fix the batch name</b> in 🛡 Admin Master Control → 📁 Batches.</div>` : ""}
    ${(() => { const back = (B.auto || []).filter(p => p.batch === B.batch); return back.length ? `<div class="bs-warn bs-back">↩ <b>${back.length} trainee${back.length === 1 ? " was" : "s were"} archived automatically</b> from ${e(B.batch)} (${e(back.slice(0, 6).map(p => p.name).join(", "))}${back.length > 6 ? "…" : ""}), so ${back.length === 1 ? "they are" : "they are"} not on the Scorecard. <button class="btn btn-navy btn-sm" ${B.backBusy ? "disabled" : ""} onclick="FTBatchSheet.bringBack()">${B.backBusy ? "Bringing them back…" : "↩ Bring them back"}</button></div>` : ""; })()}
    ${dupHtml()}
    ${!ready && !(D && D.error && !B.dataLoading) ? `<p class="sc-empty">Reading the batch's progress…</p>` : !ready ? `<p class="sc-empty">Couldn't read the batch's progress. Press ↻ Refresh.</p>`
      : sectionsHtml(T)}
   </div>`;
}

// 👥 a trainee revoked, rejected, offboarded, restored or approved: the sheet reads its trainees again
// (the roster changed — someone approved, revoked, offboarded —: read again quietly, the sheet on screen staying until then)
if(typeof window.addEventListener === "function") window.addEventListener("ft-roster-changed", () => { B.dataKey = ""; if(on() && B.people && !B.loading) loadPeople(); else B.people = null; });
// ✍️ Knowledge Checks, Assessments & Activities: one open at a time — opening one closes the others (the details share a
// name, which the browser keeps exclusive; this does the same where it doesn't)
if(!window.__bsKdOne){ window.__bsKdOne = true;
  document.addEventListener("toggle", ev => { const d = ev.target; if(!d || !d.matches || !d.matches("details.bs-kd") || !d.open) return;
    document.querySelectorAll("details.bs-kd[open]").forEach(o => { if(o !== d) o.open = false; }); }, true); }
// 🔎 what the system reads in a trainee's sheets for a day, in a pop-up (worker.js /api/drive/read-check): the tracker's
// header row and date columns, the day's rows, the Monitoring Sheet's entries and their dates, what is saved for the day
async function readCheck(id, date){
  const box = document.createElement("div"); box.className = "bs-rc-wrap";
  const close = () => box.remove();
  box.innerHTML = `<div class="bs-rc card"><div class="bs-rc-h"><b>🔎 What was read for ${e(date)}</b><button type="button" class="btn btn-ghost btn-sm">✕ Close</button></div><div class="bs-rc-b">Reading the sheets…</div></div>`;
  box.querySelector("button").onclick = close; box.onclick = ev => { if(ev.target === box) close(); };
  document.body.appendChild(box);
  let j = null; try{ j = await (await authFetch("/api/drive/read-check", {id, date})).json(); }catch(err){ j = {error: "unreachable"}; }
  const b = box.querySelector(".bs-rc-b"); if(!b) return;
  if(!j || j.error){ b.textContent = "Couldn't read the sheets: " + ((j && j.error) || "no answer"); return; }
  const T = j.tracker, M = j.monitor, S = j.saved;
  const list = xs => xs.length ? `<ul>${xs.map(x => `<li>${x}</li>`).join("")}</ul>` : "<p>—</p>";
  b.innerHTML = `<h4>📋 Task Tracker</h4>${!T ? "<p>No Task Tracker linked.</p>" : T.error ? `<p class="bs-rc-bad">${e(T.error)}</p>` : `
      ${T.note ? `<p class="bs-rc-bad">${e(T.note)}</p>` : ""}
      <p>Header row: ${T.headerRow ? "row " + e(T.headerRow) : "not found"} · tasks read: ${e(T.rows)} · a Daily Notes column for ${e(date)}: <b>${T.hasDay ? "yes" : "no"}</b></p>
      <p><b>Headers:</b> ${e((T.headers || []).join(" | ") || "—")}</p>
      <p><b>Daily Notes dates read:</b> ${e((T.dateColumns || []).join(", ") || "none")}</p>
      <p><b>The day's check:</b></p>${list((T.check || []).map(r => `${r.pass ? "✓" : "✗"} ${e(r.label)}${r.detail ? " — " + e(r.detail) : ""}`))}
      <p><b>The day's rows sent to the grader:</b></p><pre>${e(T.excerpt || "(none: no task received, completed or noted on that day)")}</pre>`}
    <h4>📒 Monitoring Sheet</h4>${!M ? "<p>No Monitoring Sheet linked.</p>" : M.error ? `<p class="bs-rc-bad">${e(M.error)}</p>` : `
      ${M.note ? `<p class="bs-rc-bad">${e(M.note)}</p>` : ""}
      <p><b>Entries found (${e((M.entries || []).length)}):</b></p>${list((M.entries || []).map(x => `${e(x.topic)} · date read: <b>${e(x.date || "none")}</b> · ${e(x.pct)}% (${(x.checks || []).map(c => (c.ok ? "✓ " : "✗ ") + e(c.label)).join(", ")})`))}
      ${M.forDay ? `<p><b>The entry taken for ${e(date)}:</b> ${e(M.forDay.topic)}</p><pre>${e(M.forDay.text)}</pre>` : ""}`}
    <h4>💾 Saved for the day</h4><p>${S ? `Parts: ${e(JSON.stringify(S.parts || S.day1Parts || {}))} · AI grade: tracker ${e(S.trackerAi == null ? "—" : S.trackerAi + "%")}, Monitoring Sheet ${e(S.monitorAi == null ? "—" : S.monitorAi + "%")} · checked ${e(String(S.checkedAt || "").slice(0, 16).replace("T", " "))}` : "Nothing saved for the day yet."}${j.ai ? "" : " · ⚠ No AI is set up on the server, so no AI grade can be given."}</p>`;
}
window.FTBatchSheet = {
  readCheck,
  autoDone,   // (how a day's activity was found done, or why not: for the tests)
  // 👤 One table per trainee / 📋 By table (kept on this browser), and a trainee's card opened or folded
  view(v){ B.view = v === "tables" ? "tables" : "trainee"; try{ localStorage.setItem("lsh_bs_view", B.view); }catch(err){} render(); },
  // (🔎 a trainee looked up: their page — the one picker beside Batch)
  ptWho(id){ if(id) FTBatchSheet.ptPick(id); },
  // ✗ a link's pop-up: what is wrong with it, and the trainer's fixes
  lkPop(id, k){
    const p = people().find(q => q.id === id); if(!p) return;
    let x; try{ x = linkState(p).L[k]; }catch(err){ return; } if(!x) return;
    const l = (LINKS.find(([q]) => q === k) || [])[1] || "", c = x.c || {};
    const more = x.nf ? "The batch’s Drive was searched and has no such file with their name. They need to make it from the template and link it." : [c.err, c.why ? "Google: " + c.why : ""].filter(Boolean).join(" ");
    const close = () => { const o = document.getElementById("bsLkPop"); if(o) o.remove(); document.removeEventListener("keydown", esc); };
    const esc = ev => { if(ev.key === "Escape") close(); };
    close();
    const o = document.createElement("div"); o.id = "bsLkPop"; o.className = "bs-pop";
    o.innerHTML = `<div class="bs-pop-box" role="dialog" aria-modal="true" aria-label="${e(l)}"><button type="button" class="bs-pop-x" aria-label="Close">✕</button>
      <h4>${e(l)} <span class="bs-mk bs-mk-x">✗</span></h4><p class="bs-pop-who">${e(p.name)}</p>
      <p class="bs-pop-why">${issueWhy(p, {k, l, x})}</p>${more ? `<p class="bs-pop-more">${e(more)}</p>` : ""}
      ${(x.nf && x.nf !== true) || c.at ? `<p class="bs-pop-at">Checked ${e(when(x.nf && x.nf !== true ? x.nf : c.at))}</p>` : ""}
      ${adminOn() ? `<div class="bs-pop-acts">${safeHref(x.link) ? `<a class="btn btn-ghost btn-sm" href="${safeHref(x.link)}" target="_blank" rel="noopener">↗ Open</a>` : ""}${x.link ? `<button class="btn btn-ghost btn-sm" type="button" data-a="mark">✓ Mark OK</button>` : ""}<button class="btn btn-navy btn-sm" type="button" data-a="link">✎ ${x.link ? "Re-link" : "Link"}</button></div>` : ""}</div>`;
    o.addEventListener("click", ev => { const a = ev.target.closest("[data-a]");
      if(ev.target === o || ev.target.closest(".bs-pop-x")) return close();
      if(!a) return; close();
      if(a.dataset.a === "mark") FTBatchSheet.lkMark(id, k, true);
      else { FTBatchSheet.leWho(id); setTimeout(() => { const d = document.querySelector(".bs-le"); if(d) d.scrollIntoView({behavior: "smooth", block: "center"}); }, 300); } });
    document.addEventListener("keydown", esc); document.body.appendChild(o); const b = o.querySelector(".bs-pop-x"); if(b) b.focus();
  },
  // 📝 Send Feedback, in one trainee's table (js/ft-trainer-feedback.js FTFeedback.inline): '' closes it
  fbOpen(id){ B.fbWho = id || ""; if(id) B.pt = id; render(); },
  // 📄 the trainee's page: by the 🔎 dropdown
  ptPick(id){ B.pt = id; B.tt = id; B.ttD = {}; B.fbWho = ""; render(); try{ window.scrollTo({top: (document.querySelector(".bs-pt") || {}).offsetTop - 80 || 0}); }catch(err){} },
  ptGo(i){ const p = people()[i]; if(p) FTBatchSheet.ptPick(p.id); },
  // 📅 / 🟢 / 🎧 a review screen with no button of its own on top (js/ft-program.js adminHidden), in this batch
  review(tab){ if(!adminOn()) return; if(typeof setAdminTab === "function") setAdminTab(tab); else { state.adminTab = tab; render(); } },
  batch(b){ if(!adminOn()) return; B.batch = b; B.picked = true; B.data = null; B.dataKey = ""; render(); },
  refresh(){ B.people = null; B.data = null; B.dataKey = ""; if(typeof state === "object") state.adminData = null; if(window.FTIntake && FTIntake.cardReload) FTIntake.cardReload(); render(); },
  // 🔄 every approved trainee of the batch, one at a time (worker.js redoCompliance): each training day worked out again from
  // what the platform keeps now, their progress included; then the sheet is read again
  // 🔄 Update all scores: everything below, in order (FTBatchSheet.sync)
  updateAll(){ return FTBatchSheet.sync("all"); },
  /* 🔄 each section's Update (and Update all scores, and the sheet itself on opening a batch, at most every 6 hours):
       links    — 🔗 the batch's Drive files found and linked by their naming convention (worker.js autoLinkBatch), then EVERY
                  trainee's links checked (not only the ones with a link already);
       scores / outputs — ✅ today's daily check, now, for every approved trainee: the test screenshots (/api/drive/shots), then
                  the Task Tracker and the Monitoring Sheet with the day's compliance (/api/drive/check: the Monitoring Sheet,
                  the Task Tracker, the Typing & Spelling Tests and the EOD). Past days keep what their end-of-shift check
                  found. (⏪ worker.js backtrack, re-reading every day from Day 1, was the one-time catch-up: not run from here.)
       ranking  — 📊 the Weekly Ranking read again;
       all      — all of it. The sheet is read again at the end. */
  async sync(scope, quiet){
    if(!adminOn() || meOn() || B.sync || !B.batch) return;
    const batch = B.batch, all = people(), appr = all.filter(p => p.status === "Approved");
    const doLinks = /^(all|links)$/.test(scope), doBack = /^(all|scores|outputs)$/.test(scope), doRank = /^(all|ranking|scores|outputs|links)$/.test(scope);
    B.sync = {scope, n: 0, of: 0, what: "Starting"}; render();
    const msgs = []; let bad = 0;
    const step = (what, of) => { B.sync.what = what; B.sync.n = 0; B.sync.of = of || 0; rerender(); };
    if(doLinks){
      step("Finding the batch’s files in Drive");
      try{ const r = await authFetch("/api/drive/autolink", {batch}), j = await r.json().catch(() => null);
        if(j && j.ok){ const n = Object.keys(j.linked || {}).length, miss = Object.keys(j.missing || {}).length;
          msgs.push(n ? `🔗 Linked files for ${n} trainee${n === 1 ? "" : "s"}` : "🔗 No new files to link");
          if(miss) msgs.push(`${miss} trainee${miss === 1 ? " is" : "s are"} still missing a file (see ✅ Compliance)`); }
        else msgs.push("🔗 Couldn’t search Drive" + (j && (j.detail || j.error) ? ": " + String(j.detail || j.error).slice(0, 120) : ""));
      }catch(err){ msgs.push("🔗 Couldn’t search Drive"); }
      step("Checking every trainee’s links", all.length);
      for(const p of all){ try{ await authFetch("/api/drive/verify", {id: p.id}); }catch(err){} B.sync.n++; rerender(); }
      msgs.push(`✓ Checked ${all.length} trainee${all.length === 1 ? "" : "s"}’ links`);
    }
    if(doBack && !isWeekdayIso(ptToday())) msgs.push("No daily check on a weekend: training days are weekdays");
    else if(doBack){
      step("Running today’s check", appr.length);
      for(const p of appr){
        try{ await authFetch("/api/drive/shots", {id: p.id}); }catch(err){}
        try{ const r = await authFetch("/api/drive/check", {id: p.id, ai: false}), j = await r.json().catch(() => null);
          if(!r.ok && !(j && j.code === "no-links")) bad++; }catch(err){ bad++; }
        B.sync.n++; rerender(); }
      msgs.push(`✅ Today’s check run for ${appr.length - bad} of ${appr.length} trainee${appr.length === 1 ? "" : "s"}`);
    }
    try{ localStorage.setItem("ft_bs_sync:" + batch, String(Date.now())); }catch(err){}
    B.sync = null; if(B.batch === batch){ B.data = null; B.dataKey = ""; } render();
    // 📊 then the Weekly Ranking, once the sheet has read the new scores and links back: its platform-filled cells follow them
    // (js/ft-ranking.js fillFromPortal — a NO SUBMISSION from before the files were linked becomes the trainee's compliance)
    if(doRank && window.FTRanking && typeof FTRanking.reload === "function"){
      for(let i = 0; i < 40 && B.batch === batch && !(B.data && B.data.rec); i++) await new Promise(ok => setTimeout(ok, 250));
      try{ FTRanking.reload(); }catch(err){} if(scope === "ranking") msgs.push("📊 Weekly Ranking read again");
      // 📑 and the week's summary for management (its ✅ Compliance, ⏱ Timely Submission… from each day's checks): drafted again
      // from the new scores — a trainer's ✎ edits stay (js/ft-ranking-summary.js draft)
      if(window.FTRankSummary && typeof FTRankSummary.draft === "function"){
        const ready = () => { try{ const c = FTRanking.ctx && FTRanking.ctx(); return c && c.batch && (c.people || []).length ? c : null; }catch(err){ return null; } };
        for(let i = 0; i < 40 && B.batch === batch && !ready(); i++) await new Promise(ok => setTimeout(ok, 250));
        if(ready()){ try{ FTRankSummary.draft(); }catch(err){} msgs.push("📑 Weekly summary updated"); }
      }
    }
    if(!quiet || bad) toast(msgs.join(" · "), 9000);
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
    // (marked under the tidy-up's cleaned key too: a batch spelt "b103026" is checked as done["B103026"], so it isn't archived again)
    try{ const k = "settings:autoarchive", cur = (await sharedGet(k)) || {}, now = new Date().toISOString(), done = Object.assign({}, cur.done || {});
      for(const bk of new Set([B.batch, ...back.map(p => p.key).filter(Boolean)])) done[bk] = done[bk] || now;
      cur.done = done; cur.updatedAt = now; await sharedSet(k, cur); }catch(err){}
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
  kdWho(id){ if(!adminOn()) return; B.kd = id; render(); },
  // 🗄 one account archived from the Drive link issues list (not a trainee, or one who left): its record marked archived, as
  // a batch's archive marks each (js/eapa-updates.js confirmArchiveBatch), read strictly so a failed read never writes over it
  async archiveOne(id, name){
    if(!adminOn() || !id || !confirm(`Archive ${name || id}? They leave this batch's sheet and the link issues list. Admin → Batches can bring them back.`)) return;
    // (sharedGetStrict throws on a failed read — the catch below — and gives null only for no record)
    try{ const got = {ok: true, value: await sharedGetStrict("trainee:" + id)};
      if(!got.ok || !got.value){ toast("Couldn’t read the account. Check your connection."); return; }
      const rec = Object.assign({}, got.value, {archived: true, archivedAt: new Date().toISOString(), archivedBy: "trainer"});
      if(await sharedSet("trainee:" + id, rec) === false){ toast("Couldn’t archive the account. Check your connection."); return; }
      toast(`🗄 ${name || id} archived.`); if(typeof state === "object") state.adminData = null; B.people = null; B.data = null; B.dataKey = ""; render();
    }catch(err){ toast("Couldn’t archive the account. Check your connection."); }
  },
  // ⬇ the Knowledge Checks' breakdown: a row per answer
  kdCsv(){
    if(!B.data || B.dataLoading){ toast("The sheet is still loading."); return; }
    const q = csvQ;
    const lines = [["Trainee", "Knowledge Check", "Score", "How it was scored", "Graded summary", "Trainer's overall comment", "#", "Question", "Answer", "Grade /10", "Feedback", "Trainer's comment"].map(q).join(",")];
    people().forEach(p => kcRows(p).forEach(({k, g}) => { const base = [p.name, k.title, g.pct != null ? g.pct + "%" : "", g.how, (g.last && g.last.summary) || "", (g.rv || {}).comment || ""];
      if(!g.items.length) lines.push(base.map(q).join(","));
      g.items.forEach((it, n) => lines.push(base.concat([n + 1, it.q, it.answer, typeof it.score === "number" ? it.score : "", it.feedback, it.note]).map(q).join(","))); }));
    // (📄 and each assessment, question by question: the points instead of a grade out of 10)
    people().forEach(p => assessRows(p).forEach(x => { const g = x.g || {}, base = [p.name, "📄 " + x.title, g.pct != null ? g.pct + "%" : "", g.score != null ? `${g.score}/${g.max} points` : "not graded yet", "", ""];
      x.items.forEach((it, n) => lines.push(base.concat([n + 1, it.q, it.answer, it.pending ? "to the trainer" : it.pts != null ? it.pts + (it.max != null ? "/" + it.max : "") + " pts" : "", it.note, ""]).map(q).join(","))); }));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], {type: "text/csv"}));
    a.download = meOn() ? `My Knowledge Checks ${(B.me || {}).name || ""} ${new Date().toISOString().slice(0, 10)}.csv` : `Knowledge Checks ${B.batch} ${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  dsWho(id){ if(!adminOn()) return; B.ds = id; render(); },
  // (the compliance table's Drive link picked for a trainee; ▸ More detail open or shut)
  // ▾/▸ the Score Card's (and the compliance table's) folds: a group of columns, all of them, the whole table
  fold(id, gi){ const F = foldOf(id), i = F.g.indexOf(gi); if(i >= 0) F.g.splice(i, 1); else F.g.push(gi); foldRender(id); },
  foldAll(id, on){ if(!B.data || B.dataLoading) return; const T = tables().find(x => x.id === id); if(!T) return; const F = foldOf(id);
    F.g = on ? T.groups.map((g, gi) => g.label && g.span > 1 ? gi : -1).filter(gi => gi >= 0) : []; foldRender(id); },
  hideSec(id){ const F = foldOf(id); F.hide = !F.hide; foldRender(id); },
  more(open){ B.more = !!open; },
  // 📊 Weekly Reports: 📅 the week's report or 📈 Overall Performance
  wkTab(t){ B.wkTab = t === "overall" ? "overall" : "week"; render(); },
  rkSheet(open){ B.rkSheet = !!open; },
  // 🔁 Test again: the connection, then every link of the batch that isn't ✓ checked again now, and what it found
  async dstat(){
    if(!adminOn() || B.dtest) return;
    B.dtest = "Testing the connection…"; render();
    let S = null; try{ const r = await authFetch("/api/drive/status", {}); S = await r.json().catch(() => null); }catch(err){ S = null; }
    B.dstat = S && typeof S === "object" ? S : {err: true};
    if(!S || !S.sa || !S.saOk){ B.dtest = null; toast(S && S.sa ? "Google Drive still can’t sign in: see the banner for why." : "Couldn’t reach Google Drive’s settings. Try again in a minute."); render(); return; }
    const due = B.data ? people().filter(p => { try{ const {L} = linkState(p); return LINKS.some(([k]) => L[k].st !== "none" && !/ok|trainer/.test(L[k].st)); }catch(err){ return false; } }) : [];
    let open = 0, still = 0;
    for(let i = 0; i < due.length; i++){ B.dtest = `Checking links ${i + 1} of ${due.length}…`; render();
      try{ const r = await authFetch("/api/drive/verify", {id: due[i].id}), j = await r.json().catch(() => ({}));
        Object.values((j && j.verify) || {}).forEach(v => { if(v && v.ok) open++; else if(v) still++; }); }catch(err){} }
    B.dtest = null; B.verified = {}; B.data = null; B.dataKey = ""; render();
    toast(due.length ? `✓ Google Drive is connected. Checked ${due.length} trainee${due.length === 1 ? "’s" : "s’"} links again: ${open} open${still ? `, ${still} still can’t be opened or aren’t right (hover over a ✗ for why)` : ""}.` : "✓ Google Drive is connected, and every linked file already opens.", 9000);
  },
  copyShare(){ const t = (document.getElementById("bsShareTo") || {}).textContent || ""; if(!t) return;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("📋 Copied: " + t), () => toast("Couldn’t copy. Select the address instead.")); },
  // 🔁 every trainee of the batch whose links can't be opened: checked again now, then the sheet read again
  recheckLinks(){ return FTBatchSheet.sync("links"); },
  leOpen(o){ if(!adminOn()) return; B.leOpen = !!o; render(); },
  leWho(id){ if(!adminOn()) return; B.le = id; B.leOpen = true; render(); },
  ttOpen(v){ B.ttOpen = !!v; },
  ttWho(id){ if(!adminOn()) return; B.tt = id; B.ttOpen = true; B.ttD = {}; render(); },
  // (what the trainer types in the tools stays put while the sheet redraws — the update on opening runs meanwhile)
  ttKeep(k, v){ (B.ttD = B.ttD || {})[k] = v; },
  async eodGrade(id){
    if(!adminOn()) return;
    const d = (document.getElementById("bsEodD") || {}).value, sc = (document.getElementById("bsEodS") || {}).value, note = (document.getElementById("bsEodN") || {}).value;
    if(!d){ toast("Pick the day."); return; } if(!isWeekdayIso(d) || d > ptToday()){ toast("Pick a training day: a weekday, today or before."); return; } B.ttDay = d;
    if(sc !== "" && !(Number(sc) >= 0 && Number(sc) <= 100)){ toast("The score is 0 to 100."); return; }
    try{ const r = await authFetch("/api/eod/grade", {id, date: d, score: sc === "" ? null : Number(sc), note}), j = await r.json().catch(() => null);
      if(!r.ok || !j || !j.ok){ toast((j && j.error) || "Couldn’t save the EOD score. Try again."); return; }
      B.ttD = {d};
      toast(sc === "" ? `EOD score taken off for ${d}.` : `✍ EOD for ${d} scored ${j.eod}% (the day: ${j.pct}%).`);
    }catch(err){ toast("Couldn’t save the EOD score. Try again."); }
    B.data = null; B.dataKey = ""; render();
  },
  // ⏪ one trainee from Day 1 (worker.js backtrack): every training day read and worked out again — the catch-up, per trainee
  async backtrack(id){
    if(!adminOn() || B.btBusy) return; B.btBusy = true; B.tt = id; B.ttOpen = true; render();
    const nm = (people().find(p => p.id === id) || {}).name || "The trainee";
    try{ const r = await authFetch("/api/drive/backtrack", {id}), j = await r.json().catch(() => null);
      if(!r.ok || !j || !j.ok) throw new Error((j && (j.detail || j.error)) || "backtrack");
      const bits = [j.days ? `${j.days} Task Tracker day${j.days === 1 ? "" : "s"} read again` : j.tracker && j.tracker !== "ok" ? "Task Tracker: " + j.tracker : "",
        j.monitor === "ok" ? "Monitoring Sheet read again" : "", j.shots === "ok" ? "test screenshots read again" : j.shots ? "test screenshots: " + j.shots : "",
        j.redone ? `${j.redone} day${j.redone === 1 ? "" : "s"} worked out again` : ""].filter(Boolean);
      B.btOut = {id, text: `⏪ ${nm}: ${bits.join(" · ") || "nothing to read yet (no Drive links)"}.`}; toast(B.btOut.text, 9000);
    }catch(err){ B.btOut = {id, text: `⏪ Couldn’t backtrack ${nm}: ${String(err && err.message || err).slice(0, 140)}`}; toast(B.btOut.text); }
    B.btBusy = false; B.data = null; B.dataKey = "";
    try{ if(window.FTRanking && FTRanking.reload) FTRanking.reload(); }catch(err){}
    render();
  },
  // ↺ one more attempt at a Knowledge Check, for a system issue (js/ft-process.js FTKCRetry.grant)
  async kcRetry(id){
    if(!adminOn() || B.kcBusy || !window.FTKCRetry) return;
    const v = (document.getElementById("bsKcL") || {}).value || "", why = ((document.getElementById("bsKcWhy") || {}).value || "").trim(), [l, rd] = v.split("|");
    if(!l){ toast("Pick the Knowledge Check."); return; }
    if(!why){ toast("Write the system issue first: it is kept with the retry."); return; }
    B.kcBusy = true; render();
    const nm = (people().find(p => p.id === id) || {}).name || "The trainee";
    try{ const r = await FTKCRetry.grant(id, Number(l), rd === "1", why);
      if(r.ok){ toast(`✓ ${nm} can submit Lesson ${l}’s ${rd === "1" ? "Reading Task" : "Knowledge Check"} once more (${r.used} of ${r.allowed} attempts used).`); B.ttD = Object.assign({}, B.ttD, {kw: ""}); }
      else toast(r.error); }catch(err){ toast("Couldn’t grant the retry. Check your connection."); }
    B.kcBusy = false; render();
  },
  async tamGrade(id){
    if(!adminOn() || B.tamBusy) return;
    const d = (document.getElementById("bsTamD") || {}).value || ptToday();
    if(!isWeekdayIso(d) || d > ptToday()){ toast("Pick the shadowing day: a weekday, today or before."); return; }
    B.tamBusy = true; B.tt = id; render();
    try{ const r = await authFetch("/api/drive/tam", {id, date: d}), j = await r.json().catch(() => null);
      toast(!j ? "Couldn’t read the TAM. Try again." : j.error ? "📘 " + j.error : `📘 TAM for ${d}: ${j.grade ? j.grade.pct + "% (" + j.grade.words + " words)" : "graded"}; the day's compliance is now ${j.pct}%.`);
    }catch(err){ toast("Couldn’t read the TAM. Try again."); }
    B.tamBusy = false; B.data = null; B.dataKey = ""; render();
  },
  async leSave(id, btn){
    if(!adminOn() || B.leBusy) return;
    const box = btn.closest(".bs-le"), vals = {};
    box.querySelectorAll("input[data-k]").forEach(i => { vals[i.getAttribute("data-k")] = String(i.value || "").trim(); });
    const bad = Object.entries(vals).filter(([k, v]) => v && !/^https:\/\/(drive|docs)\.google\.com\//.test(v));
    if(bad.length){ toast("Paste Google Drive links (they start with https://drive.google.com/ or https://docs.google.com/)."); return; }
    B.leBusy = true; B.le = id; render();
    try{
      const cur = (await sharedGet("drive:" + id)) || {}, at = new Date().toISOString();
      const next = Object.assign({}, cur, vals, {linkedBy: "trainer", updatedAt: at});
      Object.keys(vals).forEach(k => { if(vals[k] !== String(cur[k] || "").trim() && next.auto) delete next.auto[k]; });
      if(await sharedSet("drive:" + id, next) === false) throw new Error("save");
      await authFetch("/api/drive/verify", {id}).catch(() => null);
      toast("✓ Saved and checked.");
    }catch(err){ toast("Couldn’t save the links. Try again."); }
    B.leBusy = false; B.data = null; B.dataKey = ""; render();
  },
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
      toast(ok ? "✓ Marked as opening." : "Mark taken off.");
    }catch(err){ toast("Couldn't save. Try again."); }
    render();
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
  async sweepOpen(){
    if(!adminOn()) return;
    B.sweep = {loading: true, skip: {}}; render();
    try{ const r = await authFetch("/api/batch/sweep-list", {}), j = await r.json().catch(() => ({}));
      B.sweep = r.ok && j && Array.isArray(j.accounts) ? {accounts: j.accounts, leftovers: j.leftovers || [], skip: {}} : {err: (j && j.error) || "the server didn’t answer", skip: {}}; }
    catch(err){ B.sweep = {err: "no connection", skip: {}}; }
    render();
  },
  sweepClose(){ if(B.sweep && B.sweep.busy) return; B.sweep = null; render(); },
  sweepPick(id, on){ if(!B.sweep) return; B.sweep.skip[id] = !on; render(); },
  sweepAll(on){ const W = B.sweep; if(!W) return; W.skip = {}; if(!on) W.accounts.concat(W.leftovers).forEach(a => { W.skip[a.id] = true; }); render(); },
  // ⬇ every record of the ticked accounts downloaded as one file first; only then each swept, one at a time
  async sweepGo(){
    const W = B.sweep; if(!adminOn() || !W || W.busy) return;
    const ids = W.accounts.concat(W.leftovers).map(a => a.id).filter(id => !W.skip[id]); if(!ids.length) return;
    if(!confirm(`Sweep ${ids.length} inactive account${ids.length === 1 ? "" : "s"} from the platform?\n\nA backup of all their records downloads first. Then they are removed for good, and a swept account can't sign in again.`)) return;
    const backup = {sweptAt: new Date().toISOString(), accounts: {}}, failed = [];
    for(let i = 0; i < ids.length; i++){ W.busy = `Backing up ${i + 1} of ${ids.length}…`; render();
      try{ const r = await authFetch("/api/batch/sweep", {id: ids[i], dry: true}), j = await r.json().catch(() => ({})); if(r.ok && j.ok) backup.accounts[ids[i]] = {why: j.why, records: j.records}; else failed.push(ids[i]); }
      catch(err){ failed.push(ids[i]); } }
    const go = ids.filter(id => backup.accounts[id]);
    if(!go.length){ W.busy = null; toast("Couldn’t back up any of them, so nothing was swept. Try again."); render(); return; }
    // (the backup is saved on this computer before anything is removed)
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 1)], {type: "application/json"}));
    a.download = `Swept accounts ${new Date().toISOString().slice(0, 10)} (${go.length}).json`; document.body.appendChild(a); a.click(); a.remove();
    let n = 0;
    for(let i = 0; i < go.length; i++){ W.busy = `Sweeping ${i + 1} of ${go.length}…`; render();
      try{ const r = await authFetch("/api/batch/sweep", {id: go[i]}), j = await r.json().catch(() => ({})); if(r.ok && j.ok) n++; else failed.push(go[i]); }
      catch(err){ failed.push(go[i]); } }
    B.sweep = null; state.adminData = null; B.people = null; B.all = null; B.data = null; B.dataKey = "";
    if(window.ftRosterChanged) ftRosterChanged(); else try{ window.dispatchEvent(new Event("ft-roster-changed")); }catch(err){}
    toast(failed.length ? `🧹 Swept ${n}; ${failed.length} couldn’t be (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}): try them again.` : `🧹 Swept ${n} inactive account${n === 1 ? "" : "s"}. The backup is in your Downloads.`, 9000);
    render();
  },
  dupKeep(key, id){ (B.dupKeep = B.dupKeep || {})[key] = id; render(); },
  // 👥 every other account of that person merged into the one kept (worker.js /api/batch/merge), then the batch read again
  async dupMerge(key){
    if(!adminOn() || B.dupBusy) return;
    const g = dupGroups().find(x => slugOf(x[0].name) === key); if(!g) return;
    const keep = (B.dupKeep || {})[key] && g.some(a => a.id === B.dupKeep[key]) ? B.dupKeep[key] : g[0].id, other = g.filter(a => a.id !== keep);
    const k = g.find(a => a.id === keep);
    if(!confirm(`Keep ${k.name}'s account ${keep} (batch ${k.batch}) and merge ${other.map(a => `${a.id} (batch ${a.batch})`).join(", ")} into it?\n\nEverything the other account holds (progress, Knowledge Checks, Drive links, scores, feedback) moves into the one kept, and the other account is deleted. A sign-in to it opens the kept one.`)) return;
    B.dupBusy = key; render(); let ok = 0, err = "";
    for(const a of other){ try{ const r = await authFetch("/api/batch/merge", {from: a.id, into: keep}), j = await r.json().catch(() => ({})); if(r.ok && j.ok) ok++; else err = j.error || "the server refused"; }catch(e2){ err = "no connection"; } }
    B.dupBusy = null; state.adminData = null; B.people = null; B.all = null; B.data = null; B.dataKey = "";
    try{ window.dispatchEvent(new Event("ft-roster-changed")); }catch(e2){}
    toast(ok === other.length ? `✓ Merged into ${keep}: one account for ${k.name}.` : `Couldn’t merge every account (${err}). Try again.`, 7000); render();
  },
  // 🛠 Batch tools, on 🛡 Admin Master Control → 📁 Batches (js/ft-batch-admin.js): the batch's trainees read here as on the sheet
  toolsHtml(){
    if(!adminOn() || meOn()) return "";
    if(!B.people){ if(!B.loading) loadPeople(); return `<div class="card bs-card bs-tools"><p class="sc-empty">Loading the batches…</p></div>`; }
    const bs = batches(); if(!B.batch || !bs.includes(B.batch)){ const lb = latestBatch(); B.batch = lb || bs[bs.length - 1] || ""; }
    const ppl = people();
    return `<div class="card bs-card bs-tools"><h3>🛠 Batch tools</h3>
      <div class="bs-tools-bar"><label>Batch <select onchange="FTBatchSheet.toolsBatch(this.value)">${bs.map(b => `<option ${b === B.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></label>
        <button type="button" onclick="FTBatchSheet.fixOpen()">✏️ Fix the batch name</button><button type="button" onclick="FTBatchSheet.sweepOpen()">🧹 Sweep inactive accounts</button><button type="button" onclick="FTBatchSheet.dateOpen()">✎ Fix a date</button></div>
      ${sweepHtml()}${fixHtml(ppl)}${dateHtml(ppl)}</div>`;
  },
  weeklyActs: weeklyActsHtml,
  toolsBatch(b){ if(!adminOn()) return; B.batch = b; B.picked = true; B.data = null; B.dataKey = ""; B.fix = null; B.dfix = null; render(); },
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
    B.people = null; B.data = null; B.dataKey = ""; B.batch = moved ? to : from; render();
  },
  // 🔗 a trainee's Drive links compliance, % of the six ✓ Correct (📊 the Weekly Ranking's Drive Links Compliance column)
  linksPct(id){ try{ if(!B.data || !B.data.rec || !B.data.rec[id]) return null; const p = people().find(x => x.id === id); if(!p) return null;
    const {L} = linkState(p); if(LINKS.every(([q]) => L[q].st === "none")) return null;
    return Math.round(LINKS.filter(([q]) => /ok|trainer/.test(L[q].st)).length / LINKS.length * 100); }catch(err){ return null; } },
  // ▸/▾ Daily outputs: a trainee's row, a day's column, all of them
  ofRow(id){ const F = ofold(); F.rows[id] = !rowOpen(id); ofoldSave(); rerender(); },
  ofDay(d){ const F = ofold(); if(F.days[d]) delete F.days[d]; else F.days[d] = true; ofoldSave(); rerender(); },
  ofAll(open){ const F = ofold(); people().forEach(p => { F.rows[p.id] = open; }); ofoldSave(); rerender(); },
  ofDays(shut){ const F = ofold(); F.days = {}; if(shut){ const ds = new Set(); people().forEach(p => Object.keys(((((B.data || {}).rec || {})[p.id] || {}).src || {})["trackerreview:"]?.compliance || {}).forEach(d => ds.add(d))); ds.forEach(d => { F.days[d] = true; }); } ofoldSave(); rerender(); },
  go(id){ const el = document.getElementById("bs-" + id); if(el) el.scrollIntoView({behavior: "smooth", block: "start"}); return false; },
  pick(td){
    if(!B.data) return; const T = td.getAttribute("data-t") === "ov" ? overallTable() : tables()[Number(td.getAttribute("data-t"))]; if(!T) return;
    const r = Number(td.getAttribute("data-r")), c = Number(td.getAttribute("data-c")), cell = (T.rows[r] || [])[c]; if(!cell) return;
    document.querySelectorAll(".bs-card .gs td.gs-sel").forEach(x => x.classList.remove("gs-sel")); td.classList.add("gs-sel");
  },
  csv(only){
    if(!B.data || B.dataLoading){ toast("The sheet is still loading."); return; }
    const pick = only === "overall" && adminOn() && !meOn() ? [overallTable()] : typeof only === "string" && only ? tables().filter(T => T.id === only) : null;
    if(pick && !pick.length){ toast("That scorecard isn’t on the page."); return; }
    const q = csvQ;
    const lines = [];
    (pick || tables()).forEach(T => { lines.push(q(T.title.replace(/^\S+\s/, ""))); lines.push(T.head.map(q).join(",")); T.rows.forEach(r => lines.push(r.map(c => q(c.csv != null ? c.csv : c.v)).join(","))); lines.push(""); });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], {type: "text/csv"}));
    const what = pick ? " " + pick[0].title.replace(/^\S+\s/, "").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60) : "";
    a.download = meOn() ? `My Progress${what} ${(B.me || {}).name || ""} ${new Date().toISOString().slice(0, 10)}.csv` : `Batch Sheet ${B.batch}${what} ${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  // for the checks
  tables: () => B.data && !B.dataLoading ? tables() : null,
  events: () => B.data ? events() : null
};
/* ✎ A TRAINER'S EDIT IN PLACE (🏅 Grades, a trainee's page): the score is written where that grade's trainer's score already
   lives, so every scorecard reads it as theirs — 🏅 Scorecard (js/lsh-program.js compute), this sheet's tables, the trainee's
   📋 My Progress and the Weekly Ranking on its next ⤓ Fill:
     kc:<lesson> / kcread:<lesson>  kcreview:<id>.lessons|read[lesson].score (the trainer's final score; 70% passes the lesson)
     act:<activity>                 labreview:<id>.acts[activity].score, merged into what 🧑‍🏫 Graders saved (the Result follows
                                    the score, js/ft-rubrics.js ftResult; a Transcription recording's automatic score gives way)
     run:<session|case>             labreview:<id>.sessions[key].score, for the attempt on screen (as 🟢 Practice Sessions saves it)
     monitor                        trackerreview:<id>.monitor.trainerScore (as 📁 Drive Trackers saves it)
     assess:<doc> / items:<n-n>     labreview:<id>.overrides[ref] (no trainer's field of their own: js/lsh-program.js setOverride)
   An empty field takes the trainer's score off: the automatic one counts again. Every write reads the record fresh and strictly
   (a failed read saves nothing). An edit keeps the record's own time (at): editedAt says when it was edited. */
const nowIso = () => new Date().toISOString();
async function strictWrite(key, mut){
  const cur = (await sharedGetStrict(key)) || {};
  if(mut(cur) === false) return cur;
  if(await sharedSet(key, cur) === false) throw new Error("save");
  return cur;
}
FTBatchSheet.editScore = async function(pid, ref, value, note){
  if(!adminOn() || meOn()) return false;
  ref = String(ref || ""); const raw = String(value == null ? "" : value).trim();
  if(!(window.lshProgram && lshProgram.editable(ref))){ toast("This score can't be edited here."); return false; }
  if(raw !== "" && !(isFinite(Number(raw)) && Number(raw) >= 0 && Number(raw) <= 100)){ toast("A score is a number from 0 to 100."); return false; }
  const v = raw === "" ? null : Math.round(Number(raw)), m = /^([a-z]+):(.+)$/.exec(ref) || [null, ref, ""], kind = m[1], arg = m[2];
  const R = ((B.data || {}).rec || {})[pid] || {};
  try{
    if(kind === "kc" || kind === "kcread") await strictWrite("kcreview:" + pid, cur => {
      const box = kind === "kc" ? (cur.lessons = cur.lessons || {}) : (cur.read = cur.read || {});
      if(v == null && !box[arg]) return false;
      // (kept with its score emptied when cleared: ✍️ Knowledge Check then gives the lesson its graded best again)
      box[arg] = Object.assign({}, box[arg] || {}, {score: v, editedAt: nowIso(), by: "trainer"}); });
    else if(kind === "act") await strictWrite("labreview:" + pid, cur => {
      const acts = cur.acts = cur.acts || {}, old = acts[arg];
      if(v == null && !old) return false;
      // (a recording's automatic score, the first time a trainer scores it here: its date is the work's)
      const tr = /^transcription-([12])$/.exec(arg), g = tr ? ((((R.src || {})["trackerreview:"] || {}).transcribe) || {})[tr[1]] : null;
      const next = Object.assign({}, old || {date: ((g && g.at) || nowIso()).slice(0, 10), at: (g && g.at) || nowIso()}, {score: v, scoreEdited: v != null, editedAt: nowIso(), by: "trainer"});
      // (the Result follows the new score — Passed at 60%, Failed under it — unless the trainer asked for a Redo; cleared, Not yet)
      next.status = window.ftResult ? ftResult(Object.assign({}, next, {status: undefined})) : v == null ? "Not yet" : v >= 60 ? "Passed" : "Failed";
      acts[arg] = next; });
    else if(kind === "run") await strictWrite("labreview:" + pid, cur => {
      const ses = cur.sessions = cur.sessions || {}, old = ses[arg], run = ((((R.src || {})["sessions:"] || {}).runs) || {})[arg] || {};
      if(v == null && !old) return false;
      // (for the attempt on screen: an older attempt's review — and its comment — doesn't carry over to a session submitted again)
      const same = old && (old.attempt != null ? Number(old.attempt) === Number(run.attempts) : !(run.submittedAt && old.at && Date.parse(run.submittedAt) > Date.parse(old.at)));
      const base = same ? old : {};
      ses[arg] = Object.assign({}, base, {attempt: run.attempts ?? null, score: v, at: base.at && !(run.submittedAt && Date.parse(run.submittedAt) > Date.parse(base.at)) ? base.at : nowIso(), editedAt: nowIso(), by: "trainer"}); });
    else if(kind === "monitor"){ if(!window.FTDrive || !FTDrive.saveTrainerScore) throw new Error("drive"); await FTDrive.saveTrainerScore(pid, "monitor", raw, null); }
    else if(kind === "assess" || kind === "items") await lshProgram.setOverride(pid, ref, {pct: v, note});
    else throw new Error("ref");
  }catch(err){ toast("Couldn’t save the score. Check your connection and try again."); return false; }
  toast(v == null ? "✓ The trainer's score was taken off: the automatic score counts again." : `✓ Saved ${v}%. Every scorecard shows it now (the Weekly Ranking on its next ⤓ Fill).`);
  B.dataKey = ""; rerender();
  return true;
};
// (a row's fields: the score, and — on an override — the note beside it)
// (✎ Edit a score: the grade picked)
FTBatchSheet.edPick = function(pid, ref){ B.edSel = B.edSel || {}; B.edSel[pid] = ref; rerender(); };
FTBatchSheet.editRow = function(el){
  const tr = el && el.closest("tr"); if(!tr) return;
  const sc = tr.querySelector("input.bs-ed[data-ref]"), nt = tr.querySelector("input.bs-ed-note[data-ref]");
  if(!sc) return;
  return FTBatchSheet.editScore(sc.getAttribute("data-pid"), sc.getAttribute("data-ref"), sc.value, nt ? nt.value : "");
};
// + the points on the Scorecard overall, with their note (empty or 0: none)
FTBatchSheet.editExtra = async function(el){
  if(!adminOn() || meOn()) return false;
  const tr = el && el.closest("tr"); if(!tr || !window.lshProgram || !lshProgram.setExtra) return false;
  const pt = tr.querySelector("input.bs-ed[data-extra]"), nt = tr.querySelector("input.bs-ed-note[data-extra]"), raw = String(pt.value || "").trim();
  if(raw !== "" && !(isFinite(Number(raw)) && Number(raw) >= -100 && Number(raw) <= 100)){ toast("Points are a number from -100 to 100."); return false; }
  try{ await lshProgram.setExtra(pt.getAttribute("data-pid"), {points: raw, note: nt ? nt.value : ""}); }
  catch(err){ toast("Couldn’t save the points. Check your connection and try again."); return false; }
  toast(raw === "" || Number(raw) === 0 ? "✓ No points added." : `✓ Saved. The Scorecard overall has the ${raw} point${Number(raw) === 1 ? "" : "s"} on it (100% at most).`);
  B.dataKey = ""; rerender();
  return true;
};

ftAdminTab(TAB, "📋 Batch Sheet", renderSheet);
ftAdminTab(WEEKLY, "📊 Weekly Reports", renderSheet);
ftAdminTab(LINKSTAB, "🔗 Drive Links", renderSheet);

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
  // (🏅 My Performance and 📋 My Progress are one page: the grades from every grading system first, then the sheet)
  const perf = window.lshProgram && typeof lshProgram.performanceHtml === "function" ? `<div class="bs-perf">${lshProgram.performanceHtml()}</div>` : "";
  return `${perf}<div class="card gs-card bs-card bs-mine">
    <div class="gs-top"><div class="gs-file"><b>My Progress · ${e(B.me.name)}</b>
      <span class="gs-menu"><button onclick="FTBatchSheet.csv()">⬇ Download</button><button onclick="FTBatchSheet.refreshMe()">↻ Refresh</button>${window.FTTraineeLog ? `<button onclick="FTTraineeLog.open()">📜 My Log</button>` : ""}</span></div>
      ${B.me.batch ? `<span class="gs-batch">Batch <b>${e(bLabel(B.me.batch))}</b></span>` : ""}</div>
    <div class="bs-sum"><span class="bs-jump">Go to: <a href="#bs-scorecard" onclick="return FTBatchSheet.go('scorecard')">🏅 Score Card</a> · <a href="#bs-compliance" onclick="return FTBatchSheet.go('compliance')">✅ Compliance</a> · <a href="#bs-outputs" onclick="return FTBatchSheet.go('outputs')">📤 Daily outputs</a> · <a href="#bs-ranking" onclick="return FTBatchSheet.go('ranking')">📊 My Weekly Report</a></span>
      ${D && D.at ? `<span class="bs-at">${ready && B.dataLoading ? "Updating…" : `Updated ${e(D.at.toLocaleTimeString())}`}</span>` : ""}</div>
    ${!D || B.dataLoading ? `<p class="sc-empty">Reading your progress…</p>` : D.error ? `<p class="sc-empty">Couldn't read your progress. Press ↻ Refresh.</p>`
      : sectionsHtml(T)}
    <p class="sc-how bs-how">Only you (and your trainer) see this page. It shows what the platform records as you work: your lesson decks, Knowledge Checks, practice and scores.</p></div>`;
}
FTBatchSheet.refreshMe = function(){ if(!meOn()) return; B.me = null; B.data = null; B.dataKey = ""; render(); };

// #/mysheet: a trainee's own page; anyone else is sent to the 📚 Dashboard
const __routeRender = window.render;
window.render = function(){
  // (🏅 My Performance, #/scorecard, is now part of this page: a trainee who opens it lands here)
  if(state.view === "scorecard" && isTrainee()){ state.view = ME; try{ if(typeof syncRouteHash === "function") syncRouteHash(); }catch(err){} }
  if(state.view !== ME) return __routeRender.apply(this, arguments);
  if(!isTrainee()){ state.view = "modules"; return __routeRender.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-dash">${renderMine()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {[ME]: "My Progress & Performance"});
// 📋 My Progress in a trainee's top bar (never an admin's), beside 🏅 My Performance
const __top = window.renderTopbar;
window.renderTopbar = function(){
  const html = __top.apply(this, arguments);
  if(!isTrainee()) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  const nav = t.content.querySelector(".topbar .nav"); if(!nav || nav.querySelector(".bs-mybtn")) return html;
  const btn = `<button type="button" class="lp-sec bs-mybtn${state.view === ME ? " active" : ""}" onclick="goto('${ME}')" title="Your grades from every grading system and your progress on one page: lessons, Knowledge Checks, practice and scores">📋 My Progress &amp; Performance</button>`;
  // (🏅 My Performance has no entry of its own any more: it is on this page)
  [...t.content.querySelectorAll('.topbar .nav button, .topbar .nav a')].forEach(b => { if(!b.classList.contains("bs-mybtn") && /goto\('scorecard'\)|lshProgram\.scorecard\(\)/.test(b.getAttribute("onclick") || "")) b.remove(); });
  const portal = nav.querySelector(".lp-portal");
  if(portal) portal.insertAdjacentHTML("beforebegin", btn); else nav.insertAdjacentHTML("beforeend", btn);
  if(state.view === ME) [...nav.children].forEach(b => { if(/goto\('modules'\)/.test(b.getAttribute("onclick") || "") && !b.classList.contains("bs-mybtn")) b.classList.remove("active"); });
  return t.innerHTML;
};

// the page is wide while the Batch Sheet is open: more room for the tables
const __render = window.render;
window.render = function(){
  // (the Scorecard left: it opens on the latest batch again next time)
  // (🛡 Admin Master Control → 📁 Batches' 🛠 Batch tools keep the batch the trainer was on)
  try{ if(!on() && !toolsOn() && B.picked && !meOn()){ B.picked = false; B.batch = ""; B.data = null; B.dataKey = ""; } }catch(err){}
  // (a redraw of the same page keeps its place: a background update empties the sheet for a moment — "Loading…" — and the
  //  browser would jump to the top; only opening another page, tab or batch starts at the top)
  let key = "", y = 0;
  try{ key = on() ? [state.view, state.adminTab, B.batch].join("|") : ""; y = B.keepY || 0; }catch(err){}
  const same = key && key === B.keepKey;
  B.drawing = true;
  let out; try{ out = __render.apply(this, arguments); } finally { B.drawing = false; }
  // (🧑‍🏫 Graders' scoresheets and 🗂 Intake Packets are wide too: the criterion, the score and the Remarks across the screen)
  try{ document.body.classList.toggle("bs-wide", on() || (state.view === "admin" && (state.adminTab === "graders" || state.adminTab === "intake"))); }catch(err){}
  B.keepKey = key;
  if(!same) B.keepY = key ? window.scrollY : 0;
  else if(y && Math.abs(window.scrollY - y) > 2){ window.scrollTo(0, y); requestAnimationFrame(() => { if(B.keepKey === key && B.data && Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y); }); }
  return out;
};
// (where the page is: remembered while the sheet is on screen — not while it's being redrawn or still loading)
window.addEventListener("scroll", () => { try{ if(!B.drawing && B.keepKey && (B.data || (meOn() && B.me)) && on()) B.keepY = window.scrollY; }catch(err){} }, {passive: true});

// 🟦 the dark page banner (the Weekly Progress Report's look): Legal Support Help · Foundational Training, the page's
// name, and Batch · Week · its dates under it; js/ft-batch-admin.js (🧑‍🏫 Graders) draws it too
// 🟦 the same banner over 📘 Curriculum, 📒 Feedback and Monitoring Rubric and 🗣 Feedback Style (📚 Open Lessons' other tabs), put
// under the tab row after each draw: their pages are drawn elsewhere (js/ft-curriculum…, js/ft-monitoring.js, js/ft-activities.js)
const BANNER_TABS = {curriculum: "Curriculum", monitor: "Feedback and Monitoring Rubric", fbstyle: "Feedback Style"};
(function(){ const was = window.afterRender;
  window.afterRender = function(){ const out = was ? was.apply(this, arguments) : undefined;
    try{ const t = typeof state === "object" && state.view === "admin" && state.isAdmin ? BANNER_TABS[state.adminTab] : "";
      if(t && !document.querySelector(".ft-banner[data-tab]")){ const bar = document.querySelector(".lp-admin-tabs") || document.querySelector(".admin-tabs");
        if(bar){ bar.insertAdjacentHTML("afterend", window.ftBanner(t, "", "").replace('<div class="ft-banner">', `<div class="ft-banner" data-tab="${state.adminTab}">`)); } } }catch(err){}
    return out; };
})();
// (controls: the controls in the banner, under its title — 📋 Batch Sheet's; opts.week: the week to show, 1–6, instead of this
// week — 🧑‍🏫 Graders' Week dropdown; opts.cls: a class on the banner. An object as the 4th argument is opts.)
window.ftBanner = function(title, batch, right, controls, opts){
  if(controls && typeof controls === "object"){ opts = controls; controls = ""; }
  const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  opts = opts || {};
  let wk = "";
  const s0 = batch && typeof batchStartDate === "function" ? batchStartDate(batch) : "", t0 = s0 ? Date.parse(s0 + "T00:00:00Z") : NaN;
  if(isFinite(t0)){
    const today = window.FTTrackerRules ? FTTrackerRules.ptDate() : new Date().toISOString().slice(0, 10);
    const n = Number(opts.week) >= 1 ? Math.min(6, Math.floor(Number(opts.week))) : window.ftWeeks ? ftWeeks.now(batch, today) : Math.max(1, Math.min(6, Math.floor((Date.parse(today + "T00:00:00Z") - t0) / (7 * 864e5)) + 1));
    const r = window.ftWeeks ? ftWeeks.range(batch, n) : null, a = r ? Date.parse(r[0] + "T00:00:00Z") : t0 + (n - 1) * 7 * 864e5, z = r ? Date.parse(r[1] + "T00:00:00Z") : a + 6 * 864e5;
    const f = ms => new Date(ms).toLocaleDateString(undefined, {month: "long", day: "numeric", year: "numeric", timeZone: "UTC"});
    wk = ` · Week <b>${n}</b> · ${esc(f(a))} – ${esc(f(z))}`;
  }
  return `<div class="ft-banner${opts.cls ? " " + esc(opts.cls) : ""}"><div><p class="ft-banner-k">Legal Support Help · Foundational Training</p><h2>${title}</h2>
    ${batch ? `<p class="ft-banner-sub">Batch <b>${esc(batch)}</b>${wk}</p>` : ""}</div>${right ? `<div class="ft-banner-right">${right}</div>` : ""}${controls ? `<div class="ft-banner-ctl">${controls}</div>` : ""}</div>`;
};
(function(){ const s = document.createElement("style"); s.id = "ft-batch-sheet"; s.textContent = `
.ft-banner{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;padding:16px 18px;border-radius:12px;background:linear-gradient(135deg,#1E2340,#33406B);color:#fff;margin:0 0 12px;}
.ft-banner h2{margin:2px 0 !important;font:800 26px 'Fraunces',Georgia,serif !important;color:#fff !important;}
.ft-banner .ft-banner-k{margin:0 !important;font:800 12px Arial,sans-serif !important;letter-spacing:.08em;text-transform:uppercase;color:#F6C08F !important;}
.ft-banner .ft-banner-sub{margin:2px 0 0 !important;color:#E8ECF7 !important;font:600 15px Arial,sans-serif !important;} .ft-banner .ft-banner-sub b{color:#fff !important;}
.bs-wkswitch{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px;padding:10px 14px 0;}
.bs-wkswitch button{font:800 15px Arial,sans-serif;padding:8px 16px;border-radius:999px;border:2px solid #33406B;background:#fff;color:#1E2340;cursor:pointer;}
.bs-wkswitch button.on{background:#1E2340;color:#fff;} .bs-ovtools{margin:0 0 8px;}
.ft-banner-ctl{flex-basis:100%;margin-top:6px;} .bs-ctl .gs-top{background:transparent !important;padding:0 !important;margin:0 !important;}
.bs-ctl .bs-batchmenu label{color:#fff !important;} .bs-ctl .bs-at{color:#E8ECF7 !important;}
.bs-ctl .gs-menu button{border-color:#fff !important;} .bs-ctl .gs-menu button.bs-upd-all{background:#DB8437 !important;border-color:#DB8437 !important;color:#fff !important;}
.ft-banner-right{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.ft-banner-right span{font:800 13px Arial,sans-serif;padding:4px 11px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.35);color:#fff;}
.ft-banner-right span.warn{background:#fef3c7;border-color:#fef3c7;color:#78350f;}
body.bs-wide main{max-width:none !important;padding-left:6px;padding-right:6px;}
/* (wider still: the panels around the sheet keep thin sides, so the tables have the window's width) */
body.bs-wide .ft-admin-screen{padding-left:10px;padding-right:10px;}
body.bs-wide .bs-card{padding-left:10px !important;padding-right:10px !important;}
body.bs-wide .bs-pt-wrap{padding-left:4px;padding-right:4px;}
body.bs-wide .ftis-admin{padding-left:12px !important;padding-right:12px !important;}   /* (📦 Intake Packets, wide the same way) */
.bs-readchk{margin-top:6px;}
.bs-rc-wrap{position:fixed;inset:0;background:rgba(10,15,35,.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;}
.bs-rc{max-width:980px;width:100%;padding:18px 20px;font:15px/1.5 Arial,sans-serif;} .bs-rc-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.bs-rc h4{margin:14px 0 4px;color:#1E2340;} .bs-rc pre{white-space:pre-wrap;background:#F6F7FB;border:1px solid #E1E5EE;border-radius:8px;padding:8px 10px;max-height:260px;overflow:auto;font:13px/1.45 Consolas,monospace;}
.bs-rc-bad{color:#B42318;font-weight:700;}
/* (a trainee's day in sections: each section's heading a band across the table, a scorecard's criteria indented under it) */
.bs-parts tr.bs-parts-g th{background:#E8ECF6;color:#1E2340;text-align:left;font:800 14px Arial,sans-serif;letter-spacing:.02em;padding:6px 10px;border-top:2px solid #AEB6C6;}
.bs-parts tr.bs-parts-g.bs-parts-top th{background:#1E2340;color:#fff;font-size:14.5px;padding:7px 10px;}
.bs-parts tr.bs-parts-g .bs-parts-gv{float:right;font-weight:700;color:#FDE68A;}
.bs-parts tr.bs-parts-c td{background:#F8FAFD;font-size:14px;} .bs-parts tr.bs-parts-c td.bs-parts-n{padding-left:26px;color:#3C4043;font-weight:600;}
/* (🏅 Grades' parts: a light band across the table) */
.bs-pt-t tr.bs-pt-gsub td{background:#E9ECF5;color:#1E2340;font-weight:800;font-size:15px;padding:6px 10px;}
:is(.bs-card,.bs-ctl) .gs-file b{font-size:17px;white-space:nowrap;}
:is(.bs-card,.bs-ctl) .gs-top{flex-wrap:nowrap;gap:10px;align-items:center;overflow-x:auto;}
:is(.bs-card,.bs-ctl) .gs-file{flex-direction:row;align-items:center;gap:10px;min-width:0;flex:0 1 auto;}
:is(.bs-card,.bs-ctl) .gs-top .gs-menu{margin-top:0;}
:is(.bs-card,.bs-ctl) .bs-batchmenu{flex-wrap:nowrap !important;margin-left:auto;white-space:nowrap;}
:is(.bs-card,.bs-ctl) .bs-batchmenu label{font-size:15px !important;} :is(.bs-card,.bs-ctl) .bs-batchmenu select{font-size:15px !important;padding:5px 9px !important;}
:is(.bs-card,.bs-ctl) .bs-who-top select{min-width:190px !important;} :is(.bs-card,.bs-ctl) .bs-batchmenu .bs-at{font-size:12.5px !important;}
.bs-sum{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;padding:8px 14px 10px;background:#F9FBFD;font:14px Arial,sans-serif;color:#1F1F1F;}
.bs-sum b{font-size:16px;} .bs-wait{color:#B06000;} .bs-at{margin-left:auto;color:#5F6368;font-size:12.5px;}
.bs-jump a{color:#1A73E8;text-decoration:none;font-weight:700;} .bs-jump a:hover{text-decoration:underline;}
.bs-sec{padding:14px 14px 4px;border-top:1px solid #E1E3E1;scroll-margin-top:12px;}
.gs-batch.bs-batchmenu{gap:8px;flex-wrap:wrap;} .bs-batchmenu label{display:inline-flex;align-items:center;gap:6px;} .bs-archive{white-space:nowrap;}
.bs-h{margin:0 0 2px;font:700 18px Arial,sans-serif;color:#1F1F1F;} .bs-h span{font:400 13px Arial,sans-serif;color:#5F6368;margin-left:6px;}
.bs-note{margin:0 0 8px;font:13.5px Arial,sans-serif;color:#444746;}
.bs-period select{font:700 13.5px Arial,sans-serif;padding:3px 6px;border:1px solid #C4C7C5;border-radius:4px;margin:0 6px 0 4px;}
.bs-wrap{max-height:none;border:1px solid #E1E3E1;border-radius:4px;}
.bs-card .gs{font-size:16px;} .bs-card .gs th,.bs-card .gs td{height:30px;padding:7px 11px;}
/* (bold and bigger: the trainer reads the scorecards on a projector and across the room) */
.bs-card .gs td{font-weight:700;color:#141A2E;} .bs-card .gs .gs-head th{font:800 15.5px Arial,sans-serif;color:#141A2E;} .bs-card .gs td.gs-name{font-weight:800;}
.bs-card .gs .gs-group th{font-size:14.5px;} .bs-card .bs-h{font:800 21px Arial,sans-serif;} .bs-card .bs-note{font:600 14.5px Arial,sans-serif;color:#2E3450;}
.bs-kdw .bs-dl{margin-left:10px;} .bs-kd-p{margin:12px 0 18px;} .bs-kd-p h5{margin:0 0 6px;font:800 17px Arial,sans-serif;color:#141A2E;} .bs-kd-p h5 em{font-style:normal;margin-left:8px;padding:2px 9px;border-radius:999px;font-size:14px;} .bs-kd-p h5 small{font:600 13px Arial,sans-serif;color:#5F6368;margin-left:6px;}
.bs-kd-rep{white-space:pre-wrap;margin:8px 0 10px;padding:10px 14px;background:#2E3A75;border-left:6px solid #8EA2FF;border-radius:8px;font:800 14.5px Arial,sans-serif;color:#fff;}
/* (✍️ Knowledge Checks, 📄 Assessments and 📝 Activities: a coloured band each, so the three groups stand apart) */
.bs-kd-sub.bs-kd-sub-as,.bs-kd-sub.bs-kd-sub-act{margin:18px 0 8px;padding:9px 14px;border-radius:8px;color:#fff;font:800 16px Arial,sans-serif;}
.bs-kd-sub.bs-kd-sub-as{background:#0F766E;border-left:6px solid #5EEAD4;}
.bs-kd-items{margin:6px 0 10px;padding-left:4px;list-style:none;font:600 13.5px/1.45 Arial,sans-serif;color:#1E2340;}
.bs-kd-items li{padding:2px 0;} .bs-kd-items li.is-ok b{color:#15803D;} .bs-kd-items li.is-no b{color:#B91C1C;} .bs-kd-items li.is-wait b{color:#9A5B00;}
.bs-kd-none{margin:6px 0;color:#5A6175;font:600 13px Arial,sans-serif;}
.bs-kd-sub.bs-kd-sub-act{background:#B45309;border-left:6px solid #FCD34D;}
.bs-kd{margin:8px 0;border:1px solid #E1E3E1;border-radius:10px;background:#fff;padding:0 14px;} .bs-kd > summary{cursor:pointer;padding:10px 0;font:700 15.5px Arial,sans-serif;color:#1E2340;} .bs-kd > summary small{font:600 13px Arial,sans-serif;color:#5F6368;margin-left:6px;}
.bs-kd-pill{display:inline-block;margin-left:8px;padding:2px 10px;border-radius:999px;font:800 14px Arial,sans-serif;background:#EEF0F6;}
.bs-kd-q{margin:6px 0 12px;padding-left:22px;font:14px Arial,sans-serif;color:#1F1F1F;} .bs-kd-q > li{margin:0 0 12px;} .bs-kd-q > li > b{font-weight:800;}
.bs-kd-a{margin:4px 0;padding:6px 10px;background:#F7F8FA;border-radius:6px;}
/* (larger and bold for the trainer to read at a glance: the question, the trainee's answer, the score and its feedback) */
.bs-kd-q{font-size:19px;line-height:1.55;} .bs-kd-q > li > b{font-size:19.5px;} .bs-kd-a{font-weight:600;font-size:18.5px;color:#141A2E;}
.bs-kd-fb{font-weight:700;font-size:18.5px;line-height:1.5;} .bs-kd-fb > b{font-size:20px;margin-right:4px;} .bs-kd > summary{font-size:18px;}
.bs-kd-mix{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px 12px;} .bs-kd-mix > li{grid-column:1/-1;}
.bs-kd-mix > li.bs-kd-s{grid-column:auto;list-style:none;margin:0;padding:8px 10px;border:1px solid #E1E3E1;border-radius:8px;background:#fff;} .bs-kd-mix > li.bs-kd-s small{display:block;font-size:12px;color:#5F6368;}
.bs-kd-mix > li.bs-kd-s .bs-kd-a,.bs-kd-mix > li.bs-kd-s .bs-kd-fb{margin:4px 0 0;padding:4px 8px;}
@media (max-width: 1000px){ .bs-kd-mix{grid-template-columns:repeat(3,minmax(0,1fr));} } @media (max-width: 560px){ .bs-kd-mix{grid-template-columns:repeat(2,minmax(0,1fr));} } .bs-kd-fb{margin:4px 0;padding:6px 10px;border-radius:6px;background:#F1F3F4;border-left:4px solid #9AA0A6;} .bs-kd-fb.gs-hi{border-left-color:#1A73E8;} .bs-kd-fb.gs-mid{border-left-color:#E8A400;} .bs-kd-fb.gs-lo{border-left-color:#D93025;}
.bs-arch1{margin-left:8px;padding:2px 10px;font-size:12px;} .bs-kd-sub{margin:16px 0 4px;font:800 16px Arial,sans-serif;color:#1E2340;} .bs-kd-note{margin:4px 0;padding:6px 10px;border-radius:6px;background:#FFF8E1;font-weight:700;}
.bs-upd{margin-left:12px;border:1px solid #1E2340;background:#1E2340;color:#fff;border-radius:999px;padding:4px 12px;font:700 13px Arial,sans-serif;cursor:pointer;vertical-align:3px;}
.bs-upd:disabled{background:#EEF0F6;color:#3A4058;border-color:#C9CEDD;cursor:progress;}
.bs-ed-pick{width:100%;max-width:100%;font:700 13.5px Arial,sans-serif;padding:4px 6px;border:2px solid #3B4A8C;border-radius:8px;color:#1E2340;}
.bs-le{margin:10px 14px 8px;border:1px solid #E1E3E1;border-radius:10px;background:#FAFBFC;padding:0 14px;} .bs-le > summary{cursor:pointer;padding:10px 0;font:700 15px Arial,sans-serif;color:#1E2340;}
.bs-le[open]{padding-bottom:12px;} .bs-le-rows{display:flex;flex-direction:column;gap:8px;margin:8px 0;} .bs-le-row{display:grid;grid-template-columns:220px minmax(0,1fr);gap:4px 12px;align-items:center;font:700 14px Arial,sans-serif;}
.bs-le-row input{font:14px Arial,sans-serif;padding:7px 9px;border:1px solid #C4C7C5;border-radius:6px;min-width:0;} .bs-le-row small{grid-column:2;color:#5F6368;font-weight:600;}
@media (max-width:700px){ .bs-le-row{grid-template-columns:1fr;} .bs-le-row small{grid-column:1;} }
:is(.bs-card,.bs-ctl) .gs-head th{max-width:220px;min-width:110px;word-break:normal;overflow-wrap:normal;hyphens:none;}
#bs-lessons .gs-head th{min-width:170px;}
.bs-lesson{text-align:center;white-space:nowrap;}
:is(.bs-card,.bs-ctl) .gs-txt{min-width:260px;max-width:520px;}
.bs-none{color:#5F6368;font-style:italic;text-align:left !important;}
.bs-how{font-size:13.5px;}
.bs-ck{margin:12px 0 6px;} .bs-ck h4{margin:0 0 4px;font:700 16px Arial,sans-serif;}
.gs .gs-fold{display:none;}
.gs .gs-group th.gs-shut{max-width:150px;overflow:hidden;text-overflow:ellipsis;}
.bs-fold-g{all:unset;cursor:pointer;display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .bs-fold-g:hover{text-decoration:underline;} .bs-fold-g:focus-visible{outline:2px solid #F4B77A;outline-offset:2px;}
.bs-fold-sec{border:0;background:none;cursor:pointer;font-size:15px;color:#1E2340;padding:0 4px 0 0;vertical-align:1px;}
.bs-fold-all{margin-left:10px;border:1px solid #C4C7C5;background:#fff;border-radius:999px;padding:3px 10px;font:700 12px Arial,sans-serif;color:#1E2340;cursor:pointer;vertical-align:2px;} .bs-fold-all:hover{border-color:#DB8437;color:#B5651F;}
.bs-hidden{padding-bottom:12px;}
.gs .gs-group th{background:#1E2340;color:#fff;font:700 13px Arial,sans-serif;text-align:left;padding:5px 10px;border-left:2px solid #fff;white-space:nowrap;} .gs .gs-group th.gs-g2{background:#33406B;}
.gs td.bs-lk{white-space:nowrap;text-align:center;cursor:help;}
.bs-view{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 12px;font:13.5px Arial,sans-serif;} .bs-view > span{font-weight:700;color:#1E2340;margin-right:4px;}
.bs-view button{border:1px solid #C9CEDA;background:#fff;border-radius:999px;padding:5px 12px;cursor:pointer;font:600 13px Arial,sans-serif;color:#1E2340;} .bs-view button.on{background:#1E2340;color:#fff;border-color:#1E2340;} .bs-view .bs-view-all{border-radius:8px;}
.bs-pts{display:flex;flex-direction:column;gap:10px;}
/* (visible gridlines in each trainee's table: the main table, the Score Card grid, a day's activities and the Drive links) */
.bs-pt-t th,.bs-pt-t td{border:1px solid #9AA3B5 !important;} .bs-pt-mx th,.bs-pt-mx td{border:1px solid #9AA3B5 !important;}
.bs-pt .bs-parts th,.bs-pt .bs-parts td{border:1px solid #AEB6C6 !important;} .bs-pt .bs-lkg{border:1px solid #9AA3B5 !important;} .bs-pt .bs-lkc{border-color:#AEB6C6 !important;}
.bs-tools{padding:16px 18px;margin:0 0 16px;} .bs-tools h3{margin:0 0 10px;font:800 20px Arial,sans-serif;color:#1E2340;}
.bs-tools-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;} .bs-tools-bar label{font:800 15px Arial,sans-serif;color:#1E2340;display:inline-flex;gap:6px;align-items:center;}
.bs-tools-bar select{font:800 15px Arial,sans-serif;padding:5px 9px;border:2px solid #3B4A8C;border-radius:8px;background:#E8EDFB;color:#1E2340;}
.bs-tools-bar button{border:2px solid #1E2340;background:#fff;color:#1E2340;font:800 14px Arial,sans-serif;padding:6px 12px;border-radius:8px;cursor:pointer;}
/* (the sheet's actions: real buttons, bold and bigger) */
:is(.bs-card,.bs-ctl) .gs-menu{display:flex;flex-wrap:nowrap;gap:5px;margin-top:6px;overflow-x:auto;align-items:center;}
:is(.bs-card,.bs-ctl) .gs-menu button{border:2px solid #1E2340;background:#fff;color:#1E2340;font:800 12.5px Arial,sans-serif;padding:5px 8px;border-radius:7px;cursor:pointer;white-space:nowrap;box-shadow:0 1px 0 rgba(0,0,0,.06);}
:is(.bs-card,.bs-ctl) .gs-menu button:hover{background:#EEF1F8;} :is(.bs-card,.bs-ctl) .gs-menu button.bs-upd-all{background:#1E2340;color:#fff;margin-left:0;vertical-align:baseline;} :is(.bs-card,.bs-ctl) .gs-menu button.bs-upd-all:hover{background:#2C3566;}
:is(.bs-card,.bs-ctl) .gs-menu button:disabled{opacity:.6;cursor:default;}
:is(.bs-card,.bs-ctl) .bs-batchmenu .bs-at{font:700 15px Arial,sans-serif;color:#3C4043;}
/* (Batch and 🔎 the trainee, side by side at the top: bigger, bold, each its own colour) */
:is(.bs-card,.bs-ctl) .bs-batchmenu{display:flex;flex-wrap:wrap;align-items:center;gap:10px;} :is(.bs-card,.bs-ctl) .bs-batchmenu label{font:800 17px Arial,sans-serif;color:#1E2340;display:inline-flex;align-items:center;gap:6px;}
:is(.bs-card,.bs-ctl) .bs-batchmenu select{font:800 17px Arial,sans-serif;padding:7px 12px;border:2px solid #3B4A8C;border-radius:8px;background:#E8EDFB;color:#1E2340;}
:is(.bs-card,.bs-ctl) .bs-who-top select{border-color:#C27A12;background:#FFF1DC;color:#7A4300;min-width:240px;max-width:100%;}
.bs-pt-h{padding:12px 16px;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;font:17px Arial,sans-serif;color:#1E2340;border-bottom:1px solid #E6E9F1;} .bs-pt-h b{font-size:19px;} .bs-pt{border:1px solid #DDE1EC;border-radius:12px;background:#fff;}
.bs-pt > summary{cursor:pointer;padding:12px 16px;display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;font:17px Arial,sans-serif;color:#1E2340;} .bs-pt[open] > summary{border-bottom:1px solid #E6E9F1;}
.bs-pt > summary i{font-size:12px;color:#8A5A00;} .bs-pt-k{font-size:16px;color:#3C4043;} .bs-pt-k b{color:#1E2340;}
.bs-pt-wrap{overflow-x:auto;padding:4px 10px 12px;} .bs-pt-t{border-collapse:collapse;width:100%;font:16px Arial,sans-serif;line-height:1.45;}
.bs-pt-t th,.bs-pt-t td{border:1px solid #E6E9F1;padding:8px 10px;text-align:left;vertical-align:top;} .bs-pt-t thead th{background:#F1F3F8;color:#1E2340;text-align:center;}
.bs-pt-sec th{background:#1E2340;color:#fff;font-weight:800;font-size:17px;} .bs-pt-m{white-space:nowrap;font-weight:700;color:#1E2340;width:1%;} .bs-pt-v{white-space:nowrap;font-weight:800;font-size:17px;width:1%;} .bs-pt-f{color:#3C4043;font-weight:500;}
.bs-pt-t{table-layout:fixed;font-size:17.5px !important;} .bs-pt-t col.bs-pt-c1{width:260px;} .bs-pt-t col.bs-pt-c2{width:128px;} .bs-pt-t .bs-pt-ed .bs-pt-v{white-space:nowrap !important;}   /* (wider, as the trainer asked: the labels on one or two lines, a score and its % on one) */ .bs-pt-t .bs-pt-v{white-space:normal;overflow-wrap:anywhere;} .bs-pt-t .bs-pt-m{overflow-wrap:normal;word-break:normal;hyphens:none;} .bs-pt-t .bs-pt-m{white-space:normal;}   /* (narrow, as the trainer asked: a longer value wraps in its cell; the labels column wide enough that a word — "completeness" — never breaks) */
.bs-pt-t .bs-pt-m{white-space:normal !important;font-weight:800 !important;} .bs-pt-t .bs-pt-v{white-space:normal !important;font-size:18.5px !important;font-weight:800 !important;}
.bs-pt-t .bs-pt-f{font-weight:600 !important;color:#1F2433 !important;font-size:16.5px !important;} .bs-pt-h{font-size:18px !important;} .bs-pt-h b{font-size:21px !important;}
/* (the trainee's line: their name and three figures, centred on a navy band, each figure a chip in its grade's colours) */
.bs-pt-h{justify-content:center;gap:10px 14px;background:linear-gradient(135deg,#1E2340,#33406B);color:#fff;padding:14px 16px !important;border-bottom:0;border-radius:11px 11px 0 0;}
.bs-pt-h > b{color:#fff !important;font-size:24px !important;margin-right:6px;} .bs-pt-h > i{color:#FFD9A8;}
.bs-pt-k{display:inline-flex;align-items:baseline;gap:7px;padding:5px 14px;border-radius:999px;background:#fff;border:2px solid #C9D1E6;color:#1E2340 !important;font:700 16px Arial,sans-serif !important;}
.bs-pt-k b{font-size:22px !important;color:#1E2340 !important;}
.bs-pt-k.gs-hi{background:#E6F4EA;border-color:#1E8E3E;} .bs-pt-k.gs-hi b{color:#0B5D1E !important;}
.bs-pt-k.gs-mid{background:#FFF4E0;border-color:#E8A400;} .bs-pt-k.gs-mid b{color:#7A4B00 !important;}
.bs-pt-k.gs-lo{background:#FDE8E8;border-color:#D93025;} .bs-pt-k.gs-lo b{color:#A50E0E !important;}
.bs-pt-mxw{padding:0 !important;border:0 !important;} .bs-pt-mx{border-collapse:collapse;width:auto;max-width:100%;font:15px Arial,sans-serif;margin:6px 0;}   /* (the Score Card grid: compact) */
.bs-pt-mx th,.bs-pt-mx td{border:1px solid #E6E9F1;padding:8px 10px;text-align:left;} .bs-pt-mx thead th{background:#F1F3F8;color:#1E2340;font-weight:700;}
.bs-pt-mx th{word-break:normal;overflow-wrap:normal;white-space:normal;} .bs-pt-mx tbody th{font-weight:700;color:#1E2340;width:auto;white-space:nowrap;padding:5px 10px !important;font-size:14.5px;} .bs-pt-mx td.bs-pt-v{width:auto;min-width:64px;text-align:center;cursor:help;font-size:15.5px !important;padding:5px 8px !important;} .bs-pt-mx thead th{min-width:64px;text-align:center;font-size:13.5px;padding:5px 8px !important;}
.bs-pt-sub td{background:#EEF1F8;font-weight:800;} .bs-pt-it{padding-left:24px !important;font-weight:600 !important;} .bs-pt-rv{display:flex;flex-wrap:wrap;gap:8px;padding:10px !important;}
.bs-pt-rv .btn{font-weight:800;font-size:14.5px;border:2px solid #1E2340;}
.bs-pt-fb{margin-top:12px;} .bs-pt-fbb{margin-top:10px;} .bs-pt-fb .tfb-admin{box-shadow:none;border:1px solid #DDE1EC;}
.bs-ed{width:62px;font:inherit;font-size:16px;font-weight:800;padding:2px 4px;border:1px solid #C9CFDD;border-radius:6px;background:#fff;color:#1E2340;text-align:right;} .bs-ed-u{margin-left:2px;} .bs-ed-mk{color:#8A4A00;font-size:13px;}
.bs-ed-note{font:inherit;font-size:13px;padding:3px 6px;border:1px solid #DDE1EC;border-radius:6px;width:min(260px,100%);margin-top:4px;} .bs-pt-x td{background:#F7F8FB;}
.bs-why{margin-top:2px;font-size:12.5px;} .bs-why summary{cursor:pointer;color:#6B7088;font-weight:700;} .bs-pt-t td[title]{cursor:help;}
.bs-pt-v.gs-hi{background:#E6F4EA;} .bs-pt-v.gs-mid{background:#FFF4E0;} .bs-pt-v.gs-lo{background:#FDE8E8;}
.bs-more,.bs-rank-sheet{margin:14px 0 6px;border:1px solid #E1E3E1;border-radius:10px;background:#FAFBFC;} .bs-more > summary,.bs-rank-sheet > summary{cursor:pointer;padding:10px 14px;font:700 14px Arial,sans-serif;color:#1E2340;list-style:none;}
.bs-more > summary::-webkit-details-marker,.bs-rank-sheet > summary::-webkit-details-marker{display:none;} .bs-more[open] > summary,.bs-rank-sheet[open] > summary{border-bottom:1px solid #E1E3E1;}
.gs td.bs-ocell{min-width:300px;max-width:340px;white-space:normal;vertical-align:top;text-align:left;padding:8px 9px;font-size:12.5px;line-height:1.4;}
.bs-oday{display:flex;align-items:center;gap:7px;margin-bottom:6px;} .bs-oday span{color:#5F6368;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;}
.bs-ofold-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font:inherit;font-weight:inherit;color:inherit;border-radius:6px;padding:1px 3px;}
.bs-ofold-btn:hover{background:rgba(26,115,232,.08);} .bs-ofold-btn:focus-visible{outline:3px solid #DB8437;outline-offset:1px;}
.bs-ocaret{font-size:11px;color:#1A73E8;width:10px;display:inline-block;} .bs-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
.gs td.bs-oname{vertical-align:top;} .bs-oname-btn{font-weight:700;}
.gs td.bs-ocell.bs-ocell-f{min-width:170px;max-width:230px;} .gs td.bs-ocol-f{min-width:58px !important;max-width:70px !important;}
.bs-omini{display:flex;flex-wrap:wrap;gap:4px 6px;} .bs-omini > span{display:inline-flex;align-items:center;gap:2px;font-size:12px;} .bs-omini .bs-sbox{font-size:10.5px;padding:0 4px;min-width:0;}
.bs-otools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 8px;} .bs-otools small{color:#5F6368;font-size:12px;}
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
.bs-rank{padding-top:6px;}
.bs-ck-who{font:700 15px Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;} .bs-ck-who select{font:700 15px Arial,sans-serif;padding:5px 8px;border:1px solid #C4C7C5;border-radius:4px;}
.bs-days{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin-top:8px;}
.bs-day{border:1px solid #E1E3E1;border-radius:8px;padding:8px 10px;background:#fff;font:13.5px Arial,sans-serif;}
.bs-day-h{display:flex;align-items:baseline;gap:6px;margin-bottom:6px;} .bs-day-h span{color:#5F6368;font-size:12.5px;} .bs-day-h em{margin-left:auto;font-style:normal;font-weight:700;color:#137333;}
.bs-gr{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:3px 0;border-bottom:1px dashed #EEF0F2;} .bs-gr small{grid-column:1 / -1;color:#5F6368;font-size:12px;}
.bs-rat{margin:8px 0 14px;} .bs-rat h5{margin:12px 0 4px;font:700 15px Arial,sans-serif;color:#1F1F1F;border-top:1px solid #E1E3E1;padding-top:10px;}
.bs-rat-avg{font:14px Arial,sans-serif;margin:4px 0 6px;} .bs-rat-avg b{font-size:16px;} .bs-rat-avg span{color:#5F6368;}
.bs-rat-how{margin:2px 0 6px;font-size:12.5px;color:#444746;line-height:1.4;}
.bs-rat .bs-days{grid-template-columns:1fr;gap:6px;}
.bs-back button{margin-left:8px;}
.bs-warn{margin:0 14px 10px;padding:9px 12px;border:1px solid #F4B77A;background:#FFF7ED;border-radius:6px;font:14px Arial,sans-serif;color:#7A4100;}
.bs-sweep .bs-sweep-sum{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;} .bs-sweep-list{max-height:420px;overflow:auto;}
.bs-dup{line-height:1.55;} .bs-dup-t{border-collapse:collapse;margin:8px 0;font-size:13px;background:#fff;} .bs-dup-t th,.bs-dup-t td{border:1px solid #E6D3B3;padding:5px 9px;text-align:left;}
.bs-dup-keep td{background:#E8F6EE;font-weight:700;} .bs-dup code{font-size:12px;}
.bs-share{line-height:1.5;} .bs-dl{margin-left:8px;font:inherit;font-size:12.5px;font-weight:800;padding:3px 10px;border-radius:999px;border:1px solid #C9D3E6;background:#fff;color:var(--navy);cursor:pointer;vertical-align:middle;} .bs-dl:hover{background:#EEF2FA;}
.bs-tt-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 2px;} .bs-tt-row input{font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:7px;}
.bs-share{padding:12px 14px;} .bs-li-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px;} .bs-li-h{font-size:15px;} .bs-li-share{margin:0 0 8px;} .bs-share code{background:#fff;padding:1px 5px;border-radius:4px;user-select:all;white-space:nowrap;}
.bs-parts{width:100%;border-collapse:collapse;font-size:13px;line-height:1.4;} .bs-parts th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;background:#F6F7FA;padding:5px 8px;border-bottom:1px solid #E3E6EE;} .bs-parts td{padding:5px 8px;border-top:1px solid #EEF0F4;vertical-align:top;} .bs-parts-n{width:38%;font-weight:600;} .bs-parts-v{width:96px;white-space:nowrap;} .bs-parts-t{color:#4b5563;}
@media (max-width:760px){.bs-parts thead{display:none;} .bs-parts tr{display:block;border-top:1px solid #EEF0F4;padding:4px 0;} .bs-parts td{display:block;width:auto!important;border:0;padding:2px 8px;}}
.bs-look{margin-left:auto;font-weight:700;color:#1E2340;} .bs-look select{font:600 13px Arial,sans-serif;padding:5px 10px;border:1px solid #C9CEDA;border-radius:999px;background:#fff;color:#1E2340;max-width:260px;}
.bs-mk{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:24px;border-radius:6px;font:800 14px Arial,sans-serif;border:0;} .bs-mk-ok{color:#166534;background:#DCFCE7;} .bs-mk-wait{color:#92400E;background:#FEF3C7;} button.bs-mk-x,.bs-mk-x{color:#991B1B;background:#FEE2E2;cursor:pointer;} button.bs-mk-x:hover{background:#FCA5A5;}
.bs-lkg{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border:1px solid #E3E6EE;border-radius:6px;overflow:hidden;} .bs-lkc{overflow-wrap:normal;word-break:normal;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px;text-align:center;font-size:12.5px;line-height:1.25;} .bs-lkc + .bs-lkc{border-left:1px solid #E3E6EE;}
.bs-le.card{padding:12px 16px;margin:0 0 12px;} .bs-le-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:16px;color:#1E2340;} .gs-menu button.bs-le-on{background:#F6C08F !important;color:#1E2340 !important;}
.bs-res{display:inline-block;margin-left:6px;padding:2px 9px;border-radius:999px;font:800 13px Arial,sans-serif;border:2px solid;} .bs-res-ok{background:#E6F4EA;border-color:#1E8E3E;color:#0B5D1E;} .bs-res-no{background:#FDE8E8;border-color:#D93025;color:#A50E0E;} .bs-res-wait{background:#FFF4E0;border-color:#E8A400;color:#7A4B00;}
.bs-lkg-n{grid-template-columns:repeat(var(--n,6),minmax(0,1fr));} .bs-lkg-n .bs-lkc span:first-child{font-size:12px;color:#3C4043;} .bs-lkg-n .bs-lkc b{font-size:13px;color:#1E2340;}
@media (max-width:760px){.bs-lkg{grid-template-columns:repeat(3,minmax(0,1fr));} .bs-lkc:nth-child(4){border-left:0;} .bs-lkc:nth-child(n+4){border-top:1px solid #E3E6EE;} .bs-look{margin-left:0;}}
.bs-pop{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;} .bs-pop-box{position:relative;background:#fff;border-radius:10px;max-width:460px;width:100%;padding:18px 20px;box-shadow:0 20px 50px rgba(0,0,0,.3);font:14px Arial,sans-serif;color:#1f2937;}
.bs-pop-box h4{margin:0 30px 2px 0;font-size:16px;display:flex;gap:8px;align-items:center;} .bs-pop-who{margin:0 0 10px;color:#6b7280;} .bs-pop-why{margin:0 0 6px;font-weight:700;color:#991B1B;} .bs-pop-more{margin:0 0 6px;line-height:1.45;} .bs-pop-at{margin:0 0 10px;color:#6b7280;font-size:12.5px;} .bs-pop-acts .btn{text-decoration:none;} .bs-pop-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;} .bs-pop-x{position:absolute;top:10px;right:10px;border:0;background:none;font-size:16px;cursor:pointer;color:#6b7280;}
.bs-li{width:100%;border-collapse:collapse;background:#fff;border:1px solid #EBD3B5;border-radius:6px;font-size:13.5px;color:var(--ink,#1f2937);} .bs-li th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#7A4100;background:#FDEBD3;padding:7px 10px;border-bottom:1px solid #EBD3B5;white-space:nowrap;}
.bs-li td{padding:6px 10px;border-top:1px solid #F3E4D0;vertical-align:middle;} .bs-li tbody.bs-li-p{border-top:2px solid #EBD3B5;} .bs-li tbody.bs-li-p:nth-child(odd) td{background:#FFFBF5;}
.bs-li-who{white-space:nowrap;min-width:150px;} .bs-li-who b{display:block;margin-bottom:5px;} .bs-li-n{white-space:nowrap;text-align:center;font-weight:700;} .bs-li-l{white-space:nowrap;font-weight:700;} .bs-li-why{color:var(--danger,#c0392b);font-weight:600;} .bs-li-at{white-space:nowrap;color:#6b7280;}
.bs-li-acts{display:grid;grid-template-columns:auto auto auto;gap:4px;justify-content:end;} .bs-li-acts .btn,.bs-li-who .btn{margin:0;padding:4px 10px;white-space:nowrap;text-decoration:none;}
@media (max-width:760px){.bs-li thead{display:none;} .bs-li,.bs-li tbody,.bs-li tr,.bs-li td{display:block;width:auto;} .bs-li td{border:0;padding:3px 10px;} .bs-li tr{border-top:1px solid #F3E4D0;padding:4px 0;} .bs-li-acts{display:flex;justify-content:flex-start;} .bs-li-acts>span:empty{display:none;} .bs-li-n{text-align:left;} .bs-li-n::after{content:" links right";font-weight:400;} .bs-li-who{display:flex!important;align-items:center;justify-content:space-between;} .bs-li-who b{margin:0;} .bs-share code{white-space:normal;word-break:break-all;}}
.bs-dstat{line-height:1.55;} .bs-dstat-id{margin-top:6px;} .bs-dstat-id small{color:#7A4100;opacity:.85;} .bs-dstat code{background:#fff;padding:1px 5px;border-radius:4px;} .bs-dstat.ok{border-color:#9ED3B0;background:#EEF8F1;color:#15603A;} .bs-dstat .btn{margin-left:6px;}
.bs-fix{margin:0 14px 12px;padding:12px 14px;border:1px solid #C4C7C5;border-radius:8px;background:#F8F9FA;font:14px Arial,sans-serif;}
.bs-fix h4{margin:0 0 4px;font-size:16px;} .bs-fix p{margin:0 0 8px;}
.bs-fix-list{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 10px;} .bs-fix-list label{display:flex;align-items:center;gap:6px;cursor:pointer;}
.bs-fix-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;} .bs-fix-row select{font:15px Arial,sans-serif;padding:6px 9px;border:1px solid #C4C7C5;border-radius:4px;margin-left:6px;}
.bs-fix-row input[type=datetime-local]{width:auto;}
.bs-fix-row input{font:15px Arial,sans-serif;padding:6px 9px;border:1px solid #C4C7C5;border-radius:4px;width:150px;margin-left:6px;}
.bs-fix-err{color:#C5221F;margin:8px 0 0 !important;}
@media print{ :is(.bs-card,.bs-ctl) .gs-menu,.bs-jump,.lp-admin-tabs{display:none !important;} body.bs-wide main{padding:0;} .bs-wrap{overflow:visible;} }
`; document.head.appendChild(s); })();
})();
