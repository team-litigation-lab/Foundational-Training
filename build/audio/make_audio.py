#!/usr/bin/env python3
"""Renders the sample intake calls and Atty. Magdalena's PI consultation (build/audio/intake_samples.json) to MP3,
and writes js/ft-intake-samples.js (the transcripts, each line's start time, and the sample minutes).

  pip install kokoro-onnx soundfile
  python3 build/audio/make_audio.py <folder with kokoro.onnx and voices.bin> [id …]

The model and voices are Kokoro v1.0 (github.com/thewh1teagle/kokoro-onnx, release model-files-v1.0:
kokoro-v1.0.onnx saved as kokoro.onnx, voices-v1.0.bin saved as voices.bin). Each item's "voices" names a Kokoro
voice (or a blend, "af_heart:0.7+af_bella:0.3") per speaker; a speaker's "speed" is optional. Given ids, only those
items are rendered again and the others keep their recording and timings from js/ft-intake-samples.js.

So the calls sound like people and not a machine reading lines: build/audio/speech.py speaks each line sentence by
sentence, and Amy, the VA, speaks like an effective intake specialist (ROLES["intake"]: calm and unhurried, softer
and slower when she says she's sorry, slow and clear when she reads back a number or a spelling); the attorney in
the consultation is assured and unhurried (ROLES["professional"]). The pause before a line varies (shorter after a
quick reply, longer before a long answer), and the calls sit on a quiet phone-line hiss with a telephone band-pass
instead of dead digital silence. Needs ffmpeg."""
import json, os, random, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(R, "build/audio/intake_samples.json")
OUT = os.path.join(R, "ft/day7/audio")
JS = os.path.join(R, "js/ft-intake-samples.js")
os.environ["KOKORO_DIR"] = sys.argv[1] if len(sys.argv) > 1 else "voices"
ONLY = set(sys.argv[2:])
import speech
ROLE = {"VA": "intake", "A": "professional"}   # who speaks as a professional, and in which role (ROLES in speech.py)

def gap(prev, nxt, same):
    """Seconds of silence before the next line: a quick reply comes quickly, a long answer after a breath."""
    if same: return random.uniform(0.25, 0.4)
    g = random.uniform(0.3, 0.55)
    if prev.rstrip().endswith("?"): g -= 0.08                    # an answer follows a question promptly
    if len(nxt.split()) > 25: g += random.uniform(0.1, 0.25)      # a long answer starts after a beat
    return max(0.18, g)

def render(item, phone):
    random.seed(item["id"])                                       # the same timings every run
    lines, times, parts, rate, t = item["lines"], [], [], None, 0.0
    speeds = item.get("speed", {})
    for i, (who, text) in enumerate(lines):
        if i:
            g = gap(lines[i - 1][1], text, lines[i - 1][0] == who)
            parts.append(np.zeros(int(g * rate), dtype=np.float32)); t += g
        audio = speech.speak(text, item["voices"][who], speeds.get(who, 1.0), ROLE.get(who), first=(i == 0), seed=f"{item['id']}/{i}")
        rate = speech.RATE
        times.append(round(t, 1)); parts.append(audio); t += len(audio) / rate
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, "all.wav"); sf.write(raw, np.concatenate(parts), rate)
        mp3 = os.path.join(OUT, item["id"] + ".mp3")
        if phone:
            # a quiet line hiss under the whole call, then the telephone band and a gentle compressor
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-f", "lavfi", "-i", f"anoisesrc=color=pink:amplitude=0.004:sample_rate={rate}",
                   "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first:normalize=0,highpass=f=300,lowpass=f=3400,"
                   "acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.5", "-ac", "1", "-b:a", "48k", mp3]
        else:
            cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-ac", "1", "-b:a", "48k", mp3]
        subprocess.run(cmd, check=True)
    return times, round(t, 1)

def main():
    d = json.load(open(SRC)); os.makedirs(OUT, exist_ok=True)
    old = {}
    if ONLY and os.path.exists(JS):
        prev = json.loads(re.search(r"window\.FT_INTAKE_SAMPLES = (.*);\s*$", open(JS).read(), re.S).group(1))
        old = {c["id"]: c for c in prev["calls"]} | {prev["consult"]["id"]: prev["consult"]}
    keep = lambda item: ONLY and item["id"] not in ONLY and item["id"] in old and [x for _, x, _ in old[item["id"]]["lines"]] == [x for _, x in item["lines"]]
    out = {"firm": d["firm"], "calls": [], "consult": None}
    for c in d["calls"]:
        if keep(c): out["calls"].append(old[c["id"]]); print(f"{c['id']}: kept"); continue
        times, dur = render(c, True)
        out["calls"].append({k: c[k] for k in ("id", "title", "kind", "about", "listen_for")} |
                            {"src": f"/ft/day7/audio/{c['id']}.mp3", "dur": dur, "lines": [[w, x, s] for (w, x), s in zip(c["lines"], times)]})
        print(f"{c['id']}: {dur:.0f}s, {len(c['lines'])} lines")
    k = d["consult"]
    if keep(k): out["consult"] = old[k["id"]]; print(f"{k['id']}: kept")
    else:
        times, dur = render(k, False)
        m = dict(k["minutes"]); stamp = lambda s: f"[{int(s // 60)}:{int(s % 60):02d}]"
        m["discussion"] = "\n".join(f"{stamp(times[i])} {x}" for i, x in m["discussion"])
        out["consult"] = {"id": k["id"], "title": k["title"], "about": k["about"], "src": f"/ft/day7/audio/{k['id']}.mp3", "dur": dur,
                          "lines": [[w, x, s] for (w, x), s in zip(k["lines"], times)], "minutes": m}
        print(f"{k['id']}: {dur:.0f}s, {len(k['lines'])} lines")
    open(JS, "w").write("// Generated by build/audio/make_audio.py from build/audio/intake_samples.json — edit that file, not this one.\n"
                        "// Fictional people, firm and cases, written for training.\n"
                        "window.FT_INTAKE_SAMPLES = " + json.dumps(out, ensure_ascii=False) + ";\n")

main()
