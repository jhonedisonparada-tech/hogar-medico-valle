document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Historias.js cargado correctamente');

    const API_BASE_URL = 'http://localhost:5000/api';
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
        } catch (e) {}
    }

    let pacienteActual = null;

    mostrarFecha();
    cargarPacientes();
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

    async function cargarPacientes() {
        try {
            const response = await fetch(`${API_BASE_URL}/pacientes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                const select = document.getElementById('pacienteId');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione un paciente</option>';
                    data.data.forEach(p => {
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
            const response = await fetchConAuth(`${API_BASE_URL}/medicos`);
            const data = await response.json();
            if (data.success) {
                const select = document.getElementById('historiaMedicoId');
                if (select) {
                    select.innerHTML = '<option value="">Seleccione médico</option>';
                    data.data.forEach(m => {
                        select.innerHTML += `<option value="${m.id}">${m.nombre} - ${m.especialidad_nombre || ''}</option>`;
                    });
                }
            }
        } catch (error) {
            console.error('Error cargando médicos:', error);
        }
    }

    function setupEventListeners() {
        const buscarPaciente = document.getElementById('buscarPaciente');
        const pacienteSelect = document.getElementById('pacienteId');
        const verHistoriaBtn = document.getElementById('verHistoriaBtn');
        const nuevaHistoriaBtn = document.getElementById('nuevaHistoriaBtn');
        const cancelarBtn = document.getElementById('cancelarNuevaHistoria');
        const agregarParaclinico = document.getElementById('agregarParaclinico');
        const agregarMedicamento = document.getElementById('agregarMedicamento');
        const incapacidadDias = document.getElementById('incapacidadDias');
        const incapacidadFechaInicio = document.getElementById('incapacidadFechaInicio');
        const pesoInput = document.getElementById('signosPeso');
        const tallaInput = document.getElementById('signosTalla');
        const limpiarBtn = document.getElementById('limpiarHistoria');
        const guardarBtn = document.getElementById('guardarHistoria');
        const imprimirBtn = document.getElementById('imprimirHistoria');
        const logoutBtn = document.getElementById('logoutBtn');

        if (buscarPaciente) {
            buscarPaciente.addEventListener('input', function() {
                filtrarPacientes(this.value);
            });
        }

        if (pacienteSelect) {
            pacienteSelect.addEventListener('change', function() {
                if (verHistoriaBtn) verHistoriaBtn.disabled = !this.value;
            });
        }

        if (verHistoriaBtn) {
            verHistoriaBtn.addEventListener('click', async function() {
                const pacienteId = pacienteSelect.value;
                if (pacienteId) await cargarInfoPaciente(parseInt(pacienteId));
            });
        }

        if (nuevaHistoriaBtn) {
            nuevaHistoriaBtn.addEventListener('click', function() {
                document.getElementById('historiaContainer').style.display = 'block';
                document.getElementById('historiaContainer').scrollIntoView({ behavior: 'smooth' });
            });
        }

        if (cancelarBtn) {
            cancelarBtn.addEventListener('click', function() {
                document.getElementById('historiaContainer').style.display = 'none';
                limpiarHistoria(true);
            });
        }

        if (agregarParaclinico) agregarParaclinico.addEventListener('click', agregarItemParaclinico);
        if (agregarMedicamento) agregarMedicamento.addEventListener('click', agregarItemMedicamento);
        if (incapacidadDias) incapacidadDias.addEventListener('input', calcularFechaFinIncapacidad);
        if (incapacidadFechaInicio) incapacidadFechaInicio.addEventListener('change', calcularFechaFinIncapacidad);
        if (pesoInput) pesoInput.addEventListener('input', calcularIMC);
        if (tallaInput) tallaInput.addEventListener('input', calcularIMC);
        if (limpiarBtn) limpiarBtn.addEventListener('click', () => limpiarHistoria(false));
        if (guardarBtn) guardarBtn.addEventListener('click', guardarHistoria);
        if (imprimirBtn) imprimirBtn.addEventListener('click', () => window.print());
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    function filtrarPacientes(termino) {
        const select = document.getElementById('pacienteId');
        if (!select) return;
        const busqueda = termino.toLowerCase();
        Array.from(select.options).forEach((opt, i) => {
            if (i === 0) return;
            opt.style.display = opt.text.toLowerCase().includes(busqueda) ? '' : 'none';
        });
    }

    async function cargarInfoPaciente(pacienteId) {
        try {
            const response = await fetchConAuth(`${API_BASE_URL}/pacientes/${pacienteId}`);
            const data = await response.json();
            if (!data.success) return;

            pacienteActual = data.data;

            document.getElementById('pacienteNombre').textContent = pacienteActual.nombre;
            document.getElementById('pacienteDocumento').textContent = pacienteActual.documento;
            document.getElementById('pacienteEdad').textContent = calcularEdad(pacienteActual.fecha_nacimiento);
            document.getElementById('pacienteGenero').textContent = pacienteActual.genero === 'F' ? 'Femenino' : 'Masculino';
            document.getElementById('pacienteTelefono').textContent = pacienteActual.telefono || '-';

            document.getElementById('pacienteInfoContainer').style.display = 'block';
            document.getElementById('historiaContainer').style.display = 'none';

            await cargarHistoriasPaciente(pacienteId);

        } catch (error) {
            console.error('Error cargando paciente:', error);
            alert('Error al cargar el paciente');
        }
    }

    async function cargarHistoriasPaciente(pacienteId) {
        const tbody = document.getElementById('historiasTableBody');
        const totalSpan = document.getElementById('totalHistorias');
        if (!tbody) return;

        try {
            const response = await fetch(`${API_BASE_URL}/historias/paciente/${pacienteId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                if (totalSpan) totalSpan.textContent = `${data.data.length} historia(s) encontrada(s)`;
                tbody.innerHTML = data.data.map(h => {
                    const fecha = new Date(h.fecha).toLocaleDateString('es-ES');
                    return `
                        <tr>
                            <td><strong>${fecha}</strong></td>
                            <td>${h.medico_nombre || '-'}</td>
                            <td>${h.diagnostico || '-'}</td>
                            <td>${h.motivo_consulta || '-'}</td>
                            <td>
                                <button class="action-btn" onclick="imprimirHistoria(${h.id})" title="Imprimir historia">
                                    <i class="fas fa-print"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                if (totalSpan) totalSpan.textContent = '0 historias encontradas';
                tbody.innerHTML = '<tr><td colspan="5">No se encontraron historias</td></tr>';
            }
        } catch (error) {
            console.error('Error cargando historias:', error);
            tbody.innerHTML = '<tr><td colspan="5">Error al cargar historias</td></tr>';
        }
    }

    function imprimirHistoria(id) {
        window.open(`${API_BASE_URL}/historias/${id}/imprimir`, '_blank');
    }

    function calcularEdad(fechaNac) {
        if (!fechaNac) return 'No registrada';
        const hoy = new Date();
        const nac = new Date(fechaNac);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const mes = hoy.getMonth() - nac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
        return `${edad} años`;
    }

    function calcularIMC() {
        const peso = parseFloat(document.getElementById('signosPeso')?.value);
        const talla = parseFloat(document.getElementById('signosTalla')?.value) / 100;
        const imcInput = document.getElementById('signosIMC');
        if (peso && talla && talla > 0) {
            if (imcInput) imcInput.value = (peso / (talla * talla)).toFixed(2);
        } else {
            if (imcInput) imcInput.value = '';
        }
    }

    function calcularFechaFinIncapacidad() {
        const dias = parseInt(document.getElementById('incapacidadDias')?.value) || 0;
        const fechaInicio = document.getElementById('incapacidadFechaInicio')?.value;
        const fechaFin = document.getElementById('incapacidadFechaFin');
        if (dias > 0 && fechaInicio && fechaFin) {
            const fecha = new Date(fechaInicio);
            fecha.setDate(fecha.getDate() + dias);
            fechaFin.value = fecha.toISOString().split('T')[0];
        }
    }

    function agregarItemParaclinico() {
        const container = document.getElementById('paraclinicos-container');
        const div = document.createElement('div');
        div.className = 'item-row';
        div.style.cssText = 'display:flex; gap:10px; margin-bottom:10px; align-items:center;';
        div.innerHTML = `
            <input type="text" class="item-input" placeholder="Ej: Hemograma completo"
                style="flex:1; padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
            <button onclick="eliminarItem(this)"
                style="background:#ef4444; color:#fff; border:none; padding:10px 14px; border-radius:8px; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }

    function agregarItemMedicamento() {
        const container = document.getElementById('medicamentos-container');
        const div = document.createElement('div');
        div.className = 'item-row medicamento-row';
        div.style.cssText = 'display:grid; grid-template-columns:3fr 1fr 1fr 1fr auto; gap:10px; margin-bottom:10px; align-items:center;';
        div.innerHTML = `
            <input type="text" class="item-input" placeholder="Medicamento"
                style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
            <input type="text" class="item-input" placeholder="Dosis"
                style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
            <input type="text" class="item-input" placeholder="Frecuencia"
                style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
            <input type="text" class="item-input" placeholder="Duración"
                style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
            <button onclick="eliminarItem(this)"
                style="background:#ef4444; color:#fff; border:none; padding:10px 14px; border-radius:8px; cursor:pointer;">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }

    window.eliminarItem = function(boton) {
        boton.parentElement.remove();
    };

    function limpiarHistoria(sinConfirmar = false) {
        if (!sinConfirmar && !confirm('¿Está seguro de limpiar todos los campos?')) return;

        const campos = [
            'historiaMedicoId', 'historiaDiagnostico', 'historiaMotivo', 'historiaEnfermedad',
            'examenCabeza', 'examenORL', 'examenCuello', 'examenCardiopulmonar',
            'examenAbdomen', 'examenGenitourinario', 'examenExtremidades', 'examenSNC',
            'signosPA', 'signosFC', 'signosFR', 'signosPeso', 'signosTalla', 'signosIMC',
            'analisisTexto', 'conductaTexto', 'incapacidadDias', 'incapacidadFechaInicio',
            'incapacidadFechaFin', 'incapacidadObservaciones'
        ];
        campos.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = id === 'incapacidadDias' ? '0' : '';
        });

        const paraContainer = document.getElementById('paraclinicos-container');
        if (paraContainer) {
            paraContainer.innerHTML = `
                <div class="item-row" style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                    <input type="text" class="item-input" placeholder="Ej: Hemograma completo"
                        style="flex:1; padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
                    <button onclick="eliminarItem(this)"
                        style="background:#ef4444; color:#fff; border:none; padding:10px 14px; border-radius:8px; cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }

        const medContainer = document.getElementById('medicamentos-container');
        if (medContainer) {
            medContainer.innerHTML = `
                <div class="item-row medicamento-row" style="display:grid; grid-template-columns:3fr 1fr 1fr 1fr auto; gap:10px; margin-bottom:10px; align-items:center;">
                    <input type="text" class="item-input" placeholder="Medicamento"
                        style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
                    <input type="text" class="item-input" placeholder="Dosis"
                        style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
                    <input type="text" class="item-input" placeholder="Frecuencia"
                        style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
                    <input type="text" class="item-input" placeholder="Duración"
                        style="padding:12px; border:2px solid #e2e8f0; border-radius:10px; font-size:0.95rem;">
                    <button onclick="eliminarItem(this)"
                        style="background:#ef4444; color:#fff; border:none; padding:10px 14px; border-radius:8px; cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    }

    async function guardarHistoria() {
        if (!pacienteActual) {
            alert('No hay paciente seleccionado');
            return;
        }

        const medicoId = document.getElementById('historiaMedicoId')?.value;
        if (!medicoId) {
            alert('Por favor seleccione un médico');
            return;
        }

        const paraclinicos = [];
        document.querySelectorAll('#paraclinicos-container .item-input').forEach(input => {
            if (input.value.trim()) paraclinicos.push(input.value.trim());
        });

        const medicamentos = [];
        document.querySelectorAll('#medicamentos-container .medicamento-row').forEach(row => {
            const inputs = row.querySelectorAll('.item-input');
            if (inputs[0]?.value.trim()) {
                medicamentos.push({
                    medicamento: inputs[0].value.trim(),
                    dosis: inputs[1]?.value.trim() || '',
                    frecuencia: inputs[2]?.value.trim() || '',
                    duracion: inputs[3]?.value.trim() || ''
                });
            }
        });

        const historiaData = {
            paciente_id: pacienteActual.id,
            medico_id: medicoId,
            motivo_consulta: document.getElementById('historiaMotivo')?.value || '',
            diagnostico: document.getElementById('historiaDiagnostico')?.value || '',
            enfermedad_actual: document.getElementById('historiaEnfermedad')?.value || '',
            examen_fisico_cabeza: document.getElementById('examenCabeza')?.value || '',
            examen_fisico_orl: document.getElementById('examenORL')?.value || '',
            examen_fisico_cuello: document.getElementById('examenCuello')?.value || '',
            examen_fisico_cardiopulmonar: document.getElementById('examenCardiopulmonar')?.value || '',
            examen_fisico_abdomen: document.getElementById('examenAbdomen')?.value || '',
            examen_fisico_genitourinario: document.getElementById('examenGenitourinario')?.value || '',
            examen_fisico_extremidades: document.getElementById('examenExtremidades')?.value || '',
            examen_fisico_snc: document.getElementById('examenSNC')?.value || '',
            presion_arterial: document.getElementById('signosPA')?.value || '',
            frecuencia_cardiaca: document.getElementById('signosFC')?.value || null,
            frecuencia_respiratoria: document.getElementById('signosFR')?.value || null,
            peso: document.getElementById('signosPeso')?.value || null,
            talla: document.getElementById('signosTalla')?.value || null,
            imc: document.getElementById('signosIMC')?.value || null,
            analisis: document.getElementById('analisisTexto')?.value || '',
            conducta: document.getElementById('conductaTexto')?.value || ''
        };

        try {
            const response = await fetchConAuth(`${API_BASE_URL}/historias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(historiaData)
            });

            const data = await response.json();

            if (data.success) {
                const historiaId = data.id;

                for (const desc of paraclinicos) {
                    await fetchConAuth(`${API_BASE_URL}/ordenamientos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paciente_id: pacienteActual.id,
                            medico_id: medicoId,
                            historia_id: historiaId,
                            descripcion: desc
                        })
                    });
                }

                for (const med of medicamentos) {
                    await fetchConAuth(`${API_BASE_URL}/medicamentos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paciente_id: pacienteActual.id,
                            medico_id: medicoId,
                            historia_id: historiaId,
                            ...med
                        })
                    });
                }

                const dias = parseInt(document.getElementById('incapacidadDias')?.value) || 0;
                if (dias > 0) {
                    await fetchConAuth(`${API_BASE_URL}/incapacidades`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            paciente_id: pacienteActual.id,
                            medico_id: medicoId,
                            historia_id: historiaId,
                            dias_incapacidad: dias,
                            fecha_inicio: document.getElementById('incapacidadFechaInicio')?.value,
                            fecha_fin: document.getElementById('incapacidadFechaFin')?.value,
                            observaciones: document.getElementById('incapacidadObservaciones')?.value
                        })
                    });
                }

                alert('✅ Historia clínica guardada exitosamente');
                limpiarHistoria(true);
                document.getElementById('historiaContainer').style.display = 'none';
                await cargarHistoriasPaciente(pacienteActual.id);

            } else {
                throw new Error(data.message || 'Error al guardar');
            }
        } catch (error) {
            console.error('Error guardando historia:', error);
            alert('Error al guardar la historia clínica: ' + error.message);
        }
    }
});
