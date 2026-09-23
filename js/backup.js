(function () {
  const KM = window.KM || (window.KM = {});
  const { toast, formatDate } = KM.utils;

  const setStatus = (text) => { document.getElementById("backupStatus").textContent = text; };

  async function buildFile() {
    const payload = await KM.db.exportAll();
    const slug = (payload.business && payload.business.businessName ? payload.business.businessName : "karakhana")
      .replace(/[^0-9A-Za-z]+/g, "_");
    const name = `${slug}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(payload, null, 2)], name, { type: "application/json" });
    return { file, payload };
  }

  function summary(payload) {
    return `${payload.karigars.length} karigar, ${payload.vyaparis.length} vyapari, ${payload.expenses.length} kharche`;
  }

  async function download() {
    try {
      const { file, payload } = await buildFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      await KM.db.markBackedUp();
      setStatus(`Backup download ho gaya (${summary(payload)}). Ise WhatsApp ya Drive pe bhi rakh lijiye.`);
    } catch (err) {
      toast(err.message || "Backup nahi ban paya", true);
    }
  }

  // The phone's share sheet sends the file straight to WhatsApp, Drive or
  // email, which is where a backup needs to end up anyway. Browsers without
  // file sharing fall back to a download.
  async function share() {
    let built;
    try {
      built = await buildFile();
    } catch (err) {
      toast(err.message || "Backup nahi ban paya", true);
      return;
    }
    const { file, payload } = built;
    if (!(navigator.canShare && navigator.canShare({ files: [file] }))) {
      await download();
      return;
    }
    try {
      await navigator.share({ files: [file], title: "Karakhana backup", text: `Karakhana Manager backup - ${summary(payload)}` });
    } catch (err) {
      if (err.name !== "AbortError") toast("Share nahi ho paya - Download wala button use kariye", true);
      return;
    }
    await KM.db.markBackedUp();
    setStatus(`Backup bhej diya (${summary(payload)}).`);
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let payload;
      try {
        payload = JSON.parse(reader.result);
      } catch (err) {
        toast("Yeh sahi backup file nahi hai", true);
        return;
      }
      const counts = `${(payload.karigars || []).length} karigar, ${(payload.vyaparis || []).length} vyapari, ${(payload.expenses || []).length} kharche`;
      if (!confirm(`${counts} import karein? Abhi ka data nahi mitega, yeh uske saath jud jayega.`)) return;
      try {
        const result = await KM.db.importAll(payload);
        setStatus(`Import ho gaya: ${result.karigarCount} karigar, ${result.vyapariCount} vyapari jude.`);
        toast("Import ho gaya");
      } catch (err) {
        toast(err.message || "Import nahi ho paya", true);
      }
    };
    reader.readAsText(file);
  }

  function update(data) {
    document.getElementById("lastBackupLabel").textContent = data.lastBackupAt
      ? `Aakhri backup: ${formatDate(data.lastBackupAt)}`
      : "Abhi tak koi backup nahi liya.";
  }

  function init() {
    document.getElementById("shareBackupBtn").addEventListener("click", share);
    document.getElementById("exportJsonBtn").addEventListener("click", download);
    document.getElementById("importJsonInput").addEventListener("change", (e) => {
      importJson(e.target.files[0]);
      e.target.value = "";
    });
  }

  KM.backup = { init, share, update };
})();
