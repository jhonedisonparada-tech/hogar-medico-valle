const express = require('express');
const router = express.Router();
const medicoModuloController = require('../controllers/medico-modulo.controller');
const { verificarToken } = require('../middleware/auth');

// Todas las rutas del módulo médico requieren autenticación
router.use(verificarToken);

router.get('/pacientes/:medicoId', medicoModuloController.obtenerPacientesPorMedico);
router.get('/formulas/:pacienteId', medicoModuloController.obtenerFormulasPorPaciente);
router.post('/formulas', medicoModuloController.crearFormula);
router.get('/historias/paciente/:pacienteId', medicoModuloController.obtenerHistoriasPorPaciente);
router.get('/examenes', medicoModuloController.obtenerCatalogoExamenes);

module.exports = router;