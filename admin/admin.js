// ===== ADMIN PANEL - ECP UNA =====

function showSection(id, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');
  if (id === 'conteo') renderConteo();
  if (id === 'padron') renderPadron();
  if (id === 'candidatos') renderCandidatos();
}

function showMsg(elId, msg, type) {
  const el = document.getElementById(elId);
  el.innerHTML = `<div class="vm-msg ${type}">${msg}</div>`;
  setTimeout(() => el.innerHTML = '', 3500);
}

// ===== PADRÓN =====
function agregarElector() {
  const ci = document.getElementById('inputCI').value.trim();
  const hab = document.getElementById('inputHabilitado').value === 'true';
  if (!ci) { showMsg('padronMsg', 'Ingrese una Cédula de Identidad.', 'error'); return; }
  const padron = DB.getPadron();
  if (padron.find(e => e.ci === ci)) { showMsg('padronMsg', `La CI ${ci} ya está en el padrón.`, 'warning'); return; }
  padron.push({ ci, habilitado: hab, yaVoto: false });
  DB.savePadron(padron);
  document.getElementById('inputCI').value = '';
  showMsg('padronMsg', `CI ${ci} agregada correctamente.`, 'success');
  renderPadron();
}

function toggleHabilitado(ci) {
  const padron = DB.getPadron();
  const e = padron.find(x => x.ci === ci);
  if (e) { e.habilitado = !e.habilitado; DB.savePadron(padron); renderPadron(); }
}

function eliminarElector(ci) {
  if (!confirm(`¿Eliminar del padrón a CI: ${ci}?`)) return;
  let padron = DB.getPadron().filter(e => e.ci !== ci);
  DB.savePadron(padron);
  renderPadron();
}

function renderPadron() {
  const padron = DB.getPadron();
  const tbody = document.getElementById('padronTbody');
  tbody.innerHTML = padron.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${e.ci}</strong></td>
      <td><span class="badge ${e.habilitado ? 'badge-green' : 'badge-red'}">${e.habilitado ? '✅ Habilitado' : '❌ Inhabilitado'}</span></td>
      <td><span class="badge ${e.yaVoto ? 'badge-blue' : ''}">${e.yaVoto ? '✔ Votó' : '—'}</span></td>
      <td style="display:flex; gap:0.5rem;">
        <button class="btn btn-outline" style="padding:0.3rem 0.7rem; font-size:0.8rem" onclick="toggleHabilitado('${e.ci}')">${e.habilitado ? 'Inhabilitar' : 'Habilitar'}</button>
        <button class="btn btn-danger" style="padding:0.3rem 0.7rem; font-size:0.8rem" onclick="eliminarElector('${e.ci}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function importarPadron() { document.getElementById('csvInput').click(); }

function procesarCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    const padron = DB.getPadron();
    let added = 0;
    lines.forEach(line => {
      const parts = line.split(',');
      const ci = parts[0].trim().replace(/[^\d]/g, '');
      const hab = parts[1] ? parts[1].trim().toLowerCase() !== 'false' : true;
      if (ci && !padron.find(e => e.ci === ci)) {
        padron.push({ ci, habilitado: hab, yaVoto: false });
        added++;
      }
    });
    DB.savePadron(padron);
    showMsg('padronMsg', `Se importaron ${added} electores del CSV.`, 'success');
    renderPadron();
  };
  reader.readAsText(file);
}

function resetearEleccion() {
  if (!confirm('¿Resetear todos los votos? Esta acción no se puede deshacer.')) return;
  DB.resetEleccion();
  renderPadron();
  showMsg('padronMsg', 'Elección reseteada. Todos los votos fueron eliminados.', 'warning');
}

// ===== CANDIDATOS =====
let fotoBase64 = null;

function previewFoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    fotoBase64 = e.target.result;
    const preview = document.getElementById('fotoPreview');
    preview.src = fotoBase64;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function agregarCandidato() {
  const nombre = document.getElementById('candNombre').value.trim();
  const partido = document.getElementById('candPartido').value.trim();
  if (!nombre) { showMsg('candidatosMsg', 'Ingrese el nombre del candidato.', 'error'); return; }
  const candidatos = DB.getCandidatos();
  const id = Date.now();
  candidatos.push({ id, nombre, partido, foto: fotoBase64 || null });
  DB.saveCandidatos(candidatos);
  document.getElementById('candNombre').value = '';
  document.getElementById('candPartido').value = '';
  document.getElementById('candFoto').value = '';
  document.getElementById('fotoPreview').style.display = 'none';
  fotoBase64 = null;
  showMsg('candidatosMsg', `Candidato "${nombre}" agregado.`, 'success');
  renderCandidatos();
}

function eliminarCandidato(id) {
  if (!confirm('¿Eliminar este candidato?')) return;
  let cands = DB.getCandidatos().filter(c => c.id !== id);
  DB.saveCandidatos(cands);
  renderCandidatos();
}

function renderCandidatos() {
  const cands = DB.getCandidatos();
  const grid = document.getElementById('candidatosGrid');
  if (!cands.length) {
    grid.innerHTML = '<p style="color:#636e72; font-size:0.9rem;">No hay candidatos registrados.</p>';
    return;
  }
  grid.innerHTML = cands.map(c => `
    <div class="candidate-card">
      <button class="remove-btn" onclick="eliminarCandidato(${c.id})">✕</button>
      ${c.foto ? `<img src="${c.foto}" alt="${c.nombre}">` : '<div class="no-photo">👤</div>'}
      <h4>${c.nombre}</h4>
      <p class="partido">${c.partido || 'Sin lista'}</p>
    </div>
  `).join('');
}

// ===== CONTEO =====
function renderConteo() {
  const padron = DB.getPadron();
  const votos = DB.getVotos();
  const candidatos = DB.getCandidatos();

  const total = padron.filter(e => e.habilitado).length;
  const votaron = votos.length;
  const abstenciones = total - votaron;
  const participacion = total > 0 ? Math.round((votaron / total) * 100) : 0;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statVotaron').textContent = votaron;
  document.getElementById('statAbstenciones').textContent = Math.max(abstenciones, 0);
  document.getElementById('statParticipacion').textContent = participacion + '%';

  // Contar votos por candidato
  const conteo = {};
  let votos_blanco = 0;
  votos.forEach(v => {
    if (v.candidatoId === 'blanco') { votos_blanco++; return; }
    conteo[v.candidatoId] = (conteo[v.candidatoId] || 0) + 1;
  });

  // Winner
  let ganador = null;
  let maxVotos = 0;
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
          <p>${ganador.partido || ''} · ${maxVotos} voto${maxVotos !== 1 ? 's' : ''} (${total > 0 ? Math.round((maxVotos/votaron)*100) : 0}%)</p>
        </div>
      </div>`;
  } else { winnerArea.innerHTML = ''; }

  // Barras
  const barras = document.getElementById('resultadosBarras');
  const allItems = [
    ...candidatos.map(c => ({ label: c.nombre, sub: c.partido, count: conteo[c.id] || 0 })),
    { label: 'Voto en blanco', sub: '', count: votos_blanco }
  ].sort((a,b) => b.count - a.count);

  barras.innerHTML = allItems.map(item => {
    const pct = votaron > 0 ? Math.round((item.count / votaron) * 100) : 0;
    return `
      <div class="result-bar-row">
        <div class="result-bar-name" title="${item.sub}">${item.label}</div>
        <div class="result-bar-track">
          <div class="result-bar-fill" style="width:${pct}%">${pct > 8 ? pct + '%' : ''}</div>
        </div>
        <div class="result-bar-count">${item.count}</div>
      </div>`;
  }).join('');
}

function imprimirResultados() {
  const padron = DB.getPadron();
  const votos = DB.getVotos();
  const candidatos = DB.getCandidatos();
  const config = DB.getConfig();

  const getNameById = id => {
    if (id === 'blanco') return 'VOTO EN BLANCO';
    const c = candidatos.find(x => x.id === id);
    return c ? c.nombre : 'Desconocido';
  };

  const fecha = new Date().toLocaleString('es-PY');
  const actaHTML = `
    <div style="font-family: Arial, sans-serif; padding: 1rem;">
      <h2 style="text-align:center; color:#1a3a6b;">ACTA DE VOTACIÓN</h2>
      <h3 style="text-align:center;">${config.titulo}</h3>
      <p style="text-align:center; color:#636e72;">Escuela de Ciencias Políticas y Sociales · UNA · ${fecha}</p>
      <hr style="margin:1rem 0;">
      <h4>Registro de Votos Emitidos:</h4>
      <table style="width:100%; border-collapse:collapse; margin-top:0.5rem;">
        <thead><tr style="background:#1a3a6b; color:white;">
          <th style="padding:8px; text-align:left;">#</th>
          <th style="padding:8px; text-align:left;">Cédula de Identidad</th>
          <th style="padding:8px; text-align:left;">Candidato</th>
          <th style="padding:8px; text-align:left;">Fecha/Hora</th>
        </tr></thead>
        <tbody>
          ${votos.map((v, i) => `
            <tr style="background:${i%2===0?'#f4f6fb':'white'}">
              <td style="padding:6px 8px;">${i+1}</td>
              <td style="padding:6px 8px; font-weight:600;">${v.ci}</td>
              <td style="padding:6px 8px;">${getNameById(v.candidatoId)}</td>
              <td style="padding:6px 8px; font-size:0.85rem;">${new Date(v.timestamp).toLocaleString('es-PY')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <hr style="margin:1rem 0;">
      <p><strong>Total votaron:</strong> ${votos.length} | <strong>Padrón habilitado:</strong> ${padron.filter(e=>e.habilitado).length}</p>
    </div>`;

  const printArea = document.getElementById('print-area');
  document.getElementById('actaContent').innerHTML = actaHTML;
  printArea.style.display = 'block';
  window.print();
  printArea.style.display = 'none';
}

function exportarCSV() {
  const votos = DB.getVotos();
  const candidatos = DB.getCandidatos();
  const getNameById = id => {
    if (id === 'blanco') return 'VOTO EN BLANCO';
    const c = candidatos.find(x => x.id === id);
    return c ? c.nombre : 'Desconocido';
  };
  const rows = ['CI,Candidato,Fecha'].concat(votos.map(v =>
    `${v.ci},${getNameById(v.candidatoId)},${new Date(v.timestamp).toLocaleString('es-PY')}`
  ));
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'acta_votacion_ecp.csv';
  a.click();
}

// Init
renderPadron();