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
const BATCH = 'B101626';
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
  if (!(await page.$('.rk'))) fail('Admin has no 📊 Weekly Ranking tab');
  const tabs = await page.evaluate(() => (document.querySelector('.lp-admin-row') || {}).innerText || '');
  if (!/Scorecards/.test(tabs) || !/Weekly Ranking/.test(tabs)) fail(`📊 Weekly Ranking is not beside 🏅 Scorecards: ${tabs}`);
  await page.evaluate(b => FTRanking.batch(b), BATCH); await page.waitForTimeout(1500);
  if (!/hasn.t been started/.test(await page.evaluate(() => document.querySelector('.rk').innerText))) fail('a new week doesn\'t offer to start the report');
  await page.evaluate(() => FTRanking.start('week1')); await page.waitForTimeout(800);
  await page.evaluate(() => FTRanking.toggleEdit()); await page.waitForTimeout(300);
  const heads = await page.$$eval('.xl-head th', t => t.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  const want = ['2', 'Trainee Name', 'Spelling & Typing Tests', 'Monitoring Sheet (5/5)', 'Tracker (5/5)', 'PI Reading Task (40/40)', 'PI Reading Task ÷ 5', 'Ass: Common Terms (27/27)', 'Ass: Common Terms ÷ 5',
    'Ass: Auto Liability Insurance (45/45)', 'Ass: Auto Liability Insurance ÷ 5', 'RC: Data Extraction (125/125)', 'RC: Data Extraction ÷ 5', 'Reception Mock Calls (5/5)', 'W1 Final Average', 'Rank', 'Additional Notes'];
  if (JSON.stringify(heads) !== JSON.stringify(want)) fail(`the Week 1 columns are ${JSON.stringify(heads)}`);
  const letters = await page.$$eval('.xl-letters th', t => t.map(x => x.innerText.trim()).join(''));
  if (letters !== 'ABCDEFGHIJKLMNOP') fail(`the sheet's column letters are ${letters}`);
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
  await page.evaluate(id => FTInputs.cell(id, 'reception-live'), ids.Sam); await page.waitForTimeout(600);
  const crit = await page.$$eval('.ti-rub-tbl tbody tr:not(.ti-rub-avg) td:first-child', t => t.map(x => x.innerText));
  if (crit.length !== 14 || crit[0] !== 'Introduction of Law Firm and Name' || crit[13] !== 'Tone of Voice') fail(`the Reception Mock Call scorecard isn't the Training Guide's: ${JSON.stringify(crit)}`);
  if (!(await page.$('.ti-rub-tbl input[data-fb="0"]'))) fail('the mock call scorecard has no feedback column');
  for (let i = 0; i < 14; i++) await page.fill(`.ti-rub-tbl input[data-crit="${i}"]`, i < 2 ? '5' : '4');
  await page.fill('.ti-rub-tbl input[data-fb="7"]', 'Resolved the caller’s concern but missed the claim number.');
  if ((await page.innerText('[data-avg]')) !== '4.14/5' || (await page.inputValue('.fss-cellform [data-score]')) !== '83') fail(`the scorecard's weighted average isn't the score: ${await page.innerText('[data-avg]')} → ${await page.inputValue('.fss-cellform [data-score]')}%`);
  await page.selectOption('.fss-cellform [data-status]', 'Passed');
  await page.click('.fss-cellform >> text=Save'); await page.waitForTimeout(1500);
  const lr = ((await get('labreview:' + ids.Sam)) || {}).acts || {};
  const rec = lr['reception-live'] || {};
  if (rec.score !== 83 || !rec.rubric || rec.rubric.key !== 'reception' || rec.rubric.avg !== 4.14 || rec.rubric.scores.length !== 14 || !/claim number/.test(rec.rubric.feedback[7])) fail(`the scorecard wasn't saved: ${JSON.stringify(rec)}`);
  // the Day 18 demo has its scorecard too
  await page.evaluate(id => FTInputs.cell(id, 'settlement-demo'), ids.Sam); await page.waitForTimeout(500);
  if (!/REDUCTION \/ CLOSING & SETTLEMENT DEMO/.test(await page.evaluate(() => (document.querySelector('.ti-rub-tbl th') || {}).innerText || ''))) fail('the Reduction / Closing & Settlement Demo has no scorecard in Trainer Inputs');
  await page.evaluate(() => FTInputs.cell()); 

  // ⤓ fill: Sam's Reception Mock Calls from that scorecard (83% = 4.15/5); Rhea's typed scores untouched
  await page.evaluate(() => { state.adminTab = 'ranking'; render(); }); await page.waitForTimeout(800);
  await page.evaluate(() => FTRanking.fill()); await page.waitForTimeout(2500);
  if ((await rowOf('Rhea Rank').locator('.rk-avg').innerText()) !== '4.32') fail('⤓ Fill changed a score the trainer typed');
  const samRec = await rowOf('Sam Second').locator('.xl-num').nth(6).inputValue();
  if (samRec !== '4.15') fail(`⤓ Fill didn't take Sam's Reception Mock Calls from the trainer's scorecard: ${JSON.stringify(samRec)}`);
  if ((await rowOf('Sam Second').locator('.rk-avg').innerText()) !== '3.38') fail(`Sam's average after the fill is ${await rowOf('Sam Second').locator('.rk-avg').innerText()} (3.38 expected)`);

  // Week 2 starts from Week 1's columns, with no scores
  await page.evaluate(() => FTRanking.week(2)); await page.waitForTimeout(1200);
  await page.evaluate(() => FTRanking.start('last')); await page.waitForTimeout(800);
  const h2 = await page.$$eval('.xl-head th', t => t.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  if (h2.length !== want.length || !h2.includes('W2 Final Average')) fail(`Week 2 didn't start from Week 1's columns: ${JSON.stringify(h2)}`);
  if (await page.$$eval('.xl .xl-num', t => t.filter(x => x.value).length)) fail('Week 2 came with Week 1\'s scores');

  for (const w of [1, 2]) await put(`ranking:${BATCH}:w${w}`, null);
  for (const id of Object.values(ids)) await put('rankshare:' + id, null);
  for (const id of Object.values(ids)) { const r = await get('trainee:' + id); if (r) { r.archived = true; await put('trainee:' + id, r); } }
  await browser.close();
  if (failures.length) { console.error('Weekly Ranking test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Weekly Ranking test passed (the tab beside 🏅 Scorecards; Week 1 started from its columns with no scores in it; points turned into marks out of 5 as they are typed; the final average and the ranking, an unscored trainee unranked; the formula bar (a formula, a score\'s note), Enter to the cell below, saved; ⬇ Excel a real .xlsx with live formulas, ranked; 📤 each trainee gets only their own row; ⬇ Word in the facilitator\'s format, landscape and ranked; the Reception Mock Call scored on the Training Guide\'s scorecard in Trainer Inputs (its weighted average the score) and ⤓ filled into the ranking, never over a typed score; the Day 18 demo\'s scorecard; Week 2 from Week 1\'s columns).');
})().catch(e => { console.error(e); process.exit(1); });
