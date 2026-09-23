(function () {
  const KM = window.KM || (window.KM = {});
  const { formatDate, vyapariMoney, hazriCount, maalCount, fabricCount } = KM.utils;
  const BLUE = [31, 111, 235];
  const table = (doc, opts) => doc.autoTable({
    theme: "grid", headStyles: { fillColor: BLUE }, styles: { fontSize: 8 },
    footStyles: { fillColor: [230, 236, 245], textColor: 20, fontStyle: "bold" }, ...opts,
  });
  const meters = (n) => `${Math.round((Number(n) || 0) * 100) / 100} m`;
  const monthLabel = (key) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
  };

  // Section heading; starts a new page when too close to the bottom.
  function heading(doc, y, text) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont(undefined, "bold");
    doc.setFontSize(11);
    doc.text(text, 14, y);
    doc.setFont(undefined, "normal");
    return y + 3;
  }

  // jsPDF's built-in fonts have no ₹ glyph (it prints as garbage), so PDFs
  // spell the currency out.
  function formatCurrency(n) {
    return "Rs. " + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function letterhead(doc, business, title) {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BLUE);
    doc.rect(0, 0, pageWidth, 26, "F");
    let textX = 14;
    const logo = KM.state.logo;
    if (logo) {
      try {
        // White tile so dark or transparent logos stay visible on the blue band.
        const props = doc.getImageProperties(logo);
        const box = 20;
        const w = props.width >= props.height ? box : (box * props.width) / props.height;
        const h = props.width >= props.height ? (box * props.height) / props.width : box;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(12, 2, w + 4, h + 4, 2, 2, "F");
        doc.addImage(logo, props.fileType || "PNG", 14, 4, w, h);
        textX = 14 + w + 6;
      } catch (e) {
        // An unreadable logo just leaves the name-only header.
      }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(business && business.businessName ? business.businessName : "Karakhana Manager", textX, 12);
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    if (business && business.ownerName) doc.text(`Owner: ${business.ownerName}`, textX, 18);
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

      if (data.maal && data.maal.length) {
        const vyaparis = KM.state.vyaparis || [];
        const m = maalCount(data.maal);
        y = heading(doc, y, `Maal (diya ${m.diya}, wapas ${m.wapas}, paas mein ${m.paas} pcs)`);
        table(doc, {
          startY: y,
          head: [["Date", "Kya", "Pcs", "Lot", "Note"]],
          body: data.maal.map((x) => {
            const v = x.vyapariId && vyaparis.find((vv) => vv.id === x.vyapariId);
            return [formatDate(x.date), x.type === "wapas" ? "Wapas aaya" : "Diya", x.pcs,
              v ? [v.trader, v.design].filter(Boolean).join(" - ") : "-", x.note || "-"];
          }),
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      if (data.attendance && data.attendance.length) {
        const byMonth = {};
        data.attendance.forEach((a) => { (byMonth[a.date.slice(0, 7)] = byMonth[a.date.slice(0, 7)] || []).push(a); });
        y = heading(doc, y, "Hazri");
        table(doc, {
          startY: y,
          head: [["Mahina", "Present", "Half day", "Absent", "Kul din"]],
          body: Object.keys(byMonth).sort().reverse().map((key) => {
            const c = hazriCount(byMonth[key]);
            return [monthLabel(key), c.present, c.half, c.absent, c.days];
          }),
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
      const money = vyapariMoney(v);
      const progress = KM.db.lotProgress()[v.id];
      const fabric = fabricCount(v.fabricStock);
      const fields = [
        ["Trader", v.trader || "-"],
        ["Phone", v.phone || "-"],
        ["Fabric", v.fabric || "-"],
        ["Design", v.design || "-"],
        ["Color", v.color || "-"],
        ["Sizes", v.sizes || "-"],
        ["Lot", `${v.lotPcs || 0} pcs x ${formatCurrency(v.ratePerPc)}/pc`],
        ["Lot Value", formatCurrency(money.total)],
        ["Received", formatCurrency(money.received)],
        ["Balance", formatCurrency(Math.max(money.balance, 0))],
        ["Taiyaar", progress ? `${progress.wapas}${v.lotPcs ? " / " + v.lotPcs : ""} pcs` : "-"],
        ["Total Meters", v.totalMeters || 0],
        ["Color Meters", v.colorMeters || "-"],
        ["Due Date", formatDate(v.dueDate)],
        ["Delivery Status", v.deliveryStatus === "delivered" ? "Delivered" : "Pending"],
      ];
      if ((v.fabricStock || []).length) {
        fields.push(["Kapda aaya", meters(fabric.aaya)], ["Kapda kata", meters(fabric.kata)], ["Kapda bacha", meters(fabric.bacha)]);
      }
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

      const payments = [...(v.payments || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (payments.length) {
        doc.setFont(undefined, "bold");
        doc.text("Payments received", 14, y);
        doc.setFont(undefined, "normal");
        doc.autoTable({
          startY: y + 3,
          head: [["Date", "Amount", "Note"]],
          body: payments.map((p) => [formatDate(p.date), formatCurrency(p.amount), p.note || "-"]),
          theme: "grid",
          headStyles: { fillColor: [31, 111, 235] },
          styles: { fontSize: 8 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      y += 6;
      const lastPayment = payments.length ? payments[payments.length - 1].date : "";
      let x = 14;
      x += statusStamp(doc, x, y, "LOT RECEIVED", !!v.lotReceived, v.lotReceivedDate) + 10;
      statusStamp(doc, x, y, "PAYMENT", money.total > 0 && money.balance <= 0, lastPayment);

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

    // Everything in one file: the month's cash, then who owes what, then detail.
    fullReport(business, data, month, summary) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const sum = (list, pick) => list.reduce((s, x) => s + (Number(pick(x)) || 0), 0);
      const inMonth = (e) => (e.date || "").slice(0, 7) === month;
      let y = letterhead(doc, business, `Poora Hisaab: ${monthLabel(month)}`);

      const karigarRows = [...data.karigars].sort((a, b) => a.name.localeCompare(b.name)).map((k) => {
        const t = KM.karigar.computeTotals(k);
        return {
          name: k.name, pieces: t.totalPieces + sum(k.sampleWork || [], (s) => s.qty), earned: t.totalEarnings,
          advance: t.totalAdvance, paid: t.totalPayments, balance: t.remaining,
          paas: maalCount(k.maal).paas, hazri: hazriCount((k.attendance || []).filter(inMonth)).days,
        };
      });
      const progress = KM.db.lotProgress();
      const vyapariRows = data.vyaparis.map((v) => ({ v, m: vyapariMoney(v), p: progress[v.id], f: fabricCount(v.fabricStock) }));
      const payable = sum(karigarRows, (r) => Math.max(r.balance, 0));
      const receivable = sum(vyapariRows, (r) => Math.max(r.m.balance, 0));

      y = heading(doc, y, `Mahine ka hisaab (${monthLabel(month)})`);
      table(doc, {
        startY: y,
        body: [
          ["Vyapari se aaya", formatCurrency(summary.income)],
          ["Karigar ko diya (payment + kharchi)", formatCurrency(summary.karigarPaid)],
          ["Kharcha", formatCurrency(summary.expenses)],
          ["Munafa", formatCurrency(summary.profit)],
          ["Pieces bane", summary.pieces],
        ],
        styles: { fontSize: 10 },
        columnStyles: { 0: { cellWidth: 110 }, 1: { fontStyle: "bold" } },
      });
      y = doc.lastAutoTable.finalY + 8;

      y = heading(doc, y, "Lena-dena baaki (ab tak)");
      table(doc, {
        startY: y,
        body: [["Karigar ko dena baaki", formatCurrency(payable)], ["Vyapari se lena baaki", formatCurrency(receivable)]],
        styles: { fontSize: 10 },
        columnStyles: { 0: { cellWidth: 110 }, 1: { fontStyle: "bold" } },
      });
      y = doc.lastAutoTable.finalY + 8;

      if (karigarRows.length) {
        y = heading(doc, y, "Karigar (shuru se ab tak)");
        table(doc, {
          startY: y,
          head: [["Karigar", "Hazri*", "Pcs", "Kamai", "Kharchi", "Diya", "Baaki", "Maal paas"]],
          body: karigarRows.map((r) => [r.name, r.hazri, r.pieces, formatCurrency(r.earned), formatCurrency(r.advance),
            formatCurrency(r.paid), formatCurrency(Math.max(r.balance, 0)), r.paas]),
          foot: [["Total", sum(karigarRows, (r) => r.hazri), sum(karigarRows, (r) => r.pieces),
            formatCurrency(sum(karigarRows, (r) => r.earned)), formatCurrency(sum(karigarRows, (r) => r.advance)),
            formatCurrency(sum(karigarRows, (r) => r.paid)), formatCurrency(payable),
            sum(karigarRows, (r) => Math.max(r.paas, 0))]],
        });
        y = doc.lastAutoTable.finalY + 4;
        doc.setFontSize(7);
        doc.text("* Hazri: is mahine ke din.", 14, y + 2);
        y += 9;
      }

      if (vyapariRows.length) {
        y = heading(doc, y, "Vyapari / Lot");
        table(doc, {
          startY: y,
          head: [["Vyapari", "Design", "Lot", "Value", "Mila", "Baaki", "Taiyaar", "Kapda bacha", "Status"]],
          body: vyapariRows.map(({ v, m, p, f }) => [
            v.trader || "-", v.design || "-", `${v.lotPcs || 0} x ${formatCurrency(v.ratePerPc)}`,
            formatCurrency(m.total), formatCurrency(m.received), formatCurrency(Math.max(m.balance, 0)),
            p ? `${p.wapas}/${v.lotPcs || "-"}` : "-", (v.fabricStock || []).length ? meters(f.bacha) : "-",
            v.deliveryStatus === "delivered" ? "Delivered" : KM.vyapari.isOverdue(v) ? "Late" : "Pending",
          ]),
          foot: [["Total", "", "", formatCurrency(sum(vyapariRows, (r) => r.m.total)),
            formatCurrency(sum(vyapariRows, (r) => r.m.received)), formatCurrency(receivable), "", "", ""]],
          styles: { fontSize: 7 },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      const expenses = data.expenses.filter(inMonth);
      if (expenses.length) {
        const byCat = {};
        expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (Number(e.amount) || 0); });
        y = heading(doc, y, `Kharcha (${monthLabel(month)})`);
        table(doc, {
          startY: y,
          head: [["Kis cheez ka", "Amount"]],
          body: Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, a]) => [c, formatCurrency(a)]),
          foot: [["Total", formatCurrency(summary.expenses)]],
          styles: { fontSize: 9 },
        });
      }

      const slug = (business && business.businessName ? business.businessName : "karakhana").replace(/[^0-9A-Za-z]+/g, "_");
      doc.save(`${slug}_poora_hisaab_${month}.pdf`);
    },

    karigarReport(business, label, rows, totals) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const y = letterhead(doc, business, `Karigar Hisaab: ${label}`);
      doc.autoTable({
        startY: y,
        head: [["Karigar", "Hazri", "Pcs", "Kamai", "Kharchi", "Diya", "Kul Baaki"]],
        body: rows.map((r) => [
          r.name, r.hazri, r.pieces, formatCurrency(r.earned), formatCurrency(r.advance),
          formatCurrency(r.paid), formatCurrency(Math.max(r.balance, 0)),
        ]),
        foot: totals ? [["Total", totals.hazri, totals.pieces, formatCurrency(totals.earned), formatCurrency(totals.advance),
          formatCurrency(totals.paid), formatCurrency(totals.balance)]] : [],
        theme: "grid",
        headStyles: { fillColor: [31, 111, 235] },
        footStyles: { fillColor: [230, 236, 245], textColor: 20, fontStyle: "bold" },
        styles: { fontSize: 9 },
      });
      doc.setFontSize(8);
      doc.text("Hazri (din), Kamai, Kharchi, Diya: chune gaye dino ke. Kul Baaki: shuru se ab tak ka.", 14, doc.lastAutoTable.finalY + 8);
      doc.save(`karigar_hisaab_${label.replace(/[^0-9A-Za-z]+/g, "_")}.pdf`);
    },
  };
})();
