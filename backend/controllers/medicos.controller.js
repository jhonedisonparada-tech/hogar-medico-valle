const pool = require('../config/db');

exports.obtenerMedicos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, e.nombre as especialidad_nombre 
            FROM medicos m
            LEFT JOIN especialidades e ON m.especialidad_id = e.id
            ORDER BY m.nombre
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.crearMedico = async (req, res) => {
    try {
        const { nombre, documento, telefono, email, especialidad, registro_medico, activo } = req.body;
        const [result] = await pool.query(
            'INSERT INTO medicos (nombre, documento, telefono, email, especialidad_id, registro_medico, activo) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, documento, telefono, email, especialidad, registro_medico, activo !== undefined ? activo : 1]
        );
        res.json({ success: true, message: 'Médico creado', id: result.insertId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.actualizarMedico = async (req, res) => {
    try {
        const { nombre, documento, telefono, email, especialidad, registro_medico, activo } = req.body;
        await pool.query(
            'UPDATE medicos SET nombre = ?, documento = ?, telefono = ?, email = ?, especialidad_id = ?, registro_medico = ?, activo = ? WHERE id = ?',
            [nombre, documento, telefono, email, especialidad, registro_medico, activo, req.params.id]
        );
        res.json({ success: true, message: 'Médico actualizado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.eliminarMedico = async (req, res) => {
    try {
        await pool.query('DELETE FROM medicos WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Médico eliminado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.contarMedicosActivos = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM medicos WHERE activo = 1');
        res.json({ success: true, data: rows[0].total });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};