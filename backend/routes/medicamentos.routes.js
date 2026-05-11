const express = require('express');
const router = express.Router();
const medicamentosController = require('../controllers/medicamentos.controller');
const { soloRol } = require('../middleware/auth');

// ============================================
// RUTAS DE LECTURA (Admin, Recepcionista, Médico, Paciente)
// ============================================

router.get('/', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), medicamentosController.obtenerMedicamentos);

// ============================================
// RUTAS DE ESCRITURA (solo Médico)
// ============================================

router.post('/', soloRol('Médico'), medicamentosController.crearMedicamento);

// ============================================
// RUTA DE ELIMINACIÓN (solo Admin)
// ============================================

router.delete('/:id', soloRol('Admin'), medicamentosController.eliminarMedicamento);

module.exports = router;