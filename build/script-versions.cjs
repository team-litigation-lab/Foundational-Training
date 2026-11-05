// 🔁 Every script the page loads gets a new version whenever its code changes, by itself: each
// <script src="/js/<name>.js?v=…"> (and <link href="/….css?v=…">) in index.html is given ?v=<fingerprint of the file>, so a
// browser never keeps an old copy of a changed file, and nobody has to bump a version by hand.
//   - A file that loads other files of /js/ by name (js/ft-day-decks.js loads /js/ft-day-decks-data.js, js/ft-intake.js
//     /js/ft-intake-samples.js, passing its own ?v= on) is fingerprinted with them, so a change to those reaches browsers too.
//   - Run at every deploy, after the Day decks' build (wrangler.json build.command), on the deployed copy of index.html.
// Usage: node build/script-versions.cjs           (rewrites index.html's versions)
//        node build/script-versions.cjs --check   (changes nothing: every versioned file exists, and prints the versions)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), PAGE = path.join(ROOT, 'index.html'), check = process.argv.includes('--check');
const read = f => { try { return fs.readFileSync(path.join(ROOT, f)); } catch (e) { return null; } };
const fp = {};
function fingerprint(rel, seen = new Set()) {
  if (fp[rel]) return fp[rel];
  const buf = read(rel); if (!buf) return null;
  const h = crypto.createHash('sha1').update(buf);
  seen.add(rel);
  // (the /js/ files this one loads by name, fingerprinted in with it)
  if (/\.js$/.test(rel)) {
    const deps = [...new Set([...String(buf).matchAll(/["'`]\/(js\/[A-Za-z0-9_.-]+\.js)/g)].map(m => m[1]))].filter(d => d !== rel && !seen.has(d)).sort();
    deps.forEach(d => { const b = read(d); if (b) h.update(d).update(b); });
  }
  return (fp[rel] = h.digest('hex').slice(0, 10));
}
const html = fs.readFileSync(PAGE, 'utf8');
let n = 0; const missing = [];
const out = html.replace(/(<(?:script|link)\b[^>]*?\s(?:src|href)=")\/((?:js|css)\/[^"?]+|[^"?/]+\.css)\?v=[^"]*(")/g, (all, a, rel, z) => {
  const v = fingerprint(rel);
  if (!v) { missing.push(rel); return all; }
  n++; return `${a}/${rel}?v=${v}${z}`;
});
if (missing.length) { console.error(`script-versions: no such file for ${missing.join(', ')}`); process.exit(1); }
if (check) { console.log(`script-versions: ${n} versioned files in index.html, each found`); process.exit(0); }
fs.writeFileSync(PAGE, out);
console.log(`script-versions: ${n} files in index.html versioned by their content`);
