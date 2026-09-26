#!/usr/bin/env python3
"""Builds the Foundational Training platform from the EA/PA portal + the curriculum days.

Usage:  python3 build/build.py <path to EA-PA-TRAINING>

Writes index.html and js/eapa-updates.js here. The platform runs on the EA/PA
portal's engine (sign-in and approvals, day slideshows, progress, admin,
feedback, certificates, Presenter view, Trainee view), like the CM course.
This program's own rules live in js/ft-updates.js, which loads last.
Every edit checks that its anchor exists, so the build stops with an error
if the EA/PA portal changed that part: update the anchor here and run it again.
"""
import os, re, sys, datetime

B = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(B)
if len(sys.argv) != 2:
    sys.exit("usage: python3 build/build.py <path to EA-PA-TRAINING>")
SRC_DIR = sys.argv[1]
s = open(os.path.join(SRC_DIR, "index.html"), encoding="utf8").read()


def rep(old, new, count=None, min_count=1):
    global s
    n = s.count(old)
    if n < min_count:
        sys.exit(f"MISSING ({n}): {old[:90]!r}")
    s = s.replace(old, new) if count is None else s.replace(old, new, count)


# ---------- 1. the 18 curriculum days replace the EA/PA days ----------
DAY_TITLES = {
    # Day headings as the curriculum gives them. A day without a build/days/dayNN.js
    # file yet is listed with its title and stays closed until its content is added.
    1: ("VA Essentials", "DAY 1 VA Essentials"),
    2: ("VA Essentials", "DAY 2 VA Essentials"),
    3: ("Reception Training", "DAY 3 Reception Training"),
    4: ("Reception Training", "DAY 4 Reception Training"),
    5: ("Reception Training", "DAY 5 Reception Training"),
    6: ("Calendar Management Training", "DAY 6 Calendar Management Training"),
    7: ("Intake Training", "DAY 7: Intake Training"),
    8: ("Intake Training", "DAY 8: Intake Training"),
    9: ("Intake Training", "DAY 9: Intake Training"),
    10: ("Insurance Communication Training", "DAY 10: Insurance Communication Training"),
    11: ("Insurance Communication Training", "DAY 11: Insurance Communication Training"),
    12: ("Insurance Communication Training", "DAY 12: Insurance Communication Training"),
    13: ("Provider Communication Training", "DAY 13: Provider Communication Training"),
    14: ("Provider Communication Training", "DAY 14: Provider Communication Training"),
    15: ("Provider Communication Training", "DAY 15: Provider Communication Training"),
    16: ("Provider Communication Training", "DAY 16: Provider Communication Training"),
    17: ("Lien Negotiator Training", "Day 17: Lien Negotiator Training"),
    18: ("Lien Negotiator Training", "Day 18: Lien Negotiator Training"),
}
parts = []
for n in range(1, 19):
    f = os.path.join(B, "days", f"day{n:02d}.js")
    if os.path.exists(f):
        parts.append(open(f, encoding="utf8").read().strip())
    else:
        title, heading = DAY_TITLES[n]
        parts.append(f'const DAY{n} = {{ id: {n}, title: {title!r}, heading: {heading!r}, sections: [] }};'.replace("'", '"'))
days_js = "\n\n".join(parts)
days_js += "\n\nconst DAYS = [" + ", ".join(f"DAY{n}" for n in range(1, 19)) + "];"
# The engine reads d.lessons (topic lists, search) and d.quiz; for this program they come from the sections.
days_js += "\nDAYS.forEach(d=>{ d.lessons = d.sections.map(x=>({h:x.h})); d.quiz = []; d.quickChecks = []; });"
i = s.index("const DAY1 = {")
j = s.index("const DAYS = [DAY1")
j2 = s.index("\n", j)
s = s[:i] + days_js + s[j2:]

# ---------- 2. drop EA/PA-only heavy assets and keyed content (as the CM build does) ----------
s = "\n".join(l for l in s.split("\n") if not l.startswith('LESSON_DIAGRAMS["'))
s, n1 = re.subn(r'const LESSON_EXTRA_LEARNING = \{.*?\};\n', 'const LESSON_EXTRA_LEARNING = {};\n', s, count=1, flags=re.S)
s, n2 = re.subn(r'const ELIAS_VOICE_NOTE_AUDIO_DATAURI = "[^"]*";', 'const ELIAS_VOICE_NOTE_AUDIO_DATAURI = "";', s, count=1)
s, n3 = re.subn(r'const CLIENT_AVATAR_SRC = \(.*?\n', 'const CLIENT_AVATAR_SRC = "";\n', s, count=1)
if not (n1 and n2 and n3):
    sys.exit(f"MISSING heavy-asset anchors: {n1} {n2} {n3}")

# ---------- 3. branding ----------
rep("<title>LSH EA/PA Upskill Program</title>", "<title>LSH Foundational Training Program</title>")
rep('<b>LSH EA/PA Upskill Program</b><span>10-Day Interactive Training</span>', '<b>LSH Foundational Training</b><span>Standard Foundational Training</span>')
rep("LSH EA / PA Upskill Program", "LSH Foundational Training Program")
rep("EA / PA Upskill Program", "Foundational Training Program")
rep("EA/PA Upskill Program", "Foundational Training Program", min_count=0)
rep("LSH EA/PA — Platform Orientation", "LSH Foundational Training — Platform Orientation")
rep("LSH-EAPA-", "LSH-FT-")
rep(" of 10</b>", " of ${DAYS.length}</b>")
rep("Day ${d.id} of 10<", "Day ${d.id} of ${DAYS.length}<")
# No Knowledge Checks: the last slide finishes the day (js/ft-updates.js handles the click).
rep("Continue to Knowledge Check &rarr;", "✓ Finish Day ${d.id}")
rep("🎉 That's everything for Day ${d.id} — the Knowledge Check is the last step to mark this day complete.",
    "🎉 That's everything for Day ${d.id} — click Finish Day ${d.id} to mark it complete.")

# ---------- 4. build tag + this program's layer ----------
build_tag = "ft-" + datetime.datetime.utcnow().strftime("%Y.%m.%d-%H%M")
s, n = re.subn(r'var APP_BUILD = "[^"]*";', f'var APP_BUILD = "{build_tag}";', s, count=1)
if not n:
    sys.exit("MISSING: APP_BUILD")
m = re.search(r'<script src="/js/eapa-updates\.js\?v=[^"]*"></script>', s)
if not m:
    sys.exit("MISSING: eapa-updates.js script tag")
s = s[:m.end()] + f'\n<script src="/js/ft-updates.js?v={build_tag}"></script>' + s[m.end():]

open(os.path.join(ROOT, "index.html"), "w", encoding="utf8").write(s)
# js/eapa-updates.js: the EA/PA update pack, with the same branding.
u = open(os.path.join(SRC_DIR, "js", "eapa-updates.js"), encoding="utf8").read()
for old, new in [('<b>LSH EA/PA Upskill Program</b><span>10-Day Interactive Training</span>', '<b>LSH Foundational Training</b><span>Standard Foundational Training</span>'),
                 ('<b>LSH EA/PA Upskill Program</b>Waiting for the presenter…', '<b>LSH Foundational Training</b>Waiting for the presenter…')]:
    if old not in u:
        sys.exit(f"MISSING in eapa-updates.js: {old[:80]!r}")
    u = u.replace(old, new)
open(os.path.join(ROOT, "js", "eapa-updates.js"), "w", encoding="utf8").write(u)
print(f"index.html written ({len(s)//1024} KB), build {build_tag}")
