// 🎧 Transcription Activity (js/ft-transcribe.js): the Day 9 assignment run end to end by a trainee.
//   the card in the Practice Lab's 🧰 Drafting Tools → #/transcribe → the attorney's request → ▶ start (the recording
//   and the stopwatch) → the minutes with timestamps (Alt+T) → the file name and its Drive link → the report back →
//   every check passes → ⬇ the Word file is named by the convention → 📤 submit, saved in transcribe:<id> and kept
//   read-only; an admin sees the trainee's minutes; Day 9's step points at the tool; Trainer Inputs lists both recordings.
// Usage: NODE_PATH=…/node_modules node .github/scripts/transcribe.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  const openBefore = await get('settings:opendays');
  await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
  await signIn(page, 'Tara', 'Scribe', 'B100926');
  const id = await page.evaluate(() => state.traineeId);
  const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
  await put('transcribe:' + id, null);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);

  // the card in 🧰 Drafting Tools, and Day 9's step
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1200);
  const lab = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/Transcription Activity/.test(lab)) fail('the Practice Lab has no 🎧 Transcription Activity card');
  const d9 = await page.evaluate(() => (FTDays.of(9).items || []).find(x => /Transcription/.test(x.t)));
  if (!d9 || d9.at !== 'tool' || d9.id !== 'transcribe') fail(`Day 9's transcription step doesn't point at the tool: ${JSON.stringify(d9)}`);

  // Day 9's deck: the interview recordings open the activity (not a video with "What I learned"), the sample is a document
  await page.evaluate(() => FTDayDecks.open(9)); await page.waitForTimeout(1500);
  const deck = await page.evaluate(() => { for (let i = 1; i < 12; i++) { FTDayDecks.to(i); const t = document.querySelectorAll('.k-transcribe');
    if (t.length) return { n: t.length, learn: document.querySelectorAll('.ftdd-learn').length, sample: [...document.querySelectorAll('.ftdd-tile')].some(x => /Sample Minutes/.test(x.innerText) && x.classList.contains('k-file')) }; } return null; });
  if (!deck || deck.n !== 2) fail(`Day 9's deck doesn't open the two recordings in the Transcription Activity: ${JSON.stringify(deck)}`);
  else {
    if (deck.learn) fail('Day 9\'s transcription slide offers "📝 What I learned" on a recording');
    if (!deck.sample) fail('Day 9\'s Sample Minutes is not shown as a document');
    await page.click('.k-transcribe >> nth=1'); await page.waitForTimeout(1500);
    if (!/Transcription - Recording 2 \(Tara\)/.test(await page.evaluate(() => state.view === 'transcribe' ? document.querySelector('main').innerText : ''))) fail('the deck\'s Recording 2 tile didn\'t open Recording 2 of the activity');
    await page.evaluate(() => FTTranscribe.tab(1));
  }

  // the request, then start
  await page.evaluate(() => goto('transcribe')); await page.waitForTimeout(1500);
  let txt = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/Atty\. Magdalena/.test(txt) || !/Transcription - Recording 1 \(Tara\)/.test(txt)) fail('the attorney\'s request doesn\'t name the task and the file name');
  if (await page.$('.tr-player iframe')) fail('the recording plays before the trainee starts');
  await page.click('text=Open the recording and start'); await page.waitForTimeout(800);
  if (!(await page.$('.tr-player iframe'))) fail('▶ start didn\'t open the recording');

  // the minutes: a timestamp from the stopwatch (Alt+T), then the rest
  await page.click('#tr-discussion'); await page.keyboard.press('Alt+t');
  const stamped = await page.$eval('#tr-discussion', el => el.value);
  if (!/^\[0:00\] $/.test(stamped)) fail(`Alt+T didn't put the stopwatch's time in the discussion: ${JSON.stringify(stamped)}`);
  const long = Array.from({ length: 110 }, (_, i) => `point${i} said`).join(' ');
  const discussion = `[0:00] The client explained the accident. ${long}\n[2:15] The attorney asked about injuries.\n[5:40] Treatment and insurance were discussed.`;
  await page.fill('#tr-discussion', discussion);
  for (const [k, v] of [['date', '2026-10-09'], ['time', '10:00 AM – 10:40 AM (PST)'], ['attendees', 'Atty. Magdalena; Jane Client'], ['purpose', 'Initial consultation on the car accident'],
    ['concerns', 'Medical bills and how long the case takes.'], ['advice', 'Keep treating; do not talk to the other insurer.'], ['actions', 'Client to send the police report by Friday\nVA to request the medical records']])
    await page.fill('#tr-' + k, v);
  await page.fill('#tr-file', 'Transcription - Recording 1 (Tara)');
  await page.fill('#tr-link', 'https://docs.google.com/document/d/abc123/edit');
  await page.fill('#tr-report', 'Hi Atty. Magdalena, the minutes of your meeting with the client are done and saved in my Assessments/Activities folder: https://docs.google.com/document/d/abc123/edit. Thank you!');
  await page.waitForTimeout(1500);
  const cs = await page.evaluate(() => FTTranscribe.checks(1));
  const miss = cs.filter(c => !c[1]).map(c => c[0]);
  if (miss.length) fail(`complete minutes should pass every check: ${miss.join('; ')}`);
  if (!/100%/.test(await page.$eval('.tr-checks .tr-pct', el => el.textContent))) fail('the checks panel didn\'t follow the typing to 100%');

  // the Word file, named by the convention
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Download as Word')]);
  if (dl.suggestedFilename() !== 'Transcription - Recording 1 (Tara).doc') fail(`the Word file is named ${dl.suggestedFilename()}`);

  // a wrong file name misses its check
  await page.fill('#tr-file', 'minutes final'); await page.waitForTimeout(300);
  if ((await page.evaluate(() => FTTranscribe.checks(1)))[4][1]) fail('a file name off the convention passes its check');
  await page.fill('#tr-file', 'Transcription - Recording 1 (Tara)');

  // submit: saved, read-only
  await page.click('#trSubmit'); await page.waitForTimeout(2500);
  const saved = await get('transcribe:' + id);
  const r1 = saved && saved.r && saved.r[1];
  if (!r1 || !r1.submittedAt || r1.pct !== 100 || !/Recording 1 \(Tara\)/.test(r1.file) || !/point109/.test(r1.f.discussion)) fail(`the submission wasn't saved: ${JSON.stringify(r1 && { s: r1.submittedAt, pct: r1.pct, file: r1.file })}`);
  if (!(await page.$eval('#tr-discussion', el => el.disabled))) fail('a submitted transcription can still be edited');
  txt = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/Submitted/.test(txt)) fail('the page doesn\'t say it was submitted');
  // Recording 2 is its own assignment
  await page.evaluate(() => FTTranscribe.tab(2)); await page.waitForTimeout(500);
  if (!/Transcription - Recording 2 \(Tara\)/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('Recording 2 doesn\'t ask for its own file name');

  // the trainer: the trainee's minutes on the page, and both recordings in Trainer Inputs
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; goto('transcribe'); }); await page.waitForTimeout(3000);
  const adm = await page.evaluate(() => (document.querySelector('.tr-admin') || {}).innerText || '');
  if (!/Tara Scribe/.test(adm) || !/words/.test(adm)) fail(`the trainer doesn't see the trainee's minutes: ${adm.slice(0, 200)}`);
  const acts = await page.evaluate(() => FTSessions.forLesson ? JSON.stringify(FTSessions.forLesson(6)) : '');
  if (!/transcription-1/.test(acts) || !/transcription-2/.test(acts)) fail('Trainer Inputs doesn\'t list the two transcriptions');

  await put('settings:opendays', openBefore || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Transcription Activity test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Transcription Activity test passed (the Drafting Tools card and Day 9\'s step; Day 9\'s deck opens each recording\'s assignment and shows the sample as a document; the request; ▶ start opens the recording; Alt+T timestamps; every check passes on complete minutes and a wrong file name misses; the Word file named by the convention; submitted, saved and read-only; Recording 2 its own; the trainer sees the minutes and both recordings in Trainer Inputs).');
})().catch(e => { console.error(e); process.exit(1); });
