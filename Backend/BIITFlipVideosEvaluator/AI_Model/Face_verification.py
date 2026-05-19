# import cv2
# from deepface import DeepFace
#
#
# def verify_face_in_video(image_path, video_path, frame_skip=10, threshold=0.65):
#
#     cap = cv2.VideoCapture(video_path)
#
#     results = []
#     frame_count = 0
#
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break
#
#         frame_count += 1
#
#         if frame_count % frame_skip != 0:
#             continue
#
#         try:
#             # SAVE TEMP FRAME (IMPORTANT FIX)
#             temp_path = "temp.jpg"
#             cv2.imwrite(temp_path, frame)
#
#             result = DeepFace.verify(
#                 img1_path=image_path,
#                 img2_path=temp_path,
#                 model_name="ArcFace",   # 🔥 MUCH BETTER THAN FACENET
#                 enforce_detection=True, # 🔥 IMPORTANT FIX
#             )
#
#             results.append(1 if result["verified"] else 0)
#
#         except Exception:
#             continue
#
#     cap.release()
#
#     if len(results) == 0:
#         return {
#             "verified": False,
#             "confidence": 0.0
#         }
#
#     score = sum(results) / len(results)
#
#     return {
#         "verified": score > threshold,
#         "confidence": round(score * 100, 2)
#     }


# import cv2
# import os
# import uuid
# from deepface import DeepFace
#
#
# def verify_face_in_video(image_path, video_path, frame_skip=10, threshold=0.65):
#
#     cap = cv2.VideoCapture(video_path)
#
#     if not cap.isOpened():
#         raise ValueError(f"Video is not opening: {video_path}")
#
#     total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
#     temp_path = f"temp_{uuid.uuid4().hex}.jpg"
#     results = []
#     frame_count = 0
#
#     try:
#         while True:
#             ret, frame = cap.read()
#             if not ret:
#                 break
#
#             frame_count += 1
#             if frame_count % frame_skip != 0:
#                 continue
#
#             try:
#                 cv2.imwrite(temp_path, frame)
#
#                 result = DeepFace.verify(
#                     img1_path=image_path,
#                     img2_path=temp_path,
#                     model_name="ArcFace",
#                     distance_metric="cosine",   # ArcFace ke saath best
#                     enforce_detection=True,
#                 )
#
#                 results.append(1 if result["verified"] else 0)
#                 print(f"  Frame {frame_count}/{total_frames} — Match: {result['verified']}", end="\r")
#
#             except Exception:
#                 continue  # face detect na ho to skip
#
#     finally:
#         cap.release()
#         if os.path.exists(temp_path):
#             os.remove(temp_path)
#
#     if not results:
#         return {"verified": False, "confidence": 0.0}
#
#     score = sum(results) / len(results)
#     return {
#         "verified": score > threshold,
#         "confidence": round(score * 100, 2),
#         "frames_checked": len(results),        # extra info
#         "matched_frames": sum(results),
#     }

import cv2
import os
import uuid
from deepface import DeepFace


def verify_face_in_video(image_path, video_path, frame_skip=30, threshold=0.65):

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Video is not opening: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    temp_path = f"temp_{uuid.uuid4().hex}.jpg"
    results = []
    frame_count = 0

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            if frame_count % frame_skip != 0:
                continue

            try:
                cv2.imwrite(temp_path, frame)

                result = DeepFace.verify(
                    img1_path=image_path,
                    img2_path=temp_path,
                    model_name="ArcFace",
                    distance_metric="cosine",
                    enforce_detection=True,
                )

                results.append(1 if result["verified"] else 0)
                print(f"  Frame {frame_count}/{total_frames} — Match: {result['verified']}", end="\r")

                # ✅ Early exit — agar confidently verify ho gaya
                if len(results) >= 20 and sum(results) / len(results) > threshold + 0.2:
                    print("\n  Early exit — face confidently verified.")
                    break

            except Exception:
                continue

    finally:
        cap.release()
        if os.path.exists(temp_path):
            os.remove(temp_path)

    if not results:
        return {"verified": False, "confidence": 0.0}

    score = sum(results) / len(results)
    return {
        "verified": score > threshold,
        "confidence": round(score * 100, 2),
        "frames_checked": len(results),
        "matched_frames": sum(results),
    }