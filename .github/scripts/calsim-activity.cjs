// 🗓 Attorney Calendar Management Activity (Day 5, js/ft-calsim-core.js: the activity block, FTCalCore.act): the answer key and
// the automated review, with no browser.
//   - the key: 18 events (the ten items and their travel blocks), weights 90 + the whole calendar's 10, ids unique, guests from the
//     activity's directory, colors that exist, every date on the calendar; its Pacific windows and the time-zone offsets (checked
//     against the time-zone data), and no two expected events overlapping;
//   - a perfect calendar scores 100 whether each event is entered in its own zone (3 PM Mountain) or in Pacific (2 PM), or a mix;
//     the accepted alternatives (colors, the overnight stay, Google Meet, 24 hours for 1 day, a detail on another event of the trip) too;
//   - each mistake fails the right check with the fix in its words; the big ones (no colors, no reminders, no travel blocks, every
//     time zone left out) fail the 80% pass mark;
//   - saved events are cleaned (the 15-minute grid, midnight, the calendar's dates, guests, reminders), the grid's warnings, the
//     editor's rules;
//   - the Standard weeks (Rivera, Chen) review exactly as before: their results are pinned.
// Usage: node .github/scripts/calsim-activity.cjs   (no browser, no network)
const path = require('path');
const crypto = require('crypto');
const C = require(path.join(__dirname, '..', '..', 'js', 'ft-calsim-core.js'));
const failures = []; const fail = m => failures.push(m);
const expect = (label, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); };
const A = C.act, S = C.SCENARIOS.find(s => s.id === 'attorney-activity'), K = S ? S.key : [];

// ---------- the tracks: the Standard track keeps its place, the activity is added after it ----------
expect('tracks', C.TRACKS.map(t => t.id), ['standard', 'activity']);
expect('scenarios', C.SCENARIOS.map(s => s.id), ['rivera', 'chen', 'attorney-activity']);
if (!S || !C.isAct(S) || C.isAct(C.SCENARIOS[0])) fail('the activity scenario is not marked kind:"activity" (or a Standard week is)');
expect('the activity\'s instructions', S.instructions.length, 9);
expect('the activity\'s items', S.items.map(i => i.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

// ---------- the answer key ----------
const ids = K.map(k => k.id);
if (new Set(ids).size !== ids.length) fail('two expected events share an id');
expect('the key\'s events', ids, ['client', 'team', 'depo', 'gym', 'doctor', 'courtTo', 'court', 'courtBack', 'statement', 'toSea', 'flightOut', 'arrive', 'networking', 'overnight', 'checkout', 'flightBack', 'docreview', 'family']);
expect('the events\' weights', K.reduce((n, k) => n + k.weight, 0), 90);
expect('the tasks (one per expected event, then the whole calendar)', S.tasks.map(t => t.id), ids.concat(['calendar']));
expect('the tasks\' weights', S.tasks.reduce((n, t) => n + t.weight, 0), 100);
const emails = A.PEOPLE.map(p => p.email);
K.forEach(k => {
  k.guests.forEach(g => { if (!emails.includes(g)) fail(`${k.id}: guest ${g} is not in the activity's directory`); });
  [k.cat].concat(k.alt || []).forEach(c => { if (!A.CATS[c]) fail(`${k.id}: no legend category "${c}"`); });
  if (!A.tzOf(k.tz)) fail(`${k.id}: unknown zone ${k.tz}`);
  const d = A.dIdx(k.date); if (!(d >= 0 && d <= A.LAST)) fail(`${k.id}: ${k.date} is off the activity's dates`);
  if ((k.alt || []).length && !k.altWhy) fail(`${k.id}: an accepted alternative color without the words that explain it`);
  (k.remind || []).concat(k.notes || []).forEach(r => (r.orOn || []).forEach(o => { if (!ids.includes(o)) fail(`${k.id}: orOn names "${o}"`); }));
});
Object.entries(A.CATS).forEach(([c, v]) => v.colors.forEach(id => { if (!C.colorOf(id)) fail(`legend ${c}: no Google color "${id}"`); }));
expect('the legend in Google colors', Object.fromEntries(Object.entries(A.CATS).map(([c, v]) => [v.legend, v.colors])),
  { Green: ['basil', 'sage'], Blue: ['peacock', 'blueberry'], Red: ['tomato'], Purple: ['grape'], Yellow: ['banana'], Orange: ['tangerine'], Pink: ['flamingo'] });
// where each item lands on the attorney's Pacific calendar (PST/MST/CST/EST = US Pacific/Mountain/Central/Eastern; July is daylight time)
const PACIFIC = { client: 'Mon Jul 6 10 AM – 11 AM', team: 'Tue Jul 7 2 PM – 3 PM', depo: 'Wed Jul 8 8 AM – 10 AM', gym: 'Wed Jul 8 3:30 AM – 4:30 AM',
  doctor: 'Thu Jul 9 9 AM – 10 AM', courtTo: 'Fri Jul 10 8 AM – 9 AM', court: 'Fri Jul 10 9 AM – 12 PM', courtBack: 'Fri Jul 10 12 PM – 1 PM',
  statement: 'Fri Jul 10 2 PM – 3 PM', toSea: 'Mon Jul 13 8:30 AM – 9 AM', flightOut: 'Mon Jul 13 9 AM – 12 PM', arrive: 'Mon Jul 13 5:45 PM – 6 PM',
  networking: 'Mon Jul 13 6 PM – 8 PM', checkout: 'Tue Jul 14 8 AM – 8:30 AM', flightBack: 'Tue Jul 14 10 AM – 1 PM', docreview: 'Wed Jul 15 11:30 AM – 1 PM',
  family: 'Wed Jul 15 6 PM – 8 PM' };
expect('the Pacific windows', Object.fromEntries(K.filter(k => !k.allDay).map(k => [k.id, `${A.dLabel(k.pt.day)} ${A.range(k.pt.start, k.pt.end)}`])), PACIFIC);
// the offsets against the time-zone data: the instant, read in the item's own zone and in Pacific
const at = (ms, tz) => { const p = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; }); return `${p.year}-${p.month}-${p.day} ${+p.hour * 60 + +p.minute}`; };
const BASE = Date.UTC(2026, 6, 6);
K.filter(k => !k.allDay).forEach(k => {
  expect(`${k.id}: the start in its own zone`, at(BASE + k.abs.s * 60000, A.tzOf(k.tz).id), `${k.date} ${k.start}`);
  expect(`${k.id}: the end in its own zone`, at(BASE + k.abs.e * 60000, A.tzOf(k.tz).id), `${k.date} ${k.end}`);
  expect(`${k.id}: the start in Pacific`, at(BASE + k.abs.s * 60000, 'America/Los_Angeles'), `${A.dIso(k.pt.day)} ${k.pt.start}`);
});
expect('the zones as Google shows them', A.TZS.map(z => A.tzLabel(z, A.absAt('2026-07-07', 720, z.id))),
  ['(GMT-07:00) Pacific Time - Los Angeles', '(GMT-06:00) Mountain Time - Denver', '(GMT-05:00) Central Time - Chicago', '(GMT-04:00) Eastern Time - New York']);
const timedKey = K.filter(k => !k.allDay);
timedKey.forEach((a, i) => timedKey.slice(i + 1).forEach(b => { if (a.abs.s < b.abs.e && b.abs.s < a.abs.e) fail(`the key's ${a.id} and ${b.id} overlap`); }));

// ---------- a perfect calendar, entered three ways ----------
const LOC = { client: 'Conference Room B', team: 'Google Meet', depo: 'Attorney’s Office (Zoom for remote attendees: zoom.us/deposition-meeting-02-04-25)', gym: 'Downtown Seattle Fitness Center',
  doctor: 'Central Medical Clinic', courtTo: 'Seattle → Washington County Court', court: 'Washington County Court', courtBack: 'Washington County Court → Seattle', statement: 'Google Meet',
  toSea: 'Home → Seattle-Tacoma International Airport (SEA)', flightOut: 'SEA → SFO', arrive: 'The Ritz-Carlton, San Francisco (600 Stockton St, San Francisco, CA 94108)',
  networking: 'The Ritz-Carlton, San Francisco (600 Stockton St, San Francisco, CA 94108)', overnight: 'San Francisco', checkout: 'The Ritz-Carlton, San Francisco → SFO', flightBack: 'SFO → SEA',
  docreview: 'Attorney’s Office', family: 'Home' };
const DESC = { client: 'Client consultation for Alyssa Lynn Arehart regarding a car accident case. Ensure all case documents are accessible during the meeting.',
  team: 'Weekly team check-in.', depo: 'Deposition preparation with another attorney.', gym: 'Morning workout.', doctor: 'Routine check-up. Prepare any necessary documents or insurance details.',
  courtTo: '', court: 'Attorney has a scheduled court hearing.', courtBack: '', statement: 'Recorded statement meeting with an insurance adjuster regarding a premises liability case.',
  toSea: 'Confirm flight details, check in luggage, bring travel documents, bring business cards, and prepare attire for the event.', flightOut: '', arrive: '',
  networking: 'Networking dinner with potential clients. Bring business cards and prepare a short personal introduction.', overnight: 'Confirm hotel booking and plan transportation after the event.',
  checkout: 'Confirm hotel check-out and transportation to the airport.', flightBack: '', docreview: 'Review a high-priority case file.', family: 'Dinner with family. Pick up groceries on the way home.' };
const unit = m => m % 1440 === 0 ? { n: m / 1440, unit: 'days' } : m % 60 === 0 && m >= 60 ? { n: m / 60, unit: 'hours' } : { n: m, unit: 'minutes' };
// mode: "own" (each item in its own zone), "pacific" (converted), "mixed" (every other one converted)
function perfect(mode) {
  return K.map((k, i) => {
    const reminders = k.remind.map(r => Object.assign({ type: r.type }, unit(r.min))).concat(k.travel ? [{ type: 'notification', n: 1, unit: 'hours' }] : []);
    const x = { id: 'e_' + k.id, title: k.title, loc: LOC[k.id], guests: k.guests.slice(), desc: DESC[k.id], color: A.CATS[k.cat].colors[0], meet: false, reminders };
    if (k.allDay) return Object.assign(x, { date: k.date, allDay: true, span: 1, tz: A.CAL_TZ });
    if (mode === 'pacific' || (mode === 'mixed' && i % 2)) { const p = A.fromAbs(k.abs.s, A.CAL_TZ); return Object.assign(x, { date: p.date, start: p.start, dur: k.end - k.start, tz: A.CAL_TZ }); }
    return Object.assign(x, { date: k.date, start: k.start, dur: k.end - k.start, tz: A.tzOf(k.tz).id });
  });
}
const problems = g => g.items.filter(i => !i.perfect).map(i => `${i.id}: ` + i.checks.filter(c => !c.ok).map(c => `${c.label}: ${c.why}`).join(' | ')).join('; ');
for (const mode of ['own', 'pacific', 'mixed']) {
  const g = C.review(S, perfect(mode));
  if (g.kind !== 'activity' || g.pct !== 100 || g.score !== 100 || !g.passed || g.done !== 19 || g.extras.length) fail(`a perfect calendar (${mode}) scores ${g.pct}% (${g.score}/${g.max}, ${g.done} perfect, ${g.extras.length} extra): ${problems(g)}`);
}
if (Object.keys(C.flags(S, perfect('own'))).length) fail('a perfect calendar has warnings on the grid: ' + JSON.stringify(C.flags(S, perfect('own'))));
const p0 = C.review(S, perfect('own'));
['courtTo', 'courtBack', 'toSea', 'flightOut', 'checkout', 'flightBack'].forEach(id => { if (!p0.items.find(i => i.id === id).info.some(t => /Your trainer confirms the attorney’s preferred lead time/.test(t))) fail(`${id}: no ℹ line on its travel reminder`); });
['toSea', 'flightOut'].forEach(id => { if (!p0.items.find(i => i.id === id).info.some(t => /8:30–9:00 AM/.test(t))) fail(`${id}: no ℹ line on the airport buffer`); });
if (/Mitch/.test(JSON.stringify(p0))) fail('the review calls Mitch the attorney');

const mut = fn => { const ev = perfect('own'); fn(ev, id => ev.find(x => x.id === 'e_' + id), x => ev.splice(ev.indexOf(x), 1)); return C.review(S, ev); };
// ---------- what is accepted (100%) ----------
const ok = {
  'deposition prep in Blue (Peacock)': (ev, g) => { g('depo').color = 'peacock'; },
  'deposition prep in Blueberry': (ev, g) => { g('depo').color = 'blueberry'; },
  'recorded statement in Green': (ev, g) => { g('statement').color = 'basil'; },
  'recorded statement in Purple': (ev, g) => { g('statement').color = 'grape'; },
  'doctor in Pink': (ev, g) => { g('doctor').color = 'flamingo'; },
  'court travel in Purple': (ev, g) => { g('courtTo').color = 'grape'; g('courtBack').color = 'grape'; },
  'client meeting in Sage': (ev, g) => { g('client').color = 'sage'; },
  'team meeting in Blueberry': (ev, g) => { g('team').color = 'blueberry'; },
  'overnight stay all day July 13 to 14': (ev, g) => { g('overnight').span = 2; },
  'overnight stay as an evening block': (ev, g) => { Object.assign(g('overnight'), { allDay: false, start: 20 * 60, dur: 225, tz: A.CAL_TZ, title: 'Overnight stay – Ritz-Carlton' }); },
  'overnight stay July 14, 12 AM to 8 AM': (ev, g) => { Object.assign(g('overnight'), { allDay: false, date: '2026-07-14', start: 0, dur: 480, tz: A.CAL_TZ }); },
  'overnight stay as a note on the dinner': (ev, g, del) => { del(g('overnight')); g('networking').desc += ' Overnight stay: confirm hotel booking and plan transportation after the event.'; },
  'overnight block and a ride back to the hotel': (ev, g) => { Object.assign(g('overnight'), { allDay: false, start: 20 * 60, dur: 240, tz: A.CAL_TZ }); ev.push({ id: 'x2', title: 'Ride back to hotel', date: '2026-07-13', start: 20 * 60, dur: 30, tz: A.CAL_TZ, guests: [], reminders: [], desc: '', loc: 'Ritz → Hotel' }); },
  'Google Meet added instead of a location': (ev, g) => { Object.assign(g('team'), { loc: '', meet: true }); Object.assign(g('statement'), { loc: '', meet: true }); },
  'an email 24 hours before (1 day)': (ev, g) => { g('depo').reminders = [{ type: 'email', n: 24, unit: 'hours' }]; },
  'the trip\'s notes and email on the flight block': (ev, g) => { g('flightOut').desc = g('toSea').desc; g('toSea').desc = ''; g('flightOut').reminders.push({ type: 'email', n: 1, unit: 'days' }); g('toSea').reminders = [{ type: 'notification', n: 1, unit: 'hours' }]; },
  'the dinner\'s reminder and notes on the early-arrival block': (ev, g) => { g('arrive').reminders = g('networking').reminders; g('arrive').desc = 'Bring business cards and prepare a short personal introduction.'; g('networking').reminders = []; g('networking').desc = 'Networking dinner with potential clients.'; },
  'the return\'s email on the return flight': (ev, g) => { g('flightBack').reminders.push({ type: 'email', n: 1, unit: 'days' }); g('checkout').reminders = [{ type: 'notification', n: 2, unit: 'hours' }]; },
  'travel locations written other ways': (ev, g) => { g('courtTo').loc = 'Attorney’s Office - Washington County Court'; g('checkout').loc = 'Hotel to San Francisco International Airport'; g('flightBack').loc = 'SFO to Seattle'; g('toSea').loc = 'Seattle → SEA'; },
  'titles as the activity words them': (ev, g) => { g('flightOut').title = 'Flight from Seattle (SEA) to San Francisco (SFO)'; g('flightBack').title = 'Flight from San Francisco (SFO) to Seattle (SEA)'; g('courtBack').title = 'Return Travel'; g('doctor').title = 'Check-up'; g('family').title = 'Dinner'; },
  'an extra event of the trainee\'s own': ev => { ev.push({ id: 'x1', title: 'Hotel check-in', date: '2026-07-13', start: 13 * 60, dur: 30, tz: A.CAL_TZ, loc: 'Ritz', guests: [], desc: '', color: 'grape', reminders: [] }); },
};
for (const [name, fn] of Object.entries(ok)) { const g = mut(fn); if (g.pct !== 100) fail(`accepted, but scores ${g.pct}%: ${name}: ${problems(g)}`); }
{ const g = mut((ev, g) => { g('depo').color = 'peacock'; }); if (!g.items.find(i => i.id === 'depo').info.some(t => /Blue is accepted/.test(t))) fail('an accepted alternative color has no ℹ line saying so'); }
{ const g = mut(ev => { ev.push({ id: 'x1', title: 'Hotel check-in', date: '2026-07-13', start: 780, dur: 30, tz: A.CAL_TZ }); }); if (!(g.extras.length === 1 && !g.extras[0].why.length && /your trainer will look at it/.test(g.extras[0].info))) fail('an unmatched event isn\'t listed as information: ' + JSON.stringify(g.extras)); }

// ---------- each mistake: the right check fails, with the fix in its words ----------
const bad = [
  ['the team meeting’s 3 PM left in Pacific', (ev, g) => { g('team').tz = A.CAL_TZ; }, 'team', 'time', /You entered 3 PM – 4 PM with the event in Pacific Time, but the item is 3 PM – 4 PM MST \(Mountain\)\. Set the event’s time zone to Mountain Time, or enter 2 PM – 3 PM Pacific\./],
  ['… and its time zone', (ev, g) => { g('team').tz = A.CAL_TZ; }, 'team', 'tz', /MST \(Mountain\)/],
  ['the gym at 6:30 AM Pacific', (ev, g) => { g('gym').tz = A.CAL_TZ; }, 'gym', 'time', /enter 3:30 AM – 4:30 AM Pacific/],
  ['the team meeting in Central Time', (ev, g) => { g('team').tz = 'America/Chicago'; }, 'team', 'time', /with the event in Central Time/],
  ['the team meeting on the wrong day', (ev, g) => { g('team').date = '2026-07-08'; }, 'team', 'time', /On the calendar: Wed Jul 8, 2 PM – 3 PM Pacific\. This item is Tue Jul 7, 3 PM – 4 PM MST/],
  ['a Pacific item set to Eastern Time (same moment)', (ev, g) => { Object.assign(g('client'), { tz: 'America/New_York', start: 13 * 60 }); }, 'client', 'tz', /Eastern Time - New York\. Use the item’s own zone \(Pacific Time, PST\)/],
  ['the client meeting in Tomato', (ev, g) => { g('client').color = 'tomato'; }, 'client', 'color', /Tomato: this one is Green \(Client Meetings: Basil or Sage\)/],
  ['the client meeting with no color', (ev, g) => { g('client').color = ''; }, 'client', 'color', /No color \(the calendar’s default\)/],
  ['the recorded statement in Lavender', (ev, g) => { g('statement').color = 'lavender'; }, 'statement', 'color', /Lavender isn’t one of the legend’s colors: Purple is Grape, Blue is Peacock/],
  ['a flight in Red', (ev, g) => { g('flightOut').color = 'tomato'; }, 'flightOut', 'color', /Purple \(External Events: Grape\)/],
  ['court travel naming only the court', (ev, g) => { g('courtTo').loc = 'Washington County Court'; }, 'courtTo', 'loc', /names one place\. A travel block’s location names where the attorney leaves from AND where they go, e\.g\. “Office → Washington County Court”/],
  ['the flight naming only SFO', (ev, g) => { g('flightOut').loc = 'SFO'; }, 'flightOut', 'loc', /“SEA → SFO”/],
  ['the ride to SEA ending in Seattle', (ev, g) => { g('toSea').loc = 'Home to Seattle'; }, 'toSea', 'loc', /doesn’t read as this trip/],
  ['the dinner without the exact address', (ev, g) => { g('networking').loc = 'The Ritz-Carlton, San Francisco'; }, 'networking', 'loc', /600 Stockton/],
  ['the team meeting without Lei Lee', (ev, g) => { g('team').guests = g('team').guests.slice(0, 3); }, 'team', 'guests', /Add Lei Lee Abut \(team-litigation@legalsupporthelp\.com\)/],
  ['the gym with a guest', (ev, g) => { g('gym').guests = ['martin@legalsupporthelp.com']; }, 'gym', 'guests', /This one has no guests: remove martin@legalsupporthelp\.com/],
  ['the client meeting’s reminder by email', (ev, g) => { g('client').reminders = [{ type: 'email', n: 15, unit: 'minutes' }]; }, 'client', 'remind', /Add: Notification 15 minutes before/],
  ['the deposition’s reminder as a notification', (ev, g) => { g('depo').reminders = [{ type: 'notification', n: 1, unit: 'days' }]; }, 'depo', 'remind', /Add: Email 1 day before/],
  ['the dinner’s reminder by email', (ev, g) => { g('networking').reminders = [{ type: 'email', n: 30, unit: 'minutes' }]; }, 'networking', 'remind', /Add: Notification 30 minutes before/],
  ['court travel with a 10-minute reminder', (ev, g) => { g('courtTo').reminders = [{ type: 'notification', n: 10, unit: 'minutes' }]; }, 'courtTo', 'remind', /Set this travel block its own reminder, apart from the item’s: a practical lead time from 30 minutes to 1 day before.*Your trainer confirms the attorney’s preference/],
  ['the ride to SEA with only the trip’s 1-day email', (ev, g) => { g('toSea').reminders = [{ type: 'email', n: 1, unit: 'days' }]; }, 'toSea', 'remind', /its own reminder, apart from the item’s/],
  ['the family dinner without the groceries', (ev, g) => { g('family').desc = 'Dinner with family.'; }, 'family', 'notes', /Add to the notes: pick up groceries on the way home/],
  ['the client meeting without the case documents', (ev, g) => { g('client').desc = 'Consultation for Alyssa Lynn Arehart, car accident case.'; }, 'client', 'notes', /that all case documents must be accessible/],
  ['the deposition without the Zoom link', (ev, g) => { g('depo').loc = 'Attorney’s Office'; }, 'depo', 'notes', /zoom\.us\/deposition-meeting-02-04-25/],
  ['the doctor with no description', (ev, g) => { g('doctor').desc = ''; }, 'doctor', 'notes', /Add notes \(the description\) with the item’s details: routine check-up; to prepare documents or insurance details/],
  ['the return flight left out', (ev, g, del) => { del(g('flightBack')); }, 'flightBack', 'found', /Not found\. Add “Flight SFO → SEA”: Tue Jul 14, 10 AM – 1 PM PST/],
  ['… and the calendar is incomplete', (ev, g, del) => { del(g('flightBack')); }, 'calendar', 'complete', /Missing: Flight SFO → SEA/],
  ['the overnight stay left out', (ev, g, del) => { del(g('overnight')); }, 'overnight', 'found', /all day, or an evening block from 8 PM Pacific/],
  ['the document review on top of the family dinner', (ev, g) => { g('docreview').start = 19 * 60 + 30; }, 'calendar', 'overlap', /“Document Review Session” \(Wed Jul 15, 5:30 PM – 7 PM\) overlaps “Family Dinner” \(Wed Jul 15, 6 PM – 8 PM\)/],
  ['the client meeting entered twice', ev => { ev.push(Object.assign({}, ev[0], { id: 'dup' })); }, 'calendar', 'dupes', /repeats “Client Meeting: Alyssa Lynn Arehart”: keep one event per appointment/],
  ['the gym on July 6 at 1 AM Eastern (July 5 in Pacific: off the calendar)', (ev, g) => { Object.assign(g('gym'), { date: '2026-07-06', start: 60 }); }, 'gym', 'found', /Not found/],
];
for (const [name, fn, id, key, re] of bad) {
  const g = mut(fn), it = g.items.find(i => i.id === id), c = it && it.checks.find(x => x.key === key);
  if (!c || c.ok) { fail(`not caught: ${name} (${id}/${key}): ${problems(g)}`); continue; }
  if (!re.test(c.why)) fail(`${name}: ${id}/${key} says “${c.why}”`);
  if (!(g.pct >= 80 && g.pct <= 99)) fail(`${name}: one mistake scores ${g.pct}%`);
}
{ const g = mut(ev => { ev.push(Object.assign({}, ev[0], { id: 'dup' })); }), cal = g.items.find(i => i.id === 'calendar');
  if (!cal.checks.find(c => c.key === 'overlap').ok) fail('a duplicate is also counted as an overlap'); }
{ const g = mut((ev, g) => { g('team').tz = A.CAL_TZ; }), it = g.items.find(i => i.id === 'team');
  if (it.pts > it.weight / 2) fail(`an event at the wrong time earns ${it.pts} of ${it.weight}`); }
// the big ones fail the pass mark
const big = {
  'every non-Pacific item left in Pacific': ev => ev.forEach(x => { if (x.tz !== A.CAL_TZ) x.tz = A.CAL_TZ; }),
  'no colors at all': ev => ev.forEach(x => { x.color = ''; }),
  'no reminders at all': ev => ev.forEach(x => { x.reminders = []; }),
  'no travel blocks or sub-blocks': ev => { for (let i = ev.length - 1; i >= 0; i--) if (K.find(k => 'e_' + k.id === ev[i].id).parent) ev.splice(i, 1); },
  'titles that name nothing': ev => ev.forEach(x => { x.title = 'Event'; }),
};
for (const [name, fn] of Object.entries(big)) { const ev = perfect('own'); fn(ev); const g = C.review(S, ev); if (g.passed || g.pct >= 80) fail(`${name}: scores ${g.pct}% and passes`); }

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
expect('words in a location', [A.has(A.normText('Attorney’s Office'), 'attorney office'), A.has(A.normText('Seattle'), 'sea'), A.has(A.normText('SEA → SFO'), 'sea'), A.has(A.normText('consultation'), 'consult')], [true, false, true, true]);

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
console.log(`✓ Attorney Calendar Management Activity: the key (${K.length} events, Pacific windows and offsets checked), a perfect calendar scores 100 three ways, ${Object.keys(ok).length} accepted variants, ${bad.length} mistakes caught with their fix, ${Object.keys(big).length} big ones fail, cleaning and warnings, and the Standard weeks unchanged.`);
