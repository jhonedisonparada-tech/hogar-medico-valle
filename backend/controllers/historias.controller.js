const pool = require('../config/db');

// ============================================
// OBTENER TODAS LAS HISTORIAS (para dashboard)
// ============================================
exports.obtenerTodasHistorias = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.id, h.fecha, h.paciente_id, h.medico_id,
                   p.nombre AS paciente_nombre,
                   m.nombre AS medico_nombre
            FROM historias_clinicas h
            LEFT JOIN pacientes p ON h.paciente_id = p.id
            LEFT JOIN medicos   m ON h.medico_id   = m.id
            ORDER BY h.fecha DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerTodasHistorias:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ============================================
// OBTENER HISTORIAS POR PACIENTE
// ============================================
exports.obtenerHistoriasPorPaciente = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const usuario = req.usuario;

        // Si es Paciente, solo puede ver sus propias historias
        if (usuario.rol === 'Paciente' && usuario.paciente_id != pacienteId) {
            return res.status(403).json({ success: false, message: 'No autorizado.' });
        }

        const [rows] = await pool.query(`
            SELECT h.*,
                   p.nombre AS paciente_nombre,
                   m.nombre AS medico_nombre
            FROM historias_clinicas h
            LEFT JOIN pacientes p ON h.paciente_id = p.id
            LEFT JOIN medicos   m ON h.medico_id   = m.id
            WHERE h.paciente_id = ?
            ORDER BY h.fecha DESC
        `, [pacienteId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerHistoriasPorPaciente:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ============================================
// OBTENER HISTORIA POR ID
// ============================================
exports.obtenerHistoriaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT h.*,
                   p.nombre AS paciente_nombre,
                   m.nombre AS medico_nombre
            FROM historias_clinicas h
            LEFT JOIN pacientes p ON h.paciente_id = p.id
            LEFT JOIN medicos   m ON h.medico_id   = m.id
            WHERE h.id = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Historia no encontrada' });
        }
        // Si es Paciente, verificar que sea suya
        const usuario = req.usuario;
        if (usuario.rol === 'Paciente' && usuario.paciente_id != rows[0].paciente_id) {
            return res.status(403).json({ success: false, message: 'No autorizado.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error en obtenerHistoriaPorId:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// OBTENER HISTORIAS POR MÉDICO
// ============================================
exports.obtenerHistoriasPorMedico = async (req, res) => {
    try {
        const { medicoId } = req.params;
        const [rows] = await pool.query(`
            SELECT h.*,
                   p.nombre  AS paciente_nombre,
                   p.documento AS paciente_documento
            FROM historias_clinicas h
            JOIN pacientes p ON h.paciente_id = p.id
            WHERE h.medico_id = ?
            ORDER BY h.fecha DESC
        `, [medicoId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerHistoriasPorMedico:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// CREAR NUEVA HISTORIA
// ============================================
exports.crearHistoria = async (req, res) => {
    try {
        const {
            paciente_id, cita_id, medico_id, motivo_consulta, sintomas,
            diagnostico, tratamiento, observaciones, presion_arterial,
            temperatura, peso, altura, frecuencia_cardiaca, frecuencia_respiratoria,
            talla, imc, enfermedad_actual, examen_fisico_cabeza, examen_fisico_orl,
            examen_fisico_cuello, examen_fisico_cardiopulmonar, examen_fisico_abdomen,
            examen_fisico_genitourinario, examen_fisico_extremidades, examen_fisico_snc,
            analisis, conducta
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO historias_clinicas
            (paciente_id, cita_id, medico_id, fecha, motivo_consulta, sintomas,
             diagnostico, tratamiento, observaciones, presion_arterial,
             temperatura, peso, altura, frecuencia_cardiaca, frecuencia_respiratoria,
             talla, imc, enfermedad_actual, examen_fisico_cabeza, examen_fisico_orl,
             examen_fisico_cuello, examen_fisico_cardiopulmonar, examen_fisico_abdomen,
             examen_fisico_genitourinario, examen_fisico_extremidades, examen_fisico_snc,
             analisis, conducta, created_at, updated_at)
            VALUES (?,?,?,NOW(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
            [paciente_id, cita_id || null, medico_id, motivo_consulta, sintomas || null,
             diagnostico, tratamiento || null, observaciones || null, presion_arterial || null,
             temperatura || null, peso || null, altura || null, frecuencia_cardiaca || null,
             frecuencia_respiratoria || null, talla || null, imc || null,
             enfermedad_actual || null, examen_fisico_cabeza || null, examen_fisico_orl || null,
             examen_fisico_cuello || null, examen_fisico_cardiopulmonar || null,
             examen_fisico_abdomen || null, examen_fisico_genitourinario || null,
             examen_fisico_extremidades || null, examen_fisico_snc || null,
             analisis || null, conducta || null]
        );

        res.status(201).json({
            success: true,
            message: 'Historia clínica creada exitosamente',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error en crearHistoria:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// ACTUALIZAR HISTORIA (solo médicos, con restricción de 48h y estado)
// ============================================
exports.actualizarHistoria = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Obtener la historia actual para verificar su fecha de creación y posible estado
        const [historiaRows] = await pool.query(
            `SELECT created_at, COALESCE(estado, 'Abierta') as estado 
             FROM historias_clinicas WHERE id = ?`,
            [id]
        );
        
        if (historiaRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Historia no encontrada' });
        }
        
        const historia = historiaRows[0];
        const createdAt = new Date(historia.created_at);
        const ahora = new Date();
        const diferenciaHoras = (ahora - createdAt) / (1000 * 60 * 60);
        
        // Validación por tiempo
        if (diferenciaHoras > 48) {
            return res.status(403).json({
                success: false,
                message: 'No se puede modificar una historia clínica después de 48 horas de su creación.'
            });
        }
        
        // Validación por estado (si existe el campo)
        if (historia.estado === 'Cerrada') {
            return res.status(403).json({
                success: false,
                message: 'No se puede modificar una historia clínica que ya ha sido cerrada.'
            });
        }
        
        // 2. Proceder con la actualización
        const {
            motivo_consulta, sintomas, diagnostico, tratamiento, observaciones,
            presion_arterial, temperatura, peso, altura, frecuencia_cardiaca,
            frecuencia_respiratoria, talla, imc, enfermedad_actual,
            examen_fisico_cabeza, examen_fisico_orl, examen_fisico_cuello,
            examen_fisico_cardiopulmonar, examen_fisico_abdomen,
            examen_fisico_genitourinario, examen_fisico_extremidades, examen_fisico_snc,
            analisis, conducta
        } = req.body;

        await pool.query(
            `UPDATE historias_clinicas SET
             motivo_consulta=?, sintomas=?, diagnostico=?, tratamiento=?,
             observaciones=?, presion_arterial=?, temperatura=?, peso=?,
             altura=?, frecuencia_cardiaca=?, frecuencia_respiratoria=?,
             talla=?, imc=?, enfermedad_actual=?,
             examen_fisico_cabeza=?, examen_fisico_orl=?, examen_fisico_cuello=?,
             examen_fisico_cardiopulmonar=?, examen_fisico_abdomen=?,
             examen_fisico_genitourinario=?, examen_fisico_extremidades=?,
             examen_fisico_snc=?, analisis=?, conducta=?, updated_at=NOW()
             WHERE id=?`,
            [motivo_consulta, sintomas || null, diagnostico, tratamiento || null,
             observaciones || null, presion_arterial || null, temperatura || null,
             peso || null, altura || null, frecuencia_cardiaca || null,
             frecuencia_respiratoria || null, talla || null, imc || null,
             enfermedad_actual || null, examen_fisico_cabeza || null,
             examen_fisico_orl || null, examen_fisico_cuello || null,
             examen_fisico_cardiopulmonar || null, examen_fisico_abdomen || null,
             examen_fisico_genitourinario || null, examen_fisico_extremidades || null,
             examen_fisico_snc || null, analisis || null, conducta || null, id]
        );

        res.json({ success: true, message: 'Historia actualizada correctamente' });
    } catch (error) {
        console.error('Error en actualizarHistoria:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};