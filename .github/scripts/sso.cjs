// Single sign-on: the LSH Training Portal is the only way a trainee gets into this program.
//   1. With an admin password set, single sign-on is on whether or not PORTAL_SSO_SECRET is — a name + batch
//      typed at /api/auth/trainee is refused (403 portal-required), so opening this site directly gives a
//      trainee no way in. Only a trainee already signed in on the device can renew their session that way.
//   2. A trainee who opens the program from the Portal is signed in by its signed ticket, with no form.
//   3. With single sign-on on but no PORTAL_SSO_SECRET here, /api/auth/portal says which setting is missing
//      (503 portal-secret-missing) rather than letting it read as an expired link, and /api/auth/status
//      reports portalSecret false so the sign-in screen can tell an administrator.
//   4. PORTAL_ONLY=off is the way back to the old name + batch sign-in (the tests use it).
//   5. An administrator's ticket (an admin signed in on the Portal) signs them in as a trainer, with no second password,
//      and only once: the same ticket again is refused (401 used).
// Usage: node .github/scripts/sso.cjs   (no server, no browser needed)
const path = require('path');
const { pathToFileURL } = require('url');

const failures = [];
const fail = (m) => failures.push(m);
const SECRET = 'portal-secret-shared-with-the-portal';

const b64url = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function ticketFor(payloadObj, secret) {
    const payload = b64url(JSON.stringify(payloadObj));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('portal-sso:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const b = String.fromCharCode(...new Uint8Array(sig));
    return payload + '.' + btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

(async () => {
    const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
    const makeEnv = (extra) => {
        const store = new Map();
        return Object.assign({
            MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret',
            LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) },
            __store: store
        }, extra);
    };
    const call = async (env, p, body, headers) => {
        const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}), body: JSON.stringify(body || {}) }), env, { waitUntil() { } });
        return { status: res.status, body: await res.json().catch(() => null) };
    };
    const status = async (env) => (await call(env, '/api/auth/status')).body;

    // 1. single sign-on is on with the admin password alone, and a typed name + batch is refused
    for (const [label, env] of [['without the Portal secret', makeEnv({})], ['with the Portal secret', makeEnv({ PORTAL_SSO_SECRET: SECRET })]]) {
        const st = await status(env);
        if (!st.portalOnly) fail(`${label}: /api/auth/status should report single sign-on on (portalOnly)`);
        const typed = await call(env, '/api/auth/trainee', { name: 'Walk In', batch: 'B100926' });
        if (typed.status !== 403 || !typed.body || typed.body.error !== 'portal-required') {
            fail(`${label}: a name + batch typed on this site should be refused (403 portal-required), got ${JSON.stringify(typed)}`);
        }
    }

    // 2. a trainee opening the program from the Portal is signed in by its ticket
    const env = makeEnv({ PORTAL_SSO_SECRET: SECRET });
    const good = await call(env, '/api/auth/portal', { ticket: await ticketFor({ first: 'Ana', last: 'Cruz', b: 'B100926', exp: Date.now() + 60000 }, SECRET) });
    if (good.status !== 200 || !good.body || !good.body.token) fail(`a Portal ticket should sign the trainee in: ${JSON.stringify(good)}`);
    else {
        if (good.body.id !== 'ana-cruz--b100926') fail(`the Portal ticket should give the Batch ID's record: ${good.body.id}`);
        if (good.body.batch !== 'B100926') fail(`the Batch ID should come back in its one form: ${JSON.stringify(good.body.batch)}`);
    }
    // that trainee can now renew their own session with the name + batch the Portal vouched for
    const renew = await call(env, '/api/auth/trainee', { name: 'Ana Cruz', batch: 'B100926' }, { Authorization: 'Bearer ' + good.body.token });
    if (renew.status !== 200) fail(`a trainee already signed in on the device should be able to renew: ${JSON.stringify(renew)}`);
    // a ticket signed with the wrong secret is refused
    const wrong = await call(env, '/api/auth/portal', { ticket: await ticketFor({ first: 'Ana', last: 'Cruz', b: 'B100926', exp: Date.now() + 60000 }, 'a-different-secret') });
    if (wrong.status !== 401 || !wrong.body || wrong.body.code !== 'signature') fail(`a ticket signed with another secret should be refused: ${JSON.stringify(wrong)}`);
    // an expired ticket is refused
    const old = await call(env, '/api/auth/portal', { ticket: await ticketFor({ first: 'Ana', last: 'Cruz', b: 'B100926', exp: Date.now() - 1000 }, SECRET) });
    if (old.status !== 401) fail(`an expired ticket should be refused: ${JSON.stringify(old)}`);

    // 3. single sign-on on, but this Worker has no Portal secret: say which setting is missing
    const noSecret = makeEnv({});
    const st2 = await status(noSecret);
    if (st2.portalSecret !== false) fail(`/api/auth/status should report portalSecret false when it isn't set: ${JSON.stringify(st2)}`);
    const blocked = await call(noSecret, '/api/auth/portal', { ticket: await ticketFor({ first: 'Ana', last: 'Cruz', b: 'B100926', exp: Date.now() + 60000 }, SECRET) });
    if (blocked.status !== 503 || !blocked.body || blocked.body.code !== 'portal-secret-missing') {
        fail(`without PORTAL_SSO_SECRET the Portal sign-in should name the missing setting (503 portal-secret-missing), got ${JSON.stringify(blocked)}`);
    } else if (!/PORTAL_SSO_SECRET/.test(blocked.body.error || '')) fail('the message should name PORTAL_SSO_SECRET');

    // 4. PORTAL_ONLY=off is the way back
    const off = makeEnv({ PORTAL_ONLY: 'off' });
    if ((await status(off)).portalOnly) fail('PORTAL_ONLY=off should turn single sign-on off');
    const typedOff = await call(off, '/api/auth/trainee', { name: 'Walk In', batch: 'B100926' });
    if (typedOff.status !== 200) fail(`with PORTAL_ONLY=off a name + batch should still sign in: ${JSON.stringify(typedOff)}`);

    // 5. single sign-on for trainers: an administrator's ticket signs them in as a trainer, once
    const aTicket = await ticketFor({ r: 'a', n: 'Coach Ana', exp: Date.now() + 60000 }, SECRET);
    const adminTicket = await call(env, '/api/auth/portal', { ticket: aTicket });
    if (adminTicket.status !== 200 || !adminTicket.body || !adminTicket.body.admin || !adminTicket.body.token) {
        fail(`an administrator's ticket should sign them in as a trainer, got ${JSON.stringify(adminTicket)}`);
    } else {
        // the token is a trainer's: an admin-only call works with it (a trainee's gets 403)
        const asAdmin = await call(env, '/api/storage/delete', { key: 'sso-test-nothing' }, { Authorization: 'Bearer ' + adminTicket.body.token });
        if (asAdmin.status !== 200) fail(`the token from an administrator's ticket isn't a trainer's: ${JSON.stringify(asAdmin)}`);
    }
    const again = await call(env, '/api/auth/portal', { ticket: aTicket });
    if (again.status !== 401 || !again.body || again.body.code !== 'used') fail(`an administrator's ticket should work only once, got ${JSON.stringify(again)}`);

    // 6. …and that trainer opens the Portal's simulators signed in too: a Portal ticket with their name { r: 'a', n } (the Portal
    // signs them in to their own admin account). A trainer signed in here with this program's password gets none.
    if (adminTicket.body && adminTicket.body.token) {
        const pt = await call(env, '/api/auth/tool-ticket', { tool: 'portal' }, { Authorization: 'Bearer ' + adminTicket.body.token });
        const body = pt.body && pt.body.ticket ? JSON.parse(Buffer.from(pt.body.ticket.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) : null;
        if (pt.status !== 200 || !body || body.r !== 'a' || body.n !== 'Coach Ana') fail(`a trainer from the main Hub should get the Portal's admin ticket with their name, got ${JSON.stringify(pt)} ${JSON.stringify(body)}`);
    }
    const pw = await call(env, '/api/auth/admin', { passphrase: 'ci-pass' });
    if (pw.body && pw.body.token) {
        const none = await call(env, '/api/auth/tool-ticket', { tool: 'portal' }, { Authorization: 'Bearer ' + pw.body.token });
        if (none.status !== 403) fail(`a trainer signed in with this program's password should get no Portal ticket, got ${JSON.stringify(none)}`);
    } else fail(`the admin password should sign a trainer in here: ${JSON.stringify(pw)}`);

    // 7. a trainee whose Batch ID was changed on the Portal keeps their one account (movedBatch): the same ID, its progress,
    // the record moved to the new batch; a duplicate already made under the new ID (newer) is archived, merged into it
    {
        const e2 = makeEnv({ PORTAL_SSO_SECRET: SECRET }), st = e2.__store;
        const t1 = await call(e2, '/api/auth/portal', { ticket: await ticketFor({ first: 'Valeria', last: 'Sarti', b: 'B03101', exp: Date.now() + 60000 }, SECRET) });
        const oldId = t1.body && t1.body.id;
        st.set('ft:progress:' + oldId, JSON.stringify({ 1: { done: true } }));
        const t2 = await call(e2, '/api/auth/portal', { ticket: await ticketFor({ first: 'Valeria', last: 'Sarti', b: 'B103026', exp: Date.now() + 60000 }, SECRET) });
        if (!t2.body || t2.body.id !== oldId) fail(`a changed Batch ID should keep the trainee's account ${oldId}, got ${JSON.stringify(t2.body && t2.body.id)}`);
        const moved = JSON.parse(st.get('ft:trainee:' + oldId) || 'null');
        // (and renews their session with the new batch and the kept ID)
        const rn = await call(e2, '/api/auth/trainee', { name: 'Valeria Sarti', batch: 'B103026', id: oldId }, { Authorization: 'Bearer ' + (t2.body && t2.body.token) });
        if (rn.status !== 200 || !rn.body || rn.body.id !== oldId) fail(`a kept account should renew with its new batch: ${JSON.stringify(rn)}`);
        if (!moved || moved.batch !== 'B103026' || moved.batchFrom !== 'B03101') fail(`the account should move to the new batch: ${JSON.stringify(moved)}`);
        if (st.has('ft:trainee:valeria-sarti--b103026')) fail('a second account was made for the new batch');
        // (the duplicate the old behaviour made: newer, under the new ID; the next sign-in merges it)
        const e3 = makeEnv({ PORTAL_SSO_SECRET: SECRET }), s3 = e3.__store;
        s3.set('ft:trainee:valeria-sarti--b03101', JSON.stringify({ id: 'valeria-sarti--b03101', name: 'Valeria Sarti', batch: 'B03101', approved: true, registeredAt: '2026-10-30T08:00:00Z' }));
        s3.set('ft:trainee:valeria-sarti--b103026', JSON.stringify({ id: 'valeria-sarti--b103026', name: 'Valeria Sarti', batch: 'B103026', approved: true, registeredAt: '2026-11-02T11:21:00Z' }));
        const t3 = await call(e3, '/api/auth/portal', { ticket: await ticketFor({ first: 'Valeria', last: 'Sarti', b: 'B103026', exp: Date.now() + 60000 }, SECRET) });
        const dup = JSON.parse(s3.get('ft:trainee:valeria-sarti--b103026'));
        if (!t3.body || t3.body.id !== 'valeria-sarti--b03101' || !dup.archived || dup.mergedInto !== 'valeria-sarti--b03101') fail(`an existing duplicate should be merged into the older account: ${JSON.stringify(t3.body && t3.body.id)} ${JSON.stringify(dup)}`);
        // (two people with the same name in two batches, each with their own account from the start: nothing moves)
        const e4 = makeEnv({ PORTAL_SSO_SECRET: SECRET }), s4 = e4.__store;
        s4.set('ft:trainee:ana-cruz--b100926', JSON.stringify({ id: 'ana-cruz--b100926', name: 'Ana Cruz', batch: 'B100926', approved: true, registeredAt: '2026-11-01T08:00:00Z' }));
        s4.set('ft:trainee:ana-cruz--b103026', JSON.stringify({ id: 'ana-cruz--b103026', name: 'Ana Cruz', batch: 'B103026', approved: true, registeredAt: '2026-10-01T08:00:00Z' }));
        const t4 = await call(e4, '/api/auth/portal', { ticket: await ticketFor({ first: 'Ana', last: 'Cruz', b: 'B103026', exp: Date.now() + 60000 }, SECRET) });
        if (!t4.body || t4.body.id !== 'ana-cruz--b103026' || JSON.parse(s4.get('ft:trainee:ana-cruz--b100926')).batch !== 'B100926') fail(`an account older than the other must stay as it is: ${JSON.stringify(t4.body && t4.body.id)}`);
    }

    if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Single sign-on: the Portal is the only way a trainee gets in, a typed name + batch is refused, a missing PORTAL_SSO_SECRET says so, and a trainer signed in on the Portal gets in with no second password, once per ticket.');
})().catch(e => { console.error(e); process.exit(1); });
