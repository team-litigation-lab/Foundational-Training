/* ============================================================
   Training Monitoring Sheet — filled in on the platform
   Loaded after js/ft-tracker.js. 📒 Monitoring Sheet in the top bar (#/monitoring).
     • Trainees: one entry per classroom discussion, as in the Word sheet
       (MON_DOC): the date, 5 Major Takeaways from This Discussion,
       3 Questions That You Still Have, and Rate Your Understanding.
       It saves to their account (monitor:<id>) as they type.
     • Admin → 📒 Monitoring Sheets: batch → trainee → each discussion, with
       automated feedback. The feedback comes from fixed checks (MON_RULES)
       on what the trainee wrote and on the discussion's key points; no AI
       writes it. The trainer's metrics go in MON_RULES when they're provided.
     • Admin → 📒 Monitoring Sheets → Discussions and key points: the list of
       discussions (settings:monitor, everyone reads it), each with optional key
       points the takeaways should mention. Defaults: MON_DEFAULT_TOPICS.
   ============================================================ */
(function(){
// The Word version of the sheet, on Drive: embedded in the pop-out viewer, and downloadable.
const MON_DOC = {view:"https://drive.google.com/file/d/1bCi0oCAR9Xc83--_SZzS0CIxxp3TGuL3/view",
  open:"https://docs.google.com/document/d/1bCi0oCAR9Xc83--_SZzS0CIxxp3TGuL3/edit?usp=drive_link&ouid=118231985581105611442&rtpof=true&sd=true"};
window.FT_MONITOR_DOC = MON_DOC;

// The classroom discussions (the Hubstaff To-Dos), until the trainer sets the list in Admin.
const MON_DEFAULT_TOPICS = ["Virtual Assistant Essentials - Day 1", "Virtual Assistant Essentials - Day 2",
  "Reception Training Day 1", "Reception Training Day 2", "Reception Training Day 3", "Calendar Management Training",
  "Intake Training Day 1", "Intake Training Day 2", "Intake Training Day 3",
  "Insurance Communication Training Day 1", "Insurance Communication Training Day 2", "Insurance Communication Training Day 3",
  "Provider Communication Training Day 1", "Provider Communication Training Day 2", "Provider Communication Training Day 3", "Provider Communication Training Day 4",
  "Lien Negotiator Training Day 1", "Lien Negotiator Training Day 2"];
const RATINGS = ["I really don’t get this. I need extra help.", "I think I can do this on my own but I am still not sure.",
  "I am confident that I can do this on my own.", "I definitely can do this and I can teach this to others!"];
const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "topic";
const topicsFrom = list => list.map(x => typeof x === "string" ? {id: slug(x), title: x, keys: []} : x);
const has = v => String(v == null ? "" : v).trim().length > 0;
const words = v => String(v || "").trim().split(/\s+/).filter(Boolean).length;
const e = v => esc(String(v == null ? "" : v));
// "takeaway 2" / "takeaways 1 and 4" / "takeaways 1, 3 and 4"
const nums = a => (a.length === 1 ? "takeaway " : "takeaways ") + (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length-1]);

/* ---------- the automated feedback: fixed checks, no AI ----------
   Each rule: run(entry, topic) → {na} when it doesn't apply, else {pass, detail, fix}.
   "fix" is the feedback line for the trainee. Add the trainer's metrics here. */
const GENERAL = /^(i\s+)?(have\s+)?(learned|learnt|understood|understand|know|knew|discussed|studied|was taught)\b/i;
const MON_RULES = [
  {id:"date", label:"Date filled in", run:(x)=> has(x.date) ? {pass:true} : {pass:false, detail:"No date.", fix:"Add the date the topic was covered."}},
  {id:"five", label:"All 5 takeaways written", run:(x)=>{
    const n = (x.takeaways||[]).filter(has).length;
    return n >= 5 ? {pass:true, detail:"5 of 5."} : {pass:false, detail:`${n} of 5.`, fix:`Write all 5 takeaways, not just ${n}.`};
  }},
  {id:"sentences", label:"Complete sentences", run:(x)=>{
    const t = (x.takeaways||[]).map((v,i)=>({v:String(v||"").trim(), n:i+1})).filter(o=>o.v);
    if(!t.length) return {na:true};
    const bad = t.filter(o => words(o.v) < 4 || !/^[A-Z0-9“"(]/.test(o.v) || !/[.!?)”"]$/.test(o.v));
    const n = bad.map(o=>o.n);
    return bad.length ? {pass:false, detail:`${nums(n).replace(/^t/, "T")}.`, fix:`Write ${nums(n)} as ${bad.length===1?"a complete sentence":"complete sentences"}: a capital letter at the start, a period at the end, and not just a word or a phrase.`}
      : {pass:true};
  }},
  {id:"specific", label:"Specific, not general", run:(x)=>{
    const t = (x.takeaways||[]).map((v,i)=>({v:String(v||"").trim(), n:i+1})).filter(o=>o.v);
    if(!t.length) return {na:true};
    const gen = t.filter(o => words(o.v) < 7 || (GENERAL.test(o.v) && words(o.v) < 16));   // too short to be specific, or "I learned about …"
    const n = gen.map(o=>o.n);
    return gen.length ? {pass:false, detail:`${nums(n).replace(/^t/, "T")}.`, fix:`Make ${nums(n)} specific: say what you learned and how it works or why it matters, not just the topic (not “I learned about auto liability.”).`}
      : {pass:true};
  }},
  {id:"discussion", label:"Based on the discussion", run:(x, topic)=>{
    const keys = (topic && topic.keys || []).filter(has);
    if(!keys.length) return {na:true};
    const text = (x.takeaways||[]).join(" ").toLowerCase();
    const hit = keys.filter(k => text.includes(String(k).toLowerCase().trim()));
    const need = Math.ceil(keys.length / 2);
    return hit.length >= need ? {pass:true, detail:`${hit.length} of ${keys.length} key points.`}
      : {pass:false, detail:`${hit.length} of ${keys.length} key points.`, fix:`Base your takeaways on the discussion. Cover its key points, such as ${keys.filter(k=>!hit.includes(k)).slice(0,3).join(", ")}.`};
  }},
  {id:"rating", label:"Understanding rated", run:(x)=> x.rating ? {pass:true, detail:RATINGS[x.rating-1]} : {pass:false, detail:"Not rated.", fix:"Rate your understanding of the topic."}}
];
function started(x){ return !!x && (has(x.date) || (x.takeaways||[]).some(has) || (x.questions||[]).some(has) || !!x.rating); }
function review(x, topic){
  const results = MON_RULES.map(r => Object.assign({id:r.id, label:r.label}, r.run(x||{}, topic)));
  const on = results.filter(r => !r.na);
  const pct = on.length ? Math.round(100 * on.filter(r => r.pass).length / on.length) : 0;
  return {results, pct, fixes: on.filter(r => !r.pass && r.fix).map(r => r.fix), needsHelp: x && x.rating === 1};
}
// Filled = every part filled in (the date, all 5 takeaways, the rating); the checks judge the quality.
function statusOf(x){
  if(!started(x)) return {k:"none", t:"Not started"};
  const full = has(x.date) && (x.takeaways||[]).filter(has).length >= 5 && !!x.rating;
  return full ? {k:"done", t:"Filled"} : {k:"part", t:"In progress"};
}

/* ---------- the trainee's sheet ---------- */
const FTM = {id:null, data:null, loading:false, err:"", timer:null, saving:false, savedAt:null, topics:null, open:{}};
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["monitoring"]);
async function loadTopics(){
  const s = await sharedGet("settings:monitor").catch(()=>null);
  FTM.topics = topicsFrom(s && Array.isArray(s.topics) && s.topics.length ? s.topics : MON_DEFAULT_TOPICS);
  return FTM.topics;
}
async function load(id){
  FTM.loading = true; FTM.err = ""; FTM.id = id;
  try{
    await loadTopics();
    FTM.data = (await sharedGet("monitor:"+id)) || {v:1, entries:{}};
    if(!FTM.data.entries) FTM.data.entries = {};
  }catch(err){ FTM.err = "Couldn't load your Monitoring Sheet. Check your connection and try again."; }
  FTM.loading = false;
  if(state.view==="monitoring" || state.view==="dashboard") render();
}
function entry(tid){ const d = FTM.data.entries; return d[tid] || (d[tid] = {date:"", takeaways:["","","","",""], questions:["","",""], rating:0}); }
function queueSave(){
  FTM.data.updatedAt = new Date().toISOString();
  clearTimeout(FTM.timer); FTM.saving = true; paintSave();
  FTM.timer = setTimeout(async ()=>{
    const ok = await sharedSet("monitor:"+FTM.id, FTM.data);
    FTM.saving = false; FTM.savedAt = ok === false ? null : new Date(); paintSave(ok);
  }, 1000);
}
function paintSave(ok){
  const el = document.getElementById("ftmSave"); if(!el) return;
  el.textContent = FTM.saving ? "Saving…" : (ok===false ? "⚠ Not saved. Check your connection." : (FTM.savedAt ? "All changes saved" : ""));
}
function paintStatus(tid){
  const t = FTM.topics.find(x=>x.id===tid), s = statusOf(FTM.data.entries[tid], t);
  const el = document.getElementById("ftmSt-"+tid); if(el){ el.className = "ftm-st st-"+s.k; el.textContent = s.t; }
  const c = document.getElementById("ftmCount"); if(c) c.textContent = countLine();
}
function countLine(){
  const done = FTM.topics.filter(t=>statusOf(FTM.data.entries[t.id], t).k==="done").length;
  return `${done} of ${FTM.topics.length} discussions filled`;
}
function topicCard(t, i){
  const x = FTM.data.entries[t.id] || {takeaways:[], questions:[]}, s = statusOf(FTM.data.entries[t.id], t);
  const open = FTM.open[t.id] != null ? FTM.open[t.id] : (s.k === "part");
  return `<details class="card ftm-topic" ${open?"open":""} ontoggle="FTMon.toggle('${t.id}', this.open)">
    <summary><span class="ftm-n">${i+1}</span><b>${e(t.title)}</b><span class="ftm-st st-${s.k}" id="ftmSt-${t.id}">${s.t}</span></summary>
    <div class="ftm-sheet">
      <div class="ftm-row"><label class="ftm-date">Date: <input type="date" value="${e(x.date||"")}" oninput="FTMon.set('${t.id}','date',this.value)"></label></div>
      <div class="ftm-row"><div class="ftm-h">5 Major Takeaways From This Discussion:</div>
        <ol class="ftm-list">${[0,1,2,3,4].map(k=>`<li><textarea rows="2" placeholder="A complete, specific sentence about what you learned." oninput="FTMon.set('${t.id}','takeaways',this.value,${k})">${e((x.takeaways||[])[k]||"")}</textarea></li>`).join("")}</ol></div>
      <div class="ftm-row"><div class="ftm-h">3 Questions That You Still Have:</div>
        <ol class="ftm-list">${[0,1,2].map(k=>`<li><input type="text" placeholder="${k?"":"No questions? Write “None”."}" value="${e((x.questions||[])[k]||"")}" oninput="FTMon.set('${t.id}','questions',this.value,${k})"></li>`).join("")}</ol></div>
      <div class="ftm-row"><div class="ftm-h">Rate Your Understanding. Choose the statement that best represents your understanding.</div>
        <div class="ftm-rate" id="ftmRate-${t.id}">${RATINGS.map((r,k)=>`<button type="button" class="${x.rating===k+1?"on":""}" onclick="FTMon.rate('${t.id}',${k+1})">${e(r)}</button>`).join("")}</div></div>
    </div></details>`;
}
function renderPage(){
  if(!state.traineeId && !state.isAdmin) return `<div class="card" style="padding:28px;">Sign in to open your Monitoring Sheet.</div>`;
  if(state.isAdmin && !state.adminPreview) return `<div class="card" style="padding:28px;">Trainees fill in their own sheet here. See every trainee’s sheet, with the automated feedback, in <a class="ftm-link" onclick="state.adminTab='monitor'; goto('admin')">Admin → 📒 Monitoring Sheets</a>.</div>`;
  if(FTM.id !== state.traineeId && !FTM.loading) load(state.traineeId);
  if(FTM.err) return `<div class="card" style="padding:28px;">${e(FTM.err)} <button class="btn btn-ghost btn-sm" onclick="FTMon.reload()">Try again</button></div>`;
  if(!FTM.data || !FTM.topics) return `<div class="card" style="padding:28px;">Loading your Monitoring Sheet…</div>`;
  return `<div class="ftm-hero"><h1>📒 Training Monitoring Sheet</h1>
      <p>Update it within the shift, as soon as a topic is fully covered. It saves as you type. <span class="ftm-save" id="ftmSave"></span></p>
      <div class="ftm-actions"><span class="ftm-count" id="ftmCount">${countLine()}</span>
        <a class="btn btn-ghost btn-sm viewer-link" data-kind="doc" data-title="Training Monitoring Sheet" href="${e(MON_DOC.view)}">📄 View the Word Version</a>
        <a class="btn btn-ghost btn-sm" href="${e(MON_DOC.open)}" target="_blank" rel="noopener noreferrer">Download ↗</a></div></div>
    <div class="card ftm-how">
      <b>For Each Discussion</b>
      <ul><li>Fill in the date the topic was covered.</li>
        <li>Write all 5 takeaways, not just 2, 3 or 4, in complete, specific sentences. A simple sentence will do, but not just a word or a phrase.</li>
        <li>Base your takeaways on the discussion.</li></ul>
      <div class="ftm-eg"><div>❌ <b>General:</b> “I learned about auto liability.”</div><div>✅ <b>Specific:</b> “Auto liability insurance covers damages and injuries caused to others in an accident where the policyholder is at fault, including both bodily injury and property damage.”</div></div>
    </div>
    ${FTM.topics.map(topicCard).join("")}`;
}

window.FTMon = {
  set(tid, field, v, k){
    const x = entry(tid);
    if(field === "date") x.date = v; else { x[field] = x[field] || []; x[field][k] = v; }
    queueSave(); paintStatus(tid);
  },
  rate(tid, n){
    const x = entry(tid); x.rating = x.rating === n ? 0 : n; queueSave();
    const g = document.getElementById("ftmRate-"+tid);
    if(g) [...g.children].forEach((b,i)=>b.classList.toggle("on", x.rating === i+1));
    paintStatus(tid);
  },
  toggle(tid, open){ FTM.open[tid] = open; },
  reload(){ FTM.id = null; FTM.err = ""; render(); }
};

/* ---------- admin: every trainee's sheet, with the automated feedback ---------- */
const FMA = {rows:null, loading:false, open:{}, topicOpen:{}, closed:{}, editing:false, draft:""};
async function loadAdmin(){
  FMA.loading = true;
  try{
    await loadTopics();
    const keys = (await sharedList("monitor:")) || [];
    const ids = keys.map(k=>String(k).replace(/^monitor:/, ""));
    const rows = await Promise.all(ids.map(async id=>{
      const [rec, m] = await Promise.all([sharedGet("trainee:"+id), sharedGet("monitor:"+id)]);
      return {id, name:(rec&&rec.name)||id, batch:(rec&&rec.batch)||"", archived:!!(rec&&rec.archived), m:m||{entries:{}}};
    }));
    FMA.rows = rows.filter(x=>!x.archived).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
  }catch(err){ FMA.rows = []; }
  FMA.loading = false;
  if(state.view==="admin" && state.adminTab==="monitor") render();
}
function traineeStats(x){
  const list = FTM.topics.map(t=>({t, x:(x.m.entries||{})[t.id]})).filter(o=>started(o.x));
  const rv = list.map(o=>review(o.x, o.t));
  return {started:list.length, filled:list.filter(o=>statusOf(o.x, o.t).k==="done").length,
    avg: rv.length ? Math.round(rv.reduce((a,r)=>a+r.pct,0)/rv.length) : null, help: rv.filter(r=>r.needsHelp).length};
}
function feedbackText(name, t, r){
  if(!r.fixes.length) return `${t.title}: well done. Your entry meets every check.`;
  return `${t.title}:\n` + r.fixes.map(f=>`- ${f}`).join("\n");
}
function entryReport(x, t, rowId){
  const r = review(x, t), key = rowId+"|"+t.id, open = !!FMA.topicOpen[key];
  return `<div class="ftm-arep">
    <div class="ftm-arep-hd" onclick="FTMonAdmin.topic('${rowId}','${t.id}')"><span class="ftt-caret">${open?"▾":"▸"}</span> <b>${e(t.title)}</b>
      <span class="ftm-pill ${r.pct>=100?"ok":r.pct>=60?"mid":"bad"}">${r.pct}%</span>${r.needsHelp?` <span class="ftm-help">Needs extra help</span>`:""}
      <span class="ftm-muted">${e(x.date ? TRDate(x.date) : "no date")}</span></div>
    ${open ? `<div class="ftm-arep-body">
      <div class="ftm-checks">${r.results.filter(c=>!c.na).map(c=>`<div class="${c.pass?"ok":"bad"}">${c.pass?"✅":"❌"} ${e(c.label)}${c.detail?` <small>${e(c.detail)}</small>`:""}</div>`).join("")}</div>
      <div class="ftm-afb"><b>Automated Feedback</b><pre>${e(feedbackText("", t, r))}</pre>
        <button class="btn btn-ghost btn-sm" type="button" onclick="FTMonAdmin.copy('${rowId}','${t.id}')">📋 Copy Feedback</button></div>
      <div class="ftm-awrote"><b>What They Wrote</b>
        <ol>${(x.takeaways||[]).map(v=>`<li>${has(v)?e(v):'<span class="ftm-muted">(empty)</span>'}</li>`).join("")}</ol>
        <b>Questions They Still Have</b>
        <ol>${(x.questions||[]).filter(has).map(v=>`<li>${e(v)}</li>`).join("") || '<li class="ftm-muted">None</li>'}</ol></div>
    </div>` : ""}</div>`;
}
function TRDate(iso){ const [y,m,d] = String(iso).split("-"); return y && m && d ? `${m}/${d}/${y}` : iso; }
function renderAdminMonitor(){
  if(!FMA.rows && !FMA.loading) loadAdmin();
  if(!FMA.rows) return `<div class="card" style="padding:24px;">Loading the Monitoring Sheets…</div>`;
  const groups = {}; FMA.rows.forEach(x=>{ (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a,b)=>(a==="")-(b==="") || b.localeCompare(a, undefined, {numeric:true}));
  const batches = keys.map(b=>{
    const closed = !!FMA.closed[b];
    return `<section class="ftm-batch"><div class="ftm-batch-hd" onclick="FTMonAdmin.batch(${e(JSON.stringify(b))})"><span class="ftt-caret">${closed?"▸":"▾"}</span> <b>📁 ${e(b ? "Batch "+b : "No batch set")}</b> <span class="ftm-muted">${groups[b].length} trainee${groups[b].length===1?"":"s"}</span></div>
      ${closed ? "" : `<table class="ftm-atable"><thead><tr><th>Trainee</th><th>Filled</th><th>Average score</th><th>Needs extra help</th></tr></thead><tbody>
      ${groups[b].map(x=>{ const s = traineeStats(x), open = !!FMA.open[x.id];
        const list = FTM.topics.map(t=>({t, x:(x.m.entries||{})[t.id]})).filter(o=>started(o.x));
        return `<tr class="ftm-trow" onclick="FTMonAdmin.row('${x.id}')"><td><span class="ftt-caret">${open?"▾":"▸"}</span> <b>${e(x.name)}</b></td>
          <td>${s.filled} of ${FTM.topics.length}${s.started>s.filled?` <small class="ftm-muted">(${s.started-s.filled} in progress)</small>`:""}</td>
          <td>${s.avg==null?"—":`<span class="ftm-pill ${s.avg>=100?"ok":s.avg>=60?"mid":"bad"}">${s.avg}%</span>`}</td>
          <td>${s.help ? `<span class="ftm-help">${s.help}</span>` : '<span class="ftm-muted">—</span>'}</td></tr>
          ${open ? `<tr><td colspan="4">${list.length ? list.map(o=>entryReport(o.x, o.t, x.id)).join("") : '<div class="ftm-muted" style="padding:6px 0;">Nothing filled in yet.</div>'}</td></tr>` : ""}`; }).join("")}
      </tbody></table>`}</section>`; }).join("");
  const topicsText = FTM.topics.map(t=>t.title + (t.keys && t.keys.length ? " | " + t.keys.join(", ") : "")).join("\n");
  return `<div class="card ftm-admin">
    <h3>📒 Monitoring Sheets</h3>
    <p class="ftm-muted">Each trainee’s Training Monitoring Sheet, by batch. The feedback is automated from fixed checks on what they wrote and on the discussion’s key points (no AI writes it): the date, all 5 takeaways, complete sentences, specific rather than general, based on the discussion, and the understanding rating. Click a trainee, then a discussion, for the checks, the feedback to copy, and what they wrote.</p>
    ${FMA.rows.length ? batches : `<div class="ftm-muted" style="margin:14px 0;">No active trainee has started their Monitoring Sheet yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTMonAdmin.refresh()">Refresh</button></div>
  </div>
  <details class="card ftm-admin" ${FMA.editing?"open":""} ontoggle="FTMonAdmin.edit(this.open)">
    <summary><b>Discussions and Key Points</b> <span class="ftm-muted">— the sheet’s discussions, and what each one’s takeaways should cover</span></summary>
    <p class="ftm-muted">One discussion per line. Add its key points after a “|”, separated by commas, e.g. <code>Intake Training Day 1 | statute of limitations, conflict check, retainer</code>. The “Based on the discussion” check passes when the takeaways mention at least half of them. A renamed discussion starts a new entry, so keep titles as they are once trainees have started.</p>
    <textarea id="ftmTopics" class="ftm-topics" rows="14">${e(FMA.draft || topicsText)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;"><button class="btn btn-navy btn-sm" onclick="FTMonAdmin.saveTopics()">Save</button><button class="btn btn-ghost btn-sm" onclick="FTMonAdmin.resetTopics()">Use the Default List</button></div>
  </details>`;
}
window.FTMonAdmin = {
  row(id){ FMA.open[id] = !FMA.open[id]; render(); },
  topic(id, tid){ const k = id+"|"+tid; FMA.topicOpen[k] = !FMA.topicOpen[k]; render(); },
  batch(b){ FMA.closed[b] = !FMA.closed[b]; render(); },
  edit(open){ FMA.editing = open; },
  refresh(){ FMA.rows = null; render(); },
  copy(id, tid){
    const x = FMA.rows.find(r=>r.id===id), t = FTM.topics.find(o=>o.id===tid); if(!x || !t) return;
    const text = feedbackText(x.name, t, review((x.m.entries||{})[tid], t));
    (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(text) : Promise.reject()).then(()=>toast("Feedback copied."), ()=>toast("Couldn’t copy. Select the text instead."));
  },
  async saveTopics(){
    const lines = String((document.getElementById("ftmTopics")||{}).value || "").split("\n").map(l=>l.trim()).filter(Boolean);
    const seen = new Set();
    const topics = lines.map(l=>{ const [title, keys] = l.split("|"); const t = title.trim(); let id = slug(t); while(seen.has(id)) id += "-2"; seen.add(id);
      return {id, title:t, keys:(keys||"").split(",").map(k=>k.trim()).filter(Boolean)}; });
    if(!topics.length){ toast("Add at least one discussion."); return; }
    const ok = await sharedSet("settings:monitor", {topics, updatedAt:new Date().toISOString()});
    if(ok === false){ toast("Couldn’t save. Check your connection."); return; }
    FTM.topics = topics; FMA.draft = ""; toast("Discussions saved."); render();
  },
  async resetTopics(){
    if(!confirm("Replace the list with the default discussions (and no key points)?")) return;
    const topics = topicsFrom(MON_DEFAULT_TOPICS);
    await sharedSet("settings:monitor", {topics, updatedAt:new Date().toISOString()});
    FTM.topics = topics; FMA.draft = ""; render();
  }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="monitoring") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-monitor">${renderPage()}</main>` + renderFooter();
  paintSave();
  try{ afterRender(); }catch(err){}
};
const __topbar = window.renderTopbar;
window.renderTopbar = function(){
  const html = __topbar.apply(this, arguments);
  if(!state.traineeId || state.isAdmin && !state.adminPreview) return html;
  const btn = `<button class="${state.view==="monitoring"?"active":""}" onclick="goto('monitoring')">📒 Monitoring Sheet</button>`;
  const withTracker = html.replace(/(<button[^>]*onclick="goto\('tracker'\)"[^>]*>[^<]*<\/button>)/, "$1" + btn);
  return withTracker !== html ? withTracker : html.replace(/(<button[^>]*onclick="goto\('dashboard'\)"[^>]*>[^<]*<\/button>)/, "$1" + btn);
};
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab==="monitor"?"active":""}" onclick="setAdminTab('monitor')">📒 Monitoring Sheets</button>`;
  if(state.adminTab==="monitor"){
    if(!FTM.topics){ loadTopics().then(()=>{ if(state.adminTab==="monitor") render(); }); }
    state.adminTab = "opendays";                   // borrow the tab bar…
    let out = __admin.apply(this, arguments);
    state.adminTab = "monitor";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>";
    return bar + (FTM.topics ? renderAdminMonitor() : `<div class="card" style="padding:24px;">Loading…</div>`);
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
};
// Dashboard: how much of the sheet the trainee has filled.
const __dash = window.renderDashboard;
window.renderDashboard = function(){
  const html = __dash.apply(this, arguments);
  if(!state.traineeId || state.isAdmin) return html;
  if(FTM.id!==state.traineeId && !FTM.loading){ load(state.traineeId); return html; }
  if(!FTM.data || !FTM.topics) return html;
  const done = FTM.topics.filter(t=>statusOf(FTM.data.entries[t.id], t).k==="done").length;
  const card = `<div class="card stat ftm-dash" onclick="goto('monitoring')" style="cursor:pointer;"><div class="num">${done} / ${FTM.topics.length}</div><div class="lbl">📒 Monitoring Sheet filled</div></div>`;
  return html.replace('<aside class="dash-side"><div class="dash-side-inner">', '<aside class="dash-side"><div class="dash-side-inner">' + card);
};

(function(){ const s = document.createElement("style"); s.id = "ft-monitoring"; s.textContent = `
main.main-monitor{max-width:1000px;margin:0 auto;padding:24px 16px 40px;}
.ftm-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;}
.ftm-hero p{margin:0 0 10px;color:var(--ink-soft);font-size:15px;}
.ftm-save{margin-left:6px;font-size:13px;color:var(--success);}
.ftm-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;} .ftm-actions a.btn{text-decoration:none;}
.ftm-count{font-size:14px;font-weight:800;color:var(--navy);margin-right:auto;}
.ftm-how{padding:14px 18px;margin-bottom:16px;font-size:15px;} .ftm-how > b{display:block;color:var(--navy);font-size:16px;}
.ftm-how ul{margin:6px 0 10px;padding-left:20px;} .ftm-how li{margin:3px 0;}
.ftm-eg{background:var(--bg);border-radius:10px;padding:10px 12px;font-size:14.5px;display:flex;flex-direction:column;gap:6px;}
.ftm-topic{padding:0;margin-bottom:10px;overflow:hidden;}
.ftm-topic > summary{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;list-style:none;font-size:15.5px;color:var(--navy);}
.ftm-topic > summary::-webkit-details-marker{display:none;}
.ftm-n{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--bg);color:var(--ink-soft);font-size:13px;display:flex;align-items:center;justify-content:center;}
.ftm-topic > summary b{flex:1;min-width:0;}
.ftm-st{flex-shrink:0;font-size:12.5px;border-radius:999px;padding:3px 10px;} .st-none{background:var(--bg);color:var(--ink-soft);} .st-part{background:#FEF7C3;color:#7a5d00;} .st-done{background:var(--success-bg);color:var(--success);}
.ftm-sheet{border-top:1px solid var(--line);}
.ftm-row{padding:12px 16px;border-top:1px solid var(--line);} .ftm-row:first-child{border-top:0;}
.ftm-h{font-size:15px;color:var(--ink);margin-bottom:6px;}
.ftm-date{font-size:15px;} .ftm-date input{font:inherit;font-size:15px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;margin-left:6px;}
.ftm-list{margin:0;padding-left:24px;} .ftm-list li{margin:6px 0;}
.ftm-list textarea, .ftm-list input{width:100%;box-sizing:border-box;font:inherit;font-weight:500;font-size:15px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;resize:vertical;background:#fff;}
.ftm-list textarea:focus, .ftm-list input:focus, .ftm-date input:focus{outline:2px solid var(--orange-soft);border-color:var(--orange);}
.ftm-rate{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border:1px solid var(--ink);}
.ftm-rate button{font:inherit;font-style:italic;font-weight:500;font-size:14.5px;text-align:left;padding:10px;background:#fff;border:0;border-left:1px solid var(--ink);cursor:pointer;color:var(--ink);}
.ftm-rate button:first-child{border-left:0;} .ftm-rate button.on{background:#00ff00;} .ftm-rate button:hover:not(.on){background:#F3F5FB;}
@media (max-width:640px){ .ftm-rate{grid-template-columns:1fr 1fr;} .ftm-rate button:nth-child(3){border-left:0;} .ftm-rate button:nth-child(n+3){border-top:1px solid var(--ink);} }
.ftm-link{cursor:pointer;color:var(--orange-deep);font-weight:700;}
.ftm-admin{padding:18px 20px;margin-bottom:14px;} .ftm-admin h3{margin:0 0 4px;color:var(--navy);}
.ftm-admin > summary{cursor:pointer;color:var(--navy);font-size:15px;}
.ftm-muted{color:var(--ink-soft);font-size:13.5px;}
.ftm-batch{margin-top:14px;} .ftm-batch-hd{cursor:pointer;padding:8px 0;color:var(--navy);font-size:15px;}
.ftm-atable{width:100%;border-collapse:collapse;font-size:14.5px;} .ftm-atable th{text-align:left;font-size:12.5px;color:var(--ink-soft);padding:6px 8px;border-bottom:1px solid var(--line);}
.ftm-atable td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top;} .ftm-trow{cursor:pointer;} .ftm-trow:hover{background:#F8F9FC;}
.ftm-pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:13px;} .ftm-pill.ok{background:var(--success-bg);color:var(--success);} .ftm-pill.mid{background:#FEF7C3;color:#7a5d00;} .ftm-pill.bad{background:var(--danger-bg);color:var(--danger);}
.ftm-help{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12.5px;background:var(--danger-bg);color:var(--danger);}
.ftm-arep{border:1px solid var(--line);border-radius:10px;margin:6px 0;background:#fff;}
.ftm-arep-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;cursor:pointer;font-size:14.5px;color:var(--navy);}
.ftm-arep-hd .ftm-muted{margin-left:auto;}
.ftm-arep-body{border-top:1px solid var(--line);padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;}
@media (max-width:760px){ .ftm-arep-body{grid-template-columns:1fr;} }
.ftm-checks{display:flex;flex-direction:column;gap:4px;font-size:14px;} .ftm-checks small{color:var(--ink-soft);}
.ftm-afb pre{white-space:pre-wrap;font-family:inherit;font-size:14px;background:var(--bg);border-radius:8px;padding:10px 12px;margin:6px 0;}
.ftm-afb > b, .ftm-awrote > b{display:block;font-size:13px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;margin-top:4px;}
.ftm-awrote{grid-column:1 / -1;font-size:14px;} .ftm-awrote ol{margin:4px 0 8px;padding-left:22px;} .ftm-awrote li{margin:3px 0;font-weight:500;}
.ftm-topics{width:100%;box-sizing:border-box;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13.5px;padding:10px;border:1px solid var(--line);border-radius:8px;}
`; document.head.appendChild(s); })();
})();
