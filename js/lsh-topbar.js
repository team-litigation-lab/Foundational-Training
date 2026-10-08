/* ============================================================
   🧭 The top bar, organized (every LSH course)
   Buttons that do the same kind of thing share one menu instead of
   each taking a slot in the top bar, the way the Training Portal's
   admin bar keeps everything else under ⚙ System Management:
     • 📁 Case File   one tab for the course's case material: the Case File
                      (Claim File), 📁 Documents and 🗂 Workspace share a row of
                      tabs at the top of their pages instead of a slot each
     • 📚 Guides ▾    Notes, Handouts, Orientation, Facilitator Guide,
                      Platform Blueprint (whichever this page has)
     • 📋 My Sheets ▾ Task Tracker and Monitoring Sheet
     • ⛶ View ▾       Full screen and Open in a new tab
   A menu is made only when two or more of its buttons are on the bar;
   a single one stays as it is. The bar re-renders often and other files add to
   it (portal-link.js, the Blueprint button), so this sorts whatever
   is on screen after each change. The buttons themselves move into
   the menu, so their own onclick still runs. A menu's name is in
   .lsh-grp-word, so a course short of room can show its icon alone.
   The same file is in every LSH course repo (EA-PA-TRAINING,
   Case-Management-Training, propertydamageclaimstraining,
   medsumanddemandtraining, Foundational-Training). Change it in all of them.
   ============================================================ */
(function(){
"use strict";
var GROUPS = [
  { id: "guides", label: "📚 Guides", title: "Notes, handouts and guides",
    match: function(b){ return /^(notes|handouts|orientation|facilitatorguide)$/.test(viewOf(b)) || b.matches(".nav-blueprint, #lbp-open-btn"); } },
  { id: "sheets", label: "📋 My Sheets", title: "Your Task Tracker and Monitoring Sheet",
    match: function(b){ return /^(tracker|monitoring)$/.test(viewOf(b)); } },
  { id: "view", label: "⛶ View", title: "Full screen, or open this page in a new tab",
    match: function(b){ return /^(togglePageFullscreen|openInNewTab)\(/.test(b.getAttribute("onclick") || ""); } }
];
function viewOf(b){ var m = /goto\('([a-z]+)'/.exec(b.getAttribute("onclick") || ""); return m ? m[1] : ""; }

// 📁 Case File: one tab in the bar; its pages share a row of tabs (Case File · Documents · Workspace) at the top.
var CASE_VIEWS = ["clientprofile", "casedocs", "workspace"];
function mergeCase(nav){
  var tabs = CASE_VIEWS.map(function(v){ return [].find.call(nav.children, function(b){ return b.tagName === "BUTTON" && viewOf(b) === v; }); }).filter(Boolean);
  if(tabs.length < 2) return;
  tabs.forEach(function(b){ if(!b.hasAttribute("data-lsh-label")) b.setAttribute("data-lsh-label", b.innerHTML); });
  // the page you're on (the app's state.view; the Case File tab's own highlight below would otherwise read as it)
  var cur = (typeof state !== "undefined" && state) ? state.view : null;
  var on = tabs.filter(function(b){ return cur ? viewOf(b) === cur : b.classList.contains("active"); })[0];
  var main = tabs[0], word = main.getAttribute("data-lsh-label").replace(/^[^A-Za-z<]+/, "");
  var html = "📁 " + word;
  if(main.innerHTML !== html) main.innerHTML = html;
  main.title = tabs.map(function(b){ return b.textContent.replace(/^[^A-Za-z]+/, "").trim(); }).join(" · ");
  main.classList.toggle("active", !!on);
  tabs.slice(1).forEach(function(b){ if(b.style.display !== "none") b.style.display = "none"; });
  // the row of tabs on these pages, above the page itself
  var page = document.querySelector("main");
  var row = page && page.querySelector(":scope > .lsh-subtabs");
  if(!on || !page){ if(row) row.remove(); return; }
  hideBack(page, tabs);
  var want = tabs.map(function(b){ return viewOf(b) + (b === on ? "*" : ""); }).join(",");
  if(row && row.getAttribute("data-k") === want) return;
  if(row) row.remove();
  row = document.createElement("div");
  row.className = "lsh-subtabs"; row.setAttribute("role", "tablist"); row.setAttribute("data-k", want);
  tabs.forEach(function(b){
    var t = document.createElement("button");
    t.type = "button"; t.setAttribute("role", "tab"); t.innerHTML = b.getAttribute("data-lsh-label");
    if(b === on){ t.className = "on"; t.setAttribute("aria-selected", "true"); }
    t.addEventListener("click", function(){ b.click(); });
    row.appendChild(t);
  });
  var slot = page.querySelector(":scope > #navBackSlot");
  page.insertBefore(row, slot ? slot.nextSibling : page.firstChild);
}
// "← Back to Documents" on the Case File page is the tab next to it: hidden. A way back anywhere else stays.
function hideBack(page, tabs){
  var slot = page.querySelector(":scope > #navBackSlot"), back = slot && slot.querySelector(".nav-back");
  if(!slot) return;
  var to = back ? back.textContent.replace(/^.*Back to\s*/, "").trim().toLowerCase() : "";
  var names = tabs.map(function(b){ return b.textContent.replace(/^[^A-Za-z]+/, "").trim().toLowerCase(); });
  var sibling = !!to && names.some(function(n){ return n && (to.indexOf(n) >= 0 || n.indexOf(to) >= 0); });
  var want = sibling ? "none" : "";
  if(slot.style.display !== want) slot.style.display = want;
}

var css = document.createElement("style");
css.id = "lsh-topbar-css";
css.textContent = ".lsh-grp{position:relative;display:flex;}"
  + ".lsh-grp-menu{display:none;position:absolute;top:calc(100% + 8px);right:0;min-width:210px;background:#fff;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.22);padding:6px;z-index:70;flex-direction:column;gap:2px;}"
  + ".lsh-grp.open .lsh-grp-menu{display:flex;}"
  + ".topbar .nav .lsh-grp-menu button{display:flex;align-items:center;gap:6px;width:100%;color:#1F2547 !important;background:transparent;text-align:left;border:0;border-radius:8px;padding:9px 12px !important;font-size:13.5px !important;white-space:nowrap;}"
  + ".topbar .nav .lsh-grp-menu button:hover{background:#F3F4F9 !important;}"
  + ".topbar .nav .lsh-grp-menu button.active{background:#FFF1DE !important;color:#9A5B00 !important;}"
  + ".topbar .nav .lsh-grp-menu .nav-badge{margin-left:auto;}"
  /* the two icon buttons read as words inside the menu */
  + ".lsh-grp-menu button[data-lsh-word]::after{content:attr(data-lsh-word);font-size:13.5px;}"
  + ".lsh-grp-menu .bp-long{display:inline !important;} .lsh-grp-menu .bp-word{display:inline !important;}"
  + ".lsh-subtabs{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;padding:6px;background:#fff;border:1px solid rgba(31,37,71,.12);border-radius:12px;width:fit-content;max-width:100%;}"
  + ".lsh-subtabs button{border:0;background:transparent;color:#1F2547;font:inherit;font-size:14px;font-weight:700;padding:8px 14px;border-radius:9px;cursor:pointer;}"
  + ".lsh-subtabs button:hover{background:#F3F4F9;} .lsh-subtabs button.on{background:#1F2547;color:#fff;}"
  /* phones (☰ Menu open): the menus open in place, under their button */
  + "@media(max-width:760px){.topbar.nav-open .lsh-grp{flex-direction:column;align-items:stretch;}"
  + ".topbar.nav-open .lsh-grp-menu{position:static;box-shadow:none;background:rgba(255,255,255,.06);margin:2px 0 4px 12px;}"
  + ".topbar.nav-open .nav .lsh-grp-menu button{color:#fff !important;} .topbar.nav-open .nav .lsh-grp-menu button:hover{background:rgba(255,255,255,.09) !important;}}";
document.head.appendChild(css);

var WORDS = { togglePageFullscreen: " Full screen", openInNewTab: " Open in a new tab" };

function closeAll(except){
  document.querySelectorAll(".topbar .lsh-grp.open").forEach(function(g){
    if(g === except) return;
    g.classList.remove("open"); g.firstChild.setAttribute("aria-expanded", "false");
  });
}
window.lshCloseTopMenus = closeAll;

function groupBox(nav, g){
  var box = nav.querySelector('.lsh-grp[data-grp="' + g.id + '"]');
  if(box) return box;
  box = document.createElement("div");
  box.className = "lsh-grp"; box.setAttribute("data-grp", g.id);
  box.innerHTML = '<button type="button" aria-haspopup="true" aria-expanded="false"></button><div class="lsh-grp-menu" role="menu"></div>';
  box.firstChild.title = g.title;
  box.firstChild.addEventListener("click", function(e){
    e.stopPropagation();
    var open = !box.classList.contains("open");
    closeAll();
    if(typeof window.mdCloseTopMenus === "function") window.mdCloseTopMenus();   // Medsum's 🧰 Tools ▾
    if(open){ box.classList.add("open"); box.firstChild.setAttribute("aria-expanded", "true"); }
  });
  box.lastChild.addEventListener("click", function(){ closeAll(); });
  return box;
}

// The group's own button: its name, ▾, active when the page you're on is inside, and the inside badges added up.
function label(box, g){
  var items = box.lastChild.children;
  var on = [].some.call(items, function(b){ return b.classList.contains("active"); });
  var total = [].reduce.call(box.lastChild.querySelectorAll(".nav-badge"), function(t, b){ return t + (parseInt(b.textContent, 10) || 0); }, 0);
  // "📚 Guides": the word is its own span, so a tight bar can show the icon alone (the button's title names it)
  var name = typeof g.label === "function" ? g.label(box) : g.label, sp = name.indexOf(" ");
  var html = name.slice(0, sp) + '<span class="lsh-grp-word">' + name.slice(sp) + "</span> ▾" + (total ? '<span class="nav-badge">' + total + "</span>" : "");
  var btn = box.firstChild;
  if(btn.innerHTML !== html) btn.innerHTML = html;
  btn.classList.toggle("active", on);
}

function organize(){
  var nav = document.querySelector(".topbar .nav");
  if(!nav) return;
  mergeCase(nav);
  GROUPS.forEach(function(g){
    var box = nav.querySelector('.lsh-grp[data-grp="' + g.id + '"]');
    var loose = [].filter.call(nav.children, function(b){ return b.tagName === "BUTTON" && g.match(b); });
    var inside = box ? box.lastChild.children.length : 0;
    if(loose.length + inside < 2) return;
    box = groupBox(nav, g);
    // the menu sits where its first button was
    if(!box.parentNode) nav.insertBefore(box, loose[0]);
    loose.forEach(function(b){
      b.setAttribute("role", "menuitem");
      var fn = (/^(\w+)\(/.exec(b.getAttribute("onclick") || "") || [])[1];
      if(WORDS[fn]) b.setAttribute("data-lsh-word", WORDS[fn]);
      b.style.display = "";
      box.lastChild.appendChild(b);
    });
    label(box, g);
  });
}

var queued = false;
function schedule(){
  if(queued) return;
  queued = true;
  // a microtask, not a frame: the bar is sorted before it is painted, so it never flickers
  Promise.resolve().then(function(){ queued = false; try{ organize(); }catch(e){} });
}
function start(){
  organize();
  new MutationObserver(function(records){
    if(records.some(function(r){ return r.target.closest && (r.target.closest(".topbar") || r.target.closest("#navBackSlot")) || [].some.call(r.addedNodes, function(n){ return n.querySelector && n.querySelector(".topbar"); }); })) schedule();
  }).observe(document.body, {childList:true, subtree:true});
  document.addEventListener("click", function(e){ if(!e.target.closest || !e.target.closest(".lsh-grp")) closeAll(); }, true);
  document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeAll(); });
}
if(document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
