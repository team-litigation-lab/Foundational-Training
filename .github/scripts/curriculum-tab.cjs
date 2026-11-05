// Admin → 📘 Curriculum when /trainer/curriculum.json can't be loaded (an expired Admin sign-in gets a 401): the tab
// asks once, shows the failure with a Retry button, and doesn't fetch and re-render over and over; Retry asks once more,
// and a curriculum that then loads shows.
// Usage: NODE_PATH=…/node_modules node .github/scripts/curriculum-tab.cjs http://localhost:8787/
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => fail('page error: ' + e.message));
  let asks = 0, ok = false;
  await page.route('**/trainer/curriculum.json*', r => { asks++;
    return ok ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ days: [{ id: 'd1', heading: 'Day One', html: '<p>Lesson body</p>' }] }) })
              : r.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"unauthorized"}' }); });
  try {
    await page.goto(BASE);
    await page.waitForFunction(() => typeof renderFtCurriculum === 'function' && typeof goto === 'function', null, { timeout: 15000 });
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.adminToken = 'expired'; state.adminData = []; state.adminTab = 'curriculum'; goto('admin'); });
    await page.waitForTimeout(2000);
    const card = await page.evaluate(() => { const c = document.querySelector('.ftc'); return c ? { text: c.textContent, retry: !!c.querySelector('button') } : null; });
    if (asks > 1) fail(`a failed curriculum load is fetched again and again (${asks} requests in 2 s)`);
    if (!card || !/Couldn.t load the curriculum/.test(card.text)) fail(`the failure isn't shown: ${JSON.stringify(card)}`);
    else if (!card.retry) fail('no Retry button on the failure');
    ok = true; const before = asks;
    await page.evaluate(() => document.querySelector('.ftc button').click()).catch(e => fail('Retry: ' + e.message));
    await page.waitForTimeout(1200);
    if (asks - before !== 1) fail(`Retry asked ${asks - before} times, not once`);
    const shown = await page.evaluate(() => (document.querySelector('.ftc') || {}).textContent || '');
    if (!/Day One/.test(shown)) fail(`the curriculum loaded by Retry isn't shown: ${shown.slice(0, 120)}`);
  } catch (e) { fail('test crashed: ' + (e && e.stack || e)); }
  await b.close();
  if (failures.length) { console.error('Curriculum tab test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Curriculum tab test passed (a failed load asks once and shows Retry, with no fetch loop; Retry asks once more and shows the curriculum).');
})();
