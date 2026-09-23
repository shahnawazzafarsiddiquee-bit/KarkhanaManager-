(function () {
  const KM = window.KM || (window.KM = {});
  const { toast } = KM.utils;

  const LOGO_BOX = 300; // px; plenty for a 20 mm logo in a PDF
  const el = (id) => document.getElementById(id);
  let pinMode = "set"; // set | change | remove

  // ---- logo ----
  function readImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Yeh photo khul nahi payi")); };
      img.src = url;
    });
  }

  // Shrink to fit LOGO_BOX so the logo stays small in phone storage and backups.
  async function toLogoDataUrl(file) {
    const img = await readImage(file);
    const scale = Math.min(1, LOGO_BOX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL("image/png");
    if (png.length < 300000) return png;
    // A photo-like logo compresses far better as JPEG (on white, no transparency).
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  }

  async function handleLogoFile(file) {
    if (!file) return;
    try {
      await KM.db.saveLogo(await toLogoDataUrl(file));
      toast("Logo lag gaya");
    } catch (err) {
      toast(err.message || "Logo save nahi ho paya", true);
    }
  }

  async function removeLogo() {
    if (!confirm("Logo hata dein?")) return;
    await KM.db.saveLogo(null);
    toast("Logo hat gaya");
  }

  function update(data) {
    KM.state.logo = data.logo || null;
    const preview = el("logoPreview");
    preview.classList.toggle("hidden", !data.logo);
    if (data.logo && preview.src !== data.logo) preview.src = data.logo;
    el("logoEmpty").classList.toggle("hidden", !!data.logo);
    el("logoRemoveBtn").classList.toggle("hidden", !data.logo);

    const icon = el("brandIcon");
    if (data.logo) {
      let img = icon.querySelector("img");
      if (!img) {
        icon.textContent = "";
        img = document.createElement("img");
        img.alt = "";
        icon.appendChild(img);
      }
      if (img.src !== data.logo) img.src = data.logo;
    } else if (icon.querySelector("img")) {
      icon.textContent = "🧵";
    }
  }

  // ---- PIN ----
  function renderPin() {
    const set = KM.lock.isSet();
    el("pinStatus").textContent = set
      ? "PIN laga hua hai. App kholne pe aur 2 minute se zyada band rehne ke baad PIN maangega."
      : "PIN nahi laga. Koi bhi phone utha ke hisaab dekh sakta hai.";
    el("pinSetBtn").textContent = set ? "PIN badlo" : "PIN lagao";
    el("pinRemoveBtn").classList.toggle("hidden", !set);
  }

  function openPinModal(mode) {
    pinMode = mode;
    el("pinForm").reset();
    el("pinModalTitle").textContent = { set: "PIN lagao", change: "PIN badlo", remove: "PIN hatao" }[mode];
    el("pinCurrentWrap").classList.toggle("hidden", mode === "set");
    el("pinCurrent").required = mode !== "set";
    ["pinNewWrap", "pinConfirmWrap"].forEach((id) => el(id).classList.toggle("hidden", mode === "remove"));
    el("pinNew").required = el("pinConfirm").required = mode !== "remove";
    el("pinModal").classList.remove("hidden");
    setTimeout(() => el(mode === "set" ? "pinNew" : "pinCurrent").focus(), 50);
  }

  async function handlePinSubmit(e) {
    e.preventDefault();
    if (pinMode !== "set" && !(await KM.lock.check(el("pinCurrent").value))) {
      toast("Purana PIN galat hai", true);
      return;
    }
    try {
      if (pinMode === "remove") {
        KM.lock.clearPin();
        toast("PIN hat gaya");
      } else {
        const pin = el("pinNew").value;
        if (!/^[0-9]{4}$/.test(pin)) { toast("PIN 4 ank ka hona chahiye", true); return; }
        if (pin !== el("pinConfirm").value) { toast("Dono PIN alag hain", true); return; }
        await KM.lock.setPin(pin);
        toast("PIN lag gaya - yaad rakhiyega");
      }
    } catch (err) {
      toast("PIN save nahi ho paya", true);
      return;
    }
    el("pinModal").classList.add("hidden");
    renderPin();
  }

  function init() {
    el("logoInput").addEventListener("change", (e) => {
      handleLogoFile(e.target.files[0]);
      e.target.value = "";
    });
    el("logoRemoveBtn").addEventListener("click", removeLogo);
    el("pinSetBtn").addEventListener("click", () => openPinModal(KM.lock.isSet() ? "change" : "set"));
    el("pinRemoveBtn").addEventListener("click", () => openPinModal("remove"));
    el("pinForm").addEventListener("submit", handlePinSubmit);
    ["pinCurrent", "pinNew", "pinConfirm"].forEach((id) => el(id).addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    }));
    el("settingFullReportBtn").addEventListener("click", () => KM.dashboard.fullReport());
    document.addEventListener("km-pin-changed", renderPin);
    renderPin();
  }

  KM.settings = { init, update };
})();
