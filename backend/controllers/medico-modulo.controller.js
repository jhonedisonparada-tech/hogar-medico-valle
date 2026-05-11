const pool = require('../config/db');

// Pacientes atendidos por un médico
exports.obtenerPacientesPorMedico = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT p.*
            FROM citas c 
            JOIN pacientes p ON c.paciente_id = p.id
             WHERE c.medico_id = ?
            ORDER BY p.nombre
        `, [req.params.medicoId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerPacientesPorMedico:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Fórmulas médicas de un paciente (para el módulo médico)
exports.obtenerFormulasPorPaciente = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM formulas_medicas WHERE paciente_id = ? ORDER BY fecha DESC',
            [req.params.pacienteId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerFormulasPorPaciente:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Crear una nueva fórmula médica
exports.crearFormula = async (req, res) => {
    try {
        const { paciente_id, medico_id, fecha, medicamentos, indicaciones } = req.body;
        const [result] = await pool.query(
            `INSERT INTO formulas_medicas (paciente_id, medico_id, fecha, medicamentos, indicaciones, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, fecha, JSON.stringify(medicamentos), indicaciones || null]
        );
        res.json({ success: true, message: 'Fórmula guardada', id: result.insertId });
    } catch (error) {
        console.error('Error en crearFormula:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Historias clínicas de un paciente (vista para el médico)
exports.obtenerHistoriasPorPaciente = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.*, m.nombre AS medico_nombre
            FROM historias_clinicas h
            JOIN medicos m ON h.medico_id = m.id
            WHERE h.paciente_id = ?
            ORDER BY h.fecha DESC
        `, [req.params.pacienteId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerHistoriasPorPaciente:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Catálogo de exámenes
exports.obtenerCatalogoExamenes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM examenes WHERE activo = 1 ORDER BY nombre');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerCatalogoExamenes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};