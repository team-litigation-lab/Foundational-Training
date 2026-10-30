// Day 1 in order, one step at a time, each opened by the trainer (js/ft-day1-flow.js, settings:day1steps):
//   - with nothing unlocked, 📚 Dashboard opens Setting of Training Expectations, and Know Your Tools, the reading's
//     deck slides and Lesson 1 are locked;
//   - the trainer unlocks up to the Personal Injury Reading for the batch: the Dashboard opens Day 1's card, the reading's slide
//     shows, Lesson 1 is still locked, and the Knowledge Check's Virtual Assistant Essentials sheet waits for its step;
//   - Finish unlocked: the Dashboard opens as usual; the admin's 🔓 Day 1 Steps lists the eight steps.
// The test server starts with Day 1 unlocked to its end (server.mjs); this test sets its own steps, opens only Lesson 1
// (an earlier test may have opened them all), and puts both back.
// Usage: node .github/scripts/day1-flow.cjs [base-url]
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
// a batch on Day 1 has only Lesson 1 open (a batch given a later lesson is past Day 1, and the steps don't hold it)
const setOpen = (page, v) => page.evaluate(async (v) => { await fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'settings:opendays', value: v }) }); }, v);
const getOpen = (page) => page.evaluate(async () => { const r = await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'settings:opendays' }) }); return (await r.json()).value || null; });
const setSteps = (page, v) => page.evaluate(async (v) => { await fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'settings:day1steps', value: JSON.stringify(v) }) }); await ftLoadOpenDays(); }, v);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1366, height: 768 } }); let openWas = null;
  page.on('pageerror', e => fail('page error: ' + e.message));
  try {
    await page.goto(BASE); await signIn(page, 'Dee', 'Flow', 'B101026'); await page.waitForTimeout(1200);
    openWas = await getOpen(page); await setOpen(page, JSON.stringify({ all: [1], batches: {} }));
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
    v = await page.evaluate(() => ({ view: state.view, lock: !!document.querySelector('.ftd1-lock'), i: FTDayDecks.state().i, day: FTDayDecks.state().day }));
    if (v.view !== 'daydeck' || v.lock || v.i !== 0 || Number(v.day) !== 1) fail(`with the reading unlocked the Dashboard didn't open Day 1's Classroom Activity card, the deck's start: ${JSON.stringify(v)}`);
    // strictly in order: no skipping ahead in the deck, nothing of a locked step, and the video waits (no request)
    v = await page.evaluate(() => { const from = FTDayDecks.state().i; FTDayDecks.to(from + 3); const skip = FTDayDecks.state().i; FTDayDecks.to(FTDayDecks.list(1).findIndex(s => s.launch && s.launch.go === 'lesson')); return {from, skip, locked: FTDayDecks.state().i, video: ftVideoUnlocked(1), ask: FTDay1.videoByStep(1)}; });
    if (v.skip !== v.from) fail(`the deck skipped ahead from slide ${v.from} to ${v.skip}`);
    if (v.locked !== v.from) fail('the dots went on to the Classroom Discussion before the trainer unlocked it');
    if (v.video || !v.ask) fail(`Day 1's video was open (or asked for) before Handouts and Videos was unlocked: ${JSON.stringify(v)}`);
    // a batch given a later lesson is past Day 1, unless the trainer set its Day 1 steps themselves (🔓 Segment lock)
    await setOpen(page, JSON.stringify({ all: [1, 4], batches: {} }));
    await setSteps(page, { all: 0, batches: {} });
    if (await page.evaluate(() => FTDay1.active())) fail('a batch with a later lesson open was still held to Day 1\'s steps');
    await setSteps(page, { all: 0, batches: { b101026: 3 } });
    if (!(await page.evaluate(() => FTDay1.active() && FTDay1.at() === 3))) fail('the trainer locked Day 1 for a batch with a later lesson open, and its steps didn\'t hold it');
    await setOpen(page, JSON.stringify({ all: [1], batches: {} }));
    await setSteps(page, { all: 0, batches: { b101026: 3 } });
    await page.evaluate(() => FTDayDecks.go(1)); await page.waitForTimeout(500);
    if (await page.evaluate(() => FTDayDecks.state().i) !== v.from && (await page.evaluate(() => FTDayDecks.state().pages)) < 2) fail('Next didn\'t go on one slide');
    await page.evaluate(() => goto('day', 1)); await page.waitForTimeout(600);
    if (await page.evaluate(() => state.view === 'day' && Number(state.dayId) === 1)) fail('Lesson 1 opened with only the reading unlocked');
    // a trainee who has finished Day 1 has its video, whatever the batch's steps
    const fin = await page.evaluate(() => { const was = state.progress; state.progress = Object.assign({}, was, { 1: { done: true } }); const open = ftVideoUnlocked(1) && !FTDay1.videoByStep(1); state.progress = was; return open; });
    if (!fin) fail('Day 1\'s video stayed locked for a trainee who finished Day 1');
    // Handouts and Videos unlocked: the video opens, no request
    await setSteps(page, { all: 0, batches: { b101026: 5 } });
    if (!(await page.evaluate(() => ftVideoUnlocked(1) && !FTDay1.videoByStep(1)))) fail('Day 1\'s video didn\'t open with Handouts and Videos unlocked');
    await setSteps(page, { all: 0, batches: { b101026: 3 } });
    await page.evaluate(() => { state.dayId = 1; goto('kc'); }); await page.waitForTimeout(1500);
    if (await page.evaluate(() => state.view) !== 'kc') fail('the Knowledge Check (the reading\'s sheet) didn\'t open with the reading unlocked');
    else {
      if (await page.$('.fp-sheet-tab')) fail('the Knowledge Check still shows sheet tabs (the route picks the sheet)');
      // opened from the Process Questions stop: the lesson's own sheet, still locked
      await page.evaluate(() => { sessionStorage.setItem('ftKCBack', JSON.stringify({ day: 1, id: 'pm', h: 'SA', l: 1, sheet: 'pq' })); render(); }); await page.waitForTimeout(600);
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
    if (openWas) await setOpen(page, openWas).catch(() => {});
    await b.close();
  }
  if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
  console.log('Day 1 flow test passed (nothing unlocked: the Dashboard opens Setting of Training Expectations and the later steps are locked; up to the reading: the Dashboard opens Day 1\'s card, Lesson 1 and the Virtual Assistant Essentials sheet still wait, the deck goes one slide at a time, the video waits for Handouts and Videos; Finish: the Dashboard as usual; the trainer\'s 🔓 Day 1 Steps).');
})().catch(e => { console.error(e); process.exit(1); });
