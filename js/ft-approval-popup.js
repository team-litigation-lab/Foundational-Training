/* ============================================================
   ⏳ New registration popup — trainers approve from any page.

   When a new trainee registers, every trainer account that is signed in (the trainers who come in from
   the LSH Training Portal, and the admin password) gets a popup listing the registrations waiting for
   approval, each with ✓ Approve and ✕ Decline. It shows on every page of the program, 👁 Trainee view
   included, as long as the trainer is signed in.

   - It does not go away until every registration in it is approved or declined: there is no close
     button, Esc and clicking outside do nothing, and it stays on top while the trainer moves between
     pages. "Open Trainee Audit →" goes to Admin → Trainee Audit with the popup still open.
   - Someone who registers while it is open is added to the list.
   - Checks once a minute (POLL.admin), only while the tab is visible. On the Trainee Audit / Rankings /
     Trainee Feedback tabs the engine's own live update already reloads the trainee list, so this reads
     that list instead of asking the server again.
   - Approve / Decline save exactly what the Trainee Audit's buttons save (trainee:<id> approved / rejected),
     so a registration handled in the Trainee Audit (or by another trainer) leaves the popup too.
   ============================================================ */
(function(){
  "use strict";
  const ID = "ftApprovalPopup";
  const ENGINE_TABS = ["audit", "rankings", "tfeedback"];
  let busy = false, lastFetch = 0, cache = null;

  // Every trainer sign-in sets state.isAdmin; a trainee session never does (state.traineeId).
  const trainerOn = () => !!state.isAdmin && !state.traineeId;
  const pendingOf = list => (list || []).filter(r => r && r.id && r.approved !== true && !r.rejected && !r.archived && !r.offboarded);
  const title = n => `⏳ New registration${n === 1 ? "" : "s"} waiting for approval (${n})`;

  async function loadPending(force){
    // The engine's live update pauses while a dialog (this one too) is open, so its list is only used
    // while the popup is closed.
    const onEngineTab = state.view === "admin" && ENGINE_TABS.includes(state.adminTab || "audit");
    if(onEngineTab && Array.isArray(state.adminData) && !document.getElementById(ID)) return pendingOf(state.adminData);
    if(!force && cache && Date.now() - lastFetch < (POLL.admin || 60000) - 500) return cache;
    lastFetch = Date.now();
    const keys = await sharedList("trainee:");
    cache = pendingOf((await sharedGetMany(keys)).filter(Boolean));
    return cache;
  }

  function close(){ const el = document.getElementById(ID); if(el) el.remove(); }

  function row(r){
    const when = r.registeredAt ? new Date(r.registeredAt).toLocaleString() : "recently";
    const batch = r.batch ? ` · Batch ${esc(typeof batchLabel === "function" ? batchLabel(r.batch) : r.batch)}` : "";
    return `<div class="ftap-row" data-id="${esc(r.id)}">
      <div class="ftap-who"><b>${esc(r.name || "(no name)")}</b><span>Registered ${esc(when)}${batch}</span></div>
      <div class="ftap-btns">
        <button type="button" class="btn btn-ghost btn-sm ftap-reject" data-act="reject">✕ Decline</button>
        <button type="button" class="btn btn-navy btn-sm" data-act="approve">✓ Approve</button>
      </div></div>`;
  }

  function build(){
    const el = document.createElement("div");
    el.id = ID; el.className = "overlay ftap-overlay";
    el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "ftapTitle");
    el.innerHTML = `<div class="card ftap-card">
      <h3 id="ftapTitle"></h3>
      <p>They can't open the training until approved. Confirm each is a real trainee, then approve or decline: this stays open until every one is done.</p>
      <div class="ftap-list"></div>
      <div class="row ftap-foot">
        <button type="button" class="btn btn-ghost btn-sm" data-act="audit">Open Trainee Audit →</button>
      </div></div>`;
    el.addEventListener("click", onClick);
    // Esc must not close it (nor reach a dialog underneath it).
    el.addEventListener("keydown", e => { if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); } });
    document.body.appendChild(el);
    return el;
  }

  // Show / update the popup so its rows are exactly `pending` (rows being saved are left alone).
  function sync(pending){
    if(!pending.length){ close(); return; }
    let el = document.getElementById(ID);
    const fresh = !el;
    if(fresh) el = build();
    else if(el !== document.body.lastElementChild) document.body.appendChild(el);   // keep it above any dialog opened since
    const list = el.querySelector(".ftap-list");
    const want = new Set(pending.map(r => r.id));
    list.querySelectorAll(".ftap-row").forEach(r => { if(!want.has(r.dataset.id) && !r.dataset.saving) r.remove(); });
    const have = new Set([...list.querySelectorAll(".ftap-row")].map(r => r.dataset.id));
    pending.filter(r => !have.has(r.id)).forEach(r => list.insertAdjacentHTML("beforeend", row(r)));
    retitle(el);
    if(fresh){ const first = el.querySelector('[data-act="approve"]'); if(first) first.focus(); }
  }

  function retitle(el){
    const n = el.querySelectorAll(".ftap-row").length;
    if(!n){ close(); return; }
    el.querySelector("#ftapTitle").textContent = title(n);
  }

  async function onClick(e){
    const el = document.getElementById(ID);
    const b = e.target.closest("button[data-act]"); if(!b) return;   // clicks outside the card do nothing
    const act = b.dataset.act;
    if(act === "audit"){ state.adminTab = "audit"; goto("admin"); return; }   // the popup stays open over it
    const r = b.closest(".ftap-row"); if(!r) return;
    const id = r.dataset.id;
    if(act === "reject" && !confirm("Decline this registration? They'll see that it was declined.")) return;
    r.dataset.saving = "1";
    r.querySelectorAll("button").forEach(x => x.disabled = true);
    try{
      // The same write as the Trainee Audit's Approve / Reject (approveTrainee / rejectTrainee), without
      // re-drawing the page the trainer is on (a lesson keeps its slide); the admin screen is refreshed.
      const rec = await sharedGet("trainee:" + id);
      if(rec){
        rec.approved = act === "approve"; rec.rejected = act !== "approve";
        await sharedSet("trainee:" + id, rec);
      }
      toast(act === "approve" ? `✓ ${rec && rec.name || "Trainee"} approved.` : "Registration declined.");
    }catch(err){
      delete r.dataset.saving;
      r.querySelectorAll("button").forEach(x => x.disabled = false);
      toast("Couldn't save that — try again.");
      return;
    }
    if(cache) cache = cache.filter(x => x.id !== id);
    if(Array.isArray(state.adminData)){
      const a = state.adminData.find(x => x && x.id === id);
      if(a){ a.approved = act === "approve"; a.rejected = act !== "approve"; }
    }
    r.remove();
    if(el) retitle(el);
    if(state.view === "admin" && typeof loadAdminLedger === "function") loadAdminLedger();
  }

  async function tick(){
    if(busy || document.visibilityState === "hidden") return;
    if(!trainerOn() || state.view === "login"){ close(); return; }   // signed out / 👁 Trainee view
    busy = true;
    try{
      sync(await loadPending());   // on top of whatever page or dialog is open
    }catch(e){ /* network blip: the next check retries */ }
    finally{ busy = false; }
  }

  const css = document.createElement("style");
  css.textContent = `
    /* above every full-screen page (🧭 Blueprint, slide zoom, dialogs); only the sign-in gate covers it */
    .ftap-overlay{z-index:1000000;}
    body:has(#ftApprovalPopup) .toast{z-index:1000001;}
    .overlay .card.ftap-card{max-width:520px;max-height:min(80vh,640px);display:flex;flex-direction:column;}
    .ftap-list{overflow:auto;margin:0 -4px 14px;padding:0 4px;}
    .ftap-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--line);}
    .ftap-who{min-width:0;}
    .ftap-who b{display:block;font-size:14px;color:var(--navy);overflow-wrap:anywhere;}
    .ftap-who span{font-size:12px;color:var(--ink-soft);}
    .ftap-btns{display:flex;gap:8px;flex-shrink:0;}
    .ftap-reject{color:var(--danger);}
    @media (max-width:520px){ .ftap-row{flex-direction:column;align-items:stretch;} .ftap-btns{justify-content:flex-end;} }`;
  document.head.appendChild(css);

  setTimeout(tick, 4000);                                     // soon after sign-in / page load
  setInterval(tick, POLL.live || 15000);                      // cheap: the server is asked at most once a minute
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") tick(); });
  window.ftApprovalPopupCheck = tick;
})();
