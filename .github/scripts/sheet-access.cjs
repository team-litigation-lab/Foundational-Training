// 🔒 Who sees what of the 📋 Batch Sheet / 📋 My Progress (js/ft-batch-sheet.js), on the Worker itself with real tokens:
//   a trainee reads every record their own sheet needs (their own and the trainer's records about them) and nothing of
//   another trainee's — not their progress, scores or account — gets no list of trainees, and can't move anyone's batch
//   (not even their own: a trainer's move stays on every save they make); a trainer reads and moves them all.
// Usage: node .github/scripts/sheet-access.cjs   (no server, no browser needed)
const path = require('path');
const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);

(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil() { } });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const signIn = async (name) => { const r = await call('/api/auth/trainee', { name, batch: 'B103026' }); if (!r.body || !r.body.token) throw new Error('sign-in: ' + JSON.stringify(r)); return r.body; };
  const ann = await signIn('Ann Own'), bob = await signIn('Bob Other');
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  // their records, as the platform keeps them (written by the trainer)
  // (listening:<id> with trackerreview:<id>: 🎧 Call Listening's items, Day 3's Reception Listening Activity graded among them)
  const KEYS = id => ['trainee:', 'progress:', 'skills:', 'simresults:', 'kcreview:', 'labreview:', 'callsim:', 'calsim:', 'calweek:', 'trackerreview:', 'listening:', 'trainerfb:', 'rankshare:', 'daycheck:'].map(k => k + id);
  for (const t of [ann, bob]) for (const k of KEYS(t.id)) await call('/api/storage/set', { key: k, value: JSON.stringify(k.startsWith('trainee:') ? { id: t.id, name: k, batch: 'B103026', approved: true } : { mine: k }) }, admin);

  // a trainee: their own sheet's records, all of them
  const mine = await call('/api/storage/get-many', { keys: KEYS(ann.id) }, ann.token);
  const missing = KEYS(ann.id).filter(k => !(mine.body && mine.body.values && mine.body.values[k]));
  if (missing.length) fail(`a trainee can't read their own sheet's records: ${missing.join(', ')}`);
  // …and nothing of another trainee's
  const theirs = await call('/api/storage/get-many', { keys: KEYS(bob.id) }, ann.token);
  const leaked = Object.keys((theirs.body && theirs.body.values) || {}).filter(k => theirs.body.values[k]);
  if (leaked.length) fail(`a trainee read another trainee's records: ${leaked.join(', ')}`);
  for (const k of ['trainee:' + bob.id, 'progress:' + bob.id]) { const one = await call('/api/storage/get', { key: k }, ann.token); if (one.body && one.body.value) fail(`a trainee read ${k}`); }
  // no list of trainees for a trainee; the trainer gets it
  const list = await call('/api/storage/list', { prefix: 'trainee:' }, ann.token);
  if (((list.body && list.body.keys) || []).length) fail('a trainee was given the list of trainees');
  const all = await call('/api/storage/list', { prefix: 'trainee:' }, admin);
  if (((all.body && all.body.keys) || []).length < 2) fail('the trainer was not given the list of trainees');
  // a trainee can't move another trainee's batch
  const bobRec = JSON.parse(store.get('ft:trainee:' + bob.id) || store.get('trainee:' + bob.id) || '{}');
  const w = await call('/api/storage/set', { key: 'trainee:' + bob.id, value: JSON.stringify(Object.assign({}, bobRec, { batch: 'B010101', batchMovedBy: 'trainer' })) }, ann.token);
  const bobNow = JSON.parse((await call('/api/storage/get', { key: 'trainee:' + bob.id }, admin)).body.value || '{}');
  if (w.status === 200 && bobNow.batch !== 'B103026') fail(`a trainee moved another trainee's batch: ${bobNow.batch}`);
  // a trainer moves Ann; her own saves can't move her back, nor mark the move as hers
  const annRec = JSON.parse((await call('/api/storage/get', { key: 'trainee:' + ann.id }, admin)).body.value);
  await call('/api/storage/set', { key: 'trainee:' + ann.id, value: JSON.stringify(Object.assign({}, annRec, { batch: 'B110226', batchFrom: 'B103026', batchMovedAt: 'x', batchMovedBy: 'trainer' })) }, admin);
  await call('/api/storage/set', { key: 'trainee:' + ann.id, value: JSON.stringify(Object.assign({}, annRec, { batch: 'B103026', batchMovedBy: '' })) }, ann.token);
  const annNow = JSON.parse((await call('/api/storage/get', { key: 'trainee:' + ann.id }, admin)).body.value);
  if (annNow.batch !== 'B110226' || annNow.batchMovedBy !== 'trainer') fail(`a trainee's own save undid the trainer's batch move: ${annNow.batch} / ${annNow.batchMovedBy}`);
  // and a trainee can't mark a move as the trainer's on their own record
  const bobOwn = JSON.parse((await call('/api/storage/get', { key: 'trainee:' + bob.id }, admin)).body.value);
  await call('/api/storage/set', { key: 'trainee:' + bob.id, value: JSON.stringify(Object.assign({}, bobOwn, { batchMovedBy: 'trainer' })) }, bob.token);
  const bobAfter = JSON.parse((await call('/api/storage/get', { key: 'trainee:' + bob.id }, admin)).body.value);
  if (bobAfter.batchMovedBy) fail('a trainee marked their own record as moved by the trainer');

  // ✎ Fix a date: a trainee can't change or fake a registration fix
  const before = JSON.parse((await call('/api/storage/get', { key: 'trainee:' + bob.id }, admin)).body.value);
  await call('/api/storage/set', { key: 'trainee:' + bob.id, value: JSON.stringify(Object.assign({}, before, { registeredAt: '2020-01-01T00:00:00Z', registeredAtFixedAt: 'x', registeredAtWas: 'y' })) }, bob.token);
  const after = JSON.parse((await call('/api/storage/get', { key: 'trainee:' + bob.id }, admin)).body.value);
  if (after.registeredAt !== before.registeredAt || after.registeredAtFixedAt || after.registeredAtWas) fail('a trainee changed their own registration date or faked a trainer\'s fix');

  // ✅ the Day by Day ticks: a trainee reads them and can't tick her own
  await call('/api/storage/set', { key: 'daycheck:' + ann.id, value: JSON.stringify({ items: { '1|x': { done: true } } }) }, ann.token);
  const dcA = JSON.parse((await call('/api/storage/get', { key: 'daycheck:' + ann.id }, admin)).body.value || '{}');
  if (dcA.items && dcA.items['1|x']) fail('a trainee ticked her own Day by Day checklist');

  if (failures.length) { console.error('Sheet access test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Sheet access test passed (a trainee reads all of their own sheet and nothing of another trainee\'s, gets no list of trainees, moves nobody\'s batch and cannot undo or forge a trainer\'s move or change a registration date; the trainer reads and moves them all).');
})().catch(e => { console.error(e); process.exit(1); });
