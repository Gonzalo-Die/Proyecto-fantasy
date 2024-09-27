const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const xlsx = require('xlsx');  // Librería para manejar archivos Excel
const fs = require('fs');
const session = require('express-session');

// Inicializar la aplicación Express
const app = express();

// Conectar con la base de datos
const db = new sqlite3.Database('jugadores.db');

// Middleware para manejar solicitudes POST y sesiones
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Configurar la sesión
app.use(session({
    secret: 'secreto_fantasy',
    resave: false,
    saveUninitialized: true
}));

// Iniciar el servidor en el puerto 3000
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});


// Ruta para servir el archivo login.html como página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html')); // Cambia 'login.html' al nombre del archivo HTML que quieras mostrar
});


function requireLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.status(401).json({ error: 'Debes iniciar sesión para acceder a esta página.' });
    }
    next();
}

// Ruta del archivo donde se almacenan los usuarios y contraseñas
const loginFilePath = path.join(__dirname, 'login.txt');

function verificarUsuario(username, password) {
    if (!fs.existsSync(loginFilePath)) return false;

    const usuarios = fs.readFileSync(loginFilePath, 'utf-8').split('\n');
    console.log(usuarios);
    console.log(username + " ---- " + password);

    for (const usuario of usuarios) {
        const [storedUsername, storedPassword] = usuario.split(':').map(value => value.trim()); // Eliminar espacios en blanco y caracteres especiales

        console.log(`Comparando ${storedUsername} con ${username} y ${storedPassword} con ${password}`);

        if (storedUsername === username && storedPassword === password) {
            return true;
        }
    }
    return false;
}


// Función para registrar un nuevo usuario
function registrarUsuario(username, password) {
    if (!fs.existsSync(loginFilePath)) {
        fs.writeFileSync(loginFilePath, '', 'utf-8');
    }

    const usuarios = fs.readFileSync(loginFilePath, 'utf-8').split('\n');
    for (const usuario of usuarios) {
        const [storedUsername] = usuario.split(':');
        if (storedUsername === username) {
            return false; // El usuario ya existe
        }
    }

    // Agregar el nuevo usuario al archivo
    fs.appendFileSync(loginFilePath, `${username}:${password}\n`, 'utf-8');
    return true;
}

// Ruta para manejar el login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (verificarUsuario(username, password)) {
        req.session.usuario = username; // Guardar el usuario en la sesión
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Ruta para manejar el registro
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (registrarUsuario(username, password)) {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Usuario ya existente' });
    }
});


// Función para leer el archivo Excel
function leerExcel() {
    // Cargar el archivo Excel
    const workbook = xlsx.readFile('./Excel_datos.xlsx');
    
    // Leer la primera hoja del archivo
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convertir los datos de la hoja a formato JSON
    const datos = xlsx.utils.sheet_to_json(sheet);
    
    return datos;
}

// Ruta para obtener los datos del Excel
app.get('/datos_excel', requireLogin, (req, res) => { // Protegemos esta ruta
    const datosExcel = leerExcel(); // Leer los datos del Excel
    res.json({ data: datosExcel }); // Enviar los datos al frontend en formato JSON
});

// Función para leer una hoja específica de un archivo Excel
function leerExcelPuntosJornada() {
    // Cargar el archivo Excel
    const workbook = xlsx.readFile('./Excel_datos.xlsx');
    
    // Seleccionar la hoja específica, en este caso "Hoja2"
    const hoja = workbook.Sheets["Puntos_jornada"];
    
    // Convertir la hoja a formato JSON
    const datos = xlsx.utils.sheet_to_json(hoja);

    return datos; // Esto devolverá los datos de la "Hoja2"
}

// Ruta para obtener los datos del Excel
app.get('/puntos_jornada', requireLogin, (req, res) => { // Protegemos esta ruta
    const datosExcel = leerExcelPuntosJornada(); // Leer los datos del Excel
    res.json({ data: datosExcel }); // Enviar los datos al frontend en formato JSON
});

// Ruta para obtener jugadores filtrados por posición
app.get('/jugadores/:posicion', requireLogin, (req, res) => { // Protegemos esta ruta
    const posicion = req.params.posicion;
    
    // Consulta a la base de datos para obtener jugadores por posición
    db.all("SELECT * FROM JUGADORES WHERE posicion = ?", [posicion], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ jugadores: rows });
    });
});


// Ruta para guardar el equipo seleccionado por el usuario
app.post('/guardar-equipo', (req, res) => {
    const { defensa, medio, delantero, jornada } = req.body;
    const usuario = req.session.usuario;

    if (!usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userDir = path.join(__dirname, 'usuarios');  // Ruta de la carpeta "usuarios"
    const userFile = path.join(userDir, `${usuario}.txt`);  // Ruta del archivo de texto del usuario

    // Cargar el archivo del usuario y convertir a JSON si ya tiene datos
    let datosUsuario = {};
    if (fs.existsSync(userFile)) {
        const contenido = fs.readFileSync(userFile, 'utf-8');
        if (contenido) {
            datosUsuario = JSON.parse(contenido);  // Cargar lo que ya está guardado en el archivo
        }
    }

    // Verificar si ya hay datos para la jornada, si es así, preservar el campo "confirmado"
    const equipoExistente = datosUsuario[jornada] || {};
    const confirmado = equipoExistente.confirmado || false;  // Preservar el valor de confirmado si ya existe

    // Guardar el equipo seleccionado por jornada, pero conservar el valor de "confirmado"
    datosUsuario[jornada] = { defensa, medio, delantero, confirmado: confirmado };

    // Guardar los datos de vuelta en el archivo con formato legible
    fs.writeFileSync(userFile, JSON.stringify(datosUsuario, null, 2), 'utf-8');  // Formateado con 2 espacios y saltos de línea

    res.json({ success: true });
});



app.get('/obtener-equipo/:jornada', (req, res) => {
    const usuario = req.session.usuario;
    const jornada = req.params.jornada;

    if (!usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userDir = path.join(__dirname, 'usuarios');  // Ruta de la carpeta "usuarios"
    const userFile = path.join(userDir, `${usuario}.txt`);  // Ruta del archivo de texto del usuario

    if (fs.existsSync(userFile)) {
        const contenido = fs.readFileSync(userFile, 'utf-8');
        const datosUsuario = JSON.parse(contenido);

        // Si hay datos guardados para la jornada, enviarlos
        if (datosUsuario[jornada]) {
            const equipoGuardado = datosUsuario[jornada];

            // Obtener más detalles sobre los jugadores desde la base de datos
            db.all("SELECT * FROM JUGADORES WHERE nombre IN (?, ?, ?)", 
                   [equipoGuardado.defensa, equipoGuardado.medio, equipoGuardado.delantero], 
                   (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: 'Error al obtener jugadores de la base de datos' });
                }

                // Crear un objeto con más detalles de los jugadores
                const equipoCompleto = {
                    defensa: rows.find(j => j.nombre === equipoGuardado.defensa),
                    medio: rows.find(j => j.nombre === equipoGuardado.medio),
                    delantero: rows.find(j => j.nombre === equipoGuardado.delantero),
                    confirmado: equipoGuardado.confirmado  // Asegúrate de incluir el campo confirmado
                };

                res.json({ equipo: equipoCompleto });
            });
        } else {
            res.json({ equipo: null }); // No hay equipo guardado para esa jornada
        }
    } else {
        res.json({ equipo: null }); // El archivo no existe
    }
});

// Ruta para confirmar el equipo seleccionado por el usuario
app.post('/confirmar-equipo', (req, res) => {
    const { jornada } = req.body;
    const usuario = req.session.usuario;

    if (!usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userDir = path.join(__dirname, 'usuarios');  // Ruta de la carpeta "usuarios"
    const userFile = path.join(userDir, `${usuario}.txt`);  // Ruta del archivo de texto del usuario

    // Cargar el archivo del usuario y convertir a JSON si ya tiene datos
    let datosUsuario = {};
    if (fs.existsSync(userFile)) {
        const contenido = fs.readFileSync(userFile, 'utf-8');
        if (contenido) {
            datosUsuario = JSON.parse(contenido);  // Cargar lo que ya está guardado en el archivo
        }
    }

    // Verificar si ya hay datos para la jornada
    if (datosUsuario[jornada]) {
        datosUsuario[jornada].confirmado = true;  // Cambiar el valor a true si la jornada ya tiene equipo
    } else {
        return res.status(400).json({ error: 'No hay equipo guardado para confirmar' });
    }

    // Guardar los datos de vuelta en el archivo con formato legible
    fs.writeFileSync(userFile, JSON.stringify(datosUsuario, null, 2), 'utf-8');  // Formateado con 2 espacios y saltos de línea

    res.json({ success: true });
});


// Leer las fechas de las jornadas
function obtenerFechaJornada(jornada) {
    const fechasFilePath = path.join(__dirname, 'fechas_jornadas.txt');
    const contenido = fs.readFileSync(fechasFilePath, 'utf-8');
    const lineas = contenido.split('\n');
    
    const fechaJornada = lineas.find(linea => linea.startsWith(jornada + ':'));
    
    if (fechaJornada) {
        const fecha = fechaJornada.split(':')[1].trim();
        return fecha; // Devuelve la fecha en formato "dd/mm/yyyy"
    }
    return null;
}

// Ruta para obtener la fecha de la jornada
app.get('/obtener-fecha-jornada/:jornada', (req, res) => {
    const jornada = req.params.jornada;
    const fecha = obtenerFechaJornada(jornada);
    
    if (fecha) {
        res.json({ fecha });
    } else {
        res.status(404).json({ message: 'Jornada no encontrada' });
    }
});





// Ruta al archivo Valor_jugadores.txt
const valorJugadoresPath = path.join(__dirname, 'Valor_jugadores.txt');

function actualizarValorJugadores() {
    const workbook = xlsx.readFile('./Excel_datos.xlsx');
    const sheet = workbook.Sheets['Puntos_jornada'];
    const jugadores = xlsx.utils.sheet_to_json(sheet);

    // Verificamos el nombre de la columna TOTAL (asegurándonos de que esté correcta)
      // Esto te mostrará la estructura para verificar la clave correcta

    // Precios fijos
    const precios = [
        { rango: 26, cantidad: 4 },
        { rango: 22, cantidad: 4 },
        { rango: 18, cantidad: 4 },
        { rango: 14, cantidad: 4 },
        { rango: 10, cantidad: 4 },
        { rango: 8, cantidad: 4 },
        { rango: 5, cantidad: 4 }
    ];

    let jugadorIndex = 0;
    let contenidoArchivo = '';

    // Intentamos ordenar los jugadores por la clave correcta para `TOTAL`
    jugadores.sort((a, b) => {
        const totalA = parseFloat(a.total) || 0;  // Aseguramos que TOTAL sea numérico
        const totalB = parseFloat(b.total) || 0;
        return totalB - totalA;  // Ordenar de mayor a menor
    });

    precios.forEach(({ rango, cantidad }) => {
        for (let i = 0; i < cantidad; i++) {
            if (jugadores[jugadorIndex]) {
                const jugador = jugadores[jugadorIndex].Jugador;  // Nombre del jugador
                contenidoArchivo += `${jugador}:${rango}\n`;  // Formato jugador:precio
                jugadorIndex++;
            }
        }
    });

    

    // Escribir el archivo Valor_jugadores.txt
    const valorJugadoresPath = path.join(__dirname, 'Valor_jugadores.txt');

    // Aquí sobrescribimos el archivo limpiando cualquier contenido previo
    fs.writeFileSync(valorJugadoresPath, '', 'utf8');

    fs.writeFileSync(valorJugadoresPath, contenidoArchivo, 'utf8', (err) => {
        if (err) {
            console.error('Error al escribir el archivo Valor_jugadores.txt', err);
        }
    });
    
}

// Ruta para obtener el valor de un jugador por su nombre
app.get('/obtener-valor-jugador/:nombre', (req, res) => {
    const nombreJugador = req.params.nombre;
    const jornada = req.query.jornada; // Obtenemos la jornada desde los parámetros de la solicitud

    // Si es la jornada 1, devolver 0 como valor de los jugadores
    if (jornada === '1') {
        return res.json({ valor: 0 });
    }

    // Leer el archivo Valor_jugadores.txt
    const valorJugadoresPath = path.join(__dirname, 'Valor_jugadores.txt');

    if (fs.existsSync(valorJugadoresPath)) {
        const contenido = fs.readFileSync(valorJugadoresPath, 'utf-8');
        const lineas = contenido.split('\n');
        
        // Buscar el valor del jugador en el archivo
        const lineaJugador = lineas.find(linea => linea.startsWith(nombreJugador + ':'));

        if (lineaJugador) {
            const valor = lineaJugador.split(':')[1].trim();  // Obtener el valor
            return res.json({ valor });
        } else {
            return res.status(404).json({ message: 'Jugador no encontrado' });
        }
    } else {
        return res.status(500).json({ message: 'Archivo Valor_jugadores.txt no encontrado' });
    }
});




// Ruta para obtener el nombre del usuario desde la sesión
app.get('/obtener-usuario', (req, res) => {
    if (req.session.usuario) {
        res.json({ usuario: req.session.usuario });
    } else {
        res.status(401).json({ error: 'Usuario no autenticado' });
    }
});




// Función para obtener las jornadas pasadas
async function obtenerJornadasPasadas() {
    const fechasFilePath = path.join(__dirname, 'fechas_jornadas.txt');
    const contenido = fs.readFileSync(fechasFilePath, 'utf-8');
    const lineas = contenido.split('\n');
    
    const jornadasPasadas = [];
    const fechaActual = new Date();

    lineas.forEach(linea => {
        const [jornada, fecha] = linea.split(':');
        const [dia, mes, anio] = fecha.trim().split('/');
        const fechaJornada = new Date(`${anio}-${mes}-${dia}`);

        if (fechaJornada < fechaActual) {
            jornadasPasadas.push(parseInt(jornada));
        }
    });
    
    return jornadasPasadas;
}

// Función para calcular los puntos del equipo de una jornada
async function calcularPuntosEquipo(equipo, jornada) {
    let puntosTotales = 0;

    // Obtener los puntos de cada jugador
    console.log("-------------");
    puntosTotales += await obtenerPuntosJugador(equipo.defensa, jornada);
    puntosTotales += await obtenerPuntosJugador(equipo.medio, jornada);
    puntosTotales += await obtenerPuntosJugador(equipo.delantero, jornada);

    return puntosTotales;
}

// Función para obtener los puntos de un jugador en una jornada
async function obtenerPuntosJugador(jugador, jornada) {
    // Leer los puntos del archivo Excel correspondiente
    const datosJornada = leerExcelPuntosJornada();
    
    // Encontrar al jugador en los datos de la jornada
    const jugadorData = datosJornada.find(j => j.Jugador === jugador);
    console.log(jugadorData && jugadorData[jornada]);
    if (jugadorData && jugadorData[jornada]) {
        return jugadorData[jornada];  // Retornar los puntos de esa jornada
    }
    return 0;  // Si no hay datos, devolver 0 puntos
}


// Función para obtener el equipo del usuario en una jornada específica
async function obtenerEquipoPorJornada(usuario, jornada) {
    const userDir = path.join(__dirname, 'usuarios');
    const userFile = path.join(userDir, `${usuario}.txt`);

    if (fs.existsSync(userFile)) {
        const contenido = fs.readFileSync(userFile, 'utf-8');
        
        if (contenido.trim()) {
            const datosUsuario = JSON.parse(contenido);
            console.log(datosUsuario[jornada]);
            return datosUsuario[jornada] || null;
        }
    }
    return null;
}


// Ruta para actualizar el ranking de los usuarios
app.get('/actualizar-ranking', requireLogin, async (req, res) => {
    const puntuacionFilePath = path.join(__dirname, 'puntuacion.txt');
    const jornadasPasadas = await obtenerJornadasPasadas(); // Función que obtiene jornadas que ya han pasado

    console.log("Jornadas pasadas obtenidas:", jornadasPasadas);

    // Leer todos los archivos de usuarios en la carpeta "usuarios"
    const userDir = path.join(__dirname, 'usuarios');
    const usuariosArchivos = fs.readdirSync(userDir).filter(file => file.endsWith('.txt'));
    
    console.log("Archivos de usuarios encontrados:", usuariosArchivos);

    let puntuaciones = {};

    // Inicializar las puntuaciones de todos los usuarios a 0 antes de sumar las jornadas
    for (let archivoUsuario of usuariosArchivos) {
        const usuario = path.basename(archivoUsuario, '.txt');
        puntuaciones[usuario] = 0;  // Establecer la puntuación inicial a 0
    }

    console.log("Puntuaciones inicializadas a 0:", puntuaciones);

    // Para cada usuario, sumar los puntos de todas las jornadas pasadas
    for (let archivoUsuario of usuariosArchivos) {
        const usuario = path.basename(archivoUsuario, '.txt');
        let puntosTotalesUsuario = 0;  // Comenzar con 0 puntos para cada usuario

        console.log(`Procesando usuario: ${usuario}, Puntos actuales: ${puntosTotalesUsuario}`);

        const userFile = path.join(userDir, archivoUsuario);
        const contenido = fs.readFileSync(userFile, 'utf-8');
        
        // Verificar si el archivo de usuario está vacío
        if (!contenido.trim()) {
            console.log(`Archivo vacío o mal formateado para el usuario: ${usuario}`);
            puntuaciones[usuario] = 0;  // Mantener la puntuación en 0 si el archivo está vacío
            continue;  // Saltar a la siguiente iteración
        }

        let datosUsuario;
        try {
            datosUsuario = JSON.parse(contenido);
        } catch (error) {
            console.error(`Error al parsear JSON para el usuario: ${usuario}`, error);
            puntuaciones[usuario] = 0;  // Mantener la puntuación en 0 si hay un error en el archivo
            continue;  // Saltar a la siguiente iteración
        }

        // Comprobar si hay jornadas pasadas
        if (jornadasPasadas.length > 0) {
            // Calcular los puntos solo para las jornadas pasadas
            for (let jornada of jornadasPasadas) {
                const equipo = datosUsuario[jornada];
                if (equipo) {
                    const puntosJornada = await calcularPuntosEquipo(equipo, jornada);
                    puntosTotalesUsuario += puntosJornada;
                    console.log(`Usuario: ${usuario}, Jornada: ${jornada}, Puntos de la jornada: ${puntosJornada}, Puntos acumulados: ${puntosTotalesUsuario}`);
                }
            }
        } else {
            // Si no hay jornadas pasadas, todos los puntos deben ser 0
            puntosTotalesUsuario = 0;
            console.log(`No hay jornadas pasadas. Asignando 0 puntos a ${usuario}`);
        }

        // Actualizar la puntuación en el objeto puntuaciones
        puntuaciones[usuario] = puntosTotalesUsuario;
    }

    console.log("Puntuaciones actualizadas:", puntuaciones);

    // Guardar las nuevas puntuaciones en el archivo puntuacion.txt
    const nuevoContenido = Object.entries(puntuaciones)
        .map(([nombre, puntos]) => `${nombre}:${puntos}`)
        .join('\n');
    
    fs.writeFileSync(puntuacionFilePath, nuevoContenido, 'utf-8');

    console.log("Puntuaciones guardadas en puntuacion.txt");

    // Crear un array ordenado por puntuación para enviar al frontend
    const ranking = Object.entries(puntuaciones)
        .map(([nombre, puntos]) => ({ nombre, puntuacion: puntos }))
        .sort((a, b) => b.puntuacion - a.puntuacion);

    console.log("Ranking generado:", ranking);

    // Enviar el ranking al frontend
    res.json({ ranking });
});

