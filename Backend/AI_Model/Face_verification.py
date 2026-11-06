# import cv2
# from deepface import DeepFace


# def verify_face_in_video(image_path, video_path, seconds_gap=1, threshold=0.65):

#     # Step 1: Video open karo
#     cap = cv2.VideoCapture(video_path)
#     if not cap.isOpened():
#         raise ValueError(f"Video is not opening: {video_path}")

#     # Step 2: Fps se frame gap nikalo (har seconds_gap second baad ek frame)
#     fps = cap.get(cv2.CAP_PROP_FPS)
#     if fps == 0:
#         fps = 30
#     frame_gap = int(fps * seconds_gap)

#     # Step 3: Counters
#     frame_number = 0
#     matched_frames = 0
#     not_matched_frames = 0
#     no_face_frames = 0

#     try:
#         # Step 4: Poori video frame by frame check karo
#         while True:
#             ret, frame = cap.read()
#             if not ret:
#                 break

#             frame_number = frame_number + 1
#             if frame_number % frame_gap != 0:
#                 continue

#             try:
#                 # Frame seedha DeepFace ko do, file save karne ki zaroorat nahi
#                 result = DeepFace.verify(
#                     img1_path=image_path,
#                     img2_path=frame,
#                     model_name="ArcFace",
#                     distance_metric="cosine",
#                     enforce_detection=True,
#                 )

#                 if result["verified"]:
#                     matched_frames = matched_frames + 1
#                 else:
#                     not_matched_frames = not_matched_frames + 1

#             except ValueError:
#                 # Is frame mein face detect nahi hua
#                 no_face_frames = no_face_frames + 1

#             except Exception as error:
#                 # Koi aur asli problem ho to print karo, chhupao mat
#                 print("Unexpected error:", error)

#     finally:
#         cap.release()

#     # Step 5: Final score (sirf un frames pe jin mein face mila)
#     frames_checked = matched_frames + not_matched_frames

#     if frames_checked > 0:
#         score = matched_frames / frames_checked
#     else:
#         score = 0.0

#     # Step 6: Hamesha same keys wapas karo
#     return {
#         "verified": score > threshold,
#         "confidence": round(score * 100, 2),
#         "frames_checked": frames_checked,
#         "matched_frames": matched_frames,
#         "no_face_frames": no_face_frames,
#     }



import cv2
import numpy as np
from deepface import DeepFace


def verify_face_in_video(
    image_path,
    video_path,
    seconds_gap=1,
    threshold=0.65,          # kitne % frames match hon
    max_frames=40,           # zyada se zyada itne frames check honge
    max_width=640,           # frame isse chowra ho to chhota kar do
    distance_limit=0.68,     # ArcFace + cosine ka default threshold
    min_frames_required=5,   # faisle ke liye kam az kam itne frames chahiye
    target_frames=15,        # chhoti video mein bhi kam az kam itne frames check hon
):
    model_name = "ArcFace"

    # Step 1: Reference photo ki embedding sirf ek baar nikalo
    reference_result = DeepFace.represent(
        img_path=image_path,
        model_name=model_name,
        enforce_detection=True,
    )
    reference_embedding = np.array(reference_result[0]["embedding"])

    # Step 2: Video open karo
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Video is not opening: {video_path}")

    # Step 3: Frame gap nikalo
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Normal gap (har 1 second)
    frame_gap = int(fps * seconds_gap)

    # Lambi video: gap barha do taake max_frames se zyada check na hon
    long_video_gap = total_frames // max_frames
    if long_video_gap > frame_gap:
        frame_gap = long_video_gap

    # Chhoti video: gap kam kar do taake kam az kam target_frames check hon
    short_video_gap = total_frames // target_frames
    if short_video_gap < frame_gap and short_video_gap < int(fps * seconds_gap):
        frame_gap = short_video_gap

    # Gap kabhi 0 nahi hona chahiye
    if frame_gap < 1:
        frame_gap = 1

    # Step 4: Counters
    frame_number = 0
    matched_frames = 0
    not_matched_frames = 0
    no_face_frames = 0
    multiple_face_frames = 0

    try:
        while True:
            # grab() sirf agla frame le leta hai, retrieve() decode karta hai
            ret = cap.grab()
            if not ret:
                break

            frame_number = frame_number + 1
            if frame_number % frame_gap != 0:
                continue

            ret, frame = cap.retrieve()
            if not ret:
                continue

            # Bara frame ho to chhota kar do (detection tez hoti hai)
            height, width = frame.shape[:2]
            if width > max_width:
                scale = max_width / width
                new_height = int(height * scale)
                frame = cv2.resize(frame, (max_width, new_height))

            try:
                faces = DeepFace.represent(
                    img_path=frame,
                    model_name=model_name,
                    enforce_detection=True,
                )
            except ValueError:
                # Is frame mein chehra nahi mila
                no_face_frames = no_face_frames + 1
                continue
            except Exception as error:
                print("Unexpected error:", error)
                continue

            # Ek se zyada chehre hon to sirf ginti karo (information ke liye)
            if len(faces) > 1:
                multiple_face_frames = multiple_face_frames + 1

            # Har chehre ka distance nikalo, sab se kam distance lo
            best_distance = 1.0
            for face in faces:
                face_embedding = np.array(face["embedding"])
                dot_product = np.dot(face_embedding, reference_embedding)
                norm_product = np.linalg.norm(face_embedding) * np.linalg.norm(reference_embedding)
                distance = 1 - (dot_product / norm_product)

                if distance < best_distance:
                    best_distance = distance

            # Kam az kam ek chehra match kare to frame "match" hai
            if best_distance <= distance_limit:
                matched_frames = matched_frames + 1
            else:
                not_matched_frames = not_matched_frames + 1

    finally:
        cap.release()

    # Step 5: Final score (sirf un frames pe jin mein chehra mila)
    frames_checked = matched_frames + not_matched_frames

    if frames_checked > 0:
        score = matched_frames / frames_checked
    else:
        score = 0.0

    # Step 6: Kya faisle ke liye kaafi frames the?
    if frames_checked >= min_frames_required:
        enough_frames = True
    else:
        enough_frames = False

    # Verified tabhi jab frames kaafi hon aur percentage acha ho
    if enough_frames and score > threshold:
        verified = True
    else:
        verified = False

    # Step 7: Hamesha same keys wapas karo
    return {
        "verified": verified,
        "confidence": round(score * 100, 2),
        "frames_checked": frames_checked,
        "matched_frames": matched_frames,
        "no_face_frames": no_face_frames,
        "multiple_face_frames": multiple_face_frames,
        "enough_frames": enough_frames,
    }