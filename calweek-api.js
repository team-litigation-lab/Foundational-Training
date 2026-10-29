/* ============================================================
   📅 Standard Training - Calendaring Activity: the Worker's controller (/api/calweek/*).
   Its own routes, its own record and its own webhook, so the activity runs apart from every other calendar on the
   platform: it never reads or writes calsim:<id> (the Calendaring Simulators), calrules:<id> (the Booking Rule Check)
   or anything on the Main Portal, and they never touch calweek:<id>. worker.js only hands it the request once the
   caller is signed in (handleCalWeek returns null for any other path).
     POST /api/calweek/now    the server's clock (UTC ms) and the week it resolves to: {now, tz, current, next}
     POST /api/calweek/get    a trainee's record, placed on the calendar against the server's clock
     POST /api/calweek/save   {events, submit?}: the trainee's bookings, kept as offsets (never dates), reviewed here
     POST /api/calweek/list   admins: every trainee's record, for Admin → 🛠 Practice Lab → 📅 Calendaring Activity
   Who: a trainee reads and writes only their own record; an admin (and the open mode the local tests run in) names
   the trainee with {id}. Nothing else may write calweek:<id>: it is not one of a trainee's storage keys (worker.js OWN),
   so /api/storage/set refuses it and only this controller's checks ever apply.
   Record calweek:<id> {v, activity, events:[{task, title, w, d, m, dur, desc, meet, remind, color}], anchor, savedAt,
   submittedAt?, pct, done}. `anchor` is the Monday the bookings resolved to when saved; it is history only, since every
   read re-resolves the offsets against the server's clock (the next work week, from Date.now()).
   Webhook (optional): with CALWEEK_WEBHOOK_URL set, every save POSTs {type: "calweek.saved" | "calweek.submitted",
   trainee, at, anchor, pct, done} there in the background (ctx.waitUntil), signed X-LSH-Signature: sha256=<hex HMAC of
   the body with CALWEEK_WEBHOOK_SECRET>. A webhook that fails or is slow never fails the save.
   ============================================================ */
import "./js/ft-calweek-core.js";
const Core = globalThis.FTCalWeekCore;

const KEY = (id) => `calweek:${id}`;
const VERSION = 1;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// the clock and its weeks, as the page shows them
function clock(now) {
  return { now, tz: Core.TZ, current: Core.currentWeek(now), next: Core.nextWeek(now) };
}
// a record as the page reads it: the offsets placed on next week's real dates, and the review
function view(rec, now) {
  const events = rec ? Core.clean(rec.events) : [];
  return Object.assign(clock(now), { record: rec || null, placed: Core.placed(events, now), review: Core.review(events) });
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
  if (!path.startsWith("/api/calweek/")) return null;
  if (request.method !== "POST") return json({ error: "POST only" }, 405);
  if (!kv && path !== "/api/calweek/now") return json({ error: "LSH_KV namespace is not bound on this Worker." }, 500);
  const body = await request.json().catch(() => ({}));
  const now = Date.now();
  const read = async (id) => { const raw = await kv.get(KEY(id)); try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };

  if (path === "/api/calweek/now") return json(clock(now));

  if (path === "/api/calweek/get") {
    const id = whose(tok, body); if (!id) return json({ error: "Name the trainee (id)" }, 400);
    return json(view(await read(id), now));
  }

  if (path === "/api/calweek/save") {
    const id = whose(tok, body); if (!id) return json({ error: "Name the trainee (id)" }, 400);
    if (!Array.isArray(body.events)) return json({ error: "Send the bookings (events)" }, 400);
    const prev = await read(id);
    const events = Core.clean(body.events), rv = Core.review(events), at = new Date(now).toISOString();
    const rec = { v: VERSION, activity: Core.WEEK.id, events, anchor: Core.nextWeek(now).monday, savedAt: at,
      submittedAt: body.submit ? at : (prev && prev.submittedAt) || null, pct: rv.pct, done: rv.done };
    await kv.put(KEY(id), JSON.stringify(rec));
    const event = { type: body.submit ? "calweek.submitted" : "calweek.saved", trainee: id, at, anchor: rec.anchor, pct: rv.pct, done: rv.done };
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(webhook(env, event)); else await webhook(env, event);
    return json(view(rec, now));
  }

  if (path === "/api/calweek/list") {
    if (tok.role !== "a") return json({ error: "Not allowed" }, 403);
    const ids = (Array.isArray(body.ids) ? body.ids : []).map((x) => String(x || "").trim().toLowerCase()).filter((x) => ID_RE.test(x)).slice(0, 300);
    const rows = await Promise.all(ids.map(async (tid) => { const rec = await read(tid); return { id: tid, record: rec, review: rec ? Core.review(rec.events) : null }; }));
    return json(Object.assign(clock(now), { rows }));
  }
  return json({ error: "Unknown endpoint" }, 404);
}
