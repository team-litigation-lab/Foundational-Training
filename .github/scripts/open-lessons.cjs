// 📅 Open Lessons unlocks the day cards: a lesson the trainer opens for a batch opens for every trainee of that batch,
// whichever form of the Batch ID their record carries (B102826, B10282026, B10282026-LSHTRAINEE-004 are one batch), a
// lesson saved under an older form of the key still opens, and 👤 Open for one trainee (unlockedDays on the trainee's
// record) opens a lesson for that trainee alone. The trainer reaches it from 🔓 Open Lessons in the top bar.
// Usage: NODE_PATH=…/node_modules node .github/scripts/open-lessons.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);
const put = (page, key, v) => page.evaluate(async ([key, v]) => { await fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(v) }) }); await ftLoadOpenDays(); }, [key, v]);
const segs = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ftli')].map(c => [c.id,
  [...c.querySelectorAll('.mc-grid .ftseg .ftseg-b')].map(x => x.classList.contains('locked') ? 'locked' : 'open')])));
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('pageerror', e => fail('page error: ' + e.message));
  try {
    await page.goto(BASE); await signIn(page, 'Open', 'Lessons', 'B102826'); await page.waitForTimeout(1200);
    const tid = await page.evaluate(() => state.traineeId);
    // the batch keys: every form of one batch is one key
    const keys = await page.evaluate(() => ['B102826', 'B10282026', 'b10282026-lshtrainee-004', ' b 10-28-26 '].map(ftBatchKey));
    if (new Set(keys).size !== 1 || keys[0] !== 'b102826') fail(`one batch read as different keys: ${JSON.stringify(keys)}`);
    // the trainer opened Law Firm Communication for the batch as B102826, and Calendaring under an older key
    await put(page, 'settings:opendays', { all: [1], batches: { b102826: [2], 'b10282026-lshtrainee-004': [3] } });
    const merged = await page.evaluate(() => state.ftOpenDays.batches);
    if (JSON.stringify(merged) !== JSON.stringify({ b102826: [2, 3] })) fail(`the older batch key wasn't merged into the batch's one key: ${JSON.stringify(merged)}`);
    // the trainee's record carries the batch in an older form
    const open = await page.evaluate(() => { state.traineeBatch = 'B10282026-LSHTRAINEE-004'; return [1, 2, 3, 5].map(n => dayUnlocked(n)); });
    if (open.join() !== 'true,true,true,false') fail(`a trainee whose record carries an older Batch ID form doesn't get the batch's lessons: ${JSON.stringify(open)}`);
    await page.evaluate(() => goto('modules')); await page.waitForTimeout(1000);
    let s = await segs(page);
    if ((s['dayl-2'] || [])[0] !== 'open') fail(`Law Firm Communication's card is still locked: ${JSON.stringify(s['dayl-2'])}`);
    if ((s['dayl-5'] || []).some(x => x !== 'locked')) fail(`a lesson nobody opened shows open: ${JSON.stringify(s['dayl-5'])}`);
    // 👤 the trainer opens Lesson 5 for this trainee alone (Admin → 📅 Open Lessons)
    await page.evaluate(async id => { const r = await sharedGet('trainee:' + id); r.approved = true; await sharedSet('trainee:' + id, r);
      state.traineeId = null; state.isAdmin = true; state.adminPreview = false; state.adminData = (await sharedGetMany(await sharedList('trainee:'))).filter(Boolean); }, tid);
    await page.evaluate(id => { state.ftOdBatch = 'b102826'; state.ftOdTrainee = id; state.adminTab = 'opendays'; goto('admin'); }, tid);
    await page.waitForTimeout(800);
    const panel = await page.evaluate(() => { const p = document.querySelector('.ft-od-one'); return p ? { boxes: p.querySelectorAll('input[type=checkbox]').length, sel: (document.getElementById('ftOdTrainee') || {}).value } : null; });
    if (!panel || !panel.boxes || panel.sel !== tid) fail(`👤 Open for one trainee isn't on 📅 Open Lessons: ${JSON.stringify(panel)}`);
    const bar = await page.evaluate(() => [...document.querySelectorAll('.topbar button')].some(x => /Open Lessons/.test(x.textContent)));
    if (!bar) fail('no 🔓 Open Lessons button in the trainer\'s top bar');
    await page.evaluate(id => ftToggleTraineeDay(id, 5, true), tid); await page.waitForTimeout(800);
    const rec = await page.evaluate(id => sharedGet('trainee:' + id), tid);
    if (JSON.stringify(rec && rec.unlockedDays) !== '[5]') fail(`the lesson wasn't saved on the trainee's record: ${JSON.stringify(rec && rec.unlockedDays)}`);
    // back as the trainee: the record's unlock reaches the page and opens the card
    await page.evaluate(async id => { state.traineeId = id; state.isAdmin = false; state.adminTab = null; await syncToLedger(); goto('modules'); }, tid);
    await page.waitForTimeout(1000);
    const l5 = await page.evaluate(() => ({ unlocked: dayUnlocked(5), mine: state.adminUnlockedDays, other: dayUnlocked(6) }));
    if (!l5.unlocked) fail(`a lesson opened for one trainee didn't open for them: ${JSON.stringify(l5)}`);
    if (l5.other) fail('a lesson nobody opened opened with it');
    s = await segs(page);
    if ((s['dayl-5'] || [])[0] !== 'open') fail(`the lesson opened for one trainee shows locked on its card: ${JSON.stringify(s['dayl-5'])}`);
  } catch (e) { fail('test crashed: ' + (e && e.stack || e)); }
  await b.close();
  if (failures.length) { console.error('Open Lessons test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Open Lessons test passed (one key per batch whatever form its Batch ID is in, older keys merged; a trainee with an older form gets the batch\'s lessons on their cards; 👤 Open for one trainee saves unlockedDays and opens that lesson\'s card for that trainee alone; 🔓 Open Lessons in the trainer\'s top bar).');
})();
