const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { soloRol } = require('../middleware/auth');

// ============================================
// RUTAS DE LECTURA (Admin, Recepcionista, Médico, Paciente)
// ============================================

router.get('/', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), async (req, res) => {
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

router.get('/paciente/:pacienteId', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), async (req, res) => {
    try {
        const usuario = req.usuario;
        if (usuario.rol === 'Paciente' && usuario.paciente_id != req.params.pacienteId) {
            return res.status(403).json({ success: false, message: 'No autorizado.' });
        }
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

router.get('/:id', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), async (req, res) => {
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
        const usuario = req.usuario;
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

router.post('/', soloRol('Médico'), async (req, res) => {
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

// PUT actualizar ordenamiento (solo Médico, con restricción 48h y estado)
router.put('/:id', soloRol('Médico'), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar fecha de creación y estado
        const [rows] = await pool.query(
            'SELECT fecha, COALESCE(estado, "Abierto") as estado FROM ordenamientos WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ordenamiento no encontrado' });
        }
        
        const fechaCreacion = new Date(rows[0].fecha);
        const ahora = new Date();
        const diferenciaHoras = (ahora - fechaCreacion) / (1000 * 60 * 60);
        
        if (diferenciaHoras > 48) {
            return res.status(403).json({
                success: false,
                message: 'No se puede modificar un ordenamiento después de 48 horas de su creación.'
            });
        }
        
        if (rows[0].estado === 'Cerrado' || rows[0].estado === 'Completado') {
            return res.status(403).json({
                success: false,
                message: 'No se puede modificar un ordenamiento que ya ha sido cerrado o completado.'
            });
        }
        
        const { descripcion, observaciones } = req.body;
        await pool.query(
            `UPDATE ordenamientos SET descripcion = ?, observaciones = ? WHERE id = ?`,
            [descripcion, observaciones || null, id]
        );
        res.json({ success: true, message: 'Ordenamiento actualizado' });
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
        await pool.query('DELETE FROM ordenamientos WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Ordenamiento eliminado' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;