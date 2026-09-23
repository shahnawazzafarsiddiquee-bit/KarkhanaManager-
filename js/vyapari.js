(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, formatCurrency, formatDate, todayStr, toast, vyapariMoney, fabricCount, waLink } = KM.utils;
  const meters = (n) => `${Math.round((Number(n) || 0) * 100) / 100} m`;

  const state = { search: "", filter: "all", currentId: null };

  function isOverdue(v) {
    if (!v.dueDate) return false;
    if (v.deliveryStatus === "delivered") return false;
    return v.dueDate < todayStr();
  }

  function lotLine(v) {
    const pcs = Number(v.lotPcs) || 0;
    const rate = Number(v.ratePerPc) || 0;
    if (!pcs || !rate) return "";
    return `${pcs} pcs × ${formatCurrency(rate)} = ${formatCurrency(pcs * rate)}`;
  }

  function moneyBadge(v) {
    const m = vyapariMoney(v);
    if (m.total <= 0) return "";
    return m.balance > 0
      ? `<span class="badge badge-unpaid">Baaki ${formatCurrency(m.balance)}</span>`
      : `<span class="badge badge-paid">Paisa poora</span>`;
  }

  // "Taiyaar" = pieces karigars brought back against this lot.
  function progressLine(v, progress) {
    const p = progress[v.id];
    if (!p) return "";
    return `Taiyaar ${p.wapas}${v.lotPcs ? "/" + v.lotPcs : ""} pcs`;
  }

  function render() {
    const list = document.getElementById("vyapariList");
    if (!list) return;
    const progress = KM.db.lotProgress();
    const search = state.search.trim().toLowerCase();
    const items = KM.state.vyaparis.filter((v) => {
      if (search) {
        const hay = `${v.trader || ""} ${v.fabric || ""} ${v.design || ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (state.filter === "pending" && v.deliveryStatus === "delivered") return false;
      if (state.filter === "overdue" && !isOverdue(v)) return false;
      if (state.filter === "balance" && vyapariMoney(v).balance <= 0) return false;
      return true;
    });

    if (!items.length) {
      list.innerHTML = `<div class="empty-state">Koi vyapari record nahi mila. "+ Naya Vyapari" se add karein.</div>`;
    } else {
      list.innerHTML = items
        .map((v) => {
          const deliveryBadge = v.deliveryStatus === "delivered"
            ? `<span class="badge badge-delivered">Delivered</span>`
            : `<span class="badge badge-pending">Pending</span>`;
          const overdueBadge = isOverdue(v) ? `<span class="badge badge-overdue">Overdue</span>` : "";
          const rate = Number(v.ratePerPc) ? `${v.lotPcs || 0} pcs × ${formatCurrency(v.ratePerPc)}/pc` : "";
          const sub = [rate, progressLine(v, progress), v.design && escapeHtml(v.design),
            v.dueDate && `Due ${formatDate(v.dueDate)}`]
            .filter(Boolean).join(" · ");
          return `
          <div class="entity-card" data-id="${v.id}">
            <div>
              <div class="entity-title">${escapeHtml(v.trader || "-")}</div>
              <div class="entity-sub">${sub}</div>
            </div>
            <div class="card-badges">
              ${moneyBadge(v)}${deliveryBadge}${overdueBadge}
            </div>
          </div>`;
        })
        .join("");

      list.querySelectorAll(".entity-card").forEach((card) => {
        card.addEventListener("click", () => {
          const v = KM.state.vyaparis.find((x) => x.id === card.dataset.id);
          openForm(v);
        });
      });
    }

    // Keep an open record's payment list in step with saves and deletes.
    const modalOpen = !document.getElementById("vyapariFormModal").classList.contains("hidden");
    if (modalOpen && state.currentId) {
      const v = KM.state.vyaparis.find((x) => x.id === state.currentId);
      if (v) renderRecord(v);
    }
  }

  function renderRecord(v) {
    const m = vyapariMoney(v);
    const p = KM.db.lotProgress()[v.id];
    const progressRows = p
      ? `<div class="money-row"><span>Karigar ko diya</span><b>${p.diya} pcs</b></div>
         <div class="money-row"><span>Taiyaar ho ke aaya</span><b>${p.wapas}${v.lotPcs ? " / " + v.lotPcs : ""} pcs</b></div>`
      : "";
    document.getElementById("vyapariMoneySummary").innerHTML = (m.total > 0
      ? `<div class="money-row"><span>Lot</span><b>${lotLine(v)}</b></div>
         <div class="money-row"><span>Mila</span><b class="money-ok">${formatCurrency(m.received)}</b></div>
         <div class="money-row"><span>Baaki</span><b class="${m.balance > 0 ? "money-due" : "money-ok"}">${formatCurrency(Math.max(m.balance, 0))}</b></div>`
      : `<p class="muted">Neeche Lot Pieces aur ek piece ka rate bhariye, tab baaki raqam dikhegi.</p>`) + progressRows;
    document.getElementById("vyapariRemindBtn").classList.toggle("hidden", m.balance <= 0);

    const f = fabricCount(v.fabricStock);
    document.getElementById("fabricSummary").innerHTML =
      `Aaya: <b>${meters(f.aaya)}</b> · Kata: <b>${meters(f.kata)}</b> · Bacha: <b class="${f.bacha < 0 ? "money-due" : "money-ok"}">${meters(f.bacha)}</b>`;
    const fabricRows = [...(v.fabricStock || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    document.querySelector("#fabricTable tbody").innerHTML = fabricRows.length
      ? fabricRows.map((x) => `<tr>
          <td>${formatDate(x.date)}</td><td>${x.type === "cut" ? "✂️ Kata" : "📦 Aaya"}</td><td>${meters(x.meters)}</td>
          <td>${escapeHtml(x.note)}</td>
          <td><button class="row-delete" data-fabric="${x.id}">✕</button></td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="muted">Abhi kapda nahi likha</td></tr>`;

    const rows = [...(v.payments || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    document.querySelector("#vyapariPayTable tbody").innerHTML = rows.length
      ? rows.map((p) => `<tr>
          <td>${formatDate(p.date)}</td><td>${formatCurrency(p.amount)}</td><td>${escapeHtml(p.note)}</td>
          <td><button class="row-delete" data-entry="${p.id}">✕</button></td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="muted">Abhi koi payment nahi mila</td></tr>`;
  }

  function updateLotValue() {
    document.getElementById("vyapariLotValue").textContent = lotLine({
      lotPcs: document.getElementById("vyapariLotPcs").value,
      ratePerPc: document.getElementById("vyapariRatePerPc").value,
    });
  }

  function openForm(v) {
    state.currentId = v ? v.id : null;
    const form = document.getElementById("vyapariForm");
    form.reset();
    document.getElementById("vyapariFormId").value = v ? v.id : "";
    document.getElementById("vyapariFormTitle").textContent = v ? v.trader : "Naya Vyapari";
    document.getElementById("vyapariTrader").value = v ? v.trader || "" : "";
    document.getElementById("vyapariPhone").value = v ? v.phone || "" : "";
    document.getElementById("vyapariFabric").value = v ? v.fabric || "" : "";
    document.getElementById("vyapariLotPcs").value = v ? v.lotPcs || 0 : 0;
    document.getElementById("vyapariRatePerPc").value = v ? v.ratePerPc || 0 : 0;
    document.getElementById("vyapariSizes").value = v ? v.sizes || "" : "";
    document.getElementById("vyapariColorMeters").value = v ? v.colorMeters || "" : "";
    document.getElementById("vyapariTotalMeters").value = v ? v.totalMeters || 0 : 0;
    document.getElementById("vyapariColor").value = v ? v.color || "" : "";
    document.getElementById("vyapariDesign").value = v ? v.design || "" : "";
    document.getElementById("vyapariDueDate").value = v ? v.dueDate || "" : "";
    document.getElementById("vyapariNotes").value = v ? v.notes || "" : "";
    document.getElementById("vyapariDelivered").checked = v ? v.deliveryStatus === "delivered" : false;
    document.getElementById("vyapariLotReceived").checked = v ? !!v.lotReceived : false;
    document.getElementById("vyapariLotReceivedDate").value = v ? v.lotReceivedDate || "" : "";
    document.getElementById("vyapariLotReceivedNote").value = v ? v.lotReceivedNote || "" : "";
    document.getElementById("deleteVyapariBtn").classList.toggle("hidden", !v);
    document.getElementById("vyapariPdfBtn").classList.toggle("hidden", !v);
    updateLotValue();

    // Payments belong to a saved record, so the section appears on edit only.
    document.getElementById("vyapariPaySection").classList.toggle("hidden", !v);
    document.getElementById("vyapariPayForm").reset();
    document.getElementById("vyapariPayDate").value = todayStr();
    document.getElementById("fabricForm").reset();
    document.getElementById("fabricDate").value = todayStr();
    document.getElementById("vyapariStock").open = !!v && (v.fabricStock || []).length > 0;
    if (v) renderRecord(v);

    // Keep the optional section collapsed unless this record already uses it.
    const extras = ["fabric", "color", "sizes", "colorMeters", "totalMeters", "notes",
      "lotReceivedDate", "lotReceivedNote"];
    document.querySelector("#vyapariForm .more-details").open = !!v && extras.some((f) => v[f]);
    document.getElementById("vyapariFormModal").classList.remove("hidden");
  }

  function collectForm() {
    return {
      trader: document.getElementById("vyapariTrader").value.trim(),
      phone: document.getElementById("vyapariPhone").value.trim(),
      fabric: document.getElementById("vyapariFabric").value.trim(),
      lotPcs: Number(document.getElementById("vyapariLotPcs").value) || 0,
      ratePerPc: Number(document.getElementById("vyapariRatePerPc").value) || 0,
      sizes: document.getElementById("vyapariSizes").value.trim(),
      colorMeters: document.getElementById("vyapariColorMeters").value.trim(),
      totalMeters: Number(document.getElementById("vyapariTotalMeters").value) || 0,
      color: document.getElementById("vyapariColor").value.trim(),
      design: document.getElementById("vyapariDesign").value.trim(),
      dueDate: document.getElementById("vyapariDueDate").value,
      notes: document.getElementById("vyapariNotes").value.trim(),
      deliveryStatus: document.getElementById("vyapariDelivered").checked ? "delivered" : "pending",
      lotReceived: document.getElementById("vyapariLotReceived").checked,
      lotReceivedDate: document.getElementById("vyapariLotReceivedDate").value,
      lotReceivedNote: document.getElementById("vyapariLotReceivedNote").value.trim(),
    };
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("vyapariFormId").value;
    const data = collectForm();
    if (!data.trader) return;
    try {
      if (id) await KM.db.updateVyapari(id, data);
      else await KM.db.addVyapari(data);
      document.getElementById("vyapariFormModal").classList.add("hidden");
      toast(id ? "Vyapari update ho gaya" : "Vyapari add ho gaya");
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
    }
  }

  async function handlePaySubmit(e) {
    e.preventDefault();
    try {
      await KM.db.addVyapariPayment(state.currentId, {
        date: document.getElementById("vyapariPayDate").value,
        amount: document.getElementById("vyapariPayAmount").value,
        note: document.getElementById("vyapariPayNote").value,
      });
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
      return;
    }
    e.target.reset();
    document.getElementById("vyapariPayDate").value = todayStr();
    toast("Payment add ho gaya");
  }

  async function handleFabricSubmit(e) {
    e.preventDefault();
    try {
      await KM.db.addFabric(state.currentId, {
        date: document.getElementById("fabricDate").value,
        type: document.getElementById("fabricType").value,
        meters: document.getElementById("fabricMeters").value,
        note: document.getElementById("fabricNote").value,
      });
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
      return;
    }
    e.target.reset();
    document.getElementById("fabricDate").value = todayStr();
    toast("Kapda entry add ho gayi");
  }

  async function handleFabricDelete(e) {
    const btn = e.target.closest(".row-delete");
    if (!btn) return;
    if (!confirm("Yeh kapda entry delete karein?")) return;
    await KM.db.deleteFabric(state.currentId, btn.dataset.fabric);
  }

  function sendReminder() {
    const v = KM.state.vyaparis.find((x) => x.id === state.currentId);
    if (!v) return;
    const m = vyapariMoney(v);
    const b = KM.state.business || {};
    const lot = [v.design, lotLine(v)].filter(Boolean).join(" - ");
    const lines = [
      `*${b.businessName || "Karakhana Manager"}*`,
      `Namaste ${v.trader} ji,`,
      "",
      `Lot: ${lot}`,
      `Mila: ${formatCurrency(m.received)}`,
      `*Baaki: ${formatCurrency(Math.max(m.balance, 0))}*`,
      "",
      "Kripya baaki payment jaldi bhej dijiye. Dhanyavaad 🙏",
      b.ownerName ? `- ${b.ownerName}` : "",
    ].filter((l, i, all) => l || all[i - 1]);
    window.open(waLink(v.phone, lines.join("\n").trim()), "_blank");
  }

  async function handlePayDelete(e) {
    const btn = e.target.closest(".row-delete");
    if (!btn) return;
    if (!confirm("Yeh payment delete karein?")) return;
    await KM.db.deleteVyapariPayment(state.currentId, btn.dataset.entry);
  }

  async function handleDelete() {
    const id = document.getElementById("vyapariFormId").value;
    if (!id) return;
    if (!confirm("Yeh vyapari record delete karein? Iske saare payment bhi mit jayenge.")) return;
    try {
      await KM.db.deleteVyapari(id);
      document.getElementById("vyapariFormModal").classList.add("hidden");
      toast("Vyapari delete ho gaya");
    } catch (err) {
      toast(err.message || "Delete nahi ho paya", true);
    }
  }

  function downloadPdf() {
    const v = KM.state.vyaparis.find((x) => x.id === state.currentId);
    if (v) KM.pdf.vyapariChallan(KM.state.business, v);
  }

  function init() {
    document.getElementById("vyapariLotReceived").addEventListener("change", (e) => {
      const date = document.getElementById("vyapariLotReceivedDate");
      if (e.target.checked && !date.value) date.value = todayStr();
    });
    document.getElementById("vyapariLotPcs").addEventListener("input", updateLotValue);
    document.getElementById("vyapariRatePerPc").addEventListener("input", updateLotValue);
    document.getElementById("addVyapariBtn").addEventListener("click", () => openForm(null));
    document.getElementById("vyapariForm").addEventListener("submit", handleFormSubmit);
    document.getElementById("vyapariPayForm").addEventListener("submit", handlePaySubmit);
    document.getElementById("vyapariPayTable").addEventListener("click", handlePayDelete);
    document.getElementById("fabricForm").addEventListener("submit", handleFabricSubmit);
    document.getElementById("fabricTable").addEventListener("click", handleFabricDelete);
    document.getElementById("vyapariRemindBtn").addEventListener("click", sendReminder);
    document.getElementById("deleteVyapariBtn").addEventListener("click", handleDelete);
    document.getElementById("vyapariPdfBtn").addEventListener("click", downloadPdf);

    document.getElementById("vyapariSearch").addEventListener("input", (e) => {
      state.search = e.target.value;
      render();
    });
    document.getElementById("vyapariFilter").addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      document.querySelectorAll("#vyapariFilter .filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filter = btn.dataset.filter;
      render();
    });
  }

  function open(id) {
    const v = KM.state.vyaparis.find((x) => x.id === id);
    if (v) openForm(v);
  }

  KM.vyapari = { init, render, isOverdue, open };
})();
