// 📝 The trainer's feedback, sent on the platform (js/ft-trainer-feedback.js), and where the trainee sees it:
//   a trainee's work on the activities with no review of their own (a transcription, video notes, a letter, a process
//   guide) is listed in Admin → 🏅 Scorecard → 📝 Send Feedback "To review"; the trainer opens one (a guide is read when
//   opened, and anything that could run code is cleaned out), sends a verdict, a score and a comment; it's saved in
//   trainerfb:<id> and leaves "To review". The trainee sees it on the activity's page (NEW until seen, as text), on
//   📬 My Feedback (with a mock call's scorecard from Trainer Inputs and their shared Weekly Ranking row), and on
//   🏅 My Performance (📝 Trainer feedback and 📊 Weekly Ranking). The trainee reads trainerfb and rankshare, only
//   admins write them (worker.js).
// Usage: NODE_PATH=…/node_modules node .github/scripts/feedback.cjs http://localhost:8787/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B103126';
const failures = []; const fail = m => failures.push(m);

const worker = fs.readFileSync(path.resolve(__dirname, '../../worker.js'), 'utf8');
const owned = (worker.match(/const TRAINER_OWNED = \(id\) => \[([^\]]*)\]/) || [])[1] || '';
if (!/trainerfb:\$\{id\}/.test(owned) || !/rankshare:\$\{id\}/.test(owned)) fail('worker.js: trainerfb:<id> and rankshare:<id> are not trainer-owned (the trainee reads them, only admins write them)');

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  const openBefore = await get('settings:opendays');
  await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
  await signIn(page, 'Fey', 'Feedback', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const rec = await get('trainee:' + id); rec.approved = true; rec.archived = false; await put('trainee:' + id, rec);
  const at = new Date().toISOString();
  // the trainee's work
  await put('trainerfb:' + id, null);
  await put('transcribe:' + id, { r: { 1: { startedAt: at, submittedAt: at, pct: 92, file: 'Transcription - Recording 1 (Fey)', f: { purpose: 'Initial consultation', discussion: '[0:00] The client explained the accident.' }, ai: { summary: 'Good. Demonstrated a good understanding of the minutes.' } } } });
  await put('learn:' + id, { v: 1, notes: { abc: { title: 'Common Terms', day: 1, takeaways: ['One takeaway', 'Two takeaway', 'Three takeaway'], question: 'Why?', updatedAt: at } } });
  await put('lor:' + id, { letters: { lor1p: { fields: { 'Client’s Name': 'Jane Client' }, updatedAt: at } } });
  await put(`guide:${id}:medlor`, { html: '<h1>Sending the MedLOR</h1><ol><li>Open the contact card</li></ol><img src="x" onerror="window.__pwned=1"><script>window.__pwned=2<\/script>', words: 12, imgs: 0, submittedAt: at });
  // a mock call scored on its scorecard, and a shared Weekly Ranking row
  await put('labreview:' + id, { acts: { 'reception-live': { status: 'Passed', score: 83, comment: 'Clear introduction.', date: at.slice(0, 10), at, rubric: { key: 'reception', scores: [5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], feedback: ['', '', '', '', '', '', '', 'Missed the claim number.'], avg: 4.14 } } } });
  await put('rankshare:' + id, { weeks: { [`${BATCH}|1`]: { batch: BATCH, week: 1, title: `${BATCH} RANKING REPORT WEEK 1`, avg: 4.32, rank: 2, of: 9, notes: 'Keep the tracker current.', sharedAt: at,
    cols: [{ label: 'Tracker', type: 'score', max: 5, raw: '4.5', mark: 4.5, note: 'Initial feedback implemented.' }, { label: 'PI Reading Task', type: 'score', max: 40, raw: '35', mark: 4.38, note: '' }] } } });

  /* ---------- the trainer ---------- */
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'sendfeedback'; goto('admin'); });
  await page.waitForTimeout(2000);
  await page.evaluate(b => FTFeedback.batch(b), BATCH); await page.waitForTimeout(2500);
  const tabs = await page.evaluate(() => (document.querySelector('.lp-admin-row') || {}).innerText || '');
  if (!/Send Feedback/.test(tabs)) fail(`📝 Send Feedback is not in the Scorecard section: ${tabs}`);
  const rows = await page.$$eval('.tfb-tbl tbody tr', t => t.map(r => r.innerText.replace(/\s+/g, ' ')));
  for (const w of ['Transcription Activity Interview Recording 1', 'Video Notes Common Terms', 'LOR Drafting Activity', 'Process Guide Sending the MedLOR']) if (!rows.some(r => r.includes(w))) fail(`"To review" has no ${w}: ${JSON.stringify(rows)}`);
  // the transcription: the work, the AI's evaluation, then the feedback
  await page.click('.tfb-tbl tbody tr:has-text("Interview Recording 1")'); await page.waitForTimeout(600);
  const work = await page.evaluate(() => (document.querySelector('.tfb-panel') || {}).innerText || '');
  if (!/Initial consultation/.test(work) || !/The client explained the accident/.test(work) || !/AI’s evaluation/i.test(work)) fail(`the transcription's work isn't shown to the trainer: ${work.slice(0, 300)}`);
  await page.selectOption('.tfb-form [data-verdict]', 'Good, with Improvements Needed.');
  await page.fill('.tfb-form [data-score]', '88');
  await page.fill('.tfb-form [data-comment]', 'Demonstrated a good understanding. However, improvement is needed in the <b>timestamps</b>.');
  await page.click('.tfb-form >> text=Send to the trainee'); await page.waitForTimeout(1500);
  const fb = ((await get('trainerfb:' + id)) || {}).items || {};
  const it = fb['transcribe:1'];
  if (!it || it.score !== 88 || it.verdict !== 'Good, with Improvements Needed.' || !/timestamps/.test(it.comment)) fail(`the feedback wasn't saved: ${JSON.stringify(fb)}`);
  if ((await page.$$eval('.tfb-tbl tbody tr', t => t.filter(r => /Interview Recording 1/.test(r.innerText)).length))) fail('sent feedback is still listed "To review"');
  await page.evaluate(() => FTFeedback.status('sent')); await page.waitForTimeout(300);
  if (!/Sent/.test(await page.evaluate(() => (document.querySelector('.tfb-tbl tbody tr') || {}).innerText || ''))) fail('"Sent" doesn\'t list the feedback just sent');
  await page.evaluate(() => FTFeedback.status('todo')); await page.waitForTimeout(300);
  // the guide: read when opened, nothing in it runs
  await page.click('.tfb-tbl tbody tr:has-text("Sending the MedLOR")'); await page.waitForTimeout(1500);
  if (!(await page.$('.tfb-guide ol li'))) fail('the guide wasn\'t shown to the trainer');
  if (await page.evaluate(() => window.__pwned) || /onerror|<script/i.test(await page.evaluate(() => (document.querySelector('.tfb-guide') || {}).innerHTML || ''))) fail('code in a trainee\'s guide reached the trainer\'s page');

  /* ---------- the trainee ---------- */
  await page.evaluate(([tid]) => { state.isAdmin = false; state.traineeId = tid; try { localStorage.removeItem('ft_fb_seen'); } catch (e) {} }, [id]);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);
  await page.evaluate(() => goto('transcribe')); await page.waitForTimeout(2000);
  const card = await page.evaluate(() => { const c = document.getElementById('tfbPage'); return c ? { text: c.innerText, isNew: !!c.querySelector('.tfb-badge'), bold: !!c.querySelector('p b') } : null; });
  if (!card) fail('the Transcription Activity page has no "Feedback from your trainer"');
  else {
    if (!/Good, with Improvements Needed\./.test(card.text) || !/88%/.test(card.text) || !/<b>timestamps<\/b>/.test(card.text)) fail(`the trainee's card doesn't show the feedback as text: ${card.text}`);
    if (!card.isNew) fail('new feedback isn\'t marked NEW');
    if (card.bold) fail('the trainer\'s comment was drawn as HTML');
  }
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(500);
  await page.evaluate(() => goto('transcribe')); await page.waitForTimeout(1500);
  if (await page.$('#tfbPage .tfb-badge')) fail('feedback already seen is still NEW');
  // 📬 My Feedback
  await page.evaluate(() => goto('myfeedback')); await page.waitForTimeout(2500);
  const mf = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/My Feedback/.test(mf) || !/Interview Recording 1/.test(mf)) fail('📬 My Feedback doesn\'t list the transcription\'s feedback');
  if (!/Reception Mock Call/.test(mf) || !/4\.14\/5/.test(mf)) fail('📬 My Feedback doesn\'t show the Reception Mock Call\'s scorecard');
  if (!/Week 1 · rank 2 of 9/.test(mf) || !/4\.32\/5/.test(mf) || !/35\/40 → 4\.38\/5/.test(mf)) fail(`📬 My Feedback doesn't show the shared Weekly Ranking row: ${mf.slice(0, 600)}`);
  const pages = await page.evaluate(() => JSON.stringify((window.LSH_PROGRAM || {}).modules || []));
  if (!/"myfeedback"/.test(pages)) fail('📬 My Feedback is not in 📂 My Pages');
  // 🏅 My Performance
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  const sc = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/Trainer feedback/.test(sc) || !/Interview Recording 1/.test(sc) || !/88%/.test(sc)) fail('🏅 My Performance has no 📝 Trainer feedback score');
  if (!/Weekly Ranking/.test(sc) || !/rank 2 of 9/.test(sc)) fail('🏅 My Performance has no 📊 Weekly Ranking');
  if (!/scorecard 4\.14\/5/.test(sc)) fail('🏅 My Performance doesn\'t show the Reception Mock Call\'s scorecard average');

  for (const k of ['trainerfb:', 'transcribe:', 'learn:', 'lor:', 'labreview:', 'rankshare:']) await put(k + id, null);
  await put(`guide:${id}:medlor`, null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await put('settings:opendays', openBefore || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Trainer feedback test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Trainer feedback test passed (the work to review by batch: a transcription, video notes, a letter, a guide; the work and the AI\'s evaluation shown; a verdict, score and comment sent and saved, no longer "To review"; a guide read when opened, code cleaned out; the trainee\'s card on the activity page, NEW until seen, as text; 📬 My Feedback with the mock call\'s scorecard and the shared Weekly Ranking row; 🏅 My Performance\'s Trainer feedback and Weekly Ranking; trainerfb and rankshare trainer-owned).');
})().catch(e => { console.error(e); process.exit(1); });
