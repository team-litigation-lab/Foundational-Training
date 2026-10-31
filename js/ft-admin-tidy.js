/* ============================================================
   🛡 Admin screen tidy-up (loaded last):
     • Only the current batch stays active. When a newer batch has approved trainees, each older active
       batch is archived automatically, once. A batch a trainer restores (📁 Batch Folders → ↩ Restore
       batch) is not archived again. settings:autoarchive = {done:{<batch>:<ISO date>}}.
       The current batch is the active one that started last: a Batch ID is B + MMDDYY, else the latest
       registration in it. Archiving deletes nothing: the records stay in the 📦 Archive shelf.
     • No 🎲 Tasks button in the top bar (taken off for trainees and in 👁 Switch View).
     • The Admin screen sits on a solid panel with darker, bolder text, so it reads over the background photo.
   ============================================================ */
(function(){
"use strict";
const KEY = "settings:autoarchive";
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;
const keyOf = r => typeof batchKey === "function" ? batchKey(r) : (r.batch || "");
const startOf = b => { const m = /^B(\d{2})(\d{2})(\d{2})$/.exec(String(b || "")); return m ? Date.UTC(2000 + Number(m[3]), Number(m[1]) - 1, Number(m[2])) : 0; };
let running = false;

async function autoArchive(){
  if(running || !adminOn() || !Array.isArray(state.adminData)) return;
  const live = state.adminData.filter(r => r && r.approved === true && !r.archived && !r.rejected && keyOf(r) && (typeof NO_BATCH === "undefined" || keyOf(r) !== NO_BATCH));
  const batches = {};
  live.forEach(r => { const k = keyOf(r), t = Date.parse(r.registeredAt || "") || 0; batches[k] = Math.max(batches[k] || 0, t); });
  const order = Object.keys(batches).sort((a, b) => (startOf(b) || batches[b]) - (startOf(a) || batches[a]));
  if(order.length < 2) return;
  running = true;
  try{
    const rec = (await sharedGet(KEY).catch(() => null)) || {};
    const done = rec.done || {};
    const old = order.slice(1).filter(b => !done[b]);
    if(!old.length) return;
    const at = new Date().toISOString();
    for(const b of old){
      for(const r of live.filter(x => keyOf(x) === b)){ r.archived = true; r.archivedAt = at; r.autoArchived = true; await sharedSet("trainee:" + r.id, r); }
      done[b] = at;
    }
    await sharedSet(KEY, {done, current:order[0], updatedAt:at});
    if(typeof toast === "function") toast(`Only the current batch (${order[0]}) is kept active: ${old.join(", ")} moved to the 📦 Archive shelf.`);
    if(state.view === "admin") render();
  }catch(err){ /* best effort: tried again on the next load */ }
  finally{ running = false; }
}
const __ledger = window.loadAdminLedger;
if(typeof __ledger === "function") window.loadAdminLedger = async function(){
  await __ledger.apply(this, arguments);
  autoArchive();
};

const __top = window.renderTopbar;
if(typeof __top === "function") window.renderTopbar = function(){
  const html = __top.apply(this, arguments);
  if(html.indexOf("goto('tasks')") < 0) return html;
  const t = document.createElement("template"); t.innerHTML = html;
  t.content.querySelectorAll(`.topbar .nav [onclick="goto('tasks')"]`).forEach(b => b.remove());
  return t.innerHTML;
};

const __admin = window.renderAdmin;
if(typeof __admin === "function") window.renderAdmin = function(){
  return `<div class="ft-admin-screen">${__admin.apply(this, arguments)}</div>`;
};

const st = document.createElement("style"); st.id = "ft-admin-tidy"; st.textContent = `
/* a solid panel over the background photo, dark bold text */
.ft-admin-screen{background:#FFFFFF;border-radius:16px;padding:20px 24px 26px;box-shadow:0 10px 30px rgba(14,18,40,.28);color:#141A2E;font-weight:600;}
.ft-admin-screen p, .ft-admin-screen li, .ft-admin-screen label, .ft-admin-screen td{color:#141A2E;}
.ft-admin-screen [style*="--ink-soft"], .ft-admin-screen .ops-muted, .ft-admin-screen .ops-empty, .ft-admin-screen .sc-about,
.ft-admin-screen .cert-settings p, .ft-admin-screen .ops-hero > p{color:#2E3450 !important;}
.ft-admin-screen h1, .ft-admin-screen h2, .ft-admin-screen h3, .ft-admin-screen b, .ft-admin-screen strong{color:#1B2240;font-weight:800;}
.ft-admin-screen .eyebrow, .ft-admin-screen .lp-eyebrow{color:#8A4A00 !important;font-weight:800;}
.ft-admin-screen .admin-tab-btn{font-weight:700;color:#1B2240 !important;}
.ft-admin-screen .admin-tab-btn.active{font-weight:800;}
.ft-admin-screen .lp-admin-sec{font-weight:800;color:#1B2240;border-color:#9CA3BD;}
.ft-admin-screen .lp-admin-sec.active{color:#fff;}
.ft-admin-screen .lp-admin-sec span{color:#1B2240;background:#DCE0EC;}
.ft-admin-screen .lp-admin-sec.active span{color:#fff;background:rgba(255,255,255,.25);}
.ft-admin-screen .btn{font-weight:700;}
.ft-admin-screen .btn-ghost{color:#1B2240;border-color:#9CA3BD;}
.ft-admin-screen input, .ft-admin-screen select, .ft-admin-screen textarea{font-weight:600;color:#141A2E;border-color:#9CA3BD !important;}
.ft-admin-screen input::placeholder, .ft-admin-screen textarea::placeholder{color:#5A607A;opacity:1;}
.ft-admin-screen .card{border:1px solid #C9CEDD;}
.ft-admin-screen .cert-settings-grid > *{min-width:0;box-sizing:border-box;}
.ft-admin-screen .cert-settings{overflow:hidden;}
.ft-admin-screen .stat .lbl{color:#2E3450;font-weight:800;}
.ft-admin-screen .empty-note{color:#141A2E;font-weight:700;background:#EEF0F6;}
@media(max-width:760px){ .ft-admin-screen{padding:14px 12px 18px;border-radius:12px;} }`;
document.head.appendChild(st);
})();
