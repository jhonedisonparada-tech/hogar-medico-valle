const express = require('express');
const router = express.Router();
const citasController = require('../controllers/citas.controller');

// Rutas para citas
router.get('/', citasController.obtenerCitas);
router.get('/conteo/hoy', citasController.contarCitasHoy);
router.get('/fecha/:fecha', citasController.obtenerCitasPorFecha);
router.get('/hoy', citasController.obtenerCitasHoy);
router.get('/proximas', citasController.obtenerProximasCitas);
router.get('/medico/:medicoId', citasController.obtenerCitasPorMedico);
router.get('/paciente/:pacienteId', citasController.obtenerCitasPorPaciente);
router.get('/:id', citasController.obtenerCitaPorId);
router.post('/', citasController.crearCita);
router.put('/:id', citasController.actualizarCita);
router.patch('/:id/estado', citasController.actualizarEstadoCita);
router.delete('/:id', citasController.eliminarCita);

// Verificar disponibilidad
router.get('/disponibilidad/verificar', citasController.verificarDisponibilidad);

module.exports = router;