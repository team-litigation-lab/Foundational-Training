// 📦 Day 8's Intake Packet, checked for accuracy and completeness (worker.js checkIntakePacket, /api/intake/check; the rules are
// js/ft-tracker-rules.js TR.checkPacket): the trainee's corrected packet (its name, its date) and the client subfolder (its name,
// the extracted documents in it) read from Drive's public pages, the documents in the packet read by the AI from the PDF itself;
//   - a document of the packet not extracted is missing, an extracted one that isn't in the packet is wrongly identified, one not
//     named "INTAKE - Document (VA's Name)" is to rename, a subfolder not named after the client is flagged;
//   - all of it right: 100%;
//   - kept in intakecheck:<id>, which the trainee reads but can't write; a trainee checks at most every 3 minutes, a trainer anyone.
// Usage: node .github/scripts/intake-packet.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const TR = globalThis.FTTrackerRules;
  const store = new Map(), id = 'rosa-packet--b9';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', ANTHROPIC_API_KEY: 'ci-claude',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Rosa Packet', batch: 'B9', approved: true }));
  // the packet, the subfolder (Drive's public pages) and the AI
  let FILES = [], FOLDER = 'Kurt Cobain', PDF_BIG = false, PDF_DOCS = ['Police Report', '1P Drivers License', 'HIPAA', 'Signed Contingency Fee Agreement'];
  const seen = { pdf: 0, fb: '' };
  const entry = (fid, name) => `<div class="flip-entry" id="entry-${fid}"><a href="https://drive.google.com/file/d/${fid}/view"><div class="flip-entry-title">${name}</div><div class="flip-entry-last-modified"><div>Nov 5</div></div></a></div>`;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://drive.google.com/file/d/1PacketFileForTheCiTest01/view')) return new Response('<html><head><meta property="og:title" content="INTAKE - Packet (Rosa).pdf"><title>INTAKE - Packet (Rosa).pdf - Google Drive</title></head></html>');
    if (u.startsWith('https://drive.google.com/uc?export=download&id=1PacketFileForTheCiTest01')) return new Response(new TextEncoder().encode('%PDF-1.7 the packet'), { headers: Object.assign({ 'content-type': 'application/pdf' }, PDF_BIG ? { 'content-length': String(300e6) } : {}) });
    if (u.startsWith('https://drive.google.com/embeddedfolderview?id=ClientSubfolder01')) return new Response(`<html><head><title>${FOLDER}</title></head><body>${FILES.map((n, i) => entry('f' + i, n)).join('')}</body></html>`);
    if (u === 'https://api.anthropic.com/v1/messages') {
      const b = JSON.parse(init.body), c = b.messages[0].content;
      if (Array.isArray(c) && c.some(x => x.type === 'document')) { seen.pdf++; if (c[0].source.media_type !== 'application/pdf') fail('the packet wasn\'t sent as a PDF');
        return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ docs: PDF_DOCS, pages: 'p1 police report…' }) }], stop_reason: 'end_turn' })); }
      seen.fb = typeof c === 'string' ? c : JSON.stringify(c);
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Good, with Improvements Needed. FEEDBACK-OK' }], stop_reason: 'end_turn', model: b.model }));
    }
    return new Response('', { status: 404 });
  };
  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  try {
    const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const trainee = (await call('/api/auth/trainee', { name: 'Rosa Packet', batch: 'B9' })).body.token;
    // (the client: kept on the assignment by the trainer's page, from the packet's mock call case)
    store.set('ft:intakeassign:' + id, JSON.stringify({ packet: 3, at: '2026-11-04T15:00:00Z', client: 'Kurt Cobain' }));
    // nothing linked yet
    const none = await call('/api/intake/check', {}, trainee);
    if (none.status !== 400 || none.body.code !== 'no-link') fail(`a check with no packet linked: ${JSON.stringify(none)}`);
    // the trainee links their corrected packet and the client subfolder (drive:<id> is theirs to write)
    await call('/api/storage/set', { key: 'drive:' + id, value: JSON.stringify({ days: {}, intakePacket: 'https://drive.google.com/file/d/1PacketFileForTheCiTest01/view?usp=sharing', intakeFolder: 'https://drive.google.com/drive/folders/ClientSubfolder01' }) }, trainee);
    // one document missing, one misidentified (not in the packet), one misnamed
    FILES = ['INTAKE - Packet (Rosa).pdf', 'INTAKE - Police Report (rosa).pdf', 'INTAKE - DL (rosa).pdf', 'hipaa.pdf', 'INTAKE - DMV (rosa).pdf'];
    // (a client sent by the trainee is ignored: theirs to name, not to choose)
    const r1 = await call('/api/intake/check', { client: 'Anything Else' }, trainee);
    const c1 = r1.body && r1.body.check;
    if (!c1) fail(`the check didn't run: ${JSON.stringify(r1)}`);
    else {
      const rule = k => c1.rules.find(r => r.id === k) || {};
      if (!seen.pdf || !c1.docsRead) fail('the AI didn\'t read the packet\'s own pages');
      if (!rule('link').pass || !rule('rename').pass || !rule('folder').pass || !rule('packet-in').pass) fail(`the packet, its name or the subfolder: ${JSON.stringify(c1.rules)}`);
      if (rule('complete').pass || !/Signed Contingency Fee Agreement/.test(rule('complete').detail)) fail(`a missing document isn't flagged: ${JSON.stringify(rule('complete'))}`);
      if (rule('identified').pass || !/DMV/.test(rule('identified').detail)) fail(`a misidentified document isn't flagged: ${JSON.stringify(rule('identified'))}`);
      if (rule('naming').pass || !/hipaa\.pdf/.test(rule('naming').detail)) fail(`a misnamed document isn't flagged: ${JSON.stringify(rule('naming'))}`);
      if (!(c1.pct < 100) || !/FEEDBACK-OK/.test(c1.feedback) || !/NOT MET/.test(seen.fb)) fail(`the score or the feedback: ${c1.pct} ${c1.feedback}`);
    }
    // the trainee reads it, can't write it, and waits 3 minutes to check again
    const rd = await call('/api/storage/get', { key: 'intakecheck:' + id }, trainee);
    if (rd.status !== 200 || !JSON.parse(rd.body.value || 'null')) fail('the trainee can\'t read their check');
    if ((await call('/api/storage/set', { key: 'intakecheck:' + id, value: '{"pct":100}' }, trainee)).status !== 403) fail('a trainee could write their own check');
    if ((await call('/api/intake/check', {}, trainee)).status !== 429) fail('a trainee could check again at once');
    // all of it right, checked by the trainer: 100% (and the trainee's 3 minutes still run: a trainer's check doesn't reset them)
    FILES = ['INTAKE - Packet (Rosa).pdf', 'INTAKE - Police Report (Rosa).pdf', 'INTAKE - 1P DL (Rosa).pdf', 'INTAKE - HIPAA (Rosa).pdf', 'INTAKE - Signed Contingency Fee Agreement (Rosa).pdf'];
    const r2 = await call('/api/intake/check', { id, client: 'Kurt Cobain' }, admin);
    if (!r2.body || !r2.body.check || r2.body.check.pct !== 100) fail(`a correct packet isn't 100%: ${JSON.stringify(r2.body && r2.body.check && r2.body.check.rules.filter(r => !r.pass))}`);
    if ((await call('/api/intake/check', {}, trainee)).status !== 429) fail('a trainer\'s check reset the trainee\'s 3 minutes');
    // a packet too large to read (300 MB): never downloaded whole, its points pending, not passed
    PDF_BIG = true; const pdfBefore = seen.pdf;
    const rb = await call('/api/intake/check', { id }, admin), cb = rb.body && rb.body.check;
    if (!cb || seen.pdf !== pdfBefore || cb.docsRead || !cb.pending || cb.pass || (cb.rules.find(r => r.id === 'complete') || {}).pass !== null) fail(`a packet too large to read: ${JSON.stringify(cb && cb.rules)}`);
    PDF_BIG = false;
    // a subfolder not named after the client
    FOLDER = 'Week 2';
    const r3 = await call('/api/intake/check', { id, client: 'Kurt Cobain' }, admin);
    const f3 = r3.body && r3.body.check && r3.body.check.rules.find(r => r.id === 'folder');
    if (!f3 || f3.pass || !/Kurt Cobain/.test(f3.detail)) fail(`a subfolder not named after the client isn't flagged: ${JSON.stringify(f3)}`);
    // the rules alone: the packet not renamed, uploaded before it was assigned, the worksheet inside the subfolder
    const t = TR.checkPacket({ file: { ok: true, name: 'Packet 3.pdf', modified: '2026-11-01T00:00:00Z' }, assignedAt: '2026-11-04T15:00:00Z', va: 'Rosa Packet', client: 'Kurt Cobain',
      folder: { ok: true, name: 'Kurt Cobain', files: [{ name: 'Packet 3.pdf' }, { name: 'Intake Worksheet (Rosa)' }] }, docs: null });
    const tr = k => t.rules.find(r => r.id === k) || {};
    if (tr('rename').pass || !/INTAKE - Packet \(Rosa Packet\)/.test(tr('rename').detail)) fail(`a packet not renamed: ${JSON.stringify(tr('rename'))}`);
    if (tr('corrected').pass) fail('a packet older than the assignment passes as the corrected copy');
    if (tr('worksheet').pass) fail('the worksheet inside the client subfolder isn\'t flagged');
    if (tr('complete').pass) fail('a subfolder with no extracted document passes as complete');
    // the matching: a front isn't a back, a waiver isn't the notice, one file stands for one document, curly apostrophes and plurals
    const m = (docs, files) => TR.checkPacket({ file: { ok: true, name: 'INTAKE - Packet (Lory)' }, va: 'Lory', client: 'A B', folder: { ok: true, name: 'A B', files: [{ name: 'INTAKE - Packet (Lory)' }, ...files.map(name => ({ name }))] }, docs });
    if (m(['Front Passport Card', 'Back Passport Card'], ['INTAKE - Front Passport Card (Lory).pdf']).missing.join() !== 'Back Passport Card') fail('a front passport card counted as the back');
    if (m(['Conflict of Interest Waiver', 'Notice and Waiver of Potential Conflict of Interest'], ['INTAKE - Conflict of Interest Waiver (Lory)']).missing.length !== 1) fail('one file counted for two documents');
    if (m(['Clients Need List', 'Attorney’s Lien', '1P Drivers License'], ['INTAKE - Client Need List (Lory)', "INTAKE - Attorney's Lien (Lory)", 'INTAKE - 1P DL Complete Name of the Owner (Lory)']).pct !== 100) fail('a plural, a curly apostrophe or the DL\'s owner name broke the match');
  } catch (e) { fail(e.stack || String(e)); }
  if (failures.length) { console.error('Intake Packet check test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Intake Packet check test passed (the corrected packet and its client subfolder read from Drive, the packet\'s documents read by the AI from the PDF; missing, misidentified and misnamed documents, the subfolder\'s name and the packet\'s rename flagged; 100% when all is right; the trainee reads the check but can\'t write it, and waits 3 minutes).');
})();
