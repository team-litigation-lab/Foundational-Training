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
 *   MASTER_ADMIN_PASSWORD — admin sign-in (the LSH Training Portal's master admin password: one password on every platform). Setting this switches the portal
 *                        into SECURE MODE: every storage and AI request must carry
 *                        a signed session token.
 *   SESSION_SECRET     — optional; signs session tokens (defaults to MASTER_ADMIN_PASSWORD)
 *   PORTAL_SSO_SECRET  — optional; the secret the LSH Training Portal signs its trainee launch tickets with
 *                        (the same value is set on the portal). Setting it makes the Main Portal the only
 *                        way for a trainee in: /api/auth/trainee then refuses a name + batch typed on this
 *                        site, and /api/auth/portal signs them in from the portal's ticket instead.
 *                        Admins still use MASTER_ADMIN_PASSWORD. Not set = the old name + batch sign-in.
 *
 * Daily Task Tracker: each trainee's sheet is tracker:<id> (the trainee edits it); the daily check,
 * notes review and trainer comments are trackerreview:<id> (trainees read it, only admins write it).
 * The check runs on the cron in wrangler.json (after the training day, Pacific time), and on demand
 * from Admin → 📋 Task Trackers. The rules are shared with the page: js/ft-tracker-rules.js.
 *
 * Without MASTER_ADMIN_PASSWORD the Worker runs in the old open mode so nothing breaks
 * before you've configured it (the Admin screen shows a warning).
 */
import "./js/ft-tracker-rules.js";
import "./js/ft-facilitator-dna.js";   // the facilitator's feedback DNA: the default voice
const TR = globalThis.FTTrackerRules;

/* ---------- KV with the "ft:" namespace prefix ---------- */
const KV_PREFIX = "ft:";
function kvOf(env) {
  const raw = env.LSH_KV;
  if (!raw) return null;
  return {
    get: (k) => raw.get(KV_PREFIX + k),
    put: (k, v, o) => raw.put(KV_PREFIX + k, v, o),
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
// The admin password: MASTER_ADMIN_PASSWORD, the LSH Training Portal's master admin password (one password signs an admin in on the Portal and on every platform).
function adminPass(env) { return env.MASTER_ADMIN_PASSWORD || ""; }
// The admin password is compared as a person types it. Both the stored and the typed password are read without spaces or line
// breaks around them, quotes pasted around the whole password, invisible characters (zero-width spaces, soft hyphens) or curly
// quotes and long dashes: a secret pasted into Cloudflare with any of these signs in from a saved (autofilled) password but could
// never be typed.
const PASS_INVISIBLE = /[\u00AD\u180E\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g;
const PASS_CURLY = /[\u2018\u2019\u201A\u201B\u2032\u201C\u201D\u201E\u201F\u2033\u2010-\u2015\u2212]/;
function cleanPass(v) {
  return String(v || "").normalize("NFKC").replace(PASS_INVISIBLE, "")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2010-\u2015\u2212]/g, "-").trim();
}
const PASS_QUOTED = /^(["'`])([\s\S]*)\1$/;
function normPass(v) { const t = cleanPass(v), q = t.match(PASS_QUOTED); return q ? q[2].trim() : t; }
// What /version says about the stored password (never the password itself).
function adminPassStatus(env) {
  const raw = String(env.MASTER_ADMIN_PASSWORD || "");
  if (!raw) return "not set (open mode)";
  if (!normPass(raw)) return "MASTER_ADMIN_PASSWORD is set but holds no password, only quotes, spaces or invisible characters: not accepted";
  const ignored = [];
  if (raw !== raw.trim()) ignored.push("spaces or a line break around it");
  if (new RegExp(PASS_INVISIBLE.source).test(raw)) ignored.push("invisible characters");
  if (PASS_CURLY.test(raw)) ignored.push("curly quotes or long dashes");
  if (PASS_QUOTED.test(cleanPass(raw))) ignored.push("quotes around it");
  const odd = /[^\x20-\x7E]/.test(normPass(raw)) ? "; it has a character that isn't on a standard keyboard (an accented or look-alike letter): it must be typed exactly" : "";
  return "MASTER_ADMIN_PASSWORD" + (ignored.length ? ` (had ${ignored.join(", ")}: ignored)` : "") + odd;
}
function secretOf(env) { return env.SESSION_SECRET || adminPass(env); }
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

/* ---------- Main Portal sign-in: the LSH Training Portal signs a trainee in, this site trusts its ticket ----------
   ticket = "<base64url JSON {first, last, b, exp}>.<HMAC-SHA256 of that text, keyed with PORTAL_SSO_SECRET>"
   (an administrator's ticket is {r: "a", exp}: they were signed in on the Portal with the master admin password).
   exp is epoch milliseconds; a ticket is good for a few minutes, so a copied link is no use later. */
const PORTAL_TICKET_MAX_MS = 10 * 60 * 1000;
// The Portal secret, without any space or line break pasted around it (the Portal does the same).
function portalSecret(env) { return String(env.PORTAL_SSO_SECRET || "").trim(); }
function portalOnly(env) { return !!(adminPass(env) && portalSecret(env)); }
// why (optional) gets why a ticket was refused: "format", "signature" (the Portal and this program don't share the same secret) or "expired".
async function readPortalTicket(env, ticket, why = {}) {
  if (!portalSecret(env)) { why.r = "format"; return null; }
  const parts = String(ticket || "").split(".");
  if (parts.length !== 2) { why.r = "format"; return null; }
  const good = await hmac("portal-sso:" + portalSecret(env), parts[0]);
  if (!safeEqual(good, parts[1])) { why.r = "signature"; return null; }
  let t; try { t = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)))); } catch (e) { why.r = "format"; return null; }
  const exp = Number(t && t.exp);
  if (!exp || Date.now() > exp || exp - Date.now() > PORTAL_TICKET_MAX_MS) { why.r = "expired"; return null; }
  if (t.r === "s") return { system: true };   // the Portal's own server-side tools (sign-in check, registration import): never given to a person
  if (t.r === "a") return { admin: true };    // an administrator opened this from the Portal: they still sign in here with the admin password
  const first = String(t.first || "").trim(), last = String(t.last || "").trim(), batch = String(t.b || "").trim();
  if (!first || !last || !batch) return null;
  return { name: `${first} ${last}`, first, last, batch };
}
// Like readToken, but an expired token still counts for a while (same signature, same trainee), so a trainee
// midway through the course whose 30 days run out isn't sent back to the portal in the middle of a lesson.
const TOKEN_GRACE_MS = 60 * 24 * 3600 * 1000;
async function readTraineeTokenGrace(env, request) {
  const h = request.headers.get("Authorization") || "";
  const parts = (h.startsWith("Bearer ") ? h.slice(7) : "").split(".");
  if (parts.length !== 4 || parts[0] !== "t") return null;
  const [role, subj, exp, sig] = parts;
  if (Date.now() > Number(exp) + TOKEN_GRACE_MS) return null;
  if (!safeEqual(await hmac(secretOf(env), `${role}.${subj}.${exp}`), sig)) return null;
  return { role, id: decodeURIComponent(subj) };
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
// settings:openvideos is which lessons' videos trainers have unlocked (Admin → 📅 Open Lessons → 🎬 Unlock Videos).
// settings:firms is the law firm profiles and settings:trainer-acts the trainer-led activities (js/ft-firms.js, js/ft-sessions.js).
const PUBLIC_READ = [/^blueprint:meta$/, /^settings:(feedback|certificate|opendays|openvideos|feedback-style|monitor|calsim-guidelines|firms|trainer-acts)$/, /^activities:day\d+$/, /^actfile:[a-z0-9]{1,40}$/, /^surprise-task-day\d+$/, /^extralessons:day\d+$/, /^lessonx:day\d+$/, /^extraquiz:day\d+$/, /^handouts:links$/];
const OWN = (id) => [`trainee:${id}`, `progress:${id}`, `feedback:${id}`, `focus:${id}`, `tracker:${id}`, `trackerreview:${id}`, `actsub:${id}`, `monitor:${id}`, `process:${id}`, `calsim:${id}`, `sessions:${id}`, `drive:${id}`, `lor:${id}`];
const PROTECTED_TRAINEE_FIELDS = ["approved", "rejected", "archived", "labAttemptsResetAt", "certTrainer", "aiReview", "flaggedInvalidInput", "assignedRoleplay", "registeredAt"];

// The trainer's records about a trainee: the trainee reads them, only admins write them (traineeWrite refuses their keys).
//   kcreview:<id>     the trainer's review of each Knowledge Check (js/ft-process.js)
//   assign:<id>       the trainee's law firm and cases (js/ft-firms.js)
//   labreview:<id>    the trainer's review of each Practice Session, and the trainer-led activities' results (js/ft-sessions.js)
//   simresults:<id>   the trainee's results on the Training Portal's simulators opened from this program (the Portal writes it)
//   lorassign:<id>    the case the trainer assigned for the LOR Drafting Activity (js/ft-lor.js)
const TRAINER_OWNED = (id) => [`kcreview:${id}`, `assign:${id}`, `labreview:${id}`, `simresults:${id}`, `lorassign:${id}`];
// callsim:<id>: the trainee's graded calls from the CMS Call Simulator, kept by the Training Portal (its /api/call-results).
// The trainee reads it, but never writes it (traineeWrite refuses keys it doesn't know).
function canRead(tok, key) {
  if (tok.role === "a") return true;
  return OWN(tok.id).includes(key) || TRAINER_OWNED(tok.id).includes(key) || key === `callsim:${tok.id}` || key.startsWith(`actup:${tok.id}:`) || PUBLIC_READ.some((re) => re.test(key));
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
  if (key === `process:${id}`) {
    // Process Questions (js/ft-process.js): the trainee's own answer sheets.
    if (value.length > 400000) return "The answers are too large to save";
    await kv.put(key, value); return null;
  }
  if (key === `calsim:${id}`) {
    // Calendar Scheduler (js/ft-calendar.js): the trainee's draft calendars and submissions. The trainer's reviews
    // (score and comment) are never the trainee's to write: they keep whatever the record already has.
    if (value.length > 450000) return "The calendar record is too large to save";
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return "Invalid record";
    incoming.reviews = (existing && existing.reviews) || {};
    await kv.put(key, JSON.stringify(incoming)); return null;
  }
  if (key === `drive:${id}`) {
    // The trainee's Google Drive links (js/ft-drive.js): their VA Output folder, Task Tracker sheet, Monitoring Sheet
    // and each day's output links. The checks and the trainer's scores are in trackerreview:<id> (Worker and admins).
    if (value.length > 200000) return "The links are too large to save";
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return "Invalid record";
    await kv.put(key, value); return null;
  }
  if (key === `lor:${id}`) {
    // LOR Drafting Activity (js/ft-lor.js): the trainee's own drafts of the two letters. The case they
    // were assigned is in lorassign:<id>, which only admins write.
    if (value.length > 300000) return "The drafts are too large to save";
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return "Invalid record";
    await kv.put(key, value); return null;
  }
  if (key === `sessions:${id}`) {
    // Practice Sessions (js/ft-sessions.js): the trainee's own runs, answers and automated checks. The trainer's
    // reviews are in labreview:<id>, which only admins write.
    if (value.length > 400000) return "The sessions record is too large to save";
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return "Invalid record";
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
// A per-minute limit rests the key for a minute; a daily limit for an hour; a rejected key for 10 minutes; a key out of
// credits or with billing off for an hour on every model (the next key may have them).
// (Google's ordinary rate-limit message says "check your plan and billing details": that alone is only a rate limit.)
const GEMINI_NO_CREDITS = /credit|prepa(?:y|id)|payment|insufficient|spend(?:ing)?[ _-]?(?:cap|limit)|free tier|enable billing|billing (?:account|is (?:not |in)?active|is disabled|disabled|not enabled)/i;
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

/* Gemini refuses some regions ("User location is not supported for the API use"). The Worker is placed in
   the US (wrangler.json), but placement is best-effort: a request can still run near the trainee. A refused
   call is sent again from GeminiRelay, a Durable Object pinned to western North America, and that Worker
   instance keeps using the relay from then on. */
let geminiViaRelay = false;
async function geminiFetch(env, url, init) {
  const viaRelay = () => {
    const ns = env.GEMINI_RELAY, id = ns.idFromName("gemini-relay-" + Math.floor(Math.random() * 4));
    return ns.get(id, { locationHint: "wnam" }).fetch("https://relay/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, headers: init.headers, body: init.body })
    });
  };
  if (geminiViaRelay && env.GEMINI_RELAY) return viaRelay();
  const r = await fetch(url, init);
  if (r.status !== 400 || !env.GEMINI_RELAY) return r;
  const text = await r.text();
  if (!/location is not supported/i.test(text)) return new Response(text, { status: r.status, headers: { "Content-Type": "application/json" } });
  geminiViaRelay = true;
  return viaRelay();
}
export class GeminiRelay {
  constructor(state, env) {}
  async fetch(request) {
    const { url, headers, body } = await request.json();
    if (!/^https:\/\/generativelanguage\.googleapis\.com\//.test(String(url))) return new Response("Not allowed", { status: 403 });
    const r = await fetch(url, { method: "POST", headers, body });
    return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
  }
}

// The shared AI gateway (the Main Portal's /api/ai-gateway): when AI_GATEWAY_SECRET is set on this Worker, every AI call goes there
// and draws from the Portal's one master key pool and one shared budget (module "standard") with the other programs, the CMS and the
// Portal's simulators. Without the secret this Worker still uses its own GEMINI_API_KEY pool, as before.
const gatewayOn = (env) => !!String((env && env.AI_GATEWAY_SECRET) || "").trim();
async function viaGateway(env, req, user) {
  const toText = (c) => typeof c === "string" ? c : (Array.isArray(c) ? c.map((p) => p && p.text ? p.text : "").join("\n") : "");
  const messages = (req.messages || []).map((m) => ({ role: m.role === "assistant" ? "model" : "user", text: toText(m.content) }));
  let r, data = null;
  try {
    r = await fetch(String(env.PORTAL_URL || "https://cm-training-activity.pages.dev").replace(/\/+$/, "") + "/api/ai-gateway", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Gateway-Key": String(env.AI_GATEWAY_SECRET).trim() },
      body: JSON.stringify({ module: "standard", user: String(user || "worker").slice(0, 80), system: toText(req.system), messages, maxTokens: Math.min(Math.max(Number(req.max_tokens) || 1024, 128), 4096) })
    });
    data = await r.json().catch(() => null);
  } catch (e) { return json({ error: { message: "The shared AI gateway is unreachable: " + (e && e.message || e) } }, 502); }
  if (data && data.success) return json({ content: [{ type: "text", text: data.text }], model: data.model, stop_reason: "end_turn", provider: "gemini-gateway" });
  const status = r.status === 429 ? 429 : (r.status === 401 || r.status === 501) ? 502 : (r.status || 502);
  return json({ error: { message: (status === 429 ? "rate limit (shared AI budget): " : "") + ((data && data.error) || "AI gateway error " + r.status) } }, status);
}

async function callGemini(env, rawBody, user) {
  let req; try { req = JSON.parse(rawBody); } catch (e) { return json({ error: "Invalid request" }, 400); }
  if (gatewayOn(env)) return await viaGateway(env, req, user);
  // Keys in turn (see geminiKeyOrder): when a key's free-tier limit is used up (429), the key is
  // rejected, or it is out of credits or has billing off, it rests and the next key takes the request.
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
      const send = (body) => geminiFetch(env, `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(body)
      });
      let r, data;
      try {
        r = await send(p);
        data = await r.json().catch(() => ({}));
        if (r.status === 400 && /thinking/i.test((data.error && data.error.message) || "")) {   // model doesn't accept that setting → send without it
          delete p.generationConfig.thinkingConfig; r = await send(p); data = await r.json().catch(() => ({}));
        }
      } catch (e) { last = { status: 502, msg: "Gemini unreachable: " + (e && e.message || e) }; continue; }   // next key
      if (r.ok) {
        const cand = (data.candidates || [])[0] || {};
        const text = ((cand.content && cand.content.parts) || []).filter((x) => !x.thought).map((x) => x.text || "").join("");
        if (!text) { last = { status: 502, msg: `Gemini returned no text (${cand.finishReason || "blocked"})` }; break; }   // same prompt on another key won't help: next model
        return json({ content: [{ type: "text", text }], model, stop_reason: cand.finishReason === "MAX_TOKENS" ? "max_tokens" : "end_turn", provider: "gemini" });
      }
      const msg = (data.error && data.error.message) || `Gemini error ${r.status}`;
      last = { status: r.status, msg };
      if (r.status === 402 || (GEMINI_NO_CREDITS.test(msg) && [400, 403, 429].includes(r.status))) {   // out of credits or billing off: the next key
        geminiRest.set(name + "|*", Date.now() + 3600000);
        last = { status: 502, msg: "a Gemini key is out of credits or has billing off: " + msg };
        continue;
      }
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
// The voice in use: the facilitator's DNA (js/ft-facilitator-dna.js) until a trainer saves a voice (v2) in
// Admin → 🗣 Feedback Style; the page (js/ft-activities.js, fbEffective) resolves it the same way.
function facilitatorVoice(saved) {
  const dna = globalThis.FT_FACILITATOR_DNA;
  const st = saved && saved.v2 ? saved : (dna ? { enabled: true, guide: dna.guide, examples: dna.examples } : saved);
  if (!st || st.enabled === false || !st.guide) return "";
  const ex = (st.examples || []).slice(0, 3).map((x, i) => `(${i + 1}) ${String(x).slice(0, 900)}`).join("\n");
  return `\n\nVOICE: write the way this program's facilitator writes feedback. Keep the requested format and keep the judgement evidence-based; the voice changes wording only.\nFacilitator style guide:\n${String(st.guide).slice(0, 3500)}${ex ? `\nExamples of the facilitator's voice (match tone and phrasing; do not reuse their content):\n${ex}` : ""}`;
}
/* ---------- the tracker and the Monitoring Sheet kept in Google Drive (js/ft-drive.js) ----------
   The trainee saves their Google links (drive:<id>). The Worker reads each file's export (a sheet as CSV, a doc as text),
   which works when the file is shared "Anyone with the link can view", checks it with the same rules
   (TR.fromSheetCsv + TR.checkDay; TR.gradeMonitorText) and writes the result into trackerreview:<id> (days[D] for the
   tracker, monitor for the Monitoring Sheet), keeping the trainer's comment and score. */
async function fetchGoogle(url) {
  if (!url) throw new Error("link");
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  if (!res.ok || /^\s*<(!doctype|html)/i.test(text.slice(0, 200))) throw new Error("not-shared");
  return text;
}
const DRIVE_UNREADABLE = "The system can't open this file. In Google Drive, share it as “Anyone with the link can view”, and check that the link is the file's own link.";
async function checkDrive(env, id, D, o = {}) {
  const kv = kvOf(env);
  const drive = JSON.parse((await kv.get(`drive:${id}`)) || "null");
  if (!drive || (!drive.tracker && !drive.monitor)) return null;
  const rec = JSON.parse((await kv.get(`trainee:${id}`)) || "null");
  const rk = `trackerreview:${id}`, cur = JSON.parse((await kv.get(rk)) || "null") || { days: {} };
  if (!cur.days) cur.days = {};
  const at = new Date().toISOString(), voice = o.voice != null ? o.voice : facilitatorVoice(JSON.parse((await kv.get("settings:feedback-style")) || "null"));
  const out = { id };
  if (drive.tracker) {
    let res, review = "";
    try {
      const f = TR.googleFile(drive.tracker);
      if (f.kind !== "sheet") throw new Error("kind");
      const t = TR.fromSheetCsv(await fetchGoogle(f.exportUrl), { today: D, startDate: drive.startDate || "" });
      if (!t) throw new Error("layout");
      t.drive = drive;
      res = TR.checkDay(t, D);
      if (!res.na && o.ai !== false) {
        const p = TR.reviewPrompt(t, D, o.criteria || TR.DEFAULT_CRITERIA, rec && rec.name);
        try { review = await aiText(env, p.system + voice, p.prompt, 400); } catch (e) { review = ""; }
      }
    } catch (e) {
      const why = e.message === "layout" ? "The sheet has no tracker header row (Date Received, Type of Task, Task Details …): link the Daily Task Tracker tab."
        : e.message === "kind" ? "The Task Tracker link must be a Google Sheets link (docs.google.com/spreadsheets/…)." : DRIVE_UNREADABLE;
      res = { date: D, pass: false, pct: 0, flags: [], rules: [{ id: "sheet", label: "Your Task Tracker sheet can be read", pass: false, pct: 0, detail: why, flags: [] }] };
    }
    if (!res.na) {
      const prev = cur.days[D] || {};
      cur.days[D] = Object.assign({}, res, { source: "drive", review: review || prev.review || "", checkedAt: at, comment: prev.comment || "", commentAt: prev.commentAt || "", trainerScore: prev.trainerScore != null ? prev.trainerScore : null });
      out.tracker = cur.days[D].pct;
    }
  }
  if (drive.monitor && o.monitor !== false) {
    const prev = cur.monitor || {};
    let g, review = "", error = "";
    try {
      const f = TR.googleFile(drive.monitor);
      let text = await fetchGoogle(f.exportUrl);
      if (f.kind === "sheet") text = TR.parseCsv(text).map((r) => r.filter((c) => String(c).trim()).join(" ")).join("\n");
      const set = JSON.parse((await kv.get("settings:monitor")) || "null");
      const topics = (set && Array.isArray(set.topics) && set.topics.length ? set.topics : TR.MONITOR_TOPICS).map((t) => typeof t === "string" ? { title: t } : t);
      g = TR.gradeMonitorText(text, topics);
      if (o.ai !== false && g.found) {
        try {
          review = await aiText(env, "You are a training supervisor at Legal Support Help reviewing a trainee virtual assistant's Training Monitoring Sheet. Never mention that you are an AI." + voice,
            `Trainee: ${(rec && rec.name) || "Trainee"}\nThe sheet's entries (one per classroom discussion: the date, 5 major takeaways, 3 questions, and how well they understand it):\n${text.slice(0, 9000)}\n\nThe automated check found ${g.found} of ${g.total} discussions, ${g.pct}% complete.\nReview it: are the takeaways specific to each discussion and in complete sentences, are questions real, which entries are missing or incomplete (name them). At most 6 short bullet points, under 140 words. No greeting, no sign-off.`, 500);
        } catch (e) { review = ""; }
      }
    } catch (e) { error = e.message === "not-shared" || e.message === "link" ? DRIVE_UNREADABLE : "The Monitoring Sheet link must be a Google Docs or Google Sheets link."; }
    cur.monitor = Object.assign({}, g || { pct: 0, found: 0, total: 0, entries: [] }, { error, review: review || (error ? "" : prev.review || ""), checkedAt: at, comment: prev.comment || "", commentAt: prev.commentAt || "", trainerScore: prev.trainerScore != null ? prev.trainerScore : null });
    out.monitor = cur.monitor.pct;
  }
  cur.updatedAt = at;
  await kv.put(rk, JSON.stringify(cur));
  return out;
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
  // the trainees whose tracker and Monitoring Sheet are in Google Drive
  const driveKeys = o.id ? [`drive:${o.id}`] : await listAll(env, "drive:");
  for (const k of driveKeys) {
    const id = k.slice("drive:".length);
    const rec = JSON.parse((await kv.get(`trainee:${id}`)) || "null");
    if (!o.id && (!rec || rec.approved !== true || rec.archived)) continue;
    try { const r = await checkDrive(env, id, D, { criteria, voice }); if (r) done.push(Object.assign({ drive: true }, r)); } catch (e) { /* the next trainee */ }
  }
  return { date: D, checked: done.length, results: done };
}

/* ---------- 🕘 automatic Time In (js/attendance.js) ----------
   A trainee's course calls /api/checkin on their first visit each day (Eastern time). The first call records
   checkin:<YYYY-MM-DD>:<id> = {timeIn, at, name, batch, training}, with the same in its KV metadata
   ({t, at, n, b, tr}) so the LSH Training Portal reads a whole day from one key list; kept 40 days. Each
   trainee has their own key, so a room signing in at once never overwrites one another. The attendance
   tab shows it until a trainer sets a Time In, and the Google Sheet gets it through the portal. */
function etNow(d) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const g = (t) => (p.find((x) => x.type === t) || {}).value;
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}
async function checkIn(kv, id, training) {
  const now = new Date(), et = etNow(now), key = `checkin:${et.date}:${id}`;
  const had = JSON.parse((await kv.get(key)) || "null");
  if (had) return { ok: true, date: et.date, timeIn: had.timeIn, already: true };
  const rec = JSON.parse((await kv.get(`trainee:${id}`)) || "null");
  if (!rec || rec.approved !== true || rec.archived) return { ok: false, error: "Not an approved trainee" };
  const v = { timeIn: et.time, at: now.toISOString(), name: String(rec.name || id).slice(0, 80), batch: String(rec.batch || "").slice(0, 24), training: String(training || "").slice(0, 160) };
  await kv.put(key, JSON.stringify(v), { expirationTtl: 40 * 86400, metadata: { t: v.timeIn, at: v.at, n: v.name, b: v.batch, tr: v.training } });
  return { ok: true, date: et.date, timeIn: v.timeIn };
}

/* ---------- documents in R2 ---------- */
// The document-heavy folders (ft/, trainer/) are served from R2: the DOCUMENTS binding,
// bucket lshtraining, under courses/ft/ (uploaded by .github/workflows/r2-docs.yml on every push to main).
// wrangler.json's assets.run_worker_first sends these paths through the Worker. A file that isn't in R2
// (not uploaded yet, or no DOCUMENTS binding) still comes from the Worker's static assets, as before.
const R2_DOCS = "courses/ft";
const R2_DOC_DIRS = ["/ft/", "/trainer/"];
async function docFromR2(env, request, path) {
  if (!env.DOCUMENTS || (request.method !== "GET" && request.method !== "HEAD") || !R2_DOC_DIRS.some((d) => path.startsWith(d))) return null;
  try {
    const obj = await env.DOCUMENTS.get(R2_DOCS + decodeURIComponent(path), { onlyIf: request.headers, range: request.headers });
    if (!obj) return null;
    const h = new Headers();
    obj.writeHttpMetadata(h);
    h.set("ETag", obj.httpEtag);
    h.set("Accept-Ranges", "bytes");
    // The browser may keep a copy but re-checks it (a cheap 304), so an updated document shows at once.
    h.set("Cache-Control", "no-cache");
    if (!("body" in obj)) return new Response(null, { status: 304, headers: h });
    let status = 200;
    if (obj.range && request.headers.has("Range")) {
      const r = obj.range;
      const start = r.suffix !== undefined ? Math.max(0, obj.size - r.suffix) : r.offset || 0;
      const len = r.suffix !== undefined ? obj.size - start : r.length !== undefined ? r.length : obj.size - start;
      h.set("Content-Range", `bytes ${start}-${start + len - 1}/${obj.size}`);
      h.set("Content-Length", String(len));
      status = 206;
    } else h.set("Content-Length", String(obj.size));
    return new Response(request.method === "HEAD" ? null : obj.body, { status, headers: h });
  } catch (e) {
    return null; // R2 unavailable or a bad path: fall back to the static assets
  }
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
      const secure = !!adminPass(env);
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
        const deployment = (env.CF_VERSION_METADATA && env.CF_VERSION_METADATA.id) || "unknown";
        return new Response(`Portal build deployed: ${m ? m[1] : "unknown (old index.html — no build tag)"}\nDeployment: ${deployment}\nWorker: secure-mode worker.js\nSecure mode: ${adminPass(env) ? "ON" : "OFF"}\nAdmin password: ${adminPassStatus(env)}\nAI provider: ${hasGemini(env) ? "Google Gemini (chat starts on " + geminiModels(env, "chat")[0] + ", grading and trainer tools on " + geminiModels(env, "grading")[0] + ")" : "none — add GEMINI_API_KEY5"}\nAI key pool: ${[...GEMINI_POOL, ...GEMINI_SPARE].map((n) => `${n} ${env[n] ? (geminiKeyNames(env).includes(n) ? "set" : "set (same key as another)") : "not set"}${resting(n, "*") ? " (resting)" : ""}`).join(", ")}\n`, { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
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
        const res = (await docFromR2(env, request, path)) || (await env.ASSETS.fetch(request));
        const type = res.headers.get("Content-Type") || "";
        const h = new Headers(res.headers);
        if (!type.includes("text/html")) {
          // Scripts, styles and data: the browser may keep a copy but must re-check it (a cheap 304)
          // on every load, so a trainee never runs an old file even if its ?v= tag wasn't bumped.
          if (res.status === 200 || res.status === 304) h.set("Cache-Control", "no-cache");
          return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
        }
        // Never let browsers or the edge keep an old copy of the portal page.
        h.set("Cache-Control", "no-cache, no-store, must-revalidate");
        return new Response(res.body, { status: res.status, headers: h });
      }
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      if (!kv && path.startsWith("/api/storage")) return json({ error: "LSH_KV namespace is not bound on this Worker." }, 500);

      /* ---------- auth ---------- */
      if (path === "/api/auth/status") return json({ secure, portalOnly: portalOnly(env) });
      if (path === "/api/auth/admin") {
        if (!secure) return json({ error: "not-configured" }, 501);
        const { passphrase } = await request.json();
        await new Promise((r) => setTimeout(r, 400)); // slow down guessing
        const given = normPass(passphrase), want = normPass(adminPass(env));
        if (!given || !want || !safeEqual(given, want)) return json({ error: "Incorrect password" }, 401);
        return json({ token: await makeToken(env, "a", "admin", 12) });
      }
      // The trainee's session for a name + batch: their record id (new or legacy form) and token.
      const traineeSession = async (name, batch, id) => {
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
      };
      if (path === "/api/auth/trainee") {
        if (!secure) return json({ error: "not-configured" }, 501);
        const { name, batch, id } = await request.json();
        if (!name || !batch) return json({ error: "Name and batch are required" }, 400);
        if (portalOnly(env)) {
          // Trainees come in through the LSH Training Portal (/api/auth/portal). A name + batch typed here is
          // accepted only to renew the session of a trainee who is already signed in on this device.
          const own = await readTraineeTokenGrace(env, request);
          const { newId, legacyId } = candidateIds(name, batch);
          if (!own || (own.id !== newId && own.id !== legacyId)) return json({ error: "portal-required" }, 403);
        }
        return traineeSession(name, batch, id);
      }
      if (path === "/api/auth/portal") {
        // The Main Portal's sign-in: a signed ticket carries who the trainee is (their name and batch as registered there).
        if (!portalOnly(env)) return json({ error: "not-configured" }, 501);
        const { ticket } = await request.json().catch(() => ({}));
        const why = {};
        const who = await readPortalTicket(env, ticket, why);
        if (!who) return json({ error: why.r === "signature"
          ? "The LSH Training Portal couldn't be verified (code: bad-signature). Please tell your administrator: the Portal and this program need the same sign-in secret."
          : "This sign-in link has expired. Open the program again from the LSH Training Portal.", code: why.r || "format" }, 401);
        if (who.system) return json({ admin: true, token: await makeToken(env, "a", "admin", 12) });
        if (who.admin) return json({ error: "Administrators sign in with the admin password on every platform.", code: "admin-password" }, 403);
        const res = await traineeSession(who.name, who.batch, "");
        const out = await res.json();
        // The Portal's approval is the only trainee approval: a trainee it signs in is approved here too
        // (unless an admin here rejected them), so this program never shows "Registration Pending Approval".
        const cur = out.existing;
        if (!cur || (cur.approved !== true && !cur.rejected)) {
          const rec = Object.assign({}, cur || { id: out.id, name: who.name, firstName: who.first, lastName: who.last, batch: who.batch, registeredAt: new Date().toISOString() }, { approved: true });
          await kv.put(`trainee:${out.id}`, JSON.stringify(rec));
          out.existing = rec;
        }
        return json(Object.assign(out, { name: who.name, first: who.first, last: who.last, batch: who.batch }));
      }

      const tok = secure ? await readToken(env, request) : { role: "a", id: "open-mode" };
      if (!tok) return json({ error: "Sign-in required" }, 401);

      /* ---------- training tools open signed in (js/lsh-tool-links.js) ----------
         A fresh Portal-style ticket for the trainee signed in here, so the CMS (which takes the Portal's
         ticket, signed with the same PORTAL_SSO_SECRET) opens without its log-in page. Trainees only:
         an admin's ticket never signs anyone in. Good for 5 minutes. */
      if (path === "/api/auth/tool-ticket") {
        if (tok.role !== "t" || !portalSecret(env)) return json({ error: "not-available" }, tok.role !== "t" ? 403 : 501);
        const rec = JSON.parse((await kv.get(`trainee:${tok.id}`)) || "null");
        if (!rec || rec.approved !== true || rec.archived) return json({ error: "not-approved" }, 403);
        const words = String(rec.name || "").trim().split(/\s+/).filter(Boolean);
        const first = String(rec.firstName || words[0] || "").trim(), last = String(rec.lastName || words.slice(1).join(" ") || "").trim();
        if (!first || !last) return json({ error: "no-name" }, 400);
        const payload = btoa(String.fromCharCode(...enc.encode(JSON.stringify({ first, last, b: String(rec.batch || ""), exp: Date.now() + 5 * 60 * 1000 }))))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        return json({ ticket: `${payload}.${await hmac("portal-sso:" + portalSecret(env), payload)}` });
      }

      /* ---------- 🕘 automatic Time In: a trainee's first visit today (see checkIn) ---------- */
      if (path === "/api/checkin") {
        const b = await request.json().catch(() => ({}));
        const id = tok.role === "t" ? tok.id : (!secure && typeof b.id === "string" ? b.id.slice(0, 100) : "");
        if (!id) return json({ ok: false, error: "Trainees only" }, 403);
        return json(await checkIn(kvOf(env), id, b.training));
      }

      /* ---------- AI proxy (signed-in users only, so strangers can't spend your credits) ---------- */
      // (the path keeps its old name so pages already open in browsers keep working)
      if (path === "/api/claude" || path === "/api/ai") {
        const body = await request.text();
        if (!hasGemini(env) && !gatewayOn(env)) return json({ error: "No AI key is configured on this Worker. Add GEMINI_API_KEY5 as a Secret in Cloudflare." }, 500);
        return await callGemini(env, body, tok && tok.id);
      }

      /* ---------- Daily Task Tracker: run the daily check now (admin) ---------- */
      if (path === "/api/tracker/check") {
        if (tok.role !== "a") return json({ error: "Not allowed" }, 403);
        const b = await request.json().catch(() => ({}));
        return json(await runTrackerChecks(env, { id: b.id || null, date: b.date || null, force: true }));
      }

      /* ---------- the Drive tracker and Monitoring Sheet: check now (the trainee's own, at most every 3 minutes; an admin's for anyone) ---------- */
      if (path === "/api/drive/check") {
        const b = await request.json().catch(() => ({}));
        const id = tok.role === "a" ? String(b.id || "") : tok.id;
        if (!id) return json({ error: "Missing trainee" }, 400);
        if (tok.role !== "a") {
          const last = JSON.parse((await kv.get(`trackerreview:${id}`)) || "null");
          const t = last && last.selfCheckAt ? Date.parse(last.selfCheckAt) : 0;
          if (Date.now() - t < 3 * 60 * 1000) return json({ error: "Checked a moment ago. Try again in a few minutes.", code: "wait" }, 429);
        }
        const critRaw = await kv.get("settings:trackercriteria");
        const r = await checkDrive(env, id, b.date && /^\d{4}-\d\d-\d\d$/.test(b.date) ? b.date : TR.ptDate(), { criteria: (critRaw && (JSON.parse(critRaw).text || "").trim()) || TR.DEFAULT_CRITERIA });
        if (!r) return json({ error: "Save your Google Drive links first.", code: "no-links" }, 400);
        if (tok.role !== "a") { const cur = JSON.parse((await kv.get(`trackerreview:${id}`)) || "{}"); cur.selfCheckAt = new Date().toISOString(); await kv.put(`trackerreview:${id}`, JSON.stringify(cur)); }
        return json({ ok: true, result: r, review: JSON.parse((await kv.get(`trackerreview:${id}`)) || "null") });
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
      if (path === "/api/storage/get-many") {
        // Several records in one request (the Trainee Audit, attendance, a trainee's tasks for every
        // lesson): every Worker request counts toward the Cloudflare account's request allowance, shared
        // by every LSH site, so lists aren't fetched one request per record. The same rule as /get for
        // each key (keys as the page sends them; kv adds the "ft:" prefix); a key this user may not
        // read is left out.
        const keys = Array.isArray(body.keys) ? body.keys.map((k) => String(k || "")) : [];
        if (!keys.length || keys.length > 100) return json({ error: "Send 1 to 100 keys" }, 400);
        const values = {};
        await Promise.all(keys.map(async (k) => { if (k && canRead(tok, k)) values[k] = await kv.get(k); }));
        return json({ values });
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
