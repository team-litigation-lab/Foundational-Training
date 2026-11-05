// 📋 Task Tracker (js/ft-tracker.js), read-only as a trainer: a trainee writes tracker:<id> with anything in it, so a date cell,
//   a row id and a Daily Notes date that are HTML or quote-breaking script are shown as text, and run nothing in the
//   trainer's page (Admin → 📋 Task Trackers → Open). Clicking such a cell still selects it.
// Usage: NODE_PATH=…/node_modules node .github/scripts/tracker-xss.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B020325';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => { fail(`a dialog opened: ${d.message()}`); d.dismiss(); });
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);

  // (the shared date format: only YYYY-MM-DD is a date)
  { const got = await page.evaluate(() => ['2026-11-05', '<img src=x onerror=1>', 5, ''].map(v => { try { return FTTrackerRules.fmtDate(v); } catch (e) { return 'threw'; } }));
    if (JSON.stringify(got) !== JSON.stringify(['11/05/2026', '', '', ''])) fail(`fmtDate: ${JSON.stringify(got)}`); }

  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} state.traineeId = null; });
  await signIn(page, 'Xena', 'Tracker', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  if (!id) fail('the trainee did not sign in');
  const D = await page.evaluate(() => FTTrackerRules.ptDate());
  const bad = `x');window.__xss=(window.__xss||0)+1;//`, badDate = `${D}');window.__xss=(window.__xss||0)+1;//`;
  const t = await page.evaluate(([D]) => FTTrackerRules.template('Xena', D), [D]);
  t.tracker.noteDates = [D, badDate];
  t.tracker.rows.push({ id: bad, section: 'completion', dateReceived: '<img src=x onerror="window.__xss=(window.__xss||0)+1">', type: 'LSH-TRAINING',
    details: 'Evil row', va: 'Xena', notes: { [D]: 'note' }, vaNotes: '', deadline: '"><img src=x onerror="window.__xss=(window.__xss||0)+1">', status: 'New', completedOn: '' });
  await put('tracker:' + id, t);

  // the trainer opens it, read-only
  await page.evaluate(id => { state.isAdmin = true; state.traineeId = null; state.adminTab = 'trackers'; FTTracker.openAdmin(id, null); }, id);
  await page.waitForFunction(() => document.querySelector('.ftt-grid'), null, { timeout: 15000 }).catch(() => fail('the tracker did not open'));
  await page.waitForTimeout(800);
  const imgs = await page.evaluate(() => document.querySelectorAll('.ftt img, .ftt-check img').length);
  if (imgs) fail(`${imgs} trainee-written <img> rendered as HTML in the tracker`);
  // click the evil row's cell and the history day buttons: they select, and run nothing else
  const cell = await page.evaluate(bad => { const td = [...document.querySelectorAll('.ftt-c')].find(x => x.dataset.r === bad && x.dataset.k === 'details'); if (!td) return false; td.click(); return true; }, bad);
  if (!cell) fail('the trainee\'s row (odd id) is not in the sheet, with its id in data-r');
  const sel = await page.evaluate(() => (document.querySelector('.ftt-c.is-sel') || {}).textContent || '');
  if (sel !== 'Evil row') fail(`clicking the row's cell selected: ${JSON.stringify(sel)}`);
  await page.evaluate(() => [...document.querySelectorAll('.ftt-hday, .ftt-flags a')].forEach(b => b.click()));
  await page.waitForTimeout(300);
  const xss = await page.evaluate(() => window.__xss || 0);
  if (xss) fail(`trainee-written script ran ${xss} time(s) in the trainer's page`);

  await browser.close();
  if (failures.length) { console.error('FAIL\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('OK: the trainer\'s view of a trainee\'s Task Tracker shows trainee-written dates and row ids as text');
})().catch(e => { console.error(e); process.exit(1); });
