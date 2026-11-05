// 🔎 The six Drive links are the trainee's OWN (worker.js verifyLinks → ownCheck), following the naming rules of 📁 My Drive
//   links (NAMING: "LSH Daily Task Tracker | BatchID Your Name", …): with Google Drive answered here, a link that opens and
//   is the right kind is still ✗, with why and the name it should have, when it is the blank template, another batch's,
//   another trainee's (by name, or by a plain-named folder's parent), without their name or Batch ID, the same file as
//   another of their links, or a file another trainee already linked; their own six are ✓; a ✓ from before these checks
//   is checked again; the links that turned ✗ are named in verifyAlert for the trainee's 🔔.
// Usage: node .github/scripts/drive-own.cjs   (no browser, no network)
const path = require('path'); const crypto = require('crypto'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map();
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', GDRIVE_SA_EMAIL: 'ci@lsh.iam.gserviceaccount.com',
    GDRIVE_SA_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const FOLDER = 'application/vnd.google-apps.folder', DOC = 'application/vnd.google-apps.document', SHEET = 'application/vnd.google-apps.spreadsheet';
  // Drive, as Google answers it: id → {name, mimeType, parents}
  const F = {
    annParent00001: { name: 'LSH Trainee folder – B103026 Ana Cruz', mimeType: FOLDER },
    benParent00001: { name: 'LSH Trainee folder – B103026 Ben Diaz', mimeType: FOLDER },
    annMonitor0001: { name: 'LSH VA Training Monitoring Sheet__Ana Cruz', mimeType: DOC },
    annTam00000001: { name: 'LSH Task Assessment Manual (TAM) | B103026 Ana Cruz', mimeType: DOC },
    annTyping00001: { name: 'Typing Tests', mimeType: FOLDER, parents: ['annParent00001'] },
    annSpelling001: { name: 'Spelling Tests', mimeType: FOLDER, parents: ['annParent00001'] },
    annFolder00001: { name: 'Assessments/Activities', mimeType: FOLDER, parents: ['annParent00001'] },
    annTracker0001: { name: 'LSH Daily Task Tracker | B103026 Ana Cruz', mimeType: SHEET },
    template000001: { name: 'LSH VA Training Monitoring Sheet__VA Name', mimeType: DOC },
    benTracker0001: { name: 'LSH Daily Task Tracker | B103026 Ben Diaz', mimeType: SHEET },
    oldTam00000001: { name: 'LSH Task Assessment Manual (TAM) | B090126 Ana Cruz', mimeType: DOC },
    benTyping00001: { name: 'Typing Tests', mimeType: FOLDER, parents: ['benParent00001'] },
    noname0000001: { name: 'LSH VA Training Monitoring Sheet', mimeType: DOC },
    nobatch000001: { name: 'LSH Daily Task Tracker | Ana Cruz', mimeType: SHEET },
    benFolder00001: { name: 'Assessments/Activities', mimeType: FOLDER },   // (no parent the system can read)
  };
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u === 'https://oauth2.googleapis.com/token') return new Response(JSON.stringify({ access_token: 'tok' }));
    const m = u.match(/drive\/v3\/files\/([A-Za-z0-9_-]+)\?fields=([^&]+)/);
    if (m) { const f = F[m[1]]; if (!f) return new Response('{"error":{"code":404}}', { status: 404 }); return new Response(JSON.stringify(Object.assign({ id: m[1] }, f))); }
    return new Response('not found', { status: 404 });
  };
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil() { } });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const ann = 'ana-cruz--b103026', ben = 'ben-diaz--b103026';
  store.set('ft:trainee:' + ann, JSON.stringify({ id: ann, name: 'Ana Cruz', batch: 'B103026', approved: true }));
  store.set('ft:trainee:' + ben, JSON.stringify({ id: ben, name: 'Ben Diaz', batch: 'B103026', approved: true }));
  const link = { doc: id => `https://docs.google.com/document/d/${id}/edit`, sheet: id => `https://docs.google.com/spreadsheets/d/${id}/edit`, folder: id => `https://drive.google.com/drive/folders/${id}` };
  const six = (o = {}) => Object.assign({ monitor: link.doc('annMonitor0001'), tam: link.doc('annTam00000001'), typing: link.folder('annTyping00001'),
    spelling: link.folder('annSpelling001'), folder: link.folder('annFolder00001'), tracker: link.sheet('annTracker0001') }, o);
  const verify = async (who, links) => {
    store.set('ft:drive:' + who, JSON.stringify(Object.assign({ days: {} }, links)));
    const r = await call('/api/drive/verify', { id: who }, admin); return (r.body || {}).verify || {};
  };

  // Ben links his own folder first (a plain-named folder whose parent can't be read: it passes, and it is his)
  const vb = await verify(ben, { folder: link.folder('benFolder00001'), tracker: link.sheet('benTracker0001') });
  if (!vb.folder || !vb.folder.ok || !vb.tracker.ok) fail(`Ben's own links aren't ✓: ${JSON.stringify(vb)}`);
  // Ana's own six: ✓, each marked as hers
  let v = await verify(ann, six());
  const okAll = Object.keys(six()).filter(k => !(v[k] && v[k].ok && v[k].mine));
  if (okAll.length) fail(`Ana's own six aren't all ✓ as hers: ${okAll.map(k => k + ': ' + (v[k] || {}).error).join(' | ')}`);
  // every wrong one, ✗ with why and the name it should have
  store.delete('ft:trackerreview:' + ann);
  v = await verify(ann, six({ monitor: link.doc('template000001'), tracker: link.sheet('benTracker0001'), tam: link.doc('oldTam00000001'),
    typing: link.folder('benTyping00001'), spelling: link.folder('annTyping00001'), folder: link.folder('benFolder00001') }));
  const want = {
    monitor: /blank template[\s\S]*“LSH VA Training Monitoring Sheet__Ana Cruz”/,
    tracker: /Ben Diaz's LSH Daily Task Tracker, not yours[\s\S]*“LSH Daily Task Tracker \| B103026 Ana Cruz”/,
    tam: /batch B090126's[\s\S]*your batch is B103026[\s\S]*“LSH Task Assessment Manual \(TAM\) \| B103026 Ana Cruz”/,
    typing: /Ben Diaz's Typing Tests folder, not yours/,
    folder: /Ben Diaz has already linked this folder as theirs/ };
  Object.entries(want).forEach(([k, re]) => { if (!v[k] || v[k].ok !== false || !re.test(v[k].error || '')) fail(`${k}: not ✗ with the right why: ${JSON.stringify(v[k])}`); });
  // (a Spelling Tests link to her Typing Tests folder: the name rule catches it first)
  if (!v.spelling || v.spelling.ok !== false) fail(`spelling linked to the Typing Tests folder isn't ✗: ${JSON.stringify(v.spelling)}`);
  // 🔔 the links that turned ✗ are named for the trainee
  const alert = JSON.parse(store.get('ft:trackerreview:' + ann)).verifyAlert || {};
  if (!['monitor', 'tracker', 'tam', 'typing', 'folder'].every(k => (alert.keys || []).includes(k))) fail(`verifyAlert doesn't name the links that turned ✗: ${JSON.stringify(alert)}`);
  // the same file twice; no name; no Batch ID where the rule has one
  F.dupDoc00000001 = { name: 'LSH VA Training Monitoring Sheet__Ana Cruz', mimeType: DOC };
  v = await verify(ann, six({ monitor: link.doc('annMonitor0001'), tam: link.doc('annMonitor0001'), tracker: link.sheet('nobatch000001') }));
  if (!v.tam || v.tam.ok !== false) fail(`the Monitoring Sheet linked as the TAM isn't ✗: ${JSON.stringify(v.tam)}`);
  if (!v.tracker || v.tracker.ok !== false || !/naming rule: it needs your Batch ID[\s\S]*“LSH Daily Task Tracker \| B103026 Ana Cruz”/.test(v.tracker.error)) fail(`a tracker without the Batch ID isn't ✗ by the naming rule: ${JSON.stringify(v.tracker)}`);
  F.annTam00000002 = { name: 'LSH VA Training Monitoring Sheet__Ana Cruz', mimeType: DOC };
  v = await verify(ann, six({ monitor: link.doc('annMonitor0001'), tam: link.doc('annTam00000001'), typing: link.folder('annTyping00001'), spelling: link.folder('annTyping00001') }));
  v = await verify(ann, six({ monitor: link.doc('noname0000001') }));
  if (!v.monitor || v.monitor.ok !== false || !/doesn't have your name/.test(v.monitor.error)) fail(`a Monitoring Sheet without her name isn't ✗: ${JSON.stringify(v.monitor)}`);
  // the same file in two of her links (her own Typing Tests folder linked as Spelling Tests too: named Typing, so ✗ either way)
  F.annShared0001 = { name: 'LSH Trainee folder – B103026 Ana Cruz Typing Tests and Spelling Tests', mimeType: FOLDER };
  v = await verify(ann, six({ typing: link.folder('annShared0001'), spelling: link.folder('annShared0001') }));
  if (!v.spelling || v.spelling.ok !== false || !/same link as your Typing Tests folder/.test(v.spelling.error)) fail(`the same folder linked twice isn't ✗: ${JSON.stringify(v.spelling)}`);
  // the review's cases: an underscore after the Batch ID (as the TAM is named) is ✓
  F.annTamUnder001 = { name: 'LSH Task Assessment Manual (TAM) | B103026_ Ana Cruz', mimeType: DOC };
  v = await verify(ann, six({ tam: link.doc('annTamUnder001') }));
  if (!v.tam || !v.tam.ok) fail(`a TAM named "| B103026_ Ana Cruz" isn't ✓: ${JSON.stringify(v.tam)}`);
  // a batch-mate whose name has hers in it (Ana Cruz Lopez): each one's file is told apart, both ways
  const acl = 'ana-cruz-lopez--b103026';
  store.set('ft:trainee:' + acl, JSON.stringify({ id: acl, name: 'Ana Cruz Lopez', batch: 'B103026', approved: true }));
  F.aclTracker0001 = { name: 'LSH Daily Task Tracker | B103026 Ana Cruz Lopez', mimeType: SHEET };
  v = await verify(ann, six({ tracker: link.sheet('aclTracker0001') }));
  if (!v.tracker || v.tracker.ok !== false || !/Ana Cruz Lopez's/.test(v.tracker.error)) fail(`Ana Cruz took Ana Cruz Lopez's tracker as hers: ${JSON.stringify(v.tracker)}`);
  let va = await verify(acl, { tracker: link.sheet('annTracker0001') });
  if (!va.tracker || va.tracker.ok !== false || !/Ana Cruz's/.test(va.tracker.error)) fail(`Ana Cruz Lopez took Ana Cruz's tracker as hers: ${JSON.stringify(va.tracker)}`);
  va = await verify(acl, { tracker: link.sheet('aclTracker0001') });
  if (!va.tracker || !va.tracker.ok) fail(`Ana Cruz Lopez's own tracker isn't ✓: ${JSON.stringify(va.tracker)}`);
  // a two-letter name (Bo Li): their own file is ✓
  const bo = 'bo-li--b103026';
  store.set('ft:trainee:' + bo, JSON.stringify({ id: bo, name: 'Bo Li', batch: 'B103026', approved: true }));
  F.boTracker00001 = { name: 'LSH Daily Task Tracker | B103026 Bo Li', mimeType: SHEET };
  const vbo = await verify(bo, { tracker: link.sheet('boTracker00001') });
  if (!vbo.tracker || !vbo.tracker.ok) fail(`a two-letter name's own tracker isn't ✓: ${JSON.stringify(vbo.tracker)}`);
  // moved by a trainer from batch B090126: her files named with the old batch are still hers
  store.set('ft:trainee:' + ann, JSON.stringify({ id: ann, name: 'Ana Cruz', batch: 'B103026', batchFrom: 'B090126', batchMovedBy: 'trainer', approved: true }));
  v = await verify(ann, six({ tam: link.doc('oldTam00000001') }));
  if (!v.tam || !v.tam.ok) fail(`a trainee moved from B090126 has her old-batch TAM ✗: ${JSON.stringify(v.tam)}`);
  store.set('ft:trainee:' + ann, JSON.stringify({ id: ann, name: 'Ana Cruz', batch: 'B103026', approved: true }));
  // a ✓ from before these checks (no v) is checked again
  const rv = JSON.parse(store.get('ft:trackerreview:' + ann));
  rv.verify.monitor = { ok: true, url: link.doc('template000001'), at: 'x' };
  store.set('ft:trackerreview:' + ann, JSON.stringify(rv));
  v = await verify(ann, six({ monitor: link.doc('template000001') }));
  if (!v.monitor || v.monitor.ok !== false) fail(`an old ✓ wasn't checked again with the new rules: ${JSON.stringify(v.monitor)}`);

  if (failures.length) { console.error('Drive links are theirs test FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
  console.log('Drive links are theirs test passed (their own six ✓; the template, another batch, another trainee by name or by a folder\'s parent, no name, no Batch ID, the same file twice and a file another trainee linked are ✗ with why and the name it should have; an old ✓ checked again; the trainee\'s alert).');
})().catch(e => { console.error(e); process.exit(1); });
