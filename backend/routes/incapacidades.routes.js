const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET todas las incapacidades o filtrar por historia_id o paciente_id
router.get('/', async (req, res) => {
    try {
        const { historia_id, paciente_id } = req.query;
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
router.get('/paciente/:pacienteId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT i.*, m.nombre as medico_nombre
             FROM incapacidades i
             LEFT JOIN medicos m ON i.medico_id = m.id
             WHERE i.paciente_id = ?
             ORDER BY i.fecha DESC`,
            [req.params.pacienteId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET una incapacidad por ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT i.*, p.nombre as paciente_nombre, m.nombre as medico_nombre
             FROM incapacidades i
             LEFT JOIN pacientes p ON i.paciente_id = p.id
             LEFT JOIN medicos m ON i.medico_id = m.id
             WHERE i.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Incapacidad no encontrada' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST crear incapacidad
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
    try {
        const { diagnostico, dias_incapacidad, fecha_inicio, fecha_fin, observaciones } = req.body;
        await pool.query(
            `UPDATE incapacidades SET
             diagnostico = ?, dias_incapacidad = ?, fecha_inicio = ?, fecha_fin = ?, observaciones = ?
             WHERE id = ?`,
            [diagnostico, dias_incapacidad, fecha_inicio, fecha_fin || null, observaciones || null, req.params.id]
        );
        res.json({ success: true, message: 'Incapacidad actualizada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE eliminar incapacidad
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM incapacidades WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Incapacidad eliminada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;