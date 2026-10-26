// Day 1 in order, one step at a time, each opened by the trainer (js/ft-day1-flow.js, settings:day1steps):
//   - with nothing unlocked, 📚 Dashboard opens Setting of Training Expectations, and Know Your Tools, the reading's
//     deck slides and Lesson 1 are locked;
//   - the trainer unlocks up to the Personal Injury Reading for the batch: the Dashboard opens the reading, its slide
//     shows, Lesson 1 is still locked, and the Knowledge Check's Virtual Assistant Essentials sheet waits for its step;
//   - Finish unlocked: the Dashboard opens as usual; the admin's 🔓 Day 1 Steps lists the eight steps.
// The test server starts with Day 1 unlocked to its end (server.mjs); this test sets its own steps and puts that back.
// Usage: node .github/scripts/day1-flow.cjs [base-url]
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
const setSteps = (page, v) => page.evaluate(async (v) => { await fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'settings:day1steps', value: JSON.stringify(v) }) }); await ftLoadOpenDays(); }, v);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => fail('page error: ' + e.message));
  try {
    await page.goto(BASE); await signIn(page, 'Dee', 'Flow', 'B101026'); await page.waitForTimeout(1200);
    await setSteps(page, { all: 0, batches: {} });
    // nothing unlocked: the Dashboard is Setting of Training Expectations
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);
    let v = await page.evaluate(() => ({ view: state.view, day: state.dayId }));
    if (v.view !== 'day' || Number(v.day) !== 12) fail(`with nothing unlocked the Dashboard didn't open Setting of Training Expectations: ${JSON.stringify(v)}`);
    await page.evaluate(() => goto('knowtools')); await page.waitForTimeout(600);
    if (await page.evaluate(() => state.view) === 'knowtools') fail('Know Your Tools opened before the trainer unlocked it');
    await page.evaluate(() => goto('day', 1)); await page.waitForTimeout(600);
    if (await page.evaluate(() => state.view === 'day' && Number(state.dayId) === 1)) fail('Lesson 1 opened before the trainer unlocked it');
    await page.evaluate(() => FTDayDecks.open(1, 0)); await page.waitForTimeout(1500);
    await page.evaluate(() => FTDayDecks.slide(1, 'reading')); await page.waitForTimeout(1500);
    if (!(await page.$('.ftd1-lock'))) fail('the reading\'s slide showed before the trainer unlocked it');
    // up to the reading, for this batch
    await setSteps(page, { all: 0, batches: { b101026: 3 } });
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(1500);
    v = await page.evaluate(() => ({ view: state.view, lock: !!document.querySelector('.ftd1-lock'), sheet: !!document.querySelector('.ftdd-sheet') }));
    if (v.view !== 'daydeck' || v.lock || !v.sheet) fail(`with the reading unlocked the Dashboard didn't open the reading: ${JSON.stringify(v)}`);
    await page.evaluate(() => goto('day', 1)); await page.waitForTimeout(600);
    if (await page.evaluate(() => state.view === 'day' && Number(state.dayId) === 1)) fail('Lesson 1 opened with only the reading unlocked');
    await page.evaluate(() => { state.dayId = 1; goto('kc'); }); await page.waitForTimeout(1500);
    if (await page.evaluate(() => state.view) !== 'kc') fail('the Knowledge Check (the reading\'s sheet) didn\'t open with the reading unlocked');
    else {
      await page.evaluate(() => { const t = [...document.querySelectorAll('.fp-sheet-tab')].pop(); if (t) t.click(); }); await page.waitForTimeout(600);
      if (!(await page.$('.fp-sheet-lock'))) fail('the Virtual Assistant Essentials sheet opened before its Process Questions step');
    }
    // Finish: the Dashboard as usual
    await setSteps(page, { all: 0, batches: { b101026: 8 } });
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);
    if (await page.evaluate(() => state.view) !== 'modules') fail('with Finish unlocked the Dashboard didn\'t open');
    // the trainer's switches
    const steps = await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = renderFtDay1Steps(); return d.querySelectorAll('.ftd1-steps li').length; });
    if (steps !== 8) fail(`🔓 Day 1 Steps lists ${steps} steps, not 8`);
  } finally {
    await setSteps(page, { all: 8, batches: {} }).catch(() => {});
    await b.close();
  }
  if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
  console.log('Day 1 flow test passed (nothing unlocked: the Dashboard opens Setting of Training Expectations and the later steps are locked; up to the reading: the Dashboard opens it, Lesson 1 and the Virtual Assistant Essentials sheet still wait; Finish: the Dashboard as usual; the trainer\'s 🔓 Day 1 Steps).');
})().catch(e => { console.error(e); process.exit(1); });
