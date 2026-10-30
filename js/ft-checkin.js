/* ============================================================
   🕘 AUTOMATIC TIME IN (trainees)
   A trainee's first visit each day (Eastern time) records their Time In on the Worker (/api/checkin →
   checkin:<YYYY-MM-DD>:<id>, which keeps the first one; worker.js checkIn). The LSH Training Portal's
   Master Control → 🕘 Attendance shows it marked "auto" until a trainer sets a Time In, and the attendance
   Google Sheet gets it through the portal.
   It runs when the page opens, when the trainee comes back to the tab, and on their first click or key
   press if the page was left open overnight. It sends the day they're on, for the sheet's Training column.
   (This call lived in js/attendance.js until the Admin → 🕘 Attendance tab moved to the portal.)
   ============================================================ */
(function(){
"use strict";
const CI = {busy:false, wait:0, tapped:0};
function etDate(){
  const p = new Intl.DateTimeFormat("en-CA", {timeZone:"America/New_York", year:"numeric", month:"2-digit", day:"2-digit"}).formatToParts(new Date());
  const g = t => (p.find(x => x.type === t) || {}).value;
  return `${g("year")}-${g("month")}-${g("day")}`;
}
function myTraining(){
  try{
    const n = window.FTDayDecks && FTDayDecks.currentDay ? FTDayDecks.currentDay() : 0;
    if(!n) return "";
    const d = window.FTDays && (FTDays.DAYS || []).find(x => x.day === n);
    return `Day ${n}${d && d.role ? " · " + d.role : ""}`;
  }catch(err){ return ""; }
}
function checkIn(){
  if(CI.busy || Date.now() < CI.wait || typeof state === "undefined" || !state.traineeId || state.isAdmin || state.adminPreview) return;
  if(document.visibilityState !== "visible" || typeof authFetch !== "function") return;
  const date = etDate(), mark = "lsh-checkin:" + state.traineeId;
  try{ if(localStorage.getItem(mark) === date) return; }catch(err){}
  CI.busy = true;
  authFetch("/api/checkin", {id:state.traineeId, training:myTraining()})
    .then(r => r.json()).then(j => {
      if(j && j.ok){ try{ localStorage.setItem(mark, j.date || date); }catch(err){} }
      else CI.wait = Date.now() + 10 * 60 * 1000;     // not approved yet: ask again later
    })
    .catch(() => { CI.wait = Date.now() + 60 * 1000; })
    .finally(() => { CI.busy = false; });
}
[2000, 6000, 20000].forEach(t => setTimeout(checkIn, t));
document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") checkIn(); });
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => {
  if(Date.now() - CI.tapped < 60000) return;
  CI.tapped = Date.now(); checkIn();
}, {capture:true, passive:true}));
window.FTCheckIn = {now: checkIn};
})();
