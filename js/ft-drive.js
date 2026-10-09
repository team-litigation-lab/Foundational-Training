/* ============================================================
   📁 The Daily Task Tracker and the Training Monitoring Sheet live in the trainee's Google Drive
   Loaded after js/ft-tracker.js and js/ft-monitoring.js, whose trainee pages it replaces (their admin tabs stay).
   Trainees keep both files in their VA Output folder, not on the platform: they save the links once (📁 My Drive
   links: the VA Output folder, the Task Tracker sheet, the Monitoring Sheet), and each training day they add the
   links to that day's outputs. Saved in drive:<id> = {folder, tracker, monitor, startDate, days: {<date>: {links:
   [{label, url}], submittedAt}}}, the trainee's own.
   Graded automatically: the Worker reads the files (shared "Anyone with the link can view"), checks the tracker
   with the tracker rules (js/ft-tracker-rules.js: fromSheetCsv, checkDay: every open task's Daily Note, and the
   day's output links) and the Monitoring Sheet per discussion (gradeMonitorText: the date, 5 takeaways, questions,
   the rating), and writes a review in the facilitator's voice: every night on the cron, and on ✅ Check now
   (/api/drive/check, at most every 3 minutes for a trainee). Results go to trackerreview:<id> (days[D], monitor).
   Trainer inputs: Admin → 📁 Drive Trackers: each trainee's links and checks, with the trainer's score and comment
   for each tracker day and for the Monitoring Sheet (kept in trackerreview:<id>; the Worker never overwrites them).
   ============================================================ */
(function(){
const TR = window.FTTrackerRules;
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const today = () => TR.ptDate();
const isGoogle = u => /^https:\/\/(drive|docs)\.google\.com\//.test(String(u || "").trim());
const tScore = r => r && r.trainerScore != null && r.trainerScore !== "" && isFinite(Number(r.trainerScore)) ? Math.round(Number(r.trainerScore)) : null;
const D = {id:null, drive:null, review:null, loading:null, at:0, day:null, busy:false, saving:null};
function load(force){
  if(!isTrainee() || D.loading) return D.loading;
  if(!force && D.id === state.traineeId && Date.now() - D.at < 120000) return null;
  const id = state.traineeId; D.at = Date.now();
  D.loading = sharedGetMany(["drive:" + id, "trackerreview:" + id]).then(v => {
    D.id = id; D.drive = v[0] && typeof v[0] === "object" ? v[0] : {days:{}}; if(!D.drive.days) D.drive.days = {};
    D.review = v[1] && typeof v[1] === "object" ? v[1] : {days:{}}; if(!D.review.days) D.review.days = {};
  }).catch(() => {}).then(() => { D.loading = null; if(["tracker", "monitoring", "dashboard"].includes(state.view)) render(); });
  return D.loading;
}
window.addEventListener("focus", () => { if(isTrainee() && D.id && ["tracker", "monitoring"].includes(state.view)) load(); });
async function save(){ D.drive.updatedAt = new Date().toISOString(); return sharedSet("drive:" + D.id, D.drive); }
const day = () => D.day || today();
const dayLinks = d => ((D.drive.days[d] || {}).links || []);

/* ---------- the pages ---------- */
function linksCard(){
  const x = D.drive, row = (k, label, ph, hint) => `<label class="fdr-l"><span>${label}</span>
      <div class="fdr-row"><input id="fdr-${k}" type="url" placeholder="${ph}" value="${e(x[k] || "")}">${x[k] ? `<a class="btn btn-ghost btn-sm" href="${e(x[k])}" target="_blank" rel="noopener noreferrer">Open ↗</a>` : ""}</div>
      ${hint ? `<small>${hint}</small>` : ""}</label>`;
  return `<div class="card fdr-card"><h2>📁 My Drive links</h2>
    <p class="fdr-muted">Your Task Tracker and Monitoring Sheet live in your <b>VA Output folder</b> in Google Drive. Share each file as <b>“Anyone with the link can view”</b> so the system can grade it, then paste the links here.</p>
    ${row("folder", "📁 VA Output folder", "https://drive.google.com/drive/folders/…", "")}
    ${row("tracker", "📋 LSH Daily Task Tracker (Google Sheet)", "https://docs.google.com/spreadsheets/d/…", "Your own copy of the tracker. Link the Daily Task Tracker tab.")}
    ${row("monitor", "📒 Training Monitoring Sheet (Google Doc or Sheet)", "https://docs.google.com/document/d/…", "One entry per discussion: the date, 5 takeaways, 3 questions, and your rating.")}
    <div class="fp-actions"><button class="btn btn-navy btn-sm" onclick="FTDrive.saveLinks()">💾 Save my links</button></div></div>`;
}
function rulesHtml(res){
  if(!res) return `<p class="fdr-muted">Not checked yet.</p>`;
  return `<div class="fdr-res"><div class="fdr-res-h"><span class="fdr-pct ${res.pct >= 100 ? "ok" : res.pct >= 60 ? "mid" : "bad"}">${res.pct}%</span>
      <span class="fdr-muted">Checked ${res.checkedAt ? e(new Date(res.checkedAt).toLocaleString()) : ""}</span>${tScore(res) != null ? `<span class="fdr-pill">🧑‍🏫 Trainer’s score ${tScore(res)}%</span>` : ""}</div>
    <ul>${(res.rules || []).map(r => `<li class="${r.pass ? "ok" : "miss"}">${r.pass ? "✓" : "✗"} <b>${e(r.label)}</b> <span>${e(r.detail || "")}</span></li>`).join("")}</ul>
    ${has(res.review) ? `<div class="fdr-review"><b>Notes review</b><p>${e(res.review).replace(/\n/g, "<br>")}</p></div>` : ""}
    ${has(res.comment) ? `<div class="fdr-review fdr-trainer"><b>🧑‍🏫 Your trainer</b><p>${e(res.comment).replace(/\n/g, "<br>")}</p></div>` : ""}</div>`;
}
function renderTrackerPage(){
  if(D.id !== state.traineeId){ load(); return `<div class="card fdr-card">Loading your tracker links…</div>`; }
  const d = day(), links = dayLinks(d), res = D.review.days[d];
  const days = [...new Set([today()].concat(Object.keys(D.drive.days), Object.keys(D.review.days)))].sort().reverse().slice(0, 15);
  return `<div class="fdr-hero"><p class="lp-eyebrow">📚 Modules · Task Tracker</p><h1>📋 Daily Task Tracker</h1>
      <p>Keep your LSH Daily Task Tracker in your VA Output folder and update it before the end of every shift. Each day, add the links to that day’s outputs. The system checks your tracker every night (and when you press ✅ Check now): every open task needs its Daily Note for the day, and the day needs its output links. Your trainer adds their score and comments.</p></div>
    ${linksCard()}
    <div class="card fdr-card"><div class="fdr-day"><h2>🗓 ${e(TR.fmtDate(d))}</h2>
        <select onchange="FTDrive.day(this.value)">${days.map(x => `<option value="${x}" ${x === d ? "selected" : ""}>${TR.fmtDate(x)}${x === today() ? " (today)" : ""}</option>`).join("")}</select></div>
      <h3>🔗 The day’s output links</h3>
      <p class="fdr-muted">The files you made or updated today, from your VA Output folder (typing and spelling test screenshots, documents, recordings …).</p>
      <div id="fdrLinks">${(links.length ? links : [{label:"", url:""}]).map((l, i) => linkRow(l, i)).join("")}</div>
      <div class="fp-actions"><button class="btn btn-ghost btn-sm" onclick="FTDrive.addLink()">＋ Another link</button>
        <button class="btn btn-navy btn-sm" onclick="FTDrive.saveDay()">📤 Submit the day’s links</button>
        <button class="btn btn-ghost btn-sm" ${D.busy ? "disabled" : ""} onclick="FTDrive.check()">${D.busy ? "Checking…" : "✅ Check now"}</button></div>
      ${(D.drive.days[d] || {}).submittedAt ? `<p class="fdr-muted">Submitted ${e(new Date(D.drive.days[d].submittedAt).toLocaleString())}.</p>` : ""}
      <h3>📊 The day’s check</h3>${rulesHtml(res)}</div>`;
}
function linkRow(l, i){
  return `<div class="fdr-row fdr-link" data-i="${i}"><input class="fdr-label" placeholder="What it is (e.g. Typing Test AM)" value="${e(l.label || "")}"><input class="fdr-url" type="url" placeholder="https://drive.google.com/file/d/…" value="${e(l.url || "")}">
    ${l.url ? `<a class="btn btn-ghost btn-sm" href="${e(l.url)}" target="_blank" rel="noopener noreferrer">↗</a>` : ""}</div>`;
}
function renderMonitorPage(){
  if(D.id !== state.traineeId){ load(); return `<div class="card fdr-card">Loading your Monitoring Sheet link…</div>`; }
  const m = D.review.monitor;
  return `<div class="fdr-hero"><p class="lp-eyebrow">📚 Modules · Monitoring Sheet</p><h1>📒 Training Monitoring Sheet</h1>
      <p>Fill in your Training Monitoring Sheet in your VA Output folder as soon as a discussion is fully covered: the date, 5 major takeaways in complete, specific sentences, 3 questions you still have, and your rating. The system checks it every night and when you press ✅ Check now; your trainer adds their score and comments.</p>
      <p><a class="btn btn-ghost btn-sm" href="${e((window.FT_MONITOR_DOC || {}).open || "#")}" target="_blank" rel="noopener noreferrer">📄 The Monitoring Sheet template ↗</a></p></div>
    ${linksCard()}
    <div class="card fdr-card"><div class="fdr-day"><h2>📊 The check</h2><button class="btn btn-ghost btn-sm" ${D.busy ? "disabled" : ""} onclick="FTDrive.check()">${D.busy ? "Checking…" : "✅ Check now"}</button></div>
      ${!m ? `<p class="fdr-muted">Not checked yet.</p>` : m.error ? `<p class="fdr-err">⚠ ${e(m.error)}</p>` : `
      <div class="fdr-res-h"><span class="fdr-pct ${m.pct >= 100 ? "ok" : m.pct >= 60 ? "mid" : "bad"}">${m.pct}%</span><span class="fdr-muted">${m.found} of ${m.total} discussions found · checked ${e(new Date(m.checkedAt).toLocaleString())}</span>${tScore(m) != null ? `<span class="fdr-pill">🧑‍🏫 Trainer’s score ${tScore(m)}%</span>` : ""}</div>
      <table class="fdr-tbl"><thead><tr><th>Discussion</th>${["Date", "5 takeaways", "Questions", "Understanding rated"].map(h => `<th>${h}</th>`).join("")}<th>%</th></tr></thead><tbody>
        ${(m.entries || []).map(x => `<tr><td>${e(x.topic)}</td>${x.checks.map(c => `<td class="${c.ok ? "ok" : "miss"}">${c.ok ? "✓" : "✗"}${c.label === "5 takeaways" ? ` ${x.takeaways}` : ""}</td>`).join("")}<td><b>${x.pct}%</b></td></tr>`).join("")}</tbody></table>`}
      ${m && has(m.review) ? `<div class="fdr-review"><b>Review</b><p>${e(m.review).replace(/\n/g, "<br>")}</p></div>` : ""}
      ${m && has(m.comment) ? `<div class="fdr-review fdr-trainer"><b>🧑‍🏫 Your trainer</b><p>${e(m.comment).replace(/\n/g, "<br>")}</p></div>` : ""}</div>`;
}

window.FTDrive = {
  day(d){ D.day = d; render(); },
  async saveLinks(){
    const v = k => String((document.getElementById("fdr-" + k) || {}).value || "").trim();
    const bad = ["folder", "tracker", "monitor"].filter(k => v(k) && !isGoogle(v(k)));
    if(bad.length){ toast("Paste Google Drive links (they start with https://drive.google.com/ or https://docs.google.com/)."); return; }
    if(v("tracker") && TR.googleFile(v("tracker")).kind !== "sheet"){ toast("The Task Tracker link must be a Google Sheets link."); return; }
    ["folder", "tracker", "monitor"].forEach(k => { D.drive[k] = v(k); });
    if(!D.drive.startDate) D.drive.startDate = today();
    toast(await save() === false ? "Couldn’t save. Check your connection." : "✓ Links saved."); render();
  },
  addLink(){ const box = document.getElementById("fdrLinks"); box.insertAdjacentHTML("beforeend", linkRow({}, box.children.length)); },
  async saveDay(){
    const links = [...document.querySelectorAll("#fdrLinks .fdr-link")].map(r => ({label:r.querySelector(".fdr-label").value.trim(), url:r.querySelector(".fdr-url").value.trim()})).filter(l => l.url);
    if(links.some(l => !isGoogle(l.url))){ toast("Each output link must be a Google Drive link from your VA Output folder."); return; }
    if(!links.length){ toast("Add at least one link to the day’s outputs."); return; }
    const d = day(); D.drive.days[d] = {links, submittedAt:new Date().toISOString()};
    toast(await save() === false ? "Couldn’t save. Check your connection." : "✓ The day’s links are submitted."); render();
  },
  async check(){
    if(D.busy) return;
    if(!D.drive.tracker && !D.drive.monitor){ toast("Save your Google Drive links first."); return; }
    D.busy = true; render();
    try{
      const r = await authFetch("/api/drive/check", {date:day()}), j = await r.json().catch(() => ({}));
      if(!r.ok) toast(j.error || "Couldn’t check right now.");
      else { if(j.review) D.review = Object.assign({days:{}}, j.review); toast("✓ Checked."); }
    }catch(err){ toast("Couldn’t check right now. Check your connection."); }
    D.busy = false; render();
  }
};

const __render = window.render;
window.render = function(){
  if(!["tracker", "monitoring"].includes(state.view) || !isTrainee()) return __render.apply(this, arguments);
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-fdr">${state.view === "tracker" ? renderTrackerPage() : renderMonitorPage()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
// the dashboard: today's tracker check and the Monitoring Sheet's, from Drive (in place of the on-platform sheets' cards)
const __dash = window.renderDashboard;
window.renderDashboard = function(){
  let html = __dash.apply(this, arguments);
  if(!isTrainee()) return html;
  html = html.replace(/<div class="card stat ftt-dash"[\s\S]*?<\/div><\/div>/, "").replace(/<div class="card stat ftm-dash"[\s\S]*?<\/div><\/div>/, "");
  load();
  if(D.id !== state.traineeId) return html;
  const t = D.review.days[today()], m = D.review.monitor;
  const card = (cls, view, num, tone, lbl) => `<div class="card stat ${cls}" onclick="goto('${view}')" style="cursor:pointer;"><div class="num ${tone}">${num}</div><div class="lbl">${lbl}</div></div>`;
  const tone = p => p == null ? "" : p >= 100 ? "ok" : p >= 60 ? "mid" : "bad";
  const cards = card("fdr-dash", "tracker", t ? t.pct + "%" : "—", tone(t && t.pct), D.drive.tracker ? "📋 Task Tracker today" : "📋 Task Tracker · add your link")
    + card("fdr-dash", "monitoring", m && !m.error ? `${m.found} / ${m.total}` : "—", "", D.drive.monitor ? "📒 Monitoring Sheet entries" : "📒 Monitoring Sheet · add your link");
  return html.replace('<aside class="dash-side"><div class="dash-side-inner">', '<aside class="dash-side"><div class="dash-side-inner">' + cards);
};

/* ---------- Admin → 📁 Drive Trackers: links, checks and the trainer's score and comment ---------- */
const DA = {rows:null, loading:false, batch:"", open:{}, busy:{}};
async function loadAdmin(){
  DA.loading = true;
  try{
    let people = state.adminData;
    if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
    people = people.filter(r => r && r.id && r.approved === true && !r.archived && !r.rejected);
    const keys = people.flatMap(r => ["drive:" + r.id, "trackerreview:" + r.id]), vals = [];
    for(let i = 0; i < keys.length; i += 100) vals.push(...await sharedGetMany(keys.slice(i, i + 100)));
    DA.rows = people.map((r, i) => ({id:r.id, name:r.name || r.id, batch:r.batch || "", drive:vals[i * 2] || null, rv:vals[i * 2 + 1] || {days:{}}}))
      .sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    if(!DA.batch){ const bs = [...new Set(DA.rows.map(r => r.batch).filter(Boolean))].sort(); DA.batch = bs[bs.length - 1] || ""; }
  }catch(err){ DA.rows = []; }
  DA.loading = false;
  if(state.view === "admin" && state.adminTab === "drivetrackers") render();
}
function scoreForm(id, which, res){
  return `<div class="fss-rvform" data-which="${e(which)}"><label>Score <input type="number" min="0" max="100" data-score value="${tScore(res) != null ? tScore(res) : ""}" placeholder="${res && res.pct != null ? res.pct : ""}"> %</label>
    <label class="fss-wide">Your comment<textarea rows="2" data-comment placeholder="The trainee sees it under the check">${e((res && res.comment) || "")}</textarea></label>
    <button class="btn btn-navy btn-sm" onclick="FTDriveAdmin.save('${e(id)}', '${e(which)}', this)">Save</button></div>`;
}
function renderAdminDrive(){
  if(!DA.rows){ if(!DA.loading) loadAdmin(); return `<div class="card" style="padding:24px;">Loading the trainees’ Drive links…</div>`; }
  const batches = [...new Set(DA.rows.map(r => r.batch).filter(Boolean))].sort(), rows = DA.rows.filter(r => !DA.batch || r.batch === DA.batch);
  const lk = (u, t) => u ? `<a href="${e(u)}" target="_blank" rel="noopener noreferrer">${t} ↗</a>` : `<span class="fdr-muted">${t}: —</span>`;
  return `<div class="card fss-admin"><div class="ff-bar"><div><h3>📁 Drive Trackers</h3><p class="fdr-muted">Each trainee’s Task Tracker and Monitoring Sheet, kept in their VA Output folder: the links, the automated checks (every night, or ✅ Check now) and your score and comment for each day and for the Monitoring Sheet.</p></div>
      <span><select onchange="FTDriveAdmin.batch(this.value)"><option value="">All batches</option>${batches.map(b => `<option ${b === DA.batch ? "selected" : ""}>${e(b)}</option>`).join("")}</select><button class="btn btn-ghost btn-sm" onclick="FTDriveAdmin.refresh()">↻</button></span></div>
    ${rows.length ? rows.map(r => { const dv = r.drive || {}, t = (r.rv.days || {})[today()], m = r.rv.monitor, open = !!DA.open[r.id];
      const days = [...new Set(Object.keys(dv.days || {}).concat(Object.keys(r.rv.days || {})))].sort().reverse().slice(0, 10);
      return `<div class="fss-arow"><div class="fss-arow-h" onclick="FTDriveAdmin.open('${e(r.id)}')">${open ? "▾" : "▸"} <b>${e(r.name)}</b> <span class="fdr-muted">${e(r.batch)}</span>
          ${t ? `<span class="fss-pill ${t.pct >= 100 ? "ok" : "mid"}">📋 today ${t.pct}%</span>` : `<span class="fss-pill">📋 today —</span>`}
          ${m && !m.error ? `<span class="fss-pill">📒 ${m.found}/${m.total} · ${m.pct}%</span>` : m && m.error ? `<span class="fss-pill mid">📒 can’t read</span>` : ""}
          ${!dv.tracker && !dv.monitor ? `<span class="fss-pill mid">no links yet</span>` : ""}</div>
        ${open ? `<div class="fss-abody"><p class="fdr-links">${lk(dv.folder, "📁 VA Output folder")} · ${lk(dv.tracker, "📋 Task Tracker")} · ${lk(dv.monitor, "📒 Monitoring Sheet")}
            <button class="btn btn-ghost btn-sm" ${DA.busy[r.id] ? "disabled" : ""} onclick="FTDriveAdmin.check('${e(r.id)}')">${DA.busy[r.id] ? "Checking…" : "✅ Check now"}</button></p>
          <h4>📋 Task Tracker, by day</h4>${days.length ? days.map(d => { const res = (r.rv.days || {})[d], ls = ((dv.days || {})[d] || {}).links || [];
            return `<div class="fdr-aday"><b>${TR.fmtDate(d)}</b> ${ls.map(l => `<a href="${e(l.url)}" target="_blank" rel="noopener noreferrer">${e(l.label || "output")} ↗</a>`).join(" · ") || `<span class="fdr-muted">no output links</span>`}
              ${rulesHtml(res)}${res ? scoreForm(r.id, "day:" + d, res) : ""}</div>`; }).join("") : `<p class="fdr-muted">No days yet.</p>`}
          <h4>📒 Monitoring Sheet</h4>${m ? (m.error ? `<p class="fdr-err">⚠ ${e(m.error)}</p>` : `<p class="fdr-muted">${m.found} of ${m.total} discussions found · ${m.pct}% · checked ${e(new Date(m.checkedAt).toLocaleString())}</p>
              ${(m.entries || []).map(x => `<span class="fss-pill ${x.pct >= 100 ? "ok" : "mid"}" title="${e(x.checks.filter(c => !c.ok).map(c => c.label).join(", "))}">${e(x.topic)} ${x.pct}%</span>`).join(" ")}
              ${has(m.review) ? `<div class="fdr-review"><b>Review</b><p>${e(m.review).replace(/\n/g, "<br>")}</p></div>` : ""}`) + scoreForm(r.id, "monitor", m) : `<p class="fdr-muted">Not checked yet.</p>`}</div>` : ""}</div>`; }).join("")
      : `<p class="fdr-muted">No approved trainees${DA.batch ? " in this batch" : ""}.</p>`}</div>`;
}
window.FTDriveAdmin = {
  batch(b){ DA.batch = b; render(); },
  open(id){ DA.open[id] = !DA.open[id]; render(); },
  refresh(){ DA.rows = null; render(); },
  async check(id){
    DA.busy[id] = true; render();
    try{ const r = await authFetch("/api/drive/check", {id}), j = await r.json().catch(() => ({}));
      if(!r.ok) toast(j.error || "Couldn’t check."); else { const row = DA.rows.find(x => x.id === id); if(row && j.review) row.rv = j.review; toast("✓ Checked."); } }
    catch(err){ toast("Couldn’t check. Check your connection."); }
    DA.busy[id] = false; render();
  },
  async save(id, which, btn){
    const box = btn.closest(".fss-rvform"), sv = String(box.querySelector("[data-score]").value || "").trim();
    if(sv !== "" && !(Number(sv) >= 0 && Number(sv) <= 100)){ toast("The score is a number from 0 to 100."); return; }
    btn.disabled = true;
    try{
      const cur = (await sharedGet("trackerreview:" + id)) || {days:{}}; if(!cur.days) cur.days = {};
      const target = which === "monitor" ? (cur.monitor = cur.monitor || {}) : (cur.days[which.slice(4)] = cur.days[which.slice(4)] || {});
      target.trainerScore = sv === "" ? null : Math.round(Number(sv)); target.comment = String(box.querySelector("[data-comment]").value || "").trim().slice(0, 4000); target.commentAt = new Date().toISOString();
      if(await sharedSet("trackerreview:" + id, cur) === false) throw new Error("save");
      const row = DA.rows.find(x => x.id === id); if(row) row.rv = cur;
      toast("✓ Saved. The trainee sees it under the check.");
    }catch(err){ toast("Couldn’t save. Check your connection."); }
    btn.disabled = false; render();
  }
};
ftAdminTab("drivetrackers", "📁 Drive Trackers", renderAdminDrive);

// the Scorecard (js/ft-program.js): the tracker days and the Monitoring Sheet, the trainer's score else the check
window.ftDriveItems = ctx => {
  const rv = ctx.rec["trackerreview:"] || {}, out = [];
  const days = Object.entries(rv.days || {}).filter(([d, x]) => x && x.source === "drive");
  if(days.length){ const vals = days.map(([d, x]) => tScore(x) != null ? tScore(x) : x.pct).filter(v => typeof v === "number");
    out.push({name:`Daily Task Tracker · ${days.length} day${days.length === 1 ? "" : "s"}`, pct:vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, note:"The average of the days (the trainer’s score where given)"}); }
  const m = rv.monitor;
  if(m && !m.error) out.push({name:"Training Monitoring Sheet", pct:tScore(m) != null ? tScore(m) : m.pct, note:tScore(m) != null ? "Trainer’s score" : `${m.found} of ${m.total} discussions found`});
  return out;
};

(function(){ const s = document.createElement("style"); s.id = "ft-drive"; s.textContent = `
main.main-fdr{max-width:1000px;margin:0 auto;padding:24px 16px 40px;}
.fdr-hero h1{margin:0 0 6px;color:var(--navy);font-size:28px;} .fdr-hero > p{margin:0 0 12px;color:var(--ink-soft);font-size:15px;} .fdr-hero a.btn{text-decoration:none;}
.fdr-card{padding:18px 20px;margin-bottom:16px;} .fdr-card h2{margin:0 0 6px;color:var(--navy);font-size:20px;} .fdr-card h3{margin:14px 0 4px;color:var(--navy);font-size:16px;}
.fdr-muted{color:var(--ink-soft);font-size:13.5px;} .fdr-err{color:var(--danger);font-weight:700;}
.fdr-l{display:block;margin:10px 0;} .fdr-l > span{display:block;font-weight:700;color:var(--navy);font-size:14px;margin-bottom:4px;} .fdr-l small{color:var(--ink-soft);font-size:12.5px;}
.fdr-row{display:flex;gap:8px;align-items:center;margin:4px 0;} .fdr-row input{flex:1;min-width:0;font:inherit;font-weight:500;font-size:14px;padding:7px 10px;border:1px solid var(--line);border-radius:8px;}
.fdr-row .fdr-label{flex:0 1 240px;} .fdr-row a.btn{text-decoration:none;}
.fdr-day{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;} .fdr-day select{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;}
.fdr-res-h{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:6px 0;} .fdr-pct{font-size:22px;font-weight:800;} .fdr-pct.ok{color:var(--success);} .fdr-pct.mid{color:#B7791F;} .fdr-pct.bad{color:var(--danger);}
.fdr-pill{font-size:12.5px;font-weight:800;border-radius:999px;padding:3px 10px;background:#FFF3E6;color:var(--orange-deep);}
.fdr-res ul{list-style:none;margin:6px 0;padding:0;font-size:14px;} .fdr-res li{padding:5px 0;border-top:1px solid #F1F2F6;} .fdr-res li span{color:var(--ink-soft);}
.fdr-res li.ok b{color:var(--success);} .fdr-res li.miss b{color:var(--danger);}
.fdr-review{border-left:4px solid var(--navy);background:#F7F8FB;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:14px;} .fdr-review p{margin:4px 0 0;} .fdr-trainer{border-color:var(--orange);}
.fdr-tbl{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:8px;} .fdr-tbl th, .fdr-tbl td{padding:6px 8px;border-top:1px solid var(--line);text-align:left;}
.fdr-tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#6B7088;background:#F7F8FB;} .fdr-tbl td.ok{color:var(--success);} .fdr-tbl td.miss{color:var(--danger);}
.fdr-links a, .fdr-aday a{color:var(--orange-deep);font-weight:700;} .fdr-aday{border-top:1px dashed var(--line);padding:8px 0;}
`; document.head.appendChild(s); })();
})();
