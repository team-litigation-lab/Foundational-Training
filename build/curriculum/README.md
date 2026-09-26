# Importing the curriculum

Days 2–18 and the admin **📘 Curriculum** copy are generated from the *Training Guide for LSH Trainees (Revised – 18-Day Foundational Training Program)* Word file. Don't commit the Word file.

1. Unzip the `.docx` into a temporary folder outside the repo (e.g. `/tmp/guide`).
2. Run:
   ```
   python3 build/curriculum/parse.py /tmp/guide
   python3 build/curriculum/convert.py /tmp/guide .
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
- **Material for trainees:** when a note says to *send / share / post / give / provide* something in the GC, only that instruction line is trainer-only. The material it introduces is shown to trainees.
- **Log-in credentials** (Username/Password lines) are replaced by a link to the credentials document. The run stops if any would still be written.
- **Not published:** the Nitro Pro installer and its install-video links.

Day 1 was built by hand from the same guide and is kept as it is.

Changed by hand after the import, so redo these after re-running `convert.py`:
- **Trainee pages carry only the Canva training decks and the trainees' tasks.** Discussion material (AI Assisted Discussion links, digital handouts, discussion process questions) and reference material (sample SOPs, sample recordings and documents, additional resources, optional shadowing videos) were taken off the trainee pages. They stay in the admin 📘 Curriculum copy. The same was done by hand on Day 1 (its breakout handouts part was folded into the discussion). Day 9's and Day 18's "additional resources" parts were removed and their Free Communication Upskill line moved to the part before.
- Day 2 `s3`: the Law Firm Communication Canva deck, at the top of the part.
- Day 5 `s2`: the Calendar Management Training Canva deck, at the top of the part.
- Day 7 `s1`: the Intake Specialist Role Canva deck, at the top of the part.
- Day 13 `s2`: the Medical Records Specialist Role Canva deck, at the top of the part.
- Day 17 `s3`: the Lien Negotiator Role Canva deck at the top of the part, and Word Game 1 under Free Communication Upskill.
