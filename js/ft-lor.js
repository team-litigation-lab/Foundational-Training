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
window.lshOpenPortalDrafting = function(letter){
  const url = PORTAL_DRAFTING + (PORTAL_LETTER[letter] || "");
  if(typeof LSHToolLinks === "object" && LSHToolLinks.ticketed) LSHToolLinks.ticketed(url).then(function(u){ location.href = u; });
  else location.href = url;
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view !== "lor") return __render.apply(this, arguments);
  // An old link or bookmark: open the shared tool on the Portal rather than drafting here, and
  // leave the dashboard behind it.
  window.lshOpenPortalDrafting();
  state.view = "dashboard";
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

})();
