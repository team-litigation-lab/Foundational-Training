/* ============================================================
   📧 EOD INBOX (Admin → 📧 EOD Inbox): the EOD emails the platform received (worker.js receiveEod, from the trainers' Gmail
   through docs/eod-gmail-script.gs), each with the trainee it was matched to and how; when the last one came in, so a trainer
   can see the Gmail script is sending; and the EODs no trainee matched, each given to its trainee here (/api/eod/assign: kept
   as theirs for its day, the day's compliance worked out again, and the address remembered so their next EOD matches).
   ============================================================ */
(function(){
"use strict";
const E = {data: null, people: null, loading: false, busy: false};
const esc_ = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const when = v => { const d = new Date(v); return isNaN(d) ? "" : d.toLocaleString([], {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}); };
const ago = v => { const m = Math.round((Date.now() - new Date(v)) / 60000); return !isFinite(m) ? "" : m < 60 ? m + " min ago" : m < 2880 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " days ago"; };
async function load(){
  if(E.loading) return; E.loading = true;
  try{
    const [d, ppl] = await Promise.all([authFetch("/api/eod/unmatched", {}).then(r => r.json()), typeof ftActiveRoster === "function" ? ftActiveRoster().catch(() => []) : []]);
    E.data = d && !d.error ? d : {items: [], log: [], error: (d && d.error) || "no answer"}; E.people = (ppl || []).slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }catch(e){ E.data = {items: [], log: [], error: "couldn't reach the server"}; E.people = E.people || []; }
  E.loading = false; if(state.view === "admin" && state.adminTab === "eodinbox") render();
}
function html(){
  if(!E.data){ load(); return `<div class="card" style="padding:20px">Loading the EOD inbox…</div>`; }
  const d = E.data, nameOf = id => { const p = (E.people || []).find(x => x.id === id); return p ? p.name + (p.batch ? " · " + p.batch : "") : id; };
  const stale = !d.last || Date.now() - new Date(d.last) > 26 * 3600e3;
  const opts = (E.people || []).map(p => `<option value="${esc_(p.id)}">${esc_(p.name)}${p.batch ? " · " + esc_(p.batch) : ""}</option>`).join("");
  return `<div class="card eodx"><div class="eodx-top"><h3>📧 EOD Inbox</h3><button type="button" class="btn btn-ghost btn-sm" onclick="FTEodInbox.refresh()">↻ Refresh</button></div>
    ${d.error ? `<p class="eodx-bad">Couldn't load: ${esc_(d.error)}</p>` : ""}
    <p class="eodx-status ${stale ? "eodx-bad" : "eodx-ok"}">${d.last ? `${stale ? "⚠" : "✓"} Last EOD received ${esc_(when(d.last))} (${esc_(ago(d.last))})` : "⚠ No EOD has reached the platform yet"}${stale ? `: check the “EOD to the platform” script's Executions in ${esc_(d.address || "the trainers' Gmail")} (docs/eod-gmail-script.gs).` : "."}
      Trainees CC <b>${esc_(d.address || "")}</b>, subject with “EOD” or “Daily Report”.${d.key === false ? ` <span class="eodx-bad">The Worker has no EOD_KEY secret, so the script's EODs are refused.</span>` : ""}</p>
    <h4>Not matched to a trainee (${(d.items || []).length})</h4>
    ${(d.items || []).length ? `<table class="eodx-t"><thead><tr><th>Received</th><th>From</th><th>Subject</th><th>Give to</th></tr></thead><tbody>${d.items.map((x, i) => `<tr>
      <td>${esc_(when(x.at))}</td><td>${esc_(x.from)}</td><td title="${esc_(String(x.text || "").slice(0, 600))}">${esc_(x.subject || "(no subject)")}</td>
      <td><select data-eodx="${i}"><option value="">Pick the trainee…</option>${opts}</select> <button type="button" class="btn btn-primary btn-sm" onclick="FTEodInbox.assign(${i}, this)"${E.busy ? " disabled" : ""}>Assign</button></td></tr>`).join("")}</tbody></table>`
      : `<p class="eodx-ok">None: every EOD received was matched.</p>`}
    <h4>Received (latest ${(d.log || []).length})</h4>
    ${(d.log || []).length ? `<table class="eodx-t"><thead><tr><th>Received</th><th>From</th><th>Subject</th><th>Trainee</th></tr></thead><tbody>${d.log.map(x => `<tr>
      <td>${esc_(when(x.at))}</td><td>${esc_(x.from)}</td><td>${esc_(x.subject || "(no subject)")}</td><td>${x.id ? `${esc_(nameOf(x.id))} <small>(${esc_(x.how || "")})</small>` : `<span class="eodx-bad">not matched</span>`}</td></tr>`).join("")}</tbody></table>`
      : `<p>Nothing logged yet.</p>`}</div>`;
}
async function assign(i, btn){
  const x = ((E.data || {}).items || [])[i], sel = btn.parentNode.querySelector("select"), id = sel && sel.value;
  if(!x) return; if(!id){ toast("Pick the trainee first."); return; }
  E.busy = true; btn.disabled = true;
  try{ const j = await (await authFetch("/api/eod/assign", {at: x.at, from: x.from, id})).json();
    if(j && j.ok) toast(`✓ EOD given to ${((E.people || []).find(p => p.id === id) || {}).name || id} for ${j.date}; their next EOD from this address matches by itself.`);
    else toast("Couldn't assign: " + ((j && j.error) || "no answer")); }
  catch(e){ toast("Couldn't reach the server."); }
  E.busy = false; E.data = null; load();
}
if(typeof ftAdminTab === "function") ftAdminTab("eodinbox", "📧 EOD Inbox", html);
window.FTEodInbox = {assign, refresh(){ E.data = null; render(); }};
(function(){ const s = document.createElement("style"); s.id = "ft-eod-inbox"; s.textContent = `
.eodx{padding:20px 24px;max-width:1200px;} .eodx-top{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.eodx h4{margin:18px 0 8px;color:#1E2340;} .eodx-status{padding:8px 12px;border-radius:8px;line-height:1.5;}
.eodx-ok{color:#1E6B40;} .eodx-status.eodx-ok{background:#E3F4EA;} .eodx-bad{color:#9A3412;} .eodx-status.eodx-bad{background:#FFF4D6;}
.eodx-t{width:100%;border-collapse:collapse;font-size:13.5px;} .eodx-t th,.eodx-t td{text-align:left;padding:6px 8px;border-bottom:1px solid #E5E7EF;vertical-align:top;}
.eodx-t th{background:#F4F5FA;color:#4A5070;font-weight:700;} .eodx-t select{max-width:260px;}`; document.head.appendChild(s); })();
})();
