(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, formatCurrency, todayStr, vyapariMoney, maalCount } = KM.utils;

  const BACKUP_EVERY_DAYS = 7;
  let lastData = null;

  const inMonth = (month) => (entry) => (entry.date || "").slice(0, 7) === month;
  const sum = (list, pick) => list.reduce((s, x) => s + (Number(pick(x)) || 0), 0);
  const setText = (id, text) => { document.getElementById(id).textContent = text; };

  // Cash basis: only money that actually changed hands in the month.
  function monthSummary(data, month) {
    const onMonth = inMonth(month);
    const income = sum(data.vyaparis.flatMap((v) => v.payments || []).filter(onMonth), (p) => p.amount);
    const workLogs = data.karigars.flatMap((k) => k.workLogs || []).filter(onMonth);
    const karigarPaid =
      sum(data.karigars.flatMap((k) => k.payments || []).filter(onMonth), (p) => p.amount) +
      sum(workLogs, (w) => w.advance);
    const expenses = sum(data.expenses.filter(onMonth), (e) => e.amount);
    return {
      income,
      karigarPaid,
      expenses,
      profit: income - karigarPaid - expenses,
      pieces: sum(workLogs, (w) => w.pieces),
    };
  }

  // Local-date arithmetic on YYYY-MM-DD strings, so timezones never shift a day.
  const toDate = (str) => { const [y, m, d] = str.split("-").map(Number); return new Date(y, m - 1, d); };
  const daysUntil = (str) => Math.round((toDate(str) - toDate(todayStr())) / 86400000);

  // Lots not yet delivered whose due date is tomorrow, today or already gone.
  function renderDueAlert(data) {
    const due = data.vyaparis
      .filter((v) => v.dueDate && v.deliveryStatus !== "delivered")
      .map((v) => ({ v, days: daysUntil(v.dueDate) }))
      .filter((x) => x.days <= 1)
      .sort((a, b) => a.days - b.days);
    document.getElementById("dueAlert").classList.toggle("hidden", !due.length);
    document.getElementById("dueAlertList").innerHTML = due.map(({ v, days }) => {
      const when = days < 0 ? `${-days} din late` : days === 0 ? "aaj delivery" : "kal delivery";
      const icon = days < 0 ? "🔴" : days === 0 ? "🟠" : "🟡";
      const name = [v.trader, v.design, v.lotPcs ? `${v.lotPcs} pcs` : ""].filter(Boolean).join(" · ");
      return `<button type="button" class="due-item" data-id="${v.id}">${icon} <b>${escapeHtml(name)}</b> — ${when}</button>`;
    }).join("");
  }

  function monthsEndingAt(month, count) {
    const [y, m] = month.split("-").map(Number);
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(y, m - 1 - (count - 1 - i), 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-IN", { month: "short" }) };
    });
  }

  const shortMoney = (n) => {
    const a = Math.abs(n);
    const t = a >= 100000 ? `${Math.round(a / 10000) / 10}L` : a >= 1000 ? `${Math.round(a / 100) / 10}k` : `${Math.round(a)}`;
    return (n < 0 ? "-" : "") + "₹" + t;
  };

  // Plain SVG bars: money in (green) vs money out (red), munafa underneath.
  function renderChart(data, month) {
    const months = monthsEndingAt(month, 6).map((mo) => {
      const s = monthSummary(data, mo.key);
      return { ...mo, income: s.income, out: s.karigarPaid + s.expenses, profit: s.profit };
    });
    const max = Math.max(1, ...months.map((m) => Math.max(m.income, m.out)));
    // Viewbox close to a phone's width, so the labels render near their real size.
    const W = 360, H = 190, top = 10, base = 142, slot = W / months.length, bar = Math.min(22, slot / 3.2);
    const hOf = (v) => (v / max) * (base - top);
    const parts = months.map((m, i) => {
      const cx = slot * i + slot / 2;
      const hi = hOf(m.income), ho = hOf(m.out);
      return `
        <rect x="${cx - bar - 2}" y="${base - hi}" width="${bar}" height="${hi}" rx="3" class="bar-in"><title>Aaya ${formatCurrency(m.income)}</title></rect>
        <rect x="${cx + 2}" y="${base - ho}" width="${bar}" height="${ho}" rx="3" class="bar-out"><title>Gaya ${formatCurrency(m.out)}</title></rect>
        <text x="${cx}" y="${base + 17}" class="chart-label">${m.label}</text>
        <text x="${cx}" y="${base + 36}" class="chart-profit ${m.profit < 0 ? "neg" : "pos"}">${shortMoney(m.profit)}</text>`;
    }).join("");
    document.getElementById("profitChart").innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pichhle 6 mahine ka munafa">
        <line x1="0" y1="${base}" x2="${W}" y2="${base}" class="chart-axis" />${parts}</svg>`;
  }

  function hasAnyRecords(data) {
    return data.karigars.length || data.vyaparis.length || data.expenses.length;
  }

  function renderBackupReminder(data) {
    const box = document.getElementById("backupReminder");
    let text = "";
    if (hasAnyRecords(data)) {
      if (!data.lastBackupAt) {
        text = "⚠️ Aapne abhi tak backup nahi liya — phone kho gaya toh saara hisaab chala jayega.";
      } else {
        const days = Math.floor((Date.now() - new Date(data.lastBackupAt).getTime()) / 86400000);
        if (days >= BACKUP_EVERY_DAYS) text = `⚠️ ${days} din se backup nahi liya.`;
      }
    }
    setText("backupReminderText", text);
    box.classList.toggle("hidden", !text);
  }

  function render(data) {
    if (data) lastData = data;
    if (!lastData) return;
    data = lastData;

    const picker = document.getElementById("monthPicker");
    if (!picker.value) picker.value = todayStr().slice(0, 7);
    const m = monthSummary(data, picker.value);
    setText("mIncome", formatCurrency(m.income));
    setText("mKarigarPaid", formatCurrency(m.karigarPaid));
    setText("mExpenses", formatCurrency(m.expenses));
    setText("mProfit", formatCurrency(m.profit));
    document.getElementById("mProfit").className = m.profit < 0 ? "money-due" : "money-ok";
    setText("mPieces", m.pieces);
    renderChart(data, picker.value);
    renderDueAlert(data);

    const payable = sum(data.karigars, (k) => Math.max(KM.karigar.computeTotals(k).remaining, 0));
    const receivable = sum(data.vyaparis, (v) => Math.max(vyapariMoney(v).balance, 0));
    setText("statKarigarPayable", formatCurrency(payable));
    setText("statVyapariBalance", formatCurrency(receivable));
    setText("statKarigarCount", data.karigars.length);
    setText("statKarigarMaal", sum(data.karigars, (k) => Math.max(maalCount(k.maal).paas, 0)));
    setText("statVyapariCount", data.vyaparis.length);
    setText("statVyapariPending", data.vyaparis.filter((v) => v.deliveryStatus !== "delivered").length);
    setText("statVyapariOverdue", data.vyaparis.filter((v) => KM.vyapari.isOverdue(v)).length);

    renderBackupReminder(data);
  }

  function init() {
    document.getElementById("monthPicker").addEventListener("change", () => render());
    document.getElementById("reminderBackupBtn").addEventListener("click", () => KM.backup.share());
    document.getElementById("dueAlertList").addEventListener("click", (e) => {
      const item = e.target.closest(".due-item");
      if (item) KM.vyapari.open(item.dataset.id);
    });
    document.getElementById("fullReportBtn").addEventListener("click", fullReport);
  }

  function fullReport() {
    if (!lastData) return;
    const month = document.getElementById("monthPicker").value || todayStr().slice(0, 7);
    try {
      KM.pdf.fullReport(KM.state.business, lastData, month, monthSummary(lastData, month));
    } catch (err) {
      KM.utils.toast("PDF nahi ban paya - internet check kariye", true);
    }
  }

  KM.dashboard = { init, render, fullReport };
})();
