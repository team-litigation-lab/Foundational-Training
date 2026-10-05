// Server requests: every /api/ request counts toward the Cloudflare account's requests (Workers Paid: 10 million
// a month, shared by every LSH site), so an open page must ask sparingly. The EA/PA portal's test, for this program.
// 1. /api/storage/get-many (worker.js, in secure mode): a trainee gets their own and public records only, an Admin
//    every one, the records are this program's ("ft:" keys, never another course's), and more than 100 keys are refused.
// 2. In a browser (checks sped up with window.EAPA_POLL): a signed-in trainee's page reads the tasks for every open
//    lesson in one request, reads their record about once per check, reads the open lessons (both settings in one
//    request) and checks for a new version rarely, and asks nothing while the tab is in the background (catching up
//    when it's back) or on a quick switch to another tab and back. A server that doesn't answer never signs the
//    trainee out or locks their lessons; a revoke still signs them out.
//    The Admin's Trainee Audit reads every trainee in two requests (the list, then get-many), and 📋 Task Trackers,
//    📒 Monitoring Sheets and ✍️ Process Questions read the trainees' sheets with get-many, not one request each.
// Usage: node .github/scripts/requests.cjs [baseUrl]   (with .github/scripts/server.mjs running; needs Playwright)
const { chromium } = require('playwright');
const path = require('path'); const { pathToFileURL } = require('url');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = (m) => failures.push(m);

async function workerChecks() {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    // KV as Cloudflare holds it: this program's records under "ft:", the EA/PA portal's with no prefix.
    const store = new Map([
        ['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })],
        ['ft:trainee:ben-diaz--b1', JSON.stringify({ id: 'ben-diaz--b1', name: 'Ben Diaz', batch: 'B1', approved: true })],
        ['ft:surprise-task-day1', JSON.stringify({ title: 'An FT task' })],
        ['surprise-task-day2', JSON.stringify({ title: 'An EA/PA task' })]
    ]);
    const env = {
        MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) }
    };
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
    const a = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const keys = ['trainee:ana-cruz--b1', 'trainee:ben-diaz--b1', 'surprise-task-day1', 'surprise-task-day2'];
    const asTrainee = await call('/api/storage/get-many', { keys }, t);
    const v = (asTrainee.body && asTrainee.body.values) || {};
    if (asTrainee.status !== 200 || !v['trainee:ana-cruz--b1'] || !v['surprise-task-day1'] || !('surprise-task-day2' in v)) fail(`get-many as a trainee: ${JSON.stringify(asTrainee)}`);
    if ('trainee:ben-diaz--b1' in v) fail('get-many lets a trainee read another trainee\'s record');
    if (v['surprise-task-day1'] && JSON.parse(v['surprise-task-day1']).title !== 'An FT task') fail(`get-many read the wrong record for surprise-task-day1: ${v['surprise-task-day1']}`);
    if (v['surprise-task-day2'] != null) fail(`get-many read another course's record (no "ft:" prefix): ${v['surprise-task-day2']}`);
    const asAdmin = await call('/api/storage/get-many', { keys }, a);
    if (!asAdmin.body || !asAdmin.body.values || !asAdmin.body.values['trainee:ben-diaz--b1']) fail(`get-many as an Admin: ${JSON.stringify(asAdmin)}`);
    if ((await call('/api/storage/get-many', { keys }, null)).status !== 401) fail('get-many works without signing in');
    if ((await call('/api/storage/get-many', { keys: Array.from({ length: 101 }, (_, i) => 'k' + i) }, a)).status !== 400) fail('get-many takes more than 100 keys');
    if ((await call('/api/storage/get-many', { keys: [] }, a)).status !== 400) fail('get-many takes no keys');
}

(async () => {
    await workerChecks();

    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
    page.on('pageerror', e => fail(`page error: ${e.message}`));
    await page.addInitScript(() => { window.EAPA_POLL = { live: 500, approval: 2000, labReset: 2000, feedback: 4000, admin: 2000, update: 3000, updateConfirm: 500, openDays: 3000 }; });
    const log = [];
    let refuse = false;   // the server stops answering (Cloudflare's request limit: 429)
    await page.route('**/*', async (route) => {
        const req = route.request(), u = new URL(req.url());
        if (u.pathname.startsWith('/api/') || u.pathname === '/version') {
            let key = ''; try { const b = JSON.parse(req.postData() || '{}'); key = b.key || (b.keys ? `[${b.keys.length}] ` + b.keys.join(',') : ''); } catch (e) {}
            log.push({ at: Date.now(), path: u.pathname, key, n: (() => { try { return (JSON.parse(req.postData() || '{}').keys || []).length; } catch (e) { return 0; } })() });
            if (refuse) return route.fulfill({ status: 429, contentType: 'text/html', body: '<h1>Error 1027</h1>' });
        }
        return route.continue();
    });
    const since = (t, f) => log.filter(x => x.at >= t && (!f || f(x)));
    const put = (key, value) => page.evaluate(([key, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(value) }) }), [key, value]);
    await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
    await page.fill('#loginFirstInput', 'Req'); await page.fill('#loginLastInput', 'Count'); await page.fill('#loginBatchInput', 'CIREQ');
    await page.click('#loginSubmitBtn'); await page.waitForTimeout(1200);
    const me = await page.evaluate(() => 'trainee:' + state.traineeId);   // their record (kept here: a sign-out clears state.traineeId)
    const setApproved = (on) => page.evaluate(async ([on, key]) => {
        const r = await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key }) }).then(r => r.json());
        const rec = JSON.parse(r.value || '{}'); rec.approved = on;
        await fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(rec) }) });
    }, [on, me]);
    await setApproved(true);
    // Every lesson open for every batch (Admin → 📅 Open Lessons), so the tasks check covers all of them.
    await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(3000);
    if (!(await page.evaluate((me) => 'trainee:' + state.traineeId === me && state.view !== 'login', me))) fail('the trainee didn\'t get signed in');
    const nDays = await page.evaluate(() => DAYS.length);
    const openDays = () => page.evaluate(() => DAYS.filter(d => dayUnlocked(d.id)).length);
    if ((await openDays()) !== nDays) fail(`${await openDays()} of the ${nDays} lessons are open (expected all of them)`);

    // in view: 8 s of checks (sped up: the trainee's check every 2 s, the update check and the open lessons every 3 s)
    let t0 = Date.now(); await page.waitForTimeout(8000);
    const all = since(t0), ticks = 4;
    const singleTasks = all.filter(x => x.path === '/api/storage/get' && /^surprise-task-day/.test(x.key));
    const many = all.filter(x => x.path === '/api/storage/get-many' && /surprise-task-day/.test(x.key));
    const record = all.filter(x => x.path === '/api/storage/get' && x.key === me);
    const version = all.filter(x => x.path === '/version');
    const open = all.filter(x => x.path === '/api/storage/get-many' && /settings:opendays/.test(x.key));
    const singleOpen = all.filter(x => x.path === '/api/storage/get' && /^settings:open(days|videos)$/.test(x.key));
    if (singleTasks.length) fail(`the tasks are read one lesson at a time (${singleTasks.length} requests in 8 s): they should come in one get-many`);
    if (!many.length || many.length > ticks + 1) fail(`the tasks check ran ${many.length} times in 8 s (expected about ${ticks})`);
    if (many.some(x => x.n !== nDays)) fail(`the tasks check asked for ${many.map(x => x.n).join(', ')} lessons (expected all ${nDays} in one request)`);
    if (!record.length || record.length > 2 * ticks + 1) fail(`the trainee's record was read ${record.length} times in 8 s (expected about ${ticks})`);
    if (version.length > 4) fail(`the version was checked ${version.length} times in 8 s (expected 3 or so)`);
    if (singleOpen.length) fail(`the open lessons are read one setting at a time (${singleOpen.length} requests in 8 s): both should come in one get-many`);
    if (!open.length || open.length > 4) fail(`the open lessons were read ${open.length} times in 8 s (expected 3 or so)`);
    const perCheck = all.length / ticks;
    if (perCheck > 5) fail(`${all.length} requests in 8 s (${perCheck.toFixed(1)} per check): ${JSON.stringify(all.map(x => x.path + ' ' + x.key.slice(0, 40)))}`);

    // in the background: nothing; back in view: it catches up at once
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    t0 = Date.now(); await page.waitForTimeout(6000);
    const hidden = since(t0);
    if (hidden.length) fail(`${hidden.length} requests while the tab was in the background: ${JSON.stringify(hidden.map(x => x.path + ' ' + x.key.slice(0, 40)))}`);
    t0 = Date.now();
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(800);
    if (!since(t0, x => x.key === me).length) fail(`coming back to the tab didn't check the trainee's record: ${JSON.stringify(since(t0 - 1000).map(x => x.path + ' ' + x.key.slice(0, 40)))}`);
    if (!since(t0, x => /settings:opendays/.test(x.key)).length) fail(`coming back to the tab didn't check the open lessons (a check was due): ${JSON.stringify(since(t0 - 1000).map(x => x.path + ' ' + x.key.slice(0, 40)))}`);
    // a quick look at another tab (Meet) and back asks nothing: a second tab with the real timings,
    // between its scheduled checks (the first round runs as it opens; the next is a minute away)
    const page2 = await page.context().newPage();
    const log2 = [];
    page2.on('request', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/') || u.pathname === '/version') log2.push({ at: Date.now(), path: u.pathname }); });
    page2.on('pageerror', e => fail(`page error (second tab): ${e.message}`));
    await page2.goto(BASE, { waitUntil: 'load' }); await page2.waitForTimeout(22000);   // its first check rounds: 15 s (feedback), 20 s (version)
    const flip = (v) => page2.evaluate((v) => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v }); document.dispatchEvent(new Event('visibilitychange')); }, v);
    await flip('hidden'); await page2.waitForTimeout(500);
    t0 = Date.now(); await flip('visible'); await page2.waitForTimeout(1500);
    const flick = log2.filter(x => x.at >= t0);
    if (flick.length) fail(`a quick switch to another tab and back sent ${flick.length} requests: ${JSON.stringify(flick.map(x => x.path))}`);
    await page2.close();

    // the server stops answering: the trainee stays signed in (it was signing them out as "revoked"), and their
    // lessons stay open
    refuse = true; await page.waitForTimeout(5000); refuse = false;
    const still = await page.evaluate(() => ({ id: state.traineeId, view: state.view }));
    if (!still.id || still.view === 'login') fail(`a server that didn't answer signed the trainee out: ${JSON.stringify(still)}`);
    if ((await openDays()) !== nDays) fail(`a server that didn't answer locked the trainee's lessons (${await openDays()} of ${nDays} open)`);
    // a real revoke still signs them out
    await setApproved(false); await page.waitForTimeout(3500);
    if ((await page.evaluate(() => state.view)) !== 'login') fail('a revoked trainee wasn\'t signed out');

    // the Admin: six trainees, each with a Task Tracker, a Monitoring Sheet and Process Questions answers
    const names = ['Ana', 'Ben', 'Cora', 'Dan', 'Eve', 'Finn'];
    await page.evaluate(async (names) => {
        const set = (key, v) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value: JSON.stringify(v) }) });
        for (let i = 0; i < names.length; i++) {
            const id = 'ci-' + i + '--x';
            await set('trainee:' + id, { id, name: names[i] + ' Tester', batch: 'X', approved: true });
            await set('tracker:' + id, FTTrackerRules.template(names[i], FTTrackerRules.ptDate()));
            await set('monitor:' + id, { entries: {} });
            await set('process:' + id, { sets: {} });
        }
        state.isAdmin = true;
    }, names);
    // the Trainee Audit: every trainee in two requests
    t0 = Date.now();
    const n = await page.evaluate(async () => { await loadAdminLedgerQuiet(); return state.adminData.length; });
    const ledger = since(t0, x => x.path.startsWith('/api/storage/'));
    if (n < 6) fail(`the Trainee Audit has ${n} trainees (expected at least 6)`);
    if (ledger.length !== 2) fail(`the Trainee Audit took ${ledger.length} requests (expected 2: the list, then get-many): ${JSON.stringify(ledger.map(x => x.path))}`);
    t0 = Date.now();
    await page.evaluate(async () => { await loadAdminLedger(); });
    if (since(t0, x => x.path === '/api/storage/get').length) fail('opening the Trainee Audit still reads the trainees one at a time');
    // 📋 Task Trackers, 📒 Monitoring Sheets, ✍️ Process Questions: the list, the trainees, their sheets
    await page.evaluate(() => goto('admin')).catch(e => fail(`opening Admin: ${e.message}`)); await page.waitForTimeout(1500);
    for (const [tab, sheets, label] of [['trackers', 'tracker|trackerreview', 'Task Trackers'], ['monitor', 'monitor', 'Monitoring Sheets'], ['process', 'process', 'Process Questions']]) {
        t0 = Date.now();
        await page.evaluate((tab) => setAdminTab(tab), tab).catch(e => fail(`opening ${label}: ${e.message}`));
        await page.waitForTimeout(1500);
        const one = since(t0, x => x.path === '/api/storage/get' && new RegExp(`^(trainee|${sheets}):`).test(x.key));
        if (one.length) fail(`${label} reads ${one.length} records one at a time: ${JSON.stringify(one.map(x => x.key))}`);
        const got = since(t0, x => x.path === '/api/storage/get-many');
        if (!got.length || got.length > 3) fail(`${label} took ${got.length} get-many requests (expected 2: the trainees, then their sheets)`);
        const shown = await page.evaluate((names) => names.filter(nm => document.body.innerText.includes(nm + ' Tester')).length, names);
        if (shown !== names.length) fail(`${label} lists ${shown} of the ${names.length} trainees`);
    }

    await browser.close();
    if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log(`Server requests test passed (get-many rules and the "ft:" prefix; a trainee's page: ${all.length} requests in 8 s of sped-up checks, the tasks for all ${nDays} lessons in one, none in the background or on a quick tab switch; a dead server doesn't sign anyone out or lock their lessons; the Trainee Audit in 2 requests; the Task Trackers, Monitoring Sheets and Process Questions tabs with get-many).`);
})().catch(e => { console.error(e); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); });
