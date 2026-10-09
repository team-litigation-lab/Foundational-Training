// The Daily Task Tracker and the Training Monitoring Sheet kept in Google Drive (js/ft-drive.js, worker.js checkDrive):
// with Google's export answered here (a tracker sheet as CSV, a Monitoring Sheet doc as text), /api/drive/check
//   - reads the trainee's sheet and checks the day with the tracker rules (every open task's Daily Note, the day's output links);
//   - checks the Monitoring Sheet per discussion;
//   - keeps the trainer's score and comment when it checks again, and lets a trainee check at most every 3 minutes;
//   - says how to share the file when Google answers with its sign-in page (a file not shared).
// Usage: node .github/scripts/drive.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const TR = globalThis.FTTrackerRules, D = TR.ptDate(), [y, m, d] = D.split('-'), us = `${+m}/${+d}/${y}`;
    const store = new Map(), id = 'dee-drive--b9';
    // PORTAL_ONLY=off so this test can mint a trainee token by name + batch; trainees really come in from
    // the LSH Training Portal (sso.cjs). What's checked here is the Drive trackers, not the sign-in.
    const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
    store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Dee Drive', batch: 'B9', approved: true }));
    const SHEET = 'https://docs.google.com/spreadsheets/d/1TrackerSheetIdForTheCiTest0001/edit#gid=7', DOC = 'https://docs.google.com/document/d/1MonitorDocIdForTheCiTest000001/edit';
    let shared = true;
    globalThis.fetch = async (url) => {
        const u = String(url);
        if (!shared) return new Response('<!doctype html><html>Sign in</html>', { status: 200 });
        if (u.includes('1TrackerSheetIdForTheCiTest0001/export?format=csv&gid=7')) return new Response(
            `LSH DAILY TASK TRACKER\nDate Received,Type of Task,Task Details,Accountable VA,${us},VA Notes,Deadline,Status,Actual Completion Date\n` +
            `⬇ FOR COMPLETION ⬇\n${us},LSH-TRAINING,Reception lesson,Dee,"Finished the slides, took notes",Learned the spiel,ASAP,Ongoing,\n⬇ RECURRING ⬇\n,LSH-TRAINING,Typing Test,Dee,,,,Ongoing,\n`);
        if (u.includes('1MonitorDocIdForTheCiTest000001/export?format=txt')) return new Response(
            'Virtual Assistant Essentials - Day 1\nDate: 10/01/2026\n5 Major Takeaways From This Discussion\n1. A Legal VA supports the attorney with case tasks.\n2. Federal courts hear cases between parties in different states.\n3. Solo attorneys gain the most from a VA handling intake.\n4. Clear written updates build the client’s trust.\n5. Deadlines are tracked in the firm’s calendar every day.\n3 Questions That You Still Have\n1. How are court deadlines counted?\nRate Your Understanding\n[x] I am confident that I can do this on my own.\n');
        return new Response('not found', { status: 404 });
    };
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const trainee = (await call('/api/auth/trainee', { name: 'Dee Drive', batch: 'B9' })).body.token;
    // the trainee saves their links and the day's output link (drive:<id> is theirs)
    const w = await call('/api/storage/set', { key: 'drive:' + id, value: JSON.stringify({ folder: 'https://drive.google.com/drive/folders/abc', tracker: SHEET, monitor: DOC, days: { [D]: { links: [{ label: 'Typing Test AM', url: 'https://drive.google.com/file/d/xyz/view' }] } } }) }, trainee);
    if (w.status !== 200) fail(`a trainee couldn't save their Drive links: ${JSON.stringify(w)}`);
    const nope = await call('/api/storage/set', { key: 'trackerreview:' + id, value: '{}' }, trainee);
    if (nope.status !== 403) fail('a trainee could write their own check (trackerreview)');
    const r1 = await call('/api/drive/check', {}, trainee);
    const day = r1.body && r1.body.review && r1.body.review.days[D];
    if (!day || day.source !== 'drive') fail(`the tracker wasn't checked: ${JSON.stringify(r1)}`);
    else {
        const notes = day.rules.find(r => r.id === 'daily-notes'), links = day.rules.find(r => r.id === 'output-links');
        if (!notes || notes.pct !== 50) fail(`the Daily Notes rule should find 1 of 2 open tasks noted: ${JSON.stringify(notes)}`);
        if (!links || !links.pass) fail(`the output links rule: ${JSON.stringify(links)}`);
        if (day.pct !== 75) fail(`the day's % should be 75: ${day.pct}`);
    }
    const mon = r1.body && r1.body.review && r1.body.review.monitor;
    if (!mon || mon.found !== 1 || !mon.entries[0] || mon.entries[0].pct !== 100) fail(`the Monitoring Sheet check: ${JSON.stringify(mon)}`);
    // the trainer's score and comment survive the next check
    const cur = JSON.parse(store.get('ft:trackerreview:' + id)); cur.days[D].trainerScore = 90; cur.days[D].comment = 'Good notes.'; cur.monitor.comment = 'Complete.';
    await call('/api/storage/set', { key: 'trackerreview:' + id, value: JSON.stringify(cur) }, admin);
    const again = await call('/api/drive/check', {}, trainee);
    if (again.status !== 429) fail(`a trainee checking twice in a row should wait: ${again.status}`);
    const r2 = await call('/api/drive/check', { id }, admin);
    const day2 = r2.body.review.days[D];
    if (day2.trainerScore !== 90 || day2.comment !== 'Good notes.' || r2.body.review.monitor.comment !== 'Complete.') fail(`a new check lost the trainer's input: ${JSON.stringify(day2)}`);
    // a file that isn't shared: Google answers with its sign-in page
    shared = false;
    const r3 = await call('/api/drive/check', { id }, admin);
    const sheetRule = (r3.body.review.days[D].rules || [])[0];
    if (!sheetRule || sheetRule.id !== 'sheet' || !/Anyone with the link/.test(sheetRule.detail)) fail(`an unshared sheet should say how to share it: ${JSON.stringify(sheetRule)}`);
    if (!/Anyone with the link/.test(r3.body.review.monitor.error || '')) fail('an unshared Monitoring Sheet should say how to share it');

    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Drive trackers test passed (the tracker sheet and the Monitoring Sheet checked from Drive, the trainer\'s input kept, a trainee waits 3 minutes between checks, an unshared file explained).');
})().catch(e => { console.error(e); process.exit(1); });
