/* Presenter drawer: the facilitator's cue card for the slide on screen, and the scorecard panel for a
   graded deliverable. Trainee slide content is untouched — this is the trainer's side only.

   The cues live in trainer/cues.json (trainer-only, served behind the /trainer/ gate like notes.json
   and scripts.json), keyed by lesson and slide id:

   {"<lesson id>": {"sections": {"<slide id>": {
      "time":      "6 min",                        ⏱  suggested time on this page
      "objective": "…",                            🎯 what the facilitator is here to land
      "talk":      ["…", …],                       🎯 talking points
      "gc":        [{"label": "…", "text": "…"}],  📢 announcements to copy into the training GC
      "keys":      ["…", …],                       🔑 answer key, cheat sheet and SOP rules
      "pitfalls":  ["…", …],                       🚩 what trainees get wrong here
      "grade":     {                               the dual-evaluation panel (one graded deliverable)
        "deliverable": "…",
        "file": "…",                               the submission's naming convention, if it has one
        "ai":      {"match": ["…"], "nlp": ["…"], "pass": 85},
        "trainer": {"scores": [{"label": "…", "weight": 20}], "rubric": ["…"], "feedback": "…"}
      }}}}}

   A slide with no entry renders exactly as before. The scorecard panel is a facilitator's reference for
   what the pipeline scores and what only a person can judge: the scores themselves are entered in the
   trainee's Monitoring Sheet (📏 Feedback Rubric), which stays the one gradebook. */
(function(){
  if(typeof window.presenterCues !== "function") return;
  const FTQ = {data:null, loading:null, tried:false};
  function load(){
    if(FTQ.data) return Promise.resolve(FTQ.data);
    if(FTQ.loading) return FTQ.loading;
    FTQ.tried = true;
    FTQ.loading = fetch("/trainer/cues.json", {cache:"no-store", headers: state.adminToken ? {Authorization: "Bearer " + state.adminToken} : {}})
      .then(r=>r.ok ? r.json() : null)
      .then(j=>{ FTQ.data = j || null; FTQ.loading = null; return FTQ.data; })
      .catch(()=>{ FTQ.loading = null; return null; });
    return FTQ.loading;
  }
  const cueFor = (lesson, secId)=>{
    const l = (FTQ.data || {})[String(lesson)];
    return (l && l.sections && l.sections[secId]) || null;
  };
  const list = (items, cls)=> `<ul class="${cls}">${(items||[]).filter(Boolean).map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`;
  const block = (icon, head, body)=> body ? `<div class="cue-b"><div class="cue-h">${icon} ${esc(head)}</div>${body}</div>` : "";

  function gradeHtml(g){
    if(!g) return "";
    const ai = g.ai || {}, tr = g.trainer || {};
    const rows = (tr.scores||[]).map(s=>`<div class="cue-score"><span>${esc(s.label)}</span>
        <input type="range" min="0" max="100" value="0" aria-label="${esc(s.label)} score" oninput="this.nextElementSibling.textContent=this.value+'%'">
        <b>0%</b>${s.weight ? `<i>${esc(String(s.weight))}% of the mark</i>` : ""}</div>`).join("");
    return `<div class="cue-grade">
      <div class="cue-gh">📊 Scorecard — ${esc(g.deliverable || "graded deliverable")}</div>
      ${g.file ? `<p class="cue-file">File name: <code>${esc(g.file)}</code></p>` : ""}
      <div class="cue-ai"><div class="cue-h">🤖 AI-Grading Engine criteria</div>
        ${(ai.match||[]).length ? `<p class="cue-sub">Objective match keys</p>${list(ai.match, "cue-ul")}` : ""}
        ${(ai.nlp||[]).length ? `<p class="cue-sub">NLP logic rules</p>${list(ai.nlp, "cue-ul")}` : ""}
        ${typeof ai.pass === "number" ? `<p class="cue-pass">Auto-pass threshold: <b>${ai.pass}%</b> composite — below it the submission comes to you.</p>` : ""}
      </div>
      <div class="cue-tr"><div class="cue-h">✍️ Trainer input &amp; override</div>
        ${rows ? `<p class="cue-sub">Manual scoring — drag to set, overrides the AI score</p>${rows}` : ""}
        ${(tr.rubric||[]).length ? `<p class="cue-sub">Observed only by you — tick what you saw</p>
          <div class="cue-ticks">${tr.rubric.map((t,i)=>`<label><input type="checkbox"> ${esc(t)}</label>`).join("")}</div>` : ""}
        <p class="cue-sub">Trainer feedback — merges into the trainee's performance transcript</p>
        <textarea class="cue-fb" rows="3" placeholder="${esc(tr.feedback || "Notes for this trainee…")}"></textarea>
      </div>
      <p class="cue-flow">Submission → AI pre-score → your review and override → final scorecard → the trainee's Monitoring Sheet.
        Enter the marks you settle on in 📏 Feedback Rubric on their sheet; this panel is the reference for what to weigh.</p>
    </div>`;
  }

  function cueHtml(lesson, secId){
    const q = cueFor(lesson, secId);
    if(!q) return "";
    const talk = (q.talk||[]).filter(Boolean);
    const gc = (q.gc||[]).filter(g=>g && g.text);
    const gcHtml = gc.map((g,i)=>`<div class="cue-gc"><div class="cue-gc-h"><b>${esc(g.label || "Post in the training GC")}</b>
        <button type="button" class="btn btn-ghost btn-sm" onclick="ftCueCopyGc(${Number(lesson)},'${esc(secId)}',${i})">⧉ Copy</button></div>
      <pre>${esc(g.text)}</pre></div>`).join("");
    return `<div class="cue-card">
      ${q.time ? `<div class="cue-time">⏱ ${esc(q.time)}</div>` : ""}
      ${block("🎯", "Facilitator objective",
        (q.objective ? `<p>${esc(q.objective)}</p>` : "") + (talk.length ? `<p class="cue-sub">Talking points</p>${list(talk, "cue-ul")}` : ""))}
      ${gcHtml ? block("📢", "Group chat announcement", gcHtml) : ""}
      ${(q.keys||[]).length ? block("🔑", "Answer key, cheat sheet & SOP rules", list(q.keys, "cue-ul")) : ""}
      ${(q.pitfalls||[]).length ? block("🚩", "Common pitfalls to watch for", list(q.pitfalls, "cue-ul")) : ""}
      ${gradeHtml(q.grade)}
    </div>`;
  }

  window.ftCueCopyGc = function(lesson, secId, i){
    const q = cueFor(lesson, secId), g = q && (q.gc||[])[i];
    if(!g) return;
    (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(g.text) : Promise.reject())
      .then(()=>toast("Announcement copied — paste it in the training GC."), ()=>toast("Couldn’t copy. Select the text instead."));
  };

  const prev = window.presenterCues;
  window.presenterCues = function(d, slide){
    const base = prev.apply(this, arguments);
    if(!d || !slide || slide.type !== "ftSection") return base;
    const sec = d.sections[slide.index];
    if(!sec) return base;
    if(!FTQ.data && !FTQ.tried){
      load().then(j=>{ const cu = document.getElementById("pvCues"); if(j && cu && state.presenting) cu.innerHTML = presenterCues(d, slide); });
    }
    const cue = cueHtml(d.id, sec.id);
    if(!cue) return base;
    // A page with a cue card but no written script: the cue card is the whole note, not an empty one.
    return base.replace(/<p class="pv-empty">[^<]*<\/p>/, "") + cue;
  };

  const st = document.createElement("style"); st.textContent = `
.cue-card{margin-top:12px;border-top:2px solid var(--orange-deep);padding-top:10px;}
.cue-time{display:inline-block;background:var(--navy);color:#fff;font-weight:700;font-size:12px;border-radius:999px;padding:3px 10px;margin-bottom:8px;}
.cue-b{margin:0 0 10px;}
.cue-h{font-weight:700;color:var(--navy);font-size:13px;margin:0 0 4px;}
.cue-b p, .cue-grade p{font-size:13px;margin:0 0 4px;}
.cue-sub{font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.3px;margin:6px 0 2px;}
.cue-ul{margin:0 0 4px;padding-left:16px;} .cue-ul li{font-size:13px;line-height:1.45;margin:1px 0;}
.cue-gc{background:#F3F5FA;border-radius:10px;padding:8px 10px;margin:0 0 6px;}
.cue-gc-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}
.cue-gc-h b{font-size:12.5px;color:var(--navy);}
.cue-gc pre{white-space:pre-wrap;font:inherit;font-size:12.5px;line-height:1.5;margin:0;color:var(--ink);}
.cue-grade{border:1px solid #E3E7F1;border-radius:12px;padding:10px;margin-top:10px;}
.cue-gh{font-weight:800;color:#fff;background:var(--orange-deep);border-radius:8px;padding:5px 9px;font-size:12.5px;margin:-2px -2px 8px;}
.cue-file code{font-size:12px;background:#F3F5FA;border-radius:6px;padding:1px 5px;}
.cue-ai, .cue-tr{border-left:3px solid #E3E7F1;padding-left:8px;margin-bottom:8px;}
.cue-pass{font-size:12.5px;color:var(--ink-soft);}
.cue-score{display:grid;grid-template-columns:1fr 90px 40px;align-items:center;gap:6px;font-size:12.5px;margin:3px 0;}
.cue-score input[type=range]{width:90px;} .cue-score b{text-align:right;}
.cue-score i{grid-column:1/-1;font-size:11.5px;color:var(--ink-soft);font-style:normal;}
.cue-ticks{display:flex;flex-wrap:wrap;gap:4px 12px;} .cue-ticks label{font-size:12.5px;display:flex;align-items:center;gap:4px;}
.cue-fb{width:100%;font:inherit;font-size:12.5px;border:1px solid #E3E7F1;border-radius:8px;padding:6px;}
.cue-flow{font-size:11.5px;color:var(--ink-soft);margin:6px 0 0;}
@media (max-width:420px){.cue-score{grid-template-columns:1fr 70px 38px;} .cue-score input[type=range]{width:70px;}}`;
  document.head.appendChild(st);
})();
