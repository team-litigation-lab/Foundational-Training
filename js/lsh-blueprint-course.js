/* =========================================================
   🧭 BLUEPRINTS ON A COURSE PORTAL — the same file on every LSH course (EA/PA, Foundational,
   Case Management, PD Claims, MedSum & Demand); change it in one, copy it to all.
   - Trainee blueprint: the course's 🧭 Orientation slides (orientSlides), published for everyone
     at /blueprint.pdf. It's now rebuilt after EVERY deploy, not only when APP_BUILD is bumped:
     the published copy is matched against APP_BUILD and the Worker's deployment id (/version),
     and the first admin page open after a deploy republishes it.
   - Trainer blueprint: the course's trainer slides (js/blueprint-content.js), drawn by
     lsh-blueprint.js. Admins only, never at a public address: 🧭 Orientation → 🛠 Trainer
     blueprint, with ⬇ Download PDF (stamped with the build and the deployment).
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
    if (!isAdmin() || S().blueprintJob) return;
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
      const doc = await buildOrientationPdfDoc();
      const b64 = doc.output('datauristring').split(',')[1];
      const at = new Date().toISOString();
      const ok = await sharedSet('blueprint:pdf', { build: build(), deploy: d, at, b64 });
      if (ok) {
        st.blueprintMeta = { build: build(), deploy: d, at, pages: orientSlides().length };
        await sharedSet('blueprint:meta', st.blueprintMeta);
        if (st.view === 'orientation' && typeof render === 'function') render();
      }
    } catch (e) { console.warn('blueprint auto-publish skipped:', e); }
    finally { st.blueprintJob = false; }
  };

  /* ---------- 🧭 Orientation: the Trainee blueprint, with a tab to the Trainer blueprint ---------- */
  if (typeof window.renderOrientation === 'function') {
    const base = window.renderOrientation;
    window.renderOrientation = function () {
      const html = base.apply(this, arguments);
      if (!window.LSHBlueprint || !(window.LSH_BLUEPRINT || {}).trainer) return html;
      return `<div class="lbp-or-tabs" role="tablist">
          <button type="button" class="on" role="tab" aria-selected="true">🧭 Trainee blueprint</button>
          <button type="button" role="tab" id="lbp-or-trainer" onclick="LSHBlueprint.open('trainer')">🛠 Trainer blueprint</button>
          <span>Trainees see the Trainee blueprint (and get it at <a href="/blueprint.pdf" target="_blank" rel="noopener">/blueprint.pdf</a>). The Trainer blueprint is for trainers only.</span>
        </div>` + html;
    };
  }
  const css = document.createElement('style');
  css.textContent = `.lbp-or-tabs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 14px;padding:6px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px}
    .lbp-or-tabs button{border:1px solid #e2e8f0;background:#fff;color:#1e293b;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;font-family:inherit}
    .lbp-or-tabs button.on{background:#0f2148;border-color:#0f2148;color:#fff;box-shadow:inset 0 -3px 0 #f97316;cursor:default}
    .lbp-or-tabs span{font-size:12px;color:#64748b;margin-left:6px}`;
  document.head.appendChild(css);

  /* ---------- the shared Blueprint engine's settings for a course ---------- */
  const c = window.LSH_BLUEPRINT = window.LSH_BLUEPRINT || {};
  c.logo = c.logo || '/js/lsh-logo-dark.png';
  c.trainee = null;   // the Trainee blueprint is the Orientation deck
  c.role = c.role || (() => (isAdmin() ? 'trainer' : null));
  c.version = c.version || versionText;
  c.traineeTab = c.traineeTab || { label: 'Trainee blueprint', open: () => { if (typeof goto === 'function') goto('orientation'); else if (typeof render === 'function') { S().view = 'orientation'; render(); } } };
  window.lshBlueprintDeployment = Object.assign(deployment, { reset() { dep = null; } });   // for the test
})();
