(function () {
  const KM = window.KM || (window.KM = {});

  function switchView(view) {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === view + "View"));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("hidden", v.id !== view + "View"));
  }

  function wireNav() {
    document.getElementById("mainNav").addEventListener("click", (e) => {
      const btn = e.target.closest(".nav-btn");
      if (!btn) return;
      switchView(btn.dataset.view);
    });
  }

  function wireModals() {
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.close).classList.add("hidden");
      });
    });
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
      }
    });
  }

  function startDataListeners() {
    if (KM.state.unsubscribers.length) return;
    const unsubKarigars = KM.db.listenKarigars((rows) => {
      KM.state.karigars = rows;
      KM.karigar.syncSubscriptions();
      KM.karigar.render();
      KM.dashboard.render();
    });
    const unsubVyaparis = KM.db.listenVyaparis((rows) => {
      KM.state.vyaparis = rows;
      KM.vyapari.render();
      KM.dashboard.render();
    });
    KM.state.unsubscribers.push(unsubKarigars, unsubVyaparis);
  }

  function showApp() {
    const b = KM.state.business;
    document.getElementById("businessNameLabel").textContent = b.businessName;
    document.getElementById("ownerNameLabel").textContent = b.ownerName || "";
    document.getElementById("mainApp").classList.remove("hidden");
    startDataListeners();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // PWA install just won't be offline-capable - app still works online.
      });
    }
  }

  async function init() {
    KM.theme.init();
    wireNav();
    wireModals();
    KM.profile.init(showApp);
    KM.karigar.init();
    KM.vyapari.init();
    KM.backup.init();
    registerServiceWorker();

    KM.state.business = await KM.db.getBusiness();
    if (KM.state.business) showApp();
    else KM.profile.open(false);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
