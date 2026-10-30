/* ============================================================
   📋 INTAKE TRAINING: what the Day 7–9 slides hold besides text
     • .ftis-calls    Day 7 (Part 1), the reference slide: four more sample intake calls (a work-premises accident,
                      a demanding slip-and-fall client, an agitated dog-bite 1P caller, a medical-malpractice caller
                      worried about fees), each a recording with what to listen for and its transcript, every line's
                      [m:ss] a button that plays the recording from there.
     • .ftis-consult  Day 9 (Part 3) and 🎧 the Transcription Activity: the PI equivalent sample guide, Atty.
                      Magdalena's consultation with a new client, as a recording, its A / C transcript (A for
                      Attorney, C for Client) and the sample minutes made from it.
     • .ftis-packet   Day 8 (Part 2), Topic 2: Your Assigned Packet, the one the trainer assigned in Admin → 📦 Intake
                      Packets, with its download, its client, the name to rename it to and the trainee's own folder;
       .ftis-sheet    the Intake Documents Worksheet as the trainee's own editable copy in their Google Drive;
       .ftis-docs     the 14 additional intake documents, each shown in the slide and bigger on a click;
       .ftis-forms    the sample intake forms, the same way (for reference: the Prototype CMS holds the form).
     • .ftis-mockcall Days 8–9, the Intake Mock Call: the case the trainer assigned the trainee (Admin → 📦 Intake Packets),
                      one of the CMS's Intake Mock Calls, which Ring Channel plays too, so the trainer's call and the
                      trainee's CMS are on the same case; a trainer sees every case with where to pick it on Ring Channel
                      and the caller's script.
       .ftis-mcase    on the trainer's Intake Mock Calls scoring sheet (js/ft-sessions.js FTMetrics): the picked
                      trainee's case, which 💾 Save keeps with the score.
   The recordings and transcripts are js/ft-intake-samples.js (build/audio/make_audio.py, from
   build/audio/intake_samples.json): fictional people and cases, written for training. It loads the first time a
   slide asks for it, not with the page.
   ============================================================ */
(function(){
"use strict";
const e = v => (typeof esc === "function" ? esc : x => String(x).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]))(String(v == null ? "" : v));
const V = (function(){ const s = document.currentScript; const m = s && /\?v=([^&]+)/.exec(s.src); return m ? "?v=" + m[1] : ""; })();
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const firstName = () => String((typeof state === "object" && (state.certName || state.traineeName)) || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";

/* ---------- the data, loaded once, when a slide needs it ---------- */
let loading = null;
function data(){
  if(window.FT_INTAKE_SAMPLES) return Promise.resolve(window.FT_INTAKE_SAMPLES);
  if(loading) return loading;
  loading = new Promise((ok, no) => { const s = document.createElement("script"); s.src = "/js/ft-intake-samples.js" + V;
    s.onload = () => ok(window.FT_INTAKE_SAMPLES); s.onerror = () => { loading = null; s.remove(); no(new Error("load")); }; document.head.appendChild(s); });
  return loading;
}

/* ---------- a recording with its transcript ---------- */
function transcript(item, who){
  return `<details class="ftis-tx"><summary>📝 Transcript</summary><ol class="ftis-lines">${item.lines.map(([w, x, t]) => `<li>
    <button type="button" class="ftis-at" data-t="${t}" title="Play from here">[${mmss(t)}]</button><b class="ftis-who ftis-${w === who[0] ? "a" : "b"}">${e(w)}:</b> <span>${e(x)}</span></li>`).join("")}</ol></details>`;
}
function player(item){
  return `<audio class="ftis-audio" controls preload="none" src="${e(item.src)}"></audio><small class="ftis-dur">${mmss(item.dur)}</small>`;
}
// (data-calls="1,2": only those calls, numbered as in the full set: Day 7 shows them two to a slide)
function callsHtml(d, el){
  const only = String((el && el.getAttribute("data-calls")) || "").split(",").map(Number).filter(Boolean);
  return d.calls.map((c, i) => only.length && !only.includes(i + 1) ? "" : `<article class="ftis-call">
    <header><span class="ftis-n">${i + 1}</span><div><b>${e(c.title)}</b><small>${e(c.kind)} · ${e(d.firm)} (fictional)</small></div></header>
    <p class="ftis-about">${e(c.about)}</p>
    <div class="ftis-play">${player(c)}</div>
    <p class="ftis-lf-h">Listen for</p><ul class="ftis-lf">${c.listen_for.map(x => `<li>${e(x)}</li>`).join("")}</ul>
    ${transcript(c, ["VA"])}</article>`).join("");
}
function consultHtml(d){
  const k = d.consult, m = k.minutes, nl = x => e(x).replace(/\n/g, "<br>");
  const row = (l, v) => `<tr><th>${e(l)}</th><td>${nl(v)}</td></tr>`;
  return `<article class="ftis-call ftis-consult-c">
    <header><span class="ftis-n">📘</span><div><b>${e(k.title)}</b><small>A = Atty. Magdalena (Attorney) · C = Daniel Reyes (Client) · fictional</small></div></header>
    <p class="ftis-about">${e(k.about)}</p>
    <div class="ftis-play">${player(k)}</div>
    ${transcript(k, ["A"])}
    <details class="ftis-tx"><summary>📄 Sample minutes made from this consultation</summary>
      <div class="ftis-min"><p class="ftis-min-h">MINUTES OF THE MEETING</p>
      <table>${row("Date", m.date)}${row("Time", m.time)}${row("Attendees", m.attendees)}${row("Purpose", m.purpose)}</table>
      <h5>Discussion</h5><p>${nl(m.discussion)}</p><h5>The client’s concerns and questions</h5><p>${nl(m.concerns)}</p>
      <h5>The attorney’s advice and answers</h5><p>${nl(m.advice)}</p><h5>Action items and next steps</h5><p>${nl(m.actions)}</p></div></details>
    ${typeof goto === "function" && window.FTTranscribe && !document.querySelector("main.main-tr") ? `<div class="ftis-go"><button type="button" class="btn btn-navy btn-sm" onclick="goto('transcribe')">🎧 Open the Transcription Activity →</button></div>` : ""}
  </article>`;
}

/* ---------- Day 8: the trainee's assigned Intake Packet, the worksheet, the additional documents, the sample forms ----------
   The trainer keeps the packets and the additional documents' links, and assigns each trainee a packet, in Admin →
   📦 Intake Packets: settings:intake {packets: {<n>: {client, url}}, docs: [<url>, …], folder} (everyone reads it) and
   intakeassign:<traineeId> {packet, at} (the trainee reads it, only admins write it). The slide shows the trainee
   their own packet as soon as it is assigned, with its download and their own Assessments/Activities folder
   (📁 My Drive links, drive:<id>.folder) to save it in. */
const PFOLDER = "https://drive.google.com/drive/folders/1JbAieyhJ6XVsRvNXMUUtVfRwY_0KNymT?usp=sharing";   // the Redacted Intake Packets
const DFOLDER = "https://drive.google.com/drive/folders/1fC8iixgMEVV3cDrtU0sFa0N325uVB4mb?usp=drive_link"; // the Additional Intake Documents
const NPACK = 10;
const DOCS = ["Client Communication Disclosure", "Signature Certificate", "CM Notes", "Police Report", "TAR/Traffic Accident Report",
  "TAR/Traffic Accident Report with Labels", "Traffic Ticket (accomplished)", "Traffic Ticket with Labels.1", "Traffic Ticket with Labels.2",
  "DMV", "ISO Claim Search", "Insurance vs Lien Disclaimer (newly added)", "Affidavit of Communication (newly added)",
  "Notice and Waiver of Potential Conflict of Interest (latest version of Conflict of Interest Waiver)"];
const driveId = u => (/\/(?:file|document|spreadsheets|presentation)\/d\/([\w-]{10,})/.exec(String(u || "")) || /[?&]id=([\w-]{10,})/.exec(String(u || "")) || [])[1] || "";
const isDocs = u => /docs\.google\.com\/document\//.test(String(u || ""));
// a Drive file's download, a Google Doc's own copy in the trainee's Drive
const downloadUrl = u => { const id = driveId(u); return !id ? String(u || "") : isDocs(u) ? `https://docs.google.com/document/d/${id}/export?format=docx` : `https://drive.google.com/uc?export=download&id=${id}`; };
const copyUrl = u => { const id = driveId(u); return id && isDocs(u) ? `https://docs.google.com/document/d/${id}/copy` : ""; };
const embed = u => (typeof window.lvEmbedUrl === "function" && window.lvEmbedUrl(u)) || "";
const isTrainee = () => typeof state === "object" && !!state.traineeId && !state.isAdmin && !state.adminPreview;
const K = {set: null, mine: null, folder: "", id: null, at: 0, loading: null};
function loadK(force){
  if(K.loading) return K.loading;
  const id = isTrainee() ? state.traineeId : null;
  if(!force && K.set && K.id === id && Date.now() - K.at < 120000) return Promise.resolve();
  K.loading = Promise.all([sharedGet("settings:intake"), id ? sharedGet("intakeassign:" + id) : null, id ? sharedGet("drive:" + id) : null])
    .then(([v, a, d]) => { K.set = v && typeof v === "object" ? v : {}; K.mine = a && typeof a === "object" ? a : null;
      K.folder = d && typeof d === "object" && /^https:\/\//.test(String(d.folder || "")) ? String(d.folder) : ""; K.id = id; K.at = Date.now(); })
    .catch(() => { if(!K.set) K.set = {}; })
    .then(() => { K.loading = null; paint(); });
  return K.loading;
}
const packets = () => (K.set && K.set.packets) || {};

/* ---------- Days 8–9: the Intake Mock Call's case, shared by the CMS and Ring Channel ----------
   The calls are the CMS's own (its call-packs.js, the Call Simulator's 📋 Intake Mock Calls line), read from the CMS
   itself so they are never a copy that drifts: Ring Channel mirrors the same file (lshringchannel src/cms/call-packs.js),
   so the call a trainer plays from Ring Channel's Scenario Picker is the call, the caller and the case the trainee works
   in the CMS. The trainer assigns each trainee a call in Admin → 📦 Intake Packets: intakeassign:<id>.call, kept beside
   the packet in the same trainer-owned record (both writes keep the other's field). */
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
const LINE = "Intake Mock Calls";
const SIM = "https://cm-training-activity.pages.dev/simulators/call.html?" + new URLSearchParams({program: "FT", line: LINE});
let packsLoading = null;
function packs(){
  if(window.CALL_PACKS && window.CALL_PACKS.CALLS) return Promise.resolve(window.CALL_PACKS);
  if(packsLoading) return packsLoading;
  PK.failed = false;
  packsLoading = new Promise((ok, no) => { const sc = document.createElement("script"); sc.src = CMS + "call-packs.js";
    sc.onload = () => window.CALL_PACKS && window.CALL_PACKS.CALLS ? ok(window.CALL_PACKS) : no(new Error("packs"));
    sc.onerror = () => { packsLoading = null; sc.remove(); no(new Error("load")); }; document.head.appendChild(sc); })
    .then(P => { paint(); return P; }, err => { packsLoading = null; PK.failed = true; paint(); throw err; });
  return packsLoading;
}
const PK = {failed: false};
const mockCalls = () => window.CALL_PACKS && window.CALL_PACKS.CALLS ? window.CALL_PACKS.CALLS.filter(c => c.program === "FT" && c.line === LINE && c.dir !== "out") : null;
const callById = id => (mockCalls() || []).find(c => c.id === id) || null;
// a call back about a file already in the CMS (the case is open in front of the trainee); a first call starts a blank intake
const onFile = c => !!c.doc && /calling back|callback|retainer|\(MC-/i.test(c.you + " " + c.role);
const cmsUrl = c => CMS + "?" + new URLSearchParams(Object.assign({program: "intake", from: "standard"}, c && onFile(c) ? {mock: c.doc} : {}));
const caseDoc = c => c && c.doc && window.CALL_PACKS.DOCS && window.CALL_PACKS.DOCS[c.doc] ? window.CALL_PACKS.DOCS[c.doc] : null;
const isTrainerView = () => typeof state === "object" && !!state.isAdmin && !state.adminPreview;
// (the trainer's views read the assignments again once they are a minute old: another trainer or tab may have changed one)
const freshAdmin = () => { if(!AD.loading && (!AD.rows || Date.now() - (AD.at || 0) > 60000)) loadAdmin(); return !!AD.rows; };
const linkBtn = (href, label, cls = "btn-ghost") => `<a class="btn ${cls} btn-sm" href="${e(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
// the trainee's case: who calls, what they know going in, and where to work it (never the caller's script or the goals)
function caseCard(c){
  return `<div class="ftis-mc-card"><div class="ftis-mc-top"><b>${e(c.title)}</b><span class="ftis-mc-lv">${e(c.level || "")}</span></div>
    <p class="ftis-mc-who">📞 ${e(c.name)} · ${e(c.role)}</p>
    <p class="ftis-mc-facts">${e(c.facts || "")}</p>
    <p class="ftis-mc-do">${onFile(c) ? `The caller’s case is on file: <b>${e((caseDoc(c) || {}).title || c.doc)}</b> opens in the Prototype CMS. Verify the caller first, then work the call from the file.`
      : "Nothing is on file yet: open a blank intake in the Prototype CMS and enter what you gather straight into its fields as the caller talks."}</p>
    <div class="ftis-mc-act">${linkBtn(cmsUrl(c), "🗂 Open the Prototype CMS ↗", "btn-navy")}${linkBtn(SIM, "☎ Practise the Intake line ↗")}</div></div>`;
}
// the trainer's view of a case: where to pick it on Ring Channel, the caller's opening, script and goals, the CMS file
function trainerCase(c, who){
  const doc = caseDoc(c);
  return `<details class="ftis-mc-t"><summary><b>${e(c.title)}</b> · ${e(c.name)} <span class="ftis-mc-lv">${e(c.level || "")}</span>${who ? ` <span class="ftis-mc-n">${e(who)}</span>` : ""}</summary>
    <p class="ftis-mc-ring">☎ <b>On Ring Channel:</b> 🎭 Call to play (Scenario Picker) → Standard Training → Intake → <b>${e(c.title)}</b> → ☎ Play on the Console.</p>
    <p><b>Opening line:</b> “${e(c.opening || "")}”</p>
    <p><b>The caller’s script:</b> ${e(c.hidden || "")}</p>
    ${(c.goals || []).length ? `<p><b>What the call is graded on:</b></p><ul>${c.goals.map(g => `<li>${e(g)}</li>`).join("")}</ul>` : ""}
    ${doc ? `<p><b>The CMS case file (${e(c.doc)}):</b> ${e(doc.text)}</p>` : ""}
    <div class="ftis-mc-act">${linkBtn(cmsUrl(c), "🗂 The trainee’s CMS view ↗")}</div></details>`;
}
function mockcallHtml(el){
  const calls = mockCalls();
  const trainer = isTrainerView();
  const head = `<div class="ftis-pk-h"><b>📞 ${trainer ? "Intake Mock Call cases: the CMS’s Intake line, the same calls on Ring Channel" : "Your Intake Mock Call case"}</b></div>`;
  if(!calls){ if(!PK.failed) packs().catch(() => {}); return head + `<p class="ftis-wait">${PK.failed ? "The cases didn’t load from the CMS. Check your connection and open this slide again." : "Loading the cases from the CMS…"}</p>`; }
  if(trainer){
    freshAdmin();
    // every batch's trainees on their case (a batch's name beside each when more than one batch has cases assigned)
    const by = {}, rows = AD.rows || [], tagged = rows.filter(r => ((AD.recs || {})[r.id] || {}).call);
    const several = new Set(tagged.map(r => r.batch)).size > 1;
    tagged.forEach(r => { const c = AD.recs[r.id].call; (by[c] = by[c] || []).push(r.name.split(/\s+/)[0] + (several && r.batch ? ` (${r.batch})` : "")); });
    return head + `<p class="ftis-pk-note">Play the trainee’s assigned case from Ring Channel while they work it in the Prototype CMS. Each trainee sees their case on this slide once it is assigned.</p>
      ${calls.map(c => trainerCase(c, (by[c.id] || []).join(", "))).join("")}
      <div class="ftis-mc-act"><button type="button" class="btn btn-ghost btn-sm" onclick="state.adminTab = 'intake'; goto('admin')">📞 Assign the cases</button></div>`;
  }
  const c = isTrainee() && K.mine && K.mine.call ? callById(K.mine.call) : null;
  if(isTrainerView() && !trainer) return head + `<div class="ftis-pk-ph"><span class="ftis-pk-ph-ic">📞</span><div><b>The trainee’s mock call case appears here</b><small>Each trainee sees only their own case: who calls, what they know going in and the Prototype CMS. Never the caller’s script.</small></div></div>`;
  if(!c) return head + `<div class="ftis-pk-ph"><span class="ftis-pk-ph-ic">📞</span><div><b>Your mock call case appears here</b><small>Your trainer assigns it before your turn. Until then, practise on the Intake line.</small></div>${linkBtn(SIM, "☎ Practise the Intake line ↗")}</div>`;
  return head + caseCard(c);
}
// the trainer's scoring sheet: the picked trainee's case
function mcaseHtml(el){
  const id = el.getAttribute("data-trainee") || "", calls = mockCalls();
  if(!calls){ if(!PK.failed) packs().catch(() => {}); return ""; }
  if(!freshAdmin()) return "";
  const c = callById(((AD.recs || {})[id] || {}).call);
  return c ? trainerCase(c, "") : `<p class="ftis-pk-note">📞 No mock call case assigned to this trainee yet: <a href="#" onclick="state.adminTab = 'intake'; goto('admin'); return false;">assign one in 📦 Intake Packets</a>.</p>`;
}
const btn = (href, label, cls = "btn-ghost") => `<a class="btn ${cls} btn-sm" href="${e(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
// (a button, not a viewer link: the deck draws a link in a slide as a tile)
const viewBtn = (u, t, label) => `<button type="button" class="btn btn-ghost btn-sm" data-url="${e(u)}" data-title="${e(t)}" onclick="FTIntake.view(this)">${label}</button>`;
const folderBtn = () => K.folder ? btn(K.folder, "📁 My Assessments/Activities folder ↗")
  : window.FTDrive ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTDrive.linkMine()">📁 Link my Assessments/Activities folder</button>` : "";
function packetHtml(){
  if(!K.set) return `<p class="ftis-wait">Loading your assigned packet…</p>`;
  const head = `<div class="ftis-pk-h"><b>📦 Your Assigned Packet</b></div>`;
  // (until the trainer assigns one, a placeholder where the packet will be; a trainer sees the same, with where to assign it)
  const ph = `<div class="ftis-pk-ph"><span class="ftis-pk-ph-ic">📦</span><div><b>Your assigned Intake Packet appears here</b><small>Your trainer assigns it during the session.</small></div>${isTrainee() ? ""
    : `<button type="button" class="btn btn-ghost btn-sm" onclick="state.adminTab = 'intake'; goto('admin')">📦 Assign packets</button>`}</div>`;
  if(!isTrainee()) return head + ph;
  const n = K.mine && Number(K.mine.packet);
  if(!n) return head + ph;
  const pk = packets()[n] || {}, who = firstName() || "VA’s Name", name = `INTAKE - Packet (${who})`;
  return head + `<div class="ftis-pk-card"><div class="ftis-pk-n">${n}</div><div><b>Intake Packet ${n}</b>${pk.client ? `<small>Client: <b>${e(pk.client)}</b> · name your subfolder after them</small>` : ""}</div></div>
    <div class="ftis-pk-act">${pk.url ? btn(downloadUrl(pk.url), "⬇ Download my packet", "btn-navy") + viewBtn(pk.url, `Intake Packet ${n}`, "👁 View it") : `<span class="ftis-pk-note">Your trainer is adding this packet’s link.</span>`}${folderBtn()}</div>
    <p class="ftis-pk-rn">Rename it: <code class="ftis-name">${e(name)}</code> ${firstName() ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTIntake.copy(this)" data-copy="${e(name)}">📋 Copy</button>` : ""}</p>`;
}
// 📝 the worksheet: the trainee's own editable copy, made in their Google Drive
function sheetHtml(el){
  const u = el.getAttribute("data-href") || "", copy = copyUrl(u);
  // (the trainer sees the trainee's folder button too, inactive: each trainee links their own folder)
  const folder = isTrainee() ? folderBtn() : `<button type="button" class="btn btn-ghost btn-sm" disabled title="Each trainee links their own folder here">📁 Link my Assessments/Activities folder</button>`;
  return `<div class="ftis-sh-act">${copy ? btn(copy, "✏️ Make my editable copy", "btn-navy") : ""}${viewBtn(u, "Intake Documents Worksheet", "👁 View the worksheet")}${folder}</div>
    <p class="ftis-pk-note">“Make my editable copy” saves your own copy of the worksheet in your Google Drive: answer it there, then move it into your Assessments/Activities folder.</p>`;
}
// 📄 the additional intake documents, each in the slide: a click shows it bigger in the viewer
function docsHtml(el){
  if(!K.set) return `<p class="ftis-wait">Loading the documents…</p>`;
  const links = (K.set.docs || []), folder = el.getAttribute("data-folder") || DFOLDER;
  // (the slide's line about them is drawn with them, so it never stands on a page of its own)
  return `<p class="ftis-docs-lead">Here are additional intake documents for your future reference. Kindly check these ADDITIONAL intake documents which are NOT INCLUDED in the training video. Click a document to see it bigger.</p>
    <div class="ftis-docs-g">${DOCS.map((t, i) => { const u = String(links[i] || "").trim(), src = u && embed(u);
    return `<a class="viewer-link ftis-doc" data-kind="doc" data-title="${e(i + 1 + ". " + t)}" href="${e(u || folder)}">
      <span class="ftis-doc-pic">${src ? `<iframe loading="lazy" tabindex="-1" aria-hidden="true" src="${e(src)}"></iframe>` : `<span class="ftis-doc-ic">📄</span>`}<span class="ftis-doc-zoom">🔍 View bigger</span></span>
      <span class="ftis-doc-t"><span class="ftis-doc-n">${i + 1}</span>${e(t)}</span></a>`; }).join("")}</div>`;
}
// 📋 the sample intake forms: shown in the slide for reference, bigger on a click
function formsHtml(el){
  const u = el.getAttribute("data-href") || "", t = el.getAttribute("data-title") || "Sample Intake Forms", src = embed(u);
  return `<a class="viewer-link ftis-form" data-noopen data-kind="doc" data-title="${e(t)}" href="${e(u)}"><span class="ftis-form-h"><b>📋 ${e(t)}</b><small>🔍 Click to view bigger</small></span>
    <span class="ftis-form-pic">${src ? `<iframe loading="lazy" tabindex="-1" aria-hidden="true" src="${e(src)}"></iframe>` : ""}</span></a>`;
}
const PAINT = {".ftis-packet": packetHtml, ".ftis-sheet": sheetHtml, ".ftis-docs": docsHtml, ".ftis-forms": formsHtml, ".ftis-mockcall": mockcallHtml, ".ftis-mcase": mcaseHtml};
function paint(){
  let any = false;
  Object.keys(PAINT).forEach(sel => document.querySelectorAll(sel).forEach(el => { if(el.closest("#ftseBody")) return;
    // (an open case stays open when it is drawn again)
    const open = [...el.querySelectorAll("details[open] > summary b")].map(b => b.textContent);
    el.setAttribute("data-on", "1"); el.innerHTML = PAINT[sel](el); any = true;
    el.querySelectorAll("details > summary b").forEach(b => { if(open.includes(b.textContent)) b.closest("details").open = true; }); }));
  if(any) refit();
}

/* ---------- 🧑‍🏫 Admin → 📦 Intake Packets ---------- */
const AD = {rows: null, assign: {}, recs: {}, loading: false, batch: ""};
async function loadAdmin(){
  AD.loading = true;
  try{
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const keys = people.map(r => "intakeassign:" + r.id), vals = [];
    for(let i = 0; i < keys.length; i += 99) vals.push(...await sharedGetMany(keys.slice(i, i + 99)));
    AD.rows = people.map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || ""})).sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    AD.assign = {}; AD.recs = {}; people.forEach((r, i) => { const v = vals[i] && typeof vals[i] === "object" ? vals[i] : null; if(v) AD.recs[r.id] = v; if(v && v.packet) AD.assign[r.id] = Number(v.packet); });
    if(!AD.batch){ const bs = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(); AD.batch = bs[bs.length - 1] || ""; }
    AD.at = Date.now();
  }catch(err){ AD.rows = AD.rows || []; AD.at = Date.now(); }
  AD.loading = false; if(state.view === "admin" && state.adminTab === "intake") render(); else paint();
}
function adminHtml(){
  if(!AD.rows || !K.set){ if(!AD.loading) loadAdmin(); loadK(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const pk = packets(), docs = K.set.docs || [], calls = mockCalls();
  if(!calls && !PK.failed) packs().then(() => { if(state.view === "admin" && state.adminTab === "intake") render(); }, () => { if(state.view === "admin" && state.adminTab === "intake") render(); });
  const callOpt = id => `<option value="">Not assigned</option>${(calls || []).map(c => `<option value="${e(c.id)}" ${c.id === (((AD.recs[id] || {}).call) || "") ? "selected" : ""}>${e(c.title)} · ${e(c.name)}</option>`).join("")}`;
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(), rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch);
  const opt = (n, cur) => `<option value="${n}" ${n === cur ? "selected" : ""}>${n ? `Packet ${n}${pk[n] && pk[n].client ? " · " + e(pk[n].client) : ""}` : "Not assigned"}</option>`;
  return `<div class="card ftis-admin"><div class="ff-bar"><div><h3>📦 Intake Packets</h3><p class="fss-muted">Day 8’s Topic 2: assign each trainee a packet and they see it on their slide as <b>Your Assigned Packet</b>, with its download. Download the packets from the <a href="${e(K.set.folder || PFOLDER)}" target="_blank" rel="noopener">Redacted Intake Packets folder ↗</a>, rename each with its trainee’s name if you share them that way, and paste each packet’s link below.</p></div>
      <span><select onchange="FTIntakeAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></span></div>
    <h4>Assign the packets and the mock call cases</h4>
    <p class="fss-muted">📞 <b>Mock call case</b>: the trainee’s Intake Mock Call (Days 8–9), one of the CMS’s Intake Mock Calls, which Ring Channel plays too. The trainee sees their case on the mock call slides and works it in the Prototype CMS; you play the same call from Ring Channel’s Scenario Picker.${calls ? "" : PK.failed ? " <b>The cases didn’t load from the CMS: reload to try again.</b>" : " Loading the cases from the CMS…"}</p>
    ${rows.length ? `<div class="ff-scroll"><table class="ff-tbl"><thead><tr><th>Trainee</th><th>Packet</th><th>Mock call case</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><b>${e(r.name)}</b><span class="fss-muted"> ${e(r.batch)}</span></td>
        <td><select onchange="FTIntakeAdmin.assign('${e(r.id)}', this.value)">${[0, ...Array.from({length: NPACK}, (_, i) => i + 1)].map(n => opt(n, AD.assign[r.id] || 0)).join("")}</select></td>
        <td><select ${calls ? "" : "disabled"} onchange="FTIntakeAdmin.assignCall('${e(r.id)}', this.value)">${callOpt(r.id)}</select></td></tr>`).join("")}
    </tbody></table></div>` : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}
    <h4>The packets</h4><p class="fss-muted">Each packet’s client (the trainee names their subfolder after them) and its Drive link. Share each file “Anyone with the link can view” so trainees can download it.</p>
    <div class="ftis-aedit">${Array.from({length: NPACK}, (_, i) => i + 1).map(n => `<b>Packet ${n}</b><input id="ftisC${n}" placeholder="Client’s name" value="${e((pk[n] || {}).client || "")}"><input id="ftisU${n}" placeholder="https://drive.google.com/file/d/…" value="${e((pk[n] || {}).url || "")}">`).join("")}</div>
    <h4>The additional intake documents</h4><p class="fss-muted">Each document’s own Drive link from the <a href="${e(DFOLDER)}" target="_blank" rel="noopener">Additional Intake Documents folder ↗</a>: the slide shows it in place and bigger on a click. A document with no link opens the folder.</p>
    <div class="ftis-aedit ftis-aedit-d">${DOCS.map((t, i) => `<b>${i + 1}. ${e(t)}</b><input id="ftisD${i}" placeholder="https://drive.google.com/file/d/…" value="${e(docs[i] || "")}">`).join("")}</div>
    <div class="ftis-asave"><button class="btn btn-navy btn-sm" onclick="FTIntakeAdmin.save()">💾 Save the packets and documents</button></div></div>`;
}
// a write to a trainee's intakeassign record: one at a time per trainee, each on the record as saved now (read again first),
// so the packet and the mock call case never overwrite each other, whoever changed the other one and however quickly
const chain = {};
function writeAssign(id, patch){
  const run = (chain[id] || Promise.resolve()).catch(() => {}).then(async () => {
    const saved = await sharedGet("intakeassign:" + id).catch(() => null);
    const next = Object.assign({}, saved && typeof saved === "object" ? saved : (AD.recs[id] || {}), patch);
    if(await sharedSet("intakeassign:" + id, next) === false) throw new Error("save");
    AD.recs[id] = next; AD.assign[id] = Number(next.packet) || 0; if(!AD.assign[id]) delete AD.assign[id];
    return next;
  });
  chain[id] = run;
  return run;
}
window.FTIntakeAdmin = {
  batch(b){ AD.batch = b; render(); },
  async assign(id, v){
    const n = Number(v) || 0;
    // (the record also holds the trainee's mock call case: the packet's write keeps it)
    try{ await writeAssign(id, {packet: n, at: new Date().toISOString()}); }catch(err){ toast("Couldn’t save. Check your connection."); return; }
    toast(n ? `✓ Packet ${n} assigned — the trainee sees it within two minutes.` : "✓ Unassigned.");
  },
  async assignCall(id, v){
    const c = callById(v);
    try{ await writeAssign(id, {call: c ? c.id : "", callAt: new Date().toISOString()}); }catch(err){ toast("Couldn’t save. Check your connection."); return; }
    paint();
    toast(c ? `✓ ${c.title} assigned — play it from Ring Channel’s Scenario Picker; the trainee sees it within two minutes.` : "✓ Mock call case unassigned.");
  },
  async save(){
    // read the form first: loading the saved settings re-renders the page and the form with it
    const v = id => String((document.getElementById(id) || {}).value || "").trim();
    const pk = {}; for(let n = 1; n <= NPACK; n++){ const c = v("ftisC" + n), u = v("ftisU" + n); if(c || u) pk[n] = {client: c, url: u}; }
    const docs = DOCS.map((_, i) => v("ftisD" + i));
    const bad = [...Object.values(pk).map(x => x.url), ...docs].filter(u => u && !/^https:\/\//.test(u));
    if(bad.length){ toast("A link must start with https://"); return; }
    await loadK(true);
    const next = Object.assign({}, K.set, {packets: pk, docs, updatedAt: new Date().toISOString()});
    const ok = await sharedSet("settings:intake", next);
    if(ok === false){ toast("Couldn’t save. Check your connection."); return; }
    K.set = next; K.at = Date.now(); toast("✓ Saved — trainees see it within two minutes."); render();
  }
};
if(typeof window.ftAdminTab === "function") ftAdminTab("intake", "📦 Intake Packets", adminHtml);

/* ---------- filling the slides ---------- */
// the deck re-measures its pages without going back to page 1; any other page gets a resize
function refit(){ try{ if(window.FTDayDecks && FTDayDecks.refit) FTDayDecks.refit(); else window.dispatchEvent(new Event("resize")); }catch(err){} }
function fill(){
  // (Day 8: the assigned packet, the worksheet, the additional documents and the sample forms, drawn again once the trainer's settings load)
  const fresh = [...document.querySelectorAll(Object.keys(PAINT).map(x => x + ":not([data-on])").join(", "))].filter(el => !el.closest("#ftseBody"));
  if(fresh.length){
    // (a mock call slot opened again after the CMS's cases failed to load tries once more)
    if(PK.failed && fresh.some(el => el.matches(".ftis-mockcall, .ftis-mcase"))) PK.failed = false;
    paint(); loadK();
  }
  const want = [...document.querySelectorAll(".ftis-calls:not([data-on]), .ftis-consult:not([data-on])")].filter(el => !el.closest("#ftseBody"));
  if(!want.length) return;
  want.forEach(el => { el.setAttribute("data-on", "1"); el.innerHTML = `<p class="ftis-wait">Loading the recordings…</p>`; });
  data().then(d => {
    want.forEach(el => { el.innerHTML = el.classList.contains("ftis-calls") ? callsHtml(d, el) : consultHtml(d); });
    refit();
  }).catch(() => want.forEach(el => { el.innerHTML = `<p class="ftis-wait">The recordings didn’t load. Check your connection and open this slide again.</p>`; }));
}
let queued = false;
new MutationObserver(() => { if(queued) return; queued = true; requestAnimationFrame(() => { queued = false; fill(); }); })
  .observe(document.documentElement, {childList: true, subtree: true});

// a transcript line's [m:ss] plays its recording from there; one recording plays at a time
document.addEventListener("click", ev => {
  const b = ev.target.closest && ev.target.closest(".ftis-at"); if(!b) return;
  const a = b.closest(".ftis-call") && b.closest(".ftis-call").querySelector("audio"); if(!a) return;
  a.currentTime = Number(b.getAttribute("data-t")) || 0; a.play().catch(() => {});
});
document.addEventListener("play", ev => { if(!ev.target.classList || !ev.target.classList.contains("ftis-audio")) return;
  document.querySelectorAll("audio.ftis-audio").forEach(a => { if(a !== ev.target) a.pause(); }); }, true);

window.FTIntake = {
  data,
  // the trainee's assigned mock call (its CMS call id), for the trainer's scoring sheet to keep with the score
  // (read fresh from the saved record; undefined when it can't be known: the cases didn't load, or the read failed)
  async callOf(id){
    if(!mockCalls()) await packs().catch(() => {});
    if(!mockCalls()) return undefined;
    let rec; try{ rec = await sharedGet("intakeassign:" + id); }catch(err){ return undefined; }
    const c = callById((rec || {}).call); return c ? {id: c.id, title: c.title} : null;
  },
  reload: () => loadK(true),
  view(b){ if(typeof lvOpen === "function") lvOpen({kind: "doc", title: b.getAttribute("data-title"), url: b.getAttribute("data-url")}); },
  copy(b){ const t = b.getAttribute("data-copy"); try{ navigator.clipboard.writeText(t); b.textContent = "✓ Copied"; setTimeout(() => { b.textContent = "📋 Copy"; }, 1500); }catch(err){} }
};

(function(){ const s = document.createElement("style"); s.id = "ft-intake"; s.textContent = `
.ftis-calls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:8px 0;}
.ftis-consult{margin:8px 0;}
.ftis-call{background:#fff;border:1px solid #DCE0EA;border-left:5px solid #DB8437;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;color:#1B1E2E;}
.ftis-call header{display:flex;align-items:center;gap:10px;}
.ftis-call header b{display:block;color:#262B45;font-size:15.5px;} .ftis-call header small{color:#5B6178;font-size:12.5px;}
.ftis-n{flex:0 0 auto;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#262B45;color:#fff;font-weight:800;font-size:14px;}
.ftis-about{margin:0;font-size:14px;line-height:1.5;}
.ftis-play{display:flex;align-items:center;gap:8px;} .ftis-audio{width:100%;height:36px;} .ftis-dur{color:#5B6178;font:600 12px 'IBM Plex Mono',ui-monospace,monospace;}
.ftis-lf-h{margin:2px 0 0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#B5651F;}
.ftis-lf{margin:0;padding-left:18px;font-size:13.5px;line-height:1.45;}
.ftis-tx summary{cursor:pointer;font-weight:700;color:#262B45;font-size:14px;padding:4px 0;}
.ftis-lines{list-style:none;margin:6px 0 0;padding:8px 10px;max-height:300px;overflow:auto;background:#F6F7FB;border-radius:8px;font-size:13.5px;line-height:1.5;}
.ftis-lines li{margin:0 0 6px;}
.ftis-at{border:0;background:#EAF1FF;color:#262B45;border-radius:6px;padding:0 5px;margin-right:6px;font:600 12px 'IBM Plex Mono',ui-monospace,monospace;cursor:pointer;}
.ftis-at:hover{background:#DB8437;color:#fff;}
.ftis-who{margin-right:2px;} .ftis-who.ftis-a{color:#B5651F;} .ftis-who.ftis-b{color:#262B45;}
.ftis-min{background:#fff;border:1px solid #DCE0EA;border-radius:8px;padding:12px 16px;margin-top:6px;font-size:13.5px;line-height:1.5;}
.ftis-min-h{margin:0 0 8px;text-align:center;font:800 15px 'Poppins','Inter',sans-serif;color:#262B45;letter-spacing:.04em;}
.ftis-min table{width:100%;border-collapse:collapse;} .ftis-min th, .ftis-min td{border:1px solid #CBD2DF;padding:5px 8px;text-align:left;vertical-align:top;}
.ftis-min th{width:26%;background:#F2F2F2;} .ftis-min h5{margin:10px 0 2px;color:#262B45;font-size:13.5px;} .ftis-min p{margin:0;}
.ftis-go{display:flex;justify-content:flex-end;}
.ftis-wait{color:#5B6178;font-size:13.5px;}
.ftis-packet{background:#FFF8EF;border:2px dashed #DB8437;border-radius:12px;padding:12px 16px;margin:6px 0 10px;color:#1B1E2E;}
.ftis-pk-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;} .ftis-pk-h b{color:#262B45;font-size:15px;}
.ftis-pk-h label{font-weight:700;font-size:14px;} .ftis-pk-h select{font:600 14px 'Inter',sans-serif;padding:4px 8px;border-radius:8px;border:1px solid #CBD2DF;margin-left:4px;}
.ftis-pk-steps{margin:8px 0 4px;padding-left:20px;font-size:14px;line-height:1.55;} .ftis-pk-steps li{margin-bottom:4px;}
.ftis-name{background:#262B45;color:#fff;border-radius:6px;padding:2px 8px;font-size:13px;}
.ftis-pk-note{margin:0;font-size:12.5px;color:#5B6178;}
.ftis-pk-ph{display:flex;align-items:center;gap:14px;margin:6px 0 2px;padding:14px 16px;border:2px dashed #C9CFE6;border-radius:12px;background:#F6F7FB;}
.ftis-pk-ph-ic{font-size:30px;line-height:1;opacity:.75;}
.ftis-pk-ph > div{flex:1;display:flex;flex-direction:column;gap:2px;}
.ftis-pk-ph b{color:#1E2340;font-size:16px;} .ftis-pk-ph small{color:#5B6178;font-size:13.5px;}
.ftdd-step-t .ftis-packet{padding:8px 12px;margin:8px 0 2px;border-style:solid;border-width:1px;border-left-width:5px;}
.ftis-pk-card{display:flex;align-items:center;gap:12px;margin:4px 0;} .ftis-pk-card > div > b{display:block;color:#262B45;font-size:15px;} .ftis-pk-card small{display:block;color:#5B6178;font-size:13px;} .ftis-pk-card small b{color:#262B45;}
.ftis-pk-n{flex:0 0 auto;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#262B45;color:#fff;font-weight:800;font-size:17px;}
.ftis-pk-act,.ftis-sh-act{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;} .ftis-pk-rn{margin:6px 0;font-size:14px;}
.ftis-sheet{margin:8px 0 2px;}
.ftis-docs-lead{margin:0 0 6px;} .ftis-docs-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin:8px 0;}
.ftis-doc{display:flex;flex-direction:column;background:#fff;border:1px solid #DCE0EA;border-radius:12px;overflow:hidden;text-decoration:none;color:#1B1E2E;transition:box-shadow .15s,transform .15s;}
.ftis-doc:hover{box-shadow:0 8px 22px -10px rgba(38,43,69,.45);transform:translateY(-2px);}
.ftis-doc-pic{position:relative;display:block;height:120px;background:#F6F7FB;overflow:hidden;}
.ftis-doc-pic iframe{width:100%;height:100%;border:0;pointer-events:none;}
.ftis-doc-ic{display:grid;place-items:center;height:100%;font-size:42px;}
.ftis-doc-zoom{position:absolute;right:6px;bottom:6px;background:rgba(38,43,69,.88);color:#fff;font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 9px;}
.ftis-doc-t{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;font-size:13px;font-weight:600;line-height:1.35;}
.ftis-doc-n{flex:0 0 auto;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#DB8437;color:#fff;font-size:11.5px;font-weight:800;}
.ftis-form{display:block;background:#fff;border:1px solid #DCE0EA;border-left:5px solid #DB8437;border-radius:12px;overflow:hidden;text-decoration:none;color:#1B1E2E;margin:8px 0;}
.ftis-form-h{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;} .ftis-form-h b{color:#262B45;font-size:15px;} .ftis-form-h small{color:#B5651F;font-weight:700;}
.ftis-form-pic{display:block;height:max(150px, calc(var(--ftdd-room, 70vh) - 280px));background:#F6F7FB;} .ftis-form-pic iframe{width:100%;height:100%;border:0;pointer-events:none;}
.ftis-admin h4{margin:16px 0 6px;color:#262B45;}
.ftis-mockcall{background:#FFF8EF;border:2px dashed #DB8437;border-radius:12px;padding:12px 16px;margin:8px 0 10px;color:#1B1E2E;text-align:left;}
.ftbf .ftis-mockcall{margin:12px auto;max-width:720px;}
.ftis-mc-card{background:#fff;border:1px solid #DCE0EA;border-left:5px solid #262B45;border-radius:12px;padding:10px 14px;margin:6px 0 2px;}
.ftis-mc-top{display:flex;justify-content:space-between;align-items:center;gap:10px;} .ftis-mc-top b{color:#262B45;font-size:16px;}
.ftis-mc-lv{display:inline-block;background:#EAF1FF;color:#262B45;border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:700;}
.ftis-mc-n{display:inline-block;background:#DB8437;color:#fff;border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:700;}
.ftis-mc-who{margin:4px 0;font-weight:700;color:#262B45;font-size:14px;} .ftis-mc-facts,.ftis-mc-do{margin:4px 0;font-size:14px;line-height:1.5;}
.ftis-mc-act{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 2px;}
.ftis-mc-t{background:#fff;border:1px solid #DCE0EA;border-left:5px solid #262B45;border-radius:10px;padding:6px 12px;margin:6px 0;font-size:13.5px;line-height:1.5;}
.ftis-mc-t summary{cursor:pointer;color:#262B45;font-size:14.5px;padding:2px 0;} .ftis-mc-t p{margin:6px 0;} .ftis-mc-t ul{margin:2px 0 6px;padding-left:20px;}
.ftis-mc-ring{background:#F6F7FB;border-radius:8px;padding:6px 10px;}
.ftms .ftis-mcase{margin:6px 0;}
.ftis-aedit{display:grid;grid-template-columns:auto 1fr 2fr;gap:6px 10px;align-items:center;} .ftis-aedit-d{grid-template-columns:minmax(0,1.2fr) 2fr;}
.ftis-aedit input{box-sizing:border-box;width:100%;font:inherit;padding:6px 9px;border:1px solid var(--line,#d6d9e0);border-radius:8px;}
.ftis-aedit b{font-size:13px;color:var(--ink-soft,#5B6178);} .ftis-asave{margin-top:12px;}
@media(max-width:800px){.ftis-aedit,.ftis-aedit-d{grid-template-columns:1fr;}}
@media(max-width:800px){.ftis-calls{grid-template-columns:minmax(0,1fr);}}
`; document.head.appendChild(s); })();
})();
