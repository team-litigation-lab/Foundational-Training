/* ============================================================
   👥 WHO IS ON THE SCORECARDS: an active trainee, the one rule every trainer's list uses
   ------------------------------------------------------------
   A trainee whose access is revoked leaves every scorecard by themselves — the 📋 Batch Sheet (🏅 Score Card, the
   compliance, 📤 Daily outputs…), 📊 Weekly Ranking, 📝 Send Feedback, the 🧑‍🏫 Graders' scoresheets,
   📦 Intake Packets, 🧪 Typing & Spelling, 📁 Drive Trackers and 🏅 Scorecards:
     • offboarded (🚫 Offboard: access revoked, worker.js /api/batch/offboard), rejected, archived or cleared (purgedAt);
     • or on the platform's block list (access:blocked, worker.js blockedIds: offboarded, or their batch cleared), read here
       for a trainer (/api/batch/blocked) when the page opens and every few minutes;
     • a record deleted (🗑 Revoke & delete) is simply gone.
   And at once: revoking, rejecting, offboarding, deleting, approving or restoring a trainee tells every list to read its
   trainees again (the "ft-roster-changed" event), instead of keeping the one it read before until the page is reloaded.
   ftActiveTrainee(r, {pending: true}) also lets a registration waiting for approval through (the Batch Sheet lists them).
   ============================================================ */
(function(){
"use strict";
window.FT_BLOCKED = window.FT_BLOCKED || {};
let at = 0, loading = null;
const isAdmin = () => typeof state === "object" && !!state.isAdmin && !state.traineeId;
window.ftActiveTrainee = function(r, o){
  if(!r || !r.id || r.archived || r.rejected || r.purgedAt || r.offboarded || window.FT_BLOCKED[r.id]) return false;
  return (o && o.pending) ? true : r.approved === true;
};
// every list reads its trainees again
window.ftRosterChanged = function(){
  if(typeof state === "object") state.adminData = null;
  try{ window.dispatchEvent(new Event("ft-roster-changed")); }catch(err){}
  if(typeof render === "function" && typeof state === "object" && state.view === "admin") render();
};
// the platform's block list (a trainer's only)
async function loadBlocked(force){
  if(!isAdmin() || typeof authFetch !== "function") return;
  if(loading) return loading; if(!force && Date.now() - at < 3 * 60000) return;
  loading = (async () => {
    try{ const r = await authFetch("/api/batch/blocked", {}); const j = await r.json().catch(() => ({}));
      if(r.ok && j && j.ids && typeof j.ids === "object"){ const was = JSON.stringify(Object.keys(window.FT_BLOCKED).sort()), now = JSON.stringify(Object.keys(j.ids).sort());
        window.FT_BLOCKED = j.ids; at = Date.now(); if(was !== now) window.ftRosterChanged(); } }catch(err){}
    loading = null;
  })();
  return loading;
}
window.ftLoadBlocked = loadBlocked;
// the trainer's own actions on a trainee: every list follows at once (and the block list is read again)
function wrap(name){ const was = window[name]; if(typeof was !== "function" || was.__roster) return;
  const w = async function(){ const r = await was.apply(this, arguments); at = 0; await loadBlocked(true); window.ftRosterChanged(); return r; }; w.__roster = true; window[name] = w; }
const WRAP = ["approveTrainee", "rejectTrainee", "confirmRevokeTrainee", "restoreOffboarded"];
function wrapAll(){ WRAP.forEach(wrap); }
window.addEventListener("load", () => { wrapAll(); loadBlocked(); });
setTimeout(wrapAll, 0);
setInterval(() => { if(!document.hidden) loadBlocked(); }, 3 * 60000);
// (the Admin screen opened: the block list, fresh)
const __after = window.afterRender;
window.afterRender = function(){ const out = __after ? __after.apply(this, arguments) : undefined;
  try{ wrapAll(); if(typeof state === "object" && state.view === "admin") loadBlocked(); }catch(err){} return out; };
})();
