(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, formatCurrency, formatDate, todayStr, toast } = KM.utils;

  let expenses = [];

  function render(data) {
    if (data) expenses = data.expenses;
    const picker = document.getElementById("kharchaMonth");
    if (!picker.value) picker.value = todayStr().slice(0, 7);
    const rows = expenses
      .filter((e) => (e.date || "").slice(0, 7) === picker.value)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    const total = rows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    document.getElementById("kharchaTotal").textContent = formatCurrency(total);

    const byCategory = {};
    rows.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0); });
    document.getElementById("kharchaByCategory").innerHTML = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `<span class="chip">${escapeHtml(cat)}: <b>${formatCurrency(amt)}</b></span>`)
      .join("");

    document.querySelector("#expenseTable tbody").innerHTML = rows.length
      ? rows.map((e) => `<tr>
          <td>${formatDate(e.date)}</td><td>${escapeHtml(e.category)}</td><td>${formatCurrency(e.amount)}</td>
          <td>${escapeHtml(e.note)}</td>
          <td><button class="row-delete" data-entry="${e.id}">✕</button></td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="muted">Is mahine koi kharcha nahi likha</td></tr>`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const date = document.getElementById("expenseDate").value;
    try {
      await KM.db.addExpense({
        date,
        category: document.getElementById("expenseCategory").value,
        amount: document.getElementById("expenseAmount").value,
        note: document.getElementById("expenseNote").value.trim(),
      });
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
      return;
    }
    // Show the month the entry went into, so it never seems to vanish.
    document.getElementById("kharchaMonth").value = date.slice(0, 7);
    render();
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseNote").value = "";
    toast("Kharcha add ho gaya");
  }

  async function handleDelete(e) {
    const btn = e.target.closest(".row-delete");
    if (!btn) return;
    if (!confirm("Yeh kharcha delete karein?")) return;
    await KM.db.deleteExpense(btn.dataset.entry);
  }

  function init() {
    document.getElementById("expenseDate").value = todayStr();
    document.getElementById("expenseForm").addEventListener("submit", handleSubmit);
    document.getElementById("expenseTable").addEventListener("click", handleDelete);
    document.getElementById("kharchaMonth").addEventListener("change", () => render());
  }

  KM.kharcha = { init, render };
})();
