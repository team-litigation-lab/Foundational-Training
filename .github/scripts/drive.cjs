// The Daily Task Tracker and the Training Progress Monitoring Sheet kept in Google Drive (js/ft-drive.js, worker.js checkDrive):
// with Google's export answered here (a tracker sheet as CSV, a Monitoring Sheet doc as text), /api/drive/check
//   - reads the trainee's sheet and checks the day with the tracker rules (every open task's Daily Note, the day's output links);
//   - checks the Monitoring Sheet per discussion;
//   - keeps the trainer's score and comment when it checks again, and lets a trainee check at most every 3 minutes;
//   - lists the answer sheets in the trainee's Assessment and Activities Folder through the service account (/api/drive/answers);
//   - 📄 Save PDF to my Folder: writes an answer sheet into that folder as a PDF, and replaces it when saved again (/api/drive/save);
//   - 🧪 finds the Typing and Spelling Test screenshots in the folder (/api/drive/shots and the nightly check), keeping what was found
//     when the folder can't be read;
//   - says the file can't be opened when Google answers with its sign-in page.
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
    let shared = true, folderGone = false;
    const uploads = [];   // 💾 Save to Drive: what the Worker sent to Google's upload endpoint
    let saveError = null;
    globalThis.fetch = async (url, init = {}) => {
        const u = String(url);
        if (u.startsWith('https://www.googleapis.com/upload/drive/v3/files')) {
            if (saveError) return new Response(JSON.stringify({ error: { errors: [{ reason: saveError }] } }), { status: 403 });
            const body = init.body && init.body.text ? await init.body.text() : String(init.body || ''); uploads.push({ url: u, method: init.method, body });
            const meta = JSON.parse(body.split('\r\n\r\n')[1].split('\r\n')[0]);
            return new Response(JSON.stringify({ id: 'saved1', name: meta.name, webViewLink: 'https://docs.google.com/document/d/saved1/edit', createdTime: '2026-10-29T15:00:00Z' }));
        }
        if (u.startsWith('https://www.googleapis.com/drive/v3/files?') && decodeURIComponent(u).includes(' and name = ')) {
            return new Response(JSON.stringify({ files: uploads.length ? [{ id: 'saved1' }] : [] }));
        }
        if (folderGone && u.startsWith('https://drive.google.com/embeddedfolderview')) return new Response('', { status: 404 });
        if (!shared) return new Response('<!doctype html><html>Sign in</html>', { status: 200 });
        if (u.includes('1TrackerSheetIdForTheCiTest0001/export?format=csv&gid=7')) return new Response(
            `LSH DAILY TASK TRACKER\nDate Received,Type of Task,Task Details,Accountable VA,${us},VA Notes,Deadline,Status,Actual Completion Date\n` +
            `⬇ FOR COMPLETION ⬇\n${us},LSH-TRAINING,Reception lesson,Dee,"Finished the slides, took notes",Learned the spiel,ASAP,Ongoing,\n⬇ RECURRING ⬇\n,LSH-TRAINING,Typing Test,Dee,,,,Ongoing,\n`);
        if (u.includes('1MonitorDocIdForTheCiTest000001/export?format=txt')) return new Response(
            'Virtual Assistant Essentials - Day 1\nDate: 10/01/2026\n5 Major Takeaways From This Discussion\n1. A Legal VA supports the attorney with case tasks.\n2. Federal courts hear cases between parties in different states.\n3. Solo attorneys gain the most from a VA handling intake.\n4. Clear written updates build the client’s trust.\n5. Deadlines are tracked in the firm’s calendar every day.\n3 Questions That You Still Have\n1. How are court deadlines counted?\nRate Your Understanding\n[x] I am confident that I can do this on my own.\n');
        if (u.startsWith('https://drive.google.com/embeddedfolderview?id=abcFolderId01')) return new Response('<div class="flip-entries"><div class="flip-entry" id="entry-f1"><a href="https://docs.google.com/document/d/f1/edit"><div class="flip-entry-title">PI Overview_Answers (Dee)</div><div class="flip-entry-last-modified"><div>Oct 26</div></div></a></div><div class="flip-entry" id="entry-sub1"><a href="https://drive.google.com/drive/folders/sub1"><div class="flip-entry-title">Week 1</div></a></div></div>');
        if (u.startsWith('https://drive.google.com/embeddedfolderview?id=sub1')) return new Response('<div class="flip-entry" id="entry-f2"><a href="https://drive.google.com/file/d/f2/view"><div class="flip-entry-title">Typing Test 10.26.26AM</div><div class="flip-entry-last-modified"><div>10:41 AM</div></div></a></div>');
        if (u === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ access_token: 'ci-token' }));
        if (u.startsWith('https://www.googleapis.com/drive/v3/files?')) {
            const parent = decodeURIComponent(u).match(/'([^']+)' in parents/)[1];
            const files = parent === 'abcFolderId01' ? [{ id: 'sub1', name: 'Week 1', mimeType: 'application/vnd.google-apps.folder' }, { id: 'f1', name: 'PI Overview_Answers (Dee)', mimeType: 'application/vnd.google-apps.document', createdTime: '2026-10-26T15:00:00Z', webViewLink: 'https://docs.google.com/document/d/f1/edit' }]
                : parent === 'sub1' ? [{ id: 'f2', name: 'Typing Test 10.26.26AM', mimeType: 'image/png', createdTime: '2026-10-26T14:00:00Z' }] : [];
            return new Response(JSON.stringify({ files }));
        }
        return new Response('not found', { status: 404 });
    };
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const trainee = (await call('/api/auth/trainee', { name: 'Dee Drive', batch: 'B9' })).body.token;
    // the trainee saves their links and the day's output link (drive:<id> is theirs)
    const w = await call('/api/storage/set', { key: 'drive:' + id, value: JSON.stringify({ folder: 'https://drive.google.com/drive/folders/abcFolderId01', tracker: SHEET, monitor: DOC, days: { [D]: { links: [{ label: 'Typing Test AM', url: 'https://drive.google.com/file/d/xyz/view' }] } } }) }, trainee);
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
    // the answer sheets in the trainee's Assessment and Activities Folder: read through the folder's link, then through the service account
    // without the service account: the folder the trainee linked, read through its own link (and the folder in it)
    const noSA = await call('/api/drive/answers', {}, trainee);
    const pub = ((noSA.body || {}).files || []).map(f => f.name).sort().join(' | ');
    if (pub !== 'PI Overview_Answers (Dee) | Typing Test 10.26.26AM' || !/-10-26T/.test(((noSA.body.files || []).find(f => /PI/.test(f.name)) || {}).created || '')) fail(`the linked folder wasn't read through its link: ${JSON.stringify(noSA.body)}`);
    const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    const pk = Buffer.from(await crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64');
    env.GDRIVE_SA_EMAIL = 'ci@lsh.iam.gserviceaccount.com'; env.GDRIVE_SA_KEY = `-----BEGIN PRIVATE KEY-----\\n${pk}\\n-----END PRIVATE KEY-----`;
    const found = await call('/api/drive/answers', {}, trainee);
    const names = ((found.body || {}).files || []).map(f => f.name).sort().join(' | ');
    if (names !== 'PI Overview_Answers (Dee) | Typing Test 10.26.26AM') fail(`the folder's files (and its sub-folder's) weren't listed: ${JSON.stringify(found.body)}`);
    // 📄 Save PDF to my Folder: an answer sheet written into the trainee's folder as a PDF, by its name; saving again replaces it
    const doc = { name: 'PI_Workflow_and_Reception_Training_Process_Questions (Dee).pdf', pdf: Buffer.from('%PDF-1.3 the answers').toString('base64') };
    const s1 = await call('/api/drive/save', doc, trainee);
    const up1 = uploads[0] || {};
    if (!s1.body || !s1.body.ok || s1.body.updated || up1.method !== 'POST' || !/"parents":\["abcFolderId01"\]/.test(up1.body) || !/"mimeType":"application\/pdf"/.test(up1.body) || !up1.body.includes('%PDF-1.3 the answers')) fail(`an answer sheet wasn't created in the folder: ${JSON.stringify(s1.body)} ${up1.body}`);
    const s2 = await call('/api/drive/save', doc, trainee);
    if (!s2.body || !s2.body.ok || !s2.body.updated || (uploads[1] || {}).method !== 'PATCH' || !/files\/saved1\?/.test((uploads[1] || {}).url || '')) fail(`saving again should update the same file: ${JSON.stringify(s2.body)}`);
    // 📤 Submit to my Drive Folder: a day's worksheet, a Word file (a zip underneath), written into the folder as one
    const ws = { name: 'PI_Reception_Activity (Dee).docx', docx: Buffer.from('PK\u0003\u0004 the worksheet').toString('base64') };
    const s5 = await call('/api/drive/save', ws, trainee), up5 = uploads[uploads.length - 1] || {};
    if (!s5.body || !s5.body.ok || !/Content-Type: application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(up5.body || '') || !(up5.body || '').includes('the worksheet')) fail(`a worksheet wasn't saved in the folder as a Word file: ${JSON.stringify(s5.body)} ${up5.body}`);
    if ((await call('/api/drive/save', { name: ws.name, docx: Buffer.from('<html>').toString('base64') }, trainee)).status !== 400) fail('something that is not a Word file was saved as one');
    if ((await call('/api/drive/save', { name: 'PI_Reception_Activity (Dee).exe', docx: ws.docx }, trainee)).status !== 400) fail('a worksheet was saved under a name that is not a .docx');
    if ((await call('/api/drive/save', doc, admin)).status !== 403) fail('an admin saved into a trainee folder');
    if ((await call('/api/drive/save', { name: doc.name, pdf: Buffer.from('<html>').toString('base64') }, trainee)).status !== 400) fail('something that is not a PDF was saved');
    saveError = 'storageQuotaExceeded';
    const s3 = await call('/api/drive/save', doc, trainee);
    if (!s3.body || s3.body.error !== 'quota') fail(`a folder the account can't create files in should say so: ${JSON.stringify(s3.body)}`);
    saveError = null;
    delete env.GDRIVE_SA_EMAIL; delete env.GDRIVE_SA_KEY;
    const s4 = await call('/api/drive/save', doc, trainee);
    if (!s4.body || s4.body.error !== 'no-sa') fail(`without the service account, saving should say it isn't set up: ${JSON.stringify(s4.body)}`);
    // 🧪 the Typing and Spelling Test screenshots in the folder (/api/drive/shots, and the nightly check): "Typing Test 10.26.26AM" in
    // the sub-folder is the 10/26 AM typing test; the rest of the folder isn't a test; the tracker's checks stay as they were
    const sh1 = await call('/api/drive/shots', {}, trainee);
    const f1 = ((sh1.body || {}).shots || {}).files || [];
    if (!sh1.body || !sh1.body.ok || f1.length !== 1 || f1[0].kind !== 'typing' || f1[0].date !== '2026-10-26' || f1[0].slot !== 'AM' || !f1[0].named || !/file\/d\/f2/.test(f1[0].link)) fail(`the test screenshot in the folder wasn't found as the 10/26 AM typing test: ${JSON.stringify(sh1.body)}`);
    const kept = JSON.parse(store.get('ft:trackerreview:' + id));
    if (!kept.days[D] || kept.days[D].trainerScore !== 90 || !kept.monitor) fail('looking for the test screenshots lost the tracker\'s checks');
    if ((await call('/api/drive/shots', {}, trainee)).status !== 429) fail('a trainee looking for their screenshots twice in a minute should wait');
    const shA = await call('/api/drive/shots', { ids: [id, 'nobody--b9'] }, admin);
    const rs = (shA.body || {}).results || [];
    if (rs.length !== 2 || rs[0].shots !== 1 || rs[1].error !== 'no-folder') fail(`the trainer's check of a batch: ${JSON.stringify(shA.body)}`);
    const nightly = await call('/api/tracker/check', { id }, admin);
    if (!((nightly.body || {}).results || []).some(r => r.tests && r.shots === 1)) fail(`the nightly check didn't look for the test screenshots: ${JSON.stringify(nightly.body)}`);
    // a folder that can't be read keeps the screenshots already found, and says so
    folderGone = true;
    const shB = await call('/api/drive/shots', { id }, admin), kept2 = JSON.parse(store.get('ft:trackerreview:' + id)).shots;
    if (!shB.body || (shB.body.results[0] || {}).error !== 'no-access' || kept2.error !== 'no-access' || (kept2.files || []).length !== 1) fail(`an unreadable folder should keep what was found and say so: ${JSON.stringify(kept2)}`);
    folderGone = false;
    // a file that isn't shared: Google answers with its sign-in page
    shared = false;
    const r3 = await call('/api/drive/check', { id }, admin);
    const sheetRule = (r3.body.review.days[D].rules || [])[0];
    if (!sheetRule || sheetRule.id !== 'sheet' || !/can't open this file.*file's own link/.test(sheetRule.detail)) fail(`an unreadable sheet should say to check its link: ${JSON.stringify(sheetRule)}`);
    if (!/can't open this file.*file's own link/.test(r3.body.review.monitor.error || '')) fail('an unreadable Monitoring Sheet should say to check its link');

    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Drive trackers test passed (the tracker sheet and the Monitoring Sheet checked from Drive, the trainer\'s input kept, a trainee waits 3 minutes between checks, the answer sheets found in the folder, 📄 Save PDF to my Folder creating then replacing the sheet, the Typing and Spelling Test screenshots found in the folder by the trainee, the trainer and the nightly check, an unreadable file explained).');
})().catch(e => { console.error(e); process.exit(1); });
