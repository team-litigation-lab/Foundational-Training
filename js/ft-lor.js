/* ============================================================
   🧰 Drafting Tools — LOR Drafting Activity (#/lor)
   Loaded after js/ft-lor-data.js (the case notes and the templates) and after js/ft-sessions.js.
   A section of 🛠 Practice Lab, and the activity that replaced the Claims Specialist Practice Session.

   The drafting itself is the LSH Training Portal's shared tool (lshOpenPortalDrafting, below). This file draws
   the Practice Lab card (ftLorCard: the templates in js/ft-lor-data.js, and the case a trainer assigned, if any)
   and answers the old #/lor route, which opens the Portal's tool, so old links and bookmarks keep working.

   Shared storage keys (rules in worker.js):
     lor:<traineeId>        the trainee's own drafts, from when the letters were drafted here
     lorassign:<traineeId>  the case their trainer assigned (the trainee reads it, only admins write it)
   ============================================================ */
(function(){
"use strict";
if(!window.FT_LOR_CASES || !window.FT_LOR_TEMPLATES) return;

const CASES = window.FT_LOR_CASES, TEMPLATES = window.FT_LOR_TEMPLATES;
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;   // a trainee session is never an admin one

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["lor"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {lor:"LOR Drafting Activity"});

/* ---------- the trainee's drafts and the case their trainer assigned ---------- */
const L = {id:null, draft:null, assign:null, loading:false, err:"", timer:null, saving:false, savedAt:null, tab:TEMPLATES[0].id};
const blank = () => ({v:1, letters:{}, updatedAt:""});

async function load(id){
  // 👁 Trainee view and the trainer's test copy: no account to read, so nothing to ask the server for.
  if(!id){ L.id = id; L.err = ""; L.assign = null; if(!L.draft) L.draft = blank(); return; }
  L.loading = true; L.err = ""; L.id = id;
  try{
    const [d, a] = await Promise.all([sharedGet("lor:" + id), sharedGet("lorassign:" + id)]);
    L.draft = (d && typeof d === "object") ? d : blank();
    if(!L.draft.letters) L.draft.letters = {};
    L.assign = (a && typeof a === "object") ? a : null;
  }catch(err){ L.err = "Couldn’t load your drafting activity. Check your connection and try again."; }
  L.loading = false;
  if(state.view === "lor" || state.view === "simulators") render();
}

/* ---------- the assigned case ---------- */
// The case number a trainer assigned, 1-based as the trainers count them; null when they haven't yet.
function myCaseNo(){
  if(adminOn()) return Number(state.lorPreviewCase) || 1;    // an admin reading the page sees case 1
  const n = L.assign && Number(L.assign.case);
  return n >= 1 && n <= CASES.length ? n : null;
}
const caseOf = no => (no ? CASES[no - 1] : null) || null;
const caseName = no => { const c = caseOf(no); return c ? `Case ${no} · ${c.p1["Client’s Name"] || "—"} · ${c.p1["Date of Loss"] || ""}` : `Case ${no}`; };

/* This activity now lives on the LSH Training Portal, as one shared tool that both this course and
   Case Management open: /simulators/drafting.html. The Portal fills the firm's own .docx and hands
   that file back, so the download carries the letterhead and logo — this course re-typeset the
   letter through jsPDF, which is what lost them. js/lsh-tool-links.js puts the signed ticket on the
   link, so a trainee lands there already signed in. This file still draws the card and still
   answers its own route, so old links and bookmarks keep working. */
const PORTAL_DRAFTING = "https://cm-training-activity.pages.dev/simulators/drafting.html";

// On window: the card's onclick is an inline attribute, which is read in global scope, not in this
// file's closure.
// The tool opens on the letter asked for: none = the LORs; "medlor" = the MedLOR with Unsworn COR and the
// client's signed HIPAA, merged into one PDF (Day 14); "lienbv" = the Lien Balance Verification (Day 16).
const PORTAL_LETTER = {medlor: "?tab=prov&kind=medlor", lienbv: "?tab=prov&kind=lienbv"};
// (and a trainee's assigned case, 📄 Assign LORs: the tool then shows that case alone, ?case=N)
window.lshOpenPortalDrafting = async function(letter){
  let url = PORTAL_DRAFTING + (PORTAL_LETTER[letter] || "");
  if(isTrainee() && !letter){
    if(L.id !== state.traineeId || !L.assign){ try{ const a = await sharedGet("lorassign:" + state.traineeId); L.assign = a && typeof a === "object" ? a : null; }catch(err){} }
    const n = myCaseNo(); if(n) url += (url.includes("?") ? "&" : "?") + "case=" + n;
  }
  if(typeof LSHToolLinks === "object" && LSHToolLinks.ticketed) LSHToolLinks.ticketed(url).then(function(u){ location.href = u; });
  else location.href = url;
};

/* ---------- 📄 Assign LORs (Admin → 📄 Assign LORs, beside 📦 Intake Packets; a trainer's) ----------
   Each trainee of a batch gets one of the cases (js/ft-lor-data.js) for the LOR Drafting Activity: a case for each, set one
   by one, or 🎲 every trainee without one given a case of their own (the cases not yet taken in the batch first). Kept in
   lorassign:<id> = {case, at} (only admins write it); the trainee's Practice Lab card names it (Your case) and the Portal's
   drafting tool opens on it alone (lshOpenPortalDrafting, ?case=N). */
const LA = {roster: null, rows: {}, loading: false, busy: false, batch: ""};
async function laLoad(){
  if(LA.loading) return; LA.loading = true;
  try{
    const people = await ftActiveRoster();
    const v = await sharedGetMany(people.map(r => "lorassign:" + r.id));
    LA.roster = people.map(r => ({id: r.id, name: r.name || r.id, batch: r.batch || ""})).sort((x, y) => x.batch.localeCompare(y.batch) || x.name.localeCompare(y.name));
    LA.rows = {}; people.forEach((r, i) => { const n = v[i] && Number(v[i].case); if(n >= 1 && n <= CASES.length) LA.rows[r.id] = n; });
    if(!LA.batch) LA.batch = window.ftLatestBatch ? ftLatestBatch(LA.roster) : "";
  }catch(err){ LA.roster = LA.roster || []; }
  LA.loading = false; if(state.view === "admin" && state.adminTab === "lorassign") render();
}
async function laWrite(id, n){
  const rec = {case: n || null, at: new Date().toISOString()};
  if(await sharedSet("lorassign:" + id, rec) === false) throw new Error("save");
  if(n) LA.rows[id] = n; else delete LA.rows[id];
}
const laPeople = () => (LA.roster || []).filter(r => !LA.batch || r.batch === LA.batch);
function laHtml(){
  if(!adminOn()) return "";
  if(!LA.roster){ laLoad(); return `<div class="card" style="padding:24px;">Loading…</div>`; }
  const ppl = laPeople(), given = ppl.filter(p => LA.rows[p.id]).length, taken = {};
  ppl.forEach(p => { const n = LA.rows[p.id]; if(n) taken[n] = (taken[n] || 0) + 1; });
  const batches = [...new Set(LA.roster.map(r => r.batch).filter(Boolean))].sort();
  const opt = (n, cur) => `<option value="${n}" ${n === cur ? "selected" : ""}>${n ? e(caseName(n)) : "Not assigned"}</option>`;
  return `<div class="card lor-as"><div class="lor-as-h"><div><h3>📄 Assign LORs <small class="lor-as-n">${given} of ${ppl.length} assigned</small></h3>
      <p class="lor-as-note">Each trainee drafts the 1P and 3P LORs from their own case: they see it on the 📄 LOR Drafting Activity card in 🛠 Practice Lab, and the drafting tool opens on that case alone.</p></div>
    <span class="lor-as-ctl"><select aria-label="Batch" onchange="FTLorAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === LA.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <button type="button" class="btn btn-navy btn-sm" ${LA.busy || !ppl.length || given === ppl.length ? "disabled" : ""} onclick="FTLorAdmin.all()">🎲 Assign every trainee a case</button></span></div>
    ${ppl.length ? `<div class="lor-as-g">${ppl.map(p => { const n = LA.rows[p.id] || 0;
      return `<label class="lor-as-c"><b>${e(p.name)}${LA.batch ? "" : ` <small>${e(p.batch)}</small>`}</b><select aria-label="LOR case for ${e(p.name)}" onchange="FTLorAdmin.set('${e(p.id)}', this.value)">${[0, ...CASES.map((c, i) => i + 1)].map(k => opt(k, n)).join("")}</select>${n && taken[n] > 1 ? `<small class="lor-as-dup">also given to another trainee</small>` : ""}</label>`; }).join("")}</div>`
      : `<p class="lor-as-note">No approved trainees${LA.batch ? " in this batch" : ""}.</p>`}</div>`;
}
window.FTLorAdmin = {
  html: laHtml,
  reload(){ LA.roster = null; render(); },
  batch(b){ LA.batch = String(b || ""); render(); },
  async set(id, v){
    if(!adminOn()) return; const n = Number(v) || 0;
    try{ await laWrite(id, n >= 1 && n <= CASES.length ? n : 0); toast(n ? `📄 ${caseName(n)} assigned.` : "LOR case taken off."); }
    catch(err){ toast("Couldn’t save the case. Try again."); }
    render();
  },
  // 🎲 each trainee of the batch without a case gets one: the cases no one in the batch has yet first, in order, then again from Case 1
  async all(){
    if(!adminOn() || LA.busy) return; const ppl = laPeople(), need = ppl.filter(p => !LA.rows[p.id]); if(!need.length) return;
    LA.busy = true; render();
    const used = new Set(ppl.map(p => LA.rows[p.id]).filter(Boolean)), free = CASES.map((c, i) => i + 1).filter(n => !used.has(n)), order = free.concat(CASES.map((c, i) => i + 1));
    let k = 0, bad = 0;
    for(const p of need){ try{ await laWrite(p.id, order[k++ % order.length]); }catch(err){ bad++; } }
    LA.busy = false; toast(bad ? `Assigned ${need.length - bad}; ${bad} couldn’t be saved. Try again.` : `📄 ${need.length} trainee${need.length === 1 ? "" : "s"} given a case.`); render();
  }
};
if(typeof window.ftAdminTab === "function") ftAdminTab("lorassign", "📄 Assign LORs", laHtml);
(function(){ const s = document.createElement("style"); s.textContent = `
.lor-as{padding:18px 22px;}
.lor-as-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px;}
.lor-as-h h3{margin:0 0 4px;}
.lor-as-ctl{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.lor-as-ctl select{font:700 14px Arial,sans-serif;padding:4px 8px;border:2px solid #3B4A8C;border-radius:8px;color:#1E2340;}
.lor-as-c small{color:#5A6175;font-weight:600;}
.lor-as-n{font-weight:600;color:#5A6175;margin-left:6px;}
.lor-as-note{margin:0 0 8px;color:#3A4058;font:600 13.5px/1.4 Arial,sans-serif;}
.lor-as-g{column-count:3;column-gap:24px;padding-bottom:12px;}
.lor-as-c{display:flex;flex-direction:column;gap:3px;break-inside:avoid;margin:0 0 8px;font:700 14px Arial,sans-serif;color:#1E2340;}
.lor-as-c select{font:700 13.5px Arial,sans-serif;padding:4px 6px;border:2px solid #3B4A8C;border-radius:8px;color:#1E2340;max-width:100%;}
.lor-as-dup{color:#9A5B00;font-weight:600;}
@media(max-width:900px){.lor-as-g{column-count:1;}}`; document.head.appendChild(s); })();

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view !== "lor") return __render.apply(this, arguments);
  // Open the shared tool on the Portal rather than drafting here, and keep the trainee on the lesson behind it
  // (the deck slide they came from, else the slide last open: js/ft-lab-route.js), not the dashboard.
  window.lshOpenPortalDrafting();
  if(window.FTLabRoute){ state.view = "modules"; setTimeout(() => FTLabRoute.home(), 0); }
  else state.view = "dashboard";
  return __render.apply(this, arguments);
};
// 🧰 Drafting Tools in the Practice Lab, where the Claims Specialist session used to be. A tool, not a
// one-off: it draws every template in js/ft-lor-data.js, so a records request or a HIPAA authorisation added
// there shows up here with no change to this card.
window.ftLorCard = function(){
  const open = state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(7) : true);
  // Read here, not on the dashboard: the Practice Lab is where the card is, so the dashboard's
  // request budget is untouched. The card names the case as soon as the read comes back.
  if(isTrainee() && L.id !== state.traineeId && !L.loading) load(state.traineeId);
  const no = isTrainee() && L.draft ? myCaseNo() : null;
  // (no "assign each trainee a case" / "waiting for your trainer": the drafting opens on the Training Portal, js/ft-lor.js
  // lshOpenPortalDrafting, where no case is assigned here)
  const note = !open || adminOn() ? "" : no ? `Your case: <b>${e(caseName(no))}</b>.` : "";
  const dayT = window.FTDays ? FTDays.label(FTDays.forTool("lor")) : "";
  const medT = window.FTDays ? FTDays.label(FTDays.forTool("medlor")) : "", lvT = window.FTDays ? FTDays.label(FTDays.forTool("lienbv")) : "";
  return `<div class="card fts-card ${open ? "" : "fts-locked"}"><div class="fts-kicker">${dayT ? e(dayT) + " · " : ""}Claims Specialist Training${open ? "" : " · opens with this lesson"}</div>
    <h3>📄 LOR Drafting Activity</h3>
    <p class="fts-note">The 1P and 3P letters open on the Training Portal as the firm’s own originals, letterhead and all. Edit one in Word or a PDF editor, upload it back, and it is checked: the score goes to your progress. (The MedLOR and the Lien Balance Verification open from their own days, 14 and 16.)</p>
    ${note ? `<p class="fss-case">${note}</p>` : ""}
    <div class="fts-label">Templates in this tool</div>
    <ul class="fts-tpl">${TEMPLATES.map(t => `<li>${e(String(t.title).replace(/^Activity \d+:\s*/, ""))}</li>`).join("")}
      <li>MedLOR with Unsworn COR + the client’s signed HIPAA, merged into one PDF${medT ? ` (${e(medT)})` : ""}</li>
      <li>Lien Balance Verification${lvT ? ` (${e(lvT)})` : ""}</li></ul>
    <div class="fts-tool-act">${open ? `<button class="btn btn-navy btn-sm" type="button" onclick="lshOpenPortalDrafting()">Open the tool &rarr;</button>`
      : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div>`;
};


/* ---------- 📤 THE LORs HANDED IN (Day 11's slide, .ftlor-hand — build/day-decks.cjs puts it under "Saving the File") ----------
   The LOR Drafting Activity is done the way the training runs it: the trainee downloads the 1P and 3P templates from the LOR
   Drafting tool, edits them on their computer, uploads them to their Assessments/Activities folder in Google Drive, then pastes
   each letter's Drive link here and submits. Kept in actsub:<id>.items.lor = {answers: [1P link, 3P link], answer: the 1P
   link, submittedAt} (worker.js keeps a trainee's own hand-ins). The trainer opens them and scores the activity on 🧑‍🏫 Graders
   → 📝 Assessments (LOR Drafting Activity), and that score is the one on the Score Card (labreview:<id>.acts["lor-drafting"]). */
const H = {id: null, sub: null, loading: false};
const driveLink = u => /^https:\/\/(docs|drive)\.google\.com\//.test(String(u || "").trim());
function handLoad(){
  const id = state.traineeId; if(!isTrainee() || H.loading || H.id === id) return;
  H.loading = true;
  sharedGet("actsub:" + id).then(v => { H.sub = (((v || {}).items) || {}).lor || null; }).catch(() => {})
    .finally(() => { H.id = id; H.loading = false; handPaint(true); });
}
function handHtml(){
  const me = isTrainee(), sub = me && H.id === state.traineeId ? H.sub : null, a = (sub && sub.answers) || [];
  const when = sub && sub.submittedAt ? new Date(sub.submittedAt).toLocaleString([], {dateStyle: "medium", timeStyle: "short"}) : "";
  const row = (k, label, v) => `<label class="ftlor-hl"><b>${label}</b><input type="url" data-lor="${k}" ${me ? "" : "disabled"} placeholder="${me ? "https://docs.google.com/document/d/…" : "Each trainee pastes their own link"}" value="${e(v || "")}"></label>`;
  return `<p class="ftlor-hh">📤 Hand in your LORs</p>
    <p class="ftlor-hn">Download the template, edit it on your computer, then upload your finished letter to your <b>Assessments/Activities folder</b> in Google Drive. Paste each letter’s Drive link here and submit: your trainer opens them and scores your LORs.</p>
    ${row(0, "1P LOR", a[0])}${row(1, "3P LOR with Affidavit", a[1])}
    <div class="ftlor-hr"><button type="button" class="btn btn-navy" ${me ? `onclick="FTLorHand.submit(this)"` : "disabled"}>📤 ${sub ? "Submit again" : "Submit my LORs"}</button>
      ${sub ? `<span class="ftlor-ok">✓ Submitted ${e(when)}: your trainer scores it.</span>` : ""}</div>`;
}
function handPaint(all){
  document.querySelectorAll(".ftlor-hand").forEach(el => { if(!all && el.getAttribute("data-on")) return; el.setAttribute("data-on", "1"); el.innerHTML = handHtml(); });
  if(document.querySelector(".ftlor-hand")) handLoad();
}
let hq = false;
new MutationObserver(() => { if(hq || !document.querySelector(".ftlor-hand:not([data-on])")) return; hq = true; requestAnimationFrame(() => { hq = false; handPaint(false); }); })
  .observe(document.documentElement, {childList: true, subtree: true});
window.FTLorHand = {
  async submit(b){
    const v = [0, 1].map(k => String((document.querySelector(`.ftlor-hand input[data-lor="${k}"]`) || {}).value || "").trim());
    if(!v[0] || !v[1]){ toast("Paste the Drive links of both letters: the 1P LOR and the 3P LOR with Affidavit."); return; }
    if(!v.every(driveLink)){ toast("Paste each letter’s Google Drive link (https://docs.google.com/… or https://drive.google.com/…)."); return; }
    const at = new Date().toISOString(); b.disabled = true;
    const ok = await sharedSet("actsub:" + state.traineeId, {items: {lor: {answers: v, answer: v[0], submittedAt: at}}});
    b.disabled = false;
    if(ok === false){ toast("Couldn’t submit. Check your connection and try again."); return; }
    H.sub = {answers: v, answer: v[0], submittedAt: at}; H.id = state.traineeId; handPaint(true);
    toast("✓ Submitted — your trainer sees your LORs."); if(window.ftActivityDone) ftActivityDone();
  },
  html: handHtml
};
(function(){ const st = document.createElement("style"); st.id = "ft-lor-hand"; st.textContent = `
.ftlor-hand{margin:10px 0 4px;padding:12px 14px;border:2px solid #343C66;border-left:6px solid #E8590C;border-radius:12px;background:#fff;text-align:left;}
.ftlor-hh{margin:0 0 4px !important;font:800 18px/1.3 'Poppins','Inter',sans-serif;color:#1E2340;} .ftlor-hn{margin:0 0 8px !important;font-size:15px;line-height:1.45;color:#2E3450;}
.ftlor-hl{display:flex;flex-direction:column;gap:3px;margin:0 0 8px;font-size:15px;color:#1E2340;} .ftlor-hl input{padding:8px 10px;border:1.5px solid #AEB6C6;border-radius:8px;font-size:15px;}
.ftlor-hr{display:flex;flex-wrap:wrap;align-items:center;gap:10px;} .ftlor-ok{font-weight:800;color:#1F7A45;font-size:15px;}`; document.head.appendChild(st); })();
})();
