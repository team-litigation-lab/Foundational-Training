// ✎ A trainer edits a score (📋 Batch Sheet → a trainee's page → ✎ Edit a score, js/ft-batch-sheet.js editScore), hovers a
// score for what it rests on, and adds points to the Scorecard overall (js/lsh-program.js setExtra):
//   - each edit is written where that grade's trainer's score already lives: a Knowledge Check in kcreview:<id>, a mock call in
//     labreview:<id>.acts (merged: its rubric, comment and facilitator kept; the Result follows the score; a later 🧑‍🏫 Graders
//     save keeps the edited score), a resubmitted Practice Session for its new attempt, the Monitoring Sheet in
//     trackerreview:<id>.monitor.trainerScore, a Transcription recording's automatic score replaced by the trainer's, and an
//     answer sheet's grade as labreview:<id>.overrides[ref] — and every scorecard follows: 🏅 Scorecard's compute, the sheet's
//     tables (🏅 Scores, 📅 Day 1–16) and the trainee's own 📋 My Progress;
//   - a week's compute (the Weekly Ranking's ⤓ Fill) keeps the override's own date and the tracker's average, with no points;
//     clearing an override brings the automatic grade back; an XSS note never runs;
//   - + points go straight onto the overall, 100% at most, with "base X% + N points" on its hover;
//   - the trainee sees the same values and the why, with no field; the worker refuses a trainee's write to labreview.
// Usage: NODE_PATH=…/node_modules node .github/scripts/score-edit.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B110226';
const failures = []; const fail = m => failures.push(m);

// 🔒 the worker itself, signed in: a trainee can't write their own labreview:<id> (the trainer's), an admin can
async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async k => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async k => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const s = await call('/api/auth/trainee', { name: 'Tia Trainee', batch: BATCH });
  if (!s.body || !s.body.token) { fail(`the worker didn't sign the trainee in: ${JSON.stringify(s)}`); return; }
  const t = s.body.token, id = s.body.id, at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok);
  if ((await set('labreview:' + id, { acts: { 'reception-live': { status: 'Passed', score: 70 } } }, at)).status !== 200) fail('an admin couldn\'t write labreview');
  const w = await set('labreview:' + id, { acts: { 'reception-live': { status: 'Passed', score: 100 } }, extra: { points: 50 }, overrides: { 'assess:recact': { pct: 100 } } }, t);
  if (w.status === 200) fail('a trainee wrote their own labreview (the trainer\'s scores, overrides and points)');
  const kept = JSON.parse((await call('/api/storage/get', { key: 'labreview:' + id }, at)).body.value || 'null');
  if (!kept || kept.extra || kept.acts['reception-live'].score !== 70) fail(`the trainee's write reached labreview: ${JSON.stringify(kept)}`);
}

(async () => {
  try { await workerChecks(); } catch (e) { fail('worker checks threw: ' + e.message); }
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Eve', 'Editor', BATCH);
    const id = await page.evaluate(() => state.traineeId);
    { const rec = await get('trainee:' + id); rec.approved = true; rec.archived = false; await put('trainee:' + id, rec); }
    const L = await page.evaluate(() => DAYS.find(d => typeof ftKcQuestions === 'function' && ftKcQuestions(d.id).length).id);
    // (no automatic 🔄 Update all scores on opening the batch: it would work the seeded days out again on the server)
    await page.evaluate(b => localStorage.setItem('ft_bs_sync:' + b, String(Date.now())), BATCH);
    await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'audit'; goto('admin'); });
    await page.waitForTimeout(3000);   // (the sign-in's own background checks done before the records are seeded)
    // 🌱 Eve's records
    await put('progress:' + id, { traineeId: id, savedAt: new Date().toISOString(), data: { 'day-progress': { [L]: { score: 60, kcAttempts: 1, done: false } } } });
    await put('labreview:' + id, { acts: { 'reception-live': { status: 'Passed', redo: false, score: 76, comment: 'CALL-COMMENT good control.', facilitator: 'Coach Tess', date: '2026-11-03', at: '2026-11-03T10:00:00Z',
      rubric: { key: 'reception', scores: [5, 4, 2, 4, 4, 3, 4], feedback: ['Warm greeting.', '', 'Skipped the caller verification.', '', '', '', ''], avg: 3.8 } } },
      sessions: { 'reception|-': { attempt: 1, score: 70, comment: 'OLD-ATTEMPT', at: '2026-11-02T10:00:00Z' } } });
    await put('sessions:' + id, { runs: { 'reception|-': { attempts: 2, startedAt: '2026-11-04T09:00:00Z', submittedAt: '2026-11-04T10:00:00Z', minutes: 30, answers: {}, auto: { pct: 55, checks: [] } } } });
    await put('trackerreview:' + id, { days: { '2026-11-03': { source: 'drive', pct: 80 } }, monitor: { pct: 40, found: 2, total: 5, checkedAt: '2026-11-04T08:00:00Z' },
      assess: { recact: { score: 6, max: 10, pct: 60, at: '2026-11-03T12:00:00Z', when: 'Nov 3', items: { c1_type: { ok: false, pts: 0, note: 'Wrong caller type' } } } },
      items: { '5-7': { result: { score: 50, context: 'Two entries missing' }, onTime: true, at: '2026-11-03T15:00:00Z', when: 'Nov 3' } },
      transcribe: { 1: { pct: 72, at: '2026-11-04T09:00:00Z', submittedAt: '2026-11-04T08:58:00Z', key: 'transcription' } } });
    // the Scorecard as compute works it out, from the stored records (as 🏅 Scorecard reads them)
    const SC = range => page.evaluate(async ([id, range]) => {
      const P = window.LSH_PROGRAM, S = P.sources.filter(s => s.key), vals = await sharedGetMany(S.map(s => s.key + id).concat(P.shared)), rec = {}, shared = {};
      S.forEach((s, i) => { rec[s.key] = vals[i] || null; }); P.shared.forEach((k, i) => { shared[k] = vals[S.length + i] || null; });
      const sc = lshProgram.compute(Object.assign({ id, progress: (((await sharedGet('progress:' + id)) || {}).data || {})['day-progress'] || {}, rec, shared, since: '' }, range ? { range } : {}));
      const items = {}; sc.rows.forEach(r => r.items.forEach(x => { if (x.ref) items[r.s.id + '|' + x.ref] = { pct: x.pct, at: x.at || '', auto: !!x.auto, overridden: !!x.overridden, why: x.why || '', note: x.note || '' }; }));
      const tracker = ((sc.rows.find(r => r.s.id === 'drive') || { items: [] }).items.find(x => /Daily Task Tracker/.test(x.name)) || {}).pct;
      return { overall: sc.overall, base: sc.overallBase, extra: sc.extra, items, tracker };
    }, [id, range || null]);
    const open = async () => {
      await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(600);
      await page.evaluate(b => { FTBatchSheet.batch(b); FTBatchSheet.refresh(); }, BATCH);
      await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 20000 });
      await page.evaluate(id => FTBatchSheet.ptPick(id), id); await page.waitForTimeout(500);
    };
    // (after an edit the sheet reads the records again: wait for it)
    const settled = () => page.waitForFunction(() => FTBatchSheet.tables() && document.querySelector('.bs-pt'), null, { timeout: 20000 }).then(() => page.waitForTimeout(300));
    await open();
    const b0 = await SC();
    if (b0.items['trainer|act:transcription-1'] && !b0.items['trainer|act:transcription-1'].auto) fail('the Transcription recording\'s automatic score isn\'t marked automatic before the trainer scores it');
    if (!b0.items['sessions|run:reception|-'] || b0.items['sessions|run:reception|-'].pct !== 55) fail(`the resubmitted Practice Session doesn't start from its automated checks: ${JSON.stringify(b0.items['sessions|run:reception|-'])}`);

    // 🔎 ✎ Edit a score, on the trainer's page: every grade a trainer can set in its list, one field for the grade picked
    // (with the hover rationale), then the + points field as a plain row; no 🏅 Grades table
    const box = (ref) => page.evaluate(([id, ref]) => { const d = document.getElementById('bs-pt-' + id); if (!d) return null;
      const opts = [...d.querySelectorAll('select.bs-ed-pick option')].map(o => o.value), fld = d.querySelector('tr.bs-pt-ed input.bs-ed[data-ref]');
      const x = d.querySelector('input.bs-ed[data-extra]'), xtr = x && x.closest('tr');
      return { opts, ref: fld ? fld.getAttribute('data-ref') : '', fields: d.querySelectorAll('input.bs-ed[data-ref]').length, tip: fld ? fld.closest('td').getAttribute('title') || '' : '',
        extra: !!x, extraInSec: !!(xtr && xtr.classList.contains('bs-pt-sec')), extraTh: !!(xtr && xtr.querySelector('th')), extraLabel: xtr ? xtr.querySelector('td').innerText.trim() : '',
        grades: [...d.querySelectorAll('.bs-pt-sec th')].some(th => /🏅 Grades/.test(th.innerText)) }; }, [id, ref]);
    const pick = async (ref) => { await page.evaluate(([id, ref]) => FTBatchSheet.edPick(id, ref), [id, ref]); await page.waitForTimeout(250); return box(ref); };
    { const pg = await box();
      if (!pg) fail('Eve\'s page isn\'t on the Batch Sheet');
      else {
        for (const r of [`kc:${L}`, 'act:reception-live', 'act:transcription-1', 'monitor', 'assess:recact', 'items:5-7']) if (!pg.opts.includes(r)) fail(`✎ Edit a score has no ${r} to pick: ${pg.opts.join(', ')}`);
        // (🟢 a Practice Session is practice, off the scorecards: not on this list — its trainer scores it in 🟢 Practice Sessions)
        if (pg.opts.some(r => /^run:/.test(r))) fail(`✎ Edit a score offers a Practice Session, which is off the scorecards: ${pg.opts.join(', ')}`);
        if (pg.fields !== 1) fail(`✎ Edit a score shows ${pg.fields} score fields, not the one picked`);
        if (pg.grades) fail('the trainee\'s page still has a 🏅 Grades table');
        if (!pg.extra || pg.extraInSec || pg.extraTh || pg.extraLabel !== '+') fail(`the + points field isn't a plain row under ✎ Edit a score: ${JSON.stringify(pg)}`);
        // (the Daily Task Tracker average has no ref: its days are scored one by one, so it isn't offered)
        if (pg.opts.some(r => /tracker/i.test(r))) fail('the Daily Task Tracker average can be edited');
      }
      for (const r of pg ? pg.opts : []) { const b = await pick(r); if (b.ref !== r || !b.tip.trim()) { fail(`picking ${r} doesn't give its field with a hover rationale: ${JSON.stringify({ ref: b.ref, tip: b.tip })}`); break; } }
      const call = await pick('act:reception-live');
      if (!/CALL-COMMENT/.test(call.tip) || !/rubric/i.test(call.tip)) fail(`the mock call's hover doesn't give its rationale (rubric, comment): ${call.tip}`); }

    // ✍️ a Knowledge Check, through the field itself: kcreview, and the sheet's ✍️ Knowledge Checks
    await pick(`kc:${L}`);
    await page.fill(`#bs-pt-${id} input.bs-ed[data-ref="kc:${L}"]`, '85');
    await page.dispatchEvent(`#bs-pt-${id} input.bs-ed[data-ref="kc:${L}"]`, 'change');
    await page.waitForFunction(async ([id, L]) => { const r = await sharedGet('kcreview:' + id); return r && r.lessons && r.lessons[L] && r.lessons[L].score === 85; }, [id, L], { timeout: 10000 }).catch(() => fail('the Knowledge Check edit didn\'t reach kcreview'));
    await settled();
    { const kc = await get('kcreview:' + id), s = await SC();
      if (!kc || kc.lessons[L].by !== 'trainer' || !kc.lessons[L].editedAt || kc.lessons[L].at) fail(`the Knowledge Check edit isn't saved as the trainer's final score (editedAt, no new at): ${JSON.stringify(kc)}`);
      if ((s.items[`kc|kc:${L}`] || {}).pct !== 85) fail(`🏅 Scorecard's Knowledge Check doesn't follow the edit: ${JSON.stringify(s.items[`kc|kc:${L}`])}`);
      const cell = await page.evaluate(() => { const t = FTBatchSheet.tables().find(x => x.id === 'scores'), k = t.head.findIndex(h => /Knowledge Checks/.test(h)); return t.rows[0][k].v; });
      if (cell !== '85%') fail(`the Batch Sheet's 🏅 Scores ✍️ Knowledge Checks doesn't follow the edit: ${cell}`);
      if (await page.inputValue(`#bs-pt-${id} input.bs-ed[data-ref="kc:${L}"]`) !== '85') fail('the edited Knowledge Check field doesn\'t show the new score'); }

    // 🎙 a mock call: its score in acts, merged; the Result follows it; 🎯 Graded calls and 🧑‍🏫 With your trainer both follow
    if (!(await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'act:reception-live', '50'), [id]))) fail('the mock call edit failed');
    await settled();
    { const a = ((await get('labreview:' + id)).acts || {})['reception-live'] || {}, s = await SC();
      if (a.score !== 50 || a.status !== 'Failed' || !a.scoreEdited || a.comment !== 'CALL-COMMENT good control.' || a.facilitator !== 'Coach Tess' || !a.rubric || a.rubric.avg !== 3.8 || a.at !== '2026-11-03T10:00:00Z') fail(`the mock call edit isn't merged into its scorecard (Result from the score): ${JSON.stringify(a)}`);
      if ((s.items['trainer|act:reception-live'] || {}).pct !== 50 || (s.items['calls|act:reception-live'] || {}).pct !== 50) fail(`the scorecards don't follow the mock call edit: ${JSON.stringify([s.items['trainer|act:reception-live'], s.items['calls|act:reception-live']])}`); }
    // (🧑‍🏫 Graders, later: a criterion and the comment changed and saved — the edited score stays, and so do the other fields)
    await page.evaluate(() => { state.adminTab = 'graders'; render(); FTMockScores.refresh(); }); await page.waitForTimeout(1500);
    await page.evaluate(([b, id]) => { FTMockScores.batch(b); FTMockScores.act('reception-live'); FTMockScores.va(id); }, [BATCH, id]); await page.waitForTimeout(800);
    if (await page.inputValue('.fms-sheet [data-score]').catch(() => '') !== '50') fail(`🧑‍🏫 Graders doesn't open on the edited score: ${await page.inputValue('.fms-sheet [data-score]').catch(() => '?')}`);
    await page.fill('.fms-tbl tbody tr:nth-child(1) input[type=number]', '3');
    await page.fill('.fms-cmt textarea', 'GRADERS-COMMENT');
    await page.click('[data-ms-save]'); await page.waitForTimeout(1500);
    { const a = ((await get('labreview:' + id)).acts || {})['reception-live'] || {};
      if (a.score !== 50 || !a.scoreEdited || a.comment !== 'GRADERS-COMMENT' || !a.rubric || a.rubric.scores[0] !== 3 || a.facilitator !== 'Coach Tess') fail(`a 🧑‍🏫 Graders save lost the edited score or a field: ${JSON.stringify(a)}`); }
    // (the reviews kept beside it: the Graders save read the record fresh)
    if (!((await get('labreview:' + id)).sessions || {})['reception|-']) fail('the Graders save wiped the Practice Session reviews');
    await open();

    // 📋 the Monitoring Sheet: its own trainerScore (the rest of trackerreview kept)
    await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'monitor', '77'), [id]); await settled();
    { const rv = await get('trackerreview:' + id), s = await SC();
      if (!rv.monitor || rv.monitor.trainerScore !== 77 || rv.monitor.pct !== 40 || !rv.assess || !rv.assess.recact || !rv.transcribe || !rv.days['2026-11-03']) fail(`the Monitoring Sheet edit isn't its trainerScore, with the rest kept: ${JSON.stringify(rv)}`);
      if ((s.items['drive|monitor'] || {}).pct !== 77) fail(`the Scorecard's Monitoring Sheet doesn't follow the edit: ${JSON.stringify(s.items['drive|monitor'])}`); }

    // 🎧 a Transcription recording: the trainer's score replaces the automatic one (dated as the work, counted when ranking)
    await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'act:transcription-1', '88'), [id]); await settled();
    { const a = ((await get('labreview:' + id)).acts || {})['transcription-1'] || {}, s = await SC(), it = s.items['trainer|act:transcription-1'] || {};
      if (a.score !== 88 || a.status !== 'Passed' || a.at !== '2026-11-04T09:00:00Z') fail(`the transcription edit isn't the trainer's act score: ${JSON.stringify(a)}`);
      if (it.pct !== 88 || it.auto) fail(`the transcription's automatic score wasn't replaced: ${JSON.stringify(it)}`); }

    // 📝 an answer sheet's grade (no trainer's field of its own): an override, with a note that never runs as HTML
    const XSS = '<img src=x onerror="window.__xss=1">why';
    await page.evaluate(([id, n]) => FTBatchSheet.editScore(id, 'assess:recact', '90', n), [id, XSS]); await settled();
    { const o = (((await get('labreview:' + id)) || {}).overrides || {})['assess:recact'], s = await SC(), it = s.items['listening|assess:recact'] || {};
      if (!o || o.pct !== 90 || o.note !== XSS) fail(`the answer sheet's override isn't saved: ${JSON.stringify(o)}`);
      if (it.pct !== 90 || !it.overridden || !/was 60%/.test(it.why)) fail(`the Scorecard doesn't apply the override (with the score it replaced): ${JSON.stringify(it)}`);
      if ((((await get('trackerreview:' + id)) || {}).assess || {}).recact.pct !== 60) fail('the override was written over the grade itself');
      // (📅 Day 1–16: the activity's day shows the trainer's score, and so does its why)
      const d3 = await page.evaluate(() => { const t = FTBatchSheet.tables().find(x => x.id === 'dayscores'), k = t.head.indexOf('Day 3'); return (t.rows[0][k].parts || []).filter(x => /Listening Activity/.test(x.name)).map(x => x.v + ' ' + x.text).join(' | '); });
      if (!/^90% Trainer's score 90%/.test(d3)) fail(`📅 Day 3 doesn't show the override: ${d3}`);
      const tip = (await pick('assess:recact')).tip;
      if (!/was 60%/.test(tip)) fail(`the override's hover doesn't say what it replaced: ${tip}`);
      const x = await page.evaluate(() => ({ ran: !!window.__xss, img: document.querySelectorAll('.bs-pt img[src="x"], .bs-pt-t img').length }));
      if (x.ran || x.img) fail(`the override's note ran as HTML: ${JSON.stringify(x)}`); }
    await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'items:5-7', '95', 'Entries found on a second look'), [id]); await settled();
    if (((await SC()).items['drive|items:5-7'] || {}).pct !== 95) fail('the Monitoring Sheet items\' override isn\'t applied');

    // 📅 a week's compute (⤓ Fill): the tracker's average as it was, the override with its own date, no points
    { const w = await SC(['2026-11-02', '2026-11-06']), it = w.items['listening|assess:recact'] || {};
      if (w.tracker !== 80) fail(`a week's Daily Task Tracker average changed: ${w.tracker}`);
      if (it.at !== '2026-11-03T12:00:00Z' || it.pct !== 90) fail(`a week's compute lost the override's own date: ${JSON.stringify(it)}`); }

    // ↺ an override cleared: the automatic grade again
    await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'items:5-7', ''), [id]); await settled();
    { const o = (((await get('labreview:' + id)) || {}).overrides || {}), it = (await SC()).items['drive|items:5-7'] || {};
      if ('items:5-7' in o || it.pct !== 50 || it.overridden) fail(`clearing the override didn't restore the automatic grade: ${JSON.stringify({ o, it })}`); }

    // + points: straight onto the overall (through the field), 100% at most, "base X% + N" on its hover
    const before = await SC();
    if (before.extra || before.overall !== before.base) fail(`the overall has points before any were added: ${JSON.stringify(before)}`);
    const ovCell = () => page.evaluate(() => { const t = FTBatchSheet.tables().find(x => x.id === 'scores'), k = t.head.indexOf('Scorecard overall'); return t.rows[0][k]; });
    const sheetBase = parseInt((await ovCell()).v, 10);
    await page.fill(`#bs-pt-${id} input.bs-ed[data-extra]`, '5');
    await page.dispatchEvent(`#bs-pt-${id} input.bs-ed[data-extra]`, 'change');
    await page.waitForFunction(async id => { const r = await sharedGet('labreview:' + id); return r && r.extra && r.extra.points === 5; }, id, { timeout: 10000 }).catch(() => fail('the + points weren\'t saved in labreview.extra'));
    await settled();
    { const s = await SC(), want = Math.min(100, s.base + 5);
      if (s.overall !== want || s.base !== before.base) fail(`5 points don't raise the overall straight (base ${before.base}): ${JSON.stringify({ overall: s.overall, base: s.base })}`);
      // (the Batch Sheet's own overall, as its 🏅 Scores works it out: its base before, + 5)
      const c = await ovCell();
      if (c.v !== Math.min(100, sheetBase + 5) + '%' || !new RegExp(`base ${sheetBase}% \\+ 5 points`).test(c.f)) fail(`🏅 Scores' Scorecard overall doesn't show the points on its base ${sheetBase}%: ${JSON.stringify(c)}`);
      if ((await SC(['2026-11-02', '2026-11-06'])).extra) fail('a week\'s overall got the points'); }
    await page.evaluate(([id]) => lshProgram.setExtra(id, { points: 100, note: 'Extra tasks' }), [id]);
    { const s = await SC(); if (s.overall !== 100 || s.base >= 100) fail(`the overall isn't capped at 100%: ${JSON.stringify({ overall: s.overall, base: s.base })}`); }

    // 🔒 the trainee's side: the same values and the why, no field
    const mine = await (async () => {
      await page.evaluate(id => { state.isAdmin = false; state.adminPreview = false; state.traineeId = id; state.traineeName = 'Eve Editor'; state.view = 'modules'; render(); }, id);
      await page.waitForTimeout(400);
      await page.evaluate(() => goto('mysheet'));
      await page.waitForFunction(() => document.querySelector('.sc-grid') && window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 20000 }).catch(() => fail('the trainee\'s My Progress never finished loading'));
      await page.waitForTimeout(600);
      return page.evaluate(L => ({ inputs: document.querySelectorAll('main input.bs-ed, main input.bs-ed-note, main [data-extra], main [data-ref]').length,
        ring: (document.querySelector('.sc-ring span') || {}).textContent || '', ringTip: (document.querySelector('.sc-ring') || { getAttribute: () => '' }).getAttribute('title') || '',
        cells: [...document.querySelectorAll('.sc-tbl .sc-n')].map(c => ({ v: c.textContent.trim(), t: c.getAttribute('title') || '', name: c.previousElementSibling.textContent })),
        overallCell: (() => { const t = FTBatchSheet.tables().find(x => x.id === 'scores'), k = t.head.indexOf('Scorecard overall'); return t.rows[0][k]; })(),
        text: document.querySelector('main').innerText, ran: !!window.__xss, canEdit: null }), L);
    })();
    if (mine.inputs) fail(`the trainee's page has ${mine.inputs} editing field(s)`);
    if (mine.ring !== '100%' || !/base \d+% \+ 100 points/.test(mine.ringTip)) fail(`the trainee's overall doesn't include the points (with the base on its hover): ${mine.ring} | ${mine.ringTip}`);
    if (mine.overallCell.v !== '100%') fail(`the trainee's 🏅 Scores overall: ${JSON.stringify(mine.overallCell)}`);
    if (/extra points|bonus/i.test(mine.text)) fail('the trainee\'s page labels the points as a bonus');
    const cellOf = re => mine.cells.find(c => re.test(c.name)) || {};
    if (!/^85%/.test(cellOf(/Knowledge Check|Lesson|PI/i).v || '') && !mine.cells.some(c => /^85%/.test(c.v))) fail(`the trainee doesn't see the edited Knowledge Check: ${JSON.stringify(mine.cells.slice(0, 4))}`);
    { const rl = mine.cells.find(c => /Reception Listening Activity/.test(c.name)) || {};
      if (!/^90%/.test(rl.v) || !/was 60%/.test(rl.t)) fail(`the trainee doesn't see the override with its rationale: ${JSON.stringify(rl)}`); }
    { const mc = mine.cells.find(c => /Reception Mock Call with the trainer/.test(c.name)) || {};
      if (!/^50%/.test(mc.v) || !/GRADERS-COMMENT/.test(mc.t)) fail(`the trainee doesn't see the mock call's score with its rationale: ${JSON.stringify(mc)}`); }
    if (mine.cells.filter(c => /%/.test(c.v)).some(c => !c.t.trim())) fail(`a graded item on the trainee's page has no hover: ${JSON.stringify(mine.cells.filter(c => /%/.test(c.v) && !c.t.trim()))}`);
    if (mine.ran) fail('the override\'s note ran on the trainee\'s page');
    if (await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'monitor', '10'), [id])) fail('a trainee\'s page could edit a score');
  } catch (e) { fail('threw: ' + e.message); }
  await browser.close();
  if (failures.length) { console.error('Score edit test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Score edit test passed (each edit in its own trainer\'s field or an override, followed by every scorecard; the hover rationale; + points on the overall, 100% at most; the trainee sees the values and the why with no field, and the worker refuses their write).');
})();
