// ===== MÁQUINA DE VOTACIÓN - ECP UNA =====

let ciActual = '';
let candidatoSeleccionado = null;
let pantalla = 'ci'; // ci | votar | confirmar | gracias

const vmContent   = document.getElementById('vmContent');
const urnaClassic = document.getElementById('urnaClassic');
const urnaBoleta  = document.getElementById('urnaBoleta');

// Paleta de colores de partidos (mismos de la imagen de referencia)
const PARTY_COLORS = [
  { bg: '#cc0000', text: '#fff', border: '#8a0000' },  // rojo
  { bg: '#e07b00', text: '#fff', border: '#a05500' },  // naranja
  { bg: '#f0c400', text: '#1a1a1a', border: '#b89000' }, // amarillo
  { bg: '#0055aa', text: '#fff', border: '#003d80' },  // azul
  { bg: '#1aaa44', text: '#fff', border: '#127a30' },  // verde
  { bg: '#7b22c0', text: '#fff', border: '#561880' },  // violeta
  { bg: '#16869e', text: '#fff', border: '#0d5e6e' },  // teal
  { bg: '#2c3e50', text: '#fff', border: '#1a252f' },  // gris oscuro
];

function getCardColor(index) {
  return PARTY_COLORS[index % PARTY_COLORS.length];
}

// ── Router ──
function render() {
  if (pantalla === 'votar') {
    urnaClassic.style.display = 'none';
    urnaBoleta.style.display  = 'flex';
    renderVotar();
  } else {
    urnaClassic.style.display = 'flex';
    urnaBoleta.style.display  = 'none';
    if      (pantalla === 'ci')        renderCI();
    else if (pantalla === 'confirmar') renderConfirmar();
    else if (pantalla === 'gracias')   renderGracias();
  }
}

// ── PANTALLA 1: CI ──
function renderCI() {
  vmContent.innerHTML = `
    <div class="ci-screen">
      <h3>🪪 Ingrese su Cédula de Identidad</h3>
      <p>Utilice el teclado numérico para ingresar su CI</p>
      <div class="ci-display">
        <span class="ci-number" id="ciDisplay">${ciActual}${ciActual.length < 10 ? '<span class="ci-cursor">|</span>' : ''}</span>
      </div>
      <div class="numpad">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn" onclick="presionarNumero('${n}')">${n}</button>`).join('')}
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
  ciActual += n; render();
}
function borrarDigito() {
  ciActual = ciActual.slice(0, -1); render();
}
function verificarCI() {
  if (ciActual.length < 5) {
    mostrarMsg('ciMsg', '⚠️ CI demasiado corta.', 'warning'); return;
  }
  if (!DB.isHabilitado(ciActual)) {
    mostrarMsg('ciMsg', `❌ CI ${ciActual} no habilitada.`, 'error');
    setTimeout(() => { ciActual = ''; render(); }, 2500); return;
  }
  if (DB.yaVoto(ciActual)) {
    mostrarMsg('ciMsg', `⚠️ CI ${ciActual} ya votó.`, 'warning');
    setTimeout(() => { ciActual = ''; render(); }, 2500); return;
  }
  pantalla = 'votar'; candidatoSeleccionado = null; render();
}

// ── PANTALLA 2: BOLETA ELECTRÓNICA ──
function renderVotar() {
  const candidatos = DB.getCandidatos();

  // Badge CI
  const ciBadge = document.getElementById('urnaCiBadge');
  if (ciBadge) ciBadge.textContent = `🪪 CI: ${ciActual}`;

  const urnaMain = document.getElementById('urnaMain');
  if (!urnaMain) return;

  if (candidatos.length === 0) {
    urnaMain.innerHTML = '<p class="urna-empty">No hay candidatos registrados.</p>';
  } else {
    // Tarjetas de candidatos
    const cards = candidatos.map((c, i) => {
      const col = getCardColor(i);
      const selected = candidatoSeleccionado === c.id;
      const fotoHtml = c.foto
        ? `<img class="urna-card-foto" src="${c.foto}" alt="${c.nombre}">`
        : `<div class="urna-card-nofoto">👤</div>`;
      return `
        <div class="urna-card${selected ? ' urna-card--selected' : ''}"
             style="--card-bg:${col.bg};--card-text:${col.text};--card-border:${col.border};"
             onclick="seleccionarCandidatoBoleta(${c.id})">
          ${selected ? '<div class="urna-card-check">✅</div>' : ''}
          <div class="urna-card-header">
            <span class="urna-card-partido">${c.partido || 'Candidato'}</span>
            <span class="urna-card-lista">
              <span class="urna-card-lista-label">Lista</span>
              <span class="urna-card-lista-num">${i + 1}</span>
            </span>
          </div>
          <div class="urna-card-foto-wrap">${fotoHtml}</div>
          <div class="urna-card-nombre">${c.nombre}</div>
        </div>`;
    }).join('');

    // Tarjeta voto en blanco
    const blancoSelected = candidatoSeleccionado === 'blanco';
    const blancoCard = `
      <div class="urna-card urna-card--blanco${blancoSelected ? ' urna-card--selected' : ''}"
           onclick="seleccionarCandidatoBoleta('blanco')">
        ${blancoSelected ? '<div class="urna-card-check">✅</div>' : ''}
        <div class="urna-card-blanco-inner">
          <span class="urna-card-blanco-icon">⬜</span>
          <span class="urna-card-blanco-label">Voto en Blanco</span>
        </div>
      </div>`;

    urnaMain.innerHTML = cards + blancoCard;
  }

  // Footer
  const confirmBtn = document.getElementById('urnaConfirmBtn');
  const selMsg     = document.getElementById('urnaSelMsg');
  if (confirmBtn) confirmBtn.disabled = !candidatoSeleccionado;
  if (selMsg) {
    selMsg.textContent = candidatoSeleccionado
      ? (candidatoSeleccionado === 'blanco' ? '⬜ Voto en blanco seleccionado' : '✔ Candidato seleccionado')
      : 'Seleccione un candidato para continuar';
  }
}

function seleccionarCandidatoBoleta(id) {
  candidatoSeleccionado = id; renderVotar();
}
function irAConfirmarBoleta() {
  if (!candidatoSeleccionado) return;
  pantalla = 'confirmar'; render();
}
function cancelarVotoBoleta() {
  ciActual = ''; candidatoSeleccionado = null; pantalla = 'ci'; render();
}

// Aliases compatibilidad
function seleccionarCandidato(id) { seleccionarCandidatoBoleta(id); }
function irAConfirmar()           { irAConfirmarBoleta(); }
function cancelarVoto()           { cancelarVotoBoleta(); }
function votarBlanco()            { candidatoSeleccionado = 'blanco'; pantalla = 'confirmar'; render(); }

// ── PANTALLA 3: CONFIRMAR ──
function renderConfirmar() {
  let info = { nombre: 'VOTO EN BLANCO', partido: '' };
  let fotoHtml = '<div class="vm-no-photo" style="width:80px;height:80px;margin:0 auto 1rem;">⬜</div>';
  if (candidatoSeleccionado !== 'blanco') {
    const c = DB.getCandidatos().find(x => x.id === candidatoSeleccionado);
    if (c) {
      info = c;
      fotoHtml = c.foto
        ? `<img src="${c.foto}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #f0b429;margin:0 auto 1rem;display:block;">`
        : '<div class="vm-no-photo" style="width:80px;height:80px;margin:0 auto 1rem;">👤</div>';
    }
  }
  vmContent.innerHTML = `
    <div class="confirm-screen">
      <div class="check-icon">⚠️</div>
      <h3>¿Confirmar su voto?</h3>
      <p style="color:rgba(255,255,255,0.5);font-size:0.85rem;margin-bottom:1rem;">Esta acción no puede deshacerse.</p>
      <div class="confirm-selected">${fotoHtml}<h4>${info.nombre}</h4><p>${info.partido||''}</p></div>
      <div class="confirm-actions">
        <button class="vm-btn vm-btn-cancel" onclick="volverAVotar()">← Volver</button>
        <button class="vm-btn vm-btn-confirm" onclick="emitirVoto()">✅ EMITIR VOTO</button>
      </div>
    </div>`;
}

function volverAVotar() { pantalla = 'votar'; render(); }

function emitirVoto() {
  DB.registrarVoto(ciActual, candidatoSeleccionado);
  const padron = DB.getPadron();
  const e = padron.find(x => x.ci === ciActual);
  if (e) { e.yaVoto = true; DB.savePadron(padron); }
  pantalla = 'gracias'; render();
  let seg = 8;
  const iv = setInterval(() => {
    seg--;
    const el = document.getElementById('countdownSeg');
    if (el) el.textContent = seg;
    if (seg <= 0) { clearInterval(iv); ciActual = ''; candidatoSeleccionado = null; pantalla = 'ci'; render(); }
  }, 1000);
}

// ── PANTALLA 4: GRACIAS ──
function renderGracias() {
  vmContent.innerHTML = `
    <div class="thankyou-screen">
      <div class="ty-icon">✅</div>
      <h3>¡Voto emitido con éxito!</h3>
      <p>Su voto ha sido registrado correctamente.<br>Gracias por participar en este ejercicio democrático.</p>
      <p class="countdown-text">Esta pantalla se reiniciará en <strong><span id="countdownSeg">8</span></strong> segundos...</p>
    </div>`;
}

function mostrarMsg(elId, msg, type) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="vm-msg ${type}">${msg}</div>`;
}

render();