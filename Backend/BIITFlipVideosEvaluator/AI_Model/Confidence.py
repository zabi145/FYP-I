import os
import re
import numpy as np
from collections import Counter
from dataclasses import dataclass, asdict
import warnings
warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────
#  Data Classes
# ─────────────────────────────────────────────

@dataclass
class MetricResult:
    score: float       # 0 – 100
    weight: float      # importance weight
    detail: str        # human-readable explanation


@dataclass
class ConfidenceReport:
    speaking_rate:   MetricResult
    pause_analysis:  MetricResult
    fluency:         MetricResult
    repetitions:     MetricResult
    speech_energy:   MetricResult
    overall_score:   float
    grade:           str
    transcript:      str
    duration_sec:    float

    def to_dict(self):
        return asdict(self)

    def print_report(self):
        print("\n" + "=" * 60)
        print("       PRESENTATION CONFIDENCE REPORT")
        print("=" * 60)
        print(f"  Duration      : {self.duration_sec:.1f} seconds")
        print(f"  Overall Score : {self.overall_score:.1f} / 100  [{self.grade}]")
        print("-" * 60)
        metrics = {
            "Speaking Rate  ": self.speaking_rate,
            "Pause Analysis ": self.pause_analysis,
            "Fluency        ": self.fluency,
            "Word Repetition": self.repetitions,
            "Speech Energy  ": self.speech_energy,
        }
        for name, m in metrics.items():
            bar = "█" * int(m.score / 5) + "░" * (20 - int(m.score / 5))
            print(f"  {name}: {m.score:5.1f}/100  |{bar}|")
            print(f"               → {m.detail}")
        print("-" * 60)
        print(f"  Transcript: {self.transcript[:200]}...")
        print("=" * 60)


# ─────────────────────────────────────────────
#  Audio Extraction
# ─────────────────────────────────────────────

def extract_audio(video_path: str, audio_path: str = "temp_audio.wav") -> str:
    import subprocess
    import os
    import imageio_ffmpeg

    print("[1/5] Extracting audio from video...")

    video_path = os.path.abspath(video_path)
    audio_path = os.path.abspath(audio_path)

    # Get the bundled ffmpeg binary path
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

    command = [
        ffmpeg_path, "-y",
        "-i", video_path,
        "-ar", "16000",
        "-ac", "1",
        "-sample_fmt", "s16",
        audio_path
    ]

    result = subprocess.run(command, capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{result.stderr}")

    return audio_path

# ─────────────────────────────────────────────
#  Transcription
# ─────────────────────────────────────────────

def transcribe_audio(audio_path: str) -> dict:
    import whisper
    import whisper.audio          # ← import the submodule
    import imageio_ffmpeg
    import os

    print("[2/5] Transcribing with Whisper...")

    # ── Fix: patch Whisper's ffmpeg command to use imageio_ffmpeg's binary ──
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

    # Whisper builds its ffmpeg command in audio.py as ["ffmpeg", ...]
    # We monkey-patch load_audio to replace "ffmpeg" with the full path
    original_load_audio = whisper.audio.load_audio

    def patched_load_audio(file, sr=16000):
        import numpy as np
        from subprocess import run, CalledProcessError

        cmd = [
            ffmpeg_path,
            "-nostdin",
            "-threads", "0",
            "-i", file,
            "-f", "s16le",
            "-ac", "1",
            "-acodec", "pcm_s16le",
            "-ar", str(sr),
            "-",
        ]
        try:
            out = run(cmd, capture_output=True, check=True).stdout
        except CalledProcessError as e:
            raise RuntimeError(f"FFmpeg failed: {e.stderr.decode()}") from e

        return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

    # Apply patch
    whisper.audio.load_audio = patched_load_audio

    model  = whisper.load_model("base")
    result = model.transcribe(audio_path, word_timestamps=True, language="en")

    # Restore original (good practice)
    whisper.audio.load_audio = original_load_audio

    return result


def get_word_timestamps(whisper_result: dict) -> list:
    words = []
    for seg in whisper_result.get("segments", []):
        for w in seg.get("words", []):
            words.append({
                "word" : w["word"],
                "start": w["start"],
                "end"  : w["end"],
            })
    return words


# ─────────────────────────────────────────────
#  Metric 1: Speaking Rate
# ─────────────────────────────────────────────

def evaluate_speaking_rate(word_timestamps: list, duration: float) -> MetricResult:
    """Optimal presentation rate is 120–160 WPM."""
    if duration == 0 or not word_timestamps:
        return MetricResult(50.0, 0.20, "No speech detected.")

    wpm = (len(word_timestamps) / duration) * 60

    if 120 <= wpm <= 160:
        score = 100.0
    elif 100 <= wpm < 120 or 160 < wpm <= 180:
        distance = min(abs(wpm - 120), abs(wpm - 160))
        score = 100.0 - (distance / 20.0) * 25.0
    elif 80 <= wpm < 100 or 180 < wpm <= 200:
        distance = min(abs(wpm - 100), abs(wpm - 180))
        score = 75.0 - (distance / 20.0) * 25.0
    else:
        score = max(0.0, 50.0 - abs(wpm - 130) / 5.0)

    score = max(0.0, min(100.0, score))

    if wpm < 100:
        tip = f"Too slow ({wpm:.0f} WPM). Aim for 120–160 WPM."
    elif wpm > 180:
        tip = f"Too fast ({wpm:.0f} WPM). Slow down to 120–160 WPM."
    else:
        tip = f"Good pace ({wpm:.0f} WPM)."

    return MetricResult(round(score, 1), 0.20, tip)


# ─────────────────────────────────────────────
#  Metric 2: Pause Analysis
# ─────────────────────────────────────────────

def evaluate_pauses(word_timestamps: list, duration: float) -> MetricResult:
    """
    Hesitation pause : 0.5 – 1.5s
    Long pause       : > 1.5s
    """
    if len(word_timestamps) < 2:
        return MetricResult(50.0, 0.25, "Not enough words to measure pauses.")

    hesitation_pauses = 0
    long_pauses = 0
    total_pause_time = 0.0

    for i in range(1, len(word_timestamps)):
        gap = word_timestamps[i]["start"] - word_timestamps[i - 1]["end"]
        if gap > 0:
            total_pause_time += gap
            if 0.5 <= gap < 1.5:
                hesitation_pauses += 1
            elif gap >= 1.5:
                long_pauses += 1

    penalty = min(50, (hesitation_pauses * 2) + (long_pauses * 5))
    score   = max(0.0, 100.0 - penalty)

    detail = (
        f"Hesitation pauses (0.5–1.5s): {hesitation_pauses}, "
        f"Long pauses (>1.5s): {long_pauses}. "
        f"Total pause time: {total_pause_time:.1f}s."
    )
    return MetricResult(round(score, 1), 0.25, detail)


# ─────────────────────────────────────────────
#  Metric 3: Fluency (Filler Words)
# ─────────────────────────────────────────────

FILLER_WORDS = {
    "um", "uh", "er", "ah", "uhh", "umm", "hmm",
    "like", "basically", "literally", "actually",
    "you know", "i mean", "sort of", "kind of",
    "so", "right", "okay", "well"
}

def evaluate_fluency(transcript: str, total_words: int) -> MetricResult:
    if total_words == 0:
        return MetricResult(50.0, 0.20, "No speech detected.")

    text_lower    = transcript.lower()
    filler_count  = 0
    found_fillers = Counter()

    for filler in FILLER_WORDS:
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            filler_count += len(matches)
            found_fillers[filler] = len(matches)

    filler_pct = (filler_count / total_words) * 100

    if filler_pct <= 2:
        score = 100.0
    elif filler_pct <= 5:
        score = 100.0 - ((filler_pct - 2) / 3.0) * 25.0
    elif filler_pct <= 10:
        score = 75.0  - ((filler_pct - 5) / 5.0) * 35.0
    else:
        score = max(0.0, 40.0 - (filler_pct - 10) * 2)

    top = ", ".join(
        [f'"{w}"×{c}' for w, c in found_fillers.most_common(3)]
    ) or "None"

    detail = (
        f"Filler words: {filler_count} ({filler_pct:.1f}% of speech). "
        f"Top fillers: {top}."
    )
    return MetricResult(round(score, 1), 0.20, detail)


# ─────────────────────────────────────────────
#  Metric 4: Word Repetitions
# ─────────────────────────────────────────────

def evaluate_repetitions(word_timestamps: list) -> MetricResult:
    if len(word_timestamps) < 3:
        return MetricResult(100.0, 0.15, "Not enough words.")

    words = [w["word"].lower().strip(".,!?") for w in word_timestamps]

    immediate_reps = sum(
        1 for i in range(1, len(words))
        if words[i] == words[i - 1] and len(words[i]) > 2
    )

    near_reps = sum(
        1 for i in range(len(words))
        if words[i] in words[max(0, i - 5):i] and len(words[i]) > 3
    )

    rep_rate = ((immediate_reps * 2) + near_reps) / len(words) * 100

    if rep_rate <= 1:
        score = 100.0
    elif rep_rate <= 3:
        score = 100.0 - ((rep_rate - 1) / 2.0) * 20.0
    elif rep_rate <= 8:
        score = 80.0  - ((rep_rate - 3) / 5.0) * 40.0
    else:
        score = max(0.0, 40.0 - (rep_rate - 8) * 3)

    detail = (
        f"Immediate repetitions: {immediate_reps}, "
        f"Near repetitions (within 5 words): {near_reps}."
    )
    return MetricResult(round(score, 1), 0.15, detail)


# ─────────────────────────────────────────────
#  Metric 5: Speech Energy
# ─────────────────────────────────────────────

def evaluate_speech_energy(audio_path: str) -> MetricResult:
    import librosa
    print("[4/5] Analyzing speech energy...")

    y, sr  = librosa.load(audio_path, sr=None)
    rms    = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]

    mean_rms = np.mean(rms)
    std_rms  = np.std(rms)
    cv       = std_rms / (mean_rms + 1e-8)

    energy_score        = min(1.0, mean_rms / 0.05) * 100
    consistency_penalty = min(40, cv * 50)
    score               = max(0.0, energy_score - consistency_penalty)

    if mean_rms < 0.01:
        detail = "Very low energy — speaks too softly or mumbles."
    elif cv > 0.8:
        detail = f"Inconsistent volume (CV={cv:.2f}). Maintain a steady tone."
    else:
        detail = f"Good vocal energy. Mean RMS: {mean_rms:.4f}, Variation: {cv:.2f}."

    return MetricResult(round(score, 1), 0.20, detail)


# ─────────────────────────────────────────────
#  Score Helpers
# ─────────────────────────────────────────────

def compute_overall_score(metrics: list) -> float:
    total_weight = sum(m.weight for m in metrics)
    weighted_sum = sum(m.score * m.weight for m in metrics)
    return round(weighted_sum / total_weight, 1)


def score_to_grade(score: float) -> str:
    if score >= 85: return "A  — Highly Confident"
    if score >= 70: return "B  — Confident"
    if score >= 55: return "C  — Moderately Confident"
    if score >= 40: return "D  — Needs Improvement"
    return                 "F  — Low Confidence"


def get_audio_duration(audio_path: str) -> float:
    import librosa
    y, sr = librosa.load(audio_path, sr=None)
    return librosa.get_duration(y=y, sr=sr)

def analyze_confidence(video_path: str) -> float:
    """
    Input  : path to a video file
    Output : confidence score (0 - 100)
    """
    audio_path = os.path.join(os.path.dirname(video_path), "temp_audio.wav")

    audio          = extract_audio(video_path, audio_path)
    whisper_result = transcribe_audio(audio)
    word_ts        = get_word_timestamps(whisper_result)
    duration       = get_audio_duration(audio)

    rate  = evaluate_speaking_rate(word_ts, duration)
    pause = evaluate_pauses(word_ts, duration)
    flu   = evaluate_fluency(whisper_result["text"], len(word_ts))
    reps  = evaluate_repetitions(word_ts)
    nrgy  = evaluate_speech_energy(audio)

    overall = compute_overall_score([rate, pause, flu, reps, nrgy])

    if os.path.exists(audio):
        os.remove(audio)

    return overall


# def analyze_confidence(video_path: str) -> dict:
#     """
#     Input  : path to a video file
#     Output : dict with overall_score (0-100) and full report
#     """
#     import os
#     audio_path = os.path.join(os.path.dirname(video_path), "temp_audio.wav")
#
#     # Step 1: Extract audio
#     audio = extract_audio(video_path, audio_path)
#
#     # Step 2: Transcribe
#     whisper_result = transcribe_audio(audio)
#     word_ts        = get_word_timestamps(whisper_result)
#     duration       = get_audio_duration(audio)
#
#     # Step 3: Evaluate all metrics
#     rate  = evaluate_speaking_rate(word_ts, duration)
#     pause = evaluate_pauses(word_ts, duration)
#     flu   = evaluate_fluency(whisper_result["text"], len(word_ts))
#     reps  = evaluate_repetitions(word_ts)
#     nrgy  = evaluate_speech_energy(audio)
#
#     # Step 4: Compute final score
#     overall = compute_overall_score([rate, pause, flu, reps, nrgy])
#     grade   = score_to_grade(overall)
#
#     report = ConfidenceReport(
#         speaking_rate  = rate,
#         pause_analysis = pause,
#         fluency        = flu,
#         repetitions    = reps,
#         speech_energy  = nrgy,
#         overall_score  = overall,
#         grade          = grade,
#         transcript     = whisper_result["text"],
#         duration_sec   = duration,
#     )
#
#     report.print_report()
#
#     # Cleanup temp audio
#     if os.path.exists(audio):
#         os.remove(audio)
#
#     return {
#         "confidence_score": overall,   # 0 – 100
#         "grade"           : grade,
#         "report"          : report.to_dict()
#     }

