// 📄 Day 2's assessments graded on the platform (assessments-api.js, worker.js /api/assess/*), with Gemini answered here:
//   - the form a trainee's page gets carries the questions, never the answer keys, and the keys' file is never served;
//   - Part I matching is scored by its letter, exactly; the rest by the AI, and a blank never scores whatever it says;
//   - the result is written into assessgrade:<id>, which the trainee reads but can't write; an admin can't take it;
//   - a second grading straight after the first waits.
// Usage: node .github/scripts/assess.cjs   (no browser, no network)
const path = require('path'); const fs = require('fs'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const store = new Map(), id = 'ana-assess--b9';
    const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', GEMINI_API_KEY5: 'K5',
        LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
    store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Ana Assess', batch: 'B9', approved: true }));
    let prompts = [];
    globalThis.fetch = async (url, init = {}) => {
        if (!/generativelanguage\.googleapis\.com/.test(String(url))) return new Response('not found', { status: 404 });
        const prompt = JSON.parse(init.body).contents[0].parts[0].text; prompts.push(prompt);
        // the model gives every item full marks, the blank one included
        const items = [...prompt.matchAll(/^\[([a-z]\d+)\] \((\d) point/gm)].map(m => ({ k: m[1], score: Number(m[2]), feedback: 'Accurate.' }));
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items, summary: 'Good.' }) }] }, finishReason: 'STOP' }] }), { status: 200 });
    };
    const call = async (p, body, token) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
    const trainee = (await call('/api/auth/trainee', { name: 'Ana Assess', batch: 'B9' })).body.token;
    const CT = '14sz5f3HTQKmryc7Upvlc6qua008rPnmw', AL = '11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C';

    // the keys stay on the server
    if (!/^assessments-api\.js$/m.test(fs.readFileSync('.assetsignore', 'utf8'))) fail('assessments-api.js (the answer keys) would be served as a static file');
    const form = await call('/api/assess/form', { id: AL }, trainee);
    const items = ((form.body || {}).parts || []).flatMap(p => p.items);
    if (items.length !== 21) fail(`the Auto Liability form should have 15 + 6 items: ${items.length}`);
    if (/"key"|Rental car reimbursement|25\/50\/20|Mr\. Sam Martin/.test(JSON.stringify(form.body))) fail('the form carries an answer key');
    const ct = await call('/api/assess/form', { id: CT }, trainee);
    if (/Jordan and his girlfriend|June 16, 2024|"key"/.test(JSON.stringify(ct.body)) || ((ct.body || {}).parts || [])[0].options.length !== 20) fail(`the Common Terms form: ${JSON.stringify(ct.body).slice(0, 200)}`);

    // Common Terms: 18 of 20 letters right, Q3 (PI = M) wrong and Q20 blank; Part II all answered but one
    const ans = { m1: 'I', m2: 'a', m3: 'B', m4: 'S', m5: 'P', m6: 'B', m7: 'G', m8: 'C', m9: 'Q', m10: 'D', m11: 'L', m12: 'H', m13: 'O', m14: 'J', m15: 'E', m16: 'K', m17: 'T', m18: 'N', m19: 'F',
        s1: 'Sam Martin', s2: 'Jordan and his girlfriend', s3: 'Jordan', s4: 'Yes, the girlfriend', s5: 'June 16, 2021', s6: 'June 16, 2023', s7: '' };
    const g = await call('/api/assess/grade', { id: CT, answers: ans }, trainee);
    const r = (g.body || {}).result || {};
    if (!r.items || r.items.m2.score !== 1 || r.items.m3.score !== 0 || r.items.m20.score !== 0) fail(`matching isn't scored by its letter: ${JSON.stringify(r.items && [r.items.m2, r.items.m3, r.items.m20])}`);
    if (!r.items || r.items.s7.score !== 0 || r.items.s1.score !== 1) fail(`a blank short answer scored, or an answered one didn't: ${JSON.stringify(r.items && [r.items.s1, r.items.s7])}`);
    if (r.score !== 24 || r.total !== 27 || r.pct !== 89) fail(`the total: ${r.score}/${r.total} ${r.pct}%`);
    if (!/NOT EXHAUSTIVE/.test(prompts[0] || '') || !/June 16, 2024/.test(prompts[0] || '') || /\[m\d+\]/.test(prompts[0] || '')) fail('the grader prompt should carry the key and the alternatives rule, and leave the matching out');
    const saved = JSON.parse(store.get('ft:assessgrade:' + id) || 'null');
    if (!saved || !saved[CT] || saved[CT].score !== 24 || saved[CT].attempts !== 1) fail(`the result wasn't kept in assessgrade: ${JSON.stringify(saved)}`);
    // the trainee reads it, can't write it; an admin doesn't take it; a second grading at once waits
    const read = await call('/api/storage/get', { key: 'assessgrade:' + id }, trainee);
    if (read.status !== 200 || !/"score":24/.test((read.body || {}).value || '')) fail(`the trainee can't read their result: ${JSON.stringify(read)}`);
    if ((await call('/api/storage/set', { key: 'assessgrade:' + id, value: '{}' }, trainee)).status !== 403) fail('a trainee could write their own grade');
    if ((await call('/api/assess/grade', { id: AL, answers: {} }, admin)).status !== 403) fail('an admin took an assessment');
    if ((await call('/api/assess/grade', { id: CT, answers: ans }, trainee)).status !== 429) fail('grading again at once should wait');
    // Auto Liability: the essays out of 5
    const al = await call('/api/assess/grade', { id: AL, answers: Object.fromEntries(items.map(x => [x.k, 'An answer.'])) }, trainee);
    const ar = (al.body || {}).result || {};
    if (ar.total !== 45 || ar.score !== 45 || (ar.items || {}).e1.max !== 5) fail(`the Auto Liability total: ${JSON.stringify(ar).slice(0, 200)}`);

    if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Assessments test passed (the forms without their keys and the keys never served; matching by its letter, the rest by the AI with the alternatives rule, a blank never scoring; the result in assessgrade, read but not written by the trainee; no admin attempt; a second grading at once waits).');
})().catch(e => { console.error(e); process.exit(1); });
