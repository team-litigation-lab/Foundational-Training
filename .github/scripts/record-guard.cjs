// 🛡 The trainers' score records, guarded (worker.js GUARDED, merge3, RecordGuard): a trainer's saved score is never written
// over by another save's older copy, and reads see the latest save at once.
//   1. Two trainers read Jose's labreview, one saves the Intake Packet Demo, the other then saves the LOR Demo from the copy
//      it read before: both scores stay (before, the second save wrote the first one away).
//   2. A save that clears a field the other trainer didn't touch clears it; one the other trainer changed meanwhile stays.
//   3. A save with no base (an older page) only adds: nothing already saved is dropped.
//   4. Non-guarded records are written as before (a trainee's own record).
//   5. The Durable Object: with KV answering a stale copy (as an edge cache does for up to a minute), a read right after a
//      save gets the save, and a merge is made onto the save, not the stale copy; a held copy older than GUARD_TTL reads KV again.
//   6. The simulator-score sync merges: a trainer's score saved while the sync was asking the Portal stays.
// Usage: node .github/scripts/record-guard.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
const kvOn = (store) => ({ get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => { store.set(k, v); }, delete: async (k) => { store.delete(k); },
  list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) });
(async () => {
  const mod = await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href);
  const worker = mod.default, RecordGuard = mod.RecordGuard;
  if (typeof RecordGuard !== 'function') fail('worker.js exports no RecordGuard class');
  const wr = require(path.join(process.cwd(), 'wrangler.json'));
  if (!(wr.durable_objects.bindings || []).some(b => b.name === 'RECORD_GUARD' && b.class_name === 'RecordGuard')) fail('wrangler.json binds no RECORD_GUARD');
  if (!(wr.migrations || []).some(m => (m.new_sqlite_classes || []).includes('RecordGuard'))) fail('wrangler.json has no migration creating RecordGuard');

  // ---------- 1–4: through /api/storage/set, KV only (no Durable Object binding: the merge is done in the Worker) ----------
  const store = new Map(), id = 'jose-demo--b1';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', LSH_KV: kvOn(store) };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) }; };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  if (!admin) { console.error('Record guard test FAILED: no admin token'); process.exit(1); }
  const K = 'labreview:' + id, rec = () => JSON.parse(store.get('ft:' + K) || 'null');
  store.set('ft:' + K, JSON.stringify({ acts: { 'reception-live': { score: 90, status: 'Passed' } }, extra: { points: 2, note: 'kept' } }));
  const base = store.get('ft:' + K);                                           // what both trainers' pages read
  const A = JSON.parse(base); A.acts['intake-packet'] = { score: 88, status: 'Passed', at: '2026-11-18T10:00:00Z' };
  const B = JSON.parse(base); B.acts['lor-demo'] = { score: 92, status: 'Passed', at: '2026-11-18T10:00:30Z' };
  await call('/api/storage/set', { key: K, value: JSON.stringify(A), base }, admin);
  const rB = await call('/api/storage/set', { key: K, value: JSON.stringify(B), base }, admin);
  const r1 = rec();
  if (!(r1.acts['intake-packet'] && r1.acts['intake-packet'].score === 88 && r1.acts['lor-demo'] && r1.acts['lor-demo'].score === 92 && r1.acts['reception-live'].score === 90))
    fail(`two trainers' saves from the same copy: one was lost: ${JSON.stringify(r1.acts)}`);
  if (!rB.body || typeof rB.body.value !== 'string' || !JSON.parse(rB.body.value).acts['intake-packet']) fail(`the save doesn't give the merged record back: ${JSON.stringify(rB.body).slice(0, 200)}`);
  // 2. a removal by one, a change by the other
  const base2 = store.get('ft:' + K);
  const C = JSON.parse(base2); delete C.acts['reception-live']; delete C.extra;      // trainer C clears two things
  const D = JSON.parse(base2); D.extra = { points: 5, note: 'changed' };              // trainer D changed one of them meanwhile
  await call('/api/storage/set', { key: K, value: JSON.stringify(D), base: base2 }, admin);
  await call('/api/storage/set', { key: K, value: JSON.stringify(C), base: base2 }, admin);
  const r2 = rec();
  if (r2.acts['reception-live']) fail('a score the trainer cleared, which nobody else touched, is still there');
  if (!r2.extra || r2.extra.points !== 5) fail(`a field another trainer changed was cleared by an older copy: ${JSON.stringify(r2.extra)}`);
  if (!r2.acts['intake-packet'] || !r2.acts['lor-demo']) fail('the demos were lost by an unrelated save');
  // 3. no base: only adds
  await call('/api/storage/set', { key: K, value: JSON.stringify({ acts: { 'medlor-demo': { score: 70 } } }) }, admin);
  const r3 = rec();
  if (!r3.acts['medlor-demo'] || !r3.acts['intake-packet'] || !r3.acts['lor-demo']) fail(`a save without a base dropped saved scores: ${JSON.stringify(r3.acts)}`);
  // 4. not guarded: written as sent
  store.set('ft:settings:x', JSON.stringify({ a: 1, b: 2 }));
  await call('/api/storage/set', { key: 'settings:x', value: JSON.stringify({ a: 3 }) }, admin);
  if (store.get('ft:settings:x') !== JSON.stringify({ a: 3 })) fail('a record that isn\'t a trainer\'s score record is no longer written as sent');

  // ---------- 5: the Durable Object, over a KV that answers stale ----------
  if (typeof RecordGuard === 'function') {
  const kvStore = new Map(); let stale = null;
  const staleKV = Object.assign(kvOn(kvStore), { get: async (k) => stale != null ? stale : (kvStore.has(k) ? kvStore.get(k) : null) });
  const doStore = new Map(), state = { storage: { get: async (k) => doStore.get(k), put: async (k, v) => { doStore.set(k, v); } } };
  const g = new RecordGuard(state, { LSH_KV: staleKV });
  const ask = async (b) => (await g.fetch(new Request('https://guard/', { method: 'POST', body: JSON.stringify(b) }))).json();
  const old = JSON.stringify({ acts: { 'reception-live': { score: 90 } } });
  kvStore.set('ft:' + K, old);
  const saved = JSON.stringify({ acts: { 'reception-live': { score: 90 }, 'lor-demo': { score: 92 } } });
  await ask({ op: 'merge', key: K, base: old, value: saved });
  stale = old;                                                                 // the edge now answers the copy from before the save
  const got = await ask({ op: 'get', key: K });
  if (!got.value || !JSON.parse(got.value).acts['lor-demo']) fail(`a read right after a save doesn't see it (the stale copy came back): ${got.value}`);
  // another trainer's save from the stale copy: merged onto the save
  const other = JSON.stringify({ acts: { 'reception-live': { score: 90 }, 'intake-packet': { score: 88 } } });
  const m = await ask({ op: 'merge', key: K, base: old, value: other });
  const mv = JSON.parse(m.value);
  if (!mv.acts['lor-demo'] || !mv.acts['intake-packet']) fail(`a save from a stale copy wrote the newer save away: ${m.value}`);
  if (kvStore.get('ft:' + K) !== m.value) fail('the merged record isn\'t written to KV');
  // concurrent merges, taken one at a time
  const base3 = m.value;
  const many = await Promise.all(['a1', 'a2', 'a3', 'a4'].map(a => { const v = JSON.parse(base3); v.acts[a] = { score: 50 }; return ask({ op: 'merge', key: K, base: base3, value: JSON.stringify(v) }); }));
  const last = JSON.parse(kvStore.get('ft:' + K));
  if (!['a1', 'a2', 'a3', 'a4', 'lor-demo', 'intake-packet'].every(a => last.acts[a])) fail(`saves at the same moment lost one: ${Object.keys(last.acts).join(', ')} (${many.length})`);
  // a held copy past GUARD_TTL: KV is read again (a record deleted elsewhere isn't kept)
  doStore.set('rec', Object.assign({}, doStore.get('rec'), { at: Date.now() - 11 * 60 * 1000 }));
  stale = null; kvStore.delete('ft:' + K);
  const after = await ask({ op: 'get', key: K });
  if (after.value != null) fail(`a copy held past GUARD_TTL is still served over KV: ${String(after.value).slice(0, 80)}`);
  }

  // ---------- 6: the simulator-score sync merges ----------
  const src = require('fs').readFileSync('worker.js', 'utf8');
  const sync = src.slice(src.indexOf('async function syncSimScores'), src.indexOf('async function syncSimScores') + 6000);
  if (!/kv\.merge\(lk, read0,/.test(sync) || /await kv\.put\(lk,/.test(sync)) fail('the simulator-score sync still writes its whole copy over the record');

  if (failures.length) { console.error('Record guard test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Record guard test passed (two trainers saving different scores from the same copy both keep theirs; a cleared field goes unless changed meanwhile; a save without a base only adds; other records written as sent; the Durable Object serves the latest save over a stale KV, merges onto it, takes saves one at a time and reads KV again after GUARD_TTL; the simulator-score sync merges).');
})().catch((e) => { console.error('Record guard test FAILED:', e && e.stack || e); process.exit(1); });
