/* ============================================================
   🎮 KNOWLEDGE GAMES — game-show reviews of each lesson, beside its Knowledge Check
   ------------------------------------------------------------
   The written Process Questions stay the graded Knowledge Check (70% passes the lesson). These games are a scored
   review of the same lesson, played as a game show (#/kcgames):
     💰 Millionaire      — a 10-step points ladder, 30 s a question, 50:50 and Ask the Audience, walk away any time
     💣 Countdown Bomb   — the fuse burns down; answer before it blows (the correct answer shows when it does)
     📋 Survey Says      — the top answers hide behind a board; type them; three strikes
     🟦 Jeopardy         — categories across, values down, a Daily Double hidden somewhere
     ⚡ Rapid Fire       — a definition, four terms, three seconds
     🎡 Spin the Wheel   — the wheel picks the category and the multiplier
     🚪 Mystery Doors    — a question, a double, or a bonus behind each door
     🔍 Blur & Zoom      — a document sharpens or zooms out: name it before it’s clear
   Every game ends on what was missed, with why. Questions: the starting bank (js/ft-kcbank.js) plus the trainer’s
   own (Admin → 📚 Dashboard → 🎮 Knowledge Games, settings:kcgames), minus any the trainer hid. Plays are saved in
   kcgames:<id> (the trainee’s own); the best accuracy per lesson shows on 🏅 My Performance.
   ============================================================ */
(function(){
"use strict";
const e = v => esc(String(v == null ? "" : v));
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const BANK = () => window.FT_KC_BANK || {lessons: {}, docs: []};
const GAMES = [
  {id: "millionaire", icon: "💰", name: "Millionaire", blurb: "Climb a 10-step ladder. Two lifelines. Walk away any time."},
  {id: "bomb", icon: "💣", name: "Countdown Bomb", blurb: "Beat the burning fuse on every question."},
  {id: "feud", icon: "📋", name: "Survey Says", blurb: "Find the top answers on the board. Three strikes."},
  {id: "jeopardy", icon: "🟦", name: "Jeopardy", blurb: "Pick a category and a value. Find the Daily Double."},
  {id: "rapid", icon: "⚡", name: "Rapid Fire", blurb: "A definition, four terms, three seconds."},
  {id: "wheel", icon: "🎡", name: "Spin the Wheel", blurb: "The wheel picks the category and the multiplier."},
  {id: "doors", icon: "🚪", name: "Mystery Doors", blurb: "A question, a double, or a bonus behind each door."},
  {id: "reveal", icon: "🔍", name: "Blur & Zoom", blurb: "Name the document before it comes into focus."}
];

/* ---------- the questions: the bank + the trainer's, minus the hidden ---------- */
const X = {data: null, at: 0, loading: null};
function loadExtras(force){
  if(X.loading) return X.loading;
  if(!force && X.data && Date.now() - X.at < 120000) return Promise.resolve(X.data);
  X.loading = sharedGet("settings:kcgames").then(v => { X.data = v && typeof v === "object" ? Object.assign({lessons: {}, hidden: {}}, v) : {lessons: {}, hidden: {}}; X.at = Date.now(); })
    .catch(() => { if(!X.data) X.data = {lessons: {}, hidden: {}}; }).then(() => { X.loading = null; if(["kcgames"].includes(state.view) || (state.view === "admin" && state.adminTab === "kcgames")) render(); return X.data; });
  return X.loading;
}
function pool(lesson){
  const b = BANK().lessons[lesson] || {mc: [], list: [], term: []}, ex = ((X.data || {}).lessons || {})[lesson] || {}, hid = (X.data || {}).hidden || {};
  const mc = b.mc.map((m, i) => ({id: `b${lesson}-mc${i}`, cat: m[0], value: m[1], q: m[2], choices: m[3], a: m[4], why: m[5]})).concat((ex.mc || []).map(m => Object.assign({own: true}, m)));
  const list = b.list.map((l, i) => ({id: `b${lesson}-li${i}`, q: l[0], answers: l[1].map(x => ({t: x[0], pts: x[1], alt: x[2] || []}))})).concat((ex.list || []).map(l => Object.assign({own: true}, l)));
  const term = b.term.map((t, i) => ({id: `b${lesson}-te${i}`, term: t[0], def: t[1]})).concat((ex.term || []).map(t => Object.assign({own: true}, t)));
  const docs = BANK().docs.filter(d => d.lesson.includes(Number(lesson)));
  const ok = x => !hid[x.id];
  return {mc: mc.filter(ok), list: list.filter(ok), term: term.filter(ok), docs: docs.length >= 3 ? docs : BANK().docs};
}
// the lessons the trainee has reached (dayReached: the lesson's lock in index.html), every lesson for a trainer
const lessonsOn = () => Object.keys(BANK().lessons).map(Number).filter(l => state.isAdmin || state.adminPreview || typeof dayReached !== "function" || dayReached(l));

/* ---------- sound: tiny synth cues (Web Audio), off with 🔇 ---------- */
let AC = null;
const muted = () => { try{ return localStorage.getItem("ft_kc_mute") === "1"; }catch(err){ return false; } };
function tone(freqs, dur, type, gain){
  if(muted()) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = AC.currentTime;
    freqs.forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type || "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * dur); g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + i * dur + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
      o.connect(g); g.connect(AC.destination); o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur + 0.05); });
  }catch(err){}
}
const SFX = {
  right: () => tone([523, 659, 784], 0.11, "triangle"), wrong: () => tone([196, 147], 0.22, "sawtooth", 0.08), tick: () => tone([1200], 0.03, "square", 0.03),
  flip: () => tone([880, 1175], 0.07, "triangle", 0.08), boom: () => tone([90, 60, 45], 0.18, "sawtooth", 0.16), win: () => tone([523, 659, 784, 1047, 784, 1047], 0.12, "triangle"),
  spin: () => tone([440, 494, 523, 587, 659, 698, 784], 0.05, "square", 0.04), door: () => tone([330, 392, 523], 0.09, "sine")
};

/* ---------- the game state ---------- */
const G = {lesson: null, game: null, s: null, timer: null, rec: null, recId: null};
const stop = () => { clearInterval(G.timer); G.timer = null; };
function loadRec(){
  const id = state.traineeId; if(!id || (G.recId === id && G.rec)) return;
  G.recId = id; sharedGet("kcgames:" + id).then(v => { G.rec = v && Array.isArray(v.plays) ? v : {plays: []}; if(state.view === "kcgames") render(); }).catch(() => { G.rec = {plays: []}; });
}
async function savePlay(p){
  const id = state.traineeId; if(!id) return;
  G.rec = G.rec || {plays: []}; G.rec.plays = G.rec.plays.concat([Object.assign({at: new Date().toISOString()}, p)]).slice(-500);
  if(await sharedSet("kcgames:" + id, G.rec) === false) toast("Couldn’t save your score. Check your connection.");
}
const bestOf = (lesson, game) => ((G.rec || {}).plays || []).filter(p => p.lesson === lesson && (!game || p.game === game)).reduce((m, p) => Math.max(m, p.score || 0), -1);
// end of any game: the score, and the questions missed with why
function finish(score, correct, total, missed){
  stop(); const s = G.s; s.over = {score, correct, total, missed: missed || []};
  if(correct >= Math.ceil(total * 0.7)) SFX.win();
  savePlay({lesson: G.lesson, game: G.game, score, correct, total});
  render();
}
function overHtml(){
  const o = G.s.over, g = GAMES.find(x => x.id === G.game), pct = o.total ? Math.round(o.correct / o.total * 100) : 0;
  return `<div class="kg-over"><div class="kg-trophy">${pct >= 90 ? "🏆" : pct >= 70 ? "🥈" : "🎯"}</div><h2>${e(g.name)} · ${o.score.toLocaleString()} points</h2>
    <p class="kg-sub">${o.correct} of ${o.total} right (${pct}%) · Lesson ${G.lesson}: ${e((BANK().lessons[G.lesson] || {}).title || "")}</p>
    ${o.missed.length ? `<div class="kg-missed"><h3>Worth another look</h3>${o.missed.map(m => `<div class="kg-miss"><b>${e(m.q)}</b><span>✓ ${e(m.a)}</span>${m.why ? `<em>${e(m.why)}</em>` : ""}</div>`).join("")}</div>` : `<p class="kg-sub">Nothing missed. Well played.</p>`}
    <div class="kg-acts"><button class="kg-btn gold" onclick="FTKCGames.play('${G.game}')">Play again</button><button class="kg-btn" onclick="FTKCGames.hub()">Other games</button></div></div>`;
}
const missOf = m => ({q: m.q, a: m.choices[m.a], why: m.why});
// a multiple-choice question shown with its choices shuffled (and remembered for the answer)
function mcView(m){ const order = shuffle(m.choices.map((c, i) => i)); return {m, order}; }
function choicesHtml(v, onPick, opts){
  opts = opts || {}; const L = "ABCD";
  return `<div class="kg-choices">${v.order.map((ci, k) => { const gone = (opts.gone || []).includes(ci), st = opts.shown ? (ci === v.m.a ? "right" : ci === opts.picked ? "wrong" : "") : "";
    return `<button class="kg-choice ${st} ${gone ? "gone" : ""}" ${gone || opts.shown ? "disabled" : ""} onclick="${onPick}(${ci})"><i>${L[k]}</i><span>${e(v.m.choices[ci])}</span></button>`; }).join("")}</div>`;
}

/* ---------- 💰 Millionaire ---------- */
const LADDER = [100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
const SAFE = [4, 9];   // after Q5 (2,000) and Q10
function startMillionaire(P){
  const qs = shuffle(P.mc).slice(0, 30).sort((a, b) => a.value - b.value);
  const pickN = []; [0, 3, 6, 9, 12, 15, 18, 21, 24, 27].forEach(i => { if(qs[i]) pickN.push(qs[i]); });
  const list = pickN.length >= 10 ? pickN : shuffle(P.mc).slice(0, 10).sort((a, b) => a.value - b.value);
  G.s = {qs: list, i: 0, v: mcView(list[0]), left: 30, ff: false, aud: false, gone: [], audience: null, banked: 0, missed: []};
  tickTimer(30, () => millPick(-1));
}
function tickTimer(secs, onOut){
  stop(); G.s.left = secs;
  G.timer = setInterval(() => { G.s.left--; const el = document.getElementById("kgClock"); if(el){ el.textContent = G.s.left; el.classList.toggle("hot", G.s.left <= 5); }
    const bar = document.getElementById("kgFuse"); if(bar) bar.style.width = Math.max(0, G.s.left / secs * 100) + "%";
    if(G.s.left <= 5 && G.s.left > 0) SFX.tick();
    if(G.s.left <= 0){ stop(); onOut(); } }, 1000);
}
function millPick(ci){
  const s = G.s; if(s.shown != null) return; stop();
  const right = ci === s.v.m.a; s.shown = ci; render();
  if(right){ SFX.right(); s.banked = LADDER[s.i]; } else { SFX.wrong(); s.missed.push(missOf(s.v.m)); }
  setTimeout(() => {
    if(!right || s.i === s.qs.length - 1){ const safe = !right ? (SAFE.filter(x => x < s.i).map(x => LADDER[x]).pop() || 0) : s.banked;
      return finish(safe, right ? s.i + 1 : s.i, s.qs.length, s.missed.concat(right ? [] : s.qs.slice(s.i + 1).map(missOf).slice(0, 0))); }
    s.i++; s.v = mcView(s.qs[s.i]); s.shown = null; s.gone = []; s.audience = null; render(); tickTimer(30, () => millPick(-1));
  }, 1600);
}
function millHtml(){
  const s = G.s, m = s.v.m;
  return `<div class="kg-mill"><div class="kg-ladder">${LADDER.map((p, i) => `<div class="${i === s.i ? "on" : ""} ${i < s.i ? "won" : ""} ${SAFE.includes(i) ? "safe" : ""}"><i>${i + 1}</i>${p.toLocaleString()}</div>`).reverse().join("")}</div>
    <div class="kg-mill-main"><div class="kg-top"><span class="kg-cat">${e(m.cat)}</span><span class="kg-clock" id="kgClock">${s.left}</span></div>
      <div class="kg-q">${e(m.q)}</div>
      ${s.audience ? `<div class="kg-aud">${s.v.order.map((ci, k) => `<div><span style="--h:${s.audience[ci]}%"></span><b>${"ABCD"[k]}</b><small>${s.audience[ci]}%</small></div>`).join("")}</div>` : ""}
      ${choicesHtml(s.v, "FTKCGames.mill", {gone: s.gone, shown: s.shown != null, picked: s.shown})}
      <div class="kg-life"><button class="kg-btn" ${s.ff || s.shown != null ? "disabled" : ""} onclick="FTKCGames.fifty()">50:50</button><button class="kg-btn" ${s.aud || s.shown != null ? "disabled" : ""} onclick="FTKCGames.audience()">👥 Ask the Audience</button>
        <button class="kg-btn" ${s.shown != null ? "disabled" : ""} onclick="FTKCGames.walk()">Walk away with ${s.banked.toLocaleString()}</button></div></div></div>`;
}

/* ---------- 💣 Countdown Bomb ---------- */
const FUSE = 12;
function startBomb(P){
  const qs = shuffle(P.mc).slice(0, 10);
  G.s = {qs, i: 0, v: mcView(qs[0]), score: 0, right: 0, missed: [], boom: false};
  tickTimer(FUSE, () => bombPick(-1));
}
function bombPick(ci){
  const s = G.s; if(s.shown != null) return; const left = s.left; stop();
  const right = ci === s.v.m.a; s.shown = ci; s.boom = ci === -1;
  if(right){ SFX.right(); s.right++; s.score += 100 + left * 25; } else { s.boom ? SFX.boom() : SFX.wrong(); s.missed.push(missOf(s.v.m)); }
  render();
  setTimeout(() => { if(s.i === s.qs.length - 1) return finish(s.score, s.right, s.qs.length, s.missed);
    s.i++; s.v = mcView(s.qs[s.i]); s.shown = null; s.boom = false; render(); tickTimer(FUSE, () => bombPick(-1)); }, s.boom ? 2000 : 1300);
}
function bombHtml(){
  const s = G.s;
  return `<div class="kg-bomb ${s.boom ? "boom" : ""}"><div class="kg-top"><span class="kg-cat">💣 ${s.i + 1} / ${s.qs.length}</span><span class="kg-score">${s.score.toLocaleString()}</span><span class="kg-clock" id="kgClock">${s.left}</span></div>
    <div class="kg-fuse"><span id="kgFuse" style="width:${s.left / FUSE * 100}%"></span><i class="spark"></i></div>
    ${s.boom ? `<div class="kg-blast">💥</div>` : ""}
    <div class="kg-q">${e(s.v.m.q)}</div>${choicesHtml(s.v, "FTKCGames.bomb", {shown: s.shown != null, picked: s.shown})}</div>`;
}

/* ---------- 📋 Survey Says ---------- */
const normA = t => String(t || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function close(a, b){ if(a === b) return true; if(Math.abs(a.length - b.length) > 2 || a.length < 4) return false;
  const d = Array.from({length: a.length + 1}, (_, i) => [i]); for(let j = 1; j <= b.length; j++) d[0][j] = j;
  for(let i = 1; i <= a.length; i++) for(let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] <= 2; }
function matchFeud(list, guess){
  const g = normA(guess); if(!g) return -1;
  return list.answers.findIndex(x => [x.t].concat(x.alt || []).some(t => { const n = normA(t); return close(n, g) || (g.length >= 5 && (n.includes(g) || g.includes(n))); }));
}
function startFeud(P){
  const rounds = shuffle(P.list).slice(0, 3);
  G.s = {rounds, r: 0, open: [], strikes: 0, score: 0, found: 0, total: rounds.reduce((n, l) => n + l.answers.length, 0), flash: null, missed: [], roundOver: false};
}
function feudGuess(){
  const s = G.s, inp = document.getElementById("kgGuess"); const v = inp ? inp.value : ""; if(!v.trim() || s.roundOver) return;
  const L = s.rounds[s.r], k = matchFeud(L, v);
  if(k >= 0 && !s.open.includes(k)){ s.open.push(k); s.score += L.answers[k].pts * 10; s.found++; SFX.flip(); s.flash = null; }
  else if(k >= 0){ s.flash = "Already on the board."; }
  else { s.strikes++; SFX.wrong(); s.flash = "✗"; }
  if(s.open.length === L.answers.length || s.strikes >= 3){ s.roundOver = true; L.answers.forEach((a, i) => { if(!s.open.includes(i)) s.missed.push({q: L.q, a: a.t}); }); }
  render(); setTimeout(() => { const i = document.getElementById("kgGuess"); if(i) i.focus(); }, 30);
}
function feudNext(){ const s = G.s; if(s.r === s.rounds.length - 1) return finish(s.score, s.found, s.total, s.missed); s.r++; s.open = []; s.strikes = 0; s.roundOver = false; s.flash = null; render(); }
function feudHtml(){
  const s = G.s, L = s.rounds[s.r];
  return `<div class="kg-feud"><div class="kg-top"><span class="kg-cat">📋 Round ${s.r + 1} / ${s.rounds.length}</span><span class="kg-score">${s.score.toLocaleString()}</span><span class="kg-strikes">${[0, 1, 2].map(i => `<b class="${i < s.strikes ? "on" : ""}">✗</b>`).join("")}</span></div>
    <div class="kg-q">${e(L.q)}</div>
    <div class="kg-board">${L.answers.map((a, i) => { const o = s.open.includes(i) || s.roundOver; return `<div class="kg-tile ${o ? "open" : ""} ${s.roundOver && !s.open.includes(i) ? "late" : ""}"><div class="f"><b>${i + 1}</b></div><div class="b"><span>${e(a.t)}</span><em>${a.pts}</em></div></div>`; }).join("")}</div>
    ${s.flash === "✗" ? `<div class="kg-bigx">✗</div>` : s.flash ? `<p class="kg-sub">${e(s.flash)}</p>` : ""}
    ${s.roundOver ? `<div class="kg-acts"><button class="kg-btn gold" onclick="FTKCGames.feudNext()">${s.r === s.rounds.length - 1 ? "See my score" : "Next board →"}</button></div>`
      : `<div class="kg-guess"><input id="kgGuess" autocomplete="off" placeholder="Your answer…" onkeydown="if(event.key==='Enter'){event.preventDefault();FTKCGames.guess();}"><button class="kg-btn gold" onclick="FTKCGames.guess()">Survey says!</button></div>`}</div>`;
}

/* ---------- 🟦 Jeopardy ---------- */
function startJeopardy(P){
  const cats = shuffle([...new Set(P.mc.map(m => m.cat))]).slice(0, 4), vals = [100, 200, 300, 400, 500];
  // each value gets the category's closest question not already on the board (a short category leaves its last cells empty)
  const grid = cats.map(c => { const left = shuffle(P.mc.filter(m => m.cat === c)); return vals.map(v => { if(!left.length) return null;
    const k = left.reduce((b, m, i) => Math.abs(m.value - v) < Math.abs(left[b].value - v) ? i : b, 0); return {m: left.splice(k, 1)[0], v, done: false}; }); });
  const cells = grid.flat().filter(Boolean); const dd = cells[Math.floor(Math.random() * cells.length)]; if(dd) dd.dd = true;
  G.s = {cats, vals, grid, score: 0, right: 0, total: cells.length, open: null, missed: []};
}
function jeoOpen(c, r){ const s = G.s, cell = s.grid[c][r]; if(!cell || cell.done) return; s.open = {cell, v: mcView(cell.m), shown: null}; if(cell.dd) SFX.win(); else SFX.flip(); render(); }
function jeoPick(ci){
  const s = G.s, o = s.open; if(!o || o.shown != null) return; o.shown = ci;
  const worth = o.cell.v * (o.cell.dd ? 2 : 1);
  if(ci === o.cell.m.a){ s.score += worth; s.right++; SFX.right(); } else { s.score -= worth; SFX.wrong(); s.missed.push(missOf(o.cell.m)); }
  o.cell.done = true; render();
  setTimeout(() => { s.open = null; if(s.grid.flat().filter(Boolean).every(x => x.done)) return finish(Math.max(0, s.score), s.right, s.total, s.missed); render(); }, 1500);
}
function jeoHtml(){
  const s = G.s;
  if(s.open){ const o = s.open; return `<div class="kg-jclue"><div class="kg-top"><span class="kg-cat">${e(o.cell.m.cat)} · ${o.cell.v}${o.cell.dd ? " · ✨ DAILY DOUBLE ×2" : ""}</span><span class="kg-score">${s.score.toLocaleString()}</span></div>
      <div class="kg-q big">${e(o.cell.m.q)}</div>${choicesHtml(o.v, "FTKCGames.jeo", {shown: o.shown != null, picked: o.shown})}</div>`; }
  return `<div class="kg-jeo"><div class="kg-top"><span class="kg-cat">🟦 Pick a clue</span><span class="kg-score">${s.score.toLocaleString()}</span><button class="kg-btn" onclick="FTKCGames.jeoEnd()">Finish</button></div>
    <div class="kg-jgrid" style="grid-template-columns:repeat(${s.cats.length},minmax(0,1fr))">${s.cats.map(c => `<div class="kg-jcat">${e(c)}</div>`).join("")}
      ${s.vals.map((v, r) => s.cats.map((c, ci) => { const cell = s.grid[ci][r]; return cell ? `<button class="kg-jcell ${cell.done ? "done" : ""}" ${cell.done ? "disabled" : ""} onclick="FTKCGames.jeoOpen(${ci},${r})">${cell.done ? "" : v}</button>` : `<div class="kg-jcell done"></div>`; }).join("")).join("")}</div></div>`;
}

/* ---------- ⚡ Rapid Fire ---------- */
const RAPID = 3;
function startRapid(P){
  const ts = P.term.length >= 4 ? P.term : P.term.concat(Object.values(BANK().lessons).flatMap(b => (b.term || []).map((t, i) => ({id: "x" + i + t[0], term: t[0], def: t[1]}))));
  const qs = shuffle(ts).slice(0, 15).map(t => ({t, opts: shuffle([t].concat(shuffle(ts.filter(x => x.term !== t.term)).slice(0, 3)))}));
  G.s = {qs, i: 0, score: 0, right: 0, streak: 0, shown: null, missed: []};
  rapidTimer();
}
function rapidTimer(){ const s = G.s; s.t0 = Date.now(); stop(); G.timer = setInterval(() => { const left = Math.max(0, RAPID - (Date.now() - s.t0) / 1000); const bar = document.getElementById("kgFuse"); if(bar) bar.style.width = left / RAPID * 100 + "%"; if(left <= 0){ stop(); rapidPick(-1); } }, 50); }
function rapidPick(k){
  const s = G.s; if(s.shown != null) return; stop(); const q = s.qs[s.i], right = k >= 0 && q.opts[k].term === q.t.term; s.shown = k;
  if(right){ s.streak++; s.right++; s.score += 100 * Math.min(4, 1 + Math.floor(s.streak / 3)); SFX.right(); } else { s.streak = 0; SFX.wrong(); s.missed.push({q: q.t.def, a: q.t.term}); }
  render();
  setTimeout(() => { if(s.i === s.qs.length - 1) return finish(s.score, s.right, s.qs.length, s.missed); s.i++; s.shown = null; render(); rapidTimer(); }, 700);
}
function rapidHtml(){
  const s = G.s, q = s.qs[s.i], mult = Math.min(4, 1 + Math.floor(s.streak / 3));
  return `<div class="kg-rapid"><div class="kg-top"><span class="kg-cat">⚡ ${s.i + 1} / ${s.qs.length}</span><span class="kg-score">${s.score.toLocaleString()}</span><span class="kg-streak">🔥 ${s.streak} · ×${mult}</span></div>
    <div class="kg-fuse fast"><span id="kgFuse" style="width:100%"></span></div>
    <div class="kg-q big">${e(q.t.def)}</div>
    <div class="kg-choices">${q.opts.map((o, k) => `<button class="kg-choice ${s.shown != null ? (o.term === q.t.term ? "right" : k === s.shown ? "wrong" : "") : ""}" ${s.shown != null ? "disabled" : ""} onclick="FTKCGames.rapid(${k})"><i>${"ABCD"[k]}</i><span>${e(o.term)}</span></button>`).join("")}</div></div>`;
}

/* ---------- 🎡 Spin the Wheel ---------- */
const MULTS = [1, 2, 1, 3, 1, 2, 1, 5];
function startWheel(P){
  const cats = [...new Set(P.mc.map(m => m.cat))];
  const segs = MULTS.map((x, i) => ({cat: cats[i % cats.length], x}));
  G.s = {P, segs, spins: 0, max: 5, angle: 0, spinning: false, q: null, score: 0, right: 0, missed: [], used: new Set()};
}
function wheelSpin(){
  const s = G.s; if(s.spinning || s.q) return; s.spinning = true; SFX.spin();
  const k = Math.floor(Math.random() * s.segs.length), per = 360 / s.segs.length;
  s.angle = s.angle - (s.angle % 360) + 360 * 5 + (360 - (k * per + per / 2));
  const w = document.getElementById("kgWheel"); if(w) w.style.transform = `rotate(${s.angle}deg)`;
  setTimeout(() => { s.spinning = false; const seg = s.segs[k], fit = s.P.mc.filter(m => m.cat === seg.cat && !s.used.has(m.id)), m = (fit.length ? shuffle(fit) : shuffle(s.P.mc.filter(x => !s.used.has(x.id))))[0] || s.P.mc[0];
    s.used.add(m.id); s.q = {seg, v: mcView(m), shown: null}; SFX.door(); render(); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 3200);
}
function wheelPick(ci){
  const s = G.s, q = s.q; if(!q || q.shown != null) return; q.shown = ci;
  if(ci === q.v.m.a){ s.right++; s.score += q.v.m.value * q.seg.x; SFX.right(); } else { SFX.wrong(); s.missed.push(missOf(q.v.m)); }
  s.spins++; render();
  setTimeout(() => { s.q = null; if(s.spins >= s.max) return finish(s.score, s.right, s.max, s.missed); render(); }, 1500);
}
function wheelHtml(){
  const s = G.s, per = 360 / s.segs.length, cols = ["#C9702A", "#1F2A44", "#2E7D4F", "#6B3FA0", "#B42318", "#0B57D0", "#8A5A00", "#3A4A6B"];
  const grad = s.segs.map((g, i) => `${cols[i % cols.length]} ${i * per}deg ${(i + 1) * per}deg`).join(",");
  if(s.q){ const q = s.q; return `<div class="kg-jclue"><div class="kg-top"><span class="kg-cat">🎡 ${e(q.seg.cat)} · ×${q.seg.x}</span><span class="kg-score">${s.score.toLocaleString()}</span><span class="kg-cat">Spin ${s.spins + (q.shown != null ? 0 : 1)} / ${s.max}</span></div>
      <div class="kg-q">${e(q.v.m.q)}</div>${choicesHtml(q.v, "FTKCGames.wheelPick", {shown: q.shown != null, picked: q.shown})}</div>`; }
  return `<div class="kg-wheelbox"><div class="kg-top"><span class="kg-cat">🎡 Spin ${s.spins + 1} / ${s.max}</span><span class="kg-score">${s.score.toLocaleString()}</span></div>
    <div class="kg-wheelwrap"><div class="kg-pointer">▼</div><div class="kg-wheel" id="kgWheel" style="background:conic-gradient(${grad});transform:rotate(${s.angle}deg)">
      ${s.segs.map((g, i) => `<span style="transform:rotate(${i * per + per / 2}deg) translateY(-118px) rotate(${-(i * per + per / 2)}deg)"><b>×${g.x}</b><small>${e(g.cat)}</small></span>`).join("")}</div></div>
    <div class="kg-acts"><button class="kg-btn gold" ${s.spinning ? "disabled" : ""} onclick="FTKCGames.spin()">${s.spinning ? "Spinning…" : "SPIN"}</button></div></div>`;
}

/* ---------- 🚪 Mystery Doors ---------- */
const PRIZES = [{k: "q", label: "A question", x: 1}, {k: "q", label: "Double points!", x: 2}, {k: "bonus", label: "Bonus +300", x: 0}];
function startDoors(P){ G.s = {P, round: 0, max: 5, doors: shuffle(PRIZES), opened: null, q: null, score: 0, right: 0, asked: 0, missed: [], used: new Set()}; }
function doorOpen(i){
  const s = G.s; if(s.opened != null) return; s.opened = i; SFX.door(); const p = s.doors[i];
  if(p.k === "bonus"){ s.score += 300; render(); setTimeout(doorNext, 1500); return; }
  const m = shuffle(s.P.mc.filter(x => !s.used.has(x.id)))[0] || s.P.mc[0]; s.used.add(m.id); s.asked++;
  render(); setTimeout(() => { s.q = {p, v: mcView(m), shown: null}; render(); }, 900);
}
function doorPick(ci){
  const s = G.s, q = s.q; if(!q || q.shown != null) return; q.shown = ci;
  if(ci === q.v.m.a){ s.right++; s.score += q.v.m.value * q.p.x; SFX.right(); } else { SFX.wrong(); s.missed.push(missOf(q.v.m)); }
  render(); setTimeout(doorNext, 1500);
}
function doorNext(){ const s = G.s; s.round++; if(s.round >= s.max) return finish(s.score, s.right, Math.max(1, s.asked), s.missed); s.doors = shuffle(PRIZES); s.opened = null; s.q = null; render(); }
function doorsHtml(){
  const s = G.s;
  if(s.q){ const q = s.q; return `<div class="kg-jclue"><div class="kg-top"><span class="kg-cat">🚪 ${e(q.p.label)}</span><span class="kg-score">${s.score.toLocaleString()}</span></div>
      <div class="kg-q">${e(q.v.m.q)}</div>${choicesHtml(q.v, "FTKCGames.doorPick", {shown: q.shown != null, picked: q.shown})}</div>`; }
  return `<div class="kg-doorsbox"><div class="kg-top"><span class="kg-cat">🚪 Round ${s.round + 1} / ${s.max}</span><span class="kg-score">${s.score.toLocaleString()}</span></div>
    <p class="kg-sub">Pick a door.</p><div class="kg-doors">${s.doors.map((p, i) => `<button class="kg-door ${s.opened === i ? "open" : ""} ${s.opened != null && s.opened !== i ? "dim" : ""}" ${s.opened != null ? "disabled" : ""} onclick="FTKCGames.door(${i})">
      <span class="leaf">${i + 1}</span><span class="inside">${s.opened === i ? e(p.label) : ""}</span></button>`).join("")}</div></div>`;
}

/* ---------- 🔍 Blur & Zoom ---------- */
const REVEAL = 9;
function startReveal(P){
  const ds = shuffle(P.docs).slice(0, 5).map((d, i) => ({d, mode: i % 2 ? "zoom" : "blur", ox: 20 + Math.random() * 60, oy: 15 + Math.random() * 60, order: shuffle(d.choices.map((c, k) => k))}));
  G.s = {ds, i: 0, score: 0, right: 0, shown: null, missed: []}; revealTimer();
}
function revealTimer(){ const s = G.s; s.t0 = Date.now(); stop(); G.timer = setInterval(() => { const t = Math.min(1, (Date.now() - s.t0) / 1000 / REVEAL), el = document.getElementById("kgDoc"), d = s.ds[s.i];
  if(el) el.style[d.mode === "blur" ? "filter" : "transform"] = d.mode === "blur" ? `blur(${(14 * (1 - t)).toFixed(1)}px)` : `scale(${(1 + 5 * (1 - t)).toFixed(2)})`;
  if(t >= 1){ stop(); } }, 60); }
function revealPick(k){
  const s = G.s; if(s.shown != null) return; const d = s.ds[s.i], el = (Date.now() - s.t0) / 1000; stop(); s.shown = k;
  const right = d.d.choices[k] === d.d.answer;
  if(right){ s.right++; s.score += Math.max(100, Math.round(1000 * (1 - Math.min(1, el / REVEAL)))); SFX.right(); } else { SFX.wrong(); s.missed.push({q: "Which document is this?", a: d.d.answer}); }
  render();
  setTimeout(() => { if(s.i === s.ds.length - 1) return finish(s.score, s.right, s.ds.length, s.missed); s.i++; s.shown = null; render(); revealTimer(); }, 1700);
}
function revealHtml(){
  const s = G.s, d = s.ds[s.i], done = s.shown != null;
  return `<div class="kg-reveal"><div class="kg-top"><span class="kg-cat">🔍 ${s.i + 1} / ${s.ds.length} · ${d.mode === "blur" ? "Blur" : "Zoom"}</span><span class="kg-score">${s.score.toLocaleString()}</span></div>
    <div class="kg-q">Which document is this? The sooner you know, the more it’s worth.</div>
    <div class="kg-docframe"><div class="kg-doc" id="kgDoc" style="transform-origin:${d.ox}% ${d.oy}%;${done ? "" : d.mode === "blur" ? "filter:blur(14px)" : "transform:scale(6)"}">${d.d.html}</div></div>
    <div class="kg-choices">${d.order.map((k, n) => `<button class="kg-choice ${done ? (d.d.choices[k] === d.d.answer ? "right" : k === s.shown ? "wrong" : "") : ""}" ${done ? "disabled" : ""} onclick="FTKCGames.reveal(${k})"><i>${"ABCD"[n]}</i><span>${e(d.d.choices[k])}</span></button>`).join("")}</div></div>`;
}

/* ---------- the hub and the page ---------- */
const STARTERS = {millionaire: startMillionaire, bomb: startBomb, feud: startFeud, jeopardy: startJeopardy, rapid: startRapid, wheel: startWheel, doors: startDoors, reveal: startReveal};
const VIEWS = {millionaire: millHtml, bomb: bombHtml, feud: feudHtml, jeopardy: jeoHtml, rapid: rapidHtml, wheel: wheelHtml, doors: doorsHtml, reveal: revealHtml};
const enough = (P, g) => g === "feud" ? P.list.length > 0 : g === "rapid" ? P.term.length > 0 : g === "reveal" ? P.docs.length > 0 : P.mc.length >= (g === "millionaire" ? 10 : 5);
function hubHtml(){
  const ls = lessonsOn(), L = G.lesson && ls.includes(G.lesson) ? G.lesson : ls[0];
  if(!L) return `<div class="card" style="padding:24px;">The games open with each lesson. None is open to you yet.</div>`;
  G.lesson = L; const P = pool(L), B = BANK().lessons;
  return `<div class="kg-hub"><div class="kg-hubhead"><p class="lp-eyebrow">✍️ Knowledge Check · review games</p><h1>🎮 Knowledge Games</h1>
      <p>Play a lesson as a game show before you answer its Process Questions. These are for review: your Process Questions are still what passes the lesson.</p>
      <div class="kg-lessons">${ls.map(l => `<button class="kg-lpill ${l === L ? "on" : ""}" onclick="FTKCGames.lesson(${l})">${l}. ${e(B[l].title)}</button>`).join("")}</div></div>
    <div class="kg-grid">${GAMES.map(g => { const ok = enough(P, g.id), b = bestOf(L, g.id); return `<button class="kg-card" ${ok ? "" : "disabled"} onclick="FTKCGames.play('${g.id}')">
      <span class="kg-icon">${g.icon}</span><b>${e(g.name)}</b><small>${e(g.blurb)}</small>${b >= 0 ? `<em>Best: ${b.toLocaleString()}</em>` : ""}</button>`; }).join("")}</div>
    <div class="kg-foot"><button class="kg-btn" onclick="FTKCGames.mute()">${muted() ? "🔇 Sound off" : "🔊 Sound on"}</button>${typeof goto === "function" ? `<button class="kg-btn" onclick="goto('process')">✍️ Back to the Process Questions</button>` : ""}</div></div>`;
}
function stageHtml(){
  const g = GAMES.find(x => x.id === G.game);
  return `<div class="kg-stage"><div class="kg-bar"><button class="kg-btn" onclick="FTKCGames.hub()">← Games</button><b>${g.icon} ${e(g.name)} · Lesson ${G.lesson}</b><button class="kg-btn" onclick="FTKCGames.mute()">${muted() ? "🔇" : "🔊"}</button></div>
    ${G.s.over ? overHtml() : VIEWS[G.game]()}</div>`;
}
window.EXTRA_ROUTE_VIEWS = (window.EXTRA_ROUTE_VIEWS || []).concat(["kcgames"]);
window.EXTRA_ROUTE_LABELS = Object.assign({}, window.EXTRA_ROUTE_LABELS || {}, {kcgames: "Knowledge Games"});
const __render = window.render;
window.render = function(){
  if(state.view !== "kcgames"){ if(G.game && !G.s?.over) stop(); return __render.apply(this, arguments); }
  if(!state.traineeId && !state.isAdmin && !state.adminPreview){ state.view = "dashboard"; return __render.apply(this, arguments); }
  if(!X.data) loadExtras(); loadRec();
  const app = document.getElementById("app");
  app.innerHTML = renderTopbar() + `<main class="main-kg">${G.game && G.s ? stageHtml() : hubHtml()}</main>` + renderFooter();
  try{ afterRender(); }catch(err){}
};
window.FTKCGames = {
  open(lesson){ if(lesson) G.lesson = Number(lesson); G.game = null; G.s = null; stop(); goto("kcgames"); },
  hub(){ stop(); G.game = null; G.s = null; render(); },
  lesson(l){ G.lesson = Number(l); render(); },
  play(g){ stop(); const P = pool(G.lesson); if(!enough(P, g)){ toast("Not enough questions in this lesson for that game yet."); return; } G.game = g; STARTERS[g](P); render(); setTimeout(() => { const i = document.getElementById("kgGuess"); if(i) i.focus(); }, 40); },
  mute(){ try{ localStorage.setItem("ft_kc_mute", muted() ? "0" : "1"); }catch(err){} render(); },
  mill: millPick, bomb: bombPick, guess: feudGuess, feudNext, jeoOpen, jeo: jeoPick, jeoEnd(){ const s = G.s; finish(Math.max(0, s.score), s.right, s.grid.flat().filter(x => x && x.done).length || 1, s.missed); },
  rapid: rapidPick, spin: wheelSpin, wheelPick, door: doorOpen, doorPick, reveal: revealPick,
  fifty(){ const s = G.s; if(s.ff) return; s.ff = true; s.gone = shuffle([0, 1, 2, 3].filter(i => i !== s.v.m.a)).slice(0, 2); SFX.flip(); render(); },
  audience(){ const s = G.s; if(s.aud) return; s.aud = true; const a = s.v.m.a, right = 45 + Math.floor(Math.random() * 30); let left = 100 - right; const out = {};
    [0, 1, 2, 3].filter(i => i !== a && !s.gone.includes(i)).forEach((i, k, arr) => { const v = k === arr.length - 1 ? left : Math.floor(Math.random() * left); out[i] = v; left -= v; });
    out[a] = right; s.gone.forEach(i => { out[i] = 0; }); [0, 1, 2, 3].forEach(i => { out[i] = out[i] || 0; }); s.audience = out; SFX.flip(); render(); },
  walk(){ const s = G.s; finish(s.banked, s.i, s.qs.length, s.missed); },
  // for the checks and the trainer's editor
  pool, games: GAMES, state: () => G, matchFeud, reload: () => loadExtras(true)
};

/* ---------- ✍️ the Knowledge Check page points here ---------- */
const __after = window.afterRender;
window.afterRender = function(){
  const out = __after ? __after.apply(this, arguments) : undefined;
  try{
    if(state.view === "process" && !document.getElementById("kgPromo")){
      const main = document.querySelector("main"); const l = Number(state.pqLesson) || null;
      if(main){ const back = main.querySelector(":scope > .back-link");
        const html = `<div class="card kg-promo" id="kgPromo"><span>🎮</span><div><b>Knowledge Games</b><small>Review ${l ? "this lesson" : "a lesson"} as a game show (Millionaire, Survey Says, Jeopardy and more) before you answer. They don’t change your grade.</small></div><button class="btn btn-navy btn-sm" onclick="FTKCGames.open(${l || ""})">Play</button></div>`;
        if(back) back.insertAdjacentHTML("afterend", html); else main.insertAdjacentHTML("afterbegin", html); }
    }
  }catch(err){}
  return out;
};

/* ---------- 🧑‍🏫 the trainer: add questions, hide any ---------- */
const AD = {lesson: 1, type: "mc"};
function adminHtml(){
  if(!X.data){ loadExtras(); return `<div class="card" style="padding:24px;">Loading the question bank…</div>`; }
  const L = AD.lesson, P = pool(L), B = BANK().lessons[L], hid = X.data.hidden || {}, all = {mc: [], list: [], term: []};
  const b = B; all.mc = b.mc.map((m, i) => ({id: `b${L}-mc${i}`, text: m[2], sub: m[3][m[4]]})); all.list = b.list.map((l, i) => ({id: `b${L}-li${i}`, text: l[0], sub: l[1].map(x => x[0]).join(" · ")})); all.term = b.term.map((t, i) => ({id: `b${L}-te${i}`, text: t[0], sub: t[1]}));
  const own = ((X.data.lessons || {})[L] || {});
  const rows = (k) => all[k].map(x => `<tr class="${hid[x.id] ? "off" : ""}"><td>${e(x.text)}<small>${e(x.sub)}</small></td><td>Built in</td><td><button class="btn btn-ghost btn-sm" onclick="FTKCGamesAdmin.hide('${x.id}')">${hid[x.id] ? "Show" : "Hide"}</button></td></tr>`)
    .concat((own[k] || []).map((x, i) => `<tr><td>${e(k === "mc" ? x.q : k === "list" ? x.q : x.term)}<small>${e(k === "mc" ? x.choices[x.a] : k === "list" ? x.answers.map(a => a.t).join(" · ") : x.def)}</small></td><td>Yours</td><td><button class="btn btn-ghost btn-sm" onclick="FTKCGamesAdmin.del('${k}',${i})">🗑</button></td></tr>`)).join("");
  const form = AD.type === "mc" ? `<label>Category<input id="kgaCat" placeholder="e.g. Callers"></label><label>Value<select id="kgaVal">${[100, 200, 300, 400, 500].map(v => `<option>${v}</option>`).join("")}</select></label>
      <label class="w">Question<input id="kgaQ"></label>${[0, 1, 2, 3].map(i => `<label>${i ? "Wrong answer " + i : "✓ Right answer"}<input id="kgaC${i}"></label>`).join("")}<label class="w">Why (shown after the game)<input id="kgaWhy"></label>`
    : AD.type === "list" ? `<label class="w">Survey question<input id="kgaQ" placeholder="Name a…"></label>${[0, 1, 2, 3, 4, 5].map(i => `<label>Answer ${i + 1}${i < 3 ? "" : " (optional)"}<input id="kgaA${i}" placeholder="answer, other way to say it, …"></label>`).join("")}`
    : `<label>Term<input id="kgaT"></label><label class="w">Definition<input id="kgaD"></label>`;
  return `<div class="card kg-admin"><div class="ff-bar"><div><h3>🎮 Knowledge Games</h3><p class="fss-muted">The questions the game-show reviews play for each lesson: the built-in starting bank, plus yours. Hide any built-in question; add your own multiple-choice questions (all eight games), survey boards (Survey Says) and terms (Rapid Fire). Trainees see changes within two minutes.</p></div>
      <span><select onchange="FTKCGamesAdmin.lesson(this.value)">${Object.keys(BANK().lessons).map(l => `<option value="${l}" ${Number(l) === L ? "selected" : ""}>Lesson ${l}: ${e(BANK().lessons[l].title)}</option>`).join("")}</select></span></div>
    <p class="fss-muted">In play for Lesson ${L}: ${P.mc.length} questions · ${P.list.length} survey boards · ${P.term.length} terms · ${P.docs.length} documents.</p>
    <div class="kg-atabs">${[["mc", "Questions"], ["list", "Survey boards"], ["term", "Terms"]].map(([k, n]) => `<button class="${AD.type === k ? "on" : ""}" onclick="FTKCGamesAdmin.type('${k}')">${n}</button>`).join("")}</div>
    <div class="kg-aform">${form}<div class="w"><button class="btn btn-navy btn-sm" onclick="FTKCGamesAdmin.add()">➕ Add to Lesson ${L}</button></div></div>
    <div class="ff-scroll"><table class="ff-tbl kg-atbl"><tbody>${rows(AD.type)}</tbody></table></div></div>`;
}
async function saveX(){ const ok = await sharedSet("settings:kcgames", X.data); toast(ok === false ? "Couldn’t save. Check your connection." : "✓ Saved — trainees see it within two minutes."); X.at = Date.now(); render(); }
const val = id => String((document.getElementById(id) || {}).value || "").trim();
window.FTKCGamesAdmin = {
  lesson(l){ AD.lesson = Number(l); render(); }, type(t){ AD.type = t; render(); },
  async hide(id){ await loadExtras(true); X.data.hidden = X.data.hidden || {}; if(X.data.hidden[id]) delete X.data.hidden[id]; else X.data.hidden[id] = true; await saveX(); },
  async del(k, i){ if(!confirm("Remove this question?")) return; await loadExtras(true); const o = (X.data.lessons[AD.lesson] || {})[k] || []; o.splice(i, 1); await saveX(); },
  async add(){
    const L = AD.lesson, k = AD.type, uid = "t" + Date.now().toString(36);
    let item;
    if(k === "mc"){ const cs = [0, 1, 2, 3].map(i => val("kgaC" + i)); if(!val("kgaQ") || cs.some(c => !c)){ toast("Write the question and all four answers."); return; }
      item = {id: uid, cat: val("kgaCat") || "Extra", value: Number(val("kgaVal")) || 200, q: val("kgaQ"), choices: cs, a: 0, why: val("kgaWhy")}; }
    else if(k === "list"){ const ans = [0, 1, 2, 3, 4, 5].map(i => val("kgaA" + i)).filter(Boolean); if(!val("kgaQ") || ans.length < 3){ toast("Write the question and at least three answers."); return; }
      const pts = [30, 24, 18, 12, 9, 7]; item = {id: uid, q: val("kgaQ"), answers: ans.map((a, i) => { const p = a.split(",").map(x => x.trim()).filter(Boolean); return {t: p[0], pts: pts[i], alt: p.slice(1)}; })}; }
    else { if(!val("kgaT") || !val("kgaD")){ toast("Write the term and its definition."); return; } item = {id: uid, term: val("kgaT"), def: val("kgaD")}; }
    await loadExtras(true); X.data.lessons = X.data.lessons || {}; const o = X.data.lessons[L] = X.data.lessons[L] || {}; (o[k] = o[k] || []).push(item); await saveX();
  }
};
ftAdminTab("kcgames", "🎮 Knowledge Games", adminHtml);

// 🏅 My Performance: the best accuracy per lesson across the games (js/ft-program.js lists this source)
window.ftKCGameItems = ctx => { const rec = ctx.rec["kcgames:"]; if(!rec || !Array.isArray(rec.plays)) return []; const by = {};
  rec.plays.forEach(p => { const pct = p.total ? Math.round(p.correct / p.total * 100) : 0; if(!by[p.lesson] || pct > by[p.lesson].pct) by[p.lesson] = {pct, n: 0}; });
  return Object.keys(by).sort((a, b) => a - b).map(l => ({name: `Lesson ${l}: ${(BANK().lessons[l] || {}).title || ""}`, pct: by[l].pct, note: `best game · ${rec.plays.filter(p => String(p.lesson) === String(l)).length} played`})); };

(function(){ const st = document.createElement("style"); st.id = "ft-kcgames"; st.textContent = `
main.main-kg{max-width:1100px;margin:0 auto;padding:18px 20px 48px;}
.kg-hub,.kg-stage{--kg1:#120E3A;--kg2:#2A1B6E;--gold:#F4C14E;--gold2:#D99A16;color:#fff;border-radius:22px;background:radial-gradient(1200px 500px at 50% -10%,#4B2FB3 0%,var(--kg2) 45%,var(--kg1) 100%);padding:22px;box-shadow:0 18px 50px rgba(18,14,58,.35);}
.kg-hubhead h1{margin:2px 0 6px;color:#fff;font-size:34px;} .kg-hubhead p{margin:0;color:#D8D3FF;max-width:72ch;} .kg-hub .lp-eyebrow{color:var(--gold);}
.kg-lessons{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;}
.kg-lpill{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;border-radius:999px;padding:6px 12px;font:600 13px inherit;cursor:pointer;} .kg-lpill.on{background:var(--gold);color:#1B1240;border-color:var(--gold);}
.kg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:18px;}
.kg-card{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;border:1px solid rgba(255,255,255,.18);background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.03));color:#fff;border-radius:16px;padding:16px;cursor:pointer;font:inherit;transition:transform .15s,box-shadow .15s;}
.kg-card:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 10px 24px rgba(0,0,0,.3);border-color:var(--gold);} .kg-card:disabled{opacity:.4;cursor:default;}
.kg-icon{font-size:30px;} .kg-card b{font-size:17px;} .kg-card small{color:#CFC9F5;font-size:13px;} .kg-card em{font-style:normal;color:var(--gold);font-weight:800;font-size:12.5px;}
.kg-foot,.kg-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;}
.kg-btn{border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:7px 14px;font:700 13px inherit;cursor:pointer;} .kg-btn:hover:not(:disabled){background:rgba(255,255,255,.18);} .kg-btn:disabled{opacity:.4;cursor:default;}
.kg-btn.gold{background:linear-gradient(180deg,var(--gold),var(--gold2));color:#1B1240;border-color:var(--gold);}
.kg-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;} .kg-bar b{font-size:16px;}
.kg-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
.kg-cat{font:800 12px inherit;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);} .kg-score{margin-left:auto;font:800 20px ui-monospace,Menlo,monospace;color:var(--gold);font-variant-numeric:tabular-nums;}
.kg-clock{min-width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:3px solid var(--gold);font:800 18px ui-monospace,Menlo,monospace;} .kg-clock.hot{border-color:#FF5A4F;color:#FF8A80;animation:kgPulse .5s infinite alternate;}
@keyframes kgPulse{to{transform:scale(1.12);}}
.kg-q{background:linear-gradient(180deg,#1C2A6B,#0E1640);border:2px solid #7B8CFF;border-radius:999px;padding:16px 26px;font-size:19px;font-weight:700;text-align:center;margin:8px 0 14px;box-shadow:inset 0 0 20px rgba(123,140,255,.25);} .kg-q.big{font-size:22px;border-radius:18px;}
.kg-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;} @media(max-width:700px){.kg-choices{grid-template-columns:1fr;}}
.kg-choice{display:flex;align-items:center;gap:10px;text-align:left;border:2px solid #7B8CFF;background:#0E1640;color:#fff;border-radius:999px;padding:12px 18px;font:600 15px inherit;cursor:pointer;transition:background .15s,transform .1s;}
.kg-choice i{font-style:normal;color:var(--gold);font-weight:800;} .kg-choice:hover:not(:disabled){background:#22307A;transform:scale(1.01);}
.kg-choice.right{background:#1E8E4E;border-color:#7CF0A9;animation:kgFlash .4s 3;} .kg-choice.wrong{background:#A8261D;border-color:#FF8A80;} .kg-choice.gone{visibility:hidden;}
@keyframes kgFlash{50%{filter:brightness(1.5);}}
.kg-mill{display:grid;grid-template-columns:170px 1fr;gap:16px;} @media(max-width:760px){.kg-mill{grid-template-columns:1fr;}.kg-ladder{order:2;}}
.kg-ladder{display:flex;flex-direction:column;gap:3px;background:rgba(0,0,0,.25);border-radius:14px;padding:8px;font:700 13px ui-monospace,Menlo,monospace;}
.kg-ladder div{display:flex;gap:8px;padding:4px 8px;border-radius:8px;color:#CFC9F5;} .kg-ladder i{font-style:normal;width:20px;color:var(--gold);} .kg-ladder .safe{color:#fff;} .kg-ladder .won{color:#7CF0A9;} .kg-ladder .on{background:var(--gold);color:#1B1240;} .kg-ladder .on i{color:#1B1240;}
.kg-life{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}
.kg-aud{display:flex;gap:14px;align-items:flex-end;height:120px;justify-content:center;margin-bottom:10px;} .kg-aud div{display:flex;flex-direction:column;align-items:center;gap:3px;width:42px;height:100%;justify-content:flex-end;}
.kg-aud span{width:100%;height:var(--h);background:linear-gradient(180deg,var(--gold),#7B8CFF);border-radius:6px 6px 0 0;animation:kgGrow .9s ease-out;} @keyframes kgGrow{from{height:0;}}
.kg-aud small{color:#CFC9F5;}
.kg-fuse{position:relative;height:12px;background:rgba(255,255,255,.12);border-radius:999px;margin:4px 0 8px;overflow:visible;} .kg-fuse span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#FF5A4F,var(--gold));transition:width 1s linear;}
.kg-fuse.fast span{transition:width .05s linear;} .kg-fuse .spark{position:absolute;left:0;top:-6px;}
.kg-bomb.boom{animation:kgShake .5s;} @keyframes kgShake{20%{transform:translate(-8px,4px);}40%{transform:translate(8px,-4px);}60%{transform:translate(-6px,2px);}80%{transform:translate(6px,-2px);}}
.kg-blast{position:absolute;left:50%;top:40%;font-size:120px;transform:translate(-50%,-50%);animation:kgBlast .8s ease-out forwards;pointer-events:none;} @keyframes kgBlast{from{opacity:1;transform:translate(-50%,-50%) scale(.3);}to{opacity:0;transform:translate(-50%,-50%) scale(2.2);}}
.kg-bomb{position:relative;}
.kg-strikes b{display:inline-block;width:30px;height:30px;line-height:30px;text-align:center;border-radius:6px;border:2px solid rgba(255,255,255,.3);color:rgba(255,255,255,.3);margin-left:4px;} .kg-strikes b.on{background:#A8261D;border-color:#FF8A80;color:#fff;}
.kg-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px;perspective:800px;}
.kg-tile{position:relative;height:54px;transform-style:preserve-3d;transition:transform .6s;} .kg-tile.open{transform:rotateX(180deg);}
.kg-tile .f,.kg-tile .b{position:absolute;inset:0;backface-visibility:hidden;border-radius:10px;display:flex;align-items:center;justify-content:center;border:2px solid #7B8CFF;}
.kg-tile .f{background:linear-gradient(180deg,#22307A,#0E1640);} .kg-tile .f b{width:34px;height:34px;border-radius:50%;background:#0B57D0;display:grid;place-items:center;font-size:18px;}
.kg-tile .b{background:linear-gradient(180deg,#F4C14E,#D99A16);color:#1B1240;transform:rotateX(180deg);justify-content:space-between;padding:0 16px;font-weight:800;} .kg-tile.late .b{background:linear-gradient(180deg,#7A7F9A,#4D5270);color:#fff;}
.kg-tile .b em{font-style:normal;background:#1B1240;color:var(--gold);border-radius:8px;padding:2px 10px;}
.kg-feud{position:relative;} .kg-bigx{position:absolute;left:50%;top:50%;font-size:140px;color:#FF5A4F;line-height:1;text-shadow:0 6px 30px rgba(0,0,0,.5);animation:kgBlast .9s ease-out forwards;pointer-events:none;}
.kg-guess{display:flex;gap:8px;} .kg-guess input{flex:1;border-radius:999px;border:2px solid #7B8CFF;background:#0E1640;color:#fff;padding:10px 16px;font:600 16px inherit;}
.kg-jgrid{display:grid;gap:8px;} .kg-jcat{background:#0B1A6B;border-radius:10px;padding:10px;text-align:center;font:800 13px inherit;text-transform:uppercase;letter-spacing:.04em;color:#fff;min-height:54px;display:grid;place-items:center;}
.kg-jcell{height:64px;border-radius:10px;border:none;background:linear-gradient(180deg,#1440C8,#0B2A8F);color:var(--gold);font:800 26px ui-monospace,Menlo,monospace;cursor:pointer;text-shadow:2px 2px 0 #000;transition:transform .1s;}
.kg-jcell:hover:not(:disabled){transform:scale(1.04);} .kg-jcell.done{background:rgba(255,255,255,.05);cursor:default;}
.kg-jclue{animation:kgZoom .35s ease-out;} @keyframes kgZoom{from{transform:scale(.6);opacity:0;}}
.kg-wheelwrap{position:relative;width:300px;height:300px;margin:6px auto 0;} .kg-pointer{position:absolute;left:50%;top:-14px;transform:translateX(-50%);font-size:30px;color:var(--gold);z-index:2;text-shadow:0 2px 0 #000;}
.kg-wheel{width:100%;height:100%;border-radius:50%;border:6px solid var(--gold);position:relative;transition:transform 3.1s cubic-bezier(.12,.6,.1,1);box-shadow:0 0 30px rgba(244,193,78,.35);}
.kg-wheel span{position:absolute;left:50%;top:50%;width:80px;margin:-16px 0 0 -40px;text-align:center;line-height:1.05;} .kg-wheel b{display:block;font-size:17px;} .kg-wheel small{font-size:9.5px;opacity:.9;}
.kg-doors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;perspective:900px;}
.kg-door{position:relative;height:220px;border:none;background:#2B1608;border-radius:12px 12px 4px 4px;cursor:pointer;padding:0;overflow:hidden;font:inherit;}
.kg-door .leaf{position:absolute;inset:0;background:linear-gradient(90deg,#8B4A1C,#B8692C 50%,#8B4A1C);display:grid;place-items:center;font:800 54px Georgia,serif;color:var(--gold);transform-origin:left;transition:transform .9s;border:4px solid #5A2E10;border-radius:12px 12px 4px 4px;}
.kg-door.open .leaf{transform:rotateY(-105deg);} .kg-door .inside{position:absolute;inset:0;display:grid;place-items:center;color:var(--gold);font:800 18px inherit;padding:10px;text-align:center;}
.kg-door.dim{opacity:.5;}
.kg-docframe{height:300px;overflow:hidden;border-radius:12px;background:#fff;margin-bottom:12px;border:4px solid var(--gold);}
.kg-doc{background:#fff;color:#1F2A44;padding:18px 22px;font:13.5px/1.5 Georgia,"Times New Roman",serif;height:100%;transition:none;}
.kg-doc h3{margin:0 0 8px;font:800 15px Arial,sans-serif;letter-spacing:.03em;} .kg-doc table{border-collapse:collapse;width:100%;margin:6px 0;} .kg-doc td,.kg-doc th{border:1px solid #9AA3B8;padding:4px 6px;text-align:left;font-size:12.5px;}
.kg-doc p{margin:4px 0;} .kg-doc .dk-sign{margin-top:16px;} .kg-doc .dk-head{font:800 13px Arial,sans-serif;color:#7A2E0E;} .kg-doc .dk-sketch{border:1px dashed #9AA3B8;padding:20px;text-align:center;color:#9AA3B8;}
.kg-over{text-align:center;} .kg-trophy{font-size:72px;animation:kgZoom .5s ease-out;} .kg-over h2{color:#fff;margin:6px 0;} .kg-sub{color:#CFC9F5;margin:4px 0 10px;}
.kg-missed{text-align:left;background:rgba(0,0,0,.25);border-radius:14px;padding:12px 16px;margin-top:10px;} .kg-missed h3{margin:0 0 6px;color:var(--gold);}
.kg-miss{display:flex;flex-direction:column;gap:2px;padding:7px 0;border-top:1px solid rgba(255,255,255,.1);} .kg-miss span{color:#7CF0A9;font-weight:700;} .kg-miss em{color:#CFC9F5;font-size:13px;}
.kg-over .kg-acts,.kg-wheelbox .kg-acts{justify-content:center;}
.kg-streak{color:#FFB37C;font-weight:800;}
.kg-promo{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:12px;background:linear-gradient(90deg,#2A1B6E,#4B2FB3) !important;color:#fff;border:none !important;}
.kg-promo span{font-size:28px;} .kg-promo div{display:flex;flex-direction:column;flex:1;} .kg-promo small{color:#D8D3FF;}
.kg-admin{padding:18px 20px;} .kg-atabs{display:flex;gap:6px;margin:8px 0;} .kg-atabs button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px;font:600 13px inherit;cursor:pointer;} .kg-atabs button.on{background:var(--navy);color:#fff;}
.kg-aform{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;background:#F8F9FC;border-radius:12px;padding:12px;margin-bottom:10px;} .kg-aform .w{grid-column:1/-1;}
.kg-aform label{display:flex;flex-direction:column;gap:3px;font:700 12.5px inherit;color:var(--navy);} .kg-aform input,.kg-aform select{font:inherit;font-weight:500;padding:6px 8px;border:1px solid var(--line);border-radius:8px;}
.kg-atbl td small{display:block;color:var(--ink-soft);font-size:12px;} .kg-atbl tr.off td{opacity:.45;text-decoration:line-through;}
@media(prefers-reduced-motion:reduce){.kg-tile,.kg-wheel,.kg-door .leaf{transition:none;} .kg-bomb.boom,.kg-choice.right,.kg-clock.hot{animation:none;}}
`; document.head.appendChild(st); })();
})();
