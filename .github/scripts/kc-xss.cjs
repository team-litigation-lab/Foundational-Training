// 🔒 A Knowledge Check's grading record (process:<id>.kc / .kcRead[lesson] = {attempts, best, last}) is the trainee's own to
//   write, so its scores are shown as numbers only (js/ft-process.js num): markup saved as a best score or an answer's
//   score never runs in the trainer's ✍️ Knowledge Check (the row's pills, the review, the answer sheet) or on the
//   trainee's own Knowledge Check page.
// Usage: NODE_PATH=…/node_modules node .github/scripts/kc-xss.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = (key) => page.evaluate(async (key) => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  const fired = () => page.evaluate(() => ({ x: window.__xss || 0, img: document.querySelectorAll('img[data-xss]').length }));
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Xia', 'Scores', 'B141126');
    const id = await page.evaluate(() => state.traineeId);
    const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
    await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
    const bad = '<img data-xss src=x onerror="window.__xss=(window.__xss||0)+1">';
    const sid = await page.evaluate(() => ftKcQuestions(2)[0].set.id);
    const qn = await page.evaluate(() => ftKcQuestions(2).length);
    const answers = Array.from({ length: qn }, (_, i) => `My answer to question ${i + 1} in complete sentences here.`);
    // (the trainee's own save: one attempt, so the server keeps it as sent)
    await put('process:' + id, { sets: { [sid]: { answers, submittedAt: new Date().toISOString() } },
      kc: { 2: { attempts: 1, best: bad, last: { pct: bad, summary: 'Fine.', at: new Date().toISOString(), items: [{ sid, i: bad, score: bad, feedback: 'ok' }, { sid, i: 0, score: bad, feedback: 'ok' }] } } } });
    const saved = await get('process:' + id);
    if (!saved || !saved.kc || saved.kc[2].best !== bad) fail('the test record was not saved as sent');

    // the trainee's own Knowledge Check page
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);
    await page.evaluate(() => FTKc.open(2)); await page.waitForTimeout(2000);
    let f = await fired();
    if (f.x || f.img) fail(`the trainee's Knowledge Check page ran markup from the grading record: ${JSON.stringify(f)}`);

    // the trainer: ✍️ Knowledge Check → the trainee (row pills) → the Knowledge Check review → the answer sheet
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; goto('process'); }); await page.waitForTimeout(2500);
    f = await fired(); if (f.x || f.img) fail(`the trainer's list ran markup from a trainee's best score: ${JSON.stringify(f)}`);
    await page.evaluate(id => { FTProcessAdmin.row(id); }, id); await page.waitForTimeout(800);
    await page.evaluate(id => { FTProcessAdmin.kc(id, 2, false); }, id); await page.waitForTimeout(800);
    await page.evaluate(([id, sid]) => { FTProcessAdmin.sheet(id, sid); }, [id, sid]); await page.waitForTimeout(800);
    f = await fired(); if (f.x || f.img) fail(`the trainer's review ran markup from the grading record: ${JSON.stringify(f)}`);
    const txt = await page.evaluate(() => (document.querySelector('.fp-kcadmin') || {}).innerText || '');
    if (!/graded best —% ·/.test(txt)) fail(`a best score that isn't a number isn't shown as —: ${txt.slice(0, 300)}`);
    await page.waitForTimeout(500);
    f = await fired(); if (f.x) fail('markup from the grading record ran');
  } catch (err) { fail(String(err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Knowledge Check scores (XSS) test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Knowledge Check scores (XSS) test passed (a grading record\'s scores show as numbers only, for the trainer and the trainee).');
})();
