/* ============================================================
   📋 INTAKE TRAINING: what the Day 7–9 slides hold besides text
     • .ftis-calls    Day 7 (Part 1), the reference slide: four more sample intake calls (a work-premises accident,
                      a demanding slip-and-fall client, an agitated dog-bite 1P caller, a medical-malpractice caller
                      worried about fees), each a recording with what to listen for and its transcript, every line's
                      [m:ss] a button that plays the recording from there.
     • .ftis-consult  Day 9 (Part 3) and 🎧 the Transcription Activity: the PI equivalent sample guide, Atty.
                      Magdalena's consultation with a new client, as a recording, its A / C transcript (A for
                      Attorney, C for Client) and the sample minutes made from it.
     • .ftis-packet   Day 8 (Part 2), Topic 3: choose your Intake Packet, and the exact names to download, rename and
                      file it under. The choice is remembered in this browser only; the work itself goes to Drive.
   The recordings and transcripts are js/ft-intake-samples.js (build/audio/make_audio.py, from
   build/audio/intake_samples.json): fictional people and cases, written for training. It loads the first time a
   slide asks for it, not with the page.
   ============================================================ */
(function(){
"use strict";
const e = v => (typeof esc === "function" ? esc : x => String(x).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]))(String(v == null ? "" : v));
const V = (function(){ const s = document.currentScript; const m = s && /\?v=([^&]+)/.exec(s.src); return m ? "?v=" + m[1] : ""; })();
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const firstName = () => String((typeof state === "object" && (state.certName || state.traineeName)) || "").replace(/"/g, "").split(",").pop().trim().split(/\s+/)[0] || "";

/* ---------- the data, loaded once, when a slide needs it ---------- */
let loading = null;
function data(){
  if(window.FT_INTAKE_SAMPLES) return Promise.resolve(window.FT_INTAKE_SAMPLES);
  if(loading) return loading;
  loading = new Promise((ok, no) => { const s = document.createElement("script"); s.src = "/js/ft-intake-samples.js" + V;
    s.onload = () => ok(window.FT_INTAKE_SAMPLES); s.onerror = () => { loading = null; no(new Error("load")); }; document.head.appendChild(s); });
  return loading;
}

/* ---------- a recording with its transcript ---------- */
function transcript(item, who){
  return `<details class="ftis-tx"><summary>📝 Transcript</summary><ol class="ftis-lines">${item.lines.map(([w, x, t]) => `<li>
    <button type="button" class="ftis-at" data-t="${t}" title="Play from here">[${mmss(t)}]</button><b class="ftis-who ftis-${w === who[0] ? "a" : "b"}">${e(w)}:</b> <span>${e(x)}</span></li>`).join("")}</ol></details>`;
}
function player(item){
  return `<audio class="ftis-audio" controls preload="none" src="${e(item.src)}"></audio><small class="ftis-dur">${mmss(item.dur)}</small>`;
}
function callsHtml(d){
  return d.calls.map((c, i) => `<article class="ftis-call">
    <header><span class="ftis-n">${i + 1}</span><div><b>${e(c.title)}</b><small>${e(c.kind)} · ${e(d.firm)} (fictional)</small></div></header>
    <p class="ftis-about">${e(c.about)}</p>
    <div class="ftis-play">${player(c)}</div>
    <p class="ftis-lf-h">Listen for</p><ul class="ftis-lf">${c.listen_for.map(x => `<li>${e(x)}</li>`).join("")}</ul>
    ${transcript(c, ["VA"])}</article>`).join("");
}
function consultHtml(d){
  const k = d.consult, m = k.minutes, nl = x => e(x).replace(/\n/g, "<br>");
  const row = (l, v) => `<tr><th>${e(l)}</th><td>${nl(v)}</td></tr>`;
  return `<article class="ftis-call ftis-consult-c">
    <header><span class="ftis-n">📘</span><div><b>${e(k.title)}</b><small>A = Atty. Magdalena (Attorney) · C = Daniel Reyes (Client) · fictional</small></div></header>
    <p class="ftis-about">${e(k.about)}</p>
    <div class="ftis-play">${player(k)}</div>
    ${transcript(k, ["A"])}
    <details class="ftis-tx"><summary>📄 Sample minutes made from this consultation</summary>
      <div class="ftis-min"><p class="ftis-min-h">MINUTES OF THE MEETING</p>
      <table>${row("Date", m.date)}${row("Time", m.time)}${row("Attendees", m.attendees)}${row("Purpose", m.purpose)}</table>
      <h5>Discussion</h5><p>${nl(m.discussion)}</p><h5>The client’s concerns and questions</h5><p>${nl(m.concerns)}</p>
      <h5>The attorney’s advice and answers</h5><p>${nl(m.advice)}</p><h5>Action items and next steps</h5><p>${nl(m.actions)}</p></div></details>
    ${typeof goto === "function" && window.FTTranscribe && !document.querySelector("main.main-tr") ? `<div class="ftis-go"><button type="button" class="btn btn-navy btn-sm" onclick="goto('transcribe')">🎧 Open the Transcription Activity →</button></div>` : ""}
  </article>`;
}

/* ---------- Day 8: choose your Intake Packet ---------- */
const PKEY = "ftis-packet";
const getP = () => { try{ return Number(localStorage.getItem(PKEY)) || 0; }catch(err){ return 0; } };
const setP = n => { try{ n ? localStorage.setItem(PKEY, String(n)) : localStorage.removeItem(PKEY); }catch(err){} };
function packetHtml(el){
  const n = getP(), who = firstName() || "VA’s Name", folder = el.getAttribute("data-folder") || "";
  const name = n ? `INTAKE - Packet ${n} (${who})` : "INTAKE - Packet # (VA’s Name)";
  return `<div class="ftis-pk-h"><b>📦 Your Intake Packet</b>
      <label>Packet <select onchange="FTIntake.packet(this.value)"><option value="">Choose…</option>${Array.from({length: 10}, (_, i) => `<option value="${i + 1}"${n === i + 1 ? " selected" : ""}>Packet ${i + 1}</option>`).join("")}</select></label></div>
    <ol class="ftis-pk-steps">
      <li>Open the <a class="viewer-link" data-kind="doc" data-title="Redacted Intake Packets" href="${e(folder)}">Redacted Intake Packets folder</a> and find ${n ? `<b>Intake Packet ${n}</b>` : "the packet you chose (or the one your trainer assigned)"}.</li>
      <li>Download it: open the file, then <b>⋮ → Download</b> (or right-click it in the folder → <b>Download</b>). Save it to your computer, not your Drive.</li>
      <li>Rename the downloaded packet: <code class="ftis-name">${e(name)}</code> ${n ? `<button type="button" class="btn btn-ghost btn-sm" onclick="FTIntake.copy(this)" data-copy="${e(name)}">📋 Copy</button>` : ""}</li>
      <li>In your <b>Assessments/Activities</b> folder, create a subfolder named after the packet’s client. Upload the renamed packet and every document you extract from it there. The completed Intake Worksheet goes directly in Assessments/Activities, not in the subfolder.</li>
    </ol>
    <p class="ftis-pk-note">${n ? `✓ Packet ${n} chosen (remembered in this browser). If your trainer assigns a different packet, choose that one.` : "Your choice is remembered in this browser. If your trainer assigned a packet, choose that one."}</p>`;
}

/* ---------- filling the slides ---------- */
function refit(){ try{ window.dispatchEvent(new Event("resize")); }catch(err){} }
function fill(){
  document.querySelectorAll(".ftis-packet:not([data-on])").forEach(el => { el.setAttribute("data-on", "1"); el.innerHTML = packetHtml(el); refit(); });
  const want = document.querySelectorAll(".ftis-calls:not([data-on]), .ftis-consult:not([data-on])");
  if(!want.length) return;
  want.forEach(el => { el.setAttribute("data-on", "1"); el.innerHTML = `<p class="ftis-wait">Loading the recordings…</p>`; });
  data().then(d => {
    want.forEach(el => { el.innerHTML = el.classList.contains("ftis-calls") ? callsHtml(d) : consultHtml(d); });
    refit();
  }).catch(() => want.forEach(el => { el.innerHTML = `<p class="ftis-wait">The recordings didn’t load. Check your connection and open this slide again.</p>`; el.removeAttribute("data-on"); }));
}
let queued = false;
new MutationObserver(() => { if(queued) return; queued = true; requestAnimationFrame(() => { queued = false; fill(); }); })
  .observe(document.documentElement, {childList: true, subtree: true});

// a transcript line's [m:ss] plays its recording from there; one recording plays at a time
document.addEventListener("click", ev => {
  const b = ev.target.closest && ev.target.closest(".ftis-at"); if(!b) return;
  const a = b.closest(".ftis-call") && b.closest(".ftis-call").querySelector("audio"); if(!a) return;
  a.currentTime = Number(b.getAttribute("data-t")) || 0; a.play().catch(() => {});
});
document.addEventListener("play", ev => { if(!ev.target.classList || !ev.target.classList.contains("ftis-audio")) return;
  document.querySelectorAll("audio.ftis-audio").forEach(a => { if(a !== ev.target) a.pause(); }); }, true);

window.FTIntake = {
  data,
  packet(v){ setP(Number(v) || 0); document.querySelectorAll(".ftis-packet").forEach(el => { el.innerHTML = packetHtml(el); }); },
  copy(b){ const t = b.getAttribute("data-copy"); try{ navigator.clipboard.writeText(t); b.textContent = "✓ Copied"; setTimeout(() => { b.textContent = "📋 Copy"; }, 1500); }catch(err){} }
};

(function(){ const s = document.createElement("style"); s.id = "ft-intake"; s.textContent = `
.ftis-calls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:8px 0;}
.ftis-consult{margin:8px 0;}
.ftis-call{background:#fff;border:1px solid #DCE0EA;border-left:5px solid #DB8437;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;color:#1B1E2E;}
.ftis-call header{display:flex;align-items:center;gap:10px;}
.ftis-call header b{display:block;color:#262B45;font-size:15.5px;} .ftis-call header small{color:#5B6178;font-size:12.5px;}
.ftis-n{flex:0 0 auto;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#262B45;color:#fff;font-weight:800;font-size:14px;}
.ftis-about{margin:0;font-size:14px;line-height:1.5;}
.ftis-play{display:flex;align-items:center;gap:8px;} .ftis-audio{width:100%;height:36px;} .ftis-dur{color:#5B6178;font:600 12px 'IBM Plex Mono',ui-monospace,monospace;}
.ftis-lf-h{margin:2px 0 0;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#B5651F;}
.ftis-lf{margin:0;padding-left:18px;font-size:13.5px;line-height:1.45;}
.ftis-tx summary{cursor:pointer;font-weight:700;color:#262B45;font-size:14px;padding:4px 0;}
.ftis-lines{list-style:none;margin:6px 0 0;padding:8px 10px;max-height:300px;overflow:auto;background:#F6F7FB;border-radius:8px;font-size:13.5px;line-height:1.5;}
.ftis-lines li{margin:0 0 6px;}
.ftis-at{border:0;background:#EAF1FF;color:#262B45;border-radius:6px;padding:0 5px;margin-right:6px;font:600 12px 'IBM Plex Mono',ui-monospace,monospace;cursor:pointer;}
.ftis-at:hover{background:#DB8437;color:#fff;}
.ftis-who{margin-right:2px;} .ftis-who.ftis-a{color:#B5651F;} .ftis-who.ftis-b{color:#262B45;}
.ftis-min{background:#fff;border:1px solid #DCE0EA;border-radius:8px;padding:12px 16px;margin-top:6px;font-size:13.5px;line-height:1.5;}
.ftis-min-h{margin:0 0 8px;text-align:center;font:800 15px 'Poppins','Inter',sans-serif;color:#262B45;letter-spacing:.04em;}
.ftis-min table{width:100%;border-collapse:collapse;} .ftis-min th, .ftis-min td{border:1px solid #CBD2DF;padding:5px 8px;text-align:left;vertical-align:top;}
.ftis-min th{width:26%;background:#F2F2F2;} .ftis-min h5{margin:10px 0 2px;color:#262B45;font-size:13.5px;} .ftis-min p{margin:0;}
.ftis-go{display:flex;justify-content:flex-end;}
.ftis-wait{color:#5B6178;font-size:13.5px;}
.ftis-packet{background:#FFF8EF;border:2px dashed #DB8437;border-radius:12px;padding:12px 16px;margin:6px 0 10px;color:#1B1E2E;}
.ftis-pk-h{display:flex;align-items:center;gap:12px;flex-wrap:wrap;} .ftis-pk-h b{color:#262B45;font-size:15px;}
.ftis-pk-h label{font-weight:700;font-size:14px;} .ftis-pk-h select{font:600 14px 'Inter',sans-serif;padding:4px 8px;border-radius:8px;border:1px solid #CBD2DF;margin-left:4px;}
.ftis-pk-steps{margin:8px 0 4px;padding-left:20px;font-size:14px;line-height:1.55;} .ftis-pk-steps li{margin-bottom:4px;}
.ftis-name{background:#262B45;color:#fff;border-radius:6px;padding:2px 8px;font-size:13px;}
.ftis-pk-note{margin:0;font-size:12.5px;color:#5B6178;}
@media(max-width:800px){.ftis-calls{grid-template-columns:minmax(0,1fr);}}
`; document.head.appendChild(s); })();
})();
