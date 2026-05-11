const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/historias.controller');
const { soloRol } = require('../middleware/auth');

// ============================================
// RUTAS DE LECTURA (Admin, Recepcionista, Médico)
// ============================================

// GET todas las historias (para dashboard Admin)
router.get('/todas', soloRol('Admin'), ctrl.obtenerTodasHistorias);

// GET historias por médico
router.get('/medico/:medicoId', soloRol('Admin', 'Recepcionista', 'Médico'), ctrl.obtenerHistoriasPorMedico);

// GET historias por paciente
router.get('/paciente/:pacienteId', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), ctrl.obtenerHistoriasPorPaciente);
// GET historia por ID
router.get('/:id', soloRol('Admin', 'Recepcionista', 'Médico'), ctrl.obtenerHistoriaPorId);

// ============================================
// RUTAS DE ESCRITURA (solo Médico)
// ============================================

// POST crear historia clínica
router.post('/', soloRol('Médico'), ctrl.crearHistoria);

// PUT actualizar historia clínica
router.put('/:id', soloRol('Médico'), ctrl.actualizarHistoria);

// (Si hubiera PATCH para modificar campos específicos, también iría aquí)

module.exports = router;