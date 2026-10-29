// 📅 Calendar Activity Check (js/ft-calcheck.js): Day 5's Attorney Calendar Management Activity, field by field. The
//   activity's answer key entered in full scores 100%; a wrong time zone, a wrong time, a missing guest and a wrong
//   reminder each fail exactly that field of that event; the accepted alternatives pass (Phoenix for MST, Panama for EST,
//   1 day = 24 hours, 1 hour = 60 minutes, an all-day or overnight stay, titles in any case or dashes); events with no
//   guests or reminder aren't marked down; the folder lookup matches screenshots by number and name; a trainee's draft
//   saves as they type and comes back after a reload, is sent to the trainer, shows on My Performance and the trainer's
//   📅 Calendar Activity tab; the Day 5 slide and the Practice Lab point to it; the page fits a phone; the worker keeps
//   calcheck:<id> the trainee's own and in shape. Also: a travel block's reminder counts on either of its events, a
//   flight named the wrong way round fails its title, Drive times that tie don't vouch for the order, a failed read
//   never wipes the draft, a trainee's HTML or a broken record never reaches or breaks the trainer's tab (which scores
//   each submission's snapshot again, not the score the page stored), and a trainer sees the 👁 Trainee view.
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
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500);

  // the answer key, entered as a trainee would, and what each change does
  const pure = await page.evaluate(() => {
    const out = [], TZ = { PST: 'America/Los_Angeles', MST: 'America/Denver', EST: 'America/New_York', CST: 'America/Chicago' };
    const entry = k => ({ title: `${k.n} ${k.name}`, sd: k.date, ed: k.overnight ? k.date : k.endDate || k.date, st: k.start || '', et: k.end || '', allday: !!k.overnight, tz: TZ[k.tz],
      loc: k.locShow || '', guests: (k.guests || []).join(', '), rtype: k.rem ? k.rem.type : '', ramt: k.rem ? String(k.rem.m % 1440 === 0 ? k.rem.m / 1440 : k.rem.m % 60 === 0 ? k.rem.m / 60 : k.rem.m) : '',
      runit: k.rem ? (k.rem.m % 1440 === 0 ? 'days' : k.rem.m % 60 === 0 ? 'hours' : 'minutes') : 'minutes', notes: (k.notesShow || '') + (k.link ? ' Zoom link for remote attendees: ' + k.link : '') });
    const right = () => { const entries = {}; FTCalCheck.key.forEach(k => { entries[k.n] = entry(k); }); return { entries, final: { lsh: true, seq: true } }; };
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
    expect('the LSH calendar left ticked', Object.assign(right(), { final: { lsh: false, seq: true } }), ['11:The LSH calendar unticked in the entire-calendar screenshot']);
    // the accepted alternatives
    expect('Phoenix for MST', change('2', { tz: 'America/Phoenix' }), []);
    expect('Panama for EST', change('3', { tz: 'America/Panama' }), []);
    expect('Regina for CST', change('7', { tz: 'America/Regina' }), []);
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
    // the folder: the 19 screenshots by number and name, in the order they were uploaded
    const files = FTCalCheck.seq.map(([n, name], i) => ({ name: `${n}. ${name.replace(/[()]/g, '')}.png`, created: `2026-07-16T10:${String(i).padStart(2, '0')}:00Z` }));
    const m = FTCalCheck.matchFiles(files.concat([{ name: '1. Common Terms Used Assessment.docx', created: '2026-07-01T00:00:00Z' }]));
    if (!m.found.every(Boolean) || !m.inOrder) out.push(`the folder lookup doesn't find the 19 screenshots: ${JSON.stringify(m)}`);
    const swapped = files.slice(); [swapped[6].created, swapped[7].created] = [swapped[7].created, swapped[6].created];
    if (FTCalCheck.matchFiles(swapped).inOrder) out.push('6.2 uploaded after 6.3 counts as in order');
    if (FTCalCheck.matchFiles(files.filter((f, i) => i !== 18)).found[18]) out.push('a missing Entire Calendar screenshot was found');
    // Drive's public listing gives only the day: files that tie can't show the order, whichever way they were uploaded
    const sameDay = files.slice().reverse().map(f => Object.assign({}, f, { created: '2026-07-16T12:00:00Z' })), tied = FTCalCheck.matchFiles(sameDay);
    if (tied.inOrder !== null) out.push(`screenshots with the same time count as ${tied.inOrder ? 'in order' : 'out of order'}`);
    if (FTCalCheck.checkFinal({ lsh: true, seq: false }, Object.assign({ at: 'x' }, tied))[1][1] !== false) out.push('tied times overrode the trainee\'s unticked self-check');
    const auto = FTCalCheck.checkFinal({ lsh: true, seq: false }, Object.assign({ at: 'x' }, m));
    if (auto[1][1] !== true || !/found in your folder/.test(auto[1][0])) out.push('the folder lookup doesn\'t count for the upload');
    return { out, total: full.total };
  });
  pure.out.forEach(fail);

  // the Practice Lab card and Day 5
  await page.evaluate(() => { state.ftOpenDays = { all: [1], batches: {} }; goto('simulators'); }); await page.waitForTimeout(800);
  if (await page.$('text=Check my calendar')) fail('the Calendar Activity Check shows on the Practice Lab before its day');
  await page.evaluate(() => { state.ftOpenDays = { all: [1, 2, 3, 4, 5], batches: {} }; goto('simulators'); }); await page.waitForTimeout(800);
  if (!(await page.$('text=Check my calendar'))) fail('the Practice Lab has no 📅 Calendar Activity Check card');
  if (!(await page.evaluate(() => (FTDays.of(5).items || []).some(x => x.at === 'tool' && x.id === 'calcheck')))) fail('Day 5 doesn\'t point to the Calendar Activity Check');
  await page.evaluate(() => { state.adminPreview = true; FTDayDecks.open(5, FTDayDecks.at(5, 's3')); }); await page.waitForTimeout(1600);
  const deck = await page.evaluate(() => ({ bar: [...document.querySelectorAll('.ftdd-acts button')].map(b => b.innerText).join(' | '), tile: !!document.querySelector('button.ftdd-tile[onclick*="calcheck"]'), h: (document.querySelector('main') || {}).innerText.slice(0, 2000) }));
  if (!/Calendar Activity Check/.test(deck.bar)) fail(`Day 5's Attorney Calendar Management Activity slide has no 📅 Calendar Activity Check button: ${deck.bar}`);
  if (!deck.tile) fail('Day 5\'s upload card has no 📅 Calendar Activity Check tile');
  // (the slide is read in pages: the upload card, with the tile, comes last)
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
  // the folder lookup on the local server (no folder saved): it says so, and the trainee's own tick counts
  await page.click('.cc-final > summary'); await page.waitForTimeout(300);
  await page.click('text=🔎 Look in my folder'); await page.waitForTimeout(1500);
  if (!/folder link|can’t open|couldn’t be read|Sign in/.test(await page.evaluate(() => document.querySelector('.cc-final').innerText))) fail('the folder lookup doesn\'t say why it found nothing');
  await page.check('#ccLsh'); await page.check('#ccSeq'); await page.waitForTimeout(300);

  // the phone: no sideways scroll
  await page.setViewportSize({ width: 380, height: 800 }); await page.waitForTimeout(500);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth);
  if (wide > 381) fail(`the page scrolls sideways on a phone: ${wide}px wide`);
  await page.setViewportSize({ width: 1366, height: 900 }); await page.waitForTimeout(300);

  // 📤 sent to the trainer
  await page.click('text=📤 Submit to my trainer'); await page.waitForTimeout(1500);
  const rec = await get('calcheck:' + id), s = rec && rec.submits && rec.submits[rec.submits.length - 1];
  // event 1 (12 fields), event 2's title and the two final ticks right, out of the answer key's fields
  const want = Math.round(15 / pure.total * 100);
  if (!s || s.met !== 15 || s.total !== pure.total || s.pct !== want || !s.at || !s.snap || !s.snap.entries['1']) fail(`the submission wasn't stamped and scored: ${JSON.stringify(s && { met: s.met, total: s.total, pct: s.pct, at: s.at })}, the key's total ${pure.total}`);
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

  for (const x of [forged, broken]) { await put('calcheck:' + x.id, null); await put('trainee:' + x.id, Object.assign(x, { archived: true })); }
  await put('calcheck:' + id, null);
  const r2 = await get('trainee:' + id); r2.archived = true; await put('trainee:' + id, r2);
  await browser.close();
  if (failures.length) { console.error('Calendar Activity Check test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log(`Calendar Activity Check test passed (the answer key at 100% over ${pure.total} fields; a wrong zone, time, guest and reminder each fail just that field; Phoenix, Panama, Regina, 24 hours, 60 minutes, the overnight stay and a travel reminder on either event accepted; flights the wrong way round fail; the folder lookup, tied times not counted as in order; a failed read keeps the draft; HTML and broken records kept out of the trainer's tab, which rescores the snapshot; the 👁 Trainee view; the draft saved and reloaded, sent, on My Performance and the trainer's tab; the Day 5 slide, its tile and the Practice Lab; a phone's width; the worker's rules).`);
})().catch(e => { console.error(e); process.exit(1); });
