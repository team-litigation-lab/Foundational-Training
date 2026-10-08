/* ============================================================
   🟢 Practice Sessions: real work, in real time, for the trainee's own firm
   Loaded after js/ft-simulators.js (whose 🛠 Practice Lab page shows these cards) and js/ft-firms.js.
   Instead of simulators, each session is the real task done live: the trainee starts it (the clock runs),
   does the work in the CMS on their assigned case at their assigned firm (js/ft-firms.js), records what they
   did on the session's form, and submits it. Each one is then:
     1. checked automatically against the case file (js/ft-cases-data.js) and the firm's rules (a % per check);
     2. evaluated by the AI in the facilitator's feedback DNA (js/ft-facilitator-dna.js);
     3. reviewed by the trainer: a score and a comment (Admin → 🟢 Practice Sessions), which is final.
   The sessions:
     ☎️ Reception Mock Calls        lesson 4: the CMS Call Simulator's line + the Front Desk Drill; the call note
     📅 Calendaring Practice Lab    lesson 5: the Calendar Management mock call (CMS), then the appointment on the
                                    Google Calendar Simulator, under the firm's calendar rules
     📋 Intake Mock Calls           lesson 6: the CMS's intake line on the trainee's intake case; the intake summary
     ⚖️ PI Process Flow             lesson 3: the trainee's case: its phase, team, dates and next steps
     🧾 Claims: LORs (1P & 3P)       lesson 7: the trainee's claims case: the carriers, claims and LOR dates
     🩺 Medical Records: ChartSwap  lesson 8: a ChartSwap records request for the trainee's records case
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
const adminOn = () => !!state.isAdmin && !state.adminPreview;
const FF = () => window.FTFirms;
const PASS = 80;
// dates: "MM/DD/YYYY" (the case files) and "YYYY-MM-DD" (date inputs)
const toISO = s => { const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : String(s || "").slice(0, 10); };
const addYears = (iso, n) => { const m = String(iso).match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? `${Number(m[1]) + n}-${m[2]}-${m[3]}` : ""; };
const mins = t => { const m = String(t || "").match(/^(\d{1,2}):(\d\d)/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const fmtDate = iso => { const m = String(iso || "").match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? `${m[2]}/${m[3]}/${m[1]}` : String(iso || ""); };
const PHASES = ["Intake", "Treating", "Pending Demand", "BI Demanded", "BI Settlement Negotiations", "BI Settled", "UM or UIM Demanded", "UM or UIM Settled", "Litigation Discovery", "Mediation", "Arbitration", "Deposition", "Disbursement"];
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
const calls = (line, graded) => CMS + "?" + new URLSearchParams(Object.assign({calls:"1", program:"FT", from:"standard", line}, graded ? {mode:"graded"} : {}));

/* ---------- the sessions: tools, the form, and the checks ---------- */
// field: [name, label, type ("text" | "date" | "time" | "number" | "textarea" | "select" | "checks" | "check"), options?]
const SESSIONS = [
  {id:"reception", icon:"☎️", title:"Reception Mock Calls", lesson:4,
    about:"Answer your firm’s front desk live in the CMS Call Simulator: verify the caller, find the file and handle the call the way your firm’s rules say. Then write the call note here.",
    tools: () => [["🎯 Take a graded call", calls("Reception Mock Calls", true)], ["📞 Practice a caller", calls("Reception Mock Calls")], ["☎️ Front Desk Drill", CMS + "?program=reception&drill=1&from=standard"]],
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
  {id:"calendaring", icon:"📅", title:"Calendaring Practice Lab", lesson:5,
    about:"A caller phones in about one of the firm’s cases (the CMS Call Simulator’s Calendar Management line): get their name, verify them and find the file. Then book the appointment on the Google Calendar Simulator under your firm’s calendar rules, and record it here.",
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
  {id:"intake", icon:"📋", title:"Intake Mock Calls", lesson:6, area:"intake", program:"intake",
    about:"Take the intake call live (the CMS Call Simulator’s intake line), working in your intake case’s Intake tab, under your firm’s intake criteria. Then record the intake here.",
    tools: c => [["🎯 Take a graded call", calls("Intake Mock Calls", true)], ["📞 Practice a caller", calls("Intake Mock Calls")]].concat(c ? [[`🗂 ${c.id} in the CMS (Intake)`, FF().caseHref(c, "intake")]] : []),
    fields: f => [["name", "Potential client’s full name", "text"], ["dob", "Date of birth", "date"], ["dol", "Date of the accident (DOL)", "date"], ["type", "Case type", "select", ["MVA", "Slip and Fall", "Premise Liability", "Dog Bite", "Others"]],
      ["injuries", "Injuries and treatment so far", "textarea"], ["carrier", "At-fault party’s carrier (3P)", "text"], ["sol", "Statute of limitations date", "date"],
      ["conflict", "Conflict check run on every party", "check"], ["decision", "Decision", "select", ["Accept: send the retainer", "Refer to the Intake Attorney", "Decline and refer out"]]],
    check: (a, c, f) => c ? [
      ["Client’s name", same(a.name, c.client.name), c.client.name],
      ["Date of birth", toISO(c.client.dob) === a.dob, c.client.dob],
      ["Date of the accident", toISO(c.dol) === a.dol, c.dol],
      ["Case type", near(a.type, c.type) || (a.type === "Others" && !["MVA", "Slip and Fall", "Premise Liability", "Dog Bite"].includes(c.type)), c.type],
      ["3P carrier", !(c.bi || []).length || (c.bi || []).some(b => near(a.carrier, b.carrier)), (c.bi || []).map(b => b.carrier).join(", ")],
      [`Statute of limitations (${f.solYears} years, ${f.state})`, a.sol === addYears(toISO(c.dol), Number(f.solYears) || 2), fmtDate(addYears(toISO(c.dol), Number(f.solYears) || 2))],
      ["Injuries and treatment recorded", String(a.injuries || "").trim().length >= 20, ""],
      ["Conflict check and a decision", !!a.conflict && has(a.decision), ""]] : []},
  {id:"pi", icon:"⚖️", title:"PI Process Flow: your case", lesson:3, area:"pi",
    about:"Open your assigned case in the CMS and place it in the personal injury process: where it is, who owns it, its key dates, and what happens next.",
    tools: c => c ? [[`🗂 ${c.id} in the CMS`, FF().caseHref(c, "cm")]] : [],
    fields: f => [["phase", "Phase the case is in", "select", PHASES], ["attorney", "Attorney on the file", "text"], ["cm", "Case manager", "text"], ["dol", "Date of the accident", "date"], ["sol", "Statute of limitations date", "date"],
      ["next", "The next steps, in order (one per line), and who does each", "textarea"]],
    check: (a, c) => c ? [
      ["Phase", same(a.phase, c.phase), c.phase], ["Attorney", near(a.attorney, c.attorney), c.attorney], ["Case manager", near(a.cm, c.cm), c.cm],
      ["Date of the accident", toISO(c.dol) === a.dol, c.dol], ["Statute of limitations", toISO(c.sol) === a.sol, c.sol],
      ["At least two next steps, each with who does it", String(a.next || "").split("\n").filter(x => x.trim().length > 8).length >= 2, ""]] : []},
  {id:"claims", icon:"🧾", title:"Claims: LORs to the 1P and 3P carriers", lesson:7, area:"claims",
    about:"Open your claims case in the CMS (Work on a practice copy), record its claims and send the letters of representation the way your firm requires. Then record what you sent here.",
    tools: c => c ? [[`🗂 ${c.id} in the CMS`, FF().caseHref(c, "cm")]] : [],
    fields: f => [["carrier3", "3P carrier", "text"], ["claim3", "3P claim number", "text"], ["adjuster3", "3P adjuster", "text"], ["limits3", "3P policy limits", "text"],
      ["type1", "1P coverage", "select", ["None on file", "UM/UIM", "PIP", "MedPay", "UM/UIM and MedPay"]], ["carrier1", "1P carrier", "text"], ["claim1", "1P claim number", "text"],
      ["sent", "LORs sent on", "date"], ["follow", "Follow-up date for an unacknowledged LOR", "date"]],
    check: (a, c, f) => { if(!c) return []; const b = (c.bi || [])[0] || {}, p = (c.pipum || [])[0];
      const gap = a.sent && a.follow ? Math.round((new Date(a.follow) - new Date(a.sent)) / 86400000) : -1;
      return [["3P carrier", near(a.carrier3, b.carrier), b.carrier], ["3P claim number", norm(a.claim3) === norm(b.claim), b.claim], ["3P adjuster", near(a.adjuster3, b.adjuster), b.adjuster],
        ["3P policy limits", norm(a.limits3).replace(/ /g, "") === norm(b.limits).replace(/ /g, ""), b.limits],
        ["1P coverage", p ? near(a.type1, p.type) || near(a.carrier1, p.carrier) : a.type1 === "None on file", p ? `${p.type} · ${p.carrier}` : "None on file"],
        ["1P claim", !p || !has(p.claim) || norm(a.claim1) === norm(p.claim), p ? p.claim : ""],
        ["A follow-up date within a week of the LORs", gap >= 1 && gap <= 7, "1 to 7 days after"]]; }},
  {id:"records", icon:"🩺", title:"Medical Records: ChartSwap request", lesson:8, area:"records",
    about:"Request your records case’s medical records the way your firm does: through ChartSwap when the provider uses it. Find what you need in the CMS file, then fill in the ChartSwap request here.",
    tools: c => c ? [[`🗂 ${c.id} in the CMS`, FF().caseHref(c, "cm")]] : [],
    fields: f => [["requester", "Requesting firm", "text"], ["deliver", "Deliver the records to (email)", "text"], ["patient", "Patient’s full name", "text"], ["dob", "Patient’s date of birth", "date"],
      ["provider", "Provider / facility", "text"], ["from", "Dates of service: from", "date"], ["to", "Dates of service: to (empty = to present)", "date"],
      ["types", "Records requested", "checks", ["Medical records", "Itemized billing", "Imaging reports", "Radiology films", "Discharge summary"]],
      ["purpose", "Purpose of the request", "select", ["Legal: attorney request", "Continuing care", "Personal use"]],
      ["hipaa", "HIPAA authorization", "select", ["Signed authorization attached", "Not signed yet: hold the request and send it to the client"]],
      ["rep", "Signed by (the client, or their authorized representative)", "text"]],
    check: (a, c, f) => { if(!c) return [];
      const prov = (c.providers || []).find(p => near(a.provider, p.name));
      const dfrom = prov ? toISO(String(prov.dates || "").split(/\s+[–-]\s+/)[0]) : "";
      const hold = c.hipaa === "sent, not signed";
      const rep = c.authorized ? c.authorized.split(" (")[0] : c.client.name;
      return [["Requesting firm", near(a.requester, f.name), f.name], ["Delivered to the firm’s records email", same(a.deliver, f.recordsEmail), f.recordsEmail],
        ["Patient’s name, as on the file", same(a.patient, c.client.name), c.client.name], ["Date of birth", toISO(c.client.dob) === a.dob, c.client.dob],
        ["A provider treating this client", !!prov, (c.providers || []).map(p => p.name).join(", ")],
        ["Dates of service from the first visit", !!prov && a.from === dfrom, prov ? prov.dates : ""],
        ["The firm’s record types", (f.recordTypes || []).every(t => (a.types || []).includes(t)), (f.recordTypes || []).join(", ")],
        ["Purpose: legal", a.purpose === "Legal: attorney request", ""],
        ["HIPAA authorization", hold ? /hold/i.test(a.hipaa) : /attached/i.test(a.hipaa), hold ? "Not signed yet: hold the request" : "Signed authorization attached"],
        ["Signed by the right person", near(a.rep, rep), c.authorized || c.client.name]]; }}
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
    const s = sessionById(S.cur), c = caseFor(s), t = (s.tools(c) || [])[i]; if(!t) return;
    if(t[1] === "calsim:standard"){ if(window.ftsCalsim) ftsCalsim("standard"); return; }
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
${((f.rules || {})[{reception:"reception", calendaring:"calendar", intake:"intake", pi:"general", claims:"claims", records:"records"}[s.id]] || []).map(x => "- " + x).join("\n")}

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
  links(id){ const s = sessionById(id); return s ? (s.tools(s.area ? caseFor(s) : null) || []).map(t => t[1]) : []; }
};
// the Practice Lab page's cards (js/ft-simulators.js)
FTSessions.cards = function(){
  if(isTrainee()) load();
  const f = isTrainee() ? FF().myFirm() : null;
  return SESSIONS.map(s => {
    const c = isTrainee() ? caseFor(s) : null, run = isTrainee() ? runOf(s, c) : null, rv = run ? reviewOf(keyOf(s, c)) : null, sc = scoreOf(run, rv);
    const open = state.isAdmin || state.adminPreview || window.dayUnlocked(s.lesson);
    const status = !run ? "" : run.submittedAt ? `<span class="fss-pill ${sc >= PASS ? "ok" : "mid"}">${tScore(rv) != null ? "🧑‍🏫 " : ""}${sc}%</span>` : run.startedAt ? `<span class="fss-pill live">🟢 In progress</span>` : "";
    const lessonT = (DAYS.find(d => d.id === s.lesson) || {}).title || "";
    return `<div class="card fts-card fss-card ${open ? "" : "fts-locked"}"><div class="fts-kicker">${e(lessonT)}${open ? "" : " · opens with this lesson"}</div>
      <h3>${s.icon} ${e(s.title)} ${status}</h3><p class="fts-note">${e(s.about)}</p>
      ${window.ftsGradedLine ? ftsGradedLine(s.lesson) : ""}
      ${s.area && isTrainee() ? `<p class="fss-case">${c ? `🗂 Your case: <b>${e(c.id)}</b> · ${e(c.client.name)}` : "🗂 Your trainer assigns your case for this session."}</p>` : ""}
      <div class="fts-tool-act">${!open ? `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`
        : isTrainee() && !f ? `<button class="btn btn-ghost btn-sm" disabled>Waiting for your firm</button>`
        : isTrainee() && s.area && !c ? `<button class="btn btn-ghost btn-sm" disabled>Waiting for your case</button>`
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
  const f = preview ? FF().firms()[0] : FF().myFirm(), c = preview ? (s.area ? FF().caseById((f.cases || [])[0]) : null) : caseFor(s);
  if(!f) return `${back}<div class="card" style="padding:24px;">Your trainer hasn’t assigned your law firm yet.</div>`;
  const run = preview ? null : runOf(s, c), rv = run ? reviewOf(keyOf(s, c)) : null;
  const started = run && run.startedAt && !run.submittedAt, done = run && run.submittedAt;
  const ruleKey = {reception:"reception", calendaring:"calendar", intake:"intake", pi:"general", claims:"claims", records:"records"}[s.id];
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
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
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
  {id:"lor-demo", title:"LOR Uploading and Sending Demo (1P & 3P)", lesson:7, kind:"Demo"},
  {id:"medlor-demo", title:"Sending MedLOR and Requesting Medical Bills & Records Demo", lesson:8, kind:"Demo"},
  {id:"lv-demo", title:"LV (Lien Verification) Request Demo", lesson:8, kind:"Demo"}
];
const T = {acts:null};
const acts = () => T.acts || DEFAULT_ACTS;
const STATUSES = ["Not yet", "Passed", "Redo"];
FTSessions.trainerCards = function(){
  if(isTrainee()) load();
  const mine = ((S.review || {}).acts) || {};
  return acts().filter(a => DAYS.find(d => d.id === a.lesson) || !a.lesson).map(a => { const r = mine[a.id] || {}, sc = tScore(r);
    return `<div class="card fts-card"><div class="fts-kicker">${e(a.kind || "With your trainer")}${a.lesson ? " · " + e((DAYS.find(d => d.id === a.lesson) || {}).title || "") : ""}</div>
      <h3>${e(a.title)} ${r.status ? `<span class="fss-pill ${r.status === "Passed" ? "ok" : r.status === "Redo" ? "mid" : ""}">${e(r.status)}${sc != null ? " · " + sc + "%" : ""}</span>` : ""}</h3>
      <p class="fts-note">${isTrainee() ? (has(r.comment) ? `🧑‍🏫 ${e(r.comment)}` : "You do this live with your trainer, who records your result here.") : "Trainers record each trainee’s result in Admin → 🧑‍🏫 Trainer Inputs."}</p></div>`; }).join("");
};

/* ---------- Admin → 🟢 Practice Sessions ---------- */
const AD = {rows:null, loading:false, batch:"", open:{}, live:true, timer:null, at:0};
async function loadAdmin(quiet){
  AD.loading = true;
  try{
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const keys = people.flatMap(r => ["sessions:" + r.id, "labreview:" + r.id, "assign:" + r.id]), vals = [];
    for(let i = 0; i < keys.length; i += 99) vals.push(...await sharedGetMany(keys.slice(i, i + 99)));
    AD.rows = people.map((r, i) => ({id:r.id, name:r.name || r.id, batch:r.batch || "", s:vals[i * 3] || {runs:{}}, rv:vals[i * 3 + 1] || {}, as:vals[i * 3 + 2] || {}}))
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
  const firm = FF().firmById((r.as || {}).firm);
  return `<div class="fss-arow"><div class="fss-arow-h" onclick="FTSessionsAdmin.open('${e(k)}')">${open ? "▾" : "▸"} ${s ? s.icon + " " + e(s.title) : e(sid)} ${mc !== "-" ? `<span class="ff-mc">${e(mc)}</span>` : ""}
      ${run.submittedAt ? `<span class="fss-pill ${run.auto && run.auto.pct >= PASS ? "ok" : "mid"}">auto ${run.auto ? run.auto.pct : "—"}%</span>` : `<span class="fss-pill live">🟢 in progress</span>`}
      ${tScore(rv) != null ? `<span class="fss-pill ok">🧑‍🏫 ${tScore(rv)}%</span>` : run.submittedAt ? `<span class="fss-pill">to review</span>` : ""}
      <span class="fss-muted">${run.submittedAt ? `${e(new Date(run.submittedAt).toLocaleString())} · ${run.minutes} min · attempt ${run.attempts}` : `started ${e(new Date(run.startedAt).toLocaleTimeString())}`}</span></div>
    ${open ? `<div class="fss-abody">${firm ? `<p class="fss-muted">Firm: ${e(firm.name)}</p>` : ""}
      ${s ? `<div class="fss-form">${s.fields(firm || FF().firms()[0]).map(x => field(x, run.answers || {}, true)).join("")}</div>` : ""}
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
        return `<div class="fss-trainee"><b>${e(r.name)}</b> <span class="fss-muted">${e(r.batch)} · ${runs.length} session${runs.length === 1 ? "" : "s"}${toReview ? ` · <b>${toReview} to review</b>` : ""}${FF().firmById((r.as || {}).firm) ? " · " + e(FF().firmById(r.as.firm).name) : " · no firm assigned"}</span>
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
    ${TI.editList ? `<div class="fss-acts-edit"><p class="fss-muted">One activity per line: <code>title | lesson number | kind</code> (kind: Demo, Mock call, or anything). Keep a line’s title to keep its results.</p>
      <textarea id="tiList" rows="${list.length + 3}">${e(list.map(a => [a.title, a.lesson || "", a.kind || ""].join(" | ")).join("\n"))}</textarea>
      <div class="fp-actions"><button class="btn btn-navy btn-sm" onclick="FTInputs.saveList(this)">💾 Save the activities</button></div></div>` : ""}
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl fss-grid"><thead><tr><th>Trainee</th>${list.map(a => `<th title="${e(a.title)}">${e(a.title.length > 28 ? a.title.slice(0, 26) + "…" : a.title)}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${e(r.name)}</b><span class="fss-muted"> ${e(r.batch)}</span></td>${list.map(a => { const c = cellOf(r, a), sc = tScore(c);
        return `<td><button class="fss-cell ${c.status === "Passed" ? "ok" : c.status === "Redo" ? "mid" : ""}" onclick="FTInputs.cell('${e(r.id)}','${e(a.id)}')">${c.status ? e(c.status) + (sc != null ? " " + sc + "%" : "") : "＋"}</button></td>`; }).join("")}</tr>`).join("")}
    </tbody></table></div>` : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}
    ${editing ? (() => { const r = rows.find(x => x.id === TI.cell[0]), a = list.find(x => x.id === TI.cell[1]), c = cellOf(r, a);
      return `<div class="fss-rvform fss-cellform"><b>${e(r.name)} · ${e(a.title)}</b>
        <label>Result <select data-status>${STATUSES.map(s => `<option ${s === (c.status || "Not yet") ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <label>Score <input type="number" min="0" max="100" data-score value="${tScore(c) != null ? tScore(c) : ""}"> %</label>
        <label>Date <input type="date" data-date value="${e(c.date || new Date().toISOString().slice(0, 10))}"></label>
        <label class="fss-wide">Comment<textarea rows="3" data-comment placeholder="What went well, what to improve (the trainee sees it)">${e(c.comment || "")}</textarea></label>
        <button class="btn btn-navy btn-sm" onclick="FTInputs.save(this)">Save</button><button class="btn btn-ghost btn-sm" onclick="FTInputs.cell()">Close</button></div>`; })() : ""}</div>`;
}
window.FTInputs = {
  cell(id, act){ TI.cell = id ? [id, act] : null; render(); },
  list(){ TI.editList = !TI.editList; render(); },
  async saveList(btn){
    const cur = acts(), out = [];
    String(document.getElementById("tiList").value || "").split("\n").map(l => l.trim()).filter(Boolean).forEach(l => {
      const [title, lesson, kind] = l.split("|").map(x => x.trim()); if(!title) return;
      const old = cur.find(a => a.title === title);
      let id = old ? old.id : slugPart(title).slice(0, 40) || ("act-" + Date.now().toString(36)); while(!old && out.some(a => a.id === id)) id += "-2";
      out.push({id, title, lesson:Number(lesson) || 0, kind:kind || ""});
    });
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
    try{ await writeReview(id, cur => { cur.acts = cur.acts || {}; cur.acts[act] = {status:box.querySelector("[data-status]").value, score:sv === "" ? null : Math.round(Number(sv)),
        date:box.querySelector("[data-date]").value, comment:String(box.querySelector("[data-comment]").value || "").trim().slice(0, 4000), at:new Date().toISOString()}; });
      TI.cell = null; toast("✓ Saved. The trainee sees it on their Practice Lab page."); }
    catch(err){ toast("Couldn’t save. Check your connection."); }
    btn.disabled = false; render();
  }
};
ftAdminTab("trainerinputs", "🧑‍🏫 Trainer Inputs", renderTrainerInputs);

// the Scorecard's sources (js/ft-program.js): the sessions (the trainer's score, else the automated %) and the trainer inputs
window.ftSessionItems = ctx => {
  const runs = ((ctx.rec["sessions:"] || {}).runs) || {}, rv = ((ctx.rec["labreview:"] || {}).sessions) || {};
  return Object.entries(runs).filter(([k, v]) => v && v.submittedAt).map(([k, v]) => { const [sid, mc] = k.split("|"), s = sessionById(sid), t = tScore(rv[k]);
    return {name:(s ? s.title : sid) + (mc !== "-" ? " · " + mc : ""), pct:t != null ? t : (v.auto ? v.auto.pct : null), note:t != null ? "Trainer’s score" : "Automated checks · waiting for your trainer"}; });
};
window.ftTrainerItems = ctx => {
  const mine = ((ctx.rec["labreview:"] || {}).acts) || {}, list = ((ctx.shared["settings:trainer-acts"] || {}).acts) || DEFAULT_ACTS;
  return list.filter(a => mine[a.id] && mine[a.id].status).map(a => { const r = mine[a.id], t = tScore(r);
    return {name:a.title, pct:t != null ? t : r.status === "Passed" ? 100 : null, note:r.status + (r.date ? " · " + r.date : "")}; });
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
.fss-acts-edit textarea{width:100%;box-sizing:border-box;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13px;}
.fss-cell{font:inherit;font-size:12.5px;font-weight:700;border:1px solid var(--line);background:#fff;border-radius:8px;padding:4px 10px;cursor:pointer;min-width:70px;}
.fss-cell.ok{background:#E7F5EE;color:#1E7F4F;border-color:#CDEBDC;} .fss-cell.mid{background:#FEF7C3;color:#7a5d00;}
.fss-grid td span{display:block;}
`; document.head.appendChild(s); })();
})();
