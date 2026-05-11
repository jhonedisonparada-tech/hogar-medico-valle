// ============================================
// RECEPCIÓN PACIENTES - HOGAR MÉDICO DEL VALLE
// ============================================

// Elementos del DOM
const pacientesBody = document.getElementById('pacientesBody');
const totalPacientesTabla = document.getElementById('totalPacientesTabla');
const fechaActualSpan = document.getElementById('fechaActual');
const nombreUsuarioSpan = document.getElementById('userName');
const botonCerrarSesion = document.getElementById('logoutBtn');
const botonNuevoPaciente = document.getElementById('nuevoPacienteBtn');
const modalPaciente = document.getElementById('modalNuevoPaciente');
const cerrarModalPaciente = document.getElementById('cerrarModalPaciente');
const cancelarModalPaciente = document.getElementById('cancelarModalPaciente');
const guardarPacienteBtn = document.getElementById('guardarPacienteBtn');
const formularioPaciente = document.getElementById('formNuevoPaciente');

// Campos del formulario
const tipoDocumento = document.getElementById('tipoDocumento');
const documentoPaciente = document.getElementById('documentoPaciente');
const nombresPaciente = document.getElementById('nombresPaciente');
const apellidosPaciente = document.getElementById('apellidosPaciente');
const telefonoPaciente = document.getElementById('telefonoPaciente');
const emailPaciente = document.getElementById('emailPaciente');
const fechaNacimientoPaciente = document.getElementById('fechaNacimientoPaciente');
const generoPaciente = document.getElementById('generoPaciente');
const direccionPaciente = document.getElementById('direccionPaciente');

let listaPacientes = [];

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
// CARGAR PACIENTES
// ============================================
async function cargarPacientes() {
    try {
        pacientesBody.innerHTML = '<tr><td colspan="5" class="loading-msg"><i class="fas fa-spinner fa-spin"></i> Cargando pacientes...</td></tr>';

        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/pacientes`);
        const datos = await respuesta.json();

        if (datos.success) {
            listaPacientes = datos.data || [];
            renderizarTabla(listaPacientes);
            if (totalPacientesTabla) {
                totalPacientesTabla.textContent = `${listaPacientes.length} paciente${listaPacientes.length !== 1 ? 's' : ''}`;
            }
        } else {
            throw new Error(datos.message || 'Error al obtener pacientes');
        }
    } catch (error) {
        console.error('Error cargando pacientes:', error);
        pacientesBody.innerHTML = '<tr><td colspan="5" class="loading-msg">Error al cargar pacientes. Intente recargar.</td></tr>';
    }
}

// ============================================
// RENDERIZAR TABLA CON BOTONES MEJORADOS
// ============================================
function renderizarTabla(pacientes) {
    if (!pacientesBody) return;

    if (!pacientes || pacientes.length === 0) {
        pacientesBody.innerHTML = '<tr><td colspan="5" class="loading-msg">No se encontraron pacientes</td></tr>';
        return;
    }

    pacientesBody.innerHTML = pacientes.map(p => {
        const nombreCompleto = `${p.nombre || ''}`;
        return `
            <tr>
                <td><span style="font-weight:500;">${p.documento || ''}</span></td>
                <td><strong>${nombreCompleto}</strong></td>
                <td>${p.telefono || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-accion-ver" onclick="verPaciente(${p.id})" title="Ver paciente">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <button class="btn-accion-editar" onclick="editarPaciente(${p.id})" title="Editar paciente">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// FUNCIONES GLOBALES PARA BOTONES
// ============================================
window.verPaciente = function(id) {
    window.location.href = `recepcion-paciente-detalle.html?id=${id}`;
};

window.editarPaciente = function(id) {
    window.location.href = `recepcion-paciente-detalle.html?id=${id}&modo=editar`;
};
// ============================================
// GUARDAR NUEVO PACIENTE (POST)
// ============================================
async function guardarNuevoPaciente(evento) {
    evento.preventDefault();

    const documento = documentoPaciente.value.trim();
    const nombres = nombresPaciente.value.trim();
    const apellidos = apellidosPaciente.value.trim();

    if (!documento || !nombres || !apellidos) {
        alert('Documento, nombres y apellidos son obligatorios');
        return;
    }

    const nombreCompleto = `${nombres} ${apellidos}`;

    const datosPaciente = {
        nombre: nombreCompleto,
        documento: documento,
        telefono: telefonoPaciente.value.trim() || null,
        email: emailPaciente.value.trim() || null,
        fecha_nacimiento: fechaNacimientoPaciente.value || null,
        genero: generoPaciente.value || 'M',
        direccion: direccionPaciente.value.trim() || null,
        activo: 1
    };

    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/pacientes`, {
            method: 'POST',
            body: JSON.stringify(datosPaciente)
        });
        const datos = await respuesta.json();
        if (datos.success) {
            alert('Paciente registrado exitosamente');
            modalPaciente.style.display = 'none';
            formularioPaciente.reset();
            await cargarPacientes();
        } else {
            alert(datos.message || 'Error al guardar paciente');
        }
    } catch (error) {
        console.error('Error guardando paciente:', error);
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

    await cargarPacientes();

    // Configurar modal de nuevo paciente
    if (botonNuevoPaciente) {
        botonNuevoPaciente.addEventListener('click', () => {
            modalPaciente.style.display = 'flex';
        });
    }

    if (cerrarModalPaciente) {
        cerrarModalPaciente.addEventListener('click', () => {
            modalPaciente.style.display = 'none';
            formularioPaciente.reset();
        });
    }

    if (cancelarModalPaciente) {
        cancelarModalPaciente.addEventListener('click', () => {
            modalPaciente.style.display = 'none';
            formularioPaciente.reset();
        });
    }

    if (guardarPacienteBtn) {
        guardarPacienteBtn.addEventListener('click', guardarNuevoPaciente);
    }

    window.addEventListener('click', (evento) => {
        if (evento.target === modalPaciente) {
            modalPaciente.style.display = 'none';
            formularioPaciente.reset();
        }
    });
});