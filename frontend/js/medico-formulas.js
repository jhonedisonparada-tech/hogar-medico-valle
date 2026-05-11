// ============================================
// FÓRMULAS MÉDICAS - MÓDULO MÉDICO
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
    document.getElementById('nuevaFormulaBtn').addEventListener('click', abrirModal);
    document.getElementById('agregarMedicamento').addEventListener('click', agregarMedicamento);
    document.getElementById('closeModal').addEventListener('click', cerrarModal);
    document.getElementById('cancelarModal').addEventListener('click', cerrarModal);
    document.getElementById('guardarFormula').addEventListener('click', guardarFormula);
    document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);
    
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
                            Ver Fórmulas
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
    document.getElementById('formulasContainer').style.display = 'block';
    document.getElementById('resultadosBusqueda').style.display = 'none';
    
    cargarFormulas(pacienteId);
};

async function cargarFormulas(pacienteId) {
    const tbody = document.getElementById('formulasBody');
    
    try {
        const response = await fetch(`${API_BASE_URL}/medico/formulas/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(f => {
                const medicamentos = JSON.parse(f.medicamentos || '[]');
                const listaMed = medicamentos.map(m => 
                    `${m.nombre} ${m.dosis} (${m.frecuencia})`
                ).join('<br>');
                
                return `
                    <tr>
                        <td>${new Date(f.fecha).toLocaleDateString()}</td>
                        <td>${listaMed}</td>
                        <td>${f.indicaciones || ''}</td>
                        <td>
                            <button class="action-btn" onclick="imprimirFormula(${f.id})">
                                <i class="fas fa-print"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="loading-message">No hay fórmulas para este paciente</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="loading-message">Error al cargar</td></tr>';
    }
}

function agregarMedicamento() {
    const container = document.getElementById('medicamentos-container');
    const row = document.createElement('div');
    row.className = 'medicamento-row';
    row.innerHTML = `
        <input type="text" placeholder="Medicamento" class="medicamento-nombre">
        <input type="text" placeholder="Dosis" class="medicamento-dosis">
        <input type="text" placeholder="Frecuencia" class="medicamento-frecuencia">
        <input type="text" placeholder="Duración" class="medicamento-duracion">
        <button type="button" class="btn-remove" onclick="eliminarMedicamento(this)">×</button>
    `;
    container.appendChild(row);
}

window.eliminarMedicamento = function(boton) {
    if (document.querySelectorAll('.medicamento-row').length > 1) {
        boton.parentElement.remove();
    }
};

function abrirModal() {
    if (!pacienteActual) {
        alert('Primero debe seleccionar un paciente');
        return;
    }
    
    document.getElementById('pacienteNombreModal').value = pacienteActual.nombre;
    document.getElementById('pacienteDocumentoModal').value = pacienteActual.documento;
    document.getElementById('fechaFormula').value = new Date().toISOString().split('T')[0];
    document.getElementById('formulaModal').classList.add('show');
}

function cerrarModal() {
    document.getElementById('formulaModal').classList.remove('show');
    document.getElementById('formulaForm').reset();
    const container = document.getElementById('medicamentos-container');
    container.innerHTML = `
        <div class="medicamento-row">
            <input type="text" placeholder="Medicamento" class="medicamento-nombre">
            <input type="text" placeholder="Dosis" class="medicamento-dosis">
            <input type="text" placeholder="Frecuencia" class="medicamento-frecuencia">
            <input type="text" placeholder="Duración" class="medicamento-duracion">
            <button type="button" class="btn-remove" onclick="eliminarMedicamento(this)">×</button>
        </div>
    `;
}

async function guardarFormula() {
    if (!pacienteActual) {
        alert('Error: No hay paciente seleccionado');
        return;
    }

    const fecha = document.getElementById('fechaFormula').value;
    const indicaciones = document.getElementById('indicaciones').value;
    
    if (!fecha) {
        alert('Debe seleccionar la fecha');
        return;
    }

    const medicamentos = [];
    const filas = document.querySelectorAll('.medicamento-row');
    
    filas.forEach(fila => {
        const nombre = fila.querySelector('.medicamento-nombre').value;
        const dosis = fila.querySelector('.medicamento-dosis').value;
        const frecuencia = fila.querySelector('.medicamento-frecuencia').value;
        const duracion = fila.querySelector('.medicamento-duracion').value;
        
        if (nombre && dosis && frecuencia) {
            medicamentos.push({ nombre, dosis, frecuencia, duracion });
        }
    });

    if (medicamentos.length === 0) {
        alert('Debe agregar al menos un medicamento');
        return;
    }

    const usuario = JSON.parse(localStorage.getItem('usuario'));

    const formula = {
        paciente_id: pacienteActual.id,
        medico_id: usuario.medico_id,
        fecha: fecha,
        medicamentos: medicamentos,
        indicaciones: indicaciones
    };

    try {
        const response = await fetch(`${API_BASE_URL}/medico/formulas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formula)
        });

        const data = await response.json();
        
        if (data.success) {
            alert('✅ Fórmula guardada exitosamente');
            cerrarModal();
            cargarFormulas(pacienteActual.id);
        } else {
            alert('❌ Error al guardar la fórmula');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    }
}

window.imprimirFormula = function(id) {
    alert('Función de impresión en desarrollo');
};

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}
