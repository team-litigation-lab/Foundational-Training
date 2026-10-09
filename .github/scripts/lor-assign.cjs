// 🧑‍🏫 Assign cases, the LOR Drafting Activity's admin panel (js/ft-lor.js):
//   1. One row per batch folder — not one per trainee — with the batch's name and how many have a case.
//   2. The trainees are a dropdown, each option naming the case that trainee already has.
//   3. Picking a trainee shows their case; choosing a case writes lorassign:<id> and relabels the option.
//   4. An admin can archive one trainee, or a whole batch, and restore a batch: trainee:<id>.archived,
//      the same two fields the engine's Batch Folders write, so both views agree.
// Usage: node .github/scripts/lor-assign.cjs [baseUrl]   (with .github/scripts/server.mjs running; needs Playwright)
const { chromium } = require('playwright');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);

(async () => {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    page.on('pageerror', e => fail(`page error: ${e.message}`));
    page.on('dialog', d => d.accept());          // the archive / restore confirmations
    const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
    const get = (key) => page.evaluate(async (key) => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json())).value || 'null'), key);

    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    // two batches: one with two trainees, one with a single trainee
    const older = 'B010126', newer = 'B100926';
    await signIn(page, 'Pia', 'Assign', newer);
    const me = await page.evaluate(() => state.traineeId);
    const mate = 'bo-batchmate--' + newer.toLowerCase(), old = 'oona-older--' + older.toLowerCase();
    // The test server keeps its storage between runs, so put every fixture back to a known state:
    // nobody archived, Bo holding Case 2 and Pia holding none.
    const rec = await get('trainee:' + me); rec.approved = true; rec.archived = false; delete rec.archivedAt;
    await put('trainee:' + me, rec);
    await put('trainee:' + mate, { id: mate, name: 'Bo Batchmate', batch: newer, approved: true, archived: false });
    await put('trainee:' + old, { id: old, name: 'Oona Older', batch: older, approved: true, archived: false });
    await put('lorassign:' + mate, { case: 2, at: new Date().toISOString(), by: 'trainer' });
    await put('lorassign:' + me, { case: null });

    const openAdmin = async () => {
        await page.evaluate(() => { state.isAdmin = true; FTLor.refreshAdmin(); goto('lor'); });
        await page.waitForFunction(() => !document.querySelector('main').innerText.includes('Loading the trainees'), null, { timeout: 15000 });
        await page.waitForTimeout(400);
    };
    // The test server carries its own trainees, so every folder is found by its batch name, never by position.
    const panel = () => page.evaluate(() => {
        const folders = [...document.querySelectorAll('.lor-assign .lor-batch')].map(f => ({
            batch: ((f.querySelector('.lor-bhead > b') || {}).textContent || '').replace(/^📁\s*/, '').trim(),
            head: (f.querySelector('.lor-bhead') || {}).innerText || '',
            people: [...f.querySelectorAll('.lor-who option')].map(o => o.textContent.trim()),
            picked: (f.querySelector('.lor-who') || {}).value || '',
            caseSel: (f.querySelectorAll('select')[1] || {}).value || '',
            rows: f.querySelectorAll('.lor-arow').length,
        }));
        // textContent, not innerText: the 📦 Archived block is a closed <details>, so its rows are hidden
        return { folders, order: folders.map(f => f.batch),
                 archived: (document.querySelector('.lor-archived') || {}).textContent || '' };
    });
    const folderFor = (p, batch) => p.folders.find(f => f.batch === 'Batch ' + batch) || { head: '(no folder)', people: [], order: [] };

    await openAdmin();
    let p = await panel();

    // 1. one row per batch folder, newest batch before older, with the counts in its head
    let mine = folderFor(p, newer);
    if (p.folders.some(f => f.rows !== 1)) fail(`a batch folder shows ${p.folders.map(f => f.rows).join('/')} rows — it should be one row per folder, not one per trainee`);
    if (p.order.indexOf('Batch ' + newer) > p.order.indexOf('Batch ' + older)) fail(`the newer batch should be listed before the older one: ${p.order.join(' / ')}`);
    if (!/2 trainees · 1 of 2 assigned/.test(mine.head.replace(/\s+/g, ' '))) fail(`the batch head should count its trainees and assignments: ${mine.head}`);
    if (!/📦 Archive batch/.test(mine.head)) fail('a batch folder has no 📦 Archive batch button');

    // 2. the trainees are a dropdown, each option naming the case that trainee already has
    const opts = mine.people.join(' | ');
    if (mine.people.length !== 2) fail(`the trainee dropdown lists ${mine.people.length} trainees (expected 2): ${opts}`);
    if (!/Bo Batchmate — Case 2/.test(opts)) fail(`an assigned trainee's option should name their case: ${opts}`);
    if (!/Pia Assign — no case yet/.test(opts)) fail(`an unassigned trainee's option should say so: ${opts}`);
    // the folder opens on someone still waiting for a case, so the next one to hand out is in front of you
    if (mine.picked !== me) fail('the folder should open on a trainee who has no case yet');
    if (mine.caseSel !== '') fail(`that trainee's case dropdown should read "not assigned": ${mine.caseSel}`);

    // 3. picking the other trainee shows their case
    await page.evaluate(([b, id]) => FTLor.pick(b, id), [newer, mate]); await page.waitForTimeout(300);
    mine = folderFor(await panel(), newer);
    if (mine.caseSel !== '2') fail(`picking an assigned trainee should show their case: ${mine.caseSel}`);

    // 4. assigning a case writes lorassign:<id> and relabels the option
    await page.evaluate(([b, id]) => FTLor.pick(b, id), [newer, me]); await page.waitForTimeout(300);
    await page.evaluate((b) => {
        const f = [...document.querySelectorAll('.lor-assign .lor-batch')].find(f => ((f.querySelector('.lor-bhead > b') || {}).textContent || '').includes(b));
        const s = f.querySelectorAll('select')[1]; s.value = '3'; s.dispatchEvent(new Event('change'));
    }, newer);
    await page.waitForTimeout(1200);
    const saved = await get('lorassign:' + me);
    if (!saved || Number(saved.case) !== 3) fail(`choosing a case should write lorassign:<id>: ${JSON.stringify(saved)}`);
    mine = folderFor(await panel(), newer);
    if (!/Pia Assign — Case 3/.test(mine.people.join(' | '))) fail(`the option should relabel once assigned: ${mine.people.join(' | ')}`);
    if (!/2 of 2 assigned/.test(mine.head.replace(/\s+/g, ' '))) fail(`the head count should follow: ${mine.head}`);

    // 5. archiving one trainee: the record carries archived + archivedAt, and they leave the folder
    await page.evaluate((id) => FTLor.archiveTrainee(id), mate);
    await page.waitForFunction(() => !document.querySelector('main').innerText.includes('Loading the trainees'), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const mrec = await get('trainee:' + mate);
    if (!mrec || mrec.archived !== true || !mrec.archivedAt) fail(`archiving a trainee should set archived + archivedAt: ${JSON.stringify(mrec)}`);
    p = await panel(); mine = folderFor(p, newer);
    if (mine.people.join(' | ').includes('Bo Batchmate')) fail('an archived trainee is still in the dropdown');
    if (!/1 trainee · 1 of 1 assigned/.test(mine.head.replace(/\s+/g, ' '))) fail(`the head count should drop: ${mine.head}`);
    if (!/Bo Batchmate/.test(p.archived)) fail(`an archived trainee should be listed under 📦 Archived: ${p.archived}`);

    // 6. archiving a whole batch takes every trainee in it
    await page.evaluate((b) => FTLor.archiveBatch(b), older);
    await page.waitForFunction(() => !document.querySelector('main').innerText.includes('Loading the trainees'), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const orec = await get('trainee:' + old);
    if (!orec || orec.archived !== true) fail(`archiving a batch should archive its trainees: ${JSON.stringify(orec)}`);
    p = await panel();
    if (p.order.includes('Batch ' + older)) fail(`the archived batch should leave the list: ${p.order.join(' / ')}`);
    if (!/Oona Older/.test(p.archived)) fail(`the archived batch should be listed under 📦 Archived: ${p.archived}`);

    // 7. restoring a batch brings it back
    await page.evaluate((b) => FTLor.restoreBatch(b), older);
    await page.waitForFunction(() => !document.querySelector('main').innerText.includes('Loading the trainees'), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const orec2 = await get('trainee:' + old);
    if (!orec2 || orec2.archived !== false || orec2.archivedAt) fail(`restoring should clear archived and archivedAt: ${JSON.stringify(orec2)}`);
    p = await panel();
    if (!p.order.includes('Batch ' + older)) fail(`the restored batch should be back: ${p.order.join(' / ')}`);

    await browser.close();
    if (failures.length) { console.error(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.error(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Assign cases test passed (one row per batch folder with its counts, the trainees as a dropdown naming each one\'s case, picking and assigning, and archiving a trainee, a batch and restoring it).');
})().catch(e => { console.error(e); process.exit(1); });
