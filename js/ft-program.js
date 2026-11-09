/* ============================================================
   This program's setup for the LSH program layout (js/lsh-program.js, the same file in every LSH course repo):
   the pages under 📚 Dashboard, what 📁 Client Profile opens, what the 🏅 Scorecard collects and the
   🛠 Practice Lab's pages.
   Loaded just before js/lsh-program.js.
   Every grade the platform gives a trainee, one source each:
     ✍️ Knowledge Checks        kcreview:<id>, the trainer's final score, else state.progress[lesson].score, the best attempt
                                (js/ft-process.js; 70% passes). ✍️ Knowledge Check (the process questions) is its
                                own feature: its own button in the top bar, no page under 📚 Dashboard and no
                                Admin tab.
     🎯 Graded calls            callsim:<id>, the best graded call on each mock-call line (js/ft-simulators.js)
     📅 Calendaring Simulators  calsim:<id>, the trainer's released score on the latest submission of a week,
                                else the best automated review; plus connected simulators' results (js/ft-calendar.js)
     🟢 Practice Sessions       sessions:<id> + labreview:<id>, the trainer's score on each session, else its automated checks (js/ft-sessions.js)
     🧑‍🏫 With your trainer       labreview:<id>, the trainer's recorded result on each trainer-led activity (js/ft-sessions.js)
     📋 Task Tracker & Monitoring  trackerreview:<id>, the Drive files' checks (or the trainer's score) (js/ft-drive.js)
     📅 Calendaring Activity    calweek:<id>, the automated check of the submitted next-week calendar (js/ft-calweek.js)
     🧰 Portal simulators       simresults:<id>, the best result per Training Portal simulator (written by the Portal's /api/sim-results)
   (The Daily Activities page was taken off: the Practice Lab and the Knowledge Checks cover that work.)
   ============================================================ */
(function(){
const title = id => { const d = DAYS.find(x => x.id === id); return d ? d.title : "Lesson " + id; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const CALL_LESSONS = [4, 5, 6];   // Reception, Calendar Management and Intake Mock Calls (as in js/ft-simulators.js)


window.LSH_PROGRAM = {
  // 📚 Dashboard: the modules, then these pages (who: "trainee", "admin" or both). Their own top bar buttons
  // move here, and their pages get the section's bar of tabs.
  modules: [
    {view:"notes", icon:"🗒", label:"Notes", who:"trainee", about:"Your own notes from the lessons."},
    {view:"scorecard", icon:"🏅", label:"My Performance", who:"trainee", about:"Your focus, your trainer’s feedback and every grade the platform gives you, from all of its grading systems — the same scores the Main Portal's scorecard collects."},
    {view:"orientation", icon:"🧭", label:"Orientation", who:"admin", about:"The platform orientation slides (the Blueprint PDF)."}
  ],
  // No 📁 Client Profile button in the top bar — My Firm (js/ft-firms.js) is still reachable from the
  // Practice Lab (labViews below), just not as its own top-level nav item.
  caseProfile: null,
  // 📌 Setting of Training Expectations and Company Policies, then 🧰 Know Your Tools (js/ft-day-decks.js), before Lesson 1
  pinned: () => [window.FT_ORIENTATION, window.FT_TOOLS_PIN].filter(Boolean),
  moduleViews: ["day"],   // 📚 Dashboard holds the modules. ✍️ Knowledge Check (#/process) and its graded view (#/kc) are their own feature, with their own button in the top bar (js/ft-process.js)
  labViews: ["simulators", "calsim", "firm", "session", "lor", "transcribe", "guide", "skills", "drills", "calcheck", "calrules", "calweek", "calpractice", "listening", "shadowing"],  // 🛠 Practice Lab: its page, a Practice Session, 🏛 My Firm, the 🧰 Drafting Tools' LOR Drafting Activity (and the older Calendaring Simulators page)
  shared: ["settings:trainer-acts", "settings:listening"],   // the trainer-led activities' names; the Call Listening sets as the trainer set them (how many recordings each)
  // the Admin screen's tabs by section (any other tab sits under 🛡 Admin Master Control)
  // the Admin screen's sections renamed for this program
  adminGroupLabels: {modules:"🔓 Open Lessons"},
  // 🔓 Open Lessons in an admin's top bar: unlocking the day cards is one click from any page
  adminTopOpenLessons: true,
  // no 🏅 Scorecards button in an admin's top bar: Admin → 🏅 Scorecard → 🏅 Scorecards is the same table
  adminTopScorecards: false,
  adminGroups: {
    admin: ["attendance", "batches", "sops", "dbmaint", "orientation"],   // (📁 Batches: archive, records, the Archive shelf, offboarded VAs, js/ft-batch-admin.js)   // (👥 Trainees & Batches — Trainee Audit and 📁 Batch Folders, js/ft-trainees-tab.js — at the foot of 📋 Batch Sheet, no tab; 💬 Trainee Feedback: removed)   // (no 🏛 Law Firms tab)
      // 🕘 Attendance: every active trainee's Time In for the day (js/ft-attendance.js); the Portal's /attendance.html has the rest
    modules: ["opendays", "curriculum", "monitor", "fbstyle"],   // (no 🎮 Knowledge Games: removed; no 📋 Task Trackers or 📁 Drive Trackers button: set up already, their checks are on 📋 Batch Sheet → ✅ Compliance and 📤 Daily outputs)
    lab: ["calendaring", "sessions", "listening", "trainerinputs", "calscores", "calcheck", "calrules", "calweek"],   // (📅 the two calendaring activities: js/ft-calcheck.js)
    // (🧑‍🏫 Graders — every mock call and demo scoresheet — beside 📋 Batch Sheet, 🧪 Typing & Spelling and 📝 Send Feedback)
    scorecard: ["batchsheet", "drivelinks", "skilltests", "sendfeedback", "graders", "audit", "tfeedback"]   // (📊 Weekly Ranking: in 📋 Batch Sheet, under the Day 1–16 scores)
  },
  // tabs that keep their route but have no button (📊 Weekly Ranking: in 📋 Batch Sheet, js/ft-ranking.js toRanking)
  // (💬 Trainee Feedback: removed)
  // (📋 Mock Call Scorecards: merged into 🧑‍🏫 Graders: Mock Calls & Demos, the one grading page; 🧑‍🏫 Trainer Inputs: no button)
  // (👥 Trainees & Batches: removed: the Main Portal approves trainees, and one it signs in is approved here; 📋 Task Trackers:
  // no button, the end-of-day check runs by itself and its results are in 📋 Batch Sheet's 📤 Daily outputs; 📁 Drive Trackers:
  // no button either, set up already, its checks in 📋 Batch Sheet's ✅ Compliance)
  // (🧪 Typing & Spelling and 📝 Send Feedback: no buttons — the tests are in each trainee's table and 📤 Daily outputs, and
  // 📝 Send Feedback opens in each trainee's table on 📋 Batch Sheet; their routes stay)
  // (📅 Calendaring, 🟢 Practice Sessions and 🎧 Call Listening: no buttons either — every grade of theirs is in each
  // trainee's table on 📋 Batch Sheet, whose 📅 / 🟢 / 🎧 Review buttons open these screens)
  adminHidden: ["calendaring", "sessions", "listening", "skilltests", "sendfeedback", "ranking", "audit", "trackers", "drivetrackers", "tfeedback", "trainerinputs", "calscores", "calcheck", "calrules", "calweek"],
  // 📋 Batch Sheet (js/ft-batch-sheet.js) leads the 🏅 Scorecard section: its button opens on it
  adminLead: {scorecard: "batchsheet", lab: "calendaring"},
  // 🏅 Scorecards and 📈 Overall Performance are folded into the 📋 Batch Sheet (its 🏅 Scores and 📤 Daily outputs): no tabs of their own
  adminScorecardsTab: "batchsheet",
  sources: [
    {id:"kc", icon:"✍️", label:"Knowledge Checks", key:"kcreview:",
      about:"Each lesson’s process questions, graded out of 100 in the facilitator’s feedback style. Your best attempt counts, or your trainer’s final score once they give one; 70% passes the lesson.",
      items: ctx => DAYS.filter(d => typeof window.ftKcQuestions === "function" && window.ftKcQuestions(d.id).length).map(d => {
        const p = ctx.progress[d.id] || {}, rv = (((ctx.rec["kcreview:"] || {}).lessons) || {})[d.id];
        const t = rv && rv.score != null && rv.score !== "" && isFinite(Number(rv.score)) ? Number(rv.score) : null;
        if(t != null) return {name:d.title, pct:t, note:`${t >= 70 ? "Passed" : "Not yet · 70% passes"} · trainer’s final score`};
        // (a trainer's score taken away, before the trainee's page has caught up: the graded best kept beside it)
        const sc = p.trainerScore != null && "gradedScore" in p ? p.gradedScore : p.score;
        if(typeof sc !== "number") return {name:d.title, pct:null, note:"Not taken yet"};
        return {name:d.title, pct:sc, note:`${sc >= 70 ? "Passed" : "Not yet · 70% passes"} · ${plural(p.kcAttempts || 1, "attempt")}`};
      }).flatMap((it, k, arr) => {
        // 📖 a lesson's Reading Task (Day 1's PI Overview), scored on its own (js/ft-process.js): its own line after the lesson's
        const d = DAYS.filter(x => typeof window.ftKcQuestions === "function" && window.ftKcQuestions(x.id).length)[k], p = ctx.progress[d.id] || {};
        const rs = [...new Set(window.ftKcQuestions(d.id).map(x => x.set))].find(st => st.open);
        if(!rs || new Set(window.ftKcQuestions(d.id).map(x => x.set)).size < 2) return [it];
        // (the trainer's final score for it, kcreview:<id>.read[lesson], straight from their review, as the lesson's is)
        const rv = (((ctx.rec["kcreview:"] || {}).read) || {})[d.id], t = rv && rv.score != null && rv.score !== "" && isFinite(Number(rv.score)) ? Number(rv.score) : null;
        if(t != null) return [it, {name:`📖 ${rs.title}`, pct:t, note:"Reading Task · trainer’s final score"}];
        const g = p.readTrainer != null && typeof p.readGraded === "number" ? p.readGraded : p.readScore;
        return [it, typeof g === "number" ? {name:`📖 ${rs.title}`, pct:g, note:`Reading Task · ${plural(p.readAttempts || 1, "attempt")}`} : {name:`📖 ${rs.title}`, pct:null, note:"Reading Task · not graded yet"}];
      })},
    {id:"calls", icon:"🎯", label:"Graded calls", key:"callsim:",
      about:"Your best graded call on each mock-call line of the CMS Call Simulator.",
      items: ctx => CALL_LESSONS.map(id => {
        const b = ((ctx.rec["callsim:"] || {}).best || {})["lesson" + id], name = title(id) + " · Mock Calls";
        return b ? {name, pct:Number(b.score), note:"Best of " + plural(b.calls || 1, "graded call")} : {name, pct:null, note:"No graded call yet"};
      })},
    {id:"calendar", icon:"📅", label:"Calendaring Simulators", key:"calsim:",
      about:"Each week you worked on: your trainer’s score once they release it, until then your best automated review.",
      items: ctx => {
        const d = ctx.rec["calsim:"] || {}, C = window.FTCalCore, out = [];
        const subs = d.submissions || [], autos = d.autos || [], reviews = d.reviews || {};
        ((C && C.SCENARIOS) || []).forEach(s => {
          const last = subs.filter(x => x.scn === s.id).pop(), r = last && reviews[s.id + "|" + last.at];
          const best = autos.filter(a => a.scn === s.id).reduce((m, a) => Math.max(m, Number(a.pct) || 0), -1);
          if(r && r.released !== false && r.score != null && r.score !== "") out.push({name:s.short, pct:Number(r.score), note:"Trainer’s score", at:last.at || ""});
          else if(best >= 0 || last) out.push({name:s.short, pct:best >= 0 ? best : Number(last.auto && last.auto.pct) || 0, note:r && r.released !== false ? "Automated review · your trainer’s review has no score" : last ? "Automated review · waiting for your trainer" : "Best automated review"});
        });
        const ext = {};   // connected simulators (the Portal's Calendaring Simulator, the CMS): the best result per simulator
        (d.external || []).forEach(x => { const pct = x.max > 0 ? Math.round(x.score / x.max * 100) : null; const k = x.title || "Simulator";
          if(pct != null && (!ext[k] || pct > ext[k].pct)) ext[k] = {name:k, pct, note:"Connected simulator · best result"}; });
        return out.concat(Object.values(ext));
      }},
    {id:"sessions", icon:"🟢", label:"Practice Sessions", key:"sessions:",
      about:"Your live Practice Sessions at your firm: your trainer’s score once they review one, until then its automated checks.",
      items: ctx => typeof window.ftSessionItems === "function" ? window.ftSessionItems(ctx) : []},
    {id:"trainer", icon:"🧑‍🏫", label:"With your trainer", key:"labreview:",
      about:"The demos and mock calls you do live with your trainer, as your trainer recorded them.",
      items: ctx => typeof window.ftTrainerItems === "function" ? window.ftTrainerItems(ctx) : []},
    {id:"drive", icon:"📋", label:"Task Tracker & Monitoring Sheet", key:"trackerreview:",
      about:"Your Daily Task Tracker and Training Progress Monitoring Sheet in your main Google Drive: the system’s checks, or your trainer’s score where they gave one.",
      items: ctx => typeof window.ftDriveItems === "function" ? window.ftDriveItems(ctx) : []},
    {id:"skills", icon:"🧪", label:"Typing & Spelling", key:"skills:",
      about:"Your daily tests (Typing twice a day, Spelling once), taken in the Practice Lab or saved as a screenshot in your Drive folder: your daily compliance, your typing speed against the 60 WPM clients look for (the average of your last 10), and your spelling average.",
      items: ctx => typeof window.ftSkillItems === "function" ? window.ftSkillItems(ctx) : []},
    {id:"drills", icon:"🏷", label:"Naming & Reporting Drills", key:"drills:",
      about:"Your best round on each set of drills: the file names, Notes and Tasks entries and subject lines every demo is scored on.",
      items: ctx => typeof window.ftDrillItems === "function" ? window.ftDrillItems(ctx) : []},
    // (no 👥 Shadowing: shadowing is off the training)
    // (Day 3's 📝 Reception Listening Activity is one of its items, by its grade: trackerreview:<id>.assess.recact)
    {id:"listening", icon:"🎧", label:"Call Listening", key:"listening:",
      about:"The Call Listening recordings you logged: who called, what they wanted, how the VA handled it and a phrase worth reusing. The share of each set logged in full, and Day 3’s Reception Listening Activity by its grade once you submit its Answer Sheet.",
      items: ctx => typeof window.ftListenItems === "function" ? window.ftListenItems(ctx) : []},
    // (📅 one card for the two calendar checks: Day 5's Attorney Calendar Management Activity and the mock-call bookings
    //  against the scheduling rules, each booking set named "📅 Booking rules · …")
    {id:"calcheck", icon:"📅", label:"Calendar checks", key:"calcheck:",
      about:"Day 5’s Attorney Calendar Management Activity (each event you entered in Google Calendar, checked field by field: the share of fields right on your latest submission) and your calendar mock-call bookings (each checked against the guide’s scheduling rules: the share of rules met, practice calls and mock calls with your trainer apart).",
      items: ctx => [].concat(
        (typeof window.ftCalCheckItems === "function" ? window.ftCalCheckItems(ctx) || [] : []),
        (typeof window.ftCalRuleItems === "function" ? window.ftCalRuleItems(ctx) || [] : []).map(x => x && Object.assign({}, x, {name: "📅 Booking rules · " + String(x.name).replace(/^📅\s*/, "")})))},
    // (hidden: no card of its own — its items are on 📅 Calendar checks — but its records are still read, and a day's
    //  activity still finds its booking-rule score by this id; noOverall: not counted twice)
    {id:"calrules", icon:"📅", label:"Calendar booking rules", key:"calrules:", hidden:true, noOverall:true,
      items: ctx => typeof window.ftCalRuleItems === "function" ? window.ftCalRuleItems(ctx) : []},
    {id:"calweek", icon:"📅", label:"Calendaring Activity", key:"calweek:",
      about:"Standard Training - Calendaring Activity (Days 5–6): the tasks you booked on the attorney’s calendar for next week, checked against the attorney’s rules (the score of your submitted calendar).",
      items: ctx => typeof window.ftCalWeekItems === "function" ? window.ftCalWeekItems(ctx) : []},
    {id:"feedback", icon:"📝", label:"Trainer feedback", key:"trainerfb:",
      about:"The score your trainer gave each piece of work they reviewed: your transcriptions, video notes, process guides and letters (Admin → 📝 Send Feedback).",
      items: ctx => typeof window.ftTrainerFeedbackItems === "function" ? window.ftTrainerFeedbackItems(ctx) : []},
    // (noOverall: its marks are averages of the other systems' scores, so it is shown but not counted again in the overall)
    {id:"ranking", icon:"📊", label:"Weekly Ranking", key:"rankshare:", noOverall:true,
      about:"Your final average each week, out of 5, from the weekly progress report your trainer shared with you (and your rank in the batch).",
      items: ctx => Object.values(((ctx.rec["rankshare:"] || {}).weeks) || {}).filter(w => w && w.avg != null).sort((a, b) => a.week - b.week)
        .map(w => ({name:`Week ${w.week}`, pct:Math.round(Number(w.avg) / 5 * 100), note:`${Number(w.avg).toFixed(2)}/5${w.rank ? ` · rank ${w.rank} of ${w.of}` : ""}`}))},
    // 🛠 the Practice Lab, as Admin → 🛠 Practice Lab → 🟢 Practice Sessions measures it (js/ft-utilization.js): the Utilization, the
    // Eagerness to Learn and the scored AI practice tools, roleplays and random tasks (progress:<id>'s work log), counted in the overall
    {id:"practicelab", icon:"🛠", label:"Practice Lab", key:"progress:",
      about:"How much you use the Practice Lab and how eager you are to learn, as your trainer sees it: 📈 Utilization (the Practice Lab tools you used, and the training days you practiced on), 🔥 Eagerness to Learn (showing up every day, practicing, going back to practice again and getting better), and the latest score of each AI practice tool, roleplay and random task you did.",
      items: ctx => window.FTUtil && typeof window.FTUtil.scoreItems === "function" ? window.FTUtil.scoreItems(ctx) : []},
    {id:"portalsims", icon:"🧰", label:"Portal simulators", key:"simresults:",
      about:"Your best result on each LSH Training Portal simulator you opened from this program (the Google Calendar Simulator, Medical Records Requests, …).",
      items: ctx => Object.entries(((ctx.rec["simresults:"] || {}).best) || {}).map(([name, b]) => ({name, pct:Number(b.score), note:`Best of ${plural(b.count || 1, "attempt")}`}))}
  ]
};
})();
