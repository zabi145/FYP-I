import queue
import threading
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from API.db import get_db_connection
from datetime import datetime
import os
import shutil
from AI_Model.AI_Pipeline import run_pipeline

router = APIRouter()

UPLOAD_FOLDER = "API/videos"

# ================= VIDEO QUEUE =================

# Videos waiting for the AI pipeline (first in, first out)
job_queue = queue.Queue()

# Uploads that are in the queue or being processed (stops double upload)
processing_now = set()


def process_video(image_path, file_path, reg_no, assignment_id, topic_text):
    # Runs the pipeline for one video and saves the scores in the database.
    # It needs its own database connection because it runs after the response is sent.
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        ai_result = run_pipeline(image_path, file_path, topic_text)

        cursor.execute("""
            UPDATE Upload
            SET
                Eye_contact = ?,
                neck_movement = ?,
                award_score = ?,
                Confidence_score = ?,
                face_verification = ?,
                Topic_relevance = ?,
                On_topic = ?,
                Topic_reason = ?
            WHERE Reg_No = ? AND Assignment_id = ?
        """, (
            ai_result.get("eye_contact", 0),
            ai_result.get("neck_movement", 0),
            ai_result.get("award_score", 0),
            ai_result.get("confidence_score", 0),
            ai_result.get("face_verification", 0),
            ai_result.get("topic_relevance"),
            ai_result.get("on_topic"),
            ai_result.get("topic_reason"),
            reg_no,
            assignment_id
        ))

        conn.commit()

    except Exception as e:
        conn.rollback()
        print("Processing failed:", e)

    finally:
        conn.close()


def worker_loop():
    # Runs forever and takes one video at a time from the queue
    while True:
        job = job_queue.get()    # waits here when the queue is empty

        try:
            process_video(job["image_path"], job["file_path"], job["reg_no"],
                          job["assignment_id"], job["topic_text"])
        except Exception as e:
            print("Worker error:", e)
        finally:
            processing_now.discard(job["reg_no"] + "_" + str(job["assignment_id"]))
            job_queue.task_done()


# The worker thread starts when the server starts
worker_thread = threading.Thread(target=worker_loop, daemon=True)
worker_thread.start()

# ================= REQUEST MODEL =================

class StudentResultRequest(BaseModel):
    reg_no: str
    course_no: str
    current_sem: str

class StudentDashboardRequest(BaseModel):
    user_id: int

class FetchAssignmentsRequest(BaseModel):
    reg_no: str
    course_no: str
    section: str
    semester_no: str
    discipline: str
    current_sem: str

class VideoDetailRequest(BaseModel):
    reg_no: str
    assignment_id: int
    course_no: str


# ================= STUDENT DASHBOARD =================
@router.post("/student-dashboard")
def student_dashboard(data: StudentDashboardRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_datetime = datetime.now()

        cursor.execute(
            "SELECT TOP 1 Semester_no FROM Semester ORDER BY Start_date DESC"
        )
        semester = cursor.fetchone()

        if not semester:
            return {"message": "No semester found"}

        recent_semester = semester[0]

        # 🔹 Step 1: Student info
        cursor.execute("""
            SELECT Reg_No, St_firstname, St_lastname, Section, Semester_No
            FROM Student
            WHERE U_id = ?
        """, (data.user_id,))

        student = cursor.fetchone()

        if not student:
            return {"message": "Student not found"}

        reg_no       = student[0]
        student_name = f"{student[1]} {student[2]}"
        section      = student[3]
        semester     = student[4]

        # 🔹 Step 2: Courses
        cursor.execute("""
            SELECT C.Course_no, C.Course_desc , E.Discipline
            FROM Enrollment E
            JOIN Course C ON E.Course_No = C.Course_no
            WHERE E.Reg_No = ?
              AND C.flip_course = 'yes'
              AND E.Semester_No = ?
        """
            , (reg_no,recent_semester))

        courses_rows = cursor.fetchall()

        courses = []

        for row in courses_rows:

            course_no        = row[0]
            course_name      = row[1]
            discipline       = row[2]

            # 🔥 CHANGE: COUNT assignments instead of fetching list
            cursor.execute("""
                SELECT U.video_id
                FROM Assignment A
                INNER JOIN Assign ASG 
                    ON A.Assignment_id = ASG.Assignment_id

                INNER JOIN Upload U
                    ON U.Assignment_id = A.Assignment_id
                    AND U.Reg_No = ?

                WHERE 
                    ASG.Course_no = ?
                    AND A.section = ?
                    AND A.semester = ?
                    AND A.discipline = ?
                    AND A.current_sem = ?
                    AND (CAST(A.deadline_date AS DATETIME) + CAST(A.deadline_time AS DATETIME)) > ?
            """, (
                reg_no, 
                course_no,
                section,
                semester,
                discipline,
                recent_semester,
                current_datetime
            ))

            rows = cursor.fetchall()
            pending_assignments = 0
            submitted_assignments = 0

            for r in rows:
                if r.video_id== None:
                    pending_assignments+=1
                else:
                    submitted_assignments+=1

            courses.append({
                "course_no": course_no,
                "course_name": course_name,
                "current_sem": recent_semester,
                "discipline": discipline,
                "pending_assignments": pending_assignments,
                "submitted_assignments": submitted_assignments
            })

        return {
            "student_name": student_name,
            "reg_no": reg_no,
            "section": section,
            "batch_semester": semester,
            "courses": courses
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        conn.close()

# ================= FETCH ASSIGNED ASSIGNMENTS =================
@router.post("/fetch-assignments")
def fetch_assignments(data: FetchAssignmentsRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        current_datetime = datetime.now()

        cursor.execute("""
            SELECT 
                A.Assignment_id,
                A.Topic_name,
                A.Topic_description,
                A.deadline_date,
                A.deadline_time,
                U.video_id
            FROM Assignment A

            -- Course mapping
            INNER JOIN Assign ASG
                ON A.Assignment_id = ASG.Assignment_id

            -- 🔥 IMPORTANT: student-specific assignment mapping
            INNER JOIN Upload U
                ON U.Assignment_id = A.Assignment_id
                AND U.Reg_No = ?

            WHERE 
                ASG.Course_no = ?
                AND A.section = ?
                AND A.semester = ?
                AND A.discipline = ?
                AND A.current_sem = ?
                AND (CAST(A.deadline_date AS DATETIME) + CAST(A.deadline_time AS DATETIME)) > ?

            ORDER BY A.deadline_date ASC, A.deadline_time ASC
        """, (
            data.reg_no,
            data.course_no,
            data.section,
            data.semester_no,
            data.discipline,
            data.current_sem,
            current_datetime
        ))

        rows = cursor.fetchall()

        result = [
            {
                "assignment_id": r.Assignment_id,
                "topic": r.Topic_name,
                "topic_description": r.Topic_description,
                "deadline_date": str(r.deadline_date),
                "deadline_time": str(r.deadline_time),
                "video_id": r.video_id
            }
            for r in rows
        ]

        return {
            "assignments": result
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        conn.close()

# ================= UPLOAD VIDEO =================
@router.post("/upload-video")
def upload_video(
    reg_no: str = Form(...),
    section: str = Form(...),
    semester_no: str = Form(...),
    course_no: str = Form(...),
    discipline: str = Form(...),
    assignment_id: int = Form(...),
    video: UploadFile = File(...)
):

    # If this video is already in the queue or being processed, do not add it again
    upload_key = f"{reg_no}_{assignment_id}"
    if upload_key in processing_now:
        return {"error": "Your video is already being processed. Please wait."}

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 🔹 Step 1: Validate + get student image
        cursor.execute("""
            SELECT S.picture
            FROM Enrollment E
            JOIN Student S ON E.Reg_No = S.Reg_No
            WHERE S.Reg_No = ?
              AND S.Section = ?
              AND S.Semester_no = ?
              AND E.Course_No = ?
              AND E.Discipline = ?
        """, (reg_no, section, semester_no, course_no, discipline))

        row = cursor.fetchone()

        if not row:
            return {"error": "Invalid student/course data"}

        image_path = row[0]   

        if not image_path:
            return {"error": "Student image not found"}

        # 🔹 Step 2: Get the topic name and description of this assignment
        cursor.execute("""
            SELECT Topic_name, Topic_description
            FROM Assignment
            WHERE Assignment_id = ?
        """, (assignment_id,))

        topic_row = cursor.fetchone()

        if not topic_row:
            return {"error": "Assignment not found"}

        topic_text = topic_row[0]
        if topic_row[1]:
            topic_text = topic_text + ". " + topic_row[1]

        # 🔹 Step 3: Save video
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        file_path = f"{UPLOAD_FOLDER}/{reg_no}_{assignment_id}_{video.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        # 🔹 Step 4: Insert into Video table
        cursor.execute("""
            INSERT INTO Video (video_path)
            OUTPUT INSERTED.video_id
            VALUES (?)
        """, (file_path,))

        video_id = cursor.fetchone()[0]

        # 🔹 Step 5: Upload table, save only the video_id (scores come later)
        cursor.execute("""
            UPDATE Upload
            SET video_id = ?, publish = '0'
            WHERE Reg_No = ? AND Assignment_id = ?
        """, (video_id, reg_no, assignment_id))

        conn.commit()

        # 🔹 Step 6: Put the video in the queue
        processing_now.add(upload_key)
        job_queue.put({
            "image_path": image_path,
            "file_path": file_path,
            "reg_no": reg_no,
            "assignment_id": assignment_id,
            "topic_text": topic_text,
        })

        return {
            "message": "Video uploaded. Evaluation is in progress.",
            "videos_waiting": job_queue.qsize()
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        conn.close()


# ================= Student Reslt =================

@router.post("/student-results")
def student_results(data: StudentResultRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 
                A.Assignment_id,
                A.Topic_name,
                A.deadline_date,
                U.award_score,
                U.video_id,
                U.publish
            FROM Assignment A
            JOIN Assign ASG ON A.Assignment_id = ASG.Assignment_id
            JOIN Upload U ON A.Assignment_id = U.Assignment_id
            WHERE U.Reg_No = ?
              AND ASG.Course_no = ?
              AND A.current_sem = ?
        """, (data.reg_no, data.course_no, data.current_sem))

        rows = cursor.fetchall()
        result = []

        for r in rows:
            # ✅ BIT column — 1 ya 0
            publish = r.publish
            video_status = "Yes" if r.video_id else "No"

            if publish == 1:
                award_score = r.award_score if r.award_score is not None else 0
                status = "Evaluated"
            else:
                award_score = 0
                status = "Pending"

            result.append({
                "assignment_id": r.Assignment_id,
                "topic": r.Topic_name,
                "deadline_date": str(r.deadline_date),
                "award_score": award_score,
                "video_uploaded": video_status,
                "status": status
            })

        return {"reg_no": data.reg_no, "course_no": data.course_no, "assignments": result}

    except Exception as e:
        return {"error": str(e)}

    finally:
        conn.close()