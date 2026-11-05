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
  await T('eve-formula--b103026', '=HYPERLINK("http://x.test","click")', 'B103026', { fullName: '=HYPERLINK("http://x.test","Zoë")' });
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
  // ⬇ CSV: a UTF-8 BOM (so Zoë isn't garbled in Excel), CRLF lines, and a name that starts like a formula is kept as text
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => FTAttendance.csv())]);
  const csv = require('fs').readFileSync(await dl.path(), 'utf8');
  if (!csv.startsWith('\ufeff')) fail('the Attendance CSV has no UTF-8 BOM');
  if (!/\r\n/.test(csv)) fail('the Attendance CSV lines are not CRLF');
  const eve = csv.split(/\r?\n/).find(l => /HYPERLINK/.test(l)) || '';
  if (!eve.includes(`"'=HYPERLINK(""http://x.test"",""Zoë"")"`)) fail(`a trainee name that starts like a formula isn't kept as text in the CSV: ${eve}`);
  if (/(^|,)"[=+\-@]/.test(csv.replace(/^\ufeff/, ''))) fail('a CSV cell still starts with a formula character');
  // ✍ manual override: set Owen's Time In by hand; it goes into the Portal's attendance record and shows as ✍ Manual
  const rowSel = n => page.locator('.fat-tbl tbody tr', { hasText: n });
  await rowSel('Owen Out').locator('text=✍ Set Time In').click(); await page.waitForTimeout(300);
  await page.fill('#fatTime', '09:05'); await rowSel('Owen Out').locator('text=💾 Save').click(); await page.waitForTimeout(2000);
  const owen = await page.evaluate(() => ([...document.querySelectorAll('.fat-tbl tbody tr')].find(tr => /Owen Out/.test(tr.innerText)) || {}).innerText || '');
  if (!/9:05 AM/.test(owen) || !/Manual/.test(owen)) fail(`a manual Time In isn't shown as ✍ Manual: ${owen}`);
  const att = await page.evaluate(d => fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'attendance:b103026:' + d }) }).then(r => r.json()).then(j => JSON.parse(j.value || 'null')), etDate());
  if (!att || !att.rows || !att.rows['owen-out--b103026'] || att.rows['owen-out--b103026'].timeIn !== '09:05') fail(`the manual Time In isn't in the day's attendance record: ${JSON.stringify(att)}`);
  // override an automatic Time In, then clear it back to the automatic one
  await rowSel('Ivy In').locator('text=✍ Edit Time In').click(); await page.waitForTimeout(300);
  await page.fill('#fatTime', '08:00'); await rowSel('Ivy In').locator('text=💾 Save').click(); await page.waitForTimeout(2000);
  if (!/8:00 AM/.test(await rowSel('Ivy In').innerText())) fail('an automatic Time In could not be overridden');
  page.once('dialog', d => d.accept());
  await rowSel('Ivy In').locator('text=✍ Edit Time In').click(); await page.waitForTimeout(300);
  await rowSel('Ivy In').locator('text=✖ Clear').click(); await page.waitForTimeout(2000);
  const ivy = await rowSel('Ivy In').innerText();
  if (!/8:25 AM/.test(ivy) || /Manual/.test(ivy)) fail(`clearing the override doesn't go back to the automatic Time In: ${ivy}`);

  await page.click('.fat-day button:first-child'); await page.waitForTimeout(1500);
  if (!/Not in yet/.test(await page.evaluate(() => ([...document.querySelectorAll('.fat-tbl tbody tr')].find(tr => /Ivy In/.test(tr.innerText)) || {}).innerText || ''))) fail('the day before still shows today\'s Time In');
  await browser.close();
  if (failures.length) { console.error('Attendance tab test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Attendance tab test passed (every active trainee by batch, the day\'s Time In, ⏳ Not in yet for the rest, no archived trainee, the ⬇ CSV keeps a formula-like name as text with a BOM, the ✍ manual override set, saved to the attendance record and cleared, the day before).');
})().catch(e => { console.error(e); process.exit(1); });
