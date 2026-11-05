// 🔗 Auto-linking a batch's Drive files and ⏪ backtracking a trainee from Day 1 (worker.js autoLinkBatch, backtrack; the
// 📋 Batch Sheet's 🔄 Update), with Google Drive answered here:
//   - one search for the Batch ID (and one for the Monitoring Sheets) finds each trainee's six files by their naming
//     convention: the Daily Task Tracker and the TAM by name, the Typing Tests, Spelling Tests and Assessments/Activities
//     folders inside "LSH Trainee folder – <batch> <name>", the Monitoring Sheet by name;
//   - the blank template, another batch's files and a file that names no one of the batch are left alone;
//   - a trainee's own link that the system already opened (✓) is never replaced;
//   - only a trainer can run it;
//   - ⏪ the Task Tracker is read once and every training day since the batch started is checked again, keeping a day's
//     trainer score and comment, and each day's compliance is worked out again.
// Usage: node .github/scripts/autolink.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const TR = globalThis.FTTrackerRules;
    const store = new Map(), B = 'B103026', ana = 'ana-cruz--b103026', ben = 'ben-diaz--b103026';
    const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
    const pk = Buffer.from(await crypto.subtle.exportKey('pkcs8', kp.privateKey)).toString('base64');
    const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
        GDRIVE_SA_EMAIL: 'ci@lsh.iam.gserviceaccount.com', GDRIVE_SA_KEY: `-----BEGIN PRIVATE KEY-----\\n${pk}\\n-----END PRIVATE KEY-----`,
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
            list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) },
        ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }) } };
    const put = (k, v) => store.set('ft:' + k, JSON.stringify(v));
    put('trainee:' + ana, { id: ana, name: 'Ana Cruz', batch: B, approved: true });
    put('trainee:' + ben, { id: ben, name: 'Ben Diaz', batch: B, approved: true });
    put('trainee:old-ana--b090126', { id: 'old-ana--b090126', name: 'Ana Cruz', batch: 'B090126', approved: true });
    // Ben's own Task Tracker link, already opened by the system: it stays
    const benOwn = 'https://docs.google.com/spreadsheets/d/1BenOwnTrackerSheetAbCdEfGhIj/edit#gid=0';
    put('drive:' + ben, { tracker: benOwn });
    put('trackerreview:' + ben, { days: {}, verify: { tracker: { ok: true, url: benOwn, at: '2026-11-01T00:00:00Z' } } });
    // a day's trainer score and comment, kept by the backtrack
    // (a day worked out before her files were linked: its Tracker and Monitoring Sheet parts 0 — the backtrack works them out afresh)
    put('trackerreview:' + ana, { days: { '2026-11-02': { pct: 40, trainerScore: 90, comment: 'Good recovery.', checkedAt: '2026-11-02T22:00:00Z' } },
        compliance: { '2026-11-02': { v: 2, pct: 0, parts: { tracker: 0, monitor: 0 } } } });

    const F = 'application/vnd.google-apps.folder', S = 'application/vnd.google-apps.spreadsheet', Dc = 'application/vnd.google-apps.document';
    const id25 = (s) => (s + 'x'.repeat(30)).slice(0, 28);
    const files = [
        { id: id25('batchFolder'), name: B, mimeType: F },
        { id: id25('anaFolder'), name: `LSH Trainee folder – ${B} Ana Cruz`, mimeType: F },
        { id: id25('anaTyping'), name: 'Typing Tests', mimeType: F, parents: [id25('anaFolder')] },
        { id: id25('anaSpelling'), name: 'Spelling Tests', mimeType: F, parents: [id25('anaFolder')] },
        { id: id25('anaAssess'), name: 'Assessments/Activities', mimeType: F, parents: [id25('anaFolder')] },
        { id: id25('anaMonitor'), name: 'LSH VA Training Monitoring Sheet__Ana Cruz', mimeType: Dc, parents: [id25('anaFolder')] },
        { id: id25('anaTracker'), name: `LSH Daily Task Tracker | ${B} Ana Cruz`, mimeType: S },
        { id: id25('anaTam'), name: `LSH Task Assessment Manual (TAM) | ${B} Ana Cruz`, mimeType: Dc },
        { id: id25('benTracker'), name: `LSH Daily Task Tracker | ${B} Ben Diaz`, mimeType: S },
        { id: id25('benMonitor'), name: 'LSH VA Training Monitoring Sheet__Ben Diaz', mimeType: Dc },
        { id: id25('template'), name: 'LSH Daily Task Tracker | BatchID VA Name', mimeType: S },
        { id: id25('stranger'), name: `LSH Task Assessment Manual (TAM) | ${B} Carla Gomez`, mimeType: Dc },
        { id: id25('otherBatch'), name: 'LSH Daily Task Tracker | B090126 Ana Cruz', mimeType: S },
    ];
    const [y, m, d] = TR.ptDate().split('-'), us = `${+m}/${+d}/${y}`;
    let trackerReads = 0, asked = [];
    globalThis.fetch = async (url, init = {}) => {
        const u = String(url);
        if (u === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ access_token: 'ci-token' }));
        if (u.startsWith('https://www.googleapis.com/drive/v3/files?')) {
            const q = new URL(u).searchParams.get('q'); asked.push(q);
            let m;
            const out = (m = q.match(/^name contains '([^']+)'/)) ? files.filter(f => f.name.split(/[\s|_–-]+/).some(w => w.startsWith(m[1])) || f.name.includes(m[1]))
                : (m = q.match(/^'([^']+)' in parents/)) ? files.filter(f => (f.parents || []).includes(m[1]) && (!/mimeType = /.test(q) || f.mimeType === F)) : [];
            return new Response(JSON.stringify({ files: out }));
        }
        if (u.includes(id25('anaTracker') + '/export?format=csv')) { trackerReads++; return new Response(
            `LSH DAILY TASK TRACKER\nDate Received,Type of Task,Task Details,Accountable VA,${us},VA Notes,Deadline,Status,Actual Completion Date\n` +
            `⬇ FOR COMPLETION ⬇\n${us},LSH-TRAINING,Reception lesson,Ana,"Finished the slides",Learned the spiel,ASAP,Ongoing,\n`); }
        if (u.includes(id25('anaMonitor') + '/export?format=txt')) return new Response('Virtual Assistant Essentials - Day 1\nDate: 10/30/2026\n5 Major Takeaways From This Discussion\n1. A Legal VA supports the attorney.\n');
        // 📘 her TAM: an entry a day, under its date (10/30 a full one, 11/02 a short one, none on 11/03)
        if (u.includes(id25('anaTam') + '/export?format=txt')) return new Response('LSH Task Assessment Manual\n10/30/2026\nI answered the reception calls with the spiel, logged each call in the tracker and asked the attorney for the missing details.\n11/02/2026: reviewed the intake form\n');
        return new Response('not found', { status: 404 });
    };
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const trainee = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: B })).body.token;
    if ((await call('/api/drive/autolink', { batch: B }, trainee)).status !== 403) fail('a trainee ran the batch auto-link');
    if ((await call('/api/drive/backtrack', { id: ana }, trainee)).status !== 403) fail('a trainee ran the backtrack');

    // 🔗 the batch
    const r = (await call('/api/drive/autolink', { batch: B }, admin)).body || {};
    const get = (k) => JSON.parse(store.get('ft:' + k) || 'null') || {};
    const A = get('drive:' + ana), Bn = get('drive:' + ben);
    const want = { tracker: 'https://docs.google.com/spreadsheets/d/' + id25('anaTracker') + '/edit', tam: 'https://docs.google.com/document/d/' + id25('anaTam') + '/edit',
        monitor: 'https://docs.google.com/document/d/' + id25('anaMonitor') + '/edit', typing: 'https://drive.google.com/drive/folders/' + id25('anaTyping'),
        spelling: 'https://drive.google.com/drive/folders/' + id25('anaSpelling'), folder: 'https://drive.google.com/drive/folders/' + id25('anaAssess') };
    if (!r.ok || r.trainees !== 2) fail(`the auto-link didn't run for the batch's 2 trainees: ${JSON.stringify(r)}`);
    for (const [k, v] of Object.entries(want)) if (A[k] !== v) fail(`Ana's ${k} wasn't linked to her own file: ${A[k]} (want ${v})`);
    if (!A.auto || !A.auto.tracker || A.startDate !== '2026-10-30') fail(`Ana's links weren't marked as auto-linked, or her start date isn't the batch's: ${JSON.stringify(A)}`);
    if (Bn.tracker !== benOwn) fail(`Ben's own ✓ tracker link was replaced: ${Bn.tracker}`);
    if (Bn.monitor !== 'https://docs.google.com/document/d/' + id25('benMonitor') + '/edit') fail(`Ben's Monitoring Sheet wasn't found by its name: ${Bn.monitor}`);
    if (Object.values(store).length && [...store.keys()].some(k => k.startsWith('ft:drive:') && store.get(k).includes(id25('template')))) fail('the blank template was linked to someone');
    if ([...store.keys()].some(k => k.startsWith('ft:drive:') && store.get(k).includes(id25('stranger')))) fail('a file naming no one of the batch was linked');
    if ([...store.keys()].some(k => k.startsWith('ft:drive:') && store.get(k).includes(id25('otherBatch')))) fail("another batch's file was linked");
    if (get('drive:old-ana--b090126').tracker) fail("a trainee of another batch got this batch's links");
    if (!(r.missing || {})[ben] || !r.missing[ben].includes('tam')) fail(`Ben's missing links aren't reported: ${JSON.stringify(r.missing)}`);
    // 🔎 what wasn't found in Drive is kept for the Batch Sheet to say exactly (Ben has no TAM in his Drive)
    { const nf = ((get('trackerreview:' + ben) || {}).notFound || {}).keys || [];
      if (!nf.includes('tam') || nf.includes('monitor')) fail(`Ben's "not in his Drive" isn't kept as found: ${JSON.stringify(nf)}`); }

    if (process.env.SHOW) console.log('AUTOLINK', JSON.stringify(r));
    // ⏪ Ana from Day 1
    const bt = (await call('/api/drive/backtrack', { id: ana }, admin)).body || {};
    const cur = get('trackerreview:' + ana), days = Object.keys(cur.days || {}).filter(x => x >= '2026-10-30').sort();
    const past = days.filter(x => x < TR.ptDate());
    if (!bt.ok || bt.tracker !== 'ok' || bt.days < 4) fail(`the backtrack didn't check every training day since the batch started: ${JSON.stringify(bt)}`);
    if (trackerReads > 2) fail(`the Task Tracker was read ${trackerReads} times (once for the days, once for today's check, at most)`);
    if (!past.length || !past.every(x => cur.days[x].backtracked || x === TR.ptDate())) fail(`the past days weren't checked again: ${JSON.stringify(days)}`);
    if (!cur.days['2026-10-30']) fail("Day 1 (the batch's start, 10/30) wasn't checked");
    if (cur.days['2026-11-02'].trainerScore !== 90 || cur.days['2026-11-02'].comment !== 'Good recovery.') fail(`the backtrack lost a day's trainer score or comment: ${JSON.stringify(cur.days['2026-11-02'])}`);
    if (!cur.compliance || !cur.compliance['2026-10-30']) fail(`each day's compliance wasn't worked out again: ${JSON.stringify(Object.keys(cur.compliance || {}))}`);
    // ✅ the day's compliance reads the entries: the Task Tracker's day afresh (not the 0 from before), the Monitoring Sheet's
    // discussions due by that day (Day 1's entry 25%: a date, no 5 takeaways…; Day 2's not written: 0), the TAM's entry that day
    { const c2 = (cur.compliance['2026-11-02'] || {}).parts || {}, c1 = (cur.compliance['2026-10-30'] || {}).parts || {}, c3 = (cur.compliance['2026-11-03'] || {}).parts || {};
      if (c2.tracker !== cur.days['2026-11-02'].pct || !(c2.tracker > 0)) fail(`11/02's Tracker part wasn't worked out afresh from the sheet (still the 0 from before): ${JSON.stringify(c2)} / day ${cur.days['2026-11-02'].pct}`);
      if (c1.monitor !== 25 || c2.monitor !== 13) fail(`the Monitoring Sheet part isn't the discussions due by each day (10/30 25, 11/02 13): ${c1.monitor} / ${c2.monitor}`);
      if (c1.tam !== 100 || c2.tam !== 50 || (cur.compliance['2026-11-03'] && c3.tam !== 0)) fail(`the TAM part isn't the day's entry (10/30 100, 11/02 50, 11/03 0): ${c1.tam} / ${c2.tam} / ${c3.tam}`);
      if (!cur.tam || !cur.tam.entries || !cur.tam.entries['2026-10-30']) fail(`the TAM's entries weren't read: ${JSON.stringify(cur.tam)}`); }

    if (process.env.SHOW) console.log('BACKTRACK', JSON.stringify(bt), 'days', JSON.stringify(days), 'reads', trackerReads);
    if (failures.length) { console.log(`${failures.length} failure(s):\n` + failures.map((f, i) => `${i + 1}. ${f}`).join('\n')); process.exit(1); }
    console.log("Auto-link and backtrack test passed (a batch's six Drive files found by their naming convention and linked to their trainees, the template, a stranger's and another batch's files left alone, a trainee's own ✓ link kept, trainers only; the Task Tracker read once and every training day since Day 1 checked again, a day's trainer score kept, each day's compliance worked out again).");
})().catch((e) => { console.error(e); process.exit(1); });
