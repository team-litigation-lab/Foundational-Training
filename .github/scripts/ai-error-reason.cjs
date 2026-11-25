// An AI review the server refuses with its own reason (the trainee's access revoked, the batch archived, the account merged)
// shows that reason, not "your account type"; the Portal's shared AI gateway refusing this site is named as the site's setup.
// Usage: node .github/scripts/ai-error-reason.cjs
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8'), i = html.indexOf('function friendlyAiError(e){');
if (i < 0) { console.error('AI error reason check FAILED: no friendlyAiError in index.html'); process.exit(1); }
let depth = 0, j = html.indexOf('{', i);
for (; j < html.length; j++) { if (html[j] === '{') depth++; else if (html[j] === '}' && --depth === 0) break; }
const ctx = { state: {} }; vm.createContext(ctx); vm.runInContext(html.slice(i, j + 1), ctx);
const f = (m) => ctx.friendlyAiError(new Error(m)), fails = [];
for (const why of ['Your access to this program has been revoked. Contact your trainer if you believe this is a mistake.',
  "Your batch's training has ended and its records were archived. Contact your trainer if you need anything from it.",
  'This account was merged into your current one. Open the program again from the LSH Training Portal.'])
  if (f('AI service error 403: ' + why) !== why) fails.push(`"${why.slice(0, 40)}…" isn't shown: ${f('AI service error 403: ' + why)}`);
if (!/account type/.test(f('AI service error 403: Forbidden'))) fails.push('a 403 with no reason no longer gets the sign-out advice');
if (!/AI_GATEWAY_SECRET/.test(f('AI service error 502: Not allowed.'))) fails.push('the Portal gateway refusing the site is put on the trainee');
if (fails.length) { console.error('AI error reason check FAILED:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('AI error reason check passed (a refusal with the server\'s reason shows it; a bare 403 keeps the sign-out advice; the gateway\'s refusal is named as the site\'s setup).');
