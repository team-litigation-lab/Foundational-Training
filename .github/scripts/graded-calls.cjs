// Graded calls from the CMS Call Simulator count in their lesson (js/ft-simulators.js): with the trainee's callsim:<id>
// (kept by the Training Portal) the dashboard band shows the best graded calls of lessons 4–6 averaged, a mock-call lesson's
// card its best graded call, and the Simulators' mock-call cards each lesson's best score, with 🎯 Take a graded call (a
// line's numbered graded calls: random=1) and 📞 Practice a caller (the line's practice calls, no random=1) going to the Call Simulator; a trainee without
// graded calls sees "—" and "No graded call yet".
// Usage: node .github/scripts/graded-calls.cjs [baseUrl]   (with .github/scripts/server.mjs running; needs Playwright)
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);

(async () => {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    page.on('pageerror', e => fail(`page error: ${e.message}`));
    const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await page.fill('#loginFirstInput', 'Gina'); await page.fill('#loginLastInput', 'Grade'); await page.fill('#loginBatchInput', 'CIG' + String(Date.now()).slice(-6));   // a new trainee each run
    await page.click('#loginSubmitBtn'); await page.waitForTimeout(1200);
    const id = await page.evaluate(() => state.traineeId);
    const rec = await page.evaluate(async (key) => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || '{}'), 'trainee:' + id);
    rec.approved = true; await put('trainee:' + id, rec);
    await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });

    // no graded calls yet
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);
    const none = await page.evaluate(() => ({ stat: (document.querySelector('.fts-calls-stat') || {}).innerText || '' }));
    if (!/—/.test(none.stat) || !/0 \/ 3 lessons/i.test(none.stat)) fail(`without graded calls the dashboard band should say — and 0 / 3: "${none.stat}"`);

    // two lessons with graded calls (as the Portal keeps them)
    await put('callsim:' + id, { traineeId: id, calls: [], best: { lesson4: { score: 90, calls: 1 }, lesson5: { score: 82, calls: 2 } } });
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);
    const dash = await page.evaluate(() => ({ stat: (document.querySelector('.fts-calls-stat') || {}).innerText || '',
        l4: (document.querySelector('#module-4 .mh-day') || {}).innerText || '', l5: (document.querySelector('#module-5 .mh-day') || {}).innerText || '', l6: (document.querySelector('#module-6 .mh-day') || {}).innerText || '' }));
    if (!/86%/.test(dash.stat) || !/2 \/ 3 lessons/i.test(dash.stat)) fail(`the dashboard band's graded calls: "${dash.stat}" (expected 86%, 2 / 3 lessons)`);
    if (!/📞 90%/.test(dash.l4) || !/📞 82%/.test(dash.l5) || /📞/.test(dash.l6)) fail(`the lesson cards' graded calls: ${JSON.stringify(dash)}`);
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(800);
    const cards = await page.evaluate(() => [...document.querySelectorAll('.fts-call')].map(c => ({ h: c.querySelector('h3').innerText, g: (c.querySelector('.fts-graded') || {}).innerText || '', b: [...c.querySelectorAll('button')].map(b => b.innerText).join('|') })));
    const by = (t) => cards.find(c => c.h === t) || {};
    if (!/best 90% · 1 call\b/.test(by('Reception Mock Calls').g) || !/best 82% · 2 calls/.test(by('Calendar Management Mock Calls').g) || !/No graded call yet/.test(by('Intake Mock Calls').g)) fail(`the mock-call cards' graded calls: ${JSON.stringify(cards)}`);
    if (!cards.every(c => /🎯 Take a graded call/.test(c.b) && /📞 Practice a caller/.test(c.b))) fail(`the mock-call cards' buttons: ${JSON.stringify(cards.map(c => c.b))}`);
    const hrefs = await page.evaluate(() => { const i = ACTIVITIES.findIndex(a => a.title === 'Intake Mock Calls'); return [keyHref('random', ACTIVITIES[i]), keyHref('practice', ACTIVITIES[i])]; }).catch(() => null);
    if (hrefs && (!/call\.html\?.*random=1/.test(hrefs[0]) || !/line=Intake/.test(hrefs[0]) || /random=1/.test(hrefs[1]) || !/line=Intake/.test(hrefs[1]))) fail(`the graded and practice links: ${JSON.stringify(hrefs)}`);

    await browser.close();
    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Graded calls test passed (the dashboard band, the lesson cards and the mock-call cards show the best graded calls; graded and practice links).');
})().catch(e => { console.error(e); process.exit(1); });
