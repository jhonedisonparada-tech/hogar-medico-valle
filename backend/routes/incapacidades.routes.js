const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { soloRol } = require('../middleware/auth');

// ============================================
// RUTAS DE LECTURA (Admin, Recepcionista, Médico, Paciente)
// ============================================

// GET todas las incapacidades (con filtros opcionales)
router.get('/', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), async (req, res) => {
    try {
        const { historia_id, paciente_id } = req.query;
        const usuario = req.usuario;

        // Si es Paciente, forzar a que solo vea sus propias incapacidades
        if (usuario.rol === 'Paciente') {
            if (!paciente_id || parseInt(paciente_id) !== usuario.paciente_id) {
                return res.status(403).json({ success: false, message: 'No autorizado.' });
            }
        }

        let query = `
            SELECT i.*, p.nombre as paciente_nombre, m.nombre as medico_nombre
            FROM incapacidades i
            LEFT JOIN pacientes p ON i.paciente_id = p.id
            LEFT JOIN medicos m ON i.medico_id = m.id
        `;
        const params = [];
        if (historia_id) {
            query += ' WHERE i.historia_id = ?';
            params.push(historia_id);
        } else if (paciente_id) {
            query += ' WHERE i.paciente_id = ?';
            params.push(paciente_id);
        }
        query += ' ORDER BY i.fecha DESC';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET incapacidades por paciente
router.get('/paciente/:pacienteId', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), async (req, res) => {
    try {
        const usuario = req.usuario;
        const pacienteId = req.params.pacienteId;

        // Si es Paciente, solo puede ver sus propias incapacidades
        if (usuario.rol === 'Paciente' && usuario.paciente_id != pacienteId) {
            return res.status(403).json({ success: false, message: 'No autorizado.' });
        }

        const [rows] = await pool.query(
            `SELECT i.*, m.nombre as medico_nombre
             FROM incapacidades i
             LEFT JOIN medicos m ON i.medico_id = m.id
             WHERE i.paciente_id = ?
             ORDER BY i.fecha DESC`,
            [pacienteId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET una incapacidad por ID
router.get('/:id', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            `SELECT i.*, p.nombre as paciente_nombre, m.nombre as medico_nombre
             FROM incapacidades i
             LEFT JOIN pacientes p ON i.paciente_id = p.id
             LEFT JOIN medicos m ON i.medico_id = m.id
             WHERE i.id = ?`,
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Incapacidad no encontrada' });
        }

        const usuario = req.usuario;
        // Si es Paciente, verificar que sea suya
        if (usuario.rol === 'Paciente' && usuario.paciente_id != rows[0].paciente_id) {
            return res.status(403).json({ success: false, message: 'No autorizado.' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// RUTAS DE ESCRITURA (solo Médico)
// ============================================

// POST crear incapacidad
router.post('/', soloRol('Médico'), async (req, res) => {
    try {
        const { paciente_id, medico_id, historia_id, diagnostico, dias_incapacidad, fecha_inicio, fecha_fin, observaciones } = req.body;
        const [result] = await pool.query(
            `INSERT INTO incapacidades 
             (paciente_id, medico_id, historia_id, diagnostico, dias_incapacidad, fecha_inicio, fecha_fin, observaciones, fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, historia_id || null, diagnostico, dias_incapacidad, fecha_inicio, fecha_fin || null, observaciones || null]
        );
        res.json({ success: true, message: 'Incapacidad creada', id: result.insertId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT actualizar incapacidad
router.put('/:id', soloRol('Médico'), async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar fecha de creación y estado (opcional, si existe el campo estado)
        const [rows] = await pool.query(
            'SELECT fecha, COALESCE(estado, "Abierta") as estado FROM incapacidades WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Incapacidad no encontrada' });
        }

        const fechaCreacion = new Date(rows[0].fecha);
        const ahora = new Date();
        const diferenciaHoras = (ahora - fechaCreacion) / (1000 * 60 * 60);

        if (diferenciaHoras > 48) {
            return res.status(403).json({
                success: false,
                message: 'No se puede modificar una incapacidad después de 48 horas de su creación.'
            });
        }

        if (rows[0].estado === 'Cerrada') {
            return res.status(403).json({
                success: false,
                message: 'No se puede modificar una incapacidad cerrada.'
            });
        }

        const { diagnostico, dias_incapacidad, fecha_inicio, fecha_fin, observaciones } = req.body;
        await pool.query(
            `UPDATE incapacidades SET
             diagnostico = ?, dias_incapacidad = ?, fecha_inicio = ?, fecha_fin = ?, observaciones = ?
             WHERE id = ?`,
            [diagnostico, dias_incapacidad, fecha_inicio, fecha_fin || null, observaciones || null, id]
        );
        res.json({ success: true, message: 'Incapacidad actualizada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// RUTA DE ELIMINACIÓN (solo Admin)
// ============================================

router.delete('/:id', soloRol('Admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM incapacidades WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Incapacidad eliminada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;