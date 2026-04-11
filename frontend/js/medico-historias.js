// ============================================
// HISTORIA CLÍNICA COMPLETA - MÓDULO MÉDICO
// ============================================

console.log('✅ JS de historia clínica cargado');

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token || usuario.rol !== 'Médico') {
        window.location.href = 'login.html';
        return;
    }
    document.getElementById('userName').textContent = usuario.nombre || 'Dr. Miguel Sánchez';
    mostrarFecha();

    document.getElementById('btnBuscar').addEventListener('click', buscarPaciente);
    document.getElementById('buscarDocumento').addEventListener('keypress', e => { if (e.key === 'Enter') buscarPaciente(); });
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });
});

const API_URL = 'http://localhost:3000/api';
let pacienteActual = null;

function mostrarFecha() {
    document.getElementById('fechaActual').textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// ==================== BUSCADOR ====================
async function buscarPaciente() {
    const doc = document.getElementById('buscarDocumento').value.trim();
    if (!doc) { alert('Ingrese un número de documento'); return; }
    const resultadosDiv = document.getElementById('resultadosBusqueda');
    resultadosDiv.style.display = 'block';
    resultadosDiv.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
    try {
        const response = await fetch(`${API_URL}/pacientes`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.data) {
            const pacientes = data.data.filter(p => p.documento && p.documento.includes(doc));
            if (pacientes.length) {
                resultadosDiv.innerHTML = pacientes.map(p => `
                    <div class="paciente-resultado">
                        <div><h4>${p.nombre}</h4><p><i class="fas fa-id-card"></i> ${p.documento}</p></div>
                        <button class="btn-seleccionar" onclick="seleccionarPaciente(${p.id})">Ver Historia</button>
                    </div>
                `).join('');
            } else {
                resultadosDiv.innerHTML = '<div class="loading-message">No se encontraron pacientes</div>';
            }
        }
    } catch (error) {
        console.error(error);
        resultadosDiv.innerHTML = '<div class="loading-message">Error al buscar</div>';
    }
}

// ==================== SELECCIONAR PACIENTE ====================
window.seleccionarPaciente = async function(pacienteId) {
    pacienteActual = pacienteId;
    try {
        const response = await fetch(`${API_URL}/pacientes/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.success) {
            const p = data.data;
            document.getElementById('pacienteNombre').textContent = p.nombre;
            document.getElementById('pacienteDocumento').textContent = p.documento;
            document.getElementById('pacienteEdad').textContent = p.fecha_nacimiento ? calcularEdad(p.fecha_nacimiento) : '-';
            document.getElementById('pacienteGenero').textContent = p.genero === 'F' ? 'Femenino' : 'Masculino';
            document.getElementById('pacienteTelefono').textContent = p.telefono;
            document.getElementById('pacienteEmail').textContent = p.email || '-';
            document.getElementById('infoPaciente').style.display = 'block';
            document.getElementById('seccionesContainer').style.display = 'block';
            document.getElementById('resultadosBusqueda').style.display = 'none';
            await Promise.all([
                cargarConsultas(pacienteId),
                cargarParaclinicos(pacienteId),
                cargarMedicamentos(pacienteId),
                cargarIncapacidades(pacienteId)
            ]);
        }
    } catch (error) {
        console.error(error);
        alert('Error al cargar paciente');
    }
};

function calcularEdad(fechaNac) {
    if (!fechaNac) return '-';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad + ' años';
}

// ==================== CARGAR CONSULTAS ====================
async function cargarConsultas(pacienteId) {
    const timeline = document.getElementById('consultasTimeline');
    try {
        const response = await fetch(`${API_URL}/historias/paciente/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.data && data.data.length) {
            timeline.innerHTML = data.data.map(h => `
                <div class="timeline-item">
                    <div class="timeline-date"><i class="far fa-calendar-alt"></i> ${new Date(h.fecha).toLocaleDateString()}</div>
                    <div class="timeline-doctor"><i class="fas fa-user-md"></i> ${h.medico_nombre}</div>
                    <div class="timeline-content">
                        <p><strong>Motivo:</strong> ${h.motivo_consulta}</p>
                        <p><strong>Diagnóstico:</strong> ${h.diagnostico}</p>
                    </div>
                </div>
            `).join('');
        } else {
            timeline.innerHTML = '<div class="timeline-item">No hay consultas</div>';
        }
    } catch (error) {
        console.error(error);
        timeline.innerHTML = '<div class="timeline-item">Error al cargar</div>';
    }
}

// ==================== PARACLÍNICOS ====================
async function cargarParaclinicos(pacienteId) {
    const tbody = document.getElementById('paraclinicosBody');
    try {
        // Suponiendo que tienes un endpoint /api/ordenamientos/paciente/:id
        const response = await fetch(`${API_URL}/ordenamientos/paciente/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.data && data.data.length) {
            tbody.innerHTML = data.data.map(o => `
                <tr>
                    <td>${new Date(o.fecha).toLocaleDateString()}</td>
                    <td>${o.descripcion}</td>
                    <td>${o.observaciones || '-'}</td>
                    <td><span class="badge-estado badge-pendiente">Pendiente</span></td>
                    <td>-</td>
                    <td><button class="btn-accion" onclick="verOrden(${o.id})"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No hay órdenes</td></tr>';
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading-message">Error al cargar</td></tr>';
    }
}

// ==================== MEDICAMENTOS (desde fórmulas) ====================
async function cargarMedicamentos(pacienteId) {
    const tbody = document.getElementById('medicamentosBody');
    try {
        const response = await fetch(`${API_URL}/medico/formulas/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.data && data.data.length) {
            let allMeds = [];
            data.data.forEach(f => {
                const meds = JSON.parse(f.medicamentos || '[]');
                meds.forEach(m => allMeds.push({ fecha: f.fecha, ...m }));
            });
            tbody.innerHTML = allMeds.map(m => `
                <tr>
                    <td>${new Date(m.fecha).toLocaleDateString()}</td>
                    <td><strong>${m.nombre}</strong></td>
                    <td>${m.dosis}</td>
                    <td>${m.frecuencia}</td>
                    <td>${m.duracion || '-'}</td>
                    <td><button class="btn-accion" onclick="imprimirReceta(${m.id})"><i class="fas fa-print"></i></button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No hay medicamentos</td></tr>';
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading-message">Error al cargar</td></tr>';
    }
}

// ==================== INCAPACIDADES ====================
async function cargarIncapacidades(pacienteId) {
    const tbody = document.getElementById('incapacidadesBody');
    try {
        const response = await fetch(`${API_URL}/incapacidades/paciente/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        if (data.data && data.data.length) {
            tbody.innerHTML = data.data.map(i => `
                <tr>
                    <td>${new Date(i.fecha).toLocaleDateString()}</td>
                    <td>${i.diagnostico}</td>
                    <td>${i.dias_incapacidad} días</td>
                    <td>${new Date(i.fecha_inicio).toLocaleDateString()}</td>
                    <td>${new Date(i.fecha_fin).toLocaleDateString()}</td>
                    <td><button class="btn-accion" onclick="imprimirIncapacidad(${i.id})"><i class="fas fa-print"></i></button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="loading-message">No hay incapacidades</td></tr>';
        }
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading-message">Error al cargar</td></tr>';
    }
}

// ==================== ACCIONES DE BOTONES ====================
window.nuevaConsulta = function() {
    if (pacienteActual) window.location.href = `atender-paciente.html?paciente=${pacienteActual}`;
    else alert('Seleccione un paciente');
};

window.nuevoParaclinico = function() {
    if (pacienteActual) window.location.href = `nueva-orden-paraclinico.html?paciente=${pacienteActual}`;
    else alert('Seleccione un paciente');
};

window.nuevoMedicamento = function() {
    if (pacienteActual) window.location.href = `medico-formulas.html?paciente=${pacienteActual}`;
    else alert('Seleccione un paciente');
};

window.nuevaIncapacidad = function() {
    if (pacienteActual) window.location.href = `medico-incapacidades.html?paciente=${pacienteActual}`;
    else alert('Seleccione un paciente');
};

// Funciones de ejemplo para ver/ imprimir (puedes implementarlas después)
window.verOrden = function(id) { alert('Ver orden ' + id); };
window.imprimirReceta = function(id) { alert('Imprimir receta ' + id); };
window.imprimirIncapacidad = function(id) { alert('Imprimir incapacidad ' + id); };
