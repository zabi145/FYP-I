import os
from AI_Model.Face_verification import verify_face_in_video
from AI_Model.Eye_contact import calculate_eye_contact_score
from AI_Model.Neck_movement import calculate_neck_movement_score
from AI_Model.Confidence import analyze_confidence


def calculate_award_score(eye_contact: float, neck_movement: float, confidence_score: float) -> float:
    """
    Weights:
      Eye Contact      — 35%
      Neck Movement    — 25%
      Confidence Score — 40%
    """
    weighted = (
            (eye_contact * 0.35) +
            (neck_movement * 0.25) +
            (confidence_score * 0.40)
    )
    return round(weighted / 10, 1)


def run_pipeline(image_path: str, video_path: str) -> dict:
    print(f"\n{'=' * 55}")
    print(f"  PIPELINE START")
    print(f"  Video : {os.path.basename(video_path)}")
    print(f"{'=' * 55}")

    # ──────────────────────────────────────────
    # STEP 1: Face Verification
    # ──────────────────────────────────────────
    print("\n[STEP 1/4] Face Verification...")
    face_result = verify_face_in_video(image_path, video_path)

    if not face_result["verified"]:
        print("  ✗ Face NOT verified — pipeline short-circuited.")
        return {
            "face_verification": False,
            "eye_contact": 0,
            "neck_movement": 0,
            "confidence_score": 0,
            "award_score": 0,
        }

    print(f"  ✓ Face verified  (confidence: {face_result['confidence']}%)")

    # ──────────────────────────────────────────
    # STEP 2: Eye Contact
    # ──────────────────────────────────────────
    print("\n[STEP 2/4] Eye Contact Analysis...")
    eye_score = calculate_eye_contact_score(video_path)
    print(f"  ✓ Eye Contact Score : {eye_score}%")

    # ──────────────────────────────────────────
    # STEP 3: Neck Movement
    # ──────────────────────────────────────────
    print("\n[STEP 3/4] Neck Movement Analysis...")
    neck_score = calculate_neck_movement_score(video_path)
    print(f"  ✓ Neck Stability Score : {neck_score}%")

    # ──────────────────────────────────────────
    # STEP 4: Confidence (Speech Analysis)
    # ──────────────────────────────────────────
    print("\n[STEP 4/4] Confidence / Speech Analysis...")
    confidence_score = analyze_confidence(video_path)
    print(f"  ✓ Confidence Score : {confidence_score}%")

    # ──────────────────────────────────────────
    # FINAL AWARD SCORE
    # ──────────────────────────────────────────
    award_score = calculate_award_score(eye_score, neck_score, confidence_score)

    output = {
        "face_verification": True,
        "eye_contact": eye_score,
        "neck_movement": neck_score,
        "confidence_score": confidence_score,
        "award_score": award_score,  # 0 - 10
    }

    print(f"\n{'=' * 55}")
    print(f"  FINAL RESULTS")
    print(f"{'=' * 55}")
    print(f"  Face Verification : {output['face_verification']}")
    print(f"  Eye Contact       : {output['eye_contact']}%")
    print(f"  Neck Movement     : {output['neck_movement']}%")
    print(f"  Confidence Score  : {output['confidence_score']}%")
    print(f"  Award Score       : {output['award_score']} / 10")
    print(f"{'=' * 55}\n")

    return output

# image_path="Media/2022-ARID-005.png"
# video_path="Media/Expository.mp4"
#
# print(run_pipeline(image_path, video_path))
#
# #
# # result=verify_face_in_video(image_path,video_path)
# result1=analyze_confidence(video_path)
# print(result1)


