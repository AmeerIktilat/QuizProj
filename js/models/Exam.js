import { Question } from "./Question.js";

export class Exam {
  constructor({ teacherId, title, description, category, code, durationMinutes, status = "draft" }) {
    this.id = crypto.randomUUID();
    this.teacherId = teacherId;
    this.title = title;
    this.description = description;
    this.category = category;
    this.code = code.toUpperCase();
    this.durationMinutes = Number(durationMinutes);
    this.status = status;
    this.questions = [];
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  static fromJSON(data) {
    const exam = new Exam(data);
    Object.assign(exam, data);
    exam.questions = (data.questions || []).map(Question.fromJSON);
    return exam;
  }

  update(details) {
    Object.assign(this, details, {
      code: details.code.toUpperCase(),
      durationMinutes: Number(details.durationMinutes),
      updatedAt: new Date().toISOString()
    });
  }

  addQuestion(question) {
    this.questions.push(question);
    this.updatedAt = new Date().toISOString();
  }

  updateQuestion(questionId, details) {
    const question = this.questions.find((item) => item.id === questionId);
    if (!question) return false;
    question.update(details.text, details.answers, details.correctAnswerIndex);
    this.updatedAt = new Date().toISOString();
    return true;
  }

  removeQuestion(questionId) {
    this.questions = this.questions.filter((question) => question.id !== questionId);
    this.updatedAt = new Date().toISOString();
  }

  getQuestionCount() {
    return this.questions.length;
  }

  isPublished() {
    return this.status === "published";
  }
}
