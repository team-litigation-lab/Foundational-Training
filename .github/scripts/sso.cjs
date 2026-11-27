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
// A Portal ticket names the program it is for (p, its topic key: the Portal's makeTicket); p: undefined leaves it out.
const PORTAL_TOPIC = 'STANDARD TRAINING';
async function ticketFor(payloadObj, secret) {
    const payload = b64url(JSON.stringify(Object.assign({ p: PORTAL_TOPIC }, payloadObj)));
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
    // (an administrator whose name has a dot in it — "Ma. Theresa", "Jr." — signs in too: the dot doesn't break the token)
    { const dTicket = await ticketFor({ r: 'a', n: 'Ma. Theresa Cruz Jr.', exp: Date.now() + 60000 }, SECRET);
      const dot = await call(env, '/api/auth/portal', { ticket: dTicket });
      const used = dot.body && dot.body.token ? await call(env, '/api/storage/delete', { key: 'sso-test-nothing' }, { Authorization: 'Bearer ' + dot.body.token }) : { status: 0 };
      if (dot.status !== 200 || used.status !== 200) fail(`an administrator named with a dot can't use their sign-in: ${JSON.stringify(dot)} / ${used.status}`); }
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
        const t1 = await call(e2, '/api/auth/portal', { ticket: await ticketFor({ first: 'Valeria', last: 'Sarti', b: 'B03101', u: 'U7', exp: Date.now() + 60000 }, SECRET) });
        const oldId = t1.body && t1.body.id;
        st.set('ft:progress:' + oldId, JSON.stringify({ 1: { done: true } }));
        const t2 = await call(e2, '/api/auth/portal', { ticket: await ticketFor({ first: 'Valeria', last: 'Sarti', b: 'B103026', u: 'U7', exp: Date.now() + 60000 }, SECRET) });
        if (!t2.body || t2.body.id !== oldId) fail(`a changed Batch ID should keep the trainee's account ${oldId}, got ${JSON.stringify(t2.body && t2.body.id)}`);
        const moved = JSON.parse(st.get('ft:trainee:' + oldId) || 'null');
        // (and renews their session with the new batch and the kept ID)
        const rn = await call(e2, '/api/auth/trainee', { name: 'Valeria Sarti', batch: 'B103026', id: oldId }, { Authorization: 'Bearer ' + (t2.body && t2.body.token) });
        if (rn.status !== 200 || !rn.body || rn.body.id !== oldId) fail(`a kept account should renew with its new batch: ${JSON.stringify(rn)}`);
        if (!moved || moved.batch !== 'B103026' || moved.batchFrom !== 'B03101') fail(`the account should move to the new batch: ${JSON.stringify(moved)}`);
        if (st.has('ft:trainee:valeria-sarti--b103026')) fail('a second account was made for the new batch');
        // (the duplicate the old behaviour made: newer, under the new ID; the next sign-in merges it)
        const e3 = makeEnv({ PORTAL_SSO_SECRET: SECRET }), s3 = e3.__store;
        s3.set('ft:trainee:valeria-sarti--b03101', JSON.stringify({ id: 'valeria-sarti--b03101', name: 'Valeria Sarti', batch: 'B03101', approved: true, portalUid: 'U7', registeredAt: '2026-10-30T08:00:00Z' }));
        s3.set('ft:trainee:valeria-sarti--b103026', JSON.stringify({ id: 'valeria-sarti--b103026', name: 'Valeria Sarti', batch: 'B103026', approved: true, registeredAt: '2026-11-02T11:21:00Z' }));
        const t3 = await call(e3, '/api/auth/portal', { ticket: await ticketFor({ first: 'Valeria', last: 'Sarti', b: 'B103026', u: 'U7', exp: Date.now() + 60000 }, SECRET) });
        const dup = JSON.parse(s3.get('ft:trainee:valeria-sarti--b103026'));
        if (!t3.body || t3.body.id !== 'valeria-sarti--b03101' || !dup.archived || dup.mergedInto !== 'valeria-sarti--b03101') fail(`an existing duplicate should be merged into the older account: ${JSON.stringify(t3.body && t3.body.id)} ${JSON.stringify(dup)}`);
        // (two people with the same name in two batches, each with their own account from the start: nothing moves)
        const e4 = makeEnv({ PORTAL_SSO_SECRET: SECRET }), s4 = e4.__store;
        s4.set('ft:trainee:ana-cruz--b100926', JSON.stringify({ id: 'ana-cruz--b100926', name: 'Ana Cruz', batch: 'B100926', approved: true, portalUid: 'UA1', registeredAt: '2026-11-01T08:00:00Z' }));
        s4.set('ft:trainee:ana-cruz--b103026', JSON.stringify({ id: 'ana-cruz--b103026', name: 'Ana Cruz', batch: 'B103026', approved: true, registeredAt: '2026-10-01T08:00:00Z' }));
        const t4 = await call(e4, '/api/auth/portal', { ticket: await ticketFor({ first: 'Ana', last: 'Cruz', b: 'B103026', u: 'UA2', exp: Date.now() + 60000 }, SECRET) });
        if (!t4.body || t4.body.id !== 'ana-cruz--b103026' || JSON.parse(s4.get('ft:trainee:ana-cruz--b100926')).batch !== 'B100926') fail(`an account older than the other must stay as it is: ${JSON.stringify(t4.body && t4.body.id)}`);
    }

    // 8. a middle name or initial from the Portal (m) is kept as the name shown (fullName); the ID stays first + last
    {
        const e5 = makeEnv({ PORTAL_SSO_SECRET: SECRET }), s5 = e5.__store;
        const m1 = await call(e5, '/api/auth/portal', { ticket: await ticketFor({ first: 'Valeria', m: 'S.', last: 'Sarti', b: 'B103026', exp: Date.now() + 60000 }, SECRET) });
        const r5 = JSON.parse(s5.get('ft:trainee:valeria-sarti--b103026') || 'null');
        if (!m1.body || m1.body.id !== 'valeria-sarti--b103026' || !r5 || r5.fullName !== 'Valeria S. Sarti') fail(`a middle initial should be kept as fullName with the same ID: ${JSON.stringify(m1.body && m1.body.id)} ${JSON.stringify(r5 && r5.fullName)}`);
    }

    // 6. 🎯 a Portal ticket names the program it is for (p, this program's topic key) and works once, whoever it is for
    //    (platform QA 2026-11-19, finding 1): a ticket made for another program or a tool is refused, so Program Access on
    //    the Portal stays the one gate (one with no p is still taken: the rollout); and the trainee's full registered name (finding 8) is kept, the ID unchanged.
    {
        const soon = () => Date.now() + 60000;
        const e6 = makeEnv({ PORTAL_SSO_SECRET: SECRET });
        for (const [label, p] of [["another program's", 'SOME OTHER PROGRAM'], ["the Knowledge Base's", 'kb'], ["a course's tool link", 'tool'], ['a blank-audience', '']]) {
            for (const [kind, t] of [['trainee', { first: 'Pat', last: 'Lane', b: 'B100926' }], ['admin', { r: 'a', n: 'Coach Ana' }], ['system', { r: 's' }]]) {
                const res = await call(e6, '/api/auth/portal', { ticket: await ticketFor(Object.assign({}, t, { p, exp: soon() }), SECRET) });
                if (res.status !== 401 || !res.body || res.body.code !== 'audience' || res.body.token) fail(`${label} ${kind} ticket must be refused (401 audience), got ${JSON.stringify(res)}`);
            }
        }
        if ([...e6.__store.keys()].some((k) => /pat-lane/.test(k) && !/^(\w+:)?sso-used:/.test(k))) fail('a refused ticket must not create or approve a trainee record');
        // a ticket with no p (made before the Portal named the program) is still taken, so nobody is locked out mid-rollout
        const np = await call(e6, '/api/auth/portal', { ticket: await ticketFor({ first: 'Pat', last: 'Lane', b: 'B100926', p: undefined, exp: soon() }, SECRET) });
        if (np.status !== 200 || !np.body || !np.body.token) fail(`a ticket with no p should still sign in: ${JSON.stringify(np)}`);
        const ap = await call(e6, '/api/auth/portal', { ticket: await ticketFor({ r: 'a', n: 'Coach Ana', p: undefined, exp: soon() }, SECRET) });
        if (ap.status !== 200 || !ap.body || !ap.body.admin) fail(`a trainer's ticket with no p should still sign in: ${JSON.stringify(ap)}`);
        // SSO_REQUIRE_AUDIENCE=1 (once everything is deployed): a ticket with no p is refused too; this program's own still opens
        {
            const eR = makeEnv({ PORTAL_SSO_SECRET: SECRET, SSO_REQUIRE_AUDIENCE: '1' });
            const noP = await call(eR, '/api/auth/portal', { ticket: await ticketFor({ first: 'Pat', last: 'Lane', b: 'B100926', p: undefined, exp: soon() }, SECRET) });
            if (noP.status !== 401 || !noP.body || noP.body.code !== 'audience' || noP.body.token) fail(`with SSO_REQUIRE_AUDIENCE=1 a ticket with no p is refused: ${JSON.stringify(noP)}`);
            const own = await call(eR, '/api/auth/portal', { ticket: await ticketFor({ first: 'Pat', last: 'Lane', b: 'B100926', exp: soon() }, SECRET) });
            if (own.status !== 200 || !own.body || !own.body.token) fail(`with SSO_REQUIRE_AUDIENCE=1 this program's own ticket still opens: ${JSON.stringify(own)}`);
        }
        // a trainee's own ticket works once, like a trainer's
        const tt = await ticketFor({ first: 'Pat', last: 'Lane', b: 'B100926', p: PORTAL_TOPIC, exp: soon() }, SECRET);
        const first = await call(e6, '/api/auth/portal', { ticket: tt });
        if (first.status !== 200 || !first.body || !first.body.token) fail(`this program's own trainee ticket should sign in: ${JSON.stringify(first)}`);
        const second = await call(e6, '/api/auth/portal', { ticket: tt });
        if (second.status !== 401 || !second.body || second.body.code !== 'used' || second.body.token) fail(`a trainee's ticket should work only once, got ${JSON.stringify(second)}`);
        // the Sign-in check's system ticket works once too
        const st = await ticketFor({ r: 's', exp: soon() }, SECRET);
        const s1 = await call(e6, '/api/auth/portal', { ticket: st }), s2 = await call(e6, '/api/auth/portal', { ticket: st });
        if (s1.status !== 200 || s2.status !== 401) fail(`the Sign-in check's ticket should work once: ${s1.status} then ${s2.status}`);
        // the full registered name is kept as fullName, the ID stays first + last + batch
        const fm = await call(e6, '/api/auth/portal', { ticket: await ticketFor({ first: 'Maria', last: 'Santos', b: 'B100926', full: 'Maria L. Santos', exp: soon() }, SECRET) });
        const fullName = fm.body && (fm.body.fullName || (fm.body.existing && fm.body.existing.fullName));
        if (fm.status !== 200 || fm.body.id !== 'maria-santos--b100926' || fullName !== 'Maria L. Santos') fail(`a ticket's full name should be kept as fullName with the same ID: ${JSON.stringify(fm.body && { id: fm.body.id, fullName })}`);
    }

    // 9. (platform QA 2026-11-19, FT findings 3 and 4) the block list is read fresh at sign-in, a blocked record is never moved or
    //    rewritten, a kept record leaves trainee-alias:<new id>, and a Portal mock-call scorecard finds the kept record
    {
        const e9 = makeEnv({ PORTAL_SSO_SECRET: SECRET, AI_GATEWAY_SECRET: 'gw' }), s9 = e9.__store, soon = () => Date.now() + 60000;
        const ok1 = await call(e9, '/api/auth/portal', { ticket: await ticketFor({ first: 'Bo', last: 'Lock', b: 'B100926', u: 'UB', exp: soon() }, SECRET) });
        if (ok1.status !== 200) fail(`sign-in before the block: ${JSON.stringify(ok1)}`);
        s9.set('ft:access:blocked', JSON.stringify({ ids: { 'bo-lock--b100926': { why: 'offboarded' } } }));
        const at = await call(e9, '/api/auth/portal', { ticket: await ticketFor({ first: 'Bo', last: 'Lock', b: 'B100926', u: 'UB', exp: soon() + 1 }, SECRET) });   // (+1: another ticket, not the first one again)
        if (at.status !== 403 || at.body.code !== 'access-offboarded' || at.body.token) fail(`a trainee blocked a moment ago is refused at once: ${JSON.stringify(at)}`);
        const before = s9.get('ft:trainee:bo-lock--b100926');
        const mv = await call(e9, '/api/auth/portal', { ticket: await ticketFor({ first: 'Bo', last: 'Lock', b: 'B110226', u: 'UB', exp: soon() }, SECRET) });
        if (mv.status !== 403 || mv.body.token) fail(`a blocked trainee whose batch changed is refused: ${JSON.stringify(mv)}`);
        if (s9.get('ft:trainee:bo-lock--b100926') !== before || s9.has('ft:trainee-alias:bo-lock--b110226')) fail('a blocked record is never moved or rewritten');
        // a kept record: alias, and the Portal's scorecard (/api/calsim-card-in, sent with the new batch) lands on it
        await call(e9, '/api/auth/portal', { ticket: await ticketFor({ first: 'Cy', last: 'Moved', b: 'B100126', u: 'UC', exp: soon() }, SECRET) });
        const mk = await call(e9, '/api/auth/portal', { ticket: await ticketFor({ first: 'Cy', last: 'Moved', b: 'B110226', u: 'UC', exp: soon() }, SECRET) });
        if (mk.body.id !== 'cy-moved--b100126' || s9.get('ft:trainee-alias:cy-moved--b110226') !== 'cy-moved--b100126') fail(`a kept record leaves its alias: ${JSON.stringify(mk.body && mk.body.id)}`);
        const rows = Array.from({ length: 8 }, (_, i) => ({ score: 4, feedback: 'ok' }));
        const ci = await call(e9, '/api/calsim-card-in', { name: 'Cy Moved', batch: 'B110226', card: { rows, at: new Date().toISOString() } }, { 'x-gateway-key': 'gw' });
        if (ci.status !== 200 || !s9.has('ft:labreview:cy-moved--b100126')) fail(`the Portal's scorecard should reach the kept record: ${JSON.stringify(ci)}`);
    }

    // 10. (security and data-safety reviews 2026-11-19) a record moves only for the same Portal account (portalUid), never to a
    //     namesake; a trainee can't rewrite who their record is; the tool ticket says who by the Portal account id
    {
        const e10 = makeEnv({ PORTAL_SSO_SECRET: SECRET }), s10 = e10.__store, soon = () => Date.now() + 60000;
        const m1 = await call(e10, '/api/auth/portal', { ticket: await ticketFor({ first: 'Maria', last: 'Santos', b: 'B100126', u: 'M1', exp: soon() }, SECRET) });
        const m2 = await call(e10, '/api/auth/portal', { ticket: await ticketFor({ first: 'Maria', last: 'Santos', b: 'B110226', u: 'M2', exp: soon() }, SECRET) });
        if (m1.body.id !== 'maria-santos--b100126' || m2.body.id !== 'maria-santos--b110226' || JSON.parse(s10.get('ft:trainee:maria-santos--b100126')).batch !== 'B100126' || s10.has('ft:trainee-alias:maria-santos--b110226'))
            fail(`another Maria Santos (another Portal account) must get her own record, not the first one's: ${m1.body.id} / ${m2.body.id}`);
        // a record from before portalUid was kept is not moved on a name alone
        s10.set('ft:trainee:leo-old--b010126', JSON.stringify({ id: 'leo-old--b010126', name: 'Leo Old', batch: 'B010126', approved: true, registeredAt: '2026-01-01T00:00:00Z' }));
        const lo = await call(e10, '/api/auth/portal', { ticket: await ticketFor({ first: 'Leo', last: 'Old', b: 'B020126', u: 'L1', exp: soon() }, SECRET) });
        if (lo.body.id !== 'leo-old--b020126' || JSON.parse(s10.get('ft:trainee:leo-old--b010126')).batch !== 'B010126') fail(`a record with no Portal account id isn't moved on a name: ${lo.body.id}`);
        // the trainee rewrites who their record is: ignored; the tool ticket keeps their own name, batch and Portal account id
        const tok = m1.body.token, recNow = JSON.parse(s10.get('ft:trainee:maria-santos--b100126'));
        if (recNow.portalUid !== 'M1') fail(`the Portal account id is kept on the record: ${recNow.portalUid}`);
        await call(e10, '/api/storage/set', { key: 'trainee:maria-santos--b100126', value: JSON.stringify(Object.assign({}, recNow, { name: 'Bob Victim', firstName: 'Bob', lastName: 'Victim', batch: 'B200000', portalUid: 'VICTIM' })) }, { Authorization: 'Bearer ' + tok });
        const after = JSON.parse(s10.get('ft:trainee:maria-santos--b100126'));
        if (after.name !== 'Maria Santos' || after.firstName !== 'Maria' || after.batch !== 'B100126' || after.portalUid !== 'M1') fail(`a trainee can't rewrite who their record is: ${JSON.stringify(after)}`);
        const tt = await call(e10, '/api/auth/tool-ticket', {}, { Authorization: 'Bearer ' + tok });
        const body = tt.body && tt.body.ticket ? JSON.parse(Buffer.from(tt.body.ticket.split('.')[0], 'base64url').toString('utf8')) : null;
        if (!body || body.first !== 'Maria' || body.last !== 'Santos' || body.u !== 'M1' || body.p !== 'tool') fail(`the tool ticket is the trainee's own, with their Portal account id: ${JSON.stringify(body)}`);
        // a record whose name no longer leads back to the session (a trainer renamed it): no tool ticket
        s10.set('ft:trainee:maria-santos--b100126', JSON.stringify(Object.assign({}, after, { firstName: 'Bob', lastName: 'Victim', name: 'Bob Victim' })));
        const mm = await call(e10, '/api/auth/tool-ticket', {}, { Authorization: 'Bearer ' + tok });
        if (mm.status !== 403 || mm.body.error !== 'identity-mismatch') fail(`a record that doesn't lead back to the session gets no tool ticket: ${JSON.stringify(mm)}`);
    }

    // 8. 🔓 a sign-in lasts until 8 hours with no activity (worker.js SESSION_HOURS; it was a year): every token runs 8 hours from
    //    when it was made and an open page renews it (/api/auth/refresh), so a closed tab is still signed in 7 hours later and
    //    signed out 9 hours later; a token that ran out can't be brought back by the name + batch renewal (no grace) either
    {
        const H = 3600e3, near = (t, ms) => Math.abs(Number(String(t || '').split('.')[2]) - Date.now() - ms) < 60000;
        if (!(adminTicket.body && near(adminTicket.body.token, 8 * H))) fail(`a trainer's Portal sign-in should run 8 hours: ${adminTicket.body && adminTicket.body.token}`);
        if (!(good.body && near(good.body.token, 8 * H))) fail(`a trainee's Portal sign-in should run 8 hours (it was a year): ${good.body && good.body.token}`);
        if (!(pw.body && near(pw.body.token, 8 * H))) fail(`a trainer's admin-password sign-in should run 8 hours: ${JSON.stringify(pw.body)}`);
        const ren = await call(env, '/api/auth/refresh', {}, { Authorization: 'Bearer ' + good.body.token });
        if (!(ren.status === 200 && near(ren.body && ren.body.token, 8 * H) && ren.body.token.split('.')[0] === 't')) fail(`a live trainee token should be renewed for 8 hours from now: ${JSON.stringify(ren)}`);
        const signed = async (role, subj, ago, life = 8) => {   // a token made <ago> hours ago, signed as the Worker signs one
            const body = `${role}.${encodeURIComponent(subj).replace(/\./g, '%2E')}.${Date.now() - ago * H + life * H}`;
            const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('ci-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            return `${body}.${sig}`;
        };
        const tid = good.body.id;
        for (const [ago, alive] of [[0.05, true], [7, true], [9, false], [24, false]]) {
            for (const [role, subj] of [['a', 'hub:Coach Ana'], ['t', tid]]) {
                const r = await call(env, '/api/auth/refresh', {}, { Authorization: 'Bearer ' + await signed(role, subj, ago) });
                if ((r.status === 200) !== alive) fail(`a ${role === 'a' ? "trainer's" : "trainee's"} sign-in idle ${ago} h should read ${alive ? 'signed in' : 'signed out'}, got ${r.status}`);
            }
            const rn = await call(env, '/api/auth/trainee', { name: 'Ana Cruz', batch: 'B100926', id: tid }, { Authorization: 'Bearer ' + await signed('t', tid, ago) });
            if ((rn.status === 200) !== alive) fail(`the name + batch renewal of a trainee idle ${ago} h should be ${alive ? 'accepted' : 'refused (portal-required)'}, got ${rn.status}`);
        }
        // a year-long token made before this rule is still taken (no one is signed out by the deploy) and renewed as an 8-hour one
        const legacy = await call(env, '/api/auth/refresh', {}, { Authorization: 'Bearer ' + await signed('t', tid, 48, 24 * 365) });
        if (!(legacy.status === 200 && near(legacy.body && legacy.body.token, 8 * H))) fail(`a year-long token from before the 8-hour rule should be swapped for an 8-hour one: ${JSON.stringify(legacy)}`);
    }

    // 9. the page's half (index.html's SECURE MODE block, in a small shim): both tokens in localStorage (closing the tab keeps the
    //    sign-in), a token 7 hours idle still signed in and one 9 hours idle dropped as the page opens, an open page renews its
    //    tokens whatever is left on them, one that ran out while the laptop slept reloads the page (signed out)
    {
        const vm = require('vm'), fs = require('fs');
        const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
        const a0 = html.indexOf('function tokenRunOut('), z0 = html.indexOf('\n', html.indexOf('function setAdminToken('));
        if (a0 < 0 || z0 < 0) fail('index.html: the SECURE MODE token block (function tokenRunOut … function setAdminToken) was not found');
        else {
            const H = 3600e3, tk = (role, ago) => `${role}.someone.${Date.now() - ago * H + 8 * H}.sig`;
            const store = () => { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
            const page = (local = {}, session = {}) => {
                const ctx = { state: {}, localStorage: store(), sessionStorage: store(), Date, Number, String, Promise, JSON, Object, calls: [], listeners: {},
                    setInterval: () => 0, setTimeout: () => 0, toast: () => {}, location: { reloads: 0, reload() { this.reloads++; } } };
                ctx.document = { visibilityState: 'visible', addEventListener: (t, f) => { ctx.listeners[t] = f; } };
                ctx.fetch = async (url, o) => { ctx.calls.push(url); return { ok: true, json: async () => ({ token: tk(o.headers.Authorization.slice(7, 8), 0) }) }; };
                Object.entries(local).forEach(([k, v]) => ctx.localStorage.setItem(k, v)); Object.entries(session).forEach(([k, v]) => ctx.sessionStorage.setItem(k, v));
                vm.createContext(ctx); vm.runInContext(html.slice(a0, z0) + '\n;this.api = { ftRefreshTokens, setAdminToken, setTraineeToken };', ctx);
                return ctx;
            };
            for (const [ago, alive] of [[0.1, true], [7, true], [9, false], [30, false]]) {
                const ta = tk('a', ago), tt = tk('t', ago), p = page({ lsh_admin_token: ta, lsh_auth_token: tt });
                if ((p.state.adminToken === ta) !== alive || (p.state.authToken === tt) !== alive) fail(`index.html: tokens ${ago} h idle should read ${alive ? 'signed in' : 'signed out'} as the page opens`);
                // (the only thing left is lsh_signout_why, the reason shown on the sign-in screen: no token)
                if (!alive && ([...p.localStorage.m.keys()].some(k => k !== 'lsh_signout_why') || p.sessionStorage.m.size || !/8 hours/.test(p.localStorage.getItem('lsh_signout_why') || ''))) fail(`index.html: tokens ${ago} h idle should be dropped from the device`);
            }
            const s = page({}, { lsh_admin_token: tk('a', 1) });
            if (!s.state.adminToken) fail('index.html: a live trainer token in sessionStorage (from before) should still sign the trainer in');
            s.api.setAdminToken(tk('a', 0));
            if (!s.localStorage.getItem('lsh_admin_token') || s.sessionStorage.getItem('lsh_admin_token') !== null) fail('index.html: the trainer token should be kept in localStorage, so closing the tab does not sign them out');
            const o = page({ lsh_admin_token: tk('a', 0.5), lsh_auth_token: tk('t', 0.5) });
            await o.api.ftRefreshTokens();
            if (o.calls.length !== 2 || o.calls.some((u) => u !== '/api/auth/refresh') || !(Number(o.state.authToken.split('.')[2]) - Date.now() > 7.9 * H)) fail(`index.html: an open page should renew both tokens for 8 hours: ${JSON.stringify(o.calls)}`);
            if (typeof o.listeners.visibilitychange !== 'function') fail('index.html: the page should renew its tokens as a tab comes back into view');
            o.state.adminToken = tk('a', 9); o.state.authToken = tk('t', 9); o.calls.length = 0;
            await o.api.ftRefreshTokens();
            if (o.location.reloads !== 1 || o.calls.length) fail('index.html: a token that ran out (9 hours idle, the laptop asleep) should not be renewed: the page reloads, signed out');
            o.api.setAdminToken(''); o.api.setTraineeToken('');
            if (o.localStorage.m.size || o.sessionStorage.m.size) fail('index.html: 🚪 Log out should clear both tokens');
        }
    }

    if (failures.length) { console.log(`\n${failures.length} failure(s):`); failures.forEach((f, i) => console.log(`${i + 1}. ${f}`)); process.exit(1); }
    console.log('Single sign-on: the Portal is the only way a trainee gets in, a typed name + batch is refused, a missing PORTAL_SSO_SECRET says so, and a trainer signed in on the Portal gets in with no second password, once per ticket.');
})().catch(e => { console.error(e); process.exit(1); });
