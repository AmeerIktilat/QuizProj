import { Teacher } from "../models/Teacher.js";
import { Student } from "../models/Student.js";

export class AuthService {
  constructor(storage) {
    this.storage = storage;
    this.usersKey = "users";
    this.sessionKey = "session";
  }

  getAllUsers() {
    return this.storage.get(this.usersKey, []).map((data) => (
      data.role === "teacher" ? Teacher.fromJSON(data) : Student.fromJSON(data)
    ));
  }

  register({ fullName, username, password, role }) {
    const users = this.getAllUsers();
    const normalizedUsername = username.trim().toLowerCase();

    if (users.some((user) => user.username.toLowerCase() === normalizedUsername)) {
      throw new Error("שם המשתמש כבר קיים במערכת");
    }

    const user = role === "teacher"
      ? new Teacher(fullName.trim(), normalizedUsername, password)
      : new Student(fullName.trim(), normalizedUsername, password);

    users.push(user);
    this.storage.set(this.usersKey, users);
    this.storage.set(this.sessionKey, { userId: user.id });
    return user;
  }

  login(username, password) {
    const normalizedUsername = username.trim().toLowerCase();
    const user = this.getAllUsers().find((item) => (
      item.username.toLowerCase() === normalizedUsername && item.password === password
    ));

    if (!user) throw new Error("שם המשתמש או הסיסמה אינם נכונים");
    this.storage.set(this.sessionKey, { userId: user.id });
    return user;
  }

  logout() {
    this.storage.remove(this.sessionKey);
  }

  getCurrentUser() {
    const session = this.storage.get(this.sessionKey, null);
    if (!session) return null;
    return this.getAllUsers().find((user) => user.id === session.userId) || null;
  }

  seedDemoUsers() {
    if (this.getAllUsers().length) return;
    const teacher = new Teacher("מורה לדוגמה", "teacher", "1234");
    const student = new Student("סטודנט לדוגמה", "student", "1234");
    this.storage.set(this.usersKey, [teacher, student]);
  }
}
