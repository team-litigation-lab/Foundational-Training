"""This program's first-load speed edits to the EA/PA engine's index.html, applied by build.py.

Opening a program from the Training Directory used to sit on a blank cover for
several seconds. These are the engine-level reasons, and the fixes. Measured in
headless Chromium against a gzipped copy of the built site, median of 7 runs:
first paint on a 1.6 Mbps / 150 ms connection went from 1432 ms to 904 ms.

Besides the patches below, `apply()` runs extract_assets(): the big base64
blobs the engine carries inline are written out as real files and the
constants are pointed at them. That took 264 KB of base64 out of index.html,
177 KB of it off the gzipped document — a third of its transfer size. The
first paint doesn't move (the sign-in gate paints from the page head, before
any of this), but the page becomes interactive sooner: DOMContentLoaded went
from 6452 ms to 5740 ms, same 1.6 Mbps / 150 ms connection, median of 7 runs.

Each of these belongs in EA-PA-TRAINING's own index.html, which is where the
engine lives — the whole platform family is built from it, so every course is
slow in the same way until it is fixed there. Each patch below is skipped when
the engine already carries it (the `marker`), exactly like build.py's
`if "window.portalGate" not in s` block. Once EA/PA ships these, this file
becomes a no-op and can go.
"""
import re

FONTS = ("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700"
         "&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap")

# (marker, old, new) — applied only when `marker` is absent from index.html.
PATCHES = [
    # 1. Nothing in the page head blocks the first paint any more.
    (
        'media="print"',
        '''<link href="''' + FONTS + '''" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>''',
        '''<!-- Fonts don't hold up the first paint: the sheet is fetched as a non-blocking
     "print" stylesheet, then switched to all once it has arrived. The page is
     readable in the fallback face for the moment before that happens. -->
<link rel="stylesheet" href="''' + FONTS + '''" media="print" onload="this.media='all';this.onload=null">
<noscript><link rel="stylesheet" href="''' + FONTS + '''"></noscript>
<!-- jsPDF is NOT loaded here. It is ~90 KB over the wire and only certificates,
     handouts and lab result sheets need it, so ensureJsPdf() pulls it in on the
     first download instead of blocking every trainee's first paint with it. -->
<!-- Note for anyone tempted to add <link rel="preload"> for the scripts at the
     end of this file: it was tried and measured, and it made things worse.
     Preloading all 32 of them makes those downloads compete with this document
     for bandwidth, and the document is what produces the first paint. On a
     1.6 Mbps / 150 ms connection the first paint went from 1424 ms to 1908 ms
     with preloads, and to 908 ms with none. fetchpriority="low" landed in
     between (1184 ms). Leave them to the parser. -->''',
    ),
    # 2. The record-to-status step, so a record already in hand needs no fetch.
    (
        'function approvalFromRecord',
        '''async function getApprovalStatus(traineeId){
  const rec = await sharedGet("trainee:"+traineeId);
  if(!rec) return "unknown";''',
        '''function approvalFromRecord(rec){
  if(!rec) return "unknown";''',
    ),
    (
        'return approvalFromRecord(await sharedGet',
        '''  if(rec.approved===false && rec.rejected) return "rejected";
  return "pending";
}
''',
        '''  if(rec.approved===false && rec.rejected) return "rejected";
  return "pending";
}
async function getApprovalStatus(traineeId){
  return approvalFromRecord(await sharedGet("trainee:"+traineeId));
}
''',
    ),
    # 3. loadAll() read 28 keys one await at a time. The independent ones go in
    #    two batches, split either side of the migrations so the order holds.
    (
        'storeGet("day-progress"), storeGet("trainee-name")',
        '''async function loadAll(){
  const p = await storeGet("day-progress");
  state.progress = p || {};
  const n = await storeGet("trainee-name");
  state.traineeName = n || "";
  const bt = await storeGet("trainee-batch");
  state.traineeBatch = bt || "";
  const pr = await storeGet("practice-progress");
  state.practiceProgress = pr || {};
  const laGlobal = await storeGet("lab-attempts-global");
  if(typeof laGlobal === "number"){''',
        '''async function loadAll(){
  // These keys don't depend on each other, so they are read together rather
  // than one await at a time. With window.storage present that turned ~17
  // serial round trips into one batch; on plain localStorage it costs nothing.
  // The two batches either side of the migrations keep the original order:
  // everything below was read before migrateDayOrder() ran, and everything in
  // the second batch after it.
  const [p, n, bt, pr, laGlobal, laByDay, aud, lrs, nt, cla, d10w, sb, rph, sp, ls, qa, dom] =
    await Promise.all([
      storeGet("day-progress"), storeGet("trainee-name"), storeGet("trainee-batch"),
      storeGet("practice-progress"), storeGet("lab-attempts-global"), storeGet("lab-attempts-by-day"),
      storeGet("admin-unlocked-days"), storeGet("lab-attempts-reset-seen"), storeGet("notes"),
      storeGet("completed-lab-actions"), storeGet("day10-window"), storeGet("submissions"),
      storeGet("roleplayHistory"), storeGet("slide-progress"), storeGet("last-slide"),
      storeGet("quick-check-answers"), storeGet("day-order-migrated"),
    ]);
  state.progress = p || {};
  state.traineeName = n || "";
  state.traineeBatch = bt || "";
  state.practiceProgress = pr || {};
  if(typeof laGlobal === "number"){''',
    ),
    (
        # This patch only removes lines, so it has no text of its own to look for:
        # it goes with the batch above, and shares its marker.
        'storeGet("day-progress"), storeGet("trainee-name")',
        '''  const laByDay = await storeGet("lab-attempts-by-day");
  state.labAttemptsByDay = (laByDay && typeof laByDay==="object") ? laByDay : {};
  state.labAttemptsGlobal = labAttemptsTotal(state.labAttemptsByDay);
  const aud = await storeGet("admin-unlocked-days");
  state.adminUnlockedDays = Array.isArray(aud) ? aud : [];
  const lrs = await storeGet("lab-attempts-reset-seen");
  state.labAttemptsResetSeen = lrs || undefined;
  const nt = await storeGet("notes");
  state.notes = nt || [];
  const cla = await storeGet("completed-lab-actions");
  state.completedLabActions = (cla && typeof cla === "object") ? cla : {};
  const d10w = await storeGet("day10-window");
  state.day10Window = (d10w && typeof d10w === "object") ? d10w : null;
  const sb = await storeGet("submissions");
  state.submissions = sb || [];
  const rph = await storeGet("roleplayHistory");
  state.roleplayHistory = rph || [];
  const sp = await storeGet("slide-progress");
  state.slideProgress = sp || {};
  const ls = await storeGet("last-slide");
  state.lastSlide = (ls && typeof ls==="object") ? ls : {};
  const qa = await storeGet("quick-check-answers");
  state.qcAnswers = (qa && typeof qa==="object") ? qa : {};
  const dom = await storeGet("day-order-migrated");
  state.dayOrderMigrated = (dom && typeof dom==="object") ? dom : {};''',
        '''  state.labAttemptsByDay = (laByDay && typeof laByDay==="object") ? laByDay : {};
  state.labAttemptsGlobal = labAttemptsTotal(state.labAttemptsByDay);
  state.adminUnlockedDays = Array.isArray(aud) ? aud : [];
  state.labAttemptsResetSeen = lrs || undefined;
  state.notes = nt || [];
  state.completedLabActions = (cla && typeof cla === "object") ? cla : {};
  state.day10Window = (d10w && typeof d10w === "object") ? d10w : null;
  state.submissions = sb || [];
  state.roleplayHistory = rph || [];
  state.slideProgress = sp || {};
  state.lastSlide = (ls && typeof ls==="object") ? ls : {};
  state.qcAnswers = (qa && typeof qa==="object") ? qa : {};
  state.dayOrderMigrated = (dom && typeof dom==="object") ? dom : {};''',
    ),
    (
        'const [lv, tl, tds, isn, rn, cn, wl, ld, tid0]',
        '''  const lv = await storeGet("last-view");
  state.lastView = (lv && typeof lv==="object") ? lv : null;
  const tl = await storeGet("task-log"); state.taskLog = Array.isArray(tl) ? tl : [];
  state.taskDaySince = (await storeGet("task-day-since")) || {};
  const isn = await storeGet("intro-seen"); state.introSeen = (isn && typeof isn==="object") ? isn : {};
  const rn = await storeGet("reg-name");
  state.regName = (rn && rn.last) ? rn : null;
  const cn = await storeGet("cert-name");
  state.certName = (typeof cn==="string") ? cn : "";
  const wl = await storeGet("work-log");
  state.workLog = Array.isArray(wl) ? wl : [];
  const ld = await storeGet("lab-drafts");
  state.labDrafts = (ld && typeof ld==="object") ? ld : {};
  let tid = await storeGet("trainee-id");''',
        '''  const [lv, tl, tds, isn, rn, cn, wl, ld, tid0] = await Promise.all([
    storeGet("last-view"), storeGet("task-log"), storeGet("task-day-since"),
    storeGet("intro-seen"), storeGet("reg-name"), storeGet("cert-name"),
    storeGet("work-log"), storeGet("lab-drafts"), storeGet("trainee-id"),
  ]);
  state.lastView = (lv && typeof lv==="object") ? lv : null;
  state.taskLog = Array.isArray(tl) ? tl : [];
  state.taskDaySince = tds || {};
  state.introSeen = (isn && typeof isn==="object") ? isn : {};
  state.regName = (rn && rn.last) ? rn : null;
  state.certName = (typeof cn==="string") ? cn : "";
  state.workLog = Array.isArray(wl) ? wl : [];
  state.labDrafts = (ld && typeof ld==="object") ? ld : {};
  let tid = tid0;''',
    ),
    # 4. Boot fetched "trainee:<id>" twice in a row. Once, and alongside the restore.
    (
        'const traineeRecordP',
        '''  if(state.traineeId && await cloudRestore(state.traineeId)) await loadAll();''',
        '''  // The trainee's own record ("trainee:<id>") and their cloud snapshot
  // ("progress:<id>") are different keys, so ask for both at once instead of
  // waiting for the restore to finish first. The record answers both the
  // approval status and the assigned roleplay below, which used to be two
  // more round trips for the very same key. cloudRestore only touches
  // PERSONAL_KEYS, and trainee-id is not one of them, so the id cannot change
  // underneath this request.
  const traineeRecordP = state.traineeId
    ? sharedGet("trainee:"+state.traineeId).catch(()=>null)
    : Promise.resolve(null);
  if(state.traineeId && await cloudRestore(state.traineeId)) await loadAll();''',
    ),
    (
        'const traineeRecord = await traineeRecordP',
        '''    const status = await getApprovalStatus(state.traineeId);
    if(status==="approved"){''',
        '''    const traineeRecord = await traineeRecordP;
    const status = approvalFromRecord(traineeRecord);
    if(status==="approved"){''',
    ),
    (
        'Already in hand from traineeRecordP',
        '''      try{
        const rec = await sharedGet("trainee:"+state.traineeId);
        if(rec) state.assignedRoleplay = rec.assignedRoleplay || null;
      }catch(e){ /* best-effort — don't block app load on this */ }''',
        '''      // Already in hand from traineeRecordP above — no second fetch.
      if(traineeRecord) state.assignedRoleplay = traineeRecord.assignedRoleplay || null;''',
    ),
    # 5. The two PDF entry points that relied on jsPDF being in the head.
    (
        'async function buildAndSavePdf',
        '''function buildAndSavePdf(title, subtitle, bodyLines, filenameBase){
  const { jsPDF } = window.jspdf;''',
        '''async function buildAndSavePdf(title, subtitle, bodyLines, filenameBase){
  // jsPDF is fetched on demand (it is no longer in the page head), so make sure
  // it is here before using it.
  if(!(await ensureJsPdf())){ toast("Couldn't load the PDF tools — try again."); return; }
  const { jsPDF } = window.jspdf;''',
    ),
    (
        'async function downloadNotesPdf',
        '''function downloadNotesPdf(){
  const { jsPDF } = window.jspdf;''',
        '''async function downloadNotesPdf(){
  // jsPDF is fetched on demand (it is no longer in the page head).
  if(!(await ensureJsPdf())){ toast("Couldn't load the PDF tools — try again."); return; }
  const { jsPDF } = window.jspdf;''',
    ),
]


# ---------------------------------------------------------------------------
# Inline base64 assets -> files
# ---------------------------------------------------------------------------
# The engine keeps five assets inline, as base64 inside index.html: the two
# brand logos, the presenter photo, the signature face for certificates, and
# the seven handout workbooks. Base64 is a third bigger than the bytes it
# carries, none of it can be cached on its own, and all of it is re-downloaded
# whenever anything else in the document changes - so every trainee paid for
# the certificate font and all seven workbooks on every visit, whether or not
# they ever opened one.
#
# Written out as files they are fetched once, cached, and only when something
# actually needs them. jsPDF wants base64 rather than a URL for its images and
# fonts, so the three assets the PDFs use are fetched into PDF_ASSETS by
# loadPdfAssets(), which ensureJsPdf() awaits - every PDF path already awaits
# ensureJsPdf(), so the drawing code stays synchronous and keeps the fallbacks
# it already had for a missing asset.
#
# The two logos are a special case: LSH's own files (js/lsh-logo-dark.png and
# favicon.png) are already deployed as static assets, so build.py used to
# base64 them into the document for no gain. They are referenced by path now,
# which is why build.py no longer has a data_uri() helper.

BRAND_OLD = r'''/\* =+
   BRAND ASSETS — embedded so the file stays fully self-contained
   =+ \*/
const LOGO_ICON_DATAURI = "data:image/png;base64,[^"]*";
// Legal Support Help logo[^\n]*
const LOGO_FULL_DATAURI = "data:image/png;base64,[^"]*";
const ELIAS_VOICE_NOTE_AUDIO_DATAURI = "";

/\* Image sources: plain data URIs so they work under any hosting security
   headers \(blob: URLs can be blocked\)\. The full logo is stored downscaled\. \*/
const LOGO_ICON_SRC = LOGO_ICON_DATAURI;
const LOGO_FULL_SRC = LOGO_FULL_DATAURI;
const ELIAS_VOICE_NOTE_AUDIO_SRC = ELIAS_VOICE_NOTE_AUDIO_DATAURI;
const CLIENT_AVATAR_SRC = "";'''

BRAND_NEW = '''/* ============================================================
   BRAND ASSETS — served as files, so they are cached and don't
   hold up the first paint
   ============================================================ */
/* Both logos ship as static files already, so inlining them as base64 only
   added weight to this document: the square mark as 8 KB and the full logo as
   32 KB, re-downloaded with every build because they sat inside the HTML.
   Same-origin paths, not blob: URLs, so hosting security headers don't block
   them (img/ft-page-bg.webp is served the same way).
   The full logo is navy and orange with a white outline, on transparent, 646 x 397. */
const LOGO_ICON_SRC = "/favicon.png";
const LOGO_FULL_SRC = "/js/lsh-logo-dark.png";
/* Empty means "no asset": the render sites below leave the element out rather
   than emitting src="", which makes the browser re-request this page. */
const ELIAS_VOICE_NOTE_AUDIO_SRC = "";
const CLIENT_AVATAR_SRC = "";'''

PRESENTER_NEW = '''// The presenter photo (54 KB) is only shown on the slide stage, so it is fetched
// as a file when a lesson opens instead of sitting in this document.
const PRESENTER_IMG = "/img/presenter.webp";'''

SIG_OLD = '''(function installSignatureFont(){
  try{ const st=document.createElement("style"); st.textContent="@font-face{font-family:'LSH Signature';src:url(data:font/ttf;base64,"+SIG_FONT_B64+") format('truetype');font-display:swap;}"; document.head.appendChild(st); }catch(e){}
})();'''

SIG_NEW = '''/* The signature face is only drawn on certificates. As 66 KB of base64 in this
   document it was downloaded by every trainee on every visit; as a file the
   browser fetches it once and only when a certificate page asks for it. */
const SIG_FONT_URL = "/js/lsh-signature.ttf";
(function installSignatureFont(){
  try{ const st=document.createElement("style"); st.textContent="@font-face{font-family:'LSH Signature';src:url("+SIG_FONT_URL+") format('truetype');font-display:swap;}"; document.head.appendChild(st); }catch(e){}
})();'''

HANDOUT_OLD = '''function downloadHandoutXlsx(day){
  const f = HANDOUT_FILES[day]; if(!f){ downloadHandoutCsv(day); return; }
  const bin = atob(f.b64); const bytes = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  saveBlob(new Blob([bytes], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), f.name);
  toast("Excel workbook downloaded — it opens in Excel or Google Sheets.");
}'''

HANDOUT_NEW = '''async function downloadHandoutXlsx(day){
  const name = HANDOUT_FILES[day]; if(!name){ downloadHandoutCsv(day); return; }
  try{
    const r = await fetch("/handouts/"+name);
    if(!r.ok) throw new Error("HTTP "+r.status);
    saveBlob(await r.blob(), name);
    toast("Excel workbook downloaded — it opens in Excel or Google Sheets.");
  }catch(e){
    // The workbook is a file now, so a download can fail where reading an
    // inline string could not. Fall back to the CSV of the same handout.
    console.warn("handout workbook unavailable, using CSV", e);
    downloadHandoutCsv(day);
  }
}'''

JSPDF_OLD = '''async function ensureJsPdf(){
  if(window.jspdf && window.jspdf.jsPDF) return true;'''

JSPDF_NEW = '''/* jsPDF needs its images and fonts as base64, not as URLs, so the three assets
   the PDFs use are fetched once and kept here. ensureJsPdf() warms this cache,
   and every PDF path already awaits it, so the drawing code below stays
   synchronous and keeps its existing fallbacks for a missing asset. */
const PDF_ASSETS = { logoFull:"", logoIcon:"", sigFont:"" };
async function loadPdfAssets(){
  const want = [["logoFull", LOGO_FULL_SRC], ["logoIcon", LOGO_ICON_SRC], ["sigFont", SIG_FONT_URL]];
  await Promise.all(want.map(async ([k, url])=>{
    if(PDF_ASSETS[k]) return;                       // already in hand
    try{
      const r = await fetch(url);
      if(!r.ok) throw new Error("HTTP "+r.status);
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = ""; for(let i=0;i<buf.length;i++) bin += String.fromCharCode(buf[i]);
      PDF_ASSETS[k] = btoa(bin);
    }catch(e){ console.warn("PDF asset skipped: "+url, e); }
  }));
}
async function ensureJsPdf(){
  if(window.jspdf && window.jspdf.jsPDF){ await loadPdfAssets(); return true; }'''

JSPDF2_OLD = '''      if(window.jspdf && window.jspdf.jsPDF) return true;
    }catch(e){}'''

JSPDF2_NEW = '''      if(window.jspdf && window.jspdf.jsPDF){ await loadPdfAssets(); return true; }
    }catch(e){}'''

SIGFONT_VFS_OLD = '''try{ doc.addFileToVFS("LSHSignature.ttf", SIG_FONT_B64); doc.addFont("LSHSignature.ttf", "LSHSignature", "normal"); sigFont = "LSHSignature"; sigStyle = "normal"; }catch(e){ console.warn("signature font skipped", e); }'''

SIGFONT_VFS_NEW = '''try{ if(!PDF_ASSETS.sigFont) throw new Error("signature font not loaded");
    doc.addFileToVFS("LSHSignature.ttf", PDF_ASSETS.sigFont); doc.addFont("LSHSignature.ttf", "LSHSignature", "normal"); sigFont = "LSHSignature"; sigStyle = "normal"; }catch(e){ console.warn("signature font skipped", e); }'''

AVATAR_OLD = '''function clientAvatarSvg(){
  return `<img src="${CLIENT_AVATAR_SRC}" class="client-photo-img" alt="Elias Thorne">`;
}'''

AVATAR_NEW = '''function clientAvatarSvg(){
  // No photo configured: leave the element out. An <img src=""> makes the
  // browser re-request this page as the image, which is a wasted full-document
  // download and a broken-image icon.
  if(!CLIENT_AVATAR_SRC) return "";
  return `<img src="${CLIENT_AVATAR_SRC}" class="client-photo-img" alt="Elias Thorne">`;
}'''

AUDIO_OLD = '''      <audio controls style="width:100%;">
        <source src="${ELIAS_VOICE_NOTE_AUDIO_SRC}" type="audio/mpeg">
        Your browser doesn't support inline audio.
      </audio>'''

AUDIO_NEW = '''      ${ELIAS_VOICE_NOTE_AUDIO_SRC ? `<audio controls style="width:100%;">
        <source src="${ELIAS_VOICE_NOTE_AUDIO_SRC}" type="audio/mpeg">
        Your browser doesn't support inline audio.
      </audio>` : `<p style="font-size:12.5px;color:rgba(255,255,255,.85);margin:0;">The voice note isn't available on this platform — your trainer will play it in session.</p>`}'''


def extract_assets(s, root, fail):
    """Writes the engine's inline base64 assets out as files, and points the
    constants at them. `root` is the repository root (where index.html lands)."""
    import base64, json, os

    def write(relpath, data):
        full = os.path.join(root, relpath)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(data)
        return len(data)

    def sub(pattern, repl, literal=True, flags=0):
        nonlocal s
        if literal:
            pattern = re.escape(pattern)
        s, n = re.subn(pattern, lambda m: repl, s, count=1, flags=flags)
        if not n:
            fail("MISSING for the inline-asset move: " + pattern[:90] +
                 "\n  -> the EA/PA engine changed here. Update build/ft_perf_patches.py, or drop"
                 "\n     this step if EA-PA-TRAINING now serves the asset as a file itself.")

    def pull(pattern, what):
        m = re.search(pattern, s)
        if not m:
            fail("MISSING the inline %s blob - update build/ft_perf_patches.py." % what)
        return m.group(1)

    def report(what, dest, nbytes, b64len):
        print("    %-14s -> %s (%.1f KB, was %.1f KB of base64 in index.html)"
              % (what, dest, nbytes / 1024, b64len / 1024))

    # --- the brand assets block: both logos become paths, and the two empty
    #     "no asset" constants stop being rendered as src="" (see below).
    sub(BRAND_OLD, BRAND_NEW, literal=False)

    # --- the presenter photo
    b64 = pull(r'const PRESENTER_IMG = "data:image/webp;base64,([^"]*)";', "PRESENTER_IMG")
    report("PRESENTER_IMG", "img/presenter.webp",
           write("img/presenter.webp", base64.b64decode(b64)), len(b64))
    sub(r'const PRESENTER_IMG = "data:image/webp;base64,[^"]*";', PRESENTER_NEW, literal=False)

    # --- the signature face: a file for @font-face, base64 on demand for jsPDF
    b64 = pull(r'const SIG_FONT_B64 = "([^"]*)";', "SIG_FONT_B64")
    report("SIG_FONT_B64", "js/lsh-signature.ttf",
           write("js/lsh-signature.ttf", base64.b64decode(b64)), len(b64))
    sub(r'const SIG_FONT_B64 = "[^"]*";\n', "", literal=False)
    sub(SIG_OLD, SIG_NEW)

    # --- the handout workbooks: one file each, and a day -> filename manifest
    books = json.loads(pull(r'const HANDOUT_FILES = (\{"\d+".*?\});\n', "HANDOUT_FILES"))
    total = sum(write(os.path.join("handouts", f["name"]), base64.b64decode(f["b64"]))
                for f in books.values())
    report("HANDOUT_FILES", "handouts/ (%d workbooks)" % len(books), total,
           sum(len(f["b64"]) for f in books.values()))
    # the day keys are padded so the filenames line up under each other
    w = max(len(d) for d in books)
    manifest = "".join('  "%s":%s "%s",\n' % (d, " " * (w - len(d)), books[d]["name"])
                       for d in sorted(books, key=int))
    sub(r'const HANDOUT_FILES = \{"\d+".*?\};\n',
        '/* The handout workbooks used to be inlined here as 90 KB of base64 \u2014\n'
        '   downloaded by everyone, opened by almost no one. They are files now, fetched\n'
        '   only when a trainee asks for one. */\n'
        'const HANDOUT_FILES = {\n' + manifest + '};\n',
        literal=False, flags=re.S)
    sub(HANDOUT_OLD, HANDOUT_NEW)

    # --- jsPDF needs base64, so the three assets it draws are fetched on demand
    sub(JSPDF_OLD, JSPDF_NEW)
    sub(JSPDF2_OLD, JSPDF2_NEW)
    sub('doc.addImage(LOGO_ICON_DATAURI, "PNG", marginX, 20, 46, 46);',
        'doc.addImage("data:image/png;base64,"+PDF_ASSETS.logoIcon, "PNG", marginX, 20, 46, 46);')
    sub('try{ doc.addImage(LOGO_FULL_DATAURI, "PNG", W/2-52, 58, 104, 65); }catch(e){ console.warn("logo skipped", e); }',
        'try{ doc.addImage("data:image/png;base64,"+PDF_ASSETS.logoFull, "PNG", W/2-52, 58, 104, 65); }catch(e){ console.warn("logo skipped", e); }')
    sub(SIGFONT_VFS_OLD, SIGFONT_VFS_NEW)

    # --- src="" renders: a browser resolves an empty src to this page's own URL
    #     and downloads the whole document again as if it were the asset.
    sub(AVATAR_OLD, AVATAR_NEW)
    sub(AUDIO_OLD, AUDIO_NEW)

    return s


def apply(s, fail, root=None):
    """Applies each patch that the engine doesn't already carry.

    `fail` is build.py's way of stopping with a message (sys.exit). `root` is the
    repository root; with it, the engine's inline base64 assets are written out
    as files there (see extract_assets)."""
    # Which patches are needed is decided from the text as it arrives: applying
    # one can introduce another's marker, which would then wrongly skip it.
    needed = [marker not in s for marker, _, _ in PATCHES]
    for (marker, old, new), want in zip(PATCHES, needed):
        if not want:
            continue                      # the engine already has this one
        if s.count(old) != 1:
            fail(f"MISSING ({s.count(old)}) for the first-load speed patch {marker!r}: {old[:70]!r}"
                 "\n  → the EA/PA engine changed here. Update build/ft_perf_patches.py, or drop the"
                 "\n    patch if EA-PA-TRAINING now carries the change itself.")
        s = s.replace(old, new, 1)
    # The inline base64 assets, last. `root` is None when a caller only wants the
    # text patches, and PDF_ASSETS being present means the engine already serves
    # these as files, so this becomes a no-op the day EA/PA ships it.
    if root is not None and "const PDF_ASSETS" not in s:
        print("  ⚡ inline base64 assets -> files:")
        s = extract_assets(s, root, fail)
    return s
