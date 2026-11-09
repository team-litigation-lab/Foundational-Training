/* ============================================================
   🗂 THE BATCH'S VAs: their mock call scorecards, offboarding, and archiving a batch to Google Drive
   ------------------------------------------------------------
   🧑‍🏫 Graders: Mock Calls & Demos (Admin → 🏅 Scorecard → 🧑‍🏫 Graders): every mock call and demo graded on one sheet,
      for the VAs registered in a batch (the current batch first: the active batch that started last). The activity's
      scorecard (js/ft-rubrics.js) in the Training Guide's format: criterion | Score | Remarks, the weighted average, then
      the score in %, the result, the date and the comment; one VA at a time. 💾 Save writes each VA changed into
      labreview:<id>.acts[<activity>], exactly as 🧑‍🏫 Trainer Inputs does (js/ft-sessions.js), so it reaches their
      Practice Lab page, 🏅 My Performance, the Scorecards and the Main Portal.
   🚫 Offboard (the Trainee Audit's and a batch folder's Revoke): the VA's access closes (POST /api/batch/offboard: a Portal
      ticket no longer signs them in, and an open session signs them out) and they leave Batch Folders, Rankings, the
      Trainee Audit and the trainer's tabs. Their records are kept: 🛡 Admin Master Control → 📁 Batches → 🚫 Offboarded VAs → ↩ Restore access.
   📦 Archive a batch (every 📦 Archive button): the trainer gives a Google Drive folder link, and the batch is saved into
      it, in "Batch <id> — Archive <date>": the Scorecard Summary, the Mock Call & Demo Scorecards and the Progress Matrix
      (CSV, made here from the same grading the Scorecards use), the batch summary (JSON) and every VA's full records
      (Full records/<name>.json, made by the Worker). Only once all of it is saved, the batch is archived and, unless the
      trainer unticks it, cleared from the platform (POST /api/batch/purge per VA): the working records go, and the trainee
      record stays, slimmed, with a snapshot of the scorecard, for the Main Portal's 📊 Progress & Feedback, which reads
      this program's records. The batch then shows on the Archive shelf as ☁ Saved to Drive, with the folder's link
      (batchbackup:<batch>, admins only). A batch archived earlier gets ☁ Save to Drive & clear on its card.
   Loaded after js/ft-sessions.js and js/ft-admin-ops.js and before js/ft-program.js, which puts the 🧑‍🏫 Graders tab in
   🏅 Scorecard and the 📁 Batches tab (batchesTab, below) in 🛡 Admin Master Control.
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
// 📅 the batch's weeks (the banner's: 7 days from the day it started, Weeks 1–6) and the week an activity falls in: the
// week of its first training day (training day n is the nth weekday from the batch's first day, as on the Batch Sheet)
const WEEKS = 6, DAY = 864e5;
const t0Of = b => { const s = b && typeof batchStartDate === "function" ? batchStartDate(b) : ""; const t = s ? Date.parse(s + "T00:00:00Z") : NaN; return isFinite(t) ? t : null; };
function nowWeek(b){ const t0 = t0Of(b); if(t0 == null) return 1;
  const td = window.FTTrackerRules ? FTTrackerRules.ptDate() : new Date().toISOString().slice(0, 10);
  return Math.max(1, Math.min(WEEKS, Math.floor((Date.parse(td + "T00:00:00Z") - t0) / (7 * DAY)) + 1)); }
function dayWeek(b, n){ const t0 = t0Of(b); if(t0 == null || !n) return null; let t = t0, k = 0;
  for(let i = 0; i < 60; i++, t += DAY){ const wd = new Date(t).getUTCDay(); if(wd >= 1 && wd <= 5 && ++k >= n) return Math.floor((t - t0) / (7 * DAY)) + 1; } return null; }
const actWeek = (b, a) => { const ds = window.FTDays && typeof FTDays.forAct === "function" ? FTDays.forAct(a.id) : []; return ds.length ? dayWeek(b, Math.min(...ds)) : null; };
const wkRange = (b, n) => { const t0 = t0Of(b); if(t0 == null) return ""; const f = ms => new Date(ms).toLocaleDateString(undefined, {month: "short", day: "numeric", timeZone: "UTC"}), a = t0 + (n - 1) * 7 * DAY; return f(a) + " – " + f(a + 6 * DAY); };
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
// (a batch's first day as a time, for ordering: index.html batchStartDate — a B + DDMMYY Batch ID reads as its day; 0 when not a date)
const startOf = b => { const d = typeof batchStartDate === "function" ? batchStartDate(b) : ""; return d ? Date.parse(d + "T00:00:00Z") : 0; };
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
const MS = {batch:"", wk:"", act:"", va:"", rv:{}, loadedFor:"", loading:false, draft:{}, saving:false};
const cellOf = (id, act) => ((((MS.rv[id] || {}).acts) || {})[act]) || {};
const dkey = id => MS.act + "|" + id;
function draftOf(id){
  const k = dkey(id);
  if(!MS.draft[k]){
    const c = cellOf(id, MS.act), rb = RUB().forAct(curAct()), got = c.rubric && rb && c.rubric.key === rb.key ? c.rubric : {};
    MS.draft[k] = {status:c.status || "Not yet", score:tScore(c) == null ? "" : String(tScore(c)), date:c.date || "", comment:c.comment || "", facilitator:c.facilitator || lastFac(),
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
  if(state.view === "admin" && state.adminTab === "graders" && !isTyping()) render();
}
/* 🧾 Score summary (the Calendar Management Mock Call's scorecard): the score's rationale in words, from what the trainer
   entered — the weighted average from each criterion's score and weight, the % it makes, the strongest criteria and those
   to improve with their feedback notes, any criterion not scored yet, the result and the comment. Worked out, not written by
   an AI, so it always says exactly what the sheet holds; it follows each score as it is typed. */
function whyHtml(id){
  const a = curAct(), rb = a ? RUB().forAct(a) : null; if(!rb || rb.key !== "calendar") return "";
  const d = valOf(id) || draftOf(id), sc = rb.criteria.map((k, i) => ({n: k.n, w: k.w || 1, v: d.scores[i] == null || d.scores[i] === "" ? null : Number(d.scores[i]), fb: String(d.feedback[i] || "").trim()}));
  const got = sc.filter(x => x.v != null && isFinite(x.v)), avg = RUB().average(rb, d.scores);
  if(!got.length) return `<h4>🧾 Score summary</h4><p class="fss-muted">Score the criteria above: the summary of why the trainee gets their score is written here as you go.</p>`;
  const wsum = got.reduce((n, x) => n + x.w, 0), pts = got.reduce((n, x) => n + x.v * x.w, 0), pctv = d.score !== "" ? Number(d.score) : Math.round(avg / 5 * 100);
  const top = got.filter(x => x.v >= 4).sort((p, q) => q.v - p.v || q.w - p.w).slice(0, 4), low = got.filter(x => x.v < 3).sort((p, q) => p.v - q.v || q.w - p.w).slice(0, 4), left = sc.filter(x => x.v == null);
  const line = x => `<li><b>${e(x.n)}</b>: ${x.v}/5${x.w !== 1 ? ` (weighs ×${x.w})` : ""}${x.fb ? ` — ${e(x.fb)}` : ""}</li>`;
  return `<h4>🧾 Score summary</h4>
    <p><b>${isFinite(pctv) ? pctv + "%" : "—"}</b>${d.scoreTyped ? " (typed by the trainer)" : ""} from a weighted average of <b>${avgTxt(avg)}</b>: ${got.length} of ${sc.length} criteria scored, ${Math.round(pts * 100) / 100} points out of ${wsum * 5} possible (each criterion 0–5 × its weight), ÷ 5 × 100.</p>
    ${top.length ? `<p class="fms-why-ok">⭐ Strongest</p><ul>${top.map(line).join("")}</ul>` : ""}
    ${low.length ? `<p class="fms-why-imp">🔧 To improve</p><ul>${low.map(line).join("")}</ul>` : `<p class="fms-why-ok">No criterion below 3/5.</p>`}
    ${left.length ? `<p class="fss-muted">Not scored yet (the average counts only what is scored): ${left.map(x => e(x.n)).join(", ")}.</p>` : ""}
    <p>Result: <b>${e(d.status || "Not yet")}</b>${d.comment ? ` · Comment: ${e(String(d.comment).slice(0, 400))}` : ""}</p>`;
}
// mock call or demo: by the scorecard's title, else the activity's (for the Activity list's two groups)
const isMock = a => { const rb = RUB().forAct(a); return /mock call/i.test(rb ? rb.title : "") || (!rb && /mock/i.test(String(a.kind || "") + " " + String(a.title || ""))); };
// (a Remarks or Comment box grows with what is typed, so the text wraps and stays in view)
const grow = t => { if(t && t.tagName === "TEXTAREA"){ t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; } };
const growAll = () => document.querySelectorAll(".fms textarea").forEach(grow);
// 🧑‍🏫 who facilitated the mock call or demo: typed by the trainer, offered again next time (this device), saved with the scores
const FAC_KEY = "ft-facilitator";
const lastFac = () => { try{ return localStorage.getItem(FAC_KEY) || ""; }catch(err){ return ""; } };
const keepFac = v => { try{ if(v) localStorage.setItem(FAC_KEY, v); }catch(err){} };
const facNames = () => [...new Set([lastFac(), ...Object.values(MS.rv).flatMap(rv => Object.values((rv && rv.acts) || {}).map(c => c && c.facilitator))].map(x => String(x || "").trim()).filter(Boolean))].sort();
window.addEventListener("resize", () => requestAnimationFrame(growAll));
/* 🧑‍🏫 Graders: Mock Calls & Demos — every mock call and demo scored on this one sheet, the Training Guide's format: the
   batch, the activity and the trainee picked at the top, then criterion | Score | Remarks (green header, banded rows) and the
   WEIGHTED AVERAGE; the score in %, the result, the date and the comment under it; 💾 Save. One trainee at a time
   (‹ › through the batch); what is typed for another trainee is kept until saved. */
function renderMockScores(){
  if(state.adminLoading || !state.adminData){
    if(!state.adminLoading && typeof loadAdminLedger === "function") setTimeout(() => loadAdminLedger(), 0);
    return `<div class="card" style="padding:24px;">Loading the batches…</div>`;
  }
  const batches = activeBatches(), allActs = scoredActs();
  if(!MS.batch || !batches.includes(MS.batch)) MS.batch = batches[0] || "";
  // 📅 the week picked (this week until another is): its mock calls and demos in the Activity list, or every one when the
  // week has none on the schedule (or "All weeks")
  const wk = MS.wk === "all" ? "all" : Number(MS.wk) >= 1 ? Number(MS.wk) : nowWeek(MS.batch);
  const inWk = wk === "all" ? allActs : allActs.filter(x => actWeek(MS.batch, x) === wk), acts = inWk.length ? inWk : allActs;
  if(!MS.act || !acts.some(a => a.id === MS.act)) MS.act = (acts[0] || {}).id || "";
  const a = curAct(), rb = a ? RUB().forAct(a) : null, all = registered(MS.batch);
  if(!MS.va || !all.some(r => r.id === MS.va)) MS.va = (all[0] || {}).id || "";
  const r = all.find(x => x.id === MS.va) || null, at = all.findIndex(x => x.id === MS.va);
  const sig = MS.batch + "|" + all.map(x => x.id).join(",");
  if(MS.loadedFor !== sig) setTimeout(() => msLoad(), 0);
  const nDirty = dirtyIds().length, ready = !!(r && a && MS.loadedFor === sig);
  const opt = x => `<option value="${e(x.id)}" ${x.id === MS.act ? "selected" : ""}>${e(x.title)}</option>`;
  const mocks = acts.filter(isMock), demos = acts.filter(x => !isMock(x));
  const d = ready ? (valOf(r.id) || draftOf(r.id)) : null;
  const saveBtn = `<button class="btn btn-navy btn-sm fms-savebtn" data-ms-save ${nDirty && !MS.saving ? "" : "disabled"} onclick="FTMockScores.save(this)" title="Only the trainees you changed are saved">💾 Save ${nDirty ? nDirty + " trainee" + (nDirty === 1 ? "’s" : "s’") + " scores" : "to the trainee’s scores"}</button>`;
  const hasDates = t0Of(MS.batch) != null;
  const ctl = `<div class="fms-pick">
      <label>Week <select aria-label="Week" class="fms-wk" onchange="FTMockScores.week(this.value)">${Array.from({length: WEEKS}, (x, i) => i + 1).map(n => `<option value="${n}" ${wk === n ? "selected" : ""}>Week ${n}${hasDates ? " · " + e(wkRange(MS.batch, n)) : ""}${n === nowWeek(MS.batch) && hasDates ? " (this week)" : ""}</option>`).join("")}<option value="all" ${wk === "all" ? "selected" : ""}>All weeks</option></select></label>
      <select aria-label="Batch" onchange="FTMockScores.batch(this.value)">${batches.length ? batches.map((b, i) => `<option value="${e(b)}" ${b === MS.batch ? "selected" : ""}>${e(labelOf(b))}${i === 0 ? " (current)" : ""}</option>`).join("") : `<option value="">No active batch</option>`}</select>
      <select aria-label="Activity" class="fms-act" title="${wk !== "all" && !inWk.length ? `No mock call or demo is scheduled in Week ${wk}: every one is listed` : ""}" onchange="FTMockScores.act(this.value)">${mocks.length ? `<optgroup label="📞 Mock calls">${mocks.map(opt).join("")}</optgroup>` : ""}${demos.length ? `<optgroup label="🖥 Demos">${demos.map(opt).join("")}</optgroup>` : ""}</select>
      ${all.length ? `<div class="fms-step"><button class="btn btn-ghost btn-sm" ${at > 0 ? "" : "disabled"} onclick="FTMockScores.step(-1)" title="The previous trainee" aria-label="Previous trainee">‹</button>
        <select aria-label="Trainee" class="fms-va" onchange="FTMockScores.va(this.value)">${all.map(x => { const dd = MS.draft[MS.act + "|" + x.id], c = a ? cellOf(x.id, a.id) : {};
          const tag = dd && dd.dirty ? " · ● not saved" : c.status ? ` · ${c.status}${tScore(c) != null ? " " + tScore(c) + "%" : ""}` : "";
          return `<option value="${e(x.id)}" ${x.id === MS.va ? "selected" : ""}>${e(x.name || x.id)}${tag}</option>`; }).join("")}</select>
        <button class="btn btn-ghost btn-sm" ${at >= 0 && at < all.length - 1 ? "" : "disabled"} onclick="FTMockScores.step(1)" title="The next trainee" aria-label="Next trainee">›</button><em>${at + 1} / ${all.length}</em></div>` : ""}
      <label>Result <select data-ms-status ${d ? "" : "disabled"} onchange="FTMockScores.field('${e(MS.va)}','status',this.value)">${STATUSES.map(s => `<option ${d && s === d.status ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      ${saveBtn}
      <button class="btn btn-ghost btn-sm fms-tool" onclick="FTMockScores.refresh()" title="Read the batch and the saved scores again" aria-label="Refresh">↻</button>
      <button class="btn btn-ghost btn-sm fms-tool" ${MS.dl ? "disabled" : ""} onclick="FTMockScores.download()" title="Download the batch's mock call and demo scorecards (.csv: every criterion, its score and remarks)">${MS.dl ? "Preparing…" : "⬇ Download"}</button></div>`;
  // (the pickers sit in the banner's corner: the week, the batch, the activity, the trainee, the result and 💾 Save)
  const banner = typeof window.ftBanner === "function" ? ftBanner("Graders: Mock Calls &amp; Demos", MS.batch, ctl, {week: wk === "all" ? null : wk, cls: "fms-banner"})
    : `<div class="fms-banner">${ctl}</div>`;
  const head = "";
  const wrap = inner => `${banner}<div class="card fss-admin fms">${head}${inner}</div>`;
  if(!batches.length) return wrap(`<p class="fss-muted">No active batch: a batch shows here once its trainees are registered and approved.</p>`);
  if(!a) return wrap(`<p class="fss-muted">No Mock Call or Demo in 🧑‍🏫 Trainer Inputs’ list of activities.</p>`);
  if(!r) return wrap(`<p class="fss-muted">No trainees registered in ${e(labelOf(MS.batch))} yet.</p>`);
  if(!ready) return wrap(`<p class="fss-muted">Loading ${e(labelOf(MS.batch))}’s scorecards…</p>`);
  setTimeout(growAll, 0);   // (after the draw, the Remarks and Comment boxes take the height of what they hold)
  const c = cellOf(r.id, a.id), id = e(r.id);
  const tag = d.dirty ? `<span class="fms-tag dirty">● not saved</span>` : c.status ? `<span class="fms-tag ${c.status === "Passed" ? "ok" : c.status === "Redo" ? "mid" : ""}">Saved: ${e(c.status)}${tScore(c) != null ? " · " + tScore(c) + "%" : ""}</span>` : `<span class="fms-tag">not scored yet</span>`;
  const crit = rb ? rb.criteria.map((k, i) => `<tr><td>${e(k.n)}${k.w && k.w !== 1 ? ` <em>×${e(k.w)}</em>` : ""}</td>
      <td><input type="number" min="0" max="5" step="0.5" value="${e(d.scores[i] == null ? "" : d.scores[i])}" aria-label="${e(k.n)} score" oninput="FTMockScores.crit('${id}',${i},this.value)"></td>
      <td><textarea rows="1" placeholder="Remarks" aria-label="${e(k.n)} remarks" oninput="FTMockScores.fb('${id}',${i},this.value)">${e(d.feedback[i] || "")}</textarea></td></tr>`).join("") : "";
  return wrap(`<div class="fms-sheet" data-va="${id}">
    <p class="fms-who"><b>${e(r.name || r.id)}</b> · ${e(a.title)} · ${e(labelOf(MS.batch))}${c.facilitator ? ` · facilitated by ${e(c.facilitator)}` : ""} ${tag}</p>
    ${rb && rb.time ? `<p class="ti-rub-time">⏱ ${e(rb.time)}</p>` : ""}
    ${rb && rb.key === "calendar" && typeof window.ftRubricAssist === "function" ? `<div class="fms-assist">${window.ftRubricAssist(r, a)}</div>` : ""}
    ${a.id === "intake-packet-demo" ? `<div class="ftis-mcase" data-trainee="${id}"></div>` : ""}
    <table class="ftms-tbl fms-tbl"><thead><tr><th>${e((rb ? rb.title : a.title).toUpperCase())}</th><th>Score</th><th>Remarks</th></tr></thead><tbody>
      ${crit}
      ${rb ? `<tr class="ftms-avg"><td>WEIGHTED AVERAGE</td><td data-avg>${avgTxt(RUB().average(rb, d.scores))}</td><td></td></tr>` : ""}
    </tbody></table>
    <div class="fms-foot">
      <label>Score (%) <input type="number" min="0" max="100" data-score value="${e(d.score)}" oninput="FTMockScores.score('${id}',this.value)"></label>
      <label>Facilitated by <input class="fms-fac" list="fmsFacList" maxlength="120" value="${e(d.facilitator || "")}" placeholder="Trainer’s name" oninput="FTMockScores.field('${id}','facilitator',this.value)"><datalist id="fmsFacList">${facNames().map(n => `<option value="${e(n)}">`).join("")}</datalist></label>
      <label>Date <input type="date" data-date value="${e(d.date)}" onchange="FTMockScores.field('${id}','date',this.value)"></label>
      <label class="fms-cmt">Comment <span>the trainee sees it</span><textarea rows="2" oninput="FTMockScores.field('${id}','comment',this.value)" placeholder="What went well, what to improve">${e(d.comment)}</textarea></label>
    </div>
    ${rb && rb.key === "calendar" ? `<div class="fms-why" data-why="${id}">${whyHtml(r.id)}</div>` : ""}
    <p class="fss-muted fms-note">Each criterion 0–5 (half points allowed). The weighted average becomes the score in % unless one is typed. Saved scores reach the trainee’s Practice Lab page, 🏅 My Performance, the Scorecards and the Main Portal.</p></div>`);
}
// the average and the score follow what was typed, without drawing the page again (the trainer may be mid-way through a row)
function refreshCol(id){
  const d = valOf(id), rb = RUB().forAct(curAct()); if(!d) return;
  d.dirty = true;
  if(!d.date) d.date = today();
  const box = document.querySelector(`.fms-sheet[data-va="${CSS.escape(id)}"]`);
  if(box){
    const avg = rb ? RUB().average(rb, d.scores) : null;
    const av = box.querySelector("[data-avg]"); if(av) av.textContent = avgTxt(avg);
    const s = box.querySelector("[data-score]"); if(s && !d.scoreTyped){ d.score = avg == null ? "" : String(Math.round(avg / 5 * 100)); s.value = d.score; }
    const dt = box.querySelector("[data-date]"); if(dt && !dt.value) dt.value = d.date;
    const tag = box.querySelector(".fms-tag"); if(tag){ tag.className = "fms-tag dirty"; tag.textContent = "● not saved"; }
    if(document.activeElement && box.contains(document.activeElement)) grow(document.activeElement);
  }
  const w = document.querySelector(`.fms-why[data-why="${CSS.escape(id)}"]`); if(w) w.innerHTML = whyHtml(id);
  const n = dirtyIds().length, btn = document.querySelector("[data-ms-save]");
  if(btn){ btn.disabled = !n || MS.saving; btn.textContent = `💾 Save ${n} trainee${n === 1 ? "’s" : "s’"} scores`; }
}
window.FTMockScores = {
  // ⬇ the batch's Mock Call & Demo Scorecards (the same file as its ⬇ Records: every criterion, score and feedback)
  async download(){
    if(MS.dl || !MS.batch) return; MS.dl = true; render();
    try{ const members = registered(MS.batch).filter(r => !gone(r)), rows = await gather(members), f = buildFiles(MS.batch, rows).find(x => /Scorecards\.csv$/.test(x.name));
      if(!f){ toast("Nothing to download yet."); }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + f.text], {type: "text/csv"})); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    }catch(err){ toast("Couldn’t prepare the download. Try again."); }
    MS.dl = false; render();
  },
  batch(b){ MS.batch = b; MS.va = ""; render(); },
  week(w){ MS.wk = w; render(); },
  // one VA at a time: unsaved scores stay in their draft while another VA is shown, and 💾 Save saves every VA changed
  va(id){ MS.va = id; render(); },
  // ⤓ from the booking rule check (js/ft-calrules.js FTCalRules.fill): {criterion index: score}, never over a typed score
  fillCrit(vals){ const id = MS.va, d = draftOf(id); let n = 0; Object.entries(vals || {}).forEach(([i, v]) => { if(d.scores[i] == null || d.scores[i] === ""){ d.scores[i] = v; n++; } });
    if(n){ d.dirty = true; if(!d.date) d.date = today(); if(!d.scoreTyped){ const avg = RUB().average(RUB().forAct(curAct()), d.scores); d.score = avg == null ? "" : String(Math.round(avg / 5 * 100)); } }
    render(); return n; },
  step(n){ const all = registered(MS.batch), i = all.findIndex(r => r.id === MS.va), j = i + n; if(j >= 0 && j < all.length){ MS.va = all[j].id; render(); } },
  act(a){ MS.act = a; render(); },
  refresh(){ MS.loadedFor = ""; if(typeof loadAdminLedger === "function") loadAdminLedger(); else render(); },
  crit(id, i, val){ const d = draftOf(id), t = String(val).trim(); d.scores[i] = t === "" ? null : Math.max(0, Math.min(5, Number(t))); refreshCol(id); },
  fb(id, i, val){ draftOf(id).feedback[i] = String(val).slice(0, 600); refreshCol(id); },
  score(id, val){ const d = draftOf(id); d.score = String(val).trim(); d.scoreTyped = d.score !== ""; refreshCol(id); },
  field(id, f, val){ draftOf(id)[f] = f === "comment" ? String(val).slice(0, 4000) : f === "facilitator" ? String(val).slice(0, 120) : String(val); refreshCol(id); },
  async save(btn){
    const ids = dirtyIds(), act = MS.act, rb = RUB().forAct(curAct());
    for(const id of ids){ const s = valOf(id).score; if(s !== "" && !(Number(s) >= 0 && Number(s) <= 100)){ toast("A score is a number from 0 to 100."); return; } }
    MS.saving = true; if(btn) btn.disabled = true;
    ids.forEach(id => keepFac(String(valOf(id).facilitator || "").trim()));
    let ok = 0;
    for(const id of ids){
      const d = valOf(id);
      try{
        const cur = (await sharedGet("labreview:" + id)) || {};
        cur.acts = cur.acts || {};
        const avg = rb ? RUB().average(rb, d.scores) : null;
        cur.acts[act] = Object.assign({status:d.status || "Not yet", score:d.score === "" ? null : Math.round(Number(d.score)), date:d.date || today(),
          comment:String(d.comment || "").trim().slice(0, 4000), facilitator:String(d.facilitator || "").trim().slice(0, 120), at:new Date().toISOString()},
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
ftAdminTab("graders", "🧑‍🏫 Graders: Mock Calls & Demos", renderMockScores);

/* ============================================================
   🚫 Offboarding a VA (the Trainee Audit's and a batch folder's Revoke)
   ============================================================ */
window.confirmRevokeTrainee = async function(id, name){
  const reason = prompt(`Offboard ${name}?\n\nTheir access to this program is revoked now (the Main Portal can't sign them in here again, and an open session signs out within a minute), and they're removed from the Batch Folders, Rankings, Trainee Audit, Trainer Inputs and the Scorecards. Their records are kept: 🛡 Admin Master Control → 📁 Batches → 🚫 Offboarded VAs → ↩ Restore access brings them back as they were.\n\nReason (optional, kept with the record):`, "");
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
  if(state.view === "admin" && ["batches", "audit"].includes(state.adminTab) && !state.batchFolder && !isTyping()) render();
}
// (a cell that starts like a formula — =, +, -, @, a tab — is kept as text, so a name or a comment can't run in Excel or Sheets)
const csvCell = v => { const t = String(v == null ? "" : v); return `"${(/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"`; };
const csv = rows => rows.map(r => r.map(csvCell).join(",")).join("\r\n");
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
    systems:g.sc ? g.sc.rows.filter(x => !x.s.hidden).map(x => ({id:x.s.id, label:x.s.label, avg:x.avg, graded:x.graded})) : [],
    trainerActs:Object.fromEntries(acts.filter(a => mine[a.id]).map(a => { const c = mine[a.id];
      return [a.id, {title:a.title, status:c.status || "", score:tScore(c), avg:c.rubric ? c.rubric.avg : null, date:c.date || "", comment:String(c.comment || "").slice(0, 1500)}]; }))};
};
function buildFiles(batch, rows){
  // (a hidden grading system has no column of its own: its items are on another's, js/ft-program.js)
  const acts = trainerActs(), srcs = (rows.length && rows[0].sc ? rows[0].sc.rows.map(x => x.s) : ((window.LSH_PROGRAM || {}).sources || [])).filter(s => !s.hidden);
  const lab = g => ((g.rec["labreview:"] || {}).acts) || {};
  const name = g => g.r.name || g.r.id, B = labelOf(batch);
  const summary = [["Trainee", "Batch", "Status", "Lessons finished", ...srcs.map(s => s.label + " (%)"), "Overall (%)", ...acts.map(a => a.title + " (%)")]]
    .concat(rows.map(g => [name(g), B, g.r.archived ? "Archived" : "Active", g.sc ? `${g.sc.done}/${g.sc.total}` : "",
      ...(g.sc ? g.sc.rows.filter(x => !x.s.hidden).map(x => pct(x.avg)) : srcs.map(() => "")), g.sc ? pct(g.sc.overall) : "",
      ...acts.map(a => { const c = lab(g)[a.id]; return c ? (tScore(c) != null ? tScore(c) : c.status || "") : ""; })]));
  const cards = [["Trainee", "Batch", "Activity", "Kind", "Result", "Score (%)", "Weighted average (/5)", "Date", "Facilitated by", "Criterion", "Criterion score (/5)", "Criterion feedback", "Trainer's comment"]];
  rows.forEach(g => acts.forEach(a => {
    const c = lab(g)[a.id]; if(!c) return;
    const rb = RUB().forAct(a), base = [name(g), B, a.title, a.kind || "", c.status || "", pct(tScore(c)), c.rubric && c.rubric.avg != null ? c.rubric.avg : "", c.date || "", c.facilitator || ""];
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
    <div class="fba-btns"><button class="btn btn-ghost btn-sm fba-del" data-del title="Delete the batch's VAs and every record of theirs, with no backup">🗑 Delete the batch</button><button class="btn btn-ghost btn-sm" data-cancel>Cancel</button><button class="btn btn-navy btn-sm" data-go>☁ Save to Drive &amp; archive</button></div></div>`;
  document.body.appendChild(ov);
  const log = (m, cls) => { const l = ov.querySelector("#fbaLog"); l.insertAdjacentHTML("beforeend", `<div class="${cls || ""}">${m}</div>`); l.scrollTop = l.scrollHeight; };
  ov.querySelector("[data-cancel]").onclick = () => { if(!ov.dataset.busy) ov.remove(); };
  ov.addEventListener("click", ev => { if(ev.target === ov && !ov.dataset.busy) ov.remove(); });
  ov.querySelector("#fbaFolder").focus();
  // 🗑 Delete the batch: no Drive backup; every VA's records go (POST /api/batch/purge), then their trainee record too, and their
  // access closes. Asked twice: the Batch ID typed back, since nothing can be restored after it.
  ov.querySelector("[data-del]").onclick = async () => {
    const id = labelOf(batch), typed = prompt(`Delete Batch ${id} and its ${members.length} VA${members.length === 1 ? "" : "s"} for good? Every record of theirs is removed from this platform, with no backup, and their access closes. This can't be undone.\n\nType the Batch ID (${id}) to delete it:`);
    if(typed == null) return;
    if(String(typed).trim().toUpperCase() !== String(id).trim().toUpperCase()){ toast("The Batch ID didn’t match: nothing was deleted."); return; }
    ov.dataset.busy = "1"; ov.querySelectorAll("button, input").forEach(x => { x.disabled = true; });
    try{
      for(const r of members){
        await api("/api/batch/purge", {id:r.id});
        await sharedDelete("trainee:" + r.id);
        log(`✓ Deleted: ${e(r.name || r.id)}`, "ok");
      }
      await sharedDelete("batchbackup:" + batch).catch(() => {});
      toast(`Batch ${id} deleted.`); ov.remove();
      state.adminData = null; if(typeof loadAdminLedger === "function") loadAdminLedger(); render();
    }catch(err){
      log(`✗ ${e(err.message)}: some VAs may already be deleted. Try again to delete the rest.`, "bad");
      delete ov.dataset.busy; ov.querySelectorAll("button, input").forEach(x => { x.disabled = false; });
    }
  };
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
        : `<div class="empty-note" style="margin:0;">No VA has been offboarded.</div>`}</div>
    <div class="bf-shelf fba-shelf"><h2>☁ Saved to Google Drive <span class="bf-count">(${backups.length})</span></h2>
      <p>Batches archived with their backup in Google Drive. A cleared batch’s records are only there now (and its scorecard on the Main Portal).</p>
      ${!BB.list ? `<div class="empty-note" style="margin:0;">Loading…</div>` : backups.length ? `<div class="fba-list">${backups.map(x => `<div class="fba-item"><div><b>${e(x.label || x.batch)}</b> <span class="bf-count">${x.count} VA${x.count === 1 ? "" : "s"} · saved ${e(String(x.at || "").slice(0, 10))}${x.cleared ? " · cleared from the platform" : ""}</span></div>
        <a class="btn btn-ghost btn-sm" href="${e(x.folder)}" target="_blank" rel="noopener">📁 Open the Drive folder</a></div>`).join("")}</div>`
        : `<div class="empty-note" style="margin:0;">Nothing saved yet. 📦 Archive a batch to save it to Drive.</div>`}</div>`;
};

/* ---------- 🛡 Admin Master Control → 📁 Batches: the batches' own tab, beside 🔓 Open Lessons' locking ----------
   The trainer keeps the batches with the other things they run: each batch's card with 📦 Archive and ⬇ Records, the
   📦 Archive shelf (restore), 🚫 Offboarded VAs (restore access) and ☁ Saved to Google Drive. A card opens that batch on the
   📋 Batch Sheet (js/ft-trainees-tab.js openBatchFolder). (The Batch Sheet keeps its own 📦 Archive batch, beside the batch
   picker, for the batch on screen.) Registered here, before js/lsh-program.js groups the tabs. */
function batchesTab(){
  if(state.adminLoading || !state.adminData){ if(!state.adminLoading && typeof loadAdminLedger === "function") setTimeout(loadAdminLedger, 0); return (window.FTBatchSheet && typeof FTBatchSheet.toolsHtml === "function" ? FTBatchSheet.toolsHtml() : "") + `<div class="card" style="padding:24px;">Loading the batches…</div>`; }
  // (a batch the 📋 Batch Sheet doesn't list — no batch, all archived — opens its own folder page here: its 🗂 Registry, its
  // records and ⬇ Full backup (JSON); ← All batch folders comes back to the cards. js/ft-trainees-tab.js openBatchFolder)
  if(state.batchFolder && typeof window.renderBatchFolder === "function"){
    try{ return `<div class="fba-batches">${window.renderBatchFolder(state.batchFolder)}</div>`; }catch(err){ state.batchFolder = null; }
  }
  const keep = state.batchFolder; state.batchFolder = null;
  let html = "";
  try{ html = window.renderAdminBatchFolders(); }catch(err){ html = ""; } finally{ state.batchFolder = keep; }
  const t = document.createElement("template"); t.innerHTML = html;
  t.content.querySelectorAll(".eyebrow").forEach(x => x.remove());
  const h1 = [...t.content.querySelectorAll("h1")].find(h => /Batch Folders/.test(h.textContent));
  if(h1){
    h1.textContent = "📁 Batches";
    const p = h1.nextElementSibling;
    if(p && p.tagName === "P") p.textContent = "Each batch: open its card to see its trainees on the 📋 Batch Sheet. Archive a batch when it finishes; its records stay on the Archive shelf.";
  }
  // (🛠 the batch's tools — ✏️ Fix the batch name, 🧹 Sweep inactive accounts, ✎ Fix a date — moved here from 📋 Batch Sheet)
  const tools = window.FTBatchSheet && typeof FTBatchSheet.toolsHtml === "function" ? FTBatchSheet.toolsHtml() : "";
  return `${tools}<div class="fba-batches">${t.innerHTML}</div>`;
}
ftAdminTab("batches", "📁 Batches", batchesTab);

window.FTBatchAdmin = {archive:archiveDialog};

(function(){ const s = document.createElement("style"); s.id = "ft-batch-admin"; s.textContent = `
/* 🧑‍🏫 Graders: the Training Guide's scoresheet (criterion | Score | Remarks), every text wrapping */
.fms-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;} .fms-top h3{margin:0;} .fms-tools{margin-left:auto;display:flex;gap:6px;}
.fms-pick{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px;font-size:14px;}
.fms-pick label{display:flex;gap:6px;align-items:center;font-weight:700;color:var(--navy);}
.fms-pick select{font:inherit;font-size:15px;font-weight:700;color:#1E2340;padding:4px 8px;border:1px solid #C9D6BE;border-radius:8px;background:#fff;max-width:100%;white-space:normal;}
.fms-pick .fms-savebtn{margin-left:auto;}
/* (🧑‍🏫 Graders: the pickers in the banner's top-right corner, on its dark blue) */
.ft-banner.fms-banner{align-items:flex-start;}
.fms-banner .ft-banner-right{flex:1 1 620px;justify-content:flex-end;min-width:0;}
.fms-banner .fms-pick{justify-content:flex-end;margin:0;gap:8px;}
.fms-banner .fms-pick label{color:#fff;} .fms-banner .fms-step em{color:#E8ECF7;}
.fms-banner .fms-pick .fms-savebtn{margin-left:0;background:#F6C08F;border-color:#F6C08F;color:#1E2340;font-weight:800;}
.fms-banner .fms-pick .fms-savebtn:disabled{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.3);color:#C9D0E6;}
.fms-banner .fms-pick .btn-ghost{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.4);color:#fff;}
.fms-banner .fms-pick .btn-ghost:disabled{opacity:.45;}
.fms-pick select.fms-wk{background:#EEF2FF;border:2px solid #F6C08F;color:#1E2340;font-weight:800;}
.fms-step{display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;} .fms-step em{font-style:normal;font-size:12.5px;color:var(--ink-soft);}
.fms-pick select.fms-va{min-width:200px;font-weight:700;}
/* (each dropdown its own colour, so Batch, Activity and Trainee are told apart at a glance) */
.fms-pick select[aria-label="Batch"]{background:#E8EDFB;border:2px solid #3B4A8C;color:#1E2340;font-weight:800;}
.fms-pick select.fms-act{background:#E6F4EA;border:2px solid #2E7D4F;color:#14532D;font-weight:800;}
.fms-pick select.fms-va{background:#FFF1DC;border:2px solid #C27A12;color:#7A4300;font-weight:800;} .fms-pick select.fms-act{min-width:200px;font-weight:700;}
.fms-who{margin:0 0 8px;font-size:14px;color:var(--navy);overflow-wrap:anywhere;}
.fms-tbl{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13.5px;}
.fms-tbl th{background:#6AA84F;color:#fff;text-align:left;padding:6px 10px;font-weight:800;white-space:normal !important;overflow-wrap:anywhere;}
.fms-tbl th:nth-child(1){width:28% !important;} .fms-tbl th:nth-child(2){width:76px !important;text-align:center;}   /* (the criterion narrower, the score to its left: the Remarks get the room) */ .fms-tbl th:nth-child(3){width:auto !important;min-width:0 !important;}
.fms-tbl td{padding:4px 10px;border-bottom:1px solid #DDE7D5;color:#4E6B2E;font-weight:700;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:normal;}
.fms-tbl td em{color:#7a5d00;font-style:normal;font-weight:600;}
.fms-tbl tbody tr:nth-child(odd) td{background:#EEF4E8;}
.fms-tbl td:nth-child(2){text-align:center;}
.fms-tbl input, .fms-tbl textarea{font:inherit;font-weight:600;width:100%;box-sizing:border-box;padding:4px 7px;border:1px solid #C9D6BE;border-radius:6px;background:#fff;color:#262B45;}
.fms-tbl input[type=number]{width:64px;text-align:center;}
/* (bigger and bolder, for the trainer to read and type at a glance) */
.fms-top h3{font-size:26px;} .fms-pick{font-size:16px;} .fms-pick label{font-size:16px;} .fms-pick select{font-size:16.5px;padding:6px 10px;}
.fms-who{font-size:16.5px;font-weight:700;}
.fms-tbl{font-size:16.5px;} .fms-tbl th{font-size:16px;padding:9px 12px;} .fms-tbl td{padding:7px 12px;color:#2F4A16;font-weight:800;}
.fms-tbl input, .fms-tbl textarea{font-size:16px;font-weight:700;padding:6px 9px;} .fms-tbl input[type=number]{width:70px;font-size:17px;font-weight:800;}
.fms-tbl .ftms-avg td{font-size:17.5px;}
.fms textarea{resize:vertical;overflow:hidden;min-height:30px;line-height:1.35;white-space:pre-wrap;overflow-wrap:anywhere;field-sizing:content;}
.fms-tbl .ftms-avg td{font-weight:900;color:#3B5A1E;border-top:2px solid #6AA84F;background:#fff !important;}
.fms-foot{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;margin:12px 0 0;}
.fms-foot label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:var(--navy);}
.fms-foot label span{font-weight:500;color:var(--ink-soft);font-size:12px;}
.fms-foot input{font:inherit;font-size:14px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;} .fms-foot input[type=number]{width:90px;}
.fms-foot .fms-fac{width:220px;max-width:100%;} .fms-foot .fms-cmt{flex:1 1 320px;} .fms-foot textarea{font:inherit;font-size:14px;padding:6px 9px;border:1px solid var(--line);border-radius:8px;width:100%;box-sizing:border-box;min-height:56px;}
.fms-note{margin:10px 0 0;}
.fms-why{margin:12px 0 4px;padding:12px 16px;border:1px solid #C9D9B8;border-radius:10px;background:#F7FAF2;font-size:15px;line-height:1.5;color:#1B1E2E;}
.fms-why h4{margin:0 0 6px;font-size:16px;color:#2F4A14;} .fms-why p{margin:0 0 6px;} .fms-why ul{margin:0 0 8px;padding-left:20px;} .fms-why li{margin:2px 0;}
.fms-why-ok{color:#1E6B3A;font-weight:700;} .fms-why-imp{color:#8A3B12;font-weight:700;} .fms-assist{margin-top:8px;}
.fms-tag{display:inline-block;margin-left:4px;font-size:11.5px;font-weight:800;border-radius:999px;padding:1px 8px;background:#EEF0F6;color:#4A5070;}
.fms-tag.ok{color:#1E7F4F;background:#E7F5EE;} .fms-tag.mid{color:#7a5d00;background:#FEF7C3;} .fms-tag.dirty{background:#FEF7C3;color:#7a5d00;}
@media (max-width:640px){ .fms-tbl{font-size:12.5px;} .fms-tbl th, .fms-tbl td{padding:4px 5px;} .fms-tbl th:nth-child(1){width:34% !important;} .fms-tbl th:nth-child(2){width:52px !important;}
  .fms-tbl input[type=number]{width:44px;padding:4px 2px;} .fms-pick .fms-savebtn{margin-left:0;} .fms-pick select.fms-va, .fms-pick select.fms-act{min-width:0;flex:1 1 180px;} }
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
.fba-btns{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px;} .fba-btns .fba-del{margin-right:auto;color:#B42318;border-color:#E6A5A0;font-weight:800;}
.fba-list{display:grid;gap:6px;} .fba-item{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-size:13px;}
`; document.head.appendChild(s); })();
})();
