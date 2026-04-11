document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token || usuario.rol !== 'Médico') { window.location.href = 'login.html'; return; }
    document.getElementById('userName').textContent = usuario.nombre;
    mostrarFecha();
    cargarPacientes();
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });
});

const API_URL = 'http://localhost:3000/api';

function mostrarFecha() {
    document.getElementById('fechaActual').textContent = new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

async function cargarPacientes() {
    const tbody = document.getElementById('pacientesBody');
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const medicoId = usuario.medico_id;
    if (!medicoId) { tbody.innerHTML = '<tr><td colspan="5">Sin médico asociado</td></tr>'; return; }
    try {
        const response = await fetch(`${API_URL}/medico/pacientes/${medicoId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const data = await response.json();
        if (data.data && data.data.length) {
            tbody.innerHTML = data.data.map(p => `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td>${p.documento}</td>
                    <td>${p.telefono}</td>
                    <td>${p.email || '-'}</td>
                    <<td style="display:flex; flex-direction:row; gap:4px; align-items:center;">
    <button class="action-btn" onclick="verHistoria(${p.id})" style="background:#3498db; font-size:0.8rem; padding:6px 10px;">
        <i class="fas fa-notes-medical"></i> Historia
    </button>
    <button class="action-btn" onclick="nuevaFormula(${p.id})" style="background:#27ae60; font-size:0.8rem; padding:6px 10px;">
        <i class="fas fa-prescription"></i> Fórmula
    </button>
    <button class="action-btn" onclick="nuevaIncapacidad(${p.id})" style="background:#e67e22; font-size:0.8rem; padding:6px 10px;">
        <i class="fas fa-file-medical"></i> Incapacidad
    </button>
</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5">No hay pacientes</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5">Error al cargar</td></tr>';
    }
}

window.verHistoria = (id) => window.location.href = `medico-historias.html?paciente=${id}`;
window.nuevaFormula = (id) => window.location.href = `medico-formulas.html?paciente=${id}`;
window.nuevaIncapacidad = (id) => window.location.href = `medico-incapacidades.html?paciente=${id}`;
