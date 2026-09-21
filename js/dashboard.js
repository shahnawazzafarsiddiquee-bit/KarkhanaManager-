(function () {
  const KM = window.KM || (window.KM = {});
  const { formatCurrency } = KM.utils;

  function render() {
    const karigars = KM.state.karigars || [];
    const vyaparis = KM.state.vyaparis || [];

    document.getElementById("statKarigarCount").textContent = karigars.length;

    let thisMonthPieces = 0;
    let payable = 0;
    karigars.forEach((k) => {
      const t = KM.karigar.getTotals(k.id);
      if (!t) return;
      thisMonthPieces += t.thisMonthPieces || 0;
      if (t.remaining > 0) payable += t.remaining;
    });
    document.getElementById("statTotalPieces").textContent = thisMonthPieces;
    document.getElementById("statKarigarPayable").textContent = formatCurrency(payable);

    document.getElementById("statVyapariCount").textContent = vyaparis.length;
    const pending = vyaparis.filter((v) => v.deliveryStatus !== "delivered").length;
    const overdue = vyaparis.filter((v) => KM.vyapari.isOverdue(v)).length;
    document.getElementById("statVyapariPending").textContent = pending;
    document.getElementById("statVyapariOverdue").textContent = overdue;
  }

  KM.dashboard = { render };
})();
