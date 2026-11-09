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

  // (a batch's first day from its Batch ID, in the page as on the server: B + MMDDYY, a B + DDMMYY one read as its day, "" for no real date)
  { const got = await page.evaluate(() => ['B100926', 'b 10-09-26', 'B300926', 'B131326', 'B1', ''].map(b => batchStartDate(b)));
    if (JSON.stringify(got) !== JSON.stringify(['2026-10-09', '2026-10-09', '2026-09-30', '', '', ''])) fail(`batchStartDate in the page: ${JSON.stringify(got)}`); }
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
  // 📄 the trainer's Batch Sheet is one trainee per page: ◀ Previous · the trainee · Next ▶, one trainee's table at a time with
  // every measure of theirs, 👥 their own record (status, registered…) at the bottom, no View bar, no rank (📊 Weekly Reports
  // ranks the batch) and no Drive links (they are on 🔗 Drive Links)
  { const pg = await page.evaluate(() => ({ opts: document.querySelectorAll('.bs-batchmenu .bs-who-top select option').length, shown: document.querySelectorAll('.bs-pt').length, view: !!document.querySelector('.bs-view') }));
    if (pg.opts < 3 || pg.shown !== 1 || pg.view) fail(`📄 the Batch Sheet isn't one trainee per page: ${JSON.stringify(pg)}`); }
  await page.evaluate(id => FTBatchSheet.ptPick(id), ids.Ada); await page.waitForTimeout(500);
  { const pt = await page.evaluate(id => { const d = document.getElementById('bs-pt-' + id); if (!d) return null;
      return { n: document.querySelectorAll('.bs-pt').length, head: (d.querySelector('.bs-pt-h') || {}).innerText || '', secs: [...d.querySelectorAll('.bs-pt-sec th')].map(x => x.innerText), text: d.innerText }; }, ids.Ada);
    if (!pt || pt.n !== 1 || !/Ada Active/.test(pt.head) || !/Overall/.test(pt.head)) fail(`📄 Ada's page doesn't open from the trainee dropdown: ${JSON.stringify(pt && { n: pt.n, head: pt.head })}`);
    if (pt && (!pt.secs.some(x => /Score Card/.test(x)) || !pt.secs.some(x => /Daily outputs/.test(x)) || !pt.secs.some(x => /Scores/.test(x)))) fail(`Ada's table doesn't hold every table of the sheet: ${pt && pt.secs}`);
    if (pt && !/Trainees/.test(pt.secs[pt.secs.length - 1] || '')) fail(`👥 the trainee's own record isn't at the bottom of their table: ${pt.secs}`);
    if (pt && /\bRank\b/.test(pt.text)) fail('a trainee\'s table still has a Rank');
    if (await page.$('#bs-compliance, #bs-drive')) fail('the Drive links are still on the 📋 Batch Sheet'); }
  // ▶ Next: the trainee after her, alone on the page
  { const nx = await page.evaluate(() => { const b = [...document.querySelectorAll('.bs-pager button')].find(x => /Next/.test(x.textContent)); if (b) b.click(); return !!b; });
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => ({ n: document.querySelectorAll('.bs-pt').length, head: (document.querySelector('.bs-pt-h') || {}).innerText || '' }));
    if (!nx || after.n !== 1 || /Ada Active/.test(after.head)) fail(`▶ Next doesn't turn to the next trainee's page: ${JSON.stringify(after)}`); }
  await page.evaluate(() => FTBatchSheet.view('tables')); await page.waitForTimeout(500);
  // 🏅 the simplified scorecard first: the Score Card and the compliance on top, then 📊 Weekly Ranking and
  // 📤 Daily outputs; the other tables under ▸ More detail (shut until opened)
  const top = await page.evaluate(() => [...document.querySelectorAll('.bs-card > .bs-sec, .bs-card > details.bs-more')].map(x => x.id || (x.classList.contains('bs-more') ? 'more' : '')).filter(Boolean));
  if (JSON.stringify(top.slice(0, 3)) !== JSON.stringify(['bs-scorecard', 'bs-outputs', 'more'])) fail(`the page's order is ${top.join(', ')}`);
  if (await page.evaluate(() => document.querySelector('details.bs-more').open)) fail('▸ More detail is open before the trainer opens it');
  await page.evaluate(() => { FTBatchSheet.more(true); render(); }); await page.waitForTimeout(500);
  const T = await page.evaluate(() => FTBatchSheet.tables().map(t => ({ id: t.id, head: t.head, rows: t.rows.map(r => r.map(c => String(c.v))) })));
  const by = id => T.find(t => t.id === id) || { rows: [], head: [] };
  if (JSON.stringify(T.map(t => t.id)) !== JSON.stringify(['scorecard', 'compliance', 'outputs', 'dayscores', 'trainees', 'drive', 'lessons', 'days', 'practice', 'scores', 'recent'])) fail(`the tables are ${T.map(t => t.id)}`);
  if ((await page.$$('.bs-sec:not(.bs-rank):not(.bs-people)')).length !== 9) fail('the nine tables (all but the Drive links) are not all on the Batch Sheet');
  // 🔗 Drive Links: a button of its own beside 📋 Batch Sheet (🏅 Scorecard), the same batch: ✅ Compliance and 📁 Drive links
  await page.evaluate(() => { state.adminTab = 'drivelinks'; render(); }); await page.waitForTimeout(1200);
  { const dl = await page.evaluate(() => ({ secs: [...document.querySelectorAll('.bs-card > .bs-sec')].map(x => x.id), title: (document.querySelector('.gs-file b') || {}).textContent || '', tab: [...document.querySelectorAll('.lp-admin-row .admin-tab-btn')].some(b => /Drive Links/.test(b.innerText)) }));
    if (JSON.stringify(dl.secs) !== JSON.stringify(['bs-compliance', 'bs-drive']) || !/^Drive Links · B\d{6}/.test(dl.title) || !dl.tab) fail(`🔗 Drive Links doesn't show the Drive links alone: ${JSON.stringify(dl)}`); }
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
  if (await page.$('#bs-compliance table select')) fail('the compliance table still has a dropdown');   // (🔗 Link a trainee's files by hand, under it, picks a trainee)
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
  // 🔁 Test again: the connection, then every link that isn't ✓ checked again now, and a toast with what it found
  verified.length = 0;
  await page.evaluate(() => { window.__toasts = []; const t = window.toast; window.toast = (m, ...a) => { window.__toasts.push(String(m)); return t(m, ...a); }; });
  await page.evaluate(() => FTBatchSheet.dstat()); await page.waitForTimeout(2500);
  const said = await page.evaluate(() => window.__toasts.join(' | '));
  if (!verified.includes(ids.Ada) || !/Google Drive is connected\. Checked 1 trainee’s links again/.test(said)) fail(`🔁 Test again didn't check the links that aren't ✓ again, or didn't say what it found: ${verified} / ${said}`);
  // when the rest of the batch opens, the prompt names the trainee whose own files are elsewhere, not the batch folder
  const okV = () => ({ ok: true, mine: true, v: 2, url: '' });
  for (const who of ['Ben', 'Cy']) {
    const dl = { monitor: 'https://docs.google.com/document/d/' + who + 'Mon000000001/edit', tam: 'https://docs.google.com/document/d/' + who + 'Tam000000001/edit' };
    await put('drive:' + ids[who], Object.assign({ days: {} }, dl));
    await put('trackerreview:' + ids[who], { days: {}, verify: { monitor: Object.assign(okV(), { url: dl.monitor }), tam: Object.assign(okV(), { url: dl.tam }) }, verifyAt: new Date().toISOString() });
  }
  await page.evaluate(() => FTBatchSheet.refresh()); await page.waitForTimeout(3000);
  const sb2 = await page.evaluate(() => (document.querySelector('.bs-share') || {}).innerText || '');
  // 🔗 every trainee with a link issue is listed, each link that isn't right with why and the trainer's fixes (↗ Open, ✓ Mark as
  // opening, ✎ Re-link): Ada's Monitoring Sheet that can't be opened, and Ben's and Cy's links not linked yet
  { const li = await page.evaluate(() => [...document.querySelectorAll('.bs-li > tbody')].map(l => ({ t: l.innerText, open: !!l.querySelector('a[href*="docs.google.com"]'), mark: /lkMark\(/.test(l.innerHTML), relink: /leWho\(/.test(l.innerHTML) })));
    const ada = li.find(x => /Ada Active/.test(x.t)), ben = li.find(x => /Ben/.test(x.t));
    if (!ada || !/📒 Monitoring Sheet/.test(ada.t) || !/can.t open/i.test(ada.t) || !ada.open || !ada.mark || !ada.relink) fail(`Ada's failing link isn't listed with why and the trainer's fixes: ${JSON.stringify(ada)}`);
    if (!ben || !/Not linked/.test(ben.t) || !/2 of 6/.test(ben.t)) fail(`a trainee with links not saved yet isn't listed: ${JSON.stringify(li.map(x => x.t.slice(0, 120)))}`); }
  // 🗄 Archive one account from the link issues list (not a trainee, or one who left): its record archived, after a confirm
  { const zid = 'zed-notatrainee--' + BATCH.toLowerCase();
    await put('trainee:' + zid, { id: zid, name: 'Zed Notatrainee', batch: BATCH, approved: true, registeredAt: new Date().toISOString() });
    await page.evaluate(() => { window.__conf = window.confirm; window.confirm = () => true; });
    const btn = await page.evaluate(() => !!document.querySelector('.bs-li .bs-arch1'));
    await page.evaluate(id => FTBatchSheet.archiveOne(id, 'Zed Notatrainee'), zid); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.confirm = window.__conf; });
    const z = await get('trainee:' + zid);
    if (!btn || !z || z.archived !== true || z.name !== 'Zed Notatrainee') fail(`🗄 Archive on the link issues list didn't archive the account: ${btn} ${JSON.stringify(z)}`);
    await put('trainee:' + zid, null); await page.evaluate(() => FTBatchSheet.refresh()); await page.waitForTimeout(2500); }
  if (!/trainees have Drive link issues/.test(sb2) || /files can’t be opened yet/.test(sb2)) fail(`the issues list doesn't say how many trainees have link issues: ${sb2.slice(0, 300)}`);
  // 🔎 not in their Drive (the batch's Drive searched, no Monitoring Sheet with her name: worker.js autoLinkBatch notFound): said so
  { const rv = (await get('trackerreview:' + ids.Ada)) || { days: {} }; rv.notFound = { keys: ['monitor'], at: new Date().toISOString(), batch: BATCH }; await put('trackerreview:' + ids.Ada, rv);
    await page.evaluate(() => FTBatchSheet.refresh()); await page.waitForTimeout(3000);
    const sb3 = await page.evaluate(() => (document.querySelector('.bs-share') || {}).innerText || '');
    const cell = await page.evaluate(() => { const t = FTBatchSheet.tables(); const r = t && t.find(x => x.id === 'compliance').rows.find(r => /Ada/.test(r[0].v)); return r ? r.map(c => c.v).join(' | ') : ''; });
    if (!/Ada Active[\s\S]*Monitoring Sheet\s+Not in their Drive/.test(sb3) || !/Drive searched/.test(sb3)) fail(`a Monitoring Sheet that isn't in her Drive isn't said so: ${sb3.slice(0, 400)}`);
    if (!/✗ Not in Drive/.test(cell)) fail(`✅ Compliance doesn't show her Monitoring Sheet as ✗ Not in Drive: ${cell}`);
    delete rv.notFound; await put('trackerreview:' + ids.Ada, rv); }
  // ✓ fixed by the VA (her link now opens): she drops off the list by herself
  { const rv = (await get('trackerreview:' + ids.Ada)) || { days: {} }, dv = (await get('drive:' + ids.Ada)) || {};
    const was = JSON.stringify(rv.verify || {}); rv.verify = rv.verify || {}; Object.keys(rv.verify).forEach(k => { if (dv[k]) rv.verify[k] = { ok: true, mine: true, v: 2, url: String(dv[k]).slice(0, 500), at: new Date().toISOString() }; });
    await put('trackerreview:' + ids.Ada, rv); await page.evaluate(() => FTBatchSheet.refresh()); await page.waitForTimeout(3000);
    const after = await page.evaluate(() => [...document.querySelectorAll('.bs-li > tbody')].map(l => l.innerText).join(' | '));
    if (/Ada Active[^|]*Monitoring Sheet[^|]*can.t open/i.test(after)) fail(`a link the VA fixed stays on the issues list: ${after.slice(0, 300)}`);
    rv.verify = JSON.parse(was); await put('trackerreview:' + ids.Ada, rv); }
  await page.unroute('**/api/drive/status'); await page.unroute('**/api/drive/verify');
  await page.evaluate(() => FTBatchSheet.dstat()); await page.waitForTimeout(800);
  await page.evaluate(() => { state.adminTab = 'batchsheet'; render(); }); await page.waitForTimeout(800);
  // 📅 Day 1–16: Detailed Scores, first: Ada's Day 4 is her Reception Mock Call; under it her days in detail, each score with
  // why it was scored that way, what to improve and what she did best; then the 📊 Weekly Ranking for the batch
  const ds = by('dayscores'), dsa = ds.rows.find(r => /Ada/.test(r[0]));
  if (ds.head.length !== 18 || ds.head[2] !== 'Day 1' || ds.head[17] !== 'Day 16') fail(`📅 Day 1–16's columns: ${ds.head}`);
  if (!dsa || dsa[5] !== '76%') fail(`Ada's Day 4 isn't her Reception Mock Call's 76%: ${dsa}`);
  await page.evaluate(id => FTBatchSheet.dsWho(id), ids.Ada); await page.waitForTimeout(400);
  const dx = await page.evaluate(() => { const it = [...document.querySelectorAll('.bs-ds-it.is-rich')].find(x => /Reception/i.test(x.textContent)); return it ? it.innerText : ''; });
  if (!/Why this score/i.test(dx) || !/3\.80\/5/.test(dx) || !/did best[\s\S]*Warm, branded greeting/i.test(dx) || !/to be improved[\s\S]*Skipped the caller verification/i.test(dx)) fail(`the mock call's context (why, best, to improve): ${dx}`);
  // 📊 the Weekly Ranking is its own button, 📊 Weekly Reports: not on the Batch Sheet; there alone, for the same batch
  if (await page.$('#bs-ranking')) fail('the 📊 Weekly Ranking is still on the 📋 Batch Sheet');
  { await page.evaluate(() => { state.adminTab = 'weeklyreports'; render(); }); await page.waitForTimeout(1500);
    const wr = await page.evaluate(() => ({ rk: !!document.querySelector('#bs-ranking .rk-bar'), comp: !!document.getElementById('bs-compliance'), title: (document.querySelector('.gs-file b') || {}).textContent || '', tab: [...document.querySelectorAll('button, a')].some(b => /📊 Weekly Reports/.test(b.textContent)) }));
    if (!wr.rk || wr.comp || !/^Weekly Reports · B\d{6}/.test(wr.title) || !wr.tab) fail(`📊 Weekly Reports doesn't show the Weekly Ranking alone: ${JSON.stringify(wr)}`);
    await page.evaluate(() => { state.adminTab = 'batchsheet'; render(); }); await page.waitForTimeout(800); }

  // 👥 everyone registered, from the moment they register
  const tr = by('trainees').rows, names = tr.map(r => r[0]);
  if (tr.length !== 3) fail(`👥 Trainees has ${tr.length} rows: ${names}`);
  const cy = tr.find(r => /Cy/.test(r[0])), ben = tr.find(r => /Ben/.test(r[0])), ada = tr.find(r => /Ada/.test(r[0]));
  if (!cy || cy[1] !== 'Waiting for approval') fail(`a trainee waiting for approval isn't listed as such: ${cy}`);
  if (!ben || ben[1] !== 'Approved' || !ben[2]) fail(`a trainee with no progress isn't listed with their registration: ${ben}`);
  if (!ada || !/^1 \//.test(ada[4]) || !/^1 \//.test(ada[5]) || !/Lesson deck/.test(ada[6])) fail(`Ada's decks / Knowledge Checks / last opened: ${ada}`);

  // 🔄 Update all scores: the batch's files looked for once, every trainee's links checked, today's daily check run for every
  // approved trainee (one call each; no backtrack from Day 1: that was a one-time catch-up), then the sheet is read again.
  // (The sheet updates itself on opening: that run finishes first.)
  await page.waitForFunction(() => { const b = document.querySelector('button.bs-upd-all'); return b && !b.disabled; }, null, { timeout: 60000 }).catch(() => fail('the update the sheet runs on opening never finished'));
  { const asked = [], linked = [], back = []; const watch = r => { if (/\/api\/drive\/check$/.test(r.url())) asked.push(JSON.parse(r.postData()).id); if (/\/api\/drive\/backtrack/.test(r.url())) back.push(1); if (/\/api\/drive\/autolink/.test(r.url())) linked.push(JSON.parse(r.postData()).batch); };
    page.on('request', watch);
    await page.click('button.bs-upd-all');
    await page.waitForFunction(() => { const b = document.querySelector('button.bs-upd-all'); return b && !b.disabled && /Update all scores/.test(b.textContent); }, null, { timeout: 60000 }).catch(() => fail('🔄 Update all scores never finished'));
    await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the sheet wasn\'t read again after 🔄 Update all scores'));
    page.off('request', watch);
    // (no daily check on a weekend, in Pacific time: training days are weekdays)
    const weekend = /Sat|Sun/.test(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' }).format(new Date()));
    const want = weekend ? 0 : tr.filter(r => r[1] === 'Approved').length;
    if (asked.length !== want) fail(`🔄 Update all scores ran today's check for ${asked.length} trainees, not the ${want} approved: ${asked}`);
    if (back.length) fail(`🔄 Update all scores still backtracks from Day 1 (${back.length} calls)`);
    if (linked.length !== 1) fail(`🔄 Update all scores looked for the batch's Drive files ${linked.length} times, not once`); }
  // ⏪ the Day 1 backtrack, kept per trainee: ✅ Compliance → ⏪ Backtrack this trainee from Day 1 calls it for that trainee alone
  { const back = []; const watch = r => { if (/\/api\/drive\/backtrack/.test(r.url())) back.push(JSON.parse(r.postData()).id); };
    page.on('request', watch);
    await page.evaluate(id => { FTBatchSheet.ttWho(id); }, ids.Ada); await page.waitForTimeout(600);
    const btn = await page.evaluate(() => { const b = [...document.querySelectorAll('.bs-tt button')].find(x => /Backtrack this trainee from Day 1/.test(x.textContent)); return !!b; });
    if (!btn) fail('✅ Compliance has no ⏪ Backtrack this trainee from Day 1');
    await page.evaluate(id => FTBatchSheet.backtrack(id), ids.Ada); await page.waitForTimeout(2500);
    page.off('request', watch);
    if (back.length !== 1 || back[0] !== ids.Ada) fail(`⏪ Backtrack this trainee didn't backtrack Ada alone: ${JSON.stringify(back)}`);
    const said = await page.evaluate(() => ((document.querySelector('.bs-tt') || {}).innerText || ''));
    if (!/⏪ Ada/.test(said)) fail(`the backtrack didn't say what it did: ${said.slice(0, 300)}`); }

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

  // 🛠 Practice Lab: Ada practiced in a tool (82%) and took a typing test; Ben hasn't practiced
  const pl = by('practice'), pa = pl.rows.find(r => /Ada/.test(r[0])), pb = pl.rows.find(r => /Ben/.test(r[0]));
  if (JSON.stringify(pl.head.slice(0, 4)) !== JSON.stringify(['Trainee', 'Tools used', 'Attempts', 'Last practice'])) fail(`🛠 Practice Lab's columns: ${pl.head.slice(0, 4)}`);
  const aiCol = pl.head.findIndex(h => /AI-graded/.test(h));
  if (!pa || !/^[1-9]\d* \//.test(pa[1]) || !(Number(pa[2]) >= 2) || /Not yet/.test(pa[3]) || pa[aiCol] !== '1 · 82%') fail(`🛠 Practice Lab for Ada: ${pa}`);
  if (!pb || !/^0 \//.test(pb[1]) || pb[3] !== 'Not yet') fail(`🛠 Practice Lab for Ben, who hasn't practiced: ${pb}`);
  // a time, not "just now"
  if (/ago|just now/.test(tr.map(r => r[3]).join(' ')) || !/\d{1,2}:\d{2}/.test(ada[3])) fail(`"Last on the platform" isn't a date and time: ${tr.map(r => r[3])}`);

  // 🏅 the Scorecard's grading systems and the Overall, with no Rank (the batch is ranked on 📊 Weekly Reports only)
  const sh = by('scores').head;
  if (sh[sh.length - 1] !== 'Overall %' || sh.includes('Rank') || !sh.includes('Daily compliance') || !sh.includes('Weeks average (/5)') || !sh.includes('Scorecard overall')) fail(`🏅 Scores' columns: ${sh}`);
  // 🔎 a trainee's grades in detail (what 🏅 Scorecards showed): Ada's Knowledge Check 90%
  if (!(await page.evaluate(() => /Grades in detail/.test(document.getElementById('bs-scores').innerText)))) fail('🏅 Scores has no grades in detail');
  if (!(await page.evaluate(() => /Scorecard overall: .*= the average of/.test(document.getElementById('bs-scores').innerText)))) fail('🔎 Grades in detail has no breakdown of the overall');

  // ✍️ Knowledge Checks in detail, under 🏅 Score Card: each answer with its grade out of 10, the feedback and the trainer's
  // comment on it, the trainer's overall comment, and the Process Questions report line — as on the ✍️ Knowledge Check page
  const kcSeed = async () => { const qs = await page.evaluate(l => ftKcQuestions(l).filter(q => !q.set.open).slice(0, 2).map(q => ({ sid: q.set.id, i: q.i, n: q.set.questions.length })), lesson);
    if (!qs.length) return qs;
    const sid = qs[0].sid, answers = []; qs.forEach(q => { answers[q.i] = 'Answer ' + (q.i + 1) + ' from Ada'; });
    await put('process:' + ids.Ada, { sets: { [sid]: { answers, submittedAt: iso(now - 2 * 3600e3) } }, kc: { [lesson]: { attempts: 1, best: 90, last: { at: iso(now - 2 * 3600e3), summary: 'Clear on the intake steps.',
        items: [{ sid, i: qs[0].i, score: 9, feedback: 'Named every step in order.' }].concat(qs[1] ? [{ sid, i: qs[1].i, score: 5, feedback: 'Missed the conflict check.' }] : []) } } } });
    await put('kcreview:' + ids.Ada, { lessons: { [lesson]: { comment: 'Good start; review the conflict check.', notes: { [sid + '|' + qs[0].i]: 'Spot on.' } } } });
    return qs; };
  { const qs = await kcSeed();
    if (qs.length) {
      // (📄 and an assessment: Day 2's Auto Liability Insurance, graded — its answers, ✓/✗ with the points and the grader's note)
      { const AL = '11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C';
        await put('assess:' + ids.Ada, { v: 1, docs: { [AL]: { answers: { i1: 'The policy limit', i2: 'Ada' }, updatedAt: iso(now - 3600e3) } } });
        const rv = (await get('trackerreview:' + ids.Ada)) || { days: {} }; rv.assess = Object.assign({}, rv.assess, { [AL]: { at: iso(now - 3000e3), when: 'Nov 4', title: 'Auto Liability Insurance – Assessment', score: 1, max: 40, pct: 3, pending: false,
          items: { i1: { ok: true, pts: 1, note: 'Right: the policy limit.' }, i2: { ok: false, pts: 0, note: 'Nevada requires 25/50/20.' } } } }); await put('trackerreview:' + ids.Ada, rv); }
      await page.evaluate(() => FTBatchSheet.refresh()); await page.waitForTimeout(3000);
      await page.evaluate(id => FTBatchSheet.kdWho(id), ids.Ada); await page.waitForTimeout(400);
      const kd = await page.evaluate(() => (document.querySelector('#bs-scorecard .bs-kdw') || {}).innerText || '');
      if (!/Knowledge Checks & Assessments in detail/.test(kd) || !/9\/10\s*Named every step in order/.test(kd) || !/Spot on\./.test(kd) || !/Good start; review the conflict check/.test(kd)
        || !/Auto Liability Insurance – Assessment/.test(kd) || !/The policy limit/.test(kd) || !/✓ 1 pt\s*Right: the policy limit/.test(kd) || !/✗ 0 pts\s*Nevada requires 25\/50\/20/.test(kd)
        || !/Clear on the intake steps/.test(kd) || !/Answer 1 from Ada|Answer \d+ from Ada/.test(kd) || !/Process Questions Responses/.test(kd) || (qs[1] && !/5\/10\s*Missed the conflict check/.test(kd)))
        fail(`✍️ Knowledge Checks in detail doesn't break the grading down: ${kd.slice(0, 600)}`);
      await put('assess:' + ids.Ada, null); { const rv = (await get('trackerreview:' + ids.Ada)) || {}; if (rv.assess) { delete rv.assess['11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C']; await put('trackerreview:' + ids.Ada, rv); } }
      await put('process:' + ids.Ada, null); await put('kcreview:' + ids.Ada, null);
      await page.evaluate(() => FTBatchSheet.refresh()); await page.waitForTimeout(3000);
    } else fail('no Knowledge Check questions for the first lesson');
  }

  // 📝 Ada's Day 3 Reception Listening Activity, graded on its Answer Sheet (32 of 40, 80%: Call 1 all right, Call 2's reason
  // marked down): ✓ done and scored on Day 3 (📅 Day by Day, 📅 Day 1–16 with what she did best and what to improve), 🛠 Practice
  // of Lessons 3 and 4 on the 🏅 Score Card (Lesson 4's with her 76% mock call), and in 🏅 Scores under 🎧 Call Listening only
  { const rv = await get('trackerreview:' + ids.Ada), items = {};
    for (const n of [1, 2]) for (const f of ['caller', 'callback', 'verified', 'reason', 'action', 'obstacle', 'response']) items[`c${n}_${f}`] = { ok: true, pts: f === 'response' ? 2 : 1 };
    items.c2_reason = { ok: false, pts: 0, note: 'Names the letter, not the pain clinic waiting on it.' };
    rv.assess = { recact: { at: iso(now - 1800e3), when: 'Nov 5, 9:30 AM ET', title: 'Reception Listening Activity: Harbor & Pine Calls', score: 32, max: 40, pct: 80, pending: false, ai: true, items } };
    await put('trackerreview:' + ids.Ada, rv); }
  await page.evaluate(b => FTBatchSheet.batch(b), BATCH);
  await page.waitForFunction(() => window.FTBatchSheet && FTBatchSheet.tables(), null, { timeout: 15000 }).catch(() => fail('the sheet wasn\'t read again after the Reception Listening Activity was graded'));
  await page.waitForTimeout(500);
  const rl = await page.evaluate(() => { const T = id => FTBatchSheet.tables().find(t => t.id === id), ada = t => t.rows.find(r => /Ada/.test(r[0].v));
    const sc = T('scorecard'), at = n => { let c = 0; for (const g of sc.groups) { if (String(g.label).startsWith(n + '. ')) return c; c += g.span; } return -1; };
    const days = T('days'), ds = T('dayscores'), pick = (t, h) => ada(t)[t.head.indexOf(h)];
    return { l3: ada(sc)[at(3) + 1], l4: ada(sc)[at(4) + 1], d3: pick(days, 'Day 3'), practice: pick(days, '🛠 Practice'), ds3: pick(ds, 'Day 3') }; });
  // (the 🎧 Call Listening step of Day 3 doesn't score it again: she logged no recording, so that step has no score)
  if (!rl.l3 || rl.l3.v !== '80%' || !/Reception Listening Activity[^;]* 80%/.test(rl.l3.f) || /Call Listening/.test(rl.l3.f)) fail(`Lesson 3's 🛠 Practice on the Score Card isn't the Reception Listening Activity's 80% alone: ${JSON.stringify(rl.l3)}`);
  if (!rl.l4 || rl.l4.v !== '78%' || !/Reception Listening Activity[^;]* 80%/.test(rl.l4.f) || !/ 76%/.test(rl.l4.f)) fail(`Lesson 4's 🛠 Practice isn't the activity (80%) and the mock call (76%): ${JSON.stringify(rl.l4)}`);
  if (!rl.d3 || rl.d3.v !== '80%' || !/the average of 1 scored activity: Reception Listening Activity[^;]* 80% \(32 of 40 points/.test(rl.d3.f)) fail(`Ada's Day 3 on 📅 Day by Day isn't her graded Reception Listening Activity alone: ${JSON.stringify(rl.d3)}`);
  if (!rl.practice || rl.practice.v !== '80%') fail(`📅 Day by Day's 🛠 Practice doesn't count the graded activity: ${JSON.stringify(rl.practice)}`);
  if (!rl.ds3 || rl.ds3.v !== '80%') fail(`Ada's Day 3 on 📅 Day 1–16 isn't her graded Reception Listening Activity: ${JSON.stringify(rl.ds3)}`);
  await page.evaluate(id => FTBatchSheet.dsWho(id), ids.Ada); await page.waitForTimeout(400);
  const rx = await page.evaluate(() => { const it = [...document.querySelectorAll('.bs-ds-it.is-rich')].find(x => /Reception Listening Activity/.test(x.textContent)); return it ? it.innerText : ''; });
  if (!/32 of 40 points \(80%\)/.test(rx) || !/did best[\s\S]*Call 1: The Missing Email: every answer right/i.test(rx) || !/to be improved[\s\S]*Call 2: Third Time Calling · Reason for the call: Names the letter/i.test(rx)) fail(`the activity's context on 📅 Day 1–16 (why, best, to improve): ${rx}`);
  await page.evaluate(id => FTBatchSheet.grWho(id), ids.Ada); await page.waitForTimeout(400);
  const gd = await page.evaluate(() => [...document.querySelectorAll('#bs-scores .bs-day')].map(b => ({ h: b.querySelector('.bs-day-h').innerText, t: b.innerText })));
  if (!gd.some(b => /Call Listening/.test(b.h) && /80%/.test(b.h) && /Reception Listening Activity[\s\S]*80%/.test(b.t))) fail(`🔎 Grades in detail: the activity isn't 🎧 Call Listening's 80%: ${gd.map(b => b.h).join(' | ')}`);
  const elsewhere = gd.filter(b => !/Call Listening/.test(b.h) && /Reception Listening/.test(b.t)).map(b => b.h);
  if (elsewhere.length) fail(`the Reception Listening Activity also counts under ${elsewhere.join(', ')}`);
  // (no ✍️ Process Questions table: the Score Card's ✍️ Knowledge Checks carries those scores)
  if (await page.evaluate(() => !!document.getElementById('bs-process') || /Scoring rationale/.test(document.querySelector('.bs-card').innerText))) fail('the ✍️ Process Questions table or its scoring rationale is still on the page');

  // 🕒 Recent progress: newest first, every kind
  const rc = by('recent').rows, kinds = rc.map(r => r[2]);
  for (const k of ['Registered', 'Finished a lesson deck', 'Knowledge Check', 'Practice in a tool', 'Typing test', 'Simulator practice', 'Opened']) if (!kinds.includes(k)) fail(`🕒 Recent progress has no "${k}": ${kinds}`);
  if (kinds.filter(k => k === 'Knowledge Check').length !== 2) fail('🕒 each Knowledge Check attempt should be its own row');
  if (rc.filter(r => r[2] === 'Registered').length !== 3) fail('🕒 every registration should be listed');
  const evs = await page.evaluate(() => FTBatchSheet.events().map(x => +x.at));
  if (evs.some((t, i) => i && t > evs[i - 1])) fail('🕒 Recent progress is not newest first');

  // the page is wide, and a cell explains itself when pointed at (its title: the formula bar is gone)
  const wide = await page.evaluate(() => document.body.classList.contains('bs-wide') && getComputedStyle(document.querySelector('main')).maxWidth);
  if (wide !== 'none') fail(`the page isn't widened for the sheet: ${wide}`);
  const tip = await page.evaluate(() => (document.querySelector('#bs-lessons td[data-c="1"]') || {}).title || '');
  if (!/90%.*2 attempts.*passed/.test(tip)) fail(`the Knowledge Check cell doesn't explain itself: ${tip}`);
  if (await page.$('#bsBar, .gs-fbar')) fail('the formula bar is still on the sheet');
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

  // (📤 the trainer shared Week 1's Weekly Progress Report: each trainee's own card in their rankshare:<id>)
  const card = (name, rank, ov) => ({ reports: { [`${BATCH}|1`]: { batch: BATCH, week: 1, range: ['2026-10-30', '2026-11-05'], sharedAt: '2026-11-05T10:00:00Z', name, rank, of: 2, overall: ov,
    scores: { attention: ov, compliance: ov, timely: ov, communication: null, english: ov, call: null, tools: null }, comments: { attention: name + '-CARD-NOTE' }, trainer: 'Keep going.', overallComment: name + ' overall.' } } });
  await put('rankshare:' + ids.Ada, card('Ada Active', 1, 4.2)); await put('rankshare:' + ids.Ben, card('Ben Blank', 2, 2.1));
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
  // (📊 her own Weekly Progress Report, as the trainer shared it, in the report's styling: her card and nobody else's, read-only,
  // and none of the batch's marks sheet)
  await page.waitForFunction(() => /Ada Active-CARD-NOTE/.test((document.querySelector('.bs-mine #bs-ranking') || {}).innerText || ''), null, { timeout: 8000 }).catch(() => {});
  const myRk = await page.evaluate(() => { const s = document.querySelector('.bs-mine #bs-ranking'); return s ? { text: s.innerText, html: s.innerHTML, cards: s.querySelectorAll('details.rks-card').length, rows: s.querySelectorAll('.rks-tbl tbody tr').length } : null; });
  if (!myRk || !/My Weekly Progress Report/.test(myRk.text) || !/Ada Active-CARD-NOTE/.test(myRk.text) || myRk.cards !== 1 || myRk.rows !== 1) fail(`the trainee doesn't see her own Weekly Progress Report card: ${myRk && myRk.text.slice(0, 200)}`);
  if (myRk && (/Ben/.test(myRk.text) || /Cy/.test(myRk.text))) fail('a trainee sees another trainee in her Weekly Progress Report');
  if (myRk && /<textarea|type="number"|FTRankSummary\.(share|toggleEdit|draft)|FTRanking\./.test(myRk.html)) fail('a trainee\'s Weekly Progress Report has the trainer\'s editing, sharing or the batch\'s marks sheet');
  // (her 📤 Daily outputs with each activity's score box and its comment, in the table)
  if (!/TRAINER-NOTE/.test(await page.evaluate(() => [...document.querySelectorAll('.bs-mine #bs-outputs td.bs-ocell')].map(td => td.innerText).join(' ')))) fail('the trainee doesn\'t see her days\' comments in 📤 Daily outputs');
  // (no checklist on her page either, and no trainer's picker)
  if (await page.$('.bs-mine .bs-item, .bs-mine .bs-ck-who')) fail('the trainee\'s page still has the checklist or a trainer\'s picker');
  // (✍️ her Knowledge Checks in detail, shared to her page: each answer with its grade and feedback, the trainer's comments)
  { await kcSeed(); await page.evaluate(() => FTBatchSheet.refreshMe()); await page.waitForTimeout(3000);
    const kd = await page.evaluate(() => (document.querySelector('.bs-mine .bs-kdw') || {}).innerText || '');
    if (!/My Knowledge Checks & Assessments in detail/.test(kd) || !/9\/10\s*Named every step in order/.test(kd) || !/Spot on\./.test(kd) || !/Good start; review the conflict check/.test(kd) || !/Process Questions Responses/.test(kd))
      fail(`the trainee doesn't see her Knowledge Checks in detail on 📋 My Progress: ${kd.slice(0, 400)}`);
    if (/Ben Blank|Cy Waiting|Dee Glitch/.test(kd)) fail('a trainee sees another trainee\'s Knowledge Checks');
    await put('process:' + ids.Ada, null); await put('kcreview:' + ids.Ada, null); await page.evaluate(() => FTBatchSheet.refreshMe()); await page.waitForTimeout(2500); }
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
    // (📏 following instructions too: the day's naming, saving route and deliverables on time)
    if (oc.acts.map(a => a.k).join() !== 'tracker,tests,outputs,instructions,eod') fail(`Ada's day doesn't list her activities: ${oc.acts.map(a => a.k)}`);
    if (by('tracker').box !== '50%' || !/0 of 1 checks met; to fix: Every open task has its Daily Note/.test(by('tracker').say) || !/TRAINER-NOTE/.test(by('tracker').say)) fail(`the Task Tracker's box and comment: ${JSON.stringify(by('tracker'))}`);
    if (by('tests').box !== '67%' || !/afternoon typing test/.test(by('tests').say)) fail(`the tests' box and comment: ${JSON.stringify(by('tests'))}`);
    if (by('outputs').box !== '0%' || !/No output link submitted/.test(by('outputs').say) || !/Common Terms Used/.test(by('outputs').say)) fail(`the outputs' box and comment: ${JSON.stringify(by('outputs'))}`);
    const long = oc.acts.filter(a => (a.say.match(/[.!?…](\s|$)/g) || []).length > 2);
    if (long.length) fail(`an activity's comment is longer than two sentences: ${long.map(a => a.say).join(' / ')}`);
  }
  if (await page.$('#bs-outputs .bs-oc, #bs-outputs .bs-ck-who')) fail('the 💬 Comments list is still under 📤 Daily outputs');
  // ▸/▾ retractable by trainee and by day: Ada's row folds to each day's score and a little box per activity, the 11/2 column
  // folds to its score alone, and both open again (kept on this browser)
  const fold = await page.evaluate(async id => {
    const cell = () => { const T = FTBatchSheet.tables().find(t => t.id === 'outputs'), ci = T.head.findIndex(h => /\b11\/2\b/.test(h));
      const tr = [...document.querySelectorAll('#bs-outputs tbody tr')].find(r => /Ada/.test(r.innerText)); return { tr, c: ci > 0 && tr && tr.querySelector(`td.bs-ocell[data-c="${ci}"]`), ci }; };
    const wait = () => new Promise(r => setTimeout(r, 300)), out = {};
    FTBatchSheet.ofRow(id); await wait(); let x = cell();
    out.rowFolded = !!(x.c && !x.c.querySelector('.bs-oacts') && x.c.querySelectorAll('.bs-omini .bs-sbox').length === 5 && x.tr.classList.contains('bs-orow-f'));
    FTBatchSheet.ofRow(id); await wait(); x = cell(); out.rowOpen = !!(x.c && x.c.querySelectorAll('.bs-oacts li').length === 5);
    const btn = document.querySelectorAll('#bs-outputs thead .gs-head th')[x.ci + 1].querySelector('.bs-ofold-btn'); if (btn) btn.click(); await wait(); x = cell();
    out.dayFolded = !!(x.c && x.c.classList.contains('bs-ocol-f') && !x.c.querySelector('.bs-oacts') && !x.c.querySelector('.bs-omini'));
    FTBatchSheet.ofDays(false); await wait(); x = cell(); out.dayOpen = !!(x.c && x.c.querySelector('.bs-oacts'));
    return out; }, ids.Ada);
  if (!fold.rowFolded || !fold.rowOpen || !fold.dayFolded || !fold.dayOpen) fail(`📤 Daily outputs doesn't fold by trainee and by day: ${JSON.stringify(fold)}`);
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
  console.log('Batch Sheet test passed (🏅 Scorecard opens on it; every registered trainee, waiting or with no progress, on one page in eleven tables, opening on the simplified scorecard (🏅 Score Card lesson by lesson, the compliance with the Drive links dropdown, 📊 Weekly Ranking, 📤 Daily outputs; the rest under ▸ More detail, with the reasons for each score on 📅 Day 1–16); their six Drive links, linked and verified; lessons, Practice Lab use, scores and recent progress, with dates and times from what the platform keeps; wide; one download; ✏️ Fix the batch name moves trainees from a mistyped batch, and an open tab cannot move them back; 📅 Day by Day with the platform\'s own ticks and the trainer\'s; Day 3\'s Reception Listening Activity scored by its grade on its day, in 🛠 Practice and under 🎧 Call Listening only; 📋 My Progress, a trainee\'s own row and no one else\'s, with no trainer tools).');
})().catch(e => { console.error(e); process.exit(1); });
