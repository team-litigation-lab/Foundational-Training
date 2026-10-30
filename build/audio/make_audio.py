#!/usr/bin/env python3
"""Renders the sample intake calls and Atty. Magdalena's PI consultation (build/audio/intake_samples.json) to MP3,
and writes js/ft-intake-samples.js (the transcripts, each line's start time, and the sample minutes).

  pip install kokoro-onnx soundfile
  python3 build/audio/make_audio.py <folder with kokoro.onnx and voices.bin> [id …]

The model and voices are Kokoro v1.0 (github.com/thewh1teagle/kokoro-onnx, release model-files-v1.0:
kokoro-v1.0.onnx saved as kokoro.onnx, voices-v1.0.bin saved as voices.bin). Each item's "voices" names a Kokoro
voice per speaker (af_heart, am_michael, …); a speaker's "speed" is optional. Given ids, only those items are
rendered again and the others keep their recording and timings from js/ft-intake-samples.js.

So the calls sound like people and not a machine reading lines: the pause before a line varies (shorter after a
quick reply, longer before a long answer), each line's speed varies a little around its speaker's, and the calls
sit on a quiet phone-line hiss with a telephone band-pass instead of dead digital silence. Needs ffmpeg."""
import json, os, random, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(R, "build/audio/intake_samples.json")
OUT = os.path.join(R, "ft/day7/audio")
JS = os.path.join(R, "js/ft-intake-samples.js")
MODELS = sys.argv[1] if len(sys.argv) > 1 else "voices"
ONLY = set(sys.argv[2:])
TTS = Kokoro(os.path.join(MODELS, "kokoro.onnx"), os.path.join(MODELS, "voices.bin"))

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
        sp = speeds.get(who, 1.0) * random.uniform(0.97, 1.03)
        audio, rate = TTS.create(text, voice=item["voices"][who], speed=sp, lang="en-us")
        audio = np.asarray(audio, dtype=np.float32)
        # trim the model's own leading and trailing silence, so the pauses are the ones chosen above
        loud = np.where(np.abs(audio) > 0.01)[0]
        if len(loud): audio = audio[max(0, loud[0] - int(0.03 * rate)): loud[-1] + int(0.08 * rate)]
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
