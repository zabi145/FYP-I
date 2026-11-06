from fastapi import APIRouter
from pydantic import BaseModel

from AI_Model.AI_Pipeline import calculate_award_score
from API.db import get_db_connection
from API.routes.assignment_routes import VideoRequest

router = APIRouter()

# ================= REQUEST MODELS =================

class ShareResultsRequest(BaseModel):
    students: list

class TeacherDashboardRequest(BaseModel):
    user_id: int

class StudentRequest(BaseModel):
    emp_no: str
    course_no: str
    discipline: str
    semester_no: str
    section: str
    current_sem:str

class UpdateScoresRequest(BaseModel):
    regNo: str
    Assignment_num: int
    course_no: str
    neck_movement: float
    eye_contact: float
    confidence_score: float
    topic_relevance: float
    face_verification: int

class ChartRequest(BaseModel):
    assignment_id: list 
    reg_no: str
    course_no: str
    Semester_no: str
    section: str
    Discipline: str
    current_sem: str    

# ================= TEACHER DASHBOARD =================
@router.post("/teacher-dashboard")
def get_teacher_dashboard(data: TeacherDashboardRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    # Step 1
    cursor.execute(
        "SELECT Emp_no, Emp_firstname, Emp_lastname "
        "FROM Teacher WHERE U_id = ?",
        (data.user_id,)
    )

    teacher = cursor.fetchone()

    if not teacher:
        return {"message": "Teacher not found"}

    emp_no = teacher[0]

    # Step 2
    cursor.execute(
        "SELECT TOP 1 Semester_no FROM Semester ORDER BY Start_date DESC"
    )
    semester = cursor.fetchone()

    if not semester:
        return {"message": "No semester found"}

    recent_semester = semester[0]

    # Step 3
    cursor.execute(
        "SELECT "
        "distinct "
        "e.Course_No, "
        "c.Course_desc, "
        "e.Section, "
        "e.Discipline, "
        "e.Semester_No, "
        "s.Semester_No "
        "FROM Enrollment e "
        "JOIN Course c ON e.Course_No = c.Course_No "
        "JOIN Student s ON s.Reg_No = e.Reg_No "
        "WHERE e.Emp_No = ? "
        "AND e.Semester_No = ? ",
        (emp_no, recent_semester)
    )

    rows = cursor.fetchall()
    conn.close()

    courses = []

    for row in rows:
        courses.append({
            "course_no": row[0],
            "course_name": row[1],
            "section": row[2],
            "discipline": row[3],
            "semester_no": row[4],
            "batch_semester_no": row[5]
        })

    return {
        "teacher": {
            "emp_no": emp_no,
            "first_name": teacher[1],
            "last_name": teacher[2],
            "full_name": teacher[1] + " " + teacher[2]
        },
        "current_sem": recent_semester,
        "courses": courses,
        "total_courses": len(courses)
    }
# ================= STUDENTS LIST =================
@router.post("/get-students-by-course")
def get_students_by_course(data: StudentRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
    SELECT 
        S.Reg_No,
        S.St_firstname,
        S.St_lastname,
        S.Semester_no
    FROM Enrollment E
    JOIN Student S ON E.Reg_No = S.Reg_No
    WHERE E.Emp_No = ?
    AND E.Course_No = ?
    AND E.Discipline = ?
    AND S.Semester_No = ?
    AND E.Section = ?
    AND E.Semester_no = ?    
    """

    cursor.execute(query, (
        data.emp_no,
        data.course_no,
        data.discipline,
        data.semester_no,
        data.section,
        data.current_sem
    ))

    students = cursor.fetchall()

    student_list = []

    for row in students:
        student_list.append({
            "reg_no": row[0],
            "name": row[1] + " " + row[2],
            "student_semester": row[3]
        })

    conn.close()

    return {
        "emp_no": data.emp_no,
        "course_no": data.course_no,
        "discipline": data.discipline,
        "semester": data.semester_no,
        "section": data.section,
        "total_students": len(student_list),
        "students": student_list
    }

# ================= SAVE CHANGES =====================
@router.post("/save-changes")
def save_changes(data: UpdateScoresRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # ✅ Step 1: Direct correct record find using ALL conditions
        cursor.execute("""
            SELECT U.Assignment_id
            FROM Upload U
            JOIN Assignment A ON U.Assignment_id = A.Assignment_id
            JOIN Assign ASG ON A.Assignment_id = ASG.Assignment_id
            WHERE U.Reg_No = ?
              AND A.Assignment_no = ?
              AND ASG.Course_no = ?
        """, (
            data.regNo,
            data.Assignment_num,
            data.course_no
        ))

        row = cursor.fetchone()

        if not row:
            return {"message": "Record not found"}

        assignment_id = row[0]

        # ✅ Step 2: Award score recalculate karo
        award_score = calculate_award_score(
            eye_contact=data.eye_contact,
            neck_movement=data.neck_movement,
            confidence_score=data.confidence_score,
            topic_relevance=data.topic_relevance,
        )

        # ✅ Step 3: Update SAME record with award_score bhi
        cursor.execute("""
            UPDATE Upload
            SET 
                neck_movement = ?,
                Eye_contact = ?,
                Confidence_score = ?,
                face_verification = ?,
                Topic_relevance = ?,
                award_score = ?
            WHERE Reg_No = ? 
              AND Assignment_id = ?
        """, (
            data.neck_movement,
            data.eye_contact,
            data.confidence_score,
            data.face_verification,
            data.topic_relevance,
            award_score,
            data.regNo,
            assignment_id
        ))

        conn.commit()

        return {
            "message": "Scores updated successfully",
            "award_score": award_score
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        conn.close()

# ================= Share Result =====================

@router.post("/share-results")
def share_results(data: ShareResultsRequest):

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        updated_count = 0

        for student in data.students:
            reg_no = student.get("reg_no")
            video_id = student.get("video_id")

            print("Updating:", reg_no, video_id)

            cursor.execute("""
                UPDATE Upload
                SET publish = 1
                WHERE Reg_No = ?
                AND video_id = ?
            """, (reg_no, video_id))

            print("Rows:", cursor.rowcount)
            updated_count += cursor.rowcount

        conn.commit()

        return {
            "message": "Results published successfully",
            "rows_updated": updated_count
        }

    except Exception as e:
        conn.rollback()
        return {"error": str(e)}

    finally:
        conn.close()


# =================Get Chart Data =================
@router.post("/get-chart-data")
def get_Chart_data(data: ChartRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        chart_data = []

        for assignment in data.assignment_id:

            cursor.execute("""
                SELECT
                       u.neck_movement,
                       u.Eye_contact,
                       u.Confidence_score,
                       u.topic_relevance

                FROM Upload u
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
                assignment,
                data.course_no,
                data.Semester_no,
                data.section,
                data.Discipline,
                data.current_sem
            ))

            row = cursor.fetchone()

            if row:
                chart_data.append({
                    "assignment_id": assignment,
                    "neck_movement": row.neck_movement or 0,
                    "eye_contact": row.Eye_contact or 0,
                    "confidence": row.Confidence_score or 0,
                    "topic_relevance": row.topic_relevance or 0
                })

        if not chart_data:
            return {"message": "No data found"}

        return chart_data

    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}

    finally:
        cursor.close()
        conn.close()
