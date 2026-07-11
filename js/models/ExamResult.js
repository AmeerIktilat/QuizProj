export class ExamResult {
  constructor({ exam, student, answers, startedAt }) {
    this.id = crypto.randomUUID();
    this.examId = exam.id;
    this.examTitle = exam.title;
    this.teacherId = exam.teacherId;
    this.studentId = student.id;
    this.studentName = student.fullName;
    this.answers = answers;
    this.score = exam.questions.reduce((sum, question, index) => (
      sum + (question.isCorrect(answers[index]) ? 1 : 0)
    ), 0);
    this.totalQuestions = exam.questions.length;
    this.startedAt = startedAt;
    this.submittedAt = new Date().toISOString();
    this.durationSeconds = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
  }

  static fromJSON(data) {
    return Object.assign(Object.create(ExamResult.prototype), data);
  }

  getPercent() {
    if (!this.totalQuestions) return 0;
    return Math.round((this.score / this.totalQuestions) * 100);
  }

  isPassed() {
    return this.getPercent() >= 60;
  }
}
