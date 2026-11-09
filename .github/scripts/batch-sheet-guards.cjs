// 📋 Batch Sheet (js/ft-batch-sheet.js) and 📜 Trainee log (js/ft-trainee-log.js), as a trainer, with what a trainee writes:
//   - a Drive link the trainee saved that isn't an http(s) address (javascript:…) is never put in an href: not as ↗ Open in
//     the 🔗 link issues list, not in the 📜 Log's output links or link checks;
//   - ↩ Bring them back on a batch spelt another way ("b 01-03-25") marks it restored in settings:autoarchive under the
//     tidy-up's own cleaned key too (js/ft-admin-tidy.js reads done[batchKey(r)]), so it isn't archived again.
// Usage: NODE_PATH=…/node_modules node .github/scripts/batch-sheet-guards.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
// (Batch IDs no other test uses)
const LINKB = 'B010425', BACKB = 'B010325', BACK_RAW = 'b 01-03-25';
const BAD = 'javascript:window.__pwned=1';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);

  const ids = {};
  for (const [f, l, b] of [['Lia', 'Linker', LINKB], ['Bo', 'Backer', BACKB]]) {
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} state.traineeId = null; });
    await signIn(page, f, l, b);
    ids[f] = await page.evaluate(() => state.traineeId);
  }
  const now = new Date().toISOString(), day = now.slice(0, 10);
  // Lia saved a javascript: link as her Monitoring Sheet and as a day's output link; the link check copied it
  { const r = await get('trainee:' + ids.Lia); r.approved = true; r.archived = false; await put('trainee:' + ids.Lia, r); }
  await put('drive:' + ids.Lia, { monitor: BAD, tracker: BAD, days: { [day]: { submittedAt: now, links: [{ label: 'EVIL-OUT', url: BAD }, { label: 'GOOD-OUT', url: 'https://docs.google.com/document/d/goodgoodgood/edit' }] } } });
  await put('trackerreview:' + ids.Lia, { days: {}, verify: { monitor: { url: BAD, ok: false, error: 'the system can\'t open it', at: now } }, verifyAt: now });
  // Bo was archived by the tidy-up, his batch spelt another way (registered long ago: the tidy-up doesn't bring him back itself)
  { const r = await get('trainee:' + ids.Bo); Object.assign(r, { approved: true, archived: true, autoArchived: true, archivedAt: now, batch: BACK_RAW, registeredAt: '2025-01-03T09:00:00.000Z' }); await put('trainee:' + ids.Bo, r); }
  await put('settings:autoarchive', { done: {}, updatedAt: now });

  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'batchsheet'; goto('admin'); });
  await page.waitForTimeout(1500);
  const hrefs = () => page.evaluate(() => [...document.querySelectorAll('main a[href], body a[href]')].map(a => a.getAttribute('href')).filter(h => /^\s*javascript:(?!\s*void)/i.test(h) && /pwned/.test(h)));

  // 🔗 the link issues list: Lia's links are listed, with no ↗ Open on a javascript: one
  // (connected as the service account, so the list shows; no real Drive checks)
  await page.route('**/api/drive/status', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ sa: true, saOk: true, email: 'lsh-training-drive@ci.iam.gserviceaccount.com', subject: '' }) }));
  await page.route('**/api/drive/verify', r => r.fulfill({ contentType: 'application/json', body: '{"ok":true,"verify":{}}' }));
  await page.route('**/api/drive/autolink', r => r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }));
  await page.evaluate(b => FTBatchSheet.batch(b), LINKB); await page.waitForTimeout(3000);
  await page.evaluate(() => FTBatchSheet.dstat()); await page.waitForTimeout(2500);
  { const li = await page.evaluate(() => [...document.querySelectorAll('.bs-li > tbody')].map(l => l.innerText));
    if (!li.some(t => /Lia/.test(t))) fail(`Lia's links aren't in the link issues list: ${JSON.stringify(li).slice(0, 300)}`);
    const bad = await hrefs(); if (bad.length) fail(`a javascript: link the trainee saved is an href on the Batch Sheet: ${JSON.stringify(bad)}`); }

  // 📜 the trainee log: the output links and the link checks, with no javascript: href (the https one still a link)
  await page.evaluate(([id, n]) => FTTraineeLog.open(id, n), [ids.Lia, 'Lia Linker']); await page.waitForTimeout(2500);
  { const bad = await hrefs(); if (bad.length) fail(`a javascript: link is an href on the 📜 Log's evaluations: ${JSON.stringify(bad)}`); }
  await page.evaluate(() => FTTraineeLog.tab('out')); await page.waitForTimeout(800);
  { const bad = await hrefs(); if (bad.length) fail(`a javascript: link is an href on the 📜 Log's submitted outputs: ${JSON.stringify(bad)}`);
    const o = await page.evaluate(() => ({ text: document.querySelector('main').innerText, good: !!document.querySelector('a[href^="https://docs.google.com/document/d/goodgoodgood"]') }));
    if (!/EVIL-OUT/.test(o.text) || !o.good) fail(`the 📜 Log's output links aren't all listed (the unsafe one as text, the https one as a link): ${JSON.stringify(o).slice(0, 300)}`); }
  if (await page.evaluate(() => !!window.__pwned)) fail('the trainee\'s javascript: link ran');

  // ↩ Bring them back on the batch spelt "b 01-03-25": restored, and marked done under the tidy-up's key
  await page.evaluate(() => { state.adminData = null; state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(1500);
  await page.evaluate(b => FTBatchSheet.batch(b), BACK_RAW); await page.waitForTimeout(2500);
  const key = await page.evaluate(b => batchKey({ batch: b }), BACK_RAW);
  await page.evaluate(() => FTBatchSheet.bringBack()); await page.waitForTimeout(2500);
  const rec = await get('trainee:' + ids.Bo), aa = (await get('settings:autoarchive')) || {};
  if (!rec || rec.archived || !rec.restoredAt) fail(`↩ Bring them back didn't restore the trainee, or the tidy-up archived them again on the reload: ${JSON.stringify(rec && { archived: rec.archived, batch: rec.batch })}`);
  if (!(aa.done || {})[key]) fail(`↩ Bring them back didn't mark the batch done under the tidy-up's key ${key}: ${JSON.stringify(aa.done)}`);

  await browser.close();
  if (failures.length) { console.error('Batch Sheet guards test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Batch Sheet guards test passed (a javascript: Drive link the trainee saved is never an href on the Batch Sheet or the 📜 Log; ↩ Bring them back marks the batch done under the tidy-up\'s cleaned key).');
})().catch(e => { console.error(e); process.exit(1); });
