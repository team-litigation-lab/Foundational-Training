// 📅 Calendar Mock Call booking rule check (js/ft-calrules.js): every scheduling rule of the guide's Day 6 scenarios on
//   crafted bookings (consult days and the daily cap, phone hours, follow-ups, length limits, the buffer around other
//   bookings and lunch, same-day approval, the alternatives, the title, the format, the notes, EST and the reminder); a
//   trainee records a booking from the Practice Lab card, sees it checked, saved in calrules:<id> and on My Performance;
//   Day 6 points to it; the trainer's 📅 Booking Rules tab lists it and Trainer Inputs fills the Calendar Management
//   Mock Call scorecard's rule criteria from it (never over a typed score); the worker keeps calrules:<id> the trainee's own.
// Usage: NODE_PATH=…/node_modules node .github/scripts/calrules.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B102926';
const failures = []; const fail = m => failures.push(m);

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t);
  if ((await set('calrules:ana-cruz--b1', { bookings: [{ id: 'b1', scn: 'new-pi', pct: 100 }] })).status !== 200) fail('a trainee can\'t save their own bookings');
  if ((await set('calrules:ana-cruz--b1', { bookings: 'x' })).status === 200) fail('a booking log without a bookings list was saved');
  if ((await set('calrules:ben-diaz--b1', { bookings: [] })).status === 200) fail('a trainee wrote another trainee\'s booking log');
  if ((await set('settings:calrules', { lunch: '' })).status === 200) fail('a trainee changed the attorney\'s lunch hour');
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  if ((await set('settings:calrules', { lunch: '12:00-13:00' }, at)).status !== 200) fail('the trainer can\'t save the lunch hour');
  else if (!JSON.parse(((await call('/api/storage/get', { key: 'settings:calrules' }, t)).body || {}).value || 'null')) fail('a trainee can\'t read the lunch hour');
}

(async () => {
  await workerChecks();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('dialog', d => d.accept());
  const put = (k, value) => page.evaluate(([k, value]) => fetch('/api/storage/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k, value: JSON.stringify(value) }) }), [k, value]);
  const get = k => page.evaluate(async k => JSON.parse((await fetch('/api/storage/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: k }) }).then(r => r.json())).value || 'null'), k);
  await page.goto(BASE, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await put('settings:calrules', { lunch: '12:00-13:00' });
  await signIn(page, 'Cara', 'Calendar', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('calrules:' + id, null);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);

  // every rule, on crafted bookings
  const bad = await page.evaluate(() => {
    const out = [], iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const next = wd => { const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() !== wd) d.setDate(d.getDate() + 1); return iso(d); };
    const tue = next(2), mon = next(1), wed = next(3);
    const base = { mode: 'practice', client: 'Jane Test', callback: '(702) 555-0142', dob: '1985-04-02', dol: '2026-03-02', tone: 'Anxious', est: true, reminder: true, notes: 'New PI case; rear-ended on I-15, wants a call after work. Anxious caller.', at: new Date().toISOString(), on: iso(new Date()) };
    const B = o => Object.assign({ id: 'x' + Math.random() }, base, o);
    const res = (b, others) => { const c = FTCalRules.check(b, others || []); return { c, by: n => (c.find(x => x[0].startsWith(n)) || [])[1], s: FTCalRules.score(c) }; };
    const expect = (label, got, want) => { if (got !== want) out.push(`${label}: got ${got}, expected ${want}`); };
    // a correct new client consult: everything that applies is met
    const good = B({ scn: 'new-pi', format: 'Phone', date: tue, start: '10:00', length: '30', title: 'Client Consultation: New PI Case – Jane Test' });
    const g = res(good); if (g.s.pct !== 100) out.push(`a correct booking scores ${g.s.pct}%: ${JSON.stringify(g.c.filter(x => x[1] === false).map(x => x[0]))}`);
    // the same consult on a Monday at 4 PM, an hour long, by video, no reminder, no EST, a loose title
    const w = res(B({ scn: 'new-pi', format: 'Video', date: mon, start: '16:00', length: '60', title: 'Consultation Jane', est: false, reminder: false }));
    ['Within the meeting', 'New client consults on a Tuesday', 'The calendar in EST', 'The title', 'The meeting format', 'An email reminder'].forEach(n => expect(`wrong booking: ${n}`, w.by(n), false));
    expect('phone hours on a video booking', w.by('Phone consults between'), null);
    // phone hours: 2:45 PM for 30 minutes runs past 3:00
    expect('phone consult ending 3:15 PM', res(B({ scn: 'phone-consult', format: 'Phone', date: wed, start: '14:45', length: '30' })).by('Phone consults between'), false);
    expect('phone consult at 9:15 AM', res(B({ scn: 'phone-consult', format: 'Phone', date: wed, start: '09:15', length: '30' })).by('Phone consults between'), false);
    expect('phone consult at 2:30 PM', res(B({ scn: 'phone-consult', format: 'Phone', date: wed, start: '14:30', length: '30' })).by('Phone consults between'), true);
    // the buffer: 10:30 right after a 10:00–10:30 booking; 10:45 is clear; lunch 12–1
    expect('no buffer after another booking', res(B({ scn: 'status', format: 'Phone', date: tue, start: '10:30', length: '30' }), [good]).by('A 15-minute buffer'), false);
    expect('buffer kept', res(B({ scn: 'status', format: 'Phone', date: tue, start: '10:45', length: '30' }), [good]).by('A 15-minute buffer'), true);
    expect('over lunch', res(B({ scn: 'status', format: 'Phone', date: wed, start: '12:30', length: '30' })).by('A 15-minute buffer'), false);
    expect('right at the end of lunch', res(B({ scn: 'status', format: 'Phone', date: wed, start: '13:00', length: '30' })).by('A 15-minute buffer'), false);
    expect('15 minutes after lunch', res(B({ scn: 'status', format: 'Phone', date: wed, start: '13:15', length: '30' })).by('A 15-minute buffer'), true);
    // at most 3 new consults a day
    const three = ['09:30', '10:30', '11:15'].map(t => B({ scn: 'new-intake', format: 'Phone', date: tue, start: t, length: '30' }));
    expect('a fourth new consult', res(B({ scn: 'case-review', format: 'Phone', date: tue, start: '14:00', length: '30' }), three).by('At most 3'), false);
    expect('a third new consult', res(B({ scn: 'case-review', format: 'Phone', date: tue, start: '14:00', length: '30' }), three.slice(1)).by('At most 3'), true);
    expect('the daily cap on a meeting that isn\'t a new consult', res(B({ scn: 'status', format: 'Phone', date: tue, start: '14:00', length: '30' }), three).by('At most 3'), null);
    // follow-ups not in the morning
    expect('follow-up at 10 AM', res(B({ scn: 'follow-up', format: 'Phone', date: wed, start: '10:00', length: '30' })).by('Follow-ups not'), false);
    expect('follow-up at 1:30 PM', res(B({ scn: 'follow-up', format: 'Phone', date: wed, start: '13:30', length: '30' })).by('Follow-ups not'), true);
    // length limits
    expect('a 45-minute strategy meeting', res(B({ scn: 'strategy', format: 'Video', date: wed, start: '09:00', length: '45' })).by('Within the meeting'), true);
    expect('an hour-long strategy meeting', res(B({ scn: 'strategy', format: 'Video', date: wed, start: '09:00', length: '60' })).by('Within the meeting'), false);
    expect('an hour-long conference', res(B({ scn: 'discovery', format: 'Video', date: wed, start: '09:00', length: '60' })).by('Within the meeting'), true);
    // the format the guide names: the signing is in-office, the document review a Zoom (video) meeting
    expect('signing by phone', res(B({ scn: 'signing', format: 'Phone', date: wed, start: '09:00', length: '30' })).by('The meeting format'), false);
    expect('document review by video', res(B({ scn: 'doc-review', format: 'Video', date: wed, start: '13:30', length: '30' })).by('The meeting format'), true);
    // same-day bookings need the attorney's approval
    const today = iso(new Date());
    expect('same day, not approved', res(B({ scn: 'urgent', format: 'Phone', date: today, start: '15:30', length: '30' })).by('Same-day'), false);
    expect('same day, approved', res(B({ scn: 'urgent', format: 'Phone', date: today, start: '15:30', length: '30', approved: true })).by('Same-day'), true);
    expect('another day', res(B({ scn: 'urgent', format: 'Phone', date: wed, start: '15:30', length: '30' })).by('Same-day'), null);
    // 2–3 alternatives when the slot was taken
    expect('one alternative', res(B({ scn: 'status', format: 'Phone', date: wed, start: '09:00', length: '30', unavailable: true, alts: 'Wed 2 PM' })).by('2–3 alternative'), false);
    expect('two alternatives', res(B({ scn: 'status', format: 'Phone', date: wed, start: '09:00', length: '30', unavailable: true, alts: 'Wed 2 PM, Thu 10 AM' })).by('2–3 alternative'), true);
    expect('four alternatives', res(B({ scn: 'status', format: 'Phone', date: wed, start: '09:00', length: '30', unavailable: true, alts: 'a\nb\nc\nd' })).by('2–3 alternative'), false);
    // the caller's details: DOB after DOL, a short number, thin notes
    expect('DOB after the DOL', res(B({ scn: 'status', format: 'Phone', date: wed, start: '09:00', length: '30', dob: '2026-05-01' })).by('The caller'), false);
    expect('a short callback number', res(B({ scn: 'status', format: 'Phone', date: wed, start: '09:00', length: '30', callback: '555-0142' })).by('The caller'), false);
    expect('notes without the caller\'s tone', res(B({ scn: 'status', format: 'Phone', date: wed, start: '09:00', length: '30', tone: '' })).by('Notes with'), false);
    expect('a weekend', res(B({ scn: 'status', format: 'Phone', date: next(6), start: '09:00', length: '30' })).by('On a weekday'), false);
    return { out, tue };
  });
  bad.out.forEach(fail);

  // the Practice Lab card and Day 6
  await page.evaluate(() => goto('simulators')); await page.waitForTimeout(800);
  if (!(await page.$('text=Check a booking'))) fail('the Practice Lab has no 📅 Booking Rule Check card');
  if (!(await page.evaluate(() => (FTDays.of(6).items || []).some(x => x.at === 'tool' && x.id === 'calrules')))) fail('Day 6 doesn\'t point to the Booking Rule Check');

  // a trainee records a booking with the trainer: a correct one but the reminder (12 rules apply to it)
  await page.click('text=Check a booking'); await page.waitForTimeout(900);
  if (await page.evaluate(() => state.view) !== 'calrules') fail('the card doesn\'t open #/calrules');
  await page.selectOption('#crMode', 'trainer');
  await page.selectOption('#crScn', 'new-pi'); await page.waitForTimeout(300);
  if (await page.inputValue('#crLength') !== '30' || await page.inputValue('#crFormat') !== 'Phone') fail('picking a consult doesn\'t fill its length and the phone format');
  await page.fill('#crClient', 'Jane Test'); await page.fill('#crCallback', '(702) 555-0142');
  await page.fill('#crDob', '1985-04-02'); await page.fill('#crDol', '2026-03-02'); await page.selectOption('#crTone', 'Anxious');
  await page.fill('#crDate', bad.tue); await page.fill('#crStart', '10:00');
  await page.fill('#crTitle', 'Client Consultation: New PI Case – Jane Test');
  await page.fill('#crNotes', 'New PI case; rear-ended on I-15, prefers a morning call. Anxious caller.');
  await page.check('#crEst');
  await page.click('text=✓ Check the booking'); await page.waitForTimeout(1500);
  const shown = await page.evaluate(() => (document.querySelector('.cr-book') || {}).innerText || '');
  if (!/92%/.test(shown) || !/11 of 12 rules/.test(shown) || !/An email reminder a day before/.test(shown)) fail(`the booking isn't shown checked with the reminder missed: ${shown.slice(0, 300)}`);
  const rec = await get('calrules:' + id);
  if (!rec || rec.bookings.length !== 1 || rec.bookings[0].pct !== 92 || rec.bookings[0].mode !== 'trainer') fail(`the booking wasn't saved: ${JSON.stringify(rec)}`);
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  if (!/Calendar booking rules[\s\S]*Mock call with the trainer[\s\S]*92%/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🏅 My Performance doesn\'t show the booking check');

  // the trainer: 📅 Booking Rules, and Trainer Inputs filling the scorecard's rule criteria
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'calrules'; FTCalRulesAdmin.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  await page.evaluate(b => FTCalRulesAdmin.batch(b), BATCH); await page.waitForTimeout(400);
  const tab = await page.evaluate(() => (document.querySelector('.cr-admin') || {}).innerText || '');
  if (!/Cara Calendar[\s\S]*92%/.test(tab) || !/An email reminder a day before \(1\)/.test(tab)) fail(`the 📅 Booking Rules tab doesn't list the booking: ${tab.slice(0, 400)}`);
  await page.evaluate(() => { state.adminTab = 'trainerinputs'; FTSessionsAdmin.reload && FTSessionsAdmin.reload(); render(); }); await page.waitForTimeout(2500);
  await page.evaluate(b => FTSessionsAdmin.batch(b), BATCH); await page.waitForTimeout(600);
  await page.evaluate(id => FTInputs.cell(id, 'calendar-live'), id); await page.waitForTimeout(1800);
  const assist = await page.evaluate(() => (document.querySelector('.cr-assist') || {}).innerText || '');
  if (!/11 of 12 rules met/.test(assist)) fail(`Trainer Inputs doesn't show the booking check: ${assist}`);
  // a score already typed is kept
  const slotIdx = await page.evaluate(() => FT_RUBRICS.list.calendar.criteria.findIndex(k => /Slot Identification/.test(k.n)));
  await page.fill(`.ti-rub-tbl input[data-crit="${slotIdx}"]`, '3');
  await page.click('.cr-assist button'); await page.waitForTimeout(400);
  const vals = await page.evaluate(() => FT_RUBRICS.list.calendar.criteria.map((k, i) => [k.n, (document.querySelector(`.ti-rub-tbl input[data-crit="${i}"]`) || {}).value]));
  const v = n => (vals.find(x => new RegExp(n).test(x[0])) || [])[1];
  if (v('Slot Identification') !== '3') fail(`a typed score was overwritten: ${v('Slot Identification')}`);
  if (v('Information Verification') !== '5' || v('Calendar Creation') !== '4') fail(`the rule criteria weren't filled from the check: ${JSON.stringify(vals)}`);
  if (v('Alternative Time') !== '') fail('the alternatives criterion was filled though the slot wasn\'t taken');
  if (v('Professional Introduction') !== '') fail('a call criterion was filled from the booking check');
  if (!/\d/.test(await page.evaluate(() => (document.querySelector('[data-avg]') || {}).innerText || ''))) fail('the weighted average didn\'t follow the filled criteria');

  await put('calrules:' + id, null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Booking Rule Check test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Booking Rule Check test passed (every scheduling rule on crafted bookings; the Practice Lab card and Day 6; a booking recorded, checked, saved and on My Performance; the trainer\'s tab and Trainer Inputs filling the rule criteria, never over a typed score; the worker\'s rules).');
})().catch(e => { console.error(e); process.exit(1); });
