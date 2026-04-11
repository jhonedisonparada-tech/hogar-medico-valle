const pool = require('../config/db');

// ============================================
// OBTENER TODAS LAS CITAS
// ============================================
exports.obtenerCitas = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT c.*, 
                   p.nombre as paciente_nombre, 
                   p.documento as paciente_documento,
                   m.nombre as medico_nombre
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            JOIN medicos m ON c.medico_id = m.id
            ORDER BY c.fecha DESC, c.hora DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerCitas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ============================================
// OBTENER CITAS POR FECHA
// ============================================
exports.obtenerCitasPorFecha = async (req, res) => {
    try {
        const { fecha } = req.params;
        const [rows] = await pool.query(`
            SELECT c.*, 
                   p.nombre as paciente_nombre, 
                   p.documento as paciente_documento,
                   m.nombre as medico_nombre
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            JOIN medicos m ON c.medico_id = m.id
            WHERE DATE(c.fecha) = ?
            ORDER BY c.hora
        `, [fecha]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerCitasPorFecha:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// OBTENER CITAS DE HOY
// ============================================
exports.obtenerCitasHoy = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query(`
            SELECT c.*, 
                   p.nombre as paciente_nombre, 
                   p.documento as paciente_documento,
                   m.nombre as medico_nombre
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            JOIN medicos m ON c.medico_id = m.id
            WHERE DATE(c.fecha) = ?
            ORDER BY c.hora
        `, [hoy]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerCitasHoy:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// OBTENER PRÓXIMAS CITAS (a partir de hoy)
// ============================================
exports.obtenerProximasCitas = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query(`
            SELECT c.*, 
                   p.nombre as paciente_nombre, 
                   p.documento as paciente_documento,
                   m.nombre as medico_nombre
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            JOIN medicos m ON c.medico_id = m.id
            WHERE DATE(c.fecha) >= ?
            ORDER BY c.fecha, c.hora
            LIMIT 20
        `, [hoy]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerProximasCitas:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// OBTENER CITAS POR MÉDICO (NUEVO)
// ============================================
exports.obtenerCitasPorMedico = async (req, res) => {
    try {
        const { medicoId } = req.params;
        const [rows] = await pool.query(`
            SELECT c.*, 
                   p.nombre as paciente_nombre, 
                   p.documento as paciente_documento,
                   m.nombre as medico_nombre
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            JOIN medicos m ON c.medico_id = m.id
            WHERE c.medico_id = ?
            ORDER BY c.fecha DESC, c.hora DESC
        `, [medicoId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerCitasPorMedico:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// OBTENER CITAS POR PACIENTE
// ============================================
exports.obtenerCitasPorPaciente = async (req, res) => {
    try {
        const { pacienteId } = req.params;
        const [rows] = await pool.query(`
            SELECT c.*, 
                   m.nombre as medico_nombre
            FROM citas c
            JOIN medicos m ON c.medico_id = m.id
            WHERE c.paciente_id = ?
            ORDER BY c.fecha DESC, c.hora DESC
        `, [pacienteId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error en obtenerCitasPorPaciente:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// OBTENER UNA CITA POR ID
// ============================================
exports.obtenerCitaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(`
            SELECT c.*, 
                   p.nombre as paciente_nombre, 
                   p.documento as paciente_documento,
                   p.telefono as paciente_telefono,
                   m.nombre as medico_nombre
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            JOIN medicos m ON c.medico_id = m.id
            WHERE c.id = ?
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cita no encontrada' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error en obtenerCitaPorId:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================

// ============================================
// CREAR NUEVA CITA
// ============================================
exports.crearCita = async (req, res) => {
    try {
        const { paciente_id, medico_id, fecha, hora, motivo, estado, observaciones, especialidad_nombre } = req.body;
        const [result] = await pool.query(
            `INSERT INTO citas
            (paciente_id, medico_id, fecha, hora, motivo, estado, observaciones, especialidad_nombre, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [paciente_id, medico_id, fecha, hora, motivo, estado || 'Programada', observaciones || null, especialidad_nombre || null]
        );
        res.status(201).json({
            success: true,
            message: 'Cita creada exitosamente',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error en crearCita:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }};

// ============================================
// ACTUALIZAR CITA
// ============================================
exports.actualizarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { paciente_id, medico_id, fecha, hora, motivo, estado, observaciones } = req.body;
        
        // Si solo viene el estado, solo actualizar el estado
        if (estado && !fecha) {
            await pool.query(
                `UPDATE citas SET estado = ?, updated_at = NOW() WHERE id = ?`,
                [estado, id]
            );
        } else {
            await pool.query(
                `UPDATE citas SET
                 paciente_id = ?, medico_id = ?, fecha = ?, hora = ?,
                 motivo = ?, estado = ?, observaciones = ?, updated_at = NOW()
                 WHERE id = ?`,
                [paciente_id, medico_id, fecha, hora, motivo, estado, observaciones, id]
            );
        }
        res.json({ success: true, message: 'Cita actualizada' });
    } catch (error) {
        console.error('Error en actualizarCita:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// ACTUALIZAR SOLO EL ESTADO DE UNA CITA
// ============================================
exports.actualizarEstadoCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        await pool.query(
            `UPDATE citas SET estado = ?, updated_at = NOW() WHERE id = ?`,
            [estado, id]
        );
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (error) {
        console.error('Error en actualizarEstadoCita:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// ELIMINAR CITA
// ============================================
exports.eliminarCita = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM citas WHERE id = ?', [id]);
        res.json({ success: true, message: 'Cita eliminada' });
    } catch (error) {
        console.error('Error en eliminarCita:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// CONTAR CITAS DE HOY
// ============================================
exports.contarCitasHoy = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const [rows] = await pool.query('SELECT COUNT(*) as total FROM citas WHERE DATE(fecha) = ?', [hoy]);
        res.json({ success: true, data: rows[0].total });
    } catch (error) {
        console.error('Error en contarCitasHoy:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// ============================================
// VERIFICAR DISPONIBILIDAD DE UN MÉDICO EN UNA FECHA Y HORA
// ============================================
exports.verificarDisponibilidad = async (req, res) => {
    try {
        const { medico_id, fecha, hora } = req.query;
        const [rows] = await pool.query(
            `SELECT COUNT(*) as total FROM citas 
             WHERE medico_id = ? AND fecha = ? AND hora = ? 
             AND estado NOT IN ('Cancelada', 'No Asistió')`,
            [medico_id, fecha, hora]
        );
        const disponible = rows[0].total === 0;
        res.json({ 
            success: true, 
            disponible,
            mensaje: disponible ? 'Horario disponible' : 'Horario no disponible'
        });
    } catch (error) {
        console.error('Error en verificarDisponibilidad:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};