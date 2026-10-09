// Graded calls from the CMS Call Simulator count in their lesson (js/ft-simulators.js): with the trainee's callsim:<id>
// (kept by the Training Portal) 📚 Modules — the landing page — shows the best graded calls of lessons 4–6 averaged in its
// stat row, a mock-call lesson's row its best graded call, and the Practice Lab's Reception, Calendaring and Intake
// sessions each lesson's best score, with the
// line's graded calls (mode=graded) and its practice calls going straight to the CMS Call Simulator; a trainee without
// graded calls sees "—" and "No graded call yet".
// Usage: node .github/scripts/graded-calls.cjs [baseUrl]   (with .github/scripts/server.mjs running; needs Playwright)
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');   // the trainee signs in (the name + batch form is gone)
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);

(async () => {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    page.on('pageerror', e => fail(`page error: ${e.message}`));
    const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await signIn(page, 'Gina', 'Grade' + String(Date.now()).slice(-6).replace(/\d/g, d => 'abcdefghij'[d]), 'B100926');   // a new trainee each run (letters only: a name takes no digits)
    const id = await page.evaluate(() => state.traineeId);
    const rec = await page.evaluate(async (key) => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || '{}'), 'trainee:' + id);
    rec.approved = true; await put('trainee:' + id, rec);
    await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });

    // no graded calls yet
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);
    const none = await page.evaluate(() => ({ stat: (document.querySelector('.fts-calls-stat') || {}).innerText || '' }));
    if (!/—/.test(none.stat) || !/0 \/ 3 lessons/i.test(none.stat)) fail(`without graded calls the Modules stat should say — and 0 / 3: "${none.stat}"`);

    // two lessons with graded calls (as the Portal keeps them)
    await put('callsim:' + id, { traineeId: id, calls: [], best: { lesson4: { score: 90, calls: 1 }, lesson5: { score: 82, calls: 2 } } });
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(2500);
    const dash = await page.evaluate(() => ({ view: state.view, stat: (document.querySelector('.fts-calls-stat') || {}).innerText || '',
        l4: (document.querySelector('#module-4 .lp-tags') || {}).innerText || '', l5: (document.querySelector('#module-5 .lp-tags') || {}).innerText || '', l6: (document.querySelector('#module-6 .lp-tags') || {}).innerText || '' }));
    if (dash.view !== 'modules') fail(`signing in should land on the Modules page: "${dash.view}"`);
    if (!/86%/.test(dash.stat) || !/2 \/ 3 lessons/i.test(dash.stat)) fail(`the Modules stat row's graded calls: "${dash.stat}" (expected 86%, 2 / 3 lessons)`);
    if (!/📞 90%/.test(dash.l4) || !/📞 82%/.test(dash.l5) || /📞/.test(dash.l6)) fail(`the lesson rows' graded calls: ${JSON.stringify(dash)}`);
    await page.evaluate(() => goto('simulators')); await page.waitForTimeout(800);
    // the Practice Sessions' cards for the three mock-call lessons (js/ft-sessions.js): each shows its lesson's best graded call
    const cards = await page.evaluate(() => [...document.querySelectorAll('.fss-card')].map(c => ({ h: c.querySelector('h3').innerText, g: (c.querySelector('.fts-graded') || {}).innerText || '' })));
    const by = (t) => cards.find(c => c.h.indexOf(t) >= 0) || {};
    if (!/best 90% · 1 call\b/.test(by('Reception Mock Calls').g) || !/best 82% · 2 calls/.test(by('Calendaring Practice Lab').g) || !/No graded call yet/.test(by('Intake Mock Calls').g)) fail(`the sessions' graded calls: ${JSON.stringify(cards)}`);
    // their tools: the CMS Call Simulator's graded calls (mode=graded) and practice calls on the session's line
    const links = await page.evaluate(() => ['reception', 'calendaring', 'intake'].map(id => FTSessions.links(id)));
    const lines = ['Reception Mock Calls', 'Calendar Management Mock Calls', 'Intake Mock Calls'];
    links.forEach((l, i) => {
        const line = 'line=' + encodeURIComponent(lines[i]).replace(/%20/g, '+');
        if (!/calls=1.*mode=graded/.test(l[0]) || l[0].indexOf(line) < 0 || /mode=graded/.test(l[1]) || l[1].indexOf(line) < 0) fail(`the graded and practice links (${lines[i]}): ${JSON.stringify(l)}`);
    });

    await browser.close();
    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Graded calls test passed (the Modules landing page: its stat row and lesson rows, and the Reception, Calendaring and Intake sessions, show the best graded calls; graded and practice links).');
})().catch(e => { console.error(e); process.exit(1); });
