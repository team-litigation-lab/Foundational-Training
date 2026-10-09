#!/usr/bin/env python3
"""Builds js/ft-lor-data.js from the three files the trainers sent for the LOR Drafting Activity.

Usage:
  python3 build/lor/make_lor_data.py <Case_Notes_For_Drafting_Activity_SA_Demo.docx> <1P_LOR.docx> <3P_LOR_with_Affidavit.docx>

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


TW = 1440.0          # twips to an inch


def _numfmt(z):
    """numId → "bullet" or "decimal", through the abstract list each one points at."""
    try: n = ET.fromstring(z.read("word/numbering.xml"))
    except KeyError: return {}
    abstract = {}
    for ab in n.findall(W + "abstractNum"):
        lvl = ab.find(W + "lvl")
        fmt = lvl.find(W + "numFmt") if lvl is not None else None
        abstract[ab.get(W + "abstractNumId")] = (fmt.get(W + "val") if fmt is not None else "decimal")
    out = {}
    for num in n.findall(W + "num"):
        a = num.find(W + "abstractNumId")
        if a is not None: out[num.get(W + "numId")] = abstract.get(a.get(W + "val"), "decimal")
    return out


def _page(z, body):
    """The document's own page: its size, its margins and the font it is set in."""
    out = {}
    sect = body.find(W + "sectPr")
    if sect is not None:
        mar = sect.find(W + "pgMar")
        if mar is not None:
            out["m"] = {k: round(int(mar.get(W + k, 0)) / TW, 3) for k in ("top", "right", "bottom", "left")}
        pg = sect.find(W + "pgSz")
        if pg is not None:
            out["w"] = round(int(pg.get(W + "w", 12240)) / TW, 3)
    try:
        st = ET.fromstring(z.read("word/styles.xml"))
        rpr = st.find(W + "docDefaults/" + W + "rPrDefault/" + W + "rPr")
        if rpr is not None:
            sz = rpr.find(W + "sz")
            if sz is not None: out["sz"] = int(sz.get(W + "val")) / 2.0
    except KeyError:
        pass
    return out


def _runs(p):
    """Every run of a paragraph, in document order — including runs Word wrapped in <w:sdt>
       (the third tick box of the 1P letter is one of those) — with the formatting it carries."""
    out = []
    for r in p.iter(W + "r"):
        rPr = r.find(W + "rPr")
        f = {}
        if rPr is not None:
            h = rPr.find(W + "highlight")
            f["hl"] = h is not None and (h.get(W + "val") or "none") != "none"
            for tag, key in (("b", "b"), ("i", "i"), ("u", "u")):
                if rPr.find(W + tag) is not None: f[key] = True
            sz = rPr.find(W + "sz")
            if sz is not None: f["sz"] = int(sz.get(W + "val")) / 2.0
            fo = rPr.find(W + "rFonts")
            if fo is not None and fo.get(W + "ascii"): f["ff"] = fo.get(W + "ascii")
        txt = ""
        for node in r:
            tag = node.tag.replace(W, "")
            if tag == "t": txt += node.text or ""
            elif tag == "tab": txt += "\t"
            elif tag == "br": txt += "\n"
            elif tag == "sym": txt += "\u2610"        # a Wingdings box → ☐
        if txt:
            f["x"] = txt
            out.append(f)
    # Word splits a line into many runs as it is edited: join the neighbours that look the same,
    # so one highlighted phrase is one field rather than five.
    # Two neighbouring highlighted runs are one yellow phrase and so one field, whatever Word did to
    # their font or size mid-phrase; everywhere else a change of formatting really is a new run.
    merged = []
    def same(a, b):
        if a.get("hl") and b.get("hl"): return True
        return all(a.get(k) == b.get(k) for k in ("hl", "b", "i", "u", "sz", "ff"))
    for r in out:
        if merged and same(merged[-1], r): merged[-1]["x"] += r["x"]
        else: merged.append(dict(r))
    return merged


def _para(p, numfmt):
    """A paragraph's own layout: how it is aligned, how far it is indented, and its tab stops."""
    out = {}
    pPr = p.find(W + "pPr")
    if pPr is None: return out
    jc = pPr.find(W + "jc")
    if jc is not None and jc.get(W + "val") in ("center", "right", "both"): out["jc"] = jc.get(W + "val")
    ind = pPr.find(W + "ind")
    if ind is not None:
        d = {}
        for a, k in (("left", "l"), ("right", "r"), ("firstLine", "fi"), ("hanging", "ha")):
            v = ind.get(W + a)
            if v not in (None, "0"): d[k] = round(int(v) / TW, 3)
        if d: out["ind"] = d
    tabs = pPr.find(W + "tabs")
    if tabs is not None:
        stops = sorted(round(int(t.get(W + "pos")) / TW, 3) for t in tabs.findall(W + "tab") if t.get(W + "pos"))
        if stops: out["tabs"] = stops
    num = pPr.find(W + "numPr")
    if num is not None:
        out["n"] = 1
        nid = num.find(W + "numId")
        if nid is not None and nid.get(W + "val"):
            out["ni"] = nid.get(W + "val")
            out["nf"] = numfmt.get(out["ni"], "decimal")
    return out


ART = {"vanlaw-logo.png": (313, 167), "vanlaw-rule.png": (1502, 35)}


def save_art(z):
    """The letterhead's own artwork from the document: the VAN LAW FIRM logo and the bar under it.
       Matched by their pixel size, so a renamed media file is still found."""
    import struct, os
    for name in z.namelist():
        if not name.startswith("word/media/") or not name.endswith(".png"): continue
        d = z.read(name)
        if len(d) < 24 or d[:8] != b"\x89PNG\r\n\x1a\n": continue
        w, h = struct.unpack(">II", d[16:24])
        for out, size in ART.items():
            if (w, h) == size:
                path = os.path.join("img", out)
                if not os.path.exists(path) or open(path, "rb").read() != d:
                    open(path, "wb").write(d)
                    print("  wrote img/%s (%dx%d)" % (out, w, h))


def letterhead(z):
    """The firm's letterhead out of the document's own header: the attorneys and where each is
       admitted, the website, and the four offices with their addresses. Word positions these as
       floating text boxes, so they are read as text and laid out again on the page."""
    try: h = ET.fromstring(z.read("word/header1.xml"))
    except KeyError: return {}
    lines = []
    for para in h.iter(W + "p"):
        t = " ".join("".join(x.text or "" for x in para.iter(W + "t")).split())
        if t and len(t) < 90:                              # the first run repeats the whole block
            lines.append(t)
    out = {"attorneys": [], "offices": [], "site": ""}
    i, office = 0, None
    while i < len(lines):
        t = lines[i]
        if t.lower().startswith("www."): out["site"] = t; i += 1; continue
        if re.match(r"^[A-Z][A-Za-z.\- ]+, Esq\.$", t) and i + 1 < len(lines) and lines[i + 1].startswith("Admitted"):
            out["attorneys"].append({"n": t, "a": lines[i + 1]}); i += 2; continue
        if t.isupper() and "," in t and not t.startswith(("P.", "E:")):
            office = {"city": t, "physical": [], "mailing": [], "phone": "", "email": ""}
            out["offices"].append(office); i += 1; continue
        if office is not None:
            if t.startswith("Physical Address"): office["_w"] = "physical"
            elif t.startswith("Mailing Address"): office["_w"] = "mailing"
            elif t.startswith("P."): office["phone"] = t
            elif t.startswith("E:"): office["email"] = t
            else: office.setdefault("_w", "physical"); office[office["_w"]].append(t)
        i += 1
    for o in out["offices"]: o.pop("_w", None)
    # the 3P header carries the letterhead twice: one of each, in the order they first appear
    out["attorneys"] = list({a["n"]: a for a in out["attorneys"]}.values())
    out["offices"] = list({o["city"]: o for o in out["offices"]}.values())
    return out


def template(path, tid, title, naming):
    """The letter exactly as Word lays it out: its page, and every paragraph's alignment, indents,
       tab stops and run formatting. Only the yellow-highlighted runs become fields."""
    with zipfile.ZipFile(path) as z:
        body = body_of(path)
        page = _page(z, body)
        numfmt = _numfmt(z)
        head = letterhead(z)
        save_art(z)
    blocks, n = [], 0
    for i, child in enumerate(body):
        tag = child.tag.replace(W, "")
        if tag == "tbl":
            blocks.append({"t": "tbl", "rows": [
                [" ".join("".join(x["x"] for x in _runs(p)) for p in tc.iter(W + "p")).strip()
                 for tc in tr.findall(W + "tc")] for tr in child.findall(W + "tr")]})
            continue
        if tag != "p": continue
        runs = []
        for r in _runs(child):
            keep = {k: r[k] for k in ("b", "i", "u", "sz", "ff") if r.get(k)}
            if not r.get("hl"):
                keep["x"] = r["x"]
                runs.append(keep)
                continue
            n += 1
            if i == 0: k = "date"
            elif r["x"].strip().upper().startswith("SENT VIA"): k = "manual"
            elif len(r["x"]) > LONG_FIELD: k = "long"
            else: k = "field"
            keep.update({"f": "f%d" % n, "ph": r["x"], "k": k})
            runs.append(keep)
        blk = {"t": "p", "runs": runs}
        blk.update(_para(child, numfmt))
        blocks.append(blk)
    return {"id": tid, "title": title, "naming": naming, "page": page, "head": head, "blocks": blocks}


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


def main(notes, p1, p3, dest="js/ft-lor-data.js"):
    cs = cases(notes)
    ts = [template(p1, "lor1p", "Activity 1: Letter of Representation / LOR Drafting for 1P",
                   "INS – 1P Insurance Provider - LOR mm.dd.yyyy (VA's name)"),
          template(p3, "lor3p", "Activity 2: Letter of Representation (LOR) Drafting for 3P",
                   "INS – 3P Insurance Provider - LOR with Affidavit mm.dd.yyyy (VA's name)")]
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
    if len(sys.argv) < 4: sys.exit(__doc__)
    main(*sys.argv[1:])
