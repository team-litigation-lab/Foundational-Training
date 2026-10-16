// 📋 Day decks (js/ft-day-decks.js, js/ft-day-decks-data.js from build/day-decks.cjs): one per day, nothing
// facilitator-only and no Process Questions on a slide, opened from 📚 Dashboard's band, a trainee kept to the
// days they have reached, an admin on any day, and the page on one screen.
// Usage: NODE_PATH=…/node_modules node .github/scripts/day-decks.cjs http://localhost:8787/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const R = path.resolve(__dirname, '../..');
const failures = []; const fail = m => failures.push(m);
// the data file is what the generator writes today
const data = path.join(R, 'js/ft-day-decks-data.js'), before = fs.readFileSync(data, 'utf8');
cp.execFileSync('node', [path.join(R, 'build/day-decks.cjs')], { stdio: 'ignore' });
if (fs.readFileSync(data, 'utf8') !== before) { fail('js/ft-day-decks-data.js is out of date: run node build/day-decks.cjs'); fs.writeFileSync(data, before); }
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(before, ctx);
const D = ctx.window.FT_DAY_DECKS || {};
for (let n = 1; n <= 18; n++) {
  const d = D[n]; if (!d || !(d.slides || []).length) { fail(`no deck for Day ${n}`); continue; }
  for (const s of d.slides) {
    if (/PROCESS QUESTIONS/.test(s.html)) fail(`Day ${n} ${s.id}: a Process Questions list on a slide`);
    if (/class="facilitator|Answer Key|Correct Answer|Ideal Answer|Password|Username/i.test(s.html)) fail(`Day ${n} ${s.id}: facilitator-only content or log-in details`);
  }
  if (!d.slides.some(s => s.placeholder || /^extra-/.test(s.id))) fail(`Day ${n}: no "To be added" slide`);
}
if (D[1] && D[1].slides.some(s => ['reminders', 'pm', 'expectations'].includes(s.id))) fail('Day 1 still has Training Reminders, the Nitro Pro installation or Setting of Expectations');
if (D[18] && !D[18].slides.some(s => /ftdd-pq/.test(s.html))) fail('Day 18: no pointer to ✍️ Knowledge Check where its Process Questions were');

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  // the tests before this one may have opened lessons for every batch: start from none open, put it back after
  const openBefore = await get('settings:opendays');
  await put('settings:opendays', { all: [], batches: {} });
  await signIn(page, 'Della', 'Decks', 'B100926');
  const id = await page.evaluate(() => state.traineeId);
  const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(800);
  const btn = await page.$('.ftn-deck');
  if (!btn) fail('📚 Dashboard: no 📋 Day deck button in the next-step band');
  else {
    if (!/Day 1 deck/.test(await btn.innerText())) fail('the band offers ' + await btn.innerText() + ', not Day 1');
    await btn.click(); await page.waitForTimeout(1500);
  }
  const at = () => page.evaluate(() => ({ view: state.view, hash: location.hash, h: (document.querySelector('.ftdd-ribbon span') || {}).innerText || '', n: (document.querySelector('.ftdd-n') || {}).innerText || '',
    deck: !!document.querySelector('.ftdd-deck .ftdd-logo') && !!document.querySelector('.ftdd-dtitle'), tiles: document.querySelectorAll('.ftdd-sheet a.ftdd-tile').length,
    open: [...document.querySelectorAll('.ftdd-chip:not(.locked)')].map(c => c.innerText), scroll: document.documentElement.scrollHeight - innerHeight,
    trainerNotes: [...document.querySelectorAll('.ftdd-body .trainer-slot')].some(x => x.innerHTML.trim()) }));
  let s = await at();
  if (s.view !== 'daydeck' || s.hash !== '#/daydeck') fail(`the deck didn't open (${s.view} ${s.hash})`);
  if (!/1 OF/i.test(s.n) || !/Training Agenda/.test(s.h)) fail(`the deck should open on its Training Agenda: ${s.n} ${s.h}`);
  if (!s.deck) fail('the deck is not drawn like the LSH decks (logo and outlined title)');
  if (s.open.join() !== '1') fail('a new trainee can open days ' + s.open.join(', ') + ' (only Day 1 expected)');
  if (s.scroll > 2) fail(`the deck page scrolls by ${s.scroll}px (one screen)`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  const s2 = await at();
  if (!/2 OF/i.test(s2.n)) fail('→ did not turn to slide 2');
  if (s2.trainerNotes) fail('a trainee sees the facilitator notes in a deck');
  await page.evaluate(() => FTDayDecks.open(5)); await page.waitForTimeout(300);
  if (/^Day 5\b/.test(await page.evaluate(() => (document.querySelector('.ftdd-dtitle') || {}).innerText || ''))) fail('a trainee opened Day 5 before reaching it');
  // finishing Lessons 1 and 2 moves the trainee to Day 3: Days 1–3 open
  await page.evaluate(() => { state.progress[1] = { done: true, studied: true }; state.progress[2] = { done: true, studied: true }; FTDayDecks.open(); });
  await page.waitForTimeout(500);
  s = await at();
  if (s.open.join() !== '1,2,3') fail('after Lessons 1–2 the open days are ' + s.open.join(', ') + ' (1, 2, 3 expected)');
  // an admin opens any day
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; FTDayDecks.open(18); }); await page.waitForTimeout(800);
  s = await at();
  if (s.open.length !== 18) fail(`an admin can open ${s.open.length} days, not 18`);
  await page.evaluate(() => FTDayDecks.to(1)); await page.waitForTimeout(400);
  s = await at();
  if (!/Lien Negotiator Exercise/.test(s.h)) fail('Day 18\'s first slide is "' + s.h + '"');
  if (!s.tiles) fail('Day 18\'s links are not shown as tiles');
  await put('settings:opendays', openBefore || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Day decks test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Day decks test passed (18 decks from build/days, up to date; no facilitator content or Process Questions on a slide, a "To be added" slide each; 📋 Day deck in the band; a trainee on their day and the days before, an admin on any; ← / →; one screen).');
})().catch(e => { console.error(e); process.exit(1); });
