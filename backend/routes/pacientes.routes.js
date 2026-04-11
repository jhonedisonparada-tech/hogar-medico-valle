const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientes.controller');

router.get('/', pacientesController.obtenerPacientes);
router.get('/conteo', pacientesController.contarPacientes);
router.get('/:id', pacientesController.obtenerPacientePorId);
router.post('/', pacientesController.crearPaciente);
router.put('/:id', pacientesController.actualizarPaciente);
router.delete('/:id', pacientesController.eliminarPaciente);

module.exports = router;