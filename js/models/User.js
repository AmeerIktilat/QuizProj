export class User {
  constructor(fullName, username, password, role) {
    this.id = crypto.randomUUID();
    this.fullName = fullName;
    this.username = username;
    this.password = password;
    this.role = role;
    this.createdAt = new Date().toISOString();
  }

  static fromJSON(data) {
    const user = new User(data.fullName, data.username, data.password, data.role);
    Object.assign(user, data);
    return user;
  }

  isTeacher() {
    return this.role === "teacher";
  }

  isStudent() {
    return this.role === "student";
  }
}
