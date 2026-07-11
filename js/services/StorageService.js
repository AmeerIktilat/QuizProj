export class StorageService {
  constructor(prefix = "examino") {
    this.prefix = prefix;
  }

  key(name) {
    return `${this.prefix}_${name}`;
  }

  get(name, fallback = []) {
    try {
      const raw = localStorage.getItem(this.key(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error(`Failed reading ${name}`, error);
      return fallback;
    }
  }

  set(name, value) {
    localStorage.setItem(this.key(name), JSON.stringify(value));
  }

  remove(name) {
    localStorage.removeItem(this.key(name));
  }
}
