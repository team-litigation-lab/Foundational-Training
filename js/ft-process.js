/* ============================================================
   Process Questions — each lesson's answer sheet, answered on the platform
   Loaded after js/ft-monitoring.js. ✍️ Process Questions (#/process), the
   lesson's last slide, and a button on its lesson card.
     • Trainees answer each question (saved to process:<id> as they type) and
       submit the sheet. They can save it to their Google Drive with the
       proper name: 📄 Save to My Google Drive copies the answers and opens a
       new Google Doc already named with the sheet's naming convention (in
       their trainee folder once they've saved its link), or ⬇ Download as
       Word gives a file with that name to upload.
     • Admin → ✍️ Process Questions: batch → trainee → each answer sheet
       (submitted or not, how many answered, the answers), and the line for
       the ranking report ("Out of N expected answer sheets, X were submitted").
     • The Process Questions are the Knowledge Check: 📝 Submit for Grading on a sheet grades it (#/kc), in
       the facilitator's feedback DNA (js/ft-facilitator-dna.js), and the trainer adds their own review
       (Admin → ✍️ Process Questions: a comment per answer, an overall comment and a final score), saved in
       kcreview:<id>, which the trainee reads but never writes. The questions are no longer a slide: the
       lesson's ✓ Finish lesson opens its Knowledge Check.
     • PROCESS_SETS: one per lesson. Add a lesson's questions there.
   ============================================================ */
(function(){
const PROCESS_SETS = [
  {id:"va-essentials", lesson:1, title:"Virtual Assistant Essentials", file:"VA_Essentials_Process_Question_Answers", questions:[
    "Analyze a hypothetical case: A breach of contract with parties in two states. Which court system would have jurisdiction? Why?",
    "Assess the advantages and disadvantages of pursuing a case in federal court instead of state court for a personal injury claim.",
    "Examine the core responsibilities of a Legal VA and compare them with those of an in-house legal assistant. What are the operational implications for the firm?",
    "Scrutinize the challenges that solo attorneys face without VA support. How does a Legal VA help resolve these?",
    "Evaluate how Legal VAs contribute to law firm efficiency and client satisfaction. Which benefit do you think has the greatest long-term impact, and why?",
    "Assess how firm size impacts the level of autonomy, multitasking, and specialization expected of a Legal VA.",
    "Appraise the effectiveness of formal vs. informal communication strategies when working with different types of attorneys.",
    "Analyze the key cultural values in U.S. professional settings (e.g., directness, time orientation, individualism) and compare them with typical Filipino and Latin American values.",
    "Provide a scenario where a VA’s culturally influenced approach leads to miscommunication with a U.S.-based attorney. What were the causes?",
    "Critique the statement: “Filipino and Latin American Legal VAs should completely adopt American communication styles to be effective.”"]},
  {id:"law-firm-communication", lesson:2, title:"Law Firm Communication", file:"Law_Firm_Communications_Training_Process_Question_Answers", questions:[
    "Analyze the key features of softphones that make them ideal for remote legal support. How do they compare to traditional phone systems?",
    "Evaluate the pros and cons of using softphones in high-confidentiality legal settings. What security risks must be considered?",
    "Compare call handling strategies when speaking with new clients versus existing clients with ongoing cases.",
    "Judge whether scripted calls are more effective than freeform conversations in maintaining professionalism and compliance.",
    "Analyze a situation where a VA might unintentionally breach attorney-client privilege. What safeguards should be in place?",
    "Break down the difference between confidential information and privileged communication. Why is this distinction important?",
    "Evaluate the responsibility of a Legal VA in protecting attorney-client privilege. What steps must they actively take?",
    "Assess how remote work increases both the risk and need for maintaining privileged communication boundaries.",
    "Analyze the type of information that can be shared with each party (e.g., client, insurance adjuster, court staff). What factors determine what can and cannot be disclosed?",
    "Compare the communication protocols and tone required when interacting with clients vs. defense counsel or court staff.",
    "Evaluate the risks of providing incomplete or incorrect information to each type of entity. Which scenario could be most legally damaging?",
    "Assess how understanding each party's role in a case helps the Legal VA communicate more effectively and ethically."]},
  // one answer sheet for two lessons: questions 1–3 are Personal Injury Process Flow's, 4–10 Receptionist Training's
  {id:"pi-workflow-reception", lesson:3, title:"PI Workflow and Reception Training", file:"PI_Workflow_and_Reception_Training_Process_Questions", kc:{3:[0,1,2], 4:[3,4,5,6,7,8,9]}, questions:[
    "Analyze the step-by-step process of a personal injury case from client intake to settlement. What tasks should a Legal VA expect to support at each stage?",
    "Examine how missing documentation (e.g., police reports, medical records) at the intake or treatment stage could affect the value and outcome of a case.",
    "Evaluate how efficient case intake impacts the strength and pace of a personal injury claim. What are the potential legal and financial consequences of a disorganized intake?",
    "Analyze the role of a receptionist in shaping a law firm’s first impression. What verbal and non-verbal cues matter most?",
    "Evaluate how poor receptionist behavior can affect client trust and case intake efficiency.",
    "Assess the importance of triaging calls and visitors correctly. What are the consequences of misdirecting a client or opposing counsel?",
    "Analyze the differences in tone, legal boundaries, and urgency when dealing with each of the following: a worried client vs. an insurance adjuster vs. a court clerk.",
    "Evaluate how understanding each entity’s objective helps a VA respond more effectively and legally.",
    "Break down how one overlooked best practice (e.g., failing to confirm email content with the attorney) could lead to legal exposure.",
    "Assess the importance of call screening and note-taking before a transfer. When is it appropriate to escalate versus handle the call independently?"]},
  {id:"intake-specialist", lesson:6, title:"Intake Specialist Training", file:"Intake_Specialist_Training_Process_Question_Answers", questions:[
    "Analyze the responsibilities of an intake specialist in the legal field. How do they differ from general administrative roles?",
    "Analyze the role of supporting documents (e.g., police reports, medical records, photos) in establishing liability and damages.",
    "Evaluate the challenges of collecting documents from third parties (e.g., hospitals, police departments). How can Legal VAs overcome them?",
    "Analyze how best practices in intake relate to client satisfaction, attorney workflow, and overall case strength.",
    "Evaluate the effectiveness of call scripts, email templates, and automated follow-ups in maintaining consistency and compliance.",
    "Analyze the components typically included in a standard personal injury intake packet. What legal or strategic purpose does each serve?",
    "Evaluate the importance of customizing intake packets by case type (e.g., auto accident vs. slip and fall). When is a generic packet insufficient?",
    "Analyze the differences between retainer and contingency fee arrangements in personal injury cases. How do they affect client onboarding and case expectations?",
    "Examine how no-shows and cancellations affect firm productivity. What scheduling strategies help reduce them?",
    "Evaluate the effectiveness of confirmation and reminder systems in increasing client attendance for consultations."]},
  {id:"claims-specialist", lesson:7, title:"Claims Specialist Training", file:"Claims_Specialist_Training_Process_Question_Answers", questions:[
    "Judge whether technical knowledge or negotiation skills are more critical for an effective claims specialist and why.",
    "Evaluate the consequences of failing to open a UM/UIM claim in time. What are the procedural and legal risks?",
    "Assess the impact of a delayed or poorly written LOR on the efficiency of a claim’s progress.",
    "Compare declaration pages from multiple insurance carriers. How can the format or terminology affect interpretation?",
    "Break down a case scenario: the claimant was partially at fault. How does comparative liability affect coverage decisions?",
    "Evaluate how the presence of multiple liable parties complicates coverage resolution and claim strategy.",
    "Analyze how personal auto insurance and rideshare company insurance interact in accident claims involving Uber or Lyft.",
    "Assess the advantages and limitations of pursuing a claim through a rideshare company’s insurance vs. the driver’s personal policy.",
    "Judge how much automation (e.g., calendar reminders, templates) is appropriate in the claim process without losing the personal touch.",
    "Evaluate the ethical and legal responsibilities of notifying the client when a case is dropped."]},
  {id:"medical-records-specialist", lesson:8, title:"Medical Records Specialist Training", file:"Medical_Records_Specialist_Training_Process_Question_Answers", questions:[
    "Evaluate the impact of delayed or missing records on the ability to prepare a strong demand letter or settlement package.",
    "Compare a valid HIPAA-compliant release form to a non-compliant one. What elements must be present for legal use?",
    "Evaluate the consequences of mishandling PHI in a legal setting. What are the ethical, legal, and financial implications?",
    "Analyze the difference between medical liens and letters of protection. How do both impact case settlement?",
    "Evaluate the role of the Legal VA in tracking and communicating lien balances. Why is accuracy critical in lien resolution?",
    "Assess the pros and cons of outsourcing medical records requests to third-party vendors.",
    "Break down the differences between a standard LOR and one sent to a medical facility versus an insurance company.",
    "Analyze the difference between medical bills, treatment records, diagnostic reports, and discharge summaries. What role does each play in a demand letter?",
    "Compare E-Portals from two major healthcare networks. What features should Legal VAs prioritize?",
    "Judge the security and compliance measures of portal usage for PHI. What risks still exist?"]},
  {id:"lien-negotiator", lesson:9, title:"Lien Negotiator Training", file:"Lien_Negotiator_Process_Questions_Answers", questions:[
    "Analyze the specific responsibilities of a lien negotiator in relation to the post-settlement process. How do they interact with attorneys, clients, and providers?",
    "Analyze the difference between statutory, contractual, and medical provider liens. What are the legal implications of each?",
    "Compare the documentation required for a simple case with one that includes third-party liens, child support obligations, and extensive treatment.",
    "Analyze the typical factors providers consider when agreeing to a medical bill reduction (e.g., settlement amount, client hardship).",
    "Assess how persuasive documentation (e.g., settlement amount, lien summary, client hardship letter) influences negotiation outcomes.",
    "Analyze the purpose of a settlement release and its binding nature once signed. What rights does the client waive?",
    "Evaluate the importance of reviewing the release terms with the client. What issues could arise if the client signs without understanding?",
    "Analyze how the closing statement reflects the full financial breakdown of a personal injury case.",
    "Evaluate the role of transparency in the closing statement. How does it support trust and prevent disputes?",
    "Analyze the net sheet’s function in summarizing what the client will receive after deductions. Why must it match the closing statement exactly?",
    "Judge whether the net sheet should be presented before or after lien negotiations are finalized and why.",
    "Assess whether it’s appropriate for the legal team to pressure clients to accept settlements. Where is the ethical boundary?"]}
].filter(set=>DAYS.find(d=>d.id===set.lesson));   // a lesson taken off the platform (build/lessons/off/) takes its set with it
window.FT_PROCESS_SETS = PROCESS_SETS;
const has = v => String(v == null ? "" : v).trim().length > 0;
const e = v => esc(String(v == null ? "" : v));
const firstName = () => String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";
// The sheet's naming convention, with the trainee's first name: VA_Essentials_Process_Question_Answers (Jamie)
const fileName = (set, first) => `${set.file} (${first || firstName() || "VA’s first name"})`;
const folderId = url => { const m = String(url||"").match(/folders\/([a-zA-Z0-9_-]{10,})/) || String(url||"").match(/[?&]id=([a-zA-Z0-9_-]{10,})/); return m ? m[1] : ""; };

/* ---------- the trainee's answers ---------- */
const FP = {id:null, data:null, loading:false, err:"", timer:null, saving:false, savedAt:null, open:{}};
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["process"]);
async function load(id){
  FP.loading = true; FP.err = ""; FP.id = id;
  try{ FP.data = (await sharedGet("process:"+id)) || {v:1, sets:{}}; if(!FP.data.sets) FP.data.sets = {}; }
  catch(err){ FP.err = "Couldn't load your answers. Check your connection and try again."; }
  FP.loading = false;
  if(["process","dashboard","day"].includes(state.view)) render();
}
function sheet(sid){ const s = FP.data.sets; return s[sid] || (s[sid] = {answers:[], submittedAt:"", updatedAt:""}); }
function queueSave(){
  FP.data.updatedAt = new Date().toISOString();
  clearTimeout(FP.timer); FP.saving = true; paintSave();
  FP.timer = setTimeout(async ()=>{ const ok = await sharedSet("process:"+FP.id, FP.data); FP.saving = false; FP.savedAt = ok === false ? null : new Date(); paintSave(ok); }, 1000);
}
function paintSave(ok){ const el = document.getElementById("fpSave"); if(el) el.textContent = FP.saving ? "Saving…" : (ok===false ? "⚠ Not saved. Check your connection." : (FP.savedAt ? "All changes saved" : "")); }
const answered = (set, x) => set.questions.filter((q,i)=>has(((x||{}).answers||[])[i])).length;
function statusOf(set, x){
  if(x && x.submittedAt) return {k:"done", t:"Submitted"};
  return answered(set, x) ? {k:"part", t:"In progress"} : {k:"none", t:"Not started"};
}
const setOpen = set => state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(set.lesson) : true);

// The answers as a document: the same text goes to the clipboard (for a Google Doc) and into the Word file.
function docHtml(set, x, first){
  const name = String(state.certName || state.traineeName || first || "");
  return `<h2>${e(set.title)} — Process Questions</h2><p><b>Name:</b> ${e(name)}<br><b>Date:</b> ${e(new Date().toLocaleDateString())}</p>` +
    set.questions.map((q,i)=>`<p><b>${i+1}. ${e(q)}</b></p><p>${e(((x||{}).answers||[])[i]||"").replace(/\n/g, "<br>")}</p>`).join("");
}
function docText(set, x){
  return `${set.title} — Process Questions\n\n` + set.questions.map((q,i)=>`${i+1}. ${q}\n${((x||{}).answers||[])[i]||""}\n`).join("\n");
}
async function copyRich(html, text){
  try{
    if(navigator.clipboard && window.ClipboardItem && window.isSecureContext){
      await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([html], {type:"text/html"}), "text/plain": new Blob([text], {type:"text/plain"})})]);
      return true;
    }
  }catch(err){}
  try{ await navigator.clipboard.writeText(text); return true; }catch(err){ return false; }
}

function setCard(set){
  const x = FP.data.sets[set.id] || {answers:[]}, s = statusOf(set, FP.data.sets[set.id]), locked = !setOpen(set);
  const open = FP.open[set.id] != null ? FP.open[set.id] : true;
  const name = fileName(set);
  if(locked) return `<div class="card fp-set fp-locked"><div class="fp-head"><b>${e(set.title)}</b><span class="fp-st st-none">🔒 Opens with the lesson</span></div></div>`;
  return `<details class="card fp-set" ${open?"open":""} ontoggle="FTProcess.toggle('${set.id}', this.open)">
    <summary class="fp-head"><b>${e(set.title)}</b><span class="fp-count" id="fpCount-${set.id}">${answered(set, x)} of ${set.questions.length} answered</span><span class="fp-st st-${s.k}" id="fpSt-${set.id}">${s.t}</span></summary>
    <div class="fp-body">
      <div class="fp-name"><span>Naming convention</span><code>${e(name)}</code>
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.copyName('${set.id}')">📋 Copy</button></div>
      <ol class="fp-qs">${set.questions.map((q,i)=>`<li><div class="fp-q">${e(q)}</div>
        <textarea rows="4" placeholder="Your answer, in complete sentences." oninput="FTProcess.set('${set.id}',${i},this.value)">${e((x.answers||[])[i]||"")}</textarea></li>`).join("")}</ol>
      <div class="fp-actions">
        ${kcLessons(set).map(l=>{ const best = kcBest(l); return `<button class="btn btn-navy btn-sm" type="button" onclick="FTProcess.grade('${set.id}', ${l})">📝 ${kcLessons(set).length > 1 ? `Knowledge Check: ${e(ftName(l))}` : "Submit for Grading"}${best != null ? ` · ${best}%` : ""}</button>`; }).join("")}
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.toDrive('${set.id}')">📄 Save to My Google Drive</button>
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.word('${set.id}')">⬇ Download as Word</button>
        ${FP.data.folder ? `<a class="btn btn-ghost btn-sm" href="${e(FP.data.folder)}" target="_blank" rel="noopener noreferrer">📁 Open My Trainee Folder</a>` : ""}
      </div>
      ${x.submittedAt ? `<p class="fp-muted">Submitted ${e(new Date(x.submittedAt).toLocaleString())}.</p>` : ""}
      <p class="fp-muted">These questions are this lesson’s <b>Knowledge Check</b>: <b>📝 Submit for Grading</b> grades each answer (70% passes the lesson), and your trainer adds their own review.</p>
      <p class="fp-muted"><b>📄 Save to My Google Drive</b> copies your answers and opens a new Google Doc already named <b>${e(name)}</b>${FP.data.folder ? " in your trainee folder" : ""}. Paste them in with Ctrl+V. <b>⬇ Download as Word</b> gives you the file with the same name, to upload to your trainee folder.</p>
    </div></details>`;
}
function renderPage(){
  if(!state.traineeId && !state.isAdmin) return `<div class="card" style="padding:28px;">Sign in to answer the Process Questions.</div>`;
  if(state.isAdmin && !state.adminPreview) return `<div class="card" style="padding:28px;">Trainees answer the Process Questions here. See every trainee’s answers in <a class="fp-link" onclick="state.adminTab='process'; goto('admin')">Admin → ✍️ Process Questions</a>.</div>`;
  if(FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  loadReview();
  if(FP.err) return `<div class="card" style="padding:28px;">${e(FP.err)} <button class="btn btn-ghost btn-sm" onclick="FTProcess.reload()">Try again</button></div>`;
  if(!FP.data) return `<div class="card" style="padding:28px;">Loading your answers…</div>`;
  return `<div class="fp-hero"><h1>✍️ Process Questions · Knowledge Checks</h1>
      <p>Each lesson’s process questions are its Knowledge Check. Answer every question in complete sentences, then <b>📝 Submit for Grading</b>: each answer is graded, and your trainer adds their review. Your answers save as you type. <span class="fp-save" id="fpSave"></span></p></div>
    <div class="card fp-folder">
      <label for="fpFolder"><b>📁 My Trainee Folder</b> <span class="fp-muted">(its Google Drive link, so new documents are created there)</span></label>
      <div class="fp-folder-row"><input id="fpFolder" type="url" placeholder="https://drive.google.com/drive/folders/…" value="${e(FP.data.folder||"")}">
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.saveFolder()">Save</button></div>
    </div>
    ${PROCESS_SETS.map(setCard).join("")}`;
}

window.FTProcess = {
  set(sid, i, v){
    const x = sheet(sid); x.answers[i] = v; x.updatedAt = new Date().toISOString(); queueSave();
    const set = PROCESS_SETS.find(s=>s.id===sid), c = document.getElementById("fpCount-"+sid), st = document.getElementById("fpSt-"+sid);
    if(c) c.textContent = `${answered(set, x)} of ${set.questions.length} answered`;
    if(st){ const s = statusOf(set, x); st.className = "fp-st st-"+s.k; st.textContent = s.t; }
  },
  async submit(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid), x = sheet(sid), n = answered(set, x);
    if(n < set.questions.length && !confirm(`You’ve answered ${n} of ${set.questions.length} questions. Submit anyway?`)) return;
    x.submittedAt = new Date().toISOString(); queueSave();
    toast(`✓ ${set.title} Process Questions submitted.`); render();
  },
  // 📝 Submit for Grading: the sheet's answers go to its lesson's Knowledge Check (the same answers), graded there.
  grade(sid, lessonId){ FTKc.open(lessonId); setTimeout(()=>FTKc.submit(lessonId), 0); },
  copyName(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid); const t = fileName(set);
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(()=>toast("Copied. Use it as your file name."), ()=>toast("Couldn’t copy. Select the name instead."));
  },
  // Copies the answers, then opens a new Google Doc with the proper name (in the trainee folder if it's saved).
  async toDrive(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid), x = sheet(sid);
    const tab = window.open("about:blank", "_blank");
    const ok = await copyRich(docHtml(set, x), docText(set, x));
    const q = new URLSearchParams({title: fileName(set)}); const f = folderId(FP.data.folder); if(f) q.set("folder", f);
    const url = "https://docs.google.com/document/create?" + q;
    if(tab) tab.location.href = url; else window.open(url, "_blank");
    toast(ok ? "Your answers are copied. Paste them into the new Google Doc with Ctrl+V." : "The Google Doc is open. Copy your answers from here and paste them in.");
  },
  word(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid), x = sheet(sid);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${e(fileName(set))}</title></head><body style="font-family:Arial,sans-serif;font-size:11pt;">${docHtml(set, x)}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿", html], {type:"application/msword"}));
    a.download = fileName(set) + ".doc"; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },
  saveFolder(){
    const v = String((document.getElementById("fpFolder")||{}).value || "").trim();
    if(v && !/^https:\/\/drive\.google\.com\//.test(v)){ toast("Paste your trainee folder’s Google Drive link (it starts with https://drive.google.com/)."); return; }
    FP.data.folder = v; queueSave(); toast(v ? "Trainee folder saved." : "Trainee folder removed."); render();
  },
  toggle(sid, open){ FP.open[sid] = open; },
  reload(){ FP.id = null; FP.err = ""; render(); }
};

/* ---------- the lesson: its last slide ---------- */
// Which questions each lesson's Knowledge Check asks: a set's own lesson, or (kc) split across lessons.
const kcLessons = set => set.kc ? Object.keys(set.kc).map(Number) : [set.lesson];
const kcQuestionsFor = lessonId => PROCESS_SETS.flatMap(set => kcLessons(set).includes(lessonId)
  ? (set.kc ? set.kc[lessonId] : set.questions.map((_,i)=>i)).map(i=>({set, i, q:set.questions[i]})) : []);
window.ftKcQuestions = kcQuestionsFor;
// The questions aren't a slide any more (they're the Knowledge Check): the lesson's ✓ Finish lesson opens its Knowledge
// Check (finishTrainingForDay below). A position saved on the old last slide lands on the lesson's last page.

/* ---------- admin: every trainee's answer sheets ---------- */
const FPA = {rows:null, loading:false, open:{}, sheetOpen:{}, closed:{}, kcOpen:{}};
async function loadAdmin(){
  FPA.loading = true;
  try{
    const keys = (await sharedList("process:")) || [];
    // The trainee records in one request, then the active trainees' answer sheets (sharedGetMany; ftGetMany in js/ft-updates.js).
    const ids = keys.map(k=>String(k).replace(/^process:/, ""));
    const people = await sharedGetMany(ids.map(id=>"trainee:"+id));
    const rows = ids.map((id, i)=>{ const rec = people[i]; return {id, name:(rec&&rec.name)||id, batch:(rec&&rec.batch)||"", archived:!!(rec&&rec.archived)}; }).filter(x=>!x.archived);
    const sheets = await ftGetMany(rows.map(x=>"process:"+x.id).concat(rows.map(x=>"kcreview:"+x.id)));
    rows.forEach((x, i)=>{ x.p = sheets[i] || {sets:{}}; x.rv = sheets[rows.length + i] || {lessons:{}}; if(!x.rv.lessons) x.rv.lessons = {}; });
    FPA.rows = rows.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  }catch(err){ FPA.rows = []; }
  FPA.loading = false;
  if(state.view==="admin" && state.adminTab==="process") render();
}
// The ranking report's line, in the facilitator's words.
function reportLine(x){
  const sets = PROCESS_SETS, done = sets.filter(s=>((x.p.sets||{})[s.id]||{}).submittedAt);
  const missing = sets.filter(s=>!done.includes(s));
  const partial = done.filter(s=>answered(s, x.p.sets[s.id]) < s.questions.length);
  if(!missing.length) return "Process Questions Responses: COMPLETE" + (partial.length ? "; however, " + partial.map(s=>{ const a = x.p.sets[s.id]; const left = s.questions.map((q,i)=>i+1).filter(i=>!has((a.answers||[])[i-1])); return `Item${left.length>1?"s":""} #${left.join(", #")} under the ${s.title} answer sheet ${left.length>1?"were":"was"} left unanswered`; }).join("; ") + "." : "");
  return `Process Questions Responses:\nOut of ${sets.length} expected answer sheet${sets.length===1?"":"s"}, ${done.length} ${done.length===1?"was":"were"} submitted. The following answer sheet${missing.length===1?" is":"s are"} missing:\n` + missing.map(s=>`- ${s.title}`).join("\n");
}
function renderAdminProcess(){
  if(!FPA.rows && !FPA.loading) loadAdmin();
  if(!FPA.rows) return `<div class="card" style="padding:24px;">Loading the answer sheets…</div>`;
  const groups = {}; FPA.rows.forEach(x=>{ (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a,b)=>(a==="")-(b==="") || b.localeCompare(a, undefined, {numeric:true}));
  return `<div class="card fp-admin"><h3>✍️ Process Questions</h3>
    <p class="fp-muted">Each trainee’s answer sheets, by batch: submitted or not, how many questions are answered, and the answers. The line under each trainee is written for the ranking report.</p>
    ${FPA.rows.length ? keys.map(b=>{ const closed = !!FPA.closed[b];
      return `<section class="fp-batch"><div class="fp-batch-hd" onclick="FTProcessAdmin.batch(${e(JSON.stringify(b))})">${closed?"▸":"▾"} <b>📁 ${e(b ? "Batch "+b : "No batch set")}</b> <span class="fp-muted">${groups[b].length} trainee${groups[b].length===1?"":"s"}</span></div>
      ${closed ? "" : groups[b].map(x=>{ const open = !!FPA.open[x.id], sub = PROCESS_SETS.filter(s=>((x.p.sets||{})[s.id]||{}).submittedAt).length;
        return `<div class="fp-arow"><div class="fp-arow-hd" onclick="FTProcessAdmin.row('${x.id}')">${open?"▾":"▸"} <b>${e(x.name)}</b> <span class="fp-pill ${sub===PROCESS_SETS.length?"ok":sub?"mid":"bad"}">${sub} of ${PROCESS_SETS.length} submitted</span> ${kcPills(x.p)}</div>
          ${open ? `<pre class="fp-report">${e(reportLine(x))}</pre>
            <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcessAdmin.copy('${x.id}')">📋 Copy for the Report</button>
            ${kcAdmin(x)}
            ${PROCESS_SETS.map(s=>{ const a = (x.p.sets||{})[s.id], st = statusOf(s, a), k = x.id+"|"+s.id;
              return `<div class="fp-asheet"><div class="fp-asheet-hd" onclick="FTProcessAdmin.sheet('${x.id}','${s.id}')">${FPA.sheetOpen[k]?"▾":"▸"} ${e(s.title)} <span class="fp-st st-${st.k}">${st.t}</span> <span class="fp-muted">${answered(s, a)} of ${s.questions.length} answered${a && a.submittedAt ? ` · ${e(new Date(a.submittedAt).toLocaleDateString())}` : ""}</span></div>
                ${FPA.sheetOpen[k] ? `<ol class="fp-aans">${s.questions.map((q,i)=>`<li><b>${e(q)}</b><div>${has(((a||{}).answers||[])[i]) ? e(a.answers[i]).replace(/\n/g, "<br>") : '<span class="fp-muted">(unanswered)</span>'}</div></li>`).join("")}</ol>` : ""}</div>`; }).join("")}` : ""}</div>`; }).join("")}</section>`; }).join("")
      : `<div class="fp-muted" style="margin:14px 0;">No trainee has started the Process Questions yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTProcessAdmin.refresh()">Refresh</button></div></div>`;
}
// The trainer's review of each Knowledge Check the trainee took: the graded attempt (score and the AI's feedback in the
// facilitator's DNA, per answer), and the trainer's own comment per answer, overall comment and final score.
function kcAdmin(x){
  const lessons = [...new Set(PROCESS_SETS.flatMap(kcLessons))].sort((a,b)=>a-b).filter(l=>DAYS.find(d=>d.id===l));
  const kc = (x.p && x.p.kc) || {};
  return `<div class="fp-kcadmin"><b class="fp-kcadmin-h">📝 Knowledge Checks: graded, then your review</b>
    ${lessons.map(l=>{ const rec = kc[l], rv = x.rv.lessons[l] || {}, k = x.id + "|" + l, open = !!FPA.kcOpen[k], last = rec && rec.last;
      const t = trainerScore(rv);
      return `<div class="fp-asheet"><div class="fp-asheet-hd" onclick="FTProcessAdmin.kc('${x.id}', ${l})">${open ? "▾" : "▸"} ${e(ftName(l))}
          ${rec && rec.attempts ? `<span class="fp-pill ${rec.best >= KC_PASS ? "ok" : "mid"}">graded best ${rec.best}% · ${rec.attempts} attempt${rec.attempts === 1 ? "" : "s"}</span>` : `<span class="fp-pill bad">not taken</span>`}
          ${t != null ? `<span class="fp-pill ${t >= KC_PASS ? "ok" : "mid"}">🧑‍🏫 final ${t}%</span>` : rv.comment ? `<span class="fp-pill">🧑‍🏫 commented</span>` : ""}</div>
        ${open ? `<div class="fp-kcform">
          ${last && last.summary ? `<p class="fp-muted"><b>Graded ${e(new Date(last.at).toLocaleString())}:</b> ${e(last.summary)}</p>` : ""}
          <ol class="fp-aans">${kcQuestionsFor(l).map(q=>{ const g = last && (last.items || []).find(it=>it.sid === q.set.id && it.i === q.i), a = (((x.p.sets || {})[q.set.id] || {}).answers || [])[q.i];
            return `<li value="${q.i+1}"><b>${e(q.q)}</b><div>${has(a) ? e(a).replace(/\n/g, "<br>") : '<span class="fp-muted">(unanswered)</span>'}</div>
              ${g ? `<div class="kc-fb kc-${kcTone(g.score)}"><b>${g.score}/10</b> ${e(g.feedback)}</div>` : ""}
              <textarea rows="2" data-note="${e(q.set.id + "|" + q.i)}" placeholder="Your comment on this answer (optional)">${e((rv.notes || {})[q.set.id + "|" + q.i] || "")}</textarea></li>`; }).join("")}</ol>
          <label class="fp-kclabel">Overall comment<textarea rows="3" data-comment placeholder="Your overall review, added to the graded feedback">${e(rv.comment || "")}</textarea></label>
          <div class="fp-kcrow"><label>Final score <input type="number" min="0" max="100" data-score value="${t != null ? t : ""}" placeholder="${rec && rec.attempts ? rec.best : "—"}"> %</label>
            <span class="fp-muted">Empty keeps the graded score. Yours replaces it; ${KC_PASS}% or more finishes the lesson.</span>
            <button class="btn btn-navy btn-sm" type="button" onclick="FTProcessAdmin.saveKc('${x.id}', ${l}, this)">Save my review</button></div>
        </div>` : ""}</div>`; }).join("")}</div>`;
}
window.FTProcessAdmin = {
  kc(id, l){ const k = id + "|" + l; FPA.kcOpen[k] = !FPA.kcOpen[k]; render(); },
  async saveKc(id, l, btn){
    const x = FPA.rows.find(r=>r.id===id); if(!x) return;
    const box = btn.closest(".fp-kcform"), notes = {};
    box.querySelectorAll("textarea[data-note]").forEach(t=>{ if(has(t.value)) notes[t.getAttribute("data-note")] = t.value.trim().slice(0, 2000); });
    const sv = String(box.querySelector("input[data-score]").value || "").trim();
    if(sv !== "" && !(Number(sv) >= 0 && Number(sv) <= 100)){ toast("The final score is a number from 0 to 100."); return; }
    btn.disabled = true;
    try{
      const cur = (await sharedGet("kcreview:" + id)) || {lessons:{}}; if(!cur.lessons) cur.lessons = {};
      cur.lessons[l] = {score:sv === "" ? null : Math.round(Number(sv)), comment:String(box.querySelector("textarea[data-comment]").value || "").trim().slice(0, 4000), notes, at:new Date().toISOString(), by:"trainer"};
      if(await sharedSet("kcreview:" + id, cur) === false) throw new Error("save");
      x.rv = cur; toast("✓ Review saved. The trainee sees it on their Knowledge Check.");
    }catch(err){ toast("Couldn’t save the review. Check your connection."); }
    btn.disabled = false; render();
  },
  row(id){ FPA.open[id] = !FPA.open[id]; render(); },
  sheet(id, sid){ const k = id+"|"+sid; FPA.sheetOpen[k] = !FPA.sheetOpen[k]; render(); },
  batch(b){ FPA.closed[b] = !FPA.closed[b]; render(); },
  refresh(){ FPA.rows = null; render(); },
  copy(id){ const x = FPA.rows.find(r=>r.id===id); if(!x) return;
    (navigator.clipboard ? navigator.clipboard.writeText(reportLine(x)) : Promise.reject()).then(()=>toast("Copied."), ()=>toast("Couldn’t copy. Select the text instead.")); }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="process") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-process">${renderPage()}</main>` + renderFooter();
  paintSave();
  try{ afterRender(); }catch(err){}
};
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab==="process"?"active":""}" onclick="setAdminTab('process')">✍️ Process Questions</button>`;
  if(state.adminTab==="process"){
    state.adminTab = "opendays";                   // borrow the tab bar…
    let out = __admin.apply(this, arguments);
    state.adminTab = "process";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>";
    return bar + renderAdminProcess();
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
};
// A trainee's answers load with the dashboard, so the lesson card and the slide know them.
const __dash = window.renderDashboard;
window.renderDashboard = function(){
  if(state.traineeId && !state.isAdmin && FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  if(state.traineeId && !state.isAdmin) loadReview();
  return __dash.apply(this, arguments);
};

/* ---------- the Knowledge Check: each lesson's process questions, graded like EA/PA's ----------
   A lesson with process questions ends with a Knowledge Check (#/kc): the lesson's questions, answered in
   writing (the same answers as the ✍️ Process Questions sheet). The AI scores each answer out of 10 for
   accuracy, depth and clarity, with a line of feedback; the total is a percentage, 70% passes and
   finishes the lesson, and a retake keeps the best score (state.progress, so it reaches the trainee's
   record like EA/PA's Knowledge Check scores). Lessons without process questions finish as before. */
const KC_PASS = 70;
const KC = {grading:false, shown:{}};
/* The trainer's review of a Knowledge Check: kcreview:<id> = {lessons: {<lesson id>: {score (0–100 or null), comment,
   notes: {"<set id>|<question>": comment}, at, by}}}. Admins write it (Admin → ✍️ Process Questions); the trainee reads it.
   A trainer's score is the lesson's final Knowledge Check score: it replaces the graded best (higher or lower), and a
   passing one finishes the lesson. */
const KR = {id:null, data:null, at:0, loading:null};
function loadReview(force){
  if(!state.traineeId || state.isAdmin || KR.loading) return KR.loading;
  if(!force && KR.id === state.traineeId && Date.now() - KR.at < 120000) return null;
  const id = state.traineeId; KR.at = Date.now();
  KR.loading = sharedGet("kcreview:" + id).then(v=>{ KR.id = id; KR.data = v && v.lessons ? v : {lessons:{}}; applyReviews(); })
    .catch(()=>{}).then(()=>{ KR.loading = null; if(["kc","process"].includes(state.view)) render(); });
  return KR.loading;
}
const kcReview = id => (KR.id === state.traineeId && KR.data && KR.data.lessons[id]) || null;
const trainerScore = r => r && r.score != null && r.score !== "" && isFinite(Number(r.score)) ? Math.max(0, Math.min(100, Math.round(Number(r.score)))) : null;
// The lesson's Knowledge Check score: the trainer's when they gave one, else the best graded attempt.
function kcBest(id){ const t = trainerScore(kcReview(id)); if(t != null) return t; const r = kcRec(id); return r && r.attempts ? r.best : null; }
window.ftKcFinal = kcBest;
// A trainer's score reaches the lesson's progress (and the trainee's record): a passing one finishes the lesson.
function applyReviews(){
  let changed = false;
  Object.keys((KR.data && KR.data.lessons) || {}).forEach(k=>{
    const id = Number(k), t = trainerScore(KR.data.lessons[k]); if(t == null || !DAYS.find(d=>d.id===id)) return;
    const prev = state.progress[id] || {};
    if(prev.trainerScore === t) return;
    state.progress[id] = Object.assign({}, prev, {score:t, trainerScore:t}, t >= KC_PASS ? {done:true, date:prev.date || new Date().toISOString()} : {done:prev.done && t >= KC_PASS});
    changed = true;
  });
  if(changed){ storeSet("day-progress", state.progress); try{ syncToLedger(); }catch(err){} }
}
function reviewBlock(id){
  const r = kcReview(id); if(!r || (!r.comment && trainerScore(r) == null && !Object.values(r.notes || {}).some(has))) return "";
  const t = trainerScore(r);
  return `<div class="card kc-trainer"><div class="kc-trainer-h">🧑‍🏫 <b>Your trainer’s review</b>${t != null ? `<span class="fp-pill ${t >= KC_PASS ? "ok" : "mid"}">Final score ${t}%</span>` : ""}</div>
    ${r.comment ? `<p>${e(r.comment).replace(/\n/g, "<br>")}</p>` : ""}
    <p class="fp-muted">${r.at ? `Reviewed ${e(new Date(r.at).toLocaleString())}. ` : ""}${t != null ? "Your trainer’s score is this Knowledge Check’s final score." : ""}</p></div>`;
}
window.EXTRA_ROUTE_VIEWS = window.EXTRA_ROUTE_VIEWS.concat(["kc"]);
const kcRec = id => ((FP.data && FP.data.kc) || {})[id] || null;
const kcTone = sc => sc >= 7 ? "ok" : sc >= 5 ? "mid" : "low";
function kcReport(id, r){
  const tier = gradeTierFor(r.pct), color = GRADE_TIER_COLOR[tier] || "var(--ink-soft)", qs = kcQuestionsFor(id);
  return `<div class="eval-report kc-report">
    <div class="eval-report-header">
      <div class="eval-score-ring" style="--ring-color:${color};"><span>${r.pct}</span></div>
      <div><div class="eval-tier" style="color:${color};">${r.pct >= KC_PASS ? "Passed · " + e(displayTier(tier)) : `Not yet · ${KC_PASS}% passes`}</div>
        <div class="eval-subscore-row">${(r.items||[]).map(it=>`<span>Q${it.i+1} ${it.score}/10</span>`).join("")}</div></div>
    </div>
    ${mindsetNote(r.pct)}
    ${r.summary ? `<div class="eval-section"><b>Overall</b><p style="margin:4px 0 0;">${e(r.summary)}</p></div>` : ""}
    <p class="fp-muted" style="margin:8px 0 0;">Graded ${e(new Date(r.at).toLocaleString())} · ${qs.length} question${qs.length===1?"":"s"} · feedback is under each answer below.</p>
  </div>`;
}
function renderKc(){
  const id = Number(state.dayId), d = DAYS.find(x=>x.id===id), qs = kcQuestionsFor(id);
  const back = `<a class="back-link" onclick="goto('dashboard')">&larr; Back to roadmap</a>`;
  if(!d || !qs.length) return `${back}<div class="card" style="padding:28px;">This lesson has no Knowledge Check.</div>`;
  const intro = `<p class="eyebrow">Knowledge Check</p><h1>${e(d.title)}</h1>
    <p>Answer each process question in complete sentences. Each answer is scored out of 10 for accuracy, depth and clarity, with feedback written the way your facilitator gives it; <b>${KC_PASS}% passes</b> and finishes the lesson. Retakes keep your best score, and your trainer adds their own review.</p>`;
  if(state.isAdmin && !state.adminPreview) return `${back}<div class="kc-hero">${intro}</div>
    <div class="card kc-card"><ol class="fp-qs">${qs.map(x=>`<li value="${x.i+1}"><div class="fp-q">${e(x.q)}</div></li>`).join("")}</ol>
    <p class="fp-muted">Trainees take this Knowledge Check. Their scores, and your review of each one, are in Admin → ✍️ Process Questions.</p></div>`;
  if(FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  if(FP.err) return `${back}<div class="card" style="padding:28px;">${e(FP.err)} <button class="btn btn-ghost btn-sm" onclick="FTProcess.reload()">Try again</button></div>`;
  if(!FP.data) return `${back}<div class="card" style="padding:28px;">Loading your answers…</div>`;
  loadReview();
  const rec = kcRec(id), shown = KC.shown[id] || (rec && rec.last), prog = state.progress[id] || {};
  return `${back}
    <div class="kc-hero">${intro}
      ${rec && rec.attempts ? `<div class="kc-stats">${trainerScore(kcReview(id)) != null ? `Final score <b>${kcBest(id)}%</b> (your trainer’s) · best graded ${rec.best}%` : `Best score <b>${rec.best}%</b>`} · ${rec.attempts} attempt${rec.attempts===1?"":"s"}${prog.done ? " · ✓ Lesson finished" : ""}</div>` : ""}</div>
    ${reviewBlock(id)}
    ${shown ? kcReport(id, shown) : ""}
    <div class="card kc-card">
      <ol class="fp-qs">${qs.map(x=>{ const g = shown && (shown.items||[]).find(it=>it.sid===x.set.id && it.i===x.i);
        return `<li value="${x.i+1}"><div class="fp-q">${e(x.q)}</div>
          <textarea rows="5" placeholder="Your answer, in complete sentences." oninput="FTProcess.set('${x.set.id}',${x.i},this.value)">${e((sheet(x.set.id).answers||[])[x.i]||"")}</textarea>
          ${g ? `<div class="kc-fb kc-${kcTone(g.score)}"><b>${g.score}/10</b> ${e(g.feedback)}</div>` : ""}
          ${(()=>{ const n = ((kcReview(id) || {}).notes || {})[x.set.id + "|" + x.i]; return has(n) ? `<div class="kc-fb kc-trainer-note"><b>🧑‍🏫 Trainer</b> ${e(n)}</div>` : ""; })()}</li>`; }).join("")}</ol>
      <div class="fp-actions"><button class="btn btn-navy" id="kcSubmit" type="button" onclick="FTKc.submit(${id})">${shown ? "🔁 Retake: Submit for Grading" : "Submit for Grading"}</button>
        <span class="fp-save" id="fpSave"></span></div>
      <p class="fp-muted">Your answers save as you type, and they're the same as your ✍️ Process Questions sheet for this lesson.</p>
    </div>`;
}
window.FTKc = {
  open(id){ state.dayId = Number(id); KC.shown[id] = null; goto("kc"); window.scrollTo(0, 0); },
  async submit(id){
    if(KC.grading) return;
    if(!state.traineeId || (state.isAdmin && !state.adminPreview)){ toast("Trainees take the Knowledge Check."); return; }
    const d = DAYS.find(x=>x.id===id), qs = kcQuestionsFor(id);
    const ans = x => String((sheet(x.set.id).answers||[])[x.i] || "").trim();
    const short = qs.filter(x=>ans(x).split(/\s+/).filter(Boolean).length < 5).map(x=>"Q"+(x.i+1));
    if(short.length){ toast(`Answer every question in complete sentences first (${short.join(", ")}).`); return; }
    KC.grading = true;
    const btn = document.getElementById("kcSubmit"); if(btn){ btn.disabled = true; btn.textContent = "Grading your answers…"; }
    const prompt = `You are grading a trainee Legal Virtual Assistant's written answers to the process questions of the "${d.title}" lesson in Legal Support Help's Foundational Training. The trainees are VAs (mostly in the Philippines and Latin America) learning to support U.S. personal injury law firms.

Grade each answer from 0 to 10, rigorously and realistically:
- Accuracy: correct about U.S. law-firm practice and the personal injury workflow; no wrong legal or procedural statements.
- Depth: answers every part of the question (both the "what" and the "why"), with reasons or a concrete example.
- Clarity: complete sentences in a professional tone.
Scale: 9-10 thorough and correct; 7-8 good with minor gaps; 5-6 partly answers or stays shallow; 3-4 mostly vague or off target; 0-2 blank, irrelevant or wrong. A one-line or generic answer can't score above 4. Don't reward length alone.
Write the feedback the way this program's facilitator evaluates trainees (her feedback DNA, below): for each answer, two or three sentences in the third person, opening with a verdict label and a period ("Very strong performance.", "Good.", "Good, with Improvements Needed.", "Satisfactory.", "Needs Improvement.", "Needs Significant Improvement.", "Incomplete Submission."), then "Demonstrated a … understanding of …" naming exactly what the answer got right, then "However, improvement is needed in …" naming the exact parts of the question it missed or got wrong, and closing on why it matters for the Legal VA's work. Name specifics, never vague praise. Don't give legal advice.
The summary is the facilitator's overall evaluation of the response: a verdict label, the strength, the precise improvements needed, in 2–4 sentences.

FACILITATOR'S FEEDBACK DNA:
${String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

QUESTIONS AND ANSWERS:
${qs.map((x,k)=>`${k+1}. QUESTION: ${x.q}\n   ANSWER: ${ans(x).replace(/\s+/g, " ")}`).join("\n")}

Return ONLY a JSON object, no other text:
{"items":[{"n":1,"score":<integer 0-10>,"feedback":"..."}, ... one per question, in order], "summary":"the facilitator's overall evaluation, 2-4 sentences"}`;
    try{
      const raw = await callAIJson(prompt, 1800, undefined, "grading");
      const got = Array.isArray(raw && raw.items) ? raw.items : [];
      const items = qs.map((x,k)=>{ const it = got.find(g=>Number(g && g.n)===k+1) || got[k] || {};
        return {sid:x.set.id, i:x.i, score:Math.max(0, Math.min(10, Math.round(Number(it.score)||0))), feedback:String(it.feedback||"").slice(0, 900)}; });
      if(!got.length) throw new Error("The grader didn't return scores. Please submit again.");
      const pct = Math.round(items.reduce((a,b)=>a+b.score, 0) / (10*items.length) * 100);
      const r = {pct, items, summary:String((raw && raw.summary)||"").slice(0, 1200), at:new Date().toISOString(), voice:"facilitator-dna"};
      FP.data.kc = FP.data.kc || {};
      const rec = FP.data.kc[id] = FP.data.kc[id] || {attempts:0, best:0, last:null};
      rec.attempts++; rec.best = Math.max(rec.best||0, pct); rec.last = r;
      // the answer sheet counts as submitted once all its questions are answered
      [...new Set(qs.map(x=>x.set))].forEach(set=>{ const x = sheet(set.id); if(answered(set, x) === set.questions.length) x.submittedAt = r.at; });
      queueSave();
      const prev = state.progress[id] || {};
      const tScore = trainerScore(kcReview(id));
      state.progress[id] = Object.assign({}, prev, {score:tScore != null ? tScore : Math.max(prev.score||0, pct), kcAttempts:rec.attempts}, (tScore != null ? tScore : pct) >= KC_PASS ? {done:true, date:prev.done && prev.date ? prev.date : r.at} : {});
      await storeSet("day-progress", state.progress);
      try{ syncToLedger(); }catch(err){}
      KC.shown[id] = r;
      if(pct >= KC_PASS){ toast(`✓ ${pct}% · ${ftName(id)} finished.`); if(pct >= 85) burstConfetti(); }
      else toast(`${pct}%: not yet. Read the feedback under each answer, improve them and submit again.`);
    }catch(err){
      toast((err && err.message) ? "Couldn't grade your answers: " + err.message : "Couldn't grade your answers. Please try again.");
    }finally{
      KC.grading = false; render(); window.scrollTo(0, 0);
    }
  }
};
// Finishing a lesson that has process questions opens its Knowledge Check instead.
const __finish = window.finishTrainingForDay;
window.finishTrainingForDay = function(id){ return kcQuestionsFor(Number(id)).length ? FTKc.open(Number(id)) : __finish.apply(this, arguments); };
window.goToKnowledgeCheckWithInterstitial = function(){ return window.finishTrainingForDay(state.dayId); };
// the page, beside ✍️ Process Questions
const __kcRender = window.render;
window.render = function(){
  if(state.view!=="kc") return __kcRender.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __kcRender.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-process">${renderKc()}</main>` + renderFooter();
  if(typeof afterRender === "function") afterRender();
};
// a lesson card shows its Knowledge Check score
const __card = window.moduleCard;
window.moduleCard = function(d){
  const html = __card.apply(this, arguments), p = state.progress[d.id];
  if(!kcQuestionsFor(d.id).length || !p || !p.score) return html;
  return html.replace(/(<div class="mh-day">)([\s\S]*?)(<\/div>)/, (m, a, b, c)=>`${a}${p.done ? "Finished" : "Knowledge Check"} &middot; ${p.done ? "" : "best "}${p.score}%${c}`);
};
function kcPills(p){
  const lessons = [...new Set(PROCESS_SETS.flatMap(kcLessons))].sort((a,b)=>a-b);
  const kc = (p && p.kc) || {};
  return lessons.filter(l=>kc[l]).map(l=>`<span class="fp-pill ${kc[l].best>=KC_PASS?"ok":"mid"}" title="${e(ftName(l))} Knowledge Check, best score">L${l} ${kc[l].best}%</span>`).join(" ");
}

(function(){ const s = document.createElement("style"); s.id = "ft-process"; s.textContent = `
main.main-process{max-width:1000px;margin:0 auto;padding:24px 16px 40px;}
.kc-hero{margin:0 0 14px;} .kc-hero h1{margin:2px 0 6px;color:var(--navy);font-size:28px;} .kc-hero p{margin:0 0 8px;color:var(--ink-soft);font-size:15px;}
.kc-stats{display:inline-block;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:13.5px;color:var(--navy);}
.kc-card{padding:16px 18px;} .kc-report{margin-bottom:14px;}
.kc-fb{margin-top:6px;border-radius:8px;padding:8px 10px;font-size:14px;line-height:1.45;border-left:4px solid;}
.kc-fb b{margin-right:6px;} .kc-fb.kc-ok{background:var(--success-bg);border-color:var(--success);} .kc-fb.kc-mid{background:#FEF7C3;border-color:#C9A227;} .kc-fb.kc-low{background:var(--danger-bg);border-color:var(--danger);}

.fp-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;} .fp-hero p{margin:0 0 14px;color:var(--ink-soft);font-size:15px;}
.fp-save{margin-left:6px;font-size:13px;color:var(--success);}
.fp-muted{color:var(--ink-soft);font-size:13.5px;} .fp-link{cursor:pointer;color:var(--orange-deep);font-weight:700;}
.fp-folder{padding:12px 16px;margin-bottom:14px;font-size:15px;} .fp-folder label{display:block;margin-bottom:6px;color:var(--navy);}
.fp-folder-row{display:flex;gap:8px;} .fp-folder-row input{flex:1;min-width:0;font:inherit;font-weight:500;font-size:14.5px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;}
.fp-set{padding:0;margin-bottom:12px;overflow:hidden;} .fp-locked{opacity:.65;}
.fp-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;cursor:pointer;list-style:none;font-size:16px;color:var(--navy);}
.fp-head::-webkit-details-marker{display:none;} .fp-head b{flex:1;min-width:0;}
.fp-count{font-size:13px;color:var(--ink-soft);}
.fp-st{font-size:12.5px;border-radius:999px;padding:3px 10px;} .fp-st.st-none{background:var(--bg);color:var(--ink-soft);} .fp-st.st-part{background:#FEF7C3;color:#7a5d00;} .fp-st.st-done{background:var(--success-bg);color:var(--success);}
.fp-body{border-top:1px solid var(--line);padding:12px 16px 16px;}
.fp-name{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#FBEBDD;border:1px solid var(--orange-soft);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:14px;}
.fp-name span{font-weight:800;color:var(--orange-deep);} .fp-name code, .fp-slide code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:2px 8px;overflow-wrap:anywhere;}
.fp-qs{margin:0;padding-left:30px;} .fp-qs li{margin:12px 0;} .fp-q{font-size:15px;color:var(--ink);margin-bottom:6px;}
.fp-qs textarea{width:100%;box-sizing:border-box;font:inherit;font-weight:500;font-size:15px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;resize:vertical;background:#fff;}
.fp-qs textarea:focus, .fp-folder-row input:focus{outline:2px solid var(--orange-soft);border-color:var(--orange);}
.fp-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 8px;} .fp-actions a.btn{text-decoration:none;}
.fp-slide .fp-lead{font-size:15.5px;margin:0 0 10px;} .fp-slide-qs{margin:0 0 12px;padding-left:34px !important;font-size:15px;} .fp-slide-qs li{margin:5px 0;}
.lesson-card .fp-slide ol{list-style:decimal;} .lesson-card .fp-slide ol > li{padding-left:2px;text-align:left;}
.lesson-stage #lessonSlideWrap .lesson-card .fp-slide ol > li::before, .lesson-card .fp-slide ol > li::before{content:none;display:none;}
.lesson-stage #lessonSlideWrap .lesson-card .fp-slide li{text-align:left;}
.fp-admin{padding:18px 20px;} .fp-admin h3{margin:0 0 4px;color:var(--navy);}
.fp-batch{margin-top:12px;} .fp-batch-hd{cursor:pointer;padding:6px 0;color:var(--navy);font-size:15px;}
.fp-arow{border:1px solid var(--line);border-radius:10px;margin:6px 0;padding:8px 12px;background:#fff;}
.fp-arow-hd{cursor:pointer;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:15px;color:var(--navy);}
.fp-pill{border-radius:999px;padding:2px 9px;font-size:12.5px;} .fp-pill.ok{background:var(--success-bg);color:var(--success);} .fp-pill.mid{background:#FEF7C3;color:#7a5d00;} .fp-pill.bad{background:var(--danger-bg);color:var(--danger);}
.fp-report{white-space:pre-wrap;font-family:inherit;font-size:14px;background:var(--bg);border-radius:8px;padding:10px 12px;margin:8px 0;}
.fp-asheet{border-top:1px solid var(--line);margin-top:8px;padding-top:8px;} .fp-asheet-hd{cursor:pointer;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14.5px;color:var(--navy);}
.fp-aans{margin:8px 0 0;padding-left:22px;font-size:14px;} .fp-aans li{margin:8px 0;} .fp-aans li div{font-weight:500;margin-top:3px;}
.fp-kcadmin{margin-top:10px;} .fp-kcadmin-h{display:block;color:var(--navy);font-size:14.5px;margin-bottom:2px;}
.fp-kcform{padding:6px 0 4px;} .fp-kcform textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:6px 9px;border:1px solid var(--line);border-radius:8px;margin-top:6px;resize:vertical;}
.fp-kclabel{display:block;font-weight:700;color:var(--navy);font-size:14px;margin-top:8px;}
.fp-kcrow{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px;} .fp-kcrow label{font-weight:700;color:var(--navy);font-size:14px;}
.fp-kcrow input{width:80px;font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:8px;}
.kc-trainer{padding:14px 16px;margin-bottom:14px;border-left:4px solid var(--navy);} .kc-trainer-h{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--navy);font-size:15.5px;}
.kc-trainer p{margin:8px 0 0;font-size:14.5px;} .kc-fb.kc-trainer-note{background:#EEF2FF;border-color:var(--navy);}
`; document.head.appendChild(s); })();
})();
