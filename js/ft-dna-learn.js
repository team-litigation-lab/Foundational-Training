/* ============================================================
   🧬 THE FEEDBACK & SCORING DNA, KEPT UP TO DATE FROM THE TRAINER'S OWN ENTRIES
   ------------------------------------------------------------
   Every time a trainer grades or gives feedback by hand — 📝 Send Feedback (manual feedback included), 🧑‍🏫 Trainer Inputs and
   the mock call / demo scoresheets (labreview:<id>: the status, the score, the comment, each criterion's score and remark),
   the Practice Sessions' reviews, the Knowledge Checks' reviews (kcreview:<id>) — what they wrote is kept as a learning entry
   (the activity, the verdict, the score, the comment). Every few new entries (REFRESH_EVERY), the AI distils them into the
   DNA's addendum, "learned from the trainer's entries":
     • voice   — how this trainer phrases strengths and corrections, the verdicts they use, their length and tone;
     • scoring — how strict they are: what earns which score, what costs points, how a verdict maps to a score.
   Every AI grader and draft then reads it with the facilitator's DNA (fbStyleBlock, ftDnaGuide on the page; worker.js
   facilitatorVoice), so the AI's feedback and scores follow the trainer's own. Admin → 🗣 Feedback Style shows what was learned,
   from how many entries, and 🔄 Refresh now.
   Kept in settings:feedback-style.learned = {entries: [{k, kind, title, verdict, score, comment, crit, at}] (the last 60),
   pending (new since the last refresh), voice: [...], scoring: [...], refreshedAt, count} — everyone reads, admins write.
   ============================================================ */
(function(){
"use strict";
const KEY = "settings:feedback-style", KEEP = 60, REFRESH_EVERY = 5, FRESH_MS = 5 * 60000;
const has = v => String(v == null ? "" : v).trim().length > 0;
const clip = (v, n) => { const t = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const isAdmin = () => typeof state === "object" && !!state.isAdmin && !state.adminPreview;
const recent = at => { const t = Date.parse(at || ""); return isFinite(t) && Date.now() - t < FRESH_MS; };

// what a trainer's save holds that is new: each entry written in the last few minutes, with its words or its score
function entriesOf(key, val){
  if(!val || typeof val !== "object") return [];
  const out = [], push = (k, kind, title, x, crit) => { if(!x || !recent(x.at) || !(has(x.comment) || has(crit) || (x.score != null && x.score !== ""))) return;
    out.push({k: k + "|" + x.at, kind, title: clip(title, 120), verdict: clip(x.verdict || x.status || "", 80), score: x.score == null || x.score === "" ? null : Number(x.score),
      comment: clip(x.comment, 900), crit: clip(crit || "", 700), at: x.at}); };
  if(key.startsWith("trainerfb:")) Object.entries(val.items || {}).forEach(([k, x]) => push("fb:" + k, x && x.act === "manual" ? "Manual feedback" : "Feedback on work", (x && x.title) || k, x));
  if(key.startsWith("labreview:")){
    const rub = window.FT_RUBRICS && FT_RUBRICS.list;
    Object.entries(val.acts || {}).forEach(([k, x]) => { if(!x) return; const rb = x.rubric && rub ? rub[x.rubric.key] : null;
      const crit = rb ? (rb.criteria || []).map((c, i) => { const s = (x.rubric.scores || [])[i], f = (x.rubric.feedback || [])[i]; return s == null && !has(f) ? "" : `${c.n} ${s == null ? "–" : s}/5${has(f) ? ": " + f : ""}`; }).filter(Boolean).join("; ") : "";
      push("act:" + k, rb ? "Scoresheet (0–5 per criterion)" : "Trainer input", rb ? rb.title : k, x, crit); });
    Object.entries(val.sessions || {}).forEach(([k, x]) => push("ses:" + k, "Practice Session review", k.split("|")[0], x));
  }
  if(key.startsWith("kcreview:")){
    Object.entries(val.lessons || {}).forEach(([l, x]) => push("kc:" + l, "Knowledge Check review", "Knowledge Check, lesson " + l, x,
      x && x.notes ? Object.values(x.notes).filter(has).slice(0, 6).join(" | ") : ""));
    Object.entries(val.read || {}).forEach(([l, x]) => push("read:" + l, "Reading Task review", "Reading Task, lesson " + l, x));
  }
  return out;
}

// 💾 a trainer's save: its new entries join the learning entries (and every few, the DNA is refreshed)
let busy = Promise.resolve();
async function learn(entries){
  if(!entries.length) return;
  busy = busy.then(async () => {
    let cur = null; try{ cur = await sharedGetRaw(KEY); }catch(err){ return; }
    cur = cur && typeof cur === "object" ? cur : {};
    const L = cur.learned = cur.learned || {entries: [], pending: 0};
    const known = new Set((L.entries || []).map(x => x.k)); let n = 0;
    entries.forEach(x => { if(known.has(x.k)) return; L.entries.push(x); n++; });
    if(!n) return;
    L.entries = L.entries.slice(-KEEP); L.pending = (L.pending || 0) + n; L.count = (L.count || 0) + n;
    if(await __set(KEY, cur) === false) return;
    if(state.fbStyle) state.fbStyle.learned = L;
    if(L.pending >= REFRESH_EVERY || (!L.voice && L.entries.length >= 3)) refresh();
  }).catch(() => {});
  return busy;
}
// 🧬 the AI distils the entries into the voice and the scoring the graders follow
let refreshing = false;
async function refresh(manual){
  if(refreshing || typeof callAIJson !== "function") return false;
  refreshing = true;
  try{
    const cur = (await sharedGetRaw(KEY)) || {}, L = cur.learned || {entries: []};
    if((L.entries || []).length < 2){ if(manual) toast("Not enough of your entries yet: grade or send feedback on a few activities first."); return false; }
    const ex = L.entries.slice(-40).map((x, i) => `${i + 1}. [${x.kind}] ${x.title}${x.verdict ? ` · verdict: ${x.verdict}` : ""}${x.score != null ? ` · score: ${x.score}${/0–5/.test(x.kind) ? "" : "%"}` : ""}${x.crit ? `\n   criteria: ${x.crit}` : ""}${x.comment ? `\n   comment: ${x.comment}` : ""}`).join("\n");
    const prompt = `You maintain the "Feedback & Scoring DNA" of a legal VA training program's facilitator. Below are the trainer's own most recent grades and feedback, entered by hand on the training platform. Distil HOW this trainer writes feedback and HOW they score, so that the AI graders can match them.

Return ONLY JSON:
{"voice":["5 to 8 short rules about the trainer's wording: how feedback opens, the verdict labels they use and when, how strengths and corrections are phrased, length, tone, recurring phrases"],
 "scoring":["5 to 8 short rules about the trainer's scoring: how strict they are, what earns a high score, what costs points, how a verdict maps to a score range, how the 0–5 criteria are used"]}
Rules must be general (no trainee names, no case details) and grounded in the entries.

THE PREVIOUS DNA ADDENDUM (refine it; keep what still holds):
voice: ${(L.voice || []).join(" | ") || "(none yet)"}
scoring: ${(L.scoring || []).join(" | ") || "(none yet)"}

THE TRAINER'S ENTRIES (oldest first):
${ex}`;
    const out = await callAIJson(prompt, 1200, undefined, "grading");
    const voice = Array.isArray(out && out.voice) ? out.voice.map(x => clip(x, 240)).filter(has).slice(0, 10) : [];
    const scoring = Array.isArray(out && out.scoring) ? out.scoring.map(x => clip(x, 240)).filter(has).slice(0, 10) : [];
    if(!voice.length && !scoring.length){ if(manual) toast("The AI returned nothing. Try again in a minute."); return false; }
    const now = (await sharedGetRaw(KEY)) || {}; now.learned = Object.assign({}, now.learned || L, {voice, scoring, pending: 0, refreshedAt: new Date().toISOString(), from: L.entries.length});
    if(await __set(KEY, now) === false) return false;
    if(state.fbStyle) state.fbStyle.learned = now.learned;
    if(manual) toast(`🧬 The DNA is updated from your last ${L.entries.length} entries.`);
    if(state.view === "admin" && state.adminTab === "fbstyle") render();
    return true;
  }catch(err){ if(manual) toast("The AI isn’t available right now. Try again later."); return false; }
  finally{ refreshing = false; }
}
// (reading the stored record as it is, not the DNA merged in: fbEffective would hide a record that has only `learned`)
async function sharedGetRaw(k){ const v = await sharedGet(k); return v && typeof v === "object" ? v : null; }

// the save every grader goes through: a trainer's labreview / kcreview / trainerfb also teaches the DNA
const __set = window.sharedSet;
if(typeof __set === "function") window.sharedSet = async function(key, val){
  const r = await __set.apply(this, arguments);
  try{ if(r !== false && isAdmin() && /^(labreview|kcreview|trainerfb):/.test(String(key))) learn(entriesOf(String(key), val)); }catch(err){}
  return r;
};

// 🧬 what the AI reads: the facilitator's DNA, then what was learned from the trainer's entries
function learnedText(L){
  L = L || ((state.fbStyle || {}).learned) || null;
  if(!L || (!(L.voice || []).length && !(L.scoring || []).length)) return "";
  return `\n\nLEARNED FROM THE TRAINER'S OWN ENTRIES (${L.from || (L.entries || []).length} recent grades and feedback; follow these too):` +
    ((L.voice || []).length ? `\nVoice:\n- ${L.voice.join("\n- ")}` : "") +
    ((L.scoring || []).length ? `\nScoring (calibrate every score to these; the evidence still decides):\n- ${L.scoring.join("\n- ")}` : "");
}
window.ftDnaGuide = () => String(((window.FT_FACILITATOR_DNA || {}).guide) || "").slice(0, 3000) + learnedText();
const __block = window.fbStyleBlock;
if(typeof __block === "function") window.fbStyleBlock = function(){ const b = __block.apply(this, arguments); return b ? b + learnedText() : b; };

// 🗣 Feedback Style: what was learned, from how many entries, and 🔄 Refresh now
window.ftDnaLearnedCard = function(){
  const L = (state.fbStyle || {}).learned || null, n = L ? (L.entries || []).length : 0;
  return `<div class="card fbs-card"><div class="fbs-h"><b>🧬 Learned from your own grading and feedback</b>
      <button class="btn btn-ghost btn-sm" onclick="FTDnaLearn.refresh(true)">🔄 Refresh now</button></div>
    <p class="da-note">Every grade and feedback you enter by hand (📝 Send Feedback, the mock call and demo scoresheets, 🧑‍🏫 Trainer Inputs, the Practice Session and Knowledge Check reviews) is kept, and every ${REFRESH_EVERY} new entries the DNA below is updated from them: how you word feedback and how you score. Every AI grader and draft follows it.</p>
    ${L && (L.voice || []).length ? `<p class="da-note">Updated ${L.refreshedAt ? esc(fmtDate(L.refreshedAt)) : ""} from ${L.from || n} entries${L.pending ? ` · ${L.pending} new since` : ""}.</p>
      <div class="fbs-learn"><b>🗣 Voice</b><ul>${L.voice.map(x => `<li>${esc(x)}</li>`).join("")}</ul>${(L.scoring || []).length ? `<b>🎯 Scoring</b><ul>${L.scoring.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>`
      : `<p class="da-note">${n ? `${n} entr${n === 1 ? "y" : "ies"} kept so far: the first update comes with the next ones.` : "Nothing learned yet: it starts with your next grade or feedback."}</p>`}</div>`;
};
window.FTDnaLearn = {refresh: m => refresh(m), learn, entriesOf, text: learnedText};
(function(){ const s = document.createElement("style"); s.textContent = `.fbs-learn{background:#F6F8FC;border:1px solid #E1E6F0;border-radius:10px;padding:8px 12px;margin:6px 0 0;font-size:13.5px;}
.fbs-learn ul{margin:2px 0 8px;padding-left:18px;}`; document.head.appendChild(s); })();
})();
