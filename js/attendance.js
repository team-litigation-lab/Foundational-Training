/* ============================================================
   🕘 Attendance — Admin → 🕘 Attendance (trainers only)
   The same file is in every LSH course repo (EA-PA-TRAINING,
   Case-Management-Training, propertydamageclaimstraining,
   Foundational-Training). Change it in all of them. The LSH Training
   Portal's 🕘 Attendance page (attendance.html) reads and writes the
   same records, for every program.
   Trainers take each day's attendance, batch by batch:
     • the date is today's (Pacific time, the firm's time zone) and the
       batch's Day N is counted from the days already logged for it; both
       can be changed (📅 date picker, the Day box);
     • every approved, active trainee of the batch is listed with their
       Name, the Training they're taking (defaultTraining; changeable for
       the batch or for one trainee), Time In / Time Out (typed, or
       ⏱ Now), the Status the trainer tags (STATUSES, the attendance
       sheet's dropdown and colors) and Notes;
     • 📊 Summary shows each trainee's count of every status over all the
       batch's logged days; ⬇ CSV downloads a day or a batch's history.
   Stored per batch per day: attendance:<batch key>:<YYYY-MM-DD> =
     {v, batch, date, day, training, rows:{<trainee id>:{name, training, timeIn, timeOut, status, note, at}}, updatedAt}
   (the batch key is slugPart(batch), "_none" for no batch; each course's
   Worker adds its own KV prefix). Trainer-only: the Workers let admins
   read and write any key, and trainees none of these. A save re-reads the
   day and writes only the rows changed here, so two trainers can take one
   batch's attendance at once.
   ============================================================ */
(function(){
"use strict";
// Training days follow the firm's time zone.
const TZ = "America/Los_Angeles";
const TR = {
  ptDate(d){
    const p = new Intl.DateTimeFormat("en-CA", {timeZone:TZ, year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(d || new Date());
    const g = t => (p.find(x => x.type === t) || {}).value;
    return `${g("year")}-${g("month")}-${g("day")}`;
  },
  isWeekday(iso){ const n = new Date(iso + "T12:00:00Z").getUTCDay(); return n >= 1 && n <= 5; },
  fmtDate(iso){ const [y, m, d] = String(iso || "").split("-"); return y && m && d ? `${m}/${d}/${y}` : String(iso || ""); }
};
// The attendance sheet's statuses, in its order, with its chip colors.
const STATUSES = [
  {label:"Present", bg:"#11734b", fg:"#ffffff"},
  {label:"Late", bg:"#d4edbc", fg:"#11734b"},
  {label:"Late with Notif", bg:"#e6cff2", fg:"#5a3286"},
  {label:"Early Out - POC Approved", bg:"#ffe5a0", fg:"#473821"},
  {label:"Undertime - POC Approved", bg:"#b10202", fg:"#ffffff"},
  {label:"Undertime - No Approval", bg:"#ffcfc9", fg:"#b10202"},
  {label:"NCNS", bg:"#473821", fg:"#ffffff"},
  {label:"Sick Leave", bg:"#3d3d3d", fg:"#ffffff"},
  {label:"RL", bg:"#ffcfc9", fg:"#b10202"},
  {label:"EOP", bg:"#bfe1f6", fg:"#0a53a8"},
  {label:"Absent with Notif", bg:"#753800", fg:"#ffffff"}
];
const statusOf = v => STATUSES.find(s => s.label.toLowerCase() === String(v || "").trim().toLowerCase()) || null;
const e = v => esc(String(v == null ? "" : v));
const js = v => e(JSON.stringify(v));

// The trainings a trainee can be taking: the program's lessons ("Day N: title"; Foundational names them by
// title), after its orientation and any first days set in ATTENDANCE_TRAININGS_BEFORE (js/ft-updates.js).
const lessonName = d => window.FT_LAYER ? d.title : `Day ${d.id}: ${d.title}`;
function trainings(){
  const before = Array.isArray(window.ATTENDANCE_TRAININGS_BEFORE) ? window.ATTENDANCE_TRAININGS_BEFORE : [];
  const orient = window.FT_ORIENTATION ? [window.FT_ORIENTATION.title] : [];
  return before.concat(orient, DAYS.map(lessonName));
}
// A batch's training for the day. Foundational: its latest open lesson (Admin → 📅 Open Lessons), else the
// orientation. The other courses: the lesson most of the batch is on (each trainee's first unfinished day).
function defaultTraining(b){
  if(!DAYS.length) return "";
  if(typeof ftOpenFor === "function"){
    const open = ftOpenFor(b === NO_BATCH ? "" : b);
    const last = DAYS.filter(d => open.has(d.id)).pop();
    return last ? lessonName(last) : (window.FT_ORIENTATION ? window.FT_ORIENTATION.title : lessonName(DAYS[0]));
  }
  const tally = {};
  (state.adminData || []).filter(r => r && r.approved === true && !r.archived && batchKey(r) === b).forEach(r => {
    const dp = r.dayProgress || {};
    const d = DAYS.find(x => !(dp[x.id] && dp[x.id].done)) || DAYS[DAYS.length - 1];
    tally[d.id] = (tally[d.id] || 0) + 1;
  });
  const top = DAYS.filter(d => tally[d.id]).sort((x, y) => tally[y.id] - tally[x.id] || x.id - y.id)[0] || DAYS[0];
  return lessonName(top);
}
// A record started on the Training Portal has no training yet: it shows the batch's default.
const trainingOf = (r, b) => r.training || defaultTraining(b);

const AT = {date:null, keys:null, recs:{}, loading:false, seq:0, closed:{}, sum:{}, dirty:{}, timers:{}, saving:0, failed:false};
const slugB = b => b === NO_BATCH ? "_none" : (slugPart(b) || "_none");     // "_" is never in a slug, so no batch is named that
const keyOf = (b, date) => `attendance:${slugB(b)}:${date}`;
const today = () => TR.ptDate();
function shiftDay(iso, n){ const d = new Date(iso + "T12:00:00Z"); do d.setUTCDate(d.getUTCDate() + n); while(!TR.isWeekday(d.toISOString().slice(0, 10))); return d.toISOString().slice(0, 10); }
function longDate(iso){ return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", year:"numeric", timeZone:"UTC"}); }
function nowPT(){ return new Intl.DateTimeFormat("en-GB", {timeZone:TZ, hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).format(new Date()); }
function time12(v){
  const m = /^(\d{1,2}):(\d{2})/.exec(String(v || "")); if(!m) return "";
  const h = +m[1]; return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

// Active batches: approved trainees who aren't archived, grouped like the other admin tabs (newest batch first).
function batches(){
  const groups = {};
  (state.adminData || []).filter(r => r && r.approved === true && !r.archived).forEach(r => {
    (groups[batchKey(r)] = groups[batchKey(r)] || []).push({id:r.id, name:r.name || r.id});
  });
  Object.values(groups).forEach(list => list.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
  const keys = Object.keys(groups).sort((a, b) => (a === NO_BATCH) - (b === NO_BATCH) || b.localeCompare(a, undefined, {numeric:true}));
  return keys.map(b => ({b, people:groups[b]}));
}
// The batch's logged days (from the key list), oldest first.
function loggedDates(b){
  const pre = `attendance:${slugB(b)}:`;
  return (AT.keys || []).filter(k => k.startsWith(pre)).map(k => k.slice(pre.length)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
}
function autoDay(b, date){ return loggedDates(b).filter(d => d < date).length + 1; }
// The day's record for a batch: the saved one, or a fresh one (saved on the first change).
function rec(b){
  const k = keyOf(b, AT.date);
  return AT.recs[k] || (AT.recs[k] = {v:1, batch:b === NO_BATCH ? "" : b, date:AT.date, day:autoDay(b, AT.date), training:defaultTraining(b), rows:{}});
}
const rowOf = (b, id) => rec(b).rows[id] || {};

async function load(date){
  const seq = ++AT.seq;                            // a later load (another date) wins
  AT.loading = true; AT.date = date;
  try{
    if(!state.ftOpenDays && typeof ftLoadOpenDays === "function") await ftLoadOpenDays().catch(() => null);
    AT.keys = ((await sharedList("attendance:")) || []).map(k => typeof k === "string" ? k : k.key);
    const want = batches().map(x => keyOf(x.b, date)).filter(k => AT.keys.includes(k) && !AT.dirty[k]);
    const got = await Promise.all(want.map(k => sharedGet(k).catch(() => null)));
    want.forEach((k, i) => { if(got[i]) AT.recs[k] = Object.assign({rows:{}}, got[i]); });
  }catch(err){ AT.keys = AT.keys || []; }
  if(seq !== AT.seq) return;
  AT.loading = false;
  if(state.view === "admin" && state.adminTab === "attendance") keepScroll(render);
}
function keepScroll(fn){ const y = window.scrollY; fn(); window.scrollTo(0, y); }

/* ---------- saving: only what changed here, merged into the latest copy ---------- */
function touch(b, id){
  const k = keyOf(b, AT.date), d = AT.dirty[k] || (AT.dirty[k] = {b, head:false, rows:new Set()});
  if(id) d.rows.add(id); else d.head = true;
  clearTimeout(AT.timers[k]);
  AT.timers[k] = setTimeout(() => save(k), 700);
  paintSave("Saving…");
}
async function save(k){
  const d = AT.dirty[k]; if(!d) return;
  delete AT.dirty[k]; AT.saving++;
  const mine = AT.recs[k];
  let ok = false;
  try{
    const latest = (await sharedGet(k).catch(() => null)) || {v:1, batch:mine.batch, date:mine.date, rows:{}};
    latest.rows = latest.rows || {};
    if(d.head || latest.day == null) latest.day = mine.day;
    if(d.head || !latest.training) latest.training = mine.training;
    d.rows.forEach(id => { latest.rows[id] = mine.rows[id]; });
    latest.updatedAt = new Date().toISOString();
    ok = await sharedSet(k, latest);
    if(ok){
      // Take the other trainer's rows, keep ours that changed since.
      const pending = AT.dirty[k];
      let theirs = false;
      Object.keys(latest.rows).forEach(id => {
        if((pending && pending.rows.has(id)) || d.rows.has(id)) return;
        if(JSON.stringify(mine.rows[id]) !== JSON.stringify(latest.rows[id])){ mine.rows[id] = latest.rows[id]; theirs = true; }
      });
      if(theirs && !isTyping() && state.view === "admin" && state.adminTab === "attendance" && AT.date === mine.date) setTimeout(() => keepScroll(render), 0);
      if(AT.keys && !AT.keys.includes(k)) AT.keys.push(k);
    }
  }catch(err){ ok = false; }
  if(!ok){                                          // try again with the next change, and say so
    const cur = AT.dirty[k] || (AT.dirty[k] = {b:d.b, head:false, rows:new Set()});
    cur.head = cur.head || d.head; d.rows.forEach(id => cur.rows.add(id));
  }
  AT.saving--; AT.failed = !ok;
  if(!ok) toast("Couldn’t save the attendance. Check your connection; it saves again with your next change.");
  paintSave(!ok ? "⚠ Not saved" : AT.saving || Object.keys(AT.dirty).length ? "Saving…" : "✓ Saved");
}
function paintSave(t){ const el = document.getElementById("attSave"); if(el){ el.textContent = t; el.className = "att-save" + (/⚠/.test(t) ? " bad" : ""); } }

/* ---------- the page ---------- */
function counts(b, people){
  const c = {}; let none = 0;
  people.forEach(p => { const s = statusOf(rowOf(b, p.id).status); if(s) c[s.label] = (c[s.label] || 0) + 1; else none++; });
  return STATUSES.filter(s => c[s.label]).map(s => `<span class="att-chip" style="background:${s.bg};color:${s.fg};">${e(s.label)} ${c[s.label]}</span>`).join("")
    + (none ? `<span class="att-chip att-none">Not tagged ${none}</span>` : "");
}
function statusSelect(b, id, v){
  const s = statusOf(v);
  const style = s ? `background:${s.bg};color:${s.fg};` : "";
  return `<select class="att-st${s ? "" : " empty"}" style="${style}" onchange="LSHAttend.status(${js(b)},${js(id)},this)">
    <option value="">— Tag —</option>
    ${STATUSES.map(o => `<option value="${e(o.label)}" style="background:${o.bg};color:${o.fg};" ${s && s.label === o.label ? "selected" : ""}>${e(o.label)}</option>`).join("")}
    ${v && !s ? `<option value="${e(v)}" selected>${e(v)}</option>` : ""}
  </select>`;
}
function trainingSelect(val, onchange, extra, cls){
  const list = trainings();
  return `<select class="att-tr${cls || ""}" onchange="${onchange}">${extra || ""}
    ${list.map(t => `<option value="${e(t)}" ${t === val ? "selected" : ""}>${e(t)}</option>`).join("")}
    ${val && !list.includes(val) ? `<option value="${e(val)}" selected>${e(val)}</option>` : ""}</select>`;
}
function batchSection(x){
  const {b, people} = x, r = rec(b), closed = !!AT.closed[b], label = b === NO_BATCH ? "No batch set" : "Batch " + b;
  const rows = people.map((p, i) => {
    const row = rowOf(b, p.id);
    return `<tr>
      <td class="att-n">${i + 1}</td>
      <td><b>${e(p.name)}</b></td>
      <td title="${row.training ? "Set for this trainee" : "The batch’s training"}">${trainingSelect(row.training || "", `LSHAttend.field(${js(b)},${js(p.id)},'training',this.value)`, `<option value="" ${row.training ? "" : "selected"}>${e(trainingOf(r, b))}</option>`, row.training ? " own" : "")}</td>
      <td class="att-time"><input type="time" value="${e(row.timeIn || "")}" onchange="LSHAttend.field(${js(b)},${js(p.id)},'timeIn',this.value)"><button type="button" class="att-now" title="Now (Pacific time)" onclick="LSHAttend.now(${js(b)},${js(p.id)},'timeIn',this)">⏱</button></td>
      <td class="att-time"><input type="time" value="${e(row.timeOut || "")}" onchange="LSHAttend.field(${js(b)},${js(p.id)},'timeOut',this.value)"><button type="button" class="att-now" title="Now (Pacific time)" onclick="LSHAttend.now(${js(b)},${js(p.id)},'timeOut',this)">⏱</button></td>
      <td>${statusSelect(b, p.id, row.status)}</td>
      <td><input type="text" class="att-note" maxlength="300" placeholder="Notes" value="${e(row.note || "")}" oninput="LSHAttend.field(${js(b)},${js(p.id)},'note',this.value)"></td>
    </tr>`;
  }).join("");
  return `<section class="card att-batch">
    <div class="att-bhd">
      <button type="button" class="att-toggle" onclick="LSHAttend.batch(${js(b)})"><span class="att-caret">${closed ? "▸" : "▾"}</span> 📁 ${e(label)}</button>
      <span class="att-muted">${people.length} trainee${people.length === 1 ? "" : "s"}</span>
      <span class="att-counts" id="attCount-${e(slugB(b))}">${counts(b, people)}</span>
    </div>
    ${closed ? "" : `<div class="att-bbar">
      <label>Day <input type="number" class="att-day" min="1" max="99" value="${e(r.day)}" onchange="LSHAttend.head(${js(b)},'day',this.value)"></label>
      <span class="att-date">${e(longDate(AT.date))}</span>
      <label class="att-trl">Training ${trainingSelect(trainingOf(r, b), `LSHAttend.head(${js(b)},'training',this.value)`)}</label>
      <span class="att-grow"></span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="LSHAttend.allPresent(${js(b)})">✓ Mark the rest Present</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick="LSHAttend.summary(${js(b)})">📊 ${AT.sum[b] ? "Hide summary" : "Summary"}</button>
    </div>
    <div class="att-scroll"><table class="att-table">
      <thead><tr><th>#</th><th>Name</th><th>Training</th><th>Time In (PT)</th><th>Time Out (PT)</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    ${AT.sum[b] ? renderSummary(b, people) : ""}`}
  </section>`;
}

/* ---------- 📊 a batch's summary over all its logged days ---------- */
async function loadSummary(b){
  const pre = `attendance:${slugB(b)}:`;
  AT.sum[b] = {loading:true, recs:null};
  keepScroll(render);
  const keys = ((await sharedList(pre).catch(() => null)) || []).map(k => typeof k === "string" ? k : k.key).filter(k => k.startsWith(pre));
  const recs = (await Promise.all(keys.map(k => sharedGet(k).catch(() => null)))).filter(Boolean);
  // The day on screen may have changes that aren't saved yet.
  const here = AT.recs[keyOf(b, AT.date)];
  if(here){ const i = recs.findIndex(r => r.date === here.date); if(i >= 0) recs[i] = here; else if(Object.keys(here.rows || {}).length) recs.push(here); }
  if(AT.sum[b]) AT.sum[b] = {loading:false, recs:recs.sort((x, y) => String(x.date).localeCompare(String(y.date)))};
  if(state.view === "admin" && state.adminTab === "attendance") keepScroll(render);
}
function renderSummary(b, people){
  const S = AT.sum[b];
  if(!S || S.loading) return `<div class="att-sum att-muted">Loading the batch’s attendance…</div>`;
  if(!S.recs.length) return `<div class="att-sum att-muted">No attendance saved for this batch yet.</div>`;
  const names = {}; people.forEach(p => names[p.id] = p.name);
  S.recs.forEach(r => Object.entries(r.rows || {}).forEach(([id, row]) => { if(!names[id]) names[id] = (row && row.name) || id; }));
  const ids = Object.keys(names).sort((x, y) => names[x].localeCompare(names[y]));
  const tally = {}, used = new Set();
  ids.forEach(id => { tally[id] = {}; S.recs.forEach(r => { const s = statusOf(((r.rows || {})[id] || {}).status); if(s){ tally[id][s.label] = (tally[id][s.label] || 0) + 1; used.add(s.label); } }); });
  const cols = STATUSES.filter(s => used.has(s.label));
  const recent = S.recs.slice(-10);
  return `<div class="att-sum">
    <div class="att-sum-hd"><b>📊 ${S.recs.length} day${S.recs.length === 1 ? "" : "s"} logged</b> <span class="att-muted">${e(TR.fmtDate(S.recs[0].date))} – ${e(TR.fmtDate(S.recs[S.recs.length - 1].date))}</span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="LSHAttend.csvBatch(${js(b)})">⬇ Download all days (CSV)</button></div>
    <div class="att-scroll"><table class="att-table att-stable">
      <thead><tr><th>Name</th>${cols.map(s => `<th><span class="att-chip" style="background:${s.bg};color:${s.fg};">${e(s.label)}</span></th>`).join("")}<th>Not tagged</th><th>Last ${recent.length} day${recent.length === 1 ? "" : "s"}</th></tr></thead>
      <tbody>${ids.map(id => {
        const tagged = Object.values(tally[id]).reduce((a, n) => a + n, 0);
        return `<tr><td><b>${e(names[id])}</b></td>${cols.map(s => `<td>${tally[id][s.label] || '<span class="att-muted">0</span>'}</td>`).join("")}
          <td>${S.recs.length - tagged || '<span class="att-muted">0</span>'}</td>
          <td class="att-dots">${recent.map(r => { const row = (r.rows || {})[id] || {}, s = statusOf(row.status);
            return `<span class="att-dot" style="${s ? `background:${s.bg};` : ""}" title="${e(`Day ${r.day || "?"} · ${TR.fmtDate(r.date)}: ${row.status || "not tagged"}${row.timeIn ? " · in " + time12(row.timeIn) : ""}`)}"></span>`; }).join("")}</td></tr>`;
      }).join("")}</tbody></table></div>
  </div>`;
}

/* ---------- CSV (opens in Excel and Google Sheets) ---------- */
const CSV_HEAD = ["Date", "Day", "Batch", "Name", "Training", "Time In (PT)", "Time Out (PT)", "Status", "Notes"];
function csvRows(r, people, b){
  const ids = people ? people.map(p => p.id) : [];
  Object.keys(r.rows || {}).forEach(id => { if(!ids.includes(id)) ids.push(id); });
  const nameOf = id => ((people || []).find(p => p.id === id) || {}).name || ((r.rows || {})[id] || {}).name || id;
  return ids.map(id => { const row = (r.rows || {})[id] || {};
    return [TR.fmtDate(r.date), r.day || "", r.batch || "", nameOf(id), row.training || r.training || (b ? defaultTraining(b) : ""), time12(row.timeIn), time12(row.timeOut), row.status || "", row.note || ""]; });
}
function download(name, rows){
  const q = v => { const s = String(v == null ? "" : v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const text = "﻿" + [CSV_HEAD].concat(rows).map(r => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type:"text/csv;charset=utf-8"}));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function renderAdminAttendance(){
  if(!state.adminData) return `<div class="card" style="padding:24px;">Loading the trainees…</div>`;
  if(!AT.date) AT.date = today();
  if(!AT.keys && !AT.loading) load(AT.date);
  if(!AT.keys) return `<div class="card" style="padding:24px;">Loading the attendance…</div>`;
  const list = batches(), isToday = AT.date === today();
  return `<div class="card att-admin">
    <div class="att-top">
      <div><h3>🕘 Attendance</h3>
        <p class="att-muted">Each batch’s attendance for the day. The date is today’s (Pacific time) and Day N counts the batch’s logged days; change either if needed. Tag each trainee’s status and time in; it saves as you go. Trainees don’t see this page.</p></div>
      <span id="attSave" class="att-save${AT.failed ? " bad" : ""}">${AT.failed ? "⚠ Not saved" : ""}</span>
    </div>
    <div class="att-datebar">
      <button type="button" class="btn btn-ghost btn-sm" title="Previous training day" onclick="LSHAttend.go(-1)">◀</button>
      <input type="date" value="${e(AT.date)}" onchange="LSHAttend.date(this.value)">
      <button type="button" class="btn btn-ghost btn-sm" title="Next training day" onclick="LSHAttend.go(1)">▶</button>
      ${isToday ? `<span class="att-today">Today</span>` : `<button type="button" class="btn btn-ghost btn-sm" onclick="LSHAttend.date(null)">Today</button>`}
      <b class="att-bigdate">${e(longDate(AT.date))}</b>
      <span class="att-grow"></span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="LSHAttend.csvDay()">⬇ This day (CSV)</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick="LSHAttend.refresh()">Refresh</button>
    </div>
  </div>
  ${AT.loading ? `<div class="card" style="padding:18px;">Loading…</div>` : list.length ? list.map(batchSection).join("") : `<div class="card" style="padding:24px;">No approved trainees yet. Approve registrations in Trainee Audit.</div>`}`;
}

/* ---------- actions ---------- */
function pick(b){ return batches().find(x => x.b === b) || {b, people:[]}; }
function paintCounts(b){ const el = document.getElementById("attCount-" + slugB(b)); if(el) el.innerHTML = counts(b, pick(b).people); }
function setRow(b, id, field, value){
  const r = rec(b), p = pick(b).people.find(x => x.id === id);
  const row = r.rows[id] || (r.rows[id] = {name:"", training:"", timeIn:"", timeOut:"", status:"", note:""});
  row[field] = value;
  row.name = (p && p.name) || row.name || id;
  row.at = new Date().toISOString();
  touch(b, id);
}
window.LSHAttend = {
  field(b, id, field, value){ setRow(b, id, field, String(value || "").slice(0, 300)); },
  status(b, id, sel){
    setRow(b, id, "status", sel.value);
    const s = statusOf(sel.value);
    sel.style.background = s ? s.bg : ""; sel.style.color = s ? s.fg : ""; sel.classList.toggle("empty", !s);
    paintCounts(b);
  },
  now(b, id, field, btn){ const v = nowPT(), inp = btn.previousElementSibling; if(inp) inp.value = v; setRow(b, id, field, v); },
  head(b, field, value){
    const r = rec(b);
    if(field === "day"){ const n = Math.round(+value); if(!(n >= 1)) { keepScroll(render); return; } r.day = n; }
    else r[field] = value;
    touch(b, null);
    if(field === "training") keepScroll(render);    // the rows that follow the batch show the new training
  },
  allPresent(b){
    const people = pick(b).people.filter(p => !statusOf(rowOf(b, p.id).status));
    if(!people.length){ toast("Everyone in this batch is already tagged."); return; }
    people.forEach(p => setRow(b, p.id, "status", "Present"));
    keepScroll(render);
    toast(`Marked ${people.length} trainee${people.length === 1 ? "" : "s"} Present.`);
  },
  batch(b){ AT.closed[b] = !AT.closed[b]; keepScroll(render); },
  summary(b){ if(AT.sum[b]){ delete AT.sum[b]; keepScroll(render); } else loadSummary(b); },
  date(v){
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : today();
    Object.keys(AT.sum).forEach(k => delete AT.sum[k]);
    AT.date = d; load(d); keepScroll(render);
  },
  go(n){ this.date(shiftDay(AT.date || today(), n)); },
  refresh(){ AT.keys = null; Object.keys(AT.recs).forEach(k => { if(!AT.dirty[k]) delete AT.recs[k]; }); Object.keys(AT.sum).forEach(k => delete AT.sum[k]); render(); },
  csvDay(){
    const rows = batches().flatMap(x => csvRows(rec(x.b), x.people, x.b));
    if(!rows.length){ toast("No trainees to download."); return; }
    download(`Attendance_${AT.date}.csv`, rows);
  },
  csvBatch(b){
    const S = AT.sum[b]; if(!S || !S.recs) return;
    const people = pick(b).people;
    download(`Attendance_${b === NO_BATCH ? "No-batch" : "Batch-" + b.replace(/\s+/g, "-")}_all-days.csv`, S.recs.flatMap(r => csvRows(r, people, b)));
  }
};
// Leaving with changes still waiting to save: save them now.
window.addEventListener("beforeunload", () => { Object.keys(AT.dirty).forEach(k => { clearTimeout(AT.timers[k]); save(k); }); });

/* ---------- wiring into the engine ---------- */
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab === "attendance" ? "active" : ""}" onclick="setAdminTab('attendance')">🕘 Attendance</button>`;
  if(state.adminTab === "attendance"){
    state.adminTab = "audit";                      // borrow the tab bar…
    const out = __admin.apply(this, arguments);
    state.adminTab = "attendance";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    const bar = out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>";
    return bar + renderAdminAttendance();
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
};

(function(){ const s = document.createElement("style"); s.id = "lsh-attendance"; s.textContent = `
.att-admin{padding:18px 20px;margin-bottom:14px;} .att-admin h3{margin:0 0 4px;color:var(--navy);}
.att-top{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;}
.att-muted{color:var(--ink-soft);font-size:13.5px;}
.att-save{flex-shrink:0;font-size:13px;color:var(--success);white-space:nowrap;} .att-save.bad{color:var(--danger);}
.att-datebar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;}
.att-datebar input[type=date]{font:inherit;font-size:14.5px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;}
.att-today{font-size:12.5px;font-weight:800;color:var(--success);background:var(--success-bg);border-radius:999px;padding:3px 10px;}
.att-bigdate{color:var(--navy);font-size:15px;margin-left:4px;}
.att-grow{flex:1;}
.att-batch{padding:12px 16px;margin-bottom:14px;}
.att-bhd{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;}
.att-caret{display:inline-block;width:12px;font-size:12px;color:var(--ink-soft);}
.att-toggle{font:inherit;font-weight:800;font-size:15.5px;color:var(--navy);background:none;border:0;padding:4px 0;cursor:pointer;}
.att-counts{display:flex;flex-wrap:wrap;gap:4px;margin-left:auto;}
.att-chip{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700;white-space:nowrap;}
.att-chip.att-none{background:#eef0f5;color:var(--ink-soft);}
.att-bbar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:10px 0 8px;font-size:14px;}
.att-bbar label{display:inline-flex;gap:6px;align-items:center;font-weight:700;color:var(--navy);white-space:nowrap;min-width:0;}
.att-day{width:56px;font:inherit;font-size:14px;padding:4px 6px;border:1px solid var(--line);border-radius:8px;}
.att-date{color:var(--ink-soft);}
.att-scroll{overflow-x:auto;}
.att-table{width:100%;border-collapse:collapse;font-size:14px;}
.att-table th{text-align:left;font-size:12.5px;color:var(--ink-soft);padding:6px;border-bottom:1px solid var(--line);white-space:nowrap;}
.att-table td{padding:6px;border-bottom:1px solid var(--line);vertical-align:middle;}
.att-table td.att-n{color:var(--ink-soft);font-size:12.5px;width:24px;}
.att-table select, .att-table input, .att-bbar select{font:inherit;font-size:13.5px;padding:5px 6px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);}
.att-tr{max-width:230px;} .att-bbar .att-tr{max-width:280px;min-width:0;} .att-tr.own{border-color:var(--orange);background:#FFF8F1;}
.att-time{white-space:nowrap;} .att-time input{width:128px;}
.att-now{font-size:13px;margin-left:2px;padding:4px 6px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;}
.att-now:hover{background:#F3F5FB;}
select.att-st{font-weight:700;border-radius:999px;padding:5px 10px;min-width:150px;border-color:transparent;cursor:pointer;}
select.att-st.empty{background:#fff;color:var(--ink-soft);border-color:var(--line);}
select.att-st option{font-weight:700;}
.att-note{width:100%;min-width:140px;box-sizing:border-box;}
.att-table input:focus, .att-table select:focus, .att-bbar select:focus, .att-day:focus{outline:2px solid var(--orange-soft);border-color:var(--orange);}
.att-sum{margin-top:12px;padding-top:10px;border-top:1px dashed var(--line);}
.att-sum-hd{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-bottom:6px;color:var(--navy);}
.att-sum-hd .btn{margin-left:auto;}
.att-stable td{white-space:nowrap;}
.att-dots{display:flex;gap:3px;} .att-dot{display:inline-block;width:12px;height:12px;border-radius:3px;background:#e4e7ee;}
@media (max-width:640px){ .att-counts{margin-left:0;} .att-top{flex-direction:column;} .att-trl{flex:1 1 100%;} .att-bbar .att-tr{flex:1;max-width:none;} }
`; document.head.appendChild(s); })();
})();
