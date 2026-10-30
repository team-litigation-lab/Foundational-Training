// 📅 The activity's anchor Monday, kept by the Worker (worker.js, calsim:<id> and calcheck:<id>): Day 5's Attorney Calendar
//   Management Activity is moved by whole weeks to the trainee's anchor (js/ft-calsim-core.js, THE ANCHOR), stored once in
//   calsim:<id>.anchors["attorney-activity"]. A trainee's write: a valid anchor is saved; a Tuesday, a Monday before July 6, 2026,
//   a date that isn't one and "<b>" are dropped; a second write with another anchor keeps the first (so are the other anchors
//   kept, and the trainer's reviews); a submission's anchor can't be changed or taken off later, a new one's bad anchor is
//   dropped. calcheck:<id>: the record's anchor is kept once set, a snapshot's is frozen. The trainer (admin) writes the
//   record whole, as everywhere else. Then, through the test server at BASE (open mode: the page's own writes), a record with
//   an anchor reads back as written.
// Usage: NODE_PATH=…/node_modules node .github/scripts/calanchor.cjs http://localhost:8787/
const path = require('path');
const { pathToFileURL } = require('url');
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
const eq = (label, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); };
const SCN = 'attorney-activity', ID = 'ana-cruz--b1';

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:' + ID, JSON.stringify({ id: ID, name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  if (!t || !at) { fail('couldn\'t sign in as a trainee and an admin'); return; }
  const set = async (k, v, tok) => { const r = await call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t); if (r.status !== 200) fail(`saving ${k} answered ${r.status}`); return r; };
  const get = async (k, tok) => JSON.parse(((await call('/api/storage/get', { key: k }, tok || t)).body || {}).value || 'null');
  const K = 'calsim:' + ID, rec = (anchors, submissions) => ({ v: 2, anchors, drafts: {}, autos: [], submissions: submissions || [], reviews: { forged: { score: 10 } }, external: [] });

  // what isn't an anchor is dropped
  for (const [label, bad] of [['a Tuesday', '2026-11-03'], ['a Monday before July 6, 2026', '2026-06-29'], ['"<b>"', '<b>'], ['a date that isn\'t one', '2026-02-30'], ['a number', 20261102]]) {
    store.delete('ft:' + K);
    await set(K, rec({ [SCN]: bad }));
    const r = await get(K);
    eq(`${label} as the anchor`, r && r.anchors, {});
    eq('the trainee\'s reviews', r && r.reviews, {});
  }
  // a valid anchor is saved, July's own too
  store.delete('ft:' + K); await set(K, rec({ [SCN]: '2026-07-06' })); eq('July 6, 2026 as the anchor', (await get(K)).anchors, { [SCN]: '2026-07-06' });
  store.delete('ft:' + K); await set(K, rec({ [SCN]: '2026-11-02', '<x>': '2026-11-09' }));
  eq('a valid anchor (and no odd scenario id)', (await get(K)).anchors, { [SCN]: '2026-11-02' });
  // first write wins: another anchor, none, a broken one, all keep the first
  await set(K, rec({ [SCN]: '2026-11-09' })); eq('a second anchor', (await get(K)).anchors, { [SCN]: '2026-11-02' });
  await set(K, rec({})); eq('the anchor left out', (await get(K)).anchors, { [SCN]: '2026-11-02' });
  await set(K, Object.assign(rec(null), { anchors: 'x' })); eq('anchors not an object', (await get(K)).anchors, { [SCN]: '2026-11-02' });
  await set(K, rec({ other: '2026-11-16', [SCN]: '2026-12-07' })); eq('another scenario\'s anchor added', (await get(K)).anchors, { other: '2026-11-16', [SCN]: '2026-11-02' });

  // a submission's anchor is frozen once saved
  const sub = (a, at2) => Object.assign({ scn: SCN, at: at2 || '2026-11-05T10:00:00.000Z', events: [], auto: { pct: 50, score: 5, max: 10 } }, a === undefined ? {} : { anchor: a });
  await set(K, rec({}, [sub('2026-11-02')]));
  eq('a submission\'s anchor saved', (await get(K)).submissions.map(z => z.anchor), ['2026-11-02']);
  await set(K, rec({}, [sub('2026-07-06'), sub('2026-11-30', '2026-11-06T10:00:00.000Z')]));
  eq('a submission\'s anchor changed later (and a new one\'s)', (await get(K)).submissions.map(z => z.anchor), ['2026-11-02', '2026-11-30']);
  await set(K, rec({}, [sub(undefined), sub('<b>', '2026-11-06T10:00:00.000Z'), sub('2026-11-03', '2026-11-07T10:00:00.000Z')]));
  eq('a submission\'s anchor taken off, a new one\'s not a Monday', (await get(K)).submissions.map(z => z.anchor), ['2026-11-02', '2026-11-30', undefined]);
  // a submission from before anchors stays without one
  store.set('ft:' + K, JSON.stringify(rec({}, [sub(undefined, '2026-07-08T10:00:00.000Z')])));
  await set(K, rec({}, [sub('2026-11-02', '2026-07-08T10:00:00.000Z')]));
  eq('an anchor given to a submission from before anchors', (await get(K)).submissions.map(z => 'anchor' in z), [false]);

  // the trainer writes the record whole: their anchor stands, even over the trainee's
  await set(K, rec({ [SCN]: '2026-12-07' }, [sub('2026-12-07')]), at);
  const ra = await get(K, at); eq('the trainer\'s anchor', [ra.anchors, ra.submissions[0].anchor], [{ [SCN]: '2026-12-07' }, '2026-12-07']);
  await set(K, rec({ [SCN]: '2026-11-02' })); eq('the trainee after the trainer', (await get(K)).anchors, { [SCN]: '2026-12-07' });

  // calcheck:<id>: the record's anchor is kept once set, each snapshot's frozen
  const C = 'calcheck:' + ID, snap = (a, at2) => ({ at: at2 || '2026-11-05T10:00:00.000Z', met: 1, total: 1, pct: 100, checks: [['1', 'Title', true, '']], snap: Object.assign({ entries: { 1: { title: 'Client Meeting' } }, final: {} }, a === undefined ? {} : { anchor: a }) });
  for (const [label, bad] of [['a Tuesday', '2026-11-03'], ['a Monday before July 6, 2026', '2026-06-29'], ['"<b>"', '<b>']]) {
    store.delete('ft:' + C);
    await set(C, { anchor: bad, entries: {}, final: {}, submits: [snap(bad)] });
    const r = await get(C); eq(`${label} as the activity check's anchors`, [r && 'anchor' in r, r && 'anchor' in r.submits[0].snap], [false, false]);
  }
  store.delete('ft:' + C);
  await set(C, { entries: {}, final: {} }); eq('no anchor yet', 'anchor' in (await get(C)), false);
  await set(C, { anchor: '2026-11-02', entries: {}, final: {}, submits: [snap('2026-11-02')] });
  let r = await get(C); eq('the activity check\'s anchors saved', [r.anchor, r.submits[0].snap.anchor], ['2026-11-02', '2026-11-02']);
  await set(C, { anchor: '2026-11-09', entries: {}, final: {}, submits: [snap('2026-11-09'), snap('2026-11-16', '2026-11-06T10:00:00.000Z')] });
  r = await get(C); eq('the activity check\'s anchors changed later', [r.anchor, r.submits.map(x => x.snap.anchor)], ['2026-11-02', ['2026-11-02', '2026-11-16']]);
  await set(C, { entries: {}, final: {}, submits: [snap(undefined), snap(undefined, '2026-11-06T10:00:00.000Z')] });
  r = await get(C); eq('the activity check\'s anchors taken off', [r.anchor, r.submits.map(x => x.snap.anchor)], ['2026-11-02', ['2026-11-02', '2026-11-16']]);
  await set(C, { anchor: '2026-12-07', entries: {}, final: {} }, at); eq('the trainer\'s activity check anchor', (await get(C, at)).anchor, '2026-12-07');
}

async function serverChecks() {
  // the test server (open mode): a calendar record with an anchor goes through /api/storage and back
  const call = (p, body) => fetch(new URL(p, BASE), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
  const K = 'calsim:anchor-check--b102626', v = { v: 2, anchors: { [SCN]: '2026-11-02' }, drafts: {}, autos: [], submissions: [], reviews: {}, external: [] };
  await call('/api/storage/set', { key: K, value: JSON.stringify(v) });
  eq('the record through the server', JSON.parse((await call('/api/storage/get', { key: K })).value || 'null'), v);
  await call('/api/storage/set', { key: K, value: 'null' });
}

(async () => {
  await workerChecks();
  await serverChecks();
  if (failures.length) { console.error('FAIL\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('calanchor: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
