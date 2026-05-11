// ============================================
// DETALLE DEL PACIENTE - HOGAR MÉDICO DEL VALLE
// ============================================


// Obtener ID de la URL
const urlParams = new URLSearchParams(window.location.search);
const pacienteId = urlParams.get('id');
const modoEditar = urlParams.get('modo') === 'editar';

// Elementos del DOM
const nombrePacienteTitulo = document.getElementById('nombrePacienteTitulo');
const fechaActualSpan = document.getElementById('fechaActual');
const nombreUsuarioSpan = document.getElementById('userName');
const botonCerrarSesion = document.getElementById('logoutBtn');
const botonEditar = document.getElementById('botonEditar');
const botonGuardar = document.getElementById('botonGuardar');
const botonCancelar = document.getElementById('botonCancelar');
const formularioEdicion = document.getElementById('formularioEdicion');
const tarjetaDatos = document.getElementById('tarjetaDatosPersonales');

// Campos de visualización
const detDocumento = document.getElementById('detDocumento');
const detNombre = document.getElementById('detNombre');
const detTelefono = document.getElementById('detTelefono');
const detEmail = document.getElementById('detEmail');
const detFechaNacimiento = document.getElementById('detFechaNacimiento');
const detGenero = document.getElementById('detGenero');
const detDireccion = document.getElementById('detDireccion');

// Campos de edición
const editDocumento = document.getElementById('editDocumento');
const editNombre = document.getElementById('editNombre');
const editTelefono = document.getElementById('editTelefono');
const editEmail = document.getElementById('editEmail');
const editFechaNacimiento = document.getElementById('editFechaNacimiento');
const editGenero = document.getElementById('editGenero');
const editDireccion = document.getElementById('editDireccion');

// Tabla de citas
const citasPacienteBody = document.getElementById('citasPacienteBody');
const totalCitasPaciente = document.getElementById('totalCitasPaciente');

let pacienteActual = null;

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
// CARGAR DATOS DEL PACIENTE
// ============================================
async function cargarPaciente() {
    if (!pacienteId) {
        alert('ID de paciente no proporcionado');
        window.location.href = 'recepcion-pacientes.html';
        return;
    }

    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/pacientes/${pacienteId}`);
        const datos = await respuesta.json();

        if (datos.success) {
            pacienteActual = datos.data;
            mostrarDatosPaciente(pacienteActual);
            await cargarCitasPaciente();
        } else {
            alert('Paciente no encontrado');
            window.location.href = 'recepcion-pacientes.html';
        }
    } catch (error) {
        console.error('Error cargando paciente:', error);
        alert('Error al cargar los datos del paciente');
    }
}

function mostrarDatosPaciente(paciente) {
    nombrePacienteTitulo.textContent = paciente.nombre || 'Paciente';
    detDocumento.textContent = paciente.documento || '-';
    detNombre.textContent = paciente.nombre || '-';
    detTelefono.textContent = paciente.telefono || '-';
    detEmail.textContent = paciente.email || '-';
    detFechaNacimiento.textContent = paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento).toLocaleDateString('es-ES') : '-';
    detGenero.textContent = paciente.genero === 'F' ? 'Femenino' : (paciente.genero === 'M' ? 'Masculino' : 'Otro');
    detDireccion.textContent = paciente.direccion || '-';

    // Llenar campos de edición
    editDocumento.value = paciente.documento || '';
    editNombre.value = paciente.nombre || '';
    editTelefono.value = paciente.telefono || '';
    editEmail.value = paciente.email || '';
    editFechaNacimiento.value = paciente.fecha_nacimiento ? paciente.fecha_nacimiento.split('T')[0] : '';
    editGenero.value = paciente.genero || 'M';
    editDireccion.value = paciente.direccion || '';
}

// ============================================
// CARGAR CITAS DEL PACIENTE
// ============================================
async function cargarCitasPaciente() {
    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/citas?paciente_id=${pacienteId}`);
        const datos = await respuesta.json();
        const citas = datos.data || [];

        totalCitasPaciente.textContent = `${citas.length} cita${citas.length !== 1 ? 's' : ''}`;

        if (citas.length === 0) {
            citasPacienteBody.innerHTML = '<tr><td colspan="5" class="loading-msg">No hay citas registradas</td></tr>';
            return;
        }

        citasPacienteBody.innerHTML = citas.map(c => {
            const fecha = new Date(c.fecha).toLocaleDateString('es-ES');
            const hora = c.hora?.substring(0, 5) || '--:--';
            const estadoClass = (c.estado || '').toLowerCase().replace(' ', '-');
            return `
                <tr>
                    <td>${fecha}</td>
                    <td><strong>${hora}</strong></td>
                    <td>${c.medico_nombre || '-'}</td>
                    <td>${c.especialidad_nombre || 'General'}</td>
                    <td><span class="badge badge-${estadoClass}">${c.estado || 'Programada'}</span></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error cargando citas:', error);
        citasPacienteBody.innerHTML = '<tr><td colspan="5" class="loading-msg">Error al cargar citas</td></tr>';
    }
}

// ============================================
// MODO EDICIÓN
// ============================================
function activarModoEdicion() {
    // Ocultar visualización de datos (solo los spans)
    document.querySelectorAll('.info-item .info-value').forEach(el => el.style.display = 'none');
    // Mostrar formulario
    formularioEdicion.style.display = 'block';
    botonEditar.style.display = 'none';
    botonGuardar.style.display = 'inline-flex';
    botonCancelar.style.display = 'inline-flex';
}

function desactivarModoEdicion() {
    document.querySelectorAll('.info-item .info-value').forEach(el => el.style.display = 'block');
    formularioEdicion.style.display = 'none';
    botonEditar.style.display = 'inline-flex';
    botonGuardar.style.display = 'none';
    botonCancelar.style.display = 'none';
}

// ============================================
// GUARDAR CAMBIOS (PUT)
// ============================================
async function guardarCambios(evento) {
    evento.preventDefault();

    const datosActualizados = {
        nombre: editNombre.value.trim(),
        documento: editDocumento.value.trim(),
        telefono: editTelefono.value.trim() || null,
        email: editEmail.value.trim() || null,
        fecha_nacimiento: editFechaNacimiento.value || null,
        genero: editGenero.value,
        direccion: editDireccion.value.trim() || null,
        activo: pacienteActual.activo
    };

    try {
        const respuesta = await fetchConAutenticacion(`${API_BASE_URL}/pacientes/${pacienteId}`, {
            method: 'PUT',
            body: JSON.stringify(datosActualizados)
        });
        const datos = await respuesta.json();
        if (datos.success) {
            alert('Datos actualizados correctamente');
            desactivarModoEdicion();
            await cargarPaciente(); // Recargar datos
        } else {
            alert(datos.message || 'Error al actualizar');
        }
    } catch (error) {
        console.error('Error actualizando:', error);
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

    await cargarPaciente();

    // Eventos de edición
    botonEditar.addEventListener('click', activarModoEdicion);
    botonCancelar.addEventListener('click', desactivarModoEdicion);
    botonGuardar.addEventListener('click', guardarCambios);

    // Si viene con modo=editar, activar edición automáticamente
    if (modoEditar) {
        setTimeout(activarModoEdicion, 300);
    }
});