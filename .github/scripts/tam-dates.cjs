// 📘 The TAM's day entries (worker.js tamEntries): a line that starts a day is a date heading; a time or a length written with
// a dot is not ("1.5 hours", "2.5-hour", "10.30 am", "at 10.30"), so its words stay on the day they were written for. The
// headings trainees write — "Tues 11/3", "Weds 11/4", "11.12 - 9am start", "11.4 -", "Day 4 11/4 Reception" — still start a day.
// Usage: node .github/scripts/tam-dates.cjs   (no browser, no network)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(process.cwd(), 'worker.js'), 'utf8'), i = src.indexOf('function tamEntries');
let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) { j = k; break; } } }
const tamEntries = new Function('TR', src.slice(i, j + 1) + '; return tamEntries;')({ ptDate: () => '2026-11-05' });
const W = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
const cases = [
  // (a time or a length is not a date)
  ['11/05/2026\n' + W + '\n1.5 hours on intake forms', ['2026-11-05']],
  ['11/05/2026\n' + W + '\nAccuracy rose to 10.5% after review', ['2026-11-05']],
  ['11/05/2026\n' + W + '\nAccuracy rose to 10.5%.', ['2026-11-05']],
  ['11/05/2026\n' + W + '\n2.5-hour training', ['2026-11-05']],
  ['11/05/2026\n' + W + '\n- 2.5 hrs on filing', ['2026-11-05']],
  ['11/05/2026\nHuddle at 10.30 with the team', ['2026-11-05']],
  ['11/05/2026\n10.30 am huddle', ['2026-11-05']],
  ['11/05/2026\nCalls took 7.5 minutes each', ['2026-11-05']],
  // (the headings trainees write still start their day)
  ['Tues 11/3\n' + W + '\nWeds 11/4\n' + W, ['2026-11-03', '2026-11-04']],
  ['11/3:\n' + W + '\n11.12 - 9am start\n' + W, ['2026-11-03', '2026-11-12']],
  ['11/3:\n' + W + '\n11.4 -\n' + W, ['2026-11-03', '2026-11-04']],
  ['Day 4 11/4 Reception\n' + W, ['2026-11-04']],
  ['Thursday, 11/5/2026: ' + W, ['2026-11-05']],
  ['Nov 4, 2026\n' + W, ['2026-11-04']],
];
const failures = [];
for (const [t, want] of cases) { const got = Object.keys(tamEntries(t, '2026-11-05')).sort(); if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${JSON.stringify(t.slice(0, 80))} → ${got.join(', ') || '(none)'}, not ${want.join(', ')}`); }
// (the words of a "1.5 hours" line stay on its day)
{ const e = tamEntries('11/05/2026\n' + W + '\n1.5 hours on intake forms', '2026-11-05')['2026-11-05'] || {}; if (e.words !== 20) failures.push(`the day's words: ${e.words}, not 20`); }
if (failures.length) { console.log(`${failures.length} failure(s):`); failures.forEach((f, n) => console.log(`${n + 1}. ${f}`)); process.exit(1); }
console.log('TAM dates test passed (a time or a length with a dot is not a date: its words stay on their day; the headings trainees write still start their day)');
