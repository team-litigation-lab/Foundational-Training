// Runs browser tests side by side, each against a test server of its own (a fresh, empty store, so no test sees another's
// records), and reports each one with its output. The Checks workflow's smoke job runs the tests .github/scripts/affected.mjs
// picks; with ALL (or no list), every browser test.
// Usage: node .github/scripts/smoke.mjs [ALL | NONE | test files …]   (SMOKE_JOBS: how many at once, 3 by default; NODE_PATH: Playwright)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd(), S = '.github/scripts';
const JOBS = Math.max(1, Number(process.env.SMOKE_JOBS) || 3), TIMEOUT = 10 * 60 * 1000;
const read = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };
const EVERY = fs.readdirSync(path.join(ROOT, S)).filter(f => f.endsWith('.cjs') && f !== 'sign-in.cjs' && /http:\/\/localhost:8787\//.test(read(`${S}/${f}`))).map(f => `${S}/${f}`).sort();
const want = process.argv.slice(2).filter(Boolean);
if (want.includes('NONE')) { console.log('No browser test reads what this change touches.'); process.exit(0); }
const tests = !want.length || want.includes('ALL') ? EVERY : want.filter(t => EVERY.includes(t));
if (!tests.length) { console.log('No browser test is affected by this change.'); process.exit(0); }
console.log(`Running ${tests.length} of ${EVERY.length} browser tests, ${JOBS} at a time:\n  ${tests.join('\n  ')}\n`);

const wait = ms => new Promise(r => setTimeout(r, ms));
async function up(port) { for (let i = 0; i < 120; i++) { try { const r = await fetch(`http://localhost:${port}/`); if (r.status) return true; } catch (e) {} await wait(250); } return false; }
function run(cmd, argv, log) {
  return new Promise(res => {
    const p = spawn(cmd, argv, { cwd: ROOT, env: process.env });
    p.stdout.on('data', d => log.push(String(d))); p.stderr.on('data', d => log.push(String(d)));
    const kill = setTimeout(() => { log.push(`\n(timed out after ${TIMEOUT / 60000} minutes)\n`); p.kill('SIGKILL'); }, TIMEOUT);
    p.on('close', code => { clearTimeout(kill); res(code); });
  });
}
async function one(test, port) {
  const srv = [], out = [], t0 = Date.now();
  const server = spawn(process.execPath, [`${S}/server.mjs`, String(port)], { cwd: ROOT, env: process.env });
  server.stdout.on('data', d => srv.push(String(d))); server.stderr.on('data', d => srv.push(String(d)));
  let code = 1;
  if (await up(port)) code = await run(process.execPath, [test, `http://localhost:${port}/`], out);
  else out.push('The test server did not start.\n');
  server.kill();
  return { test, code, secs: Math.round((Date.now() - t0) / 1000), out: out.join(''), srv: srv.join('') };
}

const queue = tests.slice(), results = [];
await Promise.all(Array.from({ length: Math.min(JOBS, tests.length) }, async (_, k) => {
  for (let t; (t = queue.shift());) {
    const r = await one(t, 8787 + k);
    results.push(r);
    console.log(`::group::${r.code === 0 ? '✓' : '✗'} ${path.basename(t)} (${r.secs}s)`);
    process.stdout.write(r.out.trim() + '\n');
    if (r.code !== 0) console.log('--- server log ---\n' + r.srv.trim());
    console.log('::endgroup::');
  }
}));
const bad = results.filter(r => r.code !== 0);
console.log(`\n${results.length - bad.length} of ${results.length} passed.` + (bad.length ? ` Failed: ${bad.map(r => path.basename(r.test)).join(', ')}` : ''));
process.exit(bad.length ? 1 : 0);
