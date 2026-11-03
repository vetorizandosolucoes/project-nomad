#!/usr/bin/env python3
"""Jarvis, the way Alexa works: call the name and talk, with no browser and no window to manage.

The word is spotted and the speech is understood and spoken on this computer, so no audio leaves
it. It only holds the microphone when the system says so: the online mode, the option turned on
and no conversation already open in the app. Nothing that was said gets logged.
"""
import array
import base64
import ctypes
import gc
import glob
import json
import os
import queue
import re
import subprocess
import threading
import time
import unicodedata
import urllib.request

import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.vad import VadOptions, get_speech_timestamps
from piper import PiperVoice, SynthesisConfig
from vosk import KaldiRecognizer, Model, SetLogLevel

from speech_text import speakable

HERE = os.path.dirname(os.path.abspath(__file__))
API = "http://localhost:8080/api/ai/jarvis"
POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"

RATE = 16000
BYTES_PER_SECOND = RATE * 2
CHUNK_BYTES = 3200  # 100 ms
STATE_CHECK_SECONDS = 3
RECORDER_RETRY_SECONDS = 5

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

WAIT_FOR_SPEECH_SECONDS = 8
SILENCE_ENDS_PHRASE_SECONDS = 0.9
MAX_PHRASE_SECONDS = 20
VAD_EVERY_SECONDS = 0.4
MIN_PHRASE_SECONDS = 0.3
NO_SPEECH_LIMIT = 0.6
CAPTION_LINGERS_SECONDS = 1.5
FORGET_CONVERSATION_SECONDS = 300
MAX_HISTORY = 12

WHISPER_PATH = os.path.join(HERE, "models", "whisper-base")
VOICE_PATH = os.path.join(HERE, "voices", "pt_BR-faber-medium.onnx")
# Piper's length scale, below 1 is faster, for the "slow", "normal" and "fast" settings.
VOICE_SPEEDS = (1.15, 0.95, 0.8)
OVERLAY_RETRY_SECONDS = 30
MAX_CAPTION_CHARS = 280
LIVE_CAPTION_MIN_SECONDS = 0.6

MIN_SENTENCE_CHARS = 12
SENTENCE_END = re.compile(r"[.!?…]+\s+")
GOODBYE = re.compile(r"^(obrigad[oa]|valeu|tchau|pode parar|so isso|era isso|nada nao|deixa pra la)\b")
UNDERSTOOD_NOTHING = "Não tenho certeza se entendi. Pode repetir de outro jeito?"
WHISPER_PROMPT = "Conversa em português do Brasil com o assistente Jarvis."
TOGGLES = {"toggle-listen": "wakeEnabled", "toggle-heard": "showHeard", "toggle-answer": "showAnswer"}
LOOKUP_REPLIES = {
    "news": "Deixa eu dar uma olhada no que tá rolando.",
    "weather": "Vou ver aqui como tá o tempo.",
    "money": "Vou conferir a cotação de agora.",
}


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
    # Only the candidate's numbers, so a missed call can be diagnosed.
    print(f"candidato: aceito={accepted} conf={last['conf']:.2f} duracao={last['end'] - last['start']:.2f}", flush=True)
    return accepted


def wake_state():
    try:
        with urllib.request.urlopen(f"{API}/wake-state", timeout=2) as response:
            return json.load(response)
    except (OSError, ValueError):
        return {}


def caption(text):
    """The end of a long text, starting at a word: it's what is being said right now."""
    text = text.replace("\n", " ").strip()
    if len(text) <= MAX_CAPTION_CHARS:
        return text
    return "… " + text[-MAX_CAPTION_CHARS:].split(" ", 1)[-1]


def plain(text):
    return "".join(c for c in unicodedata.normalize("NFD", text.lower()) if not unicodedata.combining(c)).strip()


def text_for_speech(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^\s*(#{1,6}|[-*+]|\d+[.)])\s+", "", text, flags=re.M)
    text = re.sub(r"[*_#`>|~]", "", text)
    text = re.sub(r"[^\w\s.,;:!?…%$()'\"/-]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def take_sentences(text):
    """Cuts the finished sentences off a text that is still arriving, so speech can start at once."""
    sentences, start = [], 0
    for match in SENTENCE_END.finditer(text):
        piece = text[start : match.end()].strip()
        if len(piece) >= MIN_SENTENCE_CHARS and not re.fullmatch(r"\d+[.)]", piece):
            sentences.append(piece)
            start = match.end()
    return sentences, text[start:]


class Gain:
    def __init__(self):
        self.peak = 1.0

    def apply(self, raw):
        samples = array.array("h")
        samples.frombytes(raw)
        self.peak = max(self.peak * PEAK_DECAY, float(max(map(abs, samples), default=0)), 1.0)
        gain = min(MAX_GAIN, TARGET_PEAK / self.peak)
        return array.array("h", (max(-32768, min(32767, int(s * gain))) for s in samples)).tobytes()


class Microphone:
    """Reads in the background, so the chunks wait in line while the voice is speaking."""

    def __init__(self):
        self.recorder = None
        self.chunks = queue.Queue()
        self.gain = Gain()

    @property
    def is_open(self):
        return self.recorder is not None

    def open(self):
        self.recorder = subprocess.Popen(
            ["parecord", "--raw", "--format=s16le", f"--rate={RATE}", "--channels=1", "--device=RDPSource", "--latency-msec=100"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        threading.Thread(target=self._read, args=(self.recorder,), daemon=True).start()

    def _read(self, recorder):
        while True:
            raw = recorder.stdout.read(CHUNK_BYTES)
            if len(raw) < CHUNK_BYTES:
                self.chunks.put(None)
                return
            self.chunks.put(self.gain.apply(raw))

    def read(self, timeout=1.0):
        """A chunk of audio, b"" if none arrived in time, or None if the recorder stopped."""
        try:
            return self.chunks.get(timeout=timeout)
        except queue.Empty:
            return b""

    def drain(self):
        while not self.chunks.empty():
            self.chunks.get_nowait()

    def close(self):
        if self.recorder:
            self.recorder.kill()
            self.recorder.wait()
            self.recorder = None
        self.drain()


def lasting_interop_socket():
    """The oldest live session, because this process would die with a short-lived one."""
    sockets = sorted(glob.glob("/run/WSL/*_interop"), key=os.path.getmtime)
    alive = [s for s in sockets if os.path.isdir(f"/proc/{os.path.basename(s).split('_')[0]}")]
    return alive[0] if alive else ""


class Overlay:
    """The Windows side, kept running: the icon by the clock and the floating animation.

    If it isn't available, the conversation still works by voice.
    """

    def __init__(self, on_click):
        self.on_click = on_click
        self.dismissed = threading.Event()
        self.process = None
        self.next_attempt = 0.0
        self.last_tip = None

    def ensure_running(self):
        if (self.process and self.process.poll() is None) or time.monotonic() < self.next_attempt:
            return
        self.next_attempt = time.monotonic() + OVERLAY_RETRY_SECONDS
        env = dict(os.environ, WSL_INTEROP=lasting_interop_socket())
        with open(os.path.join(HERE, "overlay.ps1"), encoding="utf8") as script:
            encoded = base64.b64encode(script.read().encode("utf-16-le")).decode()
        try:
            self.process = subprocess.Popen(
                [POWERSHELL, "-NoProfile", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                env=env,
                cwd="/mnt/c/Windows",
                start_new_session=True,
            )
            threading.Thread(target=self._watch, args=(self.process,), daemon=True).start()
        except OSError as error:
            self.process = None
            print(f"janelinha indisponivel: {error}", flush=True)

    def _watch(self, process):
        for line in process.stdout:
            message = line.decode("utf8", "ignore").strip()
            if message == "dismiss":
                self.dismissed.set()
            elif message and message != "ready":
                self.on_click(message)

    def send(self, command, value=""):
        if not self.process:
            return
        try:
            self.process.stdin.write(f"{command} {value}\n".encode("utf8"))
            self.process.stdin.flush()
        except OSError:
            self.process = None

    def begin(self):
        self.dismissed.clear()
        self.send("state", "listening")
        self.send("show")

    def end(self):
        self.send("hide")

    def state(self, name):
        self.send("state", name)

    def level(self, value):
        self.send("level", f"{value:.2f}")

    def heard(self, text):
        self.send("heard", caption(text))

    def answer(self, text):
        self.send("answer", caption(text))

    def stop(self):
        self.send("exit")


class Speaker:
    """Turns sentences into speech as they arrive. They wait in line for the one being spoken."""

    def __init__(self, voice, speed=1):
        self.voice = voice
        self.length_scale = VOICE_SPEEDS[speed] if speed in range(len(VOICE_SPEEDS)) else VOICE_SPEEDS[1]
        self.sentences = queue.Queue()
        self.stopped = threading.Event()
        self.player = None
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def player_command(self):
        return ["pacat", "--playback", "--raw", "--format=s16le", f"--rate={self.voice.config.sample_rate}", "--channels=1"]

    def _run(self):
        self.player = subprocess.Popen(self.player_command(), stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
        options = SynthesisConfig(length_scale=self.length_scale)
        try:
            while not self.stopped.is_set():
                sentence = self.sentences.get()
                if sentence is None:
                    break
                for chunk in self.voice.synthesize(sentence, options):
                    if self.stopped.is_set():
                        return
                    self.player.stdin.write(chunk.audio_int16_bytes)
                    self.player.stdin.flush()
            self.player.stdin.close()
            self.player.wait()
        except (OSError, ValueError):
            pass

    def say(self, text):
        spoken = text_for_speech(text)
        if re.search(r"\w", spoken):
            self.sentences.put(speakable(spoken))

    def finish(self):
        self.sentences.put(None)

    def stop(self):
        self.stopped.set()
        self.sentences.put(None)
        if self.player:
            self.player.kill()

    def is_speaking(self):
        return self.thread.is_alive()


def greeting_text():
    try:
        with urllib.request.urlopen(f"{API}/greeting", timeout=2) as response:
            return json.load(response).get("text")
    except (OSError, ValueError):
        return None


class Assistant:
    def __init__(self):
        SetLogLevel(-1)
        self.spotter_model = Model(os.path.join(HERE, "model"))
        self.spotter = self.new_spotter()
        self.mic = Microphone()
        self.overlay = Overlay(self.on_click)
        self.state = {}
        self.talk_requested = threading.Event()
        self.history = []
        self.last_talk = 0.0
        self.whisper = None
        self.voice = None

    def new_spotter(self):
        spotter = KaldiRecognizer(self.spotter_model, RATE, GRAMMAR)
        spotter.SetWords(True)
        return spotter

    def heard_the_word(self, chunk):
        return self.spotter.AcceptWaveform(chunk) and is_call(json.loads(self.spotter.Result()))

    def load_speech(self):
        self.whisper = WhisperModel(WHISPER_PATH, device="cpu", compute_type="int8", cpu_threads=4)
        self.voice = PiperVoice.load(VOICE_PATH)

    def unload_speech(self):
        """Memory is tight on this computer, so these are only held during a conversation."""
        self.whisper = None
        self.voice = None
        gc.collect()
        ctypes.CDLL("libc.so.6").malloc_trim(0)

    def on_click(self, message):
        """What was chosen on the icon by the clock. The setting itself lives in the system."""
        if message == "open":
            subprocess.Popen([os.path.join(HERE, "abrir_janela.sh")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        elif message == "talk":
            self.talk_requested.set()
        elif message == "quit":
            subprocess.Popen([os.path.join(HERE, "desligar.sh"), "--confirmado"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        elif message in TOGGLES:
            key = TOGGLES[message]
            body = json.dumps({key: not self.state.get(key, True)}).encode()
            request = urllib.request.Request(f"{API}/wake-options", body, {"Content-Type": "application/json"}, method="PUT")
            try:
                urllib.request.urlopen(request, timeout=3).read()
            except OSError:
                pass

    def refresh_state(self):
        self.state = wake_state()
        flag = lambda key: "1" if self.state.get(key, True) else "0"
        self.overlay.ensure_running()
        self.overlay.send("menu", f"{flag('wakeEnabled')} {flag('showHeard')} {flag('showAnswer')}")
        tip = "Jarvis: ouvindo" if self.state.get("listen") else "Jarvis: em pausa"
        if tip != self.overlay.last_tip:
            self.overlay.last_tip = tip
            self.overlay.send("tip", tip)

    def show_heard(self, text):
        if self.state.get("showHeard", True):
            self.overlay.heard(text)

    def show_answer(self, text):
        if self.state.get("showAnswer", True):
            self.overlay.answer(text)

    def preview(self, samples):
        """Writes what is being said while it is being said, with a faster and rougher pass."""
        segments, _ = self.whisper.transcribe(
            samples,
            language="pt",
            beam_size=1,
            condition_on_previous_text=False,
            without_timestamps=True,
            initial_prompt=WHISPER_PROMPT,
        )
        text = " ".join(s.text.strip() for s in segments).strip()
        if text:
            self.show_heard(text)

    def listen_for_phrase(self, overlay):
        """Waits for someone to speak and then for them to stop. Returns audio, or None if nobody did."""
        self.mic.drain()
        audio = bytearray()
        next_check = VAD_EVERY_SECONDS
        options = VadOptions(min_silence_duration_ms=int(SILENCE_ENDS_PHRASE_SECONDS * 500), threshold=0.4)
        started = time.monotonic()
        previewing = None
        while not overlay.dismissed.is_set():
            chunk = self.mic.read()
            if chunk is None:
                return None
            # The microphone can go silent altogether, and then no chunks arrive to count time by.
            if not chunk:
                if time.monotonic() - started > WAIT_FOR_SPEECH_SECONDS:
                    return None
                continue
            audio.extend(chunk)
            rms = float(np.sqrt(np.mean(np.square(np.frombuffer(chunk, dtype=np.int16).astype(np.float32))))) / 32768
            overlay.level(min(1.0, rms * 6))
            seconds = len(audio) / BYTES_PER_SECOND
            if seconds < next_check:
                continue
            next_check = seconds + VAD_EVERY_SECONDS

            samples = np.frombuffer(bytes(audio), dtype=np.int16).astype(np.float32) / 32768
            speech = get_speech_timestamps(samples, options)
            if not speech:
                if seconds > WAIT_FOR_SPEECH_SECONDS:
                    return None
                continue
            silence = seconds - speech[-1]["end"] / RATE
            if silence >= SILENCE_ENDS_PHRASE_SECONDS or seconds >= MAX_PHRASE_SECONDS:
                first = max(0, speech[0]["start"] - RATE // 5)
                if previewing:
                    previewing.join()
                overlay.level(0)
                return samples[first : speech[-1]["end"] + RATE // 5]
            spoken = samples[max(0, speech[0]["start"] - RATE // 5) :]
            if (
                self.whisper
                and self.state.get("showHeard", True)
                and len(spoken) / RATE >= LIVE_CAPTION_MIN_SECONDS
                and not (previewing and previewing.is_alive())
            ):
                previewing = threading.Thread(target=self.preview, args=(spoken,), daemon=True)
                previewing.start()
        return None

    def transcribe(self, samples):
        if len(samples) / RATE < MIN_PHRASE_SECONDS:
            return ""
        segments, _ = self.whisper.transcribe(
            samples,
            language="pt",
            beam_size=5,
            condition_on_previous_text=False,
            without_timestamps=True,
            initial_prompt=WHISPER_PROMPT,
        )
        return " ".join(s.text.strip() for s in segments if s.no_speech_prob < NO_SPEECH_LIMIT).strip()

    def say_only(self, text):
        speaker = Speaker(self.voice, self.state.get("voiceSpeed", 1))
        speaker.say(text)
        speaker.finish()
        speaker.thread.join()

    def answer(self, question, overlay):
        """Asks the system and speaks the answer as it arrives. Saying "Jarvis" cuts it short."""
        if time.monotonic() - self.last_talk > FORGET_CONVERSATION_SECONDS:
            self.history = []
        self.history.append({"role": "user", "content": question})
        speaker = Speaker(self.voice, self.state.get("voiceSpeed", 1))
        answer = {"text": ""}

        def read_answer():
            pending = ""
            request = urllib.request.Request(
                f"{API}/talk",
                json.dumps({"messages": self.history[-MAX_HISTORY:]}).encode(),
                {"Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(request, timeout=180) as response:
                    for line in response:
                        if speaker.stopped.is_set():
                            return
                        event = json.loads(line)
                        if event.get("lookup"):
                            speaker.say(LOOKUP_REPLIES[event["lookup"]])
                        if event.get("error"):
                            self.show_answer(event["error"])
                            speaker.say(event["error"])
                        if event.get("delta"):
                            if not answer["text"]:
                                overlay.state("speaking")
                            answer["text"] += event["delta"]
                            pending += event["delta"]
                            sentences, pending = take_sentences(pending)
                            for sentence in sentences:
                                speaker.say(sentence)
                            self.show_answer(text_for_speech(answer["text"]))
                speaker.say(pending)
            except (OSError, ValueError):
                speaker.say("Não consegui responder agora.")
            finally:
                speaker.finish()

        threading.Thread(target=read_answer, daemon=True).start()
        self.mic.drain()
        while speaker.is_speaking():
            if overlay.dismissed.is_set():
                speaker.stop()
                break
            chunk = self.mic.read(timeout=0.2)
            if chunk and self.heard_the_word(chunk):
                speaker.stop()
                break
        self.spotter = self.new_spotter()

        # A question left without an answer would make the model answer it again with the next one.
        if answer["text"].strip():
            self.history.append({"role": "assistant", "content": answer["text"]})
        else:
            self.history.pop()
        self.last_talk = time.monotonic()

    def conversation(self):
        overlay = self.overlay
        overlay.ensure_running()
        overlay.begin()
        loading = threading.Thread(target=self.load_speech)
        loading.start()
        threading.Thread(target=warm_up, daemon=True).start()
        try:
            greeting = greeting_text()
            if greeting:
                loading.join()
                overlay.state("speaking")
                self.show_answer(greeting)
                self.say_only(greeting)
                self.overlay.answer("")
            understood_nothing = False
            while not overlay.dismissed.is_set():
                overlay.state("listening")
                overlay.heard("")
                samples = self.listen_for_phrase(overlay)
                if samples is None:
                    return
                overlay.state("thinking")
                loading.join()
                start = time.monotonic()
                question = self.transcribe(samples)
                print(f"transcricao em {time.monotonic() - start:.1f} s de {len(samples) / RATE:.1f} s de fala", flush=True)
                if not question:
                    if understood_nothing:
                        return
                    understood_nothing = True
                    self.show_answer(UNDERSTOOD_NOTHING)
                    self.say_only(UNDERSTOOD_NOTHING)
                    continue
                understood_nothing = False
                overlay.answer("")
                self.show_heard(question)
                if GOODBYE.match(plain(question)) and len(question.split()) <= 4:
                    self.say_only("Tá bom, qualquer coisa é só chamar.")
                    return
                self.answer(question, overlay)
        finally:
            if not overlay.dismissed.is_set():
                time.sleep(CAPTION_LINGERS_SECONDS)
            overlay.end()
            loading.join()
            self.unload_speech()

    def run(self):
        next_check = 0.0
        while True:
            now = time.monotonic()
            if now >= next_check:
                self.refresh_state()
                next_check = now + STATE_CHECK_SECONDS

            if self.talk_requested.is_set():
                self.talk_requested.clear()
                if not self.mic.is_open:
                    self.mic.open()
                self.start_conversation()
                next_check = 0.0
                continue

            if not self.state.get("listen"):
                if self.mic.is_open:
                    self.mic.close()
                    self.spotter.Reset()
                time.sleep(1)
                continue

            if not self.mic.is_open:
                self.mic.open()

            chunk = self.mic.read()
            if chunk is None:
                # WSLg isn't up yet, or it restarted.
                self.mic.close()
                time.sleep(RECORDER_RETRY_SECONDS)
                continue
            if chunk and self.heard_the_word(chunk):
                self.start_conversation()
                next_check = 0.0

    def start_conversation(self):
        answer_with_tone()
        self.conversation()
        self.spotter = self.new_spotter()
        self.mic.drain()


def tone_bytes():
    pieces = []
    for frequency, seconds in ((880, 0.09), (1320, 0.13)):
        t = np.arange(int(44100 * seconds)) / 44100
        pieces.append(np.repeat((9000 * np.sin(2 * np.pi * frequency * t)).astype(np.int16), 2))
    return np.concatenate(pieces).tobytes()


TONE = tone_bytes()


def answer_with_tone():
    """Comes before the card, which takes a second or two to appear."""
    player = subprocess.Popen(
        ["pacat", "--playback", "--raw", "--format=s16le", "--rate=44100", "--channels=2"],
        stdin=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    player.communicate(TONE)


def warm_up():
    """So the first answer doesn't wait for the language model to load."""
    try:
        urllib.request.urlopen(urllib.request.Request(f"{API}/warm", b"", method="POST"), timeout=60).read()
    except OSError:
        pass


if __name__ == "__main__":
    Assistant().run()
