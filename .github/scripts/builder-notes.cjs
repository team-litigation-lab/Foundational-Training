// No builder note on the site: the Training Guide's instructions for building the platform ("Embed this",
// "Link instead of embed", "Divide the Start Training Button…", the Part 1/Part 2 splits, "Claude to come up
// with…", "Focus in Automation // Calendar Simulator", "Act as a senior LMS engineer…", "This needs to be
// replicated… 5 Scenarios") are not content. build/curriculum/convert.py takes them out on import; this catches
// one pasted in by hand. The patterns are build/curriculum/builder-notes.json.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { notes } = require(path.join(ROOT, 'build/curriculum/builder-notes.json'));
const NOTE = new RegExp(notes.map(p => `(?:${p})`).join('|'), 'gi');
const SKIP = /(^|\/)(node_modules|\.git|\.github|\.wrangler|dist|build\/curriculum)(\/|$)/;
const found = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name), rel = path.relative(ROOT, p);
    if (SKIP.test(rel)) continue;
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(html|js|cjs|json)$/.test(name)) continue;
    const body = fs.readFileSync(p, 'utf8');
    for (const m of body.matchAll(NOTE)) found.push(`${rel}:${body.slice(0, m.index).split('\n').length}: “${m[0]}”`);
  }
})(ROOT);
if (found.length) { console.error('Builder notes would be shown on the platform:\n  ' + found.join('\n  ')); process.exit(1); }
console.log('builder notes: none on the site');
