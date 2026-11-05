// 🌙 The nightly check (worker.js scheduled → runTrackerChecks), over every approved trainee:
//   - each trainee's Assessments/Activities folder is listed once a run (the screenshots, the day's compliance and the backfill of
//     the past training days all read that one listing), so a night of many trainees stays inside Drive's and the Worker's limits;
//   - a trainee whose records can't be read is passed over, and the trainees after them are still checked.
// Usage: node .github/scripts/cron-checks.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
// (the run is set on a Thursday at the end of the shift, so the check runs whatever day this test is run on)
const RealDate = Date, NOW = RealDate.parse('2026-11-05T23:30:00Z');
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
(async () => {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const store = new Map();
    const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
    const ids = ['ann-cron--b102626', 'bob-cron--b102626', 'cat-cron--b102626'];
    ids.forEach((id, i) => {
        store.set('ft:trainee:' + id, JSON.stringify({ id, name: id.split('-')[0], batch: 'B102626', approved: true }));
        store.set('ft:drive:' + id, JSON.stringify({ folder: `https://drive.google.com/drive/folders/cronFolder0${i}AAAA` }));
    });
    // (the first trainee's tracker record is unreadable: the others must still get their day's check)
    store.set('ft:tracker:' + ids[0], '{not json');
    const listings = {};
    globalThis.fetch = async (url) => {
        const u = String(url), m = u.match(/embeddedfolderview\?id=([A-Za-z0-9_-]+)/);
        if (m) { listings[m[1]] = (listings[m[1]] || 0) + 1;
            return new Response(`<div class="flip-entry" id="entry-x${m[1]}"><a href="https://docs.google.com/document/d/x${m[1]}/edit"><div class="flip-entry-title">PI Overview_Answers</div><div class="flip-entry-last-modified"><div>Oct 26</div></div></a></div>`); }
        return new Response('not found', { status: 404 });
    };
    let run = null;
    await worker.scheduled({}, env, { waitUntil(p) { run = p; } });
    try { await run; } catch (e) { fail(`the nightly check stopped on one trainee's unreadable record: ${e.message}`); }
    ids.forEach((id, i) => {
        const n = listings[`cronFolder0${i}AAAA`] || 0;
        if (n !== 1) fail(`${id}'s folder was listed ${n} times in one nightly run (once is enough)`);
        const tr = JSON.parse(store.get('ft:trackerreview:' + id) || 'null') || {};
        const c = tr.compliance || {};
        if (!c['2026-11-05']) fail(`${id} got no compliance record for the day`);
        if (!c['2026-10-26'] || !c['2026-10-26'].backfilled) fail(`${id}'s first training day wasn't backfilled`);
        // (the file saved Oct 26 counts as that day's output: the backfill read the run's one listing)
        if (!c['2026-10-26'] || c['2026-10-26'].saved !== 1) fail(`${id}'s backfill didn't use the folder's listing: ${JSON.stringify(c['2026-10-26'] || {}).slice(0, 300)}`);
    });
    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Nightly check test passed (each trainee\'s folder listed once a run and shared by the screenshots, the day\'s compliance and the backfill; one unreadable trainee doesn\'t stop the rest).');
})().catch(e => { console.error(e); process.exit(1); });
