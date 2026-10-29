// 🗓 Attorney Calendar Management Activity (Day 5, js/ft-calsim-core.js: the activity block, FTCalCore.act), graded THROUGH the
// 📅 Calendar Activity Check (js/ft-calcheck.js, window.FTCalCheck), with no browser:
//   - the simulator has no answer key of its own: its expected events are the Check's (FTCalCheck.key), its zones the Check's,
//     and every expected event has a colour category;
//   - a perfect calendar built from FTCalCheck.key scores 100 through FTCalCheck (and the Check's own score of the same entries is
//     100), with the accepted variants (Phoenix / Regina / Panama, the same moment typed in Pacific, colours, 24 hours for 1 day,
//     Google Meet, the trip's reminder and notes on either event of its travel block, the overnight stay over two days);
//   - the simulator and the Check agree: the review's rows are exactly FTCalCheck.checkAll of the entries it built, and each
//     mistake is the field the Check marks ✗ on the hand-typed entry, with the Check's fix and what the event holds;
//   - the simulator's own checks (colour, the guests' directory addresses, a travel block's from → to location and its own
//     reminder, overlaps, duplicates) and its ℹ lines (a practical reminder beside the trip's email) are caught;
//   - saved events are cleaned (the 15-minute grid, midnight, the calendar's dates, guests, reminders), the grid's warnings, the
//     editor's rules;
//   - the Standard weeks (Rivera, Chen) review exactly as before: their results are pinned.
// Usage: node .github/scripts/calsim-activity.cjs   (no browser, no network)
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
// the Calendar Activity Check, loaded as the page loads it (a window with the few globals it touches at load)
const noop = () => {};
const sb = { document: { getElementById: () => null, createElement: () => ({}), head: { appendChild: noop }, querySelector: () => null }, esc: v => String(v), state: {}, ftAdminTab: noop, render: noop, console };
sb.window = sb; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'ft-calcheck.js'), 'utf8'), sb, { filename: 'ft-calcheck.js' });
const CK = sb.FTCalCheck; globalThis.FTCalCheck = CK;
const C = require(path.join(ROOT, 'js', 'ft-calsim-core.js'));
const failures = []; const fail = m => failures.push(m);
const expect = (label, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); };
const A = C.act, S = C.SCENARIOS.find(s => s.id === 'attorney-activity'), K = S ? S.key : [];
if (!CK || !Array.isArray(CK.key)) { console.error('✗ js/ft-calcheck.js did not load FTCalCheck'); process.exit(1); }

// ---------- the tracks: the Standard track keeps its place, the activity is added after it ----------
expect('tracks', C.TRACKS.map(t => t.id), ['standard', 'activity']);
expect('scenarios', C.SCENARIOS.map(s => s.id), ['rivera', 'chen', 'attorney-activity']);
if (!S || !C.isAct(S) || C.isAct(C.SCENARIOS[0])) fail('the activity scenario is not marked kind:"activity" (or a Standard week is)');
expect('the activity\'s instructions', S.instructions.length, 9);
expect('the activity\'s items', S.items.map(i => i.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

// ---------- the key is the Check's ----------
const N = CK.key.map(k => k.n);
expect('the expected events are the Check\'s', K.map(k => k.id), N);
expect('the tasks (one per Check event, then the whole calendar)', S.tasks.map(t => t.id), N.concat(['calendar']));
expect('the zones are the Check\'s', A.TZS.map(z => z.id), CK.zones.map(z => z[0]));
expect('the Check\'s zones as Google shows them', A.TZS.slice(0, 7).map(z => A.tzLabel(z, A.absAt('2026-07-07', 720, z.id))),
  ['(GMT-07:00) Pacific Time - Los Angeles', '(GMT-06:00) Mountain Time - Denver', '(GMT-07:00) Mountain Standard Time - Phoenix', '(GMT-05:00) Central Time - Chicago',
    '(GMT-06:00) Central Standard Time - Regina', '(GMT-04:00) Eastern Time - New York', '(GMT-05:00) Eastern Standard Time - Panama']);
N.forEach(n => { const s = A.SIM[n]; if (!s || !A.CATS[s.cat]) fail(`${n}: no colour category`); else [s.cat].concat(s.alt || []).forEach(c => { if (!A.CATS[c]) fail(`${n}: no legend category "${c}"`); });
  if (s && (s.alt || []).length && !s.altWhy) fail(`${n}: an accepted alternative colour without the words that explain it`); });
Object.keys(A.SIM).forEach(n => { if (!N.includes(n)) fail(`SIM names "${n}", which the Check doesn't have`); });
Object.entries(A.CATS).forEach(([c, v]) => v.colors.forEach(id => { if (!C.colorOf(id)) fail(`legend ${c}: no Google color "${id}"`); }));
expect('the legend in Google colors', Object.fromEntries(Object.entries(A.CATS).map(([c, v]) => [v.legend, v.colors])),
  { Green: ['basil', 'sage'], Blue: ['peacock', 'blueberry'], Red: ['tomato'], Purple: ['grape'], Yellow: ['banana'], Orange: ['tangerine'], Pink: ['flamingo'] });
// where each item lands on the attorney's Pacific calendar (PST/MST/CST/EST = US Pacific/Mountain/Central/Eastern; July is daylight time)
expect('the Pacific windows', Object.fromEntries(K.filter(k => !k.allDay).map(k => [k.id, `${A.dLabel(k.pt.day)} ${A.range(k.pt.start, k.pt.end)}`])),
  { 1: 'Mon Jul 6 10 AM – 11 AM', 2: 'Tue Jul 7 2 PM – 3 PM', 3: 'Wed Jul 8 8 AM – 10 AM', 4: 'Wed Jul 8 3:30 AM – 4:30 AM', 5: 'Thu Jul 9 9 AM – 10 AM',
    6.1: 'Fri Jul 10 9 AM – 12 PM', 6.2: 'Fri Jul 10 8 AM – 9 AM', 6.3: 'Fri Jul 10 12 PM – 1 PM', 7: 'Fri Jul 10 2 PM – 3 PM', 8.1: 'Mon Jul 13 6 PM – 8 PM',
    8.2: 'Mon Jul 13 8:30 AM – 9 AM', 8.3: 'Mon Jul 13 9 AM – 12 PM', 8.4: 'Mon Jul 13 5:45 PM – 6 PM', 8.6: 'Tue Jul 14 8 AM – 8:30 AM', 8.7: 'Tue Jul 14 10 AM – 1 PM',
    9: 'Wed Jul 15 11:30 AM – 1 PM', 10: 'Wed Jul 15 6 PM – 8 PM' });
const timedKey = K.filter(k => !k.allDay);
timedKey.forEach((a, i) => timedKey.slice(i + 1).forEach(b => { if (a.abs.s < b.abs.e && b.abs.s < a.abs.e) fail(`the key's ${a.id} and ${b.id} overlap`); }));

// ---------- a perfect calendar, built from FTCalCheck.key ----------
const mm = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const email = name => (A.PEOPLE.find(p => p.name === name) || {}).email;
const remOf = m => m % 1440 === 0 ? { n: m / 1440, unit: 'days' } : m % 60 === 0 ? { n: m / 60, unit: 'hours' } : { n: m, unit: 'minutes' };
function perfect() {
  return CK.key.map(k => {
    const s = A.SIM[k.n];
    const x = { id: 'e_' + k.n, title: k.name, loc: k.loc ? k.locShow + (k.link ? ' (Zoom for remote attendees: ' + k.link + ')' : '') : s.eg || '', guests: (k.guests || []).map(email),
      desc: k.notesShow || '', color: A.CATS[s.cat].colors[0], meet: false,
      reminders: (k.rem ? [Object.assign({ type: k.rem.type.toLowerCase() }, remOf(k.rem.m))] : []).concat(s.travel ? [{ type: 'notification', n: 1, unit: 'hours' }] : []) };
    if (k.overnight) return Object.assign(x, { date: k.date, allDay: true, span: 1, tz: A.CAL_TZ });
    return Object.assign(x, { date: k.date, start: mm(k.start), dur: mm(k.end) - mm(k.start), tz: A.tzOf(k.tz).id });
  });
}
const problems = g => g.items.filter(i => !i.perfect).map(i => `${i.id}: ` + i.checks.filter(c => !c.ok).map(c => `${c.label}: ${c.why}`).join(' | ')).join('; ');
const p0 = C.review(S, perfect());
if (p0.kind !== 'activity' || p0.pct !== 100 || p0.score !== p0.max || !p0.passed || p0.done !== 19 || p0.extras.length) fail(`a perfect calendar scores ${p0.pct}% (${p0.score}/${p0.max}, ${p0.done} perfect, ${p0.extras.length} extra): ${problems(p0)}`);
// through FTCalCheck: its own score of the same entries is 100, and the review's rows are exactly its checkAll
const own = CK.checkAll({ entries: p0.entries }).filter(r => r[0] !== '11');
expect('the Check scores the perfect calendar', CK.score(own), { met: own.filter(r => r[2] !== null).length, total: own.filter(r => r[2] !== null).length, pct: 100 });
expect('the review\'s rows are the Check\'s', p0.rows, own);
expect('the review\'s Check score is the Check\'s', p0.check, CK.score(own));
expect('every Check event has an entry', Object.keys(p0.entries).sort(), N.slice().sort());
if (Object.keys(C.flags(S, perfect())).length) fail('a perfect calendar has warnings on the grid: ' + JSON.stringify(C.flags(S, perfect())));
['6.2', '6.3', '8.2', '8.3', '8.6', '8.7'].forEach(n => { if (!p0.items.find(i => i.id === n).info.some(t => /Your trainer confirms the attorney’s preferred lead time/.test(t))) fail(`${n}: no ℹ line on its travel reminder`); });
['8.2', '8.3'].forEach(n => { if (!p0.items.find(i => i.id === n).info.some(t => /8:30–9:00 AM/.test(t))) fail(`${n}: no ℹ line on the airport buffer`); });
if (/Mitch/.test(JSON.stringify(p0))) fail('the review calls Mitch the attorney');
// the mapping, for one event: what the trainee would type on the Check
expect('an event as the Check\'s entry', A.entryOf(perfect()[1], '2'), { title: 'Team Meeting', allday: false, sd: '2026-07-07', tz: 'America/Denver', loc: 'Google Meet',
  guests: 'Martin Anthony, Michelle Velarde, John Michael Dela Cruz, Lei Lee Abut', rtype: 'Email', ramt: '30', runit: 'minutes', notes: 'Weekly team check-in', st: '15:00', ed: '2026-07-07', et: '16:00' });
expect('the overnight stay as the Check\'s entry', (({ allday, sd, ed, st, et, tz }) => ({ allday, sd, ed, st, et, tz }))(A.entryOf(perfect().find(x => x.id === 'e_8.5'), '8.5')),
  { allday: true, sd: '2026-07-13', ed: '2026-07-13', st: '', et: '', tz: '' });

const mut = fn => { const ev = perfect(); fn(ev, n => ev.find(x => x.id === 'e_' + n), x => ev.splice(ev.indexOf(x), 1)); return C.review(S, ev); };
// ---------- what is accepted (100%) ----------
const ok = {
  'the team meeting in Mountain Standard Time - Phoenix': (ev, g) => { g('2').tz = 'America/Phoenix'; },
  'the document review in Central Standard Time - Regina': (ev, g) => { g('9').tz = 'America/Regina'; },
  'the deposition in Eastern Standard Time - Panama': (ev, g) => { g('3').tz = 'America/Panama'; },
  'deposition prep in Blue (Peacock)': (ev, g) => { g('3').color = 'peacock'; },
  'recorded statement in Green': (ev, g) => { g('7').color = 'basil'; },
  'recorded statement in Purple': (ev, g) => { g('7').color = 'grape'; },
  'doctor in Pink': (ev, g) => { g('5').color = 'flamingo'; },
  'court travel in Purple': (ev, g) => { g('6.2').color = 'grape'; g('6.3').color = 'grape'; },
  'client meeting in Sage': (ev, g) => { g('1').color = 'sage'; },
  'overnight stay all day July 13 to 14': (ev, g) => { g('8.5').span = 2; },
  'Google Meet added instead of a location': (ev, g) => { Object.assign(g('2'), { loc: '', meet: true }); Object.assign(g('7'), { loc: '', meet: true }); },
  'an email 24 hours before (1 day)': (ev, g) => { g('3').reminders = [{ type: 'email', n: 24, unit: 'hours' }]; },
  'two reminders, the right one second': (ev, g) => { g('1').reminders = [{ type: 'email', n: 1, unit: 'days' }, { type: 'notification', n: 15, unit: 'minutes' }]; },
  'the trip\'s email and notes on the ride to SEA (8.2), not the flight': (ev, g) => { g('8.2').desc = g('8.3').desc; g('8.3').desc = ''; g('8.2').reminders.push({ type: 'email', n: 1, unit: 'days' }); g('8.3').reminders = [{ type: 'notification', n: 1, unit: 'hours' }]; },
  // (the Check counts a block's reminder and notes on whichever ONE of its two events holds more of them: they go together)
  'the return\'s email and notes on the return flight (8.7)': (ev, g) => { g('8.7').reminders.push({ type: 'email', n: 1, unit: 'days' }); g('8.7').desc = g('8.6').desc; g('8.6').desc = ''; g('8.6').reminders = [{ type: 'notification', n: 2, unit: 'hours' }]; },
  'titles with the item\'s number': ev => { ev.forEach(x => { x.title = x.id.slice(2) + ' ' + x.title; }); },
  'an extra event of the trainee\'s own': ev => { ev.push({ id: 'x1', title: 'Hotel check-in', date: '2026-07-13', start: 13 * 60, dur: 30, tz: A.CAL_TZ, loc: 'Ritz', guests: [], desc: '', color: 'grape', reminders: [] }); },
  'the flight with only the trip\'s 1-day email (ℹ only)': (ev, g) => { g('8.3').reminders = [{ type: 'email', n: 1, unit: 'days' }]; },
  'the team meeting typed as 2 PM Pacific (the same moment)': (ev, g) => { Object.assign(g('2'), { tz: A.CAL_TZ, start: 14 * 60 }); },
  'the gym typed as 3:30 AM Pacific (the same moment)': (ev, g) => { Object.assign(g('4'), { tz: A.CAL_TZ, start: 210 }); },
  'a court travel reminder by email a day before': (ev, g) => { g('6.2').reminders = [{ type: 'email', n: 1, unit: 'days' }]; },
};
for (const [name, fn] of Object.entries(ok)) { const g = mut(fn); if (g.pct !== 100) fail(`accepted, but scores ${g.pct}%: ${name}: ${problems(g)}`); }
{ const g = mut((ev, g) => { g('3').color = 'peacock'; }); if (!g.items.find(i => i.id === '3').info.some(t => /Blue is accepted/.test(t))) fail('an accepted alternative color has no ℹ line saying so'); }
{ const g = mut((ev, g) => { g('8.3').reminders = [{ type: 'email', n: 1, unit: 'days' }]; }), inf = g.items.find(i => i.id === '8.3').info.join(' ');
  if (!/a practical reminder of its own/.test(inf)) fail(`a travel block's ℹ lines: ${inf}`); }
{ const g = mut(ev => { ev.push({ id: 'x1', title: 'Hotel check-in', date: '2026-07-13', start: 780, dur: 30, tz: A.CAL_TZ }); }); if (!(g.extras.length === 1 && !g.extras[0].why.length && /your trainer will look at it/.test(g.extras[0].info))) fail('an unmatched event isn\'t shown as an ℹ for the trainer'); }

// ---------- each mistake: the field the Check marks ✗, with the Check's fix (and the simulator's own checks) ----------
const bad = [
  ['the team meeting’s 3 PM left in Pacific', (ev, g) => { g('2').tz = A.CAL_TZ; }, '2', 'Time zone', /MST means the Mountain zone: “Mountain Time - Denver \(or Mountain Standard Time - Phoenix\)”, or keep Pacific Time - Los Angeles \(the attorney’s calendar\) and enter 2:00 PM – 3:00 PM, the same moment \(yours: Pacific Time - Los Angeles\)/],
  ['the team meeting at 2:30 PM Pacific', (ev, g) => { Object.assign(g('2'), { tz: A.CAL_TZ, start: 870 }); }, '2', 'Start time', /2:00 PM Pacific \(the same moment as July 7, 2026, 3:00 PM – 4:00 PM MST\) \(yours: 2:30 PM Pacific\)/],
  ['the gym in Central Time', (ev, g) => { g('4').tz = 'America/Chicago'; }, '4', 'Time zone', /EST means the Eastern zone/],
  ['the team meeting on the wrong day', (ev, g) => { g('2').date = '2026-07-08'; }, '2', 'Start date', /July 7, 2026 \(yours: Wed Jul 8\)/],
  ['the court appearance ending at 11', (ev, g) => { g('6.1').dur = 120; }, '6.1', 'End time', /12:00 PM/],
  ['the client meeting titled “Consultation”', (ev, g) => { g('1').title = 'Consultation'; }, '1', 'Title', /Name it “1 Client Meeting”/],
  ['the outbound flight named the other way round', (ev, g) => { g('8.3').title = 'Flight from SFO to Seattle'; }, '8.3', 'Title', /Name it “8\.3 Flight from Seattle \(SEA\) to San Francisco \(SFO\)”/],
  ['the dinner without the Ritz-Carlton', (ev, g) => { g('8.1').loc = '600 Stockton St'; }, '8.1', 'Location', /The Ritz-Carlton, San Francisco/],
  ['the deposition without the Zoom link', (ev, g) => { g('3').loc = 'Attorney’s Office'; }, '3', 'Zoom link for remote attendees', /zoom\.us\/deposition-meeting-02-04-25/],
  ['the team meeting without Lei Lee', (ev, g) => { g('2').guests = g('2').guests.slice(0, 3); }, '2', 'Guests', /Invite Lei Lee Abut/],
  ['the client meeting’s reminder by email', (ev, g) => { g('1').reminders = [{ type: 'email', n: 15, unit: 'minutes' }]; }, '1', 'Reminder type', /Notification \(yours: Email 15 minutes before\)/],
  ['the deposition’s reminder 1 hour before', (ev, g) => { g('3').reminders = [{ type: 'email', n: 1, unit: 'hours' }]; }, '3', 'Reminder time', /1 day before \(yours: Email 1 hour before\)/],
  ['the flight’s 1-day email on neither event of the trip', (ev, g) => { g('8.3').reminders = [{ type: 'notification', n: 1, unit: 'hours' }]; }, '8.3', 'Reminder type', /Email \(on 8\.2 or 8\.3: either event of the travel block\)/],
  ['the family dinner without the groceries', (ev, g) => { g('10').desc = 'Dinner with family.'; }, '10', 'Description', /missing: “groceries”/],
  ['the overnight stay ending July 15', (ev, g) => { g('8.5').span = 3; }, '8.5', 'End date', /July 13, 2026 \(all day\) or July 14, 2026/],
  ['the return flight left out', (ev, g, del) => { del(g('8.7')); }, '8.7', 'found', /Not found\. Add “8\.7 Flight from San Francisco \(SFO\) to Seattle \(SEA\)”: Tue Jul 14, 10 AM – 1 PM PST/],
  ['the overnight stay left out', (ev, g, del) => { del(g('8.5')); }, '8.5', 'found', /an All day event/],
  ['the client meeting in Tomato (🎨)', (ev, g) => { g('1').color = 'tomato'; }, '1', 'color', /Tomato: this one is Green \(Client Meetings: Basil or Sage\)/],
  ['the client meeting with no color (🎨)', (ev, g) => { g('1').color = ''; }, '1', 'color', /No color \(the calendar’s default\)/],
  ['the recorded statement in Lavender (🎨)', (ev, g) => { g('7').color = 'lavender'; }, '7', 'color', /Lavender isn’t one of the legend’s colors/],
  ['Lei Lee at an address that isn’t hers (🎨)', (ev, g) => { g('2').guests[3] = 'lei.lee.abut@legalsupporthelp.com'; }, '2', 'emails', /Invite Lei Lee Abut \(team-litigation@legalsupporthelp\.com\)\. Not a directory address: lei\.lee\.abut@legalsupporthelp\.com/],
  ['all four guests at the client meeting (🎨)', (ev, g) => { g('1').guests = g('2').guests.slice(); }, '1', 'emails', /Not invited to this item: John Michael Dela Cruz, Lei Lee Abut\. Invite only Martin Anthony, Michelle Velarde/],
  ['the return travel naming one place (🎨)', (ev, g) => { g('6.3').loc = 'Washington County Court'; }, '6.3', 'route', /e\.g\. “Washington County Court → Office” \(instruction 8\)\. Yours: “Washington County Court”/],
  ['the ride to SEA naming only the airport (🎨)', (ev, g) => { g('8.2').loc = 'Seattle-Tacoma International Airport (SEA)'; }, '8.2', 'route', /Home → Seattle-Tacoma International Airport \(SEA\)/],
  ['the return travel with no reminder (🎨)', (ev, g) => { g('6.3').reminders = []; }, '6.3', 'trem', /30 minutes to 1 day before.*\(instruction 6\)\. Yours: none/],
  ['the travel to court reminded 10 minutes before (🎨)', (ev, g) => { g('6.2').reminders = [{ type: 'notification', n: 10, unit: 'minutes' }]; }, '6.2', 'trem', /Yours: Notification 10 minutes before/],
  ['a lunch on top of the document review (🎨)', ev => { ev.push({ id: 'x3', title: 'Lunch', date: '2026-07-15', start: 12 * 60, dur: 60, tz: A.CAL_TZ, loc: '', guests: [], desc: '', color: '', reminders: [] }); }, 'calendar', 'overlap', /“Lunch” \(Wed Jul 15, 12 PM – 1 PM\) overlaps “Document Review Session” \(Wed Jul 15, 11:30 AM – 1 PM\)|“Document Review Session” \(Wed Jul 15, 11:30 AM – 1 PM\) overlaps “Lunch”/],
  ['the client meeting entered twice (🎨)', ev => { ev.push(Object.assign({}, ev[0], { id: 'dup' })); }, 'calendar', 'dupes', /repeats “Client Meeting”: keep one event per appointment/],
];
for (const [name, fn, id, key, re] of bad) {
  const g = mut(fn), it = g.items.find(i => i.id === id), c = it && it.checks.find(x => x.key === key);
  if (!c || c.ok) { fail(`not caught: ${name} (${id}/${key}): ${problems(g)}`); continue; }
  if (!re.test(c.why)) fail(`${name}: ${id}/${key} says “${c.why}”`);
  if (!(g.pct >= 80 && g.pct <= 99)) fail(`${name}: one mistake scores ${g.pct}%`);
  // the simulator and the Check agree: the same entries, typed on the Check, give the same rows and score
  const rows = CK.checkAll({ entries: g.entries }).filter(r => r[0] !== '11');
  if (JSON.stringify(rows) !== JSON.stringify(g.rows) || JSON.stringify(CK.score(rows)) !== JSON.stringify(g.check)) fail(`${name}: the review and the Check disagree`);
  if (key !== 'found' && !/🎨/.test(name) && !rows.some(r => r[0] === id && r[1] === key && r[2] === false)) fail(`${name}: the Check doesn't mark ${id}/${key} ✗`);
}
// the simulator's own checks are scored with the Check's, and a missing event misses them too
{ const g = mut((ev, g) => { g('6.3').loc = 'Court'; }); if (g.sim.total !== g.sim.met + 1 || g.score !== g.max - 1) fail(`a travel route counts ${g.max - g.score} fields (sim ${g.sim.met}/${g.sim.total})`); }
{ const g = mut((ev, g, del) => { del(g('6.3')); }), it = g.items.find(i => i.id === '6.3'), want = CK.check(CK.key.find(k => k.n === '6.3'), {}).filter(c => c[1] !== null).length + 3;
  if (it.weight !== want) fail(`a missing travel block weighs ${it.weight}, expected ${want} (its Check fields, its colour, route and reminder)`); }
{ const g = mut(ev => { ev.push(Object.assign({}, ev[0], { id: 'dup' })); }), cal = g.items.find(i => i.id === 'calendar');
  if (!cal.checks.find(c => c.key === 'overlap').ok) fail('a duplicate is also counted as an overlap'); }
// the big ones fail the pass mark
const big = {
  'no events': ev => { ev.length = 0; },
  'half the events left out': ev => { ev.splice(0, 9); },
  'no travel blocks or sub-blocks': ev => { for (let i = ev.length - 1; i >= 0; i--) if (/^e_[68]\.[2-7]$/.test(ev[i].id)) ev.splice(i, 1); },
};
for (const [name, fn] of Object.entries(big)) { const ev = perfect(); fn(ev); const g = C.review(S, ev); if (g.passed || g.pct >= 80) fail(`${name}: scores ${g.pct}% and passes`); }
// without the Check loaded, the review says so instead of grading on its own
{ const saved = globalThis.FTCalCheck; delete globalThis.FTCalCheck; const g = C.review(S, perfect()); globalThis.FTCalCheck = saved;
  if (!g.error || g.passed || g.items.length) fail('without the Check the review graded anyway'); }

// ---------- saved events are cleaned before they're used ----------
const cl = C.cleanFor(S, [
  { id: 'a', title: 'x', date: '2026-07-06', start: 600, dur: 60, tz: 'America/Denver', guests: ['Martin@LegalSupportHelp.com', 'bad', 'martin@legalsupporthelp.com'], reminders: [{ type: 'email', n: 1, unit: 'days' }, { type: 'sms', n: 1, unit: 'days' }, { type: 'notification', n: 5, unit: 'fortnights' }, { type: 'email', n: 5, unit: 'weeks' }], color: 'nope' },
  { id: 'b', title: 'x', date: '2026-07-06', start: 610, dur: 60 },            // not on the 15-minute grid
  { id: 'c', title: 'x', date: '2026-07-06', start: 1410, dur: 60 },           // runs past midnight
  { id: 'd', title: 'x', date: '2026-08-01', start: 600, dur: 60 },            // off the calendar
  { id: 'f', title: 'x', date: '2026-07-06', start: 60, dur: 60, tz: 'America/New_York' },   // July 5 in Pacific: off the calendar
  { id: 'e', title: 'x', date: '2026-07-13', allDay: true, span: 2, tz: 'Mars/Base' },
  { id: 'a', title: 'dup id', date: '2026-07-06', start: 600, dur: 60 },
  null, 'x']);
expect('cleaned events', cl.map(x => x.id), ['a', 'e']);
expect('a cleaned event', cl[0], { id: 'a', title: 'x', date: '2026-07-06', allDay: false, span: 1, start: 600, dur: 60, tz: 'America/Denver', loc: '', guests: ['martin@legalsupporthelp.com'], desc: '', meet: false, color: '', reminders: [{ type: 'email', n: 1, unit: 'days' }] });
expect('a cleaned all-day event', [cl[1].allDay, cl[1].span, cl[1].tz, cl[1].start, cl[1].dur], [true, 2, A.CAL_TZ, 0, 1440]);
expect('the Standard weeks still clean their own way', C.cleanFor(C.SCENARIOS[0], [{ id: 'a', title: 'x', day: 0, start: 540, dur: 60 }]).length, 1);
// the grid's warnings: overlapping events (both), and the days after the activity
const fl = C.flags(S, [{ id: 'a', title: 'A', date: '2026-07-08', start: 660, dur: 120, tz: 'America/New_York' }, { id: 'b', title: 'B', date: '2026-07-08', start: 540, dur: 60, tz: A.CAL_TZ }, { id: 'z', title: 'Z', date: '2026-07-17', start: 540, dur: 60 }]);
expect('the grid\'s warnings', fl, { a: ['Overlaps “B”'], b: ['Overlaps “A”'], z: ['Outside the activity’s dates (July 6 to 15)'] });
// the editor's rules
expect('an event within its own day', A.valid({ date: '2026-07-07', start: 900, dur: 60, tz: 'America/Denver' }), '');
if (!/end by midnight in its own time zone \(Eastern Time\)/.test(A.valid({ date: '2026-07-08', start: 1410, dur: 60, tz: 'America/New_York' }))) fail('an event past its own midnight is allowed');
if (!/outside the calendar’s dates/.test(A.valid({ date: '2026-07-06', start: 60, dur: 60, tz: 'America/New_York' }))) fail('an event on July 5 (Pacific) is allowed');
expect('where an Eastern event lands in Pacific', A.pacOf({ date: '2026-07-08', start: 60, dur: 60, tz: 'America/New_York' }), { day: 1, start: 1320, end: 1380 });
expect('a drag to Tue 11 PM Pacific, in Eastern', A.fromPac(1, 23 * 60, 'America/New_York'), { day: 2, date: '2026-07-08', start: 120 });
expect('travel locations', ['Seattle to Washington County Court', 'Ritz-Carlton → SFO', 'Office - Court', 'Washington County Court'].map(A.splitTravel),
  [{ from: 'Seattle', to: 'Washington County Court' }, { from: 'Ritz-Carlton', to: 'SFO' }, { from: 'Office', to: 'Court' }, null]);

// ---------- the Standard weeks: exactly as before (sha256 of the results, pinned before the activity was added) ----------
const h = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const E = (id, title, day, start, dur, o) => Object.assign({ id, title, day, start, dur, desc: 'Prep and notes for this item', guests: '', meet: false, remind: false, color: '' }, o || {});
const good = [
  E('a', 'Mediation prep: Garcia', 2, 600, 60, { color: 'tomato' }),
  E('b', 'Deposition prep: Wilson', 0, 780, 90),
  E('c', 'New client consultation: Thompson', 1, 780, 60, { color: 'tomato', remind: true }),
  E('d', 'Settlement call: adjuster', 1, 855, 30, { color: 'tangerine', meet: true }),
  E('e', 'Medical records review block', 4, 540, 60, { color: 'tomato' }),
  E('f', 'Urgent call: Garcia', 0, 585, 30, { color: 'tangerine' }),
  E('g', 'Case strategy meeting with paralegal', 3, 780, 60, { color: 'tomato' }),
  E('h', 'Client signing at the courthouse: Park', 0, 900, 45, { color: 'blueberry' })
];
const badWeek = good.map(x => Object.assign({}, x, { day: 0, start: 540, color: '' }));
const R = C.SCENARIOS.find(s => s.id === 'rivera'), W2 = C.SCENARIOS.find(s => s.id === 'chen');
const rg = C.review(R, good), rb = C.review(R, badWeek), cg = C.review(W2, good);
expect('Rivera, a good week', [h(rg), rg.pct], ['105937c85738b491', 100]);
expect('Rivera, a bad week', [h(rb), rb.pct], ['da8879611919b886', 68]);
expect('Rivera, the bad week\'s warnings', h(C.flags(R, badWeek)), '0ff7a36d756f0fcf');
expect('Chen, Rivera\'s week', [h(cg), cg.pct], ['ef152a3b931321fd', 27]);
expect('a Standard week, cleaned', h(C.clean(good)), 'e867ec7b73661dab');

if (failures.length) { console.error(`✗ ${failures.length} problem(s):\n - ` + failures.join('\n - ')); process.exit(1); }
console.log(`✓ Attorney Calendar Management Activity: the Check's key (${K.length} events, its zones, Pacific windows), a perfect calendar from FTCalCheck.key scores 100 through FTCalCheck, ${Object.keys(ok).length} accepted variants, ${bad.length} mistakes caught with the Check's fix and the Check agreeing, ${Object.keys(big).length} big ones fail, cleaning and warnings, and the Standard weeks unchanged.`);
