export class ExamUI {
     constructor(appElement, toastContainer) {
          this.appElement = appElement;
          this.toastContainer = toastContainer;
     }

     render(content) {
          this.appElement.innerHTML = content;
          this.appElement.focus({ preventScroll: true });
          window.scrollTo({ top: 0, behavior: "smooth" });
     }

     toast(message, type = "success") {
          const toast = document.createElement("div");
          toast.className = `toast toast-${type}`;
          toast.textContent = message;
          this.toastContainer.appendChild(toast);
          requestAnimationFrame(() => toast.classList.add("toast-visible"));
          setTimeout(() => {
               toast.classList.remove("toast-visible");
               setTimeout(() => toast.remove(), 250);
          }, 3200);
     }

     confirm(message) {
          return window.confirm(message);
     }

     escape(value = "") {
          return String(value).replace(/[&<>'"]/g, (character) => ({
               "&": "&amp;",
               "<": "&lt;",
               ">": "&gt;",
               "'": "&#039;",
               '"': "&quot;"
          })[character]);
     }

     formatDate(value) {
          return new Intl.DateTimeFormat("he-IL", {
               dateStyle: "medium",
               timeStyle: "short"
          }).format(new Date(value));
     }

     formatDuration(totalSeconds) {
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          return `${minutes}:${String(seconds).padStart(2, "0")}`;
     }

     statusBadge(status) {
          const published = status === "published";
          return `<span class="badge ${published ? "badge-success" : "badge-muted"}">${published ? "פורסם" : "טיוטה"}</span>`;
     }

     emptyState(title, text, action = "") {
          return `<div class="empty-state"><div class="empty-icon">◎</div><h3>${title}</h3><p>${text}</p>${action}</div>`;
     }
}
