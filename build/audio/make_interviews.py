#!/usr/bin/env python3
"""Renders the Transcription Activity's two client-to-attorney interviews (build/audio/interviews.json) to
ft/day9/audio/<id>.mp3, with Piper voices: Atty. Magdalena in the sample guide's voice (en_US-lessac-medium), each client
in their own.

  pip install piper-tts soundfile numpy
  python3 build/audio/make_interviews.py <folder with the voices' .onnx and .onnx.json>

The voices are Piper's (huggingface.co/rhasspy/piper-voices: en/en_US/<name>/medium/<voice>.onnx and .onnx.json). As in
make_audio.py, the pause before a line varies (shorter after a quick reply, longer before a long answer) and each line's
speed varies a little around its speaker's, so the conversation doesn't sound read. Prints each recording's length; the
timings are the same every run. Needs ffmpeg."""
import json, os, random, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from piper import PiperVoice, SynthesisConfig

R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(R, "build/audio/interviews.json")
OUT = os.path.join(R, "ft/day9/audio")
VOICES = sys.argv[1] if len(sys.argv) > 1 else "voices"

def gap(prev, nxt, same):
    """Seconds of silence before the next line: a quick reply comes quickly, a long answer after a breath."""
    if same: return random.uniform(0.25, 0.4)
    g = random.uniform(0.35, 0.6)
    if prev.rstrip().endswith("?"): g -= 0.08
    if len(nxt.split()) > 25: g += random.uniform(0.1, 0.25)
    return max(0.2, g)

def main():
    d = json.load(open(SRC)); os.makedirs(OUT, exist_ok=True)
    cache = {}
    voice = lambda name: cache.setdefault(name, PiperVoice.load(os.path.join(VOICES, name + ".onnx")))
    for it in d["interviews"]:
        random.seed(it["id"])
        who = {"A": d["voices"]["A"], "C": d["voices"][it["client"]]}
        speed = {"A": d["speed"]["A"], "C": d["speed"][it["client"]]}
        parts, rate, t = [], 22050, 0.0
        for i, (w, text) in enumerate(it["lines"]):
            if i:
                g = gap(it["lines"][i - 1][1], text, it["lines"][i - 1][0] == w)
                parts.append(np.zeros(int(g * rate), dtype=np.float32)); t += g
            # (Piper's length_scale: above 1 is slower)
            cfg = SynthesisConfig(length_scale=1 / (speed[w] * random.uniform(0.97, 1.03)))
            chunks = list(voice(who[w]).synthesize(text, syn_config=cfg))
            rate = chunks[0].sample_rate
            audio = np.concatenate([c.audio_float_array for c in chunks]).astype(np.float32)
            loud = np.where(np.abs(audio) > 0.01)[0]
            if len(loud): audio = audio[max(0, loud[0] - int(0.03 * rate)): loud[-1] + int(0.08 * rate)]
            parts.append(audio); t += len(audio) / rate
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, "all.wav"); sf.write(raw, np.concatenate(parts), rate)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-ac", "1", "-b:a", "48k", os.path.join(OUT, it["id"] + ".mp3")], check=True)
        print(f"{it['id']}: {t:.0f}s, {len(it['lines'])} lines")

main()
