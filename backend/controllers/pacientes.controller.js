const pool = require('../config/db');

exports.obtenerPacientes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM pacientes ORDER BY nombre');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

exports.obtenerPacientePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = req.usuario;

        // Si es Paciente, solo puede ver su propio perfil
        if (usuario.rol === 'Paciente' && usuario.paciente_id != id) {
            return res.status(403).json({ success: false, message: 'No autorizado para ver este paciente.' });
        }

        const [rows] = await pool.query('SELECT * FROM pacientes WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

exports.crearPaciente = async (req, res) => {
    try {
        const { nombre, documento, telefono, email, direccion, fecha_nacimiento, genero, activo } = req.body;

        if (!nombre || nombre.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'El nombre es obligatorio y no puede estar vacío' });
        }
        if (!documento || !/^\d+$/.test(documento)) {
            return res.status(400).json({ success: false, message: 'El documento debe contener solo números' });
        }

        const [result] = await pool.query(
            'INSERT INTO pacientes (nombre, documento, telefono, email, direccion, fecha_nacimiento, genero, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, documento, telefono, email, direccion, fecha_nacimiento, genero, activo !== undefined ? activo : 1]
        );
        res.json({ success: true, message: 'Paciente creado', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

exports.actualizarPaciente = async (req, res) => {
    try {
        const { nombre, documento, telefono, email, direccion, fecha_nacimiento, genero, activo } = req.body;
        await pool.query(
            'UPDATE pacientes SET nombre = ?, documento = ?, telefono = ?, email = ?, direccion = ?, fecha_nacimiento = ?, genero = ?, activo = ? WHERE id = ?',
            [nombre, documento, telefono, email, direccion, fecha_nacimiento, genero, activo, req.params.id]
        );
        res.json({ success: true, message: 'Paciente actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

exports.eliminarPaciente = async (req, res) => {
    try {
        await pool.query('DELETE FROM pacientes WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Paciente eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

exports.contarPacientes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM pacientes');
        res.json({ success: true, data: rows[0].total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};