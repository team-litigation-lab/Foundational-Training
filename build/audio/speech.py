"""The voice of the generated training calls: Kokoro neural text-to-speech, delivered the way people talk on the phone.

Used by build/audio/make_audio.py (Day 7's intake calls and the consultation) and build/calls/pi_reception_calls.py
(Day 3's reception calls). Needs `pip install kokoro-onnx soundfile numpy` and the Kokoro v1.0 files (github.com/
thewh1teagle/kokoro-onnx, release model-files-v1.0: kokoro-v1.0.onnx saved as kokoro.onnx, voices-v1.0.bin saved as
voices.bin) in the folder named by $KOKORO_DIR (default: ./voices).

Why the calls don't sound like a machine reading lines:
- A line isn't spoken in one breath at one speed. It's split into sentences, each spoken at its own pace with a short,
  varied pause between them (a little longer after a question or a long sentence).
- The VA speaks like an effective VA in that role (ROLES): a receptionist bright on the greeting and brisk but never
  rushed; an intake specialist calm, unhurried and caring. In every role the VA slows down and softens for empathy
  ("I'm so sorry to hear that"), slows right down to read back numbers, spellings and dates so the caller can check
  them, and keeps an even, confident pace for next steps.
- Callers vary a little around their own speed from sentence to sentence, the way people do.
- A voice can be a blend of Kokoro voices ("af_heart:0.7+af_bella:0.3"), so each speaker sounds like their own person.
Each spoken sentence is cached in build/audio/.cache (not committed): a re-run only speaks what changed.
"""
import hashlib, os, random, re
import numpy as np

RATE = 24000
_REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(_REPO, "build", "audio", ".cache")
_tts = None

def _engine():
    global _tts
    if _tts is None:
        from kokoro_onnx import Kokoro
        d = os.environ.get("KOKORO_DIR", "voices")
        _tts = Kokoro(os.path.join(d, "kokoro.onnx"), os.path.join(d, "voices.bin"))
    return _tts

def _style(voice):
    """'af_heart' or a blend 'af_heart:0.7+af_bella:0.3' -> the style the model speaks with"""
    if "+" not in voice and ":" not in voice: return voice
    k, parts = _engine(), [p.split(":") for p in voice.split("+")]
    w = np.array([float(p[1]) if len(p) > 1 else 1.0 for p in parts]); w /= w.sum()
    return sum(wi * k.get_voice_style(p[0]) for wi, p in zip(w, parts))

# how an effective VA sounds in each role: the base pace, and how much slower each kind of sentence is spoken
ROLES = {
    # reception: the first voice of the firm. Bright and welcoming, efficient, patient with every detail.
    "receptionist": {"base": 1.0, "greeting": 1.0, "empathy": 0.92, "readback": 0.86, "question": 0.98, "steps": 0.96, "close": 0.97},
    # intake: someone who was just hurt is telling their story. Calm, unhurried, warm; every question gentle and clear.
    "intake":       {"base": 0.96, "greeting": 0.98, "empathy": 0.89, "readback": 0.85, "question": 0.95, "steps": 0.93, "close": 0.95},
    # a case manager or attorney: assured and caring, explains without hurrying.
    "professional": {"base": 0.97, "greeting": 0.98, "empathy": 0.91, "readback": 0.88, "question": 0.96, "steps": 0.94, "close": 0.96},
}

_NUM = r"(zero|oh|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)"
_EMPATHY = re.compile(r"\b(sorry|I understand|I hear you|I can hear|that sounds|I can imagine|must (be|have been)|that's (okay|all right)|no problem|don't worry|take your time|I'm glad|thank you for (telling|letting|sharing|your patience)|take care|stay safe|feel better|you did the right thing|no se preocupe)\b", re.I)
_STEPS = re.compile(r"\b(I'll|I will|I'm going to|I've (noted|sent|added)|will (call|reach|get back)|within|today|tomorrow|before \w+ (AM|PM))\b", re.I)
_CLOSE = re.compile(r"\b(anything else|goodbye|bye|have a (good|great|nice))\b", re.I)
_GREET = re.compile(r"\b(this is \w+|how (may|can) I help|thanks for calling|thank you for calling)\b", re.I)

def kind(sentence, first=False):
    """what a VA's sentence is doing: greeting, empathy, readback, question, steps, close or plain"""
    s = sentence.strip()
    if first and _GREET.search(s): return "greeting"
    words = re.findall(r"[A-Za-z'-]+", s)
    nums = sum(1 for w in words if re.fullmatch(_NUM + r"(-" + _NUM + r")?", w, re.I))
    letters = len(re.findall(r"(?:^|[\s,])[A-Z](?=[,.\s]|$)", s))
    if nums >= 4 or letters >= 3: return "readback"
    if _EMPATHY.search(s): return "empathy"
    if _CLOSE.search(s): return "close"
    if s.endswith("?"): return "question"
    if _STEPS.search(s): return "steps"
    return "plain"

def sentences(text):
    """split a line into the sentences it's spoken in; '...' stays with its sentence as a trailing-off pause"""
    parts = re.split(r"(?<=[.?!])\s+(?=[A-Z¿¡\"'])", text.strip())
    out = []
    for p in parts:   # very short bits ("Okay.", "Yes.") stay with the next sentence, as people run them together
        if out and len(out[-1].split()) <= 2 and not out[-1].endswith("?") and len((out[-1] + " " + p).split()) <= 8: out[-1] += " " + p
        else: out.append(p)
    return [p for p in out if p.strip()]

def lang_of(text, default="en-us"):
    if re.search(r"[¿¡ñáéíóú]|\b(hola|gracias|señora|usted|cómo|qué|pague|todavía|mándeme|cuénteme|llegó|factura)\b", text, re.I): return "es"
    return default

def _say(text, voice, speed, lang):
    os.makedirs(CACHE, exist_ok=True)
    key = hashlib.sha1(f"kokoro1|{voice}|{speed:.3f}|{lang}|{text}".encode()).hexdigest()[:20]
    path = os.path.join(CACHE, key + ".npy")
    if os.path.exists(path): return np.load(path)
    a, rate = _engine().create(text, voice=_style(voice), speed=speed, lang=lang)
    a = np.asarray(a, dtype=np.float32)
    assert rate == RATE
    loud = np.where(np.abs(a) > 0.008)[0]   # the model's own silence off both ends: the pauses are chosen here
    if len(loud): a = a[max(0, loud[0] - int(0.025 * RATE)): loud[-1] + int(0.09 * RATE)]
    np.save(path, a)
    return a

def speak(text, voice, speed=1.0, role=None, lang=None, first=False, seed=None):
    """one line of a call, as float32 audio at RATE. role: a key of ROLES for the VA (or None for a caller);
    speed: the speaker's own pace (a line's "rate" is folded in by the caller); first: the call's opening line."""
    rnd = random.Random(seed if seed is not None else text)
    out, sents = [], sentences(text)
    for i, s in enumerate(sents):
        if role:
            prof = ROLES[role]; k = kind(s, first and i == 0)
            sp = speed * prof["base"] * (prof.get(k, 1.0) if k != "plain" else 1.0) * rnd.uniform(0.985, 1.015)
        else:
            sp = speed * rnd.uniform(0.96, 1.04)
        a = _say(s, voice, round(sp, 3), lang or lang_of(s))
        if out:
            prev = sents[i - 1]
            g = rnd.uniform(0.16, 0.3)
            if prev.endswith("?"): g -= 0.04
            if prev.endswith("..."): g += rnd.uniform(0.2, 0.4)          # trailing off
            if len(prev.split()) > 18: g += rnd.uniform(0.05, 0.12)     # a breath after a long sentence
            if role and kind(s) == "readback": g += 0.08                # a beat before reading back
            out.append(np.zeros(int(g * RATE), dtype=np.float32))
        out.append(a)
    return np.concatenate(out) if out else np.zeros(0, dtype=np.float32)

def rate_to_speed(rate):
    """an edge-tts style rate ('-12%', '+5%') as a speed factor"""
    m = re.fullmatch(r"([+-]\d+)%", rate or "+0%")
    return 1.0 + int(m.group(1)) / 100 if m else 1.0
