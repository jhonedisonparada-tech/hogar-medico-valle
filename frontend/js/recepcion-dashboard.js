// ============================================
// RECEPCIÓN DASHBOARD - HOGAR MÉDICO DEL VALLE
// ============================================



// ============================================
// OBTENCIÓN SEGURA DE ELEMENTOS
// ============================================
function obtenerElemento(id) {
    const elemento = document.getElementById(id);
    if (!elemento) console.warn(`⚠️ Elemento con ID '${id}' no encontrado.`);
    return elemento;
}

const agendaCuerpo = obtenerElemento('agendaBody');
const proximasCuerpo = obtenerElemento('proximasBody');
const citasHoySpan = obtenerElemento('citasHoy');
const citasConfirmadasSpan = obtenerElemento('citasConfirmadas');
const citasPendientesSpan = obtenerElemento('citasPendientes');
const totalPacientesSpan = obtenerElemento('totalPacientes');
const fechaActualSpan = obtenerElemento('fechaActual');
const nombreUsuarioSpan = obtenerElemento('userName');
const botonCerrarSesion = obtenerElemento('logoutBtn');

let todasLasCitas = [];
let listaPacientes = [];

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function mostrarNotificacion(mensaje, tipo = 'exito') {
    const notificacion = document.createElement('div');
    notificacion.className = `toast toast-${tipo}`;
    notificacion.innerHTML = `<i class="fas fa-${tipo === 'exito' ? 'check-circle' : tipo === 'error' ? 'times-circle' : 'exclamation-circle'}"></i> ${mensaje}`;
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), 3000);
}

async function manejarRespuesta(respuesta) {
    if (respuesta.status === 401) {
        localStorage.clear();
        window.location.href = 'login.html';
        throw new Error('Sesión expirada');
    }
    return respuesta;
}

async function fetchConAutenticacion(url, opciones = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        throw new Error('No hay token');
    }

    const opcionesPorDefecto = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...opciones.headers
        }
    };

    const respuesta = await fetch(url, { ...opciones, ...opcionesPorDefecto });
    await manejarRespuesta(respuesta);
    return respuesta;
}

// ============================================
// CARGAR DATOS Y ACTUALIZAR CONTADORES
// ============================================
async function cargarDatos() {
    try {
        const hoy = new Date();
        if (fechaActualSpan) {
            fechaActualSpan.textContent = hoy.toLocaleDateString('es-ES', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }

        // Cargar citas
        const respuestaCitas = await fetchConAutenticacion(`${API_BASE_URL}/citas`);
        const datosCitas = await respuestaCitas.json();
        todasLasCitas = datosCitas.data || [];

        // Cargar pacientes
        const respuestaPacientes = await fetchConAutenticacion(`${API_BASE_URL}/pacientes`);
        const datosPacientes = await respuestaPacientes.json();
        listaPacientes = datosPacientes.data || [];
        if (totalPacientesSpan) totalPacientesSpan.textContent = listaPacientes.length;

        // Filtrar citas de hoy
        const hoyStr = hoy.toISOString().split('T')[0];
        const citasHoy = todasLasCitas.filter(c => c.fecha && c.fecha.split('T')[0] === hoyStr);

        // ✅ CONTADORES CORREGIDOS: Confirmadas y Pendientes de TODAS las citas
        const totalConfirmadas = todasLasCitas.filter(c => c.estado === 'Confirmada').length;
        const totalPendientes = todasLasCitas.filter(c =>
            (c.estado || '').toLowerCase() === 'pendiente' ||
            (c.estado || '').toLowerCase() === 'programada'
        ).length;

        // Actualizar contadores en el DOM
        if (citasHoySpan) citasHoySpan.innerText = citasHoy.length;
        if (citasConfirmadasSpan) citasConfirmadasSpan.innerText = totalConfirmadas;
        if (citasPendientesSpan) citasPendientesSpan.innerText = totalPendientes;

        // Renderizar tablas
        if (agendaCuerpo) renderizarAgenda(citasHoy);
        if (proximasCuerpo) {
            const proximas = todasLasCitas
                .filter(c => c.fecha && c.fecha.split('T')[0] > hoyStr && c.estado !== 'Cancelada')
                .sort((a, b) => (a.fecha + ' ' + a.hora).localeCompare(b.fecha + ' ' + b.hora))
                .slice(0, 10);
            renderizarProximas(proximas);
        }
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        if (error.message !== 'Sesión expirada') {
            mostrarNotificacion('Error al conectar con el servidor', 'error');
        }
    }
}

function renderizarAgenda(citas) {
    if (!agendaCuerpo) return;
    if (!citas.length) {
        agendaCuerpo.innerHTML = '<tr><td colspan="6" class="loading-msg">No hay citas para hoy</td></tr>';
        return;
    }
    const ordenadas = citas.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    agendaCuerpo.innerHTML = ordenadas.map(c => `
        <tr>
            <td><strong>${c.hora?.substring(0, 5) || '--:--'}</strong></td>
            <td>${c.paciente_nombre || '-'}</td>
            <td>${c.paciente_documento || '-'}</td>
            <td>${c.medico_nombre || '-'}</td>
            <td><span class="badge badge-${(c.estado || '').toLowerCase().replace(' ', '-')}">${c.estado || 'Programada'}</span></td>
            <td>
                ${(c.estado || '').toLowerCase().includes('pend') || c.estado === 'Programada' ?
                `<button class="btn-confirmar" onclick="confirmarCita(${c.id})">
                    <i class="fas fa-check"></i> Confirmar
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function renderizarProximas(citas) {
    if (!proximasCuerpo) return;
    if (!citas.length) {
        proximasCuerpo.innerHTML = '<tr><td colspan="6" class="loading-msg">No hay próximas citas</td></tr>';
        return;
    }
    proximasCuerpo.innerHTML = citas.map(c => `
        <tr>
            <td>${new Date(c.fecha).toLocaleDateString('es-ES')}</td>
            <td>${c.hora?.substring(0, 5) || '--:--'}</td>
            <td>${c.paciente_nombre || '-'}</td>
            <td>${c.medico_nombre || '-'}</td>
            <td><span class="badge badge-${(c.estado || '').toLowerCase().replace(' ', '-')}">${c.estado || 'Programada'}</span></td>
            <td>
                ${(c.estado || '').toLowerCase().includes('pend') || c.estado === 'Programada' ?
                `<button class="btn-confirmar" onclick="confirmarCita(${c.id})">
                    <i class="fas fa-check"></i> Confirmar
                </button>` : ''}
            </td>
        </tr>
    `).join('');
}

// ============================================
// CONFIRMAR CITA (PATCH)
// ============================================
window.confirmarCita = async function(id) {
    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/citas/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: 'Confirmada' })
        });
        const datos = await respuesta.json();
        if (datos.success) {
            mostrarNotificacion('Cita confirmada correctamente', 'exito');
            await cargarDatos();
        } else {
            mostrarNotificacion(datos.message || 'Error al confirmar cita', 'error');
        }
    } catch (error) {
        console.error('Error confirmando cita:', error);
        mostrarNotificacion('Error de conexión', 'error');
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const rolNormalizado = (usuario.rol || '').trim().toLowerCase();
    if (rolNormalizado !== 'recepcionista' && rolNormalizado !== 'admin') {
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

    await cargarDatos();
});