/* ============================================================
   🏷 NAMING & REPORTING DRILLS — the file names, reports and subject lines every demo is graded on
   ------------------------------------------------------------
   Every demo scorecard in the Training Guide has a naming or reporting criterion ("Document Properties &
   Naming Convention Accuracy", "Task Reporting & Notes Documentation", "Email/Fax Sending Accuracy & SOP
   Compliance"), and the conventions are only read in the guide until the demo shows the mistakes. Here
   each one is a short drill (#/drills): a made-up case — client, provider, lien holder, insurer, dates,
   amounts, new every time — and the trainee types the file name, the Notes or Tasks entry, the email
   subject or the fax address, with their own first name where the convention asks for it. Checked against
   the guide's convention on the spot, with the part that differs pointed out, 10 questions a round.

   The sets follow the demos: Intake Packet (Day 8), LORs (Day 12), MedLOR (Day 14), LV (Day 16), Bills &
   Records (Day 17), Reduction & Closing (Day 18), plus the answer files every day asks for. Dashes may be
   – or -, spacing and capital letters are forgiven (the guide itself mixes "Docs Tab" and "Docs tab");
   everything else must match.

   Storage: drills:<id> = {runs: [{set, score, total, at}]} — the trainee's own (worker.js). The best round
   per set shows on 🏅 My Performance.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const pad = n => String(n).padStart(2, "0");
const first = () => (String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0]) || "Jane";

/* ---------- made-up case facts ---------- */
const CLIENTS = [["Maria", "Lopez"], ["James", "Carter"], ["Ana", "Reyes"], ["Daniel", "Brooks"], ["Grace", "Kim"], ["Luis", "Ortega"], ["Hannah", "Price"], ["Victor", "Nguyen"], ["Rosa", "Delgado"], ["Kevin", "Shaw"]];
const INSURERS = ["State Farm", "Geico", "Progressive", "Allstate", "Liberty Mutual", "Travelers", "USAA", "Farmers Insurance", "Empire Fire and Marine Insurance Company", "Nationwide"];
const PROVIDERS = [["JML", "Lyons Physical Therapy"], ["RDG", "Desert Spine Center"], ["KMC", "Sunrise Imaging"], ["BPA", "Valley Chiropractic"], ["TSC", "Tsao Consultants Dr. Tsao"], ["MVI", "Medview Inc."], ["SWO", "Southwest Orthopedics"]];
const NPIM_DOCS = ["Dr. Brian Le", "Dr. Thomas Yee", "Dr. Daniel Fabito"];
const randDate = () => { const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 400) - 5); return d; };
const ddy = d => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${String(d.getFullYear()).slice(2)}`;      // mm.dd.yy
const ddyyyy = d => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${d.getFullYear()}`;                  // mm.dd.yyyy
const slash = d => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;                    // mm/dd/yyyy
const money = () => (Math.round((300 + Math.random() * 6000) * 100) / 100).toFixed(2);
const phone = () => `${pick(["702", "725", "213", "818", "619"])}-${100 + Math.floor(Math.random() * 899)}-${1000 + Math.floor(Math.random() * 8999)}`;
const fullName = c => `${c[0]} ${c[1]}`;
// a fact card: label → value, shown to the trainee as the case they are working on
const card = (rows) => rows.filter(r => r[1] != null && r[1] !== "");

/* ---------- the drills: each builds a case and the one right answer ---------- */
/* THE ANSWER IS THE TRAINER'S, NOT THE TRAINEE'S.
   A drill is marked, not answered for you: a trainee sees whether their line was right, what differs from
   the convention, and the convention itself — never the finished line. The trainer, in trainer view, sees
   the answer each drill expects, so they can mark a line a trainee shows them. */
const keyShown = () => !!state.isAdmin && !state.adminPreview;   // trainer view only; 👁 Trainee view sees what a trainee sees
// q(): {ask, facts, answer, rule, yearEither?}
const SETS = [
  {id: "intake", icon: "📋", title: "Intake Packet", day: 8, items: [
    () => { const c = pick(CLIENTS), d = randDate(), va = first(); const file = `Intake Packet – ${fullName(c)} – ${ddyyyy(d)}`;
      return {ask: "The Notes tab entry after you upload the Intake Packet", facts: card([["Client", fullName(c)], ["Original file in SA", file + ` (${va})`], ["You", va]]),
        answer: `Received ${file}. Saved in Docs Tab. Thank you. (${va})`, rule: "Received [the file’s whole name without your name]. Saved in Docs Tab. Thank you. (VA’s Name)"}; },
    () => { const c = pick(CLIENTS), d = randDate(), va = first();
      return {ask: "The Tasks tab entry for the Intake Packet", facts: card([["Client", fullName(c)], ["Today", slash(d)], ["You", va]]),
        answer: `${slash(d)} – Received completed Intake Packet from ${fullName(c)}. Saved in Docs Tab. Thank you. (${va})`, rule: "mm/dd/yyyy – Received completed Intake Packet from [Client’s Name]. Saved in Docs Tab. Thank you. (VA’s Name)"}; }
  ]},
  {id: "lor", icon: "📨", title: "LORs (1P & 3P)", day: 12, items: [
    () => { const ins = pick(INSURERS), d = randDate(), va = first();
      return {ask: "The file name of the 1P LOR", facts: card([["Client’s insurer (1P)", ins], ["Date", ddyyyy(d)], ["You", va]]),
        answer: `INS – 1P ${ins} – LOR ${ddy(d)} (${va})`, yearEither: true, rule: "INS – 1P/3P Insurance Provider – LOR mm.dd.yy (VA’s name)"}; },
    () => { const ins = pick(INSURERS), d = randDate(), va = first();
      return {ask: "The file name of the 3P LOR (it goes with the affidavit)", facts: card([["Defendant’s insurer (3P)", ins], ["Date", ddyyyy(d)], ["You", va]]),
        answer: `INS – 3P ${ins} – LOR with Affidavit ${ddy(d)} (${va})`, yearEither: true, rule: "INS – 3P Insurance Provider – LOR with Affidavit mm.dd.yy (VA’s name)"}; },
    () => { const ins = pick(INSURERS), d = randDate(), va = first(), file = `INS – 3P ${ins} – LOR with Affidavit ${ddyyyy(d)}`;
      return {ask: "The Notes tab entry after you send the 3P LOR", facts: card([["The file", file + ` (${va})`], ["You", va]]),
        answer: `Sent ${file}. Saved in Docs Tab. Thank you. (${va})`, yearEither: true, rule: "Sent [the file’s whole name without your name]. Saved in Docs Tab. Thank you. (VA’s name)"}; },
    () => { const c = pick(CLIENTS), ins = pick(INSURERS);
      return {ask: "The email subject line for the LOR", facts: card([["Client", fullName(c)], ["Insurance company", ins]]),
        answer: `${fullName(c)} - ${ins} - Letter of Representation`, rule: "Client Name - Insurance Company - Letter of Representation"}; },
    () => { const ins = pick(INSURERS), va = first();
      return {ask: "The first line of the Tasks tab entry after both LORs are sent", facts: card([["You", va]]),
        answer: `Sent LORs to the following insurance providers. Saved in Docs tab. Thank you. (${va})`, rule: "Sent LORs to the following insurance providers. Saved in Docs tab. Thank you. (VA’s Name) — then one line per letter"}; }
  ]},
  {id: "medlor", icon: "🩺", title: "MedLOR", day: 14, items: [
    () => { const [lh, p] = pick(PROVIDERS), d = randDate(), va = first();
      return {ask: "The file name of the MedLOR", facts: card([["Lien holder", lh], ["Medical provider", p], ["Date", ddyyyy(d)], ["You", va]]),
        answer: `MED - ${lh}(${p}) - MedLOR with Unsworn COR and HIPAA ${ddy(d)} (${va})`, rule: "MED - Lien Holder(Medical Provider) - MedLOR with Unsworn COR and HIPAA mm.dd.yy (va’s first name)"}; },
    () => { const doc = pick(NPIM_DOCS), d = randDate(), va = first(), last = doc.split(" ").pop();
      return {ask: "The file name of the MedLOR for an NPIM doctor", facts: card([["Lien holder", "JML"], ["Medical provider", "Fabito Anesthesia Pain Center"], ["NPIM doctor", `Dr. ${last}`], ["Date", ddyyyy(d)], ["You", va]]),
        answer: `MED - JML(Fabito Anesthesia Pain Center Dr. ${last}) - MedLOR with Unsworn COR and HIPAA ${ddy(d)} (${va})`, rule: "For NPIM (Nevada Personal Injury Management), the doctor’s name goes after the provider’s name, inside the brackets."}; },
    () => { const c = pick(CLIENTS), [lh, p] = pick(PROVIDERS);
      return {ask: "The email subject line for the request", facts: card([["Client", fullName(c)], ["Lien holder", lh], ["Medical provider", p]]),
        answer: `${fullName(c)} - ${lh}(${p}) - Request for Medical Bills and Records`, rule: "Name of the client - Name of the lien holder(medical provider) - Type of Request"}; },
    () => { const ph = phone();
      return {ask: "The recipient to type when you send it by fax", facts: card([["Provider’s fax number", ph]]),
        answer: `+1${ph.replace(/\D/g, "")}@metrofax.com`, exact: true, rule: "No dashes, +1 in front, @metrofax.com at the end: 702-998-2171 → +17029982171@metrofax.com"}; }
  ]},
  {id: "lv", icon: "🧾", title: "Lien Balance Verification", day: 16, items: [
    () => { const [lh, p] = pick(PROVIDERS), d = randDate(), va = first();
      return {ask: "The file name of the LV request", facts: card([["Lien holder", lh], ["Provider", p], ["Date", ddyyyy(d)], ["You", va]]),
        answer: `MED – ${lh}(${p}) – Lien Balance Verification ${ddyyyy(d)} (${va})`, rule: "MED – Lien Holder(Provider) – Lien Balance Verification mm.dd.yyyy (va’s first name)"}; },
    () => { const doc = pick(NPIM_DOCS).split(" ").pop(), d = randDate(), va = first();
      return {ask: "The file name of the LV request for an NPIM doctor", facts: card([["Lien holder", "RDG"], ["Provider", "NPIM"], ["Doctor", `Dr. ${doc}`], ["Date", ddyyyy(d)], ["You", va]]),
        answer: `MED – RDG(NPIM Dr. ${doc}) – Lien Balance Verification ${ddyyyy(d)} (${va})`, rule: "For NPIM, always put the doctor’s name after the provider’s name."}; },
    () => { const [lh, p] = pick(PROVIDERS), d = randDate(), va = first(), file = `MED – ${lh}(${p}) – Lien Balance Verification ${ddyyyy(d)}`;
      return {ask: "The Notes tab entry after you send the LV request", facts: card([["The file", file + ` (${va})`], ["You", va]]),
        answer: `Sent ${file}. Saved in Meds and Docs tab. Thank you. (${va})`, rule: "Sent [file name without your name]. Saved in Meds and Docs tab. Thank you. (va’s first name)"}; },
    () => { const [lh, p] = pick(PROVIDERS), d = randDate(), va = first();
      return {ask: "The Tasks tab entry after you send the LV request", facts: card([["Today", slash(d)], ["Lien holder", lh], ["Provider", p], ["You", va]]),
        answer: `${slash(d)} Sent LV request to ${lh}(${p}). Saved in Meds and Docs tab. Thank you. (${va})`, rule: "mm/dd/yyyy Sent LV request to lien holder(medical provider). Saved in Meds and Docs tab. Thank you. (va’s first name)"}; },
    () => { const c = pick(CLIENTS), [lh, p] = pick(PROVIDERS);
      return {ask: "The email subject line for the LV request", facts: card([["Client", fullName(c)], ["Lien holder", lh], ["Provider", p]]),
        answer: `${fullName(c)} - ${lh}(${p}) - Request for Lien Verification`, rule: "Name of the client - Name of the lien holder(medical provider) - Request for Lien Verification"}; }
  ]},
  {id: "bills", icon: "💵", title: "Bills & Records", day: 17, items: [
    () => { const [, p] = pick(PROVIDERS), d = randDate(), va = first(), amt = money();
      return {ask: "The file name of the whole set received (bill, records and lien)", facts: card([["Provider", p], ["HCFA amount", "$" + amt], ["Date of service", ddyyyy(d)], ["You", va]]),
        answer: `MED - ${p} - HCFA $${amt} & Records DOS ${ddy(d)} with Signed COR and Unsigned Lien (${va})`, rule: "MED - Provider - HCFA $0.00 & Records DOS mm.dd.yy with Signed COR and Unsigned Lien (va’s first name)"}; },
    () => { const [, p] = pick(PROVIDERS), d = randDate(), va = first(), amt = money();
      return {ask: "The file name of the bill you extracted", facts: card([["Provider", p], ["HCFA amount", "$" + amt], ["Date of service", ddyyyy(d)], ["You", va]]),
        answer: `MED - ${p} - HCFA $${amt} DOS ${ddy(d)} (${va})`, rule: "MED - Provider - HCFA $0.00 DOS mm.dd.yy (va’s first name)"}; },
    () => { const [, p] = pick(PROVIDERS), d = randDate(), va = first();
      return {ask: "The file name of the records you extracted", facts: card([["Provider", p], ["Date of service", ddyyyy(d)], ["You", va]]),
        answer: `MED - ${p} - Records DOS ${ddy(d)} with Signed COR (${va})`, rule: "MED - Provider - Records DOS mm.dd.yy with Signed COR (va’s first name)"}; },
    () => { const [, p] = pick(PROVIDERS), va = first();
      return {ask: "The file name of the lien you extracted", facts: card([["Provider", p], ["You", va]]),
        answer: `MED - ${p} - Unsigned Lien (${va})`, rule: "MED - Provider - Unsigned Lien (va’s first name)"}; },
    () => { const [, p] = pick(PROVIDERS), d = randDate(), va = first();
      return {ask: "The Tasks tab entry when the bills and records arrive", facts: card([["Today", ddyyyy(d)], ["Lien holder (medical provider)", p], ["You", va]]),
        answer: `${ddyyyy(d)} Received bills & records from ${p}. Saved in Meds and Docs tab. Thank you. (${va})`, rule: "mm.dd.yyyy Received bills & records from [lien holder(medical provider)]. Saved in Meds and Docs tab. Thank you. (va’s first name)"}; }
  ]},
  {id: "reduction", icon: "🤝", title: "Reduction & Closing", day: 18, items: [
    () => { const [, p] = pick(PROVIDERS), va = first();
      return {ask: "The file name of the reduction request", facts: card([["Provider", p], ["You", va]]),
        answer: `MED - ${p} - Reduction Request (${va})`, rule: "MED - Provider’s name - Reduction Request (va’s first name only)"}; },
    () => { const c = pick(CLIENTS);
      return {ask: "The email subject line for the reduction request", facts: card([["Client", fullName(c)]]),
        answer: `Billing Reduction Request | ${c[1].toUpperCase()}, ${c[0].toUpperCase()}`, rule: "Type of Request | LAST NAME, FIRST NAME of the client"}; },
    () => { const c = pick(CLIENTS), va = first();
      return {ask: "The file name of the closing statement", facts: card([["Client", fullName(c)], ["You", va]]),
        answer: `${fullName(c)} – Closing Statement (${va})`, rule: "Client’s Name – Closing Statement (VA’s name)"}; },
    () => { const c = pick(CLIENTS), t = pick(["BI", "UM"]);
      return {ask: `The file name of the settlement release form (the ${t} settlement)`, facts: card([["Client", fullName(c)], ["Settlement type", t]]),
        answer: `${fullName(c)} – Settlement Release Form ${t}`, rule: "Client’s Name – Settlement Release Form BI / UM (name the type when there are two)"}; },
    () => { const c = pick(CLIENTS);
      return {ask: "The email subject line for the closing statement", facts: card([["Client", fullName(c)]]),
        answer: `${c[1].toUpperCase()}, ${c[0].toUpperCase()} - Closing Statement and Settlement Release Form/s`, rule: "LAST NAME, FIRST NAME of the client - Closing Statement and Settlement Release Form/s"}; }
  ]},
  {id: "answers", icon: "🗂", title: "Answer files", day: 1, items: [
    () => { const va = first(), l = pick([["VA Essentials", "VA_Essentials_Process_Question_Answers"], ["Law Firm Communications", "Law_Firm_Communications_Training_Process_Question_Answers"], ["Intake Specialist Training", "Intake_Specialist_Training_Process_Question_Answers"],
        ["Claims Specialist Training", "Claims_Specialist_Training_Process_Question_Answers"], ["Medical Records Specialist Training", "Medical_Records_Specialist_Training_Process_Question_Answers"]]);
      return {ask: `The file name of your ${l[0]} Process Question answers`, facts: card([["Lesson", l[0]], ["You", va]]), answer: `${l[1]} (${va})`, rule: "Lesson_Name_Process_Question_Answers (VA’s first name), with underscores"}; },
    () => { const va = first(), n = pick([1, 2]);
      return {ask: `The file name of your minutes for Interview Recording ${n}`, facts: card([["Recording", `Interview Recording ${n}`], ["You", va]]), answer: `Transcription - Recording ${n} (${va})`, rule: "Transcription - Recording 1 (va’s first name)"}; },
    () => { const va = first();
      return {ask: "The file name of your PI Overview reading-task answers", facts: card([["You", va]]), answer: `PI Overview_Answers (${va})`, rule: "PI Overview_Answers (VA’s name)"}; },
    () => { const va = first();
      return {ask: "The file name of your HIPAA certificate screenshot", facts: card([["You", va]]), answer: `HIPAA Certificate_${va}`, rule: "HIPAA Certificate_[Your Name]"}; }
  ]}
];

/* ---------- checking: dashes, spacing and capitals forgiven; everything else must match ---------- */
function norm(s, yearEither){
  let t = String(s || "").replace(/[–—−]/g, "-").replace(/[‘’]/g, "'").replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim().toLowerCase();
  if(yearEither) t = t.replace(/\b(\d{2})\.(\d{2})\.\d{2}(\d{2})\b/g, "$1.$2.$3");
  return t;
}
// The part to look at: the first " - " piece (or word) that differs. The piece itself belongs to the answer,
// so it is quoted for a trainer only (show) — to a trainee the hint says which part of their own line to look
// at, never what it should have said. A one-part answer (the fax address) is the whole line, so quoting it
// would hand a trainee the answer outright.
function diffHint(typed, answer, show){
  const a = norm(answer).split(" - "), b = norm(typed).split(" - ");
  for(let i = 0; i < Math.max(a.length, b.length); i++) if(a[i] !== b[i])
    return i < a.length
      ? (show ? `Look at part ${i + 1}: “${answer.split(/\s[-–]\s/)[i] || ""}”`
        : a.length > 1 ? `Look at part ${i + 1} of your line — the ${i + 1}${["st", "nd", "rd"][i] || "th"} piece between the dashes.`
        : "Look at your line again, character by character.")
      : "There is extra text at the end.";
  return "";
}
const check = (q, typed) => q.exact ? String(typed || "").trim() === q.answer : norm(typed, q.yearEither) === norm(q.answer, q.yearEither);

/* ---------- the record ---------- */
const D = {id: null, rec: null, loading: null, round: null};
function load(){
  const id = state.traineeId; if(!id) return Promise.resolve(null);
  if(D.loading) return D.loading; if(D.id === id && D.rec) return Promise.resolve(D.rec);
  D.loading = sharedGet("drills:" + id).then(v => { D.id = id; D.rec = v && Array.isArray(v.runs) ? v : {runs: []}; }).catch(() => { D.rec = D.rec || {runs: []}; })
    .then(() => { D.loading = null; if(state.view === "drills") render(); return D.rec; });
  return D.loading;
}
async function saveRun(set, score, total){
  const id = state.traineeId; if(!id) return;
  await load(); D.rec.runs = (D.rec.runs || []).concat([{set, score, total, at: new Date().toISOString()}]).slice(-300);
  if(await sharedSet("drills:" + id, D.rec) === false) toast("Couldn’t save your round. Check your connection.");
}
const best = (rec, set) => (rec.runs || []).filter(r => r.set === set).reduce((m, r) => Math.max(m, Math.round(r.score / r.total * 100)), -1);

/* ---------- a round: 10 questions from a set (or from all of them) ---------- */
const ROUND = 10;
function start(setId){
  const sets = setId === "all" ? SETS : SETS.filter(s => s.id === setId);
  const gens = sets.flatMap(s => s.items.map(g => [s, g]));
  const qs = Array.from({length: ROUND}, (_, i) => { const [s, g] = gens[i < gens.length ? i : Math.floor(Math.random() * gens.length)]; return Object.assign({set: s.id}, g()); });
  for(let i = qs.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [qs[i], qs[j]] = [qs[j], qs[i]]; }
  D.round = {set: setId, qs, i: 0, results: [], shown: null};
  render(); setTimeout(() => { const el = document.getElementById("drAns"); if(el) el.focus(); }, 30);
}
function submit(){
  const r = D.round; if(!r) return;
  if(r.shown){ r.i++; r.shown = null; if(r.i >= r.qs.length) return finish(); render(); setTimeout(() => { const el = document.getElementById("drAns"); if(el) el.focus(); }, 30); return; }
  const v = String((document.getElementById("drAns") || {}).value || "");
  if(!v.trim()){ toast("Type your answer first."); return; }
  const q = r.qs[r.i], ok = check(q, v);
  r.results.push({ok, typed: v}); r.shown = {ok, typed: v, hint: ok ? "" : diffHint(v, q.answer, keyShown())};
  render(); setTimeout(() => { const b = document.getElementById("drNext"); if(b) b.focus(); }, 30);
}
async function finish(){
  const r = D.round, score = r.results.filter(x => x.ok).length;
  r.done = {score, total: r.qs.length}; render();
  await saveRun(r.set, score, r.qs.length);
  render();
}

/* ---------- the page ---------- */
function roundHtml(){
  const r = D.round;
  if(r.done) return `<div class="card dr-run"><h2>Round done</h2><div class="dr-big"><b>${r.done.score}</b><span>of ${r.done.total}</span></div>
      <table class="dr-review"><tbody>${r.qs.map((q, i) => `<tr class="${r.results[i].ok ? "ok" : "bad"}"><td>${r.results[i].ok ? "✓" : "✗"}</td><td><b>${e(q.ask)}</b><br>${r.results[i].ok ? `<code>${e(r.results[i].typed)}</code>` : `<span class="dr-typed">${e(r.results[i].typed)}</span>${keyShown() ? `<br><code>${e(q.answer)}</code>` : ""}`}</td></tr>`).join("")}</tbody></table>
      <div class="dr-acts"><button class="btn btn-navy btn-sm" onclick="FTDrills.start('${r.set}')">Another round</button><button class="btn btn-ghost btn-sm" onclick="FTDrills.close()">Done</button></div></div>`;
  const q = r.qs[r.i], set = SETS.find(s => s.id === q.set), s = r.shown;
  return `<div class="card dr-run"><div class="dr-runh"><span class="dr-kicker">${set.icon} ${e(set.title)}</span><span class="dr-count">${r.i + 1} / ${r.qs.length}</span></div>
      <h2>${e(q.ask)}</h2>
      <dl class="dr-facts">${q.facts.map(f => `<div><dt>${e(f[0])}</dt><dd>${e(f[1])}</dd></div>`).join("")}</dl>
      <input id="drAns" class="dr-ans ${s ? (s.ok ? "ok" : "bad") : ""}" autocomplete="off" spellcheck="false" ${s ? "readonly" : ""} value="${s ? e(s.typed) : ""}" placeholder="Type it exactly as you would in SA or the email" onkeydown="if(event.key==='Enter'){event.preventDefault();FTDrills.submit();}">
      ${s ? `<div class="dr-fb ${s.ok ? "ok" : "bad"}">${s.ok ? "✓ Exactly right." : `✗ Not quite. ${e(s.hint)}${keyShown() ? `<div class="dr-right">The convention gives: <code>${e(q.answer)}</code></div>` : `<div class="dr-right">Read the convention below and try the next one — your trainer has the line it expects.</div>`}`}<div class="dr-rule">📘 ${e(q.rule)}</div></div>` : ""}
      <div class="dr-acts"><button id="drNext" class="btn btn-navy btn-sm" onclick="FTDrills.submit()">${s ? (r.i + 1 < r.qs.length ? "Next →" : "See my round") : "Check"}</button><button class="btn btn-ghost btn-sm" onclick="FTDrills.close()">Stop</button></div></div>`;
}
function renderPage(){
  if(D.round) return roundHtml();
  const rec = state.traineeId ? (D.rec || (load(), {runs: []})) : {runs: []};
  return `<div class="dr-hero"><p class="lp-eyebrow">🛠 Practice Lab · Drafting Tools</p><h1>🏷 Naming &amp; Reporting Drills</h1>
      <p>Every demo is scored on your file names, your Notes and Tasks entries and your email subjects. Practise them here on made-up cases, 10 at a time, and see the exact convention for anything you miss. Dashes, spacing and capitals are forgiven; the rest must match the guide.</p></div>
    <div class="dr-sets">${SETS.map(s => { const b = best(rec, s.id); return `<div class="card dr-set"><div class="dr-set-h"><span>${s.icon}</span><b>${e(s.title)}</b>${s.day > 1 ? `<small>Day ${s.day}</small>` : ""}</div>
      <p>${s.items.length} kinds of question</p>${b >= 0 ? `<span class="dr-best ${b >= 90 ? "top" : ""}">Best: ${b}%</span>` : ""}
      <button class="btn btn-navy btn-sm" onclick="FTDrills.start('${s.id}')">Start a round</button></div>`; }).join("")}
      <div class="card dr-set dr-all"><div class="dr-set-h"><span>🎯</span><b>Everything, mixed</b></div><p>A round drawn from every set: the warm-up before a demo.</p>${best(rec, "all") >= 0 ? `<span class="dr-best">Best: ${best(rec, "all")}%</span>` : ""}
        <button class="btn btn-navy btn-sm" onclick="FTDrills.start('all')">Start a mixed round</button></div></div>`;
}
window.FTDrills = {start, submit, close(){ D.round = null; render(); }, sets: SETS, check, norm, round: () => D.round, record: () => D.rec};
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["drills"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {drills: "Naming & Reporting Drills"});
const __render = window.render;
window.render = function(){
  if(state.view !== "drills") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-dr"><a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>${renderPage()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
// 🏅 My Performance: the best round per set (js/ft-program.js lists this source)
window.ftDrillItems = ctx => { const rec = ctx.rec["drills:"]; if(!rec || !Array.isArray(rec.runs)) return [];
  return SETS.concat([{id: "all", icon: "🎯", title: "Everything, mixed"}]).map(s => ({s, b: best(rec, s.id)})).filter(x => x.b >= 0)
    .map(x => ({name: `${x.s.icon} ${x.s.title}`, pct: x.b, note: `best of ${rec.runs.filter(r => r.set === x.s.id).length} round${rec.runs.filter(r => r.set === x.s.id).length === 1 ? "" : "s"}`})); };
// 🧰 the Practice Lab's Drafting Tools card
window.ftDrillsCard = () => `<div class="card fts-card"><div class="fts-kicker">Days 8–18 · before each demo</div><h3>🏷 Naming &amp; Reporting Drills</h3>
    <p class="fts-note">File names, Notes and Tasks entries, email subjects and fax addresses for every demo, checked against the guide’s conventions on made-up cases.</p>
    <div class="fts-tool-act"><button class="btn btn-navy btn-sm" type="button" onclick="goto('drills')">Open the drills</button></div></div>`;

(function(){ const st = document.createElement("style"); st.id = "ft-drills"; st.textContent = `
main.main-dr{max-width:980px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:14px;}
.dr-hero h1{margin:0 0 4px;} .dr-hero p{margin:0;color:var(--ink-soft);max-width:72ch;}
.dr-sets{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;}
.dr-set{padding:14px 16px;display:flex;flex-direction:column;gap:6px;align-items:flex-start;}
.dr-set-h{display:flex;gap:8px;align-items:baseline;width:100%;} .dr-set-h span{font-size:20px;} .dr-set-h small{margin-left:auto;color:var(--ink-soft);font-weight:700;}
.dr-set p{margin:0;color:var(--ink-soft);font-size:13.5px;}
.dr-best{font-size:12px;font-weight:800;background:#F3F4F8;color:var(--navy);border-radius:999px;padding:2px 9px;} .dr-best.top{background:#E7F5EE;color:#1E7F4F;}
.dr-run{padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
.dr-run h2{margin:0;}
.dr-runh{display:flex;justify-content:space-between;align-items:center;}
.dr-kicker{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#B5651F;}
.dr-count{font:700 15px ui-monospace,Menlo,monospace;color:var(--navy);background:#F3F4F8;border-radius:8px;padding:3px 10px;}
.dr-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin:0;}
.dr-facts div{background:#F8F9FC;border:1px solid var(--line,#E3E7F0);border-radius:10px;padding:8px 12px;}
.dr-facts dt{font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-soft);} .dr-facts dd{margin:2px 0 0;font-weight:700;}
.dr-ans{font:16px ui-monospace,Menlo,monospace;border:2px solid var(--line,#D5DAE5);border-radius:10px;padding:10px 12px;width:100%;}
.dr-ans:focus{outline:none;border-color:#DB8437;} .dr-ans.ok{border-color:#2E7D4F;background:#F2FBF6;} .dr-ans.bad{border-color:#B42318;background:#FFF5F4;}
.dr-fb{border-radius:10px;padding:10px 12px;font-size:14px;} .dr-fb.ok{background:#E7F5EE;color:#1E5B39;} .dr-fb.bad{background:#FFF1EF;color:#7A271A;}
.dr-right{margin-top:6px;} .dr-fb code,.dr-review code{font-size:13.5px;background:#fff;border:1px solid #E3E7F0;border-radius:6px;padding:1px 6px;color:#1F2A44;}
.dr-rule{margin-top:6px;font-size:12.5px;color:var(--ink-soft);}
.dr-acts{display:flex;gap:8px;flex-wrap:wrap;}
.dr-big{display:flex;align-items:baseline;gap:8px;} .dr-big b{font-size:52px;line-height:1;color:var(--navy);} .dr-big span{color:var(--ink-soft);}
.dr-review{border-collapse:collapse;width:100%;font-size:13.5px;} .dr-review td{padding:6px 8px;border-bottom:1px solid #F1F2F6;vertical-align:top;}
.dr-review tr.ok td:first-child{color:#1E7F4F;font-weight:800;} .dr-review tr.bad td:first-child{color:#B42318;font-weight:800;}
.dr-typed{color:#B42318;text-decoration:line-through;font-family:ui-monospace,Menlo,monospace;}
`; document.head.appendChild(st); })();
})();
