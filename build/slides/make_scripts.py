"""Presenter scripts for a native deck lesson, in the EA/PA format, written to trainer/scripts.json.

    python3 build/slides/make_scripts.py claims

Each slide's script is built from that deck page's speaker notes, word for word:
  ② Talk it through  the notes' opening lines (what the trainer says first)
  ③ Walk through it  the rest of the notes, in order (headings in bold, points as bullets)
plus the beats the notes don't have, from build/slides/<deck>_script.py:
  ① The why, ④ Ask the room (④ Your turn on the last slide) and an optional 🎬 Scenario.
trainer/scripts.json is trainer-only (served behind the /trainer/ gate, like trainer/notes.json):
  {"<lesson id>": {"sections": {"<section id>": {"on", "why", "talk", "walk": [...], "ask", "scenario"}}}}
"""
import html, json, os, re, sys, importlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from make_lesson import LESSONS

# Where Canva cut the start of a note box, the missing words (from the slide's own wording).
NOTE_FIX = {"ite Cases:": "1. Dog-Bite Cases:"}

def is_heading(p):
    t = p.strip().strip('"“”')
    return len(t) <= 90 and (t.endswith(":") or re.search(r"[–-] Speaker[’']s Notes$", t))

def split(paras):
    """The opening lines before the first heading are the talk-through; the rest is the walk-through."""
    paras = [NOTE_FIX.get(p, p) for p in paras]
    talk = []
    for i, p in enumerate(paras):
        if is_heading(p): break
        talk.append(p)
    else:
        return talk, []
    walk = paras[len(talk):]
    if not talk:
        # Notes that open with a heading: with several headed parts, the first part is the talk-through;
        # with only one, the whole note is the walk-through.
        for h in [i for i, p in enumerate(walk) if i and is_heading(p) and not is_heading(walk[i - 1])]:
            return walk[:h], walk[h:]
    return talk, walk

def main(deck):
    L = LESSONS[deck]
    pages = {p["key"]: p for p in json.load(open(os.path.join(HERE, f"{deck}.json")))}
    beats = importlib.import_module(f"{deck}_script").BEATS
    src = open(os.path.join(ROOT, "build", "lessons", f"lesson{L['id']:02d}.js")).read()
    secs = json.loads(src[src.index("sections:") + 9:src.rindex("]") + 1])
    ids = [x["id"] for x in secs]
    labels = {x["id"]: m.group(1) for x in secs for m in [re.search(r'class="cs-label">([^<]*)<', x["html"])] if m}
    out, prev = {}, None
    for n, k in enumerate(ids):
        pg, b = pages[k], beats[k]
        talk, walk = split(pg.get("paras") or [pg["notes"]])
        on = f"Slide {n+1} of {len(ids)}" + (f" · {html.unescape(labels[k])}" if labels.get(k) else "")
        if prev is not None and pg["notes"] == prev:
            on += " · same speaker notes as the slide before: pick up where you left off"
        s = {"on": on, "why": b[0], "talk": "\n".join(talk), "walk": walk, "ask": b[1]}
        if len(b) > 2: s["scenario"] = b[2]
        out[k] = s; prev = pg["notes"]
    path = os.path.join(ROOT, "trainer", "scripts.json")
    data = json.load(open(path)) if os.path.exists(path) else {}
    data[str(L["id"])] = {"deck": deck, "sections": out}
    json.dump(data, open(path, "w"), ensure_ascii=False, indent=1)
    print(f"trainer/scripts.json: lesson {L['id']}, {len(out)} slide scripts")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "claims")
