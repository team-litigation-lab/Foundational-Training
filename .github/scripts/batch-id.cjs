// Batch IDs are B + the date the batch started, as MMDDYY (B100926 for 9 October 2026) — the same rule on
// every LSH platform (canonicalBatch in the CMS's functions/_utils.js). This checks the page's copy and the
// Worker's copy agree and behave:
//   1. whatever is typed — any capitals, spaces or dashes, the B left off, a four-digit year, or the older
//      long forms B09102026 and B09102026-LSHTRAINEE-001 — reads as that one form;
//   2. a Batch ID given out before as B + DDMMYY reads the same as before;
//   3. something that isn't a real date isn't a Batch ID;
//   4. a trainee's record id is the same however the Batch ID was typed;
//   5. signing in: a new registration needs a real Batch ID, and a trainee whose records are already here
//      keeps signing in with the one they registered under, even an older code that isn't a date.
// Usage: node .github/scripts/batch-id.cjs   (no server, no browser needed)
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const failures = [];
const fail = (m) => failures.push(m);
const ROOT = process.cwd();

// the page's copy, lifted out of index.html
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const block = html.slice(html.indexOf('const batchRealDay'), html.indexOf('const BATCH_HINT'));
if (!block || block.length < 200) { console.log('Could not find the Batch ID rule in index.html'); process.exit(1); }
const pageScope = {};
new Function('window', block + '\nwindow.canonicalBatch = canonicalBatch; window.cleanBatch = cleanBatch;')(pageScope);
const pageCanonical = pageScope.canonicalBatch, pageClean = pageScope.cleanBatch;

(async () => {
    // the Worker's copy
    const worker = await import(pathToFileURL(path.join(ROOT, 'worker.js')).href);
    const src = fs.readFileSync(path.join(ROOT, 'worker.js'), 'utf8');
    const wBlock = src.slice(src.indexOf('function slugPart'), src.indexOf('/* ---------- what a trainee may touch'));
    const wScope = {};
    new Function('out', wBlock + '\nout.canonicalBatch = canonicalBatch; out.candidateIds = candidateIds; out.batchKey = batchKey;')(wScope);
    const { canonicalBatch: wCanonical, candidateIds, batchKey } = wScope;

    // 1 + 2: what reads as what
    const same = {
        'B100926': 'B100926', 'b100926': 'B100926', 'B 10-09-26': 'B100926', '100926': 'B100926',
        'B10092026': 'B100926', 'B10092026-LSHTRAINEE-001': 'B100926', 'b-10-09-2026': 'B100926',
        'B300926': 'B300926',                       // given out before as DDMMYY: reads the same as before
        'B09102026-LSHADMIN-003': 'B091026'
    };
    for (const [typed, want] of Object.entries(same)) {
        if (pageCanonical(typed) !== want) fail(`the page reads "${typed}" as ${JSON.stringify(pageCanonical(typed))}, expected ${want}`);
        if (wCanonical(typed) !== want) fail(`the Worker reads "${typed}" as ${JSON.stringify(wCanonical(typed))}, expected ${want}`);
    }
    // 3: not a Batch ID
    // (B130926 isn't in this list: read the other way round, as DDMMYY, 13 September 2026 is a real date)
    for (const bad of ['B1', 'CIFS', 'B993026', 'B000026', 'B123', 'batch one', '']) {
        if (pageCanonical(bad)) fail(`the page took "${bad}" as the Batch ID ${pageCanonical(bad)}`);
        if (wCanonical(bad)) fail(`the Worker took "${bad}" as the Batch ID ${wCanonical(bad)}`);
    }
    // the page keeps an older code as typed, so a trainee registered under one still matches their records
    if (pageClean('B1') !== 'B1') fail(`an older code should be kept as typed: cleanBatch("B1") is ${JSON.stringify(pageClean('B1'))}`);
    if (pageClean('B 10-09-26') !== 'B100926') fail(`cleanBatch should give the one form: ${pageClean('B 10-09-26')}`);
    if (pageClean('   ') !== '') fail('a blank Batch ID should be ""');

    // 4: the same record whatever was typed
    const ids = ['B100926', 'b 10-09-26', 'B10092026'].map(b => candidateIds('Ana Cruz', b).newId);
    if (new Set(ids).size !== 1) fail(`the same batch typed differently gives different records: ${ids.join(', ')}`);
    if (ids[0] !== 'ana-cruz--b100926') fail(`the record id should use the Batch ID in its one form: ${ids[0]}`);
    // a record made before this rule is still found: its id came from the batch exactly as typed
    const c = candidateIds('Ana Cruz', 'B 10-09-26');
    if (c.rawId !== 'ana-cruz--b-10-09-26') fail(`the older record id should be kept as a candidate: ${c.rawId}`);
    if (candidateIds('Ana Cruz', 'B1').newId !== 'ana-cruz--b1') fail('an older code should still key its own record');
    if (batchKey('b 10-09-26') !== batchKey('B100926')) fail('the same batch typed differently should compare equal');
    if (batchKey('B1') !== batchKey('b1')) fail('an older code should compare ignoring capitals');

    // 5: signing in through the Worker
    const store = new Map([['ft:trainee:old-hand--b1', JSON.stringify({ id: 'old-hand--b1', name: 'Old Hand', batch: 'B1', approved: true })]]);
    const env = {
        MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) }
    };
    const signIn = async (name, batch) => {
        const res = await worker.default.fetch(new Request('http://x/api/auth/trainee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, batch }) }), env, { waitUntil() { } });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const good = await signIn('New Starter', 'b 10-09-26');
    if (good.status !== 200) fail(`a real Batch ID should register: ${JSON.stringify(good)}`);
    else if (good.body.id !== 'new-starter--b100926') fail(`a new registration should be keyed by the one form: ${good.body.id}`);
    const bad = await signIn('New Starter', 'B1');
    if (bad.status !== 400 || !bad.body || bad.body.error !== 'batch-format') fail(`a new registration with an older code should be refused: ${JSON.stringify(bad)}`);
    const back = await signIn('Old Hand', 'B1');
    if (back.status !== 200 || !back.body.existing) fail(`a trainee already registered under an older code should keep signing in: ${JSON.stringify(back)}`);
    else if (back.body.id !== 'old-hand--b1') fail(`they should get their own record back: ${back.body.id}`);

    if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Batch IDs are B + MMDDYY everywhere: the page and the Worker read them the same way, older codes keep working, and a new registration needs a real one.');
})().catch(e => { console.error(e); process.exit(1); });
