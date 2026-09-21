/**
 * Firestore data-access helpers.
 * Everything is scoped under businesses/{uid} so each account's data is private.
 */
(function () {
  const KM = window.KM;

  function businessRef(uid) {
    return KM.firestore.collection("businesses").doc(uid);
  }

  KM.db = {
    // ---- business profile ----
    async createBusiness(uid, { businessName, ownerName, email }) {
      await businessRef(uid).set({
        businessName,
        ownerName,
        email,
        createdAt: KM.serverTimestamp(),
      });
    },

    async getBusiness(uid) {
      const snap = await businessRef(uid).get();
      return snap.exists ? snap.data() : null;
    },

    // ---- karigars ----
    karigarsCol(uid) {
      return businessRef(uid).collection("karigars");
    },

    async addKarigar(uid, data) {
      const ref = await this.karigarsCol(uid).add({
        name: data.name,
        phone: data.phone || "",
        defaultRate: Number(data.defaultRate) || 0,
        createdAt: KM.serverTimestamp(),
      });
      return ref.id;
    },

    async updateKarigar(uid, id, data) {
      await this.karigarsCol(uid).doc(id).update({
        name: data.name,
        phone: data.phone || "",
        defaultRate: Number(data.defaultRate) || 0,
      });
    },

    async deleteKarigar(uid, id) {
      // Delete sub-collections first (small factory-scale data, safe to do client-side).
      const subs = ["workLogs", "sampleWork", "payments"];
      for (const sub of subs) {
        const snap = await this.karigarsCol(uid).doc(id).collection(sub).get();
        const batch = KM.firestore.batch();
        snap.forEach((d) => batch.delete(d.ref));
        if (!snap.empty) await batch.commit();
      }
      await this.karigarsCol(uid).doc(id).delete();
    },

    listenKarigars(uid, callback) {
      return this.karigarsCol(uid).orderBy("name").onSnapshot((snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    },

    // ---- karigar sub-collections ----
    async addWorkLog(uid, karigarId, data) {
      await this.karigarsCol(uid).doc(karigarId).collection("workLogs").add({
        date: data.date,
        pieces: Number(data.pieces) || 0,
        rate: Number(data.rate) || 0,
        advance: Number(data.advance) || 0,
        note: data.note || "",
        createdAt: KM.serverTimestamp(),
      });
    },

    async addSampleWork(uid, karigarId, data) {
      await this.karigarsCol(uid).doc(karigarId).collection("sampleWork").add({
        date: data.date,
        qty: Number(data.qty) || 0,
        rate: Number(data.rate) || 0,
        note: data.note || "",
        createdAt: KM.serverTimestamp(),
      });
    },

    async addPayment(uid, karigarId, data) {
      await this.karigarsCol(uid).doc(karigarId).collection("payments").add({
        date: data.date,
        amount: Number(data.amount) || 0,
        note: data.note || "",
        createdAt: KM.serverTimestamp(),
      });
    },

    async deleteSubEntry(uid, karigarId, subCol, entryId) {
      await this.karigarsCol(uid).doc(karigarId).collection(subCol).doc(entryId).delete();
    },

    listenKarigarSub(uid, karigarId, subCol, callback) {
      return this.karigarsCol(uid)
        .doc(karigarId)
        .collection(subCol)
        .orderBy("date", "desc")
        .onSnapshot((snap) => {
          callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
    },

    // one-time fetch of all sub-entries, used for PDF + dashboard totals + JSON export
    async getKarigarFull(uid, karigarId) {
      const subs = ["workLogs", "sampleWork", "payments"];
      const result = {};
      for (const sub of subs) {
        const snap = await this.karigarsCol(uid).doc(karigarId).collection(sub).orderBy("date").get();
        result[sub] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return result;
    },

    // ---- vyaparis ----
    vyaparisCol(uid) {
      return businessRef(uid).collection("vyaparis");
    },

    async addVyapari(uid, data) {
      const ref = await this.vyaparisCol(uid).add({ ...data, createdAt: KM.serverTimestamp() });
      return ref.id;
    },

    async updateVyapari(uid, id, data) {
      await this.vyaparisCol(uid).doc(id).update(data);
    },

    async deleteVyapari(uid, id) {
      await this.vyaparisCol(uid).doc(id).delete();
    },

    listenVyaparis(uid, callback) {
      return this.vyaparisCol(uid).orderBy("createdAt", "desc").onSnapshot((snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    },

    // ---- full export (for JSON backup) ----
    async exportAll(uid) {
      const business = await this.getBusiness(uid);
      const karigarsSnap = await this.karigarsCol(uid).get();
      const karigars = [];
      for (const doc of karigarsSnap.docs) {
        const full = await this.getKarigarFull(uid, doc.id);
        karigars.push({ id: doc.id, ...doc.data(), ...full });
      }
      const vyaparisSnap = await this.vyaparisCol(uid).get();
      const vyaparis = vyaparisSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { business, karigars, vyaparis, exportedAt: new Date().toISOString() };
    },

    // ---- import (adds records as new documents; does not overwrite existing ids) ----
    async importAll(uid, payload) {
      let karigarCount = 0;
      let vyapariCount = 0;
      for (const k of payload.karigars || []) {
        const newId = await this.addKarigar(uid, k);
        for (const w of k.workLogs || []) await this.addWorkLog(uid, newId, w);
        for (const s of k.sampleWork || []) await this.addSampleWork(uid, newId, s);
        for (const p of k.payments || []) await this.addPayment(uid, newId, p);
        karigarCount++;
      }
      for (const v of payload.vyaparis || []) {
        const { id, createdAt, ...rest } = v;
        await this.addVyapari(uid, rest);
        vyapariCount++;
      }
      return { karigarCount, vyapariCount };
    },
  };
})();
