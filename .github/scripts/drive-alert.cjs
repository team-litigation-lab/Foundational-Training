// 🔔 A trainee is told when a Drive link isn't right (js/ft-drive.js alertBad, from worker.js verifyLinks): on signing in a
//   pop-up names each ✗ link with why and 📁 Fix my links; ✓ Later hides it for the same links and reasons, a new reason
//   shows it again; 📚 Dashboard keeps its notice; the orientation's Part 5 names the six links and the check.
// Usage: NODE_PATH=…/node_modules node .github/scripts/drive-alert.cjs http://localhost:8787/
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
    await signIn(page, 'Lia', 'Links', 'B100926');
    const id = await page.evaluate(() => state.traineeId);
    const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
    const L = { monitor: 'https://docs.google.com/document/d/monMonMonMon01/edit', tam: 'https://docs.google.com/document/d/tamTamTamTam01/edit', typing: 'https://drive.google.com/drive/folders/typTypTypTyp01',
      spelling: 'https://drive.google.com/drive/folders/spSpSpSpSpSp01', folder: 'https://drive.google.com/drive/folders/foFoFoFoFoFo01', tracker: 'https://docs.google.com/spreadsheets/d/trTrTrTrTrTr01/edit' };
    await put('drive:' + id, Object.assign({ days: {} }, L));
    const ok = k => ({ ok: true, mine: true, url: L[k], v: 2, name: k });
    const verify = (why) => Object.assign(Object.fromEntries(Object.keys(L).map(k => [k, ok(k)])), {
      tracker: { ok: false, mine: false, url: L.tracker, v: 2, error: why } });
    await put('trackerreview:' + id, { days: {}, verify: verify('This is Ben Diaz\'s LSH Daily Task Tracker, not yours. Link your own: “LSH Daily Task Tracker | B100926 Lia Links”.'), verifyAt: new Date().toISOString() });
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(4500);
    const pop = await page.evaluate(() => { const m = document.getElementById('fdrAlert'); return m ? m.innerText : ''; });
    if (!/One of your Drive links isn’t right/.test(pop) || !/Daily Task Tracker/.test(pop) || !/Ben Diaz's LSH Daily Task Tracker, not yours/.test(pop) || !/Fix my links/.test(pop)) fail(`no pop-up naming the wrong link and why: ${pop.slice(0, 300)}`);
    const notice = await page.evaluate(() => (document.querySelector('.fdr-notice') || {}).innerText || '');
    if (!/1 Drive link isn’t right/.test(notice)) fail(`📚 Dashboard's notice doesn't say a link isn't right: ${notice}`);
    // ✓ Later: not again for the same reason
    await page.evaluate(() => FTDrive.alertClose()); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(4500);
    if (await page.$('#fdrAlert')) fail('the pop-up came back for the same link and reason after Later');
    // a new reason (the end-of-shift check): told again; 📁 Fix my links opens the links window with the ✗ and why
    await put('trackerreview:' + id, { days: {}, verify: verify('Its name ("LSH Daily Task Tracker | Lia Links") doesn\'t follow the naming rule: it needs your Batch ID.'), verifyAt: new Date().toISOString() });
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(4500);
    if (!/needs your Batch ID/.test(await page.evaluate(() => (document.getElementById('fdrAlert') || {}).innerText || ''))) fail('a new reason wasn\'t told');
    await page.evaluate(() => { document.querySelector('#fdrAlert .btn-navy').click(); }); await page.waitForTimeout(1500);
    const modal = await page.evaluate(() => (document.getElementById('fdrLinkModal') || {}).innerText || '');
    if (!/needs your Batch ID/.test(modal) || !/isn’t right yet/.test(modal)) fail(`📁 Fix my links doesn't open the links with the ✗ and why: ${modal.slice(0, 300)}`);
    if (await page.$('#fdrAlert')) fail('the pop-up stayed over the links window');
    // the orientation's Part 5: all six, their own copies, checked
    const src = await page.evaluate(() => fetch('/js/ft-rules.js').then(r => r.text()));
    if (!/Paste the links of your six/.test(src) || !/the system checks each link and tells you if one isn’t right/.test(src)) fail('the orientation\'s Part 5 doesn\'t name the six links and the check');
    // the Monitoring Sheet downloads already named by its rule, with the trainee's name (so the platform's own steps pass the check)
    if (!/download="LSH VA Training Monitoring Sheet__\$\{esc\(who/.test(src) || !/state\.traineeName/.test(src)) fail('the Monitoring Sheet doesn\'t download named for the trainee');
  } catch (err) { fail(String(err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Drive link alert test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Drive link alert test passed (a pop-up names each wrong link with why on signing in; Later holds for the same reason; a new reason is told again; Fix my links opens the links with the ✗; the Dashboard notice; Part 5 names the six).');
})();
