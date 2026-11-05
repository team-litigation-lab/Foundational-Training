// 👥 Duplicate accounts on the 📋 Batch Sheet (js/ft-batch-sheet.js dupHtml): one trainee with two accounts (one in this batch,
//   one in another) shows with each account's batch, registration, last activity and lessons done; the one in this batch
//   with the most progress is kept by default; 👥 Merge (confirmed) merges the other into it (worker.js /api/batch/merge)
//   and the sheet shows one Valeria with both accounts' progress; the panel is gone.
// Usage: NODE_PATH=…/node_modules node .github/scripts/dup-accounts.cjs http://localhost:8787/
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, v) => page.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  try {
    await page.goto(BASE); await page.waitForFunction(() => typeof FTBatchSheet === 'object', null, { timeout: 20000 });
    const K = 'valeria-sarti--b103026', F = 'valeria-sarti--b110226';
    await put('trainee:' + K, { id: K, name: 'Valeria Sarti', batch: 'B103026', approved: true, registeredAt: '2026-10-30T12:00:00Z', dayProgress: { 1: { done: true, score: 80 }, 2: { done: true, score: 85 } } });
    await put('trainee:' + F, { id: F, name: 'Valeria Sarti', batch: 'B110226', approved: true, registeredAt: '2026-11-02T12:00:00Z', dayProgress: { 3: { done: true, score: 90 } } });
    await put('trainee:tia-other--b103026', { id: 'tia-other--b103026', name: 'Tia Other', batch: 'B103026', approved: true, registeredAt: '2026-10-30T12:00:00Z' });
    await put('progress:' + F, { data: { 'work-log': [{ at: '2026-11-03T10:00:00Z', kind: 'lab', label: 'from the faulty account' }] } });
    await page.evaluate(() => { state.isAdmin = true; state.adminData = null; state.adminTab = 'batchsheet'; goto('admin'); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => FTBatchSheet.batch('B103026')); await page.waitForTimeout(2500);
    const box = await page.evaluate(() => { const d = document.querySelector('.bs-dup'); return d ? { text: d.innerText, keep: d.querySelector('input[type=radio]:checked') && d.querySelector('input[type=radio]:checked').getAttribute('aria-label') } : null; });
    if (!box || !/Valeria Sarti has 2 accounts/.test(box.text) || !/B110226/.test(box.text) || !/B103026 \(this batch\)/.test(box.text)) fail(`no 👥 Duplicate accounts panel for Valeria: ${JSON.stringify(box)}`);
    else if (!/valeria-sarti--b103026/.test(box.keep || '')) fail(`the account in this batch isn't kept by default: ${box.keep}`);
    if (box && /Tia Other/.test(box.text)) fail('a trainee with one account is listed as a duplicate');
    page.on('dialog', d => d.accept());
    await page.evaluate(() => document.querySelector('.bs-dup .btn-navy').click()); await page.waitForTimeout(3500);
    if (await get('trainee:' + F)) fail('the faulty account is still there after the merge');
    const kr = await get('trainee:' + K);
    if (!kr || !kr.dayProgress[3] || kr.batch !== 'B103026') fail(`the kept account didn't get the faulty one's progress: ${JSON.stringify(kr)}`);
    if (!((await get('progress:' + K)) || { data: {} }).data['work-log']) fail('the faulty account\'s work log didn\'t move');
    await page.waitForTimeout(1500);
    if (await page.$('.bs-dup')) fail('the 👥 panel is still there after the merge');
    const names = await page.evaluate(() => FTBatchSheet.tables().find(t => t.id === 'compliance').rows.map(r => r[0].v));
    if (names.filter(n => /Valeria/.test(n)).length !== 1) fail(`the sheet doesn't show one Valeria: ${names}`);
  } catch (err) { fail(String(err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Duplicate accounts test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Duplicate accounts test passed (one trainee\'s two accounts listed with their batches and progress, this batch\'s kept by default, 👥 Merge merges the other into it, the sheet shows her once with all her progress).');
})();
