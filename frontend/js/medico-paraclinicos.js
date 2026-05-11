document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token || usuario.rol !== 'Médico') { window.location.href = 'login.html'; return; }

    document.getElementById('userName').textContent = usuario.nombre;
    mostrarFecha();

    document.getElementById('btnBuscar').addEventListener('click', buscarPaciente);
    document.getElementById('buscarDocumento').addEventListener('keypress', e => { if(e.key==='Enter') buscarPaciente(); });
    document.getElementById('nuevoParaclinicoBtn').addEventListener('click', abrirModal);
    document.getElementById('closeModal').addEventListener('click', cerrarModal);
    document.getElementById('cancelarModal').addEventListener('click', cerrarModal);
    document.getElementById('guardarParaclinico').addEventListener('click', guardarOrden);
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href='login.html'; });
});

;
let pacienteActual = null;

function mostrarFecha() {
    document.getElementById('fechaActual').textContent = new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

async function buscarPaciente() {
    const doc = document.getElementById('buscarDocumento').value.trim();
    if (!doc) { alert('Ingrese documento'); return; }
    const resultados = document.getElementById('resultadosBusqueda');
    resultados.style.display = 'block';
    resultados.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
    try {
        const response = await fetch(`${API_BASE_URL}/pacientes`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (response.status === 401) {
            resultados.innerHTML = '<div class="paciente-resultado">Sesión expirada. Inicie sesión de nuevo.</div>';
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
            return;
        }
        if (!response.ok) {
            resultados.innerHTML = '<div class="paciente-resultado">Error al buscar pacientes</div>';
            return;
        }
        const data = await response.json();
        if (data.data) {
            const pacientes = data.data.filter(p => p.documento.includes(doc));
            if (pacientes.length) {
                resultados.innerHTML = pacientes.map(p => `
                    <div class="paciente-resultado">
                        <div><h4>${p.nombre}</h4><p>${p.documento}</p></div>
                        <button class="btn-seleccionar" onclick="seleccionarPaciente(${p.id},'${p.nombre}','${p.documento}')">Seleccionar</button>
                    </div>
                `).join('');
            } else {
                resultados.innerHTML = '<div class="paciente-resultado">No se encontraron resultados</div>';
            }
        } else {
            resultados.innerHTML = '<div class="paciente-resultado">No se encontraron resultados</div>';
        }
    } catch (error) {
        resultados.innerHTML = '<div class="paciente-resultado">Error de conexión. Intente nuevamente.</div>';
    }
}

window.seleccionarPaciente = function(id, nombre, doc) {
    pacienteActual = { id, nombre, documento: doc };
    document.getElementById('pacienteNombreSeleccionado').textContent = nombre;
    document.getElementById('paraclinicosContainer').style.display = 'block';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    cargarOrdenes(id);
};

async function cargarOrdenes(pacienteId) {
    const tbody = document.getElementById('paraclinicosBody');
    try {
        const response = await fetch(`${API_BASE_URL}/ordenamientos/paciente/${pacienteId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        const data = await response.json();
        if (data.data && data.data.length) {
            tbody.innerHTML = data.data.map(o => `
                <tr>
                    <td>${new Date(o.fecha).toLocaleDateString()}</td>
                    <td>${o.descripcion}</td>
                    <td>${o.observaciones || ''}</td>
                    <td><span class="status-badge status-pendiente">Pendiente</span></td>
                    <td>—</td>
                    <td><button class="action-btn" onclick="verOrden(${o.id})"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6">No hay órdenes</td></tr>';
        }
    } catch (error) { tbody.innerHTML = '<tr><td colspan="6">Error</td></tr>'; }
}

function abrirModal() {
    if (!pacienteActual) { alert('Seleccione un paciente'); return; }
    document.getElementById('pacienteNombreModal').value = pacienteActual.nombre;
    document.getElementById('pacienteDocumentoModal').value = pacienteActual.documento;
    document.getElementById('paraclinicoModal').classList.add('show');
}

function cerrarModal() {
    document.getElementById('paraclinicoModal').classList.remove('show');
    document.getElementById('paraclinicoForm').reset();
}

async function guardarOrden() {
    if (!pacienteActual) { alert('Seleccione un paciente'); return; }
    const examen = document.getElementById('examen').value;
    const indicaciones = document.getElementById('indicaciones').value;
    if (!examen) { alert('Ingrese el examen'); return; }
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (!usuario.medico_id) { alert('Usuario no tiene médico asignado'); return; }
    const orden = {
        paciente_id: pacienteActual.id,
        medico_id: usuario.medico_id,
        descripcion: examen,
        observaciones: indicaciones,
        fecha: new Date().toISOString().split('T')[0]
    };
    try {
        const response = await fetch(`${API_BASE_URL}/ordenamientos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(orden)
        });
        const data = await response.json();
        if (data.success) {
            alert('Orden guardada');
            cerrarModal();
            cargarOrdenes(pacienteActual.id);
        } else {
            alert('Error al guardar: ' + (data.message || 'Desconocido'));
        }
    } catch (error) { alert('Error de conexión'); }
}

window.verOrden = function(id) { alert('Ver orden ' + id); };
