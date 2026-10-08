/* ============================================================
   FACILITATOR FEEDBACK STYLE (Foundational Training)
   ------------------------------------------------------------
   🗣 Feedback Style (Admin → 📚 Training Modules): learns how the facilitator writes feedback — from
   pasted or uploaded examples, and from the feedback already sent on the Daily Activities this
   platform used to have — and every AI feedback in the portal (Practice Lab grading, daily reviews,
   and the Worker's Task Tracker notes review) is then written in that voice.

   The Daily Activities tab (trainees answered each day's activity; trainers reviewed it in
   Admin → 📝 Activities) was taken off: the Practice Lab and the Knowledge Checks cover that work.
   What trainees sent and the feedback on it stay stored (activities:dayN, actsub:<id>).

   Shared storage keys (rules in worker.js):
     settings:feedback-style  the learned facilitator voice (everyone reads, admin writes)
     admin:fbstyle-samples    the raw feedback examples it was learned from (admin only)
     actsub:<traineeId>       (read only here) feedback sent on the old Daily Activities, offered as examples
   ============================================================ */

// This file's state, and the feedback card its sample shows in.
function daState(){ return state.da || (state.da = {byDay:{}, loadedAt:0, open:null, subs:null, adminDay:1, adminSub:"manage", edit:null}); }
function daScoreTotals(scores){
  const n = scores.length, total = scores.reduce((a, x) => a + (Number(x.score) || 0), 0);
  return {total, max: n * 5, finalRating: n ? Math.round(total / n * 100) / 100 : 0};
}
function daScoresTable(fb){
  const t = daScoreTotals(fb.scores);
  return `<table class="da-score"><thead><tr><th>Criteria</th><th>Score</th><th>Evaluation</th></tr></thead><tbody>
    ${fb.scores.map((x, i) => `<tr><td><b>${i + 1}. ${esc(x.criterion)}</b></td><td class="da-score-n">${Number(x.score) || 0}/5</td><td>${esc(x.evaluation || "")}</td></tr>`).join("")}
    </tbody></table>
    <div class="da-score-tot"><span>Total Score: <b>${t.total}/${t.max}</b></span><span>Final Rating: <b>${t.finalRating.toFixed(2)}/5.00</b></span></div>`;
}
function daFeedbackCard(fb, title){
  const list = (h, arr) => (arr || []).length ? `<div class="da-fb-l"><b>${h}</b><ul>${arr.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "";
  return `<div class="card da-fb"><div class="da-fb-h"><span>💬 ${esc(title)}</span>${fb.rating ? `<span class="pill ${fb.rating === "Strong" ? "pill-done" : fb.rating === "Needs Support" ? "pill-locked" : "pill-open"}">${esc(fb.rating)}</span>` : ""}</div>
    ${fb.summary ? `<p>${esc(fb.summary)}</p>` : ""}${(fb.scores || []).length ? daScoresTable(fb) : ""}${list("What worked", fb.strengths)}${list("Not yet — build on this", fb.areasToBuild)}${list("Next steps", fb.nextSteps)}
    ${fb.sentAt ? `<div class="da-note">Sent ${fmtDate(fb.sentAt)}</div>` : ""}</div>`;
}

/* ============================================================
   FACILITATOR FEEDBACK STYLE
   ============================================================ */
let fbStyleLoadedAt = 0;
// The voice in use: the facilitator's DNA (js/ft-facilitator-dna.js) until a trainer saves a voice here
// (saved with v2: edited, learned, restored or switched off). worker.js resolves it the same way.
function fbEffective(saved){
  if(saved && saved.v2) return saved;
  const dna = window.FT_FACILITATOR_DNA;
  return dna ? {enabled:true, dna:true, guide:dna.guide, traits:dna.traits.slice(), examples:dna.examples.slice(), source:dna.source, learnedAt:dna.learnedAt} : saved;
}
async function fbEnsureStyle(force){
  if(!force && fbStyleLoadedAt && Date.now() - fbStyleLoadedAt < 10 * 60000) return state.fbStyle;
  try{ state.fbStyle = fbEffective((await sharedGet("settings:feedback-style")) || null); fbStyleLoadedAt = Date.now(); }catch(e){ /* keep the last copy */ }
  return state.fbStyle;
}
if(!state.fbStyle) state.fbStyle = fbEffective(null);
function fbStyleOn(){ const s = state.fbStyle; return !!(s && s.enabled !== false && s.guide); }
// Appended to every feedback prompt; keeps the requested output format and the judgement unchanged.
function fbStyleBlock(){
  if(!fbStyleOn()) return "";
  const s = state.fbStyle;
  return `

VOICE — write all feedback wording the way this program's facilitator writes feedback. Keep exactly the output format requested above. Ratings and scores must stay evidence-based: the voice changes how things are said, not the judgement.
Facilitator style guide:
${String(s.guide).slice(0, 3500)}${(s.examples || []).length ? `
Examples of the facilitator's voice (match tone, rhythm and phrasing; do not reuse their content):
${s.examples.slice(0, 3).map((x, i) => `(${i + 1}) ${String(x).slice(0, 900)}`).join("\n")}` : ""}`;
}
window.fbStyleBlock = fbStyleBlock;
// Every Practice Lab grading call and the daily-review prompt get the voice.
if(typeof callAITextOnce === "function"){
  const __fbCallOnce = callAITextOnce;
  window.callAITextOnce = function(prompt, maxTokens, timeoutMs, feature){
    if(feature === "grading" && String(prompt).indexOf("\nVOICE — write all feedback") < 0) prompt = String(prompt) + fbStyleBlock();
    return __fbCallOnce.call(this, prompt, maxTokens, timeoutMs, feature);
  };
}
if(typeof feedbackPrompt === "function"){
  const __fbFeedbackPrompt = feedbackPrompt;
  window.feedbackPrompt = function(){ return __fbFeedbackPrompt.apply(this, arguments) + fbStyleBlock(); };
}
setTimeout(() => { if(state.traineeId || state.isAdmin) fbEnsureStyle(); }, 2500);
// Re-read every 10 minutes while the page is in view, not in a background tab: every /api/ request counts
// toward the Cloudflare account's request allowance, shared by every LSH site.
setInterval(() => { if((state.traineeId || state.isAdmin) && document.visibilityState !== "hidden") fbEnsureStyle(true); }, 10 * 60000);

function fbSampleText(fb){
  const part = (h, arr) => (arr || []).length ? `${h}\n${arr.map(x => "- " + x).join("\n")}` : "";
  const scored = (fb.scores || []).filter(x => x.evaluation).map(x => `${x.criterion} — ${x.score}/5: ${x.evaluation}`).join("\n");
  return [fb.summary, scored, part("Strengths:", fb.strengths), part("Areas to build:", fb.areasToBuild), part("Next focus:", fb.nextDayFocus || fb.nextSteps)].filter(Boolean).join("\n").trim();
}
async function fbLoadSamples(){ const s = daState(); try{ s.fbSamples = (await sharedGet("admin:fbstyle-samples")) || {items:[]}; }catch(e){ s.fbSamples = s.fbSamples || {items:[]}; } }
function renderAdminFeedbackStyle(){
  const s = daState();
  if(!s.fbSamples){ if(!s.fbLoading){ s.fbLoading = true; Promise.all([fbLoadSamples(), fbEnsureStyle(true)]).then(() => { s.fbLoading = false; if(state.view === "admin" && state.adminTab === "fbstyle") render(); }); }
    return `<div class="card" style="padding:30px;text-align:center;color:var(--ink-soft);">Loading…</div>`; }
  const st = state.fbStyle || {}, items = s.fbSamples.items || [];
  const bySrc = (src) => items.filter(x => x.source === src).length;
  return `
    <p style="color:var(--ink-soft);font-size:13.5px;max-width:82ch;margin:0 0 14px;">Teach the AI to write feedback the way your facilitator does. It learns from real feedback — the reviews you've edited and sent in the portal, plus any examples you paste (Messenger/email/Docs feedback works well). Once learned, <b>every AI feedback</b> — the Task Tracker's daily notes review, trainer reviews, graded exercises and 📝 Activities drafts — is written in that voice. Ratings and scores are unchanged; only the wording follows the style.</p>
    <div class="card fbs-card">
      <div class="fbs-h"><b>Current voice</b>
        ${st.guide ? `<label class="da-check"><input type="checkbox" ${st.enabled !== false ? "checked" : ""} onchange="fbToggle(this.checked)"> Use this voice for all AI feedback</label>` : `<span class="pill pill-locked">Not learned yet</span>`}</div>
      ${st.dna ? `<p class="da-note">🧬 <b>The facilitator’s DNA</b>, written from ${esc(st.source || "the facilitator’s evaluations")}. Every AI reviewer uses it. Edit it and click Save edits to improve it, or learn a new voice from examples below.</p>`
        : st.guide ? `<p class="da-note">${st.learnedAt ? `Learned ${fmtDate(st.learnedAt)} from ${st.sampleCount || "?"} examples. ` : ""}You can edit the guide directly. <a style="cursor:pointer;color:var(--orange-deep);font-weight:700;" onclick="fbUseDna()">🧬 Go back to the facilitator’s DNA</a></p>` : ""}
      ${st.guide ? `
        ${(st.traits || []).length ? `<div class="fbs-traits">${st.traits.map(t => `<span class="da-chip">${esc(t)}</span>`).join("")}</div>` : ""}
        <label>Style guide<textarea id="fbs_guide" rows="8">${esc(st.guide)}</textarea></label>
        <label>Voice examples <span>(generic — no real trainee details; separate with a line of three dashes)</span><textarea id="fbs_examples" rows="8">${esc((st.examples || []).join("\n---\n"))}</textarea></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" onclick="fbSaveGuide()">Save edits</button><button class="btn btn-ghost btn-sm" onclick="fbTry()">🧪 Try it on a sample answer</button></div>
        <div id="fbsTry"></div>` : `<p class="da-note">Add examples below, then click <b>Learn the style</b>.</p>`}
    </div>
    <div class="card fbs-card">
      <div class="fbs-h"><b>Examples to learn from (${items.length})</b><span class="da-note">${bySrc("review")} from sent reviews · ${bySrc("activity")} from activity feedback · ${bySrc("pasted")} pasted · ${bySrc("document")} from documents</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <button class="btn btn-ghost btn-sm" id="fbsImportBtn" onclick="fbImport()">⤵ Import feedback you've sent in the portal</button>
        <button class="btn btn-navy btn-sm" id="fbsLearnBtn" ${items.length < 3 ? "disabled title='Add at least 3 examples'" : ""} onclick="fbLearn()">✨ Learn the style from ${items.length} example${items.length === 1 ? "" : "s"}</button>
      </div>
      <label>Paste facilitator feedback <span>(one or more messages; separate messages with a line of three dashes ---)</span><textarea id="fbs_paste" rows="6" placeholder="Hi Maria! Great job on today's inbox triage…&#10;---&#10;Hey John, solid start. Not yet on the follow-up email though…"></textarea></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><button class="btn btn-ghost btn-sm" onclick="fbAddPasted()">+ Add pasted examples</button>
        <label class="btn btn-ghost btn-sm" style="cursor:pointer;">⬆ Upload reports: .docx / .xlsx / .txt<input type="file" accept=".docx,.xlsx,.txt,.md,.csv,text/plain" multiple style="display:none" onchange="fbUpload(this)"></label></div>
      <p class="da-note" style="margin-top:6px;">Ranking reports and review sheets (.docx / .xlsx) work well: each feedback passage in them becomes an example. Then click Learn the style.</p>
      ${items.length ? `<details style="margin-top:10px;"><summary>See all ${items.length} examples</summary>${items.map((x, i) => `<div class="fbs-sample"><span class="da-note">${esc(x.source || "")}</span><div>${esc(x.text).replace(/\n/g, "<br>")}</div><button class="btn btn-ghost btn-sm" onclick="fbRemove(${i})">Remove</button></div>`).join("")}</details>` : ""}
    </div>`;
}
window.renderAdminFeedbackStyle = renderAdminFeedbackStyle;
async function fbSaveSamples(){ const s = daState(); s.fbSamples.items = s.fbSamples.items.slice(-200); if(!(await sharedSet("admin:fbstyle-samples", s.fbSamples))) throw new Error("couldn't save to the server"); }
function fbAddTexts(texts, source){
  const s = daState(), have = new Set(s.fbSamples.items.map(x => x.text));
  let n = 0; texts.map(t => String(t || "").trim()).filter(t => t.length >= 30 && !have.has(t)).forEach(t => { s.fbSamples.items.push({text:t.slice(0, 4000), source, addedAt:new Date().toISOString()}); have.add(t); n++; });
  return n;
}
async function fbAddPasted(){
  const el = document.getElementById("fbs_paste"); const texts = (el ? el.value : "").split(/\n\s*-{3,}\s*\n/);
  const n = fbAddTexts(texts, "pasted"); if(!n){ toast("Paste at least one message (30+ characters)."); return; }
  try{ await fbSaveSamples(); toast(`Added ${n} example(s).`); render(); }catch(e){ showActionError(e, "Saving examples"); }
}
async function fbUpload(input){
  let n = 0;
  try{
    for(const f of [...(input.files || [])]){
      if(/\.docx$/i.test(f.name)) n += fbAddTexts(await fbDocxPassages(f), "document");
      else if(/\.xlsx$/i.test(f.name)) n += fbAddTexts(await fbXlsxPassages(f), "document");
      else { const t = await f.text(); n += fbAddTexts(t.split(/\n\s*-{3,}\s*\n|\n{3,}/), "pasted"); }
    }
    await fbSaveSamples(); toast(`Added ${n} example(s).`); render();
  }catch(e){ showActionError(e, "Reading the files"); }
}
// Word and Excel files are zip packages: JSZip (cdnjs) opens them; each feedback passage becomes an example.
function fbJsZip(){
  if(window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((ok, fail)=>{ const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = ()=>ok(window.JSZip); s.onerror = ()=>fail(new Error("couldn't load the file reader")); document.head.appendChild(s); });
}
const fbXml = (s)=>new DOMParser().parseFromString(s, "application/xml");
const fbWText = (el)=>[...el.getElementsByTagName("w:p")].map(p=>[...p.getElementsByTagName("w:t")].map(t=>t.textContent).join("")).join("\n").trim();
async function fbDocxPassages(file){
  const zip = await (await fbJsZip()).loadAsync(await file.arrayBuffer());
  const doc = fbXml(await zip.file("word/document.xml").async("string"));
  const cells = [...doc.getElementsByTagName("w:tc")].filter(tc=>!tc.getElementsByTagName("w:tc").length).map(fbWText);
  const loose = [...doc.getElementsByTagName("w:p")].filter(p=>!p.closest || !p.closest("tc")).map(p=>[...p.getElementsByTagName("w:t")].map(t=>t.textContent).join(""));
  return cells.concat(cells.length ? [] : loose).map(t=>t.trim()).filter(t=>t.length >= 80);
}
async function fbXlsxPassages(file){
  const zip = await (await fbJsZip()).loadAsync(await file.arrayBuffer());
  const ssf = zip.file("xl/sharedStrings.xml");
  const shared = ssf ? [...fbXml(await ssf.async("string")).getElementsByTagName("si")].map(si=>[...si.getElementsByTagName("t")].map(t=>t.textContent).join("")) : [];
  const out = [];
  for(const name of Object.keys(zip.files).filter(k=>/^xl\/worksheets\/sheet\d+\.xml$/.test(k))){
    const sheet = fbXml(await zip.file(name).async("string"));
    [...sheet.getElementsByTagName("c")].forEach(c=>{
      const v = c.getElementsByTagName("v")[0], is = c.getElementsByTagName("is")[0];
      const t = c.getAttribute("t") === "s" && v ? shared[+v.textContent] : is ? is.textContent : "";
      if(t && t.trim().length >= 40) out.push(t.trim());
    });
  }
  return out;
}
async function fbUseDna(){
  if(!window.FT_FACILITATOR_DNA) return;
  const d = window.FT_FACILITATOR_DNA;
  const st = {v2:true, enabled:true, dna:true, guide:d.guide, traits:d.traits.slice(), examples:d.examples.slice(), source:d.source, learnedAt:d.learnedAt, savedAt:new Date().toISOString()};
  if(await sharedSet("settings:feedback-style", st)){ state.fbStyle = st; toast("🧬 Every AI reviewer uses the facilitator’s DNA again."); render(); } else toast("Couldn't save — check your connection.");
}
window.fbUseDna = fbUseDna;
async function fbRemove(i){ const s = daState(); s.fbSamples.items.splice(i, 1); try{ await fbSaveSamples(); render(); }catch(e){ showActionError(e, "Removing"); } }
// Pull in the feedback the trainer has actually written or edited: daily reviews and activity reviews.
async function fbImport(){
  const btn = document.getElementById("fbsImportBtn"); if(btn){ btn.disabled = true; btn.textContent = "Importing…"; }
  try{
    const texts = {review:[], activity:[]};
    const fk = (await sharedList("feedback:")).filter(k => /^feedback:.+/.test(k));
    await runPool(fk, async (k) => { const doc = await sharedGet(k); Object.values((doc && doc.days) || {}).forEach(fb => { if(fb && (fb.editedByTrainer || (fb.status === "sent" && !fb.auto))) texts.review.push(fbSampleText(fb)); }); }, 4);
    const ak = (await sharedList("actsub:")).filter(k => /^actsub:.+/.test(k));
    await runPool(ak, async (k) => { const doc = await sharedGet(k); Object.values((doc && doc.items) || {}).forEach(it => [it && it.feedback, it && it.prevFeedback].forEach(fb => { if(fb && fb.editedByTrainer) texts.activity.push(fbSampleText(fb)); })); }, 4);
    const n = fbAddTexts(texts.review, "review") + fbAddTexts(texts.activity, "activity");
    await fbSaveSamples();
    toast(n ? `Imported ${n} piece(s) of feedback you wrote or edited.` : "No new trainer-written feedback found yet — edit and send a few reviews first, or paste examples.");
    render();
  }catch(e){ showActionError(e, "Importing feedback"); if(btn){ btn.disabled = false; btn.textContent = "⤵ Import feedback you've sent in the portal"; } }
}
async function fbLearn(){
  const s = daState(), items = s.fbSamples.items; if(items.length < 3) return;
  const btn = document.getElementById("fbsLearnBtn"); if(btn){ btn.disabled = true; btn.textContent = "✨ Learning…"; }
  // Newest examples first, capped so the prompt stays a sensible size.
  const pick = items.slice().reverse().reduce((acc, x) => { if(acc.len < 24000){ acc.list.push(x.text); acc.len += x.text.length; } return acc; }, {list:[], len:0}).list;
  const prompt = `Below are real feedback messages one training facilitator wrote to trainees. Study HOW this person writes feedback — tone, structure and wording — not what the trainees did.

Return ONLY JSON (no markdown):
{"guide":"A style guide of 150-250 words written as instructions to another writer (e.g. 'Open with…', 'When pointing out a gap…'). Cover: overall tone and warmth; how they open and close; how they praise (how specific); how they raise problems; sentence length, formality and person (you/we); signature words or short phrases they reuse (quote 3-6); use of the trainee's name, emojis, exclamation marks, bullets or headings; typical length.",
 "traits":["5-8 very short traits, e.g. 'Opens with the trainee's name'"],
 "examples":["3 short feedback passages (70-130 words each) written in this facilitator's voice about GENERIC situations — no real names, companies, clients or details taken from the samples"]}

SAMPLES (${pick.length}):
${pick.map((t, i) => `--- ${i + 1} ---\n${t}`).join("\n")}`;
  try{
    const out = await callAIJson(prompt, 1800, 120000, "trainer");
    if(!out || !out.guide) throw new Error("the AI didn't return a style guide — try again");
    const style = {v2:true, enabled:true, guide:String(out.guide).trim(), traits:(out.traits || []).map(String).slice(0, 8), examples:(out.examples || []).map(String).slice(0, 3), sampleCount:pick.length, learnedAt:new Date().toISOString()};
    if(!(await sharedSet("settings:feedback-style", style))) throw new Error("couldn't save to the server");
    state.fbStyle = style; fbStyleLoadedAt = Date.now();
    toast("🗣 Style learned — all AI feedback now uses this voice."); render();
  }catch(e){ showActionError(e, "Learning the style"); if(btn){ btn.disabled = false; btn.textContent = "✨ Learn the style"; } }
}
async function fbToggle(on){
  const st = Object.assign({}, state.fbStyle || {}, {enabled:!!on, v2:true});
  if(await sharedSet("settings:feedback-style", st)){ state.fbStyle = st; toast(on ? "AI feedback now uses the facilitator's voice." : "Voice switched off — AI feedback uses the default wording."); }
  else toast("Couldn't save — check your connection.");
}
async function fbSaveGuide(){
  const g = (document.getElementById("fbs_guide") || {}).value || "", ex = (document.getElementById("fbs_examples") || {}).value || "";
  if(!g.trim()){ toast("The style guide can't be empty."); return; }
  const st = Object.assign({}, state.fbStyle || {}, {v2:true, guide:g.trim(), examples:ex.split(/\n\s*-{3,}\s*\n/).map(x => x.trim()).filter(Boolean).slice(0, 3), editedAt:new Date().toISOString()});
  if(await sharedSet("settings:feedback-style", st)){ state.fbStyle = st; toast("Saved."); } else toast("Couldn't save — check your connection.");
}
async function fbTry(){
  const box = document.getElementById("fbsTry"); if(!box) return;
  box.innerHTML = `<p class="da-note">Writing a sample review…</p>`;
  const prompt = `You are a facilitator reviewing a trainee's short answer to: "Write a two-line reply to a client who asks when their documents will be ready."
Trainee's answer: "Hi, the documents are being worked on and will be ready soon. Thanks."
Return ONLY JSON: {"summary":"2-3 sentences","strengths":["1-2"],"areasToBuild":["1-2 with how to improve"]}` + fbStyleBlock();
  try{
    const fb = await callAIJson(prompt, 600, 60000, "trainer");
    box.innerHTML = daFeedbackCard({summary:fb.summary, strengths:fb.strengths, areasToBuild:fb.areasToBuild}, "Sample: how feedback now sounds");
  }catch(e){ box.innerHTML = ""; showActionError(e, "Trying the style"); }
}
Object.assign(window, {fbAddPasted, fbUpload, fbRemove, fbImport, fbLearn, fbToggle, fbSaveGuide, fbTry});

(function(){
  const css = `
.admin-tabs{flex-wrap:wrap;row-gap:4px;} .admin-tab-btn{white-space:nowrap;flex:0 0 auto;}
.da-day{margin-bottom:22px;} .da-day-h{color:var(--navy);font-size:16px;margin:0 0 10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.da-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
.da-card{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;padding:16px 18px;cursor:pointer;font:inherit;border:1px solid var(--line);}
.da-card:hover:not([disabled]){border-color:var(--orange);} .da-card.locked{opacity:.6;cursor:not-allowed;}
.da-card-t{font-weight:800;color:var(--navy);font-size:15px;} .da-card-m{font-size:12.5px;color:var(--ink-soft);}
.da-body{padding:18px 22px;margin-bottom:14px;font-size:14.5px;line-height:1.6;} .da-body p{margin:0 0 10px;} .da-body ul{margin:0 0 10px;padding-left:22px;}
.da-files{display:flex;flex-direction:column;align-items:flex-start;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);}
.da-answer{padding:18px 22px;margin-bottom:14px;} .da-textarea{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:12px;border:1px solid var(--line);border-radius:10px;min-height:200px;}
.da-upload{margin-top:12px;font-size:14px;} .da-note{font-size:12.5px;color:var(--ink-soft);}
.da-fb{padding:16px 20px;margin-bottom:14px;border-left:4px solid var(--orange);} .da-fb p{margin:6px 0 8px;font-size:14.5px;}
.da-score{width:100%;border-collapse:collapse;margin:8px 0;font-size:13.5px;} .da-score th,.da-score td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top;}
.da-score th{background:#F4F6FB;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);} .da-score td:first-child{width:28%;} .da-score-n{white-space:nowrap;font-weight:800;color:var(--navy);width:70px;}
.da-score textarea{width:100%;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;} .da-score select{font:inherit;padding:3px 6px;}
.da-score-tot{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;margin:6px 0 10px;} .da-score-tot b{color:var(--navy);}
.da-score-edit{margin-bottom:12px;} .da-desc{font-weight:500;font-size:12px;color:var(--ink-soft);margin-top:4px;} .da-desc summary{cursor:pointer;} .da-desc div{margin:3px 0;}
.da-scoring{margin:6px 0 12px;padding:10px 12px;border:1px dashed var(--line);border-radius:10px;} .da-scoring summary{cursor:pointer;}
.da-crit{margin:4px 0 0 18px;padding:0;font-size:13px;} .da-crit li{margin:2px 0;}
.da-fb-h{display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:800;color:var(--navy);} .da-fb-l{font-size:14px;} .da-fb-l ul{margin:4px 0 8px;padding-left:22px;}
.da-prev{margin-bottom:14px;} .da-prev summary{cursor:pointer;font-weight:700;color:var(--navy);margin-bottom:8px;}
.da-subtabs,.da-review-bar,.da-daychips{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;}
.da-subtabs button,.da-review-bar > button:not(.btn),.da-daychips button{font:inherit;font-size:13px;font-weight:700;border:1px solid var(--line);background:#fff;color:var(--navy);border-radius:999px;padding:6px 14px;cursor:pointer;}
.da-subtabs button.active,.da-review-bar > button.active,.da-daychips button.active{background:var(--navy);color:#fff;border-color:var(--navy);}
.da-daychips b{background:var(--orange);color:#fff;border-radius:999px;padding:0 6px;font-size:11px;margin-left:3px;}
.da-review-bar select{font:inherit;font-size:13px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);}
.da-list{margin-top:10px;display:flex;flex-direction:column;gap:6px;} .da-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--line);border-radius:10px;}
.da-row-t{font-weight:700;flex:1 1 220px;} .da-row-m{font-size:12.5px;color:var(--ink-soft);} .da-row-b{display:flex;gap:4px;}
.da-form,.fbs-card{padding:18px 20px;margin-bottom:14px;} .da-form label,.fbs-card label,.da-rev-f label{display:block;font-weight:700;font-size:13px;color:var(--navy);margin:0 0 10px;}
.da-form label span,.fbs-card label span,.da-rev-f label span{font-weight:500;color:var(--ink-soft);}
.da-form input[type=text],.da-form textarea,.fbs-card textarea,.da-rev-f textarea,.da-rev-f select{display:block;width:100%;box-sizing:border-box;margin-top:4px;font:inherit;font-size:13.5px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;}
.da-form-row{margin:0 0 12px;font-size:13px;} .da-check{display:inline-flex !important;gap:6px;align-items:center;font-weight:600 !important;margin:4px 14px 0 0 !important;}
.da-chip{display:inline-flex;gap:6px;align-items:center;background:#F3F5FB;border-radius:999px;padding:3px 10px;font-size:12.5px;margin:4px 6px 4px 0;} .da-chip button{border:0;background:none;cursor:pointer;color:var(--ink-soft);}
.da-rev{padding:16px 18px;margin-bottom:12px;} .da-rev-h{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px;}
.da-rev summary{cursor:pointer;font-weight:700;color:var(--navy);font-size:13px;} .da-rev-a{background:#F8F9FC;border-radius:10px;padding:10px 12px;margin:8px 0;font-size:14px;max-height:320px;overflow:auto;}
.da-rev-f{margin-top:10px;} .da-rev-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;} @media(max-width:900px){.da-rev-3{grid-template-columns:1fr;}}
.fbs-h{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px;color:var(--navy);} .fbs-traits{margin:0 0 10px;}
.fbs-sample{border-top:1px solid var(--line);padding:8px 0;font-size:13px;display:grid;gap:4px;}`;
  const el = document.createElement("style"); el.id = "da-css"; el.textContent = css; document.head.appendChild(el);
})();

/* ---------------- wiring into the engine: Admin → 🗣 Feedback Style ---------------- */
const __daAdmin = window.renderAdmin;
window.renderAdmin = function(){
  const tabs = `<button class="admin-tab-btn ${state.adminTab === "fbstyle" ? "active" : ""}" onclick="setAdminTab('fbstyle')">🗣 Feedback Style</button>`;
  if(state.adminTab === "activities") state.adminTab = "fbstyle";   // (the old 📝 Activities tab)
  if(state.adminTab === "fbstyle" && state.isAdmin){
    state.adminTab = "opendays";                      // borrow the tab bar…
    const out = __daAdmin.apply(this, arguments);
    state.adminTab = "fbstyle";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tabs + "</div>";
    return bar + renderAdminFeedbackStyle();
  }
  const out = __daAdmin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tabs + out.slice(end) : out;
};
// An old link to the Activities page (#/activities) opens Training Modules.
if(/^#\/activities\b/.test(location.hash)) location.hash = "#/modules";
