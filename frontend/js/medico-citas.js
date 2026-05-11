// ============================================
// MIS CITAS - MÓDULO MÉDICO (CON FILTROS)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ medico-citas.js cargado');

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    if (!token || usuario.rol !== 'Médico') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = usuario.nombre || 'Dr. Miguel Sánchez';
    mostrarFecha();

    // Variable global para almacenar todas las citas
    let todasLasCitas = [];

    // Cargar citas iniciales (por defecto "hoy")
    cargarCitas('hoy');

    // Eventos de filtros
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filtro = this.dataset.filtro;
            aplicarFiltro(filtro, todasLasCitas);
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // Función para cargar las citas desde la API
    async function cargarCitas(filtroInicial) {
        const medicoId = usuario.medico_id || usuario.id;
        if (!medicoId) return;

        try {
            const response = await fetch(`${API_BASE_URL}/citas/medico/${medicoId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (!response.ok) throw new Error('Error al obtener citas');
            const data = await response.json();
            todasLasCitas = data.data || [];
            console.log('📊 Citas cargadas:', todasLasCitas);
            aplicarFiltro(filtroInicial, todasLasCitas);
        } catch (error) {
            console.error('❌ Error:', error);
            document.getElementById('citasBody').innerHTML = '<tr><td colspan="7" class="loading-message">Error al cargar citas</td></tr>';
        }
    }

    // Función para aplicar filtro y renderizar
    function aplicarFiltro(filtro, citas) {
        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];
        const mananaStr = new Date(hoy.getTime() + 86400000).toISOString().split('T')[0];

        let citasFiltradas = [];

        switch (filtro) {
            case 'hoy':
                citasFiltradas = citas.filter(c => c.fecha.split('T')[0] === hoyStr);
                break;
            case 'manana':
                citasFiltradas = citas.filter(c => c.fecha.split('T')[0] === mananaStr);
                break;
            case 'semana':
                const inicioSemana = new Date(hoy);
                inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // domingo como inicio
                const finSemana = new Date(inicioSemana);
                finSemana.setDate(inicioSemana.getDate() + 6);
                citasFiltradas = citas.filter(c => {
                    const fecha = new Date(c.fecha);
                    return fecha >= inicioSemana && fecha <= finSemana;
                });
                break;
            case 'pendientes':
                citasFiltradas = citas.filter(c => 
                    c.estado === 'Programada' || c.estado === 'Pendiente' || c.estado === 'Confirmada'
                );
                break;
            case 'todas':
            default:
                citasFiltradas = citas;
                break;
        }

        renderizarCitas(citasFiltradas);
    }

    // Función para renderizar la tabla
    function renderizarCitas(citas) {
        const tbody = document.getElementById('citasBody');
        const totalSpan = document.getElementById('totalCitas');

        totalSpan.textContent = `${citas.length} cita${citas.length !== 1 ? 's' : ''}`;

        if (citas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-message">No hay citas para este período</td></tr>';
            return;
        }

        tbody.innerHTML = citas.map(c => {
            const fecha = new Date(c.fecha).toLocaleDateString('es-ES');
            const hora = c.hora ? c.hora.substring(0,5) : '--:--';
            const estadoClass = (c.estado || 'programada').toLowerCase().replace(' ', '-');
            return `
                <tr>
                    <td>${fecha}</td>
                    <td><strong>${hora}</strong></td>
                    <td>${c.paciente_nombre || ''}</td>
                    <td>${c.paciente_documento || ''}</td>
                    <td>${c.motivo || ''}</td>
                    <td><span class="status-badge status-${estadoClass}">${c.estado || 'Programada'}</span></td>
                    <td>
                        <button class="action-btn" onclick="atenderPaciente(${c.paciente_id})">
                            <i class="fas fa-stethoscope"></i> Atender
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
});

function mostrarFecha() {
    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('fechaActual').textContent = fecha;
}

// Función global para atender paciente
window.atenderPaciente = function(pacienteId) {
    window.location.href = `atender-paciente.html?paciente=${pacienteId}`;
};
