"""Parse the curriculum docx (unzipped) into blocks.json: paragraphs (style, list label, runs, images) and tables.

Usage: python3 build/curriculum/parse.py <unzipped docx dir>   (writes <dir>/blocks.json)
"""
import re, json, html, sys
D = sys.argv[1] if len(sys.argv) > 1 else "."
x = open(f"{D}/word/document.xml", encoding="utf8").read()
rels = dict(re.findall(r'Id="(rId\d+)"[^>]*?Target="([^"]+)"', open(f"{D}/word/_rels/document.xml.rels", encoding="utf8").read()))
relmode = dict(re.findall(r'Id="(rId\d+)"[^>]*?TargetMode="([^"]+)"', open(f"{D}/word/_rels/document.xml.rels", encoding="utf8").read()))
num = open(f"{D}/word/numbering.xml", encoding="utf8").read()

# numbering: numId -> abstractNumId -> lvl -> (fmt, text, start)
abstract = {}
for a in re.finditer(r'<w:abstractNum [^>]*w:abstractNumId="(\d+)"[^>]*>(.*?)</w:abstractNum>', num, re.S):
    lv = {}
    for l in re.finditer(r'<w:lvl [^>]*w:ilvl="(\d+)"[^>]*>(.*?)</w:lvl>', a.group(2), re.S):
        fmt = re.search(r'<w:numFmt w:val="([^"]+)"', l.group(2))
        txt = re.search(r'<w:lvlText w:val="([^"]*)"', l.group(2))
        st = re.search(r'<w:start w:val="(\d+)"', l.group(2))
        lv[int(l.group(1))] = (fmt.group(1) if fmt else "decimal", html.unescape(txt.group(1)) if txt else "", int(st.group(1)) if st else 1)
    abstract[a.group(1)] = lv
nummap = {}
overrides = {}
for n in re.finditer(r'<w:num w:numId="(\d+)"[^>]*>(.*?)</w:num>', num, re.S):
    nummap[n.group(1)] = re.search(r'<w:abstractNumId w:val="(\d+)"', n.group(2)).group(1)
    for o in re.finditer(r'<w:lvlOverride w:ilvl="(\d+)">.*?<w:startOverride w:val="(\d+)"', n.group(2), re.S):
        overrides[(n.group(1), int(o.group(1)))] = int(o.group(2))

def roman(n, upper):
    vals = [(1000,"m"),(900,"cm"),(500,"d"),(400,"cd"),(100,"c"),(90,"xc"),(50,"l"),(40,"xl"),(10,"x"),(9,"ix"),(5,"v"),(4,"iv"),(1,"i")]
    out = ""
    for v, s in vals:
        while n >= v: out += s; n -= v
    return out.upper() if upper else out
def fmtnum(fmt, n):
    if fmt == "decimal": return str(n)
    if fmt == "lowerLetter": return chr(96 + ((n-1) % 26) + 1)
    if fmt == "upperLetter": return chr(64 + ((n-1) % 26) + 1)
    if fmt == "lowerRoman": return roman(n, False)
    if fmt == "upperRoman": return roman(n, True)
    return str(n)
counters = {}   # (abstractId) -> [counts per level]

def run_props(r):
    rp = re.search(r'<w:rPr>(.*?)</w:rPr>', r, re.S)
    rp = rp.group(1) if rp else ""
    b = bool(re.search(r'<w:b/>|<w:b w:val="(1|true)"/>', rp))
    i = bool(re.search(r'<w:i/>|<w:i w:val="(1|true)"/>', rp))
    u = bool(re.search(r'<w:u w:val="(?!none)[^"]+"', rp))
    return b, i, u

def parse_runs(p):
    """Runs in order; hyperlink runs carry the link. Images appear as {'img': path}."""
    out = []
    # tokenise hyperlinks and plain runs in document order
    for m in re.finditer(r'<w:hyperlink ([^>]*)>(.*?)</w:hyperlink>|<w:r[ >].*?</w:r>', p, re.S):
        if m.group(1) is not None:
            attrs = m.group(1)
            rid = re.search(r'r:id="(rId\d+)"', attrs)
            anchor = re.search(r'w:anchor="([^"]+)"', attrs)
            link = rels.get(rid.group(1)) if rid else ("#" + anchor.group(1) if anchor else None)
            for r in re.finditer(r'<w:r[ >].*?</w:r>', m.group(2), re.S):
                out.extend(run_items(r.group(0), link))
        else:
            out.extend(run_items(m.group(0), None))
    # field-code hyperlinks (HYPERLINK "url") — mark following text
    return out

def run_items(r, link):
    items = []
    b, i, u = run_props(r)
    for tok in re.finditer(r'<w:t(?: [^>]*)?>([^<]*)</w:t>|<w:tab/>|<w:br/>|r:embed="(rId\d+)"|<w:instrText[^>]*>([^<]*)</w:instrText>', r):
        if tok.group(0) == "<w:tab/>": items.append({"t": "\t", "b": b, "i": i, "u": u, "l": link})
        elif tok.group(0) == "<w:br/>": items.append({"br": True})
        elif tok.group(2): items.append({"img": rels.get(tok.group(2))})
        elif tok.group(3) is not None:
            items.append({"instr": html.unescape(tok.group(3))})
        else: items.append({"t": html.unescape(tok.group(1)), "b": b, "i": i, "u": u, "l": link})
    return items

def para(p):
    st = re.search(r'<w:pStyle w:val="([^"]+)"', p)
    npr = re.search(r'<w:numPr>(.*?)</w:numPr>', p, re.S)
    label = None; lvl = 0
    if npr:
        nid = re.search(r'<w:numId w:val="(\d+)"', npr.group(1)); il = re.search(r'<w:ilvl w:val="(\d+)"', npr.group(1))
        nid = nid.group(1) if nid else None; lvl = int(il.group(1)) if il else 0
        if nid and nid != "0" and nid in nummap:
            ab = nummap[nid]; lv = abstract.get(ab, {})
            fmt, txt, start = lv.get(lvl, ("decimal", "%1.", 1))
            start = overrides.get((nid, lvl), start)
            c = counters.setdefault(ab, [None]*9)
            c[lvl] = start if c[lvl] is None else c[lvl] + 1
            for k in range(lvl+1, 9): c[k] = None
            if fmt == "bullet": label = "•"
            elif fmt == "none": label = ""
            else:
                def sub(mm):
                    k = int(mm.group(1)) - 1
                    f2 = lv.get(k, ("decimal", "", 1))[0]
                    return fmtnum(f2, c[k] if c[k] is not None else lv.get(k, ("decimal","",1))[2])
                label = re.sub(r'%(\d)', sub, txt)
    ind = re.search(r'<w:ind [^>]*w:left="(\d+)"', p)
    jc = re.search(r'<w:jc w:val="([^"]+)"', p)
    return {"k": "p", "style": st.group(1) if st else "", "label": label, "lvl": lvl,
            "indent": int(ind.group(1)) if ind else 0, "jc": jc.group(1) if jc else "", "runs": parse_runs(p)}

body = x[x.find("<w:body>") + 8:]
blocks = []
pos = 0
for m in re.finditer(r'<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>|<w:p/>', body, re.S):
    s = m.group(0)
    if s.startswith("<w:tbl>"):
        rows = []
        for tr in re.finditer(r'<w:tr[ >].*?</w:tr>', s, re.S):
            cells = []
            for tc in re.finditer(r'<w:tc>.*?</w:tc>', tr.group(0), re.S):
                cells.append([para(pp.group(0)) for pp in re.finditer(r'<w:p[ >].*?</w:p>', tc.group(0), re.S)])
            rows.append(cells)
        blocks.append({"k": "tbl", "rows": rows})
    elif s == "<w:p/>":
        blocks.append({"k": "p", "style": "", "label": None, "lvl": 0, "indent": 0, "jc": "", "runs": []})
    else:
        blocks.append(para(s))
json.dump(blocks, open(f"{D}/blocks.json", "w"), ensure_ascii=False)
print(len(blocks), "blocks")
