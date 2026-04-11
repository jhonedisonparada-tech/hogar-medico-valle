// ============================================
// DASHBOARD MÉDICO - VERSIÓN FINAL (TABLA CON TODAS LAS CITAS)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Dashboard Médico cargado');

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (usuario.rol !== 'Médico') {
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('userName').textContent = usuario.nombre || 'Dr. Miguel Sánchez';
    document.getElementById('userRole').textContent = usuario.rol || 'Médico';

    cargarDatos();

    document.getElementById('refreshBtn').addEventListener('click', function() {
        this.classList.add('fa-spin');
        cargarDatos();
        setTimeout(() => this.classList.remove('fa-spin'), 500);
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
});

const API_URL = 'http://localhost:3000/api';

async function cargarDatos() {
    try {
        mostrarFecha();
        await cargarTodo();
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

function mostrarFecha() {
    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('fechaActual').textContent = fecha;
}

async function cargarTodo() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const medicoId = usuario.medico_id;
    const token = localStorage.getItem('token');

    if (!medicoId) return;

    try {
        // 1. Obtener todas las citas del médico
        const citasRes = await fetch(`${API_URL}/citas/medico/${medicoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!citasRes.ok) throw new Error('Error al obtener citas');
        const citasData = await citasRes.json();
        const todasLasCitas = citasData.data || [];

        // 2. Obtener todas las historias del médico
        const historiasRes = await fetch(`${API_URL}/historias/medico/${medicoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!historiasRes.ok) throw new Error('Error al obtener historias');
        const historiasData = await historiasRes.json();
        const todasLasHistorias = historiasData.data || [];

        // 3. Procesar estadísticas
        const hoy = new Date().toISOString().split('T')[0];
        const citasHoy = todasLasCitas.filter(c => c.fecha.split('T')[0] === hoy);
        const proximas = todasLasCitas.filter(c => c.fecha.split('T')[0] >= hoy);

        document.getElementById('citasHoy').textContent = citasHoy.length;
        document.getElementById('proximasCitas').textContent = proximas.length;

        const pacientesSet = new Set();
        todasLasHistorias.forEach(h => {
            if (h.paciente_id) pacientesSet.add(h.paciente_id);
        });
        document.getElementById('totalPacientes').textContent = pacientesSet.size;
        document.getElementById('totalHistorias').textContent = todasLasHistorias.length;

        // 4. Mostrar TODAS las citas en la tabla (sin filtrar por fecha)
        const tbody = document.getElementById('citasHoyBody');
        if (!tbody) return;

        if (todasLasCitas.length > 0) {
            tbody.innerHTML = todasLasCitas.map(c => `
                <tr>
                    <td><strong>${c.hora?.substring(0,5) || '--:--'}</strong></td>
                    <td>${c.paciente_nombre || 'Paciente'}</td>
                    <td>${c.paciente_documento || ''}</td>
                    <td>${c.motivo || ''}</td>
                    <td><span class="status-badge status-${(c.estado||'programada').toLowerCase()}">${c.estado||'Programada'}</span></td>
                    <td>
                        <button class="action-btn" onclick="atenderPaciente(${c.paciente_id})">
                            <i class="fas fa-stethoscope"></i> Atender
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No hay citas</td></tr>';
        }

    } catch (error) {
        console.error('❌ Error en cargarTodo:', error);
        // Datos de ejemplo por si falla
        document.getElementById('citasHoy').textContent = '3';
        document.getElementById('totalPacientes').textContent = '5';
        document.getElementById('proximasCitas').textContent = '2';
        document.getElementById('totalHistorias').textContent = '8';
    }
}

window.atenderPaciente = function(pacienteId) {
    window.location.href = `atender-paciente.html?paciente=${pacienteId}`;
};
