import { ExamResult } from "../models/ExamResult.js";

export class ResultService {
  constructor(storage) {
    this.storage = storage;
    this.storageKey = "results";
  }

  getAllResults() {
    return this.storage.get(this.storageKey, []).map(ExamResult.fromJSON);
  }

  getResultById(resultId) {
    return this.getAllResults().find((result) => result.id === resultId) || null;
  }

  getStudentResults(studentId) {
    return this.getAllResults()
      .filter((result) => result.studentId === studentId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  getTeacherResults(teacherId, examId = null) {
    return this.getAllResults()
      .filter((result) => result.teacherId === teacherId && (!examId || result.examId === examId))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  saveResult(details) {
    const results = this.getAllResults();
    const result = new ExamResult(details);
    results.push(result);
    this.storage.set(this.storageKey, results);
    return result;
  }

  getAverage(results) {
    if (!results.length) return 0;
    return Math.round(results.reduce((sum, result) => sum + result.getPercent(), 0) / results.length);
  }
}
