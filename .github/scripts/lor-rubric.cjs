// 📋 The Saving LORs scorecard (js/ft-rubrics.js 'lor'): the guide's two "Attention to Detail" rows merged into one, "Attention to
//   Detail, Verification & Efficiency". The old row keeps its place, retired, so every score saved before keeps its row:
//   The guide's 6th metric, "Task Reporting, Hyperlinking & Task Attachment", is in its place (row 5); a card saved without it
//   is moved down one row from there as it is read (FT_RUBRICS.upgrade), so its scores stay on their own criteria.
//   - 10 slots, 8 shown (Tools Utilization, last, is retired on every scorecard: no guide metrics table has it);
//   - the weighted average leaves the retired slot out;
//   - nothing else is retired.
// Usage: node .github/scripts/lor-rubric.cjs   (no browser, no network)
const path = require('path');
require(path.join(process.cwd(), 'js/ft-rubrics.js'));
const R = globalThis.FT_RUBRICS, fail = [];
const lor = R.list.lor, names = lor.criteria.map(c => c.n), shown = lor.criteria.filter(c => !c.retired).map(c => c.n);
if (lor.criteria.length !== 10) fail.push(`the LOR scorecard has ${lor.criteria.length} slots, not 10`);
if (names[5] !== 'Task Reporting, Hyperlinking & Task Attachment' || names[6] !== 'Email/Fax Sending Accuracy & SOP Compliance') fail.push(`the LOR scorecard's 6th and 7th rows are ${names.slice(5, 7).join(' | ')}`);
if (shown.length !== 8 || shown.filter(n => /^Attention to Detail/.test(n)).length !== 1) fail.push(`the LOR scorecard shows ${JSON.stringify(shown)}`);
if (names[7] !== 'Attention to Detail' || !lor.criteria[7].retired) fail.push('the retired "Attention to Detail" is not 8th');
if (names[8] !== 'Attention to Detail, Verification & Efficiency' || names[9] !== 'Tools Utilization') fail.push(`the LOR scorecard ends ${names.slice(7).join(' | ')}`);
// a record saved now: [4,4,4,4,4,4,4,2,5,3] → the retired 2 and the retired Tools 3 left out: (4×7 + 5) / 8
const a10 = R.average(lor, [4, 4, 4, 4, 4, 4, 4, 2, 5, 3]);
if (Math.abs(a10 - 33 / 8) > 1e-9) fail.push(`a 10-score LOR record averages ${a10}, not 33/8 without the retired rows`);
// a card saved before the 6th metric was put back (9 rows: ..., Email/Fax 3, retired AtD 2, AtD V&E 5, Tools 1): moved down one
// from row 5 as it is read, so Email/Fax keeps its 3, the new row is empty, and it averages (4×5 + 3 + 5) / 7 as before
const old9 = { rubric: { key: 'lor', scores: [4, 4, 4, 4, 4, 3, 2, 5, 1], feedback: ['', '', '', '', '', 'fax ok', '', 'good', ''] } };
R.upgrade({ acts: { 'lor-demo': old9 } }); R.upgrade({ acts: { 'lor-demo': old9 } });   // (twice: it moves once)
if (JSON.stringify(old9.rubric.scores) !== JSON.stringify([4, 4, 4, 4, 4, null, 3, 2, 5, 1])) fail.push(`a 9-row LOR card reads ${JSON.stringify(old9.rubric.scores)}`);
if (old9.rubric.feedback[6] !== 'fax ok' || old9.rubric.feedback[5] !== '' || old9.rubric.feedback[8] !== 'good') fail.push(`a 9-row LOR card's feedback reads ${JSON.stringify(old9.rubric.feedback)}`);
if (R.scoreOf(old9) !== Math.round(28 / 7 / 5 * 100)) fail.push(`a 9-row LOR card scores ${R.scoreOf(old9)}, not ${Math.round(28 / 7 / 5 * 100)} as before`);
// (an 8-row card, from before the merge, read straight from scoreOf: moved once, however often it is read — the same 83 as before)
const old8 = { rubric: { key: 'lor', scores: [5, 5, 5, 5, 5, 3, 4, 1] } };
if (R.scoreOf(old8) !== Math.round((25 + 3 + 1) / 7 / 5 * 100) || R.scoreOf(old8) !== R.scoreOf(old8) || old8.rubric.scores[6] !== 3 || old8.rubric.scores.length !== 9) fail.push(`an 8-row LOR card scores ${R.scoreOf(old8)} (${JSON.stringify(old8.rubric.scores)})`);
// (another scorecard is never moved)
const intake = { rubric: { key: 'intake-packet', scores: [1, 2, 3] } }; R.upgrade({ acts: { x: intake } });
if (intake.rubric.scores.length !== 3) fail.push('a scorecard other than LOR was moved');
// (every other scorecard retires only Tools Utilization; the Transcription Activity keeps its own last row)
const others = Object.entries(R.list).filter(([k, rb]) => k !== 'lor' && rb.criteria.some(c => c.retired && c.n !== 'Tools Utilization')).map(([k]) => k);
if (others.length) fail.push(`other scorecards have other retired rows: ${others.join(', ')}`);
const tu = Object.entries(R.list).filter(([k, rb]) => k !== 'transcription' && !rb.criteria.some(c => c.n === 'Tools Utilization' && c.retired)).map(([k]) => k);
if (tu.length) fail.push(`Tools Utilization isn't retired on: ${tu.join(', ')}`);
// (a saved scorecard's score is worked out again without the retired rows: a Reception card all 4s with Tools Utilization 1)
const rec = { rubric: { key: 'reception', scores: R.list.reception.criteria.map(c => c.n === 'Tools Utilization' ? 1 : 4) } };
if (R.scoreOf(rec) !== 80) fail.push(`a saved Reception card scores ${R.scoreOf(rec)}, not 80 without Tools Utilization`);
if (fail.length) { console.error('LOR scorecard check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('LOR scorecard check passed (the 6th metric in its place, older cards moved to it; the two Attention to Detail rows merged; Tools Utilization retired on every scorecard; retired rows keep their place and are left out of the average and the saved score).');
