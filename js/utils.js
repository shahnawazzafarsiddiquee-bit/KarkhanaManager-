(function () {
  const KM = window.KM || (window.KM = {});

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(n) {
    const num = Number(n) || 0;
    return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function formatDate(str) {
    if (!str) return "-";
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function todayStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  let toastTimer = null;
  function toast(message, isError) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("toast-error", !!isError);
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
  }

  function showLoading(show) {
    const el = document.getElementById("loadingOverlay");
    if (el) el.classList.toggle("hidden", !show);
  }

  KM.utils = { escapeHtml, formatCurrency, formatDate, todayStr, toast, showLoading };
})();
