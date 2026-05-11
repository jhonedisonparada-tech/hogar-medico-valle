const pool = require('../config/db');

// Obtener medicamentos (filtro opcional por historia_id o paciente_id)
exports.obtenerMedicamentos = async (req, res) => {
    try {
        const { historia_id, paciente_id } = req.query;
        let query = `
            SELECT mr.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
            FROM medicamentos_recetados mr
            LEFT JOIN pacientes p ON mr.paciente_id = p.id
            LEFT JOIN medicos   m ON mr.medico_id   = m.id
        `;
        const params = [];
        if (historia_id) {
            query += ' WHERE mr.historia_id = ?';
            params.push(historia_id);
        } else if (paciente_id) {
            query += ' WHERE mr.paciente_id = ?';
            params.push(paciente_id);
        }
        query += ' ORDER BY mr.fecha DESC';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerMedicamentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Crear un nuevo medicamento recetado
exports.crearMedicamento = async (req, res) => {
    try {
        const { paciente_id, medico_id, historia_id, medicamento,
                dosis, frecuencia, duracion, indicaciones } = req.body;
        const [result] = await pool.query(
            `INSERT INTO medicamentos_recetados
             (paciente_id, medico_id, historia_id, medicamento, dosis, frecuencia, duracion, indicaciones, fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, historia_id || null, medicamento,
             dosis || null, frecuencia || null, duracion || null, indicaciones || null]
        );
        res.json({ success: true, message: 'Medicamento agregado', id: result.insertId });
    } catch (error) {
        console.error('Error en crearMedicamento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Eliminar un medicamento
exports.eliminarMedicamento = async (req, res) => {
    try {
        await pool.query('DELETE FROM medicamentos_recetados WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Medicamento eliminado' });
    } catch (error) {
        console.error('Error en eliminarMedicamento:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};