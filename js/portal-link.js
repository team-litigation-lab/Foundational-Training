/* ============================================================
   🏠 Back to the LSH Training Portal (everyone who came from it)
   Trainees and admins open each program from the Portal's Training
   Directory, which opens it in a new tab. This adds a way back:
     • admins:    top bar 🏠 Main Portal, and on the Admin screen
                  ← Back to Main Portal (next to "Log out")
     • trainees:  top bar ← Training Directory, and a link under the
                  sign-in / approval notes (pending, not approved)
   Admins in 👁 Trainee view see the admin buttons.
   The same file is in every LSH course repo (EA-PA-TRAINING,
   Case-Management-Training, propertydamageclaimstraining,
   medsumanddemandtraining, Foundational-Training). Change it in all of them.
   ============================================================ */
(function(){
"use strict";
var PORTAL_URL = "https://cm-training-activity.pages.dev/programs.html";
var TITLE = "Back to the LSH Training Portal (Training Directory)";

var css = document.createElement("style");
css.id = "portal-link-css";
css.textContent = ".nav button.nav-portal{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.3);}"
  + ".nav button.nav-portal:hover{background:rgba(255,255,255,.2);}"
  + "a.admin-portal-link{text-decoration:none;}";
document.head.appendChild(css);

window.goToMainPortal = function(){ location.href = PORTAL_URL; };

// The pages re-render often and each course draws its own top bar, so add the
// buttons to whatever is on screen rather than to each course's templates.
function paint(){
  if(typeof state === "undefined" || !state) return;
  if(!state.isAdmin){
    if(!state.traineeId) return;
    // A trainee: a way back to the Training Directory in the top bar, or under the approval notes.
    var nav = document.querySelector(".topbar .nav");
    if(nav && !nav.querySelector(".nav-portal")){
      var b = document.createElement("button");
      b.type = "button"; b.className = "nav-portal"; b.title = TITLE;
      b.textContent = "← Training Directory";
      b.onclick = window.goToMainPortal;
      nav.insertBefore(b, nav.querySelector(".nav-fs"));
    }
    var card = document.querySelector(".login-card");
    if(card && !card.querySelector(".trainee-portal-link")){
      var l = document.createElement("div");
      l.className = "trainee-portal-link"; l.style.cssText = "margin-top:14px;font-size:12.5px;";
      l.innerHTML = '<a href="'+PORTAL_URL+'" style="color:var(--navy);font-weight:600;">← Back to the Training Directory</a>';
      card.appendChild(l);
    }
    return;
  }
  var nav = document.querySelector(".topbar .nav");
  if(nav && !nav.querySelector(".nav-portal")){
    var b = document.createElement("button");
    b.type = "button"; b.className = "nav-portal"; b.title = TITLE;
    b.textContent = "🏠 Main Portal";
    b.onclick = window.goToMainPortal;
    nav.insertBefore(b, nav.querySelector(".nav-fs"));
  }
  var out = document.querySelector('button[onclick="adminLogout()"]');
  if(out && out.parentNode && !out.parentNode.querySelector(".admin-portal-link")){
    var a = document.createElement("a");
    a.className = "btn btn-ghost btn-sm admin-portal-link"; a.href = PORTAL_URL; a.title = TITLE;
    a.textContent = "← Back to Main Portal";
    out.parentNode.insertBefore(a, out);
  }
}
var queued = false;
function schedule(){
  if(queued) return;
  queued = true;
  requestAnimationFrame(function(){ queued = false; try{ paint(); }catch(e){} });
}
function start(){
  schedule();
  new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true});
}
if(document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
