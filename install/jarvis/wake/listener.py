#!/usr/bin/env python3
"""Listens for the word "Jarvis" and opens the conversation. No audio leaves this computer.

It only holds the microphone when the system says so: the online mode, the option turned on and
no conversation already open.
"""
import array
import json
import math
import os
import subprocess
import time
import urllib.request

from vosk import KaldiRecognizer, Model, SetLogLevel

HERE = os.path.dirname(os.path.abspath(__file__))
STATE_URL = "http://localhost:8080/api/ai/jarvis/wake-state"
CONVERSATION_URL = "http://localhost:8080/jarvis?voz=1"

RATE = 16000
CHUNK_BYTES = 3200  # 100 ms
STATE_CHECK_SECONDS = 3
RECORDER_RETRY_SECONDS = 5
COOLDOWN_SECONDS = 8

# The Portuguese model doesn't know "Jarvis", but "Jarbas" sounds the same to it.
GRAMMAR = json.dumps(["jarbas", "[unk]"])
# Measured on a real voice: 0.47 to 0.84 of confidence and 0.27 to 0.36 s for the word.
MIN_CONFIDENCE = 0.45
MIN_SECONDS = 0.25
# Words like "jardim" and "jarra" also match, but mid-sentence: the word only counts as a call
# when it ends a phrase with at most a short "ei" or "oi" before it.
MAX_SECONDS_BEFORE = 0.8

# The microphone arrives very quiet through WSLg.
TARGET_PEAK = 16000
MAX_GAIN = 40
PEAK_DECAY = 0.97


def is_call(result):
    words = result.get("result", [])
    if not words or words[-1]["word"] != "jarbas":
        return False
    last = words[-1]
    accepted = (
        last["conf"] >= MIN_CONFIDENCE
        and last["end"] - last["start"] >= MIN_SECONDS
        and last["start"] - words[0]["start"] <= MAX_SECONDS_BEFORE
    )
    # Only the candidate's numbers, so a missed call can be diagnosed. Nothing said is kept.
    print(f"candidato: aceito={accepted} conf={last['conf']:.2f} duracao={last['end'] - last['start']:.2f}", flush=True)
    return accepted


def should_listen():
    try:
        with urllib.request.urlopen(STATE_URL, timeout=2) as response:
            return json.load(response).get("listen") is True
    except (OSError, ValueError):
        return False


def start_recorder():
    return subprocess.Popen(
        ["parecord", "--raw", "--format=s16le", f"--rate={RATE}", "--channels=1", "--device=RDPSource", "--latency-msec=100"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )


def stop_recorder(recorder):
    if recorder:
        recorder.kill()
        recorder.wait()


def tone_bytes():
    samples = array.array("h")
    for frequency, seconds in ((880, 0.09), (1320, 0.13)):
        for i in range(int(44100 * seconds)):
            value = int(9000 * math.sin(2 * math.pi * frequency * i / 44100))
            samples.extend((value, value))
    return samples.tobytes()


TONE = tone_bytes()


def answer_with_tone():
    """Comes before the window, which takes a second or two to open."""
    player = subprocess.Popen(
        ["pacat", "--playback", "--raw", "--format=s16le", "--rate=44100", "--channels=2"],
        stdin=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    player.communicate(TONE)


def open_conversation():
    subprocess.Popen(
        [os.path.join(HERE, "abrir_janela.sh"), CONVERSATION_URL],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )


class Gain:
    def __init__(self):
        self.peak = 1.0

    def apply(self, raw):
        samples = array.array("h")
        samples.frombytes(raw)
        self.peak = max(self.peak * PEAK_DECAY, float(max(map(abs, samples), default=0)), 1.0)
        gain = min(MAX_GAIN, TARGET_PEAK / self.peak)
        return array.array("h", (max(-32768, min(32767, int(s * gain))) for s in samples)).tobytes()


def main():
    SetLogLevel(-1)
    model = Model(os.path.join(HERE, "model"))
    recognizer = KaldiRecognizer(model, RATE, GRAMMAR)
    recognizer.SetWords(True)
    gain = Gain()

    recorder = None
    next_check = 0.0
    listen = False
    ignore_until = 0.0
    while True:
        now = time.monotonic()
        if now >= next_check:
            listen = now >= ignore_until and should_listen()
            next_check = now + STATE_CHECK_SECONDS

        if not listen:
            if recorder:
                stop_recorder(recorder)
                recorder = None
                recognizer.Reset()
            time.sleep(1)
            continue

        if recorder is None:
            recorder = start_recorder()

        raw = recorder.stdout.read(CHUNK_BYTES)
        if not raw:
            # WSLg isn't up yet, or it restarted.
            stop_recorder(recorder)
            recorder = None
            time.sleep(RECORDER_RETRY_SECONDS)
            continue

        if recognizer.AcceptWaveform(gain.apply(raw)) and is_call(json.loads(recognizer.Result())):
            stop_recorder(recorder)
            recorder = None
            recognizer.Reset()
            listen = False
            ignore_until = time.monotonic() + COOLDOWN_SECONDS
            answer_with_tone()
            open_conversation()


if __name__ == "__main__":
    main()
