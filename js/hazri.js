(function () {
  const KM = window.KM || (window.KM = {});
  const { escapeHtml, dateStr, todayStr, toast, hazriCount } = KM.utils;

  const LABELS = { P: "Present", H: "Half day", A: "Absent" };
  let data = null;

  const el = (id) => document.getElementById(id);
  const isOpen = () => !el("hazriModal").classList.contains("hidden");
  const byName = (a, b) => a.name.localeCompare(b.name);

  function shiftDay(days) {
    const d = new Date(el("hazriDate").value || todayStr());
    d.setDate(d.getDate() + days);
    el("hazriDate").value = dateStr(d);
    render();
  }

  function renderDay() {
    const date = el("hazriDate").value;
    const karigars = [...data.karigars].sort(byName);
    if (!karigars.length) {
      el("hazriList").innerHTML = `<div class="empty-state">Pehle Karigar add kariye.</div>`;
      el("hazriDayCount").textContent = "";
      return;
    }
    let marked = 0;
    el("hazriList").innerHTML = karigars.map((k) => {
      const mark = k.attendance.find((a) => a.date === date);
      if (mark) marked++;
      const buttons = Object.keys(LABELS).map((s) =>
        `<button type="button" class="hazri-btn hazri-${s}${mark && mark.status === s ? " active" : ""}"
          data-karigar="${k.id}" data-status="${s}">${LABELS[s]}</button>`).join("");
      return `<div class="hazri-row"><span class="hazri-name">${escapeHtml(k.name)}</span><div class="hazri-btns">${buttons}</div></div>`;
    }).join("");
    el("hazriDayCount").textContent = `${marked} / ${karigars.length} ki hazri lagi`;
  }

  function renderMonth() {
    const month = el("hazriMonth").value;
    const rows = [...data.karigars].sort(byName).map((k) => ({
      name: k.name, ...hazriCount(k.attendance.filter((a) => a.date.slice(0, 7) === month)),
    }));
    el("hazriMonthTable").querySelector("tbody").innerHTML = rows.length
      ? rows.map((r) => `<tr><td>${escapeHtml(r.name)}</td><td>${r.present}</td><td>${r.half}</td>
          <td>${r.absent}</td><td><b>${r.days}</b></td></tr>`).join("")
      : `<tr><td colspan="5" class="muted">Koi karigar nahi</td></tr>`;
  }

  function render() {
    if (!data || !isOpen()) return;
    renderDay();
    renderMonth();
  }

  function update(newData) {
    data = newData;
    render();
  }

  // Tapping the mark that is already on clears it, so a mistake is one tap to undo.
  async function handleMark(e) {
    const btn = e.target.closest(".hazri-btn");
    if (!btn) return;
    const status = btn.classList.contains("active") ? "" : btn.dataset.status;
    try {
      await KM.db.setAttendance(btn.dataset.karigar, el("hazriDate").value, status);
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
    }
  }

  async function markAllPresent() {
    if (!data.karigars.length) return;
    const date = el("hazriDate").value;
    if (data.karigars.some((k) => k.attendance.some((a) => a.date === date))
      && !confirm("Is din ki lagi hui hazri bhi Present ho jayegi. Theek hai?")) return;
    try {
      await KM.db.setAttendanceAll(date, "P");
      toast("Sabki hazri lag gayi");
    } catch (err) {
      toast(err.message || "Save nahi ho paya", true);
    }
  }

  function open() {
    el("hazriDate").value = todayStr();
    el("hazriMonth").value = todayStr().slice(0, 7);
    el("hazriModal").classList.remove("hidden");
    render();
  }

  function init() {
    el("openHazriBtn").addEventListener("click", open);
    el("hazriPrev").addEventListener("click", () => shiftDay(-1));
    el("hazriNext").addEventListener("click", () => shiftDay(1));
    el("hazriDate").addEventListener("change", () => {
      if (el("hazriDate").value) el("hazriMonth").value = el("hazriDate").value.slice(0, 7);
      render();
    });
    el("hazriMonth").addEventListener("change", render);
    el("hazriList").addEventListener("click", handleMark);
    el("hazriAllPresent").addEventListener("click", markAllPresent);
  }

  KM.hazri = { init, update };
})();
