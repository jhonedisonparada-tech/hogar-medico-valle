const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const pool    = require('../config/db');
const router  = express.Router();

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos.'
            });
        }

        const [users] = await pool.execute(
            `SELECT id, nombre, email, password, rol, medico_id, paciente_id
             FROM usuarios
             WHERE email = ? AND activo = 1`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'El correo electrónico no está registrado.'
            });
        }

        const user = users[0];
        const passwordValida = await bcrypt.compare(password, user.password);

        if (!passwordValida) {
            return res.status(401).json({
                success: false,
                message: 'La contraseña es incorrecta.'
            });
        }

        // ✅ JWT_SECRET desde variable de entorno — nunca hardcodeado
        const token = jwt.sign(
            {
                id:          user.id,
                email:       user.email,
                nombre:      user.nombre,
                rol:         user.rol,
                medico_id:   user.medico_id,
                paciente_id: user.paciente_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        await pool.execute(
            'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?',
            [user.id]
        );

        res.json({
            success: true,
            message: 'Login exitoso.',
            token,
            usuario: {
                id:          user.id,
                nombre:      user.nombre,
                email:       user.email,
                rol:         user.rol,
                medico_id:   user.medico_id,
                paciente_id: user.paciente_id
            }
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

module.exports = router;