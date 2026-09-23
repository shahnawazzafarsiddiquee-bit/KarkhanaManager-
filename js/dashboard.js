(function () {
  const KM = window.KM || (window.KM = {});
  const { formatCurrency, todayStr, vyapariMoney } = KM.utils;

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

    const payable = sum(data.karigars, (k) => Math.max(KM.karigar.computeTotals(k).remaining, 0));
    const receivable = sum(data.vyaparis, (v) => Math.max(vyapariMoney(v).balance, 0));
    setText("statKarigarPayable", formatCurrency(payable));
    setText("statVyapariBalance", formatCurrency(receivable));
    setText("statKarigarCount", data.karigars.length);
    setText("statVyapariCount", data.vyaparis.length);
    setText("statVyapariPending", data.vyaparis.filter((v) => v.deliveryStatus !== "delivered").length);
    setText("statVyapariOverdue", data.vyaparis.filter((v) => KM.vyapari.isOverdue(v)).length);

    renderBackupReminder(data);
  }

  function init() {
    document.getElementById("monthPicker").addEventListener("change", () => render());
    document.getElementById("reminderBackupBtn").addEventListener("click", () => KM.backup.share());
  }

  KM.dashboard = { init, render };
})();
