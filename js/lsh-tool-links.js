/* ============================================================
   Training tools open signed in: no CMS log-in page
   The same file in every LSH course repo (Foundational-Training, Case-Management-Training).
   A trainee signed in on this program opens the CMS (cases, Training Library, Call Simulator,
   drills) already signed in. The CMS takes the LSH Training Portal's signed ticket (?ticket=,
   its guest-access.js and /api/portal-login); this program's Worker holds the same secret
   (PORTAL_SSO_SECRET), so /api/auth/tool-ticket signs a fresh ticket for the trainee who is
   signed in here (good for 5 minutes, so a copied link is no use later) and the link carries it.
     • Every link and window.open to the CMS gets the ticket on the way out (click, middle-click,
       New tab ↗), and LSHToolLinks.ticketed(url) gives a frame's address with it.
     • Admins and the 👁 Trainee view are left alone: an admin's ticket never signs anyone in
       (admins type the admin password), and a preview isn't a trainee.
     • A ticket is asked for only when a tool is opened (one request; reused for 3 minutes).
     • No secret on the Worker, or the request fails: the link opens as it is (the CMS's own
       sign-in), so nothing is ever blocked.
   ============================================================ */
(function(){
const CMS_HOSTS = [/^([a-z0-9-]+\.)?lshcasemanagementtraining-trainingcrm\.pages\.dev$/];   // the CMS and its preview addresses
const isTool = (url)=>{ try{ const u = new URL(url, location.href); return CMS_HOSTS.some(re=>re.test(u.hostname)); }catch(e){ return false; } };
const signedTrainee = ()=> typeof state === "object" && !!state.traineeId && !state.isAdmin && !state.adminPreview && !!state.authToken;

let cached = null, cachedAt = 0, pending = null;
function ticket(){
  if(cached && Date.now() - cachedAt < 3 * 60 * 1000) return Promise.resolve(cached);
  if(pending) return pending;
  pending = fetch("/api/auth/tool-ticket", {method:"POST", headers: authHeaders(), body:"{}"})
    .then(r=>r.ok ? r.json() : {}).then(j=>{ pending = null; if(j && j.ticket){ cached = j.ticket; cachedAt = Date.now(); } return (j && j.ticket) || ""; })
    .catch(()=>{ pending = null; return ""; });
  return pending;
}
function withTicket(url, t){
  if(!t) return url;
  try{ const u = new URL(url, location.href); u.searchParams.set("ticket", t); return u.toString(); }catch(e){ return url; }
}
// The address with a fresh ticket (a CMS link, for a trainee); anything else comes back as it is.
function ticketed(url){
  if(!isTool(url) || !signedTrainee()) return Promise.resolve(url);
  return ticket().then(t=>withTicket(url, t));
}
// Opens a tool in a new tab: the tab opens at once (so the browser doesn't block it), then goes to the signed link.
function openTool(url, target){
  const w = __open.call(window, "about:blank", target || "_blank");
  if(!w){ ticketed(url).then(u=>{ location.href = u; }); return null; }
  try{ w.opener = null; }catch(e){}
  ticketed(url).then(u=>{ try{ w.location.replace(u); }catch(e){ w.location = u; } });
  return w;
}
const __open = window.open;
window.open = function(url, target, features){
  if(url && isTool(url) && signedTrainee() && (!target || target === "_blank")) return openTool(String(url), target);
  return __open.apply(window, arguments);
};
// Links: the ticket is added on the way out (left click, middle click, Ctrl/⌘-click).
function onLink(e){
  if(e.defaultPrevented || (e.type === "auxclick" && e.button !== 1)) return;
  const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
  if(!a || !isTool(a.href) || !signedTrainee()) return;
  e.preventDefault();
  const newTab = e.type === "auxclick" || e.ctrlKey || e.metaKey || e.shiftKey || (a.target && a.target !== "_self");
  if(newTab) openTool(a.href, "_blank");
  else ticketed(a.href).then(u=>{ location.href = u; });
}
document.addEventListener("click", onLink, true);
document.addEventListener("auxclick", onLink, true);

window.LSHToolLinks = { isTool, ticketed, open: openTool };
})();
