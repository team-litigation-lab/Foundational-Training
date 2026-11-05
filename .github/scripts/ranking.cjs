// 📊 Weekly Ranking Report (js/ft-ranking.js), as a trainer: Admin → 🏅 Scorecard → 📊 Weekly Ranking for a batch's week —
//   started from the 📋 Week 1 columns (the compliance column, marks out of 5 and activities on their own points), a score
//   typed into the table is converted to a mark out of 5 in place, the final average is the average of the marks, the
//   trainees are ranked by it (an unscored trainee has no rank), saved in ranking:<batch>:w1; ⬇ Word is the facilitator's
//   format ("<BATCH> RANKING REPORT WEEK 1", the columns, ranked); Week 2 starts from Week 1's columns; nothing about a
//   trainee comes with the format.
//   The sheet looks like Excel (column letters, row numbers, the ÷ 5 cells and the formula bar); ⬇ Excel is a real .xlsx.
// Usage: NODE_PATH=…/node_modules node .github/scripts/ranking.cjs http://localhost:8787/
const { chromium } = require('playwright');
const fs = require('fs');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
// (a batch that starts today, Pacific time: its Week 1 is the week now and not over, so nothing drafts itself; a Batch ID is
// its first day, B + MMDDYY)
const ptParts = ms => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
const bid = ms => { const p = ptParts(ms); return `B${p.month}${p.day}${p.year}`; };
const BATCH = bid(Date.now());
// (and one that started three weeks ago: its Week 1 is over, so its report drafts itself)
const PAST = bid(Date.now() - 21 * 864e5);
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  // three trainees in a batch of their own
  const ids = {};
  for (const [f, l] of [['Rhea', 'Rank'], ['Sam', 'Second'], ['Tom', 'Unscored']]) {
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} state.traineeId = null; });
    await signIn(page, f, l, BATCH);
    const id = await page.evaluate(() => state.traineeId); ids[f] = id;
    const rec = await get('trainee:' + id); rec.approved = true; rec.archived = false; await put('trainee:' + id, rec);
  }
  for (const w of [1, 2]) await put(`ranking:${BATCH}:w${w}`, null);

  // the trainer opens the tab
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'ranking'; FTRanking.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  // (no tab of its own: the report is in 📋 Batch Sheet, under 📅 Day 1–16: Detailed Scores; the old tab lands there)
  if (!(await page.$('#bs-ranking .rk'))) fail('the 📊 Weekly Ranking is not in the 📋 Batch Sheet');
  if (await page.evaluate(() => state.adminTab) !== 'batchsheet') fail('the old 📊 Weekly Ranking tab doesn\'t land on the 📋 Batch Sheet');
  const tabs = await page.evaluate(() => (document.querySelector('.lp-admin-row') || {}).innerText || '');
  if (!/Batch Sheet/.test(tabs) || /Weekly Ranking/.test(tabs)) fail(`🏅 Scorecard still has a 📊 Weekly Ranking tab: ${tabs}`);
  await page.evaluate(b => FTRanking.batch(b), BATCH); await page.waitForTimeout(1500);
  if (!/hasn.t been started/.test(await page.evaluate(() => document.querySelector('.rk').innerText))) fail('a new week doesn\'t offer to start the report');
  await page.evaluate(() => FTRanking.start('week1')); await page.waitForTimeout(800);
  // 🔗 connected to every scorecard: the Daily Compliance, the Drive links' compliance and 🏅 the Scorecard's overall, at the end
  const conn = await page.evaluate(() => [...document.querySelectorAll('.xl-head th')].map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  for (const c of ['Daily Compliance (5/5)', 'Drive Links Compliance (5/5)', '🏅 Scorecard overall (5/5) every grading system']) if (!conn.includes(c)) fail(`the report isn't connected to "${c}": ${JSON.stringify(conn)}`);
  // (the sheet's own arithmetic below is on the Week 1 columns alone: the three connected ones taken off again)
  for (let k = 0; k < 3; k++) { await page.evaluate(() => FTRanking.delCol(8)); await page.waitForTimeout(250); }
  await page.evaluate(() => FTRanking.toggleEdit()); await page.waitForTimeout(300);
  const heads = await page.$$eval('.xl-head th', t => t.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  const want = ['2', 'Trainee Name', 'Spelling & Typing Tests', 'Monitoring Sheet (5/5)', 'Tracker (5/5)', 'PI Reading Task (40/40)', 'PI Reading Task ÷ 5', 'Ass: Common Terms (27/27)', 'Ass: Common Terms ÷ 5',
    'Ass: Auto Liability Insurance (45/45)', 'Ass: Auto Liability Insurance ÷ 5', 'RC: Data Extraction (125/125)', 'RC: Data Extraction ÷ 5', 'Reception Mock Calls (5/5)', 'W1 Final Average', 'Rank', '🤖 AI summary of the week', 'Additional Notes'];
  if (JSON.stringify(heads) !== JSON.stringify(want)) fail(`the Week 1 columns are ${JSON.stringify(heads)}`);
  const letters = await page.$$eval('.xl-letters th', t => t.map(x => x.innerText.trim()).join(''));
  if (letters !== 'ABCDEFGHIJKLMNOPQ') fail(`the sheet's column letters are ${letters}`);
  // ▾/▸ retractable: Collapse all folds the points columns and notes away (the marks out of 5, the average and the rank stay);
  // Expand all brings them back
  await page.evaluate(() => FTRanking.foldAll()); await page.waitForTimeout(300);
  const fold = await page.$$eval('.xl-head th', t => t.map(x => (x.classList.contains('xl-folded') ? '·' : '') + (x.getAttribute('title') || x.innerText).replace(/\s+/g, ' ').trim()));
  if (!fold.some(h => h === '·PI Reading Task (40/40)') || fold.some(h => h === '·PI Reading Task ÷ 5' || h === '·W1 Final Average' || h === '·Rank')) fail(`Collapse all: ${JSON.stringify(fold)}`);
  await page.evaluate(() => FTRanking.foldAll()); await page.waitForTimeout(300);
  if (await page.$('.xl-head th.xl-folded')) fail('Expand all left a column folded');
  const empty = await page.$$eval('.xl .xl-num', t => t.filter(x => x.value).length);
  if (empty) fail('the report came with scores already in it');

  // scores: typed into the table for Rhea (the cursor stays in the table), through the page's own handler for Sam
  const nRows = await page.$$eval('.xl tr.xl-row', t => t.length);
  if (nRows !== 3) fail(`the report lists ${nRows} trainees, not the batch's 3`);
  const rowOf = name => page.locator('.xl tr.xl-row', { hasText: name });
  const rhea = rowOf('Rhea Rank'), scores = ['4', '5', '30', '27', '36', '100', '4.5'];
  const inputs = rhea.locator('.xl-num');
  for (let i = 0; i < scores.length; i++) { await inputs.nth(i).fill(scores[i]); await inputs.nth(i).press('Tab'); await page.waitForTimeout(80); }
  const marks = await rhea.locator('.rk-mark').allInnerTexts();
  if (marks.join(' ') !== '3.75 5.00 4.00 4.00') fail(`Rhea's points weren't turned into marks out of 5: ${JSON.stringify(marks)}`);
  if ((await rhea.locator('.rk-avg').innerText()) !== '4.32') fail(`Rhea's final average is ${await rhea.locator('.rk-avg').innerText()} (4.32 expected: 30.25 ÷ 7)`);
  // the formula bar: a worked-out cell shows its formula; a score takes its note there
  await rhea.locator('.rk-avg').click();
  if (!/^=IFERROR\(AVERAGE\(C\d+,D\d+,F\d+,H\d+,J\d+,L\d+,M\d+\)/.test(await page.inputValue('#xlBar'))) fail(`the bar doesn't show the average's formula: ${await page.inputValue('#xlBar')}`);
  await inputs.nth(1).click(); await page.fill('#xlBar', 'Initial feedback implemented.'); await page.press('#xlBar', 'Enter'); await page.waitForTimeout(300);
  if (!(await rhea.locator('td.has-note').count())) fail('a score\'s note from the bar isn\'t marked on the cell');
  // Enter goes to the trainee below, as in Excel
  await inputs.nth(0).click(); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  if (await page.evaluate(() => (document.activeElement || {}).getAttribute && document.activeElement.getAttribute('data-ref')) !== 'C4') fail(`Enter didn't move to the cell below: ${await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-ref'))}`);
  await page.fill('.xl tr.xl-row:has-text("Rhea Rank") textarea >> nth=0', 'Complete');
  await page.press('.xl tr.xl-row:has-text("Rhea Rank") textarea >> nth=0', 'Tab');
  await page.evaluate(id => { const r = [...document.querySelectorAll('.xl tr.xl-row')].find(t => /Sam Second/.test(t.innerText)); const ins = r.querySelectorAll('.xl-num');
    ['3', '3'].forEach((v, i) => { ins[i].value = v; ins[i].dispatchEvent(new Event('change')); }); }, ids.Sam);
  await page.waitForTimeout(1200);
  const rep = await page.evaluate(() => FTRanking.report());
  const order = rep.ranked.map(x => `${x.name}:${x.avg}:${x.rank}`).join(', ');
  if (order !== 'Rhea Rank:4.32:1, Sam Second:3.00:2, Tom Unscored:null:null') fail(`the ranking is ${order}`);
  if (rep.title !== `${BATCH} RANKING REPORT WEEK 1`) fail(`the report is titled ${rep.title}`);
  await page.waitForTimeout(900);
  const saved = await get(`ranking:${BATCH}:w1`);
  const rr = saved && saved.rows && saved.rows[ids.Rhea];
  if (!rr || Object.values(rr.cells).filter(c => c.raw).length !== 7 || !Object.values(rr.cells).some(c => c.note === 'Complete') || !Object.values(rr.cells).some(c => c.raw === '5' && c.note === 'Initial feedback implemented.')) fail(`the report wasn't saved: ${JSON.stringify(saved && saved.rows)}`);

  // ⬇ Word: the facilitator's format, ranked
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => FTRanking.download())]);
  if (dl.suggestedFilename() !== `${BATCH} RANKING REPORT WEEK 1.doc`) fail(`the Word file is named ${dl.suggestedFilename()}`);
  const doc = fs.readFileSync(await dl.path(), 'utf8');
  for (const t of ['Trainee Name', 'W1 Final Average', 'Additional Notes', '30/40', '3.75/5', '4.32/5', 'mso-page-orientation:landscape'])
    if (!doc.includes(t)) fail(`the Word file has no "${t}"`);
  if (!(doc.indexOf('Rhea Rank') > 0 && doc.indexOf('Rhea Rank') < doc.indexOf('Sam Second') && doc.indexOf('Sam Second') < doc.indexOf('Tom Unscored'))) fail('the Word file isn\'t in rank order');

  // ⬇ Excel: a real .xlsx (a zip of the sheet), the formulas live, ranked
  const [xl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => FTRanking.excel())]);
  if (xl.suggestedFilename() !== `${BATCH} RANKING REPORT WEEK 1.xlsx`) fail(`the Excel file is named ${xl.suggestedFilename()}`);
  const xb = fs.readFileSync(await xl.path()), xs = xb.toString('latin1');
  if (xb.readUInt32LE(0) !== 0x04034b50 || !xs.includes('xl/worksheets/sheet1.xml')) fail('the Excel file is not an .xlsx');
  for (const t of ['<f>IF(E3=&quot;&quot;,&quot;&quot;,E3/40*5)</f>', '<f>IFERROR(AVERAGE(C3,D3,F3,H3,J3,L3,M3),&quot;&quot;)</f>', 'RANK(N3,$N$3:$N$5)', 'fullCalcOnLoad="1"', 'state="frozen"', 'Notes on the scores'])
    if (!xs.includes(t)) fail(`the Excel file has no ${t}`);
  if (!(xs.indexOf('Rhea Rank') < xs.indexOf('Sam Second') && xs.indexOf('Sam Second') < xs.indexOf('Tom Unscored'))) fail('the Excel file isn\'t in rank order');
  // 📤 share: each trainee gets their own row (rankshare:<id>)
  await page.evaluate(() => FTRanking.share(document.querySelector('button[onclick^="FTRanking.share"]'))); await page.waitForTimeout(2000);
  const sh = (((await get('rankshare:' + ids.Rhea)) || {}).weeks || {})[`${BATCH}|1`];
  if (!sh || sh.avg !== 4.32 || sh.rank !== 1 || sh.of !== 2 || !sh.cols.some(c => c.label === 'PI Reading Task' && c.raw === '30' && c.mark === 3.75)) fail(`📤 Share didn't give Rhea her row: ${JSON.stringify(sh)}`);
  const shT = (((await get('rankshare:' + ids.Tom)) || {}).weeks || {})[`${BATCH}|1`];
  if (!shT || shT.rank !== null || JSON.stringify(shT).includes('Rhea')) fail(`a trainee's shared row carries someone else's: ${JSON.stringify(shT)}`);
  if (process.env.SAVE_XLSX) fs.copyFileSync(await xl.path(), process.env.SAVE_XLSX);

  // 🧑‍🏫 Trainer Inputs: the Reception Mock Call's scorecard from the Training Guide (14 criteria, a feedback note each)
  await page.evaluate(() => { state.adminTab = 'trainerinputs'; render(); }); await page.waitForTimeout(2500);
  await page.evaluate(b => FTSessionsAdmin.batch(b), BATCH); await page.waitForTimeout(500);   // the batch that sorts last may be another test's
  await page.evaluate(id => FTInputs.cell(id, 'reception-live'), ids.Sam); await page.waitForTimeout(600);
  const crit = await page.$$eval('.ti-rub-tbl tbody tr:not(.ti-rub-avg) td:first-child', t => t.map(x => x.innerText));
  if (crit.length !== 15 || crit[0] !== 'Introduction of Law Firm and Name' || crit[13] !== 'Tone of Voice' || crit[14] !== 'Writing: Grammar, Spelling & Format') fail(`the Reception Mock Call scorecard isn't the Training Guide's: ${JSON.stringify(crit)}`);
  if (!(await page.$('.ti-rub-tbl input[data-fb="0"]'))) fail('the mock call scorecard has no feedback column');
  for (let i = 0; i < 14; i++) await page.fill(`.ti-rub-tbl input[data-crit="${i}"]`, i < 2 ? '5' : '4');
  await page.fill('.ti-rub-tbl input[data-fb="7"]', 'Resolved the caller’s concern but missed the claim number.');
  if ((await page.innerText('[data-avg]')) !== '4.14/5' || (await page.inputValue('.fss-cellform [data-score]')) !== '83') fail(`the scorecard's weighted average isn't the score: ${await page.innerText('[data-avg]')} → ${await page.inputValue('.fss-cellform [data-score]')}%`);
  await page.selectOption('.fss-cellform [data-status]', 'Passed');
  await page.click('.fss-cellform >> text=Save'); await page.waitForTimeout(1500);
  const lr = ((await get('labreview:' + ids.Sam)) || {}).acts || {};
  const rec = lr['reception-live'] || {};
  if (rec.score !== 83 || !rec.rubric || rec.rubric.key !== 'reception' || rec.rubric.avg !== 4.14 || rec.rubric.scores.length !== 15 || !/claim number/.test(rec.rubric.feedback[7])) fail(`the scorecard wasn't saved: ${JSON.stringify(rec)}`);
  // the Day 18 demo has its scorecard too
  await page.evaluate(id => FTInputs.cell(id, 'settlement-demo'), ids.Sam); await page.waitForTimeout(500);
  if (!/REDUCTION \/ CLOSING & SETTLEMENT DEMO/.test(await page.evaluate(() => (document.querySelector('.ti-rub-tbl th') || {}).innerText || ''))) fail('the Reduction / Closing & Settlement Demo has no scorecard in Trainer Inputs');
  await page.evaluate(() => FTInputs.cell()); 

  // ⤓ fill: Sam's Reception Mock Calls from that scorecard, its own weighted average (4.14/5, as the trainee's card reads, not
  // 83% turned back into 4.15); Rhea's typed scores untouched
  await page.evaluate(() => { state.adminTab = 'ranking'; render(); }); await page.waitForTimeout(800);
  await page.evaluate(() => FTRanking.fill()); await page.waitForTimeout(2500);
  if ((await rowOf('Rhea Rank').locator('.rk-avg').innerText()) !== '4.32') fail('⤓ Fill changed a score the trainer typed');
  const samRec = await rowOf('Sam Second').locator('.xl-num').nth(6).inputValue();
  if (samRec !== '4.14') fail(`⤓ Fill didn't take Sam's Reception Mock Calls from the trainer's scorecard: ${JSON.stringify(samRec)}`);
  if ((await rowOf('Sam Second').locator('.rk-avg').innerText()) !== '3.38') fail(`Sam's average after the fill is ${await rowOf('Sam Second').locator('.rk-avg').innerText()} (3.38 expected)`);

  // Week 2 starts from Week 1's columns, with no scores
  await page.evaluate(() => FTRanking.week(2)); await page.waitForTimeout(1200);
  await page.evaluate(() => FTRanking.start('last')); await page.waitForTimeout(800);
  const h2 = await page.$$eval('.xl-head th', t => t.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  if (h2.length !== want.length + 3 || !h2.includes('W2 Final Average') || !h2.includes('Drive Links Compliance (5/5)')) fail(`Week 2 didn't start from Week 1's columns: ${JSON.stringify(h2)}`);
  if (await page.$$eval('.xl .xl-num', t => t.filter(x => x.value).length)) fail('Week 2 came with Week 1\'s scores');

  // ⤓ Fill, this week only: Tom's tracker has a day in Week 1 (100%) and one in Week 2 (40%); Week 2's Tracker column set to
  // "This week only" takes the Week 2 day alone (2/5), the whole training's would be 70% (3.5/5)
  const m = /^B(\d\d)(\d\d)(\d\d)$/.exec(BATCH), start = Date.parse(`20${m[3]}-${m[1]}-${m[2]}T00:00:00Z`), day = k => new Date(start + k * 864e5).toISOString().slice(0, 10);
  await put('trackerreview:' + ids.Tom, { days: { [day(1)]: { source: 'drive', pct: 100 }, [day(8)]: { source: 'drive', pct: 40 } } });
  const ti = await page.evaluate(() => [...document.querySelectorAll('.xl-head th')].findIndex(x => /^Tracker/.test(x.innerText.trim())));
  await page.evaluate(() => FTRanking.toggleEdit()); await page.waitForTimeout(300);
  const ci = await page.evaluate(() => [...document.querySelectorAll('.rk-col input:not(.rk-sub):not([type=number])')].findIndex(x => x.value === 'Tracker'));
  if (ci < 0) fail('the Tracker column isn\'t in ✎ Columns');
  else {
    const per = await page.evaluate(i => { const sel = document.querySelectorAll('.rk-col')[i].querySelectorAll('.rk-src select')[1]; return sel ? [...sel.options].map(o => o.text) : null; }, ci);
    if (!per || !per.includes('This week only') || !per.includes('Whole training')) fail(`a source column has no This week / Whole training choice: ${JSON.stringify(per)}`);
    await page.evaluate(i => FTRanking.col(i, 'period', 'week'), ci); await page.waitForTimeout(300);
  }
  await page.evaluate(() => FTRanking.toggleEdit()); await page.waitForTimeout(300);
  await page.evaluate(() => FTRanking.fill()); await page.waitForTimeout(2500);
  const tomTr = await page.evaluate(ti => { const r = [...document.querySelectorAll('.xl tr.xl-row')].find(x => /Tom Unscored/.test(x.innerText)); const c = r && r.children[ti]; const inp = c && c.querySelector('input, textarea'); return inp ? inp.value : (c ? c.innerText.trim() : ''); }, ti);
  if (tomTr !== '2') fail(`⤓ Fill for this week took Tom's Tracker as ${JSON.stringify(tomTr)}, not Week 2's day alone (2)`);
  await put('trackerreview:' + ids.Tom, null);

  // 🤖 a week that is over drafts its own report: PAST's Week 1, with its Daily Compliance (the nightly check's days, 80% and 60%)
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} state.traineeId = null; state.isAdmin = false; });
  await signIn(page, 'Una', 'Auto', PAST);
  const una = await page.evaluate(() => state.traineeId);
  { const r = await get('trainee:' + una); r.approved = true; r.archived = false; await put('trainee:' + una, r); }
  // (PAST is older than this test's other batch, so js/ft-admin-tidy.js would archive it on the next admin load: kept
  // active here as a batch a trainer restored is, settings:autoarchive's done list)
  { const a = (await get('settings:autoarchive')) || {}; a.done = Object.assign({}, a.done, { [PAST]: new Date().toISOString() }); await put('settings:autoarchive', a); }
  { const m = /^B(\d\d)(\d\d)(\d\d)$/.exec(PAST), st = Date.parse(`20${m[3]}-${m[1]}-${m[2]}T00:00:00Z`), d = k => new Date(st + k * 864e5).toISOString().slice(0, 10);
    await put('trackerreview:' + una, { days: {}, compliance: { [d(0)]: { pct: 80, parts: { tests: 100, eod: 60 } }, [d(1)]: { pct: 60, parts: { tests: 67, eod: 53 } } } }); }
  await put(`ranking:${PAST}:w1`, null);
  await page.evaluate(() => { state.traineeId = null; state.isAdmin = true; state.adminPreview = false; state.adminData = null; FTRanking.reload(); state.adminTab = 'ranking'; goto('admin'); }); await page.waitForTimeout(1200);
  await page.evaluate(b => { FTRanking.batch(b); FTRanking.week(1); }, PAST);
  // (↻ the report read again while it drafts itself — the Batch Sheet's 🔄 Update calls FTRanking.reload —, once while its scores
  // fill and once while its notes are written: no page error, and the draft still finishes, filled)
  // (the report's own read made slow, as on a busy server, so the reload is still reading when the draft's next step comes)
  await page.evaluate(() => { const g = window.sharedGet; window.__rkSlow = true;
    window.sharedGet = function (k) { const p = g.apply(this, arguments); return window.__rkSlow && /^ranking:/.test(String(k)) ? p.then(v => new Promise(r => setTimeout(() => r(v), 1500))) : p; }; });
  await page.waitForTimeout(150); await page.evaluate(() => FTRanking.reload());
  for (let k = 0; k < 40 && ((await get(`ranking:${PAST}:w1`)) || { auto: {} }).auto?.state !== 'notes'; k++) await page.waitForTimeout(250);
  await page.evaluate(() => FTRanking.reload()); await page.waitForTimeout(1800);
  await page.evaluate(() => { window.__rkSlow = false; });
  for (let k = 0; k < 90 && !((await get(`ranking:${PAST}:w1`)) || { auto: {} }).auto.state?.startsWith('done'); k++) await page.waitForTimeout(500);   // (the test server has no AI: one try at the notes, about 20 s)
  const auto = await get(`ranking:${PAST}:w1`), cc = auto && auto.cols.find(c => c.src === 'compliance');
  if (!auto || !auto.auto || auto.auto.approved || auto.auto.state !== 'done') fail(`a week that is over didn't draft its report: ${JSON.stringify(auto && auto.auto)}`);
  else if (!cc || ((auto.rows[una] || {}).cells || {})[cc.id]?.raw !== '3.5') fail(`the draft's Daily Compliance isn't the week's days (70% = 3.5/5): ${JSON.stringify(cc && (auto.rows[una] || {}).cells)}`);
  if (!/Drafted automatically/.test(await page.evaluate(() => (document.querySelector('.rk-auto') || {}).innerText || ''))) fail('the drafted report doesn\'t say it is a draft to approve');
  await page.evaluate(() => FTRanking.share(document.createElement('button'))); await page.waitForTimeout(800);
  if ((((await get('rankshare:' + una)) || {}).weeks || {})[`${PAST}|1`]) fail('a draft was shared before the trainer approved it');
  await page.evaluate(() => FTRanking.approve()); await page.waitForTimeout(1200);
  if (!((await get(`ranking:${PAST}:w1`)) || { auto: {} }).auto.approved) fail('✓ Approve didn\'t approve the draft');
  // 📈 what Overall Performance showed is on the 📋 Batch Sheet now: Una's daily compliance, Week 1's average, the Overall % and the rank
  await page.evaluate(() => { state.adminTab = 'batchsheet'; state.adminData = null; goto('admin'); FTBatchSheet.refresh(); }); await page.waitForTimeout(1500);
  await page.evaluate(b => FTBatchSheet.batch(b), PAST);
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the Batch Sheet never finished loading'));
  await page.waitForTimeout(500);
  const ov = await page.evaluate(() => { const t = FTBatchSheet.tables().find(x => x.id === 'scores'); const r = t.rows.find(x => /Una/.test(x[0].v)); return { head: t.head, row: r && r.map(c => c.v) }; });
  const col = h => ov.head.indexOf(h);
  if (!ov.row || ov.row[col('Daily compliance')] !== '70%' || ov.row[col('Weeks average (/5)')] !== '3.50' || !/%$/.test(ov.row[col('Overall %')]) || String(ov.row[col('Rank')]) !== '1')
    fail(`📋 Batch Sheet → 🏅 Scores reads: ${JSON.stringify(ov)}`);
  const out = await page.evaluate(() => { const t = FTBatchSheet.tables().find(x => x.id === 'outputs'); const r = t.rows.find(x => /Una/.test(x[0].v)); return r && r.map(c => c.v); });
  if (!out || out[1] !== '70%' || out.slice(2).filter(Boolean).length !== 2) fail(`📤 Daily outputs for Una (two days checked): ${JSON.stringify(out)}`);
  const tabsNow = await page.evaluate(() => [...document.querySelectorAll('.lp-admin-row .admin-tab-btn')].map(x => x.innerText.trim()).join(' | '));
  if (/Overall Performance|🏅 Scorecards/.test(tabsNow)) fail(`📈 Overall Performance / 🏅 Scorecards still have tabs: ${tabsNow}`);
  await page.evaluate(() => { state.adminTab = 'overall'; render(); }); await page.waitForTimeout(300);
  if (await page.evaluate(() => state.adminTab) !== 'batchsheet') fail('an old link to 📈 Overall Performance does not open the Batch Sheet');
  await page.evaluate(() => goto('dashboard')); await page.waitForTimeout(1000);
  if (!(await page.$('.gs-dash'))) fail('a trainer\'s dashboard has no 📋 Batch Sheet card');
  await put(`ranking:${PAST}:w1`, null); await put('trackerreview:' + una, null); await put('rankshare:' + una, null);
  { const r = await get('trainee:' + una); if (r) { r.archived = true; await put('trainee:' + una, r); } }

  // 🔄 a report started before its columns had sources ("Ass: Common Terms", no source) follows the trainees' progress:
  // opening it gives the column its source and fills its empty cells from the graded assessment (never over a typed one)
  const ct = 'c-ct', pi = 'c-pi';
  await put(`ranking:${BATCH}:w2`, { batch: BATCH, week: 2, cols: [{ id: ct, label: 'Ass: Common Terms', sub: '', max: 27, type: 'score', src: '' }, { id: pi, label: 'PI Reading Task', sub: '', max: 40, type: 'score', src: '' }],
    rows: { [ids.Sam]: { cells: { [ct]: { raw: '20' } } } }, createdAt: new Date().toISOString() });
  for (const [f, pct] of [['Rhea', 80], ['Sam', 50]]) { const rv = (await get('trackerreview:' + ids[f])) || { days: {} };
    rv.assess = Object.assign({}, rv.assess, { '14sz5f3HTQKmryc7Upvlc6qua008rPnmw': { title: 'Common Terms Used – Assessment', score: pct * 27 / 100, max: 27, pct, at: new Date().toISOString(), items: {} } });
    await put('trackerreview:' + ids[f], rv); }
  await page.evaluate(b => FTRanking.open(b, 2), BATCH); await page.waitForTimeout(4000);
  const w2 = await get(`ranking:${BATCH}:w2`), cRhea = (((w2 || {}).rows || {})[ids.Rhea] || { cells: {} }).cells[ct], cSam = (((w2 || {}).rows || {})[ids.Sam] || { cells: {} }).cells[ct];
  if (!w2 || (w2.cols.find(c => c.id === ct) || {}).src !== 'drive:Common Terms') fail(`the Common Terms column didn't get its source: ${JSON.stringify(w2 && w2.cols)}`);
  if (!cRhea || Number(cRhea.raw) !== 21.6) fail(`opening the report didn't fill Rhea's Common Terms from her graded assessment (80% of 27 = 21.6): ${JSON.stringify(cRhea)}`);
  if (!cSam || cSam.raw !== '20') fail(`the fill wrote over a score the trainer typed: ${JSON.stringify(cSam)}`);
  // 🔄 a cell the platform filled follows the scorecards: Rhea's assessment graded again (90%) → her cell 24.3 on the next read,
  // and an auto NO SUBMISSION note (from before her files were linked) is worked out again; the trainer's typed 20 stays
  { const rv = await get('trackerreview:' + ids.Rhea); rv.assess['14sz5f3HTQKmryc7Upvlc6qua008rPnmw'] = Object.assign(rv.assess['14sz5f3HTQKmryc7Upvlc6qua008rPnmw'], { score: 24.3, pct: 90 }); await put('trackerreview:' + ids.Rhea, rv);
    const w = await get(`ranking:${BATCH}:w2`); w.cols.push({ id: 'c-st', label: 'Spelling & Typing Tests', sub: '9/28 to 10/06', type: 'notes', src: 'skills' });
    w.rows[ids.Rhea].cells['c-st'] = { note: 'NO SUBMISSION', auto: true }; w.rows[ids.Sam].cells['c-st'] = { note: 'Typed by the trainer', auto: true, noteBy: 'trainer' };
    await put(`ranking:${BATCH}:w2`, w);
    await put('skills:' + ids.Rhea, { typing: [{ date: '2026-09-28', slot: 'AM', net: 40, acc: 95 }], spelling: [] }); }
  await page.evaluate(b => { FTRanking.reload(); FTRanking.open(b, 2); }, BATCH); await page.waitForTimeout(4000);
  { const w = await get(`ranking:${BATCH}:w2`), r = ((w.rows[ids.Rhea] || {}).cells) || {}, sm = ((w.rows[ids.Sam] || {}).cells) || {};
    if (Number((r[ct] || {}).raw) !== 24.3) fail(`a platform-filled score didn't follow the scorecard (90% of 27 = 24.3): ${JSON.stringify(r[ct])}`);
    if (!r['c-st'] || /NO SUBMISSION/.test(r['c-st'].note || '') || !/Typing Test/.test(r['c-st'].note || '')) fail(`an auto NO SUBMISSION didn't update to the trainee's compliance: ${JSON.stringify(r['c-st'])}`);
    if ((sm[ct] || {}).raw !== '20' || (sm['c-st'] || {}).note !== 'Typed by the trainer') fail(`the refresh wrote over what the trainer typed: ${JSON.stringify(sm)}`); }
  await put('skills:' + ids.Rhea, null);

  for (const w of [1, 2]) await put(`ranking:${BATCH}:w${w}`, null);
  for (const id of Object.values(ids)) await put('rankshare:' + id, null);
  for (const id of Object.values(ids)) { const r = await get('trainee:' + id); if (r) { r.archived = true; await put('trainee:' + id, r); } }
  await browser.close();
  if (failures.length) { console.error('Weekly Ranking test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Weekly Ranking test passed (a week that is over drafts its report, with the Daily Compliance, and is shared only once approved; 📋 the Batch Sheet with each trainee\'s compliance, weeks, Overall % and rank (📈 Overall Performance folded in), and its card on a trainer\'s dashboard; the report in the 📋 Batch Sheet under the Day 1–16 scores, no tab of its own; Week 1 started from its columns with no scores in it; points turned into marks out of 5 as they are typed; the final average and the ranking, an unscored trainee unranked; the formula bar (a formula, a score\'s note), Enter to the cell below, saved; ⬇ Excel a real .xlsx with live formulas, ranked; 📤 each trainee gets only their own row; ⬇ Word in the facilitator\'s format, landscape and ranked; the Reception Mock Call scored on the Training Guide\'s scorecard in Trainer Inputs (its weighted average the score) and ⤓ filled into the ranking, never over a typed score; the Day 18 demo\'s scorecard; Week 2 from Week 1\'s columns).');
})().catch(e => { console.error(e); process.exit(1); });
