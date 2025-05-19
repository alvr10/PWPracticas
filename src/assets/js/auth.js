// src/assets/js/auth.js

// Base URL for API calls
const API_BASE_URL = 'http://localhost:8000/src/includes/auth/';
document.addEventListener('DOMContentLoaded', function() {
    // Check which form is present on the page
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    
    if (registerForm) {
        initRegisterForm();
        // Cargar países al cargar la página
        cargarPaises();
        // Event listeners para selects dependientes
        document.getElementById('pais').addEventListener('change', function() {
            cargarProvincias(this.value);
        });
        document.getElementById('provincia').addEventListener('change', function() {
            cargarLocalidades(this.value);
        });
    }
    
    if (loginForm) {
        initLoginForm();
    }
    
    // Check if user is logged in when page loads
    checkAuthStatus();
});

function checkAuthStatus() {
    // Check if token exists in localStorage
    const token = localStorage.getItem('auth_token');
    const userData = JSON.parse(localStorage.getItem('user_data'));
    
    if (token && userData) {
        // Validate token with server
        fetch(API_BASE_URL + 'check_session.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: token })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.valid) {
                // Token is invalid, clear storage
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_data');
            } else {
                // If we're on a login or register page, redirect to dashboard
                const currentPath = window.location.pathname;
                if (currentPath.includes('/auth/login.html') || currentPath.includes('/auth/register.html')) {
                    window.location.href = '../modules/dashboard/index.html';
                }
            }
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
        });
    }
}

function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const messageContainer = document.getElementById('message-container');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            // Clear previous messages
            messageContainer.innerHTML = '';
            
            // Validate form
            if (!email || !password) {
                showMessage('Por favor, complete todos los campos', 'error');
                return;
            }
            
            // Show loading state
            const loginBtn = document.getElementById('login-btn');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Iniciando sesión...';
            
            // Send login request
            fetch(API_BASE_URL + 'login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    remember: remember
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store token and user data in localStorage
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    
                    // Show success message
                    showMessage('Inicio de sesión exitoso! Redirigiendo...', 'success');
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '../modules/social/feed.html';
                    }, 1000);
                } else {
                    // Show error message
                    showMessage(data.message || 'Error al iniciar sesión', 'error');
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Iniciar sesión';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al conectar con el servidor', 'error');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Iniciar sesión';
            });
        });
    }
}

function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    const messageContainer = document.getElementById('message-container');
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const nombre = document.getElementById('nombre').value;
            const apellidos = document.getElementById('apellidos').value;
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const fechaNacimiento = document.getElementById('fecha_nacimiento').value;
            const localidadId = document.getElementById('localidad').value;
            const actividadPreferida = document.getElementById('actividad_preferida').value;
            const termsAccepted = document.getElementById('terms').checked;
            
            // Clear previous messages
            messageContainer.innerHTML = '';
            
            // Validate form
            if (!nombre || !apellidos || !username || !email || !password || !confirmPassword || 
                !fechaNacimiento || !localidadId || !actividadPreferida) {
                showMessage('Por favor, complete todos los campos obligatorios', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showMessage('Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (!termsAccepted) {
                showMessage('Debe aceptar los términos y condiciones', 'error');
                return;
            }
            
            // Show loading state
            const registerBtn = document.getElementById('register-btn');
            registerBtn.disabled = true;
            registerBtn.textContent = 'Registrando...';
            
            // Send registration request
            fetch(API_BASE_URL + 'register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: nombre,
                    apellidos: apellidos,
                    username: username,
                    email: email,
                    password: password,
                    fecha_nacimiento: fechaNacimiento,
                    localidad_id: localidadId,
                    actividad_preferida_id: actividadPreferida
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    showMessage('Registro exitoso! Por favor revise su correo para validar su cuenta.', 'success');
                    
                    // Redirect to login page after a delay
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 3000);
                } else {
                    // Show error message
                    showMessage(data.message || 'Error en el registro', 'error');
                    registerBtn.disabled = false;
                    registerBtn.textContent = 'Registrarse';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al conectar con el servidor', 'error');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Registrarse';
            });
        });
    }
}

function showMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    messageContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    messageContainer.scrollIntoView({ behavior: 'smooth' });
}

function cargarPaises() {
    // Aquí iría una llamada AJAX para cargar países desde la base de datos
    // Ejemplo simplificado:
    const paises = [
        {id: 1, nombre: 'España'},
        {id: 2, nombre: 'Portugal'},
        {id: 3, nombre: 'Francia'}
    ];
    const selectPais = document.getElementById('pais');
    paises.forEach(pais => {
        const option = document.createElement('option');
        option.value = pais.id;
        option.textContent = pais.nombre;
        selectPais.appendChild(option);
    });
}

function cargarProvincias(paisId) {
    const selectProvincia = document.getElementById('provincia');
    selectProvincia.innerHTML = '<option value="">Selecciona una provincia</option>';
    selectProvincia.disabled = false;
    
    // Ejemplo simplificado:
    const provincias = [
        {id: 1, nombre: 'Madrid', pais_id: 1},
        {id: 2, nombre: 'Barcelona', pais_id: 1},
        {id: 3, nombre: 'Lisboa', pais_id: 2}
    ];
    
    const provinciasFiltradas = provincias.filter(p => p.pais_id == paisId);
    provinciasFiltradas.forEach(provincia => {
        const option = document.createElement('option');
        option.value = provincia.id;
        option.textContent = provincia.nombre;
        selectProvincia.appendChild(option);
    });
    
    // Resetear localidad
    document.getElementById('localidad').innerHTML = '<option value="">Primero selecciona una provincia</option>';
    document.getElementById('localidad').disabled = true;
}

function cargarLocalidades(provinciaId) {
    const selectLocalidad = document.getElementById('localidad');
    selectLocalidad.innerHTML = '<option value="">Selecciona una localidad</option>';
    selectLocalidad.disabled = false;
    
    // Ejemplo simplificado:
    const localidades = [
        {id: 1, nombre: 'Madrid', provincia_id: 1},
        {id: 2, nombre: 'Alcalá de Henares', provincia_id: 1},
        {id: 3, nombre: 'Barcelona', provincia_id: 2},
        {id: 4, nombre: 'Hospitalet', provincia_id: 2}
    ];
    
    const localidadesFiltradas = localidades.filter(l => l.provincia_id == provinciaId);
    localidadesFiltradas.forEach(localidad => {
        const option = document.createElement('option');
        option.value = localidad.id;
        option.textContent = localidad.nombre;
        selectLocalidad.appendChild(option);
    });
}

// Function to log out the user
function logout() {
    fetch(API_BASE_URL + 'logout.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: localStorage.getItem('auth_token')
        })
    })
    .then(response => response.json())
    .then(data => {
        // Clear local storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        // Redirect to login page
        window.location.href = '../auth/login.html';
    })
    .catch(error => {
        console.error('Error logging out:', error);
        // Even if there's an error, clear storage and redirect
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '../auth/login.html';
    });
}