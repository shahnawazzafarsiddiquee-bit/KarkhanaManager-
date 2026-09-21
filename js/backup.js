(function () {
  const KM = window.KM || (window.KM = {});
  const { toast } = KM.utils;

  async function exportJson() {
    try {
      KM.utils.showLoading(true);
      const payload = await KM.db.exportAll(KM.state.user.uid);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const businessSlug = (payload.business && payload.business.businessName ? payload.business.businessName : "karakhana").replace(/\s+/g, "_");
      a.href = url;
      a.download = `${businessSlug}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      document.getElementById("backupStatus").textContent = `Export ho gaya: ${payload.karigars.length} karigars, ${payload.vyaparis.length} vyaparis.`;
    } catch (err) {
      toast(err.message || "Export fail ho gaya", true);
    } finally {
      KM.utils.showLoading(false);
    }
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!confirm(`${(payload.karigars || []).length} karigars aur ${(payload.vyaparis || []).length} vyaparis import karein? (existing data delete nahi hoga, naya add ho jaayega)`)) return;
        KM.utils.showLoading(true);
        const result = await KM.db.importAll(KM.state.user.uid, payload);
        document.getElementById("backupStatus").textContent = `Import ho gaya: ${result.karigarCount} karigars, ${result.vyapariCount} vyaparis add hue.`;
        toast("Import successful");
      } catch (err) {
        toast("Import fail ho gaya - file sahi JSON backup honi chahiye", true);
      } finally {
        KM.utils.showLoading(false);
      }
    };
    reader.readAsText(file);
  }

  function init() {
    document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
    document.getElementById("importJsonInput").addEventListener("change", (e) => {
      importJson(e.target.files[0]);
      e.target.value = "";
    });
  }

  KM.backup = { init };
})();
