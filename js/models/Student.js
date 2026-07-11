import { User } from "./User.js";

export class Student extends User {
  constructor(fullName, username, password) {
    super(fullName, username, password, "student");
  }

  static fromJSON(data) {
    const student = new Student(data.fullName, data.username, data.password);
    Object.assign(student, data);
    return student;
  }
}
