/* ============================================================
   🕘 Attendance — Admin → 🕘 Attendance (trainers only)
   Trainers take each day's attendance, batch by batch:
     • the date is today's (Pacific time, like the Task Tracker) and the
       batch's Day N is counted from the days already logged for it; both
       can be changed (📅 date picker, the Day box);
     • every approved, active trainee of the batch is listed with their
       Name, the Training they're taking (the batch's latest open lesson,
       changeable for the batch or for one trainee), Time In / Time Out
       (typed, or ⏱ Now), the Status the trainer tags (STATUSES, the
       attendance sheet's dropdown and colors) and Notes;
     • 📊 Summary shows each trainee's count of every status over all the
       batch's logged days; ⬇ CSV downloads a day or a batch's history.
   Stored per batch per day: attendance:<batch key>:<YYYY-MM-DD> =
     {v, batch, date, day, training, rows:{<trainee id>:{name, training, timeIn, timeOut, status, note, at}}, updatedAt}
   Trainer-only: the Worker lets admins read and write any key, and trainees
   none of these. A save re-reads the day and writes only the rows changed
   here, so two trainers can take one batch's attendance at once.
   ============================================================ */
(function(){
"use strict";
const TR = window.FTTrackerRules;
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

// The trainings a trainee can be taking: the off-platform first days, the orientation, then the lessons.
function trainings(){
  const orient = window.FT_ORIENTATION ? [window.FT_ORIENTATION.title] : [];
  return ["Onboarding", "Setting of Expectations & Tech Set-up"].concat(orient, DAYS.map(d => d.title));
}
// A batch's training for the day: its latest open lesson (Admin → 📅 Open Lessons), else the orientation.
function defaultTraining(b){
  const open = typeof ftOpenFor === "function" ? ftOpenFor(b === NO_BATCH ? "" : b) : new Set();
  const last = DAYS.filter(d => open.has(d.id)).pop();
  return last ? last.title : (window.FT_ORIENTATION ? window.FT_ORIENTATION.title : DAYS[0].title);
}

const FAT = {date:null, keys:null, recs:{}, loading:false, seq:0, closed:{}, sum:{}, dirty:{}, timers:{}, saving:0, failed:false};
const slugB = b => b === NO_BATCH ? "_none" : (slugPart(b) || "_none");     // "_" is never in a slug, so no batch is named that
const keyOf = (b, date) => `attendance:${slugB(b)}:${date}`;
const today = () => TR.ptDate();
function shiftDay(iso, n){ const d = new Date(iso + "T12:00:00Z"); do d.setUTCDate(d.getUTCDate() + n); while(!TR.isWeekday(d.toISOString().slice(0, 10))); return d.toISOString().slice(0, 10); }
function longDate(iso){ return new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", {weekday:"short", month:"short", day:"numeric", year:"numeric", timeZone:"UTC"}); }
function nowPT(){ return new Intl.DateTimeFormat("en-GB", {timeZone:TR.TZ, hour:"2-digit", minute:"2-digit", hourCycle:"h23"}).format(new Date()); }
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
  return (FAT.keys || []).filter(k => k.startsWith(pre)).map(k => k.slice(pre.length)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
}
function autoDay(b, date){ return loggedDates(b).filter(d => d < date).length + 1; }
// The day's record for a batch: the saved one, or a fresh one (saved on the first change).
function rec(b){
  const k = keyOf(b, FAT.date);
  return FAT.recs[k] || (FAT.recs[k] = {v:1, batch:b === NO_BATCH ? "" : b, date:FAT.date, day:autoDay(b, FAT.date), training:defaultTraining(b), rows:{}});
}
const rowOf = (b, id) => rec(b).rows[id] || {};

async function load(date){
  const seq = ++FAT.seq;                            // a later load (another date) wins
  FAT.loading = true; FAT.date = date;
  try{
    if(!state.ftOpenDays && typeof ftLoadOpenDays === "function") await ftLoadOpenDays().catch(() => null);
    FAT.keys = ((await sharedList("attendance:")) || []).map(k => typeof k === "string" ? k : k.key);
    const want = batches().map(x => keyOf(x.b, date)).filter(k => FAT.keys.includes(k) && !FAT.dirty[k]);
    const got = await Promise.all(want.map(k => sharedGet(k).catch(() => null)));
    want.forEach((k, i) => { if(got[i]) FAT.recs[k] = Object.assign({rows:{}}, got[i]); });
  }catch(err){ FAT.keys = FAT.keys || []; }
  if(seq !== FAT.seq) return;
  FAT.loading = false;
  if(state.view === "admin" && state.adminTab === "attendance") keepScroll(render);
}
function keepScroll(fn){ const y = window.scrollY; fn(); window.scrollTo(0, y); }

/* ---------- saving: only what changed here, merged into the latest copy ---------- */
function touch(b, id){
  const k = keyOf(b, FAT.date), d = FAT.dirty[k] || (FAT.dirty[k] = {b, head:false, rows:new Set()});
  if(id) d.rows.add(id); else d.head = true;
  clearTimeout(FAT.timers[k]);
  FAT.timers[k] = setTimeout(() => save(k), 700);
  paintSave("Saving…");
}
async function save(k){
  const d = FAT.dirty[k]; if(!d) return;
  delete FAT.dirty[k]; FAT.saving++;
  const mine = FAT.recs[k];
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
      const pending = FAT.dirty[k];
      let theirs = false;
      Object.keys(latest.rows).forEach(id => {
        if((pending && pending.rows.has(id)) || d.rows.has(id)) return;
        if(JSON.stringify(mine.rows[id]) !== JSON.stringify(latest.rows[id])){ mine.rows[id] = latest.rows[id]; theirs = true; }
      });
      if(theirs && !isTyping() && state.view === "admin" && state.adminTab === "attendance" && FAT.date === mine.date) setTimeout(() => keepScroll(render), 0);
      if(FAT.keys && !FAT.keys.includes(k)) FAT.keys.push(k);
    }
  }catch(err){ ok = false; }
  if(!ok){                                          // try again with the next change, and say so
    const cur = FAT.dirty[k] || (FAT.dirty[k] = {b:d.b, head:false, rows:new Set()});
    cur.head = cur.head || d.head; d.rows.forEach(id => cur.rows.add(id));
  }
  FAT.saving--; FAT.failed = !ok;
  if(!ok) toast("Couldn’t save the attendance. Check your connection; it saves again with your next change.");
  paintSave(!ok ? "⚠ Not saved" : FAT.saving || Object.keys(FAT.dirty).length ? "Saving…" : "✓ Saved");
}
function paintSave(t){ const el = document.getElementById("fatSave"); if(el){ el.textContent = t; el.className = "fat-save" + (/⚠/.test(t) ? " bad" : ""); } }

/* ---------- the page ---------- */
function counts(b, people){
  const c = {}; let none = 0;
  people.forEach(p => { const s = statusOf(rowOf(b, p.id).status); if(s) c[s.label] = (c[s.label] || 0) + 1; else none++; });
  return STATUSES.filter(s => c[s.label]).map(s => `<span class="fat-chip" style="background:${s.bg};color:${s.fg};">${e(s.label)} ${c[s.label]}</span>`).join("")
    + (none ? `<span class="fat-chip fat-none">Not tagged ${none}</span>` : "");
}
function statusSelect(b, id, v){
  const s = statusOf(v);
  const style = s ? `background:${s.bg};color:${s.fg};` : "";
  return `<select class="fat-st${s ? "" : " empty"}" style="${style}" onchange="FTAttend.status(${js(b)},${js(id)},this)">
    <option value="">— Tag —</option>
    ${STATUSES.map(o => `<option value="${e(o.label)}" style="background:${o.bg};color:${o.fg};" ${s && s.label === o.label ? "selected" : ""}>${e(o.label)}</option>`).join("")}
    ${v && !s ? `<option value="${e(v)}" selected>${e(v)}</option>` : ""}
  </select>`;
}
function trainingSelect(val, onchange, extra, cls){
  const list = trainings();
  return `<select class="fat-tr${cls || ""}" onchange="${onchange}">${extra || ""}
    ${list.map(t => `<option value="${e(t)}" ${t === val ? "selected" : ""}>${e(t)}</option>`).join("")}
    ${val && !list.includes(val) ? `<option value="${e(val)}" selected>${e(val)}</option>` : ""}</select>`;
}
function batchSection(x){
  const {b, people} = x, r = rec(b), closed = !!FAT.closed[b], label = b === NO_BATCH ? "No batch set" : "Batch " + b;
  const rows = people.map((p, i) => {
    const row = rowOf(b, p.id);
    return `<tr>
      <td class="fat-n">${i + 1}</td>
      <td><b>${e(p.name)}</b></td>
      <td title="${row.training ? "Set for this trainee" : "The batch’s training"}">${trainingSelect(row.training || "", `FTAttend.field(${js(b)},${js(p.id)},'training',this.value)`, `<option value="" ${row.training ? "" : "selected"}>${e(r.training)}</option>`, row.training ? " own" : "")}</td>
      <td class="fat-time"><input type="time" value="${e(row.timeIn || "")}" onchange="FTAttend.field(${js(b)},${js(p.id)},'timeIn',this.value)"><button type="button" class="fat-now" title="Now (Pacific time)" onclick="FTAttend.now(${js(b)},${js(p.id)},'timeIn',this)">⏱</button></td>
      <td class="fat-time"><input type="time" value="${e(row.timeOut || "")}" onchange="FTAttend.field(${js(b)},${js(p.id)},'timeOut',this.value)"><button type="button" class="fat-now" title="Now (Pacific time)" onclick="FTAttend.now(${js(b)},${js(p.id)},'timeOut',this)">⏱</button></td>
      <td>${statusSelect(b, p.id, row.status)}</td>
      <td><input type="text" class="fat-note" maxlength="300" placeholder="Notes" value="${e(row.note || "")}" oninput="FTAttend.field(${js(b)},${js(p.id)},'note',this.value)"></td>
    </tr>`;
  }).join("");
  return `<section class="card fat-batch">
    <div class="fat-bhd">
      <button type="button" class="fat-toggle" onclick="FTAttend.batch(${js(b)})"><span class="ftt-caret">${closed ? "▸" : "▾"}</span> 📁 ${e(label)}</button>
      <span class="fat-muted">${people.length} trainee${people.length === 1 ? "" : "s"}</span>
      <span class="fat-counts" id="fatCount-${e(slugB(b))}">${counts(b, people)}</span>
    </div>
    ${closed ? "" : `<div class="fat-bbar">
      <label>Day <input type="number" class="fat-day" min="1" max="99" value="${e(r.day)}" onchange="FTAttend.head(${js(b)},'day',this.value)"></label>
      <span class="fat-date">${e(longDate(FAT.date))}</span>
      <label class="fat-trl">Training ${trainingSelect(r.training, `FTAttend.head(${js(b)},'training',this.value)`)}</label>
      <span class="fat-grow"></span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTAttend.allPresent(${js(b)})">✓ Mark the rest Present</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTAttend.summary(${js(b)})">📊 ${FAT.sum[b] ? "Hide summary" : "Summary"}</button>
    </div>
    <div class="fat-scroll"><table class="fat-table">
      <thead><tr><th>#</th><th>Name</th><th>Training</th><th>Time In (PT)</th><th>Time Out (PT)</th><th>Status</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    ${FAT.sum[b] ? renderSummary(b, people) : ""}`}
  </section>`;
}

/* ---------- 📊 a batch's summary over all its logged days ---------- */
async function loadSummary(b){
  const pre = `attendance:${slugB(b)}:`;
  FAT.sum[b] = {loading:true, recs:null};
  keepScroll(render);
  const keys = ((await sharedList(pre).catch(() => null)) || []).map(k => typeof k === "string" ? k : k.key).filter(k => k.startsWith(pre));
  const recs = (await Promise.all(keys.map(k => sharedGet(k).catch(() => null)))).filter(Boolean);
  // The day on screen may have changes that aren't saved yet.
  const here = FAT.recs[keyOf(b, FAT.date)];
  if(here){ const i = recs.findIndex(r => r.date === here.date); if(i >= 0) recs[i] = here; else if(Object.keys(here.rows || {}).length) recs.push(here); }
  if(FAT.sum[b]) FAT.sum[b] = {loading:false, recs:recs.sort((x, y) => String(x.date).localeCompare(String(y.date)))};
  if(state.view === "admin" && state.adminTab === "attendance") keepScroll(render);
}
function renderSummary(b, people){
  const S = FAT.sum[b];
  if(!S || S.loading) return `<div class="fat-sum fat-muted">Loading the batch’s attendance…</div>`;
  if(!S.recs.length) return `<div class="fat-sum fat-muted">No attendance saved for this batch yet.</div>`;
  const names = {}; people.forEach(p => names[p.id] = p.name);
  S.recs.forEach(r => Object.entries(r.rows || {}).forEach(([id, row]) => { if(!names[id]) names[id] = (row && row.name) || id; }));
  const ids = Object.keys(names).sort((x, y) => names[x].localeCompare(names[y]));
  const tally = {}, used = new Set();
  ids.forEach(id => { tally[id] = {}; S.recs.forEach(r => { const s = statusOf(((r.rows || {})[id] || {}).status); if(s){ tally[id][s.label] = (tally[id][s.label] || 0) + 1; used.add(s.label); } }); });
  const cols = STATUSES.filter(s => used.has(s.label));
  const recent = S.recs.slice(-10);
  return `<div class="fat-sum">
    <div class="fat-sum-hd"><b>📊 ${S.recs.length} day${S.recs.length === 1 ? "" : "s"} logged</b> <span class="fat-muted">${e(TR.fmtDate(S.recs[0].date))} – ${e(TR.fmtDate(S.recs[S.recs.length - 1].date))}</span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTAttend.csvBatch(${js(b)})">⬇ Download all days (CSV)</button></div>
    <div class="fat-scroll"><table class="fat-table fat-stable">
      <thead><tr><th>Name</th>${cols.map(s => `<th><span class="fat-chip" style="background:${s.bg};color:${s.fg};">${e(s.label)}</span></th>`).join("")}<th>Not tagged</th><th>Last ${recent.length} day${recent.length === 1 ? "" : "s"}</th></tr></thead>
      <tbody>${ids.map(id => {
        const tagged = Object.values(tally[id]).reduce((a, n) => a + n, 0);
        return `<tr><td><b>${e(names[id])}</b></td>${cols.map(s => `<td>${tally[id][s.label] || '<span class="fat-muted">0</span>'}</td>`).join("")}
          <td>${S.recs.length - tagged || '<span class="fat-muted">0</span>'}</td>
          <td class="fat-dots">${recent.map(r => { const row = (r.rows || {})[id] || {}, s = statusOf(row.status);
            return `<span class="fat-dot" style="${s ? `background:${s.bg};` : ""}" title="${e(`Day ${r.day || "?"} · ${TR.fmtDate(r.date)}: ${row.status || "not tagged"}${row.timeIn ? " · in " + time12(row.timeIn) : ""}`)}"></span>`; }).join("")}</td></tr>`;
      }).join("")}</tbody></table></div>
  </div>`;
}

/* ---------- CSV (opens in Excel and Google Sheets) ---------- */
const CSV_HEAD = ["Date", "Day", "Batch", "Name", "Training", "Time In (PT)", "Time Out (PT)", "Status", "Notes"];
function csvRows(r, people){
  const ids = people ? people.map(p => p.id) : [];
  Object.keys(r.rows || {}).forEach(id => { if(!ids.includes(id)) ids.push(id); });
  const nameOf = id => ((people || []).find(p => p.id === id) || {}).name || ((r.rows || {})[id] || {}).name || id;
  return ids.map(id => { const row = (r.rows || {})[id] || {};
    return [TR.fmtDate(r.date), r.day || "", r.batch || "", nameOf(id), row.training || r.training || "", time12(row.timeIn), time12(row.timeOut), row.status || "", row.note || ""]; });
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
  if(!FAT.date) FAT.date = today();
  if(!FAT.keys && !FAT.loading) load(FAT.date);
  if(!FAT.keys) return `<div class="card" style="padding:24px;">Loading the attendance…</div>`;
  const list = batches(), isToday = FAT.date === today();
  return `<div class="card fat-admin">
    <div class="fat-top">
      <div><h3>🕘 Attendance</h3>
        <p class="fat-muted">Each batch’s attendance for the day. The date is today’s (Pacific time) and Day N counts the batch’s logged days; change either if needed. Tag each trainee’s status and time in; it saves as you go. Trainees don’t see this page.</p></div>
      <span id="fatSave" class="fat-save${FAT.failed ? " bad" : ""}">${FAT.failed ? "⚠ Not saved" : ""}</span>
    </div>
    <div class="fat-datebar">
      <button type="button" class="btn btn-ghost btn-sm" title="Previous training day" onclick="FTAttend.go(-1)">◀</button>
      <input type="date" value="${e(FAT.date)}" onchange="FTAttend.date(this.value)">
      <button type="button" class="btn btn-ghost btn-sm" title="Next training day" onclick="FTAttend.go(1)">▶</button>
      ${isToday ? `<span class="fat-today">Today</span>` : `<button type="button" class="btn btn-ghost btn-sm" onclick="FTAttend.date(null)">Today</button>`}
      <b class="fat-bigdate">${e(longDate(FAT.date))}</b>
      <span class="fat-grow"></span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTAttend.csvDay()">⬇ This day (CSV)</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTAttend.refresh()">Refresh</button>
    </div>
  </div>
  ${FAT.loading ? `<div class="card" style="padding:18px;">Loading…</div>` : list.length ? list.map(batchSection).join("") : `<div class="card" style="padding:24px;">No approved trainees yet. Approve registrations in Trainee Audit.</div>`}`;
}

/* ---------- actions ---------- */
function pick(b){ return batches().find(x => x.b === b) || {b, people:[]}; }
function paintCounts(b){ const el = document.getElementById("fatCount-" + slugB(b)); if(el) el.innerHTML = counts(b, pick(b).people); }
function setRow(b, id, field, value){
  const r = rec(b), p = pick(b).people.find(x => x.id === id);
  const row = r.rows[id] || (r.rows[id] = {name:"", training:"", timeIn:"", timeOut:"", status:"", note:""});
  row[field] = value;
  row.name = (p && p.name) || row.name || id;
  row.at = new Date().toISOString();
  touch(b, id);
}
window.FTAttend = {
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
  batch(b){ FAT.closed[b] = !FAT.closed[b]; keepScroll(render); },
  summary(b){ if(FAT.sum[b]){ delete FAT.sum[b]; keepScroll(render); } else loadSummary(b); },
  date(v){
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : today();
    Object.keys(FAT.sum).forEach(k => delete FAT.sum[k]);
    FAT.date = d; load(d); keepScroll(render);
  },
  go(n){ this.date(shiftDay(FAT.date || today(), n)); },
  refresh(){ FAT.keys = null; Object.keys(FAT.recs).forEach(k => { if(!FAT.dirty[k]) delete FAT.recs[k]; }); Object.keys(FAT.sum).forEach(k => delete FAT.sum[k]); render(); },
  csvDay(){
    const rows = batches().flatMap(x => csvRows(rec(x.b), x.people));
    if(!rows.length){ toast("No trainees to download."); return; }
    download(`Attendance_${FAT.date}.csv`, rows);
  },
  csvBatch(b){
    const S = FAT.sum[b]; if(!S || !S.recs) return;
    const people = pick(b).people;
    download(`Attendance_${b === NO_BATCH ? "No-batch" : "Batch-" + b.replace(/\s+/g, "-")}_all-days.csv`, S.recs.flatMap(r => csvRows(r, people)));
  }
};
// Leaving with changes still waiting to save: save them now.
window.addEventListener("beforeunload", () => { Object.keys(FAT.dirty).forEach(k => { clearTimeout(FAT.timers[k]); save(k); }); });

/* ---------- wiring into the engine ---------- */
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab === "attendance" ? "active" : ""}" onclick="setAdminTab('attendance')">🕘 Attendance</button>`;
  if(state.adminTab === "attendance"){
    state.adminTab = "opendays";                   // borrow the tab bar…
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

(function(){ const s = document.createElement("style"); s.id = "ft-attendance"; s.textContent = `
.fat-admin{padding:18px 20px;margin-bottom:14px;} .fat-admin h3{margin:0 0 4px;color:var(--navy);}
.fat-top{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;}
.fat-muted{color:var(--ink-soft);font-size:13.5px;}
.fat-save{flex-shrink:0;font-size:13px;color:var(--success);white-space:nowrap;} .fat-save.bad{color:var(--danger);}
.fat-datebar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;}
.fat-datebar input[type=date]{font:inherit;font-size:14.5px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;}
.fat-today{font-size:12.5px;font-weight:800;color:var(--success);background:var(--success-bg);border-radius:999px;padding:3px 10px;}
.fat-bigdate{color:var(--navy);font-size:15px;margin-left:4px;}
.fat-grow{flex:1;}
.fat-batch{padding:12px 16px;margin-bottom:14px;}
.fat-bhd{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;}
.fat-toggle{font:inherit;font-weight:800;font-size:15.5px;color:var(--navy);background:none;border:0;padding:4px 0;cursor:pointer;}
.fat-counts{display:flex;flex-wrap:wrap;gap:4px;margin-left:auto;}
.fat-chip{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700;white-space:nowrap;}
.fat-chip.fat-none{background:#eef0f5;color:var(--ink-soft);}
.fat-bbar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:10px 0 8px;font-size:14px;}
.fat-bbar label{display:inline-flex;gap:6px;align-items:center;font-weight:700;color:var(--navy);white-space:nowrap;min-width:0;}
.fat-day{width:56px;font:inherit;font-size:14px;padding:4px 6px;border:1px solid var(--line);border-radius:8px;}
.fat-date{color:var(--ink-soft);}
.fat-scroll{overflow-x:auto;}
.fat-table{width:100%;border-collapse:collapse;font-size:14px;}
.fat-table th{text-align:left;font-size:12.5px;color:var(--ink-soft);padding:6px;border-bottom:1px solid var(--line);white-space:nowrap;}
.fat-table td{padding:6px;border-bottom:1px solid var(--line);vertical-align:middle;}
.fat-table td.fat-n{color:var(--ink-soft);font-size:12.5px;width:24px;}
.fat-table select, .fat-table input, .fat-bbar select{font:inherit;font-size:13.5px;padding:5px 6px;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink);}
.fat-tr{max-width:230px;} .fat-bbar .fat-tr{max-width:280px;min-width:0;} .fat-tr.own{border-color:var(--orange);background:#FFF8F1;}
.fat-time{white-space:nowrap;} .fat-time input{width:128px;}
.fat-now{font-size:13px;margin-left:2px;padding:4px 6px;border:1px solid var(--line);border-radius:8px;background:#fff;cursor:pointer;}
.fat-now:hover{background:#F3F5FB;}
select.fat-st{font-weight:700;border-radius:999px;padding:5px 10px;min-width:150px;border-color:transparent;cursor:pointer;}
select.fat-st.empty{background:#fff;color:var(--ink-soft);border-color:var(--line);}
select.fat-st option{font-weight:700;}
.fat-note{width:100%;min-width:140px;box-sizing:border-box;}
.fat-table input:focus, .fat-table select:focus, .fat-bbar select:focus, .fat-day:focus{outline:2px solid var(--orange-soft);border-color:var(--orange);}
.fat-sum{margin-top:12px;padding-top:10px;border-top:1px dashed var(--line);}
.fat-sum-hd{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-bottom:6px;color:var(--navy);}
.fat-sum-hd .btn{margin-left:auto;}
.fat-stable td{white-space:nowrap;}
.fat-dots{display:flex;gap:3px;} .fat-dot{display:inline-block;width:12px;height:12px;border-radius:3px;background:#e4e7ee;}
@media (max-width:640px){ .fat-counts{margin-left:0;} .fat-top{flex-direction:column;} .fat-trl{flex:1 1 100%;} .fat-bbar .fat-tr{flex:1;max-width:none;} }
`; document.head.appendChild(s); })();
})();
