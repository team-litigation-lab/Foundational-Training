"""Builder notes: instructions in the Training Guide for building the platform ("Embed this", "Link instead
of embed", "Divide the Start Training Button…", the Part 1/Part 2 splits, "Claude to come up with…",
"Focus in Automation // Calendar Simulator", the "Act as a senior LMS engineer…" block, "This needs to be
replicated… 5 Scenarios"). They are not training content, so convert.py takes them out of every block
before anything is written. The patterns are in builder-notes.json, shared with .github/scripts/builder-notes.cjs.
"""
import json, os, re

_D = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "builder-notes.json"), encoding="utf8"))
NOTE = re.compile("|".join(f"(?:{p})" for p in _D["notes"]), re.I)
BLOCK = re.compile("|".join(f"(?:{p})" for p in _D["blocks"]), re.I)
OPEN, CLOSE = "([{", ")]}"
LEFTOVER = re.compile(r"^[\s\-–—/|:;,.()\[\]{}*]*$")          # what's left of a line that was only a note

def text(b): return "".join(r.get("t", "") for r in b.get("runs", []))

def spans(t):
    """Character ranges of the notes in t: a note in brackets is the bracketed part; otherwise it runs
    from the note (and the separator before it: " - ", " – ", " // ", ": ") to the end of the line."""
    out = []
    for m in NOTE.finditer(t):
        s = m.start()
        if out and s < out[-1][1]: continue
        depth, k = 0, s - 1
        while k >= 0:                                  # inside brackets?
            if t[k] in CLOSE: depth += 1
            elif t[k] in OPEN:
                if depth == 0: break
                depth -= 1
            k -= 1
        if k >= 0:
            close = CLOSE[OPEN.index(t[k])]
            e = t.find(close, m.end())
            if e != -1:
                out.append((len(t[:k].rstrip()), e + 1)); continue
        sep = re.search(r"[\s\-–—/|:;,]*$", t[:s])
        e = t.find("\n", m.end())
        out.append((sep.start(), len(t) if e == -1 else e))
    return out

def cut(runs, ranges):
    """The runs with the character ranges removed (images, breaks and field codes are kept)."""
    out, pos = [], 0
    for r in runs:
        if "t" not in r: out.append(r); continue
        t, keep = r["t"], []
        for i, ch in enumerate(t):
            if not any(a <= pos + i < b for a, b in ranges): keep.append(ch)
        pos += len(t)
        if keep: out.append({**r, "t": "".join(keep)})
    return out

def _empty(b): return {**b, "runs": [r for r in b["runs"] if "img" in r], "label": None}

def clean_para(b):
    """(paragraph without its notes, whether it was all note)."""
    t = text(b)
    rs = spans(t)
    if not rs: return b, False
    runs = cut(b["runs"], rs)
    if LEFTOVER.match("".join(r.get("t", "") for r in runs)):
        return _empty({**b, "runs": runs}), True
    return {**b, "runs": runs}, False

def ends_block(b, is_boundary):
    """Where a block of builder instructions stops: a heading, a row of stars, a numbered part, a facilitator's note."""
    if b["k"] != "p": return False
    t = text(b).strip()
    return bool(t) and (b["style"].startswith("Heading") or re.fullmatch(r"\*{3,}.*", t) is not None
                        or re.match(r"^(\d+\.\s*)?facilitator", t, re.I) is not None or is_boundary(b))

def strip_all(blocks, is_boundary=lambda b: False):
    """Every block with its builder notes taken out, in place (indexes are kept: a removed block becomes an empty
    paragraph). Returns how many notes were removed."""
    removed, i = 0, 0
    while i < len(blocks):
        b = blocks[i]
        if b["k"] == "tbl":
            for row in b["rows"]:
                for cell in row:
                    for j, p in enumerate(cell):
                        if NOTE.search(text(p)): removed += 1; cell[j] = clean_para(p)[0]
            i += 1; continue
        t = text(b)
        if not NOTE.search(t): i += 1; continue
        removed += 1
        blocks[i] = clean_para(b)[0]
        if BLOCK.search(t):                            # the rest of the prompt goes too
            i += 1
            while i < len(blocks) and not ends_block(blocks[i], is_boundary):
                if blocks[i]["k"] == "tbl": blocks[i] = {"k": "p", "style": "", "label": None, "lvl": 0, "runs": []}
                else: blocks[i] = _empty(blocks[i])
                i += 1
            continue
        i += 1
    return removed
