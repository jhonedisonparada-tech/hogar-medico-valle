// ============================================
// ATENDER PACIENTE - HOGAR MÉDICO DEL VALLE
// ============================================

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', function () {
    const token   = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    // Verificar sesión y rol
    if (!token || usuario.rol !== 'Médico') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent    = usuario.nombre;
    document.getElementById('medicoNombre').textContent = usuario.nombre;

    // Leer pacienteId desde la URL
    const urlParams  = new URLSearchParams(window.location.search);
    const pacienteId = urlParams.get('paciente');
    const citaId     = urlParams.get('cita') || null;

    if (!pacienteId) {
        alert('No se especificó el paciente.');
        window.location.href = 'medico-dashboard.html';
        return;
    }

    // Cargar datos del paciente
    cargarPaciente(pacienteId, token);

    // Mostrar fecha actual
    document.getElementById('fechaConsulta').textContent =
        new Date().toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

    // Calcular IMC al cambiar peso o talla
    document.getElementById('signosPeso').addEventListener('input', calcularIMC);
    document.getElementById('signosTalla').addEventListener('input', calcularIMC);

    // Botón guardar consulta
    document.getElementById('guardarConsultaBtn').addEventListener('click', () =>
        guardarConsulta(pacienteId, citaId, usuario, token)
    );

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
});

// ============================================
// CARGAR DATOS DEL PACIENTE
// ============================================
async function cargarPaciente(pacienteId, token) {
    try {
        const res  = await fetch(`${API_URL}/pacientes/${pacienteId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
            const p = data.data;
            document.getElementById('pacienteNombre').textContent    = p.nombre;
            document.getElementById('pacienteDocumento').textContent = p.documento;
            document.getElementById('pacienteEdad').textContent      = calcularEdad(p.fecha_nacimiento);
            document.getElementById('pacienteGenero').textContent    =
                p.genero === 'F' ? 'Femenino' : 'Masculino';
            document.getElementById('pacienteTelefono').textContent  = p.telefono || '-';
            document.getElementById('pacienteEmail').textContent     = p.email    || '-';
        } else {
            alert('Error al cargar el paciente: ' + data.message);
        }
    } catch (err) {
        console.error('❌ Error cargando paciente:', err);
        alert('Error de conexión al cargar el paciente.');
    }
}

// ============================================
// CALCULAR IMC
// ============================================
function calcularIMC() {
    const peso  = parseFloat(document.getElementById('signosPeso').value);
    const talla = parseFloat(document.getElementById('signosTalla').value) / 100;
    if (peso && talla && talla > 0) {
        document.getElementById('signosImc').value = (peso / (talla * talla)).toFixed(2);
    } else {
        document.getElementById('signosImc').value = '';
    }
}

// ============================================
// CALCULAR EDAD
// ============================================
function calcularEdad(fechaNac) {
    if (!fechaNac) return 'No registrada';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad  = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad + ' años';
}

// ============================================
// GUARDAR CONSULTA (HISTORIA CLÍNICA)
// ============================================
async function guardarConsulta(pacienteId, citaId, usuario, token) {
    // Leer campos del formulario
    const motivo_consulta   = document.getElementById('motivoConsulta')?.value?.trim()   || '';
    const enfermedad_actual = document.getElementById('enfermedadActual')?.value?.trim() || '';
    const diagnostico       = document.getElementById('diagnostico')?.value?.trim()      || '';
    const tratamiento       = document.getElementById('tratamiento')?.value?.trim()      || '';
    const analisis          = document.getElementById('analisis')?.value?.trim()         || '';
    const conducta          = document.getElementById('conducta')?.value?.trim()         || '';
    const observaciones     = document.getElementById('observaciones')?.value?.trim()    || '';

    // Signos vitales
    const presion_arterial       = document.getElementById('signosPresion')?.value    || null;
    const temperatura            = document.getElementById('signosTemp')?.value       || null;
    const peso                   = document.getElementById('signosPeso')?.value       || null;
    const talla                  = document.getElementById('signosTalla')?.value      || null;
    const imc                    = document.getElementById('signosImc')?.value        || null;
    const frecuencia_cardiaca    = document.getElementById('signosFc')?.value         || null;
    const frecuencia_respiratoria= document.getElementById('signosFr')?.value         || null;

    // Examen físico (campos opcionales)
    const examen_fisico_cabeza         = document.getElementById('examCabeza')?.value         || null;
    const examen_fisico_orl            = document.getElementById('examOrl')?.value            || null;
    const examen_fisico_cuello         = document.getElementById('examCuello')?.value         || null;
    const examen_fisico_cardiopulmonar = document.getElementById('examCardio')?.value         || null;
    const examen_fisico_abdomen        = document.getElementById('examAbdomen')?.value        || null;
    const examen_fisico_genitourinario = document.getElementById('examGenito')?.value         || null;
    const examen_fisico_extremidades   = document.getElementById('examExtremidades')?.value   || null;
    const examen_fisico_snc            = document.getElementById('examSnc')?.value            || null;

    // Validar campos obligatorios
    if (!motivo_consulta) {
        alert('El motivo de consulta es obligatorio.');
        document.getElementById('motivoConsulta')?.focus();
        return;
    }
    if (!diagnostico) {
        alert('El diagnóstico es obligatorio.');
        document.getElementById('diagnostico')?.focus();
        return;
    }

    // Deshabilitar botón mientras se guarda
    const btn = document.getElementById('guardarConsultaBtn');
    btn.disabled   = true;
    btn.innerHTML  = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    const historia = {
        paciente_id:              parseInt(pacienteId),
        cita_id:                  citaId ? parseInt(citaId) : null,
        medico_id:                usuario.medico_id,
        motivo_consulta,
        enfermedad_actual,
        diagnostico,
        tratamiento,
        analisis,
        conducta,
        observaciones,
        presion_arterial,
        temperatura:              temperatura  ? parseFloat(temperatura)  : null,
        peso:                     peso         ? parseFloat(peso)         : null,
        altura:                   talla        ? parseFloat(talla)        : null,
        talla:                    talla        ? parseFloat(talla)        : null,
        imc:                      imc          ? parseFloat(imc)          : null,
        frecuencia_cardiaca:      frecuencia_cardiaca       ? parseInt(frecuencia_cardiaca)       : null,
        frecuencia_respiratoria:  frecuencia_respiratoria   ? parseInt(frecuencia_respiratoria)   : null,
        examen_fisico_cabeza,
        examen_fisico_orl,
        examen_fisico_cuello,
        examen_fisico_cardiopulmonar,
        examen_fisico_abdomen,
        examen_fisico_genitourinario,
        examen_fisico_extremidades,
        examen_fisico_snc
    };

    try {
        const res  = await fetch(`${API_URL}/historias`, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(historia)
        });

        const data = await res.json();

        if (data.success) {
            // Si viene de una cita, marcarla como completada
            if (citaId) {
                await fetch(`${API_URL}/citas/${citaId}/estado`, {
                    method:  'PATCH',
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ estado: 'Completada' })
                });
            }

            alert('✅ Consulta guardada correctamente.');
            window.location.href = `medico-historias.html?paciente=${pacienteId}`;
        } else {
            alert('❌ Error al guardar la consulta: ' + (data.message || 'Error desconocido'));
        }
    } catch (err) {
        console.error('❌ Error guardando consulta:', err);
        alert('❌ Error de conexión. Verifique que el servidor esté activo.');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Guardar Consulta';
    }
}
