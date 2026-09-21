(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, formatCurrency, formatDate, todayStr, toast } = KM.utils;

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
    const thisMonthPieces = workLogs
      .filter((w) => w.date && w.date.slice(0, 7) === todayStr().slice(0, 7))
      .reduce((s, w) => s + (w.pieces || 0), 0);
    return {
      workEarnings,
      sampleEarnings,
      totalEarnings,
      totalAdvance,
      totalPayments,
      remaining,
      totalPieces,
      thisMonthPieces,
      status: remaining <= 0 ? "Paid" : "Unpaid",
    };
  }

  function subscribeKarigarSub(uid, id) {
    if (state.subUnsubs[id]) return; // already subscribed
    state.subData[id] = { workLogs: [], sampleWork: [], payments: [] };
    const subs = ["workLogs", "sampleWork", "payments"];
    state.subUnsubs[id] = {};
    subs.forEach((sub) => {
      state.subUnsubs[id][sub] = KM.db.listenKarigarSub(uid, id, sub, (rows) => {
        state.subData[id][sub] = rows;
        state.totals[id] = computeTotals(state.subData[id]);
        render();
        if (KM.state.currentKarigarId === id) renderDetail(id);
        if (KM.dashboard) KM.dashboard.render();
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

  function syncSubscriptions(uid) {
    const activeIds = new Set(KM.state.karigars.map((k) => k.id));
    activeIds.forEach((id) => subscribeKarigarSub(uid, id));
    Object.keys(state.subUnsubs).forEach((id) => {
      if (!activeIds.has(id)) unsubscribeKarigarSub(id);
    });
  }

  function stopAll() {
    Object.keys(state.subUnsubs).forEach(unsubscribeKarigarSub);
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
        return `
        <div class="entity-card" data-id="${k.id}">
          <div>
            <div class="entity-title">${escapeHtml(k.name)}</div>
            <div class="entity-sub">${k.phone ? escapeHtml(k.phone) + " · " : ""}${t.totalPieces} pieces total</div>
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
    const uid = KM.state.user.uid;
    const id = document.getElementById("karigarFormId").value;
    const data = {
      name: document.getElementById("karigarName").value.trim(),
      phone: document.getElementById("karigarPhone").value.trim(),
      defaultRate: document.getElementById("karigarDefaultRate").value,
    };
    if (!data.name) return;
    try {
      KM.utils.showLoading(true);
      if (id) await KM.db.updateKarigar(uid, id, data);
      else await KM.db.addKarigar(uid, data);
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
      await KM.db.deleteKarigar(KM.state.user.uid, id);
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
  function openDetail(id) {
    KM.state.currentKarigarId = id;
    document.getElementById("karigarDetailModal").classList.remove("hidden");
    ["workDate", "sampleDate", "paymentDate"].forEach((elId) => {
      const el = document.getElementById(elId);
      if (el && !el.value) el.value = todayStr();
    });
    renderDetail(id);
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

    const sub = state.subData[id] || { workLogs: [], sampleWork: [], payments: [] };

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
  }

  async function handleRowDelete(e) {
    const btn = e.target.closest(".row-delete");
    if (!btn) return;
    if (!confirm("Yeh entry delete karein?")) return;
    await KM.db.deleteSubEntry(KM.state.user.uid, KM.state.currentKarigarId, btn.dataset.sub, btn.dataset.entry);
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
    const text = encodeURIComponent(lines.join("\n"));
    const phone = (karigar.phone || "").replace(/[^0-9]/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
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
  async function handleWorkLogSubmit(e) {
    e.preventDefault();
    const data = {
      date: document.getElementById("workDate").value,
      pieces: document.getElementById("workPieces").value,
      rate: document.getElementById("workRate").value,
      advance: document.getElementById("workAdvance").value,
      note: document.getElementById("workNote").value,
    };
    await KM.db.addWorkLog(KM.state.user.uid, KM.state.currentKarigarId, data);
    e.target.reset();
    document.getElementById("workDate").value = todayStr();
    document.getElementById("workAdvance").value = 0;
  }

  async function handleSampleSubmit(e) {
    e.preventDefault();
    const data = {
      date: document.getElementById("sampleDate").value,
      qty: document.getElementById("sampleQty").value,
      rate: document.getElementById("sampleRate").value,
      note: document.getElementById("sampleNote").value,
    };
    await KM.db.addSampleWork(KM.state.user.uid, KM.state.currentKarigarId, data);
    e.target.reset();
    document.getElementById("sampleDate").value = todayStr();
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    const data = {
      date: document.getElementById("paymentDate").value,
      amount: document.getElementById("paymentAmount").value,
      note: document.getElementById("paymentNote").value,
    };
    await KM.db.addPayment(KM.state.user.uid, KM.state.currentKarigarId, data);
    e.target.reset();
    document.getElementById("paymentDate").value = todayStr();
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
    document.getElementById("karigarDetailModal").addEventListener("click", handleRowDelete);
  }

  KM.karigar = { init, render, syncSubscriptions, stopAll, computeTotals, getTotals: (id) => state.totals[id] };
})();
