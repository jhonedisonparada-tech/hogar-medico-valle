const API_BASE_URL = 'http://localhost:5000/api';
let pacienteData = null;
let formulasData = [];

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

        const resForm = await fetch(`${API_BASE_URL}/incapacidades/paciente/${paciente.id}`, { headers });

        const resMeds = await fetch(`${API_BASE_URL}/medico/formulas/${paciente.id}`, { headers });
        const dataMeds = await resMeds.json();
        formulasData = dataMeds.data || [];
        renderFormulas(formulasData);
    } catch (error) {
        document.getElementById('formulasContainer').innerHTML = '<p class="loading-msg">Error al cargar fórmulas</p>';
    }
}

function renderFormulas(formulas) {
    const container = document.getElementById('formulasContainer');
    if (!formulas.length) {
        container.innerHTML = `
            <div class="section-card">
                <p class="loading-msg"><i class="fas fa-pills"></i> No hay fórmulas médicas registradas</p>
            </div>`;
        return;
    }
    container.innerHTML = formulas.map(f => {
        let medicamentos = [];
       try { 
    medicamentos = typeof f.medicamentos === 'string' ? JSON.parse(f.medicamentos) : Array.isArray(f.medicamentos) ? f.medicamentos : [];
} catch(e) { medicamentos = []; }
        
        return `
        <div class="section-card" style="margin-bottom:20px;">
            <div class="section-header">
                <h3><i class="fas fa-prescription"></i> Fórmula del ${new Date(f.fecha).toLocaleDateString('es-ES', {year:'numeric', month:'long', day:'numeric'})}</h3>
                <button class="btn-descargar" onclick="descargarPDF(${f.id})">
                    <i class="fas fa-download"></i> Descargar PDF
                </button>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Medicamento</th>
                            <th>Dosis</th>
                            <th>Frecuencia</th>
                            <th>Duración</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${medicamentos.length ? medicamentos.map(m => `
                            <tr>
                                <td><strong>${m.nombre || m.medicamento || '-'}</strong></td>
                                <td>${m.dosis || '-'}</td>
                                <td>${m.frecuencia || '-'}</td>
                                <td>${m.duracion || '-'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="loading-msg">Sin medicamentos</td></tr>'}
                    </tbody>
                </table>
            </div>
            ${f.indicaciones ? `<div style="margin-top:12px; padding:12px; background:var(--gray-50); border-radius:8px; font-size:0.9rem; color:var(--gray-600);"><strong>Indicaciones:</strong> ${f.indicaciones}</div>` : ''}
        </div>`;
    }).join('');
}

window.descargarPDF = function(id) {
    const f = formulasData.find(x => x.id === id);
    if (!f || !pacienteData) return;

    let medicamentos = [];
  try { 
    medicamentos = typeof f.medicamentos === 'string' ? JSON.parse(f.medicamentos) : (f.medicamentos || []);
} catch(e) { medicamentos = []; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margen = 20;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HOGAR MÉDICO DEL VALLE', margen, y); y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Fórmula Médica', margen, y); y += 12;

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
    doc.text(`Fecha: ${new Date(f.fecha).toLocaleDateString('es-ES')}`, margen, y); y += 10;

    doc.line(margen, y, 190, y); y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('MEDICAMENTOS RECETADOS', margen, y); y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    medicamentos.forEach((m, idx) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx+1}. ${m.nombre || m.medicamento || '-'}`, margen, y); y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`   Dosis: ${m.dosis || '-'} | Frecuencia: ${m.frecuencia || '-'} | Duración: ${m.duracion || '-'}`, margen, y); y += 8;
    });

    if (f.indicaciones) {
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('Indicaciones:', margen, y); y += 6;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(f.indicaciones, 165);
        doc.text(lines, margen, y); y += lines.length * 6;
    }

    y += 20;
    doc.line(margen, y, 100, y); y += 6;
    doc.text('Firma del Médico', margen, y);

    doc.save(`formula_${pacienteData.nombre.replace(/ /g,'_')}_${new Date(f.fecha).toLocaleDateString('es-ES').replace(/\//g,'-')}.pdf`);
    toast('Fórmula descargada correctamente');
};