const API_BASE_URL = 'http://localhost:5000/api';
let pacienteData = null;
let examenesData = [];

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
       const paciente = { ...usuario, id: usuario.paciente_id };
       if (!paciente.id) return;
        pacienteData = paciente;

        const resOrden = await fetch(`${API_BASE_URL}/ordenamientos?paciente_id=${paciente.id}`, { headers });
        const dataOrden = await resOrden.json();
        examenesData = dataOrden.data || [];

        document.getElementById('totalExamenes').textContent = `${examenesData.length} orden(es)`;
        renderExamenes(examenesData);
    } catch (error) {
        document.getElementById('examenesBody').innerHTML =
            '<tr><td colspan="5" class="loading-msg">Error al cargar exámenes</td></tr>';
    }
}

function renderExamenes(examenes) {
    const tbody = document.getElementById('examenesBody');
    if (!examenes.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-msg"><i class="fas fa-flask"></i> No hay órdenes de exámenes registradas</td></tr>';
        return;
    }
    tbody.innerHTML = examenes.map(e => `
        <tr>
            <td>${new Date(e.fecha).toLocaleDateString('es-ES')}</td>
            <td><strong>${e.descripcion || '-'}</strong></td>
            <td>${e.observaciones || '-'}</td>
  <td><span class="badge badge-${e.estado ? e.estado.toLowerCase() : 'pendiente'}">${e.estado || 'Pendiente'}</span></td>
            <td>
                ${e.estado === 'Completado' ? 
                `<button class="btn-descargar" onclick="descargarOrden(${e.id})">
                    <i class="fas fa-download"></i> Descargar
                </button>` : 
                '<span style="color:var(--gray-400); font-size:0.85rem;">En espera de resultado</span>'}
            </td>
        </tr>
    `).join('');
}

window.descargarOrden = function(id) {
    const e = examenesData.find(x => x.id === id);
    if (!e || !pacienteData) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margen = 20;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HOGAR MÉDICO DEL VALLE', margen, y); y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Orden de Examen / Paraclínico', margen, y); y += 12;

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
    doc.text(`Fecha de orden: ${new Date(e.fecha).toLocaleDateString('es-ES')}`, margen, y); y += 10;

    doc.line(margen, y, 190, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('EXAMEN ORDENADO', margen, y); y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Examen: ${e.descripcion || '-'}`, margen, y); y += 6;

    if (e.observaciones) {
        doc.setFont('helvetica', 'bold');
        doc.text('Indicaciones:', margen, y); y += 6;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(e.observaciones, 165);
        doc.text(lines, margen, y); y += lines.length * 6 + 4;
    }

    y += 20;
    doc.line(margen, y, 100, y); y += 6;
    doc.text('Firma del Médico', margen, y);

    doc.save(`orden_examen_${pacienteData.nombre.replace(/ /g,'_')}_${new Date(e.fecha).toLocaleDateString('es-ES').replace(/\//g,'-')}.pdf`);
    toast('Orden descargada correctamente');
};