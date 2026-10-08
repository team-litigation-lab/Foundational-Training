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


# ---------- 1. the lessons replace the EA/PA days ----------
# Trainees see the lessons only: each lesson is its Canva training deck (build/lessons/lessonNN.js).
# The curriculum (build/days/, trainer/curriculum.json) is for trainers and admins.
# The engine still calls them "days" internally (DAYS, DAY1…); on screen they're lessons, named by title.
# build/lessons/off/ holds lessons taken off the platform (not built); move a file back to restore it.
LESSONS = sorted(f for f in os.listdir(os.path.join(B, "lessons")) if re.fullmatch(r"lesson\d\d[a-z]?\.js", f))
parts = [open(os.path.join(B, "lessons", f), encoding="utf8").read().strip() for f in LESSONS]
N = len(LESSONS)
days_js = "\n\n".join(parts)
# ftName(id): a lesson's title for the engine's "Day N" labels (also takes "1, 2" lists and arrays).
days_js += """
function ftName(v){ const one = x=>{ const d = DAYS.find(d=>d.id===Number(x)); return d ? d.title : String(x); };
  return Array.isArray(v) ? v.map(one).join(", ") : String(v).split(/,\\s*/).map(one).join(", "); }"""
# DAYS in file order (lesson00a.js Onboarding and lesson00b.js Set-up come first). Each lesson keeps its own id, so a card added
# in front never shifts the lessons' saved progress; d.label / d.short override "Lesson N" and the number.
names = [re.search(r"const (DAY\d+) = \{", x).group(1) for x in parts]
days_js += "\n\nconst DAYS = [" + ", ".join(names) + "];"
days_js += """
function ftLabel(d){ return d.label || `Lesson ${d.id} of ${DAYS.filter(x=>!x.label).length}`; }"""
# The engine reads d.lessons (topic lists, search) and d.quiz; for this program they come from the sections.
# noDividers: each deck page is its own slide, so no "Topic N of M" divider slide goes before each one.
days_js += "\nDAYS.forEach(d=>{ d.lessons = d.sections.map(x=>({h:x.h})); d.quiz = []; d.quickChecks = []; d.noDividers = true; });"
# The EA/PA portal keeps each day in js/days/dayN/ (lessons.js, notes.js, scripts.js), loaded by script
# tags, and index.html builds DAYS from them. None of those files are this program's: drop the tags and
# put the lessons where DAYS was built.
s, n = re.subn(r'<script src="/js/days/day\d+/(?:lessons|notes|scripts)\.js[^"]*"></script>\n?', '', s)
if not n:
    sys.exit("MISSING: the js/days/dayN/*.js script tags")
m = re.search(r'const DAY_FILES = window\.EA_DAY_FILES \|\| \{\};\n.*?\nconst MISSING_DAYS = [^\n]*\nif\(MISSING_DAYS\.length\)\{\n.*?\n\}\n', s, flags=re.S)
if not m:
    sys.exit("MISSING: the DAY_FILES / DAYS / MISSING_DAYS block")
s = s[:m.start()] + days_js + "\nconst DAY_FILES = {};\nconst MISSING_DAYS = [];\n" + s[m.end():]
# The EA/PA saved-place migrations (DAY_LAYOUTS: its topic orders by title; QC_OPTION_MOVES: its Quick
# Check answers) are about the EA/PA days: here they'd move trainees' places in these lessons.
s, n = re.subn(r'const DAY_LAYOUTS = \[\n.*?\n\];\n', 'const DAY_LAYOUTS = [];\n', s, count=1, flags=re.S)
s, n2 = re.subn(r'const QC_OPTION_MOVES = \{.*?\};\n', 'const QC_OPTION_MOVES = {};\n', s, count=1, flags=re.S)
if not (n and n2):
    sys.exit(f"MISSING: DAY_LAYOUTS / QC_OPTION_MOVES ({n} {n2})")

# ---------- 2. drop EA/PA-only heavy assets and keyed content (as the CM build does) ----------
s = "\n".join(l for l in s.split("\n") if not l.startswith('LESSON_DIAGRAMS["'))
s, n1 = re.subn(r'const LESSON_EXTRA_LEARNING = Object\.assign\(\{\}, \.\.\.DAYS\.map\([^\n]*\);\n', 'const LESSON_EXTRA_LEARNING = {};\n', s, count=1)
s, n2 = re.subn(r'const ELIAS_VOICE_NOTE_AUDIO_DATAURI = "[^"]*";', 'const ELIAS_VOICE_NOTE_AUDIO_DATAURI = "";', s, count=1)
s, n3 = re.subn(r'const CLIENT_AVATAR_SRC = \(.*?\n', 'const CLIENT_AVATAR_SRC = "";\n', s, count=1)
if not (n1 and n2 and n3):
    sys.exit(f"MISSING heavy-asset anchors: {n1} {n2} {n3}")

# ---------- 3. branding ----------
# The standardized LSH logo (the same files as the Training Portal's): the full logo, js/lsh-logo-dark.png, and the
# square mark, favicon.png. Both have a white outline, so they read on navy and on white.
import base64
def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(open(os.path.join(ROOT, path), "rb").read()).decode()
s, n1 = re.subn(r'const LOGO_FULL_DATAURI = "data:image/png;base64,[^"]*";', lambda m: f'const LOGO_FULL_DATAURI = "{data_uri("js/lsh-logo-dark.png")}";', s, count=1)
s, n2 = re.subn(r'const LOGO_ICON_DATAURI = "data:image/png;base64,[^"]*";', lambda m: f'const LOGO_ICON_DATAURI = "{data_uri("favicon.png")}";', s, count=1)
if not (n1 and n2):
    sys.exit(f"MISSING logo anchors: {n1} {n2}")
rep("<title>LSH EA/PA Upskill Program</title>", "<title>LSH Foundational Training Program</title>")
rep('<b>LSH EA/PA Upskill Program</b><span>10-Day Interactive Training</span>', '<b>LSH Foundational Training</b><span>Standard Foundational Training</span>')
rep("LSH EA / PA Upskill Program", "LSH Foundational Training Program")
rep("EA / PA Upskill Program", "Foundational Training Program")
rep("EA/PA Upskill Program", "Foundational Training Program", min_count=0)
rep("LSH EA/PA — Platform Orientation", "LSH Foundational Training — Platform Orientation")
rep('doc.save("LSH_EA-PA_Platform_Orientation.pdf")', 'doc.save("LSH_FT_Platform_Orientation.pdf")')
rep("LSH-EAPA-", "LSH-FT-")
rep("Day ${d.id} of 10<", "${ftLabel(d)}<")
# No Knowledge Checks: the last slide finishes the lesson (js/ft-updates.js handles the click).
rep("  return Math.max(0, Math.min(last, maxR, total-1));", "  // Any slide can be opened (nothing is locked), so the saved place wins even when it is past the furthest slide reached with Next.\n  return Math.max(0, Math.min(last, total-1));")
rep("Continue to Knowledge Check &rarr;", "✓ Finish lesson")
rep("🎉 That's everything for Day ${d.id} — the Knowledge Check is the last step to mark this day complete.",
    "🎉 That's everything for this lesson — click Finish lesson to mark it complete.")
# Lessons are named by their title, not "Day N".
def name_days(text):
    return re.sub(r"Day \$\{([^{}]+)\}", r"${ftName(\1)}", text)
s = name_days(s)

# The EA/PA speaker notes (js/presenter-notes.js) aren't part of this program: its trainer notes are trainer/notes.json.
s = re.sub(r'<script src="/js/presenter-notes\.js[^"]*"></script>\n?', '', s)

# ---------- 4. build tag + this program's layer ----------
build_tag = "ft-" + datetime.datetime.utcnow().strftime("%Y.%m.%d-%H%M")
s, n = re.subn(r'var APP_BUILD = "[^"]*";', f'var APP_BUILD = "{build_tag}";', s, count=1)
if not n:
    sys.exit("MISSING: APP_BUILD")
# js/eapa-updates.js is rebuilt here too (with this program's patches), so it gets this build's tag:
# browsers then always fetch the version that matches this index.html.
s, n = re.subn(r'<script src="/js/eapa-updates\.js\?v=[^"]*"></script>', f'<script src="/js/eapa-updates.js?v={build_tag}"></script>', s, count=1)
# 🕘 Attendance (js/attendance.js) is the same file in every LSH course; it loads in the list below, not where the EA/PA page has it.
s = re.sub(r'<script src="/?js/attendance\.js[^"]*"></script>\n?', '', s)
m = re.search(r'<script src="/js/eapa-updates\.js\?v=[^"]*"></script>', s)
if not (n and m):
    sys.exit("MISSING: eapa-updates.js script tag")
s = s[:m.end()] + (f'\n<script src="/js/ft-updates.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-slides.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-tracker-rules.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-tracker.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-monitoring.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-process.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-rules.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-calsim-core.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-calendar.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-cases-data.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-firms.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-simulators.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-sessions.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-drive.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-facilitator-dna.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-activities.js?v={build_tag}"></script>'
     f'\n<script src="/js/ft-orientation.js?v={build_tag}"></script>'
     f'\n<script src="/js/attendance.js?v={build_tag}"></script>') + s[m.end():]
# The EA/PA page's server request meter (js/request-budget.js and its RequestBudget.start call): this
# program removed it (no budget is set up), so its script tags don't come across (they'd 404 and throw).
s = re.sub(r'<script src="/?js/request-budget\.js[^"]*"></script>\n?', '', s)
s = re.sub(r'<script>\s*/\*[^<]*?Server request meter.*?RequestBudget\.start\(.*?</script>\n?', '', s, flags=re.S)
# 🏠 Main Portal button for admins (js/portal-link.js), last before </body>.
s = re.sub(r'<script src="/js/portal-link\.js[^"]*"></script>\n?', '', s)   # the engine's page may carry it already: once, here
k = s.rfind("</body>")
if k < 0:
    sys.exit("MISSING: </body>")
s = s[:k] + f'<script src="/js/portal-link.js?v={build_tag}"></script>\n<script src="/js/show-password.js?v=1"></script>\n' + s[k:]
# 🧭 Blueprints (js/blueprint-content.js: this program's Trainer blueprint; js/lsh-blueprint-course.js and js/lsh-blueprint.js:
# the same files in every LSH course), after this program's scripts. The engine's page may carry them already: move them here.
s = re.sub(r'<!-- 🧭 Blueprints:[^\n]*-->\n|<script src="/js/(blueprint-content|lsh-blueprint-course|lsh-blueprint)\.js\?v=[^"]*"></script>\n', "", s)
k = s.rfind("</body>")
s = s[:k] + ('<!-- 🧭 Blueprints: the Trainer blueprint (blueprint-content.js) and the Trainee blueprint (Orientation, /blueprint.pdf) rebuilt after every deploy -->\n'
             f'<script src="/js/blueprint-content.js?v={build_tag}"></script>\n<script src="/js/lsh-blueprint-course.js?v={build_tag}"></script>\n'
             f'<script src="/js/lsh-blueprint.js?v={build_tag}"></script>\n') + s[k:]
# The LSH dashboard layout (js/lsh-dashboard.js, the same file in every LSH course repo) loads last of all.
k = s.rfind("</body>")
s = s[:k] + f'<script src="/js/lsh-dashboard.js?v={build_tag}"></script>\n' + s[k:]
# The lesson cards' buttons as one full-width grid with lines (js/ft-card-grid.js) wrap the finished card, so after it.
k = s.rfind("</body>")
s = s[:k] + f'<script src="/js/ft-card-grid.js?v={build_tag}"></script>\n' + s[k:]
# Every card framed (js/lsh-card-frame.js, the same file in every LSH course repo), after the card files.
# The engine's page may carry it (or the hub files below) already: once, here.
s = re.sub(r'<script src="/js/(lsh-card-frame|ft-program|lsh-program|lsh-tool-links)\.js\?v=[^"]*"></script>\n?', '', s)
k = s.rfind("</body>")
s = s[:k] + f'<script src="/js/lsh-card-frame.js?v={build_tag}"></script>\n' + s[k:]
# The LSH program layout (js/lsh-program.js, the same file in every LSH course repo: the five sections), last of all,
# after this program's setup for it (js/ft-program.js: the Training Modules pages and what the Scorecard collects).
k = s.rfind("</body>")
s = s[:k] + f'<script src="/js/ft-program.js?v={build_tag}"></script>\n<script src="/js/lsh-program.js?v={build_tag}"></script>\n' \
    + f'<script src="/js/lsh-tool-links.js?v={build_tag}"></script>\n' + s[k:]


# 🔐 Trainees sign in on the LSH Training Portal only (js/portal-gate.js). The gate file loads in <head>, before the engine,
# and the engine calls into it in four places: the server's status, the sign-in request, the sign-in screen and boot.
# (EA-PA-TRAINING carries the same hooks now: patch only when the engine you build from doesn't.)
if "window.portalGate" not in s:
    rep("state.secureMode = !!j.secure; }", "state.secureMode = !!j.secure; state.portalOnly = !!j.portalOnly; }")
    rep('''const r = await fetch("/api/auth/trainee", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({name, batch, id})});''',
        '''const r = await fetch("/api/auth/trainee", {method:"POST", headers:(window.portalGate ? window.portalGate.headers() : {"Content-Type":"application/json"}), body: JSON.stringify({name, batch, id})});''')
    rep("function renderLogin(){\n  return `", "function renderLogin(){\n  if(window.portalGate && window.portalGate.active()) return window.portalGate.renderCard();\n  return `")
    rep("  startUpdateChecks();\n  await loadAll();\n", "  startUpdateChecks();\n  await loadAll();\n  if(window.portalGate) await window.portalGate.init();   // js/portal-gate.js: trainees come in from the LSH Training Portal\n")
    rep("</head>", f'<script src="/js/portal-gate.js?v={build_tag}"></script>\n</head>', count=1)
# This program's copy of the gate file: its version follows the build, so a change here reaches open pages.
s = re.sub(r'<script src="/js/portal-gate\.js\?v=[^"]*"></script>', f'<script src="/js/portal-gate.js?v={build_tag}"></script>', s)

# 🛡 Trainees never see an Admin entry: with the Portal as the only way in, the Admin button (and the "Sign In as Trainer" button on
# trainer-only pages) is shown only to someone already signed in as an admin. Direct visitors use the sign-in note's admin link.
if "state.portalOnly && !state.isAdmin" not in s:
    rep('''<button class="${state.view===\'admin\'?\'active\':\'\'}" onclick="openAdmin()">🛡 Admin</button>''',
        '''${(state.portalOnly && !state.isAdmin) ? "" : `<button class="${state.view===\'admin\'?\'active\':\'\'}" onclick="openAdmin()">🛡 Admin</button>`}''')
    rep('''<button class="btn btn-primary" style="margin-top:14px;" onclick="openAdmin()">🛡 Sign In as Trainer</button>''',
        '''${(state.portalOnly && !state.isAdmin) ? "" : `<button class="btn btn-primary" style="margin-top:14px;" onclick="openAdmin()">🛡 Sign In as Trainer</button>`}''')

open(os.path.join(ROOT, "index.html"), "w", encoding="utf8").write(s)
# js/eapa-updates.js: the EA/PA update pack, with the same branding.
u = open(os.path.join(SRC_DIR, "js", "eapa-updates.js"), encoding="utf8").read()
for old, new in [('<b>LSH EA/PA Upskill Program</b><span>10-Day Interactive Training</span>', '<b>LSH Foundational Training</b><span>Standard Foundational Training</span>'),
                 ('<b>LSH EA/PA Upskill Program</b>Waiting for the presenter…', '<b>LSH Foundational Training</b>Waiting for the presenter…')]:
    if old not in u:
        sys.exit(f"MISSING in eapa-updates.js: {old[:80]!r}")
    u = u.replace(old, new)
u = u.replace("Preview tomorrow: Day ${", "Up next: Lesson ${")
# 🛡 No Admin button for trainees (see the index.html patch above): only someone already signed in as an admin sees it.
_btn = '''`<button class="${state.view===\'admin\'?\'active\':\'\'}" onclick="openAdmin()">🛡 Admin</button>`'''
if "state.portalOnly && !state.isAdmin" not in u and _btn in u:
    u = u.replace(_btn, '((state.portalOnly && !state.isAdmin) ? "" : ' + _btn + ")")
u = name_days(u)
# EA/PA's lesson slide background (navy LSH template, img/lesson-bg/) is for its own days: the lessons here are
# full-page deck images on the page, and the Orientation has the trainers' background (js/ft-slides.js).
u, n = re.subn(r'/\* ===== Lesson slide background: the LSH slide template =====.*?\n\}\)\(\);\n', '', u, count=1, flags=re.S)
if "lesson-bg" in u:
    sys.exit("MISSING: the lesson slide background block in eapa-updates.js")
# The Canva deck in the slides window (see ft_engine_patches.py).
sys.path.insert(0, B)
from ft_engine_patches import apply as ft_engine_patches
u = ft_engine_patches(u)
open(os.path.join(ROOT, "js", "eapa-updates.js"), "w", encoding="utf8").write(u)
print(f"index.html written ({len(s)//1024} KB), build {build_tag}")
