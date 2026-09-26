"""Curriculum blocks -> platform day files (Days 2-18), trainer notes and the admin curriculum copy.

Usage (see build/curriculum/README.md):
  python3 build/curriculum/parse.py <unzipped docx dir>
  python3 build/curriculum/convert.py <unzipped docx dir> <repo dir>

Day 1 (build/days/day01.js and its "1:" notes) is kept as it is. Log-in credentials never
leave the machine: they are replaced by a link to the credentials document, and the run
stops if any would still reach the output.
"""
import json, re, os, sys, shutil, html as H

CUR = os.path.abspath(sys.argv[1])
REPO = os.path.abspath(sys.argv[2])
B = json.load(open(os.path.join(CUR, "blocks.json"), encoding="utf8"))

def text(b):
    if b["k"] == "tbl":
        return " ".join(text(p) for row in b["rows"] for cell in row for p in cell)
    return "".join(r.get("t", "") for r in b["runs"])

# ---------- redaction: credentials never leave this machine ----------
CRED = re.compile(r"^\s*(user ?name|(\d+(st|nd|rd|th)\s+)?pass ?word)\b.*?:", re.I)
CRED_DOC = "https://docs.google.com/document/d/1bX1SuRYrmN_5LobDW3YJuuABBnrdGo99/edit#heading=h.z008zgez2whl"
CRED_HTML = ('🔒 Log-in credentials aren’t stored on the platform. '
             f'Get them from the <a href="{CRED_DOC}" target="_blank" rel="noopener noreferrer">credentials document</a>.')
# links that are never published: the Nitro Pro installer and its install video (Day 1)
BLOCKED_LINKS = ["14FSK6PBlnMlughay5emW2NoNYHMmYJoz", "1NOknYf-njzXxQmdaYHDkMFCWHY_Gc2Mj"]
def is_cred(b):
    if b["k"] != "p": return False
    t = text(b).strip()
    if not CRED.match(t): return False
    return not re.fullmatch(r".*:\s*_+\s*", t)          # blank placeholders (Day 0) are fine

# ---------- day ranges ----------
H1 = [i for i, b in enumerate(B) if b["k"] == "p" and b["style"] == "Heading1" and text(b).strip()]
day_start = {}
for i in H1:
    m = re.match(r"\s*day\s+(\d+)", text(B[i]), re.I)
    if m: day_start[int(m.group(1))] = i
days = sorted(day_start)
def day_range(n):
    s = day_start[n]
    later = [day_start[k] for k in days if k > n]
    return s, (later[0] if later else len(B))

FAC = re.compile(r"^\s*(\d+\.\s*)?(facilitator[’']?s?\b|.*facilitator[’']s reference)", re.I)
def is_heading(b): return b["k"] == "p" and b["style"].startswith("Heading") and text(b).strip()
def hlevel(b): return int(b["style"][-1]) if b["style"][-1].isdigit() else 9
def is_stars(b): return b["k"] == "p" and re.fullmatch(r"\s*\*{6,}\s*", text(b)) is not None
def is_fac(b): return b["k"] == "p" and FAC.match(text(b).strip() or "x") is not None
BOUNDARY_WORDS = re.compile(r"^(AM|PM)\b|^Entire Day|^(FOR YOUR )?HOMEWORK|^Topics?:|^Additional Activity|^Here are some additional resources|^Instructions for Requesting|^Saving Medical Bills|^Attorney Calendar Management Activity|^Live Demo|^Materials For Additional Reference", re.I)
def strip_label(t): return re.sub(r"^\s*\d+\.\s*", "", t).strip()
def is_boundary(b, first):
    if b["k"] != "p" or is_fac(b): return False
    t = text(b).strip()
    if not t: return False
    core = strip_label(t)
    if re.match(r"^(All trainees|The only valid)", core): return False
    if b["style"] == "Heading1" and not first: return True
    if b["style"].startswith("Heading") and hlevel(b) <= 4 and (BOUNDARY_WORDS.search(core) or (b["label"] and re.fullmatch(r"\d+\.", b["label"]) and b["lvl"] == 0)):
        return True
    if b["style"].startswith("Heading") and hlevel(b) <= 2 and re.match(r"^\d+\.\s", t):
        return True
    return False

def roles(lo, hi):
    """Mark each block trainee/trainer. Returns list of 'trainer'|'trainee'."""
    role = ["trainee"] * (hi - lo)
    i = lo
    while i < hi:
        b = B[i]
        if b["k"] == "tbl" and re.search(r"correct answer|ideal answer|answer key", text(b), re.I):
            role[i - lo] = "trainer"; i += 1; continue
        if not is_fac(b): i += 1; continue
        t = text(b).strip()
        role[i - lo] = "trainer"
        j = i + 1
        answer = re.search(r"answer key", t, re.I)
        RELAY_V = r"\b(send|share|post|give|provide)\b"
        RELAY_O = r"\bGC\b|group chat|following|these|this material|this activity|this instruction|recordings|trainees"
        relay = (not answer) and re.search(RELAY_V, t, re.I) and re.search(RELAY_O, t, re.I)
        if relay:
            i = j; continue            # the material it introduces is for trainees
        if re.fullmatch(r"(\d+\.\s*)?Facilitator[’']?s? Notes?:\s*", t, re.I):
            k = j
            while k < hi and not text(B[k]).strip(): k += 1
            nt = text(B[k]).strip() if k < hi else ""
            if re.match(r"^(\d+\.\s*)?" + RELAY_V[2:-2] + r"\b", nt, re.I) or (re.search(RELAY_V, nt, re.I) and re.search(r"\bGC\b|group chat", nt, re.I)):
                for m in range(j, k + 1): role[m - lo] = "trainer"
                i = k + 1; continue
        if is_heading(b) and hlevel(b) == 1:          # a whole facilitator-only part (Day 18's reference for the demo)
            while j < hi and not (B[j]["k"] == "p" and B[j]["style"] == "Heading1" and text(B[j]).strip()):
                role[j - lo] = "trainer"; j += 1
            i = j; continue
        if answer:                                    # the answer-key note and its link line(s) only
            while j < hi and (not text(B[j]).strip() or re.fullmatch(r"\s*https?://\S+\s*", text(B[j]))):
                role[j - lo] = "trainer"; j += 1
            i = j; continue
        if re.search(r"deck link", t, re.I):
            while j < hi and (not text(B[j]).strip() or re.fullmatch(r"\s*https?://\S+\s*", text(B[j]))):
                role[j - lo] = "trainer"; j += 1
            i = j; continue
        if is_heading(b):
            lvl = hlevel(b)
            while j < hi:
                nb = B[j]
                if is_fac(nb) or re.match(r"^\s*\*{3}\s*Free Communication", text(nb)) or re.search(r"Metrics\s*$", text(nb).strip()): break
                if is_heading(nb) and not is_fac(nb) and (hlevel(nb) <= max(lvl, 3) or is_boundary(nb, False)): break
                if nb["k"] == "p" and nb["style"] == "Heading1" and text(nb).strip() and not is_fac(nb): break
                role[j - lo] = "trainer"; j += 1
        elif re.search(r"deck link", t, re.I):
            # the deck title + its link line(s)
            while j < hi and (not text(B[j]).strip() or re.fullmatch(r"\s*https?://\S+\s*", text(B[j]))):
                role[j - lo] = "trainer"; j += 1
        elif t.endswith(":") or re.match(r"^\s*\d+\.\s*facilitator", t, re.I) or b["label"]:
            lvl0 = b["label"] is not None and b["lvl"] == 0
            while j < hi:
                nb = B[j]
                if is_fac(nb) or re.match(r"^\s*\*{3}\s*Free Communication", text(nb)) or re.search(r"Metrics\s*$", text(nb).strip()): break
                if is_stars(nb) or is_boundary(nb, False): break
                if is_heading(nb) and not is_fac(nb): break
                if lvl0 and nb["k"] == "p" and nb["label"] and nb["lvl"] == 0 and re.fullmatch(r"\d+\.", nb["label"] or "") and not is_fac(nb): break
                role[j - lo] = "trainer"; j += 1
        i = j
    return role

# ---------- rendering ----------
IMG_USE = {}          # media path -> "public" | "trainer"
def img_url(media, trainer, day):
    name = os.path.basename(media)
    if trainer:
        IMG_USE.setdefault(media, set()).add(("trainer", day))
        return f"/trainer/img/day{day}-{name}"
    IMG_USE.setdefault(media, set()).add(("public", day))
    return f"/ft/day{day}/img/{name}"

def esc(s): return H.escape(s, quote=True)
def drive_kind(url, context):
    if "/folders/" in url: return "doc"
    return "video" if re.search(r"video|watch|recording|tutorial|demo|listen|audio|lecture", context, re.I) else "doc"

def canva_view(url):
    m = re.match(r"https://www\.canva\.com/design/([^/]+)/([^/]+)/", url)
    return (f"https://www.canva.com/design/{m.group(1)}/{m.group(2)}/view", f"https://www.canva.com/design/{m.group(1)}/{m.group(2)}/view?embed") if m else (url, None)

def link_html(url, label_html, context, trainer):
    if any(k in url for k in BLOCKED_LINKS):
        return "<i>[link not included on the platform]</i>"
    if "canva.com/design/" in url:
        view, _ = canva_view(url)
        return f'<a href="{esc(view)}" target="_blank" rel="noopener noreferrer">{label_html if not label_html.startswith("https://www.canva.com") else esc(view)}</a>'
    if re.search(r"drive\.google\.com/(file/d/|open\?|drive/(u/\d+/)?folders/)", url):
        title = re.sub(r"\s+", " ", context).strip()[:90] or "Google Drive"
        return f'<a class="viewer-link" data-kind="{drive_kind(url, context)}" data-title="{esc(title)}" href="{esc(url)}">{label_html}</a>'
    return f'<a href="{esc(url)}" target="_blank" rel="noopener noreferrer">{label_html}</a>'

def runs_html(runs, context, trainer, day):
    out, imgs = [], []
    groups = []
    for r in runs:
        if "img" in r: imgs.append(r["img"]); continue
        if "instr" in r: continue
        if r.get("br"): groups.append(("br", None, None)); continue
        t = r["t"].replace("\t", " ")
        key = (bool(r.get("b")), bool(r.get("i")), bool(r.get("u")) and not r.get("l"), r.get("l"))
        if groups and groups[-1][0] == "t" and groups[-1][1] == key: groups[-1] = ("t", key, groups[-1][2] + t)
        else: groups.append(("t", key, t))
    for g in groups:
        if g[0] == "br": out.append("<br>"); continue
        (b, i, u, l), t = g[1], g[2]
        s = esc(t)
        if u: s = f"<u>{s}</u>"
        if i: s = f"<i>{s}</i>"
        if b and t.strip(): s = f"<b>{s}</b>"
        if l and not l.startswith("#"): s = link_html(l, s, context, trainer)
        out.append(s)
    return "".join(out), imgs

CANVA_PLAIN = re.compile(r"^\s*(https://www\.canva\.com/design/\S+)\s*$")
def para_html(b, context, trainer, day):
    t = text(b)
    if is_stars(b): return '<hr class="stars">'
    if is_cred(b): return None                      # handled as a group by the caller
    body, imgs = runs_html(b["runs"], context, trainer, day)
    if b["runs"] and not t.strip() and not imgs: return ""
    shots = ""
    if imgs:
        toks = t.split()
        caps = toks if toks and len(toks) == len(imgs) and all(re.fullmatch(r"[\d.]+", x) for x in toks) else None
        figs = "".join(f'<figure><a href="{img_url(m, trainer, day)}" target="_blank"><img src="{img_url(m, trainer, day)}" alt="" loading="lazy"></a>{f"<figcaption>{esc(caps[k])}</figcaption>" if caps else ""}</figure>' for k, m in enumerate(imgs))
        shots = f'<div class="shots">{figs}</div>'
        if caps: body = ""
    if not body.strip():
        return shots
    # a trainee-facing Canva exercise link on its own line is embedded, like Day 1's Client Identification Exercise
    m = CANVA_PLAIN.match(t)
    if m and not trainer and not any("img" in r for r in b["runs"]):
        view, embed = canva_view(m.group(1))
        if embed:
            fid = "cv" + re.sub(r"\W", "", view.split("/design/")[1].split("/")[0])
            return (f'<div class="canva-frame" id="{fid}"><iframe loading="lazy" title="Canva" src="{esc(embed)}" allowfullscreen="allowfullscreen" allow="fullscreen"></iframe></div>'
                    f'<div class="actions"><span></span><div class="btn-row"><button class="btn ghost" type="button" data-fullscreen="{fid}">⛶ Full screen</button>'
                    f'<a class="btn" href="{esc(view)}" target="_blank" rel="noopener noreferrer">Open in Canva ↗</a></div></div>')
    label = f'<span class="lbl">{esc(b["label"])}</span>' if b["label"] else ""
    st = b["style"]
    if st.startswith("Heading"):
        tag = "h3" if hlevel(b) <= 2 else ("h4" if hlevel(b) == 3 else "h5")
        hl = f'<span class="lbl-h">{esc(b["label"])}</span>' if b["label"] else ""
        return f"<{tag}>{hl}{body}</{tag}>" + shots
    if b["label"] is not None:
        return f'<p class="li" style="--lvl:{b["lvl"]}">{label}<span>{body}</span></p>' + shots
    return f"<p>{body}</p>" + shots

def table_html(b, trainer, day):
    rows = []
    for row in b["rows"]:
        cells = []
        for cell in row:
            inner = "".join(x for x in (para_html(p, text(p), trainer, day) for p in cell) if x)
            cells.append(f"<td>{inner}</td>")
        rows.append("<tr>" + "".join(cells) + "</tr>")
    return '<div class="tbl-wrap"><table class="ft-table">' + "".join(rows) + "</table></div>"

def render(idxs, trainer, day):
    """Render a run of block indexes; consecutive credential lines collapse into one note."""
    out, prev_ctx, in_cred = [], "", False
    for i in idxs:
        b = B[i]
        if b["k"] == "tbl":
            out.append(table_html(b, trainer, day)); in_cred = False; continue
        if is_cred(b):
            if not in_cred: out.append(f'<p class="redacted">{CRED_HTML}</p>')
            in_cred = True; continue
        t = text(b)
        if in_cred and not t.strip(): continue
        in_cred = False
        ctx = (prev_ctx + " " + t).strip()
        h = para_html(b, ctx if re.fullmatch(r"\s*https?://\S+\s*", t) else t, trainer, day)
        if h: out.append(h)
        if t.strip() and not re.fullmatch(r"\s*https?://\S+\s*", t): prev_ctx = t
    return "\n".join(out)

# ---------- days 2..18 ----------
notes = json.load(open(os.path.join(REPO, "trainer", "notes.json"), encoding="utf8"))["slots"]
notes = {k: v for k, v in notes.items() if k.startswith("1:")}
summary = []
for n in range(2, 19):
    lo, hi = day_range(n)
    heading = re.sub(r"\s+", " ", text(B[lo])).strip()
    title = re.sub(r"^day\s+\d+:?\s*", "", heading, flags=re.I).strip()
    role = roles(lo + 1, hi)
    # split into sections
    secs, cur = [], None
    for i in range(lo + 1, hi):
        b = B[i]
        if is_boundary(b, False) and role[i - lo - 1] == "trainee":
            cur = {"h": strip_label(re.sub(r"\s+", " ", text(b))).rstrip(), "idx": [], "head": i}
            secs.append(cur); continue
        if b["k"] == "p" and b["style"] == "Heading1" and not text(b).strip(): continue
        if cur is None:
            if not text(b).strip() and not (b["k"] == "p" and any("img" in r for r in b["runs"])) and b["k"] != "tbl": continue
            cur = {"h": None, "idx": [], "head": None}; secs.append(cur)
        cur["idx"].append(i)
    out = []
    for si, s in enumerate(secs):
        if s["h"] is None:
            first = next((text(B[i]) for i in s["idx"] if text(B[i]).strip()), "Overview")
            s["h"] = strip_label(re.sub(r"\s+", " ", first)).strip()
            if s["idx"] and strip_label(text(B[s["idx"][0]]).strip()) == s["h"] and B[s["idx"][0]]["k"] == "p" and all(r.get("b") for r in B[s["idx"][0]]["runs"] if r.get("t","").strip()):
                s["idx"] = s["idx"][1:]
        sid = f"s{si+1}"
        parts, slot_no, k = [], 0, 0
        idx = s["idx"]
        while k < len(idx):
            r = role[idx[k] - lo - 1]
            run = [idx[k]]
            while k + 1 < len(idx) and role[idx[k + 1] - lo - 1] == r:
                k += 1; run.append(idx[k])
            k += 1
            if r == "trainer":
                html = render(run, True, n).strip()
                if html:
                    slot_no += 1
                    key = f"{n}:{sid}-{slot_no}"
                    notes[key] = f'<div class="facilitator">{html}</div>'
                    parts.append(f'<div class="trainer-slot" data-slot="{key}"></div>')
            else:
                html = render(run, False, n).strip()
                if html: parts.append(html)
        body = "\n".join(parts).strip()
        trainer_only = all('class="trainer-slot"' in p for p in parts) if parts else False
        out.append({"id": sid, "h": s["h"], **({"trainerOnly": True} if trainer_only else {}), "html": body})
    js = f"const DAY{n} = {{\n  id: {n},\n  title: {json.dumps(title, ensure_ascii=False)},\n  heading: {json.dumps(heading, ensure_ascii=False)},\n  sections: " + json.dumps(out, ensure_ascii=False, indent=2).replace("\n", "\n  ") + "\n};\n"
    open(os.path.join(REPO, "build", "days", f"day{n:02d}.js"), "w", encoding="utf8").write(js)
    summary.append((n, heading, [(x["h"][:50], "T" if x.get("trainerOnly") else "", len(x["html"])) for x in out]))

json.dump({"slots": notes}, open(os.path.join(REPO, "trainer", "notes.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)

# ---------- admin: the whole curriculum (every day, facilitator content included; credentials removed) ----------
first = [i for i, b in enumerate(B) if b["k"] == "p" and text(b).strip()][0]
cdays = []
title_blocks = list(range(0, day_start[min(days)]))
intro = render([i for i in title_blocks], True, 0)
for n in days:
    lo, hi = day_range(n)
    cdays.append({"id": n, "heading": re.sub(r"\s+", " ", text(B[lo])).strip(), "html": render(list(range(lo + 1, hi)), True, n)})
json.dump({"intro": intro, "days": cdays}, open(os.path.join(REPO, "trainer", "curriculum.json"), "w", encoding="utf8"), ensure_ascii=False)

# ---------- images ----------
os.makedirs(os.path.join(REPO, "trainer", "img"), exist_ok=True)
copied = 0
for media, uses in IMG_USE.items():
    src = os.path.join(CUR, "word", media)
    for kind, day in uses:
        dst = os.path.join(REPO, "trainer", "img", f"day{day}-{os.path.basename(media)}") if kind == "trainer" else os.path.join(REPO, "ft", f"day{day}", "img", os.path.basename(media))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.exists(dst): shutil.copyfile(src, dst); copied += 1
for n, h, secs in summary:
    print(f"Day {n}: {h}")
    for s in secs: print("   ", s)
print("notes:", len(notes), "images copied:", copied)

# ---------- safety: no credential may reach the output ----------
leaks = []
for root, _, files in os.walk(REPO):
    if "/.git" in root: continue
    for f in files:
        if not f.endswith((".js", ".json", ".html")): continue
        body = open(os.path.join(root, f), encoding="utf8", errors="ignore").read()
        for m in re.finditer(r"(?:User ?name|Password)\s*:\s*([^<\n\\]{3,})", body, re.I):
            if not re.fullmatch(r"\s*_+\s*", m.group(1)): leaks.append((f, m.group(0)[:20] + "…"))
if leaks:
    sys.exit(f"STOP: credentials would be published: {leaks[:5]}")
print("credential check: clean")
