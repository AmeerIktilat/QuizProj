import { User } from "./User.js";

export class Teacher extends User {
  constructor(fullName, username, password) {
    super(fullName, username, password, "teacher");
  }

  static fromJSON(data) {
    const teacher = new Teacher(data.fullName, data.username, data.password);
    Object.assign(teacher, data);
    return teacher;
  }
}
