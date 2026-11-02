/* ============================================================
   🕘 ATTENDANCE (Admin → Admin Master Control → 🕘 Attendance)
   ------------------------------------------------------------
   Every active trainee of this program, batch by batch, with their Time In for the day: the automatic one the course
   records on their first visit (checkin:<YYYY-MM-DD>:<id>, worker.js checkIn, Eastern time). A trainee with no visit yet
   is listed too, as ⏳ Not in yet, so nobody drops off the sheet because they haven't opened the course. Active means
   approved, not archived, rejected or offboarded. The day steps back and forward; ⬇ CSV saves the day.
   The Training Portal's attendance page (Time Out, status tags, the Google Sheet) is linked; it reads the same Time In.
   Loaded after js/ft-admin-ops.js, which puts its tabs in 🛡 Admin Master Control (js/ft-program.js adminGroups).
   ============================================================ */
(function(){
"use strict";
if(typeof window.ftAdminTab !== "function") return;
const e = v => esc(String(v == null ? "" : v));
const PORTAL_ATTENDANCE = "https://cm-training-activity.pages.dev/attendance.html";
// today in Eastern time, as the Worker dates a check-in
const etToday = () => new Intl.DateTimeFormat("en-CA", {timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date());
const shift = (d, n) => { const t = new Date(d + "T12:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const nice = d => new Date(d + "T12:00:00Z").toLocaleDateString(undefined, {weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC"});
const t12 = hm => { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || "")); if(!m) return ""; let h = Number(m[1]); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}:${m[2]} ${ap}`; };
const keyOf = r => typeof batchKey === "function" ? batchKey(r) : String((r && r.batch) || "");
const labelOf = b => typeof batchLabel === "function" ? batchLabel(b) : b;
const active = r => r && r.id && r.approved === true && !r.archived && !r.rejected && !r.offboarded && !r.purgedAt;

const A = {day: null, people: null, ins: {}, loading: false, err: ""};
async function load(){
  if(A.loading) return; A.loading = true; A.err = "";
  try{
    if(!A.people){
      const keys = await sharedList("trainee:");
      A.people = (await sharedGetMany(keys)).filter(active);
    }
    const day = A.day, keys = await sharedList(`checkin:${day}:`), vals = keys.length ? await sharedGetMany(keys) : [];
    const ins = {}; keys.forEach((k, i) => { if(vals[i]) ins[k.slice(`checkin:${day}:`.length)] = vals[i]; });
    A.ins[day] = ins;
  }catch(err){ A.err = "Couldn’t load the attendance. Try ↻ Refresh."; }
  A.loading = false;
  if(state.view === "admin" && state.adminTab === "attendance") render();
}
function rows(){
  const ins = A.ins[A.day] || {}, by = {};
  (A.people || []).forEach(r => { const b = keyOf(r) || "—"; (by[b] = by[b] || []).push(r); });
  return Object.keys(by).sort().reverse().map(b => ({b, list: by[b].sort((x, y) => String(x.name).localeCompare(String(y.name))).map(r => ({r, c: ins[r.id] || null}))}));
}
function render_(){
  if(!A.day) A.day = etToday();
  if(!A.people || !A.ins[A.day]){ load(); return `<div class="card" style="padding:24px;">Loading the attendance…</div>`; }
  const groups = rows(), all = groups.reduce((n, g) => n + g.list.length, 0), inN = groups.reduce((n, g) => n + g.list.filter(x => x.c).length, 0);
  return `<div class="card fat-admin">
    <div class="fat-bar"><div><p class="lp-eyebrow">🛡 Admin · Attendance</p><h2>🕘 Attendance</h2>
      <p class="fat-sub">Every active trainee, batch by batch, with the Time In the course records on their first visit of the day (Eastern time). Trainees not in yet are listed too.</p></div>
      <a class="btn btn-ghost btn-sm" href="${PORTAL_ATTENDANCE}" target="_blank" rel="noopener">Open the Portal’s attendance ↗</a></div>
    <div class="fat-day"><button class="btn btn-ghost btn-sm" type="button" onclick="FTAttendance.day(-1)">◀</button>
      <input type="date" value="${e(A.day)}" onchange="FTAttendance.set(this.value)"><button class="btn btn-ghost btn-sm" type="button" onclick="FTAttendance.day(1)">▶</button>
      <b>${e(nice(A.day))}</b><span class="fat-count">${inN} of ${all} in</span>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTAttendance.refresh()">↻ Refresh</button>
      <button class="btn btn-ghost btn-sm" type="button" onclick="FTAttendance.csv()">⬇ CSV</button></div>
    ${A.err ? `<p class="fat-err">${e(A.err)}</p>` : ""}
    ${groups.length ? groups.map(g => `<div class="fat-batch"><h3>📁 Batch ${e(labelOf(g.b))} <span>${g.list.filter(x => x.c).length} of ${g.list.length} in</span></h3>
      <table class="fat-tbl"><thead><tr><th>#</th><th>Name</th><th>Time In (EST)</th><th>Training</th></tr></thead><tbody>
      ${g.list.map((x, i) => `<tr class="${x.c ? "in" : "out"}"><td>${i + 1}</td><td><b>${e(x.r.name || x.r.id)}</b>${x.r.batchFrom ? `<span class="fat-moved"> · moved from ${e(x.r.batchFrom)}</span>` : ""}</td>
        <td>${x.c ? `✅ ${e(t12(x.c.timeIn))}` : `⏳ Not in yet`}</td><td>${e((x.c && x.c.training) || "")}</td></tr>`).join("")}</tbody></table></div>`).join("")
      : `<p class="fat-sub">No active trainees.</p>`}
  </div>`;
}
window.FTAttendance = {
  day(n){ A.day = shift(A.day || etToday(), n); render(); },
  set(d){ if(/^\d{4}-\d{2}-\d{2}$/.test(d)){ A.day = d; render(); } },
  refresh(){ A.people = null; A.ins = {}; render(); },
  csv(){
    const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lines = [["Date", "Batch", "Name", "Time In (EST)", "Training"].map(q).join(",")];
    rows().forEach(g => g.list.forEach(x => lines.push([A.day, labelOf(g.b), x.r.name || x.r.id, x.c ? t12(x.c.timeIn) : "Not in", (x.c && x.c.training) || ""].map(q).join(","))));
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], {type: "text/csv"})); a.download = `Attendance ${A.day}.csv`; a.click();
  },
  state: () => A
};
ftAdminTab("attendance", "🕘 Attendance", render_);
(function(){ const s = document.createElement("style"); s.id = "ft-attendance"; s.textContent = `
.fat-admin{padding:20px 22px;}
.fat-bar{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;}
.fat-bar h2{margin:0 0 4px;color:var(--navy);} .fat-sub{margin:0 0 10px;color:#2E3450;font-weight:600;}
.fat-day{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0 12px;}
.fat-day input{font:inherit;padding:4px 8px;border:1.5px solid #9CA3BD;border-radius:8px;}
.fat-count{padding:3px 10px;border-radius:999px;background:#EEF0F6;font-weight:800;color:#1B2240;}
.fat-err{color:#B42318;font-weight:700;}
.fat-batch{margin:12px 0 0;} .fat-batch h3{margin:0 0 6px;font-size:17px;color:#1B2240;} .fat-batch h3 span{font-size:14px;color:#4A5070;font-weight:700;margin-left:6px;}
.fat-tbl{width:100%;border-collapse:collapse;font-size:15px;}
.fat-tbl th{text-align:left;padding:6px 10px;background:#1E2340;color:#fff;font-weight:800;}
.fat-tbl td{padding:6px 10px;border-bottom:1px solid #DCE0EC;color:#141A2E;font-weight:600;}
.fat-tbl tr.out td{background:#FFF8EC;} .fat-moved{color:#6B7090;font-weight:600;font-size:13px;}
`; document.head.appendChild(s); })();
})();
