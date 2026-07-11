# OOP Diagram

```mermaid
classDiagram
    class User {
      +String id
      +String fullName
      +String username
      +String password
      +String role
      +isTeacher() Boolean
      +isStudent() Boolean
    }

    class Teacher
    class Student

    class Exam {
      +String id
      +String teacherId
      +String title
      +String description
      +String category
      +String code
      +Number durationMinutes
      +String status
      +Question[] questions
      +addQuestion(question)
      +updateQuestion(id, details)
      +removeQuestion(id)
      +isPublished() Boolean
    }

    class Question {
      +String id
      +String text
      +String[] answers
      +Number correctAnswerIndex
      +update(text, answers, correctIndex)
      +isCorrect(answerIndex) Boolean
    }

    class ExamResult {
      +String examId
      +String studentId
      +Number[] answers
      +Number score
      +Number totalQuestions
      +getPercent() Number
      +isPassed() Boolean
    }

    class StorageService {
      +get(name, fallback)
      +set(name, value)
      +remove(name)
    }

    class AuthService {
      +register(details) User
      +login(username, password) User
      +logout()
      +getCurrentUser() User
    }

    class ExamService {
      +createExam(details) Exam
      +updateExam(id, details) Exam
      +deleteExam(id)
      +importExam(json, teacherId) Exam
      +exportExam(id) JSON
    }

    class ResultService {
      +saveResult(details) ExamResult
      +getStudentResults(studentId)
      +getTeacherResults(teacherId, examId)
      +getAverage(results) Number
    }

    User <|-- Teacher
    User <|-- Student
    Teacher "1" --> "0..*" Exam : creates
    Exam "1" *-- "1..*" Question : contains
    Student "1" --> "0..*" ExamResult : receives
    Exam "1" --> "0..*" ExamResult : produces
    AuthService --> StorageService
    ExamService --> StorageService
    ResultService --> StorageService
    ExamService --> Exam
    ResultService --> ExamResult
```

## חלוקת אחריות

| שכבה | אחריות |
|---|---|
| Models | מצב והתנהגות של ישויות המערכת |
| Services | אימות משתמשים, התמדה ופעולות עסקיות |
| UI | תצוגה, הודעות, formatting ו־escaping |
| app.js | ניתוב וחיבור בין אירועי UI לשירותים |
