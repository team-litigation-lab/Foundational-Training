/* ============================================================
   LSH Daily Task Tracker — the trainee's sheet, Google Sheets style
   Loaded after js/ft-updates.js. Rules: js/ft-tracker-rules.js (shared
   with worker.js, which runs the daily check on its cron).
     • Trainees: 📋 Task Tracker in the top bar. The sheet saves to their
       account (tracker:<id>) as they type; flagged cells show in red.
     • The daily check (trackerreview:<id>): a checklist per rule, the day's
       %, the notes review and the trainer's comment. Trainees read it.
     • Admin → 📋 Task Trackers: every trainee's day at a glance, open any
       tracker (read-only), write the day's comment, edit the review
       criteria, and run the check now.
   ============================================================ */
(function(){
const TR = window.FTTrackerRules;
if(!TR) return;

// the tracker has its own address (#/tracker), so it can be opened or duplicated in a new tab
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["tracker"]);

const FTT = {id:null, name:"", data:null, review:null, loading:false, err:"", saveTimer:null, saving:false, savedAt:null,
  sheet:"tracker", sel:null, day:null, readOnly:false, admin:null, criteria:null};

/* ---------- columns ---------- */
const MAIN_FIXED_L = [
  {k:"dateReceived", h:"Date Received", w:112, kind:"date"},
  {k:"type", h:"Type of Task", w:130, kind:"list", list:TR.TASK_TYPES},
  {k:"details", h:"Task Details / Specific Task", w:260, kind:"text"},
  {k:"va", h:"Accountable VA", w:118, kind:"text"}];
const MAIN_FIXED_R = [
  {k:"vaNotes", h:"VA NOTES", w:280, kind:"text"},
  {k:"deadline", h:"Deadline", w:108, kind:"date"},
  {k:"status", h:"Status", w:150, kind:"list", list:TR.STATUSES},
  {k:"completedOn", h:"Actual Completion Date", w:128, kind:"date"}];
const OTHER = {
  index: {title:"Client-VA Specific Tasks Index", cols:[
    {h:"CLIENT CODE", w:100}, {h:"BUSINESS NAME", w:160}, {h:"STATE", w:70}, {h:"TIME ZONE", w:90}, {h:"FIELD OF LAW", w:130},
    {h:"TYPE OF TASK", w:130, kind:"list", list:TR.TASK_TYPES}, {h:"SPECIFIC TASK", w:170}, {h:"PERIOD", w:110, kind:"list", list:TR.PERIODS},
    {h:"NATURE OF TASK", w:190, kind:"list", list:TR.NATURES}, {h:"DEADLINE", w:150, kind:"list", list:TR.DEADLINES}, {h:"For Timebound, specify date/day/time", w:240}]},
  links: {title:"Links & Access", note:"Passwords are never stored on the platform. Keep them in the credentials document.", cols:[
    {h:"ACCESS TO", w:220}, {h:"USERNAME", w:220}, {h:"REMARKS", w:320}]},
  directory: {title:"Directory", cols:[
    {h:"CONTACT PERSON", w:140}, {h:"BUSINESS NAME", w:260}, {h:"BUSINESS ADDRESS", w:280}, {h:"PHONE NO. (EXT)", w:130}, {h:"FAX NUMBER", w:120}, {h:"EMAIL", w:220}]},
  timezone: {title:"Time Zone", cols:[{h:"", w:160}, {h:"", w:160}, {h:"", w:160}]}
};
const SHEET_TABS = [["tracker", "LSH Daily Task Tracker"], ["index", "Client-VA Specific Tasks Index"], ["links", "Links & Access"], ["directory", "Directory"], ["timezone", "Time Zone"]];
const STATUS_STYLE = {"New":"st-new", "Pending for >3 days":"st-pending", "Ongoing":"st-ongoing", "Priority - Ongoing":"st-priority", "Completed":"st-completed"};
const colLetter = (i)=>{ let s=""; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; };
const today = ()=>TR.ptDate();
const e = (s)=>esc(String(s==null?"":s));

function mainCols(t){
  const dates = (t.tracker.noteDates||[]).slice().sort();
  return MAIN_FIXED_L.concat(dates.map(d=>({k:"note:"+d, h:TR.fmtDate(d), w:220, kind:"text", date:d})), MAIN_FIXED_R);
}
function cellVal(r, k){ return k.startsWith("note:") ? ((r.notes||{})[k.slice(5)]||"") : (r[k]||""); }
function setCellVal(r, k, v){ if(k.startsWith("note:")){ r.notes = r.notes||{}; if(v) r.notes[k.slice(5)] = v; else delete r.notes[k.slice(5)]; } else r[k] = v; }

/* ---------- load / save ---------- */
function ftFirstName(){ const n = (state.traineeName || localStorage.getItem("lsh_reg-name") || "").replace(/"/g,""); const p = n.includes(",") ? n.split(",")[1] : n; return (p||"").trim().split(/\s+/)[0] || ""; }
async function load(id, opts){
  FTT.loading = true; FTT.err = ""; FTT.id = id; FTT.readOnly = !!(opts && opts.readOnly); FTT.name = (opts && opts.name) || "";
  try{
    const [t, rv] = await Promise.all([sharedGet("tracker:"+id), sharedGet("trackerreview:"+id)]);
    let data = t;
    if(!data && !FTT.readOnly){ data = TR.template(ftFirstName(), today()); await sharedSet("tracker:"+id, data); }
    if(data && !FTT.readOnly){
      const D = today();
      if(TR.isWeekday(D) && !data.tracker.noteDates.includes(D)){ data.tracker.noteDates.push(D); queueSave(data); }
    }
    FTT.data = data; FTT.review = rv || {days:{}};
    FTT.day = FTT.day || today();
  }catch(err){ FTT.err = "Couldn't load the tracker. Check your connection and try again."; }
  FTT.loading = false;
  if(state.view==="tracker") render();
}
function queueSave(data){
  if(FTT.readOnly) return;
  data = data || FTT.data; if(!data) return;
  data.updatedAt = new Date().toISOString();
  clearTimeout(FTT.saveTimer); FTT.saving = true; paintSave();
  FTT.saveTimer = setTimeout(async ()=>{
    const ok = await sharedSet("tracker:"+FTT.id, data);
    FTT.saving = false; FTT.savedAt = ok ? new Date() : null; paintSave(ok);
  }, 1200);
}
function paintSave(ok){
  const el = document.getElementById("fttSave"); if(!el) return;
  el.textContent = FTT.saving ? "Saving…" : (ok===false ? "⚠ Not saved — check your connection" : (FTT.savedAt ? "All changes saved" : ""));
}

/* ---------- the daily check (live) ---------- */
function liveCheck(D){ return TR.checkDay(FTT.data, D||FTT.day||today()); }
function flagMap(check){ const m = {}; (check.flags||[]).forEach(f=>{ m[f.row+"|"+f.col] = f.msg; }); return m; }

/* ---------- rendering ---------- */
function renderTracker(){
  if(!state.traineeId && !state.isAdmin) return `<div class="card" style="padding:28px;">Sign in to open your Task Tracker.</div>`;
  const wantId = FTT.admin ? FTT.admin.id : state.traineeId;
  if(!wantId) return `<div class="card" style="padding:28px;">Open a trainee's tracker from <a class="ftt-link" onclick="state.adminTab='trackers'; goto('admin')">Admin → 📋 Task Trackers</a>.</div>`;
  if(FTT.id !== wantId && !FTT.loading){ FTT.data = null; FTT.sel = null; FTT.day = null; load(wantId, FTT.admin ? {readOnly:true, name:FTT.admin.name} : {}); }
  if(FTT.loading || !FTT.data) return `<div class="card" style="padding:28px;">${FTT.err ? e(FTT.err) : "Loading the tracker…"}</div>`;
  const t = FTT.data;
  const who = FTT.admin ? FTT.admin.name : (state.traineeName || "");
  return `
  ${FTT.admin ? `<a class="back-link" onclick="FTTracker.closeAdmin()">&larr; Back to Task Trackers</a>` : ""}
  <div class="ftt">
    <div class="ftt-titlebar">
      <div class="ftt-doc"><span class="ftt-icon">▦</span><div><b>LSH Daily Task Tracker | ${e(who)}</b>
        <span id="fttSave" class="ftt-save">${FTT.readOnly ? "View only" : ""}</span></div></div>
      ${FTT.readOnly ? "" : `<div class="ftt-tools">${FTT.sheet==="tracker" ? `
        <button class="btn btn-ghost btn-sm" onclick="FTTracker.addRow('completion')">+ Task</button>
        <button class="btn btn-ghost btn-sm" onclick="FTTracker.addRow('recurring')">+ Recurring</button>
        <button class="btn btn-ghost btn-sm" onclick="FTTracker.addDate()">+ Date column</button>` : `
        <button class="btn btn-ghost btn-sm" onclick="FTTracker.addRow()">+ Row</button>`}
        <button class="btn btn-ghost btn-sm" onclick="FTTracker.deleteRow()" title="Delete the selected row">🗑 Row</button></div>`}
    </div>
    <div class="ftt-fx"><span class="ftt-ref" id="fttRef">${e(refOf(FTT.sel))}</span><span class="ftt-fxi">fx</span>
      <textarea id="fttFx" rows="1" ${FTT.readOnly?"readonly":""} placeholder="${FTT.readOnly?"":"Select a cell"}" oninput="FTTracker.fxInput(this.value)">${e(selValue())}</textarea></div>
    <div class="ftt-wrap" id="fttWrap">${FTT.sheet==="tracker" ? renderMain(t) : renderOther(FTT.sheet)}</div>
    <div class="ftt-tabs">${SHEET_TABS.map(([k,l])=>`<button class="ftt-tab ${FTT.sheet===k?"on":""}" onclick="FTTracker.tab('${k}')">${e(l)}</button>`).join("")}</div>
  </div>
  ${renderCheckPanel()}`;
}

function refOf(sel){
  if(!sel) return "";
  if(sel.sheet==="tracker"){
    const cols = mainCols(FTT.data), ci = cols.findIndex(c=>c.k===sel.k);
    const rows = orderedRows(FTT.data), ri = rows.findIndex(x=>x.row && x.row.id===sel.r);
    return ci<0||ri<0 ? "" : colLetter(ci) + (ri + 8);
  }
  return colLetter(sel.c) + (sel.r + 2);
}
function selValue(){
  const s = FTT.sel; if(!s || !FTT.data) return "";
  if(s.sheet==="tracker"){ const r = FTT.data.tracker.rows.find(x=>x.id===s.r); return r ? cellVal(r, s.k) : ""; }
  const rows = FTT.data[s.sheet].rows; return (rows[s.r]||[])[s.c] || "";
}
function orderedRows(t){
  const out = [];
  TR.SECTIONS.forEach(([sec, label])=>{
    out.push({section:sec, label});
    t.tracker.rows.filter(r=>r.section===sec).forEach(r=>out.push({row:r}));
  });
  return out;
}
function counts(t){
  const c = {}; TR.STATUSES.forEach(s=>c[s]=0);
  t.tracker.rows.forEach(r=>{ if(r.status && c[r.status]!=null) c[r.status]++; });
  return c;
}
function renderMain(t){
  const cols = mainCols(t);
  const D = FTT.day || today();
  const flags = flagMap(liveCheck(D));
  const c = counts(t);
  const dateIdx = cols.map((x,i)=>x.date?i:-1).filter(i=>i>=0);
  const widths = `<colgroup><col style="width:46px">${cols.map(x=>`<col style="width:${x.w}px">`).join("")}</colgroup>`;
  const letters = `<tr class="ftt-letters"><th class="ftt-corner"></th>${cols.map((x,i)=>`<th>${colLetter(i)}</th>`).join("")}</tr>`;
  // rows 1–5: the status counts, as in the sample
  const summary = TR.STATUSES.map((s,i)=>`<tr class="ftt-sum"><th class="ftt-rn">${i+1}</th><td><span class="ftt-chip ${STATUS_STYLE[s]}">${e(s)}</span></td><td class="ftt-num">${c[s]}</td>${cols.slice(2).map(()=>"<td></td>").join("")}</tr>`).join("");
  const band = `<tr class="ftt-band"><th class="ftt-rn">6</th>${cols.map((x,i)=>i===dateIdx[0]?`<td colspan="${dateIdx.length}" class="ftt-bandcell">DAILY NOTES (Dated Significant Task Progress/Difficulties)</td>`:(dateIdx.includes(i)?"":"<td></td>")).join("")}</tr>`;
  const head = `<tr class="ftt-head"><th class="ftt-rn">7</th>${cols.map(x=>`<th class="${x.date===D?"is-day":""}${x.date===today()?" is-today":""}">${e(x.h)}${x.date===today()?' <em>today</em>':""}</th>`).join("")}</tr>`;
  let rn = 8;
  const body = orderedRows(t).map(x=>{
    if(!x.row) return `<tr class="ftt-section"><th class="ftt-rn">${rn++}</th><td colspan="${cols.length}"><b>${e(x.label)}</b>${FTT.readOnly||x.section==="completed"?"":` <a class="ftt-add" onclick="FTTracker.addRow('${x.section}')">+ add row</a>`}</td></tr>`;
    const r = x.row;
    return `<tr class="ftt-row"><th class="ftt-rn">${rn++}</th>${cols.map(col=>{
      const v = cellVal(r, col.k), fk = r.id+"|"+col.k, fl = flags[fk];
      const sel = FTT.sel && FTT.sel.sheet==="tracker" && FTT.sel.r===r.id && FTT.sel.k===col.k;
      const shown = col.kind==="date" ? TR.fmtDate(v) : (col.k==="status" && v ? `<span class="ftt-chip ${STATUS_STYLE[v]||""}">${e(v)}</span>` : e(v));
      return `<td class="ftt-c ${col.kind==="list"?"is-list":""}${fl?" is-flag":""}${sel?" is-sel":""}${col.date===D?" is-day":""}" data-r="${r.id}" data-k="${col.k}" ${fl?`title="⚑ ${e(fl)}"`:""}
        onclick="FTTracker.select('tracker','${r.id}','${col.k}')" ondblclick="FTTracker.edit()">${shown}</td>`;
    }).join("")}</tr>`;
  }).join("");
  return `<table class="ftt-grid">${widths}<thead>${letters}</thead><tbody>${summary}${band}${head}${body}</tbody></table>`;
}
function renderOther(k){
  const def = OTHER[k], rows = FTT.data[k].rows;
  const widths = `<colgroup><col style="width:46px">${def.cols.map(x=>`<col style="width:${x.w}px">`).join("")}</colgroup>`;
  const letters = `<tr class="ftt-letters"><th class="ftt-corner"></th>${def.cols.map((x,i)=>`<th>${colLetter(i)}</th>`).join("")}</tr>`;
  const head = `<tr class="ftt-head"><th class="ftt-rn">1</th>${def.cols.map(x=>`<th>${e(x.h)}</th>`).join("")}</tr>`;
  const body = rows.map((row,ri)=>`<tr class="ftt-row"><th class="ftt-rn">${ri+2}</th>${def.cols.map((col,ci)=>{
    const sel = FTT.sel && FTT.sel.sheet===k && FTT.sel.r===ri && FTT.sel.c===ci;
    return `<td class="ftt-c ${col.kind==="list"?"is-list":""}${sel?" is-sel":""}" onclick="FTTracker.select('${k}',${ri},${ci})" ondblclick="FTTracker.edit()">${e(row[ci]||"")}</td>`;
  }).join("")}</tr>`).join("");
  return `${def.note?`<div class="ftt-note">🔒 ${e(def.note)}</div>`:""}<table class="ftt-grid">${widths}<thead>${letters}</thead><tbody>${head}${body}</tbody></table>`;
}

/* ---------- the check panel: live today, saved results for past days ---------- */
function renderCheckPanel(){
  const t = FTT.data, D = FTT.day || today();
  const saved = (FTT.review && FTT.review.days && FTT.review.days[D]) || null;
  const live = liveCheck(D);
  const res = live;   // the rules run on the sheet as it is now; the daily run keeps its own copy
  if(res.na) return `<div class="card ftt-check"><h3>Daily check · ${TR.fmtDate(D)}</h3><p class="ftt-muted">This day is before the tracker started, so it isn't checked.</p></div>`;
  const dates = Array.from(new Set([...(t.tracker.noteDates||[]), ...Object.keys((FTT.review&&FTT.review.days)||{})])).sort().reverse();
  const hist = dates.slice(0, 20).map(d=>{
    const s = FTT.review.days[d]; const p = s ? s.pct : TR.checkDay(t, d).pct;
    if(p==null) return "";
    return `<button class="ftt-hday ${d===D?"on":""} ${p>=100?"ok":p>=60?"mid":"bad"}" onclick="FTTracker.day('${d}')">${TR.fmtDate(d).slice(0,5)}<b>${p}%</b></button>`;
  }).join("");
  const flagRows = res.flags.map(f=>{ const r = t.tracker.rows.find(x=>x.id===f.row); return `<li><a class="ftt-link" onclick="FTTracker.select('tracker','${f.row}','${f.col}', true)">${e((r&&r.details)||"(untitled task)")}</a> — ${e(f.msg)}</li>`; }).join("");
  const comment = saved && saved.comment;
  return `
  <div class="card ftt-check">
    <div class="ftt-check-head">
      <div><h3>Daily check · ${TR.fmtDate(D)}${D===today()?" (today)":""}</h3>
        <p>The platform checks this tracker automatically every training day${D===today()?"; flags update as you type":""}.</p></div>
      <div class="ftt-pct ${res.pct>=100?"ok":res.pct>=60?"mid":"bad"}">${res.pct}%</div>
    </div>
    <div class="ftt-hist">${hist}</div>
    <ul class="ftt-rules">${res.rules.map(r=>`<li class="${r.pass?"ok":"bad"}"><span>${r.pass?"✅":"❌"}</span><div><b>${e(r.label)}</b><br><small>${e(r.detail)}</small></div><em>${r.pct}%</em></li>`).join("")}</ul>
    ${flagRows ? `<div class="ftt-flags"><b>⚑ Flagged (${res.flags.length})</b><ul>${flagRows}</ul></div>` : ""}
    <div class="ftt-review"><b>📝 Notes review</b>${saved && saved.review ? `<div class="ftt-review-body">${e(saved.review).replace(/\n/g,"<br>")}</div><small>Reviewed ${new Date(saved.checkedAt).toLocaleString()}</small>` : `<div class="ftt-muted">The notes are reviewed at the end of each training day.</div>`}</div>
    <div class="ftt-comment"><b>💬 Trainer's comment</b>
      ${FTT.admin ? `<textarea id="fttComment" rows="3" placeholder="Write feedback for this day…">${e(comment||"")}</textarea>
        <div style="margin-top:8px;display:flex;gap:8px;"><button class="btn btn-primary btn-sm" onclick="FTTracker.saveComment()">Save comment</button>
        <button class="btn btn-ghost btn-sm" onclick="FTTracker.runNow('${FTT.id}')">Run the check now</button></div>`
      : (comment ? `<div class="ftt-review-body">${e(comment).replace(/\n/g,"<br>")}</div>` : `<div class="ftt-muted">No comment from your trainer for this day yet.</div>`)}
    </div>
  </div>`;
}

/* ---------- editing ---------- */
function colsFor(sheet){ return sheet==="tracker" ? mainCols(FTT.data) : OTHER[sheet].cols.map((c,i)=>Object.assign({i},c)); }
function selectCell(sheet, r, k, scroll){
  if(sheet==="tracker" && FTT.sheet!=="tracker"){ FTT.sheet = "tracker"; }
  FTT.sel = sheet==="tracker" ? {sheet, r, k} : {sheet, r:+r, c:+k};
  render();
  const td = document.querySelector(".ftt-c.is-sel");
  if(td && scroll) td.scrollIntoView({block:"center", inline:"center", behavior:"smooth"});
}
function colDef(){
  const s = FTT.sel; if(!s) return null;
  return s.sheet==="tracker" ? mainCols(FTT.data).find(c=>c.k===s.k) : OTHER[s.sheet].cols[s.c];
}
function writeSel(v){
  const s = FTT.sel; if(!s || FTT.readOnly) return;
  if(s.sheet==="tracker"){
    const r = FTT.data.tracker.rows.find(x=>x.id===s.r); if(!r) return;
    setCellVal(r, s.k, v);
    if(s.k==="status" && v==="Completed"){
      if(!r.completedOn) r.completedOn = today();
      if(r.section==="completion") r.section = "completed";
    }
    if(s.k==="status" && v && v!=="Completed" && r.section==="completed") r.section = "completion";
  } else {
    const rows = FTT.data[s.sheet].rows; while(rows.length<=s.r) rows.push([]);
    rows[s.r][s.c] = v;
  }
  queueSave();
}
function startEdit(initial){
  const s = FTT.sel; if(!s || FTT.readOnly) return;
  const td = document.querySelector(".ftt-c.is-sel"); if(!td) return;
  const col = colDef(), cur = selValue();
  const rect = td.getBoundingClientRect(), wrap = document.getElementById("fttWrap").getBoundingClientRect();
  const box = document.createElement("div"); box.className = "ftt-editor";
  box.style.left = (td.offsetLeft) + "px"; box.style.top = (td.offsetTop) + "px"; box.style.minWidth = Math.max(rect.width, 180) + "px";
  let input;
  if(col && col.kind==="list"){
    input = document.createElement("select");
    input.innerHTML = `<option value=""></option>` + col.list.map(o=>`<option ${o===cur?"selected":""}>${e(o)}</option>`).join("");
    input.onchange = ()=>{ writeSel(input.value); render(); };
  } else if(col && col.kind==="date"){
    input = document.createElement("input"); input.type = "date"; input.value = cur;
    input.onchange = ()=>{ writeSel(input.value); render(); };
  } else {
    input = document.createElement("textarea"); input.value = initial!=null ? initial : cur; input.rows = Math.min(8, Math.max(2, (input.value.match(/\n/g)||[]).length + 1));
    input.style.minHeight = Math.max(rect.height, 40) + "px";
  }
  box.appendChild(input);
  document.querySelector("#fttWrap table").parentNode.appendChild(box);
  FTT.editing = {box, input, text: input.tagName==="TEXTAREA"};
  input.focus(); if(input.tagName==="TEXTAREA" && initial==null) input.select();
  input.addEventListener("keydown", ev=>{
    if(ev.key==="Escape"){ ev.preventDefault(); stopEdit(false); }
    else if(ev.key==="Enter" && FTT.editing.text && !ev.shiftKey && !ev.altKey){ ev.preventDefault(); stopEdit(true); move(1,0); }
    else if(ev.key==="Tab"){ ev.preventDefault(); stopEdit(true); move(0, ev.shiftKey?-1:1); }
  });
  input.addEventListener("blur", ()=>setTimeout(()=>{ if(FTT.editing && FTT.editing.input===input) stopEdit(true); }, 120));
}
function stopEdit(commit){
  const ed = FTT.editing; if(!ed) return; FTT.editing = null;
  if(commit && ed.text) writeSel(ed.input.value);
  render();
}
function move(dr, dc){
  const s = FTT.sel; if(!s) return;
  if(s.sheet==="tracker"){
    const cols = mainCols(FTT.data), rows = orderedRows(FTT.data).filter(x=>x.row).map(x=>x.row.id);
    let ci = cols.findIndex(c=>c.k===s.k) + dc, ri = rows.indexOf(s.r) + dr;
    ci = Math.max(0, Math.min(cols.length-1, ci)); ri = Math.max(0, Math.min(rows.length-1, ri));
    FTT.sel = {sheet:"tracker", r:rows[ri], k:cols[ci].k};
  } else {
    const n = OTHER[s.sheet].cols.length, m = FTT.data[s.sheet].rows.length;
    FTT.sel = {sheet:s.sheet, r:Math.max(0, Math.min(m-1, s.r+dr)), c:Math.max(0, Math.min(n-1, s.c+dc))};
  }
  render();
  const td = document.querySelector(".ftt-c.is-sel"); if(td) td.scrollIntoView({block:"nearest", inline:"nearest"});
}
document.addEventListener("keydown", ev=>{
  if(state.view!=="tracker" || !FTT.sel || FTT.editing) return;
  const tag = (ev.target && ev.target.tagName) || "";
  if(["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
  const k = ev.key;
  if(k==="ArrowDown"){ ev.preventDefault(); move(1,0); }
  else if(k==="ArrowUp"){ ev.preventDefault(); move(-1,0); }
  else if(k==="ArrowRight" || k==="Tab" && !ev.shiftKey){ ev.preventDefault(); move(0,1); }
  else if(k==="ArrowLeft" || k==="Tab" && ev.shiftKey){ ev.preventDefault(); move(0,-1); }
  else if(k==="Enter" || k==="F2"){ ev.preventDefault(); startEdit(); }
  else if((k==="Delete" || k==="Backspace") && !FTT.readOnly){ ev.preventDefault(); writeSel(""); render(); }
  else if(k.length===1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !FTT.readOnly){
    const col = colDef(); if(col && (col.kind==="list" || col.kind==="date")){ ev.preventDefault(); startEdit(); return; }
    ev.preventDefault(); startEdit(k);
  }
});

/* ---------- admin: every trainee's tracker, batch by batch ---------- */
/* Batch → trainee → their daily records. Only active trainees' trackers are
   loaded; archived batches are listed from their trainee records and a
   trainee's records there are fetched when opened, so old batches cost nothing. */
const FTA = {rows:null, archived:null, loading:false, criteria:null, running:false, open:{}, closed:{}, archOpen:false, arch:{}};
async function loadAdmin(){
  FTA.loading = true;
  try{
    const keys = (await sharedList("tracker:")) || [];
    const ids = keys.map(k=>String(k).replace(/^tracker:/,""));
    // The trainee records in one request, then the active trainees' sheets and reviews a few requests at most
    // (sharedGetMany; ftGetMany in js/ft-updates.js), not one request per record.
    const people = await sharedGetMany(ids.map(id=>"trainee:"+id));
    const recs = ids.map((id, i)=>{ const rec = people[i]; return {id, name:(rec&&rec.name)||id, batch:(rec&&rec.batch)||"", archived:!!(rec&&rec.archived)}; });
    const live = recs.filter(x=>!x.archived);
    const sheets = await ftGetMany(live.flatMap(x=>["tracker:"+x.id, "trackerreview:"+x.id]));
    const active = live.map((x, i)=>Object.assign(x, {t:sheets[2*i], rv:sheets[2*i+1]||{days:{}}}));
    FTA.rows = active.filter(x=>x.t).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    FTA.archived = recs.filter(x=>x.archived).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    const c = await sharedGet("settings:trackercriteria");
    FTA.criteria = (c && c.text) || TR.DEFAULT_CRITERIA;
  }catch(err){ FTA.rows = []; FTA.archived = []; }
  FTA.loading = false;
  if(state.view==="admin" && state.adminTab==="trackers") render();
}
const fttBatch = (b)=> b ? `Batch ${b}` : "No batch set";
const fttJs = (v)=> e(JSON.stringify(v));
function fttDays(n){ const out = [], d = new Date(today()+"T12:00:00Z"); while(out.length<n){ const iso = d.toISOString().slice(0,10); if(TR.isWeekday(iso)) out.push(iso); d.setUTCDate(d.getUTCDate()-1); } return out.reverse(); }
// One day's result: the stored end-of-day check (with the trainer's comment) or, for today, the live check.
function fttDay(x, d){
  const s = x.rv.days[d]; const live = x.t ? TR.checkDay(x.t, d) : null;
  if(!s && (!live || live.na)) return null;
  return {pct: s ? s.pct : live.pct, flags: (s ? s.flags : live.flags) || [], comment: s && s.comment, stored: !!s};
}
function fttCell(x, d){
  const r = fttDay(x, d);
  if(!r) return `<td class="ftt-acell na" title="Before this trainee's first tracker day">—</td>`;
  const n = r.flags.length;
  return `<td class="ftt-acell ${r.pct>=100?"ok":r.pct>=60?"mid":"bad"}" onclick="event.stopPropagation();FTTracker.openAdmin('${x.id}','${d}')" title="${n} flag${n===1?"":"s"}${r.comment?" · commented":""}">${r.pct}%${n?`<small>⚑ ${n}</small>`:""}${r.comment?"<i>💬</i>":""}</td>`;
}
// Every record on file for a trainee, newest first.
function fttRecords(x){
  const dates = new Set(Object.keys(x.rv.days||{})); if(x.t){ const td = today(); if(TR.isWeekday(td) && fttDay(x, td)) dates.add(td); }
  const list = [...dates].sort().reverse().map(d=>({d, r: fttDay(x, d)})).filter(o=>o.r);
  if(!list.length) return `<div class="ftt-muted" style="padding:8px 0;">No daily records yet.</div>`;
  return `<table class="ftt-rtable"><thead><tr><th>Day</th><th>Check</th><th>Flags</th><th>Your comment</th><th></th></tr></thead><tbody>
    ${list.map(({d, r})=>`<tr><td>${e(TR.fmtDate(d))}${d===today()?' <em class="ftt-live">today · live</em>':""}</td>
      <td><span class="ftt-pill ${r.pct>=100?"ok":r.pct>=60?"mid":"bad"}">${r.pct}%</span></td>
      <td>${r.flags.length ? `⚑ ${r.flags.length}` : '<span class="ftt-muted">none</span>'}</td>
      <td>${r.comment ? e(String(r.comment).slice(0,140)) + (String(r.comment).length>140?"…":"") : '<span class="ftt-muted">—</span>'}</td>
      <td>${x.t ? `<button class="btn btn-ghost btn-sm" onclick="FTTracker.openAdmin('${x.id}','${d}')">Open day</button>` : ""}</td></tr>`).join("")}</tbody></table>`;
}
function fttTraineeRows(list, days){
  return list.map(x=>{
    const c = counts(x.t), open = (c["New"]||0)+(c["Pending for >3 days"]||0)+(c["Ongoing"]||0)+(c["Priority - Ongoing"]||0);
    const ps = days.map(d=>fttDay(x, d)).filter(Boolean).map(r=>r.pct), avg = ps.length ? Math.round(ps.reduce((a,b)=>a+b,0)/ps.length) : null;
    const isOpen = !!FTA.open[x.id];
    return `<tr class="ftt-trow" onclick="FTTracker.toggle('${x.id}')" aria-expanded="${isOpen}">
        <td><span class="ftt-caret">${isOpen?"▾":"▸"}</span> <b>${e(x.name)}</b></td>
        <td class="ftt-tasks"><b>${open}</b> open · ${c["Completed"]||0} done${c["Pending for >3 days"]?` · <span class="ftt-warn">${c["Pending for >3 days"]} pending &gt;3d</span>`:""}</td>
        ${days.map(d=>fttCell(x, d)).join("")}
        <td class="ftt-avg">${avg==null?"—":avg+"%"}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();FTTracker.openAdmin('${x.id}','${today()}')">Open</button></td></tr>
      ${isOpen ? `<tr class="ftt-rec"><td colspan="${days.length+4}">${fttRecords(x)}</td></tr>` : ""}`;
  }).join("");
}
function fttArchived(){
  const list = FTA.archived || [];
  if(!list.length) return "";
  const groups = {}; list.forEach(x=>{ (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a,b)=>(a==="")-(b==="") || b.localeCompare(a, undefined, {numeric:true}));
  return `<details class="card ftt-admin ftt-archived" ${FTA.archOpen?"open":""} ontoggle="FTTracker.archOpen(this.open)">
    <summary>📦 Archived batches <span class="ftt-n">${keys.length}</span> <span class="ftt-muted">— trainees archived in Admin; their records load when you open one</span></summary>
    ${keys.map(b=>`<div class="ftt-abatch"><b>📁 ${e(fttBatch(b))}</b> <span class="ftt-muted">${groups[b].length} trainee${groups[b].length===1?"":"s"}</span>
      <ul>${groups[b].map(x=>{ const st = FTA.arch[x.id];
        return `<li><button class="ftt-linkbtn" onclick="FTTracker.archRecords('${x.id}')">${st&&st.show?"▾":"▸"} ${e(x.name)}</button>
          ${st&&st.show ? (st.loading ? '<div class="ftt-muted">Loading…</div>' : fttRecords(Object.assign({}, x, {t:null, rv:st.rv}))) : ""}</li>`; }).join("")}</ul></div>`).join("")}
  </details>`;
}
function renderAdminTrackers(){
  if(!FTA.rows && !FTA.loading) loadAdmin();
  if(!FTA.rows) return `<div class="card" style="padding:24px;">Loading the Task Trackers…</div>`;
  const D = today(), days = fttDays(5);
  const groups = {}; FTA.rows.forEach(x=>{ (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a,b)=>(a==="")-(b==="") || b.localeCompare(a, undefined, {numeric:true}));
  const head = `<thead><tr><th>Trainee</th><th>Tasks</th>${days.map(d=>`<th>${TR.fmtDate(d).slice(0,5)}${d===D?"<br><em>today</em>":""}</th>`).join("")}<th>5-day avg</th><th></th></tr></thead>`;
  const batches = keys.map(b=>{
    const list = groups[b], closed = !!FTA.closed[b];
    const todays = list.map(x=>fttDay(x, D)).filter(Boolean);
    const avg = todays.length ? Math.round(todays.reduce((a,r)=>a+r.pct,0)/todays.length) : null;
    const attention = todays.filter(r=>r.pct<100).length;
    return `<section class="ftt-batch">
      <div class="ftt-batch-hd" onclick="FTTracker.toggleBatch(${fttJs(b)})"><span class="ftt-caret">${closed?"▸":"▾"}</span> <b>📁 ${e(fttBatch(b))}</b>
        <span class="ftt-muted">${list.length} trainee${list.length===1?"":"s"}${avg!=null?` · today ${avg}% avg`:""}${attention?` · <span class="ftt-warn">${attention} need${attention===1?"s":""} attention</span>`:""}</span></div>
      ${closed ? "" : `<div class="ftt-atable-wrap"><table class="ftt-atable">${head}<tbody>${fttTraineeRows(list, days)}</tbody></table></div>`}
    </section>`; }).join("");
  return `
  <div class="card ftt-admin">
    <h3>📋 Task Trackers</h3>
    <p class="ftt-muted">Each trainee's Daily Task Tracker, by batch, checked automatically at the end of every training day (7 PM Pacific daylight time, 6 PM in winter). Click a trainee for all their daily records; click a day to see the flagged cells, the notes review, and leave your comment.</p>
    ${FTA.rows.length ? batches : `<div class="ftt-muted" style="margin:14px 0;">No active trainee has opened their Task Tracker yet.</div>`}
    <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" ${FTA.running?"disabled":""} onclick="FTTracker.runNow()">${FTA.running?"Checking…":"Run today's check now"}</button>
      <button class="btn btn-ghost btn-sm" onclick="FTA_reload()">↻ Refresh</button>
    </div>
  </div>
  ${fttArchived()}
  <div class="card ftt-admin">
    <h3>Notes review criteria</h3>
    <p class="ftt-muted">What the daily notes review looks for. Trainees see the review as "Notes review".</p>
    <textarea id="fttCriteria" rows="6" style="width:100%;">${e(FTA.criteria||"")}</textarea>
    <div style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="FTTracker.saveCriteria()">Save criteria</button></div>
  </div>`;
}
window.FTA_reload = function(){ FTA.rows = null; render(); };

/* ---------- actions ---------- */
window.FTTracker = {
  toggle(id){ FTA.open[id] = !FTA.open[id]; render(); },
  archOpen(v){ FTA.archOpen = !!v; },
  toggleBatch(b){ FTA.closed[b] = !FTA.closed[b]; render(); },
  async archRecords(id){
    const cur = FTA.arch[id];
    if(cur && cur.show){ cur.show = false; render(); return; }
    if(cur && cur.rv){ cur.show = true; render(); return; }
    FTA.arch[id] = {show:true, loading:true}; render();
    const rv = await sharedGet("trackerreview:"+id).catch(()=>null);
    FTA.arch[id] = {show:true, rv: rv || {days:{}}}; render();
  },
  tab(k){ FTT.sheet = k; FTT.sel = null; render(); },
  select(sheet, r, k, scroll){ selectCell(sheet, r, k, scroll); },
  edit(){ startEdit(); },
  day(d){ FTT.day = d; render(); },
  fxInput(v){
    if(!FTT.sel || FTT.readOnly) return;
    const col = colDef() || {};
    if(col.kind==="list" || col.kind==="date") return;   // pick those from the cell's dropdown / date picker
    writeSel(v); const td = document.querySelector(".ftt-c.is-sel"); if(td) td.textContent = v;
  },
  addRow(section){
    if(FTT.readOnly) return;
    if(FTT.sheet==="tracker"){
      const r = TR.taskRow(section||"completion", {dateReceived: today(), va: ftFirstName(), status: section==="recurring" ? "Ongoing" : "New", type: "LSH-TRAINING"});
      FTT.data.tracker.rows.push(r); FTT.sel = {sheet:"tracker", r:r.id, k:"details"};
    } else {
      const rows = FTT.data[FTT.sheet].rows; rows.push(OTHER[FTT.sheet].cols.map(()=> "")); FTT.sel = {sheet:FTT.sheet, r:rows.length-1, c:0};
    }
    queueSave(); render(); setTimeout(()=>startEdit(""), 30);
  },
  addDate(){
    if(FTT.readOnly) return;
    const v = prompt("Add a Daily Notes column for which date? (YYYY-MM-DD)", today());
    if(!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    if(!FTT.data.tracker.noteDates.includes(v)) FTT.data.tracker.noteDates.push(v);
    queueSave(); render();
  },
  deleteRow(){
    const s = FTT.sel; if(!s || FTT.readOnly) return toast("Select a cell in the row to delete.");
    if(!confirm("Delete this row?")) return;
    if(s.sheet==="tracker") FTT.data.tracker.rows = FTT.data.tracker.rows.filter(r=>r.id!==s.r);
    else FTT.data[s.sheet].rows.splice(s.r, 1);
    FTT.sel = null; queueSave(); render();
  },
  openAdmin(id, d){
    const x = (FTA.rows||[]).find(r=>r.id===id);
    FTT.admin = {id, name: x ? x.name : id}; FTT.day = d || today(); FTT.id = null; FTT.sheet = "tracker";
    goto("tracker");
  },
  closeAdmin(){ FTT.admin = null; FTT.id = null; FTT.data = null; state.adminTab = "trackers"; FTA.rows = null; FTA.archived = null; goto("admin"); },
  async saveComment(){
    const D = FTT.day || today(), v = (document.getElementById("fttComment")||{}).value || "";
    const cur = (await sharedGet("trackerreview:"+FTT.id)) || {days:{}};
    cur.days[D] = Object.assign({}, cur.days[D] || TR.checkDay(FTT.data, D), {comment: v.trim(), commentAt: new Date().toISOString()});
    cur.updatedAt = new Date().toISOString();
    const ok = await sharedSet("trackerreview:"+FTT.id, cur);
    if(ok){ FTT.review = cur; toast("Comment saved. The trainee sees it on their tracker."); render(); } else toast("Couldn't save — check your connection and try again.");
  },
  async saveCriteria(){
    const v = (document.getElementById("fttCriteria")||{}).value || "";
    const ok = await sharedSet("settings:trackercriteria", {text: v.trim(), updatedAt: new Date().toISOString()});
    FTA.criteria = v.trim(); toast(ok ? "Criteria saved. The next daily review uses them." : "Couldn't save — check your connection and try again.");
  },
  async runNow(id){
    FTA.running = true; render();
    try{
      const r = await authFetch("/api/tracker/check", id ? {id, date: FTT.day || today()} : {});
      const j = await r.json().catch(()=>({}));
      toast(r.ok ? `Checked ${j.checked||0} tracker${j.checked===1?"":"s"} for ${TR.fmtDate(j.date)}.` : (j.error || "The check couldn't run."));
      if(id){ FTT.review = (await sharedGet("trackerreview:"+id)) || FTT.review; } else FTA.rows = null;
    }catch(err){ toast("The check couldn't run — check your connection."); }
    FTA.running = false; render();
  }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view!=="tracker") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  const wrap = document.getElementById("fttWrap"), sx = wrap ? wrap.scrollLeft : 0, sy = wrap ? wrap.scrollTop : 0;
  app.innerHTML = renderTopbar() + `<main class="main-tracker">${renderTracker()}</main>` + renderFooter();
  const w2 = document.getElementById("fttWrap"); if(w2){ w2.scrollLeft = sx; w2.scrollTop = sy; }
  try{ afterRender(); }catch(err){}
};
const __topbar = window.renderTopbar;
window.renderTopbar = function(){
  const html = __topbar.apply(this, arguments);
  if(!state.traineeId || state.isAdmin && !state.adminPreview) return html;
  const btn = `<button class="${state.view==="tracker"?"active":""}" onclick="goto('tracker')">📋 Task Tracker</button>`;
  return html.replace(/(<button[^>]*onclick="goto\('dashboard'\)"[^>]*>[^<]*<\/button>)/, "$1" + btn);
};
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab==="trackers"?"active":""}" onclick="setAdminTab('trackers')">📋 Task Trackers</button>`;
  if(state.adminTab==="trackers"){
    state.adminTab = "opendays";                   // borrow the tab bar…
    let out = __admin.apply(this, arguments);
    state.adminTab = "trackers";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>";
    return bar + renderAdminTrackers();
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
};
// the dashboard shows today's check for the trainee
const __dash = window.renderDashboard;
window.renderDashboard = function(){
  const html = __dash.apply(this, arguments);
  if(!state.traineeId || state.isAdmin) return html;
  if(FTT.id!==state.traineeId && !FTT.loading){ load(state.traineeId); return html; }
  if(!FTT.data) return html;
  const c = liveCheck(today());
  const card = `<div class="card stat ftt-dash" onclick="goto('tracker')" style="cursor:pointer;"><div class="num ${c.pct>=100?"ok":c.pct>=60?"mid":"bad"}">${c.pct}%</div><div class="lbl">📋 Task Tracker today${c.flags.length?` · ⚑ ${c.flags.length} to fix`:" · all set"}</div></div>`;
  return html.replace('<aside class="dash-side"><div class="dash-side-inner">', '<aside class="dash-side"><div class="dash-side-inner">' + card);
};

/* ---------- styles: Google Sheets look ---------- */
(function(){ const s = document.createElement("style"); s.id = "ft-tracker"; s.textContent = `
main.main-tracker{max-width:none;}
.ftt{background:#fff;border:1px solid #dadce0;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.06);}
.ftt-titlebar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid #e3e3e3;background:#f9fbfd;}
.ftt-doc{display:flex;align-items:center;gap:10px;}
.ftt-doc b{display:block;font-size:15px;color:#202124;}
.ftt-icon{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:5px;background:#0f9d58;color:#fff;font-size:16px;}
.ftt-save{font-size:12px;color:#5f6368;}
.ftt-tools{display:flex;gap:6px;flex-wrap:wrap;}
.ftt-fx{display:flex;align-items:stretch;border-bottom:1px solid #e3e3e3;font-size:13px;}
.ftt-ref{width:70px;padding:6px 8px;border-right:1px solid #e3e3e3;color:#202124;text-align:center;}
.ftt-fxi{padding:6px 8px;color:#80868b;font-style:italic;border-right:1px solid #e3e3e3;}
#fttFx{flex:1;border:none;resize:none;padding:6px 8px;font:13px Arial,sans-serif;outline:none;min-height:30px;}
.ftt-wrap{position:relative;overflow:auto;max-height:66vh;background:#fff;}
.ftt-grid{border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:13px;color:#202124;}
.ftt-grid th, .ftt-grid td{border-right:1px solid #e2e3e3;border-bottom:1px solid #e2e3e3;padding:4px 6px;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.35;}
.ftt-letters th{position:sticky;top:0;z-index:3;background:#f8f9fa;color:#5f6368;font-weight:400;font-size:11px;text-align:center;padding:3px;}
.ftt-corner{left:0;z-index:4 !important;}
.ftt-rn{position:sticky;left:0;z-index:2;background:#f8f9fa;color:#5f6368;font-weight:400;font-size:11px;text-align:center;}
.ftt-head th{background:#0b2447;color:#fff;font-weight:700;text-align:left;position:sticky;top:21px;z-index:2;}
.ftt-head th.ftt-rn{background:#f8f9fa;color:#5f6368;z-index:3;}
.ftt-head th.is-today{background:#1a73e8;}
.ftt-head th em{font-style:normal;font-size:10px;background:#fff;color:#1a73e8;border-radius:8px;padding:0 5px;margin-left:4px;}
.ftt-band td.ftt-bandcell{background:#fce8b2;font-weight:700;text-align:center;}
.ftt-sum td{background:#fff;}
.ftt-num{font-weight:700;}
.ftt-section td{background:#e8f0fe;color:#174ea6;}
.ftt-add{margin-left:10px;font-size:12px;color:#1a73e8;cursor:pointer;font-weight:400;}
.ftt-c{cursor:cell;min-height:22px;height:auto;background:#fff;}
.ftt-c.is-list{background:#fbfbfb;}
.ftt-c.is-day{background:#fffdf0;}
.ftt-c.is-flag{background:#fce8e6;box-shadow:inset 0 0 0 1px #d93025;}
.ftt-c.is-flag::after{content:"⚑";color:#d93025;font-size:11px;float:right;}
.ftt-c.is-sel{box-shadow:inset 0 0 0 2px #1a73e8;}
.ftt-chip{display:inline-block;border-radius:10px;padding:1px 8px;font-size:12px;font-weight:700;white-space:nowrap;}
.st-new{background:#d2e3fc;color:#174ea6;} .st-pending{background:#fad2cf;color:#a50e0e;} .st-ongoing{background:#fef7c3;color:#7a5d00;}
.st-priority{background:#fedfc8;color:#b3470c;} .st-completed{background:#ceead6;color:#0d652d;}
.ftt-editor{position:absolute;z-index:10;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);border:2px solid #1a73e8;}
.ftt-editor textarea{display:block;width:100%;min-width:220px;border:none;outline:none;resize:both;font:13px Arial,sans-serif;padding:4px 6px;}
.ftt-editor select, .ftt-editor input{font:13px Arial,sans-serif;padding:4px;border:none;outline:none;min-width:100%;}
.ftt-tabs{display:flex;gap:2px;background:#f1f3f4;border-top:1px solid #dadce0;padding:0 8px;overflow-x:auto;}
.ftt-tab{border:none;background:transparent;padding:8px 14px;font:13px Arial,sans-serif;color:#3c4043;cursor:pointer;white-space:nowrap;border-bottom:3px solid transparent;}
.ftt-tab.on{background:#fff;color:#188038;font-weight:700;border-bottom-color:#188038;}
.ftt-note{padding:8px 12px;background:#fef7e0;color:#7a5d00;font-size:13px;border-bottom:1px solid #f4e3a1;}
.ftt-check{margin-top:16px;padding:18px 20px;}
.ftt-check-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}
.ftt-check h3{margin:0;color:var(--navy);} .ftt-check p{margin:4px 0 0;color:var(--ink-soft);font-size:13.5px;}
.ftt-pct{font-size:32px;font-weight:800;}
.ok{color:#188038;} .mid{color:#b06000;} .bad{color:#d93025;}
.ftt-hist{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;}
.ftt-hday{border:1px solid var(--line);background:#fff;border-radius:8px;padding:4px 8px;font-size:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;}
.ftt-hday b{font-size:13px;} .ftt-hday.on{outline:2px solid #1a73e8;}
.ftt-rules{list-style:none;padding:0;margin:8px 0;}
.ftt-rules li{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line);}
.ftt-rules li em{margin-left:auto;font-style:normal;font-weight:700;}
.ftt-flags{background:#fce8e6;border-radius:8px;padding:10px 14px;margin:10px 0;font-size:14px;}
.ftt-flags ul{margin:6px 0 0;padding-left:18px;}
.ftt-review, .ftt-comment{margin-top:14px;font-size:14px;}
.ftt-review-body{background:#f8f9fa;border-radius:8px;padding:10px 12px;margin:6px 0;line-height:1.5;}
.ftt-comment textarea{width:100%;margin-top:6px;font:inherit;padding:8px;border:1px solid var(--line);border-radius:8px;}
.ftt-muted{color:var(--ink-soft);font-size:13.5px;margin-top:4px;}
.ftt-link{color:#1a73e8;cursor:pointer;}
.ftt-admin{padding:18px 20px;margin-bottom:14px;} .ftt-admin h3{margin:0 0 4px;color:var(--navy);}
.ftt-atable-wrap{overflow-x:auto;margin-top:12px;}
.ftt-atable{border-collapse:collapse;width:100%;font-size:14px;}
.ftt-atable th, .ftt-atable td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left;}
.ftt-atable th em{font-style:normal;font-size:11px;color:#1a73e8;}
.ftt-acell{cursor:pointer;font-weight:700;text-align:center !important;}
.ftt-acell.na{color:var(--ink-soft);font-weight:400;cursor:default;}
.ftt-acell small{display:block;font-size:11px;font-weight:600;} .ftt-acell i{font-style:normal;font-size:11px;}
.ftt-batch{margin-top:14px;border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.ftt-batch-hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 14px;background:#F8F9FC;cursor:pointer;user-select:none;}
.ftt-batch-hd b{color:var(--navy);font-size:15px;} .ftt-batch .ftt-atable-wrap{margin-top:0;}
.ftt-caret{display:inline-block;width:12px;color:var(--ink-soft);}
.ftt-trow{cursor:pointer;} .ftt-trow:hover td{background:#FAFBFD;}
.ftt-tasks{font-size:13px;white-space:nowrap;} .ftt-avg{font-weight:700;text-align:center !important;}
.ftt-warn{color:#b45309;font-weight:700;}
.ftt-rec td{background:#FBFCFE;padding:6px 14px 12px !important;}
.ftt-rtable{border-collapse:collapse;width:100%;font-size:13px;} .ftt-rtable th,.ftt-rtable td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;}
.ftt-rtable th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-soft);}
.ftt-pill{display:inline-block;min-width:44px;text-align:center;padding:2px 8px;border-radius:999px;font-weight:700;}
.ftt-pill.ok{background:#e6f4ea;color:#137333;} .ftt-pill.mid{background:#fef7e0;color:#b06000;} .ftt-pill.bad{background:#fce8e6;color:#c5221f;}
.ftt-live{font-style:normal;font-size:11px;color:#1a73e8;}
.ftt-archived summary{cursor:pointer;font-weight:800;color:var(--navy);} .ftt-n{display:inline-block;padding:1px 8px;border-radius:999px;background:#eef2f7;font-size:12px;}
.ftt-abatch{margin-top:12px;} .ftt-abatch ul{list-style:none;margin:6px 0 0;padding:0;} .ftt-abatch li{padding:4px 0;border-top:1px solid var(--line);}
.ftt-linkbtn{background:none;border:none;padding:4px 0;font:inherit;color:var(--navy);cursor:pointer;font-weight:600;}
.ftt-dash .num.ok{color:#188038;} .ftt-dash .num.mid{color:#b06000;} .ftt-dash .num.bad{color:#d93025;}
`; document.head.appendChild(s); })();
})();
