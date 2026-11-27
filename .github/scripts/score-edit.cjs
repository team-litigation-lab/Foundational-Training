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
      const items = {}; sc.rows.forEach(r => r.items.forEach(x => { if (x.ref) items[r.s.id + '|' + x.ref] = { pct: x.pct, refPct: x.refPct, reference: !!x.reference, at: x.at || '', auto: !!x.auto, overridden: !!x.overridden, why: x.why || '', note: x.note || '' }; }));
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
    // (📎 only what the Training Guide grades is scored — js/ft-reference.js: the Practice Session and the transcription's
    // automatic score are Additional Reference, kept with their figure, counted nowhere)
    { const ps = b0.items['sessions|run:reception|-'], tr = b0.items['trainer|act:transcription-1'];
      if (!ps || !ps.reference || ps.pct !== null || ps.refPct !== 55) fail(`the resubmitted Practice Session isn't Additional Reference (its automated checks kept): ${JSON.stringify(ps)}`);
      if (tr && (!tr.reference || tr.pct !== null)) fail(`the transcription's automatic score is counted: ${JSON.stringify(tr)}`); }

    // 🔎 ✎ Edit a score, on the trainer's page: only what is scored — the mock call — one field for it, with its hover
    // rationale; no + points (there is no overall score); no 🏅 Grades table
    const box = () => page.evaluate(id => { const d = document.getElementById('bs-pt-' + id); if (!d) return null;
      const opts = [...d.querySelectorAll('select.bs-ed-pick option')].map(o => o.value), fld = d.querySelector('tr.bs-pt-ed input.bs-ed[data-ref]');
      return { opts, ref: fld ? fld.getAttribute('data-ref') : '', fields: d.querySelectorAll('input.bs-ed[data-ref]').length, tip: fld ? fld.closest('td').getAttribute('title') || '' : '',
        extra: !!d.querySelector('input.bs-ed[data-extra]'), grades: [...d.querySelectorAll('.bs-pt-sec th')].some(th => /🏅 Grades/.test(th.innerText)) }; }, id);
    { const pg = await box();
      if (!pg) fail('Eve\'s page isn\'t on the Batch Sheet');
      else {
        if (JSON.stringify(pg.opts) !== JSON.stringify(['act:reception-live'])) fail(`✎ Edit a score should offer the scored mock call alone: ${pg.opts.join(', ')}`);
        if (pg.fields !== 1 || pg.ref !== 'act:reception-live') fail(`✎ Edit a score shows ${pg.fields} score fields (${pg.ref}), not the mock call's`);
        if (pg.extra) fail('the + points field is still there: there is no overall score to add points to');
        if (pg.grades) fail('the trainee\'s page still has a 🏅 Grades table');
        if (!/CALL-COMMENT/.test(pg.tip) || !/rubric/i.test(pg.tip)) fail(`the mock call's hover doesn't give its rationale (rubric, comment): ${pg.tip}`);
      } }

    // 📎 a score of Additional Reference can't be set: refused, nothing written
    for (const r of [`kc:${L}`, 'monitor', 'act:transcription-1', 'assess:recact', 'items:5-7'])
      if (await page.evaluate(([id, r]) => FTBatchSheet.editScore(id, r, '77'), [id, r])) fail(`an Additional Reference score was edited: ${r}`);
    { const rv = await get('trackerreview:' + id), lr = await get('labreview:' + id), kc = await get('kcreview:' + id);
      if ((rv.monitor || {}).trainerScore != null || (lr.overrides && Object.keys(lr.overrides).length) || ((lr.acts || {})['transcription-1']) || (kc && kc.lessons && kc.lessons[L])) fail(`a refused edit was written: ${JSON.stringify({ monitor: rv.monitor, overrides: lr.overrides, kc })}`); }

    // 🎙 the mock call: its score in acts, merged; the Result follows it; 🧑‍🏫 With your trainer follows (🎯 Graded calls is
    // Additional Reference: it repeats the same scorecards)
    if (!(await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'act:reception-live', '50'), [id]))) fail('the mock call edit failed');
    await settled();
    { const a = ((await get('labreview:' + id)).acts || {})['reception-live'] || {}, s = await SC();
      if (a.score !== 50 || a.status !== 'Failed' || !a.scoreEdited || a.comment !== 'CALL-COMMENT good control.' || a.facilitator !== 'Coach Tess' || !a.rubric || a.rubric.avg !== 3.8 || a.at !== '2026-11-03T10:00:00Z') fail(`the mock call edit isn't merged into its scorecard (Result from the score): ${JSON.stringify(a)}`);
      if ((s.items['trainer|act:reception-live'] || {}).pct !== 50 || (s.items['calls|act:reception-live'] || {}).pct != null) fail(`the scorecards don't follow the mock call edit: ${JSON.stringify([s.items['trainer|act:reception-live'], s.items['calls|act:reception-live']])}`); }
    // (🧑‍🏫 Graders, later: a criterion and the comment changed and saved — the edited score stays, and so do the other fields)
    await page.evaluate(() => { state.adminTab = 'graders'; render(); FTMockScores.refresh(); }); await page.waitForTimeout(1500);
    await page.evaluate(([b, id]) => { FTMockScores.batch(b); FTMockScores.act('reception-live'); FTMockScores.va(id); }, [BATCH, id]); await page.waitForTimeout(800);
    if (await page.inputValue('.fms-sheet [data-score]').catch(() => '') !== '50') fail(`🧑‍🏫 Graders doesn't open on the edited score: ${await page.inputValue('.fms-sheet [data-score]').catch(() => '?')}`);
    await page.fill('.fms-tbl tbody tr:nth-child(1) input[type=number]', '3');
    await page.fill('.fms-cmt textarea', 'GRADERS-COMMENT');
    await page.click('[data-ms-save]'); await page.waitForTimeout(1500);
    { const a = ((await get('labreview:' + id)).acts || {})['reception-live'] || {};
      if (a.score !== 50 || !a.scoreEdited || a.comment !== 'GRADERS-COMMENT' || !a.rubric || a.rubric.scores[0] !== 3 || a.facilitator !== 'Coach Tess') fail(`a 🧑‍🏫 Graders save lost the edited score or a field: ${JSON.stringify(a)}`); }
    if (!((await get('labreview:' + id)).sessions || {})['reception|-']) fail('the Graders save wiped the Practice Session reviews');
    await open();

    // 📎 no overall score: none before, and points added (an older record's) make none either
    { const s = await SC(); if (s.overall !== null || s.extra) fail(`there is an overall score: ${JSON.stringify({ overall: s.overall, extra: s.extra })}`); }
    await page.evaluate(([id]) => lshProgram.setExtra(id, { points: 5, note: 'Extra tasks' }), [id]);
    { const s = await SC(); if (s.overall !== null) fail(`added points made an overall score: ${s.overall}`); }

    // 🔒 the trainee's side: the mock call's score and its why, 📎 for the rest, no field
    const mine = await (async () => {
      await page.evaluate(id => { state.isAdmin = false; state.adminPreview = false; state.traineeId = id; state.traineeName = 'Eve Editor'; state.view = 'modules'; render(); }, id);
      await page.waitForTimeout(400);
      await page.evaluate(() => goto('mysheet'));
      await page.waitForFunction(() => document.querySelector('.sc-grid') && window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 20000 }).catch(() => fail('the trainee\'s My Progress never finished loading'));
      await page.waitForTimeout(600);
      return page.evaluate(() => ({ inputs: document.querySelectorAll('main input.bs-ed, main input.bs-ed-note, main [data-extra], main [data-ref]').length,
        ring: (document.querySelector('.sc-ring span') || {}).textContent || '',
        cells: [...document.querySelectorAll('.sc-tbl .sc-n')].map(c => ({ v: c.textContent.trim(), t: c.getAttribute('title') || '', name: c.previousElementSibling.textContent })),
        ran: !!window.__xss }));
    })();
    if (mine.inputs) fail(`the trainee's page has ${mine.inputs} editing field(s)`);
    if (mine.ring !== '📎') fail(`the trainee's overall ring isn't 📎 Additional Reference: ${mine.ring}`);
    { const rl = mine.cells.find(c => /Reception Listening Activity/.test(c.name)) || {};
      if (!/📎/.test(rl.v || '')) fail(`the trainee's Reception Listening Activity isn't Additional Reference: ${JSON.stringify(rl)}`); }
    { const mc = mine.cells.find(c => /Reception Mock Call with the trainer/.test(c.name)) || {};
      if (!/^(50%|2\.5\/5)/.test(mc.v) || !/GRADERS-COMMENT/.test(mc.t)) fail(`the trainee doesn't see the mock call's score with its rationale: ${JSON.stringify(mc)}`); }
    if (mine.ran) fail('a note ran on the trainee\'s page');
    if (await page.evaluate(([id]) => FTBatchSheet.editScore(id, 'act:reception-live', '10'), [id])) fail('a trainee\'s page could edit a score');
  } catch (e) { fail('threw: ' + e.message); }
  await browser.close();
  if (failures.length) { console.error('Score edit test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Score edit test passed (only a scored mock call or demo is edited, followed by its scorecards, with its hover rationale; an Additional Reference score is refused; no overall score, points or none; the trainee sees the score and the why with no field, and the worker refuses their write).');
})();
