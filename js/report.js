(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, formatCurrency, formatDate, dateStr, hazriCount } = KM.utils;

  let data = null;
  let report = { rows: [], totals: null, label: "" };

  const el = (id) => document.getElementById(id);
  const sum = (list, pick) => list.reduce((s, x) => s + (Number(pick(x)) || 0), 0);
  const isOpen = () => !el("reportModal").classList.contains("hidden");

  // Weeks run Monday to Sunday.
  function ranges() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);
    const lastSunday = new Date(monday);
    lastSunday.setDate(monday.getDate() - 1);
    return {
      thisWeek: [monday, today],
      lastWeek: [lastMonday, lastSunday],
      thisMonth: [new Date(today.getFullYear(), today.getMonth(), 1), today],
      lastMonth: [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)],
    };
  }

  function selectRange(key) {
    const [from, to] = ranges()[key];
    el("reportFrom").value = dateStr(from);
    el("reportTo").value = dateStr(to);
    document.querySelectorAll("#reportRangeButtons .filter-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.range === key));
    render();
  }

  // Period columns cover the chosen dates; "Kul Baaki" is all-time, because
  // that is what is actually owed on pay day.
  function compute() {
    const from = el("reportFrom").value;
    const to = el("reportTo").value;
    const inRange = (e) => e.date && (!from || e.date >= from) && (!to || e.date <= to);
    const rows = data.karigars
      .map((k) => {
        const work = (k.workLogs || []).filter(inRange);
        const samples = (k.sampleWork || []).filter(inRange);
        return {
          name: k.name,
          hazri: hazriCount((k.attendance || []).filter(inRange)).days,
          pieces: sum(work, (w) => w.pieces) + sum(samples, (s) => s.qty),
          earned: sum(work, (w) => w.pieces * w.rate) + sum(samples, (s) => s.qty * s.rate),
          advance: sum(work, (w) => w.advance),
          paid: sum((k.payments || []).filter(inRange), (p) => p.amount),
          balance: KM.karigar.computeTotals(k).remaining,
        };
      })
      .filter((r) => r.hazri || r.pieces || r.earned || r.advance || r.paid || r.balance)
      .sort((a, b) => a.name.localeCompare(b.name));
    const totals = {
      hazri: sum(rows, (r) => r.hazri),
      pieces: sum(rows, (r) => r.pieces),
      earned: sum(rows, (r) => r.earned),
      advance: sum(rows, (r) => r.advance),
      paid: sum(rows, (r) => r.paid),
      balance: sum(rows, (r) => Math.max(r.balance, 0)),
    };
    const label = `${formatDate(from)} - ${formatDate(to)}`;
    return { rows, totals, label };
  }

  function render() {
    if (!data || !isOpen()) return;
    report = compute();
    const { rows, totals } = report;
    el("reportTable").querySelector("tbody").innerHTML = rows.length
      ? rows.map((r) => `<tr>
          <td>${escapeHtml(r.name)}</td><td>${r.hazri}</td><td>${r.pieces}</td><td>${formatCurrency(r.earned)}</td>
          <td>${formatCurrency(r.advance)}</td><td>${formatCurrency(r.paid)}</td>
          <td class="${r.balance > 0 ? "money-due" : "money-ok"}"><b>${formatCurrency(Math.max(r.balance, 0))}</b></td>
        </tr>`).join("")
      : `<tr><td colspan="7" class="muted">In dino mein koi kaam ya payment nahi</td></tr>`;
    el("reportTable").querySelector("tfoot").innerHTML = rows.length
      ? `<tr><th>Total</th><th>${totals.hazri}</th><th>${totals.pieces}</th><th>${formatCurrency(totals.earned)}</th>
          <th>${formatCurrency(totals.advance)}</th><th>${formatCurrency(totals.paid)}</th>
          <th>${formatCurrency(totals.balance)}</th></tr>`
      : "";
  }

  function update(newData) {
    data = newData;
    render();
  }

  function shareWhatsApp() {
    const { rows, totals, label } = report;
    const business = KM.state.business ? KM.state.business.businessName : "Karakhana Manager";
    const lines = [`*${business}*`, `Karigar hisaab: ${label}`, ""];
    rows.forEach((r) => {
      lines.push(`${r.name}: ${r.hazri ? `${r.hazri} din, ` : ""}${r.pieces} pcs, kamai ${formatCurrency(r.earned)}, kharchi ${formatCurrency(r.advance)}, diya ${formatCurrency(r.paid)} → baaki ${formatCurrency(Math.max(r.balance, 0))}`);
    });
    lines.push("", `*Kul dena baaki: ${formatCurrency(totals ? totals.balance : 0)}*`);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  function init() {
    el("openReportBtn").addEventListener("click", () => {
      el("reportModal").classList.remove("hidden");
      selectRange("thisWeek");
    });
    el("reportRangeButtons").addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (btn) selectRange(btn.dataset.range);
    });
    ["reportFrom", "reportTo"].forEach((id) => el(id).addEventListener("change", () => {
      document.querySelectorAll("#reportRangeButtons .filter-btn").forEach((b) => b.classList.remove("active"));
      render();
    }));
    el("reportPdfBtn").addEventListener("click", () =>
      KM.pdf.karigarReport(KM.state.business, report.label, report.rows, report.totals));
    el("reportWhatsAppBtn").addEventListener("click", shareWhatsApp);
  }

  KM.report = { init, update };
})();
