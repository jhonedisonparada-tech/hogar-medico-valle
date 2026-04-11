const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET todos los ordenamientos o filtrar por historia_id o paciente_id
router.get('/', async (req, res) => {
    try {
        const { historia_id, paciente_id } = req.query;
        let query = `
            SELECT o.*, p.nombre as paciente_nombre, m.nombre as medico_nombre
            FROM ordenamientos o
            LEFT JOIN pacientes p ON o.paciente_id = p.id
            LEFT JOIN medicos m ON o.medico_id = m.id
        `;
        const params = [];
        if (historia_id) {
            query += ' WHERE o.historia_id = ?';
            params.push(historia_id);
        } else if (paciente_id) {
            query += ' WHERE o.paciente_id = ?';
            params.push(paciente_id);
        }
        query += ' ORDER BY o.fecha DESC';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET ordenamientos por paciente
router.get('/paciente/:pacienteId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT o.*, m.nombre as medico_nombre
             FROM ordenamientos o
             LEFT JOIN medicos m ON o.medico_id = m.id
             WHERE o.paciente_id = ?
             ORDER BY o.fecha DESC`,
            [req.params.pacienteId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET un ordenamiento por ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT o.*, p.nombre as paciente_nombre, m.nombre as medico_nombre
             FROM ordenamientos o
             LEFT JOIN pacientes p ON o.paciente_id = p.id
             LEFT JOIN medicos m ON o.medico_id = m.id
             WHERE o.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ordenamiento no encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST crear ordenamiento
router.post('/', async (req, res) => {
    try {
        const { paciente_id, medico_id, historia_id, descripcion, observaciones } = req.body;
        const [result] = await pool.query(
            `INSERT INTO ordenamientos 
             (paciente_id, medico_id, historia_id, descripcion, observaciones, fecha)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, historia_id || null, descripcion, observaciones || null]
        );
        res.json({ success: true, message: 'Ordenamiento creado', id: result.insertId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT actualizar ordenamiento
router.put('/:id', async (req, res) => {
    try {
        const { descripcion, observaciones } = req.body;
        await pool.query(
            `UPDATE ordenamientos SET descripcion = ?, observaciones = ? WHERE id = ?`,
            [descripcion, observaciones || null, req.params.id]
        );
        res.json({ success: true, message: 'Ordenamiento actualizado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE eliminar ordenamiento
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM ordenamientos WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Ordenamiento eliminado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;