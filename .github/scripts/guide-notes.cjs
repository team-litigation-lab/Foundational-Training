// 🎬 Video Notes (js/ft-video-notes.js) and 📘 Process Guide (js/ft-process-guide.js), as a trainee:
//   Video Notes — a Day deck's video carries "📝 What I learned"; the notes (three takeaways, terms, a question, how
//   it's used on the job) pass their checks, save in learn:<id>, mark the button ✓ and show on 🎬 Video Notes.
//   Process Guide — the Day 14 guide opens with the tutorial beside it; 📐 the outline, a numbered list, a link and two
//   pictures added as files make every check pass; it saves in guide:<id>:medlor; anything that could run code is cleaned
//   out (a script, an onerror); ⬇ the Word file is an MHTML document carrying the pictures; 📤 submit makes it read-only;
//   the trainer reads it; the Drafting Tools card and Day 14's step are there.
// Usage: NODE_PATH=…/node_modules node .github/scripts/guide-notes.cjs http://localhost:8787/
const { chromium } = require('playwright');
const fs = require('fs');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
  const get = key => page.evaluate(async key => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  const openBefore = await get('settings:opendays');
  await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
  await signIn(page, 'Gina', 'Guide', 'B100926');
  const id = await page.evaluate(() => state.traineeId);
  const rec = await get('trainee:' + id); rec.approved = true; await put('trainee:' + id, rec);
  await put('learn:' + id, null); await put(`guide:${id}:medlor`, null);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2000);

  /* ---------- 🎬 Video Notes ---------- */
  // (Day 4's first slide: Julio's Reception Training video. Day 2's videos are its Common Terms ones, which carry no
  // notes, and the Softphones one, behind the Common Terms 📤 Submit)
  await page.evaluate(() => FTDayDecks.open(4)); await page.waitForTimeout(1500);
  const slide = await page.evaluate(() => { for (let i = 1; i < 12; i++) { FTDayDecks.to(i); if (document.querySelector('.ftdd-learn')) return i; } return -1; });
  if (slide < 0) fail('no video in the Day 4 deck carries "📝 What I learned"');
  else {
    // the slide's own button sits above the sheet, so paging never hides it: it turns to the video's page itself
    const act = await page.evaluate(() => { const b = [...document.querySelectorAll('.ftdd-acts .btn')].find(x => /What I learned/.test(x.innerText));
      const sheet = document.querySelector('.ftdd-sheet');
      return b ? { inSheet: !!(sheet && sheet.contains(b)), above: b.getBoundingClientRect().top < sheet.getBoundingClientRect().top, shown: !!b.offsetParent } : null; });
    if (!act) fail('a slide with a video has no 📝 What I learned button of its own');
    else if (act.inSheet || !act.above || !act.shown) fail(`the slide's 📝 What I learned button isn't above the sheet: ${JSON.stringify(act)}`);
    await page.evaluate(() => { const b = [...document.querySelectorAll('.ftdd-acts .btn')].find(x => /What I learned/.test(x.innerText)); if (b) b.click(); });
    await page.waitForTimeout(700);
    if (!(await page.$('#vnModal .vn-tk input'))) {
      fail('the slide\'s 📝 What I learned button doesn\'t open the video\'s notes');
      await page.evaluate(() => FTDayDecks.reveal('.ftdd-learn')); await page.waitForTimeout(300);
      await page.click('.ftdd-learn'); await page.waitForTimeout(500);
    }
    const inputs = await page.$$('#vnModal .vn-tk input');
    const tks = ['Every to-do must follow the daily template exactly.', 'I log my Hubstaff time against the right to-do every day.', 'Notes on each to-do help my trainer see my progress clearly.'];
    for (let i = 0; i < 3; i++) await inputs[i].fill(tks[i]);
    await page.fill('#vnModal input[placeholder^="e.g. DOL"]', 'Hubstaff, to-do');
    await page.fill('#vnModal input[placeholder^="End it"]', 'Do I add a new to-do for each session?');
    await page.fill('#vnModal textarea', 'When I start each training session I will set my to-do first and track my time against it.');
    await page.waitForTimeout(900);
    if (!/4 of 4/.test(await page.$eval('#vnModal .vn-pct', el => el.textContent))) fail('complete video notes don\'t pass their four checks');
    await page.click('#vnModal >> text=✓ Done'); await page.waitForTimeout(1200);
    const l = await get('learn:' + id), n = l && Object.values(l.notes || {})[0];
    if (!n || (n.takeaways || []).filter(Boolean).length !== 3 || !/\?$/.test(n.question)) fail(`the video notes weren't saved: ${JSON.stringify(l)}`);
    if (!(await page.$('.ftdd-learn.done'))) fail('the video\'s button doesn\'t show ✓ once its notes are written');
    await page.evaluate(() => goto('learn')); await page.waitForTimeout(1500);
    const lp = await page.evaluate(() => document.querySelector('main').innerText);
    if (!/Video Notes/.test(lp) || !/Notes written/.test(lp)) fail('🎬 Video Notes doesn\'t list the video with its notes');
    if (!/1 of \d+ videos with notes/.test(lp)) fail('🎬 Video Notes doesn\'t count the videos with notes');
  }
  // a video is watched, not glanced at: the pop-out viewer opens wide and centred for one, and keeps the side pane for a document
  const viewer = await page.evaluate(async () => {
    const box = () => { const p = document.getElementById('lecture-viewer-pane'), r = p.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), mid: Math.round(r.left + r.width / 2) }; };
    lvOpen({ kind: 'video', title: 'A video', url: 'https://drive.google.com/file/d/TESTVIDEO/view' });
    await new Promise(r => setTimeout(r, 500));
    const video = box();
    lvOpen({ kind: 'doc', title: 'A document', url: 'https://drive.google.com/file/d/TESTDOC/view' });
    await new Promise(r => setTimeout(r, 400));
    const doc = box();
    lvClose();
    return { video, doc, half: Math.round(innerWidth / 2), win: innerWidth };
  });
  if (viewer.video.w < Math.min(1240, viewer.win - 48) - 2) fail(`a video doesn't open wide: ${JSON.stringify(viewer)}`);
  if (Math.abs(viewer.video.mid - viewer.half) > 3) fail(`a video's viewer isn't centred: ${JSON.stringify(viewer)}`);
  if (viewer.doc.w !== 820) fail(`a document's viewer isn't the side pane any more: ${JSON.stringify(viewer.doc)}`);

  const pages = await page.evaluate(() => JSON.stringify((window.LSH_PROGRAM || {}).modules || []));
  if (/"learn"/.test(pages)) fail('🎬 Video Notes is still in the menu');

  /* ---------- 📘 Process Guide ---------- */
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(1000);
  if (!/Process Guide/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('the Practice Lab has no 📘 Process Guide card');
  const d14 = await page.evaluate(() => (FTDays.of(14).items || []).find(x => x.id === 'guide'));
  if (!d14 || d14.at !== 'tool') fail('Day 14 has no 📘 Process Guide step');
  await page.evaluate(() => FTGuide.open('medlor')); await page.waitForTimeout(1500);
  if (!/Sending the MedLOR/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('the guide didn\'t open on the MedLOR');
  if (!(await page.$('.pg-player iframe'))) fail('the tutorial doesn\'t play beside the guide');
  await page.evaluate(() => FTGuide.outline()); await page.waitForTimeout(300);
  if (!(await page.$('#pgPage h1'))) fail('📐 the outline didn\'t give the guide a title');
  // the steps, a link, words — and two things that must never survive
  await page.evaluate(() => {
    const p = document.getElementById('pgPage');
    const steps = Array.from({ length: 9 }, (_, i) => `<li>Step ${i + 1}: open the tab, check the field and save it exactly as the tutorial shows, then verify it.</li>`).join('');
    p.insertAdjacentHTML('beforeend', `<h2>All the steps</h2><ol>${steps}</ol><p>Templates folder: <a href="https://drive.google.com/drive/folders/abc">templates</a></p>
      <p>${'Detail on the naming convention and the reporting templates. '.repeat(25)}</p>`);
    p.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // two screenshots, added as picture files (as pasting or the 🖼 button does)
  await page.evaluate(async () => {
    const mk = async c => { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 240; const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 400, 240); return new File([await new Promise(r => cv.toBlob(r, 'image/png'))], 'shot.png', { type: 'image/png' }); };
    const sel = window.getSelection(), p = document.getElementById('pgPage'); const r = document.createRange(); r.selectNodeContents(p); r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
    FTGuide.files([await mk('#336699'), await mk('#996633')]);
  });
  await page.waitForTimeout(2500);
  const ck = await page.evaluate(() => FTGuide.checks(FTGuide.clean(document.getElementById('pgPage').innerHTML)).filter(c => !c[1]).map(c => c[0]));
  if (ck.length) fail(`a complete guide should pass every check: ${ck.join('; ')}`);
  const g = await get(`guide:${id}:medlor`);
  if (!g || !g.html || (g.imgs || 0) < 2 || !/<ol>/.test(g.html)) fail(`the guide wasn't saved with its pictures: ${JSON.stringify(g && { imgs: g.imgs, words: g.words })}`);
  // the Word file carries the pictures
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => FTGuide.download())]);
  if (!/^Process Guide - Sending the MedLOR and Requesting Medical Bills & Records \(Gina\)\.doc$/.test(dl.suggestedFilename())) fail(`the Word file is named ${dl.suggestedFilename()}`);
  const doc = fs.readFileSync(await dl.path(), 'utf8');
  if (!/^MIME-Version: 1\.0/.test(doc) || (doc.match(/Content-Location: file:\/\/\/C:\/image\d+\.jpg/g) || []).length < 2) fail('the Word file doesn\'t carry the pictures');
  // submit: read-only
  await page.evaluate(() => FTGuide.submit()); await page.waitForTimeout(1500);
  if ((await page.$eval('#pgPage', el => el.getAttribute('contenteditable'))) !== 'false') fail('a submitted guide can still be edited');
  if (!((await get(`guide:${id}:medlor`)) || {}).submittedAt) fail('the submission wasn\'t saved');
  // a guide stored with code in it (written straight to storage, past the page) is cleaned before anyone sees it
  await put(`guide:${id}:lv`, { html: '<h1>Bad</h1><img src="x" onerror="window.__pwned=1"><script>window.__pwned=2<\/script><a href="javascript:window.__pwned=3">x</a><p onclick="window.__pwned=4">p</p>' });
  // the trainer reads it
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; goto('guide'); }); await page.waitForTimeout(2500);
  await page.evaluate(i => FTGuide.view(i), id); await page.waitForTimeout(1500);
  const adm = await page.evaluate(() => (document.querySelector('.pg-admin') || {}).innerText || '');
  if (!/Sending the MedLOR[^\n]*submitted/.test(adm)) fail(`the trainer doesn't see the submitted guide: ${adm.slice(0, 300)}`);
  await page.evaluate(() => document.querySelectorAll('.pg-admin details').forEach(d => { d.open = true; })); await page.waitForTimeout(800);
  await page.evaluate(() => { const a = [...document.querySelectorAll('.pg-admin a')].find(x => x.textContent === 'x'); if (a) a.click(); const p = [...document.querySelectorAll('.pg-admin p')].find(x => x.textContent === 'p'); if (p) p.click(); });
  await page.waitForTimeout(500);
  if (await page.evaluate(() => window.__pwned)) fail('code stored in a trainee\'s guide ran on the trainer\'s page');
  const shown = await page.evaluate(() => [...document.querySelectorAll('.pg-admin .pg-ro')].map(x => x.innerHTML).join(''));
  if (/onerror|onclick|javascript:|<script/i.test(shown)) fail('the trainer\'s view kept code from a guide');

  await put('settings:opendays', openBefore || { all: [], batches: {} });
  await browser.close();
  if (failures.length) { console.error('Video Notes / Process Guide test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Video Notes and Process Guide test passed (📝 What I learned on a deck video, its checks, saved, ✓ on the button and listed on 🎬 Video Notes; the Day 14 guide with the tutorial beside it, the outline, steps, a link and two pictures passing every check, saved, code cleaned out, the Word file carrying the pictures, read-only once submitted, read by the trainer).');
})().catch(e => { console.error(e); process.exit(1); });
