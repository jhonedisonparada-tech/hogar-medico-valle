const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ============================================
// SETUP - Crear tabla de interconsultas si no existe
// ============================================
router.get('/setup', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS interconsultas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                paciente_id INT NOT NULL,
                medico_origen_id INT NOT NULL,
                medico_destino_id INT NOT NULL,
                historia_id INT,
                motivo TEXT,
                especialidad VARCHAR(100),
                urgencia ENUM('Normal', 'Prioritaria', 'Urgente') DEFAULT 'Normal',
                estado ENUM('Pendiente', 'Aceptada', 'Rechazada', 'Completada') DEFAULT 'Pendiente',
                respuesta TEXT,
                fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_respuesta TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
                FOREIGN KEY (medico_origen_id) REFERENCES medicos(id),
                FOREIGN KEY (medico_destino_id) REFERENCES medicos(id),
                FOREIGN KEY (historia_id) REFERENCES historias_clinicas(id)
            )
        `);
        res.json({ success: true, message: 'Tabla interconsultas creada/verificada' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PACIENTES DEL MÉDICO
// ============================================
router.get('/pacientes/:medicoId', async (req, res) => {
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

// ============================================
// HISTORIAS CLÍNICAS
// ============================================
router.get('/historias/paciente/:pacienteId', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.*, m.nombre as medico_nombre
            FROM historias_clinicas h
            JOIN medicos m ON h.medico_id = m.id
            WHERE h.paciente_id = ?
            ORDER BY h.fecha DESC
        `, [req.params.pacienteId]);
        
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// EXÁMENES (catálogo)
// ============================================
router.get('/examenes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM examenes WHERE activo = 1 ORDER BY nombre');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;