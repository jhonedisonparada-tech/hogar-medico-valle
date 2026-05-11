const express = require('express');  // ← esta línea falta
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Middleware de autenticación
const { verificarToken } = require('./middleware/auth');

// Importar rutas
const authRoutes          = require('./routes/auth.routes');
const pacientesRoutes     = require('./routes/pacientes.routes');
const medicosRoutes       = require('./routes/medicos.routes');
const historiasRoutes     = require('./routes/historias.routes');
const ordenamientosRoutes = require('./routes/ordenamientos.routes');
const incapacidadesRoutes = require('./routes/incapacidades.routes');
const citasRoutes         = require('./routes/citas.routes');
const medicamentosRoutes  = require('./routes/medicamentos.routes');
const medicoModuloRoutes  = require('./routes/medico-modulo.routes');

// Rutas públicas
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'OK', message: 'Servidor funcionando correctamente', timestamp: new Date().toISOString() });
});

// Rutas protegidas
app.use('/api/pacientes',     verificarToken, pacientesRoutes);
app.use('/api/medicos',       verificarToken, medicosRoutes);
app.use('/api/historias',     verificarToken, historiasRoutes);
app.use('/api/ordenamientos', verificarToken, ordenamientosRoutes);
app.use('/api/incapacidades', verificarToken, incapacidadesRoutes);
app.use('/api/citas',         verificarToken, citasRoutes);
app.use('/api/medicamentos',  verificarToken, medicamentosRoutes);
app.use('/api/medico',        verificarToken, medicoModuloRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Manejo de errores 404
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'Endpoint no encontrado.' });
    }
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Servidor en http://localhost:${PORT}`);
    console.log('=================================');
});