/**
 * LSH 18-Day Foundational Training Program — Cloudflare Worker (secured)
 *
 * Same engine as the EA/PA portal worker. All storage lives in the shared
 * LSH_KV namespace under an "ft:" key prefix, so this program, the CM course and
 * the EA/PA portal can use one KV namespace without their records colliding.
 *
 * Files under any /trainer/ folder (the facilitator's notes) are sent only to a
 * signed-in trainer (admin token) in secure mode.
 *
 * Secrets (set once with `wrangler secret put <NAME>`):
 *   GEMINI_API_KEY5 … GEMINI_API_KEY9 — the Gemini key pool behind every AI feature (see GEMINI_POOL).
 *                        Each request starts on the next key in turn; a key that hits its limit is
 *                        rested and the next key takes over. At least one is required.
 *   GEMINI_API_KEY, GEMINI_API_KEY1, GEMINI_API_KEY2 — optional: used only after every pool key.
 *   GEMINI_MODEL       — optional: first model for grading and trainer tools (default gemini-3.8-flash).
 *                        Live chat always starts on gemini-3.5-flash-lite (the free tier's daily limit
 *                        is ~500 requests there, 20 on the Flash models); see geminiModels.
 *   ADMIN_PASSPHRASE   — trainer/admin sign-in. Setting this switches the portal
 *                        into SECURE MODE: every storage and AI request must carry
 *                        a signed session token.
 *   SESSION_SECRET     — optional; signs session tokens (defaults to ADMIN_PASSPHRASE)
 *
 * Daily Task Tracker: each trainee's sheet is tracker:<id> (the trainee edits it); the daily check,
 * notes review and trainer comments are trackerreview:<id> (trainees read it, only admins write it).
 * The check runs on the cron in wrangler.json (after the training day, Pacific time), and on demand
 * from Admin → 📋 Task Trackers. The rules are shared with the page: js/ft-tracker-rules.js.
 *
 * Without ADMIN_PASSPHRASE the Worker runs in the old open mode so nothing breaks
 * before you've configured it (the Admin screen shows a warning).
 */
import "./js/ft-tracker-rules.js";
const TR = globalThis.FTTrackerRules;

/* ---------- KV with the "ft:" namespace prefix ---------- */
const KV_PREFIX = "ft:";
function kvOf(env) {
  const raw = env.LSH_KV;
  if (!raw) return null;
  return {
    get: (k) => raw.get(KV_PREFIX + k),
    put: (k, v) => raw.put(KV_PREFIX + k, v),
    delete: (k) => raw.delete(KV_PREFIX + k),
    list: async (opts = {}) => {
      const r = await raw.list(Object.assign({}, opts, { prefix: KV_PREFIX + (opts.prefix || "") }));
      return Object.assign({}, r, { keys: r.keys.map((x) => Object.assign({}, x, { name: x.name.slice(KV_PREFIX.length) })) });
    }
  };
}

const JSON_HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
const enc = new TextEncoder();

/* ---------- tokens: "<role>.<subject>.<expiry>.<hmac>" ---------- */
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function secretOf(env) { return env.SESSION_SECRET || env.ADMIN_PASSPHRASE || ""; }
async function makeToken(env, role, subject, hours) {
  const exp = Date.now() + hours * 3600 * 1000;
  const body = `${role}.${encodeURIComponent(subject)}.${exp}`;
  return `${body}.${await hmac(secretOf(env), body)}`;
}
async function readToken(env, request) {
  const h = request.headers.get("Authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const parts = t.split(".");
  if (parts.length !== 4) return null;
  const [role, subj, exp, sig] = parts;
  if (Date.now() > Number(exp)) return null;
  const good = await hmac(secretOf(env), `${role}.${subj}.${exp}`);
  if (!safeEqual(good, sig)) return null;
  return { role, id: decodeURIComponent(subj) };
}
function safeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- trainee IDs (must match the portal's generateTraineeId) ---------- */
function slugPart(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function candidateIds(name, batch) {
  let slug = slugPart(name).slice(0, 40);
  if (!slug) { let h = 0; for (const c of String(name || "")) h = (h * 31 + c.codePointAt(0)) >>> 0; slug = "trainee-" + h.toString(36); }
  const b = slugPart(batch).slice(0, 20);
  return { newId: b ? `${slug}--${b}` : slug, legacyId: slugPart(name).slice(0, 40) || "trainee" };
}

/* ---------- what a trainee may touch ---------- */
// Activities: activities:dayN and their attachments (actfile:*) are published by trainers for everyone;
// settings:feedback-style is the facilitator voice the platform's AI feedback is written in.
// settings:monitor is the Training Monitoring Sheet's discussions and key points (trainers set it).
const PUBLIC_READ = [/^blueprint:meta$/, /^settings:(feedback|certificate|opendays|feedback-style|monitor)$/, /^activities:day\d+$/, /^actfile:[a-z0-9]{1,40}$/, /^surprise-task-day\d+$/, /^extralessons:day\d+$/, /^lessonx:day\d+$/, /^extraquiz:day\d+$/, /^handouts:links$/];
const OWN = (id) => [`trainee:${id}`, `progress:${id}`, `feedback:${id}`, `focus:${id}`, `tracker:${id}`, `trackerreview:${id}`, `actsub:${id}`, `monitor:${id}`];
const PROTECTED_TRAINEE_FIELDS = ["approved", "rejected", "archived", "labAttemptsResetAt", "certTrainer", "aiReview", "flaggedInvalidInput", "assignedRoleplay", "registeredAt"];

function canRead(tok, key) {
  if (tok.role === "a") return true;
  return OWN(tok.id).includes(key) || key.startsWith(`actup:${tok.id}:`) || PUBLIC_READ.some((re) => re.test(key));
}
async function traineeWrite(env, tok, key, value) {
  const kv = kvOf(env);
  const id = tok.id;
  let incoming; try { incoming = JSON.parse(value); } catch (e) { return "Invalid JSON"; }
  const existingRaw = await kv.get(key);
  const existing = existingRaw ? JSON.parse(existingRaw) : null;
  if (key === `trainee:${id}`) {
    // Trainees keep their own record current, but can never change approval, attempts resets, etc.
    const merged = Object.assign({}, incoming);
    PROTECTED_TRAINEE_FIELDS.forEach((f) => { if (existing && f in existing) merged[f] = existing[f]; else delete merged[f]; });
    if (!existing) { merged.approved = false; merged.registeredAt = new Date().toISOString(); }
    merged.id = id;
    await kv.put(key, JSON.stringify(merged)); return null;
  }
  if (key === `progress:${id}`) { await kv.put(key, value); return null; }
  if (key === `tracker:${id}`) {
    if (value.length > 900000) return "The tracker is too large to save";
    await kv.put(key, value); return null;
  }
  if (key === `monitor:${id}`) {
    // Training Monitoring Sheet (js/ft-monitoring.js): the trainee's own entries; the admin's
    // automated feedback is worked out from them on the page, so there's nothing here to protect.
    if (value.length > 400000) return "The Monitoring Sheet is too large to save";
    await kv.put(key, value); return null;
  }
  if (key === `feedback:${id}`) {
    // Trainees (auto-review) may add days and mark reviews read — never rewrite a trainer's review.
    const out = existing && existing.days ? JSON.parse(JSON.stringify(existing)) : { days: {} };
    const inDays = (incoming && incoming.days) || {};
    for (const [d, v] of Object.entries(inDays)) {
      const cur = out.days[d];
      const trainerOwned = cur && (cur.editedByTrainer || (cur.status === "sent" && !cur.auto));
      if (trainerOwned) { if (v && v.readAt && !cur.readAt) cur.readAt = v.readAt; continue; }
      if (v && typeof v === "object") { delete v.editedByTrainer; out.days[d] = v; }
    }
    await kv.put(key, JSON.stringify(out)); return null;
  }
  if (key === `focus:${id}`) {
    // Trainees may only mark trainer focus items as seen/done.
    const out = existing && Array.isArray(existing.items) ? existing : { items: [] };
    const byId = Object.fromEntries(((incoming && incoming.items) || []).map((x) => [x.id, x]));
    out.items.forEach((x) => { const u = byId[x.id]; if (u) { x.seenAt = u.seenAt || x.seenAt || null; x.doneAt = u.doneAt || null; } });
    await kv.put(key, JSON.stringify(out)); return null;
  }
  if (key === `actsub:${id}`) {
    // Daily Activities submissions: a trainee writes their own answers and marks feedback read;
    // the trainer's feedback is never theirs to change. A new submission retires the old feedback.
    const out = existing && existing.items ? existing : { items: {} };
    for (const [aid, v] of Object.entries((incoming && incoming.items) || {})) {
      if (!/^[a-z0-9]{1,40}$/.test(aid) || !v || typeof v !== "object") continue;
      const cur = out.items[aid] || {};
      const next = Object.assign({}, cur);
      if (typeof v.answer === "string") next.answer = v.answer.slice(0, 20000);
      if ("file" in v) next.file = v.file && typeof v.file === "object" ? { name: String(v.file.name || "").slice(0, 200), type: String(v.file.type || "").slice(0, 100), size: Number(v.file.size) || 0 } : null;
      if (v.submittedAt && v.submittedAt !== cur.submittedAt) {
        next.submittedAt = String(v.submittedAt).slice(0, 40);
        next.attempts = (cur.attempts || 0) + 1;
        if (cur.feedback && cur.feedback.status === "sent") next.prevFeedback = cur.feedback;
        delete next.feedback; delete next.readAt;
      }
      if (v.readAt && cur.feedback && cur.feedback.status === "sent" && !cur.readAt) next.readAt = String(v.readAt).slice(0, 40);
      out.items[aid] = next;
    }
    const outStr = JSON.stringify(out);
    if (outStr.length > 1000000) return "Too large";
    await kv.put(key, outStr); return null;
  }
  if (key.startsWith(`actup:${id}:`) && /^actup:.+:[a-z0-9]{1,40}$/.test(key)) {
    // A file a trainee attached to an activity answer (a data URL, about 4 MB at most).
    if (String(value).length > 6000000) return "File too large";
    await kv.put(key, value); return null;
  }
  if (/^tfeedback:[a-z0-9]+$/.test(key) || /^cert:LSH-FT-\d{4}-[A-Z0-9]{6}$/.test(key)) {
    if (existing && /^tfeedback:/.test(key)) return "Already submitted";
    await kv.put(key, value); return null;
  }
  return "Not allowed";
}

/* ---------- Google Gemini (free tier) ----------
   Gemini is the only reviewer. The portal sends a simple
   {messages, system, max_tokens} request; this translates it to Gemini's
   generateContent and the reply back. Models: see geminiModels (chat starts on Flash-Lite),
   each falling back to the next model, then the next key, if busy or unavailable. */
// Every AI feature (chat, grading, tracker notes review, trainer tools) shares one pool of keys.
// Free-tier limits are per Google Cloud project, so each key should come from its own project.
const GEMINI_POOL = ["GEMINI_API_KEY5", "GEMINI_API_KEY6", "GEMINI_API_KEY7", "GEMINI_API_KEY8", "GEMINI_API_KEY9"];
const GEMINI_SPARE = ["GEMINI_API_KEY", "GEMINI_API_KEY1", "GEMINI_API_KEY2"];   // only after every pool key
const geminiKeyNames = (env) => [...GEMINI_POOL, ...GEMINI_SPARE].filter((n, i, a) => env[n] && a.findIndex((m) => env[m] === env[n]) === i);
const hasGemini = (env) => geminiKeyNames(env).length > 0;
// Per Worker instance: which key the next request starts on, and keys resting after a limit.
// A per-minute limit rests the key for a minute; a daily limit for an hour; a rejected key for 10 minutes.
let geminiTurn = Math.floor(Math.random() * 1000);
const geminiRest = new Map();   // "<key name>|<model>" or "<key name>|*" → rest until (ms)
const resting = (name, model) => Math.max(geminiRest.get(name + "|*") || 0, geminiRest.get(name + "|" + model) || 0) > Date.now();
function geminiKeyOrder(env) {
  const names = geminiKeyNames(env);
  const pool = names.filter((n) => GEMINI_POOL.includes(n)), spare = names.filter((n) => !GEMINI_POOL.includes(n));
  const start = pool.length ? geminiTurn++ % pool.length : 0;
  return [...pool.slice(start), ...pool.slice(0, start), ...spare];
}
const GEMINI_FLASH = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash"], GEMINI_LITE = "gemini-3.5-flash-lite";
const geminiModels = (env, feature) => (feature === "chat" || feature === "tracker" || !feature   // high-volume features start on Flash-Lite
  ? [GEMINI_LITE, ...GEMINI_FLASH]
  : [env.GEMINI_MODEL, ...GEMINI_FLASH, GEMINI_LITE]).filter((v, i, a) => v && a.indexOf(v) === i);
const featureFromBody = (raw) => { try { return String(JSON.parse(raw).feature || ""); } catch (e) { return ""; } };

async function callGemini(env, rawBody) {
  let req; try { req = JSON.parse(rawBody); } catch (e) { return json({ error: "Invalid request" }, 400); }
  // Keys in turn (see geminiKeyOrder): when a key's free-tier limit is used up (429) or the key is
  // rejected, it rests and the next key takes the request.
  const keys = geminiKeyOrder(env);
  if (!keys.length) return json({ error: "No AI key is configured on this Worker. Add GEMINI_API_KEY5 as a Secret in Cloudflare." }, 500);
  const toText = (c) => typeof c === "string" ? c : (Array.isArray(c) ? c.map((p) => p && p.text ? p.text : "").join("\n") : "");
  const contents = (req.messages || []).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: toText(m.content) }] }));
  const payload = {
    contents,
    // extra headroom: newer Gemini models may spend part of the budget "thinking" before answering
    generationConfig: { maxOutputTokens: Math.min(Math.max((Number(req.max_tokens) || 1024) * 2, 2048), 16384), temperature: 0.7 }
  };
  if (req.system) payload.systemInstruction = { parts: [{ text: toText(req.system) }] };
  // Google limits the 2.5 models to accounts that already used them; new projects use 3.8 Flash / 3.5 Flash-Lite.
  // Free tier: each model has its own quota. Flash-Lite allows about 500 requests a day and 15 a
  // minute; the Flash models only 20 a day and 5 a minute. So live chat (high volume) starts on
  // Flash-Lite, while grading and trainer tools (low volume) start on the Flash models for quality
  // and fall back to Flash-Lite when those run out. GEMINI_MODEL, if set, is the first choice for
  // grading and trainer tools only.
  const models = geminiModels(env, req.feature);
  let last = null, limit = null;
  // Each model is tried on every key before moving to the next model, so grading uses up the
  // Flash quota across all keys before falling back to Flash-Lite. Resting keys are skipped, so a
  // busy day costs one call per key, not a call to every key for every request.
  for (const model of models) {
    for (const name of keys.filter((n) => !resting(n, model))) {
      const apiKey = env[name];
      const p = JSON.parse(JSON.stringify(payload));
      if (/2\.5-flash/.test(model)) p.generationConfig.thinkingConfig = { thinkingBudget: 0 };   // 2.5: thinking off
      else p.generationConfig.thinkingConfig = { thinkingLevel: "low" };                         // 3.x: think briefly → much faster replies
      const send = (body) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body)
      });
      let r = await send(p);
      let data = await r.json().catch(() => ({}));
      if (r.status === 400 && /thinking/i.test((data.error && data.error.message) || "")) {   // model doesn't accept that setting → send without it
        delete p.generationConfig.thinkingConfig; r = await send(p); data = await r.json().catch(() => ({}));
      }
      if (r.ok) {
        const cand = (data.candidates || [])[0] || {};
        const text = ((cand.content && cand.content.parts) || []).filter((x) => !x.thought).map((x) => x.text || "").join("");
        if (!text) { last = { status: 502, msg: `Gemini returned no text (${cand.finishReason || "blocked"})` }; break; }   // same prompt on another key won't help: next model
        return json({ content: [{ type: "text", text }], model, stop_reason: cand.finishReason === "MAX_TOKENS" ? "max_tokens" : "end_turn", provider: "gemini" });
      }
      const msg = (data.error && data.error.message) || `Gemini error ${r.status}`;
      last = { status: r.status, msg };
      if (r.status === 429) {
        limit = last;
        geminiRest.set(name + "|" + model, Date.now() + (/per.?day|daily/i.test(msg) ? 3600000 : 60000));
        continue;                                                       // next key, same model
      }
      if ((r.status === 400 && /API key/i.test(msg)) || r.status === 401 || r.status === 403) {   // rejected key (or API not enabled in its project): rest it
        geminiRest.set(name + "|*", Date.now() + 600000);
        if (r.status !== 400) last = { status: 400, msg: "API key rejected: " + msg };
        continue;
      }
      if (r.status === 404) break;                                      // model not available: next model
      if ([500, 503].includes(r.status)) continue;                     // busy: next key
      return json({ error: { message: msg } }, r.status);               // anything else (e.g. a bad request) won't improve on another key
    }
  }
  if (limit) last = limit;   // report the limit, not a later model's 404
  if (!last) last = { status: 429, msg: "every Gemini key is resting after reaching its limit — try again in a minute" };
  const status = last.status === 400 && /API key/i.test(last.msg) ? 502 : last.status;   // 502, not 401: a bad AI key is not a portal sign-in problem
  return json({ error: { message: (status === 502 && /API key/i.test(last.msg) ? "invalid x-api-key (Gemini): " : status === 429 ? "rate limit (Gemini free tier): " : "") + last.msg } }, status);
}

async function listAll(env, prefix) {
  const kv = kvOf(env);
  const keys = []; let cursor;
  do { const r = await kv.list({ prefix, cursor }); r.keys.forEach((k) => keys.push(k.name)); cursor = r.list_complete ? null : r.cursor; } while (cursor);
  return keys;
}

/* ---------- Daily Task Tracker: the daily check ----------
   For every approved trainee with a tracker: run the rules for the day, write a notes review
   against the trainer's criteria (settings:trackercriteria), and keep the trainer's comment. */
async function aiText(env, system, prompt, maxTokens) {
  if (!hasGemini(env)) return "";
  const r = await callGemini(env, JSON.stringify({ feature: "tracker", system, max_tokens: maxTokens || 400, messages: [{ role: "user", content: prompt }] }));
  const j = await r.json().catch(() => ({}));
  return r.ok && j.content && j.content[0] ? String(j.content[0].text || "").trim() : "";
}
// The facilitator's feedback voice (Admin → 🗣 Feedback Style, js/ft-activities.js); "" when off.
function facilitatorVoice(st) {
  if (!st || st.enabled === false || !st.guide) return "";
  const ex = (st.examples || []).slice(0, 3).map((x, i) => `(${i + 1}) ${String(x).slice(0, 900)}`).join("\n");
  return `\n\nVOICE: write the way this program's facilitator writes feedback. Keep the requested format and keep the judgement evidence-based; the voice changes wording only.\nFacilitator style guide:\n${String(st.guide).slice(0, 2500)}${ex ? `\nExamples of the facilitator's voice (match tone and phrasing; do not reuse their content):\n${ex}` : ""}`;
}
async function runTrackerChecks(env, opts) {
  const kv = kvOf(env);
  const o = opts || {};
  const D = o.date || TR.ptDate();
  if (!o.force && !TR.isWeekday(D)) return { date: D, skipped: "weekend", checked: 0 };
  const critRaw = await kv.get("settings:trackercriteria");
  const criteria = (critRaw && (JSON.parse(critRaw).text || "").trim()) || TR.DEFAULT_CRITERIA;
  const voice = facilitatorVoice(JSON.parse((await kv.get("settings:feedback-style")) || "null"));
  const keys = o.id ? [`tracker:${o.id}`] : await listAll(env, "tracker:");
  const done = [];
  for (const k of keys) {
    const id = k.slice("tracker:".length);
    const rec = JSON.parse((await kv.get(`trainee:${id}`)) || "null");
    if (!o.id && (!rec || rec.approved !== true || rec.archived)) continue;
    const t = JSON.parse((await kv.get(k)) || "null");
    if (!t) continue;
    const res = TR.checkDay(t, D);
    if (res.na) continue;   // before this trainee's first tracker day
    const p = TR.reviewPrompt(t, D, criteria, rec && rec.name);
    let review = "";
    try { review = await aiText(env, p.system + voice, p.prompt, 400); } catch (e) { review = ""; }
    const rk = `trackerreview:${id}`;
    const cur = JSON.parse((await kv.get(rk)) || "null") || { days: {} };
    const prev = cur.days[D] || {};
    cur.days[D] = Object.assign({}, res, { review: review || prev.review || "", checkedAt: new Date().toISOString(), comment: prev.comment || "", commentAt: prev.commentAt || "" });
    cur.updatedAt = new Date().toISOString();
    await kv.put(rk, JSON.stringify(cur));
    done.push({ id, pct: res.pct, flags: res.flags.length });
  }
  return { date: D, checked: done.length, results: done };
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runTrackerChecks(env, {}));
  },
  async fetch(request, env) {
    const kv = kvOf(env);
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const secure = !!env.ADMIN_PASSPHRASE;
      if (path === "/blueprint.pdf") {
        // The Platform Blueprint PDF, rebuilt automatically by the portal after each update (trainee-safe content).
        const raw = kv ? await kv.get("blueprint:pdf") : null;
        if (!raw) return new Response("The Platform Blueprint hasn't been generated yet — an admin opening the portal builds it automatically within a minute.", { status: 404, headers: { "Content-Type": "text/plain" } });
        const { b64, build } = JSON.parse(raw);
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return new Response(bin, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="LSH_FT_Platform_Blueprint_${build}.pdf"`, "Cache-Control": "no-cache" } });
      }
      if (path === "/version" || path === "/api/version") {
        // Diagnostic: shows which portal build is actually deployed.
        const page = await env.ASSETS.fetch(new Request(new URL("/", request.url)));
        const html = await page.text();
        const m = html.match(/APP_BUILD = "([^"]+)"/);
        return new Response(`Portal build deployed: ${m ? m[1] : "unknown (old index.html — no build tag)"}\nWorker: secure-mode worker.js\nSecure mode: ${env.ADMIN_PASSPHRASE ? "ON" : "OFF"}\nAI provider: ${hasGemini(env) ? "Google Gemini (chat starts on " + geminiModels(env, "chat")[0] + ", grading and trainer tools on " + geminiModels(env, "grading")[0] + ")" : "none — add GEMINI_API_KEY5"}\nAI key pool: ${[...GEMINI_POOL, ...GEMINI_SPARE].map((n) => `${n} ${env[n] ? (geminiKeyNames(env).includes(n) ? "set" : "set (same key as another)") : "not set"}${resting(n, "*") ? " (resting)" : ""}`).join(", ")}\n`, { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
      }
      if (path.includes("/trainer/")) {
        // Trainer-only files (facilitator's notes): served only with an admin token in secure mode.
        let who = secure ? await readToken(env, request) : { role: "a" };
        if (secure && !who) {
          // Images can't send an Authorization header, so the page also sets the trainer's
          // token as a cookie scoped to /trainer (see js/ft-updates.js).
          const c = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)ft_admin=([^;]+)/);
          if (c) who = await readToken(env, new Request(request.url, { headers: { Authorization: "Bearer " + decodeURIComponent(c[1]) } }));
        }
        if (!who || who.role !== "a") return new Response("Trainer sign-in required", { status: 401, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
        const res = await env.ASSETS.fetch(new Request(url.toString()));
        const h = new Headers(res.headers);
        h.set("Cache-Control", "no-store");
        return new Response(res.body, { status: res.status, headers: h });
      }
      if (!path.startsWith("/api/")) {
        const res = await env.ASSETS.fetch(request);
        const type = res.headers.get("Content-Type") || "";
        if (!type.includes("text/html")) return res;
        // Never let browsers or the edge keep an old copy of the portal page.
        const h = new Headers(res.headers);
        h.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return new Response(res.body, { status: res.status, headers: h });
      }
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      if (!kv && path.startsWith("/api/storage")) return json({ error: "LSH_KV namespace is not bound on this Worker." }, 500);

      /* ---------- auth ---------- */
      if (path === "/api/auth/status") return json({ secure });
      if (path === "/api/auth/admin") {
        if (!secure) return json({ error: "not-configured" }, 501);
        const { passphrase } = await request.json();
        await new Promise((r) => setTimeout(r, 400)); // slow down guessing
        if (!safeEqual(String(passphrase || ""), env.ADMIN_PASSPHRASE)) return json({ error: "Incorrect passphrase" }, 401);
        return json({ token: await makeToken(env, "a", "admin", 12) });
      }
      if (path === "/api/auth/trainee") {
        if (!secure) return json({ error: "not-configured" }, 501);
        const { name, batch, id } = await request.json();
        if (!name || !batch) return json({ error: "Name and batch are required" }, 400);
        const { newId, legacyId } = candidateIds(name, batch);
        let chosen = newId, existing = await kv.get(`trainee:${newId}`);
        if (!existing) {
          const legacy = await kv.get(`trainee:${legacyId}`);
          const lrec = legacy ? JSON.parse(legacy) : null;
          if (lrec && (!lrec.batch || slugPart(lrec.batch) === slugPart(batch))) { chosen = legacyId; existing = legacy; }
        }
        if (id && id !== chosen && id !== newId && id !== legacyId) return json({ error: "Name/batch don't match this session" }, 403);
        if (id && (id === newId || id === legacyId)) chosen = id;
        return json({ id: chosen, token: await makeToken(env, "t", chosen, 24 * 30), existing: existing ? JSON.parse(existing) : null });
      }

      const tok = secure ? await readToken(env, request) : { role: "a", id: "open-mode" };
      if (!tok) return json({ error: "Sign-in required" }, 401);

      /* ---------- AI proxy (signed-in users only, so strangers can't spend your credits) ---------- */
      // (the path keeps its old name so pages already open in browsers keep working)
      if (path === "/api/claude" || path === "/api/ai") {
        const body = await request.text();
        if (!hasGemini(env)) return json({ error: "No AI key is configured on this Worker. Add GEMINI_API_KEY5 as a Secret in Cloudflare." }, 500);
        return await callGemini(env, body);
      }

      /* ---------- Daily Task Tracker: run the daily check now (admin) ---------- */
      if (path === "/api/tracker/check") {
        if (tok.role !== "a") return json({ error: "Not allowed" }, 403);
        const b = await request.json().catch(() => ({}));
        return json(await runTrackerChecks(env, { id: b.id || null, date: b.date || null, force: true }));
      }

      /* ---------- cohort ranking (first name + initial only) ---------- */
      if (path === "/api/ranking") {
        const me = tok.role === "t" ? JSON.parse((await kv.get(`trainee:${tok.id}`)) || "null") : null;
        const batch = me ? slugPart(me.batch) : "";
        const out = [];
        for (const k of await listAll(env, "trainee:")) {
          const r = JSON.parse((await kv.get(k)) || "null");
          if (!r || r.approved !== true || r.archived) continue;
          if (batch && slugPart(r.batch) !== batch) continue;
          const parts = String(r.name || "Trainee").trim().split(/\s+/);
          const short = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
          const dp = {}; Object.entries(r.dayProgress || {}).forEach(([d, v]) => { if (v) dp[d] = { done: !!v.done, score: v.score, surpriseTaskScore: v.surpriseTaskScore }; });
          const pp = {}; Object.entries(r.practiceProgress || {}).forEach(([t, v]) => { if (v) pp[t] = { runs: v.runs || 0, bestScore: v.bestScore }; });
          out.push({ me: r.id === tok.id, id: r.id === tok.id ? tok.id : "", name: short, batch: r.batch || "", approved: true, dayProgress: dp, practiceProgress: pp });
        }
        return json({ batch: me ? me.batch : "", trainees: out });
      }

      /* ---------- storage ---------- */
      const body = await request.json().catch(() => ({}));
      const key = String(body.key || "");
      if (path === "/api/storage/get") {
        if (!key) return json({ error: "Missing key" }, 400);
        if (!canRead(tok, key)) return json({ error: "Not allowed" }, 403);
        return json({ value: await kv.get(key) });
      }
      if (path === "/api/storage/set") {
        if (!key) return json({ error: "Missing key" }, 400);
        if (tok.role === "a") { await kv.put(key, body.value); return json({ ok: true }); }
        const err = await traineeWrite(env, tok, key, body.value);
        return err ? json({ error: err }, 403) : json({ ok: true });
      }
      if (path === "/api/storage/list") {
        if (tok.role !== "a") return json({ keys: [] });
        return json({ keys: await listAll(env, body.prefix || "") });
      }
      if (path === "/api/storage/delete") {
        if (tok.role !== "a") return json({ error: "Not allowed" }, 403);
        await kv.delete(key); return json({ ok: true });
      }
      return json({ error: "Unknown endpoint" }, 404);
    } catch (e) {
      return json({ error: "Unhandled Worker exception.", detail: String((e && e.stack) || e) }, 500);
    }
  }
};
