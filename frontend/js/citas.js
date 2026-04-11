// ============================================
// CITAS - HOGAR MÉDICO DEL VALLE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Citas.js cargado correctamente');

    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Función auxiliar para fetch con auth
    async function fetchConAuth(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        };
        return fetch(url, { ...options, ...defaultOptions });
    }

    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            const userNameSpan = document.getElementById('userName');
            const userRoleSpan = document.getElementById('userRole');
            if (userNameSpan) userNameSpan.textContent = usuario.nombre || 'Dr. Juan Pérez';
            if (userRoleSpan) userRoleSpan.textContent = usuario.rol || 'Administrador';
        } catch (e) {
            console.error('Error parsing usuario:', e);
        }
    }

    let citas = [];
    let citasFiltradas = [];
    let pacientes = [];
    let medicos = [];
    let calendar = null;
    let currentFilter = 'hoy';
    let selectedCitaId = null;

    mostrarFecha();
    cargarDatosIniciales();
    setupEventListeners();

    function mostrarFecha() {
        const fechaSpan = document.getElementById('fechaActual');
        if (!fechaSpan) return;
        const fecha = new Date();
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const fechaFormateada = fecha.toLocaleDateString('es-ES', opciones);
        fechaSpan.textContent = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
    }

    async function cargarDatosIniciales() {
        await cargarPacientes();
        await cargarMedicos();
        await cargarCitas();
        setTimeout(() => inicializarCalendario(), 500);
    }

    async function cargarPacientes() {
        try {
            const response = await fetchConAuth(`${API_URL}/pacientes`);
            const data = await response.json();
            if (data.success) {
                pacientes = data.data || [];
                const select = document.getElementById('pacienteId');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione un paciente</option>';
                    pacientes.forEach(p => {
                        select.innerHTML += `<option value="${p.id}">${p.nombre} - ${p.documento}</option>`;
                    });
                }
            }
        } catch (error) {
            console.error('Error cargando pacientes:', error);
        }
    }

    async function cargarMedicos() {
        try {
            const response = await fetchConAuth(`${API_URL}/medicos`);
            const data = await response.json();
            if (data.success) {
                medicos = data.data || [];
                const select = document.getElementById('medicoId');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione un médico</option>';
                    medicos.forEach(m => {
                        select.innerHTML += `<option value="${m.id}">${m.nombre} - ${m.especialidad_nombre || ''}</option>`;
                    });
                }
            }
        } catch (error) {
            console.error('Error cargando médicos:', error);
        }
    }

    async function cargarCitas() {
        const tablaBody = document.getElementById('citasTableBody');
        try {
            if (tablaBody) {
                tablaBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="loading-message">
                            <i class="fas fa-spinner fa-spin"></i>
                            Cargando citas...
                        </td>
                    </tr>
                `;
            }
            const response = await fetch(`${API_URL}/citas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                citas = data.data || [];
                citasFiltradas = [...citas];
                aplicarFiltroRapido();
                if (calendar) {
                    calendar.removeAllEvents();
                    calendar.addEventSource(citas.map(c => ({
                        id: c.id,
                        title: `${c.paciente_nombre} - ${c.motivo}`,
                        start: c.fecha_hora,
                        end: c.fecha_hora_fin,
                        extendedProps: c
                    })));
                }
            }
        } catch (error) {
            console.error('Error cargando citas:', error);
            if (tablaBody) {
                tablaBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="loading-message">
                            <i class="fas fa-exclamation-circle"></i>
                            Error al cargar citas
                        </td>
                    </tr>
                `;
            }
        }
    }

    function aplicarFiltroRapido() {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const hoyStr = hoy.toISOString().split('T')[0];

        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        const mananaStr = manana.toISOString().split('T')[0];

        // Mes actual y siguiente
        const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const ultimoDiaMesSiguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);

        switch(currentFilter) {
            case 'hoy':
                citasFiltradas = citas.filter(c => {
                    const fechaCita = c.fecha.split('T')[0];
                    return fechaCita === hoyStr;
                });
                break;
            case 'manana':
                citasFiltradas = citas.filter(c => {
                    const fechaCita = c.fecha.split('T')[0];
                    return fechaCita === mananaStr;
                });
                break;
            case 'semana':
                // Mostrar solo citas del mes actual y siguiente
                citasFiltradas = citas.filter(c => {
                    const fechaCita = new Date(c.fecha);
                    return fechaCita >= primerDiaMesActual && fechaCita <= ultimoDiaMesSiguiente;
                });
                break;
            case 'pendientes':
                citasFiltradas = citas.filter(c =>
                    (c.estado === 'Programada' || c.estado === 'Confirmada' || c.estado === 'En Curso' || c.estado === 'Pendiente') &&
                    (new Date(c.fecha) >= primerDiaMesActual && new Date(c.fecha) <= ultimoDiaMesSiguiente)
                );
                break;
            default:
                // Mostrar solo citas del mes actual y siguiente
                citasFiltradas = citas.filter(c => {
                    const fechaCita = new Date(c.fecha);
                    return fechaCita >= primerDiaMesActual && fechaCita <= ultimoDiaMesSiguiente;
                });
        }

        renderizarTablaCitas();
        if (calendar) calendar.refetchEvents();
    }

    function renderizarTablaCitas() {
        const tablaBody = document.getElementById('citasTableBody');
        const totalSpan = document.getElementById('totalCitas');
        if (!tablaBody) return;

        if (!citasFiltradas || citasFiltradas.length === 0) {
            tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-message">
                        <i class="fas fa-info-circle"></i>
                        No se encontraron citas
                    </td>
                </tr>
            `;
            if (totalSpan) totalSpan.textContent = '0 citas';
            return;
        }

        citasFiltradas.sort((a, b) => {
            const fechaA = a.fecha.split('T')[0];
            const fechaB = b.fecha.split('T')[0];
            if (fechaA < fechaB) return -1;
            if (fechaA > fechaB) return 1;
            return a.hora.localeCompare(b.hora);
        });

        tablaBody.innerHTML = citasFiltradas.map(c => {
            const fecha = new Date(c.fecha).toLocaleDateString('es-ES');
            const hora = c.hora ? c.hora.substring(0, 5) : '';
            const estadoClass = (c.estado || 'programada').toLowerCase().replace(' ', '-');
            return `
                <tr>
                    <td><strong>${fecha}</strong></td>
                    <td><strong>${hora}</strong></td>
                    <td>${c.paciente_nombre || ''}</td>
                    <td>${c.medico_nombre || ''}</td>
                    <td>${c.especialidad_nombre || c.motivo || '-'}</td>
                    <td>
                        <span class="status-badge status-${estadoClass}">
                            ${c.estado || 'Programada'}
                        </span>
                    </td>
                    <td style="display:flex; flex-direction:row; gap:4px; align-items:center; border:none;">
                        <button class="action-btn" onclick="window.verCita(${c.id})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn" onclick="window.editarCita(${c.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.cancelarCita(${c.id})" title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (totalSpan) totalSpan.textContent = `${citasFiltradas.length} citas`;
    }

    function inicializarCalendario() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;
        if (calendar) calendar.destroy();

        calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'es',
            initialView: 'timeGridWeek',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día'
            },
            slotMinTime: '07:00:00',
            slotMaxTime: '20:00:00',
            allDaySlot: false,
            slotDuration: '00:30:00',
            events: citas.map(cita => {
                let color = '#3788d8';
                if (cita.estado === 'Confirmada') color = '#27ae60';
                if (cita.estado === 'En Curso') color = '#f39c12';
                if (cita.estado === 'Completada') color = '#7f8c8d';
                if (cita.estado === 'Cancelada' || cita.estado === 'No Asistió') color = '#e74c3c';
                return {
                    id: cita.id,
                    title: `${cita.paciente_nombre} - ${cita.medico_nombre}`,
                    start: `${cita.fecha.split('T')[0]}T${cita.hora}`,
                    end: calcularHoraFin(cita.fecha.split('T')[0], cita.hora, 60),
                    color: color,
                    extendedProps: {
                        estado: cita.estado,
                        paciente: cita.paciente_nombre,
                        medico: cita.medico_nombre,
                        motivo: cita.motivo
                    }
                };
            }),
            eventClick: function(info) {
                mostrarDetalleCita(info.event.id);
            },
            selectable: true,
            select: function(info) {
                const fechaInput = document.getElementById('fecha');
                const horaInput = document.getElementById('hora');
                if (fechaInput) fechaInput.value = info.startStr.split('T')[0];
                if (horaInput) horaInput.value = info.startStr.split('T')[1]?.substring(0, 5) || '';
                abrirModal();
            }
        });

        calendar.render();
    }

    function calcularHoraFin(fecha, hora, minutos) {
        const [horas, mins] = hora.split(':').map(Number);
        const fechaFin = new Date(fecha);
        fechaFin.setHours(horas, mins + minutos, 0);
        return fechaFin.toISOString().replace('Z', '');
    }

    function setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        const nuevaCitaBtn = document.getElementById('nuevaCitaBtn');
        const modal = document.getElementById('citaModal');
        const closeModal = document.getElementById('closeModal');
        const cancelarBtn = document.getElementById('cancelarModal');
        const guardarBtn = document.getElementById('guardarCita');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const btnCalendario = document.getElementById('btnCalendario');
        const btnLista = document.getElementById('btnLista');
        const buscarInput = document.getElementById('buscarCita');
        const filtroEstado = document.getElementById('filtroEstado');
        const limpiarBtn = document.getElementById('limpiarFiltros');
        const detalleModal = document.getElementById('detalleCitaModal');
        const closeDetalle = document.getElementById('closeDetalleModal');
        const cerrarDetalle = document.getElementById('cerrarDetalle');
        const editarDesdeDetalle = document.getElementById('editarDesdeDetalle');
        const medicoSelect = document.getElementById('medicoId');
        const fechaInput = document.getElementById('fecha');
        const horaInput = document.getElementById('hora');

        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });

        if (nuevaCitaBtn) nuevaCitaBtn.addEventListener('click', () => abrirModal());

        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                aplicarFiltroRapido();
            });
        });

        if (btnCalendario && btnLista) {
            const calendarView = document.getElementById('calendarView');
            const listView = document.getElementById('listView');

            btnCalendario.addEventListener('click', function() {
                btnCalendario.classList.add('active');
                btnLista.classList.remove('active');
                if (calendarView) calendarView.style.display = 'block';
                if (listView) listView.style.display = 'none';
                if (calendar) setTimeout(() => calendar.render(), 100);
            });

            btnLista.addEventListener('click', function() {
                btnLista.classList.add('active');
                btnCalendario.classList.remove('active');
                if (calendarView) calendarView.style.display = 'none';
                if (listView) listView.style.display = 'block';
                renderizarTablaCitas();
            });
        }

        if (buscarInput) buscarInput.addEventListener('input', filtrarCitas);
        if (filtroEstado) filtroEstado.addEventListener('change', filtrarCitas);
        if (limpiarBtn) limpiarBtn.addEventListener('click', limpiarFiltros);
        if (closeModal) closeModal.addEventListener('click', cerrarModal);
        if (cancelarBtn) cancelarBtn.addEventListener('click', cerrarModal);
        if (guardarBtn) guardarBtn.addEventListener('click', guardarCita);
        if (closeDetalle) closeDetalle.addEventListener('click', cerrarDetalleModal);
        if (cerrarDetalle) cerrarDetalle.addEventListener('click', cerrarDetalleModal);
        if (editarDesdeDetalle) editarDesdeDetalle.addEventListener('click', editarDesdeDetalleModal);

        if (medicoSelect) medicoSelect.addEventListener('change', verificarDisponibilidad);
        if (fechaInput) fechaInput.addEventListener('change', verificarDisponibilidad);
        if (horaInput) horaInput.addEventListener('change', verificarDisponibilidad);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (modal?.classList.contains('show')) cerrarModal();
                if (detalleModal?.classList.contains('show')) cerrarDetalleModal();
            }
        });

        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
        if (detalleModal) detalleModal.addEventListener('click', (e) => { if (e.target === detalleModal) cerrarDetalleModal(); });
    }

    function filtrarCitas() {
        const buscarInput = document.getElementById('buscarCita');
        const filtroEstado = document.getElementById('filtroEstado');
        const busqueda = buscarInput?.value.toLowerCase().trim() || '';
        const estado = filtroEstado?.value || 'todos';

        citasFiltradas = citas.filter(c => {
            const paciente = (c.paciente_nombre || '').toLowerCase();
            const medico = (c.medico_nombre || '').toLowerCase();
            const coincideBusqueda = busqueda === '' || paciente.includes(busqueda) || medico.includes(busqueda);
            const coincideEstado = estado === 'todos' || (c.estado || '').toLowerCase() === estado.toLowerCase();
            return coincideBusqueda && coincideEstado;
        });

        renderizarTablaCitas();
    }

    function limpiarFiltros() {
        const buscarInput = document.getElementById('buscarCita');
        const filtroEstado = document.getElementById('filtroEstado');
        if (buscarInput) buscarInput.value = '';
        if (filtroEstado) filtroEstado.value = 'todos';
        citasFiltradas = [...citas];
        renderizarTablaCitas();
    }

    function abrirModal(citaId = null) {
        const modal = document.getElementById('citaModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('citaForm');
        if (form) form.reset();

        if (citaId) {
            if (modalTitle) modalTitle.textContent = 'Editar Cita';
            const cita = citas.find(c => c.id == citaId);
            if (cita) {
                document.getElementById('citaId').value = cita.id || '';
                document.getElementById('pacienteId').value = cita.paciente_id || '';
                document.getElementById('medicoId').value = cita.medico_id || '';
                document.getElementById('fecha').value = cita.fecha ? cita.fecha.split('T')[0] : '';
                document.getElementById('hora').value = cita.hora || '';
                document.getElementById('motivo').value = cita.motivo || '';
                document.getElementById('estado').value = cita.estado || 'Programada';
                document.getElementById('observaciones').value = cita.observaciones || '';
            }
        } else {
            if (modalTitle) modalTitle.textContent = 'Nueva Cita';
            document.getElementById('citaId').value = '';
            document.getElementById('estado').value = 'Programada';
        }

        if (modal) modal.classList.add('show');
    }

    function cerrarModal() {
        const modal = document.getElementById('citaModal');
        if (modal) modal.classList.remove('show');
    }

    async function guardarCita() {
        try {
            const pacienteId = document.getElementById('pacienteId')?.value;
            const medicoId = document.getElementById('medicoId')?.value;
            const fecha = document.getElementById('fecha')?.value;
            const hora = document.getElementById('hora')?.value;

            if (!pacienteId || !medicoId || !fecha || !hora) {
                alert('Por favor complete todos los campos requeridos');
                return;
            }

            const citaData = {
                paciente_id: pacienteId,
                medico_id: medicoId,
                fecha: fecha,
                hora: hora,
                motivo: document.getElementById('motivo')?.value || '',
                estado: document.getElementById('estado')?.value || 'Programada',
                observaciones: document.getElementById('observaciones')?.value || ''
            };

            const citaId = document.getElementById('citaId')?.value;
            const url = citaId ? `${API_URL}/citas/${citaId}` : `${API_URL}/citas`;
            const method = citaId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(citaData)
            });

            const data = await response.json();

            if (data.success) {
                alert(`Cita ${citaId ? 'actualizada' : 'creada'} exitosamente`);
                await cargarCitas();
                cerrarModal();
            } else {
                throw new Error(data.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error guardando cita:', error);
            alert('Error al guardar la cita: ' + error.message);
        }
    }

    async function verificarDisponibilidad() {
        const medicoId = document.getElementById('medicoId')?.value;
        const fecha = document.getElementById('fecha')?.value;
        const hora = document.getElementById('hora')?.value;
        if (!medicoId || !fecha || !hora) return;

        try {
            const response = await fetchConAuth(`${API_URL}/citas/disponibilidad/verificar?medico_id=${medicoId}&fecha=${fecha}&hora=${hora}`);
            const data = await response.json();
            if (data.success && !data.disponible) {
                alert('Este horario no está disponible. Por favor seleccione otro.');
                const horaInput = document.getElementById('hora');
                if (horaInput) horaInput.value = '';
            }
        } catch (error) {
            console.error('Error verificando disponibilidad:', error);
        }
    }

    function mostrarDetalleCita(id) {
        selectedCitaId = parseInt(id);
        const cita = citas.find(c => c.id === selectedCitaId);
        const detalleModal = document.getElementById('detalleCitaModal');
        if (!cita || !detalleModal) return;

        const fecha = new Date(cita.fecha).toLocaleDateString('es-ES');
        const detalleBody = document.getElementById('detalleCitaBody');
        if (!detalleBody) return;

        detalleBody.innerHTML = `
            <div class="detalle-info">
                <div class="detalle-row">
                    <span class="detalle-label">Paciente:</span>
                    <span class="detalle-value"><strong>${cita.paciente_nombre || ''}</strong></span>
                </div>
                <div class="detalle-row">
                    <span class="detalle-label">Médico:</span>
                    <span class="detalle-value">${cita.medico_nombre || ''}</span>
                </div>
                <div class="detalle-row">
                    <span class="detalle-label">Fecha:</span>
                    <span class="detalle-value"><strong>${fecha}</strong> a las <strong>${cita.hora?.substring(0,5)}</strong></span>
                </div>
                <div class="detalle-row">
                    <span class="detalle-label">Estado:</span>
                    <span class="detalle-value">
                        <span class="status-badge status-${(cita.estado || 'programada').toLowerCase()}">
                            ${cita.estado || 'Programada'}
                        </span>
                    </span>
                </div>
                <div class="detalle-row">
                    <span class="detalle-label">Motivo:</span>
                    <span class="detalle-value">${cita.motivo || 'No especificado'}</span>
                </div>
                ${cita.observaciones ? `
                <div class="detalle-row">
                    <span class="detalle-label">Observaciones:</span>
                    <span class="detalle-value">${cita.observaciones}</span>
                </div>
                ` : ''}
            </div>
        `;

        detalleModal.classList.add('show');
    }

    function cerrarDetalleModal() {
        const detalleModal = document.getElementById('detalleCitaModal');
        if (detalleModal) {
            detalleModal.classList.remove('show');
            selectedCitaId = null;
        }
    }

    function editarDesdeDetalleModal() {
        const id = selectedCitaId;
        cerrarDetalleModal();
        if (id) abrirModal(id);
    }

    window.verCita = function(id) { mostrarDetalleCita(id); };
    window.editarCita = function(id) { abrirModal(id); };
    window.cancelarCita = async function(id) {
        if (confirm('¿Está seguro de cancelar esta cita?')) {
            try {
                const response = await fetchConAuth(`${API_URL}/citas/${id}/estado`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: 'Cancelada' })
                });
                const data = await response.json();
                if (data.success) {
                    await cargarCitas();
                } else {
                    throw new Error(data.message || 'Error al cancelar');
                }
            } catch (error) {
                console.error('Error cancelando cita:', error);
                alert('Error al cancelar la cita');
            }
        }
    };
});
