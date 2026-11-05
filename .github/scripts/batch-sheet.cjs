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
  // her six Drive links; the Monitoring Sheet's last check couldn't open it
  // (the six monitored links: the Typing Tests folder not verified yet; the others ✓ opening, locked for their link)
  const L6 = { folder: 'https://drive.google.com/drive/folders/abcdefghijklmn', tracker: 'https://docs.google.com/spreadsheets/d/abcdefghijklmn/edit', monitor: 'https://docs.google.com/document/d/abcdefghijklmn/edit',
    tam: 'https://docs.google.com/document/d/tamtamtamtamtam/edit', typing: 'https://drive.google.com/drive/folders/typingtypingty', spelling: 'https://drive.google.com/drive/folders/spellingspell' };
  await put('drive:' + ids.Ada, Object.assign({ days: {} }, L6));
  const ck = (k, ok) => ({ url: L6[k], ok, error: ok ? '' : 'the system can\'t open it', at: iso(now - 7200e3) });
  await put('trackerreview:' + ids.Ada, { days: {}, monitor: { pct: 0, found: 0, total: 0, entries: [], error: 'The system can\'t open this file.', url: L6.monitor, checkedAt: iso(now - 7200e3) },
    verify: { monitor: ck('monitor', false), tam: ck('tam', true), spelling: ck('spelling', true), folder: ck('folder', true), tracker: ck('tracker', true) }, verifyAt: iso(now - 7200e3),
    compliance: { '2026-11-02': { pct: 54, parts: { tracker: 50, tests: 67, outputs: 0, eod: 100 }, tests: { AM: true, PM: false, SP: true }, links: 0, saved: 0, submissions: ['Assessment: Common Terms Used'] } } });
  { const rv = await get('trackerreview:' + ids.Ada);
    rv.days = { '2026-11-02': { pct: 50, rules: [{ id: 'notes', label: 'Every open task has its Daily Note', pass: false, detail: '2 tasks without a note' }], review: 'AI-NOTES: clear notes; add the next step on each task.', comment: 'TRAINER-NOTE: good start.' } };
    await put('trackerreview:' + ids.Ada, rv); }
  // 🧑‍🏫 her Reception Mock Call, scored on the rubric with remarks (📅 Day 1–16: Detailed Scores, with its context)
  await put('labreview:' + ids.Ada, { acts: { 'reception-live': { status: 'Passed', score: 76, comment: 'Good call control overall.', at: iso(now - 3600e3),
    rubric: { key: 'reception', scores: [5, 4, 2, 4, 4, 3, 4], feedback: ['Warm, branded greeting.', '', 'Skipped the caller verification.', '', '', '', ''], avg: 3.8 } } } });
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
  // (no 👥 Trainees & Batches, Trainee Audit, 📁 Batch Folders or 💬 Trainee Feedback tab: the Main Portal approves trainees,
  // and the trainees' feedback is still kept)
  if (/Trainees & Batches|Trainee Audit|Batch Folders|Trainee Feedback/.test(row.join(' '))) fail(`🏅 Scorecard still has a tab the Batch Sheet replaced: ${row.join(' | ')}`);
  if (/Overall Performance|🏅 Scorecards/.test(row.join(' '))) fail(`🏅 Scorecards / 📈 Overall Performance still have tabs (they are on the Batch Sheet): ${row.join(' | ')}`);
  await put('tfeedback:keep-me', { id: 'keep-me', at: iso(now), dayId: 1, ratings: { lessons: 5 }, good: 'Kept after the move', improve: '', facilitator: '', anonymous: false, name: 'Ada Active', batch: BATCH, status: 'new' });
  await page.evaluate(() => { state.adminTab = 'tfeedback'; state.tfbAdmin = null; render(); }); await page.waitForTimeout(1500);
  const fbText = await page.evaluate(() => document.querySelector('main').innerText);
  if (!/Kept after the move/.test(fbText)) fail('💬 Trainee Feedback no longer shows the saved feedback');
  // one place for feedback, with a batch filter
  await page.evaluate(b => { state.tfbFilter = { batch: b }; render(); }, BATCH); await page.waitForTimeout(400);
  if (!/Kept after the move/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('💬 Trainee Feedback\'s batch filter hides the batch\'s feedback');
  await page.evaluate(() => { state.tfbFilter = { batch: 'B999999' }; render(); }); await page.waitForTimeout(400);
  if (/Kept after the move/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('💬 Trainee Feedback\'s batch filter shows another batch\'s feedback');
  await page.evaluate(() => { state.tfbFilter = {}; render(); });
  // 📁 Batch Folders: Registry and Rankings only (its Feedback and Activities are 💬 Trainee Feedback and the Batch Sheet)
  await page.evaluate(b => { state.adminTab = 'batches'; render(); if (typeof openBatchFolder === 'function') openBatchFolder(b.toLowerCase ? b : b, 'feedback'); }, BATCH); await page.waitForTimeout(800);
  const bft = await page.evaluate(() => [...document.querySelectorAll('.bf-tabs button')].map(x => x.innerText.trim()).join(' | '));
  if (bft && (/Feedback|Activities/.test(bft) || !/Registry/.test(bft))) fail(`📁 Batch Folders' tabs: ${bft}`);
  await page.evaluate(() => { state.adminTab = 'tfeedback'; render(); }); await page.waitForTimeout(400);
  const secOn = await page.evaluate(() => (document.querySelector('.lp-admin-sec.active') || {}).innerText || '');
  if (!/Scorecard/.test(secOn)) fail(`💬 Trainee Feedback opens under "${secOn}", not 🏅 Scorecard`);
  await page.evaluate(() => { state.adminTab = 'attendance'; render(); }); await page.waitForTimeout(1200);
  const adm = await page.evaluate(() => [...document.querySelectorAll('.lp-admin-row .admin-tab-btn')].map(x => x.innerText.trim()).join(' | '));
  if (/Trainee Audit|Batch Folders|Trainee Feedback/.test(adm)) fail(`🛡 Admin Master Control still lists them: ${adm}`);
  await page.evaluate(() => { state.adminTab = 'batchsheet'; render(); }); await page.waitForTimeout(400);
  await page.evaluate(b => FTBatchSheet.batch(b), BATCH);
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the sheet never finished loading'));
  await page.waitForTimeout(500);
  // 🏅 the simplified scorecard first: the Score Card and the compliance on top, then 📊 Weekly Ranking and
  // 📤 Daily outputs; the other tables under ▸ More detail (shut until opened)
  const top = await page.evaluate(() => [...document.querySelectorAll('.bs-card > .bs-sec, .bs-card > details.bs-more')].map(x => x.id || (x.classList.contains('bs-more') ? 'more' : '')).filter(Boolean));
  if (JSON.stringify(top.slice(0, 5)) !== JSON.stringify(['bs-scorecard', 'bs-compliance', 'bs-ranking', 'bs-outputs', 'more'])) fail(`the page's order is ${top.join(', ')}`);
  if (await page.evaluate(() => document.querySelector('details.bs-more').open)) fail('▸ More detail is open before the trainer opens it');
  await page.evaluate(() => { FTBatchSheet.more(true); render(); }); await page.waitForTimeout(500);
  const T = await page.evaluate(() => FTBatchSheet.tables().map(t => ({ id: t.id, head: t.head, rows: t.rows.map(r => r.map(c => String(c.v))) })));
  const by = id => T.find(t => t.id === id) || { rows: [], head: [] };
  if (JSON.stringify(T.map(t => t.id)) !== JSON.stringify(['scorecard', 'compliance', 'outputs', 'dayscores', 'trainees', 'drive', 'lessons', 'days', 'practice', 'scores', 'recent'])) fail(`the tables are ${T.map(t => t.id)}`);
  if ((await page.$$('.bs-sec:not(.bs-rank):not(.bs-people)')).length !== 11) fail('the eleven tables are not all on the one page');
  // 🏅 Score Card: per lesson ✍️ Knowledge Checks, 🛠 Practice, Classroom & outputs, Average, Remarks; Ada's Lesson 1 Knowledge
  // Check (90%) and her Reception Mock Call (76%, Practice of the Reception lesson)
  const scd = by('scorecard'), sa = scd.rows.find(r => /Ada/.test(r[0]));
  if (JSON.stringify(scd.head.slice(0, 7)) !== JSON.stringify(['Trainee', 'Overall', '✍️ Knowledge Checks', '🛠 Practice', 'Classroom & outputs', 'Average', 'Remarks / Trainer Feedback'])) fail(`🏅 Score Card's columns: ${scd.head.slice(0, 7)}`);
  if (!sa || sa[2] !== '90%' || !sa.includes('76%')) fail(`Ada's Score Card: ${sa && sa.slice(0, 12)}`);
  // Compliance and Platform Utilization: the six Drive links side by side (no dropdown), how many are correct first, the progress
  const cpl = by('compliance'), ca = cpl.rows.find(r => /Ada/.test(r[0]));
  if (JSON.stringify(cpl.head) !== JSON.stringify(['Trainee', 'Links correct', '📒 Monitoring Sheet', '📘 TAM', '⌨️ Typing Tests', '🔤 Spelling Tests', '📁 Assessments/Activities', '📋 Daily Task Tracker', 'Lesson decks', 'Knowledge Checks passed', 'Last on the platform'])) fail(`the compliance table's columns: ${cpl.head}`);
  // (her Monitoring Sheet ✗ Wrong, the Typing Tests folder ⏳ Pending — not checked yet — the other four ✓ Correct: 4 of 6)
  if (!ca || ca[1] !== '4 / 6' || ca[2] !== '✗ Wrong' || ca[3] !== '✓ Correct' || ca[4] !== '⏳ Pending' || ca.slice(5, 8).some(v => v !== '✓ Correct')) fail(`Ada's six links side by side: ${ca && ca.slice(0, 8)}`);
  if (await page.$('#bs-compliance select')) fail('the compliance table still has a dropdown');
  // (why a link is wrong: on a hover, the cell's title, and on a click, the formula bar)
  const why = await page.evaluate(() => { const r = [...document.querySelectorAll('#bs-compliance tbody tr')].find(tr => /Ada/.test(tr.innerText)); const td = r && r.querySelector('td[data-c="2"]'); return td ? td.title : ''; });
  if (!/Monitoring Sheet/.test(why) || !/can.t open/.test(why)) fail(`a wrong link doesn't say why on a hover: ${why}`);
  // 📁 one share per batch: connected as the service account, a link the system can't open names the batch, the trainee and the
  // address to share the batch folder with; 🔁 check them now opens their links again
  await page.route('**/api/drive/status', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ sa: true, saOk: true, email: 'lsh-training-drive@ci.iam.gserviceaccount.com', subject: '' }) }));
  const verified = []; await page.route('**/api/drive/verify', r => { verified.push(JSON.parse(r.request().postData() || '{}').id); r.fulfill({ contentType: 'application/json', body: '{"ok":true,"verify":{}}' }); });
  await page.evaluate(() => FTBatchSheet.dstat()); await page.waitForTimeout(1500);
  const sb = await page.evaluate(() => (document.querySelector('.bs-share') || {}).innerText || '');
  if (!/Batch B\d{6}’s files can’t be opened yet/.test(sb) || !/Ada Active/.test(sb) || !/lsh-training-drive@ci\.iam\.gserviceaccount\.com/.test(sb) || !/One share covers all its trainees/.test(sb)) fail(`no one-share-per-batch prompt naming the batch, the trainee and the address: ${sb.slice(0, 300)}`);
  await page.evaluate(() => FTBatchSheet.recheckLinks()); await page.waitForTimeout(1500);
  if (!verified.includes(ids.Ada)) fail(`🔁 check them now didn't check Ada's links again: ${verified}`);
  await page.unroute('**/api/drive/status'); await page.unroute('**/api/drive/verify');
  await page.evaluate(() => FTBatchSheet.dstat()); await page.waitForTimeout(800);
  // 📅 Day 1–16: Detailed Scores, first: Ada's Day 4 is her Reception Mock Call; under it her days in detail, each score with
  // why it was scored that way, what to improve and what she did best; then the 📊 Weekly Ranking for the batch
  const ds = by('dayscores'), dsa = ds.rows.find(r => /Ada/.test(r[0]));
  if (ds.head.length !== 18 || ds.head[2] !== 'Day 1' || ds.head[17] !== 'Day 16') fail(`📅 Day 1–16's columns: ${ds.head}`);
  if (!dsa || dsa[5] !== '76%') fail(`Ada's Day 4 isn't her Reception Mock Call's 76%: ${dsa}`);
  await page.evaluate(id => FTBatchSheet.dsWho(id), ids.Ada); await page.waitForTimeout(400);
  const dx = await page.evaluate(() => { const it = [...document.querySelectorAll('.bs-ds-it.is-rich')].find(x => /Reception/i.test(x.textContent)); return it ? it.innerText : ''; });
  if (!/Why this score/i.test(dx) || !/3\.80\/5/.test(dx) || !/did best[\s\S]*Warm, branded greeting/i.test(dx) || !/to be improved[\s\S]*Skipped the caller verification/i.test(dx)) fail(`the mock call's context (why, best, to improve): ${dx}`);
  const rkAt = await page.evaluate(() => { const a = document.getElementById('bs-compliance'), r = document.getElementById('bs-ranking'); return !!(a && r && a.nextElementSibling === r && r.querySelector('.rk-bar')); });
  if (!rkAt) fail('the 📊 Weekly Ranking is not right under the Score Card and the compliance');

  // 👥 everyone registered, from the moment they register
  const tr = by('trainees').rows, names = tr.map(r => r[0]);
  if (tr.length !== 3) fail(`👥 Trainees has ${tr.length} rows: ${names}`);
  const cy = tr.find(r => /Cy/.test(r[0])), ben = tr.find(r => /Ben/.test(r[0])), ada = tr.find(r => /Ada/.test(r[0]));
  if (!cy || cy[1] !== 'Waiting for approval') fail(`a trainee waiting for approval isn't listed as such: ${cy}`);
  if (!ben || ben[1] !== 'Approved' || !ben[2]) fail(`a trainee with no progress isn't listed with their registration: ${ben}`);
  if (!ada || !/^1 \//.test(ada[4]) || !/^1 \//.test(ada[5]) || !/Lesson deck/.test(ada[6])) fail(`Ada's decks / Knowledge Checks / last opened: ${ada}`);

  // 🔄 Update all scores: one call per approved trainee (redo), then the sheet is read again
  { const asked = []; const watch = r => { if (/\/api\/compliance\/backfill/.test(r.url()) && /"redo":true/.test(r.postData() || '')) asked.push(JSON.parse(r.postData()).ids[0]); };
    page.on('request', watch);
    await page.click('button.bs-upd');
    await page.waitForFunction(() => { const b = document.querySelector('button.bs-upd'); return b && !b.disabled && /Update all scores/.test(b.textContent); }, null, { timeout: 30000 }).catch(() => fail('🔄 Update all scores never finished'));
    await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the sheet wasn\'t read again after 🔄 Update all scores'));
    page.off('request', watch);
    const want = tr.filter(r => r[1] === 'Approved').length;
    if (asked.length !== want) fail(`🔄 Update all scores asked for ${asked.length} trainees, not the ${want} approved: ${asked}`); }

  // 📁 Drive links: Ada 3 / 3 with the Monitoring Sheet flagged; Ben none
  const dlinks = by('drive'), da = dlinks.rows.find(r => /Ada/.test(r[0])), db = dlinks.rows.find(r => /Ben/.test(r[0]));
  // (the columns: Monitoring Sheet, TAM, Typing Tests, Spelling Tests, Assessments/Activities, Daily Task Tracker)
  if (!da || da[1] !== '6 / 6' || !/Inaccessible/.test(da[2]) || da[3] !== '✓ opening' || !/Pending/.test(da[4]) || da[5] !== '✓ opening' || da[6] !== '✓ opening' || da[7] !== '✓ opening' || /Not yet/.test(da[8])) fail(`📁 Drive links for Ada: ${da}`);
  if (!db || db[1] !== '0 / 6' || db.slice(2, 8).some(x => x !== '—')) fail(`📁 Drive links for Ben, who linked nothing: ${db}`);

  // 📚 Ada's first lesson: deck finished, Knowledge Check 90%
  const ls = by('lessons').rows.find(r => /Ada/.test(r[0]));
  if (!ls || ls[1] !== 'Deck ✓ · Check 90%') fail(`📚 Lessons for Ada: ${ls && ls.slice(0, 2)}`);
  const lb = by('lessons').rows.find(r => /Ben/.test(r[0]));
  if (!lb || lb.slice(1).some(Boolean)) fail(`📚 Ben has done nothing, yet his row has: ${lb}`);

  // 📅 Day by Day: a column per training day; Ada's Day 1 has the Knowledge Check ticked by itself (and her scored Reception
  // Mock Call is 1 of the Mock Calls & Demos); a trainer ticks a classroom activity
  const dd = by('days');
  if (dd.head.length !== 7 + await page.evaluate(() => FTDays.DAYS.length) || dd.head[7] !== 'Day 1' || dd.head[1] !== 'Average score' || dd.head[2] !== 'Days complete' || JSON.stringify(dd.head.slice(3, 7)) !== JSON.stringify(['✍️ Knowledge Checks', '🛠 Practice', '🎙 Mock Calls & Demos', '🏫 Classroom & outputs'])) fail(`📅 Day by Day's columns: ${dd.head.slice(0, 8)}`);
  const adaKinds = dd.rows.find(r => /Ada/.test(r[0]));
  // (scores, not counts: Ada's Knowledge Check 90%; her Reception Mock Call, scored 76% by the trainer)
  if (!adaKinds || adaKinds[3] !== '90%' || adaKinds[5] !== '76%' || !/^\d+%$/.test(adaKinds[1])) fail(`Ada's average / Knowledge Checks / Mock Calls & Demos across the days: ${adaKinds && adaKinds.slice(1, 7)}`);
  // (no ✅ Checklist panel under the table any more; a trainer's tick, saved as before, still counts in the day)
  if (await page.$('#bs-days .bs-ck, .bs-ck-who select[onchange*="ckWho"]')) fail('the ✅ Checklist panel is still under 📅 Day by Day');
  const roomT = await page.evaluate(() => (FTDays.of(1).items.find(i => i.at === 'room') || {}).t);
  await page.evaluate(([id, k]) => FTBatchSheet.tick(id, k, true), [ids.Ada, '1|' + roomT]); await page.waitForTimeout(1500);
  const dc = await get('daycheck:' + ids.Ada);
  if (!dc || !dc.items || !dc.items['1|' + roomT] || !dc.items['1|' + roomT].done) fail(`a trainer's tick wasn't saved: ${JSON.stringify(dc)}`);
  const d1 = (await page.evaluate(() => FTBatchSheet.tables().find(t => t.id === 'days').rows.find(r => /Ada/.test(r[0].v))))[7];
  if (!/^\d+%$/.test(d1.v.replace('✓ ', '')) || !/Process Questions 90%/.test(d1.f) || !/ [2-9]\d* of \d+ done/.test(d1.f)) fail(`Ada's Day 1 isn't her score with the ticks counted: ${d1.v} · ${d1.f}`);

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
  if (sh[sh.length - 2] !== 'Overall %' || sh[sh.length - 1] !== 'Rank' || !sh.includes('Daily compliance') || !sh.includes('Weeks average (/5)') || !sh.includes('Scorecard overall')) fail(`🏅 Scores' columns: ${sh}`);
  // 🔎 a trainee's grades in detail (what 🏅 Scorecards showed): Ada's Knowledge Check 90%
  if (!(await page.evaluate(() => /Grades in detail/.test(document.getElementById('bs-scores').innerText)))) fail('🏅 Scores has no grades in detail');
  if (!(await page.evaluate(() => /Scorecard overall: .*= the average of/.test(document.getElementById('bs-scores').innerText)))) fail('🔎 Grades in detail has no breakdown of the overall');
  // (no ✍️ Process Questions table: the Score Card's ✍️ Knowledge Checks carries those scores)
  if (await page.evaluate(() => !!document.getElementById('bs-process') || /Scoring rationale/.test(document.querySelector('.bs-card').innerText))) fail('the ✍️ Process Questions table or its scoring rationale is still on the page');

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
  // (her own 📅 Day 1–16 scores first, with her days in detail; no Weekly Ranking: that is the batch's)
  if (MT[0].id !== 'scorecard' || MT[1].id !== 'compliance' || !MT.some(x => x.title === '👤 Me')) fail(`the trainee's first tables are ${MT.slice(0, 2).map(x => x.title)}`);
  if (await page.$('.bs-mine #bs-ranking')) fail('a trainee sees the batch\'s Weekly Ranking');
  // (her 📤 Daily outputs with each activity's score box and its comment, in the table)
  if (!/TRAINER-NOTE/.test(await page.evaluate(() => [...document.querySelectorAll('.bs-mine #bs-outputs td.bs-ocell')].map(td => td.innerText).join(' ')))) fail('the trainee doesn\'t see her days\' comments in 📤 Daily outputs');
  // (no checklist on her page either, and no trainer's picker)
  if (await page.$('.bs-mine .bs-item, .bs-mine .bs-ck-who')) fail('the trainee\'s page still has the checklist or a trainer\'s picker');
  for (const x of MT) if (x.names.some(n => n && !/Ada/.test(n))) fail(`📋 My Progress (${x.id}) shows someone else: ${x.names}`);
  if (MT.find(x => x.id === 'scores').head.includes('Rank')) fail('a trainee sees the batch rank column');
  const text = await page.evaluate(() => document.querySelector('.bs-mine').innerText);
  if (/Ben Blank|Cy Waiting|Dee Glitch/.test(text)) fail('another trainee\'s name is on the trainee\'s page');
  if (await page.$('.bs-mine .gs-batch select, .bs-mine .bs-fix, .bs-mine .bs-back')) fail('a trainee has the batch picker or a trainer\'s tool');
  if (/Fix the batch name|Bring them back|Update all scores/.test(text)) fail('a trainee sees a trainer\'s tool');
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

  // 👥 Trainees & Batches / Approvals & Batches: gone (the Main Portal approves trainees): no tab in any section, no section at
  // the foot of the sheet, no "Go to" link; 📋 Task Trackers has no tab either. A trainee approved on this platform shows at once.
  const tabs2 = await page.evaluate(() => (document.querySelector('.lp-admin-row') || {}).innerText || '');
  if (/Trainees & Batches|Trainee Feedback/.test(tabs2) || !/Batch Sheet/.test(tabs2)) fail(`🏅 Scorecard's tabs: ${tabs2}`);
  await page.evaluate(() => { const b = [...document.querySelectorAll('.lp-admin-sec')].find(x => /Admin Master Control/.test(x.innerText)); if (b) b.click(); });
  await page.waitForTimeout(600);
  const tabs3 = await page.evaluate(() => (document.querySelector('.lp-admin-row') || {}).innerText || '');
  if (/Trainees & Batches/.test(tabs3)) fail(`🛡 Admin Master Control still has a 👥 Trainees & Batches tab: ${tabs3}`);
  const allTabs = await page.evaluate(() => [...document.querySelectorAll('.lp-admin-sec')].map(b => { b.click(); return (document.querySelector('.lp-admin-row') || {}).innerText || ''; }).join(' | '));
  if (/Task Trackers/.test(allTabs)) fail(`📋 Task Trackers still has a tab: ${allTabs}`);
  await page.evaluate(() => { state.adminTab = 'batchsheet'; state.adminData = null; render(); }); await page.waitForTimeout(2500);
  const foot = await page.evaluate(() => ({ people: !!document.getElementById('bs-people'), link: /Approvals &|Trainees &/.test((document.querySelector('.bs-jump') || {}).innerText || '') }));
  if (foot.people || foot.link) fail(`the Batch Sheet still has 👥 Approvals & Batches: ${JSON.stringify(foot)}`);
  // the batch menu: the Batch picker and 📦 Archive batch, which opens the archive dialog (js/ft-batch-admin.js) for the batch on screen
  if (!(await page.$('.bs-batchmenu select'))) fail('the batch menu has no Batch picker');
  if (!(await page.$('.bs-archive'))) fail('the batch menu has no 📦 Archive batch');
  else {
    await page.click('.bs-archive'); await page.waitForTimeout(1500);
    const dlg = await page.evaluate(() => { const o = document.querySelector('.fba-ov'); return o ? o.innerText : ''; });
    if (!/Archive/.test(dlg) || !dlg.includes(BATCH) || !/Google Drive folder link/.test(dlg) || !/Delete the batch/.test(dlg)) fail(`📦 Archive batch doesn't open the batch's archive dialog: ${dlg.slice(0, 200)}`);
    if (await page.$('.fba-ov [data-cancel]')) { await page.click('.fba-ov [data-cancel]'); await page.waitForTimeout(1500); }
    if (await page.$('.fba-ov')) fail('the archive dialog didn\'t close on Cancel');
  }
  await page.evaluate(id => approveTrainee(id), ids.Cy); await page.waitForTimeout(2500);
  if (!((await get('trainee:' + ids.Cy)) || {}).approved) fail('approveTrainee didn\'t approve Cy');
  const cyRow = await page.evaluate(() => { const t = FTBatchSheet.tables(); const r = t && t.find(x => x.id === 'trainees').rows.find(r => /Cy/.test(r[0].v)); return r ? r[1].v : ''; });
  if (cyRow !== 'Approved') fail(`the 👥 Trainees table doesn't show Cy approved: ${cyRow}`);
  if (await page.evaluate(() => state.adminTab) !== 'batchsheet') { await page.evaluate(() => { state.adminTab = 'batchsheet'; render(); }); await page.waitForTimeout(2500); }

  // 📤 Daily outputs: in the table, each day's cell has every activity's score in a little box and its comment, two sentences
  // at most (no 💬 Comments list under the table any more)
  const oc = await page.evaluate(() => { const T = FTBatchSheet.tables().find(t => t.id === 'outputs'), ci = T.head.findIndex(h => /\b11\/2\b/.test(h));
    const tr = [...document.querySelectorAll('#bs-outputs tbody tr')].find(r => /Ada/.test(r.innerText)); const c = ci > 0 && tr && tr.querySelector(`td.bs-ocell[data-c="${ci}"]`);
    return c ? { text: c.innerText, acts: [...c.querySelectorAll('.bs-oacts li')].map(li => ({ k: li.dataset.act, box: li.querySelector('.bs-sbox').innerText, say: li.querySelector('span').innerText })) } : null; });
  if (!oc) fail('📤 Daily outputs has no day cell with the activities for Ada');
  else {
    const by = k => oc.acts.find(a => a.k === k) || { box: '', say: '' };
    if (oc.acts.map(a => a.k).join() !== 'tracker,tests,outputs,eod') fail(`Ada's day doesn't list her activities: ${oc.acts.map(a => a.k)}`);
    if (by('tracker').box !== '50%' || !/0 of 1 checks met; to fix: Every open task has its Daily Note/.test(by('tracker').say) || !/TRAINER-NOTE/.test(by('tracker').say)) fail(`the Task Tracker's box and comment: ${JSON.stringify(by('tracker'))}`);
    if (by('tests').box !== '67%' || !/afternoon typing test/.test(by('tests').say)) fail(`the tests' box and comment: ${JSON.stringify(by('tests'))}`);
    if (by('outputs').box !== '0%' || !/No output link submitted/.test(by('outputs').say) || !/Common Terms Used/.test(by('outputs').say)) fail(`the outputs' box and comment: ${JSON.stringify(by('outputs'))}`);
    const long = oc.acts.filter(a => (a.say.match(/[.!?…](\s|$)/g) || []).length > 2);
    if (long.length) fail(`an activity's comment is longer than two sentences: ${long.map(a => a.say).join(' / ')}`);
  }
  if (await page.$('#bs-outputs .bs-oc, #bs-outputs .bs-ck-who')) fail('the 💬 Comments list is still under 📤 Daily outputs');
  // (the AI's full review stays in the cell's formula bar text, and ⬇ Download carries the comments)
  const ocF = await page.evaluate(() => { const T = FTBatchSheet.tables().find(t => t.id === 'outputs'); const r = T.rows.find(r => /Ada/.test(r[0].v)); return r ? r.map(c => (c.f || '') + '|' + (c.csv || '')).join(' ') : ''; });
  if (!/AI-NOTES/.test(ocF) || !/Typing & Spelling 67%: Took/.test(ocF)) fail(`the day's full text (formula bar / download) is missing the AI's review or the comments: ${ocF.slice(0, 300)}`);

  // 👥 a trainee revoked (🚫 Offboard) leaves the scorecards at once, and comes back when restored (js/ft-roster.js)
  await page.evaluate(id => confirmRevokeTrainee(id, 'Ben Blank'), ids.Ben); await page.waitForTimeout(3000);
  const gone = await page.evaluate(() => { const t = FTBatchSheet.tables(); return t ? t.find(x => x.id === 'scorecard').rows.map(r => r[0].v) : null; });
  if (!gone || gone.some(n => /Ben/.test(n))) fail(`an offboarded trainee is still on the Score Card: ${gone}`);
  if (await page.evaluate(() => !!(window.FT_BLOCKED || {})[Object.keys(window.FT_BLOCKED || {}).find(k => /ben/i.test(k))])) { /* on the block list too */ } else fail('the block list wasn\'t read again after the offboarding');
  await page.evaluate(id => restoreOffboarded(id, 'Ben Blank'), ids.Ben); await page.waitForTimeout(3000);
  const back = await page.evaluate(() => { const t = FTBatchSheet.tables(); return t ? t.find(x => x.id === 'scorecard').rows.map(r => r[0].v) : null; });
  if (!back || !back.some(n => /Ben/.test(n))) fail(`a restored trainee isn't back on the Score Card: ${back}`);

  // leaving it: back to the normal width
  await page.evaluate(() => { state.adminTab = 'tfeedback'; render(); });
  if (await page.evaluate(() => document.body.classList.contains('bs-wide'))) fail('the page stays wide after leaving the Batch Sheet');
  // 🏅 opened again, the Scorecard is on the latest batch (the newest Batch ID date), not the one picked last time
  await page.evaluate(() => { state.adminTab = 'batchsheet'; render(); }); await page.waitForTimeout(1500);
  const lbs = await page.evaluate(() => { const sel = document.querySelector('.gs-batch select'); if (!sel) return null; const dt = b => { const m = /^b(\d{2})(\d{2})(\d{2})$/i.exec(b); return m ? `20${m[3]}-${m[1]}-${m[2]}` : ''; };
    const opts = [...sel.options].map(o => o.value).filter(dt).sort((a, b) => dt(b).localeCompare(dt(a))); return { on: sel.value, latest: opts[0] }; });
  if (!lbs || (lbs.latest && lbs.on !== lbs.latest)) fail(`the Scorecard doesn't open on the latest batch: ${JSON.stringify(lbs)}`);

  await browser.close();
  if (failures.length) { console.error('Batch Sheet test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Batch Sheet test passed (🏅 Scorecard opens on it; every registered trainee, waiting or with no progress, on one page in eleven tables, opening on the simplified scorecard (🏅 Score Card lesson by lesson, the compliance with the Drive links dropdown, 📊 Weekly Ranking, 📤 Daily outputs; the rest under ▸ More detail, with the reasons for each score on 📅 Day 1–16); their six Drive links, linked and verified; lessons, Practice Lab use, scores and recent progress, with dates and times from what the platform keeps; wide; one download; ✏️ Fix the batch name moves trainees from a mistyped batch, and an open tab cannot move them back; 📅 Day by Day with the platform\'s own ticks and the trainer\'s; 📋 My Progress, a trainee\'s own row and no one else\'s, with no trainer tools).');
})().catch(e => { console.error(e); process.exit(1); });
