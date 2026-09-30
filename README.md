# LSH Standard Foundational Training

The training platform for the *Revised 18-Day Foundational Training Program* (Training Guide for LSH Trainees). It runs on the same engine as the EA/PA portal and the CM course:

- sign-in and approvals
- lesson slideshows
- progress saved to the trainee's account
- the admin Trainee Audit and trainer feedback
- trainee feedback and certificates
- 🖥 Presenter view and 👁 Trainee view

**🏠 Main Portal (admins):** while an admin is signed in, the top bar has **🏠 Main Portal** and the Admin screen has **← Back to Main Portal** (next to Log out). Both open the LSH Training Portal's Training Directory (`https://cm-training-activity.pages.dev/programs.html`), where admins open each program. Trainees and the 👁 Trainee view don't show them. It's `js/portal-link.js`, the same file in every LSH course repo (EA-PA-TRAINING, Case-Management-Training, propertydamageclaimstraining, Foundational-Training); change it in all of them.

Trainees see **the lessons**. Each lesson is its Canva training deck, shown full width in the platform (with Full screen). Lessons are named by their training title, not by day.

The curriculum (the Training Guide, with the day-by-day tasks, links and facilitator's notes) is for trainers and admins only, in **Admin → 📘 Curriculum**. It is not on the trainee pages.

## Lessons

| # | Lesson | On the platform |
|---|---|---|
| 📌 | Training Orientation and Rules | ✅ slides (`js/ft-rules.js`), always open, not counted |
| 1 | Virtual Assistant Essentials | ✅ deck (Open in Canva ↗) |
| 2 | Law Firm Communication | ✅ the deck's pages as slides (54, from its PDF) |
| 3 | Personal Injury Process Flow | ✅ deck |
| 4 | Receptionist Training | ✅ native slides (46, rebuilt from the deck's PDF) |
| 5 | Calendaring & Appointment Setting Training | ✅ deck |
| 6 | Intake Specialist Training | ✅ deck |
| 7 | Claims Specialist Training | ✅ native slides (119, rebuilt from the deck) |
| 8 | Medical Records Specialist Training | ✅ deck |
| 9 | Lien Negotiator Training | ✅ deck, then Word Game 1 (playable) |

Onboarding and Setting of Expectations & Tech Set-up (ids 10 and 11) are off the platform: their files are in `build/lessons/off/` (with the Day 0 screenshots still in `ft/day0/img/` and the `d0:*` trainer notes), which the build skips. To bring one back, move its file into `build/lessons/` and rebuild; it keeps its id, so saved progress doesn't shift. `DAYS` follows the file order, and a lesson's `label` / `short` replace "Lesson N of 9" and the dashboard circle's number.

Each lesson card has **▶ Video Presentation** (the lesson's `video`: its AI Assisted Discussion video from the curriculum), which plays in the pop-out viewer. Lessons are finished from their last slide (✓ Finish lesson). **Videos stay locked** (🔒 Video Presentation) until a trainer unlocks them in **Admin → 📅 Open Lessons → 🎬 Unlock Videos**, for all batches or one batch (`settings:openvideos`, same shape as `settings:opendays`). Trainers and 👁 Trainee view always see them.

### Virtual Assistant Essentials and Law Firm Communication: the decks' own pages

Lesson 1 shows the "I. Virtual Assistant Essentials" deck page by page: each page is one slide, an image in `ft/vae/slides/` rendered from the Canva PDF (the image alone: no heading above it), with the page's largest text as the slide's name in the slide list and Presenter view and its words as the alt text. Only 29 of the deck's 138 pages are in the lesson (`keep` in `image_lesson.py`): the title, Objective, Training Agenda and Introduction (1–4), Kickstart Your Legal VA Career (20), Legal Practice and Virtual Assistants with its Benefits (21–24), Overview of Tasks and Roles (25–35), Types of Law Firms (36–39), Tips to Stand Out as a Legal VA (134–137) and Thank You (138). Its topic dividers (`FT_TOPICS` in `js/ft-updates.js`) follow those sections. Lesson 2 (Law Firm Communication) is built the same way from its PDF (`python3 build/slides/image_lesson.py lfc <deck.pdf>`): all 54 pages, in `ft/lfc/slides/`, under ten topics (Objectives & Training Agenda, Inbound Calls, Outbound Calls, Client Contact, Invoice Follow-up, Provider, Adjuster, Court and Opposing Counsel Calls, Outbound Caller Best Practices). Hidden Canva slides aren't in a downloaded PDF, so they're never in a lesson. The whole slide fits on one screen: on a desktop the lesson's controls (Back to roadmap, the title, Listen, Objectives, Present full screen, Presenter view) sit in a column to the right of the slide, and `fitPages()` in `js/ft-slides.js` sizes the slide frame and the page: on the lesson page the whole page fits the screen with no scrolling (the slide, its Previous / Next bar and, about an inch below, the footer line); in full screen and the slides window the page fills the room above the bar. It runs after each render and again once the slide has slid in. To update it, download the deck from Canva as PDF and run `python3 build/slides/image_lesson.py vae <deck.pdf>` (needs `pip install pymupdf pillow`), then rebuild. Render from the PDF, not the PPTX: the PDF carries the deck's fonts, while a PPTX rendered without them spills its text out of its boxes.

### Native slides (rebuilt from a deck)

**Topic dividers.** Lessons 1, 4 and 7, the lessons rebuilt page by page, open each topic with a divider slide, as in the EA/PA and CM courses. It shows *Lesson N of 9 · the lesson*, *Topic N of M* and the topic's title. The day intro lists the topics, and Presenter view's cue names the topic and how many pages it has.
- **Where topics start:** `FT_TOPICS` in `js/ft-updates.js`, with each topic's first page by page id. Lesson 1 has 10 topics, Lesson 4 has 5 and Lesson 7 has 12.
- **Adding pages:** new pages don't move the dividers. To start a topic somewhere else, change its page id there.
- **Canva lessons:** a lesson that is one Canva deck has no dividers, because the deck has its own title page.
- **Saved places:** these are slide positions, so each trainee's "resume here" and "furthest reached" moved once to the same page when the dividers arrived. The saved objects record which lessons were moved (`_ftTopics`).

Lessons 4 and 7 are no longer Canva embeds: each deck page is its own slide in the platform, with the deck's exact wording in this program's own design (`js/ft-slides.js`: cards, numbered steps, check lists, do / don't boxes, tips, tables and zoomable document images). The deck's link is kept as the lesson's `canva` field.

1. Download the deck from Canva as `.pptx` (speaker notes included) and extract it: `build/slides/extract_pptx.py` writes `build/slides/<deck>.json` (each page's text boxes and notes). A deck downloaded as PDF works too: `build/slides/extract_pdf.py <deck.pdf> [<part 2.pdf> …] <deck>` (needs `pip install pymupdf`; a deck downloaded in parts is given in order). A PDF has no speaker notes, so its scripts' talk-through is written in `build/slides/<deck>_script.py` and the walk-through is the slide's own points.
2. `python3 build/slides/make_lesson.py <deck>` writes `build/lessons/lessonNN.js`. Each page's layout is set in `make_lesson.py`; exact repeats of a page are kept once.
3. `python3 build/slides/make_scripts.py <deck>` writes that lesson's Presenter view scripts into `trainer/scripts.json` (see *How the program works*). The beats the notes don't have (the why, the question for the room, scenarios) are in `build/slides/<deck>_script.py`.
4. Rebuild.

Document images are in `ft/claims/img/`, the Receptionist deck's photos in `ft/receptionist/img/`. The Rental Claims Services slide follows the revised deck page (`Claims_Specialist (8).pptx`, slide 1): the title on the rental-keys photo with the LSH logo, beside the letter in an orange frame (`cover()` in `make_lesson.py`, `.cs-cover` in `js/ft-slides.js`; the photo and logo are `ft/claims/img/rental-keys.jpg` and `lsh-logo.png`). Real client documents (the rental claims letter and rental agreement) are in `trainer/img/claims/`, which only a signed-in trainer can load; trainees see "🔒 A real document example: your trainer shows it during the session." in their place.

A lesson without its deck shows on the dashboard as *Coming soon* and can't be opened by trainees. To add one, put its Canva view link in `build/lessons/lessonNN.js` (same shape as the others) and rebuild.

## Training Orientation and Rules

**Training Orientation and Rules** is a separate slide presentation, beside Virtual Assistant Essentials. Its card is first in the lessons row, marked 📌 Start here, and it opens as a lesson (`#/day/12`). The trainer can run it in 🖥 Presenter view and the slides window like the other lessons. It's all in `js/ft-rules.js`.

- **It isn't one of the program's 9 lessons.**
  - It's always open, for every trainee and batch.
  - It doesn't count toward "Lessons finished", the certificate or the admin stats.
  - It isn't in `DAYS`. `DAYS.find` and `DAYS.some` also look at it (by id, `ORIENT_ID` = 12), so the lesson view, Presenter view, routes and names find it, while `DAYS.length`, `map` and `filter` still see the 9 lessons.
- **The slides:**
  1. Why this matters: training is a simulation of the real world; weekly score audits; offboarding if coaching and feedback don't show progress; the goal is a Generalist Legal VA (familiar with every role, so they can take on other tasks confidently from the start of their role; mastery follows in the role).
  2. Rules: your schedule. Tracking 8:00 AM – 5:00 PM PST; time management (log in and out on time, no extra time; a 10-minute early buffer only with Matt's approval); breaks 15 – 30 – 15 or one full hour.
  3. Rules: communication. The 5-minute response rule; acknowledge the trainer's Discord messages; meeting schedules sent on the discussion's date and time; cameras on.
  4. Rules: your work. Naming conventions followed strictly; use of AI (grammar and spelling only; never client, case or medical information).
  5. Rules: your Training Monitoring Sheet. The rule ("As soon as you are done with all the tasks, kindly download your monitoring sheet below and upload it to your respective trainees' folder."), with the sheet embedded in full and a link to fill it in on the platform.
  6. Free Skills Training: every day after the shift, ideally 5:00 – 6:00 PM PST (can run longer); unpaid and untracked (an initiative of the training team, beyond the standard legal VA training); soft skills, especially communication; if you miss it, ask for the materials and review them at your own pace.
  7. Auxes: `!in` / `!back` in #⏳-timestamps and `In` in #batch-group-channel; no double stamping; the Discord profile status format.
  8. Check #training-reminders: the channel's screenshots (Deliverables and Important Reminders, the welcome post, the channel).
  9. Building your daily habits: the EOD email and the trackers, with the guide's links. The templates are *coming soon*.
  10. The Daily Task Tracker, part 1: the status counts, the sections and every column.
  11. The Daily Task Tracker, part 2: the other tabs and the daily check.
  12. The Daily Task Tracker, part 3: the guide's filled-in sample (Sample updated trackers), embedded in full.
  13. Typing and spelling tests: the client expects 60 WPM; links, samples and file names.
  14. Hubstaff To-Dos, part 1: why they matter, the steps and the picture of the to-do list.
  15. Hubstaff To-Dos, part 2: the 22 To-Dos, each with 📋 Copy (the name without "To-Do:"), and the shadowing template.
  16. How to create notes in Hubstaff, with the Add Work Notes picture.
  17. The Manual Time Adjustment Request: subject, To and CC to copy.
  18. Day 1's Reading Task: the reading, the 6 questions and the file name with the trainee's name.
- **How the slides work:**
  - A slide's HTML is built when it's shown, so the file name has the trainee's name and the Copy buttons work.
  - The Hubstaff pictures are SVG, drawn after the trainer's screenshots.
  - The text lives in the constants at the top of `js/ft-rules.js` and in `SLIDES`. If the tracker's columns change in `js/ft-tracker.js`, update `TRACKER_PARTS`.

## 🧭 Platform Orientation and the Blueprint PDF

Admins have **🧭 Orientation** in the top bar (`#/orientation`), as on the EA/PA portal and the other LSH courses. It's a screen-shareable blueprint of the platform for the first session. It's not the 📌 Training Orientation and Rules lesson above.

- **The page:** 12 slides with ← → (or the arrow keys), **⛶ Present full screen**, **🖨 Print** and **⬇ Download PDF** (`LSH_FT_Platform_Orientation.pdf`). Nothing private is on it: no facilitator's notes, answers or trainee data. Trainees and 👁 Trainee view don't see it.
- **The slides** (`js/ft-orientation.js`): welcome; the roadmap (📌 and the lessons, read from `DAYS`); how a lesson works; classroom discussions; the dashboard; getting around (the trainee top bar); daily habits; simulators; activities and feedback; the certificate; ground rules; let's begin. If a trainee-facing feature changes, update its slide.
- **The Blueprint PDF** (`/blueprint.pdf`): the same slides as a PDF, for anyone to open or share. When the build changes, the first admin to open the portal rebuilds and publishes it in the background (`blueprint:pdf`, `blueprint:meta`). The Orientation page shows the published build, with **open** and **rebuild** links. It's the EA/PA engine's feature; this program only supplies the slides.

## Process Questions

Each lesson's answer sheet is answered on the platform: **✍️ Process Questions** (`#/process`, `js/ft-process.js`). It opens from the lesson card and from the lesson's last slide, which lists the questions and the naming convention. The Virtual Assistant Essentials sheet has 10 questions. Add another lesson's questions to `PROCESS_SETS`.

- **Answering:** trainees answer each question; the answers save as they type (`process:<id>`, the trainee's own). **Submit My Answers** marks the sheet submitted.
- **Saving to Google Drive with the proper name** (e.g. `VA_Essentials_Process_Question_Answers (Jamie)`, with the trainee's first name):
  - **📄 Save to My Google Drive** copies the answers and opens a new Google Doc already given that name, in the trainee's folder once they've saved its link (**📁 My Trainee Folder**). They paste the answers in with Ctrl+V.
  - **⬇ Download as Word** gives a .doc with that name, to upload to the trainee folder.
- **Admin → ✍️ Process Questions** lists batch → trainee → each answer sheet (submitted or not, how many answered, the answers), with the line for the ranking report, in the facilitator's words. For example: "Process Questions Responses: COMPLETE; however, Item #7 under the Virtual Assistant Essentials answer sheet was left unanswered." or "Out of N expected answer sheets, X were submitted. The following answer sheets are missing: …".

## Training Monitoring Sheet

Trainees fill in their **Training Monitoring Sheet** on the platform: **📒 Monitoring Sheet** in the top bar (`#/monitoring`, `js/ft-monitoring.js`).

- **Like the Word sheet**, which is embedded in full at the top of the page (Drive preview, with Download ↗): one entry per classroom discussion, each with:
  - the date;
  - 5 Major Takeaways From This Discussion;
  - 3 Questions That You Still Have;
  - Rate Your Understanding (the sheet's 4 statements).
- **Saving and status:** it saves to the trainee's account as they type (`monitor:<id>`, the trainee's own). An entry is *Filled* when the date, all 5 takeaways and the rating are in. The dashboard shows how many are filled.
- **The orientation's Rules: Your Training Monitoring Sheet slide** has the rule ("As soon as you are done with all the tasks, kindly download your monitoring sheet below and upload it to your respective trainees' folder"), with the sheet embedded in full and a link to fill it in here.
- **Admin → 📒 Monitoring Sheets** shows batch → trainee → discussion, with the **automated feedback**:
  - It comes from the **📏 Feedback Rubric**, not AI. The starting metrics: the date filled in; all 5 takeaways; complete sentences; specific, not general (not "I learned about …"); based on the discussion (the takeaways mention a set share of the discussion's key points, 50% to start); and the understanding rating.
  - Each discussion shows its checks, a score, the feedback to copy, and what the trainee wrote. "Needs extra help" marks the entries rated "I really don't get this".
  - **📏 Feedback Rubric:** trainers keep improving the metrics.
    - Switch a metric on or off, and change its settings, its weight in the score and its feedback line (`{which}`, `{count}`, `{min}`, `{missing}`, `{found}` and `{sentences}` are filled in).
    - Add metrics: avoid these words, mention at least one of these, a minimum number of words per takeaway, or questions filled in.
    - Each save is a new version, and every review uses it from then on ("rubric vN" shows on each review). The last 30 versions are kept and can be restored.
    - Stored in `monadmin:rubric` (trainers only); the metric types are `MON_TYPES` in `js/ft-monitoring.js`.
- **Discussions and Key Points** (in the same tab): one discussion per line, with its key points after a "|".
  - Stored in `settings:monitor`, which everyone reads and trainers write.
  - Until it's set, the list is the 18 classroom discussions from the Hubstaff To-Dos.

## Daily Task Tracker

Each trainee has an **LSH Daily Task Tracker** on the platform (📋 Task Tracker in the top bar), laid out like the Google Sheets sample: the status counts, Date Received, Type of Task, Task Details, Accountable VA, the dated **Daily Notes** columns, VA Notes, Deadline, Status and Actual Completion Date, with the For Completion / Recurring / Completed sections and the Client-VA Specific Tasks Index, Links & Access (no passwords), Directory and Time Zone tabs. It saves to the trainee's account as they type (`tracker:<id>`).

- **The daily check** runs on the Worker's cron (`wrangler.json`, 02:00 UTC: 7 PM Pacific daylight time, 6 PM in winter) for every approved trainee, and live on the page while the trainee types. The result is a ✅/❌ per rule, the day's %, and every flagged cell (red on the sheet). Rule for now: every open task has a Daily Note for the day. Rules live in `js/ft-tracker-rules.js`, shared by the page and the Worker; add one to `RULES` to extend the check.
- **Notes review:** the Worker also writes a short review of the day's notes against the criteria in **Admin → 📋 Task Trackers** (`settings:trackercriteria`). It uses the Gemini key pool (`GEMINI_API_KEY5` … `GEMINI_API_KEY9`); trainees see it as "Notes review".
- **Trainer's comment:** in Admin → 📋 Task Trackers, open a trainee's day, write a comment, and the trainee sees it under the check. Results and comments are in `trackerreview:<id>`, which trainees can read but not change.
- **Admin → 📋 Task Trackers** is laid out batch → trainee → record: a collapsible 📁 section per batch (today's average and how many need attention), one compact row per trainee (open and completed tasks, the last five training days, 5-day average), and, when you click a trainee, every daily record on file (the check %, flags and your comment, each opening that day). Archived trainees are listed under **📦 Archived batches**; only active trainees' trackers are loaded, and an archived trainee's records load when you open them.

## Attendance

Trainers take each day's attendance in **Admin → 🕘 Attendance** (`js/attendance.js`). Trainees don't see it. It's the same file in every LSH course repo (EA-PA-TRAINING, Case-Management-Training, propertydamageclaimstraining, Foundational-Training); change it in all of them. The LSH Training Portal's admin **🕘 Attendance** page shows and edits the same records, for every program.

- **By batch:** one section per batch (newest first, like the other admin tabs), listing its approved, active trainees. Each section shows its count of every status.
- **The day:** the date is today's in Eastern time (EST, or EDT in summer; attendance only, the Task Tracker keeps Pacific time). ◀ ▶ step through the training days, and the date picker opens any day. The batch's **Day N** counts its days already logged; the trainer can change it.
- **Each trainee's row:**
  - **Name**, from their trainee record.
  - **Training**: the batch's training for the day. It starts as the batch's latest open lesson (Admin → 📅 Open Lessons), or the orientation when none is open. It can be changed for the batch, or for one trainee (marked in orange). The list is the lessons, after the orientation and the first days that are off the platform (`ATTENDANCE_TRAININGS_BEFORE` in `js/ft-updates.js`).
  - **Time In / Time Out**, in Eastern time (EST, or EDT in summer): typed, or ⏱ Now. **Time In fills in on its own:** the first time a trainee opens the course each day, the Worker records it (`/api/checkin`). The tab shows it marked "auto" until a trainer sets one, and it's saved into the day's attendance when a trainer tags that trainee. Trainers always tag the status.
  - **Status**, tagged by the trainer from the attendance sheet's dropdown, in its colors: Present, Late, Late with Notif, Early Out - POC Approved, Undertime - POC Approved, Undertime - No Approval, NCNS, Sick Leave, RL, EOP, Absent with Notif. **✓ Mark the rest Present** tags everyone not yet tagged.
  - **Notes**.
- **Saving:** each change saves as you go. A save re-reads the day and writes only the rows changed on that screen, so two trainers can take one batch's attendance at the same time.
- **📊 Summary** (per batch): each trainee's count of every status over all the batch's logged days, with the last 10 days as colored squares.
- **⬇ CSV**, which opens in Excel or Google Sheets: **This day** (every batch) or **Download all days** (one batch, from its summary). The columns: Date, Day, Batch, Name, Training, Time In (EST), Time Out (EST), Status, Notes.
- **Google Sheet:** the LSH Training Portal keeps the attendance Google Sheet's **Platform Attendance** tab in step, both ways: everything here (automatic Time Ins included) goes to the sheet every 15 minutes, and edits made in the sheet to Training, Time In, Time Out, Status or Notes come back here straight away. See the Training Portal's README.
- **Storage:** `attendance:<batch key>:<YYYY-MM-DD>` (`_none` for trainees with no batch) = `{batch, date, day, training, rows:{<trainee id>:{name, training, timeIn, timeOut, status, note, at, by}}}`. `checkin:<YYYY-MM-DD>:<trainee id>` = `{timeIn, at, name, batch, training}` is the automatic Time In (each trainee's own key, so a room signing in at once never overwrites one another; its KV metadata carries the same for the portal; kept 40 days). The Worker lets only admins read and write these records. To change the statuses or their colors, edit `STATUSES`.

## Simulators

**🛠 Simulators** (top bar, and the **Simulators** card on the dashboard, like the Training Portal's) opens `#/simulators` (`js/ft-simulators.js`).

**Mock calls and demos.** There is one card for each mock call and demo in the Training Guide, using the guide's name for it. Each card's examples are the training CMS's **Training Library** cases: MC-01 … MC-20, the fictional PI files in `CaseManagementTraining/mock-cases.js`. A case opens in the CMS with `?program=…&mock=MC-xx`, view only; **Work on a practice copy** makes it editable.

| Activity | Lesson | Example cases | Also |
|---|---|---|---|
| Reception Mock Calls | Receptionist Training | MC-01, MC-06, MC-10, MC-16 | Front Desk Drill (scored calls on these cases), Training Library, Call Simulator (7 reception calls) |
| Calendar Management Mock Calls | Calendaring & Appointment Setting | MC-01, MC-05, MC-08 | Calendaring, Call Simulator (4 calendar calls) |
| Intake Mock Calls | Intake Specialist | MC-02, MC-13, MC-12, MC-19 | Call Simulator (3 intake calls) |
| Saving Intake Packet and Extracted Intake Documents Demo | Intake Specialist | MC-02, MC-13 | Training Library |
| LOR Uploading and Sending Demo (1P & 3P) | Claims Specialist | MC-01, MC-02, MC-12 | Training Library |
| Sending MedLOR and Requesting Medical Bills & Records Demo | Medical Records Specialist | MC-01, MC-15, MC-08 | Training Library |
| LV (Lien Verification) Request Demo | Medical Records Specialist | MC-09, MC-15, MC-05 | Training Library |
| Reduction Request, Settlement Release Forms and Closing Statement Demo | Lien Negotiator | MC-11, MC-06 | Training Library |

Each case's one-line description is taken from `mock-cases.js`. If a case changes there, update its line in `ACTIVITIES`.

**All simulators.** Every live simulator on the LSH Training Portal: Call, Calendaring, Email Workspace, Email Replies, Docket System, Medical Records Requests and Court E-Filing. These are open any time, and the section links to the portal's Simulators hub.

**How the tools open**
- **Open here** runs the tool in a full-window panel (✕ Close or Esc returns to the page). **New tab ↗** opens it in its own tab.
- For trainees, a mock call or demo card opens with its lesson (Admin → 📅 Open Lessons). Trainers see every card.
- Portal simulators get `program=FT` with the trainee's name and batch, so scores are saved for the trainer.
- The **Call Simulator** has a Foundational pack of 14 calls on the same CMS cases (Training Portal, `simulators/call-pack-ft.js`). Each mock call card opens it on that card's calls (`&line=Reception Mock Calls`, etc.). A call's brief shows the case file with a link to open it in the CMS, and after the call the trainee writes the note it requires.

## Activities and the facilitator's feedback style

`js/ft-activities.js` (wired in like the Tracker and Simulators, no edits to the generated page):

- **📝 Activities** (top bar): trainers add activities for each program day (**Admin → 📝 Activities → Set activities**, Day 0 to Day 18). Each activity has:
  - a title and instructions (paste from your document; `**bold**`, `- ` bullets and links work);
  - attached files (up to 4 MB each);
  - how trainees answer (written, file upload or both);
  - private notes on what a strong answer includes;
  - **Visible to trainees** and an optional **Batch** (empty = all batches).

  Trainees see the visible activities for their batch, newest day first, answer (drafts autosave), attach a file and submit.
- **Review submissions:** ✨ Draft with AI writes a review from the private notes; the trainer edits it and sends it. The trainee gets a badge on 📝 Activities and reads it on the activity page. Resubmitting keeps the earlier feedback and waits for a new review.
- **Scored rubrics** (optional, per activity, private): in the activity form, open **📊 Scored rubric** and paste the rubric table from Word/Docs (or upload it as .txt/.tsv): one row per criterion, then what earns 5, 4, 3, 2 and 1 points. Add one **graded example**, an evaluation you wrote (Criteria · Score · Evaluation), with the trainee's name removed. From then on, ✨ Draft with AI scores every submission for that activity criterion by criterion, the way the example does: a score out of 5 and a 2–4 sentence evaluation in the facilitator's style (specific facts from the answer, exact omissions, quoted typos). The review shows each criterion's score and evaluation to edit, with the **Total Score** and **Final Rating** (total ÷ number of criteria) recalculated; the trainee sees the same table. Stored in `actadmin:scoring` (trainer-only).
- **The facilitator's DNA** (`js/ft-facilitator-dna.js`) is the default voice of every AI reviewer: activity drafts, trainer review drafts, graded exercises, and the Worker's nightly Task Tracker notes review.
  - It was written from the facilitator's own evaluations (the B082826 Week 1–3 ranking reports and a Scheduling Activity Review).
  - Its main rules: open with a verdict label ("Good, with Improvements Needed.", "Needs Improvement."…); give the strength with exact counts, items, dates and times; then "However, improvement is needed in …" with the specific components; grade the severity; and tie the fix to its purpose.
  - It keeps no trainee names; its examples are generic.
  - It's used until a trainer saves another voice in 🗣 Feedback Style (saved with `v2`: edited, learned, restored or switched off). **🧬 Go back to the facilitator's DNA** restores it. The page (`fbEffective`) and the Worker (`facilitatorVoice`) resolve the voice the same way.
- **Admin → 🗣 Feedback Style** learns how the facilitator writes feedback:
  - **Import** takes the reviews the trainer wrote or edited (trainer reviews and activity reviews). More examples can be pasted, or uploaded as .docx / .xlsx reports or .txt files. Each feedback passage in a Word table or Excel cell becomes an example; JSZip from cdnjs opens the files.
  - **Learn the style** makes a style guide plus generic voice examples, which can be edited or switched off.
  - While it's on, AI feedback is written in that voice: activity drafts, trainer review drafts, graded exercises, and the Worker's nightly **Task Tracker notes review** (`facilitatorVoice` in `worker.js`). Ratings, scores and the tracker check itself don't change.

Storage (`ft:` prefix, rules in `worker.js`):
- Trainers publish, everyone reads: `activities:dayN`, `actfile:*`, `settings:feedback-style`.
- Each trainee's own: `actsub:<trainee>` and `actup:<trainee>:*`. The Monitoring Sheet: `monitor:<trainee>`; its discussions: `settings:monitor` (trainers write, everyone reads). Trainees can't write the trainer's feedback.
- Trainer-only: `actadmin:rubrics`, `admin:fbstyle-samples`.

## How the program works

- **Lessons open when the trainer opens them.** In **Admin → 📅 Open Lessons**, a trainer ticks the lessons that are open, either for **All batches** or for one batch. Trainees only see open lessons. The setting is stored as `settings:opendays` (the engine calls lessons "days" internally).
- **No quizzes.** A lesson's last slide has **✓ Finish lesson**. When every lesson is finished, the certificate unlocks. The assessments will be added as built-in Practice Labs, with the same content as their documents.
- **Facilitator's notes are trainer-only.** They're not in the page:
  - They live in `trainer/notes.json`, which `worker.js` sends only with a trainer (admin) token.
  - Trainers see them in Admin → 📘 Curriculum, where the guide has them. (The lessons don't carry any.)
  - They never show in 👁 Trainee view or in the slides window shared with the room.
- **Presenter view scripts** follow the EA/PA format. Each lesson's deck gets a page-by-page script in the notes panel:
  - **← Page / Page →** step through the deck's pages alongside it.
  - Each page has *On this page* and a **🎙 Script — read aloud** in four beats: ① The why, ② Talk it through, ③ Walk through it, ④ Ask the room (④ Your turn on the last page).
  - The last page adds a 🎬 Scenario, and the part's facilitator's notes follow as the *Trainer note*.
  - Scripts live in `trainer/scripts.json`, which is trainer-only like the notes: `{"<lesson id>": {"pages": [{"title", "on", "why", "talk", "walk": [...], "ask", "scenario"}]}}`.
  - A deck without a script shows "The page-by-page script for this deck isn't written yet."
  - A lesson with native slides has one script per slide instead, under `"sections"`: `{"<lesson id>": {"sections": {"<section id>": {"on", "why", "talk", "walk": [...], "ask", "scenario"}}}}`. ② and ③ are the deck's speaker notes word for word (headings in bold, points as bullets); they're generated by `build/slides/make_scripts.py`.
- **The deck stays live in the slides window.** Resizing it, full screen (Canva's own button, ⛶ Full screen or a double-click) and a reconnecting presenter don't reload the deck or send it back to page 1, and ← → pressed in the slides window turn the deck's pages. The console's live copy shows a note instead of a second deck, since it can't follow the room's page. These engine edits are in `build/ft_engine_patches.py`, which the build applies to `js/eapa-updates.js`.
- **Admin → 📘 Curriculum** shows the whole Training Guide (Day 0 to Day 18), facilitator content included. It comes from `trainer/curriculum.json`, which is trainer-only like the notes. Screenshots that belong to facilitator content are in `trainer/img/` and are trainer-only too. Images can't send the sign-in header, so the page also keeps the trainer's token in a cookie limited to `/trainer`.
- **Log-in credentials are never on the platform.** Wherever the guide lists a username or password, trainers get a link to the credentials document instead. The import stops if any credential would be written.
- **Drive files** open in a draggable pop-out viewer, the same one as the LSH Training Portal's Recorded Lectures. Videos ask "Do you want to watch…?" first.

## Files

| Path | What it is |
|---|---|
| `index.html` | **Generated** by `build/build.py` from the EA/PA portal. Don't edit it by hand. |
| `js/eapa-updates.js` | **Generated**: the EA/PA update pack (Presenter view, Trainee view, slide layout), rebranded. |
| `js/ft-updates.js` | This program's layer: section slides, trainer-only notes, open days, Finish Day, dashboard, pop-out viewer. |
| `build/build.py` | The build (see below). |
| `build/ft_engine_patches.py` | This program's edits to the EA/PA engine (`js/eapa-updates.js`): the Canva deck in the slides window. |
| `build/lessons/lessonNN.js` | Each lesson: its Canva deck (one slide per section). This is what trainees see. |
| `js/ft-slides.js`, `build/slides/` | The design for native slides, and the tools that rebuild a deck as native slides with its scripts. In full screen and the slides window, a native slide (and an orientation slide) fills the screen: no width cap, no presenter column, and the text scales with the screen. |
| `build/days/dayNN.js` | The curriculum's days as HTML, kept for reference; not built into the trainee pages. |
| `ft/dayN/img/` | The curriculum's screenshots for day N. |
| `ft/day17/word-game-1.html` | Day 17's Word Game 1 from the Lien Negotiator Training deck, playable: the slide's grid, rules and 4-minute timer, with scoring, a Present mode for the room, and an answer key. It sits in the PM part, under Free Communication Upskill. |
| `trainer/notes.json` | The facilitator's notes, keyed `"<day>:<slot>"`. |
| `trainer/curriculum.json`, `trainer/img/` | The admin copy of the whole guide, and the facilitator-only screenshots. |
| `build/curriculum/` | Imports Days 2–18 from the guide's Word file. |
| `js/ft-process.js` | Process Questions: each lesson's answer sheet, answered on the platform, saved to Google Drive or Word with the proper name; Admin → ✍️ Process Questions. |
| `js/ft-monitoring.js` | The Training Monitoring Sheet: trainees fill it in (📒 Monitoring Sheet); Admin → 📒 Monitoring Sheets shows each entry with automated, rule-based feedback. |
| `js/ft-rules.js` | Training Orientation and Rules: a slide presentation beside Virtual Assistant Essentials (always open, not counted as a lesson). |
| `js/ft-orientation.js` | Admin → 🧭 Orientation: this program's platform orientation slides, which are also the Blueprint PDF (`/blueprint.pdf`). |
| `js/ft-simulators.js` | The 🛠 Simulators page: the guide's mock calls and demos, with their practice tools. |
| `js/ft-activities.js` | 📝 Activities (trainee tab, Admin → 📝 Activities) and Admin → 🗣 Feedback Style. |
| `js/ft-tracker.js`, `js/ft-tracker-rules.js` | The Daily Task Tracker (the sheet, the check panel, Admin → 📋 Task Trackers) and its rules, which the Worker's daily check uses too. |
| `js/attendance.js` | Admin → 🕘 Attendance (the same file in every LSH course): each batch's daily attendance (name, training, day and date, time in and out, the trainer's status tag, notes), with a per-batch summary and CSV downloads. |
| `worker.js` | Cloudflare Worker: the EA/PA/CM Worker with an `ft:` storage prefix, plus the `/trainer/` gate. |

## Build

The platform is rebuilt from the EA/PA portal (the `EA-PA-TRAINING` repository), like the CM course:

```
python3 build/build.py ../EA-PA-TRAINING
```

The script:
- swaps the EA/PA days for this program's lessons from `build/lessons/`: it drops the EA/PA day files (`js/days/dayN/lessons.js`, `notes.js`, `scripts.js`) and puts the lessons where the EA/PA page builds `DAYS`
- switches off what only fits the EA/PA days: the divider slide before each topic (`noDividers`), and the saved-place migrations keyed to EA/PA topic titles (`DAY_LAYOUTS`, `QC_OPTION_MOVES` are left empty)
- drops the EA/PA-only heavy content
- applies the branding
- adds `js/ft-updates.js`

Every edit checks that its anchor exists, so the build stops with an error if the EA/PA portal changed that part. Update the anchor in `build.py` and run it again. Rebuild when EA/PA ships new engine features.

## Adding a day

1. Create `build/days/dayNN.js` (e.g. `day02.js`) like `day01.js`: `id`, `title`, `heading` (as the curriculum writes it) and `sections`, one per curriculum section, each `{id, h, html}`.
   - Use the curriculum's wording as it is.
   - Put its screenshots in `ft/dayN/img/`.
   - Drive files: `<a class="viewer-link" data-kind="doc|video" data-title="…" href="…">`.
   - Canva: a `.canva-frame` embed with the design's `/view?embed` link.
2. Put facilitator-only content in `trainer/notes.json` under `"N:<slot>"`, and mark its place in the section with `<div class="trainer-slot" data-slot="N:<slot>"></div>`.
3. Run the build, then open the day for a batch in Admin → 📅 Open Days.

## Deploy

- Cloudflare Worker with static assets (`wrangler.json`), using the shared `LSH_KV` namespace. Records are stored under the `ft:` prefix, so they don't mix with the EA/PA (no prefix) or CM (`cm:`) records.
- **PR previews** (Cloudflare runs `wrangler preview` for non-production branches) use their own KV namespace, `LSH_KV2` (`previews` in `wrangler.json`), so testing a PR never touches live trainee data. Cron triggers don't run on previews.
- `.assetsignore` keeps the Worker, config, build files and Markdown out of the served files.
- Secrets:
  - `ADMIN_PASSPHRASE`: trainer sign-in. It turns on secure mode, which the trainer-only notes need.
  - `SESSION_SECRET` (optional)
  - `GEMINI_API_KEY5` … `GEMINI_API_KEY9`: the Gemini key pool behind every AI feature (live chat, grading, the tracker's notes review, trainer tools). Each request starts on the next key in turn, so the load is spread across all of them; a key that hits its limit rests (a minute for a per-minute limit, an hour for a daily one) and the next key takes over. Create each key in its **own** Google Cloud project: keys in the same project share one quota. `/version` shows which pool keys are set.
  - `GEMINI_API_KEY`, `GEMINI_API_KEY1`, `GEMINI_API_KEY2` (optional): used only after every pool key.
