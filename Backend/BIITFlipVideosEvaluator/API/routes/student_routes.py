from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from API.db import get_db_connection
from datetime import datetime
import os
import shutil
from AI_Model.AI_Pipeline import run_pipeline

router = APIRouter()

# ================= REQUEST MODEL =================

UPLOAD_FOLDER = "API/videos"

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
                SELECT COUNT(*)
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
                    AND DATEADD(
                        SECOND,
                        DATEDIFF(SECOND, '00:00:00', A.deadline_time),
                        CAST(A.deadline_date AS DATETIME)
                    ) > GETDATE()
            """, (
                reg_no,  # 🔥 IMPORTANT (student filter)
                course_no,
                section,
                semester,
                discipline,
                recent_semester
            ))

            assignment_count = cursor.fetchone()[0]

            courses.append({
                "course_no": course_no,
                "course_name": course_name,
                "current_sem": recent_semester,
                "discipline": discipline,
                "assignment_count": assignment_count
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
                A.deadline_time
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

                -- deadline filter
                AND DATEADD(
                    SECOND,
                    DATEDIFF(SECOND, '00:00:00', A.deadline_time),
                    CAST(A.deadline_date AS DATETIME)
                ) > ?

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

        image_path = row[0]   # 🔥 student image

        if not image_path:
            return {"error": "Student image not found"}

        # 🔹 Step 2: Save video
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER)

        file_path = f"{UPLOAD_FOLDER}/{reg_no}_{assignment_id}_{video.filename}"

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)

        # 🔥 Step 3: CALL AI MODEL (IMAGE + VIDEO)
        ai_result = run_pipeline(image_path, file_path)

        eye = ai_result.get("eye_contact", 0)
        neck = ai_result.get("neck_movement", 0)
        confidence = ai_result.get("confidence_score", 0)
        face = ai_result.get("face_verification", 0)
        award_score=ai_result.get("award_score", 0)

        # 🔹 Step 4: Insert into Video table
        cursor.execute("""
            INSERT INTO Video (video_path)
            OUTPUT INSERTED.video_id
            VALUES (?)
        """, (file_path,))

        video_id = cursor.fetchone()[0]

        # 🔹 Step 5: Update Upload table
        cursor.execute("""
            UPDATE Upload
            SET 
                video_id = ?,
                Eye_contact = ?,
                neck_movement = ?,
                award_score = ?,
                Confidence_score = ?,
                face_verification = ?,
                publish = '0'
            WHERE Reg_No = ? AND Assignment_id = ?
        """, (
            video_id,
            eye,
            neck,
            award_score,
            confidence,
            face,
            reg_no,
            assignment_id
        ))

        conn.commit()

        return {
            "message": "Video uploaded successfully"
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        conn.close()


# ================= Student Result =================
#
# @router.post("/student-results")
# def student_results(data: StudentResultRequest):
#
#     conn = get_db_connection()
#     cursor = conn.cursor()
#
#     try:
#         cursor.execute("""
#             SELECT
#                 A.Assignment_id,
#                 A.Topic_name,
#                 A.deadline_date,
#                 U.award_score,
#                 U.video_id,
#                 U.publish
#             FROM Assignment A
#             JOIN Assign ASG
#                 ON A.Assignment_id = ASG.Assignment_id
#             JOIN Upload U
#                 ON A.Assignment_id = U.Assignment_id
#             WHERE U.Reg_No = ?
#               AND ASG.Course_no = ?
#               AND A.current_sem = ?
#         """, (data.reg_no, data.course_no, data.current_sem))
#
#         rows = cursor.fetchall()
#
#         result = []
#
#         for r in rows:
#
#             publish = r.publish
#             db_score = r.award_score
#
#             # ✅ VIDEO STATUS
#             video_status = "Yes" if r.video_id else "No"
#
#             # ✅ FINAL LOGIC
#             if publish == 1:
#                 award_score = db_score if db_score is not None else 0
#                 status = "Evaluated"
#             else:
#                 award_score = 0
#                 status = "Pending"
#
#             result.append({
#                 "assignment_id": r.Assignment_id,
#                 "topic": r.Topic_name,
#                 "deadline_date": str(r.deadline_date),
#                 "award_score": award_score,
#                 "video_uploaded": video_status,
#                 "status": status
#             })
#
#         return {
#             "reg_no": data.reg_no,
#             "course_no": data.course_no,
#             "assignments": result
#         }
#
#     except Exception as e:
#         return {"error": str(e)}
#
#     finally:
#         conn.close()

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