/* ============================================================
   🧰 Drafting Tools — Medical Provider LOR Drafting Activity (#/medlor)
   Loaded after js/ft-medlor-data.js (the provider cases) and after js/ft-lor.js (for its templates'
   letterhead, which this activity reuses — see head() below).

   The medical-records sibling of the LOR Drafting Activity (js/ft-lor.js): same idea, same mechanics,
   a separate page because its case data looks nothing like an insurer's (one provider's name, address
   and contact details, plus the client's own identifying details — no 1P/3P split). Cross-linked from
   both pages' heroes and sitting in the same 🧰 Drafting Tools group in 🛠 Practice Lab.

     • The trainer assigns one provider per trainee (Assign providers, admins only) out of the
       providers in js/ft-medlor-data.js — one per medical provider the firm sent a sample letter for
       (one per doctor, under Nevada Personal Injury Management). Until they do, the trainee sees what
       to ask for.
     • The trainer's own page carries the whole activity under the assigning panel, working: a test
       copy, never written to storage, never seen by a trainee.
     • The trainee reads their provider's details on the page and can download them as a PDF.
     • Two editors, one per letter, showing the firm's own templates. What is highlighted is what the
       trainee fills in; everything else is the firm's fixed wording:
         – the letter's date is auto-generated and always the current date
         – "SENT VIA FACSIMILE …" is typed by hand, the one highlighted line that isn't a placeholder
         – the four checklist items (and the two "executed in/outside Nevada" declarations) are
           tick boxes that work — for this activity every applicable item is ticked
       Answers save as the trainee types.
     • ⬇ Download gives the edited letter as a PDF (or a Word file), ready to upload into the Smart
       Advocate demo. The file name follows the trainers' naming convention, editable before download.
     • NOT a CMS activity, same as the LOR Drafting Activity — see NO_CASE_FILE below.

   Shared storage keys (rules in worker.js):
     medlor:<traineeId>        the trainee's own drafts (they read and write their own)
     medlorassign:<traineeId>  the provider their trainer assigned (the trainee reads it, only admins write it)
   ============================================================ */
(function(){
"use strict";
if(!window.FT_MEDLOR_CASES) return;

const CASES = window.FT_MEDLOR_CASES;
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview;
const NO_CASE_FILE = "Do <b>not</b> create a case file in the CMS for this activity, and do not link it to any case file. This is a standalone drafting exercise: you draft the two letters here, download them, and upload them into the Smart Advocate demo yourself.";

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["medlor"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {medlor:"Medical Provider LOR Drafting"});

/* ---------- the two letters, exactly as the firm wrote them ----------
   Hand-authored, not generated: the firm's sample letters mix its own filled-in demo values with its
   usual yellow-highlighted blanks in the same run of text (e.g. "Re:  Our Client:  John Test Doe" is
   one highlighted run, label and value together), so a script can't reliably tell the "Re:" label from
   the value the way it can on a genuinely blank template. The split below — which runs are the firm's
   fixed wording and which are what the trainee types — was made by hand from those sample letters, the
   same split build/lor/make_lor_data.py makes automatically for the 1P/3P LOR templates. The literal
   blank lines in the Unsworn Declaration of Custodian of Records (the affiant's signature, the notary
   block) stay fixed text here too, the same as the 3P template's own Affidavit of Insurance Coverage:
   they are signed by hand on the printed page, not typed in this tool. */
const TEMPLATES = [
{"id":"medlorcor","title":"Activity 3: Medical Provider LOR Drafting (with Unsworn Declaration of Custodian of Records)","naming":"MED – Provider Name - LOR with COR mm.dd.yyyy (VA's name)","page":{"m":{"top":1.062,"right":0.65,"bottom":0.7,"left":0.65},"w":8.5,"sz":12.0},"blocks":[{"t":"p","runs":[{"x":"December 20, 2023","ff":"Arial","f":"f1","ph":"December 20, 2023","k":"date"}],"jc":"center"},{"t":"p","runs":[]},{"t":"p","runs":[{"x":"SENT VIA FACSIMILE AND EMAIL","ff":"Arial","b":true,"u":true,"f":"f2","ph":"SENT VIA FACSIMILE AND EMAIL","k":"manual"}]},{"t":"p","runs":[{"x":"Akers Chiropractic","ff":"Arial","f":"f3","ph":"[Provider / Facility Name]","k":"field"}]},{"t":"p","runs":[{"x":"ATTENTION: RECORDS AND/OR BILLING","ff":"Arial","b":true,"u":true}]},{"t":"p","runs":[{"x":"Auto Injury Centers\nPO Box 34239\nLas Vegas, NV 89133\nE: akerschiro1212@hotmail.com\nP: 702-822-1212 Main\nF: 702 839 0964","ff":"Arial","f":"f4","ph":"[Street address]\n[City, State ZIP]\nE: [email]\nP: [phone]\nF: [fax]","k":"long"}]},{"t":"p","runs":[],"ind":{"l":0.5,"fi":0.5}},{"t":"p","runs":[{"x":"Re:\t","ff":"Arial","b":true},{"x":"Our Client:\t","ff":"Arial","b":true},{"x":"John Test Doe","ff":"Arial","b":true,"f":"f5","ph":"[Client's Name]","k":"field"}],"ind":{"l":1.5,"ha":0.5},"tabs":[3.0]},{"t":"p","runs":[{"x":"Date of Birth:\t","ff":"Arial","b":true},{"x":"March 28, 1997","ff":"Arial","b":true,"f":"f6","ph":"[Date of Birth]","k":"field"}],"ind":{"l":3.0,"ha":1.5},"tabs":[3.539]},{"t":"p","runs":[{"x":"SS No.:\t","ff":"Arial","b":true},{"x":"111-222-1234","ff":"Arial","b":true,"f":"f7","ph":"[SS No.]","k":"field"}],"ind":{"l":3.0,"ha":1.5},"tabs":[3.544]},{"t":"p","runs":[{"x":"Date of Loss:\t","ff":"Arial","b":true},{"x":"February 1, 2018","ff":"Arial","b":true,"f":"f8","ph":"[Date of Loss]","k":"field"}],"ind":{"l":3.0,"ha":1.5},"tabs":[3.544]},{"t":"p","runs":[{"x":"Dates Requested:\t","ff":"Arial","b":true},{"x":"","ff":"Arial","b":true,"f":"f9","ph":"[date range of records requested]","k":"field"}],"ind":{"l":1.0,"fi":0.5}},{"t":"p","runs":[{"x":"To Whom It May Concern: ","ff":"Arial"}]},{"t":"p","runs":[{"x":"Please be advised that this office represents the above-named patient for injuries sustained on ","ff":"Arial"},{"x":"February 1, 2018","ff":"Arial","b":true,"f":"f10","ph":"[Date of Loss]","k":"field"},{"x":". Please accept this as our letter of representation to allow communication between our offices. Enclosed for your files is a medical authorization, signed by our client. Additionally, we are requesting that you provide this office with the following upon the patient’s discharge from treatment: ","ff":"Arial"}],"jc":"both","ind":{"fi":0.5}},{"t":"p","runs":[{"x":"☐","ff":"Arial","b":true},{"x":"\tAn ITEMIZED STATEMENT for services rendered for the dates requested that are related to the above referenced incident ","ff":"Arial"},{"x":"at your facility only.","ff":"Arial","b":true,"u":true}],"ind":{"l":0.25}},{"t":"p","runs":[{"x":"☐","ff":"Arial","b":true},{"x":" \tCopies of all MEDICAL RECORDS for services rendered for the dates requested that are related to the above referenced incident ","ff":"Arial"},{"x":"at your facility only.","ff":"Arial","b":true,"u":true}],"ind":{"l":0.25}},{"t":"p","runs":[{"x":"☐","ff":"Arial","b":true},{"x":" \tAN UNSWORN DECLARATION OF CUSTODIAN OF RECORDS, attached hereto. ","ff":"Arial"}],"ind":{"l":0.25}},{"t":"p","runs":[{"x":"☐","ff":"Arial","b":true},{"x":" \tINITIAL EVALUATION and NOTES from the treating MEDICAL PROVIDER.","ff":"Arial"}],"ind":{"l":0.25}},{"t":"p","runs":[]},{"t":"p","runs":[{"x":"Simply attach the medical documents requested above to the enclosed Unsworn Declarations, execute the Declarations, and forward the records to our office as soon as possible.","ff":"Arial","b":true}],"ind":{"fi":0.5}},{"t":"p","runs":[{"x":"If you will please forward us a bill for the copying costs, we will gladly reimburse you at the maximum statutory rate of sixty cents per copy. ","ff":"Arial"},{"x":"However, should the copy fee exceed $6.50, please call us to seek prior approval before complying with our request.","ff":"Arial","b":true},{"x":" If you should have any questions or concerns regarding the foregoing, please contact me at (725) 900-9000. Thank you for your time and assistance.","ff":"Arial"}],"jc":"both","ind":{"fi":0.5}},{"t":"p","runs":[{"x":"Very truly yours,","ff":"Arial"}],"ind":{"l":3.5,"fi":0.375}},{"t":"p","runs":[],"ind":{"l":3.875}},{"t":"p","runs":[],"ind":{"l":3.875}},{"t":"p","runs":[{"x":"Sandy Van, Esq.","ff":"Arial","b":true,"i":true,"u":true}],"ind":{"l":3.875}},{"t":"p","runs":[{"x":"Van Law Firm","ff":"Arial","b":true}],"ind":{"l":3.875}},{"t":"p","runs":[{"x":"SV/","ff":"Arial"},{"x":"__","ff":"Arial","f":"f11","ph":"[VA's initials]","k":"field"}]},{"t":"p","runs":[{"x":"Enclosures","ff":"Arial"}]},{"t":"p","runs":[{"x":"UNSWORN DECLARATION OF CUSTODIAN OF RECORDS","ff":"Arial","b":true,"u":true}],"jc":"center"},{"t":"p","runs":[{"x":"I,______________________, being first duly sworn, deposes and says: ","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"(","ff":"Arial"},{"x":"Name of Affiant","ff":"Arial","i":true},{"x":") ","ff":"Arial"}],"jc":"both","ind":{"fi":0.5}},{"t":"p","runs":[{"x":"1. That I am the _______________________ for ____________________________and in that capacity, I act as the Custodian","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"\t\t\t","ff":"Arial"},{"x":"(Position or Title)","ff":"Arial","i":true},{"x":"\t\t\t","ff":"Arial"},{"x":"(Name of Employer)","ff":"Arial","i":true},{"x":" ","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"of Records for ____________________________.  ","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"\t\t\t","ff":"Arial"},{"x":"(Name of Employer)","ff":"Arial","i":true}],"jc":"both"},{"t":"p","runs":[{"x":"2. That ____________________________ is licensed or registered to do business as a ____________________________","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"\t\t(","ff":"Arial"},{"x":"Name of Employer","ff":"Arial","i":true},{"x":")\t\t\t\t\t\t\t(","ff":"Arial"},{"x":"Type of Entity","ff":"Arial","i":true},{"x":")","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"in the State of _______________________.","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[{"x":"3. That on the ____ day of the month of ________________, of the year________, I received a request calling for the production of all records, bills, and/or radiology films in our facility’s possession and control pertaining to: ","ff":"Arial"},{"x":"John Test Doe; March 28, 1997; 111-222-1234","ff":"Arial","b":true,"f":"f12","ph":"[Client's Name]; [Date of Birth]; [SS No.]","k":"field"}],"jc":"both"},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[{"x":"4. That myself and/or another person acting under my supervision and control made a complete search of all available records. ","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[{"x":"5. That our facility’s Records Department maintains records for ______ years. ","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[{"x":"6. That our facility’s Records Department located the records and things, the copies of which have been produced with this certificate. I have examined the original of these records and things and have made or caused to be made a true and exact copy of them and that the reproduction of them attached hereto is true and complete. ","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[{"x":"7. That the original of these records was made at or near the time of the act, event, condition, opinion, or diagnosis recited therein by or from information transmitted by a person with knowledge, in the course of a regularly conducted activity of the affiant and/or ____________________________.","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"\t\t\t","ff":"Arial"},{"x":"(Name of Employer)","ff":"Arial","i":true}],"jc":"both"},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[{"x":"(Please check and sign only one)","ff":"Arial","b":true}],"jc":"both"},{"t":"p","runs":[{"x":"☐","ff":"Arial","b":true,"i":true,"u":true},{"x":"\tIf executed in the State of Nevada: “I declare under penalty of perjury that the foregoing is true and correct.”","ff":"Arial","b":true,"i":true,"u":true}],"jc":"both"},{"t":"p","runs":[{"x":"Executed on.........................                 ………………………………………………………………………………","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"                (date)                               \t\t (signature)","ff":"Arial","b":true,"i":true,"u":true}],"jc":"both","ind":{"l":0.4}},{"t":"p","runs":[],"jc":"both"},{"t":"p","runs":[{"x":"☐","ff":"Arial","b":true,"i":true,"u":true},{"x":"\tIf executed outside of the State of Nevada: “I declare under penalty of perjury under the law of the State of Nevada that the foregoing is true and correct.”","ff":"Arial","b":true,"i":true,"u":true}],"jc":"both"},{"t":"p","runs":[],"jc":"both","ind":{"l":0.4}},{"t":"p","runs":[{"x":"Executed on.........................                 ………………………………………………………………………………","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"                (date)                               \t \t(signature)","ff":"Arial","b":true,"i":true,"u":true}],"jc":"both","ind":{"l":0.4}}]},
{"id":"lienbv","title":"Activity 4: Medical Provider Lien Balance Verification","naming":"MED – Provider Name - Lien BV mm.dd.yyyy (VA's name)","page":{"m":{"top":1.0,"right":0.65,"bottom":0.7,"left":0.65},"w":8.5,"sz":12.0},"blocks":[{"t":"p","runs":[{"x":"December 20, 2023","ff":"Arial","f":"f1","ph":"December 20, 2023","k":"date"}],"jc":"center"},{"t":"p","runs":[]},{"t":"p","runs":[{"x":"SENT VIA FACSIMILE & EMAIL","ff":"Arial","b":true,"u":true,"f":"f2","ph":"SENT VIA FACSIMILE & EMAIL","k":"manual"}]},{"t":"p","runs":[{"x":"Akers Chiropractic","ff":"Arial","f":"f3","ph":"[Provider / Facility Name]","k":"field"}]},{"t":"p","runs":[{"x":"ATTENTION: BILLING","ff":"Arial","b":true,"u":true}]},{"t":"p","runs":[{"x":"Auto Injury Centers\nPO Box 34239\nLas Vegas, NV 89133\nF: 702 839 0964","ff":"Arial","f":"f4","ph":"[Street address]\n[City, State ZIP]\nF: [fax]","k":"long"}]},{"t":"p","runs":[],"ind":{"l":0.5,"fi":0.5}},{"t":"p","runs":[{"x":"Re:\t","ff":"Arial","b":true},{"x":"Our Client:\t","ff":"Arial","b":true},{"x":"John Test Doe","ff":"Arial","b":true,"f":"f5","ph":"[Client's Name]","k":"field"}],"ind":{"l":1.5,"ha":0.5},"tabs":[3.0]},{"t":"p","runs":[{"x":"\t","ff":"Arial","b":true},{"x":"Date of Birth:\t","ff":"Arial","b":true},{"x":"","ff":"Arial","b":true,"f":"f6","ph":"[Date of Birth]","k":"field"}],"ind":{"l":1.5,"ha":0.5},"tabs":[3.0]},{"t":"p","runs":[{"x":"SS No.:\t","ff":"Arial","b":true},{"x":"","ff":"Arial","b":true,"f":"f7","ph":"[SS No.]","k":"field"},{"x":"\nDate of Loss:\t","ff":"Arial","b":true},{"x":"","ff":"Arial","b":true,"f":"f8","ph":"[Date of Loss]","k":"field"}],"ind":{"l":1.5},"tabs":[3.0,3.15]},{"t":"p","runs":[{"x":"To Whom It May Concern:","ff":"Arial"}]},{"t":"p","runs":[{"x":"\tPlease allow this correspondence to serve as a formal request for verification of the amount due on our above client’s lien with your facility. We are attempting to settle this case and would like to confirm any amounts owed as soon as possible. As such, please fill in the information below and return this form to our office ","ff":"Arial"},{"x":"via facsimile to (702) 800-4662.","ff":"Arial","u":true}],"jc":"both"},{"t":"p","runs":[{"x":"\tThank you in advance for your prompt attention and cooperation in this regard. Please do not hesitate to contact me at (725) 900-9000 should you have any further questions or concerns.","ff":"Arial"}],"jc":"both"},{"t":"p","runs":[{"x":"Very truly yours,","ff":"Arial"}],"ind":{"l":3.5,"fi":0.5}},{"t":"p","runs":[],"ind":{"l":3.5}},{"t":"p","runs":[],"ind":{"l":3.5,"fi":0.5}},{"t":"p","runs":[{"x":"Sandy Van, Esq.","ff":"Arial","b":true}],"ind":{"l":3.5,"fi":0.5}},{"t":"p","runs":[{"x":"Van Law Firm","ff":"Arial","b":true}],"ind":{"l":3.5,"fi":0.5}},{"t":"p","runs":[{"x":"SV/","ff":"Arial"},{"x":"______","ff":"Arial","f":"f9","ph":"[VA's initials]","k":"field"}]},{"t":"p","runs":[{"x":"Last Day Of Treatment:","ff":"Arial"},{"x":"\t__________________________","ff":"Arial"}],"tabs":[1.954]},{"t":"p","runs":[{"x":"Next Day of Treatment:","ff":"Arial"},{"x":"\t__________________________","ff":"Arial"}],"tabs":[1.954]},{"t":"p","runs":[{"x":"Is Treatment Complete? ","ff":"Arial"},{"x":"\t☐ Yes\t☐ No","ff":"Arial"}],"tabs":[1.964,3.15]},{"t":"p","runs":[{"x":"Total Charges:","ff":"Arial"},{"x":"\t$_________________________","ff":"Arial"}],"tabs":[1.964]},{"t":"p","runs":[{"x":"Paid By Insurance:","ff":"Arial"},{"x":"\t$_________________________","ff":"Arial"}],"tabs":[1.964]},{"t":"p","runs":[{"x":"Adjustments:","ff":"Arial"},{"x":"\t$_________________________","ff":"Arial"}],"tabs":[1.964]},{"t":"p","runs":[{"x":"Final Lien Balance:","ff":"Arial"},{"x":"\t$_________________________","ff":"Arial"}],"tabs":[1.964]},{"t":"p","runs":[],"jc":"center"},{"t":"p","runs":[{"x":"***Please attach billing statement***","ff":"Arial","b":true}],"jc":"center"},{"t":"p","runs":[{"x":"Date:","ff":"Arial"},{"x":"\t________________________","ff":"Arial"}],"tabs":[0.963]},{"t":"p","runs":[{"x":"Signed:","ff":"Arial"},{"x":"\t________________________","ff":"Arial"}],"tabs":[0.963]},{"t":"p","runs":[{"x":"Print Name:","ff":"Arial"},{"x":"\t________________________","ff":"Arial"}],"tabs":[0.963]}]}
];
// The firm's own letterhead (logo, attorneys, offices): the same one the LOR Drafting Activity shows,
// reused rather than copied — these sample letters' own headers carry an older, incomplete attorney
// roster with no office addresses at all, so the site's up-to-date letterhead (js/ft-lor-data.js) is
// the one actually shown and printed.
const head = () => (window.FT_LOR_TEMPLATES && window.FT_LOR_TEMPLATES[0] && window.FT_LOR_TEMPLATES[0].head) || null;

/* ---------- the trainee's drafts and the provider their trainer assigned ---------- */
const L = {id:null, draft:null, assign:null, loading:false, err:"", timer:null, saving:false, savedAt:null, tab:TEMPLATES[0].id};
const blank = () => ({v:1, letters:{}, updatedAt:""});
let scratch = null;
function useScratch(){
  if(!scratch) scratch = blank();
  if(L.draft !== scratch){ L.draft = scratch; L.id = null; L.err = ""; L.savedAt = null; }
}
function letter(tid){ const ls = L.draft.letters; return ls[tid] || (ls[tid] = {fields:{}, checks:{}, updatedAt:""}); }

async function load(id){
  if(!id){ L.id = id; L.err = ""; L.assign = null; if(!L.draft) L.draft = blank(); return; }
  L.loading = true; L.err = ""; L.id = id;
  try{
    const [d, a] = await Promise.all([sharedGet("medlor:" + id), sharedGet("medlorassign:" + id)]);
    L.draft = (d && typeof d === "object") ? d : blank();
    if(!L.draft.letters) L.draft.letters = {};
    L.assign = (a && typeof a === "object") ? a : null;
  }catch(err){ L.err = "Couldn’t load your drafting activity. Check your connection and try again."; }
  L.loading = false;
  if(state.view === "medlor" || state.view === "simulators") render();
}
function paintSave(ok){
  const el = document.getElementById("mlSave");
  if(!el) return;
  if(!state.traineeId || adminOn()){ el.textContent = "Test copy — nothing here is saved."; return; }
  el.textContent = L.saving ? "Saving…" : (ok === false ? "⚠ Not saved. Check your connection." : (L.savedAt ? "All changes saved" : ""));
}
function queueSave(){
  if(!state.traineeId || adminOn()) return;
  L.draft.updatedAt = new Date().toISOString();
  clearTimeout(L.timer); L.saving = true; paintSave();
  L.timer = setTimeout(async () => {
    const ok = await sharedSet("medlor:" + L.id, L.draft);
    L.saving = false; L.savedAt = ok === false ? null : new Date(); paintSave(ok);
  }, 900);
}

/* ---------- the assigned provider ---------- */
function myCaseNo(){
  if(adminOn()) return Number(state.medlorPreviewCase) || 1;
  const n = L.assign && Number(L.assign.case);
  return n >= 1 && n <= CASES.length ? n : null;
}
const caseOf = no => (no ? CASES[no - 1] : null) || null;
const caseName = no => { const c = caseOf(no); return c ? `Case ${no} · ${c.label}` : `Case ${no}`; };
const NOTE_KEYS = ["Provider / Facility", "Address", "Phone", "Fax", "Email", "Client’s Name", "Date of Birth", "SS No.", "Date of Loss"];
function noteRows(c){
  const set = (c && c.notes) || {};
  return NOTE_KEYS.filter(k => set[k]).map(k => [k, set[k]]);
}

/* ---------- the letter's date: auto-generated, always today ---------- */
const letterDate = () => new Date().toLocaleDateString("en-US", {year:"numeric", month:"long", day:"numeric"});
const fileDate = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${p(d.getMonth() + 1)}.${p(d.getDate())}.${d.getFullYear()}`; };
const BAD_CHARS = /[\\/:*?"<>|]/g;
function conventionName(tpl, no){
  const c = caseOf(no) || {};
  const who = String(state.certName || state.traineeName || "VA’s name").replace(BAD_CHARS, "").trim() || "VA’s name";
  const provider = ((c.notes || {})["Provider / Facility"] || "").split(" / ").pop() || "";
  return String(tpl.naming || tpl.title || "Letter")
    .replace(/mm\.dd\.yyyy/gi, fileDate())
    .replace(/\(\s*VA[’']s name\s*\)/gi, "(" + who + ")")
    .replace(/Provider Name/gi, () => provider || "Provider Name")
    .trim();
}
function fileNameFor(tpl, no){
  const own = L.draft ? letter(tpl.id).file : "";
  const name = String(own == null ? "" : own).replace(BAD_CHARS, "").trim();
  return name || conventionName(tpl, no);
}

/* ---------- the letter, as the firm wrote it (shared engine with js/ft-lor.js) ---------- */
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
    if(part === "\t") html += "\u0001";
    else if(part === "\n") html += "<br>";
    else if(part === "☐") html += box(ctx);
    else if(part) html += e(part);
  });
  const cls = runClass(run), st = runStyle(run);
  return (cls || st) ? `<span class="lorl-r${cls}"${st ? ` style="${st}"` : ""}>${html}</span>` : html;
}
function box(ctx){
  const id = "cb" + (ctx.box++), on = !!ctx.L.checks[id];
  return `<button type="button" role="checkbox" aria-checked="${on}" class="lorl-box${on ? " on" : ""}" title="Tick this item"
    onclick="FTMedlor.tick('${ctx.tpl.id}','${id}')">${on ? "☒" : "☐"}</button>`;
}
function field(run, ctx){
  const v = ctx.L.fields[run.f];
  const set = v != null && String(v).trim() !== "";
  const arg = `'${ctx.tpl.id}','${run.f}'`;
  if(run.k === "date")
    return `<span class="lorl-auto${runClass(run)}" style="${runStyle(run)}" title="Auto-generated: the letter is dated the day it is drafted">${e(letterDate())}</span>`;
  if(run.k === "manual")
    return `<input class="lorl-in lorl-manual${runClass(run)}" value="${e(v != null ? v : run.ph)}" size="${Math.max(18, run.ph.length)}"
      aria-label="Sent via" style="${runStyle(run)}" oninput="FTMedlor.set(${arg}, this.value)">`;
  if(run.k === "long")
    return `<textarea class="lorl-ta${set ? " set" : ""}" rows="4" placeholder="${e(run.ph)}" aria-label="Recipient's contact block"
      oninput="FTMedlor.set(${arg}, this.value); FTMedlor.grow(this)">${e(v || "")}</textarea>`;
  return `<input class="lorl-in${runClass(run)}${set ? " set" : ""}" value="${e(v || "")}" placeholder="${e(run.ph)}"
    size="${Math.max(12, Math.min(64, run.ph.length))}" aria-label="${e(run.ph)}" style="${runStyle(run)}" oninput="FTMedlor.set(${arg}, this.value)">`;
}
function listMark(b, count){
  if(b.nf === "bullet") return "•";
  const k = b.ni || "1";
  count[k] = (count[k] || 0) + 1;
  return count[k] + ".";
}
function paraStyle(b){
  const st = [], d = b.ind || {};
  if(b.jc) st.push("text-align:" + (b.jc === "both" ? "justify" : b.jc));
  if(d.l) st.push("margin-left:" + d.l + "in");
  if(d.r > 0) st.push("margin-right:" + d.r + "in");
  if(d.fi) st.push("text-indent:" + d.fi + "in");
  else if(d.ha) st.push("text-indent:-" + d.ha + "in");
  return st.join(";");
}
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
  return `<div class="lorl" style="${page}">` + letterhead(head()) + tpl.blocks.map(b => {
    if(b.t === "tbl")
      return `<table class="lorl-tbl"><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const style = paraStyle(b);
    let html = b.runs.map(r => r.f ? field(r, ctx) : fixed(r, ctx)).join("");
    if(b.n) html = `<span class="lorl-n">${listMark(b, count)}</span> ` + html;
    if((b.tabs || []).length && html.indexOf("\u0001") >= 0) return tabbedRow(b, html.split("\u0001"), style);
    const cls = "lorl-p" + (b.n ? " lorl-numbered" : "");
    return `<p class="${cls}" style="${style}">${html.replace(/\u0001/g, `<span class="lorl-tab"></span>`) || "&nbsp;"}</p>`;
  }).join("") + `</div>`;
}
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
    return s.replace(/\t/g, "    ").replace(/ /g, " ");
  });
}

/* ---------- the page ---------- */
function notice(){
  return `<div class="lor-warn" role="note"><span class="lor-warn-ic">⚠</span><div><b class="lor-warn-h">Standalone activity — no CMS case file.</b><p>${NO_CASE_FILE}</p></div></div>`;
}
function objective(){
  return `<div class="card lor-obj"><b>Objective</b><p>The purpose of this activity is to draft a medical provider records request (with its Unsworn Declaration of Custodian of Records) and a lien balance verification request. Your letters should be accurate, professional, and follow the proper format — the same attention to detail a Medical Records Specialist uses every day.</p></div>`;
}
function crossLink(){
  return `<p class="lor-muted" style="margin:-4px 0 16px;">Looking for the <b>insurer</b> 1P/3P Letter of Representation activity? <a href="#" onclick="event.preventDefault(); goto('lor');">Open the LOR Drafting Activity →</a></p>`;
}
function caseCard(no){
  const c = caseOf(no);
  if(!c) return `<div class="card lor-wait"><b>Your trainer hasn’t assigned your provider yet.</b><p>A provider is handed out one per trainee. Ask your trainer to assign yours; your case notes and both letters open here as soon as they do.</p></div>`;
  const mine = !adminOn();
  return `<section class="card lor-case"><div class="lor-case-h"><div><p class="lor-eyebrow">${mine ? "Your assigned provider" : "Test copy · the provider you are drafting"}</p><h2>${e(caseName(no))}</h2></div>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTMedlor.casePdf()">⬇ Download ${mine ? "my" : "the"} case notes (PDF)</button></div>
    <p class="lor-muted">Draft both letters from these notes. Replace every placeholder with the right detail, drop the brackets, and keep the capitalisation the placeholder uses.</p>
    <div class="lor-notes-grid"><div class="lor-notes"><div class="lor-notes-h">Provider &amp; client details</div><dl>${noteRows(c).map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join("")}</dl></div></div></section>`;
}
function steps(tpl){
  const common = [
    "Replace every placeholder with the right detail from your case notes, and remove the brackets.",
    "Review each highlighted item: not all of them need changing, but each one has to be checked against your notes.",
    "The date is filled in for you and is always today — the day you draft the letter.",
    "Check spelling, grammar, punctuation and the recipient’s address block. The body of the letter is the firm’s and is not yours to reformat."];
  const ticks = tpl.id === "medlorcor"
    ? "For this activity, tick <b>all four</b> checklist items (the itemized statement, the medical records, the Unsworn Declaration of Custodian of Records and the initial evaluation), and tick whichever of the two declarations — executed in Nevada, or outside it — matches your case."
    : "";
  const list = ticks ? common.slice(0, 2).concat(ticks, common.slice(2)) : common;
  return `<details class="card lor-steps"><summary>📋 Instructions for this activity</summary><ol>${list.map(x => `<li>${x}</li>`).join("")}</ol>
    <p class="lor-muted">Save it as <code>${e(tpl.naming)}</code> in your assigned Assessment/Activities folder.</p></details>`;
}
function editor(no){
  const tabs = TEMPLATES.map(t => `<button type="button" class="${L.tab === t.id ? "on" : ""}" onclick="FTMedlor.tab('${t.id}')">${e(t.title.split(":")[0])}</button>`).join("");
  const tpl = TEMPLATES.find(t => t.id === L.tab) || TEMPLATES[0];
  const custom = fileNameFor(tpl, no) !== conventionName(tpl, no);
  return `<section class="lor-ed"><div class="lsh-subtabs lor-tabs" role="tablist">${tabs}</div>
    <h2 class="lor-ed-h">${e(tpl.title)}</h2>
    ${steps(tpl)}
    <div class="card lor-paper">${renderLetter(tpl)}</div>
    <div class="lor-file">
      <label class="lor-file-l" for="mlFile">File name</label>
      <div class="lor-file-row">
        <input id="mlFile" class="lor-file-in" type="text" spellcheck="false" autocomplete="off" aria-describedby="mlFileHelp"
               value="${e(fileNameFor(tpl, no))}" oninput="FTMedlor.name('${tpl.id}', this.value)">
        <span class="lor-file-ext">.pdf</span>
        <button class="btn btn-ghost btn-sm" type="button" id="mlFileReset" onclick="FTMedlor.resetName('${tpl.id}')"${custom ? "" : " disabled"}>↺ Reset to the convention</button>
      </div>
      <p class="lor-muted" id="mlFileHelp">The trainers’ convention, filled in for you: <code>${e(tpl.naming || "")}</code>. Edit it if your trainer asks for a different name — what is in the box is what the file is called.</p>
    </div>
    <div class="lor-actions">
      <button class="btn btn-navy" type="button" onclick="FTMedlor.pdf('${tpl.id}')">⬇ Download the letter (PDF)</button>
      <button class="btn btn-ghost" type="button" onclick="FTMedlor.word('${tpl.id}')">⬇ Download as Word</button>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTMedlor.copyName('${tpl.id}')">📋 Copy the file name</button>
      <span class="lor-save" id="mlSave"></span></div>
    <p class="lor-muted lor-naming">Upload the file you download into the Smart Advocate demo yourself.</p></section>`;
}
function renderPage(){
  if(!state.traineeId && !state.isAdmin && !state.adminPreview) return `<div class="card" style="padding:28px;">Sign in to open the Medical Provider LOR Drafting Activity.</div>`;
  if(adminOn()) return renderAdmin();
  if(L.id !== state.traineeId && !L.loading) load(state.traineeId);
  if(L.err) return `<div class="card" style="padding:28px;">${e(L.err)} <button class="btn btn-ghost btn-sm" onclick="FTMedlor.reload()">Try again</button></div>`;
  if(!L.draft) return `<div class="card" style="padding:28px;">Loading your drafting activity…</div>`;
  const no = myCaseNo();
  const preview = (state.adminPreview && !state.traineeId)
    ? `<div class="card lor-preview-note">👁 <b>Trainee view</b> — this is the page as a trainee sees it. Nothing you type here is saved; a trainee drafts on their own account.</div>` : "";
  return `${preview}<div class="lor-hero"><p class="lor-eyebrow">🧰 Drafting Tools</p><h1>Medical Provider LOR Drafting Activity</h1>
      <p>Draft a medical records request and a lien balance verification letter for the provider your trainer assigned you.</p></div>
    ${crossLink()}${notice()}${objective()}${caseCard(no)}${no ? editor(no) : ""}`;
}

/* ---------- the trainer: who gets which provider ---------- */
const A = {rows:null, loading:false, open:{}};
async function loadAdmin(){
  A.loading = true;
  try{
    const keys = (await sharedList("trainee:")) || [];
    const ids = keys.map(k => String(k).replace(/^trainee:/, ""));
    const people = await (window.ftGetMany ? ftGetMany(ids.map(id => "trainee:" + id)) : sharedGetMany(ids.map(id => "trainee:" + id)));
    const rows = ids.map((id, i) => ({id, rec: people[i] || {}})).filter(x => x.rec && !x.rec.archived && x.rec.approved)
      .map(x => ({id:x.id, name:x.rec.name || x.id, batch:x.rec.batch || ""}));
    const assigns = await (window.ftGetMany ? ftGetMany(rows.map(x => "medlorassign:" + x.id)) : sharedGetMany(rows.map(x => "medlorassign:" + x.id)));
    rows.forEach((x, i) => { x.a = assigns[i] || null; });
    A.rows = rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }catch(err){ A.rows = []; }
  A.loading = false;
  if(state.view === "medlor") render();
}
function renderAdmin(){
  if(!A.rows && !A.loading) loadAdmin();
  useScratch();
  const no = myCaseNo();
  const opts = no => CASES.map((c, i) => `<option value="${i + 1}"${no === i + 1 ? " selected" : ""}>${e(caseName(i + 1))}</option>`).join("");
  const groups = {}; (A.rows || []).forEach(x => { (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a, b) => (a === "") - (b === "") || b.localeCompare(a, undefined, {numeric:true}));
  return `<div class="lor-hero"><p class="lor-eyebrow">📚 Resource Library</p><h1>Medical Provider LOR Drafting Activity</h1>
      <p>Hand each trainee one of the ${CASES.length} medical providers. They draft both letters on this page and download them to upload into the Smart Advocate demo themselves.</p></div>
    ${crossLink()}${notice()}
    <section class="card lor-assign"><h2>🧑‍🏫 Assign providers</h2>
      <p class="lor-muted">One provider per trainee. A trainee sees their provider’s details and both templates as soon as you assign one; changing it keeps whatever they have already drafted.</p>
      ${!A.rows ? `<p class="lor-muted">Loading the trainees…</p>` : !A.rows.length ? `<p class="lor-muted">No approved trainee yet.</p>`
        : keys.map(b => `<div class="lor-batch"><b>📁 ${e(b ? "Batch " + b : "No batch set")}</b>
          ${groups[b].map(x => `<div class="lor-arow"><span class="lor-aname">${e(x.name)}</span>
            <select aria-label="Provider for ${e(x.name)}" onchange="FTMedlor.assign('${e(x.id)}', this.value, this)"><option value="">— not assigned —</option>${opts(x.a && Number(x.a.case))}</select>
            <span class="lor-astate">${x.a && x.a.case ? `assigned${x.a.at ? " " + e(new Date(x.a.at).toLocaleDateString()) : ""}` : ""}</span></div>`).join("")}</div>`).join("")}
      <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" type="button" onclick="FTMedlor.refreshAdmin()">Refresh</button></div></section>
    <section class="card lor-preview"><h2>👁 The activity as a trainee sees it</h2>
      <p class="lor-muted">The whole activity, working, so you can check the set-up before you hand the providers out:
        read the notes, fill the highlighted fields, tick the boxes and download both letters exactly as a trainee does.
        A test copy — nothing you type here is saved, and no trainee sees it.</p>
      <label class="lor-pick">Draft as <select aria-label="Draft as which provider" onchange="FTMedlor.preview(this.value)">${opts(no)}</select>
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTMedlor.clearTest()">Clear what I typed</button></label></section>
    ${objective()}${caseCard(no)}${editor(no)}`;
}

/* ---------- downloads (shared engine with js/ft-lor.js) ---------- */
const pdfSafe = s => String(s == null ? "" : s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, "-").replace(/☐/g, "[  ]").replace(/☒|☑/g, "[X]")
  .replace(/[^\x00-\xff]/g, "").replace(/ {2,}/g, m => m);
const PT = 72;
function pdfRuns(tpl, b, d, n){
  const out = [];
  b.runs.forEach(r => {
    let t;
    if(r.f) t = r.k === "date" ? letterDate() : (r.k === "manual" ? (d.fields[r.f] != null ? d.fields[r.f] : r.ph) : (d.fields[r.f] || r.ph));
    else t = String(r.x).replace(/☐/g, () => (d.checks["cb" + (n.i++)] ? "[X]" : "[  ]"));
    if(t !== "") out.push({t:pdfSafe(t), b:!!r.b, i:!!r.i, u:!!r.u, sz:r.sz || (tpl.page || {}).sz || 12});
  });
  return out;
}
async function imgData(src){
  try{
    const blob = await (await fetch(src)).blob();
    return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.onerror = () => r(null); f.readAsDataURL(blob); });
  }catch(err){ return null; }
}
async function pdfLetterhead(doc, h, L, R, TOP, PW){
  if(!h || !(h.offices || []).length) return TOP;
  const W = PW - L - R;
  let y = TOP;
  const logo = await imgData("/img/vanlaw-logo.png"), rule = await imgData("/img/vanlaw-rule.png");
  const logoW = 115, logoH = logo ? logoW * 167 / 313 : 0;
  if(logo) doc.addImage(logo, "PNG", L, y, logoW, logoH);
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
  let y = await pdfLetterhead(doc, head(), L, R, TOP, PW);
  const face = r => { doc.setFont("helvetica", r.b && r.i ? "bolditalic" : r.b ? "bold" : r.i ? "italic" : "normal").setFontSize(r.sz); };
  const w = r => { face(r); return doc.getTextWidth(r.t); };
  const newPage = h => { if(y + h > BOT){ doc.addPage(); y = TOP; } };
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
  const wrap = (pieces, width) => {
    const words = [];
    pieces.forEach(r => String(r.t).split(/(\s+)/).forEach(t => { if(t !== "") words.push(Object.assign({}, r, {t})); }));
    const lines = []; let line = [], used = 0;
    words.forEach(word => {
      const ww = w(word);
      if(used + ww > width && line.length && word.t.trim()){ lines.push(line); line = []; used = 0; }
      if(!line.length && !word.t.trim()) return;
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
    if(!pieces.length){ y += lead; return; }
    const left = L + (ind.l || 0) * PT, right = R + Math.max(0, ind.r || 0) * PT;
    const width = PW - left - right;
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

window.FTMedlor = {
  reload(){ L.id = null; L.draft = null; L.err = ""; render(); },
  refreshAdmin(){ A.rows = null; render(); },
  tab(id){ L.tab = id; render(); window.scrollTo(0, 0); },
  preview(v){ state.medlorPreviewCase = Number(v) || 1; render(); },
  clearTest(){ scratch = null; useScratch(); render(); toast("Cleared the test copy."); },
  grow(el){ el.style.height = "auto"; el.style.height = Math.min(520, el.scrollHeight + 2) + "px"; },
  set(tid, f, v){ letter(tid).fields[f] = v; letter(tid).updatedAt = new Date().toISOString(); queueSave(); },
  tick(tid, id){ const d = letter(tid); d.checks[id] = !d.checks[id]; queueSave(); render(); },
  name(tid, v){
    const d = letter(tid); d.file = v; d.updatedAt = new Date().toISOString(); queueSave();
    const btn = document.getElementById("mlFileReset"), tpl = TEMPLATES.find(t => t.id === tid);
    if(btn && tpl) btn.disabled = fileNameFor(tpl, myCaseNo()) === conventionName(tpl, myCaseNo());
  },
  resetName(tid){ letter(tid).file = ""; queueSave(); render(); },
  fileName(tid){ const tpl = TEMPLATES.find(t => t.id === tid); return tpl ? fileNameFor(tpl, myCaseNo()) : ""; },
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
    const lines = [`Medical Provider LOR Drafting Activity`, caseName(no), "", "Provider & client details:"]
      .concat(noteRows(c).map(([k, v]) => `  • ${k}: ${v}`),
              ["", "This is a standalone drafting activity. Do not create a case file in the CMS for it."]);
    await makePdf(`Case Notes - ${caseName(no)}`, lines);
  },
  async assign(id, v, el){
    const no = Number(v) || 0;
    el.disabled = true;
    try{
      const rec = no ? {case:no, at:new Date().toISOString(), by:"trainer"} : {case:null, at:new Date().toISOString(), by:"trainer"};
      if(await sharedSet("medlorassign:" + id, rec) === false) throw new Error("save");
      const row = (A.rows || []).find(x => x.id === id); if(row) row.a = rec;
      toast(no ? "✓ Provider assigned." : "Provider cleared.");
    }catch(err){ toast("Couldn’t save the assignment. Check your connection."); }
    el.disabled = false; render();
  }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view !== "medlor") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-lor">${renderPage()}</main>` + renderFooter();
  paintSave();
  try{ afterRender(); }catch(err){}
  document.querySelectorAll(".lorl-ta").forEach(FTMedlor.grow);
};
// 🧰 Drafting Tools in the Practice Lab, alongside the LOR Drafting Activity's own card.
window.ftMedlorCard = function(){
  const open = state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(8) : true);
  if(isTrainee() && L.id !== state.traineeId && !L.loading) load(state.traineeId);
  const no = isTrainee() && L.draft ? myCaseNo() : null;
  const note = !open ? "" : adminOn() ? "Assign each trainee a provider, and draft a test copy yourself."
    : no ? `Your provider: <b>${e(caseName(no))}</b>.` : "Waiting for your trainer to assign your provider.";
  return `<div class="card fts-card ${open ? "" : "fts-locked"}"><div class="fts-kicker">Medical Records Specialist Training${open ? "" : " · opens with this lesson"}</div>
    <h3>🏥 Medical Provider LOR Drafting Activity</h3>
    <p class="fts-note">Fill in the firm’s own templates on the page and download the finished letters as a <b>PDF</b>, named by the trainers’ convention — which you can edit before you download. Upload them into the Smart Advocate demo yourself: nothing here becomes a CMS case file.</p>
    ${note ? `<p class="fss-case">${note}</p>` : ""}
    <div class="fts-label">Templates in this tool</div>
    <ul class="fts-tpl">${TEMPLATES.map(t => `<li>${e(String(t.title).replace(/^Activity \d+:\s*/, ""))}</li>`).join("")}</ul>
    <div class="fts-tool-act">${open ? `<button class="btn btn-navy btn-sm" type="button" onclick="goto('medlor')">Open the tool</button>`
      : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div>`;
};
})();
