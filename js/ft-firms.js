/* ============================================================
   🏛 Law Firm Profiles: each trainee works for one firm, on their own cases
   Loaded after js/ft-cases-data.js (the Training Library's case facts) and before js/ft-sessions.js.
     • Firm profiles (settings:firms, admins write, everyone reads): the firm's name, location and time
       zone, hours, main line and greeting, attorneys, its rules by area (general, reception, calendar,
       intake, claims, medical records), its calendar color rule, statute of limitations, LOR deadline,
       records vendor and record types, and its caseload (Training Library cases in the CMS, MC-01 …).
       Until an admin saves them, the three profiles in DEFAULT_FIRMS are used.
     • Every trainee works for the first firm profile, on that firm's caseload (no per-trainee assignment).
     • 🏛 My Firm (#/firm): 📁 Client Profile in the top bar — the firm's profile and rules, to read and
       acknowledge (✓ I've read my firm's rules, saved in sessions:<id>).
     • Every Practice Session (js/ft-sessions.js) is set at that firm and checked against its rules.
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
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;   // a trainee session is never an admin one
// The practice areas a trainee works cases in (the lessons they practice).
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
  // "no profiles saved" is an answer too: caching only a non-empty list made every redraw ask again, and every
  // answer redraw again — dozens of requests a second on the Practice Lab while settings:firms was empty
  if(F.loading || (!force && F.at && Date.now() - F.at < 5 * 60000)) return F.loading;
  F.at = Date.now();
  F.loading = sharedGet("settings:firms").then(v => { F.firms = v && Array.isArray(v.firms) && v.firms.length ? v.firms : null; })
    .catch(() => {}).then(() => { F.loading = null; rerender(); });
  return F.loading;
}
const firms = () => F.firms || DEFAULT_FIRMS;
const firmById = id => firms().find(f => f.id === id) || null;

function rerender(){ if(["firm", "simulators", "session"].includes(state.view) || (state.view === "admin" && state.adminTab === "firms")) render(); }
// Every trainee works for the same firm, and gets it the moment they arrive: the first profile.

// Every trainee works for the first firm profile, on its caseload, in the order the profile lists it:
// nothing is handed out per trainee.
function myFirm(){ loadFirms(); if(!isTrainee()) return null; return firms()[0] || null; }
function myCases(){ const f = myFirm(); return f ? (f.cases || []).map(caseById).filter(Boolean) : []; }
const caseHref = (c, program) => CMS + "?" + new URLSearchParams({program:program || "cm", mock:c.id, from:"standard"});

window.FTFirms = {AREAS, RULE_AREAS, GCAL, firms, firmById, myFirm, myCases, caseById, caseHref, loadFirms,
  defaults: DEFAULT_FIRMS};

/* ---------- 🏛 My Firm (#/firm) ---------- */
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["firm"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {firm:"Client Profile"});
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
  if(adminOn()) return `<div class="card ff-card"><h1>🏛 My Firm</h1><p>Every trainee works for the first saved firm profile, on its caseload — its profile and its rules are what they see here.</p></div>`;
  const f = myFirm();
  if(!f) return `<div class="card ff-card"><h1>🏛 My Firm</h1><p>No firm profile is set up yet. A trainer adds one in Admin → 🏛 Law Firms, and it reaches every trainee at once.</p></div>`;
  const ack = window.FTSessions && FTSessions.ack();
  const acked = ack && ack.firm === f.id;
  return `<div class="ff-hero"><p class="lp-eyebrow">📁 Client Profile · My Firm</p><h1>🏛 ${e(f.name)}</h1>
      <p>You work for this firm during your training: every Practice Session is on its cases and checked against its rules. Learn its rules before your sessions.</p></div>
    <div class="card ff-card">${firmFacts(f)}</div>
    <div class="card ff-card"><h2>📏 The firm’s rules</h2>${rulesHtml(f)}
      <div class="ff-ack">${acked ? `<span class="ff-ok">✓ You confirmed you read these rules on ${e(new Date(ack.at).toLocaleDateString())}.</span>`
        : `<button class="btn btn-navy" onclick="FTSessions.acknowledge('${e(f.id)}')">✓ I’ve read and understood my firm’s rules</button>`}</div></div>
    <div class="card ff-card"><h2>🗂 Your cases</h2>
      <p class="ff-muted">Your Practice Sessions open on your firm’s own cases${f.cases && f.cases.length ? ` (${e(f.cases.join(", "))})` : ""} in the CMS.</p></div>`;
}
const __render = window.render;
window.render = function(){
  if(state.view !== "firm") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
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

/* ---------- Admin → 🏛 Law Firms: the profiles ---------- */
const FA = {loaded:false, loading:false, edit:null};
// Nothing per-trainee is read here any more — the screen is the firm profiles alone — so this loads
// those and nothing else. Forced, so an admin always sees what is saved rather than a cached list.
async function loadAdmin(){
  FA.loading = true;
  try{ await loadFirms(true); }catch(err){}
  FA.loaded = true; FA.loading = false; rerender();
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
function renderAdminFirms(){
  if(!FA.loaded){ if(!FA.loading) loadAdmin(); return `<div class="card" style="padding:24px;">Loading the firm profiles…</div>`; }
  const fs = firms();
  return `<div class="card ff-admin"><h3>🏛 Law Firm Profiles</h3>
      <p class="ff-muted">Every trainee works for the first firm in this list, automatically. Its rules are what their Practice Sessions are checked against. ${F.firms ? "" : "These are the starting profiles: saving any firm saves them all."}</p>
      <div class="ff-firms">${fs.map(f => `<div class="ff-firm"><b>${e(f.name)}</b><span>${e(f.location)} · ${e(f.tz)} · ${(f.cases || []).length} cases in its caseload${fs[0] && f.id === fs[0].id ? " · every trainee works here" : ""}</span>
        <span class="ff-acts"><button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.edit('${e(f.id)}')">✏️ Edit</button>${fs.length > 1 ? `<button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.remove('${e(f.id)}')">🗑</button>` : ""}</span></div>`).join("")}</div>
      <div class="ff-acts"><button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.edit('')">➕ New firm</button>${F.firms ? `<button class="btn btn-ghost btn-sm" onclick="FTFirmsAdmin.restore()">↺ Restore the starting profiles</button>` : ""}</div></div>
    ${FA.edit ? firmForm(FA.edit) : ""}
    <div class="card ff-admin"><h3>👥 Who works here</h3>
      <p class="ff-muted">Nobody assigns a firm any more: every trainee works for the first profile above from the moment they arrive, and its rules are what their Practice Sessions are checked against. Their sessions open on that firm's caseload, in the order listed in its profile.</p></div>`;
}
async function saveFirms(list){
  const ok = await sharedSet("settings:firms", {v:1, firms:list, updatedAt:new Date().toISOString()});
  if(ok === false){ toast("Couldn’t save the firms. Check your connection."); return false; }
  F.firms = list; F.at = Date.now(); return true;
}
window.FTFirmsAdmin = {
  refresh(){ FA.loaded = false; render(); },
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
    const first = firms()[0] && firms()[0].id === id;
    if(!confirm(`Delete ${f.name}?${first ? " Every trainee works for it, so the next profile in the list takes over." : ""}`)) return;
    if(await saveFirms(firms().filter(x => x.id !== id))) toast("Firm deleted.");
    render();
  },
  async restore(){
    if(!confirm("Replace the saved firm profiles with the three starting ones? Your edits to them are lost.")) return;
    if(await saveFirms(JSON.parse(JSON.stringify(DEFAULT_FIRMS)))) toast("The starting profiles are back.");
    render();
  },
};
// (no 🏛 Law Firms admin tab: taken off the Admin screen. The saved profiles in settings:firms are what My Firm shows.)
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
