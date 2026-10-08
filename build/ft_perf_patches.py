"""This program's first-load speed edits to the EA/PA engine's index.html, applied by build.py.

Opening a program from the Training Directory used to sit on a blank cover for
several seconds. These are the engine-level reasons, and the fixes. Measured in
headless Chromium against a gzipped copy of the built site, median of 7 runs:
first paint on a 1.6 Mbps / 150 ms connection went from 1432 ms to 904 ms.

Each of these belongs in EA-PA-TRAINING's own index.html, which is where the
engine lives — the whole platform family is built from it, so every course is
slow in the same way until it is fixed there. Each patch below is skipped when
the engine already carries it (the `marker`), exactly like build.py's
`if "window.portalGate" not in s` block. Once EA/PA ships these, this file
becomes a no-op and can go.
"""

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


def apply(s, fail):
    """Applies each patch that the engine doesn't already carry.

    `fail` is build.py's way of stopping with a message (sys.exit)."""
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
    return s
