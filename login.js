// Selección de elementos del DOM para evitar accesos repetitivos
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Función para cambiar entre formularios de login y registro
function toggleForms(event, showRegister) {
    event.preventDefault();
    if (showRegister) {
        loginContainer.style.display = 'none';
        registerContainer.style.display = 'block';
    } else {
        registerContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    }
}

// Asignar eventos para cambiar entre formularios
document.getElementById('register-link').addEventListener('click', (event) => toggleForms(event, true));
document.getElementById('login-link').addEventListener('click', (event) => toggleForms(event, false));

// Función para enviar datos del formulario al backend
async function enviarFormulario(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Error en la solicitud:', error);
        return { success: false };
    }
}

// Manejo del formulario de login
loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const result = await enviarFormulario('/login', { username, password });

    if (result.success) {
        window.location.href = 'inicio.html';
    } else {
        alert('Usuario o contraseña incorrectos.');
    }
});

// Manejo del formulario de registro
registerForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;

    const result = await enviarFormulario('/register', { username: newUsername, password: newPassword });
    

    if (result.success) {
        alert('Registro exitoso. Ahora puedes iniciar sesión.');
        registerContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    } else {
        alert('Error al registrar el usuario. Intenta con otro nombre.');
    }
});