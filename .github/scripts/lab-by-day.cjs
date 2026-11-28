// 🛠 The Practice Lab is off the platform (js/ft-lab-route.js): no 🛠 Practice Lab on the top bar; its route (#/simulators,
//   an old link or bookmark) goes back to the lesson; a deck's activity opens itself, and each activity's ← Back to the lesson
//   (and the bar after its hand-in, FTLabRoute.done) returns to the slide the trainee came from, else to the slide last open.
// Usage: NODE_PATH=…/node_modules node .github/scripts/lab-by-day.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await put('settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], batches: {} });
    await signIn(page, 'Dana', 'Daybyday', 'B102926');
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
    const at = () => page.evaluate(() => ({ view: state.view, day: window.FTDayDecks ? FTDayDecks.state().day : null, id: window.FTDayDecks && FTDayDecks.state().day ? (FTDayDecks.list(FTDayDecks.state().day)[FTDayDecks.state().i] || {}).id : null }));

    // 1. #/simulators goes back to the lesson: the deck slide last open
    await page.evaluate(() => FTDayDecks.open(8, FTDayDecks.at(8, 's1c'))); await page.waitForTimeout(1000);
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1500);
    let w = await at();
    if (w.view !== 'daydeck' || w.day !== 8 || w.id !== 's1c') fail(`#/simulators should go back to the slide last open (Day 8, s1c): ${JSON.stringify(w)}`);
    // (and the top bar, a trainer's too, has no 🛠 Practice Lab)
    const bar = await page.evaluate(() => { state.isAdmin = true; render(); const t = [...document.querySelectorAll('.lp-sec, .topbar button, .topbar a')].map(b => b.textContent).join(' | '); state.isAdmin = false; render(); return t; });
    if (/Practice Lab/.test(bar)) fail(`the top bar still has 🛠 Practice Lab: ${bar}`);

    // 2. a deck's Next opens its activity, and the hand-in comes back to the slide after it (Day 5's Sample & Time Zone)
    await page.evaluate(() => FTDayDecks.open(5, FTDayDecks.at(5, 's3b'))); await page.waitForTimeout(1000);
    for (let i = 0; i < 4 && (await page.evaluate(() => state.view)) === 'daydeck'; i++) { await page.evaluate(() => FTDayDecks.next()); await page.waitForTimeout(700); }
    w = await at();
    if (w.view !== 'calsim') fail(`Day 5's Next should open the Activity Items beside the calendar (#/calsim): ${JSON.stringify(w)}`);
    await page.evaluate(() => ftActivityDone()); await page.waitForTimeout(300);
    const doneBar = await page.evaluate(() => (document.getElementById('ftlr-done') || {}).innerText || '');
    if (!/Submitted/.test(doneBar) || !/Back to my lesson/.test(doneBar)) fail(`a hand-in shows no "Submitted · Back to my lesson" bar: ${doneBar}`);
    await page.waitForTimeout(3400);
    w = await at();
    if (w.view !== 'daydeck' || w.day !== 5) fail(`after the hand-in the trainee isn't back on Day 5's deck: ${JSON.stringify(w)}`);

    // 3. every activity's way back: "← Back to the lesson", to the slide last open
    for (const v of ['listening', 'transcribe', 'calcheck', 'calrules', 'calweek', 'drills', 'intakepacket', 'guide']) {
      await page.evaluate(() => FTDayDecks.open(9, 1)); await page.waitForTimeout(600);
      await page.evaluate(v => goto(v), v); await page.waitForTimeout(1200);
      const r = await page.evaluate(() => ({ view: state.view, practiceLab: /Back to the Practice Lab|🛠 Practice Lab/.test(document.body.innerText), back: !!document.querySelector('[onclick*="FTLabRoute.home"], [onclick*="FTListen.toDeck"], [onclick*="FTTranscribe.toDeck"]') }));
      if (r.practiceLab) fail(`#/${v} still points to the Practice Lab`);
      if (!r.back) { fail(`#/${v} has no ← Back to the lesson (${r.view})`); continue; }
      await page.evaluate(() => { const b = document.querySelector('[onclick*="FTLabRoute.home"], [onclick*="FTListen.toDeck"], [onclick*="FTTranscribe.toDeck"]'); b.click(); }); await page.waitForTimeout(1200);
      w = await at();
      if (w.view !== 'daydeck' || w.day !== 9) fail(`#/${v}'s ← Back to the lesson didn't go back to Day 9: ${JSON.stringify(w)}`);
    }
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Practice Lab off test FAILED:\n  - ' + failures.join('\n  - ')); process.exit(1); }
  console.log('Practice Lab off test passed (no 🛠 Practice Lab on the top bar; #/simulators back to the slide last open; a deck\'s Next opens its activity and the hand-in comes back to the deck; every activity\'s ← Back to the lesson returns to the lesson).');
})();
