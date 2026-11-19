// 🚀 The deploy says which commit it is: build/deploy-info.cjs writes deploy.json in the deploy's build (wrangler.json
// "build"), and /version shows it beside the page's APP_BUILD — what the Training Portal's uptime check compares with
// GitHub main. Usage: node .github/scripts/deploy-info.cjs   (no browser, no network)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process'); const { pathToFileURL } = require('url');
const failures = []; const fail = (m) => failures.push(m);
(async () => {
  const R = process.cwd(), wr = JSON.parse(fs.readFileSync(path.join(R, 'wrangler.json'), 'utf8'));
  if (!/node build\/deploy-info\.cjs/.test(wr.build.command)) fail(`the deploy's build doesn't write deploy.json: ${wr.build.command}`);
  if (!/^deploy\.json$/m.test(fs.readFileSync(path.join(R, '.gitignore'), 'utf8'))) fail('deploy.json is not kept out of git');
  execSync('node build/deploy-info.cjs', { cwd: R, env: Object.assign({}, process.env, { WORKERS_CI_COMMIT_SHA: 'abc123def', WORKERS_CI_BRANCH: 'main' }), stdio: 'ignore' });
  const info = JSON.parse(fs.readFileSync(path.join(R, 'deploy.json'), 'utf8'));
  if (info.commit !== 'abc123def' || info.branch !== 'main' || !info.builtAt) fail(`deploy.json doesn't carry the build's commit: ${JSON.stringify(info)}`);
  const worker = (await import(pathToFileURL(path.join(R, 'worker.js')).href)).default;
  const ASSETS = { fetch: async (req) => { const p = new URL(req.url).pathname, f = path.join(R, p === '/' ? 'index.html' : p);
    return fs.existsSync(f) ? new Response(fs.readFileSync(f)) : new Response('not found', { status: 404 }); } };
  const env = { ASSETS, MASTER_ADMIN_PASSWORD: 'ci-pass', SESSION_SECRET: 'ci', LSH_KV: { get: async () => null, put: async () => {}, delete: async () => {}, list: async () => ({ keys: [], list_complete: true }) } };
  const text = await (await worker.fetch(new Request('http://x/version'), env, { waitUntil() {} })).text();
  if (!/^Commit: abc123def \(built /m.test(text)) fail(`/version doesn't show the deploy's commit:\n${text.slice(0, 300)}`);
  if (!/^Portal build deployed: ft-/m.test(text)) fail('/version no longer shows the page\'s APP_BUILD');
  // (without deploy.json — a deploy built before this — it says so, it doesn't break)
  fs.unlinkSync(path.join(R, 'deploy.json'));
  const old = await (await worker.fetch(new Request('http://x/version'), env, { waitUntil() {} })).text();
  if (!/^Commit: unknown/m.test(old)) fail(`/version without deploy.json: ${old.slice(0, 200)}`);
  if (failures.length) { console.error('Deploy info test FAILED:\n- ' + failures.join('\n- ')); process.exit(1); }
  console.log('Deploy info test passed (the deploy\'s build writes deploy.json with its commit, /version shows it beside APP_BUILD, and says "unknown" without it).');
})().catch((e) => { console.error('Deploy info test FAILED:', e && e.stack || e); process.exit(1); });
