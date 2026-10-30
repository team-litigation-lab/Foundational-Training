# Importing the curriculum

Days 2–18 and the admin **📘 Curriculum** copy are generated from the *Training Guide for LSH Trainees (Revised – 18-Day Foundational Training Program)* Word file. Don't commit the Word file.

1. Unzip the `.docx` into a temporary folder outside the repo (e.g. `/tmp/guide`).
2. Run:
   ```
   python3 build/curriculum/parse.py /tmp/guide
   python3 build/curriculum/convert.py /tmp/guide .
   node build/day-decks.cjs
   python3 build/build.py ../EA-PA-TRAINING
   ```
3. Delete the temporary folder and the Word file.

**What `convert.py` does:**
- **Output:** writes `build/days/day02.js`–`day18.js`, the facilitator content in `trainer/notes.json`, the full guide in `trainer/curriculum.json`, and the screenshots. Public screenshots go in `ft/dayN/img/`; screenshots that belong to facilitator content go in the trainer-only `trainer/img/`.
- **Slides:** one slide per agenda item: the numbered AM/PM/Entire Day/Homework items, "Topic:", and the recorded-demonstration headings.
- **Trainer only:**
  - facilitator's notes, facilitator's guides and references
  - facilitator deck links
  - answer keys, and tables with "Correct Answer"/"Ideal Answer"
- **Material for trainees:** when a note says to *send / share / post / give / provide* something in the GC, only that instruction line is trainer-only. The material it introduces is shown to trainees. Only up to the next numbered note, though: from there the notes are the facilitator's again (Day 16: after "1. Share a sample … and provide this instruction:" the instruction is the trainees', but "2. Ensure the sequence of tasks is rearranged…", the LV Demo Tasks, the templates folder and "3. DM the LV Letter…" are the trainer's).
- **Log-in credentials** (Username/Password lines) are replaced by a link to the credentials document. The run stops if any would still be written.
  **No log-in credential is ever on the platform**, in any file: `.github/scripts/check-site.mjs` fails CI on every push if a `Username:` / `Password:` line with a value is in a `.js`, `.json`, `.html` or `.md` file, hand edits included. Link the credentials document instead.
- **Wording corrections** to the guide (typos, the shadowing videos' dates written MM/DD/YYYY, an empty instruction line dropped) are `TEXT_FIXES` in `convert.py`, applied to every output, so a re-import keeps them.
- **Builder notes are taken out:** instructions in the guide for building the platform, not for the trainees ("Embed this", "Link instead of embed", "Divide the Start Training Button…", the Part 1/Part 2 splits, "Claude to come up with…", "Focus in Automation // Calendar Simulator", the "Act as a senior LMS engineer…" block, "This needs to be replicated… 5 Scenarios"), from the trainee pages, the facilitator notes and the admin copy. A note in brackets goes with its brackets; otherwise from the note to the end of the line; a line that was only a note goes; the "Act as…" prompt goes with everything under it, to the next heading, row of stars, numbered part or facilitator's note. The patterns are `builder-notes.json` (`builder_notes.py`); the run stops if one would still be written, and `.github/scripts/builder-notes.cjs` fails the checks if one is on the site. A new kind of builder note: add its pattern there.
- **Corrections:** the guide's "HICF" is written HCFA (the bill form), `FIXES` in `convert.py`. Day 8's GC reminder ("your reference is the video Topic 3: Task 1 / Topic 3: Task 2") names the topic it means, Intake Documents (MVA Cases), since the guide has no Topic 3. "UAIG" is right as it is (United Automobile Insurance Group).
- **Not published:** the Nitro Pro installer and its install-video links.
- **Resource links are embedded:** Drive files and folders, Google Docs, Sheets and Slides, Canva decks, Loom and YouTube become pop-out-viewer links (`class="viewer-link"`), so they open on the platform instead of a new tab. A Doc, Sheet or deck is `data-kind="doc"`; Loom and YouTube are `video`. Third-party tools the trainee has to go and use (the typing and spelling tests, iLovePDF, the WinRAR download, the NPI registries, the HIPAA course, the Smart Advocate knowledge base) and the credentials document stay ordinary new-tab links. The list is `EMBEDDABLE` in `convert.py`; its other half is `lvEmbedUrl` in `js/ft-updates.js` — keep the two in step.

Day 1 was built by hand from the same guide and is kept as it is.

Changed by hand after the import, so redo these after re-running `convert.py`:
- **Trainee pages carry only the Canva training decks and the trainees' tasks.** Discussion material (AI Assisted Discussion links, digital handouts, discussion process questions) and reference material (sample SOPs, sample recordings and documents, additional resources, optional shadowing videos) were taken off the trainee pages. They stay in the admin 📘 Curriculum copy. The same was done by hand on Day 1 (its breakout handouts part was folded into the discussion). Day 9's and Day 18's "additional resources" parts were removed and their Free Communication Upskill line moved to the part before.
- Day 2 `s3`: the Law Firm Communication Canva deck, at the top of the part.
- Day 5 `s2`: the Calendar Management Training Canva deck, at the top of the part.
- Day 7 `s1`: the Intake Specialist Role Canva deck, at the top of the part.
- Day 13 `s2`: the Medical Records Specialist Role Canva deck, at the top of the part.
- Day 7 `s1`: GEICO in capitals in the Common Insurance Providers table.
- Day 8 `s1`: Topic 1 (Intake Process) updates monitoring item #15; Atty. Sandy Van's Intake Calling (MVC) video ends with "Task 2 - Update item #14 in your monitoring sheet." (the curriculum's numbers). Also in `build/day-decks.cjs` (Day 8's Topic 1 rule).
- Day 10 `s1`: the two VA Call Recordings folders, each its own link with its own title.
- Day 12 `s1`: the 3P line under the LOR naming convention ("3P LOR with an affidavit: … LOR with Affidavit mm.dd.yy (VA's name)").
- Day 14: under "Naming convention for NPIM doctors", the line saying the lien holder (JML) still comes first.
- Day 16 `s2`: the Filevine recorded demos (Sending MedLOR, Sending Lien Balance Verification) taken off; the firm works in SmartAdvocate, so only the SA demo stays.
- Day 17 `s3`: the Lien Negotiator Role Canva deck at the top of the part, and Word Game 1 under Free Communication Upskill.

**Decks rebuilt on the platform:** a Canva deck listed in `NATIVE_DECKS` in `convert.py` (by its design id) is linked as a button that opens its lesson on the platform, instead of the Canva link. The Receptionist Training deck opens Lesson 4.
