// 📖 The glossary's search highlighting (glossary.html hl): a match is marked in the definition's own text, never inside the
// escaped form of a character, so typing "o" or "amp" still shows a quote or an "&" as itself, and the text stays escaped.
// Usage: node .github/scripts/glossary-hl.cjs   (no browser, no network)
const fs = require('fs'), path = require('path');
const failures = []; const fail = (m) => failures.push(m);
const src = fs.readFileSync(path.join(process.cwd(), 'glossary.html'), 'utf8');
// (the page's own esc() and hl(), each up to its closing "}" at the start of a line, or on its one line)
const pick = (name) => { const m = src.match(new RegExp('function ' + name + '\\(s\\) \\{(?:.*\\}\\n|[\\s\\S]*?\\n\\})')); if (!m) throw new Error('glossary.html has no ' + name + '()'); return m[0]; };
const run = (q, s) => new Function('q', pick('esc') + '\n' + pick('hl') + '\nreturn hl;')(q)(s);
const want = (q, s, out) => { const got = run(q, s); if (got !== out) fail(`hl(${JSON.stringify(s)}) searching "${q}": ${got}\n  (want ${out})`); };
want('o', '"Guilty act": the physical act', '&quot;Guilty act&quot;: the physical act');
want('t', '"Guilty act"', '&quot;Guil<mark>t</mark>y ac<mark>t</mark>&quot;');
want('amp', 'A & B: an example', 'A &amp; B: an ex<mark>amp</mark>le');
want('T', '<T> & "t"', '&lt;<mark>T</mark>&gt; &amp; &quot;<mark>t</mark>&quot;');
want('a & b', 'A & B', '<mark>A &amp; B</mark>');
want('"', 'say "x"', 'say <mark>&quot;</mark>x<mark>&quot;</mark>');
want('(', 'f(x)', 'f<mark>(</mark>x)');
want('', 'a & "b"', 'a &amp; &quot;b&quot;');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('glossary search highlighting: ok');
