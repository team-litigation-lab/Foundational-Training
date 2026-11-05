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
    const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', EOD_KEY: 'ci-eod-key',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
    store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Dee Drive', batch: 'B9', approved: true }));
    const SHEET = 'https://docs.google.com/spreadsheets/d/1TrackerSheetIdForTheCiTest0001/edit#gid=7', DOC = 'https://docs.google.com/document/d/1MonitorDocIdForTheCiTest000001/edit';
    let shared = true, folderGone = false;
    const uploads = [];   // 💾 Save to Drive: what the Worker sent to Google's upload endpoint
    let saveError = null;
    const META = {}, metaCalls = [];   // 🔗 the links' names, as Drive gives them (null: the account can't open it)
    let subShared = false;
    const tokenFail = { sub: false, sa: false, sub503: 0 };   // Google refusing a sign-in: the delegation (sub), the key (sa)   // whether GDRIVE_SA_SUBJECT is on the trainee's folder yet
    globalThis.fetch = async (url, init = {}) => {
        const u = String(url);
        // (GDRIVE_SA_SUBJECT's token: the trainee shared their folder with the service account only, so that user can't see it
        // until the service account adds them, POST …/permissions)
        const bearer = String((init.headers || {}).Authorization || '');
        if (/\/files\/abcFolderId01\/permissions/.test(u)) { if (bearer !== 'Bearer ci-token') return new Response('{}', { status: 403 });
            const pm = JSON.parse(init.body); subShared = pm.role === 'writer' && pm.emailAddress === env.GDRIVE_SA_SUBJECT; return new Response(JSON.stringify({ id: 'perm1' })); }
        { const m = u.match(/googleapis\.com\/drive\/v3\/files\/([A-Za-z0-9_-]+)\?fields=id,name,mimeType/);
          if (m) { metaCalls.push(m[1]); if (bearer !== 'Bearer sub-token' || META[m[1]] === null) return new Response('{"error":{"code":404}}', { status: 404 });
            const folder = m[1] === 'abcFolderId01' || /Folder/.test(m[1]), mt = folder ? 'application/vnd.google-apps.folder' : m[1].startsWith('1Tracker') ? 'application/vnd.google-apps.spreadsheet' : 'application/vnd.google-apps.document';
            const name = META[m[1]] || (m[1] === 'abcFolderId01' ? 'LSH Trainee folder – B9 Dee Drive Assessments/Activities' : m[1].startsWith('1Tracker') ? 'LSH Daily Task Tracker | B9 Dee Drive' : 'LSH VA Training Monitoring Sheet__Dee Drive');
            return new Response(JSON.stringify({ id: m[1], name, mimeType: mt })); } }
        if (bearer === 'Bearer sub-token' && !subShared && /googleapis\.com\/(upload\/)?drive\/v3\/files/.test(u)) return new Response('{"error":{"code":404}}', { status: 404 });
        if (u.startsWith('https://www.googleapis.com/upload/drive/v3/files')) {
            if (saveError) return new Response(JSON.stringify({ error: { errors: [{ reason: saveError }] } }), { status: 403 });
            const body = init.body && init.body.text ? await init.body.text() : String(init.body || ''); uploads.push({ url: u, method: init.method, body, bearer: String((init.headers || {}).Authorization || '') });
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
        if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) return new Response(JSON.stringify({ azp: '104812345678901234567', scope: 'https://www.googleapis.com/auth/drive.readonly' }));
        if (u === 'https://oauth2.googleapis.com/token') { const jwt = decodeURIComponent(String(init.body || '').split('assertion=')[1] || '');
            const claims = JSON.parse(Buffer.from((jwt.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString() || '{}');
            if (claims.sub && tokenFail.sub503 > 0) { tokenFail.sub503--; return new Response('<html>Service Unavailable</html>', { status: 503 }); }
            if (claims.sub && tokenFail.sub) return new Response(JSON.stringify({ error: 'unauthorized_client', error_description: 'Client is unauthorized to retrieve access tokens using this method, or client not authorized for any of the scopes requested.' }), { status: 401 });
            if (!claims.sub && tokenFail.sa) return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }), { status: 400 });
            return new Response(JSON.stringify({ access_token: claims.sub ? 'sub-token' : 'ci-token' })); }
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
    const doc = { name: 'PI_Workflow_and_Reception_Training_Process_Question_Answers (Dee).pdf', pdf: Buffer.from('%PDF-1.3 the answers').toString('base64') };
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
    // a folder not shared with the service account: the answer names the address to share it with
    saveError = 'insufficientFilePermissions';
    const s7 = await call('/api/drive/save', doc, trainee);
    if (!s7.body || s7.body.error !== 'no-access' || s7.body.share !== env.GDRIVE_SA_EMAIL) fail(`a folder the account can't write should name the address to share it with: ${JSON.stringify(s7.body)}`);
    saveError = null;
    // saving as GDRIVE_SA_SUBJECT, a user the trainee never shared the folder with: the service account (an Editor of the
    // folder) adds that user to it, then the save goes through
    env.GDRIVE_SA_SUBJECT = 'saver@lsh.example';
    const n0 = uploads.length, s6 = await call('/api/drive/save', doc, trainee);
    if (!s6.body || !s6.body.ok || !subShared || uploads.length !== n0 + 1) fail(`a save as GDRIVE_SA_SUBJECT on a folder shared only with the service account should add that user and save: ${JSON.stringify(s6.body)} (added: ${subShared})`);
    // 🔗 the trainee's links, checked now: read AS GDRIVE_SA_SUBJECT (the trainer, an Editor on every trainee's Drive),
    // so files never shared with the service account itself still open; without the subject, the account alone can't
    const v1 = await call('/api/drive/verify', {}, trainee), vv = (v1.body || {}).verify || {};
    if (!v1.body || !v1.body.ok || !vv.folder || !vv.folder.ok || !vv.tracker || !vv.tracker.ok || !vv.monitor || !vv.monitor.ok || v1.body.share !== 'saver@lsh.example') fail(`the links should open as GDRIVE_SA_SUBJECT: ${JSON.stringify(v1.body)}`);
    if (!(JSON.parse(store.get('ft:trackerreview:' + id)).verify || {}).folder) fail('the link check wasn\'t kept in trackerreview (the Batch Sheet reads it)');
    // 🔌 the connection's status, with Google's reason: the delegation refused for GDRIVE_SA_SUBJECT, the account itself fine
    tokenFail.sub = true;
    const st1 = (await call('/api/drive/status', {}, admin)).body || {};
    if (st1.saOk !== true || st1.subjectOk !== false || !/unauthorized_client/.test(st1.subjectDetail || '') || st1.clientId !== '104812345678901234567') fail(`/api/drive/status should say the delegation is refused: ${JSON.stringify(st1)}`);
    if ((await call('/api/drive/status', {}, trainee)).status !== 403) fail('a trainee read the Drive connection status');
    // …and meanwhile the platform works as the service account: a save goes through as it (no "drive-auth"), and a link it
    // can't open names the service account's address to share with, not GDRIVE_SA_SUBJECT's
    const n1 = uploads.length, sv = (await call('/api/drive/save', doc, trainee)).body || {};
    if (!sv.ok || uploads.length !== n1 + 1 || uploads[uploads.length - 1].bearer !== 'Bearer ci-token') fail(`a save should fall back to the service account while GDRIVE_SA_SUBJECT is refused: ${JSON.stringify(sv)}`);
    { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); delete rv.verifyAt; delete rv.verify; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }   // (checked afresh: a ✓ already given stays for its link)
    const vf = (await call('/api/drive/verify', {}, trainee)).body || {};
    if (!vf.ok || vf.share !== 'ci@lsh.iam.gserviceaccount.com' || !/Share it with ci@lsh\.iam\.gserviceaccount\.com/.test(((vf.verify || {}).folder || {}).error || '')) fail(`while GDRIVE_SA_SUBJECT is refused, a link check should name the service account to share with: ${JSON.stringify(vf)}`);
    // both refused: the link check can't run, and says why on the trainee's record (no silent ⏳ Pending)
    tokenFail.sa = true;
    { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); delete rv.verifyAt; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }
    await call('/api/drive/status', {}, admin);   // (signs in afresh: no token kept from before)
    const v0 = (await call('/api/drive/verify', {}, trainee)).body || {};
    const ve = JSON.parse(store.get('ft:trackerreview:' + id)).verifyError || {};
    if (v0.error !== 'drive-auth' || !/unauthorized_client/.test(v0.detail || '') || !/invalid_grant/.test(v0.detail || '') || !/invalid_grant/.test(ve.detail || '')) fail(`a link check that can't sign in should keep Google's reasons: ${JSON.stringify(v0)} / ${JSON.stringify(ve)}`);
    tokenFail.sub = false; tokenFail.sa = false;
    await call('/api/drive/status', {}, admin);
    // a passing fault (one 503 from Google's token endpoint) is not a refusal: that one call falls back, the next one works
    // as GDRIVE_SA_SUBJECT again (it was switched off for 10 minutes)
    subShared = true; tokenFail.sub503 = 2;
    const st5 = (await call('/api/drive/status', {}, admin)).body || {};   // (signs in afresh: the first 503 is its own)
    if (st5.subjectOk !== false || !/503/.test(st5.subjectDetail || '')) fail(`the status should show the 503 as it happened: ${JSON.stringify(st5)}`);
    const p1 = (await call('/api/drive/save', doc, trainee)).body || {}, b1 = (uploads[uploads.length - 1] || {}).bearer;
    const p2 = (await call('/api/drive/save', doc, trainee)).body || {}, b2 = (uploads[uploads.length - 1] || {}).bearer;
    if (!p1.ok || b1 !== 'Bearer ci-token' || !p2.ok || b2 !== 'Bearer sub-token' || p2.sub === false) fail(`one 503 shouldn't switch GDRIVE_SA_SUBJECT off: ${JSON.stringify({ p1, b1, p2, b2 })}`);
    delete env.GDRIVE_SA_SUBJECT;
    { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); delete rv.verifyAt; delete rv.verify; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }   // (past the 20-second wait; a link not checked yet: a ✓ is locked for its link)
    const v2 = await call('/api/drive/verify', {}, trainee), vv2 = (v2.body || {}).verify || {};
    if (!v2.body || !v2.body.ok || (vv2.folder || {}).ok !== false || !/Share it with ci@lsh\.iam\.gserviceaccount\.com as Editor/.test((vv2.folder || {}).error || '')) fail(`without GDRIVE_SA_SUBJECT, a file the account can't open should say whom to share it with: ${JSON.stringify(v2.body)}`);
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
    // ✅ the day's compliance (dailyCompliance): the AM typing and the spelling taken on the platform, the day's EOD pasted, the
    // output link submitted; no PM typing
    store.set('ft:skills:' + id, JSON.stringify({ typing: [{ date: D, slot: 'AM', wpm: 40 }], spelling: [{ date: D, score: 18 }] }));
    const dr = JSON.parse(store.get('ft:drive:' + id)); dr.days[D] = Object.assign({}, dr.days[D], { eod: { text: `Subject: Daily Report ${D.slice(5, 7)}/${D.slice(8)}/${D.slice(2, 4)}\n\nAccomplishments/Completed Tasks:\n- the Reception lesson\n\nThese are the things I've learned that I can put into practice later on:\n- I learned verification. You confirm the name and DOB first.\n- I learned the warm transfer. You brief the case manager first.\n- I learned the CMS notes. Every call gets a note on the file.\n\nOn queue for tomorrow:\n- Calendar Management\n`, at: new Date(D + 'T19:00:00Z').toISOString() } });
    store.set('ft:drive:' + id, JSON.stringify(dr));
    const nightly = await call('/api/tracker/check', { id }, admin);
    if (!((nightly.body || {}).results || []).some(r => r.tests && r.shots === 1)) fail(`the nightly check didn't look for the test screenshots: ${JSON.stringify(nightly.body)}`);
    const comp = ((JSON.parse(store.get('ft:trackerreview:' + id)).compliance) || {})[D];
    if (!comp || comp.parts.tests !== 67 || !comp.tests.AM || comp.tests.PM || !comp.tests.SP || comp.parts.eod !== 100 || comp.parts.outputs !== 100
      || typeof comp.parts.tracker !== 'number' || typeof comp.parts.monitor !== 'number' || typeof comp.pct !== 'number') fail(`the day's compliance: ${JSON.stringify(comp)}`);
    if (!((nightly.body || {}).results || []).some(r => r.id === id && typeof r.compliance === 'number')) fail('the nightly check didn\'t record the day\'s compliance');
    // 🔗 the six monitored links (worker.js verifyLinks): ✓ when it opens and is the right kind with the right name, locked for
    // that link; ✗ when it can't be opened or is another file, with why; a new link checked again
    const six = { monitor: DOC, tracker: SHEET, folder: 'https://drive.google.com/drive/folders/abcFolderId01', tam: 'https://docs.google.com/document/d/1TamDocIdForTheCiTest0000001/edit',
      typing: 'https://drive.google.com/drive/folders/1TypingFolderIdForCi01', spelling: 'https://drive.google.com/drive/folders/1SpellingFolderIdCi001' };
    Object.assign(META, { '1TamDocIdForTheCiTest0000001': 'Week 1 notes', '1TypingFolderIdForCi01': 'Typing Tests', '1SpellingFolderIdCi001': null });
    store.set('ft:drive:' + id, JSON.stringify(Object.assign(JSON.parse(store.get('ft:drive:' + id)), six)));
    { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); delete rv.verify; delete rv.verifyAt; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }
    env.GDRIVE_SA_EMAIL = 'ci@lsh.iam.gserviceaccount.com'; env.GDRIVE_SA_KEY = `-----BEGIN PRIVATE KEY-----\\n${pk}\\n-----END PRIVATE KEY-----`; env.GDRIVE_SA_SUBJECT = 'saver@lsh.example';
    const lk1 = await call('/api/drive/verify', { id }, admin), L1 = (lk1.body || {}).verify || {};
    if (!L1.monitor || !L1.monitor.ok || !L1.tracker.ok || !L1.folder.ok || !L1.typing || !L1.typing.ok) fail(`the links that open and are the right ones aren't ✓: ${JSON.stringify(L1)}`);
    if (!L1.tam || L1.tam.ok || !/isn't your LSH Task Assessment Manual/.test(L1.tam.error)) fail(`a link to another file isn't ✗ with why: ${JSON.stringify(L1.tam)}`);
    if (!L1.spelling || L1.spelling.ok || !/Share it with saver@lsh\.example/.test(L1.spelling.error)) fail(`a link the system can't open isn't ✗ with the address to share it with: ${JSON.stringify(L1.spelling)}`);
    metaCalls.length = 0; META['1MonitorDocIdForTheCiTest000001'] = 'Something else';
    await call('/api/drive/verify', { id }, admin);
    if (metaCalls.includes('1MonitorDocIdForTheCiTest000001')) fail('a ✓ link was checked again: it should stay locked for that link');
    // (the trainee replaces the TAM link: checked again, and ✓)
    const tamNew = 'https://docs.google.com/document/d/1TamDocNewForTheCiTest000002/edit'; META['1TamDocNewForTheCiTest000002'] = 'LSH Task Assessment Manual (TAM) | B9 Dee Drive';
    store.set('ft:drive:' + id, JSON.stringify(Object.assign(JSON.parse(store.get('ft:drive:' + id)), { tam: tamNew })));
    { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); delete rv.verifyAt; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }   // (past the 20-second wait)
    metaCalls.length = 0;
    const lk2 = await call('/api/drive/verify', {}, trainee), L2 = (lk2.body || {}).verify || {};
    if (!L2.tam || !L2.tam.ok || L2.tam.url !== tamNew) fail(`a new link wasn't checked again: ${JSON.stringify(L2.tam)}`);
    if (metaCalls.includes('1TrackerSheetIdForTheCiTest0001') || !metaCalls.includes('1TamDocNewForTheCiTest000002')) fail(`a check opened a ✓ link again, or not the new one: ${JSON.stringify(metaCalls)}`);
    delete env.GDRIVE_SA_EMAIL; delete env.GDRIVE_SA_KEY; delete env.GDRIVE_SA_SUBJECT;

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

    // 🔄 the past training days: from when she registered to yesterday, each weekday without a compliance record gets one
    // (backfillCompliance, /api/compliance/backfill, and the end of every shift), marked backfilled; a tracker not checked
    // that day is "not checked", not 0
    // (the past weekdays as the backfill counts them: from the registration's date, Pacific time, up to today, by calendar date)
    { const back = new Date(Date.now() - 9 * 864e5), wk = [], today = TR.ptDate();
      for (let t = Date.parse(TR.ptDate(back) + 'T12:00:00Z'); ; t += 864e5) { const d = new Date(t).toISOString().slice(0, 10); if (d >= today) break; if (TR.isWeekday(d)) wk.push(d); }
      const tr0 = JSON.parse(store.get('ft:trainee:' + id)); tr0.registeredAt = back.toISOString(); store.set('ft:trainee:' + id, JSON.stringify(tr0));
      // (a day worked out before the platform's own work counted, v1: worked out again; practice logged on the platform the
      // second day: 🖥 Platform 100%)
      const rv0 = JSON.parse(store.get('ft:trackerreview:' + id)); rv0.compliance = { [wk[0]]: { pct: 0, parts: { tracker: 0 } } }; store.set('ft:trackerreview:' + id, JSON.stringify(rv0));
      store.set('ft:progress:' + id, JSON.stringify({ traineeId: id, data: { 'work-log': [{ at: wk[1] + 'T16:00:00Z', kind: 'lab', label: 'Intake Practice', score: 80 }] } }));
      store.set('ft:skills:' + id, JSON.stringify({ typing: [{ id: 'bt', at: new Date(wk[0] + 'T15:00:00Z').toISOString(), date: wk[0], slot: 'AM', net: 40, acc: 95 }], spelling: [] }));
      const bf = await call('/api/compliance/backfill', { ids: [id] }, admin);
      if (!bf.body || !bf.body.ok || bf.body.filled[id] !== wk.length) fail(`the backfill didn't work out the ${wk.length} past weekdays: ${JSON.stringify(bf.body)}`);
      const c = JSON.parse(store.get('ft:trackerreview:' + id)).compliance || {}, c0 = c[wk[0]] || {};
      if (!c0.backfilled || !c0.tests || !c0.tests.AM || c0.parts.tracker !== null) fail(`a backfilled day isn't marked, misses its test, or counts an unchecked tracker as 0: ${JSON.stringify(c0)}`);
      if (!(c0.v >= 2)) fail(`a day worked out before the new rules wasn't worked out again: ${JSON.stringify(c0)}`);
      const c1 = c[wk[1]] || {}, c2 = c[wk[2]] || {};
      if (c1.parts.platform !== 100 || !(c1.platform || []).some(x => /Intake Practice/.test(x))) fail(`a day with practice on the platform isn't 🖥 Platform 100%: ${JSON.stringify(c1)}`);
      if (wk[2] && c2.parts.platform !== 0) fail(`a day with nothing on the platform isn't 0: ${JSON.stringify(c2)}`);
      if ((await call('/api/compliance/backfill', { ids: [id] }, trainee)).status !== 403) fail('a trainee could run the backfill');
      const again = await call('/api/compliance/backfill', { ids: [id] }, admin);
      if (again.body.filled[id] !== 0) fail('the backfill worked out a day again');
      // 🔄 Update all scores (redo, redoCompliance): every training day again from what the platform keeps now — a lesson
      // finished and a Knowledge Check taken on a past day count as that day's progress; a tracker checked on the day keeps its %
      const w1 = wk[1], at1 = new Date(w1 + 'T17:00:00Z').toISOString();
      store.set('ft:progress:' + id, JSON.stringify({ data: { 'day-progress': { 3: { studied: true, studiedAt: at1, history: [{ score: 90, passed: true, date: at1 }] } } } }));
      { const rv = JSON.parse(store.get('ft:trackerreview:' + id)); rv.compliance[w1].parts.tracker = 80; store.set('ft:trackerreview:' + id, JSON.stringify(rv)); }
      const before = (JSON.parse(store.get('ft:trackerreview:' + id)).compliance[w1] || {}).pct;
      if ((await call('/api/compliance/backfill', { ids: [id], redo: true }, trainee)).status !== 403) fail('a trainee could update all scores');
      const rd = await call('/api/compliance/backfill', { ids: [id], redo: true }, admin);
      if (!rd.body || !rd.body.ok || rd.body.redone[id] !== wk.length + (TR.isWeekday(today) ? 1 : 0)) fail(`Update all scores didn't work out every training day: ${JSON.stringify(rd.body)}`);
      const cRedo = JSON.parse(store.get('ft:trackerreview:' + id)).compliance[w1] || {};
      if (cRedo.parts.platform !== 100 || !(cRedo.platform || []).some(x => /Lesson 3 deck finished/.test(x)) || !(cRedo.platform || []).some(x => /Knowledge Check/.test(x))) fail(`a day's progress on the platform isn't counted: ${JSON.stringify(cRedo)}`);
      if (cRedo.parts.tracker !== 80 || !cRedo.backfilled || !(cRedo.pct > before)) fail(`Update all scores lost the day's tracker check or the backfilled mark, or the score didn't go up: ${JSON.stringify(cRedo)} (was ${before})`);
      const cOther = JSON.parse(store.get('ft:trackerreview:' + id)).compliance[wk[2]] || {};
      if (wk[2] && cOther.parts.platform !== 0) fail(`a day with no progress on the platform counts it: ${JSON.stringify(cOther.parts)}`); }

    // 📧 EOD monitoring: an EOD emailed to the platform's address (worker.js email → receiveEod) is matched to the trainee by the
    // address they send from, kept as the day's EOD and checked against its template; one no trainee matches is kept for the trainer
    { const dv = JSON.parse(store.get('ft:drive:' + id)); dv.eodFrom = 'dee.drive@gmail.com'; store.set('ft:drive:' + id, JSON.stringify(dv));
      const D2 = TR.ptDate(), [yy, mm, dd] = D2.split('-'), body = `Accomplishments/Completed Tasks:\n- Finished the Reception deck\n\nThese are the things I've learned that I can put into practice later on:\n- I learned caller verification. You confirm the name, DOB and DOL first.\n- I learned the warm transfer. You brief the case manager before connecting.\n- I learned the Ring Channel. It plays the call while I take notes.\n\nOn queue for tomorrow:\n- Calendar Management\n`;
      const raw = `From: Dee Drive <Dee.Drive@gmail.com>\r\nSubject: Daily Report ${mm}/${dd}/${yy.slice(2)}\r\nContent-Type: multipart/alternative; boundary="b1"\r\n\r\n--b1\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n${body.replace(/\n/g, '\r\n').replace(/=/g, '=3D')}\r\n--b1--\r\n`;
      const hdr = new Map([['from', 'Dee Drive <Dee.Drive@gmail.com>'], ['subject', `Daily Report ${mm}/${dd}/${yy.slice(2)}`], ['date', new Date(D2 + 'T19:00:00Z').toUTCString()]]);
      await worker.email({ from: 'dee.drive@gmail.com', raw: new Response(raw).body, headers: { get: k => hdr.get(k) || null } }, env, { waitUntil() {} });
      const e1 = ((JSON.parse(store.get('ft:drive:' + id)).days || {})[D2] || {}).eod || {};
      if (e1.via !== 'email' || !/warm transfer/.test(e1.text || '')) fail(`the emailed EOD wasn't kept as the day's EOD: ${JSON.stringify(e1).slice(0, 200)}`);
      const cc = (JSON.parse(store.get('ft:trackerreview:' + id)).compliance || {})[D2] || {};
      if (!cc.eodCheck || cc.parts.eod !== 100 || cc.eodCheck.via !== 'email') fail(`the emailed EOD wasn't checked (100%): ${JSON.stringify(cc.eodCheck || cc.parts)}`);
      // an EOD missing its learnings: its % and what is missing
      const r2 = await call('/api/eod/receive', { from: 'Dee Drive <dee.drive@gmail.com>', subject: 'EOD', date: new Date(D2 + 'T19:30:00Z').toISOString(), text: 'Accomplishments/Completed Tasks:\n- the deck\n' }, admin);
      if (!r2.body || !r2.body.matched || r2.body.check.pct >= 100 || !r2.body.check.rules.some(r => r.id === 'learn' && !r.pass)) fail(`a partial EOD isn't marked down with what's missing: ${JSON.stringify(r2.body).slice(0, 300)}`);
      const r3 = await call('/api/eod/receive', { from: 'Someone Else <x@y.com>', subject: 'Daily Report', text: 'hello' }, admin);
      if (!r3.body || r3.body.matched !== false || !((await call('/api/eod/unmatched', {}, admin)).body.items || []).some(x => /Someone Else/.test(x.from))) fail('an EOD no trainee matches isn\'t kept for the trainer');
      // 📧 an EOD from the trainers' Gmail (docs/eod-gmail-script.gs → /api/eod/inbound): with the Worker's EOD_KEY it is matched
      // and kept like an emailed one; without the key, or with another, it is refused; the address trainees CC is team-litigation@
      const inb = (body, key) => worker.fetch(new Request('http://x/api/eod/inbound', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, key ? { 'X-EOD-Key': key } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));
      const D3 = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(Date.now() - 86400000));
      const gm = { from: 'Dee Drive <dee.drive@gmail.com>', subject: `Daily Report ${D3.slice(5, 7)}/${D3.slice(8)}/${D3.slice(2, 4)}`, date: new Date(D3 + 'T20:00:00Z').toISOString(), text: 'Accomplishments/Completed Tasks:\n- the Gmail EOD\n' };
      if ((await inb(gm)).status !== 403 || (await inb(gm, 'wrong-key')).status !== 403) fail('an EOD without the Worker\'s key was taken');
      const g1 = await inb(gm, 'ci-eod-key');
      const ge = ((JSON.parse(store.get('ft:drive:' + id)).days || {})[D3] || {}).eod || {};
      if (g1.status !== 200 || !g1.body.matched || g1.body.id !== id || !/the Gmail EOD/.test(ge.text || '')) fail(`the Gmail EOD wasn't kept as the trainee's: ${JSON.stringify(g1.body).slice(0, 200)}`);
      if ((await inb({ from: '', text: '' }, 'ci-eod-key')).status !== 400) fail('an empty EOD wasn\'t refused');
      if ((await call('/api/eod/inbox', {}, trainee)).body.address !== 'team-litigation@legalsupporthelp.com') fail('the EOD address trainees CC isn\'t team-litigation@');
      if ((await call('/api/eod/receive', { from: 'x', text: 'y' }, trainee)).status !== 403) fail('a trainee could post an EOD as the platform'); }

    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Drive trackers test passed (the day\'s compliance: tracker, Monitoring Sheet, tests, outputs and EOD; the tracker sheet and the Monitoring Sheet checked from Drive, the trainer\'s input kept, a trainee waits 3 minutes between checks, the answer sheets found in the folder, 📄 Save PDF to my Folder creating then replacing the sheet, the Typing and Spelling Test screenshots found in the folder by the trainee, the trainer and the nightly check, an unreadable file explained).');
})().catch(e => { console.error(e); process.exit(1); });
