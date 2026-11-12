/* ============================================================
   📋 INTAKE TRAINING: what the Day 7–9 slides hold besides text
     • .ftis-calls    Day 7 (Part 1), the reference slide: four more sample intake calls (a work-premises accident,
                      a demanding slip-and-fall client, an agitated dog-bite 1P caller, a medical-malpractice caller
                      worried about fees), each a recording with what to listen for and its transcript, every line's
                      [m:ss] a button that plays the recording from there.
     • .ftis-consult  Day 9 (Part 3, its Sample Transcription Guide slide): the PI equivalent sample guide, Atty.
                      Magdalena's consultation with a new client, as a recording, its A / C transcript (A for
                      Attorney, C for Client) and the sample minutes made from it.
     • .ftis-packet   Day 8 (Part 2), Topic 2: Your Assigned Packet, the one the trainer assigned in Admin → 📦 Intake
                      Packets, with its download, its client, the name to rename it to and the trainee's own folder;
       .ftis-sheet    the Intake Documents Worksheet as the trainee's own editable copy in their Google Drive;
       .ftis-docs     the 14 additional intake documents, each shown in the slide and bigger on a click;
       .ftis-forms    the sample intake forms, the same way (for reference: the Prototype CMS holds the form).
     • .ftis-mockcall Day 8, the Intake Demo (Saving Intake Packet and Extracted Intake Documents to SA): the case that came with
                      the trainee's packet (Admin → 📦 Intake Packets),
                      one of the CMS's Intake Mock Calls, which Ring Channel plays too, so the trainer's call and the
                      trainee's CMS are on the same case; a trainer sees every case with where to pick it on Ring Channel
                      and the caller's script.
       .ftis-mcase    on the trainer's Day 8 demo scoring sheet (intake-packet-demo, js/ft-sessions.js FTMetrics): the picked
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
    <div class="ftis-play">${player(k)}</div>
    ${transcript(k, ["A"])}
    <details class="ftis-tx"><summary>📄 Sample minutes made from this consultation</summary>
      <div class="ftis-min"><p class="ftis-min-h">MINUTES OF THE MEETING</p>
      <table>${row("Date", m.date)}${row("Time", m.time)}${row("Attendees", m.attendees)}${row("Purpose", m.purpose)}</table>
      <h5>Discussion</h5><p>${nl(m.discussion)}</p><h5>The client’s concerns and questions</h5><p>${nl(m.concerns)}</p>
      <h5>The attorney’s advice and answers</h5><p>${nl(m.advice)}</p><h5>Action items and next steps</h5><p>${nl(m.actions)}</p></div></details>
    ${typeof goto === "function" && window.FTTranscribe && !document.querySelector("main.main-tr") ? `<div class="ftis-go"><button type="button" class="btn btn-navy btn-sm" onclick="FTTranscribe.fromDeck()">🎧 Open the Transcription Activity →</button></div>` : ""}
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
const NPACK = 20;   // Intake Packets 1–20 (their clients and Drive links are set in Admin → 📦 Intake Packets)
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
const K = {set: null, mine: null, folder: "", sub: null, id: null, at: 0, loading: null, docs: [], edit: false};
// the trainee's completed Intake Worksheet, its link submitted on the slide (actsub:<id>.items.intakews: {answer: the link, submittedAt})
const WS = "intakews";
function loadK(force){
  if(K.loading) return K.loading;
  const id = isTrainee() ? state.traineeId : null;
  if(!force && K.set && K.id === id && Date.now() - K.at < 120000) return Promise.resolve();
  K.loading = Promise.all([sharedGet("settings:intake"), id ? sharedGet("intakeassign:" + id) : null, id ? sharedGet("drive:" + id) : null, id ? sharedGet("actsub:" + id) : null, id ? sharedGet("intakecheck:" + id) : null])
    .then(([v, a, d, w, ck]) => { K.check = ck && typeof ck === "object" && Array.isArray(ck.rules) ? ck : null; K.sub = w && w.items && w.items[WS] && w.items[WS].answer ? w.items[WS] : null; K.set = v && typeof v === "object" ? v : {}; K.mine = a && typeof a === "object" ? a : null;
      K.folder = d && typeof d === "object" && /^https:\/\//.test(String(d.folder || "")) ? String(d.folder) : ""; K.id = id; K.at = Date.now();
      // (the trainee's own links to the additional intake documents: drive:<id>.intakeDocs, theirs to write)
      K.docs = d && Array.isArray(d.intakeDocs) ? d.intakeDocs.map(x => String(x || "")) : [];
      K.packetLink = d && /^https:\/\//.test(String(d.intakePacket || "")) ? String(d.intakePacket) : "";
      // (📦 the client subfolder the corrected packet and its extracted documents are in: drive:<id>.intakeFolder)
      K.packetFolder = d && /^https:\/\//.test(String(d.intakeFolder || "")) ? String(d.intakeFolder) : ""; })
    .catch(() => { if(!K.set) K.set = {}; })
    .then(() => { K.loading = null; paint(); });
  return K.loading;
}
const packets = () => (K.set && K.set.packets) || {};

/* ---------- Day 8: the Intake Demo's case, shared by the CMS and Ring Channel ----------
   The calls are the CMS's own (its call-packs.js, the Call Simulator's 📋 Intake Mock Calls line), read from the CMS
   itself so they are never a copy that drifts: Ring Channel mirrors the same file (lshringchannel src/cms/call-packs.js),
   so the call a trainer plays from Ring Channel's Scenario Picker is the call, the caller and the case the trainee works
   in the CMS. The trainer assigns each trainee a call in Admin → 📦 Intake Packets by assigning the packet only: the case pairs with
   it (pairedCall), intakeassign:<id>.call, kept beside the packet in the same trainer-owned record (both writes keep the other's field). */
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
// 🎬 the packet's demo case, paired automatically (the packet is the trainer's only pick): the intake call whose caller is
// the packet's client (a first call before a call back), otherwise packet n's is the CMS's n-th Intake Mock Call (round the list)
function pairedCall(n){
  const calls = mockCalls(); n = Number(n) || 0; if(!n || !calls || !calls.length) return null;
  const client = String((packets()[n] || {}).client || "").trim().toLowerCase(), named = client ? calls.filter(c => String(c.name || "").trim().toLowerCase() === client) : [];
  return named.find(c => !onFile(c)) || named[0] || calls[(n - 1) % calls.length];
}
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
    <div class="ftis-mc-act">${linkBtn(cmsUrl(c), "🗂 Open the Prototype CMS ↗", "btn-navy")}${linkBtn(SIM, "☎ Practice the Intake line ↗")}</div></div>`;
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
  // (🎬 never drawn: the Day 8 demo is trainer-facilitated, so a trainee's own demo case box only confused them — it is off the
  // deck too, build/day-decks.cjs; kept for a deck saved before, which then shows nothing)
  if(el) return "";
  const calls = mockCalls();
  const trainer = isTrainerView();
  // (no list of every case for the trainer on the slide: cases are assigned with the packets in Admin → 📦 Intake; the box hides)
  if(trainer) return "";
  const head = `<div class="ftis-pk-h"><b>🎬 Your Intake Demo case</b></div>`;
  if(!calls){ if(!PK.failed) packs().catch(() => {}); return head + `<p class="ftis-wait">${PK.failed ? "The cases didn’t load from the CMS. Check your connection and open this slide again." : "Loading the cases from the CMS…"}</p>`; }
  const c = isTrainee() && K.mine && K.mine.call ? callById(K.mine.call) : null;
  if(!c) return head + `<div class="ftis-pk-ph"><span class="ftis-pk-ph-ic">📞</span><div><b>Your demo case appears here</b><small>It comes with the packet your trainer assigns you, before the demo. Until then, practice on the Intake line.</small></div>${linkBtn(SIM, "☎ Practice the Intake line ↗")}</div>`;
  return head + caseCard(c);
}
// the trainer's scoring sheet: the picked trainee's case
function mcaseHtml(el){
  const id = el.getAttribute("data-trainee") || "", calls = mockCalls();
  if(!calls){ if(!PK.failed) packs().catch(() => {}); return ""; }
  if(!freshAdmin()) return "";
  const c = callById(((AD.recs || {})[id] || {}).call);
  // (no case yet: nothing over the scoresheet — the case comes with the trainee's packet, 📦 Intake Packets)
  return c ? trainerCase(c, "") : "";
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
  const pk = packets()[n] || {}, who = firstName() || "VA’s Name", name = `INTAKE - Packet (${who})`, client = clientOf(n);
  // ⬇ the packet: its own file when the trainer saved one before, else the Redacted Intake Packets folder (Packet n in it)
  const dl = pk.url ? btn(downloadUrl(pk.url), "⬇ Download my packet", "btn-navy") + viewBtn(pk.url, `Intake Packet ${n}`, "👁 View it")
    : btn(K.set.folder || PFOLDER, `⬇ Download Packet ${n} from the packets folder ↗`, "btn-navy");
  return head + `<div class="ftis-pk-card"><div class="ftis-pk-n">${n}</div><div><b>Intake Packet ${n}</b>${client ? `<small>Client: <b>${e(client)}</b> · name your subfolder after them</small>` : ""}</div></div>
    <div class="ftis-pk-act">${dl}${folderBtn()}</div>
    <ol class="ftis-pk-steps">
      <li><b>Download</b> your packet and work on your own copy.</li>
      <li><b>Rename</b> it <code class="ftis-name">${e(name)}</code> ${firstName() ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTIntake.copy(this)" data-copy="${e(name)}">📋 Copy</button>` : ""}</li>
      <li><b>Extract</b> every document in it, each named under the naming convention: <code>INTAKE - Police Report (${e(who)})</code>.</li>
      <li><b>Upload</b> the renamed packet with its documents into a subfolder of your Assessments/Activities folder named after ${client ? `<b>${e(client)}</b>` : "your client"} (the Intake Worksheet stays outside it).</li>
      <li><b>Link</b> both below, then <b>🔎 Check my packet</b>: it’s checked for accuracy and completeness, and your trainer sees the result.</li></ol>
    <div class="ftis-pk-link"><b>🔗 Your corrected packet</b> <small>Open it in your Drive, copy its link (…/file/d/…).</small>
      <div class="ftis-ws-row"><input type="url" id="ftisPkLink" placeholder="https://drive.google.com/file/d/…" value="${e(K.packetLink || "")}" aria-label="The Drive link of your corrected packet"></div>
      <b>📁 Your client subfolder</b> <small>The folder with the packet and its extracted documents (…/drive/folders/…).</small>
      <div class="ftis-ws-row"><input type="url" id="ftisPkFolder" placeholder="https://drive.google.com/drive/folders/…" value="${e(K.packetFolder || "")}" aria-label="The Drive link of your client subfolder">
      <button type="button" class="btn btn-navy btn-sm" onclick="FTIntake.savePacketLink(this)">💾 ${K.packetLink ? "Save again" : "Save"}</button>
      ${K.packetLink ? `<button type="button" class="btn btn-ghost btn-sm" ${K.checking ? "disabled" : ""} onclick="FTIntake.checkPacket(this)">${K.checking ? "Checking… (about a minute)" : "🔎 Check my packet"}</button>` : ""}</div>
      ${K.packetLink ? `<p class="ftis-ws-ok">✓ Linked: <a href="${e(K.packetLink)}" target="_blank" rel="noopener noreferrer">your packet ↗</a>${K.packetFolder ? ` · <a href="${e(K.packetFolder)}" target="_blank" rel="noopener noreferrer">your subfolder ↗</a>` : ""}</p>` : ""}</div>
    ${checkHtml(K.check)}`;
}
// 📦 the assigned client: the packet's (saved by the trainer), else the caller of the demo case paired with it
function clientOf(n){
  const pk = packets()[n] || {}; if(pk.client) return pk.client; if((K.mine || {}).client) return K.mine.client;
  if(!mockCalls() && !PK.failed) packs().catch(() => {});
  const c = callById((K.mine || {}).call) || (mockCalls() ? pairedCall(n) : null); return c && c.name ? c.name : "";
}
// 🔎 the packet's check (worker.js checkIntakePacket, intakecheck:<id>): each point met or not, and the feedback
function checkHtml(ck, mini){
  if(!ck) return "";
  const tone = ck.pct >= 100 ? "ok" : ck.pct >= 70 ? "mid" : "bad";
  return `<div class="ftis-ck${mini ? " ftis-ck-mini" : ""}"><div class="ftis-ck-h"><span class="ftis-ck-pct ftis-${tone}">${ck.pct}%</span><b>Accuracy &amp; completeness</b>
      <small>checked ${e(new Date(ck.at).toLocaleString([], {dateStyle: "medium", timeStyle: "short"}))}${ck.docsRead && Array.isArray(ck.docs) ? ` · ${ck.docs.length} document${ck.docs.length === 1 ? "" : "s"} found in the packet` : " · the packet’s pages couldn’t be read"}</small></div>
    <ul>${ck.rules.map(r => `<li class="${r.pass === null ? "pend" : r.pass ? "ok" : "miss"}">${r.pass === null ? "⏳" : r.pass ? "✓" : "✗"} <b>${e(r.label)}</b>${r.detail ? ` <span>${e(r.detail)}</span>` : ""}</li>`).join("")}</ul>
    ${ck.feedback ? `<p class="ftis-ck-fb">🧑‍🏫 ${e(ck.feedback)}</p>` : ""}</div>`;
}
// 📝 the worksheet: the trainee's own editable copy, made in their Google Drive
function sheetHtml(el){
  const u = el.getAttribute("data-href") || "", copy = copyUrl(u);
  // (the trainer sees the trainee's folder button too, inactive: each trainee links their own folder)
  const folder = isTrainee() ? folderBtn() : `<button type="button" class="btn btn-ghost btn-sm" disabled title="Each trainee links their own folder here">📁 Link my Assessments/Activities folder</button>`;
  return `<div class="ftis-sh-act">${copy ? btn(copy, "✏️ Make my editable copy", "btn-navy") : ""}${folder}</div>
    <p class="ftis-pk-note">“Make my editable copy” saves your own copy of the worksheet in your Google Drive: answer it there, then move it into your Assessments/Activities folder.</p>`;
}
// 📤 the completed worksheet's link: the trainee copies it from Google Drive into the box and submits it (actsub:<id>, which
// the trainee writes and worker.js merges); the trainer sees each trainee's link in Admin → 📦 Intake Packets
const wsLink = u => /^https:\/\/(docs|drive)\.google\.com\//.test(String(u || "").trim());
function wsubHtml(){
  const when = K.sub && K.sub.submittedAt ? new Date(K.sub.submittedAt).toLocaleString([], {dateStyle: "medium", timeStyle: "short"}) : "";
  const head = `<p class="ftis-ws-h">📤 Copy the link of your completed Intake Worksheet here, then submit</p>`;
  if(!isTrainee()) return head + `<div class="ftis-ws-row"><input type="url" disabled placeholder="https://docs.google.com/document/d/…"><button type="button" class="btn btn-navy btn-sm" disabled>📤 Submit</button></div>
    <p class="ftis-pk-note">Each trainee submits their own link: you see them in Admin → 📦 Intake Packets.</p>`;
  return head + `<div class="ftis-ws-row"><input type="url" id="ftisWs" placeholder="https://docs.google.com/document/d/…" value="${e(K.sub ? K.sub.answer : "")}" aria-label="The link of your completed Intake Worksheet">
    <button type="button" class="btn btn-navy btn-sm" onclick="FTIntake.submitSheet(this)">📤 ${K.sub ? "Submit again" : "Submit"}</button></div>
    ${K.sub ? `<p class="ftis-ws-ok">✓ Submitted ${e(when)}: <a href="${e(K.sub.answer)}" target="_blank" rel="noopener noreferrer">your worksheet ↗</a></p>`
      : `<p class="ftis-pk-note">In Google Drive: Share → General access “Anyone with the link” → Copy link, then paste it here.</p>`}`;
}
// 📄 the additional intake documents, each in the slide: a click shows it bigger in the viewer. Each trainee enters each
// document's own Drive link from the Additional Intake Documents folder (✏️ My document links, saved in drive:<id>.intakeDocs);
// a document with no link of theirs takes the trainer's (Admin → 📦 Intake Packets), and with neither, opens the folder
function docsHtml(el){
  if(!K.set) return `<p class="ftis-wait">Loading the documents…</p>`;
  const links = (K.set.docs || []), folder = el.getAttribute("data-folder") || DFOLDER, own = isTrainee() ? K.docs : [];
  // (the slide's line about them is drawn with them, so it never stands on a page of its own; each card is the document's
  // preview over its name, bigger on a click)
  const n = DOCS.filter((t, i) => String(own[i] || "").trim()).length;
  return `<p class="ftis-docs-lead">Additional Intake Documents for your reference.${isTrainee() ? ` <button type="button" class="btn btn-ghost btn-sm" onclick="FTIntake.docsEdit()">✏️ My document links (${n} of ${DOCS.length})</button>` : ""}</p>
    ${isTrainee() && K.edit ? `<div class="ftis-dedit"><p class="ftis-pk-note">Open the <a href="${e(folder)}" target="_blank" rel="noopener">Additional Intake Documents folder ↗</a>, open each document and copy its link from the address bar. A document with no link opens the folder.</p>
      ${DOCS.map((t, i) => `<label><b>${i + 1}. ${e(t)}</b><input type="url" data-doc="${i}" placeholder="https://drive.google.com/file/d/…" value="${e(own[i] || "")}"></label>`).join("")}
      <div class="ftis-asave"><button type="button" class="btn btn-navy btn-sm" onclick="FTIntake.docsSave(this)">💾 Save my document links</button> <button type="button" class="btn btn-ghost btn-sm" onclick="FTIntake.docsEdit()">Close</button></div></div>` : ""}
    ${docViewHtml(own, links, folder)}`;
}
// 📄 the documents one at a time, in the platform: the list of them beside the one open, embedded, with ← / → to step through.
// Each shows the trainee's own link, else the trainer's, else the platform's own copy (LOCAL_DOCS); one with none of these
// says so and offers the folder.
const LOCAL_DOCS = {13: "ft/day7/forms/conflict-waiver.html"};
function docViewHtml(own, links, folder){
  const n = DOCS.length, i = Math.max(0, Math.min(n - 1, Number(K.di) || 0)), t = DOCS[i];
  const urlOf = j => String(own[j] || "").trim() || String(links[j] || "").trim();
  const u = urlOf(i), src = u ? embed(u) : LOCAL_DOCS[i] || "";
  const pane = src ? `<iframe class="ftis-dv-f" title="${e(t)}" src="${e(src)}" allow="fullscreen"></iframe>`
    : `<div class="ftis-dv-none"><span>📄</span><p><b>${e(t)}</b> isn't linked in the platform yet.</p><p>${isTrainee() ? "Add its link under ✏️ My document links, or open" : "A trainer adds its link in Admin → 📦 Intake Packets. Until then, open"} the <a href="${e(folder)}" target="_blank" rel="noopener">Additional Intake Documents folder ↗</a>.</p></div>`;
  return `<div class="ftis-dv"><ol class="ftis-dv-l">${DOCS.map((x, j) => `<li><button type="button" class="${j === i ? "is-on" : ""}${urlOf(j) || LOCAL_DOCS[j] ? "" : " is-none"}" onclick="FTIntake.docGo(${j})"${j === i ? ' aria-current="true"' : ""}>${e(x)}</button></li>`).join("")}</ol>
    <div class="ftis-dv-main"><div class="ftis-dv-bar"><button type="button" class="btn btn-ghost btn-sm" onclick="FTIntake.docGo(${i - 1})"${i ? "" : " disabled"}>← Previous</button>
      <b>${i + 1} of ${n} · ${e(t)}</b>
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTIntake.docGo(${i + 1})"${i < n - 1 ? "" : " disabled"}>Next →</button></div>${pane}</div></div>`;
}
// 📋 the sample intake forms: shown in the slide for reference, bigger on a click
function formsHtml(el){
  const u = el.getAttribute("data-href") || "", t = el.getAttribute("data-title") || "Sample Intake Forms", src = embed(u);
  return `<a class="viewer-link ftis-form" data-noopen data-kind="doc" data-title="${e(t)}" href="${e(u)}"><span class="ftis-form-h"><b>📋 ${e(t)}</b><small>🔍 Click to view bigger</small></span>
    <span class="ftis-form-pic">${src ? `<iframe loading="lazy" tabindex="-1" aria-hidden="true" src="${e(src)}"></iframe>` : ""}</span></a>`;
}
const PAINT = {".ftis-packet": packetHtml, ".ftis-sheet": sheetHtml, ".ftis-wsub": wsubHtml, ".ftis-docs": docsHtml, ".ftis-forms": formsHtml, ".ftis-mockcall": mockcallHtml, ".ftis-mcase": mcaseHtml};
function paint(){
  let any = false;
  Object.keys(PAINT).forEach(sel => document.querySelectorAll(sel).forEach(el => { 
    // (an open case stays open when it is drawn again)
    const open = [...el.querySelectorAll("details[open] > summary b")].map(b => b.textContent);
    el.setAttribute("data-on", "1"); el.innerHTML = PAINT[sel](el); any = true;
    el.querySelectorAll("details > summary b").forEach(b => { if(open.includes(b.textContent)) b.closest("details").open = true; }); }));
  if(any) refit();
}

/* ---------- 🧑‍🏫 Admin → 📦 Intake Packets: assigning the packets, and nothing else ----------
   The page is for assigning: each trainee's packet (its demo case pairs with it, pairedCall) and each packet's client and
   Drive link. What the trainee then does with it (their packet and subfolder links, 🔎 the accuracy & completeness check, the
   demo case and the Intake Worksheet) is on their page of 📋 Batch Sheet, with their 🏅 Score Card (FTIntake.cardHtml). */
const AD = {rows: null, assign: {}, recs: {}, loading: false, batch: "", paired: {}};
async function loadAdmin(){
  AD.loading = true;
  try{
    const people = await ftActiveRoster();
    const vals = await sharedGetMany(people.map(r => "intakeassign:" + r.id));
    AD.rows = people.map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || ""})).sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    AD.assign = {}; AD.recs = {}; people.forEach((r, i) => { const v = vals[i] && typeof vals[i] === "object" ? vals[i] : null; if(v) AD.recs[r.id] = v; if(v && v.packet) AD.assign[r.id] = Number(v.packet); });
    if(!AD.batch) AD.batch = ftLatestBatch(AD.rows);
    AD.at = Date.now();
  }catch(err){ AD.rows = AD.rows || []; AD.at = Date.now(); }
  AD.loading = false; if(state.view === "admin" && state.adminTab === "intake") render(); else paint();
}
const onIntake = () => state.view === "admin" && state.adminTab === "intake";
function adminHtml(){
  // (the roster and the packets' settings load apart, each drawing the page once when it comes: loading the roster again
  // while the settings were still on their way drew the page again at once, over and over, and the page froze)
  if(!AD.rows || !K.set){
    if(!AD.rows && !AD.loading) loadAdmin();
    if(!K.set && !AD.kWait){ AD.kWait = true; loadK().then(() => { AD.kWait = false; if(onIntake()) render(); }); }
    return `<div class="card" style="padding:24px;">Loading…</div>`;
  }
  const pk = packets(), calls = mockCalls();
  if(!calls && !PK.failed && !AD.pkWait){ AD.pkWait = true; packs().then(() => { if(onIntake()) render(); }, () => { if(onIntake()) render(); }); }
  // (the case is read only: it follows the packet, FTIntakeAdmin.assign; a packet assigned before the pairing gets its case here, once)
  // (an assignment made before the client was kept with it gets its case's client, once)
  if(calls) AD.rows.forEach(r => { const v = AD.recs[r.id] || {}, c = v.call && !v.client && !AD.paired[r.id] ? callById(v.call) : null; if(c && c.name){ AD.paired[r.id] = 1; writeAssign(r.id, {client: String(c.name)}).catch(() => {}); } });
  if(calls) AD.rows.forEach(r => { const v = AD.recs[r.id] || {}; if(v.packet && !v.call && !AD.paired[r.id]){ AD.paired[r.id] = 1; const c = pairedCall(v.packet); if(c) writeAssign(r.id, {call: c.id, callAt: new Date().toISOString(), client: String(c.name || "")}).catch(() => {}); } });
  const batches = [...new Set(AD.rows.map(r => r.batch).filter(Boolean))].sort(), rows = AD.rows.filter(r => !AD.batch || r.batch === AD.batch);
  const opt = (n, cur) => `<option value="${n}" ${n === cur ? "selected" : ""}>${n ? `Packet ${n}${pk[n] && pk[n].client ? " · " + e(pk[n].client) : ""}` : "Not assigned"}</option>`;
  const set = Object.keys(pk).filter(n => pk[n] && (pk[n].client || pk[n].url)).length, given = rows.filter(r => AD.assign[r.id]).length;
  // (fits on one screen: the trainees side by side in three columns, and the packets' clients and links in three columns)
  return `<div class="card ftis-admin"><div class="ff-bar"><div><h3>📦 Intake Packets</h3><p class="fss-muted">Each trainee sees their packet on Day 8’s slide (<b>Your Assigned Packet</b>) with its 🎬 demo case, from the <a href="${e(K.set.folder || PFOLDER)}" target="_blank" rel="noopener">packets folder ↗</a>. Their work on it: their <a href="#" onclick="state.adminTab = 'batchsheet'; render(); return false;">📋 Batch Sheet</a> page.</p></div>
      <span><select onchange="FTIntakeAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AD.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select></span></div>
    <h4>Assign the packets <small class="ftis-count">${given} of ${rows.length} assigned</small></h4>
    ${rows.length ? `<div class="ftis-assign">${rows.map(r => `<div class="ftis-acell"><b title="${e(r.name)}${r.batch ? " · " + e(r.batch) : ""}">${e(r.name)}${AD.batch ? "" : `<span class="fss-muted"> ${e(r.batch)}</span>`}</b>
        <select aria-label="Packet for ${e(r.name)}" onchange="FTIntakeAdmin.assign('${e(r.id)}', this.value)">${[0, ...Array.from({length: NPACK}, (_, i) => i + 1)].map(n => opt(n, AD.assign[r.id] || 0)).join("")}</select></div>`).join("")}</div>`
      : `<p class="fss-muted">No approved trainees${AD.batch ? " in this batch" : ""}.</p>`}
    <div class="ftis-phead"><h4>The packets <small class="ftis-count">${set} of ${NPACK} set</small></h4><p class="fss-muted">Each packet’s client (the trainee names their subfolder after them) and its Drive link, shared “Anyone with the link can view”.</p>
      <button class="btn btn-navy btn-sm" onclick="FTIntakeAdmin.save()">💾 Save the packets</button></div>
    <div class="ftis-aedit">${Array.from({length: NPACK}, (_, i) => i + 1).map(n => `<div class="ftis-prow"><b>${n}</b><input id="ftisC${n}" aria-label="Packet ${n}: client’s name" placeholder="Client’s name" value="${e((pk[n] || {}).client || "")}"><input id="ftisU${n}" aria-label="Packet ${n}: Drive link" placeholder="https://drive.google.com/file/d/…" value="${e((pk[n] || {}).url || "")}"></div>`).join("")}</div></div>`;
}
/* 📦 A trainee's Intake Packet on their page of 📋 Batch Sheet (js/ft-batch-sheet.js perTraineeHtml), with their 🏅 Score
   Card: the packet assigned, their packet and subfolder links, 🔎 the accuracy & completeness check (with 🔎 Check), the
   🎬 demo case and the 📝 Intake Worksheet. Rows of the trainee's table (Measure · Score / value · How it was worked out).
   Read for that trainee alone, kept a minute; the page is drawn once more when it comes. */
const TC = {};
// (drawn again only where the card is: 📋 Batch Sheet; a load finishing on another tab doesn't redraw that tab)
const onSheet = () => state.view === "admin" && state.adminTab === "batchsheet";
function loadCard(id){
  const x = TC[id] = TC[id] || {};
  if(x.loading || (x.at && Date.now() - x.at < 60000)) return;
  x.loading = true;
  Promise.all(["intakeassign:", "drive:", "intakecheck:", "actsub:"].map(k => sharedGet(k + id).catch(() => null)))
    .then(([a, d, ck, w]) => { x.a = a && typeof a === "object" ? a : null; x.d = d && typeof d === "object" ? d : null;
      x.ck = ck && typeof ck === "object" && Array.isArray(ck.rules) ? ck : null; x.ws = w && w.items && w.items[WS] && w.items[WS].answer ? w.items[WS] : null; })
    .catch(() => {})
    .then(() => { x.loading = false; x.at = Date.now(); if(onSheet()) render(); });
}
function cardHtml(id){
  if(!id || !(state.isAdmin && !state.adminPreview)) return "";
  loadCard(id);
  if(!K.set && !TC.kWait){ TC.kWait = true; loadK().then(() => { TC.kWait = false; if(onSheet()) render(); }); }
  // (the CMS's cases: drawn again whether they come or not — not coming says so — and asked for again once that is reset)
  if(!mockCalls() && !PK.failed && !TC.pkWait){ TC.pkWait = true; const done = () => { TC.pkWait = false; if(onSheet()) render(); }; packs().then(done, done); }
  const x = TC[id] || {}, head = `<tr class="bs-pt-sec"><th colspan="3">📦 Intake Packet (Day 8)</th></tr>`;
  if(!x.at) return head + `<tr><td colspan="3" class="bs-pt-f">Loading…</td></tr>`;
  // (a packet saved without its demo case — the cases didn't load then — is paired here, once, as 📦 Intake Packets does)
  const v = x.a || {};
  if(mockCalls() && v.packet && !v.call && !AD.paired[id]){ AD.paired[id] = 1; const pc = pairedCall(v.packet);
    if(pc) writeAssign(id, {call: pc.id, callAt: new Date().toISOString(), client: String(pc.name || "")}).then(() => { if(onSheet()) render(); }, () => {}); }
  const row = (m, v, f, cls) => `<tr><td class="bs-pt-m">${m}</td><td class="bs-pt-v ${cls || ""}">${v}</td><td class="bs-pt-f">${f}</td></tr>`;
  const a = x.a || {}, n = Number(a.packet) || 0, pk = packets()[n] || {}, d = x.d || {};
  const link = u => /^https:\/\//.test(String(u || "")) ? String(u) : "";
  const pkU = link(d.intakePacket), fU = link(d.intakeFolder), ck = x.ck, c = callById(a.call), ws = x.ws;
  const pctCls = p => p >= 100 ? "gs-hi" : p >= 70 ? "gs-mid" : "gs-lo";
  const checking = (AD.checking || {})[id];
  return head
    + row("📦 Packet", n ? `Packet ${n}` : "—", n ? `${pk.client ? e(pk.client) + " · " : ""}assigned in 📦 Intake Packets` : `Not assigned yet: <a href="#" onclick="state.adminTab = 'intake'; render(); return false;">📦 Intake Packets</a>`)
    + row("🔗 Their packet", pkU ? `<a href="${e(pkU)}" target="_blank" rel="noopener noreferrer">📦 Open ↗</a>` : "—", pkU ? (fU ? `<a href="${e(fU)}" target="_blank" rel="noopener noreferrer">📁 Subfolder ↗</a>` : "No client subfolder linked") : "Not linked yet: the trainee links it on Day 8’s slide")
    + row("🔎 Accuracy &amp; completeness", ck ? `${ck.pct}%` : "—",
      // (🔎 Check beside "rule by rule", on the same line: inside the summary, its click kept from opening or closing the rubric)
      (() => { const btn = pkU ? ` <button type="button" class="btn btn-ghost btn-sm" style="margin-left:8px;vertical-align:middle;" ${checking ? "disabled" : ""} onclick="event.preventDefault();event.stopPropagation();FTIntakeAdmin.check('${e(id)}')">${checking ? "Checking…" : "🔎 Check"}</button>` : "";
        return ck ? `<details><summary>The Saving Intake Packet rubric, rule by rule${btn}</summary>${checkHtml(ck, true)}</details>` : "Not checked" + btn; })(), ck ? pctCls(ck.pct) : "")
    + row("🎬 Demo case", c ? e(c.title) : "—", c ? `${e(c.name)} · the Day 8 Intake Demo’s call: play it from Ring Channel’s Scenario Picker` : !mockCalls() ? (PK.failed ? "The cases didn’t load from the CMS" : "Loading the cases…") : n ? "Pairing with the packet…" : "Follows the packet")
    + row("📝 Intake Worksheet", ws && wsLink(ws.answer) ? `<a href="${e(ws.answer)}" target="_blank" rel="noopener noreferrer">📝 Open ↗</a>` : "—", ws && wsLink(ws.answer) ? `Submitted ${e(new Date(ws.submittedAt).toLocaleString([], {dateStyle: "medium", timeStyle: "short"}))}` : "Not submitted");
}
// a write to a trainee's intakeassign record: one at a time per trainee, each on the record as saved now (read again first),
// so the packet and the demo case never overwrite each other, whoever changed the other one and however quickly
const chain = {};
function writeAssign(id, patch){
  const run = (chain[id] || Promise.resolve()).catch(() => {}).then(async () => {
    const saved = await sharedGet("intakeassign:" + id).catch(() => null);
    const next = Object.assign({}, saved && typeof saved === "object" ? saved : (AD.recs[id] || {}), patch);
    if(await sharedSet("intakeassign:" + id, next) === false) throw new Error("save");
    AD.recs[id] = next; AD.assign[id] = Number(next.packet) || 0; if(!AD.assign[id]) delete AD.assign[id];
    if(TC[id]) TC[id].a = next;
    return next;
  });
  chain[id] = run;
  return run;
}
window.addEventListener("ft-roster-changed", () => { AD.rows = null; });
window.FTIntakeAdmin = {
  batch(b){ AD.batch = b; render(); },
  // 🔎 a trainee's corrected packet and subfolder, checked now (worker.js /api/intake/check)
  async check(id){
    AD.checking = AD.checking || {}; if(AD.checking[id]) return;
    AD.checking[id] = true; render();
    let j = null, r = null;
    const rec = AD.recs[id] || (TC[id] || {}).a || {};
    try{ const n = Number(rec.packet) || 0, pk = packets()[n] || {}, c = callById(rec.call);
      r = await authFetch("/api/intake/check", {id, client: pk.client || (c && c.name) || ""}); j = await r.json().catch(() => null); }catch(err){}
    delete AD.checking[id];
    if(r && r.ok && j && j.check){ (TC[id] = TC[id] || {}).ck = j.check; toast(`🔎 ${j.check.pct}%`); } else toast((j && j.error) || "The check didn’t finish. Try again in a moment.");
    render();
  },
  async assign(id, v){
    const n = Number(v) || 0, at = new Date().toISOString();
    // (the packet is the only pick: its demo case pairs with it, pairedCall, and Ring Channel's Scenario Picker plays the same call)
    let c = null; if(n){ try{ await packs(); }catch(err){} c = pairedCall(n); }
    const patch = Object.assign({packet: n, at}, c || !n ? {call: c ? c.id : "", callAt: at, client: c ? String(c.name || "") : ""} : {});
    try{ await writeAssign(id, patch); }catch(err){ toast("Couldn’t save. Check your connection."); return; }
    if(state.view === "admin" && state.adminTab === "intake") render(); else paint();
    toast(n ? `✓ Packet ${n} assigned${c ? ` with its demo case, ${c.title}` : ""} — the trainee sees it within two minutes.` : "✓ Unassigned.");
  },
  async assignCall(id, v){
    const c = callById(v);
    try{ await writeAssign(id, {call: c ? c.id : "", callAt: new Date().toISOString(), client: c ? String(c.name || "") : ""}); }catch(err){ toast("Couldn’t save. Check your connection."); return; }
    paint();
    toast(c ? `✓ ${c.title} assigned — play it from Ring Channel’s Scenario Picker; the trainee sees it within two minutes.` : "✓ Demo case unassigned.");
  },
  async save(){
    // read the form first: loading the saved settings re-renders the page and the form with it
    const v = id => String((document.getElementById(id) || {}).value || "").trim();
    const pk = {}; for(let n = 1; n <= NPACK; n++){ const c = v("ftisC" + n), u = v("ftisU" + n); if(c || u) pk[n] = {client: c, url: u}; }
    const bad = Object.values(pk).map(x => x.url).filter(u => u && !/^https:\/\//.test(u));
    if(bad.length){ toast("A link must start with https://"); return; }
    await loadK(true);
    // (the additional intake documents' shared links are no longer edited here: the saved ones are kept as they are)
    const next = Object.assign({}, K.set, {packets: pk, updatedAt: new Date().toISOString()});
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
  const fresh = [...document.querySelectorAll(Object.keys(PAINT).map(x => x + ":not([data-on])").join(", "))];
  if(fresh.length){
    // (a mock call slot opened again after the CMS's cases failed to load tries once more)
    if(PK.failed && fresh.some(el => el.matches(".ftis-mockcall, .ftis-mcase"))) PK.failed = false;
    paint(); loadK();
  }
  const want = [...document.querySelectorAll(".ftis-calls:not([data-on]), .ftis-consult:not([data-on])")];
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
  cardHtml,   // 📦 a trainee's Intake Packet on their 📋 Batch Sheet page
  cardReload(){ Object.keys(TC).forEach(k => { if(TC[k] && typeof TC[k] === "object") TC[k].at = 0; }); },   // (↻ Refresh)
  // the trainee's assigned mock call (its CMS call id), for the trainer's scoring sheet to keep with the score
  // (read fresh from the saved record; undefined when it can't be known: the cases didn't load, or the read failed)
  async callOf(id){
    if(!mockCalls()) await packs().catch(() => {});
    if(!mockCalls()) return undefined;
    let rec; try{ rec = await sharedGet("intakeassign:" + id); }catch(err){ return undefined; }
    const c = callById((rec || {}).call); return c ? {id: c.id, title: c.title} : null;
  },
  reload: () => loadK(true),
  docsEdit(){ K.edit = !K.edit; paint(true); },
  docGo(i){ K.di = Math.max(0, Math.min(DOCS.length - 1, Number(i) || 0)); paint(true); },
  // 🔗 the trainee's own packet link, into drive:<id>.intakePacket (read fresh first: the record holds their other links too)
  async savePacketLink(b){
    if(!isTrainee()) return;
    const u = String((document.getElementById("ftisPkLink") || {}).value || "").trim(), f = String((document.getElementById("ftisPkFolder") || {}).value || "").trim();
    if(u && !/^https:\/\/(drive|docs)\.google\.com\//.test(u)){ toast("Paste the Google Drive link of your packet: it starts with https://drive.google.com/ or https://docs.google.com/"); return; }
    if(f && !/^https:\/\/drive\.google\.com\/.*folders\//.test(f)){ toast("Paste your client subfolder’s link: it looks like https://drive.google.com/drive/folders/…"); return; }
    b.disabled = true; let ok = false;
    try{ const cur = (await sharedGet("drive:" + state.traineeId)) || {days: {}}; cur.intakePacket = u; cur.intakeFolder = f; cur.updatedAt = new Date().toISOString();
      ok = await sharedSet("drive:" + state.traineeId, cur) !== false; }catch(err){}
    b.disabled = false;
    if(!ok){ toast("Couldn’t save. Check your connection and try again."); return; }
    K.packetLink = u; K.packetFolder = f; paint(); toast(u ? "✓ Saved. Now 🔎 Check my packet." : "Link removed.");
  },
  // 🔎 the corrected packet and its subfolder, checked now (worker.js /api/intake/check)
  async checkPacket(){
    if(!isTrainee() || K.checking) return;
    const u = String((document.getElementById("ftisPkLink") || {}).value || "").trim(), f = String((document.getElementById("ftisPkFolder") || {}).value || "").trim();
    if(u !== (K.packetLink || "") || f !== (K.packetFolder || "")){ toast("Click 💾 Save first, then 🔎 Check my packet."); return; }
    K.checking = true; paint();
    let j = null, r = null;
    try{ r = await authFetch("/api/intake/check", {client: clientOf(Number((K.mine || {}).packet) || 0)}); j = await r.json().catch(() => null); }catch(err){}
    K.checking = false;
    if(r && r.ok && j && j.check){ K.check = j.check; paint(); toast(`🔎 Your packet: ${j.check.pct}%`); return; }
    paint(); toast((j && j.error) || "The check didn’t finish. Try again in a moment.");
  },
  // 💾 the trainee's own document links, into drive:<id>.intakeDocs (read fresh first: the record holds their six links too)
  async docsSave(b){
    if(!isTrainee()) return;
    const v = [...document.querySelectorAll(".ftis-dedit input[data-doc]")].reduce((a, x) => { a[Number(x.getAttribute("data-doc"))] = String(x.value || "").trim(); return a; }, []);
    if(v.some(u => u && !/^https:\/\/(drive|docs)\.google\.com\//.test(u))){ toast("Paste Google Drive links: they start with https://drive.google.com/ or https://docs.google.com/"); return; }
    b.disabled = true;
    let ok = false;
    try{ const cur = (await sharedGet("drive:" + state.traineeId)) || {days: {}}; cur.intakeDocs = DOCS.map((t, i) => v[i] || ""); cur.updatedAt = new Date().toISOString();
      ok = await sharedSet("drive:" + state.traineeId, cur) !== false; }catch(err){}
    b.disabled = false;
    if(!ok){ toast("Couldn’t save. Check your connection and try again."); return; }
    K.docs = DOCS.map((t, i) => v[i] || ""); K.edit = false; paint(true); toast("✓ Your document links are saved: each shows on the slide, bigger on a click.");
  },
  view(b){ if(typeof lvOpen === "function") lvOpen({kind: "doc", title: b.getAttribute("data-title"), url: b.getAttribute("data-url")}); },
  // 📤 the completed worksheet's link (wsubHtml): a Google Docs or Drive link, saved with the time it was sent
  async submitSheet(b){
    const box = document.getElementById("ftisWs"), u = String((box || {}).value || "").trim();
    if(!wsLink(u)){ toast("Paste the Google Drive link of your worksheet: it starts with https://docs.google.com/ or https://drive.google.com/"); if(box) box.focus(); return; }
    const at = new Date().toISOString();
    b.disabled = true;
    const ok = await sharedSet("actsub:" + state.traineeId, {items: {[WS]: {answer: u, submittedAt: at}}});
    b.disabled = false;
    if(ok === false){ toast("Couldn’t submit. Check your connection and try again."); return; }
    K.sub = {answer: u, submittedAt: at}; paint(); toast("✓ Submitted — your trainer sees your worksheet.");
  },
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
/* (🗂 Intake Packets for the trainer: bigger and bolder, to read at a glance) */
.ftis-admin{font-size:16.5px;} .ftis-admin h3{font-size:24px !important;} .ftis-admin .fss-muted{font-size:16px !important;font-weight:600;color:#262B45;line-height:1.55;}
.ftis-admin select{font:800 15px Arial,sans-serif !important;padding:4px 8px !important;border:2px solid #3B4A8C !important;border-radius:8px;color:#1E2340;}
.ftis-admin .ftis-case-auto{font-size:16.5px;font-weight:600;}
.ftis-admin .btn{font-weight:800;font-size:15px;}
.ftis-min table{width:100%;border-collapse:collapse;} .ftis-min th, .ftis-min td{border:1px solid #CBD2DF;padding:5px 8px;text-align:left;vertical-align:top;}
.ftis-min th{width:26%;background:#F2F2F2;} .ftis-min h5{margin:10px 0 2px;color:#262B45;font-size:13.5px;} .ftis-min p{margin:0;}
.ftis-go{display:flex;justify-content:flex-end;}
.ftis-wait{color:#5B6178;font-size:13.5px;}
.ftis-pk-steps{margin:8px 0 10px 18px;padding:0;font-size:14.5px;line-height:1.55;} .ftis-pk-steps li{margin:2px 0;} .ftis-pk-steps code:not(.ftis-name){background:#fff;border:1px solid #F0D2B4;border-radius:5px;padding:0 5px;}
.ftis-pk-link b{display:block;margin-top:6px;} .ftis-ck{margin:10px 0 2px;padding:10px 12px;border:1px solid #E1E5EE;border-radius:10px;background:#fff;color:#1E2340;}
.ftis-ck-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap;} .ftis-ck-h small{color:#5F6368;} .ftis-ck ul{list-style:none;margin:8px 0 0;padding:0;font-size:14px;}
.ftis-ck li{margin:3px 0;} .ftis-ck li.ok{color:#14532D;} .ftis-ck li.miss{color:#9B1C1C;} .ftis-ck li.pend{color:#8A4A00;} .ftis-ck li span{color:#3C4043;font-weight:400;}
.ftis-ck-pct{display:inline-block;min-width:44px;text-align:center;padding:2px 8px;border-radius:8px;font-weight:800;} .ftis-ok{background:#D7F0DE;color:#14532D;} .ftis-mid{background:#FFF1D6;color:#8A4A00;} .ftis-bad{background:#FDE2E1;color:#9B1C1C;}
.ftis-ck-fb{margin:8px 0 0;padding:8px 10px;border-left:4px solid #DB8437;background:#FFF8EF;border-radius:6px;font-size:14px;line-height:1.5;}
.ftis-ckcell{min-width:180px;} .ftis-ckcell details summary{cursor:pointer;} .ftis-ck-mini{width:460px;max-width:60vw;font-size:13px;box-sizing:border-box;} .ftis-ck-mini, .ftis-ck-mini *{white-space:normal;}
.ftis-packet{background:#FFF8EF;border:2px dashed #DB8437;border-radius:12px;padding:12px 16px;margin:6px 0 10px;color:#1B1E2E;}
.ftis-pk-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;} .ftis-pk-h b{color:#262B45;font-size:15px;}
.ftis-pk-h label{font-weight:700;font-size:14px;} .ftis-pk-h select{font:600 14px 'Inter',sans-serif;padding:4px 8px;border-radius:8px;border:1px solid #CBD2DF;margin-left:4px;}
.ftis-pk-steps{margin:8px 0 4px;padding-left:20px;font-size:14px;line-height:1.55;} .ftis-pk-steps li{margin-bottom:4px;}
.ftis-name{background:#262B45;color:#fff;border-radius:6px;padding:2px 8px;font-size:13px;}
.ftis-pk-note{margin:0;font-size:12.5px;color:#5B6178;}
.ftis-wsub{margin:8px 0;padding:12px 14px;border:2px solid #343C66;border-left:6px solid #E8590C;border-radius:12px;background:#fff;text-align:left;}
.ftis-ws-h{margin:0 0 8px;font-weight:800;color:#141A3C;} .ftis-ws-row{display:flex;gap:8px;align-items:center;}
.ftis-ws-row input{flex:1;min-width:0;padding:9px 12px;border:1.5px solid #9AA0AB;border-radius:8px;font:600 15px/1.3 'Inter',sans-serif;color:#0B0D1A;}
.ftis-ws-row input:focus{outline:2px solid #E8590C;outline-offset:1px;border-color:#E8590C;}
.ftis-ws-ok{margin:8px 0 0;font-weight:700;color:#14532D;}
.ftis-pk-ph{display:flex;align-items:center;gap:14px;margin:6px 0 2px;padding:14px 16px;border:2px dashed #C9CFE6;border-radius:12px;background:#F6F7FB;}
.ftis-pk-ph-ic{font-size:30px;line-height:1;opacity:.75;}
.ftis-pk-ph > div{flex:1;display:flex;flex-direction:column;gap:2px;}
.ftis-pk-ph b{color:#1E2340;font-size:16px;} .ftis-pk-ph small{color:#5B6178;font-size:13.5px;}
.ftdd-step-t .ftis-packet{padding:8px 12px;margin:8px 0 2px;border-style:solid;border-width:1px;border-left-width:5px;}
.ftis-pk-card{display:flex;align-items:center;gap:12px;margin:4px 0;} .ftis-pk-card > div > b{display:block;color:#262B45;font-size:15px;} .ftis-pk-card small{display:block;color:#5B6178;font-size:13px;} .ftis-pk-card small b{color:#262B45;}
.ftis-pk-n{flex:0 0 auto;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#262B45;color:#fff;font-weight:800;font-size:17px;}
.ftis-pk-act,.ftis-sh-act{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0;} .ftis-pk-rn{margin:6px 0;font-size:14px;}
.ftis-sheet{margin:8px 0 2px;}
/* (seven to a row: Day 8's fourteen documents in two rows) */
.ftis-docs-lead{margin:0 0 6px;}
.ftis-docs-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px;margin:8px 0;}
.ftis-dv{display:grid;grid-template-columns:minmax(200px,22%) 1fr;gap:14px;margin:8px 0;min-height:60vh;}
.ftis-dv-l{margin:0;padding:0;list-style:none;counter-reset:dv;display:flex;flex-direction:column;gap:4px;max-height:66vh;overflow:auto;}
.ftis-dv-l li{counter-increment:dv;}
.ftis-dv-l button{width:100%;text-align:left;border:1.5px solid #C9CEE0;background:#fff;border-radius:8px;padding:6px 9px;font:700 12.5px/1.3 'Inter',sans-serif;color:#1B1E2E;cursor:pointer;}
.ftis-dv-l button::before{content:counter(dv) ". ";color:#5A6175;}
.ftis-dv-l button.is-on{background:#1E2340;color:#fff;border-color:#1E2340;}
.ftis-dv-l button.is-on::before{color:#FFB37A;}
.ftis-dv-l button.is-none:not(.is-on){color:#6B7280;border-style:dashed;}
.ftis-dv-main{display:flex;flex-direction:column;min-width:0;border:1.5px solid #9AA0AB;border-radius:12px;overflow:hidden;background:#F6F7FB;}
.ftis-dv-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:#fff;border-bottom:1.5px solid #C9CEE0;}
.ftis-dv-bar b{font:800 14px/1.3 'Poppins','Inter',sans-serif;text-align:center;}
.ftis-dv-f{flex:1;width:100%;min-height:58vh;border:0;background:#fff;}
.ftis-dv-none{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:#3A4058;font:600 14px/1.5 'Inter',sans-serif;}
.ftis-dv-none span{font-size:44px;}
@media(max-width:900px){.ftis-dv{grid-template-columns:1fr;}.ftis-dv-l{flex-direction:row;flex-wrap:wrap;max-height:none;}.ftis-dv-l li{flex:1 1 45%;}}
@media(max-width:900px){.ftis-docs-g{grid-template-columns:repeat(2,minmax(0,1fr));}}
.ftis-doc{display:flex;flex-direction:column;background:#fff;border:1.5px solid #9AA0AB;border-radius:12px;overflow:hidden;text-decoration:none;color:#1B1E2E;transition:box-shadow .15s,transform .15s;}
.ftis-doc:hover{box-shadow:0 8px 22px -10px rgba(38,43,69,.45);transform:translateY(-2px);}
.ftis-doc-pic{position:relative;display:block;aspect-ratio:1/1;background:#F6F7FB;overflow:hidden;}
.ftis-doc-pic iframe{width:100%;height:100%;border:0;pointer-events:none;}
.ftis-doc-ic{display:grid;place-items:center;height:100%;font-size:42px;}
.ftis-doc-t{display:block;padding:8px 8px 10px;font:800 15px/1.3 'Inter',sans-serif;color:#0B0D1A;text-align:center;border-top:1px solid #DCE0EA;}
.ftis-form{display:block;background:#fff;border:1px solid #DCE0EA;border-left:5px solid #DB8437;border-radius:12px;overflow:hidden;text-decoration:none;color:#1B1E2E;margin:8px 0;}
.ftis-form-h{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;} .ftis-form-h b{color:#262B45;font-size:15px;} .ftis-form-h small{color:#B5651F;font-weight:700;}
.ftis-form-pic{display:block;height:max(150px, calc(var(--ftdd-room, 70vh) - 280px));background:#F6F7FB;} .ftis-form-pic iframe{width:100%;height:100%;border:0;pointer-events:none;}
.ftis-admin{padding:12px 20px 14px;margin-bottom:0;}
.ftis-admin h4{margin:8px 0 4px;color:#262B45;} .ftis-admin .ff-bar{margin-bottom:2px;} .ftis-admin .ff-bar h3{margin:0;} .ftis-admin .ff-bar .fss-muted{margin:2px 0 0;font-size:15px !important;}
.ftis-count{font:700 13px 'Inter',sans-serif;color:#5B6178;margin-left:6px;}
/* (fixed column counts on a computer, so the page's height follows its scale and js/ft-screen-fit.js fits it in one pass) */
.ftis-assign{column-count:3;column-gap:28px;}
.ftis-acell{break-inside:avoid;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid #E6E9F2;}
.ftis-acell b{font-size:15.5px;color:#1B1E2E;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ftis-acell select{flex:0 0 auto;width:190px;max-width:55%;}
.ftis-phead{display:flex;align-items:center;flex-wrap:wrap;gap:4px 14px;margin-top:10px;} .ftis-phead h4{margin:0;} .ftis-phead .fss-muted{margin:0;flex:1 1 320px;font-size:14.5px !important;} .ftis-phead .btn{margin-left:auto;}
.ftis-banner{margin:0 0 10px;padding:10px 14px;border-radius:10px;background:#FDF0E1;border:1px solid #F0C99A;color:#3A2A14;font-size:14px;line-height:1.5;white-space:normal;overflow-wrap:anywhere;max-width:100%;box-sizing:border-box;}
.ftis-dedit{background:#F6F8FC;border:1px solid #D9DFEA;border-radius:10px;padding:10px 14px;margin:8px 0;text-align:left;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:6px 14px;}
.ftis-dedit > p, .ftis-dedit > .ftis-asave{grid-column:1/-1;margin:0;} .ftis-dedit label{display:flex;flex-direction:column;font-size:12.5px;gap:2px;} .ftis-dedit input{padding:5px 8px;border:1px solid #C9D1E0;border-radius:6px;font:inherit;}
.ftis-doc-t small{display:block;color:#8A93A6;font-weight:400;}
.ftis-pk-link{margin:10px 0 0;text-align:left;} .ftis-pk-link small{display:block;color:#5F6368;margin:2px 0 4px;}
.ftis-mockcall:empty{display:none;}
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
.ftis-aedit{column-count:3;column-gap:22px;margin-top:6px;}
@media(max-width:1000px){.ftis-assign{column-count:auto;columns:300px;} .ftis-aedit{column-count:auto;columns:420px;}}
.ftis-prow{break-inside:avoid;display:grid;grid-template-columns:24px minmax(0,1fr) minmax(0,1.5fr);gap:6px;align-items:center;padding:2px 0;}
.ftis-aedit input{box-sizing:border-box;width:100%;font:600 14px 'Inter',sans-serif;padding:4px 8px;border:1px solid var(--line,#d6d9e0);border-radius:7px;}
.ftis-prow b{font-size:14px;color:#5B6178;text-align:right;} .ftis-asave{margin-top:12px;}
@media(max-width:800px){.ftis-calls{grid-template-columns:minmax(0,1fr);}}
`; document.head.appendChild(s); })();
})();
