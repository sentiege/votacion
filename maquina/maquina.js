// ===== MÁQUINA DE VOTACIÓN - ECP UNA (Firestore) =====
import DB from '../js/data.js';

let ciActual = '';
let candidatoSeleccionado = null;
let pantalla = 'ci';

const vmContent   = document.getElementById('vmContent');
const urnaClassic = document.getElementById('urnaClassic');
const urnaBoleta  = document.getElementById('urnaBoleta');

const PARTY_COLORS = [
  { bg: '#cc0000', text: '#fff', border: '#8a0000' },
  { bg: '#e07b00', text: '#fff', border: '#a05500' },
  { bg: '#f0c400', text: '#1a1a1a', border: '#b89000' },
  { bg: '#0055aa', text: '#fff', border: '#003d80' },
  { bg: '#1aaa44', text: '#fff', border: '#127a30' },
  { bg: '#7b22c0', text: '#fff', border: '#561880' },
  { bg: '#16869e', text: '#fff', border: '#0d5e6e' },
  { bg: '#2c3e50', text: '#fff', border: '#1a252f' },
];
function getCardColor(i) { return PARTY_COLORS[i % PARTY_COLORS.length]; }

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
        <span class="ci-number">${ciActual}${ciActual.length < 10 ? '<span class="ci-cursor">|</span>' : ''}</span>
      </div>
      <div class="numpad">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="num-btn" onclick="presionarNumero('${n}')">${n}</button>`).join('')}
        <button class="num-btn del" onclick="borrarDigito()">⌫</button>
        <button class="num-btn" onclick="presionarNumero('0')">0</button>
        <button class="num-btn confirm" onclick="verificarCI()">✅ CONFIRMAR</button>
      </div>
      <div id="ciMsg"></div>
    </div>`;
}

function presionarNumero(n) { if (ciActual.length >= 10) return; ciActual += n; render(); }
function borrarDigito()     { ciActual = ciActual.slice(0, -1); render(); }

async function verificarCI() {
  if (ciActual.length < 5) { mostrarMsg('ciMsg', '⚠️ CI demasiado corta.', 'warning'); return; }
  mostrarMsg('ciMsg', '⏳ Verificando...', 'warning');
  try {
    const habilitado = await DB.isHabilitado(ciActual);
    if (!habilitado) {
      mostrarMsg('ciMsg', `❌ CI ${ciActual} no habilitada.`, 'error');
      setTimeout(() => { ciActual = ''; render(); }, 2500); return;
    }
    const yaVoto = await DB.yaVoto(ciActual);
    if (yaVoto) {
      mostrarMsg('ciMsg', `⚠️ CI ${ciActual} ya emitió su voto.`, 'warning');
      setTimeout(() => { ciActual = ''; render(); }, 2500); return;
    }
    pantalla = 'votar'; candidatoSeleccionado = null; render();
  } catch (err) {
    mostrarMsg('ciMsg', '❌ Error de conexión. Reintente.', 'error');
    console.error(err);
  }
}

// ── PANTALLA 2: BOLETA ──
async function renderVotar() {
  const candidatos = await DB.getCandidatos();
  const ciBadge = document.getElementById('urnaCiBadge');
  if (ciBadge) ciBadge.textContent = `🪪 CI: ${ciActual}`;
  const urnaMain = document.getElementById('urnaMain');
  if (!urnaMain) return;

  if (!candidatos.length) {
    urnaMain.innerHTML = '<p class="urna-empty">No hay candidatos registrados.</p>';
  } else {
    const cards = candidatos.map((c, i) => {
      const col = getCardColor(i);
      const sel = candidatoSeleccionado === c.id;
      const foto = c.foto
        ? `<img class="urna-card-foto" src="${c.foto}" alt="${c.nombre}">`
        : `<div class="urna-card-nofoto">👤</div>`;
      return `
        <div class="urna-card${sel ? ' urna-card--selected' : ''}"
             style="--card-bg:${col.bg};--card-text:${col.text};--card-border:${col.border};"
             onclick="seleccionarCandidatoBoleta(${c.id})">
          ${sel ? '<div class="urna-card-check">✅</div>' : ''}
          <div class="urna-card-header">
            <span class="urna-card-partido">${c.partido || 'Candidato'}</span>
            <span class="urna-card-lista">
              <span class="urna-card-lista-label">Lista</span>
              <span class="urna-card-lista-num">${i + 1}</span>
            </span>
          </div>
          <div class="urna-card-foto-wrap">${foto}</div>
          <div class="urna-card-nombre">${c.nombre}</div>
        </div>`;
    }).join('');

    const blancoSel = candidatoSeleccionado === 'blanco';
    const blancoCard = `
      <div class="urna-card urna-card--blanco${blancoSel ? ' urna-card--selected' : ''}"
           onclick="seleccionarCandidatoBoleta('blanco')">
        ${blancoSel ? '<div class="urna-card-check">✅</div>' : ''}
        <div class="urna-card-blanco-inner">
          <span class="urna-card-blanco-icon">⬜</span>
          <span class="urna-card-blanco-label">Voto en Blanco</span>
        </div>
      </div>`;
    urnaMain.innerHTML = cards + blancoCard;
  }

  const btn = document.getElementById('urnaConfirmBtn');
  const msg = document.getElementById('urnaSelMsg');
  if (btn) btn.disabled = !candidatoSeleccionado;
  if (msg) msg.textContent = candidatoSeleccionado
    ? (candidatoSeleccionado === 'blanco' ? '⬜ Voto en blanco seleccionado' : '✔ Candidato seleccionado')
    : 'Seleccione un candidato para continuar';
}

function seleccionarCandidatoBoleta(id) { candidatoSeleccionado = id; renderVotar(); }
async function irAConfirmarBoleta()     { if (!candidatoSeleccionado) return; pantalla = 'confirmar'; render(); }
function cancelarVotoBoleta()           { ciActual = ''; candidatoSeleccionado = null; pantalla = 'ci'; render(); }

// Aliases
function seleccionarCandidato(id) { seleccionarCandidatoBoleta(id); }
function irAConfirmar()           { irAConfirmarBoleta(); }
function cancelarVoto()           { cancelarVotoBoleta(); }
function votarBlanco()            { candidatoSeleccionado = 'blanco'; pantalla = 'confirmar'; render(); }

// ── PANTALLA 3: CONFIRMAR ──
async function renderConfirmar() {
  let info = { nombre: 'VOTO EN BLANCO', partido: '' };
  let fotoHtml = '<div class="vm-no-photo" style="width:80px;height:80px;margin:0 auto 1rem;">⬜</div>';
  if (candidatoSeleccionado !== 'blanco') {
    const cands = await DB.getCandidatos();
    const c = cands.find(x => x.id === candidatoSeleccionado);
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

async function emitirVoto() {
  const btn = document.querySelector('.vm-btn-confirm');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando...'; }
  try {
    await DB.registrarVoto(ciActual, candidatoSeleccionado);
    pantalla = 'gracias'; render();
    let seg = 8;
    const iv = setInterval(() => {
      seg--;
      const el = document.getElementById('countdownSeg');
      if (el) el.textContent = seg;
      if (seg <= 0) { clearInterval(iv); ciActual = ''; candidatoSeleccionado = null; pantalla = 'ci'; render(); }
    }, 1000);
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '✅ EMITIR VOTO'; }
    alert('Error al guardar el voto. Verifique la conexión.');
    console.error(err);
  }
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
