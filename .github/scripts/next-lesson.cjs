// ⏭ No segment locks: a lesson the trainer opens (📅 Open Lessons) is open as a whole, every part and step of it, Day 1
// included, with no 🔓 Segment lock on the trainer's deck or 🔓 Activity Locks in Admin. And the next lesson opens by itself:
// a trainee who reads a lesson's last day to its ✅ End of Module (decks-done) finds the next lesson open, without the
// trainer's 📅 Open Lessons. VA Essentials (Day 1) finished opens Law Firm Communication (Day 2); a lesson not finished
// opens nothing further on.
// Usage: NODE_PATH=…/node_modules node .github/scripts/part-advance.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
const put = (page, key, v) => page.evaluate(async ([key, v]) => { await fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(v) }) }); await ftLoadOpenDays(); }, [key, v]);
const get = (page, key) => page.evaluate(async key => { const r = await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }); return JSON.parse((await r.json()).value || 'null'); }, key);
// the trainee's finished days, as reaching a deck's last slide saves them, then the page read afresh
async function done(page, days) {
  await page.evaluate(async d => { await storeSet('decks-done', d); }, days);
  await page.reload(); await page.waitForFunction(() => typeof FTDayDecks === 'object' && state.traineeId, null, { timeout: 15000 });
  await page.evaluate(async () => { await ftLoadOpenDays(); await FTDayDecks.load(); FTDecksDone(); });
  await page.waitForFunction(n => FTDecksDone().length === n, days.length, { timeout: 10000 });
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);
}
const segs = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ftli')].map(c => [c.id,
  [...c.querySelectorAll('.mc-grid .ftseg .ftseg-b')].map(x => x.classList.contains('locked') ? 'locked' : 'open')])));
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => fail('page error: ' + e.message));
  let openWas = null, stepsWas = null;
  try {
    await page.goto(BASE); await signIn(page, 'Next', 'Part', 'B102826'); await page.waitForTimeout(1200);
    openWas = await get(page, 'settings:opendays'); stepsWas = await get(page, 'settings:daysteps');
    // the trainer has opened VA Essentials and Personal Injury Process Flow only; an old record of steps, with days locked,
    // holds nothing now
    await put(page, 'settings:opendays', { all: [1, 3], batches: {} });
    await put(page, 'settings:daysteps', { all: { 3: 1, 4: 0 }, batches: {}, legacy: { all: [], batches: {} } });
    // nothing finished: Law Firm Communication waits for the trainer; Personal Injury Process Flow is open, both parts
    await done(page, []);
    let s = await segs(page);
    if ((s['dayl-2'] || [])[0] !== 'locked') fail(`Law Firm Communication was open before VA Essentials was finished: ${JSON.stringify(s['dayl-2'])}`);
    if ((s['dayl-3'] || []).join() !== 'open,open') fail(`an open lesson's parts aren't all open: ${JSON.stringify(s['dayl-3'])}`);
    const steps = await page.evaluate(() => ({ s3: FTDayLocks.stepOpen(3, 5), s4: FTDayLocks.stepOpen(4, 3), d1: FTDay1.active() }));
    if (!steps.s3 || !steps.s4 || steps.d1) fail(`a step of an open lesson is still held: ${JSON.stringify(steps)}`);
    await page.evaluate(() => FTDayDecks.open(4, 3)); await page.waitForTimeout(1000);
    if (await page.$('main.main-ftdd .ftd1-lock')) fail('a slide of an open lesson\'s Part 2 shows a lock');
    // ✅ VA Essentials finished: Law Firm Communication opens, the lesson and its day
    await done(page, [1]);
    s = await segs(page);
    if ((s['dayl-2'] || [])[0] !== 'open') fail(`VA Essentials finished didn't open Law Firm Communication: ${JSON.stringify(s['dayl-2'])}`);
    const l2 = await page.evaluate(() => ({ lesson: dayUnlocked(2), day: FTDayLocks.at(2), l6: dayUnlocked(6) }));
    if (!l2.lesson || l2.day < 1) fail(`Law Firm Communication isn't open to the trainee: ${JSON.stringify(l2)}`);
    if (l2.l6) fail('a lesson further on (Intake) opened with VA Essentials finished');
    await page.evaluate(() => FTDayLocks.launch(2)); await page.waitForTimeout(1200);
    if (await page.evaluate(() => state.view !== 'daydeck' || FTDayDecks.state().day !== 2 || !!document.querySelector('main.main-ftdd .ftd1-lock'))) fail('Law Firm Communication\'s Start didn\'t open its deck');
    // ✅ Day 3 only (Part 1) finished: Calendaring, the lesson after this one, still waits for the trainer
    await done(page, [1, 2, 3]);
    s = await segs(page);
    if ((s['dayl-5'] || [])[0] !== 'locked') fail(`Calendaring opened with Personal Injury Process Flow not finished: ${JSON.stringify(s['dayl-5'])}`);
    // ✅ Day 4 (Part 2) finished too: Calendaring opens
    await done(page, [1, 2, 3, 4]);
    s = await segs(page);
    if ((s['dayl-5'] || []).some(x => x === 'locked')) fail(`Personal Injury Process Flow finished didn't open Calendaring: ${JSON.stringify(s['dayl-5'])}`);
    // 🧑‍🏫 the trainer: no 🔒 on the Dashboard's parts, no 🔓 Segment lock or chip on the deck, no lock screens in Admin
    await page.evaluate(() => { state.isAdmin = true; state.ftOdBatch = 'b102826'; goto('modules'); }); await page.waitForTimeout(1200);
    if (await page.$('.ftseg-b.tlocked')) fail('the trainer\'s Dashboard still shows a part 🔒 for the batch');
    await page.evaluate(() => FTDayDecks.open(1, 3)); await page.waitForTimeout(1200);
    if (await page.$('.ftdl-tpanel, .ftdl-chip, .ftdd-dot.lk')) fail('the trainer\'s deck still shows the segment locks');
    if (await page.evaluate(() => (FTDay1 && renderFtDay1Steps()) || '')) fail('Admin still draws 🔓 Day 1 Steps / 🔓 Activity Locks');
    await page.evaluate(() => { state.isAdmin = false; state.ftOdBatch = null; });
  } catch (e) { fail(e.stack || String(e)); }
  finally {
    await page.evaluate(async () => { await storeSet('decks-done', []); }).catch(() => {});
    await put(page, 'settings:opendays', openWas || { all: [], batches: {} }).catch(() => {});
    await put(page, 'settings:daysteps', stepsWas || { all: {}, batches: {} }).catch(() => {});
    await b.close();
  }
  if (failures.length) { console.error(`${failures.length} failure(s):\n` + failures.map((f, i) => `${i + 1}. ${f}`).join('\n')); process.exit(1); }
  console.log('Next lesson test passed (no segment locks: an open lesson\'s parts, steps and slides all open, Day 1 included, an old record of steps holding nothing; VA Essentials finished opens Law Firm Communication, its Start opening the deck, and no lesson further on; a lesson half finished opens nothing, finished opens the next; the trainer has no 🔒 parts, no 🔓 Segment lock, chips or locked dots, and no lock screens in Admin).');
})();
