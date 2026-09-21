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

  function stopDataListeners() {
    KM.state.unsubscribers.forEach((fn) => fn && fn());
    KM.state.unsubscribers = [];
    KM.karigar.stopAll();
    KM.state.karigars = [];
    KM.state.vyaparis = [];
  }

  function startDataListeners(uid) {
    const unsubKarigars = KM.db.listenKarigars(uid, (rows) => {
      KM.state.karigars = rows;
      KM.karigar.syncSubscriptions(uid);
      KM.karigar.render();
      KM.dashboard.render();
    });
    const unsubVyaparis = KM.db.listenVyaparis(uid, (rows) => {
      KM.state.vyaparis = rows;
      KM.vyapari.render();
      KM.dashboard.render();
    });
    KM.state.unsubscribers.push(unsubKarigars, unsubVyaparis);
  }

  async function onLogin(user) {
    KM.state.user = user;
    const business = await KM.db.getBusiness(user.uid);
    KM.state.business = business;
    document.getElementById("businessNameLabel").textContent = business ? business.businessName : "Karakhana Manager";
    document.getElementById("ownerNameLabel").textContent = business && business.ownerName ? business.ownerName : "";
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    switchView("dashboard");
    startDataListeners(user.uid);
  }

  function onLogout() {
    stopDataListeners();
    KM.state.user = null;
    KM.state.business = null;
    document.getElementById("mainApp").classList.add("hidden");
    document.getElementById("authScreen").classList.remove("hidden");
    document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
    document.getElementById("signInForm").reset();
    document.getElementById("signUpForm").reset();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {
        // PWA install just won't be offline-capable - app still works online.
      });
    }
  }

  function init() {
    KM.theme.init();
    wireNav();
    wireModals();
    KM.auth.init();
    KM.karigar.init();
    KM.vyapari.init();
    KM.backup.init();
    registerServiceWorker();

    KM.fbAuth.onAuthStateChanged((user) => {
      KM.utils.showLoading(false);
      if (user) onLogin(user);
      else onLogout();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
