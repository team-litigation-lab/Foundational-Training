"""This program's edits to js/eapa-updates.js (the EA/PA engine), applied by build.py.

Each lesson here is a Canva deck: one live embed. In the slides window you share in Google Meet,
the engine redraws the step whenever the window resizes or goes full screen, or the presenter
reconnects. Redrawing a deck reloads it at page 1 and drops Canva's own full screen, so:
- the slides window keeps the deck when the same step comes again;
- ← → pressed in the slides window go to the deck, to turn its pages (the console's Next → moves on);
- the live copy in the presenter console doesn't load a second deck (it can't follow the room's page).
Each (old, new) pair must match exactly once.
"""
PATCHES = [
    ('''  document.addEventListener("keydown", (e)=>{
    const dir = ["ArrowRight","PageDown"," "].includes(e.key) ? 1 : (["ArrowLeft","PageUp"].includes(e.key) ? -1 : 0);
    if(dir && pvChannel()){ e.preventDefault(); PV.ch.postMessage({type:"key", dir}); }
  });''',
     '''  document.addEventListener("keydown", (e)=>{
    const dir = ["ArrowRight","PageDown"," "].includes(e.key) ? 1 : (["ArrowLeft","PageUp"].includes(e.key) ? -1 : 0);
    if(!dir) return;
    // On a Canva deck the keys turn the deck's pages: they go to the deck (the console's Next → moves on).
    const deck = isMain && root.querySelector(".canva-frame iframe");
    if(deck){ e.preventDefault(); deck.focus(); return; }
    if(pvChannel()){ e.preventDefault(); PV.ch.postMessage({type:"key", dir}); }
  });'''),
    ('''  const show = (m)=>{
    const d = DAYS.find(x=>x.id===m.dayId); if(!d) return;
    last = m;''',
     '''  const show = (m)=>{
    const d = DAYS.find(x=>x.id===m.dayId); if(!d) return;
    // A Canva deck is a live embed: drawing the step again would reload it at page 1 and drop Canva's own
    // full screen. Keep it when the same step comes again (a resize, full screen, the presenter reconnecting).
    const keep = last && last.dayId===m.dayId && last.slide===m.slide && root.querySelector(".canva-frame");
    last = m;
    if(keep){ if(isMain) pvChannel().postMessage({type:"rendered", dayId:d.id, slide:m.slide, page:0, pages:1, w:root.clientWidth, h:root.clientHeight}); return; }'''),
    ('''    if(isMain) pvChannel().postMessage({type:"rendered", dayId:d.id, slide:m.slide, page:state.slidePage||0''',
     '''    // The live copy in the console doesn't load a second deck: it can't follow the room's page.
    if(!isMain) root.querySelectorAll(".canva-frame").forEach(f=>{ f.innerHTML = `<div class="aud-deck-note"><b>🎞 Canva deck</b>It's live in your slides window. Turn its pages there: click the deck, or press ← →.</div>`; });
    if(isMain) pvChannel().postMessage({type:"rendered", dayId:d.id, slide:m.slide, page:state.slidePage||0'''),
    (""".aud-wait b{font-family:'Fraunces',Georgia,serif;font-size:30px;color:#F0C08A;}""",
     """.aud-wait b{font-family:'Fraunces',Georgia,serif;font-size:30px;color:#F0C08A;}
.aud-deck-note{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:40px;background:#161829;border-radius:8px;color:#fff;font-size:30px;line-height:1.4;text-align:center;}
.aud-deck-note b{font-family:'Fraunces',Georgia,serif;font-size:44px;color:#F0C08A;}"""),
]


def apply(u):
    for old, new in PATCHES:
        n = u.count(old)
        if n != 1:
            raise SystemExit(f"MISSING ({n}) in eapa-updates.js: {old[:80]!r}")
        u = u.replace(old, new)
    return u
