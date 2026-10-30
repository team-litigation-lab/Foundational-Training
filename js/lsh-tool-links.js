/* ============================================================
   Training tools open signed in: no CMS log-in page
   The same file in every LSH course repo (Foundational-Training, Case-Management-Training).
   A trainee signed in on this program opens the CMS (cases, Training Library, Call Simulator,
   drills) and the LSH Training Portal's simulators (the Google Calendar Simulator, Medical Records
   Requests, …) already signed in. Both take the Portal's signed ticket (?ticket=: the CMS's
   guest-access.js and /api/portal-login; the Portal's functions/_middleware.js before a simulator
   page is sent); this program's Worker holds the same secret
   (PORTAL_SSO_SECRET), so /api/auth/tool-ticket signs a fresh ticket for the trainee who is
   signed in here (good for 5 minutes, so a copied link is no use later) and the link carries it.
     • Every link and window.open to the CMS or a Portal simulator gets the ticket on the way out (click, middle-click,
       New tab ↗), and LSHToolLinks.ticketed(url) gives a frame's address with it.
     • Admins get ?admin=1 instead of a ticket: the CMS signs out any trainee session left in that browser and
       asks for the admin password (admins never arrive signed in as someone else). The 👁 Trainee view is a
       preview, not an admin, and is left alone — except on the Knowledge Base: there a trainer (an admin, or the
       Trainee view) gets a one-use admin ticket, as the Portal's launcher gives one, so its links open signed in
       instead of on the KB's sign-in screen.
     • A ticket is asked for only when a tool is opened (one request; reused for 3 minutes).
     • No secret on the Worker, or the request fails: the link opens as it is (the CMS's own
       sign-in), so nothing is ever blocked.
   ============================================================ */
(function(){
const CMS_HOSTS = [/^([a-z0-9-]+\.)?lshcasemanagementtraining-trainingcrm\.pages\.dev$/];   // the CMS and its preview addresses
const PORTAL_HOSTS = [/^([a-z0-9-]+\.)?cm-training-activity\.pages\.dev$/];                  // the LSH Training Portal: its simulator pages
// The LSH Knowledge Base (the lsh-knowledge-base Worker): it hands the ticket to the Portal's /api/verify-ticket, and ?admin=1
// opens its Admin Portal tab (the admin password), like the CMS.
const KB_HOSTS = [/^lsh-knowledge-base\.legalsupporthelp\.workers\.dev$/];
const isTool = (url)=>{ try{ const u = new URL(url, location.href);
  return CMS_HOSTS.some(re=>re.test(u.hostname)) || KB_HOSTS.some(re=>re.test(u.hostname))
    || (PORTAL_HOSTS.some(re=>re.test(u.hostname)) && /^\/simulators(\.html|\/|$)/.test(u.pathname)); }catch(e){ return false; } };
const signedTrainee = ()=> typeof state === "object" && !!state.traineeId && !state.isAdmin && !state.adminPreview && !!state.authToken;
// An administrator here is an administrator there: a CMS link opened by an admin carries ?admin=1, so the CMS
// drops whatever trainee session that browser still holds (an earlier ticketed test, a shared computer) and
// asks for the admin password instead of opening as that trainee. The 👁 Trainee view is a preview, not an admin.
const signedAdmin = ()=> typeof state === "object" && !!state.isAdmin && !state.adminPreview;
const isKB = (url)=>{ try{ return KB_HOSTS.some(re=>re.test(new URL(url, location.href).hostname)); }catch(e){ return false; } };
// A trainer on the Knowledge Base (an admin, or the 👁 Trainee view preview, which holds the admin token): signed in there
// as an admin from a one-use admin ticket, as the Portal does, instead of the KB's sign-in screen.
const signedTrainer = ()=> typeof state === "object" && (!!state.isAdmin || !!state.adminPreview) && !!state.adminToken;
const handled = (url)=> isTool(url) && (signedTrainee() || signedAdmin() || (isKB(url) && signedTrainer()));
const withAdmin = (url)=>{ try{ const u = new URL(url, location.href); if(!CMS_HOSTS.some(re=>re.test(u.hostname)) && !KB_HOSTS.some(re=>re.test(u.hostname))) return url; u.searchParams.set("admin", "1"); return u.toString(); }catch(e){ return url; } };

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
// (an admin ticket works once on the KB, so it is never cached: one request per link opened)
function adminTicket(){
  return fetch("/api/auth/tool-ticket", {method:"POST", headers: authHeaders(), body: JSON.stringify({tool:"kb"})})
    .then(r=>r.ok ? r.json() : {}).then(j=>(j && j.ticket) || "").catch(()=>"");
}
function ticketed(url){
  if(isKB(url) && signedTrainer()) return adminTicket().then(t=> t ? withTicket(url, t) : signedAdmin() ? withAdmin(url) : url);
  if(isTool(url) && signedAdmin()) return Promise.resolve(withAdmin(url));
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
  if(url && handled(String(url)) && (!target || target === "_blank")) return openTool(String(url), target);
  return __open.apply(window, arguments);
};
// Links: the ticket is added on the way out (left click, middle click, Ctrl/⌘-click).
function onLink(e){
  if(e.defaultPrevented || (e.type === "auxclick" && e.button !== 1)) return;
  const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
  if(!a || !handled(a.href)) return;
  e.preventDefault();
  const newTab = e.type === "auxclick" || e.ctrlKey || e.metaKey || e.shiftKey || (a.target && a.target !== "_self");
  if(newTab) openTool(a.href, "_blank");
  else ticketed(a.href).then(u=>{ location.href = u; });
}
document.addEventListener("click", onLink, true);
document.addEventListener("auxclick", onLink, true);

window.LSHToolLinks = { isTool, ticketed, open: openTool };
})();
