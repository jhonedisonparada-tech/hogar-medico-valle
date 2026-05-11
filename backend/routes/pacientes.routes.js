const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientes.controller');
const { soloRol } = require('../middleware/auth');

// Lectura general — Admin, Recepcionista, Médico
router.get('/', soloRol('Admin', 'Recepcionista', 'Médico'), pacientesController.obtenerPacientes);
router.get('/conteo', soloRol('Admin', 'Recepcionista', 'Médico'), pacientesController.contarPacientes);

// Paciente solo puede ver SU propio perfil — el controller valida paciente_id
router.get('/:id', soloRol('Admin', 'Recepcionista', 'Médico', 'Paciente'), pacientesController.obtenerPacientePorId);

// Escritura — Admin y Recepcionista
router.post('/', soloRol('Admin', 'Recepcionista'), pacientesController.crearPaciente);
router.put('/:id', soloRol('Admin', 'Recepcionista'), pacientesController.actualizarPaciente);

// Eliminación — solo Admin
router.delete('/:id', soloRol('Admin'), pacientesController.eliminarPaciente);

module.exports = router;