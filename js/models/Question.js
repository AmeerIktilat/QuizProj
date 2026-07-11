export class Question {
  constructor(text, answers, correctAnswerIndex) {
    this.id = crypto.randomUUID();
    this.text = text;
    this.answers = answers;
    this.correctAnswerIndex = Number(correctAnswerIndex);
  }

  static fromJSON(data) {
    const question = new Question(data.text, data.answers, data.correctAnswerIndex);
    Object.assign(question, data);
    return question;
  }

  update(text, answers, correctAnswerIndex) {
    this.text = text;
    this.answers = answers;
    this.correctAnswerIndex = Number(correctAnswerIndex);
  }

  isCorrect(answerIndex) {
    return Number(answerIndex) === this.correctAnswerIndex;
  }
}
