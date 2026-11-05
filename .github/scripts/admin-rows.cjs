// 🗂 A trainee's row and detail in the trainer's admin (index.html renderAdminRow / renderAdminDetail / tfbItemCard):
//   - what a trainee writes to their own record (trainee:<id>: lab attempts, the day asked, scores, runs, a file's link) or
//     to their feedback (tfeedback:<id>: the day, the status, the ratings, the id) is shown as text, never run as script;
//     a Download link is only a data: file, a rating past 5 doesn't break the tab;
//   - 🚫 Offboard works for a name with an apostrophe (Sean O'Brien);
//   - on a batch folder page (📁 Batches → No batch) View Detail opens the detail there (the rows sit in #batchFolderBody);
//   - an AI review saved without ratings still draws, and a review that isn't an object isn't saved.
// Usage: NODE_PATH=…/node_modules node .github/scripts/admin-rows.cjs http://localhost:8787/
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
const bad = n => `<img src=x onerror="window.__xss=(window.__xss||[]).concat(${n})">`;

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (k, v) => page.evaluate(([k, v]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(v) }) }), [k, v]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  try {
    await page.goto(BASE); await page.waitForFunction(() => typeof renderAdminRow === 'function' && typeof openBatchFolder === 'function', null, { timeout: 20000 });
    const tool = await page.evaluate(() => PRACTICE_TOOLS[0].id);
    const id = 'sean-o-brien';
    await put('trainee:' + id, { id, name: "Sean O'Brien", approved: true, registeredAt: '2026-10-30T12:00:00Z', lastActive: '2026-11-01T12:00:00Z',
      labResetRequestedAt: '2026-11-01T12:00:00Z', labResetRequestedDay: '"' + bad(1), labAttemptsGlobal: bad(2),
      dayProgress: { 1: { done: true, score: bad(3) } }, practiceProgress: { [tool]: { runs: bad(4), bestScore: bad(5) } },
      submissions: [{ fileName: 'a.pdf', toolTitle: 'T', fileSize: 1024, submittedAt: '2026-11-01T12:00:00Z', stored: true, dataUrl: 'javascript:window.__xss=(window.__xss||[]).concat(6)' }],
      aiReview: { strength: 'Good', challenges: 'Some', redFlag: 'None', endorsement: 'Endorsed', generatedAt: '2026-11-01T12:00:00Z' } });
    // 📁 Batches → No batch: the row drawn in #batchFolderBody
    await page.evaluate(async () => { state.isAdmin = true; state.adminTab = 'batches'; goto('admin'); await loadAdminLedger(); openBatchFolder(NO_BATCH); });
    await page.waitForFunction(() => /O'Brien|O&#39;Brien/.test((document.getElementById('batchFolderBody') || {}).innerHTML || ''), null, { timeout: 15000 }).catch(() => fail('the No batch folder page doesn\'t list the trainee'));
    const rowText = await page.evaluate(() => (document.getElementById('batchFolderBody') || {}).innerText || '');
    if (/used\)/.test(rowText)) fail(`a non-number lab attempts count is shown as "used": ${rowText.slice(0, 300)}`);
    // View Detail: opens on this page
    await page.evaluate(id => toggleAdminDetail(id), id); await page.waitForTimeout(800);
    const detail = await page.evaluate(() => (document.getElementById('batchFolderBody') || {}).innerText || '');
    if (!/AI-Generated Ranking/i.test(detail)) fail('View Detail on a batch folder page doesn\'t open the detail there');
    else if (!/Executive Triage/i.test(detail)) fail('an AI review without ratings doesn\'t draw');
    if (await page.$('#batchFolderBody a[href^="javascript:"]')) fail('a javascript: link is offered as the file\'s Download');
    // 🚫 Offboard for O'Brien: the click reaches confirmRevokeTrainee with the id and the name
    await page.evaluate(() => { window.confirmRevokeTrainee = (i, n) => { window.__revoke = [i, n]; }; });
    await page.click('#batchFolderBody button[onclick^="confirmRevokeTrainee"]').catch(e => fail(`no Offboard button: ${e.message}`));
    await page.waitForTimeout(300);
    const rv = await page.evaluate(() => window.__revoke);
    if (!rv || rv[0] !== id || rv[1] !== "Sean O'Brien") fail(`🚫 Offboard does nothing for Sean O'Brien: ${JSON.stringify(rv)}`);
    // Trainee feedback cards: the day, the status, the id and a rating of 6 written by a trainee
    const fb = { id: "x');window.__xss=(window.__xss||[]).concat(7);//", name: 'N', dayId: bad(8), status: '"><img src=x onerror="window.__xss=(window.__xss||[]).concat(9)">', ratings: { platform: 6, lessons: -1, facilitator: '4' }, at: '2026-11-01T12:00:00Z' };
    const out = await page.evaluate(fb => {
      window.tfbSetStatus = (i, s) => { window.__set = [i, s]; };
      state.tfbAdmin = { items: [fb] }; state.tfbFilter = {};
      const d = document.createElement('div'); d.id = 'tfbTest';
      try { d.innerHTML = renderAdminTraineeFeedback(); } catch (e) { return 'threw: ' + e.message; }
      document.body.append(d); return 'ok';
    }, fb);
    if (out !== 'ok') fail(`Trainee Feedback doesn't draw with a rating past 5: ${out}`);
    else {
      await page.click('#tfbTest .studio-actions button').catch(e => fail(`no Mark button: ${e.message}`));
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => window.__set);
      if (!st || st[0] !== fb.id) fail(`Mark acknowledged doesn't pass the feedback's id: ${JSON.stringify(st)}`);
    }
    await page.waitForTimeout(800);
    const xss = await page.evaluate(() => window.__xss);
    if (xss) fail(`trainee-written fields ran as script in the admin page: ${JSON.stringify(xss)}`);
    // an AI review that isn't an object isn't saved
    await page.evaluate(() => { window.callAIJson = async () => 'not json'; });
    await page.evaluate(id => generateAiReview(id), id); await page.waitForTimeout(800);
    const rec = await get('trainee:' + id);
    if (!rec || !rec.aiReview || rec.aiReview.strength !== 'Good') fail(`a review that isn't an object was saved: ${JSON.stringify(rec && rec.aiReview)}`);
  } catch (err) { fail(`threw: ${err.stack || err}`); }
  await browser.close();
  if (failures.length) { console.log('✗ ' + failures.join('\n✗ ')); process.exit(1); }
  console.log('✓ the admin rows: trainee fields shown as text, Offboard for O\'Brien, View Detail on a batch folder page, AI review shape');
})();
