/* ============================================================
   ☎ RING CHANNEL + 🗂 CMS ON THE MOCK CALL SCORECARDS
   ------------------------------------------------------------
   The Reception, Calendar Management and Intake Mock Calls are taken on ☎ LSH Ring Channel (the training phone: the
   Main Line for Reception and Calendar Management, the Intake Line for Intake) with the case work done in the CMS (the
   Front Desk Drill and the case files; the Prototype CMS's intake for Intake). Their scorecards (js/ft-rubrics.js:
   reception, calendar, intake) carry both, wherever a trainer scores one — 🧑‍🏫 Graders (js/ft-batch-admin.js),
   🧑‍🏫 Trainer Inputs and the slide's scoresheet pop-up (js/ft-sessions.js FTMetrics):
     ☎ Ring Channel   the line's buttons (open Ring Channel on the line: the trainer rings the trainee from its
                      🎭 Scenario Picker) and the trainee's graded calls on that line (callsim:<id>, which the Training
                      Portal writes from Ring Channel's /api/call-results): the best, how many, the latest. A graded call
                      that carries its Mock Calls Metrics, criterion by criterion, offers ⤓ Fill from the graded call.
     🗂 CMS           the CMS buttons, and the trainee's Practice Session for the lesson (sessions:<id>, js/ft-sessions.js:
                      Reception Mock Calls' call note, the Appointment Setting record, the intake entered from the
                      Prototype CMS): when it was submitted, the automated checks (%, what was missed) and what was
                      recorded. ⤓ Fill puts the checks' share, out of 5, in Tools Utilization (and in Attention to Details
                      on Reception and Intake), with what was missed as the Remarks.
   ⤓ never writes over a score already typed; nothing is saved until the trainer saves. A scorecard saved from any of the
   three keeps what it was scored beside (sources: the graded call and the CMS record), FTMockLinks.sources.
   Read once a visit per trainee (↻ reads them again), drawn into each .mcl placeholder when the records arrive.
   Loaded after js/ft-sessions.js and js/ft-rubrics.js, before js/ft-batch-admin.js.
   ============================================================ */
(function(){
"use strict";
const e = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
const PORTAL = "https://cm-training-activity.pages.dev/simulators/call.html?";
const ring = line => PORTAL + new URLSearchParams({program: "FT", line});
// each mock call's scorecard (by its rubric key): its lesson, its Ring Channel line, its Practice Session and its CMS
const LINES = {
  reception: {lesson: 4, line: "Reception Mock Calls", phone: "Main Line", session: "reception",
    cms: [["🗂 CMS Case Files", CMS], ["☎️ Front Desk Drill", CMS + "?program=reception&flow=reception&drill=1&from=standard"]], fill: [/attention to detail/i]},
  calendar: {lesson: 5, line: "Calendar Management Mock Calls", phone: "Main Line", session: "calendaring",
    cms: [["🗂 CMS Case Files", CMS]], fill: []},
  intake: {lesson: 6, line: "Intake Mock Calls", phone: "Intake Line", session: "intake",
    cms: [["🗂 Prototype CMS (Intake)", CMS + "?" + new URLSearchParams({program: "intake", from: "standard"})]], fill: [/attention to detail/i]}
};
const RUB = () => window.FT_RUBRICS || {forAct: () => null, list: {}};
const keyOfAct = a => { const rb = a ? RUB().forAct(a) : null; return rb && LINES[rb.key] ? rb.key : ""; };
const norm = v => String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const num = v => { const n = v == null || v === "" ? NaN : Number(v); return isFinite(n) ? n : null; };
const half = v => Math.max(0, Math.min(5, Math.round(v * 2) / 2));
const day = s => { const t = Date.parse(s || ""); return isFinite(t) ? new Date(t).toLocaleDateString() : ""; };

/* ---------- the trainee's records: callsim:<id> and sessions:<id>, read once a visit ---------- */
const C = {};   // id → {loading} | {call, sess} | {error}
function recOf(id){
  if(C[id]) return C[id].loading ? null : C[id];
  C[id] = {loading: true};
  Promise.resolve(typeof sharedGetMany === "function" ? sharedGetMany(["callsim:" + id, "sessions:" + id]) : [null, null])
    .then(v => { C[id] = {call: v && v[0] && typeof v[0] === "object" ? v[0] : null, sess: v && v[1] && typeof v[1] === "object" ? v[1] : null}; })
    .catch(() => { C[id] = {error: true}; })
    .then(paint);
  return null;
}
// (each placeholder on the page drawn again from what is read: the Graders sheet, the Trainer Inputs form, the pop-up)
function paint(){
  if(typeof document === "undefined") return;
  document.querySelectorAll(".mcl[data-mcl]").forEach(el => { const [id, key] = String(el.getAttribute("data-mcl")).split("|"); el.innerHTML = inner(id, key); });
}

/* ---------- ☎ the graded calls on the line ---------- */
// (a call in callsim:<id>.calls is the Portal's: read for its lesson or line, its score, its time and its metrics, by any of
// the names it may carry; the best and the count are its best.lessonN)
function callsOn(rec, L){
  const word = norm(L.line).split(" ")[0];
  return (Array.isArray(rec && rec.calls) ? rec.calls : []).filter(c => c && typeof c === "object" && (
    String(c.lesson == null ? "" : c.lesson).replace(/\D/g, "") === String(L.lesson) || norm([c.line, c.track, c.simulator, c.program].join(" ")).includes(word)))
    .map(c => ({score: num(c.score != null ? c.score : c.pct != null ? c.pct : c.percent), at: c.at || c.date || c.ts || c.createdAt || c.endedAt || "",
      who: c.scenario || c.caller || c.title || c.name || "", rows: rowsOf(c)}))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
function rowsOf(c){
  let r = c.rows || c.metrics || c.breakdown || c.criteria || c.scores;
  if(r && !Array.isArray(r) && typeof r === "object") r = Object.entries(r).map(([k, v]) => v && typeof v === "object" ? Object.assign({metric: k}, v) : {metric: k, score: v});
  return (Array.isArray(r) ? r : []).map(x => x && typeof x === "object" ? {n: String(x.metric || x.name || x.label || x.criterion || x.n || ""), v: num(x.score != null ? x.score : x.value),
    max: num(x.max || x.out_of || x.outOf), fb: String(x.feedback || x.note || x.comment || x.remarks || "")} : null).filter(x => x && x.n && x.v != null);
}
// a graded call's metrics on the scorecard's criteria, by name: {criterion index: score out of 5}, with their notes
function matchRows(rb, rows){
  const vals = {}, notes = {};
  rb.criteria.forEach((k, i) => { const n = norm(k.n), m = rows.find(x => norm(x.n) === n) || rows.find(x => { const y = norm(x.n); return y.length > 5 && (n.startsWith(y) || y.startsWith(n)); });
    if(!m) return; const v = m.max ? m.v / m.max * 5 : m.v > 5 ? m.v / 20 : m.v; vals[i] = half(v); if(m.fb) notes[i] = m.fb.slice(0, 600); });
  return {vals, notes, n: Object.keys(vals).length};
}

/* ---------- 🗂 the lesson's Practice Session: what the trainee recorded from the CMS ---------- */
function runOf(rec, L){
  const runs = Object.entries((rec && rec.runs) || {}).filter(([k, v]) => k.split("|")[0] === L.session && v && (v.submittedAt || v.startedAt));
  runs.sort((a, b) => String(b[1].submittedAt || "").localeCompare(String(a[1].submittedAt || "")) || String(b[1].startedAt || "").localeCompare(String(a[1].startedAt || "")));
  return runs.length ? Object.assign({key: runs[0][0]}, runs[0][1]) : null;
}
const info = L => window.FTSessions && typeof FTSessions.sessionInfo === "function" ? FTSessions.sessionInfo(L.session) : null;
function cmsFill(rb, L, run){
  const a = run && run.auto; if(!a || !Array.isArray(a.checks) || !a.checks.length) return null;
  const met = a.checks.filter(x => x.ok).length, miss = a.checks.filter(x => !x.ok).map(x => x.label), v = half(met / a.checks.length * 5);
  const note = `CMS record: ${met} of ${a.checks.length} checks met` + (miss.length ? `; missed: ${miss.join("; ")}` : "") + ".";
  const vals = {}, notes = {}, W = (RUB().WRITING || "Tools Utilization").toLowerCase();
  rb.criteria.forEach((k, i) => { if(norm(k.n) === norm(W) || L.fill.some(re => re.test(k.n))){ vals[i] = v; notes[i] = note.slice(0, 600); } });
  return Object.keys(vals).length ? {vals, notes, v, names: rb.criteria.filter((k, i) => vals[i] != null).map(k => k.n)} : null;
}
const answer = v => Array.isArray(v) ? v.join(", ") : v === true ? "✓" : v === false ? "—" : String(v == null ? "" : v);

/* ---------- the panel ---------- */
function inner(id, key){
  const L = LINES[key], rb = RUB().list[key] ? Object.assign({key}, RUB().list[key]) : null; if(!L || !rb) return "";
  const btn = (label, href) => `<a class="btn btn-ghost btn-sm" href="${e(href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const r = recOf(id);
  const head = (ic, title, tools) => `<div class="mcl-h"><b>${ic} ${title}</b><span class="mcl-tools">${tools}</span></div>`;
  const ringTools = btn("☎ Open Ring Channel", ring(L.line)), cmsTools = L.cms.map(([l, h]) => btn(l, h)).join("");
  if(!r) return `<div class="mcl-box">${head("☎", `Ring Channel · ${e(L.phone)}`, ringTools)}<p class="mcl-muted">Loading the trainee’s graded calls…</p></div>
    <div class="mcl-box">${head("🗂", "CMS", cmsTools)}<p class="mcl-muted">Loading what the trainee recorded from the CMS…</p></div>`;
  if(r.error) return `<div class="mcl-box">${head("☎", `Ring Channel · ${e(L.phone)}`, ringTools)}<p class="mcl-muted">The trainee’s graded calls couldn’t be read. ↻ Refresh to try again.</p></div>
    <div class="mcl-box">${head("🗂", "CMS", cmsTools)}<p class="mcl-muted">The trainee’s CMS record couldn’t be read. ↻ Refresh to try again.</p></div>`;
  // ☎ the graded calls
  const best = ((r.call || {}).best || {})["lesson" + L.lesson] || null, calls = callsOn(r.call, L), last = calls[calls.length - 1] || null;
  const m = last && last.rows.length ? matchRows(rb, last.rows) : null;
  const ringBody = !best && !calls.length ? `<p class="mcl-muted">No graded call on Ring Channel’s ${e(L.line)} yet. Ring the trainee from 🎭 Call to play (Scenario Picker) → Standard Training → ${e(L.line.replace(/ Mock Calls$/, ""))}.</p>`
    : `<p>🎯 Graded calls: ${best && num(best.score) != null ? `best <b>${e(Math.round(best.score))}%</b>` : ""}${best && best.calls != null ? ` · ${e(best.calls)} call${Number(best.calls) === 1 ? "" : "s"}` : calls.length ? ` · ${calls.length} call${calls.length === 1 ? "" : "s"}` : ""}
      ${last ? ` · latest${last.score != null ? ` <b>${e(Math.round(last.score))}%</b>` : ""}${last.who ? ` (${e(last.who)})` : ""}${day(last.at) ? `, ${e(day(last.at))}` : ""}` : ""}</p>
      ${m && m.n ? `<button class="btn btn-navy btn-sm" type="button" onclick='FTMockLinks.fill(this, ${JSON.stringify({vals: m.vals, notes: m.notes, src: "the graded call"}).replace(/'/g, "&#39;")})'>⤓ Fill ${m.n} criteri${m.n === 1 ? "on" : "a"} from the graded call’s metrics</button>` : ""}`;
  // 🗂 the CMS record
  const run = runOf(r.sess, L), si = info(L), f = run ? cmsFill(rb, L, run) : null;
  const fields = run && si && Array.isArray(si.fields) ? si.fields.filter(([n]) => { const v = (run.answers || {})[n]; return v != null && v !== "" && !(Array.isArray(v) && !v.length); }) : [];
  const a = run && run.auto, miss = a && Array.isArray(a.checks) ? a.checks.filter(x => !x.ok) : [];
  const cmsBody = !run ? `<p class="mcl-muted">No ${e((si && si.title) || L.line)} Practice Session yet: what the trainee records from the CMS shows here once they start it.</p>`
    : `<p>📝 <b>${e((si && si.title) || L.line)}</b>: ${run.submittedAt ? `submitted ${e(day(run.submittedAt))}${run.minutes ? ` · ${e(run.minutes)} min` : ""}${run.attempts ? ` · attempt ${e(run.attempts)}` : ""}` : "🟢 in progress, not submitted yet"}
      ${a ? ` · automated checks <b>${e(a.pct)}%</b>` : ""}</p>
      ${miss.length ? `<p class="mcl-miss">✗ Missed: ${miss.map(x => e(x.label) + (x.want ? ` <em>(expected: ${e(x.want)})</em>` : "")).join("; ")}</p>` : a ? `<p class="mcl-ok">✓ Every check met.</p>` : ""}
      ${fields.length ? `<details class="mcl-rec"><summary>What the trainee recorded (${fields.length})</summary><dl>${fields.map(([n, label]) => `<dt>${e(label)}</dt><dd>${e(answer(run.answers[n]))}</dd>`).join("")}</dl></details>` : ""}
      ${f ? `<button class="btn btn-ghost btn-sm" type="button" onclick='FTMockLinks.fill(this, ${JSON.stringify({vals: f.vals, notes: f.notes, src: "the CMS checks"}).replace(/'/g, "&#39;")})'>⤓ Fill ${f.names.map(e).join(" &amp; ")} from the CMS checks (${e(f.v)}/5)</button>` : ""}`;
  return `<div class="mcl-box">${head("☎", `Ring Channel · ${e(L.phone)}`, ringTools)}${ringBody}</div><div class="mcl-box">${head("🗂", "CMS", cmsTools)}${cmsBody}</div>`;
}
// the placeholder, drawn now and filled in when the records arrive (r: the trainee's record, a: the activity)
// (fold: folded under one line, for the slide's scoresheet pop-up, which keeps to one screen)
function panel(r, a, fold){
  const key = keyOfAct(a); if(!key || !r || !r.id) return "";
  const box = `<div class="fss-wide mcl" data-mcl="${e(r.id + "|" + key)}">${inner(r.id, key)}</div>`;
  return fold ? `<details class="fss-wide mcl-fold"><summary>☎ Ring Channel · ${e(LINES[key].phone)} and 🗂 CMS: the graded calls and what was recorded</summary>${box}</details>` : box;
}

/* ---------- ⤓ into whichever scoresheet the button is on, never over a typed score ---------- */
function fill(btn, x){
  let n = 0;
  if(btn.closest(".fms") && window.FTMockScores && FTMockScores.fillCrit) n = FTMockScores.fillCrit(x.vals, x.notes);
  else {
    const box = btn.closest(".ftms") || btn.closest(".fss-cellform"); if(!box) return;
    let last = null;
    Object.entries(x.vals || {}).forEach(([i, v]) => { const inp = box.querySelector(`[data-crit="${i}"]`); if(!inp || String(inp.value).trim() !== "") return;
      inp.value = v; n++; last = inp; const fb = box.querySelector(`[data-fb="${i}"]`); if(fb && x.notes && x.notes[i] && !String(fb.value).trim()) fb.value = x.notes[i]; });
    if(last){ if(box.classList.contains("ftms") && window.FTMetrics && FTMetrics.calc) FTMetrics.calc(last); else if(window.FTInputs && FTInputs.calc) FTInputs.calc(last); }
  }
  if(typeof toast === "function") toast(n ? `⤓ ${n} criteri${n === 1 ? "on" : "a"} filled from ${x.src}. Review them, then Save.` : "Those criteria already have scores: nothing typed was changed.");
  return n;
}
// what a scorecard was scored beside, kept with it when saved: the graded call on the line and the CMS record (undefined
// when the activity isn't one of the three mock calls or the records weren't read, so a saved snapshot isn't wiped)
function sources(id, act){
  const key = keyOfAct(act), L = LINES[key], r = C[id]; if(!L || !r || r.loading || r.error) return undefined;
  const best = ((r.call || {}).best || {})["lesson" + L.lesson] || null, calls = callsOn(r.call, L), last = calls[calls.length - 1] || null, run = runOf(r.sess, L);
  return {at: new Date().toISOString(),
    call: best || last ? {line: L.line, best: best && num(best.score) != null ? Math.round(best.score) : null, calls: best && best.calls != null ? Number(best.calls) : calls.length,
      latest: last ? {score: last.score == null ? null : Math.round(last.score), at: String(last.at || "")} : null} : null,
    cms: run ? {session: run.key, submittedAt: run.submittedAt || null, attempt: run.attempts || null, pct: run.auto ? run.auto.pct : null} : null};
}
window.FTMockLinks = {panel, fill, sources, lines: LINES, keyOf: keyOfAct,
  // ↻ read the trainee's records again (all trainees when no id)
  refresh(id){ if(id) delete C[id]; else Object.keys(C).forEach(k => delete C[k]); paint(); }};
window.ftMockLinks = panel;

if(typeof document !== "undefined"){ const s = document.createElement("style"); s.id = "ft-mockcall-links"; s.textContent = `
.mcl{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));align-items:start;gap:10px;margin:8px 0 10px;}
.mcl-box{padding:10px 12px;border-radius:8px;background:#EEF3FF;color:#1F2A44;font-size:13px;line-height:1.5;border:1px solid #D5DEF5;min-width:0;}
.mcl-box p{margin:4px 0;} .mcl-box .btn{margin:4px 6px 0 0;}
.mcl-h{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 8px;margin-bottom:2px;}
.mcl-h .mcl-tools .btn{margin:0 0 0 6px;}
.mcl-muted{color:#5B6478;} .mcl-miss{color:#8A3B12;} .mcl-ok{color:#1E6B3A;font-weight:600;}
.mcl-rec summary{cursor:pointer;font-weight:600;margin:4px 0;} .mcl-rec dl{display:grid;grid-template-columns:minmax(120px,40%) 1fr;gap:2px 10px;margin:4px 0;}
.mcl-rec dt{color:#5B6478;} .mcl-rec dd{margin:0;overflow-wrap:anywhere;}
.mcl-fold{margin:6px 0;} .mcl-fold>summary{cursor:pointer;font-weight:700;font-size:13px;color:#1F2A44;padding:6px 10px;border-radius:8px;background:#EEF3FF;border:1px solid #D5DEF5;}
@media (max-width:600px){ .mcl{grid-template-columns:1fr;} .mcl-rec dl{grid-template-columns:1fr;} }
`; document.head.appendChild(s); }
})();
