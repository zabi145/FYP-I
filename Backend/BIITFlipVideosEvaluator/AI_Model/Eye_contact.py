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

def download_model(url, path):
    if not os.path.exists(path):
        urllib.request.urlretrieve(url, path)

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

def eye_aspect_ratio(landmarks, top, bottom, left, right):
    vertical   = abs(landmarks[top].y   - landmarks[bottom].y)
    horizontal = abs(landmarks[left].x  - landmarks[right].x)
    if horizontal == 0:
        return 0.0
    return vertical / horizontal

def calculate_gaze(landmarks, eye_left, eye_right, eye_top, eye_bottom, iris_center):
    eye_width  = abs(landmarks[eye_right].x - landmarks[eye_left].x)
    eye_height = abs(landmarks[eye_bottom].y - landmarks[eye_top].y)
    if eye_width == 0 or eye_height == 0:
        return 0.0, 0.0
    gaze_h = ((landmarks[iris_center].x - landmarks[eye_left].x) / eye_width)  - 0.5
    gaze_v = ((landmarks[iris_center].y - landmarks[eye_top].y)  / eye_height) - 0.5
    return gaze_h, gaze_v

def calculate_eye_contact_score(
    video_path,
    gaze_threshold_h   = 0.10,
    gaze_threshold_v   = 0.12,
    ear_threshold      = 0.15,
    sample_every_n     = 5
):
    download_model(FACE_MODEL_URL, FACE_MODEL_PATH)

    face_options = vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=FACE_MODEL_PATH),
        running_mode=RunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False
    )
    face_landmarker = vision.FaceLandmarker.create_from_options(face_options)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    eye_contact_frames = 0
    valid_frames       = 0
    frame_number       = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_number % sample_every_n == 0:
            rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = face_landmarker.detect(mp_img)

            if result.face_landmarks:
                lm = result.face_landmarks[0]

                left_ear  = eye_aspect_ratio(lm, LEFT_EYE_TOP,  LEFT_EYE_BOTTOM,  LEFT_EYE_LEFT,  LEFT_EYE_RIGHT)
                right_ear = eye_aspect_ratio(lm, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT)

                lg_h, lg_v = calculate_gaze(lm, LEFT_EYE_LEFT,  LEFT_EYE_RIGHT,  LEFT_EYE_TOP,  LEFT_EYE_BOTTOM,  LEFT_IRIS_CENTER)
                rg_h, rg_v = calculate_gaze(lm, RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT, RIGHT_EYE_TOP, RIGHT_EYE_BOTTOM, RIGHT_IRIS_CENTER)

                avg_gaze_h = (lg_h + rg_h) / 2
                avg_gaze_v = (lg_v + rg_v) / 2

                eyes_open         = (left_ear > ear_threshold) and (right_ear > ear_threshold)
                looking_at_camera = abs(avg_gaze_h) <= gaze_threshold_h and abs(avg_gaze_v) <= gaze_threshold_v

                valid_frames += 1
                if eyes_open and looking_at_camera:
                    eye_contact_frames += 1

        frame_number += 1

    cap.release()
    face_landmarker.close()

    if valid_frames == 0:
        return 0.0

    return round((eye_contact_frames / valid_frames) * 100, 2)
