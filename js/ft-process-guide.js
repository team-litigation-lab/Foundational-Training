/* ============================================================
   📘 Process Guide (#/guide) — 🧰 Drafting Tools. Before each recorded demo the Training Guide has the trainee
   "watch the tutorial video and create your own notes or work guide": here they build it on a page that works
   like Word, with the tutorial playing beside it —
     • headings, bold / italic / underline / strikethrough, highlight and font colour, bullets and numbering,
       indent, alignment, hyperlinks, tables, a horizontal line, undo / redo, clear formatting
     • screenshots pasted (Ctrl+V) or dropped straight onto the page, or inserted from a file; click one to size it
     • 📐 Start from the outline: title, tools, naming convention, the steps, the reporting templates, reminders
   with its checks (a title, 8+ numbered steps, 2+ screenshots, a hyperlink, the naming convention, 300+ words),
   ⬇ Download as Word (pictures included), 📋 Copy for Google Docs, and 📤 Submit to the trainer.
   One guide per demo (GUIDES). Record: guide:<id>:<guide id>, the trainee's own (worker.js, up to 5 MB — the
   screenshots are shrunk on paste). Everything shown is cleaned first (clean()): only formatting, links and
   pictures survive, so a guide can never run code on the trainer's page. An admin and 👁 Trainee view work on a
   test copy that is never saved; an admin reads any trainee's guides at the top of the page.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const isTrainee = () => !!state.traineeId && !state.isAdmin;
const adminOn = () => !!state.isAdmin && !state.adminPreview && !state.traineeId;
const saves = () => isTrainee();
const DRIVE = id => `https://drive.google.com/file/d/${id}/view?usp=sharing`;
const GUIDES = [
  {id: "intake-packet", day: 8, lesson: 6, title: "Saving the Intake Packet and Extracted Intake Documents in SA", video: "19nLaPeT0PLq2fBSqtC6S2dVYfUYek3pK"},
  {id: "lor-send", day: 12, lesson: 7, title: "Saving LORs to SA and Sending Them to the 1P & 3P Insurance Companies", video: "1zLB0gIWZpMCozH2U3hpw8qmgKtvcjO9W"},
  {id: "medlor", day: 14, lesson: 8, title: "Sending the MedLOR and Requesting Medical Bills & Records", video: "16Oy2X1S9nokz5tqMm_P6nByqYaakvGDU"},
  {id: "lv", day: 16, lesson: 8, title: "Sending a Lien Balance Verification Request", video: "1wRXRh8TySsosyxurXzhtCYwbXDJyN9A9"},
  {id: "bills-records", day: 17, lesson: 9, title: "Saving Medical Bills & Records", video: "1L2AkDVDJWKVD9VH1xyQ0pkpBjsPUNNQl"},
  {id: "reduction", day: 18, lesson: 9, title: "Drafting and Sending the Reduction Request and Closing Statement", video: "1EcVjtKuR-cYQ-K3QomaADzBiJ05Apu6X"}
];
const MAX = 4800000;
const guideOpen = g => state.isAdmin || state.adminPreview || (typeof dayUnlocked === "function" ? !!dayUnlocked(g.lesson) : true);
const firstName = () => String(state.certName || state.traineeName || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";

/* ---------- only formatting, links and pictures: nothing that runs ---------- */
const TAGS = new Set(["P", "DIV", "BR", "H1", "H2", "H3", "H4", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "FONT", "MARK", "UL", "OL", "LI", "A", "IMG", "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "HR", "BLOCKQUOTE", "SUB", "SUP", "CODE", "PRE"]);
const STYLE_OK = /^(color|background-color|text-align|font-weight|font-style|text-decoration|width|margin-left|padding-left)$/;
function clean(html){
  const t = document.createElement("template"); t.innerHTML = String(html || "");
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if(n.nodeType === 8){ n.remove(); return; }
      if(n.nodeType !== 1) return;
      if(!TAGS.has(n.tagName)){
        if(/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|svg|SVG|MATH|TEMPLATE|NOSCRIPT|FORM|INPUT|BUTTON|TEXTAREA|SELECT)$/.test(n.tagName)){ n.remove(); return; }
        walk(n); n.replaceWith(...n.childNodes); return;
      }
      [...n.attributes].forEach(a => {
        const k = a.name.toLowerCase(), v = a.value;
        if(n.tagName === "A" && k === "href" && /^(https?:|mailto:)/i.test(v.trim())) return;
        if(n.tagName === "IMG" && k === "src" && /^(data:image\/(png|jpe?g|gif|webp);base64,|https:)/i.test(v.trim())) return;
        if(n.tagName === "IMG" && k === "alt") return;
        if((n.tagName === "TD" || n.tagName === "TH") && (k === "colspan" || k === "rowspan") && /^\d{1,2}$/.test(v)) return;
        if(n.tagName === "FONT" && k === "color" && /^#?[0-9a-z]{3,20}$/i.test(v)) return;
        if(k === "style"){ const keep = v.split(";").map(x => x.trim()).filter(x => { const [p, ...r] = x.split(":"); const val = r.join(":"); return p && STYLE_OK.test(p.trim().toLowerCase()) && !/url\(|expression|javascript/i.test(val); }).join("; "); if(keep) { n.setAttribute("style", keep); return; } }
        if(k === "data-size" && /^(s|m|l|full)$/.test(v)) return;
        n.removeAttribute(a.name);
      });
      if(n.tagName === "A"){ n.setAttribute("target", "_blank"); n.setAttribute("rel", "noopener noreferrer"); }
      walk(n);
    });
  };
  walk(t.content);
  const box = document.createElement("div"); box.appendChild(t.content); return box.innerHTML;
}

/* ---------- the record: one per guide ---------- */
const G = {id: null, cur: null, recs: {}, loading: {}, timer: null, admin: null, view: null, sel: null, video: true};
const keyOf = gid => `guide:${state.traineeId}:${gid}`;
function rec(gid){
  if(!saves()){ G.recs["__copy:" + gid] = G.recs["__copy:" + gid] || {html: ""}; return G.recs["__copy:" + gid]; }
  return G.recs[gid] || null;
}
function load(gid){
  if(!saves() || G.recs[gid] || G.loading[gid]) return;
  G.loading[gid] = sharedGet(keyOf(gid)).then(v => { G.recs[gid] = v && typeof v === "object" ? v : {html: ""}; })
    .catch(() => { G.recs[gid] = {html: ""}; }).then(() => { delete G.loading[gid]; if(state.view === "guide") render(); });
}
function paintSave(t){ const el = document.getElementById("pgSave"); if(el) el.textContent = saves() ? t : "Test copy — nothing here is saved."; }
function saveNow(){
  const gid = G.cur, r = rec(gid), page = document.getElementById("pgPage"); if(!r || !page) return;
  r.html = clean(page.innerHTML); r.updatedAt = new Date().toISOString();
  const s = stats(r.html); r.words = s.words; r.imgs = s.imgs;
  paintChecks();
  if(!saves()) return;
  if(r.html.length > MAX){ paintSave("⚠ Too large to save: use fewer or smaller screenshots."); return; }
  clearTimeout(G.timer); paintSave("Saving…");
  G.timer = setTimeout(() => sharedSet(keyOf(gid), r).then(ok => paintSave(ok === false ? "⚠ Not saved. Check your connection." : "All changes saved")), 1200);
}

/* ---------- what a usable process guide has ---------- */
function stats(html){
  const t = document.createElement("template"); t.innerHTML = html || "";
  const c = t.content, text = c.textContent || "";
  return {words: (text.trim().match(/\S+/g) || []).length, imgs: c.querySelectorAll("img").length, steps: c.querySelectorAll("ol > li").length,
    links: c.querySelectorAll("a[href]").length, title: [...c.querySelectorAll("h1, h2")].some(h => h.textContent.trim().length > 3),
    naming: /naming convention/i.test(text)};
}
function checks(html){
  const s = stats(html);
  return [["A title (Heading 1 or 2)", s.title, ""], ["The steps as a numbered list (8 or more)", s.steps >= 8, `${s.steps} steps`],
    ["Screenshots of the screens (2 or more)", s.imgs >= 2, `${s.imgs} pictures`], ["A hyperlink (e.g. to the template or the folder)", s.links >= 1, `${s.links} links`],
    ["The naming convention", s.naming, ""], ["Detailed enough to follow alone (300+ words)", s.words >= 300, `${s.words} words`]];
}
const pctOf = cs => Math.round(cs.filter(c => c[1]).length / cs.length * 100);
function paintChecks(){
  const box = document.getElementById("pgChecks"), page = document.getElementById("pgPage"); if(!box || !page) return;
  const cs = checks(clean(page.innerHTML)), pct = pctOf(cs);
  box.innerHTML = `<div class="pg-ck-h"><b>✅ Your guide</b><span class="pg-pct ${pct >= 80 ? "ok" : ""}">${pct}%</span></div>
    <ul>${cs.map(c => `<li class="${c[1] ? "ok" : ""}">${c[1] ? "✓" : "○"} ${e(c[0])}${c[2] ? `<small>${e(c[2])}</small>` : ""}</li>`).join("")}</ul>`;
}

/* ---------- pictures: shrunk on the way in ---------- */
function shrink(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.82)); }; img.onerror = rej; img.src = fr.result; };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}
async function insertImages(files){
  for(const f of files){
    if(!/^image\//.test(f.type)) continue;
    try{ const src = await shrink(f); exec("insertHTML", `<p><img src="${src}" alt="Screenshot" data-size="l"></p><p><br></p>`); }catch(err){ toast("Couldn’t read that picture."); }
  }
  saveNow();
}
function exec(cmd, val){ const p = document.getElementById("pgPage"); if(!p || p.getAttribute("contenteditable") !== "true") return; p.focus(); document.execCommand(cmd, false, val); }

/* ---------- the Word file: an MHTML document, so the pictures travel inside it ---------- */
function wordFile(html, title){
  const imgs = [];
  const body = html.replace(/<img([^>]*?)src="data:(image\/[a-z]+);base64,([^"]+)"([^>]*)>/g, (m, a, type, b64, z) => {
    const ext = type.split("/")[1].replace("jpeg", "jpg"), name = `image${String(imgs.length + 1).padStart(3, "0")}.${ext}`;
    imgs.push({name, type, b64});
    const size = (m.match(/data-size="(\w+)"/) || [])[1], w = {s: 160, m: 320, l: 520, full: 640}[size] || 520;
    return `<img${a}src="${name}" width="${w}"${z}>`;
  });
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${e(title)}</title>
    <style>body{font-family:Calibri,Arial;font-size:11pt} h1{font-size:18pt;color:#262B45} h2{font-size:14pt;color:#262B45} h3{font-size:12pt} table{border-collapse:collapse} td,th{border:1px solid #999;padding:4pt 6pt} img{max-width:100%}</style></head><body>${body}</body></html>`;
  const B = "----=_NextPart_LSH_Guide", b64 = s => btoa(unescape(encodeURIComponent(s))), wrap = s => s.replace(/(.{76})/g, "$1\r\n");
  let out = `MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="${B}"; type="text/html"\r\n\r\n--${B}\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/guide.htm\r\n\r\n${wrap(b64(doc))}\r\n`;
  imgs.forEach(i => { out += `--${B}\r\nContent-Type: ${i.type}\r\nContent-Transfer-Encoding: base64\r\nContent-Location: file:///C:/${i.name}\r\n\r\n${wrap(i.b64)}\r\n`; });
  return out + `--${B}--\r\n`;
}

/* ---------- the page ---------- */
const OUTLINE = g => `<h1>${e(g.title)}</h1>
  <p><b>Prepared by:</b> ${e(state.certName || state.traineeName || "")}</p>
  <h2>Tools</h2><ul><li>CMS: Smart Advocate</li><li>Notepad</li><li>Nitro Pro (PDF editor)</li></ul>
  <h2>Naming convention</h2><p>Type the complete naming convention here, with an example.</p>
  <h2>Steps</h2><ol><li>Verify the correct client case / matter in SA.</li><li>Check the assigned task in the TASK MENU.</li><li></li></ol>
  <h2>Reporting templates</h2><p><b>Notes tab:</b> </p><p><b>Tasks tab:</b> </p>
  <h2>Reminders</h2><ul><li></li></ul>`;
const TOOLS = [
  [["undo", "↶", "Undo"], ["redo", "↷", "Redo"]],
  [["block", "", "Style"]],
  [["bold", "<b>B</b>", "Bold (Ctrl+B)"], ["italic", "<i>I</i>", "Italic (Ctrl+I)"], ["underline", "<u>U</u>", "Underline (Ctrl+U)"], ["strikeThrough", "<s>S</s>", "Strikethrough"]],
  [["hilite", "🖍", "Highlight"], ["red", "<span style='color:#C0392B'>A</span>", "Red text"], ["navy", "<span style='color:#262B45'>A</span>", "Navy text"]],
  [["insertUnorderedList", "• ≡", "Bullets"], ["insertOrderedList", "1. ≡", "Numbering"], ["outdent", "⇤", "Decrease indent"], ["indent", "⇥", "Increase indent"]],
  [["justifyLeft", "⬅", "Align left"], ["justifyCenter", "↔", "Center"], ["justifyRight", "➡", "Align right"]],
  [["link", "🔗", "Insert link (Ctrl+K)"], ["unlink", "⛓‍💥", "Remove link"], ["image", "🖼", "Insert picture"], ["table", "▦", "Insert table"], ["insertHorizontalRule", "―", "Horizontal line"]],
  [["removeFormat", "⌫", "Clear formatting"]]
];
function toolbar(ro){
  return `<div class="pg-tools" role="toolbar" aria-label="Formatting">${TOOLS.map(grp => `<span class="pg-grp">${grp.map(([c, label, tip]) => c === "block"
    ? `<select class="pg-style" ${ro ? "disabled" : ""} onchange="FTGuide.cmd('formatBlock', this.value); this.selectedIndex = 0;" title="${tip}"><option value="">Style…</option><option value="P">Normal</option><option value="H1">Heading 1</option><option value="H2">Heading 2</option><option value="H3">Heading 3</option><option value="BLOCKQUOTE">Quote</option></select>`
    : `<button type="button" class="pg-btn" title="${tip}" aria-label="${tip}" ${ro ? "disabled" : ""} onmousedown="event.preventDefault()" onclick="FTGuide.tool('${c}')">${label}</button>`).join("")}</span>`).join("")}
    <input type="file" id="pgFile" accept="image/*" multiple hidden onchange="FTGuide.files(this.files); this.value = ''"></div>`;
}
function renderEditor(){
  const g = GUIDES.find(x => x.id === G.cur) || GUIDES[0];
  if(!guideOpen(g)) return `<div class="pg-hero"><p class="pg-eyebrow">🧰 Drafting Tools · prepare for your demo</p><h1>📘 Process Guide</h1>
      <p>🔒 Your guides open with their lessons: the first one, for Day ${GUIDES[0].day}, when your trainer opens ${e(typeof ftName === "function" ? ftName(GUIDES[0].lesson) : "its lesson")} for your batch.</p></div>`;
  if(saves()){ load(g.id); if(!G.recs[g.id]) return `<div class="card" style="padding:24px;">Loading your guide…</div>`; }
  const r = rec(g.id), ro = !!r.submittedAt, cs = checks(r.html || ""), pct = pctOf(cs);
  const tabs = GUIDES.map(x => { const o = guideOpen(x), st = saves() ? G.recs[x.id] : null;
    return `<button type="button" class="pg-tab${x.id === g.id ? " on" : ""}" ${o ? `onclick="FTGuide.pick('${x.id}')"` : "disabled"} title="${e(x.title)}"><b>Day ${x.day}</b><small>${o ? (st && st.submittedAt ? "✓ Submitted" : st && st.html ? "In progress" : "") || e(x.title.split(" ").slice(0, 3).join(" ")) + "…" : "🔒 Locked"}</small></button>`; }).join("");
  return `${!saves() ? `<div class="card pg-copy">👁 ${state.adminPreview ? "Trainee view" : "Test copy"} — nothing you write here is saved.</div>` : ""}
    <div class="pg-hero"><p class="pg-eyebrow">🧰 Drafting Tools · prepare for your demo</p><h1>📘 Process Guide</h1>
      <p>Watch the tutorial and build the guide you’ll follow in your demo — like a document in Word: headings, numbered steps, screenshots, links and tables.</p>
      <div class="pg-tabs">${tabs}</div></div>
    <div class="pg-title-row"><h2>Day ${g.day} · ${e(g.title)}</h2><span class="pg-save" id="pgSave">${saves() ? (r.updatedAt ? "All changes saved" : "") : "Test copy — nothing here is saved."}</span></div>
    <div class="pg-work${G.video ? "" : " novideo"}">
      <div class="pg-docwrap">
        ${toolbar(ro)}
        <div class="pg-imgbar" id="pgImgBar" hidden><span>Picture size:</span>${[["s", "Small"], ["m", "Medium"], ["l", "Large"], ["full", "Full width"]].map(([k, l]) => `<button type="button" onmousedown="event.preventDefault()" onclick="FTGuide.imgSize('${k}')">${l}</button>`).join("")}<button type="button" onmousedown="event.preventDefault()" onclick="FTGuide.imgDel()">🗑 Remove</button></div>
        <div class="pg-paper"><div class="pg-page" id="pgPage" contenteditable="${ro ? "false" : "true"}" spellcheck="true" data-placeholder="Start typing your guide, paste screenshots (Ctrl+V), or press 📐 Start from the outline.">${clean(r.html || "")}</div></div>
      </div>
      <aside class="pg-side">
        ${G.video ? `<div class="card pg-vid"><div class="pg-vid-h"><b>🎬 The tutorial</b><button type="button" class="btn btn-ghost btn-sm" onclick="FTGuide.toggleVideo()">Hide</button></div>
          <div class="pg-player"><iframe src="https://drive.google.com/file/d/${g.video}/preview" allow="autoplay" title="Tutorial"></iframe></div>
          <a class="pg-open" href="${DRIVE(g.video)}" target="_blank" rel="noopener noreferrer">Open the video in a new tab ↗</a></div>`
          : `<button type="button" class="btn btn-ghost btn-sm" onclick="FTGuide.toggleVideo()">🎬 Show the tutorial</button>`}
        <div class="card pg-ck" id="pgChecks"><div class="pg-ck-h"><b>✅ Your guide</b><span class="pg-pct ${pct >= 80 ? "ok" : ""}">${pct}%</span></div>
          <ul>${cs.map(c => `<li class="${c[1] ? "ok" : ""}">${c[1] ? "✓" : "○"} ${e(c[0])}${c[2] ? `<small>${e(c[2])}</small>` : ""}</li>`).join("")}</ul></div>
        <div class="card pg-acts">
          ${ro ? "" : `<button type="button" class="btn btn-ghost btn-sm" onclick="FTGuide.outline()">📐 Start from the outline</button>`}
          <button type="button" class="btn btn-ghost btn-sm" onclick="FTGuide.download()">⬇ Download as Word</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="FTGuide.copy()">📋 Copy for Google Docs</button>
          ${r.submittedAt ? `<p class="pg-sub">📤 Submitted ${e(new Date(r.submittedAt).toLocaleString())}</p><button type="button" class="btn btn-ghost btn-sm" onclick="FTGuide.redo()">🔁 Revise</button>`
            : `<button type="button" class="btn btn-navy" onclick="FTGuide.submit()">📤 Submit to your trainer</button>`}
        </div>
      </aside>
    </div>`;
}
async function loadAdmin(){
  G.admin = {rows: null};
  try{
    const ids = ((await sharedList("trainee:")) || []).map(k => String(k).replace(/^trainee:/, ""));
    const get = window.ftGetMany || sharedGetMany;
    const people = await get(ids.map(id => "trainee:" + id));
    G.admin.rows = ids.map((id, i) => ({id, p: people[i] || {}})).filter(x => x.p.approved && !x.p.archived).sort((a, b) => String(a.p.name || "").localeCompare(String(b.p.name || "")));
  }catch(err){ G.admin.rows = []; }
  if(state.view === "guide") render();
}
function renderAdmin(){
  if(!G.admin) loadAdmin();
  const rows = G.admin && G.admin.rows, v = G.view;
  return `<section class="card pg-admin"><h2>🧑‍🏫 Trainees’ process guides</h2>
    ${!rows ? "<p>Loading…</p>" : !rows.length ? `<p class="pg-muted">No approved trainees yet.</p>`
      : `<label class="pg-pick">Trainee <select onchange="FTGuide.view(this.value)"><option value="">Choose…</option>${rows.map(x => `<option value="${e(x.id)}"${v && v.id === x.id ? " selected" : ""}>${e(x.p.name || x.id)}${x.p.batch ? " · " + e(x.p.batch) : ""}</option>`).join("")}</select></label>`}
    ${v ? (v.recs ? `<div class="pg-read">${GUIDES.map((g, i) => { const r = v.recs[i]; if(!r || !r.html) return `<p class="pg-muted">Day ${g.day} · ${e(g.title)} — not started</p>`;
        const cs = checks(r.html); return `<details><summary><b>Day ${g.day} · ${e(g.title)}</b> — ${r.submittedAt ? "📤 submitted" : "✏️ in progress"} · ${pctOf(cs)}% · ${r.words || 0} words · ${r.imgs || 0} pictures</summary><div class="pg-page pg-ro">${clean(r.html)}</div></details>`; }).join("")}</div>` : "<p>Loading their guides…</p>") : ""}
    <p class="pg-muted">The demo itself is scored in Admin → 🧑‍🏫 Trainer Inputs.</p></section>
    <h2 class="pg-copy-h">Your test copy</h2>`;
}

window.FTGuide = {
  pick(id){ saveNow(); G.cur = id; G.sel = null; render(); },
  open(id){ G.cur = id || null; goto("guide"); },
  tool(c){
    if(c === "hilite") return exec("hiliteColor", "#FFF176");
    if(c === "red") return exec("foreColor", "#C0392B");
    if(c === "navy") return exec("foreColor", "#262B45");
    if(c === "link"){ const sel = window.getSelection(); const url = prompt("Link address (https://…)", "https://"); if(!url || !/^(https?:\/\/|mailto:)\S+$/i.test(url.trim())) return; if(sel && sel.toString()) exec("createLink", url.trim()); else exec("insertHTML", `<a href="${e(url.trim())}">${e(url.trim())}</a>&nbsp;`); return saveNow(); }
    if(c === "image"){ const f = document.getElementById("pgFile"); if(f) f.click(); return; }
    if(c === "table"){ const rc = prompt("Table size: rows × columns", "3 x 2"); const m = String(rc || "").match(/(\d+)\s*[x×*]\s*(\d+)/i); if(!m) return;
      const rr = Math.min(20, +m[1]), cc = Math.min(8, +m[2]);
      exec("insertHTML", `<table><tbody>${Array.from({length: rr}, () => `<tr>${Array.from({length: cc}, () => "<td><br></td>").join("")}</tr>`).join("")}</tbody></table><p><br></p>`); return saveNow(); }
    exec(c); saveNow();
  },
  cmd(c, v){ if(v) exec(c, v); saveNow(); },
  files(fl){ insertImages([...(fl || [])]); },
  imgSize(k){ if(G.sel){ G.sel.setAttribute("data-size", k); saveNow(); } },
  imgDel(){ if(G.sel){ G.sel.remove(); G.sel = null; document.getElementById("pgImgBar").hidden = true; saveNow(); } },
  outline(){
    const p = document.getElementById("pgPage"); if(!p) return;
    if(p.textContent.trim() && !confirm("Put the outline at the top of your guide?")) return;
    const g = GUIDES.find(x => x.id === G.cur); p.innerHTML = clean(OUTLINE(g)) + p.innerHTML; saveNow();
  },
  download(){
    const g = GUIDES.find(x => x.id === G.cur), r = rec(g.id), page = document.getElementById("pgPage");
    const html = clean(page ? page.innerHTML : r.html || ""), name = `Process Guide - ${g.title} (${firstName() || "VA’s first name"})`.replace(/[\\/:*?"<>|]/g, "");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([wordFile(html, name)], {type: "application/msword"}));
    a.download = name + ".doc"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  async copy(){
    const page = document.getElementById("pgPage"); if(!page) return;
    const html = clean(page.innerHTML).replace(/<img([^>]*)data-size="(\w+)"/g, (m, a, s) => `<img${a}width="${({s: 160, m: 320, l: 520, full: 640})[s] || 520}"`);
    try{ await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([html], {type: "text/html"}), "text/plain": new Blob([page.innerText], {type: "text/plain"})})]); toast("📋 Copied — paste it into a Google Doc (Ctrl+V)."); }
    catch(err){ toast("Couldn’t copy here: download it as Word instead."); }
  },
  async submit(){
    saveNow();
    const r = rec(G.cur), cs = checks(r.html || ""), pct = pctOf(cs);
    if(pct < 50 && !confirm(`Only ${pct}% of the checks pass. Submit anyway?`)) return;
    r.submittedAt = new Date().toISOString(); r.pct = pct;
    if(saves()){ clearTimeout(G.timer); const ok = await sharedSet(keyOf(G.cur), r); if(ok === false){ delete r.submittedAt; toast("Couldn’t submit. Check your connection."); return; } }
    toast(`📤 Submitted to your trainer · ${pct}% on the checks`); render();
  },
  async redo(){ const r = rec(G.cur); delete r.submittedAt; if(saves()) await sharedSet(keyOf(G.cur), r); render(); },
  toggleVideo(){ saveNow(); G.video = !G.video; render(); },
  async view(id){
    if(!id){ G.view = null; render(); return; }
    G.view = {id, recs: null}; render();
    const get = window.ftGetMany || sharedGetMany;
    try{ G.view.recs = await get(GUIDES.map(g => `guide:${id}:${g.id}`)); }catch(err){ G.view.recs = []; }
    render();
  },
  checks, clean, wordFile, GUIDES
};

// 🧰 Drafting Tools in the Practice Lab
window.ftGuideCard = function(){
  const any = GUIDES.some(guideOpen);
  return `<div class="card fts-card ${any ? "" : "fts-locked"}"><div class="fts-kicker">Days 8–18 · before each recorded demo</div>
    <h3>📘 Process Guide</h3>
    <p class="fts-note">Watch the tutorial and build the guide you’ll follow in your demo, on a page that works like Word: headings, numbered steps, pasted screenshots, links and tables. Download it as Word or copy it to Google Docs.</p>
    <div class="fts-label">Guides in this tool</div><ul class="fts-tpl">${GUIDES.map(g => `<li>Day ${g.day} · ${e(g.title)}</li>`).join("")}</ul>
    <div class="fts-tool-act">${any ? `<button class="btn btn-navy btn-sm" type="button" onclick="goto('guide')">Open the tool</button>` : `<button class="btn btn-ghost btn-sm" disabled>🔒 Locked</button>`}</div></div>`;
};

// the editor's events, on the document (the page is redrawn)
document.addEventListener("input", ev => { if(ev.target && ev.target.id === "pgPage") saveNow(); });
document.addEventListener("paste", ev => {
  if(!ev.target || !ev.target.closest || !ev.target.closest("#pgPage")) return;
  const files = [...((ev.clipboardData && ev.clipboardData.files) || [])].filter(f => /^image\//.test(f.type));
  if(files.length){ ev.preventDefault(); insertImages(files); return; }
  const html = ev.clipboardData && ev.clipboardData.getData("text/html");
  if(html){ ev.preventDefault(); exec("insertHTML", clean(html)); saveNow(); }
});
document.addEventListener("drop", ev => {
  if(!ev.target || !ev.target.closest || !ev.target.closest("#pgPage")) return;
  const files = [...((ev.dataTransfer && ev.dataTransfer.files) || [])].filter(f => /^image\//.test(f.type));
  if(files.length){ ev.preventDefault(); insertImages(files); }
});
document.addEventListener("click", ev => {
  const bar = document.getElementById("pgImgBar"); if(!bar) return;
  const img = ev.target && ev.target.closest && ev.target.closest("#pgPage img");
  document.querySelectorAll("#pgPage img.sel").forEach(i => i.classList.remove("sel"));
  if(img && document.getElementById("pgPage").getAttribute("contenteditable") === "true"){ G.sel = img; img.classList.add("sel"); bar.hidden = false; }
  else if(!(ev.target.closest && ev.target.closest("#pgImgBar"))){ G.sel = null; bar.hidden = true; }
});
document.addEventListener("keydown", ev => {
  if(state.view !== "guide" || !(ev.ctrlKey || ev.metaKey) || (ev.key !== "k" && ev.key !== "K")) return;
  if(ev.target && ev.target.closest && ev.target.closest("#pgPage")){ ev.preventDefault(); window.FTGuide.tool("link"); }
});

window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["guide"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {guide: "Process Guide"});
const __render = window.render;
window.render = function(){
  if(state.view !== "guide") return __render.apply(this, arguments);
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  // first visit: the guide for the day the trainee is on (or the last one open before it), so a day's step lands on its own guide
  if(!G.cur){ let day = 99; try{ const p = window.FTNextStep && FTNextStep.place(); if(p && p.day && isTrainee()) day = p.day.day; }catch(err){}
    const o = GUIDES.filter(guideOpen), here = o.filter(g => g.day >= day)[0] || o.filter(g => g.day <= day).pop() || o[0] || GUIDES[0]; G.cur = here.id; }
  if(!guideOpen(GUIDES.find(g => g.id === G.cur) || GUIDES[0])){ const o = GUIDES.filter(guideOpen); if(o.length) G.cur = o[o.length - 1].id; }
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-pg"><a class="back-link" onclick="goto('simulators')">&larr; Back to the Practice Lab</a>${adminOn() ? renderAdmin() : ""}${renderEditor()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
  try{ document.execCommand("styleWithCSS", false, true); }catch(err){}
};

(function(){ const s = document.createElement("style"); s.id = "ft-process-guide"; s.textContent = `
main.main-pg{max-width:1400px;margin:0 auto;padding:16px 20px 48px;display:flex;flex-direction:column;gap:12px;}
.pg-copy{padding:10px 14px;background:#FFF8EF;border:1px dashed #DB8437;font-size:14px;}
.pg-hero{background:#262B45;color:#fff;border-radius:18px;padding:16px 24px;position:relative;overflow:hidden;}
.pg-hero::after{content:"";position:absolute;top:0;right:0;width:min(260px,28%);height:70px;border-radius:0 18px 0 100%;background:#DB8437;}
.pg-hero > *{position:relative;z-index:1;}
.pg-eyebrow{margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#F4B77A;}
.pg-hero h1{margin:0 0 6px;font:800 26px/1.15 'Poppins','Inter',sans-serif;color:#fff;} .pg-hero p{margin:0;color:#DDE2EE;max-width:85ch;}
.pg-tabs{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}
.pg-tab{display:flex;flex-direction:column;align-items:flex-start;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:12px;padding:6px 14px;cursor:pointer;font:700 14px 'Inter',sans-serif;max-width:220px;}
.pg-tab small{font-weight:500;font-size:11.5px;color:#C9CFDD;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
.pg-tab.on{background:#DB8437;border-color:#DB8437;} .pg-tab.on small{color:#fff;} .pg-tab:disabled{opacity:.45;cursor:not-allowed;}
.pg-title-row{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;} .pg-title-row h2{margin:0;color:#262B45;font-size:19px;}
.pg-save{font-size:12.5px;color:var(--ink-soft);}
.pg-work{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,380px);gap:14px;align-items:start;}
.pg-work.novideo{grid-template-columns:minmax(0,1fr) minmax(0,260px);}
.pg-docwrap{display:flex;flex-direction:column;min-width:0;border-radius:12px;overflow:hidden;border:1px solid #CBD2DF;background:#E9ECF2;}
.pg-tools{display:flex;flex-wrap:wrap;gap:4px 10px;padding:6px 8px;background:#F6F7FB;border-bottom:1px solid #CBD2DF;position:sticky;top:0;z-index:2;}
.pg-grp{display:flex;gap:2px;align-items:center;padding-right:10px;border-right:1px solid #DCE0E8;} .pg-grp:last-of-type{border-right:none;}
.pg-btn{min-width:30px;height:30px;border:1px solid transparent;border-radius:6px;background:transparent;cursor:pointer;font-size:14px;color:#262B45;padding:0 6px;}
.pg-btn:hover{background:#fff;border-color:#CBD2DF;} .pg-btn:disabled{opacity:.4;cursor:not-allowed;}
.pg-style{height:30px;border:1px solid #CBD2DF;border-radius:6px;background:#fff;font-size:13px;padding:0 6px;}
.pg-imgbar{display:flex;gap:6px;align-items:center;padding:6px 10px;background:#FFF8EF;border-bottom:1px solid #F0C08A;font-size:12.5px;}
.pg-imgbar[hidden]{display:none;} .pg-imgbar button{border:1px solid #F0C08A;background:#fff;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:12.5px;}
.pg-paper{padding:22px;overflow:auto;max-height:calc(100vh - 230px);min-height:420px;}
.pg-page{background:#fff;max-width:820px;margin:0 auto;min-height:900px;padding:56px 64px;box-shadow:0 2px 12px rgba(22,24,41,.14);font:400 15px/1.55 Calibri,'Segoe UI',Arial,sans-serif;color:#1F2433;outline:none;}
.pg-page:empty::before{content:attr(data-placeholder);color:#9AA3B8;}
.pg-page h1{font-size:26px;color:#262B45;margin:0 0 10px;} .pg-page h2{font-size:19px;color:#262B45;margin:18px 0 6px;border-bottom:2px solid #F0C08A;padding-bottom:2px;} .pg-page h3{font-size:16px;margin:14px 0 4px;}
.pg-page p{margin:6px 0;} .pg-page ol, .pg-page ul{margin:6px 0;padding-left:26px;} .pg-page li{margin:3px 0;}
.pg-page a{color:#1A5FB4;text-decoration:underline;}
.pg-page img{max-width:100%;height:auto;border:1px solid #DCE0E8;border-radius:4px;cursor:pointer;display:inline-block;}
.pg-page img[data-size="s"]{width:25%;} .pg-page img[data-size="m"]{width:50%;} .pg-page img[data-size="l"]{width:80%;} .pg-page img[data-size="full"]{width:100%;}
.pg-page img.sel{outline:3px solid #DB8437;outline-offset:2px;}
.pg-page table{border-collapse:collapse;width:100%;margin:8px 0;} .pg-page td, .pg-page th{border:1px solid #9AA3B8;padding:6px 8px;min-width:40px;vertical-align:top;}
.pg-page blockquote{margin:8px 0;padding:6px 12px;border-left:4px solid #DB8437;background:#FFF8EF;}
.pg-page hr{border:none;border-top:2px solid #DCE0E8;margin:14px 0;}
.pg-page.pg-ro{min-height:0;padding:20px 24px;margin:8px 0;box-shadow:none;border:1px solid #DCE0E8;}
.pg-side{display:flex;flex-direction:column;gap:10px;position:sticky;top:12px;}
.pg-vid{padding:10px 12px;} .pg-vid-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;color:#262B45;}
.pg-player{position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;background:#161829;} .pg-player iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
.pg-open{display:inline-block;margin-top:6px;font-size:12.5px;color:#B5651F;}
.pg-ck{padding:10px 12px;} .pg-ck-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;color:#262B45;}
.pg-ck ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px;font-size:13px;}
.pg-ck li{padding:5px 8px;border-radius:8px;background:#F6F7FB;} .pg-ck li.ok{background:#EEF8F2;color:#1F5B39;} .pg-ck li small{display:block;color:var(--ink-soft);font-size:11.5px;margin-left:16px;}
.pg-pct{border-radius:999px;padding:2px 10px;font-size:12.5px;font-weight:800;background:#FFF1E2;color:#B5651F;} .pg-pct.ok{background:#EEF8F2;color:#1F5B39;}
.pg-acts{padding:10px 12px;display:flex;flex-direction:column;gap:6px;} .pg-sub{margin:0;font-weight:700;color:#1F5B39;font-size:13px;}
.pg-admin{padding:14px 16px;} .pg-admin h2{margin:0 0 8px;color:#262B45;} .pg-muted{color:var(--ink-soft);font-size:12.5px;margin:6px 0;}
.pg-pick{display:flex;gap:8px;align-items:center;font-weight:700;font-size:13.5px;} .pg-pick select{padding:6px;border-radius:8px;border:1px solid #CBD2DF;}
.pg-read details{margin:8px 0;} .pg-copy-h{margin:8px 0 0;color:#262B45;font-size:18px;}
@media(max-width:1100px){.pg-work, .pg-work.novideo{grid-template-columns:minmax(0,1fr);} .pg-side{position:static;} .pg-page{padding:28px 24px;}}
`; document.head.appendChild(s); })();
})();
