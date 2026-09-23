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

  // Local-time YYYY-MM-DD, the format <input type="date"> reads and writes.
  function dateStr(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function todayStr() {
    return dateStr(new Date());
  }

  // What a vyapari owes for a lot: pieces x per-piece rate, less what they paid.
  function vyapariMoney(v) {
    const total = (Number(v.lotPcs) || 0) * (Number(v.ratePerPc) || 0);
    const received = (v.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return { total, received, balance: total - received };
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

  KM.utils = { escapeHtml, formatCurrency, formatDate, dateStr, todayStr, vyapariMoney, toast, showLoading };
})();
