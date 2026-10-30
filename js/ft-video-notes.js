/* ============================================================
   🎬 Video Notes — watching a training video is an activity, not a link. Every video in the 📋 Day decks
   (js/ft-day-decks.js) carries "📝 What I learned": the trainee writes what they took from it —
     • three key takeaways, in their own words
     • the new terms they met
     • one question for their trainer
     • how they will use it on the job
   with its checks, and 📋 Copy for my Monitoring Sheet (the Training Guide asks them to update it after the videos).
   Page: #/learn (📂 My Pages → 🎬 Video Notes) — every video of the days the trainee has reached, by day, with what
   they wrote. An admin sees every trainee's notes there. Record: learn:<id> = {v, notes: {<video key>: note}},
   the trainee's own (worker.js). An admin and 👁 Trainee view work on a test copy that is never saved.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const has = v => String(v == null ? "" : v).trim().length > 0;
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;
const saves = () => isTrainee();
// a video's key: its Drive file id, else the address itself
const keyOf = url => { const m = String(url || "").match(/\/d\/([A-Za-z0-9_-]{10,})/) || String(url || "").match(/[?&]id=([A-Za-z0-9_-]{10,})/); return m ? m[1] : String(url || "").replace(/[^A-Za-z0-9]/g, "").slice(-60); };
const words = s => (String(s || "").trim().match(/\S+/g) || []).length;

const V = {id: null, rec: null, loading: null, timer: null, cur: null, admin: null};
const blank = () => ({v: 1, notes: {}});
function load(){
  if(!saves()){ if(!V.rec || V.id !== "__copy"){ V.id = "__copy"; V.rec = blank(); } return null; }
  if(V.id === state.traineeId || V.loading) return V.loading;
  const id = state.traineeId;
  V.loading = sharedGet("learn:" + id).then(v => { V.id = id; V.rec = v && typeof v === "object" && v.notes ? v : blank(); })
    .catch(() => { V.id = id; V.rec = blank(); }).then(() => { V.loading = null; mark(); if(state.view === "learn") render(); });
  return V.loading;
}
function save(){
  if(!saves()) return;
  V.rec.updatedAt = new Date().toISOString();
  clearTimeout(V.timer);
  V.timer = setTimeout(() => sharedSet("learn:" + V.id, V.rec).then(ok => { if(ok === false) toast("Couldn’t save your notes. Check your connection."); }), 600);
}
const noteOf = url => (V.rec && V.rec.notes[keyOf(url)]) || null;
function checks(n){
  n = n || {};
  const tk = (n.takeaways || []).map(x => String(x || "").trim());
  return [["Three takeaways, each a full sentence (6+ words)", tk.length >= 3 && tk.slice(0, 3).every(x => words(x) >= 6)],
    ["The new terms you met", has(n.terms)],
    ["One question for your trainer", /\?\s*$/.test(String(n.question || "").trim())],
    ["How you’ll use it on the job (10+ words)", words(n.apply) >= 10]];
}
const complete = n => checks(n).every(c => c[1]);
// the deck's "📝 What I learned" buttons show which videos have notes
function mark(){
  document.querySelectorAll(".ftdd-learn").forEach(b => {
    const ok = complete(noteOf(b.getAttribute("data-url")));
    b.classList.toggle("done", ok); b.textContent = ok ? "✓ What I learned" : "📝 What I learned";
  });
}
const __after = window.afterRender;
window.afterRender = function(){ const r = __after ? __after.apply(this, arguments) : undefined; try{ if(document.querySelector(".ftdd-learn")){ load(); mark(); } }catch(err){} return r; };

/* ---------- the form, in a pop-up over the deck or the page ---------- */
function formHtml(v){
  const n = noteOf(v.url) || {}, tk = n.takeaways || [], cs = checks(n), done = cs.filter(c => c[1]).length;
  return `<div class="vn-box card" role="dialog" aria-label="What I learned">
    <div class="vn-h"><div><span class="vn-k">🎬 Video Notes${v.day ? ` · Day ${e(v.day)}` : ""}</span><h2>${e(v.title)}</h2></div>
      <button type="button" class="btn btn-ghost btn-sm" onclick="FTVideoNotes.close()">Close ✕</button></div>
    <div class="vn-watch"><button type="button" class="btn btn-ghost btn-sm" onclick="FTVideoNotes.watch()">▶ Watch the video</button>
      <span class="vn-muted">Watch it through, then write what you learned — in your own words, not the video’s.</span></div>
    <div class="vn-grid">
      <fieldset class="vn-f vn-wide"><legend>💡 Three key takeaways</legend>
        ${[0, 1, 2].map(i => `<label class="vn-tk"><span>${i + 1}</span><input value="${e(tk[i] || "")}" placeholder="${["The most important thing I learned…", "A step, rule or tip I must remember…", "Something that surprised me or I didn’t know…"][i]}" oninput="FTVideoNotes.set('t${i}', this.value)"></label>`).join("")}</fieldset>
      <label class="vn-f"><span>📖 New terms I met</span><input value="${e(n.terms || "")}" placeholder="e.g. DOL, LOR, declarations page" oninput="FTVideoNotes.set('terms', this.value)"></label>
      <label class="vn-f"><span>❓ My question for my trainer</span><input value="${e(n.question || "")}" placeholder="End it with a question mark?" oninput="FTVideoNotes.set('question', this.value)"></label>
      <label class="vn-f vn-wide"><span>🛠 How I’ll use it on the job</span><textarea rows="3" placeholder="When I … I will …" oninput="FTVideoNotes.set('apply', this.value)">${e(n.apply || "")}</textarea></label>
    </div>
    <div class="vn-foot"><ul class="vn-checks">${cs.map(c => `<li class="${c[1] ? "ok" : ""}">${c[1] ? "✓" : "○"} ${e(c[0])}</li>`).join("")}</ul>
      <div class="vn-acts"><span class="vn-pct ${done === cs.length ? "ok" : ""}">${done} of ${cs.length}</span>
        <button type="button" class="btn btn-ghost btn-sm" onclick="FTVideoNotes.copy()">📋 Copy for my Monitoring Sheet</button>
        <button type="button" class="btn btn-navy btn-sm" onclick="FTVideoNotes.close()">✓ Done</button></div></div>
    ${saves() ? "" : `<p class="vn-muted">Test copy — nothing here is saved.</p>`}
  </div>`;
}
function paint(){
  const o = document.getElementById("vnModal"); if(!o || !V.cur) return;
  const n = noteOf(V.cur.url) || {}, cs = checks(n), done = cs.filter(c => c[1]).length;
  const ul = o.querySelector(".vn-checks"); if(ul) ul.innerHTML = cs.map(c => `<li class="${c[1] ? "ok" : ""}">${c[1] ? "✓" : "○"} ${e(c[0])}</li>`).join("");
  const p = o.querySelector(".vn-pct"); if(p){ p.textContent = `${done} of ${cs.length}`; p.classList.toggle("ok", done === cs.length); }
}
function open(v){
  load();
  if(saves() && V.id !== state.traineeId){ (V.loading || Promise.resolve()).then(() => open(v)); return; }
  V.cur = v;
  let o = document.getElementById("vnModal");
  if(!o){ o = document.createElement("div"); o.id = "vnModal"; o.className = "vn-modal"; o.addEventListener("click", ev => { if(ev.target === o) window.FTVideoNotes.close(); }); document.body.appendChild(o); }
  o.innerHTML = formHtml(v); o.style.display = "flex";
  const first = o.querySelector(".vn-tk input"); if(first) first.focus();
}
document.addEventListener("keydown", ev => { if(ev.key === "Escape" && document.getElementById("vnModal") && document.getElementById("vnModal").style.display === "flex") window.FTVideoNotes.close(); });

/* ---------- 🎬 Video Notes page: every video of the days reached ---------- */
function daysReached(){
  const n = (root().FTDays && FTDays.COUNT) || 16, out = [];
  for(let d = 1; d <= n; d++) if(!root().FTDayDecks || FTDayDecks.dayOpen(d)) out.push(d);
  return out;
}
const root = () => window;
function renderPage(){
  load();
  if(window.FTDayDecks && !window.FT_DAY_DECKS){ FTDayDecks.load().then(() => { if(state.view === "learn") render(); }); return `<div class="card" style="padding:24px;">Loading the videos…</div>`; }
  if(saves() && V.id !== state.traineeId) return `<div class="card" style="padding:24px;">Loading your notes…</div>`;
  const days = daysReached().map(d => ({d, vids: FTDayDecks.videos(d)})).filter(x => x.vids.length);
  const all = days.reduce((a, x) => a.concat(x.vids), []), done = all.filter(v => complete(noteOf(v.url))).length;
  return `${adminOn() ? renderAdmin() : ""}
    <div class="vn-hero"><p class="vn-k">📂 My Pages</p><h1>🎬 Video Notes</h1>
      <p>Every training video of the days you’ve reached. After each one, write what you learned — your takeaways, the new terms, a question for your trainer, and how you’ll use it on the job.</p>
      <div class="vn-bar"><span style="width:${all.length ? Math.round(done / all.length * 100) : 0}%"></span></div><p class="vn-prog">${done} of ${all.length} videos with notes</p></div>
    ${days.map(x => `<section class="card vn-day"><h2>Day ${x.d}${window.FTDays && FTDays.of(x.d) ? ` · ${e(FTDays.of(x.d).role)}` : ""}</h2>
      <div class="vn-list">${x.vids.map(v => { const n = noteOf(v.url), ok = complete(n);
        return `<button type="button" class="vn-item${ok ? " ok" : n ? " part" : ""}" data-url="${e(v.url)}" data-title="${e(v.title)}" data-day="${x.d}" onclick="FTVideoNotes.openFrom(this)">
          <span class="vn-ic">${ok ? "✓" : "🎬"}</span><span class="vn-t"><b>${e(v.title)}</b><small>${ok ? "Notes written" : n ? "Notes started" : "No notes yet"}</small></span></button>`; }).join("")}</div></section>`).join("")}
    ${!days.length ? `<div class="card" style="padding:20px;">No videos yet: they appear here as you reach each day.</div>` : ""}`;
}
async function loadAdmin(){
  V.admin = {rows: null};
  try{
    const ids = ((await sharedList("trainee:")) || []).map(k => String(k).replace(/^trainee:/, ""));
    const get = window.ftGetMany || sharedGetMany;
    const people = await get(ids.map(id => "trainee:" + id));
    const rows = ids.map((id, i) => ({id, p: people[i] || {}})).filter(x => x.p.approved && !x.p.archived);
    const recs = await get(rows.map(x => "learn:" + x.id));
    rows.forEach((x, i) => { x.r = recs[i] || null; });
    V.admin.rows = rows.sort((a, b) => String(a.p.name || "").localeCompare(String(b.p.name || "")));
  }catch(err){ V.admin.rows = []; }
  if(state.view === "learn") render();
}
function renderAdmin(){
  if(!V.admin) loadAdmin();
  const rows = V.admin && V.admin.rows;
  return `<section class="card vn-admin"><h2>🧑‍🏫 Trainees’ video notes</h2>
    ${!rows ? "<p>Loading…</p>" : !rows.length ? `<p class="vn-muted">No approved trainees yet.</p>` : `<table class="vn-tbl"><thead><tr><th>Trainee</th><th>Batch</th><th>Videos with notes</th></tr></thead><tbody>
      ${rows.map(x => { const ns = Object.values((x.r && x.r.notes) || {}); const ok = ns.filter(complete);
        return `<tr><td>${e(x.p.name || x.id)}</td><td>${e(x.p.batch || "")}</td><td>${ok.length} complete${ns.length > ok.length ? ` · ${ns.length - ok.length} started` : ""}
          ${ns.length ? `<details><summary>Read</summary><div class="vn-read">${ns.map(n => `<p><b>${e(n.title || "Video")}${n.day ? ` (Day ${e(n.day)})` : ""}</b><br>${(n.takeaways || []).filter(has).map((t, i) => `${i + 1}. ${e(t)}`).join("<br>")}${has(n.terms) ? `<br><i>Terms:</i> ${e(n.terms)}` : ""}${has(n.question) ? `<br><i>Question:</i> ${e(n.question)}` : ""}${has(n.apply) ? `<br><i>On the job:</i> ${e(n.apply)}` : ""}</p>`).join("")}</div></details>` : ""}</td></tr>`; }).join("")}</tbody></table>`}
    <button type="button" class="btn btn-ghost btn-sm" onclick="FTVideoNotes.reloadAdmin()">↻ Refresh</button></section>`;
}

window.FTVideoNotes = {
  openFrom(b){ open({url: b.getAttribute("data-url"), title: b.getAttribute("data-title") || "Video", day: Number(b.getAttribute("data-day")) || (window.FTDayDecks && state.view === "daydeck" ? FTDayDecks.day() : null)}); },
  open,
  set(k, v){
    if(!V.cur) return;
    const key = keyOf(V.cur.url), n = V.rec.notes[key] || (V.rec.notes[key] = {title: V.cur.title, day: V.cur.day || null, url: V.cur.url, takeaways: ["", "", ""]});
    if(/^t\d$/.test(k)){ n.takeaways = n.takeaways || ["", "", ""]; n.takeaways[Number(k.slice(1))] = v; } else n[k] = v;
    n.updatedAt = new Date().toISOString(); save(); paint();
  },
  watch(){ if(V.cur && typeof window.lvOpen === "function") lvOpen({kind: "video", title: V.cur.title, url: V.cur.url}); else if(V.cur) window.open(V.cur.url, "_blank", "noopener"); },
  async copy(){
    const n = noteOf(V.cur && V.cur.url) || {};
    const text = [`${V.cur.title}${V.cur.day ? ` (Day ${V.cur.day})` : ""}`, "Takeaways:", ...(n.takeaways || []).filter(has).map((t, i) => `${i + 1}. ${t}`),
      has(n.terms) ? `New terms: ${n.terms}` : "", has(n.question) ? `Question: ${n.question}` : "", has(n.apply) ? `On the job: ${n.apply}` : ""].filter(Boolean).join("\n");
    try{ await navigator.clipboard.writeText(text); toast("📋 Copied — paste it into your Monitoring Sheet."); }catch(err){ toast("Couldn’t copy. Select the text and copy it yourself."); }
  },
  close(){ const o = document.getElementById("vnModal"); if(o) o.style.display = "none"; V.cur = null; mark(); if(state.view === "learn") render(); },
  reloadAdmin(){ V.admin = null; render(); },
  checks, keyOf, note: url => noteOf(url)
};

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["learn"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {learn: "Video Notes"});
const __render = window.render;
window.render = function(){
  if(state.view !== "learn") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-vn"><a class="back-link" onclick="goto('modules')">&larr; Back to 📚 Dashboard</a>${renderPage()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};

(function(){ const s = document.createElement("style"); s.id = "ft-video-notes"; s.textContent = `
.vn-modal{position:fixed;inset:0;z-index:9000;background:rgba(22,24,41,.55);display:none;align-items:center;justify-content:center;padding:16px;}
.vn-box{width:min(820px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:18px 22px;border-top:5px solid #2E7D4F;}
.vn-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;}
.vn-k{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2E7D4F;}
.vn-h h2{margin:2px 0 0;font:800 20px/1.25 'Poppins','Inter',sans-serif;color:#262B45;}
.vn-watch{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 12px;}
.vn-muted{color:var(--ink-soft);font-size:12.5px;}
.vn-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;}
.vn-f{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:#262B45;border:none;margin:0;padding:0;}
.vn-f legend{padding:0;margin-bottom:6px;}
.vn-wide{grid-column:1 / -1;}
.vn-f input, .vn-f textarea, .vn-tk input{font:400 14.5px/1.45 'Inter',sans-serif;border:1px solid #CBD2DF;border-radius:8px;padding:8px 10px;width:100%;box-sizing:border-box;}
.vn-f input:focus, .vn-f textarea:focus, .vn-tk input:focus{outline:2px solid #A9DDBF;border-color:#2E7D4F;}
.vn-tk{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.vn-tk span{flex:0 0 auto;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#2E7D4F;color:#fff;font-weight:800;}
.vn-foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-top:12px;}
.vn-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--ink-soft);}
.vn-checks li.ok{color:#1F5B39;font-weight:600;}
.vn-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.vn-pct{border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:800;background:#FFF1E2;color:#B5651F;} .vn-pct.ok{background:#EEF8F2;color:#1F5B39;}
main.main-vn{max-width:1100px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:14px;}
.vn-hero{background:#262B45;color:#fff;border-radius:18px;padding:18px 24px;}
.vn-hero .vn-k{color:#A9DDBF;} .vn-hero h1{margin:2px 0 6px;font:800 28px 'Poppins','Inter',sans-serif;color:#fff;} .vn-hero p{margin:0;color:#DDE2EE;}
.vn-bar{height:10px;border-radius:999px;background:rgba(255,255,255,.15);margin-top:12px;overflow:hidden;} .vn-bar span{display:block;height:100%;background:#2E7D4F;}
.vn-prog{margin-top:6px !important;font-size:13px;font-weight:700;}
.vn-day{padding:14px 16px;} .vn-day h2{margin:0 0 10px;color:#262B45;font-size:17px;}
.vn-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;}
.vn-item{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid #E6E1D8;border-left:5px solid #DB8437;background:#fff;cursor:pointer;font:inherit;}
.vn-item.part{border-left-color:#F0C08A;} .vn-item.ok{border-left-color:#2E7D4F;background:#F3FAF6;}
.vn-ic{flex:0 0 auto;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:#262B45;color:#fff;font-size:18px;}
.vn-item.ok .vn-ic{background:#2E7D4F;}
.vn-t b{display:block;font-size:14px;color:#262B45;} .vn-t small{color:var(--ink-soft);font-size:12.5px;}
.vn-admin{padding:14px 16px;} .vn-admin h2{margin:0 0 6px;color:#262B45;}
.vn-tbl{width:100%;border-collapse:collapse;font-size:13.5px;margin:8px 0;} .vn-tbl th, .vn-tbl td{border-bottom:1px solid var(--line,#e5e7eb);padding:8px;text-align:left;vertical-align:top;}
.vn-read{max-height:300px;overflow:auto;background:#F6F7FB;border-radius:8px;padding:8px 10px;margin-top:6px;}
@media(max-width:640px){.vn-grid{grid-template-columns:minmax(0,1fr);}}
`; document.head.appendChild(s); })();
})();
