/* ============================================================
   📅 Calendaring Simulators: drag-and-drop, Google Calendar style, with an automated review and trainer feedback.
   Loaded after js/ft-calsim-core.js (the weeks) and before js/ft-simulators.js. Route: #/calsim.
     • Three tracks (FTCalCore.TRACKS): Standard Training, Litigation Week (Case Management) and Executive Week (EA / PA).
     • The week is a Monday to Friday grid in 15-minute steps (Eastern Time). The attorney's fixed events are locked. The brief lists
       the tasks to put on the calendar; the trainee builds their own calendar: drag on an empty part of the week to
       add an event, drag an event to move it, drag its bottom edge to resize it, double-click to rename it, ✕ to
       delete it. Events that clash, break a court's travel time or fall outside business hours show in red.
     • At the bottom: 💾 Save changes (saves now), 🤖 Run automated review (FTCalCore.review: the attorney's rules, scored
       out of 100, with what to fix) and 📤 Submit calendar to my trainer. A trainer opens a submission in Admin → 📅
       Calendar Scores, sees the week and its automated review, and adds manual feedback: a score out of 100, an overall
       comment and a comment on each task, which the trainee sees on this page. Scores are kept per trainee.
     • After submitting, AI feedback is written on the spot from the rules and notes (callAIJson, "grading"): what was met,
       what was missed and how to fix it. The trainer opens the submission in 🖥 Live review (Admin → 📅 Calendar Scores) and
       talks it through as it shows on screen, step by step; adds what the AI missed, written insights, a score, then
       **releases the final feedback**. The trainee then sees it on this page and can download or print a copy.
     • It is part of the Calendar Management Training Practice Lab on 🛠 Simulators (js/ft-simulators.js).
     • Saved in the trainee's `calsim:<id>` record: {v:2, drafts:{scenario:[events]}, autos:[{scn, at, pct, score, max}], submissions:[{scn, at, events, auto}],
       reviews:{"<scn>|<at>": {score, comment (written insights), extra:[points the AI missed], tasks:{taskId: comment}, released, releasedAt, by, at}};
       a submission also has ai:{at, summary, items:[{id, status, feedback}], strengths, improve} or ai:{error}, external:[...]}. The Worker keeps `reviews` from being changed
       by the trainee.
     • Connected simulators: the Portal's Calendaring Simulator opens from here with program=FT, the trainee's name and
       batch. A simulator that finishes with postMessage({type:"lsh-sim-result", sim:"calendar", score, max, title})
       (from the Portal or the CMS) has the result added to the same record.
   ============================================================ */
(function(){
const C = window.FTCalCore;
if(!C) return;
const PORTAL = "https://cm-training-activity.pages.dev/simulators/";
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
const LESSON = 5;                         // Calendaring & Appointment Setting Training
const TOP = 8 * 60, BOTTOM = 18 * 60, SH = 14;   // the grid shows 8:00 AM to 6:00 PM; one 15-minute slot is SH pixels
const px = min => (min - TOP) / C.STEP * SH;
const trackOf = () => C.trackOf(scn().track);
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const open = () => state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(LESSON) : true);
const hh = m => C.fmt(m);

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["calsim"]);

const S = {aiBusy:{}, id:null, data:null, loading:false, err:"", scn:0, events:[], result:null, timer:null, saved:null, drag:null, sel:null};
const scn = () => C.SCENARIOS[S.scn];
function setScn(i){ S.scn = i; S.sel = null; S.result = null; S.events = C.clean((S.data && S.data.drafts[scn().id]) || []); }
const uid = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- the trainee's saved record ---------- */
const blank = () => ({v:2, drafts:{}, autos:[], submissions:[], reviews:{}, external:[]});
function norm(d){
  d = d || blank();
  d.drafts = d.drafts || {}; d.autos = d.autos || []; d.submissions = d.submissions || []; d.reviews = d.reviews || {}; d.external = d.external || [];
  // Records from the first version of the scheduler held placements, not events: they have nothing to show here.
  d.submissions = d.submissions.filter(x => Array.isArray(x.events));
  Object.keys(d.drafts).forEach(k => { if(!Array.isArray(d.drafts[k])) delete d.drafts[k]; });
  return d;
}
async function load(){
  if(!isTrainee()){ S.data = blank(); return; }
  S.loading = true; S.err = ""; S.id = state.traineeId;
  try{ S.data = norm(await sharedGet("calsim:" + S.id)); }
  catch(err){ S.data = blank(); S.err = "Couldn’t load your saved work. You can still practice; check your connection to save."; }
  S.loading = false;
  S.events = C.clean(S.data.drafts[scn().id]);
  if(state.view === "calsim" || state.view === "simulators") render();
}
function queueSave(){
  if(!isTrainee() || !S.data) return;
  S.data.updatedAt = new Date().toISOString();
  clearTimeout(S.timer); S.saved = "saving"; paintSave();
  S.timer = setTimeout(async () => { const ok = await sharedSet("calsim:" + S.id, S.data); S.saved = ok === false ? "fail" : "ok"; paintSave(); }, 800);
}
function paintSave(){
  const el = document.getElementById("csSave"); if(!el) return;
  el.textContent = !isTrainee() ? "Trainer preview: nothing is saved." : S.saved === "saving" ? "Saving…" : S.saved === "fail" ? "⚠ Not saved. Check your connection." : S.saved === "ok" ? "All changes saved" : "";
}
async function saveNow(){
  changed();
  if(!isTrainee() || !S.data){ toast("Trainer preview: nothing is saved."); return; }
  clearTimeout(S.timer); S.saved = "saving"; paintSave();
  const ok = await sharedSet("calsim:" + S.id, S.data); S.saved = ok === false ? "fail" : "ok"; paintSave();
  toast(ok === false ? "Couldn’t save. Check your connection and try again." : "Changes saved.");
}
function changed(){
  S.result = null;
  if(S.data){ S.data.drafts[scn().id] = S.events.map(x => Object.assign({}, x)); queueSave(); }
}
const released = r => !!r && r.released !== false;      // reviews saved before release existed count as released
const subs = id => S.data ? S.data.submissions.filter(x => x.scn === id) : [];
const subKey = x => x.scn + "|" + x.at;

/* ---------- the page ---------- */
function blockHTML(ev, mine, why, ro){
  const k = ev.kind || "", len = (ev.end || ev.start + ev.dur) - ev.start;
  const style = `top:${px(ev.start)}px;height:${Math.max(px(ev.start + len) - px(ev.start), 12)}px;`;
  const pad = ev.buffer ? `<div class="cs-buf" style="top:${px(ev.start - ev.buffer)}px;height:${(ev.buffer / C.STEP) * SH}px;"></div><div class="cs-buf" style="top:${px(ev.end)}px;height:${(ev.buffer / C.STEP) * SH}px;"></div>` : "";
  const icons = (ev.meet ? " 📹" : "") + (ev.remind ? " 🔔" : "");
  const label = `<b>${e(ev.title || "(no name)")}</b><span>${hh(ev.start)} – ${hh(ev.start + len)}${icons}</span>`;
  if(!mine) return pad + `<div class="cs-ev cs-fixed cs-${k}" style="${style}" title="${e(ev.note || ev.title)}">${label}</div>`;
  const cls = `cs-ev cs-req ${why ? "cs-bad" : ""} ${S.sel === ev.id ? "cs-sel" : ""}`;
  if(ro) return `<div class="cs-ev cs-ro ${why ? "cs-bad" : ""} ${ev.hl ? "cs-hl" : ""}" style="${style}" title="${e(why ? why.join("; ") : "")}">${label}</div>`;
  return `<div class="${cls}" data-ev="${e(ev.id)}" tabindex="0" role="button" title="${e(why ? why.join("; ") : "Drag to move, drag the bottom edge to resize, double-click to rename")}" aria-label="${e(ev.title)}, ${C.DAYS[ev.day]} ${hh(ev.start)}. Arrow keys move it, Shift plus arrow resizes, Enter renames, Delete removes it." style="${style}">${label}<button class="cs-x" data-del="${e(ev.id)}" aria-label="Delete ${e(ev.title)}" tabindex="-1">✕</button><i class="cs-rs" data-rs="${e(ev.id)}"></i></div>`;
}
function gridHTML(s, events, ro, hl){
  s = s || scn(); events = events || S.events;
  const fl = C.flags(s, events);
  const times = []; for(let m = TOP; m < BOTTOM; m += 60) times.push(`<div class="cs-time" style="top:${px(m) - 7}px">${hh(m)}</div>`);
  const cols = C.DAYS.map((name, d) => {
    const blocks = s.fixed.filter(f => f.day === d).map(f => blockHTML(f, false)).join("")
      + events.filter(x => x.day === d).map(x => blockHTML({id:x.id, title:x.title, day:d, start:x.start, end:x.start + x.dur, meet:x.meet, remind:x.remind, hl:hl === x.id}, true, fl[x.id], ro)).join("");
    return `<div class="cs-colwrap"><div class="cs-dayhd">${name}</div><div class="cs-col" data-day="${d}" style="height:${px(BOTTOM)}px">${blocks}</div></div>`;
  }).join("");
  return `<div class="cs-grid"><div class="cs-times"><div class="cs-dayhd cs-et" title="Eastern Time">ET</div><div class="cs-timecol" style="height:${px(BOTTOM)}px">${times.join("")}</div></div>${cols}</div>`;
}
function tasksHTML(){
  const s = scn();
  return `<div class="cs-tray" id="csTray"><h3>📋 Your tasks <span class="cs-count">${s.tasks.length} to schedule</span></h3>
    <p class="cs-hint">Put each of these on the week as an event, named after the task, with a description. Drag on an empty part of the calendar to add one.</p>
    ${s.tasks.map(r => `<div class="cs-task"><b>${e(r.title)}</b><span class="cs-dur">${r.dur} min</span>${(r.needs || {}).meet ? '<span class="cs-dur cs-chip">📹 Google Meet</span>' : ""}${(r.needs || {}).remind ? '<span class="cs-dur cs-chip">🔔 Reminder</span>' : ""}<p>${e(r.note)}</p></div>`).join("")}</div>`;
}
const STATUS = {met:["✅", "Met"], partial:["◐", "Partly met"], missed:["✗", "Missed"]};
function aiBlock(ai, busy){
  if(busy) return `<div class="cs-ai"><b>🤖 AI feedback</b><p class="cs-hint">Checking your calendar against the rules and notes…</p></div>`;
  if(!ai) return "";
  if(ai.error) return `<div class="cs-ai"><b>🤖 AI feedback</b><p class="cs-hint">The AI check wasn’t available (${e(ai.error)}). The rule-by-rule review below is still accurate; your trainer will go through it with you.</p></div>`;
  return `<div class="cs-ai"><b>🤖 AI feedback</b>${ai.summary ? `<p>${e(ai.summary)}</p>` : ""}
    ${(ai.strengths || []).length ? `<div class="cs-lab">What’s working</div><ul class="cs-ul ok">${ai.strengths.map(x => `<li>${e(x)}</li>`).join("")}</ul>` : ""}
    ${(ai.improve || []).length ? `<div class="cs-lab">Work on next</div><ul class="cs-ul">${ai.improve.map(x => `<li>${e(x)}</li>`).join("")}</ul>` : ""}</div>`;
}
// Per-task lines: the AI's feedback and the trainer's own note on the task.
function taskFeedback(s, ai, r){
  const by = Object.fromEntries(((ai && ai.items) || []).map(x => [x.id, x]));
  return `<div class="cs-fbt">${s.tasks.map(t => { const a = by[t.id], n = r && r.tasks && r.tasks[t.id], st = a && STATUS[a.status];
    return `<div class="cs-fbi"><div class="cs-fbi-hd">${st ? st[0] : "•"} <b>${e(t.title)}</b>${st ? `<span class="cs-chip2 ${e(a.status)}">${st[1]}</span>` : ""}</div>${a && a.feedback ? `<p>🤖 ${e(a.feedback)}</p>` : ""}${n ? `<p class="cs-tn">👤 ${e(n)}</p>` : ""}</div>`; }).join("")}</div>`;
}
// What the trainee sees for a submission: the AI feedback at once, then the trainer's final feedback once released.
function feedbackPanel(s, sub, r){
  const busy = !!S.aiBusy[subKey(sub)] && !sub.ai, fin = released(r);
  return `<div class="cs-fb"><div class="cs-fb-hd"><h3>Feedback on your ${e(s.short)} submission</h3><span class="cs-pill ${fin ? "ok" : "warn"}">${fin ? "Final feedback" : "Waiting for your trainer"}</span></div>
    ${aiBlock(sub.ai, busy)}${sub.ai && !sub.ai.error ? taskFeedback(s, sub.ai, fin ? r : null) : ""}
    ${fin ? finalHTML(s, r) + `<div class="cs-fb-btns"><button class="btn btn-navy btn-sm" onclick="FTCalSim.download('${e(s.id)}')">⬇ Download my feedback</button><button class="btn btn-ghost btn-sm" onclick="FTCalSim.print('${e(s.id)}')">🖨 Print / save as PDF</button></div>`
      : `<p class="cs-hint">Your trainer will go through this feedback with you, add anything the AI missed and their own notes. The final feedback, with a copy you can download, appears here when they release it.</p>`}</div>`;
}
function finalHTML(s, r){
  const extra = (r.extra || []).filter(Boolean);
  return `<div class="cs-final"><div class="cs-final-hd">👤 Trainer’s final feedback${r.score != null ? ` · <b>${e(r.score)} / 100</b>` : ""}</div>
    ${extra.length ? `<div class="cs-lab">Also missed</div><ul class="cs-ul">${extra.map(x => `<li>${e(x)}</li>`).join("")}</ul>` : ""}
    ${r.comment ? `<div class="cs-lab">Trainer’s insights</div><p>${e(r.comment).replace(/\n/g, "<br>")}</p>` : ""}</div>`;
}
// The automated review's panel (also used on the trainer's screen). `notes`: the trainer's comment on each task, if any.
function reviewHTML(g, notes){
  notes = notes || {};
  return `<div class="cs-result ${g.passed ? "ok" : "bad"}"><div class="cs-score"><b>${g.pct}%</b><span>${g.passed ? "✅ Meets the attorney’s rules" : "Not yet"} · ${C.PASS}% passes · ${g.done} of ${g.items.length} tasks perfect</span></div>
    ${g.items.map(i => `<div class="cs-item ${i.perfect ? "ok" : "bad"}"><div class="cs-item-hd">${i.perfect ? "✓" : "✗"} <b>${e(i.title)}</b> <span>${i.pts} / ${i.weight}</span></div>
      ${i.perfect ? "" : `<ul>${i.checks.filter(c => !c.ok).map(c => `<li><b>${e(c.label)}:</b> ${e(c.why)}</li>`).join("")}</ul>`}${notes[i.id] ? `<div class="cs-tnote">👤 ${e(notes[i.id])}</div>` : ""}</div>`).join("")}
    ${g.extras.filter(x => x.why.length).length ? `<div class="cs-item bad"><div class="cs-item-hd">⚠ <b>Other events with problems</b></div><ul>${g.extras.filter(x => x.why.length).map(x => `<li><b>${e(x.title)}</b> (${C.DAYS[x.day].slice(0, 3)} ${hh(x.start)}): ${e(x.why.join("; "))}</li>`).join("")}</ul></div>` : ""}</div>`;
}
function resultHTML(){ return S.result ? reviewHTML(S.result) + `<p class="cs-hint">Fix what’s marked, then run the review again. Submit when you’re happy with it.</p>` : ""; }
const bestAuto = id => (S.data ? S.data.autos : []).filter(a => a.scn === id).reduce((m, a) => Math.max(m, a.pct), -1);
function historyHTML(){
  if(!S.data) return "";
  const pv = S.previewAI && S.previewAI.scn === scn().id ? `<div class="cs-hist-row"><span class="cs-pill warn">Trainer preview (not saved)</span>${aiBlock(S.previewAI.ai)}${S.previewAI.ai.error ? "" : taskFeedback(scn(), S.previewAI.ai, null)}</div>` : (S.aiBusy.preview ? `<div class="cs-hist-row">${aiBlock(null, true)}</div>` : "");
  const rows = C.SCENARIOS.map(s => {
    const list = subs(s.id), last = list[list.length - 1];
    const ba = bestAuto(s.id), autoPill = ba >= 0 ? `<span class="cs-pill ${ba >= C.PASS ? "ok" : ""}">🤖 ${e(s.short)} automated review: best ${ba}%</span>` : "";
    if(!last) return `<div class="cs-hist-row"><span class="cs-pill">${e(s.short)}: not submitted</span>${autoPill}</div>`;
    const r = S.data.reviews[subKey(last)], au = C.review(s, last.events);
    return `<div class="cs-hist-row"><span class="cs-pill ok">📤 ${e(s.short)} submitted ${e(new Date(last.at).toLocaleString())}</span><span class="cs-pill ${au.passed ? "ok" : ""}">🤖 Automated: ${au.pct}%</span>${autoPill}${released(r) ? "" : `<span class="cs-pill">Waiting for your trainer’s feedback</span>`}${feedbackPanel(s, last, r)}</div>`;
  }).join("");
  const ext = S.data.external.slice(-3).reverse().map(x => `<span class="cs-pill">${e(x.title || "Simulator")}: ${Math.round(x.score)}/${Math.round(x.max)}</span>`).join("");
  return `<div class="cs-hist">${pv}${rows}${ext}</div>`;
}
function renderPage(){
  const s = scn();
  const tk = trackOf();
  const tabs = C.TRACKS.map(x => `<button class="cs-tab ${x.id === tk.id ? "active" : ""}" onclick="FTCalSim.open('${x.id}')">${x.icon} ${e(x.title)} <i>${e(x.where)}</i></button>`).join("")
    + `</div>` + (C.SCENARIOS.filter(x => x.track === tk.id).length > 1 ? `<div class="cs-tabs cs-weeks">` + C.SCENARIOS.map((x, i) => x.track === tk.id ? `<button class="cs-tab cs-wk ${i === S.scn ? "active" : ""}" onclick="FTCalSim.pick(${i})">${e(x.title)} <i>${e(x.level)}</i></button>` : "").join("") : "");
  if(!open()) return `<div class="cs-wrap"><h1>📅 Calendaring Simulators</h1><div class="card" style="padding:20px;">🔒 This simulator opens with Lesson ${LESSON}, Calendaring &amp; Appointment Setting.</div></div>`;
  return `<div class="cs-wrap"><div class="cs-top"><div><h1>📅 Calendaring Simulators</h1>
      <p class="cs-lead">${tk.icon} <b>${e(tk.title)}</b> · ${e(tk.where)}. Build the week in a Google Calendar style, run the automated review, then submit it to your trainer.</p></div>
      <div><button class="btn btn-ghost btn-sm" onclick="goto('simulators')">← Simulators</button></div></div>
    <div class="cs-tabs">${tabs}</div>
    <p class="cs-blurb">${e(tk.blurb)}</p>
    <div class="card cs-brief">${e(s.brief)}</div>
    ${S.err ? `<div class="cs-err">${e(S.err)}</div>` : ""}
    <div class="cs-main">${tasksHTML()}<div><div class="cs-gridwrap">${gridHTML()}</div><p class="cs-hint cs-legend">Eastern Time. Drag on an empty spot to add an event · drag to move · drag the bottom edge to resize · double-click to edit its details · ✕ deletes. Red means a clash, missing travel time or outside 9 to 5.</p></div></div>
    <div class="cs-actions"><button class="btn btn-navy" onclick="FTCalSim.save()">💾 Save changes</button>
      <button class="btn btn-navy" onclick="FTCalSim.review()">🤖 Run automated review</button>
      <button class="btn btn-primary" onclick="FTCalSim.submit()">📤 Submit to my trainer</button>
      <button class="btn btn-ghost" onclick="FTCalSim.add()">＋ Add event</button>
      <button class="btn btn-ghost" onclick="FTCalSim.reset()">↺ Clear my events</button><span class="cs-save" id="csSave"></span></div>
    <p class="cs-hint">The automated review checks your calendar against the attorney’s rules (conflicts, travel time, business hours, each task’s days and times) and tells you what to fix. Your trainer then adds their own feedback to what you submit.</p>
    <div id="csResultBox">${resultHTML()}</div>
    ${historyHTML()}
    <div class="card cs-more"><b>🔗 Also graded for your trainer</b><p>The Portal’s Calendaring Simulator is another week of scheduling conflicts. It opens in its own tab with your name and batch, so its score is saved for your trainer too.</p>
      <a class="btn btn-ghost btn-sm" href="${e(portalHref())}" target="_blank" rel="noopener">Open the Portal’s Calendaring Simulator ↗</a></div></div>`;
}
function portalHref(){
  const q = new URLSearchParams({program:"FT"});
  if(isTrainee()){ const n = state.certName || state.traineeName; if(n) q.set("name", n); if(state.traineeBatch) q.set("batch", state.traineeBatch); }
  return PORTAL + "calendar.html?" + q;
}
function repaint(){
  const gw = document.querySelector(".cs-gridwrap"); if(!gw){ render(); return; }
  gw.innerHTML = gridHTML();
  const h = document.querySelector(".cs-hist"); if(h) h.outerHTML = historyHTML();
  const box = document.getElementById("csResultBox"); if(box) box.innerHTML = resultHTML();
  paintSave();
}

/* ---------- dragging (pointer events: mouse, pen and touch) ---------- */
// mode: "new" (drag on empty space), "move", "resize"
function colAt(x, y){
  for(const c of document.querySelectorAll(".cs-col")){
    const r = c.getBoundingClientRect();
    if(x >= r.left && x <= r.right && y >= r.top - SH && y <= r.bottom + SH) return {col:c, day:+c.dataset.day, rect:r};
  }
  return null;
}
const snap = (y, top) => TOP + Math.round((y - top) / SH) * C.STEP;
const clampStart = (st, dur) => Math.max(TOP, Math.min(BOTTOM - dur, st));
function startDrag(ev, mode, id){
  const col = ev.target.closest(".cs-col"); if(mode === "new" && !col) return;
  const x = S.events.find(q => q.id === id);
  const el = id ? document.querySelector(`.cs-req[data-ev="${CSS.escape(id)}"]`) : null, rect = el && el.getBoundingClientRect();
  const r0 = col && col.getBoundingClientRect();
  S.drag = {mode, id, sx:ev.clientX, sy:ev.clientY, pid:ev.pointerId, moved:false, x, grab:rect ? ev.clientY - rect.top : 0, w:rect ? rect.width : 0,
    anchor:mode === "new" ? {day:+col.dataset.day, start:Math.max(TOP, Math.min(BOTTOM - C.STEP, TOP + Math.floor((ev.clientY - r0.top) / SH) * C.STEP))} : null, prev:null, ghost:null, cur:null};
  window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onCancel);
}
function onMove(ev){
  const d = S.drag; if(!d || ev.pointerId !== d.pid) return;
  if(!d.moved){ if(Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) < 5) return; d.moved = true; document.body.classList.add("cs-dragging");
    d.prev = document.createElement("div"); d.prev.className = "cs-prev";
    if(d.mode === "move"){ d.ghost = document.createElement("div"); d.ghost.className = "cs-ghost"; d.ghost.style.cssText = `width:${d.w}px;height:${Math.max(d.x.dur / C.STEP * SH, 24)}px;`; d.ghost.innerHTML = `<b>${e(d.x.title)}</b>`; document.body.appendChild(d.ghost);
      const own = document.querySelector(`.cs-req[data-ev="${CSS.escape(d.id)}"]`); if(own) own.classList.add("cs-lifted"); } }
  ev.preventDefault();
  let cur = null;
  if(d.mode === "move"){
    d.ghost.style.left = (ev.clientX - d.w / 2) + "px"; d.ghost.style.top = (ev.clientY - d.grab) + "px";
    const h = colAt(ev.clientX, ev.clientY);
    if(h) cur = {day:h.day, start:clampStart(snap(ev.clientY - d.grab, h.rect.top), d.x.dur), dur:d.x.dur, col:h.col};
  }else if(d.mode === "resize"){
    const c = document.querySelector(`.cs-col[data-day="${d.x.day}"]`), r = c.getBoundingClientRect();
    const end = Math.max(d.x.start + C.STEP, Math.min(BOTTOM, snap(ev.clientY, r.top) ));
    cur = {day:d.x.day, start:d.x.start, dur:end - d.x.start, col:c};
  }else{
    const h = colAt(ev.clientX, ev.clientY), a = d.anchor, c = document.querySelector(`.cs-col[data-day="${a.day}"]`), r = c.getBoundingClientRect();
    const end = Math.max(a.start + C.STEP, Math.min(BOTTOM, TOP + Math.ceil((ev.clientY - r.top) / SH) * C.STEP));
    cur = {day:a.day, start:a.start, dur:end - a.start, col:c};
  }
  d.cur = cur;
  if(cur){
    cur.col.appendChild(d.prev);
    const me = {id:d.id || "_new", day:cur.day, start:cur.start, end:cur.start + cur.dur};
    const evs = C.all(scn(), S.events.filter(q => q.id !== d.id));
    const bad = evs.some(o => C.overlap(me, o, o.buffer || 0)) || me.start < C.OPEN || me.end > C.CLOSE;
    d.prev.className = "cs-prev " + (bad ? "bad" : "ok");
    d.prev.style.cssText = `top:${px(cur.start)}px;height:${cur.dur / C.STEP * SH}px;`;
    d.prev.textContent = hh(cur.start) + " – " + hh(cur.start + cur.dur);
  }else if(d.prev.parentNode) d.prev.remove();
}
function endDrag(){
  const d = S.drag; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
  document.body.classList.remove("cs-dragging"); S.drag = null;
  if(d && d.ghost) d.ghost.remove(); if(d && d.prev) d.prev.remove();
  return d;
}
// The event editor, as in Google Calendar: title, when, guests, Google Meet, an email reminder and a description.
function closeModal(){ const m = document.getElementById("csModal"); if(m) m.remove(); }
function editor(x, isNew, done){
  closeModal();
  const m = document.createElement("div"); m.id = "csModal"; m.className = "cs-modal";
  m.innerHTML = `<div class="cs-dlg" role="dialog" aria-modal="true" aria-label="Event details">
    <input id="csmTitle" class="cs-m-title" maxlength="80" placeholder="Add title" value="${e(x.title)}">
    <div class="cs-m-when">🕘 ${C.DAYS[x.day]} · ${hh(x.start)} – ${hh(x.start + x.dur)} · Eastern Time</div>
    <label class="cs-m-row">👥 <input id="csmGuests" maxlength="200" placeholder="Add guests (email addresses)" value="${e(x.guests)}"></label>
    <label class="cs-m-row"><input type="checkbox" id="csmMeet" ${x.meet ? "checked" : ""}> 📹 Add Google Meet video conferencing</label>
    <label class="cs-m-row"><input type="checkbox" id="csmRemind" ${x.remind ? "checked" : ""}> 🔔 Email notification · 1 day before</label>
    <label class="cs-m-row cs-m-top">≡ <textarea id="csmDesc" rows="4" maxlength="300" placeholder="Add description">${e(x.desc)}</textarea></label>
    <div class="cs-m-btns">${isNew ? "" : `<button class="btn btn-ghost btn-sm" data-m="del">🗑 Delete</button>`}<span></span><button class="btn btn-ghost btn-sm" data-m="no">Cancel</button><button class="btn btn-navy btn-sm" data-m="ok">Save</button></div></div>`;
  document.body.appendChild(m);
  const q = sel => m.querySelector(sel), title = q("#csmTitle");
  const save = () => { const t = title.value.trim(); if(!t){ toast("Add a title."); title.focus(); return; }
    const v = {title:t.slice(0, 80), guests:q("#csmGuests").value.trim().slice(0, 200), meet:q("#csmMeet").checked, remind:q("#csmRemind").checked, desc:q("#csmDesc").value.trim().slice(0, 300)}; closeModal(); done(v); };
  m.addEventListener("click", ev => { const b = ev.target.closest("[data-m]"); if(b){ const k = b.dataset.m; if(k === "ok") save(); else if(k === "del"){ closeModal(); done(null, true); } else{ closeModal(); done(null); } } else if(ev.target === m){ closeModal(); done(null); } });
  m.addEventListener("keydown", ev => { if(ev.key === "Escape"){ ev.stopPropagation(); closeModal(); done(null); } else if(ev.key === "Enter" && ev.target === title){ ev.preventDefault(); save(); } });
  title.focus();
}
function onUp(ev){
  const d = S.drag; if(!d || ev.pointerId !== d.pid) return;
  const cur = d.cur; endDrag();
  if(!d.moved){ if(d.mode !== "new" && d.id){ S.sel = d.id; repaint(); const el = document.querySelector(`.cs-req[data-ev="${CSS.escape(d.id)}"]`); if(el) el.focus(); } return; }
  if(!cur){ repaint(); return; }
  if(d.mode === "new"){
    if(S.events.length >= C.MAXEV){ toast("That’s the most events a week can hold."); return; }
    const base = {id:uid(), title:"", day:cur.day, start:cur.start, dur:cur.dur, desc:"", guests:"", meet:false, remind:false};
    repaint();
    editor(base, true, v => { if(!v) return; S.events.push(Object.assign(base, v)); S.sel = base.id; changed(); repaint(); });
    return;
  }else{ Object.assign(d.x, {day:cur.day, start:cur.start, dur:cur.dur}); S.sel = d.id; }
  changed(); repaint();
}
function onCancel(){ endDrag(); repaint(); }
const evOf = id => S.events.find(x => x.id === id);
function rename(id){ const x = evOf(id); if(!x) return; editor(x, false, (v, del) => { if(del){ remove(id); return; } if(!v) return; Object.assign(x, v); changed(); repaint(); }); }
function remove(id){ S.events = S.events.filter(x => x.id !== id); if(S.sel === id) S.sel = null; changed(); repaint(); }
function wire(){
  const app = document.getElementById("app"); if(!app || app.dataset.csWired) return;
  app.dataset.csWired = "1";
  app.addEventListener("pointerdown", ev => {
    if(state.view !== "calsim" || !open() || ev.button > 0) return;
    const t = ev.target;
    if(t.closest("[data-del]")) return;
    if(t.closest("[data-rs]")){ ev.preventDefault(); startDrag(ev, "resize", t.closest("[data-rs]").dataset.rs); return; }
    const own = t.closest(".cs-req"); if(own && app.contains(own)){ startDrag(ev, "move", own.dataset.ev); return; }
    if(t.closest(".cs-ev")) return;      // a fixed event
    if(t.closest(".cs-col")){ ev.preventDefault(); startDrag(ev, "new"); }
  });
  app.addEventListener("click", ev => { if(state.view !== "calsim") return; const b = ev.target.closest("[data-del]"); if(b) remove(b.dataset.del); });
  app.addEventListener("dblclick", ev => { if(state.view !== "calsim") return; const el = ev.target.closest(".cs-req"); if(el) rename(el.dataset.ev); });
  app.addEventListener("keydown", ev => {
    if(state.view !== "calsim") return;
    const el = ev.target.closest && ev.target.closest(".cs-req"); if(!el) return;
    const x = evOf(el.dataset.ev); if(!x) return;
    const k = ev.key; let ok = true;
    if(k === "Delete" || k === "Backspace"){ ev.preventDefault(); remove(x.id); return; }
    if(k === "Enter"){ ev.preventDefault(); rename(x.id); return; }
    if(ev.shiftKey && k === "ArrowDown") x.dur = Math.min(BOTTOM - x.start, x.dur + C.STEP);
    else if(ev.shiftKey && k === "ArrowUp") x.dur = Math.max(C.STEP, x.dur - C.STEP);
    else if(k === "ArrowUp") x.start = Math.max(TOP, x.start - C.STEP);
    else if(k === "ArrowDown") x.start = Math.min(BOTTOM - x.dur, x.start + C.STEP);
    else if(k === "ArrowLeft") x.day = Math.max(0, x.day - 1);
    else if(k === "ArrowRight") x.day = Math.min(4, x.day + 1);
    else ok = false;
    if(!ok) return;
    ev.preventDefault(); S.sel = x.id; changed(); repaint();
    const again = document.querySelector(`.cs-req[data-ev="${CSS.escape(x.id)}"]`); if(again) again.focus();
  });
}

/* ---------- AI feedback ---------- */
function aiPrompt(s, events, g){
  const fixed = s.fixed.filter(f => f.kind !== "lunch").map(f => `- ${f.title}: ${C.DAYS[f.day]} ${hh(f.start)}–${hh(f.end)}${f.buffer ? ` (keep ${f.buffer} minutes free before and after for travel)` : ""}`).join("\n");
  const rules = s.tasks.map(k => `- [${k.id}] ${k.title} (${k.dur} min): ${k.note}`).join("\n");
  const cal = events.length ? events.map(x => `- "${x.title}": ${C.DAYS[x.day]} ${hh(x.start)}–${hh(x.start + x.dur)}${x.meet ? ", Google Meet added" : ""}${x.remind ? ", email reminder 1 day before" : ""}${x.desc ? `, description: "${x.desc}"` : ", NO description"}${x.guests ? `, guests: ${x.guests}` : ""}`).join("\n") : "(no events)";
  const facts = g.items.map(i => `- [${i.id}] ${i.title}: ${i.found ? `matched the event "${i.event.title}"` : "NOT FOUND on the calendar"}; ${i.perfect ? "every check passes" : "problems: " + i.checks.filter(c => !c.ok).map(c => c.why).join(" ")}`).join("\n");
  return `You are a legal-support trainer giving feedback on a trainee's calendar exercise (${s.title}; track: ${trackOf().title}). The trainee put each task on the attorney's calendar. Judge ONLY against the rules and notes below. Do not invent rules, and never give legal advice.

GENERAL RULES: Eastern Time; business hours 9:00 AM to 5:00 PM; leave ${s.gap} minutes between events (lunch excluded); every event needs a title and a description; add Google Meet to video calls; set an email reminder 1 day before external appointments when the task says so.

FIXED EVENTS ON THE CALENDAR:
${fixed}

TASKS AND THEIR NOTES (the rules):
${rules}

THE TRAINEE'S CALENDAR:
${cal}

AUTOMATED CHECK RESULTS (facts: trust them over your own reading):
${facts}

For each task write one or two sentences of feedback in a growth voice ("not yet", "add ...", "move it to ..."): say what is right, and what is missing and exactly how to fix it, using this trainee's own event. If a task is fully met, say what they did well. Then give 2 to 3 strengths and 2 to 3 things to work on next across the whole calendar.

Return ONLY a JSON object, no other text:
{"summary":"two or three sentences on the calendar overall","items":[{"id":"<task id>","status":"met|partial|missed","feedback":"..."} ... one per task, in order],"strengths":["..."],"improve":["..."]}`;
}
async function generateAI(s, events, feature){
  const g = C.review(s, events), at = new Date().toISOString();
  try{
    const raw = await callAIJson(aiPrompt(s, events, g), 2400, 120000, feature || "grading");
    const got = Array.isArray(raw && raw.items) ? raw.items : [];
    if(!got.length) throw new Error("it returned no feedback");
    const items = s.tasks.map((t, k) => { const it = got.find(z => z && z.id === t.id) || got[k] || {}, gi = g.items.find(z => z.id === t.id);
      const st = ["met", "partial", "missed"].includes(it.status) ? it.status : (gi.perfect ? "met" : gi.found ? "partial" : "missed");
      return {id:t.id, status:st, feedback:String(it.feedback || "").slice(0, 500)}; });
    const list = v => (Array.isArray(v) ? v : []).map(x => String(x).slice(0, 300)).filter(Boolean).slice(0, 4);
    return {at, summary:String((raw && raw.summary) || "").slice(0, 600), items, strengths:list(raw && raw.strengths), improve:list(raw && raw.improve)};
  }catch(err){ return {at, error:String((err && err.message) || "try again").slice(0, 140)}; }
}

/* ---------- actions ---------- */
async function submit(){
  const s = scn();
  if(!S.events.length){ toast("Add your events to the calendar before submitting."); return; }
  const flagged = Object.keys(C.flags(s, S.events)).length;
  if(!confirm(`Submit this calendar for ${s.short} to your trainer?` + (S.events.length < s.tasks.length ? `\n\nYou have ${S.events.length} event${S.events.length === 1 ? "" : "s"} for ${s.tasks.length} tasks.` : "") + (flagged ? `\n\n${flagged} event${flagged === 1 ? " is" : "s are"} marked red (a clash, missing travel time or outside business hours).` : "") + (subs(s.id).length ? "\n\nThis replaces your earlier submission (your trainer keeps both)." : "") + "\n\nAn AI check against the rules and notes runs as soon as you submit.")) return;
  S.result = null;
  if(!(S.data && isTrainee())){
    // A trainer's preview: show what the AI says, save nothing.
    S.aiBusy.preview = true; toast("Trainer preview: nothing is submitted. Running the AI check…"); repaint();
    const ai = await generateAI(s, S.events); S.aiBusy.preview = false; S.previewAI = {scn:s.id, ai}; repaint();
    return;
  }
  const au = C.review(s, S.events), sub = {scn:s.id, at:new Date().toISOString(), events:S.events.map(x => Object.assign({}, x)), auto:{pct:au.pct, score:au.score, max:au.max}};
  S.data.submissions.push(sub);
  if(S.data.submissions.length > 20) S.data.submissions = S.data.submissions.slice(-20);
  const key = subKey(sub); S.aiBusy[key] = true;
  clearTimeout(S.timer); repaint(); toast("Calendar submitted. The AI is checking it against the rules…");
  await sharedSet("calsim:" + S.id, S.data);                       // the submission is safe before the AI answers
  const ai = await generateAI(s, sub.events);
  sub.ai = ai; delete S.aiBusy[key];
  S.saved = "saving"; paintSave(); repaint();
  S.saved = (await sharedSet("calsim:" + S.id, S.data)) === false ? "fail" : "ok"; paintSave();
  toast(ai.error ? "Submitted. The AI check wasn’t available; your trainer will review it." : "AI feedback is ready below. Your trainer will go through it with you.");
}
function runReview(){
  const s = scn();
  if(!S.events.length){ toast("Add your events to the calendar first."); return; }
  const g = C.review(s, S.events); S.result = g;
  if(S.data && isTrainee()){
    S.data.autos.push({scn:s.id, at:new Date().toISOString(), pct:g.pct, score:g.score, max:g.max});
    if(S.data.autos.length > 30) S.data.autos = S.data.autos.slice(-30);
    queueSave();
  }
  repaint();
  const box = document.getElementById("csResultBox"); if(box && box.scrollIntoView) box.scrollIntoView({behavior:"smooth", block:"nearest"});
  toast(g.passed ? `Automated review: ${g.pct}%. It meets the attorney’s rules.` : `Automated review: ${g.pct}%. See what to fix below.`);
}
// The final feedback as a page of its own: it is what the trainee downloads or prints.
function feedbackDoc(s, sub, r, name){
  const ai = sub.ai && !sub.ai.error ? sub.ai : null, by = Object.fromEntries(((ai && ai.items) || []).map(x => [x.id, x]));
  const g = C.review(s, sub.events), events = C.clean(sub.events).sort((a, b) => a.day - b.day || a.start - b.start);
  const li = a => (a || []).filter(Boolean).map(x => `<li>${e(x)}</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Calendar feedback: ${e(s.short)}${name ? " · " + e(name) : ""}</title>
<style>body{font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:820px;margin:28px auto;padding:0 18px;} h1{font-size:22px;color:#0b1730;margin:0 0 4px;} h2{font-size:16px;color:#0b1730;border-bottom:2px solid #f97316;padding-bottom:3px;margin:22px 0 8px;}
.meta{color:#4b5563;font-size:13.5px;margin-bottom:10px;} .score{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0;} .score div{background:#f1f5f9;border-radius:10px;padding:8px 14px;} .score b{font-size:22px;display:block;color:#0b1730;}
table{border-collapse:collapse;width:100%;font-size:14px;} th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top;} th{background:#f8fafc;} .met{color:#166534;font-weight:700;} .partial{color:#92400e;font-weight:700;} .missed{color:#991b1b;font-weight:700;}
.tn{color:#14532d;} ul{margin:4px 0 4px 20px;padding:0;} @media print{body{margin:0;} h2{break-after:avoid;} tr{break-inside:avoid;}}</style></head><body>
<h1>Calendar feedback: ${e(s.title)}</h1><div class="meta">${name ? "Trainee: <b>" + e(name) + "</b> · " : ""}${e(trackOf().title)} · submitted ${e(new Date(sub.at).toLocaleString())}${r && r.at ? " · final feedback " + e(new Date(r.at).toLocaleDateString()) : ""}</div>
<div class="score"><div>Automated review<b>${g.pct}%</b></div>${r && r.score != null ? `<div>Trainer score<b>${e(r.score)} / 100</b></div>` : ""}</div>
${ai && ai.summary ? `<h2>Overview</h2><p>${e(ai.summary)}</p>` : ""}
${ai && ai.strengths.length ? `<h2>What’s working</h2><ul>${li(ai.strengths)}</ul>` : ""}${ai && ai.improve.length ? `<h2>Work on next</h2><ul>${li(ai.improve)}</ul>` : ""}
<h2>Task by task</h2><table><tr><th>Task</th><th>Result</th><th>Feedback</th></tr>${s.tasks.map(t => { const a = by[t.id], gi = g.items.find(z => z.id === t.id), st = a ? a.status : (gi.perfect ? "met" : gi.found ? "partial" : "missed"), n = r && r.tasks && r.tasks[t.id];
  return `<tr><td><b>${e(t.title)}</b><br><small>${e(t.note)}</small></td><td class="${st}">${(STATUS[st] || ["", st])[1]}</td><td>${a && a.feedback ? e(a.feedback) : (gi.perfect ? "Every rule is met." : e(gi.checks.filter(c => !c.ok).map(c => c.why).join(" ")))}${n ? `<br><span class="tn">Trainer: ${e(n)}</span>` : ""}</td></tr>`; }).join("")}</table>
${r && (r.extra || []).filter(Boolean).length ? `<h2>Also missed (added by your trainer)</h2><ul>${li(r.extra)}</ul>` : ""}
${r && r.comment ? `<h2>Trainer’s insights</h2><p>${e(r.comment).replace(/\n/g, "<br>")}</p>` : ""}
<h2>The calendar you submitted</h2><table><tr><th>When</th><th>Event</th><th>Details</th></tr>${events.map(x => `<tr><td>${C.DAYS[x.day]}<br>${hh(x.start)} – ${hh(x.start + x.dur)}</td><td><b>${e(x.title)}</b></td><td>${x.meet ? "📹 Google Meet<br>" : ""}${x.remind ? "🔔 Email reminder 1 day before<br>" : ""}${x.guests ? "Guests: " + e(x.guests) + "<br>" : ""}${e(x.desc)}</td></tr>`).join("") || "<tr><td colspan=3>No events.</td></tr>"}</table>
<p class="meta">Eastern Time · LSH Foundational Training · Calendar Management</p></body></html>`;
}
function finalOf(scnId){
  const s = C.SCENARIOS.find(x => x.id === scnId), sub = s && subs(scnId).pop(), r = sub && S.data.reviews[subKey(sub)];
  return s && sub && released(r) ? {s, sub, r, name:state.certName || state.traineeName || ""} : null;
}
window.FTCalSim = {
  submit,
  download(id){ const f = finalOf(id); if(!f){ toast("Your final feedback isn’t released yet."); return; }
    const blob = new Blob([feedbackDoc(f.s, f.sub, f.r, f.name)], {type:"text/html"}), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `Calendar feedback - ${f.s.short} - ${f.name || "trainee"}.html`.replace(/[\\/:*?"<>|]+/g, "");
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); },
  print(id){ const f = finalOf(id); if(!f){ toast("Your final feedback isn’t released yet."); return; }
    const w = window.open("", "_blank"); if(!w){ toast("Allow pop-ups to print, or use Download."); return; }
    w.document.open(); w.document.write(feedbackDoc(f.s, f.sub, f.r, f.name)); w.document.close(); w.focus(); setTimeout(() => { try{ w.print(); }catch(err){} }, 400); }, save:saveNow, review:runReview,
  add(){
    if(S.events.length >= C.MAXEV){ toast("That’s the most events a week can hold."); return; }
    const x = {id:uid(), title:"", day:0, start:C.OPEN, dur:60, desc:"", guests:"", meet:false, remind:false};
    editor(x, true, v => { if(!v) return; S.events.push(Object.assign(x, v)); S.sel = x.id; changed(); repaint(); });
  },
  reset(){ if(S.events.length && !confirm("Remove all of your events from this week?")) return; S.events = []; S.sel = null; changed(); repaint(); },
  pick(i){ setScn(i); render(); },
  // open the scheduler on a track (its first week), or where it was
  open(track){ if(track){ const i = C.SCENARIOS.findIndex(x => x.track === track); if(i >= 0 && i !== S.scn) setScn(i); } if(state.view === "calsim") render(); else goto("calsim"); }
};
// The cards of the Calendaring Simulators on the Simulators page (js/ft-simulators.js): one per track, with the trainee's scores.
window.FTCalSimCards = function(){
  const unlocked = open();
  return C.TRACKS.map(tk => {
    const mine = S.data ? C.SCENARIOS.filter(sc => sc.track === tk.id).map(sc => { const l = subs(sc.id).pop(), r = l && S.data.reviews[subKey(l)], b = bestAuto(sc.id);
      return b < 0 && !l ? "" : `<div class="fts-note">${e(sc.short)}: ${b >= 0 ? `🤖 best ${b}%` : ""}${l ? ` · 📤 submitted` : ""}${r ? ` · 👤 trainer ${e(r.score)}/100` : ""}</div>`; }).join("") : "";
    return `<div class="card fts-card ${unlocked ? "" : "fts-locked"}"><div class="fts-kicker">${e(tk.where)}${unlocked ? "" : " · opens with Lesson " + LESSON}</div>
      <h3>${tk.icon} ${e(tk.title)}</h3><p class="fts-note">${e(tk.blurb)}</p>${mine}
      <div class="fts-tool-act">${unlocked ? `<button class="btn btn-navy" onclick="FTCalSim.open('${tk.id}')">📅 Open →</button>` : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div>`;
  }).join("");
};
// The scheduler's scores are in the trainee's record: read it when the Simulators page opens, so the card shows them.
window.FTCalSimLoad = function(){ if(isTrainee() && !S.data && !S.loading) load(); };

/* ---------- results from the connected simulators (Portal, CMS) ---------- */
window.addEventListener("message", ev => {
  const d = ev.data;
  if(!d || d.type !== "lsh-sim-result" || d.sim !== "calendar" || !isTrainee()) return;
  if(ev.origin !== new URL(PORTAL).origin && ev.origin !== new URL(CMS).origin) return;
  const score = Number(d.score), max = Number(d.max);
  if(!isFinite(score) || !isFinite(max) || max <= 0 || score < 0 || score > max) return;
  const add = () => { S.data.external.push({title:String(d.title || "Calendaring Simulator").slice(0, 80), source:ev.origin, score, max, at:new Date().toISOString()});
    if(S.data.external.length > 30) S.data.external = S.data.external.slice(-30); queueSave(); if(state.view === "calsim") repaint(); };
  if(S.data) add(); else load().then(add);
});

/* ---------- admin: every trainee's submitted calendars, and the trainer's review ---------- */
const A = {rows:null, loading:false, open:{}, closed:{}, view:{}};
async function loadAdmin(){
  A.loading = true;
  try{
    const keys = (await sharedList("calsim:")) || [], ids = keys.map(k => String(k).replace(/^calsim:/, ""));
    const people = await sharedGetMany(ids.map(id => "trainee:" + id));
    const rows = ids.map((id, i) => { const r = people[i]; return {id, name:(r && r.name) || id, batch:(r && r.batch) || "", archived:!!(r && r.archived)}; }).filter(x => !x.archived);
    const recs = await ftGetMany(rows.map(x => "calsim:" + x.id));
    rows.forEach((x, i) => { x.d = norm(recs[i]); });
    A.rows = rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }catch(err){ A.rows = []; }
  A.loading = false;
  if(state.view === "admin" && state.adminTab === "calscores") render();
}
// One trainee's scores, per week: the automated review of their latest submission and the trainer's score for it.
function scoresOf(x){
  return C.SCENARIOS.map(s => {
    const last = x.d.submissions.filter(z => z.scn === s.id).pop(); if(!last) return "";
    const au = C.review(s, last.events).pct, r = x.d.reviews[subKey(last)];
    return `<span class="cs-pill">${e(s.short)}: 🤖 ${au}%${released(r) && r.score != null ? ` · 👤 ${e(r.score)}/100` : ""}</span>`;
  }).join("");
}
const unreviewed = x => x.d.submissions.filter(z => !released(x.d.reviews[subKey(z)])).length;
function renderAdminScores(){
  if(!A.rows && !A.loading) loadAdmin();
  if(!A.rows) return `<div class="card" style="padding:24px;">Loading the calendars…</div>`;
  const groups = {}; A.rows.forEach(x => { (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a, b) => (a === "") - (b === "") || b.localeCompare(a, undefined, {numeric:true}));
  return `<div class="card cs-admin"><h3>📅 Calendar Scores</h3>
    <p class="cs-hint">Each trainee’s calendars, with scores per trainee. Open a submission to see exactly what they built, the automated review against the attorney’s rules, and add your own feedback: a score out of 100, an overall comment and a comment on each task. They see your feedback on their Calendar Scheduler page. Scores from the Portal’s Calendaring Simulator are saved on the Portal under program FT; any result it posts back shows here too.</p>
    ${A.rows.length ? keys.map(b => `<section class="fp-batch"><div class="fp-batch-hd" onclick="FTCalAdmin.batch(${e(JSON.stringify(b))})">${A.closed[b] ? "▸" : "▾"} <b>📁 ${e(b ? "Batch " + b : "No batch set")}</b> <span class="fp-muted">${groups[b].length} trainee${groups[b].length === 1 ? "" : "s"}</span></div>
      ${A.closed[b] ? "" : groups[b].map(x => { const n = x.d.submissions.length, u = unreviewed(x); return `<div class="fp-arow"><div class="fp-arow-hd" onclick="FTCalAdmin.row('${e(x.id)}')">${A.open[x.id] ? "▾" : "▸"} <b>${e(x.name)}</b>
        ${n ? `<span class="cs-pill ok">📤 ${n} submitted</span>` : `<span class="cs-pill">Not submitted</span>`}${scoresOf(x)}${u ? `<span class="cs-pill warn">${u} to review</span>` : n ? `<span class="cs-pill ok">All reviewed</span>` : ""}</div>
        ${A.open[x.id] ? detailHTML(x) : ""}</div>`; }).join("")}</section>`).join("")
      : `<div class="fp-muted" style="margin:14px 0;">No trainee has used the Calendar Scheduler yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.refresh()">Refresh</button></div></div>`;
}
function detailHTML(x){
  const list = x.d.submissions.slice().reverse().map((z, i) => {
    const s = C.SCENARIOS.find(q => q.id === z.scn); if(!s) return "";
    const events = C.clean(z.events), k = subKey(z), key = x.id + "|" + k, shown = !!A.view[key], r = x.d.reviews[k], g = C.review(s, events), rel = released(r);
    const tk = s.tasks.map(t => `<label class="cs-rv-t">${e(t.title)} <input type="text" maxlength="400" id="csrt_${e(key)}_${e(t.id)}" value="${r && r.tasks ? e(r.tasks[t.id] || "") : ""}" placeholder="Your comment on this task (optional)"></label>`).join("");
    return `<div class="cs-sub"><div class="cs-sub-hd">📤 <b>${e(s.title)}</b> · submitted ${e(new Date(z.at).toLocaleString())} · ${events.length} event${events.length === 1 ? "" : "s"} for ${s.tasks.length} tasks · <span class="cs-pill ${g.passed ? "ok" : ""}">🤖 Automated: ${g.pct}%</span>
      <span class="cs-pill ${z.ai && !z.ai.error ? "ok" : "warn"}">${z.ai ? (z.ai.error ? "AI check failed" : "AI feedback ready") : "No AI feedback yet"}</span>
      ${i === 0 ? '<span class="cs-pill ok">latest</span>' : ""}${rel ? `<span class="cs-pill ok">Released${r.score != null ? ": " + e(r.score) + "/100" : ""}</span>` : r ? '<span class="cs-pill warn">Draft saved</span>' : '<span class="cs-pill warn">To review</span>'}
      <button class="btn btn-navy btn-sm" onclick="FTCalAdmin.live('${e(x.id)}','${e(k)}')">🖥 Live review</button>
      <button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.view('${e(key)}')">${shown ? "Hide details" : "👁 View calendar and feedback"}</button></div>
      ${shown ? `<div class="cs-gridwrap">${gridHTML(s, events, true)}</div>
        <div class="cs-lab">🤖 AI feedback <button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.regen('${e(x.id)}','${e(k)}')">↻ ${z.ai ? "Regenerate" : "Generate"}</button></div>${z.ai ? aiBlock(z.ai) + (z.ai.error ? "" : taskFeedback(s, z.ai, r)) : '<p class="cs-hint">The AI check runs when the trainee submits. Generate it here if it’s missing.</p>'}
        <div class="cs-lab">🤖 Automated review (the attorney’s rules)</div>${reviewHTML(g, r && r.tasks)}
        <div class="cs-lab">👤 Your feedback</div>
        <div class="cs-rv"><label>Score (0–100) <input type="number" min="0" max="100" id="csrs_${e(key)}" value="${r && r.score != null ? e(r.score) : ""}"></label>
          <label class="cs-rv-c">Written insights for the trainee <textarea id="csrc_${e(key)}" rows="3">${r ? e(r.comment) : ""}</textarea></label></div>
        <label class="cs-rv-t">Also missed: points the AI left out (one per line)<textarea id="csrx_${e(key)}" rows="3" class="cs-rv-ta">${r ? e((r.extra || []).join("\n")) : ""}</textarea></label>
        <div class="cs-rv-ts">${tk}</div>
        <div class="cs-m-btns"><button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.review('${e(x.id)}','${e(k)}','${e(key)}',false)">💾 Save draft</button>
          <button class="btn btn-navy btn-sm" onclick="FTCalAdmin.review('${e(x.id)}','${e(k)}','${e(key)}',true)">${rel ? "✅ Update released feedback" : "✅ Release final feedback to the trainee"}</button>${rel ? `<button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.withdraw('${e(x.id)}','${e(k)}')">↩ Withdraw (back to draft)</button>` : ""}</div>
        <p class="cs-hint">The trainee sees the AI feedback as soon as they submit. They see your score, insights, extra points and task comments, and can download a copy, only after you release.</p>` : ""}</div>`;
  }).join("");
  const ext = x.d.external.slice().reverse().map(z => `<div class="cs-att-ext">🔗 ${e(new Date(z.at).toLocaleString())} · ${e(z.title)} · <b>${Math.round(z.score)}/${Math.round(z.max)}</b></div>`).join("");
  const runs = x.d.autos.length ? `<div class="cs-att-ext">🤖 ${x.d.autos.length} automated review run${x.d.autos.length === 1 ? "" : "s"} while practicing: ${C.SCENARIOS.map(q => { const b = x.d.autos.filter(a => a.scn === q.id).reduce((m, a) => Math.max(m, a.pct), -1); return b < 0 ? "" : `${e(q.short)} best ${b}%`; }).filter(Boolean).join(", ")}</div>` : "";
  return `<div class="cs-atts">${list || '<div class="fp-muted">Nothing submitted yet.</div>'}${runs}${ext}</div>`;
}
// Save the trainer's side of one submission (a fresh read first: the trainee may have saved since this screen loaded).
async function persist(id, mutate){
  const row = A.rows.find(r => r.id === id); if(!row) throw new Error("trainee");
  const fresh = norm(await sharedGet("calsim:" + id)); mutate(fresh);
  if(await sharedSet("calsim:" + id, fresh) === false) throw new Error("save");
  row.d = fresh; return fresh;
}
const lines = v => String(v || "").split("\n").map(x => x.trim().slice(0, 300)).filter(Boolean).slice(0, 12);
function reviewPatch(id, k, release, src){
  const s = C.SCENARIOS.find(q => q.id === k.split("|")[0]);
  const sc = src.score === "" || src.score == null ? null : Number(src.score);
  if(sc != null && (!isFinite(sc) || sc < 0 || sc > 100)) throw new Error("Enter a score from 0 to 100.");
  if(release && sc == null) throw new Error("Enter a score from 0 to 100 before releasing.");
  const tasks = Object.fromEntries(s.tasks.map(t => [t.id, String(src.tasks[t.id] || "").trim().slice(0, 400)]).filter(p => p[1]));
  return {score:sc == null ? null : Math.round(sc), comment:String(src.comment || "").trim().slice(0, 2000), extra:lines(src.extra), tasks};
}
async function saveReview(id, k, patch, release){
  await persist(id, d => { const old = d.reviews[k] || {}; d.reviews[k] = Object.assign({}, old, patch, {by:state.adminName || "Trainer", at:new Date().toISOString(),
    released:release ? true : (old.released === true && release !== false ? true : false), releasedAt:release ? new Date().toISOString() : old.releasedAt}); });
}
window.FTCalAdmin = {
  row(id){ A.open[id] = !A.open[id]; render(); },
  batch(b){ A.closed[b] = !A.closed[b]; render(); },
  view(k){ A.view[k] = !A.view[k]; render(); },
  refresh(){ A.rows = null; render(); },
  async review(id, k, key, release){
    const g = n => (document.getElementById(n) || {}).value;
    const s = C.SCENARIOS.find(q => q.id === k.split("|")[0]);
    try{
      const patch = reviewPatch(id, k, release, {score:g("csrs_" + key), comment:g("csrc_" + key), extra:g("csrx_" + key), tasks:Object.fromEntries(s.tasks.map(t => [t.id, g("csrt_" + key + "_" + t.id)]))});
      await saveReview(id, k, patch, release ? true : null);
      toast(release ? "Final feedback released: the trainee can see it and download a copy." : "Draft saved."); render();
    }catch(err){ toast(err && /score/i.test(err.message) ? err.message : "Couldn’t save. Check your connection."); }
  },
  async withdraw(id, k){ try{ await persist(id, d => { if(d.reviews[k]) d.reviews[k].released = false; }); toast("Back to draft: the trainee no longer sees your feedback."); render(); }catch(err){ toast("Couldn’t save. Check your connection."); } },
  async regen(id, k){
    const row = A.rows.find(r => r.id === id), z = row && row.d.submissions.find(q => subKey(q) === k), s = z && C.SCENARIOS.find(q => q.id === z.scn); if(!z) return;
    toast("Asking the AI…"); const ai = await generateAI(s, C.clean(z.events), "trainer");
    try{ await persist(id, d => { const t = d.submissions.find(q => subKey(q) === k); if(t) t.ai = ai; }); toast(ai.error ? "The AI check wasn’t available." : "AI feedback updated."); render(); }catch(err){ toast("Couldn’t save. Check your connection."); }
  },

  /* ----- 🖥 Live review: the trainer talks the feedback through as it shows on screen, step by step ----- */
  live(id, k){
    const row = A.rows.find(r => r.id === id), z = row && row.d.submissions.find(q => subKey(q) === k), s = z && C.SCENARIOS.find(q => q.id === z.scn); if(!z) return;
    const r = row.d.reviews[k] || {};
    L = {id, k, step:0, name:row.name, s, z, events:C.clean(z.events), g:C.review(s, C.clean(z.events)), tasks:Object.assign({}, r.tasks || {}), extra:(r.extra || []).join("\n"), comment:r.comment || "", score:r.score != null ? r.score : "", released:released(r)};
    paintLive(); document.body.classList.add("cs-live-open");
  },
  liveGo(n){ liveSync(); L.step = Math.max(0, Math.min(L.s.tasks.length + 1, n)); paintLive(); },
  liveClose(){ liveSync(); const m = document.getElementById("csLive"); if(m) m.remove(); document.body.classList.remove("cs-live-open"); L = null; render(); },
  async liveSave(release){
    liveSync();
    try{
      const patch = reviewPatch(L.id, L.k, release, {score:L.score, comment:L.comment, extra:L.extra, tasks:L.tasks});
      await saveReview(L.id, L.k, patch, release ? true : null);
      L.released = L.released || !!release; toast(release ? "Final feedback released to the trainee." : "Draft saved."); paintLive();
    }catch(err){ toast(err && /score/i.test(err.message) ? err.message : "Couldn’t save. Check your connection."); }
  }
};
let L = null;
function liveSync(){
  if(!L) return; const q = id => document.getElementById(id);
  const t = L.s.tasks[L.step - 1];
  if(t && q("cslNote")){ const v = q("cslNote").value.trim(); if(v) L.tasks[t.id] = v; else delete L.tasks[t.id]; }
  if(L.step === L.s.tasks.length + 1 && q("cslExtra")){ L.extra = q("cslExtra").value; L.comment = q("cslComment").value; L.score = q("cslScore").value; }
}
function paintLive(){
  let m = document.getElementById("csLive"); if(!m){ m = document.createElement("div"); m.id = "csLive"; m.className = "cs-liveov"; document.body.appendChild(m); }
  const s = L.s, n = s.tasks.length, st = L.step, ai = L.z.ai && !L.z.ai.error ? L.z.ai : null, by = Object.fromEntries(((ai && ai.items) || []).map(x => [x.id, x]));
  const t = s.tasks[st - 1], gi = t && L.g.items.find(x => x.id === t.id), a = t && by[t.id];
  const steps = ["Overview"].concat(s.tasks.map((x, i) => (i + 1) + ". " + x.title), ["Anything missed?"]);
  let body;
  if(st === 0){
    body = `<h2>${e(L.name)} · ${e(s.title)}</h2>
      <div class="cs-live-score"><b>${L.g.pct}%</b><span>automated review · ${L.g.done} of ${n} tasks perfect</span></div>
      ${ai ? aiBlock(ai) : `<p class="cs-hint">${L.z.ai ? "The AI check wasn’t available. Go through the rule results task by task." : "No AI feedback was saved for this submission. Go through the rule results task by task, or generate it from the list."}</p>`}`;
  }else if(t){
    const stt = a && STATUS[a.status] || (gi.perfect ? STATUS.met : gi.found ? STATUS.partial : STATUS.missed);
    body = `<div class="cs-live-k">Task ${st} of ${n}</div><h2>${e(t.title)} <span class="cs-chip2 ${a ? e(a.status) : (gi.perfect ? "met" : gi.found ? "partial" : "missed")}">${stt[0]} ${stt[1]}</span></h2>
      <div class="cs-live-rule"><b>The rule:</b> ${e(t.note)}</div>
      ${gi.found ? `<div class="cs-live-ev">On the calendar: <b>${e(gi.event.title)}</b> · ${C.DAYS[gi.event.day]} ${hh(gi.event.start)} – ${hh(gi.event.start + gi.event.dur)}</div>` : `<div class="cs-live-ev bad">Not found on the calendar.</div>`}
      <ul class="cs-live-checks">${gi.checks.map(c => `<li class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"} <b>${e(c.label)}</b>${c.ok ? "" : ": " + e(c.why)}</li>`).join("")}</ul>
      ${a && a.feedback ? `<div class="cs-live-ai">🤖 ${e(a.feedback)}</div>` : ""}
      <label class="cs-rv-t">👤 Your note on this task (the trainee sees it when you release)<textarea id="cslNote" rows="3" class="cs-rv-ta">${e(L.tasks[t.id] || "")}</textarea></label>`;
  }else{
    const bad = L.g.items.filter(x => !x.perfect).length;
    body = `<h2>Anything the AI missed?</h2><p class="cs-hint">${bad ? bad + " task" + (bad === 1 ? "" : "s") + " still ha" + (bad === 1 ? "s" : "ve") + " something to fix. " : "Every task passed its rules. "}Add anything else you want the trainee to take away.</p>
      <label class="cs-rv-t">Also missed: one point per line<textarea id="cslExtra" rows="4" class="cs-rv-ta">${e(L.extra)}</textarea></label>
      <label class="cs-rv-t">Your written insights<textarea id="cslComment" rows="4" class="cs-rv-ta">${e(L.comment)}</textarea></label>
      <div class="cs-rv"><label>Score (0–100) <input type="number" min="0" max="100" id="cslScore" value="${e(L.score)}" placeholder="${L.g.pct}"></label></div>
      <div class="cs-m-btns"><button class="btn btn-ghost" onclick="FTCalAdmin.liveSave(false)">💾 Save draft</button><button class="btn btn-primary" onclick="FTCalAdmin.liveSave(true)">✅ ${L.released ? "Update released feedback" : "Release final feedback"}</button></div>
      ${L.released ? '<p class="cs-hint">Released: the trainee can see this and download a copy.</p>' : ""}`;
  }
  m.innerHTML = `<div class="cs-live-bar"><b>🖥 Live review · ${e(L.name)} · ${e(s.short)}</b><button class="btn btn-navy btn-sm" onclick="FTCalAdmin.liveClose()">✕ Close</button></div>
    <div class="cs-live-body"><div class="cs-live-cal"><div class="cs-gridwrap">${gridHTML(s, L.events, true, gi && gi.event ? gi.event.id : null)}</div></div>
      <div class="cs-live-side"><div class="cs-live-steps">${steps.map((x, i) => `<button class="cs-live-step ${i === st ? "on" : ""} ${i > 0 && i <= n ? (L.g.items[i - 1].perfect ? "ok" : "bad") : ""}" onclick="FTCalAdmin.liveGo(${i})">${e(x)}</button>`).join("")}</div>
        <div class="cs-live-panel">${body}</div>
        <div class="cs-live-nav"><button class="btn btn-ghost" ${st === 0 ? "disabled" : ""} onclick="FTCalAdmin.liveGo(${st - 1})">← Back</button><button class="btn btn-navy" ${st === n + 1 ? "disabled" : ""} onclick="FTCalAdmin.liveGo(${st + 1})">Next →</button></div></div></div>`;
}

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view !== "calsim"){ S.entered = false; return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-calsim">${renderPage()}</main>` + renderFooter();
  wire(); paintSave();
  try{ afterRender(); }catch(err){}
  if(!S.loading && (!S.data || !S.entered)){ S.entered = true; load(); }   // read the record afresh each time the page opens (a trainer may have reviewed since)
  if(isTrainee() && !state.ftOpenDays && typeof ftLoadOpenDays === "function") ftLoadOpenDays().then(() => { if(state.view === "calsim") render(); }).catch(() => {});
};
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab === "calscores" ? "active" : ""}" onclick="setAdminTab('calscores')">📅 Calendar Scores</button>`;
  if(state.adminTab === "calscores"){
    state.adminTab = "opendays";
    const out = __admin.apply(this, arguments);
    state.adminTab = "calscores";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    return out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>" + renderAdminScores();
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return end > 0 ? out.slice(0, end) + tab + out.slice(end) : out;
};

(function(){ const st = document.createElement("style"); st.id = "ft-calendar"; st.textContent = `
main.main-calsim{max-width:1180px;margin:0 auto;padding:22px 16px 40px;}
.cs-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;} .cs-top h1{margin:0 0 4px;color:var(--navy);font-size:28px;}
.cs-lead{margin:0 0 14px;color:var(--ink-soft);font-size:15px;}
.cs-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.cs-tab{border:1px solid var(--line,#e5e7eb);background:var(--card,#fff);color:var(--navy);border-radius:999px;padding:8px 16px;font-weight:700;font-size:13.5px;cursor:pointer;}
.cs-tab i{font-style:normal;font-weight:600;color:var(--ink-soft);margin-left:6px;font-size:12px;} .cs-tab.active{background:var(--navy);color:#fff;border-color:var(--navy);} .cs-tab.active i{color:#fdba74;}
.cs-brief{padding:12px 16px;margin-bottom:14px;font-size:14px;color:var(--ink-soft);} .cs-err{color:#b91c1c;font-size:13px;margin-bottom:8px;}
.cs-main{display:grid;grid-template-columns:290px minmax(0,1fr);gap:14px;align-items:start;}
.cs-tray{background:var(--card,#fff);border:1px solid var(--line,#d1d5db);border-radius:14px;padding:12px;position:sticky;top:8px;max-height:calc(100vh - 16px);overflow:auto;}
.cs-tray h3{margin:0 0 4px;font-size:15px;color:var(--navy);} .cs-count{font-size:12px;font-weight:700;color:var(--orange-deep);margin-left:4px;}
.cs-hint{margin:0 0 10px;font-size:12.5px;color:var(--ink-soft);} .cs-legend{margin:8px 2px 0;}
.cs-task{background:#fff;border:1px solid var(--line,#e5e7eb);border-left:4px solid #f97316;border-radius:10px;padding:9px 11px;margin-bottom:8px;}
.cs-task b{font-size:13.5px;color:var(--navy);line-height:1.25;display:block;}
.cs-task p{margin:4px 0 0;font-size:12px;color:var(--ink-soft);line-height:1.35;} .cs-dur{display:inline-block;margin-top:3px;font-size:11px;font-weight:800;background:#ffedd5;color:#9a3412;border-radius:999px;padding:1px 8px;}
.cs-gridwrap{background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:8px;overflow-x:auto;}
.cs-grid{display:grid;grid-template-columns:54px repeat(5,minmax(112px,1fr));min-width:660px;}
.cs-dayhd{height:28px;line-height:28px;text-align:center;font-weight:800;font-size:13px;color:var(--navy);}
.cs-timecol{position:relative;} .cs-time{position:absolute;right:6px;font-size:10.5px;color:var(--ink-soft);}
.cs-col{position:relative;cursor:cell;touch-action:pan-y;border-left:1px solid #dadce0;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${SH * 4 - 1}px,#dadce0 ${SH * 4 - 1}px,#dadce0 ${SH * 4}px);}
.cs-col::before,.cs-col::after{content:"";position:absolute;left:0;right:0;background:rgba(100,116,139,.12);pointer-events:none;} .cs-col::before{top:0;height:${SH * 4}px;} .cs-col::after{top:${px(17 * 60)}px;bottom:0;}
.cs-ev{position:absolute;left:3px;right:3px;border-radius:7px;padding:2px 6px;overflow:hidden;font-size:11.5px;line-height:1.2;box-sizing:border-box;z-index:2;}
.cs-ev b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .cs-ev span{display:block;font-size:10.5px;opacity:.85;white-space:nowrap;}
.cs-fixed{background:#e8eaed;color:#3c4043;border:1px solid #dadce0;cursor:not-allowed;} .cs-court{background:#3f51b5;color:#fff;border-color:#3f51b5;}
.cs-lunch{background:repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 6px,#e2e8f0 6px,#e2e8f0 12px);color:#64748b;}
.cs-buf{position:absolute;left:3px;right:3px;background:repeating-linear-gradient(135deg,rgba(30,58,138,.14),rgba(30,58,138,.14) 4px,transparent 4px,transparent 8px);border-radius:6px;z-index:1;pointer-events:none;}
.cs-req{background:#039be5;color:#fff;border:1px solid #0288d1;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;z-index:3;box-shadow:0 1px 3px rgba(0,0,0,.2);padding-right:18px;}
.cs-req:focus-visible{outline:3px solid #fdba74;outline-offset:1px;} .cs-req.cs-sel{box-shadow:0 0 0 2px var(--navy);} .cs-req.cs-bad,.cs-ro.cs-bad{background:#d93025;border-color:#b3261e;color:#fff;} .cs-req.cs-lifted{opacity:.35;}
.cs-x{position:absolute;top:1px;right:2px;width:16px;height:16px;border:0;border-radius:4px;background:rgba(0,0,0,.12);color:#111;font-size:10px;line-height:16px;padding:0;cursor:pointer;} .cs-x:hover{background:rgba(0,0,0,.3);color:#fff;}
.cs-rs{position:absolute;left:0;right:0;bottom:0;height:8px;cursor:ns-resize;touch-action:none;background:linear-gradient(transparent,rgba(0,0,0,.18));}
.cs-prev{position:absolute;left:3px;right:3px;border-radius:7px;z-index:5;pointer-events:none;font-size:10.5px;font-weight:700;padding:2px 6px;box-sizing:border-box;}
.cs-prev.ok{background:rgba(34,197,94,.3);border:2px solid #16a34a;color:#14532d;} .cs-prev.bad{background:rgba(239,68,68,.28);border:2px solid #dc2626;color:#7f1d1d;}
.cs-ghost{position:fixed;z-index:9500;pointer-events:none;background:#f97316;color:#111827;border-radius:8px;padding:4px 8px;font-size:12px;box-shadow:0 8px 20px rgba(0,0,0,.3);opacity:.92;overflow:hidden;box-sizing:border-box;}
body.cs-dragging,body.cs-dragging *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important;}
.cs-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0;} .cs-save{font-size:12.5px;color:var(--ink-soft);}
.cs-hist{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;} .cs-hist-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.cs-pill{display:inline-block;background:#eef2ff;color:#1e3a8a;border-radius:999px;padding:3px 11px;font-size:12px;font-weight:700;margin:0 4px 0 6px;} .cs-hist .cs-pill{margin:0;} .cs-pill.ok{background:#dcfce7;color:#166534;} .cs-pill.warn{background:#fef3c7;color:#92400e;}
.cs-review{flex-basis:100%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 12px;font-size:13.5px;} .cs-review p{margin:4px 0 0;color:#14532d;}
.cs-more{padding:14px 18px;} .cs-more p{margin:4px 0 10px;font-size:13.5px;color:var(--ink-soft);} .cs-more a{text-decoration:none;}
.cs-admin{padding:16px 18px;} .cs-atts{margin:6px 0 10px 18px;} .cs-att-ext{font-size:13px;margin:4px 0;}
.cs-sub,.cs-sub *{text-transform:none;letter-spacing:normal;} .cs-sub{border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:8px 12px;margin:6px 0;} .cs-sub-hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;} .cs-sub .cs-gridwrap{margin:8px 0;}
.cs-ro{background:#039be5;color:#fff;border:1px solid #0288d1;z-index:3;} .cs-flag{color:#b91c1c;font-weight:700;} .cs-result{background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-left:6px solid #f97316;border-radius:12px;padding:14px 16px;margin:0 0 14px;} .cs-result.ok{border-left-color:#16a34a;}
.cs-score{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px;} .cs-score b{font-size:32px;color:var(--navy);} .cs-score span{font-weight:700;color:var(--ink-soft);}
.cs-item{border-top:1px solid var(--line,#e5e7eb);padding:8px 0;font-size:13.5px;} .cs-item-hd{display:flex;gap:6px;align-items:baseline;} .cs-item-hd span{margin-left:auto;font-weight:700;color:var(--ink-soft);white-space:nowrap;}
.cs-item.ok .cs-item-hd{color:#166534;} .cs-item.bad .cs-item-hd{color:#991b1b;} .cs-item ul{margin:4px 0 0 22px;padding:0;color:#7f1d1d;font-size:13px;} .cs-tnote{margin-top:4px;font-size:13px;color:#14532d;background:#f0fdf4;border-radius:6px;padding:4px 8px;}
.cs-review ul{margin:6px 0 0 20px;padding:0;font-size:13px;color:#14532d;} .cs-rv-ts{display:flex;flex-direction:column;gap:6px;margin:6px 0 10px;} .cs-rv-t{display:flex;flex-direction:column;gap:2px;font-size:12px;font-weight:700;color:var(--ink-soft);} .cs-rv-t input{padding:6px 8px;font:inherit;font-weight:400;}
.cs-evlist{margin:6px 0 10px 18px;padding:0;font-size:13px;} .cs-rv{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin:8px 0 4px;} .cs-rv label{display:flex;flex-direction:column;gap:3px;font-size:12px;font-weight:700;color:var(--ink-soft);} .cs-rv input{width:90px;padding:6px 8px;} .cs-rv-c{flex:1 1 280px;} .cs-rv textarea{width:100%;padding:6px 8px;font:inherit;}
.cs-blurb{margin:0 0 12px;font-size:13.5px;color:var(--ink-soft);max-width:820px;} .cs-weeks{margin-top:-4px;} .cs-wk{font-size:12.5px;padding:6px 14px;} .cs-et{font-size:11px;color:var(--ink-soft);} .cs-chip{background:#e0f2fe;color:#075985;margin-left:4px;}
.cs-modal{position:fixed;inset:0;z-index:9800;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;}
.cs-dlg{width:min(460px,100%);background:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 24px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:12px;}
.cs-m-title{border:0;border-bottom:2px solid #1a73e8;font-size:21px;padding:4px 2px 6px;outline:none;color:#202124;width:100%;} .cs-m-when{font-size:13.5px;color:#3c4043;}
.cs-m-row{display:flex;gap:8px;align-items:center;font-size:13.5px;color:#3c4043;} .cs-m-row input[type=text],.cs-m-row input:not([type]){flex:1;border:0;border-bottom:1px solid #dadce0;padding:5px 2px;font:inherit;outline:none;} .cs-m-top{align-items:flex-start;} .cs-m-row textarea{flex:1;border:1px solid #dadce0;border-radius:8px;padding:6px 8px;font:inherit;resize:vertical;}
.cs-m-btns{display:flex;gap:8px;align-items:center;} .cs-m-btns span{flex:1;}
.cs-ai,.cs-fb{background:#f8fafc;border:1px solid var(--line,#e5e7eb);border-radius:12px;padding:12px 14px;margin:8px 0;flex-basis:100%;} .cs-ai p{margin:4px 0;font-size:14px;} .cs-fb{background:#fff;border-left:5px solid #039be5;} .cs-fb-hd{display:flex;gap:10px;align-items:center;flex-wrap:wrap;} .cs-fb-hd h3{margin:0;font-size:16px;color:var(--navy);}
.cs-ul{margin:4px 0 6px 20px;padding:0;font-size:13.5px;} .cs-ul.ok{color:#166534;} .cs-fbt{margin-top:6px;} .cs-fbi{border-top:1px solid var(--line,#e5e7eb);padding:6px 0;font-size:13.5px;} .cs-fbi-hd{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;} .cs-fbi p{margin:3px 0 0 20px;} .cs-tn{color:#14532d;}
.cs-chip2{font-size:11px;font-weight:800;border-radius:999px;padding:1px 9px;} .cs-chip2.met{background:#dcfce7;color:#166534;} .cs-chip2.partial{background:#fef3c7;color:#92400e;} .cs-chip2.missed{background:#fee2e2;color:#991b1b;}
.cs-final{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin:10px 0;} .cs-final-hd{font-size:14.5px;color:#14532d;} .cs-final p{margin:4px 0;font-size:14px;} .cs-fb-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;} .cs-rv-ta{width:100%;padding:6px 8px;font:inherit;font-weight:400;}
.cs-hl{box-shadow:0 0 0 3px #fbbc04,0 0 18px 4px rgba(251,188,4,.7)!important;z-index:6!important;}
.cs-liveov{position:fixed;inset:0;z-index:9600;background:var(--bg,#f8fafc);display:flex;flex-direction:column;} body.cs-live-open{overflow:hidden;}
.cs-live-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 18px;background:var(--card,#fff);border-bottom:1px solid var(--line,#e5e7eb);font-size:16px;color:var(--navy);}
.cs-live-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(340px,1fr);gap:16px;padding:14px 18px;overflow:auto;} .cs-live-cal{min-width:0;overflow:auto;}
.cs-live-side{display:flex;flex-direction:column;gap:10px;min-width:0;} .cs-live-steps{display:flex;gap:6px;flex-wrap:wrap;} .cs-live-step{border:1px solid var(--line,#d1d5db);background:#fff;border-radius:999px;padding:4px 11px;font-size:12px;font-weight:700;cursor:pointer;color:var(--navy);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;} .cs-live-step.ok{border-color:#16a34a;} .cs-live-step.bad{border-color:#dc2626;} .cs-live-step.on{background:var(--navy);color:#fff;border-color:var(--navy);}
.cs-live-panel{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:14px 18px;font-size:16px;line-height:1.5;flex:1;overflow:auto;} .cs-live-panel h2{margin:2px 0 8px;font-size:22px;color:var(--navy);} .cs-live-k{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--orange-deep);}
.cs-live-score{display:flex;gap:12px;align-items:baseline;} .cs-live-score b{font-size:40px;color:var(--navy);} .cs-live-rule{background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:8px 12px;margin:8px 0;} .cs-live-ev{margin:6px 0;font-size:15px;} .cs-live-ev.bad{color:#991b1b;font-weight:700;}
.cs-live-checks{list-style:none;margin:6px 0;padding:0;font-size:15px;} .cs-live-checks li{padding:2px 0;} .cs-live-checks .ok{color:#166534;} .cs-live-checks .bad{color:#991b1b;} .cs-live-ai{background:#eff6ff;border-radius:10px;padding:10px 14px;margin:8px 0;font-size:16.5px;}
.cs-live-nav{display:flex;justify-content:space-between;gap:10px;} .cs-live-nav .btn{min-width:120px;font-size:15px;}
@media (max-width:980px){ .cs-live-body{grid-template-columns:1fr;} }
@media (max-width:820px){ .cs-main{grid-template-columns:1fr;} .cs-tray{position:static;max-height:none;} }
`; document.head.appendChild(st); })();
})();
