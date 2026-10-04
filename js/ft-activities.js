/* ============================================================
   DAILY ACTIVITIES + FACILITATOR FEEDBACK STYLE (Foundational Training)
   ------------------------------------------------------------
   📝 Activities (trainee tab): the trainer publishes activities for
   each program day (Day 0–18) in Admin → 📝 Activities: instructions,
   attached files, what a strong answer includes, whether trainees see
   it yet and for which batch. Trainees answer in writing and/or attach
   a file; the trainer reviews, drafts feedback with AI, edits it and
   sends it back.

   🗣 Feedback Style (admin tab): learns how the facilitator
   writes feedback — from reviews already sent and from pasted
   examples — and every AI feedback in the portal (Practice Lab
   grading, daily reviews, activity reviews, and the Worker's Task
   Tracker notes review) is then written in that voice.

   Shared storage keys (rules in worker.js):
     activities:dayN          published activities for a day (everyone reads, admin writes)
     actfile:<id>             an attachment the trainer published (everyone reads, admin writes)
     actsub:<traineeId>       that trainee's answers + the trainer's feedback
     actup:<traineeId>:<act>  a file the trainee attached to an answer
     actadmin:rubrics         trainer-only notes on what a strong answer includes
     actadmin:scoring         trainer-only scored rubrics per activity: criteria with 5→1 descriptors,
                              plus a graded example the AI copies the scoring and wording from
     settings:feedback-style  the learned facilitator voice (everyone reads, admin writes)
     admin:fbstyle-samples    the raw feedback examples it was learned from (admin only)
   ============================================================ */

const DA_MAX_FILE = 4 * 1024 * 1024;     // per attached file
// The program's days (the Training Guide runs Day 0 to Day 18). Lessons open per batch, so each
// activity has its own "visible to trainees" switch and an optional batch instead of following a lesson.
const DA_GROUPS = Array.from({length:19}, (_, i) => ({id:i, title:i === 0 ? "Onboarding" : ""}));
function daGroupLabel(id){ const g = DA_GROUPS.find(x => x.id === id); return `Day ${id}` + (g && g.title ? ` · ${g.title}` : ""); }
function daBatchKey(b){ return String(b || "").trim().toLowerCase(); }
function daVisible(a){ return state.isAdmin || (a.visible !== false && (!a.batch || daBatchKey(a.batch) === daBatchKey(state.traineeBatch))); }
if (typeof PERSONAL_KEYS !== "undefined" && !PERSONAL_KEYS.includes("activity-drafts")) {
  PERSONAL_KEYS.push("activity-drafts");  // unsent answers follow the trainee across devices
  PERSONAL_KEY_SET.add("activity-drafts");
}

function daState(){ return state.da || (state.da = {byDay:{}, loadedAt:0, open:null, subs:null, adminDay:1, adminSub:"manage", edit:null}); }
function daNewId(){ return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function daActs(dayId){ return ((daState().byDay[dayId] || {}).items) || []; }
function daFindAct(actId){ for(const d of DA_GROUPS){ const a = daActs(d.id).find(x => x.id === actId); if(a) return {act:a, dayId:d.id}; } return null; }
function daFmtSize(n){ return n > 1048576 ? (n/1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n/1024)) + " KB"; }
// Instructions are plain text: keep line breaks, **bold**, bullets and links.
function daFormat(t){
  return esc(t || "")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .split(/\n{2,}/).map(p => {
      const lines = p.split("\n");
      if(lines.every(l => /^\s*[-•*]\s+/.test(l))) return "<ul>" + lines.map(l => "<li>" + l.replace(/^\s*[-•*]\s+/, "") + "</li>").join("") + "</ul>";
      return "<p>" + lines.join("<br>") + "</p>";
    }).join("");
}
/* ---------- scored rubrics ----------
   A rubric is pasted straight from a Word/Docs table (cells arrive tab-separated):
     Criteria | Excellent (5pts) | Good (4pts) | Satisfactory (3pts) | Needs Improvement (2pts) | Poor (1pt)
   A graded example is the trainer's own evaluation of one real answer:
     Criteria | Score | Evaluation      (e.g. "2. Stages of a PI Claim | 4/5 | Demonstrated…")
   Feedback then carries scores:[{criterion, score, evaluation}], total, max and finalRating
   (total ÷ number of criteria, out of 5). */
function daTsv(text){
  const rows = [[]]; let cell = "", q = false; const t = String(text || "").replace(/\r\n?/g, "\n");
  for(let i = 0; i < t.length; i++){
    const c = t[i];
    if(q){ if(c === '"' && t[i + 1] === '"'){ cell += '"'; i++; } else if(c === '"') q = false; else cell += c; continue; }
    if(c === '"' && cell === "") q = true;
    else if(c === "\t"){ rows[rows.length - 1].push(cell); cell = ""; }
    else if(c === "\n"){ rows[rows.length - 1].push(cell); cell = ""; rows.push([]); }
    else cell += c;
  }
  rows[rows.length - 1].push(cell);
  return rows.map(r => r.map(x => x.replace(/\s+/g, " ").trim())).filter(r => r.some(Boolean));
}
const daCritName = (x) => String(x || "").replace(/^\s*\d+\s*[.)]\s*/, "").trim();
function daParseRubric(text){
  return daTsv(text).filter(r => r.length >= 3 && !/^(criteria|criterion)$/i.test(r[0]) && !/\(\s*\d+\s*pts?\s*\)/i.test(r[1] || ""))
    .map(r => ({name: daCritName(r[0]), levels: [5, 4, 3, 2, 1].map((pt, i) => r[i + 1] || "")})).filter(c => c.name);
}
function daParseExample(text, criteria){
  const out = [];
  daTsv(text).forEach(r => {
    if(r.length < 2 || /^(criteria|criterion)$/i.test(r[0])) return;
    const m = String(r[1]).match(/^(\d)(?:\s*\/\s*5)?$/); if(!m) return;
    out.push({criterion: daCritName(r[0]), score: +m[1], evaluation: r.slice(2).join(" ").trim()});
  });
  return out.filter(x => x.evaluation).slice(0, (criteria || []).length || 20);
}
function daScoreTotals(scores){
  const n = scores.length, total = scores.reduce((a, x) => a + (Number(x.score) || 0), 0);
  return {total, max: n * 5, finalRating: n ? Math.round(total / n * 100) / 100 : 0};
}
const daRatingFromScore = (r) => r >= 4.5 ? "Strong" : r >= 3.5 ? "On Track" : "Needs Support";
function daScoring(actId){ const sc = (daState().scoring || {})[actId]; return sc && (sc.criteria || []).length ? sc : null; }
function daScoresTable(fb){
  const t = daScoreTotals(fb.scores);
  return `<table class="da-score"><thead><tr><th>Criteria</th><th>Score</th><th>Evaluation</th></tr></thead><tbody>
    ${fb.scores.map((x, i) => `<tr><td><b>${i + 1}. ${esc(x.criterion)}</b></td><td class="da-score-n">${Number(x.score) || 0}/5</td><td>${esc(x.evaluation || "")}</td></tr>`).join("")}
    </tbody></table>
    <div class="da-score-tot"><span>Total Score: <b>${t.total}/${t.max}</b></span><span>Final Rating: <b>${t.finalRating.toFixed(2)}/5.00</b></span></div>`;
}

function daReadFile(file){
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Couldn't read " + file.name)); r.readAsDataURL(file); });
}
async function daDownload(key){
  try{
    const f = await sharedGet(key);
    if(!f || !f.data){ toast("That file isn't available any more."); return; }
    const blob = await (await fetch(f.data)).blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = f.name || "file";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }catch(e){ showActionError(e, "Downloading the file"); }
}
window.daDownload = daDownload;

async function daLoad(force){
  const s = daState();
  if(!force && s.loadedAt && Date.now() - s.loadedAt < 60000) return;
  s.loading = true;
  await Promise.all(DA_GROUPS.map(async d => { try{ s.byDay[d.id] = (await sharedGet("activities:day" + d.id)) || {items:[]}; }catch(e){ /* keep the last copy */ } }));
  if(state.traineeId && !state.isAdmin){ try{ s.subs = (await sharedGet("actsub:" + state.traineeId)) || {items:{}}; }catch(e){ s.subs = s.subs || {items:{}}; } }
  s.loadedAt = Date.now(); s.loading = false;
}
function daMySub(actId){ const s = daState(); return (s.subs && s.subs.items && s.subs.items[actId]) || null; }
function daUnreadCount(){
  const s = daState(); if(!s.subs || !s.subs.items) return 0;
  return Object.values(s.subs.items).filter(x => x.feedback && x.feedback.status === "sent" && !x.readAt).length;
}
window.daUnreadCount = daUnreadCount;
function daStatus(actId){
  const sub = daMySub(actId);
  if(!sub || !sub.submittedAt) return {cls:"pill-locked", label:"Not started"};
  if(sub.feedback && sub.feedback.status === "sent") return sub.readAt ? {cls:"pill-done", label:"Reviewed ✓"} : {cls:"pill-open", label:"💬 New feedback"};
  return {cls:"pill-open", label:"Submitted · awaiting review"};
}

/* ---------------- trainee page ---------------- */
function renderActivitiesPage(){
  const s = daState();
  if(!s.loadedAt){ if(!s.loading) daLoad().then(() => { if(state.view === "activities") render(); }); return `<p class="eyebrow">Daily Activities</p><div class="card" style="padding:30px;text-align:center;color:var(--ink-soft);">Loading activities…</div>`; }
  if(s.open){ const f = daFindAct(s.open); if(f && daVisible(f.act)) return renderActivityDetail(f.act, f.dayId); s.open = null; }
  const days = DA_GROUPS.filter(d => daActs(d.id).some(daVisible)).reverse();   // latest day first
  return `
    <p class="eyebrow">Daily Activities</p>
    <h1 style="color:var(--navy);font-size:26px;margin:6px 0 10px;">Activities</h1>
    <p style="color:var(--ink-soft);font-size:14.5px;max-width:72ch;margin:0 0 22px;">Activities your trainer sets for each day. Open one, read the instructions and any attached files, then submit your answer. Your trainer reviews every submission and sends you feedback here.</p>
    ${days.length ? days.map(d => {
      const open = true;
      return `<div class="da-day">
        <h3 class="da-day-h">${esc(daGroupLabel(d.id))}</h3>
        <div class="da-grid">${daActs(d.id).filter(daVisible).map(a => { const st = daStatus(a.id); return `
          <button type="button" class="card da-card ${open ? "" : "locked"}" ${open ? `onclick="daOpen('${a.id}')"` : "disabled"}>
            <span class="da-card-t">${esc(a.title)}</span>
            <span class="da-card-m">${a.response && a.response.text !== false ? "✍ Written answer" : ""}${a.response && a.response.file ? " · 📎 File upload" : ""}${(a.files || []).length ? ` · ${a.files.length} attachment${a.files.length > 1 ? "s" : ""}` : ""}</span>
            <span class="pill ${st.cls}">${st.label}</span>${state.isAdmin && (a.visible === false || a.batch) ? `<span class="da-note">${a.visible === false ? "🙈 Hidden from trainees" : "👥 " + esc(a.batch) + " only"}</span>` : ""}
          </button>`; }).join("")}</div>
      </div>`; }).join("")
    : `<div class="card" style="padding:30px;text-align:center;color:var(--ink-soft);">No activities yet. Your trainer will post them here.${state.isAdmin ? ` <br><br><button class="btn btn-navy btn-sm" onclick="goto('admin'); setAdminTab('activities')">Add activities in Admin → 📝 Activities</button>` : ""}</div>`}`;
}
window.renderActivitiesPage = renderActivitiesPage;
function daOpen(id){ daState().open = id; render(); window.scrollTo({top:0}); }
function daClose(){ daState().open = null; render(); }
Object.assign(window, {daOpen, daClose});

function renderActivityDetail(a, dayId){
  const sub = daMySub(a.id) || {};
  const fb = sub.feedback && sub.feedback.status === "sent" ? sub.feedback : null;
  const drafts = state.daDrafts || {};
  const answer = drafts[a.id] !== undefined ? drafts[a.id] : (sub.answer || "");
  const wantsText = !a.response || a.response.text !== false, wantsFile = !!(a.response && a.response.file);
  if(fb && !sub.readAt && state.traineeId && !state.isAdmin) setTimeout(() => daMarkRead(a.id), 400);
  return `
    <a class="back-link" onclick="daClose()">&larr; All activities</a>
    <p class="eyebrow" style="margin-top:10px;">${esc(daGroupLabel(dayId))} · Activity</p>
    <h1 style="color:var(--navy);font-size:25px;margin:6px 0 14px;">${esc(a.title)}</h1>
    ${fb ? daFeedbackCard(fb, "Feedback from your trainer") : ""}
    <div class="card da-body">${daFormat(a.instructions) || '<p style="color:var(--ink-soft)">No written instructions — see the attached file.</p>'}
      ${(a.files || []).length ? `<div class="da-files"><b>Attached files</b>${a.files.map(f => `<button type="button" class="btn btn-ghost btn-sm" onclick="daDownload('actfile:${f.id}')">⬇ ${esc(f.name)} <span style="color:var(--ink-soft);font-weight:500;">${daFmtSize(f.size || 0)}</span></button>`).join("")}</div>` : ""}
    </div>
    <div class="card da-answer">
      <h3 style="margin:0 0 8px;color:var(--navy);font-size:16px;">Your answer</h3>
      ${sub.submittedAt ? `<p class="da-note">Submitted ${fmtDate(sub.submittedAt)}${sub.attempts > 1 ? ` · attempt ${sub.attempts}` : ""}. ${fb ? "You can revise and resubmit — your trainer will review the new version." : "Your trainer will review it and send feedback here. You can still revise and resubmit."}</p>` : ""}
      ${wantsText ? `<textarea id="daAnswer" class="da-textarea" rows="12" placeholder="Write your answer here…" oninput="daSaveDraft('${a.id}', this.value)">${esc(answer)}</textarea>` : ""}
      ${wantsFile ? `<div class="da-upload"><label><b>Attach a file</b> <span style="color:var(--ink-soft);font-size:12.5px;">(PDF, Word, Excel, image — up to 4 MB)</span><br><input type="file" id="daFile"></label>
        ${sub.file ? `<div class="da-note">Current file: <button type="button" class="btn btn-ghost btn-sm" onclick="daDownload('actup:${esc(state.traineeId)}:${a.id}')">📎 ${esc(sub.file.name)}</button> — choose a new file to replace it.</div>` : ""}</div>` : ""}
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px;">
        <button class="btn btn-primary" id="daSubmitBtn" onclick="daSubmit('${a.id}', ${dayId})" ${state.isAdmin ? "disabled title='Trainees submit here — use Trainee view to preview'" : ""}>${sub.submittedAt ? "Resubmit" : "Submit to trainer"}</button>
        <span class="da-note" id="daSaveNote">${drafts[a.id] !== undefined && drafts[a.id] !== (sub.answer || "") ? "Draft saved" : ""}</span>
      </div>
    </div>
    ${sub.prevFeedback ? `<details class="da-prev"><summary>Feedback on your earlier attempt</summary>${daFeedbackCard(sub.prevFeedback, "Earlier feedback")}</details>` : ""}`;
}
function daFeedbackCard(fb, title){
  const list = (h, arr) => (arr || []).length ? `<div class="da-fb-l"><b>${h}</b><ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
  return `<div class="card da-fb"><div class="da-fb-h"><span>💬 ${esc(title)}</span>${fb.rating ? `<span class="pill ${fb.rating === "Strong" ? "pill-done" : fb.rating === "Needs Support" ? "pill-locked" : "pill-open"}">${esc(fb.rating)}</span>` : ""}</div>
    ${fb.summary ? `<p>${esc(fb.summary)}</p>` : ""}${(fb.scores || []).length ? daScoresTable(fb) : ""}${list("What worked", fb.strengths)}${list("Not yet — build on this", fb.areasToBuild)}${list("Next steps", fb.nextSteps)}
    ${fb.sentAt ? `<div class="da-note">Sent ${fmtDate(fb.sentAt)}</div>` : ""}</div>`;
}
let daDraftTimer = null;
function daSaveDraft(actId, val){
  state.daDrafts = state.daDrafts || {}; state.daDrafts[actId] = val;
  clearTimeout(daDraftTimer);
  daDraftTimer = setTimeout(async () => { await storeSet("activity-drafts", state.daDrafts); const n = document.getElementById("daSaveNote"); if(n) n.textContent = "Draft saved"; }, 700);
}
async function daSubmit(actId, dayId){
  const f = daFindAct(actId); if(!f || !state.traineeId) return;
  const a = f.act, btn = document.getElementById("daSubmitBtn");
  const ta = document.getElementById("daAnswer"), fileEl = document.getElementById("daFile");
  const answer = ta ? ta.value.trim() : "";
  const file = fileEl && fileEl.files && fileEl.files[0];
  const prev = daMySub(actId) || {};
  if(!answer && !file && !prev.file){ toast("Write your answer (or attach a file) before submitting."); return; }
  if(file && file.size > DA_MAX_FILE){ toast(`That file is ${daFmtSize(file.size)} — the limit is 4 MB. Try a PDF or a smaller file.`); return; }
  if(btn){ btn.disabled = true; btn.textContent = "Submitting…"; }
  try{
    let meta = prev.file || null;
    if(file){
      const data = await daReadFile(file);
      if(!(await sharedSet(`actup:${state.traineeId}:${actId}`, {name:file.name, type:file.type, size:file.size, data}))) throw new Error("the file couldn't be uploaded");
      meta = {name:file.name, type:file.type, size:file.size};
    }
    const ok = await sharedSet("actsub:" + state.traineeId, {items:{[actId]:{answer, file:meta, submittedAt:new Date().toISOString()}}});
    if(!ok) throw new Error("your answer couldn't be saved to the server");
    if(state.daDrafts){ delete state.daDrafts[actId]; await storeSet("activity-drafts", state.daDrafts); }
    if(typeof logWork === "function") logWork({kind:"activity", dayId, label:`Day ${dayId} activity: ${a.title}`});
    await daLoad(true);
    toast("✅ Submitted — your trainer will review it and send feedback here.");
    render();
  }catch(e){ showActionError(e, "Submitting your activity"); if(btn){ btn.disabled = false; btn.textContent = "Submit to trainer"; } }
}
async function daMarkRead(actId){
  const sub = daMySub(actId); if(!sub || sub.readAt) return;
  sub.readAt = new Date().toISOString();
  await sharedSet("actsub:" + state.traineeId, {items:{[actId]:{readAt:sub.readAt}}});
  const b = document.querySelector(".nav .nav-badge-act"); if(b && !daUnreadCount()) b.remove();
}
Object.assign(window, {daSaveDraft, daSubmit});

/* ---------------- admin: 📋 Activities ---------------- */
function renderAdminActivities(){
  const s = daState();
  if(!s.loadedAt || !s.adminLoaded){
    if(!s.loading){ s.loading = true; Promise.all([daLoad(true), daLoadRubrics()]).then(() => { s.adminLoaded = true; s.loading = false; if(state.view === "admin" && state.adminTab === "activities") render(); }); }
    return `<div class="card" style="padding:30px;text-align:center;color:var(--ink-soft);">Loading activities…</div>`;
  }
  const newCount = (s.review || []).filter(r => !r.sub.feedback).length;
  return `
    <div class="da-subtabs">
      <button class="${s.adminSub === "manage" ? "active" : ""}" onclick="daAdminSub('manage')">✏️ Set activities</button>
      <button class="${s.adminSub === "review" ? "active" : ""}" onclick="daAdminSub('review')">📥 Review submissions${s.review ? ` (${newCount} new)` : ""}</button>
    </div>
    ${s.adminSub === "review" ? renderDaReview() : renderDaManage()}`;
}
window.renderAdminActivities = renderAdminActivities;
function daAdminSub(t){ const s = daState(); s.adminSub = t; if(t === "review" && !s.review) daLoadReview(); render(); }
window.daAdminSub = daAdminSub;
async function daLoadRubrics(){
  const s = daState();
  try{ s.rubrics = (await sharedGet("actadmin:rubrics")) || {}; }catch(e){ s.rubrics = s.rubrics || {}; }
  try{ s.scoring = (await sharedGet("actadmin:scoring")) || {}; }catch(e){ s.scoring = s.scoring || {}; }
}

function renderDaManage(){
  const s = daState(), dayId = s.adminDay, acts = daActs(dayId), e = s.edit;
  return `
    <p style="color:var(--ink-soft);font-size:13.5px;max-width:80ch;margin:0 0 12px;">Add the activities for each program day. Trainees see an activity under <b>📝 Activities</b> once it's marked <b>Visible to trainees</b> (all batches, or one batch). Type or paste the instructions and attach any files (worksheets, PDFs, templates). The notes on what a strong answer includes stay private — they guide your review and the AI draft.</p>
    <div class="da-daychips">${DA_GROUPS.map(d => `<button class="${d.id === dayId ? "active" : ""}" onclick="daAdminDay(${d.id})">Day ${d.id}${daActs(d.id).length ? ` <b>${daActs(d.id).length}</b>` : ""}</button>`).join("")}</div>
    <div class="card" style="padding:16px 18px;margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;"><b style="color:var(--navy);">${esc(daGroupLabel(dayId))}</b>${e ? "" : `<button class="btn btn-primary btn-sm" onclick="daEdit(null)">+ New activity</button>`}</div>
      ${acts.length ? `<div class="da-list">${acts.map((a, i) => `<div class="da-row"><span class="da-row-t">${i + 1}. ${esc(a.title)}</span><span class="da-row-m">${a.visible === false ? "🙈 hidden · " : "👁 visible · "}${a.batch ? "👥 " + esc(a.batch) + " · " : ""}${a.response && a.response.text !== false ? "✍" : ""}${a.response && a.response.file ? " 📎" : ""} ${(a.files || []).length ? `${a.files.length} file(s)` : ""}</span>
        <span class="da-row-b"><button class="btn btn-ghost btn-sm" ${i ? "" : "disabled"} onclick="daMove('${a.id}',-1)" title="Move up">↑</button><button class="btn btn-ghost btn-sm" ${i < acts.length - 1 ? "" : "disabled"} onclick="daMove('${a.id}',1)" title="Move down">↓</button><button class="btn btn-ghost btn-sm" onclick="daEdit('${a.id}')">Edit</button><button class="btn btn-ghost btn-sm" onclick="daDelete('${a.id}')">Delete</button></span></div>`).join("")}</div>`
        : `<p style="color:var(--ink-soft);font-size:13.5px;margin:10px 0 0;">No activities for Day ${dayId} yet.</p>`}
    </div>
    ${e ? renderDaForm(e) : ""}`;
}
function renderDaForm(e){
  const s = daState();
  return `<div class="card da-form" id="daForm">
    <h3 style="margin:0 0 10px;color:var(--navy);font-size:16px;">${e.id ? "Edit activity" : "New activity"} · ${esc(daGroupLabel(s.adminDay))}</h3>
    <label>Title<input type="text" id="daf_title" value="${esc(e.title || "")}" placeholder="e.g. Draft Elias's Monday briefing email"></label>
    <label>Instructions <span>(what the trainee should do — paste from your document; **bold**, "- " bullets and links work)</span><textarea id="daf_instr" rows="10">${esc(e.instructions || "")}</textarea></label>
    <div class="da-form-row"><b>Trainee answers with</b>
      <label class="da-check"><input type="checkbox" id="daf_text" ${!e.response || e.response.text !== false ? "checked" : ""}> Written answer</label>
      <label class="da-check"><input type="checkbox" id="daf_file" ${e.response && e.response.file ? "checked" : ""}> File upload</label></div>
    <div class="da-form-row"><b>Attached files</b> <span style="color:var(--ink-soft);font-size:12.5px;">(up to 4 MB each)</span>
      <div>${(e.files || []).map((f, i) => `<span class="da-chip">📎 ${esc(f.name)} <button type="button" onclick="daRemoveFile(${i})" title="Remove">✕</button></span>`).join("")}</div>
      <input type="file" id="daf_upload" multiple></div>
    <div class="da-form-row"><b>Who sees it</b>
      <label class="da-check"><input type="checkbox" id="daf_visible" ${e.visible !== false ? "checked" : ""}> Visible to trainees</label>
      <label class="da-check">Batch <input type="text" id="daf_batch" list="daf_batches" value="${esc(e.batch || "")}" placeholder="All batches" style="width:180px;margin-left:6px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:13px;"></label>
      <datalist id="daf_batches">${[...new Set((state.adminData || []).map(r => r.batch).filter(Boolean))].map(b => `<option value="${esc(b)}">`).join("")}</datalist></div>
    <label>What a strong answer includes <span>(private — for your review and the AI draft; trainees never see this)</span><textarea id="daf_rubric" rows="5">${esc(e.rubric || "")}</textarea></label>
    <details class="da-scoring" ${e.scoringText ? "open" : ""}><summary><b>📊 Scored rubric</b> <span class="da-note">(optional, private — score each criterion out of 5, like your rubric documents)</span></summary>
      <p class="da-note">Copy your rubric table from Word or Google Docs and paste it here (or upload it as .txt/.tsv): one row per criterion — the criterion, then what earns 5, 4, 3, 2 and 1 points. Then paste one evaluation you wrote (Criteria · Score · Evaluation): the AI scores every new submission the same way and writes each evaluation in that style.</p>
      <label>Rubric table<textarea id="daf_scoring" rows="7" placeholder="Criteria&#9;Excellent (5pts)&#9;Good (4pts)&#9;Satisfactory (3pts)&#9;Needs Improvement (2pts)&#9;Poor (1pt)&#10;1. Definition and Types&#9;Clear definition with at least 5 types…&#9;…">${esc(e.scoringText || "")}</textarea></label>
      <label class="da-check" style="cursor:pointer;">⬆ Upload rubric (.txt / .tsv)<input type="file" accept=".txt,.tsv,.csv,text/plain" style="display:none" onchange="daLoadText(this,'daf_scoring')"></label>
      <label>A graded example <span>(your evaluation of one real answer — remove the trainee's name)</span><textarea id="daf_example" rows="7" placeholder="Criteria&#9;Score&#9;Evaluation&#10;1. Definition &amp; Types&#9;5/5&#9;Provided an accurate definition…">${esc(e.exampleText || "")}</textarea></label>
      <label class="da-check" style="cursor:pointer;">⬆ Upload graded example (.txt / .tsv)<input type="file" accept=".txt,.tsv,.csv,text/plain" style="display:none" onchange="daLoadText(this,'daf_example')"></label>
      <div id="daf_scoring_preview">${daScoringPreview(e)}</div>
    </details>
    <div style="display:flex;gap:10px;margin-top:12px;"><button class="btn btn-primary" id="dafSave" onclick="daSaveActivity()">${e.id ? "Save changes" : "Publish activity"}</button><button class="btn btn-ghost" onclick="daCancelEdit()">Cancel</button></div>
  </div>`;
}
function daScoringPreview(e){
  const crit = daParseRubric(e.scoringText || ""), ex = daParseExample(e.exampleText || "", crit);
  if(!crit.length) return e.scoringText ? `<p class="da-note" style="color:var(--danger);">No criteria found — paste the table with its cells separated by tabs (copying a Word table does this).</p>` : "";
  const t = daScoreTotals(ex);
  return `<p class="da-note"><b>${crit.length} criteria</b> · out of ${crit.length * 5}${ex.length ? ` · graded example: ${ex.length} evaluations, ${t.total}/${t.max} (${t.finalRating.toFixed(2)}/5.00)` : " · no graded example yet"}</p>
    <ol class="da-crit">${crit.map(c => `<li><b>${esc(c.name)}</b> <span class="da-note">5: ${esc(c.levels[0].slice(0, 90))}${c.levels[0].length > 90 ? "…" : ""}</span></li>`).join("")}</ol>`;
}
async function daLoadText(input, target){
  const f = input.files && input.files[0]; if(!f) return;
  const el = document.getElementById(target); if(el){ el.value = await f.text(); daKeepForm(); const p = document.getElementById("daf_scoring_preview"); if(p) p.innerHTML = daScoringPreview(daState().edit); }
}
Object.assign(window, {daLoadText});
function daAdminDay(d){ const s = daState(); s.adminDay = d; s.edit = null; render(); }
function daEdit(id){
  const s = daState();
  const a = id ? daActs(s.adminDay).find(x => x.id === id) : null;
  const sc = a ? (s.scoring || {})[a.id] : null;
  s.edit = a ? JSON.parse(JSON.stringify(Object.assign({}, a, {rubric:(s.rubrics || {})[a.id] || "", scoringText:(sc && sc.rubricText) || "", exampleText:(sc && sc.exampleText) || ""})))
    : {id:null, title:"", instructions:"", response:{text:true, file:false}, files:[], rubric:"", scoringText:"", exampleText:"", visible:true, batch:""};
  render(); setTimeout(() => { const f = document.getElementById("daForm"); if(f) f.scrollIntoView({behavior:"smooth", block:"start"}); }, 50);
}
function daCancelEdit(){ daState().edit = null; render(); }
function daKeepForm(){
  const s = daState(), e = s.edit; if(!e) return;
  const v = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  e.title = v("daf_title"); e.instructions = v("daf_instr"); e.rubric = v("daf_rubric");
  if(document.getElementById("daf_scoring")){ e.scoringText = v("daf_scoring"); e.exampleText = v("daf_example"); }
  e.response = {text:!!(document.getElementById("daf_text") || {}).checked, file:!!(document.getElementById("daf_file") || {}).checked};
  e.visible = !!(document.getElementById("daf_visible") || {}).checked; e.batch = v("daf_batch").trim();
}
function daRemoveFile(i){ daKeepForm(); daState().edit.files.splice(i, 1); render(); }
async function daSaveDay(dayId, items){
  const ok = await sharedSet("activities:day" + dayId, {items, updatedAt:new Date().toISOString()});
  if(!ok) throw new Error("couldn't save to the server");
  daState().byDay[dayId] = {items};
}
async function daSaveActivity(){
  daKeepForm();
  const s = daState(), e = s.edit, dayId = s.adminDay, btn = document.getElementById("dafSave");
  if(!e.title.trim()){ toast("Give the activity a title."); return; }
  if(!e.response.text && !e.response.file){ toast("Choose how trainees answer: written, file upload, or both."); return; }
  const up = document.getElementById("daf_upload"), files = up && up.files ? [...up.files] : [];
  const big = files.find(f => f.size > DA_MAX_FILE);
  if(big){ toast(`${big.name} is ${daFmtSize(big.size)} — the limit is 4 MB per file.`); return; }
  if(btn){ btn.disabled = true; btn.textContent = "Saving…"; }
  try{
    for(const f of files){
      const id = daNewId();
      if(!(await sharedSet("actfile:" + id, {name:f.name, type:f.type, size:f.size, data:await daReadFile(f)}))) throw new Error(`${f.name} couldn't be uploaded`);
      e.files.push({id, name:f.name, type:f.type, size:f.size});
    }
    const act = {id:e.id || daNewId(), title:e.title.trim(), instructions:e.instructions.trim(), response:e.response, files:e.files, visible:e.visible !== false, batch:e.batch || "", updatedAt:new Date().toISOString()};
    const items = daActs(dayId).slice(); const i = items.findIndex(x => x.id === act.id);
    if(i >= 0) items[i] = Object.assign({}, items[i], act); else items.push(Object.assign({createdAt:act.updatedAt}, act));
    await daSaveDay(dayId, items);
    s.rubrics = s.rubrics || {}; if(e.rubric.trim()) s.rubrics[act.id] = e.rubric.trim(); else delete s.rubrics[act.id];
    await sharedSet("actadmin:rubrics", s.rubrics);
    s.scoring = s.scoring || {};
    const crit = daParseRubric(e.scoringText || "");
    if(e.scoringText && e.scoringText.trim() && !crit.length) throw new Error("the scored rubric has no criteria — paste the table with tab-separated cells");
    if(crit.length) s.scoring[act.id] = {criteria:crit, example:daParseExample(e.exampleText || "", crit), rubricText:e.scoringText.trim(), exampleText:(e.exampleText || "").trim(), updatedAt:new Date().toISOString()};
    else delete s.scoring[act.id];
    if(!(await sharedSet("actadmin:scoring", s.scoring))) throw new Error("the scored rubric couldn't be saved");
    s.edit = null; toast(act.visible ? `Saved — trainees${act.batch ? " in " + act.batch : ""} see it under 📝 Activities.` : "Saved as hidden — tick Visible to trainees when it's time."); render();
  }catch(err){ showActionError(err, "Saving the activity"); if(btn){ btn.disabled = false; btn.textContent = "Publish activity"; } }
}
async function daDelete(id){
  const s = daState(), a = daActs(s.adminDay).find(x => x.id === id); if(!a) return;
  if(!confirm(`Delete "${a.title}"? Trainees' submitted answers are kept, but the activity disappears from their list.`)) return;
  try{
    await daSaveDay(s.adminDay, daActs(s.adminDay).filter(x => x.id !== id));
    for(const f of a.files || []){ try{ await sharedDelete("actfile:" + f.id); }catch(e){} }
    toast("Activity deleted."); render();
  }catch(e){ showActionError(e, "Deleting the activity"); }
}
async function daMove(id, dir){
  const s = daState(), items = daActs(s.adminDay).slice(), i = items.findIndex(x => x.id === id), j = i + dir;
  if(i < 0 || j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  try{ await daSaveDay(s.adminDay, items); render(); }catch(e){ showActionError(e, "Reordering"); }
}
Object.assign(window, {daAdminDay, daEdit, daCancelEdit, daRemoveFile, daSaveActivity, daDelete, daMove});

/* ---------------- admin: review submissions ---------------- */
function daTraineeName(id){
  const r = (state.adminData || []).find(x => x.id === id); if(r && r.name) return r.name;
  const n = (daState().names || {})[id]; return n || id;
}
async function daLoadReview(){
  const s = daState(); s.reviewLoading = true;
  try{
    if(!state.adminData && typeof loadAdminLedgerQuiet === "function"){ try{ await loadAdminLedgerQuiet(); }catch(e){} }
    const keys = (await sharedList("actsub:")).filter(k => /^actsub:.+/.test(k));
    const rows = [];
    await runPool(keys, async (k) => {
      const doc = await sharedGet(k); const tid = k.slice(7);
      Object.entries((doc && doc.items) || {}).forEach(([aid, sub]) => { if(sub && sub.submittedAt) rows.push({tid, aid, sub}); });
    }, 4);
    rows.sort((a, b) => String(b.sub.submittedAt).localeCompare(String(a.sub.submittedAt)));
    // Names for trainees the ledger hasn't loaded (their own registration record).
    s.names = s.names || {};
    const unknown = [...new Set(rows.map(r => r.tid))].filter(t => !(state.adminData || []).some(x => x.id === t && x.name) && !s.names[t]);
    await runPool(unknown, async (t) => { const rec = await sharedGet("trainee:" + t); const nm = rec && (rec.name || [rec.firstName, rec.lastName].filter(Boolean).join(" ")); if(nm) s.names[t] = nm; }, 4);
    s.review = rows;
  }catch(e){ showActionError(e, "Loading submissions"); s.review = s.review || []; }
  s.reviewLoading = false;
  if(state.view === "admin" && state.adminTab === "activities") render();
}
window.daLoadReview = daLoadReview;
function daRowStatus(sub){ return !sub.feedback ? "new" : sub.feedback.status === "sent" ? "sent" : "draft"; }
function renderDaReview(){
  const s = daState();
  if(!s.review) return `<div class="card" style="padding:30px;text-align:center;color:var(--ink-soft);">Loading submissions…</div>`;
  const f = s.reviewFilter || "todo", fd = s.reviewDay === undefined ? -1 : s.reviewDay;
  const inFilter = (r) => f === "all" || (f === "todo" ? daRowStatus(r.sub) !== "sent" : daRowStatus(r.sub) === f);
  const rows = s.review.filter(r => inFilter(r) && (fd < 0 || ((daFindAct(r.aid) || {}).dayId === fd)));
  const count = (st) => s.review.filter(r => st === "todo" ? daRowStatus(r.sub) !== "sent" : daRowStatus(r.sub) === st).length;
  return `
    <div class="da-review-bar">
      ${[["todo", "To review"], ["sent", "Sent"], ["all", "All"]].map(([k, l]) => `<button class="${f === k ? "active" : ""}" onclick="daReviewFilter('${k}')">${l}${k !== "all" ? ` (${count(k)})` : ""}</button>`).join("")}
      <select onchange="daReviewDay(this.value)"><option value="-1">All days</option>${DA_GROUPS.map(d => `<option value="${d.id}" ${fd === d.id ? "selected" : ""}>Day ${d.id}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="daLoadReview()">↻ Refresh</button>
      ${count("new") ? `<button class="btn btn-navy btn-sm" id="daDraftAllBtn" onclick="daDraftAll()">✨ Draft feedback for all new (${count("new")})</button>` : ""}
    </div>
    ${fbStyleOn() ? `<p class="da-note" style="margin:0 0 10px;">🗣 AI drafts are written in your facilitator's voice (Admin → 🗣 Feedback Style).</p>` : `<p class="da-note" style="margin:0 0 10px;">Tip: teach the AI your facilitator's voice in Admin → 🗣 Feedback Style.</p>`}
    ${rows.length ? rows.map(renderDaReviewRow).join("") : `<div class="card" style="padding:26px;text-align:center;color:var(--ink-soft);">${f === "todo" ? "All caught up — nothing waiting for review." : "Nothing here."}</div>`}`;
}
function daReviewFilter(k){ daState().reviewFilter = k; render(); }
function daReviewDay(v){ const n = parseInt(v, 10); daState().reviewDay = isNaN(n) || n < 0 ? -1 : n; render(); }
function daRowId(r){ return cssId(r.tid) + "_" + r.aid; }
function renderDaReviewRow(r){
  const f = daFindAct(r.aid), a = f ? f.act : {title:"(deleted activity)"}, fb = r.sub.feedback || {}, id = daRowId(r), st = daRowStatus(r.sub);
  const lines = (arr) => esc((arr || []).join("\n"));
  return `<div class="card da-rev" id="darev_${id}">
    <div class="da-rev-h"><div><b>${esc(daTraineeName(r.tid))}</b> <span class="da-note">· ${f ? esc(daGroupLabel(f.dayId)) + " · " : ""}${esc(a.title)} · submitted ${fmtDate(r.sub.submittedAt)}${r.sub.attempts > 1 ? ` · attempt ${r.sub.attempts}` : ""}</span></div>
      <span class="pill ${st === "sent" ? "pill-done" : st === "draft" ? "pill-open" : "pill-locked"}">${st === "sent" ? "Sent" + (r.sub.readAt ? " · read" : "") : st === "draft" ? "Draft" : "New"}</span></div>
    <details ${st === "sent" ? "" : "open"}><summary>Answer</summary><div class="da-rev-a">${r.sub.answer ? esc(r.sub.answer).replace(/\n/g, "<br>") : "<i>(no written answer)</i>"}</div>
      ${r.sub.file ? `<button class="btn btn-ghost btn-sm" onclick="daDownload('actup:${esc(r.tid)}:${r.aid}')">📎 ${esc(r.sub.file.name)}</button>` : ""}</details>
    <div class="da-rev-f">
      ${daScoring(r.aid) ? daScoreEditor(r, id) : ""}
      <label>Rating <select id="dar_${id}_rating">${["Strong", "On Track", "Needs Support"].map(x => `<option ${fb.rating === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      <label>Summary<textarea id="dar_${id}_summary" rows="3">${esc(fb.summary || "")}</textarea></label>
      <div class="da-rev-3">
        <label>What worked <span>(one per line)</span><textarea id="dar_${id}_strengths" rows="4">${lines(fb.strengths)}</textarea></label>
        <label>Not yet — build on this<textarea id="dar_${id}_areas" rows="4">${lines(fb.areasToBuild)}</textarea></label>
        <label>Next steps<textarea id="dar_${id}_next" rows="4">${lines(fb.nextSteps)}</textarea></label>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" id="dar_${id}_ai" onclick="daDraft('${esc(r.tid)}','${r.aid}')">✨ ${fb.summary ? "Redraft" : "Draft"} with AI</button>
        <button class="btn btn-ghost btn-sm" onclick="daSaveFeedback('${esc(r.tid)}','${r.aid}', false)">Save draft</button>
        <button class="btn btn-primary btn-sm" onclick="daSaveFeedback('${esc(r.tid)}','${r.aid}', true)">${st === "sent" ? "Update sent feedback" : "Send to trainee"}</button>
      </div>
    </div>
  </div>`;
}
// The per-criterion editor on a review (scored rubric activities).
function daScoreEditor(r, id){
  const sc = daScoring(r.aid), fb = r.sub.feedback || {}, have = fb.scores || [];
  const rows = sc.criteria.map((c, i) => { const x = have.find(y => y.criterion === c.name) || have[i] || {};
    return `<tr><td><b>${i + 1}. ${esc(c.name)}</b><details class="da-desc"><summary>descriptors</summary>${c.levels.map((l, j) => `<div><b>${5 - j}</b> ${esc(l)}</div>`).join("")}</details></td>
      <td><select id="dar_${id}_s${i}" onchange="daScoreTotal('${id}', ${sc.criteria.length})">${[5, 4, 3, 2, 1].map(n => `<option ${Number(x.score) === n ? "selected" : ""}>${n}</option>`).join("")}${x.score == null ? `<option value="" selected>–</option>` : ""}</select> /5</td>
      <td><textarea id="dar_${id}_e${i}" rows="3">${esc(x.evaluation || "")}</textarea></td></tr>`; }).join("");
  const t = daScoreTotals(have);
  return `<div class="da-score-edit"><b>📊 Rubric scores</b>
    <table class="da-score"><thead><tr><th>Criteria</th><th>Score</th><th>Evaluation</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="da-score-tot" id="dar_${id}_tot">${have.length ? `<span>Total Score: <b>${t.total}/${t.max}</b></span><span>Final Rating: <b>${t.finalRating.toFixed(2)}/5.00</b></span>` : `<span class="da-note">Draft with AI or score each criterion.</span>`}</div></div>`;
}
function daScoreTotal(id, n){
  const scores = Array.from({length:n}, (_, i) => ({score: Number((document.getElementById(`dar_${id}_s${i}`) || {}).value) || 0}));
  const t = daScoreTotals(scores), el = document.getElementById(`dar_${id}_tot`);
  if(el) el.innerHTML = `<span>Total Score: <b>${t.total}/${t.max}</b></span><span>Final Rating: <b>${t.finalRating.toFixed(2)}/5.00</b></span>`;
  const sel = document.getElementById(`dar_${id}_rating`); if(sel) sel.value = daRatingFromScore(t.finalRating);
}
window.daScoreTotal = daScoreTotal;
function daRow(tid, aid){ return (daState().review || []).find(r => r.tid === tid && r.aid === aid); }
// With a scored rubric: score every criterion like the trainer's graded example, in the same voice.
function daScoredPrompt(r, sc){
  const f = daFindAct(r.aid), a = f ? f.act : {title:"", instructions:""}, notes = (daState().rubrics || {})[r.aid] || "";
  const ex = sc.example || [], exT = daScoreTotals(ex);
  return `You are the facilitator at Legal Support Help (LSH) scoring one trainee's submission against a rubric, exactly the way you scored the graded example below.

ACTIVITY (Day ${f ? f.dayId : "?"}): ${a.title}
INSTRUCTIONS GIVEN TO THE TRAINEE:
${String(a.instructions || "(see attached file)").slice(0, 3500)}
${notes ? `\nWHAT A STRONG ANSWER INCLUDES (private notes):\n${notes.slice(0, 2500)}\n` : ""}
RUBRIC — score each criterion 1–5 using these descriptors:
${sc.criteria.map((c, i) => `${i + 1}. ${c.name}\n   5: ${c.levels[0]}\n   4: ${c.levels[1]}\n   3: ${c.levels[2]}\n   2: ${c.levels[3]}\n   1: ${c.levels[4]}`).join("\n")}
${ex.length ? `
GRADED EXAMPLE — how you scored and wrote about another trainee's answer (total ${exT.total}/${exT.max}). Match its scoring standard, sentence style and length; do not copy its content:
${ex.map((x, i) => `${i + 1}. ${x.criterion} — ${x.score}/5: ${x.evaluation}`).join("\n")}
` : ""}
HOW TO WRITE EACH EVALUATION (the facilitator's style):
- 2–4 sentences, speaking to the trainee as "you"; open with what they did, e.g. "Provided…", "Demonstrated…", "Identified…", "Gave…".
- Be specific: name the facts, figures and points they got right, taken from their answer.
- For any point off, say exactly what was missing or combined (e.g. "you omitted the separate investigation stage"). A 5/5 needs no criticism.
- For writing/clarity, quote actual typos in quotation marks and say whether they affect understanding.
- For completeness/effort, name the notable omissions from the other criteria.
- Score strictly by the descriptors and only on what they submitted; never invent content. If a criterion isn't addressed, score it low and say so.

TRAINEE: ${daTraineeName(r.tid)}
THEIR SUBMISSION:
${String(r.sub.answer || "(no written answer)").slice(0, 9000)}${r.sub.file ? `\n(They also attached a file, "${r.sub.file.name}". You can't see its contents — score only the written answer and mention that the trainer will look at the file.)` : ""}

Return ONLY JSON (no markdown):
{"scores":[${sc.criteria.map(c => `{"criterion":${JSON.stringify(c.name)},"score":1-5,"evaluation":"…"}`).join(",")}],
 "summary":"1-2 sentences on the overall result"}` + fbStyleBlock();
}
function daActivityPrompt(r){
  const f = daFindAct(r.aid), a = f ? f.act : {title:"", instructions:""}, rubric = (daState().rubrics || {})[r.aid] || "";
  return `You are the facilitator at Legal Support Help (LSH) reviewing one trainee's submission for a daily training activity. Write specific, honest, encouraging feedback based ONLY on what they submitted — never invent work they didn't do. If the answer is thin or off-task, say so kindly and clearly.

ACTIVITY (Day ${f ? f.dayId : "?"}): ${a.title}
INSTRUCTIONS GIVEN TO THE TRAINEE:
${String(a.instructions || "(see attached file)").slice(0, 4000)}

WHAT A STRONG ANSWER INCLUDES (facilitator's private notes):
${rubric || "(none given — judge against the instructions)"}

TRAINEE: ${daTraineeName(r.tid)}
THEIR SUBMISSION:
${String(r.sub.answer || "(no written answer)").slice(0, 7000)}${r.sub.file ? `\n(They also attached a file, "${r.sub.file.name}". You can't see its contents — mention only that the trainer will look at it, don't judge it.)` : ""}

Feedback approach: growth-minded. Frame gaps as "not yet" with a concrete way to improve; never a flat "no".
Return ONLY JSON (no markdown):
{"rating":"Strong" | "On Track" | "Needs Support",
 "summary":"2-4 sentences on how they did, referring to their actual answer",
 "strengths":["1-3 specific strengths with evidence"],
 "areasToBuild":["1-3 'not yet' areas, each with how to improve"],
 "nextSteps":["1-2 concrete next steps"]}` + fbStyleBlock();
}
async function daDraft(tid, aid, quiet){
  const r = daRow(tid, aid); if(!r) return;
  const btn = document.getElementById(`dar_${daRowId(r)}_ai`); if(btn){ btn.disabled = true; btn.textContent = "✨ Drafting…"; }
  try{
    await fbEnsureStyle();
    const sc = daScoring(aid);
    let clean;
    if(sc){
      const fb = await callAIJson(daScoredPrompt(r, sc), 2200, 120000, "trainer");
      const got = Array.isArray(fb.scores) ? fb.scores : [];
      const scores = sc.criteria.map((c, i) => { const x = got.find(y => daCritName(y.criterion).toLowerCase() === c.name.toLowerCase()) || got[i] || {};
        const n = Math.round(Number(x.score)); return {criterion:c.name, score: n >= 1 && n <= 5 ? n : 1, evaluation:String(x.evaluation || "")}; });
      const t = daScoreTotals(scores);
      clean = {rating:daRatingFromScore(t.finalRating), summary:String(fb.summary || ""), scores, total:t.total, max:t.max, finalRating:t.finalRating,
        strengths:[], areasToBuild:[], nextSteps:[], status:"draft", auto:true, draftedAt:new Date().toISOString()};
    } else {
      const fb = await callAIJson(daActivityPrompt(r), 900, 90000, "trainer");
      clean = {rating:["Strong", "On Track", "Needs Support"].includes(fb.rating) ? fb.rating : "On Track", summary:String(fb.summary || ""),
        strengths:(fb.strengths || []).map(String), areasToBuild:(fb.areasToBuild || []).map(String), nextSteps:(fb.nextSteps || []).map(String),
        status:"draft", auto:true, draftedAt:new Date().toISOString()};
    }
    await daWriteFeedback(tid, aid, clean);
    if(!quiet){ toast("Draft ready — review and edit it, then send."); render(); }
  }catch(e){ if(quiet) throw e; showActionError(e, "Drafting feedback"); if(btn){ btn.disabled = false; btn.textContent = "✨ Draft with AI"; } }
}
async function daDraftAll(){
  const rows = (daState().review || []).filter(r => !r.sub.feedback);
  const btn = document.getElementById("daDraftAllBtn"); if(btn){ btn.disabled = true; btn.textContent = `✨ Drafting ${rows.length}…`; }
  const res = await runPool(rows, (r) => daDraft(r.tid, r.aid, true), 2);
  if(res.failed) showActionError(new Error(`${res.failed} of ${rows.length} failed — ${res.errors[0]}`), "Drafting feedback");
  else toast(`${res.ok} draft(s) ready — review and send each one.`);
  daState().reviewFilter = "todo"; render();
}
// Write the trainer's feedback into the trainee's actsub record without touching their answer
// (re-read first, so a resubmission that lands meanwhile isn't overwritten).
async function daWriteFeedback(tid, aid, fb){
  const doc = (await sharedGet("actsub:" + tid)) || {items:{}};
  const cur = (doc.items || {})[aid]; if(!cur) throw new Error("that submission no longer exists");
  const r = daRow(tid, aid);
  if(r && cur.submittedAt !== r.sub.submittedAt){ r.sub = cur; throw new Error("the trainee resubmitted just now — the new answer is loaded, please review it"); }
  cur.feedback = fb; if(fb.status === "sent") delete cur.readAt;
  if(!(await sharedSet("actsub:" + tid, doc))) throw new Error("couldn't save to the server");
  if(r) r.sub = cur;
}
async function daSaveFeedback(tid, aid, send){
  const r = daRow(tid, aid); if(!r) return;
  const id = daRowId(r), g = (k) => { const el = document.getElementById(`dar_${id}_${k}`); return el ? el.value : ""; };
  const lines = (k) => g(k).split("\n").map(x => x.replace(/^[-•\s]+/, "").trim()).filter(Boolean);
  const fb = Object.assign({}, r.sub.feedback || {}, {rating:g("rating"), summary:g("summary").trim(), strengths:lines("strengths"), areasToBuild:lines("areas"), nextSteps:lines("next"), editedByTrainer:true});
  const sc = daScoring(aid);
  if(sc){
    const scores = sc.criteria.map((c, i) => ({criterion:c.name, score:Number(g("s" + i)) || 0, evaluation:g("e" + i).trim()}));
    if(scores.some(x => !x.score)){ toast("Give every criterion a score from 1 to 5."); return; }
    Object.assign(fb, {scores}, daScoreTotals(scores));
  }
  if(!fb.summary && !fb.strengths.length && !fb.areasToBuild.length && !(fb.scores || []).some(x => x.evaluation)){ toast("Write at least a summary, a strength, an area to build or a criterion evaluation."); return; }
  if(send){ fb.status = "sent"; fb.sentAt = new Date().toISOString(); } else if(fb.status !== "sent") fb.status = "draft";
  try{ await daWriteFeedback(tid, aid, fb); toast(send ? "Sent — the trainee sees it under 📝 Activities." : "Draft saved."); render(); }
  catch(e){ showActionError(e, "Saving feedback"); render(); }
}
Object.assign(window, {daReviewFilter, daReviewDay, daDraft, daDraftAll, daSaveFeedback});

/* ============================================================
   FACILITATOR FEEDBACK STYLE
   ============================================================ */
let fbStyleLoadedAt = 0;
// The voice in use: the facilitator's DNA (js/ft-facilitator-dna.js) until a trainer saves a voice here
// (saved with v2: edited, learned, restored or switched off). worker.js resolves it the same way.
function fbEffective(saved){
  if(saved && saved.v2) return saved;
  const dna = window.FT_FACILITATOR_DNA;
  return dna ? {enabled:true, dna:true, guide:dna.guide, traits:dna.traits.slice(), examples:dna.examples.slice(), source:dna.source, learnedAt:dna.learnedAt} : saved;
}
async function fbEnsureStyle(force){
  if(!force && fbStyleLoadedAt && Date.now() - fbStyleLoadedAt < 10 * 60000) return state.fbStyle;
  try{ state.fbStyle = fbEffective((await sharedGet("settings:feedback-style")) || null); fbStyleLoadedAt = Date.now(); }catch(e){ /* keep the last copy */ }
  return state.fbStyle;
}
if(!state.fbStyle) state.fbStyle = fbEffective(null);
function fbStyleOn(){ const s = state.fbStyle; return !!(s && s.enabled !== false && s.guide); }
// Appended to every feedback prompt; keeps the requested output format and the judgement unchanged.
function fbStyleBlock(){
  if(!fbStyleOn()) return "";
  const s = state.fbStyle;
  return `

VOICE — write all feedback wording the way this program's facilitator writes feedback. Keep exactly the output format requested above. Ratings and scores must stay evidence-based: the voice changes how things are said, not the judgement.
Facilitator style guide:
${String(s.guide).slice(0, 3500)}${(s.examples || []).length ? `
Examples of the facilitator's voice (match tone, rhythm and phrasing; do not reuse their content):
${s.examples.slice(0, 3).map((x, i) => `(${i + 1}) ${String(x).slice(0, 900)}`).join("\n")}` : ""}`;
}
window.fbStyleBlock = fbStyleBlock;
// Every Practice Lab grading call and the daily-review prompt get the voice.
if(typeof callAITextOnce === "function"){
  const __fbCallOnce = callAITextOnce;
  window.callAITextOnce = function(prompt, maxTokens, timeoutMs, feature){
    if(feature === "grading" && String(prompt).indexOf("\nVOICE — write all feedback") < 0) prompt = String(prompt) + fbStyleBlock();
    return __fbCallOnce.call(this, prompt, maxTokens, timeoutMs, feature);
  };
}
if(typeof feedbackPrompt === "function"){
  const __fbFeedbackPrompt = feedbackPrompt;
  window.feedbackPrompt = function(){ return __fbFeedbackPrompt.apply(this, arguments) + fbStyleBlock(); };
}
setTimeout(() => { if(state.traineeId || state.isAdmin) fbEnsureStyle(); }, 2500);
// Re-read every 10 minutes while the page is in view, not in a background tab: every /api/ request counts
// toward the Cloudflare account's request allowance, shared by every LSH site.
setInterval(() => { if((state.traineeId || state.isAdmin) && document.visibilityState !== "hidden") fbEnsureStyle(true); }, 10 * 60000);

function fbSampleText(fb){
  const part = (h, arr) => (arr || []).length ? `${h}\n${arr.map(x => "- " + x).join("\n")}` : "";
  const scored = (fb.scores || []).filter(x => x.evaluation).map(x => `${x.criterion} — ${x.score}/5: ${x.evaluation}`).join("\n");
  return [fb.summary, scored, part("Strengths:", fb.strengths), part("Areas to build:", fb.areasToBuild), part("Next focus:", fb.nextDayFocus || fb.nextSteps)].filter(Boolean).join("\n").trim();
}
async function fbLoadSamples(){ const s = daState(); try{ s.fbSamples = (await sharedGet("admin:fbstyle-samples")) || {items:[]}; }catch(e){ s.fbSamples = s.fbSamples || {items:[]}; } }
function renderAdminFeedbackStyle(){
  const s = daState();
  if(!s.fbSamples){ if(!s.fbLoading){ s.fbLoading = true; Promise.all([fbLoadSamples(), fbEnsureStyle(true)]).then(() => { s.fbLoading = false; if(state.view === "admin" && state.adminTab === "fbstyle") render(); }); }
    return `<div class="card" style="padding:30px;text-align:center;color:var(--ink-soft);">Loading…</div>`; }
  const st = state.fbStyle || {}, items = s.fbSamples.items || [];
  const bySrc = (src) => items.filter(x => x.source === src).length;
  return `
    <p style="color:var(--ink-soft);font-size:13.5px;max-width:82ch;margin:0 0 14px;">Teach the AI to write feedback the way your facilitator does. It learns from real feedback — the reviews you've edited and sent in the portal, plus any examples you paste (Messenger/email/Docs feedback works well). Once learned, <b>every AI feedback</b> — the Task Tracker's daily notes review, trainer reviews, graded exercises and 📝 Activities drafts — is written in that voice. Ratings and scores are unchanged; only the wording follows the style.</p>
    <div class="card fbs-card">
      <div class="fbs-h"><b>Current voice</b>
        ${st.guide ? `<label class="da-check"><input type="checkbox" ${st.enabled !== false ? "checked" : ""} onchange="fbToggle(this.checked)"> Use this voice for all AI feedback</label>` : `<span class="pill pill-locked">Not learned yet</span>`}</div>
      ${st.dna ? `<p class="da-note">🧬 <b>The facilitator’s DNA</b>, written from ${esc(st.source || "the facilitator’s evaluations")}. Every AI reviewer uses it. Edit it and click Save edits to improve it, or learn a new voice from examples below.</p>`
        : st.guide ? `<p class="da-note">${st.learnedAt ? `Learned ${fmtDate(st.learnedAt)} from ${st.sampleCount || "?"} examples. ` : ""}You can edit the guide directly. <a style="cursor:pointer;color:var(--orange-deep);font-weight:700;" onclick="fbUseDna()">🧬 Go back to the facilitator’s DNA</a></p>` : ""}
      ${st.guide ? `
        ${(st.traits || []).length ? `<div class="fbs-traits">${st.traits.map(t => `<span class="da-chip">${esc(t)}</span>`).join("")}</div>` : ""}
        <label>Style guide<textarea id="fbs_guide" rows="8">${esc(st.guide)}</textarea></label>
        <label>Voice examples <span>(generic — no real trainee details; separate with a line of three dashes)</span><textarea id="fbs_examples" rows="8">${esc((st.examples || []).join("\n---\n"))}</textarea></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="fbSaveGuide()">Save edits</button><button class="btn btn-ghost btn-sm" onclick="fbTry()">🧪 Try it on a sample answer</button></div>
        <div id="fbsTry"></div>` : `<p class="da-note">Add examples below, then click <b>Learn the style</b>.</p>`}
    </div>
    <div class="card fbs-card">
      <div class="fbs-h"><b>Examples to learn from (${items.length})</b><span class="da-note">${bySrc("review")} from sent reviews · ${bySrc("activity")} from activity feedback · ${bySrc("pasted")} pasted · ${bySrc("document")} from documents</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <button class="btn btn-ghost btn-sm" id="fbsImportBtn" onclick="fbImport()">⤵ Import feedback you've sent in the portal</button>
        <button class="btn btn-navy btn-sm" id="fbsLearnBtn" ${items.length < 3 ? "disabled title='Add at least 3 examples'" : ""} onclick="fbLearn()">✨ Learn the style from ${items.length} example${items.length === 1 ? "" : "s"}</button>
      </div>
      <label>Paste facilitator feedback <span>(one or more messages; separate messages with a line of three dashes ---)</span><textarea id="fbs_paste" rows="6" placeholder="Hi Maria! Great job on today's inbox triage…&#10;---&#10;Hey John, solid start. Not yet on the follow-up email though…"></textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><button class="btn btn-ghost btn-sm" onclick="fbAddPasted()">+ Add pasted examples</button>
        <label class="btn btn-ghost btn-sm" style="cursor:pointer;">⬆ Upload reports: .docx / .xlsx / .txt<input type="file" accept=".docx,.xlsx,.txt,.md,.csv,text/plain" multiple style="display:none" onchange="fbUpload(this)"></label></div>
      <p class="da-note" style="margin-top:6px;">Ranking reports and review sheets (.docx / .xlsx) work well: each feedback passage in them becomes an example. Then click Learn the style.</p>
      ${items.length ? `<details style="margin-top:10px;"><summary>See all ${items.length} examples</summary>${items.map((x, i) => `<div class="fbs-sample"><span class="da-note">${esc(x.source || "")}</span><div>${esc(x.text).replace(/\n/g, "<br>")}</div><button class="btn btn-ghost btn-sm" onclick="fbRemove(${i})">Remove</button></div>`).join("")}</details>` : ""}
    </div>`;
}
window.renderAdminFeedbackStyle = renderAdminFeedbackStyle;
async function fbSaveSamples(){ const s = daState(); s.fbSamples.items = s.fbSamples.items.slice(-200); if(!(await sharedSet("admin:fbstyle-samples", s.fbSamples))) throw new Error("couldn't save to the server"); }
function fbAddTexts(texts, source){
  const s = daState(), have = new Set(s.fbSamples.items.map(x => x.text));
  let n = 0; texts.map(t => String(t || "").trim()).filter(t => t.length >= 30 && !have.has(t)).forEach(t => { s.fbSamples.items.push({text:t.slice(0, 4000), source, addedAt:new Date().toISOString()}); have.add(t); n++; });
  return n;
}
async function fbAddPasted(){
  const el = document.getElementById("fbs_paste"); const texts = (el ? el.value : "").split(/\n\s*-{3,}\s*\n/);
  const n = fbAddTexts(texts, "pasted"); if(!n){ toast("Paste at least one message (30+ characters)."); return; }
  try{ await fbSaveSamples(); toast(`Added ${n} example(s).`); render(); }catch(e){ showActionError(e, "Saving examples"); }
}
async function fbUpload(input){
  let n = 0;
  try{
    for(const f of [...(input.files || [])]){
      if(/\.docx$/i.test(f.name)) n += fbAddTexts(await fbDocxPassages(f), "document");
      else if(/\.xlsx$/i.test(f.name)) n += fbAddTexts(await fbXlsxPassages(f), "document");
      else { const t = await f.text(); n += fbAddTexts(t.split(/\n\s*-{3,}\s*\n|\n{3,}/), "pasted"); }
    }
    await fbSaveSamples(); toast(`Added ${n} example(s).`); render();
  }catch(e){ showActionError(e, "Reading the files"); }
}
// Word and Excel files are zip packages: JSZip (cdnjs) opens them; each feedback passage becomes an example.
function fbJsZip(){
  if(window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((ok, fail)=>{ const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = ()=>ok(window.JSZip); s.onerror = ()=>fail(new Error("couldn't load the file reader")); document.head.appendChild(s); });
}
const fbXml = (s)=>new DOMParser().parseFromString(s, "application/xml");
const fbWText = (el)=>[...el.getElementsByTagName("w:p")].map(p=>[...p.getElementsByTagName("w:t")].map(t=>t.textContent).join("")).join("\n").trim();
async function fbDocxPassages(file){
  const zip = await (await fbJsZip()).loadAsync(await file.arrayBuffer());
  const doc = fbXml(await zip.file("word/document.xml").async("string"));
  const cells = [...doc.getElementsByTagName("w:tc")].filter(tc=>!tc.getElementsByTagName("w:tc").length).map(fbWText);
  const loose = [...doc.getElementsByTagName("w:p")].filter(p=>!p.closest || !p.closest("tc")).map(p=>[...p.getElementsByTagName("w:t")].map(t=>t.textContent).join(""));
  return cells.concat(cells.length ? [] : loose).map(t=>t.trim()).filter(t=>t.length >= 80);
}
async function fbXlsxPassages(file){
  const zip = await (await fbJsZip()).loadAsync(await file.arrayBuffer());
  const ssf = zip.file("xl/sharedStrings.xml");
  const shared = ssf ? [...fbXml(await ssf.async("string")).getElementsByTagName("si")].map(si=>[...si.getElementsByTagName("t")].map(t=>t.textContent).join("")) : [];
  const out = [];
  for(const name of Object.keys(zip.files).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))){
    const sheet = fbXml(await zip.file(name).async("string"));
    [...sheet.getElementsByTagName("c")].forEach(c=>{
      const v = c.getElementsByTagName("v")[0], is = c.getElementsByTagName("is")[0];
      const t = c.getAttribute("t") === "s" && v ? shared[+v.textContent] : is ? is.textContent : "";
      if(t && t.trim().length >= 40) out.push(t.trim());
    });
  }
  return out;
}
async function fbUseDna(){
  if(!window.FT_FACILITATOR_DNA) return;
  const d = window.FT_FACILITATOR_DNA;
  const st = {v2:true, enabled:true, dna:true, guide:d.guide, traits:d.traits.slice(), examples:d.examples.slice(), source:d.source, learnedAt:d.learnedAt, savedAt:new Date().toISOString()};
  if(await sharedSet("settings:feedback-style", st)){ state.fbStyle = st; toast("🧬 Every AI reviewer uses the facilitator’s DNA again."); render(); } else toast("Couldn't save — check your connection.");
}
window.fbUseDna = fbUseDna;
async function fbRemove(i){ const s = daState(); s.fbSamples.items.splice(i, 1); try{ await fbSaveSamples(); render(); }catch(e){ showActionError(e, "Removing"); } }
// Pull in the feedback the trainer has actually written or edited: daily reviews and activity reviews.
async function fbImport(){
  const btn = document.getElementById("fbsImportBtn"); if(btn){ btn.disabled = true; btn.textContent = "Importing…"; }
  try{
    const texts = {review:[], activity:[]};
    const fk = (await sharedList("feedback:")).filter(k => /^feedback:.+/.test(k));
    await runPool(fk, async (k) => { const doc = await sharedGet(k); Object.values((doc && doc.days) || {}).forEach(fb => { if(fb && (fb.editedByTrainer || (fb.status === "sent" && !fb.auto))) texts.review.push(fbSampleText(fb)); }); }, 4);
    const ak = (await sharedList("actsub:")).filter(k => /^actsub:.+/.test(k));
    await runPool(ak, async (k) => { const doc = await sharedGet(k); Object.values((doc && doc.items) || {}).forEach(it => [it && it.feedback, it && it.prevFeedback].forEach(fb => { if(fb && fb.editedByTrainer) texts.activity.push(fbSampleText(fb)); })); }, 4);
    const n = fbAddTexts(texts.review, "review") + fbAddTexts(texts.activity, "activity");
    await fbSaveSamples();
    toast(n ? `Imported ${n} piece(s) of feedback you wrote or edited.` : "No new trainer-written feedback found yet — edit and send a few reviews first, or paste examples.");
    render();
  }catch(e){ showActionError(e, "Importing feedback"); if(btn){ btn.disabled = false; btn.textContent = "⤵ Import feedback you've sent in the portal"; } }
}
async function fbLearn(){
  const s = daState(), items = s.fbSamples.items; if(items.length < 3) return;
  const btn = document.getElementById("fbsLearnBtn"); if(btn){ btn.disabled = true; btn.textContent = "✨ Learning…"; }
  // Newest examples first, capped so the prompt stays a sensible size.
  const pick = items.slice().reverse().reduce((acc, x) => { if(acc.len < 24000){ acc.list.push(x.text); acc.len += x.text.length; } return acc; }, {list:[], len:0}).list;
  const prompt = `Below are real feedback messages one training facilitator wrote to trainees. Study HOW this person writes feedback — tone, structure and wording — not what the trainees did.

Return ONLY JSON (no markdown):
{"guide":"A style guide of 150-250 words written as instructions to another writer (e.g. 'Open with…', 'When pointing out a gap…'). Cover: overall tone and warmth; how they open and close; how they praise (how specific); how they raise problems; sentence length, formality and person (you/we); signature words or short phrases they reuse (quote 3-6); use of the trainee's name, emojis, exclamation marks, bullets or headings; typical length.",
 "traits":["5-8 very short traits, e.g. 'Opens with the trainee's name'"],
 "examples":["3 short feedback passages (70-130 words each) written in this facilitator's voice about GENERIC situations — no real names, companies, clients or details taken from the samples"]}

SAMPLES (${pick.length}):
${pick.map((t, i) => `--- ${i + 1} ---\n${t}`).join("\n")}`;
  try{
    const out = await callAIJson(prompt, 1800, 120000, "trainer");
    if(!out || !out.guide) throw new Error("the AI didn't return a style guide — try again");
    const style = {v2:true, enabled:true, guide:String(out.guide).trim(), traits:(out.traits || []).map(String).slice(0, 8), examples:(out.examples || []).map(String).slice(0, 3), sampleCount:pick.length, learnedAt:new Date().toISOString()};
    if(!(await sharedSet("settings:feedback-style", style))) throw new Error("couldn't save to the server");
    state.fbStyle = style; fbStyleLoadedAt = Date.now();
    toast("🗣 Style learned — all AI feedback now uses this voice."); render();
  }catch(e){ showActionError(e, "Learning the style"); if(btn){ btn.disabled = false; btn.textContent = "✨ Learn the style"; } }
}
async function fbToggle(on){
  const st = Object.assign({}, state.fbStyle || {}, {enabled:!!on, v2:true});
  if(await sharedSet("settings:feedback-style", st)){ state.fbStyle = st; toast(on ? "AI feedback now uses the facilitator's voice." : "Voice switched off — AI feedback uses the default wording."); }
  else toast("Couldn't save — check your connection.");
}
async function fbSaveGuide(){
  const g = (document.getElementById("fbs_guide") || {}).value || "", ex = (document.getElementById("fbs_examples") || {}).value || "";
  if(!g.trim()){ toast("The style guide can't be empty."); return; }
  const st = Object.assign({}, state.fbStyle || {}, {v2:true, guide:g.trim(), examples:ex.split(/\n\s*-{3,}\s*\n/).map(x => x.trim()).filter(Boolean).slice(0, 3), editedAt:new Date().toISOString()});
  if(await sharedSet("settings:feedback-style", st)){ state.fbStyle = st; toast("Saved."); } else toast("Couldn't save — check your connection.");
}
async function fbTry(){
  const box = document.getElementById("fbsTry"); if(!box) return;
  box.innerHTML = `<p class="da-note">Writing a sample review…</p>`;
  const prompt = `You are a facilitator reviewing a trainee's short answer to: "Write a two-line reply to a client who asks when their documents will be ready."
Trainee's answer: "Hi, the documents are being worked on and will be ready soon. Thanks."
Return ONLY JSON: {"summary":"2-3 sentences","strengths":["1-2"],"areasToBuild":["1-2 with how to improve"]}` + fbStyleBlock();
  try{
    const fb = await callAIJson(prompt, 600, 60000, "trainer");
    box.innerHTML = daFeedbackCard({summary:fb.summary, strengths:fb.strengths, areasToBuild:fb.areasToBuild}, "Sample: how feedback now sounds");
  }catch(e){ box.innerHTML = ""; showActionError(e, "Trying the style"); }
}
Object.assign(window, {fbAddPasted, fbUpload, fbRemove, fbImport, fbLearn, fbToggle, fbSaveGuide, fbTry});

(function(){
  const css = `
.admin-tabs{flex-wrap:wrap;row-gap:4px;} .admin-tab-btn{white-space:nowrap;flex:0 0 auto;}
.da-day{margin-bottom:22px;} .da-day-h{color:var(--navy);font-size:16px;margin:0 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.da-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
.da-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;padding:16px 18px;cursor:pointer;font:inherit;border:1px solid var(--line);}
.da-card:hover:not([disabled]){border-color:var(--orange);} .da-card.locked{opacity:.6;cursor:not-allowed;}
.da-card-t{font-weight:800;color:var(--navy);font-size:15px;} .da-card-m{font-size:12.5px;color:var(--ink-soft);}
.da-body{padding:18px 22px;margin-bottom:14px;font-size:14.5px;line-height:1.6;} .da-body p{margin:0 0 10px;} .da-body ul{margin:0 0 10px;padding-left:22px;}
.da-files{display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);}
.da-answer{padding:18px 22px;margin-bottom:14px;} .da-textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:12px;border:1px solid var(--line);border-radius:10px;min-height:200px;}
.da-upload{margin-top:12px;font-size:14px;} .da-note{font-size:12.5px;color:var(--ink-soft);}
.da-fb{padding:16px 20px;margin-bottom:14px;border-left:4px solid var(--orange);} .da-fb p{margin:6px 0 8px;font-size:14.5px;}
.da-score{width:100%;border-collapse:collapse;margin:8px 0;font-size:13.5px;} .da-score th,.da-score td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top;}
.da-score th{background:#F4F6FB;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);} .da-score td:first-child{width:28%;} .da-score-n{white-space:nowrap;font-weight:800;color:var(--navy);width:70px;}
.da-score textarea{width:100%;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;} .da-score select{font:inherit;padding:3px 6px;}
.da-score-tot{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;margin:6px 0 10px;} .da-score-tot b{color:var(--navy);}
.da-score-edit{margin-bottom:12px;} .da-desc{font-weight:500;font-size:12px;color:var(--ink-soft);margin-top:4px;} .da-desc summary{cursor:pointer;} .da-desc div{margin:3px 0;}
.da-scoring{margin:6px 0 12px;padding:10px 12px;border:1px dashed var(--line);border-radius:10px;} .da-scoring summary{cursor:pointer;}
.da-crit{margin:4px 0 0 18px;padding:0;font-size:13px;} .da-crit li{margin:2px 0;}
.da-fb-h{display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:800;color:var(--navy);} .da-fb-l{font-size:14px;} .da-fb-l ul{margin:4px 0 8px;padding-left:22px;}
.da-prev{margin-bottom:14px;} .da-prev summary{cursor:pointer;font-weight:700;color:var(--navy);margin-bottom:8px;}
.da-subtabs,.da-review-bar,.da-daychips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}
.da-subtabs button,.da-review-bar > button:not(.btn),.da-daychips button{font:inherit;font-size:13px;font-weight:700;border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:999px;padding:6px 14px;cursor:pointer;}
.da-subtabs button.active,.da-review-bar > button.active,.da-daychips button.active{background:var(--navy);color:#fff;border-color:var(--navy);}
.da-daychips b{background:var(--orange);color:#fff;border-radius:999px;padding:0 6px;font-size:11px;margin-left:3px;}
.da-review-bar select{font:inherit;font-size:13px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);}
.da-list{margin-top:10px;display:flex;flex-direction:column;gap:6px;} .da-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--line);border-radius:10px;}
.da-row-t{font-weight:700;flex:1 1 220px;} .da-row-m{font-size:12.5px;color:var(--ink-soft);} .da-row-b{display:flex;gap:4px;}
.da-form,.fbs-card{padding:18px 20px;margin-bottom:14px;} .da-form label,.fbs-card label,.da-rev-f label{display:block;font-weight:700;font-size:13px;color:var(--navy);margin:0 0 10px;}
.da-form label span,.fbs-card label span,.da-rev-f label span{font-weight:500;color:var(--ink-soft);}
.da-form input[type=text],.da-form textarea,.fbs-card textarea,.da-rev-f textarea,.da-rev-f select{display:block;width:100%;box-sizing:border-box;margin-top:4px;font:inherit;font-size:13.5px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;}
.da-form-row{margin:0 0 12px;font-size:13px;} .da-check{display:inline-flex !important;gap:6px;align-items:center;font-weight:600 !important;margin:4px 14px 0 0 !important;}
.da-chip{display:inline-flex;gap:6px;align-items:center;background:#F3F5FB;border-radius:999px;padding:3px 10px;font-size:12.5px;margin:4px 6px 4px 0;} .da-chip button{border:0;background:none;cursor:pointer;color:var(--ink-soft);}
.da-rev{padding:16px 18px;margin-bottom:12px;} .da-rev-h{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px;}
.da-rev summary{cursor:pointer;font-weight:700;color:var(--navy);font-size:13px;} .da-rev-a{background:#F8F9FC;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:14px;max-height:320px;overflow:auto;}
.da-rev-f{margin-top:10px;} .da-rev-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;} @media(max-width:900px){.da-rev-3{grid-template-columns:1fr;}}
.fbs-h{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px;color:var(--navy);} .fbs-traits{margin:0 0 10px;}
.fbs-sample{border-top:1px solid var(--line);padding:8px 0;font-size:13px;display:grid;gap:4px;}`;
  const el = document.createElement("style"); el.id = "da-css"; el.textContent = css; document.head.appendChild(el);
})();

// Trainee start-up: restore unsent drafts and fetch activities, so the tab's badge shows new feedback.
setTimeout(async () => {
  if(!state.traineeId || state.isAdmin) return;
  try{ const d = await storeGet("activity-drafts"); state.daDrafts = (d && typeof d === "object") ? d : {}; }catch(e){ state.daDrafts = {}; }
  await daLoad();
  if(daUnreadCount() && !(typeof isTyping === "function" && isTyping()) && !document.querySelector(".overlay") && state.view !== "day") render();
}, 3000);

/* ---------------- wiring into the engine (like ft-tracker.js / ft-simulators.js) ---------------- */
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["activities"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {activities:"Activities"});
const __daRender = window.render;
window.render = function(){
  if(state.view !== "activities") return __daRender.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __daRender.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main><div id="navBackSlot"></div>${renderActivitiesPage()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
const __daTopbar = window.renderTopbar;
window.renderTopbar = function(){
  const html = __daTopbar.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin) return html;
  const n = daUnreadCount();
  const btn = `<button class="${state.view === "activities" ? "active" : ""}" onclick="goto('activities')">📝 Activities${n ? `<span class="nav-badge nav-badge-act">${n}</span>` : ""}</button>`;
  // right after 🛠 Simulators (or Dashboard)
  if(/onclick="goto\('simulators'\)"/.test(html)) return html.replace(/(<button[^>]*onclick="goto\('simulators'\)"[^>]*>.*?<\/button>)/, "$1" + btn);
  return html.replace(/(<button[^>]*onclick="goto\('dashboard'\)"[^>]*>[^<]*<\/button>)/, "$1" + btn);
};
const __daAdmin = window.renderAdmin;
window.renderAdmin = function(){
  const tabs = `<button class="admin-tab-btn ${state.adminTab === "activities" ? "active" : ""}" onclick="setAdminTab('activities')">📝 Activities</button>`
    + `<button class="admin-tab-btn ${state.adminTab === "fbstyle" ? "active" : ""}" onclick="setAdminTab('fbstyle')">🗣 Feedback Style</button>`;
  const mine = state.adminTab === "activities" || state.adminTab === "fbstyle";
  if(mine && state.isAdmin){
    const keep = state.adminTab;
    state.adminTab = "opendays";                      // borrow the tab bar…
    const out = __daAdmin.apply(this, arguments);
    state.adminTab = keep;
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tabs + "</div>";
    return bar + (keep === "activities" ? renderAdminActivities() : renderAdminFeedbackStyle());
  }
  const out = __daAdmin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tabs + out.slice(end) : out;
};
