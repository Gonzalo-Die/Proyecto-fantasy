const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.use(session({
    secret: 'secreto_fantasy',
    resave: false,
    saveUninitialized: true
}));

// Función para verificar el login desde el archivo login.txt
function verificarCredenciales(usuario, contraseña, callback) {
    const filePath = path.join(__dirname, 'login.txt');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return callback(err, false);
        }

        const lines = data.split('\n');
        
        for (const line of lines) {
            const [fileUsuario, fileContraseña] = line.split(':');
            if (fileUsuario === usuario && fileContraseña.trim() === contraseña) {
                return callback(null, true);
            }
        }

        return callback(null, false);
    });
}

// Ruta para iniciar sesión
router.post('/login', (req, res) => {
    const { usuario, contraseña } = req.body;

    verificarCredenciales(usuario, contraseña, (err, esValido) => {
        if (err) {
            return res.status(500).json({ message: 'Error en el servidor' });
        }

        if (esValido) {
            req.session.usuario = usuario;
            // Redirigir a index.html después de iniciar sesión correctamente
            return res.redirect('/index.html');
        } else {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }
    });
});

// Middleware para proteger rutas
function requireLogin(req, res, next) {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/login.html'); // Redirigir a login si no está autenticado
    }
}

module.exports = { router, requireLogin };
