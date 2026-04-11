const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/historias.controller');
const { soloRol } = require('../middleware/auth');

// ── Lectura — Admin y Médico pueden ver historias ─────────────────────────────

// GET todas las historias (solo para el dashboard del Admin)
router.get('/todas', soloRol('Admin'), ctrl.obtenerTodasHistorias);

// GET historias por médico
router.get('/medico/:medicoId', soloRol('Admin', 'Médico'), ctrl.obtenerHistoriasPorMedico);

// GET historias por paciente
router.get('/paciente/:pacienteId', soloRol('Admin', 'Médico', 'Paciente'), ctrl.obtenerHistoriasPorPaciente);

// GET una historia por ID — Admin, Médico y Paciente pueden verla
router.get('/:id', soloRol('Admin', 'Médico', 'Paciente'), ctrl.obtenerHistoriaPorId);

// ── Escritura — SOLO Médico ───────────────────────────────────────────────────

// POST crear historia clínica
router.post('/', soloRol('Médico'), ctrl.crearHistoria);

// PUT actualizar historia clínica
router.put('/:id', soloRol('Médico'), ctrl.actualizarHistoria);

module.exports = router;