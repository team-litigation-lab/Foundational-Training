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
// What Word gave the run: bold, italic, underline, its own size and face where it differs.
function runStyle(r){
  const st = [];
  if(r.sz) st.push("font-size:" + r.sz + "pt");
  if(r.ff) st.push("font-family:'" + String(r.ff).replace(/'/g, "") + "',Arial,Helvetica,sans-serif");
  return st.join(";");
}
function runClass(r){ return (r.b ? " b" : "") + (r.i ? " i" : "") + (r.u ? " u" : ""); }

function fixed(run, ctx){
  let html = "";
  String(run.x).split(/(\t|\n|☐)/).forEach(part => {
    if(part === "\t") html += "\u0001";   // a tab: the paragraph decides what it means (tabbedRow)
    else if(part === "\n") html += "<br>";
    else if(part === "☐") html += box(ctx);
    else if(part) html += e(part);
  });
  const cls = runClass(run), st = runStyle(run);
  return (cls || st) ? `<span class="lorl-r${cls}"${st ? ` style="${st}"` : ""}>${html}</span>` : html;
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
    return `<span class="lorl-auto${runClass(run)}" style="${runStyle(run)}" title="Auto-generated: the letter is dated the day it is drafted">${e(letterDate())}</span>`;
  if(run.k === "manual")
    // "SENT VIA FACSIMILE AND E-MAIL": edited by hand, so it carries the template's own wording to start with.
    return `<input class="lorl-in lorl-manual${runClass(run)}" value="${e(v != null ? v : run.ph)}" size="${Math.max(18, run.ph.length)}"
      aria-label="Sent via" style="${runStyle(run)}" oninput="FTLor.set(${arg}, this.value)">`;
  if(run.k === "long")
    return `<textarea class="lorl-ta${set ? " set" : ""}" rows="5" placeholder="${e(run.ph)}" aria-label="Highlighted paragraph to review"
      oninput="FTLor.set(${arg}, this.value); FTLor.grow(this)">${e(v || "")}</textarea>`;
  return `<input class="lorl-in${runClass(run)}${set ? " set" : ""}" value="${e(v || "")}" placeholder="${e(run.ph)}"
    size="${Math.max(12, Math.min(64, run.ph.length))}" aria-label="${e(run.ph)}" style="${runStyle(run)}" oninput="FTLor.set(${arg}, this.value)">`;
}
// A list item's marker: a bullet, or the next number in that list. Each of Word's lists counts on its
// own, so the two bulleted lines inside the affidavit don't take numbers from the list around them.
function listMark(b, count){
  if(b.nf === "bullet") return "•";
  const k = b.ni || "1";
  count[k] = (count[k] || 0) + 1;
  return count[k] + ".";
}
// A paragraph's own indents and alignment, in the inches Word measured them in.
function paraStyle(b){
  const st = [], d = b.ind || {};
  if(b.jc) st.push("text-align:" + (b.jc === "both" ? "justify" : b.jc));
  if(d.l) st.push("margin-left:" + d.l + "in");
  if(d.r > 0) st.push("margin-right:" + d.r + "in");
  if(d.fi) st.push("text-indent:" + d.fi + "in");
  else if(d.ha) st.push("text-indent:-" + d.ha + "in");
  return st.join(";");
}
// Word's tab stops are positions on the line, which CSS has no equivalent for: a line that uses them
// becomes a grid whose columns end at those stops, which is what the stops were there to produce.
function tabbedRow(b, parts, style){
  const d = b.ind || {}, start = (d.l || 0) + (d.fi || 0) - (d.ha || 0);
  const cols = [];
  let at = start;
  for(let i = 0; i < parts.length - 1; i++){
    const stop = (b.tabs || []).find(t => t > at + 0.01);
    const next = stop != null ? stop : at + 0.5;
    cols.push("minmax(" + (next - at).toFixed(3) + "in,max-content)");
    at = next;
  }
  cols.push("auto");
  return `<p class="lorl-p lorl-tabrow" style="${style};display:grid;grid-template-columns:${cols.join(" ")};text-indent:0;margin-left:${(d.l || 0)}in;">`
    + parts.map(x => `<span>${x || ""}</span>`).join("") + `</p>`;
}
// The firm's letterhead, from the document's own header: the VAN LAW FIRM logo and the bar under it
// (img/vanlaw-logo.png and img/vanlaw-rule.png, lifted out of the .docx), the attorneys and where each
// is admitted, the four offices, and the website. Word floats these as positioned text boxes; here
// they are laid out as the letterhead reads — logo and attorneys above, the offices in four columns.
function letterhead(h){
  if(!h || !(h.offices || []).length) return "";
  const office = o => `<div class="lorh-off"><b>${e(o.city)}</b>
    ${(o.physical || []).length ? `<span class="lorh-lbl">Physical Address:</span>${o.physical.map(x => `<span>${e(x)}</span>`).join("")}` : ""}
    ${(o.mailing || []).length ? `<span class="lorh-lbl">Mailing Address:</span>${o.mailing.map(x => `<span>${e(x)}</span>`).join("")}` : ""}
    ${o.phone ? `<span>${e(o.phone)}</span>` : ""}${o.email ? `<span>${e(o.email)}</span>` : ""}</div>`;
  return `<div class="lorh">
    <div class="lorh-top">
      <img class="lorh-logo" src="/img/vanlaw-logo.png" alt="Van Law Firm" width="313" height="167">
      <div class="lorh-atts">${(h.attorneys || []).map(a => `<div><b>${e(a.n)}</b><span>${e(a.a)}</span></div>`).join("")}</div>
    </div>
    <img class="lorh-rule" src="/img/vanlaw-rule.png" alt="" width="1502" height="35">
    <div class="lorh-offs">${(h.offices || []).map(office).join("")}</div>
    ${h.site ? `<div class="lorh-site">${e(h.site)}</div>` : ""}
  </div>`;
}
function renderLetter(tpl){
  const ctx = {tpl, L: letter(tpl.id), box: 0};
  const pg = tpl.page || {}, m = pg.m || {};
  const page = `width:${pg.w || 8.5}in;padding:${m.top || 1}in ${m.right || 1}in ${m.bottom || 1}in ${m.left || 1}in;`
    + (pg.sz ? `font-size:${pg.sz}pt;` : "");
  const count = {};
  return `<div class="lorl" style="${page}">` + letterhead(tpl.head) + tpl.blocks.map(b => {
    if(b.t === "tbl")
      return `<table class="lorl-tbl"><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const style = paraStyle(b);
    let html = b.runs.map(r => r.f ? field(r, ctx) : fixed(r, ctx)).join("");
    if(b.n) html = `<span class="lorl-n">${listMark(b, count)}</span> ` + html;
    // a line laid out on tab stops: split it where the tabs are and put each piece on its stop
    if((b.tabs || []).length && html.indexOf("\u0001") >= 0) return tabbedRow(b, html.split("\u0001"), style);
    const cls = "lorl-p" + (b.n ? " lorl-numbered" : "");
    return `<p class="${cls}" style="${style}">${html.replace(/\u0001/g, `<span class="lorl-tab"></span>`) || "&nbsp;"}</p>`;
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
// The letter as a PDF, laid out the way the document is: its page and margins, each paragraph's
// alignment and indents, each run's bold, italic and underline, and the tab stops as columns.
// The built-in Helvetica stands in for Arial — the same metrics, and the only sans-serif jsPDF
// carries without embedding a font file.
const PT = 72;                       // points to an inch
function pdfRuns(tpl, b, d, n){
  // A paragraph as a list of {t, b, i, u, sz} pieces, with the fields filled in and the boxes ticked.
  const out = [];
  b.runs.forEach(r => {
    let t;
    if(r.f) t = r.k === "date" ? letterDate() : (r.k === "manual" ? (d.fields[r.f] != null ? d.fields[r.f] : r.ph) : (d.fields[r.f] || r.ph));
    else t = String(r.x).replace(/☐/g, () => (d.checks["cb" + (n.i++)] ? "[X]" : "[  ]"));
    if(t !== "") out.push({t:pdfSafe(t), b:!!r.b, i:!!r.i, u:!!r.u, sz:r.sz || (tpl.page || {}).sz || 12});
  });
  return out;
}
// An image from the site, as a data URL jsPDF can place.
async function imgData(src){
  try{
    const blob = await (await fetch(src)).blob();
    return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.onerror = () => r(null); f.readAsDataURL(blob); });
  }catch(err){ return null; }
}
// The letterhead at the top of the PDF, the same one the page shows: the logo, the attorneys, the
// bar, the offices and the website. Returns the y the letter itself starts at.
async function pdfLetterhead(doc, h, L, R, TOP, PW){
  if(!h || !(h.offices || []).length) return TOP;
  const W = PW - L - R;
  let y = TOP;
  const logo = await imgData("/img/vanlaw-logo.png"), rule = await imgData("/img/vanlaw-rule.png");
  const logoW = 115, logoH = logo ? logoW * 167 / 313 : 0;
  if(logo) doc.addImage(logo, "PNG", L, y, logoW, logoH);
  // the attorneys, in two columns on the right
  doc.setFont("helvetica", "normal");
  const atts = h.attorneys || [], half = Math.ceil(atts.length / 2);
  [atts.slice(0, half), atts.slice(half)].forEach((col, c) => {
    let ay = y + 6;
    const right = L + W - (1 - c) * (W * 0.26);
    col.forEach(a => {
      doc.setFontSize(6.4).setFont("helvetica", "bold").text(a.n, right, ay, {align:"right"});
      doc.setFontSize(5.6).setFont("helvetica", "normal").text(a.a, right, ay + 5.2, {align:"right"});
      ay += 11.4;
    });
  });
  y += Math.max(logoH, 6 + half * 11.4) + 4;
  if(rule){ doc.addImage(rule, "PNG", L, y, W, W * 35 / 1502); y += W * 35 / 1502 + 5; }
  // the four offices, side by side
  const colW = W / (h.offices.length || 1);
  let deepest = y;
  h.offices.forEach((o, i) => {
    let oy = y, x = L + i * colW;
    const line = (t, bold, italic) => { doc.setFont("helvetica", bold ? "bold" : italic ? "italic" : "normal").setFontSize(5.4).text(t, x, oy); oy += 6.1; };
    doc.setFontSize(5.8); line(o.city, true);
    if((o.physical || []).length){ line("Physical Address:", false, true); o.physical.forEach(t => line(t, true)); }
    if((o.mailing || []).length){ line("Mailing Address:", false, true); o.mailing.forEach(t => line(t, true)); }
    if(o.phone) line(o.phone, true);
    if(o.email) line(o.email, true);
    deepest = Math.max(deepest, oy);
  });
  y = deepest + 2;
  if(h.site){ doc.setFont("helvetica", "bold").setFontSize(6.4).setTextColor(196, 98, 45).text(h.site, L + W / 2, y, {align:"center"}); doc.setTextColor(0, 0, 0); y += 10; }
  return y + 4;
}
async function makeLetterPdf(name, tpl, d){
  if(typeof ensureJsPdf !== "function" || !(await ensureJsPdf())){ toast("Couldn’t load the PDF maker. Check your connection and try again."); return; }
  const {jsPDF} = window.jspdf, doc = new jsPDF({unit:"pt", format:"letter"});
  const pg = tpl.page || {}, m = pg.m || {}, PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight();
  const L = (m.left || 1) * PT, R = (m.right || 1) * PT, TOP = (m.top || 1) * PT, BOT = PH - (m.bottom || 1) * PT;
  const base = pg.sz || 12;
  let y = await pdfLetterhead(doc, tpl.head, L, R, TOP, PW);
  const face = r => { doc.setFont("helvetica", r.b && r.i ? "bolditalic" : r.b ? "bold" : r.i ? "italic" : "normal").setFontSize(r.sz); };
  const w = r => { face(r); return doc.getTextWidth(r.t); };
  const newPage = h => { if(y + h > BOT){ doc.addPage(); y = TOP; } };
  // one line of pieces, drawn left to right from x, underlining the runs that carry it
  const drawLine = (pieces, x, lead, gap) => {
    newPage(lead);
    let cx = x;
    pieces.forEach(r => {
      if(!r.t) return;
      face(r);
      doc.text(r.t, cx, y);
      const tw = doc.getTextWidth(r.t);
      if(r.u) doc.setLineWidth(0.6).line(cx, y + 1.6, cx + tw, y + 1.6);
      cx += tw + (gap && !r.t.trim() ? gap : 0);
    });
    y += lead;
  };
  // break a run list to a width, keeping each word's own formatting
  const wrap = (pieces, width) => {
    const words = [];
    pieces.forEach(r => String(r.t).split(/(\s+)/).forEach(t => { if(t !== "") words.push(Object.assign({}, r, {t})); }));
    const lines = []; let line = [], used = 0;
    words.forEach(word => {
      const ww = w(word);
      if(used + ww > width && line.length && word.t.trim()){ lines.push(line); line = []; used = 0; }
      if(!line.length && !word.t.trim()) return;        // no leading space on a wrapped line
      line.push(word); used += ww;
    });
    if(line.length) lines.push(line);
    return lines.length ? lines : [[]];
  };
  const count = {}; let n = {i:0};
  tpl.blocks.forEach(b => {
    if(b.t === "tbl"){
      b.rows.forEach(row => drawLine([{t:pdfSafe(row.filter(Boolean).join("   ")), sz:base}], L, base * 1.2));
      return;
    }
    let pieces = pdfRuns(tpl, b, d, n);
    const ind = b.ind || {}, lead = base * 1.18;
    if(b.n) pieces = [{t:listMark(b, count) + " ", sz:base}].concat(pieces);
    if(!pieces.length){ y += lead; return; }            // a blank line in the letter is a blank line here
    const left = L + (ind.l || 0) * PT, right = R + Math.max(0, ind.r || 0) * PT;
    const width = PW - left - right;
    // a line on tab stops: each piece starts at its stop
    if((b.tabs || []).length && pieces.some(r => r.t.indexOf("\t") >= 0)){
      const parts = []; let cur = [];
      pieces.forEach(r => String(r.t).split("\t").forEach((t, k) => { if(k){ parts.push(cur); cur = []; } if(t) cur.push(Object.assign({}, r, {t})); }));
      parts.push(cur);
      let at = (ind.l || 0) + (ind.fi || 0) - (ind.ha || 0);
      newPage(lead);
      parts.forEach((part, k) => {
        let cx = L + at * PT;
        part.forEach(r => { face(r); doc.text(r.t, cx, y); const tw = doc.getTextWidth(r.t); if(r.u) doc.setLineWidth(0.6).line(cx, y + 1.6, cx + tw, y + 1.6); cx += tw; });
        const stop = (b.tabs || []).find(t => t > at + 0.01);
        at = stop != null ? stop : at + Math.max(0.5, (cx - (L + at * PT)) / PT);
      });
      y += lead;
      return;
    }
    const first = (ind.fi || 0) * PT - (ind.ha || 0) * PT;
    const lines = wrap(pieces, width - Math.max(0, first));
    lines.forEach((line, k) => {
      const lw = line.reduce((t, r) => t + w(r), 0);
      const indent = k ? 0 : Math.max(0, first);
      let x = left + indent, gap = 0;
      if(b.jc === "center") x = left + (width - lw) / 2;
      else if(b.jc === "right") x = left + width - lw;
      else if(b.jc === "both" && k < lines.length - 1){
        const spaces = line.filter(r => !r.t.trim()).length;
        if(spaces) gap = Math.max(0, (width - indent - lw) / spaces);
      }
      drawLine(line, x, lead, gap);
    });
  });
  doc.save(name.replace(/[\\/:*?"<>|]/g, "") + ".pdf");
}
// The case notes stay a plain list: they are notes, not a letter.
async function makePdf(name, lines){
  if(typeof ensureJsPdf !== "function" || !(await ensureJsPdf())){ toast("Couldn’t load the PDF maker. Check your connection and try again."); return; }
  const {jsPDF} = window.jspdf, doc = new jsPDF({unit:"pt", format:"letter"});
  const M = 64, W = doc.internal.pageSize.getWidth() - M * 2, BOT = doc.internal.pageSize.getHeight() - M;
  let y = M;
  doc.setFont("helvetica", "normal").setFontSize(11);
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
    await makeLetterPdf(fileNameFor(tpl, myCaseNo()), tpl, letter(tid));
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
.lor-paper{padding:18px;background:#EEF0F6;overflow-x:auto;}
/* The letter is the document: its page width, its margins, its font and its single line spacing,
   so what the trainee edits on screen is what the firm's .docx looks like. */
.lorl{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.15;color:#000;background:#fff;
  margin:0 auto;box-sizing:border-box;box-shadow:0 1px 3px rgba(15,23,42,.14);}
.lorl-p{margin:0;min-height:1.15em;}
.lorl-numbered{padding-left:.4in;text-indent:-.4in;}
.lorl-n{display:inline-block;min-width:.3in;}
.lorl-r.b,.lorl-in.b{font-weight:700;} .lorl-r.i,.lorl-in.i{font-style:italic;} .lorl-r.u,.lorl-in.u{text-decoration:underline;}
.lorl-tabrow > span{min-width:0;white-space:nowrap;}
.lorl-tabrow > span:last-child{white-space:normal;}
.lorl-tab{display:inline-block;width:.5in;}
/* The letterhead, from the document's header */
.lorh{margin:0 0 14px;}
.lorh-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
.lorh-logo{width:1.6in;height:auto;flex:none;}
.lorh-atts{display:grid;grid-template-columns:repeat(2,auto);gap:0 18px;text-align:right;margin-left:auto;}
.lorh-atts > div{margin-bottom:1px;}
.lorh-atts b{display:block;font-size:7.6pt;line-height:1.15;}
.lorh-atts span{display:block;font-size:6.6pt;line-height:1.15;color:#333;}
.lorh-rule{display:block;width:100%;height:auto;margin:6px 0 5px;}
.lorh-offs{display:grid;grid-template-columns:repeat(4,1fr);gap:0 10px;}
.lorh-off{font-size:6.4pt;line-height:1.22;}
.lorh-off b{display:block;font-size:6.8pt;}
.lorh-off span{display:block;}
.lorh-lbl{font-style:italic;}
.lorh-site{text-align:center;font-size:7.4pt;font-weight:700;color:#C4622D;margin-top:4px;}
.lorl-tbl{border-collapse:collapse;margin:6px 0;} .lorl-tbl td{padding:2px 8px 2px 0;font-size:13.5px;}
.lorl-in,.lorl-ta{font:inherit;color:#0B3B8C;font-weight:inherit;background:#FEF9C3;border:0;border-bottom:1.5px solid #EAB308;border-radius:3px 3px 0 0;padding:1px 5px;max-width:100%;}
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
