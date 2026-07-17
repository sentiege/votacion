// ===== ADMIN PANEL - ECP UNA (Firestore) =====
import DB, { _db, collection, onSnapshot, COL_VOTOS, COL_PADRON } from '../js/data.js';

function showSection(id, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  if (id === 'conteo')     renderConteo();
  if (id === 'padron')     renderPadron();
  if (id === 'candidatos') renderCandidatos();
}

function showMsg(elId, msg, type) {
  const el = document.getElementById(elId);
  el.innerHTML = `<div class="vm-msg ${type}">${msg}</div>`;
  setTimeout(() => el.innerHTML = '', 3500);
}

// ── PADRÓN ──────────────────────────────────────────────────────────
async function agregarElector() {
  const ci  = document.getElementById('inputCI').value.trim();
  const hab = document.getElementById('inputHabilitado').value === 'true';
  if (!ci) { showMsg('padronMsg', 'Ingrese una Cédula de Identidad.', 'error'); return; }
  const padron = await DB.getPadron();
  if (padron.find(e => e.ci === ci)) { showMsg('padronMsg', `CI ${ci} ya está en el padrón.`, 'warning'); return; }
  await DB.addElector(ci, hab);
  document.getElementById('inputCI').value = '';
  showMsg('padronMsg', `CI ${ci} agregada.`, 'success');
  renderPadron();
}

async function toggleHabilitado(ci) {
  const padron = await DB.getPadron();
  const e = padron.find(x => x.ci === ci);
  if (e) { await DB.updateElector(ci, { habilitado: !e.habilitado }); renderPadron(); }
}

async function eliminarElector(ci) {
  if (!confirm(`¿Eliminar del padrón a CI: ${ci}?`)) return;
  await DB.deleteElector(ci);
  renderPadron();
}

async function renderPadron() {
  const padron = await DB.getPadron();
  const tbody  = document.getElementById('padronTbody');
  tbody.innerHTML = padron.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${e.ci}</strong></td>
      <td><span class="badge ${e.habilitado ? 'badge-green':'badge-red'}">${e.habilitado ? '✅ Habilitado':'❌ Inhabilitado'}</span></td>
      <td><span class="badge ${e.yaVoto ? 'badge-blue':''}">${e.yaVoto ? '✔ Votó':'—'}</span></td>
      <td style="display:flex;gap:0.5rem;">
        <button class="btn btn-outline" style="padding:0.3rem 0.7rem;font-size:0.8rem" onclick="toggleHabilitado('${e.ci}')">${e.habilitado ? 'Inhabilitar':'Habilitar'}</button>
        <button class="btn btn-danger"  style="padding:0.3rem 0.7rem;font-size:0.8rem" onclick="eliminarElector('${e.ci}')">Eliminar</button>
      </td>
    </tr>`).join('');
}

function importarPadron() { document.getElementById('csvInput').click(); }

async function procesarCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    const lines  = e.target.result.split('\n').filter(l => l.trim());
    const padron = await DB.getPadron();
    let added = 0;
    for (const line of lines) {
      const parts = line.split(',');
      const ci  = parts[0].trim().replace(/[^\d]/g, '');
      const hab = parts[1] ? parts[1].trim().toLowerCase() !== 'false' : true;
      if (ci && !padron.find(e => e.ci === ci)) {
        await DB.addElector(ci, hab);
        added++;
      }
    }
    showMsg('padronMsg', `Se importaron ${added} electores del CSV.`, 'success');
    renderPadron();
  };
  reader.readAsText(file);
}

async function resetearEleccion() {
  if (!confirm('¿Resetear todos los votos? Esta acción no se puede deshacer.')) return;
  await DB.resetEleccion();
  renderPadron();
  showMsg('padronMsg', 'Elección reseteada. Todos los votos fueron eliminados.', 'warning');
}

// ── CANDIDATOS ──────────────────────────────────────────────────────
let fotoBase64 = null;

function previewFoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    fotoBase64 = e.target.result;
    const preview = document.getElementById('fotoPreview');
    preview.src   = fotoBase64;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function agregarCandidato() {
  const nombre  = document.getElementById('candNombre').value.trim();
  const partido = document.getElementById('candPartido').value.trim();
  if (!nombre) { showMsg('candidatosMsg', 'Ingrese el nombre del candidato.', 'error'); return; }
  const id = Date.now();
  await DB.addCandidato({ id, nombre, partido, foto: fotoBase64 || null });
  document.getElementById('candNombre').value  = '';
  document.getElementById('candPartido').value = '';
  document.getElementById('candFoto').value    = '';
  document.getElementById('fotoPreview').style.display = 'none';
  fotoBase64 = null;
  showMsg('candidatosMsg', `Candidato "${nombre}" agregado.`, 'success');
  renderCandidatos();
}

async function eliminarCandidato(id) {
  if (!confirm('¿Eliminar este candidato?')) return;
  await DB.deleteCandidato(id);
  renderCandidatos();
}

async function renderCandidatos() {
  const cands = await DB.getCandidatos();
  const grid  = document.getElementById('candidatosGrid');
  if (!cands.length) {
    grid.innerHTML = '<p style="color:#636e72;font-size:0.9rem;">No hay candidatos registrados.</p>';
    return;
  }
  grid.innerHTML = cands.map(c => `
    <div class="candidate-card">
      <button class="remove-btn" onclick="eliminarCandidato(${c.id})">✕</button>
      ${c.foto ? `<img src="${c.foto}" alt="${c.nombre}">` : '<div class="no-photo">👤</div>'}
      <h4>${c.nombre}</h4>
      <p class="partido">${c.partido || 'Sin lista'}</p>
    </div>`).join('');
}

// ── CONTEO (con listener en tiempo real) ────────────────────────────
let _unsubVotos  = null;
let _unsubPadron = null;

async function renderConteo() {
  // Cancela listeners anteriores
  if (_unsubVotos)  { _unsubVotos();  _unsubVotos  = null; }
  if (_unsubPadron) { _unsubPadron(); _unsubPadron = null; }

  const candidatos = await DB.getCandidatos();

  async function actualizarStats() {
    const padron = await DB.getPadron();
    const votos  = await DB.getVotos();
    _dibujarConteo(padron, votos, candidatos);
  }

  // Escucha cambios en votos y padrón en tiempo real
  _unsubVotos  = onSnapshot(collection(_db, COL_VOTOS),  () => actualizarStats());
  _unsubPadron = onSnapshot(collection(_db, COL_PADRON), () => actualizarStats());
}

function _dibujarConteo(padron, votos, candidatos) {
  const total          = padron.filter(e => e.habilitado).length;
  const votaron        = votos.length;
  const abstenciones   = Math.max(total - votaron, 0);
  const participacion  = total > 0 ? Math.round((votaron / total) * 100) : 0;

  document.getElementById('statTotal').textContent          = total;
  document.getElementById('statVotaron').textContent        = votaron;
  document.getElementById('statAbstenciones').textContent   = abstenciones;
  document.getElementById('statParticipacion').textContent  = participacion + '%';

  const conteo = {};
  let votos_blanco = 0;
  votos.forEach(v => {
    if (v.candidatoId === 'blanco') { votos_blanco++; return; }
    conteo[v.candidatoId] = (conteo[v.candidatoId] || 0) + 1;
  });

  let ganador = null, maxVotos = 0;
  candidatos.forEach(c => {
    if ((conteo[c.id] || 0) > maxVotos) { maxVotos = conteo[c.id] || 0; ganador = c; }
  });

  const winnerArea = document.getElementById('winner-area');
  if (ganador && votaron > 0) {
    winnerArea.innerHTML = `
      <div class="winner-banner">
        <div class="trophy">🏆</div>
        <div>
          <h3>Candidato con más votos: ${ganador.nombre}</h3>
          <p>${ganador.partido||''} · ${maxVotos} voto${maxVotos!==1?'s':''} (${Math.round((maxVotos/votaron)*100)}%)</p>
        </div>
      </div>`;
  } else { winnerArea.innerHTML = ''; }

  const barras  = document.getElementById('resultadosBarras');
  const allItems = [
    ...candidatos.map(c => ({ label: c.nombre, sub: c.partido, count: conteo[c.id]||0 })),
    { label: 'Voto en blanco', sub: '', count: votos_blanco }
  ].sort((a,b) => b.count - a.count);

  barras.innerHTML = allItems.map(item => {
    const pct = votaron > 0 ? Math.round((item.count / votaron) * 100) : 0;
    return `
      <div class="result-bar-row">
        <div class="result-bar-name">${item.label}</div>
        <div class="result-bar-track">
          <div class="result-bar-fill" style="width:${pct}%">${pct > 8 ? pct+'%' : ''}</div>
        </div>
        <div class="result-bar-count">${item.count}</div>
      </div>`;
  }).join('');
}

async function imprimirResultados() {
  const padron     = await DB.getPadron();
  const votos      = await DB.getVotos();
  const candidatos = await DB.getCandidatos();
  const config     = await DB.getConfig();
  const getName = id => {
    if (id === 'blanco') return 'VOTO EN BLANCO';
    const c = candidatos.find(x => x.id === id); return c ? c.nombre : 'Desconocido';
  };
  const fecha = new Date().toLocaleString('es-PY');
  document.getElementById('actaContent').innerHTML = `
    <div style="font-family:Arial,sans-serif;padding:1rem;">
      <h2 style="text-align:center;color:#1a3a6b;">ACTA DE VOTACIÓN</h2>
      <h3 style="text-align:center;">${config.titulo}</h3>
      <p style="text-align:center;color:#636e72;">Escuela de Ciencias Políticas y Sociales · UNA · ${fecha}</p>
      <hr style="margin:1rem 0;">
      <h4>Registro de Votos Emitidos:</h4>
      <table style="width:100%;border-collapse:collapse;margin-top:0.5rem;">
        <thead><tr style="background:#1a3a6b;color:white;">
          <th style="padding:8px;text-align:left;">#</th>
          <th style="padding:8px;text-align:left;">CI</th>
          <th style="padding:8px;text-align:left;">Candidato</th>
          <th style="padding:8px;text-align:left;">Fecha/Hora</th>
        </tr></thead>
        <tbody>${votos.map((v,i)=>`
          <tr style="background:${i%2===0?'#f4f6fb':'white'}">
            <td style="padding:6px 8px;">${i+1}</td>
            <td style="padding:6px 8px;font-weight:600;">${v.ci}</td>
            <td style="padding:6px 8px;">${getName(v.candidatoId)}</td>
            <td style="padding:6px 8px;font-size:0.85rem;">${new Date(v.timestamp).toLocaleString('es-PY')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <hr style="margin:1rem 0;">
      <p><strong>Total votaron:</strong> ${votos.length} | <strong>Padrón habilitado:</strong> ${padron.filter(e=>e.habilitado).length}</p>
    </div>`;
  document.getElementById('print-area').style.display = 'block';
  window.print();
  document.getElementById('print-area').style.display = 'none';
}

async function exportarCSV() {
  const votos      = await DB.getVotos();
  const candidatos = await DB.getCandidatos();
  const getName = id => {
    if (id === 'blanco') return 'VOTO EN BLANCO';
    const c = candidatos.find(x => x.id === id); return c ? c.nombre : 'Desconocido';
  };
  const rows = ['CI,Candidato,Fecha'].concat(
    votos.map(v => `${v.ci},${getName(v.candidatoId)},${new Date(v.timestamp).toLocaleString('es-PY')}`)
  );
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'acta_votacion_ecp.csv';
  a.click();
}

// Init
renderPadron();
