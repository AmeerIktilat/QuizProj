import { Exam } from "../models/Exam.js";
import { Question } from "../models/Question.js";

export class ExamService {
  constructor(storage) {
    this.storage = storage;
    this.storageKey = "exams";
  }

  getAllExams() {
    return this.storage.get(this.storageKey, []).map(Exam.fromJSON);
  }

  getExamById(examId) {
    return this.getAllExams().find((exam) => exam.id === examId) || null;
  }

  getTeacherExams(teacherId) {
    return this.getAllExams().filter((exam) => exam.teacherId === teacherId);
  }

  getPublishedExams(query = "") {
    const needle = query.trim().toLowerCase();
    return this.getAllExams().filter((exam) => {
      if (!exam.isPublished()) return false;
      if (!needle) return true;
      return [exam.title, exam.code, exam.category].some((value) => (
        value.toLowerCase().includes(needle)
      ));
    });
  }

  createExam(details) {
    const exams = this.getAllExams();
    if (exams.some((exam) => exam.code.toUpperCase() === details.code.toUpperCase())) {
      throw new Error("קוד המבחן כבר נמצא בשימוש");
    }
    const exam = new Exam(details);
    exams.push(exam);
    this.persist(exams);
    return exam;
  }

  updateExam(examId, details) {
    const exams = this.getAllExams();
    const exam = exams.find((item) => item.id === examId);
    if (!exam) throw new Error("המבחן לא נמצא");
    if (exams.some((item) => item.id !== examId && item.code.toUpperCase() === details.code.toUpperCase())) {
      throw new Error("קוד המבחן כבר נמצא בשימוש");
    }
    exam.update(details);
    this.persist(exams);
    return exam;
  }

  deleteExam(examId) {
    this.persist(this.getAllExams().filter((exam) => exam.id !== examId));
  }

  addQuestion(examId, details) {
    const exams = this.getAllExams();
    const exam = exams.find((item) => item.id === examId);
    if (!exam) throw new Error("המבחן לא נמצא");
    exam.addQuestion(new Question(details.text, details.answers, details.correctAnswerIndex));
    this.persist(exams);
    return exam;
  }

  updateQuestion(examId, questionId, details) {
    const exams = this.getAllExams();
    const exam = exams.find((item) => item.id === examId);
    if (!exam || !exam.updateQuestion(questionId, details)) throw new Error("השאלה לא נמצאה");
    this.persist(exams);
    return exam;
  }

  deleteQuestion(examId, questionId) {
    const exams = this.getAllExams();
    const exam = exams.find((item) => item.id === examId);
    if (!exam) throw new Error("המבחן לא נמצא");
    exam.removeQuestion(questionId);
    this.persist(exams);
  }

  importExam(json, teacherId) {
    let data;
    try {
      data = typeof json === "string" ? JSON.parse(json) : json;
    } catch {
      throw new Error("קובץ ה־JSON אינו תקין");
    }

    const required = ["title", "description", "category", "durationMinutes", "questions"];
    if (!required.every((key) => data[key] !== undefined) || !Array.isArray(data.questions)) {
      throw new Error("מבנה המבחן בקובץ אינו תקין");
    }

    const existing = this.getAllExams();
    const baseCode = String(data.code || this.generateCode()).toUpperCase();
    let code = baseCode;
    let suffix = 2;
    while (existing.some((exam) => exam.code === code)) code = `${baseCode}-${suffix++}`;

    const exam = new Exam({
      teacherId,
      title: String(data.title),
      description: String(data.description),
      category: String(data.category),
      code,
      durationMinutes: Number(data.durationMinutes) || 30,
      status: "draft"
    });
    exam.questions = data.questions.map((question) => new Question(
      String(question.text),
      question.answers.map(String),
      Number(question.correctAnswerIndex)
    ));
    existing.push(exam);
    this.persist(existing);
    return exam;
  }

  exportExam(examId) {
    const exam = this.getExamById(examId);
    if (!exam) throw new Error("המבחן לא נמצא");
    return JSON.stringify(exam, null, 2);
  }

  generateCode() {
    return `EX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  persist(exams) {
    this.storage.set(this.storageKey, exams);
  }

  seedDemoExam(teacherId) {
    if (this.getAllExams().length) return;
    const exam = new Exam({
      teacherId,
      title: "יסודות JavaScript",
      description: "מבחן קצר לבדיקת ידע בסיסי ב־JavaScript וב־ES Modules.",
      category: "תכנות",
      code: "JS-101",
      durationMinutes: 12,
      status: "published"
    });
    exam.addQuestion(new Question("איזו מילת מפתח יוצרת משתנה שאי אפשר להציב לו ערך חדש?", ["let", "const", "var", "static"], 1));
    exam.addQuestion(new Question("כיצד מייצאים מחלקה ממודול?", ["send class", "public class", "export class", "module class"], 2));
    exam.addQuestion(new Question("איזה מבנה שומר אוסף זוגות מפתח–ערך?", ["Object", "String", "Boolean", "Number"], 0));
    this.persist([exam]);
  }
}
