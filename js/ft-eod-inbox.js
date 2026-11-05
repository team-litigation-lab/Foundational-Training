/* ============================================================
   📧 EOD INBOX (Admin → Admin Master Control → 📧 EOD Inbox)
   ------------------------------------------------------------
   The trainees CC the platform's EOD address on their EOD email (worker.js receiveEod): each one is matched to its trainee,
   checked against the template and counted in the day's compliance (📋 Batch Sheet → 📤 Daily outputs). This tab is the
   trainer's side of it:
     • whether the EOD address is set up (worker.js EOD_INBOX, /api/eod/inbox), with the steps when it isn't;
     • the EODs no trainee matched (admin:eod-unmatched, /api/eod/unmatched): who sent it, when, its subject and text.
       Each is assigned to a trainee, counted as theirs for the day it was sent and checked, and can remember the
       address it came from so their next EODs match by themselves; or dismissed (/api/eod/settle, worker.js settleEod).
   Loaded after js/ft-admin-ops.js, which puts its tabs in 🛡 Admin Master Control (js/ft-program.js adminGroups).
   ============================================================ */
(function(){
"use strict";
if(typeof window.ftAdminTab !== "function") return;
const e = v => esc(String(v == null ? "" : v));
const active = r => r && r.id && r.approved === true && !r.archived && !r.rejected && !r.offboarded && !r.purgedAt && (!window.ftActiveTrainee || ftActiveTrainee(r));
const when = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString(undefined, {weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York"}) + " ET"; };

const X = {inbox: null, items: null, people: null, loading: false, err: "", pick: {}, keep: {}, open: {}, busy: false};
async function load(){
  if(X.loading) return; X.loading = true; X.err = "";
  try{
    const [ib, un] = await Promise.all([
      authFetch("/api/eod/inbox", {}).then(r => r.json()).catch(() => ({})),
      authFetch("/api/eod/unmatched", {}).then(r => r.json())]);
    X.inbox = String((ib && ib.address) || "");
    X.items = Array.isArray(un && un.items) ? un.items : [];
    if(!X.people){ const keys = await sharedList("trainee:"); X.people = (await sharedGetMany(keys)).filter(active).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))); }
  }catch(err){ X.err = "Couldn’t read the EOD inbox. Check your connection and press ↻."; if(!X.items) X.items = []; }
  X.loading = false;
  if(state.view === "admin" && state.adminTab === "eodinbox") render();
}
const keyOf = it => it.at + "|" + it.from;
async function settle(i, dismiss){
  const it = (X.items || [])[i]; if(!it || X.busy) return;
  const k = keyOf(it), id = X.pick[k] || "";
  if(!dismiss && !id){ toast("Pick the trainee who sent it."); return; }
  if(dismiss && !confirm("Dismiss this EOD? It is removed from the inbox and counted for no one.")) return;
  X.busy = true; render();
  try{
    const j = await authFetch("/api/eod/settle", {at: it.at, from: it.from, id, remember: !!X.keep[k], dismiss: !!dismiss}).then(r => r.json());
    if(j && j.error) toast(j.error);
    else if(dismiss) toast("Dismissed.");
    else{ const p = (X.people || []).find(r => r.id === id); toast(`✓ Counted as ${p ? p.name : "the trainee"}’s EOD for ${j.date}${j.check && j.check.pct != null ? ` · ${j.check.pct}% of the template` : ""}.`); }
  }catch(err){ toast("Couldn’t save. Check your connection."); }
  X.busy = false; X.items = null; load();
}
window.FTEodInbox = {
  refresh(){ X.items = null; X.people = null; load(); render(); },
  pick(i, v){ const it = (X.items || [])[i]; if(it) X.pick[keyOf(it)] = v; },
  keep(i, v){ const it = (X.items || [])[i]; if(it) X.keep[keyOf(it)] = !!v; },
  toggle(i){ const it = (X.items || [])[i]; if(it){ X.open[keyOf(it)] = !X.open[keyOf(it)]; render(); } },
  assign(i){ settle(i, false); },
  dismiss(i){ settle(i, true); }
};

function setupHtml(){
  if(X.inbox) return `<div class="eodx-ok">✅ EODs are received at <b>${e(X.inbox)}</b>. Trainees CC it on their EOD email; the address shows on the Setting of Expectations EOD card and the Task Tracker’s EOD box.</div>`;
  return `<div class="eodx-warn"><b>⚠ The EOD address isn’t set up yet</b>, so no EOD emails reach the platform. Pasted EODs (📋 Task Tracker) are still checked.
    <ol><li>In Cloudflare, open the domain the address will be on → <b>Email</b> → <b>Email Routing</b>, and enable it.</li>
    <li>Under <b>Routing rules</b>, add an address (for example <code>eod@…</code>) with the action <b>Send to a Worker</b> → <b>foundational-training</b>.</li>
    <li>In <b>Workers &amp; Pages → foundational-training → Settings → Variables</b>, add <code>EOD_INBOX</code> set to that address, and deploy.</li>
    <li>Ask each trainee to add the address they send from in 📁 My Drive links, so their EODs match even when their display name differs.</li></ol></div>`;
}
function itemHtml(it, i){
  const k = keyOf(it), open = !!X.open[k];
  return `<div class="eodx-item">
    <div class="eodx-top"><div><b>${e(it.subject || "(no subject)")}</b><small>From ${e(it.from || "unknown")} · ${e(when(it.at))}</small></div>
      <button class="btn btn-ghost btn-sm" onclick="FTEodInbox.toggle(${i})">${open ? "Hide" : "Read"} the email</button></div>
    ${open ? `<pre class="eodx-text">${e(it.text || "")}</pre>` : ""}
    <div class="eodx-act"><label>Trainee <select onchange="FTEodInbox.pick(${i}, this.value)"><option value="">Pick who sent it…</option>${(X.people || []).map(p => `<option value="${e(p.id)}" ${X.pick[k] === p.id ? "selected" : ""}>${e(p.name || p.id)}${p.batch ? " · " + e(p.batch) : ""}</option>`).join("")}</select></label>
      <label class="eodx-keep"><input type="checkbox" ${X.keep[k] ? "checked" : ""} onchange="FTEodInbox.keep(${i}, this.checked)"> Match this address to them from now on</label>
      <button class="btn btn-navy btn-sm" ${X.busy ? "disabled" : ""} onclick="FTEodInbox.assign(${i})">✓ Count it as theirs</button>
      <button class="btn btn-ghost btn-sm" ${X.busy ? "disabled" : ""} onclick="FTEodInbox.dismiss(${i})">Dismiss</button></div></div>`;
}
function adminHtml(){
  if(X.items == null || X.inbox == null){ load(); return `<div class="card" style="padding:24px;">Loading the EOD inbox…</div>`; }
  const n = X.items.length;
  return `<div class="card eodx"><div class="eodx-head"><div><h3>📧 EOD Inbox</h3>
      <p class="fss-muted">Every EOD emailed to the platform is matched to its trainee, checked against the template and counted in 📋 Batch Sheet → 📤 Daily outputs. The ones no trainee matched wait here: count each as the right trainee’s, or dismiss it.</p></div>
      <button class="btn btn-ghost btn-sm" onclick="FTEodInbox.refresh()" title="Read the inbox again">↻</button></div>
    ${setupHtml()}
    ${X.err ? `<p class="eodx-err">${e(X.err)}</p>` : ""}
    <h4 class="eodx-h">Unmatched EODs <span>${n}</span></h4>
    ${n ? X.items.map(itemHtml).join("") : `<p class="fss-muted">None: every EOD received so far was matched to its trainee.</p>`}</div>`;
}
ftAdminTab("eodinbox", "📧 EOD Inbox", adminHtml);

(function(){ const s = document.createElement("style"); s.id = "ft-eod-inbox"; s.textContent = `
.eodx{padding:20px 22px;}
.eodx-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}
.eodx-head h3{margin:0 0 4px;}
.eodx-ok,.eodx-warn{margin:12px 0;padding:12px 14px;border-radius:10px;font-size:14px;line-height:1.5;}
.eodx-ok{background:#EAF6EE;border:1px solid #B7DFC4;color:#1F5E36;}
.eodx-warn{background:#FFF6EC;border:1px solid #F0C08A;color:#5A3510;}
.eodx-warn ol{margin:8px 0 0 18px;padding:0;} .eodx-warn li{margin:3px 0;}
.eodx-err{color:#B42318;font-weight:700;}
.eodx-h{margin:18px 0 8px;display:flex;align-items:center;gap:8px;} .eodx-h span{background:#DCE0EC;color:#1B2240;border-radius:999px;padding:1px 9px;font-size:13px;}
.eodx-item{border:1px solid var(--line,#E3E6EE);border-radius:12px;padding:12px 14px;margin:0 0 10px;background:#fff;}
.eodx-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;}
.eodx-top small{display:block;color:var(--ink-soft,#5B6478);font-size:12.5px;margin-top:2px;}
.eodx-text{white-space:pre-wrap;font:13px/1.5 'Inter',system-ui,sans-serif;background:#F7F8FB;border:1px solid #E3E6EE;border-radius:8px;padding:10px 12px;margin:10px 0 0;max-height:320px;overflow:auto;}
.eodx-act{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px;}
.eodx-act > label{font-size:13.5px;font-weight:700;display:flex;gap:6px;align-items:center;}
.eodx-act select{height:32px;border:1px solid var(--line,#E3E6EE);border-radius:8px;padding:0 6px;max-width:320px;}
.eodx-keep{font-size:13px;display:flex;gap:6px;align-items:center;}
`; document.head.appendChild(s); })();
})();
