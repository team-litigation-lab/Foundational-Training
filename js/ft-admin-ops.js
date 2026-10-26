/* ============================================================
   🛡 Admin: the operations tabs the platform spec lists for every program —
     📋 SOPs                 the program's standard operating procedures, written and kept by trainers
     🗄 Database Maintenance clear the data that is only needed for a while; the records are kept
   The spec's other three are already their own tabs: Assign Case File (🏛 Law Firms, this program
   only), the Trainer Feedback Tool (💬 Trainee Feedback) and Trainee Progress Monitoring (the
   Trainee Audit, 📋 Task Trackers and 📒 Monitoring Sheets; attendance is taken on the Training
   Portal, Master Control → 🕘 Attendance, per program per batch).
   Loaded after js/ft-firms.js (window.ftAdminTab) and before js/ft-program.js, which puts these
   three in the Admin section of the Admin screen's tab bar.
   ============================================================ */
(function(){
"use strict";
if(typeof window.ftAdminTab !== "function") return;
const e = v => esc(String(v == null ? "" : v));
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;   // a trainee session is never an admin one
const DAY = 86400000;
const when = t => { const d = new Date(t); return isFinite(d) ? d.toLocaleString() : "—"; };

/* ============================================================
   📋 SOPs — the program's standard operating procedures
   settings:sops = {items: [{id, title, area, body, updatedAt, by}]}. Trainers write them; the
   Worker lets only an admin read or write the key, so nothing here is a trainee-facing page.
   ============================================================ */
const SOP = {items:null, loading:false, err:"", edit:null, draft:null};
const SOP_KEY = "settings:sops";
const SOP_AREAS = ["General", "Reception and calls", "Calendar", "Intake", "Claims", "Medical records", "Trainers"];

async function sopLoad(force){
  if(SOP.loading || (SOP.items && !force)) return;
  SOP.loading = true; SOP.err = "";
  try{
    const rec = await sharedGet(SOP_KEY);
    SOP.items = (rec && Array.isArray(rec.items)) ? rec.items : [];
  }catch(err){ SOP.err = "Couldn’t load the SOPs — sign in again as Admin and retry."; SOP.items = SOP.items || []; }
  SOP.loading = false;
  if(state.view === "admin" && state.adminTab === "sops") render();
}
async function sopSave(items){
  SOP.items = items;
  await sharedSet(SOP_KEY, {items, updatedAt:new Date().toISOString()});
}
function sopDraft(){ return SOP.draft || (SOP.draft = {id:"", title:"", area:SOP_AREAS[0], body:""}); }

function renderAdminSOPs(){
  if(!adminOn()) return `<div class="card" style="padding:28px;">Trainers only.</div>`;
  if(SOP.items === null){ sopLoad(); return `<div class="card" style="padding:28px;">Loading the SOPs…</div>`; }
  const d = SOP.edit !== null ? sopDraft() : null;
  const form = d ? `
    <div class="card ops-card ops-edit">
      <h3>${d.id ? "Edit this SOP" : "New SOP"}</h3>
      <label class="ops-lbl" for="sopTitle">Title</label>
      <input id="sopTitle" class="ops-in" type="text" maxlength="120" value="${e(d.title)}" placeholder="e.g. Taking a new-client call" oninput="FTOps.sopField('title', this.value)">
      <label class="ops-lbl" for="sopArea">Area</label>
      <select id="sopArea" class="ops-in" onchange="FTOps.sopField('area', this.value)">
        ${SOP_AREAS.map(a => `<option value="${e(a)}" ${a === d.area ? "selected" : ""}>${e(a)}</option>`).join("")}
      </select>
      <label class="ops-lbl" for="sopBody">The procedure — one step per line</label>
      <textarea id="sopBody" class="ops-in ops-ta" rows="10" placeholder="1. …&#10;2. …" oninput="FTOps.sopField('body', this.value)">${e(d.body)}</textarea>
      <div class="ops-row">
        <button class="btn btn-navy btn-sm" onclick="FTOps.sopSave()">Save</button>
        <button class="btn btn-ghost btn-sm" onclick="FTOps.sopCancel()">Cancel</button>
      </div>
    </div>` : "";
  const items = SOP.items.slice().sort((a, b) => String(a.area).localeCompare(String(b.area)) || String(a.title).localeCompare(String(b.title)));
  return `
    <div class="ops-hero">
      <p class="lp-eyebrow">🛡 Admin · Operations</p><h1>📋 SOPs</h1>
      <p>This program’s standard operating procedures, written and kept by its trainers: the steps a trainee is held to, in one place, so every trainer teaches and grades the same way. The trainer’s run-book for the sessions themselves is <b>📘 Curriculum</b>; the rules a trainee reads are in <b>📌 Setting of Training Expectations and Company Policies</b>.</p>
      ${SOP.err ? `<p class="ops-err">${e(SOP.err)}</p>` : ""}
      <div class="ops-row">
        <button class="btn btn-navy btn-sm" onclick="FTOps.sopNew()">＋ New SOP</button>
        <button class="btn btn-ghost btn-sm" onclick="FTOps.sopReload()">↻ Refresh</button>
        ${items.length ? `<button class="btn btn-ghost btn-sm" onclick="window.print()">🖨 Print</button>` : ""}
      </div>
    </div>
    ${form}
    ${items.length ? items.map(s => `
      <div class="card ops-card">
        <div class="ops-head">
          <div><span class="ops-tag">${e(s.area || "General")}</span><h3>${e(s.title)}</h3></div>
          <div class="ops-row">
            <button class="btn btn-ghost btn-sm" onclick="FTOps.sopEdit('${e(s.id)}')">✎ Edit</button>
            <button class="btn btn-ghost btn-sm ops-danger" onclick="FTOps.sopDelete('${e(s.id)}')">🗑 Delete</button>
          </div>
        </div>
        <pre class="ops-body">${e(s.body)}</pre>
        <p class="ops-muted">Updated ${when(s.updatedAt)}${s.by ? " · " + e(s.by) : ""}</p>
      </div>`).join("")
    : `<div class="card ops-card ops-empty">No SOPs yet. Add the first one — what a trainee should do, step by step — and it shows here for every trainer.</div>`}`;
}


/* ============================================================
   🗄 Database Maintenance — clear what is only needed for a while
   The same rules as the Main Portal's own sweep, read onto this program's data:
     pings over 7 days old                → checkin:<date>:<id> (the day's attendance record keeps the times)
     live-view copies                     → blueprint:pdf, rebuilt by itself on the next admin visit
     stopped alerts over 30 days old      → random tasks that ended over 30 days ago
     live-call records                    → callsim:/simresults: left behind by a deleted trainee only;
                                            an active trainee's graded calls are never swept
     sign-in attempt counts               → the lab attempt counts on a trainee with no ping in 30 days
     online status not seen for 30 days   → nothing to clear: this program stores no presence field
   Kept: trainees, their progress, every grade and review, attendance, firms and case assignments,
   and the settings. Nothing is deleted until you press Clear, and the scan says exactly what would go.
   ============================================================ */
const DB = {scan:null, scanning:false, clearing:false, done:"", err:""};
// a trainee's own records, by key prefix — the engine's OWN/TRAINER_OWNED list in worker.js
const OWNED = ["trainee", "progress", "feedback", "focus", "tracker", "trackerreview", "actsub", "monitor",
  "process", "calsim", "sessions", "drive", "lor", "callsim", "kcreview", "labreview", "simresults", "assign", "lorassign"];

async function dbScan(){
  if(DB.scanning) return;
  DB.scanning = true; DB.err = ""; DB.done = ""; render();
  try{
    const keys = (await sharedList("")).map(k => typeof k === "string" ? k : (k && k.key)).filter(Boolean);
    const groups = {};
    keys.forEach(k => { const g = k.indexOf(":") > 0 ? k.slice(0, k.indexOf(":")) : k.replace(/\d+$/, ""); groups[g] = (groups[g] || 0) + 1; });
    const ids = new Set(keys.filter(k => k.indexOf("trainee:") === 0).map(k => k.slice("trainee:".length)));
    const now = Date.now();
    const old = [];   // {key, why}
    // 1. live-view copies: the published blueprint PDF, rebuilt automatically after every deploy
    if(keys.includes("blueprint:pdf")) old.push({key:"blueprint:pdf", why:"a live-view copy — the published blueprint PDF, rebuilt on the next admin visit"});
    // 2. pings over 7 days old (the day's attendance record keeps the times)
    keys.filter(k => k.indexOf("checkin:") === 0).forEach(k => {
      const d = (k.match(/^checkin:(\d{4}-\d{2}-\d{2}):/) || [])[1];
      if(d && now - new Date(d + "T00:00:00Z").getTime() > 7 * DAY) old.push({key:k, why:"a ping over 7 days old"});
    });
    // 3. stopped alerts: random tasks that ended over 30 days ago
    const rtKeys = keys.filter(k => /^surprise-task-day\d+$/.test(k));
    const recs = rtKeys.length ? await sharedGetMany(rtKeys) : [];
    rtKeys.forEach((k, i) => {
      const r = recs[i];
      if(!r || rtLive(r)) return;
      const last = Math.max(new Date(r.expiresAt || 0).getTime() || 0, new Date(r.generatedAt || 0).getTime() || 0,
        ...((r.history || []).map(h => new Date(h.expiresAt || h.generatedAt || 0).getTime() || 0)));
      if(last && now - last > 30 * DAY) old.push({key:k, why:"a stopped alert — a random task that ended over 30 days ago"});
    });
    // 4. records left behind by a deleted trainee
    keys.forEach(k => {
      const p = k.indexOf(":") > 0 ? k.slice(0, k.indexOf(":")) : "";
      const id = k.slice(p.length + 1);
      if(p === "trainee" || !OWNED.includes(p) || !id || id.indexOf(":") >= 0) return;
      if(!ids.has(id)) old.push({key:k, why:"left behind by a trainee who was deleted"});
    });
    // 5. sign-in attempt counts: the lab attempt counts on a trainee with no ping in 30 days.
    // These are counts, not records — Clear writes the trainee back with the counts at zero and
    // everything else untouched, which is the same thing as ↺ Reset Attempts on the roster.
    const lastPing = {};
    keys.forEach(k => {
      const m = k.match(/^checkin:(\d{4}-\d{2}-\d{2}):(.+)$/);
      if(!m) return;
      const t = new Date(m[1] + "T00:00:00Z").getTime();
      if(isFinite(t) && t > (lastPing[m[2]] || 0)) lastPing[m[2]] = t;
    });
    const tKeys = Array.from(ids, id => "trainee:" + id);
    const tRecs = tKeys.length ? await sharedGetMany(tKeys) : [];
    const fields = [];
    tKeys.forEach((k, i) => {
      const r = tRecs[i], id = k.slice("trainee:".length);
      if(!r || now - (lastPing[id] || 0) <= 30 * DAY) return;
      const used = Number(r.labAttemptsGlobal) || 0;
      const byDay = (r.labAttemptsByDay && typeof r.labAttemptsByDay === "object") ? Object.keys(r.labAttemptsByDay).length : 0;
      if(!used && !byDay) return;
      fields.push({key:k, count:used,
        why:"attempt counts on a trainee with no ping in 30 days — the record itself is kept",
        patch:Object.assign({}, r, {labAttemptsGlobal:0, labAttemptsByDay:{}, labAttemptsResetAt:new Date().toISOString()})});
    });
    DB.scan = {at:Date.now(), total:keys.length, groups, trainees:ids.size, old, fields};
  }catch(err){ DB.err = "Couldn’t read the database — sign in again as Admin and retry."; }
  DB.scanning = false; render();
}
async function dbClear(){
  const s = DB.scan;
  const fields = (s && s.fields) || [];
  const n = s ? s.old.length + fields.length : 0;
  if(!s || !n || DB.clearing) return;
  if(!confirm(`Clear ${n} item${n === 1 ? "" : "s"}? Trainees, their progress, every grade and review, attendance, the firms and the settings are kept${fields.length ? `; ${fields.length} trainee${fields.length === 1 ? "" : "s"} keep their record with the attempt counts back at zero` : ""}.`)) return;
  DB.clearing = true; render();
  let gone = 0, failed = 0, reset = 0;
  for(const row of s.old){
    try{ await sharedDelete(row.key); gone++; }catch(err){ failed++; }
  }
  for(const row of fields){
    try{ await sharedSet(row.key, row.patch); reset++; }catch(err){ failed++; }
  }
  DB.clearing = false;
  DB.done = `Cleared ${gone} record${gone === 1 ? "" : "s"}${reset ? ` · reset the attempt counts on ${reset} trainee${reset === 1 ? "" : "s"}` : ""}${failed ? ` · ${failed} couldn’t be cleared` : ""}.`;
  await dbScan();
}

function renderAdminDbMaint(){
  if(!adminOn()) return `<div class="card" style="padding:28px;">Trainers only.</div>`;
  const s = DB.scan;
  const fields = (s && s.fields) || [];
  const n = s ? s.old.length + fields.length : 0;
  const groups = s ? Object.keys(s.groups).sort((a, b) => s.groups[b] - s.groups[a]) : [];
  return `
    <div class="ops-hero">
      <p class="lp-eyebrow">🛡 Admin · Operations</p><h1>🗄 Database Maintenance</h1>
      <p>The same rules as the Main Portal’s own sweep, read onto this program’s data: <b>pings</b> over 7 days old (the day’s attendance record keeps the times), <b>live-view copies</b> (the published blueprint PDF, which rebuilds itself on the next admin visit), <b>stopped alerts</b> — random tasks that ended over 30 days ago, <b>live-call records</b> left behind by a trainee who was deleted, and the <b>attempt counts</b> on a trainee with no ping in 30 days. This program stores no presence field, so there is no online status to clear. <b>Kept:</b> trainees, their progress, every grade and review — an active trainee’s graded calls are never swept — attendance, the firms and case assignments, and the settings. The scan below says exactly what would go; nothing is deleted until you press Clear.</p>
      <div class="ops-row">
        <button class="btn btn-navy btn-sm" onclick="FTOps.dbScan()" ${DB.scanning ? "disabled" : ""}>${DB.scanning ? "Scanning…" : "🔍 Scan the database"}</button>
        ${n ? `<button class="btn btn-ghost btn-sm ops-danger" onclick="FTOps.dbClear()" ${DB.clearing ? "disabled" : ""}>${DB.clearing ? "Clearing…" : `🗑 Clear ${n} item${n === 1 ? "" : "s"}`}</button>` : ""}
      </div>
      ${DB.err ? `<p class="ops-err">${e(DB.err)}</p>` : ""}
      ${DB.done ? `<p class="ops-ok">${e(DB.done)}</p>` : ""}
    </div>
    ${!s ? `<div class="card ops-card ops-empty">Nothing scanned yet. The scan only reads; it changes nothing.</div>` : `
      <div class="lp-home-stats">
        <div class="card stat"><div class="num">${s.total}</div><div class="lbl">Records in this program</div></div>
        <div class="card stat"><div class="num">${s.trainees}</div><div class="lbl">Trainees</div></div>
        <div class="card stat"><div class="num">${n}</div><div class="lbl">Only needed for a while</div></div>
      </div>
      <div class="card ops-card">
        <h3>What is stored</h3>
        <table class="ops-table"><thead><tr><th>Kind</th><th>Records</th></tr></thead><tbody>
          ${groups.map(g => `<tr><td>${e(g)}</td><td>${s.groups[g]}</td></tr>`).join("")}
        </tbody></table>
      </div>
      <div class="card ops-card">
        <h3>What Clear would remove</h3>
        ${s.old.length ? `<table class="ops-table"><thead><tr><th>Record</th><th>Why</th></tr></thead><tbody>
          ${s.old.slice(0, 200).map(r => `<tr><td class="ops-key">${e(r.key)}</td><td class="ops-muted">${e(r.why)}</td></tr>`).join("")}
        </tbody></table>${s.old.length > 200 ? `<p class="ops-muted">…and ${s.old.length - 200} more.</p>` : ""}`
        : `<p class="ops-muted">Nothing to clear — everything stored is still needed.</p>`}
      </div>
      ${fields.length ? `<div class="card ops-card">
        <h3>Counts Clear would reset</h3>
        <p class="ops-muted">These trainees keep their record, their progress and every grade. Only the attempt counts go back to zero — the same thing as ↺ Reset Attempts on the roster.</p>
        <table class="ops-table"><thead><tr><th>Trainee</th><th>Attempts used</th><th>Why</th></tr></thead><tbody>
          ${fields.map(r => `<tr><td class="ops-key">${e(r.key)}</td><td>${e(r.count)}</td><td class="ops-muted">${e(r.why)}</td></tr>`).join("")}
        </tbody></table>
      </div>` : ""}
      <p class="ops-muted">Scanned ${when(s.at)}. These are the Main Portal’s sweep rules applied to this program’s data; the sweep itself covers this program only.</p>`}`;
}

/* ---------- the three tabs, and what the page calls ---------- */
window.FTOps = {
  sopNew(){ SOP.edit = ""; SOP.draft = {id:"", title:"", area:SOP_AREAS[0], body:""}; render(); },
  sopEdit(id){ const s = (SOP.items || []).find(x => x.id === id); if(!s) return; SOP.edit = id; SOP.draft = {id:s.id, title:s.title || "", area:s.area || SOP_AREAS[0], body:s.body || ""}; render(); },
  sopField(k, v){ sopDraft()[k] = v; },
  sopCancel(){ SOP.edit = null; SOP.draft = null; render(); },
  async sopSave(){
    const d = sopDraft();
    if(!String(d.title).trim() || !String(d.body).trim()){ toast("A SOP needs a title and its steps."); return; }
    const items = (SOP.items || []).slice();
    const row = {id:d.id || ("sop" + Date.now().toString(36)), title:String(d.title).trim(), area:d.area,
      body:String(d.body).trim(), updatedAt:new Date().toISOString(), by:state.adminName || "Trainer"};
    const i = items.findIndex(x => x.id === row.id);
    if(i >= 0) items[i] = row; else items.push(row);
    SOP.edit = null; SOP.draft = null;
    try{ await sopSave(items); toast("SOP saved."); }catch(err){ SOP.err = "Couldn’t save — try again."; }
    render();
  },
  async sopDelete(id){
    const s = (SOP.items || []).find(x => x.id === id);
    if(!s || !confirm(`Delete “${s.title}”?`)) return;
    try{ await sopSave((SOP.items || []).filter(x => x.id !== id)); toast("SOP deleted."); }catch(err){ SOP.err = "Couldn’t delete — try again."; }
    render();
  },
  sopReload(){ sopLoad(true); },
  dbScan, dbClear
};

ftAdminTab("sops", "📋 SOPs", renderAdminSOPs);
ftAdminTab("dbmaint", "🗄 Database Maintenance", renderAdminDbMaint);

/* (🎲 Tasks for the trainee: no live-task card on 📚 Dashboard and no looking for one; the unannounced tasks are gone
   from the trainee's side of this program) */

const css = document.createElement("style");
css.id = "ft-admin-ops-css";
css.textContent = `
.ops-hero{margin:0 0 18px;}
.ops-hero h1{color:var(--navy);font-size:26px;margin:4px 0 8px;}
.ops-hero > p{color:var(--ink-soft);font-size:13px;max-width:82ch;margin:0 0 14px;line-height:1.6;}
.ops-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.ops-card{padding:18px 20px;margin-bottom:16px;}
.ops-card h3{color:var(--navy);font-size:15px;margin:0 0 10px;}
.ops-head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;}
.ops-head h3{margin:4px 0 0;}
.ops-tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--orange-deep,#9A5B00);background:#FFF1DE;border-radius:999px;padding:2px 10px;}
.ops-body{white-space:pre-wrap;font:inherit;font-size:13px;color:#37394A;background:#F8F9FC;border-radius:10px;padding:12px 14px;margin:10px 0 8px;line-height:1.6;}
.ops-muted{font-size:12px;color:var(--ink-soft);margin:0;}
.ops-err{font-size:12.5px;color:var(--danger);margin:6px 0 0;}
.ops-ok{font-size:12.5px;color:var(--navy);font-weight:700;margin:6px 0 0;}
.ops-empty{color:var(--ink-soft);font-size:13px;}
.ops-lbl{display:block;font-size:12px;font-weight:700;color:var(--navy);margin:12px 0 4px;}
.ops-in{width:100%;max-width:640px;padding:9px 12px;border:1px solid var(--line);border-radius:9px;font:inherit;font-size:13.5px;background:#fff;color:var(--ink);}
.ops-in.ops-sel{width:auto;max-width:none;padding:7px 10px;font-size:12.5px;}
.ops-ta{max-width:none;line-height:1.6;resize:vertical;}
.ops-edit{border:1.5px solid var(--orange);background:#FFFBF5;}
.ops-danger{color:var(--danger);}
.ops-live{color:#0F7B4F;font-weight:800;font-size:12.5px;}
.ops-task{font-size:12.5px;color:#37394A;display:block;max-width:52ch;}
.ops-key{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:12px;color:var(--navy);word-break:break-all;}
.ops-sent{padding:10px 14px;background:#fff;border-color:var(--line);font-size:12.5px;color:#37394A;margin:10px 0 0;}
.ops-table{width:100%;border-collapse:collapse;font-size:13px;}
.ops-table th{text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft);border-bottom:1px solid var(--line);padding:0 10px 7px 0;}
.ops-table td{border-bottom:1px solid var(--line);padding:9px 10px 9px 0;vertical-align:top;}
.ops-table tr:last-child td{border-bottom:none;}
@media(max-width:760px){ .ops-task{max-width:none;} .ops-table{font-size:12.5px;} }`;
document.head.appendChild(css);
})();
