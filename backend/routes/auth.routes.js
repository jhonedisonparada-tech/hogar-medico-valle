const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        const usuario = rows[0];
        const passwordValida = await bcrypt.compare(password, usuario.password);

        if (!passwordValida) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }

        let paciente_id = null;
        if (usuario.rol === 'Paciente') {
            const [pacRows] = await pool.execute(
                'SELECT id FROM pacientes WHERE email = ?',
                [usuario.email]
            );
            if (pacRows.length > 0) paciente_id = pacRows[0].id;
        }

        let medico_id = null;
        if (usuario.rol === 'Médico') {
            const [medRows] = await pool.execute(
                'SELECT id FROM medicos WHERE email = ?',
                [usuario.email]
            );
            if (medRows.length > 0) medico_id = medRows[0].id;
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, rol: usuario.rol, paciente_id, medico_id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ success: true, token, usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            paciente_id,
            medico_id
        }});

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

module.exports = router;