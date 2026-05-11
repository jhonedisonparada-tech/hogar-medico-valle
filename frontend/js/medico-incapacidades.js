// ============================================
// INCAPACIDADES - MÓDULO MÉDICO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    if (!token || usuario.rol !== 'Médico') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = usuario.nombre;
    mostrarFecha();
    
    document.getElementById('btnBuscar').addEventListener('click', buscarPaciente);
    document.getElementById('buscarDocumento').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') buscarPaciente();
    });
    document.getElementById('nuevaIncapacidadBtn').addEventListener('click', abrirModal);
    document.getElementById('closeModal').addEventListener('click', cerrarModal);
    document.getElementById('cancelarModal').addEventListener('click', cerrarModal);
    document.getElementById('guardarIncapacidad').addEventListener('click', guardarIncapacidad);
    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
    
    // Calcular fecha fin automáticamente al cambiar días o fecha inicio
    document.getElementById('dias').addEventListener('input', calcularFechaFin);
    document.getElementById('fechaInicio').addEventListener('change', calcularFechaFin);
    
    // Verificar si viene de un paciente específico
    const urlParams = new URLSearchParams(window.location.search);
    const pacienteId = urlParams.get('paciente');
    if (pacienteId) {
        cargarPacientePorId(pacienteId);
    }
});


let pacienteActual = null;

function mostrarFecha() {
    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('fechaActual').textContent = fecha;
}

async function buscarPaciente() {
    const documento = document.getElementById('buscarDocumento').value.trim();
    
    if (!documento) {
        alert('Ingrese un número de documento');
        return;
    }

    const resultadosDiv = document.getElementById('resultadosBusqueda');
    
    try {
        const response = await fetch(`${API_BASE_URL}/pacientes`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        if (data.data) {
            const pacientes = data.data.filter(p => 
                p.documento.includes(documento)
            );
            
            if (pacientes.length > 0) {
                resultadosDiv.style.display = 'block';
                resultadosDiv.innerHTML = pacientes.map(p => `
                    <div class="paciente-resultado">
                        <div class="paciente-resultado-info">
                            <h4>${p.nombre}</h4>
                            <p><i class="fas fa-id-card"></i> ${p.documento}</p>
                            <p><i class="fas fa-phone"></i> ${p.telefono}</p>
                        </div>
                        <button class="btn-seleccionar" onclick="seleccionarPaciente(${p.id}, '${p.nombre}', '${p.documento}')">
                            Ver Incapacidades
                        </button>
                    </div>
                `).join('');
            } else {
                resultadosDiv.style.display = 'block';
                resultadosDiv.innerHTML = '<div class="paciente-resultado">No se encontraron pacientes</div>';
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarPacientePorId(pacienteId) {
    try {
        const response = await fetch(`${API_BASE_URL}/pacientes/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const paciente = data.data;
            seleccionarPaciente(paciente.id, paciente.nombre, paciente.documento);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

window.seleccionarPaciente = function(pacienteId, pacienteNombre, pacienteDocumento) {
    pacienteActual = { id: pacienteId, nombre: pacienteNombre, documento: pacienteDocumento };
    
    document.getElementById('pacienteNombreSeleccionado').textContent = pacienteNombre;
    document.getElementById('incapacidadesContainer').style.display = 'block';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    
    cargarIncapacidades(pacienteId);
};

async function cargarIncapacidades(pacienteId) {
    const tbody = document.getElementById('incapacidadesBody');
    
    try {
        const response = await fetch(`${API_BASE_URL}/incapacidades/paciente/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(i => `
                <tr>
                    <td>${new Date(i.fecha).toLocaleDateString()}</td>
                    <td>${i.diagnostico}</td>
                    <td>${i.dias_incapacidad} días</td>
                    <td>${new Date(i.fecha_inicio).toLocaleDateString()} - ${new Date(i.fecha_fin).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn" onclick="imprimirIncapacidad(${i.id})">
                            <i class="fas fa-print"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="loading-message">No hay incapacidades para este paciente</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function calcularFechaFin() {
    const dias = parseInt(document.getElementById('dias').value) || 0;
    const fechaInicio = document.getElementById('fechaInicio').value;
    
    if (dias > 0 && fechaInicio) {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + dias);
        document.getElementById('fechaFin').value = fecha.toISOString().split('T')[0];
    }
}

function abrirModal() {
    if (!pacienteActual) {
        alert('Primero debe seleccionar un paciente');
        return;
    }
    
    document.getElementById('pacienteNombreModal').value = pacienteActual.nombre;
    document.getElementById('pacienteDocumentoModal').value = pacienteActual.documento;
    
    // Fecha inicio por defecto = hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').value = hoy;
    
    // Limpiar campos
    document.getElementById('diagnostico').value = '';
    document.getElementById('dias').value = '';
    document.getElementById('fechaFin').value = '';
    document.getElementById('observaciones').value = '';
    
    document.getElementById('incapacidadModal').classList.add('show');
}

function cerrarModal() {
    document.getElementById('incapacidadModal').classList.remove('show');
    document.getElementById('incapacidadForm').reset();
}

async function guardarIncapacidad() {
    if (!pacienteActual) {
        alert('Error: No hay paciente seleccionado');
        return;
    }

    const diagnostico = document.getElementById('diagnostico').value;
    const dias = document.getElementById('dias').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const observaciones = document.getElementById('observaciones').value;
    
    if (!diagnostico || !dias || !fechaInicio) {
        alert('Diagnóstico, días y fecha de inicio son obligatorios');
        return;
    }

    // Si no se ha calculado la fecha fin, calcularla ahora
    let fechaFinFinal = fechaFin;
    if (!fechaFinFinal && dias && fechaInicio) {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + parseInt(dias));
        fechaFinFinal = fecha.toISOString().split('T')[0];
    }

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    const incapacidad = {
        paciente_id: pacienteActual.id,
        medico_id: usuario.medico_id,
        diagnostico: diagnostico,
        dias_incapacidad: parseInt(dias),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFinFinal,
        observaciones: observaciones
    };

    try {
        const response = await fetch(`${API_BASE_URL}/incapacidades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(incapacidad)
        });

        const data = await response.json();
        
        if (data.success) {
            alert('✅ Incapacidad generada exitosamente');
            cerrarModal();
            cargarIncapacidades(pacienteActual.id);
        } else {
            alert('❌ Error al generar incapacidad');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    }
}

window.imprimirIncapacidad = function(id) {
    alert('Función de impresión en desarrollo');
};

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}
