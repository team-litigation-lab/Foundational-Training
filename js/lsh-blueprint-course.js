/* =========================================================
   🧭 BLUEPRINTS ON A COURSE PORTAL — the same file on every LSH course (EA/PA, Foundational,
   Case Management, PD Claims, MedSum & Demand); change it in one, copy it to all.
   - Trainee blueprint: the course's trainee slides (js/blueprint-content.js), drawn by the shared
     engine and published for everyone at /blueprint.pdf, for the Portal's Blueprint page to link. It's now rebuilt after EVERY deploy, not only when APP_BUILD is bumped:
     the published copy is matched against APP_BUILD and the Worker's deployment id (/version),
     and the first admin page open after a deploy republishes it.
   - Trainer blueprint: every blueprint link leads to the Main Portal's 🧭 Blueprint page, never
     to a deck inside a program. A program carries no Blueprint tab, button or card, and the old
     #/blueprint address now sends whoever opens it to the Portal's Blueprint page.
   Load order: blueprint-content.js, this file, lsh-blueprint.js, after the course's own scripts.
   ========================================================= */
(function () {
  'use strict';
  const S = () => (typeof state !== 'undefined' ? state : {});
  const isAdmin = () => !!S().isAdmin && !(document.body && document.body.classList.contains('audience-mode'));

  /* ---------- the deployed version: APP_BUILD and the Worker's deployment id ---------- */
  let dep = null, depAt = 0;
  async function deployment() {
    if (dep !== null && Date.now() - depAt < 5 * 60000) return dep;
    try {
      const t = await (await fetch('/version', { cache: 'no-store' })).text();
      const m = t.match(/Deployment:\s*(\S+)/);
      dep = m && m[1] !== 'unknown' ? m[1] : '';
    } catch (e) { dep = dep || ''; }
    depAt = Date.now();
    return dep;
  }
  const build = () => (typeof APP_BUILD !== 'undefined' ? APP_BUILD : '');
  async function versionText() { const d = await deployment(); return `build ${build()}${d ? ' · deploy ' + d.slice(0, 8) : ''}`; }

  /* ---------- the Trainee blueprint (/blueprint.pdf): republished after every deploy ---------- */
  window.autoPublishBlueprint = async function () {
    if (!isAdmin() || S().blueprintJob || !window.LSHBlueprint) return;
    const st = S();
    try {
      const d = await deployment();
      const meta = await sharedGet('blueprint:meta');
      st.blueprintMeta = meta || null;
      if (meta && meta.build === build() && (meta.deploy || '') === d) return;   // already this deploy's
      const key = build() + '|' + d;
      if (meta && meta.lockUntil && Date.now() < meta.lockUntil && meta.lockBuild === key) return;   // another admin is building it
      st.blueprintJob = true;
      await sharedSet('blueprint:meta', Object.assign({}, meta || {}, { lockUntil: Date.now() + 5 * 60 * 1000, lockBuild: key }));
      const doc = await window.LSHBlueprint.doc('trainee');
      if (!doc) throw new Error('no trainee blueprint to publish');
      const b64 = doc.output('datauristring').split(',')[1];
      const at = new Date().toISOString();
      const ok = await sharedSet('blueprint:pdf', { build: build(), deploy: d, at, b64 });
      if (ok) {
        st.blueprintMeta = { build: build(), deploy: d, at, pages: doc.getNumberOfPages() };
        await sharedSet('blueprint:meta', st.blueprintMeta);
        if (st.view === 'orientation' && typeof render === 'function') render();
      }
    } catch (e) { console.warn('blueprint auto-publish skipped:', e); }
    finally { st.blueprintJob = false; }
  };

  /* ---------- Every blueprint link goes to the Blueprint, not to the program ----------
     The blueprints live on the Main Portal, on one 🧭 Blueprint page. A program shows no Blueprint
     tab, button, card or PDF link — not to trainees, not to trainers — and it opens no deck of its
     own: the old #/blueprint address is kept only to forward to the Portal's Blueprint page, so an
     older bookmark or link still lands in the right place. The Trainee blueprint is still published
     at /blueprint.pdf after every deploy, for the Portal to link to. */
  const PORTAL_BLUEPRINT = 'https://cm-training-activity.pages.dev/blueprint';
  // 🧭 Orientation was the trainee-facing deck inside the course; it reads on the Portal now too,
  // so its old address forwards there as well.
  const BP_LINK = /^#\/(blueprint|orientation)\/?$/;
  function toPortalBlueprint() {
    if (!BP_LINK.test(location.hash)) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* older browser: the hash stays */ }
    location.href = PORTAL_BLUEPRINT;
  }
  window.addEventListener('hashchange', toPortalBlueprint);
  toPortalBlueprint();

  /* ---------- the shared Blueprint engine's settings for a course ---------- */
  const c = window.LSH_BLUEPRINT = window.LSH_BLUEPRINT || {};
  c.logo = c.logo || '/js/lsh-logo-dark.png';
  // The trainee slides stay in blueprint-content.js: no deck opens here, but /blueprint.pdf is
  // still built from them for the Portal's Blueprint page to link to.
  c.role = c.role || (() => null);   // no deck opens inside a program: the Blueprint page on the Portal has them
  c.version = c.version || versionText;
  window.lshBlueprintDeployment = Object.assign(deployment, { reset() { dep = null; } });   // for the test
})();
