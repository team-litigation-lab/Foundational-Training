#!/usr/bin/env python3
"""Renders the Transcription Activity's two client-to-attorney interviews (build/audio/interviews.json) to
ft/day9/audio/<id>.mp3, with Kokoro voices through build/audio/speech.py: Atty. Magdalena in the sample guide's voice
(the consultation in intake_samples.json), each client in their own.

  pip install kokoro-onnx soundfile numpy
  python3 build/audio/make_interviews.py <folder with kokoro.onnx and voices.bin>

The model and voices are Kokoro v1.0 (see speech.py). So the conversation doesn't sound read: each line is spoken
sentence by sentence with natural pauses, the attorney speaks assured and unhurried (ROLES["professional"]: softer
when she's sorry, slow on read-backs), and the pause before a line varies (shorter after a quick reply, longer before
a long answer). Prints each recording's length; the timings are the same every run. Needs ffmpeg."""
import json, os, random, subprocess, sys, tempfile
import numpy as np, soundfile as sf

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(R, "build/audio/interviews.json")
OUT = os.path.join(R, "ft/day9/audio")
os.environ["KOKORO_DIR"] = sys.argv[1] if len(sys.argv) > 1 else "voices"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import speech

def gap(prev, nxt, same):
    """Seconds of silence before the next line: a quick reply comes quickly, a long answer after a breath."""
    if same: return random.uniform(0.25, 0.4)
    g = random.uniform(0.35, 0.6)
    if prev.rstrip().endswith("?"): g -= 0.08
    if len(nxt.split()) > 25: g += random.uniform(0.1, 0.25)
    return max(0.2, g)

def main():
    d = json.load(open(SRC)); os.makedirs(OUT, exist_ok=True)
    for it in d["interviews"]:
        random.seed(it["id"])
        who = {"A": d["voices"]["A"], "C": d["voices"][it["client"]]}
        speed = {"A": d["speed"]["A"], "C": d["speed"][it["client"]]}
        parts, rate, t = [], speech.RATE, 0.0
        for i, (w, text) in enumerate(it["lines"]):
            if i:
                g = gap(it["lines"][i - 1][1], text, it["lines"][i - 1][0] == w)
                parts.append(np.zeros(int(g * rate), dtype=np.float32)); t += g
            audio = speech.speak(text, who[w], speed[w], "professional" if w == "A" else None, first=(i == 0), seed=f"{it['id']}/{i}")
            parts.append(audio); t += len(audio) / rate
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "all.wav"); sf.write(raw, np.concatenate(parts), rate)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-ac", "1", "-b:a", "48k", os.path.join(OUT, it["id"] + ".mp3")], check=True)
        print(f"{it['id']}: {t:.0f}s, {len(it['lines'])} lines")

main()
