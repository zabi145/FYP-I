from fastapi import APIRouter
from pydantic import BaseModel
from API.db import get_db_connection

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post('/login')
def login(data: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT User_id, role FROM users WHERE email = ? AND password = ?",
                    data.email, data.password)

    user =cursor.fetchone()

    if user:
        return {"message": "Login Successful",
                "User":
                {"Id": user[0],
                 "role": user[1]}
                }
    else:
        return {"message": "Login Fail",}
