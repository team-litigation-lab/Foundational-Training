// 📋 The Saving LORs scorecard (js/ft-rubrics.js 'lor'): the guide's two "Attention to Detail" rows merged into one, "Attention to
//   Detail, Verification & Efficiency". The old row keeps its place, retired, so every score saved before keeps its row:
//   - 9 slots, 8 shown, Tools Utilization last;
//   - the weighted average leaves the retired slot out, for a record saved with 9 scores and one saved with 8;
//   - nothing else is retired.
// Usage: node .github/scripts/lor-rubric.cjs   (no browser, no network)
const path = require('path');
require(path.join(process.cwd(), 'js/ft-rubrics.js'));
const R = globalThis.FT_RUBRICS, fail = [];
const lor = R.list.lor, names = lor.criteria.map(c => c.n), shown = lor.criteria.filter(c => !c.retired).map(c => c.n);
if (lor.criteria.length !== 9) fail.push(`the LOR scorecard has ${lor.criteria.length} slots, not 9`);
if (shown.length !== 8 || shown.filter(n => /^Attention to Detail/.test(n)).length !== 1) fail.push(`the LOR scorecard shows ${JSON.stringify(shown)}`);
if (names[6] !== 'Attention to Detail' || !lor.criteria[6].retired) fail.push('the retired "Attention to Detail" is not in its old place, 7th');
if (names[7] !== 'Attention to Detail, Verification & Efficiency' || names[8] !== 'Tools Utilization') fail.push(`the LOR scorecard ends ${names.slice(6).join(' | ')}`);
// a record saved before the merge: [4,4,4,4,4,4,2,5,3] → the retired 2 left out: (4×6 + 5 + 3) / 8 = 4.00
const a9 = R.average(lor, [4, 4, 4, 4, 4, 4, 2, 5, 3]);
if (Math.abs(a9 - 4) > 1e-9) fail.push(`a 9-score LOR record averages ${a9}, not 4.00 without the retired row`);
// a record saved after it (the retired slot empty)
const a8 = R.average(lor, [5, 5, 5, 5, 5, 5, null, 4, 4]);
if (Math.abs(a8 - 38 / 8) > 1e-9) fail.push(`an LOR record with the retired slot empty averages ${a8}, not 4.75`);
const others = Object.entries(R.list).filter(([k, rb]) => k !== 'lor' && rb.criteria.some(c => c.retired)).map(([k]) => k);
if (others.length) fail.push(`other scorecards have retired rows: ${others.join(', ')}`);
if (fail.length) { console.error('LOR scorecard check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('LOR scorecard check passed (the two Attention to Detail rows merged; the retired row keeps its place and is left out of the average).');
