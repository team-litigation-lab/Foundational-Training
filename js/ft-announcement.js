/* ============================================================
   📢 ANNOUNCEMENT TICKER — this platform's own, for the Foundational trainees only: a trainer sets it in Admin → 📢
   Announcements (one for the whole platform and one per lesson; the Main Portal's broadcast isn't shown or edited here),
   and every page shows it in a bar under the top bar, with the live clock and its time zone, as the Training Directory
   does. Read through worker.js /api/announcement (its "own"), again every 5 minutes; filled in place, so nothing
   re-renders for it.
   Loaded last: it wraps renderTopbar as every page has drawn it.
   ============================================================ */
(function(){
"use strict";
const A = {text: "", own: {platform: null, lessons: {}}, at: 0, loading: false};
// 📢 what the ticker says: this platform's announcement, then the lesson's (the one being shown, else the trainee's current
// one) — or, on a Day deck, only that lesson's (a deck stays as large as the screen allows)
const lessonText = l => l != null && A.own.lessons && A.own.lessons[l] ? A.own.lessons[l].text : "";
const DD_ = () => window.FTDayDecks || {};
function shown(){
  const onDeck = typeof state !== "undefined" && state.view === "daydeck";
  if(onDeck) return lessonText(DD_().deckLesson ? DD_().deckLesson() : null);
  let l = null; try{ l = DD_().placeLesson ? DD_().placeLesson() : null; }catch(e){}
  return [A.own.platform && A.own.platform.text, lessonText(l)].filter(Boolean).join("     ✦     ");
}
// (a trainer — not in 👁 Trainee view — always sees the bar, with ✏️ Edit, so an announcement can be added from any page)
const isTrainer = () => typeof state !== "undefined" && !!state.isAdmin && !state.adminPreview;
const TZS = [["Asia/Manila", "Manila (PHT)"], ["UTC", "UTC"], ["America/New_York", "New York (ET)"], ["America/Los_Angeles", "Los Angeles (PT)"]];
const esc_ = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const tz = () => { try{ const v = localStorage.getItem("ft_ann_tz"); if(TZS.some(([z]) => z === v)) return v; }catch(e){} return "Asia/Manila"; };
const clock = () => { try{ return new Intl.DateTimeFormat("en-US", {year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz(), hour12: true}).format(new Date()); }catch(e){ return ""; } };
function fill(){
  const t = shown() || (isTrainer() ? "No announcement yet. Press ✏️ Edit to add one." : "");
  document.querySelectorAll("[data-ft-ann-text]").forEach(el => { if(el.textContent !== t) el.textContent = t; });
  document.querySelectorAll("[data-ft-ann]").forEach(el => { el.hidden = !t; });
  document.querySelectorAll("[data-ft-ann-lesson]").forEach(el => { const x = lessonText(Number(el.dataset.ftAnnLesson)); el.hidden = !x; const b = el.querySelector("b + span"); if(b && b.textContent !== x) b.textContent = x; });
}
// (POST: the Worker's /api/ routes are POST only)
async function load(){
  if(A.loading || (A.at && Date.now() - A.at < 5 * 60 * 1000)) return;
  A.loading = true;
  try{ const r = await fetch("/api/announcement", {method: "POST", headers: {"Content-Type": "application/json"}, body: "{}", cache: "no-store"}); const j = r.ok ? await r.json() : null; A.text = j && typeof j.text === "string" ? j.text : A.text; if(j && j.ok) A.own = {platform: (j.own && j.own.platform) || null, lessons: (j.own && j.own.lessons) || {}}; }catch(e){}
  A.at = Date.now(); A.loading = false; fill();
}
// (on a Day deck: only the lesson's own announcement, when it has one — a deck is drawn as large as the screen allows)
function bar(){
  load();
  const t = shown() || (isTrainer() ? "No announcement yet. Press ✏️ Edit to add one." : "");
  return `<div class="ft-ann no-print" data-ft-ann${t ? "" : " hidden"}><div class="ft-ann-in">
    <div class="ft-ann-tick"><span class="ft-ann-tag">Announcement</span><div class="ft-ann-view"><div class="ft-ann-track"><span data-ft-ann-text>${esc_(t)}</span></div></div></div>
    ${typeof state !== "undefined" && state.isAdmin && !state.adminPreview ? `<button type="button" class="ft-ann-edit" title="Edit this platform's and each lesson's announcement" data-ft-ann-edit>✏️ Edit</button>` : ""}
    <div class="ft-ann-clock"><span data-ft-ann-clock>${esc_(clock())}</span><select aria-label="Time zone" onchange="FTAnnouncement.tz(this.value)">${TZS.map(([z, l]) => `<option value="${z}"${z === tz() ? " selected" : ""}>${l}</option>`).join("")}</select></div>
  </div></div>`;
}
const __top = window.renderTopbar;
if(typeof __top === "function") window.renderTopbar = function(){ return __top.apply(this, arguments) + bar(); };
setInterval(() => { const t = clock(); document.querySelectorAll("[data-ft-ann-clock]").forEach(el => { el.textContent = t; }); }, 1000);
setInterval(() => { A.at = 0; load(); }, 5 * 60 * 1000);
/* 📝 Admin → 📢 Announcements: this platform's own announcement and each lesson's (settings:announcements, read back through
   worker.js /api/announcement), for the Foundational trainees only: standalone, the Main Portal's broadcast is the Portal's own. */
const ED = {rec: null, loading: false, saving: false};
function editorHtml(){
  if(!ED.rec && !ED.loading){ ED.loading = true; Promise.resolve(typeof sharedGet === "function" ? sharedGet("settings:announcements") : null).then(v => { ED.rec = v && typeof v === "object" ? v : {}; ED.loading = false; if(state.view === "admin") render(); }).catch(() => { ED.rec = {}; ED.loading = false; if(state.view === "admin") render(); }); }
  if(!ED.rec) return `<div class="card" style="padding:20px">Loading the announcements…</div>`;
  const ls = DD_().lessons ? DD_().lessons() : [], nameOf = l => (typeof ftName === "function" ? ftName(l) : "Lesson " + l) + (DD_().lessonFocus && DD_().lessonFocus(l) ? " · " + DD_().lessonFocus(l) : "");
  const val = x => esc_((x && x.text) || ""), when = x => x && x.at ? ` <small class="ann-ed-when">saved ${esc_(new Date(x.at).toLocaleString())}${x.by ? " by " + esc_(x.by) : ""}</small>` : "";
  return `<div class="card ann-ed"><h3>📢 Announcements <small class="ann-ed-when">for the Foundational trainees only</small></h3>
    <label class="ann-ed-row"><span>🌐 All Foundational trainees${when(ED.rec.platform)}</span><textarea data-ann="platform" maxlength="500" rows="2" placeholder="No announcement">${val(ED.rec.platform)}</textarea></label>
    ${ls.map(l => `<label class="ann-ed-row"><span>📘 ${esc_(nameOf(l))}${when((ED.rec.lessons || {})[l])}</span><textarea data-ann="${l}" maxlength="500" rows="2" placeholder="No announcement">${val((ED.rec.lessons || {})[l])}</textarea></label>`).join("")}
    <div class="ann-ed-act"><button type="button" class="btn btn-primary" onclick="FTAnnouncement.save(this)"${ED.saving ? " disabled" : ""}>💾 Save the announcements</button></div></div>`;
}
async function save(btn){
  const box = btn.closest(".ann-ed"); if(!box) return;
  const by = String(state.certName || state.adminName || "Trainer").slice(0, 80), at = new Date().toISOString(), cur = ED.rec || {};
  const keep = (old, text) => !text ? null : old && old.text === text ? old : {text, by, at};
  const next = {platform: null, lessons: {}};
  box.querySelectorAll("[data-ann]").forEach(t => { const text = String(t.value || "").replace(/\s+/g, " ").trim().slice(0, 500), k = t.dataset.ann;
    if(k === "platform") next.platform = keep(cur.platform, text); else { const v = keep((cur.lessons || {})[k], text); if(v) next.lessons[k] = v; } });
  ED.saving = true; btn.disabled = true;
  const ok = typeof sharedSet === "function" ? await sharedSet("settings:announcements", next) : false;
  ED.saving = false; btn.disabled = false;
  if(ok === false){ if(typeof toast === "function") toast("Couldn’t save. Check your connection."); return; }
  ED.rec = next; if(typeof toast === "function") toast("✓ Announcements saved: the ticker shows them now.");
  A.at = 0; await load(); if(typeof render === "function") render();
}
// ✏️ Edit on the bar: out of 👁 Trainee view if need be, to Admin → 📢 Announcements, read fresh, the first box focused.
// (a click listener of its own, caught first, so nothing else on the page can take the click)
function edit(){
  // (trainees have no edit: only a trainer, or a trainer in 👁 Trainee view; the Worker refuses a trainee's write too)
  if(typeof state === "undefined" || (!state.isAdmin && !state.adminPreview)) return;
  if(state.adminPreview && typeof setAdminViewMode === "function") setAdminViewMode("admin");
  if(!state.isAdmin){ if(typeof openAdmin === "function") openAdmin(); return; }
  ED.rec = null; state.adminTab = "announcements";
  if(typeof goto === "function") goto("admin"); else if(typeof render === "function") render();
  let n = 0; const focus = () => { const t = document.querySelector('.ann-ed textarea[data-ann="platform"]');
    if(t){ t.scrollIntoView({block: "center"}); t.focus({preventScroll: true}); } else if(++n < 30) setTimeout(focus, 150); };
  setTimeout(focus, 100);
}
document.addEventListener("click", ev => { const b = ev.target && ev.target.closest && ev.target.closest("[data-ft-ann-edit]"); if(!b) return;
  ev.preventDefault(); ev.stopPropagation(); edit(); }, true);
if(typeof ftAdminTab === "function") ftAdminTab("announcements", "📢 Announcements", editorHtml);
// (each lesson's announcement on its cards, js/ft-day-decks.js)
const lessonHtml = l => { const x = lessonText(l); return `<div class="ftlc-ann" data-ft-ann-lesson="${esc_(l)}"${x ? "" : " hidden"}><b>📢 Announcement</b> <span>${esc_(x)}</span></div>`; };
window.FTAnnouncement = {
  save, lessonHtml, edit,
  tz(v){ try{ localStorage.setItem("ft_ann_tz", v); }catch(e){} const t = clock(); document.querySelectorAll("[data-ft-ann-clock]").forEach(el => { el.textContent = t; }); },
  text: () => A.text, reload(){ A.at = 0; return load(); }
};

(function(){ const s = document.createElement("style"); s.id = "ft-announcement"; s.textContent = `
.ft-ann{background:#0b1733;color:#cbd5e1;border-bottom:1px solid rgba(255,255,255,.08);}
.ft-ann[hidden]{display:none;}
.ft-ann-in{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:7px 28px;max-width:1880px;margin:0 auto;}
.ft-ann-tick{display:flex;align-items:center;gap:10px;flex:1 1 260px;min-width:0;overflow:hidden;white-space:nowrap;}
.ft-ann-tag{display:inline-flex;align-items:center;gap:6px;background:#f97316;color:#081226;font:900 10.5px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;
  padding:5px 10px;border-radius:999px;flex-shrink:0;box-shadow:0 0 0 3px rgba(249,115,22,.18),0 0 14px rgba(249,115,22,.45);}
.ft-ann-tag::before{content:"";width:7px;height:7px;border-radius:50%;background:#fff;animation:ft-ann-pulse 1.6s ease-in-out infinite;}
@keyframes ft-ann-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.7);}}
.ft-ann-view{flex:1 1 auto;min-width:0;overflow:hidden;padding:5px 0;border-radius:8px;background:rgba(249,115,22,.10);border:1px solid rgba(253,186,116,.40);
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);}
.ft-ann-track{display:inline-block;white-space:nowrap;padding-left:100%;animation:ft-ann-scroll 22s linear infinite;font:700 14px/1.3 Arial,sans-serif;letter-spacing:.01em;color:#fde68a;text-shadow:0 0 10px rgba(253,230,138,.35);}
.ft-ann-view:hover .ft-ann-track{animation-play-state:paused;}
@keyframes ft-ann-scroll{from{transform:translateX(0);}to{transform:translateX(-100%);}}
.ft-ann-edit{flex:none;margin:0 10px;padding:3px 10px;border:1px solid rgba(253,186,116,.6);border-radius:999px;background:rgba(253,186,116,.12);color:#fdba74;font:700 11.5px Arial,sans-serif;cursor:pointer;white-space:nowrap;}.ft-ann-edit:hover{background:rgba(253,186,116,.25);}
.ft-ann-clock{display:flex;align-items:center;gap:6px;color:#cbd5e1;font:600 11.5px Arial,sans-serif;white-space:nowrap;}
.ft-ann-clock select{border:none;background:none;font:inherit;font-weight:700;color:#fdba74;cursor:pointer;}
.ft-ann-clock select option{color:#0b1733;}
@media (max-width:640px){.ft-ann-in{padding:7px 16px;gap:8px 14px;}}
@media (prefers-reduced-motion:reduce){.ft-ann-tag::before{animation:none;}.ft-ann-track{animation:none;padding-left:0;}}
@media print{.ft-ann{display:none;}}
.ftlc-ann{margin:0 0 10px;padding:8px 10px;border-radius:10px;background:#FFF7ED;border:1px solid #FDBA74;color:#7C2D12;font:600 13.5px/1.4 Arial,sans-serif;}
.ftlc-ann[hidden]{display:none;} .ftlc-ann b{color:#C2410C;margin-right:4px;}
.ann-ed{padding:20px 24px;max-width:980px;} .ann-ed-note{color:#475569;margin:4px 0 14px;}
.ann-ed-row{display:block;margin:0 0 12px;} .ann-ed-row span{display:block;font-weight:700;color:#1E2340;margin-bottom:4px;} .ann-ed-when{font-weight:500;color:#64748B;}
.ann-ed-row textarea{width:100%;box-sizing:border-box;font:15px/1.4 Arial,sans-serif;padding:8px 10px;border:1px solid #CBD5E1;border-radius:8px;}
.ann-ed-act{display:flex;justify-content:flex-end;margin-top:6px;}`; document.head.appendChild(s); })();
})();
