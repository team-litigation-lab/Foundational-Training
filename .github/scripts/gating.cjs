// 🔒 One day at a time (js/ft-day-decks.js): a trainee works the curriculum in order — a day opens once every
//   lesson taught before it, other than the ones it teaches itself, is finished (passed in ✍️ Knowledge Check,
//   or studied where a lesson has no Process Questions, as Calendar Management has none), so the days a lesson
//   runs over open together and the next lesson's days wait for it to be passed. Everything further on is locked
//   on its card, on its instructions deck and on the lesson itself, whatever the trainer has opened for the batch.
//   A trainer, and a trainer in Trainee view, opens every day and every lesson of the curriculum.
//   The blocks, as the guide teaches them: Days 1–2 Lessons 1–2 · 3–5 Lessons 3–4 · 6 Lesson 5 · 7–9 Lesson 6 ·
//   10–12 Lesson 7 · 13–16 Lesson 8.
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
  // every lesson open for the batch: the trainer's own gate is wide open, so nothing but the trainee's
  // progress through the days decides what they can enter
  await put('settings:opendays', { all: [1, 2, 3, 4, 5, 6, 7, 8, 9], batches: {} });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);

  const openDays = () => page.evaluate(() => Array.from({ length: 16 }, (_, i) => i + 1).filter(n => FTDayDecks.dayOpen(n)));
  const cards = () => page.evaluate(() => [...document.querySelectorAll('.ftdd-daycard')].map(c => ({ id: c.id, locked: c.classList.contains('locked'),
    off: !!(c.querySelector('.ftdd-dc-main') || {}).disabled, lock: (c.querySelector('.ftdd-dc-ic') || {}).innerText === '🔒',
    sub: ((c.querySelector('.ftdd-dc-t small') || {}).innerText || ''), why: ((c.querySelector('.ftdd-dc-main') || {}).title || '') })));

  // a new trainee: the first block (Days 1–2, Lessons 1–2) and nothing else
  let days = await openDays();
  if (days.join() !== '1,2') fail(`a new trainee can open days ${days.join(', ')} (1, 2 expected — Lesson 1 runs over both)`);
  let cs = await cards();
  if (!cs.length) fail('the dashboard has no day cards');
  const future = cs.filter(c => /^dayd-(\d+)/.test(c.id) && Number(/^dayd-(\d+)/.exec(c.id)[1]) > 2);
  if (!future.length || future.some(c => !c.locked || !c.off || !c.lock)) fail(`a day further on isn't locked on its card: ${JSON.stringify(future.filter(c => !c.locked || !c.off || !c.lock).slice(0, 3))}`);
  const d3 = cs.find(c => c.id === 'dayd-3' || c.id === 'dayd-3-am') || {};
  if (!/opens (when you finish|once you have worked through)/.test(d3.why || '')) fail(`a locked card doesn't say what opens it: "${d3.why}"`);
  if (cs.filter(c => /^dayl-/.test(c.id)).every(c => c.locked)) fail('no lesson card is open to a new trainee');
  // the card itself says what opens it, not only its tooltip
  if (!/🔒 after /.test(d3.sub || '')) fail(`a locked card doesn't carry the gate on its face: "${d3.sub}"`);

  // the deck and the lesson of a day ahead stay shut, however the trainee gets to them
  await page.evaluate(() => FTDayDecks.open(4)); await page.waitForTimeout(600);
  let where = await page.evaluate(() => ({ view: state.view, t: (document.querySelector('.ftdd-dtitle') || {}).innerText || '' }));
  if (/^Day 4\b/.test(where.t)) fail('a trainee opened Day 4\'s deck before reaching it');
  await page.evaluate(() => goto('day', 6)); await page.waitForTimeout(900);
  where = await page.evaluate(() => ({ view: state.view, text: (document.querySelector('main') || {}).innerText || '' }));
  if (!/is locked/.test(where.text) || !/opens (when you finish|once you have worked through)/.test(where.text) || !/taught on Day 7/.test(where.text))
    fail(`the lesson of a day ahead doesn't open on a 🔒 page that says why: ${JSON.stringify(where.text.slice(0, 180))}`);
  await page.evaluate(() => goto('modules')); await page.waitForTimeout(1200);

  // block by block, as the guide teaches them: each lesson passed opens the days of the next lesson and no more
  const after = async (prog, want, what) => {
    await page.evaluate((prog) => { state.progress = {}; Object.keys(prog).forEach(l => state.progress[l] = prog[l]); render(); }, prog);
    await page.waitForTimeout(500);
    const got = (await openDays()).join(',');
    if (got !== want) fail(`${what}: the open days are ${got} (${want} expected)`);
  };
  const D = { done: true, studied: true, score: 100 };
  await after({ 1: D }, '1,2', 'Lesson 1 passed');
  await after({ 1: D, 2: D }, '1,2,3', 'Lessons 1–2 passed');
  await after({ 1: D, 2: D, 3: D }, '1,2,3,4,5', 'Lesson 3 passed (Lesson 4 runs over Days 3–5)');
  await after({ 1: D, 2: D, 3: D, 4: D }, '1,2,3,4,5,6', 'Lesson 4 passed');
  // Calendar Management (Lesson 5) has no Process Questions: studying it finishes it, so Day 6 doesn't hold
  // the programme up for ever
  await after({ 1: D, 2: D, 3: D, 4: D, 5: { studied: true } }, '1,2,3,4,5,6,7,8,9', 'Calendar Management studied');
  if (await page.evaluate(() => window.ftKcQuestions(5).length)) fail('Lesson 5 now has Process Questions: the studied-finishes-it rule needs rereading');
  await after({ 1: D, 2: D, 3: D, 4: D, 5: { studied: true }, 6: D }, '1,2,3,4,5,6,7,8,9,10,11,12', 'Lesson 6 passed');
  await after({ 1: D, 2: D, 3: D, 4: D, 5: { studied: true }, 6: D, 7: D }, '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16', 'Lesson 7 passed');
  await page.evaluate(() => { state.progress = {}; render(); }); await page.waitForTimeout(400);

  // a trainer, and a trainer in Trainee view, reads every day and every lesson
  for (const as of ['admin', 'preview']) {
    await page.evaluate((as) => { state.isAdmin = as === 'admin'; state.adminPreview = as === 'preview'; render(); }, as); await page.waitForTimeout(500);
    days = await openDays();
    if (days.length !== 16) fail(`as ${as} only ${days.length} of the 16 days open`);
    const locked = (await cards()).filter(c => c.locked || c.off);
    if (locked.length) fail(`as ${as} these cards are still locked: ${JSON.stringify(locked.map(c => c.id).slice(0, 4))}`);
    await page.evaluate(() => goto('day', 8)); await page.waitForTimeout(900);
    if (/is locked/.test(await page.evaluate(() => (document.querySelector('main') || {}).innerText || ''))) fail(`as ${as} a late lesson is locked`);
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(800);
  }
  await page.evaluate(() => { state.isAdmin = false; state.adminPreview = false; });

  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Gated curriculum test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Gated curriculum test passed (a trainee opens the days of the lesson they are on and the days behind them and no more — the cards further on locked with the lesson that opens them, their decks and lessons shut on a 🔒 page; each lesson passed opens the next lesson\'s days, block by block through the guide; a studied Calendar Management, which has no Process Questions, opens Days 7–9; a trainer and a trainer in Trainee view open all 16 days and every lesson).');
})().catch(e => { console.error(e); process.exit(1); });
