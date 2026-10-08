/* ============================================================
   The LSH program layout: the main setup for every LSH program. The same file in every LSH course repo
   (Foundational-Training, EA-PA-TRAINING, Case-Management-Training, medsumanddemandtraining,
   propertydamageclaimstraining); change it in all of them. A program is organised in five sections, and the
   top bar shows exactly those five:

     🏠 Main Portal            the program's home (the dashboard): the hub for every part of the training
     📚 Training Modules       #/modules: the lessons, and the program's training pages (Process Questions,
                               Task Tracker…), which share a bar of tabs under the top bar
     🛠 Practice Lab           the Practice Lab Sessions, connected with the simulators (#/simulators)
     🏅 Scorecard              #/scorecard: the trainee's grades, collected from every grading system on the
                               platform; admins get Admin → 🏅 Scorecards, every trainee's in one table
     🛡 Admin Master Control   the Admin screen (admins only, never in 👁 Trainee view)

   The other buttons (Blueprint, Training Directory, 👁 Trainee view, ⧉, ⛶) stay at the end of the top bar.
   What sits in each section is the program's own: it sets window.LSH_PROGRAM before this file loads
   (js/ft-program.js here):
     { modules: [{view | run, icon, label, about, who?: "trainee" | "admin", badge?()}], moduleViews: [...],
       labViews: [...], pinned?(): [lessons shown first], shared: ["public key", …],
       sources: [{id, icon, label, about, key?, items(ctx)}] }
   A scorecard source with a key (e.g. "callsim:") has the trainee's record key + id read for it; items(ctx) gets
   ctx = {id, progress, rec: {<key>: that record}, shared: {<public key>: record}} and returns
   [{name, pct: 0–100 (null when not graded yet), note}]. A source's score is the average of its graded items;
   the overall score is the average of the sources that have a score, so each grading system counts the same.
   A trainee's records come in one get-many when the Scorecard opens (again after a minute, or coming back to the
   tab after two); the admin tab reads every trainee's with get-many (up to 100 keys a request).
   Loaded last, after js/lsh-dashboard.js and the card files.
   ============================================================ */
(function(){
if(typeof window.renderTopbar !== "function" || window.lshProgram) return;
const CFG = Object.assign({modules:[], moduleViews:[], labViews:["simulators"], pinned:() => [], shared:[], sources:[]}, window.LSH_PROGRAM || {});
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview;
const lessons = () => DAYS.filter(d => d && d.sections && d.sections.length);
const doneIn = p => lessons().filter(d => p && p[d.id] && p[d.id].done).length;
const tier = pct => pct == null ? "none" : pct >= 85 ? "top" : pct >= 70 ? "ok" : "low";
const pctTxt = pct => pct == null ? "—" : Math.round(pct) + "%";
const badgeOf = m => { try{ return m.badge ? Number(m.badge()) || 0 : 0; }catch(err){ return 0; } };
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["modules", "scorecard"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {modules:"Training Modules", scorecard:"Scorecard"});

/* ---------- the five sections ---------- */
// The Training Modules pages this viewer has (an admin's own pages, or a trainee's; 👁 Trainee view sees the trainee's).
const pages = () => CFG.modules.filter(m => !m.who || m.who === (adminOn() ? "admin" : "trainee"));
const moduleViews = () => ["modules"].concat(CFG.moduleViews, pages().map(m => m.view).filter(Boolean));
function section(){
  const v = state.view;
  if(v === "scorecard" || (v === "admin" && state.adminTab === "scorecards")) return "scorecard";
  if(v === "admin") return "admin";
  if(CFG.labViews.includes(v)) return "lab";
  if(moduleViews().includes(v)) return "modules";
  return v === "dashboard" ? "home" : "";
}
// The bar of tabs under the top bar on the Training Modules pages (not on a lesson or a Knowledge Check). It has no
// Lessons tab: 📚 Training Modules on the top bar opens the lessons.
function tabs(){
  const cur = state.view;
  const tab = (on, label, onclick, badge) => `<button type="button" class="lp-tab${on ? " active" : ""}" onclick="${onclick}">${label}${badge ? `<span class="nav-badge">${badge}</span>` : ""}</button>`;
  return `<div class="lp-tabs" role="navigation" aria-label="Training Modules"><div class="lp-tabs-inner"><span class="lp-tabs-h">📚 Training Modules</span>
    ${pages().map(m => tab(m.view && cur === m.view, `${m.icon} ${e(m.label)}`, m.view ? `goto('${m.view}')` : m.run, badgeOf(m))).join("")}</div></div>`;
}
const __top = window.renderTopbar;
window.renderTopbar = function(){
  const html = __top.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  const bar = t.content.querySelector(".topbar"), nav = t.content.querySelector(".topbar .nav");
  if(!bar || !nav) return html;
  const sec = section(), onc = b => b.getAttribute("onclick") || "";
  const viewOf = b => (onc(b).match(/^goto\('([a-z]+)'\)$/) || [])[1];
  // the training pages' own buttons move under Training Modules, and the simulators' under Practice Lab
  const moved = new Set(CFG.modules.map(m => m.view).filter(Boolean).concat(CFG.labViews)), runs = new Set(CFG.modules.map(m => m.run).filter(Boolean));
  [...nav.children].forEach(b => { const v = viewOf(b); if((v && moved.has(v)) || runs.has(onc(b))) b.remove(); });
  const badge = pages().reduce((n, m) => n + badgeOf(m), 0);
  const btn = (id, label, onclick, n) => `<button type="button" class="lp-sec${sec === id ? " active" : ""}" onclick="${onclick}">${label}${n ? `<span class="nav-badge">${n}</span>` : ""}</button>`;
  const secs = btn("modules", `📚 <span class="lp-long">Training </span>Modules`, "goto('modules')", badge) + btn("lab", "🛠 Practice Lab", "goto('simulators')") + btn("scorecard", "🏅 Scorecard", "lshProgram.scorecard()");
  const home = [...nav.children].find(b => viewOf(b) === "dashboard");
  if(home){ home.textContent = "🏠 Main Portal"; home.classList.add("lp-sec"); home.classList.toggle("active", sec === "home"); home.insertAdjacentHTML("afterend", secs); }
  else nav.insertAdjacentHTML("afterbegin", secs);
  const adm = [...nav.children].find(b => onc(b) === "openAdmin()");
  if(adm){ adm.innerHTML = `🛡 Admin<span class="lp-long"> Master Control</span>`; adm.title = "Admin Master Control"; adm.classList.add("lp-sec"); adm.classList.toggle("active", sec === "admin"); }
  if(sec === "modules" && !CFG.moduleViews.includes(state.view)) bar.insertAdjacentHTML("beforeend", tabs());
  return t.innerHTML;
};
// "🏠 Main Portal" is this program's home now, so the admins' link to the LSH Training Portal (js/portal-link.js)
// reads like the trainees': ← Training Directory.
let relabelQueued = false;
function relabel(){
  relabelQueued = false;
  document.querySelectorAll(".topbar .nav .nav-portal").forEach(b => { if(b.textContent === "🏠 Main Portal") b.textContent = "← Training Directory"; });
  document.querySelectorAll("a.admin-portal-link").forEach(a => { if(a.textContent === "← Back to Main Portal") a.textContent = "← Back to Training Directory"; });
}
new MutationObserver(() => { if(!relabelQueued){ relabelQueued = true; requestAnimationFrame(relabel); } }).observe(document.body, {childList:true, subtree:true});

/* ---------- 📚 Training Modules (#/modules): the lessons, then the training pages ---------- */
function lessonRow(d, i, pinned){
  const p = (state.progress || {})[d.id] || {}, open = dayUnlocked(d.id) && d.sections && d.sections.length, done = !!p.done;
  const status = done ? `<span class="lp-pill ok">✓ Finished</span>` : !(d.sections && d.sections.length) ? `<span class="lp-pill">Coming soon</span>` : open ? `<span class="lp-pill open">Open</span>` : `<span class="lp-pill">🔒 Locked</span>`;
  const kc = typeof p.score === "number" ? `<span class="lp-kc t-${tier(p.score)}">✍️ Knowledge Check ${p.score}%</span>` : "";
  const can = open || (adminOn() && d.sections && d.sections.length);
  return `<div class="lp-lesson${done ? " is-done" : ""}">
    <span class="lp-num">${pinned ? "📌" : i + 1}</span>
    <div class="lp-lesson-t"><b>${e(d.title)}</b><span>${pinned ? "Start here · not counted as a lesson" : `${d.sections.length} slide${d.sections.length === 1 ? "" : "s"}`}${kc ? " · " : ""}${kc}</span></div>
    ${status}
    <button class="btn btn-sm ${done ? "btn-ghost" : "btn-navy"}" ${can ? "" : "disabled"} onclick="goto('day',${d.id})">${done ? "Review" : "Start"}</button>
  </div>`;
}
function renderModules(){
  const all = lessons(), done = doneIn(state.progress), pinned = (CFG.pinned() || []).filter(Boolean);
  const viewer = isTrainee() || !!state.adminPreview, ps = pages();
  return `<div class="lp-head"><p class="lp-eyebrow">🏠 Main Portal · Training Modules</p><h1>📚 Training Modules</h1>
      <p>The ${all.length} lessons of this training, in order, and the pages you work in alongside them.</p>
      ${viewer ? `<div class="lp-progress"><div class="lp-bar"><i style="width:${all.length ? Math.round(done / all.length * 100) : 0}%"></i></div><span><b>${done} / ${all.length}</b> lessons finished</span></div>`
        : `<p class="lp-note">Trainees see the lessons open for their batch: open them in 🛡 Admin Master Control → 📅 Open Lessons.</p>`}</div>
    <section class="card lp-lessons"><h2>📖 Lessons</h2>${pinned.map(d => lessonRow(d, 0, true)).join("")}${all.map((d, i) => lessonRow(d, i, false)).join("")}</section>
    ${ps.length ? `<section class="lp-pages"><h2>🧰 Training pages</h2><div class="lp-grid">${ps.map(m => { const go = m.view ? `goto('${m.view}')` : m.run, n = badgeOf(m);
      return `<div class="card lp-page" role="link" tabindex="0" onclick="${go}" onkeydown="if(event.key==='Enter'){${go}}"><div class="lp-page-h"><span class="lp-ic">${m.icon}</span><b>${e(m.label)}</b>${n ? `<span class="nav-badge">${n}</span>` : ""}</div><p>${e(m.about || "")}</p><span class="lp-go">Open →</span></div>`; }).join("")}</div></section>` : ""}`;
}

/* ---------- 🏅 the Scorecard: every grading system's items, its average, and the overall ---------- */
function compute(ctx){
  const rows = CFG.sources.map(s => {
    let items = [];
    try{ items = (s.items(ctx) || []).filter(Boolean); }catch(err){ items = []; }
    const g = items.filter(x => typeof x.pct === "number" && isFinite(x.pct));
    return {s, items, graded:g.length, avg:g.length ? Math.round(g.reduce((n, x) => n + x.pct, 0) / g.length) : null};
  });
  const have = rows.filter(r => r.avg != null);
  return {rows, overall:have.length ? Math.round(have.reduce((n, r) => n + r.avg, 0) / have.length) : null,
    graded:have.reduce((n, r) => n + r.graded, 0), systems:have.length, done:doneIn(ctx.progress), total:lessons().length};
}
const keyed = () => CFG.sources.filter(s => s.key);
// the trainee's own records
const SC = {id:null, rec:{}, shared:{}, sharedIn:false, at:0, loading:null};
function loadMine(force){
  if(!isTrainee() || SC.loading) return SC.loading;
  if(!force && SC.id === state.traineeId && Date.now() - SC.at < 120000) return null;
  const id = state.traineeId, mine = keyed().map(s => s.key + id), pub = SC.sharedIn ? [] : CFG.shared.slice();
  SC.at = Date.now();
  SC.loading = sharedGetMany(mine.concat(pub)).then(vals => {
    if(state.traineeId !== id) return;
    SC.id = id; SC.rec = {};
    keyed().forEach((s, i) => { SC.rec[s.key] = vals[i] || null; });
    pub.forEach((k, i) => { SC.shared[k] = vals[mine.length + i] || null; });
    if(pub.length) SC.sharedIn = true;
  }).catch(() => {}).then(() => { SC.loading = null; if(state.view === "scorecard") render(); });
  return SC.loading;
}
const mineCtx = () => ({id:state.traineeId, progress:state.progress || {}, rec:SC.id === state.traineeId ? SC.rec : {}, shared:SC.shared});
window.addEventListener("focus", () => { if(isTrainee() && SC.id && state.view === "scorecard") loadMine(); });
function detail(sc){
  return `<div class="sc-grid">${sc.rows.map(r => `<div class="card sc-src">
      <div class="sc-src-h"><span class="sc-src-ic">${r.s.icon}</span><b>${e(r.s.label)}</b><span class="sc-pill t-${tier(r.avg)}">${pctTxt(r.avg)}</span></div>
      ${r.s.about ? `<p class="sc-about">${e(r.s.about)}</p>` : ""}
      ${r.items.length ? `<table class="sc-tbl"><tbody>${r.items.map(x => `<tr><td>${e(x.name)}${x.note ? `<span>${e(x.note)}</span>` : ""}</td><td class="sc-n t-${tier(x.pct)}">${pctTxt(x.pct)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="sc-empty">Nothing graded here yet.</p>`}
    </div>`).join("")}</div>`;
}
function ring(pct){
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return `<div class="sc-ring t-${tier(pct)}" style="--p:${p}"><span>${pctTxt(pct)}</span><small>overall</small></div>`;
}
const HOW = "Each grading system’s score is the average of its graded items; the overall score is the average of the grading systems that have a score, so each one counts the same.";
function renderScorecard(){
  const sc = compute(mineCtx()), loaded = !isTrainee() || SC.id === state.traineeId;
  return `<div class="card sc-hero">
      ${ring(loaded ? sc.overall : null)}
      <div class="sc-hero-t"><p class="lp-eyebrow">🏠 Main Portal · Scorecard</p><h1>🏅 My Scorecard</h1>
        <p>Every grade the platform gives you, collected from all of its grading systems: ${CFG.sources.map(s => e(s.label)).join(", ")}.</p>
        <div class="sc-facts"><span><b>${sc.done} / ${sc.total}</b> lessons finished</span><span><b>${sc.graded}</b> graded item${sc.graded === 1 ? "" : "s"}</span><span><b>${sc.systems} / ${CFG.sources.length}</b> grading systems with a score</span></div></div>
      <div class="sc-hero-acts"><button class="btn btn-ghost btn-sm" onclick="window.print()">🖨 Print</button></div>
    </div>
    ${loaded ? detail(sc) : `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Collecting your grades…</div>`}
    <p class="sc-how">${HOW}</p>`;
}

/* ---------- the pages ---------- */
const __render = window.render;
window.render = function(){
  const v = state.view;
  if(v !== "scorecard" && v !== "modules") return __render.apply(this, arguments);
  if(v === "scorecard" && adminOn()){ state.adminTab = "scorecards"; state.view = "admin"; return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + (v === "modules" ? `<main class="main-lp">${renderModules()}</main>` : `<main class="main-lp">${renderScorecard()}</main>`) + renderFooter();
  try{ afterRender(); }catch(err){}
  if(v === "scorecard" && isTrainee()) loadMine(SC.id !== state.traineeId || Date.now() - SC.at > 60000);
};

/* ---------- 🛡 Admin Master Control → 🏅 Scorecards: every trainee's, in one table ---------- */
const AS = {rows:null, loading:false, fresh:false, batch:"", open:{}};
async function loadAdmin(){
  AS.loading = true;
  try{
    if(AS.fresh && typeof loadAdminLedgerQuiet === "function"){ AS.fresh = false; await loadAdminLedgerQuiet(); }   // ↻ Refresh: the trainees again too
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const ks = keyed(), want = [];
    people.forEach(r => ks.forEach(s => want.push(s.key + r.id)));
    const vals = await sharedGetMany(want.concat(CFG.shared)), shared = {};
    CFG.shared.forEach((k, i) => { shared[k] = vals[want.length + i] || null; });
    AS.rows = people.map((r, i) => {
      const rec = {}; ks.forEach((s, j) => { rec[s.key] = vals[i * ks.length + j] || null; });
      return {id:r.id, name:r.name || r.id, batch:r.batch || "", sc:compute({id:r.id, progress:r.dayProgress || {}, rec, shared})};
    }).sort((a, b) => (a.batch || "").localeCompare(b.batch || "") || (a.name || "").localeCompare(b.name || ""));
  }catch(err){ AS.rows = []; }
  AS.loading = false;
  if(state.view === "admin" && state.adminTab === "scorecards") render();
}
function renderAdminScores(){
  if(!AS.rows){ if(!AS.loading) loadAdmin(); return `<div class="card" style="padding:28px;text-align:center;color:var(--ink-soft);">Collecting every trainee’s grades…</div>`; }
  const batches = [...new Set(AS.rows.map(r => r.batch).filter(Boolean))].sort();
  const rows = AS.rows.filter(r => !AS.batch || r.batch === AS.batch);
  const cell = pct => `<td class="sc-n t-${tier(pct)}">${pctTxt(pct)}</td>`;
  return `<div class="card sc-admin">
    <div class="sc-admin-bar"><div><h2>🏅 Scorecards</h2><p class="sc-about">Each trainee’s grades, collected from all of the platform’s grading systems. Click a trainee for the details.</p></div>
      <span><select onchange="lshProgram.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AS.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="lshProgram.refresh()">↻ Refresh</button></span></div>
    ${rows.length ? `<div class="sc-scroll"><table class="sc-tbl sc-admin-tbl"><thead><tr><th>Trainee</th><th>Batch</th><th>Lessons</th>${CFG.sources.map(s => `<th>${s.icon} ${e(s.label)}</th>`).join("")}<th>Overall</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="sc-row" onclick="lshProgram.toggle('${e(r.id)}')"><td><b>${e(r.name)}</b></td><td>${e(r.batch)}</td><td>${r.sc.done} / ${r.sc.total}</td>${r.sc.rows.map(x => cell(x.avg)).join("")}${cell(r.sc.overall)}</tr>
        ${AS.open[r.id] ? `<tr class="sc-open"><td colspan="${CFG.sources.length + 4}">${detail(r.sc)}</td></tr>` : ""}`).join("")}
    </tbody></table></div>` : `<p class="sc-empty">No approved trainees${AS.batch ? " in this batch" : ""} yet.</p>`}
    <p class="sc-how">${HOW}</p></div>`;
}
// The Admin screen's tabs, grouped in the same sections: a row of sections, then the open section's tabs (one row each,
// scrolling sideways on a phone) instead of every tab in one long bar. A tab not in LSH_PROGRAM.adminGroups goes to
// Admin Master Control, so a new tab is never lost.
const GROUPS = [
  {id:"admin", label:"🛡 Admin Master Control"}, {id:"modules", label:"📚 Training Modules"},
  {id:"lab", label:"🛠 Practice Lab"}, {id:"scorecard", label:"🏅 Scorecard"}
];
const groupOf = tab => { const g = CFG.adminGroups || {}; return Object.keys(g).find(k => (g[k] || []).includes(tab)) || "admin"; };
function groupTabs(out){
  const a = out.indexOf('<div class="admin-tabs"'); if(a < 0) return out;
  const b = out.indexOf("</div>", a) + 6;
  const t = document.createElement("template"); t.innerHTML = out.slice(a, b);
  const tabs = [...t.content.querySelectorAll(".admin-tab-btn")].map(x => ({id:((x.getAttribute("onclick") || "").match(/setAdminTab\('([^']+)'\)/) || [])[1], html:x.outerHTML})).filter(x => x.id);
  if(!tabs.length) return out;
  const cur = groupOf(state.adminTab || "audit");
  const secs = GROUPS.map(g => ({g, tabs:tabs.filter(x => groupOf(x.id) === g.id)})).filter(x => x.tabs.length);
  const bar = `<div class="admin-tabs lp-admin-tabs"><div class="lp-admin-secs">${secs.map(x => `<button type="button" class="lp-admin-sec${x.g.id === cur ? " active" : ""}" onclick="setAdminTab('${x.tabs[0].id}')">${x.g.label}<span>${x.tabs.length}</span></button>`).join("")}</div>
    <div class="lp-admin-row">${(secs.find(x => x.g.id === cur) || secs[0]).tabs.map(x => x.html).join("")}</div></div>`;
  return out.slice(0, a) + bar + out.slice(b);
}
const __admin = window.renderAdmin;
window.renderAdmin = function(){
  const tab = `<button class="admin-tab-btn ${state.adminTab === "scorecards" ? "active" : ""}" onclick="setAdminTab('scorecards')">🏅 Scorecards</button>`;
  if(state.isAdmin && state.adminTab === "scorecards"){
    state.adminTab = "opendays";                   // borrow the tab bar…
    const out = __admin.apply(this, arguments);
    state.adminTab = "scorecards";
    const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
    return groupTabs(out.slice(0, end).replace(/admin-tab-btn active/g, "admin-tab-btn") + tab + "</div>" + renderAdminScores());
  }
  const out = __admin.apply(this, arguments);
  const end = out.indexOf("</div>", out.indexOf("admin-tabs"));
  return groupTabs(end > 0 ? out.slice(0, end) + tab + out.slice(end) : out);
};

window.lshProgram = {
  compute, section, mine:() => compute(mineCtx()),
  scorecard(){ if(adminOn()){ state.adminTab = "scorecards"; goto("admin"); } else goto("scorecard"); },
  batch(b){ AS.batch = b; render(); },
  refresh(){ AS.rows = null; AS.fresh = true; render(); },
  toggle(id){ AS.open[id] = !AS.open[id]; render(); }
};

const st = document.createElement("style"); st.id = "lsh-program"; st.textContent = `
/* the five sections in the top bar; on a narrower screen the long names shorten (Modules, Admin) so it stays one row */
.topbar .nav button.lp-sec{font-weight:700;}
@media(min-width:961px) and (max-width:1400px){ .topbar .nav .lp-long{display:none;} }
/* the Training Modules pages' bar of tabs: a second row of the (sticky) top bar */
.lp-tabs{background:#F7F8FB;border-top:1px solid rgba(255,255,255,.12);box-shadow:inset 0 1px 0 #E3E6EE;}
.lp-tabs-inner{max-width:1400px;margin:0 auto;padding:6px 20px;display:flex;gap:6px;align-items:center;overflow-x:auto;scrollbar-width:thin;}
.lp-tabs-h{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--orange-deep);white-space:nowrap;margin-right:6px;}
.lp-tab{font:inherit;font-size:13px;font-weight:600;white-space:nowrap;border:1px solid transparent;background:none;color:#4A5070;border-radius:999px;padding:5px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
.lp-tab:hover{background:#ECEEF5;color:var(--navy);} .lp-tab.active{background:var(--navy);color:#fff;}
/* the Admin screen's tabs, grouped: the sections, then the open section's tabs */
.admin-tabs.lp-admin-tabs{display:block !important;border-bottom:1px solid var(--line);margin-bottom:20px;white-space:normal;overflow:visible;}
.lp-admin-secs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
.lp-admin-sec{font:inherit;font-size:13.5px;font-weight:700;border:1px solid #DDE1EC;background:#fff;color:var(--navy);border-radius:999px;padding:6px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;}
.lp-admin-sec span{font-size:11px;font-weight:800;background:#ECEEF5;color:#4A5070;border-radius:999px;padding:1px 7px;}
.lp-admin-sec:hover{border-color:#353B57;} .lp-admin-sec.active{background:var(--navy);border-color:var(--navy);color:#fff;} .lp-admin-sec.active span{background:rgba(255,255,255,.2);color:#fff;}
.lp-admin-row{display:flex;gap:8px;flex-wrap:wrap;}
@media(max-width:760px){
  /* a phone: the four sections in a 2 × 2 grid, the open section's tabs as buttons that wrap, so all of them show */
  .lp-admin-secs{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
  .lp-admin-sec{font-size:12.5px;padding:7px 8px;justify-content:center;white-space:normal;text-align:center;line-height:1.2;}
  .lp-admin-row{gap:6px;padding:4px 0 10px;}
  .lp-admin-row .admin-tab-btn{font-size:13px;padding:6px 11px;border:1px solid #DDE1EC !important;border-radius:999px;background:#fff;}
  .lp-admin-row .admin-tab-btn.active{background:#FFF3E6;border-color:var(--orange) !important;color:var(--navy);}
}
/* the Training Modules and Scorecard pages */
main.main-lp{max-width:1180px;margin:0 auto;padding:24px 16px 40px;}
.lp-head{margin-bottom:18px;} .lp-head h1{margin:0 0 6px;color:var(--navy);font-size:28px;} .lp-head > p{margin:0;color:var(--ink-soft);font-size:15px;}
.lp-eyebrow{font-size:11px !important;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--orange-deep) !important;margin:0 0 4px !important;}
.lp-note{margin-top:8px !important;font-size:13.5px !important;}
.lp-progress{display:flex;align-items:center;gap:12px;margin-top:12px;max-width:520px;} .lp-progress span{font-size:13px;color:#4A5070;white-space:nowrap;} .lp-progress b{color:var(--navy);}
.lp-bar{flex:1;height:8px;border-radius:99px;background:#ECEEF5;overflow:hidden;} .lp-bar i{display:block;height:100%;background:linear-gradient(90deg,#E3A35F,#C9782E);border-radius:99px;}
.lp-lessons{padding:16px 18px;margin-bottom:22px;} .lp-lessons h2, .lp-pages h2{margin:0 0 10px;color:var(--navy);font-size:20px;}
.lp-lesson{display:flex;align-items:center;gap:14px;padding:10px 4px;border-top:1px solid #ECEEF4;}
.lp-lesson:first-of-type{border-top:0;}
.lp-num{width:34px;height:34px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;background:#ECEEF5;color:var(--navy);}
.lp-lesson.is-done .lp-num{background:#E3A35F;color:#1F2645;}
.lp-lesson-t{flex:1;min-width:0;} .lp-lesson-t b{display:block;color:var(--navy);font-size:15px;line-height:1.3;} .lp-lesson-t span{font-size:12.5px;color:#8A90A6;}
.lp-kc{font-weight:700;}
.lp-pill{font-size:12px;font-weight:700;border-radius:999px;padding:3px 10px;background:#F3F4F8;color:#6B7088;white-space:nowrap;}
.lp-pill.ok{background:#E7F5EE;color:#1E7F4F;} .lp-pill.open{background:#FFF3E6;color:var(--orange-deep);}
.lp-lesson .btn{min-width:84px;}
.lp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:16px;}
.lp-page{padding:16px 18px;display:flex;flex-direction:column;gap:6px;cursor:pointer;}
.lp-page:focus-visible{outline:3px solid #fdba74;outline-offset:2px;}
.lp-page-h{display:flex;align-items:center;gap:9px;} .lp-page-h b{flex:1;color:var(--navy);font-size:16px;}
.lp-ic, .sc-src-ic{width:32px;height:32px;border-radius:10px;background:#FFF3E6;border:1px solid #F7DEC6;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
.lp-page p{margin:0;font-size:13.5px;color:var(--ink-soft);line-height:1.45;flex:1;} .lp-go{font-size:12.5px;font-weight:800;color:var(--orange-deep);}
@media(max-width:600px){ .lp-lesson{flex-wrap:wrap;} .lp-lesson-t{flex-basis:calc(100% - 48px);} .lp-pill{margin-left:48px;} .lp-lesson .btn{margin-left:auto;} }
/* score colours: 85% and up, 70% (passing) and up, under 70%, nothing yet */
.t-top{color:#1E7F4F !important;} .t-ok{color:#2F5BA8 !important;} .t-low{color:#B5531A !important;} .t-none{color:#8A90A6 !important;}
.sc-hero{display:flex;gap:22px;align-items:center;padding:20px 24px;margin-bottom:18px;flex-wrap:wrap;}
.sc-hero-t{flex:1 1 320px;min-width:0;} .sc-hero-t h1{margin:0 0 6px;color:var(--navy);font-size:27px;} .sc-hero-t p{margin:0;color:var(--ink-soft);font-size:14px;}
.sc-facts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;} .sc-facts span{font-size:12.5px;background:#F3F4F8;border-radius:999px;padding:4px 11px;color:#4A5070;} .sc-facts b{color:var(--navy);}
.sc-hero-acts{display:flex;gap:8px;flex-wrap:wrap;}
.sc-ring{--p:0;width:118px;height:118px;border-radius:50%;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(closest-side,#fff 78%,transparent 79%),conic-gradient(currentColor calc(var(--p)*1%),#ECEEF5 0);}
.sc-ring span{font-size:28px;font-weight:800;line-height:1;} .sc-ring small{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8A90A6;margin-top:3px;}
.sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:16px;}
.sc-src{padding:16px 18px;display:flex;flex-direction:column;gap:8px;}
.sc-src-h{display:flex;align-items:center;gap:9px;} .sc-src-h b{flex:1;color:var(--navy);font-size:16px;}
.sc-pill{font-weight:800;font-size:15px;}
.sc-about{margin:0;font-size:13px;color:var(--ink-soft);line-height:1.45;}
.sc-tbl{width:100%;border-collapse:collapse;font-size:13.5px;}
.sc-tbl td, .sc-tbl th{padding:7px 8px;border-top:1px solid #ECEEF4;text-align:left;vertical-align:top;}
.sc-tbl td span{display:block;font-size:12px;color:#8A90A6;margin-top:1px;}
.sc-tbl .sc-n{text-align:right;font-weight:800;white-space:nowrap;}
.sc-empty{margin:0;font-size:13px;color:#8A90A6;}
.sc-how{margin:16px 2px 0;font-size:12.5px;color:#8A90A6;}
.sc-admin{padding:18px 20px;} .sc-admin-bar{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px;}
.sc-admin-bar h2{margin:0 0 4px;color:var(--navy);font-size:20px;} .sc-admin-bar > span{display:flex;gap:8px;align-items:center;}
.sc-admin-bar select{font:inherit;font-size:13px;padding:5px 8px;border-radius:8px;border:1px solid #DDE1EC;}
.sc-scroll{overflow-x:auto;}
.sc-admin-tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6B7088;background:#F7F8FB;white-space:nowrap;}
.sc-admin-tbl th:nth-child(n+3){text-align:right;} .sc-admin-tbl td:nth-child(3){text-align:right;white-space:nowrap;}
.sc-row{cursor:pointer;} .sc-row:hover td{background:#F7F8FB;}
.sc-open > td{background:#FBFBFD;padding:14px;}
@media print{ .topbar, .footer-note, .sc-hero-acts{display:none !important;} main.main-lp{padding:0;} .sc-src{break-inside:avoid;} }
`; document.head.appendChild(st);
if(typeof render === "function" && typeof state !== "undefined" && state.view && state.view !== "login"){ try{ render(); }catch(err){} }
})();
