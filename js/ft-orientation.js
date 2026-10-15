/* ============================================================
   🧭 Platform Orientation — the Trainee blueprint, on the standard deck
   Loaded last. 🧭 Orientation (#/orientation) is the trainee-facing blueprint of this
   platform, for a trainer to screen-share on day one. It is no longer a deck of its own:
   the slides live in js/blueprint-content.js (LSH_BLUEPRINT.trainee) and are drawn by
   js/lsh-blueprint.js, the same engine, cover and slide layout as the Trainer blueprint —
   so every LSH blueprint, on every platform, reads as one deck.
   The same slides are the Blueprint PDF at /blueprint.pdf: when the build or the deployment
   changes, the first admin to open the portal rebuilds it from LSHBlueprint.doc('trainee')
   and publishes it (blueprint:pdf / blueprint:meta, served by worker.js).
   Trainee-safe: no facilitator's notes, answers or trainee data.
   ============================================================ */
(function(){
  const deck = () => (window.LSH_BLUEPRINT && window.LSH_BLUEPRINT.trainee) || null;

  /* The old orientSlides() shape ({k, h, body}), for anything in the engine that still asks
     for it (a slide count, a resume key). The deck itself is drawn from LSH_BLUEPRINT. */
  window.orientSlides = function(){
    const d = deck();
    return d ? d.slides.map(s => ({ k: s.title, h: s.title, body: '' })) : [];
  };

  function openDeck(){
    if(!window.LSHBlueprint) return false;
    try { window.LSHBlueprint.open('trainee'); return true; } catch(e){ return false; }
  }
  window.openOrientationDeck = openDeck;

  /* The 🧭 Orientation page: the launcher for the deck, which opens over it. */
  window.renderOrientation = function(){
    const d = deck(), n = d ? d.slides.length : 0;
    setTimeout(openDeck, 0);
    return `
      <div class="or-top"><div><p class="eyebrow">${state.isAdmin ? "Admin · for screen sharing" : "Your guide to the platform"}</p>
        <h1 style="color:var(--navy);font-size:24px;margin:4px 0 0;">🧭 Platform Orientation</h1></div>
        <div class="or-top-actions"><span class="or-tip">Share this tab in Google Meet — nothing private is shown here.</span></div></div>
      <div class="card" style="padding:34px;text-align:center;">
        <div style="font-size:34px;margin-bottom:8px;">🧭</div>
        <h2 style="color:var(--navy);margin:0 0 8px;">The Trainee blueprint</h2>
        <p style="color:var(--ink-soft);font-size:14px;max-width:62ch;margin:0 auto 16px;">
          ${n} slides on how this platform works, on the standard LSH blueprint deck: ◀ ▶ or the arrow keys to move,
          the contents strip to jump, ⬇ Download PDF to save it. Esc closes it.</p>
        <button class="btn btn-primary" onclick="openOrientationDeck()">🧭 Open the blueprint</button>
      </div>`;
  };

  /* The Print and Download buttons are the deck's own now. */
  window.printOrientation = function(){ if(!openDeck() && typeof toast === 'function') toast('The blueprint is still loading — try again in a moment.'); };
  window.downloadOrientationPdf = function(){ return window.LSHBlueprint ? window.LSHBlueprint.pdf('trainee') : null; };
  window.buildOrientationPdfDoc = function(){ return window.LSHBlueprint ? window.LSHBlueprint.doc('trainee') : Promise.resolve(null); };
  /* The arrow keys belong to the deck now: the engine's own handler moves it. This is still here
     because the page's keydown handler calls it while 🧭 Orientation is the view, and moving again
     here would skip a slide on every press. */
  window.orientGo = function(){ if(!(window.LSHBlueprint && window.LSHBlueprint.isOpen())) openDeck(); };
  window.orientFullscreen = openDeck;

  /* A trainee opens 🧭 Orientation too: the EA/PA engine's render() only calls renderOrientation()
     for an admin, so a trainee would fall through to its raw, unbranded dashboard. */
  const base = window.render;
  window.render = function(){
    if(state.view === "orientation" && !state.isAdmin){
      const app = document.getElementById("app");
      app.innerHTML = renderTopbar() + `<main><div id="navBackSlot"></div>${renderOrientation()}</main>`
        + (state.traineeId ? `<button type="button" class="tfb-fab" onclick="openTraineeFeedback(null)" title="Share feedback about the platform, lessons or facilitator" aria-label="Share feedback">💬<span class="fab-label"> Feedback</span></button>` : "")
        + renderFooter();
      if(typeof afterRender === "function") afterRender();
      return;
    }
    return base.apply(this, arguments);
  };
})();
