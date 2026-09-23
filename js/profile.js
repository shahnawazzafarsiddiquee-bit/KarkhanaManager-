(function () {
  const KM = window.KM || (window.KM = {});
  const { toast } = KM.utils;

  let onSaved = () => {};

  // First launch shows the form alone; editing later adds a Cancel way back.
  function open(isEdit) {
    const b = KM.state.business;
    document.getElementById("setupBusinessName").value = b ? b.businessName : "";
    document.getElementById("setupOwnerName").value = b ? b.ownerName : "";
    document.getElementById("setupSubmitBtn").textContent = isEdit ? "Save" : "Shuru Karein";
    document.getElementById("setupCancelBtn").classList.toggle("hidden", !isEdit);
    document.getElementById("mainApp").classList.add("hidden");
    document.getElementById("setupScreen").classList.remove("hidden");
  }

  function close() {
    document.getElementById("setupScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const businessName = document.getElementById("setupBusinessName").value.trim();
    const ownerName = document.getElementById("setupOwnerName").value.trim();
    if (!businessName || !ownerName) return;
    try {
      await KM.db.saveBusiness({ businessName, ownerName });
    } catch (err) {
      toast(err.message, true);
      return;
    }
    KM.state.business = { businessName, ownerName };
    close();
    onSaved();
  }

  function init(savedCallback) {
    onSaved = savedCallback;
    document.getElementById("setupForm").addEventListener("submit", handleSubmit);
    document.getElementById("setupCancelBtn").addEventListener("click", close);
    document.getElementById("editProfileBtn").addEventListener("click", () => open(true));
  }

  KM.profile = { init, open };
})();
