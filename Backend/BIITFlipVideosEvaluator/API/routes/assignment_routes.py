from fastapi import APIRouter,Request
from pydantic import BaseModel
from API.db import get_db_connection
from datetime import date,time

router = APIRouter()

# ================= REQUEST MODELS =================

class CheckAssignmentRequest(BaseModel):
    course_no: str
    semester_no: str
    section: str
    discipline: str
    Assignment_no: int
    current_sem:str

class AssignmentRequest(BaseModel):
    emp_no: str
    course_no: str
    semester_no: str
    section: str
    discipline: str
    current_sem:str

class CreateAssignmentRequest(BaseModel):
    Assignment_no: int
    topic: str
    description: str
    date: date
    time: time
    section: str
    semester:str
    Discipline:str
    emp_no: str
    course_no: str
    current_sem:str


class SendAssignmentRequest(BaseModel):
    assignment_id: int
    reg_no: str

class SendAllRequest(BaseModel):
    course_no: str
    Semester_no: str
    section: str
    Discipline: str
    Assignment_id:int
    current_sem:str

class AssignmentReport(BaseModel):
    course_no: str
    Semester_no: str
    section: str
    Discipline: str
    Assignment_no:int
    current_sem:str

class VideoRequest(BaseModel):
    Assignment_no: int | None = None
    assignment_id: int | None = None
    reg_no: str
    course_no: str
    Semester_no: str
    section: str
    Discipline: str
    current_sem: str

# ===================== GET PAST ASSIGNMENT NO ==================
@router.post("/get-assignments")
def get_assignments(data: AssignmentRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT 
        MIN(a.Assignment_id) as Assignment_id,
        a.Assignment_no
    FROM Assign ag
      INNER JOIN Assignment a 
      ON ag.Assignment_id = a.Assignment_id
    WHERE 
    ag.Emp_no = ?
    AND ag.Course_no = ?
    AND a.semester = ?
    AND a.section = ?
    AND a.Discipline = ?   
    AND a.current_Sem = ?
    GROUP BY a.Assignment_no
    ORDER BY a.Assignment_no
    """

    cursor.execute(query, (
        data.emp_no,
        data.course_no,
        data.semester_no,
        data.section,
        data.discipline,
        data.current_sem
    ))

    rows = cursor.fetchall()

    result = [
        {
            "Assignment_id": row.Assignment_id,
            "Assignment_no": row.Assignment_no
        }
        for row in rows
    ]

    conn.close()
    return {"assignments": result}

# ================= CREATE ASSIGNMENT =================
@router.post("/create-assignment")
def create_assignment(data: CreateAssignmentRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Step 1: Insert + get ID (FIXED)
        cursor.execute("""
            INSERT INTO Assignment 
            (Topic_name, Topic_description, deadline_date, deadline_time, Assignment_no, section, semester,Discipline,current_sem)
            OUTPUT INSERTED.Assignment_id
            VALUES (?, ?, ?, ?, ?, ?, ?,?,?)
        """, (
            data.topic,
            data.description,
            data.date,
            data.time,
            data.Assignment_no,
            data.section,
            data.semester,
            data.Discipline,
            data.current_sem
        ))

        assignment_id = cursor.fetchone()[0]

        # Step 2: Insert into Assign
        cursor.execute("""
            INSERT INTO Assign (Assignment_id, Emp_no, Course_no)
            VALUES (?, ?, ?)
        """, (
            assignment_id,
            data.emp_no,
            data.course_no
        ))

        conn.commit()

        return {
            "message": "Assignment created successfully",
            "assignment_id": int(assignment_id)
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        conn.close()

# ================= SEND ASSIGNMENT INDIVIDUALLY=================

@router.post("/send-assignment")
def send_assignment(data: SendAssignmentRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    # check already exists
    cursor.execute("""
        SELECT * FROM Upload 
        WHERE Assignment_id=? AND Reg_No=?
    """, (data.assignment_id, data.reg_no))

    exists = cursor.fetchone()

    if exists:
        conn.close()
        return {"message": "Already sent"}

    # insert new record
    cursor.execute("""
        INSERT INTO Upload (video_id, Reg_No, Assignment_id)
        VALUES (NULL, ?, ?)
    """, (data.reg_no, data.assignment_id))

    conn.commit()
    conn.close()

    return {"message": f"Assignment sent successfully to {data.reg_no}"}

# ================= SEND ASSIGNMENT To ALL=================
@router.post("/send-assignment-all")
def send_assignment_all(data: SendAllRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 🔹 Step 1: Get students
        cursor.execute("""
            SELECT e.Reg_No 
            FROM Enrollment e 
            JOIN Student s 
                ON e.Reg_No = s.Reg_No
            WHERE e.Course_No = ?
              AND s.Semester_no = ?
              AND s.Section = ?
              AND e.Discipline = ?
              AND e.Semester_no=?  
        """, (
            data.course_no,
            data.Semester_no,
            data.section,
            data.Discipline,
            data.current_sem
        ))

        students = cursor.fetchall()

        if not students:
            return {"message": "No students found"}

        inserted_count = 0
        skipped_count = 0

        # 🔹 Step 2: Insert assignment for each student
        for s in students:
            reg_no = s[0]

            # insert only if not exists
            cursor.execute("""
                INSERT INTO Upload (video_id, Reg_No, Assignment_id)
                SELECT NULL, ?, ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM Upload 
                    WHERE Assignment_id = ? AND Reg_No = ?
                )
            """, (
                reg_no,
                data.Assignment_id,
                data.Assignment_id,
                reg_no
            ))

            if cursor.rowcount > 0:
                inserted_count += 1
            else:
                skipped_count += 1

        conn.commit()

        return {
            "message": "Assignment send process completed",
            "inserted": inserted_count,
            "already_existing": skipped_count
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        conn.close()


# ================= ASSIGNMENT Check=================
@router.post("/check-assignment-status")
def check_assignment_status(data: CheckAssignmentRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = """
        SELECT DISTINCT u.Reg_No
        FROM Upload u
        INNER JOIN Assignment a 
            ON u.Assignment_id = a.Assignment_id
        INNER JOIN Assign ag
            ON a.Assignment_id = ag.Assignment_id
        WHERE 
            a.Assignment_no = ?
            AND ag.Course_no = ?
            AND a.Semester = ?
            AND a.section = ?
            AND a.Discipline = ?
            AND a.current_sem = ?
        """

        cursor.execute(query, (
            data.Assignment_no,
            data.course_no,
            data.semester_no,
            data.section,
            data.discipline,
            data.current_sem
        ))

        rows = cursor.fetchall()

        sent_students = [row[0] for row in rows]

        return {
            "sent_students": sent_students,
            "total_sent": len(sent_students)
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        conn.close()

# ================= ASSIGNMENT Report=================
@router.post("/get-assignment-report")
def get_assignment_report(data: AssignmentReport):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
                       SELECT 
                           s.Reg_No,
                           s.St_firstname,
                           s.St_lastname,
                           a.Topic_name,
                           a.deadline_date,
                           a.deadline_time,
                           u.award_score,
                           u.video_id,
                           u.neck_movement,
                           u.Eye_contact,
                           u.Confidence_score,
                           u.face_verification

                       FROM Upload u -- 🔥 MAIN TABLE CHANGE

                                JOIN Student s
                                     ON u.Reg_No = s.Reg_No

                                JOIN Assignment a
                                     ON a.Assignment_id = u.Assignment_id
                                         AND a.Assignment_no = ?
                                         AND a.section = ?
                                         AND a.Semester = ?
                                         AND a.Discipline = ?
                                         AND a.current_sem = ?

                                JOIN Assign ass
                                     ON ass.Assignment_id = a.Assignment_id
                                         AND ass.Course_no = ?

                       """, (
                           data.Assignment_no,
                           data.section,
                           data.Semester_no,
                           data.Discipline,
                           data.current_sem,
                           data.course_no
                       ))

        rows = cursor.fetchall()

        print(rows)

        result = []

        for r in rows:

            result.append({
                "reg_no": r.Reg_No,
                "name": f"{r.St_firstname} {r.St_lastname}",
                "topic": r.Topic_name,
                "deadline_date": str(r.deadline_date),
                "deadline_time": str(r.deadline_time),
                "award_score": r.award_score if r.award_score else 0,
                "video_uploaded": "Yes" if r.video_id else "No",
                "Video_id":r.video_id,
                "neck_movement": r.neck_movement or 0,
                "eye_contact": r.Eye_contact or 0,
                "confidence": r.Confidence_score or 0,
                "face_verification": "Yes" if r.face_verification == 1 else "No"
            })


        return {"data": result}

    except Exception as e:
        return {"error": str(e)}

    finally:
        conn.close()

# ================= Video details=================
@router.post("/get-teacher-side-videos")
def get_teacher_side_videos(data: VideoRequest, request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print(f"reg_no: {data.reg_no}")
        print(f"Assignment_no: {data.Assignment_no}")

        cursor.execute("""
            SELECT v.video_path,
                   u.neck_movement,
                   u.Eye_contact,
                   u.Confidence_score,
                   u.face_verification

            FROM Upload u
                LEFT JOIN Video v ON u.video_id = v.video_id
                JOIN Assignment a ON u.Assignment_id = a.Assignment_id
                JOIN Assign ass ON a.Assignment_id = ass.Assignment_id

            WHERE u.Reg_No = ?
              AND a.Assignment_no = ?
              AND ass.Course_no = ?
              AND a.Semester = ?
              AND a.section = ?
              AND a.Discipline = ?
              AND a.current_sem = ?
        """, (
            data.reg_no,
            data.Assignment_no,
            data.course_no,
            data.Semester_no,
            data.section,
            data.Discipline,
            data.current_sem
        ))

        row = cursor.fetchone()

        print(f"Row found: {row}")

        if not row:
            return {"message": "No data found"}

        file_name = row.video_path.split("/")[-1] if row.video_path else None

        return {
            "video_path": file_name,
            "neck_movement": row.neck_movement or 0,
            "eye_contact": row.Eye_contact or 0,
            "confidence": row.Confidence_score or 0,
            "face_verification": "Yes" if row.face_verification == 1 else "No"
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}

    finally:
        conn.close()

# ================= Video details=================
# @router.post("/get-student-side-videos")
# def get_student_side_videos(data: VideoRequest , request: Request):
#     conn = get_db_connection()
#     cursor = conn.cursor()
#
#     try:
#
#         # ✅ STEP 1: Assignment_id resolve
#         if data.assignment_id:
#             assignment_id = data.assignment_id
#         else:
#             cursor.execute("""
#                 SELECT Assignment_id
#                 FROM Assignment
#                 WHERE Assignment_no = ?
#             """, (data.Assignment_no,))
#
#             row = cursor.fetchone()
#
#             if not row:
#                 return {"message": "Assignment not found"}
#
#             assignment_id = row.Assignment_id
#
#         # ✅ STEP 2: Main query
#         cursor.execute("""
#             SELECT v.video_path,
#                    u.neck_movement,
#                    u.Eye_contact,
#                    u.Confidence_score,
#                    u.face_verification,
#                    u.publish
#             FROM Assignment a
#             JOIN Assign ass ON a.Assignment_id = ass.Assignment_id
#
#             LEFT JOIN Upload u
#                 ON u.Assignment_id = a.Assignment_id
#                 AND u.Reg_No = ?
#
#             LEFT JOIN Video v
#                 ON u.video_id = v.video_id
#
#             WHERE a.Assignment_id = ?
#               AND ass.Course_no = ?
#               AND a.Semester = ?
#               AND a.section = ?
#               AND a.Discipline = ?
#               AND a.current_sem = ?
#         """, (
#             data.reg_no,
#             assignment_id,
#             data.course_no,
#             data.Semester_no,
#             data.section,
#             data.Discipline,
#             data.current_sem
#         ))
#
#         row = cursor.fetchone()
#
#         if not row:
#             return {"message": "No data found"}
#
#         # ✅ Video always allowed
#         file_name = row.video_path.split("/")[-1] if row.video_path else None
#
#         # ✅ 🔥 NEW LOGIC (IMPORTANT)
#         if row.publish == 1:
#             neck = row.neck_movement or 0
#             eyes = row.Eye_contact or 0
#             confidence = row.Confidence_score or 0
#             face_verification = "Yes" if row.face_verification == 1 else "No"
#         else:
#             neck = 0
#             eyes = 0
#             confidence = 0
#             face_verification = "No"
#
#         return {
#             "video_path": file_name,
#             "neck_movement": neck,
#             "eye_contact": eyes,
#             "confidence": confidence,
#             "face_verification": face_verification
#         }
#
#     except Exception as e:
#         return {"error": str(e)}
#
#     finally:
#         conn.close()

@router.post("/get-student-side-videos")
def get_student_side_videos(data: VideoRequest, request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        if data.assignment_id:
            assignment_id = data.assignment_id
        else:
            cursor.execute("""
                SELECT Assignment_id FROM Assignment
                WHERE Assignment_no = ?
            """, (data.Assignment_no,))
            row = cursor.fetchone()
            if not row:
                return {"message": "Assignment not found"}
            assignment_id = row.Assignment_id

        cursor.execute("""
            SELECT v.video_path,
                   u.neck_movement,
                   u.Eye_contact,
                   u.Confidence_score,
                   u.face_verification,
                   u.publish
            FROM Upload u
            LEFT JOIN Video v ON u.video_id = v.video_id
            JOIN Assignment a ON u.Assignment_id = a.Assignment_id
            JOIN Assign ass ON a.Assignment_id = ass.Assignment_id
            WHERE u.Reg_No = ?
              AND u.Assignment_id = ?
              AND ass.Course_no = ?
              AND a.Semester = ?
              AND a.section = ?
              AND a.Discipline = ?
              AND a.current_sem = ?
        """, (
            data.reg_no,
            assignment_id,
            data.course_no,
            data.Semester_no,
            data.section,
            data.Discipline,
            data.current_sem
        ))

        row = cursor.fetchone()

        if not row:
            return {"message": "No data found"}

        file_name = row.video_path.split("/")[-1] if row.video_path else None

        # ✅ publish == 1 tabhi scores dikhao
        if row.publish == 1:
            neck = row.neck_movement or 0
            eyes = row.Eye_contact or 0
            confidence = row.Confidence_score or 0
            face_verification = "Yes" if row.face_verification == 1 else "No"
        else:
            neck = 0
            eyes = 0
            confidence = 0
            face_verification = "No"

        return {
            "video_path": file_name,
            "neck_movement": neck,
            "eye_contact": eyes,
            "confidence": confidence,
            "face_verification": face_verification
        }

    except Exception as e:
        return {"error": str(e)}

    finally:
        conn.close()

