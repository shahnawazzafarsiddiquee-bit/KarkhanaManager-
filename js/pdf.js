(function () {
  const KM = window.KM || (window.KM = {});
  const { formatCurrency, formatDate } = KM.utils;

  function letterhead(doc, business, title) {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(31, 111, 235);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(business && business.businessName ? business.businessName : "Karakhana Manager", 14, 12);
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    if (business && business.ownerName) doc.text(`Owner: ${business.ownerName}`, 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageWidth - 14, 12, { align: "right" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(title, 14, 36);
    doc.setFont(undefined, "normal");
    return 42; // y cursor after header
  }

  function statusStamp(doc, x, y, label, isPositive, dateStr) {
    const text = isPositive ? `${label}: DONE` : `${label}: PENDING`;
    doc.setDrawColor(isPositive ? 31 : 214, isPositive ? 157 : 69, isPositive ? 85 : 69);
    doc.setTextColor(isPositive ? 31 : 214, isPositive ? 157 : 69, isPositive ? 69 : 69);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    const width = doc.getTextWidth(text) + 8;
    doc.roundedRect(x, y - 5, width, 8, 2, 2);
    doc.text(text, x + 4, y);
    if (isPositive && dateStr) {
      doc.setFontSize(7);
      doc.setFont(undefined, "normal");
      doc.text(formatDate(dateStr), x, y + 6);
    }
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    return width;
  }

  KM.pdf = {
    karigarStatement(business, karigar, data, totals) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = letterhead(doc, business, "Karigar Statement");

      doc.setFontSize(11);
      doc.text(`Karigar: ${karigar.name}`, 14, y);
      if (karigar.phone) doc.text(`Phone: ${karigar.phone}`, 140, y);
      y += 8;

      if (data.workLogs && data.workLogs.length) {
        doc.setFont(undefined, "bold");
        doc.text("Daily Work", 14, y);
        doc.setFont(undefined, "normal");
        doc.autoTable({
          startY: y + 3,
          head: [["Date", "Pieces", "Rate", "Amount", "Advance", "Note"]],
          body: data.workLogs.map((w) => [
            formatDate(w.date),
            w.pieces,
            formatCurrency(w.rate),
            formatCurrency(w.pieces * w.rate),
            formatCurrency(w.advance),
            w.note || "-",
          ]),
          theme: "grid",
          headStyles: { fillColor: [31, 111, 235] },
          styles: { fontSize: 8 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (data.sampleWork && data.sampleWork.length) {
        doc.setFont(undefined, "bold");
        doc.text("Sample Work", 14, y);
        doc.setFont(undefined, "normal");
        doc.autoTable({
          startY: y + 3,
          head: [["Date", "Qty", "Rate", "Amount", "Note"]],
          body: data.sampleWork.map((s) => [
            formatDate(s.date),
            s.qty,
            formatCurrency(s.rate),
            formatCurrency(s.qty * s.rate),
            s.note || "-",
          ]),
          theme: "grid",
          headStyles: { fillColor: [31, 111, 235] },
          styles: { fontSize: 8 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (data.payments && data.payments.length) {
        doc.setFont(undefined, "bold");
        doc.text("Payments", 14, y);
        doc.setFont(undefined, "normal");
        doc.autoTable({
          startY: y + 3,
          head: [["Date", "Amount", "Note"]],
          body: data.payments.map((p) => [formatDate(p.date), formatCurrency(p.amount), p.note || "-"]),
          theme: "grid",
          headStyles: { fillColor: [31, 111, 235] },
          styles: { fontSize: 8 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(200);
      doc.line(14, y, 196, y);
      y += 8;
      doc.setFont(undefined, "bold");
      doc.setFontSize(11);
      doc.text("Summary", 14, y);
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      y += 7;
      const rows = [
        ["Work Earnings", formatCurrency(totals.workEarnings)],
        ["Sample Earnings", formatCurrency(totals.sampleEarnings)],
        ["Total Earnings", formatCurrency(totals.totalEarnings)],
        ["Total Advance", formatCurrency(totals.totalAdvance)],
        ["Total Payments", formatCurrency(totals.totalPayments)],
        ["Remaining", formatCurrency(totals.remaining)],
      ];
      rows.forEach(([label, val]) => {
        doc.text(label, 14, y);
        doc.text(val, 80, y);
        y += 6;
      });

      doc.setFont(undefined, "bold");
      doc.setTextColor(totals.remaining <= 0 ? 31 : 214, totals.remaining <= 0 ? 157 : 69, totals.remaining <= 0 ? 85 : 69);
      doc.text(`Status: ${totals.remaining <= 0 ? "PAID" : "UNPAID"}`, 14, y + 4);
      doc.setTextColor(0, 0, 0);

      doc.save(`${karigar.name.replace(/\s+/g, "_")}_statement.pdf`);
    },

    vyapariChallan(business, v) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = letterhead(doc, business, "Vyapari Challan");

      doc.setFontSize(10);
      const fields = [
        ["Trader", v.trader || "-"],
        ["Fabric", v.fabric || "-"],
        ["Design", v.design || "-"],
        ["Color", v.color || "-"],
        ["Sizes", v.sizes || "-"],
        ["Lot Pieces", v.lotPcs || 0],
        ["Rate / Piece", formatCurrency(v.ratePerPc)],
        ["Total Meters", v.totalMeters || 0],
        ["Color-wise Meters", v.colorMeters || "-"],
        ["Due Date", formatDate(v.dueDate)],
        ["Delivery Status", v.deliveryStatus === "delivered" ? "Delivered" : "Pending"],
      ];
      let col = 0;
      let startY = y;
      fields.forEach(([label, val], i) => {
        const x = col === 0 ? 14 : 108;
        doc.setFont(undefined, "bold");
        doc.text(`${label}:`, x, startY);
        doc.setFont(undefined, "normal");
        doc.text(String(val), x + 32, startY);
        if (col === 1) startY += 7;
        col = col === 0 ? 1 : 0;
      });
      y = startY + (col === 1 ? 0 : 7) + 6;

      if (v.notes) {
        doc.setFont(undefined, "bold");
        doc.text("Notes:", 14, y);
        doc.setFont(undefined, "normal");
        const split = doc.splitTextToSize(v.notes, 180);
        doc.text(split, 14, y + 6);
        y += 6 + split.length * 5 + 4;
      }

      y += 6;
      let x = 14;
      x += statusStamp(doc, x, y, "LOT RECEIVED", !!v.lotReceived, v.lotReceivedDate) + 10;
      statusStamp(doc, x, y, "PAYMENT RECEIVED", !!v.paymentReceived, v.paymentReceivedDate);

      y += 40;
      if (y > 250) {
        doc.addPage();
        y = 30;
      }
      doc.setDrawColor(0);
      doc.line(20, y, 90, y);
      doc.line(120, y, 190, y);
      doc.setFontSize(9);
      doc.text("Vyapari Signature", 20, y + 6);
      doc.text("Factory Signature", 120, y + 6);

      doc.save(`${(v.trader || "vyapari").replace(/\s+/g, "_")}_challan.pdf`);
    },
  };
})();
