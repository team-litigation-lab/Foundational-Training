// 🧬 The Feedback & Scoring DNA learns from the trainer's own entries (js/ft-dna-learn.js):
//   - a trainer's manual feedback (📝 Send Feedback) and a scoresheet saved (labreview) are kept as learning entries, with the
//     verdict, the score, the comment and each criterion's remark; a trainee's own saves are not;
//   - 🔄 Refresh distils them (the AI, stubbed here) into the voice and the scoring, kept in settings:feedback-style.learned;
//   - every AI grader then reads it: fbStyleBlock() and ftDnaGuide() carry "LEARNED FROM THE TRAINER'S OWN ENTRIES";
//   - Admin → 🗣 Feedback Style shows what was learned.
// Usage: NODE_PATH=…/node_modules node .github/scripts/dna-learn.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    const was = await get('settings:feedback-style');
    await put('settings:feedback-style', null);
    await signIn(page, 'Dina', 'Dnalearn', 'B010126');
    const id = await page.evaluate(() => state.traineeId);
    // a trainee's own save never teaches the DNA
    await page.evaluate(id => sharedSet('trainerfb:' + id, { items: { 'manual:x': { act: 'manual', title: 'X', comment: 'TRAINEE-WROTE', at: new Date().toISOString() } } }), id);
    await page.waitForTimeout(800);
    if (JSON.stringify(await get('settings:feedback-style') || {}).includes('TRAINEE-WROTE')) fail('a trainee\'s own save taught the DNA');
    // the trainer: manual feedback, then a scoresheet with each criterion's remark
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.traineeId = null; });
    const now = () => new Date().toISOString();
    await page.evaluate(([id, at]) => sharedSet('trainerfb:' + id, { items: { 'manual:side-general': { act: 'manual', item: 'side-general', title: '💬 General feedback', group: '🧩 Side activities', verdict: 'Good, with Improvements Needed.', score: 82, comment: 'FB-ONE: clear notes; improvement is needed in the deadlines.', at } } }), [id, now()]);
    await page.waitForTimeout(1200);
    await page.evaluate(([id, at]) => sharedSet('labreview:' + id, { acts: { 'reception-live': { status: 'Passed', score: 76, comment: 'FB-TWO: good control.', at, rubric: { key: 'reception', scores: [5, 4, 2], feedback: ['Warm greeting.', '', 'Skipped verification.'], avg: 3.8 } } } }), [id, now()]);
    await page.waitForTimeout(1500);
    const L = ((await get('settings:feedback-style')) || {}).learned || {};
    const txt = JSON.stringify(L.entries || []);
    if ((L.entries || []).length !== 2 || !/FB-ONE/.test(txt) || !/FB-TWO/.test(txt) || !/Skipped verification/.test(txt) || !/Good, with Improvements Needed/.test(txt)) fail(`the trainer's entries weren't kept to learn from: ${txt.slice(0, 300)}`);
    // saving the same again doesn't add it twice
    const e2 = (await get('settings:feedback-style')).learned.entries.length;
    await page.evaluate(id => sharedGet('trainerfb:' + id).then(v => sharedSet('trainerfb:' + id, v)), id); await page.waitForTimeout(1000);
    if ((await get('settings:feedback-style')).learned.entries.length !== e2) fail('an entry saved again was learned twice');
    // 🔄 Refresh (the AI stubbed): the voice and the scoring, then every grader's prompt carries them
    await page.evaluate(() => { window.callAIJson = async () => ({ voice: ['VOICE-RULE: open with a verdict label'], scoring: ['SCORE-RULE: a skipped verification caps the call at 3/5'] }); });
    await page.evaluate(() => FTDnaLearn.refresh(true)); await page.waitForTimeout(1500);
    const L2 = ((await get('settings:feedback-style')) || {}).learned || {};
    if (!/VOICE-RULE/.test((L2.voice || []).join()) || !/SCORE-RULE/.test((L2.scoring || []).join()) || L2.pending !== 0) fail(`the refresh didn't keep the voice and scoring: ${JSON.stringify(L2).slice(0, 300)}`);
    await page.evaluate(() => fbEnsureStyle(true)); await page.waitForTimeout(500);
    const blocks = await page.evaluate(() => ({ style: window.fbStyleBlock(), guide: window.ftDnaGuide() }));
    if (!/LEARNED FROM THE TRAINER'S OWN ENTRIES/.test(blocks.style) || !/SCORE-RULE/.test(blocks.style)) fail('fbStyleBlock() doesn\'t carry what was learned');
    if (!/VOICE-RULE/.test(blocks.guide)) fail('ftDnaGuide() doesn\'t carry what was learned');
    // 🗣 Feedback Style shows it
    await page.evaluate(() => { state.adminTab = 'fbstyle'; goto('admin'); }); await page.waitForTimeout(2500);
    if (!/SCORE-RULE/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🗣 Feedback Style doesn\'t show what was learned');
    await put('settings:feedback-style', was);
    await put('trainerfb:' + id, null); await put('labreview:' + id, null);
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('DNA learning test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('DNA learning test passed (the trainer\'s manual feedback and scoresheets kept as learning entries, a trainee\'s never, none twice; 🔄 Refresh distils the voice and the scoring; every grader\'s prompt and 🗣 Feedback Style carry them).');
})();
