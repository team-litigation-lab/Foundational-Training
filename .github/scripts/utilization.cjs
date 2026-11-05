// 📈 Practice Lab Utilization & Eagerness to Learn (js/ft-utilization.js), on Admin → 🟢 Practice Sessions: worked out
//   from the history the platform already keeps (back to the day they registered): the work log, the tests, the
//   simulators, the Practice Sessions, the tools' own records, the lesson decks and the Knowledge Checks — not the
//   trainer's reviews. An eager trainee (every day, more practice, again, getting better) ranks over an idle one, the
//   idle one is named under ⚠ Check in with, the day strip goes back to the first day, and a click opens the history.
// Usage: NODE_PATH=…/node_modules node .github/scripts/utilization.cjs http://localhost:8787/
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, v) => page.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  try {
    await page.goto(BASE); await page.waitForFunction(() => typeof FTUtil === 'object', null, { timeout: 20000 });
    // the 6 weekdays before today, at 10:00 local
    const days = await page.evaluate(() => { const out = [], c = new Date(); c.setDate(c.getDate() - 1); c.setHours(10, 0, 0, 0); while(out.length < 6){ if(c.getDay() % 6) out.unshift(c.toISOString()); c.setDate(c.getDate() - 1); } return out; });
    const reg = new Date(new Date(days[0]).getTime() - 3600000).toISOString();
    const B = 'B110226';
    const P = [['eve-eager--b110226', 'Eve Eager'], ['ian-idle--b110226', 'Ian Idle']];
    for (const [id, name] of P) await put('trainee:' + id, { id, name, batch: B, approved: true, registeredAt: reg });
    // Eve: something every day — AI practice tools (again, getting better), a typing test, a lesson deck and its Knowledge Check
    const wl = days.flatMap((d, i) => [{ at: d, kind: 'lab', toolId: 'intake', label: 'Intake practice', score: 60 + i * 6 }]);
    await put('progress:' + P[0][0], { data: { 'work-log': wl.concat([{ at: days[1], kind: 'task', label: 'Random Task · Lesson 2 (missed)', score: 0 }]),
      'day-progress': { 1: { studiedAt: days[0], done: true, score: 90, history: [{ date: days[0], score: 60 }, { date: days[1], score: 90 }] } } } });
    await put('skills:' + P[0][0], { typing: [{ at: days[2], net: 48 }], spelling: [] });
    await put('calsim:' + P[0][0], { drafts: { w1: [{ id: 'e1', title: 'Deposition', date: '2026-07-06' }, { id: 'e2', title: 'Hearing', date: '2026-07-07T09:00:00' }] }, submissions: [{ at: days[3], scn: 'w1', auto: { pct: 70 } }], reviews: { 'w1|x': { at: days[4], score: 80 } } });
    // (a draft calendar's events are scheduled days, not attempts; the 📅 Calendaring Activity's submission is one)
    await put('calweek:' + P[0][0], { v: 1, events: [{ task: 1, title: 'x', d: 1 }], savedAt: days[4], submittedAt: days[4], pct: 80, done: true });
    await put('sessions:' + P[0][0], { runs: { 'reception|-': { startedAt: days[5], submittedAt: days[5], attempts: 1, auto: { pct: 85 } } } });
    // Ian: one tool once, on the first day
    await put('progress:' + P[1][0], { data: { 'work-log': [{ at: days[0], kind: 'lab', label: 'Intake practice', score: 50 }] } });
    // a trainer's review on Ian's record is not his activity
    await put('labreview:' + P[1][0], { acts: { x: { status: 'Passed', at: days[5] } } });

    await page.evaluate(b => { state.isAdmin = true; state.adminTab = 'sessions'; goto('admin'); }, B);
    await page.waitForFunction(() => document.querySelector('.ut-card'), null, { timeout: 20000 });
    await page.evaluate(b => FTSessionsAdmin.batch(b), B);
    await page.waitForFunction(() => document.querySelectorAll('.ut-row').length === 2, null, { timeout: 20000 });
    const rows = await page.evaluate(() => [...document.querySelectorAll('.ut-row')].map(r => [...r.children].map(c => c.innerText.trim())));
    const head = await page.evaluate(() => [...document.querySelectorAll('.ut-tbl thead th')].map(t => t.innerText.trim()));
    const col = n => head.findIndex(h => h.includes(n));
    if (!/Eve Eager/.test(rows[0][0]) || !/Ian Idle/.test(rows[1][0])) fail(`the eager trainee isn't ranked first: ${rows.map(r => r[0])}`);
    const eag = r => Number((r[col('Eagerness')].match(/(\d+)$/) || [])[1]);
    if (!(eag(rows[0]) >= 75)) fail(`Eve isn't 🔥 Very eager: ${rows[0][col('Eagerness')]}`);
    if (!(eag(rows[1]) < 50)) fail(`Ian isn't below 50: ${rows[1][col('Eagerness')]}`);
    if (!/^6 \/ [67]$/.test(rows[0][col('Active days')])) fail(`Eve's active days (back to registration): ${rows[0][col('Active days')]}`);
    if (!/^1 \/ [67]$/.test(rows[1][col('Active days')])) fail(`Ian's active days (the trainer's review counted?): ${rows[1][col('Active days')]}`);
    // Eve: 6 AI practice + typing + calsim submission + Calendaring Activity + session = 10 (the missed task, the calendar
    // drafts and the trainer's review not counted)
    if (rows[0][col('Practice attempts')] !== '10') fail(`Eve's practice attempts: ${rows[0][col('Practice attempts')]}`);
    if (rows[0][col('Tools used')] !== '5 / 13') fail(`Eve's tools used: ${rows[0][col('Tools used')]}`);
    if (rows[0][col('Practiced again')] !== '5') fail(`Eve's practiced again: ${rows[0][col('Practiced again')]}`);
    if (!/\+30/.test(rows[0][col('Getting better')])) fail(`Eve's improvement: ${rows[0][col('Getting better')]}`);
    if (rows[0][col('Decks')] !== '1 · 2') fail(`Eve's decks · KC tries: ${rows[0][col('Decks')]}`);
    // the day strip back to the first day
    const strip = await page.evaluate(() => [...document.querySelectorAll('.ut-row')[0].querySelectorAll('.ut-day')].map(c => c.innerText.trim()));
    if (strip.filter(Boolean).length < 6) fail(`Eve's day strip isn't filled back to the first day: ${strip}`);
    const nudge = await page.evaluate(() => (document.querySelector('.ut-nudge') || {}).innerText || '');
    if (!/Ian Idle/.test(nudge) || /Eve/.test(nudge)) fail(`⚠ Check in with doesn't name the idle trainee only: ${nudge}`);
    // the history on a click
    await page.click('.ut-row >> nth=0'); await page.waitForTimeout(400);
    const hist = await page.evaluate(() => (document.querySelector('.ut-hist') || {}).textContent || '');
    if (!/Intake practice/.test(hist) || !/Knowledge Check/.test(hist) || !/Eagerness \d+/.test(hist)) fail(`the history doesn't open: ${hist.slice(0, 200)}`);
    if (/missed/.test(hist)) fail('a missed random task is in the history as practice');
  } catch (err) { fail(String(err && err.stack || err)); }
  await browser.close();
  if (failures.length) { console.error('Utilization test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Utilization test passed (utilization and eagerness from the history back to registration, the eager trainee first, the idle one to check in with, the trainer\'s reviews not counted, the day strip, the history on a click).');
})();
