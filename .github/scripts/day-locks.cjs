// 🔓 Every day in Day 1's order, each step opened by the trainer (js/ft-day-locks.js, settings:daysteps), and ✍️ ten
// process questions at most on every answer sheet:
//   - 📚 Dashboard's lesson cards carry one segment per day the lesson runs (Day 1, Day 2, Day 3), 🔒 until the trainer opens it;
//   - nothing unlocked: a trainee's Day 7 shows its lock, the lesson deck waits, the Practice Lab hides the days' sessions
//     and the LOR Drafting Activity waits for its step;
//   - Day 7 open to its second step (the Classroom Discussion): its segment opens the deck there, Next and the dots don't go
//     past it, the lesson deck opens and its video still waits;
//   - ⏰ Day 8 on a schedule whose AM session has started: its AM steps are open and its PM ones are not;
//   - the admin's 🔓 Activity Locks lists Days 2–16.
// The test server starts with every day open to its end (server.mjs); this test sets its own steps and lessons, and puts
// both back.
// Usage: node .github/scripts/day-locks.cjs [base-url]
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
const put = (page, key, v) => page.evaluate(async ([key, v]) => { await fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(v) }) }); await ftLoadOpenDays(); }, [key, v]);
const get = (page, key) => page.evaluate(async key => { const r = await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }); return JSON.parse((await r.json()).value || 'null'); }, key);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => fail('page error: ' + e.message));
  let openWas = null, stepsWas = null;
  try {
    await page.goto(BASE); await signIn(page, 'Lock', 'Step', 'B102826'); await page.waitForTimeout(1200);
    openWas = await get(page, 'settings:opendays'); stepsWas = await get(page, 'settings:daysteps');
    await put(page, 'settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8], batches: {} });
    await put(page, 'settings:daysteps', { all: {}, batches: {}, legacy: { all: [], batches: {} } });
    await page.evaluate(() => FTDayDecks.load());
    // ✍️ ten process questions at most on every answer sheet
    const kc = await page.evaluate(() => [1, 2, 3, 4, 6, 7, 8].map(l => { const q = ftKcQuestions(l), by = {}; q.forEach(x => { by[x.set.id] = (by[x.set.id] || 0) + 1; }); return [l, by]; }));
    kc.forEach(([l, by]) => Object.entries(by).forEach(([s, n]) => { if (n > 10) fail(`Lesson ${l}'s ${s} sheet asks ${n} process questions (ten at most)`); }));
    if (!kc.find(([l]) => l === 2) || (kc.find(([l]) => l === 2)[1]['law-firm-communication'] || 0) !== 10) fail(`Lesson 2's Knowledge Check isn't its first ten questions: ${JSON.stringify(kc)}`);
    // 📚 Dashboard: a segment per day, locked until the trainer opens the day
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(1500);
    const segs = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ftli')].map(c => [c.id,
      [...c.querySelectorAll('.mc-grid .ftseg .ftseg-b')].map(x => ({ t: x.innerText.replace(/^[^A-Za-z]+/, '').trim(), locked: x.classList.contains('locked') }))])));
    if ((segs['dayl-6'] || []).map(s => s.t).join() !== 'Day 1,Day 2,Day 3') fail(`Intake's card doesn't have Day 1 · Day 2 · Day 3: ${JSON.stringify(segs['dayl-6'])}`);
    if ((segs['dayl-8'] || []).length !== 4 || (segs['dayl-1'] || []).length !== 1) fail(`the cards' segments don't match their days: ${JSON.stringify(segs)}`);
    if (!(segs['dayl-6'] || []).every(s => s.locked)) fail('Intake\'s days were open before the trainer opened them');
    if ((segs['dayl-1'] || [{}])[0].locked) fail('Lesson 1\'s Day 1 is locked with the lesson open');
    if (await page.$('.ftli .mc-grid > .module-start-btn')) fail('a lesson card still has its single ▶ Start Training button');
    // nothing unlocked on Day 7: its deck, the lesson deck, the tools and the Practice Lab's sessions wait
    await page.evaluate(() => FTDayDecks.open(7, 0)); await page.waitForTimeout(1200);
    if (!(await page.$('main.main-ftdd .ftd1-lock'))) fail('Day 7\'s deck showed before the trainer opened it');
    await page.evaluate(() => goto('day', 6)); await page.waitForTimeout(500);
    if (await page.evaluate(() => state.view === 'day' && Number(state.dayId) === 6)) fail('the Intake lesson deck opened before its step');
    await page.evaluate(() => goto('lor')); await page.waitForTimeout(500);
    if (await page.evaluate(() => state.view) === 'lor') fail('the LOR Drafting Activity opened before its step');
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1200);
    const lab = await page.evaluate(() => [...document.querySelectorAll('.fts-card h3')].map(h => h.innerText).join(' | '));
    if (/Intake Mock Calls|MedLOR/.test(lab)) fail(`the Practice Lab shows sessions of days not opened yet: ${lab}`);
    // Day 7 open to its second step, for this batch
    await put(page, 'settings:daysteps', { all: {}, batches: { b102826: { 7: 2 } }, legacy: { all: [], batches: {} } });
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);
    const s7 = await page.evaluate(() => [...document.querySelectorAll('#dayl-6 .ftseg-b')].map(x => x.classList.contains('locked')));
    if (s7.join() !== 'false,true,true') fail(`with Day 7 opened, Intake's segments read ${JSON.stringify(s7)}`);
    await page.click('#dayl-6 .ftseg-b[data-day="7"]'); await page.waitForTimeout(1500);
    let v = await page.evaluate(() => ({ view: state.view, day: FTDayDecks.state().day, i: FTDayDecks.state().i, lock: !!document.querySelector('main.main-ftdd .ftd1-lock'), step: FTDayLocks.steps(7)[1] }));
    if (v.view !== 'daydeck' || v.day !== 7 || v.lock || !v.step || v.i !== v.step.from) fail(`Day 7's segment didn't open its deck on the step the trainee is on: ${JSON.stringify(v)}`);
    v = await page.evaluate(() => { const from = FTDayDecks.state().i; FTDayDecks.go(1); const next = FTDayDecks.state().i; FTDayDecks.to(from + 3); return { from, next, skip: FTDayDecks.state().i }; });
    if (v.next !== v.from || v.skip !== v.from) fail(`the deck went past the steps the trainer unlocked: ${JSON.stringify(v)}`);
    await page.evaluate(() => goto('day', 6)); await page.waitForTimeout(800);
    if (!(await page.evaluate(() => state.view === 'day' && Number(state.dayId) === 6))) fail('the Intake lesson deck didn\'t open with its step unlocked');
    if (!(await page.evaluate(() => FTDayLocks.held(6, /ftVideoOrAsk/)))) fail('Intake\'s Handouts / Video opened before its step');
    // ⏰ Day 8 on a schedule: the AM session has started, the PM breakout hasn't
    const past = new Date(Date.now() - 3600e3).toISOString(), later = new Date(Date.now() + 3600e3).toISOString(), last = new Date(Date.now() + 7200e3).toISOString();
    await put(page, 'settings:daysteps', { all: {}, batches: { b102826: { 7: 999 } }, sched: { all: {}, batches: { b102826: { 8: { am: past, pm: later, out: last } } } }, legacy: { all: [], batches: {} } });
    v = await page.evaluate(() => { const st = FTDayLocks.steps(8), am = st.filter(s => s.slot === 'am').length, pm = st.find(s => s.slot === 'pm');
      return { at: FTDayLocks.at(8), am, pmOpen: pm ? FTDayLocks.stepOpen(8, pm.n) : null, pmN: pm && pm.n }; });
    if (v.at !== v.am || v.pmOpen !== false) fail(`Day 8's schedule didn't open just its AM session: ${JSON.stringify(v)}`);
    // 🗂 batches already under way keep their days: before the record of them is written, nothing is held …
    await put(page, 'settings:daysteps', { all: {}, batches: {} });
    if (await page.evaluate(() => FTDayLocks.active(8) || !FTDayLocks.dayStarted(8))) fail('a day was held before the batches under way were recorded');
    // … and a lesson the batch had open then keeps its days open; one opened since is locked
    await put(page, 'settings:daysteps', { all: {}, batches: {}, legacy: { all: [], batches: { b102826: [6] } } });
    v = await page.evaluate(() => ({ d8: FTDayLocks.active(8), d8open: FTDayLocks.dayStarted(8), d10: FTDayLocks.dayStarted(10) }));
    if (v.d8 || !v.d8open || v.d10) fail(`the batch under way didn't keep Intake's days open, or a new lesson's day wasn't locked: ${JSON.stringify(v)}`);
    // the first admin to load the open lessons records the batches under way, once
    await put(page, 'settings:daysteps', { all: {}, batches: {} });
    await page.evaluate(async () => { state.isAdmin = true; await ftLoadOpenDays(); state.isAdmin = false; });
    const rec = await get(page, 'settings:daysteps');
    if (!rec || !rec.legacy || !(rec.legacy.all || []).includes(6)) fail(`the admin's visit didn't record the lessons open then: ${JSON.stringify(rec && rec.legacy)}`);
    // 🔒 a locked slide is blurred under its lock, and Day 1's handouts are locked and blurred until Handouts and Videos
    // is unlocked (with a later lesson open the batch is past Day 1's step-by-step flow, so the slide itself shows)
    await put(page, 'settings:daysteps', { all: {}, batches: {}, legacy: { all: [], batches: {} } });
    await page.evaluate(() => FTDayDecks.open(8, 0)); await page.waitForTimeout(800);
    v = await page.evaluate(() => ({ blur: getComputedStyle(document.querySelector('.ftdd-slides.ftlk > .ftlk-under') || document.body).filter, live: document.querySelectorAll('.ftdd-slides.ftlk .ftlk-under a[href], .ftdd-slides.ftlk .ftlk-under iframe').length }));
    if (!/blur/.test(v.blur) || v.live) fail(`a locked slide isn't blurred, or what's under it still opens: ${JSON.stringify(v)}`);
    const d1Was = await get(page, 'settings:day1steps');
    for (const [n, want] of [[4, true], [8, false]]) {
      await put(page, 'settings:day1steps', { all: n, batches: {} });
      await page.evaluate(() => FTDayDecks.open(1, FTDayDecks.list(1).findIndex(s => s.launch && /ftVideoOrAsk/.test(s.launch.run || '')))); await page.waitForTimeout(800);
      v = await page.evaluate(() => ({ locked: !!document.querySelector('.ftdd-ho-locked .ftdd-ho-list.ftlk > .ftd1-lock'), links: document.querySelectorAll('a.ftdd-ho[href]').length, badge: (document.querySelector('.ftdd-ho-when') || {}).textContent || '' }));
      if (want && (!v.locked || v.links)) fail(`Day 1's handouts aren't locked and blurred before Handouts and Videos: ${JSON.stringify(v)}`);
      if (!want && (v.locked || v.links !== 5 || !/Unlocked/.test(v.badge))) fail(`Day 1's handouts didn't open with Handouts and Videos unlocked: ${JSON.stringify(v)}`);
    }
    await put(page, 'settings:day1steps', d1Was || { all: 8, batches: {} });
    // the admin's 🔓 Activity Locks
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'opendays'; goto('admin'); }); await page.waitForTimeout(1500);
    const n = await page.evaluate(() => document.querySelectorAll('.ftdl-admin .ftdl-day').length);
    if (n !== 15) fail(`🔓 Activity Locks lists ${n} days, not Days 2–16`);
  } catch (e) { fail(e.stack || String(e)); }
  finally {
    await put(page, 'settings:opendays', openWas || { all: [], batches: {} }).catch(() => {});
    await put(page, 'settings:daysteps', stepsWas || { all: {}, batches: {} }).catch(() => {});
    await b.close();
  }
  if (failures.length) { console.error(`${failures.length} failure(s):\n` + failures.map((f, i) => `${i + 1}. ${f}`).join('\n')); process.exit(1); }
  console.log('Activity Locks test passed (a segment per day on the lesson cards, locked until opened; nothing unlocked: the deck, the lesson, the LOR activity and the Practice Lab\'s sessions wait; one step: the deck goes no further, the lesson opens, its video waits; ⏰ a schedule opens its AM session only; the trainer\'s 🔓 Activity Locks; ten process questions at most per sheet).');
})();
