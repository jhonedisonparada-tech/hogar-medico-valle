const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
require('dotenv').config({ path: './backend/.env' });
console.log('🔧 Variables de entorno cargadas (forzado):', {
    PORT: process.env.PORT,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'NO PASSWORD SET',
    DB_NAME: process.env.DB_NAME
});
console.log('🔧 Variables de entorno cargadas:', {
    PORT: process.env.PORT,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'NO PASSWORD SET',
    DB_NAME: process.env.DB_NAME
});

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES GLOBALES
// ============================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
const { verificarToken } = require('./middleware/auth');

// ============================================
// IMPORTAR RUTAS
// ============================================
const authRoutes          = require('./routes/auth.routes');
const pacientesRoutes     = require('./routes/pacientes.routes');
const medicosRoutes       = require('./routes/medicos.routes');
const historiasRoutes     = require('./routes/historias.routes');
const ordenamientosRoutes = require('./routes/ordenamientos.routes');
const incapacidadesRoutes = require('./routes/incapacidades.routes');
const citasRoutes         = require('./routes/citas.routes');

// ============================================
// RUTAS PÚBLICAS (sin token)
// ============================================
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// RUTAS PROTEGIDAS (requieren token JWT)
// ============================================
app.use('/api/pacientes',     verificarToken, pacientesRoutes);
app.use('/api/medicos',       verificarToken, medicosRoutes);
app.use('/api/historias',     verificarToken, historiasRoutes);
app.use('/api/ordenamientos', verificarToken, ordenamientosRoutes);
app.use('/api/incapacidades', verificarToken, incapacidadesRoutes);
app.use('/api/citas',         verificarToken, citasRoutes);

// ============================================
// RUTAS DE MEDICAMENTOS
// ============================================
const pool               = require('./config/db');
const medicamentosRouter = express.Router();

medicamentosRouter.get('/', async (req, res) => {
    try {
        const { historia_id, paciente_id } = req.query;
        let query = `
            SELECT mr.*, p.nombre AS paciente_nombre, m.nombre AS medico_nombre
            FROM medicamentos_recetados mr
            LEFT JOIN pacientes p ON mr.paciente_id = p.id
            LEFT JOIN medicos   m ON mr.medico_id   = m.id
        `;
        const params = [];
        if (historia_id)  { query += ' WHERE mr.historia_id  = ?'; params.push(historia_id); }
        else if (paciente_id) { query += ' WHERE mr.paciente_id = ?'; params.push(paciente_id); }
        query += ' ORDER BY mr.fecha DESC';
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

medicamentosRouter.post('/', async (req, res) => {
    try {
        const { paciente_id, medico_id, historia_id, medicamento,
                dosis, frecuencia, duracion, indicaciones } = req.body;
        const [result] = await pool.query(
            `INSERT INTO medicamentos_recetados
             (paciente_id, medico_id, historia_id, medicamento, dosis, frecuencia, duracion, indicaciones, fecha)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, historia_id || null, medicamento,
             dosis || null, frecuencia || null, duracion || null, indicaciones || null]
        );
        res.json({ success: true, message: 'Medicamento agregado', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

medicamentosRouter.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM medicamentos_recetados WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Medicamento eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.use('/api/medicamentos', verificarToken, medicamentosRouter);

// ============================================
// MÓDULO MÉDICO
// ============================================
const medicoModuloRouter = express.Router();

// Pacientes atendidos por el médico
medicoModuloRouter.get('/pacientes/:medicoId', async (req, res) => {
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
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fórmulas médicas por paciente
medicoModuloRouter.get('/formulas/:pacienteId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM formulas_medicas WHERE paciente_id = ? ORDER BY fecha DESC',
            [req.params.pacienteId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear fórmula médica
medicoModuloRouter.post('/formulas', async (req, res) => {
    try {
        const { paciente_id, medico_id, fecha, medicamentos, indicaciones } = req.body;
        const [result] = await pool.query(
            `INSERT INTO formulas_medicas (paciente_id, medico_id, fecha, medicamentos, indicaciones, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [paciente_id, medico_id, fecha, JSON.stringify(medicamentos), indicaciones || null]
        );
        res.json({ success: true, message: 'Fórmula guardada', id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Historias por paciente para módulo médico
medicoModuloRouter.get('/historias/paciente/:pacienteId', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT h.*, m.nombre AS medico_nombre
            FROM historias_clinicas h
            JOIN medicos m ON h.medico_id = m.id
            WHERE h.paciente_id = ?
            ORDER BY h.fecha DESC
        `, [req.params.pacienteId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Catálogo de exámenes
medicoModuloRouter.get('/examenes', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM examenes WHERE activo = 1 ORDER BY nombre');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.use('/api/medico', verificarToken, medicoModuloRouter);

// ============================================
// RUTA PRINCIPAL
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ============================================
// MANEJO DE ERRORES 404
// ============================================
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'Endpoint no encontrado.' });
    }
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
    console.log('=================================');
    console.log('🔓 Pública:    /api/auth/login');
    console.log('🔓 Pública:    /api/health');
    console.log('🔒 Protegida:  /api/pacientes (GET /conteo)');
    console.log('🔒 Protegida:  /api/medicos (GET /conteo)');
    console.log('🔒 Protegida:  /api/historias');
    console.log('🔒 Protegida:  /api/citas (GET /conteo/hoy)');
    console.log('🔒 Protegida:  /api/ordenamientos');
    console.log('🔒 Protegida:  /api/incapacidades');
    console.log('🔒 Protegida:  /api/medicamentos');
    console.log('🔒 Protegida:  /api/medico/*');
    console.log('=================================');
});