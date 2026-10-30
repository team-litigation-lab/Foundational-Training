// 📅 Calendar Activity Check (js/ft-calcheck.js): Day 5's Attorney Calendar Management Activity, field by field. The
//   activity's answer key entered in full scores 100%; a wrong time zone, a wrong time, a missing guest and a wrong
//   reminder each fail exactly that field of that event; the accepted alternatives pass (Phoenix for MST, Panama for EST,
//   the same moment typed in Pacific, 1 day = 24 hours, 1 hour = 60 minutes, an all-day or overnight stay, titles in any case or dashes); events with no
//   guests or reminder aren't marked down; no screenshots or folder lookup are asked for; a trainee's draft
//   saves as they type and comes back after a reload, is sent to the trainer, shows on My Performance and the trainer's
//   📅 Calendar Activity tab; the Day 5 slide and the Practice Lab point to it; the page fits a phone; the worker keeps
//   calcheck:<id> the trainee's own and in shape. Also: a travel block's reminder counts on either of its events, a
//   flight named the wrong way round fails its title, Drive times that tie don't vouch for the order, a failed read
//   never wipes the draft, a trainee's HTML or a broken record never reaches or breaks the trainer's tab (which scores
//   each submission's snapshot again, not the score the page stored), and a trainer sees the 👁 Trainee view.
//   The anchor: the key moved by whole weeks to a trainee's anchor Monday (keyFor, the same objects each time, July's is the
//   key itself); at 2026-11-02 (winter, 17 weeks on) the answer key at its dates scores 100%, standard time counts (9:00 AM
//   Pacific, Panama's summer moment for the 11:00 AM EST deposition, is wrong in November), the zones' offsets are the date's,
//   a snapshot is scored at its own anchor; a trainee of batch B102626 with no records gets 2026-11-02 written to calsim:<id>
//   and sees November's dates; the checks above run at July's (the trainee's calendar record anchored at 2026-07-06).
// Usage: NODE_PATH=…/node_modules node .github/scripts/calcheck.cjs http://localhost:8787/
const { chromium } = require('playwright');
const path = require('path');
const { pathToFileURL } = require('url');
const signIn = require('./sign-in.cjs');
const BASE = process.argv[2] || 'http://localhost:8787/';
const BATCH = 'B102927';
const failures = []; const fail = m => failures.push(m);

async function workerChecks() {
  const worker = (await import(pathToFileURL(path.join(process.cwd(), 'worker.js')).href)).default;
  const store = new Map([['ft:trainee:ana-cruz--b1', JSON.stringify({ id: 'ana-cruz--b1', name: 'Ana Cruz', batch: 'B1', approved: true })]]);
  const env = { MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci-secret', PORTAL_ONLY: 'off',
    LSH_KV: { get: async (k) => store.has(k) ? store.get(k) : null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k), list: async ({ prefix = '' } = {}) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) } };
  const call = async (p, body, token) => { const res = await worker.fetch(new Request('http://x' + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) }), env, { waitUntil() {} }); return { status: res.status, body: await res.json().catch(() => null) }; };
  const t = (await call('/api/auth/trainee', { name: 'Ana Cruz', batch: 'B1' })).body.token;
  const set = (k, v, tok) => call('/api/storage/set', { key: k, value: JSON.stringify(v) }, tok || t);
  const read = (k, tok) => call('/api/storage/get', { key: k }, tok || t);
  if ((await set('calcheck:ana-cruz--b1', { entries: { 1: { title: 'Client Meeting' } }, final: {}, submits: [] })).status !== 200) fail('a trainee can\'t save their own calendar activity');
  if ((await read('calcheck:ana-cruz--b1')).status !== 200) fail('a trainee can\'t read their own calendar activity');
  if ((await set('calcheck:ana-cruz--b1', { entries: [] })).status === 200) fail('a calendar activity without its entries was saved');
  if ((await set('calcheck:ana-cruz--b1', { entries: {}, submits: 'x' })).status === 200) fail('a calendar activity with a broken submissions list was saved');
  if ((await set('calcheck:ana-cruz--b1', { entries: {}, submits: ['x'] })).status === 200) fail('a calendar activity with a submission that isn\'t an object was saved');
  if ((await set('calcheck:ana-cruz--b1', { entries: { 1: null } })).status === 200) fail('a calendar activity with an empty event was saved');
  if ((await set('calcheck:ana-cruz--b1', { entries: {}, submits: [{ at: 'x', met: '<b>9</b>', total: 1, pct: '<img src=x>', checks: [] , snap: { entries: {} } }] })).status === 200) fail('a submission with HTML for its score was saved');
  if ((await set('calcheck:ana-cruz--b1', { entries: {}, submits: [{ at: 'x', met: 1, total: 1, pct: 100, checks: [] }] })).status === 200) fail('a submission without its snapshot was saved');
  if ((await set('calcheck:ana-cruz--b1', { entries: {}, submits: [{ at: 'x', met: 1, total: 1, pct: 100, checks: [['1', 'Title', true, '']], snap: { entries: { 1: { title: 'Client Meeting' } }, final: {} } }] })).status !== 200) fail('a well-formed submission wasn\'t saved');
  if ((await set('calcheck:ben-diaz--b1', { entries: {} })).status === 200) fail('a trainee wrote another trainee\'s calendar activity');
  if ((await read('calcheck:ben-diaz--b1')).status === 200) fail('a trainee read another trainee\'s calendar activity');
  const at = (await call('/api/auth/admin', { passphrase: 'ci-pass' })).body.token;
  if (!JSON.parse(((await read('calcheck:ana-cruz--b1', at)).body || {}).value || 'null')) fail('the trainer can\'t read a trainee\'s calendar activity');
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
  await signIn(page, 'Cleo', 'Checker', BATCH);
  const id = await page.evaluate(() => state.traineeId);
  const r0 = await get('trainee:' + id); r0.approved = true; r0.archived = false; await put('trainee:' + id, r0);
  await put('calcheck:' + id, null);
  // (the July checks: the trainee's calendar record holds the activity's own dates)
  await put('calsim:' + id, { v: 2, drafts: {}, autos: [], submissions: [], reviews: {}, external: [], anchors: { 'attorney-activity': '2026-07-06' } });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);

  // the answer key, entered as a trainee would, and what each change does
  const pure = await page.evaluate(() => {
    const out = [], TZ = { PST: 'America/Los_Angeles', MST: 'America/Denver', EST: 'America/New_York', CST: 'America/Chicago' };
    const entry = k => ({ title: `${k.n} ${k.name}`, sd: k.date, ed: k.overnight ? k.date : k.endDate || k.date, st: k.start || '', et: k.end || '', allday: !!k.overnight, tz: TZ[k.tz],
      loc: k.locShow || '', guests: (k.guests || []).join(', '), rtype: k.rem ? k.rem.type : '', ramt: k.rem ? String(k.rem.m % 1440 === 0 ? k.rem.m / 1440 : k.rem.m % 60 === 0 ? k.rem.m / 60 : k.rem.m) : '',
      runit: k.rem ? (k.rem.m % 1440 === 0 ? 'days' : k.rem.m % 60 === 0 ? 'hours' : 'minutes') : 'minutes', notes: (k.notesShow || '') + (k.link ? ' Zoom link for remote attendees: ' + k.link : '') });
    const right = () => { const entries = {}; FTCalCheck.key.forEach(k => { entries[k.n] = entry(k); }); return { anchor: '2026-07-06', entries }; };
    const failed = rec => FTCalCheck.checkAll(rec).filter(c => c[2] === false).map(c => `${c[0]}:${c[1]}`);
    const expect = (label, rec, want) => { const got = failed(rec).join(' | '); if (got !== want.join(' | ')) out.push(`${label}: failed [${got}], expected [${want.join(' | ')}]`); };
    const change = (n, o) => { const r = right(); Object.assign(r.entries[n], o); return r; };
    const full = FTCalCheck.score(FTCalCheck.checkAll(right()));
    if (full.pct !== 100) out.push(`the answer key scores ${full.pct}%: ${failed(right()).join('; ')}`);
    expect('the answer key', right(), []);
    // one wrong field fails exactly that field of that event
    expect('a wrong time zone (Mountain for the Pacific client meeting)', change('1', { tz: 'America/Denver' }), ['1:Time zone']);
    expect('a wrong zone (Philippine Time)', change('9', { tz: 'Asia/Manila' }), ['9:Time zone']);
    expect('a wrong start time', change('2', { st: '14:00' }), ['2:Start time']);
    expect('a wrong end time', change('6.1', { et: '11:00' }), ['6.1:End time']);
    expect('a wrong date', change('5', { sd: '2026-07-10', ed: '2026-07-10' }), ['5:Start date', '5:End date']);
    expect('an end before the start', change('4', { st: '07:30', et: '06:30' }), ['4:Start time', '4:End time', '4:Ends after it starts']);
    expect('a missing guest', change('7', { guests: 'Martin Anthony, Michelle Velarde, John Michael Dela Cruz' }), ['7:Guests']);
    expect('a wrong reminder time', change('9', { ramt: '15' }), ['9:Reminder time']);
    expect('a wrong reminder type', change('2', { rtype: 'Notification' }), ['2:Reminder type']);
    expect('no reminder', change('10', { rtype: '', ramt: '' }), ['10:Reminder type', '10:Reminder time']);
    expect('a wrong location', change('1', { loc: 'Conference Room A' }), ['1:Location']);
    expect('the deposition without its Zoom link', change('3', { notes: 'Deposition preparation with another attorney.' }), ['3:Zoom link for remote attendees']);
    expect('a title without the event', change('9', { title: 'Meeting' }), ['9:Title']);
    expect('notes without the key words', change('10', { notes: 'Dinner.' }), ['10:Description']);
    expect('a timed event marked all day', change('1', { allday: true }), ['1:Start time', '1:End time']);
    // no screenshots are asked for any more: an older record's whole-calendar and upload ticks are neither scored nor needed
    expect('an older record with its screenshot ticks unticked', Object.assign(right(), { final: { lsh: false, seq: false }, drive: { error: 'no-folder' } }), []);
    if (FTCalCheck.checkAll(right()).some(c => c[0] === '11')) out.push('the 19th screenshot and the upload are still scored');
    // the accepted alternatives
    expect('Phoenix for MST', change('2', { tz: 'America/Phoenix' }), []);
    expect('Panama for EST', change('3', { tz: 'America/Panama' }), []);
    expect('Regina for CST', change('7', { tz: 'America/Regina' }), []);
    // the attorney's calendar is in Pacific: the same moment typed in Pacific counts; the activity's clock time in Pacific doesn't
    expect('the team meeting in Pacific at the same moment', change('2', { tz: 'America/Los_Angeles', st: '14:00', et: '15:00' }), []);
    expect('the gym in Pacific at the same moment', change('4', { tz: 'America/Los_Angeles', st: '03:30', et: '04:30' }), []);
    expect('the team meeting at its MST clock time in Pacific', change('2', { tz: 'America/Los_Angeles' }), ['2:Time zone']);
    // EST in Panama (accepted) is 9:00 AM Pacific; in New York, 8:00 AM: the same moment as either counts. MST in Phoenix falls on
    // the activity's 3:00 PM clock time, which stays the wrong zone (above)
    expect('the deposition in Pacific at Panama\'s moment', change('3', { tz: 'America/Los_Angeles', st: '09:00', et: '11:00' }), []);
    expect('the deposition in Pacific at New York\'s moment', change('3', { tz: 'America/Los_Angeles', st: '08:00', et: '10:00' }), []);
    expect('the deposition in Pacific half an hour late', change('3', { tz: 'America/Los_Angeles', st: '08:30', et: '10:30' }), ['3:Start time', '3:End time']);
    expect('1 day as 24 hours', change('3', { ramt: '24', runit: 'hours' }), []);
    expect('1 hour as 60 minutes', change('10', { ramt: '60', runit: 'minutes' }), []);
    expect('titles in another case, with dashes and the client', change('1', { title: 'CLIENT-MEETING – Alyssa Lynn Arehart' }), []);
    expect('Doctors without the apostrophe', change('5', { title: 'Doctors Appointment' }), []);
    expect('guests in another order, with emails', change('1', { guests: 'velarde michelle (michelle.velarde@x.com),   Martin Anthony Gan' }), []);
    expect('the overnight stay through the night', change('8.5', { allday: false, sd: '2026-07-13', st: '21:00', ed: '2026-07-14', et: '08:00', tz: 'America/Los_Angeles' }), []);
    expect('the overnight stay all day ending the 14th', change('8.5', { ed: '2026-07-14' }), []);
    expect('the overnight stay on the wrong night', change('8.5', { sd: '2026-07-14', ed: '2026-07-14' }), ['8.5:Start date']);
    expect('the overnight stay with no location', change('8.5', { loc: '' }), []);
    // a travel block's reminder and notes count on either of its two events
    const moved = right(); ['rtype', 'ramt', 'runit', 'notes'].forEach(f => { moved.entries['8.2'][f] = moved.entries['8.3'][f]; moved.entries['8.7'][f] = moved.entries['8.6'][f]; moved.entries['8.3'][f] = moved.entries['8.6'][f] = f === 'runit' ? 'minutes' : ''; });
    expect('the travel reminders on 8.2 and 8.7', moved, []);
    const none = right(); ['rtype', 'ramt', 'notes'].forEach(f => { none.entries['8.3'][f] = ''; });
    expect('no outbound travel reminder at all', none, ['8.3:Reminder type', '8.3:Reminder time', '8.3:Description']);
    // a flight or travel block named the wrong way round
    expect('the return flight named the outbound way', change('8.7', { title: '8.7 Flight from Seattle to San Francisco' }), ['8.7:Title']);
    expect('the outbound flight named the return way', change('8.3', { title: 'Flight SFO to SEA' }), ['8.3:Title']);
    expect('the outbound flight without from or to', change('8.3', { title: 'Flight Seattle - San Francisco' }), []);
    expect('the travel to court named as the return', change('6.2', { title: 'Return travel from court' }), ['6.2:Title']);
    // the zone's fix says which region, and never warns off the fixed-offset zones it accepts
    const zfix = FTCalCheck.check(FTCalCheck.key[0], { tz: 'America/Phoenix' }).find(c => c[0] === 'Time zone')[2];
    if (/fixed offset/.test(zfix) || !/Pacific zone/.test(zfix)) out.push(`the time zone's fix reads: ${zfix}`);
    const gfix = FTCalCheck.check(FTCalCheck.key[1], { guests: 'martin@lsh.com' }).find(c => c[0] === 'Guests')[2];
    if (!/by name/.test(gfix)) out.push(`the guests' fix doesn't ask for names: ${gfix}`);
    // an empty record and the answer key count the same fields
    const empty = FTCalCheck.score(FTCalCheck.checkAll({ entries: {}, final: {} }));
    if (empty.total !== full.total) out.push(`an empty record counts ${empty.total} fields, the answer key ${full.total}`);
    // nothing asked, nothing marked down: the gym has no guests, the travel blocks no reminder, location or notes
    expect('empty guests and a reminder nobody asked for', change('6.2', { guests: '', loc: '', notes: '', rtype: 'Email', ramt: '5' }), []);
    // ---------- the anchor: 2026-11-02, 17 weeks on (winter: standard time) ----------
    const NOV = '2026-11-02', KN = FTCalCheck.keyFor(NOV), wk = (iso, k) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 7 * 864e5).toISOString().slice(0, 10);
    if (FTCalCheck.keyFor('2026-07-06') !== FTCalCheck.key) out.push('keyFor(July 6, 2026) isn\'t the key itself');
    if (FTCalCheck.keyFor(NOV) !== KN || KN[0] !== FTCalCheck.keyFor(NOV)[0]) out.push('keyFor gives new objects for the same anchor');
    if (FTCalCheck.keyFor('2026-11-03') !== FTCalCheck.key || FTCalCheck.keyFor('2026-06-29') !== FTCalCheck.key) out.push('an anchor that isn\'t one doesn\'t fall back to July');
    if (FTCalCore.act.weeksOf(NOV) !== 17) out.push(`2026-11-02 is ${FTCalCore.act.weeksOf(NOV)} weeks on, not 17`);
    FTCalCheck.key.forEach((k, i) => { const n = KN[i];
      if (n.n !== k.n || n.date !== wk(k.date, 17) || (k.endDate ? n.endDate !== wk(k.endDate, 17) : n.endDate) || n.start !== k.start || n.tz !== k.tz) out.push(`${k.n} at 2026-11-02: ${JSON.stringify([n.date, n.endDate, n.start])}`); });
    if (KN[0].date !== '2026-11-02' || KN.find(k => k.n === '10').date !== '2026-11-11') out.push(`the anchored key runs ${KN[0].date} to ${KN[KN.length - 1].date}`);
    if (FTCalCheck.anchorOf({ anchor: NOV }) !== NOV || FTCalCheck.anchorOf({ entries: {} }) !== '2026-07-06' || FTCalCheck.anchorOf({ anchor: '2026-11-04' }) !== '2026-07-06') out.push('anchorOf doesn\'t read a record\'s anchor, July without one');
    const rightN = () => { const entries = {}; KN.forEach(k => { entries[k.n] = entry(k); }); return { anchor: NOV, entries }; };
    const changeN = (n, o) => { const r = rightN(); Object.assign(r.entries[n], o); return r; };
    const fullN = FTCalCheck.score(FTCalCheck.checkAll(rightN()));
    if (fullN.pct !== 100 || fullN.total !== full.total) out.push(`the answer key at 2026-11-02 scores ${fullN.pct}% over ${fullN.total}: ${failed(rightN()).join('; ')}`);
    expect('the answer key at 2026-11-02', rightN(), []);
    if (FTCalCheck.score(FTCalCheck.checkAll(Object.assign(rightN(), { anchor: undefined }), NOV)).pct !== 100) out.push('checkAll(rec, anchor) doesn\'t check at the anchor given');
    if (!failed(Object.assign(right(), { anchor: NOV })).some(f => /Start date/.test(f))) out.push('July\'s dates pass at 2026-11-02');
    expect('a wrong date at 2026-11-02', changeN('5', { sd: '2026-07-09', ed: '2026-07-09' }), ['5:Start date', '5:End date']);
    // standard time: 11:00 AM EST is 8:00 AM Pacific in New York and in Panama alike; Panama's summer 9:00 AM is wrong in November
    expect('the deposition in Pacific at New York\'s moment (November)', changeN('3', { tz: 'America/Los_Angeles', st: '08:00', et: '10:00' }), []);
    expect('the deposition in Pacific at 9:00 AM (Panama\'s summer moment) in November', changeN('3', { tz: 'America/Los_Angeles', st: '09:00', et: '11:00' }), ['3:Start time', '3:End time']);
    expect('Panama for EST in November', changeN('3', { tz: 'America/Panama' }), []);
    expect('the team meeting in Pacific at the same moment (November)', changeN('2', { tz: 'America/Los_Angeles', st: '14:00', et: '15:00' }), []);
    expect('the gym in Pacific at the same moment (November)', changeN('4', { tz: 'America/Los_Angeles', st: '03:30', et: '04:30' }), []);
    expect('the team meeting at its MST clock time in Pacific (November)', changeN('2', { tz: 'America/Los_Angeles' }), ['2:Time zone']);
    const pw = FTCalCheck.pacificTimes(KN.find(k => k.n === '3')).map(w => w.st).join(',');
    if (pw !== '08:00') out.push(`the deposition's Pacific times in November: ${pw}, expected 08:00 alone`);
    const fixN = FTCalCheck.check(KN.find(k => k.n === '3'), {}).find(c => c[0] === 'Start date')[2];
    if (fixN !== 'November 4, 2026') out.push(`the deposition's date at 2026-11-02 reads ${fixN}`);
    // the zones' offsets are the event's date's
    const lab = (d, id) => FTCalCheck.tzOpts(d).find(z => z[0] === id)[1];
    if (!/GMT-05:00/.test(lab('2026-11-04', 'America/New_York')) || !/GMT-04:00/.test(lab('2026-07-08', 'America/New_York')) || !/GMT-08:00/.test(lab('2026-11-02', 'America/Los_Angeles')) || !/GMT-07:00/.test(lab('2026-11-02', 'America/Phoenix')))
      out.push(`the zones' offsets: ${lab('2026-11-04', 'America/New_York')} / ${lab('2026-07-08', 'America/New_York')} / ${lab('2026-11-02', 'America/Los_Angeles')}`);
    if (FTCalCheck.tzOpts('2026-11-04').map(z => z[0]).join() !== FTCalCheck.zones.map(z => z[0]).join()) out.push('the zones\' options aren\'t the zones in order');
    // a submission is scored at its snapshot's anchor (one without, July)
    const perf = snap => (window.ftCalCheckItems({ rec: { 'calcheck:': { entries: {}, submits: [{ at: '2026-11-12T10:00:00Z', met: 0, total: 1, pct: 0, checks: [], snap }] } } })[0] || {}).pct;
    const sN = rightN(), sJ = right(); delete sJ.anchor;
    if (perf(sN) !== 100 || perf(sJ) !== 100 || perf(Object.assign(rightN(), { anchor: undefined })) === 100) out.push(`snapshots scored: November's ${perf(sN)}%, July's (no anchor) ${perf(sJ)}%`);
    return { out, total: full.total };
  });
  pure.out.forEach(fail);

  // the Practice Lab card and Day 5 (the Check's tile is on the activity's Time Zone & Submit slide, s3b: its card rows' slides)
  await page.evaluate(() => { state.ftOpenDays = { all: [1], batches: {} }; goto('simulators'); }); await page.waitForTimeout(800);
  if (await page.$('text=Check my calendar')) fail('the Calendar Activity Check shows on the Practice Lab before its day');
  await page.evaluate(() => { state.ftOpenDays = { all: [1, 2, 3, 4, 5], batches: {} }; goto('simulators'); }); await page.waitForTimeout(800);
  if (!(await page.$('text=Check my calendar'))) fail('the Practice Lab has no 📅 Calendar Activity Check card');
  if (!(await page.$('.fts-card button[onclick*="ftsCalsim(\'activity\')"]'))) fail('the Practice Lab\'s Attorney Calendar Management Activity card has no link to the Portal\'s Standard Training - Calendar Management Activity track');
  if (!(await page.evaluate(() => (FTDays.of(5).items || []).some(x => x.at === 'tool' && x.id === 'calcheck')))) fail('Day 5 doesn\'t point to the Calendar Activity Check');
  await page.evaluate(() => { state.adminPreview = true; FTDayDecks.open(5, FTDayDecks.at(5, 's3b')); }); await page.waitForTimeout(1600);
  const deck = await page.evaluate(() => ({ bar: document.querySelectorAll('.ftdd-acts, .ftdd-time').length, tile: !!document.querySelector('button.ftdd-tile[onclick*="calcheck"]'), portal: !!document.querySelector('button.ftdd-tile[onclick*="ftsCalsim(\'activity\')"]'), h: (document.querySelector('main') || {}).innerText.slice(0, 2000) }));
  if (deck.bar) fail('Day 5\'s Attorney Calendar Management Activity slide still has link pills on its bar');
  if (!deck.tile) fail('Day 5\'s Time Zone & Submit slide has no 📅 Calendar Activity Check tile');
  // (and the same activity on the Main Portal's Google Calendar Simulator, its Standard Training - Calendar Management Activity track)
  if (!deck.portal) fail('Day 5\'s activity slide doesn\'t link the Portal\'s Standard Training - Calendar Management Activity');
  // (the slide is read in pages: the tile comes last)
  for (let k = 0; k < 8 && !(await page.isVisible('button.ftdd-tile[onclick*="calcheck"]')); k++) { await page.evaluate(() => FTDayDecks.go(1)); await page.waitForTimeout(600); }
  await page.evaluate(() => { state.adminPreview = false; }); await page.click('button.ftdd-tile[onclick*="calcheck"]'); await page.waitForTimeout(1200);
  if (await page.evaluate(() => state.view) !== 'calcheck') fail('the Day 5 tile doesn\'t open #/calcheck');

  // the trainee types: each field is checked in place, and the draft saves
  await page.evaluate(() => goto('calcheck')); await page.waitForTimeout(1200);
  const fresh = await page.evaluate(() => ({ res: document.querySelector('[data-res="1"]').innerText, fix: !!document.querySelector('.cc-fix') }));
  if (/✗/.test(fresh.res) || !/Conference Room B/.test(fresh.res) || fresh.fix) fail(`an untouched event is marked wrong: ${fresh.res.slice(0, 200)}`);
  await page.fill('#cc-title-1', 'Client Meeting – Alyssa Lynn Arehart');
  await page.fill('#cc-sd-1', '2026-07-06'); await page.fill('#cc-st-1', '10:00'); await page.fill('#cc-ed-1', '2026-07-06'); await page.fill('#cc-et-1', '11:00');
  await page.selectOption('#cc-tz-1', 'America/New_York');
  await page.fill('#cc-loc-1', 'Conference Room B'); await page.fill('#cc-guests-1', 'Martin Anthony, Michelle Velarde');
  await page.selectOption('#cc-rtype-1', 'Notification'); await page.fill('#cc-ramt-1', '15');
  await page.fill('#cc-notes-1', 'Client consultation for Alyssa Lynn Arehart regarding a car accident case. Ensure all case documents are accessible.');
  await page.waitForTimeout(400);
  const live = await page.evaluate(() => ({ res: document.querySelector('[data-res="1"]').innerText, sc: document.querySelector('[data-sc="1"]').innerText, active: document.activeElement && document.activeElement.id }));
  if (!/✗\s*Time zone[\s\S]*Pacific Time - Los Angeles/.test(live.res) || (live.res.match(/✗/g) || []).length !== 1) fail(`the wrong time zone isn't the one ✗ shown: ${live.res}`);
  if (live.sc !== '11/12') fail(`the event's score reads ${live.sc}, expected 11/12`);
  await page.selectOption('#cc-tz-1', 'America/Los_Angeles'); await page.waitForTimeout(300);
  if (await page.evaluate(() => document.querySelector('[data-sc="1"]').innerText) !== '12/12') fail('fixing the time zone doesn\'t clear the ✗');
  await page.click('.cc-item[data-n="2"] > summary'); await page.fill('#cc-title-2', 'Team Meeting'); await page.waitForTimeout(1800);
  const draft = await get('calcheck:' + id);
  if (!draft || !draft.entries['1'] || draft.entries['1'].tz !== 'America/Los_Angeles' || draft.entries['2'].title !== 'Team Meeting' || (draft.submits || []).length) fail(`the draft wasn't saved as typed: ${JSON.stringify(draft)}`);
  // a failed read: the page says so and saves nothing, and the draft comes back on ↻ Try again
  await page.route('**/api/storage/get', async (route) => { const b = route.request().postData() || ''; if (/calcheck:/.test(b)) return route.fulfill({ status: 503, body: '{}' }); return route.continue(); });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);
  await page.evaluate(() => goto('calcheck')); await page.waitForTimeout(1500);
  if (!/Couldn’t load your draft/.test(await page.evaluate(() => document.querySelector('main').innerText)) || await page.$('#cc-title-1')) fail('a failed read shows an empty form');
  await page.evaluate(() => FTCalCheck.save()); await page.waitForTimeout(500);
  await page.unroute('**/api/storage/get');
  const kept = await get('calcheck:' + id);
  if (!kept || !kept.entries['1'] || kept.entries['1'].title !== 'Client Meeting – Alyssa Lynn Arehart') fail(`a failed read let the draft be overwritten: ${JSON.stringify(kept)}`);
  await page.click('text=↻ Try again'); await page.waitForTimeout(1500);
  if (await page.inputValue('#cc-title-1') !== 'Client Meeting – Alyssa Lynn Arehart' || await page.inputValue('#cc-tz-1') !== 'America/Los_Angeles') fail('the draft doesn\'t come back after a reload');
  // no screenshots: no 19th-screenshot item, no folder lookup
  if (await page.$('.cc-final') || /Look in my folder|19 screenshots/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('the Check still asks for the screenshots');

  // the phone: no sideways scroll
  await page.setViewportSize({ width: 380, height: 800 }); await page.waitForTimeout(500);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > 381) fail(`the page scrolls sideways on a phone: ${wide}px wide`);
  await page.setViewportSize({ width: 1366, height: 900 }); await page.waitForTimeout(300);

  // 📤 sent to the trainer
  await page.click('text=📤 Submit to my trainer'); await page.waitForTimeout(1500);
  const rec = await get('calcheck:' + id), s = rec && rec.submits && rec.submits[rec.submits.length - 1];
  // event 1 (12 fields) and event 2's title right, out of the answer key's fields
  const want = Math.round(13 / pure.total * 100);
  if (!s || s.met !== 13 || s.total !== pure.total || s.pct !== want || !s.at || !s.snap || !s.snap.entries['1']) fail(`the submission wasn't stamped and scored: ${JSON.stringify(s && { met: s.met, total: s.total, pct: s.pct, at: s.at })}, the key's total ${pure.total}`);
  if (!/Last sent/.test(await page.evaluate(() => document.querySelector('main').innerText))) fail('the page doesn\'t show when it was sent');
  await page.evaluate(() => goto('scorecard')); await page.waitForTimeout(2500);
  if (!new RegExp(`Calendar activity check[\\s\\S]*Attorney Calendar Management Activity[\\s\\S]*${want}%`).test(await page.evaluate(() => document.querySelector('main').innerText))) fail('🏅 My Performance doesn\'t show the calendar activity');

  // two more trainees for the trainer's tab: one storing HTML and a forged score, one with a broken record
  const forged = { id: 'xss-test--' + BATCH.toLowerCase(), name: 'Xss <i>Test</i>', batch: BATCH, approved: true }, broken = { id: 'broken-rec--' + BATCH.toLowerCase(), name: 'Broken Record', batch: BATCH, approved: true };
  await put('trainee:' + forged.id, forged); await put('trainee:' + broken.id, broken);
  await put('calcheck:' + forged.id, { entries: {}, submits: [{ at: '<img src=x onerror="window.__pwn=1">', pct: '<img src=x onerror="window.__pwn=2">', met: '<b id=pwnmet>9</b>', total: 1,
    checks: [['1', '<img src=x onerror="window.__pwn=3">', false, '<b id=pwnfix>x</b>']], snap: { entries: { 1: { title: '<img src=x onerror="window.__pwn=4">' } }, final: {} } }] });
  await put('calcheck:' + broken.id, { entries: { 1: null }, submits: ['x', { checks: 'y' }] });

  // the trainer: 📅 Calendar Activity, with every field's result
  await page.evaluate(() => { state.isAdmin = true; state.traineeId = null; state.adminData = null; state.adminTab = 'calcheck'; FTCalCheckAdmin.reload(); goto('admin'); });
  await page.waitForTimeout(2500);
  await page.evaluate(b => FTCalCheckAdmin.batch(b), BATCH); await page.waitForTimeout(400);
  await page.evaluate(id => FTCalCheckAdmin.open(id), id); await page.waitForTimeout(400);
  const tab = await page.evaluate(() => (document.querySelector('.cc-admin') || {}).innerText || '');
  await page.evaluate(id => FTCalCheckAdmin.open(id), forged.id); await page.waitForTimeout(400);
  const inj = await page.evaluate(() => ({ pwn: window.__pwn, tags: !!document.querySelector('.cc-admin #pwnmet, .cc-admin #pwnfix, .cc-admin img'), row: ([...document.querySelectorAll('.cc-admin tr')].find(t => /Xss/.test(t.innerText)) || {}).innerText || '' }));
  if (inj.pwn || inj.tags) fail(`a trainee's HTML reached the trainer's tab: ${JSON.stringify(inj)}`);
  if (/100%|9\//.test(inj.row) || !/0%/.test(inj.row)) fail(`the trainer's tab shows the score the page stored, not the snapshot's: ${inj.row}`);
  if (!/Broken Record/.test(tab)) fail('a broken record hid its trainee from the trainer\'s tab');
  if (!new RegExp(`Cleo Checker[\\s\\S]*${want}%`).test(tab) || !/1 Client Meeting[\s\S]*12\/12/.test(tab) || !/2 Team Meeting[\s\S]*Start date/.test(tab)) fail(`the 📅 Calendar Activity tab doesn't show the submission: ${tab.slice(0, 500)}`);

  // 👁 a trainer opening the page sees the Trainee view, and nothing is saved
  await page.evaluate(() => goto('calcheck')); await page.waitForTimeout(1200);
  const pv = await page.evaluate(() => ({ view: state.view, note: !!document.querySelector('.cc-preview') }));
  if (pv.view !== 'calcheck' || !pv.note) fail(`a trainer opening the Calendar Activity Check sees ${JSON.stringify(pv)}`);
  await page.fill('#cc-title-1', 'Trainer typing'); await page.waitForTimeout(1500);
  if (await get('calcheck:__preview') || await get('calcheck:null') || await get('calcheck:undefined')) fail('the 👁 Trainee view saved something');

  // ---------- a trainee of batch B102626 with no records: their calendar gets the anchor 2026-11-02, and the page shows its dates ----------
  const page2 = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page2.on('pageerror', e => fail(`page error (B102626): ${e.message}`));
  await page2.goto(BASE, { waitUntil: 'load' }); await page2.waitForTimeout(800);
  await signIn(page2, 'Wynn', 'Terra', 'B102626');
  const id2 = await page2.evaluate(() => state.traineeId);
  const w0 = await get('trainee:' + id2); w0.approved = true; w0.archived = false; await put('trainee:' + id2, w0);
  await put('calcheck:' + id2, null); await put('calsim:' + id2, null);
  await page2.reload({ waitUntil: 'load' }); await page2.waitForTimeout(1500);
  await page2.evaluate(() => goto('calcheck')); await page2.waitForTimeout(2000);
  const cal2 = await get('calsim:' + id2);
  // (the Check reads the calendar record, never writes it: js/ft-calendar.js is its one writer, so a draft saved meanwhile is safe)
  if (cal2) fail(`the Check wrote the B102626 trainee's calendar record: ${JSON.stringify(cal2)}`);
  const nov = await page2.evaluate(() => ({ dates: (document.querySelector('.cc-dates') || {}).innerText || '', res: (document.querySelector('[data-res="1"]') || {}).innerText || '',
    ny: ([...document.querySelectorAll('#cc-tz-3 option')].find(o => o.value === 'America/New_York') || {}).textContent || '', anchor: FTCalCheck.state().rec && FTCalCheck.state().rec.anchor }));
  if (nov.anchor !== '2026-11-02' || !/November 2 to 11, 2026/.test(nov.dates) || !/November 2, 2026/.test(nov.res) || /July/.test(nov.res) || !/GMT-05:00/.test(nov.ny)) fail(`the B102626 trainee's page: ${JSON.stringify(nov)}`);
  // typed at November's dates, the event checks right; the draft and its submission keep the anchor
  await page2.fill('#cc-title-1', 'Client Meeting'); await page2.fill('#cc-sd-1', '2026-11-02'); await page2.fill('#cc-st-1', '10:00'); await page2.fill('#cc-ed-1', '2026-11-02'); await page2.fill('#cc-et-1', '11:00');
  await page2.selectOption('#cc-tz-1', 'America/Los_Angeles'); await page2.waitForTimeout(300);
  if (!/^[5-9]\/12$/.test(await page2.evaluate(() => document.querySelector('[data-sc="1"]').innerText)) || /✗\s*(Start|End) (date|time)/.test(await page2.evaluate(() => document.querySelector('[data-res="1"]').innerText))) fail('November\'s dates typed in aren\'t right on the B102626 trainee\'s page');
  await page2.click('text=📤 Submit to my trainer'); await page2.waitForTimeout(1500);
  const rec2 = await get('calcheck:' + id2), s2 = rec2 && (rec2.submits || [])[0];
  if (!rec2 || rec2.anchor !== '2026-11-02' || !s2 || !s2.snap || s2.snap.anchor !== '2026-11-02' || !s2.checks.some(c => c[0] === '1' && c[1] === 'Start date' && c[2] === true)) fail(`the B102626 trainee's record or submission lost the anchor: ${JSON.stringify(rec2 && { anchor: rec2.anchor, snap: s2 && s2.snap && s2.snap.anchor })}`);
  // a reload keeps it (read from the calendar record, not worked out again)
  await page2.reload({ waitUntil: 'load' }); await page2.waitForTimeout(1500); await page2.evaluate(() => goto('calcheck')); await page2.waitForTimeout(1500);
  if (await page2.evaluate(() => FTCalCheck.state().rec && FTCalCheck.state().rec.anchor) !== '2026-11-02') fail('the anchor didn\'t come back after a reload');
  // a Check record from before anchors, once its July anchor is kept, stays at July even when the calendar record has the
  // batch's anchor (its entries were typed against July)
  await put('calcheck:' + id2, { entries: { 1: { sd: '2026-07-06', st: '10:00' } }, submits: [], anchor: '2026-07-06' });
  await put('calsim:' + id2, { v: 2, anchors: { 'attorney-activity': '2026-11-02' }, drafts: {}, autos: [], submissions: [], reviews: {}, external: [] });
  await page2.reload({ waitUntil: 'load' }); await page2.waitForTimeout(1500); await page2.evaluate(() => goto('calcheck')); await page2.waitForTimeout(2000);
  if (await page2.evaluate(() => FTCalCheck.state().rec && FTCalCheck.state().rec.anchor) !== '2026-07-06') fail('a July Check record moved to the calendar record\'s anchor');
  // the Calendaring Simulator never saves over a calendar record it couldn't read (a failed read isn't an empty record)
  const keep = { v: 2, anchors: {}, drafts: { 'attorney-activity': [{ id: 'k1', title: 'Client Meeting', date: '2026-07-06', allDay: false, span: 1, start: 600, dur: 60, tz: 'America/Los_Angeles' }] }, autos: [], submissions: [], reviews: {}, external: [] };
  await put('calsim:' + id2, keep);
  await page2.route('**/api/storage/get', async route => { const b = route.request().postData() || ''; if (/calsim:/.test(b)) return route.fulfill({ status: 503, body: 'down' }); return route.continue(); });
  await page2.evaluate(() => goto('calsim', 'attorney-activity')); await page2.waitForTimeout(3000);
  await page2.unroute('**/api/storage/get');
  const keptRec = await get("calsim:" + id2);
  if (!keptRec || !keptRec.drafts || !(keptRec.drafts["attorney-activity"] || []).length || (keptRec.anchors && keptRec.anchors["attorney-activity"])) fail(`a failed read of the calendar record was saved over it: ${JSON.stringify(keptRec)}`);
  await page2.close();
  await put('calcheck:' + id2, null); await put('calsim:' + id2, null);
  const w2 = await get('trainee:' + id2); w2.archived = true; await put('trainee:' + id2, w2);

  // 👁 the trainer's preview shows the dates a batch starting this week would get, and saves none
  const pvDates = await page.evaluate(() => ({ a: FTCalCheck.state().rec && FTCalCheck.state().rec.anchor, now: FTCalCore.act.anchorNow(), txt: (document.querySelector('.cc-dates') || {}).innerText || '' }));
  if (pvDates.a !== pvDates.now || !/batch starting this week/.test(pvDates.txt)) fail(`the 👁 Trainee view's dates: ${JSON.stringify(pvDates)}`);

  for (const x of [forged, broken]) { await put('calcheck:' + x.id, null); await put('trainee:' + x.id, Object.assign(x, { archived: true })); }
  await put('calcheck:' + id, null); await put('calsim:' + id, null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Calendar Activity Check test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log(`Calendar Activity Check test passed (the answer key at 100% over ${pure.total} fields; a wrong zone, time, guest and reminder each fail just that field; Phoenix, Panama, Regina, 24 hours, 60 minutes, the overnight stay and a travel reminder on either event accepted; flights the wrong way round fail; no screenshots or upload scored; a failed read keeps the draft; HTML and broken records kept out of the trainer's tab, which rescores the snapshot; the 👁 Trainee view; the draft saved and reloaded, sent, on My Performance and the trainer's tab; the Day 5 slide, its tile and the Practice Lab; a phone's width; the worker's rules; and at the anchor 2026-11-02: the key 17 weeks on at 100%, standard time (9:00 AM Pacific for the 11:00 AM EST deposition not accepted), the date's own offsets, a snapshot scored at its anchor, and a B102626 trainee's calendar given 2026-11-02).`);
})().catch(e => { console.error(e); process.exit(1); });
