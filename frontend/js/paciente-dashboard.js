// ============================================
// PACIENTE DASHBOARD - HOGAR MÉDICO DEL VALLE
// VERSIÓN CORREGIDA CON RUTAS ESPECÍFICAS
// ============================================

if (typeof API_BASE_URL === 'undefined') {
    console.error('❌ config.js no cargado');
}

// Elementos del DOM
const totalCitasSpan = document.getElementById('totalCitas');
const totalHistoriasSpan = document.getElementById('totalHistorias');
const totalIncapacidadesSpan = document.getElementById('totalIncapacidades');
const totalFormulasSpan = document.getElementById('totalFormulas');
const proximasCitasBody = document.getElementById('proximasCitasBody');
const ultimasConsultasDiv = document.getElementById('ultimasConsultas');
const fechaActualSpan = document.getElementById('fechaActual');
const nombreUsuarioSpan = document.getElementById('userName');
const botonCerrarSesion = document.getElementById('logoutBtn');

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function obtenerToken() {
    return localStorage.getItem('token');
}

function obtenerUsuario() {
    return JSON.parse(localStorage.getItem('usuario') || '{}');
}

async function fetchConAutenticacion(url, opciones = {}) {
    const token = obtenerToken();
    if (!token) {
        window.location.href = 'login.html';
        throw new Error('No hay token');
    }

    const separador = url.includes('?') ? '&' : '?';
    const urlConCache = `${url}${separador}t=${Date.now()}`;

    console.log(`🌐 Fetch: ${urlConCache}`);

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

    if (!respuesta.ok) {
        const texto = await respuesta.text();
        console.error(`❌ Error ${respuesta.status} en ${url}:`, texto);
        throw new Error(`Error ${respuesta.status}: ${texto}`);
    }

    return respuesta;
}

// ============================================
// CARGAR DATOS DEL PACIENTE
// ============================================
async function cargarDatosPaciente() {
    const usuario = obtenerUsuario();
    const pacienteId = usuario.paciente_id;

    console.log('👤 Usuario:', usuario.nombre, '| paciente_id:', pacienteId);

    if (!pacienteId) {
        console.warn('⚠️ No se encontró paciente_id en el usuario');
        return;
    }

    try {
        // 1. Citas (usando ruta específica)
        const respCitas = await fetchConAutenticacion(`${API_BASE_URL}/citas/paciente/${pacienteId}`);
        const datosCitas = await respCitas.json();
        const todasLasCitas = datosCitas.data || [];
        console.log(`📅 ${todasLasCitas.length} citas cargadas`);

        const hoy = new Date().toISOString().split('T')[0];
        const proximas = todasLasCitas
            .filter(c => c.fecha >= hoy && c.estado !== 'Cancelada')
            .sort((a, b) => (a.fecha + ' ' + a.hora).localeCompare(b.fecha + ' ' + b.hora))
            .slice(0, 5);

        if (totalCitasSpan) totalCitasSpan.textContent = proximas.length;
        renderizarProximasCitas(proximas);

        // 2. Historias clínicas
        const respHistorias = await fetchConAutenticacion(`${API_BASE_URL}/historias/paciente/${pacienteId}`);
        const datosHistorias = await respHistorias.json();
        const historias = datosHistorias.data || [];
        console.log(`📚 ${historias.length} historias cargadas`);
        if (totalHistoriasSpan) totalHistoriasSpan.textContent = historias.length;
        renderizarUltimasConsultas(historias.slice(0, 3));

        // 3. Incapacidades (ruta específica)
        const respInc = await fetchConAutenticacion(`${API_BASE_URL}/incapacidades/paciente/${pacienteId}`);
        const datosInc = await respInc.json();
        const incapacidades = datosInc.data || [];
        console.log(`📋 ${incapacidades.length} incapacidades cargadas`);
        if (totalIncapacidadesSpan) totalIncapacidadesSpan.textContent = incapacidades.length;

        // 4. Fórmulas médicas
        const respForm = await fetchConAutenticacion(`${API_BASE_URL}/medico/formulas/${pacienteId}`);
        const datosForm = await respForm.json();
        const formulas = datosForm.data || [];
        console.log(`💊 ${formulas.length} fórmulas cargadas`);
        if (totalFormulasSpan) totalFormulasSpan.textContent = formulas.length;

    } catch (error) {
        console.error('❌ Error cargando datos:', error.message);
        if (proximasCitasBody) {
            proximasCitasBody.innerHTML = `<tr><td colspan="5" class="loading-msg">Error: ${error.message}</td></tr>`;
        }
    }
}

function renderizarProximasCitas(citas) {
    if (!proximasCitasBody) return;
    if (citas.length === 0) {
        proximasCitasBody.innerHTML = '<tr><td colspan="5" class="loading-msg">No hay citas próximas</td></tr>';
        return;
    }
    proximasCitasBody.innerHTML = citas.map(c => {
        const fecha = new Date(c.fecha).toLocaleDateString('es-ES');
        const hora = c.hora?.substring(0, 5) || '--:--';
        const estadoClass = (c.estado || '').toLowerCase().replace(' ', '-');
        return `<tr>
            <td>${fecha}</td>
            <td><strong>${hora}</strong></td>
            <td>${c.medico_nombre || '-'}</td>
            <td>${c.especialidad_nombre || 'General'}</td>
            <td><span class="badge badge-${estadoClass}">${c.estado || 'Programada'}</span></td>
        </tr>`;
    }).join('');
}

function renderizarUltimasConsultas(historias) {
    if (!ultimasConsultasDiv) return;
    if (historias.length === 0) {
        ultimasConsultasDiv.innerHTML = '<p class="loading-msg">No hay consultas registradas</p>';
        return;
    }
    ultimasConsultasDiv.innerHTML = historias.map(h => {
        const fecha = new Date(h.fecha).toLocaleDateString('es-ES');
        return `<div class="consulta-item">
            <div class="consulta-fecha"><i class="far fa-calendar-alt"></i> ${fecha}</div>
            <div class="consulta-medico"><i class="fas fa-user-md"></i> ${h.medico_nombre || '-'}</div>
            <div class="consulta-diagnostico">${h.diagnostico || '-'}</div>
        </div>`;
    }).join('');
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    const token = obtenerToken();
    const usuario = obtenerUsuario();

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const rol = (usuario.rol || '').trim().toLowerCase();
    if (rol !== 'paciente') {
        window.location.href = 'login.html';
        return;
    }

    if (nombreUsuarioSpan) nombreUsuarioSpan.textContent = usuario.nombre || 'Paciente';
    if (fechaActualSpan) {
        const hoy = new Date();
        fechaActualSpan.textContent = hoy.toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    if (botonCerrarSesion) {
        botonCerrarSesion.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    await cargarDatosPaciente();
});