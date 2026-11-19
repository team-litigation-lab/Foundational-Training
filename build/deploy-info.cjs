// 🚀 Which commit this deploy is (deploy.json, served at /deploy.json and shown by /version). Written by the deploy's
// build (wrangler.json "build"), after the decks and the script versions. Workers Builds gives the commit as
// WORKERS_CI_COMMIT_SHA; otherwise git is asked. The Training Portal's uptime check compares it with GitHub main, so a
// deploy that stopped shows within the hour, whatever changed (the page's APP_BUILD stamp only follows the page's files).
// Not committed (.gitignore). Run: node build/deploy-info.cjs
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const R = path.resolve(__dirname, "..");
const git = (c) => { try { return execSync("git " + c, { cwd: R, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch (e) { return ""; } };
const commit = process.env.WORKERS_CI_COMMIT_SHA || git("rev-parse HEAD");
const branch = process.env.WORKERS_CI_BRANCH || git("rev-parse --abbrev-ref HEAD");
const info = { commit: commit || null, branch: branch || null, builtAt: new Date().toISOString(), build: process.env.WORKERS_CI_BUILD_UUID || null };
fs.writeFileSync(path.join(R, "deploy.json"), JSON.stringify(info) + "\n");
console.log("deploy-info: " + JSON.stringify(info));
