/* ============================================================
   📅 Standard Training - Calendaring Activity and 🧪 its VA Practice Only clone: the Worker's controller.
   Their own routes, their own records and (the activity only) their own webhook, so both run apart from every other
   calendar on the platform: they never read or write calsim:<id> (the Calendaring Simulators), calrules:<id> (the
   Booking Rule Check) or anything on the Main Portal, and those never touch these records. The two calendars are kept
   apart from each other too: each route set reads and writes only its own record, on its own frozen week
   (js/ft-calweek-core.js WEEK / PRACTICE). worker.js only hands the request over once the caller is signed in
   (handleCalWeek returns null for any other path).
     /api/calweek/*      the activity (calweek:<id>, Week 1 · Attorney Rivera): now, get, save {events, submit?}, list (admins)
     /api/calpractice/*  VA Practice Only (calpractice:<id>, Week 2 · Attorney Chen): now, get, save {events}, reset.
                         Practice is never graded or sent: no submit, no webhook, no trainer list.
       POST …/now    the server's clock (UTC ms) and the week it resolves to: {now, tz, current, next}
       POST …/get    a trainee's record, placed on the calendar against the server's clock
       POST …/save   the trainee's bookings, kept as offsets (never dates), cleaned, snapped and checked here
       POST …/list   admins (the activity only): every trainee's record, for Admin → 🛠 Practice Lab → 📅 Calendaring Activity
       POST …/reset  practice only: the trainee's practice calendar wiped, to start over
   Who: a trainee reads and writes only their own record; an admin (and the open mode the local tests run in) names
   the trainee with {id}. Nothing else may write these records: they are not trainee storage keys (worker.js OWN),
   so /api/storage/set refuses them and only this controller's checks ever apply.
   Record {v, activity, events:[{task, title, w, d, m, dur, desc, meet, remind, color}], anchor, savedAt, submittedAt?,
   pct, done}. `anchor` is the Monday the bookings resolved to when saved; it is history only, since every read
   re-resolves the offsets against the server's clock (the next work week, from Date.now()).
   Webhook (optional, the activity only): with CALWEEK_WEBHOOK_URL set, every save POSTs {type: "calweek.saved" |
   "calweek.submitted", trainee, at, anchor, pct, done} there in the background (ctx.waitUntil), signed X-LSH-Signature:
   sha256=<hex HMAC of the body with CALWEEK_WEBHOOK_SECRET>. A webhook that fails or is slow never fails the save.
   ============================================================ */
import "./js/ft-calweek-core.js";
const Core = globalThis.FTCalWeekCore;

const VERSION = 1;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
// the two calendars: their routes, records, weeks and what each may do
const CALS = [
  { base: "/api/calweek/", key: "calweek", week: Core.WEEK, submit: true, webhook: true, list: true, reset: false },
  { base: "/api/calpractice/", key: "calpractice", week: Core.PRACTICE, submit: false, webhook: false, list: false, reset: true }
];

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// the clock and its weeks, as the page shows them
function clock(now) {
  return { now, tz: Core.TZ, current: Core.currentWeek(now), next: Core.nextWeek(now) };
}
// a record as the page reads it: the offsets placed on next week's real dates, and the review
function view(cal, rec, now) {
  const events = rec ? Core.clean(rec.events, cal.week) : [];
  return Object.assign(clock(now), { record: rec || null, placed: Core.placed(events, now, null, cal.week), review: Core.review(events, cal.week) });
}

async function sign(secret, body) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function webhook(env, event) {
  const url = String(env.CALWEEK_WEBHOOK_URL || "").trim();
  if (!/^https:\/\//i.test(url)) return;
  const body = JSON.stringify(event), headers = { "Content-Type": "application/json", "X-LSH-Event": event.type };
  if (env.CALWEEK_WEBHOOK_SECRET) headers["X-LSH-Signature"] = "sha256=" + await sign(String(env.CALWEEK_WEBHOOK_SECRET), body);
  try { await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) }); } catch (e) { /* never fails the save */ }
}

// whose record: a trainee's own; an admin's (or open mode's) {id}
function whose(tok, body) {
  if (tok.role === "t") return tok.id;
  const id = String((body && body.id) || "").trim().toLowerCase();
  return ID_RE.test(id) ? id : "";
}

export async function handleCalWeek(path, request, env, ctx, tok, kv) {
  const cal = CALS.find((c) => path.startsWith(c.base));
  if (!cal) return null;
  const op = path.slice(cal.base.length);
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  if (!kv && op !== "now") return json({ error: "LSH_KV namespace is not bound on this Worker." }, 500);
  const body = await request.json().catch(() => ({}));
  const now = Date.now();
  const KEY = (id) => `${cal.key}:${id}`;
  const read = async (id) => { const raw = await kv.get(KEY(id)); try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };

  if (op === "now") return json(clock(now));

  if (op === "get") {
    const id = whose(tok, body); if (!id) return json({ error: "Name the trainee (id)" }, 400);
    return json(view(cal, await read(id), now));
  }

  if (op === "save") {
    const id = whose(tok, body); if (!id) return json({ error: "Name the trainee (id)" }, 400);
    if (!Array.isArray(body.events)) return json({ error: "Send the bookings (events)" }, 400);
    if (body.submit && !cal.submit) return json({ error: "Practice only: nothing here is sent to the trainer" }, 400);
    const prev = await read(id);
    const events = Core.clean(body.events, cal.week), rv = Core.review(events, cal.week), at = new Date(now).toISOString();
    const rec = { v: VERSION, activity: cal.week.id, events, anchor: Core.nextWeek(now).monday, savedAt: at,
      submittedAt: body.submit ? at : (prev && prev.submittedAt) || null, pct: rv.pct, done: rv.done };
    await kv.put(KEY(id), JSON.stringify(rec));
    if (cal.webhook) {
      const event = { type: body.submit ? "calweek.submitted" : "calweek.saved", trainee: id, at, anchor: rec.anchor, pct: rv.pct, done: rv.done };
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(webhook(env, event)); else await webhook(env, event);
    }
    return json(view(cal, rec, now));
  }

  if (op === "reset" && cal.reset) {
    const id = whose(tok, body); if (!id) return json({ error: "Name the trainee (id)" }, 400);
    await kv.delete(KEY(id));
    return json(view(cal, null, now));
  }

  if (op === "list" && cal.list) {
    if (tok.role !== "a") return json({ error: "Not allowed" }, 403);
    const ids = (Array.isArray(body.ids) ? body.ids : []).map((x) => String(x || "").trim().toLowerCase()).filter((x) => ID_RE.test(x)).slice(0, 300);
    const rows = await Promise.all(ids.map(async (tid) => { const rec = await read(tid); return { id: tid, record: rec, review: rec ? Core.review(rec.events, cal.week) : null }; }));
    return json(Object.assign(clock(now), { rows }));
  }
  return json({ error: "Unknown endpoint" }, 404);
}
