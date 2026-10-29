// 📋 Day decks (js/ft-day-decks.js, js/ft-day-decks-data.js from build/day-decks.cjs): one per day, nothing
// facilitator-only and no Process Questions on a slide; 📚 Dashboard is the eight lessons' intro cards on one screen, and a
// day deck opens on its lesson's full Classroom Activity card (every row opens its slide); no next-step band on 📚 Dashboard (the scores sit there); a trainee kept to the days
// they have reached, an admin on any day; the trainer adds a no-discussion day's activities and instructions
// (a simulator preset for a mock-call day, a custom step) and a trainee sees them; the page on one screen.
// Usage: NODE_PATH=…/node_modules node .github/scripts/day-decks.cjs http://localhost:8787/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const R = path.resolve(__dirname, '../..');
const failures = []; const fail = m => failures.push(m);
// the data file is what the generator writes (built, not committed: wrangler.json "build", the Checks workflow), and the
// generator writes the same file every time
const data = path.join(R, 'js/ft-day-decks-data.js');
cp.execFileSync('node', [path.join(R, 'build/day-decks.cjs')], { stdio: 'ignore' });
const before = fs.readFileSync(data, 'utf8');
cp.execFileSync('node', [path.join(R, 'build/day-decks.cjs')], { stdio: 'ignore' });
if (fs.readFileSync(data, 'utf8') !== before) fail('build/day-decks.cjs writes a different js/ft-day-decks-data.js each time it runs');
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(before, ctx);
const D = ctx.window.FT_DAY_DECKS || {};
for (let n = 1; n <= 16; n++) {
  const d = D[n]; if (!d || !(d.slides || []).length) { fail(`no deck for Day ${n}`); continue; }
  for (const s of d.slides) {
    if (/PROCESS QUESTIONS/.test(s.html)) fail(`Day ${n} ${s.id}: a Process Questions list on a slide`);
    // no assessment questions on a slide either: a reading task's questions come with its file
    if (/Answer (the following|these) questions?/i.test(s.html)) fail(`Day ${n} ${s.id}: an assessment's questions on a slide`);
    if (/What is personal injury and what are its types/i.test(s.html)) fail(`Day ${n} ${s.id}: the PI reading task's questions on a slide`);
    if (/(^|>)\s*1[.)]\s+[^<]{25,}<br>\s*2[.)]\s/m.test(s.html)) fail(`Day ${n} ${s.id}: a numbered question list on a slide`);
    if (/class="facilitator|Answer Key|Correct Answer|Ideal Answer|Password|Username/i.test(s.html)) fail(`Day ${n} ${s.id}: facilitator-only content or log-in details`);
    // A facilitator's instruction the guide doesn't label as one (Day 16's notes 2 and 3 came through after a "share … and
    // provide this instruction" line): the demo task lists and the instructions about preparing them stay with the trainer.
    if (/Demo Tasks|trainees(&#x27;|')? consumption|before posting them on SA|to each trainee before their turn/i.test(s.html)) fail(`Day ${n} ${s.id}: a facilitator's instruction or the demo tasks`);
  }
  if (!d.slides.some(s => s.placeholder || /^extra-/.test(s.id))) fail(`Day ${n}: no "To be added" slide`);
}
if (D[1] && D[1].slides.some(s => ['reminders', 'expectations', 'homework', 'monitoring'].includes(s.id))) fail('Day 1 still has Training Reminders, the Nitro Pro homework, the Monitoring Sheet set-up or Setting of Expectations');
// Day 1's Installation of SA keeps only the Smart Advocate steps: no Nitro Pro installation on the deck (its help line names Sanders for Nitro Pro)
const sa = D[1] && D[1].slides.find(s => s.id === 'pm');
if (!sa || !/Installation of SA/.test(sa.h) || /<h[2-4][^>]*>[^<]*Nitro/i.test(sa.html) || !/Smart Advocate/.test(sa.html)) fail(`Day 1's Installation of SA slide is missing or still has the Nitro Pro installation: ${sa && sa.h}`);
if (D[17] || D[18]) fail('the Lien Negotiator days (17–18) are still built');
if (D[13] && !D[13].slides.some(s => /ftdd-pq/.test(s.html))) fail('Day 13: no pointer to ✍️ Knowledge Check where its Process Questions were');
// a section cut into one slide per card row (build/day-decks.cjs ROWS): a new slide's id never reads as a continuation of
// the one it was cut from, and every trainer slot is on exactly one slide
for (let n = 2; n <= 16; n++) { const d = D[n]; if (!d) continue;
  d.slides.filter(s => s.of && s.id !== s.of).forEach(s => { if (s.id.startsWith(s.of + '-')) fail(`Day ${n} ${s.id} reads as a continuation of ${s.of}`); });
  const slots = d.slides.flatMap(s => s.html.match(/data-slot="[^"]+"/g) || []);
  if (new Set(slots).size !== slots.length) fail(`Day ${n}: a trainer slot is on two slides`); }
// Day 11's LOR Drafting guidelines are on its slides, read like Day 1's reading, in place of their Drive link
const lor = D[11] && D[11].slides.filter(s => s.read);
if (!lor || lor.length !== 2 || !/<h3>Activity 1: Letter of Representation/.test(lor[0].html) || !/<h3>Activity 2: Letter of Representation/.test(lor[1].html) || D[11].slides.some(s => /11N15MFcvSedCvByQ4GqHqt9BKZqlSxVu/.test(s.html)))
  fail(`Day 11's LOR Drafting guidelines aren't inlined over two read slides: ${JSON.stringify((lor || []).map(s => s.id))}`);
// Day 5: its buffer carries Day 4's Reception mock call preparation and its instructions & metrics, word for word (built
// once); the Attorney Calendar Management Activity's own text (Instructions 1–9, the seven colours, the guests, the ten
// Activity Items) on a read slide with the Calendar Simulator's hook, then its files and cards; Days 5 and 13 have no
// slide that only says the lesson deck opens from ▶ Start Training
{
  const sl = (n, id) => ((D[n] || { slides: [] }).slides.find(s => s.id === id) || {}).html || '';
  const prep4 = sl(4, 's2b').slice(sl(4, 's2b').indexOf('<p>📞 Practice a caller')).trim(), run4 = sl(4, 's2c').trim(), buf5 = sl(5, 's1');
  if (prep4.length < 500 || !run4 || !buf5.includes(prep4) || !buf5.includes(run4) || !/Front Desk Drill/.test(buf5) || !/Link coming: AI Mock Calls Listening/.test(buf5))
    fail(`Day 5's buffer doesn't carry Day 4's mock call preparation and metrics: ${buf5.length} chars`);
  const act5 = D[5] && D[5].slides.find(s => s.id === 's3'), txt = (act5 || {}).html || '';
  const ins = (txt.match(/<p class="li" style="--lvl:0"><span class="lbl">\d\.<\/span>/g) || []).length, items = (txt.match(/class="ftdd-cal-item"/g) || []).length;
  if (!act5 || !act5.read || ins !== 9 || items !== 10 || (txt.match(/class="ftdd-sw"/g) || []).length !== 7 || !/john\.delacruz@legalsupporthelp\.com/.test(txt) || !/data-calsim-activity/.test(txt))
    fail(`Day 5's activity text isn't on its slide: ${JSON.stringify({ read: act5 && act5.read, ins, items })}`);
  if (!/1VNgbFDn3PgkPwkE6g0PwXYxo-7DmU3MP/.test(sl(5, 's3b')) || !/ftdd-gcal/.test(sl(5, 's3b')) || !/ftdd-seq/.test(sl(5, 's3b'))) fail('Day 5\'s activity file, samples and drawn pictures are no longer on its second slide');
  [5, 13].forEach(n => { if ((D[n] || { slides: [] }).slides.some(s => s.html.replace(/<div class="trainer-slot"[^>]*><\/div>/g, '').trim() === '<div class="ftdd-pq">📘 <b>Today’s lesson deck</b> opens from <b>▶ Start Training</b> on 📚 Dashboard, or the 📘 lesson button above — it is not on this slide.</div>'))
    fail(`Day ${n} still has the slide that only says the lesson deck opens from Start Training`); });
}

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
  // the days without a classroom discussion still end on 📌 From your trainer
  const want = await page.evaluate(() => FTDayDecks.instructionOnlyDays());
  if (JSON.stringify(want) !== JSON.stringify([4, 6, 8, 9, 11, 12, 14, 15, 16])) fail(`the days with no classroom discussion are ${want.join(', ')}`);
  // 📚 Dashboard is the eight lessons on one screen: the portal's lesson card each, in lesson order, its buttons in
  // the session's order (on top a segment per part of the lesson, Start for a one-part lesson, else Part 1 · Part 2 … (Receptionist: Day 3's session and Day 4; Medical Records: MedLOR and Lien Verification), in place of ▶ Start Training (js/ft-day-locks.js) — then 🎬 Video, and no 🏠 Classroom; the lesson's icon opens its day card), and every one of the sixteen days on
  // exactly one card (Intake is Days 7–9, Medical Records Days 13–16)
  const grid = await page.evaluate(() => [...document.querySelectorAll('main.main-dash .module-grid > .ftli')].map(c => ({ id: c.id,
    days: c.dataset.days.split(',').map(Number), h: (c.querySelector('.mh-title') || {}).innerText || '',
    segs: [...c.querySelectorAll('.mc-grid > .ftseg > .ftseg-b')].map(b => b.innerText.replace(/^[^A-Za-z]+/, '').trim()),
    steps: [...c.querySelectorAll('.mc-grid > button')].map(b => b.innerText.replace(/^[^A-Za-z]+/, '').trim()), first: (c.querySelector('.module-body.ftli-days') || {}).id })));
  if (grid.length !== 8) fail(`📚 Dashboard draws ${grid.length} lesson cards, not 8`);
  if (grid.map(c => c.id).join() !== 'dayl-1,dayl-2,dayl-3,dayl-4,dayl-5,dayl-6,dayl-7,dayl-8') fail(`the lesson cards run ${grid.map(c => c.id).join()}`);
  const all = grid.flatMap(c => c.days);
  if (all.join() !== Array.from({ length: 16 }, (_, i) => i + 1).join()) fail(`the cards don't hold Days 1–16 once each, in order: ${all.join()}`);
  if (await page.$('.ftdd-daycard, .ftdd-daycol, main.main-dash .ftlc')) fail('the old day grid or the full card is still on the dashboard');
  grid.forEach(c => {
    if (!c.h) fail(`${c.id} has no lesson name`);
    if (c.segs.join() !== (n => n === 1 ? ['Start'] : Array.from({ length: n }, (_, k) => 'Part ' + (k + 1)))({ 'dayl-4': 2, 'dayl-8': 2 }[c.id] || c.days.length).join() || !/^(Video|Request Video|Requested)$/.test(c.steps[0] || '') || c.steps.length !== 1) fail(`${c.id}'s buttons are ${c.segs.concat(c.steps).join(' | ')}`);
    if (c.first !== 'dayd-' + c.days[0]) fail(`${c.id}'s icon doesn't open its day card (#${c.first})`);
  });
  if (!/Virtual Assistant Essentials/.test(grid[0] && grid[0].h)) fail(`Lesson 1's card reads "${grid[0] && grid[0].h}"`);
  // the eight fit one screen
  const fits = await page.evaluate(() => ({ page: document.documentElement.scrollHeight - innerHeight, main: (m => m.scrollHeight - m.clientHeight)(document.querySelector('main.main-dash')) }));
  if (fits.page > 2 || fits.main > 2) fail(`📚 Dashboard doesn't fit one screen: ${JSON.stringify(fits)}`);
  if (await page.$('.ftli-class')) fail('a lesson card still has the 🏠 Classroom button');
  // 📋 the days card opens the day deck on the full Classroom Activity card, and a row opens its own slide
  await page.click('#dayd-1'); await page.waitForTimeout(1500);
  const card = await page.evaluate(() => { const c = document.querySelector('.ftdd-deck .ftdd-lcslide .ftlc');
    return c && { h: (c.querySelector('.ftlc-ht h3') || {}).innerText || '', rows: c.querySelectorAll('.ftlc-row').length, pills: c.querySelectorAll('.ftlc-pill').length,
      focus: !!c.querySelector('.ftlc-focus-t'), file: /File name:/.test((c.querySelector('.ftlc-file') || {}).innerText || '') }; });
  if (!card || !/^Virtual Assistant Essentials/.test(card.h) || card.rows !== 5 || card.pills !== 5 || !card.focus || !card.file)
    fail(`Day 1's deck doesn't open on the full Classroom Activity card: ${JSON.stringify(card)}`);
  // every day opens on its own day card: the discussion day on its Classroom Activity card, a day after it on a
  // card of that day's own rows
  // 🔓 a day waits for its trainer (js/ft-day-locks.js): with no lesson open, a trainee's Day 2 shows its lock, not its card
  await page.evaluate(() => FTDayDecks.open(2)); await page.waitForTimeout(600);
  // (the slide stays, blurred under its lock, with nothing on it to click)
  if (!(await page.$('main.main-ftdd .ftdd-slides.ftlk > .ftd1-lock')) || await page.$('.ftdd-slides > .ftdd-deck .ftlc, .ftdd-slides.ftlk .ftlk-under a[href], .ftdd-slides.ftlk .ftlk-under button:not([disabled])')) fail('a trainee opened Day 2 before the trainer opened it');
  // once its lesson is open (the test server opens every day's steps, server.mjs), every day opens on its card
  await put('settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8], batches: {} }); await page.evaluate(() => ftLoadOpenDays());
  const dayCards = []; let d1zoom = 1;
  for (let n = 1; n <= 16; n++) {
    await page.evaluate(n => FTDayDecks.open(n), n); await page.waitForTimeout(500);
    dayCards.push(await page.evaluate(() => { const c = document.querySelector('.ftdd-lcslide .ftlc');
      return c ? { day: Number(c.dataset.day), first: c.dataset.first === '1', h: (c.querySelector('.ftlc-ht h3') || {}).innerText || '', rows: c.querySelectorAll('.ftlc-row').length } : null; }));
  }
  dayCards.forEach((c, i) => { const n = i + 1;
    if (!c || c.day !== n || c.rows < 1) fail(`Day ${n}'s deck doesn't open on its own day card: ${JSON.stringify(c)}`);
    else if ([1, 2, 3, 4, 5, 7, 10, 13].includes(n) !== c.first || /^(Classroom Activity|Day \d+):/.test(c.h)) fail(`Day ${n}'s card is headed "${c.h}" (first day: ${c.first})`); });
  // 📋 Days 2–16 in Day 1's shape: every row of a day's card leads to its own slide(s), in the card's order, each row's slides
  // one run, the deck ending on ✅ End of Module; a row's slides have something on them; the day's Activity Locks steps are its
  // rows, named as the card names them. Day 1's deck is as it was.
  await page.evaluate(() => { state.adminPreview = true; });
  for (let n = 1; n <= 16; n++) {
    await page.evaluate(n => FTDayDecks.open(n, 0), n); await page.waitForTimeout(500);
    const r = await page.evaluate(n => {
      const rows = FTDayDecks.dayRows(n), list = FTDayDecks.list(n);
      const card = [...document.querySelectorAll('.ftdd-lcslide .ftlc-row .ftlc-t > b')].map(b => b.textContent.trim());
      const z = parseFloat((document.querySelector('.ftdd-lcslide .ftlc') || { style: {} }).style.zoom) || 1;
      return { ids: list.map(s => s.id), rowOf: list.map(s => s.agenda || s.divider ? null : s.row), rows: rows.map(r => FTDayDecks.rowLabel(n, r)), card, z,
        end: !!(list[list.length - 1] || {}).end, steps: n > 1 ? FTDayLocks.steps(n).map(s => s.label) : null,
        title: (document.querySelector('.ftdd-dtitle') || {}).textContent || '' };
    }, n);
    if (n === 1) {
      if (r.ids.join() !== 'agenda,reading,reading-2,reading-3,reading-4,reading-5,reading-6,reading-7,reading-8,go-1,go-2,go-3,pm,end-day') fail(`Day 1's deck changed: ${r.ids.join()}`);
      d1zoom = r.z; continue;
    }
    if (JSON.stringify(r.card) !== JSON.stringify(r.rows)) fail(`Day ${n}'s card doesn't show its rows: ${JSON.stringify(r.card)}`);
    const seq = r.rowOf.filter(x => x != null);
    r.rows.forEach((t, k) => { if (!seq.includes(k)) fail(`Day ${n}'s row ${k + 1} (${t}) has no slide of its own`); });
    if (seq.some((x, i) => i && x < seq[i - 1])) fail(`Day ${n}'s slides don't run in its card's order: ${JSON.stringify(r.ids.map((id, i) => id + ':' + r.rowOf[i]))}`);
    if (!r.end || r.ids[r.ids.length - 1] !== 'end-day') fail(`Day ${n}'s deck doesn't end on End of Module`);
    if (JSON.stringify(r.steps) !== JSON.stringify(r.rows)) fail(`Day ${n}'s steps aren't its card's rows: ${JSON.stringify(r.steps)}`);
    // the card's rows read at about Day 1's size (a fuller card lays them in two columns rather than shrink them)
    if (r.z < d1zoom * 0.85 - 0.001) fail(`Day ${n}'s card is drawn at ${r.z}, below 85% of Day 1's ${d1zoom}`);
    // every slide has something on it (a launch, its button)
    for (let i = 1; i < r.ids.length - 1; i++) {
      await page.evaluate(i => FTDayDecks.to(i), i); await page.waitForTimeout(150);
      const has = await page.evaluate(() => { const sh = document.querySelector('.ftdd-mid .ftdd-deck .ftdd-sheet'), go = document.querySelector('.ftdd-mid .ftdd-deck .ftdd-dv-go, .ftdd-mid .ftdd-deck .ftdd-ho');
        return !!go || !!(sh && (sh.innerText.trim() || sh.querySelector('img, iframe, .ftdd-tile'))); });
      if (!has) fail(`Day ${n}'s slide ${r.ids[i]} is empty`);
    }
    if (n === 2 && !/^Law Firm Communication$/.test(r.title.trim())) fail(`Day 2's deck is headed "${r.title}"`);
  }
  // Day 2's Breakout Session: its four handouts and the lesson's video on one stop (one handouts row on the card)
  await page.evaluate(() => FTDayDecks.open(2, FTDayDecks.list(2).findIndex(s => s.launch && /ftVideoOrAsk/.test(s.launch.run || '')))); await page.waitForTimeout(600);
  const ho2 = await page.evaluate(() => ({ cards: document.querySelectorAll('.ftdd-ho').length, video: !!document.querySelector('.ftdd-ho-video'), ribbon: (document.querySelector('.ftdd-ribbon span') || {}).textContent || '',
    rows: FTDayDecks.dayRows(2).filter(r => /Handouts/.test(r.t)).length }));
  if (ho2.cards !== 4 || !ho2.video || !/Breakout Session/.test(ho2.ribbon) || ho2.rows !== 1) fail(`Day 2's Breakout Session isn't its handouts and video on one stop: ${JSON.stringify(ho2)}`);
  await page.evaluate(() => { state.adminPreview = false; });
  await page.evaluate(() => FTDayDecks.open(1)); await page.waitForTimeout(800);
  // Day 1's card runs the trainers' order: Reading Task → Discussion → Handouts / Video → Process Questions → Installation of SA
  const d1rows = await page.evaluate(() => [...document.querySelectorAll('.ftdd-lcslide .ftlc-row')].map(r => (r.querySelector('b, .ftlc-t') || r).innerText.split('\n')[0].trim()));
  const want1 = [/^Reading Task/, /^Classroom Discussion/, /^Handouts \/ Video/, /^Process Questions/, /^Installation of SA/];
  if (d1rows.length !== 5 || !want1.every((re, i) => re.test(d1rows[i] || ''))) fail(`Day 1's card doesn't run Reading Task → Discussion → Handouts / Video → Process Questions → Installation of SA: ${JSON.stringify(d1rows)}`);
  await page.click('.ftdd-lcslide .ftlc-row:has-text("Reading Task")'); await page.waitForTimeout(1500);
  const row = await page.evaluate(() => ({ view: state.view, h: (document.querySelector('.ftdd-ribbon span') || {}).textContent || '' }));
  if (row.view !== 'daydeck' || !/Reading Task/.test(row.h)) fail(`the Reading Task row opened ${JSON.stringify(row)}`);
  // 🧰 Know Your Tools: its own card on 📚 Dashboard, beside the 📌 Setting of Training Expectations card, opening its own
  // page (#/knowtools); every tool shows its real screenshot, what it is for, where it is and its features, and the
  // page fits its sheet whichever tool is picked. Day 1's deck has neither it nor the Monitoring Sheet set-up any more.
  const d1 = await page.evaluate(() => FT_DAY_DECKS[1].slides.map(x => x.id));
  if (d1.includes('tools') || d1.includes('monitoring')) fail(`Day 1's deck still has Know Your Tools or the Monitoring Sheet set-up: ${d1.join(', ')}`);
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(900);
  const pins = await page.evaluate(() => [...document.querySelectorAll('main .dash-pair-pin .module-card .mh-title')].map(x => x.innerText.trim()));
  if (pins.length !== 2 || !/Setting of Training Expectations/.test(pins[0]) || pins[1] !== 'Know Your Tools') fail(`the pinned cards are ${JSON.stringify(pins)}`);
  await page.click('.ftkt-card .module-start-btn'); await page.waitForTimeout(1200);
  const kt = await page.evaluate(() => ({ view: state.view, h: (document.querySelector('.ftdd-dtitle') || {}).textContent || '', tabs: document.querySelectorAll('.ftdd-tools-tab').length }));
  if (kt.view !== 'knowtools' || !/Know Your Tools/.test(kt.h) || kt.tabs !== 8) fail(`the Know Your Tools card didn't open its page with eight tools: ${JSON.stringify(kt)}`);
  const TOOLS_N = kt.tabs;
  for (let t = 0; t < TOOLS_N; t++) {
    await page.evaluate(t => FTDayDecks.tool(t), t); await page.waitForTimeout(300);
    const tool = await page.evaluate(async () => { const img = document.querySelector('.ftdd-tool-shot img');
      if (img && !img.complete) await new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 3000); });
      const sh = document.querySelector('.ftdd-mid .ftdd-sheet');
      return { name: (document.querySelector('.ftdd-tool-txt h3') || {}).textContent || '', shot: !!(img && img.naturalWidth), what: !!document.querySelector('.ftdd-tool-what'),
        where: !!document.querySelector('.ftdd-tool-where'), feats: document.querySelectorAll('.ftdd-tool-txt li').length, acts: !!document.querySelector('.ftdd-tool-acts, .ftdd-tool-txt a.btn, .ftdd-tool-txt button'),
        on: (document.querySelector('.ftdd-tools-tab.on') || {}).title || '', over: sh ? sh.scrollHeight - sh.clientHeight : -1 }; });
    if (!tool.shot || !tool.what || !tool.where || tool.feats < 3) fail(`Know Your Tools, tool ${t + 1}, is missing its screenshot, purpose, place or features: ${JSON.stringify(tool)}`);
    if (tool.acts) fail(`Know Your Tools, tool ${t + 1}, still has an Open, counter or Next tool button: ${JSON.stringify(tool)}`);
    if (!tool.on || tool.name.indexOf(tool.on) < 0) fail(`Know Your Tools: the picked tab isn't the tool shown: ${JSON.stringify(tool)}`);
    if (tool.over > 4) fail(`Know Your Tools, ${tool.name}: the slide runs over its sheet by ${tool.over}px`);
  }
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(800);
  await page.evaluate(() => FTDayDecks.open(1)); await page.waitForTimeout(1500);
  const at = () => page.evaluate(() => ({ view: state.view, hash: location.hash, h: (document.querySelector('.ftdd-ribbon span') || {}).textContent || '', n: (document.querySelector('.ftdd-stepno') || {}).innerText || '',
    deck: !document.querySelector('.ftdd-deck .ftdd-logo') && !!document.querySelector('.ftdd-dtitle') && !!document.querySelector('.ftdd-dhead .ftdd-prog > span') && !!document.querySelector('.ftdd-nav .ftdd-stepno'), tiles: document.querySelectorAll('.ftdd-sheet a.ftdd-tile').length,
    open: Array.from({ length: 16 }, (_, i) => i + 1).filter(n => FTDayDecks.dayOpen(n)).map(String), scroll: document.documentElement.scrollHeight - innerHeight,
    trainerNotes: [...document.querySelectorAll('.ftdd-body .trainer-slot')].some(x => x.innerHTML.trim()) }));
  let s = await at();
  if (s.view !== 'daydeck' || s.hash !== '#/daydeck') fail(`the deck didn't open (${s.view} ${s.hash})`);
  if (!/1 OF/i.test(s.n) || !/Classroom Activity/.test(s.h)) fail(`the deck should open on its Classroom Activity card: ${s.n} ${s.h}`);
  // the card is scaled to fit its slide (as the Case Management course's slides are): nothing on it scrolls
  const cardFit = await page.evaluate(() => { const b = document.querySelector('.ftdd-mid .ftdd-onnavy'); return b ? b.scrollHeight - b.clientHeight : -1; });
  if (cardFit < 0 || cardFit > 2) fail(`Day 1's Classroom Activity card doesn't fit its slide: it runs over by ${cardFit}px`);
  if (!s.deck) fail('the deck is not drawn like the Case Management decks (outlined title with its progress line, no logo on the slide, Step N of M under it)');
  // the days are not gated: a trainee reads any day's instructions, in any order (gating.cjs covers the rest —
  // what paces the programme is the trainer's 📅 Open Lessons, which gates the lessons, not the days)
  if (s.open.length !== 16) fail('a trainee can open ' + s.open.length + ' of the 16 days: ' + s.open.join(', '));
  if (s.scroll > 2) fail(`the deck page scrolls by ${s.scroll}px (one screen)`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  const s2 = await at();
  if (!/2 OF/i.test(s2.n)) fail('→ did not turn to slide 2');
  if (s2.trainerNotes) fail('a trainee sees the facilitator notes in a deck');
  await page.evaluate(() => FTDayDecks.open(5)); await page.waitForTimeout(400);
  if (await page.evaluate(() => (document.querySelector('.ftdd-dtitle') || { dataset: {} }).dataset.day) !== '5') fail('a trainee can\'t open Day 5\'s instructions');
  // an admin opens any day too
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; FTDayDecks.open(16); }); await page.waitForTimeout(800);
  s = await at();
  if (s.open.length !== 16) fail(`an admin can open ${s.open.length} days, not 16`);
  await page.evaluate(() => FTDayDecks.to(FTDayDecks.at(16, FT_DAY_DECKS[16].slides[0].id))); await page.waitForTimeout(400);
  s = await at();
  if (!/Lien Balance Verification/.test(s.h)) fail('Day 16\'s first slide of its own is "' + s.h + '"');
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
  if (await page.evaluate(() => { const b = document.querySelector('#dayd-4'); return !b || b.disabled; })) fail('a trainee on Day 5 can\'t open the Day 4 instructions');
  // the trainer's additions are a row of their own on the lesson's Classroom Activity card, and it opens their slide
  await page.click('#dayd-4'); await page.waitForTimeout(1500);
  await page.click('.ftdd-lcslide .ftlc-row:has-text("From your trainer")'); await page.waitForTimeout(1500);
  const tv = await page.evaluate(() => ({ h: (document.querySelector('.ftdd-ribbon span') || {}).textContent || '', steps: document.querySelectorAll('.ftdd-x').length, form: !!document.querySelector('.ftdd-xform'),
    sim: !!document.querySelector('.ftdd-x a[href*="call.html"]'), bold: !!document.querySelector('.ftdd-x b b'), text: (document.querySelector('.ftdd-body') || {}).innerText || '' }));
  if (!/From your trainer/.test(tv.h)) fail(`📌 didn't open Day 4's "From your trainer" slide: ${tv.h}`);
  if (tv.steps !== 2 || !tv.sim) fail('the trainee doesn\'t see the trainer\'s two Day 4 steps with the Call Simulator link');
  if (tv.form) fail('a trainee sees the trainer\'s form');
  if (tv.bold || !/<b>quietly<\/b>/.test(tv.text)) fail('a title from the trainer was drawn as HTML');
  // a slide too long even at half size is read in pages, and Next turns the page before the slide (Day 8's Topic 2, the
  // intake documents: its tasks, the packet picker and the worksheet)
  await page.evaluate(() => { state.isAdmin = false; state.adminPreview = true; FTDayDecks.open(8, FTDayDecks.at(8, 's1b')); }); await page.waitForTimeout(1600);
  const paged = await page.evaluate(() => ({ i: FTDayDecks.state().i, pages: FTDayDecks.state().pages, page: FTDayDecks.state().page, over: (() => { const x = document.querySelector('.ftdd-sheet'); return x.scrollHeight - x.clientHeight; })() }));
  if (!(paged.pages > 1)) fail(`Day 8's Topic 2 slide isn't read in pages: ${JSON.stringify(paged)}`);
  if (paged.over > 4) fail(`a page of it overflows by ${paged.over}px`);
  await page.evaluate(() => FTDayDecks.go(1)); await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ i: FTDayDecks.state().i, page: FTDayDecks.state().page, mark: (document.querySelector('.ftdd-n') || {}).innerText || '' }));
  if (after.i !== paged.i || after.page !== 1 || !/page 2 of/i.test(after.mark)) fail(`Next didn't turn the page: ${JSON.stringify(after)}`);
  // the slide says what it opens: Day 7's discussion slide its lesson, and the Call Listening log on its own slide
  await page.evaluate(() => FTDayDecks.open(7, FTDayDecks.at(7, 's1'))); await page.waitForTimeout(1200);
  const acts = await page.evaluate(() => [...document.querySelectorAll('.ftdd-acts .btn')].map(b => b.innerText.trim()));
  if (!acts.some(x => /Open the lesson/.test(x))) fail(`a classroom discussion slide has no lesson button: ${JSON.stringify(acts)}`);
  const listen = await page.evaluate(() => { const n = document.querySelectorAll('.ftdd-dot').length;
    for (let i = 0; i < n; i++) { FTDayDecks.to(i); if (/Call Listening/.test((document.querySelector('.ftdd-ribbon span') || {}).textContent || '')) return [...document.querySelectorAll('.ftdd-acts .btn')].map(b => b.innerText.trim()); } return null; });
  if (!listen || !listen.some(x => /Call Listening Log/.test(x))) fail(`the Call Listening slide has no log button: ${JSON.stringify(listen)}`);
  // 🗺 Map: the training roadmap, every lesson with its days and each day's slides; the slide you are on is marked,
  // and a slide in it opens that slide
  await page.evaluate(() => FTDayDecks.open(7, 2)); await page.waitForTimeout(1000);
  await page.click('.ftdd-nav .ftdd-map'); await page.waitForTimeout(500);
  const roadmap = await page.evaluate(() => ({ open: !!document.getElementById('ftMap'), lessons: document.querySelectorAll('.ftmap-lesson').length, days: document.querySelectorAll('.ftmap-day').length,
    here: (document.querySelector('.ftmap-day.here .ftmap-dt') || {}).textContent || '', on: (document.querySelector('.ftmap-slide.on .ftmap-sn') || {}).textContent || '' }));
  if (!roadmap.open || roadmap.lessons !== 8 || roadmap.days !== 16 || !/Day 7/.test(roadmap.here) || roadmap.on !== '7.3') fail(`🗺 Map doesn't show the roadmap with Day 7, slide 3 marked: ${JSON.stringify(roadmap)}`);
  await page.click('.ftmap-slide:has(.ftmap-sn:text-is("9.2"))'); await page.waitForTimeout(800);
  const went = await page.evaluate(() => ({ day: FTDayDecks.state().day, i: FTDayDecks.state().i, open: !!document.getElementById('ftMap') }));
  if (went.day !== 9 || went.i !== 1 || went.open) fail(`a slide on the map didn't open it: ${JSON.stringify(went)}`);
  await page.click('.ftdd-nav .ftdd-map'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  if (await page.$('#ftMap')) fail('Escape doesn\'t close the map');
  // the side panel has no sections (Today's lesson, How you read it) and no 📋 Today's To-Do: the 🗺 Map is the roadmap
  const rail = await page.evaluate(() => (document.querySelector('.ftdd-rail') || {}).textContent || '');
  if (/Today.s lesson|How you read|Split screen|To-Do/i.test(rail)) fail(`the deck's side panel still has its sections: ${rail.replace(/\s+/g, ' ').trim()}`);
  // no ▶ Autoplay on a deck: the trainee turns the slides
  if (await page.$('.ftdd-rail button:has-text("Autoplay")')) fail('the deck still offers ▶ Autoplay');
  // the metrics screenshot is drawn out as the scorecard the call is marked on
  await page.evaluate(() => { state.isAdmin = true; FTDayDecks.open(4, 0); }); await page.waitForTimeout(1300);
  const score = await page.evaluate(() => { const n = document.querySelectorAll('.ftdd-dot').length;
    for (let i = 0; i < n; i++) { FTDayDecks.to(i); const b = document.querySelector('.ftdd-score'); if (b) return { h: b.innerText.slice(0, 120), items: b.querySelectorAll('.ftdd-score-l li').length, shot: !!b.querySelector('img') }; } return null; });
  if (!score || score.items < 10 || !/How this call is scored/.test(score.h)) fail(`the Reception metrics aren't drawn as a scorecard: ${JSON.stringify(score)}`);
  if (await page.evaluate(() => /Free Communication Upskill/.test(document.body.innerText))) fail('the facilitator\'s timing note is still on a slide');

  // Day 6's Mock Call Scenarios read in the guide's wording, as text and lists (not a heading bar per line)
  await page.evaluate(() => { state.isAdmin = false; state.adminPreview = true; FTDayDecks.open(6, FTDayDecks.at(6, 's2')); }); await page.waitForTimeout(1600);
  const mc = await page.evaluate(() => { const sh = document.querySelector('.ftdd-sheet') || document.body;
    return { lists: sh.querySelectorAll('ul').length, items: sh.querySelectorAll('ul > li').length, bars: sh.querySelectorAll('.ftdd-sec, h3').length,
      rules: /Tuesdays and Thursdays/.test(sh.textContent) && /EST time zone/.test(sh.textContent) && /Date of Loss/.test(sh.textContent) }; });   // (textContent: a long slide is read in pages, and the rules may be on a page not showing)
  if (mc.lists < 4 || mc.items < 20 || !mc.rules || mc.bars > 2) fail(`Day 6's Mock Call Scenarios aren't read as the guide's text and lists: ${JSON.stringify(mc)}`);
  // no Training Agenda slide on any day: a lesson day opens on its card, a day without one on its first slide
  await page.evaluate(() => FTDayDecks.open(2, 1)); await page.waitForTimeout(1300);
  if (await page.$('.ftdd-ag')) fail("Day 2's second slide is still a Training Agenda");
  if (await page.evaluate(() => [...document.querySelectorAll('.ftdd-lcslide .ftlc-row')].some(li => /Shadowing Etiquette/.test(li.innerText) && /Log/.test(li.innerText)))) fail('the Shadowing Etiquette PPT is offered as a shadowing session');
  // Day 9's mock call preparation is no longer a blank slide
  await page.evaluate(() => FTDayDecks.open(9, FTDayDecks.at(9, FT_DAY_DECKS[9].slides[1].id))); await page.waitForTimeout(1500);
  const d9 = await page.evaluate(() => ({ h: (document.querySelector('.ftdd-ribbon span') || {}).textContent || '', text: (document.querySelector('.ftdd-sheet') || {}).textContent || '', score: document.querySelectorAll('.ftdd-score-l li').length }));
  if (!/Intake Mock Call Preparation/.test(d9.h)) fail(`Day 9's third slide is "${d9.h}"`);
  if (!/Call Simulator/.test(d9.text) || !/debrief/i.test(d9.text) || d9.score < 10) fail(`it doesn't carry the practice, the debrief and the metrics: ${JSON.stringify({ len: d9.text.length, score: d9.score })}`);

  // no ✍️ Knowledge Check button on any day card (the day goes in the deck's order); 🎮 Knowledge Games are off for now
  // (js/ft-kcgames.js GAMES_ON): no 🎮 button anywhere, and #/kcgames goes to ✍️ Knowledge Check
  const pqDays = [];
  for (let d = 1; d <= 16; d++) {
    await page.evaluate(d => FTDayDecks.open(d, 0), d); await page.waitForTimeout(400);
    if (await page.evaluate(() => !!document.querySelector('.ftdd-lcslide .ftlc-pqbox'))) pqDays.push(d);
    if (await page.evaluate(() => !!document.querySelector('.ftlc-games, .ftdd-games') || /Knowledge Games/.test(document.querySelector('main').innerText))) fail(`Day ${d}'s deck still offers the Knowledge Games`);
  }
  if (pqDays.length) fail(`a ✍️ Knowledge Check button still shows on the day card of days ${pqDays.join(', ')}`);
  if (await page.evaluate(() => typeof window.FTKCGames !== 'undefined')) fail('the Knowledge Games are still offered (window.FTKCGames)');
  await page.evaluate(() => goto('kcgames')); await page.waitForTimeout(800);
  if (await page.evaluate(() => state.view) !== 'process') fail('#/kcgames doesn\'t go to ✍️ Knowledge Check while the games are off');

  await put('settings:dayextras', extrasBefore || { days: {} });
  await put('settings:opendays', openBefore || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Day decks test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log(`Day decks test passed (16 decks from build/days, built the same every time; Days 2–16 in Day 1's shape: each card row its own slides in the card's order, ending on End of Module, nothing empty, the steps the card's rows, the card at about Day 1's size; Day 1's deck unchanged; Day 11's LOR guidelines inlined; no facilitator content or Process Questions on a slide, a "To be added" slide each; the eight lesson intro cards on one screen with Days 1–16 once each, the icon opening the deck on the Classroom Activity card, every day on its own day card, its rows opening their slides; no band, the scores in its place; the trainer's Day 4 simulator preset and instruction saved and seen by a trainee, escaped; a trainee on their day and the days before, an admin on any; ← / →; one screen, a long slide read in pages with Next turning the page; the slide's lesson and Call Listening buttons; no side panel sections, To-Do or autoplay; the metrics drawn as the scorecard and the facilitator's timing note gone).`);
})().catch(e => { console.error(e); process.exit(1); });
