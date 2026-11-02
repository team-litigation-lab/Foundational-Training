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
  // 📁 Batch Folders and 💬 Trainee Feedback sit in 🏅 Scorecard now (no longer in 🛡 Admin Master Control), and the feedback stays
  if (!/Batch Folders/.test(row.join(' ')) || !/Trainee Feedback/.test(row.join(' '))) fail(`🏅 Scorecard has no 📁 Batch Folders / 💬 Trainee Feedback: ${row.join(' | ')}`);
  await put('tfeedback:keep-me', { id: 'keep-me', at: iso(now), dayId: 1, ratings: { lessons: 5 }, good: 'Kept after the move', improve: '', facilitator: '', anonymous: false, name: 'Ada Active', batch: BATCH, status: 'new' });
  await page.evaluate(() => { state.adminTab = 'tfeedback'; state.tfbAdmin = null; render(); }); await page.waitForTimeout(1500);
  const fbText = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/Kept after the move/.test(fbText)) fail('💬 Trainee Feedback no longer shows the saved feedback');
  const secOn = await page.evaluate(() => (document.querySelector('.lp-admin-sec.active') || {}).innerText || '');
  if (!/Scorecard/.test(secOn)) fail(`💬 Trainee Feedback opens under "${secOn}", not 🏅 Scorecard`);
  await page.evaluate(() => { state.adminTab = 'audit'; render(); }); await page.waitForTimeout(400);
  const adm = await page.evaluate(() => [...document.querySelectorAll('.lp-admin-row .admin-tab-btn')].map(x => x.innerText.trim()).join(' | '));
  if (/Batch Folders|Trainee Feedback/.test(adm)) fail(`🛡 Admin Master Control still lists them: ${adm}`);
  await page.evaluate(() => { state.adminTab = 'batchsheet'; render(); }); await page.waitForTimeout(400);
  await page.evaluate(b => FTBatchSheet.batch(b), BATCH);
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the sheet never finished loading'));
  await page.waitForTimeout(500);
  const T = await page.evaluate(() => FTBatchSheet.tables().map(t => ({ id: t.id, head: t.head, rows: t.rows.map(r => r.map(c => String(c.v))) })));
  const by = id => T.find(t => t.id === id) || { rows: [], head: [] };
  if (JSON.stringify(T.map(t => t.id)) !== JSON.stringify(['trainees', 'lessons', 'days', 'practice', 'scores', 'recent'])) fail(`the tables are ${T.map(t => t.id)}`);
  if ((await page.$$('.bs-sec')).length !== 6) fail('the six tables are not all on the one page');

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

  // 📅 Day by Day: a column per training day; Ada's Day 1 has the Knowledge Check ticked by itself; a trainer ticks a classroom activity
  const dd = by('days');
  if (dd.head.length !== 2 + await page.evaluate(() => FTDays.DAYS.length) || dd.head[2] !== 'Day 1') fail(`📅 Day by Day's columns: ${dd.head.slice(0, 4)}`);
  const autoKC = await page.evaluate(() => { const d1 = FTDays.of(1), it = d1.items.find(i => i.at === 'tool' && i.id === 'process'); return it ? it.t : ''; });
  if (autoKC && !(await page.evaluate(t => [...document.querySelectorAll('.bs-day')][0].innerText.includes(t), autoKC))) fail('Day 1\'s checklist misses its Knowledge Check');
  if (autoKC && !(await page.evaluate(t => { const l = [...document.querySelectorAll('.bs-day')][0].querySelectorAll('.bs-item'); const x = [...l].find(n => n.innerText.includes(t)); return x && x.querySelector('input').checked && /auto/.test(x.innerText); }, autoKC))) fail('Ada\'s passed Day 1 Knowledge Check is not ticked by itself');
  if (!(await page.$('.bs-ck-who select'))) fail('the trainer can\'t pick whose checklist to open');
  await page.selectOption('.bs-ck-who select', ids.Ada); await page.waitForTimeout(400);
  const roomT = await page.evaluate(() => (FTDays.of(1).items.find(i => i.at === 'room') || {}).t);
  const box = await page.evaluateHandle(t => [...[...document.querySelectorAll('.bs-day')][0].querySelectorAll('.bs-item')].find(n => n.innerText.includes(t)).querySelector('input'), roomT);
  await box.evaluate(b => b.click()); await page.waitForTimeout(1500);   // (the page redraws on the tick)
  const dc = await get('daycheck:' + ids.Ada);
  if (!dc || !dc.items || !dc.items['1|' + roomT] || !dc.items['1|' + roomT].done) fail(`a trainer's tick wasn't saved: ${JSON.stringify(dc)}`);
  const d1 = (await page.evaluate(() => FTBatchSheet.tables().find(t => t.id === 'days').rows.find(r => /Ada/.test(r[0].v))))[2].v;
  if (!/^[2-9]\d*\//.test(d1.replace('✓ ', ''))) fail(`Ada's Day 1 count doesn't include the ticks: ${d1}`);

  // 🛠 Practice Lab: Ada practised in a tool (82%) and took a typing test; Ben hasn't practised
  const pl = by('practice'), pa = pl.rows.find(r => /Ada/.test(r[0])), pb = pl.rows.find(r => /Ben/.test(r[0]));
  if (JSON.stringify(pl.head.slice(0, 4)) !== JSON.stringify(['Trainee', 'Tools used', 'Attempts', 'Last practice'])) fail(`🛠 Practice Lab's columns: ${pl.head.slice(0, 4)}`);
  const aiCol = pl.head.findIndex(h => /AI-graded/.test(h));
  if (!pa || !/^[1-9]\d* \//.test(pa[1]) || !(Number(pa[2]) >= 2) || /Not yet/.test(pa[3]) || pa[aiCol] !== '1 · 82%') fail(`🛠 Practice Lab for Ada: ${pa}`);
  if (!pb || !/^0 \//.test(pb[1]) || pb[3] !== 'Not yet') fail(`🛠 Practice Lab for Ben, who hasn't practised: ${pb}`);
  // a time, not "just now"
  if (/ago|just now/.test(tr.map(r => r[3]).join(' ')) || !/\d{1,2}:\d{2}/.test(ada[3])) fail(`"Last on the platform" isn't a date and time: ${tr.map(r => r[3])}`);

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
  for (const h of ['"Trainees"', '"Lessons"', '"Practice Lab"', '"Scores"', '"Recent progress"', 'Waiting for approval']) if (!csv.includes(h)) fail(`the download has no ${h}`);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: true });

  // ✏️ Fix the batch name: Dee registered under a mistyped batch ("B03101"); the trainer moves her into the right one
  // (registration refuses a batch like that; one reaches the platform from elsewhere, e.g. the Portal's ticket: put here as it is kept)
  const dee = 'dee-glitch--b03101';
  await put('trainee:' + dee, { id: dee, name: 'Dee Glitch', firstName: 'Dee', lastName: 'Glitch', batch: 'B03101', approved: true, registeredAt: iso(now - 864e5), lastActive: iso(now - 3600e3), dayProgress: {} });
  if ((await get('trainee:' + dee)).batch !== 'B03101') fail('the test could not register a trainee under a mistyped batch');
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'batchsheet'; FTBatchSheet.refresh(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => FTBatchSheet.batch('B03101')); await page.waitForTimeout(1500);
  if (!(await page.$('.bs-warn'))) fail('a batch name that isn\'t a Batch ID gets no warning');
  await page.evaluate(() => FTBatchSheet.fixOpen()); await page.waitForTimeout(200);
  if ((await page.$$('.bs-fix-list input:checked')).length !== 1) fail('✏️ Fix the batch name doesn\'t tick the batch\'s trainees');
  await page.fill('#bsFixTo', 'not a batch'); await page.evaluate(() => FTBatchSheet.fixSave()); await page.waitForTimeout(300);
  if (!(await page.$('.bs-fix-err'))) fail('a wrong Batch ID is not refused');
  if ((await get('trainee:' + dee)).batch !== 'B03101') fail('a refused move still moved the trainee');
  await page.fill('#bsFixTo', BATCH.toLowerCase()); await page.evaluate(() => FTBatchSheet.fixSave());
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
  const moved = await get('trainee:' + dee);
  if (moved.batch !== BATCH || moved.batchFrom !== 'B03101' || moved.batchMovedBy !== 'trainer') fail(`the move: ${JSON.stringify({ batch: moved.batch, from: moved.batchFrom, by: moved.batchMovedBy })}`);
  // (the tidy-up took B03101 for the newest batch and archived this one: the sheet offers them back)
  if (await page.$('.bs-back')) { await page.evaluate(() => FTBatchSheet.bringBack()); await page.waitForTimeout(400);
    await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800); }
  if (await page.$('.bs-back')) fail('↩ Bring them back left trainees archived');
  const after = await page.evaluate(() => FTBatchSheet.tables().find(t => t.id === 'trainees').rows.map(r => r[0].v));
  if (await page.evaluate(() => document.querySelector('.gs-batch select').value) !== BATCH || !after.some(n => /Dee/.test(n)) || after.length !== 4) fail(`after the move the sheet shows ${after}`);
  // her open tab still holds the old batch: its next save keeps the trainer's batch
  await page.evaluate(async id => { state.isAdmin = false; state.traineeId = id; state.traineeName = 'Dee Glitch'; state.traineeBatch = 'B03101'; await syncToLedger(); }, dee);
  await page.waitForTimeout(500);
  if ((await get('trainee:' + dee)).batch !== BATCH) fail('the trainee\'s open tab wrote the old batch back');
  if ((await get('trainee:' + dee)).name !== 'Dee Glitch') fail('the open tab\'s save changed the trainee\'s name');
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminTab = 'batchsheet'; render(); });

  // ✎ Fix a date: Ben's registration was recorded wrong; the trainer sets it, and the sheet marks it
  await page.evaluate(() => FTBatchSheet.dateOpen()); await page.waitForTimeout(200);
  await page.selectOption('#bsDateWho', ids.Ben); await page.waitForTimeout(200);
  await page.fill('#bsDateAt', '2026-10-30T08:30'); await page.evaluate(() => FTBatchSheet.dateSave());
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800);
  const benRec = await get('trainee:' + ids.Ben);
  if (!benRec.registeredAt || new Date(benRec.registeredAt).getDate() !== 30 || !benRec.registeredAtFixedAt || !benRec.registeredAtWas) fail(`✎ Fix a date: ${JSON.stringify({ at: benRec.registeredAt, fixed: benRec.registeredAtFixedAt, was: benRec.registeredAtWas })}`);
  const benRow = await page.evaluate(id => FTBatchSheet.tables().find(t => t.id === 'trainees').rows.find(r => /Ben/.test(r[0].v)), ids.Ben);
  if (!benRow || !/Oct 30, 2026/.test(benRow[2].v) || !/✎/.test(benRow[2].v) || !/fixed by a trainer/.test(benRow[2].f)) fail(`the fixed date isn't shown and marked: ${benRow && JSON.stringify(benRow[2])}`);
  await page.fill('#bsDateAt', '').catch(() => {});

  // 🔒 the trainee's side: Ada's 📋 My Progress is her own row and nothing about anyone else
  await page.evaluate(id => { state.isAdmin = false; state.adminPreview = false; state.traineeId = id; state.traineeName = 'Ada Active'; state.view = 'modules'; render(); }, ids.Ada);
  await page.waitForTimeout(400);
  const bar = await page.evaluate(() => [...document.querySelectorAll('.topbar .nav > *')].map(x => x.innerText.trim()).join(' | '));
  if (!/My Progress/.test(bar)) fail(`a trainee's top bar has no 📋 My Progress: ${bar}`);
  await page.evaluate(() => goto('mysheet'));
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('My Progress never finished loading'));
  await page.waitForTimeout(400);
  const MT = await page.evaluate(() => FTBatchSheet.tables().map(t => ({ id: t.id, title: t.title, head: t.head, names: [...new Set(t.rows.map(r => r[t.id === 'recent' ? 1 : 0].v))] })));
  if (MT[0].title !== '👤 Me') fail(`the trainee's first table is ${MT[0].title}`);
  // her own checklist, read only, with the trainer's tick on it
  if (!(await page.$('.bs-mine .bs-ck h4')) || await page.$('.bs-mine .bs-ck-who')) fail('the trainee doesn\'t get her own checklist, or gets the trainer\'s picker');
  if (await page.$('.bs-mine .bs-item input:not([disabled])')) fail('a trainee can tick her own checklist');
  if (!(await page.evaluate(() => [...document.querySelectorAll('.bs-mine .bs-item.is-done')].some(n => /trainer/.test(n.innerText))))) fail('the trainee doesn\'t see the trainer\'s tick');
  for (const x of MT) if (x.names.some(n => n && !/Ada/.test(n))) fail(`📋 My Progress (${x.id}) shows someone else: ${x.names}`);
  if (MT.find(x => x.id === 'scores').head.includes('Rank')) fail('a trainee sees the batch rank column');
  const text = await page.evaluate(() => document.querySelector('.bs-mine').innerText);
  if (/Ben Blank|Cy Waiting|Dee Glitch/.test(text)) fail('another trainee\'s name is on the trainee\'s page');
  if (await page.$('.bs-mine .gs-batch select, .bs-mine .bs-fix, .bs-mine .bs-back')) fail('a trainee has the batch picker or a trainer\'s tool');
  if (/Fix the batch name|Bring them back/.test(text)) fail('a trainee sees a trainer\'s tool');
  if (!(await page.evaluate(() => document.body.classList.contains('bs-wide')))) fail('My Progress is not full width');
  // a trainer's actions do nothing for a trainee
  await page.evaluate(() => { FTBatchSheet.fixOpen(); FTBatchSheet.batch('B03101'); });
  if (await page.$('.bs-fix')) fail('a trainee opened ✏️ Fix the batch name');
  // and #/mysheet is a trainee's only: a trainer is sent to the Dashboard
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; goto('mysheet'); });
  await page.waitForTimeout(400);
  if (await page.evaluate(() => state.view) === 'mysheet') fail('a trainer stays on a trainee\'s My Progress');
  await page.evaluate(() => { state.adminTab = 'batchsheet'; goto('admin'); });
  await page.waitForTimeout(600);

  // leaving it: back to the normal width
  await page.evaluate(() => { state.adminTab = 'ranking'; render(); });
  if (await page.evaluate(() => document.body.classList.contains('bs-wide'))) fail('the page stays wide after leaving the Batch Sheet');

  await browser.close();
  if (failures.length) { console.error('Batch Sheet test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Batch Sheet test passed (🏅 Scorecard opens on it; every registered trainee, waiting or with no progress, on one page in six tables; lessons, Practice Lab use, scores and recent progress, with dates and times from what the platform keeps; wide; one download; ✏️ Fix the batch name moves trainees from a mistyped batch, and an open tab cannot move them back; 📅 Day by Day with the platform\'s own ticks and the trainer\'s; 📋 My Progress, a trainee\'s own row and no one else\'s, with no trainer tools).');
})().catch(e => { console.error(e); process.exit(1); });
