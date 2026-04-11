// ============================================
// LOGIN - HOGAR MÉDICO DEL VALLE
// VERSIÓN COMPLETA CON MENSAJES DE ERROR ESPECÍFICOS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Login.js cargado correctamente');
    
    // Elementos del DOM
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const recordarCheckbox = document.getElementById('recordar');

    // URL de la API
    const API_URL = 'http://localhost:3000/api';

    // Verificar si ya hay sesión activa
    const token = localStorage.getItem('token');
    if (token) {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario') || '{}');
    const rol = usuarioGuardado.rol || '';
    if (rol === 'Médico') window.location.href = 'medico-dashboard.html';
    else if (rol === 'Paciente') window.location.href = 'paciente-dashboard.html';
    else if (rol === 'Recepcionista') window.location.href = 'recepcion-dashboard.html';
    else if (rol === 'Enfermero') window.location.href = 'enfermero-dashboard.html';
    else window.location.href = 'dashboard.html';
}

    // Cargar email guardado
    cargarEmailGuardado();

    // Mostrar/ocultar contraseña
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Limpiar bordes de error cuando el usuario empieza a escribir
    emailInput.addEventListener('input', function() {
        this.style.border = '';
    });
    
    passwordInput.addEventListener('input', function() {
        this.style.border = '';
    });

    // Enviar formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario enviado');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Limpiar bordes de error anteriores
        emailInput.style.border = '';
        passwordInput.style.border = '';

        if (!email || !password) {
            mostrarError('Por favor complete todos los campos');
            if (!email) emailInput.style.border = '1px solid #e74c3c';
            if (!password) passwordInput.style.border = '1px solid #e74c3c';
            return;
        }

        // Validar formato de email
        if (!email.includes('@') || !email.includes('.')) {
            mostrarError('Ingrese un email válido');
            emailInput.style.border = '1px solid #e74c3c';
            return;
        }

        // Mostrar estado de carga
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';

        try {
            console.log('📡 Enviando petición a:', `${API_URL}/auth/login`);
            
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('📊 Respuesta:', data);

            if (data.success) {
                console.log('✅ Login exitoso para:', data.usuario.rol);
                
                // Guardar datos según "Recordarme"
                if (recordarCheckbox.checked) {
                    localStorage.setItem('email_guardado', email);
                } else {
                    localStorage.removeItem('email_guardado');
                }
                
                // Guardar token y datos de usuario
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario', JSON.stringify(data.usuario));

                // Redirigir según el rol
                let destino = 'dashboard.html'; // Por defecto
                
                switch(data.usuario.rol) {
                    case 'Admin':
                        destino = 'dashboard.html';
                        break;
                    case 'Médico':
                        destino = 'medico-dashboard.html';
                        break;
                    case 'Recepcionista':
                        destino = 'recepcion-dashboard.html';
                        break;
                    case 'Enfermero':
                        destino = 'enfermero-dashboard.html';
                        break;
                    case 'Paciente':
                        destino = 'paciente-dashboard.html';
                        break;
                    default:
                        destino = 'dashboard.html';
                }
                
                console.log('🚀 Redirigiendo a:', destino);
                window.location.href = destino;
                
            } else {
                console.log('❌ Login fallido:', data.message);
                
                // Mensajes específicos según el tipo de error
                const mensaje = data.message || 'Error al iniciar sesión';
                
                // Resaltar el campo correspondiente
                if (mensaje.includes('correo') || mensaje.includes('email')) {
                    emailInput.style.border = '1px solid #e74c3c';
                    mostrarError(`❌ ${mensaje}`);
                } else if (mensaje.includes('contraseña')) {
                    passwordInput.style.border = '1px solid #e74c3c';
                    mostrarError(`❌ ${mensaje}`);
                } else {
                    mostrarError(`❌ ${mensaje}`);
                }
                
                // Restaurar botón
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Ingresar</span><i class="fas fa-arrow-right"></i>';
            }

        } catch (error) {
            console.error('❌ Error en login:', error);
            mostrarError('❌ Error de conexión con el servidor');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Ingresar</span><i class="fas fa-arrow-right"></i>';
        }
    });

    // Mostrar mensaje de error
    function mostrarError(mensaje) {
        if (errorText && errorMessage) {
            errorText.textContent = mensaje;
            errorMessage.classList.add('show');
            
            // Auto-ocultar después de 4 segundos
            setTimeout(() => {
                errorMessage.classList.remove('show');
            }, 4000);
        } else {
            alert(mensaje);
        }
    }

    // Cargar email guardado
    function cargarEmailGuardado() {
        const emailGuardado = localStorage.getItem('email_guardado');
        if (emailGuardado && emailInput) {
            emailInput.value = emailGuardado;
            if (recordarCheckbox) recordarCheckbox.checked = true;
            passwordInput.focus();
        }
    }
});
