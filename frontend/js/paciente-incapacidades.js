const API_URL = 'http://localhost:3000/api';
let pacienteData = null;
let incapacidadesData = [];

function toast(mensaje, tipo='success') {
    const t = document.createElement('div');
    t.className = `toast toast-${tipo}`;
    t.innerHTML = `<i class="fas fa-${tipo==='success'?'check-circle':tipo==='error'?'times-circle':'exclamation-circle'}"></i> ${mensaje}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token || usuario.rol !== 'Paciente') { window.location.href = 'login.html'; return; }

    document.getElementById('userName').textContent = usuario.nombre || 'Paciente';
    document.getElementById('fechaActual').textContent = new Date().toLocaleDateString('es-ES', {
        weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
    document.getElementById('logoutBtn').addEventListener('click', () => { localStorage.clear(); window.location.href = 'login.html'; });

    await cargarDatos(usuario);
});

async function cargarDatos(usuario) {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
        const resPacientes = await fetch(`${API_URL}/pacientes`, { headers });
        const dataPacientes = await resPacientes.json();
        const paciente = dataPacientes.data?.find(p => p.email === usuario.email);
        if (!paciente) return;
        pacienteData = paciente;

        const resInc = await fetch(`${API_URL}/incapacidades/paciente/${paciente.id}`, { headers });
        const dataInc = await resInc.json();
        incapacidadesData = dataInc.data || [];
        document.getElementById('totalIncapacidades').textContent = `${incapacidadesData.length} incapacidad(es)`;
        renderIncapacidades(incapacidadesData);
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderIncapacidades(lista) {
    const tbody = document.getElementById('incapacidadesBody');
    if (!lista.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-msg">No hay incapacidades registradas</td></tr>';
        return;
    }
    tbody.innerHTML = lista.map(i => `
        <tr>
            <td>${new Date(i.fecha).toLocaleDateString('es-ES')}</td>
            <td>${i.diagnostico}</td>
            <td><strong>${i.dias_incapacidad} días</strong></td>
            <td>${new Date(i.fecha_inicio).toLocaleDateString('es-ES')}</td>
            <td>${i.fecha_fin ? new Date(i.fecha_fin).toLocaleDateString('es-ES') : '-'}</td>
            <td>${i.medico_nombre || '-'}</td>
            <td>
                <button class="btn-descargar" onclick="descargarPDF(${i.id})">
                    <i class="fas fa-download"></i> Descargar
                </button>
            </td>
        </tr>
    `).join('');
}

window.descargarPDF = function(id) {
    const i = incapacidadesData.find(x => x.id === id);
    if (!i || !pacienteData) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margen = 20;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HOGAR MÉDICO DEL VALLE', margen, y); y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Certificado de Incapacidad Médica', margen, y); y += 12;

    doc.setDrawColor(52, 152, 219);
    doc.setLineWidth(0.5);
    doc.line(margen, y, 190, y); y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DATOS DEL PACIENTE', margen, y); y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nombre: ${pacienteData.nombre}`, margen, y); y += 6;
    doc.text(`Documento: ${pacienteData.documento}`, margen, y); y += 6;
    doc.text(`Médico tratante: ${i.medico_nombre || '-'}`, margen, y); y += 10;

    doc.line(margen, y, 190, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DATOS DE LA INCAPACIDAD', margen, y); y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Diagnóstico: ${i.diagnostico}`, margen, y); y += 6;
    doc.text(`Días de incapacidad: ${i.dias_incapacidad} días`, margen, y); y += 6;
    doc.text(`Fecha inicio: ${new Date(i.fecha_inicio).toLocaleDateString('es-ES')}`, margen, y); y += 6;
    doc.text(`Fecha fin: ${i.fecha_fin ? new Date(i.fecha_fin).toLocaleDateString('es-ES') : '-'}`, margen, y); y += 6;
    if (i.observaciones) {
        doc.text(`Observaciones: ${i.observaciones}`, margen, y); y += 6;
    }
    y += 20;
    doc.line(margen, y, 100, y); y += 6;
    doc.text('Firma del Médico', margen, y);

    doc.save(`incapacidad_${pacienteData.nombre.replace(/ /g,'_')}_${new Date(i.fecha).toLocaleDateString('es-ES').replace(/\//g,'-')}.pdf`);
    toast('Incapacidad descargada correctamente');
};