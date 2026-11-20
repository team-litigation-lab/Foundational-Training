// 🎓 The certificate's name (index.html formatCertName): the Portal's full registered name gives the middle name and the
//   suffix, and the first and last names are matched in it as whole words (last "Le" in "Ana Lee" adds nothing).
// Usage: node .github/scripts/cert-name.cjs [index.html]   (no browser, no network)
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(process.argv[2] || path.join(process.cwd(), 'index.html'), 'utf8');
const m = src.match(/function formatCertName\(first, last, full\)\{[\s\S]*?\n\}/);
if (!m) { console.error('index.html has no formatCertName()'); process.exit(1); }
const state = { certSettings: {} };
const formatCertName = new Function('state', m[0] + '\nreturn formatCertName;')(state);
const failures = [];
const want = (args, fmt, out) => { state.certSettings.nameFormat = fmt; const got = formatCertName(...args); if (got !== out) failures.push(`${JSON.stringify(args)} (${fmt}) → "${got}", not "${out}"`); };
want(['Ana', 'Le', 'Ana Lee'], 'lastFirst', 'Le, Ana');
want(['Ana', 'Le', 'Ana Lee'], 'firstLast', 'Ana Le');
want(['Ana', 'Lee', 'Ana Lee'], 'lastFirst', 'Lee, Ana');
want(['Ana', 'Cruz', 'Ana Maria Cruz Jr.'], 'lastFirst', 'Cruz Jr., Ana Maria');
want(['Ana', 'Cruz', 'Ana Maria Cruz, III'], 'firstLast', 'Ana Maria Cruz, III');
want(['Ana', 'Cruz', 'ana  maria cruz'], 'lastFirst', 'Cruz, Ana maria');
want(['Mary Ann', 'Dela Cruz', 'Mary Ann B. Dela Cruz'], 'lastFirst', 'Dela Cruz, Mary Ann B.');
want(['Jo', 'Ng', 'Joan Ng'], 'lastFirst', 'Ng, Jo');
want(['Jo', 'Ng', 'Jo Ngo'], 'lastFirst', 'Ng, Jo');
want(['Ana', 'Lee', ''], 'lastFirst', 'Lee, Ana');
want(['Ana', 'Lee (x)', 'Ana Lee (x)'], 'lastFirst', 'Lee (x), Ana');
want(['Ana', '', 'Ana Lee'], 'lastFirst', 'Ana');
if (failures.length) { console.error('certificate name FAILED:\n  - ' + failures.join('\n  - ')); process.exit(1); }
console.log('certificate name: middle name and suffix from the full name, names matched as whole words');
