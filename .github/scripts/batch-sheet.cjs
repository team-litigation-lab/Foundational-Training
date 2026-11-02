// 📋 Batch Sheet (js/ft-batch-sheet.js), as a trainer: Admin → 🏅 Scorecard opens on it, with nothing to set up. Every trainee
//   registered in the batch is on it at once — approved or still waiting, with or without progress — in four tables on the
//   one page (👥 Trainees, 📚 Lessons, 🏅 Scores, 🕒 Recent progress); a trainee's lesson deck, Knowledge Check attempts,
//   practice in the tools, tests and Portal simulators come from what the platform already keeps; the page is wide; ⬇ Download
//   gives all four tables in one .csv.
// Usage: NODE_PATH=…/node_modules node .github/scripts/batch-sheet.cjs http://localhost:8787/
const { chromium } = require('playwright');
const fs = require('fs');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
// (a Batch ID is its first day, B + MMDDYY: one no other test uses)
const BATCH = 'B010225';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);

  // three trainees register in a new batch: Ada (approved, busy), Ben (approved, nothing done yet), Cy (waiting for approval)
  const ids = {};
  for (const [f, l] of [['Ada', 'Active'], ['Ben', 'Blank'], ['Cy', 'Waiting']]) {
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} state.traineeId = null; });
    await signIn(page, f, l, BATCH);
    const id = await page.evaluate(() => state.traineeId); ids[f] = id;
    const rec = await get('trainee:' + id); rec.approved = f !== 'Cy'; rec.archived = false; await put('trainee:' + id, rec);
  }
  const now = Date.now(), iso = ms => new Date(ms).toISOString();
  const lesson = await page.evaluate(() => DAYS[0].id);
  await put('progress:' + ids.Ada, { traineeId: ids.Ada, savedAt: iso(now - 60e3), data: {
    'day-progress': { [lesson]: { studied: true, studiedAt: iso(now - 3 * 3600e3), done: true, score: 90, date: iso(now - 2 * 3600e3), kcAttempts: 2,
      history: [{ score: 60, passed: false, date: iso(now - 2.5 * 3600e3) }, { score: 90, passed: true, date: iso(now - 2 * 3600e3) }] } },
    'slide-progress': { [lesson]: 5 },
    'work-log': [{ at: iso(now - 3600e3), kind: 'lab', label: 'Intake Practice', score: 82 }],
    'last-view': { view: 'day', dayId: lesson, at: now - 600e3 } } });
  await put('skills:' + ids.Ada, { typing: [{ id: 't1', at: iso(now - 5 * 3600e3), date: iso(now).slice(0, 10), slot: 'AM', net: 48, gross: 52, acc: 96 }], spelling: [] });
  await put('simresults:' + ids.Ada, { traineeId: ids.Ada, results: [{ simulator: 'Calendaring Activity', scenario: 'Week 1', score: 75, at: iso(now - 30 * 60e3) }] });

  // the trainer presses 🏅 Scorecard: it opens on the Batch Sheet
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'audit'; goto('admin'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.lp-admin-sec')].find(x => /Scorecard/.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(800);
  const tab = await page.evaluate(() => state.adminTab);
  if (tab !== 'batchsheet') fail(`🏅 Scorecard opens on "${tab}", not the Batch Sheet`);
  const row = await page.evaluate(() => [...document.querySelectorAll('.lp-admin-row .admin-tab-btn')].map(x => x.innerText.trim()));
  if (!/Batch Sheet/.test(row[0] || '')) fail(`the Batch Sheet isn't the first Scorecard tab: ${row.join(' | ')}`);
  await page.evaluate(b => FTBatchSheet.batch(b), BATCH);
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the sheet never finished loading'));
  await page.waitForTimeout(500);
  const T = await page.evaluate(() => FTBatchSheet.tables().map(t => ({ id: t.id, head: t.head, rows: t.rows.map(r => r.map(c => String(c.v))) })));
  const by = id => T.find(t => t.id === id) || { rows: [], head: [] };
  if (JSON.stringify(T.map(t => t.id)) !== JSON.stringify(['trainees', 'lessons', 'scores', 'recent'])) fail(`the tables are ${T.map(t => t.id)}`);
  if ((await page.$$('.bs-sec')).length !== 4) fail('the four tables are not all on the one page');

  // 👥 everyone registered, from the moment they register
  const tr = by('trainees').rows, names = tr.map(r => r[0]);
  if (tr.length !== 3) fail(`👥 Trainees has ${tr.length} rows: ${names}`);
  const cy = tr.find(r => /Cy/.test(r[0])), ben = tr.find(r => /Ben/.test(r[0])), ada = tr.find(r => /Ada/.test(r[0]));
  if (!cy || cy[1] !== 'Waiting for approval') fail(`a trainee waiting for approval isn't listed as such: ${cy}`);
  if (!ben || ben[1] !== 'Approved' || !ben[2]) fail(`a trainee with no progress isn't listed with their registration: ${ben}`);
  if (!ada || !/^1 \//.test(ada[4]) || !/^1 \//.test(ada[5]) || !/Lesson deck/.test(ada[6])) fail(`Ada's decks / Knowledge Checks / last opened: ${ada}`);

  // 📚 Ada's first lesson: deck finished, Knowledge Check 90%
  const ls = by('lessons').rows.find(r => /Ada/.test(r[0]));
  if (!ls || ls[1] !== 'Deck ✓ · Check 90%') fail(`📚 Lessons for Ada: ${ls && ls.slice(0, 2)}`);
  const lb = by('lessons').rows.find(r => /Ben/.test(r[0]));
  if (!lb || lb.slice(1).some(Boolean)) fail(`📚 Ben has done nothing, yet his row has: ${lb}`);

  // 🏅 the Scorecard's grading systems, Overall and Rank
  const sh = by('scores').head;
  if (sh[sh.length - 2] !== 'Overall' || sh[sh.length - 1] !== 'Rank' || sh.length < 5) fail(`🏅 Scores' columns: ${sh}`);

  // 🕒 Recent progress: newest first, every kind
  const rc = by('recent').rows, kinds = rc.map(r => r[2]);
  for (const k of ['Registered', 'Finished a lesson deck', 'Knowledge Check', 'Practice in a tool', 'Typing test', 'Simulator practice', 'Opened']) if (!kinds.includes(k)) fail(`🕒 Recent progress has no "${k}": ${kinds}`);
  if (kinds.filter(k => k === 'Knowledge Check').length !== 2) fail('🕒 each Knowledge Check attempt should be its own row');
  if (rc.filter(r => r[2] === 'Registered').length !== 3) fail('🕒 every registration should be listed');
  const evs = await page.evaluate(() => FTBatchSheet.events().map(x => +x.at));
  if (evs.some((t, i) => i && t > evs[i - 1])) fail('🕒 Recent progress is not newest first');

  // the page is wide, and a cell explains itself in the bar
  const wide = await page.evaluate(() => document.body.classList.contains('bs-wide') && getComputedStyle(document.querySelector('main')).maxWidth);
  if (wide !== 'none') fail(`the page isn't widened for the sheet: ${wide}`);
  await page.click('#bs-lessons td[data-c="1"]');
  if (!/90%.*2 attempts.*passed/.test(await page.inputValue('#bsBar'))) fail(`the bar doesn't explain the Knowledge Check cell: ${await page.inputValue('#bsBar')}`);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (sideways) fail('the page scrolls sideways');

  // ⬇ Download: one file with all four tables
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => FTBatchSheet.csv())]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  for (const h of ['"Trainees"', '"Lessons"', '"Scores"', '"Recent progress"', 'Waiting for approval']) if (!csv.includes(h)) fail(`the download has no ${h}`);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });

  // leaving it: back to the normal width
  await page.evaluate(() => { state.adminTab = 'ranking'; render(); });
  if (await page.evaluate(() => document.body.classList.contains('bs-wide'))) fail('the page stays wide after leaving the Batch Sheet');

  await browser.close();
  if (failures.length) { console.error('Batch Sheet test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Batch Sheet test passed (🏅 Scorecard opens on it; every registered trainee, waiting or with no progress, on one page in four tables; lessons, scores and recent progress from what the platform keeps; wide; one download).');
})().catch(e => { console.error(e); process.exit(1); });
