const API_URL = 'http://localhost:3000/api';
let pacienteId = null;
let todasLasCitas = [];

function toast(mensaje, tipo='success') {
    const t = document.createElement('div');
    t.className = `toast toast-${tipo}`;
    t.innerHTML = `<i class="fas fa-${tipo==='success'?'check-circle':tipo==='error'?'times-circle':'exclamation-circle'}"></i> ${mensaje}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

const medicosPorEspecialidad = {
    '1': [{id:2, nombre:'Dr. Carlos Rodríguez'},{id:10, nombre:'Dr. Andrés Mendoza'}],
    '2': [{id:3, nombre:'Dra. Ana Martínez'},{id:11, nombre:'Dra. Silvia Castro'}],
    '3': [{id:4, nombre:'Dr. Miguel Sánchez'}],
    '4': [{id:5, nombre:'Dra. Laura García'}],
    '5': [{id:6, nombre:'Dr. Javier Torres'}],
    '6': [{id:7, nombre:'Dra. Patricia Ramírez'}],
    '7': [{id:8, nombre:'Dr. Fernando López'}],
    '8': [{id:9, nombre:'Dra. Carmen Vargas'}]
};

document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token || usuario.rol !== 'Paciente') { window.location.href = 'login.html'; return; }

    document.getElementById('userName').textContent = usuario.nombre || 'Paciente';
    document.getElementById('fechaActual').textContent = new Date().toLocaleDateString('es-ES', {
        weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });

    const res = await fetch(`${API_URL}/pacientes`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    const paciente = data.data?.find(p => p.email === usuario.email);
    if (paciente) { pacienteId = paciente.id; cargarCitas(); }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtrarCitas(this.dataset.filter);
        });
    });

    document.getElementById('btnNuevaCita').addEventListener('click', () => {
        document.getElementById('modalNuevaCita').style.display = 'flex';
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        document.getElementById('inputFecha').min = manana.toISOString().split('T')[0];
    });
    document.getElementById('cerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('cancelarModal').addEventListener('click', cerrarModal);
    document.getElementById('guardarCita').addEventListener('click', guardarCita);

    document.getElementById('selectEspecialidad').addEventListener('change', function() {
        const esp = this.value;
        const selectMedico = document.getElementById('selectMedico');
        selectMedico.innerHTML = '<option value="">-- Seleccione médico --</option>';
        if (esp && medicosPorEspecialidad[esp]) {
            medicosPorEspecialidad[esp].forEach(m => {
                selectMedico.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
            });
        }
    });

    document.getElementById('inputFecha').addEventListener('change', function() {
        const fecha = new Date(this.value + 'T12:00:00');
        const dia = fecha.getDay();
        const msg = document.getElementById('mensajeDisponibilidad');
        if (dia === 0 || dia === 6) {
            msg.style.display = 'block';
            msg.style.background = '#f8d7da';
            msg.style.color = '#721c24';
            msg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No atendemos sábados ni domingos. Por favor seleccione un día hábil.';
            this.value = '';
        } else {
            msg.style.display = 'none';
        }
    });
});

async function cargarCitas() {
    const tbody = document.getElementById('citasBody');
    try {
        const res = await fetch(`${API_URL}/citas/paciente/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        todasLasCitas = data.data || [];
        filtrarCitas('proximas');
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-msg">Error al cargar citas</td></tr>';
    }
}

function filtrarCitas(filtro) {
    const hoy = new Date().toISOString().split('T')[0];
    let filtradas = [];
    if (filtro === 'proximas') filtradas = todasLasCitas.filter(c => c.fecha >= hoy && c.estado !== 'Cancelada');
    else if (filtro === 'completadas') filtradas = todasLasCitas.filter(c => c.estado === 'Completada');
    else if (filtro === 'canceladas') filtradas = todasLasCitas.filter(c => c.estado === 'Cancelada');
    else filtradas = todasLasCitas;

    document.getElementById('totalCitas').textContent = `${filtradas.length} citas`;
    renderCitas(filtradas);
}

function renderCitas(citas) {
    const tbody = document.getElementById('citasBody');
    if (!citas.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-msg">No hay citas en esta categoría</td></tr>';
        return;
    }
    tbody.innerHTML = citas.map(c => `
        <tr>
            <td><strong>${new Date(c.fecha).toLocaleDateString('es-ES')}</strong></td>
            <td>${c.hora?.substring(0,5)}</td>
            <td>${c.medico_nombre || '-'}</td>
            <td>${c.especialidad_nombre || '-'}</td>
            <td><span class="badge badge-${(c.estado||'').toLowerCase().replace(' ','-')}">${c.estado}</span></td>
            <td>
                ${c.estado === 'Pendiente' || c.estado === 'Programada' ?
                `<button class="btn-cancelar-cita" onclick="cancelarCita(${c.id})">
                    <i class="fas fa-times"></i> Cancelar
                </button>` : '-'}
            </td>
        </tr>
    `).join('');
}

async function guardarCita() {
    const medicoId = document.getElementById('selectMedico').value;
    const fecha = document.getElementById('inputFecha').value;
    const hora = document.getElementById('selectHora').value;
    const motivo = document.getElementById('inputMotivo').value;
    const especialidadSelect = document.getElementById('selectEspecialidad');
    const espIndex = especialidadSelect.selectedIndex;
    const especialidadTexto = espIndex > 0 ? especialidadSelect.options[espIndex].text : '';

    if (!medicoId || !fecha || !hora) {
        toast('Complete todos los campos requeridos', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/citas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paciente_id: pacienteId,
                medico_id: medicoId,
                fecha: fecha,
                hora: hora,
                motivo: motivo,
                especialidad_nombre: especialidadTexto,
                estado: 'Programada'
            })
        });
        const data = await res.json();
        if (data.success) {
            toast('Cita programada correctamente');
            cerrarModal();
            cargarCitas();
        } else {
            toast('Error al solicitar cita', 'error');
        }
    } catch (error) {
        toast('Error de conexión', 'error');
    }
}

window.cancelarCita = async function(id) {
    if (!confirm('¿Está seguro que desea cancelar esta cita?')) return;
    try {
        const res = await fetch(`${API_URL}/citas/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: 'Cancelada' })
        });
        const data = await res.json();
        if (data.success) {
            toast('Cita cancelada correctamente');
            cargarCitas();
        } else {
            toast('Error al cancelar', 'error');
        }
    } catch (error) {
        toast('Error de conexión', 'error');
    }
};

function cerrarModal() {
    document.getElementById('modalNuevaCita').style.display = 'none';
    document.getElementById('selectEspecialidad').value = '';
    document.getElementById('selectMedico').innerHTML = '<option value="">-- Seleccione especialidad primero --</option>';
    document.getElementById('inputFecha').value = '';
    document.getElementById('selectHora').value = '';
    document.getElementById('inputMotivo').value = '';
    document.getElementById('mensajeDisponibilidad').style.display = 'none';
}