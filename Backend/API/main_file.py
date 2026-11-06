from fastapi import FastAPI
from starlette.staticfiles import StaticFiles
from API.routes.auth_routes import router as auth_router
from API.routes.teacher_routes import router as teacher_router
from API.routes.assignment_routes import router as assignment_router
from API.routes.student_routes import router as student_router

app = FastAPI()

app.mount("/videos", StaticFiles(directory="API/Videos"), name="videos")

app.include_router(auth_router, prefix="/auth")
app.include_router(teacher_router, prefix="/teacher")
app.include_router(assignment_router, prefix="/assignment")
app.include_router(student_router, prefix="/student")
