const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET todos los médicos
router.get('/', async (req, res) => {
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
});

// GET conteo de médicos activos
router.get('/conteo', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM medicos WHERE activo = 1');
        res.json({ success: true, data: rows[0].total });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET médico por ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT m.*, e.nombre as especialidad_nombre
            FROM medicos m
            LEFT JOIN especialidades e ON m.especialidad_id = e.id
            WHERE m.id = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Médico no encontrado' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST crear médico
router.post('/', async (req, res) => {
    try {
        const { nombre, documento, especialidad_id, telefono, email, registro_medico, foto_url } = req.body;
        const [result] = await pool.query(
            `INSERT INTO medicos 
             (nombre, documento, especialidad_id, telefono, email, registro_medico, foto_url, activo, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
            [nombre, documento, especialidad_id, telefono || null, email || null, registro_medico || null, foto_url || null]
        );
        res.json({ success: true, message: 'Médico creado', id: result.insertId });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT actualizar médico
router.put('/:id', async (req, res) => {
    try {
        const { nombre, documento, especialidad_id, telefono, email, registro_medico, foto_url, activo } = req.body;
        await pool.query(
            `UPDATE medicos SET
             nombre = ?, documento = ?, especialidad_id = ?, telefono = ?,
             email = ?, registro_medico = ?, foto_url = ?, activo = ?, updated_at = NOW()
             WHERE id = ?`,
            [nombre, documento, especialidad_id, telefono || null, email || null, registro_medico || null, foto_url || null, activo ?? 1, req.params.id]
        );
        res.json({ success: true, message: 'Médico actualizado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE eliminar médico
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM medicos WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Médico eliminado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET especialidades
router.get('/especialidades/lista', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM especialidades WHERE activo = 1 ORDER BY nombre');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET pacientes atendidos por un médico
router.get('/mis-pacientes/:medicoId', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT p.*
            FROM pacientes p
            JOIN historias_clinicas h ON p.id = h.paciente_id
            WHERE h.medico_id = ?
            ORDER BY p.nombre
        `, [req.params.medicoId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;