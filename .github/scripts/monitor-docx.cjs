// 📒 A Training Progress Monitoring Sheet kept as a Word file (.docx) in Google Drive: its link is a docs.google.com/document
// link, but it has no Google Docs export. The Worker (checkDrive) reads the Word file's own text instead and checks it, and
// the link check (verifyLinks) takes a Word file as a Monitoring Sheet. Not "must be a Google Docs or Google Sheets link".
// Usage: node .github/scripts/monitor-docx.cjs   (no browser, no network)
const path = require('path'); const zlib = require('zlib'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
// a minimal .docx: a zip holding word/document.xml (deflated)
function docx(paras) {
  const xml = Buffer.from(`<?xml version="1.0"?><w:document xmlns:w="w"><w:body>${paras.map(p => `<w:p><w:r><w:t>${p.replace(/&/g, '&amp;')}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
  const name = Buffer.from('word/document.xml'), data = zlib.deflateRawSync(xml);
  const crc = (() => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xFFFFFFFF; for (const b of xml) c = t[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; })();
  const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(8, 8); loc.writeUInt32LE(crc, 14); loc.writeUInt32LE(data.length, 18); loc.writeUInt32LE(xml.length, 22); loc.writeUInt16LE(name.length, 26);
  const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(8, 10); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(xml.length, 24); cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(0, 42);
  const body = Buffer.concat([loc, name, data]), dir = Buffer.concat([cen, name]);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(body.length, 16);
  return Buffer.concat([body, dir, end]);
}
(async () => {
  try {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const TR = globalThis.FTTrackerRules;
    const store = new Map(), id = 'mia-word--b9';
    const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
      LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
        list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
    store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Mia Word', batch: 'B9', approved: true }));
    const FILE = '1MonitorWordFileForTheCiTest01';
    const word = docx(['Virtual Assistant Essentials - Day 1', 'Date: 10/01/2026', '5 Major Takeaways From This Discussion',
      '1. A Legal VA supports the attorney with case tasks.', '2. Every call is logged in the CMS the same day.', '3. Deadlines are kept on the firm calendar.',
      '4. Client information stays confidential.', '5. Questions go to the trainer before guessing.', '3 Questions', '1. How are tasks assigned?', '2. Who checks the notes?', '3. When is the EOD due?']);
    globalThis.fetch = async (url) => {
      const u = String(url);
      // (a Word file in Drive: Google Docs has no export for it, its download is the .docx)
      if (u.includes(`/document/d/${FILE}/export`)) return new Response('<!doctype html><html>Sorry, unable to open the file</html>', { status: 200 });
      if (u.startsWith(`https://drive.google.com/uc?export=download&id=${FILE}`)) return new Response(word, { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' } });
      return new Response('', { status: 404 });
    };
    const call = async (p, body, token) => {
      const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
      return { status: res.status, body: await res.json().catch(() => null) };
    };
    const trainee = (await call('/api/auth/trainee', { name: 'Mia Word', batch: 'B9' })).body.token;
    await call('/api/storage/set', { key: 'drive:' + id, value: JSON.stringify({ days: {}, monitor: `https://docs.google.com/document/d/${FILE}/edit?usp=sharing` }) }, trainee);
    const r = await call('/api/drive/check', {}, trainee);
    const m = r.body && r.body.review && r.body.review.monitor;
    if (!m) fail(`no Monitoring Sheet check: ${JSON.stringify(r.body).slice(0, 300)}`);
    else {
      if (m.error) fail(`the Word Monitoring Sheet wasn't read: ${m.error}`);
      if (!(m.found >= 1)) fail(`the Word Monitoring Sheet's entries weren't found: ${JSON.stringify(m).slice(0, 300)}`);
    }
    // the link check takes a Word file as a Monitoring Sheet (worker.js verifyLinks, the Drive file's mimeType)
    const src = require('fs').readFileSync(path.join(process.cwd(), 'worker.js'), 'utf8');
    if (!/k === "monitor" && [^\n]*j\.mimeType !== WORD_MIME/.test(src)) fail('the link check still refuses a Word Monitoring Sheet');
    if (!TR) fail('no tracker rules');
  } catch (e) { fail(e.stack || String(e)); }
  if (failures.length) { console.error('Word Monitoring Sheet test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Word Monitoring Sheet test passed (a .docx kept in Drive under a Google Docs link read from the file itself and checked; the link check takes a Word file).');
})();
