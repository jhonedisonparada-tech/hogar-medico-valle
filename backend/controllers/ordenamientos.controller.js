const pool = require('../config/db');

exports.obtenerOrdenamientosPorHistoria = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT o.*, p.nombre as paciente_nombre, m.nombre as medico_nombre
             FROM ordenamientos o
             LEFT JOIN pacientes p ON o.paciente_id = p.id
             LEFT JOIN medicos m ON o.medico_id = m.id
             WHERE o.historia_id = ?
             ORDER BY o.fecha DESC`,
            [req.params.historiaId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.crearOrdenamiento = async (req, res) => {
    try {
        const { paciente_id, medico_id, historia_id, descripcion, observaciones } = req.body;
        
        const [result] = await pool.query(
            "INSERT INTO ordenamientos (paciente_id, medico_id, historia_id, descripcion, observaciones, fecha) VALUES (?, ?, ?, ?, ?, NOW())",
            [paciente_id, medico_id, historia_id, descripcion, observaciones]
        );
        
        res.json({ success: true, message: "Ordenamiento creado", id: result.insertId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.eliminarOrdenamiento = async (req, res) => {
    try {
        await pool.query("DELETE FROM ordenamientos WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Ordenamiento eliminado" });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};