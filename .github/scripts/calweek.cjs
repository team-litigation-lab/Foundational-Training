// 📅 Standard Training - Calendaring Activity (js/ft-calweek-core.js, js/ft-calweek.js, calweek-api.js):
//   the current week resolver (Monday–Friday in Eastern Time from any instant, a weekend showing the coming week,
//   daylight-saving changes), the relative scheduling engine (offsets resolve to Monday of Week + 1 from the clock, and a
//   booking saved weeks ago snaps to the new next week), the isolated controller (/api/calweek/*: a trainee's own record
//   only, calweek:<id> closed to /api/storage, the signed webhook), and the page: the Practice Lab card, this week as the
//   default view, a task booked on next week and checked, Day 5's Attorney Calendar Management Activity linked both ways,
//   and the renamed Practice Session (Standard Training - Appointment Setting Mock Calls).
// Usage: NODE_PATH=…/node_modules node .github/scripts/calweek.cjs http://localhost:8787/
const path = require('path');
const { pathToFileURL } = require('url');
const C = require(path.join(process.cwd(), 'js/ft-calweek-core.js'));
const BASE = process.argv[2] || 'http://localhost:8787/';
const failures = []; const fail = m => failures.push(m);
const eq = (label, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); };

function coreChecks() {
  const at = s => Date.parse(s);
  // Thursday afternoon: this week, next week from Monday
  eq('Thursday: this week', C.currentWeek(at('2026-10-29T15:00:00Z')).days, ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
  eq('Thursday: next week', C.nextWeek(at('2026-10-29T15:00:00Z')).monday, '2026-11-02');
  // late Sunday night in UTC is still Sunday evening in Eastern Time, and Monday 00:30 Eastern is the new week
  eq('Sunday (Eastern): the coming week', C.currentWeek(at('2026-11-02T04:59:00Z')).monday, '2026-11-02');
  eq('Monday 00:30 Eastern: this week', C.currentWeek(at('2026-11-02T05:30:00Z')).monday, '2026-11-02');
  eq('Monday 00:30 Eastern: next week', C.nextWeek(at('2026-11-02T05:30:00Z')).monday, '2026-11-09');
  // the week's bounds are Eastern midnights (EDT before the change, EST after)
  const w = C.currentWeek(at('2026-10-29T15:00:00Z'));
  eq('bounds (EDT)', [new Date(w.startUtc).toISOString(), new Date(w.endUtc).toISOString()], ['2026-10-26T04:00:00.000Z', '2026-10-31T03:59:59.999Z']);
  // an offset resolves on the right side of a daylight-saving change
  eq('9:00 AM the Monday after DST starts', new Date(C.resolve({ w: 1, d: 0, m: 540, dur: 30 }, at('2026-03-06T12:00:00Z')).startUtc).toISOString(), '2026-03-09T13:00:00.000Z');
  eq('9:00 AM the Monday after DST ends', new Date(C.resolve({ w: 1, d: 0, m: 540, dur: 30 }, at('2026-10-30T12:00:00Z')).startUtc).toISOString(), '2026-11-02T14:00:00.000Z');
  // the same booking, read three weeks later, sits on the new next week
  const b = C.snap({ task: 'urgent', d: 1, m: 600, dur: 30 });
  eq('snapped to Week + 1', b.w, 1);
  eq('read now', C.resolve(b, at('2026-10-29T15:00:00Z')).date, '2026-11-03');
  eq('read three weeks later', C.resolve(b, at('2026-11-19T15:00:00Z')).date, '2026-11-24');
  eq('relativize', C.relativize('2026-11-03', 600, at('2026-10-29T15:00:00Z')), { w: 1, d: 1, m: 600 });
  eq('relativize a Saturday', C.relativize('2026-11-07', 600, at('2026-10-29T15:00:00Z')), null);
  // snapping keeps a booking on the grid and inside the day
  eq('snap off the grid', [C.snap({ d: 9, m: 607, dur: 22 }).d, C.snap({ d: 9, m: 607, dur: 22 }).m, C.snap({ d: 9, m: 607, dur: 22 }).dur], [4, 600, 15]);
  // the review: a perfect answer exists, a wrong one is marked
  const perfect = [
    { task: 'deposprep', d: 0, m: 585, dur: 90 }, { task: 'urgent', d: 0, m: 690, dur: 30 }, { task: 'consult', d: 0, m: 840, dur: 60, remind: true },
    { task: 'adjuster', d: 1, m: 840, dur: 30, meet: true }, { task: 'medprep', d: 2, m: 600, dur: 60 }, { task: 'strategy', d: 3, m: 780, dur: 60 },
    { task: 'records', d: 4, m: 540, dur: 60 }, { task: 'courthouse', d: 4, m: 630, dur: 45 }
  ].map(x => Object.assign({ desc: 'With the client, about the case', color: C.COLOR_RULE[x.dur] || '' }, x));
  const rv = C.review(perfect);
  if (rv.pct !== 100) fail(`the perfect week scores ${rv.pct}%: ${JSON.stringify(rv.items.filter(i => !i.perfect).map(i => [i.task, i.checks.filter(c => !c.ok).map(c => c.label)]))}`);
  const wrong = C.review([{ task: 'adjuster', d: 0, m: 600, dur: 30, color: 'tomato' }]).items.find(i => i.task === 'adjuster');
  ['Right day', 'Right time of day', 'Google Meet added', 'Right color for its length', 'Description added'].forEach(n => { if ((wrong.checks.find(c => c.label === n) || {}).ok !== false) fail(`a wrong adjuster call passes “${n}”`); });
  // the cloned week is frozen: nothing changes it at runtime
  try { C.WEEK.tasks[0].dur = 5; } catch (e) {}
  eq('the week is frozen', C.WEEK.tasks[0].dur, 60);
  return perfect;
}

async function workerChecks(perfect) {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const hooks = []; const realFetch = global.fetch;
  global.fetch = async (url, init) => { if (String(url).startsWith('https://hooks.test/')) { hooks.push({ url, init }); return new Response('ok'); } return realFetch(url, init); };
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off', CALWEEK_WEBHOOK_URL: 'https://hooks.test/calweek', CALWEEK_WEBHOOK_SECRET: 'whsec',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const waits = [];
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body || {}) }), env, { waitUntil(p) { waits.push(p); } }); return { status: res.status, body: await res.json().catch(() => null) }; };
  if ((await call('/api/calweek/now')).status !== 401) fail('the calendar API answers without a sign-in');
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const now = await call('/api/calweek/now', {}, t);
  if (now.status !== 200 || typeof now.body.now !== 'number' || !now.body.current || now.body.next.monday !== C.nextWeek(now.body.now).monday) fail(`/api/calweek/now: ${JSON.stringify(now)}`);
  const saved = await call('/api/calweek/save', { events: perfect, id: 'ben-diaz--b1' }, t);
  if (saved.status !== 200 || saved.body.review.pct !== 100) fail(`a trainee can't save the perfect week: ${JSON.stringify(saved.body && saved.body.review && saved.body.review.pct)}`);
  if (store.has('ft:calweek:ben-diaz--b1')) fail('a trainee saved into another trainee\'s record by naming them');
  const rec = JSON.parse(store.get('ft:calweek:ana-cruz--b1') || 'null');
  if (!rec || rec.anchor !== now.body.next.monday || rec.events.some(x => x.w !== 1 || 'date' in x || 'startUtc' in x)) fail(`the record keeps dates, not offsets: ${JSON.stringify(rec)}`);
  // the stored offsets are re-placed on next week whenever they are read
  if (saved.body.placed[0].at.monday !== now.body.next.monday) fail('the saved bookings are not placed on next week');
  // calweek:<id> is the controller's alone
  if ((await call('/api/storage/set', { key: 'calweek:ana-cruz--b1', value: JSON.stringify({ events: [] }) }, t)).status === 200) fail('a trainee wrote calweek:<id> around the controller');
  if ((await call('/api/storage/get', { key: 'calweek:ana-cruz--b1' }, t)).status === 200) fail('the storage API reads calweek:<id> for a trainee');
  if ((await call('/api/calweek/list', { ids: ['ana-cruz--b1'] }, t)).status !== 403) fail('a trainee lists everyone\'s calendars');
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  const list = await call('/api/calweek/list', { ids: ['ana-cruz--b1', 'nobody--b1'] }, at);
  if (list.status !== 200 || list.body.rows[0].review.pct !== 100 || list.body.rows[1].record !== null) fail(`the trainer's list: ${JSON.stringify(list.body && list.body.rows)}`);
  // submit: the webhook, signed, in the background
  await call('/api/calweek/save', { events: perfect, submit: true }, t); await Promise.all(waits);
  const h = hooks[hooks.length - 1], body = h && h.init.body;
  if (!h || JSON.parse(body).type !== 'calweek.submitted') fail(`no calweek.submitted webhook: ${JSON.stringify(hooks.map(x => x.init.body))}`);
  else {
    const crypto = require('crypto'); const want = 'sha256=' + crypto.createHmac('sha256', 'whsec').update(body).digest('hex');
    if (h.init.headers['X-LSH-Signature'] !== want) fail('the webhook signature does not match the body');
  }
  // a webhook that fails never fails the save
  global.fetch = async () => { throw new Error('down'); };
  if ((await call('/api/calweek/save', { events: perfect }, t)).status !== 200) fail('a failing webhook failed the save');
  global.fetch = realFetch;
}

(async () => {
  const perfect = coreChecks();
  await workerChecks(perfect);
  const { chromium } = require('playwright');
  const signIn = require('./sign-in.cjs');
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await signIn(page, 'Wendy', 'Week', 'B102926');
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('settings:opendays', { all: await page.evaluate(() => DAYS.map(d => d.id)), batches: {} });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);

  // the Practice Lab: the renamed session and the new card
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(600);
  const lab = await page.evaluate(() => [...document.querySelectorAll('.fts-card h3')].map(h => h.textContent.trim()));
  if (!lab.some(t => /Standard Training - Appointment Setting Mock Calls/.test(t))) fail(`the Practice Session isn't renamed: ${JSON.stringify(lab)}`);
  if (lab.some(t => /Calendaring Practice Lab/.test(t))) fail('the old name is still on the Practice Lab');
  if (!lab.some(t => /Standard Training - Calendaring Activity/.test(t))) fail(`no Calendaring Activity card: ${JSON.stringify(lab)}`);

  // the page opens on this week, from the server's clock
  await page.evaluate(() => goto('calweek')); await page.waitForTimeout(1200);
  const v = await page.evaluate(() => ({ h: (document.querySelector('.cw-hero h1') || {}).textContent, bar: (document.querySelector('.cw-bar b') || {}).textContent, cur: FTCalWeek.state().data && FTCalWeek.state().data.current.label, cols: document.querySelectorAll('.cw-col').length, links: [...document.querySelectorAll('.cw-links button, .cw-links a')].map(b => b.textContent) }));
  if (!/Standard Training - Calendaring Activity/.test(v.h || '')) fail(`the page title: ${v.h}`);
  if (!v.cur || v.bar !== v.cur || v.cols !== 5) fail(`the default view isn't this work week: ${JSON.stringify(v)}`);
  if (!v.links.some(t => /Attorney Calendar Management Activity/.test(t))) fail(`no link to the Attorney Calendar Management Activity: ${JSON.stringify(v.links)}`);

  // book a task: it lands on next week and is checked
  await page.evaluate(() => FTCalWeek.edit('urgent')); await page.waitForTimeout(300);
  await page.selectOption('#cwDay', '1'); await page.selectOption('#cwStart', '810'); await page.selectOption('#cwLen', '30'); await page.selectOption('#cwColor', 'tangerine');
  await page.fill('#cwDesc', 'Call Mrs. Garcia back about her case');
  await page.evaluate(() => FTCalWeek.book()); await page.waitForTimeout(1200);
  const b = await page.evaluate(() => { const d = FTCalWeek.state().data; return { ev: d.record && d.record.events, next: d.next.monday, placed: d.placed[0] && d.placed[0].at, mine: document.querySelectorAll('.cw-ev.cw-mine').length, ok: !!document.querySelector('.cw-task.ok') }; });
  if (!b.ev || b.ev.length !== 1 || b.ev[0].w !== 1 || b.ev[0].d !== 1 || b.ev[0].m !== 810) fail(`the booking wasn't saved as an offset: ${JSON.stringify(b.ev)}`);
  if (!b.placed || b.placed.monday !== b.next || b.placed.day !== 'Tuesday') fail(`the booking isn't on next Tuesday: ${JSON.stringify(b)}`);
  if (b.mine !== 1 || !b.ok) fail(`the booking isn't on next week's grid, checked: ${JSON.stringify(b)}`);

  // Day 5 links to it: the dashboard's day item and the Attorney Calendar Management Activity slide
  const day5 = await page.evaluate(() => (FTDays.of(5) || {}).items.map(i => i.id || ''));
  if (!day5.includes('calweek')) fail(`Day 5 doesn't list the Calendaring Activity: ${JSON.stringify(day5)}`);
  await page.evaluate(() => FTCalWeek.attorneyActivity()); await page.waitForTimeout(1500);
  const slide = await page.evaluate(() => ({ view: state.view, acts: [...document.querySelectorAll('.ftdd-acts button')].map(b => b.textContent) }));
  if (slide.view !== 'daydeck' || !slide.acts.some(t => /Standard Training - Calendaring Activity/.test(t))) fail(`the Attorney Calendar Management Activity slide doesn't link back: ${JSON.stringify(slide)}`);

  await browser.close();
  if (failures.length) { console.error('✗ ' + failures.join('\n✗ ')); process.exit(1); }
  console.log('✓ Standard Training - Calendaring Activity: the week resolver, the relative engine, the controller, the page and the links');
})().catch(e => { console.error(e); process.exit(1); });
