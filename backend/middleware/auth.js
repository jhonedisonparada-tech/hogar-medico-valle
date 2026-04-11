const jwt = require('jsonwebtoken');

// ============================================
// VERIFICAR TOKEN JWT
// ============================================
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Acceso denegado. Token no proporcionado.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = decoded; // queda disponible en req.usuario en todos los controllers
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado. Inicie sesión nuevamente.'
        });
    }
};

// ============================================
// VERIFICAR ROL (uso opcional por ruta)
// Ejemplo: soloRol('Admin') o soloRol('Admin','Médico')
// ============================================
const soloRol = (...roles) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ success: false, message: 'No autenticado.' });
        }
        if (!roles.includes(req.usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: `Acceso restringido. Se requiere rol: ${roles.join(' o ')}.`
            });
        }
        next();
    };
};

module.exports = { verificarToken, soloRol };