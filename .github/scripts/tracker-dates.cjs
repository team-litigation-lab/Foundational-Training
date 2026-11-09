// 📅 A day's inputs read for that day, whatever form its date takes (js/ft-tracker-rules.js findDate): the Task Tracker's Daily
// Notes columns — dated in the heading, the row above, or the row under a merged DAILY NOTES heading, as "Mon 11/2", "11/02/2026
// (Monday)", "2-Nov-2026" … — each note kept for its own day, and the Monitoring Sheet's entries by their Date: line.
// Usage: node .github/scripts/tracker-dates.cjs   (no browser, no network)
require('../../js/ft-tracker-rules.js');
const TR = globalThis.FTTrackerRules, fails = [], ck = (ok, t) => { if (!ok) fails.push(t); };
const want = { '11/2/2026': '2026-11-02', 'Mon 11/2': '2026-11-02', '11/02/2026 (Monday)': '2026-11-02', '2-Nov-2026': '2026-11-02',
  'Monday – November 2nd': '2026-11-02', 'Date: 10/30/26': '2026-10-30', 'Nov 2': '2026-11-02', '10.30.2026': '2026-10-30', 'VA Notes': '', 'Status': '', 'Task 1': '' };
Object.entries(want).forEach(([v, d]) => ck(TR.findDate(v, '2026') === d, `findDate(${JSON.stringify(v)}) = ${TR.findDate(v, '2026')}, not ${d || '""'}`));
// the dates under a merged DAILY NOTES heading
const under = ['Type of Task,Task Details,Accountable VA,DAILY NOTES,,VA Notes,Status', ',,,Mon 11/2,Tue 11/3,,', 'RECURRING,,,,,,',
  'LSH-TRAINING,Typing Test,Ana,Took the AM test,Took both,,Ongoing'].join('\n');
const t = TR.fromSheetCsv(under, { today: '2026-11-09' });
ck(t && JSON.stringify(t.tracker.noteDates) === '["2026-11-02","2026-11-03"]', `the dates under the heading weren't read: ${JSON.stringify(t && t.tracker.noteDates)}`);
ck(t && t.tracker.rows.length === 1 && t.tracker.rows[0].notes['2026-11-03'] === 'Took both', `each note isn't kept for its own day: ${JSON.stringify(t && t.tracker.rows)}`);
const d3 = TR.checkDay(Object.assign(t, { startDate: '2026-10-30' }), '2026-11-03'), dn = d3.rules.find(r => r.id === 'daily-notes');
ck(dn && dn.pct === 100, `11/03's Daily Notes aren't read for 11/03: ${JSON.stringify(dn)}`);
const d4 = TR.checkDay(t, '2026-11-04').rules.find(r => r.id === 'daily-notes');
ck(d4 && d4.pct === 0, `a day with no column of its own took another day's notes: ${JSON.stringify(d4)}`);
// dates in the heading itself, in another form
const head = ['Type of Task,Task Details,Accountable VA,11/02/2026 (Monday),2-Nov-2026,VA Notes,Status', 'LSH-TRAINING,Spelling Test,Ana,Done,,,Ongoing'].join('\n');
const h = TR.fromSheetCsv(head, { today: '2026-11-09' });
ck(h && JSON.stringify(h.tracker.noteDates) === '["2026-11-02"]' && h.tracker.rows[0].notes['2026-11-02'] === 'Done', `dates in the heading weren't read (or one day twice): ${JSON.stringify(h && h.tracker)}`);
// the Monitoring Sheet's entries by their date, in any form
const mon = TR.gradeMonitorText('Virtual Assistant Essentials - Day 1\nDate: Friday, October 30, 2026\nTakeaways\n1. one two three four\nVirtual Assistant Essentials - Day 2\nDate - 11/2\n', TR.MONITOR_TOPICS);
ck(JSON.stringify(mon.entries.map(e => e.date)) === JSON.stringify(['2026-10-30', TR.ptDate().slice(0, 4) + '-11-02']), `the Monitoring Sheet's entries aren't dated: ${JSON.stringify(mon.entries.map(e => e.date))}`);
// a tracker still on the template's own dates (December 2022) on a 2026 day: the check says so, and how to fix it
const old = TR.fromSheetCsv(['Type of Task,Task Details,Accountable VA,"Wednesday, December 14, 2022","Thursday, December 15, 2022",VA Notes,Status', 'LSH-TRAINING,Typing Test,Ana,,,,Ongoing'].join('\n'), { today: '2026-10-30' });
const od = TR.checkDay(Object.assign(old, { startDate: '2026-10-26' }), '2026-10-30').rules.find(r => r.id === 'daily-notes');
ck(od && /12\/14\/2022 to 12\/15\/2022: the template's own dates/.test(od.detail) && /10\/30\/2026/.test(od.detail), `old template dates aren't pointed out: ${JSON.stringify(od)}`);
ck(TR.staleDates(['2026-10-29'], '2026-10-30') === '', 'a tracker on the training\'s own dates was called stale');
if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('Tracker dates test passed (a day\'s inputs read for that day: the Daily Notes dated in any form, in the heading or under it; the Monitoring Sheet\'s entries by their Date: line).');
