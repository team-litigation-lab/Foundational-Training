/* 🛠 The Foundational Training course's Trainer blueprint (lsh-blueprint.js draws it; lsh-blueprint-course.js
   adds it to 🧭 Orientation). The Trainee blueprint is the Orientation deck (js/ft-orientation.js), published
   at /blueprint.pdf; admins open it from 📘 Blueprint on the top bar (Handouts isn't part of this program).
   A slide is { icon, title, points: [...], where, tip, shot, shotAlt }: shot is a screenshot of that
   screen (img/blueprint/*.jpg), shown beside the points on the slide and in the PDF; shotAlt describes it.
   Change the wording here; the page and the PDF are made from it each time, stamped with the deployed build.
   README → Platform Orientation and the Blueprint PDF. */
window.LSH_BLUEPRINT = {
  product: 'Foundational Training',
  site: 'LSH Standard Foundational Training',
  file: 'LSH_FT',
  trainer: {
    sub: 'Running the 18-day Foundational Training program: the trainer side of the platform',
    slides: [
      { icon: '🔑', title: 'Signing in as a trainer', points: [
          'Admin sign-in with the admin password. Trainees don\'t sign in here: they open the program from the LSH Training Portal.',
          'Your top bar has 🏠 Main Portal (the LSH Training Portal), 📚 Modules, ✍️ Process Questions, 🛠 Practice Lab, 🏅 Scorecards, 📚 Guides (🧭 Orientation, Blueprint) and 👁 Trainee view.',
          'Admin is your trainer dashboard: the Trainee Audit and every trainer tab.',
          'Every lesson is open to you, so you can preview it before you teach it.'],
        where: 'Admin sign-in · Admin in the top bar.',
        tip: 'The facilitator\'s notes, the curriculum and the scripts are only ever sent to a signed-in trainer.',
        shot: 'img/blueprint/signin.jpg',
        shotAlt: 'The Admin Master Control screen: the top bar with Main Portal, Modules, Process Questions, Practice Lab, Scorecards, Orientation, Admin Master Control, Trainee view and Platform Blueprint, and under it the sections Admin Master Control, Modules, Practice Lab and Scorecard with the Trainee Audit open.' },
      { icon: '✅', title: 'Trainees and the Trainee Audit', points: [
          'Approve new trainees, or reject them. Revoke a trainee to close their access.',
          'The Trainee Audit: each trainee\'s lessons finished, their work and their feedback, by batch.',
          'Write a trainee\'s feedback there; they read it on their 💬 Feedback page.',
          'Trainee Feedback shows what trainees said about each lesson.'],
        where: 'Admin → Trainee Audit · Trainee Feedback.',
        tip: 'Check the audit at the end of each training day.',
        shot: 'img/blueprint/audit.jpg',
        shotAlt: 'The Trainee Audit: one row per trainee with their batch, lessons finished, average score, practice runs and last activity, and the buttons View Detail, Feedback, Certificate, Reset Attempts and Revoke.' },
      { icon: '📅', title: 'Open Lessons', points: [
          'Lessons open when you open them: tick the lessons that are open.',
          'Open them for All batches, or for one batch only.',
          'Trainees only ever see the open lessons. 📌 Training Orientation and Rules is always open.',
          'The batch\'s latest open lesson is also its training of the day in Attendance.'],
        where: 'Admin → 📅 Open Lessons.',
        tip: 'Open the next lesson at the start of its session, not the night before.',
        shot: 'img/blueprint/opendays.jpg',
        shotAlt: 'The Open Lessons tab: a Batch chooser set to All batches, a tick box for each of the eight lessons, and an Unlock Videos card with the same lessons.' },
      { icon: '📘', title: 'The Curriculum', points: [
          'The whole Training Guide, Day 0 to Day 18: the day-by-day tasks, the links and the facilitator\'s notes.',
          'Trainers only: it isn\'t on any trainee page, in Trainee view or in the shared slides window.',
          'Where the guide lists a log-in, you get a link to the credentials document instead.'],
        where: 'Admin → 📘 Curriculum.',
        tip: 'Read the next day in the Curriculum the evening before.',
        shot: 'img/blueprint/curriculum.jpg',
        shotAlt: 'The Curriculum tab: the Training Guide for LSH Trainees with a Day chooser, showing that day\'s tasks and the facilitator\'s notes.' },
      { icon: '🖥', title: 'Presenter view', points: [
          'Share only the slides window in Google Meet; your console has the page-by-page script.',
          'Each page\'s script has four beats: the why, talk it through, walk through it, ask the room.',
          '← Page / Page → step through the deck; resizing or full screen never sends it back to page 1.'],
        where: 'A lesson → 🖥 Presenter view.',
        tip: 'Open it 15 minutes early, and share the slides window, not your screen.',
        shot: 'img/blueprint/presenter.jpg',
        shotAlt: 'Presenter view: the slide now showing to the room on the left, the trainer\'s own notes panel on the right, the step counter, the slides-window status, and Previous / Next with the line about sharing the slides window in Google Meet.' },
      { icon: '🗣', title: 'The facilitator\'s feedback style', points: [
          'Every AI review is written in the facilitator\'s voice: a verdict, the strength with exact details, then what to improve.',
          'Import the reviews you wrote, or upload past reports, and Learn the style to update the voice.',
          'Edit the style guide, switch it off, or go back to the facilitator\'s DNA.'],
        where: 'Admin → 🗣 Feedback Style.',
        tip: 'The more of your own reviews it learns from, the more the drafts sound like you.',
        shot: 'img/blueprint/fbstyle.jpg',
        shotAlt: 'The Feedback Style tab: the current voice with its traits, the style guide text and the voice examples, and the Save edits and Try it on a sample answer buttons.' },
      { icon: '📒', title: 'Monitoring Sheets', points: [
          'Each trainee\'s Training Monitoring Sheet, by batch, trainee and discussion.',
          'Automated feedback from the 📏 Feedback Rubric (not AI): the checks, a score and the feedback to copy.',
          '"Needs extra help" marks entries rated "I really don\'t get this".',
          'Tune the rubric\'s metrics, and set the discussions and their key points.'],
        where: 'Admin → 📒 Monitoring Sheets.',
        tip: 'Start with the "Needs extra help" entries.',
        shot: 'img/blueprint/monitor.jpg',
        shotAlt: 'The Monitoring Sheets tab: each trainee\'s sheet by batch, with the Discussions and Key Points list open and the Feedback Rubric below it.' },
      { icon: '✍️', title: 'Process Questions', points: [
          'Each lesson\'s answer sheet, by batch and trainee: submitted or not, how many answered, the answers.',
          'A ready line for the ranking report, in the facilitator\'s words.'],
        where: '✍️ Process Questions in the top bar (its own feature — it is not a tab of this Admin screen).',
        tip: 'Copy the ranking line straight into the weekly report.',
        shot: 'img/blueprint/process.jpg',
        shotAlt: 'The Process Questions page: every trainee\'s answer sheets and Knowledge Checks, by batch.' },
      { icon: '📋', title: 'Task Trackers', points: [
          'Every trainee\'s Daily Task Tracker, checked each evening against the tracker\'s rules: a ✅ or ❌ per rule and the day\'s %.',
          'A short AI review of the day\'s notes, against your criteria.',
          'Open a trainee\'s day and write a comment; they see it under the check.',
          'Each batch shows today\'s average and how many trainees need attention.'],
        where: 'Admin → 📋 Task Trackers.',
        tip: 'Comment on the first days\' trackers: habits set in week one stick.',
        shot: 'img/blueprint/trackers.jpg',
        shotAlt: 'The Task Trackers tab: each trainee\'s Daily Task Tracker with Run today\'s check now, and the Notes review criteria the evening check uses.' },
      { icon: '🕘', title: 'Attendance, Trainee view and Orientation', points: [
          '🕘 Attendance: Time In fills in by itself when a trainee opens the course; tag each status and add notes.',
          'It stays in step with the attendance Google Sheet, both ways, through the Training Portal.',
          '👁 Trainee view shows the platform exactly as trainees see it.',
          '🧭 Orientation is the Trainee blueprint to share on day one; 📘 Blueprint on the top bar is the same deck as a PDF, yours to share.'],
        where: 'Admin → 🕘 Attendance · 👁 Trainee view · 🧭 Orientation.',
        tip: 'The Trainee blueprint PDF republishes itself after every update; nothing to do by hand.',
        shot: 'img/blueprint/attendance.jpg',
        shotAlt: 'The Attendance tab: the day\'s date, and one table per batch with each trainee\'s training, Time In, Time Out, status tag and notes.' }
    ]
  }
};

/* Top bar: 📘 Platform Blueprint, the Trainee blueprint PDF, for admins only (before the ⧉ / ⛶ buttons).
   Like 🧭 Orientation, it is a trainer's screen-shareable blueprint: trainees and 👁 Trainee view don't see it,
   and the trainer shares it on day one. The PDF itself holds nothing private, so /blueprint.pdf stays open. */
(function () {
  const bar = window.renderTopbar;
  if (typeof bar !== 'function') return;
  const st = document.createElement('style');   // a full top bar on a laptop screen: "📘 Blueprint", then just 📘 (its title names it)
  st.textContent = '@media (max-width:1500px){ .nav-blueprint .bp-long{display:none;} } @media (max-width:1330px){ .nav-blueprint .bp-word{display:none;} }';
  document.head.appendChild(st);
  window.renderTopbar = function () {
    const html = bar.apply(this, arguments);
    if (!state.isAdmin || state.adminPreview) return html;
    const btn = `<button type="button" class="nav-blueprint" onclick="window.open('/blueprint.pdf','_blank','noopener')" title="Platform Blueprint: how this platform works (PDF)">📘<span class="bp-word"> <span class="bp-long">Platform </span>Blueprint</span></button>`;
    const at = html.indexOf('<button type="button" class="nav-fs"');
    return at >= 0 ? html.slice(0, at) + btn + html.slice(at) : html;
  };
})();
