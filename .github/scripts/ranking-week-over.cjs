// 📊 Weekly Ranking (js/ft-ranking.js weekOver): a week is over from its Friday's 22:30 UTC on — on that Friday's Pacific
// evening too, when it is already Saturday in UTC — so a week with no report drafts itself (🤖 "Week 1 is over") then.
//   The page's clock is set to Friday 2026-10-30, 17:30 PDT (2026-10-31T00:30Z), in the Week 1 of batch B102626.
// Usage: NODE_PATH=…/node_modules node .github/scripts/ranking-week-over.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B102626';   // (Monday 2026-10-26: its Week 1's Friday is 2026-10-30)
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  let id = null;
  try {
    // (the clock is fixed before the page loads: fixing it while the Batch Sheet loads left the report unrendered at times)
    await page.clock.setFixedTime(new Date('2026-10-31T00:30:00Z'));
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Fri', 'Evening', BATCH);
    id = await page.evaluate(() => state.traineeId);
    const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
    // (an older batch is archived on an admin load by js/ft-admin-tidy.js: kept active, as a batch a trainer restored is)
    { const a = (await get('settings:autoarchive')) || {}; a.done = Object.assign({}, a.done, { [BATCH]: new Date().toISOString() }); await put('settings:autoarchive', a); }
    await put(`ranking:${BATCH}:w1`, null);
    // (the draft it starts isn't kept: this test is about when it starts)
    await page.evaluate(b => { const s = window.sharedSet; window.sharedSet = function (k) { return String(k).startsWith(`ranking:${b}:`) ? Promise.resolve(true) : s.apply(this, arguments); }; }, BATCH);
    await page.evaluate(() => { state.traineeId = null; state.isAdmin = true; state.adminPreview = false; state.adminData = null; FTRanking.reload(); state.adminTab = 'ranking'; goto('admin'); });
    await page.waitForTimeout(2000);
    // (the batch and week picked, then the report read: either the draft starting or the offer to start it; picked again if
    //  the Batch Sheet, still loading, drew over it — up to three times)
    // (on a busy runner the admin page can still be drawing, or re-drawn from scratch, when the report is picked: a wait that
    //  ends at once — the page re-rendered under it — is followed by a pause and the Ranking tab opened again, up to five times)
    for (let n = 0; n < 5; n++) {
      const t0 = Date.now();
      await page.evaluate(b => { if (state.adminTab !== 'ranking' || state.view !== 'admin') { state.adminTab = 'ranking'; goto('admin'); } FTRanking.batch(b); FTRanking.week(1); }, BATCH).catch(() => {});
      const ok = await page.waitForFunction(() => /is over|hasn.t been started/.test((document.querySelector('.rk') || {}).innerText || ''), null, { timeout: 10000 }).then(() => true, () => false);
      if (ok) break;
      if (Date.now() - t0 < 9000) await page.waitForTimeout(2000);
    }
    // (and the report read once it says so: a re-draw right after the wait above left it empty for a moment on a busy runner)
    await page.waitForFunction(() => /Week 1 is over/.test((document.querySelector('.rk') || {}).innerText || ''), null, { timeout: 10000 }).catch(() => {});
    const txt = await page.evaluate(() => (document.querySelector('.rk') || {}).innerText || '');
    if (!/Week 1 is over/.test(txt)) { const d = await page.evaluate(() => ({ view: state.view, tab: state.adminTab, admin: state.isAdmin, rk: !!document.querySelector('.rk'), url: location.hash, body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) })).catch(e => String(e));
      fail(`on the week's Friday at 17:30 PDT (00:30 UTC Saturday) the week isn't over: ${txt.replace(/\s+/g, ' ').slice(-400)} · the page: ${JSON.stringify(d)}`); }
  } catch (e) { fail(e.stack || String(e)); }
  try {
    if (id) { const r = await get('trainee:' + id); r.archived = true; await put('trainee:' + id, r); }
    await put(`ranking:${BATCH}:w1`, null);
    const a = (await get('settings:autoarchive')) || {}; if (a.done) { delete a.done[BATCH]; await put('settings:autoarchive', a); }
  } catch (e) {}
  await browser.close();
  if (failures.length) { console.error('Weekly Ranking week-over test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Weekly Ranking week-over test passed (a week is over on its Friday\'s Pacific evening, after 22:30 UTC, when UTC is already Saturday).');
})();
