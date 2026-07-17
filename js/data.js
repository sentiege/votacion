// ===== VOTACION ECP UNA - Data Manager (Firebase Firestore) =====
// Usa la misma API que antes pero con Firestore como backend

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, doc,
  getDocs, getDoc, setDoc, deleteDoc,
  addDoc, updateDoc, onSnapshot, writeBatch, query
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBWs6JOidHAL-2Dap_BYIoSmJDoZgrVWts",
  authDomain: "votacion-54fe4.firebaseapp.com",
  projectId: "votacion-54fe4",
  storageBucket: "votacion-54fe4.firebasestorage.app",
  messagingSenderId: "178545291104",
  appId: "1:178545291104:web:d642e2dbea30d390c43805"
};

const _app = initializeApp(firebaseConfig);
const _db  = getFirestore(_app);

// Colecciones
const COL_PADRON     = 'padron';      // doc ID = CI del elector
const COL_CANDIDATOS = 'candidatos';  // doc ID = timestamp (id numérico)
const COL_VOTOS      = 'votos';       // doc ID = CI del elector
const DOC_CONFIG     = 'config/eleccion';

// Exportamos la instancia de Firestore por si se necesita onSnapshot externo
export { _db, collection, onSnapshot, query, COL_VOTOS, COL_PADRON, COL_CANDIDATOS };

const DB = {

  // ── PADRÓN ──────────────────────────────────────────────────────
  async getPadron() {
    const snap = await getDocs(collection(_db, COL_PADRON));
    return snap.docs.map(d => ({ ...d.data(), ci: d.id }));
  },

  async savePadron(data) {
    // data = array completo; sobreescribe en batch
    const batch = writeBatch(_db);
    // Borra los existentes y reescribe
    const snap = await getDocs(collection(_db, COL_PADRON));
    snap.docs.forEach(d => batch.delete(d.ref));
    data.forEach(e => {
      const ref = doc(_db, COL_PADRON, String(e.ci));
      batch.set(ref, { habilitado: e.habilitado, yaVoto: e.yaVoto || false });
    });
    await batch.commit();
  },

  async addElector(ci, habilitado = true) {
    await setDoc(doc(_db, COL_PADRON, String(ci)), { habilitado, yaVoto: false });
  },

  async updateElector(ci, fields) {
    await updateDoc(doc(_db, COL_PADRON, String(ci)), fields);
  },

  async deleteElector(ci) {
    await deleteDoc(doc(_db, COL_PADRON, String(ci)));
  },

  async isHabilitado(ci) {
    const snap = await getDoc(doc(_db, COL_PADRON, String(ci).trim()));
    if (!snap.exists()) return false;
    return snap.data().habilitado === true ? { ci, ...snap.data() } : false;
  },

  async yaVoto(ci) {
    const snap = await getDoc(doc(_db, COL_VOTOS, String(ci).trim()));
    return snap.exists();
  },

  // ── CANDIDATOS ──────────────────────────────────────────────────
  async getCandidatos() {
    const snap = await getDocs(collection(_db, COL_CANDIDATOS));
    return snap.docs
      .map(d => ({ ...d.data(), id: Number(d.id) }))
      .sort((a, b) => a.id - b.id);
  },

  async addCandidato(candidato) {
    // candidato = { id (timestamp), nombre, partido, foto }
    await setDoc(doc(_db, COL_CANDIDATOS, String(candidato.id)), candidato);
  },

  async deleteCandidato(id) {
    await deleteDoc(doc(_db, COL_CANDIDATOS, String(id)));
  },

  async saveCandidatos(data) {
    const batch = writeBatch(_db);
    const snap = await getDocs(collection(_db, COL_CANDIDATOS));
    snap.docs.forEach(d => batch.delete(d.ref));
    data.forEach(c => {
      const ref = doc(_db, COL_CANDIDATOS, String(c.id));
      batch.set(ref, c);
    });
    await batch.commit();
  },

  // ── VOTOS ───────────────────────────────────────────────────────
  async getVotos() {
    const snap = await getDocs(collection(_db, COL_VOTOS));
    return snap.docs.map(d => ({ ci: d.id, ...d.data() }));
  },

  async registrarVoto(ci, candidatoId) {
    // doc ID = CI → garantiza 1 voto por persona
    await setDoc(doc(_db, COL_VOTOS, String(ci).trim()), {
      candidatoId,
      timestamp: new Date().toISOString()
    });
    // Marcar yaVoto en padrón
    await updateDoc(doc(_db, COL_PADRON, String(ci).trim()), { yaVoto: true });
  },

  // ── CONFIG ──────────────────────────────────────────────────────
  async getConfig() {
    const snap = await getDoc(doc(_db, 'config', 'eleccion'));
    if (snap.exists()) return snap.data();
    return { eleccionAbierta: true, titulo: 'Elección de Delegados' };
  },

  async saveConfig(data) {
    await setDoc(doc(_db, 'config', 'eleccion'), data);
  },

  // ── RESET ───────────────────────────────────────────────────────
  async resetEleccion() {
    // Elimina todos los votos
    const batch = writeBatch(_db);
    const votosSnap = await getDocs(collection(_db, COL_VOTOS));
    votosSnap.docs.forEach(d => batch.delete(d.ref));
    // Resetea yaVoto en padrón
    const padronSnap = await getDocs(collection(_db, COL_PADRON));
    padronSnap.docs.forEach(d => batch.update(d.ref, { yaVoto: false }));
    await batch.commit();
  }
};

export default DB;
