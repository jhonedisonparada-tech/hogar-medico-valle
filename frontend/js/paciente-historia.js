const API_BASE_URL = 'http://localhost:5000/api';
let pacienteData = null;
let historiasData = [];
let historiaSeleccionada = null;

document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token || usuario.rol !== 'Paciente') { window.location.href = 'login.html'; return; }

    document.getElementById('userName').textContent = usuario.nombre || 'Paciente';
    document.getElementById('fechaActual').textContent = new Date().toLocaleDateString('es-ES', {
        weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });
    document.getElementById('cerrarModal').addEventListener('click', () => document.getElementById('modalDetalle').style.display = 'none');
    document.getElementById('cerrarModal2').addEventListener('click', () => document.getElementById('modalDetalle').style.display = 'none');
    document.getElementById('btnDescargarUna').addEventListener('click', () => { if (historiaSeleccionada) descargarPDF(historiaSeleccionada); });
    document.getElementById('btnDescargarTodo').addEventListener('click', descargarTodo);

    await cargarDatos(usuario);
});

async function cargarDatos(usuario) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
const paciente = usuario;
paciente.id = usuario.paciente_id;
if (!paciente.id) return;
        pacienteData = paciente;
        mostrarInfoPaciente(paciente);

        const resHistorias = await fetch(`${API_BASE_URL}/historias/paciente/${paciente.id}`, { headers });
        const dataHistorias = await resHistorias.json();
        historiasData = dataHistorias.data || [];
        document.getElementById('totalConsultas').textContent = `${historiasData.length} consulta(s)`;
        renderHistorias(historiasData);
    } catch (error) {
        console.error('Error:', error);
    }
}

function mostrarInfoPaciente(p) {
    document.getElementById('infoPacienteCard').style.display = 'block';
    document.getElementById('pacNombre').textContent = p.nombre;
    document.getElementById('pacDocumento').textContent = p.documento;
    document.getElementById('pacEdad').textContent = calcularEdad(p.fecha_nacimiento);
    document.getElementById('pacGenero').textContent = p.genero === 'F' ? 'Femenino' : 'Masculino';
    document.getElementById('pacTelefono').textContent = p.telefono;
    document.getElementById('pacEmail').textContent = p.email || '-';
}

function calcularEdad(fechaNac) {
    if (!fechaNac) return '-';
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() - nac.getMonth() === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad + ' años';
}

function renderHistorias(historias) {
    const container = document.getElementById('historiasContainer');
    if (!historias.length) {
        container.innerHTML = '<p class="loading-msg">No hay consultas registradas</p>';
        return;
    }
    container.innerHTML = historias.map(h => `
        <div class="historia-card">
            <div class="historia-card-header">
                <div>
                    <div class="fecha"><i class="far fa-calendar-alt"></i> ${new Date(h.fecha).toLocaleDateString('es-ES', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</div>
                    <div class="medico"><i class="fas fa-user-md"></i> ${h.medico_nombre || '-'}</div>
                </div>
                <span class="badge badge-completada">Completada</span>
            </div>
            <div class="historia-card-body">
                <div class="historia-field">
                    <div class="historia-field-label">Motivo de consulta</div>
                    <div class="historia-field-value">${h.motivo_consulta || '-'}</div>
                </div>
                <div class="historia-field">
                    <div class="historia-field-label">Diagnóstico</div>
                    <div class="historia-field-value">${h.diagnostico || '-'}</div>
                </div>
                ${h.tratamiento ? `<div class="historia-field">
                    <div class="historia-field-label">Tratamiento</div>
                    <div class="historia-field-value">${h.tratamiento}</div>
                </div>` : ''}
            </div>
            <div class="historia-card-footer">
                <button class="btn-ver-detalle" onclick="verDetalle(${h.id})"><i class="fas fa-eye"></i> Ver detalle</button>
                <button class="btn-descargar" onclick="descargarPDF(${h.id})"><i class="fas fa-download"></i> Descargar PDF</button>
            </div>
        </div>
    `).join('');
}

window.verDetalle = function(id) {
    const h = historiasData.find(x => x.id === id);
    if (!h) return;
    historiaSeleccionada = id;
    document.getElementById('detalleBody').innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="historia-field"><div class="historia-field-label">Fecha</div><div class="historia-field-value">${new Date(h.fecha).toLocaleDateString('es-ES')}</div></div>
            <div class="historia-field"><div class="historia-field-label">Médico</div><div class="historia-field-value">${h.medico_nombre || '-'}</div></div>
            <div class="historia-field"><div class="historia-field-label">Presión Arterial</div><div class="historia-field-value">${h.presion_arterial || '-'}</div></div>
            <div class="historia-field"><div class="historia-field-label">Temperatura</div><div class="historia-field-value">${h.temperatura ? h.temperatura + '°C' : '-'}</div></div>
            <div class="historia-field"><div class="historia-field-label">Peso</div><div class="historia-field-value">${h.peso ? h.peso + ' kg' : '-'}</div></div>
            <div class="historia-field"><div class="historia-field-label">Talla</div><div class="historia-field-value">${h.talla ? h.talla + ' cm' : '-'}</div></div>
        </div>
        <hr style="margin:16px 0; border:none; border-top:1px solid #e2e8f0;">
        <div class="historia-field"><div class="historia-field-label">Motivo de consulta</div><div class="historia-field-value">${h.motivo_consulta || '-'}</div></div>
        <div class="historia-field"><div class="historia-field-label">Enfermedad actual</div><div class="historia-field-value">${h.enfermedad_actual || '-'}</div></div>
        <div class="historia-field"><div class="historia-field-label">Diagnóstico</div><div class="historia-field-value">${h.diagnostico || '-'}</div></div>
        <div class="historia-field"><div class="historia-field-label">Tratamiento</div><div class="historia-field-value">${h.tratamiento || '-'}</div></div>
        <div class="historia-field"><div class="historia-field-label">Análisis</div><div class="historia-field-value">${h.analisis || '-'}</div></div>
        <div class="historia-field"><div class="historia-field-label">Conducta</div><div class="historia-field-value">${h.conducta || '-'}</div></div>
        <div class="historia-field"><div class="historia-field-label">Observaciones</div><div class="historia-field-value">${h.observaciones || '-'}</div></div>
    `;
    document.getElementById('modalDetalle').style.display = 'flex';
};

window.descargarPDF = function(id) {
    const h = historiasData.find(x => x.id === id);
    if (!h || !pacienteData) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margen = 20;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HOGAR MÉDICO DEL VALLE', margen, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Historia Clínica', margen, y);
    y += 12;

    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(0.5);
    doc.line(margen, y, 190, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL PACIENTE', margen, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${pacienteData.nombre}`, margen, y); y += 6;
    doc.text(`Documento: ${pacienteData.documento}`, margen, y); y += 6;
    doc.text(`Fecha de consulta: ${new Date(h.fecha).toLocaleDateString('es-ES')}`, margen, y); y += 6;
    doc.text(`Médico: ${h.medico_nombre || '-'}`, margen, y); y += 10;

    doc.line(margen, y, 190, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONSULTA', margen, y); y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const campos = [
        ['Motivo de consulta', h.motivo_consulta],
        ['Diagnóstico', h.diagnostico],
        ['Tratamiento', h.tratamiento],
        ['Análisis', h.analisis],
        ['Conducta', h.conducta],
        ['Observaciones', h.observaciones]
    ];

    campos.forEach(([label, valor]) => {
        if (valor) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, margen, y); y += 6;
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(valor, 165);
            doc.text(lines, margen + 5, y);
            y += lines.length * 6 + 4;
        }
    });

    doc.save(`historia_clinica_${pacienteData.nombre.replace(/ /g,'_')}_${new Date(h.fecha).toLocaleDateString('es-ES').replace(/\//g,'-')}.pdf`);
};


function descargarTodo() {
    if (!historiasData.length) { alert('No hay historias para descargar'); return; }
    historiasData.forEach(h => descargarPDF(h.id));
}