// 👥 Merging a duplicate account (worker.js mergeAccounts, POST /api/batch/merge), on the Worker with real tokens: one person
//   with two accounts (a Batch ID change made a second one) keeps ONE. Everything of the faulty account moves into the kept
//   one — records only it has, records both have combined (nothing of the kept one's lost), its attendance check-ins, its
//   rows in the Weekly Ranking reports, its guide notes — then the faulty account is deleted with nothing of it left but a
//   redirect: a sign-in to it opens the kept one, a page still open on it is signed out (merged), writes to it are refused.
//   Only an admin merges, and only two accounts of the same name.
// Usage: node .github/scripts/merge-accounts.cjs   (no server, no browser needed)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil() { } });
    return { status: res.status, body: await res.json().catch(() => null) }; };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const put = (k, v) => store.set('ft:' + k, JSON.stringify(v)), get = k => { const v = store.get('ft:' + k); return v == null ? null : JSON.parse(v); };
  // her two accounts: the right one (B103026, where her batch is) and the faulty one a Batch ID edit made (B110226)
  const faultyS = await call('/api/auth/trainee', { name: 'Valeria Sarti', batch: 'B110226' }), F = faultyS.body.id, ftok = faultyS.body.token;
  const K = (await call('/api/auth/trainee', { name: 'Valeria Sarti', batch: 'B103026' })).body.id;
  put('trainee:' + K, { id: K, name: 'Valeria Sarti', batch: 'B103026', approved: true, registeredAt: '2026-10-30T12:00:00Z', lastActive: '2026-11-01T10:00:00Z', dayProgress: { 1: { done: true, score: 80 } } });
  put('trainee:' + F, { id: F, name: 'Valeria Sarti', batch: 'B110226', approved: true, registeredAt: '2026-11-02T12:00:00Z', lastActive: '2026-11-04T10:00:00Z', dayProgress: { 2: { done: true, score: 90 } } });
  put('progress:' + K, { data: { 'work-log': [{ at: 'a', label: 'kept' }] } }); put('progress:' + F, { data: { 'work-log': [{ at: 'b', label: 'faulty' }], notes: 'mine' } });
  put('process:' + F, { sets: {}, kc: { 2: { attempts: 1, best: 90 } } });
  put('drive:' + K, { monitor: 'https://docs.google.com/document/d/keptMonitor00001/edit' }); put('drive:' + F, { monitor: 'https://docs.google.com/document/d/faultyMonitor001/edit', tracker: 'https://docs.google.com/spreadsheets/d/faultyTracker001/edit' });
  put('kcreview:' + F, { lessons: { 2: { score: 95, comment: 'Good.' } } });
  put('checkin:2026-11-03:' + F, { in: '08:01' });
  put('guide:' + F + ':lor', { html: '<p>notes</p>' });
  put('ranking:B103026:w1', { cols: [], rows: { [F]: { cells: { c1: { raw: 3 } } }, [K]: { cells: { c2: { raw: 4 } } } } });
  put('trainee:ana-cruz--b103026', { id: 'ana-cruz--b103026', name: 'Ana Cruz', batch: 'B103026', approved: true });

  // only an admin, and only the same person's name
  if ((await call('/api/batch/merge', { from: F, into: K }, ftok)).status !== 403) fail('a trainee could merge accounts');
  if ((await call('/api/batch/merge', { from: F, into: 'ana-cruz--b103026' }, admin)).status !== 400) fail('two different people\'s accounts were merged');
  const r = await call('/api/batch/merge', { from: F, into: K }, admin);
  if (!r.body || !r.body.ok) fail(`the merge failed: ${JSON.stringify(r.body)}`);
  // the kept account: its own batch and identity, with what the faulty one held
  const kr = get('trainee:' + K);
  if (!kr || kr.batch !== 'B103026' || kr.id !== K || !kr.dayProgress[1] || !kr.dayProgress[2] || kr.registeredAt !== '2026-10-30T12:00:00Z' || kr.lastActive !== '2026-11-04T10:00:00Z') fail(`the kept account: ${JSON.stringify(kr)}`);
  const pr = get('progress:' + K);
  if (!pr || pr.data['work-log'].length !== 2 || pr.data.notes !== 'mine') fail(`her progress wasn't combined: ${JSON.stringify(pr)}`);
  if (!(get('process:' + K) || {}).kc || get('process:' + K).kc[2].best !== 90) fail('her Knowledge Check (only on the faulty account) didn\'t move');
  const dv = get('drive:' + K);
  if (!dv || dv.monitor !== 'https://docs.google.com/document/d/keptMonitor00001/edit' || !/faultyTracker/.test(dv.tracker || '')) fail(`her Drive links weren't combined (the kept one's first): ${JSON.stringify(dv)}`);
  if (((get('kcreview:' + K) || {}).lessons || {})[2].score !== 95) fail('the trainer\'s review didn\'t move');
  if (!get('checkin:2026-11-03:' + K)) fail('her attendance check-in didn\'t move');
  if (!get('guide:' + K + ':lor')) fail('her guide notes didn\'t move');
  const rk = get('ranking:B103026:w1').rows;
  if (rk[F] || !rk[K] || !rk[K].cells.c1 || !rk[K].cells.c2) fail(`her Weekly Ranking rows weren't merged: ${JSON.stringify(rk)}`);
  // the faulty account is gone: nothing of it left but the redirect
  const left = [...store.keys()].filter(k => k.includes(F) && k !== 'ft:merged:' + F);
  if (left.length) fail(`the faulty account left records behind: ${left}`);
  if (!get('merged:' + F)) fail('no redirect was left for the faulty account');
  // a sign-in to it opens the kept one
  const again = await call('/api/auth/trainee', { name: 'Valeria Sarti', batch: 'B110226' });
  if (!again.body || again.body.id !== K) fail(`signing in with the faulty account's batch didn't open the kept one: ${JSON.stringify(again.body)}`);
  const again2 = await call('/api/auth/trainee', { name: 'Valeria Sarti', batch: 'B110226', id: F });
  if (!again2.body || again2.body.id !== K) fail(`a page renewing the faulty account's session didn't get the kept one: ${JSON.stringify(again2.body)}`);
  // a page still open on it: its record reads as merged (signed out), and it can't write to it again
  const me = await call('/api/storage/get', { key: 'trainee:' + F }, ftok), mr = JSON.parse((me.body || {}).value || 'null');
  if (!mr || mr.approved !== false || mr.mergedInto !== K) fail(`a page open on the faulty account isn't told it was merged: ${JSON.stringify(me.body)}`);
  if ((await call('/api/storage/set', { key: 'progress:' + F, value: JSON.stringify({ data: {} }) }, ftok)).status !== 403) fail('a page open on the faulty account could still write to it');
  if (get('progress:' + F)) fail('the faulty account was written to again');

  if (failures.length) { console.error('Merge accounts test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Merge accounts test passed (everything of the faulty account combined into the kept one — progress, Knowledge Checks, Drive links, reviews, attendance, ranking rows, guide notes — the faulty account deleted but for a redirect: a sign-in opens the kept one, an open page is signed out and can\'t write; admins only, same name only).');
})().catch(e => { console.error(e); process.exit(1); });
