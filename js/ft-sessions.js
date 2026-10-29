/* ============================================================
   🟢 Practice Sessions: real work, in real time, for the trainee's own firm
   Loaded after js/ft-simulators.js (whose 🛠 Practice Lab page shows these cards) and js/ft-firms.js.
   Instead of simulators, each session is the real task done live: the trainee starts it (the clock runs),
   does the work in the CMS on their firm's case (js/ft-firms.js), records what they
   did on the session's form, and submits it. Each one is then:
     1. checked automatically against the case file (js/ft-cases-data.js) and the firm's rules (a % per check);
     2. evaluated by the AI in the facilitator's feedback DNA (js/ft-facilitator-dna.js);
     3. reviewed by the trainer: a score and a comment (Admin → 🟢 Practice Sessions), which is final.
   The sessions:
     ☎️ Reception Mock Calls        lesson 4: the Call Simulator's line on ☎ LSH Ring Channel + the CMS Front Desk Drill;
                                    the call note
     📅 Standard Training - Appointment Setting Mock Calls
                                    lesson 5 (id "calendaring", once the Calendaring Practice Lab): the Calendar Management
                                    mock call (Ring Channel), then the appointment on the Google Calendar Simulator, under the
                                    firm's calendar rules. Beside it, its own card: 📅 Standard Training - Calendaring
                                    Activity (js/ft-calweek.js), the standalone next-week calendar.
     📋 Intake Mock Calls           lesson 6 (Days 8–9): Ring Channel's Intake Line, the details entered in the Prototype
                                    CMS; the intake recorded here — no case handed out, the caller is the lead
     (Claims, lesson 7, is not a Practice Session: the Claims Specialist work is the 🧰 Drafting Tools'
      LOR Drafting Activity, js/ft-lor.js — the trainee drafts the 1P and 3P letters in the firm's own
      templates, with no CMS case file.)
     🩺 Medical Records: MedLOR     lesson 8 (Day 14): the MedLOR request prepared to the day's rules — file name, HIPAA,
                                    the boxes, the subject line or the fax address and signature
   (PI Process Flow, lesson 3, is not a Practice Session: Day 3 is a classroom discussion, with no case work.)
   Records:
     sessions:<id>      the trainee's own: {ack: {firm, at}, live: {sid, startedAt}, runs: {<session|case>: run}}
     labreview:<id>     the trainer's (trainee reads, admins write): {sessions: {<key>: {score, comment, at}},
                        acts: {<activity id>: {status, score, comment, at}}}
     settings:trainer-acts  the 🧑‍🏫 trainer-led activities that can't be simulated (demos, live mock calls with
                        the trainer): admins edit the list in Admin → 🧑‍🏫 Trainer Inputs and record each trainee's result.
   Admin → 🟢 Practice Sessions: 📡 Live now (sessions in progress, refreshed every 20 s while the tab is open),
   then every submission by batch and trainee, with its checks, the AI's evaluation and the trainer's review form.
   ============================================================ */
(function(){
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const norm = v => String(v == null ? "" : v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^atty\.?\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
const same = (a, b) => has(a) && has(b) && norm(a) === norm(b);
const near = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;   // a trainee session is never an admin one
const FF = () => window.FTFirms;
const PASS = 80;
// dates: "MM/DD/YYYY" (the case files) and "YYYY-MM-DD" (date inputs)
const toISO = s => { const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : String(s || "").slice(0, 10); };
const addYears = (iso, n) => { const m = String(iso).match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? `${Number(m[1]) + n}-${m[2]}-${m[3]}` : ""; };
const mins = t => { const m = String(t || "").match(/^(\d{1,2}):(\d\d)/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const fmtDate = iso => { const m = String(iso || "").match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? `${m[2]}/${m[3]}/${m[1]}` : String(iso || ""); };
const PHASES = ["Intake", "Treating", "Pending Demand", "BI Demanded", "BI Settlement Negotiations", "BI Settled", "UM or UIM Demanded", "UM or UIM Settled", "Litigation Discovery", "Mediation", "Arbitration", "Deposition", "Disbursement"];
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
/* 📞 Every mock call is taken on ☎ LSH Ring Channel, the training phone (the Call Simulator): the Main Portal opens it
   signed in — /simulators/call.html → /api/launch?tool=ringchannel&to=calls — on the session's line, with the phone's own
   keys (mute, hold, transfer), the case files in 🔎 Case lookup, and the trainer able to ring the same phone for a live
   mock call. A graded call rings at once with a caller the trainee doesn't see first, is graded on the line's Mock Calls
   Metrics, and counts here in its lesson (the Portal's /api/call-results → callsim:<id>, js/ft-simulators.js).
   It opens in its own tab (the trainee's Portal sign-in, like the Calendaring Simulators). */
const PORTAL_SIMS = "https://cm-training-activity.pages.dev/simulators/";
const calls = (line, graded) => PORTAL_SIMS + "call.html?" + new URLSearchParams(Object.assign({program:"FT", line}, graded ? {mode:"graded"} : {}));

/* ---------- the sessions: tools, the form, and the checks ---------- */
// field: [name, label, type ("text" | "date" | "time" | "number" | "textarea" | "select" | "checks" | "check"), options?]
const SESSIONS = [
  {id:"reception", icon:"☎️", title:"Reception Mock Calls", lesson:4,
    about:"Answer your firm’s front desk live on the Call Simulator — ☎ LSH Ring Channel, the training phone: the Main Line rings, you answer with your headset, verify the caller, find the file in 🔎 Case lookup and handle the call the way your firm’s rules say. Then write the call note here.",
    tools: () => [["🎯 Take a graded call", calls("Reception Mock Calls", true)], ["📞 Practice a caller", calls("Reception Mock Calls")], ["☎️ Front Desk Drill", CMS + "?program=reception&flow=reception&drill=1&from=standard"]],
    fields: f => [["greeting", "The greeting you used", "text"], ["caller", "Caller’s name", "text"], ["role", "Caller’s role", "select", ["Client", "Authorized person on the file", "Unauthorized family member or friend", "Medical provider", "Insurance adjuster", "Opposing counsel", "Media", "Other"]],
      ["callback", "Callback number", "text"], ["besttime", "Best time to call back", "text"], ["caseRef", "Case (client name or case number)", "text"], ["need", "What they need", "textarea"],
      ["urgency", "Urgency", "select", ["Routine", "Urgent: routed now"]], ["routed", "Routed to (name and ext)", "text"], ["verified", "I verified the caller before discussing the case (or didn’t discuss it)", "check"], ["initials", "Your initials", "text"]],
    check: (a, c, f) => [
      ["Opened with the firm’s greeting", near(a.greeting, f.greeting.replace(/\(your name\)/i, "")) || norm(a.greeting).includes(norm(f.name).split(" ")[0]), f.greeting],
      ["A complete message: caller, role, callback number and best time", has(a.caller) && has(a.role) && /\d{3}.*\d{4}/.test(a.callback || "") && has(a.besttime), ""],
      ["The case and what they need", has(a.caseRef) && String(a.need || "").trim().length >= 15, ""],
      ["Routed to a person on the firm’s team", has(a.routed) && [...(f.attorneys || []), ...(f.team || [])].some(p => near(a.routed, p.name) || (p.ext && String(a.routed).includes(p.ext))), (f.team || []).map(p => p.name + (p.ext ? " " + p.ext : "")).join(", ")],
      ["Caller verified first", !!a.verified, ""],
      ["Initials on the note", has(a.initials), ""]]},
  {id:"calendaring", icon:"📅", title:"Standard Training - Appointment Setting Mock Calls", lesson:5,
    about:"A caller phones in about one of the firm’s cases (the Call Simulator’s Calendar Management line, on ☎ LSH Ring Channel): get their name, verify them and find the file. Then book the appointment on the Google Calendar Simulator under your firm’s calendar rules, and record it here.",
    tools: () => [["🎯 Take the graded call", calls("Calendar Management Mock Calls", true)], ["📞 Practice a caller", calls("Calendar Management Mock Calls")], ["📅 Google Calendar Simulator", "calsim:standard"]],
    fields: f => [["caller", "Who called", "text"], ["caseRef", "Which case (client name or case number)", "text"], ["kind", "Appointment", "text"], ["attorney", "With (attorney)", "select", (f.attorneys || []).map(x => x.name)],
      ["date", "Date", "date"], ["start", "Start time (" + f.tz + ")", "time"], ["length", "Length (minutes)", "number"], ["color", "Event color", "select", FF().GCAL],
      ["meet", "Google Meet link added", "check"], ["reminder", "Email reminder 1 day before", "check"], ["desc", "Description (who, why, the case)", "textarea"]],
    check: (a, c, f) => {
      const s = mins(a.start), len = Number(a.length) || 0, rule = (f.colors || []).find(x => Number(x[0]) === len), open = mins(f.start), close = mins(f.end);
      const day = a.date ? new Date(a.date + "T12:00:00").getDay() : -1;
      return [
        ["The caller and the case", has(a.caller) && has(a.caseRef), ""],
        ["On a weekday", day >= 1 && day <= 5, ""],
        ["Inside the firm’s hours", s != null && open != null && close != null && s >= open && s + len <= close, f.hours],
        ["On the 15-minute grid", s != null && s % 15 === 0, ""],
        ["The right color for its length", rule ? rule[1] === a.color : has(a.color), (f.colors || []).map(x => `${x[0]} min ${x[1]}`).join(", ")],
        ["Google Meet and the reminder", !!a.meet && !!a.reminder, ""],
        ["A description that names the case and the purpose", String(a.desc || "").trim().length >= 20, ""]];
    }},
  // Days 8–9 (Training Guide, "Intake Mock Call Activity – Training Platform (Prototype CMS)"): the trainee asks the
  // intake questions on the call, enters what they gather straight into the Prototype CMS's fields — not a fillable
  // form — and records it here. No case is handed out: the caller is the lead. The checks are the call's own: every
  // detail an intake needs, dates that hold together, the statute of limitations under the firm's rule, a conflict
  // check and a decision.
  {id:"intake", icon:"📋", title:"Intake Mock Calls", lesson:6, program:"intake",
    about:"Take an intake call (the Call Simulator’s Intake Line, on ☎ LSH Ring Channel). Ask the intake questions, enter what you gather straight into the Prototype CMS’s fields — not the fillable intake forms — then record the intake here. Between your turns, practise intake calls on the Call Simulator.",
    tools: () => [["🎯 Take a graded call", calls("Intake Mock Calls", true)], ["📞 Practice a caller", calls("Intake Mock Calls")],
      ["🗂 The Prototype CMS (Intake)", CMS + "?" + new URLSearchParams({program:"intake", from:"standard"})],
      ["📄 Fillable intake forms (what to ask)", "https://drive.google.com/file/d/1sdpjU_vYPuuvP1U07uHuHYiBcy2uG3kF/view?usp=sharing"]],
    fields: f => [["name", "Potential client’s full name", "text"], ["phone", "Callback number", "text"], ["dob", "Date of birth", "date"], ["dol", "Date of the accident (DOL)", "date"],
      ["type", "Case type", "select", ["MVA", "Slip and Fall", "Premise Liability", "Dog Bite", "Medical Malpractice", "Others"]],
      ["injuries", "Injuries and treatment so far", "textarea"], ["carrier", "At-fault party’s carrier (3P), or “Unknown”", "text"], ["sol", "Statute of limitations date", "date"],
      ["cms", "Every detail entered in the Prototype CMS’s fields", "check"], ["conflict", "Conflict check run on every party", "check"],
      ["decision", "Decision", "select", ["Accept: send the retainer", "Refer to the Intake Attorney", "Decline and refer out"]]],
    check: (a, c, f) => {
      const today = new Date().toISOString().slice(0, 10), dob = String(a.dob || ""), dol = String(a.dol || "");
      const sol = addYears(dol, Number(f.solYears) || 2);
      return [["The client’s first and last name", String(a.name || "").trim().split(/\s+/).length >= 2, ""],
        ["A callback number (10 digits)", String(a.phone || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "").length === 10, ""],
        ["Date of birth before the accident", !!dob && !!dol && dob < dol, ""],
        ["Date of the accident, not in the future", !!dol && dol <= today, ""],
        ["Case type", has(a.type), ""],
        ["Injuries and treatment recorded", String(a.injuries || "").trim().length >= 20, ""],
        ["The at-fault party’s carrier, or “Unknown”", has(a.carrier), ""],
        [`Statute of limitations (${f.solYears || 2} years from the accident, ${f.state || "the firm’s state"})`, !!dol && a.sol === sol, dol ? fmtDate(sol) : "the accident date + " + (f.solYears || 2) + " years"],
        ["Entered in the Prototype CMS", !!a.cms, ""],
        ["Conflict check and a decision", !!a.conflict && has(a.decision), ""]]; }},
  // Day 14 (Training Guide, "Sending MedLOR and Requesting for Medical Bills & Records"): the trainee prepares the
  // MedLOR request the way the tutorial and the day's notes set it out — before the recorded demo with the trainer
  // (🧑‍🏫 Trainer Inputs: medlor-demo). No case is handed out; the checks are the day's own rules.
  {id:"records", icon:"🩺", title:"Medical Records: MedLOR and Request for Bills & Records", lesson:8,
    about:"Prepare a MedLOR request the way Day 14 sets it out: the combined MedLOR, Unsworn COR and HIPAA under the right file name, the HIPAA fields, both boxes on the MedLOR, and the e-mail subject line or the fax address and signature. Use the provider your trainer gave you for the demo (the client is John Test Doe).",
    tools: () => [["🎬 Tutorial: Sending MedLOR and requesting bills & records", "https://drive.google.com/file/d/16Oy2X1S9nokz5tqMm_P6nByqYaakvGDU/view?usp=drive_link"]],
    fields: f => [["provider", "Lien holder (medical provider), e.g. JML(Lyons Physical Therapy)", "text"], ["npim", "NPIM doctor (only when the provider is NPIM)", "text"],
      ["file", "File name of the combined MedLOR, Unsworn COR and HIPAA", "text"],
      ["hipaaDate", "HIPAA: Validity of Authorization (the date the client signed)", "date"], ["relation", "HIPAA: Relationship to Patient", "select", ["Self", "Spouse", "Parent", "Guardian", "Other"]],
      ["boxes", "MedLOR: boxes ticked", "checks", ["Medical bills", "Medical records"]],
      ["method", "Sent by", "select", ["E-mail / E-filing", "Fax"]],
      ["subject", "E-mail subject line (e-mail only)", "text"], ["fax", "Fax number as entered in the recipient field (fax only)", "text"],
      ["sig", "Below the closing (fax only)", "checks", ["Full name", "General Virtual Assistant", "Work email address", "Phone number"]]],
    check: a => {
      const prov = String(a.provider || "").trim(), file = String(a.file || "").trim(), npim = /\bNPIM\b|Nevada Personal Injury Management/i.test(prov + " " + file);
      const doc = String(a.npim || "").replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).pop() || "";
      const out = [["The file name follows the convention", /^MED - .+\(.+\) - MedLOR with Unsworn COR and HIPAA \d{2}\.\d{2}\.\d{2} \([^()]+\)$/.test(file), "MED - Lien Holder(Medical Provider) - MedLOR with Unsworn COR and HIPAA mm.dd.yy (your first name)"],
        ["The file name names the provider", !!prov && near(file, prov) || (!!prov && norm(file).includes(norm(prov))), prov || "the provider"],
        ["NPIM: the doctor’s name with the provider", !npim || (!!doc && new RegExp("Dr\\.?\\s*[^)]*" + doc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(file)), "e.g. MED - JML(Fabito Anesthesia Pain Center Dr. Fabito) - …"],
        ["HIPAA: the date the client signed", has(a.hipaaDate), ""],
        ["HIPAA: Relationship to Patient is Self", a.relation === "Self", "Self"],
        ["MedLOR: both bills and records ticked", ["Medical bills", "Medical records"].every(x => (a.boxes || []).includes(x)), "Medical bills, Medical records"],
        ["How it was sent", has(a.method), ""]];
      if(a.method === "Fax"){
        out.push(["The fax address: +1, no dashes, @metrofax.com", /^\+1\d{10}@metrofax\.com$/i.test(String(a.fax || "").trim()), "+17029982171@metrofax.com"]);
        out.push(["Name, General Virtual Assistant, work email and phone below the closing", ["Full name", "General Virtual Assistant", "Work email address", "Phone number"].every(x => (a.sig || []).includes(x)), ""]);
      }else{
        const subj = String(a.subject || "").trim();
        out.push(["The subject line: client – provider – Request for Medical Bills and Records", /^.+ - .+ - Request for Medical Bills and Records$/i.test(subj) && (!prov || norm(subj).includes(norm(prov))), `John Test Doe - ${prov || "Provider"} - Request for Medical Bills and Records`]);
      }
      return out; }}
];
const sessionById = id => SESSIONS.find(s => s.id === id) || null;

/* ---------- the trainee's record ---------- */
const S = {id:null, data:null, loading:null, saving:null, review:null, rvAt:0, cur:null, tick:null, busy:false};
function load(force){
  if(!isTrainee() || S.loading) return S.loading;
  if(!force && S.id === state.traineeId) return null;
  const id = state.traineeId;
  S.loading = sharedGetMany(["sessions:" + id, "labreview:" + id, "settings:trainer-acts"]).then(v => {
    S.id = id; S.data = v[0] && typeof v[0] === "object" ? v[0] : {v:1, runs:{}}; if(!S.data.runs) S.data.runs = {};
    S.review = v[1] && typeof v[1] === "object" ? v[1] : {}; S.rvAt = Date.now(); T.acts = (v[2] && v[2].acts) || null;
  }).catch(() => {}).then(() => { S.loading = null; if(["simulators", "session", "firm"].includes(state.view)) render(); });
  return S.loading;
}
window.addEventListener("focus", () => { if(isTrainee() && S.id && Date.now() - S.rvAt > 120000 && ["simulators", "session"].includes(state.view)) load(true); });
async function save(){ if(!S.data) return false; S.data.updatedAt = new Date().toISOString(); return sharedSet("sessions:" + S.id, S.data); }
const keyOf = (s, c) => s.id + "|" + (c ? c.id : "-");
const caseFor = s => s.area ? (FF().myCases(s.area)[0] || null) : null;
// An admin has no firm of their own, so the preview borrows the first firm's first case. The session
// page and its tool buttons have to agree on which case that is: a tool's link is built from it
// (🗂 MC-01 in the CMS), and a tool is opened by its position in the same list.
const previewFirm = () => FF().firms()[0] || null;
const previewCase = s => { const f = previewFirm(); return s.area && f ? (FF().caseById((f.cases || [])[0]) || null) : null; };
const sessionCase = s => isTrainee() ? caseFor(s) : previewCase(s);
const runOf = (s, c) => (S.data && S.data.runs[keyOf(s, c)]) || null;
const reviewOf = key => ((S.review || {}).sessions || {})[key] || null;
const tScore = r => r && r.score != null && r.score !== "" && isFinite(Number(r.score)) ? Math.round(Number(r.score)) : null;
function scoreOf(run, rv){ const t = tScore(rv); return t != null ? t : run && run.auto ? run.auto.pct : null; }

window.FTSessions = {
  ack: () => S.data && S.data.ack,
  async acknowledge(firm){ await load(); if(!S.data) return; S.data.ack = {firm, at:new Date().toISOString()}; if(await save() === false) toast("Couldn’t save. Check your connection."); else toast("✓ Thanks. Your sessions are checked against these rules."); render(); },
  open(id){ S.cur = id; goto("session"); },
  start(id){
    const s = sessionById(id), c = caseFor(s); if(!s || !S.data) return;
    const k = keyOf(s, c), run = S.data.runs[k] = S.data.runs[k] || {answers:{}, attempts:0};
    run.startedAt = new Date().toISOString(); delete run.submittedAt; delete run.auto; delete run.ai;
    S.data.live = {sid:id, key:k, startedAt:run.startedAt};
    save(); render();
  },
  tool(i){
    const s = sessionById(S.cur); if(!s) return;
    const c = sessionCase(s), t = (s.tools(c) || [])[i]; if(!t) return;
    if(t[1] === "calsim:standard"){ if(window.ftsCalsim) ftsCalsim("standard"); return; }
    // a Drive video or document opens in the platform's viewer (js/ft-updates.js), like every resource link
    if(/^https:\/\/(drive|docs)\.google\.com\//.test(t[1]) && typeof window.lvOpen === "function"){ lvOpen({kind: /video|tutorial/i.test(t[0]) ? "video" : "doc", title: t[0].replace(/^\S+\s/, ""), url: t[1]}); return; }
    if(window.ftsShowTool) ftsShowTool(t[1], `${t[0].replace(/^\S+\s/, "")} · ${s.title}`); else window.open(t[1], "_blank");
  },
  set(name, v){ const s = sessionById(S.cur), run = runOf(s, caseFor(s)); if(!run) return; run.answers[name] = v; clearTimeout(S.saving); S.saving = setTimeout(save, 1200); },
  toggle(name, opt, on){ const s = sessionById(S.cur), run = runOf(s, caseFor(s)); if(!run) return; const l = new Set(run.answers[name] || []); on ? l.add(opt) : l.delete(opt); run.answers[name] = [...l]; clearTimeout(S.saving); S.saving = setTimeout(save, 1200); },
  async submit(){
    if(S.busy) return;
    const s = sessionById(S.cur), c = caseFor(s), f = FF().myFirm(), run = runOf(s, c);
    if(!run || !run.startedAt){ toast("Start the session first."); return; }
    S.busy = true; const btn = document.getElementById("fssSubmit"); if(btn){ btn.disabled = true; btn.textContent = "Checking your work…"; }
    const checks = (s.check(run.answers, c, f) || []).map(([label, ok, want]) => ({label, ok:!!ok, want:want || ""}));
    const pct = checks.length ? Math.round(checks.filter(x => x.ok).length / checks.length * 100) : 0;
    run.submittedAt = new Date().toISOString();
    run.minutes = Math.max(1, Math.round((new Date(run.submittedAt) - new Date(run.startedAt)) / 60000));
    run.auto = {pct, checks}; run.attempts = (run.attempts || 0) + 1;
    run.history = (run.history || []).concat([{pct, at:run.submittedAt, minutes:run.minutes}]).slice(-10);
    if(S.data.live && S.data.live.key === keyOf(s, c)) delete S.data.live;
    run.ai = {pending:true};
    await save(); render();
    // the facilitator's evaluation (the AI, in her feedback DNA); the checks above stand on their own if it's unavailable
    try{
      const prompt = `You are the training facilitator of Legal Support Help evaluating a trainee Legal VA's live Practice Session: "${s.title}" for the law firm ${f.name} (${f.location})${c ? `, on case ${c.id} (${c.client.name}, ${c.type}, ${c.phase})` : ""}. They took ${run.minutes} minutes.
What they recorded:
${Object.entries(run.answers).map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n")}
The automated checks against the case file and the firm's rules (${pct}%):
${checks.map(x => `- ${x.ok ? "PASS" : "MISS"}: ${x.label}${!x.ok && x.want ? ` (expected: ${x.want})` : ""}`).join("\n")}
The firm's rules for this work:
${((f.rules || {})[{reception:"reception", calendaring:"calendar", intake:"intake", records:"records"}[s.id]] || []).map(x => "- " + x).join("\n")}

Write the evaluation the way the facilitator writes it (her feedback DNA, below): a verdict label, then "Demonstrated … understanding of …" naming exactly what was done correctly, then "However, improvement is needed in …" naming each missed item with the correct value, then the habit or rule that prevents it, tying it to the firm's rules. 3-5 sentences, third person, using the trainee's work only.

FACILITATOR'S FEEDBACK DNA:
${String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

Return ONLY JSON: {"summary":"..."}`;
      const out = await callAIJson(prompt, 900, undefined, "grading");
      run.ai = {summary:String((out && out.summary) || "").slice(0, 2000), at:new Date().toISOString()};
    }catch(err){ run.ai = {error:"The AI evaluation isn’t available right now. Your checks and your trainer’s review still count."}; }
    S.busy = false; await save(); render(); window.scrollTo(0, 0);
    toast(pct >= PASS ? `✓ ${pct}% on the checks. Submitted to your trainer.` : `${pct}% on the checks: see what was missed. Submitted to your trainer.`);
  },
  again(){ const s = sessionById(S.cur); this.start(s.id); },
  // a session's tool links (its graded and practice calls, its case in the CMS), for the checks in .github/scripts
  links(id){ const s = sessionById(id); return s ? (s.tools(s.area ? caseFor(s) : null) || []).map(t => t[1]) : []; },
  // Can a trainee open this session right now? The Practice Lab card's own gate, in one place, so a
  // screen that links straight to a session (js/ft-next-step.js) cannot get round the lesson lock or
  // offer a session that works on a case when the firm has none in its caseload.
  openable(id){
    const s = sessionById(id); if(!s) return false;
    if(state.isAdmin || state.adminPreview) return true;
    if(typeof window.dayUnlocked === "function" && !window.dayUnlocked(s.lesson)) return false;
    if(!dayLocksOpen(s)) return false;
    if(!FF().myFirm()) return false;
    return !(s.area && !caseFor(s));
  }
};
// 🔓 a session waits for one of its days to be opened by the trainer, too (Admin → 📅 Open Lessons → Activity Locks, js/ft-day-locks.js)
const dayLocksOpen = s => !window.FTDayLocks || FTDayLocks.labOpen(window.FTDays ? FTDays.forSession(s.id) : []);
// the Practice Lab page's cards (js/ft-simulators.js)
FTSessions.cards = function(){
  if(isTrainee()) load();
  const f = isTrainee() ? FF().myFirm() : null;
  // a trainee sees a session from the day its lesson opens (js/ft-simulators.js: the Practice Lab goes by the day)
  const shown = s => !isTrainee() || state.adminPreview || (window.dayUnlocked(s.lesson) && dayLocksOpen(s));
  return SESSIONS.filter(shown).map(s => {
    const c = isTrainee() ? caseFor(s) : null, run = isTrainee() ? runOf(s, c) : null, rv = run ? reviewOf(keyOf(s, c)) : null, sc = scoreOf(run, rv);
    const open = state.isAdmin || state.adminPreview || window.dayUnlocked(s.lesson);
    const status = !run ? "" : run.submittedAt ? `<span class="fss-pill ${sc >= PASS ? "ok" : "mid"}">${tScore(rv) != null ? "🧑‍🏫 " : ""}${sc}%</span>` : run.startedAt ? `<span class="fss-pill live">🟢 In progress</span>` : "";
    const lessonT = (DAYS.find(d => d.id === s.lesson) || {}).title || "";
    const dayT = window.FTDays ? FTDays.label(FTDays.forSession(s.id)) : "";
    return `<div class="card fts-card fss-card ${open ? "" : "fts-locked"}"><div class="fts-kicker">${dayT ? e(dayT) + " · " : ""}${e(lessonT)}${open ? "" : " · opens with this lesson"}</div>
      <h3>${s.icon} ${e(s.title)} ${status}</h3><p class="fts-note">${e(s.about)}</p>
      ${window.ftsGradedLine ? ftsGradedLine(s.lesson) : ""}
      ${s.area && isTrainee() ? `<p class="fss-case">${c ? `🗂 Your case: <b>${e(c.id)}</b> · ${e(c.client.name)}` : "🗂 This session works on a case, and your firm has none in its caseload yet — ask in the training GC."}</p>` : ""}
      <div class="fts-tool-act">${!open ? `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`
        : isTrainee() && !f ? `<button class="btn btn-ghost btn-sm" disabled>Waiting for your firm</button>`
        : isTrainee() && s.area && !c ? `<button class="btn btn-ghost btn-sm" disabled title="Your firm has no case for this session yet">No case yet</button>`
        : `<button class="btn btn-navy btn-sm" onclick="FTSessions.open('${s.id}')">${run && run.submittedAt ? "Review / redo" : run && run.startedAt ? "▶ Continue" : "▶ Start the session"}</button>`}</div></div>`;
  }).join("");
};

/* ---------- one session (#/session) ---------- */
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["session"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {session:"Practice Session"});
function field([name, label, type, opts], a, ro){
  const v = a[name], dis = ro ? "disabled" : "";
  const on = `onchange="FTSessions.set('${name}', this.type==='checkbox' ? this.checked : this.value)"`;
  if(type === "check") return `<label class="fss-check"><input type="checkbox" ${v ? "checked" : ""} ${dis} ${on}> ${e(label)}</label>`;
  if(type === "checks") return `<fieldset class="fss-f fss-wide"><legend>${e(label)}</legend>${opts.map(o => `<label class="fss-check"><input type="checkbox" ${(v || []).includes(o) ? "checked" : ""} ${dis} onchange="FTSessions.toggle('${name}', ${e(JSON.stringify(o))}, this.checked)"> ${e(o)}</label>`).join("")}</fieldset>`;
  if(type === "select") return `<label class="fss-f">${e(label)}<select ${dis} ${on}><option value="">—</option>${opts.map(o => `<option ${o === v ? "selected" : ""}>${e(o)}</option>`).join("")}</select></label>`;
  if(type === "textarea") return `<label class="fss-f fss-wide">${e(label)}<textarea rows="3" ${dis} oninput="FTSessions.set('${name}', this.value)">${e(v || "")}</textarea></label>`;
  return `<label class="fss-f">${e(label)}<input type="${type}" value="${e(v || "")}" ${dis} oninput="FTSessions.set('${name}', this.value)"></label>`;
}
function checksHtml(run){
  const a = run.auto; if(!a) return "";
  return `<div class="fss-checks"><div class="fss-checks-h"><b>Automated checks</b><span class="fss-pill ${a.pct >= PASS ? "ok" : "mid"}">${a.pct}%</span><span class="fss-muted">${PASS}% passes · ${run.minutes} min · attempt ${run.attempts}</span></div>
    <ul>${a.checks.map(x => `<li class="${x.ok ? "ok" : "miss"}">${x.ok ? "✓" : "✗"} ${e(x.label)}${!x.ok && x.want ? `<span>Expected: ${e(x.want)}</span>` : ""}</li>`).join("")}</ul></div>`;
}
function aiHtml(run){
  const ai = run.ai; if(!ai) return "";
  if(ai.pending) return `<div class="fss-ai"><b>🤖 Facilitator-style evaluation</b><p class="fss-muted">Writing your evaluation…</p></div>`;
  return `<div class="fss-ai"><b>🤖 Facilitator-style evaluation</b><p>${ai.summary ? e(ai.summary) : `<span class="fss-muted">${e(ai.error || "")}</span>`}</p></div>`;
}
function reviewHtml(rv){
  if(!rv || (!has(rv.comment) && tScore(rv) == null)) return `<div class="fss-rv fss-muted">🧑‍🏫 Your trainer reviews this session and adds their score and comments.</div>`;
  return `<div class="fss-rv"><b>🧑‍🏫 Your trainer’s review</b>${tScore(rv) != null ? `<span class="fss-pill ${tScore(rv) >= PASS ? "ok" : "mid"}">${tScore(rv)}% · final</span>` : ""}${has(rv.comment) ? `<p>${e(rv.comment)}</p>` : ""}</div>`;
}
function renderSession(){
  const back = `<a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>`;
  const s = sessionById(S.cur);
  if(!s){ return `${back}<div class="card fss-card" style="padding:24px;">Pick a session in the Practice Lab.</div>`; }
  const preview = !isTrainee();
  if(!preview){ load(); if(!S.data) return `${back}<div class="card" style="padding:24px;">Loading your session…</div>`; }
  const f = preview ? previewFirm() : FF().myFirm(), c = sessionCase(s);
  // Nobody assigns a firm any more (js/ft-firms.js): there is one only when no profile exists at all.
  if(!f) return `${back}<div class="card" style="padding:24px;">No firm profile is set up yet, so this session has no rules to check your work against.</div>`;
  const run = preview ? null : runOf(s, c), rv = run ? reviewOf(keyOf(s, c)) : null;
  const started = run && run.startedAt && !run.submittedAt, done = run && run.submittedAt;
  const ruleKey = {reception:"reception", calendaring:"calendar", intake:"intake", records:"records"}[s.id];
  return `${back}
    <div class="fss-hero"><p class="lp-eyebrow">🟢 Practice Session · ${e(f.name)}</p><h1>${s.icon} ${e(s.title)}</h1><p>${e(s.about)}</p>
      ${c ? `<p class="fss-case">🗂 Case <b>${e(c.id)}</b> · ${e(c.client.name)} · ${e(c.type)}</p>` : ""}
      ${started ? `<div class="fss-timer">🟢 Live · <b id="fssClock">0:00</b> since you started</div>` : ""}</div>
    <div class="fss-layout">
      <div class="card fss-side"><h3>🧰 Do the work</h3>
        ${(s.tools(c) || []).map((t, i) => `<button class="btn ${i ? "btn-ghost" : "btn-navy"} btn-sm" ${started || preview ? "" : "disabled"} onclick="FTSessions.tool(${i})">${e(t[0])}</button>`).join("")}
        ${!started && !preview ? `<p class="fss-muted">Start the session to open the tools: the clock runs from the start.</p>` : ""}
        <h3>📏 ${e(f.name)}’s rules</h3><ol class="fss-rules">${((f.rules || {})[ruleKey] || []).map(x => `<li>${e(x)}</li>`).join("")}</ol>
        <a class="fss-link" onclick="goto('firm')">🏛 The whole firm profile →</a></div>
      <div class="card fss-main">
        ${preview ? `<p class="fss-muted">Admin preview: trainees fill this in on their own firm and case. ${e(f.name)}${c ? ", " + e(c.id) : ""} shown.</p>` : ""}
        ${!run || (!run.startedAt && !done) ? (preview ? "" : `<div class="fss-start"><p>When you’re ready, start the session: the clock starts, the tools open, and you record your work below as you go.</p><button class="btn btn-navy" onclick="FTSessions.start('${s.id}')">▶ Start the session</button></div>`) : ""}
        ${done ? `${reviewHtml(rv)}${checksHtml(run)}${aiHtml(run)}` : ""}
        ${run || preview ? `<h3>${done ? "What you submitted" : "📝 Record your work"}</h3><div class="fss-form">${s.fields(f).map(x => field(x, (run && run.answers) || {}, !started)).join("")}</div>` : ""}
        <div class="fp-actions">${started ? `<button class="btn btn-navy" id="fssSubmit" onclick="FTSessions.submit()">📤 Submit for review</button>` : done ? `<button class="btn btn-ghost" onclick="FTSessions.again()">🔁 Do it again</button>` : ""}</div>
      </div></div>`;
}
function clock(){
  const el = document.getElementById("fssClock"); if(!el){ clearInterval(S.tick); S.tick = null; return; }
  const s = sessionById(S.cur), run = s && runOf(s, caseFor(s)); if(!run || !run.startedAt) return;
  const t = Math.max(0, Math.floor((Date.now() - new Date(run.startedAt)) / 1000));
  el.textContent = `${Math.floor(t / 3600) ? Math.floor(t / 3600) + ":" + String(Math.floor(t / 60) % 60).padStart(2, "0") : Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
const __render = window.render;
window.render = function(){
  if(state.view !== "session") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  if(!S.cur && S.data && S.data.live) S.cur = S.data.live.sid;
  if(!S.cur){ state.view = "simulators"; return window.render(); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-fss">${renderSession()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
  clock(); if(!S.tick) S.tick = setInterval(clock, 1000);
};

/* ---------- 🧑‍🏫 trainer-led activities (can't be simulated): the trainer records the result ---------- */
const DEFAULT_ACTS = [
  {id:"reception-live", title:"Reception Mock Call with the trainer", lesson:4, kind:"Mock call"},
  {id:"calendar-live", title:"Calendar Management Mock Call with the trainer", lesson:5, kind:"Mock call"},
  {id:"intake-live", title:"Intake Mock Call with the trainer", lesson:6, kind:"Mock call"},
  {id:"intake-packet-demo", title:"Saving Intake Packet and Extracted Intake Documents Demo", lesson:6, kind:"Demo"},
  {id:"transcription-1", title:"Minutes Transcription: Recording 1 (🎧 Transcription Activity)", lesson:6, kind:"Transcription"},
  {id:"transcription-2", title:"Minutes Transcription: Recording 2 (🎧 Transcription Activity)", lesson:6, kind:"Transcription"},
  {id:"lor-demo", title:"LOR Uploading and Sending Demo (1P & 3P)", lesson:7, kind:"Demo"},
  {id:"medlor-demo", title:"Sending MedLOR and Requesting Medical Bills & Records Demo", lesson:8, kind:"Demo"},
  {id:"lv-demo", title:"LV (Lien Verification) Request Demo", lesson:8, kind:"Demo"},
  {id:"settlement-demo", title:"Reduction / Closing & Settlement Demo", lesson:9, kind:"Demo"}
];
const T = {acts:null};
const acts = () => T.acts || DEFAULT_ACTS;
const STATUSES = ["Not yet", "Passed", "Redo"];
// What this module's live work is: its Practice Session and anything done with the trainer.
// Used by 📚 Dashboard to show each module's activities next to it (js/ft-program.js).
FTSessions.forLesson = function(lesson){
  const l = Number(lesson);
  return SESSIONS.filter(x => x.lesson === l).map(x => ({kind:"session", id:x.id, icon:x.icon, title:x.title}))
    .concat(acts().filter(x => Number(x.lesson) === l).map(x => ({kind:"trainer", id:x.id, icon:"🧑‍🏫", title:x.title})));
};
// What a classroom day's platform activities are (js/ft-day-activities.js maps the 16 days).
// forLesson is by lesson deck; this is by the Training Guide's day.
FTSessions.forDay = function(day){
  const items = window.FTDays ? FTDays.items(day) : [];
  return items.filter(x => x.at === "session" || x.at === "trainer").map(x => {
    const s = x.at === "session" ? sessionById(x.id) : null, a = x.at === "trainer" ? acts().find(y => y.id === x.id) : null;
    return {kind:x.at, id:x.id, icon:s ? s.icon : "🧑‍🏫", title:(s && s.title) || (a && a.title) || x.t, as:x.t, why:x.kind};
  });
};
FTSessions.trainerCards = function(){
  if(isTrainee()) load();
  const mine = ((S.review || {}).acts) || {};
  // a trainee sees an activity from its lesson's opening, or (no lesson) from the first day that has it
  const shown = a => !isTrainee() || state.adminPreview || ((a.lesson ? window.dayUnlocked(a.lesson) : (window.ftsReached ? ftsReached(window.FTDays ? FTDays.forAct(a.id) : []) : true))
    && (!window.FTDayLocks || FTDayLocks.labOpen(window.FTDays ? FTDays.forAct(a.id) : [])));
  return acts().filter(a => DAYS.find(d => d.id === a.lesson) || !a.lesson).filter(shown).map(a => { const r = mine[a.id] || {}, sc = tScore(r);
    const dayT = window.FTDays ? FTDays.label(FTDays.forAct(a.id)) : "";
    return `<div class="card fts-card"><div class="fts-kicker">${dayT ? e(dayT) + " · " : ""}${e(a.kind || "With your trainer")}${a.lesson ? " · " + e((DAYS.find(d => d.id === a.lesson) || {}).title || "") : ""}</div>
      <h3>${e(a.title)} ${r.status ? `<span class="fss-pill ${r.status === "Passed" ? "ok" : r.status === "Redo" ? "mid" : ""}">${e(r.status)}${sc != null ? " · " + sc + "%" : ""}</span>` : ""}</h3>
      <p class="fts-note${isTrainee() && has(r.comment) ? "" : " fts-note-std"}">${isTrainee() ? (has(r.comment) ? `🧑‍🏫 ${e(r.comment)}` : "You do this live with your trainer, who records your result here.") : "Trainers record each trainee’s result in Admin → 🧑‍🏫 Trainer Inputs."}</p>
      ${(() => { const rb = RUB().forAct(a); if(!rb) return "";
        const got = isTrainee() && r.rubric && r.rubric.key === rb.key ? r.rubric : null;
        return `<details class="ti-rub-card"><summary>📋 Scorecard${got && got.avg != null ? ` · weighted average <b>${avgTxt(got.avg)}</b>` : ` · ${rb.criteria.length} criteria`}</summary>
          ${rb.time ? `<p class="ti-rub-time">⏱ ${e(rb.time)}</p>` : ""}<ul>${rb.criteria.map((k, i) => `<li><span>${e(k.n)}</span>${got && got.scores[i] != null ? `<b>${e(got.scores[i])}/5</b>` : ""}${got && got.feedback && got.feedback[i] ? `<em>${e(got.feedback[i])}</em>` : ""}</li>`).join("")}</ul></details>`; })()}</div>`; }).join("");
};

/* ---------- Admin → 🟢 Practice Sessions ---------- */
const AD = {rows:null, loading:false, batch:"", open:{}, live:true, timer:null, at:0};
async function loadAdmin(quiet){
  AD.loading = true;
  try{
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const keys = people.flatMap(r => ["sessions:" + r.id, "labreview:" + r.id]), vals = [];
    for(let i = 0; i < keys.length; i += 99) vals.push(...await sharedGetMany(keys.slice(i, i + 99)));
    AD.rows = people.map((r, i) => ({id:r.id, name:r.name || r.id, batch:r.batch || "", s:vals[i * 2] || {runs:{}}, rv:vals[i * 2 + 1] || {}}))
      .sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    if(!AD.batch){ const bs = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(); AD.batch = bs[bs.length - 1] || ""; }
    AD.at = Date.now();
  }catch(err){ if(!AD.rows) AD.rows = []; }
  AD.loading = false;
  if(state.view === "admin" && ["sessions", "trainerinputs"].includes(state.adminTab) && !(quiet && document.activeElement && /TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName))) render();
}
function liveRows(){
  return (AD.rows || []).filter(r => r.s && r.s.live && Date.now() - new Date(r.s.live.startedAt) < 4 * 3600000);
}
function sessionRow(r, key, run){
  const [sid, mc] = key.split("|"), s = sessionById(sid), rv = ((r.rv || {}).sessions || {})[key] || {}, k = r.id + "§" + key, open = !!AD.open[k];
  const firm = FF().firms()[0] || null;          // everyone works for the same firm now
  return `<div class="fss-arow"><div class="fss-arow-h" onclick="FTSessionsAdmin.open('${e(k)}')">${open ? "▾" : "▸"} ${s ? s.icon + " " + e(s.title) : e(sid)} ${mc !== "-" ? `<span class="ff-mc">${e(mc)}</span>` : ""}
      ${run.submittedAt ? `<span class="fss-pill ${run.auto && run.auto.pct >= PASS ? "ok" : "mid"}">auto ${run.auto ? run.auto.pct : "—"}%</span>` : `<span class="fss-pill live">🟢 in progress</span>`}
      ${tScore(rv) != null ? `<span class="fss-pill ok">🧑‍🏫 ${tScore(rv)}%</span>` : run.submittedAt ? `<span class="fss-pill">to review</span>` : ""}
      <span class="fss-muted">${run.submittedAt ? `${e(new Date(run.submittedAt).toLocaleString())} · ${run.minutes} min · attempt ${run.attempts}` : `started ${e(new Date(run.startedAt).toLocaleTimeString())}`}</span></div>
    ${open ? `<div class="fss-abody">${firm ? `<p class="fss-muted">Firm: ${e(firm.name)}</p>` : ""}
      ${s ? `<div class="fss-form">${s.fields(firm || {}).map(x => field(x, run.answers || {}, true)).join("")}</div>` : ""}
      ${checksHtml(run)}${aiHtml(run)}
      ${run.submittedAt ? `<div class="fss-rvform"><label>Score <input type="number" min="0" max="100" data-score value="${tScore(rv) != null ? tScore(rv) : ""}" placeholder="${run.auto ? run.auto.pct : ""}"> %</label>
        <label class="fss-wide">Your comment<textarea rows="3" data-comment placeholder="Your review: the trainee sees it with the session">${e(rv.comment || "")}</textarea></label>
        <button class="btn btn-navy btn-sm" onclick="FTSessionsAdmin.save('${e(r.id)}', '${e(key)}', this)">Save my review</button>
        <span class="fss-muted">Your score is final (empty keeps the automated %).</span></div>` : ""}</div>` : ""}</div>`;
}
function renderAdminSessions(){
  if(!AD.rows){ if(!AD.loading) loadAdmin(); return `<div class="card" style="padding:24px;">Loading the Practice Sessions…</div>`; }
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort();
  const rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch), live = liveRows();
  return `<div class="card fss-admin"><div class="ff-bar"><div><h3>📡 Live now</h3><p class="fss-muted">Trainees with a Practice Session in progress. ${AD.live ? "Updates every 20 seconds while this tab is open." : ""}</p></div>
      <span><label class="fss-check"><input type="checkbox" ${AD.live ? "checked" : ""} onchange="FTSessionsAdmin.live(this.checked)"> update on its own</label><button class="btn btn-ghost btn-sm" onclick="FTSessionsAdmin.refresh()">↻</button></span></div>
      ${live.length ? `<div class="fss-live">${live.map(r => { const s = sessionById(r.s.live.sid); return `<div class="fss-liverow">🟢 <b>${e(r.name)}</b> <span>${s ? s.icon + " " + e(s.title) : ""}</span><span class="fss-muted">${e(r.batch)} · started ${e(new Date(r.s.live.startedAt).toLocaleTimeString())} · ${Math.round((Date.now() - new Date(r.s.live.startedAt)) / 60000)} min</span></div>`; }).join("")}</div>` : `<p class="fss-muted">No session in progress.</p>`}</div>
    <div class="card fss-admin"><div class="ff-bar"><div><h3>🟢 Practice Sessions</h3><p class="fss-muted">Every session a trainee submitted: what they recorded, the automated checks against their case and firm, the AI’s evaluation in the facilitator’s voice, and your review.</p></div>
      <span><select onchange="FTSessionsAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></span></div>
      ${rows.length ? rows.map(r => { const runs = Object.entries((r.s && r.s.runs) || {}).filter(([k, v]) => v && v.startedAt).sort((a, b) => String(b[1].submittedAt || b[1].startedAt).localeCompare(String(a[1].submittedAt || a[1].startedAt)));
        const toReview = runs.filter(([k, v]) => v.submittedAt && tScore(((r.rv || {}).sessions || {})[k]) == null).length;
        return `<div class="fss-trainee"><b>${e(r.name)}</b> <span class="fss-muted">${e(r.batch)} · ${runs.length} session${runs.length === 1 ? "" : "s"}${toReview ? ` · <b>${toReview} to review</b>` : ""}${FF().firms()[0] ? " · " + e(FF().firms()[0].name) : ""}</span>
          ${runs.map(([k, v]) => sessionRow(r, k, v)).join("")}</div>`; }).join("") : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}</div>`;
}
async function writeReview(id, mut){
  const cur = (await sharedGet("labreview:" + id)) || {}; mut(cur);
  if(await sharedSet("labreview:" + id, cur) === false) throw new Error("save");
  const row = (AD.rows || []).find(r => r.id === id); if(row) row.rv = cur;
  return cur;
}
window.FTSessionsAdmin = {
  batch(b){ AD.batch = b; render(); },
  open(k){ AD.open[k] = !AD.open[k]; render(); },
  refresh(){ loadAdmin(); },
  live(on){ AD.live = on; render(); },
  async save(id, key, btn){
    const box = btn.closest(".fss-rvform"), sv = String(box.querySelector("[data-score]").value || "").trim();
    if(sv !== "" && !(Number(sv) >= 0 && Number(sv) <= 100)){ toast("The score is a number from 0 to 100."); return; }
    btn.disabled = true;
    try{ await writeReview(id, cur => { cur.sessions = cur.sessions || {}; cur.sessions[key] = {score:sv === "" ? null : Math.round(Number(sv)), comment:String(box.querySelector("[data-comment]").value || "").trim().slice(0, 4000), at:new Date().toISOString()}; });
      toast("✓ Review saved. The trainee sees it with the session."); }
    catch(err){ toast("Couldn’t save the review. Check your connection."); }
    btn.disabled = false; render();
  }
};
setInterval(() => {
  if(AD.live && state.view === "admin" && state.adminTab === "sessions" && !document.hidden && !AD.loading && Date.now() - AD.at > 19000) loadAdmin(true);
}, 5000);
ftAdminTab("sessions", "🟢 Practice Sessions", renderAdminSessions);

/* ---------- Admin → 🧑‍🏫 Trainer Inputs: the activities, and each trainee's result ---------- */
// the Training Guide's scorecard for a mock call or demo (js/ft-rubrics.js): each criterion 0–5 (and a feedback note on
// the mock calls), its weighted average out of 5, and that average as the activity's score in %
const RUB = () => window.FT_RUBRICS || {list:{}, keys:() => [], forAct:() => null, average:() => null};
const avgTxt = v => v == null ? "—" : (Math.round(v * 100) / 100).toFixed(2) + "/5";
function rubricForm(a, c){
  const rb = RUB().forAct(a); if(!rb) return "";
  const got = (c.rubric && c.rubric.key === rb.key) ? c.rubric : {scores:[], feedback:[]}, avg = RUB().average(rb, got.scores);
  return `<div class="fss-wide ti-rub" data-rubric="${e(rb.key)}"><div class="ti-rub-h"><b>📋 ${e(rb.title)} — scorecard</b><span class="fss-muted">Each criterion 0–5 (half points allowed). The weighted average becomes the score.</span></div>
    ${rb.time ? `<p class="ti-rub-time">⏱ ${e(rb.time)}</p>` : ""}
    <table class="ti-rub-tbl"><thead><tr><th>${e(rb.title.toUpperCase())}</th><th>Score</th>${rb.feedback ? "<th>Feedback</th>" : ""}</tr></thead><tbody>
      ${rb.criteria.map((k, i) => `<tr><td>${e(k.n)}</td><td><input type="number" min="0" max="5" step="0.5" data-crit="${i}" value="${e((got.scores || [])[i] == null ? "" : got.scores[i])}" oninput="FTInputs.calc(this)"></td>
        ${rb.feedback ? `<td><input data-fb="${i}" value="${e((got.feedback || [])[i] || "")}" placeholder="feedback"></td>` : ""}</tr>`).join("")}
      <tr class="ti-rub-avg"><td>WEIGHTED AVERAGE</td><td data-avg>${avgTxt(avg)}</td>${rb.feedback ? "<td></td>" : ""}</tr></tbody></table></div>`;
}
function rubricRead(box){
  const el = box.querySelector("[data-rubric]"); if(!el) return null;
  const rb = RUB().list[el.getAttribute("data-rubric")]; if(!rb) return null;
  const scores = rb.criteria.map((k, i) => { const v = String((el.querySelector(`[data-crit="${i}"]`) || {}).value || "").trim(); return v === "" ? null : Math.max(0, Math.min(5, Number(v))); });
  const feedback = rb.criteria.map((k, i) => String((el.querySelector(`[data-fb="${i}"]`) || {}).value || "").trim().slice(0, 600));
  return {key:el.getAttribute("data-rubric"), rb, scores, feedback, avg:RUB().average(rb, scores)};
}
const TI = {cell:null, editList:false};
function renderTrainerInputs(){
  if(!AD.rows){ if(!AD.loading){ loadAdmin(); sharedGet("settings:trainer-acts").then(v => { T.acts = (v && v.acts) || null; render(); }).catch(() => {}); } return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort();
  const rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch), list = acts();
  const cellOf = (r, a) => (((r.rv || {}).acts) || {})[a.id] || {};
  const editing = TI.cell && rows.find(r => r.id === TI.cell[0]) && list.find(a => a.id === TI.cell[1]);
  return `<div class="card fss-admin"><div class="ff-bar"><div><h3>🧑‍🏫 Trainer Inputs</h3><p class="fss-muted">The trainee–trainer activities that can’t be simulated (the demos, the live mock calls with you). Record each trainee’s result: it shows on their Practice Lab page and their Scorecard.</p></div>
      <span><select onchange="FTSessionsAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="FTInputs.list()">${TI.editList ? "Close the list" : "✏️ Edit the activities"}</button></span></div>
    ${TI.editList ? `<div class="fss-acts-edit"><p class="fss-muted">One activity per line: <code>title | lesson number | kind | scorecard</code> (kind: Demo, Mock call, or anything; scorecard: one of the Training Guide’s — ${RUB().keys().map(k => `<code>${e(k)}</code>`).join(", ")} — or empty to find it by the title). Keep a line’s title to keep its results.</p>
      <textarea id="tiList" rows="${list.length + 3}">${e(list.map(a => [a.title, a.lesson || "", a.kind || "", a.rubric || ""].join(" | ").replace(/(\s\|\s)+$/, "")).join("\n"))}</textarea>
      <div class="fp-actions"><button class="btn btn-navy btn-sm" onclick="FTInputs.saveList(this)">💾 Save the activities</button></div></div>` : ""}
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl fss-grid"><thead><tr><th>Trainee</th>${list.map(a => `<th title="${e(a.title)}">${e(a.title.length > 28 ? a.title.slice(0, 26) + "…" : a.title)}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${e(r.name)}</b><span class="fss-muted"> ${e(r.batch)}</span></td>${list.map(a => { const c = cellOf(r, a), sc = tScore(c);
        return `<td><button class="fss-cell ${c.status === "Passed" ? "ok" : c.status === "Redo" ? "mid" : ""}" onclick="FTInputs.cell('${e(r.id)}','${e(a.id)}')">${c.status ? e(c.status) + (sc != null ? " " + sc + "%" : "") : "＋"}</button></td>`; }).join("")}</tr>`).join("")}
    </tbody></table></div>` : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}
    ${editing ? (() => { const r = rows.find(x => x.id === TI.cell[0]), a = list.find(x => x.id === TI.cell[1]), c = cellOf(r, a);
      return `<div class="fss-rvform fss-cellform"><b>${e(r.name)} · ${e(a.title)}</b>
        <label>Result <select data-status>${STATUSES.map(s => `<option ${s === (c.status || "Not yet") ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        ${rubricForm(a, c)}${typeof window.ftRubricAssist === "function" ? window.ftRubricAssist(r, a) : ""}
        <label>Score <input type="number" min="0" max="100" data-score value="${tScore(c) != null ? tScore(c) : ""}"> %</label>
        <label>Date <input type="date" data-date value="${e(c.date || new Date().toISOString().slice(0, 10))}"></label>
        <label class="fss-wide">Comment<textarea rows="3" data-comment placeholder="What went well, what to improve (the trainee sees it)">${e(c.comment || "")}</textarea></label>
        ${RUB().forAct(a) ? `<button class="btn btn-ghost btn-sm" onclick="FTInputs.draft(this)">✨ Draft the comment in the facilitator’s voice</button>` : ""}
        <button class="btn btn-navy btn-sm" onclick="FTInputs.save(this)">Save</button><button class="btn btn-ghost btn-sm" onclick="FTInputs.cell()">Close</button></div>`; })() : ""}</div>`;
}
window.FTInputs = {
  // a criterion typed: the weighted average, and the score in % that follows it
  calc(inp){
    const box = inp.closest(".fss-cellform"), r = rubricRead(box); if(!r) return;
    box.querySelector("[data-avg]").textContent = avgTxt(r.avg);
    box.querySelector("[data-score]").value = r.avg == null ? "" : Math.round(r.avg / 5 * 100);
  },
  async draft(btn){
    const box = btn.closest(".fss-cellform"), r = rubricRead(box), [id, act] = TI.cell || [];
    const row = (AD.rows || []).find(x => x.id === id), a = acts().find(x => x.id === act);
    if(!r || !row || !a) return;
    if(!r.scores.some(v => v != null)){ toast("Score the criteria first."); return; }
    btn.disabled = true; const was = btn.textContent; btn.textContent = "Writing…";
    try{
      const prompt = `You are the training facilitator of Legal Support Help writing your feedback on a trainee Legal VA's ${a.kind || "activity"}: ${a.title}.
Trainee's first name: ${String(row.name).split(/\s+/)[0]}
The scorecard (each criterion out of 5${r.rb.feedback ? ", with your feedback note" : ""}):
${r.rb.criteria.map((k, i) => `- ${k.n}: ${r.scores[i] == null ? "not scored" : r.scores[i] + "/5"}${r.feedback[i] ? ` (${r.feedback[i]})` : ""}`).join("\n")}
Weighted average: ${avgTxt(r.avg)}
${r.rb.time ? `Time rule: ${r.rb.time}` : ""}
${String(box.querySelector("[data-comment]").value || "").trim() ? `Your notes so far: ${box.querySelector("[data-comment]").value}` : ""}

Write the comment the trainee will read, in your feedback DNA (below): a verdict label, the strengths naming the criteria scored well, then "However, improvement is needed in …" naming the exact criteria scored low and what to fix, tied to its purpose. 2–4 sentences.

FACILITATOR'S FEEDBACK DNA:
${String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000)}

Return ONLY JSON: {"comment":"..."}`;
      const out = await callAIJson(prompt, 700, undefined, "grading");
      const t = String((out && out.comment) || "").trim().slice(0, 3000);
      if(t) box.querySelector("[data-comment]").value = t; else toast("The AI returned nothing. Try again.");
    }catch(err){ toast("The AI isn’t available right now. Write the comment yourself."); }
    btn.disabled = false; btn.textContent = was;
  },
  cell(id, act){ TI.cell = id ? [id, act] : null; render(); },
  list(){ TI.editList = !TI.editList; render(); },
  async saveList(btn){
    const cur = acts(), out = []; let bad = false;
    String(document.getElementById("tiList").value || "").split("\n").map(l => l.trim()).filter(Boolean).forEach(l => {
      const [title, lesson, kind, rubric] = l.split("|").map(x => x.trim()); if(!title) return;
      const old = cur.find(a => a.title === title);
      let id = old ? old.id : slugPart(title).slice(0, 40) || ("act-" + Date.now().toString(36)); while(!old && out.some(a => a.id === id)) id += "-2";
      const it = {id, title, lesson:Number(lesson) || 0, kind:kind || ""};
      if(rubric){ if(!RUB().list[rubric]){ toast(`“${rubric}” isn’t one of the scorecards: ${RUB().keys().join(", ")}.`); bad = true; } else it.rubric = rubric; }
      out.push(it);
    });
    if(bad) return;
    if(!out.length){ toast("Add at least one activity."); return; }
    btn.disabled = true;
    if(await sharedSet("settings:trainer-acts", {acts:out, updatedAt:new Date().toISOString()}) === false) toast("Couldn’t save. Check your connection.");
    else { T.acts = out; TI.editList = false; toast("✓ Activities saved."); }
    btn.disabled = false; render();
  },
  async save(btn){
    const box = btn.closest(".fss-cellform"), [id, act] = TI.cell, sv = String(box.querySelector("[data-score]").value || "").trim();
    if(sv !== "" && !(Number(sv) >= 0 && Number(sv) <= 100)){ toast("The score is a number from 0 to 100."); return; }
    btn.disabled = true;
    const rr = rubricRead(box);
    try{ await writeReview(id, cur => { cur.acts = cur.acts || {}; cur.acts[act] = Object.assign({status:box.querySelector("[data-status]").value, score:sv === "" ? null : Math.round(Number(sv)),
        date:box.querySelector("[data-date]").value, comment:String(box.querySelector("[data-comment]").value || "").trim().slice(0, 4000), at:new Date().toISOString()},
        rr && rr.scores.some(v => v != null) ? {rubric:{key:rr.key, scores:rr.scores, feedback:rr.feedback, avg:rr.avg == null ? null : Math.round(rr.avg * 100) / 100}} : {}); });
      TI.cell = null; toast("✓ Saved. The trainee sees it on their Practice Lab page."); }
    catch(err){ toast("Couldn’t save. Check your connection."); }
    btn.disabled = false; render();
  }
};
ftAdminTab("trainerinputs", "🧑‍🏫 Trainer Inputs", renderTrainerInputs);

// 📬 My Feedback (js/ft-trainer-feedback.js) names the trainer-led activities and the sessions
FTSessions.trainerActs = () => acts();
FTSessions.sessionTitle = id => (sessionById(id) || {}).title || id;

// the Scorecard's sources (js/ft-program.js): the sessions (the trainer's score, else the automated %) and the trainer inputs
window.ftSessionItems = ctx => {
  const runs = ((ctx.rec["sessions:"] || {}).runs) || {}, rv = ((ctx.rec["labreview:"] || {}).sessions) || {};
  return Object.entries(runs).filter(([k, v]) => v && v.submittedAt).map(([k, v]) => { const [sid, mc] = k.split("|"), s = sessionById(sid), t = tScore(rv[k]);
    return {name:(s ? s.title : sid) + (mc !== "-" ? " · " + mc : ""), pct:t != null ? t : (v.auto ? v.auto.pct : null), note:t != null ? "Trainer’s score" : "Automated checks · waiting for your trainer"}; });
};
window.ftTrainerItems = ctx => {
  const mine = ((ctx.rec["labreview:"] || {}).acts) || {}, list = ((ctx.shared["settings:trainer-acts"] || {}).acts) || DEFAULT_ACTS;
  return list.filter(a => mine[a.id] && mine[a.id].status).map(a => { const r = mine[a.id], t = tScore(r);
    return {name:a.title, pct:t != null ? t : r.status === "Passed" ? 100 : null, note:r.status + (r.rubric && r.rubric.avg != null ? " · scorecard " + Number(r.rubric.avg).toFixed(2) + "/5" : "") + (r.date ? " · " + r.date : "")}; });
};

(function(){ const s = document.createElement("style"); s.id = "ft-sessions"; s.textContent = `
main.main-fss{max-width:1180px;margin:0 auto;padding:24px 16px 40px;}
.fss-hero h1{margin:0 0 6px;color:var(--navy);font-size:27px;} .fss-hero > p{margin:0 0 8px;color:var(--ink-soft);font-size:15px;max-width:820px;}
.fss-case{margin:0;font-size:14px;color:var(--navy);} .fss-muted{color:var(--ink-soft);font-size:13px;}
.fss-timer{display:inline-block;margin:6px 0 12px;background:#E7F5EE;color:#1E7F4F;border-radius:999px;padding:5px 14px;font-size:14px;}
.fss-layout{display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:16px;align-items:start;margin-top:10px;}
@media(max-width:860px){ .fss-layout{grid-template-columns:1fr;} }
.fss-side, .fss-main{padding:16px 18px;} .fss-side{display:flex;flex-direction:column;gap:8px;} .fss-side h3, .fss-main h3{margin:6px 0 4px;color:var(--navy);font-size:16px;}
.fss-rules{margin:0;padding-left:20px;font-size:13.5px;} .fss-rules li{margin:4px 0;} .fss-link{cursor:pointer;color:var(--orange-deep);font-weight:700;font-size:13.5px;}
.fss-start{background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:12px 14px;margin-bottom:10px;} .fss-start p{margin:0 0 8px;}
.fss-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;}
.fss-f{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:var(--navy);border:0;padding:0;margin:0;} .fss-wide{grid-column:1/-1;}
.fss-f input, .fss-f select, .fss-f textarea, .fss-rvform input, .fss-rvform select, .fss-rvform textarea, .fss-acts-edit textarea{font:inherit;font-weight:500;font-size:14px;padding:7px 9px;border:1px solid var(--line);border-radius:8px;background:#fff;}
.fss-f legend{margin-bottom:4px;} .fss-check{display:flex;gap:7px;align-items:center;font-size:13.5px;font-weight:500;color:var(--ink);}
.fss-pill{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:2px 9px;background:#F3F4F8;color:#4A5070;vertical-align:2px;}
.fss-pill.ok{background:#E7F5EE;color:#1E7F4F;} .fss-pill.mid{background:#FEF7C3;color:#7a5d00;} .fss-pill.live{background:#E7F5EE;color:#1E7F4F;}
.fss-checks{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:10px 0;} .fss-checks-h{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.fss-checks ul{list-style:none;margin:8px 0 0;padding:0;font-size:14px;} .fss-checks li{padding:4px 0;border-top:1px solid #F1F2F6;}
.fss-checks li.ok{color:#1E7F4F;} .fss-checks li.miss{color:#B5531A;} .fss-checks li span{display:block;font-size:12.5px;color:var(--ink-soft);margin-left:18px;}
.fss-ai, .fss-rv{border-left:4px solid var(--navy);background:#F7F8FB;border-radius:8px;padding:10px 12px;margin:10px 0;font-size:14px;} .fss-ai p, .fss-rv p{margin:6px 0 0;}
.fss-rv{border-color:var(--orange);} .fss-rv b{margin-right:8px;}
.fss-admin{padding:18px 20px;margin-bottom:16px;} .fss-admin h3{margin:0 0 4px;color:var(--navy);}
.fss-live{display:grid;gap:6px;margin-top:8px;} .fss-liverow{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#F2FBF6;border:1px solid #CDEBDC;border-radius:10px;padding:7px 12px;font-size:14px;}
.fss-trainee{border-top:1px solid var(--line);padding:10px 0;} .fss-trainee > b{color:var(--navy);}
.fss-arow{border:1px solid var(--line);border-radius:10px;margin:6px 0;background:#fff;} .fss-arow-h{cursor:pointer;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:7px 12px;font-size:14px;color:var(--navy);}
.fss-abody{padding:4px 12px 12px;}
.fss-rvform{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);font-size:13.5px;font-weight:700;color:var(--navy);}
.fss-rvform input[type=number]{width:80px;} .fss-rvform .fss-wide{display:flex;flex-direction:column;gap:4px;width:100%;}
.fss-cellform{background:#F7F8FB;border-radius:10px;padding:12px;margin-top:12px;}
.ti-rub{display:block !important;}
.ti-rub-h{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px;}
.ti-rub-time{margin:0 0 6px;font-size:12.5px;font-weight:600;color:#7a5d00;background:#FEF7C3;border-radius:8px;padding:5px 9px;}
.ti-rub-tbl{border-collapse:collapse;width:100%;max-width:900px;font-size:13px;font-weight:600;}
.ti-rub-tbl th{background:#5B9A32;color:#fff;text-align:left;padding:6px 8px;font-size:12.5px;}
.ti-rub-tbl td{border:1px solid #C9D9B8;padding:3px 8px;color:#3F5F1E;}
.ti-rub-tbl tbody tr:nth-child(odd) td{background:#EEF5E4;}
.ti-rub-tbl td:nth-child(2){width:90px;text-align:center;}
.ti-rub-tbl input[data-crit]{width:64px;text-align:center;padding:3px 5px !important;}
.ti-rub-tbl input[data-fb]{width:100%;padding:3px 6px !important;font-size:12.5px !important;}
.ti-rub-avg td{font-weight:800;color:#2F4A14;}
.ti-rub-card{margin-top:6px;font-size:13px;} .ti-rub-card summary{cursor:pointer;color:var(--navy);font-weight:700;}
.ti-rub-card ul{list-style:none;margin:6px 0 0;padding:0;} .ti-rub-card li{display:flex;gap:8px;flex-wrap:wrap;padding:3px 0;border-top:1px solid #F1F2F6;}
.ti-rub-card li span{flex:1 1 auto;} .ti-rub-card li em{flex-basis:100%;color:var(--ink-soft);font-size:12.5px;}
.fss-acts-edit textarea{width:100%;box-sizing:border-box;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;}
.fss-cell{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;min-width:70px;}
.fss-cell.ok{background:#E7F5EE;color:#1E7F4F;border-color:#CDEBDC;} .fss-cell.mid{background:#FEF7C3;color:#7a5d00;}
.fss-grid td span{display:block;}
`; document.head.appendChild(s); })();
})();
