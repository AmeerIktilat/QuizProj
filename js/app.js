import { StorageService } from "./services/StorageService.js";
import { AuthService } from "./services/AuthService.js";
import { ExamService } from "./services/ExamService.js";
import { ResultService } from "./services/ResultService.js";
import { ExamUI } from "./ui/ExamUI.js";

const storage = new StorageService();
const authService = new AuthService(storage);
const examService = new ExamService(storage);
const resultService = new ResultService(storage);
const ui = new ExamUI(
     document.getElementById("app"),
     document.getElementById("toastContainer")
);

const nav = document.getElementById("mainNav");
const themeToggle = document.getElementById("themeToggle");
let timerId = null;
let editingQuestionId = null;
const activeAttempts = new Map();

initialize();

function initialize() {
     authService.seedDemoUsers();
     const demoTeacher = authService.getAllUsers().find((user) => user.isTeacher());
     examService.seedDemoExam(demoTeacher.id);
     applyTheme(storage.get("theme", "light"));
     window.addEventListener("hashchange", renderRoute);
     themeToggle.addEventListener("click", toggleTheme);
     renderRoute();
}

function renderRoute() {
     stopTimer();
     editingQuestionId = null;
     renderNavigation();

     const route = location.hash.replace(/^#\/?/, "") || "home";
     const segments = route.split("/");

     if (route === "home") return renderHome();
     if (route === "login") return renderLogin();
     if (route === "register") return renderRegister();
     if (route === "teacher") return requireRole("teacher", renderTeacherDashboard);
     if (route === "teacher/exam/new") return requireRole("teacher", renderExamForm);
     if (segments[0] === "teacher" && segments[1] === "exam" && segments[2]) {
          return requireRole("teacher", () => renderExamDetails(segments[2]));
     }
     if (route === "student") return requireRole("student", renderStudentDashboard);
     if (route === "search") return requireRole("student", renderExamSearch);
     if (segments[0] === "take" && segments[1]) {
          return requireRole("student", () => renderExamRunner(segments[1]));
     }
     if (segments[0] === "result" && segments[1]) {
          return requireAuth(() => renderResult(segments[1]));
     }
     renderNotFound();
}

function renderNavigation() {
     const user = authService.getCurrentUser();
     if (!user) {
          nav.innerHTML = `
      <a href="#/home">ראשי</a>
      <a href="#/login">התחברות</a>
      <a class="nav-cta" href="#/register">הרשמה</a>
    `;
          return;
     }

     const dashboard = user.isTeacher() ? "teacher" : "student";
     nav.innerHTML = `
    <span class="nav-user">שלום, ${ui.escape(user.fullName)}</span>
    <a href="#/${dashboard}">לוח בקרה</a>
    ${user.isStudent() ? '<a href="#/search">חיפוש מבחן</a>' : ""}
    <button id="logoutBtn" class="link-button" type="button">יציאה</button>
  `;
     document.getElementById("logoutBtn").addEventListener("click", () => {
          authService.logout();
          location.hash = "#/home";
          ui.toast("התנתקת בהצלחה", "info");
     });
}

function renderHome() {
     const user = authService.getCurrentUser();
     const destination = user ? (user.isTeacher() ? "#/teacher" : "#/student") : "#/register";
     const actionLabel = user ? "מעבר ללוח הבקרה" : "מתחילים עכשיו";

     ui.render(`
    <section class="hero shell">
      <div class="hero-copy">
        <span class="eyebrow">מערכת מבחנים בצד הלקוח</span>
        <h1>ליצור, לפתור ולנתח<br><span>מבחנים במקום אחד.</span></h1>
        <p>Examino מחברת בין מורים לסטודנטים בעזרת סביבת מבחנים מהירה, ברורה ומאובזרת — ללא שרת וללא התקנה.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="${destination}">${actionLabel}</a>
          ${!user ? '<a class="button button-secondary" href="#/login">כבר יש לי חשבון</a>' : ""}
        </div>
        <div class="demo-note">
          <strong>חשבונות הדגמה:</strong>
          <span>מורה: teacher / 1234</span>
          <span>סטודנט: student / 1234</span>
        </div>
      </div>
      <div class="hero-visual" aria-label="תצוגה מקדימה של המערכת">
        <div class="visual-orb orb-one"></div>
        <div class="visual-orb orb-two"></div>
        <div class="preview-card">
          <div class="preview-top"><span>התקדמות במבחן</span><strong>75%</strong></div>
          <div class="progress"><span style="width:75%"></span></div>
          <div class="preview-question">
            <span class="question-number">04</span>
            <div><strong>איזו תשובה נכונה?</strong><small>יש לבחור אפשרות אחת</small></div>
          </div>
          <div class="preview-answer selected">תשובה ב׳ <span>✓</span></div>
          <div class="preview-answer">תשובה ג׳ <span></span></div>
        </div>
      </div>
    </section>
    <section class="feature-section">
      <div class="shell">
        <div class="section-heading centered">
          <span class="eyebrow">כל מה שצריך</span>
          <h2>מערכת אחת, שני תפקידים</h2>
        </div>
        <div class="feature-grid">
          <article class="feature-card"><span class="feature-icon">✦</span><h3>למורים</h3><p>יצירה ועריכה של מבחנים ושאלות, פרסום בקוד ייחודי ומעקב אחר תוצאות בזמן אמת.</p></article>
          <article class="feature-card"><span class="feature-icon">◎</span><h3>לסטודנטים</h3><p>חיפוש מבחנים, ביצוע עם טיימר, ציון מיידי והיסטוריית הישגים אישית.</p></article>
          <article class="feature-card"><span class="feature-icon">↗</span><h3>נתונים מקומיים</h3><p>שמירה ב־localStorage, מבנה OOP מודולרי וייבוא או ייצוא של מבחנים כ־JSON.</p></article>
        </div>
      </div>
    </section>
  `);
}

function renderLogin() {
     if (authService.getCurrentUser()) return redirectToDashboard();
     ui.render(authLayout("התחברות למערכת", "הזינו את פרטי החשבון כדי להמשיך", `
    <form id="loginForm" class="stack-form">
      <label>שם משתמש<input name="username" autocomplete="username" required placeholder="לדוגמה: student"></label>
      <label>סיסמה<input name="password" type="password" autocomplete="current-password" required placeholder="••••••••"></label>
      <button class="button button-primary button-full" type="submit">התחברות</button>
    </form>
    <p class="form-switch">אין לך חשבון? <a href="#/register">להרשמה</a></p>
  `));

     document.getElementById("loginForm").addEventListener("submit", (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          try {
               const user = authService.login(data.get("username"), data.get("password"));
               ui.toast(`ברוך הבא, ${user.fullName}`);
               redirectToDashboard();
          } catch (error) {
               ui.toast(error.message, "error");
          }
     });
}

function renderRegister() {
     if (authService.getCurrentUser()) return redirectToDashboard();
     ui.render(authLayout("פתיחת חשבון", "כמה פרטים ואתם בפנים", `
    <form id="registerForm" class="stack-form">
      <label>שם מלא<input name="fullName" required minlength="2" placeholder="שם פרטי ומשפחה"></label>
      <label>שם משתמש<input name="username" required minlength="3" autocomplete="username" placeholder="לפחות 3 תווים"></label>
      <label>סיסמה<input name="password" type="password" required minlength="4" autocomplete="new-password" placeholder="לפחות 4 תווים"></label>
      <fieldset class="role-picker">
        <legend>סוג המשתמש</legend>
        <label><input type="radio" name="role" value="student" checked><span><strong>סטודנט</strong><small>ביצוע מבחנים וצפייה בציונים</small></span></label>
        <label><input type="radio" name="role" value="teacher"><span><strong>מורה</strong><small>יצירה וניהול של מבחנים</small></span></label>
      </fieldset>
      <button class="button button-primary button-full" type="submit">יצירת חשבון</button>
    </form>
    <p class="form-switch">כבר רשומים? <a href="#/login">להתחברות</a></p>
  `));

     document.getElementById("registerForm").addEventListener("submit", (event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          try {
               authService.register(data);
               ui.toast("החשבון נוצר בהצלחה");
               redirectToDashboard();
          } catch (error) {
               ui.toast(error.message, "error");
          }
     });
}

function renderTeacherDashboard() {
     const teacher = authService.getCurrentUser();
     const exams = examService.getTeacherExams(teacher.id);
     const results = resultService.getTeacherResults(teacher.id);
     const published = exams.filter((exam) => exam.isPublished()).length;
     const average = resultService.getAverage(results);

     ui.render(`
    <div class="shell page-space">
      ${pageHeader(`בוקר טוב, ${ui.escape(teacher.fullName)}`, "כאן מנהלים את המבחנים ועוקבים אחר ביצועי הסטודנטים.", '<a class="button button-primary" href="#/teacher/exam/new">＋ מבחן חדש</a>')}
      <section class="stat-grid">
        ${statCard("מבחנים", exams.length, "סה״כ במערכת", "purple")}
        ${statCard("פורסמו", published, "זמינים לסטודנטים", "green")}
        ${statCard("הגשות", results.length, "כלל הסטודנטים", "blue")}
        ${statCard("ממוצע", `${average}%`, "בכל המבחנים", "orange")}
      </section>

      <section class="panel">
        <div class="panel-heading responsive-heading">
          <div><h2>המבחנים שלי</h2><p>יצירה, עריכה, פרסום ומעקב</p></div>
          <div class="toolbar">
            <label class="search-field compact"><span>⌕</span><input id="teacherExamFilter" type="search" placeholder="חיפוש מבחן..."></label>
            <label class="button button-secondary file-button">ייבוא JSON<input id="importExamInput" type="file" accept="application/json,.json"></label>
          </div>
        </div>
        <div id="teacherExamList" class="exam-grid">
          ${renderTeacherExamCards(exams, results)}
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading"><div><h2>הגשות אחרונות</h2><p>התוצאות האחרונות שהתקבלו</p></div></div>
        ${renderResultsTable(results.slice(0, 6))}
      </section>
    </div>
  `);

     document.getElementById("teacherExamFilter").addEventListener("input", (event) => {
          const query = event.target.value.toLowerCase();
          const filtered = exams.filter((exam) => [exam.title, exam.code, exam.category].some((value) => value.toLowerCase().includes(query)));
          document.getElementById("teacherExamList").innerHTML = renderTeacherExamCards(filtered, results);
     });

     document.getElementById("importExamInput").addEventListener("change", async (event) => {
          const [file] = event.target.files;
          if (!file) return;
          try {
               const exam = examService.importExam(await file.text(), teacher.id);
               ui.toast("המבחן יובא כטיוטה");
               location.hash = `#/teacher/exam/${exam.id}`;
          } catch (error) {
               ui.toast(error.message, "error");
          }
     });
}

function renderExamForm() {
     const teacher = authService.getCurrentUser();
     const code = examService.generateCode();
     ui.render(`
    <div class="shell narrow-page page-space">
      <a class="back-link" href="#/teacher">→ חזרה ללוח הבקרה</a>
      ${pageHeader("יצירת מבחן חדש", "מגדירים את פרטי המבחן, שומרים ואז מוסיפים שאלות.")}
      <section class="panel form-panel">
        ${examDetailsForm({ code, durationMinutes: 30, status: "draft" }, "יצירת המבחן")}
      </section>
    </div>
  `);

     document.getElementById("examDetailsForm").addEventListener("submit", (event) => {
          event.preventDefault();
          const details = Object.fromEntries(new FormData(event.currentTarget));
          if (details.status === "published") details.status = "draft";
          try {
               const exam = examService.createExam({ ...details, teacherId: teacher.id });
               ui.toast("המבחן נוצר — עכשיו אפשר להוסיף שאלות");
               location.hash = `#/teacher/exam/${exam.id}`;
          } catch (error) {
               ui.toast(error.message, "error");
          }
     });
}

function renderExamDetails(examId) {
     const teacher = authService.getCurrentUser();
     const exam = examService.getExamById(examId);
     if (!exam || exam.teacherId !== teacher.id) return renderNotFound("המבחן לא נמצא או שאינו שייך לחשבון זה");
     const results = resultService.getTeacherResults(teacher.id, exam.id);
     const editingQuestion = exam.questions.find((question) => question.id === editingQuestionId);

     ui.render(`
    <div class="shell page-space">
      <a class="back-link" href="#/teacher">→ חזרה ללוח הבקרה</a>
      <div class="detail-title-row">
        <div><span class="eyebrow">קוד מבחן: ${ui.escape(exam.code)}</span><h1>${ui.escape(exam.title)}</h1><p>${ui.escape(exam.description)}</p></div>
        <div class="detail-actions">
          ${ui.statusBadge(exam.status)}
          <button id="exportExamBtn" class="button button-secondary" type="button">ייצוא JSON</button>
          <button id="deleteExamBtn" class="button button-danger-ghost" type="button">מחיקת מבחן</button>
        </div>
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <section class="panel">
            <div class="panel-heading"><div><h2>שאלות (${exam.getQuestionCount()})</h2><p>השאלות והתשובות שיופיעו במבחן</p></div></div>
            <div class="question-list">
              ${exam.questions.length ? exam.questions.map((question, index) => renderQuestionItem(question, index)).join("") : ui.emptyState("עדיין אין שאלות", "הוסיפו את השאלה הראשונה באמצעות הטופס למטה.")}
            </div>
          </section>

          <section class="panel question-editor">
            <div class="panel-heading"><div><h2>${editingQuestion ? "עריכת שאלה" : "הוספת שאלה"}</h2><p>ארבע תשובות אפשריות ותשובה נכונה אחת</p></div></div>
            ${questionForm(editingQuestion)}
          </section>

          <section class="panel">
            <div class="panel-heading"><div><h2>תוצאות סטודנטים</h2><p>${results.length} הגשות התקבלו למבחן זה</p></div></div>
            ${renderResultsTable(results)}
          </section>
        </div>

        <aside class="detail-sidebar">
          <section class="panel sticky-panel">
            <div class="panel-heading"><div><h2>פרטי המבחן</h2><p>ניתן לעדכן בכל עת</p></div></div>
            ${examDetailsForm(exam, "שמירת שינויים")}
          </section>
        </aside>
      </div>
    </div>
  `);

     bindExamDetailEvents(exam);
}

function bindExamDetailEvents(exam) {
     document.getElementById("examDetailsForm").addEventListener("submit", (event) => {
          event.preventDefault();
          const details = Object.fromEntries(new FormData(event.currentTarget));
          if (details.status === "published" && exam.getQuestionCount() === 0) {
               ui.toast("יש להוסיף לפחות שאלה אחת לפני פרסום", "error");
               return;
          }
          try {
               examService.updateExam(exam.id, details);
               ui.toast("פרטי המבחן נשמרו");
               renderExamDetails(exam.id);
          } catch (error) {
               ui.toast(error.message, "error");
          }
     });

     document.getElementById("questionForm").addEventListener("submit", (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const details = {
               text: data.get("text").trim(),
               answers: [0, 1, 2, 3].map((index) => data.get(`answer${index}`).trim()),
               correctAnswerIndex: Number(data.get("correctAnswerIndex"))
          };
          try {
               if (editingQuestionId) {
                    examService.updateQuestion(exam.id, editingQuestionId, details);
                    ui.toast("השאלה עודכנה");
               } else {
                    examService.addQuestion(exam.id, details);
                    ui.toast("השאלה נוספה");
               }
               editingQuestionId = null;
               renderExamDetails(exam.id);
          } catch (error) {
               ui.toast(error.message, "error");
          }
     });

     document.querySelectorAll("[data-edit-question]").forEach((button) => {
          button.addEventListener("click", () => {
               editingQuestionId = button.dataset.editQuestion;
               renderExamDetails(exam.id);
               document.querySelector(".question-editor").scrollIntoView({ behavior: "smooth" });
          });
     });
     document.querySelectorAll("[data-delete-question]").forEach((button) => {
          button.addEventListener("click", () => {
               if (!ui.confirm("למחוק את השאלה?")) return;
               examService.deleteQuestion(exam.id, button.dataset.deleteQuestion);
               ui.toast("השאלה נמחקה", "info");
               renderExamDetails(exam.id);
          });
     });
     document.getElementById("cancelQuestionEdit")?.addEventListener("click", () => {
          editingQuestionId = null;
          renderExamDetails(exam.id);
     });
     document.getElementById("deleteExamBtn").addEventListener("click", () => {
          if (!ui.confirm("למחוק את המבחן לצמיתות? התוצאות ההיסטוריות יישמרו.")) return;
          examService.deleteExam(exam.id);
          ui.toast("המבחן נמחק", "info");
          location.hash = "#/teacher";
     });
     document.getElementById("exportExamBtn").addEventListener("click", () => {
          downloadJson(examService.exportExam(exam.id), `${exam.code}.json`);
          ui.toast("קובץ המבחן נוצר");
     });
}

function renderStudentDashboard() {
     const student = authService.getCurrentUser();
     const results = resultService.getStudentResults(student.id);
     const average = resultService.getAverage(results);
     const best = results.length ? Math.max(...results.map((result) => result.getPercent())) : 0;
     const passed = results.filter((result) => result.isPassed()).length;
     const available = examService.getPublishedExams().slice(0, 3);

     ui.render(`
    <div class="shell page-space">
      ${pageHeader(`שלום, ${ui.escape(student.fullName)}`, "אפשר להמשיך למבחן הבא או לצפות בהתקדמות שלך.", '<a class="button button-primary" href="#/search">⌕ חיפוש מבחן</a>')}
      <section class="stat-grid">
        ${statCard("מבחנים שבוצעו", results.length, "כולל ניסיונות חוזרים", "purple")}
        ${statCard("ממוצע ציונים", `${average}%`, "בכל ההגשות", "blue")}
        ${statCard("ציון שיא", `${best}%`, "התוצאה הטובה ביותר", "orange")}
        ${statCard("עברו בהצלחה", passed, "ציון 60 ומעלה", "green")}
      </section>

      <section class="panel">
        <div class="panel-heading responsive-heading"><div><h2>מבחנים זמינים</h2><p>אפשר להתחיל מיד או לחפש באמצעות קוד</p></div><a href="#/search" class="text-link">לכל המבחנים ←</a></div>
        <div class="exam-grid">${renderPublishedExamCards(available)}</div>
      </section>

      <section class="panel">
        <div class="panel-heading"><div><h2>היסטוריית ציונים</h2><p>כל המבחנים שכבר הגשת</p></div></div>
        ${renderStudentHistory(results)}
      </section>
    </div>
  `);
}

function renderExamSearch() {
     const exams = examService.getPublishedExams();
     ui.render(`
    <div class="shell page-space search-page">
      ${pageHeader("מציאת מבחן", "חפשו לפי שם המבחן, קטגוריה או הקוד שקיבלתם מהמורה.")}
      <label class="search-field search-large"><span>⌕</span><input id="examSearchInput" type="search" placeholder="לדוגמה: JS-101 או JavaScript" autofocus></label>
      <div id="searchCount" class="result-count">${exams.length} מבחנים זמינים</div>
      <div id="examSearchResults" class="exam-grid">${renderPublishedExamCards(exams)}</div>
    </div>
  `);

     document.getElementById("examSearchInput").addEventListener("input", (event) => {
          const filtered = examService.getPublishedExams(event.target.value);
          document.getElementById("searchCount").textContent = `${filtered.length} מבחנים נמצאו`;
          document.getElementById("examSearchResults").innerHTML = renderPublishedExamCards(filtered);
     });
}

function renderExamRunner(examId) {
     const student = authService.getCurrentUser();
     const exam = examService.getExamById(examId);
     if (!exam || !exam.isPublished() || !exam.questions.length) return renderNotFound("המבחן אינו זמין לביצוע");

     if (!activeAttempts.has(exam.id)) activeAttempts.set(exam.id, new Date().toISOString());
     const startedAt = activeAttempts.get(exam.id);
     const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
     let secondsLeft = Math.max(0, exam.durationMinutes * 60 - elapsed);

     ui.render(`
    <div class="runner-shell shell page-space">
      <div class="runner-header">
        <div><span class="eyebrow">${ui.escape(exam.category)} · ${ui.escape(exam.code)}</span><h1>${ui.escape(exam.title)}</h1><p>${ui.escape(exam.description)}</p></div>
        <div id="examTimer" class="timer" aria-live="polite"><small>זמן נותר</small><strong>${ui.formatDuration(secondsLeft)}</strong></div>
      </div>
      <div class="runner-progress"><div><span id="answeredCount">0</span> מתוך ${exam.getQuestionCount()} שאלות נענו</div><div class="progress"><span id="answerProgress" style="width:0%"></span></div></div>
      <form id="examRunnerForm" class="runner-form">
        ${exam.questions.map((question, questionIndex) => `
          <article class="runner-question">
            <div class="runner-question-title"><span>${String(questionIndex + 1).padStart(2, "0")}</span><h2>${ui.escape(question.text)}</h2></div>
            <div class="answer-grid">
              ${question.answers.map((answer, answerIndex) => `
                <label class="answer-option">
                  <input type="radio" name="question-${questionIndex}" value="${answerIndex}">
                  <span class="answer-letter">${String.fromCharCode(65 + answerIndex)}</span>
                  <span>${ui.escape(answer)}</span>
                </label>
              `).join("")}
            </div>
          </article>
        `).join("")}
        <div class="submit-bar"><div><strong>סיימת?</strong><span>אפשר לעבור שוב על התשובות לפני ההגשה.</span></div><button class="button button-primary" type="submit">הגשת המבחן</button></div>
      </form>
    </div>
  `);

     const form = document.getElementById("examRunnerForm");
     form.addEventListener("change", () => updateAnswerProgress(exam));
     form.addEventListener("submit", (event) => submitExam(event, exam, student, startedAt));

     const tick = () => {
          secondsLeft -= 1;
          const timer = document.getElementById("examTimer");
          if (!timer) return stopTimer();
          timer.querySelector("strong").textContent = ui.formatDuration(Math.max(0, secondsLeft));
          timer.classList.toggle("timer-warning", secondsLeft <= 60);
          if (secondsLeft <= 0) {
               stopTimer();
               ui.toast("הזמן הסתיים — המבחן מוגש אוטומטית", "info");
               form.requestSubmit();
          }
     };
     if (secondsLeft <= 0) form.requestSubmit();
     else timerId = setInterval(tick, 1000);
}

function submitExam(event, exam, student, startedAt) {
     event.preventDefault();
     stopTimer();
     const answers = exam.questions.map((_, index) => {
          const selected = document.querySelector(`input[name="question-${index}"]:checked`);
          return selected ? Number(selected.value) : null;
     });
     const result = resultService.saveResult({ exam, student, answers, startedAt });
     activeAttempts.delete(exam.id);
     ui.toast("המבחן הוגש והתוצאה נשמרה");
     location.hash = `#/result/${result.id}`;
}

function renderResult(resultId) {
     const user = authService.getCurrentUser();
     const result = resultService.getResultById(resultId);
     if (!result || (user.isStudent() && result.studentId !== user.id) || (user.isTeacher() && result.teacherId !== user.id)) {
          return renderNotFound("התוצאה אינה זמינה לחשבון זה");
     }
     const exam = examService.getExamById(result.examId);
     const percent = result.getPercent();
     const destination = user.isTeacher() ? `#/teacher/exam/${result.examId}` : "#/student";

     ui.render(`
    <div class="shell result-page page-space">
      <section class="result-hero ${result.isPassed() ? "passed" : "failed"}">
        <div class="result-ring" style="--score:${percent * 3.6}deg"><span><strong>${percent}%</strong><small>ציון סופי</small></span></div>
        <div><span class="eyebrow">${result.isPassed() ? "כל הכבוד!" : "ממשיכים להשתפר"}</span><h1>${ui.escape(result.examTitle)}</h1><p>${ui.escape(result.studentName)} · ${ui.formatDate(result.submittedAt)}</p><div class="result-summary"><span><strong>${result.score}</strong> תשובות נכונות</span><span><strong>${result.totalQuestions - result.score}</strong> תשובות שגויות</span><span><strong>${ui.formatDuration(result.durationSeconds)}</strong> זמן ביצוע</span></div></div>
      </section>

      ${exam ? `
        <section class="panel review-panel">
          <div class="panel-heading"><div><h2>סקירת תשובות</h2><p>פירוט התשובות שנמסרו</p></div></div>
          ${exam.questions.map((question, index) => {
          const chosen = result.answers[index];
          const correct = question.isCorrect(chosen);
          return `<div class="review-row ${correct ? "correct" : "incorrect"}"><span class="review-mark">${correct ? "✓" : "×"}</span><div><strong>${index + 1}. ${ui.escape(question.text)}</strong><p>התשובה שלך: ${chosen === null ? "לא נענתה" : ui.escape(question.answers[chosen])}</p>${correct ? "" : `<small>תשובה נכונה: ${ui.escape(question.answers[question.correctAnswerIndex])}</small>`}</div></div>`;
     }).join("")}
        </section>
      ` : ""}
      <div class="center-actions"><a class="button button-primary" href="${destination}">חזרה ללוח הבקרה</a>${user.isStudent() && exam ? `<a class="button button-secondary" href="#/take/${exam.id}">ביצוע נוסף</a>` : ""}</div>
    </div>
  `);
}

function renderTeacherExamCards(exams, results) {
     if (!exams.length) return ui.emptyState("לא נמצאו מבחנים", "אפשר ליצור מבחן חדש או לשנות את החיפוש.", '<a class="button button-primary" href="#/teacher/exam/new">יצירת מבחן</a>');
     return exams.map((exam) => {
          const examResults = results.filter((result) => result.examId === exam.id);
          return `
      <article class="exam-card">
        <div class="exam-card-top"><span class="category-chip">${ui.escape(exam.category)}</span>${ui.statusBadge(exam.status)}</div>
        <h3>${ui.escape(exam.title)}</h3><p>${ui.escape(exam.description)}</p>
        <div class="exam-meta"><span>◷ ${exam.durationMinutes} דקות</span><span>◉ ${exam.getQuestionCount()} שאלות</span><span>✓ ${examResults.length} הגשות</span></div>
        <div class="exam-card-footer"><code>${ui.escape(exam.code)}</code><a class="button button-small button-secondary" href="#/teacher/exam/${exam.id}">ניהול מבחן</a></div>
      </article>`;
     }).join("");
}

function renderPublishedExamCards(exams) {
     if (!exams.length) return ui.emptyState("לא נמצאו מבחנים", "נסו שם או קוד אחר.");
     return exams.map((exam) => `
    <article class="exam-card public-exam-card">
      <div class="exam-card-top"><span class="category-chip">${ui.escape(exam.category)}</span><code>${ui.escape(exam.code)}</code></div>
      <h3>${ui.escape(exam.title)}</h3><p>${ui.escape(exam.description)}</p>
      <div class="exam-meta"><span>◷ ${exam.durationMinutes} דקות</span><span>◉ ${exam.getQuestionCount()} שאלות</span></div>
      <div class="exam-card-footer"><span class="ready-label">זמין לביצוע</span><a class="button button-small button-primary" href="#/take/${exam.id}">התחלת מבחן</a></div>
    </article>
  `).join("");
}

function renderQuestionItem(question, index) {
     return `
    <article class="question-item">
      <div class="question-index">${String(index + 1).padStart(2, "0")}</div>
      <div class="question-content"><h3>${ui.escape(question.text)}</h3><div class="mini-answers">${question.answers.map((answer, answerIndex) => `<span class="${answerIndex === question.correctAnswerIndex ? "correct-answer" : ""}">${ui.escape(answer)}${answerIndex === question.correctAnswerIndex ? " ✓" : ""}</span>`).join("")}</div></div>
      <div class="row-actions"><button class="icon-button small" type="button" data-edit-question="${question.id}" title="עריכה">✎</button><button class="icon-button small danger" type="button" data-delete-question="${question.id}" title="מחיקה">⌫</button></div>
    </article>`;
}

function renderResultsTable(results) {
     if (!results.length) return ui.emptyState("עדיין אין הגשות", "התוצאות יופיעו כאן מיד לאחר שסטודנט יגיש מבחן.");
     return `<div class="table-wrap"><table><thead><tr><th>סטודנט</th><th>מבחן</th><th>ציון</th><th>תאריך</th><th></th></tr></thead><tbody>${results.map((result) => `<tr><td><strong>${ui.escape(result.studentName)}</strong></td><td>${ui.escape(result.examTitle)}</td><td><span class="grade ${result.isPassed() ? "grade-pass" : "grade-fail"}">${result.getPercent()}%</span></td><td>${ui.formatDate(result.submittedAt)}</td><td><a class="text-link" href="#/result/${result.id}">פירוט</a></td></tr>`).join("")}</tbody></table></div>`;
}

function renderStudentHistory(results) {
     if (!results.length) return ui.emptyState("אין עדיין ציונים", "אחרי הגשת המבחן הראשון, התוצאה תופיע כאן.", '<a class="button button-primary" href="#/search">חיפוש מבחן</a>');
     return `<div class="history-list">${results.map((result) => `<a class="history-row" href="#/result/${result.id}"><div class="history-grade ${result.isPassed() ? "pass" : "fail"}">${result.getPercent()}</div><div><strong>${ui.escape(result.examTitle)}</strong><span>${ui.formatDate(result.submittedAt)}</span></div><div class="history-score">${result.score}/${result.totalQuestions}<span>תשובות נכונות</span></div><span class="history-arrow">←</span></a>`).join("")}</div>`;
}

function examDetailsForm(exam, buttonLabel) {
     return `
    <form id="examDetailsForm" class="stack-form">
      <label>שם המבחן<input name="title" required minlength="3" value="${ui.escape(exam.title || "")}" placeholder="לדוגמה: יסודות JavaScript"></label>
      <label>תיאור<textarea name="description" required rows="3" placeholder="מה המבחן בודק?">${ui.escape(exam.description || "")}</textarea></label>
      <div class="form-row"><label>קטגוריה<input name="category" required value="${ui.escape(exam.category || "")}" placeholder="תכנות"></label><label>קוד מבחן<input name="code" required pattern="[A-Za-z0-9-]{3,20}" value="${ui.escape(exam.code || "")}" dir="ltr"></label></div>
      <div class="form-row"><label>משך בדקות<input name="durationMinutes" type="number" min="1" max="240" required value="${exam.durationMinutes}"></label><label>סטטוס<select name="status"><option value="draft" ${exam.status === "draft" ? "selected" : ""}>טיוטה</option><option value="published" ${exam.status === "published" ? "selected" : ""}>מפורסם</option></select></label></div>
      <button class="button button-primary button-full" type="submit">${buttonLabel}</button>
    </form>`;
}

function questionForm(question = null) {
     const answers = question?.answers || ["", "", "", ""];
     return `
    <form id="questionForm" class="stack-form">
      <label>נוסח השאלה<input name="text" required value="${ui.escape(question?.text || "")}" placeholder="כתבו שאלה ברורה ומדויקת"></label>
      <div class="answer-editor-grid">${answers.map((answer, index) => `<label><span>תשובה ${index + 1}</span><input name="answer${index}" required value="${ui.escape(answer)}"><span class="correct-radio"><input type="radio" name="correctAnswerIndex" value="${index}" ${Number(question?.correctAnswerIndex ?? 0) === index ? "checked" : ""}> תשובה נכונה</span></label>`).join("")}</div>
      <div class="form-actions"><button class="button button-primary" type="submit">${question ? "עדכון השאלה" : "הוספת השאלה"}</button>${question ? '<button id="cancelQuestionEdit" class="button button-secondary" type="button">ביטול</button>' : ""}</div>
    </form>`;
}

function pageHeader(title, subtitle, action = "") {
     return `<div class="page-header"><div><span class="eyebrow">Examino Dashboard</span><h1>${title}</h1><p>${subtitle}</p></div>${action ? `<div>${action}</div>` : ""}</div>`;
}

function statCard(label, value, hint, color) {
     return `<article class="stat-card ${color}"><div class="stat-icon">${color === "green" ? "✓" : color === "blue" ? "↗" : color === "orange" ? "★" : "◫"}</div><div><span>${label}</span><strong>${value}</strong><small>${hint}</small></div></article>`;
}

function authLayout(title, subtitle, content) {
     return `<div class="auth-page"><section class="auth-card"><a class="brand auth-brand" href="#/home"><span class="brand-mark">E</span><span>Examino</span></a><div class="auth-heading"><h1>${title}</h1><p>${subtitle}</p></div>${content}</section><aside class="auth-side"><div><span class="eyebrow light">למידה חכמה יותר</span><h2>הידע שלך.<br>הקצב שלך.</h2><p>מערכת מבחנים פשוטה שמציגה את מה שחשוב — בלי הסחות דעת.</p></div><div class="quote-card"><p>“הצלחה היא סכום של מאמצים קטנים שחוזרים על עצמם יום אחר יום.”</p><span>— Robert Collier</span></div></aside></div>`;
}

function updateAnswerProgress(exam) {
     const answered = exam.questions.filter((_, index) => document.querySelector(`input[name="question-${index}"]:checked`)).length;
     document.getElementById("answeredCount").textContent = answered;
     document.getElementById("answerProgress").style.width = `${(answered / exam.getQuestionCount()) * 100}%`;
}

function requireRole(role, callback) {
     const user = authService.getCurrentUser();
     if (!user) {
          ui.toast("יש להתחבר כדי להמשיך", "error");
          location.hash = "#/login";
          return;
     }
     if (user.role !== role) {
          ui.toast("אין הרשאה לצפות בדף זה", "error");
          redirectToDashboard();
          return;
     }
     callback();
}

function requireAuth(callback) {
     if (!authService.getCurrentUser()) {
          location.hash = "#/login";
          return;
     }
     callback();
}

function redirectToDashboard() {
     const user = authService.getCurrentUser();
     location.hash = user?.isTeacher() ? "#/teacher" : user?.isStudent() ? "#/student" : "#/login";
}

function renderNotFound(message = "הדף שחיפשת אינו קיים") {
     ui.render(`<div class="shell not-found"><strong>404</strong><h1>לא מצאנו את הדף</h1><p>${message}</p><a class="button button-primary" href="#/home">חזרה לדף הראשי</a></div>`);
}

function downloadJson(content, filename) {
     const blob = new Blob([content], { type: "application/json;charset=utf-8" });
     const url = URL.createObjectURL(blob);
     const anchor = document.createElement("a");
     anchor.href = url;
     anchor.download = filename;
     anchor.click();
     URL.revokeObjectURL(url);
}

function stopTimer() {
     if (timerId) clearInterval(timerId);
     timerId = null;
}

function toggleTheme() {
     const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
     storage.set("theme", next);
     applyTheme(next);
}

function applyTheme(theme) {
     document.documentElement.dataset.theme = theme;
     themeToggle.textContent = theme === "dark" ? "☀" : "☾";
     themeToggle.title = theme === "dark" ? "מצב בהיר" : "מצב כהה";
}
