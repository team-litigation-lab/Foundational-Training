/* ============================================================================
   The gradient theme, and the courtroom photos behind the cream pages.

   Two things live here:

   1. GRADIENTS. Every flat brand colour in the platform — the navy and orange
      surfaces, the greens and reds, the page itself, the white cards and the
      tinted boxes — is painted as a gradient instead. The palette tokens in
      index.html keep their flat values, because --navy and --orange are also
      used for text, borders and shadows, where a gradient is not a legal
      value. So this file adds a parallel set of --grad-* tokens and hands them
      to the surfaces as a background-image, which sits on top of each rule's
      own background-color. The flat colour stays as the fallback, so a surface
      that this file misses still looks the way it always did.

      The selectors below are every rule in index.html and js/*.js that paints
      a surface in one of the brand colours. They are listed by the token they
      used, so when the palette changes, the gradient changes with it in one
      place. Each gradient keeps the original colour as its middle stop, so the
      contrast of the text on it is the contrast it always had.

   2. THE PHOTOS BEHIND THE CREAM PAGES. The pages that were a flat cream sheet
      (#FFFDF8) — a lesson's opening page and its native slides, the Platform
      Orientation slides and the certificate — now carry one of the five
      courtroom photographs in img/, under a cream wash that keeps the text as
      readable as it was. A lesson's photo is picked from its number, so every
      page of a lesson shows the same one and neighbouring lessons differ.

      The slides that already have a background of their own are untouched: the
      Canva decks (body.ft-fit) and the Orientation deck with the trainers'
      design (body.ft-orient) both set their own background with !important on
      a more specific selector, so they win over everything here.

   Loaded last (build.py puts it after js/lsh-tool-links.js), so these rules
   come after every stylesheet they override.
   ============================================================================ */
(function () {
    "use strict";

    /* The five photographs, in the order a lesson picks from them. */
    var PHOTOS = ["bg-courtroom", "bg-flag-law", "bg-chamber", "bg-scales", "bg-gavel-book"];
    var url = function (name) { return 'url("/img/' + name + '.webp")'; };

    /* ---- the surfaces, by the palette token they were painted with ---------
       Written as one selector list per token. A trailing "!" on a selector
       means the rule it overrides used !important, so this one has to as well. */
    var SURFACES = {
        navy: [
            "#toolBody .btn.lab-cta!", ".ad-cell i", ".bf-tabs button.active", ".btn-navy",
            ".cr-msg.cr-client", ".cr-tabs button.active", ".cs-live-step.on", ".cs-tab.active",
            ".cues-day-tabs button.active", ".day-num", ".eo-av", ".ff-mc", ".folder-item.active",
            ".ftc-body a.ft-lesson-link", ".ftr-aux code", ".ftr-stakes", ".gm-tiles div.all",
            ".iz-mv.on", ".lesson-compare .cbox:first-child .chead",
            ".lesson-compare .cbox:first-child .citem::before", ".lesson-process .pstep",
            ".lesson-quadrant .qbox:nth-child(4n+1)", ".lesson-stage #lessonSlideWrap .fp-num!",
            ".lesson-stage #lessonSlideWrap .fp-section ol > li::before",
            ".lesson-stage #lessonSlideWrap ol.fp-howto-list > li::before", ".lesson-stat",
            ".lesson-threebox .tbox:nth-child(3n+1)", ".lp-admin-sec.active",
            ".match-zone:nth-child(4n+1) .match-zone-label", ".mini-table th", ".ob-call-btn",
            ".or-bp-side", ".or-step-n", ".pill-tabs button.active", ".practice-sidebar button.active",
            ".quiz-grid-letter", ".section-title .tag", ".si-icon", ".sopf-step h4 .n::before",
            ".sopx-mode button.on", ".sopx-n", ".sopx-s-table th", ".step-circle.st-done",
            ".tab-btn.active", ".tfb-fab", ".toast", ".tool-card .tool-open-btn", ".tool-day-banner",
            ".topbar", ".topic-separator", ".update-banner", ".vis-chip", ".vis-n",
            ".wizard-dot.wizard-tab.active", "ol.sopx-s-list li::before"
        ],
        "navy-deep": [
            "#lecture-viewer-header", ".aud-deck-note", ".btn-navy:hover", ".ft-body .canva-frame",
            ".ft-deck .ft-body .canva-frame iframe", ".ftc-body .canva-frame", ".voice-note"
        ],
        "navy-soft": [
            ".lesson-process .pstep:nth-child(4n+2)", ".lesson-process .pstep:nth-child(4n+4)",
            ".lesson-quadrant .qbox:nth-child(4n+3)", ".lesson-threebox .tbox:nth-child(3n+3)",
            ".match-zone:nth-child(4n+3) .match-zone-label", ".slide-dot.visited"
        ],
        /* .tool-card:hover .tool-open-btn is here while .tool-card .tool-open-btn is in
           the navy list: the EA/PA engine paints that button navy at rest and orange on
           hover. This program has no .tool-card markup — the simulator cards were taken
           off the Practice Lab — so these two only matter if it ever comes back. The
           hover selector is the more specific of the pair and wins whichever order they
           land in; a locked card's grey is more specific still and keeps its flat colour. */
        orange: [
            "#audioModeBtn.on", ".as-bar div", ".badge-inline", ".btn-primary", ".cert-seal",
            ".comp-fill.build", ".fp-num", ".lesson-card li::before", ".lesson-compare .citem::before",
            ".lesson-process .pnum", ".lesson-quadrant .qbox:nth-child(4n+2)",
            ".lesson-threebox .tbox:nth-child(3n+2)", ".lg-step span",
            ".match-zone:nth-child(4n+2) .match-zone-label", ".module-topic-list li::before",
            ".nav button.active", ".nav-badge", ".or-num", ".qcheck-card .qc-tag .dot",
            ".quiz-dot.active", ".slide-dot.active", ".sopx-list li::before", ".sopx-s-chips b",
            ".tfb-fab:hover", ".tool-card:hover .tool-open-btn", ".trainee-chip .dot",
            ".update-banner button", ".vc-avatar", ".vc-btn.vc-on", ".vp-play", ".wizard-dot.active",
            ".wizard-tab.active .wt-n", ".won-new", "body.ft-orient #lessonSlideWrap .btn-navy!"
        ],
        "orange-deep": [
            ".btn-primary:hover", ".ftc-body a.ft-lesson-link:hover", ".ftr-part-h span",
            ".lesson-compare .cbox:last-child .chead", ".lesson-quadrant .qbox:nth-child(4n+4)",
            ".match-zone:nth-child(4n+4) .match-zone-label", ".quiz-grid-opt.selected .quiz-grid-letter",
            ".svg-callout-badge"
        ],
        "orange-soft": [
            ".cert-prog div", ".cr-msg.cr-ea", ".lesson-stage .slide-dot.active", ".or-dots button.on",
            ".quiz-grid-opt.selected", ".slide-dot:hover", ".sopx-s-bar i", ".view-mode-strip", ".vpc-tag"
        ],
        success: [
            ".ad-cell.ok", ".cert-hero-btn", ".day-row.done .day-num", ".quiz-dot.done",
            ".sopf-step.brk h4 .n::before", ".wizard-dot.done", ".wizard-tab.done .wt-n"
        ],
        danger: [".vc-btn.vc-hang"],
        /* The pale tints: the green "done / correct" boxes and the red "stop / wrong" ones. */
        "success-bg": [
            ".att-today", ".audit-btn.active-valid", ".callout-tip", ".drill-btn.correct",
            ".estatus.replied", ".fact-row.fact-correct", ".fb-chip.sent", ".fp-pill.ok",
            ".fp-st.st-done", ".ftm-pill.ok", ".kc-fb.kc-ok",
            ".lesson-stage #lessonSlideWrap .quiz-opt.correct", ".module-finish-btn:hover",
            ".pill-done", ".pref-ok", ".qns-ok", ".quiz-opt.correct", ".rv.sent", ".st-done",
            ".studio-badge.published", ".tk-chip.done", ".tk-steps li.ok"
        ],
        "danger-bg": [
            ".ai-result.ai-error", ".audit-btn.active-unrelated", ".callout-warning",
            ".drill-btn.incorrect", ".esim-fail-banner", ".fa-pri.high", ".fact-row.fact-wrong",
            ".fp-pill.bad", ".ftm-help", ".ftm-pill.bad", ".ftr-rule", ".kc-fb.kc-low",
            ".lab-attempt-banner.lab-attempt-locked", ".lab-disclaimer.locked",
            ".lesson-stage #lessonSlideWrap .quiz-opt.incorrect", ".pref-bad",
            ".prominent-disclaimer", ".qns-stop", ".quiz-opt.incorrect", ".rv.todo", ".tk-chip.missed"
        ],
        /* The white cards and the page itself. */
        paper: [".card", ".eval-report", ".ftr-chan", ".ftr-part", ".quiz-grid-opt"],
        page: [
            ".act-card", ".dropzone", ".fp-report", ".fp-st.st-none", ".ftm-afb pre", ".ftm-eg",
            ".ftm-mtype", ".ftm-n", ".ftm-rubric code", ".ftr-code", ".ftr-eg", ".ftr-to",
            ".ftr-todo-n", ".iz-quad", ".iz-score-banner", ".kc-stats", ".lesson-compare .cbox",
            ".link-preview-box", ".match-tray", ".pill-tabs", ".practice-sidebar button:hover",
            ".pref-ref-grid div", ".search-results .sr-item:hover", ".st-none", "body"
        ]
    };

    /* The boxes painted in a one-off warm or cool tint, too many and too varied to
       name a gradient for each. They get a sheen instead: a wash that lightens the
       top-left corner and deepens the bottom-right of whatever colour is already
       there, so they read as a gradient without this file knowing their colour. */
    var SHEEN = [
        ".ai-result", ".callout-stat", ".cert-warn", ".di-strip > div", ".di-warm", ".empty-note",
        ".example-block", ".fb-composer", ".ftr-goal", ".ftr-why", ".inbox-sidebar", ".mindset-note",
        ".or-note", ".pill-locked", ".pill-open", ".qcheck-card", ".qns-warn", ".script-block",
        ".tfb-inline", ".tk-dash", ".tk-steps li", ".trainer-checkpoint", ".week-day-header"
    ];

    var sel = function (list) {
        return list.map(function (s) { return s.replace(/!$/, ""); }).join(",\n");
    };

    /* One rule for the plain selectors and, only if the token has any, a second for
       the ones that override an !important. Keeping them apart matters: !important
       on a whole list would also beat the rules that repaint a surface somewhere
       else, such as the lesson card's Start button, which the dashboard's card
       frame turns from navy into a pale strip with navy text. */
    var block = function (token, list) {
        var plain = list.filter(function (s) { return !/!$/.test(s); });
        var forced = list.filter(function (s) { return /!$/.test(s); });
        var out = [];
        if (plain.length) out.push(sel(plain) + "{background-image:var(--grad-" + token + ");}");
        if (forced.length) out.push(sel(forced) + "{background-image:var(--grad-" + token + ") !important;}");
        return out.join("\n");
    };

    var css = `
/* ---------- the gradient palette ----------------------------------------
   Each one keeps the flat colour it replaces as its middle stop, so nothing
   gets lighter or darker overall and the text on it keeps its contrast. */
:root{
  --grad-navy:linear-gradient(135deg,#333A5E 0%,#262B45 52%,#1A1E33 100%);
  --grad-navy-deep:linear-gradient(135deg,#232842 0%,#161829 55%,#0E1020 100%);
  --grad-navy-soft:linear-gradient(135deg,#4A5178 0%,#3C4268 55%,#2E3352 100%);
  --grad-orange:linear-gradient(135deg,#EFA560 0%,#DB8437 50%,#C06E22 100%);
  --grad-orange-deep:linear-gradient(135deg,#CE7A2C 0%,#B5651F 52%,#954F13 100%);
  --grad-orange-soft:linear-gradient(135deg,#F7D4AC 0%,#F0C08A 55%,#E3AA6C 100%);
  --grad-success:linear-gradient(135deg,#4F9268 0%,#3F7D58 52%,#2F6344 100%);
  --grad-danger:linear-gradient(135deg,#C75F53 0%,#B54A3F 52%,#95372E 100%);
  --grad-success-bg:linear-gradient(150deg,#EFF7F1 0%,#E7F1EA 55%,#DCEBE1 100%);
  --grad-danger-bg:linear-gradient(150deg,#FCF1EF 0%,#F7E9E6 55%,#F1DCD7 100%);
  --grad-paper:linear-gradient(165deg,#FFFFFF 0%,#FDFDFF 55%,#F6F8FD 100%);
  --grad-page:linear-gradient(160deg,#F5F7FC 0%,#EEF0F6 45%,#E3E7F2 100%);
  /* the wash over a cream page's photograph, and the photograph itself */
  --grad-cream:linear-gradient(165deg,rgba(255,254,250,.90) 0%,rgba(255,253,248,.86) 45%,rgba(249,243,232,.90) 100%);
  --ft-cream-photo:${url(PHOTOS[0])};
  /* the sheen for the one-off tints */
  --grad-sheen:linear-gradient(150deg,rgba(255,255,255,.62) 0%,rgba(255,255,255,0) 55%,rgba(27,30,46,.055) 100%);
}

/* ---------- the surfaces ---------- */
${Object.keys(SURFACES).map(function (t) { return block(t, SURFACES[t]); }).join("\n\n")}

/* ---------- the one-off tints ---------- */
${sel(SHEEN)}{background-image:var(--grad-sheen);}

/* The dashboard's feedback widget forces white text on its buttons
   (js/lsh-dashboard.js), and the light end of the orange gradient would leave
   that too faint to read. There the button takes the deep orange instead — the
   shade the palette already pairs with white, on .btn-primary:hover. */
.dash-main > .dash-side .tfb-dash .btn.btn-primary{background-image:var(--grad-orange-deep);}

/* The page's gradient is pinned to the viewport rather than stretched down the
   whole document, so a long page shades the same way as a short one. It stays
   under the gavel photograph that body::before paints: that is a fixed layer of
   its own above the body's background. */
body{background-attachment:fixed;}

/* ---------- the photographs behind the cream pages ----------------------
   A lesson's opening page and its native slides. The Canva decks
   (body.ft-fit) and the Orientation deck (body.ft-orient) set their own
   background with !important on a more specific selector, so they are not
   touched by this.

   .sopx-slide is the engine's SOP Reference present mode. Nothing shows it in
   this program — ftAdminTab() in js/ft-firms.js replaces the engine's admin tab
   bar and SOP Reference isn't one of the five tabs — so it is here only so the
   page matches if that tab ever comes back. */
.lesson-stage #lessonSlideWrap,
.lesson-stage .lesson-slide > .card,
.lesson-stage .lesson-slide .lesson-card,
.sopx-slide{
  background-image:var(--grad-cream),var(--ft-cream-photo) !important;
  background-size:auto,cover !important;
  background-position:center,center !important;
  background-repeat:no-repeat,no-repeat !important;
}
/* The white boxes that sit straight on a cream page are let through a little, so
   the photograph reads as the page's background instead of a border around a
   slab. The Orientation deck's own boxes are not among these: its rules clear
   their background on a more specific selector. */
.lesson-stage .lesson-slide .di-box,
.lesson-stage .lesson-slide .svg-diagram-card,
.lesson-stage #lessonSlideWrap .di-box,
.lesson-stage #lessonSlideWrap .svg-diagram-card,
.lesson-stage #lessonSlideWrap ol.fp-howto-list > li,
.lesson-stage #lessonSlideWrap .fp-section ol > li,
.lesson-stage #lessonSlideWrap .quiz-opt{background-color:rgba(255,255,255,.80);}

/* The Platform Orientation slides (js/ft-orientation.js), and the certificate,
   which keeps the faintest wash of the three so the printed sheet stays clean. */
.or-slide{
  background-image:var(--grad-cream),${url("bg-chamber")};
  background-size:auto,cover;background-position:center,center;background-repeat:no-repeat,no-repeat;
}
.cert{
  background-image:linear-gradient(165deg,rgba(255,254,250,.95) 0%,rgba(255,253,248,.93) 45%,rgba(250,245,235,.95) 100%),${url("bg-scales")};
  background-size:auto,cover;background-position:center,center;background-repeat:no-repeat,no-repeat;
}
`;

    var st = document.createElement("style");
    st.id = "ft-theme";
    st.textContent = css;
    document.head.appendChild(st);

    /* ---- a lesson's own photograph -------------------------------------------
       The photo is picked from the lesson's number, so every page of a lesson
       shows the same one and the lesson next to it a different one. Anything
       that isn't a lesson keeps the first photo.

       The lesson is read from the page's own state, not from the hash: goto()
       moves between views by setting state and re-rendering, and the address
       bar is caught up afterwards without a hashchange event. So the hook is
       afterRender (the same one js/eapa-updates.js chains onto), with the hash
       as the fallback for a page opened straight at #/day/<n>. */
    function lessonNumber() {
        try {
            if (typeof state === "object" && state && state.view === "day" && state.dayId != null) {
                return Number(state.dayId);
            }
        } catch (e) { /* state isn't there yet: fall through to the hash */ }
        var m = /^#\/day\/(\d+)/.exec(location.hash || "");
        return m ? Number(m[1]) : 0;
    }
    var last = "";
    function apply() {
        var n = lessonNumber();
        if (!isFinite(n)) n = 0;
        var photo = url(PHOTOS[((n % PHOTOS.length) + PHOTOS.length) % PHOTOS.length]);
        if (photo === last) return;
        last = photo;
        document.documentElement.style.setProperty("--ft-cream-photo", photo);
    }
    apply();
    window.addEventListener("hashchange", apply);
    var chained = window.afterRender;
    window.afterRender = function () {
        apply();
        if (typeof chained === "function") return chained.apply(this, arguments);
    };
})();
