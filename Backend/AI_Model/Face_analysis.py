import cv2
import numpy as np
import os
import urllib.request

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import RunningMode

FACE_MODEL_PATH = "face_landmarker.task"
FACE_MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

# ---------------- Aankh ke landmark numbers ----------------
LEFT_EYE_TOP     = 159
LEFT_EYE_BOTTOM  = 145
LEFT_EYE_LEFT    = 33
LEFT_EYE_RIGHT   = 133
LEFT_IRIS_CENTER = 468

RIGHT_EYE_TOP     = 386
RIGHT_EYE_BOTTOM  = 374
RIGHT_EYE_LEFT    = 362
RIGHT_EYE_RIGHT   = 263
RIGHT_IRIS_CENTER = 473

# ---------------- Sar ka angle nikalne ke liye ----------------
FACE_3D_MODEL = np.array([
    [0.0,     0.0,    0.0  ],
    [0.0,  -330.0,  -65.0 ],
    [-225.0, 170.0, -135.0],
    [225.0,  170.0, -135.0],
    [-150.0,-150.0, -125.0],
    [150.0, -150.0, -125.0],
], dtype=np.float64)

LANDMARK_IDS = [1, 152, 263, 33, 287, 57]


def download_model(url, path):
    # Model file na ho to download karo
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)


# =====================================================
#                  EYE CONTACT HELPERS
# =====================================================
def eye_aspect_ratio(landmarks, top, bottom, left, right):
    # Aankh kitni khuli hai (chhota number = aankh band ya jhuki hui)
    vertical = abs(landmarks[top].y - landmarks[bottom].y)
    horizontal = abs(landmarks[left].x - landmarks[right].x)
    if horizontal == 0:
        return 0.0
    return vertical / horizontal


def calculate_gaze(landmarks, eye_left, eye_right, eye_top, eye_bottom, iris_center):
    # Iris aankh ke andar kahan hai (0 = bilkul beech mein)
    eye_width = abs(landmarks[eye_right].x - landmarks[eye_left].x)
    eye_height = abs(landmarks[eye_bottom].y - landmarks[eye_top].y)
    if eye_width == 0 or eye_height == 0:
        return 0.0, 0.0
    gaze_h = ((landmarks[iris_center].x - landmarks[eye_left].x) / eye_width) - 0.5
    gaze_v = ((landmarks[iris_center].y - landmarks[eye_top].y) / eye_height) - 0.5
    return gaze_h, gaze_v


def get_blendshape_score(blendshapes, name):
    # Blendshape list mein naam ke hisaab se score dhoondo (0 se 1)
    for item in blendshapes:
        if item.category_name == name:
            return item.score
    return 0.0


def get_side_score(blendshapes):
    # Aankhein left ya right kitni side mein hain (0 = seedha, 1 = bilkul side)
    out_left = get_blendshape_score(blendshapes, "eyeLookOutLeft")
    in_left = get_blendshape_score(blendshapes, "eyeLookInLeft")
    out_right = get_blendshape_score(blendshapes, "eyeLookOutRight")
    in_right = get_blendshape_score(blendshapes, "eyeLookInRight")

    looking_one_way = (out_right + in_left) / 2
    looking_other_way = (out_left + in_right) / 2

    if looking_one_way > looking_other_way:
        return looking_one_way
    return looking_other_way


def score_eye_labels(labels, max_blink_samples, max_glance_samples, max_glance_share):
    # Har sample ke label se final eye contact score nikalta hai

    # Step A: "closed" streaks ko blink ya down mein badlo
    blink_frames = 0
    i = 0
    while i < len(labels):
        if labels[i] == "closed":
            j = i
            while j < len(labels) and labels[j] == "closed":
                j = j + 1
            streak_length = j - i

            if streak_length <= max_blink_samples:
                new_label = "blink"      # chhoti band aankh: blink
                blink_frames = blink_frames + streak_length
            else:
                new_label = "down"       # lambi jhuki aankh: neeche dekhna

            k = i
            while k < j:
                labels[k] = new_label
                k = k + 1
            i = j
        else:
            i = i + 1

    # Step B: Neeche dekhne ki streaks check karo
    camera_frames = 0
    glance_frames = 0     # chhoti nazar notes ki taraf (allowed)
    away_frames = 0       # penalty wale frames

    i = 0
    while i < len(labels):
        if labels[i] == "down":
            j = i
            while j < len(labels) and labels[j] == "down":
                j = j + 1
            streak_length = j - i

            if streak_length <= max_glance_samples:
                glance_frames = glance_frames + streak_length
            else:
                away_frames = away_frames + streak_length
            i = j

        elif labels[i] == "camera":
            camera_frames = camera_frames + 1
            i = i + 1

        elif labels[i] == "blink":
            i = i + 1                     # blink ginti se bahar

        else:
            away_frames = away_frames + 1
            i = i + 1

    # Step C: Glance bohat zyada ho to wo bhi penalty
    total_labeled = camera_frames + glance_frames + away_frames
    if total_labeled > 0:
        glance_share = glance_frames / total_labeled
        if glance_share > max_glance_share:
            away_frames = away_frames + glance_frames
            glance_frames = 0

    print("  Eye -> Camera:", camera_frames, "| Notes glance:", glance_frames,
          "| Away:", away_frames, "| Blink:", blink_frames)

    # Step D: Score (glance aur blink ginti se bahar)
    counted_frames = camera_frames + away_frames
    if counted_frames == 0:
        return 0.0

    return round((camera_frames / counted_frames) * 100, 2)


# =====================================================
#                  NECK MOVEMENT HELPERS
# =====================================================
def angle_difference(angle1, angle2):
    # Do angles ka farq, -180 se 180 ke darmiyan
    difference = angle1 - angle2
    while difference > 180:
        difference = difference - 360
    while difference < -180:
        difference = difference + 360
    return difference


def get_head_angles(landmarks, w, h):
    # Landmarks se sar ke pitch aur yaw angles nikalta hai (degrees mein)
    face_points = []
    for landmark_id in LANDMARK_IDS:
        x = landmarks[landmark_id].x * w
        y = landmarks[landmark_id].y * h
        face_points.append([x, y])
    face_2d = np.array(face_points, dtype=np.float64)

    focal = float(w)
    cam_matrix = np.array([
        [focal, 0,     w / 2.0],
        [0,     focal, h / 2.0],
        [0,     0,     1.0    ]
    ], dtype=np.float64)

    success, rot_vec, _ = cv2.solvePnP(
        FACE_3D_MODEL, face_2d,
        cam_matrix, np.zeros((4, 1), dtype=np.float64),
        flags=cv2.SOLVEPNP_ITERATIVE
    )

    if not success:
        return None, None

    rmat, _ = cv2.Rodrigues(rot_vec)
    angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)

    pitch = angles[0]
    yaw = angles[1]

    # Kabhi kabhi pitch 180 ke qareeb ulta aa jata hai, usay seedha karo
    if pitch > 90:
        pitch = pitch - 180
    if pitch < -90:
        pitch = pitch + 180

    return pitch, yaw


# =====================================================
#                  MAIN FUNCTION
# =====================================================
def analyze_face_video(
    video_path,
    sample_every_n=5,
    # ---- Eye contact settings ----
    gaze_threshold_h=0.10,
    gaze_threshold_v=0.12,
    ear_threshold=0.15,
    max_blink_seconds=0.5,     # isse chhoti band aankh = blink
    max_glance_seconds=3.0,    # notes ki taraf itni der dekhna theek hai
    max_glance_share=0.30,     # glance is % se zyada ho to penalty
    down_threshold=0.55,       # look-down score isse upar = neeche dekh raha hai
    side_threshold=0.20,       # side score isse upar = left right dekh raha hai
    # ---- Neck settings ----
    max_angle=30,              # is se zyada ghoomna ya jhukna abnormal hai (degree)
    max_speed=60,              # is se tez harkat jhatka hai (degree per second)
):
    """
    Video ek hi baar parh kar dono scores nikalta hai:
      eye_contact  : 100 = camera dekha, 0 = bilkul nahi
      neck_movement: NECK STABILITY, 100 = sar ki harkat normal, 0 = bohat jhatke
    """
    download_model(FACE_MODEL_URL, FACE_MODEL_PATH)

    face_options = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=FACE_MODEL_PATH),
        running_mode=RunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=True,
        output_facial_transformation_matrixes=False
    )
    face_landmarker = vision.FaceLandmarker.create_from_options(face_options)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    # Ek sample kitne second ka hai
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30
    seconds_per_sample = sample_every_n / fps

    # Blink aur glance ki hadd samples mein
    max_blink_samples = int(max_blink_seconds / seconds_per_sample)
    if max_blink_samples < 1:
        max_blink_samples = 1

    max_glance_samples = int(max_glance_seconds / seconds_per_sample)
    if max_glance_samples < 1:
        max_glance_samples = 1

    # ---- Eye ka data ----
    labels = []

    # ---- Neck ka data ----
    normal_frames = 0
    jerky_frames = 0
    extreme_frames = 0
    neck_valid_frames = 0
    previous_pitch = None
    previous_yaw = None

    frame_number = 0

    # ---------------- Video ek hi baar parho ----------------
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_number % sample_every_n == 0:
            h, w = frame.shape[:2]
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            # MediaPipe sirf ek baar chalta hai, dono kaam isi se
            result = face_landmarker.detect(mp_img)

            if result.face_landmarks:
                lm = result.face_landmarks[0]

                # ================= EYE CONTACT =================
                look_down = 0.0
                side_score = 0.0
                if result.face_blendshapes:
                    shapes = result.face_blendshapes[0]
                    down_left = get_blendshape_score(shapes, "eyeLookDownLeft")
                    down_right = get_blendshape_score(shapes, "eyeLookDownRight")
                    look_down = (down_left + down_right) / 2
                    side_score = get_side_score(shapes)

                left_ear = eye_aspect_ratio(lm, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_EYE_LEFT, LEFT_EYE_RIGHT)
                right_ear = eye_aspect_ratio(lm, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT)

                if look_down > down_threshold:
                    labels.append("down")

                elif left_ear <= ear_threshold or right_ear <= ear_threshold:
                    labels.append("closed")

                elif side_score > side_threshold:
                    labels.append("away")

                else:
                    lg_h, lg_v = calculate_gaze(lm, LEFT_EYE_LEFT, LEFT_EYE_RIGHT, LEFT_EYE_TOP, LEFT_EYE_BOTTOM, LEFT_IRIS_CENTER)
                    rg_h, rg_v = calculate_gaze(lm, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_IRIS_CENTER)

                    avg_gaze_h = (lg_h + rg_h) / 2
                    avg_gaze_v = (lg_v + rg_v) / 2

                    if abs(avg_gaze_h) <= gaze_threshold_h and abs(avg_gaze_v) <= gaze_threshold_v:
                        labels.append("camera")
                    elif avg_gaze_v > gaze_threshold_v:
                        labels.append("down")
                    else:
                        labels.append("away")

                # ================= NECK MOVEMENT =================
                pitch, yaw = get_head_angles(lm, w, h)

                if pitch is not None:
                    neck_valid_frames = neck_valid_frames + 1

                    # Check 1: kya angle intehai hai?
                    is_extreme = False
                    if abs(pitch) > max_angle or abs(yaw) > max_angle:
                        is_extreme = True

                    # Check 2: kya pichle sample se tez jhatka aya?
                    is_jerky = False
                    if previous_pitch is not None:
                        pitch_change = abs(angle_difference(pitch, previous_pitch))
                        yaw_change = abs(angle_difference(yaw, previous_yaw))

                        biggest_change = pitch_change
                        if yaw_change > biggest_change:
                            biggest_change = yaw_change

                        speed = biggest_change / seconds_per_sample
                        if speed > max_speed:
                            is_jerky = True

                    if is_extreme:
                        extreme_frames = extreme_frames + 1
                    elif is_jerky:
                        jerky_frames = jerky_frames + 1
                    else:
                        normal_frames = normal_frames + 1

                    previous_pitch = pitch
                    previous_yaw = yaw

        frame_number = frame_number + 1

    cap.release()
    face_landmarker.close()

    # ---------------- Final scores ----------------
    eye_score = score_eye_labels(labels, max_blink_samples, max_glance_samples, max_glance_share)

    print("  Neck -> Normal:", normal_frames, "| Jerky:", jerky_frames, "| Extreme:", extreme_frames)

    if neck_valid_frames == 0:
        neck_score = 0.0
    else:
        neck_score = round((normal_frames / neck_valid_frames) * 100, 2)

    return {
        "eye_contact": eye_score,
        "neck_movement": neck_score,   # ye STABILITY score hai (100 = best)
    }