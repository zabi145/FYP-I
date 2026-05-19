# FYP-I - AI Based Student Presentation Evaluation System

## Project Overview
This project is an AI-based mobile application developed for automated student presentation evaluation. The system allows teachers to create presentation assignments and students to upload presentation videos for AI-based assessment.

The uploaded videos are processed through an AI pipeline that evaluates student performance based on multiple presentation parameters.

---

## System Workflow

### Teacher Side
- Teacher logs into the system
- Teacher creates an assignment for a specific:
  - Department
  - Semester
  - Section
  - Course
- Assignment can be assigned to individual students or the whole class

### Student Side
- Student logs into the application
- Assigned presentation topic is visible to the student
- Student records and uploads presentation video

### AI Evaluation Pipeline
The uploaded video passes through multiple AI evaluation stages:

#### 1. Face Verification
- Student face is verified using the image already stored in the database
- If face verification fails:
  - Final score becomes 0
- If verification succeeds:
  - Video moves to further evaluation stages

#### 2. Eye Contact Analysis
- Measures how consistently the student maintains eye contact during presentation

#### 3. Head and Neck Movement Analysis
- Evaluates neck stability and unnecessary head movement during speaking

#### 4. Confidence Analysis
- Analyzes speaking confidence and communication quality

---

## Teacher Evaluation
- All AI-generated scores are visible to the teacher
- Teacher can watch uploaded videos inside the application
- If the teacher finds any issue in AI scoring, manual evaluation can also be performed

---

## Result Publishing
- Teacher publishes final results
- Each student can view their individual performance result inside the application

---

## Technologies Used
- Python
- FastAPI
- OpenCV
- MediaPipe
- DeepFace
- Whisper Speech Recognition
- NumPy
- Pandas
- React Native

---

## Objective
The main objective of this project is to automate student presentation evaluation using artificial intelligence while reducing manual bias and improving evaluation efficiency.

---

## Author
Muhammad Zohaib
Final Year Project - Artificial Intelligence and Computer Vision
