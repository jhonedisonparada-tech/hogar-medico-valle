const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function actualizarPasswords() {
    try {
        // Obtener todos los usuarios
        const [usuarios] = await pool.execute('SELECT id, password FROM usuarios');
        
        for (let user of usuarios) {
            // Encriptar la contraseña (si no está ya encriptada)
            if (user.password.length < 20) { // Asumiendo que las encriptadas son más largas
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.execute(
                    'UPDATE usuarios SET password = ? WHERE id = ?',
                    [hashedPassword, user.id]
                );
                console.log(`✅ Usuario ID ${user.id} actualizado`);
            }
        }
        
        console.log('🎉 Todas las contraseñas actualizadas');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

actualizarPasswords();