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

  const sumOf = (list, pick) => (list || []).reduce((s, x) => s + (Number(pick(x)) || 0), 0);

  // Hazri marks -> counts; a half day counts as half a working day.
  function hazriCount(entries) {
    const c = { P: 0, H: 0, A: 0 };
    (entries || []).forEach((a) => { if (a.status in c) c[a.status]++; });
    return { present: c.P, half: c.H, absent: c.A, days: c.P + c.H / 2 };
  }

  // Pieces a karigar was given vs brought back; the gap is still with them.
  function maalCount(entries) {
    const diya = sumOf((entries || []).filter((m) => m.type === "diya"), (m) => m.pcs);
    const wapas = sumOf((entries || []).filter((m) => m.type === "wapas"), (m) => m.pcs);
    return { diya, wapas, paas: diya - wapas };
  }

  function fabricCount(entries) {
    const aaya = sumOf((entries || []).filter((f) => f.type === "in"), (f) => f.meters);
    const kata = sumOf((entries || []).filter((f) => f.type === "cut"), (f) => f.meters);
    return { aaya, kata, bacha: aaya - kata };
  }

  // wa.me needs the country code; a bare 10-digit Indian number gets 91.
  function waLink(phone, text) {
    let digits = String(phone || "").replace(/[^0-9]/g, "");
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === 10) digits = "91" + digits;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
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

  KM.utils = {
    escapeHtml, formatCurrency, formatDate, dateStr, todayStr, vyapariMoney, sumOf,
    hazriCount, maalCount, fabricCount, waLink, toast, showLoading,
  };
})();
