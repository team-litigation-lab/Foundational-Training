// 🗑 Clearing a batch's trainee (worker.js /api/batch/purge): the kept record (slim, archived, with the scorecard snapshot)
// is written before the working records go, and a scorecard snapshot over 60,000 characters (many trainer activities with
// long comments) is shortened to valid JSON instead of failing after the records were already deleted.
// Usage: node .github/scripts/batch-purge.cjs
const path = require('path');
const { pathToFileURL } = require('url');
const failures = []; const fail = m => failures.push(m);

(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const set = (k, v) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, at);
  const get = async (k) => { const r = await call('/api/storage/get', { key: k }, at); return JSON.parse((r.body || {}).value || 'null'); };
  const seed = async (id) => {
    await set('trainee:' + id, { id, name: 'Ana ' + id, batch: 'B103026', approved: true, dayProgress: { 1: { done: true, score: 90 } } });
    await set('progress:' + id, { data: { notes: 'mine' } });
    await set('guide:' + id + ':lor', { html: '<p>guide</p>' });
  };
  // a long snapshot: 45 trainer activities, each with a 1,400-character comment (over 60,000 characters of JSON)
  const trainerActs = {}; for (let i = 0; i < 45; i++) trainerActs['act' + i] = { title: 'Activity ' + i, status: 'Passed', score: 80, avg: 4, date: '2026-10-01', comment: 'é"\\'.repeat(466) + 'xy' };
  const big = { at: '2026-11-01T00:00:00Z', overall: 84, lessons: { done: 10, total: 12 }, systems: [{ id: 'trainer', label: 'Trainer', avg: 80, graded: 3 }], trainerActs };
  if (JSON.stringify(big).length <= 60000) fail('the test scorecard should be over 60,000 characters');
  try {
    // the long snapshot: the clear succeeds, the record is archived with a valid, shortened scorecard
    await seed('t1');
    const pu = await call('/api/batch/purge', { id: 't1', scorecard: big, backup: { folder: 'https://drive.google.com/drive/folders/x' } }, at);
    if (pu.status !== 200) fail(`the clear of a trainee with a long scorecard failed: ${pu.status} ${JSON.stringify(pu.body)}`);
    const r = await get('trainee:t1');
    if (!r || !r.archived || !r.purgedAt || !r.scorecard || r.scorecard.overall !== 84) fail(`the long-scorecard trainee wasn't archived with its scorecard: ${JSON.stringify(r).slice(0, 300)}`);
    else {
      if (JSON.stringify(r.scorecard).length > 60000) fail('the kept scorecard is over 60,000 characters');
      if (!r.scorecard.trainerActs || !r.scorecard.trainerActs.act44 || r.scorecard.trainerActs.act44.score !== 80) fail('the shortened scorecard lost the trainer activities\' scores');
    }
    if (store.has('ft:progress:t1') || store.has('ft:guide:t1:lor')) fail('the long-scorecard trainee\'s working records weren\'t cleared');
    // a snapshot under the limit is kept whole
    await seed('t2');
    const small = { overall: 70, systems: [{ id: 'trainer', avg: 70 }], trainerActs: { a: { score: 70, comment: 'Good work' } } };
    if ((await call('/api/batch/purge', { id: 't2', scorecard: small }, at)).status !== 200) fail('the clear failed');
    const r2 = await get('trainee:t2');
    if (!r2 || JSON.stringify(r2.scorecard) !== JSON.stringify(small)) fail(`a short scorecard wasn't kept whole: ${JSON.stringify(r2 && r2.scorecard)}`);
    // the kept record is written before anything is deleted: a failed write leaves the working records in place
    await seed('t3');
    const put = env.LSH_KV.put;
    env.LSH_KV.put = async (k, v) => { if (k === 'ft:trainee:t3') throw new Error('KV down'); return put(k, v); };
    const p3 = await call('/api/batch/purge', { id: 't3', scorecard: small }, at);
    env.LSH_KV.put = put;
    if (p3.status === 200) fail('a clear whose record write failed reported success');
    if (!store.has('ft:progress:t3') || !store.has('ft:guide:t3:lor')) fail('a clear whose record write failed still deleted the working records');
  } catch (e) { fail('threw: ' + (e && e.stack || e)); }
  if (failures.length) { console.error(failures.map(f => '✗ ' + f).join('\n')); process.exit(1); }
  console.log('✓ batch purge: the kept record is written first and a long scorecard is shortened to valid JSON');
})();
