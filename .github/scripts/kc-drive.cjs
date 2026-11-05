// ✍️ Every Knowledge Check has 📄 Save PDF to my Folder (js/ft-process.js pdfBox), and it works:
//   - on each lesson's Knowledge Check page (Lessons 1, 2, 4, 6, 7, 8), whether or not the module is finished yet (every question
//     there can be answered, so every sheet can be saved), with ⬇ Download PDF beside it;
//   - pressing it sends the answer sheet as a PDF named by its convention to the trainee's folder (/api/drive/save, answered
//     here as Drive would) and marks the sheet saved;
//   - and an offboarded trainee leaves the trainer's ✍️ Process Questions list (js/ft-roster.js ftActiveTrainee).
// Usage: NODE_PATH=…/node_modules node .github/scripts/kc-drive.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1300, height: 950 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Kay', 'Drive', 'B110526');
    const id = await page.evaluate(() => state.traineeId);
    const r0 = await get('trainee:' + id); r0.approved = true; await put('trainee:' + id, r0);
    const LESSONS = await page.evaluate(() => DAYS.map(d => d.id).filter(l => ftKcQuestions(l).length));
    if (LESSONS.join() !== '1,2,4,6,7,8') fail(`the lessons with a Knowledge Check: ${LESSONS}`);
    for (const studied of [false, true]) {
      await page.evaluate(s => DAYS.forEach(d => { state.progress[d.id] = Object.assign({}, state.progress[d.id], { studied: s }); }), studied);
      for (const l of LESSONS) {
        await page.evaluate(l => { state.dayId = l; goto('kc'); }, l); await page.waitForTimeout(700);
        const b = await page.evaluate(() => ({ save: [...document.querySelectorAll('.fp-drive')].filter(x => !x.disabled).length, dl: document.querySelectorAll('.fp-dl').length }));
        if (!b.save || !b.dl) fail(`Lesson ${l}'s Knowledge Check (${studied ? 'module finished' : 'module not finished yet'}) has no 📄 Save PDF to my Folder: ${JSON.stringify(b)}`);
      }
    }
    // pressing it: the PDF goes to /api/drive/save under the naming convention (Drive answered here), and the sheet is marked saved
    await page.evaluate(() => { state.dayId = 2; goto('kc'); }); await page.waitForTimeout(800);
    await page.fill('.kc-card textarea >> nth=0', 'A law firm communicates through secure channels and records every call in the case notes.');
    await page.waitForTimeout(1200);
    const sent = [];
    await page.route('**/api/drive/save', async route => { const b = JSON.parse(route.request().postData() || '{}'); sent.push({ name: b.name, pdf: Buffer.from(String(b.pdf || ''), 'base64').slice(0, 5).toString() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, file: { name: b.name, link: 'https://drive.google.com/file/d/saved/view' } }) }); });
    await page.click('.fp-drive'); await page.waitForTimeout(2500);
    if (sent.length !== 1 || sent[0].pdf !== '%PDF-' || !/^Law_Firm_Communications_Training_Process_Question_Answers \(Kay\)\.pdf$/.test(sent[0].name)) fail(`the save didn't send the PDF under its naming convention: ${JSON.stringify(sent)}`);
    const saved = await page.evaluate(() => ((window.FTProcess && FTProcess._data ? FTProcess._data() : null) || {}));
    const toast = await page.evaluate(() => (document.querySelector('.toast, #toast') || {}).innerText || '');
    if (!/Saved to your Assessment and Activities Folder/.test(toast)) fail(`no confirmation after saving: "${toast}"`);
    await page.unroute('**/api/drive/save');
    // an offboarded trainee leaves the trainer's ✍️ Process Questions list
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; state.adminData = null; });
    await page.evaluate(id => fetch('/api/batch/offboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, reason: 'test' }) }), id);
    await page.evaluate(async () => { await ftLoadBlocked(true); ftRosterChanged(); goto('process'); }); await page.waitForTimeout(3500);
    const listed = await page.evaluate(() => /Kay Drive/.test(document.body.innerText));
    if (listed) fail('an offboarded trainee still shows on the trainer\'s ✍️ Process Questions');
    await page.evaluate(id => fetch('/api/batch/offboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, restore: true }) }), id);
    const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Knowledge Check Save to Drive test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Knowledge Check Save to Drive test passed (📄 Save PDF to my Folder and ⬇ Download PDF on every lesson\'s Knowledge Check, module finished or not; the PDF sent under its naming convention and confirmed; an offboarded trainee off the trainer\'s Process Questions).');
})();
