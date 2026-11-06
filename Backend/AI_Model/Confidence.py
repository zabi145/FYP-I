import os
import re
import subprocess
import numpy as np
import librosa
import whisper
import imageio_ffmpeg

# Load the Whisper model only once (not for every video).
# "base" is fast. Use "small" for better accuracy (but slower).
whisper_model = whisper.load_model("base")

# Only real filler words. Normal words like "so", "well", "like" are not counted.
FILLER_WORDS = ["um", "umm", "uh", "uhh", "er", "ah", "hmm", "you know", "i mean"]


def extract_audio(video_path, audio_path):
    # Convert the video to a 16 kHz mono wav file using ffmpeg
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()

    command = [
        ffmpeg_path, "-y",
        "-i", os.path.abspath(video_path),
        "-ar", "16000",
        "-ac", "1",
        os.path.abspath(audio_path),
    ]

    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError("FFmpeg failed: " + result.stderr)


def get_words(whisper_result):
    # Collect every word with its start and end time
    words = []
    for segment in whisper_result.get("segments", []):
        for w in segment.get("words", []):
            words.append({"word": w["word"], "start": w["start"], "end": w["end"]})
    return words


def score_speaking_rate(word_count, duration):
    # Best speed is 120 to 160 words per minute.
    # Every 1 WPM outside this range removes 1.25 marks.
    wpm = (word_count / duration) * 60

    if wpm < 120:
        distance = 120 - wpm
    elif wpm > 160:
        distance = wpm - 160
    else:
        distance = 0

    return max(0.0, 100 - distance * 1.25)


def score_pauses(words, duration):
    # Hesitation pause = 0.5 to 1.5 sec, long pause = more than 1.5 sec
    hesitation_pauses = 0
    long_pauses = 0

    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if gap >= 1.5:
            long_pauses = long_pauses + 1
        elif gap >= 0.8:      
            hesitation_pauses = hesitation_pauses + 1

    # Penalty per minute, so long videos are not punished unfairly
    minutes = duration / 60
    penalty = (hesitation_pauses * 2 + long_pauses * 5) / minutes
    penalty = min(50, penalty)

    return 100 - penalty


def score_fluency(transcript, word_count):
    # Count real filler words in the transcript
    text = transcript.lower()
    filler_count = 0

    for filler in FILLER_WORDS:
        matches = re.findall(r"\b" + re.escape(filler) + r"\b", text)
        filler_count = filler_count + len(matches)

    filler_percent = (filler_count / word_count) * 100

    # Up to 2% fillers is fine. After that, 8 marks are removed for every 1%
    if filler_percent <= 2:
        return 100.0
    return max(0.0, 100 - (filler_percent - 2) * 8)


def score_repetitions(words):
    # Count only the same word said twice in a row (like "I I think")
    repeats = 0

    for i in range(1, len(words)):
        current = words[i]["word"].lower().strip(" .,!?")
        previous = words[i - 1]["word"].lower().strip(" .,!?")
        if current == previous and len(current) > 2:
            repeats = repeats + 1

    repeat_percent = (repeats / len(words)) * 100

    return max(0.0, 100 - repeat_percent * 15)


def score_energy(y):
    # Loudness of the voice, measured only where the person is speaking
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]

    # Keep only the speaking frames (ignore silence)
    speaking = rms[rms > 0.01]
    if len(speaking) == 0:
        return 0.0

    mean_rms = np.mean(speaking)
    variation = np.std(speaking) / mean_rms

    energy_score = min(1.0, mean_rms / 0.05) * 100
    penalty = min(40, variation * 50)

    return max(0.0, energy_score - penalty)


def analyze_confidence(video_path):
    """
    Input  : path of the video
    Output : confidence score (0 - 100)
    """
    # Separate wav file name for every video (safe for two uploads at the same time)
    audio_path = video_path + ".wav"

    try:
        extract_audio(video_path, audio_path)

        # Load the audio only once and use it everywhere
        y, sr = librosa.load(audio_path, sr=16000)
        duration = len(y) / sr

        # The prompt helps Whisper keep "um" and "uh" in the transcript
        result = whisper_model.transcribe(
            y,
            word_timestamps=True,
            language="en",
            initial_prompt="Umm, let me think, like, hmm... okay, so, uh, you know.",
        )

        words = get_words(result)

        # Almost no speech means no confidence
        if len(words) < 10:
            return {"confidence": 0.0, "transcript": result["text"]}

        rate = score_speaking_rate(len(words), duration)
        pause = score_pauses(words, duration)
        fluency = score_fluency(result["text"], len(words))
        repeats = score_repetitions(words)
        energy = score_energy(y)

        # Weights add up to 1.0
        overall = (rate * 0.20) + (pause * 0.25) + (fluency * 0.20) + (repeats * 0.15) + (energy * 0.20)
        
        return {"confidence": round(overall, 1), "transcript": result["text"]}

    finally:
        # Always delete the temporary wav file
        if os.path.exists(audio_path):
            os.remove(audio_path)
