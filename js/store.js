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

  const newId = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const now = () => new Date().toISOString();
  const copy = (x) => JSON.parse(JSON.stringify(x));
  const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "");

  const KEY = "km-data-v1";
  const SUBS = ["workLogs", "sampleWork", "payments"];
  const emptyData = () => ({ business: null, karigars: [], vyaparis: [], expenses: [], lastBackupAt: null });

  // Vyapari money used to be a single "payment received" tick. It is now a
  // list of payments; a record ticked as paid becomes one payment of the
  // full lot value so its balance still reads zero.
  function migrateVyapari(v) {
    if (!Array.isArray(v.payments)) {
      v.payments = [];
      const total = (Number(v.lotPcs) || 0) * (Number(v.ratePerPc) || 0);
      if (v.paymentReceived && total > 0) {
        v.payments.push({
          id: newId(),
          date: v.paymentReceivedDate || (v.createdAt || now()).slice(0, 10),
          amount: total,
          note: v.paymentReceivedNote || "",
          createdAt: now(),
        });
      }
    }
    delete v.paymentReceived;
    delete v.paymentReceivedDate;
    delete v.paymentReceivedNote;
    return v;
  }

  function normalize(d) {
    const out = { ...emptyData(), ...d };
    out.karigars = out.karigars || [];
    out.expenses = out.expenses || [];
    out.vyaparis = (out.vyaparis || []).map(migrateVyapari);
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : emptyData();
    } catch (e) {
      // The next save would overwrite whatever could not be read, so park a
      // copy of it first rather than lose the ledger silently.
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) localStorage.setItem(`${KEY}-unreadable-${Date.now()}`, raw);
      } catch (_) {}
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
  const makeExpense = (d) => ({
    id: newId(), date: d.date, category: d.category || "Other", amount: Number(d.amount) || 0,
    note: d.note || "", createdAt: now(),
  });
  const findVyapari = (id) => data.vyaparis.find((v) => v.id === id);

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
      const v = { ...d, id: newId(), createdAt: now(), payments: [] };
      data.vyaparis.push(v);
      commit();
      return v.id;
    },

    // Payments are managed separately, so an edit never touches them.
    async updateVyapari(id, d) {
      const v = findVyapari(id);
      if (!v) return;
      const { payments, id: _id, createdAt, ...fields } = d;
      Object.assign(v, fields);
      commit();
    },

    async deleteVyapari(id) {
      data.vyaparis = data.vyaparis.filter((v) => v.id !== id);
      commit();
    },

    async addVyapariPayment(vyapariId, d) {
      const v = findVyapari(vyapariId);
      if (!v) throw new Error("Vyapari nahi mila.");
      v.payments.push(makePayment(d));
      commit();
    },

    async deleteVyapariPayment(vyapariId, entryId) {
      const v = findVyapari(vyapariId);
      if (!v) return;
      v.payments = v.payments.filter((p) => p.id !== entryId);
      commit();
    },

    // ---- expenses ----
    async addExpense(d) {
      data.expenses.push(makeExpense(d));
      commit();
    },

    async deleteExpense(id) {
      data.expenses = data.expenses.filter((e) => e.id !== id);
      commit();
    },

    // Whole-ledger view for reports that span karigars, vyaparis and expenses.
    listenAll(callback) {
      return listen(() => copy(data), callback);
    },

    // ---- backup ----
    async exportAll() {
      return { ...copy(data), exportedAt: now() };
    },

    async markBackedUp() {
      data.lastBackupAt = now();
      commit();
    },

    // Adds imported records alongside existing ones; nothing is overwritten.
    async importAll(payload) {
      payload = normalize(payload);
      let karigarCount = 0;
      let vyapariCount = 0;
      for (const src of payload.karigars) {
        const k = makeKarigar(src);
        k.workLogs = (src.workLogs || []).map(makeWorkLog);
        k.sampleWork = (src.sampleWork || []).map(makeSample);
        k.payments = (src.payments || []).map(makePayment);
        data.karigars.push(k);
        karigarCount++;
      }
      for (const src of payload.vyaparis) {
        const { id, createdAt, payments, ...rest } = src;
        data.vyaparis.push({ ...rest, id: newId(), createdAt: createdAt || now(), payments: payments.map(makePayment) });
        vyapariCount++;
      }
      data.expenses.push(...payload.expenses.map(makeExpense));
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
