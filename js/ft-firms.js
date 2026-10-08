/* ============================================================
   🏛 Law Firm Profiles: each trainee works for one firm, on their own cases
   Loaded after js/ft-cases-data.js (the Training Library's case facts) and before js/ft-sessions.js.
     • Firm profiles (settings:firms, admins write, everyone reads): the firm's name, location and time
       zone, hours, main line and greeting, attorneys, its rules by area (general, reception, calendar,
       intake, claims, medical records), its calendar color rule, statute of limitations, LOR deadline,
       records vendor and record types, and its caseload (Training Library cases in the CMS, MC-01 …).
       Until an admin saves them, the three profiles in DEFAULT_FIRMS are used.
     • Assignments (assign:<id>, admins write, the trainee reads): the trainee's firm, and their cases for
       each practice area: PI Process Flow, Intake, Claims and Medical Records. Different trainees can get
       different firms and different cases. Admin → 🏛 Law Firms: the profiles, then each batch's trainees
       with their firm and cases (🎲 Spread cases gives each trainee in the batch different cases).
     • 🏛 My Firm (#/firm, under 🛠 Practice Lab): the trainee's firm profile and rules, to read and
       acknowledge (✓ I've read my firm's rules, saved in sessions:<id>), and their assigned cases, each
       opening in the CMS (signed in: js/lsh-tool-links.js).
     • Every Practice Session (js/ft-sessions.js) is set at the trainee's firm, on their assigned case, and
       checked against that firm's rules.
     • window.ftAdminTab(id, label, render): adds a tab to the Admin screen (used by the Practice Lab's tabs too).
   ============================================================ */
(function(){
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
const CASES = window.FT_CASES || [];
const caseById = id => CASES.find(c => c.id === id) || null;
const range = (a, b) => Array.from({length:b - a + 1}, (_, i) => "MC-" + String(a + i).padStart(2, "0"));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview;
// The practice areas a trainee is assigned cases in (the lessons they practice).
const AREAS = [
  {id:"pi", icon:"⚖️", label:"PI Process Flow", lesson:3},
  {id:"intake", icon:"📋", label:"Intake", lesson:6},
  {id:"claims", icon:"🧾", label:"Claims", lesson:7},
  {id:"records", icon:"🩺", label:"Medical Records", lesson:8}
];
const RULE_AREAS = [["general", "General"], ["reception", "Reception and calls"], ["calendar", "Calendar"], ["intake", "Intake"], ["claims", "Claims"], ["records", "Medical records"]];
const GCAL = ["Tomato", "Flamingo", "Tangerine", "Banana", "Sage", "Basil", "Peacock", "Blueberry", "Lavender", "Grape", "Graphite"];

/* ---------- the firm profiles ---------- */
const CMSF = window.FT_CMS_FIRM || {};
const DEFAULT_FIRMS = [
  {id:"lsh-training-law-group", name:CMSF.name || "LSH Training Law Group (fictional)", location:"Riverton, Georgia", state:"GA", tz:"Eastern",
    hours:"Monday–Friday, 8:30 AM – 5:30 PM Eastern", start:"08:30", end:"17:30", mainLine:CMSF.mainLine || "(555) 010-2000",
    greeting:"Thank you for calling Legal Support Help. This is (your name).",
    attorneys:(CMSF.directory || []).filter(x => /^Atty\./.test(x.name)).map(x => ({name:x.name, role:x.role})),
    team:(CMSF.directory || []).filter(x => !/^Atty\./.test(x.name)).map(x => ({name:x.name, role:x.role, ext:x.ext})),
    colors:[[30, "Tangerine"], [45, "Blueberry"], [60, "Tomato"]], gap:15, solYears:2, lorHours:24,
    vendor:"ChartSwap", recordTypes:["Medical records", "Itemized billing"], recordsEmail:"records@legalsupporthelp.com",
    rules:{
      general:["Every case lives in the CMS: log each call, email and task as a Note on the case the same day.", "Name every file with the firm's naming convention: CLIENT LAST NAME, First – Document – MM.DD.YYYY."].concat(CMSF.sop ? [CMSF.sop[3]] : []),
      reception:(CMSF.rules || []).concat((CMSF.sop || []).filter((x, i) => i !== 3)),
      calendar:["Book in Eastern time, on a 15-minute grid, with a 15-minute gap between events.", "Color by length: 30 minutes Tangerine, 45 minutes Blueberry, 1 hour Tomato.", "Every client meeting gets a Google Meet link and an email reminder 1 day before.", "No appointments outside 9:00 AM – 5:00 PM unless the attorney asks."],
      intake:["Georgia personal injury: 2 years from the date of the accident to file (O.C.G.A. § 9-3-33). Flag any case within 90 days of it to the Intake Attorney (ext 203) at once.", "Accepted: auto, motorcycle, bicycle, slip and fall, premises liability, dog bite, product liability. Declined: workers' compensation and medical malpractice (refer out).", "Before the retainer goes out: a conflict check on every party, and the police report number when there is one."],
      claims:["Send the LOR to the at-fault carrier (3P) and the client's own carrier (1P: UM/UIM, MedPay) within 24 hours of the signed retainer.", "Record each claim in the CMS: carrier, claim number, adjuster, policy limits, and the date the LOR went out.", "Follow up on every unacknowledged LOR in 7 days."],
      records:["Request records through ChartSwap when the provider uses it; otherwise by fax or email with the firm's request letter.", "Every request asks for both the medical records and the itemized billing, for the dates of service.", "A request goes out only with the claim-specific HIPAA authorization signed. Not signed yet: hold the request and send the client the authorization first.", "Patient name and date of birth exactly as on the provider's file; for a client with a guardian or POA, the authorized representative signs."]
    },
    cases:range(1, 20)},
  {id:"harbor-pine-injury-law", name:"Harbor & Pine Injury Law (fictional)", location:"Tampa, Florida", state:"FL", tz:"Eastern",
    hours:"Monday–Friday, 9:00 AM – 6:00 PM Eastern", start:"09:00", end:"18:00", mainLine:"(555) 010-6100",
    greeting:"Harbor & Pine Injury Law, this is (your name). How may I help you today?",
    attorneys:[{name:"Atty. Celeste Harbor", role:"Managing Partner (Pre-Litigation)"}, {name:"Atty. Jonah Pine", role:"Trial Attorney (Litigation)"}],
    team:[{name:"Mara Quintero", role:"Case Manager", ext:"610"}, {name:"Devin Shaw", role:"Records Coordinator", ext:"640"}, {name:"Intake Team", role:"New cases", ext:"600"}],
    colors:[[30, "Banana"], [60, "Peacock"]], gap:15, solYears:2, lorHours:48,
    vendor:"ChartSwap", recordTypes:["Medical records", "Itemized billing", "Imaging reports"], recordsEmail:"records@harborpine.example.com",
    rules:{
      general:["Every call, email and task is a Note in the CMS the same day.", "Spanish-speaking callers: offer a bilingual team member before going on."],
      reception:["Open with: \"Harbor & Pine Injury Law, this is (your name). How may I help you today?\"", "Verify a caller with full name, date of birth and the date of the accident before saying anything about a case.", "Adjusters and defense counsel: take a message for the attorney on the file; never confirm facts.", "Close with: \"Is there anything else I can help you with?\""],
      calendar:["Book in Eastern time, on a 15-minute grid, 15 minutes between events.", "Color by length: 30 minutes Banana, 1 hour Peacock.", "Consultations are 30 minutes; strategy meetings 1 hour.", "No appointments before 9:00 AM or after 6:00 PM."],
      intake:["Florida negligence: 2 years from the accident to file (for accidents after 03/24/2023). Flag any case within 120 days of it.", "Florida is a no-fault state: open the client's PIP claim within 14 days of the accident, or the PIP medical benefits can be lost.", "Accepted: auto, premises, dog bite, product liability. Declined: medical malpractice and workers' compensation."],
      claims:["Send the LOR to the 3P carrier and open the 1P PIP claim within 48 hours of the signed retainer.", "Ask every carrier for a declarations page with the LOR.", "Follow up on an unacknowledged LOR in 5 business days."],
      records:["Request through ChartSwap when the provider uses it.", "Every request: medical records, itemized billing and imaging reports, for the dates of service.", "Only with a signed HIPAA authorization on file; a guardian or POA signs for the client when the file lists one."]
    },
    cases:range(21, 36)},
  {id:"summit-trial-attorneys", name:"Summit Trial Attorneys (fictional)", location:"Sacramento, California", state:"CA", tz:"Pacific",
    hours:"Monday–Friday, 8:00 AM – 5:00 PM Pacific", start:"08:00", end:"17:00", mainLine:"(555) 010-7300",
    greeting:"Good morning, Summit Trial Attorneys, (your name) speaking.",
    attorneys:[{name:"Atty. Rafael Montoya", role:"Senior Partner"}, {name:"Atty. Grace Whitfield", role:"Associate Attorney"}],
    team:[{name:"Lena Ortiz", role:"Case Manager", ext:"730"}, {name:"Records Desk", role:"Medical records and bills", ext:"740"}],
    colors:[[30, "Lavender"], [60, "Grape"]], gap:10, solYears:2, lorHours:24,
    vendor:"ChartSwap", recordTypes:["Medical records", "Itemized billing"], recordsEmail:"records@summittrial.example.com",
    rules:{
      general:["Times are Pacific: say \"Pacific time\" whenever you give a time to someone outside California.", "Every call and task is a Note in the CMS the same day."],
      reception:["Open with: \"Good morning (or afternoon), Summit Trial Attorneys, (your name) speaking.\"", "Verify with full name, date of birth and one more identifier on file before discussing a case.", "Never give a case value, a deadline or legal advice: take a complete message for the attorney."],
      calendar:["Book in Pacific time, with 10 minutes between events.", "Color by length: 30 minutes Lavender, 1 hour Grape.", "Client meetings get a Google Meet link and an email reminder 1 day before."],
      intake:["California personal injury: 2 years from the injury to file (Code Civ. Proc. § 335.1); 6 months for a claim against a public entity. Flag either at once.", "Accepted: auto, bicycle, premises, dog bite (strict liability, Civ. Code § 3342), product liability."],
      claims:["LOR to the 3P carrier and the client's UM/UIM and MedPay carrier within 24 hours of the signed retainer.", "Record every claim number and adjuster in the CMS the same day."],
      records:["Request through ChartSwap when the provider uses it; otherwise the firm's request letter by fax.", "Every request: medical records and itemized billing, for the dates of service.", "A signed HIPAA authorization must be on file first."]
    },
    cases:range(37, 52)}
];
const F = {firms:null, at:0, loading:null};
function loadFirms(force){
  if(F.loading || (!force && F.firms && Date.now() - F.at < 5 * 60000)) return F.loading;
  F.at = Date.now();
  F.loading = sharedGet("settings:firms").then(v => { F.firms = v && Array.isArray(v.firms) && v.firms.length ? v.firms : null; })
    .catch(() => {}).then(() => { F.loading = null; rerender(); });
  return F.loading;
}
const firms = () => F.firms || DEFAULT_FIRMS;
const firmById = id => firms().find(f => f.id === id) || null;

/* ---------- the trainee's assignment ---------- */
const A = {id:null, data:null, at:0, loading:null};
function loadMine(force){
  if(!state.traineeId || state.isAdmin || A.loading) return A.loading;
  if(!force && A.id === state.traineeId && Date.now() - A.at < 120000) return null;
  const id = state.traineeId; A.at = Date.now();
  A.loading = sharedGet("assign:" + id).then(v => { A.id = id; A.data = v && typeof v === "object" ? v : {}; })
    .catch(() => {}).then(() => { A.loading = null; rerender(); });
  return A.loading;
}
function rerender(){ if(["firm", "simulators", "session"].includes(state.view) || (state.view === "admin" && state.adminTab === "firms")) render(); }
// The trainee's firm (null until assigned) and their cases in an area (the assigned ones, or none).
function myFirm(){ loadFirms(); if(!isTrainee()) return null; loadMine(); return A.id === state.traineeId && A.data ? firmById(A.data.firm) : null; }
function myCases(area){ const a = A.id === state.traineeId && A.data && A.data.cases; return ((a && a[area]) || []).map(caseById).filter(Boolean); }
const caseHref = (c, program) => CMS + "?" + new URLSearchParams({program:program || "cm", mock:c.id, from:"standard"});

window.FTFirms = {AREAS, RULE_AREAS, GCAL, firms, firmById, myFirm, myCases, caseById, caseHref, loadFirms, loadMine,
  assignment: () => (A.id === state.traineeId && A.data) || null, defaults: DEFAULT_FIRMS};

/* ---------- 🏛 My Firm (#/firm) ---------- */
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["firm"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {firm:"My Firm"});
function rulesHtml(f){
  return RULE_AREAS.filter(([k]) => (f.rules[k] || []).length).map(([k, label]) => `<div class="ff-rules"><h4>${e(label)}</h4><ol>${f.rules[k].map(x => `<li>${e(x)}</li>`).join("")}</ol></div>`).join("");
}
function firmFacts(f){
  return `<div class="ff-facts">
    <span><b>📍</b> ${e(f.location)} · ${e(f.tz)} time</span><span><b>🕘</b> ${e(f.hours)}</span><span><b>☎️</b> ${e(f.mainLine)}</span>
    <span><b>🗂</b> Records through ${e(f.vendor || "the provider")}</span></div>
    <p class="ff-greet"><b>Greeting:</b> “${e(f.greeting)}”</p>
    <div class="ff-people"><div><h4>Attorneys</h4>${(f.attorneys || []).map(a => `<p><b>${e(a.name)}</b><span>${e(a.role)}</span></p>`).join("")}</div>
      <div><h4>Team</h4>${(f.team || []).map(a => `<p><b>${e(a.name)}</b><span>${e(a.role)}${a.ext ? " · ext " + e(a.ext) : ""}</span></p>`).join("")}</div></div>`;
}
function renderMyFirm(){
  if(adminOn()) return `<div class="card ff-card"><h1>🏛 My Firm</h1><p>Trainees see their assigned firm here. Set up the firm profiles and assign them in <a class="ff-link" onclick="state.adminTab='firms'; goto('admin')">Admin → 🏛 Law Firms</a>.</p></div>`;
  const f = myFirm();
  if(A.id !== state.traineeId) return `<div class="card ff-card">Loading your firm…</div>`;
  if(!f) return `<div class="card ff-card"><h1>🏛 My Firm</h1><p>Your trainer hasn’t assigned your law firm yet. Once they do, its profile, its rules and your cases show here, and every Practice Session is set at that firm.</p></div>`;
  const ack = window.FTSessions && FTSessions.ack();
  const acked = ack && ack.firm === f.id;
  return `<div class="ff-hero"><p class="lp-eyebrow">🛠 Practice Lab · My Firm</p><h1>🏛 ${e(f.name)}</h1>
      <p>You work for this firm during your training: every Practice Session is on its cases and checked against its rules. Learn its rules before your sessions.</p></div>
    <div class="card ff-card">${firmFacts(f)}</div>
    <div class="card ff-card"><h2>📏 The firm’s rules</h2>${rulesHtml(f)}
      <div class="ff-ack">${acked ? `<span class="ff-ok">✓ You confirmed you read these rules on ${e(new Date(ack.at).toLocaleDateString())}.</span>`
        : `<button class="btn btn-navy" onclick="FTSessions.acknowledge('${e(f.id)}')">✓ I’ve read and understood my firm’s rules</button>`}</div></div>
    <div class="card ff-card"><h2>🗂 My cases</h2><p class="ff-muted">Your trainer assigned you these files in the CMS. Open one to read it before its Practice Session.</p>
      ${AREAS.map(ar => { const cs = myCases(ar.id); return `<div class="ff-area"><b>${ar.icon} ${e(ar.label)}</b>${cs.length ? cs.map(c => `<div class="ff-case"><span class="ff-mc">${e(c.id)}</span> ${e(c.client.name)} · ${e(c.type)} · ${e(c.phase)}
          <a class="btn btn-ghost btn-sm" href="${e(caseHref(c, ar.id === "intake" ? "intake" : "cm"))}" target="_blank" rel="noopener">Open in the CMS ↗</a></div>`).join("") : `<span class="ff-muted"> not assigned yet</span>`}</div>`; }).join("")}</div>`;
}
const __render = window.render;
window.render = function(){
  if(state.view !== "firm") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-ff">${renderMyFirm()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};

/* ---------- Admin tabs: one helper for every tab this program adds ---------- */
window.ftAdminTab = function(id, label, renderTab){
  const __admin = window.renderAdmin;
  window.renderAdmin = function(){
    const tab = `<button class="admin-tab-btn ${state.adminTab === id ? "active" : ""}" onclick="setAdminTab('${id}')">${label}</button>`;
    if(state.isAdmin && state.adminTab === id){
      state.adminTab = "opendays";                   // borrow the tab bar…
      const out = __admin.apply(this, arguments);
      state.adminTab = id;
      const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
      return out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>" + renderTab();
    }
    const out = __admin.apply(this, arguments);
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
  };
};

/* ---------- Admin → 🏛 Law Firms: the profiles, then each batch's assignments ---------- */
const FA = {people:null, assign:{}, loading:false, batch:"", edit:null};
async function loadAdmin(){
  FA.loading = true;
  try{
    await loadFirms(true);
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected)
      .sort((a, b) => String(a.batch || "").localeCompare(String(b.batch || "")) || String(a.name || "").localeCompare(String(b.name || "")));
    const vals = [];
    for(let i = 0; i < people.length; i += 100) vals.push(...await sharedGetMany(people.slice(i, i + 100).map(r => "assign:" + r.id)));
    FA.assign = {}; people.forEach((r, i) => { FA.assign[r.id] = vals[i] || {}; });
    FA.people = people;
    if(!FA.batch){ const bs = [...new Set(people.map(r => r.batch).filter(Boolean))].sort(); FA.batch = bs[bs.length - 1] || ""; }
  }catch(err){ FA.people = []; }
  FA.loading = false; rerender();
}
const lines = v => String(v || "").split("\n").map(x => x.trim()).filter(Boolean);
function firmForm(f){
  const r = f.rules || {};
  return `<div class="card ff-edit"><h3>${f._new ? "➕ New firm" : "✏️ " + e(f.name)}</h3>
    <div class="ff-grid">
      <label>Firm name<input data-k="name" value="${e(f.name)}"></label>
      <label>Location<input data-k="location" value="${e(f.location)}"></label>
      <label>State (2 letters)<input data-k="state" value="${e(f.state)}" maxlength="2"></label>
      <label>Time zone<input data-k="tz" value="${e(f.tz)}" placeholder="Eastern"></label>
      <label>Hours<input data-k="hours" value="${e(f.hours)}"></label>
      <label>Opens (HH:MM)<input data-k="start" value="${e(f.start)}" placeholder="09:00"></label>
      <label>Closes (HH:MM)<input data-k="end" value="${e(f.end)}" placeholder="17:00"></label>
      <label>Main line<input data-k="mainLine" value="${e(f.mainLine)}"></label>
      <label class="ff-wide">Greeting<input data-k="greeting" value="${e(f.greeting)}"></label>
      <label>Statute of limitations (years)<input data-k="solYears" type="number" min="1" max="10" value="${e(f.solYears)}"></label>
      <label>LOR within (hours)<input data-k="lorHours" type="number" min="1" max="240" value="${e(f.lorHours)}"></label>
      <label>Gap between events (min)<input data-k="gap" type="number" min="0" max="60" value="${e(f.gap)}"></label>
      <label>Records vendor<input data-k="vendor" value="${e(f.vendor)}" placeholder="ChartSwap"></label>
      <label>Records email<input data-k="recordsEmail" value="${e(f.recordsEmail)}"></label>
      <label class="ff-wide">Record types to request (one per line)<textarea data-k="recordTypes" rows="2">${e((f.recordTypes || []).join("\n"))}</textarea></label>
      <label class="ff-wide">Calendar colors by length (one per line: minutes | color; colors: ${GCAL.join(", ")})<textarea data-k="colors" rows="3">${e((f.colors || []).map(x => x[0] + " | " + x[1]).join("\n"))}</textarea></label>
      <label class="ff-wide">Attorneys (one per line: name | role)<textarea data-k="attorneys" rows="3">${e((f.attorneys || []).map(x => x.name + " | " + x.role).join("\n"))}</textarea></label>
      <label class="ff-wide">Team (one per line: name | role | ext)<textarea data-k="team" rows="3">${e((f.team || []).map(x => [x.name, x.role, x.ext || ""].join(" | ")).join("\n"))}</textarea></label>
      <label class="ff-wide">Caseload: the firm’s cases in the CMS (Training Library ids, e.g. MC-01, MC-02 or MC-01–MC-20)<input data-k="cases" value="${e((f.cases || []).join(", "))}"></label>
      ${RULE_AREAS.map(([k, label]) => `<label class="ff-wide">Rules · ${e(label)} (one per line)<textarea data-rule="${k}" rows="4">${e((r[k] || []).join("\n"))}</textarea></label>`).join("")}
    </div>
    <div class="ff-acts"><button class="btn btn-navy btn-sm" onclick="FTFirmsAdmin.save(this)">💾 Save firm</button><button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.cancel()">Cancel</button></div></div>`;
}
function parseCases(v){
  const out = [];
  String(v || "").split(/[,\s]+/).filter(Boolean).forEach(t => {
    const m = t.toUpperCase().match(/^MC-(\d+)(?:[–-]+(?:MC-)?(\d+))?$/);
    if(!m) return;
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    for(let i = Math.min(a, b); i <= Math.max(a, b); i++){ const id = "MC-" + String(i).padStart(2, "0"); if(caseById(id) && !out.includes(id)) out.push(id); }
  });
  return out;
}
function caseSelect(r, area, f){
  const cur = ((FA.assign[r.id] || {}).cases || {})[area] || [];
  const pool = (f ? f.cases : []).map(caseById).filter(Boolean);
  return `<select data-area="${area}" onchange="FTFirmsAdmin.setCase('${e(r.id)}','${area}',this.value)"><option value="">—</option>${pool.map(c => `<option value="${e(c.id)}" ${cur[0] === c.id ? "selected" : ""}>${e(c.id)} · ${e(c.client.name)} (${e(c.phase)})</option>`).join("")}</select>`;
}
function renderAdminFirms(){
  if(!FA.people){ if(!FA.loading) loadAdmin(); return `<div class="card" style="padding:24px;">Loading the firms and trainees…</div>`; }
  const fs = firms(), batches = [...new Set(FA.people.map(r => r.batch).filter(Boolean))].sort();
  const rows = FA.people.filter(r => !FA.batch || r.batch === FA.batch);
  return `<div class="card ff-admin"><h3>🏛 Law Firm Profiles</h3>
      <p class="ff-muted">Each trainee works for one firm: its rules are what their Practice Sessions are checked against, and its caseload is where their cases come from (the CMS’s Training Library files). ${F.firms ? "" : "These are the starting profiles: saving any firm saves them all."}</p>
      <div class="ff-firms">${fs.map(f => `<div class="ff-firm"><b>${e(f.name)}</b><span>${e(f.location)} · ${e(f.tz)} · ${(f.cases || []).length} cases · ${FA.people.filter(r => (FA.assign[r.id] || {}).firm === f.id).length} trainees</span>
        <span class="ff-acts"><button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.edit('${e(f.id)}')">✏️ Edit</button>${fs.length > 1 ? `<button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.remove('${e(f.id)}')">🗑</button>` : ""}</span></div>`).join("")}</div>
      <div class="ff-acts"><button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.edit('')">➕ New firm</button>${F.firms ? `<button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.restore()">↺ Restore the starting profiles</button>` : ""}</div></div>
    ${FA.edit ? firmForm(FA.edit) : ""}
    <div class="card ff-admin"><div class="ff-bar"><div><h3>👥 Assignments</h3><p class="ff-muted">Each trainee’s firm and their cases in each practice area. Trainees see them on 🏛 My Firm and in their Practice Sessions.</p></div>
      <span><select onchange="FTFirmsAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === FA.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.refresh()">↻</button></span></div>
      ${rows.length ? `<div class="ff-bulk"><label>Whole ${FA.batch ? "batch" : "list"}: firm <select id="ffBulkFirm"><option value="">—</option>${fs.map(f => `<option value="${e(f.id)}">${e(f.name)}</option>`).join("")}</select></label>
          <button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.bulkFirm()">Assign this firm to all</button>
          <button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.spread()" title="Each trainee gets different cases from their firm's caseload, in every practice area">🎲 Spread cases (different for each trainee)</button></div>
        <div class="ff-scroll"><table class="ff-tbl"><thead><tr><th>Trainee</th><th>Batch</th><th>Firm</th>${AREAS.map(a => `<th>${a.icon} ${e(a.label)}</th>`).join("")}<th></th></tr></thead><tbody>
        ${rows.map(r => { const as = FA.assign[r.id] || {}, f = firmById(as.firm); return `<tr data-id="${e(r.id)}"><td><b>${e(r.name || r.id)}</b></td><td>${e(r.batch || "")}</td>
          <td><select onchange="FTFirmsAdmin.setFirm('${e(r.id)}',this.value)"><option value="">—</option>${fs.map(x => `<option value="${e(x.id)}" ${as.firm === x.id ? "selected" : ""}>${e(x.name)}</option>`).join("")}</select></td>
          ${AREAS.map(a => `<td>${caseSelect(r, a.id, f)}</td>`).join("")}
          <td>${as._dirty ? `<button class="btn btn-navy btn-sm" onclick="FTFirmsAdmin.saveRow('${e(r.id)}', this)">Save</button>` : as.at ? `<span class="ff-ok" title="Saved ${e(new Date(as.at).toLocaleString())}">✓</span>` : ""}</td></tr>`; }).join("")}
        </tbody></table></div>
        ${rows.some(r => (FA.assign[r.id] || {})._dirty) ? `<div class="ff-acts"><button class="btn btn-navy btn-sm" onclick="FTFirmsAdmin.saveAll(this)">💾 Save all changes</button></div>` : ""}`
        : `<p class="ff-muted">No approved trainees${FA.batch ? " in this batch" : ""} yet.</p>`}</div>`;
}
async function saveFirms(list){
  const ok = await sharedSet("settings:firms", {v:1, firms:list, updatedAt:new Date().toISOString()});
  if(ok === false){ toast("Couldn’t save the firms. Check your connection."); return false; }
  F.firms = list; F.at = Date.now(); return true;
}
window.FTFirmsAdmin = {
  batch(b){ FA.batch = b; render(); },
  refresh(){ FA.people = null; render(); },
  edit(id){ const f = id ? firmById(id) : null; FA.edit = f ? JSON.parse(JSON.stringify(f)) : {_new:true, id:"", name:"", rules:{}, cases:[], colors:[[30, "Tangerine"], [60, "Tomato"]], solYears:2, lorHours:24, gap:15, vendor:"ChartSwap", recordTypes:["Medical records", "Itemized billing"], tz:"Eastern", start:"09:00", end:"17:00"}; render(); },
  cancel(){ FA.edit = null; render(); },
  async save(btn){
    const box = btn.closest(".ff-edit"), f = Object.assign({}, FA.edit), val = k => (box.querySelector(`[data-k="${k}"]`) || {}).value || "";
    ["name", "location", "state", "tz", "hours", "start", "end", "mainLine", "greeting", "vendor", "recordsEmail"].forEach(k => { f[k] = val(k).trim(); });
    if(!f.name){ toast("Give the firm a name."); return; }
    ["solYears", "lorHours", "gap"].forEach(k => { f[k] = Number(val(k)) || 0; });
    f.state = f.state.toUpperCase();
    f.recordTypes = lines(val("recordTypes"));
    f.colors = lines(val("colors")).map(l => l.split("|").map(x => x.trim())).filter(x => Number(x[0]) > 0 && GCAL.includes(x[1])).map(x => [Number(x[0]), x[1]]);
    f.attorneys = lines(val("attorneys")).map(l => { const [name, role] = l.split("|").map(x => x.trim()); return {name, role:role || ""}; });
    f.team = lines(val("team")).map(l => { const [name, role, ext] = l.split("|").map(x => x.trim()); return {name, role:role || "", ext:ext || ""}; });
    f.cases = parseCases(val("cases"));
    f.rules = {}; RULE_AREAS.forEach(([k]) => { f.rules[k] = lines((box.querySelector(`[data-rule="${k}"]`) || {}).value); });
    const list = firms().map(x => JSON.parse(JSON.stringify(x)));
    if(f._new){ delete f._new; f.id = slugPart(f.name) || ("firm-" + Date.now().toString(36)); while(list.some(x => x.id === f.id)) f.id += "-2"; list.push(f); }
    else list[list.findIndex(x => x.id === f.id)] = f;
    btn.disabled = true;
    if(await saveFirms(list)){ FA.edit = null; toast("✓ Firm saved."); }
    btn.disabled = false; render();
  },
  async remove(id){
    const f = firmById(id); if(!f) return;
    const n = FA.people.filter(r => (FA.assign[r.id] || {}).firm === id).length;
    if(!confirm(`Delete ${f.name}?${n ? ` ${n} trainee${n === 1 ? " is" : "s are"} assigned to it and will need another firm.` : ""}`)) return;
    if(await saveFirms(firms().filter(x => x.id !== id))) toast("Firm deleted.");
    render();
  },
  async restore(){
    if(!confirm("Replace the saved firm profiles with the three starting ones? Your edits to them are lost.")) return;
    if(await saveFirms(JSON.parse(JSON.stringify(DEFAULT_FIRMS)))) toast("The starting profiles are back.");
    render();
  },
  setFirm(id, firm){ const a = FA.assign[id] = Object.assign({}, FA.assign[id]); if(a.firm !== firm){ a.firm = firm; a.cases = {}; } a._dirty = true; render(); },
  setCase(id, area, mc){ const a = FA.assign[id] = Object.assign({}, FA.assign[id]); a.cases = Object.assign({}, a.cases); a.cases[area] = mc ? [mc] : []; a._dirty = true; render(); },
  bulkFirm(){
    const firm = (document.getElementById("ffBulkFirm") || {}).value; if(!firm){ toast("Pick a firm first."); return; }
    FA.people.filter(r => !FA.batch || r.batch === FA.batch).forEach(r => { const a = FA.assign[r.id] = Object.assign({}, FA.assign[r.id]); if(a.firm !== firm){ a.firm = firm; a.cases = {}; } a._dirty = true; });
    render();
  },
  // Different cases for each trainee: per firm and area, the firm's caseload in turn (from the cases that fit the area).
  spread(){
    const rows = FA.people.filter(r => (!FA.batch || r.batch === FA.batch) && firmById((FA.assign[r.id] || {}).firm));
    if(!rows.length){ toast("Assign the trainees’ firms first."); return; }
    const fits = {pi:c => true, intake:c => /intake/i.test(c.phase), claims:c => (c.bi || []).length > 0, records:c => (c.providers || []).length > 0};
    const turn = {}, perFirm = {};
    rows.forEach(r => { const k = FA.assign[r.id].firm; perFirm[k] = (perFirm[k] || 0) + 1; });
    rows.forEach(r => {
      const a = FA.assign[r.id] = Object.assign({}, FA.assign[r.id]), f = firmById(a.firm); a.cases = {};
      AREAS.forEach(ar => {
        // the cases that fit the area first; when there are fewer than trainees, the rest of the caseload too, so no two share one
        const all = f.cases.map(caseById).filter(Boolean), fit = all.filter(fits[ar.id]);
        const pool = fit.length >= perFirm[f.id] ? fit : fit.concat(all.filter(c => !fit.includes(c)));
        if(!pool.length) return;
        const k = f.id + "|" + ar.id; turn[k] = turn[k] || 0;
        // the areas start at different points, so one trainee's cases differ from area to area
        a.cases[ar.id] = [pool[(turn[k] + AREAS.indexOf(ar) * 3) % pool.length].id]; turn[k]++;
      });
      a._dirty = true;
    });
    toast("Cases spread. Check them, then 💾 Save all changes."); render();
  },
  async saveRow(id, btn){ if(btn) btn.disabled = true; await saveAssign([id]); render(); },
  async saveAll(btn){ btn.disabled = true; await saveAssign(Object.keys(FA.assign).filter(id => FA.assign[id]._dirty)); render(); }
};
async function saveAssign(ids){
  let n = 0;
  for(const id of ids){
    const a = Object.assign({}, FA.assign[id]); delete a._dirty; a.at = new Date().toISOString();
    if(await sharedSet("assign:" + id, a) !== false){ FA.assign[id] = a; n++; }
  }
  toast(n === ids.length ? `✓ Saved ${n} assignment${n === 1 ? "" : "s"}.` : `Saved ${n} of ${ids.length}. Check your connection and try again.`);
}
ftAdminTab("firms", "🏛 Law Firms", renderAdminFirms);

(function(){ const s = document.createElement("style"); s.id = "ft-firms"; s.textContent = `
main.main-ff{max-width:1000px;margin:0 auto;padding:24px 16px 40px;}
.ff-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;} .ff-hero > p{margin:0 0 16px;color:var(--ink-soft);font-size:15px;}
.ff-card{padding:18px 20px;margin-bottom:16px;} .ff-card h1{margin:0 0 8px;color:var(--navy);} .ff-card h2{margin:0 0 10px;color:var(--navy);font-size:20px;}
.ff-facts{display:flex;gap:8px;flex-wrap:wrap;} .ff-facts span{background:#F3F4F8;border-radius:999px;padding:5px 12px;font-size:13.5px;color:#4A5070;}
.ff-greet{margin:12px 0;font-size:14.5px;} .ff-muted{color:var(--ink-soft);font-size:13.5px;} .ff-link{cursor:pointer;color:var(--orange-deep);font-weight:700;}
.ff-people{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;} .ff-people h4, .ff-rules h4{margin:6px 0;color:var(--orange-deep);font-size:12px;letter-spacing:.06em;text-transform:uppercase;}
.ff-people p{margin:4px 0;font-size:14px;} .ff-people p span{display:block;font-size:12.5px;color:var(--ink-soft);}
.ff-rules ol{margin:0 0 10px;padding-left:22px;font-size:14.5px;} .ff-rules li{margin:4px 0;}
.ff-ack{margin-top:10px;} .ff-ok{color:var(--success);font-weight:700;}
.ff-area{padding:8px 0;border-top:1px solid var(--line);} .ff-area > b{display:block;color:var(--navy);margin-bottom:4px;}
.ff-case{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14px;margin:4px 0;} .ff-case a.btn{text-decoration:none;margin-left:auto;}
.ff-mc{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;font-weight:800;background:var(--navy);color:#fff;border-radius:4px;padding:1px 6px;}
.ff-admin, .ff-edit{padding:18px 20px;margin-bottom:16px;} .ff-admin h3, .ff-edit h3{margin:0 0 4px;color:var(--navy);}
.ff-firms{display:grid;gap:8px;margin:10px 0;} .ff-firm{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:#fff;}
.ff-firm b{color:var(--navy);} .ff-firm > span{font-size:13px;color:var(--ink-soft);} .ff-firm .ff-acts{margin:0 0 0 auto;}
.ff-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
.ff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:10px 0;}
.ff-grid label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:700;color:var(--navy);} .ff-grid .ff-wide{grid-column:1/-1;}
.ff-grid input, .ff-grid textarea, .ff-tbl select, .ff-bar select, .ff-bulk select{font:inherit;font-weight:500;font-size:13.5px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:#fff;}
.ff-bar{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;} .ff-bar > span{display:flex;gap:8px;align-items:center;}
.ff-bulk{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0;font-size:13.5px;}
.ff-scroll{overflow-x:auto;} .ff-tbl{width:100%;border-collapse:collapse;font-size:13.5px;}
.ff-tbl th, .ff-tbl td{padding:6px 8px;border-top:1px solid var(--line);text-align:left;vertical-align:middle;white-space:nowrap;}
.ff-tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6B7088;background:#F7F8FB;} .ff-tbl select{max-width:220px;}
`; document.head.appendChild(s); })();
})();
