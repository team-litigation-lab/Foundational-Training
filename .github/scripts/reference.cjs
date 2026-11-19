// 📎 What the Training Guide grades, and what is Additional Reference (js/ft-reference.js):
//   - scored: the trainer's mock-call and demo scorecards (by scorecard) and the three answer-key assessments; nothing else;
//   - a transcription's automatic score, the Intake Worksheet, a breakout worksheet, a Knowledge Check, the Monitoring Sheet,
//     a typing test and every other source's items are reference;
//   - a lesson is finished once its Knowledge Check is submitted or graded, whatever its mark (no 70% gate);
//   - the Weekly Ranking's scored columns are the scorecards' and the three assessments', the rest reference.
// Usage: node .github/scripts/reference.cjs   (no browser, no network)
const path = require('path');
require(path.join(process.cwd(), 'js/ft-rubrics.js'));
require(path.join(process.cwd(), 'js/ft-reference.js'));
const F = globalThis.ftReference, fail = [];
const T = { id: 'trainer' }, D = { id: 'drive' };
const yes = [[{ ref: 'act:reception-live' }, T], [{ ref: 'act:lor-demo' }, T], [{ ref: 'act:medlor-recorded-demo' }, T], [{ ref: 'act:settlement-demo' }, T],
  [{ ref: 'assess:14sz5f3HTQKmryc7Upvlc6qua008rPnmw' }, D], [{ ref: 'assess:11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C' }, D], [{ ref: 'assess:policy-disclosure' }, D]];
const no = [[{ ref: 'act:transcription-1' }, T], [{ ref: 'act:transcription-1', auto: true }, T], [{ ref: 'act:reception-live', auto: true }, T],
  [{ ref: 'assess:intakews' }, D], [{ ref: 'assess:breakout-d1' }, D], [{ ref: 'items:5-6-7' }, D], [{ ref: 'monitor' }, D], [{}, D],
  [{ ref: 'kc:3' }, { id: 'kc' }], [{ ref: 'act:reception-live' }, { id: 'calls' }], [{ name: 'Typing' }, { id: 'skills' }]];
yes.forEach(([it, s]) => { if (!F.scored(it, s)) fail.push(`${s.id} ${it.ref} should be scored`); });
no.forEach(([it, s]) => { if (F.scored(it, s)) fail.push(`${s.id} ${it.ref || it.name || '(no ref)'}${it.auto ? ' (auto)' : ''} should be Additional Reference`); });
if (!F.lessonDone({ score: 40 }) || !F.lessonDone({ submittedAt: '2026-11-01' }) || F.lessonDone({}) || F.lessonDone(null)) fail.push('a submitted or graded Knowledge Check, whatever its mark, should finish the lesson; nothing done, not');
const col = src => F.refCol({ type: 'score', src });
if (col('trainer:Intake Packet') || col('drive:Auto Liability') || col('drive:Common Terms') || col('drive:')) fail.push('the scorecards\' and assessments\' Weekly Ranking columns should be scored');
if (!col('day:monitor') || !col('compliance') || !col('pdp') || !col('drive:PI Reading Task') || !col('') || !col('kc:1')) fail.push('the other Weekly Ranking columns should be Additional Reference');
if (fail.length) { console.error('Additional Reference check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('Additional Reference check passed (only the trainer\'s scorecards and the three answer-key assessments are scored; a submitted Knowledge Check finishes its lesson; the Weekly Ranking scores only their columns).');
