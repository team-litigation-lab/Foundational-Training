/* ============================================================
   📚 Resource Library — LOR Drafting Activity (#/lor)
   Loaded after js/ft-lor-data.js (the case notes and the two templates) and after js/ft-sessions.js.
   A section of 🛠 Practice Lab, and the activity that replaced the Claims Specialist Practice Session.

   A STANDALONE activity. The trainee drafts the two letters here, on the page, and downloads them to
   upload into the Smart Advocate demo by hand. Nothing here opens or touches the CMS: the page says so
   in as many words, and no card, link or session points at a case file — see NO_CASE_FILE below.

     • The trainer assigns one case per trainee (Assign cases, admins only) out of the 18 in
       "Case Notes For Drafting Activity (SA Demo)". Until they do, the trainee sees what to ask for.
     • The trainee reads their case notes on the page and can download them as a PDF.
     • Two editors, one per activity, showing the firm's templates exactly as they are. What the firm
       highlighted in yellow is what the trainee fills in; everything else is fixed text they can't edit:
         – the letter's date is auto-generated and always the current date, as a CMS template editor does
         – "SENT VIA FACSIMILE AND E-MAIL" is typed by hand (it is the one highlighted line that is not
           a placeholder: the trainee edits the wording to match how the letter actually goes out)
         – the 1P letter's three tick boxes work; for this activity every type of claim is ticked
       Answers save as the trainee types.
     • ⬇ Download gives the edited letter as a PDF or a Word file, named by the trainers' convention
       (INS – 1P Insurance Provider - LOR mm.dd.yyyy (VA's name)), ready to upload into the SA demo.

   Shared storage keys (rules in worker.js):
     lor:<traineeId>        the trainee's own drafts (they read and write their own)
     lorassign:<traineeId>  the case their trainer assigned (the trainee reads it, only admins write it)
   ============================================================ */
(function(){
"use strict";
if(!window.FT_LOR_CASES || !window.FT_LOR_TEMPLATES) return;

const CASES = window.FT_LOR_CASES, TEMPLATES = window.FT_LOR_TEMPLATES;
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview;
// Said on the page itself, not only here: this activity never becomes a case file in the CMS.
const NO_CASE_FILE = "Do <b>not</b> create a case file in the CMS for this activity, and do not link it to any case file. This is a standalone drafting exercise: you draft the two letters here, download them, and upload them into the Smart Advocate demo yourself.";

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["lor"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {lor:"LOR Drafting Activity"});

/* ---------- the trainee's drafts and the case their trainer assigned ---------- */
const L = {id:null, draft:null, assign:null, loading:false, err:"", timer:null, saving:false, savedAt:null, tab:TEMPLATES[0].id};
const blank = () => ({v:1, letters:{}, updatedAt:""});
function letter(tid){ const ls = L.draft.letters; return ls[tid] || (ls[tid] = {fields:{}, checks:{}, updatedAt:""}); }

async function load(id){
  L.loading = true; L.err = ""; L.id = id;
  try{
    const [d, a] = await Promise.all([sharedGet("lor:" + id), sharedGet("lorassign:" + id)]);
    L.draft = (d && typeof d === "object") ? d : blank();
    if(!L.draft.letters) L.draft.letters = {};
    L.assign = (a && typeof a === "object") ? a : null;
  }catch(err){ L.err = "Couldn’t load your drafting activity. Check your connection and try again."; }
  L.loading = false;
  if(state.view === "lor" || state.view === "simulators") render();
}
function paintSave(ok){
  const el = document.getElementById("lorSave");
  if(el) el.textContent = L.saving ? "Saving…" : (ok === false ? "⚠ Not saved. Check your connection." : (L.savedAt ? "All changes saved" : ""));
}
function queueSave(){
  if(!state.traineeId) return;   // 👁 Trainee view: a preview with no trainee to save to
  L.draft.updatedAt = new Date().toISOString();
  clearTimeout(L.timer); L.saving = true; paintSave();
  L.timer = setTimeout(async () => {
    const ok = await sharedSet("lor:" + L.id, L.draft);
    L.saving = false; L.savedAt = ok === false ? null : new Date(); paintSave(ok);
  }, 900);
}

/* ---------- the assigned case ---------- */
// The case number a trainer assigned, 1-based as the trainers count them; null when they haven't yet.
function myCaseNo(){
  if(adminOn()) return Number(state.lorPreviewCase) || 1;    // an admin reading the page sees case 1
  const n = L.assign && Number(L.assign.case);
  return n >= 1 && n <= CASES.length ? n : null;
}
const caseOf = no => (no ? CASES[no - 1] : null) || null;
const caseName = no => { const c = caseOf(no); return c ? `Case ${no} · ${c.p1["Client’s Name"] || "—"} · ${c.p1["Date of Loss"] || ""}` : `Case ${no}`; };
// The template's own order for the notes, so the page reads like the file the trainers sent.
const P1_KEYS = ["Client’s Name", "Date of Loss", "Insurance Company Name", "Policy Number", "Claim Number", "Adjuster Name and Address", "Email"];
const P3_KEYS = ["Client’s Name", "Date of Loss", "Defendant Insurance Company Name", "Policy Number", "Claim Number", "Adjuster Name and Address", "Fax Number", "Defendant Insured Name", "Defendant Driver’s Name"];
const keysOf = side => side === "p1" ? P1_KEYS : P3_KEYS;
function noteRows(c, side){
  const set = c[side] || {}, known = keysOf(side);
  return known.filter(k => set[k]).map(k => [k, set[k]])
    .concat(Object.keys(set).filter(k => known.indexOf(k) < 0).map(k => [k, set[k]]));
}

/* ---------- the letter's date: auto-generated, always today ---------- */
const letterDate = () => new Date().toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric"});
const fileDate = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${p(d.getMonth() + 1)}.${p(d.getDate())}.${d.getFullYear()}`; };
// The trainers' naming convention, with this case's carrier, today's date and the VA's name filled in.
function fileNameFor(tpl, no){
  const c = caseOf(no) || {p1:{}, p3:{}};
  const who = String(state.certName || state.traineeName || "VA’s name").replace(/[\\/:*?"<>|]/g, "").trim();
  const ins = tpl.id === "lor1p" ? (c.p1["Insurance Company Name"] || "1P Insurance Provider")
                                 : (c.p3["Defendant Insurance Company Name"] || "3P Insurance Provider");
  const what = tpl.id === "lor1p" ? "LOR" : "LOR with Affidavit";
  return `INS – ${ins} - ${what} ${fileDate()} (${who})`;
}

/* ---------- the letter, as the firm wrote it ---------- */
// A run of fixed text: the firm's own wording, never editable. Tabs and line breaks are kept.
function fixed(run, ctx){
  let html = "";
  String(run.x).split(/(\t|\n|☐)/).forEach(part => {
    if(part === "\t") html += `<span class="lorl-tab"></span>`;
    else if(part === "\n") html += "<br>";
    else if(part === "☐") html += box(ctx);
    else if(part) html += e(part);
  });
  return run.b ? `<b>${html}</b>` : html;
}
// A tick box. They work: the trainee ticks them, and the tick goes into the download.
function box(ctx){
  const id = "cb" + (ctx.box++), on = !!ctx.L.checks[id];
  return `<button type="button" role="checkbox" aria-checked="${on}" class="lorl-box${on ? " on" : ""}" title="Tick this claim"
    onclick="FTLor.tick('${ctx.tpl.id}','${id}')">${on ? "☒" : "☐"}</button>`;
}
// A field the firm highlighted in yellow: what the trainee fills in from their case notes.
function field(run, ctx){
  const v = ctx.L.fields[run.f];
  const set = v != null && String(v).trim() !== "";
  const arg = `'${ctx.tpl.id}','${run.f}'`;
  if(run.k === "date")
    return `<span class="lorl-auto" title="Auto-generated: the letter is dated the day it is drafted">${e(letterDate())}</span>`;
  if(run.k === "manual")
    // "SENT VIA FACSIMILE AND E-MAIL": edited by hand, so it carries the template's own wording to start with.
    return `<input class="lorl-in lorl-manual" value="${e(v != null ? v : run.ph)}" size="${Math.max(18, run.ph.length)}"
      aria-label="Sent via" oninput="FTLor.set(${arg}, this.value)">`;
  if(run.k === "long")
    return `<textarea class="lorl-ta${set ? " set" : ""}" rows="5" placeholder="${e(run.ph)}" aria-label="Highlighted paragraph to review"
      oninput="FTLor.set(${arg}, this.value); FTLor.grow(this)">${e(v || "")}</textarea>`;
  return `<input class="lorl-in${set ? " set" : ""}" value="${e(v || "")}" placeholder="${e(run.ph)}"
    size="${Math.max(12, Math.min(64, run.ph.length))}" aria-label="${e(run.ph)}" oninput="FTLor.set(${arg}, this.value)">`;
}
function renderLetter(tpl){
  const ctx = {tpl, L: letter(tpl.id), box: 0};
  return `<div class="lorl">` + tpl.blocks.map(b => {
    if(b.t === "tbl")
      return `<table class="lorl-tbl"><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const inner = b.runs.map(r => r.f ? field(r, ctx) : fixed(r, ctx)).join("");
    const cls = "lorl-p" + (b.n ? " lorl-num" : "") + (b.c ? " lorl-mid" : "");
    return `<p class="${cls}">${inner || "&nbsp;"}</p>`;
  }).join("") + `</div>`;
}

/* ---------- the letter as plain text (what the PDF and the Word file are made from) ---------- */
function letterLines(tpl){
  const d = letter(tpl.id); let n = 0, item = 0;
  return tpl.blocks.map(b => {
    if(b.t === "tbl") return b.rows.map(r => r.filter(Boolean).join("  ")).join("\n");
    let s = "";
    b.runs.forEach(r => {
      if(r.f){
        if(r.k === "date") s += letterDate();
        else if(r.k === "manual") s += (d.fields[r.f] != null ? d.fields[r.f] : r.ph);
        else s += (d.fields[r.f] || r.ph);
        return;
      }
      s += String(r.x).replace(/☐/g, () => (d.checks["cb" + (n++)] ? "[X]" : "[  ]"));
    });
    if(b.n) s = (++item) + ". " + s;
    else item = 0;
    return s.replace(/\t/g, "    ").replace(/ /g, " ");
  });
}

/* ---------- the page ---------- */
function notice(){
  return `<div class="lor-warn" role="note"><span class="lor-warn-ic">⚠</span><div><b class="lor-warn-h">Standalone activity — no CMS case file.</b><p>${NO_CASE_FILE}</p></div></div>`;
}
function objective(){
  return `<div class="card lor-obj"><b>Objective</b><p>The purpose of this activity is to draft a Letter of Representation for both 1P and 3P. Your letter should be accurate, professional, and follow the proper format. Attention to detail is critical for this task, as it reflects your ability to communicate legal matters clearly and effectively.</p></div>`;
}
function caseCard(no){
  const c = caseOf(no);
  if(!c) return `<div class="card lor-wait"><b>Your trainer hasn’t assigned your case yet.</b><p>The cases are handed out one per trainee. Ask your trainer to assign yours; your case notes and both letters open here as soon as they do.</p></div>`;
  const side = (ttl, key) => `<div class="lor-notes"><div class="lor-notes-h">${ttl}</div><dl>${noteRows(c, key).map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join("")}</dl></div>`;
  return `<section class="card lor-case"><div class="lor-case-h"><div><p class="lor-eyebrow">Your assigned case</p><h2>${e(caseName(no))}</h2></div>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTLor.casePdf()">⬇ Download my case notes (PDF)</button></div>
    <p class="lor-muted">Draft both letters from these notes. Replace every placeholder with the right detail, drop the brackets, and keep the capitalisation the placeholder uses.</p>
    <div class="lor-notes-grid">${side("For 1P LOR Drafting", "p1")}${side("For 3P LOR Drafting", "p3")}</div></section>`;
}
function steps(tpl){
  const common = [
    "Replace every placeholder with the right detail from your case notes, and remove the brackets.",
    "Review each highlighted item: not all of them need changing, but each one has to be checked against your notes.",
    "Attention line: write <b>Attention: Claims Department</b> when no adjuster is assigned; otherwise use the adjuster’s name.",
    "The date is filled in for you and is always today — the day you draft the letter.",
    "Check spelling, grammar, punctuation and the recipient’s address block. The body of the letter is the firm’s and is not yours to reformat."];
  const ticks = "For this activity, tick <b>all</b> types of claims. (In real cases, which claims you open depends on the client’s available coverage.)";
  const list = tpl.id === "lor1p" ? common.slice(0, 3).concat(ticks, common.slice(3)) : common;
  return `<details class="card lor-steps"><summary>📋 Instructions for this activity</summary><ol>${list.map(x => `<li>${x}</li>`).join("")}</ol>
    <p class="lor-muted">Save it as <code>${e(tpl.naming)}</code> in your assigned Assessment/Activities folder.</p></details>`;
}
function editor(no){
  const tabs = TEMPLATES.map(t => `<button type="button" class="${L.tab === t.id ? "on" : ""}" onclick="FTLor.tab('${t.id}')">${e(t.title.split(":")[0])}</button>`).join("");
  const tpl = TEMPLATES.find(t => t.id === L.tab) || TEMPLATES[0];
  return `<section class="lor-ed"><div class="lsh-subtabs lor-tabs" role="tablist">${tabs}</div>
    <h2 class="lor-ed-h">${e(tpl.title)}</h2>
    ${steps(tpl)}
    <div class="card lor-paper">${renderLetter(tpl)}</div>
    <div class="lor-actions">
      <button class="btn btn-navy" type="button" onclick="FTLor.pdf('${tpl.id}')">⬇ Download the letter (PDF)</button>
      <button class="btn btn-ghost" type="button" onclick="FTLor.word('${tpl.id}')">⬇ Download as Word</button>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTLor.copyName('${tpl.id}')">📋 Copy the file name</button>
      <span class="lor-save" id="lorSave"></span></div>
    <p class="lor-muted lor-naming">Upload the file you download into the Smart Advocate demo yourself. File name: <code>${e(fileNameFor(tpl, no))}</code></p></section>`;
}
function renderPage(){
  if(!state.traineeId && !state.isAdmin && !state.adminPreview) return `<div class="card" style="padding:28px;">Sign in to open the LOR Drafting Activity.</div>`;
  if(adminOn()) return renderAdmin();
  if(L.id !== state.traineeId && !L.loading) load(state.traineeId);
  if(L.err) return `<div class="card" style="padding:28px;">${e(L.err)} <button class="btn btn-ghost btn-sm" onclick="FTLor.reload()">Try again</button></div>`;
  if(!L.draft) return `<div class="card" style="padding:28px;">Loading your drafting activity…</div>`;
  const no = myCaseNo();
  const preview = (state.adminPreview && !state.traineeId)
    ? `<div class="card lor-preview-note">👁 <b>Trainee view</b> — this is the page as a trainee sees it. Nothing you type here is saved; a trainee drafts on their own account.</div>` : "";
  return `${preview}<div class="lor-hero"><p class="lor-eyebrow">📚 Resource Library</p><h1>LOR Drafting Activity</h1>
      <p>Draft a Letter of Representation for both the 1P and the 3P carrier, from the case your trainer assigned you.</p></div>
    ${notice()}${objective()}${caseCard(no)}${no ? editor(no) : ""}`;
}

/* ---------- the trainer: who gets which case ---------- */
const A = {rows:null, loading:false, open:{}};
async function loadAdmin(){
  A.loading = true;
  try{
    const keys = (await sharedList("trainee:")) || [];
    const ids = keys.map(k => String(k).replace(/^trainee:/, ""));
    const people = await (window.ftGetMany ? ftGetMany(ids.map(id => "trainee:" + id)) : sharedGetMany(ids.map(id => "trainee:" + id)));
    const rows = ids.map((id, i) => ({id, rec: people[i] || {}})).filter(x => x.rec && !x.rec.archived && x.rec.approved)
      .map(x => ({id:x.id, name:x.rec.name || x.id, batch:x.rec.batch || ""}));
    const assigns = await (window.ftGetMany ? ftGetMany(rows.map(x => "lorassign:" + x.id)) : sharedGetMany(rows.map(x => "lorassign:" + x.id)));
    rows.forEach((x, i) => { x.a = assigns[i] || null; });
    A.rows = rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }catch(err){ A.rows = []; }
  A.loading = false;
  if(state.view === "lor") render();
}
function renderAdmin(){
  if(!A.rows && !A.loading) loadAdmin();
  const opts = no => CASES.map((c, i) => `<option value="${i + 1}"${no === i + 1 ? " selected" : ""}>${e(caseName(i + 1))}</option>`).join("");
  const groups = {}; (A.rows || []).forEach(x => { (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a, b) => (a === "") - (b === "") || b.localeCompare(a, undefined, {numeric:true}));
  return `<div class="lor-hero"><p class="lor-eyebrow">📚 Resource Library</p><h1>LOR Drafting Activity</h1>
      <p>Hand each trainee one of the ${CASES.length} cases. They draft both letters on this page and download them to upload into the Smart Advocate demo themselves.</p></div>
    ${notice()}
    <section class="card lor-assign"><h2>🧑‍🏫 Assign cases</h2>
      <p class="lor-muted">One case per trainee. A trainee sees their case notes and both templates as soon as you assign one; changing it keeps whatever they have already drafted.</p>
      ${!A.rows ? `<p class="lor-muted">Loading the trainees…</p>` : !A.rows.length ? `<p class="lor-muted">No approved trainee yet.</p>`
        : keys.map(b => `<div class="lor-batch"><b>📁 ${e(b ? "Batch " + b : "No batch set")}</b>
          ${groups[b].map(x => `<div class="lor-arow"><span class="lor-aname">${e(x.name)}</span>
            <select aria-label="Case for ${e(x.name)}" onchange="FTLor.assign('${e(x.id)}', this.value, this)"><option value="">— not assigned —</option>${opts(x.a && Number(x.a.case))}</select>
            <span class="lor-astate">${x.a && x.a.case ? `assigned${x.a.at ? " " + e(new Date(x.a.at).toLocaleDateString()) : ""}` : ""}</span></div>`).join("")}</div>`).join("")}
      <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" type="button" onclick="FTLor.refreshAdmin()">Refresh</button></div></section>
    <section class="card lor-preview"><h2>👁 The activity as a trainee sees it</h2>
      <p class="lor-muted">Pick a case to read its notes and both letters.</p>
      <select aria-label="Preview a case" onchange="FTLor.preview(this.value)">${opts(myCaseNo())}</select>
      ${caseCard(myCaseNo())}</section>`;
}

/* ---------- downloads ---------- */
// The built-in PDF fonts are Windows-1252: keep the words, drop what they can't draw.
const pdfSafe = s => String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, "-").replace(/☐/g, "[  ]").replace(/☒|☑/g, "[X]")
  .replace(/[^\x00-\xff]/g, "").replace(/ {2,}/g, m => m);
async function makePdf(name, lines){
  if(typeof ensureJsPdf !== "function" || !(await ensureJsPdf())){ toast("Couldn’t load the PDF maker. Check your connection and try again."); return; }
  const {jsPDF} = window.jspdf, doc = new jsPDF({unit:"pt", format:"letter"});
  const M = 64, W = doc.internal.pageSize.getWidth() - M * 2, BOT = doc.internal.pageSize.getHeight() - M;
  let y = M;
  doc.setFont("times", "normal").setFontSize(11);
  lines.forEach(line => {
    const txt = pdfSafe(line);
    if(!txt.trim()){ y += 11; return; }
    doc.splitTextToSize(txt, W).forEach(row => {
      if(y > BOT){ doc.addPage(); y = M; }
      doc.text(row, M, y); y += 14;
    });
    y += 4;
  });
  doc.save(name.replace(/[\\/:*?"<>|]/g, "") + ".pdf");
}
// A Word file the trainee can keep editing: an HTML document Word opens as its own.
function makeWord(name, lines){
  const body = lines.map(l => l.trim() ? `<p>${e(l).replace(/ {2,}/g, m => "&nbsp;".repeat(m.length))}</p>` : "<p>&nbsp;</p>").join("");
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${e(name)}</title>
    <style>@page{margin:1in;} body{font-family:'Times New Roman',serif;font-size:11pt;} p{margin:0 0 6pt;}</style></head><body>${body}</body></html>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + html], {type:"application/msword"}));
  a.download = name.replace(/[\\/:*?"<>|]/g, "") + ".doc";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

window.FTLor = {
  reload(){ L.id = null; L.draft = null; L.err = ""; render(); },
  refreshAdmin(){ A.rows = null; render(); },
  tab(id){ L.tab = id; render(); window.scrollTo(0, 0); },
  preview(v){ state.lorPreviewCase = Number(v) || 1; render(); },
  grow(el){ el.style.height = "auto"; el.style.height = Math.min(520, el.scrollHeight + 2) + "px"; },
  set(tid, f, v){ letter(tid).fields[f] = v; letter(tid).updatedAt = new Date().toISOString(); queueSave(); },
  tick(tid, id){ const d = letter(tid); d.checks[id] = !d.checks[id]; queueSave(); render(); },
  copyName(tid){
    const tpl = TEMPLATES.find(t => t.id === tid);
    const name = fileNameFor(tpl, myCaseNo());
    (navigator.clipboard ? navigator.clipboard.writeText(name) : Promise.reject())
      .then(() => toast("Copied the file name."), () => toast("Couldn’t copy. Select the name instead."));
  },
  async pdf(tid){
    const tpl = TEMPLATES.find(t => t.id === tid);
    await makePdf(fileNameFor(tpl, myCaseNo()), letterLines(tpl));
  },
  word(tid){
    const tpl = TEMPLATES.find(t => t.id === tid);
    makeWord(fileNameFor(tpl, myCaseNo()), letterLines(tpl));
  },
  async casePdf(){
    const no = myCaseNo(), c = caseOf(no);
    if(!c) return;
    const lines = [`Case Notes For Drafting Activity (SA Demo)`, caseName(no), "", "For 1P LOR Drafting", "Case Notes:"]
      .concat(noteRows(c, "p1").map(([k, v]) => `  • ${k}: ${v}`), ["", "For 3P LOR Drafting", "Case Notes:"],
              noteRows(c, "p3").map(([k, v]) => `  • ${k}: ${v}`),
              ["", "This is a standalone drafting activity. Do not create a case file in the CMS for it."]);
    await makePdf(`Case Notes - ${caseName(no)}`, lines);
  },
  async assign(id, v, el){
    const no = Number(v) || 0;
    el.disabled = true;
    try{
      const rec = no ? {case:no, at:new Date().toISOString(), by:"trainer"} : {case:null, at:new Date().toISOString(), by:"trainer"};
      if(await sharedSet("lorassign:" + id, rec) === false) throw new Error("save");
      const row = (A.rows || []).find(x => x.id === id); if(row) row.a = rec;
      toast(no ? "✓ Case assigned." : "Case cleared.");
    }catch(err){ toast("Couldn’t save the assignment. Check your connection."); }
    el.disabled = false; render();
  }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view !== "lor") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-lor">${renderPage()}</main>` + renderFooter();
  paintSave();
  try{ afterRender(); }catch(err){}
  document.querySelectorAll(".lorl-ta").forEach(FTLor.grow);
};
// 📚 Resource Library in the Practice Lab, where the Claims Specialist session used to be.
window.ftLorCard = function(){
  const open = state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(7) : true);
  // Read here, not on the dashboard: the Practice Lab is where the card is, so the dashboard's
  // request budget is untouched. The card names the case as soon as the read comes back.
  if(isTrainee() && L.id !== state.traineeId && !L.loading) load(state.traineeId);
  const no = isTrainee() && L.draft ? myCaseNo() : null;
  const note = !open ? "" : adminOn() ? "Assign each trainee a case."
    : no ? `Your case: <b>${e(caseName(no))}</b>.` : "Waiting for your trainer to assign your case.";
  return `<div class="card fts-card ${open ? "" : "fts-locked"}"><div class="fts-kicker">Claims Specialist Training${open ? "" : " · opens with this lesson"}</div>
    <h3>📄 LOR Drafting Activity</h3>
    <p class="fts-note">Draft the Letter of Representation for the 1P and the 3P carrier from your assigned case, in the firm's own templates, then download them to upload into the Smart Advocate demo. A standalone activity — no CMS case file.</p>
    ${note ? `<p class="fss-case">${note}</p>` : ""}
    <div class="fts-tool-act">${open ? `<button class="btn btn-navy btn-sm" type="button" onclick="goto('lor')">Open the activity</button>`
      : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div>`;
};

(function(){ const s = document.createElement("style"); s.id = "ft-lor"; s.textContent = `
main.main-lor{max-width:1080px;margin:0 auto;padding:24px 16px 48px;}
.lor-preview-note{padding:10px 14px;margin:0 0 14px;background:#EEF2FF;border:1px solid #C7D2FE;color:#3730A3;font-size:13.5px;}
.lor-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;}
.lor-hero p{margin:0 0 16px;color:var(--ink-soft);font-size:15px;max-width:760px;}
.lor-eyebrow{margin:0 0 2px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--orange-deep);}
.lor-muted{color:var(--ink-soft);font-size:13.5px;}
.lor-warn{display:flex;gap:12px;align-items:flex-start;background:#FFF7ED;border:1px solid #FDBA74;border-left:5px solid #F97316;border-radius:12px;padding:14px 16px;margin:0 0 16px;}
.lor-warn-ic{font-size:19px;line-height:1.2;}
.lor-warn-h{color:#9A3412;display:block;margin-bottom:2px;}
.lor-warn p b{color:#7C2D12;}
.lor-warn p{margin:0;font-size:13.5px;color:#7C2D12;}
.lor-obj{padding:14px 18px;margin-bottom:16px;background:#F7F8FB;}
.lor-obj b{color:var(--navy);} .lor-obj p{margin:4px 0 0;font-size:13.5px;color:var(--ink-soft);font-style:italic;}
.lor-wait{padding:24px;} .lor-wait b{color:var(--navy);} .lor-wait p{margin:6px 0 0;color:var(--ink-soft);font-size:13.5px;}
.lor-case{padding:18px;margin-bottom:20px;}
.lor-case-h{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;}
.lor-case-h h2{margin:0;color:var(--navy);font-size:19px;}
.lor-notes-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px;margin-top:12px;}
.lor-notes{background:#F7F8FB;border:1px solid #E6E8F0;border-radius:12px;padding:12px 14px;}
.lor-notes-h{font-size:11.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--orange-deep);margin-bottom:8px;}
.lor-notes dl{margin:0;} .lor-notes dl > div{display:flex;gap:8px;padding:3px 0;border-bottom:1px solid #EDEFF5;}
.lor-notes dl > div:last-child{border-bottom:0;}
.lor-notes dt{flex:0 0 46%;font-size:12.5px;color:var(--ink-soft);}
.lor-notes dd{margin:0;flex:1 1 auto;min-width:0;font-size:12.5px;font-weight:600;color:var(--navy);overflow-wrap:anywhere;}
.lor-tabs{margin-bottom:14px;}
.lor-ed-h{margin:0 0 10px;color:var(--navy);font-size:20px;}
.lor-steps{padding:12px 16px;margin-bottom:14px;}
.lor-steps summary{cursor:pointer;font-weight:700;color:var(--navy);}
.lor-steps ol{margin:10px 0 6px;padding-left:20px;} .lor-steps li{font-size:13.5px;margin-bottom:5px;}
.lor-steps code,.lor-naming code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;background:#F1F5F9;border-radius:5px;padding:2px 6px;overflow-wrap:anywhere;}
/* the letter itself: the firm's page, with only the highlighted parts editable */
.lor-paper{padding:40px 44px;background:#fff;}
.lorl{font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.5;color:#111;}
.lorl-p{margin:0 0 9px;text-align:justify;}
.lorl-mid{text-align:center;font-weight:700;}
.lorl-num{display:list-item;list-style:decimal;margin-left:26px;text-align:justify;}
.lorl-tab{display:inline-block;width:34px;}
.lorl-tbl{border-collapse:collapse;margin:6px 0;} .lorl-tbl td{padding:2px 8px 2px 0;font-size:13.5px;}
.lorl-in,.lorl-ta{font:inherit;color:#0B3B8C;font-weight:700;background:#FEF9C3;border:0;border-bottom:1.5px solid #EAB308;border-radius:3px 3px 0 0;padding:1px 5px;max-width:100%;}
.lorl-in:focus,.lorl-ta:focus{outline:2px solid #F97316;outline-offset:1px;background:#FFFBEB;}
.lorl-in::placeholder,.lorl-ta::placeholder{color:#8A7B2F;font-weight:500;font-style:italic;}
.lorl-in.set,.lorl-ta.set{background:#ECFDF5;border-bottom-color:#34D399;}
.lorl-manual{color:#111;}
.lorl-ta{display:block;width:100%;margin:4px 0;line-height:1.5;resize:vertical;text-align:left;}
.lorl-auto{background:#E0E7FF;border-bottom:1.5px dashed #6366F1;border-radius:3px 3px 0 0;padding:1px 5px;font-weight:700;color:#312E81;}
.lorl-box{font:inherit;font-size:17px;line-height:1;background:none;border:0;color:#111;cursor:pointer;padding:0 2px;border-radius:4px;}
.lorl-box:hover{background:#FEF3C7;} .lorl-box.on{color:#047857;} .lorl-box:focus-visible{outline:2px solid #F97316;}
.lor-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0 6px;}
.lor-save{font-size:12.5px;color:var(--ink-soft);}
.lor-naming{margin:0;}
/* the trainer's side */
.lor-assign,.lor-preview{padding:18px;margin-bottom:18px;}
.lor-assign h2,.lor-preview h2{margin:0 0 4px;color:var(--navy);font-size:19px;}
.lor-batch{margin-top:12px;} .lor-batch > b{color:var(--navy);font-size:14px;}
.lor-arow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #EDEFF5;}
.lor-aname{flex:0 0 200px;font-weight:600;color:var(--navy);font-size:13.5px;}
.lor-arow select,.lor-preview select{font:inherit;font-size:13px;padding:5px 8px;border:1px solid #D7DBE7;border-radius:8px;background:#fff;max-width:100%;}
.lor-astate{font-size:12px;color:var(--ink-soft);}
@media(max-width:620px){ .lor-paper{padding:20px 16px;} .lor-aname{flex:1 1 100%;} }
`; document.head.appendChild(s); })();
})();
