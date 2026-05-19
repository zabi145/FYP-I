import cv2
import numpy as np
import urllib.request
import os
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision import RunningMode

FACE_MODEL_PATH = "face_landmarker.task"
FACE_MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

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
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)

def get_head_angles(frame, face_landmarker):
    h, w   = frame.shape[:2]
    rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = face_landmarker.detect(mp_img)

    if not result.face_landmarks:
        return None, None, None

    landmarks = result.face_landmarks[0]
    face_2d   = np.array([
        [landmarks[i].x * w, landmarks[i].y * h]
        for i in LANDMARK_IDS
    ], dtype=np.float64)

    focal      = float(w)
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
        return None, None, None

    rmat, _               = cv2.Rodrigues(rot_vec)
    angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
    return angles[0], angles[1], angles[2]

def calculate_neck_movement_score(video_path, sample_every_n_frames=5):
    download_model(FACE_MODEL_URL, FACE_MODEL_PATH)

    face_landmarker = vision.FaceLandmarker.create_from_options(
        vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=FACE_MODEL_PATH),
            running_mode=RunningMode.IMAGE,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False
        )
    )

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    stable_frames = 0
    valid_frames  = 0
    frame_number  = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_number % sample_every_n_frames == 0:
            pitch, yaw, _ = get_head_angles(frame, face_landmarker)

            if pitch is not None:
                valid_frames += 1
                max_angle     = max(abs(yaw), abs(pitch))
                if max_angle < 5:
                    stable_frames += 1

        frame_number += 1

    cap.release()
    face_landmarker.close()

    if valid_frames == 0:
        return 0.0

    return round((stable_frames / valid_frames) * 100, 2)


# import cv2
# import numpy as np
# import urllib.request
# import os
# import mediapipe as mp
# from mediapipe.tasks import python as mp_python
# from mediapipe.tasks.python import vision
# from mediapipe.tasks.python.vision import RunningMode
#
# FACE_MODEL_PATH = "face_landmarker.task"
# FACE_MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
#
# FACE_3D_MODEL = np.array([
#     [0.0,     0.0,    0.0  ],
#     [0.0,  -330.0,  -65.0 ],
#     [-225.0, 170.0, -135.0],
#     [225.0,  170.0, -135.0],
#     [-150.0,-150.0, -125.0],
#     [150.0, -150.0, -125.0],
# ], dtype=np.float64)
#
# LANDMARK_IDS = [1, 152, 263, 33, 287, 57]
#
# def download_model(url, path):
#     if not os.path.exists(path):
#         urllib.request.urlretrieve(url, path)
#
# def get_head_angles(frame, face_landmarker):
#     h, w   = frame.shape[:2]
#     rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
#     result = face_landmarker.detect(mp_img)
#
#     if not result.face_landmarks:
#         return None, None, None
#
#     landmarks = result.face_landmarks[0]
#     face_2d   = np.array([
#         [landmarks[i].x * w, landmarks[i].y * h]
#         for i in LANDMARK_IDS
#     ], dtype=np.float64)
#
#     focal      = float(w)
#     cam_matrix = np.array([
#         [focal, 0,     w / 2.0],
#         [0,     focal, h / 2.0],
#         [0,     0,     1.0    ]
#     ], dtype=np.float64)
#
#     success, rot_vec, _ = cv2.solvePnP(
#         FACE_3D_MODEL, face_2d,
#         cam_matrix, np.zeros((4, 1), dtype=np.float64),
#         flags=cv2.SOLVEPNP_ITERATIVE
#     )
#
#     if not success:
#         return None, None, None
#
#     rmat, _               = cv2.Rodrigues(rot_vec)
#     angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
#     return angles[0], angles[1], angles[2]
#
#
# def calculate_neck_movement_score(video_path, sample_every_n_frames=5):
#     """
#     Score matlab:
#       100 = bilkul stable, neck movement nahi
#         0 = bohot zyada neck movement
#
#     Logic:
#       - Har frame ka pitch aur yaw collect karo
#       - Unka standard deviation nikalo (variation measure)
#       - Zyada variation = zyada movement = kam score
#     """
#     download_model(FACE_MODEL_URL, FACE_MODEL_PATH)
#
#     face_landmarker = vision.FaceLandmarker.create_from_options(
#         vision.FaceLandmarkerOptions(
#             base_options=mp_python.BaseOptions(model_asset_path=FACE_MODEL_PATH),
#             running_mode=RunningMode.IMAGE,
#             num_faces=1,
#             min_face_detection_confidence=0.5,
#             min_face_presence_confidence=0.5,
#             min_tracking_confidence=0.5,
#             output_face_blendshapes=False,
#             output_facial_transformation_matrixes=False
#         )
#     )
#
#     cap = cv2.VideoCapture(video_path)
#     if not cap.isOpened():
#         raise FileNotFoundError(f"Cannot open video: {video_path}")
#
#     pitch_list = []
#     yaw_list   = []
#     frame_number = 0
#
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break
#
#         if frame_number % sample_every_n_frames == 0:
#             pitch, yaw, _ = get_head_angles(frame, face_landmarker)
#             if pitch is not None:
#                 pitch_list.append(pitch)
#                 yaw_list.append(yaw)
#
#         frame_number += 1
#
#     cap.release()
#     face_landmarker.close()
#
#     if len(pitch_list) < 2:
#         return 0.0
#
#     # ✅ Standard deviation = kitna hila head overall
#     pitch_std = np.std(pitch_list)
#     yaw_std   = np.std(yaw_list)
#
#     # Dono mein se jo zyada movement hai wo lo
#     max_std = max(pitch_std, yaw_std)
#
#     # ✅ Score convert karo:
#     # 0  std  → 100 score  (bilkul stable)
#     # 15 std  →   0 score  (bohot zyada hila)
#     # 15 degree std = bohot excessive movement for a presentation
#     score = max(0.0, 100.0 - (max_std / 15.0) * 100.0)
#
#     return round(score, 2)