// 📑 The Weekly Ranking summarized for management (js/ft-ranking-summary.js): each trainee's week as seven competencies scored
// out of 5 with a summarized comment, and the trainer's feedback:
//   - the scores start from the week's evidence (a Reception mock call scoresheet: Call Handling from it, Attention to Detail
//     from its accuracy criteria); the AI (stubbed) writes the comments and may move a score by 0.5 at most;
//   - without the AI, the base scores and plain comments stand;
//   - kept in rksum:<batch>:w<N>; a trainer's edit stays when the week is summarized again; ⬇ Word gives the same report.
// Usage: NODE_PATH=…/node_modules node .github/scripts/ranking-summary.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B010526';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Rosa', 'Report', BATCH);
    const id = await page.evaluate(() => state.traineeId);
    const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
    const at = new Date('2026-01-07T15:00:00Z').toISOString();
    await put('labreview:' + id, { acts: { 'reception-live': { status: 'Passed', score: 80, comment: 'DEMO-NOTE: verify the caller before sharing anything.', at,
      rubric: { key: 'reception', scores: [5, 2, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4], feedback: ['', 'Skipped the DOB check.', '', '', '', '', '', '', '', '', '', '', '', '', ''], avg: 4.0 } } } });
    await put('feedback:' + id, { days: { 4: { status: 'sent', rating: 'On Track', summary: 'Good call control this week.', sentAt: at } } });
    // the AI stubbed (before the sheet opens: an unsummarized week summarizes itself): comments, and a score it tries to move by
    // more than 0.5 (Call Handling to 1)
    let seen = '';
    await page.exposeFunction('__prompt', t => { seen = t; });
    await page.evaluate(() => { window.callAIJson = async p => { window.__prompt(p); const k = ['attention', 'compliance', 'timely', 'communication', 'english', 'call', 'tools']; const o = { scores: { call: 1 }, comments: {} };
      k.forEach(x => { o.comments[x] = 'AI-' + x; }); o.trainer = 'TRAINER-SUMMARY'; o.overall = 'A steady week.'; return o; }; });
    const idle = async () => { await page.waitForTimeout(400); await page.waitForFunction(() => window.FTRankSummary && !FTRankSummary.busy(), null, { timeout: 30000 }).catch(() => fail('the summary never finished')); await page.waitForTimeout(600); };
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; state.adminData = null; state.adminTab = 'weeklyreports'; goto('admin'); });
    await page.waitForTimeout(2000); await page.evaluate(b => FTBatchSheet.batch(b), BATCH); await page.waitForTimeout(3000);
    await page.evaluate(() => FTRanking.week(1)); await page.waitForTimeout(800);
    if (!(await page.$('#bs-ranking .rks-wrap'))) fail('📊 Weekly Ranking has no management summary');
    // (the week summarized itself on opening, with the AI stubbed below; asked again, it runs once more when that one is done)
    await page.evaluate(() => FTRankSummary.draft()); await idle();
    let d = await get(`rksum:${BATCH}:w1`), r = d && d.rows && d.rows[id];
    if (!r) fail(`the summary wasn't kept: ${JSON.stringify(d).slice(0, 200)}`);
    else {
      if (r.scores.call !== 3.5) fail(`Call Handling should start from the mock call (4.0) and the AI move it 0.5 at most: ${r.scores.call}`);
      if (!(r.scores.attention > 0 && r.scores.attention < 4.6)) fail(`Attention to Detail doesn't come from the accuracy criteria: ${r.scores.attention}`);
      if (r.comments.call !== 'AI-call' || r.comments.tools !== 'AI-tools' || r.trainer !== 'TRAINER-SUMMARY') fail('the AI\'s comments and trainer summary weren\'t kept');
      if (!/DEMO-NOTE/.test(seen) || !/Skipped the DOB check/.test(seen) || !/Good call control/.test(seen)) fail('the AI wasn\'t given the scoresheet\'s comments, remarks and the trainer\'s feedback');
    }
    // a trainer's edit stays when the week is summarized again; without the AI the base scores stand
    await page.evaluate(id => FTRankSummary.set(id, 'comment', 'english', 'EDITED-BY-TRAINER'), id); await page.waitForTimeout(800);
    await page.evaluate(() => { window.callAIJson = async () => { throw new Error('no AI'); }; });
    await page.evaluate(() => FTRankSummary.draft()); await idle();
    d = await get(`rksum:${BATCH}:w1`); r = d && d.rows && d.rows[id];
    if (!r || r.comments.english !== 'EDITED-BY-TRAINER') fail('a trainer\'s edit was lost when the week was summarized again');
    if (!r || r.scores.call !== 4) fail(`without the AI, Call Handling isn't the mock call's 4.0: ${r && r.scores.call}`);
    const doc = await page.evaluate(() => FTRankSummary.doc());
    if (!/Weekly Progress Report/.test(doc) || !/Rosa Report/.test(doc) || !/Call Handling/.test(doc)) fail('⬇ Word doesn\'t give the report');
    // another week picked while a week is being summarized: nothing is saved over the first week's summary, and the week now
    // on screen isn't shown the first week's (the AI made slow, so Week 2 is picked mid-way)
    await put(`rksum:${BATCH}:w2`, null);
    const before = (await get(`rksum:${BATCH}:w1`) || {}).at;
    await page.evaluate(() => { window.callAIJson = async () => { await new Promise(r => setTimeout(r, 2500)); throw new Error('no AI'); }; });
    await page.evaluate(() => { FTRankSummary.draft(); }); await page.waitForTimeout(600);
    await page.evaluate(() => FTRanking.week(2)); await idle(); await page.waitForTimeout(3000); await idle();
    const after = (await get(`rksum:${BATCH}:w1`) || {}).at;
    if (after !== before) fail(`Week 1's summary was saved over after Week 2 was picked mid-way: ${before} → ${after}`);
    const w2 = await get(`rksum:${BATCH}:w2`);
    if (w2 && Number(w2.week) !== 2) fail(`Week 2's summary is Week ${w2.week}'s`);
    const shown = await page.evaluate(() => (document.querySelector('#bs-ranking .rks-wrap') || {}).innerText || '');
    if (/EDITED-BY-TRAINER/.test(shown)) fail('Week 2 shows Week 1\'s summary');
    await put(`rksum:${BATCH}:w2`, null);
    await put(`rksum:${BATCH}:w1`, null); await put('labreview:' + id, null); await put('feedback:' + id, null);
    const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Weekly Ranking summary test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Weekly Ranking summary test passed (seven competencies out of 5 from the week\'s evidence, the AI\'s comments with a score moved 0.5 at most, the base scores without it, a trainer\'s edit kept, the report for ⬇ Word).');
})();
