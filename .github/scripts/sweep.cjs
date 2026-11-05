// 🧹 Sweeping inactive accounts (worker.js sweepList / sweepOne, POST /api/batch/sweep-list and /api/batch/sweep), on the
//   Worker with real tokens: every account whose access is gone — offboarded, rejected, archived (a past batch's, an old or
//   mistyped Batch ID's), blocked — and the leftovers of accounts deleted before are listed; an active trainee (approved or
//   waiting), a cleared batch's kept record and a merged account's redirect never are, and can't be swept even when asked.
//   A dry sweep returns every record (the backup); a sweep deletes them all and keeps the account blocked, so a sign-in
//   can't bring it back approved. Admins only.
// Usage: node .github/scripts/sweep.cjs   (no server, no browser needed)
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
  const put = (k, v) => store.set('ft:' + k, JSON.stringify(v)), has = k => store.has('ft:' + k);
  const T = (id, x) => put('trainee:' + id, Object.assign({ id, name: id.split('--')[0].replace(/-/g, ' '), batch: id.split('--')[1].toUpperCase(), registeredAt: '2026-10-01T00:00:00Z' }, x));
  const ana = await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B103026' }); T(ana.body.id, { approved: true });
  T('wai-ting--b103026', { approved: false });
  T('lei-abut--b103026', { approved: true });                                               // Lei: still a trainee
  T('lei-abut--b250926', { approved: true, archived: true, autoArchived: true, dayProgress: { 1: { done: true } } });
  T('lei-abut--b091526', { approved: true, archived: true });
  put('progress:lei-abut--b250926', { data: { notes: 'old' } }); put('guide:lei-abut--b250926:lor', { html: 'x' }); put('checkin:2026-09-30:lei-abut--b250926', { in: '8:00' });
  T('bob-gone--b103026', { approved: true });
  await call('/api/batch/offboard', { id: 'bob-gone--b103026', reason: 'Resigned' }, admin);
  T('rey-jected--b103026', { approved: false, rejected: true });
  T('pat-cleared--b080126', { approved: true, archived: true, purgedAt: '2026-10-01T00:00:00Z' });   // a cleared batch's kept record
  put('progress:old-gone--b090126', { data: {} }); put('process:old-gone--b090126', { sets: {} }); put('checkin:2026-09-01:old-gone--b090126', { in: '9:00' }); put('guide:old-gone--b090126:x', { html: 'y' });
  put('merged:val-sarti--b110226', { into: 'val-sarti--b103026' }); put('progress:val-sarti--b110226', { data: {} });   // a merged account's redirect
  put('learn:global', { shared: true });                                                    // a shared record with a trainee prefix

  if ((await call('/api/batch/sweep-list', {}, ana.body.token)).status !== 403) fail('a trainee could list accounts to sweep');
  if ((await call('/api/batch/sweep', { id: 'lei-abut--b250926' }, ana.body.token)).status !== 403) fail('a trainee could sweep');
  const L = (await call('/api/batch/sweep-list', {}, admin)).body || {}, ids = (L.accounts || []).map(a => a.id + ':' + a.why).sort();
  const want = ['bob-gone--b103026:offboarded', 'lei-abut--b091526:archived', 'lei-abut--b250926:archived', 'rey-jected--b103026:rejected'];
  if (JSON.stringify(ids) !== JSON.stringify(want)) fail(`the inactive accounts listed: ${ids}`);
  const lo = (L.leftovers || []).map(x => x.id);
  if (JSON.stringify(lo) !== JSON.stringify(['old-gone--b090126'])) fail(`the leftovers listed: ${JSON.stringify(L.leftovers)}`);
  else if (!['progress', 'process', 'checkin', 'guide'].every(k => L.leftovers[0].kinds.includes(k))) fail(`the leftover's records: ${L.leftovers[0].kinds}`);
  // never swept, even when asked
  for (const id of [ana.body.id, 'wai-ting--b103026', 'lei-abut--b103026', 'pat-cleared--b080126', 'val-sarti--b110226'])
    if ((await call('/api/batch/sweep', { id }, admin)).status !== 409) fail(`${id} could be swept`);
  // a dry sweep: every record, for the backup
  const dry = (await call('/api/batch/sweep', { id: 'lei-abut--b250926', dry: true }, admin)).body || {};
  const dk = Object.keys(dry.records || {}).sort();
  if (!['checkin:2026-09-30:lei-abut--b250926', 'guide:lei-abut--b250926:lor', 'progress:lei-abut--b250926', 'trainee:lei-abut--b250926'].every(k => dk.includes(k)) || dry.records['progress:lei-abut--b250926'].data.notes !== 'old') fail(`the backup of Lei's old account: ${dk}`);
  if (!has('trainee:lei-abut--b250926')) fail('a dry sweep deleted something');
  // the sweep: all gone, the live account untouched
  for (const id of ['lei-abut--b250926', 'lei-abut--b091526', 'bob-gone--b103026', 'rey-jected--b103026', 'old-gone--b090126']) {
    const r = (await call('/api/batch/sweep', { id }, admin)).body || {}; if (!r.ok) fail(`${id} wasn't swept: ${JSON.stringify(r)}`);
  }
  const left = [...store.keys()].filter(k => /lei-abut--b(250926|091526)|bob-gone|rey-jected|old-gone/.test(k));
  if (left.length) fail(`records left behind: ${left}`);
  if (!has('trainee:lei-abut--b103026') || !has('trainee:' + ana.body.id) || !has('trainee:pat-cleared--b080126') || !has('learn:global') || !has('merged:val-sarti--b110226')) fail('the sweep removed something it must keep');
  // swept accounts stay blocked: the rejected trainee signing in again isn't let in as a new, approved account
  const blocked = (await call('/api/batch/blocked', {}, admin)).body.ids || {};
  if (!blocked['rey-jected--b103026'] || !blocked['lei-abut--b250926'] || !blocked['bob-gone--b103026']) fail(`swept accounts aren't kept blocked: ${Object.keys(blocked)}`);
  const back = await call('/api/auth/trainee', { name: 'Rey Jected', batch: 'B103026' });
  if (back.status !== 403) fail(`a swept, rejected trainee signed in again: ${back.status} ${JSON.stringify(back.body)}`);
  if (((await call('/api/batch/sweep-list', {}, admin)).body.accounts || []).length) fail('the list isn\'t empty after the sweep');

  if (failures.length) { console.error('Sweep test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Sweep test passed (offboarded, rejected, archived and leftover records listed and swept with a backup first; active and waiting trainees, the cleared batch\'s record, a merged redirect and shared records never; swept accounts stay blocked; admins only).');
})().catch(e => { console.error(e); process.exit(1); });
