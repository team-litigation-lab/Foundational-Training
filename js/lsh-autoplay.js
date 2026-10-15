/* =========================================================
   ▶ AUTOPLAY — the same file on every LSH course; change it in one, copy it to all.

   One shared, standard-build autoplay for every deck on the platform: the lesson
   slides, 🧭 Orientation, the facilitator's SOP presentation and the Blueprint
   viewer. It needs no change in any of them: it finds each deck's own navigation
   bar, puts a ▶ Autoplay button and a speed next to the Next button, and then
   simply presses that Next button on a timer — so a deck plays exactly the way a
   trainer clicking through it would, locks and all.

   It stops on its own at the last slide, when the deck leaves the screen, when
   anyone presses Previous / Next / a slide dot, on Escape, and on any key or
   click that moves the deck. The chosen speed is remembered per browser.
   ========================================================= */
(function () {
  'use strict';

  const SECS_KEY = 'lsh-autoplay-secs';
  const SPEEDS = [5, 8, 12, 20, 30];
  const DEFAULT_SECS = 8;

  // Every deck on the platform: where its navigation bar is, and which button moves it on.
  // stopAt marks a "Next" button that doesn't go to another slide (the lesson's ✓ Finish
  // lesson, which leaves for the Knowledge Check) — autoplay stops there instead of pressing it.
  const DECKS = [
    { key: 'lesson',      nav: '.slide-nav',    next: '.btn-primary', btn: 'btn btn-ghost btn-sm', stopAt: /goToKnowledgeCheck|Finish lesson|startDayFromIntro|Start lesson|Objectives/i },
    { key: 'orientation', nav: '.or-controls',  next: '.btn-primary', btn: 'btn btn-ghost btn-sm' },
    { key: 'sop',         nav: '.sopx-s-nav',   next: '.btn-primary', btn: 'btn btn-ghost btn-sm' },
    { key: 'blueprint',   nav: '#lbp-nav',      next: '#lbp-next',    btn: '' }
  ];

  let timer = null, playing = null;   // playing: the nav element of the deck that is running

  const secs = () => {
    const v = parseInt(localStorage.getItem(SECS_KEY) || '', 10);
    return SPEEDS.includes(v) ? v : DEFAULT_SECS;
  };

  const deckOf = (nav) => DECKS.find(d => nav.matches(d.nav));

  function nextBtn(nav) {
    const d = deckOf(nav); if (!d) return null;
    return nav.querySelector(d.next);
  }

  // the deck has nowhere left to go: no Next button, a disabled one, or one that leaves the deck
  function atEnd(nav) {
    const d = deckOf(nav), b = nextBtn(nav);
    if (!d || !b || b.disabled) return true;
    const act = (b.getAttribute('onclick') || '') + ' ' + (b.textContent || '');
    return !!(d.stopAt && d.stopAt.test(act));
  }

  function stop(why) {
    if (timer) { clearTimeout(timer); timer = null; }
    playing = null;
    paint();
    if (why && typeof window.toast === 'function') window.toast(why);
  }

  function tick() {
    // the deck is redrawn on every slide, so find its bar again each time
    const nav = playing && document.querySelector(playing);
    if (!nav) return stop();
    if (atEnd(nav)) return stop('▶ Autoplay finished — that was the last slide.');
    const b = nextBtn(nav);
    if (!b) return stop();
    b.click();
    schedule();
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, secs() * 1000);
  }

  function start(nav) {
    const d = deckOf(nav); if (!d) return;
    if (atEnd(nav)) { if (typeof window.toast === 'function') window.toast('This is the last slide — nothing to play.'); return; }
    playing = d.nav;            // a selector, not the node: the deck redraws itself as it moves
    schedule();
    paint();
  }

  function toggle(key) {
    const d = DECKS.find(x => x.key === key); if (!d) return;
    const nav = document.querySelector(d.nav); if (!nav) return;
    if (playing === d.nav) stop(); else start(nav);
  }

  function setSpeed(v) {
    localStorage.setItem(SECS_KEY, String(parseInt(v, 10) || DEFAULT_SECS));
    if (playing) schedule();     // the new speed takes effect from now
    paint();
  }

  /* ---------- the button, in every deck's own navigation bar ---------- */
  const CSS = `
    .lsh-ap{display:inline-flex;align-items:center;gap:6px;}
    .lsh-ap select{font:inherit;font-size:12px;font-weight:700;padding:4px 6px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#0f2148;cursor:pointer;}
    .lsh-ap .lsh-ap-btn.on{background:#f97316 !important;border-color:#f97316 !important;color:#fff !important;}
    #lbp-nav .lsh-ap .lsh-ap-btn{font:inherit;font-weight:800;padding:6px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f2148;cursor:pointer;}
    @media print{.lsh-ap{display:none !important;}}`;

  function style() {
    if (document.getElementById('lsh-ap-css')) return;
    const s = document.createElement('style'); s.id = 'lsh-ap-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function html(d) {
    const on = playing === d.nav;
    return `<span class="lsh-ap" data-deck="${d.key}">
      <button type="button" class="lsh-ap-btn ${d.btn} ${on ? 'on' : ''}" onclick="LSHAutoplay.toggle('${d.key}')"
        title="Play the slides by themselves, one every ${secs()} seconds">${on ? '⏸ Stop autoplay' : '▶ Autoplay'}</button>
      <select onchange="LSHAutoplay.speed(this.value)" title="How long each slide stays up" aria-label="Autoplay speed">
        ${SPEEDS.map(v => `<option value="${v}" ${v === secs() ? 'selected' : ''}>${v}s</option>`).join('')}
      </select>
    </span>`;
  }

  // Put the control next to the Next button of every deck that is on the page, and keep
  // its label in step with what is playing. Decks redraw themselves, so this runs often.
  function paint() {
    style();
    DECKS.forEach(d => {
      document.querySelectorAll(d.nav).forEach(nav => {
        // the audience window mirrors the trainer's slides: it is watched, never driven
        if (nav.closest('#audienceRoot')) return;
        const b = nextBtn(nav);
        const ap0 = nav.querySelector('.lsh-ap');
        // no Next button, or a bar that doesn't move slides (a lesson's Objectives bar, the last
        // slide's ✓ Finish lesson): nothing to play, so no button
        if (!b || atEnd(nav)) { if (ap0) ap0.remove(); return; }
        let ap = ap0;
        if (!ap) {
          b.insertAdjacentHTML('beforebegin', html(d));
          return;
        }
        const on = playing === d.nav;
        const btn = ap.querySelector('.lsh-ap-btn');
        if (btn) {
          btn.classList.toggle('on', on);
          const label = on ? '⏸ Stop autoplay' : '▶ Autoplay';
          if (btn.innerHTML !== label) btn.innerHTML = label;
        }
        const sel = ap.querySelector('select');
        if (sel && sel.value !== String(secs())) sel.value = String(secs());
        // it belongs just before Next, even after the deck has redrawn its bar
        if (ap.nextElementSibling !== b) b.insertAdjacentElement('beforebegin', ap);
      });
    });
    // the deck that was playing has left the screen
    if (playing && !document.querySelector(playing)) stop();
  }

  /* ---------- anything the person does to the deck stops autoplay ---------- */
  document.addEventListener('click', (e) => {
    if (!playing) return;
    const t = e.target.closest('button, a, select, .or-dots button, #lbp-toc button');
    if (!t || t.closest('.lsh-ap')) return;
    const nav = t.closest(playing);
    // a press on the deck's own Next button is autoplay's own click; anything else is the person taking over
    if (nav && t === nextBtn(nav)) return;
    stop();
  }, true);

  document.addEventListener('keydown', (e) => {
    if (!playing) return;
    if (['ArrowRight', 'ArrowLeft', 'PageUp', 'PageDown', 'Escape', ' '].includes(e.key)) stop();
  });

  window.LSHAutoplay = {
    toggle,
    speed: setSpeed,
    stop: () => stop(),
    playing: () => !!playing,
    refresh: paint
  };

  function begin() { paint(); setInterval(paint, 700); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
})();
