/* ============================================================
   Process Questions — each lesson's answer sheet, answered on the platform
   Loaded after js/ft-monitoring.js. ✍️ Process Questions (#/process), the
   lesson's last slide, and a button on its lesson card.
     • Trainees answer each question (saved to process:<id> as they type) and
       submit the sheet. They can save it to their Google Drive with the
       proper name: 📄 Save to My Google Drive copies the answers and opens a
       new Google Doc already named with the sheet's naming convention (in
       their trainee folder once they've saved its link), or ⬇ Download as
       Word gives a file with that name to upload.
     • Admin → ✍️ Process Questions: batch → trainee → each answer sheet
       (submitted or not, how many answered, the answers), and the line for
       the ranking report ("Out of N expected answer sheets, X were submitted").
     • PROCESS_SETS: one per lesson. Add a lesson's questions there.
   ============================================================ */
(function(){
const PROCESS_SETS = [
  {id:"va-essentials", lesson:1, title:"Virtual Assistant Essentials", file:"VA_Essentials_Process_Question_Answers", questions:[
    "Analyze a hypothetical case: A breach of contract with parties in two states. Which court system would have jurisdiction? Why?",
    "Assess the advantages and disadvantages of pursuing a case in federal court instead of state court for a personal injury claim.",
    "Examine the core responsibilities of a Legal VA and compare them with those of an in-house legal assistant. What are the operational implications for the firm?",
    "Scrutinize the challenges that solo attorneys face without VA support. How does a Legal VA help resolve these?",
    "Evaluate how Legal VAs contribute to law firm efficiency and client satisfaction. Which benefit do you think has the greatest long-term impact, and why?",
    "Assess how firm size impacts the level of autonomy, multitasking, and specialization expected of a Legal VA.",
    "Appraise the effectiveness of formal vs. informal communication strategies when working with different types of attorneys.",
    "Analyze the key cultural values in U.S. professional settings (e.g., directness, time orientation, individualism) and compare them with typical Filipino and Latin American values.",
    "Provide a scenario where a VA’s culturally influenced approach leads to miscommunication with a U.S.-based attorney. What were the causes?",
    "Critique the statement: “Filipino and Latin American Legal VAs should completely adopt American communication styles to be effective.”"]}
];
window.FT_PROCESS_SETS = PROCESS_SETS;
const has = v => String(v == null ? "" : v).trim().length > 0;
const e = v => esc(String(v == null ? "" : v));
const firstName = () => String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";
// The sheet's naming convention, with the trainee's first name: VA_Essentials_Process_Question_Answers (Jamie)
const fileName = (set, first) => `${set.file} (${first || firstName() || "VA’s first name"})`;
const folderId = url => { const m = String(url||"").match(/folders\/([a-zA-Z0-9_-]{10,})/) || String(url||"").match(/[?&]id=([a-zA-Z0-9_-]{10,})/); return m ? m[1] : ""; };

/* ---------- the trainee's answers ---------- */
const FP = {id:null, data:null, loading:false, err:"", timer:null, saving:false, savedAt:null, open:{}};
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["process"]);
async function load(id){
  FP.loading = true; FP.err = ""; FP.id = id;
  try{ FP.data = (await sharedGet("process:"+id)) || {v:1, sets:{}}; if(!FP.data.sets) FP.data.sets = {}; }
  catch(err){ FP.err = "Couldn't load your answers. Check your connection and try again."; }
  FP.loading = false;
  if(["process","dashboard","day"].includes(state.view)) render();
}
function sheet(sid){ const s = FP.data.sets; return s[sid] || (s[sid] = {answers:[], submittedAt:"", updatedAt:""}); }
function queueSave(){
  FP.data.updatedAt = new Date().toISOString();
  clearTimeout(FP.timer); FP.saving = true; paintSave();
  FP.timer = setTimeout(async ()=>{ const ok = await sharedSet("process:"+FP.id, FP.data); FP.saving = false; FP.savedAt = ok === false ? null : new Date(); paintSave(ok); }, 1000);
}
function paintSave(ok){ const el = document.getElementById("fpSave"); if(el) el.textContent = FP.saving ? "Saving…" : (ok===false ? "⚠ Not saved. Check your connection." : (FP.savedAt ? "All changes saved" : "")); }
const answered = (set, x) => set.questions.filter((q,i)=>has(((x||{}).answers||[])[i])).length;
function statusOf(set, x){
  if(x && x.submittedAt) return {k:"done", t:"Submitted"};
  return answered(set, x) ? {k:"part", t:"In progress"} : {k:"none", t:"Not started"};
}
const setOpen = set => state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(set.lesson) : true);

// The answers as a document: the same text goes to the clipboard (for a Google Doc) and into the Word file.
function docHtml(set, x, first){
  const name = String(state.certName || state.traineeName || first || "");
  return `<h2>${e(set.title)} — Process Questions</h2><p><b>Name:</b> ${e(name)}<br><b>Date:</b> ${e(new Date().toLocaleDateString())}</p>` +
    set.questions.map((q,i)=>`<p><b>${i+1}. ${e(q)}</b></p><p>${e(((x||{}).answers||[])[i]||"").replace(/\n/g, "<br>")}</p>`).join("");
}
function docText(set, x){
  return `${set.title} — Process Questions\n\n` + set.questions.map((q,i)=>`${i+1}. ${q}\n${((x||{}).answers||[])[i]||""}\n`).join("\n");
}
async function copyRich(html, text){
  try{
    if(navigator.clipboard && window.ClipboardItem && window.isSecureContext){
      await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([html], {type:"text/html"}), "text/plain": new Blob([text], {type:"text/plain"})})]);
      return true;
    }
  }catch(err){}
  try{ await navigator.clipboard.writeText(text); return true; }catch(err){ return false; }
}

function setCard(set){
  const x = FP.data.sets[set.id] || {answers:[]}, s = statusOf(set, FP.data.sets[set.id]), locked = !setOpen(set);
  const open = FP.open[set.id] != null ? FP.open[set.id] : true;
  const name = fileName(set);
  if(locked) return `<div class="card fp-set fp-locked"><div class="fp-head"><b>${e(set.title)}</b><span class="fp-st st-none">🔒 Opens with the lesson</span></div></div>`;
  return `<details class="card fp-set" ${open?"open":""} ontoggle="FTProcess.toggle('${set.id}', this.open)">
    <summary class="fp-head"><b>${e(set.title)}</b><span class="fp-count" id="fpCount-${set.id}">${answered(set, x)} of ${set.questions.length} answered</span><span class="fp-st st-${s.k}" id="fpSt-${set.id}">${s.t}</span></summary>
    <div class="fp-body">
      <div class="fp-name"><span>Naming convention</span><code>${e(name)}</code>
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.copyName('${set.id}')">📋 Copy</button></div>
      <ol class="fp-qs">${set.questions.map((q,i)=>`<li><div class="fp-q">${e(q)}</div>
        <textarea rows="4" placeholder="Your answer, in complete sentences." oninput="FTProcess.set('${set.id}',${i},this.value)">${e((x.answers||[])[i]||"")}</textarea></li>`).join("")}</ol>
      <div class="fp-actions">
        <button class="btn btn-navy btn-sm" type="button" onclick="FTProcess.submit('${set.id}')">${x.submittedAt ? "✓ Submitted · Submit Again" : "Submit My Answers"}</button>
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.toDrive('${set.id}')">📄 Save to My Google Drive</button>
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.word('${set.id}')">⬇ Download as Word</button>
        ${FP.data.folder ? `<a class="btn btn-ghost btn-sm" href="${e(FP.data.folder)}" target="_blank" rel="noopener noreferrer">📁 Open My Trainee Folder</a>` : ""}
      </div>
      ${x.submittedAt ? `<p class="fp-muted">Submitted ${e(new Date(x.submittedAt).toLocaleString())}.</p>` : ""}
      <p class="fp-muted"><b>📄 Save to My Google Drive</b> copies your answers and opens a new Google Doc already named <b>${e(name)}</b>${FP.data.folder ? " in your trainee folder" : ""}. Paste them in with Ctrl+V. <b>⬇ Download as Word</b> gives you the file with the same name, to upload to your trainee folder.</p>
    </div></details>`;
}
function renderPage(){
  if(!state.traineeId && !state.isAdmin) return `<div class="card" style="padding:28px;">Sign in to answer the Process Questions.</div>`;
  if(state.isAdmin && !state.adminPreview) return `<div class="card" style="padding:28px;">Trainees answer the Process Questions here. See every trainee’s answers in <a class="fp-link" onclick="state.adminTab='process'; goto('admin')">Admin → ✍️ Process Questions</a>.</div>`;
  if(FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  if(FP.err) return `<div class="card" style="padding:28px;">${e(FP.err)} <button class="btn btn-ghost btn-sm" onclick="FTProcess.reload()">Try again</button></div>`;
  if(!FP.data) return `<div class="card" style="padding:28px;">Loading your answers…</div>`;
  return `<div class="fp-hero"><h1>✍️ Process Questions</h1>
      <p>Answer every question in complete sentences, then submit. Your answers save as you type. <span class="fp-save" id="fpSave"></span></p></div>
    <div class="card fp-folder">
      <label for="fpFolder"><b>📁 My Trainee Folder</b> <span class="fp-muted">(its Google Drive link, so new documents are created there)</span></label>
      <div class="fp-folder-row"><input id="fpFolder" type="url" placeholder="https://drive.google.com/drive/folders/…" value="${e(FP.data.folder||"")}">
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcess.saveFolder()">Save</button></div>
    </div>
    ${PROCESS_SETS.map(setCard).join("")}`;
}

window.FTProcess = {
  set(sid, i, v){
    const x = sheet(sid); x.answers[i] = v; x.updatedAt = new Date().toISOString(); queueSave();
    const set = PROCESS_SETS.find(s=>s.id===sid), c = document.getElementById("fpCount-"+sid), st = document.getElementById("fpSt-"+sid);
    if(c) c.textContent = `${answered(set, x)} of ${set.questions.length} answered`;
    if(st){ const s = statusOf(set, x); st.className = "fp-st st-"+s.k; st.textContent = s.t; }
  },
  async submit(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid), x = sheet(sid), n = answered(set, x);
    if(n < set.questions.length && !confirm(`You’ve answered ${n} of ${set.questions.length} questions. Submit anyway?`)) return;
    x.submittedAt = new Date().toISOString(); queueSave();
    toast(`✓ ${set.title} Process Questions submitted.`); render();
  },
  copyName(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid); const t = fileName(set);
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(()=>toast("Copied. Use it as your file name."), ()=>toast("Couldn’t copy. Select the name instead."));
  },
  // Copies the answers, then opens a new Google Doc with the proper name (in the trainee folder if it's saved).
  async toDrive(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid), x = sheet(sid);
    const tab = window.open("about:blank", "_blank");
    const ok = await copyRich(docHtml(set, x), docText(set, x));
    const q = new URLSearchParams({title: fileName(set)}); const f = folderId(FP.data.folder); if(f) q.set("folder", f);
    const url = "https://docs.google.com/document/create?" + q;
    if(tab) tab.location.href = url; else window.open(url, "_blank");
    toast(ok ? "Your answers are copied. Paste them into the new Google Doc with Ctrl+V." : "The Google Doc is open. Copy your answers from here and paste them in.");
  },
  word(sid){
    const set = PROCESS_SETS.find(s=>s.id===sid), x = sheet(sid);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${e(fileName(set))}</title></head><body style="font-family:Arial,sans-serif;font-size:11pt;">${docHtml(set, x)}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿", html], {type:"application/msword"}));
    a.download = fileName(set) + ".doc"; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  },
  saveFolder(){
    const v = String((document.getElementById("fpFolder")||{}).value || "").trim();
    if(v && !/^https:\/\/drive\.google\.com\//.test(v)){ toast("Paste your trainee folder’s Google Drive link (it starts with https://drive.google.com/)."); return; }
    FP.data.folder = v; queueSave(); toast(v ? "Trainee folder saved." : "Trainee folder removed."); render();
  },
  toggle(sid, open){ FP.open[sid] = open; },
  reload(){ FP.id = null; FP.err = ""; render(); }
};

/* ---------- the lesson: its last slide, and a button on its card ---------- */
PROCESS_SETS.forEach(set=>{
  const d = DAYS.find(x=>x.id===set.lesson); if(!d || d.sections.some(s=>s.id==="process-questions")) return;
  d.sections.push({id:"process-questions", h:"Process Questions", get html(){
    const audience = typeof PV_IS_AUDIENCE !== "undefined" && PV_IS_AUDIENCE;
    return `<div class="fp-slide"><p class="fp-lead">Answer these questions in complete sentences, on the platform, and submit your answers.</p>
      <ol class="fp-slide-qs">${set.questions.map(q=>`<li>${e(q)}</li>`).join("")}</ol>
      <p class="fp-lead"><b>Naming convention:</b> <code>${e(fileName(set, audience ? "VA’s first name" : ""))}</code></p>
      ${audience ? "" : `<div class="fp-actions"><button class="btn btn-navy btn-sm" type="button" onclick="goto('process')">✍️ Answer the Process Questions</button></div>`}</div>`;
  }});
  d.lessons = d.sections.map(x=>({h:x.h}));
});
// Lesson cards show only Start and ▶ Video Presentation: the Process Questions open from the lesson's last slide.

/* ---------- admin: every trainee's answer sheets ---------- */
const FPA = {rows:null, loading:false, open:{}, sheetOpen:{}, closed:{}};
async function loadAdmin(){
  FPA.loading = true;
  try{
    const keys = (await sharedList("process:")) || [];
    const rows = await Promise.all(keys.map(k=>String(k).replace(/^process:/, "")).map(async id=>{
      const [rec, p] = await Promise.all([sharedGet("trainee:"+id), sharedGet("process:"+id)]);
      return {id, name:(rec&&rec.name)||id, batch:(rec&&rec.batch)||"", archived:!!(rec&&rec.archived), p:p||{sets:{}}};
    }));
    FPA.rows = rows.filter(x=>!x.archived).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  }catch(err){ FPA.rows = []; }
  FPA.loading = false;
  if(state.view==="admin" && state.adminTab==="process") render();
}
// The ranking report's line, in the facilitator's words.
function reportLine(x){
  const sets = PROCESS_SETS, done = sets.filter(s=>((x.p.sets||{})[s.id]||{}).submittedAt);
  const missing = sets.filter(s=>!done.includes(s));
  const partial = done.filter(s=>answered(s, x.p.sets[s.id]) < s.questions.length);
  if(!missing.length) return "Process Questions Responses: COMPLETE" + (partial.length ? "; however, " + partial.map(s=>{ const a = x.p.sets[s.id]; const left = s.questions.map((q,i)=>i+1).filter(i=>!has((a.answers||[])[i-1])); return `Item${left.length>1?"s":""} #${left.join(", #")} under the ${s.title} answer sheet ${left.length>1?"were":"was"} left unanswered`; }).join("; ") + "." : "");
  return `Process Questions Responses:\nOut of ${sets.length} expected answer sheet${sets.length===1?"":"s"}, ${done.length} ${done.length===1?"was":"were"} submitted. The following answer sheet${missing.length===1?" is":"s are"} missing:\n` + missing.map(s=>`- ${s.title}`).join("\n");
}
function renderAdminProcess(){
  if(!FPA.rows && !FPA.loading) loadAdmin();
  if(!FPA.rows) return `<div class="card" style="padding:24px;">Loading the answer sheets…</div>`;
  const groups = {}; FPA.rows.forEach(x=>{ (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a,b)=>(a==="")-(b==="") || b.localeCompare(a, undefined, {numeric:true}));
  return `<div class="card fp-admin"><h3>✍️ Process Questions</h3>
    <p class="fp-muted">Each trainee’s answer sheets, by batch: submitted or not, how many questions are answered, and the answers. The line under each trainee is written for the ranking report.</p>
    ${FPA.rows.length ? keys.map(b=>{ const closed = !!FPA.closed[b];
      return `<section class="fp-batch"><div class="fp-batch-hd" onclick="FTProcessAdmin.batch(${e(JSON.stringify(b))})">${closed?"▸":"▾"} <b>📁 ${e(b ? "Batch "+b : "No batch set")}</b> <span class="fp-muted">${groups[b].length} trainee${groups[b].length===1?"":"s"}</span></div>
      ${closed ? "" : groups[b].map(x=>{ const open = !!FPA.open[x.id], sub = PROCESS_SETS.filter(s=>((x.p.sets||{})[s.id]||{}).submittedAt).length;
        return `<div class="fp-arow"><div class="fp-arow-hd" onclick="FTProcessAdmin.row('${x.id}')">${open?"▾":"▸"} <b>${e(x.name)}</b> <span class="fp-pill ${sub===PROCESS_SETS.length?"ok":sub?"mid":"bad"}">${sub} of ${PROCESS_SETS.length} submitted</span></div>
          ${open ? `<pre class="fp-report">${e(reportLine(x))}</pre>
            <button class="btn btn-ghost btn-sm" type="button" onclick="FTProcessAdmin.copy('${x.id}')">📋 Copy for the Report</button>
            ${PROCESS_SETS.map(s=>{ const a = (x.p.sets||{})[s.id], st = statusOf(s, a), k = x.id+"|"+s.id;
              return `<div class="fp-asheet"><div class="fp-asheet-hd" onclick="FTProcessAdmin.sheet('${x.id}','${s.id}')">${FPA.sheetOpen[k]?"▾":"▸"} ${e(s.title)} <span class="fp-st st-${st.k}">${st.t}</span> <span class="fp-muted">${answered(s, a)} of ${s.questions.length} answered${a && a.submittedAt ? ` · ${e(new Date(a.submittedAt).toLocaleDateString())}` : ""}</span></div>
                ${FPA.sheetOpen[k] ? `<ol class="fp-aans">${s.questions.map((q,i)=>`<li><b>${e(q)}</b><div>${has(((a||{}).answers||[])[i]) ? e(a.answers[i]).replace(/\n/g, "<br>") : '<span class="fp-muted">(unanswered)</span>'}</div></li>`).join("")}</ol>` : ""}</div>`; }).join("")}` : ""}</div>`; }).join("")}</section>`; }).join("")
      : `<div class="fp-muted" style="margin:14px 0;">No trainee has started the Process Questions yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTProcessAdmin.refresh()">Refresh</button></div></div>`;
}
window.FTProcessAdmin = {
  row(id){ FPA.open[id] = !FPA.open[id]; render(); },
  sheet(id, sid){ const k = id+"|"+sid; FPA.sheetOpen[k] = !FPA.sheetOpen[k]; render(); },
  batch(b){ FPA.closed[b] = !FPA.closed[b]; render(); },
  refresh(){ FPA.rows = null; render(); },
  copy(id){ const x = FPA.rows.find(r=>r.id===id); if(!x) return;
    (navigator.clipboard ? navigator.clipboard.writeText(reportLine(x)) : Promise.reject()).then(()=>toast("Copied."), ()=>toast("Couldn’t copy. Select the text instead.")); }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="process") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-process">${renderPage()}</main>` + renderFooter();
  paintSave();
  try{ afterRender(); }catch(err){}
};
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab==="process"?"active":""}" onclick="setAdminTab('process')">✍️ Process Questions</button>`;
  if(state.adminTab==="process"){
    state.adminTab = "opendays";                   // borrow the tab bar…
    let out = __admin.apply(this, arguments);
    state.adminTab = "process";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>";
    return bar + renderAdminProcess();
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
};
// A trainee's answers load with the dashboard, so the lesson card and the slide know them.
const __dash = window.renderDashboard;
window.renderDashboard = function(){
  if(state.traineeId && !state.isAdmin && FP.id !== state.traineeId && !FP.loading) load(state.traineeId);
  return __dash.apply(this, arguments);
};

(function(){ const s = document.createElement("style"); s.id = "ft-process"; s.textContent = `
main.main-process{max-width:1000px;margin:0 auto;padding:24px 16px 40px;}
.fp-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;} .fp-hero p{margin:0 0 14px;color:var(--ink-soft);font-size:15px;}
.fp-save{margin-left:6px;font-size:13px;color:var(--success);}
.fp-muted{color:var(--ink-soft);font-size:13.5px;} .fp-link{cursor:pointer;color:var(--orange-deep);font-weight:700;}
.fp-folder{padding:12px 16px;margin-bottom:14px;font-size:15px;} .fp-folder label{display:block;margin-bottom:6px;color:var(--navy);}
.fp-folder-row{display:flex;gap:8px;} .fp-folder-row input{flex:1;min-width:0;font:inherit;font-weight:500;font-size:14.5px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;}
.fp-set{padding:0;margin-bottom:12px;overflow:hidden;} .fp-locked{opacity:.65;}
.fp-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px;cursor:pointer;list-style:none;font-size:16px;color:var(--navy);}
.fp-head::-webkit-details-marker{display:none;} .fp-head b{flex:1;min-width:0;}
.fp-count{font-size:13px;color:var(--ink-soft);}
.fp-st{font-size:12.5px;border-radius:999px;padding:3px 10px;} .fp-st.st-none{background:var(--bg);color:var(--ink-soft);} .fp-st.st-part{background:#FEF7C3;color:#7a5d00;} .fp-st.st-done{background:var(--success-bg);color:var(--success);}
.fp-body{border-top:1px solid var(--line);padding:12px 16px 16px;}
.fp-name{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#FBEBDD;border:1px solid var(--orange-soft);border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:14px;}
.fp-name span{font-weight:800;color:var(--orange-deep);} .fp-name code, .fp-slide code{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:14px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:2px 8px;overflow-wrap:anywhere;}
.fp-qs{margin:0;padding-left:30px;} .fp-qs li{margin:12px 0;} .fp-q{font-size:15px;color:var(--ink);margin-bottom:6px;}
.fp-qs textarea{width:100%;box-sizing:border-box;font:inherit;font-weight:500;font-size:15px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;resize:vertical;background:#fff;}
.fp-qs textarea:focus, .fp-folder-row input:focus{outline:2px solid var(--orange-soft);border-color:var(--orange);}
.fp-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 8px;} .fp-actions a.btn{text-decoration:none;}
.fp-slide .fp-lead{font-size:15.5px;margin:0 0 10px;} .fp-slide-qs{margin:0 0 12px;padding-left:34px !important;font-size:15px;} .fp-slide-qs li{margin:5px 0;}
.lesson-card .fp-slide ol{list-style:decimal;} .lesson-card .fp-slide ol > li{padding-left:2px;text-align:left;}
.lesson-stage #lessonSlideWrap .lesson-card .fp-slide ol > li::before, .lesson-card .fp-slide ol > li::before{content:none;display:none;}
.lesson-stage #lessonSlideWrap .lesson-card .fp-slide li{text-align:left;}
.fp-admin{padding:18px 20px;} .fp-admin h3{margin:0 0 4px;color:var(--navy);}
.fp-batch{margin-top:12px;} .fp-batch-hd{cursor:pointer;padding:6px 0;color:var(--navy);font-size:15px;}
.fp-arow{border:1px solid var(--line);border-radius:10px;margin:6px 0;padding:8px 12px;background:#fff;}
.fp-arow-hd{cursor:pointer;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:15px;color:var(--navy);}
.fp-pill{border-radius:999px;padding:2px 9px;font-size:12.5px;} .fp-pill.ok{background:var(--success-bg);color:var(--success);} .fp-pill.mid{background:#FEF7C3;color:#7a5d00;} .fp-pill.bad{background:var(--danger-bg);color:var(--danger);}
.fp-report{white-space:pre-wrap;font-family:inherit;font-size:14px;background:var(--bg);border-radius:8px;padding:10px 12px;margin:8px 0;}
.fp-asheet{border-top:1px solid var(--line);margin-top:8px;padding-top:8px;} .fp-asheet-hd{cursor:pointer;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:14.5px;color:var(--navy);}
.fp-aans{margin:8px 0 0;padding-left:22px;font-size:14px;} .fp-aans li{margin:8px 0;} .fp-aans li div{font-weight:500;margin-top:3px;}
`; document.head.appendChild(s); })();
})();
