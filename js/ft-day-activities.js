/* ============================================================
   THE 16 DAYS AND THEIR ACTIVITIES (Foundational Training)
   ------------------------------------------------------------
   The Foundational Training Program runs on 16 classroom days; the platform serves 8 lesson
   decks, named by their training title, not by day (see README, "Lessons"). The two are not the
   same shape: one lesson covers several days (Reception is Days 3–5). The Lien Negotiator role
   (the old Days 17–18 and Lesson 9) is no longer part of this programme.

   This file is the one place that says which activity belongs to which day. It is read from
   the Training Guide (trainer/curriculum.json, Admin → 📘 Curriculum) — every item below is an
   activity that guide actually calls for on that day, in the guide's own wording.

   Each day:  {day, role, lessons, items}
     role     the role block the day sits in, as the guide heads it
     lessons  the lesson deck(s) the day's discussions use ([] where the day has no deck)
     items    the day's activities, in the order the guide runs them

   Each item: {t, kind, at, id}
     t     the activity, as the Training Guide names it
     kind  Skill test · Assessment · Breakout · Process questions · Exercise · Mock call ·
           Demo · Activity · Session · Buffer · Shadowing · Upskill · Discussion · Offline
     at    where it is done:
             "session"  🟢 a Practice Session on 🛠 Practice Lab  (id = SESSIONS id, js/ft-sessions.js)
             "trainer"  🧑‍🏫 With your trainer, the trainer records it (id = DEFAULT_ACTS id)
             "tool"     a platform tool  (id: "lor" = 🧰 LOR Drafting Activity, "medlor" / "lienbv" = the same tool
                        on the MedLOR + HIPAA packet / the Lien Balance Verification, "skills" = 🧪 Skill Building,
                        "process" = ✍️ Process Questions, "calsim" = 📅 Google Calendar Simulator,
                        "calweek" = 📅 Standard Training - Calendaring Activity,
                        "callsim" = ☎ Call Simulator on LSH Ring Channel)
             "drive"    uploaded to the trainee's Assessments/Activities folder
             "gc"       run in the training GC (the activity sheet / handouts are posted there)
             "room"     done live in the classroom, nothing to submit
     id    the platform record it maps to, where at is "session", "trainer" or "tool"

   Who reads it:
     • js/ft-sessions.js — the day badge on the 🟢 Practice Sessions and 🧑‍🏫 cards, and
       FTSessions.forDay(n)
     • FTDays.of(n) / FTDays.forSession(id) / FTDays.forAct(id) / FTDays.label(id) below

   It changes nothing about how a lesson unlocks: the gate is still the lesson
   (window.dayUnlocked(s.lesson)), not the day.
   ============================================================ */
(function(root){
"use strict";

// On every training day: the typing test twice (morning and before the end of shift) and the
// spelling test once (Day 1 sets them up; Day 8 restates them). Listed once here, added to
// every day by DAILY below rather than repeated eighteen times.
const DAILY = [
  {t:"Typing Test (morning and before the end of the shift)", kind:"Skill test", at:"tool", id:"skills"},
  {t:"Spelling Test (once a day)", kind:"Skill test", at:"tool", id:"skills"},
  {t:"Free Communication Upskill (1–1½ hrs)", kind:"Upskill", at:"room"}
];

const DAYS = [
  {day:1, role:"VA Essentials", lessons:[1], items:[
    {t:"Setting of Expectations (8:00–9:00 AM)", kind:"Discussion", at:"room"},
    {t:"Typing & Spelling Activity (8:00–8:10 AM): the tests set up and named", kind:"Skill test", at:"tool", id:"skills"},
    {t:"Shadowing activities, added to the Hubstaff To-Do", kind:"Shadowing", at:"tool", id:"shadowing"},
    {t:"Digital Handouts for Breakout Session (Group Activity)", kind:"Breakout", at:"gc"},
    {t:"Process Questions", kind:"Process questions", at:"tool", id:"process"},
    {t:"Client Identification Exercise", kind:"Exercise", at:"gc"}
  ]},
  {day:2, role:"VA Essentials", lessons:[1, 2], items:[
    {t:"Buffer Time (1–2 hrs): Day 1 carryover", kind:"Buffer", at:"room"},
    {t:"Common Terms Used — Assessment", kind:"Assessment", at:"drive"},
    {t:"Auto Liability Insurance — Assessment", kind:"Assessment", at:"drive"},
    {t:"Digital Handouts for Breakout Session (Group Activity)", kind:"Breakout", at:"gc"},
    {t:"Process Questions (five of the ten where time is short)", kind:"Process questions", at:"tool", id:"process"},
    {t:"Escalation Handling Exercise", kind:"Exercise", at:"gc"}
  ]},
  {day:3, role:"Reception Training", lessons:[3, 4], items:[
    {t:"Classroom Discussion on PI Workflow", kind:"Discussion", at:"room"},
    {t:"Classroom Discussion on Reception Training (Lesson 4 on the platform)", kind:"Discussion", at:"room"},
    {t:"🎧 Call Listening on 10 Sample Recordings (logged on the platform)", kind:"Activity", at:"tool", id:"listening"},
    {t:"Process Questions (five of the ten where time is short)", kind:"Process questions", at:"tool", id:"process"},
    {t:"Confidentiality & Call Response Exercise", kind:"Exercise", at:"gc"},
    {t:"PI Reception Activity: 6 practice calls with challenges (worksheet to your Assessments/Activities folder)", kind:"Activity", at:"gc"}
  ]},
  {day:4, role:"Reception Training", lessons:[4], items:[
    {t:"Training Video Viewing and Mock Call Preparation", kind:"Activity", at:"room"},
    {t:"Reception Mock Calls", kind:"Session", at:"session", id:"reception"},
    {t:"Reception Mock Call with the trainer", kind:"Mock call", at:"trainer", id:"reception-live"},
    {t:"Reception Mock Calls Metrics (how the call is scored)", kind:"Activity", at:"gc"}
  ]},
  {day:5, role:"Reception Training", lessons:[4, 5], items:[
    {t:"Buffer Time (1–2 hrs) for Reception Mock Calls", kind:"Buffer", at:"session", id:"reception"},
    {t:"Classroom Discussion on Appointment Setting and Calendar Management", kind:"Discussion", at:"room"},
    {t:"Attorney Calendar Management Activity", kind:"Activity", at:"gc"},
    {t:"Standard Training - Calendaring Activity (the Attorney Calendar Management Activity booked on next week’s calendar)", kind:"Activity", at:"tool", id:"calweek"}
  ]},
  {day:6, role:"Calendar Management Training", lessons:[5], items:[
    {t:"Calendar Management Mock Calls", kind:"Session", at:"session", id:"calendaring"},
    {t:"Calendar Management Mock Call with the trainer", kind:"Mock call", at:"trainer", id:"calendar-live"},
    {t:"Appointments booked on the Google Calendar Simulator (time zone visible in every screenshot)", kind:"Activity", at:"tool", id:"calsim"},
    {t:"Training Video Viewing", kind:"Activity", at:"room"},
    {t:"Additional Activity: Calendar Management — Mock Call Scenarios (each booking checked against the scheduling rules)", kind:"Activity", at:"tool", id:"calrules"},
    {t:"Calendar Management Mock Calls Metrics (how the call is scored)", kind:"Activity", at:"gc"}
  ]},
  {day:7, role:"Intake Training", lessons:[6], items:[
    {t:"Digital Handouts for Breakout Session (Group Activity): Intake Specialist Best Practices", kind:"Breakout", at:"gc"},
    {t:"🎧 Call Listening on the intake recordings (logged on the platform)", kind:"Activity", at:"tool", id:"listening"},
    {t:"Scheduled Shadowing: Intake Specialist Role (PM, logged on the platform)", kind:"Shadowing", at:"tool", id:"shadowing"},
    {t:"Process Questions (five of the ten where time is short)", kind:"Process questions", at:"tool", id:"process"},
    {t:"Intake Scenario Exercise", kind:"Exercise", at:"gc"},
    {t:"Fillable Intake Forms (Dog Bite, Medical Malpractice, Premise Liability, Slip & Fall, MVC/MVA)", kind:"Activity", at:"gc"}
  ]},
  {day:8, role:"Intake Training", lessons:[6], items:[
    {t:"📘 Process Guide: Saving the Intake Packet in SA (built from the tutorial, before the demo)", kind:"Activity", at:"tool", id:"guide"},
    {t:"Intake Worksheet", kind:"Assessment", at:"drive"},
    {t:"Intake Mock Call Activity (Training Platform / Prototype CMS)", kind:"Session", at:"session", id:"intake"},
    {t:"Practice intake calls on the Call Simulator while waiting for your turn", kind:"Activity", at:"tool", id:"callsim"},
    {t:"Demo Tutorial Viewing and Demo Preparation", kind:"Activity", at:"room"},
    {t:"🏷 Naming & Reporting Drill: Intake Packet (file names, Notes/Tasks entries, subject lines)", kind:"Activity", at:"tool", id:"drills"},
    {t:"Saving Intake Packet and Extracted Intake Documents to SA Demo", kind:"Demo", at:"trainer", id:"intake-packet-demo"}
  ]},
  {day:9, role:"Intake Training", lessons:[6], items:[
    {t:"Buffer Time (1–2 hrs) for the Intake Demo", kind:"Buffer", at:"trainer", id:"intake-packet-demo"},
    {t:"Intake Mock Call Preparation", kind:"Activity", at:"room"},
    {t:"Minutes of the Meeting Transcription Activity: Client-to-Attorney", kind:"Activity", at:"tool", id:"transcribe"},
    {t:"Intake Mock Call with the trainer", kind:"Mock call", at:"trainer", id:"intake-live"},
    {t:"Intake Mock Calls Metrics (how the call is scored)", kind:"Activity", at:"gc"}
  ]},
  {day:10, role:"Insurance Communication Training", lessons:[7], items:[
    {t:"Digital Handouts for Breakout Session (Individual Activity): Claims Specialist Best Practices", kind:"Breakout", at:"gc"},
    {t:"Process Questions (five of the ten where time is short)", kind:"Process questions", at:"tool", id:"process"},
    {t:"Claims Terminology Exercise", kind:"Exercise", at:"gc"}
  ]},
  {day:11, role:"Insurance Communication Training", lessons:[7], items:[
    {t:"🎧 Call Listening on the insurance communication recordings (logged on the platform)", kind:"Activity", at:"tool", id:"listening"},
    {t:"Shadowing: Insurance Communication Role (PM, logged on the platform)", kind:"Shadowing", at:"tool", id:"shadowing"},
    {t:"Claim and Liability Evaluation: Assessment Activities 1 & 2", kind:"Assessment", at:"drive"},
    {t:"Policy Disclosure activity (the Dec Page for each claim)", kind:"Activity", at:"gc"},
    {t:"LOR Drafting Activity: the 1P and 3P letters", kind:"Activity", at:"tool", id:"lor"}
  ]},
  {day:12, role:"Insurance Communication Training", lessons:[7], items:[
    {t:"📘 Process Guide: Saving and sending the LORs (built from the tutorial, before the demo)", kind:"Activity", at:"tool", id:"guide"},
    {t:"Tutorial Demo Recording on Saving LORs to SA and Sending to 1P & 3P Insurance Companies", kind:"Activity", at:"room"},
    {t:"🏷 Naming & Reporting Drill: LORs (file names, Notes/Tasks entries, subject lines)", kind:"Activity", at:"tool", id:"drills"},
    {t:"LOR Uploading and Sending Demo (1P & 3P)", kind:"Demo", at:"trainer", id:"lor-demo"}
  ]},
  {day:13, role:"Provider Communication Training", lessons:[8], items:[
    {t:"Buffer Time (1–2 hrs) for the LOR Drafting Demo", kind:"Buffer", at:"trainer", id:"lor-demo"},
    {t:"Digital Handouts for Breakout Session (Individual Activity)", kind:"Breakout", at:"gc"},
    {t:"🎧 Call Listening on the provider communication recordings (logged on the platform)", kind:"Activity", at:"tool", id:"listening"},
    {t:"Process Questions (five of the ten where time is short)", kind:"Process questions", at:"tool", id:"process"},
    {t:"Document Detectives Exercise", kind:"Exercise", at:"gc"}
  ]},
  {day:14, role:"Provider Communication Training", lessons:[8], items:[
    {t:"📘 Process Guide: Sending the MedLOR (built from the tutorial, before the demo)", kind:"Activity", at:"tool", id:"guide"},
    {t:"Demo and Shadowing (the session logged on the platform)", kind:"Shadowing", at:"tool", id:"shadowing"},
    {t:"Drafting: the MedLOR with Unsworn COR and the client’s signed HIPAA, merged into one PDF (practice before the demo)", kind:"Activity", at:"tool", id:"medlor"},
    {t:"🏷 Naming & Reporting Drill: MedLOR (file names, Notes/Tasks entries, subject lines)", kind:"Activity", at:"tool", id:"drills"},
    {t:"Sending MedLOR and Requesting Medical Bills & Records Demo", kind:"Demo", at:"trainer", id:"medlor-demo"},
    {t:"Medical Records: MedLOR and Request for Bills & Records (practice before the demo)", kind:"Session", at:"session", id:"records"},
    {t:"Demo Metrics (how the demo is scored)", kind:"Activity", at:"gc"}
  ]},
  {day:15, role:"Provider Communication Training", lessons:[8], items:[
    {t:"Recorded Demonstration — Sending MedLOR and Requesting Medical Bills & Records (entire day)", kind:"Demo", at:"trainer", id:"medlor-demo"},
    {t:"Shadowing Session (PM, logged on the platform)", kind:"Shadowing", at:"tool", id:"shadowing"},
    {t:"Demo Metrics (how the demo is scored)", kind:"Activity", at:"gc"}
  ]},
  {day:16, role:"Provider Communication Training", lessons:[8], items:[
    {t:"📘 Process Guide: The Lien Balance Verification request (built from the tutorial, before the demo)", kind:"Activity", at:"tool", id:"guide"},
    {t:"Demo and Shadowing (the session logged on the platform)", kind:"Shadowing", at:"tool", id:"shadowing"},
    {t:"Drafting: the Lien Balance Verification request letter (practice before the demo)", kind:"Activity", at:"tool", id:"lienbv"},
    {t:"🏷 Naming & Reporting Drill: Lien Balance Verification (file names, Notes/Tasks entries, subject lines)", kind:"Activity", at:"tool", id:"drills"},
    {t:"LV (Lien Verification) Request Demo", kind:"Demo", at:"trainer", id:"lv-demo"},
    {t:"Demo Metrics (how the demo is scored)", kind:"Activity", at:"gc"}
  ]}
];

// Every day carries the daily skill tests and the upskill hour; the guide repeats them on all 16.
/* 📴 Outside training hours. Most days carry work the guide sets for after the session or for idle time —
   the homework videos and PPTs, the assessments to finish and upload, the reading and the modules to go
   through while waiting for a turn. They were only in the GC and the day's deck; they are part of the day. */
const OFFLINE = {
  1: ["Nitro Pro 12 and Adobe Acrobat Pro: watch the how-to videos and note your takeaways on the Monitoring Sheet",
      "PI Reading Task (6 questions, 40 points) in your Assessments/Activities folder"],
  2: ["Common Terms Used — Assessment and Auto Liability Insurance — Assessment: finish them and upload both to your Assessments/Activities subfolder",
      "Softphones: watch one sample type from the instructional video for your takeaways",
      "The PPTs on Documents & Spreadsheets, Keyboard Shortcuts and Shadowing Etiquette",
      "The VLF articles on Personal Injury, while you wait for your teammates"],
  3: ["The CRM/CMS training videos, then update item #12 on your Monitoring Sheet",
      "Carlos’ and Oscar’s remaining reception recordings, in your own time (supplementary, not training hours)"],
  4: ["Reception Training with Julio (1:49:49): watch it and update items #10 and #11 on your Monitoring Sheet"],
  6: ["Calendaring 101 and the Calendar Management videos (Parts 1–2), while you wait for your turn"],
  7: ["The intake modules and the fillable intake forms, as additional reference in your idle time"],
  10: ["The insurance communication videos and the job aid / work guide article, in your idle time"],
  13: ["The sample recordings and documents for the medical records role, in your idle time"]
};
DAYS.forEach(d => {
  const off = (OFFLINE[d.day] || []).map(t => ({t, kind: "Offline", at: "offline"}));
  d.items = d.items.concat(DAILY, off);
  d.offline = off.length;
});

const byDay = n => DAYS.find(d => Number(d.day) === Number(n)) || null;
// The days an activity is worked on, in order: a session or trainer-led activity can run over
// two days (Reception is Day 4 then Day 5's buffer; MedLOR is Days 14–15).
function daysFor(at, id){
  return DAYS.filter(d => d.items.some(x => x.at === at && x.id === id)).map(d => d.day);
}
// "Day 4" / "Days 14–15" / "Days 4, 6 and 9" — for a card's kicker.
function label(days){
  const a = (days || []).slice().sort((x, y) => x - y);
  if(!a.length) return "";
  if(a.length === 1) return "Day " + a[0];
  const run = a.every((n, i) => i === 0 || n === a[i - 1] + 1);
  if(run) return "Days " + a[0] + "–" + a[a.length - 1];
  return "Days " + a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
}

root.FTDays = {
  DAYS, COUNT: DAYS.length,
  of: byDay,
  // the days a 🟢 Practice Session / a 🧑‍🏫 trainer-led activity / a platform tool is used on
  forSession: id => daysFor("session", id),
  forAct: id => daysFor("trainer", id),
  forTool: id => daysFor("tool", id),
  label,
  // "Day 4" for a session id, "Days 14–15" for an act id — whichever the id is
  dayLabel(id){ const s = daysFor("session", id); return label(s.length ? s : daysFor("trainer", id)); },
  // every activity on a day, and the days a lesson's discussions are held on
  items: n => (byDay(n) || {items:[]}).items,
  forLesson: l => DAYS.filter(d => (d.lessons || []).includes(Number(l))).map(d => d.day)
};
root.FT_DAY_ACTIVITIES = DAYS;   // the raw map, for the checks in .github/scripts
})(typeof globalThis !== "undefined" ? globalThis : this);
