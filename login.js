document.getElementById('register-link').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
});

document.getElementById('login-link').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
});

document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (result.success) {
        window.location.href = 'inicio.html'; // Redirigir a la página principal
    } else {
        alert('Usuario o contraseña incorrectos.');
    }
});

document.getElementById('register-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const newUsername = document.getElementById('new-username').value;
    const newPassword = document.getElementById('new-password').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword })
    });

    const result = await response.json();

    if (result.success) {
        alert('Registro exitoso. Ahora puedes iniciar sesión.');
        document.getElementById('register-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
    } else {
        alert('Error al registrar el usuario. Intenta con otro nombre.');
    }
});
