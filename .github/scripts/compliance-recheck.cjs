// ✅ A day checked while it was still on — the sheet's update that morning, before the trainee's work was in, with the
// end-of-shift check never reaching them — is worked out again once it is over (worker.js backfillCompliance, unfinished),
// raising what it had and never lowering it; a day finished (the end-of-shift check's, or worked out afterwards) is left alone.
// Usage: node .github/scripts/compliance-recheck.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const TR = globalThis.FTTrackerRules;
    const store = new Map();
    const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
            list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) },
        ASSETS: { fetch: async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }) } };
    globalThis.fetch = async () => new Response('not found', { status: 404 });
    const put = (k, v) => store.set('ft:' + k, JSON.stringify(v));
    const get = (k) => JSON.parse(store.get('ft:' + k) || 'null') || {};
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    // three weekdays before today (PT): D, D2, D3
    const days = []; for (let t = Date.parse(TR.ptDate() + 'T12:00:00Z') - 864e5; days.length < 3; t -= 864e5) { const d = new Date(t).toISOString().slice(0, 10); if (TR.isWeekday(d)) days.unshift(d); }
    const [D, D2, D3] = days, at = (d, hh) => new Date(Date.parse(d + 'T' + hh + ':00:00Z')).toISOString();
    const zero = { tracker: null, monitor: null, tam: null, instructions: null, platform: 0, tests: 0, outputs: 0, eod: 0 };
    const dan = 'dan-reyes--b1';
    put('trainee:' + dan, { id: dan, name: 'Dan Reyes', batch: 'B1', approved: true, registeredAt: at(D, '16') });
    // D: checked at 9 AM PT on the day (17:00 UTC), before any work — all zeros; the work came in later that day
    // D2: the end-of-shift check's (final), all zeros — a day the trainee really did nothing: left as it is
    // D3: checked early with the platform at 100 — the re-check finds less now and must not lower it
    put('trackerreview:' + dan, { days: {}, compliance: {
        [D]: { v: 2, pct: 0, parts: Object.assign({}, zero), checkedAt: at(D, '17') },
        [D2]: { v: 2, pct: 0, parts: Object.assign({}, zero), checkedAt: at(D2, '22'), final: true },
        [D3]: { v: 2, pct: 25, parts: Object.assign({}, zero, { platform: 100 }), checkedAt: at(D3, '17') } } });
    put('progress:' + dan, { traineeId: dan, savedAt: at(D, '23'), data: { 'day-progress': { 1: { studied: true, studiedAt: at(D, '20') } } } });
    put('skills:' + dan, { typing: [{ date: D, slot: 'AM', wpm: 40 }, { date: D, slot: 'PM', wpm: 42 }], spelling: [{ date: D, score: 9 }] });

    const bf = (await call('/api/compliance/backfill', { ids: [dan] }, admin)).body || {};
    if (!bf.ok) fail(`the backfill didn't run: ${JSON.stringify(bf)}`);
    const c = get('trackerreview:' + dan).compliance || {};
    if (!c[D] || c[D].parts.platform !== 100 || c[D].parts.tests !== 100 || !c[D].final) fail(`a day checked before its work came in wasn't worked out again: ${JSON.stringify(c[D] && { parts: c[D].parts, final: c[D].final })}`);
    if (!c[D2] || c[D2].parts.platform !== 0 || c[D2].checkedAt !== at(D2, '22')) fail(`a finished day was worked out again: ${JSON.stringify(c[D2])}`);
    if (!c[D3] || c[D3].parts.platform !== 100 || !c[D3].final) fail(`a re-check lowered a day: ${JSON.stringify(c[D3] && c[D3].parts)}`);
    // and once finished, a day isn't worked out again on the next opening
    const was = JSON.stringify(c[D]);
    await call('/api/compliance/backfill', { ids: [dan] }, admin);
    if (JSON.stringify((get('trackerreview:' + dan).compliance || {})[D]) !== was) fail('a day already re-checked was worked out again');

    if (failures.length) { console.error('Compliance re-check test FAILED:\n' + failures.map(f => ' - ' + f).join('\n')); process.exit(1); }
    console.log('Compliance re-check test passed (a day checked before its work came in is worked out again once over, raised and never lowered; a finished day is left alone)');
})().catch(e => { console.error(e); process.exit(1); });
