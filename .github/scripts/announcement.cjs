// 📢 The announcement ticker (js/ft-announcement.js): this platform's own, for the Foundational trainees only (Admin → 📢
//   Announcements; the Main Portal's broadcast isn't shown or edited here), read through /api/announcement, no longer shown in a
//   bar under the top bar (the trainer asked for it gone); the editor and each lesson card's announcement stay.
// Usage: NODE_PATH=…/node_modules node .github/scripts/announcement.cjs http://localhost:8787/
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  let text = 'PORTAL BROADCAST NOT SHOWN';
  const plat = (t) => ({ platform: { text: t }, lessons: {} });
  // (the Worker's route answers the page's own request — POST, as every /api/ route — even with the Portal out of reach)
  { const p0 = await browser.newPage(); await p0.goto(BASE, { waitUntil: 'load' });
    const r = await p0.evaluate(async () => { const x = await fetch('/api/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); return { status: x.status, body: await x.json().catch(() => null) }; });
    if (r.status !== 200 || !r.body || r.body.ok !== true || typeof r.body.text !== 'string') fail(`the Worker's /api/announcement didn't answer the page: ${JSON.stringify(r)}`);
    await p0.close(); }
  let method = '', own = plat('Mock calls start at 9:00 AM PHT <img src=x onerror="window.__xss=1">');
  await page.route('**/api/announcement', r => { method = r.request().method(); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, text, own }) }); });
  try {
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Ann', 'Ticker', 'B110226');
    await page.evaluate(() => { goto('dashboard'); }); await page.waitForTimeout(800);
    // 🚫 no bar under the top bar, for a trainee, a trainer or on a Day deck (the trainer asked for it gone)
    if (await page.$('.ft-ann')) fail('the announcement bar is still under the top bar (trainee)');
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(800);
    if (await page.$('.ft-ann')) fail('the announcement bar is still under the top bar (trainer)');
    await page.evaluate(() => { state.isAdmin = false; FTDayDecks.open(1); }).catch(() => {}); await page.waitForTimeout(500);
    if (await page.$('.ft-ann')) fail('the announcement bar is still on a Day deck');
    // (each lesson's own announcement stays on its card, as text)
    own = { platform: { text: 'Mock calls moved to 2 PM' }, lessons: { 1: { text: 'Bring your headset <img src=x onerror="window.__xss=1">' } } };
    await page.evaluate(async () => { await FTAnnouncement.reload(); goto('dashboard'); }); await page.waitForTimeout(600);
    { const c = await page.evaluate(() => typeof FTAnnouncement.lessonHtml === 'function' ? FTAnnouncement.lessonHtml(1) : '');
      if (!/Bring your headset/.test(c) || /hidden/.test(c) || /<img/.test(c)) fail(`the lesson's card doesn't carry its announcement as text: ${c}`); }
    // 📝 the editor: a trainer's Admin → 📢 Announcements saves settings:announcements
    await page.unroute('**/api/announcement');
    await page.evaluate(() => { state.isAdmin = true; state.adminPreview = false; state.adminTab = 'announcements'; goto('admin'); }); await page.waitForTimeout(1500);
    // (no explanation paragraph; standalone: no box for the Main Portal's announcement, nothing sent to the Portal)
    if (await page.$('.ann-ed-note')) fail('the editor still has its explanation paragraph');
    let portalSent = null;
    await page.route('**/api/portal-announcement', r => { portalSent = JSON.parse(r.request().postData() || '{}'); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    if (await page.$('textarea[data-ann-portal]')) fail('the editor still has a box for the Main Portal\'s announcement');
    await page.fill('textarea[data-ann="platform"]', 'Typing test at 9 AM'); await page.fill('textarea[data-ann="1"]', 'Headsets on');
    await page.click('.ann-ed .btn-primary'); await page.waitForTimeout(1200);
    if (portalSent) fail('the editor sent something to the Main Portal: ' + JSON.stringify(portalSent));
    await page.unroute('**/api/portal-announcement');
    { const r = await page.evaluate(async () => (await (await fetch('/api/announcement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json()));
      if (!r.own || !r.own.platform || r.own.platform.text !== 'Typing test at 9 AM' || !r.own.lessons || !r.own.lessons['1'] || r.own.lessons['1'].text !== 'Headsets on') fail(`the editor's announcements weren't saved and served: ${JSON.stringify(r)}`); }
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Announcement test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Announcement test passed (no bar under the top bar; the lesson card\'s announcement as text; the editor saves this platform\'s own).');
})();
