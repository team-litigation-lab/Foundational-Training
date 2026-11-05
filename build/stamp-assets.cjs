// 🔖 Every deploy stamps the page's own files with what is in them, so nobody has to bump a version by hand:
//   - each local script and stylesheet index.html loads (/js/ft-*.js, /js/lsh-*.js, /js/eapa-updates.js, …) gets
//     ?v=<a hash of the file>: a file that changed is fetched fresh by every browser, one that didn't stays cached;
//   - APP_BUILD (the footer's "build …", /version, the Blueprint PDF's rebuild) becomes ft-<the deploy's date>-<a hash of them all>.
// Run by the deploy's build step (wrangler.json "build", after build/day-decks.cjs, whose js/ft-day-decks-data.js it
// stamps too), on the deploy's own copy: the ?v= in the repository can stay as they are.
// Usage: node build/stamp-assets.cjs [--check]   (--check: prints what it would change, writes nothing)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'index.html');
const check = process.argv.includes('--check');
const hash = (buf, n) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, n);

let html = fs.readFileSync(PAGE, 'utf8');
const all = crypto.createHash('sha256');
let stamped = 0, changed = 0;
// <script src="/js/x.js?v=…"> and <link href="/css/x.css?v=…">: local files only (never a CDN's)
html = html.replace(/(<(?:script|link)\b[^>]*?\s(?:src|href)=")(\/[A-Za-z0-9_\-./]+\.(?:js|css))(?:\?v=[^"]*)?(")/g, (m, pre, file, post) => {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return m;   // (a path the page names but the repository doesn't have: left as it is)
  const buf = fs.readFileSync(abs); all.update(file).update(buf);
  const out = `${pre}${file}?v=${hash(buf, 10)}${post}`;
  stamped++; if (out !== m) changed++;
  return out;
});
const d = new Date(), day = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
const build = `ft-${day}-${all.digest('hex').slice(0, 8)}`;
html = html.replace(/var APP_BUILD = "[^"]*";/, `var APP_BUILD = "${build}";`);
if (check) { console.log(`stamp-assets: ${stamped} files, ${changed} would change; APP_BUILD would be ${build}`); process.exit(0); }
fs.writeFileSync(PAGE, html);
console.log(`stamp-assets: ${stamped} files stamped (${changed} changed); APP_BUILD = ${build}`);
