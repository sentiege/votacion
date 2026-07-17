// ===== VOTACION ECP UNA - Data Manager =====
// Persistencia en localStorage

const DB = {
  PADRON_KEY: 'ecp_padron',
  CANDIDATOS_KEY: 'ecp_candidatos',
  VOTOS_KEY: 'ecp_votos',
  CONFIG_KEY: 'ecp_config',

  getPadron() {
    return JSON.parse(localStorage.getItem(this.PADRON_KEY) || '[]');
  },
  savePadron(data) {
    localStorage.setItem(this.PADRON_KEY, JSON.stringify(data));
  },
  getCandidatos() {
    return JSON.parse(localStorage.getItem(this.CANDIDATOS_KEY) || '[]');
  },
  saveCandidatos(data) {
    localStorage.setItem(this.CANDIDATOS_KEY, JSON.stringify(data));
  },
  getVotos() {
    return JSON.parse(localStorage.getItem(this.VOTOS_KEY) || '[]');
  },
  saveVotos(data) {
    localStorage.setItem(this.VOTOS_KEY, JSON.stringify(data));
  },
  getConfig() {
    return JSON.parse(localStorage.getItem(this.CONFIG_KEY) || '{"eleccionAbierta": true, "titulo": "Elección de Delegados"}');
  },
  saveConfig(data) {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(data));
  },
  resetEleccion() {
    // Resetea votos y marca todos como no votaron
    localStorage.removeItem(this.VOTOS_KEY);
    const padron = this.getPadron();
    padron.forEach(e => e.yaVoto = false);
    this.savePadron(padron);
  },
  isHabilitado(ci) {
    const padron = this.getPadron();
    return padron.find(e => e.ci === ci.trim() && e.habilitado === true);
  },
  yaVoto(ci) {
    const votos = this.getVotos();
    return votos.some(v => v.ci === ci.trim());
  },
  registrarVoto(ci, candidatoId) {
    const votos = this.getVotos();
    votos.push({
      ci: ci.trim(),
      candidatoId: candidatoId,
      timestamp: new Date().toISOString()
    });
    this.saveVotos(votos);
  }
};