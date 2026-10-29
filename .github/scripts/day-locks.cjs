// 🔓 Every day in Day 1's order, each step opened by the trainer (js/ft-day-locks.js, settings:daysteps), and ✍️ ten
// process questions at most on every answer sheet:
//   - 📚 Dashboard's lesson cards carry one segment per day the lesson runs (Day 1, Day 2, Day 3), 🔒 until the trainer opens it;
//   - nothing unlocked: a trainee's Day 7 shows its lock, the lesson deck waits, the Practice Lab hides the days' sessions
//     and the LOR Drafting Activity waits for its step;
//   - Days 2–16: a step per row of the day's card, in the card's order, named as the card names it (the day card read with
//     the first row, as Day 1's is with its reading);
//   - Day 7 open to its first step (the card and the Classroom Discussion): its segment opens the deck there, Next and the
//     dots don't go past it, the lesson deck opens and its video still waits;
//   - a count saved when a step was a slide of the deck (no rows flag) reads as the card-row steps it had opened, and the
//     trainer's next save rewrites it so (flagged);
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
    if ((segs['dayl-6'] || []).map(s => s.t).join() !== 'Part 1,Part 2,Part 3') fail(`Intake's card doesn't have Part 1 · Part 2 · Part 3: ${JSON.stringify(segs['dayl-6'])}`);
    if ((segs['dayl-1'] || []).map(s => s.t).join() !== 'Start') fail(`Lesson 1's card doesn't have one Start button: ${JSON.stringify(segs['dayl-1'])}`);
    if ((segs['dayl-8'] || []).length !== 2 || (segs['dayl-4'] || []).length !== 2 || (segs['dayl-1'] || []).length !== 1) fail(`the cards' segments don't match their days: ${JSON.stringify(segs)}`);
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
    // Days 2–16: one step per card row, labelled as the card labels it, each holding its own slides in the card's order
    const shape = await page.evaluate(() => { const out = []; for (let n = 2; n <= 16; n++) {
      const rows = FTDayDecks.dayRows(n).map(r => FTDayDecks.rowLabel(n, r)), st = FTDayLocks.steps(n), list = FTDayDecks.list(n);
      out.push({ n, rows, labels: st.map(s => s.label), first: st[0] && st[0].ids, last: st.length && st[st.length - 1].ids,
        runs: st.every((s, i) => s.ids.length && s.to - s.from + 1 === s.ids.length && (!i || s.from === st[i - 1].to + 1)), all: st.length ? st[st.length - 1].to === list.length - 1 : false }); } return out; });
    shape.forEach(d => {
      if (JSON.stringify(d.rows) !== JSON.stringify(d.labels)) fail(`Day ${d.n}'s steps aren't its card's rows: ${JSON.stringify(d.labels)} vs ${JSON.stringify(d.rows)}`);
      if (!d.runs || !d.all) fail(`Day ${d.n}'s steps don't hold the deck's slides in runs, one after the other`);
      if ((d.first || [])[0] !== 'agenda' || !(d.last || []).includes('end-day')) fail(`Day ${d.n}: the day card isn't read with its first row, or End of Module with its last: ${JSON.stringify([d.first, d.last])}`);
    });
    // Day 7 open to its first step (its card, ▶ the lesson and the guide's discussion slide), for this batch
    await put(page, 'settings:daysteps', { all: {}, batches: { b102826: { 7: 1 } }, rows: { all: {}, batches: { b102826: { 7: 1 } } }, legacy: { all: [], batches: {} } });
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);
    const s7 = await page.evaluate(() => [...document.querySelectorAll('#dayl-6 .ftseg-b')].map(x => x.classList.contains('locked')));
    if (s7.join() !== 'false,true,true') fail(`with Day 7 opened, Intake's segments read ${JSON.stringify(s7)}`);
    await page.click('#dayl-6 .ftseg-b[data-day="7"]'); await page.waitForTimeout(1500);
    // the first time, a day's segment opens its card; Next goes on to the unlocked step and no further, and the dots don't skip
    let v = await page.evaluate(() => ({ view: state.view, day: FTDayDecks.state().day, i: FTDayDecks.state().i, lock: !!document.querySelector('main.main-ftdd .ftd1-lock'), step: FTDayLocks.steps(7)[1] }));
    if (v.view !== 'daydeck' || v.day !== 7 || v.lock || !v.step || v.i !== 0) fail(`Day 7's segment didn't open its deck on its card: ${JSON.stringify(v)}`);
    v = await page.evaluate(() => { const seen = []; for (let k = 0; k < 6; k++) { FTDayDecks.go(1); seen.push(FTDayDecks.state().i); } const one = FTDayDecks.state().i; FTDayDecks.to(one + 3); return { seen, one, skip: FTDayDecks.state().i, step: FTDayLocks.steps(7)[0].to }; });
    if (v.one !== v.step || v.skip !== v.one) fail(`the deck didn't stop at the step the trainer unlocked: ${JSON.stringify(v)}`);
    // … and the next time, it opens where the trainee left off
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(800);
    await page.click('#dayl-6 .ftseg-b[data-day="7"]'); await page.waitForTimeout(1200);
    if (await page.evaluate(() => FTDayDecks.state().i) !== v.one) fail('Day 7\'s segment didn\'t open where the trainee left off');
    await page.evaluate(() => goto('day', 6)); await page.waitForTimeout(800);
    if (!(await page.evaluate(() => state.view === 'day' && Number(state.dayId) === 6))) fail('the Intake lesson deck didn\'t open with its step unlocked');
    if (!(await page.evaluate(() => FTDayLocks.held(6, 'video')))) fail('Intake\'s Handouts / Video opened before its step');
    // a count saved as the old slide steps (no rows flag) reads as the card-row steps it had opened …
    await put(page, 'settings:daysteps', { all: { 9: 999 }, batches: { b102826: { 2: 6, 3: 2, 7: 2, 8: 2, 11: 2, 13: 3 } }, legacy: { all: [], batches: {} } });
    v = await page.evaluate(() => [2, 3, 7, 8, 9, 11, 13].map(n => FTDayLocks.at(n)));
    if (v.join() !== '6,1,1,4,999,1,1') fail(`the old slide-step counts didn't read as the card-row steps they had opened: ${v.join()} (want 6,1,1,4,999,1,1)`);
    // … and the trainer's next save writes every count as card-row steps, flagged so
    await page.evaluate(async () => { state.isAdmin = true; state.ftOdBatch = 'b102826'; await FTDayLocks.set(11, 2); state.isAdmin = false; state.ftOdBatch = null; });
    const saved = await get(page, 'settings:daysteps'), sb = ((saved || {}).batches || {}).b102826 || {}, fb = (((saved || {}).rows || {}).batches || {}).b102826 || {};
    if (sb[11] !== 2 || sb[8] !== 4 || sb[2] !== 6 || sb[3] !== 1 || !fb[11] || !fb[8] || !fb[2] || !(((saved || {}).rows || {}).all || {})[9] || saved.all[9] !== 999) fail(`the trainer's save didn't rewrite the old counts as card-row steps: ${JSON.stringify({ batches: saved && saved.batches, rows: saved && saved.rows, all: saved && saved.all })}`);
    v = await page.evaluate(() => [2, 8, 11].map(n => FTDayLocks.at(n)));
    if (v.join() !== '6,4,2') fail(`after the save Days 2, 8 and 11 read ${v.join()}, not 6,4,2`);
    // ⏰ Day 8 on a schedule: the AM session has started, the PM breakout hasn't
    const past = new Date(Date.now() - 3600e3).toISOString(), later = new Date(Date.now() + 3600e3).toISOString(), last = new Date(Date.now() + 7200e3).toISOString();
    await put(page, 'settings:daysteps', { all: {}, batches: { b102826: { 7: 999 } }, sched: { all: {}, batches: { b102826: { 8: { am: past, pm: later, out: last } } } }, legacy: { all: [], batches: {} } });
    v = await page.evaluate(() => { const st = FTDayLocks.steps(8), am = st.filter(s => s.slot === 'am').length, pm = st.find(s => s.slot === 'pm');
      return { at: FTDayLocks.at(8), am, pmOpen: pm ? FTDayLocks.stepOpen(8, pm.n) : null, pmN: pm && pm.n }; });
    if (v.at !== v.am || v.pmOpen !== false) fail(`Day 8's schedule didn't open just its AM session: ${JSON.stringify(v)}`);
    // Day 3 discusses Lessons 3 and 4: Lesson 4's deck, video and Knowledge Check wait for Day 4's steps, not Day 3's
    await put(page, 'settings:daysteps', { all: {}, batches: { b102826: { 3: 999 } }, legacy: { all: [], batches: {} } });
    v = await page.evaluate(() => ({ l3: FTDayLocks.held(3, 'lesson'), l4: FTDayLocks.held(4, 'lesson'), v4: FTDayLocks.held(4, 'video') }));
    if (v.l3 || v.l4 !== true || v.v4 !== true) fail(`Lesson 4 went by Day 3's steps: ${JSON.stringify(v)}`);
    // a batch's own setting stands in for all batches': a batch can be locked behind the rest, and taken off their schedule
    await put(page, 'settings:daysteps', { all: { 7: 999 }, batches: { b102826: { 7: 0 } }, sched: { all: { 8: { am: past, pm: past, out: past } }, batches: { b102826: { 8: null } } }, legacy: { all: [], batches: {} } });
    v = await page.evaluate(() => ({ d7: FTDayLocks.dayStarted(7), d8: FTDayLocks.at(8) }));
    if (v.d7 || v.d8 !== 0) fail(`the batch's own lock or "no schedule" didn't stand in for all batches': ${JSON.stringify(v)}`);
    // a lesson opened for all batches before the locks is kept for a batch already under way, not for one that starts later
    await put(page, 'settings:daysteps', { all: {}, batches: {}, legacy: { all: [6], batches: {}, at: '2026-01-01T00:00:00Z' } });
    if (!(await page.evaluate(() => FTDayLocks.active(8)))) fail('a batch that started after the locks began kept a lesson opened for all batches before them');
    await put(page, 'settings:daysteps', { all: {}, batches: {}, legacy: { all: [6], batches: {}, at: new Date(Date.now() + 864e5).toISOString() } });
    if (await page.evaluate(() => FTDayLocks.active(8))) fail('a batch under way lost the days of a lesson opened for all batches');
    await put(page, 'settings:daysteps', { all: {}, batches: {}, legacy: { all: [6], batches: {}, except: ['b102826'], at: new Date(Date.now() + 864e5).toISOString() } });
    if (!(await page.evaluate(() => FTDayLocks.active(8)))) fail('🔒 Lock these too didn\'t apply the locks to the batch');
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
    // its steps are the days' card rows
    const p7 = await page.evaluate(() => { const d = [...document.querySelectorAll('.ftdl-admin .ftdl-day')].find(x => /^Day 7\b/.test(x.querySelector('summary').innerText.trim()));
      return d ? [...d.querySelectorAll('.ftdl-steps li:not(.ftdl-slot) > span')].map(x => x.textContent.replace(/^\d+\.\s*/, '').trim()) : null; });
    const want7 = (shape.find(d => d.n === 7) || {}).rows || [];
    if (JSON.stringify(p7) !== JSON.stringify(want7)) fail(`🔓 Activity Locks lists Day 7's steps as ${JSON.stringify(p7)}, not its card's rows ${JSON.stringify(want7)}`);
  } catch (e) { fail(e.stack || String(e)); }
  finally {
    await put(page, 'settings:opendays', openWas || { all: [], batches: {} }).catch(() => {});
    await put(page, 'settings:daysteps', stepsWas || { all: {}, batches: {} }).catch(() => {});
    await b.close();
  }
  if (failures.length) { console.error(`${failures.length} failure(s):\n` + failures.map((f, i) => `${i + 1}. ${f}`).join('\n')); process.exit(1); }
  console.log('Activity Locks test passed (Days 2–16: a step per card row, named as the card names it, each holding its row\'s slides; old slide-step counts read as the card-row steps they had opened, and rewritten so, flagged, on the trainer\'s next save; a segment per day on the lesson cards, locked until opened; nothing unlocked: the deck, the lesson, the LOR activity and the Practice Lab\'s sessions wait; one step: the deck goes no further, the lesson opens, its video waits; ⏰ a schedule opens its AM session only; the trainer\'s 🔓 Activity Locks; ten process questions at most per sheet).');
})();
