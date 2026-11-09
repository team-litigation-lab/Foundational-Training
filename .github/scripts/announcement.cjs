// 📢 The announcement ticker (js/ft-announcement.js): this platform's own, for the Foundational trainees only (Admin → 📢
//   Announcements; the Main Portal's broadcast isn't shown or edited here), read through /api/announcement, shown under the
//   top bar for a trainee and a trainer, as text (never HTML), with the live clock and its time zone; hidden when there is none.
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
    await page.evaluate(() => { goto('dashboard'); });
    await page.waitForFunction(() => /Mock calls start/.test((document.querySelector('.ft-ann [data-ft-ann-text]') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
    const t = await page.evaluate(() => { const b = document.querySelector('.ft-ann'), r = b && b.getBoundingClientRect(), top = document.querySelector('.topbar');
      return { shown: !!b && !b.hidden && r.height > 0, text: b ? b.querySelector('[data-ft-ann-text]').textContent : '', imgs: b ? b.querySelectorAll('img').length : -1,
        under: !!(b && top && b.getBoundingClientRect().top >= top.getBoundingClientRect().bottom - 2), clock: b ? b.querySelector('[data-ft-ann-clock]').textContent : '', xss: window.__xss || 0 }; });
    if (!t.shown || !/Mock calls start at 9:00 AM PHT/.test(t.text)) fail(`the trainee doesn't see the announcement: ${JSON.stringify(t)}`);
    if (t.imgs || t.xss) fail('the announcement was drawn as HTML');
    if (await page.$('.ft-ann-edit')) fail('a trainee has ✏️ Edit on the announcement bar');
    if (await page.evaluate(() => { FTAnnouncement.edit(); return state.view === 'admin' || !!document.querySelector('.ann-ed'); })) fail('a trainee can open the announcement editor');
    await page.evaluate(() => { document.querySelectorAll('.overlay').forEach(o => o.remove()); goto('dashboard'); });
    if (/PORTAL BROADCAST/.test(t.text)) fail('the Main Portal\'s broadcast is on this platform\'s ticker');
    if (!t.under) fail('the ticker isn\'t under the top bar');
    if (method !== 'POST') fail(`the page asks for the announcement with ${method}, not POST (the Worker's /api/ routes are POST only)`);
    if (!/\d{1,2}:\d{2}:\d{2}/.test(t.clock)) fail(`no live clock: ${t.clock}`);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, clip: { x: 0, y: 0, width: 1500, height: 220 } });
    // (the time zone picked is kept, and the clock follows it)
    await page.selectOption('.ft-ann select', 'America/New_York');
    if (await page.evaluate(() => { try { return localStorage.getItem('ft_ann_tz'); } catch (e) { return ''; } }) !== 'America/New_York') fail('the time zone picked isn\'t kept');
    // (a trainer sees it too)
    await page.evaluate(() => { state.isAdmin = true; state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(800);
    if (!(await page.evaluate(() => { const b = document.querySelector('.ft-ann'); return !!b && !b.hidden && /Mock calls/.test(b.textContent); }))) fail('a trainer doesn\'t see the announcement');
    // (not on a Day deck, a presentation drawn as large as the screen allows)
    await page.evaluate(() => { state.isAdmin = false; FTDayDecks.open(1); }).catch(() => {});
    if (await page.evaluate(() => state.view === 'daydeck' && !!document.querySelector('.ft-ann:not([hidden])'))) fail('the ticker shows on a Day deck with no lesson announcement');
    // 📢 this platform's own and each lesson's: the platform's, then the trainee's lesson's; on a Day deck only that lesson's;
    // on the lesson's card too
    own = { platform: { text: 'Mock calls moved to 2 PM' }, lessons: { 1: { text: 'Bring your headset for VA Essentials' } } };
    await page.evaluate(async () => { await FTAnnouncement.reload(); goto('dashboard'); }); await page.waitForTimeout(600);
    { const t = await page.evaluate(() => (document.querySelector('.ft-ann:not([hidden]) [data-ft-ann-text]') || {}).textContent || '');
      if (!/Mock calls moved to 2 PM/.test(t) || /PORTAL BROADCAST/.test(t)) fail(`the ticker isn't the platform's own announcement: ${t}`); }
    await page.evaluate(() => FTDayDecks.open(1)); await page.waitForTimeout(600);
    { const t = await page.evaluate(() => (document.querySelector('.ft-ann:not([hidden]) [data-ft-ann-text]') || {}).textContent || '');
      if (t !== 'Bring your headset for VA Essentials') fail(`on Day 1's deck the ticker isn't the lesson's own announcement: ${t}`); }
    { const c = await page.evaluate(() => typeof FTAnnouncement.lessonHtml === 'function' ? FTAnnouncement.lessonHtml(1) : '');
      if (!/Bring your headset/.test(c) || /hidden/.test(c)) fail(`the lesson's card doesn't carry its announcement: ${c}`); }
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
    own = null; await page.route('**/api/announcement', r => { method = r.request().method(); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, text, own }) }); });
    // (none of its own: no ticker, even with a Portal broadcast)
    await page.evaluate(() => FTAnnouncement.reload()); await page.waitForTimeout(400);
    // (a trainer keeps the bar, with ✏️ Edit, so an announcement can be added from any page; in 👁 Trainee view it's gone)
    { const tr = await page.evaluate(() => { const b = document.querySelector('.ft-ann'); return { shown: !!b && !b.hidden, edit: !!document.querySelector('.ft-ann-edit'), text: (document.querySelector('[data-ft-ann-text]') || {}).textContent || '' }; });
      if (!tr.shown || !tr.edit || !/No announcement yet/.test(tr.text)) fail('a trainer with no announcement doesn\'t get the bar with ✏️ Edit: ' + JSON.stringify(tr)); }
    await page.evaluate(() => { state.adminTab = 'batchsheet'; goto('admin'); }); await page.waitForTimeout(500);
    await page.click('.ft-ann-edit'); await page.waitForTimeout(1200);
    if (!(await page.evaluate(() => state.view === 'admin' && state.adminTab === 'announcements' && !!document.querySelector('.ann-ed')))) fail('✏️ Edit on the bar doesn\'t open the announcement editor');
    if (!(await page.evaluate(() => document.activeElement && document.activeElement.matches('textarea[data-ann="platform"]')))) fail('✏️ Edit doesn\'t put the cursor in the platform\'s announcement');
    // (✏️ Edit called while in 👁 Trainee view: back to the trainer's view, on the editor)
    await page.evaluate(() => { state.adminTab = 'batchsheet'; goto('admin'); setAdminViewMode('trainee'); }); await page.waitForTimeout(500);
    await page.evaluate(() => FTAnnouncement.edit()); await page.waitForTimeout(1200);
    if (!(await page.evaluate(() => state.isAdmin && !state.adminPreview && state.adminTab === 'announcements' && !!document.querySelector('.ann-ed')))) fail('✏️ Edit from 👁 Trainee view doesn\'t open the editor');
    await page.evaluate(() => { state.adminPreview = true; render(); FTAnnouncement.reload(); }); await page.waitForTimeout(400);
    if (!(await page.evaluate(() => [...document.querySelectorAll('.ft-ann')].every(b => b.hidden)))) fail('an empty announcement still shows the ticker');
    await page.evaluate(() => { state.adminPreview = false; render(); });
  } catch (e) { fail(e.stack || String(e)); }
  await browser.close();
  if (failures.length) { console.error('Announcement test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Announcement test passed (this platform\'s own announcement under the top bar for a trainee and a trainer, as text, with the live clock and its time zone kept; hidden when there is none).');
})();
