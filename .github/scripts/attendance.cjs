// 🕘 Admin → Admin Master Control → 🕘 Attendance (js/ft-attendance.js): every active trainee, batch by batch, with the
//   day's Time In from checkin:<date>:<id>; a trainee who hasn't opened the course is listed as ⏳ Not in yet; an archived
//   trainee isn't listed; ◀ moves to the day before.
// Usage: NODE_PATH=…/node_modules node .github/scripts/attendance.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
const etDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Alma', 'Attend', 'B103026');
  const at = new Date().toISOString();
  const T = (id, name, batch, extra) => put('trainee:' + id, Object.assign({ id, name, batch, approved: true, registeredAt: at }, extra || {}));
  await T('ivy-in--b103026', 'Ivy In', 'B103026'); await T('owen-out--b103026', 'Owen Out', 'B103026');
  await T('bea-other--b102626', 'Bea Other', 'B102626'); await T('arch-gone--b102626', 'Arch Gone', 'B102626', { archived: true });
  await put(`checkin:${etDate()}:ivy-in--b103026`, { timeIn: '08:25', at, name: 'Ivy In', batch: 'B103026', training: 'Day 1 · Virtual Assistant Essentials' });
  await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; state.adminTab = 'attendance'; goto('admin'); });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({ tab: !!document.querySelector('.fat-admin'), btn: [...document.querySelectorAll('button, a')].some(b => /🕘 Attendance/.test(b.textContent)),
    rows: [...document.querySelectorAll('.fat-tbl tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()), batches: [...document.querySelectorAll('.fat-batch h3')].map(h => h.innerText) }));
  if (!r.tab) fail('Admin has no 🕘 Attendance tab');
  if (!r.btn) fail('the 🕘 Attendance tab is not among the Admin tabs');
  const row = n => r.rows.find(x => x.includes(n)) || '';
  if (!/8:25 AM/.test(row('Ivy In'))) fail(`a checked-in trainee's Time In isn't shown: ${row('Ivy In')}`);
  if (!/Not in yet/.test(row('Owen Out'))) fail(`a trainee not in yet isn't listed as ⏳ Not in yet: ${row('Owen Out')}`);
  if (!row('Bea Other')) fail('a trainee of another active batch is missing');
  if (row('Arch Gone')) fail('an archived trainee is listed');
  if (!r.batches.some(b => /B103026/.test(b) && /1 of 2 in|of \d+ in/.test(b))) fail(`the batch count isn't shown: ${JSON.stringify(r.batches)}`);
  await page.click('.fat-day button:first-child'); await page.waitForTimeout(1500);
  if (!/Not in yet/.test(await page.evaluate(() => ([...document.querySelectorAll('.fat-tbl tbody tr')].find(tr => /Ivy In/.test(tr.innerText)) || {}).innerText || ''))) fail('the day before still shows today\'s Time In');
  await browser.close();
  if (failures.length) { console.error('Attendance tab test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Attendance tab test passed (every active trainee by batch, the day\'s Time In, ⏳ Not in yet for the rest, no archived trainee, the day before).');
})().catch(e => { console.error(e); process.exit(1); });
