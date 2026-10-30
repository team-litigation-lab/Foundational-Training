/* 🛠 The Foundational Training course's blueprints — Trainee and Trainer (lsh-blueprint.js draws it; lsh-blueprint-course.js
   wires it in). Both decks live here: the Trainee blueprint is the 🧭 Orientation deck (js/ft-orientation.js
   opens it), drawn on the same cover and the same slide layout, and published at /blueprint.pdf; nothing in the program links to either — the Main Portal's 🧭 Blueprint page does.
   A slide is { icon, title, points: [...], where, tip, shot, shotAlt }: shot is a screenshot of that
   screen (/img/blueprint/*.jpg), shown beside the points on the slide and in the PDF; shotAlt describes it.
   Change the wording here; the page and the PDF are made from it each time, stamped with the deployed build.
   README → Platform Orientation and the Blueprint PDF. */
window.LSH_BLUEPRINT = {
  product: 'Foundational Training',
  site: 'LSH Standard Foundational Training',
  file: 'LSH_FT',
  trainee: {
    sub: 'Your guide to the platform: the 16-day Standard Foundational Training, day by day',
    slides: [
      { icon: '👋', title: 'Welcome to the program', points: [
          'The 16-day program that makes you a Generalist Legal VA: familiar with every role on a personal injury legal team.',
          'Learn: 8 lessons over the 16 days, each day with its own deck of steps, its videos and its activities.',
          'Practice: real-time Practice Sessions for your own law firm, on your own case files in the CMS.',
          'Prove: your daily trackers and your trainer\'s feedback \u2014 and a certificate at the end.',
          'You\'ll need Chrome or Edge on a computer, a headset with a microphone, your camera for the classroom discussions, and a stable connection.'],
        where: 'The program opens from the LSH Training Portal; 📚 Dashboard is where you land.',
        tip: 'Your progress saves to your account, not to the computer you used \u2014 you can pick up on any machine.' },
      { icon: '🗺', title: 'Your roadmap', points: [
          '📌 Setting of Training Expectations and Company Policies comes first, then 🧰 Know Your Tools. Both are always open, and neither is one of the 8 lessons.',
          'Then Days 1 to 16, in order: each lesson card on 📚 Dashboard opens its day\'s deck (Start, or Part 1 / Part 2 for a lesson that runs over several days).',
          'Your trainer opens each lesson for your batch, and each step of the day as the class reaches it; a 🔒 step opens when it is time.',
          'The 🗺 Map on every deck shows the whole roadmap and where you are.'],
        where: '📚 Dashboard \u2014 the lesson cards, in day order, with your progress above them.',
        tip: 'Open 📌 Setting of Training Expectations and Company Policies before Lesson 1: every rule and routine is in it.' },
      { icon: '🖥', title: 'How every lesson works', points: [
          '1. The day\'s deck: one step per slide, its videos playing right on the slide and its documents in the slide or a viewer. ← Previous / Next →; your place is saved.',
          '2. Next moves on once a step is open. A step waiting on your 📤 Submit or ✅ Done says so when you press Next.',
          '3. 🎬 Video on the lesson card: the lesson\'s AI discussion video, 🔒 until your trainer unlocks it (🔒 Request Video asks for it).',
          '4. ✍️ Process Questions: Submit, on the card: submit the sheet for grading. 70% passes, and your trainer adds a review.',
          '5. The next lesson opens when your trainer opens it for your batch.'],
        where: '📚 Dashboard → Start (or Part 1, Part 2…) on a lesson card.',
        tip: 'A lesson\'s process questions are its Knowledge Check, not slides \u2014 don\'t go looking for them in the deck.' },
      { icon: '📷', title: 'Classroom discussions', points: [
          'Your trainer presents each lesson live, on the same slides you have on the platform. Nothing extra to install.',
          'Cameras on for the whole discussion. Meeting schedules are sent on the discussion\'s date and time \u2014 keep your notifications on.',
          'After each discussion or activity, following its specific instructions, fill in your Monitoring Sheet: the date, 5 major takeaways, 3 questions you still have, and how well you understood it.',
          'Free Upskill Training runs right after your shift, for an hour or so: communication, accent reduction, grammar, email writing and client interviews. Unpaid and not mandatory, but highly encouraged.'],
        where: 'Discord, on the date and time of the discussion · 📒 Monitoring Sheet under 📚 Dashboard.',
        tip: 'Missed a Free Upskill session? Ask your trainers what was covered, review the materials and do the practice on your own time.' },
      { icon: '📚', title: '📚 Dashboard: where every sign-in lands', points: [
          'Your scores on top: program complete, lessons finished (of 8), today\'s tests, test compliance, your Task Tracker and Monitoring Sheet, graded calls and your certificate.',
          '📌 Setting of Training Expectations and Company Policies and 🧰 Know Your Tools, then the 8 lesson cards in day order: Start or Part 1, Part 2… · 🔒 until your trainer opens it.',
          'Each card\'s 🎬 Video, and 💬 Your feedback for the program.',
          'Under 📂 My Pages / the top bar: 🗒 Notes and 🏅 My Performance.'],
        where: '📚 Dashboard in the top bar \u2014 on this platform and on every other LSH platform.',
        tip: 'Opening the training from the LSH Training Portal brings you straight here, already signed in.' },
      { icon: '🧭', title: 'Getting around', points: [
          '🛠 Practice Lab: your firm (its rules and your case files), your real-time Practice Sessions, the simulators, drills, Call Listening, the drafting tools and the activities with your trainer.',
          '✍️ Knowledge Check: every lesson\'s answer sheet in one place. 70% passes, graded in your facilitator\'s style. Save each sheet daily in your Assessment and Activities Folder, named by its convention, before the end of your shift: the platform finds it there.',
          '🎯 Focus: your trainer\'s feedback and what to work on next.',
          '🏠 Main Portal: every program you are in, your evaluations \u2014 and where you log out.'],
        where: 'The top bar, on every page. On a phone, everything is under ☰ Menu.',
        tip: 'Your Task Tracker and Monitoring Sheet live in your main Google Drive: link them once, and the platform checks them every evening.' },
      { icon: '📋', title: 'Your daily habits', points: [
          'Daily Task Tracker: update it in your main Google Drive before the end of every shift, and submit the day\'s output links.',
          'Every open task gets a Daily Note for the day; the tracker is checked every evening.',
          'EOD email before the end of every shift: at least 2 sentences for each item, and 3 key learnings from the day\'s tasks.',
          'Auxes and Hubstaff: !in and !back in #⏳-timestamps, In in #trainingchannel. Your Hubstaff To-Dos are named exactly as given.'],
        where: 'Your main Google Drive · their checks on 📚 Dashboard and 🏅 My Performance.',
        tip: 'Every rule and routine is written out in 📌 Setting of Training Expectations and Company Policies, first on 📚 Dashboard.' },
      { icon: '🛠', title: 'Practice Lab: the real tasks', points: [
          'Your firm: your trainer assigns your law firm and your cases. Learn its rules \u2014 every session is checked against them.',
          'Practice Sessions: reception, calendaring, intake, the PI process, claims and ChartSwap records requests, done live in the CMS, recorded and submitted.',
          'With your trainer: demos and live mock calls, with your result recorded.',
          'Each session opens with its lesson, is checked automatically against your case and your firm\'s rules, evaluated, and reviewed by your trainer.'],
        where: '🛠 Practice Lab in the top bar. The CMS opens already signed in.',
        tip: 'Read your firm\'s page in 🛠 Practice Lab before your first session: the firm\'s rules are what you are graded against.' },
      { icon: '💬', title: 'Feedback and your growth', points: [
          '🏅 My Performance: every grade in one place \u2014 your Knowledge Checks, graded calls, calendaring, mock calls and demos, tests and trackers, with your trainer\'s scores and the weekly ranking.',
          'Trainer feedback: your Practice Lab work comes back with your trainer\'s notes, and a lesson\'s 💬 Trainer feedback shows on its card.',
          '🎯 Focus: your trainer\'s priorities for you and what to work on next. Tick items off as you go.',
          'A grade below the mark is a "not yet", with what to change \u2014 never a flat no.'],
        where: '🏅 My Performance · 🎯 Focus.',
        tip: 'Read the feedback on the day it arrives: it is far easier to act on while the lesson is fresh.' },
      { icon: '🏅', title: 'Earning your certificate', points: [
          'Finish all 8 lessons and your Certificate of Completion unlocks \u2014 download it as a PDF from 📚 Dashboard.',
          'It shows your name exactly as you registered it, so check your spelling.',
          '📚 Dashboard counts your finished lessons as you go.',
          '📌 Setting of Training Expectations and Company Policies is where you start. It is always open, and it is not one of the 8 lessons.'],
        where: '📚 Dashboard \u2014 🎓 Certificate, beside your scores.',
        tip: 'Name spelt wrong? Tell your trainer before the end of the program, not after the certificate is issued.' },
      { icon: '🔒', title: 'Ground rules', points: [
          'Confidentiality first: every document is protected by attorney-client privilege. Never paste client, case or medical information into any tool.',
          'AI for grammar and spelling only \u2014 use your own reasoning and discretion.',
          'The 5-minute rule: reply within 5 minutes, and acknowledge every Discord message from your trainer.',
          'On time: Hubstaff tracks 8:00 AM \u2013 5:00 PM EST. Breaks are 15 \u2013 30 \u2013 15, or one full hour.',
          'Naming conventions, strictly: To-Dos, screenshots and files exactly as given.'],
        where: '📌 Setting of Training Expectations and Company Policies, first on 📚 Dashboard.',
        tip: 'When a rule and a shortcut disagree, follow the rule and raise it with your trainer \u2014 spotting the clash is the job.' },
      { icon: '🚀', title: "Let's begin", points: [
          '1. Open the program from the LSH Training Portal: you arrive signed in. Your trainer approves your registration.',
          '2. Open 📌 Setting of Training Expectations and Company Policies: the rules and your daily routine.',
          '3. Open 🧰 Know Your Tools, then Lesson 1 from 📚 Dashboard and press Start.',
          'Questions before we start?'],
        where: 'The LSH Training Portal → this program → 📚 Dashboard.',
        tip: 'Stuck on anything? Message your trainer with your name, your batch and a screenshot \u2014 that is everything they need.' }
    ]
  },
  trainer: {
    sub: 'Running the 16-day Foundational Training program: the trainer side of the platform',
    slides: [
      { icon: '🔑', title: 'Signing in as a trainer', points: [
          'Admin sign-in with the admin password. Trainees don\'t sign in here: they open the program from the LSH Training Portal.',
          'Your top bar: 📚 Dashboard, 🛠 Practice Lab, ✍️ Knowledge Check, 📂 My Pages (🧭 Orientation), 🏅 Scorecards, 👁 Switch View, 🛡 Admin and 🏠 Main Portal.',
          '📚 Dashboard is the landing page: every sign-in, trainer or trainee, opens it. A trainee sees the same bar without 🏅 Scorecards, 👁 Switch View and 🛡 Admin, and with 🗒 Notes, 🏅 My Performance and 🎯 Focus.',
          'Admin is your trainer dashboard: the Trainee Audit and every trainer tab.',
          'Every lesson is open to you, so you can preview it before you teach it.'],
        where: 'Admin sign-in · Admin in the top bar.',
        tip: 'The facilitator\'s notes, the curriculum and the scripts are only ever sent to a signed-in trainer.',
        shot: '/img/blueprint/signin.jpg',
        shotAlt: 'The Admin Master Control screen: the top bar with Dashboard, Client Profile, Practice Lab, Knowledge Check, Scorecards, Switch View, Admin and Main Portal, and under it the sections Admin Master Control, Dashboard, Practice Lab and Scorecard with the Trainee Audit open.' },
      { icon: '✅', title: 'Trainees and the Trainee Audit', points: [
          'Approve new trainees, or reject them. Revoke a trainee to close their access.',
          'The Trainee Audit: each trainee\'s lessons finished, their work and their feedback, by batch.',
          'Write a trainee\'s feedback there; they read it on their 💬 Feedback page.',
          'Trainee Feedback shows what trainees said about each lesson.'],
        where: 'Admin → Trainee Audit · Trainee Feedback.',
        tip: 'Check the audit at the end of each training day.',
        shot: '/img/blueprint/audit.jpg',
        shotAlt: 'The Trainee Audit: one row per trainee with their batch, lessons finished, average score, practice runs and last activity, and the buttons View Detail, Feedback, Certificate, Reset Attempts and Revoke.' },
      { icon: '📅', title: 'Open Lessons', points: [
          'Lessons open when you open them: tick the lessons that are open.',
          'Open them for All batches, or for one batch only.',
          'Trainees only ever see the open lessons. 📌 Setting of Training Expectations and Company Policies is always open.',
          'Inside a day, each step opens as you unlock it from the deck\'s trainer panel (🔒 Segment lock).'],
        where: 'Admin → 📅 Open Lessons.',
        tip: 'Open the next lesson at the start of its session, not the night before.',
        shot: '/img/blueprint/opendays.jpg',
        shotAlt: 'The Open Lessons tab: a Batch chooser set to All batches, a tick box for each of the eight lessons, and an Unlock Videos card with the same lessons.' },
      { icon: '📋', title: 'The day decks: your trainer panel', points: [
          'Every day has its deck, the same slides your trainees see. The trainer panel beside it holds the 🔒 Segment lock, the slide\'s 🧑\u200d🏫 Facilitator notes and ✏️ Edit this slide.',
          'Unlock a step for All batches or one batch; trainees can\'t go past a locked step. 🔓 Unlock lets a single slide open early.',
          'Facilitator notes open in a drawer beside the slide (on a scoring slide, on the left, clear of 💾 Save), never on the trainees\' screen. Hide panel ⇥ gives the slide its full width.',
          'Digital Handouts open when the slide reads Open to trainees.'],
        where: '📚 Dashboard → a lesson card → the day\'s deck.',
        tip: 'Hide the panel before you share your screen: the slide then pages exactly as the trainees\'.' },
      { icon: '📘', title: 'The Curriculum', points: [
          'The whole Training Guide, day by day: the tasks, the links and the facilitator\'s notes.',
          'Trainers only: it isn\'t on any trainee page, in the trainee view or in the shared slides window.',
          'Where the guide lists a log-in, you get a link to the credentials document instead.'],
        where: 'Admin → 📘 Curriculum.',
        tip: 'Read the next day in the Curriculum the evening before.',
        shot: '/img/blueprint/curriculum.jpg',
        shotAlt: 'The Curriculum tab: the Training Guide for LSH Trainees with a Day chooser, showing that day\'s tasks and the facilitator\'s notes.' },
      { icon: '🎯', title: 'Mock calls, demos and the weekly report', points: [
          'On a mock call or demo slide, the scorecard is live: pick the batch and trainee, score each line with Remarks, and 💾 Save to their scores.',
          '🛠 Practice Lab → 📋 Mock Call Scorecards scores a whole batch at once; 🧑\u200d🏫 Trainer Inputs keeps every result. All three write the same record.',
          '🏅 Scorecards → 📊 Weekly Ranking: ⤓ Fill takes each column from the platform, per column This week only or Whole training, never over what you typed.',
          '📝 Send Feedback scores the transcriptions, Process Guides and letters trainees submit.'],
        where: 'The day decks · 🛠 Practice Lab · 🏅 Scorecards.',
        tip: 'Add the same source twice, once per period, to show the week and the whole training side by side.' },
      { icon: '📁', title: 'Batches and Google Drive', points: [
          'Batch Folders: each batch and its VAs. Offboard a VA, or archive a batch when it ends.',
          '☁ Save to Drive & archive writes the batch\'s records into the Shared Drive folder you paste, then can clear them from the platform; the scorecards stay on the Main Portal.',
          'It needs the program\'s Google service account (GDRIVE_SA_EMAIL and GDRIVE_SA_KEY on the Worker) as a Content manager of that Shared Drive. Without it, 📦 Archive without the backup still works.'],
        where: 'Admin → Batch Folders.',
        tip: 'Test the Drive backup on a finished batch, with "clear the records" unticked, before you rely on it.' },
      { icon: '🖥', title: 'Presenter view', points: [
          'Share only the slides window in Google Meet; your console has the page-by-page script.',
          'Each page\'s script has four beats: the why, talk it through, walk through it, ask the room.',
          '← Page / Page → step through the deck; resizing or full screen never sends it back to page 1.'],
        where: 'A lesson → 🖥 Presenter view.',
        tip: 'Open it 15 minutes early, and share the slides window, not your screen.',
        shot: '/img/blueprint/presenter.jpg',
        shotAlt: 'Presenter view: the slide now showing to the room on the left, the trainer\'s own notes panel on the right, the step counter, the slides-window status, and Previous / Next with the line about sharing the slides window in Google Meet.' },
      { icon: '🗣', title: 'The facilitator\'s feedback style', points: [
          'Every AI review is written in the facilitator\'s voice: a verdict, the strength with exact details, then what to improve.',
          'Import the reviews you wrote, or upload past reports, and Learn the style to update the voice.',
          'Edit the style guide, switch it off, or go back to the facilitator\'s DNA.'],
        where: 'Admin → 🗣 Feedback Style.',
        tip: 'The more of your own reviews it learns from, the more the drafts sound like you.',
        shot: '/img/blueprint/fbstyle.jpg',
        shotAlt: 'The Feedback Style tab: the current voice with its traits, the style guide text and the voice examples, and the Save edits and Try it on a sample answer buttons.' },
      { icon: '📒', title: 'Monitoring Sheets', points: [
          'Each trainee\'s Training Progress Monitoring Sheet, by batch, trainee and discussion.',
          'Automated feedback from the 📏 Feedback Rubric (not AI): the checks, a score and the feedback to copy.',
          '"Needs extra help" marks entries rated "I really don\'t get this".',
          'Tune the rubric\'s metrics, and set the discussions and their key points.'],
        where: 'Admin → 📒 Monitoring Sheets.',
        tip: 'Start with the "Needs extra help" entries.',
        shot: '/img/blueprint/monitor.jpg',
        shotAlt: 'The Monitoring Sheets tab: each trainee\'s sheet by batch, with the Discussions and Key Points list open and the Feedback Rubric below it.' },
      { icon: '✍️', title: 'Knowledge Check', points: [
          'Each module\'s answer sheet, by batch and trainee: submitted or not, how many answered, the answers, and the file the platform found in their folder: named by the convention or not, saved on time or late.',
          'A ready line for the ranking report, in the facilitator\'s words.'],
        where: '✍️ Knowledge Check in the top bar (its own feature — it is not a tab of this Admin screen).',
        tip: 'Copy the ranking line straight into the weekly report.',
        shot: '/img/blueprint/process.jpg',
        shotAlt: 'The Knowledge Check page: every trainee\'s answer sheets, by batch.' },
      { icon: '📋', title: 'Task Trackers', points: [
          'Every trainee\'s Daily Task Tracker, checked each evening against the tracker\'s rules: a ✅ or ❌ per rule and the day\'s %.',
          'A short AI review of the day\'s notes, against your criteria.',
          'Open a trainee\'s day and write a comment; they see it under the check.',
          'Each batch shows today\'s average and how many trainees need attention.'],
        where: 'Admin → 📋 Task Trackers.',
        tip: 'Comment on the first days\' trackers: habits set in week one stick.',
        shot: '/img/blueprint/trackers.jpg',
        shotAlt: 'The Task Trackers tab: each trainee\'s Daily Task Tracker with Run today\'s check now, and the Notes review criteria the evening check uses.' },
      { icon: '🕘', title: 'Attendance, Switch View and Orientation', points: [
          '🕘 Attendance is taken on the Main Portal, not here: Master Control → 🕘 Attendance, every program and batch in one place.',
          'Time In fills in by itself the first time a trainee opens this course each day (Eastern time); tag the status and add notes there. The Google Sheet stays in step both ways.',
          '👁 Switch View shows the platform exactly as trainees see it, and switches you back.',
          '🧭 Orientation is the deck to share with trainees on day one. The blueprints themselves live on the Main Portal\'s 🧭 Blueprint page, never inside the program.'],
        where: 'Attendance: the Main Portal → Master Control → 🕘 Attendance. Here: Admin → 👁 Switch View · 🧭 Orientation.',
        tip: 'The Trainee blueprint PDF republishes itself after every update; nothing to do by hand.' }
    ]
  }
};

/* No separate 📘 Platform Blueprint button on the top bar: 🧭 Orientation (js/lsh-blueprint-course.js,
   js/ft-orientation.js) is this platform's one screen-shareable blueprint. The PDF itself still publishes
   at /blueprint.pdf (js/lsh-blueprint.js, worker.js) for anyone with the direct link. */
