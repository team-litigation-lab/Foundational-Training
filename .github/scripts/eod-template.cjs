// ✉️ The EOD email checked against its template (js/ft-tracker-rules.js checkEod), as the trainees write it: a standard EOD
//   — the headings bold (Gmail's plain text: *…*), "Accomplishments/Completed Tasks" with no colon, three one-line learnings
//   of a full sentence each — scores 100% sent on time; a thin one (a one-word learning) loses the learnings' share; the
//   learnings count in part, a third each.
// Usage: node .github/scripts/eod-template.cjs   (no browser, no network)
require('../../js/ft-tracker-rules.js'); const TR = globalThis.FTTrackerRules;
const failures = []; const fail = (m) => failures.push(m);
const std = `Good day,

*Accomplishments/Completed Tasks*
-Attorney Calendar Management Activity
-Calendar Management Training Videos
-Calendar Management Mock Call with Lei

*These are the things I've learned that I can put into practice later on:*
-Learned how to add events on calendar, best practices to follow like categorizing an event, changing time zones and setting reminders for each event
-During the mock call I received feedback to put in practice like reviewing attorney rules. Also make sure to set the right time zone
-Also learned of other best practices and processes shared on the learning videos like calling the clients to confirm their appointments

*On queue for tomorrow:*
-To-Do: Classroom Discussion: Intake Training Day 1

Regards,`;
const D = '2026-11-09', onTime = '2026-11-09T20:30:00Z', late = '2026-11-09T22:30:00Z';
let r = TR.checkEod(std, 'EOD Report - 11/09/26', D, onTime);
if (r.pct !== 100) fail(`the standard EOD, on time, isn't 100%: ${r.pct} ${JSON.stringify(r.rules.filter(x => !x.pass))}`);
r = TR.checkEod(std.replace(/\*/g, ''), 'Daily Report 11/09/2026', D, onTime);
if (r.pct !== 100) fail(`the standard EOD without bold isn't 100%: ${r.pct}`);
r = TR.checkEod(std, 'EOD Report - 11/09/26', D, late);
if (r.pct !== 80 || r.rules.find(x => x.id === 'time').pass) fail(`a late EOD isn't marked down for the time alone (80%): ${r.pct}`);
r = TR.checkEod('Accomplishments:\n-calls\nLearnings:\n-ok\nOn queue for tomorrow:\n-more', 'EOD Report 11/09/26', D, onTime);
if (r.pct !== 80 || r.rules.find(x => x.id === 'learn').pass) fail(`a thin EOD's learnings aren't marked down: ${r.pct}`);
r = TR.checkEod(std.replace(/-Also learned[^\n]*\n/, ''), 'EOD Report 11/09/26', D, onTime);
if (r.pct !== 93) fail(`two learnings of three don't count two thirds of their share (93%): ${r.pct}`);
if (failures.length) { console.error('EOD template test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
console.log('EOD template test passed (a standard EOD — bold headings, a heading with no colon, one-line learnings — 100% on time; late marked down for the time alone; a thin one loses the learnings; learnings counted in part).');
