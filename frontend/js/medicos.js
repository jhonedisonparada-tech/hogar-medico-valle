// ============================================
// MÉDICOS - HOGAR MÉDICO DEL VALLE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Medicos.js cargado correctamente');

    const API_BASE_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            document.getElementById('userName').textContent = usuario.nombre || 'Administrador';
            document.getElementById('userRole').textContent = usuario.rol || 'Admin';
        } catch (e) {
            console.error('Error parsing usuario:', e);
        }
    }

    let medicos = [];
    let medicosFiltrados = [];
    let especialidades = [];

    mostrarFecha();
    cargarEspecialidades();
    cargarMedicos();
    setupEventListeners();

    function mostrarFecha() {
        const fechaSpan = document.getElementById('fechaActual');
        if (!fechaSpan) return;
        const fecha = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
        fechaSpan.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    }

    async function cargarEspecialidades() {
        try {
            const response = await fetch(`${API_BASE_URL}/medicos/especialidades/lista`);
                const data = await fetch(`${API_BASE_URL}/medicos/especialidades/lista`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json());
            if (data.success) {
                especialidades = data.data || [];
                const select = document.getElementById('especialidad_id');
                const filtro = document.getElementById('filtroEspecialidad');
                especialidades.forEach(e => {
                    if (select) select.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
                    if (filtro) filtro.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
                });
            }
        } catch (error) {
            console.error('Error cargando especialidades:', error);
        }
    }

    async function cargarMedicos() {
        const tbody = document.getElementById('medicosTableBody');
        try {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="loading-message">
                            <i class="fas fa-spinner fa-spin"></i>
                            Cargando médicos...
                        </td>
                    </tr>
                `;
            }
                const response = await fetch(`${API_BASE_URL}/medicos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            const data = await response.json();
            if (data.success) {
                medicos = data.data || [];
                medicosFiltrados = [...medicos];
                renderizarTabla();
            }
        } catch (error) {
            console.error('Error cargando médicos:', error);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="loading-message">
                            <i class="fas fa-exclamation-circle"></i>
                            Error al cargar médicos
                        </td>
                    </tr>
                `;
            }
        }
    }

    function renderizarTabla() {
        const tbody = document.getElementById('medicosTableBody');
        const totalSpan = document.getElementById('totalMedicos');
        if (!tbody) return;

        if (!medicosFiltrados || medicosFiltrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading-message">
                        <i class="fas fa-info-circle"></i>
                        No se encontraron médicos
                    </td>
                </tr>
            `;
            if (totalSpan) totalSpan.textContent = '0 médicos';
            return;
        }

        tbody.innerHTML = medicosFiltrados.map(m => {
            const estado = m.activo === 1 ? 'activo' : 'inactivo';
            const estadoTexto = m.activo === 1 ? 'Activo' : 'Inactivo';
            return `
                <tr>
                    <td>${m.documento || ''}</td>
                    <td><strong>${m.nombre || ''}</strong></td>
                    <td><span class="especialidad-badge">${m.especialidad_nombre || 'Sin especialidad'}</span></td>
                    <td>${m.telefono || ''}</td>
                    <td>${m.email || ''}</td>
                    <td>${m.registro_medico || ''}</td>
                    <td>
                        <span class="status-badge status-${estado}">
                            ${estadoTexto}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn" onclick="window.editarMedico(${m.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.eliminarMedico(${m.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (totalSpan) totalSpan.textContent = `${medicosFiltrados.length} médicos`;
    }

    function setupEventListeners() {
        const buscarInput = document.getElementById('buscarMedico');
        const filtroEspecialidad = document.getElementById('filtroEspecialidad');
        const limpiarBtn = document.getElementById('limpiarFiltros');
        const nuevoBtn = document.getElementById('nuevoMedicoBtn');
        const closeModal = document.getElementById('closeModal');
        const cancelarBtn = document.getElementById('cancelarModal');
        const guardarBtn = document.getElementById('guardarMedico');
        const logoutBtn = document.getElementById('logoutBtn');
        const modal = document.getElementById('medicoModal');

        if (buscarInput) buscarInput.addEventListener('input', filtrarMedicos);
        if (filtroEspecialidad) filtroEspecialidad.addEventListener('change', filtrarMedicos);
        if (limpiarBtn) limpiarBtn.addEventListener('click', limpiarFiltros);
        if (nuevoBtn) nuevoBtn.addEventListener('click', () => abrirModal());
        if (closeModal) closeModal.addEventListener('click', cerrarModal);
        if (cancelarBtn) cancelarBtn.addEventListener('click', cerrarModal);
        if (guardarBtn) guardarBtn.addEventListener('click', guardarMedico);
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cerrarModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cerrarModal();
        });
    }

    function filtrarMedicos() {
        const busqueda = document.getElementById('buscarMedico')?.value.toLowerCase().trim() || '';
        const especialidad = document.getElementById('filtroEspecialidad')?.value || 'todos';

        medicosFiltrados = medicos.filter(m => {
            const coincideBusqueda = busqueda === '' ||
                (m.nombre || '').toLowerCase().includes(busqueda) ||
                (m.documento || '').toLowerCase().includes(busqueda) ||
                (m.especialidad_nombre || '').toLowerCase().includes(busqueda);

            const coincideEspecialidad = especialidad === 'todos' ||
                String(m.especialidad_id) === String(especialidad);

            return coincideBusqueda && coincideEspecialidad;
        });

        renderizarTabla();
    }

    function limpiarFiltros() {
        const buscarInput = document.getElementById('buscarMedico');
        const filtroEspecialidad = document.getElementById('filtroEspecialidad');
        if (buscarInput) buscarInput.value = '';
        if (filtroEspecialidad) filtroEspecialidad.value = 'todos';
        medicosFiltrados = [...medicos];
        renderizarTabla();
    }

    function abrirModal(medicoId = null) {
        const modal = document.getElementById('medicoModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('medicoForm');
        if (form) form.reset();

        if (medicoId) {
            modalTitle.textContent = 'Editar Médico';
            const medico = medicos.find(m => m.id === medicoId);
            if (medico) {
                document.getElementById('medicoId').value = medico.id;
                document.getElementById('nombre').value = medico.nombre || '';
                document.getElementById('documento').value = medico.documento || '';
                document.getElementById('especialidad_id').value = medico.especialidad_id || '';
                document.getElementById('registro_medico').value = medico.registro_medico || '';
                document.getElementById('telefono').value = medico.telefono || '';
                document.getElementById('email').value = medico.email || '';
                document.getElementById('activo').value = medico.activo ?? 1;
            }
        } else {
            modalTitle.textContent = 'Nuevo Médico';
            document.getElementById('medicoId').value = '';
        }

        if (modal) modal.classList.add('show');
    }

    function cerrarModal() {
        const modal = document.getElementById('medicoModal');
        if (modal) modal.classList.remove('show');
    }

    async function guardarMedico() {
        try {
            const nombre = document.getElementById('nombre').value;
            const documento = document.getElementById('documento').value;
            const especialidad_id = document.getElementById('especialidad_id').value;

            if (!nombre || !documento || !especialidad_id) {
                alert('Por favor complete los campos requeridos');
                return;
            }

            const medicoData = {
                nombre,
                documento,
                especialidad_id,
                registro_medico: document.getElementById('registro_medico').value || null,
                telefono: document.getElementById('telefono').value || null,
                email: document.getElementById('email').value || null,
                activo: parseInt(document.getElementById('activo').value)
            };

            const medicoId = document.getElementById('medicoId').value;
            const url = medicoId ? `${API_BASE_URL}/medicos/${medicoId}` : `${API_BASE_URL}/medicos`;
            const method = medicoId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(medicoData)
                });

            const data = await response.json();

            if (data.success) {
                alert(`Médico ${medicoId ? 'actualizado' : 'creado'} exitosamente`);
                await cargarMedicos();
                cerrarModal();
            } else {
                throw new Error(data.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error guardando médico:', error);
            alert('Error al guardar el médico: ' + error.message);
        }
    }

    window.editarMedico = function(id) {
        abrirModal(id);
    };

    window.eliminarMedico = async function(id) {
        if (confirm('¿Está seguro de eliminar este médico?')) {
            try {
                    const response = await fetch(`${API_BASE_URL}/medicos/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                const data = await response.json();
                if (data.success) {
                    alert('Médico eliminado');
                    await cargarMedicos();
                } else {
                    throw new Error(data.message || 'Error al eliminar');
                }
            } catch (error) {
                console.error('Error eliminando médico:', error);
                alert('Error al eliminar: ' + error.message);
            }
        }
    };
});
