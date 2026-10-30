// The PR agent's planner, run by .github/workflows/pr-agent.yml (every 30 minutes, after every Checks run, on every
// push to a branch, and on Run workflow). Each run:
//   1. opens a pull request for every recent branch that is ahead of main and has none (GitHub's "Compare & pull
//      request" button, pressed automatically);
//   2. merges every open pull request whose checks are green and that merges cleanly (then deletes its branch);
//   3. brings a pull request that is only behind main up to date;
//   4. lists the pull requests with red checks or a merge conflict, for the workflow's "fix" job (Claude) to repair.
// Nothing is remembered between runs except what is on GitHub (labels and the agent's comments), so a run that
// stops halfway — out of Actions minutes, out of Claude credits — is simply picked up by the next one.
//
// Needs the gh CLI with GH_TOKEN, and GITHUB_REPOSITORY. Settings (repository variables, passed in as env):
//   PR_AGENT_MERGE_METHOD          squash (default) | merge | rebase
//   PR_AGENT_BRANCH_MAX_AGE_DAYS   only open pull requests for branches with a commit this recent (default 14)
//   PR_AGENT_MAX_FIX_ATTEMPTS      Claude tries a pull request at most this many times (default 3)
//   PR_AGENT_SKIP_BRANCHES         a regular expression; matching branches are left alone
//   DRY_RUN=1                      print what would be done, change nothing
// A pull request labelled agent:skip (or a draft) is left alone. Writes the fix list to $GITHUB_OUTPUT as fix=[…]
// and a summary to $GITHUB_STEP_SUMMARY.
import fs from 'fs';
import { execFileSync } from 'child_process';

const REPO = process.env.GITHUB_REPOSITORY;
if (!REPO) { console.error('GITHUB_REPOSITORY is not set'); process.exit(1); }
const [OWNER, NAME] = REPO.split('/');
const DRY = process.env.DRY_RUN === '1';
const MERGE_METHOD = process.env.PR_AGENT_MERGE_METHOD || 'squash';
const MAX_AGE_DAYS = Number(process.env.PR_AGENT_BRANCH_MAX_AGE_DAYS || 14);
const MAX_ATTEMPTS = Number(process.env.PR_AGENT_MAX_FIX_ATTEMPTS || 3);
const SKIP_BRANCHES = process.env.PR_AGENT_SKIP_BRANCHES ? new RegExp(process.env.PR_AGENT_SKIP_BRANCHES) : null;
// This workflow's own checks don't count toward a pull request's checks
const OWN_WORKFLOW = 'PR agent';
export const ATTEMPT_MARK = '<!-- pr-agent:attempt';

const log = [];
const say = (line) => { console.log(line); log.push(line); };

function gh(args, { input } = {}) {
    return execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
}
const ghJson = (args) => JSON.parse(gh(args) || 'null');
function write(desc, args) {
    if (DRY) { say(`  (dry run) would ${desc}`); return true; }
    try { gh(args); return true; } catch (e) {
        say(`  ✗ could not ${desc}: ${String(e.stderr || e.message).trim().split('\n')[0]}`);
        return false;
    }
}

// 'pending' | 'failing' | 'passing' | 'none', and the names of the red checks
export function checkState(rollup) {
    const checks = (rollup || []).filter(c => c.workflowName !== OWN_WORKFLOW);
    if (!checks.length) return { state: 'none', failed: [] };
    const failed = [];
    let pending = false;
    for (const c of checks) {
        if (c.__typename === 'StatusContext') {
            if (c.state === 'PENDING' || c.state === 'EXPECTED') pending = true;
            else if (c.state === 'FAILURE' || c.state === 'ERROR') failed.push(c.context);
        } else {
            if (c.status !== 'COMPLETED') pending = true;
            else if (['FAILURE', 'TIMED_OUT', 'CANCELLED', 'ACTION_REQUIRED', 'STARTUP_FAILURE'].includes(c.conclusion)) failed.push(c.name);
        }
    }
    if (failed.length) return { state: 'failing', failed };
    return { state: pending ? 'pending' : 'passing', failed };
}

// Whether a branch should get a new pull request, given its associated pull requests
export function wantsPr(ref, base, now = Date.now()) {
    if (ref.name === base) return false;
    if (SKIP_BRANCHES && SKIP_BRANCHES.test(ref.name)) return false;
    const commit = ref.target || {};
    if (!commit.committedDate || now - Date.parse(commit.committedDate) > MAX_AGE_DAYS * 86400e3) return false;
    const prs = ref.associatedPullRequests?.nodes || [];
    if (prs.some(p => p.state === 'OPEN')) return false;
    // Already merged or closed at this very commit: nothing new to propose (a closed one was turned down on purpose)
    if (prs.some(p => p.headRefOid === commit.oid)) return false;
    return true;
}

function branchesWithoutPr(base) {
    const refs = [];
    let cursor = null;
    do {
        const q = `query($owner:String!,$name:String!,$cursor:String){repository(owner:$owner,name:$name){refs(refPrefix:"refs/heads/",first:100,after:$cursor){pageInfo{hasNextPage endCursor} nodes{name target{... on Commit{oid committedDate}} associatedPullRequests(first:10,states:[OPEN,MERGED,CLOSED]){nodes{number state headRefOid}}}}}}`;
        const args = ['api', 'graphql', '-f', `query=${q}`, '-F', `owner=${OWNER}`, '-F', `name=${NAME}`];
        if (cursor) args.push('-F', `cursor=${cursor}`);
        const page = ghJson(args).data.repository.refs;
        refs.push(...page.nodes);
        cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (cursor);
    return refs.filter(r => wantsPr(r, base));
}

function openPrFor(ref, base) {
    const cmp = ghJson(['api', `repos/${REPO}/compare/${encodeURIComponent(base)}...${encodeURIComponent(ref.name)}`]);
    if (!cmp.ahead_by) return;
    const commits = cmp.commits || [];
    const subject = (c) => c.commit.message.split('\n')[0];
    const title = commits.length ? subject(commits[commits.length - 1]) : ref.name;
    const body = [
        `Opened automatically by the PR agent for \`${ref.name}\` (${cmp.ahead_by} commit${cmp.ahead_by === 1 ? '' : 's'} ahead of \`${base}\`).`,
        '', ...commits.slice(-20).map(c => `- ${subject(c)}`),
        '', 'Label it `agent:skip` to keep the agent from fixing or merging it.',
    ].join('\n');
    say(`➕ ${ref.name}: opening a pull request — ${title}`);
    write(`open a pull request for ${ref.name}`, ['pr', 'create', '--repo', REPO, '--base', base, '--head', ref.name, '--title', title, '--body', body]);
}

function attempts(number) {
    const comments = ghJson(['api', '--paginate', '--slurp', `repos/${REPO}/issues/${number}/comments?per_page=100`]).flat();
    return comments.map(c => c.body || '').filter(b => b.includes(ATTEMPT_MARK))
        .map(b => (b.match(/sha=([0-9a-f]{7,40})/) || [])[1]).filter(Boolean);
}

function label(number, name, add) {
    write(`${add ? 'add' : 'remove'} label ${name} on #${number}`,
        ['pr', 'edit', String(number), '--repo', REPO, add ? '--add-label' : '--remove-label', name]);
}

function main() {
    const base = ghJson(['api', `repos/${REPO}`]).default_branch;
    say(`Repository ${REPO}, base ${base}${DRY ? ' (dry run)' : ''}`);
    if (!DRY) for (const [n, color, d] of [
        ['agent:skip', 'cccccc', 'The PR agent leaves this pull request alone'],
        ['agent:needs-human', 'd93f0b', 'The PR agent could not fix this pull request'],
        ['agent:waiting-credits', 'fbca04', 'The PR agent will retry once Claude credits are back'],
    ]) { try { gh(['label', 'create', n, '--repo', REPO, '--color', color, '--description', d]); } catch { /* exists */ } }

    // 1. Compare & pull request, for every recent branch without one
    for (const ref of branchesWithoutPr(base)) {
        try { openPrFor(ref, base); } catch (e) { say(`  ✗ ${ref.name}: ${String(e.stderr || e.message).trim().split('\n')[0]}`); }
    }

    // 2–4. Every open pull request
    const prs = ghJson(['pr', 'list', '--repo', REPO, '--state', 'open', '--base', base, '--limit', '200', '--json',
        'number,title,headRefName,headRefOid,isDraft,isCrossRepository,mergeable,mergeStateStatus,statusCheckRollup,labels']);
    const fix = [];
    for (const pr of prs.sort((a, b) => a.number - b.number)) {
        const tag = `#${pr.number} ${pr.headRefName}`;
        const labels = pr.labels.map(l => l.name);
        if (pr.isDraft || pr.isCrossRepository || labels.includes('agent:skip')) { say(`⏭  ${tag}: skipped (draft, fork or agent:skip)`); continue; }
        if (SKIP_BRANCHES && SKIP_BRANCHES.test(pr.headRefName)) { say(`⏭  ${tag}: skipped (PR_AGENT_SKIP_BRANCHES)`); continue; }
        const checks = checkState(pr.statusCheckRollup);
        const conflict = pr.mergeable === 'CONFLICTING';
        if (pr.mergeable === 'UNKNOWN') { say(`⏳ ${tag}: GitHub is still working out whether it merges`); continue; }

        if (!conflict && checks.state === 'passing') {
            if (pr.mergeStateStatus === 'BEHIND') {
                say(`🔄 ${tag}: green but behind ${base}, updating the branch (checks rerun, merged next time)`);
                write(`update #${pr.number}`, ['api', '-X', 'PUT', `repos/${REPO}/pulls/${pr.number}/update-branch`, '-f', `expected_head_sha=${pr.headRefOid}`]);
                continue;
            }
            if (pr.mergeStateStatus === 'BLOCKED') { say(`🔒 ${tag}: green, but branch protection blocks it (a required review?)`); continue; }
            say(`✅ ${tag}: green, merging (${MERGE_METHOD})`);
            if (write(`merge #${pr.number}`, ['api', '-X', 'PUT', `repos/${REPO}/pulls/${pr.number}/merge`,
                '-f', `merge_method=${MERGE_METHOD}`, '-f', `sha=${pr.headRefOid}`])) {
                for (const l of ['agent:needs-human', 'agent:waiting-credits']) if (labels.includes(l)) label(pr.number, l, false);
                write(`delete branch ${pr.headRefName}`, ['api', '-X', 'DELETE', `repos/${REPO}/git/refs/heads/${pr.headRefName}`]);
            }
            continue;
        }
        if (!conflict && checks.state === 'pending') { say(`⏳ ${tag}: checks still running`); continue; }
        if (!conflict && checks.state === 'none') { say(`⏳ ${tag}: no checks have reported yet`); continue; }

        // Red checks or a merge conflict: Claude's job, unless it already tried this commit or ran out of tries
        const reasons = [...(conflict ? [`merge conflict with ${base}`] : []), ...checks.failed.map(n => `failing check: ${n}`)];
        const tried = attempts(pr.number);
        if (tried.some(s => pr.headRefOid.startsWith(s) || s.startsWith(pr.headRefOid))) { say(`🛠  ${tag}: ${reasons.join('; ')} — already tried at this commit, waiting for a new one`); continue; }
        if (tried.length >= MAX_ATTEMPTS) {
            say(`🙋 ${tag}: ${reasons.join('; ')} — ${tried.length} tries used, needs a person`);
            if (!labels.includes('agent:needs-human')) label(pr.number, 'agent:needs-human', true);
            continue;
        }
        say(`🛠  ${tag}: ${reasons.join('; ')} — sending to Claude (try ${tried.length + 1} of ${MAX_ATTEMPTS})`);
        fix.push({ number: pr.number, branch: pr.headRefName, sha: pr.headRefOid, title: pr.title, conflict, reasons: reasons.join('; ') });
    }

    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `fix=${JSON.stringify(fix)}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## PR agent\n\n${log.map(l => `- ${l}`).join('\n')}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
