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
  const SUBS = ["workLogs", "sampleWork", "payments", "maal", "attendance"];
  const HAZRI = ["P", "H", "A"]; // present, half day, absent
  const emptyData = () => ({
    business: null, logo: null, karigars: [], vyaparis: [], expenses: [], lastBackupAt: null,
  });

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
    out.karigars = (out.karigars || []).map((k) => {
      SUBS.forEach((sub) => { k[sub] = k[sub] || []; });
      return k;
    });
    out.expenses = out.expenses || [];
    out.vyaparis = (out.vyaparis || []).map((v) => {
      migrateVyapari(v);
      v.fabricStock = v.fabricStock || [];
      return v;
    });
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
      maal: [],
      attendance: [],
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
  // Pieces handed to a karigar ("diya") or brought back finished ("wapas"),
  // optionally against a vyapari's lot.
  const makeMaal = (d) => ({
    id: newId(), date: d.date, type: d.type === "wapas" ? "wapas" : "diya", pcs: Number(d.pcs) || 0,
    vyapariId: d.vyapariId || "", note: d.note || "", createdAt: now(),
  });
  const makeAttendance = (d) => ({
    id: newId(), date: d.date, status: HAZRI.includes(d.status) ? d.status : "P", createdAt: now(),
  });
  // Fabric for a vyapari's lot: meters received ("in") or cut/used ("cut").
  const makeFabric = (d) => ({
    id: newId(), date: d.date, type: d.type === "cut" ? "cut" : "in", meters: Number(d.meters) || 0,
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
    async addMaal(karigarId, d) { addToKarigar(karigarId, "maal", makeMaal(d)); },

    // One mark per karigar per day; an empty status clears the day.
    async setAttendance(karigarId, date, status) {
      const k = findKarigar(karigarId);
      if (!k || !date) return;
      k.attendance = k.attendance.filter((a) => a.date !== date);
      if (HAZRI.includes(status)) k.attendance.push(makeAttendance({ date, status }));
      commit();
    },

    async setAttendanceAll(date, status) {
      if (!date || !HAZRI.includes(status)) return;
      data.karigars.forEach((k) => {
        k.attendance = k.attendance.filter((a) => a.date !== date);
        k.attendance.push(makeAttendance({ date, status }));
      });
      commit();
    },

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
      const v = { ...d, id: newId(), createdAt: now(), payments: [], fabricStock: [] };
      data.vyaparis.push(v);
      commit();
      return v.id;
    },

    // Payments and fabric stock are managed separately, so an edit never touches them.
    async updateVyapari(id, d) {
      const v = findVyapari(id);
      if (!v) return;
      const { payments, fabricStock, id: _id, createdAt, ...fields } = d;
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

    async addFabric(vyapariId, d) {
      const v = findVyapari(vyapariId);
      if (!v) throw new Error("Vyapari nahi mila.");
      v.fabricStock.push(makeFabric(d));
      commit();
    },

    async deleteFabric(vyapariId, entryId) {
      const v = findVyapari(vyapariId);
      if (!v) return;
      v.fabricStock = v.fabricStock.filter((f) => f.id !== entryId);
      commit();
    },

    // vyapariId -> pieces given to karigars and brought back, across everyone.
    lotProgress() {
      const out = {};
      data.karigars.forEach((k) => k.maal.forEach((m) => {
        if (!m.vyapariId) return;
        const p = out[m.vyapariId] || (out[m.vyapariId] = { diya: 0, wapas: 0 });
        p[m.type] += Number(m.pcs) || 0;
      }));
      return out;
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

    // Company logo as a small data: URL; null removes it.
    async saveLogo(dataUrl) {
      data.logo = dataUrl || null;
      commit();
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
      // Imported records get fresh ids, so maal entries must follow their lot.
      const vyapariIds = {};
      for (const src of payload.vyaparis) {
        const { id, createdAt, payments, fabricStock, ...rest } = src;
        const v = {
          ...rest, id: newId(), createdAt: createdAt || now(),
          payments: payments.map(makePayment), fabricStock: fabricStock.map(makeFabric),
        };
        if (id) vyapariIds[id] = v.id;
        data.vyaparis.push(v);
        vyapariCount++;
      }
      for (const src of payload.karigars) {
        const k = makeKarigar(src);
        k.workLogs = src.workLogs.map(makeWorkLog);
        k.sampleWork = src.sampleWork.map(makeSample);
        k.payments = src.payments.map(makePayment);
        k.maal = src.maal.map((m) => makeMaal({ ...m, vyapariId: vyapariIds[m.vyapariId] || "" }));
        k.attendance = src.attendance.map(makeAttendance);
        data.karigars.push(k);
        karigarCount++;
      }
      data.expenses.push(...payload.expenses.map(makeExpense));
      if (!data.logo && payload.logo) data.logo = payload.logo;
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
