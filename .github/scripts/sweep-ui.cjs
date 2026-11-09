// 🧹 Sweep inactive accounts on the 📋 Batch Sheet (js/ft-batch-sheet.js sweepHtml): the menu's 🧹 lists every inactive account
//   (archived, offboarded, rejected) and leftover records with a tick each, never an active trainee; an unticked one stays;
//   ⬇ Back up and sweep downloads the backup (.json, every record) BEFORE anything is removed, then sweeps the ticked ones.
//   And 👥 Duplicate accounts lists active accounts only: Lei's archived old account is swept, not offered to merge.
// Usage: NODE_PATH=…/node_modules node .github/scripts/sweep-ui.cjs http://localhost:8787/
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true }), page = await ctx.newPage();
  page.on('pageerror', e => fail(`page error: ${e.message} @ ${(e.stack || '').split('\n').slice(1, 4).join(' | ')}`));
  const put = (k, v) => page.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  try {
    await page.goto(BASE); await page.waitForFunction(() => typeof FTBatchSheet === 'object', null, { timeout: 20000 });
    const T = (id, x) => put('trainee:' + id, Object.assign({ id, name: x.name, batch: id.split('--')[1].toUpperCase(), registeredAt: '2026-10-30T12:00:00Z' }, x));
    await T('lei-abut--b103026', { name: 'Lei Abut', approved: true });
    await T('lei-abut--b250926', { name: 'Lei Abut', approved: true, archived: true, autoArchived: true, registeredAt: '2026-08-07T12:00:00Z', dayProgress: { 1: { done: true } } });   // (registered long ago: the tidy-up doesn't bring it back)
    await put('progress:lei-abut--b250926', { data: { notes: 'old account' } });
    await T('rey-jected--b103026', { name: 'Rey Jected', approved: false, rejected: true });
    await T('kay-keep--b090126', { name: 'Kay Keep', approved: true, archived: true, registeredAt: '2026-08-01T12:00:00Z' });
    await T('ana-cruz--b103026', { name: 'Ana Cruz', approved: true });
    await page.evaluate(() => { state.isAdmin = true; state.adminData = null; state.adminTab = 'batchsheet'; goto('admin'); });
    await page.waitForTimeout(1500); await page.evaluate(() => FTBatchSheet.batch('B103026')); await page.waitForTimeout(2500);
    if (await page.$('.bs-dup')) fail('👥 Duplicate accounts offers Lei\'s archived old account to merge');
    await page.evaluate(() => { state.adminTab = 'batches'; render(); FTBatchSheet.sweepOpen(); }); await page.waitForTimeout(1500);   // (🧹 is on 🛡 Admin Master Control → 📁 Batches)
    const list = await page.evaluate(() => [...document.querySelectorAll('.bs-sweep tbody tr code')].map(c => c.textContent).sort());
    if (JSON.stringify(list) !== JSON.stringify(['kay-keep--b090126', 'lei-abut--b250926', 'rey-jected--b103026'])) fail(`the sweep lists: ${list}`);
    // Kay unticked: kept
    await page.evaluate(() => FTBatchSheet.sweepPick('kay-keep--b090126', false)); await page.waitForTimeout(300);
    if (!/Back up and sweep 2/.test(await page.evaluate(() => document.querySelector('.bs-sweep .btn-navy').textContent))) fail('the button doesn\'t count the ticked ones');
    page.on('dialog', d => d.accept());
    // the backup downloads first: when it arrives, nothing is removed yet
    // (the backup file is handed to the browser — its link clicked — before the first request that removes anything)
    await page.evaluate(() => { const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){ if(this.download) window.__dlAt = Date.now(); return c.apply(this, arguments); }; });
    const order = [];
    page.on('request', r => { if (/\/api\/batch\/sweep$/.test(r.url()) && !/"dry":true/.test(r.postData() || '')) order.push(page.evaluate(() => window.__dlAt || null)); });
    const dl = page.waitForEvent('download', { timeout: 20000 });
    await page.evaluate(() => document.querySelector('.bs-sweep .btn-navy').click());
    const d = await dl, file = await d.path(), backup = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!/^Swept accounts .*\(2\)\.json$/.test(d.suggestedFilename())) fail(`the backup's name: ${d.suggestedFilename()}`);
    if (!backup.accounts['lei-abut--b250926'] || backup.accounts['lei-abut--b250926'].records['progress:lei-abut--b250926'].data.notes !== 'old account' || !backup.accounts['rey-jected--b103026']) fail(`the backup doesn't hold their records: ${Object.keys(backup.accounts || {})}`);
    if (backup.accounts['kay-keep--b090126']) fail('the unticked account is in the backup');
    await page.waitForTimeout(3500);
    const firstDel = await (order[0] || Promise.resolve('none'));
    if (!firstDel || firstDel === 'none') fail(`an account was removed before its backup was saved: ${firstDel}`);
    if (await get('trainee:lei-abut--b250926') || await get('progress:lei-abut--b250926') || await get('trainee:rey-jected--b103026')) fail('the ticked accounts weren\'t swept');
    if (!(await get('trainee:kay-keep--b090126'))) fail('the unticked account was swept');
    if (!(await get('trainee:lei-abut--b103026'))) fail('Lei\'s active account was swept');
    if (await page.$('.bs-sweep')) fail('the sweep panel stayed open');
  } catch (err) { fail(String(err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Sweep (page) test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Sweep (page) test passed (every inactive account listed, never an active one; an unticked one kept; the backup downloads before anything is removed; the ticked ones swept; 👥 lists active accounts only).');
})();
