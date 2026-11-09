// 🔁 Scores given on the simulators, mirrored on the standard mock call scorecards (worker.js syncSimScores,
//   /api/sim-scores/sync and the nightly check):
//   - the Google Calendar Simulator's scorecard on the Portal fills the Calendar Management Mock Call (its seven metrics);
//   - the latest graded call on Ring Channel fills the Reception (and Intake) Mock Call, by metric name;
//   - a score typed here wins: never written over; one filled from a simulator follows the simulator's newer card;
//   - a card the Portal holds because it was saved here (source "foundational") isn't read back as the simulator's;
//   - trainers only.
// Usage: node .github/scripts/sim-scores.cjs   (no browser, no network)
const path = require('path'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map(), id = 'sia-sim--b110226', ben = 'ben-sim--b110226';
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', AI_GATEWAY_SECRET: 'gw',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k),
      list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const RB = globalThis.FT_RUBRICS.list;
  store.set('ft:trainee:' + id, JSON.stringify({ id, name: 'Sia Sim', batch: 'B110226', approved: true }));
  store.set('ft:trainee:' + ben, JSON.stringify({ id: ben, name: 'Ben Sim', batch: 'B110226', approved: true }));
  // the Portal's calendar scorecard: every metric 4/5, the newest one last
  let cards = [{ at: '2026-11-05T15:00:00Z', by: 'Trainer Mara', rows: RB.calendar.criteria.map(k => ({ metric: k.n, score: 4, feedback: 'Good' })) }];
  let asked = '';
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/api/calsim-scorecard')) { asked = (init.headers || {})['X-Gateway-Key'] || ''; return new Response(JSON.stringify({ success: true, username: 'sia', cards })); }
    return new Response('not found', { status: 404 });
  };
  // Ring Channel: a Reception graded call with its metrics (each out of 5), and an older one
  store.set('ft:callsim:' + id, JSON.stringify({ calls: [
    { lesson: 4, score: 40, at: '2026-11-03T15:00:00Z', metrics: { 'Customer Service': 2 } },
    { lesson: 4, score: 90, at: '2026-11-04T15:00:00Z', gradedBy: 'Trainer Mara', metrics: RB.reception.criteria.map(k => ({ metric: k.n, score: 5, note: 'Clear' })) }] }));
  // Ben's Reception mock call was scored here by a trainer: it wins
  store.set('ft:labreview:' + ben, JSON.stringify({ acts: { 'reception-live': { score: 72, status: 'Passed', date: '2026-11-04' } } }));
  store.set('ft:callsim:' + ben, JSON.stringify({ calls: [{ lesson: 4, score: 20, at: '2026-11-05T15:00:00Z', metrics: { 'Customer Service': 1 } }] }));

  const call = async (p, body, token) => {
    const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  const admin = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const trainee = (await call('/api/auth/trainee', { first: 'Sia', last: 'Sim', batch: 'B110226' })).body;
  if (trainee && trainee.token && (await call('/api/sim-scores/sync', { ids: [id] }, trainee.token)).status !== 403) fail('a trainee ran the sync');
  const acts = (who) => (JSON.parse(store.get('ft:labreview:' + who) || 'null') || {}).acts || {};

  // 1. synced: the calendar card and the latest Reception call, criterion by criterion
  const r1 = (await call('/api/sim-scores/sync', { ids: [id, ben] }, admin)).body || {};
  { const A = acts(id), cal = A['calendar-live'] || {}, rec = A['reception-live'] || {};
    if (asked !== 'gw') fail('the Portal was asked without the gateway key');
    if (cal.score !== 80 || cal.source !== 'simulator' || !cal.rubric || cal.rubric.scores.some(v => v !== 4) || cal.status !== 'Passed') fail(`the Calendar Simulator's scorecard isn't the Calendar Management Mock Call's: ${JSON.stringify(cal)}`);
    if (rec.score !== 100 || rec.source !== 'simulator' || !rec.rubric || rec.rubric.scores.some(v => v !== 5) || rec.simBy !== 'Trainer Mara') fail(`the latest Ring Channel graded call isn't the Reception Mock Call's: ${JSON.stringify(rec)}`);
    if (A['intake-live']) fail('an Intake mock call was filled with no Intake call');
    if (acts(ben)['reception-live'].score !== 72 || acts(ben)['reception-live'].source) fail(`a score typed here was written over: ${JSON.stringify(acts(ben)['reception-live'])}`);
    if (!r1.ok) fail(`the sync didn't answer: ${JSON.stringify(r1)}`); }
  // 2. a newer card on the simulator: the one filled from it follows
  cards = cards.concat([{ at: '2026-11-06T15:00:00Z', by: 'Trainer Mara', rows: RB.calendar.criteria.map(k => ({ metric: k.n, score: 3 })) }]);
  await call('/api/sim-scores/sync', { ids: [id] }, admin);
  if ((acts(id)['calendar-live'] || {}).score !== 60) fail(`a newer simulator scorecard wasn't followed: ${JSON.stringify(acts(id)['calendar-live'])}`);
  // 3. a card the Portal keeps because it was saved here isn't read back
  cards = cards.concat([{ at: '2026-11-07T15:00:00Z', source: 'foundational', rows: RB.calendar.criteria.map(k => ({ metric: k.n, score: 1 })) }]);
  await call('/api/sim-scores/sync', { ids: [id] }, admin);
  if ((acts(id)['calendar-live'] || {}).score !== 60) fail('a card saved here was read back from the Portal as the simulator\'s');
  // 4. once a trainer saves a score here, the simulator no longer changes it
  { const L = JSON.parse(store.get('ft:labreview:' + id)); L.acts['calendar-live'] = Object.assign({}, L.acts['calendar-live'], { source: undefined, score: 95 }); store.set('ft:labreview:' + id, JSON.stringify(L)); }
  cards = cards.concat([{ at: '2026-11-08T15:00:00Z', rows: RB.calendar.criteria.map(k => ({ metric: k.n, score: 2 })) }]);
  await call('/api/sim-scores/sync', { ids: [id] }, admin);
  if ((acts(id)['calendar-live'] || {}).score !== 95) fail(`a score saved here was written over by the simulator: ${JSON.stringify(acts(id)['calendar-live'])}`);

  if (failures.length) { console.error('Simulator scores test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Simulator scores test passed (the Google Calendar Simulator\'s scorecard and the latest Ring Channel graded call fill the standard mock call scorecards criterion by criterion; a score typed here wins; a newer simulator card is followed; a card saved here isn\'t read back; trainers only).');
})().catch((e) => { console.error('Simulator scores test FAILED:', e && e.stack || e); process.exit(1); });
