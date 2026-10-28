# AI Capacity Plan (free tier only): no mid-session token exhaustion for live cohorts

**Scope:** every AI call the LSH training stack makes during a live cohort of ~20 trainees: the call and chat simulators, the practice labs, the CMS activity evaluations, the transcript auto-grading and the trainer tools.

**Constraint: free tiers only.** There are no paid provider tiers, no prepay and no second paid vendor. The plan uses:
- the **Gemini API free tier** (what runs today);
- **Cloudflare Workers AI's free daily allocation**;
- **Cloudflare primitives** this Worker already uses (Durable Objects, KV, cron).

**Goal:** within that ceiling, a cohort never hits a 429 *in the middle of a session*. If the day's free capacity can't cover a session, the session doesn't start: the platform says so before the trainee begins, and offers the non-AI version.

**Status:** this is the plan only. No code changes ship with this document. Each phase in §9 is a separate, small PR.

**Update: prepaid Claude credits for the call simulators.** There is **$100 of prepaid Claude API credit**. It is spent **only on the call simulators' live turns**, on **Claude Haiku 5.5** (`claude-haiku-5-5`): the fast, low-cost model, at $0.10 per million input tokens and $0.50 per million output tokens. That's about $0.0004 per turn (3,000 tokens in, 100 out).
- **What this changes for the call simulators:** Claude becomes Route 1, and the free Gemini and Workers AI pools become their fallbacks (§7.1).
- **What it frees up:** most of the free Gemini quota, for grading and everything else.
- **How long it lasts:** a 20-trainee cohort's call simulators cost well under $1 a day, so the credit lasts months, not days.
- **Shipped separately:** the Worker change is PR #308. It routes `feature: "call"` to Claude first and falls back to Gemini on any Claude failure, including running out of credit.
- **No Claude for anything else:** grading and the other features stay on the free tiers.

---

## 0. Summary

Free capacity is fixed, so the plan works on four levers:
- **Spend fewer tokens and fewer requests:** cap the context, pre-generate what can be pre-generated, and check grading with rules before calling the AI.
- **Pace the day:** don't let the morning use up the afternoon's quota.
- **Reserve before starting:** a session reserves its whole turn budget up front, so once a session starts it can always finish.
- **Add a second free pool:** Workers AI takes overflow and background work.

| # | Change | Fixes | Cost |
|---|---|---|---|
| 1 | **Stop retry amplification.** A chat turn can become dozens of upstream calls (§1.2), and all of them use free quota. | 429 storms that feed on themselves; wasted daily quota | $0 |
| 2 | **Cap the simulator context, with no LLM summaries.** Frozen system prompt + pinned opening + last 6 messages, a hard 2,400-token input cap and minimal thinking. | Context snowball, TPM spikes, extra summary calls | $0 |
| 3 | **Cut request count.** Pre-generated caller openings, scripted wrap-ups, a rule-based pre-check, one grading call per session, a KV cache for repeatable prompts. | Daily request quota (RPD), the real wall | $0 |
| 4 | **Pace the day and reserve per session.** A Durable Object holds the day's budget, spreads it across shift hours, and **reserves each session's turns before it starts**. | Running out mid-session in the afternoon | $0 |
| 5 | **Second free pool: Workers AI.** A Llama 3.1 8B model as the live-chat overflow, and for all background work. | Peak-minute RPM; a reserve when Gemini is exhausted | $0 (10,000 Neurons/day free) |
| 6 | **One shared limiter with circuit breakers.** Instead of each Worker isolate keeping its own memory of exhausted keys. | Isolates hitting keys another isolate already knows are exhausted | $0 |
| 7 | **Defer grading.** Trainees get an instant rule-based checklist at once; the AI narrative feedback comes from a queue when budget allows, overnight at the latest. | Grading bursts competing with live sessions | $0 |

---

## 1. Where the 429s come from today

### 1.1 How the stack makes AI calls today (from the code)

| Fact | Where |
|---|---|
| Every AI feature goes through `POST /api/claude` (alias `/api/ai`) to `callGemini()`. | `worker.js` |
| The keys are a pool of **free-tier** Gemini keys: `GEMINI_API_KEY5…9`, with `GEMINI_API_KEY`, `GEMINI_API_KEY1` and `GEMINI_API_KEY2` as spares. | `worker.js` (`GEMINI_POOL`) |
| Model ladder: chat starts on `gemini-3.5-flash-lite`; grading and trainer tools start on Flash, then fall back to Flash-Lite. The code's own notes put free-tier Flash-Lite at about 15 RPM / 500 RPD, and Flash at about 5 RPM / 20 RPD **per project**. | `geminiModels()` and its comments |
| **A key's "resting" state lives in an in-memory `Map` inside each Worker isolate.** Other isolates don't see it. | `geminiRest` |
| The client retries 429/5xx up to 3 more times (2.5 s, 6 s and 12 s). | `index.html` → `callAIText` |
| Each simulator turn sends the **full client dossier (≈1,400 tokens) plus the entire transcript so far** in one user message. Simulator openings are also AI calls. | `index.html` → `rpSendMessage` and the other sims |
| Chat asks for `max_tokens: 200`, but the Worker sends `maxOutputTokens = max(2×200, 2048)` with `thinkingLevel: "low"`, so thinking tokens are spent on every chat line. | `callGemini()` |

### 1.2 Failure mechanics

1. **Daily quota (RPD) is the hard wall.** Free-tier limits are per Google Cloud project, and Flash in particular has a very small daily allowance. Once the morning uses a project's allowance, every model on it returns 429 until midnight Pacific time.
2. **Retry amplification burns quota.** One chat turn on a busy pool can become, in the worst case, about 128 upstream calls:
   - the client sends the request 4 times (1 + 3 retries);
   - the Worker tries up to 8 keys × 4 models each time;
   - a new isolate starts from scratch, because the "resting" list is per isolate.

   Rate-limited calls still count against the per-minute limits, so the storm feeds itself.
3. **Context snowball.** Input per turn grows by about 60–80 tokens per message. Late turns cost about three times as much as early ones.
4. **Grading competes with live chat.** About 20 grading calls arrive in the same minute when trainees finish a simulator together.

### 1.3 Free-tier rules that shape this plan

- **Don't add projects to raise the limit.** Google's API terms say you *"will not attempt to circumvent"* documented usage limits, and that you need *"Google's express consent"* to go beyond them ([developers.google.com/terms](https://developers.google.com/terms), §2d).
  - Creating extra free projects for the sole purpose of getting more free quota risks the keys being suspended, which would be a full outage.
  - So **this plan is sized to work with one Gemini project (§2, Scenario A)**. Any extra existing projects are treated as a bonus, never as planned capacity.
- **No personal data in prompts.** The Gemini terms say Google uses Unpaid Services content *"to provide, improve, and develop"* its products, that *"human reviewers may read"* it, and *"Do not submit sensitive, confidential, or personal information to the Unpaid Services."*
  - Prompts must use **"Trainee"**, never a trainee's name, email or batch ID.
  - The training dossiers are fictional, which is fine.
- **Region:** the free tier isn't available everywhere. The existing `GeminiRelay` (pinned to western North America) handles "location not supported".
- **Reset times:**
  - Gemini RPD resets at **midnight Pacific** (03:00 US Eastern).
  - Workers AI resets at **00:00 UTC** (19:00–20:00 US Eastern).
  - Both reset outside the 08:00–17:00 Eastern shift, so **each shift lives inside one daily budget of each**.

---

## 2. Free capacity versus demand

### 2.1 Supply per day

Check the per-model numbers in [AI Studio → Rate limits](https://aistudio.google.com/rate-limit); the Gemini figures below are the code's own working assumptions.

| Pool | RPM | Requests / day | Notes |
|---|---|---|---|
| Gemini free, `gemini-3.5-flash-lite`, **per project** | ~15 | ~500 | Live chat and grading |
| Gemini free, Flash models, per project | ~5 | ~20 | Too small to plan on; trainer tools only |
| **Workers AI** free, `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | 300 (text generation default) | **~600 turns** | 10,000 Neurons/day; at 4,119 Neurons/M input and 34,868/M output, a 2,400-in / 100-out turn costs ~13.4 Neurons |
| KV response cache | — | unlimited reuse | Repeatable prompts (trainer tools, fixed rubrics on fixed answers) |
| **Claude API, prepaid $100** (call simulators only) | Start tier: 1,000 RPM per model class (new orgs may begin lower) | not a daily limit: **≈ 250,000 turns of credit** at ~$0.0004 each | Spent only by `feature: "call"`; on "credit balance too low" every turn falls back to Gemini |

### 2.2 Demand after the reductions in §3

| Workload | Before | After | Requests / day (20 trainees) |
|---|---|---|---|
| Simulator turns | up to ~40 msgs/session, 6 sessions/day | **12 trainee turns per session** (then a scripted wrap-up), **N sessions per trainee per day** (§2.3) | 12 × N × 20 |
| Simulator openings | 1 AI call per session | **0**: pre-generated, served from KV | 0 |
| Rolling summaries | (would be 1 per 6 msgs) | **0**: deterministic pinning (§3.1) | 0 |
| Grading | ~1 per session + per-sheet calls | **1 call per session**, after a rule-based pre-check; can wait until budget allows | 1 × N × 20 |
| Tracker / notes review | cron | Workers AI, nightly | 0 Gemini |
| Trainer tools | ad hoc | Flash first, KV cache | < 20 |

### 2.3 Sessions per trainee per day (the number to plan the cohort around)

daily live budget = (Gemini Flash-Lite RPD × projects + Workers AI turns) × 0.9 safety − grading − trainer tools

| Scenario | Supply (turns/day) | Grading (1/session) | Simulator sessions per trainee per day (12 turns each) |
|---|---|---|---|
| **A: one Gemini project + Workers AI** (planned) | 500 + 600 = 1,100 → 990 at 0.9 | 20·N | **N = 3** (720 turns + 60 grading = 780; 210 spare for pacing error) |
| B: today's 5 pool projects, if each is a legitimate separate project | 2,500 + 600 = 3,100 → 2,790 | 20·N | N = 9 (cap at 6 for headroom) |

**With the Claude credits:** the call simulators' turns (12 × N × 20) move off Gemini and Workers AI. In Scenario A, the free pools then carry only grading, other chat and background work. **The cap on AI simulator sessions per trainee is then set by the trainers, not by quota**, for as long as the credit lasts. The pacing and reservations in §4 still apply to the free pools. They're also the safety net if the credit runs out mid-cohort: set a monthly spend limit in the Claude Console, so running out is a planned event rather than a surprise.

**Peak-minute check (Scenario A):**
- Gemini gives ~15 RPM. At peak, 20 trainees send 1 turn every ~15 s, which is 80 RPM.
- **Workers AI's 300 RPM covers the overflow:** the router sends live turns there whenever Gemini's minute bucket is empty.
- Daily Neurons, not RPM, are the binding limit, and the session reservation (§4) accounts for them.

**Stagger the cohort:** split the 20 trainees into **two groups of 10**, so that one group is in an AI simulator while the other does a non-AI activity (reading, Knowledge Check, scripted sim). This halves the peak RPM, at no cost.

---

## 3. Spend fewer tokens and fewer requests

### 3.1 Token budget per simulator request (no LLM summaries)

On the free tier, every summary is an extra request out of the daily quota. So the memory is **deterministic**:
- **Pin the opening exchange:** the first 2 messages, where the caller states the issue.
- **Keep the last 6 messages.**
- **Cap everything** at 2,400 tokens.

| Segment | Content | Budget (tokens) |
|---|---|---|
| **S: frozen system prompt** | Persona rules, a **compressed scenario card** (not the full ≈1,400-token dossier: only the dossier sections this scenario uses), output rules. Byte-identical for the whole session, and always first. | ≤ 1,000 |
| **P: pinned opening** | Messages 1–2, each clipped to 150 tokens | ≤ 300 |
| **W: verbatim window** | The last 6 messages, each clipped to 120 tokens | ≤ 720 |
| **U: the new trainee message** | Clipped to 200 tokens | ≤ 200 |
| **Hard input cap** | S + P + W + U | **≤ 2,400** |
| **Output** | 1–3 sentences in character | Gemini `maxOutputTokens: 200`, **thinking minimal**; Workers AI `max_tokens: 160` |
| **Session cap** | After 12 trainee turns the caller wraps up with a **scripted closing line** (no AI call), and the session goes to grading. | 12 turns |

The rules for the window:
- **Pruning order when over the cap:**
  1. Drop window messages from the oldest, down to 3.
  2. Clip P to 80 tokens per message.
  3. Clip U.
  4. S is never truncated. It has to fit by construction, which a build-time check enforces.
- **Token estimate:** ceil(chars / 3.5), which is conservative for English.

### 3.2 Request-count reductions

| Change | Saves | How |
|---|---|---|
| **Pre-generated openings** | 1 call per session | For each scenario × persona, generate 5 caller openings **nightly** with leftover quota (cron, after the Gemini reset at 03:00 Eastern). Store them in KV at `simopen:<scenario>:<persona>`, and serve one at random. |
| **Scripted wrap-up** | 1 call per session | A fixed closing line per persona at turn 12. |
| **Scripted holding line instead of a retry** | Retry storms | When no route has capacity: "Sorry, you cut out. Could you say that again?" with no AI call. The trainee's next message is a fresh turn. |
| **Rule-based pre-check before grading** | Grading tokens; an instant result | Deterministic checks (required phrases, greeting, confirming name/date of birth, empathy markers, word count) give an **instant checklist**. The AI call only writes the narrative feedback and the rubric judgement, from a short transcript. |
| **One grading call per session** | Several calls | All rubric criteria in one JSON response; Process-Question sheets graded in one call per sheet, not per answer. |
| **KV response cache** | Repeats | Key = SHA-256 of (model, system, messages). For trainer tools and identical-answer grading only, **never for chat**. TTL 30 days. |
| **Workers AI for background** | Gemini RPD | Tracker notes review, nightly checks and opening pre-generation (if Gemini is short) all run on Workers AI. |

### 3.3 Code: deterministic window and pruning

```js
// Context builder for a simulator turn on the free tier: frozen system + pinned opening + last 6 messages, hard-capped.
// No summary calls: every LLM request counts against the free daily quota.
const B = { system: 1000, pin: 150, pinMin: 80, msg: 120, user: 200, cap: 2400, window: 6, minWindow: 3, maxTurns: 12 };
const tok = (s) => Math.ceil(String(s || "").length / 3.5);
const clip = (s, t) => { const n = (t * 3.5) | 0; s = String(s || ""); return s.length <= n ? s : s.slice(0, n - 1) + "…"; };

/** session = { system, history: [{role:"user"|"assistant", text}], turns } → { system, messages } | { wrapUp: true } */
function buildChatContext(session, userText) {
  if (session.turns >= B.maxTurns) return { wrapUp: true };                  // scripted closing line, no AI call
  if (tok(session.system) > B.system) throw new Error("scenario card over budget: fix it at build time");
  const h = session.history;
  let pinned = h.slice(0, 2).map((m) => ({ ...m, text: clip(m.text, B.pin) }));
  let windowMsgs = h.slice(Math.max(2, h.length - B.window)).map((m) => ({ ...m, text: clip(m.text, B.msg) }));
  const user = { role: "user", text: clip(userText, B.user) };
  const total = () => tok(session.system) + [...pinned, ...windowMsgs, user].reduce((n, m) => n + tok(m.text), 0);
  while (total() > B.cap && windowMsgs.length > B.minWindow) windowMsgs.shift();
  if (total() > B.cap) pinned = pinned.map((m) => ({ ...m, text: clip(m.text, B.pinMin) }));
  const gap = h.length > 2 + windowMsgs.length ? [{ role: "user", text: "[…the call continued…]" }] : [];
  return { system: session.system, messages: mergeSameRole([...pinned, ...gap, ...windowMsgs, user]) };
}
function mergeSameRole(list) {
  return list.reduce((out, m) => { const l = out[out.length - 1]; if (l && l.role === m.role) l.text += "\n" + m.text; else out.push({ ...m }); return out; }, []);
}
```

Prompt hygiene:
- **The system prompt goes in `systemInstruction`, not in the user message.** Gemini can then reuse the stable prefix (implicit caching), and the prompt is clean.
- **No personal data:** use "Trainee", never a name or an ID.
- **No volatile values in the system prompt:** no timestamps, no turn counters.

---

## 4. Pace the day and reserve per session (the core of "no mid-session exhaustion")

### 4.1 Rules

- **Daily budget:** one `DailyBudget` Durable Object per pool keeps the day's **budget** (from §2.1 × 0.9), the **used** count, and the open **reservations**. The pools are Gemini Flash-Lite and Workers AI Neurons.
- **Pacing:**
  - The shift runs 08:00–17:00 Eastern, 9 hours.
  - The amount *available* by time *t* is `budget × (elapsed shift fraction) + 15% burst`.
  - Live traffic that's ahead of pace is routed to Workers AI, and keeps going to Workers AI until Gemini's usage is back under pace.
- **Admission and reservation:**
  - **Starting** an AI simulator calls `POST /api/ai/session/start`. That reserves 12 turns, plus 1 grading call, from the combined pools.
  - **If the reservation can't be made,** the session doesn't start. The page offers **"AI practice is full for now: try the scripted version, or the next slot at HH:MM"** (the next time the pace allows it).
  - **A session that started can always finish:** each turn draws from its own reservation.
  - **Unused turns go back** at session end, or automatically after 30 minutes idle.
- **Grading reserve:** 10% of the day's budget is held back for grading. Grading that doesn't fit runs overnight after the Gemini reset, so feedback is ready the next morning.

### 4.2 Code: `DailyBudget` Durable Object (pacing + reservations)

```js
// One instance per pool: env.DAILY_BUDGET.idFromName("gemini-fl") / ("workers-ai").
// Strongly consistent across every Worker isolate; all state in DO storage (no KV writes).
export class DailyBudget {
  constructor(state, env) { this.state = state; }
  async get() {
    const s = (await this.state.storage.get("s")) || null;
    const day = dayKey(this.pool);
    return s && s.day === day ? s : { day, used: 0, reserved: {}, };
  }
  async fetch(request) {
    const { op, pool, budget, sessionId, units, now = Date.now() } = await request.json();
    this.pool = pool;
    const s = await this.get();
    const reservedTotal = Object.values(s.reserved).reduce((n, r) => n + r.left, 0);
    const paced = budget * Math.min(1, shiftFraction(now) + 0.15);          // what may be used by now
    const free = Math.min(budget, paced) - s.used - reservedTotal;
    let out;
    if (op === "reserve") {                       // session start: take N units or refuse
      out = free >= units ? (s.reserved[sessionId] = { left: units, at: now }, { ok: true }) : { ok: false, free, nextAt: nextSlot(budget, s, units, now) };
    } else if (op === "draw") {                   // one turn: from the session's reservation, else from the free pool
      const r = s.reserved[sessionId];
      if (r && r.left > 0) { r.left -= units; s.used += units; out = { ok: true, from: "reservation" }; }
      else if (free >= units) { s.used += units; out = { ok: true, from: "pool" }; }
      else out = { ok: false, free };
    } else if (op === "release") {                // session end or idle sweep: return what's left
      delete s.reserved[sessionId]; out = { ok: true };
    } else if (op === "status") out = { ...s, free, paced };
    // expire reservations idle for 30 min
    for (const [id, r] of Object.entries(s.reserved)) if (now - r.at > 30 * 60000) delete s.reserved[id];
    await this.state.storage.put("s", s);
    return Response.json(out);
  }
}
// Gemini RPD resets at midnight Pacific; Workers AI at 00:00 UTC. Either way the 08:00–17:00 Eastern shift is one "day".
const dayKey = (pool) => new Date(Date.now() - (pool === "workers-ai" ? 0 : 8 * 3600000)).toISOString().slice(0, 10);
function shiftFraction(now) {
  const et = new Date(new Date(now).toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = et.getHours() + et.getMinutes() / 60;
  return Math.max(0, Math.min(1, (h - 8) / 9));
}
function nextSlot(budget, s, units, now) {   // first time the pace will cover `units` more
  for (let m = 5; m <= 9 * 60; m += 5) {
    const t = now + m * 60000;
    if (budget * Math.min(1, shiftFraction(t) + 0.15) - s.used >= units) return t;
  }
  return null;                               // not today: offer the scripted version
}
```

A session reserves its units in both pools: for example 12 Gemini turns, falling back to 12 × 14 Workers AI Neurons when Gemini can't cover it. Each turn draws from the pool its route used.

---

## 5. Per-minute smoothing and one shared limiter

Daily pacing (§4) protects the day. Inside the minute, a **token bucket per (pool, model)**, also in a Durable Object, protects the provider's RPM and TPM.

- **Shared state:** the bucket is shared by every isolate, replacing today's per-isolate `geminiRest` Map.
- **Refill:** each bucket refills at **80% of the free-tier RPM/TPM**. For Gemini Flash-Lite that's about 12 RPM per project.
- **Lanes:**

| Lane | Traffic | Share of each bucket | When the bucket is empty |
|---|---|---|---|
| **live** | Simulator turns, lab hints | Can use 100% | Wait ≤ 1 s, then **next route** (Workers AI); then the scripted holding line |
| **grade** | Narrative grading, CMS evaluations | Only above a **60% live reserve** | Back into the queue with a delay (§6) |
| **background** | Opening pre-generation, tracker review | Only above the live reserve, and **only off-shift** | Skip until tonight |

```js
// LlmLimiter Durable Object: one per pool|project|model, e.g. idFromName("gemini|A|gemini-3.5-flash-lite").
export class LlmLimiter {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const { op, cfg, lane, tokens = 0, ms = 0 } = await request.json();   // cfg = { rpm, tpm, safety: 0.8, liveReserve: 0.6 }
    const now = Date.now();
    const cap = { r: cfg.rpm * cfg.safety, t: cfg.tpm * cfg.safety };
    const b = (await this.state.storage.get("b")) || { r: cap.r, t: cap.t, at: now, openUntil: 0, fails: [] };
    const dt = (now - b.at) / 60000; b.r = Math.min(cap.r, b.r + dt * cap.r); b.t = Math.min(cap.t, b.t + dt * cap.t); b.at = now;
    let out;
    if (op === "acquire") {
      if (b.openUntil > now) out = { ok: false, retryMs: b.openUntil - now, reason: "open" };
      else {
        const fr = lane === "live" ? 0 : cap.r * cfg.liveReserve, ft = lane === "live" ? 0 : cap.t * cfg.liveReserve;
        if (b.r - 1 >= fr && b.t - tokens >= ft) { b.r -= 1; b.t -= tokens; out = { ok: true }; }
        else out = { ok: false, retryMs: Math.ceil(Math.max((1 - (b.r - fr)) / cap.r, (tokens - (b.t - ft)) / cap.t, 0) * 60000), reason: "bucket" };
      }
    } else if (op === "fail") {                       // transient failure: trip after 5 in 30 s
      b.fails = [...b.fails.filter((t) => now - t < 30000), now];
      if (b.fails.length >= 5) { b.openUntil = now + Math.min(300000, 30000 * 2 ** (b.trips = (b.trips || 0) + 1)); b.fails = []; }
      out = { ok: true };
    } else if (op === "open") { b.openUntil = Math.max(b.openUntil, now + ms); out = { ok: true }; }   // rate/quota signals
    else if (op === "ok") { b.trips = 0; out = { ok: true }; }
    await this.state.storage.put("b", b);
    return Response.json(out);
  }
}
```

---

## 6. Deferred grading queue (free: a Durable Object with alarms)

Cloudflare Queues may not be on the account's plan, so the queue is a Durable Object that wakes itself with **alarms**. That's free, and it needs no new product.

```js
// GradeQueue: one instance (idFromName("grade")). Jobs live in DO storage; an alarm drains them at the pace the budget allows.
export class GradeQueue {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) {                                       // POST {job} → enqueue
    const job = await request.json();
    const id = `job:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
    await this.state.storage.put(id, { ...job, attempts: 0, notBefore: 0 });
    if (!(await this.state.storage.getAlarm())) await this.state.storage.setAlarm(Date.now() + 1000);
    return Response.json({ id });
  }
  async alarm() {
    const jobs = await this.state.storage.list({ prefix: "job:", limit: 4 });
    let next = Date.now() + 60000;
    for (const [id, job] of jobs) {
      if (job.notBefore > Date.now()) { next = Math.min(next, job.notBefore); continue; }
      try {
        const out = await routeCall(this.env, "grade", job);                     // budget + limiter + breaker inside
        await this.env.LSH_KV.put(`gradefb:${job.traineeId}:${job.kind}`, JSON.stringify({ status: "done", ...out, at: new Date().toISOString() }));
        await this.state.storage.delete(id);
      } catch (e) {
        job.attempts++;
        // Capacity: come back when the limiter or the day's pace says; else full-jitter backoff (5 s → 30 min)
        job.notBefore = Date.now() + (e.retryMs ?? Math.random() * Math.min(1800000, 5000 * 2 ** job.attempts));
        if (job.attempts > 12) { await this.state.storage.put(`dead:${id}`, { ...job, error: String(e) }); await this.state.storage.delete(id); }
        else await this.state.storage.put(id, job);
        next = Math.min(next, job.notBefore);
      }
    }
    if ((await this.state.storage.list({ prefix: "job:", limit: 1 })).size) await this.state.storage.setAlarm(next);
  }
}
```

What the trainee sees:
- **At once:** the rule-based checklist and a score band.
- **Then:** **"Trainer-style feedback: on its way"** until the AI narrative is written, usually within minutes. On a full day it arrives the next morning.
- **Dead jobs:** those older than 12 attempts are listed in Admin → Database Maintenance, with a Retry button.

---

## 7. Routing and failover (free pools only)

### 7.1 Model ladders

| Workload | Route 1 | Route 2 | Last resort |
|---|---|---|---|
| **live: call simulators** (`feature: "call"`) | **Claude `claude-haiku-5-5`** (prepaid credits; thinking off, effort `low`; PR #308) | Gemini `gemini-3.5-flash-lite` (project A), then Workers AI 8B | Scripted holding line (no error banner mid-call); the next message is a fresh turn |
| **live: other chat** | Gemini `gemini-3.5-flash-lite` (project A), minimal thinking | Workers AI `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | Scripted holding line (no error banner mid-call); the next message is a fresh turn |
| **grade** (narrative feedback) | Gemini `gemini-3.5-flash-lite` | — | **Wait** in the queue (never switch the grading model mid-cohort: consistency) |
| **background** (openings, tracker review) | Workers AI 8B | Gemini Flash-Lite, off-shift only | Skip until tonight |
| **trainer tools** | Gemini Flash (≤ 20/day) | Gemini Flash-Lite | "Try again in a few minutes" (trainers only) |

**Test before relying on Workers AI:** before turning on Route 2 for live chat, run 10 scripted test calls per scenario through the 8B model and have a trainer approve the persona's tone. If 8B isn't good enough, try `@cf/google/gemma-4-26b-a4b-it` (≈ 25 Neurons per turn, so about 360 turns/day).

### 7.2 Failover criteria

| Signal | Action |
|---|---|
| Gemini 429, per-minute | `open` that bucket for `retry-after` or 60 s; next route now |
| Gemini 429, per-day / daily | `open` until midnight Pacific; tell `DailyBudget` the pool is spent; next route |
| Workers AI daily-allocation error | `open` until 00:00 UTC; live falls to the holding line, and **new sessions stop being admitted** |
| 400/401/403 "API key" | `open` for 10 min; alert admins |
| 5xx / timeout / network | `fail` (5 in 30 s trips the breaker: 30 s doubling to 5 min); one retry with full jitter (≤ 2 s), then next route |
| Other 400 (bad request) | Don't retry, don't fail over: log it and return the error |
| Empty text / safety block | Next route once |

**Only the router retries.** Specifically:
- The browser's `callAIText` stops retrying 429/503 from `/api/ai`.
- The Worker answers a fully exhausted live request with **200 + the holding line**, so the trainee doesn't see an error mid-call.
- The live deadline is 8 s end to end.

### 7.3 Code: router

```js
const ROUTES = {
  live:       [{ p: "gemini", proj: "A", model: "gemini-3.5-flash-lite" }, { p: "wai", model: "@cf/meta/llama-3.1-8b-instruct-fp8-fast" }],
  grade:      [{ p: "gemini", proj: "A", model: "gemini-3.5-flash-lite" }],
  background: [{ p: "wai", model: "@cf/meta/llama-3.1-8b-instruct-fp8-fast" }, { p: "gemini", proj: "A", model: "gemini-3.5-flash-lite", offShiftOnly: true }],
};
const LIMITS = {   // free tier, from AI Studio / Workers AI limits; ×0.8 applied in the limiter
  "gemini|A|gemini-3.5-flash-lite": { rpm: 15, tpm: 250000 },      // placeholder: confirm in AI Studio
  "wai||@cf/meta/llama-3.1-8b-instruct-fp8-fast": { rpm: 300, tpm: 1e9 },
};
const HOLDING_LINE = "Sorry, you cut out for a second. Could you say that again?";

async function routeCall(env, lane, req) {
  const deadline = Date.now() + (lane === "live" ? 8000 : 60000);
  let last;
  for (const r of ROUTES[lane]) {
    if (r.offShiftOnly && shiftFraction(Date.now()) > 0 && shiftFraction(Date.now()) < 1) continue;
    const key = `${r.p}|${r.proj || ""}|${r.model}`;
    const lim = env.LLM_LIMITER.get(env.LLM_LIMITER.idFromName(key));
    const cfg = { ...LIMITS[key], safety: 0.8, liveReserve: 0.6 };
    const got = await call(lim, { op: "acquire", cfg, lane, tokens: req.estTokens });
    if (!got.ok) { last = Object.assign(new Error(got.reason), { retryMs: got.retryMs }); continue; }
    try {
      const out = r.p === "gemini" ? await geminiOnce(env, r.model, req) : await workersAiOnce(env, r.model, req);
      await call(lim, { op: "ok", cfg });
      return { ...out, route: key };
    } catch (e) {
      last = e;
      const c = classify(e);                                  // §7.2
      if (c === "caller") throw e;
      await call(lim, c === "transient" ? { op: "fail", cfg } : { op: "open", cfg, ms: openMs(c, e) });
      if (c === "transient" && Date.now() + 2000 < deadline) {   // one jittered retry on the same route
        await new Promise((res) => setTimeout(res, Math.random() * 2000));
        try { const out = r.p === "gemini" ? await geminiOnce(env, r.model, req) : await workersAiOnce(env, r.model, req); return { ...out, route: key }; }
        catch (e2) { last = e2; }
      }
    }
  }
  if (lane === "live") return { text: HOLDING_LINE, route: "holding" };      // never an error banner mid-call
  throw Object.assign(last || new Error("no route"), { retryMs: last?.retryMs ?? 60000 });
}

async function workersAiOnce(env, model, { system, messages, maxOutput = 160 }) {   // needs "ai": { "binding": "AI" } in wrangler.json
  const r = await env.AI.run(model, {
    messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.text }))],
    max_tokens: maxOutput,
  });
  const text = String(r && r.response || "").trim();
  if (!text) throw Object.assign(new Error("empty"), { cls: "empty" });
  return { text, model };
}
const call = async (stub, body) => (await stub.fetch("https://do/", { method: "POST", body: JSON.stringify(body) })).json();
```

`geminiOnce` is today's `callGemini` request body for **one** key and **one** model, with the loops removed. For chat it sends `systemInstruction`, `maxOutputTokens: 200` and minimal thinking. The router owns key/model choice and retries.

---

## 8. Configuration summary

| Parameter | Value |
|---|---|
| Providers | Gemini API **free tier** (one planned project); Cloudflare **Workers AI free** (10,000 Neurons/day) |
| Simulator input cap | 2,400 tokens: system ≤ 1,000 + pinned 2 msgs ≤ 300 + last 6 msgs ≤ 720 + user ≤ 200 |
| Simulator output | Gemini 200 (minimal thinking) / Workers AI 160 |
| Turns per session | 12, then a scripted wrap-up |
| AI simulator sessions per trainee per day | **3** in Scenario A (one project); recalculate with §2.3 |
| Cohort staggering | 2 groups of 10; one group in AI sims at a time |
| Daily budget safety | 0.9 of the supply; 10% held for grading |
| Pacing | budget × shift fraction (08:00–17:00 ET) + 15% burst |
| Session reservation | 12 turns + 1 grading; release at end or after 30 min idle |
| Minute buckets | 0.8 × free RPM/TPM; live 100%; grade/background only above a 60% live reserve |
| Breaker | 5 fails in 30 s → open for 30 s, doubling to 5 min; daily quota → open until reset |
| Live deadline | 8 s, then the holding line |
| Client retries on `/api/ai` | none |
| Grading | rule-based checklist at once; AI narrative via `GradeQueue`, ≤ 12 attempts, overnight at the latest |
| Personal data in prompts | none: "Trainee" only (free-tier content may be human-reviewed) |
| State storage | Durable Objects (not KV writes, which are capped on the Workers Free plan) |

### Monitoring (definition of "done")

- **Log one line per call:** lane, route, model, tokens, latency, outcome; and one line per session (reserved, used, released).
- **SLOs during the shift:**
  - **zero** sessions that start and then hit a 429;
  - holding line on < 1% of turns;
  - live p95 latency < 3 s;
  - grading narrative within 15 min on ≥ 90% of days.
- **Daily report on the admin dashboard:**
  - budget vs used for each pool;
  - sessions refused at admission;
  - the hour the pace was first exceeded.

  This tells the trainers when to stagger more, or cut sessions per day.

---

## 9. Rollout (each phase is its own small PR, no overlap with open PRs)

| Phase | Change | Files | Risk |
|---|---|---|---|
| **1** | Stop retry amplification: no client retries on 429/503 from `/api/ai`; the Worker returns the holding line (live) or 503 + `Retry-After` (other); chat output 200 with minimal thinking | `index.html` (`callAIText`), `worker.js` (`callGemini`) | Low |
| **2** | `buildChatContext` in every simulator; system prompt into `systemInstruction`; scenario cards compressed; 12-turn cap with a scripted wrap-up; no personal data in prompts; build-time budget check | `index.html`, `js/*` sims, `.github/scripts/` | Low–medium |
| **3** | Pre-generated openings (nightly cron → KV); rule-based grading pre-check; one grading call per session; KV cache for trainer tools | `worker.js` (cron), grading pages | Low–medium |
| **4** | `DailyBudget` (pacing + reservations) + `/api/ai/session/start|end` + the "AI practice is full" UI | `worker.js`, `wrangler.json` (DO migration), sim pages | Medium |
| **5** | `LlmLimiter` + router; Workers AI as live Route 2 (`"ai": {"binding": "AI"}`), after the persona check in §7.1 | `worker.js`, `wrangler.json` | Medium |
| **6** | `GradeQueue` (DO + alarms) + "feedback on its way" UI + the dead-job list in Database Maintenance | `worker.js`, `wrangler.json`, grading pages | Medium |
| **7** | Load test: 20 simulated trainees (Playwright) in 2 staggered groups over a compressed "day" against a preview deploy; check the SLOs | `.github/scripts/load-ai.cjs` | — |

Phases 1–3 cut requests and tokens the most, and need no new infrastructure. Phase 4 is what guarantees that a session which starts can finish.

**If free capacity is still short after Phase 4:**
- The levers left are **fewer AI sessions per trainee** and **more staggering**. The admin daily report shows which.
- **More free Gemini projects are not a lever** (§1.3).
