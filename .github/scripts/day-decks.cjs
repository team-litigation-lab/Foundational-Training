// 📋 Day decks (js/ft-day-decks.js, js/ft-day-decks-data.js from build/day-decks.cjs): one per day, nothing
// facilitator-only and no Process Questions on a slide; a lesson's day on its card, the no-discussion days in the
// lesson grid in day order; no next-step band on 📚 Dashboard (the scores sit there); a trainee kept to the days
// they have reached, an admin on any day; the trainer adds a no-discussion day's activities and instructions
// (a simulator preset for a mock-call day, a custom step) and a trainee sees them; the page on one screen.
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
for (let n = 1; n <= 16; n++) {
  const d = D[n]; if (!d || !(d.slides || []).length) { fail(`no deck for Day ${n}`); continue; }
  for (const s of d.slides) {
    if (/PROCESS QUESTIONS/.test(s.html)) fail(`Day ${n} ${s.id}: a Process Questions list on a slide`);
    if (/class="facilitator|Answer Key|Correct Answer|Ideal Answer|Password|Username/i.test(s.html)) fail(`Day ${n} ${s.id}: facilitator-only content or log-in details`);
  }
  if (!d.slides.some(s => s.placeholder || /^extra-/.test(s.id))) fail(`Day ${n}: no "To be added" slide`);
}
if (D[1] && D[1].slides.some(s => ['reminders', 'pm', 'expectations'].includes(s.id))) fail('Day 1 still has Training Reminders, the Nitro Pro installation or Setting of Expectations');
if (D[17] || D[18]) fail('the Lien Negotiator days (17–18) are still built');
if (D[13] && !D[13].slides.some(s => /ftdd-pq/.test(s.html))) fail('Day 13: no pointer to ✍️ Knowledge Check where its Process Questions were');

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
  // no next-step band on the dashboard any more: the scores sit beside the orientation card instead
  if (await page.$('main .ftn')) fail('📚 Dashboard still has the next-step band');
  if (!(await page.$('.dash-pair-now .dash-side'))) fail('the scores are not in the top row beside the orientation card');
  // a day with a classroom discussion: its deck is on its lesson's card (Lesson 1 → Day 1)
  const l1 = await page.$('#module-1 .mc-daydeck');
  if (!l1) fail('Lesson 1\'s card has no 📋 Day 1 button');
  else if (!/Day 1/.test(await l1.innerText())) fail('Lesson 1\'s card points at ' + await l1.innerText());
  // the days without one: in the lesson grid, in day order, locked until reached
  const want = await page.evaluate(() => FTDayDecks.instructionOnlyDays());
  if (JSON.stringify(want) !== JSON.stringify([4, 6, 8, 9, 11, 12, 14, 15, 16])) fail(`the days with no classroom discussion are ${want.join(', ')}`);
  // 📚 Dashboard is the eight lessons, each in its two parts: the classroom discussion and the offline half
  // (the days of that lesson's block with no discussion, and the work set outside the session) — 16 cards.
  const pairs = await page.evaluate(() => [...document.querySelectorAll('.module-grid > .ftdd-daycell')].map(c => ({
    cell: c.id, lesson: (c.querySelector('.module-card') || {}).id || '', off: (c.querySelector('.ftdd-daycard') || {}).id || '',
    title: ((c.querySelector('.ftdd-dc-t b') || {}).innerText || '').trim() })));
  if (pairs.length !== 8) fail(`📚 Dashboard shows ${pairs.length} lessons, not 8`);
  if (pairs.map(p => p.cell).join() !== Array.from({ length: 8 }, (_, i) => 'dayl-' + (i + 1)).join())
    fail(`the lessons are not in the order they are taught: ${pairs.map(p => p.cell).join()}`);
  if (pairs.some(p => !p.lesson)) fail(`a lesson has no discussion card: ${pairs.filter(p => !p.lesson).map(p => p.cell).join()}`);
  if (pairs.some(p => !p.off || !p.title)) fail(`a lesson has no offline card: ${pairs.filter(p => !p.off || !p.title).map(p => p.cell).join()}`);
  // the offline half opens the right day: Reception's is Day 4, Intake's Days 8–9, Medical Records' Days 14–16
  const offDays = pairs.map(p => p.off);
  if (offDays.join() !== 'dayd-1,dayd-2,dayd-3,dayd-4,dayd-6,dayd-8,dayd-11,dayd-14')
    fail(`the offline halves open the wrong days: ${offDays.join()}`);
  const shape = await page.evaluate(() => {
    const g = document.querySelector('.module-grid');
    return { cards: g.querySelectorAll('.module-card, .ftdd-daycard').length,
      rows: [...new Set([...g.children].map(c => Math.round(c.getBoundingClientRect().top)))].length,
      cols: getComputedStyle(g).gridTemplateColumns.split(' ').length };
  });
  if (shape.cards !== 16) fail(`📚 Dashboard draws ${shape.cards} cards, not the 16 the eight lessons' two parts make`);
  if (shape.rows !== 4 || shape.cols !== 2) fail(`the lessons are in ${shape.rows} rows of ${shape.cols} pairs, not 4 of 2`);
  // and the whole dashboard is on one screen, as it has to be
  const screen = await page.evaluate(() => { const g = document.querySelector('.module-grid');
    return [g.scrollHeight - g.clientHeight, document.documentElement.scrollHeight - innerHeight]; });
  if (screen[0] > 2 || screen[1] > 2) fail(`📚 Dashboard doesn't fit one screen: the lessons overflow by ${screen[0]}px, the page by ${screen[1]}px`);
  if (await page.evaluate(() => [...document.querySelectorAll('.ftdd-daycard button')].some(b => !b.disabled && Number(b.closest('.ftdd-daycard').id.slice(5)) > 1)))
    fail('a new trainee can open an offline half of a day not reached');
  // a lesson card is never squeezed: four columns, and no card clipped (the page may scroll on a short screen)
  const fit = await page.evaluate(() => {
    const g = document.querySelector('.module-grid'), cs = getComputedStyle(g);
    const clipped = [...document.querySelectorAll('.module-grid .module-card, .module-grid .ftdd-daycard')]
      .filter(c => c.scrollHeight - c.clientHeight > 2).map(c => c.id);
    return { cols: cs.gridTemplateColumns.split(' ').length, wide: g.scrollWidth - g.clientWidth, clipped };
  });
  if (fit.cols !== 2) fail(`📚 Dashboard shows ${fit.cols} grid columns, not the two a lesson row and a day card need`);
  // a lesson sits beside the instructions of the day it is taught on, not above them
  const row = await page.evaluate(() => { const c = document.querySelector('.ftdd-daycell:has(.module-card)');
    const l = c.querySelector('.module-card').getBoundingClientRect(), d = c.querySelector('.ftdd-daycard').getBoundingClientRect();
    return { beside: d.left >= l.right - 1, sameTop: Math.abs(d.top - l.top) < 3 }; });
  if (!row.beside || !row.sameTop) fail(`a lesson's day card is not beside it: ${JSON.stringify(row)}`);
  if (fit.wide > 2) fail(`📚 Dashboard overflows sideways by ${fit.wide}px`);
  if (fit.clipped.length) fail(`📚 Dashboard clips its cards: ${fit.clipped.join(', ')}`);
  // every lesson card still says which lesson it is, and every cell is the same size as the next
  const titles = await page.evaluate(() => [...document.querySelectorAll('.ftdd-daycell .module-card .mh-title')].map(x => {
    const r = x.getBoundingClientRect(), card = x.closest('.module-card').getBoundingClientRect();
    return { id: x.closest('.module-card').id, text: x.innerText.trim(), shown: r.height > 6 && r.bottom <= card.bottom + 1 }; }));
  if (titles.length !== 8) fail(`${titles.length} lesson cards carry a title, not 8`);
  titles.filter(t => !t.shown || !t.text).forEach(t => fail(`${t.id}'s lesson name is hidden on 📚 Dashboard ("${t.text}")`));
  const sizes = await page.evaluate(() => [...new Set([...document.querySelectorAll('.module-grid > .ftdd-daycell')].map(c => Math.round(c.getBoundingClientRect().height)))]);
  if (sizes.length !== 1) fail(`the day cells are not all the same size: ${sizes.join(', ')}px`);
  if (l1) { await l1.click(); await page.waitForTimeout(1500); }
  const at = () => page.evaluate(() => ({ view: state.view, hash: location.hash, h: (document.querySelector('.ftdd-ribbon span') || {}).innerText || '', n: (document.querySelector('.ftdd-n') || {}).innerText || '',
    deck: !!document.querySelector('.ftdd-deck .ftdd-logo') && !!document.querySelector('.ftdd-dtitle'), tiles: document.querySelectorAll('.ftdd-sheet a.ftdd-tile').length,
    open: Array.from({ length: 16 }, (_, i) => i + 1).filter(n => FTDayDecks.dayOpen(n)).map(String), scroll: document.documentElement.scrollHeight - innerHeight,
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
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; FTDayDecks.open(16); }); await page.waitForTimeout(800);
  s = await at();
  if (s.open.length !== 16) fail(`an admin can open ${s.open.length} days, not 16`);
  await page.evaluate(() => FTDayDecks.to(1)); await page.waitForTimeout(400);
  s = await at();
  if (!/Lien Balance Verification/.test(s.h)) fail('Day 16\'s second slide is "' + s.h + '"');
  if (!s.tiles) fail('Day 16\'s links are not shown as tiles');
  // 📌 a no-discussion day: the trainer adds the day's activities and instructions on its last slide
  const extrasBefore = await get('settings:dayextras');
  await put('settings:dayextras', { days: {} });
  await page.evaluate(() => FTDayDecks.trainer(4)); await page.waitForTimeout(1200);
  if (!(await page.$('.ftdd-xform'))) fail('Day 4\'s last slide has no form for the trainer');
  await page.evaluate(() => FTDayDecks.preset(4, 0)); await page.waitForTimeout(800);
  await page.selectOption('#ftddXKind', 'instruction');
  await page.fill('#ftddXTitle', 'Wait for your turn <b>quietly</b>');
  await page.fill('#ftddXText', 'Keep your camera on.\nPractise until your name is called.');
  await page.evaluate(() => FTDayDecks.addX(4)); await page.waitForTimeout(800);
  const ex = await get('settings:dayextras'), d4 = (ex && ex.days && ex.days[4]) || [];
  if (d4.length !== 2 || d4[0].kind !== 'practice' || !/call\.html\?program=FT&line=Reception/.test(d4[0].url) || d4[1].title !== 'Wait for your turn <b>quietly</b>')
    fail(`the trainer's Day 4 additions weren't saved: ${JSON.stringify(d4)}`);
  // a trainee on Day 4 sees them, read-only
  await page.evaluate(([tid]) => { state.isAdmin = false; state.traineeId = tid; for (let l = 1; l <= 4; l++) state.progress[l] = { done: true, studied: true }; }, [id]);
  await put('settings:opendays', { all: [1, 2, 3, 4, 5], batches: {} });
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(1500);
  if (await page.evaluate(() => { const b = document.querySelector('#dayd-4 .ftdd-dc-main'); return !b || b.disabled; })) fail('a trainee on Day 5 can\'t open the Day 4 instructions');
  await page.click('#dayd-4 .ftdd-dc-pin'); await page.waitForTimeout(1500);
  const tv = await page.evaluate(() => ({ h: (document.querySelector('.ftdd-ribbon span') || {}).innerText || '', steps: document.querySelectorAll('.ftdd-x').length, form: !!document.querySelector('.ftdd-xform'),
    sim: !!document.querySelector('.ftdd-x a[href*="call.html"]'), bold: !!document.querySelector('.ftdd-x b b'), text: (document.querySelector('.ftdd-body') || {}).innerText || '' }));
  if (!/From your trainer/.test(tv.h)) fail(`📌 didn't open Day 4's "From your trainer" slide: ${tv.h}`);
  if (tv.steps !== 2 || !tv.sim) fail('the trainee doesn\'t see the trainer\'s two Day 4 steps with the Call Simulator link');
  if (tv.form) fail('a trainee sees the trainer\'s form');
  if (tv.bold || !/<b>quietly<\/b>/.test(tv.text)) fail('a title from the trainer was drawn as HTML');
  // a long slide is read in pages, and Next turns the page before the slide
  await page.evaluate(() => { state.isAdmin = false; state.adminPreview = true; FTDayDecks.open(7, 1); }); await page.waitForTimeout(1600);
  const paged = await page.evaluate(() => ({ pages: FTDayDecks.state().pages, page: FTDayDecks.state().page, over: (() => { const x = document.querySelector('.ftdd-sheet'); return x.scrollHeight - x.clientHeight; })() }));
  if (!(paged.pages > 1)) fail(`Day 7's instruction slide isn't read in pages: ${JSON.stringify(paged)}`);
  if (paged.over > 4) fail(`a page of it overflows by ${paged.over}px`);
  await page.evaluate(() => FTDayDecks.go(1)); await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ i: FTDayDecks.state().i, page: FTDayDecks.state().page, mark: (document.querySelector('.ftdd-n') || {}).innerText || '' }));
  if (after.i !== 1 || after.page !== 1 || !/page 2 of/i.test(after.mark)) fail(`Next didn't turn the page: ${JSON.stringify(after)}`);
  // the slide says what it opens: its lesson, and the Call Listening log on its own slide
  const acts = await page.evaluate(() => [...document.querySelectorAll('.ftdd-acts .btn')].map(b => b.innerText.trim()));
  if (!acts.some(x => /Open the lesson/.test(x))) fail(`a classroom discussion slide has no lesson button: ${JSON.stringify(acts)}`);
  const listen = await page.evaluate(() => { const n = document.querySelectorAll('.ftdd-dot').length;
    for (let i = 0; i < n; i++) { FTDayDecks.to(i); if (/Call Listening/.test((document.querySelector('.ftdd-ribbon span') || {}).innerText || '')) return [...document.querySelectorAll('.ftdd-acts .btn')].map(b => b.innerText.trim()); } return null; });
  if (!listen || !listen.some(x => /Call Listening Log/.test(x))) fail(`the Call Listening slide has no log button: ${JSON.stringify(listen)}`);
  // ◫ split screen shows two slides, ▶ autoplay turns them on its own
  await page.evaluate(() => { FTDayDecks.to(1); FTDayDecks.split(); }); await page.waitForTimeout(800);
  if (await page.$$eval('.ftdd-slides .ftdd-deck', x => x.length) !== 2) fail('split screen doesn\'t show two slides');
  await page.evaluate(() => FTDayDecks.split()); await page.waitForTimeout(500);
  if (await page.$$eval('.ftdd-slides .ftdd-deck', x => x.length) !== 1) fail('one slide doesn\'t come back');
  await page.evaluate(() => FTDayDecks.auto()); await page.waitForTimeout(400);
  if (!(await page.evaluate(() => FTDayDecks.state().auto))) fail('autoplay didn\'t start');
  await page.evaluate(() => FTDayDecks.auto()); await page.waitForTimeout(300);
  if (await page.evaluate(() => FTDayDecks.state().auto)) fail('autoplay didn\'t stop');
  // the metrics screenshot is drawn out as the scorecard the call is marked on
  await page.evaluate(() => { state.isAdmin = true; FTDayDecks.open(4, 0); }); await page.waitForTimeout(1300);
  const score = await page.evaluate(() => { const n = document.querySelectorAll('.ftdd-dot').length;
    for (let i = 0; i < n; i++) { FTDayDecks.to(i); const b = document.querySelector('.ftdd-score'); if (b) return { h: b.innerText.slice(0, 120), items: b.querySelectorAll('.ftdd-score-l li').length, shot: !!b.querySelector('img') }; } return null; });
  if (!score || score.items < 10 || !/How this call is scored/.test(score.h)) fail(`the Reception metrics aren't drawn as a scorecard: ${JSON.stringify(score)}`);
  if (await page.evaluate(() => /Free Communication Upskill/.test(document.body.innerText))) fail('the facilitator\'s timing note is still on a slide');

  // the guidelines the guide writes as a wall of headings are read as cards, and the day's offline work is named
  await page.evaluate(() => { state.isAdmin = false; state.adminPreview = true; FTDayDecks.open(6, 2); }); await page.waitForTimeout(1600);
  const cards = await page.evaluate(() => ({ secs: document.querySelectorAll('.ftdd-sec').length, cards: document.querySelectorAll('.ftdd-card').length, chips: document.querySelectorAll('.ftdd-chip-i').length }));
  if (cards.secs < 4 || cards.cards < 15) fail(`Day 6's calendar guidelines aren't read as cards: ${JSON.stringify(cards)}`);
  await page.evaluate(() => FTDayDecks.open(2, 0)); await page.waitForTimeout(1300);
  const off = await page.evaluate(() => [...document.querySelectorAll('.ftdd-ag-off li')].map(x => x.innerText));
  if (off.length < 3 || !off.some(x => /upload/i.test(x))) fail(`Day 2's outside-hours work isn't on its agenda: ${JSON.stringify(off)}`);
  if (await page.evaluate(() => [...document.querySelectorAll('.ftdd-ag-list li')].some(li => /Shadowing Etiquette/.test(li.innerText) && /Log/.test(li.innerText)))) fail('the Shadowing Etiquette PPT is offered as a shadowing session');
  // Day 9's mock call preparation is no longer a blank slide
  await page.evaluate(() => FTDayDecks.open(9, 2)); await page.waitForTimeout(1500);
  const d9 = await page.evaluate(() => ({ h: (document.querySelector('.ftdd-ribbon span') || {}).innerText || '', text: (document.querySelector('.ftdd-sheet') || {}).textContent || '', score: document.querySelectorAll('.ftdd-score-l li').length }));
  if (!/Intake Mock Call Preparation/.test(d9.h)) fail(`Day 9's third slide is "${d9.h}"`);
  if (!/Call Simulator/.test(d9.text) || !/debrief/i.test(d9.text) || d9.score < 10) fail(`it doesn't carry the practice, the debrief and the metrics: ${JSON.stringify({ len: d9.text.length, score: d9.score })}`);

  await put('settings:dayextras', extrasBefore || { days: {} });
  await put('settings:opendays', openBefore || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Day decks test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log(`Day decks test passed (16 decks from build/days, up to date; no facilitator content or Process Questions on a slide, a "To be added" slide each; a lesson's day deck on its card and the eight lessons in their two parts — the discussion and the offline half — as 16 cards in four rows; no band, the scores in its place; the trainer's Day 4 simulator preset and instruction saved and seen by a trainee, escaped; a trainee on their day and the days before, an admin on any; ← / →; one screen, a long slide read in pages with Next turning the page; the slide's lesson and Call Listening buttons; split screen and autoplay; the metrics drawn as the scorecard and the facilitator's timing note gone).`);
})().catch(e => { console.error(e); process.exit(1); });
