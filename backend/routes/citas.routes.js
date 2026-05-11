const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');
const { soloRol } = require('../middleware/auth');

// ============================================
// RUTAS DE LECTURA (Admin, Recepcionista, Médico, Paciente)
// ============================================

router.get('/', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), citasController.obtenerCitas);
router.get('/conteo/hoy', soloRol('Admin', 'Recepcionista', 'Médico'), citasController.contarCitasHoy);
router.get('/fecha/:fecha', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), citasController.obtenerCitasPorFecha);
router.get('/hoy', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), citasController.obtenerCitasHoy);
router.get('/proximas', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), citasController.obtenerProximasCitas);
router.get('/medico/:medicoId', soloRol('Admin', 'Recepcionista', 'Médico'), citasController.obtenerCitasPorMedico);
router.get('/paciente/:pacienteId', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), citasController.obtenerCitasPorPaciente);
router.get('/:id', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), citasController.obtenerCitaPorId);
router.get('/disponibilidad/verificar', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), citasController.verificarDisponibilidad);

// ============================================
// RUTAS DE ESCRITURA (Admin, Recepcionista, Paciente)
// ============================================

// POST crear cita: Paciente puede solicitar
router.post('/', soloRol('Admin', 'Recepcionista', 'Paciente'), citasController.crearCita);

// PUT y PATCH: solo Admin y Recepcionista
router.put('/:id', soloRol('Admin', 'Recepcionista'), citasController.actualizarCita);
router.patch('/:id/estado', soloRol('Admin', 'Recepcionista'), citasController.actualizarEstadoCita);

// ============================================
// RUTA DE ELIMINACIÓN (solo Admin)
// ============================================

router.delete('/:id', soloRol('Admin'), citasController.eliminarCita);

module.exports = router;