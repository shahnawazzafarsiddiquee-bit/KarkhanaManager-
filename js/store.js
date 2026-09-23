/**
 * On-device data store. Everything lives in this browser's localStorage under
 * one key, so there is no account or login - and no copy anywhere else. The
 * Backup tab's JSON export is the only way to move or recover the data.
 *
 * The API mirrors the old Firestore layer: async writes, and listen*()
 * functions that call back immediately and again after every change.
 */
(function () {
  const KM = window.KM || (window.KM = {});

  KM.state = {
    business: null, // { businessName, ownerName }
    karigars: [],
    vyaparis: [],
    currentKarigarId: null,
    unsubscribers: [],
  };

  const KEY = "km-data-v1";
  const SUBS = ["workLogs", "sampleWork", "payments"];
  const emptyData = () => ({ business: null, karigars: [], vyaparis: [] });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : emptyData();
    } catch (e) {
      return emptyData();
    }
  }

  let data = load();
  const listeners = new Set();

  function commit() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      // Reload so memory never drifts from what is actually saved.
      data = load();
      throw new Error("Phone mein data save nahi ho paya - storage bhar gayi ho sakti hai.");
    }
    [...listeners].forEach((fn) => fn());
  }

  function listen(compute, callback) {
    const run = () => callback(compute());
    listeners.add(run);
    queueMicrotask(run);
    return () => listeners.delete(run);
  }

  const newId = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const now = () => new Date().toISOString();
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "");
  const findKarigar = (id) => data.karigars.find((k) => k.id === id);

  function karigarSummary(k) {
    return { id: k.id, name: k.name, phone: k.phone, defaultRate: k.defaultRate, createdAt: k.createdAt };
  }

  function makeKarigar(d) {
    return {
      id: newId(),
      name: d.name,
      phone: d.phone || "",
      defaultRate: Number(d.defaultRate) || 0,
      createdAt: now(),
      workLogs: [],
      sampleWork: [],
      payments: [],
    };
  }

  const makeWorkLog = (d) => ({
    id: newId(), date: d.date, pieces: Number(d.pieces) || 0, rate: Number(d.rate) || 0,
    advance: Number(d.advance) || 0, note: d.note || "", createdAt: now(),
  });
  const makeSample = (d) => ({
    id: newId(), date: d.date, qty: Number(d.qty) || 0, rate: Number(d.rate) || 0,
    note: d.note || "", createdAt: now(),
  });
  const makePayment = (d) => ({
    id: newId(), date: d.date, amount: Number(d.amount) || 0, note: d.note || "", createdAt: now(),
  });

  function addToKarigar(karigarId, sub, entry) {
    const k = findKarigar(karigarId);
    if (!k) throw new Error("Karigar nahi mila.");
    k[sub].push(entry);
    commit();
  }

  KM.db = {
    // ---- business profile ----
    async getBusiness() {
      return data.business ? copy(data.business) : null;
    },

    async saveBusiness({ businessName, ownerName }) {
      data.business = { businessName, ownerName };
      commit();
    },

    // ---- karigars ----
    listenKarigars(callback) {
      return listen(
        () => data.karigars.map(karigarSummary).sort((a, b) => a.name.localeCompare(b.name)),
        callback
      );
    },

    async addKarigar(d) {
      const k = makeKarigar(d);
      data.karigars.push(k);
      commit();
      return k.id;
    },

    async updateKarigar(id, d) {
      const k = findKarigar(id);
      if (!k) return;
      k.name = d.name;
      k.phone = d.phone || "";
      k.defaultRate = Number(d.defaultRate) || 0;
      commit();
    },

    async deleteKarigar(id) {
      data.karigars = data.karigars.filter((k) => k.id !== id);
      commit();
    },

    async addWorkLog(karigarId, d) { addToKarigar(karigarId, "workLogs", makeWorkLog(d)); },
    async addSampleWork(karigarId, d) { addToKarigar(karigarId, "sampleWork", makeSample(d)); },
    async addPayment(karigarId, d) { addToKarigar(karigarId, "payments", makePayment(d)); },

    async deleteSubEntry(karigarId, sub, entryId) {
      const k = findKarigar(karigarId);
      if (!k || !SUBS.includes(sub)) return;
      k[sub] = k[sub].filter((e) => e.id !== entryId);
      commit();
    },

    listenKarigarSub(karigarId, sub, callback) {
      return listen(() => {
        const k = findKarigar(karigarId);
        return k ? copy(k[sub]).sort(byDateDesc) : [];
      }, callback);
    },

    // ---- vyaparis ----
    listenVyaparis(callback) {
      return listen(
        () => copy(data.vyaparis).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
        callback
      );
    },

    async addVyapari(d) {
      const v = { ...d, id: newId(), createdAt: now() };
      data.vyaparis.push(v);
      commit();
      return v.id;
    },

    async updateVyapari(id, d) {
      const v = data.vyaparis.find((x) => x.id === id);
      if (!v) return;
      Object.assign(v, d);
      commit();
    },

    async deleteVyapari(id) {
      data.vyaparis = data.vyaparis.filter((v) => v.id !== id);
      commit();
    },

    // ---- backup ----
    async exportAll() {
      return { ...copy(data), exportedAt: now() };
    },

    // Adds imported records alongside existing ones; nothing is overwritten.
    async importAll(payload) {
      let karigarCount = 0;
      let vyapariCount = 0;
      for (const src of payload.karigars || []) {
        const k = makeKarigar(src);
        k.workLogs = (src.workLogs || []).map(makeWorkLog);
        k.sampleWork = (src.sampleWork || []).map(makeSample);
        k.payments = (src.payments || []).map(makePayment);
        data.karigars.push(k);
        karigarCount++;
      }
      for (const src of payload.vyaparis || []) {
        const { id, createdAt, ...rest } = src;
        data.vyaparis.push({ ...rest, id: newId(), createdAt: createdAt || now() });
        vyapariCount++;
      }
      if (!data.business && payload.business && payload.business.businessName) {
        data.business = {
          businessName: payload.business.businessName,
          ownerName: payload.business.ownerName || "",
        };
      }
      commit();
      return { karigarCount, vyapariCount };
    },
  };
})();
