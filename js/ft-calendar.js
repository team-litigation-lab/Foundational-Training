/* ============================================================
   📅 Calendar Scheduler: a drag-and-drop calendaring simulator, graded.
   Loaded after js/ft-calsim-core.js (scenarios and grading) and before js/ft-simulators.js. Route: #/calsim.
     • The week is a Monday to Friday grid in 30-minute steps. The attorney's fixed events are locked; the
       trainee drags each request from the inbox onto the week (mouse, touch or keyboard), drags placed events
       to move them, and drops one back on the inbox to take it off the calendar.
     • ✅ Check my schedule grades the week (FTCalCore.grade): every request is checked for conflicts, business
       hours and its own rules, and is worth its share of 100. 80% passes. Each check is saved as an attempt.
     • Saved in the trainee's `calsim:<id>` record: {v:1, drafts:{scenario: placements}, attempts:[{scn, at, place,
       score, max, pct}], external:[...]}. Attempts keep the placements, and the admin screen re-grades them, so a
       score is never just a number the trainee typed.
     • Admin → 📅 Calendar Scores: every trainee's best score per scenario, attempts and the per-request checks.
     • Connected simulators: the Portal's Calendaring Simulator opens from here with program=FT, the trainee's
       name and batch (its own scores are saved for the trainer there). A simulator that finishes with
       postMessage({type:"lsh-sim-result", sim:"calendar", score, max, title}) to this page (from the Portal or
       the CMS) has the result added to the same record, so it shows beside the scheduler's scores.
   ============================================================ */
(function(){
const C = window.FTCalCore;
if(!C) return;
const PORTAL = "https://cm-training-activity.pages.dev/simulators/";
const CMS = "https://lshcasemanagementtraining-trainingcrm.pages.dev/";
const LESSON = 5;                         // Calendaring & Appointment Setting Training
const TOP = 8 * 60, BOTTOM = 18 * 60, SH = 24;   // the grid shows 8:00 AM to 6:00 PM; one 30-minute slot is SH pixels
const px = min => (min - TOP) / C.STEP * SH;
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const open = () => state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? dayUnlocked(LESSON) : true);

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["calsim"]);

const S = {id:null, data:null, loading:false, err:"", scn:0, place:{}, result:null, timer:null, saved:null, drag:null, sel:null};
const scn = () => C.SCENARIOS[S.scn];

/* ---------- the trainee's saved record ---------- */
const blank = () => ({v:1, drafts:{}, attempts:[], external:[]});
async function load(){
  if(!isTrainee()){ S.data = blank(); return; }
  S.loading = true; S.err = ""; S.id = state.traineeId;
  try{
    const d = (await sharedGet("calsim:" + S.id)) || blank();
    d.drafts = d.drafts || {}; d.attempts = d.attempts || []; d.external = d.external || [];
    S.data = d;
  }catch(err){ S.data = blank(); S.err = "Couldn’t load your saved work. You can still practice; check your connection to save."; }
  S.loading = false;
  S.place = C.clean(scn(), S.data.drafts[scn().id] || {});
  if(state.view === "calsim") render();
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
function setPlace(id, p){
  if(p) S.place[id] = p; else delete S.place[id];
  S.result = null;
  if(S.data){ S.data.drafts[scn().id] = Object.assign({}, S.place); queueSave(); }
}
const bestOf = id => (S.data ? S.data.attempts : []).filter(a => a.scn === id).reduce((m, a) => Math.max(m, regrade(a).pct), -1);
function regrade(a){ const s = C.SCENARIOS.find(x => x.id === a.scn); return s ? C.grade(s, C.clean(s, a.place)) : {pct:0, score:0, max:0}; }

/* ---------- the page ---------- */
const hh = m => C.fmt(m);
function blockHTML(ev, req, bad){
  const k = ev.kind || "";
  const style = `top:${px(ev.start)}px;height:${Math.max(px(ev.end) - px(ev.start), 12)}px;`;
  const pad = ev.buffer ? `<div class="cs-buf" style="top:${px(ev.start - ev.buffer)}px;height:${(ev.buffer / C.STEP) * SH}px;"></div><div class="cs-buf" style="top:${px(ev.end)}px;height:${(ev.buffer / C.STEP) * SH}px;"></div>` : "";
  if(req) return pad + `<div class="cs-ev cs-req ${bad ? "cs-bad" : ""} ${S.sel === ev.id ? "cs-sel" : ""}" data-req="${ev.id}" tabindex="0" role="button" aria-label="${e(ev.title)}, ${C.DAYS[ev.day]} ${hh(ev.start)}. Arrow keys move it, Delete removes it." style="${style}"><b>${e(ev.title)}</b><span>${hh(ev.start)} – ${hh(ev.end)}</span></div>`;
  return pad + `<div class="cs-ev cs-fixed cs-${k}" style="${style}" title="${e(ev.note || ev.title)}"><b>${e(ev.title)}</b><span>${hh(ev.start)} – ${hh(ev.end)}</span></div>`;
}
function gridHTML(){
  const s = scn(), evs = C.eventsOf(s, S.place);
  const bad = id => { const me = evs.find(x => x.id === id); return me.start < C.OPEN || me.end > C.CLOSE || evs.some(o => o.id !== id && C.overlap(me, o, 0)); };
  const times = []; for(let m = TOP; m < BOTTOM; m += 60) times.push(`<div class="cs-time" style="top:${px(m) - 7}px">${hh(m)}</div>`);
  const cols = C.DAYS.map((name, d) => {
    const blocks = s.fixed.filter(f => f.day === d).map(f => blockHTML(f, false)).join("")
      + s.requests.filter(r => S.place[r.id] && S.place[r.id].day === d).map(r => blockHTML({id:r.id, title:r.title, day:d, start:S.place[r.id].start, end:S.place[r.id].start + r.dur}, true, bad(r.id))).join("");
    return `<div class="cs-colwrap"><div class="cs-dayhd">${name}</div><div class="cs-col" data-day="${d}" style="height:${px(BOTTOM)}px">${blocks}</div></div>`;
  }).join("");
  return `<div class="cs-grid"><div class="cs-times"><div class="cs-dayhd">&nbsp;</div><div class="cs-timecol" style="height:${px(BOTTOM)}px">${times.join("")}</div></div>${cols}</div>`;
}
function trayHTML(){
  const s = scn(), left = s.requests.filter(r => !S.place[r.id]);
  return `<div class="cs-tray" id="csTray"><h3>📥 Requests to schedule <span class="cs-count">${left.length} of ${s.requests.length} left</span></h3>
    <p class="cs-hint">Drag a request onto the week. Drag it back here to take it off.</p>
    ${left.length ? left.map(r => `<div class="cs-card" data-req="${r.id}" tabindex="0" role="button" aria-label="${e(r.title)}, ${r.dur} minutes. Press Enter to place it on Monday, then use the arrow keys.">
        <b>${e(r.title)}</b><span class="cs-dur">${r.dur} min</span><p>${e(r.note)}</p></div>`).join("")
      : `<div class="cs-empty">Every request is on the calendar. Check your schedule when you’re ready.</div>`}</div>`;
}
function resultHTML(){
  const g = S.result; if(!g) return "";
  return `<div class="card cs-result ${g.passed ? "ok" : "bad"}" id="csResult"><div class="cs-score"><b>${g.pct}%</b><span>${g.passed ? "✅ Passed" : "Not yet"} · ${C.PASS}% passes · ${g.done} of ${g.items.length} requests perfect</span></div>
    ${g.items.map(i => `<div class="cs-item ${i.perfect ? "ok" : "bad"}"><div class="cs-item-hd">${i.perfect ? "✓" : "✗"} <b>${e(i.title)}</b> <span>${i.pts} / ${i.weight}</span></div>
      ${i.perfect ? "" : `<ul>${i.checks.filter(c => !c.ok).map(c => `<li><b>${e(c.label)}:</b> ${e(c.why)}</li>`).join("")}</ul>`}</div>`).join("")}
    <p class="cs-hint">${g.passed && g.pct === 100 ? "Perfect schedule." : "Fix what’s marked, then check again. Every attempt is saved for your trainer."}</p></div>`;
}
function historyHTML(){
  if(!S.data) return "";
  const rows = C.SCENARIOS.map(s => { const n = S.data.attempts.filter(a => a.scn === s.id).length, b = bestOf(s.id); return `<span class="cs-pill ${b >= C.PASS ? "ok" : ""}">${e(s.title.split(" · ")[0])}: ${n ? `best ${b}% · ${n} attempt${n === 1 ? "" : "s"}` : "not tried"}</span>`; }).join("");
  const ext = S.data.external.slice(-3).reverse().map(x => `<span class="cs-pill">${e(x.title || "Simulator")}: ${Math.round(x.score)}/${Math.round(x.max)}</span>`).join("");
  return `<div class="cs-hist">${rows}${ext}</div>`;
}
function renderPage(){
  const s = scn();
  const tabs = C.SCENARIOS.map((x, i) => `<button class="cs-tab ${i === S.scn ? "active" : ""}" onclick="FTCalSim.pick(${i})">${e(x.title)} <i>${e(x.level)}</i></button>`).join("");
  if(!open()) return `<div class="cs-wrap"><h1>📅 Calendar Scheduler</h1><div class="card" style="padding:20px;">🔒 This simulator opens with Lesson ${LESSON}, Calendaring &amp; Appointment Setting.</div></div>`;
  return `<div class="cs-wrap"><div class="cs-top"><div><h1>📅 Calendar Scheduler</h1>
      <p class="cs-lead">Drag-and-drop calendaring, graded. Put every request on the attorney’s week without breaking a rule.</p></div>
      <div><button class="btn btn-ghost btn-sm" onclick="goto('simulators')">← Simulators</button></div></div>
    <div class="cs-tabs">${tabs}</div>
    <div class="card cs-brief">${e(s.brief)}</div>
    ${S.err ? `<div class="cs-err">${e(S.err)}</div>` : ""}
    <div class="cs-main">${trayHTML()}<div class="cs-gridwrap">${gridHTML()}</div></div>
    <div class="cs-actions"><button class="btn btn-navy" onclick="FTCalSim.check()">✅ Check my schedule</button>
      <button class="btn btn-ghost" onclick="FTCalSim.reset()">↺ Clear the week</button><span class="cs-save" id="csSave"></span></div>
    ${resultHTML()}${historyHTML()}
    <div class="card cs-more"><b>🔗 Also graded for your trainer</b><p>The Portal’s Calendaring Simulator is a second week of scheduling conflicts. It opens in its own tab with your name and batch, so its score is saved for your trainer too.</p>
      <a class="btn btn-ghost btn-sm" href="${e(portalHref())}" target="_blank" rel="noopener">Open the Portal’s Calendaring Simulator ↗</a></div></div>`;
}
function portalHref(){
  const q = new URLSearchParams({program:"FT"});
  if(isTrainee()){ const n = state.certName || state.traineeName; if(n) q.set("name", n); if(state.traineeBatch) q.set("batch", state.traineeBatch); }
  return PORTAL + "calendar.html?" + q;
}
function repaint(){ const gw = document.querySelector(".cs-gridwrap"), tr = document.getElementById("csTray"); if(!gw || !tr){ render(); return; }
  gw.innerHTML = gridHTML(); tr.outerHTML = trayHTML();
  const old = document.getElementById("csResult"); if(old) old.remove();
  const h = document.querySelector(".cs-hist"); if(h) h.outerHTML = historyHTML();
  paintSave(); }

/* ---------- dragging (pointer events: mouse, pen and touch) ---------- */
function slotAt(x, y, dur, grab){
  const cols = Array.from(document.querySelectorAll(".cs-col"));
  for(const c of cols){
    const r = c.getBoundingClientRect();
    if(x >= r.left && x <= r.right && y >= r.top - SH && y <= r.bottom + SH){
      let start = TOP + Math.round((y - grab - r.top) / SH) * C.STEP;
      start = Math.max(TOP, Math.min(BOTTOM - dur, start));
      return {day:+c.dataset.day, start, col:c, rect:r};
    }
  }
  return null;
}
function startDrag(ev, el){
  if(ev.button > 0) return;
  const id = el.dataset.req, r = scn().requests.find(x => x.id === id); if(!r) return;
  const rect = el.getBoundingClientRect(), fromGrid = el.classList.contains("cs-req");
  S.drag = {id, r, fromGrid, sx:ev.clientX, sy:ev.clientY, grab:fromGrid ? ev.clientY - rect.top : Math.min(12, r.dur / C.STEP * SH / 2), w:fromGrid ? rect.width : 200, moved:false, ghost:null, prev:null, pid:ev.pointerId};
  window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onCancel);
}
function onMove(ev){
  const d = S.drag; if(!d || ev.pointerId !== d.pid) return;
  if(!d.moved){ if(Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) < 5) return;
    d.moved = true; document.body.classList.add("cs-dragging");
    d.ghost = document.createElement("div"); d.ghost.className = "cs-ghost";
    d.ghost.style.cssText = `width:${d.w}px;height:${Math.max(d.r.dur / C.STEP * SH, 24)}px;`; d.ghost.innerHTML = `<b>${e(d.r.title)}</b>`;
    document.body.appendChild(d.ghost);
    d.prev = document.createElement("div"); d.prev.className = "cs-prev";
    const own = document.querySelector(`.cs-req[data-req="${d.id}"]`); if(own) own.classList.add("cs-lifted"); }
  ev.preventDefault();
  d.ghost.style.left = (ev.clientX - d.w / 2) + "px"; d.ghost.style.top = (ev.clientY - d.grab) + "px";
  const hit = slotAt(ev.clientX, ev.clientY, d.r.dur, d.grab);
  d.hit = hit;
  const tray = document.getElementById("csTray"), tr = tray && tray.getBoundingClientRect();
  d.overTray = !hit && tr && ev.clientX >= tr.left && ev.clientX <= tr.right && ev.clientY >= tr.top && ev.clientY <= tr.bottom;
  if(tray) tray.classList.toggle("cs-drop", !!d.overTray);
  if(hit){
    hit.col.appendChild(d.prev);
    const me = {id:d.id, day:hit.day, start:hit.start, end:hit.start + d.r.dur};
    const clash = C.eventsOf(scn(), S.place).some(o => o.id !== d.id && C.overlap(me, o, 0));
    d.prev.className = "cs-prev " + (clash ? "bad" : "ok");
    d.prev.style.cssText = `top:${px(hit.start)}px;height:${d.r.dur / C.STEP * SH}px;`;
    d.prev.textContent = hh(hit.start) + " – " + hh(hit.start + d.r.dur);
  }else if(d.prev.parentNode) d.prev.remove();
}
function endDrag(){
  const d = S.drag; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onCancel);
  document.body.classList.remove("cs-dragging"); S.drag = null;
  if(d && d.ghost) d.ghost.remove(); if(d && d.prev) d.prev.remove();
  const tray = document.getElementById("csTray"); if(tray) tray.classList.remove("cs-drop");
  return d;
}
function onUp(ev){
  const d = S.drag; if(!d || ev.pointerId !== d.pid) return;
  const moved = d.moved, hit = d.hit, overTray = d.overTray; endDrag();
  if(!moved){ if(d.fromGrid){ S.sel = d.id; repaint(); const el = document.querySelector(`.cs-req[data-req="${d.id}"]`); if(el) el.focus(); } return; }   // a click selects
  if(hit) setPlace(d.id, {day:hit.day, start:hit.start});
  else if(overTray && d.fromGrid) setPlace(d.id, null);
  S.sel = d.id; repaint();
}
function onCancel(){ endDrag(); repaint(); }
function wire(){
  const app = document.getElementById("app"); if(!app || app.dataset.csWired) return;
  app.dataset.csWired = "1";
  app.addEventListener("pointerdown", ev => {
    if(state.view !== "calsim" || !open()) return;
    const el = ev.target.closest("[data-req]"); if(el && app.contains(el)) startDrag(ev, el);
  });
  app.addEventListener("keydown", ev => {
    if(state.view !== "calsim") return;
    const el = ev.target.closest && ev.target.closest("[data-req]"); if(!el) return;
    const id = el.dataset.req, r = scn().requests.find(x => x.id === id), p = S.place[id]; if(!r) return;
    const key = ev.key; let next = null;
    if(!p && (key === "Enter" || key === " ")) next = {day:0, start:C.OPEN};
    else if(p && key === "ArrowUp") next = {day:p.day, start:Math.max(TOP, p.start - C.STEP)};
    else if(p && key === "ArrowDown") next = {day:p.day, start:Math.min(BOTTOM - r.dur, p.start + C.STEP)};
    else if(p && key === "ArrowLeft") next = {day:Math.max(0, p.day - 1), start:p.start};
    else if(p && key === "ArrowRight") next = {day:Math.min(4, p.day + 1), start:p.start};
    else if(p && (key === "Delete" || key === "Backspace")){ ev.preventDefault(); setPlace(id, null); repaint(); return; }
    if(!next) return;
    ev.preventDefault(); setPlace(id, next); S.sel = id; repaint();
    const again = document.querySelector(`.cs-req[data-req="${id}"]`); if(again) again.focus();
  });
}

/* ---------- actions ---------- */
function check(){
  const s = scn(), g = C.grade(s, S.place);
  if(!Object.keys(S.place).length){ toast("Drag at least one request onto the calendar first."); return; }
  S.result = g;
  if(S.data && isTrainee()){
    S.data.attempts.push({scn:s.id, at:new Date().toISOString(), place:Object.assign({}, S.place), score:g.score, max:g.max, pct:g.pct});
    if(S.data.attempts.length > 30) S.data.attempts = S.data.attempts.slice(-30);
    queueSave();
  }
  const gw = document.querySelector(".cs-main");
  const old = document.getElementById("csResult"); if(old) old.remove();
  const h = document.querySelector(".cs-hist"); if(h) h.outerHTML = historyHTML();
  document.querySelector(".cs-actions").insertAdjacentHTML("afterend", resultHTML());
  const el = document.getElementById("csResult"); if(el && el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"nearest"});
  toast(g.passed ? `Passed: ${g.pct}%` : `${g.pct}%. Fix what’s marked and try again.`);
}
window.FTCalSim = {
  check,
  reset(){ S.place = {}; S.result = null; S.sel = null; if(S.data){ S.data.drafts[scn().id] = {}; queueSave(); } repaint(); },
  pick(i){ S.scn = i; S.result = null; S.sel = null; S.place = C.clean(scn(), (S.data && S.data.drafts[scn().id]) || {}); render(); },
  open(){ goto("calsim"); }
};
// The card on the Simulators page (js/ft-simulators.js).
window.FTCalSimCard = function(){
  const unlocked = open(), b = S.data ? Math.max(...C.SCENARIOS.map(s => bestOf(s.id))) : -1;
  return `<section class="fts-group"><h2>📅 Calendar Scheduler</h2><p class="fts-sub">A drag-and-drop calendaring simulator for Lesson ${LESSON}. It grades your schedule and saves every attempt for your trainer.</p>
    <div class="fts-grid"><div class="card fts-card ${unlocked ? "" : "fts-locked"}"><div class="fts-kicker">Calendaring &amp; Appointment Setting Training${unlocked ? "" : " · opens with this lesson"}</div>
      <h3>Drag &amp; Drop Schedule</h3><p class="fts-note">Put a week of requests on the attorney’s calendar: respect the hearings, travel time, lunch and each client’s limits. Two weeks to practice, graded out of 100 (80% passes).${b >= 0 ? ` Your best so far: <b>${b}%</b>.` : ""}</p>
      <div class="fts-tool-act">${unlocked ? `<button class="btn btn-navy" onclick="FTCalSim.open()">📅 Open the scheduler</button>` : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div></div></section>`;
};

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

/* ---------- admin: every trainee's scores ---------- */
const A = {rows:null, loading:false, open:{}, closed:{}};
async function loadAdmin(){
  A.loading = true;
  try{
    const keys = (await sharedList("calsim:")) || [], ids = keys.map(k => String(k).replace(/^calsim:/, ""));
    const people = await sharedGetMany(ids.map(id => "trainee:" + id));
    const rows = ids.map((id, i) => { const r = people[i]; return {id, name:(r && r.name) || id, batch:(r && r.batch) || "", archived:!!(r && r.archived)}; }).filter(x => !x.archived);
    const recs = await ftGetMany(rows.map(x => "calsim:" + x.id));
    rows.forEach((x, i) => { x.d = recs[i] || blank(); x.d.attempts = x.d.attempts || []; x.d.external = x.d.external || []; });
    A.rows = rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }catch(err){ A.rows = []; }
  A.loading = false;
  if(state.view === "admin" && state.adminTab === "calscores") render();
}
function renderAdminScores(){
  if(!A.rows && !A.loading) loadAdmin();
  if(!A.rows) return `<div class="card" style="padding:24px;">Loading the calendar scores…</div>`;
  const groups = {}; A.rows.forEach(x => { (groups[x.batch] = groups[x.batch] || []).push(x); });
  const keys = Object.keys(groups).sort((a, b) => (a === "") - (b === "") || b.localeCompare(a, undefined, {numeric:true}));
  const best = (x, id) => x.d.attempts.filter(a => a.scn === id).reduce((m, a) => Math.max(m, regrade(a).pct), -1);
  return `<div class="card cs-admin"><h3>📅 Calendar Scores</h3>
    <p class="cs-hint">Each trainee’s Calendar Scheduler attempts. Scores are worked out again from the saved calendar, not read from a saved number. Scores from the Portal’s Calendaring Simulator are saved on the Portal under program FT; any result it posts back shows here too.</p>
    ${A.rows.length ? keys.map(b => `<section class="fp-batch"><div class="fp-batch-hd" onclick="FTCalAdmin.batch(${e(JSON.stringify(b))})">${A.closed[b] ? "▸" : "▾"} <b>📁 ${e(b ? "Batch " + b : "No batch set")}</b> <span class="fp-muted">${groups[b].length} trainee${groups[b].length === 1 ? "" : "s"}</span></div>
      ${A.closed[b] ? "" : groups[b].map(x => `<div class="fp-arow"><div class="fp-arow-hd" onclick="FTCalAdmin.row('${e(x.id)}')">${A.open[x.id] ? "▾" : "▸"} <b>${e(x.name)}</b>
        ${C.SCENARIOS.map(s => { const v = best(x, s.id); return `<span class="cs-pill ${v >= C.PASS ? "ok" : ""}">${e(s.title.split(" · ")[0])}: ${v < 0 ? "not tried" : v + "%"}</span>`; }).join("")}
        <span class="fp-muted">${x.d.attempts.length} attempt${x.d.attempts.length === 1 ? "" : "s"}</span></div>
        ${A.open[x.id] ? attemptsHTML(x) : ""}</div>`).join("")}</section>`).join("")
      : `<div class="fp-muted" style="margin:14px 0;">No trainee has tried the Calendar Scheduler yet.</div>`}
    <div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="FTCalAdmin.refresh()">Refresh</button></div></div>`;
}
function attemptsHTML(x){
  const rows = x.d.attempts.slice().reverse().map(a => {
    const s = C.SCENARIOS.find(z => z.id === a.scn); if(!s) return "";
    const g = C.grade(s, C.clean(s, a.place));
    return `<details class="cs-att"><summary>${e(new Date(a.at).toLocaleString())} · ${e(s.title)} · <b>${g.pct}%</b> ${g.passed ? "✅" : ""}</summary>
      ${g.items.map(i => `<div class="cs-item ${i.perfect ? "ok" : "bad"}"><div class="cs-item-hd">${i.perfect ? "✓" : "✗"} ${e(i.title)} <span>${i.pts} / ${i.weight}</span></div>${i.perfect ? "" : `<ul>${i.checks.filter(c => !c.ok).map(c => `<li>${e(c.why)}</li>`).join("")}</ul>`}</div>`).join("")}</details>`;
  }).join("");
  const ext = x.d.external.slice().reverse().map(z => `<div class="cs-att-ext">🔗 ${e(new Date(z.at).toLocaleString())} · ${e(z.title)} · <b>${Math.round(z.score)}/${Math.round(z.max)}</b></div>`).join("");
  return `<div class="cs-atts">${rows || '<div class="fp-muted">No attempts.</div>'}${ext}</div>`;
}
window.FTCalAdmin = {
  row(id){ A.open[id] = !A.open[id]; render(); },
  batch(b){ A.closed[b] = !A.closed[b]; render(); },
  refresh(){ A.rows = null; render(); }
};

/* ---------- wiring into the engine ---------- */
const __render = window.render;
window.render = function(){
  if(state.view !== "calsim") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-calsim">${renderPage()}</main>` + renderFooter();
  wire(); paintSave();
  try{ afterRender(); }catch(err){}
  if(!S.data && !S.loading) load();
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
.cs-tray{background:var(--card,#fff);border:2px dashed var(--line,#d1d5db);border-radius:14px;padding:12px;position:sticky;top:8px;max-height:calc(100vh - 16px);overflow:auto;transition:border-color .12s,background .12s;}
.cs-tray.cs-drop{border-color:#f97316;background:#fff7ed;} .cs-tray h3{margin:0 0 4px;font-size:15px;color:var(--navy);} .cs-count{font-size:12px;font-weight:700;color:var(--orange-deep);margin-left:4px;}
.cs-hint{margin:0 0 10px;font-size:12.5px;color:var(--ink-soft);}
.cs-card{background:#fff;border:1px solid var(--line,#e5e7eb);border-left:4px solid #f97316;border-radius:10px;padding:9px 11px;margin-bottom:8px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:0 1px 2px rgba(0,0,0,.05);}
.cs-card:focus-visible,.cs-req:focus-visible{outline:3px solid #fdba74;outline-offset:1px;} .cs-card b{font-size:13.5px;color:var(--navy);line-height:1.25;display:block;}
.cs-card p{margin:4px 0 0;font-size:12px;color:var(--ink-soft);line-height:1.35;} .cs-dur{display:inline-block;margin-top:3px;font-size:11px;font-weight:800;background:#ffedd5;color:#9a3412;border-radius:999px;padding:1px 8px;}
.cs-empty{padding:14px 6px;font-size:13px;color:var(--ink-soft);text-align:center;}
.cs-gridwrap{background:var(--card,#fff);border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:8px;overflow-x:auto;}
.cs-grid{display:grid;grid-template-columns:54px repeat(5,minmax(112px,1fr));min-width:660px;}
.cs-dayhd{height:28px;line-height:28px;text-align:center;font-weight:800;font-size:13px;color:var(--navy);}
.cs-timecol{position:relative;} .cs-time{position:absolute;right:6px;font-size:10.5px;color:var(--ink-soft);}
.cs-col{position:relative;border-left:1px solid var(--line,#e5e7eb);background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${SH * 2 - 1}px,#e5e7eb ${SH * 2 - 1}px,#e5e7eb ${SH * 2}px),repeating-linear-gradient(to bottom,transparent 0,transparent ${SH - 1}px,#f1f5f9 ${SH - 1}px,#f1f5f9 ${SH}px);}
.cs-col::before,.cs-col::after{content:"";position:absolute;left:0;right:0;background:rgba(100,116,139,.12);pointer-events:none;} .cs-col::before{top:0;height:${SH * 2}px;} .cs-col::after{top:${px(17 * 60)}px;bottom:0;}
.cs-ev{position:absolute;left:3px;right:3px;border-radius:7px;padding:2px 6px;overflow:hidden;font-size:11.5px;line-height:1.2;box-sizing:border-box;z-index:2;}
.cs-ev b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;} .cs-ev span{display:block;font-size:10.5px;opacity:.85;white-space:nowrap;}
.cs-fixed{background:#e2e8f0;color:#334155;border:1px solid #cbd5e1;} .cs-court{background:#1e3a8a;color:#fff;border-color:#1e3a8a;}
.cs-lunch{background:repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 6px,#e2e8f0 6px,#e2e8f0 12px);color:#64748b;}
.cs-buf{position:absolute;left:3px;right:3px;background:repeating-linear-gradient(135deg,rgba(30,58,138,.14),rgba(30,58,138,.14) 4px,transparent 4px,transparent 8px);border-radius:6px;z-index:1;pointer-events:none;}
.cs-req{background:#fb923c;color:#1f2937;border:1px solid #ea580c;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;z-index:3;box-shadow:0 1px 3px rgba(0,0,0,.2);}
.cs-req.cs-sel{box-shadow:0 0 0 2px var(--navy);} .cs-req.cs-bad{background:#fecaca;border-color:#dc2626;} .cs-req.cs-lifted{opacity:.35;}
.cs-prev{position:absolute;left:3px;right:3px;border-radius:7px;z-index:5;pointer-events:none;font-size:10.5px;font-weight:700;padding:2px 6px;box-sizing:border-box;}
.cs-prev.ok{background:rgba(34,197,94,.3);border:2px solid #16a34a;color:#14532d;} .cs-prev.bad{background:rgba(239,68,68,.28);border:2px solid #dc2626;color:#7f1d1d;}
.cs-ghost{position:fixed;z-index:9500;pointer-events:none;background:#f97316;color:#111827;border-radius:8px;padding:4px 8px;font-size:12px;box-shadow:0 8px 20px rgba(0,0,0,.3);opacity:.92;overflow:hidden;box-sizing:border-box;}
body.cs-dragging,body.cs-dragging *{cursor:grabbing!important;user-select:none!important;-webkit-user-select:none!important;}
.cs-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0;} .cs-save{font-size:12.5px;color:var(--ink-soft);}
.cs-result{padding:16px 18px;margin-bottom:14px;border-left:6px solid #f97316;} .cs-result.ok{border-left-color:#16a34a;}
.cs-score{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px;} .cs-score b{font-size:34px;color:var(--navy);} .cs-score span{font-weight:700;color:var(--ink-soft);}
.cs-item{border-top:1px solid var(--line,#e5e7eb);padding:8px 0;font-size:13.5px;} .cs-item-hd{display:flex;gap:6px;align-items:baseline;} .cs-item-hd span{margin-left:auto;font-weight:700;color:var(--ink-soft);white-space:nowrap;}
.cs-item.ok .cs-item-hd{color:#166534;} .cs-item.bad .cs-item-hd{color:#991b1b;} .cs-item ul{margin:4px 0 0 22px;padding:0;color:#7f1d1d;font-size:13px;}
.cs-hist{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;} .cs-pill{display:inline-block;background:#eef2ff;color:#1e3a8a;border-radius:999px;padding:3px 11px;font-size:12px;font-weight:700;margin:0 4px 0 6px;} .cs-hist .cs-pill{margin:0;} .cs-pill.ok{background:#dcfce7;color:#166534;}
.cs-more{padding:14px 18px;} .cs-more p{margin:4px 0 10px;font-size:13.5px;color:var(--ink-soft);} .cs-more a{text-decoration:none;}
.cs-admin{padding:16px 18px;} .cs-atts{margin:6px 0 10px 18px;} .cs-att{margin:4px 0;font-size:13px;} .cs-att summary{cursor:pointer;} .cs-att-ext{font-size:13px;margin:4px 0;}
@media (max-width:820px){ .cs-main{grid-template-columns:1fr;} .cs-tray{position:static;max-height:none;} }
`; document.head.appendChild(st); })();
})();
