(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, formatCurrency, formatDate, todayStr, toast, hazriCount, maalCount, waLink } = KM.utils;
  const SUBS = ["workLogs", "sampleWork", "payments", "maal", "attendance"];
  const emptySub = () => ({ workLogs: [], sampleWork: [], payments: [], maal: [], attendance: [] });

  const state = {
    search: "",
    filter: "all", // all | unpaid
    subData: {},   // karigarId -> { workLogs, sampleWork, payments }
    totals: {},    // karigarId -> computed totals
    subUnsubs: {}, // karigarId -> { workLogs, sampleWork, payments } unsubscribe fns
  };

  function computeTotals(sub) {
    const workLogs = sub.workLogs || [];
    const sampleWork = sub.sampleWork || [];
    const payments = sub.payments || [];
    const workEarnings = workLogs.reduce((s, w) => s + w.pieces * w.rate, 0);
    const sampleEarnings = sampleWork.reduce((s, w) => s + w.qty * w.rate, 0);
    const totalAdvance = workLogs.reduce((s, w) => s + (w.advance || 0), 0);
    const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
    const totalEarnings = workEarnings + sampleEarnings;
    const remaining = totalEarnings - totalAdvance - totalPayments;
    const totalPieces = workLogs.reduce((s, w) => s + (w.pieces || 0), 0);
    return {
      workEarnings,
      sampleEarnings,
      totalEarnings,
      totalAdvance,
      totalPayments,
      remaining,
      totalPieces,
      status: remaining <= 0 ? "Paid" : "Unpaid",
    };
  }

  function subscribeKarigarSub(id) {
    if (state.subUnsubs[id]) return; // already subscribed
    state.subData[id] = emptySub();
    state.subUnsubs[id] = {};
    SUBS.forEach((sub) => {
      state.subUnsubs[id][sub] = KM.db.listenKarigarSub(id, sub, (rows) => {
        state.subData[id][sub] = rows;
        state.totals[id] = computeTotals(state.subData[id]);
        render();
        if (KM.state.currentKarigarId === id) renderDetail(id);
      });
    });
  }

  function unsubscribeKarigarSub(id) {
    const unsubs = state.subUnsubs[id];
    if (!unsubs) return;
    Object.values(unsubs).forEach((fn) => fn && fn());
    delete state.subUnsubs[id];
    delete state.subData[id];
    delete state.totals[id];
  }

  function syncSubscriptions() {
    const activeIds = new Set(KM.state.karigars.map((k) => k.id));
    activeIds.forEach((id) => subscribeKarigarSub(id));
    Object.keys(state.subUnsubs).forEach((id) => {
      if (!activeIds.has(id)) unsubscribeKarigarSub(id);
    });
  }


  function render() {
    const list = document.getElementById("karigarList");
    if (!list) return;
    const search = state.search.trim().toLowerCase();
    const items = KM.state.karigars.filter((k) => {
      if (search && !k.name.toLowerCase().includes(search)) return false;
      if (state.filter === "unpaid") {
        const t = state.totals[k.id];
        if (!t || t.status !== "Unpaid") return false;
      }
      return true;
    });

    if (!items.length) {
      list.innerHTML = `<div class="empty-state">Koi karigar nahi mila. "+ Naya Karigar" se add karein.</div>`;
      return;
    }

    list.innerHTML = items
      .map((k) => {
        const t = state.totals[k.id] || { remaining: 0, status: "Paid", totalPieces: 0 };
        const paas = maalCount((state.subData[k.id] || {}).maal).paas;
        return `
        <div class="entity-card" data-id="${k.id}">
          <div>
            <div class="entity-title">${escapeHtml(k.name)}</div>
            <div class="entity-sub">${k.phone ? escapeHtml(k.phone) + " · " : ""}${t.totalPieces} pieces total${paas > 0 ? ` · <b>${paas} pcs maal paas mein</b>` : ""}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span>${formatCurrency(t.remaining)}</span>
            <span class="badge ${t.status === "Paid" ? "badge-paid" : "badge-unpaid"}">${t.status}</span>
          </div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".entity-card").forEach((card) => {
      card.addEventListener("click", () => openDetail(card.dataset.id));
    });
  }

  // ---- Add / Edit form ----
  function openForm(karigar) {
    const form = document.getElementById("karigarForm");
    form.reset();
    document.getElementById("karigarFormId").value = karigar ? karigar.id : "";
    document.getElementById("karigarFormTitle").textContent = karigar ? "Karigar Edit Karein" : "Naya Karigar";
    document.getElementById("karigarName").value = karigar ? karigar.name : "";
    document.getElementById("karigarPhone").value = karigar ? karigar.phone || "" : "";
    document.getElementById("karigarDefaultRate").value = karigar ? karigar.defaultRate || 0 : 0;
    document.getElementById("deleteKarigarBtn").classList.toggle("hidden", !karigar);
    document.getElementById("karigarFormModal").classList.remove("hidden");
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("karigarFormId").value;
    const data = {
      name: document.getElementById("karigarName").value.trim(),
      phone: document.getElementById("karigarPhone").value.trim(),
      defaultRate: document.getElementById("karigarDefaultRate").value,
    };
    if (!data.name) return;
    try {
      KM.utils.showLoading(true);
      if (id) await KM.db.updateKarigar(id, data);
      else await KM.db.addKarigar(data);
      document.getElementById("karigarFormModal").classList.add("hidden");
      toast(id ? "Karigar update ho gaya" : "Karigar add ho gaya");
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
    } finally {
      KM.utils.showLoading(false);
    }
  }

  async function handleDelete() {
    const id = document.getElementById("karigarFormId").value;
    if (!id) return;
    if (!confirm("Is karigar ko poori history ke saath delete karein?")) return;
    try {
      KM.utils.showLoading(true);
      await KM.db.deleteKarigar(id);
      document.getElementById("karigarFormModal").classList.add("hidden");
      document.getElementById("karigarDetailModal").classList.add("hidden");
      toast("Karigar delete ho gaya");
    } catch (err) {
      toast(err.message || "Delete nahi ho paya", true);
    } finally {
      KM.utils.showLoading(false);
    }
  }

  // ---- Detail / ledger modal ----
  // Rate is typed every time on purpose - it varies by job - so only the
  // date is defaulted.
  function fillEntryDefaults(formId) {
    document.getElementById(formId).reset();
    const dateId = {
      workLogForm: "workDate", sampleWorkForm: "sampleDate", paymentForm: "paymentDate", maalForm: "maalDate",
    }[formId];
    document.getElementById(dateId).value = todayStr();
    if (formId === "workLogForm") document.getElementById("workAdvance").value = 0;
  }

  function openDetail(id) {
    KM.state.currentKarigarId = id;
    document.getElementById("karigarDetailModal").classList.remove("hidden");
    ["workLogForm", "sampleWorkForm", "paymentForm", "maalForm"].forEach(fillEntryDefaults);
    fillLotOptions();
    renderDetail(id);
  }

  // Lots still in the factory first, so the usual choice is near the top.
  function fillLotOptions() {
    const lots = [...KM.state.vyaparis].sort((a, b) =>
      (a.deliveryStatus === "delivered") - (b.deliveryStatus === "delivered"));
    document.getElementById("maalLot").innerHTML = `<option value="">— Kisi lot se nahi —</option>` +
      lots.map((v) => `<option value="${v.id}">${escapeHtml(lotName(v))}</option>`).join("");
  }

  function lotName(v) {
    return [v.trader, v.design, v.lotPcs ? `${v.lotPcs} pcs` : ""].filter(Boolean).join(" · ");
  }

  function renderDetail(id) {
    const karigar = KM.state.karigars.find((k) => k.id === id);
    if (!karigar) return;
    document.getElementById("karigarDetailName").textContent = karigar.name;
    const t = state.totals[id] || computeTotals(state.subData[id] || {});

    document.getElementById("karigarSummary").innerHTML = `
      <div class="sum-item"><span class="sum-label">Work Earnings</span><span class="sum-value">${formatCurrency(t.workEarnings)}</span></div>
      <div class="sum-item"><span class="sum-label">Sample Earnings</span><span class="sum-value">${formatCurrency(t.sampleEarnings)}</span></div>
      <div class="sum-item"><span class="sum-label">Total Earnings</span><span class="sum-value">${formatCurrency(t.totalEarnings)}</span></div>
      <div class="sum-item"><span class="sum-label">Advance</span><span class="sum-value">${formatCurrency(t.totalAdvance)}</span></div>
      <div class="sum-item"><span class="sum-label">Payments</span><span class="sum-value">${formatCurrency(t.totalPayments)}</span></div>
      <div class="sum-item"><span class="sum-label">Remaining</span><span class="sum-value">${formatCurrency(t.remaining)} <span class="badge ${t.status === "Paid" ? "badge-paid" : "badge-unpaid"}">${t.status}</span></span></div>
    `;

    const sub = state.subData[id] || emptySub();
    const month = todayStr().slice(0, 7);
    const hazri = hazriCount(sub.attendance.filter((a) => a.date.slice(0, 7) === month));
    const maal = maalCount(sub.maal);
    document.getElementById("karigarSummary").insertAdjacentHTML("beforeend", `
      <div class="sum-item"><span class="sum-label">Is mahine hazri</span><span class="sum-value">${hazri.days} din</span></div>
      <div class="sum-item"><span class="sum-label">Maal paas mein</span><span class="sum-value">${maal.paas} pcs</span></div>
    `);

    document.querySelector("#workLogTable tbody").innerHTML = sub.workLogs
      .map(
        (w) => `<tr>
          <td>${formatDate(w.date)}</td><td>${w.pieces}</td><td>${formatCurrency(w.rate)}</td>
          <td>${formatCurrency(w.pieces * w.rate)}</td><td>${formatCurrency(w.advance)}</td>
          <td>${escapeHtml(w.note)}</td>
          <td><button class="row-delete" data-sub="workLogs" data-entry="${w.id}">✕</button></td>
        </tr>`
      )
      .join("") || `<tr><td colspan="7" class="muted">Koi entry nahi</td></tr>`;

    document.querySelector("#sampleWorkTable tbody").innerHTML = sub.sampleWork
      .map(
        (s) => `<tr>
          <td>${formatDate(s.date)}</td><td>${s.qty}</td><td>${formatCurrency(s.rate)}</td>
          <td>${formatCurrency(s.qty * s.rate)}</td><td>${escapeHtml(s.note)}</td>
          <td><button class="row-delete" data-sub="sampleWork" data-entry="${s.id}">✕</button></td>
        </tr>`
      )
      .join("") || `<tr><td colspan="6" class="muted">Koi entry nahi</td></tr>`;

    document.querySelector("#paymentTable tbody").innerHTML = sub.payments
      .map(
        (p) => `<tr>
          <td>${formatDate(p.date)}</td><td>${formatCurrency(p.amount)}</td><td>${escapeHtml(p.note)}</td>
          <td><button class="row-delete" data-sub="payments" data-entry="${p.id}">✕</button></td>
        </tr>`
      )
      .join("") || `<tr><td colspan="4" class="muted">Koi entry nahi</td></tr>`;

    document.getElementById("maalSummary").innerHTML =
      `Diya: <b>${maal.diya}</b> · Wapas aaya: <b>${maal.wapas}</b> · Abhi paas mein: <b class="${maal.paas > 0 ? "money-due" : "money-ok"}">${maal.paas} pcs</b>`;
    document.querySelector("#maalTable tbody").innerHTML = sub.maal
      .map((m) => {
        const v = m.vyapariId && KM.state.vyaparis.find((x) => x.id === m.vyapariId);
        const lot = m.vyapariId ? (v ? lotName(v) : "(lot hata diya)") : "-";
        return `<tr>
          <td>${formatDate(m.date)}</td>
          <td>${m.type === "wapas" ? "⬅️ Wapas aaya" : "➡️ Diya"}</td><td>${m.pcs}</td>
          <td>${escapeHtml(lot)}</td><td>${escapeHtml(m.note)}</td>
          <td><button class="row-delete" data-sub="maal" data-entry="${m.id}">✕</button></td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="6" class="muted">Koi entry nahi</td></tr>`;
  }

  async function handleRowDelete(e) {
    const btn = e.target.closest(".row-delete");
    if (!btn) return;
    if (!confirm("Yeh entry delete karein?")) return;
    await KM.db.deleteSubEntry(KM.state.currentKarigarId, btn.dataset.sub, btn.dataset.entry);
  }

  function whatsAppShare() {
    const id = KM.state.currentKarigarId;
    const karigar = KM.state.karigars.find((k) => k.id === id);
    const t = state.totals[id];
    if (!karigar || !t) return;
    const business = KM.state.business ? KM.state.business.businessName : "Karakhana Manager";
    const lines = [
      `*${business}*`,
      `Karigar: ${karigar.name}`,
      `Total Earnings: ${formatCurrency(t.totalEarnings)}`,
      `Advance: ${formatCurrency(t.totalAdvance)}`,
      `Payments: ${formatCurrency(t.totalPayments)}`,
      `Remaining: ${formatCurrency(t.remaining)} (${t.status})`,
    ];
    window.open(waLink(karigar.phone, lines.join("\n")), "_blank");
  }

  function downloadPdf() {
    const id = KM.state.currentKarigarId;
    const karigar = KM.state.karigars.find((k) => k.id === id);
    const t = state.totals[id];
    const sub = state.subData[id];
    if (!karigar || !t || !sub) return;
    KM.pdf.karigarStatement(KM.state.business, karigar, sub, t);
  }

  // ---- Forms for work/sample/payment entries ----
  async function saveEntry(e, add, data) {
    e.preventDefault();
    try {
      await add(KM.state.currentKarigarId, data);
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
      return;
    }
    fillEntryDefaults(e.target.id);
    toast("Entry add ho gayi");
  }

  function handleWorkLogSubmit(e) {
    saveEntry(e, KM.db.addWorkLog, {
      date: document.getElementById("workDate").value,
      pieces: document.getElementById("workPieces").value,
      rate: document.getElementById("workRate").value,
      advance: document.getElementById("workAdvance").value,
      note: document.getElementById("workNote").value,
    });
  }

  function handleSampleSubmit(e) {
    saveEntry(e, KM.db.addSampleWork, {
      date: document.getElementById("sampleDate").value,
      qty: document.getElementById("sampleQty").value,
      rate: document.getElementById("sampleRate").value,
      note: document.getElementById("sampleNote").value,
    });
  }

  function handlePaymentSubmit(e) {
    saveEntry(e, KM.db.addPayment, {
      date: document.getElementById("paymentDate").value,
      amount: document.getElementById("paymentAmount").value,
      note: document.getElementById("paymentNote").value,
    });
  }

  function handleMaalSubmit(e) {
    saveEntry(e, KM.db.addMaal, {
      date: document.getElementById("maalDate").value,
      type: document.getElementById("maalType").value,
      pcs: document.getElementById("maalPcs").value,
      vyapariId: document.getElementById("maalLot").value,
      note: document.getElementById("maalNote").value,
    });
  }

  function init() {
    document.getElementById("addKarigarBtn").addEventListener("click", () => openForm(null));
    document.getElementById("karigarForm").addEventListener("submit", handleFormSubmit);
    document.getElementById("deleteKarigarBtn").addEventListener("click", handleDelete);
    document.getElementById("editKarigarBtn").addEventListener("click", () => {
      const k = KM.state.karigars.find((k) => k.id === KM.state.currentKarigarId);
      openForm(k);
    });
    document.getElementById("karigarWhatsAppBtn").addEventListener("click", whatsAppShare);
    document.getElementById("karigarPdfBtn").addEventListener("click", downloadPdf);

    document.getElementById("karigarSearch").addEventListener("input", (e) => {
      state.search = e.target.value;
      render();
    });
    document.getElementById("karigarFilter").addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      document.querySelectorAll("#karigarFilter .filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      render();
    });

    document.querySelectorAll(".ledger-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".ledger-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".ledger-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("panel" + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).classList.add("active");
      });
    });

    document.getElementById("workLogForm").addEventListener("submit", handleWorkLogSubmit);
    document.getElementById("sampleWorkForm").addEventListener("submit", handleSampleSubmit);
    document.getElementById("paymentForm").addEventListener("submit", handlePaymentSubmit);
    document.getElementById("maalForm").addEventListener("submit", handleMaalSubmit);
    document.getElementById("karigarDetailModal").addEventListener("click", handleRowDelete);
  }

  KM.karigar = { init, render, syncSubscriptions, computeTotals };
})();
