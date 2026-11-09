/* ============================================================
   Process Questions — each lesson's answer sheet, answered on the platform
   Loaded after js/ft-monitoring.js. ✍️ Knowledge Check (the process questions) is its own feature, with its own button in the top
   bar (#/process): it is not a page of 📚 Dashboard and it has no tab in 🛡 Admin Master Control.
   A lesson's last slide (✓ Finish lesson) routes here, to that lesson's answer sheet, instead of opening a
   Knowledge Check inside the lesson. The graded view (#/kc) belongs to this feature too, not to the modules.
     • Trainees answer each question (saved to process:<id> as they type) and
       submit the sheet. The answer sheet itself is a file the trainee saves in
       their Assessment and Activities Folder that day, named by its
       convention: the platform finds it there, checks its name, and records
       whether it was saved on time.
     • Admins open the same ✍️ Knowledge Check button and get every trainee's
       sheets: batch → trainee → each answer sheet (submitted or not, how many
       answered, the answers), and the line for the ranking report ("Out of N
       expected answer sheets, X were submitted"). There is no Admin tab for it.
     • The Process Questions are the Knowledge Check: 📝 Submit for Grading on a sheet grades it (#/kc), in
       the facilitator's feedback DNA (js/ft-facilitator-dna.js), and the trainer adds their own review
       (✍️ Process Questions as an admin: a comment per answer, an overall comment and a final score), saved
       in kcreview:<id>, which the trainee reads but never writes. The questions are no longer a slide: the
       lesson's ✓ Finish lesson opens ✍️ Knowledge Check at that lesson's sheet.
     • PROCESS_SETS: one per lesson. Add a lesson's questions there.
   ============================================================ */
(function(){
const KC_MAX = 10;
const PROCESS_SETS = [
  // Day 1's Reading Task (the Personal Injury overview, read on the Activity deck): its questions are answered here, with
  // Lesson 1's Knowledge Check, not in the training GC
  // (open: answered before the module is finished, straight after the orientation; graded with the module's others)
  {id:"pi-overview", lesson:1, open:true, title:"Reading Task: Personal Injury Overview", file:"PI Overview_Answers", questions:[
    "What is personal injury and what are its types?",
    "Can you enumerate the stages of a personal injury claim on your own understanding?",
    "How much is the common compensation for a personal injury claim?",
    "How long does it take for a personal injury case to resolve?",
    "What are the common factors that affect a personal injury case?",
    "What do you think are the advantages and disadvantages of pushing for a case to litigation (going to court)?"]},
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
    "Compare the communication protocols and tone required when interacting with clients vs. defense counsel or court staff."]},
  // two lessons discussed on Day 3, one Knowledge Check: the PI Workflow deck, then the Reception deck, then ✍️ Receptionist
  // Training's Knowledge Check, which asks Personal Injury Process Flow's three questions (kc: they are Lesson 4's, first)
  // and its own seven, ten in all; Personal Injury Process Flow has none of its own and finishes as Calendaring does. Each
  // sheet keeps its own answers (process:<id> sets), and one file holds both, the guide's
  // PI_Workflow_and_Reception_Training_Process_Question_Answers (VA's first name): 💾 Save PDF writes both sheets into it
  {id:"pi-workflow", lesson:3, kc:{4:[0, 1, 2]}, title:"Personal Injury Process Flow", file:"PI_Workflow_and_Reception_Training_Process_Question_Answers", questions:[
    "Analyze the step-by-step process of a personal injury case from client intake to settlement. What tasks should a Legal VA expect to support at each stage?",
    "Examine how missing documentation (e.g., police reports, medical records) at the intake or treatment stage could affect the value and outcome of a case.",
    "Evaluate how efficient case intake impacts the strength and pace of a personal injury claim. What are the potential legal and financial consequences of a disorganized intake?"]},
  {id:"reception-training", lesson:4, title:"Receptionist Training", file:"PI_Workflow_and_Reception_Training_Process_Question_Answers", questions:[
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
  {id:"lien-negotiator", lesson:9, title:"Lien Negotiator Training", file:"Lien_Negotiator_Training_Process_Question_Answers", questions:[
    "Analyze the specific responsibilities of a lien negotiator in relation to the post-settlement process. How do they interact with attorneys, clients, and providers?",
    "Analyze the difference between statutory, contractual, and medical provider liens. What are the legal implications of each?",
    "Compare the documentation required for a simple case with one that includes third-party liens, child support obligations, and extensive treatment.",
    "Analyze the typical factors providers consider when agreeing to a medical bill reduction (e.g., settlement amount, client hardship).",
    "Assess how persuasive documentation (e.g., settlement amount, lien summary, client hardship letter) influences negotiation outcomes.",
    "Analyze the purpose of a settlement release and its binding nature once signed. What rights does the client waive?",
    "Evaluate the importance of reviewing the release terms with the client. What issues could arise if the client signs without understanding?",
    "Analyze how the closing statement reflects the full financial breakdown of a personal injury case.",
    "Evaluate the role of transparency in the closing statement. How does it support trust and prevent disputes?",
    "Analyze the net sheet’s function in summarizing what the client will receive after deductions. Why must it match the closing statement exactly?"]}
].filter(set=>DAYS.find(d=>d.id===set.lesson))   // a lesson taken off the platform (build/lessons/off/) takes its set with it
// ✍️ ten process questions at most on every answer sheet (its Knowledge Check): the first ten, so the answers already saved
// (kept by the question's place on the sheet) stay with their questions
 .map(set=>Object.assign(set, {questions:set.questions.slice(0, KC_MAX)}));
const has = v => String(v == null ? "" : v).trim().length > 0;
const e = v => esc(String(v == null ? "" : v));
// a score as shown: a finite number, rounded (a grading record is the trainee's own to write, so never its raw text)
const num = v => v !== "" && v != null && Number.isFinite(Number(v)) ? Math.round(Number(v)) : "—";
const firstName = () => String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";
// The sheet's naming convention, with the trainee's first name: VA_Essentials_Process_Question_Answers (Jamie)
const fileName = (set, first) => `${set.file} (${first || firstName() || "VA’s first name"})`;
// the name as shown in its box: it may wrap after an underscore or before "(name)", never in the middle of a word
const codeName = n => e(n).replace(/_/g, "_<wbr>").replace(/ \(/g, " <wbr>(");
/* 📄 The answer sheet as a deliverable: the trainee only saves it in their Assessment and Activities Folder that day, named by
   its convention (the rule, with "Your First Name": not a name to copy). The platform finds it there itself
   (/api/drive/answers: the files in the folder the trainee linked), checks its name against the convention and
   records whether it was saved by its due time: the end of the day the sheet was given (the day the trainee first opened
   it). Attention to Detail and Following Instructions (the name), Timely Submission (the time). Kept on the sheet:
   x.file = {name, link, at, nameOk, onTime}, x.assignedOn. */
const normName = t => String(t || "").replace(/[‘’`]/g, "'").replace(/\s+/g, " ").trim();
const ptDay = d => window.FTTrackerRules ? FTTrackerRules.ptDate(d ? new Date(d) : new Date()) : new Date(d || Date.now()).toISOString().slice(0, 10);
const bare = n => String(n || "").replace(/\.(docx?|pdf|txt|rtf|odt)$/i, "");
// a file that is this sheet but named another way: the convention's words in it, whatever the spaces, underscores and capitals
const key = t => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const looksLike = (set, n) => key(bare(n)).includes(key(set.file));
const prettyDay = d => { const t = new Date(d + "T12:00:00Z"); return isNaN(t) ? d : t.toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric", timeZone:"UTC"}); };
const isTraineeHere = () => !!state.traineeId && !state.isAdmin;
// when the trainee first sees the sheet's box, the sheet is theirs to deliver that day
function assignedOn(set){ const x = sheet(set.id); if(!x.assignedOn && isTraineeHere()){ x.assignedOn = ptDay(); queueSave(); } return x.assignedOn || ptDay(); }
// the folder's check: the sheet's file in the folder (named right first, else the earliest that looks like it)
const FOLDER = {at:0, busy:false, error:"", files:null};
async function checkFolder(force){
  if(!isTraineeHere() || FOLDER.busy || (!force && Date.now() - FOLDER.at < 120000)) return;
  FOLDER.busy = true; FOLDER.at = Date.now();
  try{ const r = await authFetch("/api/drive/answers", {}); const j = await r.json().catch(() => ({})); FOLDER.error = j.error || ""; FOLDER.files = j.files || null; }
  catch(err){ FOLDER.error = "offline"; }
  FOLDER.busy = false;
  let changed = false;
  if(FOLDER.files) PROCESS_SETS.forEach(set => {
    const x = FP.data.sets[set.id]; if(!x || !x.assignedOn) return;
    const nf = findInFolder(set, x, FOLDER.files); if(!nf) return;
    if(JSON.stringify(nf) !== JSON.stringify(x.file || null)){ x.file = nf; changed = true; }
  });
  if(changed) queueSave();   // (nothing on the trainee's page changes: the trainer sees the result)
}
// 🔎 the same check, run by a trainer from ✍️ Process Questions (a trainee's folder only ever was looked in from their own
// session, so a sheet saved there showed "Not found in their folder" until they came back): /api/drive/answers with the
// trainee's id (admins only), matched by the sheet's convention with the trainee's own first name. Nothing is written:
// the trainee's next visit records it on their sheet as before.
const firstOf = n => String(n || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";
function findInFolder(set, x, files, first){
  const named = n => normName(bare(n)) === normName(fileName(set, first));
  const mine = (files || []).filter(f => looksLike(set, f.name)).sort((a, b) => (named(b.name) - named(a.name)) || String(a.created).localeCompare(String(b.created)));
  const f = mine[0]; if(!f) return null;
  const due = (x && x.assignedOn) || (x && x.submittedAt ? ptDay(x.submittedAt) : "");
  return {name: f.name, link: f.link, at: f.created || f.modified, nameOk: named(f.name), onTime: !due || ptDay(f.created || f.modified) <= due};
}
const FOLDER_WHY = {"no-folder": "No Assessment & Activities Folder linked yet", "no-access": "Their folder isn’t shared with the training account", drive: "Google Drive couldn’t be read just now", offline: "Couldn’t reach the server"};
// the result, for the trainee and the trainer alike
function fileStatus(set, x){
  const f = x && x.file; if(!f) return "";
  return `<span class="fp-pill ${f.nameOk ? "ok" : "bad"}">${f.nameOk ? "✓ Named by the convention" : "✗ Name doesn’t follow the convention"}</span>
    <span class="fp-pill ${f.onTime ? "ok" : "mid"}">${f.onTime ? "✓ On time" : "⚠ Late"}</span>`;
}
/* 📄 Save PDF to my Folder: the answer sheet as a PDF, named by its convention (fileName, shown beside the button: the
   naming convention lives here, not on the deck), saved straight into the trainee's Assessment and Activities Folder (the
   one linked once, in 📁 My Drive links): the Worker writes it there (/api/drive/save) and saving again replaces the same
   file. Sets that share a file (Day 3's two lessons) go into the one PDF. The name is the convention's, word for word, so
   it counts as named right (Attention to Detail) and its time as when it was saved (Timely Submission): checkFolder
   records both. Where the platform can't write to the folder (no access yet), the PDF downloads under the same name and
   the folder opens, to drop it in. */
const pdfName = set => fileName(set) + ".pdf";
const sameFile = set => PROCESS_SETS.filter(x => x.file === set.file);
async function sheetPdf(set){
  if(typeof ensureJsPdf !== "function" || !(await ensureJsPdf())) return null;
  const { jsPDF } = window.jspdf, doc = typeof safeDoc === "function" ? safeDoc(new jsPDF({unit:"pt", format:"letter"})) : new jsPDF({unit:"pt", format:"letter"});
  if(typeof drawPdfHeader === "function") drawPdfHeader(doc, fileName(set), "Process Questions · Knowledge Check");
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), X = 54;
  let y = 118;
  const line = (t, bold, size, color) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(...color);
    doc.splitTextToSize(String(t), W - X * 2).forEach(w => { if(y > H - 60){ doc.addPage(); y = 60; } doc.text(w, X, y); y += size + 4; }); };
  line(`Trainee: ${String(state.certName || state.traineeName || "").replace(/"/g, "")}`, false, 10, [27,30,46]);
  line(`Date: ${prettyDay(ptDay())}`, false, 10, [27,30,46]); y += 8;
  sameFile(set).forEach(st => {
    const ans = sheet(st.id).answers || [];
    if(!st.questions.some((q, i) => has(ans[i]))) return;
    y += 6; line(st.title, true, 13, [38,43,69]); y += 2;
    st.questions.forEach((q, i) => { line(`${i + 1}. ${qtext(st, i)}`, true, 10.5, [38,43,69]); line(has(ans[i]) ? String(ans[i]).trim() : "(no answer)", false, 10, [27,30,46]); y += 8; });
  });
  return doc;
}
const DRIVE_WHY = {"no-folder": "Link your Assessment and Activities Folder first (📁 My Drive links).", "no-access": "The platform can’t write to your folder yet: share it with the training account as Editor.",
  quota: "The platform can’t create files in your folder yet: ask your trainer.", "no-sa": "Saving to your folder isn’t set up yet: ask your trainer.", "drive-auth": "Saving to your folder isn’t set up yet: ask your trainer."};
// (📝 the Assessments, js/ft-assess.js, which loads next, name their files and explain a failed save the same way)
window.FTPdfKit = {firstName, codeName, DRIVE_WHY};
// the lesson's files: one per naming convention among the sheets on its page
// (on ✍️ Knowledge Check every question of the lesson can be answered, so every sheet has its 📄 Save PDF to my Folder there,
// finished module or not; on the Process Questions page, before the module is finished, only its open sheets)
const lessonFiles = lesson => { const all = kcQuestionsFor(Number(lesson)), qs = moduleStudied(lesson) || (typeof state === "object" && state.view === "kc") ? all : all.filter(x => x.set.open), seen = new Set();
  return [...new Set(qs.map(x => x.set))].filter(set => !seen.has(set.file) && seen.add(set.file)); };
/* 📝 A day's worksheet, done in Word, embedded with the answer sheet it goes with (by the sheet's file): its download and
   its naming convention live here, beside 📄 Save PDF to my Folder, not on the deck (the deck's slide links here,
   FTDayDecks.toKC). Day 3's Reception Listening Activity (PI Reception Activity): the five practice calls' data points (build/calls/pi_reception_calls.py). */
const WORKSHEETS = {"PI_Workflow_and_Reception_Training_Process_Question_Answers": {t: "Reception Listening Activity worksheet",
  href: "/handouts/LSH_Day3_PI_Reception_Activity_Worksheet.docx", file: "PI_Reception_Activity"}};
function worksheetBox(set){
  const w = WORKSHEETS[set.file]; if(!w) return "";
  // (📤 Submit to my Drive Folder: the trainee picks the finished Word file, saved into their folder under the convention)
  return `<div class="fp-pdf fp-ws"><a class="btn btn-ghost btn-sm" href="${e(w.href)}" target="_blank" rel="noopener noreferrer" download>📝 ${e(w.t)} · ⬇ Download the Word file</a>
    <p class="fp-pdf-rule"><span>Naming convention:</span> <code>${codeName(fileName(w))}</code></p>
    <button class="btn btn-ghost btn-sm fp-ws-drive" type="button" onclick="this.nextElementSibling.click()">📤 Submit to my Drive Folder</button>
    <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden onchange="FTProcess.submitWorksheet('${e(set.file)}', this)">
    <p class="fp-muted fp-ws-note">Fill it in, then 📤 Submit to my Drive Folder: it is saved to your Assessment and Activities Folder${FP.driveFolder ? ` (<a href="${e(FP.driveFolder)}" target="_blank" rel="noopener noreferrer">📁 open it</a>)` : ""}, named by the convention.</p></div>`;
}
async function submitWorksheet(file, input){
  const w = WORKSHEETS[file], f = input && input.files && input.files[0]; if(input) input.value = "";
  if(!w || !f) return;
  if(!isTraineeHere()){ toast("👁 Trainee view — a trainee submits their own worksheet to their folder."); return; }
  if(!/\.docx$/i.test(f.name)){ toast("Pick the worksheet's Word file (.docx)."); return; }
  if(f.size > 2900000){ toast("That file is too large to submit (3 MB at most)."); return; }
  const name = fileName(w) + ".docx";
  document.querySelectorAll(".fp-ws-drive").forEach(b => { b.disabled = true; b.textContent = "Submitting…"; });
  let j = {};
  try{
    const b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] || ""); r.onerror = no; r.readAsDataURL(f); });
    const r = await authFetch("/api/drive/save", {name, docx: b64}); j = await r.json().catch(() => ({}));
  }catch(err){ j = {error: "offline"}; }
  if(j.ok){ checkFolder(true); toast(`✓ Submitted to your Assessment and Activities Folder: ${name}`); }
  else {
    if(FP.driveFolder) window.open(FP.driveFolder, "_blank", "noopener");
    toast(`${DRIVE_WHY[j.error] || "Couldn’t reach Google Drive."} Upload it to your Assessment and Activities Folder as “${name}”${FP.driveFolder ? " (it just opened)" : ""}.`);
  }
  render();
}
// beside 📝 Submit for Grading: each file's naming convention and its 📄 Save PDF to my Folder, then its worksheet, if any
function pdfBox(lesson, only){
  const sets = lessonFiles(lesson).filter(set => !only || set.file === only.file); if(!sets.length) return "";
  return `<div class="fp-pdf">${sets.map(set => `<p class="fp-pdf-rule"><span>Naming convention:</span> <code>${codeName(fileName(set))}</code></p>`).join("")}
    <button class="btn btn-ghost btn-sm fp-drive" type="button" onclick="FTProcess.savePdf(${Number(lesson)})">📄 Save PDF to my Folder</button>
    <button class="btn btn-ghost btn-sm fp-dl" type="button" onclick="FTProcess.downloadPdf(${Number(lesson)})" title="The same PDF, downloaded to this computer: upload it to your Assessment and Activities Folder if saving to the folder doesn’t work">⬇ Download PDF</button></div>${sets.map(worksheetBox).join("")}`;
}
// ⬇ Download PDF: the same answer sheet, as the same PDF under the same name, downloaded here (for when saving to the folder
// doesn't work: the trainee uploads it to their Assessment and Activities Folder themselves). Each file of the lesson's page.
async function downloadPdf(lesson){
  const sets = lessonFiles(lesson).filter(set => sameFile(set).some(st => (sheet(st.id).answers || []).some(has)));
  if(!sets.length){ toast("Answer the questions first, then ⬇ Download PDF."); return; }
  for(const set of sets){
    const doc = await sheetPdf(set);
    if(!doc){ toast("Couldn't load the PDF tools — try again."); return; }
    doc.save(pdfName(set));
  }
  toast(`⬇ Downloaded: ${sets.map(pdfName).join(", ")}. Upload it to your Assessment and Activities Folder.`);
}
async function savePdf(lesson){
  if(!isTraineeHere()){ toast("👁 Trainee view — a trainee saves their own answer sheet to their folder."); return; }
  const sets = lessonFiles(lesson).filter(set => sameFile(set).some(st => (sheet(st.id).answers || []).some(has)));
  if(!sets.length){ toast("Answer the questions first, then 📄 Save PDF to my Folder."); return; }
  document.querySelectorAll(".fp-drive").forEach(b => { b.disabled = true; b.textContent = "Saving the PDF…"; });
  const saved = [], failed = [];
  for(const set of sets){
    const doc = await sheetPdf(set);
    if(!doc){ toast("Couldn't load the PDF tools — try again."); break; }
    const name = pdfName(set), b64 = doc.output("datauristring").split(",")[1];
    let j = {};
    try{ const r = await authFetch("/api/drive/save", {name, pdf: b64}); j = await r.json().catch(() => ({})); }catch(err){ j = {error: "offline"}; }
    if(j.ok){ sameFile(set).forEach(st => { const x = sheet(st.id); assignedOn(st); x.drive = {at: new Date().toISOString(), link: (j.file || {}).link || ""}; }); saved.push(name); }
    else { doc.save(name); failed.push({name, error: j.error || "drive", share: j.share || "", sub: j.sub}); }
  }
  if(saved.length){ queueSave(); checkFolder(true); toast(`✓ Saved to your Assessment and Activities Folder: ${saved.join(", ")}`); }
  if(failed.length){
    if(FP.driveFolder) window.open(FP.driveFolder, "_blank", "noopener");
    toast(`${failed[0].share && failed[0].sub === false ? `The platform can’t save into your folder right now (your trainer is fixing the Google Drive connection). Share your Assessment and Activities Folder with ${failed[0].share} as Editor so it can be checked, and upload the PDF that just downloaded.` : failed[0].share ? `The platform can’t write to your folder yet: share your Assessment and Activities Folder with ${failed[0].share} as Editor, then save again.` : DRIVE_WHY[failed[0].error] || `Couldn’t save to Google Drive (${String(failed[0].error).slice(0, 80)}).`} Your PDF downloaded as “${failed[0].name}”: upload it to your Assessment and Activities Folder${FP.driveFolder ? " (it just opened)" : ""}.`);
  }
  render();
}
// An admin can reword a question (a typo, a clearer phrasing) without a new deploy: "processq:overrides" holds
// {[set.id]: {[questionIndex]: "the edited wording"}}, loaded once and read by every question shown, trainee
// and admin alike (PROCESS_SETS itself — the question bank's own text — never changes at runtime).
let QOV = null, QOV_loading = false;
function loadQOV(){
  if(QOV || QOV_loading) return;
  QOV_loading = true;
  sharedGet("processq:overrides").then(v=>{ QOV = (v && typeof v === "object") ? v : {}; QOV_loading = false; if(state.view==="process" || state.view==="kc") render(); })
    .catch(()=>{ QOV = {}; QOV_loading = false; });
}
function qtext(set, i){
  if(!QOV) loadQOV();
  const o = QOV && QOV[set.id];
  return (o && has(o[i])) ? o[i] : set.questions[i];
}

/* ---------- the trainee's answers ---------- */
const FP = {id:null, data:null, loading:false, err:"", timer:null, saving:false, savedAt:null};
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["process"]);
async function load(id){
  // (an admin with no trainee signed in — 🛡 or 👁 Trainee view: an empty sheet to look at, not a read of "process:" + nothing)
  if(!id){ FP.id = id; FP.err = ""; FP.data = {v:1, sets:{}}; FP.driveFolder = ""; return; }
  FP.loading = true; FP.err = ""; FP.id = id;
  try{ FP.data = (await sharedGet("process:"+id)) || {v:1, sets:{}}; if(!FP.data.sets) FP.data.sets = {};
    const dv = await sharedGet("drive:"+id).catch(() => null); FP.driveFolder = (dv && dv.folder) || ""; }
  catch(err){ FP.err = "Couldn't load your answers. Check your connection and try again."; }
  FP.loading = false;
  // "kc" too: a trainee who opens a Knowledge Check before their answers are in would otherwise
  // be left on "Loading your answers…" with no boxes to write in until they navigated away.
  if(["process","kc","dashboard","modules","day"].includes(state.view)) render();
}
function sheet(sid){ const s = FP.data.sets; return s[sid] || (s[sid] = {answers:[], submittedAt:"", updatedAt:""}); }
function queueSave(){
  if(!state.traineeId) return;   // 👁 Trainee view: a preview with no trainee to save to
  FP.data.updatedAt = new Date().toISOString();
  clearTimeout(FP.timer); FP.saving = true; paintSave();
  FP.timer = setTimeout(async ()=>{ const ok = await sharedSet("process:"+FP.id, FP.data); FP.saving = false; FP.savedAt = ok === false ? null : new Date(); paintSave(ok); }, 1000);
}
// a graded attempt is written at once (not on the 1-second timer): a reload straight after it can't lose it
async function saveNow(){
  if(!state.traineeId || !FP.data) return false;
  clearTimeout(FP.timer); FP.data.updatedAt = new Date().toISOString(); FP.saving = true; paintSave();
  const ok = await sharedSet("process:" + FP.id, FP.data); FP.saving = false; FP.savedAt = ok === false ? null : new Date(); paintSave(ok);
  return ok;
}
// a record read from the server itself, telling "no record" ({ok:true, value:null}) from a failed read ({ok:false}): a
// read-modify-write must never take a failed read for an empty record and write over it
async function readStrict(key){
  try{ const r = await authFetch("/api/storage/get", {key}); if(!r.ok) return {ok:false};
    const d = await r.json(); return {ok:true, value:d && d.value ? JSON.parse(d.value) : null}; }
  catch(err){ return {ok:false}; }
}
// 🔒 the attempts another tab or device (or the trainer-side grading) saved since this page loaded: the higher count wins
function mergeAttempts(fresh){
  ["kc", "kcRead"].forEach(slot => { const f = (fresh && fresh[slot]) || {}; FP.data[slot] = FP.data[slot] || {};
    Object.keys(f).forEach(l => { const a = FP.data[slot][l], b = f[l]; if(b && (Number(b.attempts) || 0) > ((a && Number(a.attempts)) || 0)) FP.data[slot][l] = b; }); });
}
// (a platform update reloads the page: an answer typed in the last second is saved first, not left on the timer)
(window.LSH_FLUSH_BEFORE_UPDATE = window.LSH_FLUSH_BEFORE_UPDATE || []).push(async () => {
  if(!FP.timer || !FP.saving || !state.traineeId || !FP.data) return;
  clearTimeout(FP.timer); FP.timer = null; await sharedSet("process:" + FP.id, FP.data); FP.saving = false;
});
function paintSave(ok){ const el = document.getElementById("fpSave"); if(el) el.textContent = FP.saving ? "Saving…" : (ok===false ? "⚠ Not saved. Check your connection." : (FP.savedAt ? "All changes saved" : "")); }
const answered = (set, x) => set.questions.filter((q,i)=>has(((x||{}).answers||[])[i])).length;
function statusOf(set, x){
  if(x && x.submittedAt) return {k:"done", t:"Submitted"};
  return answered(set, x) ? {k:"part", t:"In progress"} : {k:"none", t:"Not started"};
}
// A module's questions open once the trainee has been through the module — they reach its last slide and
// press ✓ Finish lesson, which marks it "studied" and brings them straight here. Every other module stays
// locked. The gate can't be the Knowledge Check itself: passing it is what finishes the module, so gating
// the questions on a finished module would mean the questions could never be answered. A module finished
// before this existed (done, from an earlier pass) counts as studied too.
const moduleStudied = lesson => {
  if(state.isAdmin || state.adminPreview) return true;
  const p = (state.progress || {})[lesson] || {};
  return !!(p.studied || p.done);
};
window.ftModuleStudied = moduleStudied;

// A module's locked note — shown both on its own page and as its row in the index, before it's studied.
function lockedCard(title){
  return `<div class="card fp-set fp-locked"><div class="fp-head"><b>${e(title)}</b>
      <span class="fp-st st-none">🔒 Opens when you finish this module</span></div>
      <p class="fp-muted fp-lockwhy">Work through the module's slides and press <b>📋 Classroom Activity</b> on the last one. It opens these questions, and takes you to the day's Activity deck.</p></div>`;
}
// A module's own page: its questions, its own Knowledge Check. Each module has its own PROCESS_SETS entry,
// so "sets" is always one — the map()s below are left in place in case a future set ever spans two modules.
// A lesson's questions can come from more than one answer sheet (Day 1: the Reading Task's and the lesson's own Process
// Questions): each sheet is its own section, with its heading and its own numbering, so the two never read as one list.
const sheetIcon = set => /^Reading Task/i.test(set.title || "") ? "📖" : "✍️";
// Two sheets are two pages: a tab for each (its questions answered so far), one sheet shown at a time, and a button to the
// next sheet at its foot. (The answers save as they're typed, so moving between the sheets loses nothing.)
// the one sheet shown when a lesson's sheets are separate files: the route's (Day 1's Reading Task from the deck's reading,
// the lesson's own from the Process Questions stop), else the newest one open
function shownSheet(sets){
  const locked = set => !!(window.FTDay1 && FTDay1.sheetLocked(set));
  let back = null; try{ back = JSON.parse(sessionStorage.getItem("ftKCBack") || "null"); }catch(err){}
  const routed = back && back.sheet && Number(back.l) === Number(sets[0].lesson) ? sets.findIndex(st => back.sheet === "read" ? !!st.open : !st.open) : -1;
  const open = sets.map((st, i) => i).filter(i => !locked(sets[i]));
  return sets[routed >= 0 ? routed : open.length ? open[open.length - 1] : 0];
}
// the sheets on screen: one alone, every sheet that shares one file (Day 3), else the one shownSheet picks (Day 1)
function shownSets(qs){
  const sets = [...new Set(qs.map(x => x.set))];
  return sets.length < 2 || new Set(sets.map(st => st.file)).size === 1 ? sets : [shownSheet(sets)];
}
function bySheet(qs, each){
  const sets = [...new Set(qs.map(x => x.set))];
  // (Day 1 in order, js/ft-day1-flow.js: the Virtual Assistant Essentials sheet waits for its Process Questions step)
  const locked = set => !!(window.FTDay1 && FTDay1.sheetLocked(set));
  const one = set => locked(set) ? `<p class="fp-muted fp-sheet-lock">🔒 This answer sheet opens with ${e(FTDay1.label(6))}, when your trainer unlocks it.</p>`
    : `<ol class="fp-qs">${qs.filter(x => x.set === set).map(each).join("")}</ol>`;
  // (one sheet: still its heading, so the Reading Task never sits under the lesson's own title as if it were that sheet)
  if(sets.length < 2) return sets.map(set => `<h3 class="fp-sheet-h">${sheetIcon(set)} ${e(set.title)} <span>${qs.filter(x => x.set === set).length} questions</span></h3>${one(set)}`).join("");
  // sheets that share one file are one Knowledge Check (Day 3: Personal Injury Process Flow's three and Receptionist
  // Training's seven): all of them on one page, numbered on through, 1–10
  if(new Set(sets.map(st => st.file)).size === 1){
    let n = 0;
    return `<h3 class="fp-sheet-h">✍️ ${e(sets.map(st => st.title).join(" & "))} <span>${qs.length} questions</span></h3>
      <ol class="fp-qs">${sets.map(st => qs.filter(x => x.set === st).map(x => each(x).replace(/^\s*<li value="\d+"/, `<li value="${++n}"`)).join("")).join("")}</ol>`;
  }
  // one sheet at a time, and no tabs or buttons to switch: the route decides which. Opened from the deck's reading
  // (Day 1's Reading Task) it is the reading's sheet; from the Process Questions stop, the lesson's own; otherwise the
  // newest one open (the lesson's own, unless it is still locked)
  const set = shownSheet(sets);
  return `<h3 class="fp-sheet-h">${sheetIcon(set)} ${e(set.title)} <span>${qs.filter(x => x.set === set).length} questions</span></h3>${one(set)}`;
}
function moduleCard(lesson, after){   // after: a button beside 📝 Submit for Grading (the way back to the classroom)
  const all = kcQuestionsFor(lesson);
  if(!all.length) return "";
  // before the module is finished, only its open sets (Day 1's Reading Task) can be answered; they're graded with the rest
  const studied = moduleStudied(lesson), qs = studied ? all : all.filter(x => x.set.open);
  const title = ftName(lesson), sets = [...new Set(qs.map(x => x.set))];
  // (a module not finished yet: its locked note, and still its Submit — not yet pressable — and each sheet's naming convention)
  if(!qs.length){ const seen = new Set(), files = [...new Set(all.map(x => x.set))].filter(st => !seen.has(st.file) && seen.add(st.file));
    return lockedCard(title).replace(/<\/div>$/, `<div class="fp-actions"><button class="btn btn-navy btn-sm" type="button" disabled title="Opens when you finish this module">📝 Submit for Grading</button></div></div>
      <div class="fp-pdf">${files.map(st => `<p class="fp-pdf-rule"><span>Naming convention:</span> <code>${codeName(fileName(st))}</code></p>`).join("")}
      <button class="btn btn-ghost btn-sm" type="button" disabled title="Opens when you finish this module">📄 Save PDF to my Folder</button></div>`); }
  // (the count and status are the sheet on screen's — Day 1 shows one of its two sheets at a time — not the whole lesson's)
  const onScreen = shownSets(qs), sq = qs.filter(x => onScreen.includes(x.set));
  const done = sq.filter(x => has(((FP.data.sets[x.set.id] || {}).answers || [])[x.i])).length;
  // (the Knowledge Check's score is the module's own sheet's; on the 📖 Reading Task's page, the Reading Task's own score)
  const readOn = isReadPage(qs, onScreen), rr = readRec(lesson);
  const best = readOn ? (trainerScore(readReview(lesson)) != null ? trainerScore(readReview(lesson)) : rr && rr.attempts ? rr.best : null) : studied ? kcBest(lesson) : null, prog = (state.progress || {})[lesson] || {};
  const st = readOn ? (rr && rr.attempts ? {k:"done", t:"Graded"} : done === sq.length ? {k:"part", t:"Ready to submit"} : done ? {k:"part", t:"In progress"} : {k:"none", t:"Not started"}) : prog.done && studied ? {k:"done", t:"Passed"} : done === sq.length ? {k:"part", t:"Ready to submit"} : done ? {k:"part", t:"In progress"} : {k:"none", t:"Not started"};
  return `<div class="card fp-set">
    <div class="fp-head"><b>${e(title)}</b><span class="fp-count">${done} of ${sq.length} answered</span><span class="fp-st st-${st.k}">${e(st.t)}</span>${best != null ? `<span class="fp-st st-${best >= KC_PASS ? "done" : "part"}">${readOn ? "📖 Reading Task best" : "Knowledge Check best"} ${num(best)}%</span>` : ""}</div>
    <div class="fp-body">
      ${bySheet(qs, x => `<li value="${x.i+1}"><div class="fp-q">${e(x.q)}</div>
        <textarea rows="4" placeholder="Your answer, in complete sentences." ${studied && onScreen.includes(x.set) && kcLeft(lesson, readOn) <= 0 ? "readonly" : ""} oninput="FTProcess.set('${x.set.id}',${x.i},this.value)">${e(((FP.data.sets[x.set.id] || {}).answers || [])[x.i] || "")}</textarea></li>`)}
      <div class="fp-actions">
        ${studied ? (kcLeft(lesson, readOn) <= 0 ? `<button class="btn btn-navy btn-sm" type="button" disabled title="A Knowledge Check is taken once; your trainer can grant a retry for a technical problem">✓ Taken${best != null ? ` · ${num(best)}%` : ""}</button>`
            : `<button class="btn btn-navy btn-sm" type="button" onclick="FTProcess.grade('${sets[0].id}', ${lesson})">${kcUsed(lesson, readOn) ? `🔁 Retry granted: Submit for Grading` : "📝 Submit for Grading"}</button>`)
          // (before the module is finished: the open sheet — Day 1's Reading Task — is submitted on its own; it is graded with the module's others later)
          : sets.map(st => { const sub = (FP.data.sets[st.id] || {}).submittedAt;
              return `<button class="btn btn-navy btn-sm" type="button" onclick="FTProcess.submitOpen('${st.id}')">${sub ? "🔁 Submit again" : "📝 Submit"} · ${e(st.title)}</button>${sub ? `<span class="fp-st st-done">✓ Submitted ${e(new Date(sub).toLocaleDateString())}</span>` : ""}`; }).join("")}
        ${after || ""}
      </div>
      ${studied ? "" : `<p class="fp-muted fp-lockwhy">🔒 The rest of this module's questions open when you finish the module (📋 Classroom Activity on its last slide). Submit these answers now and 📄 Save PDF to my Folder under the naming convention below; they are graded with the module's other questions then.</p>`}
    </div></div>
    ${pdfBox(lesson, onScreen.length === 1 && sets.length > 1 ? onScreen[0] : null)}
    ${kcSave(qs)}`;
}
// The index: one row per module, its status at a glance, linking to that module's own page — not its
// questions inline, so every module's answer sheet is its own page instead of all of them stacked on one.
function moduleRow(lesson){
  const all = kcQuestionsFor(lesson);
  if(!all.length) return "";
  const studied = moduleStudied(lesson), qs = studied ? all : all.filter(x => x.set.open);
  const title = ftName(lesson);
  if(!qs.length) return lockedCard(title);
  const done = qs.filter(x => has(((FP.data.sets[x.set.id] || {}).answers || [])[x.i])).length;
  const best = studied ? kcBest(lesson) : null, prog = (state.progress || {})[lesson] || {};
  const st = prog.done ? {k:"done", t:"Passed"} : done === qs.length ? {k:"part", t:"Ready to submit"} : done ? {k:"part", t:"In progress"} : {k:"none", t:"Not started"};
  return `<button type="button" class="card fp-row" onclick="FTProcess.openLesson(${lesson}, true)">
    <span class="fp-row-main"><b>${e(title)}</b><span class="fp-muted">${done} of ${qs.length} answered</span></span>
    <span class="fp-row-pills"><span class="fp-st st-${st.k}">${e(st.t)}</span>${best != null ? `<span class="fp-st st-${best >= KC_PASS ? "done" : "part"}">Best ${num(best)}%</span>` : ""}</span>
  </button>`;
}

// 📄 A lesson's assessments (Day 2's, the guide's homework documents), shown in the page above its questions, in the
// order they follow their videos on the day's slide; open whether or not the lesson's questions are yet
const ASSESSMENTS = {2: [
  {t: "Common Terms Used – Assessment", id: "14sz5f3HTQKmryc7Upvlc6qua008rPnmw"},
  {t: "Auto Liability Insurance – Assessment", id: "11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C"}],
  // (Day 11's, answered on the platform: js/ft-assess.js)
  7: [{t: "Policy Disclosure, Claim & Liability Evaluation", id: "policy-disclosure"}]};
function assessCard(lesson){
  // (opened from the assessment's own link on the slide, FTDayDecks.toAssess: that one only)
  let back = null; try{ back = JSON.parse(sessionStorage.getItem("ftKCBack") || "null"); }catch(err){}
  // (not on the lesson's Knowledge Check page itself: each assessment is a stop of its own on the deck, its video's Next,
  // and on the 🗺 Map; the card shows only the one a slide's own link opened)
  if(!(back && back.assess && Number(back.l) === Number(lesson))) return "";
  const xs = (ASSESSMENTS[lesson] || []).filter(x => x.id === back.assess); if(!xs.length) return "";
  // (one answered on the platform, js/ft-assess.js: a button to its own page, FTProcess.openAssess)
  const here = x => window.FTAssess && FTAssess.has(x.id);
  return `<div class="card fp-set fp-assess"><div class="fp-head"><b>📄 Assessments</b><span class="fp-count">${xs.every(here) ? "Answer each on its own page, then 📝 Submit for Grading" : "Answer each in its document, then upload it to your Assessments/Activities subfolder"}</span></div>
    <div class="fp-body">${xs.map(x => here(x) ? `<div class="fp-assess-h"><b>${e(x.t)}</b><button class="btn btn-navy btn-sm" type="button" onclick="FTProcess.openAssess(${Number(lesson)}, '${e(x.id)}')">📄 Open the assessment →</button></div>` : `<div class="fp-assess-h"><b>${e(x.t)}</b><a class="btn btn-ghost btn-sm" href="https://docs.google.com/document/d/${x.id}/edit" target="_blank" rel="noopener noreferrer">Open ↗</a></div>
      <div class="fp-assess-doc"><iframe src="https://docs.google.com/document/d/${x.id}/preview" title="${e(x.t)}" loading="lazy"></iframe></div>`).join("")}</div></div>`;
}

// 📄 an assessment opened by its video's Next on the deck (Day 2's: js/ft-day-decks.js ASSESS_NEXT): a Knowledge Check
// page of its own, the assessment and nothing else (no Process Questions, no other check), and the button on to the
// deck's next slide (opened from its lesson's Knowledge Check instead: the button back to that page)
function assessPage(b){
  const x = (ASSESSMENTS[b.l] || []).find(a => a.id === b.assess); if(!x) return "";
  // (answered on the platform where js/ft-assess.js has it, with 📝 Submit for Grading; else its document)
  const here = window.FTAssess && FTAssess.has(x.id);
  return `<div class="fp-hero"><h1>📄 ${e(x.t)}</h1>
      <p>${here ? "Answer every item here: your answers save as you type. Then hit <b>📝 Submit for Grading</b>." : "Answer it in its document, then upload it to your Assessments/Activities subfolder."}</p></div>
    ${here ? FTAssess.html(x.id) : `<div class="card fp-set fp-assess"><div class="fp-body">
      <div class="fp-assess-doc"><iframe src="https://docs.google.com/document/d/${x.id}/preview" title="${e(x.t)}" loading="lazy"></iframe></div></div></div>`}
    ${b.day && window.FTDayDecks ? `<div class="fp-assess-back">${b.tool && typeof window.lshOpenPortalDrafting === "function" ? `<button class="btn btn-navy" type="button" onclick="FTProcess.toTool()">Next: ${e(b.h || "the Drafting Tool")} · open the Drafting Tool ↗</button>` : `<button class="btn btn-navy" type="button" onclick="FTProcess.backToClass()">Back to the deck · Next: ${e(b.h || `Day ${Number(b.day)}`)} →</button>`}</div>`  : `<div class="fp-assess-back"><button class="btn btn-navy" type="button" onclick="FTProcess.backToClass()">← Back to ✍️ Knowledge Check: ${e(ftName(b.l))}</button></div>`}`;
}

function renderPage(){
  if(!state.traineeId && !state.isAdmin && !state.adminPreview) return `<div class="card" style="padding:28px;">Sign in to answer the Process Questions.</div>`;
  // Admins get every trainee's answer sheets on this same page: ✍️ Process Questions is one feature, with no Admin tab.
  // …except a lesson's own sheet opened from its Activity deck (FTDayDecks.toKC): a trainer sees that sheet as trainees do
  const fromDeck = (()=>{ try{ const b = JSON.parse(sessionStorage.getItem("ftKCBack") || "null"); return !!(b && state.pqLesson && Number(b.l) === Number(state.pqLesson)); }catch(err){ return false; } })();
  if(state.isAdmin && !state.adminPreview && !fromDeck) return `<div class="fp-hero"><h1>✍️ Knowledge Check</h1>
      <p>Every trainee’s answer sheets, by batch, and the Knowledge Check each one is graded as. Trainees answer the process questions on this same page.</p></div>
    ${renderAdminProcess()}`;
  const only = (()=>{ try{ const b = JSON.parse(sessionStorage.getItem("ftKCBack") || "null"); return b && b.only && b.assess && Number(b.l) === Number(state.pqLesson) ? b : null; }catch(err){ return null; } })();
  if(only) return assessPage(only);
  if(FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  loadReview();
  if(FP.err) return `<div class="card" style="padding:28px;">${e(FP.err)} <button class="btn btn-ghost btn-sm" onclick="FTProcess.reload()">Try again</button></div>`;
  if(!FP.data) return `<div class="card" style="padding:28px;">Loading your answers…</div>`;
  // Each module is its own page (goto('process', lessonId), FTProcess.openLesson): a lesson's own
  // ✓ Finish lesson lands here directly, not on a long page of every module's questions stacked together.
  const lesson = state.pqLesson && kcQuestionsFor(state.pqLesson).length ? state.pqLesson : null;
  // opened from a deck slide (Day 1's Reading Task, FTDayDecks.toKC): the way back to the classroom's next activity, beside
  // 📝 Submit for Grading at the foot of the sheet
  let back = null; try{ back = JSON.parse(sessionStorage.getItem("ftKCBack") || "null"); }catch(err){}
  const backBtn = back && Number(back.l) === Number(lesson) && back.day && back.id && window.FTDayDecks
    ? (back.assess ? `<button class="btn btn-navy btn-sm" type="button" onclick="FTProcess.backToClass()">← Back to the deck · 📊 ${e(back.h || `Day ${Number(back.day)}`)}</button>`
      : `<button class="btn btn-navy btn-sm" type="button" onclick="FTProcess.backToClass()">Back to the classroom · Next: ${back.h ? e(back.h) : `Day ${Number(back.day)}`} →</button>`) : "";
  // (opened from an assessment's link on the slide, FTDayDecks.toAssess: the way back is right under that assessment too)
  const assessBack = backBtn && back.assess ? `<div class="fp-assess-back">${backBtn}</div>` : "";
  // (opened from the deck, the way on is the classroom's next activity only: no ← Back to Process Questions beside it)
  if(lesson) return `<div class="fp-hero">${backBtn ? "" : `<button class="btn btn-ghost btn-sm" type="button" onclick="goto('process')">← Back to Process Questions</button>`}
      ${window.FTKCGames ? `<button class="btn btn-navy btn-sm" type="button" onclick="FTKCGames.open(${Number(lesson)})">🎮 Review with the Knowledge Games</button>` : ""}
      <h1>✍️ ${e(ftName(lesson))}</h1>
      <p>Answer every question in complete sentences, then <b>📝 Submit for Grading</b>: each answer is scored in your facilitator's own feedback style, and your trainer adds their review. Your answers save as you type. Then <b>📄 Save PDF to my Folder</b> before the end of your shift: your answer sheet is saved as a PDF in your Assessment and Activities Folder, named by its convention. <span class="fp-save" id="fpSave"></span></p></div>
    ${assessCard(lesson)}${assessBack}${moduleCard(lesson, backBtn)}`;
  return `<div class="fp-hero"><h1>✍️ Knowledge Check</h1>
      <p>One set of questions per module, and each set is that module's Knowledge Check. A module's questions open when you finish the module — press <b>📋 Classroom Activity</b> on the module's last slide, do the day's activities, then answer them here. Each answer sheet is also saved in your Assessment and Activities Folder that day: the platform finds it there and checks its name and when it was saved.</p></div>
    <div class="fp-index">${DAYS.filter(d => kcQuestionsFor(d.id).length).map(d => moduleRow(d.id)).join("")}</div>`;
}

window.FTProcess = {
  // ✍️ Process Questions, at one lesson's own answer-sheet page: where a lesson's ✓ Finish lesson sends the
  // trainee, and what tapping a module's row on the index opens.
  // Back to the classroom: the deck's next activity after the slide the sheet was opened from (see FTDayDecks.toKC)
  // the evaluation's Next straight into its drafting tool on the Training Portal (Day 11: the LOR Drafting Activity)
  toTool(){
    let b = null; try{ b = JSON.parse(sessionStorage.getItem("ftKCBack") || "null"); sessionStorage.removeItem("ftKCBack"); }catch(err){}
    const t = b && b.tool; window.lshOpenPortalDrafting(t && t !== "lor" ? t : undefined);
  },
  backToClass(){
    let b = null; try{ b = JSON.parse(sessionStorage.getItem("ftKCBack") || "null"); sessionStorage.removeItem("ftKCBack"); }catch(err){}
    // (an assessment opened from its lesson's Knowledge Check, FTProcess.openAssess: back to that lesson's page)
    if(b && b.day && window.FTDayDecks) FTDayDecks.slide(Number(b.day), String(b.id || ""), "", b.at || ""); else if(b && b.l && kcQuestionsFor(Number(b.l)).length) goto("process", Number(b.l)); else goto("process");
  },
  // an on-platform assessment opened from its lesson's Knowledge Check: its own page, as from the deck (with no way back to a deck)
  openAssess(lesson, doc){
    try{ sessionStorage.setItem("ftKCBack", JSON.stringify({l: Number(lesson), sheet: "pq", assess: String(doc), only: true})); }catch(err){}
    goto("process", Number(lesson));
  },
  // (fresh: opened from the ✍️ Knowledge Check index, not a deck: a route left from an earlier deck visit, the Reading
  // Task's, must not pick the sheet; the lesson opens on its newest open sheet)
  openLesson(lesson, fresh){
    const l = Number(lesson);
    if(!kcQuestionsFor(l).length) return;
    if(fresh){ try{ sessionStorage.removeItem("ftKCBack"); }catch(err){} }
    goto("process", l);
  },
  set(sid, i, v){
    const x = sheet(sid); x.answers[i] = v; x.updatedAt = new Date().toISOString(); queueSave();
  },
  // 📝 Submit on an open sheet before its module is finished (Day 1's Reading Task): every answer in complete sentences, then
  // the sheet is marked submitted (the trainer sees it); it is graded with the module's Knowledge Check once the module is finished
  submitOpen(sid){
    if(!isTraineeHere()){ toast("👁 Trainee view — a trainee submits their own answers."); return; }
    const set = PROCESS_SETS.find(s=>s.id===sid); if(!set) return;
    const x = sheet(sid), short = set.questions.map((q,i)=>i).filter(i=>String((x.answers||[])[i] || "").trim().split(/\s+/).filter(Boolean).length < 5).map(i=>"Q"+(i+1));
    if(short.length){ toast(`Answer every question in complete sentences first (${short.join(", ")}).`); return; }
    x.submittedAt = new Date().toISOString(); queueSave();
    toast(`✓ ${set.title} submitted. Now 📄 Save PDF to my Folder, named ${fileName(set)}.`); render();
  },
  // 📝 Submit for Grading: the sheet's answers go to its lesson's Knowledge Check (the same answers), graded there.
  savePdf, downloadPdf, submitWorksheet,
  // 🏷 the naming conventions of the files this page asks for (js/ft-trainee-log.js checks a trainee's folder against them):
  // each answer sheet's and each worksheet's, with "(first name)" after it
  conventions: () => [...new Set(PROCESS_SETS.map(st => st.file))].map(f => ({name: f + " (VA’s first name)", what: "✍️ Knowledge Check answer sheet"}))
    .concat(Object.values(WORKSHEETS).map(w => ({name: w.file + " (VA’s first name)", what: "📝 " + w.t}))),
  grade(sid, lessonId){ FTKc.open(lessonId); setTimeout(()=>FTKc.submit(lessonId), 0); },
  reload(){ FP.id = null; FP.err = ""; render(); },
};

/* ---------- a lesson's Knowledge Check questions ---------- */
// Which questions each lesson's Knowledge Check asks: a set's own lesson, or (kc) split across lessons.
const kcLessons = set => set.kc ? Object.keys(set.kc).map(Number) : [set.lesson];
const kcQuestionsFor = lessonId => PROCESS_SETS.flatMap(set => kcLessons(set).includes(lessonId)
  ? (set.kc ? set.kc[lessonId] : set.questions.map((_,i)=>i)).map(i=>({set, i, q:qtext(set,i)})) : []);
window.ftKcQuestions = kcQuestionsFor;
// The Process Questions aren't a slide in the lessons: they open from ✍️ Knowledge Check in the top bar
// (js/lsh-program.js), and finishing a lesson opens its Knowledge Check (finishTrainingForDay, below).

/* ---------- admin: every trainee's answer sheets ---------- */
const FPA = {rows:null, loading:false, open:{}, sheetOpen:{}, closed:{}, kcOpen:{}, qeditOpen:false, folder:{}};
async function loadAdmin(){
  FPA.loading = true;
  try{
    const keys = (await sharedList("process:")) || [];
    // The trainee records in one request, then the active trainees' answer sheets (sharedGetMany; ftGetMany in js/ft-updates.js).
    const ids = keys.map(k=>String(k).replace(/^process:/, ""));
    const people = await sharedGetMany(ids.map(id=>"trainee:"+id));
    // (only active trainees: no record (deleted), archived, revoked or offboarded drops the row — ftActiveTrainee, js/ft-roster.js)
    const rows = ids.map((id, i)=>{ const rec = people[i]; return {id, rec, name:(rec&&rec.name)||id, batch:(rec&&rec.batch)||""}; })
      .filter(x=>x.rec && !x.rec.archived && (!window.ftActiveTrainee || ftActiveTrainee(x.rec)));
    const sheets = await ftGetMany(rows.map(x=>"process:"+x.id).concat(rows.map(x=>"kcreview:"+x.id)));
    rows.forEach((x, i)=>{ x.p = sheets[i] || {sets:{}}; x.rv = sheets[rows.length + i] || {lessons:{}}; if(!x.rv.lessons) x.rv.lessons = {}; });
    FPA.rows = rows.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  }catch(err){ FPA.rows = []; }
  FPA.loading = false;
  if(state.view==="process") render();
}
// a trainee added, revoked or offboarded: the rows are read again
if(typeof window.addEventListener === "function") window.addEventListener("ft-roster-changed", () => { FPA.rows = null; });
// 📅 an answer sheet is due once its lesson's last training day is over (training day n: the nth weekday from the batch's
// first day, its Batch ID) — the batch progresses day by day, so a lesson not reached yet isn't "missing". Without a batch
// date, every sheet is expected (as before).
function sheetDue(s, batch){
  const st = batch && typeof batchStartDate === "function" ? batchStartDate(batch) : "";
  const days = st && window.FTDays && typeof FTDays.forLesson === "function" ? FTDays.forLesson(s.lesson) : [];
  if(!days.length) return true;
  const n = Math.max(...days); let t = Date.parse(st + "T12:00:00Z"), k = 0, d = "";
  for(let i = 0; i < 60; i++, t += 864e5){ const wd = new Date(t).getUTCDay(); if(wd >= 1 && wd <= 5 && ++k >= n){ d = new Date(t).toISOString().slice(0, 10); break; } }
  const today = window.FTTrackerRules ? FTTrackerRules.ptDate() : new Date().toISOString().slice(0, 10);
  return !d || d < today;
}
window.ftSheetDue = sheetDue;
// The ranking report's line, in the facilitator's words (only the sheets due by now, and any already submitted).
function reportLine(x, batch){
  const sub = s=>!!((x.p.sets||{})[s.id]||{}).submittedAt;
  const sets = PROCESS_SETS.filter(s=>sub(s) || sheetDue(s, batch)), done = sets.filter(sub);
  if(!sets.length) return "";
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
    <div class="fp-qedit"><div class="fp-qedit-hd" onclick="FTProcessAdmin.toggleQEdit()">${FPA.qeditOpen?"▾":"▸"} ✏️ Edit question wording</div>
      ${FPA.qeditOpen ? `<p class="fp-muted">A typo or a clearer phrasing — not the number of questions, or which lesson they belong to. Changes apply right away, to every trainee.</p>
        ${PROCESS_SETS.map(s=>`<div class="fp-qedit-set"><b>${e(s.title)}</b>
          <ol>${s.questions.map((q,i)=>`<li><textarea rows="2" data-qset="${s.id}" data-qidx="${i}">${e(qtext(s,i))}</textarea></li>`).join("")}</ol>
        </div>`).join("")}
        <button class="btn btn-navy btn-sm" type="button" onclick="FTProcessAdmin.saveQuestions(this)">💾 Save question wording</button>` : ""}
    </div>
    ${FPA.rows.length ? keys.map(b=>{ const closed = !!FPA.closed[b];
      return `<section class="fp-batch"><div class="fp-batch-hd" onclick="FTProcessAdmin.batch(${e(JSON.stringify(b))})">${closed?"▸":"▾"} <b>📁 ${e(b ? "Batch "+b : "No batch set")}</b> <span class="fp-muted">${groups[b].length} trainee${groups[b].length===1?"":"s"}</span></div>
      ${closed ? "" : groups[b].map(x=>{ const open = !!FPA.open[x.id], sub = PROCESS_SETS.filter(s=>((x.p.sets||{})[s.id]||{}).submittedAt).length;
        return `<div class="fp-arow"><div class="fp-arow-hd" onclick="FTProcessAdmin.row('${x.id}')">${open?"▾":"▸"} <b>${e(x.name)}</b> <span class="fp-pill ${sub===PROCESS_SETS.length?"ok":sub?"mid":"bad"}">${sub} of ${PROCESS_SETS.length} submitted</span> ${kcPills(x.p)}</div>
          ${open ? `<pre class="fp-report">${e(reportLine(x, x.batch))}</pre>
            <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcessAdmin.copy('${x.id}')">📋 Copy for the Report</button>
            <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcessAdmin.folder('${x.id}')" ${(FPA.folder[x.id] || {}).busy ? "disabled" : ""}>🔁 Check their folder</button>
            ${kcAdmin(x)}
            ${PROCESS_SETS.map(s=>{ const a = (x.p.sets||{})[s.id], st = statusOf(s, a), k = x.id+"|"+s.id;
              const sc = sheetScore(x, s), fl = folderCell(x, s, a);
              return `<div class="fp-asheet"><div class="fp-asheet-hd" onclick="FTProcessAdmin.sheet('${x.id}','${s.id}')">${FPA.sheetOpen[k]?"▾":"▸"} ${e(s.title)} <span class="fp-st st-${st.k}">${st.t}</span> <span class="fp-muted">${answered(s, a)} of ${s.questions.length} answered${a && a.submittedAt ? ` · ${e(new Date(a.submittedAt).toLocaleDateString())}` : ""}</span>
                ${sc.pct != null ? `<span class="fp-pill ${sc.pct >= KC_PASS ? "ok" : "mid"}" title="${e(sc.how)}">🏅 ${num(sc.pct)}%${sc.trainer ? " · trainer’s final" : ""}</span>` : a && a.submittedAt ? `<span class="fp-pill">not graded yet</span>` : ""} ${fl}</div>
                ${FPA.sheetOpen[k] ? `${sc.summary ? `<p class="fp-muted fp-why"><b>Why ${num(sc.pct)}%:</b> ${e(sc.how)}. ${e(sc.summary)}</p>` : sc.pct != null ? `<p class="fp-muted fp-why"><b>Why ${num(sc.pct)}%:</b> ${e(sc.how)}.</p>` : ""}
                  <ol class="fp-aans">${s.questions.map((q,i)=>{ const g = answerGrade(x, s, i);
                    return `<li><b>${e(qtext(s,i))}</b><div>${has(((a||{}).answers||[])[i]) ? e(a.answers[i]).replace(/\n/g, "<br>") : '<span class="fp-muted">(unanswered)</span>'}</div>
                    ${g ? `<div class="kc-fb kc-${kcTone(g.score)}"><b>${num(g.score)}/10</b> ${e(g.feedback || "")}</div>` : ""}${g && g.note ? `<div class="fp-tnote">🧑‍🏫 ${e(g.note)}</div>` : ""}</li>`; }).join("")}</ol>` : ""}</div>`; }).join("")}` : ""}</div>`; }).join("")}</section>`; }).join("")
      : `<div class="fp-muted" style="margin:14px 0;">No trainee has started the Process Questions yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTProcessAdmin.refresh()">Refresh</button></div></div>`;
}
// The trainer's review of each Knowledge Check the trainee took: the graded attempt (score and the AI's feedback in the
// facilitator's DNA, per answer), and the trainer's own comment per answer, overall comment and final score.
// (a lesson with a 📖 Reading Task, Day 1: two entries, the lesson's own sheet and the Reading Task, each with its own review:
// the Reading Task's in kcreview:<id>.read[lesson], its final score the Reading Task's own, apart from the lesson's)
/* 🏅 a sheet's score, as the Scorecard counts it: the trainer's final score, else the graded best of its Knowledge Check
   (a 📖 Reading Task its own; a sheet split across lessons, its first lesson's), with the why: the attempts and the
   overall evaluation. Each answer's grade (out of 10) and feedback from the last graded attempt, with the trainer's note. */
const setLessons = s => kcLessons(s);
function sheetScore(x, s){
  const read = !!s.open && !!readSetOf(s.lesson), l = setLessons(s)[0];
  const rec = read ? ((x.p.kcRead || {})[l]) : ((x.p.kc || {})[l]), rv = read ? ((x.rv.read || {})[l] || {}) : (x.rv.lessons[l] || {});
  const t = trainerScore(rv), g = rec && rec.attempts ? rec.best : null, pct = t != null ? t : g;
  const how = t != null ? `the trainer’s final score${g != null ? ` (graded best ${num(g)}%, ${num(rec.attempts)} attempt${rec.attempts === 1 ? "" : "s"})` : ""}`
    : g != null ? `graded best of ${num(rec.attempts)} attempt${rec.attempts === 1 ? "" : "s"} (the ${ftName(l)} Knowledge Check, 70% passes)` : "";
  return {pct, trainer: t != null, how, summary: [rec && rec.last && rec.last.summary, rv.comment ? "Trainer: " + rv.comment : ""].filter(Boolean).join(" ")};
}
function answerGrade(x, s, i){
  const recs = Object.values(x.p.kc || {}).concat(Object.values(x.p.kcRead || {})).filter(r => r && r.last && Array.isArray(r.last.items));
  const g = recs.map(r => r.last.items.find(it => it.sid === s.id && it.i === i)).filter(Boolean)[0];
  const note = Object.values(x.rv.lessons || {}).concat(Object.values(x.rv.read || {})).map(r => ((r || {}).notes || {})[s.id + "|" + i]).find(has);
  return g || note ? Object.assign({score: g ? g.score : "—", feedback: g ? g.feedback : ""}, note ? {note} : {}) : null;
}
// the folder, for the trainer: what the trainee's session recorded, else the trainer's own look in the folder
function folderCell(x, s, a){
  const link = f => `<a href="${e(f.link || f.url || "#")}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">“${e(f.name)}” ↗</a>`;
  if(a && a.file) return `${fileStatus(s, a)} ${link(a.file)}`;
  const F = FPA.folder[x.id];
  const found = F && F.files ? findInFolder(s, a, F.files, firstOf(x.name)) : null;
  if(found) return `${fileStatus(s, {file: found})} ${link(found)} <span class="fp-muted">(found by the trainer’s check)</span>`;
  if(a && a.drive && a.drive.at) return `<span class="fp-pill ok">📄 Saved to their folder ${e(new Date(a.drive.at).toLocaleDateString())}</span>${a.drive.link ? " " + link({name: fileName(s, firstOf(x.name)) + ".pdf", link: a.drive.link}) : ""}`;
  if(!a || !(a.submittedAt || answered(s, a))) return "";
  if(!F || F.busy) return `<span class="fp-pill">Checking their folder…</span>`;
  if(F.error) return `<span class="fp-pill mid" title="${e(FOLDER_WHY[F.error] || F.error)}">⚠ ${e(FOLDER_WHY[F.error] || "Couldn’t check their folder")}</span>`;
  return `<span class="fp-pill bad" title="Looked for “${e(fileName(s, firstOf(x.name)))}” in their Assessment & Activities Folder">Not found in their folder</span>`;
}
async function checkTraineeFolder(id, force){
  const F = FPA.folder[id]; if(F && (F.busy || (!force && F.at && Date.now() - F.at < 120000))) return;
  FPA.folder[id] = {busy: true, at: Date.now()}; render();
  let j = {};
  try{ const r = await authFetch("/api/drive/answers", {id}); j = await r.json().catch(() => ({})); }catch(err){ j = {error: "offline"}; }
  FPA.folder[id] = {busy: false, at: Date.now(), files: j.files || null, error: j.files ? "" : (j.error || "drive")};
  if(state.view === "process") render();
}
const readSetOf = l => { const sets = [...new Set(kcQuestionsFor(l).map(q => q.set))]; return sets.length > 1 ? sets.find(st => !!st.open) || null : null; };
// ↺ Grant a retry: a Knowledge Check is taken once; for a technical problem the trainer gives one more attempt, with the reason
function retryBox(x, l, read, rec){
  const used = (rec && rec.attempts) || 0, all = kcAllowed(x.rv, l, read), log = ((x.rv && x.rv.retryLog) || []).filter(g => g && g.key === retryKey(l, read));
  return `<div class="fp-kcrow fp-retry"><span class="fp-muted">🔒 Taken once. ${used ? `${used} of ${all} attempt${all === 1 ? "" : "s"} used.` : "Not taken yet."}${used && used < all ? " A retry is waiting to be used." : ""}</span>
      ${used >= all ? `<input data-retry-why maxlength="300" placeholder="The technical problem (e.g. the connection dropped while grading)">
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcessAdmin.retry('${x.id}', ${l}, ${read}, this)">↺ Grant a retry</button>` : ""}</div>
    ${log.length ? `<ul class="fp-retrylog">${log.slice(-5).map(g => `<li>↺ ${e(new Date(g.at).toLocaleString())}: ${e(g.why)}</li>`).join("")}</ul>` : ""}`;
}
function kcAdmin(x){
  const lessons = [...new Set(PROCESS_SETS.flatMap(kcLessons))].sort((a,b)=>a-b).filter(l=>DAYS.find(d=>d.id===l));
  const kc = (x.p && x.p.kc) || {}, kr = (x.p && x.p.kcRead) || {};
  const entries = lessons.flatMap(l => { const rs = readSetOf(l), qs = kcQuestionsFor(l);
    const own = {l, read:false, title:ftName(l), qs:rs ? qs.filter(q => q.set !== rs) : qs, rec:kc[l], rv:x.rv.lessons[l] || {}};
    return rs ? [own, {l, read:true, title:"📖 " + rs.title, qs:qs.filter(q => q.set === rs), rec:kr[l], rv:(x.rv.read || {})[l] || {}}] : [own]; });
  return `<div class="fp-kcadmin"><b class="fp-kcadmin-h">📝 Knowledge Checks: graded, then your review</b>
    ${entries.map(({l, read, title, qs, rec, rv})=>{ const k = x.id + "|" + l + (read ? "|read" : ""), open = !!FPA.kcOpen[k], last = rec && rec.last;
      const t = trainerScore(rv);
      return `<div class="fp-asheet"><div class="fp-asheet-hd" onclick="FTProcessAdmin.kc('${x.id}', ${l}, ${read})">${open ? "▾" : "▸"} ${e(title)}
          ${rec && rec.attempts ? `<span class="fp-pill ${rec.best >= KC_PASS ? "ok" : "mid"}">graded best ${num(rec.best)}% · ${num(rec.attempts)} of ${kcAllowed(x.rv, l, read)} attempt${kcAllowed(x.rv, l, read) === 1 ? "" : "s"} used</span>` : `<span class="fp-pill bad">not taken</span>`}
          ${rec && rec.attempts && rec.attempts < kcAllowed(x.rv, l, read) ? `<span class="fp-pill">↺ retry granted, not used yet</span>` : ""}
          ${t != null ? `<span class="fp-pill ${t >= KC_PASS ? "ok" : "mid"}">🧑‍🏫 final ${t}%</span>` : rv.comment ? `<span class="fp-pill">🧑‍🏫 commented</span>` : ""}</div>
        ${open ? `<div class="fp-kcform">
          ${last && last.summary ? `<p class="fp-muted"><b>Graded ${e(new Date(last.at).toLocaleString())}:</b> ${e(last.summary)}</p>` : ""}
          <ol class="fp-aans">${qs.map(q=>{ const g = last && (last.items || []).find(it=>it.sid === q.set.id && it.i === q.i), a = (((x.p.sets || {})[q.set.id] || {}).answers || [])[q.i];
            return `<li value="${q.i+1}"><b>${e(q.q)}</b><div>${has(a) ? e(a).replace(/\n/g, "<br>") : '<span class="fp-muted">(unanswered)</span>'}</div>
              ${g ? `<div class="kc-fb kc-${kcTone(g.score)}"><b>${num(g.score)}/10</b> ${e(g.feedback)}</div>` : ""}
              <textarea rows="2" data-note="${e(q.set.id + "|" + q.i)}" placeholder="Your comment on this answer (optional)">${e((rv.notes || {})[q.set.id + "|" + q.i] || "")}</textarea></li>`; }).join("")}</ol>
          <label class="fp-kclabel">Overall comment<textarea rows="3" data-comment placeholder="Your overall review, added to the graded feedback">${e(rv.comment || "")}</textarea></label>
          <div class="fp-kcrow"><label>Final score <input type="number" min="0" max="100" data-score value="${t != null ? t : ""}" placeholder="${rec && rec.attempts ? num(rec.best) : "—"}"> %</label>
            <span class="fp-muted">Empty keeps the graded score. ${read ? "Yours replaces it as the Reading Task’s own score; the lesson’s score is its own sheet’s." : `Yours replaces it; ${KC_PASS}% or more finishes the lesson.`}</span>
            <button class="btn btn-navy btn-sm" type="button" onclick="FTProcessAdmin.saveKc('${x.id}', ${l}, this, ${read})">Save my review</button></div>
          ${retryBox(x, l, read, rec)}
        </div>` : ""}</div>`; }).join("")}</div>`;
}
// ↺ one more attempt at a Knowledge Check (l) or its Reading Task (read), for a technical problem (why, kept with it):
// kcreview:<id>.retries/.retryLog. Read strictly, so a failed read never writes over the trainer's reviews. Also used by the
// 📋 Batch Sheet's trainer tools. Returns {ok, allowed} or {error}.
async function grantRetry(id, l, read, why){
  why = String(why || "").trim().slice(0, 300); if(!why) return {error: "Write the technical problem first: it is kept with the retry."};
  const got = await readStrict("kcreview:" + id); if(!got.ok) return {error: "Couldn’t read the trainee’s record. Check your connection."};
  const pr = await readStrict("process:" + id); if(!pr.ok) return {error: "Couldn’t read the trainee’s record. Check your connection."};
  const cur = got.value || {lessons:{}}; if(!cur.lessons) cur.lessons = {};
  const k = retryKey(l, read), used = ((((pr.value || {})[read ? "kcRead" : "kc"] || {})[l]) || {}).attempts || 0;
  cur.retries = cur.retries || {};
  // (one attempt more than they have used: a trainee who took it several times before the once-only rule gets one more too)
  cur.retries[k] = Math.max((Number(cur.retries[k]) || 0) + 1, used);
  cur.retryLog = (Array.isArray(cur.retryLog) ? cur.retryLog : []).concat([{key:k, lesson:l, read:!!read, why, at:new Date().toISOString()}]).slice(-200);
  if(await sharedSet("kcreview:" + id, cur) === false) return {error: "Couldn’t grant the retry. Check your connection."};
  return {ok: true, review: cur, allowed: kcAllowed(cur, l, read), used};
}
// (the 📋 Batch Sheet's ✍️ Knowledge Checks in detail shows the same report line: p is a trainee's process:<id>)
window.FTProcessReport = (p, batch) => reportLine({p: p || {sets: {}}}, batch);
window.FTKCRetry = {grant: grantRetry, lessons: () => [...new Set(PROCESS_SETS.flatMap(kcLessons))].sort((a, b) => a - b).filter(l => DAYS.find(d => d.id === l)).map(l => ({l, title: (DAYS.find(d => d.id === l) || {}).title || "Lesson " + l, read: !!readSetOf(l)}))};
window.FTProcessAdmin = {
  kc(id, l, read){ const k = id + "|" + l + (read ? "|read" : ""); FPA.kcOpen[k] = !FPA.kcOpen[k]; render(); },
  async saveKc(id, l, btn, read){
    const x = FPA.rows.find(r=>r.id===id); if(!x) return;
    const box = btn.closest(".fp-kcform"), notes = {};
    box.querySelectorAll("textarea[data-note]").forEach(t=>{ if(has(t.value)) notes[t.getAttribute("data-note")] = t.value.trim().slice(0, 2000); });
    const sv = String(box.querySelector("input[data-score]").value || "").trim();
    if(sv !== "" && !(Number(sv) >= 0 && Number(sv) <= 100)){ toast("The final score is a number from 0 to 100."); return; }
    btn.disabled = true;
    try{
      const got = await readStrict("kcreview:" + id); if(!got.ok) throw new Error("read");   // (never over the retries and other reviews on a failed read)
      const cur = got.value || {lessons:{}}; if(!cur.lessons) cur.lessons = {};
      const review = {score:sv === "" ? null : Math.round(Number(sv)), comment:String(box.querySelector("textarea[data-comment]").value || "").trim().slice(0, 4000), notes, at:new Date().toISOString(), by:"trainer"};
      if(read){ cur.read = cur.read || {}; cur.read[l] = review; } else cur.lessons[l] = review;
      if(await sharedSet("kcreview:" + id, cur) === false) throw new Error("save");
      x.rv = cur; toast("✓ Review saved. The trainee sees it on their Knowledge Check.");
    }catch(err){ toast("Couldn’t save the review. Check your connection."); }
    btn.disabled = false; render();
  },
  // ↺ one more attempt at a Knowledge Check (a technical problem), with the reason: kcreview:<id>.retries and .retryLog
  async retry(id, l, read, btn){
    const x = FPA.rows.find(r=>r.id===id); if(!x) return;
    const why = String((btn.parentElement.querySelector("[data-retry-why]") || {}).value || "").trim().slice(0, 300);
    if(!why){ toast("Write the technical problem first: it is kept with the retry."); return; }
    btn.disabled = true;
    const r = await grantRetry(id, l, read, why);
    if(r.ok){ x.rv = r.review; toast(`✓ Retry granted. ${x.name || "The trainee"} can submit the ${read ? "Reading Task" : "Knowledge Check"} once more.`); }
    else toast(r.error);
    btn.disabled = false; render();
  },
  row(id){ FPA.open[id] = !FPA.open[id]; render(); if(FPA.open[id]) checkTraineeFolder(id); },
  folder(id){ checkTraineeFolder(id, true); },
  sheet(id, sid){ const k = id+"|"+sid; FPA.sheetOpen[k] = !FPA.sheetOpen[k]; render(); },
  batch(b){ FPA.closed[b] = !FPA.closed[b]; render(); },
  refresh(){ FPA.rows = null; FPA.folder = {}; render(); },
  copy(id){ const x = FPA.rows.find(r=>r.id===id); if(!x) return;
    (navigator.clipboard ? navigator.clipboard.writeText(reportLine(x, x.batch)) : Promise.reject()).then(()=>toast("Copied."), ()=>toast("Couldn’t copy. Select the text instead.")); },
  toggleQEdit(){ FPA.qeditOpen = !FPA.qeditOpen; render(); },
  async saveQuestions(btn){
    const box = btn.closest(".fp-qedit"), next = {};
    box.querySelectorAll("textarea[data-qset]").forEach(t=>{
      const sid = t.getAttribute("data-qset"), i = Number(t.getAttribute("data-qidx")), set = PROCESS_SETS.find(s=>s.id===sid);
      const v = t.value.trim();
      if(set && has(v) && v !== set.questions[i]) (next[sid] = next[sid] || {})[i] = v;
    });
    btn.disabled = true;
    try{
      if(await sharedSet("processq:overrides", next) === false) throw new Error("save");
      QOV = next; toast("✓ Question wording saved — every trainee sees it now."); render();
    }catch(err){ toast("Couldn’t save. Check your connection."); btn.disabled = false; }
  }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="process") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-process">${renderPage()}</main>` + renderFooter();
  paintSave();
  try{ afterRender(); }catch(err){}
};
// A trainee's answers load with 📚 Dashboard, the landing page, so the lesson card and the slide know them.
(window.LSH_HOME_STATS = window.LSH_HOME_STATS || []).push(function(){
  if(state.traineeId && !state.isAdmin && FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  if(state.traineeId && !state.isAdmin) loadReview();
  return "";
});

/* ---------- the Knowledge Check: each lesson's process questions, graded like EA/PA's ----------
   A lesson with process questions ends with a Knowledge Check (#/kc): the lesson's questions, answered in
   writing (the same answers as the ✍️ Process Questions sheet). The AI scores each answer out of 10 for
   accuracy, depth and clarity, with a line of feedback; the total is a percentage, 70% passes and
   finishes the lesson, and a retake keeps the best score (state.progress, so it reaches the trainee's
   record like EA/PA's Knowledge Check scores). Lessons without process questions finish as before. */
const KC_PASS = 70;
const KC = {grading:false, shown:{}};
// the answers a grading was given, as one string: grading the very same answers again only makes a new attempt whose score
// can differ (a trainee pressing Submit for Grading again after 📄 Save PDF to my Folder saw their score change), so it isn't run
const kcSig = qs => qs.map(x => String((sheet(x.set.id).answers || [])[x.i] || "").trim().replace(/\s+/g, " ")).join("\u241E");
/* The trainer's review of a Knowledge Check: kcreview:<id> = {lessons: {<lesson id>: {score (0–100 or null), comment,
   notes: {"<set id>|<question>": comment}, at, by}}}. Admins write it (Admin → ✍️ Process Questions); the trainee reads it.
   A trainer's score is the lesson's final Knowledge Check score: it replaces the graded best (higher or lower), and a
   passing one finishes the lesson. */
const KR = {id:null, data:null, at:0, loading:null, read:false};
function loadReview(force){
  if(!state.traineeId || state.isAdmin || KR.loading) return KR.loading;
  if(!force && KR.id === state.traineeId && Date.now() - KR.at < 120000) return null;
  const id = state.traineeId; KR.at = Date.now();
  // (KR.read: a record really came back. sharedGet answers null for a failed read as for no record, and a failed read must never
  // be taken for the trainer clearing their scores)
  KR.loading = sharedGet("kcreview:" + id).then(v=>{ KR.id = id; KR.data = v && v.lessons ? v : {lessons:{}}; KR.read = !!(v && v.lessons); applyReviews(); })
    .catch(()=>{}).then(()=>{ KR.loading = null; if(["kc","process"].includes(state.view)) render(); });
  return KR.loading;
}
const kcReview = id => (KR.id === state.traineeId && KR.data && KR.data.lessons[id]) || null;
const readReview = id => (KR.id === state.traineeId && KR.data && (KR.data.read || {})[id]) || null;
const trainerScore = r => r && r.score != null && r.score !== "" && isFinite(Number(r.score)) ? Math.max(0, Math.min(100, Math.round(Number(r.score)))) : null;
/* 🔒 A Knowledge Check is taken ONCE. The attempts a trainee has are 1 plus the retries their trainer granted for a technical
   problem (✍️ Knowledge Check, as an admin → the sheet → ↺ Grant a retry): kcreview:<id>.retries = {"<lesson>" (its own
   sheet) | "read<lesson>" (its 📖 Reading Task): n}, each with a line in kcreview:<id>.retryLog ({key, lesson, read, why, at}).
   worker.js holds a trainee's process:<id> to the same count, so a new attempt past it is never saved. A grading that
   fails (the AI didn't answer) isn't an attempt. */
const retryKey = (id, read) => (read ? "read" : "") + id;
const kcAllowed = (rv, id, read) => 1 + Math.max(0, Math.floor(Number(((rv && rv.retries) || {})[retryKey(id, read)]) || 0));
const myAllowed = (id, read) => kcAllowed(KR.id === state.traineeId ? KR.data : null, id, read);
const kcUsed = (id, read) => { const r = read ? readRec(id) : kcRec(id); return (r && r.attempts) || 0; };
const kcLeft = (id, read) => myAllowed(id, read) - kcUsed(id, read);
// the Knowledge Check page's button (Submit, once; a retry the trainer granted; or ✓ Taken) and the line under it
function kcButton(id, read){
  const used = kcUsed(id, read), all = myAllowed(id, read);
  return (used >= all ? `<button class="btn btn-navy" id="kcSubmit" type="button" disabled>✓ Taken · ${used} of ${all} attempt${all === 1 ? "" : "s"} used</button>`
    : `<button class="btn btn-navy" id="kcSubmit" type="button" onclick="FTKc.submit(${id})">${used ? "🔁 Retry granted by your trainer: Submit for Grading" : "Submit for Grading"}</button>`) + `<span class="fp-save" id="fpSave"></span>`;
}
function kcNote(id, read){
  const used = kcUsed(id, read), all = myAllowed(id, read), what = read ? "Reading Task" : "Knowledge Check";
  return `<p class="fp-muted kc-once">🔒 ${used >= all ? `You've taken this ${what}: it is taken once. If a technical problem affected your attempt, ask your trainer: they can grant a retry.`
    : used ? "Your trainer granted a retry: it is one more attempt, so submit when every answer is final."
    : `You take this ${what} once: submit when every answer is final. (If a technical problem affects it, your trainer can grant a retry.)`}</p>`;
}
// The lesson's Knowledge Check score: the trainer's when they gave one, else the best graded attempt.
function kcBest(id){ const t = trainerScore(kcReview(id)); if(t != null) return t; const r = kcRec(id); return r && r.attempts ? r.best : null; }
// A trainer's score reaches the lesson's progress (and the trainee's record): a passing one finishes the lesson.
// (the graded best is kept beside it, gradedScore, so a trainer's score taken away again gives the graded best back)
function applyReviews(){
  let changed = false;
  Object.keys((KR.data && KR.data.lessons) || {}).forEach(k=>{
    const id = Number(k), t = trainerScore(KR.data.lessons[k]); if(t == null || !DAYS.find(d=>d.id===id)) return;
    const prev = state.progress[id] || {};
    if(prev.trainerScore === t) return;
    const graded = prev.trainerScore == null ? prev.score : prev.gradedScore;
    state.progress[id] = Object.assign({}, prev, {score:t, trainerScore:t, gradedScore:typeof graded === "number" ? graded : null}, t >= KC_PASS ? {done:true, date:prev.date || new Date().toISOString()} : {done:prev.done && t >= KC_PASS});
    changed = true;
  });
  // a trainer's score cleared: the lesson's score is the graded best again (and a lesson only that score had finished isn't).
  // Only from a record that was read and lists the lesson with its score emptied: never on a failed read or a missing record
  if(KR.read) Object.keys(state.progress || {}).forEach(k=>{
    const id = Number(k), prev = state.progress[k] || {};
    const rv = ((KR.data && KR.data.lessons) || {})[k];
    if(prev.trainerScore == null || !rv || trainerScore(rv) != null) return;
    const r = kcRec(id), best = r && r.attempts ? r.best : (typeof prev.gradedScore === "number" ? prev.gradedScore : null);
    if(best == null && !FP.data) return;   // (the graded attempts not read yet: wait for them rather than drop the score)
    const next = Object.assign({}, prev, {score:best == null ? undefined : best});
    delete next.trainerScore; delete next.gradedScore; if(next.score === undefined) delete next.score;
    if(prev.trainerScore >= KC_PASS && !(best >= KC_PASS)) next.done = false;
    state.progress[id] = next; changed = true;
  });
  // 📖 a Reading Task's final score from the trainer: its own score (readScore), the graded best kept as readGraded; cleared,
  // the graded best again
  Object.keys(state.progress || {}).forEach(k=>{
    const id = Number(k), prev = state.progress[k] || {}, rv = ((KR.data && KR.data.read) || {})[k], t = trainerScore(rv);
    const rr = ((FP.data && FP.data.kcRead) || {})[k], graded = rr && rr.attempts ? rr.best : (typeof prev.readGraded === "number" ? prev.readGraded : null);
    if(t != null && prev.readTrainer !== t){ state.progress[id] = Object.assign({}, prev, {readScore:t, readTrainer:t}, graded != null ? {readGraded:graded} : {}); changed = true; }
    else if(t == null && prev.readTrainer != null && KR.read && rv){ const next = Object.assign({}, prev); delete next.readTrainer; delete next.readGraded;
      if(graded != null) next.readScore = graded; else delete next.readScore; state.progress[id] = next; changed = true; }
  });
  if(changed){ storeSet("day-progress", state.progress); try{ syncToLedger(); }catch(err){} }
}
function reviewBlock(id, rr){
  const r = rr || kcReview(id); if(!r || (!r.comment && trainerScore(r) == null && !Object.values(r.notes || {}).some(has))) return "";
  const t = trainerScore(r);
  return `<div class="card kc-trainer"><div class="kc-trainer-h">🧑‍🏫 <b>Your trainer’s review</b>${t != null ? `<span class="fp-pill ${t >= KC_PASS ? "ok" : "mid"}">Final score ${t}%</span>` : ""}</div>
    ${r.comment ? `<p>${e(r.comment).replace(/\n/g, "<br>")}</p>` : ""}
    <p class="fp-muted">${r.at ? `Reviewed ${e(new Date(r.at).toLocaleString())}. ` : ""}${t != null ? "Your trainer’s score is this Knowledge Check’s final score." : ""}</p></div>`;
}
window.EXTRA_ROUTE_VIEWS = window.EXTRA_ROUTE_VIEWS.concat(["kc"]);
const kcRec = id => ((FP.data && FP.data.kc) || {})[id] || null;
/* 📖 a lesson's Reading Task (an open sheet, Day 1's PI Overview, shown on a page of its own) is scored separately from the
   lesson's own sheet: its attempts in process:<id>.kcRead[lesson] ({attempts, best, last}), its best in the lesson's progress
   as readScore (the Scorecard's own line). The lesson's Knowledge Check score, and its pass, are its own sheet's alone. */
const readRec = id => ((FP.data && FP.data.kcRead) || {})[id] || null;
const isReadPage = (all, onScreen) => onScreen.length > 0 && onScreen.every(st => !!st.open) && new Set(all.map(x => x.set)).size > onScreen.length;
const shownKey = (id, read) => read ? id + ":read" : id;
const kcTone = sc => sc >= 7 ? "ok" : sc >= 5 ? "mid" : "low";
function kcReport(id, r){
  const tier = gradeTierFor(r.pct), color = GRADE_TIER_COLOR[tier] || "var(--ink-soft)", qs = kcQuestionsFor(id);
  return `<div class="eval-report kc-report">
    <div class="eval-report-header">
      <div class="eval-score-ring" style="--ring-color:${color};"><span>${num(r.pct)}</span></div>
      <div><div class="eval-tier" style="color:${color};">${r.pct >= KC_PASS ? "Passed · " + e(displayTier(tier)) : `Not yet · ${KC_PASS}% passes`}</div>
        <div class="eval-subscore-row">${(r.items||[]).map(it=>`<span>Q${num(it.i)+1} ${num(it.score)}/10</span>`).join("")}</div></div>
    </div>
    ${mindsetNote(r.pct)}
    ${r.summary ? `<div class="eval-section"><b>Overall</b><p style="margin:4px 0 0;">${e(r.summary)}</p></div>` : ""}
    <p class="fp-muted" style="margin:8px 0 0;">Graded ${e(new Date(r.at).toLocaleString())} · ${qs.length} question${qs.length===1?"":"s"} · feedback is under each answer below.</p>
  </div>`;
}
// A lesson with process questions is finished on this page, not on the lesson itself. Until now that
// left the trainee on a graded sheet with a toast and nothing to do next, so the next step from the
// curriculum (js/ft-next-step.js) is shown here the moment the check passes.
const root_FTNextStep = () => (window.FTNextStep && typeof window.FTNextStep.compact === "function") ? window.FTNextStep : null;
function renderKc(){
  const id = Number(state.dayId), d = DAYS.find(x=>x.id===id), qs = kcQuestionsFor(id);
  const back = `<a class="back-link" onclick="goto('modules')">&larr; Back to Dashboard</a>`;
  if(!d || !qs.length) return `${back}<div class="card" style="padding:28px;">This lesson has no Knowledge Check.</div>`;
  const intro = `<p class="eyebrow">Knowledge Check</p><h1>${e(d.title)}</h1>
    <p>Answer each process question in complete sentences. Each answer is scored out of 10 for accuracy, depth and clarity, with feedback written the way your facilitator gives it; <b>${KC_PASS}% passes</b> and finishes the lesson. It is taken <b>once</b>, so submit when every answer is final; your trainer adds their own review (and can grant a retry if a technical problem affects your attempt).</p>`;
  if(state.isAdmin && !state.adminPreview) return `${back}<div class="kc-hero">${intro}</div>
    <div class="card kc-card">${bySheet(qs, x=>`<li value="${x.i+1}"><div class="fp-q">${e(x.q)}</div></li>`)}
    <p class="fp-muted">Trainees take this Knowledge Check. Their scores, and your review of each one, are under ✍️ Knowledge Check in the top bar.</p></div>`;
  if(FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  if(FP.err) return `${back}<div class="card" style="padding:28px;">${e(FP.err)} <button class="btn btn-ghost btn-sm" onclick="FTProcess.reload()">Try again</button></div>`;
  if(!FP.data) return `${back}<div class="card" style="padding:28px;">Loading your answers…</div>`;
  loadReview();
  const read = isReadPage(qs, shownSets(qs)), rec = read ? readRec(id) : kcRec(id), shown = KC.shown[shownKey(id, read)] || (rec && rec.last), prog = state.progress[id] || {};
  const locked = kcLeft(id, read) <= 0;   // 🔒 taken: the answers stay as they were graded
  // the answers card (each answer, its AI feedback and the trainer's note from the review `rv`) and the answer-sheet box
  const kcCard = rv => `<div class="card kc-card">
      ${bySheet(qs, x=>{ const g = shown && (shown.items||[]).find(it=>it.sid===x.set.id && it.i===x.i);
        return `<li value="${x.i+1}"><div class="fp-q">${e(x.q)}</div>
          <textarea rows="5" placeholder="Your answer, in complete sentences." ${locked ? "readonly" : ""} oninput="FTProcess.set('${x.set.id}',${x.i},this.value)">${e((sheet(x.set.id).answers||[])[x.i]||"")}</textarea>
          ${g ? `<div class="kc-fb kc-${kcTone(g.score)}"><b>${num(g.score)}/10</b> ${e(g.feedback)}</div>` : ""}
          ${(()=>{ const n = ((rv || {}).notes || {})[x.set.id + "|" + x.i]; return has(n) ? `<div class="kc-fb kc-trainer-note"><b>🧑‍🏫 Trainer</b> ${e(n)}</div>` : ""; })()}</li>`; })}
      <div class="fp-actions">${kcButton(id, read)}</div>${kcNote(id, read)}
      <p class="fp-muted">Your answers save as you type.</p>
      ${pdfBox(id)}
    </div>
    ${kcSave(qs)}`;
  if(read) return `${back}
    <div class="kc-hero">${intro.replace(/<b>\d+% passes<\/b> and finishes the lesson/, "it is scored on its own, apart from the lesson’s Knowledge Check")}
      ${rec && rec.attempts ? `<div class="kc-stats">📖 Reading Task · ${trainerScore(readReview(id)) != null ? `final score <b>${trainerScore(readReview(id))}%</b> (your trainer’s) · best graded ${num(rec.best)}%` : `best score <b>${num(rec.best)}%</b>`} · ${num(rec.attempts)} attempt${rec.attempts===1?"":"s"}</div>` : ""}</div>
    ${readReview(id) ? reviewBlock(id, readReview(id)).replace("this Knowledge Check’s final score", "the Reading Task’s final score") : ""}
    ${shown ? kcReport(id, shown).replace(/Passed · |Not yet · \d+% passes/, "") : ""}
    ${kcCard(readReview(id))}`;
  return `${back}
    <div class="kc-hero">${intro}
      ${rec && rec.attempts ? `<div class="kc-stats">${trainerScore(kcReview(id)) != null ? `Final score <b>${kcBest(id)}%</b> (your trainer’s) · best graded ${num(rec.best)}%` : `Best score <b>${num(rec.best)}%</b>`} · ${num(rec.attempts)} attempt${rec.attempts===1?"":"s"}${prog.done ? " · ✓ Lesson finished" : ""}</div>` : ""}</div>
    ${reviewBlock(id)}
    ${shown ? kcReport(id, shown) : ""}
    ${prog.done && root_FTNextStep() ? root_FTNextStep().compact(id) : ""}
    ${kcCard(kcReview(id))}`;
}
// 📄 The lesson's answer sheet: saved that day in the Assessment and Activities Folder, named by its convention, checked there by the platform
function kcSave(qs){
  // no box for the trainee: the folder is linked once, in Setting of Training Expectations, and the platform only checks,
  // quietly, that each answer sheet is in it, named by its convention, on time (the trainer sees the result)
  const sets = [...new Set(qs.map(x=>x.set))];
  if(isTraineeHere()){ sets.forEach(assignedOn); checkFolder(); }
  return "";
}
// the grader's reply as the stored grading record: each answer's score (0–10) and feedback, the percent, the summary;
// null when the reply has no scores. `extra` adds the caller's own fields (sig, auto).
function kcResult(raw, qs, extra){
  const got = Array.isArray(raw && raw.items) ? raw.items : []; if(!got.length) return null;
  const items = qs.map((x, k) => { const it = got.find(g => Number(g && g.n) === k + 1) || got[k] || {};
    return {sid: x.set.id, i: x.i, score: Math.max(0, Math.min(10, Math.round(Number(it.score) || 0))), feedback: String(it.feedback || "").slice(0, 900)}; });
  const pct = Math.round(items.reduce((a, b) => a + b.score, 0) / (10 * items.length) * 100);
  return Object.assign({pct, items, summary: String((raw && raw.summary) || "").slice(0, 1200), at: new Date().toISOString(), voice: "facilitator-dna"}, extra);
}
// ✍️ the grading prompt (the facilitator's DNA, each answer 0–10 and its feedback, the summary): the trainee's 📝 Submit for
// Grading, and a sheet left "Submitted" graded by itself on the trainer's side (ftKcGradeFor)
function kcPrompt(d, qs, ans){
  return `You are grading a trainee Legal Virtual Assistant's written answers to the process questions of the "${d.title}" lesson in Legal Support Help's Foundational Training. The trainees are VAs (mostly in the Philippines and Latin America) learning to support U.S. personal injury law firms.

Grade each answer from 0 to 10, rigorously and realistically:
- Accuracy: correct about U.S. law-firm practice and the personal injury workflow; no wrong legal or procedural statements.
- Depth: answers every part of the question (both the "what" and the "why"), with reasons or a concrete example.
- Clarity: complete sentences in a professional tone.
Scale: 9-10 thorough and correct; 7-8 good with minor gaps; 5-6 partly answers or stays shallow; 3-4 mostly vague or off target; 0-2 blank, irrelevant or wrong. A one-line or generic answer can't score above 4. Don't reward length alone.
Write the feedback the way this program's facilitator evaluates trainees (her feedback DNA, below): for each answer, two or three sentences in the third person, opening with a verdict label and a period ("Very strong performance.", "Good.", "Good, with Improvements Needed.", "Satisfactory.", "Needs Improvement.", "Needs Significant Improvement.", "Incomplete Submission."), then "Demonstrated a … understanding of …" naming exactly what the answer got right, then "However, improvement is needed in …" naming the exact parts of the question it missed or got wrong, and closing on why it matters for the Legal VA's work. Name specifics, never vague praise. Don't give legal advice.
The summary is the facilitator's overall evaluation of the response: a verdict label, the strength, the precise improvements needed, in 2–4 sentences.

FACILITATOR'S FEEDBACK DNA:
${window.ftDnaGuide ? ftDnaGuide() : String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

QUESTIONS AND ANSWERS:
${qs.map((x,k)=>`${k+1}. QUESTION: ${x.q}\n   ANSWER: ${ans(x).replace(/\s+/g, " ")}`).join("\n")}

Return ONLY a JSON object, no other text:
{"items":[{"n":1,"score":<integer 0-10>,"feedback":"..."}, ... one per question, in order], "summary":"the facilitator's overall evaluation, 2-4 sentences"}`;
}
/* 🔁 an answer sheet submitted but never graded (✍️ Process Questions shows "Submitted"): graded on the trainer's side, in the
   same way, when the batch's Batch Sheet opens (js/ft-batch-sheet.js) — its result kept in the trainee's process:<id> as their
   own grading would (kc / kcRead[lesson]: attempts, best, last), so the Score Card, ✍️ Process Questions and the trainee's
   Knowledge Check page show it. read: the lesson's Reading Task sheet (Day 1's), else its own. */
window.ftKcGradeFor = async function(tid, lessonId, read){
  const d = DAYS.find(x => x.id === Number(lessonId)); if(!d || typeof callAIJson !== "function") return null;
  const proc = (await sharedGet("process:" + tid)) || {}; proc.sets = proc.sets || {};
  const all = kcQuestionsFor(lessonId), sets = [...new Set(all.map(x => x.set))], rs = sets.length > 1 ? sets.find(st => st.open) : null;
  const qs = all.filter(x => read ? x.set === rs : (!rs || x.set !== rs)); if(!qs.length) return null;
  const ans = x => String((((proc.sets[x.set.id] || {}).answers) || [])[x.i] || "").trim();
  if(!qs.some(x => ans(x))) return null;
  const raw = await callAIJson(kcPrompt(d, qs, ans), 1800, undefined, "grading");
  const r = kcResult(raw, qs, {auto: "trainer-side"}); if(!r) return null;
  const pct = r.pct;
  // (read again just before writing: the trainee may have saved meanwhile; only their grading record is added to)
  const cur = (await sharedGet("process:" + tid)) || proc, slot = read ? "kcRead" : "kc";
  cur[slot] = cur[slot] || {}; const rec = cur[slot][lessonId] = cur[slot][lessonId] || {attempts: 0, best: 0, last: null};
  if(rec.attempts) return null;   // (graded meanwhile)
  rec.attempts = 1; rec.best = pct; rec.last = r;
  if(await sharedSet("process:" + tid, cur) === false) return null;
  return r;
};
window.FTKc = {
  open(id){ state.dayId = Number(id); KC.shown[id] = null; KC.shown[shownKey(id, true)] = null; goto("kc"); window.scrollTo(0, 0); },
  async submit(id){
    if(KC.grading) return;
    if(!state.traineeId || (state.isAdmin && !state.adminPreview)){ toast("Trainees take the Knowledge Check."); return; }
    const d = DAYS.find(x=>x.id===id), all = kcQuestionsFor(id);
    const ans = x => String((sheet(x.set.id).answers||[])[x.i] || "").trim();
    // the sheet on screen is the one graded (Day 1 shows one of its two at a time: the Reading Task's, or the lesson's own),
    // each scored on its own (a trainee on the Virtual Assistant Essentials sheet was blocked by the Reading Task's six
    // questions, which that page doesn't show)
    const onScreen = shownSets(all), read = isReadPage(all, onScreen), sk = shownKey(id, read);
    // 🔒 taken once: the trainer's grants read fresh first (a retry granted a minute ago counts)
    { const p = loadReview(true); if(p) await p; }
    // (and the attempts saved elsewhere since this page loaded: a second tab mustn't grade again)
    { const fr = await readStrict("process:" + state.traineeId); if(fr.ok && fr.value) mergeAttempts(fr.value); }
    if(kcLeft(id, read) <= 0){ toast(`You've taken this ${read ? "Reading Task" : "Knowledge Check"}: it is taken once. If a technical problem affected your attempt, ask your trainer for a retry.`, 9000); render(); return; }
    const qs = all.filter(x => onScreen.includes(x.set));
    // (a lesson graded from two answer sheets, Day 1's Reading Task and its Process Questions: the message names the sheet
    // that still has short answers, so a trainee on the other sheet's page knows where to go)
    const shortQs = qs.filter(x=>ans(x).split(/\s+/).filter(Boolean).length < 5);
    if(shortQs.length){
      const bySet = [...new Set(shortQs.map(x=>x.set))].map(st => `${st.title}: ${shortQs.filter(x=>x.set===st).map(x=>"Q"+(x.i+1)).join(", ")}`);
      toast(`Answer every question in complete sentences (5 words or more) before you submit. Still to answer: ${bySet.join(" · ")}.`, 9000); return; }
    // (the same answers as the last graded attempt: its result stands, no new attempt)
    const sig = kcSig(qs), last = ((read ? readRec(id) : kcRec(id)) || {}).last;
    if(last && last.sig === sig){
      KC.shown[sk] = last; if(state.view !== "kc"){ state.dayId = Number(id); goto("kc"); } else render();
      toast(`Already graded: ${last.pct}%. Your answers haven’t changed since, so the score stands.`, 8000); return; }
    KC.grading = true;
    const btn = document.getElementById("kcSubmit"); if(btn){ btn.disabled = true; btn.textContent = "Grading your answers…"; }
    const prompt = kcPrompt(d, qs, ans);
    try{
      const raw = await callAIJson(prompt, 1800, undefined, "grading");
      const r = kcResult(raw, qs, {sig});
      if(!r) throw new Error("The grader didn't return scores. Please submit again.");
      const pct = r.pct;
      // 📖 the Reading Task: its own score, kept apart; the lesson's score and its pass stay its own sheet's
      if(read){
        FP.data.kcRead = FP.data.kcRead || {};
        const rr = FP.data.kcRead[id] = FP.data.kcRead[id] || {attempts:0, best:0, last:null};
        rr.attempts++; rr.best = Math.max(rr.best||0, pct); rr.last = r;
        onScreen.forEach(set=>{ const x = sheet(set.id); if(answered(set, x) === set.questions.length) x.submittedAt = r.at; });
        await saveNow();
        const tRead = trainerScore(readReview(id));
        state.progress[id] = Object.assign({}, state.progress[id] || {}, {readScore:tRead != null ? tRead : rr.best, readAttempts:rr.attempts}, tRead != null ? {readGraded:rr.best} : {});
        await storeSet("day-progress", state.progress);
        try{ syncToLedger(); }catch(err){}
        KC.shown[sk] = r;
        toast(`📖 Reading Task: ${pct}% (best ${rr.best}%). It is scored on its own.`);
        return;
      }
      FP.data.kc = FP.data.kc || {};
      const rec = FP.data.kc[id] = FP.data.kc[id] || {attempts:0, best:0, last:null};
      rec.attempts++; rec.best = Math.max(rec.best||0, pct); rec.last = r;
      // the answer sheet counts as submitted once all its questions are answered
      [...new Set(qs.map(x=>x.set))].forEach(set=>{ const x = sheet(set.id); if(answered(set, x) === set.questions.length) x.submittedAt = r.at; });
      await saveNow();
      const prev = state.progress[id] || {};
      const tScore = trainerScore(kcReview(id));
      state.progress[id] = Object.assign({}, prev, {score:tScore != null ? tScore : rec.best, kcAttempts:rec.attempts}, tScore != null ? {gradedScore:rec.best} : {}, (tScore != null ? tScore : pct) >= KC_PASS ? {done:true, date:prev.done && prev.date ? prev.date : r.at} : {});
      await storeSet("day-progress", state.progress);
      try{ syncToLedger(); }catch(err){}
      KC.shown[sk] = r;
      if(pct >= KC_PASS){ toast(`✓ ${pct}% · ${ftName(id)} finished.`); if(pct >= 85) burstConfetti(); }
      else toast(`${pct}%: not yet at ${KC_PASS}%. Read the feedback under each answer; your trainer reviews it too.`);
    }catch(err){
      toast((err && err.message) ? "Couldn't grade your answers: " + err.message : "Couldn't grade your answers. Please try again.");
    }finally{
      KC.grading = false; render(); window.scrollTo(0, 0);
    }
  }
};
// A day with a lesson runs Lesson → its Activities → its Process Questions, and only then on through the
// curriculum. So finishing a lesson does NOT jump to ✍️ Knowledge Check: it records the lesson as studied
// (which is what unlocks its Process Questions) and goes to 📚 Dashboard, where the next-step band
// (js/ft-next-step.js) puts the day's activities first and the Process Questions after them.
// A lesson without process questions is finished outright, as before.
const __finish = window.finishTrainingForDay;
window.finishTrainingForDay = async function(id){
  const l = Number(id);
  if(!kcQuestionsFor(l).length) return __finish.apply(this, arguments);
  if(state.traineeId && !state.isAdmin && !(state.progress[l] || {}).studied){
    state.progress[l] = Object.assign({}, state.progress[l], {studied:true, studiedAt:new Date().toISOString()});
    try{ await storeSet("day-progress", state.progress); }catch(err){}
  }
  window.FT_JUST_STUDIED = l;                    // the band says "studied — now the activities" on arrival
  return goto("modules");
};
window.goToKnowledgeCheckWithInterstitial = function(){ return window.finishTrainingForDay(state.dayId); };
// the page, beside ✍️ Knowledge Check
const __kcRender = window.render;
window.render = function(){
  if(state.view!=="kc") return __kcRender.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __kcRender.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-process">${renderKc()}</main>` + renderFooter();
  if(typeof afterRender === "function") afterRender();
};
// a lesson card shows its Knowledge Check score
const __card = window.moduleCard;
window.moduleCard = function(d){
  const html = __card.apply(this, arguments), p = state.progress[d.id];
  if(!kcQuestionsFor(d.id).length || !p || !p.score) return html;
  return html.replace(/(<div class="mh-day">)([\s\S]*?)(<\/div>)/, (m, a, b, c)=>`${a}${p.done ? "Finished" : "Knowledge Check"} &middot; ${p.done ? "" : "best "}${num(p.score)}%${c}`);
};
function kcPills(p){
  const lessons = [...new Set(PROCESS_SETS.flatMap(kcLessons))].sort((a,b)=>a-b);
  const kc = (p && p.kc) || {};
  return lessons.filter(l=>kc[l]).map(l=>`<span class="fp-pill ${kc[l].best>=KC_PASS?"ok":"mid"}" title="${e(ftName(l))} Knowledge Check, best score">L${l} ${num(kc[l].best)}%</span>`).join(" ");
}

(function(){ const s = document.createElement("style"); s.id = "ft-process"; s.textContent = `
main.main-process{max-width:1000px;margin:0 auto;padding:24px 16px 40px;}
.fp-why{margin:6px 0 2px 18px;} .fp-tnote{margin:4px 0 0;padding:5px 9px;border-left:3px solid #5B7DB1;background:#F3F6FB;font-size:13px;}
.kc-hero{margin:0 0 14px;} .kc-hero h1{margin:2px 0 6px;color:var(--navy);font-size:28px;} .kc-hero p{margin:0 0 8px;color:var(--ink-soft);font-size:15px;}
.kc-stats{display:inline-block;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:13.5px;color:var(--navy);}
.kc-card{padding:16px 18px;} .kc-report{margin-bottom:14px;}
.kc-fb{margin-top:6px;border-radius:8px;padding:8px 10px;font-size:14px;line-height:1.45;border-left:4px solid;}
.kc-fb b{margin-right:6px;} .kc-fb.kc-ok{background:var(--success-bg);border-color:var(--success);} .kc-fb.kc-mid{background:#FEF7C3;border-color:#C9A227;} .kc-fb.kc-low{background:var(--danger-bg);border-color:var(--danger);}

.fp-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;} .fp-hero p{margin:0 0 14px;color:var(--ink-soft);font-size:15px;}
.fp-hero .btn{margin-bottom:10px;}
.fp-save{margin-left:6px;font-size:13px;color:var(--success);}
.fp-muted{color:var(--ink-soft);font-size:13.5px;}
.fp-index{display:flex;flex-direction:column;gap:10px;}
.fp-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;width:100%;box-sizing:border-box;padding:14px 16px;cursor:pointer;font:inherit;text-align:left;background:#fff;border:1px solid var(--line);border-radius:12px;}
.fp-row:hover{border-color:var(--orange-soft);box-shadow:0 2px 8px rgba(0,0,0,.05);}
.fp-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;} .fp-row-main b{color:var(--navy);font-size:16px;}
.fp-row-pills{display:flex;gap:6px;flex-wrap:wrap;}
.fp-set{padding:0;margin-bottom:12px;overflow:hidden;} .fp-locked{opacity:.65;}
.fp-lockwhy{margin:0;padding:0 16px 12px;font-size:13px;}
.fp-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;font-size:16px;color:var(--navy);}
.fp-head b{flex:1;min-width:0;}
.fp-count{font-size:13px;color:var(--ink-soft);}
.fp-st{font-size:12.5px;border-radius:999px;padding:3px 10px;} .fp-st.st-none{background:var(--bg);color:var(--ink-soft);} .fp-st.st-part{background:#FEF7C3;color:#7a5d00;} .fp-st.st-done{background:var(--success-bg);color:var(--success);}
.fp-body{border-top:1px solid var(--line);padding:12px 16px 16px;}
.fp-assess-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 0 8px;color:var(--navy);font-size:16px;}
.fp-assess-h + .fp-assess-doc{margin-bottom:16px;}
.fp-assess-back{margin:-4px 0 16px;}
.fp-assess-doc{height:70vh;min-height:360px;border:2px solid #343C66;border-radius:10px;overflow:hidden;background:#fff;}
.fp-assess-doc iframe{width:100%;height:100%;border:0;}
.fp-pdf{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#F6F8FC;}
.fp-pdf-rule{margin:0;flex:1 1 100%;font-size:14px;line-height:1.9;} .fp-pdf-rule > span{font-weight:800;color:var(--orange-deep);}
.fp-ws > a.btn{text-decoration:none;} .fp-ws .fp-ws-drive{margin-left:auto;} .fp-ws .fp-ws-note{flex:1 1 100%;margin:0;font-size:13px;}
.fp-pdf-rule code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13.5px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:2px 8px;display:inline-block;max-width:100%;box-sizing:border-box;vertical-align:middle;line-height:1.5;word-break:normal;overflow-wrap:normal;}
.fp-sheet-h{margin:18px 0 4px;padding:8px 14px;background:#1E2340;color:#fff;border-left:5px solid #E8590C;border-radius:8px;font:800 16px/1.3 'Poppins','Inter',sans-serif;}
.fp-sheet-h:first-child{margin-top:0;}
.fp-sheet-h span{margin-left:8px;font:600 12.5px 'Inter',sans-serif;color:#C9CFE6;}
.fp-qs{margin:0;padding-left:30px;} .fp-qs li{margin:12px 0;} .fp-q{font-size:15px;color:var(--ink);margin-bottom:6px;}
.fp-qs textarea{width:100%;box-sizing:border-box;font:inherit;font-weight:500;font-size:15px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;resize:vertical;background:#fff;}
.fp-qs textarea:focus{outline:2px solid var(--orange-soft);border-color:var(--orange);}
.fp-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 8px;} .fp-actions a.btn{text-decoration:none;}
.fp-admin{padding:18px 20px;} .fp-admin h3{margin:0 0 4px;color:var(--navy);}
.fp-qedit{border:1px solid var(--line);border-radius:10px;margin:14px 0;padding:10px 14px;background:var(--bg);}
.fp-qedit-hd{cursor:pointer;color:var(--navy);font-size:15px;font-weight:600;}
.fp-qedit-set{margin:12px 0;} .fp-qedit-set > b{color:var(--navy);}
.fp-qedit-set ol{margin:6px 0 0;padding-left:22px;} .fp-qedit-set li{margin:8px 0;}
.fp-qedit-set textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;resize:vertical;background:#fff;}
.fp-qedit-set textarea:focus{outline:2px solid var(--orange-soft);border-color:var(--orange);}
.fp-batch{margin-top:12px;} .fp-batch-hd{cursor:pointer;padding:6px 0;color:var(--navy);font-size:15px;}
.fp-arow{border:1px solid var(--line);border-radius:10px;margin:6px 0;padding:8px 12px;background:#fff;}
.fp-arow-hd{cursor:pointer;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:15px;color:var(--navy);}
.fp-pill{border-radius:999px;padding:2px 9px;font-size:12.5px;} .fp-pill.ok{background:var(--success-bg);color:var(--success);} .fp-pill.mid{background:#FEF7C3;color:#7a5d00;} .fp-pill.bad{background:var(--danger-bg);color:var(--danger);}
.fp-report{white-space:pre-wrap;font-family:inherit;font-size:14px;background:var(--bg);border-radius:8px;padding:10px 12px;margin:8px 0;}
.fp-asheet{border-top:1px solid var(--line);margin-top:8px;padding-top:8px;} .fp-asheet-hd{cursor:pointer;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14.5px;color:var(--navy);}
.fp-aans{margin:8px 0 0;padding-left:22px;font-size:19px;line-height:1.55;} .fp-aans li{margin:12px 0;} .fp-aans li > b{font-size:19.5px;} .fp-aans li div{font-weight:600;margin-top:4px;font-size:18.5px;color:#141A2E;}
/* (the trainer reads the score and feedback at a glance: larger and bold) */ .fp-aans .kc-fb{font-weight:700;font-size:18.5px;line-height:1.5;} .fp-aans .kc-fb > b{font-size:20px;}
.fp-kcadmin{margin-top:10px;} .fp-kcadmin-h{display:block;color:var(--navy);font-size:14.5px;margin-bottom:2px;}
.fp-kcform{padding:6px 0 4px;} .fp-kcform textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:6px 9px;border:1px solid var(--line);border-radius:8px;margin-top:6px;resize:vertical;}
.fp-kclabel{display:block;font-weight:700;color:var(--navy);font-size:14px;margin-top:8px;}
.fp-kcrow{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px;}
.fp-retry{border-top:1px dashed #DDE1EC;padding-top:8px;} .fp-retry input{flex:1 1 260px;min-width:200px;padding:6px 9px;border:1px solid #CBD2E1;border-radius:8px;font:inherit;font-size:13.5px;}
.fp-retrylog{margin:6px 0 0;padding-left:18px;font-size:12.5px;color:var(--ink-soft);} .kc-once{margin:6px 0 0;} .fp-kcrow label{font-weight:700;color:var(--navy);font-size:14px;}
.fp-kcrow input{width:80px;font:inherit;padding:5px 8px;border:1px solid var(--line);border-radius:8px;}
.kc-trainer{padding:14px 16px;margin-bottom:14px;border-left:4px solid var(--navy);} .kc-trainer-h{display:flex;gap:10px;align-items:center;flex-wrap:wrap;color:var(--navy);font-size:15.5px;}
.kc-trainer p{margin:8px 0 0;font-size:14.5px;} .kc-fb.kc-trainer-note{background:#EEF2FF;border-color:var(--navy);}
`; document.head.appendChild(s); })();
})();
