(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, formatCurrency, formatDate, todayStr, toast } = KM.utils;

  const state = { search: "", filter: "all" };

  function isOverdue(v) {
    if (!v.dueDate) return false;
    if (v.deliveryStatus === "delivered") return false;
    return v.dueDate < todayStr();
  }

  function render() {
    const list = document.getElementById("vyapariList");
    if (!list) return;
    const search = state.search.trim().toLowerCase();
    const items = KM.state.vyaparis.filter((v) => {
      if (search) {
        const hay = `${v.trader || ""} ${v.fabric || ""} ${v.design || ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      if (state.filter === "pending" && v.deliveryStatus === "delivered") return false;
      if (state.filter === "overdue" && !isOverdue(v)) return false;
      return true;
    });

    if (!items.length) {
      list.innerHTML = `<div class="empty-state">Koi vyapari record nahi mila. "+ Naya Vyapari" se add karein.</div>`;
      return;
    }

    list.innerHTML = items
      .map((v) => {
        const overdue = isOverdue(v);
        const deliveryBadge = v.deliveryStatus === "delivered"
          ? `<span class="badge badge-delivered">Delivered</span>`
          : `<span class="badge badge-pending">Pending</span>`;
        const overdueBadge = overdue ? `<span class="badge badge-overdue">Overdue</span>` : "";
        return `
        <div class="entity-card" data-id="${v.id}">
          <div>
            <div class="entity-title">${escapeHtml(v.trader || "-")}</div>
            <div class="entity-sub">${escapeHtml(v.fabric || "")}${v.design ? " · " + escapeHtml(v.design) : ""} · Due ${formatDate(v.dueDate)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span>${formatCurrency((v.lotPcs || 0) * (v.ratePerPc || 0))}</span>
            ${deliveryBadge}${overdueBadge}
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

  function openForm(v) {
    const form = document.getElementById("vyapariForm");
    form.reset();
    document.getElementById("vyapariFormId").value = v ? v.id : "";
    document.getElementById("vyapariFormTitle").textContent = v ? "Vyapari Edit Karein" : "Naya Vyapari";
    document.getElementById("vyapariTrader").value = v ? v.trader || "" : "";
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
    document.getElementById("vyapariPaymentReceived").checked = v ? !!v.paymentReceived : false;
    document.getElementById("vyapariPaymentReceivedDate").value = v ? v.paymentReceivedDate || "" : "";
    document.getElementById("vyapariPaymentReceivedNote").value = v ? v.paymentReceivedNote || "" : "";
    document.getElementById("deleteVyapariBtn").classList.toggle("hidden", !v);
    document.getElementById("vyapariPdfBtn").classList.toggle("hidden", !v);
    document.getElementById("vyapariFormModal").classList.remove("hidden");
  }

  function collectForm() {
    return {
      trader: document.getElementById("vyapariTrader").value.trim(),
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
      paymentReceived: document.getElementById("vyapariPaymentReceived").checked,
      paymentReceivedDate: document.getElementById("vyapariPaymentReceivedDate").value,
      paymentReceivedNote: document.getElementById("vyapariPaymentReceivedNote").value.trim(),
    };
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("vyapariFormId").value;
    const data = collectForm();
    if (!data.trader) return;
    try {
      KM.utils.showLoading(true);
      if (id) await KM.db.updateVyapari(id, data);
      else await KM.db.addVyapari(data);
      document.getElementById("vyapariFormModal").classList.add("hidden");
      toast(id ? "Vyapari update ho gaya" : "Vyapari add ho gaya");
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
    } finally {
      KM.utils.showLoading(false);
    }
  }

  async function handleDelete() {
    const id = document.getElementById("vyapariFormId").value;
    if (!id) return;
    if (!confirm("Yeh vyapari record delete karein?")) return;
    try {
      KM.utils.showLoading(true);
      await KM.db.deleteVyapari(id);
      document.getElementById("vyapariFormModal").classList.add("hidden");
      toast("Vyapari delete ho gaya");
    } catch (err) {
      toast(err.message || "Delete nahi ho paya", true);
    } finally {
      KM.utils.showLoading(false);
    }
  }

  function downloadPdf() {
    const id = document.getElementById("vyapariFormId").value;
    const v = KM.state.vyaparis.find((x) => x.id === id) || collectForm();
    KM.pdf.vyapariChallan(KM.state.business, v);
  }

  function init() {
    document.getElementById("addVyapariBtn").addEventListener("click", () => openForm(null));
    document.getElementById("vyapariForm").addEventListener("submit", handleFormSubmit);
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

  KM.vyapari = { init, render, isOverdue };
})();
