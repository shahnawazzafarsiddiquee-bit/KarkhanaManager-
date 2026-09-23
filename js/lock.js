/**
 * 4-digit PIN screen lock. Only a salted hash of the PIN is kept, in its own
 * localStorage key, so it stays on this phone and never travels in a backup.
 * It keeps casual eyes out of the ledger; it does not encrypt the data.
 */
(function () {
  const KM = window.KM || (window.KM = {});
  const { toast } = KM.utils;

  const KEY = "km-pin";
  const AUTO_LOCK_MS = 2 * 60 * 1000;
  const MAX_TRIES = 5;
  const WAIT_MS = 30 * 1000;

  let onUnlock = null;
  let unlocked = false;
  let hiddenAt = 0;
  let wrongTries = 0;
  let blockedUntil = 0;

  const el = (id) => document.getElementById(id);

  function stored() {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      return null;
    }
  }

  const isSet = () => !!stored();

  async function hash(pin, salt) {
    const text = `${salt}:${pin}`;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 5381; // non-secure-context fallback
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }

  async function setPin(pin) {
    const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(KEY, JSON.stringify({ salt, hash: await hash(pin, salt) }));
  }

  async function check(pin) {
    const p = stored();
    return !!p && (await hash(pin, p.salt)) === p.hash;
  }

  function clearPin() {
    localStorage.removeItem(KEY);
  }

  function showScreen() {
    el("lockForm").classList.remove("hidden");
    el("forgotPinForm").classList.add("hidden");
    el("lockPin").value = "";
    el("lockError").textContent = "";
    el("lockScreen").classList.remove("hidden");
    setTimeout(() => el("lockPin").focus(), 50);
  }

  function finishUnlock() {
    unlocked = true;
    wrongTries = 0;
    el("lockScreen").classList.add("hidden");
    const cb = onUnlock;
    onUnlock = null;
    if (cb) cb();
  }

  function lockNow() {
    if (!isSet()) return;
    unlocked = false;
    showScreen();
  }

  // Runs cb straight away when no PIN is set, otherwise after a correct PIN.
  function require(cb) {
    if (!isSet()) {
      unlocked = true;
      cb();
      return;
    }
    onUnlock = cb;
    lockNow();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const now = Date.now();
    if (now < blockedUntil) {
      el("lockError").textContent = `${Math.ceil((blockedUntil - now) / 1000)} second ruk ke try kariye`;
      return;
    }
    const pin = el("lockPin").value;
    if (await check(pin)) {
      finishUnlock();
      return;
    }
    wrongTries++;
    el("lockPin").value = "";
    if (wrongTries >= MAX_TRIES) {
      wrongTries = 0;
      blockedUntil = Date.now() + WAIT_MS;
      el("lockError").textContent = "Bahut baar galat PIN. 30 second ruk ke try kariye.";
    } else {
      el("lockError").textContent = "Galat PIN";
    }
  }

  // Recovery: the business and owner names as saved in the app remove the PIN.
  function handleForgot(e) {
    e.preventDefault();
    const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const b = KM.state.business || {};
    if (norm(el("forgotBusiness").value) === norm(b.businessName) && norm(el("forgotOwner").value) === norm(b.ownerName)) {
      clearPin();
      el("forgotPinForm").reset();
      finishUnlock();
      toast("PIN hat gaya. Naya PIN Setting se lagaiye.");
      document.dispatchEvent(new Event("km-pin-changed"));
    } else {
      toast("Naam match nahi hua", true);
    }
  }

  function init() {
    el("lockForm").addEventListener("submit", handleSubmit);
    el("lockPin").addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
      if (e.target.value.length === 4) el("lockForm").requestSubmit();
    });
    el("forgotPinBtn").addEventListener("click", () => {
      el("lockForm").classList.add("hidden");
      el("forgotPinForm").classList.remove("hidden");
    });
    el("forgotBackBtn").addEventListener("click", showScreen);
    el("forgotPinForm").addEventListener("submit", handleForgot);

    // Lock again when the app comes back after a while in the background.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (unlocked && isSet() && hiddenAt && Date.now() - hiddenAt >= AUTO_LOCK_MS) {
        lockNow();
      }
    });
  }

  KM.lock = { init, require, isSet, setPin, check, clearPin, lockNow };
})();
