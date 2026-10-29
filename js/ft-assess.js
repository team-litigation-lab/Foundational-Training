/* ============================================================
   📄 The assessments answered on the platform: Day 2's Common Terms Used and Auto Liability Insurance
   Loaded after js/ft-process.js. Each opens from its video's Next on Day 2's deck (js/ft-day-decks.js ASSESS_NEXT), on a
   Knowledge Check page of its own (js/ft-process.js assessPage), where the assessment is drawn here, to answer in place
   of the Word document: the answers save as the trainee types (assess:<id> = {v, docs: {"<doc id>": {answers,
   updatedAt}}}), and 📝 Submit for Grading has worker.js grade them (/api/assess/grade, its keys in assess-keys.js,
   never on a page): the matching items exactly, the short answers and identification by the AI against the key (else
   by the key's words), the essays by the AI out of 5 (else by the trainer). The result goes to trackerreview:<id>.assess,
   which only the Worker and trainers write: what is right, what to look at again, and the score on 🏅 My Performance.
   ============================================================ */
(function(){
const root = window;
const e = v => esc(String(v == null ? "" : v));
const L = "ABCDEFGHIJKLMNOPQRST".split("");
// the assessments: their parts, as the documents have them (the items' ids are assess-keys.js's)
const FORMS = {
  "14sz5f3HTQKmryc7Upvlc6qua008rPnmw": {title: "Common Terms Used – Assessment", file: "Common_Terms_Used_Assessment", max: 27, parts: [
    {kind: "match", h: "Part I. Matching Type", lead: "Listed are the common terms and abbreviations that you may encounter in VLF. Match the terms in Column A to the correct definition in Column B: pick the letter of the correct definition for each term.",
      terms: ["1P", "HIPAA", "PI", "3P", "HITECH", "SOL", "PIP", "MVC Primary", "Tort", "Minor’s Comp", "BI", "MVC Secondary", "PL", "Lit", "DOL", "UM/UIM", "HICF", "Totaled", "Worker’s Comp", "Intake"],
      defs: ["A federal act that seeks to protect patient information from being disclosed without the patient’s approval.",
        "The time elapsed that is allowed for a case to be brought to court for a civil suit.",
        "The driver of the car in the case we are handling.",
        "This process happens when an adult signs on behalf of a child so the child can receive money. The law doesn’t allow the child to sign for him or herself until s/he becomes an adult.",
        "This is the date of the accident.",
        "This is a form of insurance providing wage replacement and medical benefits to employees injured in the course of employment in exchange for mandatory relinquishment of the employee's right to sue his or her employer for the tort of negligence.",
        "This is an extension of car insurance that covers medical expenses and, in many cases, lost wages. It is often called “no-fault” coverage because its inherent comprehensiveness pays out claims agnostic of who is at fault in the accident.",
        "This refers to the passenger of the car.",
        "This refers to our client; the plaintiff; the claimant of the settlement case.",
        "This is a phase of a settlement case where proceedings are already dealt in court.",
        "This is a type of coverage that serves as protection from drivers who may not have an insurance or a policy limit that is too low to cover your expenses.",
        "This refers to any form of physical damage to a person’s body.",
        "This is a legal term for an injury to the body, mind or emotions, as opposed to an injury to property.",
        "This is the term used when a car is no longer drivable or repair would cost higher than the totaled value of the vehicle.",
        "The maximum amount of money that a claimant can get from an insured.",
        "This act was created to encourage healthcare providers to adopt electronic health records and improve privacy and security protections for healthcare data.",
        "This is the French word for “fault”.",
        "This is the phase in the PI Workflow after attracting a potential client: establishing rapport and building a relationship.",
        "This is the party at fault; the defendant.",
        "It is a form that shows the total charges of medical services given to a client by a health care provider usually used in the case of policy claims from insurance companies."]},
    {kind: "short", h: "Part II. Short Answer", id: "s",
      lead: "Read the following scenario and answer the questions thereafter.",
      scenario: "Jordan was driving along Baker’s Street on June 16, 2021 together with his girlfriend when he crossed an intersection and was T-boned by a speeding car which cut off a red light. The driver of the other car was a certain Mr. Sam Martin.",
      qs: ["Who is the 3P in the accident?", "Who is the 1P in the accident?", "Who is the Primary?", "Is there a Secondary? If yes, who?", "When was the DOL?",
        "When would be the SOL for this case if this happened in Nevada?", "If this happened in Washington, when would be the SOL for this case?"]}]},
  "11K7q6M8-mbtOU9OYA6wGe-vAKU6HKq6C": {title: "Auto Liability Insurance – Assessment", file: "Auto_Liability_Insurance_Assessment", max: 45, parts: [
    {kind: "short", h: "Part I. Identification", id: "i", lead: "Write the correct answer that is being asked for the following questions or statements.",
      qs: ["This is the maximum amount that an insurance company is willing to pay to a covered insured depending on the type of insurance coverage the person holds.",
        "What is the minimum liability insurance coverage required by the state of Nevada?",
        "Differentiate Bodily Injury Coverage from Property Damage Coverage.",
        "This is the name of the document given by insurance companies where the declared insurance policy of the insured party would be indicated.",
        "While reading the insurance policy coverage of the 3P, you encountered the term 50-100-50. The first 50 in this statement refers to what?",
        "On the same track, what does 100 indicate?",
        "This type of coverage will help the insured pay for damages to the car brought about by causes other than a vehicular collision.",
        "What do you call the amount that an insured must first pay before an insurance company will help him or her in paying the expenses incurred in cases such as a vehicular accident?",
        "In Nevada, when an accident occurs, the person who caused the accident must be responsible in paying for the injuries and damages acquired by the victim. This type of state is referred to as ___________.",
        "A type of coverage that can help an insured in paying expenses when the tortfeasor has no insurance coverage or has a coverage that may not be significantly enough to cover medical or property damage costs.",
        "During a bad snowstorm, your car was damaged due to the extreme cold and blizzard. Which coverage should help you in paying repair expenses?",
        "The primary goal of buying this type of insurance is to protect drivers from the burden of paying the costs for medical and property damages in the case he or she is involved in a vehicular accident.",
        "This coverage is an optional item that is primarily used in paying for medical expenses, no matter who is at fault in an accident.",
        "This is an auto policy option that covers the cost of a car rental if your vehicle is being repaired as part of a claim.",
        "What type of policy limit is referred to when auto companies such as Uber, Grab, and Lyft are involved?"]},
    {kind: "essay", h: "Part II. Short Essay", id: "e", lead: "Provide the best answer for the following situations and give the rationale/reason of your answer. Each is worth 5 points.",
      // (the two Declaration Pages the questions refer to are pictures in the assessment's document: shown from it, on Drive)
      groups: [
        {note: "For questions no. 1–3, refer to the first Declaration Page in the assessment’s document.", qs: [
          "Assuming that the above Declaration Page is of the 3P in a case you are handling. Looking at the coverage available, explain what the Bodily Injury Liability coverage limit of $25,000 each person/$50,000 each accident mean?",
          "Examining the UM/UIM of this coverage, what is the implication that the insured rejected this option? Explain your answer and give an example.",
          "Assuming that in the 1P vehicle, the driver’s wife and daughter were with him. Explain how the coverage will be in effect for the case of three people involved in one accident."]},
        {note: "For questions no. 4–6, refer to the second Declaration Page in the assessment’s document.", qs: [
          "The above image is the insurance coverage of Mr. John Doe who was involved in an accident on July 17, 2019. He decided to use his collision coverage in paying the repair costs of his car but the insurance company said they cannot grant Mr. Doe his coverage for now since he has not shown evidence that he already reached the deductible required in his insurance. How would you explain this to Mr. Doe?",
          "Let’s say that the image above shows the 1P insurance, and the 3P has 25-50 policy limit. When computing the total medical expenses so far, you noticed that necessary treatment costs has already reached $27,000 and immediately informed the case manager. Anticipate the CM’s next instructions and explain why you think the CM would have you do those steps.",
          "Assume that the Dec Page above is of the 3P coverage. Our client is the primary in this case with two secondaries involved with the following medical treatment billed: Primary – $55,000; First Secondary – $25,000; Second Secondary – $31,000. Would the above expenses suit the 3P insurance coverage? Explain your answer."]}]}]}
};

const A = {rec: null, id: null, loading: false, t: null, sending: false, review: null, saving: false};
/* 📄 Save PDF to my Folder, as the Process Questions' answer sheets have it (js/ft-process.js): the answers as a PDF, named
   by the assessment's convention (shown beside the button: it lives here, not on the deck), written into the trainee's
   Assessment and Activities Folder by the Worker (/api/drive/save; saving again replaces it). Where the platform can't
   write to the folder, the PDF downloads under the same name and the folder opens, to drop it in. */
const firstName = () => String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";
const fileName = doc => `${FORMS[doc].file} (${firstName() || "VA’s first name"})`;
const DRIVE_WHY = {"no-folder": "Link your Assessment and Activities Folder first (📁 My Drive links).", "no-access": "The platform can’t write to your folder yet: share it with the training account as Editor.",
  quota: "The platform can’t create files in your folder yet: ask your trainer.", "no-sa": "Saving to your folder isn’t set up yet: ask your trainer.", "drive-auth": "Saving to your folder isn’t set up yet: ask your trainer."};
async function answersPdf(doc){
  if(typeof ensureJsPdf !== "function" || !(await ensureJsPdf())) return null;
  const f = FORMS[doc], a = answers(doc), { jsPDF } = window.jspdf;
  const pdf = typeof safeDoc === "function" ? safeDoc(new jsPDF({unit: "pt", format: "letter"})) : new jsPDF({unit: "pt", format: "letter"});
  if(typeof drawPdfHeader === "function") drawPdfHeader(pdf, fileName(doc), "Assessment · Knowledge Check");
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), X = 54; let y = 118;
  const line = (t, bold, size, color) => { pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setFontSize(size); pdf.setTextColor(...color);
    pdf.splitTextToSize(String(t), W - X * 2).forEach(w => { if(y > H - 60){ pdf.addPage(); y = 60; } pdf.text(w, X, y); y += size + 4; }); };
  const ink = [27, 30, 46], navy = [38, 43, 69], ans = k => String(a[k] || "").trim() || "(no answer)";
  line(`Trainee: ${String(state.certName || state.traineeName || "").replace(/"/g, "")}`, false, 10, ink);
  line(`Date: ${new Date().toLocaleDateString(undefined, {weekday: "short", month: "short", day: "numeric", year: "numeric"})}`, false, 10, ink); y += 8;
  f.parts.forEach(p => {
    y += 6; line(p.h, true, 13, navy); y += 2;
    if(p.kind === "match") p.terms.forEach((t, i) => line(`${i + 1}. ${t}: ${ans("m" + (i + 1))}`, false, 10.5, ink));
    else if(p.kind === "short"){ if(p.scenario) line(p.scenario, false, 10, ink);
      p.qs.forEach((q, i) => { line(`${i + 1}. ${q}`, true, 10.5, navy); line(ans(p.id + (i + 1)), false, 10, ink); y += 4; }); }
    else { let n = 0; p.groups.forEach(g => g.qs.forEach(q => { n++; line(`${n}. ${q}`, true, 10.5, navy); line(ans(p.id + n), false, 10, ink); y += 6; })); }
  });
  return pdf;
}
// (the trainee's Assessment and Activities Folder, from 📁 My Drive links: opened when the PDF has to be dropped in by hand)
async function folderUrl(){ try{ const d = await sharedGet("drive:" + state.traineeId); return (d && d.folder) || ""; }catch(err){ return ""; } }
const mineKey = () => "assess:" + state.traineeId;
async function load(){
  if(!state.traineeId || A.loading || A.id === state.traineeId) return;
  A.loading = true;
  try{ A.rec = (await sharedGet(mineKey())) || {v: 1, docs: {}}; A.review = (await sharedGet("trackerreview:" + state.traineeId)) || {}; A.id = state.traineeId; }catch(err){}
  A.loading = false; render();
}
const answers = doc => ((((A.rec || {}).docs || {})[doc]) || {}).answers || {};
const graded = doc => ((A.review || {}).assess || {})[doc] || null;
function field(doc, id, kind, extra){
  const v = answers(doc)[id] || "", g = graded(doc), r = g && g.items ? g.items[id] : null;
  const mark = r ? `<span class="fa-mark ${r.ok ? "ok" : r.pts ? "part" : "no"}" title="${e(r.note || "")}">${r.ok ? "✓" : r.pts ? "◐" : "✗"}</span>` : "";
  const on = `oninput="FTAssess.set('${doc}','${id}',this.value)"`;
  if(kind === "match") return `<select class="fa-sel" ${on} aria-label="${e(extra)}"><option value=""></option>${L.slice(0, 20).map(x => `<option${v === x ? " selected" : ""}>${x}</option>`).join("")}</select>${mark}`;
  if(kind === "essay") return `<textarea class="fa-in fa-essay" rows="4" ${on} placeholder="Your answer and its rationale">${e(v)}</textarea>${mark}${r && r.note ? `<p class="fa-note">${e(r.note)}</p>` : ""}`;
  return `<input class="fa-in" type="text" value="${e(v)}" ${on} placeholder="Your answer">${mark}${r && r.note && !r.ok ? `<p class="fa-note">${e(r.note)}</p>` : ""}`;
}
function partHtml(doc, p){
  if(p.kind === "match") return `<section class="fa-part"><h3>${e(p.h)}</h3><p class="fa-lead">${e(p.lead)}</p>
    <div class="fa-match"><table class="fa-tbl"><thead><tr><th>Answer</th><th>Column A · Term</th></tr></thead><tbody>
      ${p.terms.map((t, i) => `<tr><td>${field(doc, "m" + (i + 1), "match", t)}</td><td><b>${i + 1}. ${e(t)}</b></td></tr>`).join("")}</tbody></table>
    <table class="fa-tbl fa-defs"><thead><tr><th colspan="2">Column B · Definition</th></tr></thead><tbody>
      ${p.defs.map((d, i) => `<tr><td class="fa-l">${L[i]}.</td><td>${e(d)}</td></tr>`).join("")}</tbody></table></div></section>`;
  if(p.kind === "short") return `<section class="fa-part"><h3>${e(p.h)}</h3><p class="fa-lead">${e(p.lead)}</p>${p.scenario ? `<p class="fa-scn">${e(p.scenario)}</p>` : ""}
    <ol class="fa-qs">${p.qs.map((q, i) => `<li><p>${e(q)}</p>${field(doc, p.id + (i + 1), "short")}</li>`).join("")}</ol></section>`;
  let n = 0;
  return `<section class="fa-part"><h3>${e(p.h)}</h3><p class="fa-lead">${e(p.lead)}</p>
    ${p.groups.map(g => `<div class="fa-grp"><p class="fa-scn">${e(g.note)} <a href="https://docs.google.com/document/d/${doc}/preview" target="_blank" rel="noopener noreferrer">Open the document ↗</a></p>
      <details class="fa-doc"><summary>📄 Show the Declaration Page here</summary><div class="fa-docframe"><iframe src="https://docs.google.com/document/d/${doc}/preview" title="The assessment’s document" loading="lazy"></iframe></div></details>
      <ol class="fa-qs" start="${n + 1}">${g.qs.map(q => { n++; return `<li><p>${e(q)}</p>${field(doc, p.id + n, "essay")}</li>`; }).join("")}</ol></div>`).join("")}</section>`;
}
root.FTAssess = {
  has: doc => !!FORMS[doc],
  // the assessment, to answer on the page, and 📝 Submit for Grading
  html(doc){
    const f = FORMS[doc]; if(!f) return "";
    if(!A.rec || A.id !== state.traineeId) load();
    const g = graded(doc);
    return `<div class="card fp-set fa-form">${f.parts.map(p => partHtml(doc, p)).join("")}
      <div class="fa-foot">${g ? `<p class="fa-done">✓ Graded ${e(g.when || "")}${g.pending ? " · your trainer grades the essays" : ""}. Your score is on 🏅 My Performance. You can correct your answers and submit again.</p>` : `<p class="fa-muted">Your answers save as you type.</p>`}
        <button type="button" class="btn btn-primary fa-submit" onclick="FTAssess.submit('${doc}')"${A.sending ? " disabled" : ""}>${A.sending ? "Grading…" : "📝 Submit for Grading"}</button></div>
      <div class="fp-pdf"><p class="fp-pdf-rule"><span>Naming convention:</span> <code>${e(fileName(doc))}</code></p>
        <button class="btn btn-ghost btn-sm fa-drive" type="button" onclick="FTAssess.savePdf('${doc}')"${A.saving ? " disabled" : ""}>${A.saving ? "Saving the PDF…" : "📄 Save PDF to my Folder"}</button></div></div>`;
  },
  set(doc, id, v){
    if(!state.traineeId) return;
    A.rec = A.rec || {v: 1, docs: {}}; A.rec.docs = A.rec.docs || {};
    const d = A.rec.docs[doc] = A.rec.docs[doc] || {answers: {}};
    d.answers[id] = String(v).slice(0, 4000); d.updatedAt = new Date().toISOString();
    clearTimeout(A.t); A.t = setTimeout(() => { sharedSet(mineKey(), A.rec); }, 800);
  },
  async submit(doc){
    if(!FORMS[doc] || A.sending) return;
    if(!state.traineeId || state.isAdmin || state.adminPreview){ toast("Trainees submit their own assessment for grading."); return; }
    const f = FORMS[doc], a = answers(doc), want = f.parts.reduce((t, p) => t + (p.kind === "match" ? p.terms.length : p.kind === "short" ? p.qs.length : p.groups.reduce((u, g) => u + g.qs.length, 0)), 0);
    const left = want - Object.values(a).filter(x => String(x).trim()).length;
    if(left > 0 && !confirm(`${left} of ${want} items are still blank. Submit for grading anyway?`)) return;
    A.sending = true; render();
    try{
      clearTimeout(A.t); if(await sharedSet(mineKey(), A.rec) === false) throw new Error("save");
      const r = await authFetch("/api/assess/grade", {id: state.traineeId, doc}), j = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(j.error || "send");
      A.review = (await sharedGet("trackerreview:" + state.traineeId)) || A.review;
      toast("✓ Submitted for grading. Your score is on 🏅 My Performance.");
    }catch(err){ toast(err.message && !/^(save|send)$/.test(err.message) ? err.message : "Couldn’t submit. Check your connection and try again."); }
    A.sending = false; render();
  },
  async savePdf(doc){
    if(!FORMS[doc] || A.saving) return;
    if(!state.traineeId || state.isAdmin || state.adminPreview){ toast("👁 Trainee view — a trainee saves their own assessment to their folder."); return; }
    if(!Object.values(answers(doc)).some(x => String(x).trim())){ toast("Answer the assessment first, then 📄 Save PDF to my Folder."); return; }
    A.saving = true; render();
    const pdf = await answersPdf(doc), name = fileName(doc) + ".pdf";
    if(!pdf){ A.saving = false; render(); toast("Couldn't load the PDF tools — try again."); return; }
    let j = {};
    try{ const r = await authFetch("/api/drive/save", {name, pdf: pdf.output("datauristring").split(",")[1]}); j = await r.json().catch(() => ({})); }catch(err){ j = {error: "offline"}; }
    if(j.ok) toast(`✓ Saved to your Assessment and Activities Folder: ${name}`);
    else { pdf.save(name); const f = await folderUrl(); if(f) window.open(f, "_blank", "noopener");
      toast(`${DRIVE_WHY[j.error] || "Couldn’t reach Google Drive."} Your PDF downloaded as “${name}”: upload it to your Assessment and Activities Folder${f ? " (it just opened)" : ""}.`); }
    A.saving = false; render();
  },
  // the result, for 🏅 My Performance (js/ft-drive.js ftDriveItems)
  title: doc => (FORMS[doc] || {}).title || "Assessment"
};

(function(){ const s = document.createElement("style"); s.id = "ft-assess"; s.textContent = `
.fa-form{padding:18px 20px;} .fa-part{margin:0 0 22px;} .fa-part h3{margin:0 0 6px;color:var(--navy);font-size:19px;}
.fa-lead{margin:0 0 10px;color:var(--ink);font-size:15px;line-height:1.5;} .fa-scn{margin:0 0 10px;padding:10px 12px;border-left:4px solid var(--orange);background:#FFF7ED;border-radius:8px;font-size:15px;line-height:1.5;}
.fa-match{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:14px;align-items:start;}
@media(max-width:900px){ .fa-match{grid-template-columns:minmax(0,1fr);} }
.fa-tbl{width:100%;border-collapse:collapse;font-size:14.5px;} .fa-tbl th{background:#1E2340;color:#fff;text-align:left;padding:8px 10px;font-size:13.5px;}
.fa-tbl td{border-bottom:1px solid var(--line);padding:6px 10px;vertical-align:middle;} .fa-defs td{vertical-align:top;line-height:1.45;} .fa-l{font-weight:800;color:var(--orange-deep);width:38px;white-space:nowrap;}
.fa-sel{font:inherit;font-weight:700;padding:5px 8px;border:1px solid var(--line);border-radius:8px;min-width:64px;}
.fa-qs{margin:0;padding-left:22px;} .fa-qs li{margin:0 0 14px;} .fa-qs li p{margin:0 0 6px;font-size:15px;line-height:1.45;}
.fa-in{width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;} .fa-essay{resize:vertical;}
.fa-mark{display:inline-block;margin-left:8px;font-weight:800;} .fa-mark.ok{color:var(--success);} .fa-mark.no{color:var(--danger);} .fa-mark.part{color:#B7791F;}
.fa-note{margin:4px 0 0;font-size:13.5px;color:var(--ink-soft);}
.fa-doc{margin:0 0 10px;} .fa-doc summary{cursor:pointer;font-weight:700;color:var(--navy);} .fa-docframe{height:60vh;margin-top:8px;border:2px solid #343C66;border-radius:10px;overflow:hidden;}
.fa-docframe iframe{width:100%;height:100%;border:0;}
.fa-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:14px;}
.fa-done{margin:0;color:var(--success);font-weight:700;} .fa-muted{margin:0;color:var(--ink-soft);}
.fa-form .fp-pdf{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:#F6F8FC;}
.fa-form .fp-pdf-rule{margin:0;flex:1 1 320px;font-size:14px;} .fa-form .fp-pdf-rule > span{font-weight:800;color:var(--orange-deep);}
.fa-form .fp-pdf-rule code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13.5px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:2px 8px;word-break:break-word;}
`; document.head.appendChild(s); })();
})();
