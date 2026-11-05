// 🔒 A Knowledge Check is taken once, on the page (js/ft-process.js): after the graded attempt the trainee's button is
//   ✓ Taken (disabled), the answers read-only and the note says a trainer can grant a retry; pressing Submit anyway grades
//   nothing; the trainer's ✍️ Knowledge Check shows the attempts used and ↺ Grant a retry (with the reason), saved in
//   kcreview:<id>; the trainee then gets 🔁 Retry granted by your trainer: Submit for Grading, the answers editable again.
// Usage: NODE_PATH=…/node_modules node .github/scripts/kc-once-ui.cjs http://localhost:8787/
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
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const batch = 'B100926';
    await signIn(page, 'Kai', 'Once', batch);
    const id = await page.evaluate(() => state.traineeId);
    const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
    await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
    // Lesson 2's Knowledge Check, graded once (55%)
    const qn = await page.evaluate(() => ftKcQuestions(2).length);
    const answers = Array.from({ length: qn }, (_, i) => `My answer to question ${i + 1} in complete sentences here.`);
    // (the page opens before the attempt: Submit for Grading)
    await put('process:' + id, { sets: { 'law-firm-communication': { answers } } });
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);
    await page.evaluate(() => FTKc.open(2)); await page.waitForTimeout(2000);
    const t0 = await page.evaluate(() => { const b = document.getElementById('kcSubmit'); return { b: b && b.textContent, dis: b && b.disabled }; });
    if (t0.dis || t0.b !== 'Submit for Grading') fail(`before the attempt the button isn't Submit for Grading: ${JSON.stringify(t0)}`);
    // the attempt is graded in another tab (saved on the server); this stale tab must not grade again
    let ai = 0; await page.exposeFunction('__aiCalled', () => { ai++; });
    await page.evaluate(() => { const o = window.callAIJson; window.callAIJson = async (...a) => { window.__aiCalled(); return o(...a); }; });
    await put('process:' + id, { sets: { 'law-firm-communication': { answers } }, kc: { 2: { attempts: 1, best: 55, last: { pct: 55, items: [], summary: 'Satisfactory.', at: new Date().toISOString() } } } });
    await page.evaluate(() => FTKc.submit(2)); await page.waitForTimeout(2000);
    if (ai) fail('a tab opened before the attempt graded the Knowledge Check again');
        await page.evaluate(() => FTKc.open(2)); await page.waitForTimeout(1500);
    const t1 = await page.evaluate(() => { const b = document.getElementById('kcSubmit'); return { b: b && b.textContent, dis: b && b.disabled, ro: [...document.querySelectorAll('.kc-card textarea')].every(t => t.readOnly), n: document.querySelectorAll('.kc-card textarea').length, note: (document.querySelector('.kc-once') || {}).textContent || '', intro: document.querySelector('.kc-hero').innerText }; });
    if (!t1.dis || !/Taken · 1 of 1 attempt used/.test(t1.b)) fail(`after the graded attempt the button isn't ✓ Taken (disabled): ${JSON.stringify(t1)}`);
    if (!t1.n || !t1.ro) fail('the answers of a taken Knowledge Check are still editable');
    if (!/taken once/.test(t1.note) || !/grant a retry/.test(t1.note)) fail(`the note doesn't say it is taken once and a trainer can grant a retry: ${t1.note}`);
    if (/Retake/.test(t1.intro)) fail('the Knowledge Check page still offers retakes');
    // pressing Submit anyway grades nothing (no AI call, no new attempt)
    await page.evaluate(() => FTKc.submit(2)); await page.waitForTimeout(1500);
    if (ai) fail('a taken Knowledge Check was sent for grading again');
    if (((await get('process:' + id)).kc[2] || {}).attempts !== 1) fail('a second attempt was recorded');

    // the trainer: ✍️ Knowledge Check → the trainee → Lesson 2 → ↺ Grant a retry, with the reason
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; goto('process'); }); await page.waitForTimeout(2500);
    await page.evaluate(id => { FTProcessAdmin.row(id); }, id); await page.waitForTimeout(800);
    await page.evaluate(id => { FTProcessAdmin.kc(id, 2, false); }, id); await page.waitForTimeout(800);
    const box = await page.evaluate(() => { const r = document.querySelector('.fp-retry'); return r ? r.innerText : ''; });
    if (!/Taken once\. 1 of 1 attempt used/.test(box)) fail(`the trainer's retry box doesn't show the attempts used: ${box}`);
    await page.evaluate(id => { const r = document.querySelector('.fp-retry'); FTProcessAdmin.retry(id, 2, false, r.querySelector('button')); }, id); await page.waitForTimeout(800);
    if (((await get('kcreview:' + id)) || {}).retries) fail('a retry was granted without a reason');
    await page.evaluate(id => { const r = document.querySelector('.fp-retry'); r.querySelector('[data-retry-why]').value = 'The connection dropped while grading.'; FTProcessAdmin.retry(id, 2, false, r.querySelector('button')); }, id);
    await page.waitForTimeout(1500);
    const rv = await get('kcreview:' + id);
    if (!rv || !rv.retries || rv.retries['2'] !== 1 || !(rv.retryLog || []).some(g => g.key === '2' && /connection dropped/.test(g.why))) fail(`the retry wasn't saved with its reason: ${JSON.stringify(rv)}`);
    const after = await page.evaluate(() => document.querySelector('.fp-kcadmin') ? document.querySelector('.fp-kcadmin').innerText : '');
    if (!/retry granted, not used yet/.test(after) || !/connection dropped/.test(after)) fail(`the trainer doesn't see the retry waiting and its reason: ${after.slice(0, 300)}`);

    // the trainee: one more attempt, the answers editable again
    await page.evaluate(() => { state.isAdmin = false; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);
    await page.evaluate(() => FTKc.open(2)); await page.waitForTimeout(2500);
    const t2 = await page.evaluate(() => { const b = document.getElementById('kcSubmit'); return { b: b && b.textContent, dis: b && b.disabled, ro: [...document.querySelectorAll('.kc-card textarea')].some(t => t.readOnly) }; });
    if (t2.dis || !/Retry granted by your trainer/.test(t2.b) || t2.ro) fail(`after the retry the trainee can't submit once more: ${JSON.stringify(t2)}`);
  } catch (err) { fail(String(err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Knowledge Check once (page) test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Knowledge Check once (page) test passed (✓ Taken and read-only after the graded attempt, no second grading; the trainer sees the attempts and grants a retry with its reason; the trainee then gets one more attempt).');
})();
