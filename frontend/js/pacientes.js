// ============================================
// PACIENTES - HOGAR MÉDICO DEL VALLE
// CONECTADO A API REAL
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Pacientes.js cargado correctamente');
    
    // Elementos del DOM
    const tablaBody = document.getElementById('pacientesTableBody');
    const fechaSpan = document.getElementById('fechaActual');
    const buscarInput = document.getElementById('buscarPaciente');
    const filtroEstado = document.getElementById('filtroEstado');
    const limpiarBtn = document.getElementById('limpiarFiltros');
    const nuevoBtn = document.getElementById('nuevoPacienteBtn');
    const modal = document.getElementById('pacienteModal');
    const closeModal = document.getElementById('closeModal');
    const cancelarBtn = document.getElementById('cancelarModal');
    const guardarBtn = document.getElementById('guardarPaciente');
    const modalTitle = document.getElementById('modalTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const totalSpan = document.getElementById('totalPacientes');
    const userNameSpan = document.getElementById('userName');
    const userRoleSpan = document.getElementById('userRole');

    // Configuración de la API
    const API_BASE_URL = 'http://localhost:5000/api';

    // Verificar sesión
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Cargar datos del usuario
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            if (userNameSpan) userNameSpan.textContent = usuario.nombre || 'Dr. Juan Pérez';
            if (userRoleSpan) userRoleSpan.textContent = usuario.rol || 'Administrador';
        } catch (e) {
            console.error('Error parsing usuario:', e);
        }
    }

    // Variables globales
    let pacientes = [];
    let pacientesFiltrados = [];

    // Inicializar
    mostrarFecha();
    cargarPacientes();
    setupEventListeners();

    function setupEventListeners() {
        if (buscarInput) buscarInput.addEventListener('input', filtrarPacientes);
        if (filtroEstado) filtroEstado.addEventListener('change', filtrarPacientes);
        if (limpiarBtn) limpiarBtn.addEventListener('click', limpiarFiltros);
        if (nuevoBtn) nuevoBtn.addEventListener('click', () => abrirModal());
        if (closeModal) closeModal.addEventListener('click', cerrarModal);
        if (cancelarBtn) cancelarBtn.addEventListener('click', cerrarModal);
        if (guardarBtn) guardarBtn.addEventListener('click', guardarPaciente);
        if (logoutBtn) logoutBtn.addEventListener('click', cerrarSesion);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('show')) {
                cerrarModal();
            }
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cerrarModal();
            });
        }
    }

    function mostrarFecha() {
        if (!fechaSpan) return;
        const fecha = new Date();
        const opciones = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
        fechaSpan.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    }

    async function cargarPacientes() {
        try {
            if (tablaBody) {
                tablaBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="loading-message">
                            <i class="fas fa-spinner fa-spin"></i>
                            Cargando pacientes...
                        </td>
                    </tr>
                `;
            }

            const response = await fetch(`${API_BASE_URL}/pacientes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                pacientes = data.data || [];
                pacientesFiltrados = [...pacientes];
                renderizarTabla();
            } else {
                throw new Error(data.message || 'Error al cargar pacientes');
            }
            
        } catch (error) {
            console.error('Error cargando pacientes:', error);
            if (tablaBody) {
                tablaBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="loading-message">
                            <i class="fas fa-exclamation-circle"></i>
                            Error al cargar los pacientes: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    function renderizarTabla() {
        if (!tablaBody) return;
        
        if (!pacientesFiltrados || pacientesFiltrados.length === 0) {
            tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-message">
                        <i class="fas fa-info-circle"></i>
                        No se encontraron pacientes
                    </td>
                </tr>
            `;
            if (totalSpan) totalSpan.textContent = '0 pacientes';
            return;
        }

        tablaBody.innerHTML = pacientesFiltrados.map(p => {
            const fechaNac = p.fecha_nacimiento 
                ? new Date(p.fecha_nacimiento).toLocaleDateString('es-ES') 
                : 'No registrada';
            
            const estado = p.activo === 1 ? 'activo' : 'inactivo';
            const estadoTexto = p.activo === 1 ? 'Activo' : 'Inactivo';
            
            return `
                <tr>
                    <td><strong>CC</strong> ${p.documento || ''}</td>
                    <td>${p.nombre || ''}</td>
                    <td>${p.telefono || ''}</td>
                    <td>${p.email || ''}</td>
                    <td>${fechaNac}</td>
                    <td>
                        <span class="status-badge status-${estado}">
                            ${estadoTexto}
                        </span>
                    </td>
                    <td>
                    <button class="action-btn btn-editar" onclick="window.editarPaciente(${p.id})">
                      <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="action-btn btn-eliminar" onclick="window.eliminarPaciente(${p.id})">
                      <i class="fas fa-trash"></i> Eliminar
                    </button>
                    <button class="action-btn btn-historia" onclick="window.verHistoria(${p.id})">
                       <i class="fas fa-notes-medical"></i> Historia
                    </button>                  
                 </td>
                </tr>
            `;
        }).join('');
        
        if (totalSpan) {
            totalSpan.textContent = `${pacientesFiltrados.length} pacientes`;
        }
    }

    function filtrarPacientes() {
        if (!buscarInput || !filtroEstado) return;
        
        const busqueda = buscarInput.value.toLowerCase().trim();
        const estado = filtroEstado.value;
        
        pacientesFiltrados = pacientes.filter(p => {
            const nombre = (p.nombre || '').toLowerCase();
            const documento = (p.documento || '').toLowerCase();
            const telefono = (p.telefono || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            
            const coincideBusqueda = busqueda === '' || 
                nombre.includes(busqueda) ||
                documento.includes(busqueda) ||
                telefono.includes(busqueda) ||
                email.includes(busqueda);
            
            const activo = p.activo === 1 ? 'activo' : 'inactivo';
            const coincideEstado = estado === 'todos' || activo === estado;
            
            return coincideBusqueda && coincideEstado;
        });
        
        renderizarTabla();
    }

    function limpiarFiltros() {
        if (buscarInput) buscarInput.value = '';
        if (filtroEstado) filtroEstado.value = 'todos';
        pacientesFiltrados = [...pacientes];
        renderizarTabla();
    }

    function abrirModal(pacienteId = null) {
        if (!modal) return;
        
        const form = document.getElementById('pacienteForm');
        if (form) form.reset();
        
        if (pacienteId) {
            modalTitle.textContent = 'Editar Paciente';
            const paciente = pacientes.find(p => p.id === pacienteId);
            if (paciente) {
                document.getElementById('pacienteId').value = paciente.id || '';
                document.getElementById('tipoDocumento').value = 'CC';
                document.getElementById('documento').value = paciente.documento || '';
                document.getElementById('primerNombre').value = paciente.nombre || '';
                document.getElementById('telefono').value = paciente.telefono || '';
                document.getElementById('email').value = paciente.email || '';
                document.getElementById('direccion').value = paciente.direccion || '';
                document.getElementById('fechaNacimiento').value = paciente.fecha_nacimiento 
                    ? paciente.fecha_nacimiento.split('T')[0] 
                    : '';
                document.getElementById('genero').value = paciente.genero || 'M';
                document.getElementById('estado').value = paciente.activo === 1 ? 'activo' : 'inactivo';
            }
        } else {
            modalTitle.textContent = 'Nuevo Paciente';
            document.getElementById('pacienteId').value = '';
            document.getElementById('tipoDocumento').value = 'CC';
            document.getElementById('genero').value = 'M';
            document.getElementById('estado').value = 'activo';
        }
        
        modal.classList.add('show');
    }

    function cerrarModal() {
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async function guardarPaciente() {
        try {
            // Validar campos requeridos
            const camposRequeridos = ['documento', 'primerNombre', 'telefono'];
            for (let campo of camposRequeridos) {
                const input = document.getElementById(campo);
                if (!input || !input.value) {
                    alert('Por favor complete los campos requeridos');
                    return;
                }
            }

            const pacienteData = {
                nombre: document.getElementById('primerNombre').value,
                documento: document.getElementById('documento').value,
                telefono: document.getElementById('telefono').value,
                email: document.getElementById('email').value || null,
                direccion: document.getElementById('direccion').value || null,
                fecha_nacimiento: document.getElementById('fechaNacimiento').value || null,
                genero: document.getElementById('genero').value,
                activo: document.getElementById('estado').value === 'activo' ? 1 : 0
            };

            const pacienteId = document.getElementById('pacienteId').value;
            let url = `${API_BASE_URL}/pacientes`;
            let method = 'POST';

            if (pacienteId) {
                url = `${API_BASE_URL}/pacientes/${pacienteId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(pacienteData)
            });

            const data = await response.json();

            if (data.success) {
                alert(`Paciente ${pacienteId ? 'actualizado' : 'creado'} exitosamente`);
                await cargarPacientes();
                cerrarModal();
            } else {
                throw new Error(data.message || 'Error al guardar');
            }
            
        } catch (error) {
            console.error('Error guardando paciente:', error);
            alert('Error al guardar el paciente: ' + error.message);
        }
    }

    // Funciones globales
    window.editarPaciente = function(id) {
        abrirModal(id);
    };

    window.eliminarPaciente = async function(id) {
        if (confirm('¿Está seguro de eliminar este paciente?')) {
            try {
                const response = await fetch(`${API_BASE_URL}/pacientes/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Paciente eliminado exitosamente');
                    await cargarPacientes();
                } else {
                    throw new Error(data.message || 'Error al eliminar');
                }
            } catch (error) {
                console.error('Error eliminando paciente:', error);
                alert('Error al eliminar: ' + error.message);
            }
        }
    };

    window.verHistoria = function(id) {
        window.location.href = `historias.html?paciente=${id}`;
    };

    function cerrarSesion() {
        localStorage.clear();
        window.location.href = 'login.html';
    }
});
