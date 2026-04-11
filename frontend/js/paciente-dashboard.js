const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token || usuario.rol !== 'Paciente') {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('userName').textContent = usuario.nombre || 'Paciente';
    document.getElementById('fechaActual').textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    cargarDatos(usuario);
});

async function cargarDatos(usuario) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        // Buscar paciente por email
        const resPacientes = await fetch(`${API_URL}/pacientes`, { headers });
        const dataPacientes = await resPacientes.json();
        const paciente = dataPacientes.data?.find(p => p.email === usuario.email);
        if (!paciente) return;

        const pacienteId = paciente.id;

        // Cargar citas
        const resCitas = await fetch(`${API_URL}/citas/paciente/${pacienteId}`, { headers });
        const dataCitas = await resCitas.json();
        const hoy = new Date().toISOString().split('T')[0];
        const proximas = (dataCitas.data || []).filter(c => c.fecha >= hoy && c.estado !== 'Cancelada');
        document.getElementById('totalCitas').textContent = proximas.length;
        renderProximasCitas(proximas.slice(0, 5));

        // Cargar historias
        const resHistorias = await fetch(`${API_URL}/historias/paciente/${pacienteId}`, { headers });
        const dataHistorias = await resHistorias.json();
        const historias = dataHistorias.data || [];
        document.getElementById('totalHistorias').textContent = historias.length;
        renderUltimasConsultas(historias.slice(0, 3));

        // Cargar incapacidades
        const resInc = await fetch(`${API_URL}/incapacidades/paciente/${pacienteId}`, { headers });
        const dataInc = await resInc.json();
        document.getElementById('totalIncapacidades').textContent = (dataInc.data || []).length;

    } catch (error) {
        console.error('Error cargando datos:', error);
    }
}

function renderProximasCitas(citas) {
    const tbody = document.getElementById('proximasCitasBody');
    if (!citas.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-msg">No hay citas próximas</td></tr>';
        return;
    }
    tbody.innerHTML = citas.map(c => `
        <tr>
            <td>${new Date(c.fecha).toLocaleDateString('es-ES')}</td>
            <td><strong>${c.hora?.substring(0,5)}</strong></td>
            <td>${c.medico_nombre || '-'}</td>
            <td>${c.especialidad_nombre || '-'}</td>
            <td><span class="badge badge-${(c.estado||'').toLowerCase()}">${c.estado}</span></td>
        </tr>
    `).join('');
}

function renderUltimasConsultas(historias) {
    const div = document.getElementById('ultimasConsultas');
    if (!historias.length) {
        div.innerHTML = '<p class="loading-msg">No hay consultas registradas</p>';
        return;
    }
    div.innerHTML = historias.map(h => `
        <div class="consulta-item">
            <div class="consulta-fecha"><i class="far fa-calendar-alt"></i> ${new Date(h.fecha).toLocaleDateString('es-ES')}</div>
            <div class="consulta-medico"><i class="fas fa-user-md"></i> ${h.medico_nombre || '-'}</div>
            <div class="consulta-diagnostico">${h.diagnostico || '-'}</div>
        </div>
    `).join('');
}