// 🔓 The trainer sets the pace: a lesson card (its segment per day, js/ft-day-locks.js) waits for the trainer to open that
//   lesson for the batch (📅 Open Lessons, settings:opendays), and a day far ahead stays locked until then; the steps
//   inside a day are day-locks.cjs's. A trainer (and a trainer in Trainee view) sees all of it.
// Usage: NODE_PATH=…/node_modules node .github/scripts/gating.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B102926';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Gale', 'Gate', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  // no lesson open for the batch yet: the lessons are the trainer's to open, the days are not
  await put('settings:opendays', { all: [], batches: {} });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);

  const openDays = () => page.evaluate(() => Array.from({ length: 16 }, (_, i) => i + 1).filter(n => FTDayDecks.dayOpen(n)));
  // the lesson cards (their ▶ Start Training) and, on each, 📋 the days card
  // (a lesson card is locked when every one of its day segments is)
  const cards = () => page.evaluate(() => [...[...document.querySelectorAll('.ftli')].map(c => { const b = [...c.querySelectorAll('.ftseg-b')];
      const shut = !b.length || b.every(x => x.classList.contains('locked'));
      return { id: c.id, locked: shut, off: shut, lock: b.some(x => /🔒/.test(x.innerText || '')) }; }),
    ...[...document.querySelectorAll('.ftli-days')].map(b => ({ id: b.id, locked: false, off: b.disabled, lock: /🔒/.test(b.innerText) }))]);

  // a brand-new trainee, with nothing finished and nothing opened: every day is theirs to read
  let days = await openDays();
  if (days.length !== 16) fail(`a new trainee can open ${days.length} of the 16 days: ${days.join(', ')}`);
  const cs = await cards();
  if (!cs.length) fail('the dashboard has no day cards');
  const dayCards = cs.filter(c => /^dayd-/.test(c.id));
  if (!dayCards.length) fail('the dashboard has no day instruction cards');
  const shut = dayCards.filter(c => c.locked || c.off || c.lock);
  if (shut.length) fail(`a day card is still locked: ${JSON.stringify(shut.map(c => c.id).slice(0, 4))}`);
  const padlock = dayCards.filter(c => c.lock).map(c => c.id);
  if (padlock.length) fail(`a day card still shows a padlock: ${JSON.stringify(padlock.slice(0, 4))}`);

  // the deck of a day far ahead waits for its lesson: it shows its lock, not its slides
  await page.evaluate(() => FTDayDecks.open(14)); await page.waitForTimeout(1200);
  const deck = await page.evaluate(() => ({ view: state.view, lock: !!document.querySelector('main.main-ftdd .ftdd-slides.ftlk > .ftd1-lock'), card: !!document.querySelector('.ftdd-slides.ftlk .ftlk-under a[href], .ftdd-slides.ftlk .ftlk-under button:not([disabled])') }));
  if (deck.view !== 'daydeck' || !deck.lock || deck.card) fail(`Day 14's deck opened for a trainee on Day 1: ${JSON.stringify(deck)}`);
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);

  // the lessons, though, are the trainer's to open: locked until 📅 Open Lessons says otherwise
  let les = (await cards()).filter(c => /^dayl-/.test(c.id));
  if (!les.length) fail('the dashboard has no lesson cards');
  if (les.some(c => !c.locked || !c.off)) fail(`a lesson is open before the trainer opened it: ${JSON.stringify(les.filter(c => !c.locked).map(c => c.id))}`);
  await page.evaluate(() => goto('day', 4)); await page.waitForTimeout(900);
  if (await page.evaluate(() => state.view === 'day' && Number(state.dayId) === 4 && !/is locked/.test((document.querySelector('main') || {}).innerText || ''))) fail('a lesson the trainer has not opened is readable');
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(800);

  // the trainer opens two of them for the batch: those two, and only those two, open
  await put('settings:opendays', { all: [1, 4], batches: {} });
  await page.evaluate(() => { state.ftOpenDays = null; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2600);
  // (the open lessons are read after the page loads: on a busy runner, give them up to ten seconds more)
  let openLes = [];
  for (let t = 0; t < 20; t++) {
    les = (await cards()).filter(c => /^dayl-/.test(c.id));
    openLes = les.filter(c => !c.locked && !c.off).map(c => c.id).sort();
    if (openLes.join() === 'dayl-1,dayl-4') break;
    await page.waitForTimeout(500);
  }
  if (openLes.join() !== 'dayl-1,dayl-4') fail(`📅 Open Lessons opened ${JSON.stringify(openLes)} (dayl-1 and dayl-4 expected)`);

  // a trainer, and a trainer in Trainee view, reads everything
  for (const as of ['admin', 'preview']) {
    await page.evaluate((as) => { state.isAdmin = as === 'admin'; state.adminPreview = as === 'preview'; render(); }, as); await page.waitForTimeout(600);
    const locked = (await cards()).filter(c => c.locked || c.off);
    if (locked.length) fail(`as ${as} these cards are locked: ${JSON.stringify(locked.map(c => c.id).slice(0, 4))}`);
    await page.evaluate(() => goto('day', 8)); await page.waitForTimeout(900);
    if (/is locked/.test(await page.evaluate(() => (document.querySelector('main') || {}).innerText || ''))) fail(`as ${as} a lesson is locked`);
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(700);
  }
  await page.evaluate(() => { state.isAdmin = false; state.adminPreview = false; });

  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Open days test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Open days test passed (a day far ahead stays locked for a trainee on Day 1; the lessons wait for the trainer\'s 📅 Open Lessons and open exactly as it says; a trainer and a trainer in Trainee view read all of it).');
})().catch(e => { console.error(e); process.exit(1); });
