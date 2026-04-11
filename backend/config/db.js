const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('🔧 Configuración de BD:');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('User:', process.env.DB_USER || 'root');
console.log('Database:', process.env.DB_NAME || 'hogar_medico');
console.log('Password:', process.env.DB_PASSWORD ? '***' : 'NO PASSWORD SET');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hogar_medico',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

pool.getConnection()
    .then(conn => {
        console.log('✅ Conectado a MySQL correctamente');
        return conn.query('SELECT 1 + 1 AS result')
            .then(([rows]) => {
                console.log('📊 Base de datos:', process.env.DB_NAME || 'hogar_medico');
                console.log('✅ Consulta de prueba exitosa:', rows[0].result);
                conn.release();
            });
    })
    .catch(err => {
        console.error('❌ Error conectando a MySQL:', err.message);
    });

module.exports = pool;