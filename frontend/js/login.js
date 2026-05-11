document.addEventListener('DOMContentLoaded', function() {
    const loginForm        = document.getElementById('loginForm');
    const emailInput       = document.getElementById('email');
    const passwordInput    = document.getElementById('password');
    const togglePassword   = document.getElementById('togglePassword');
    const loginBtn         = document.getElementById('loginBtn');
    const errorMessage     = document.getElementById('errorMessage');
    const errorText        = document.getElementById('errorText');
    const recordarCheckbox = document.getElementById('recordar');
    

    // Si ya hay sesión activa, redirigir
    const token = localStorage.getItem('token');
    if (token) {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        redirigirPorRol(usuario.rol);
        return;
    }

    cargarEmailGuardado();

    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const tipo = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = tipo;
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    emailInput.addEventListener('input',    () => emailInput.style.border    = '');
    passwordInput.addEventListener('input', () => passwordInput.style.border = '');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email    = emailInput.value.trim();
        const password = passwordInput.value.trim();

        emailInput.style.border    = '';
        passwordInput.style.border = '';

        if (!email || !password) {
            mostrarError('Por favor complete todos los campos');
            if (!email)    emailInput.style.border    = '1px solid #e74c3c';
            if (!password) passwordInput.style.border = '1px solid #e74c3c';
            return;
        }

        loginBtn.disabled  = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                if (recordarCheckbox.checked) {
                    localStorage.setItem('email_guardado', email);
                } else {
                    localStorage.removeItem('email_guardado');
                }

                localStorage.setItem('token',   data.token);
                localStorage.setItem('usuario', JSON.stringify(data.usuario));

                redirigirPorRol(data.usuario.rol);
            } else {
                mostrarError(data.message || 'Error al iniciar sesión');
                loginBtn.disabled  = false;
                loginBtn.innerHTML = '<span>Ingresar</span><i class="fas fa-arrow-right"></i>';
            }

        } catch (error) {
            mostrarError('Error de conexión con el servidor');
            loginBtn.disabled  = false;
            loginBtn.innerHTML = '<span>Ingresar</span><i class="fas fa-arrow-right"></i>';
        }
    });

    function redirigirPorRol(rol) {
        if (!rol) { window.location.href = 'dashboard.html'; return; }

        const r = rol.toString().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        const destinos = {
            'admin':         'dashboard.html',
            'medico':        'medico-dashboard.html',
            'recepcionista': 'recepcion-dashboard.html',
            'paciente':      'paciente-dashboard.html'
        };

        window.location.href = destinos[r] || 'dashboard.html';
    }

    function mostrarError(mensaje) {
        if (errorText && errorMessage) {
            errorText.textContent = mensaje;
            errorMessage.classList.add('show');
            setTimeout(() => errorMessage.classList.remove('show'), 4000);
        }
    }

    function cargarEmailGuardado() {
        const emailGuardado = localStorage.getItem('email_guardado');
        if (emailGuardado && emailInput) {
            emailInput.value = emailGuardado;
            if (recordarCheckbox) recordarCheckbox.checked = true;
            passwordInput.focus();
        }
    }
});