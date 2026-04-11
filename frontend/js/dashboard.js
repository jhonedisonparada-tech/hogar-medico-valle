// ============================================
// DASHBOARD - HOGAR MÉDICO DEL VALLE
// ============================================

document.addEventListener('DOMContentLoaded', function () {
    // Verificar sesión
    const token   = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Mostrar nombre del usuario
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    if (userNameEl) userNameEl.textContent = usuario.nombre || 'Administrador';
    if (userRoleEl) userRoleEl.textContent = usuario.rol   || 'Admin';

    cargarTodo();

    // Botón refresh
    document.getElementById('refreshBtn')?.addEventListener('click', async function () {
        this.classList.add('fa-spin');
        await cargarTodo();
        setTimeout(() => this.classList.remove('fa-spin'), 500);
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
});

const API_URL = 'http://localhost:3000/api';

// Helper: fetch con token
function apiFetch(endpoint) {
    const token = localStorage.getItem('token');
    return fetch(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}

async function cargarTodo() {
    try {
        await cargarEstadisticas();
        await cargarProximasCitas();
        await cargarPacientes();
        setTimeout(() => cargarGraficas(), 400);
    } catch (error) {
        console.error('Error general:', error);
    }
}

// ============================================
// ESTADÍSTICAS
// ============================================
async function cargarEstadisticas() {
    try {
        // Pacientes
        const pacientesRes  = await apiFetch('/pacientes');
        const pacientesData = await pacientesRes.json();
        const totalPacientes = pacientesData.data?.length || 0;
        document.getElementById('totalPacientes').textContent = totalPacientes;

        // Médicos activos
        const medicosRes  = await apiFetch('/medicos');
        const medicosData = await medicosRes.json();
        const activos = medicosData.data?.filter(m => m.activo === 1).length || 0;
        document.getElementById('totalMedicos').textContent = activos;

        // Citas de hoy
        const hoy = new Date().toISOString().split('T')[0];
        const citasRes  = await apiFetch(`/citas/fecha/${hoy}`);
        const citasData = await citasRes.json();
        const citasHoy  = citasData.data?.length || 0;
        document.getElementById('citasHoy').textContent = citasHoy;

        // Historias clínicas — total real desde el backend
        const historiasRes  = await apiFetch('/historias/todas');
        const historiasData = await historiasRes.json();
        const totalHistorias = historiasData.data?.length || 0;
        document.getElementById('totalHistorias').textContent = totalHistorias;

        // Subtextos de las tarjetas
        const statChanges = document.querySelectorAll('.stat-change');
        if (statChanges.length >= 4) {
            statChanges[0].innerHTML = `<i class="fas fa-arrow-up"></i> Total: ${totalPacientes}`;
            statChanges[1].innerHTML = `<i class="fas fa-arrow-up"></i> Activos: ${activos}`;
            statChanges[2].innerHTML = `<i class="fas fa-clock"></i> Hoy: ${citasHoy}`;
            statChanges[3].innerHTML = `<i class="fas fa-arrow-up"></i> Total: ${totalHistorias}`;
        }

    } catch (error) {
        console.error('Error estadísticas:', error);
    }
}

// ============================================
// PRÓXIMAS CITAS
// ============================================
async function cargarProximasCitas() {
    const tbody = document.getElementById('citasTableBody');
    if (!tbody) return;

    try {
        // Usar la API de próximas citas
        const response = await apiFetch('/citas/proximas');
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            tbody.innerHTML = data.data.map(c => {
                const fecha = new Date(c.fecha).toLocaleDateString('es-ES');
                const hora = c.hora?.substring(0, 5) || '';
                const estado = c.estado || 'Programada';
                const estadoClass = estado.toLowerCase().replace(' ', '-');
                const especialidad = c.especialidad_nombre || 'Medicina General';
                return `
                    <tr>
                        <td><strong>${c.paciente_nombre || ''}</strong></td>
                        <td>${c.medico_nombre || ''}</td>
                        <td>${especialidad}</td>
                        <td>${fecha}</td>
                        <td><strong>${hora}</strong></td>
                        <td>
                            <span class="status-badge status-${estadoClass}">
                                ${estado}
                            </span>
                        </td>
                    </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="loading-message">No hay citas próximas</td></tr>`;
        }
    } catch (error) {
        console.error('Error al cargar próximas citas:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="loading-message">Error al cargar las próximas citas</td></tr>`;
    }
}

// ============================================
// ÚLTIMOS PACIENTES
// ============================================
async function cargarPacientes() {
    const tbody = document.getElementById('pacientesTableBody');
    if (!tbody) return;

    try {
        const response = await apiFetch('/pacientes');
        const data     = await response.json();

        if (data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.slice(0, 5).map(p => {
                const fecha = p.fecha_nacimiento
                    ? new Date(p.fecha_nacimiento).toLocaleDateString('es-ES')
                    : '-';
                return `
                    <tr>
                        <td><strong>${p.nombre || ''}</strong></td>
                        <td>${p.documento || ''}</td>
                        <td>${p.telefono || ''}</td>
                        <td>${p.email || '-'}</td>
                        <td>${fecha}</td>
                        <td>
                            <button class="action-btn" onclick="verPaciente(${p.id})" title="Ver">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="loading-message">No hay pacientes registrados</td></tr>`;
        }
    } catch (error) {
        console.error('Error pacientes:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="loading-message">Error al cargar pacientes</td></tr>`;
    }
}

// ============================================
// GRÁFICAS
// ============================================
async function cargarGraficas() {
    try {
        // Destruir gráficas previas
        ['citasChart', 'especialidadesChart'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                const chart = Chart.getChart(canvas);
                if (chart) chart.destroy();
            }
        });

        // Gráfica de citas por día
        const citasCtx = document.getElementById('citasChart')?.getContext('2d');
        if (citasCtx) {
            const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const fechas = [];
            const citasPorDia = [];

            const todasRes = await apiFetch('/citas');
            const todasData = await todasRes.json();
            const todasCitas = todasData.data || [];

            console.log('Datos de todas las citas:', todasCitas);

            for (let i = 29; i >= 0; i--) {
                const fecha = new Date();
                fecha.setDate(fecha.getDate() + i);
                fecha.setHours(0, 0, 0, 0); // Asegurarse de que la hora sea 00:00:00
                const fechaStr = fecha.toISOString().split('T')[0];
                fechas.unshift(fechaStr);

                const count = todasCitas.filter(c => {
                    const fechaCita = new Date(c.fecha);
                    fechaCita.setHours(0, 0, 0, 0); // Asegurarse de que la hora sea 00:00:00
                    return fechaCita.getTime() === fecha.getTime();
                }).length;

                citasPorDia.unshift(count);
            }

            console.log('Fechas procesadas:', fechas);
            console.log('Citas por día:', citasPorDia);

            new Chart(citasCtx, {
                type: 'line',
                data: {
                    labels: fechas,
                    datasets: [{
                        label: 'Citas de la Semana',
                        data: citasPorDia,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.2)',
                        borderWidth: 2,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: true }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } else {
            console.error('No se encontró el elemento citasChart en el DOM.');
        }

        // Gráfica de distribución por especialidad
        const especialidadesCtx = document.getElementById('especialidadesChart')?.getContext('2d');
        if (especialidadesCtx) {
            const especialidades = {};
            const response = await apiFetch('/citas/proximas');
            const data = await response.json();
            const citas = data.data || [];

            citas.forEach(c => {
                const especialidad = c.especialidad_nombre || 'Otros';
                especialidades[especialidad] = (especialidades[especialidad] || 0) + 1;
            });

            const labels = Object.keys(especialidades);
            const values = Object.values(especialidades);
            const total = values.reduce((sum, val) => sum + val, 0);
            const percentages = values.map(val => ((val / total) * 100).toFixed(1));

            new Chart(especialidadesCtx, {
                type: 'doughnut',
                data: {
                    labels: labels.map((label, i) => `${label} (${percentages[i]}%)`),
                    datasets: [
                        {
                            data: values,
                            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#FF9F40', '#9966FF', '#8E44AD', '#1ABC9C'],
                            hoverOffset: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'right' },
                        tooltip: { enabled: true }
                    }
                }
            });
        } else {
            console.error('No se encontró el elemento especialidadesChart en el DOM.');
        }
    } catch (error) {
        console.error('Error al cargar gráficas:', error);
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function verCita(id)     { window.location.href = `citas.html?ver=${id}`; }
function verPaciente(id) { window.location.href = `pacientes.html?ver=${id}`; }
