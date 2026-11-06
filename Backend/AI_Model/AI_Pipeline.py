import os
import time
from AI_Model.Face_verification import verify_face_in_video
from AI_Model.Confidence import analyze_confidence
from AI_Model.Face_analysis import analyze_face_video
from AI_Model.Topic_relevance import check_topic_relevance


def calculate_award_score(eye_contact: float, neck_movement: float, confidence_score: float, topic_relevance: float):
    """
    Weights:
      Eye Contact      — 20%
      Neck Stability   — 15%   (neck_movement holds the stability score, 100 = best)
      Confidence Score — 30%    
      Topic Relevance  — 35%
    """
    weighted = (
            (eye_contact * 0.20) +
            (neck_movement * 0.15) +
            (confidence_score * 0.30) +
            (topic_relevance * 0.35)
    )
    return round(weighted / 10, 1)


def run_pipeline(image_path: str, video_path: str, topic_text: str) -> dict:
    total_start = time.time()

    print(f"\n{'=' * 55}")
    print(f"  PIPELINE START")
    print(f"  Video : {os.path.basename(video_path)}")
    print(f"{'=' * 55}")

    # ──────────────────────────────────────────
    # STEP 1: Face Verification
    # ──────────────────────────────────────────
    print("\n[STEP 1/4] Face Verification...")
    step_start = time.time()

    face_result = verify_face_in_video(image_path, video_path)

    face_time = round(time.time() - step_start, 1)
    print("  Time taken:", face_time, "sec")

    if not face_result["verified"]:

        # Show the reason: not enough frames, or a real mismatch
        if face_result["enough_frames"] == False:
            print("  ✗ Not enough face frames — needs teacher review.")
        else:
            print("  ✗ Face NOT verified — identity mismatch.")

        print("  Confidence      :", face_result["confidence"], "%")
        print("  Frames checked  :", face_result["frames_checked"])
        print("  Matched frames  :", face_result["matched_frames"])
        print("  No face frames  :", face_result["no_face_frames"])
        print("  Multiple faces  :", face_result["multiple_face_frames"], "frames")

        return {
            "face_verification": False,
            "face_confidence": face_result["confidence"],
            "eye_contact": 0,
            "neck_movement": 0,
            "confidence_score": 0,
            "award_score": 0,
            "topic_relevance": None,
            "on_topic": None,
            "topic_reason": None,
        }

    print(f" Face verified  (confidence: {face_result['confidence']}%)")

    # ──────────────────────────────────────────
    # STEP 2: Eye Contact + Neck Stability
    # ──────────────────────────────────────────
    print("\n[STEP 2/4] Eye Contact + Neck Stability Analysis...")
    step_start = time.time()

    face_analysis = analyze_face_video(video_path)
    eye_score = face_analysis["eye_contact"]
    neck_score = face_analysis["neck_movement"]

    analysis_time = round(time.time() - step_start, 1)
    print(f" Eye Contact Score    : {eye_score}%")
    print(f" Neck Stability Score : {neck_score}%")
    print("  Time taken:", analysis_time, "sec")

    # ──────────────────────────────────────────
    # STEP 3: Confidence (Speech Analysis)
    # ──────────────────────────────────────────
    print("\n[STEP 3/4] Confidence / Speech Analysis...")
    step_start = time.time()

    speech = analyze_confidence(video_path)
    confidence_score = speech["confidence"]
    transcript = speech["transcript"]

    speech_time = round(time.time() - step_start, 1)
    print(f" Confidence Score : {confidence_score}%")
    print("  Time taken:", speech_time, "sec")

    # ──────────────────────────────────────────
    # STEP 4: Topic Relevance (offline LLM)
    # ──────────────────────────────────────────
    print("\n[STEP 4/4] Topic Relevance...")
    step_start = time.time()

    topic = check_topic_relevance(topic_text, transcript)

    topic_time = round(time.time() - step_start, 1)
    print(f" Topic Relevance : {topic['relevance']}%  (on topic: {topic['on_topic']})")
    print("  Reason:", topic["reason"])
    print("  Time taken:", topic_time, "sec")

    # ──────────────────────────────────────────
    # FINAL AWARD SCORE (topic relevance does not change marks yet)
    # ──────────────────────────────────────────
    award_score = calculate_award_score(eye_score, neck_score, confidence_score,topic["relevance"])

    output = {
        "face_verification": True,
        "eye_contact": eye_score,
        "neck_movement": neck_score,      # this is the stability score (100 = best)
        "confidence_score": confidence_score,
        "award_score": award_score,       # 0 - 10
        "topic_relevance": topic["relevance"],
        "on_topic": topic["on_topic"],
        "topic_reason": topic["reason"],
    }

    total_time = round(time.time() - total_start, 1)

    print(f"\n{'=' * 55}")
    print(f"  FINAL RESULTS")
    print(f"{'=' * 55}")
    print(f"  Face Verification : {output['face_verification']}")
    print(f"  Eye Contact       : {output['eye_contact']}%")
    print(f"  Neck Stability    : {output['neck_movement']}%")
    print(f"  Confidence Score  : {output['confidence_score']}%")
    print(f"  Topic Relevance   : {output['topic_relevance']}%")
    print(f"  Award Score       : {output['award_score']} / 10")
    print(f"{'-' * 55}")
    print(f"  TIME (sec)  Face: {face_time} | Eye+Neck: {analysis_time} | Speech: {speech_time} | Topic: {topic_time} | TOTAL: {total_time}")
    print(f"{'=' * 55}\n")

    return output