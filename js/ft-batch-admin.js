/* ============================================================
   🗂 THE BATCH'S VAs: their mock call scorecards, offboarding, and archiving a batch to Google Drive
   ------------------------------------------------------------
   📋 Mock Call Scorecards (Admin → 🛠 Practice Lab → 📋 Mock Call Scorecards): one Mock Call or Demo at a time, for the
      VAs registered in a batch (the current batch first: the active batch that started last). The activity's scorecard
      (js/ft-rubrics.js) runs down the side, a column per VA: each criterion 0–5, the feedback notes on a mock call, the
      weighted average, the score in %, the result, the date and the comment. 💾 Save writes each VA changed into
      labreview:<id>.acts[<activity>], exactly as 🧑‍🏫 Trainer Inputs does (js/ft-sessions.js), so it reaches their
      Practice Lab page, 🏅 My Performance, the Scorecards and the Main Portal.
   🚫 Offboard (the Trainee Audit's and a batch folder's Revoke): the VA's access closes (POST /api/batch/offboard: a Portal
      ticket no longer signs them in, and an open session signs them out) and they leave Batch Folders, Rankings, the
      Trainee Audit and the trainer's tabs. Their records are kept: Batch Folders → 🚫 Offboarded VAs → ↩ Restore access.
   📦 Archive a batch (every 📦 Archive button): the trainer gives a Google Drive folder link, and the batch is saved into
      it, in "Batch <id> — Archive <date>": the Scorecard Summary, the Mock Call & Demo Scorecards and the Progress Matrix
      (CSV, made here from the same grading the Scorecards use), the batch summary (JSON) and every VA's full records
      (Full records/<name>.json, made by the Worker). Only once all of it is saved, the batch is archived and, unless the
      trainer unticks it, cleared from the platform (POST /api/batch/purge per VA): the working records go, and the trainee
      record stays, slimmed, with a snapshot of the scorecard, for the Main Portal's 📊 Progress & Feedback, which reads
      this program's records. The batch then shows on the Archive shelf as ☁ Saved to Drive, with the folder's link
      (batchbackup:<batch>, admins only). A batch archived earlier gets ☁ Save to Drive & clear on its card.
   Loaded after js/ft-sessions.js and js/ft-admin-ops.js and before js/ft-program.js, which puts the tab in 🛠 Practice Lab.
   ============================================================ */
(function(){
"use strict";
if(typeof window.ftAdminTab !== "function") return;
const e = v => esc(String(v == null ? "" : v));
const RUB = () => window.FT_RUBRICS || {list:{}, keys:() => [], forAct:() => null, average:() => null};
const STATUSES = ["Not yet", "Passed", "Redo"];
const tScore = r => r && r.score != null && r.score !== "" && isFinite(Number(r.score)) ? Math.round(Number(r.score)) : null;
const avgTxt = v => v == null ? "—" : (Math.round(v * 100) / 100).toFixed(2) + "/5";
const today = () => new Date().toISOString().slice(0, 10);
const gone = r => !!(r && (r.offboarded || r.purgedAt));
const keyOf = r => typeof batchKey === "function" ? batchKey(r) : String((r && r.batch) || "");
const labelOf = b => typeof batchLabel === "function" ? batchLabel(b) : b;
// the trainer-led activities: the Mock Calls and Demos (each with its Training Guide scorecard where it has one)
const trainerActs = () => (window.FTSessions && typeof FTSessions.trainerActs === "function" ? FTSessions.trainerActs() : []) || [];
const scoredActs = () => trainerActs().filter(a => RUB().forAct(a) || /mock|demo/i.test(String(a.kind || "") + " " + String(a.title || "")));
async function api(path, body){
  const res = await authFetch(path, body || {});
  const j = await res.json().catch(() => ({}));
  if(!res.ok) throw Object.assign(new Error(j.error || ("HTTP " + res.status)), {code:j.code || ""});
  return j;
}

/* ---------- the ledger without the offboarded and the cleared: they're gone from every admin list ---------- */
function hideGone(){
  if(!Array.isArray(state.adminData)) return;
  state.adminDataAll = state.adminData;
  state.adminData = state.adminData.filter(r => !gone(r));
}
const __ledger = window.loadAdminLedger;
if(typeof __ledger === "function") window.loadAdminLedger = async function(){
  await __ledger.apply(this, arguments);
  hideGone(); render();
};
const __quiet = window.loadAdminLedgerQuiet;
if(typeof __quiet === "function") window.loadAdminLedgerQuiet = async function(){
  await __quiet.apply(this, arguments);
  hideGone();
};
const everyone = () => state.adminDataAll || state.adminData || [];

/* ---------- the batches: a Batch ID is B + MMDDYY, the day it started, so the current batch is the active one that started last ---------- */
const startOf = b => { const m = /^B(\d{2})(\d{2})(\d{2})$/.exec(String(b || "")); return m ? Date.UTC(2000 + Number(m[3]), Number(m[1]) - 1, Number(m[2])) : 0; };
function activeBatches(){
  const ks = new Set((state.adminData || []).filter(r => r.approved === true && !r.archived && !r.rejected).map(keyOf));
  if(typeof NO_BATCH !== "undefined") ks.delete(NO_BATCH);
  return [...ks].sort((a, b) => startOf(b) - startOf(a) || String(b).localeCompare(String(a)));
}
const registered = b => (state.adminData || []).filter(r => r.approved === true && !r.archived && !r.rejected && keyOf(r) === b)
  .sort((x, y) => String(x.name || "").localeCompare(String(y.name || "")));

/* ============================================================
   📋 Admin → Mock Call Scorecards
   ============================================================ */
const MS = {batch:"", act:"", rv:{}, loadedFor:"", loading:false, draft:{}, notes:true, saving:false};
const cellOf = (id, act) => ((((MS.rv[id] || {}).acts) || {})[act]) || {};
const dkey = id => MS.act + "|" + id;
function draftOf(id){
  const k = dkey(id);
  if(!MS.draft[k]){
    const c = cellOf(id, MS.act), rb = RUB().forAct(curAct()), got = c.rubric && rb && c.rubric.key === rb.key ? c.rubric : {};
    MS.draft[k] = {status:c.status || "Not yet", score:tScore(c) == null ? "" : String(tScore(c)), date:c.date || "", comment:c.comment || "",
      scores:(got.scores || []).slice(), feedback:(got.feedback || []).slice(), scoreTyped:false, dirty:false};
  }
  return MS.draft[k];
}
const valOf = (id) => MS.draft[dkey(id)] || null;
const curAct = () => scoredActs().find(a => a.id === MS.act) || null;
const dirtyIds = () => Object.keys(MS.draft).filter(k => k.startsWith(MS.act + "|") && MS.draft[k].dirty).map(k => k.slice(MS.act.length + 1));

async function msLoad(force){
  const ids = registered(MS.batch).map(r => r.id), sig = MS.batch + "|" + ids.join(",");
  if(MS.loading || (!force && MS.loadedFor === sig)) return;
  MS.loading = true;
  try{
    const vals = await sharedGetMany(ids.map(id => "labreview:" + id));
    ids.forEach((id, i) => { MS.rv[id] = vals[i] || {}; });
    Object.keys(MS.draft).forEach(k => { if(!MS.draft[k].dirty) delete MS.draft[k]; });   // (what isn't being edited shows what is saved)
    MS.loadedFor = sig;
  }catch(err){ toast("Couldn’t load the scorecards. Check your connection."); }
  MS.loading = false;
  if(state.view === "admin" && state.adminTab === "mockscores" && !isTyping()) render();
}
function renderMockScores(){
  if(state.adminLoading || !state.adminData){
    if(!state.adminLoading && typeof loadAdminLedger === "function") setTimeout(() => loadAdminLedger(), 0);
    return `<div class="card" style="padding:24px;">Loading the batches…</div>`;
  }
  const batches = activeBatches(), acts = scoredActs();
  if(!MS.batch || !batches.includes(MS.batch)) MS.batch = batches[0] || "";
  if(!MS.act || !acts.some(a => a.id === MS.act)) MS.act = (acts[0] || {}).id || "";
  const a = curAct(), rb = a ? RUB().forAct(a) : null, people = registered(MS.batch);
  const sig = MS.batch + "|" + people.map(r => r.id).join(",");
  if(MS.loadedFor !== sig) setTimeout(() => msLoad(), 0);
  const nDirty = dirtyIds().length;
  const head = `<div class="ff-bar"><div><h3>📋 Mock Call &amp; Demo Scorecards</h3>
      <p class="fss-muted">Score one Mock Call or Demo for every VA registered in the batch: the Training Guide’s scorecard down the side, a column per VA. Each criterion 0–5 (half points allowed); the weighted average becomes the score. Saved scores go to each VA’s Practice Lab page, their 🏅 My Performance, the Scorecards and the Main Portal — the same record as 🧑‍🏫 Trainer Inputs.</p></div>
      <span class="fms-ctl"><label>Batch <select onchange="FTMockScores.batch(this.value)">${batches.length ? batches.map((b, i) => `<option value="${e(b)}" ${b === MS.batch ? "selected" : ""}>${e(labelOf(b))}${i === 0 ? " (current)" : ""}</option>`).join("") : `<option value="">No active batch</option>`}</select></label>
      <label>Activity <select onchange="FTMockScores.act(this.value)">${acts.map(x => `<option value="${e(x.id)}" ${x.id === MS.act ? "selected" : ""}>${e(x.title)}</option>`).join("")}</select></label>
      ${rb && rb.feedback ? `<label class="fss-check"><input type="checkbox" ${MS.notes ? "checked" : ""} onchange="FTMockScores.notes(this.checked)"> feedback notes</label>` : ""}
      <button class="btn btn-ghost btn-sm" onclick="FTMockScores.refresh()" title="Read the batch and the saved scores again">↻</button></span></div>`;
  if(!batches.length) return `<div class="card fss-admin fms">${head}<p class="fss-muted">No active batch: a batch shows here once its VAs are registered and approved.</p></div>`;
  if(!a) return `<div class="card fss-admin fms">${head}<p class="fss-muted">No Mock Call or Demo in 🧑‍🏫 Trainer Inputs’ list of activities.</p></div>`;
  if(!people.length) return `<div class="card fss-admin fms">${head}<p class="fss-muted">No VAs registered in ${e(labelOf(MS.batch))} yet.</p></div>`;
  if(MS.loadedFor !== sig) return `<div class="card fss-admin fms">${head}<p class="fss-muted">Loading ${e(labelOf(MS.batch))}’s scorecards…</p></div>`;
  const v = id => valOf(id) || draftOf(id);
  const col = (r, inner) => `<td data-va="${e(r.id)}">${inner}</td>`;
  const savedTag = r => { const c = cellOf(r.id, a.id), d = valOf(r.id);
    return d && d.dirty ? `<span class="fms-tag dirty">● not saved</span>` : c.status ? `<span class="fms-tag ${c.status === "Passed" ? "ok" : c.status === "Redo" ? "mid" : ""}">${e(c.status)}${tScore(c) != null ? " · " + tScore(c) + "%" : ""}</span>` : `<span class="fms-tag">not scored</span>`; };
  const crit = rb ? rb.criteria.map((k, i) => `<tr><th scope="row">${e(k.n)}${k.w && k.w !== 1 ? ` <em>×${e(k.w)}</em>` : ""}</th>${people.map(r => { const d = v(r.id), sv = d.scores[i];
      return col(r, `<input type="number" min="0" max="5" step="0.5" value="${e(sv == null ? "" : sv)}" aria-label="${e(k.n)} · ${e(r.name)}" oninput="FTMockScores.crit('${e(r.id)}',${i},this.value)">${rb.feedback && MS.notes ? `<input class="fms-fb" value="${e(d.feedback[i] || "")}" placeholder="feedback" oninput="FTMockScores.fb('${e(r.id)}',${i},this.value)">` : ""}`); }).join("")}</tr>`).join("") : "";
  const avgRow = rb ? `<tr class="fms-avg"><th scope="row">WEIGHTED AVERAGE</th>${people.map(r => col(r, `<b data-avg>${avgTxt(RUB().average(rb, v(r.id).scores))}</b>`)).join("")}</tr>` : "";
  return `<div class="card fss-admin fms">${head}
    ${rb && rb.time ? `<p class="ti-rub-time">⏱ ${e(rb.time)}</p>` : ""}
    <div class="fms-scroll"><table class="fms-tbl"><thead><tr><th>${e((rb ? rb.title : a.title).toUpperCase())}<span>${people.length} VA${people.length === 1 ? "" : "s"} · ${e(labelOf(MS.batch))}</span></th>
      ${people.map(r => `<th data-va="${e(r.id)}"><b>${e(r.name || r.id)}</b>${savedTag(r)}</th>`).join("")}</tr></thead><tbody>
      ${crit}${avgRow}
      <tr class="fms-sum"><th scope="row">Score (%)</th>${people.map(r => col(r, `<input type="number" min="0" max="100" data-score value="${e(v(r.id).score)}" oninput="FTMockScores.score('${e(r.id)}',this.value)">`)).join("")}</tr>
      <tr class="fms-sum"><th scope="row">Result</th>${people.map(r => col(r, `<select onchange="FTMockScores.field('${e(r.id)}','status',this.value)">${STATUSES.map(s => `<option ${s === v(r.id).status ? "selected" : ""}>${s}</option>`).join("")}</select>`)).join("")}</tr>
      <tr class="fms-sum"><th scope="row">Date</th>${people.map(r => col(r, `<input type="date" value="${e(v(r.id).date)}" onchange="FTMockScores.field('${e(r.id)}','date',this.value)">`)).join("")}</tr>
      <tr class="fms-sum"><th scope="row">Comment<span>the VA sees it</span></th>${people.map(r => col(r, `<textarea rows="4" oninput="FTMockScores.field('${e(r.id)}','comment',this.value)" placeholder="What went well, what to improve">${e(v(r.id).comment)}</textarea>`)).join("")}</tr>
    </tbody></table></div>
    <div class="fp-actions fms-save"><button class="btn btn-navy btn-sm" data-ms-save ${nDirty && !MS.saving ? "" : "disabled"} onclick="FTMockScores.save(this)">💾 Save ${nDirty ? nDirty + " VA" + (nDirty === 1 ? "’s" : "s’") + " scorecard" + (nDirty === 1 ? "" : "s") : "the scorecards"}</button>
      <span class="fss-muted">Only the VAs you changed are saved. A score typed in % stays as typed; otherwise it follows the weighted average.</span></div></div>`;
}
// a column's average and score follow what was typed, without drawing the page again (the trainer may be mid-way through a row)
function refreshCol(id){
  const d = valOf(id), rb = RUB().forAct(curAct()); if(!d) return;
  d.dirty = true;
  if(!d.date) d.date = today();
  document.querySelectorAll(`.fms-tbl [data-va="${CSS.escape(id)}"]`).forEach(td => {
    const avg = rb ? RUB().average(rb, d.scores) : null;
    const a = td.querySelector("[data-avg]"); if(a) a.textContent = avgTxt(avg);
    const s = td.querySelector("[data-score]"); if(s && !d.scoreTyped){ d.score = avg == null ? "" : String(Math.round(avg / 5 * 100)); s.value = d.score; }
    const dt = td.querySelector('input[type="date"]'); if(dt && !dt.value) dt.value = d.date;
    const tag = td.querySelector(".fms-tag"); if(tag){ tag.className = "fms-tag dirty"; tag.textContent = "● not saved"; }
  });
  const n = dirtyIds().length, btn = document.querySelector("[data-ms-save]");
  if(btn){ btn.disabled = !n || MS.saving; btn.textContent = `💾 Save ${n} VA${n === 1 ? "’s" : "s’"} scorecard${n === 1 ? "" : "s"}`; }
}
window.FTMockScores = {
  batch(b){ MS.batch = b; render(); },
  act(a){ MS.act = a; render(); },
  notes(on){ MS.notes = on; render(); },
  refresh(){ MS.loadedFor = ""; if(typeof loadAdminLedger === "function") loadAdminLedger(); else render(); },
  crit(id, i, val){ const d = draftOf(id), t = String(val).trim(); d.scores[i] = t === "" ? null : Math.max(0, Math.min(5, Number(t))); refreshCol(id); },
  fb(id, i, val){ draftOf(id).feedback[i] = String(val).slice(0, 600); refreshCol(id); },
  score(id, val){ const d = draftOf(id); d.score = String(val).trim(); d.scoreTyped = d.score !== ""; refreshCol(id); },
  field(id, f, val){ draftOf(id)[f] = f === "comment" ? String(val).slice(0, 4000) : String(val); refreshCol(id); },
  async save(btn){
    const ids = dirtyIds(), act = MS.act, rb = RUB().forAct(curAct());
    for(const id of ids){ const s = valOf(id).score; if(s !== "" && !(Number(s) >= 0 && Number(s) <= 100)){ toast("A score is a number from 0 to 100."); return; } }
    MS.saving = true; if(btn) btn.disabled = true;
    let ok = 0;
    for(const id of ids){
      const d = valOf(id);
      try{
        const cur = (await sharedGet("labreview:" + id)) || {};
        cur.acts = cur.acts || {};
        const avg = rb ? RUB().average(rb, d.scores) : null;
        cur.acts[act] = Object.assign({status:d.status || "Not yet", score:d.score === "" ? null : Math.round(Number(d.score)), date:d.date || today(),
          comment:String(d.comment || "").trim().slice(0, 4000), at:new Date().toISOString()},
          rb && d.scores.some(x => x != null) ? {rubric:{key:rb.key, scores:rb.criteria.map((k, i) => d.scores[i] == null ? null : d.scores[i]),
            feedback:rb.criteria.map((k, i) => String(d.feedback[i] || "").trim().slice(0, 600)), avg:avg == null ? null : Math.round(avg * 100) / 100}} : {});
        if(await sharedSet("labreview:" + id, cur) === false) throw new Error("save");
        MS.rv[id] = cur; delete MS.draft[dkey(id)]; ok++;
      }catch(err){ /* left as not saved: the button offers it again */ }
    }
    MS.saving = false;
    toast(ok === ids.length ? `✓ Saved ${ok} scorecard${ok === 1 ? "" : "s"}. Each VA sees theirs on their Practice Lab page.` : `Saved ${ok} of ${ids.length}. The rest weren’t saved: check your connection and save again.`);
    render();
  }
};
ftAdminTab("mockscores", "📋 Mock Call Scorecards", renderMockScores);

/* ============================================================
   🚫 Offboarding a VA (the Trainee Audit's and a batch folder's Revoke)
   ============================================================ */
window.confirmRevokeTrainee = async function(id, name){
  const reason = prompt(`Offboard ${name}?\n\nTheir access to this program is revoked now (the Main Portal can't sign them in here again, and an open session signs out within a minute), and they're removed from the Batch Folders, Rankings, Trainee Audit, Trainer Inputs and the Scorecards. Their records are kept: Batch Folders → 🚫 Offboarded VAs → ↩ Restore access brings them back as they were.\n\nReason (optional, kept with the record):`, "");
  if(reason === null) return;
  try{ await api("/api/batch/offboard", {id, reason}); toast(`🚫 ${name} offboarded: access revoked and removed from the batch folders.`); }
  catch(err){ toast("Couldn’t offboard: " + err.message); return; }
  await loadAdminLedger();
};
window.restoreOffboarded = async function(id, name){
  if(!confirm(`Restore ${name}'s access? They can open the program from the Main Portal again and show up in their batch folder.`)) return;
  try{ await api("/api/batch/offboard", {id, restore:true}); toast(`↩ ${name}'s access is restored.`); }
  catch(err){ toast("Couldn’t restore: " + err.message); return; }
  await loadAdminLedger();
};
const __row = window.renderAdminRow;
if(typeof __row === "function") window.renderAdminRow = function(){
  return __row.apply(this, arguments).replace(/(onclick="confirmRevokeTrainee\([^"]*\)")>Revoke<\/button>/, `$1 title="Revoke this VA's access and remove them from the batch folders (their records are kept)">🚫 Offboard</button>`);
};

/* ============================================================
   📦 Archive a batch: saved to Google Drive first, then cleared from the platform
   ============================================================ */
const BB = {list:null, loading:false};
async function loadBackups(){
  if(BB.loading) return; BB.loading = true;
  try{ const keys = await sharedList("batchbackup:"); BB.list = (await sharedGetMany(keys)).filter(Boolean).sort((a, b) => String(b.at).localeCompare(String(a.at))); }
  catch(err){ BB.list = BB.list || []; }
  BB.loading = false;
  if(state.view === "admin" && state.adminTab === "batches" && !state.batchFolder && !isTyping()) render();
}
const csv = rows => rows.map(r => r.map(v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
const pct = v => v == null ? "" : v;
// every VA's grades, from the same grading systems (and the same records) the Scorecards collect
async function gather(members){
  const P = window.LSH_PROGRAM || {}, srcs = (P.sources || []).filter(s => s.key), shared = P.shared || [];
  const want = []; members.forEach(r => srcs.forEach(s => want.push(s.key + r.id)));
  const vals = [];
  for(let i = 0; i < want.length; i += 90) vals.push(...await sharedGetMany(want.slice(i, i + 90)));
  const sh = {}, shv = shared.length ? await sharedGetMany(shared) : [];
  shared.forEach((k, i) => { sh[k] = shv[i] || null; });
  return members.map((r, i) => {
    const rec = {}; srcs.forEach((s, j) => { rec[s.key] = vals[i * srcs.length + j] || null; });
    let sc = null; try{ sc = window.lshProgram ? lshProgram.compute({id:r.id, progress:r.dayProgress || {}, rec, shared:sh}) : null; }catch(err){ sc = null; }
    return {r, rec, sc};
  });
}
const snapshot = (g, acts) => {
  const mine = ((g.rec["labreview:"] || {}).acts) || {};
  return {at:new Date().toISOString(), overall:g.sc ? g.sc.overall : null, lessons:g.sc ? {done:g.sc.done, total:g.sc.total} : null,
    systems:g.sc ? g.sc.rows.map(x => ({id:x.s.id, label:x.s.label, avg:x.avg, graded:x.graded})) : [],
    trainerActs:Object.fromEntries(acts.filter(a => mine[a.id]).map(a => { const c = mine[a.id];
      return [a.id, {title:a.title, status:c.status || "", score:tScore(c), avg:c.rubric ? c.rubric.avg : null, date:c.date || "", comment:String(c.comment || "").slice(0, 1500)}]; }))};
};
function buildFiles(batch, rows){
  const acts = trainerActs(), srcs = rows.length && rows[0].sc ? rows[0].sc.rows.map(x => x.s) : ((window.LSH_PROGRAM || {}).sources || []);
  const lab = g => ((g.rec["labreview:"] || {}).acts) || {};
  const name = g => g.r.name || g.r.id, B = labelOf(batch);
  const summary = [["Trainee", "Batch", "Status", "Lessons finished", ...srcs.map(s => s.label + " (%)"), "Overall (%)", ...acts.map(a => a.title + " (%)")]]
    .concat(rows.map(g => [name(g), B, g.r.archived ? "Archived" : "Active", g.sc ? `${g.sc.done}/${g.sc.total}` : "",
      ...(g.sc ? g.sc.rows.map(x => pct(x.avg)) : srcs.map(() => "")), g.sc ? pct(g.sc.overall) : "",
      ...acts.map(a => { const c = lab(g)[a.id]; return c ? (tScore(c) != null ? tScore(c) : c.status || "") : ""; })]));
  const cards = [["Trainee", "Batch", "Activity", "Kind", "Result", "Score (%)", "Weighted average (/5)", "Date", "Criterion", "Criterion score (/5)", "Criterion feedback", "Trainer's comment"]];
  rows.forEach(g => acts.forEach(a => {
    const c = lab(g)[a.id]; if(!c) return;
    const rb = RUB().forAct(a), base = [name(g), B, a.title, a.kind || "", c.status || "", pct(tScore(c)), c.rubric && c.rubric.avg != null ? c.rubric.avg : "", c.date || ""];
    if(rb && c.rubric && c.rubric.key === rb.key) rb.criteria.forEach((k, i) => cards.push([...base, k.n, c.rubric.scores[i] == null ? "" : c.rubric.scores[i], (c.rubric.feedback || [])[i] || "", i === 0 ? c.comment || "" : ""]));
    else cards.push([...base, "", "", "", c.comment || ""]);
  }));
  const lessons = typeof DAYS !== "undefined" ? DAYS : [], nm = d => typeof ftName === "function" ? ftName(d.id) : "Lesson " + d.id;
  const matrix = [["Trainee", "Batch", "Registered", "Last active", ...lessons.map(nm), ...acts.map(a => a.title), "Practice Sessions submitted", "Overall (%)"]]
    .concat(rows.map(g => { const dp = g.r.dayProgress || {}, runs = Object.values(((g.rec["sessions:"] || {}).runs) || {}).filter(x => x && x.submittedAt).length;
      return [name(g), B, String(g.r.registeredAt || "").slice(0, 10), String(g.r.lastActive || "").slice(0, 10),
        ...lessons.map(d => { const p = dp[d.id] || {}; return (p.done ? "✓" : "") + (typeof p.score === "number" ? (p.done ? " " : "") + p.score + "%" : ""); }),
        ...acts.map(a => { const c = lab(g)[a.id]; return c && c.status ? c.status + (tScore(c) != null ? " " + tScore(c) + "%" : "") : ""; }),
        runs, g.sc ? pct(g.sc.overall) : ""]; }));
  const json = {exportedAt:new Date().toISOString(), program:"LSH Standard Foundational Training", batch:B,
    trainees:rows.map(g => ({record:g.r, scorecard:snapshot(g, acts)}))};
  return [{name:`${B} - Scorecard Summary.csv`, text:csv(summary)}, {name:`${B} - Mock Call & Demo Scorecards.csv`, text:csv(cards)},
    {name:`${B} - Progress Matrix.csv`, text:csv(matrix)}, {name:`${B} - Batch Summary.json`, text:JSON.stringify(json, null, 1)}];
}

const FOLDER_PREF = "ft-archive-drive-folder";
const pref = () => { try{ return localStorage.getItem(FOLDER_PREF) || ""; }catch(err){ return ""; } };
const __archive = window.confirmArchiveBatch;   // the engine's own: archive without a backup (records stay)
function membersOf(batch){ return everyone().filter(r => keyOf(r) === batch && !gone(r)); }
function archiveDialog(batch){
  const members = membersOf(batch);
  if(!members.length){ toast("Nothing to archive in this batch."); return; }
  document.querySelectorAll(".fba-ov").forEach(x => x.remove());
  const ov = document.createElement("div");
  ov.className = "overlay fba-ov";
  ov.innerHTML = `<div class="card fba-card" role="dialog" aria-modal="true" aria-labelledby="fbaTitle">
    <h3 id="fbaTitle">📦 Archive ${e(folderLabel(batch))} <span>${members.length} VA${members.length === 1 ? "" : "s"}</span></h3>
    <p>Before the batch is archived, a backup is saved to Google Drive, in a folder <b>Batch ${e(labelOf(batch))} — Archive ${today()}</b> inside the folder you give:</p>
    <ul><li>📊 <b>Scorecard Summary</b> — each VA’s grades by grading system, the overall, and every Mock Call and Demo score</li>
      <li>📋 <b>Mock Call &amp; Demo Scorecards</b> — each scorecard criterion by criterion, with the feedback and comments</li>
      <li>📈 <b>Progress Matrix</b> — each VA × lesson, activity and result</li>
      <li>🗂 <b>Full records</b> — every VA’s complete records (JSON), and the batch summary</li></ul>
    <label class="fba-l">Google Drive folder link<input type="url" id="fbaFolder" placeholder="https://drive.google.com/drive/folders/…" value="${e(pref())}"></label>
    <p class="fba-hint">The folder has to be shared with the program’s Google service account as <b>Editor</b> (Content manager on a Shared Drive).</p>
    <label class="fba-c"><input type="checkbox" id="fbaPurge" checked> Then clear the batch’s records from this platform. The VAs’ scorecard stays recorded for the Main Portal, and their access closes.</label>
    <div class="fba-log" id="fbaLog" aria-live="polite"></div>
    <div class="fba-btns"><button class="btn btn-ghost btn-sm" data-cancel>Cancel</button><button class="btn btn-navy btn-sm" data-go>☁ Save to Drive &amp; archive</button></div></div>`;
  document.body.appendChild(ov);
  const log = (m, cls) => { const l = ov.querySelector("#fbaLog"); l.insertAdjacentHTML("beforeend", `<div class="${cls || ""}">${m}</div>`); l.scrollTop = l.scrollHeight; };
  ov.querySelector("[data-cancel]").onclick = () => { if(!ov.dataset.busy) ov.remove(); };
  ov.addEventListener("click", ev => { if(ev.target === ov && !ov.dataset.busy) ov.remove(); });
  ov.querySelector("#fbaFolder").focus();
  ov.querySelector("[data-go]").onclick = async () => {
    const folder = String(ov.querySelector("#fbaFolder").value || "").trim(), purge = ov.querySelector("#fbaPurge").checked;
    if(!/drive\.google\.com\/.*(folders\/|[?&]id=)[A-Za-z0-9_-]{10,}/.test(folder)){ toast("Paste the Google Drive folder’s link (…/drive/folders/…)."); return; }
    try{ localStorage.setItem(FOLDER_PREF, folder); }catch(err){}
    ov.dataset.busy = "1"; ov.querySelectorAll("button, input").forEach(x => { x.disabled = true; });
    try{ await runArchive(batch, members, folder, purge, log); ov.remove(); }
    catch(err){
      log(`✗ ${e(err.message)}`, "bad");
      log(err.code === "no-sa" ? "Nothing was archived or cleared. You can archive without the Drive backup (the records stay on the platform)." : "Nothing was archived or cleared. Fix the folder and try again.", "bad");
      delete ov.dataset.busy;
      ov.querySelectorAll("button, input").forEach(x => { x.disabled = false; });
      if(err.code === "no-sa" && __archive && !ov.querySelector("[data-plain]")){
        ov.querySelector(".fba-btns").insertAdjacentHTML("afterbegin", `<button class="btn btn-ghost btn-sm" data-plain>📦 Archive without the backup</button>`);
        ov.querySelector("[data-plain]").onclick = () => { ov.remove(); __archive(batch); };
      }
    }
  };
}
async function runArchive(batch, members, folder, purge, log){
  log("Collecting the scorecards…");
  const rows = await gather(members), acts = trainerActs();
  const files = buildFiles(batch, rows);
  log("Making the folder in Google Drive…");
  const f = await api("/api/batch/drive-folder", {folder, batch:labelOf(batch)});
  log(`✓ <a href="${e(f.folder.link)}" target="_blank" rel="noopener">Batch ${e(labelOf(batch))} — Archive ${today()}</a>`, "ok");
  const saved = (await api("/api/batch/backup-files", {parent:f.folder.id, files})).files || [];
  log(`✓ ${saved.map(x => e(x.name)).join(" · ")}`, "ok");
  const per = {};
  for(const g of rows){
    const r = await api("/api/batch/backup-trainee", {id:g.r.id, parent:f.records.id});
    per[g.r.id] = r.file; log(`✓ Full records: ${e(g.r.name || g.r.id)} (${r.keys} records)`, "ok");
  }
  // all saved: now archive, and clear
  const at = new Date().toISOString();
  for(const g of rows){
    if(purge){ await api("/api/batch/purge", {id:g.r.id, scorecard:snapshot(g, acts), backup:{folder:f.folder.link, file:(per[g.r.id] || {}).link || ""}}); log(`✓ Archived and cleared: ${e(g.r.name || g.r.id)}`, "ok"); }
    else if(!g.r.archived){ const rec = Object.assign({}, g.r, {archived:true, archivedAt:at}); delete rec.flaggedInvalidInput; await sharedSet("trainee:" + g.r.id, rec); log(`✓ Archived: ${e(g.r.name || g.r.id)}`, "ok"); }
  }
  await sharedSet("batchbackup:" + batch, {batch, label:labelOf(batch), at, folder:f.folder.link, files:saved, count:rows.length, cleared:!!purge,
    trainees:rows.map(g => ({id:g.r.id, name:g.r.name || g.r.id, overall:g.sc ? g.sc.overall : null, file:(per[g.r.id] || {}).link || ""}))});
  toast(`📦 ${folderLabel(batch)} saved to Google Drive and archived${purge ? " — its records are cleared from the platform" : ""}.`);
  if(state.batchFolder === batch) state.batchFolder = null;
  BB.list = null;
  await loadAdminLedger();
}
window.confirmArchiveBatch = archiveDialog;

/* ---------- Batch Folders: ☁ Save to Drive & clear on an archived batch, the 🚫 Offboarded VAs, and ☁ Saved to Drive ---------- */
const driveBtn = k => `<button type="button" onclick="event.stopPropagation();FTBatchAdmin.archive(this.dataset.b)" data-b="${e(k)}" title="Save this batch to Google Drive, then clear it from the platform">☁ Save to Drive &amp; clear</button>`;
const __card = window.bfCard;
if(typeof __card === "function") window.bfCard = function(k){
  const html = __card.apply(this, arguments);
  return typeof bfIsArchived === "function" && bfIsArchived(k) ? html.replace(/(↩ Restore<\/button>)/, "$1" + driveBtn(k)) : html;
};
const __folder = window.renderBatchFolder;
if(typeof __folder === "function") window.renderBatchFolder = function(k){
  const html = __folder.apply(this, arguments);
  return typeof bfIsArchived === "function" && bfIsArchived(k)
    ? html.replace(/(↩ Restore batch<\/button>)/, `$1<button class="btn btn-navy btn-sm" onclick="FTBatchAdmin.archive(this.dataset.b)" data-b="${e(k)}">☁ Save to Drive &amp; clear</button>`) : html;
};
const __folders = window.renderAdminBatchFolders;
if(typeof __folders === "function") window.renderAdminBatchFolders = function(){
  const html = __folders.apply(this, arguments);
  if(state.batchFolder || state.adminLoading || !state.adminData) return html;
  if(!BB.list && !BB.loading) setTimeout(loadBackups, 0);
  const off = everyone().filter(r => r.offboarded).sort((a, b) => String(b.offboarded.at || "").localeCompare(String(a.offboarded.at || "")));
  const backups = BB.list || [];
  return html + `
    <div class="bf-shelf fba-shelf"><h2>🚫 Offboarded VAs <span class="bf-count">(${off.length})</span></h2>
      <p>VAs whose access was revoked. They’re out of the batch folders, Rankings and the trainer’s tabs; their records are kept.</p>
      ${off.length ? `<div class="fba-list">${off.map(r => `<div class="fba-item"><div><b>${e(r.name || r.id)}</b> <span class="bf-count">${e(labelOf(keyOf(r)))} · offboarded ${e(String(r.offboarded.at || "").slice(0, 10))}${r.offboarded.reason ? " · " + e(r.offboarded.reason) : ""}</span></div>
        <button class="btn btn-ghost btn-sm" onclick="restoreOffboarded(this.dataset.id, this.dataset.n)" data-id="${e(r.id)}" data-n="${e(r.name || r.id)}">↩ Restore access</button></div>`).join("")}</div>`
        : `<div class="empty-note" style="margin:0;">No VA has been offboarded. Use 🚫 Offboard on a VA in the Trainee Audit or their batch folder.</div>`}</div>
    <div class="bf-shelf fba-shelf"><h2>☁ Saved to Google Drive <span class="bf-count">(${backups.length})</span></h2>
      <p>Batches archived with their backup in Google Drive. A cleared batch’s records are only there now (and its scorecard on the Main Portal).</p>
      ${!BB.list ? `<div class="empty-note" style="margin:0;">Loading…</div>` : backups.length ? `<div class="fba-list">${backups.map(x => `<div class="fba-item"><div><b>${e(x.label || x.batch)}</b> <span class="bf-count">${x.count} VA${x.count === 1 ? "" : "s"} · saved ${e(String(x.at || "").slice(0, 10))}${x.cleared ? " · cleared from the platform" : ""}</span></div>
        <a class="btn btn-ghost btn-sm" href="${e(x.folder)}" target="_blank" rel="noopener">📁 Open the Drive folder</a></div>`).join("")}</div>`
        : `<div class="empty-note" style="margin:0;">Nothing saved yet. 📦 Archive a batch to save it to Drive.</div>`}</div>`;
};

window.FTBatchAdmin = {archive:archiveDialog, gather, buildFiles, startOf, activeBatches};

(function(){ const s = document.createElement("style"); s.id = "ft-batch-admin"; s.textContent = `
.fms .ff-bar{gap:12px;} .fms-ctl{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.fms-ctl label{display:flex;gap:6px;align-items:center;font-size:13px;font-weight:700;color:var(--navy);}
.fms-ctl select{font:inherit;font-size:13px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;max-width:340px;}
.fms-scroll{overflow:auto;max-height:calc(100vh - 290px);border:1px solid #C9D9B8;border-radius:10px;margin-top:10px;}
.fms-tbl{border-collapse:separate;border-spacing:0;font-size:13px;min-width:100%;}
.fms-tbl th, .fms-tbl td{border-bottom:1px solid #DCE6D0;border-right:1px solid #DCE6D0;padding:4px 6px;vertical-align:top;background:#fff;}
.fms-tbl thead th{position:sticky;top:0;z-index:2;background:#5B9A32;color:#fff;text-align:left;min-width:150px;}
.fms-tbl thead th b{display:block;font-size:13px;} .fms-tbl thead th > span{display:block;font-weight:600;font-size:11.5px;opacity:.9;}
.fms-tbl tbody th{position:sticky;left:0;z-index:1;text-align:left;font-weight:600;color:#3F5F1E;background:#EEF5E4;min-width:230px;max-width:300px;}
.fms-tbl tbody th span{display:block;font-weight:500;font-size:11.5px;color:var(--ink-soft);} .fms-tbl tbody th em{color:#7a5d00;font-style:normal;}
.fms-tbl thead th:first-child{left:0;z-index:3;}
.fms-tbl input, .fms-tbl select, .fms-tbl textarea{font:inherit;font-size:13px;border:1px solid var(--line);border-radius:6px;padding:3px 6px;background:#fff;box-sizing:border-box;width:100%;}
.fms-tbl input[type=number]{width:70px;text-align:center;} .fms-tbl .fms-fb{margin-top:3px;font-size:12px;}
.fms-tbl textarea{min-width:180px;resize:vertical;}
.fms-avg th, .fms-avg td{background:#E3EED6 !important;font-weight:800;color:#2F4A14;}
.fms-sum th{background:#F3F4F8 !important;color:var(--navy) !important;}
.fms-tag{display:inline-block;margin-top:3px;font-size:11px;font-weight:800;border-radius:999px;padding:1px 8px;background:rgba(255,255,255,.85);color:#4A5070;}
.fms-tag.ok{color:#1E7F4F;} .fms-tag.mid{color:#7a5d00;} .fms-tag.dirty{background:#FEF7C3;color:#7a5d00;}
.fms-save{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px;}
.fba-ov{z-index:9000;} .fba-ov .fba-card{max-width:620px;width:100%;max-height:92vh;overflow:auto;padding:22px 24px;}
.fba-card h3 span{font-size:13px;font-weight:600;color:var(--ink-soft);margin-left:6px;}
.fba-card p, .fba-card li{font-size:13.5px;color:var(--ink);} .fba-card ul{margin:6px 0 12px;padding-left:18px;} .fba-card li{margin:3px 0;}
.fba-l{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700;color:var(--navy);}
.fba-l input{font:inherit;font-weight:500;font-size:14px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;}
.fba-hint{font-size:12.5px !important;color:var(--ink-soft) !important;margin:6px 0 10px;}
.fba-c{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--ink);background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:9px 11px;}
.fba-c input{flex:0 0 auto;width:auto;margin:3px 0 0;}
.fba-log{max-height:180px;overflow:auto;font-size:12.5px;margin:10px 0 0;} .fba-log:empty{display:none;}
.fba-log div{padding:2px 0;} .fba-log .ok{color:#1E7F4F;} .fba-log .bad{color:var(--danger,#B42318);font-weight:700;}
.fba-btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px;}
.fba-list{display:grid;gap:6px;} .fba-item{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:13px;}
`; document.head.appendChild(s); })();
})();
