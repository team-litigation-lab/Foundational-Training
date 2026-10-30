// 🕘 Automatic Time In (js/ft-checkin.js → the Worker's /api/checkin): a trainee's first visit each day (Eastern time)
//   records checkin:<YYYY-MM-DD>:<id> with their Time In and the day they're on, once; a second visit keeps the first
//   Time In, and a trainer opening the course records nothing.
// Usage: NODE_PATH=…/node_modules node .github/scripts/checkin.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
const etDate = () => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const g = t => p.find(x => x.type === t).value; return `${g('year')}-${g('month')}-${g('day')}`; };

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Tina', 'Timein', 'B103026');
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  const key = `checkin:${etDate()}:${id}`;
  await page.evaluate(() => { try { Object.keys(localStorage).filter(k => k.startsWith('lsh-checkin:')).forEach(k => localStorage.removeItem(k)); } catch (e) {} });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(3500);
  const c1 = await get(key);
  if (!c1 || !/^\d\d:\d\d$/.test(c1.timeIn || '')) fail(`opening the course didn't record the trainee's Time In: ${JSON.stringify(c1)}`);
  else if (!/^Day \d+/.test(c1.training || '')) fail(`the Time In doesn't carry the day the trainee is on: "${c1.training}"`);
  if (await page.evaluate(() => { try { return localStorage.getItem('lsh-checkin:' + state.traineeId); } catch (e) { return null; } }) !== etDate()) fail('the page doesn\'t remember it checked in today');
  // a second visit keeps the first Time In
  if (c1) { await put(key, Object.assign({}, c1, { timeIn: '06:01' })); }
  await page.evaluate(() => { try { localStorage.removeItem('lsh-checkin:' + state.traineeId); } catch (e) {} });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(3500);
  const c2 = await get(key);
  if (c1 && (!c2 || c2.timeIn !== '06:01')) fail(`a second visit overwrote the first Time In: ${JSON.stringify(c2)}`);
  await browser.close();
  if (failures.length) { console.error('Automatic Time In test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Automatic Time In test passed (a trainee opening the course records checkin:<date>:<id> with their Time In and day, the page remembers it for the day, and a second visit keeps the first Time In).');
})().catch(e => { console.error(e); process.exit(1); });
