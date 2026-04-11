const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function encryptPasswords() {
    try {
        console.log('🔐 Iniciando encriptación de contraseñas...');
        
        const [usuarios] = await pool.execute('SELECT id, password FROM usuarios');
        
        for (let user of usuarios) {
            if (user.password.length !== 60) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.execute(
                    'UPDATE usuarios SET password = ? WHERE id = ?',
                    [hashedPassword, user.id]
                );
                console.log(`✅ Usuario ID ${user.id} actualizado`);
            } else {
                console.log(`⏭️ Usuario ID ${user.id} ya estaba encriptado`);
            }
        }
        
        console.log('🎉 Todas las contraseñas encriptadas');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

encryptPasswords();