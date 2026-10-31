/* ============================================================
   ✉️ Insurance Email Simulator (#/claimsmail): Day 11's afternoon activity, in place of its shadowing
   Loaded after js/ft-assess.js. Three cases, each a case file and four emails written in a mail client's compose window:
     1. send the LOR (the right file attached, named by the convention)
     2. request the Dec Pages / policy limits
     3. request the claim information (and, in case 3, check for an existing claim)
     4. the additional activity: the adjuster's reply lands in the inbox once 1–3 are sent, and the trainee answers it to
        get the claim number, without giving away what a carrier is never given (Day 10's What to Share)
   Each email, as sent (To, Cc, Subject, the attachments, the body), is an answer of the on-platform assessment
   "claims-email": it saves in assess:<id> through js/ft-assess.js (one copy of that record on the page), and
   📝 Submit for Grading has worker.js grade the twelve emails against assess-keys.js (out of 5 each, by the AI; else
   the trainer). The score is on 🏅 My Performance (js/ft-drive.js ftDriveItems). The drafts save as d_<item>.
   ============================================================ */
(function(){
"use strict";
const DOC = "claims-email";
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;
const firstName = () => String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";
const today = () => { const d = new Date(), p = x => String(x).padStart(2, "0"); return `${p(d.getMonth() + 1)}.${p(d.getDate())}.${String(d.getFullYear()).slice(2)}`; };
const lorFile = (side, carrier) => `INS – ${side} ${carrier} – LOR ${today()} (${firstName() || "VA’s name"}).pdf`;

// the cases (made up for the training: the carriers' addresses are on .example, which never delivers)
const CASES = [
  {id: "s1", tag: "3P", carrier: "State Farm", title: "Daniel Reyes · 3P State Farm", file: [
    ["Client", "Daniel Reyes (driver)"], ["DOL", "10/12/2026"], ["Where", "Main St & 4th Ave, Las Vegas, NV"],
    ["What happened", "Stopped at a red light, rear-ended by State Farm’s insured. Neck and back injuries; treating at Desert Spine & Rehab."],
    ["3P insured", "Karen Whitfield"], ["3P policy", "State Farm SF-88-4410-27 (from the exchange of information)"],
    ["Police report", "LVMPD 26-101284"], ["Claim number", "Not known yet"], ["Claims inbox", "claims@statefarm.example"],
    ["Client’s DOB · SSN · email · VIN", "On file in the CMS"]],
    files: () => [lorFile("3P", "State Farm"), "Police Report – LVMPD 26-101284.pdf", "Driver’s License – Daniel Reyes.jpg", "Medical Records – Desert Spine & Rehab.pdf"],
    adj: {from: "Brian Cole <bcole@statefarm.example>", subject: "Daniel Reyes / DOL 10/12/2026 – your letter",
      body: "Good afternoon,\n\nThank you for your letter of representation. I have been assigned to review this loss. So I can locate the claim and set it up correctly, please send me your client’s date of birth, Social Security number and email address, and the VIN of the vehicle he was driving.\n\nOnce I have those I will send you the claim number.\n\nBrian Cole\nClaims Specialist, State Farm\n(555) 017-2290"}},
  {id: "s2", tag: "1P", carrier: "Progressive", title: "Aisha Thompson · 1P Progressive", file: [
    ["Client", "Aisha Thompson (driver, Progressive’s own insured)"], ["DOL", "10/03/2026"], ["Where", "I-15 southbound near Tropicana Ave, Las Vegas, NV"],
    ["What happened", "Side-swiped by a driver who fled the scene (hit-and-run): no 3P insurance known. Shoulder injury; ER visit, then physical therapy."],
    ["1P policy", "Progressive 9302-551-7 (the client’s own)"], ["Coverages to open", "Medical Payments (MedPay/PIP) and Uninsured Motorist (UM)"],
    ["Police report", "NHP 26-044187"], ["Claim number", "Not known yet"], ["Claims inbox", "claims@progressive.example"],
    ["Signed by the client", "Insurance Authorization (lets the carrier release her policy documents to the firm)"]],
    files: () => [lorFile("1P", "Progressive"), "Insurance Authorization – Aisha Thompson (signed).pdf", "Police Report – NHP 26-044187.pdf", "Driver’s License – Aisha Thompson.jpg"],
    adj: {from: "Lena Ortiz <lortiz@progressive.example>", subject: "Your client Aisha Thompson – policy 9302-551-7",
      body: "Hello,\n\nWe received your letter and have opened a claim for Ms. Thompson’s 10/03/2026 loss. Before I can release the declarations page I will need a signed authorization from our insured.\n\nWe would also like to schedule a recorded statement with Ms. Thompson this week. Could you send me her phone number so I can set that up with her directly?\n\nThank you,\nLena Ortiz\nFirst Party Claims, Progressive"}},
  {id: "s3", tag: "3P", carrier: "Allstate", title: "Marcus Bell · 3P Allstate (existing claim?)", file: [
    ["Client", "Marcus Bell (driver)"], ["DOL", "09/28/2026"], ["Where", "Flamingo Rd & Paradise Rd, Las Vegas, NV"],
    ["What happened", "T-boned by Allstate’s insured, who ran a stop sign. Wrist fracture and back pain."],
    ["3P insured", "Jerome Hayes"], ["Note", "The insured already reported the accident to Allstate: a claim may exist (check before opening a new one)."],
    ["Police report", "LVMPD 26-098812"], ["Claim number", "Not known yet"], ["Claims inbox", "claims@allstate.example"],
    ["Client’s phone · email · DOB", "On file in the CMS"]],
    files: () => [lorFile("3P", "Allstate"), "Police Report – LVMPD 26-098812.pdf", "Driver’s License – Marcus Bell.jpg", "Photos – vehicle damage.zip"],
    adj: {from: "Tom Rinaldi <trinaldi@allstate.example>", subject: "RE: Marcus Bell – DOL 09/28/2026",
      body: "Hi,\n\nThere is an existing claim for this loss, 0627-881-AL, opened when our insured reported it. It is a property damage claim for Mr. Bell’s vehicle; no bodily injury has been set up.\n\nPlease confirm Mr. Bell’s phone number and email so I can reach him directly about his injuries.\n\nTom Rinaldi\nAuto Claims, Allstate"}}];
const TASKS = [
  {k: "lor", ic: "📄", t: "Send the LOR", sub: "Notify the carrier, open the claim, attach the letter"},
  {k: "dec", ic: "📑", t: "Request the Dec Pages", sub: "The policy limits and the Declarations Page"},
  {k: "info", ic: "🔎", t: "Request the claim information", sub: "Claim number, adjuster, coverage, status"},
  {k: "adj", ic: "☎", t: "Reply to the adjuster", sub: "Additional activity: get the claim number"}];
const ITEMS = CASES.flatMap(c => TASKS.map(t => c.id + "_" + t.k));

const C = {n: 0, t: "lor", ret: null, busy: false, mem: {}};
const saves = () => isTrainee();
const ans = () => saves() && window.FTAssess ? FTAssess.answers(DOC) : C.mem;
const put = (k, v) => { if(saves() && window.FTAssess) FTAssess.set(DOC, k, v); else C.mem[k] = v; };
const draft = id => { try{ return JSON.parse(ans()["d_" + id] || "null") || null; }catch(err){ return null; } };
const sent = id => !!String(ans()[id] || "").trim();
const caseOf = () => CASES[C.n];
const ready = c => ["lor", "dec", "info"].every(k => sent(c.id + "_" + k));   // (the adjuster's reply arrives after these)
function blank(c, k){
  if(k === "adj"){ const m = c.adj; return {to: m.from.match(/<([^>]+)>/)[1], cc: "", subject: /^re:/i.test(m.subject) ? m.subject : "Re: " + m.subject, att: [], body: ""}; }
  return {to: "", cc: "", subject: "", att: [], body: ""};
}
const cur = () => { const c = caseOf(), id = c.id + "_" + C.t; return draft(id) || blank(c, C.t); };
// the email as the grader reads it
const asText = (d, c) => `To: ${d.to}\nCc: ${d.cc || "(none)"}\nSubject: ${d.subject}\nAttachments: ${d.att.length ? d.att.map(i => c.files()[i]).join("; ") : "(none)"}\n\n${d.body}`;

function caseFile(c){
  return `<aside class="ce-file card"><p class="ce-eyebrow">📁 Case file · ${e(c.tag)}</p><h3>${e(c.title)}</h3>
    <dl>${c.file.map(([k, v]) => `<dt>${e(k)}</dt><dd>${e(v)}</dd>`).join("")}</dl>
    <p class="ce-rule">🔒 <b>Never</b> share the client’s DOB, SSN, email or VIN with a 3P carrier, and never set up direct contact with a represented client: everything goes through the firm.</p></aside>`;
}
function taskRow(c, t){
  const id = c.id + "_" + t.k, locked = t.k === "adj" && !ready(c), g = graded(), r = g && g.items ? g.items[id] : null;
  const st = locked ? "🔒 After 1–3" : sent(id) ? "✓ Sent" : draft(id) ? "Draft" : "To do";
  return `<button type="button" class="ce-task${C.t === t.k ? " on" : ""}${locked ? " locked" : ""}" onclick="FTClaimsMail.task('${t.k}')"${locked ? " disabled" : ""}>
    <span class="ce-task-ic">${t.ic}</span><span class="ce-task-t"><b>${e(t.t)}</b><small>${e(t.sub)}</small></span>
    <span class="ce-task-st${sent(id) ? " ok" : ""}">${st}${r ? (r.pending ? " · ⏳ trainer" : ` · ${r.pts}/5`) : ""}</span></button>`;
}
function compose(c){
  const t = TASKS.find(x => x.k === C.t), id = c.id + "_" + C.t, d = cur(), files = c.files(), g = graded(), r = g && g.items ? g.items[id] : null;
  const inbox = C.t === "adj" ? (() => { const m = c.adj; return `<article class="ce-mail"><header><span class="ce-av">${e(m.from[0])}</span><div><b>${e(m.from.split("<")[0].trim())}</b> <small>&lt;${e(m.from.match(/<([^>]+)>/)[1])}&gt;</small><br><small>to me · ${e(m.subject)}</small></div></header>
    <div class="ce-mail-b">${e(m.body).replace(/\n/g, "<br>")}</div></article>`; })() : "";
  return `<section class="ce-compose card">${inbox}
    <div class="ce-win"><div class="ce-win-h">${C.t === "adj" ? "↩ Reply" : "New message"} · ${e(t.t)}${sent(id) ? ` <span class="ce-sent">✓ Sent: edit and send again to replace it</span>` : ""}</div>
      <label class="ce-f"><span>To</span><input type="email" value="${e(d.to)}" oninput="FTClaimsMail.set('to',this.value)" placeholder="Recipient"></label>
      <label class="ce-f"><span>Cc</span><input type="text" value="${e(d.cc)}" oninput="FTClaimsMail.set('cc',this.value)" placeholder="(optional)"></label>
      <label class="ce-f"><span>Subject</span><input type="text" value="${e(d.subject)}" oninput="FTClaimsMail.set('subject',this.value)" placeholder="Subject"></label>
      <textarea class="ce-body" rows="12" oninput="FTClaimsMail.set('body',this.value)" placeholder="Write your email: greeting, what you need, the identifiers, closing and signature">${e(d.body)}</textarea>
      <div class="ce-att"><span>📎 Attach from the case file:</span>${files.map((f, i) => `<label><input type="checkbox"${d.att.includes(i) ? " checked" : ""} onchange="FTClaimsMail.att(${i},this.checked)"> ${e(f)}</label>`).join("")}</div>
      <div class="ce-win-f"><button type="button" class="btn btn-primary" onclick="FTClaimsMail.send()">Send</button>
        <span class="ce-muted">${saves() ? "Your draft saves as you type." : "👁 A test copy: nothing is saved."}</span></div></div>
    ${r ? `<p class="ce-note ${r.pending ? "" : r.ok ? "ok" : r.pts ? "part" : "no"}"><b>${r.pending ? "⏳" : r.pts + "/5"}</b> ${e(r.note || "")}</p>` : ""}</section>`;
}
const graded = () => window.FTAssess ? FTAssess.graded(DOC) : null;
function page(){
  const c = caseOf(), n = ITEMS.filter(sent).length, g = graded();
  return `<section class="ce-hero"><p class="ce-eyebrow">Day 11 · PM · Graded activity</p><h1>✉️ Insurance Email Simulator</h1>
      <p>Three cases. For each, write the emails a claims specialist sends to open the claim: the <b>LOR</b>, the <b>Dec Pages / policy limits request</b> and the <b>claim information request</b>. Then the adjuster answers, and you reply to get the <b>claim number</b>. Use the case file, attach the right file, and write as you would to a real carrier. All 12 emails are graded.</p>
      <div class="ce-tabs">${CASES.map((x, i) => `<button type="button" class="ce-tab${i === C.n ? " on" : ""}" onclick="FTClaimsMail.go(${i})">Case ${i + 1}<small>${e(x.title)} · ${TASKS.filter(t => sent(x.id + "_" + t.k)).length}/4 sent</small></button>`).join("")}</div></section>
    <div class="ce-grid">${caseFile(c)}<div class="ce-main"><div class="ce-tasks">${TASKS.map(t => taskRow(c, t)).join("")}</div>${compose(c)}</div></div>
    <div class="ce-foot card">${g ? `<p class="ce-done">✓ Graded ${e(g.when || "")}: <b>${g.score}/${g.max}</b> (${g.pct}%)${g.pending ? " · your trainer grades the rest" : ""}. Your score is on 🏅 My Performance. You can edit your emails and submit again.</p>` : `<p class="ce-muted">${n}/12 emails sent.</p>`}
      <button type="button" class="btn btn-primary" onclick="FTClaimsMail.submit()"${C.busy ? " disabled" : ""}>${C.busy ? "Grading…" : "📝 Submit for Grading"}</button></div>`;
}

window.FTClaimsMail = {
  go(i){ C.n = Math.max(0, Math.min(CASES.length - 1, Number(i) || 0)); C.t = "lor"; render(); },
  task(k){ if(k === "adj" && !ready(caseOf())) return; C.t = k; render(); },
  set(f, v){ const c = caseOf(), id = c.id + "_" + C.t, d = cur(); d[f] = String(v).slice(0, 3200); put("d_" + id, JSON.stringify(d)); },
  att(i, on){ const c = caseOf(), id = c.id + "_" + C.t, d = cur(); d.att = d.att.filter(x => x !== i); if(on) d.att.push(i); d.att.sort(); put("d_" + id, JSON.stringify(d)); },
  send(){
    const c = caseOf(), id = c.id + "_" + C.t, d = cur();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(d.to).trim())){ toast("Add the recipient’s email address in To."); return; }
    if(!String(d.subject).trim()){ toast("Add a subject line."); return; }
    if(String(d.body).trim().split(/\s+/).length < 15){ toast("Write the email first: a greeting, what you need, the identifiers and your signature."); return; }
    put(id, asText(d, c).slice(0, 4000));
    const next = TASKS.find(t => !sent(c.id + "_" + t.k) && (t.k !== "adj" || ready(c)));
    toast(C.t !== "adj" && ready(c) && !sent(c.id + "_adj") ? "✓ Sent. 📥 The adjuster has replied: answer them to get the claim number." : "✓ Sent.");
    if(next) C.t = next.k;
    else if(C.n < CASES.length - 1 && TASKS.some(t => !sent(CASES[C.n + 1].id + "_" + t.k))){ C.n++; C.t = "lor"; }
    render();
  },
  async submit(){
    if(C.busy) return;
    if(!isTrainee() || state.adminPreview){ toast("Trainees submit their own emails for grading."); return; }
    const left = ITEMS.filter(id => !sent(id)).length;
    if(left && !confirm(`${left} of 12 emails aren’t sent yet: they score 0. Submit for grading anyway?`)) return;
    C.busy = true; render();
    try{ await FTAssess.grade(DOC); toast("✓ Graded. Your score is on 🏅 My Performance."); }
    catch(err){ toast(err.message && !/^(save|send)$/.test(err.message) ? err.message : "Couldn’t submit. Check your connection and try again."); }
    C.busy = false; render();
  },
  // opened from a deck slide (Day 11's PM): ← back to the deck on the slide after it, as js/ft-transcribe.js does
  fromDeck(){
    const d = window.FTDayDecks && FTDayDecks.state && FTDayDecks.state();
    const i = (Number(d && d.i) || 0) + 1, nx = d && d.day != null && FTDayDecks.list ? (FTDayDecks.list(d.day) || [])[i] : null;
    C.ret = d && d.day != null && state.view === "daydeck" ? {day: d.day, i, h: nx ? String(nx.h || "").replace(/^(AM|PM|Entire Day):\s*/, "") : ""} : null;
    goto("claimsmail");
  },
  toDeck(){ const r = C.ret; C.ret = null; if(r && window.FTDayDecks) FTDayDecks.open(r.day, r.i); else goto("simulators"); },
  cases: CASES, items: ITEMS
};

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["claimsmail"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {claimsmail: "Insurance Email Simulator"});
const __render = window.render;
window.render = function(){
  if(state.view !== "claimsmail") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  // (the trainee's answers first: an edit before they load would save over the others)
  if(saves() && window.FTAssess && C.ok !== state.traineeId && C.loading !== state.traineeId){
    const id = C.loading = state.traineeId;
    FTAssess.ready().then(() => { C.ok = id; C.loading = null; if(state.view === "claimsmail") render(); });
  }
  const wait = saves() && C.ok !== state.traineeId;
  const back = C.ret ? `<a class="back-link" onclick="FTClaimsMail.toDeck()">&larr; Back to the deck${C.ret.h ? ": " + e(C.ret.h) : ""}</a>`
    : `<a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>`;
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-ce">${back}${adminOn() ? `<p class="ce-copy card">👁 Your test copy: the trainees’ graded emails are on their 🏅 My Performance.</p>` : ""}${wait ? `<p class="ce-muted card ce-copy">Loading your emails…</p>` : page()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};

(function(){ const s = document.createElement("style"); s.id = "ft-claims-email"; s.textContent = `
main.main-ce{max-width:1320px;margin:0 auto;padding:18px 20px 48px;display:flex;flex-direction:column;gap:14px;}
.ce-copy{padding:10px 14px;background:#FFF8EF;border:1px dashed #DB8437;font-size:14px;margin:0;}
.ce-hero{background:#262B45;color:#fff;border-radius:18px;padding:18px 24px;}
.ce-eyebrow{margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#F4B77A;}
.ce-hero h1{margin:0 0 6px;font:800 28px/1.15 'Poppins','Inter',sans-serif;color:#fff;}
.ce-hero p{margin:0;color:#DDE2EE;max-width:100ch;line-height:1.5;}
.ce-tabs{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;}
.ce-tab{display:flex;flex-direction:column;align-items:flex-start;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:12px;padding:8px 16px;cursor:pointer;font:700 14.5px 'Inter',sans-serif;}
.ce-tab small{font-weight:500;font-size:12px;color:#C9CFDD;} .ce-tab.on{background:#DB8437;border-color:#DB8437;} .ce-tab.on small{color:#fff;}
.ce-grid{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);gap:14px;align-items:start;}
@media(max-width:900px){ .ce-grid{grid-template-columns:minmax(0,1fr);} }
.ce-file{padding:14px 16px;margin:0;} .ce-file .ce-eyebrow{color:var(--orange-deep);} .ce-file h3{margin:0 0 8px;color:var(--navy);font-size:17px;}
.ce-file dl{margin:0;font-size:13.5px;line-height:1.4;} .ce-file dt{font-weight:800;color:var(--navy);margin-top:7px;} .ce-file dd{margin:0;color:var(--ink);}
.ce-rule{margin:12px 0 0;padding:8px 10px;border-left:4px solid var(--danger);background:#FEF2F2;border-radius:8px;font-size:13px;line-height:1.45;}
.ce-main{display:flex;flex-direction:column;gap:12px;min-width:0;}
.ce-tasks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;} @media(max-width:1100px){ .ce-tasks{grid-template-columns:repeat(2,minmax(0,1fr));} }
.ce-task{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;font:inherit;color:var(--ink);}
.ce-task.on{border-color:#DB8437;box-shadow:0 0 0 3px rgba(219,132,55,.18);} .ce-task.locked{opacity:.55;cursor:not-allowed;}
.ce-task-ic{font-size:18px;} .ce-task-t b{display:block;color:var(--navy);font-size:14.5px;} .ce-task-t small{color:var(--ink-soft);font-size:12.5px;}
.ce-task-st{font-size:12px;font-weight:800;color:var(--ink-soft);} .ce-task-st.ok{color:var(--success);}
.ce-compose{padding:14px;margin:0;display:flex;flex-direction:column;gap:12px;}
.ce-mail{border:1px solid var(--line);border-radius:12px;padding:12px 14px;background:#F8F9FC;}
.ce-mail header{display:flex;gap:10px;align-items:center;margin-bottom:8px;font-size:14px;} .ce-mail small{color:var(--ink-soft);}
.ce-av{width:34px;height:34px;border-radius:50%;background:#0b57d0;color:#fff;display:grid;place-items:center;font-weight:800;}
.ce-mail-b{font-size:14.5px;line-height:1.5;color:var(--ink);}
.ce-win{border:1px solid #C9CFDD;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 6px 18px rgba(30,35,64,.12);}
.ce-win-h{background:#404660;color:#fff;font-weight:700;font-size:14px;padding:8px 14px;} .ce-sent{font-weight:600;color:#BFF0D0;margin-left:8px;font-size:12.5px;}
.ce-f{display:flex;align-items:center;border-bottom:1px solid #E6E8EF;padding:0 14px;} .ce-f span{width:64px;color:var(--ink-soft);font-size:13.5px;}
.ce-f input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:14.5px;padding:9px 0;}
.ce-body{display:block;width:100%;box-sizing:border-box;border:0;outline:0;resize:vertical;font:inherit;font-size:14.5px;line-height:1.5;padding:12px 14px;min-height:220px;}
.ce-att{display:flex;flex-wrap:wrap;gap:6px 14px;padding:8px 14px;border-top:1px solid #E6E8EF;background:#F8F9FC;font-size:13px;} .ce-att > span{font-weight:700;color:var(--navy);width:100%;}
.ce-att label{display:inline-flex;gap:6px;align-items:center;cursor:pointer;}
.ce-win-f{display:flex;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid #E6E8EF;}
.ce-muted{color:var(--ink-soft);font-size:13px;margin:0;}
.ce-note{margin:0;padding:8px 12px;border-radius:10px;font-size:13.5px;background:#F6F8FC;} .ce-note.ok b{color:var(--success);} .ce-note.part b{color:#B7791F;} .ce-note.no b{color:var(--danger);}
.ce-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;margin:0;}
.ce-done{margin:0;color:var(--success);font-weight:700;}
`; document.head.appendChild(s); })();
})();
