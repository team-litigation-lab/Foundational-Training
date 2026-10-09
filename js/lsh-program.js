/* ============================================================
   The LSH program layout: the main setup for every LSH program. The same file in every LSH course repo
   (Foundational-Training, EA-PA-TRAINING, Case-Management-Training, medsumanddemandtraining,
   propertydamageclaimstraining); change it in all of them. A program is organised in five sections, and the
   top bar shows exactly those five:

     🏠 Main Portal            the LSH Training Portal (the program's own home, its lessons, is 📚 Modules)
     📚 Modules                #/modules: the program's landing page — every way into the platform opens it.
                               The lessons, and the program's training pages (Task Tracker, My Notes…), which
                               share a bar of tabs under the top bar. ✍️ Process Questions is not one of them:
                               it is its own feature, with its own button in the bar. 📚 Modules is the button's
                               name on every LSH platform: no platform calls its landing page anything else
     🛠 Practice Lab           the Practice Lab Sessions, connected with the simulators (#/simulators)
     🏅 Scorecard              #/scorecard: the trainee's grades, collected from every grading system on the
                               platform; admins get Admin → 🏅 Scorecards, every trainee's in one table
     🛡 Admin Master Control   the Admin screen (admins only, never in 👁 Trainee view)

   The top bar itself is set out below (The top bar): Main Portal, Modules, Process Questions, Practice Lab and
   👤 My Dashboard ▾; Blueprint, 👁 Trainee view and ⛶ View ▾ stay at its end.
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
const batchLabel = id => {
  const v = String(id == null ? "" : id).trim();
  const m = /^B(\d{2})(\d{2})(\d{2})?(\d{2})(?:-?LSH[A-Z]*-?\d+)?$/i.exec(v.replace(/\s+/g, ""));
  return m ? "B" + m[1] + m[2] + m[4] : v;
};
const badgeOf = m => { try{ return m.badge ? Number(m.badge()) || 0 : 0; }catch(err){ return 0; } };
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["modules", "scorecard"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {modules:"Modules", scorecard:"My Performance"});

/* ---------- 📚 Modules is the landing page: every way in opens it ---------- */
// One home, one name for it. Signing in (from the Portal or on this platform), coming back to a saved
// session, the brand mark, a Back button and an old #/dashboard link all open 📚 Modules, instead of a
// second, half-empty home page beside it. A program names the views it used as a home before this in
// window.LSH_HOME_ALIASES (js/ft-updates.js lists the pages this program has turned off); the engine's
// own dashboard is always one.
const HOME = "modules";
const atHome = v => ["dashboard", "home"].concat(window.LSH_HOME_ALIASES || []).includes(v);
const signedIn = () => !!(state.traineeId || state.isAdmin || state.adminPreview);
const __goto = window.goto;
window.goto = function(view){ if(atHome(view) && signedIn()) arguments[0] = HOME; return __goto.apply(this, arguments); };

/* ---------- the five sections ---------- */
// The Modules pages this viewer has (an admin's own pages, or a trainee's; 👁 Trainee view sees the trainee's).
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
// The top bar: 🏠 Main Portal (the LSH Training Portal) · 📚 Modules (this program's landing page, the lessons) ·
// ✍️ Process Questions · 🛠 Practice Lab · 👤 My Dashboard ▾ (a trainee's own pages: My Focus, My Performance,
// My Notes, Task Tracker, Monitoring Sheet) · 🛡 Admin Master Control. An admin gets 🏅 Scorecards (every trainee's)
// instead of My Dashboard; 👁 Trainee view shows the trainee's bar.
const PORTAL_HOME = "https://cm-training-activity.pages.dev/";
const MY_VIEWS = ["notes", "tracker", "monitoring", "scorecard"];
function barSection(){
  const v = state.view, sec = section();
  if(v === "process" || v === "kc") return "process";
  if(!adminOn() && MY_VIEWS.includes(v)) return "mydash";
  if(sec === "home" || sec === "modules") return "modules";
  return sec;
}
function myDashboard(){
  const focus = typeof window.focusNewCount === "function" ? Number(window.focusNewCount()) || 0 : 0;
  const cur = state.view, on = MY_VIEWS.includes(cur);
  const item = (view, label, onclick, n) => `<button type="button" role="menuitem" class="${view && cur === view ? "active" : ""}" onclick="if(window.lshCloseTopMenus) lshCloseTopMenus(); ${onclick}">${label}${n ? `<span class="nav-badge">${n}</span>` : ""}</button>`;
  return `<div class="lsh-grp lp-mydash" data-grp="mydash"><button type="button" class="lp-sec${on ? " active" : ""}" aria-haspopup="true" aria-expanded="false" title="My Focus, My Performance, My Notes, Task Tracker and Monitoring Sheet" onclick="lshProgram.menu(this, event)">👤 My Dashboard ▾${focus ? `<span class="nav-badge">${focus}</span>` : ""}</button><div class="lsh-grp-menu" role="menu">`
    + item("", "🎯 My Focus", "openFocusPanel()", focus)
    + item("scorecard", "🏅 My Performance", "lshProgram.scorecard()")
    + item("notes", "🗒 My Notes", "goto('notes')")
    + item("tracker", "📋 Task Tracker", "goto('tracker')")
    + item("monitoring", "📒 Monitoring Sheet", "goto('monitoring')")
    + `</div></div>`;
}
const __top = window.renderTopbar;
window.renderTopbar = function(){
  const html = __top.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  const bar = t.content.querySelector(".topbar"), nav = t.content.querySelector(".topbar .nav");
  if(!bar || !nav) return html;
  const sec = barSection(), onc = b => b.getAttribute("onclick") || "";
  const viewOf = b => (onc(b).match(/^goto\('([a-z]+)'\)$/) || [])[1];
  // the training pages' own buttons move into the sections (an admin's 🧭 Orientation stays, for 📚 Guides ▾)
  const keep = new Set(["orientation"]);
  const moved = new Set(CFG.modules.map(m => m.view).filter(v => v && !keep.has(v)).concat(CFG.labViews, ["modules"])), runs = new Set(CFG.modules.map(m => m.run).filter(Boolean));
  [...nav.children].forEach(b => { const v = viewOf(b); if((v && moved.has(v)) || runs.has(onc(b))) b.remove(); });
  const btn = (id, label, onclick, title) => `<button type="button" class="lp-sec${sec === id ? " active" : ""}" onclick="${onclick}"${title ? ` title="${title}"` : ""}>${label}</button>`;
  const processGo = "goto('process')";   // one feature, one page: an admin sees every trainee's sheets there
  const secs = btn("modules", "📚 Modules", "goto('modules')", "The Standard Foundational Training: its lessons")
    + btn("process", "✍️ Process Questions", processGo, adminOn() ? "Every trainee's answer sheets" : "Each lesson's answer sheet")
    + btn("lab", "🛠 Practice Lab", "goto('simulators')")
    + (adminOn() ? btn("scorecard", "🏅 Scorecards", "lshProgram.scorecard()", "Every trainee's scorecard") : myDashboard());
  const portal = `<button type="button" class="lp-sec lp-portal" onclick="location.href='${PORTAL_HOME}'" title="The LSH Training Portal">🏠 Main Portal</button>`;
  const home = [...nav.children].find(b => viewOf(b) === "dashboard");
  if(home) home.insertAdjacentHTML("beforebegin", portal + secs), home.remove();
  else nav.insertAdjacentHTML("afterbegin", portal + secs);
  const adm = [...nav.children].find(b => onc(b) === "openAdmin()");
  if(adm){ adm.innerHTML = `🛡 Admin<span class="lp-long"> Master Control</span>`; adm.title = "Admin Master Control"; adm.classList.add("lp-sec"); adm.classList.toggle("active", sec === "admin"); }
  return t.innerHTML;
};

/* ---------- 📚 Modules (#/modules): the lessons, then the training pages ---------- */
function lessonCard(d, i, pinned){
  const p = (state.progress || {})[d.id] || {}, hasSlides = !!(d.sections && d.sections.length), open = dayUnlocked(d.id) && hasSlides, done = !!p.done;
  const status = done ? "done" : open ? "open" : "locked";
  const kc = typeof p.score === "number" ? `<span class="lp-kc t-${tier(p.score)}">✍️ Knowledge Check ${p.score}%</span>` : "";
  const can = open || (adminOn() && hasSlides);
  const tags = lessonTags(d);
  const icon = pinned ? "📌" : ((typeof FT_LESSON_ICONS !== "undefined" ? FT_LESSON_ICONS[d.id] : null) || "📘");
  const label = pinned ? (done ? "✓ Finished" : "📌 Start Here")
    : `Lesson ${i + 1}${done ? " · ✓ Finished" : !hasSlides ? " · Coming soon" : !open ? " · 🔒 Locked" : ""}`;
  const theme = pinned ? "Start here · not counted as a lesson" : `${d.sections.length} slide${d.sections.length === 1 ? "" : "s"}`;
  return `<div class="module-card mc-clean mc-${status} lp-lesson" id="module-${d.id}">
    <div class="module-head"><div class="mh-day">${label}</div><div class="lp-lesson-t"><b class="mh-title">${e(d.title)}</b></div></div>
    <div class="module-body">
      <div class="module-icon">${icon}</div>
      <div class="module-theme lp-tags">${theme}${kc ? " · " + kc : ""}${tags ? " · " + tags : ""}</div>
    </div>
    <button class="btn module-start-btn ${done ? "btn-ghost" : "btn-navy"}" ${can ? "" : "disabled"} onclick="goto('day',${d.id})">${done ? "Review" : "Start"}</button>
  </div>`;
}
// What the program adds to the landing page. A file that used to hang something on the dashboard (a stat
// card, a badge on a lesson card) registers it here instead: window.LSH_HOME_STATS holds () => HTML for the
// row of stat cards under the progress bar, window.LSH_HOME_LESSON_TAGS holds (lesson) => HTML for a tag
// beside that lesson's Knowledge Check score. js/ft-simulators.js registers the graded calls in both.
const hooks = (name, arg) => (window[name] || []).map(f => { try{ return f(arg) || ""; }catch(err){ return ""; } }).join("");
const homeStats = () => { const h = hooks("LSH_HOME_STATS"); return h ? `<div class="lp-home-stats">${h}</div>` : ""; };
const lessonTags = d => hooks("LSH_HOME_LESSON_TAGS", d);

// Resume, the certificate and the feedback card: the landing page carries them, so nothing a trainee
// needs is left on a home page they no longer open.
function homeActions(done, total){
  const resume = typeof window.resumeLabel === "function" ? resumeLabel() : "";
  const cert = (typeof window.certData === "function" && state.traineeId) ? certData() : null;
  const html = (resume ? `<button class="btn btn-primary resume-btn" onclick="resumeWhereLeftOff()">▶ Resume where you left off <span>${e(resume)}</span></button>` : "")
    + (cert ? (cert.eligible
      ? `<button class="btn cert-hero-btn" onclick="downloadCertificatePdf(null)">🎓 Download my Certificate</button><button class="btn btn-ghost cert-hero-view" onclick="openCertificate()">View</button>`
      : `<span class="cert-hero-locked" title="Finish the lessons to unlock your certificate">🎓 Certificate · ${done}/${total} lessons finished</span>`) : "");
  return html ? `<div class="lp-home-acts">${html}</div>` : "";
}
function homeFeedback(){
  const fb = typeof window.renderFeedbackDashCard === "function" ? renderFeedbackDashCard() : "";
  return fb ? `<section class="lp-home-fb">${fb}</section>` : "";
}
// The step-timeline: one circle per lesson (not the pinned orientation), done/open/locked, click to jump to its card —
// the same header the EA/PA-style dashboard shows above its lessons (js/ft-updates.js's retired renderDashboard).
function stepTimeline(all){
  if(!all.length) return "";
  return `<div class="step-timeline">${all.map((d, i) => {
    const p = (state.progress || {})[d.id] || {}, hasSlides = !!(d.sections && d.sections.length), open = dayUnlocked(d.id) && hasSlides, done = !!p.done;
    const st = done ? "st-done" : open ? "st-open" : "st-locked", can = open || (adminOn() && hasSlides);
    return `<div class="step-node">
      <div class="step-circle ${st}" ${can ? `onclick="scrollToModule(${d.id})"` : ""} title="${e(d.title)}">${done ? "✓" : i + 1}</div>
      ${i < all.length - 1 ? `<div class="step-dash ${done ? "filled" : ""}"></div>` : ""}
    </div>`;
  }).join("")}</div>`;
}
function renderModules(){
  const all = lessons(), done = doneIn(state.progress), pinned = (CFG.pinned() || []).filter(Boolean);
  const viewer = isTrainee() || !!state.adminPreview, ps = pages();
  const pct = all.length ? Math.round(done / all.length * 100) : 0;
  // The standard hero header (js/ft-updates.js's retired renderDashboard): eyebrow, title, tagline and the
  // completion ribbon, with the step-timeline below it in the same navy card.
  return `<div class="dash-top">
      <div class="dash-hero">
        <div class="dash-hero-text"><p class="eyebrow">📚 Standard Foundational Training</p><h1>Modules</h1>
          <p>The ${all.length} lessons of this training, in order, and the pages you work in alongside them.</p></div>
        ${viewer ? `<div class="dash-hero-ribbon">${completionRibbonSvg(pct, done)}</div>` : ""}
      </div>
      ${viewer ? stepTimeline(all) : `<p class="lp-note">Trainees see the lessons open for their batch: open them in 🛡 Admin Master Control → 📅 Open Lessons.</p>`}
    </div>
    ${pinned.length ? `<div class="dash-main lp-orient">${pinned.map(d => lessonCard(d, 0, true)).join("")}</div>` : ""}
    ${homeStats()}
    ${homeActions(done, all.length)}
    <section class="lp-lessons"><h2>📖 Lessons</h2><div class="dash-main"><div class="module-grid">${all.map((d, i) => lessonCard(d, i, false)).join("")}</div></div></section>
    ${ps.length ? `<section class="lp-pages"><h2>🧰 Training pages</h2><div class="lp-grid">${ps.map(m => { const go = m.view ? `goto('${m.view}')` : m.run, n = badgeOf(m);
      return `<div class="card lp-page" role="link" tabindex="0" onclick="${go}" onkeydown="if(event.key==='Enter'){${go}}"><div class="lp-page-h"><span class="lp-ic">${m.icon}</span><b>${e(m.label)}</b>${n ? `<span class="nav-badge">${n}</span>` : ""}</div><p>${e(m.about || "")}</p><span class="lp-go">Open →</span></div>`; }).join("")}</div></section>` : ""}
    ${homeFeedback()}`;
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
      <div class="sc-hero-t"><p class="lp-eyebrow">👤 My Dashboard · My Performance</p><h1>🏅 My Performance</h1>
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
  // Anything that still sets a home view directly (the engine's sign-in, a resume, a page this program
  // has turned off) lands on 📚 Modules, so there is one landing page however the trainee got here.
  if(atHome(state.view) && signedIn()){ state.view = HOME; try{ if(typeof syncRouteHash === "function") syncRouteHash(); }catch(err){} }
  const v = state.view;
  if(v !== "scorecard" && v !== "modules") return __render.apply(this, arguments);
  if(v === "scorecard" && adminOn()){ state.adminTab = "scorecards"; state.view = "admin"; return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
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
  const batches = [...new Set(AS.rows.map(r => batchLabel(r.batch)).filter(Boolean))].sort();
  const rows = AS.rows.filter(r => !AS.batch || batchLabel(r.batch) === AS.batch);
  const cell = pct => `<td class="sc-n t-${tier(pct)}">${pctTxt(pct)}</td>`;
  return `<div class="card sc-admin">
    <div class="sc-admin-bar"><div><h2>🏅 Scorecards</h2><p class="sc-about">Each trainee’s grades, collected from all of the platform’s grading systems. Click a trainee for the details.</p></div>
      <span><select onchange="lshProgram.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === AS.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" onclick="lshProgram.refresh()">↻ Refresh</button></span></div>
    ${rows.length ? `<div class="sc-scroll"><table class="sc-tbl sc-admin-tbl"><thead><tr><th>Trainee</th><th>Batch</th><th>Lessons</th>${CFG.sources.map(s => `<th>${s.icon} ${e(s.label)}</th>`).join("")}<th>Overall</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="sc-row" onclick="lshProgram.toggle('${e(r.id)}')"><td class="sc-who"><b>${e(r.name)}</b></td><td class="sc-batch" title="${e(r.batch)}">${e(batchLabel(r.batch))}</td><td>${r.sc.done} / ${r.sc.total}</td>${r.sc.rows.map(x => cell(x.avg)).join("")}${cell(r.sc.overall)}</tr>
        ${AS.open[r.id] ? `<tr class="sc-open"><td colspan="${CFG.sources.length + 4}">${detail(r.sc)}</td></tr>` : ""}`).join("")}
    </tbody></table></div>` : `<p class="sc-empty">No approved trainees${AS.batch ? " in this batch" : ""} yet.</p>`}
    <p class="sc-how">${HOW}</p></div>`;
}
// The Admin screen's tabs, grouped in the same sections: a row of sections, then the open section's tabs (one row each,
// scrolling sideways on a phone) instead of every tab in one long bar. A tab not in LSH_PROGRAM.adminGroups goes to
// Admin Master Control, so a new tab is never lost.
const GROUPS = [
  {id:"admin", label:"🛡 Admin Master Control"}, {id:"modules", label:"📚 Modules"},
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
  // 👤 My Dashboard ▾ opens and closes like js/lsh-topbar.js's menus (which also closes it on a click elsewhere or Esc)
  menu(btn, ev){
    if(ev) ev.stopPropagation();
    const box = btn.parentNode, open = !box.classList.contains("open");
    if(typeof window.lshCloseTopMenus === "function") window.lshCloseTopMenus();
    box.classList.toggle("open", open); btn.setAttribute("aria-expanded", open ? "true" : "false");
  },
  batch(b){ AS.batch = b; render(); },
  refresh(){ AS.rows = null; AS.fresh = true; render(); },
  toggle(id){ AS.open[id] = !AS.open[id]; render(); }
};

const st = document.createElement("style"); st.id = "lsh-program"; st.textContent = `
/* the five sections in the top bar; on a narrower screen the long names shorten (Modules, Admin) so it stays one row */
.topbar .nav button.lp-sec{font-weight:700;}
/* 🏠 Main Portal is the first section, so js/portal-link.js's own ← Training Directory button isn't shown */
.topbar .nav .nav-portal{display:none !important;}
@media(min-width:961px) and (max-width:1400px){ .topbar .nav .lp-long{display:none;} }
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
/* the Modules and Scorecard pages */
main.main-lp{max-width:1180px;margin:0 auto;padding:24px 16px 40px;}
.lp-eyebrow{font-size:11px !important;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--orange-deep) !important;margin:0 0 4px !important;}
.lp-note{margin-top:8px !important;font-size:13.5px !important;}
.dash-top .lp-note{color:#C9CDE3 !important;}
/* the pinned orientation card, its own row above the numbered lessons (not part of their grid) */
.lp-orient{display:flex;justify-content:center;margin:18px 0 0;}
.lp-orient .module-card{max-width:280px;width:100%;}
.lp-home-acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:16px 0 0;}
/* the program's own stat cards (the dashboard's side band used to hold these) */
.lp-home-stats{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 0;}
.lp-home-stats .card.stat{padding:10px 16px;min-width:150px;}
.lp-home-stats .card.stat .num{font-size:24px;font-weight:800;color:var(--navy);line-height:1.1;}
.lp-home-stats .card.stat .lbl{font-size:12px;color:var(--ink-soft);}
.lp-home-fb{max-width:420px;margin-top:24px;}
/* the feedback card was built for the dashboard's dark side band: on this page it sits on a white card */
.lp-home-fb .tfb-dash .lbl{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--orange-deep);}
.lp-home-fb .tfb-dash .sub{font-size:13.5px;color:var(--ink-soft);line-height:1.45;}
.lp-home-fb .tfb-dash-stars button{color:#D9DEEA;}
.lp-home-fb .tfb-dash-stars:hover button{color:#E3A35F;}
.lp-home-fb .tfb-dash-stars button:hover ~ button{color:#D9DEEA;}
.lp-lessons{margin-bottom:22px;} .lp-lessons h2, .lp-pages h2{margin:0 0 10px;color:var(--navy);font-size:20px;}
/* the Lessons grid: the same clean module-card look as the EA/PA course's dashboard (see js/lsh-dashboard.js).
   js/lsh-dashboard.js sizes that card to fill a fixed-height hero row (container-type:size, overflow:hidden) —
   here the card grows to fit its own content instead, so every lesson's activities stay visible. */
.lp-lessons .module-card, .lp-orient .module-card{height:auto;}
/* every card in a row matches the tallest one, and every header reserves room for a 3-line title, so a short
   title ("Receptionist Training") and a long one ("Calendaring & Appointment Setting Training") still line up:
   the icon sits at the same height across the row and the Start button sits flush with the card bottom. */
.lp-lessons .module-grid{align-items:stretch;}
.lp-lessons .module-card.mc-clean .module-head, .lp-orient .module-card.mc-clean .module-head{min-height:92px;}
.lp-lessons .module-card.mc-clean .module-start-btn, .lp-orient .module-card.mc-clean .module-start-btn{margin-top:auto;}
.lp-lessons .module-card.mc-clean .module-body, .lp-orient .module-card.mc-clean .module-body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:16px 16px 10px;flex:0 1 auto;min-height:0;overflow:visible;container-type:normal;}
/* the dashboard's module-theme is line-clamped to fit a fixed-height hero card (display:-webkit-box + overflow:hidden,
   which collapses to 0 height without that fixed height) — here it's plain wrapping text, same specificity so it wins */
.lp-lessons .module-card.mc-clean .module-theme, .lp-orient .module-card.mc-clean .module-theme{display:block;-webkit-line-clamp:unset;overflow:visible;max-width:none;}
.lp-lessons .module-icon, .lp-orient .module-icon{font-size:30px;line-height:1;}
.lp-lessons .module-theme, .lp-orient .module-theme{font-size:12.5px;color:var(--ink-soft);}
.lp-kc{font-weight:700;}
.lp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:16px;}
.lp-page{padding:16px 18px;display:flex;flex-direction:column;gap:6px;cursor:pointer;}
.lp-page:focus-visible{outline:3px solid #fdba74;outline-offset:2px;}
.lp-page-h{display:flex;align-items:center;gap:9px;} .lp-page-h b{flex:1;color:var(--navy);font-size:16px;}
.lp-ic, .sc-src-ic{width:32px;height:32px;border-radius:10px;background:#FFF3E6;border:1px solid #F7DEC6;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
.lp-page p{margin:0;font-size:13.5px;color:var(--ink-soft);line-height:1.45;flex:1;} .lp-go{font-size:12.5px;font-weight:800;color:var(--orange-deep);}
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
/* 🏅 Scorecards is a wide table: give its page the window, not the 1180px the reading pages use. */
body:has(.sc-admin) main{max-width:min(1800px, calc(100vw - 32px)) !important;}
.sc-admin-tbl .sc-who, .sc-admin-tbl .sc-batch{white-space:nowrap;}
.sc-admin-tbl .sc-batch{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12.5px;color:#4A5070;}
.sc-admin-tbl th:first-child, .sc-admin-tbl th:nth-child(2){white-space:nowrap;}
.sc-scroll{overflow-x:auto;}
.sc-open > td{background:#FBFBFD;padding:14px;}
@media print{ .topbar, .footer-note, .sc-hero-acts{display:none !important;} main.main-lp{padding:0;} .sc-src{break-inside:avoid;} }
`; document.head.appendChild(st);
if(typeof render === "function" && typeof state !== "undefined" && state.view && state.view !== "login"){ try{ render(); }catch(err){} }
})();
