#!/usr/bin/env python3
"""Builds js/ft-lor-data.js from the three files the trainers sent for the LOR Drafting Activity.

Usage:
  python3 build/lor/make_lor_data.py <Case_Notes_For_Drafting_Activity_SA_Demo.docx> \
      <1P_LOR.docx> <3P_LOR_with_Affidavit.docx> <MedLOR_with_Unsworn_COR.docx> <Lien_Balance_Verification.docx>

Four templates: the two insurance letters, drafted from the trainee's assigned case, and the two medical
letters, where the trainee supplies everything themselves (there is no provider to assign). The medical
templates came as 30 per-provider copies of the same two letters; the copies differ only in the header
block, which the trainee fills in anyway, so one of each is kept here (Apache Health Center's, which sits
in the majority variant of both).

The two letter templates are read block by block, exactly as Word has them, so the firm's wording is
carried over untouched. The only thing the activity treats specially is what the firm highlighted in
yellow: each highlighted run becomes a field the trainee fills in. Three of them are not ordinary
fields (see k= below), per the trainers' instructions (LOR DRAFTING ACTIVITIES):
  - the letter's date is auto-generated (the current date, the date the letter is drafted)
  - the "SENT VIA FACSIMILE ..." line is typed by hand rather than offered as a placeholder
  - a highlighted run longer than a line becomes a textarea
Everything else in the templates is the firm's own text and is never changed here.

Re-run this whenever the trainers send new templates or new case notes; never hand-edit the output.
"""
import json, re, sys, zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
LONG_FIELD = 120          # a highlighted run longer than this is a textarea, not a one-line field


def body_of(path):
    with zipfile.ZipFile(path) as z:
        return ET.fromstring(z.read("word/document.xml")).find(W + "body")


def runs_of(p):
    """Every run of a paragraph, in document order — including runs Word wrapped in <w:sdt>
       (the third tick box of the 1P letter is one of those)."""
    out = []
    for r in p.iter(W + "r"):
        rPr = r.find(W + "rPr")
        hl = bold = False
        if rPr is not None:
            h = rPr.find(W + "highlight")
            hl = h is not None and (h.get(W + "val") or "none") != "none"
            bold = rPr.find(W + "b") is not None
        txt = ""
        for node in r:
            tag = node.tag.replace(W, "")
            if tag == "t": txt += node.text or ""
            elif tag == "tab": txt += "\t"
            elif tag == "br": txt += "\n"
            elif tag == "sym": txt += "☐"        # a Wingdings box → ☐
        if txt: out.append({"hl": hl, "b": bold, "x": txt})
    # Word splits a line into many runs as it is edited: join the neighbours that look the same,
    # so one highlighted phrase is one field rather than five.
    merged = []
    for r in out:
        if merged and merged[-1]["hl"] == r["hl"] and merged[-1]["b"] == r["b"]: merged[-1]["x"] += r["x"]
        else: merged.append(dict(r))
    return merged


SALUTATION = "to whom it may concern"


def head_end(children):
    """Where the letterhead stops: the salutation. Everything above it — who the letter goes to, the
       client it is about — is the variable part of these letters."""
    for i, ch in enumerate(children):
        if ch.tag.replace(W, "") != "p": continue
        txt = "".join(t.text or "" for t in ch.iter(W + "t")).strip().lower()
        if txt.startswith(SALUTATION): return i
    return 0


def template(path, tid, title, naming, head=False):
    """head=True: the whole letterhead is the trainee's to fill in, highlighted or not. The medical
       letters came as 30 per-provider copies with the provider merged in, and the two mark that block
       inconsistently — the MedLOR highlights it white, the Lien BV not at all — so neither marking is
       a statement about what the trainee supplies. They supply all of it, in both."""
    children = list(body_of(path))
    stop = head_end(children) if head else 0
    blocks, n = [], 0
    for i, child in enumerate(children):
        tag = child.tag.replace(W, "")
        if tag == "tbl":
            blocks.append({"t": "tbl", "rows": [
                [" ".join("".join(x["x"] for x in runs_of(p)) for p in tc.iter(W + "p")).strip()
                 for tc in tr.findall(W + "tc")] for tr in child.findall(W + "tr")]})
            continue
        if tag != "p": continue
        runs = []
        for r in runs_of(child):
            # In the letterhead the trainee fills everything in; below it, only what the firm highlighted.
            # Whitespace-only runs stay as they are either way: they are spacing, not something to type.
            if not r["hl"] and not (i < stop and r["x"].strip()):
                runs.append({"x": r["x"], "b": True} if r["b"] else {"x": r["x"]})
                continue
            n += 1
            if i == 0: k = "date"   # the letter's date is the first thing in the document
            elif r["x"].strip().upper().startswith("SENT VIA"): k = "manual"
            elif "\n" in r["x"] or len(r["x"]) > LONG_FIELD: k = "long"
            else: k = "field"
            runs.append({"f": "f%d" % n, "ph": r["x"], "k": k})
        blk = {"t": "p", "runs": runs}
        pPr = child.find(W + "pPr")
        if pPr is not None:
            if pPr.find(W + "numPr") is not None: blk["n"] = 1
            jc = pPr.find(W + "jc")
            if jc is not None and jc.get(W + "val") == "center": blk["c"] = 1
        blocks.append(blk)
    # The addressee — the carrier on the insurance letters, the provider on the medical ones — is the
    # first ordinary field in every one of these templates, after the date and the "SENT VIA" line.
    # The page names the downloaded file after whatever the trainee types there.
    who = next((r["f"] for b in blocks if b["t"] == "p" for r in b["runs"] if r.get("k") == "field"), "")
    return {"id": tid, "title": title, "naming": naming, "who": who, "blocks": blocks}


def cases(path):
    """The case notes: one case per "For 1P LOR Drafting" heading, with the 3P set that follows it."""
    out, cur, side = [], None, None
    for p in body_of(path).iter(W + "p"):
        line = re.sub(r"\s+", " ", "".join(t.text or "" for t in p.iter(W + "t"))).strip()
        m = re.match(r"^For (1P|3P) LOR Drafting$", line)
        if m:
            side = m.group(1)
            if side == "1P": cur = {"p1": {}, "p3": {}}; out.append(cur)
            continue
        if line.startswith("•") and cur and side and ":" in line:
            k, v = line[1:].split(":", 1)
            cur["p1" if side == "1P" else "p3"][k.strip()] = v.strip().rstrip(".")
    return out


def main(notes, p1, p3, med, lien, dest="js/ft-lor-data.js"):
    cs = cases(notes)
    ts = [template(p1, "lor1p", "Activity 1: Letter of Representation / LOR Drafting for 1P",
                   "INS – 1P Insurance Provider - LOR mm.dd.yyyy (VA's name)"),
          template(p3, "lor3p", "Activity 2: Letter of Representation (LOR) Drafting for 3P",
                   "INS – 3P Insurance Provider - LOR with Affidavit mm.dd.yyyy (VA's name)"),
          template(med, "lormed", "Activity 3: Medical Letter of Representation with Unsworn COR",
                   "MED – Provider - MedLOR mm.dd.yyyy (VA's name)", head=True),
          template(lien, "lorlien", "Activity 4: Lien Balance Verification",
                   "MED – Provider - Lien Balance Verification mm.dd.yyyy (VA's name)", head=True)]
    if not cs: sys.exit("No cases found in " + notes)
    for t in ts:
        if not any(r.get("f") for b in t["blocks"] if b["t"] == "p" for r in b["runs"]):
            sys.exit("No highlighted fields found in " + t["id"] + ": is the template still highlighted in yellow?")
    head = open(__file__.replace("make_lor_data.py", "header.txt"), encoding="utf8").read()
    js = (head + "window.FT_LOR_CASES = " + json.dumps(cs, ensure_ascii=False, separators=(",", ":")) + ";\n"
          + "window.FT_LOR_TEMPLATES = " + json.dumps(ts, ensure_ascii=False, separators=(",", ":")) + ";\n")
    open(dest, "w", encoding="utf8").write(js)
    print("%s: %d cases, %d fields" % (dest, len(cs),
          sum(1 for t in ts for b in t["blocks"] if b["t"] == "p" for r in b["runs"] if r.get("f"))))


if __name__ == "__main__":
    if len(sys.argv) < 6: sys.exit(__doc__)
    main(*sys.argv[1:])
