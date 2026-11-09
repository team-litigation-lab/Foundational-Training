/* ============================================================
   📢 ANNOUNCEMENT TICKER — the same broadcast the LSH Training Portal's Training Directory shows: an admin sets it in the
   Portal's Master Control (Broadcast & Ping), and every page of this platform shows it in a bar under the top bar, with
   the live clock and its time zone, as the Training Directory does. Read through worker.js /api/announcement (the Portal's
   public /api/announcement, kept a minute), again every 5 minutes; filled in place, so nothing re-renders for it.
   Loaded last: it wraps renderTopbar as every page has drawn it.
   ============================================================ */
(function(){
"use strict";
const A = {text: "", at: 0, loading: false};
const TZS = [["Asia/Manila", "Manila (PHT)"], ["UTC", "UTC"], ["America/New_York", "New York (ET)"], ["America/Los_Angeles", "Los Angeles (PT)"]];
const esc_ = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const tz = () => { try{ const v = localStorage.getItem("ft_ann_tz"); if(TZS.some(([z]) => z === v)) return v; }catch(e){} return "Asia/Manila"; };
const clock = () => { try{ return new Intl.DateTimeFormat("en-US", {year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz(), hour12: true}).format(new Date()); }catch(e){ return ""; } };
function fill(){
  document.querySelectorAll("[data-ft-ann-text]").forEach(el => { if(el.textContent !== A.text) el.textContent = A.text; });
  document.querySelectorAll("[data-ft-ann]").forEach(el => { el.hidden = !A.text; });
}
// (POST: the Worker's /api/ routes are POST only)
async function load(){
  if(A.loading || (A.at && Date.now() - A.at < 5 * 60 * 1000)) return;
  A.loading = true;
  try{ const r = await fetch("/api/announcement", {method: "POST", headers: {"Content-Type": "application/json"}, body: "{}", cache: "no-store"}); const j = r.ok ? await r.json() : null; A.text = j && typeof j.text === "string" ? j.text : A.text; }catch(e){}
  A.at = Date.now(); A.loading = false; fill();
}
function bar(){
  load();
  return `<div class="ft-ann no-print" data-ft-ann${A.text ? "" : " hidden"}><div class="ft-ann-in">
    <div class="ft-ann-tick"><span class="ft-ann-tag">Announcement</span><div class="ft-ann-view"><div class="ft-ann-track"><span data-ft-ann-text>${esc_(A.text)}</span></div></div></div>
    <div class="ft-ann-clock"><span data-ft-ann-clock>${esc_(clock())}</span><select aria-label="Time zone" onchange="FTAnnouncement.tz(this.value)">${TZS.map(([z, l]) => `<option value="${z}"${z === tz() ? " selected" : ""}>${l}</option>`).join("")}</select></div>
  </div></div>`;
}
const __top = window.renderTopbar;
if(typeof __top === "function") window.renderTopbar = function(){ return __top.apply(this, arguments) + bar(); };
setInterval(() => { const t = clock(); document.querySelectorAll("[data-ft-ann-clock]").forEach(el => { el.textContent = t; }); }, 1000);
setInterval(() => { A.at = 0; load(); }, 5 * 60 * 1000);
window.FTAnnouncement = {
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
.ft-ann-clock{display:flex;align-items:center;gap:6px;color:#cbd5e1;font:600 11.5px Arial,sans-serif;white-space:nowrap;}
.ft-ann-clock select{border:none;background:none;font:inherit;font-weight:700;color:#fdba74;cursor:pointer;}
.ft-ann-clock select option{color:#0b1733;}
@media (max-width:640px){.ft-ann-in{padding:7px 16px;gap:8px 14px;}}
@media (prefers-reduced-motion:reduce){.ft-ann-tag::before{animation:none;}.ft-ann-track{animation:none;padding-left:0;}}
@media print{.ft-ann{display:none;}}`; document.head.appendChild(s); })();
})();
