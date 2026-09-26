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

Word Game 1 is not in the Word file. It was added to Day 17's PM part (`s3`) by hand, under Free Communication Upskill, so re-add it to `build/days/day17.js` after re-running `convert.py`.
