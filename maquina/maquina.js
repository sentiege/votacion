// ===== MÁQUINA DE VOTACIÓN - ECP UNA =====

let ciActual = '';
let candidatoSeleccionado = null;
let pantalla = 'ci'; // ci | votar | confirmar | gracias

const vmContent  = document.getElementById('vmContent');
const urnaClassic = document.getElementById('urnaClassic');
const urnaBoleta  = document.getElementById('urnaBoleta');

// ──────────────────────────────────────────
// Paleta de colores por partido / lista
// ──────────────────────────────────────────
const PARTY_COLORS = [
  { bg: '#e00', text: '#fff', border: '#a00' },   // Lista 1  – rojo
  { bg: '#e07b00', text: '#fff', border: '#a05500' }, // Lista 2 – naranja
  { bg: '#f0c400', text: '#1a1a2e', border: '#b89600' }, // Lista 3 – amarillo
  { bg: '#0063be', text: '#fff', border: '#003d80' }, // Lista 4 – azul
  { bg: '#1db954', text: '#fff', border: '#148a3c' }, // Lista 5 – verde
  { bg: '#8e44ad', text: '#fff', border: '#6c3483' }, // Lista 6 – violeta
  { bg: '#16a085', text: '#fff', border: '#0e6655' }, // Lista 7 – esmeralda
  { bg: '#2c3e50', text: '#fff', border: '#1a252f' }, // Lista 8 – gris oscuro
];

function getCardColor(index) {
  return PARTY_COLORS[index % PARTY_COLORS.length];
}

// ──────────────────────────────────────────
// Router de pantallas
// ──────────────────────────────────────────
function render() {
  if (pantalla === 'votar') {
    urnaClassic.style.display = 'none';
    urnaBoleta.style.display  = 'flex';
    renderVotar();
  } else {
    urnaClassic.style.display = 'flex';
    urnaBoleta.style.display  = 'none';
    if (pantalla === 'ci')        renderCI();
    else if (pantalla === 'confirmar') renderConfirmar();
    else if (pantalla === 'gracias')   renderGracias();
  }
}

// ──────────────────────────────────────────
// PANTALLA 1: INGRESAR CI
// ──────────────────────────────────────────
function renderCI() {
  vmContent.innerHTML = `
    <div class="ci-screen">
      <h3>🪪 Ingrese su Cédula de Identidad</h3>
      <p>Utilice el teclado numérico para ingresar su CI</p>
      <div class="ci-display">
        <span class="ci-number" id="ciDisplay">${ciActual || ''}${ciActual.length < 10 ? '<span class="ci-cursor">|</span>' : ''}</span>
      </div>
      <div class="numpad">
        ${[1,2,3,4,5,6,7,8,9].map(n =>
          `<button class="num-btn" onclick="presionarNumero('${n}')">${n}</button>`
        ).join('')}
        <button class="num-btn del" onclick="borrarDigito()">⌫</button>
        <button class="num-btn" onclick="presionarNumero('0')">0</button>
        <button class="num-btn confirm" onclick="verificarCI()">✅ CONFIRMAR</button>
      </div>
      <div id="ciMsg"></div>
    </div>
  `;
}

function presionarNumero(n) {
  if (ciActual.length >= 10) return;
  ciActual += n;
  render();
}

function borrarDigito() {
  ciActual = ciActual.slice(0, -1);
  render();
}

function verificarCI() {
  if (ciActual.length < 5) {
    mostrarMsg('ciMsg', '⚠️ CI demasiado corta. Verifique el número.', 'warning');
    return;
  }
  const elector = DB.isHabilitado(ciActual);
  if (!elector) {
    mostrarMsg('ciMsg', `❌ CI ${ciActual} no está habilitada para votar.`, 'error');
    setTimeout(() => { ciActual = ''; render(); }, 2500);
    return;
  }
  if (DB.yaVoto(ciActual)) {
    mostrarMsg('ciMsg', `⚠️ La CI ${ciActual} ya emitió su voto.`, 'warning');
    setTimeout(() => { ciActual = ''; render(); }, 2500);
    return;
  }
  pantalla = 'votar';
  candidatoSeleccionado = null;
  render();
}

// ──────────────────────────────────────────
// PANTALLA 2: BOLETA ELECTRÓNICA
// ──────────────────────────────────────────
function renderVotar() {
  const candidatos = DB.getCandidatos();

  // Actualizar badge de CI
  const ciBadge = document.getElementById('urnaCiBadge');
  if (ciBadge) ciBadge.textContent = `🪪 CI: ${ciActual}`;

  // Resetear botón confirmar
  const confirmBtn = document.getElementById('urnaConfirmBtn');
  const selMsg     = document.getElementById('urnaSelMsg');

  const urnaMain = document.getElementById('urnaMain');
  if (!urnaMain) return;

  // Generar tarjetas de candidatos
  let cards = candidatos.map((c, i) => {
    const col = getCardColor(i);
    const isSelected = candidatoSeleccionado === c.id;
    const fotoHtml = c.foto
      ? `<img class="urna-card-foto" src="${c.foto}" alt="${c.nombre}">`
      : `<div class="urna-card-foto urna-card-nofoto">👤</div>`;
    return `
      <div class="urna-card ${isSelected ? 'urna-card--selected' : ''}"
           style="--card-bg:${col.bg}; --card-text:${col.text}; --card-border:${col.border};"
           onclick="seleccionarCandidatoBoleta(${c.id})">
        <div class="urna-card-header">
          <span class="urna-card-partido">${c.partido || 'Candidato'}</span>
          <span class="urna-card-lista">LISTA<br><strong>${i + 1}</strong></span>
        </div>
        ${fotoHtml}
        <div class="urna-card-nombre">${c.nombre}</div>
        ${isSelected ? '<div class="urna-card-check">✅</div>' : ''}
      </div>
    `;
  }).join('');

  // Tarjeta de voto en blanco
  const isBlanco = candidatoSeleccionado === 'blanco';
  cards += `
    <div class="urna-card urna-card--blanco ${isBlanco ? 'urna-card--selected' : ''}"
         onclick="seleccionarCandidatoBoleta('blanco')">
      <div class="urna-card-blanco-label">VOTO EN BLANCO</div>
      ${isBlanco ? '<div class="urna-card-check">✅</div>' : ''}
    </div>
  `;

  urnaMain.innerHTML = candidatos.length === 0
    ? '<p class="urna-empty">No hay candidatos registrados.</p>'
    : cards;

  // Actualizar estado del botón confirmar
  if (confirmBtn) confirmBtn.disabled = !candidatoSeleccionado;
  if (selMsg) {
    selMsg.textContent = candidatoSeleccionado
      ? (candidatoSeleccionado === 'blanco' ? 'Voto en blanco seleccionado' : 'Candidato seleccionado')
      : 'Seleccione un candidato para votar';
  }
}

function seleccionarCandidatoBoleta(id) {
  candidatoSeleccionado = id;
  renderVotar();
}

function irAConfirmarBoleta() {
  if (!candidatoSeleccionado) return;
  pantalla = 'confirmar';
  render();
}

function cancelarVotoBoleta() {
  ciActual = '';
  candidatoSeleccionado = null;
  pantalla = 'ci';
  render();
}

// Aliases para compatibilidad
function seleccionarCandidato(id) { seleccionarCandidatoBoleta(id); }
function irAConfirmar()           { irAConfirmarBoleta(); }
function cancelarVoto()           { cancelarVotoBoleta(); }
function votarBlanco()            { candidatoSeleccionado = 'blanco'; pantalla = 'confirmar'; render(); }

// ──────────────────────────────────────────
// PANTALLA 3: CONFIRMAR
// ──────────────────────────────────────────
function renderConfirmar() {
  let candidatoInfo = { nombre: 'VOTO EN BLANCO', partido: '' };
  let fotoHtml = '<div class="vm-no-photo" style="margin:0 auto 1rem; width:80px; height:80px; font-size:2.5rem;">⬜</div>';

  if (candidatoSeleccionado !== 'blanco') {
    const c = DB.getCandidatos().find(x => x.id === candidatoSeleccionado);
    if (c) {
      candidatoInfo = c;
      fotoHtml = c.foto
        ? `<img src="${c.foto}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #f0b429;margin:0 auto 1rem;display:block;">`
        : '<div class="vm-no-photo" style="margin:0 auto 1rem; width:80px; height:80px; font-size:2.5rem;">👤</div>';
    }
  }

  vmContent.innerHTML = `
    <div class="confirm-screen">
      <div class="check-icon">⚠️</div>
      <h3>¿Confirmar su voto?</h3>
      <p style="color:rgba(255,255,255,0.5); font-size:0.85rem; margin-bottom:1rem;">Esta acción no se puede deshacer.</p>
      <div class="confirm-selected">
        ${fotoHtml}
        <h4>${candidatoInfo.nombre}</h4>
        <p>${candidatoInfo.partido || ''}</p>
      </div>
      <div class="confirm-actions">
        <button class="vm-btn vm-btn-cancel" onclick="volverAVotar()">← Volver</button>
        <button class="vm-btn vm-btn-confirm" onclick="emitirVoto()">✅ EMITIR VOTO</button>
      </div>
    </div>
  `;
}

function volverAVotar() {
  pantalla = 'votar';
  render();
}

function emitirVoto() {
  DB.registrarVoto(ciActual, candidatoSeleccionado);
  const padron = DB.getPadron();
  const e = padron.find(x => x.ci === ciActual);
  if (e) { e.yaVoto = true; DB.savePadron(padron); }
  pantalla = 'gracias';
  render();
  let seg = 8;
  const interval = setInterval(() => {
    seg--;
    const el = document.getElementById('countdownSeg');
    if (el) el.textContent = seg;
    if (seg <= 0) {
      clearInterval(interval);
      ciActual = '';
      candidatoSeleccionado = null;
      pantalla = 'ci';
      render();
    }
  }, 1000);
}

// ──────────────────────────────────────────
// PANTALLA 4: GRACIAS
// ──────────────────────────────────────────
function renderGracias() {
  vmContent.innerHTML = `
    <div class="thankyou-screen">
      <div class="ty-icon">✅</div>
      <h3>¡Voto emitido con éxito!</h3>
      <p>Su voto ha sido registrado correctamente.<br>Gracias por participar en este ejercicio democrático.</p>
      <p class="countdown-text">Esta pantalla se reiniciará en <strong><span id="countdownSeg">8</span></strong> segundos...</p>
    </div>
  `;
}

function mostrarMsg(elId, msg, type) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="vm-msg ${type}">${msg}</div>`;
}

// Iniciar
render();