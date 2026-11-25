/* ============================================================
   🩹 FIND LOST SCORES (🛡 Admin Master Control → 🩹 Find Lost Scores)
   ------------------------------------------------------------
   A trainer's demo or mock-call score that went missing from a trainee's record (labreview:<id>.acts) is looked for in
   every other copy the platform keeps, and put back with one click:
     · 🧑‍🏫 the trainee's record now — and any other record under the same name (a second registration, an old batch);
     · 📊 the Weekly Ranking — each week's sheet (ranking:<batch>:w<n>) and the row shared with the trainee (rankshare:<id>),
       where the demo and mock-call scores were filled in;
     · 💬 the trainer's feedback sent to the trainee (trainerfb:<id>, tfeedback:<id>, feedback:<id>) that names the activity;
     · ☁ the batch's backups on the Drive (batchbackup:<batch>), linked to be opened by hand.
   ↩ Restore writes the found score into the trainee's record as Graders saves one (merged: the trainee's other scores
   stay — worker.js GUARDED), marked restored with where it came from; ✍ Enter by hand saves one from the trainer's notes.
   It only reads, and adds what the trainer restores: nothing else is changed.
   ============================================================ */
(function(){
"use strict";
const S = {q: "", acts: ["intake-packet-demo", "lor-demo"], busy: false, res: null, err: "", fac: "Michelle"};
const e = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const norm = v => String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, " ").trim();
const actsAll = () => ((window.FTSessions && typeof FTSessions.acts === "function" ? FTSessions.acts() : null) || []).filter(a => a && a.id);
const actOf = id => actsAll().find(a => a.id === id) || {id, title: id};
// (how the activity is named in a ranking column or a feedback text: the two demos by their short names, others by title)
const SHORT = {"intake-packet-demo": /intake\s*packet/i, "lor-demo": /(^|[^a-z])LOR(?![a-z])(?!.*med)/i, "medlor-demo": /med\s*lor/i};
const reOf = id => SHORT[id] || new RegExp(actOf(id).title.replace(/\s*\(.*$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").split(/\s+/).slice(0, 4).join("\\s+"), "i");
const pctOf = (v, max) => { const n = Number(v); if(!isFinite(n)) return null; return Math.max(0, Math.min(100, Math.round(max && max !== 100 ? n / max * 100 : n))); };
const keyOfRank = (b, w) => `ranking:${String(b || "none").replace(/[^A-Za-z0-9_-]/g, "_")}:w${w}`;
const today = () => new Date().toISOString().slice(0, 10);

async function find(){
  const q = norm(S.q);
  if(!q){ S.err = "Type the trainee's name."; render(); return; }
  S.busy = true; S.err = ""; S.res = null; render();
  try{
    const keys = await sharedList("trainee:");
    const recs = (await sharedGetMany(keys)).filter(r => r && r.id);
    const words = q.split(" ");
    const people = recs.filter(r => { const n = norm(r.name || r.id); return words.every(w => n.split(" ").some(x => x.startsWith(w))); });
    if(!people.length){ S.res = []; S.busy = false; render(); return; }
    const ids = people.map(p => p.id), batches = [...new Set(people.map(p => p.batch).filter(Boolean))];
    const per = ["labreview:", "rankshare:", "trainerfb:", "tfeedback:", "feedback:"];
    const got = await sharedGetMany(ids.flatMap(id => per.map(k => k + id)));
    const rankKeys = batches.flatMap(b => [1, 2, 3, 4, 5, 6].map(w => keyOfRank(b, w)));
    const ranks = rankKeys.length ? await sharedGetMany(rankKeys) : [];
    const backs = batches.length ? await sharedGetMany(batches.map(b => "batchbackup:" + b)) : [];
    S.res = people.map((p, i) => {
      const [lab, share, tfb, tfb2, fb] = got.slice(i * per.length, i * per.length + per.length);
      const out = {p, acts: {}};
      S.acts.forEach(act => {
        const re = reOf(act), found = [], cur = ((lab || {}).acts || {})[act] || null;
        // 📊 the Weekly Ranking sheets of their batch
        rankKeys.forEach((k, j) => { const r = ranks[j]; if(!r || !Array.isArray(r.cols)) return;
          if(!k.startsWith(keyOfRank(p.batch, "").replace(/w$/, ""))) return;
          const row = ((r.rows || {})[p.id] || {}).cells || {};
          r.cols.filter(c => c && re.test(String(c.label || "") + " " + String(c.sub || ""))).forEach(c => { const cell = row[c.id] || {};
            // (a score column's raw mark is out of its max, 5 when none is set: js/ft-ranking.js mark)
            if(c.type !== "score") return; const max = Number(c.max) || 5;
            const pc = cell.raw != null && cell.raw !== "" ? pctOf(cell.raw, max) : null;
            if(pc != null) found.push({score: pc, from: `📊 Weekly Ranking, week ${k.split(":w").pop()} (“${c.label}”: ${cell.raw} / ${max})`, note: cell.note || ""}); }); });
        // 📤 the ranking rows shared with the trainee
        Object.entries((share || {}).weeks || {}).forEach(([wk, row]) => (row.cols || []).filter(c => c && re.test(String(c.label || "") + " " + String(c.sub || ""))).forEach(c => {
          if(c.type !== "score") return; const pc = c.raw != null && c.raw !== "" ? pctOf(c.raw, Number(c.max) || 5) : c.mark != null ? pctOf(c.mark, 5) : null;
          if(pc != null) found.push({score: pc, from: `📤 Ranking shared with the trainee, ${wk.replace("|", " week ")} (“${c.label}”)`, note: ""}); }));
        // 💬 feedback that names the activity (shown to read; a number in it is offered when it reads as a score)
        const mentions = [];
        [[tfb, "trainer feedback"], [tfb2, "trainer feedback"], [fb, "feedback"]].forEach(([v, where]) => { if(!v) return;
          const txt = JSON.stringify(v).replace(/\\n/g, " ").replace(/\\"/g, "\"");
          let m; const g = new RegExp(re.source, "gi"); let n = 0;
          while((m = g.exec(txt)) && n < 4){ n++; const s = txt.slice(Math.max(0, m.index - 80), m.index + 160);
            const sc = (/(\d{1,3}(?:\.\d+)?)\s*(?:%|\/\s*100|out of 100|points)/i.exec(txt.slice(m.index, m.index + 120)) || [])[1];
            mentions.push({where, text: s, score: sc != null && Number(sc) <= 100 ? Math.round(Number(sc)) : null}); } });
        mentions.filter(x => x.score != null).forEach(x => found.push({score: x.score, from: `💬 In the ${x.where}`, note: x.text}));
        out.acts[act] = {cur, found, mentions: mentions.filter(x => x.score == null)};
      });
      const bk = backs[batches.indexOf(p.batch)];
      out.backup = bk && bk.folder ? {folder: bk.folder, at: bk.at} : null;
      return out;
    });
  }catch(err){ S.err = "Couldn’t search just now. Check your connection and try again."; }
  S.busy = false; render();
}

// ↩ / ✍: the score into labreview:<id>.acts[act], as Graders saves one (strict read: a failed read never saves over the record)
async function restore(id, act, score, from, extra){
  score = Math.round(Number(score));
  if(!(score >= 0 && score <= 100)){ toast("A score is a number from 0 to 100."); return false; }
  try{
    const cur = (await sharedGetStrict("labreview:" + id)) || {}; cur.acts = cur.acts || {};
    const prev = cur.acts[act] || {};
    if(prev.score != null && prev.score !== "" && !confirm(`${actOf(act).title} already has ${prev.score}% saved. Replace it with ${score}%?`)) return false;
    const x = Object.assign({}, prev, {score, redo: false, date: (extra && extra.date) || prev.date || today(), facilitator: (extra && extra.facilitator) || prev.facilitator || S.fac,
      comment: String((extra && extra.comment) || prev.comment || "").slice(0, 4000), at: new Date().toISOString(), scoreEdited: true,
      restored: {from: String(from || "").slice(0, 300), at: new Date().toISOString(), by: String(S.fac || "").slice(0, 120)}});
    x.status = window.ftResult ? ftResult(Object.assign({}, x, {status: undefined})) : score >= 80 ? "Passed" : "Failed";
    cur.acts[act] = x;
    if(await sharedSet("labreview:" + id, cur) === false) throw new Error("save");
    toast(`✓ ${actOf(act).title}: ${score}% restored.`);
    return true;
  }catch(err){ toast("Couldn’t save it. Check your connection and try again."); return false; }
}

function render(){ if(typeof state === "object" && state.view === "admin" && state.adminTab === "recover" && typeof window.render === "function") window.render(); }

function html(){
  const opts = actsAll().filter(a => /demo|mock/i.test(a.kind || a.title || ""));
  const res = S.res;
  return `<div class="card fsr" style="padding:20px 24px;"><h3>🩹 Find Lost Scores</h3>
    <p class="fss-muted">A demo or mock-call score that went missing from a trainee’s record is looked for in every other copy the platform keeps — any other record under their name, the 📊 Weekly Ranking sheets and the rows shared with them, and the feedback sent to them — and put back with ↩ Restore (merged into their record: nothing else of theirs changes). Nothing found: ✍ enter it from your notes.</p>
    <div class="fsr-bar"><input class="fsr-q" placeholder="Trainee’s name (e.g. Ashanty)" value="${e(S.q)}" oninput="FTScoreRecover.q(this.value)" onkeydown="if(event.key==='Enter')FTScoreRecover.find()">
      <span class="fsr-acts">${opts.map(a => `<label><input type="checkbox" ${S.acts.includes(a.id) ? "checked" : ""} onchange="FTScoreRecover.act('${e(a.id)}',this.checked)"> ${e(a.title.replace(/\s*\(.*$/, ""))}</label>`).join("")}</span>
      <label>Graded by <input class="fsr-fac" value="${e(S.fac)}" oninput="FTScoreRecover.fac(this.value)"></label>
      <button class="btn btn-navy" type="button" ${S.busy ? "disabled" : ""} onclick="FTScoreRecover.find()">${S.busy ? "Searching…" : "🔎 Find"}</button></div>
    ${S.err ? `<p class="fsr-err">${e(S.err)}</p>` : ""}
    ${!res ? "" : !res.length ? `<p class="fss-muted">No trainee by that name.</p>` : res.map(r => `<div class="fsr-person"><h4>${e(r.p.name || r.p.id)} <small>${e(r.p.batch || "")} · ${e(r.p.id)}${r.p.archived ? " · archived" : ""}</small></h4>
      ${S.acts.map(act => { const a = r.acts[act] || {found: [], mentions: []}, cur = a.cur;
        return `<div class="fsr-act"><b>${e(actOf(act).title)}</b>
          <p>Saved now: ${cur && cur.score != null && cur.score !== "" ? `<b>${e(cur.score)}%</b> ${e(cur.status || "")}${cur.facilitator ? " · " + e(cur.facilitator) : ""}${cur.date ? " · " + e(cur.date) : ""}${cur.restored ? " · ↩ restored from " + e(cur.restored.from) : ""}` : `<b class="fsr-miss">no score</b>`}</p>
          ${a.found.length ? `<ul class="fsr-found">${a.found.map(f => `<li><b>${e(f.score)}%</b> — ${e(f.from)}${f.note ? `<small>${e(f.note)}</small>` : ""}
              <button class="btn btn-ghost btn-sm" type="button" data-id="${e(r.p.id)}" data-act="${e(act)}" data-score="${e(f.score)}" data-from="${e(f.from)}" onclick="FTScoreRecover.restore(this)">↩ Restore ${e(f.score)}%</button></li>`).join("")}</ul>`
            : `<p class="fss-muted">No other copy of this score found.</p>`}
          ${a.mentions.length ? `<details><summary>💬 ${a.mentions.length} mention${a.mentions.length === 1 ? "" : "s"} in their feedback</summary>${a.mentions.map(m => `<p class="fsr-mention"><small>${e(m.where)}</small> …${e(m.text)}…</p>`).join("")}</details>` : ""}
          <div class="fsr-hand">✍ Enter by hand: <input type="number" min="0" max="100" placeholder="Score /100" data-f="score"> <input type="date" value="${today()}" data-f="date">
            <input placeholder="Comment (optional)" data-f="comment" maxlength="4000">
            <button class="btn btn-ghost btn-sm" type="button" data-id="${e(r.p.id)}" data-act="${e(act)}" onclick="FTScoreRecover.hand(this)">💾 Save</button></div></div>`; }).join("")}
      ${r.backup ? `<p class="fss-muted">☁ This batch was backed up to the Drive${r.backup.at ? " " + e(String(r.backup.at).slice(0, 10)) : ""}: <a href="${e(r.backup.folder)}" target="_blank" rel="noopener noreferrer">open the backup ↗</a> (the scores as they were that day).</p>` : ""}</div>`).join("")}
  </div>`;
}

window.FTScoreRecover = {
  q(v){ S.q = String(v || "").slice(0, 80); },
  fac(v){ S.fac = String(v || "").slice(0, 120); },
  act(id, on){ S.acts = on ? [...new Set(S.acts.concat(id))] : S.acts.filter(x => x !== id); },
  find,
  async restore(btn){ btn.disabled = true; const ok = await restore(btn.dataset.id, btn.dataset.act, btn.dataset.score, btn.dataset.from); if(ok) await find(); else btn.disabled = false; },
  async hand(btn){ const box = btn.closest(".fsr-hand"), v = f => (box.querySelector(`[data-f="${f}"]`) || {}).value || "";
    if(v("score") === ""){ toast("Type the score first."); return; }
    btn.disabled = true; const ok = await restore(btn.dataset.id, btn.dataset.act, v("score"), "entered by hand", {date: v("date"), comment: v("comment"), facilitator: S.fac});
    if(ok) await find(); else btn.disabled = false; },
  _restore: restore, _state: () => S
};
if(typeof window.ftAdminTab === "function") ftAdminTab("recover", "🩹 Find Lost Scores", html);
if(typeof document !== "undefined" && !document.getElementById("ft-score-recover")){ const st = document.createElement("style"); st.id = "ft-score-recover";
  st.textContent = `.fsr-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:12px 0}.fsr-q{min-width:240px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-weight:700}
.fsr-fac{width:140px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}.fsr-acts{display:flex;flex-wrap:wrap;gap:4px 12px;font-weight:700}
.fsr-person{border-top:2px solid #1E2340;margin-top:16px;padding-top:10px}.fsr-person h4 small{font-weight:600;color:#475569}.fsr-act{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin:8px 0}
.fsr-found li{margin:6px 0}.fsr-found small{display:block;color:#475569}.fsr-miss{color:#b91c1c}.fsr-err{color:#b91c1c;font-weight:700}.fsr-mention{margin:4px 0;color:#334155}
.fsr-hand{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}.fsr-hand input{padding:5px 8px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}`;
  (document.head || document.documentElement).appendChild(st); }
})();
