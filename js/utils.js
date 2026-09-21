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

  function friendlyAuthError(err) {
    const map = {
      "auth/email-already-in-use": "Yeh email pehle se registered hai. Sign In karein.",
      "auth/invalid-email": "Email sahi format mein nahi hai.",
      "auth/weak-password": "Password kam se kam 6 characters ka hona chahiye.",
      "auth/user-not-found": "Is email se koi account nahi mila.",
      "auth/wrong-password": "Password galat hai.",
      "auth/invalid-credential": "Email ya password galat hai.",
      "auth/too-many-requests": "Bahut zyada attempts ho gaye, thodi der baad try karein.",
    };
    return map[err && err.code] || (err && err.message) || "Kuch galat ho gaya, dobara try karein.";
  }

  KM.utils = { escapeHtml, formatCurrency, formatDate, todayStr, toast, showLoading, friendlyAuthError };
})();
