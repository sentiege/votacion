// ===== MÁQUINA DE VOTACIÓN - ECP UNA =====

let ciActual = '';
let candidatoSeleccionado = null;
let pantalla = 'ci'; // ci | votar | confirmar | gracias

const vmContent = document.getElementById('vmContent');

function render() {
  if (pantalla === 'ci') renderCI();
  else if (pantalla === 'votar') renderVotar();
  else if (pantalla === 'confirmar') renderConfirmar();
  else if (pantalla === 'gracias') renderGracias();
}

// ===== PANTALLA 1: INGRESAR CI =====
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

// ===== PANTALLA 2: VOTAR =====
function renderVotar() {
  const candidatos = DB.getCandidatos();
  vmContent.innerHTML = `
    <div class="vote-screen">
      <h3>Seleccione su candidato</h3>
      <p class="voter-ci">🪪 CI: ${ciActual}</p>
      <div class="vm-candidates">
        ${candidatos.map((c, i) => `
          <button class="vm-candidate-btn ${candidatoSeleccionado === c.id ? 'selected' : ''}" onclick="seleccionarCandidato(${c.id})">
            <div class="vm-num-badge">${i + 1}</div>
            ${c.foto ? `<img src="${c.foto}" alt="${c.nombre}">` : '<div class="vm-no-photo">👤</div>'}
            <div class="vm-candidate-info">
              <h4>${c.nombre}</h4>
              <p>${c.partido || 'Candidato independiente'}</p>
            </div>
          </button>
        `).join('')}
        ${candidatos.length === 0 ? '<p style="color:rgba(255,255,255,0.5); text-align:center; padding:2rem;">No hay candidatos registrados.</p>' : ''}
      </div>
      <div class="vm-vote-actions">
        <button class="vm-btn vm-btn-cancel" onclick="cancelarVoto()">✕</button>
        <button class="vm-btn vm-btn-blank" onclick="votarBlanco()">⬜ Blanco</button>
        <button class="vm-btn vm-btn-confirm" ${candidatoSeleccionado ? '' : 'disabled'} onclick="irAConfirmar()">✅ Confirmar</button>
      </div>
    </div>
  `;
}

function seleccionarCandidato(id) {
  candidatoSeleccionado = id;
  render();
}

function irAConfirmar() {
  if (!candidatoSeleccionado) return;
  pantalla = 'confirmar';
  render();
}

function votarBlanco() {
  candidatoSeleccionado = 'blanco';
  pantalla = 'confirmar';
  render();
}

function cancelarVoto() {
  ciActual = '';
  candidatoSeleccionado = null;
  pantalla = 'ci';
  render();
}

// ===== PANTALLA 3: CONFIRMAR =====
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
  // Marcar en padrón
  const padron = DB.getPadron();
  const e = padron.find(x => x.ci === ciActual);
  if (e) { e.yaVoto = true; DB.savePadron(padron); }
  pantalla = 'gracias';
  render();
  // Auto-reset en 8 segundos
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

// ===== PANTALLA 4: GRACIAS =====
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
  if (el) {
    el.innerHTML = `<div class="vm-msg ${type}">${msg}</div>`;
  }
}

// Iniciar
render();