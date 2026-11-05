// 🗄 Admin → Database Maintenance (js/ft-admin-ops.js): 🔍 Scan reads the database with a surprise-task-day<N> record in
//   it and lists what Clear would remove: a random task that ended over 30 days ago is a stopped alert, one still running
//   (or ended lately) is kept, and a ping over 7 days old goes. The scan only reads.
// Usage: NODE_PATH=…/node_modules node .github/scripts/db-maintenance.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
const DAY = 864e5;

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Dana', 'Sweep', 'B103026');
  const iso = ms => new Date(ms).toISOString(), now = Date.now();
  // a task stopped 40 days ago, one still running, one stopped 3 days ago
  await put('surprise-task-day7', { active: false, generatedAt: iso(now - 41 * DAY), expiresAt: iso(now - 40 * DAY), history: [] });
  await put('surprise-task-day8', { active: true, generatedAt: iso(now - 60 * DAY), expiresAt: iso(now + DAY) });
  await put('surprise-task-day9', { active: false, generatedAt: iso(now - 4 * DAY), expiresAt: iso(now - 3 * DAY) });
  await put('checkin:' + iso(now - 20 * DAY).slice(0, 10) + ':dana-sweep--b103026', { timeIn: '08:00' });
  await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; state.adminTab = 'dbmaint'; goto('admin'); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => FTOps.dbScan());
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ err: (document.querySelector('.ops-err') || {}).textContent || '',
    keys: [...document.querySelectorAll('.ops-key')].map(x => x.textContent),
    clear: [...document.querySelectorAll('button')].some(b => /🗑 Clear/.test(b.textContent)) }));
  if (r.err) fail(`the scan failed: ${r.err}`);
  if (!r.keys.includes('surprise-task-day7')) fail(`a random task that ended over 30 days ago isn't listed: ${JSON.stringify(r.keys)}`);
  if (r.keys.includes('surprise-task-day8')) fail('a random task still running is listed to clear');
  if (r.keys.includes('surprise-task-day9')) fail('a random task that ended 3 days ago is listed to clear');
  if (!r.keys.some(k => /^checkin:.*:dana-sweep--b103026$/.test(k))) fail(`a ping over 7 days old isn't listed: ${JSON.stringify(r.keys)}`);
  if (!r.clear) fail('there is no 🗑 Clear button after a scan with records to clear');
  await browser.close();
  if (failures.length) { console.error('FAIL\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('OK: Database Maintenance scans the random tasks and lists only the ones stopped over 30 days ago');
})().catch(e => { console.error(e); process.exit(1); });
