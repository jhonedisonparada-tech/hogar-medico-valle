// ============================================
// RECEPCIÓN CITAS - HOGAR MÉDICO DEL VALLE
// ============================================

// Elementos del DOM
const citasCuerpo = document.getElementById('citasBody');
const totalCitasSpan = document.getElementById('totalCitas');
const citasHoySpan = document.getElementById('citasHoy');
const citasConfirmadasSpan = document.getElementById('citasConfirmadas');
const citasPendientesSpan = document.getElementById('citasPendientes');
const totalPacientesSpan = document.getElementById('totalPacientes');
const fechaActualSpan = document.getElementById('fechaActual');
const nombreUsuarioSpan = document.getElementById('userName');
const botonCerrarSesion = document.getElementById('logoutBtn');
const botonNuevaCita = document.getElementById('nuevaCitaBtn');
const modal = document.getElementById('modalNuevaCita');
const botonCerrarModal = document.getElementById('cerrarModal');
const botonCancelarModal = document.getElementById('cancelarModal');
const botonGuardarCita = document.getElementById('guardarCita');
const formularioCita = document.getElementById('formNuevaCita');
const selectPaciente = document.getElementById('pacienteId');
const selectMedico = document.getElementById('medicoId');
const inputFecha = document.getElementById('fechaCita');
const selectHora = document.getElementById('selectHora');
const inputMotivo = document.getElementById('motivoCita');

let todasLasCitas = [];
let listaPacientes = [];
let listaMedicos = [];

// ============================================
// FUNCIONES FETCH CON TOKEN Y CACHE BUSTER
// ============================================
function obtenerToken() {
    return localStorage.getItem('token');
}

async function fetchConAutenticacion(url, opciones = {}) {
    const token = obtenerToken();
    if (!token) {
        window.location.href = 'login.html';
        throw new Error('No hay token');
    }

    const separador = url.includes('?') ? '&' : '?';
    const urlConCache = `${url}${separador}_=${Date.now()}`;

    const respuesta = await fetch(urlConCache, {
        ...opciones,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...opciones.headers
        }
    });

    if (respuesta.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Sesión expirada');
    }
    return respuesta;
}

// ============================================
// CARGAR DATOS INICIALES
// ============================================
async function cargarPacientes() {
    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/pacientes`);
        const datos = await respuesta.json();
        listaPacientes = datos.data || [];
        if (selectPaciente) {
            selectPaciente.innerHTML = '<option value="">Seleccione un paciente</option>';
            listaPacientes.forEach(p => {
                selectPaciente.innerHTML += `<option value="${p.id}">${p.nombre} - ${p.documento}</option>`;
            });
        }
        if (totalPacientesSpan) totalPacientesSpan.textContent = listaPacientes.length;
    } catch (error) {
        console.error('Error cargando pacientes:', error);
    }
}

async function cargarMedicos() {
    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/medicos`);
        const datos = await respuesta.json();
        listaMedicos = datos.data || [];
        if (selectMedico) {
            selectMedico.innerHTML = '<option value="">Seleccione un médico</option>';
            listaMedicos.forEach(m => {
                const especialidad = m.especialidad_nombre || 'General';
                selectMedico.innerHTML += `<option value="${m.id}">${m.nombre} (${especialidad})</option>`;
            });
        }
    } catch (error) {
        console.error('Error cargando médicos:', error);
    }
}

async function cargarCitas() {
    try {
        const hoy = new Date();
        if (fechaActualSpan) {
            fechaActualSpan.textContent = hoy.toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/citas`);
        const datos = await respuesta.json();
        todasLasCitas = datos.data || [];

        // Calcular contadores
        const hoyStr = hoy.toISOString().split('T')[0];
        const citasHoy = todasLasCitas.filter(c => c.fecha && c.fecha.split('T')[0] === hoyStr);

        const totalConfirmadas = todasLasCitas.filter(c => c.estado === 'Confirmada').length;
        const totalPendientes = todasLasCitas.filter(c =>
            (c.estado || '').toLowerCase() === 'pendiente' ||
            (c.estado || '').toLowerCase() === 'programada'
        ).length;
        const totalCitas = todasLasCitas.length;

        // Actualizar elementos del DOM
        if (citasHoySpan) citasHoySpan.textContent = citasHoy.length;
        if (citasConfirmadasSpan) citasConfirmadasSpan.textContent = totalConfirmadas;
        if (citasPendientesSpan) citasPendientesSpan.textContent = totalPendientes;
        if (totalCitasSpan) totalCitasSpan.textContent = `${totalCitas} citas`;

        renderizarTabla(todasLasCitas);
    } catch (error) {
        console.error('Error cargando citas:', error);
        if (citasCuerpo) citasCuerpo.innerHTML = '<tr><td colspan="7" class="loading-msg">Error al cargar citas</td></tr>';
    }
}

// ============================================
// RENDERIZAR TABLA CON BADGES DE COLOR
// ============================================
function obtenerClaseBadge(estado) {
    const estadoMinuscula = (estado || '').toLowerCase();
    if (estadoMinuscula === 'confirmada') return 'badge-confirmada';
    if (estadoMinuscula === 'pendiente' || estadoMinuscula === 'programada') return 'badge-pendiente';
    if (estadoMinuscula === 'completada') return 'badge-completada';
    if (estadoMinuscula === 'cancelada') return 'badge-cancelada';
    return 'badge-programada';
}

function renderizarTabla(citas) {
    if (!citasCuerpo) return;
    if (!citas.length) {
        citasCuerpo.innerHTML = '<tr><td colspan="7" class="loading-msg">No hay citas registradas</td></tr>';
        return;
    }

    const ordenadas = citas.sort((a, b) => {
        const fechaA = new Date(a.fecha + 'T' + (a.hora || '00:00'));
        const fechaB = new Date(b.fecha + 'T' + (b.hora || '00:00'));
        return fechaB - fechaA;
    });

    citasCuerpo.innerHTML = ordenadas.map(c => {
        const claseBadge = obtenerClaseBadge(c.estado);
        const estadoTexto = c.estado || 'Programada';
        const esPendiente = (c.estado || '').toLowerCase() === 'pendiente' ||
                           (c.estado || '').toLowerCase() === 'programada';
        return `
            <tr>
                <td>${new Date(c.fecha).toLocaleDateString('es-ES')}</td>
                <td>${c.hora?.substring(0, 5) || '--:--'}</td>
                <td>${c.paciente_nombre || '-'}</td>
                <td>${c.medico_nombre || '-'}</td>
                <td>${c.especialidad_nombre || 'General'}</td>
                <td><span class="badge ${claseBadge}">${estadoTexto}</span></td>
                <td>
                    ${esPendiente ?
                    `<button class="btn-confirmar" onclick="confirmarCita(${c.id})">
                        <i class="fas fa-check"></i> Confirmar
                    </button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// CONFIRMAR CITA (PATCH)
// ============================================
window.confirmarCita = async function(id) {
    if (!confirm('¿Confirmar esta cita?')) return;

    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/citas/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: 'Confirmada' })
        });
        const datos = await respuesta.json();
        if (datos.success) {
            alert('Cita confirmada correctamente');
            await cargarCitas();
        } else {
            alert(datos.message || 'Error al confirmar');
        }
    } catch (error) {
        console.error('Error confirmando cita:', error);
        alert('Error de conexión');
    }
};

// ============================================
// GUARDAR NUEVA CITA (POST)
// ============================================
async function guardarNuevaCita(evento) {
    evento.preventDefault();

    const pacienteId = selectPaciente.value;
    const medicoId = selectMedico.value;
    const fecha = inputFecha.value;
    const hora = selectHora.value;
    const motivo = inputMotivo.value;

    if (!pacienteId || !medicoId || !fecha || !hora) {
        alert('Complete todos los campos obligatorios');
        return;
    }

    const datosCita = {
        paciente_id: parseInt(pacienteId),
        medico_id: parseInt(medicoId),
        fecha: fecha,
        hora: hora,
        motivo: motivo,
        estado: 'Programada'
    };

    try {
        const respuesta = await fetchConAutenticacion(`${API_URL}/citas`, {
            method: 'POST',
            body: JSON.stringify(datosCita)
        });
        const datos = await respuesta.json();
        if (datos.success) {
            alert('Cita agendada exitosamente');
            modal.style.display = 'none';
            formularioCita.reset();
            await cargarCitas();
        } else {
            alert(datos.message || 'Error al guardar');
        }
    } catch (error) {
        console.error('Error guardando cita:', error);
        alert('Error de conexión');
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const token = obtenerToken();
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const rol = (usuario.rol || '').trim().toLowerCase();
    if (rol !== 'recepcionista' && rol !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    if (nombreUsuarioSpan) nombreUsuarioSpan.textContent = usuario.nombre || 'Recepcionista';
    if (botonCerrarSesion) {
        botonCerrarSesion.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    await cargarPacientes();
    await cargarMedicos();
    await cargarCitas();

    // Configurar modal
    if (botonNuevaCita) {
        botonNuevaCita.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    if (botonCerrarModal) {
        botonCerrarModal.addEventListener('click', () => {
            modal.style.display = 'none';
            formularioCita.reset();
        });
    }

    if (botonCancelarModal) {
        botonCancelarModal.addEventListener('click', () => {
            modal.style.display = 'none';
            formularioCita.reset();
        });
    }

    if (botonGuardarCita) {
        botonGuardarCita.addEventListener('click', guardarNuevaCita);
    }

    window.addEventListener('click', (evento) => {
        if (evento.target === modal) {
            modal.style.display = 'none';
            formularioCita.reset();
        }
    });
});