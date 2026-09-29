/* ============================================================
   Training Monitoring Sheet — filled in on the platform
   Loaded after js/ft-tracker.js. 📒 Monitoring Sheet in the top bar (#/monitoring).
     • Trainees: one entry per classroom discussion, as in the Word sheet
       (MON_DOC): the date, 5 Major Takeaways from This Discussion,
       3 Questions That You Still Have, and Rate Your Understanding.
       It saves to their account (monitor:<id>) as they type.
     • Admin → 📒 Monitoring Sheets: batch → trainee → each discussion, with
       automated feedback from a rubric of metrics on what the trainee wrote and
       on the discussion's key points; no AI writes it. Trainers improve the
       rubric there (📏 Feedback Rubric): each save is a new version, used from
       then on, and earlier versions can be restored.
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

const FMA = {rows:null, loading:false, open:{}, topicOpen:{}, closed:{}, editing:false, draft:"", rubric:null, rdraft:null, rOpen:false};
/* ---------- the automated feedback: a rubric of metrics, no AI ----------
   Trainers improve it in Admin → 📒 Monitoring Sheets → 📏 Feedback Rubric: switch metrics on or off, change their
   settings, weights and feedback lines, add metrics, and save each change as a new version. The latest version
   scores every entry from then on; earlier versions are kept and can be restored.
   Stored in monadmin:rubric (trainers only): {current:{version, savedAt, note, metrics}, history:[older versions]}.
   A metric: {id, type (MON_TYPES), label, on, weight, fix, …its settings}. In "fix", the feedback line, these are
   filled in: {which} (e.g. "takeaways 1 and 4"), {count}, {min}, {missing}, {found}, {sentences}. */
const takes = x => (x.takeaways||[]).map((v,i)=>({v:String(v||"").trim(), n:i+1})).filter(o=>o.v);
const list = v => String(v||"").split(",").map(t=>t.trim()).filter(Boolean);
const MON_TYPES = {
  date: {name:"Date filled in", params:[], run:(m,x)=> has(x.date) ? {pass:true} : {pass:false, detail:"No date."}},
  count: {name:"Number of takeaways", params:[["min","Takeaways required","number"]], run:(m,x)=>{
    const n = (x.takeaways||[]).filter(has).length, min = +m.min || 5;
    return {pass:n >= min, detail:`${n} of ${min}.`, vars:{count:n, min}};
  }},
  sentences: {name:"Complete sentences", params:[["minWords","Fewest words in a sentence","number"]], run:(m,x)=>{
    const t = takes(x); if(!t.length) return {na:true};
    const bad = t.filter(o => words(o.v) < (+m.minWords || 4) || !/^[A-Z0-9“"(]/.test(o.v) || !/[.!?)”"]$/.test(o.v)).map(o=>o.n);
    return bad.length ? {pass:false, detail:`${nums(bad).replace(/^t/, "T")}.`, vars:{which:nums(bad), sentences: bad.length===1 ? "a complete sentence" : "complete sentences"}} : {pass:true};
  }},
  specific: {name:"Specific, not general", params:[["minWords","Fewest words to be specific","number"], ["phrases","General openings (comma-separated)","text"], ["maxWords","A general opening is fine from this many words","number"]], run:(m,x)=>{
    const t = takes(x); if(!t.length) return {na:true};
    const openers = list(m.phrases).map(p=>p.toLowerCase());
    const gen = t.filter(o=>{ const low = o.v.toLowerCase().replace(/^i\s+have\s+/, "i ");
      return words(o.v) < (+m.minWords || 7) || (openers.some(p=>low.startsWith(p)) && words(o.v) < (+m.maxWords || 16)); }).map(o=>o.n);
    return gen.length ? {pass:false, detail:`${nums(gen).replace(/^t/, "T")}.`, vars:{which:nums(gen)}} : {pass:true};
  }},
  keypoints: {name:"Based on the discussion (its key points)", params:[["share","Key points to mention (%)","number"]], run:(m,x,topic)=>{
    const keys = (topic && topic.keys || []).filter(has); if(!keys.length) return {na:true};
    const text = (x.takeaways||[]).join(" ").toLowerCase();
    const hit = keys.filter(k=>text.includes(String(k).toLowerCase().trim()));
    const need = Math.max(1, Math.ceil(keys.length * (m.share == null || m.share === "" ? 50 : +m.share) / 100));
    return {pass:hit.length >= need, detail:`${hit.length} of ${keys.length} key points.`, vars:{missing:keys.filter(k=>!hit.includes(k)).slice(0,3).join(", ")}};
  }},
  rating: {name:"Understanding rated", params:[], run:(m,x)=> x.rating ? {pass:true, detail:RATINGS[x.rating-1]} : {pass:false, detail:"Not rated."}},
  questions: {name:"Questions filled in (or “None”)", params:[], run:(m,x)=> (x.questions||[]).some(has) ? {pass:true} : {pass:false, detail:"No questions."}},
  avoid: {name:"Avoid these words", params:[["words","Words or phrases (comma-separated)","text"]], run:(m,x)=>{
    const t = takes(x), w = list(m.words); if(!t.length || !w.length) return {na:true};
    const re = new RegExp(`(^|[^a-z])(${w.map(v=>v.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^a-z])`, "i");
    const hit = t.filter(o=>re.test(o.v));
    const found = [...new Set(hit.map(o=>(o.v.match(re)||[])[2]).filter(Boolean).map(v=>v.toLowerCase()))];
    return hit.length ? {pass:false, detail:`${nums(hit.map(o=>o.n)).replace(/^t/, "T")}: ${found.join(", ")}.`, vars:{which:nums(hit.map(o=>o.n)), found:found.join(", ")}} : {pass:true};
  }},
  include: {name:"Mention at least one of these", params:[["words","Words or phrases (comma-separated)","text"]], run:(m,x)=>{
    const w = list(m.words); if(!w.length) return {na:true};
    const text = (x.takeaways||[]).join(" ").toLowerCase();
    const found = w.filter(v=>text.includes(v.toLowerCase()));
    return found.length ? {pass:true, detail:found.join(", ")} : {pass:false, detail:"None mentioned.", vars:{missing:w.slice(0,3).join(", ")}};
  }},
  minwords: {name:"Minimum words per takeaway", params:[["min","Words","number"]], run:(m,x)=>{
    const t = takes(x); if(!t.length) return {na:true};
    const short = t.filter(o=>words(o.v) < (+m.min || 10)).map(o=>o.n);
    return short.length ? {pass:false, detail:`${nums(short).replace(/^t/, "T")}.`, vars:{which:nums(short), min:+m.min || 10}} : {pass:true};
  }}
};
const MON_DEFAULT_RUBRIC = {version:1, savedAt:"", note:"The starting metrics", metrics:[
  {id:"date", type:"date", label:"Date filled in", on:true, weight:1, fix:"Add the date the topic was covered."},
  {id:"five", type:"count", label:"All 5 takeaways written", on:true, weight:1, min:5, fix:"Write all {min} takeaways, not just {count}."},
  {id:"sentences", type:"sentences", label:"Complete sentences", on:true, weight:1, minWords:4, fix:"Write {which} as {sentences}: a capital letter at the start, a period at the end, and not just a word or a phrase."},
  {id:"specific", type:"specific", label:"Specific, not general", on:true, weight:1, minWords:7, maxWords:16,
   phrases:"I learned, I learnt, I understood, I understand, I know, I knew, I discussed, I studied, I was taught, We learned, We discussed",
   fix:"Make {which} specific: say what you learned and how it works or why it matters, not just the topic (not “I learned about auto liability.”)."},
  {id:"discussion", type:"keypoints", label:"Based on the discussion", on:true, weight:1, share:50, fix:"Base your takeaways on the discussion. Cover its key points, such as {missing}."},
  {id:"rating", type:"rating", label:"Understanding rated", on:true, weight:1, fix:"Rate your understanding of the topic."}
]};
const rubricNow = ()=> (FMA.rubric && FMA.rubric.current) || MON_DEFAULT_RUBRIC;
function started(x){ return !!x && (has(x.date) || (x.takeaways||[]).some(has) || (x.questions||[]).some(has) || !!x.rating); }
function review(x, topic, rubric){
  const r = rubric || rubricNow();
  const results = r.metrics.filter(m=>m.on !== false && MON_TYPES[m.type]).map(m=>{
    const o = MON_TYPES[m.type].run(m, x||{}, topic) || {na:true};
    const fix = o.pass || o.na ? "" : String(m.fix||"").replace(/\{(\w+)\}/g, (all,k)=> o.vars && o.vars[k] != null && o.vars[k] !== "" ? o.vars[k] : all);
    return Object.assign({id:m.id, label:m.label || MON_TYPES[m.type].name, weight:m.weight == null || m.weight === "" ? 1 : +m.weight}, o, {fix});
  });
  const on = results.filter(o=>!o.na), total = on.reduce((a,o)=>a+o.weight, 0);
  const pct = total ? Math.round(100 * on.filter(o=>o.pass).reduce((a,o)=>a+o.weight, 0) / total) : 0;
  return {results, pct, version:r.version, fixes:on.filter(o=>!o.pass && o.fix).map(o=>o.fix), needsHelp: !!x && x.rating === 1};
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
async function loadAdmin(){
  FMA.loading = true;
  try{
    await loadTopics();
    FMA.rubric = (await sharedGet("monadmin:rubric").catch(()=>null)) || {current:MON_DEFAULT_RUBRIC, history:[]};
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
      <div class="ftm-afb"><b>Automated Feedback <span class="ftm-muted">· rubric v${r.version}</span></b><pre>${e(feedbackText("", t, r))}</pre>
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
    <p class="ftm-muted">Each trainee’s Training Monitoring Sheet, by batch. The feedback is automated from the 📏 Feedback Rubric below (rubric v${rubricNow().version}), on what they wrote and on the discussion’s key points; no AI writes it. Click a trainee, then a discussion, for the checks, the feedback to copy, and what they wrote.</p>
    ${FMA.rows.length ? batches : `<div class="ftm-muted" style="margin:14px 0;">No active trainee has started their Monitoring Sheet yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTMonAdmin.refresh()">Refresh</button></div>
  </div>
  <details class="card ftm-admin" ${FMA.editing?"open":""} ontoggle="FTMonAdmin.edit(this.open)">
    <summary><b>Discussions and Key Points</b> <span class="ftm-muted">— the sheet’s discussions, and what each one’s takeaways should cover</span></summary>
    <p class="ftm-muted">One discussion per line. Add its key points after a “|”, separated by commas, e.g. <code>Intake Training Day 1 | statute of limitations, conflict check, retainer</code>. The “Based on the discussion” metric passes when the takeaways mention the share of them set in the rubric. A renamed discussion starts a new entry, so keep titles as they are once trainees have started.</p>
    <textarea id="ftmTopics" class="ftm-topics" rows="14">${e(FMA.draft || topicsText)}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px;"><button class="btn btn-navy btn-sm" onclick="FTMonAdmin.saveTopics()">Save</button><button class="btn btn-ghost btn-sm" onclick="FTMonAdmin.resetTopics()">Use the Default List</button></div>
  </details>
  ${renderRubricEditor()}`;
}
/* ---------- 📏 Feedback Rubric: the trainer improves the metrics; each save is a new version ---------- */
function renderRubricEditor(){
  const cur = rubricNow(), hist = (FMA.rubric && FMA.rubric.history) || [];
  const d = FMA.rdraft || cur.metrics;
  const changed = !!FMA.rdraft && JSON.stringify(FMA.rdraft) !== JSON.stringify(cur.metrics);
  const field = (i, key, label, kind, v)=>`<label class="ftm-rp">${e(label)}<input type="${kind==="number"?"number":"text"}" ${kind==="number"?'min="0" step="1"':""} value="${e(v==null?"":v)}" oninput="FTMonRubric.set(${i},'${key}',this.value)"></label>`;
  return `<details class="card ftm-admin ftm-rubric" ${FMA.rOpen?"open":""} ontoggle="FTMonRubric.open(this.open)">
    <summary><b>📏 Feedback Rubric</b> <span class="ftm-muted">— version ${cur.version}${cur.savedAt ? `, saved ${e(TRDate(cur.savedAt.slice(0,10)))}` : " (the starting metrics)"}${cur.note ? ` · ${e(cur.note)}` : ""}</span></summary>
    <p class="ftm-muted">Improve the metrics as you go: switch a metric on or off, change its settings, its weight in the score and its feedback line, or add a metric. Save, and every review uses the new version from then on. Earlier versions are kept below and can be restored. In a feedback line, <code>{which}</code> becomes the takeaways it’s about (e.g. “takeaways 1 and 4”); <code>{count}</code>, <code>{min}</code>, <code>{missing}</code> (key points or words not mentioned), <code>{found}</code> and <code>{sentences}</code> are filled in too.</p>
    ${d.map((m,i)=>{ const T = MON_TYPES[m.type] || {name:m.type, params:[]};
      return `<div class="ftm-metric ${m.on===false?"off":""}">
        <div class="ftm-mrow"><label class="ftm-on"><input type="checkbox" ${m.on===false?"":"checked"} onchange="FTMonRubric.set(${i},'on',this.checked)"> On</label>
          <input class="ftm-mlabel" value="${e(m.label||"")}" oninput="FTMonRubric.set(${i},'label',this.value)" aria-label="Metric name">
          <span class="ftm-mtype">${e(T.name)}</span>
          ${field(i, "weight", "Weight", "number", m.weight == null ? 1 : m.weight)}
          <button class="btn btn-ghost btn-sm" type="button" title="Remove this metric" onclick="FTMonRubric.remove(${i})">✕</button></div>
        ${T.params.length ? `<div class="ftm-mrow">${T.params.map(([k,l,kind])=>field(i, k, l, kind, m[k])).join("")}</div>` : ""}
        <label class="ftm-rp ftm-rfix">Feedback line<textarea rows="2" oninput="FTMonRubric.set(${i},'fix',this.value)">${e(m.fix||"")}</textarea></label>
      </div>`; }).join("")}
    <div class="ftm-mrow" style="margin-top:10px;"><select id="ftmAddType">${Object.keys(MON_TYPES).map(k=>`<option value="${k}">${e(MON_TYPES[k].name)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTMonRubric.add()">+ Add Metric</button></div>
    <div class="ftm-mrow" style="margin-top:12px;"><input id="ftmRubricNote" class="ftm-mlabel" placeholder="What changed in this version (optional)">
      <button class="btn btn-navy btn-sm" type="button" ${changed?"":"disabled"} onclick="FTMonRubric.save()">Save as Version ${cur.version + 1}</button>
      ${changed ? `<button class="btn btn-ghost btn-sm" type="button" onclick="FTMonRubric.discard()">Discard Changes</button>` : ""}
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTMonRubric.restore(-1)">Start From the Starting Metrics</button></div>
    ${hist.length ? `<div class="ftm-hist"><b>Earlier Versions</b>${hist.map((h,j)=>`<div><span>v${h.version}${h.savedAt ? ` · ${e(TRDate(h.savedAt.slice(0,10)))}` : " · the starting metrics"}${h.note ? ` · ${e(h.note)}` : ""} · ${h.metrics.filter(m=>m.on!==false).length} metrics</span><button class="btn btn-ghost btn-sm" type="button" onclick="FTMonRubric.restore(${j})">Restore</button></div>`).join("")}</div>` : ""}
  </details>`;
}
window.FTMonRubric = {
  open(v){ FMA.rOpen = v; },
  draft(){ if(!FMA.rdraft) FMA.rdraft = JSON.parse(JSON.stringify(rubricNow().metrics)); return FMA.rdraft; },
  set(i, key, v){
    const m = this.draft()[i]; if(!m) return;
    const T = MON_TYPES[m.type] || {params:[]};
    const isNum = key === "weight" || T.params.some(([k,,kind])=>k===key && kind==="number");
    m[key] = key === "on" ? !!v : isNum ? (v === "" ? "" : +v) : v;
    if(key === "on"){ render(); return; }
    const btn = [...document.querySelectorAll(".ftm-rubric button")].find(b=>/^Save as Version/.test(b.textContent));
    if(btn) btn.disabled = JSON.stringify(FMA.rdraft) === JSON.stringify(rubricNow().metrics);
  },
  add(){
    const type = (document.getElementById("ftmAddType")||{}).value; const T = MON_TYPES[type]; if(!T) return;
    const base = MON_DEFAULT_RUBRIC.metrics.find(m=>m.type===type);
    const m = base ? JSON.parse(JSON.stringify(base)) : {type, label:T.name, on:true, weight:1,
      fix: type==="avoid" ? "Replace the vague words in {which}: {found}." : type==="include" ? "Mention at least one of these in your takeaways: {missing}." :
           type==="minwords" ? "Write more on {which}: at least {min} words each." : type==="questions" ? "Write the questions you still have, or “None”." : ""};
    m.id = type + "-" + Date.now().toString(36);
    if(type==="minwords") m.min = 10;
    this.draft().push(m); FMA.rOpen = true; render();
  },
  remove(i){ const d = this.draft(); if(!confirm(`Remove “${d[i].label}” from the rubric? It takes effect when you save.`)) return; d.splice(i, 1); render(); },
  discard(){ FMA.rdraft = null; render(); },
  async save(){
    const cur = rubricNow(), hist = (FMA.rubric && FMA.rubric.history) || [];
    const note = String((document.getElementById("ftmRubricNote")||{}).value || "").trim().slice(0, 200);
    const next = {version:cur.version + 1, savedAt:new Date().toISOString(), note, metrics:this.draft()};
    const doc = {current:next, history:[cur].concat(hist).slice(0, 30)};
    if(await sharedSet("monadmin:rubric", doc) === false){ toast("Couldn’t save. Check your connection."); return; }
    FMA.rubric = doc; FMA.rdraft = null; toast(`📏 Rubric version ${next.version} saved. Every review uses it from now on.`); render();
  },
  // j = -1: the starting metrics. Restoring saves a copy as the next version.
  async restore(j){
    const cur = rubricNow(), hist = (FMA.rubric && FMA.rubric.history) || [];
    const from = j < 0 ? MON_DEFAULT_RUBRIC : hist[j]; if(!from) return;
    if(!confirm(`Save ${j < 0 ? "the starting metrics" : "version " + from.version} as version ${cur.version + 1}?`)) return;
    FMA.rdraft = JSON.parse(JSON.stringify(from.metrics));
    const n = document.getElementById("ftmRubricNote"); if(n) n.value = j < 0 ? "Back to the starting metrics" : `Restored version ${from.version}`;
    await this.save();
  }
};
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
.ftm-rubric code{font-size:12.5px;background:var(--bg);border-radius:4px;padding:0 4px;}
.ftm-metric{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:10px;background:#fff;} .ftm-metric.off{opacity:.55;}
.ftm-mrow{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;} .ftm-mrow + .ftm-mrow{margin-top:8px;}
.ftm-on{display:flex;gap:4px;align-items:center;font-size:13.5px;align-self:center;}
.ftm-mlabel{flex:1 1 220px;min-width:0;font:inherit;font-size:14.5px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;}
.ftm-mtype{font-size:12px;color:var(--ink-soft);background:var(--bg);border-radius:999px;padding:3px 9px;align-self:center;}
.ftm-rp{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--ink-soft);}
.ftm-rp input{font:inherit;font-size:14px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;min-width:0;} .ftm-rp input[type=number]{width:90px;} .ftm-rp input[type=text]{width:min(420px,70vw);}
.ftm-rfix{margin-top:8px;} .ftm-rfix textarea{font:inherit;font-weight:500;font-size:14px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;width:100%;box-sizing:border-box;resize:vertical;}
.ftm-hist{margin-top:14px;font-size:14px;} .ftm-hist > b{display:block;color:var(--navy);margin-bottom:4px;}
.ftm-hist > div{display:flex;justify-content:space-between;gap:10px;align-items:center;border-top:1px solid var(--line);padding:6px 0;}
.ftm-topics{width:100%;box-sizing:border-box;font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:13.5px;padding:10px;border:1px solid var(--line);border-radius:8px;}
`; document.head.appendChild(s); })();
})();
