// 📧 An EOD email matched to its trainee (worker.js receiveEod): by the address on file; else by the sender's name — as
//   registered, with a middle name, or "Last, First"; the sender's address spelling the first and last name; the full name in
//   the sign-off — only when it points to one trainee, the address then kept so the next EOD matches at once; one matching
//   nobody listed in 📧 EOD Inbox (/api/eod/unmatched, with the received log and the last one's time) and given to its trainee
//   there (/api/eod/assign); trainers only.
// Usage: node .github/scripts/eod-match.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', EOD_KEY: 'k',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  globalThis.fetch = async () => new Response('not found', { status: 404 });
  const T = { maria: 'Maria Clara Santos', jose: 'Jose Reyes', ana: 'Ana Cruz', ana2: 'Ana Lim', pia: 'Pia Dela Rosa' };
  for (const [id, name] of Object.entries(T)) store.set('ft:trainee:' + id, JSON.stringify({ id, name, batch: 'B110226', approved: true }));
  const inb = async (from, extra = {}) => (await (await worker.fetch(new Request('http://x/api/eod/inbound', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EOD-Key': 'k' },
    body: JSON.stringify(Object.assign({ from, subject: 'EOD Report 11/09/26', date: '2026-11-09T23:00:00Z', text: 'Accomplishments/Completed Tasks:\n- Mock calls\n' }, extra)) }), env, { waitUntil() {} })).json());
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) }; };
  const eodFrom = (id) => (JSON.parse(store.get('ft:drive:' + id) || '{}')).eodFrom;
  // 1. a middle name dropped, "Last, First", an address spelling the name, the name in the sign-off
  let r = await inb('Maria Santos <msc.work@gmail.com>');
  if (r.id !== 'maria') fail(`the sender's name without the middle name didn't match: ${JSON.stringify(r)}`);
  if (eodFrom('maria') !== 'msc.work@gmail.com') fail('the matched address wasn\'t kept as the trainee\'s');
  r = await inb('<msc.work@gmail.com>', { date: '2026-11-10T23:00:00Z' }); if (r.id !== 'maria') fail('the kept address didn\'t match the next EOD');
  r = await inb('"Reyes, Jose" <jr1990@yahoo.com>'); if (r.id !== 'jose') fail(`"Last, First" didn't match: ${JSON.stringify(r)}`);
  r = await inb('pia.delarosa@gmail.com'); if (r.id !== 'pia') fail(`an address spelling the name didn't match: ${JSON.stringify(r)}`);
  // (two trainees named Ana: the first name alone points to neither; the full name in the sign-off does)
  r = await inb('Ana <ana.work@gmail.com>'); if (r.matched !== false) fail(`a name shared by two trainees was matched: ${JSON.stringify(r)}`);
  r = await inb('Trainee <t.x@gmail.com>', { text: 'Accomplishments/Completed Tasks:\n- Mock calls\n\nThank you,\nAna Lim' }); if (r.id !== 'ana2') fail(`the name in the sign-off didn't match: ${JSON.stringify(r)}`);
  // 2. 📧 EOD Inbox: the unmatched one listed, given to its trainee, its address then theirs; the log and the last one's time
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const u = (await call('/api/eod/unmatched', {}, admin)).body || {};
  const x = (u.items || []).find(i => /ana\.work/.test(i.from));
  if (!x || !u.last || !(u.log || []).some(l => l.id === 'jose') || u.key !== true) fail(`📧 EOD Inbox doesn't list the unmatched EOD, the log and the last one's time: ${JSON.stringify(u).slice(0, 300)}`);
  const a = await call('/api/eod/assign', { at: x && x.at, from: x && x.from, id: 'ana' }, admin);
  if (!a.body || !a.body.ok || a.body.date !== '2026-11-09') fail(`an unmatched EOD couldn't be given to its trainee: ${JSON.stringify(a.body)}`);
  if (!((JSON.parse(store.get('ft:drive:ana') || '{}').days || {})['2026-11-09'] || {}).eod || eodFrom('ana') !== 'ana.work@gmail.com') fail('the given EOD wasn\'t kept as the trainee\'s day, with its address');
  if (((await call('/api/eod/unmatched', {}, admin)).body.items || []).some(i => /ana\.work/.test(i.from))) fail('the given EOD is still listed as unmatched');
  r = await inb('Ana <ana.work@gmail.com>', { date: '2026-11-10T23:00:00Z' }); if (r.id !== 'ana') fail('the next EOD from the given address didn\'t match');
  // 2b. a married or second surname: the sender's first name, when only one active trainee has it ("first name only")
  r = await inb('Jose Rene Canton <jose.canton@legalsupporthelp.com>', { date: '2026-11-11T23:00:00Z' });
  if (r.id !== 'jose') fail(`a first name only one trainee has didn't match: ${JSON.stringify(r)}`);
  // (and one waiting in the inbox from before a trainee was there is taken as the inbox is read)
  r = await inb('Ashanty Linneth Gosden <ashanty.gosden@legalsupporthelp.com>');
  if (r.matched !== false) fail('an EOD matched a trainee who isn\'t registered yet');
  store.set('ft:trainee:ashanty', JSON.stringify({ id: 'ashanty', name: 'Ashanty Campbell', batch: 'B110226', approved: true }));
  { const u2 = (await call('/api/eod/unmatched', {}, admin)).body || {};
    if ((u2.items || []).some(i => /ashanty/.test(i.from))) fail('an unmatched EOD wasn\'t matched again once its trainee was there');
    if (!(u2.log || []).some(l => l.id === 'ashanty' && l.how === 'first name only')) fail(`the re-match isn't logged as first name only: ${JSON.stringify(u2.log).slice(0, 300)}`);
    if (!((JSON.parse(store.get('ft:drive:ashanty') || '{}').days || {})['2026-11-09'] || {}).eod) fail('the re-matched EOD isn\'t kept on its trainee\'s day'); }
  // 3. trainers only
  const trainee = (await call('/api/auth/trainee', { first: 'Jose', last: 'Reyes', batch: 'B110226' })).body;
  if (trainee && trainee.token && (await call('/api/eod/assign', { id: 'jose' }, trainee.token)).status !== 403) fail('a trainee could give out an EOD');
  if (failures.length) { console.error('EOD matching test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('EOD matching test passed (by the address on file; the sender\'s name with or without a middle name or as "Last, First", an address spelling the name, the name in the sign-off, only when it points to one trainee, the address then kept; 📧 EOD Inbox lists the unmatched ones, the log and the last one\'s time, and gives one to its trainee; trainers only).');
})().catch((e) => { console.error('EOD matching test FAILED:', e && e.stack || e); process.exit(1); });
