/* ============================================================
   ✏️ THE TRAINER EDITS THE SLIDES (js/ft-slide-editor.js)
   Every slide of every day deck can be rewritten by a trainer, in place, with the tools they expect: type sizes,
   colours and highlights, bold / italic / underline, bullets and numbers, indents, links, pictures (pasted,
   dropped or picked), the portal's own boxes, and a size for a picture or a box — the "card resizing".
   What a trainer saves is what every trainee opens: the edit stands in for the slide build/day-decks.cjs built
   (js/ft-day-decks.js reads every slide through slideSrc), and ↩︎ Undo my edits puts the built slide back.

   Where it is kept: settings:dayslides = {v:1, days: {"<day>": {"<slide id>": {html, at, by}}}} — trainers write
   it, everyone reads it (worker.js PUBLIC_READ). Nothing of the trainee's is touched.

   What is let through: the HTML is cleaned on the way in and on the way out against the allowlists below — the
   tags, the attributes, the styles and the hosts an embed may come from. A slide is shared with the whole batch,
   so no script, no handler and no stray embed survives, whoever typed it.

   The editor is its own screen (#ftse-panel) rather than the slide in the deck: a day's slide is paged and scaled
   to fit one screen (fitSheets), and neither is any use to type into.
   ============================================================ */
(function(){
const root = window;
const e = v => esc(String(v == null ? "" : v));
const isAdminView = () => !!state.isAdmin && !state.adminPreview;
const KEY = "settings:dayslides";

/* ---------- what may be in a slide ---------- */
const TAGS = new Set(["p", "br", "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup", "span", "div", "section",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "figure", "figcaption", "blockquote", "code", "pre",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "hr", "small", "iframe", "font"]);
const ATTRS = new Set(["class", "style", "href", "src", "alt", "title", "target", "rel", "colspan", "rowspan", "width",
  "height", "loading", "allow", "allowfullscreen", "frameborder", "referrerpolicy", "data-slot", "data-kind", "data-title", "start"]);
// the styles a slide may carry: the ones the toolbar sets, and the ones the built slides already use
const STYLES = /^(color|background-color|background|font-size|font-weight|font-style|font-family|text-align|text-decoration|text-decoration-line|line-height|letter-spacing|width|max-width|height|max-height|margin|margin-top|margin-bottom|margin-left|margin-right|padding|padding-top|padding-bottom|padding-left|padding-right|border|border-left|border-radius|white-space|display|float|aspect-ratio|object-fit)$/i;
// an embed may only come from where the curriculum's own embeds come from
const EMBED_HOSTS = /^(www\.)?(docs\.google\.com|drive\.google\.com|youtube\.com|www\.youtube\.com|youtube-nocookie\.com|www\.youtube-nocookie\.com|youtu\.be|player\.vimeo\.com|canva\.com|www\.canva\.com)$/i;
// a link may go to a secure page, an address or a phone number, and nowhere else
const okHref = u => { const v = String(u || "").trim(); return /^(https:\/\/|mailto:|tel:)/i.test(v) || /^#[\w-]*$/.test(v) ? v : ""; };
const okSrc = u => { const v = String(u || "").trim();
  if(/^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(v)) return v;
  if(/^https:\/\//i.test(v) || /^\//.test(v)) return v;
  return "";
};
function styleOf(v){
  return String(v || "").split(";").map(p => p.trim()).filter(Boolean).filter(p => {
    const k = p.split(":")[0].trim();
    return STYLES.test(k) && !/url\s*\(|expression|javascript:/i.test(p);
  }).join("; ");
}
// The clean-up: anything not on the lists above is dropped, its text kept. An onclick the platform itself puts on
// a slide (goto(…), FTDayDecks…) is not kept either — a slide is content, and its buttons come from the program.
function clean(html){
  const t = document.createElement("template");
  t.innerHTML = String(html == null ? "" : html);
  const walk = node => {
    [...node.childNodes].forEach(x => {
      if(x.nodeType === 8){ x.remove(); return; }                       // comments
      if(x.nodeType !== 1){ return; }                                   // text
      const tag = x.tagName.toLowerCase();
      if(tag === "script" || tag === "style" || tag === "link" || tag === "meta" || tag === "object" || tag === "embed" || tag === "form" || tag === "input" || tag === "button" || tag === "select" || tag === "textarea"){
        x.remove(); return;
      }
      if(!TAGS.has(tag)){ const f = document.createDocumentFragment(); [...x.childNodes].forEach(c => f.appendChild(c)); x.replaceWith(f); walk(node); return; }
      // the browser's own editing commands still leave <font color> and <font size> behind: a slide keeps the
      // colour and the size as a style, so they survive the clean-up and read the same everywhere
      if(tag === "font"){
        const sp = document.createElement("span");
        const col = x.getAttribute("color"), sz = x.getAttribute("size"), face = x.getAttribute("face");
        if(col && /^#?[0-9a-z(),.%\s]+$/i.test(col)) sp.style.color = col;
        if(sz) sp.style.fontSize = ({1: "11px", 2: "13px", 3: "15.5px", 4: "18px", 5: "22px", 6: "26px", 7: "32px"})[String(sz).replace(/[^0-9]/g, "")] || "";
        if(face && /^[\w\s,'"-]+$/.test(face)) sp.style.fontFamily = face;
        sp.innerHTML = x.innerHTML; x.replaceWith(sp); walk(sp); return;
      }
      [...x.attributes].forEach(a => {
        const n = a.name.toLowerCase();
        if(n.startsWith("on") || !ATTRS.has(n)){ x.removeAttribute(a.name); return; }
        if(n === "style"){ const v = styleOf(a.value); if(v) x.setAttribute("style", v); else x.removeAttribute("style"); }
        if(n === "href"){ const v = okHref(a.value); if(v) x.setAttribute("href", v); else x.removeAttribute("href"); }
        if(n === "src"){ const v = okSrc(a.value); if(v) x.setAttribute("src", v); else x.remove(); }
      });
      if(tag === "iframe"){
        let host = ""; try{ host = new URL(x.getAttribute("src") || "", location.href).hostname; }catch(err){ host = ""; }
        if(!EMBED_HOSTS.test(host)){ x.remove(); return; }
      }
      if(tag === "a" && /^https:\/\//i.test(x.getAttribute("href") || "")){ x.setAttribute("target", "_blank"); x.setAttribute("rel", "noopener noreferrer"); }
      walk(x);
    });
  };
  walk(t.content);
  return t.innerHTML;
}

/* ---------- the trainer's edits ---------- */
const S = {data: null, at: 0, loading: null, day: null, id: null, slide: null, busy: false};
const empty = () => ({v: 1, days: {}});
function load(force){
  if(S.loading) return S.loading;
  if(!force && S.data && Date.now() - S.at < 120000) return Promise.resolve(S.data);
  S.loading = sharedGet(KEY).then(v => {
    S.data = v && typeof v === "object" && v.days ? v : empty(); S.at = Date.now(); S.loading = null;
    if(state.view === "daydeck") render();
    return S.data;
  }).catch(() => { S.data = S.data || empty(); S.loading = null; return S.data; });
  return S.loading;
}
const recOf = (day, id) => ((S.data || {}).days || {})[String(day)] && ((S.data || {}).days || {})[String(day)][String(id)] || null;
// the slide's HTML as the trainer has it, or null where they have not touched it
function htmlOf(day, id){ const r = recOf(day, id); return r && typeof r.html === "string" ? clean(r.html) : null; }
function noteOf(day, id){
  const r = recOf(day, id); if(!r) return "";
  const d = r.at ? new Date(r.at) : null;
  return `Edited${r.by ? " by " + r.by : ""}${d && !isNaN(d) ? " · " + d.toLocaleDateString(undefined, {month: "short", day: "numeric"}) : ""}. Every trainee opens it this way.`;
}
const builtSlide = (day, id) => { const d = (root.FT_DAY_DECKS || {})[String(day)];
  return (d && (d.slides || []).find(x => String(x.id) === String(id))) || null; };
const builtHtml = (day, id) => (builtSlide(day, id) || {}).html || "";
/* Only a slide the guide's own build made can be edited. A deck also carries slides the program puts together as
   it draws them — the Training Agenda, "From your trainer", the Call Listening log — and those are made from the
   day's live state, not from text: an edit saved over one would freeze it. */
const editable = (day, id) => !!builtSlide(day, id) && !(builtSlide(day, id) || {}).placeholder;
const slideHead = (day, id) => { const d = (root.FT_DAY_DECKS || {})[String(day)];
  const s = d && (d.slides || []).find(x => String(x.id) === String(id)); return s ? s.h : ""; };

/* ---------- pictures ---------- */
const MAX_W = 1400, MAX_ONE = 700 * 1024, MAX_SLIDE = 2.4 * 1024 * 1024;
// A pasted or picked picture is drawn down to a size a slide can carry: a phone screenshot is 6 MB of JPEG that
// every trainee would download with the deck, and a slide is 1,400px wide at most anyway.
function shrink(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("read"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error("decode"));
      img.onload = () => {
        const out = (w, q) => {
          const sc = Math.min(1, w / img.naturalWidth), c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.naturalWidth * sc)); c.height = Math.max(1, Math.round(img.naturalHeight * sc));
          const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          return c.toDataURL("image/jpeg", q);
        };
        let url = out(MAX_W, 0.82);
        if(url.length > MAX_ONE) url = out(1000, 0.7);
        if(url.length > MAX_ONE) url = out(800, 0.6);
        res(url);
      };
      img.src = String(fr.result || "");
    };
    fr.readAsDataURL(file);
  });
}
const bodySize = () => { const b = document.getElementById("ftseBody"); return b ? b.innerHTML.length : 0; };

/* ---------- the editor ---------- */
// The toolbar must not steal the caret: a button takes focus on mousedown (so the selection in the slide is
// lost before the command runs), and calling focus() on the slide afterwards collapses it to the start. The
// buttons give the mousedown back to the slide, and the commands only focus it when the caret is somewhere else.
// Inserting something — a box, a table, a picture — should add to the slide, not swallow whatever happens to be
// selected: the caret goes to the end of the selection first.
function atEnd(){
  const s = document.getSelection();
  if(s && s.rangeCount && !s.isCollapsed){ const r = s.getRangeAt(0).cloneRange(); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
}
function hold(){
  const b = document.getElementById("ftseBody"); if(!b) return null;
  const s = document.getSelection();
  const inside = s && s.rangeCount && b.contains(s.getRangeAt(0).commonAncestorContainer);
  if(!inside) b.focus();
  return b;
}
/* Marking a selection with a style of our own. execCommand only knows its seven font sizes, so the selection is
   marked with one of them — which it will do across partial selections and nested tags — and every tag it leaves
   behind becomes a span with the style the trainer asked for.
   Bold is done this way rather than with execCommand('bold') because a slide's own body type is already heavy
   (font-weight 700): the browser reads that as "already bold" and the B button would un-bold plain text instead
   of bolding it. Here B makes the selection heavier, and heavier text back to normal. */
function markSel(apply){
  const b = hold(); if(!b) return;
  // with styleWithCSS on, the mark comes back as a span of its own (font-size: xxx-large); with it off, as a
  // <font size="7">. Both are the same mark, and both are turned into the style the trainer asked for.
  try{ document.execCommand("styleWithCSS", false, false); document.execCommand("fontSize", false, "7"); }catch(err){}
  try{ document.execCommand("styleWithCSS", false, true); }catch(err){}
  b.querySelectorAll("font[size='7'], span[style*='xxx-large']").forEach(f => {
    const sp = document.createElement("span"); sp.innerHTML = f.innerHTML; apply(sp); f.replaceWith(sp);
  });
  b.querySelectorAll("font").forEach(f => { const sp = document.createElement("span");
    if(f.getAttribute("color")) sp.style.color = f.getAttribute("color");
    sp.innerHTML = f.innerHTML; f.replaceWith(sp); });
  tidy(b); tidy(b);
}
// A run marked again and again would end up a span inside a span inside a span. Where one span holds nothing but
// another over the same words, the two become one — the inner one's styles win, because it was set last — and a
// span left with no style at all is dropped.
function tidy(b){
  b.querySelectorAll("span").forEach(sp => {
    if(!sp.isConnected) return;
    if(sp.children.length === 1 && sp.children[0].tagName === "SPAN" && sp.textContent === sp.children[0].textContent){
      const inner = sp.children[0];
      [...sp.style].forEach(k => { if(!inner.style.getPropertyValue(k)) inner.style.setProperty(k, sp.style.getPropertyValue(k)); });
      sp.replaceWith(inner);
    }
  });
  b.querySelectorAll("span").forEach(sp => {
    if(!sp.isConnected || sp.attributes.length > (sp.getAttribute("style") === "" ? 1 : 0)) return;
    if(sp.getAttribute("style")) return;
    const f = document.createDocumentFragment(); [...sp.childNodes].forEach(c => f.appendChild(c)); sp.replaceWith(f);
  });
}
// the element the selection starts in — an element container points at the child it starts before, which is
// where the type the trainer can see actually comes from
function selNode(){
  const s = document.getSelection(); if(!s || !s.rangeCount) return null;
  const r = s.getRangeAt(0); let n = r.startContainer;
  if(n && n.nodeType === 1) n = n.childNodes[r.startOffset] || n;
  if(n && n.nodeType === 3) n = n.parentElement;
  return n && n.nodeType === 1 ? n : null;
}
function selWeight(){ const n = selNode(); return n ? parseInt(getComputedStyle(n).fontWeight, 10) || 400 : 400; }
function panel(){
  let p = document.getElementById("ftse-panel");
  if(p) return p;
  p = document.createElement("div"); p.id = "ftse-panel";
  document.body.appendChild(p);
  return p;
}
const SIZES = [["Small", "13px"], ["Normal", "15.5px"], ["Large", "20px"], ["Title", "26px"]];
const COLOURS = [["Navy", "#102A43"], ["Orange", "#C2410C"], ["Ink", "#334155"], ["Green", "#15803D"], ["Red", "#B91C1C"], ["Grey", "#64748B"]];
const WIDTHS = [["¼", "25%"], ["½", "50%"], ["¾", "75%"], ["Full", "100%"]];
const BOXES = [
  ["📦 Card", `<div class="ftdd-ph ftdd-ph-blank"><span class="ftdd-ph-ic">📌</span><div><b>Title</b><p>What the trainee does.</p></div></div>`],
  ["🏷 Naming box", `<div class="naming"><div>Naming Convention goes here</div></div>`],
  ["📄 Note", `<blockquote><b>Note:</b> what to remember.</blockquote>`]
];
function toolbar(){
  const b = (cmd, label, title) => `<button type="button" class="ftse-b" title="${e(title)}" onmousedown="event.preventDefault()" onclick="FTSlideEdit.cmd('${cmd}')">${label}</button>`;
  return `<div class="ftse-tools">
    <div class="ftse-grp">${b("undo", "↶", "Undo")}${b("redo", "↷", "Redo")}</div>
    <div class="ftse-grp"><button type="button" class="ftse-b" title="Bolder — and back to normal" onmousedown="event.preventDefault()" onclick="FTSlideEdit.bold()"><b>B</b></button>${b("italic", "<i>I</i>", "Italic (Ctrl+I)")}${b("underline", "<u>U</u>", "Underline (Ctrl+U)")}${b("strikeThrough", "<s>S</s>", "Strikethrough")}</div>
    <div class="ftse-grp"><label class="ftse-lb">Size
      <select class="ftse-sel" id="ftseSize" onchange="FTSlideEdit.size(this.value); this.selectedIndex=0;">
        <option value="">Text size…</option>${SIZES.map(x => `<option value="${x[1]}">${x[0]}</option>`).join("")}
        <option value="h3">Heading</option><option value="p">Plain paragraph</option></select></label></div>
    <div class="ftse-grp ftse-colours"><span class="ftse-lb">Colour</span>
      ${COLOURS.map(c => `<button type="button" class="ftse-sw" style="background:${c[1]}" title="${e(c[0])}" onmousedown="event.preventDefault()" onclick="FTSlideEdit.colour('${c[1]}')"></button>`).join("")}
      <input type="color" class="ftse-pick" id="ftseColour" value="#102A43" title="Any colour" onchange="FTSlideEdit.colour(this.value)">
      <button type="button" class="ftse-b" title="Highlight" onmousedown="event.preventDefault()" onclick="FTSlideEdit.mark()">🖍</button></div>
    <div class="ftse-grp">${b("insertUnorderedList", "•", "Bullet points")}${b("insertOrderedList", "1.", "Numbered list")}${b("outdent", "⇤", "Less indent")}${b("indent", "⇥", "More indent")}</div>
    <div class="ftse-grp">${b("justifyLeft", "⬅", "Align left")}${b("justifyCenter", "⬌", "Centre")}</div>
    <div class="ftse-grp"><button type="button" class="ftse-b" title="Add a link" onmousedown="event.preventDefault()" onclick="FTSlideEdit.link()">🔗 Link</button>
      <button type="button" class="ftse-b" title="Remove the link" onmousedown="event.preventDefault()" onclick="FTSlideEdit.cmd('unlink')">⛓️‍💥</button></div>
    <div class="ftse-grp"><button type="button" class="ftse-b" title="Insert a picture — or just paste one" onmousedown="event.preventDefault()" onclick="FTSlideEdit.picture()">🖼 Picture</button>
      <input type="file" id="ftseFile" accept="image/*" hidden onchange="FTSlideEdit.picked(this)"></div>
    <div class="ftse-grp"><label class="ftse-lb">Box
      <select class="ftse-sel" onchange="FTSlideEdit.box(this.value); this.selectedIndex=0;"><option value="">Insert…</option>${BOXES.map((x, i) => `<option value="${i}">${x[0]}</option>`).join("")}<option value="table">▦ Table (3×3)</option><option value="hr">— Divider</option></select></label></div>
    <div class="ftse-grp ftse-size"><span class="ftse-lb">Size of what’s selected</span>
      ${WIDTHS.map(w => `<button type="button" class="ftse-b" title="Make it ${e(w[1])} wide" onmousedown="event.preventDefault()" onclick="FTSlideEdit.width('${w[1]}')">${w[0]}</button>`).join("")}
      <button type="button" class="ftse-b" title="Back to its own size" onmousedown="event.preventDefault()" onclick="FTSlideEdit.width('')">↺</button></div>
    <div class="ftse-grp">${b("removeFormat", "⌫ Plain", "Clear the formatting")}</div>
  </div>`;
}
function draw(){
  const p = panel(), day = S.day, id = S.id;
  const cur = htmlOf(day, id), built = builtHtml(day, id);
  const html = S.slide != null ? S.slide : (cur != null ? cur : built);
  p.innerHTML = `<div class="ftse-wrap">
    <div class="ftse-bar">
      <div class="ftse-ttl"><b>✏️ Day ${e(day)} · ${e(String(slideHead(day, id)).replace(/^(AM|PM|Entire Day)\s*:\s*/i, ""))}</b>
        <small>What you save here is the slide every trainee opens.</small></div>
      <div class="ftse-act">
        ${cur != null ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTSlideEdit.restore()">↩︎ Back to the built slide</button>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" onclick="FTSlideEdit.close()">Cancel</button>
        <button type="button" class="btn btn-navy btn-sm" id="ftseSave" onclick="FTSlideEdit.save()">✓ Save the slide</button>
      </div>
    </div>
    ${toolbar()}
    <div class="ftse-stage"><div class="ftse-sheet ft-body" id="ftseBody" contenteditable="true" spellcheck="true">${html}</div></div>
    <p class="ftse-foot">Paste a picture straight in (⌘/Ctrl+V) or drop one on the slide — it is resized to fit. Click a picture or a box, then use <b>Size of what’s selected</b>, or drag its corner. Links, bullets and indents work as they do in a document. The deck still adds its own cards and tiles to links, videos and documents when it draws the slide, so it reads a little richer there than here.</p>
  </div>`;
  document.body.classList.add("ftse-open");
  p.classList.add("open");
  const body = document.getElementById("ftseBody");
  body.addEventListener("paste", onPaste);
  body.addEventListener("drop", onDrop);
  body.addEventListener("dragover", ev => ev.preventDefault());
  body.addEventListener("click", onPick);
  body.addEventListener("keydown", ev => { if(ev.key === "Escape") ev.stopPropagation(); });
  try{ document.execCommand("styleWithCSS", false, true); }catch(err){}
  setTimeout(() => body.focus(), 30);
}
function onPaste(ev){
  const files = [...((ev.clipboardData || {}).files || [])].filter(f => /^image\//.test(f.type));
  if(files.length){ ev.preventDefault(); files.forEach(addPicture); return; }
  // plain, clean text: a paste out of Word or a web page otherwise brings its own fonts and colours
  const html = (ev.clipboardData || {}).getData && ev.clipboardData.getData("text/html");
  if(html){ ev.preventDefault(); document.execCommand("insertHTML", false, clean(html)); }
}
function onDrop(ev){
  const files = [...((ev.dataTransfer || {}).files || [])].filter(f => /^image\//.test(f.type));
  if(!files.length) return;
  ev.preventDefault(); files.forEach(addPicture);
}
async function addPicture(file){
  try{
    const url = await shrink(file);
    if(bodySize() + url.length > MAX_SLIDE){ toast("That picture would make the slide too heavy for the batch to open. Put it in Drive and add a link instead."); return; }
    hold(); atEnd();
    document.execCommand("insertHTML", false, `<img src="${url}" alt="" style="width:100%">`);
  }catch(err){ toast("That picture couldn’t be read. Try a PNG or a JPEG."); }
}
// the picture or box a trainer has clicked: what ⅟₄ ½ ¾ Full resizes, with a corner to drag
let sel = null, grip = null;
const BLOCKS = "img, iframe, figure, table, blockquote, .naming, .ftdd-ph, .ftdd-tile, .canva-frame, .eod-template, .shots, div, p, ul, ol";
function onPick(ev){
  const body = document.getElementById("ftseBody"); if(!body) return;
  const t = ev.target.closest(BLOCKS);
  body.querySelectorAll(".ftse-sel-on").forEach(x => x.classList.remove("ftse-sel-on"));
  sel = t && body.contains(t) && t !== body ? t : null;
  if(sel) sel.classList.add("ftse-sel-on");
  placeGrip();
}
function placeGrip(){
  if(grip) grip.remove(); grip = null;
  if(!sel || !/^(IMG|IFRAME|FIGURE|TABLE)$/.test(sel.tagName)) return;
  const stage = document.querySelector(".ftse-stage"); if(!stage) return;
  grip = document.createElement("div"); grip.className = "ftse-grip"; grip.title = "Drag to resize";
  stage.appendChild(grip);
  const put = () => { const a = sel.getBoundingClientRect(), b = stage.getBoundingClientRect();
    grip.style.left = (a.right - b.left + stage.scrollLeft - 9) + "px"; grip.style.top = (a.bottom - b.top + stage.scrollTop - 9) + "px"; };
  put();
  grip.addEventListener("mousedown", ev => {
    ev.preventDefault();
    const start = ev.clientX, w0 = sel.getBoundingClientRect().width, room = sel.parentElement.getBoundingClientRect().width || 1;
    const move = m => { const w = Math.max(60, Math.min(room, w0 + (m.clientX - start)));
      sel.style.width = Math.round((w / room) * 100) + "%"; sel.style.maxWidth = "100%"; put(); };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  });
}

/* ---------- saving ---------- */
async function save(){
  if(!isAdminView() || S.busy) return;
  const body = document.getElementById("ftseBody"); if(!body) return;
  const html = clean(body.innerHTML);
  if(!html.replace(/<[^>]+>/g, "").trim() && !/<img|<iframe/.test(html)){ toast("The slide is empty. Type something, or cancel."); return; }
  if(html.length > MAX_SLIDE){ toast("This slide is too heavy to save. Remove a picture, or link to it in Drive instead."); return; }
  S.busy = true;
  const btn = document.getElementById("ftseSave"); if(btn){ btn.disabled = true; btn.textContent = "Saving…"; }
  await load(true);
  const d = S.data.days[String(S.day)] = S.data.days[String(S.day)] || {};
  d[String(S.id)] = {html, at: new Date().toISOString(), by: state.certName || state.traineeName || "a trainer"};
  const ok = await sharedSet(KEY, S.data);
  S.busy = false; S.at = Date.now();
  if(ok === false){ toast("Couldn’t save. Check your connection and try again."); if(btn){ btn.disabled = false; btn.textContent = "✓ Save the slide"; } return; }
  toast("✓ Saved — every trainee opens the slide this way.");
  close(); render();
}
async function reset(day, id){
  if(!isAdminView()) return;
  if(!confirm("Put the built slide back? Your edits to this slide are dropped.")) return;
  await load(true);
  const d = S.data.days[String(day)]; if(d) delete d[String(id)];
  const ok = await sharedSet(KEY, S.data);
  S.at = Date.now();
  toast(ok === false ? "Couldn’t save. Check your connection." : "The built slide is back.");
  render();
}
function close(){
  const p = document.getElementById("ftse-panel");
  if(p){ p.classList.remove("open"); p.innerHTML = ""; }
  document.body.classList.remove("ftse-open");
  S.day = null; S.id = null; S.slide = null; sel = null; if(grip){ grip.remove(); grip = null; }
}
document.addEventListener("keydown", ev => { if(ev.key === "Escape" && document.body.classList.contains("ftse-open")) close(); });

root.FTSlideEdit = {
  load, html: htmlOf, note: noteOf, data: () => S.data,
  editable,
  open(day, id){
    if(!isAdminView()){ toast("Only a trainer edits the slides."); return; }
    if(!editable(day, id)){ toast("This slide is put together by the platform as it draws it (the agenda, your own slide, the Call Listening log) — there is nothing to edit here."); return; }
    S.day = Number(day); S.id = String(id); S.slide = null;
    load(true).then(draw);
  },
  close, save, reset,
  // the built slide, back in the editor (saved only when they save)
  restore(){ if(!confirm("Load the built slide into the editor? What you have typed here is replaced.")) return;
    const b = document.getElementById("ftseBody"); if(b) b.innerHTML = builtHtml(S.day, S.id); sel = null; placeGrip(); },
  cmd(c){ hold(); try{ document.execCommand(c, false, null); }catch(err){} placeGrip(); },
  size(v){
    if(!v) return;
    if(v === "h3" || v === "p"){ hold(); try{ document.execCommand("formatBlock", false, v); }catch(err){} return; }
    markSel(sp => { sp.style.fontSize = v; });
  },
  bold(){
    const heavy = selWeight() >= 800;
    markSel(sp => {
      sp.style.fontWeight = heavy ? "400" : "800";
      // one weight for the run, not a weight inside a weight inside a weight
      sp.querySelectorAll("[style*='font-weight']").forEach(x => { x.style.fontWeight = ""; if(!x.getAttribute("style")) x.removeAttribute("style"); });
      sp.querySelectorAll("b, strong").forEach(x => { const f = document.createDocumentFragment(); [...x.childNodes].forEach(c => f.appendChild(c)); x.replaceWith(f); });
    });
  },
  colour(v){ hold(); try{ document.execCommand("foreColor", false, v); }catch(err){} },
  mark(){ hold();
    try{ if(!document.execCommand("hiliteColor", false, "#FEF3C7")) document.execCommand("backColor", false, "#FEF3C7"); }catch(err){} },
  link(){
    const b = hold(); if(!b) return;
    const sel0 = String((document.getSelection() || {}).toString ? document.getSelection().toString() : "");
    const u = prompt("Where does the link go? (https://… — or mailto: an address)", "https://");
    if(!u) return;
    const href = okHref(u); if(!href || /^#/.test(href)){ toast("A link has to start with https:// or mailto:"); return; }
    if(sel0) document.execCommand("createLink", false, href);
    else document.execCommand("insertHTML", false, `<a href="${e(href)}" target="_blank" rel="noopener noreferrer">${e(href)}</a>`);
    b.querySelectorAll("a[href^='https://']").forEach(a => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
  },
  picture(){ const f = document.getElementById("ftseFile"); if(f){ f.value = ""; f.click(); } },
  picked(input){ const f = input && input.files && input.files[0]; if(f) addPicture(f); if(input) input.value = ""; },
  box(v){
    if(v === "") return;
    const b = hold(); if(!b) return;
    atEnd();
    const html = v === "table"
      ? `<table><tbody>${[0, 1, 2].map(() => `<tr>${[0, 1, 2].map(() => "<td>&nbsp;</td>").join("")}</tr>`).join("")}</tbody></table>`
      : v === "hr" ? "<hr>" : (BOXES[Number(v)] || [])[1] || "";
    if(html) document.execCommand("insertHTML", false, html);
  },
  // ¼ ½ ¾ Full — the size of the picture or box that is selected ("card resizing")
  width(w){
    if(!sel){ toast("Click the picture or the box you want to resize first."); return; }
    if(w){ sel.style.width = w; sel.style.maxWidth = "100%"; if(/^(IMG|IFRAME)$/.test(sel.tagName)) sel.style.height = "auto"; }
    else { sel.style.width = ""; sel.style.maxWidth = ""; sel.style.height = ""; }
    placeGrip();
  },
  clean, shrink
};

/* ---------- the editor's own styles ---------- */
(function(){ const s = document.createElement("style"); s.id = "ft-slide-editor"; s.textContent = `
#ftse-panel{display:none;position:fixed;inset:0;z-index:9500;background:var(--bg,#F3F5F9);}
#ftse-panel.open{display:block;} body.ftse-open{overflow:hidden;}
.ftse-wrap{height:100%;display:flex;flex-direction:column;}
.ftse-bar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 16px;background:var(--navy,#102A43);color:#fff;}
.ftse-ttl b{display:block;font-size:15px;} .ftse-ttl small{font-size:12px;color:rgba(255,255,255,.75);}
.ftse-act{display:flex;gap:8px;flex-wrap:wrap;}
.ftse-bar .btn-ghost{color:#fff;background:transparent;border-color:rgba(255,255,255,.45);}
.ftse-bar .btn-ghost:hover{background:rgba(255,255,255,.12);}
.ftse-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:7px 14px;background:#fff;border-bottom:1px solid var(--line,#E3E6EE);}
.ftse-grp{display:flex;gap:4px;align-items:center;padding-right:10px;border-right:1px solid var(--line,#E3E6EE);}
.ftse-grp:last-child{border-right:0;}
.ftse-b{min-width:30px;height:30px;padding:0 8px;border:1px solid var(--line,#E3E6EE);background:#fff;border-radius:7px;font-size:13.5px;color:var(--navy,#102A43);cursor:pointer;line-height:1;}
.ftse-b:hover{background:#F1F5FB;border-color:#C7D2E3;}
.ftse-lb{font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--ink-soft,#5B6478);display:flex;gap:5px;align-items:center;}
.ftse-sel{height:30px;border:1px solid var(--line,#E3E6EE);border-radius:7px;font-size:13px;color:var(--navy,#102A43);background:#fff;padding:0 6px;}
.ftse-sw{width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,.15);cursor:pointer;padding:0;}
.ftse-pick{width:28px;height:26px;border:1px solid var(--line,#E3E6EE);border-radius:6px;background:#fff;padding:1px;cursor:pointer;}
.ftse-stage{flex:1 1 auto;min-height:0;overflow:auto;padding:16px;position:relative;}
.ftse-sheet{max-width:1080px;margin:0 auto;min-height:calc(100% - 8px);background:#fff;border:1px solid var(--line,#E3E6EE);border-radius:14px;padding:22px 26px;box-shadow:0 10px 30px rgba(16,42,67,.07);outline:none;}
.ftse-sheet img,.ftse-sheet iframe{max-width:100%;}
.ftse-sheet .ftse-sel-on{outline:2px dashed var(--orange-deep,#C2410C);outline-offset:2px;}
.ftse-grip{position:absolute;width:18px;height:18px;border-radius:50%;background:var(--orange-deep,#C2410C);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:nwse-resize;z-index:3;}
.ftse-foot{margin:0;padding:7px 16px 9px;font-size:12px;color:var(--ink-soft,#5B6478);background:#fff;border-top:1px solid var(--line,#E3E6EE);}
.ftse-foot b{color:var(--navy,#102A43);}
@media (max-width:760px){ .ftse-tools{gap:6px;padding:6px 8px;} .ftse-grp{padding-right:6px;} .ftse-sheet{padding:16px;} }
`; document.head.appendChild(s); })();
})();
