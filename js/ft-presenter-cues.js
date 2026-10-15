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

   A slide with no entry renders exactly as before.

   The scorecard panel is live, not a printout. The facilitator sets each manual score, ticks what they
   observed and writes the feedback; the panel keeps the weighted composite, and 📥 Log saves it to the
   trainee's own record as a trainer-led activity (labreview:<id>.acts), the same place Admin → 🧑‍🏫
   Trainer Inputs writes to — so it shows on the trainee's Practice Lab page and in their Scorecard with
   no second trip through the admin tab. "grade.act" names the activity it logs against by default; the
   facilitator can pick another from the list. An AI pre-score, where the pipeline has one, is typed in
   once and seeds every slider, which is then overridden by hand: pre-score → override → log. */
(function(){
  if(typeof window.presenterCues !== "function") return;
  const FTQ = {data:null, loading:null, tried:false, mark:{}, people:null, loadingPeople:false, acts:null};
  // What the facilitator has set on a scorecard, kept across re-renders of the drawer.
  const markOf = key => FTQ.mark[key] || (FTQ.mark[key] = {scores:{}, ticks:{}, note:"", who:"", act:"", status:""});
  const DEFAULT_ACTS = [
    {id:"reception-live", title:"Reception Mock Call with the trainer"},
    {id:"calendar-live", title:"Calendar Management Mock Call with the trainer"},
    {id:"intake-live", title:"Intake Mock Call with the trainer"},
    {id:"intake-packet-demo", title:"Saving Intake Packet and Extracted Intake Documents Demo"},
    {id:"lor-demo", title:"LOR Uploading and Sending Demo (1P & 3P)"},
    {id:"medlor-demo", title:"Sending MedLOR and Requesting Medical Bills & Records Demo"},
    {id:"lv-demo", title:"LV (Lien Verification) Request Demo"}];
  // The roster and the activity list, for logging a scorecard. Same sources as Admin → 🧑‍🏫 Trainer Inputs.
  function loadPeople(then){
    if(FTQ.people || FTQ.loadingPeople) return;
    FTQ.loadingPeople = true;
    (async ()=>{
      try{
        let people = state.adminData;
        if(!people){ const keys = await sharedList("trainee:"); people = (await sharedGetMany(keys)).filter(Boolean); }
        FTQ.people = people.filter(r=>r && r.id && r.approved === true && !r.archived && !r.rejected)
          .map(r=>({id:r.id, name:r.name || r.id, batch:r.batch || ""}))
          .sort((a,b)=>a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
        const st = await sharedGet("settings:trainer-acts").catch(()=>null);
        FTQ.acts = (st && st.acts && st.acts.length ? st.acts : DEFAULT_ACTS).map(a=>({id:a.id, title:a.title}));
      }catch(err){ FTQ.people = FTQ.people || []; FTQ.acts = FTQ.acts || DEFAULT_ACTS; }
      FTQ.loadingPeople = false;
      if(typeof then === "function") then();
    })();
  }
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

  function composite(g, m){
    const rows = (g.trainer && g.trainer.scores) || [];
    if(!rows.length) return null;
    let sum = 0, w = 0;
    rows.forEach((r, i)=>{ const weight = Number(r.weight) || 1; w += weight; sum += weight * (Number(m.scores[i]) || 0); });
    return w ? Math.round(sum / w) : null;
  }

  function gradeHtml(g, lesson, secId){
    if(!g) return "";
    const ai = g.ai || {}, tr = g.trainer || {}, key = lesson + ":" + secId, m = markOf(key);
    const q = (v)=> esc(String(v));
    const rows = (tr.scores || []).map((sc, i)=>{
      const val = Number(m.scores[i]) || 0;
      return `<div class="cue-score"><span>${esc(sc.label)}</span>
        <input type="range" min="0" max="100" step="5" value="${val}" aria-label="${esc(sc.label)} score"
          oninput="ftCueMark('${q(key)}','score',${i},this.value)">
        <b>${val}%</b>${sc.weight ? `<i>${esc(String(sc.weight))}% of the mark</i>` : ""}</div>`;
    }).join("");
    const comp = composite(g, m);
    const pass = typeof ai.pass === "number" ? ai.pass : null;
    return `<div class="cue-grade">
      <div class="cue-gh">📊 Scorecard — ${esc(g.deliverable || "graded deliverable")}</div>
      ${g.file ? `<p class="cue-file">File name: <code>${esc(g.file)}</code></p>` : ""}
      <div class="cue-ai"><div class="cue-h">🤖 AI-Grading Engine criteria</div>
        ${(ai.match||[]).length ? `<p class="cue-sub">Objective match keys</p>${list(ai.match, "cue-ul")}` : ""}
        ${(ai.nlp||[]).length ? `<p class="cue-sub">NLP logic rules</p>${list(ai.nlp, "cue-ul")}` : ""}
        ${pass != null ? `<p class="cue-pass">Auto-pass threshold: <b>${pass}%</b> composite — below it the submission comes to you.</p>` : ""}
        ${rows ? `<p class="cue-sub">AI pre-score</p><div class="cue-pre">
          <input type="number" min="0" max="100" placeholder="—" value="${m.pre == null ? "" : esc(String(m.pre))}"
            oninput="ftCueMark('${q(key)}','pre',0,this.value)"> %
          <button type="button" class="btn btn-ghost btn-sm" onclick="ftCueSeed('${q(key)}')">Seed the sliders</button>
          <span class="cue-muted">Then override by hand below.</span></div>` : ""}
      </div>
      <div class="cue-tr"><div class="cue-h">✍️ Trainer input &amp; override</div>
        ${rows ? `<p class="cue-sub">Manual scoring — drag to set, overrides the AI score</p>${rows}
          <p class="cue-comp" data-cue-comp="${q(key)}">Composite <b>${comp == null ? "—" : comp + "%"}</b>${pass != null && comp != null ? ` · ${comp >= pass ? "at or above" : "below"} the ${pass}% threshold` : ""}</p>` : ""}
        ${(tr.rubric||[]).length ? `<p class="cue-sub">Observed only by you — tick what you saw</p>
          <div class="cue-ticks">${tr.rubric.map((t,i)=>`<label><input type="checkbox" ${m.ticks[i] ? "checked" : ""}
            onchange="ftCueMark('${q(key)}','tick',${i},this.checked)"> ${esc(t)}</label>`).join("")}</div>` : ""}
        <p class="cue-sub">Trainer feedback — the trainee reads this</p>
        <textarea class="cue-fb" rows="3" placeholder="${esc(tr.feedback || "Notes for this trainee…")}"
          oninput="ftCueMark('${q(key)}','note',0,this.value)">${esc(m.note || "")}</textarea>
      </div>
      ${logHtml(g, key, comp, pass, m)}
    </div>`;
  }

  function logHtml(g, key, comp, pass, m){
    if(!FTQ.people){
      loadPeople(()=>{ const cu = document.getElementById("pvCues"); if(cu && state.presenting) refreshCues(); });
      return `<p class="cue-flow">Loading the roster, so this scorecard can be logged…</p>`;
    }
    if(!FTQ.people.length) return `<p class="cue-flow">No approved trainee to log against yet. Record the result in Admin → 🧑‍🏫 Trainer Inputs instead.</p>`;
    const acts = FTQ.acts || DEFAULT_ACTS;
    const want = m.act || (acts.some(a=>a.id === g.act) ? g.act : acts[0].id);
    const statuses = ["Passed", "Redo", "Not yet"];
    const status = m.status || (comp == null || pass == null ? "Passed" : comp >= pass ? "Passed" : "Redo");
    const q = esc(String(key));
    return `<div class="cue-log"><div class="cue-h">📥 Log it to the trainee's record</div>
      <div class="cue-log-row">
        <label>Trainee <select onchange="ftCueMark('${q}','who',0,this.value)">
          <option value="">Choose…</option>
          ${FTQ.people.map(p=>`<option value="${esc(p.id)}" ${p.id===m.who?"selected":""}>${esc(p.name)}${p.batch ? " · " + esc(p.batch) : ""}</option>`).join("")}
        </select></label>
        <label>Logged as <select onchange="ftCueMark('${q}','act',0,this.value)">
          ${acts.map(a=>`<option value="${esc(a.id)}" ${a.id===want?"selected":""}>${esc(a.title)}</option>`).join("")}
        </select></label>
        <label>Result <select onchange="ftCueMark('${q}','status',0,this.value)">
          ${statuses.map(x=>`<option ${x===status?"selected":""}>${esc(x)}</option>`).join("")}
        </select></label>
        <button type="button" class="btn btn-navy btn-sm" onclick="ftCueLog('${q}',this)">📥 Log ${comp == null ? "" : comp + "%"}</button>
      </div>
      <p class="cue-flow">Submission → AI pre-score → your review and override → logged here → the trainee's Practice Lab page and Scorecard.
        It saves to the same record as Admin → 🧑‍🏫 Trainer Inputs, so you don't have to enter it twice.</p></div>`;
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
      ${gradeHtml(q.grade, lesson, secId)}
    </div>`;
  }

  window.ftCueCopyGc = function(lesson, secId, i){
    const q = cueFor(lesson, secId), g = q && (q.gc||[])[i];
    if(!g) return;
    (navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(g.text) : Promise.reject())
      .then(()=>toast("Announcement copied — paste it in the training GC."), ()=>toast("Couldn’t copy. Select the text instead."));
  };

  window.ftCueMark = function(key, what, i, v){
    const m = markOf(key);
    if(what === "score"){ m.scores[i] = Number(v); const b = document.querySelector(`[oninput*="'${key}','score',${i}"]`); if(b && b.nextElementSibling) b.nextElementSibling.textContent = Number(v) + "%"; updateComposite(key); }
    else if(what === "tick") m.ticks[i] = !!v;
    else if(what === "note") m.note = String(v || "");
    else if(what === "pre") m.pre = v === "" ? null : Math.max(0, Math.min(100, Number(v)));
    else m[what] = String(v || "");
  };
  // The composite line is updated in place: re-rendering the drawer on every drag would lose the caret
  // in the feedback box and fight the slider under the facilitator's thumb.
  function updateComposite(key){
    const el = document.querySelector(`[data-cue-comp="${key}"]`);
    if(!el) return;
    const [lesson, secId] = key.split(":"), q = cueFor(lesson, secId);
    if(!q || !q.grade) return;
    const m = markOf(key), comp = composite(q.grade, m), pass = q.grade.ai && typeof q.grade.ai.pass === "number" ? q.grade.ai.pass : null;
    el.innerHTML = `Composite <b>${comp == null ? "—" : comp + "%"}</b>${pass != null && comp != null ? ` · ${comp >= pass ? "at or above" : "below"} the ${pass}% threshold` : ""}`;
  }
  window.ftCueSeed = function(key){
    const m = markOf(key);
    if(m.pre == null){ toast("Type the AI pre-score first."); return; }
    const [lesson, secId] = key.split(":"), q = cueFor(lesson, secId);
    const rows = q && q.grade && q.grade.trainer && q.grade.trainer.scores || [];
    rows.forEach((r, i)=>{ m.scores[i] = m.pre; });
    refreshCues();
  };
  window.ftCueLog = async function(key, btn){
    const m = markOf(key), [lesson, secId] = key.split(":"), q = cueFor(lesson, secId);
    if(!q || !q.grade) return;
    if(!m.who){ toast("Choose the trainee first."); return; }
    const acts = FTQ.acts || DEFAULT_ACTS;
    const act = m.act || (acts.some(a=>a.id === q.grade.act) ? q.grade.act : acts[0].id);
    const comp = composite(q.grade, m), pass = q.grade.ai && typeof q.grade.ai.pass === "number" ? q.grade.ai.pass : null;
    const status = m.status || (comp == null || pass == null ? "Passed" : comp >= pass ? "Passed" : "Redo");
    const ticked = ((q.grade.trainer || {}).rubric || []).filter((t, i)=>m.ticks[i]);
    const parts = [String(m.note || "").trim(), ticked.length ? "Observed: " + ticked.join("; ") + "." : "",
      m.pre == null ? "" : `AI pre-score ${m.pre}%${comp == null ? "" : `, trainer ${comp}%`}.`].filter(Boolean);
    btn.disabled = true;
    try{
      const rec = (await sharedGet("labreview:" + m.who)) || {};
      rec.acts = rec.acts || {};
      rec.acts[act] = {status, score:comp, date:new Date().toISOString().slice(0, 10),
        comment:parts.join(" ").slice(0, 4000), at:new Date().toISOString(), source:"presenter:" + key};
      if(await sharedSet("labreview:" + m.who, rec) === false) throw new Error("save");
      const who = (FTQ.people || []).find(p=>p.id === m.who);
      toast(`✓ Logged${comp == null ? "" : " " + comp + "%"} for ${who ? who.name : "the trainee"}. They see it on their Practice Lab page.`);
    }catch(err){ toast("Couldn’t log it — check your connection and try again."); }
    btn.disabled = false;
  };
  function refreshCues(){
    const cu = document.getElementById("pvCues");
    if(!cu || !state.presenting) return;
    const d = DAYS.find(x=>x.id === state.dayId);
    if(!d || typeof buildDaySlides !== "function") return;
    const slide = buildDaySlides(d)[state.lessonSlide || 0];
    cu.innerHTML = presenterCues(d, slide);
  }

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
.cue-pre{display:flex;align-items:center;gap:6px;font-size:12.5px;flex-wrap:wrap;}
.cue-pre input{width:64px;font:inherit;font-size:12.5px;border:1px solid #E3E7F1;border-radius:6px;padding:3px 5px;}
.cue-muted{font-size:11.5px;color:var(--ink-soft);}
.cue-comp{font-size:12.5px;color:var(--navy);margin:4px 0 0;}
.cue-log{border-top:1px solid #E3E7F1;margin-top:8px;padding-top:8px;}
.cue-log-row{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:flex-end;}
.cue-log-row label{font-size:11.5px;color:var(--ink-soft);display:flex;flex-direction:column;gap:2px;}
.cue-log-row select{font:inherit;font-size:12.5px;border:1px solid #E3E7F1;border-radius:6px;padding:3px 5px;max-width:200px;}
@media (max-width:420px){.cue-score{grid-template-columns:1fr 70px 38px;} .cue-score input[type=range]{width:70px;}}`;
  document.head.appendChild(st);
})();
