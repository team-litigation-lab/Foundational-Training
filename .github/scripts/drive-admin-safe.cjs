// 📁 Admin → Drive Trackers shows what a trainee wrote in drive:<id> safely, and a trainer's save never writes over the review:
//   - a day key that isn't a date (an <img onerror> in drive:<id>.days) is left out, and a javascript: output link isn't a link;
//   - the trainer's score and comment (js/ft-drive.js FTDriveAdmin.save) and the tracker comment (js/ft-tracker.js
//     FTTracker.saveComment) read trackerreview:<id> strictly: a failed read saves nothing, so its checks and grades stay.
// Usage: NODE_PATH=…/node_modules node .github/scripts/drive-admin-safe.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => { fail(`a dialog opened: ${d.message()}`); d.dismiss().catch(() => {}); });
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = (key) => page.evaluate(async (key) => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Xia', 'Safe', 'B100926');
    const id = await page.evaluate(() => state.traineeId);
    const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
    const D = await page.evaluate(() => FTTrackerRules.ptDate());
    const BAD = '<img src=x onerror="window.__xss=1">';
    await put('drive:' + id, { folder: 'javascript:window.__xss=2', tracker: 'https://docs.google.com/spreadsheets/d/trXiaSafe01/edit', days: {
      [BAD]: { links: [{ label: 'evil', url: 'https://drive.google.com/file/d/e/view' }] },
      [D]: { links: [{ label: 'Typing Test AM', url: 'https://drive.google.com/file/d/ok/view' }, { label: 'Click me', url: 'javascript:window.__xss=3' }] } } });
    const RV = { days: { [D]: { pct: 50, rules: [], checkedAt: new Date().toISOString() } }, verify: { tracker: { ok: true } }, compliance: { [D]: { pct: 40 } }, eodTrainer: { [D]: { pct: 90 } } };
    await put('trackerreview:' + id, RV);
    // the trainer's 📁 Drive Trackers, with this trainee's row open
    await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'drivetrackers'; goto('admin'); });
    await page.waitForTimeout(2000);
    await page.evaluate((b) => FTDriveAdmin.batch(b), rec.batch || 'B100926');
    await page.evaluate((id) => FTDriveAdmin.open(id), id); await page.waitForTimeout(800);
    const shown = await page.evaluate(() => { const box = document.querySelector('.fss-abody'); return box ? { html: box.innerHTML, imgs: box.querySelectorAll('img').length,
      js: [...box.querySelectorAll('a[href]')].filter(a => !/^https?:/i.test(a.getAttribute('href'))).length, days: box.querySelectorAll('.fdr-aday').length } : null; });
    if (!shown) fail('the trainee\'s row didn\'t open in 📁 Drive Trackers');
    else {
      if (shown.imgs) fail(`a day key a trainee wrote was put in the page as HTML (${shown.imgs} <img>)`);
      if (shown.js) fail(`a link that isn't http(s) was put in an href (${shown.js})`);
      if (shown.days !== 1) fail(`the days listed aren't only the real dates: ${shown.days}`);
      if (!/Typing Test AM/.test(shown.html) || !/Click me/.test(shown.html)) fail('the day\'s output links aren\'t listed');
    }
    await page.waitForTimeout(300);
    if (await page.evaluate(() => window.__xss)) fail('a trainee\'s drive:<id> ran script on the trainer\'s page');
    // a failed read of trackerreview:<id>: the trainer's Save saves nothing
    await page.route('**/api/storage/get', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (String(body.key || '').startsWith('trackerreview:')) return route.fulfill({ status: 503, body: '{"error":"down"}' });
      return route.continue();
    });
    await page.evaluate((id) => { const f = document.querySelector('.fss-abody .fdr-aday .fss-rvform'); f.querySelector('[data-score]').value = '77'; f.querySelector('[data-comment]').value = 'Good day';
      return FTDriveAdmin.save(id, f.getAttribute('data-which'), f.querySelector('button')); }, id);
    await page.waitForTimeout(500);
    await page.unroute('**/api/storage/get');
    let after = await get('trackerreview:' + id);
    if (!after || !after.verify || !after.compliance || !after.eodTrainer) fail(`a failed read let 📁 Drive Trackers' Save write over the trainee's review: ${JSON.stringify(after).slice(0, 200)}`);
    if (after && after.days && after.days[D] && after.days[D].trainerScore != null) fail('a score was saved though the review couldn\'t be read');
    // the same for the tracker's comment (js/ft-tracker.js), opened for this trainee
    await put('trackerreview:' + id, RV);
    await page.evaluate(([id, D]) => FTTracker.openAdmin(id, D), [id, D]); await page.waitForTimeout(2500);
    if (!(await page.$('#fttComment'))) await page.evaluate(() => { const t = document.createElement('textarea'); t.id = 'fttComment'; t.style.display = 'none'; document.body.appendChild(t); });
    await page.route('**/api/storage/get', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (String(body.key || '').startsWith('trackerreview:')) return route.fulfill({ status: 503, body: '{"error":"down"}' });
      return route.continue();
    });
    await page.evaluate(() => { document.getElementById('fttComment').value = 'A comment'; return FTTracker.saveComment(); });
    await page.waitForTimeout(500);
    await page.unroute('**/api/storage/get');
    after = await get('trackerreview:' + id);
    if (!after || !after.verify || !after.compliance || !after.eodTrainer) fail(`a failed read let the tracker's comment write over the trainee's review: ${JSON.stringify(after).slice(0, 200)}`);
    // and with the read working, the comment is saved, the rest kept
    await page.evaluate(() => { document.getElementById('fttComment').value = 'A comment'; return FTTracker.saveComment(); });
    await page.waitForTimeout(500);
    after = await get('trackerreview:' + id);
    if (!after || !after.verify || !after.days || !after.days[D] || after.days[D].comment !== 'A comment') fail(`the tracker's comment wasn't saved with the review kept: ${JSON.stringify(after).slice(0, 200)}`);
  } catch (err) { fail(String(err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Drive Trackers safety test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Drive Trackers safety test passed (a trainee\'s day keys and links shown safely to the trainer; a failed read of the review saves nothing, from 📁 Drive Trackers and from the tracker\'s comment).');
})();
