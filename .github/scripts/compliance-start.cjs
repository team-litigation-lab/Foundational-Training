// ✅ A day's compliance (worker.js dailyCompliance) and the batch's first training day, with Google answered here:
//   1. a Monitoring Sheet that couldn't be read just now (a network fault, a Drive sign-in failure) is "not checked" that
//      day, like a tracker the system can't open — never a 0 the trainee is blamed for;
//   2. the Monitoring Sheet topics due by a day count from the batch's start (its Batch ID), whichever path works the day
//      out (here /api/drive/check, which has no trainee record to hand), not from the day the trainee saved their links;
//   3. a Batch ID given out as B + DDMMYY (B300926: 30 September 2026) starts the batch on that day: the backfill and the
//      ⏪ backtrack work out every training day since, instead of stopping on a date that doesn't exist.
// Usage: node .github/scripts/compliance-start.cjs   (no browser, no network)
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
    const put = (k, v) => store.set('ft:' + k, JSON.stringify(v));
    const get = (k) => JSON.parse(store.get('ft:' + k) || 'null') || {};
    const doc = (s) => 'https://docs.google.com/document/d/' + (s + 'x'.repeat(30)).slice(0, 28) + '/edit';
    // B100526: the batch began Monday 5 October 2026; Friday 16 October is its 10th training day
    const ana = 'ana-cruz--b100526', ben = 'ben-diaz--b100526', cara = 'cara-gomez--b300926';
    put('trainee:' + ana, { id: ana, name: 'Ana Cruz', batch: 'B100526', approved: true });
    put('trainee:' + ben, { id: ben, name: 'Ben Diaz', batch: 'B100526', approved: true });
    put('trainee:' + cara, { id: cara, name: 'Cara Gomez', batch: 'B300926', approved: true });
    // (Ana saved her links on Day 10: her start date is that day, not the batch's)
    put('drive:' + ana, { monitor: doc('anaMonitor'), startDate: '2026-10-16' });
    put('drive:' + ben, { monitor: doc('benMonitor'), startDate: '2026-10-05' });
    globalThis.fetch = async (url) => {
        const u = String(url);
        if (u.includes('anaMonitor') && u.includes('export')) return new Response('Virtual Assistant Essentials - Day 1\nDate: 10/05/2026\n5 Major Takeaways From This Discussion\n1. A Legal VA supports the attorney.\n2. Calls are logged.\n3. Deadlines matter.\n4. Ask when unsure.\n5. Keep notes.\n');
        if (u.includes('benMonitor')) throw new TypeError('fetch failed');
        return new Response('not found', { status: 404 });
    };
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const D = '2026-10-16';

    // 1. Ben's Monitoring Sheet couldn't be read just now: not checked, not 0
    await call('/api/drive/check', { id: ben, date: D, ai: false }, admin);
    { const cur = get('trackerreview:' + ben), c = (cur.compliance || {})[D] || {};
      if (!/couldn.t be read just now/.test((cur.monitor || {}).error || '')) fail(`Ben's Monitoring Sheet didn't fail as a passing fault: ${JSON.stringify(cur.monitor)}`);
      if (!c.parts || c.parts.monitor !== null) fail(`a Monitoring Sheet that couldn't be read just now scored the day: ${JSON.stringify(c.parts)}`);
      if (!(c.unreadable || []).includes('monitor')) fail(`the day doesn't say the Monitoring Sheet wasn't read: ${JSON.stringify(c.unreadable)}`); }

    // 2. Ana's Day 10: ten topics due (from the batch's start), not one (from the day she saved her links)
    await call('/api/drive/check', { id: ana, date: D, ai: false }, admin);
    { const cur = get('trackerreview:' + ana), c = (cur.compliance || {})[D] || {}, mon = cur.monitor || {};
      // (the day's work only: the entry for Day 10's discussion, the tenth topic from the batch's start)
      const want = Math.round(((mon.entries || []).find((x) => x.topic === TR.MONITOR_TOPICS[9]) || {}).pct || 0);
      const one = ((mon.entries || []).find((x) => x.topic === TR.MONITOR_TOPICS[0]) || {}).pct || 0;
      if (!one) fail(`Ana's Day 1 entry wasn't read: ${JSON.stringify(mon)}`);
      if (!c.parts || c.parts.monitor !== want) fail(`Ana's Day 10 Monitoring Sheet part is ${c.parts && c.parts.monitor} (want ${want}, Day 10's entry; ${one} is Day 1's)`); }

    // 3. Cara's batch, B300926: the backfill and the backtrack start on 30 September 2026
    const bf = (await call('/api/compliance/backfill', { ids: [cara] }, admin)).body || {};
    if (!bf.ok || !(bf.filled[cara] > 0)) fail(`the backfill worked out no days for a B + DDMMYY Batch ID: ${JSON.stringify(bf)}`);
    const bt = (await call('/api/drive/backtrack', { id: cara }, admin)).body || {};
    if (bt.error) fail(`the backtrack failed on a B + DDMMYY Batch ID: ${JSON.stringify(bt)}`);
    { const C = get('trackerreview:' + cara).compliance || {};
      if (!C['2026-09-30']) fail(`the batch's first day (30 September) wasn't worked out: ${JSON.stringify(Object.keys(C).sort().slice(0, 3))}`);
      if (Object.keys(C).some((d) => !/^\d{4}-(0\d|1[0-2])-([0-2]\d|3[01])$/.test(d))) fail(`a day that doesn't exist was worked out: ${JSON.stringify(Object.keys(C))}`); }

    if (failures.length) { console.log('FAIL\n- ' + failures.join('\n- ')); process.exit(1); }
    console.log('compliance-start: ok');
})().catch((e) => { console.log('FAIL', e && e.stack || e); process.exit(1); });
