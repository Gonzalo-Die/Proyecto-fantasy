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
// Ruta para verificar si el usuario está logueado
app.get('/verificar-login', (req, res) => {
    if (req.session.usuario) {
        res.status(200).json({ autenticado: true });
    } else {
        res.status(401).json({ autenticado: false });
    }
});

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
    const workbook = xlsx.readFile('./FantasyFA.xlsx');
    
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
    const workbook = xlsx.readFile('./FantasyFA.xlsx');
    
    // Seleccionar la hoja específica, en este caso "Hoja2"
    const hoja = workbook.Sheets["Clasificacion"];
    
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
    const workbook = xlsx.readFile('./FantasyFA.xlsx');
    const sheet = workbook.Sheets['Clasificacion'];
    const jugadores = xlsx.utils.sheet_to_json(sheet);

    // Precios fijos por rango
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

    // Ordenamos los jugadores en función del valor en la columna TOTAL
    jugadores.sort((a, b) => {
        const totalA = parseFloat(a.total) || 0;  // Convertir los puntos a número, 0 si no hay puntos
        const totalB = parseFloat(b.total) || 0;
        return totalB - totalA;  // Ordenar de mayor a menor
    });

    // Iterar sobre los rangos de precios y jugadores
    precios.forEach(({ rango, cantidad }) => {
        for (let i = 0; i < cantidad; i++) {
            if (jugadores[jugadorIndex]) {
                const jugador = jugadores[jugadorIndex].Jugador;  // Nombre del jugador
                let totalPuntos = parseFloat(jugadores[jugadorIndex].total) || 0;

                // Si los puntos del jugador son 0, asignar un valor fijo de 5 millones
                if (totalPuntos === 0) {
                    contenidoArchivo += `${jugador}:5\n`;  // Valor 5M si tiene 0 puntos
                } else {
                    contenidoArchivo += `${jugador}:${rango}\n`;  // Mantener el valor del rango
                }

                jugadorIndex++;
            }
        }
    });

    // Escribir el archivo Valor_jugadores.txt
    const valorJugadoresPath = path.join(__dirname, 'Valor_jugadores.txt');

    // Sobrescribir el archivo con los nuevos valores
    fs.writeFileSync(valorJugadoresPath, contenidoArchivo, 'utf8', (err) => {
        if (err) {
            console.error('Error al escribir el archivo Valor_jugadores.txt', err);
        }
    });
}


// Ruta para actualizar los valores de los jugadores
app.get('/actualizar-valores', (req, res) => {
    try {
        actualizarValorJugadores(); // Llama a la función que actualiza los valores
        res.json({ success: true });
    } catch (error) {
        console.error('Error al actualizar los valores de los jugadores:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar los valores de los jugadores.' });
    }
});


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
    if (equipo && equipo.confirmado) {
 
        puntosTotales += await obtenerPuntosJugador(equipo.defensa, jornada);
        puntosTotales += await obtenerPuntosJugador(equipo.medio, jornada);
        puntosTotales += await obtenerPuntosJugador(equipo.delantero, jornada);

    } else {
        console.log(`Equipo no confirmado para la jornada ${jornada}. No se sumarán puntos.`);
    }

    return puntosTotales;
}

// Función para obtener los puntos de un jugador en una jornada
async function obtenerPuntosJugador(jugador, jornada) {
    // Leer los puntos del archivo Excel correspondiente
    const datosJornada = leerExcelPuntosJornada();
    
    // Verificar si el jugador y los datos de la jornada existen antes de proceder
    if (!jugador || typeof jugador !== 'string' || !jugador) {
        console.error(`Nombre de jugador inválido: ${jugador}`);
        return 0;  // Si el jugador es inválido, devolver 0 puntos
    }

    if (!datosJornada || !Array.isArray(datosJornada)) {
        console.error("Datos de jornada inválidos o no disponibles");
        return 0;  // Si los datos de la jornada no están disponibles, devolver 0 puntos
    }

    // Encontrar al jugador en los datos de la jornada
    const jugadorData = datosJornada.find(j => j.Jugador === jugador);

    if (jugadorData && jugadorData[jornada]) {
        return jugadorData[jornada];  // Retornar los puntos de esa jornada
    }

    // Si no hay datos para el jugador, retornar 0 puntos
    console.log(`No se encontraron datos para el jugador: ${jugador.trim()} en la jornada: ${jornada}`);
    return 0;
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
    const loginFilePath = path.join(__dirname, 'login.txt');

   

    // Leer el archivo login.txt
    const contenidoLogin = fs.readFileSync(loginFilePath, 'utf-8');
    
    // Separar los usuarios (formato usuario:contraseña)
    const usuarios = contenidoLogin
        .split('\n')
        .map(line => line.split(':')[0].trim()) // Obtener solo los nombres de usuario
        .filter(usuario => usuario); // Filtrar posibles líneas vacías

    

    let puntuaciones = {};

    // Inicializar las puntuaciones de todos los usuarios a 0 antes de sumar las jornadas
    for (let usuario of usuarios) {
        puntuaciones[usuario] = 0;  // Establecer la puntuación inicial a 0
    }

    

    // Para cada usuario, sumar los puntos de todas las jornadas pasadas
    for (let usuario of usuarios) {
        let puntosTotalesUsuario = 0;  // Comenzar con 0 puntos para cada usuario


        const userFilePath = path.join(__dirname, 'usuarios', `${usuario}.txt`);

        // Verificar si el archivo del usuario existe
        if (!fs.existsSync(userFilePath)) {
            
            puntuaciones[usuario] = 0;  // Mantener la puntuación en 0 si no existe archivo
            continue;  // Saltar a la siguiente iteración
        }

        const contenido = fs.readFileSync(userFilePath, 'utf-8');

        // Verificar si el archivo de usuario está vacío
        if (!contenido.trim()) {
           
            puntuaciones[usuario] = 0;  // Mantener la puntuación en 0 si el archivo está vacío
            continue;  // Saltar a la siguiente iteración
        }

        let datosUsuario;
        try {
            datosUsuario = JSON.parse(contenido);
        } catch (error) {
            
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



    // Crear un array ordenado por puntuación para enviar al frontend
    const ranking = Object.entries(puntuaciones)
        .map(([nombre, puntos]) => ({ nombre, puntuacion: puntos }))
        .sort((a, b) => b.puntuacion - a.puntuacion);

    console.log("Ranking generado:", ranking);

    // Enviar el ranking al frontend
    res.json({ ranking });
});


// Función para leer las estadísticas de la nueva hoja del Excel
function leerEstadisticasJugadores() {
    const filePath = path.join(__dirname, 'FantasyFA.xlsx');
    
    
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets["Estadisticas"];  // Cambiar a la hoja correcta si no es la primera

    const datos = xlsx.utils.sheet_to_json(sheet, { header: 1 });  // Lee todo como una matriz
    //console.log("Datos leídos desde el archivo Excel:", datos);

    const estadisticasPorJugador = [];

    // Recorrer la tabla a partir de la segunda fila (fila 1 contiene los encabezados)
    for (let i = 1; i < datos.length; i++) {
        const fila = datos[i];

        if (fila[0]) {  // Asegurarse de que la fila tenga un jugador
            const jugador = {
                nombre: fila[0],
                minutos: fila[1] || 0,
                titular: fila[2] || 0,
                suplente: fila[3] || 0,
                victorias: fila[4] || 0,
                empates: fila[5] || 0,
                derrotas: fila[6] || 0,
                goles: fila[7] || 0,
                asistencias: fila[8] || 0,
                golesEnContra: fila[10] || 0,
                amarillas: fila[11] || 0,
                rojas: fila[12] || 0,
                porcentajeTitular: fila[13] || 0,
                porcentajeNP: fila[14] || 0,
                porcentajeVictorias: fila[15] || 0,
                porcentajeDerrotas: fila[16] || 0,
                golesYAsistenciasPorPartido: fila[17] || 0
            };

            estadisticasPorJugador.push(jugador);
        }
    }

    console.log("Estadisticas obtenidas");
    return estadisticasPorJugador;
}

module.exports = leerEstadisticasJugadores;

// Endpoint para obtener las estadísticas de los jugadores
app.get('/estadisticas', (req, res) => {
    const estadisticas = leerEstadisticasJugadores();
    res.json({ estadisticas });
});

// Función para obtener todo el contenido del Excel
app.get('/obtener-puntos', (req, res) => {
    const filePath = path.join(__dirname, 'FantasyFA.xlsx');
    
    // Leer el archivo Excel completo
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets["Clasificacion"]; // Cambia el nombre de la hoja si es necesario

    // Convertir todos los datos de la hoja a un formato JSON
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    

    // Devolver todos los datos como respuesta JSON
    res.json(data);
});

// Servir el archivo fechas_jornadas.txt
app.get('/fechas_jornadas.txt', (req, res) => {
    const filePath = path.join(__dirname, 'fechas_jornadas.txt');
    res.sendFile(filePath);
});


// Función para obtener la posición de un jugador por su nombre
app.get('/obtener-posicion-jugador/:nombre', (req, res) => {
    const nombreJugador = req.params.nombre;

    // Consulta a la base de datos para obtener la posición del jugador por su nombre
    db.get("SELECT posicion FROM JUGADORES WHERE nombre = ?", [nombreJugador], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (row) {
            res.json({ posicion: row.posicion }); // Devolver la posición del jugador
        } else {
            res.status(404).json({ message: 'Jugador no encontrado' }); // Si no se encuentra el jugador
        }
    });
});


const NodeCache = require("node-cache");
const rankingCache = new NodeCache({ stdTTL: 60 }); // Caché con una duración de 60 segundos

app.get('/actualizar-ranking', async (req, res) => {
    try {
        // Intentar recuperar el ranking de la caché
        let ranking = rankingCache.get('ranking');

        if (!ranking) {
            // Si no está en la caché, obtenerlo del servidor y guardarlo en la caché
            ranking = await obtenerRanking(); // Función que obtiene el ranking de la base de datos
            rankingCache.set('ranking', ranking);
        }

        res.json({ ranking });

    } catch (error) {
        console.error("Error al actualizar el ranking:", error);
        res.status(500).send('Error al obtener el ranking');
    }
});
