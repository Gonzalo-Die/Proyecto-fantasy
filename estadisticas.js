// Función para mostrar el spinner
function mostrarSpinner() {
    const spinner = document.getElementById('spinner');
    spinner.style.visibility = 'visible';
}

// Función para ocultar el spinner
function ocultarSpinner() {
    const spinner = document.getElementById('spinner');
    spinner.style.visibility = 'hidden';
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        mostrarSpinner(); // Mostrar el spinner al inicio de la carga

        // Verificar si el usuario está autenticado
        const respuestaLogin = await fetch('/verificar-login');
        const resultadoLogin = await respuestaLogin.json();

        // Si no está autenticado, redirigir al login
        if (!resultadoLogin.autenticado) {
            window.location.href = '/'; // Redirigir a la página de login
            return; // No continuar si no está autenticado
        }

        // Si está autenticado, continuar con la lógica de obtención de estadísticas y renderizado
        const jugadores = await obtenerEstadisticas(); // Obtener estadísticas de los jugadores
        const valoresJugadores = await asignarValoresParaJornadasOcurridas(); // Obtener valores
        const puntosJugadores = await obtenerPuntos(); // Obtener puntos de los jugadores

        ocultarSpinner(); // Ocultar el spinner después de cargar los datos

        // Inicialmente mostrar las estadísticas de jugadores
        mostrarEstadisticas(jugadores, valoresJugadores);

        // Configurar los botones para alternar vistas
        document.getElementById('boton-estadisticas').addEventListener('click', async () => {
            mostrarSpinner(); // Mostrar el spinner cuando se cambia a estadísticas
            await mostrarEstadisticas(jugadores, valoresJugadores);
            ocultarSpinner(); // Ocultar el spinner después de cargar
        });

        document.getElementById('boton-rankings').addEventListener('click', async () => {
            mostrarSpinner(); // Mostrar el spinner cuando se cambia a rankings
            await mostrarRankings(jugadores);
            ocultarSpinner(); // Ocultar el spinner después de cargar
        });

    } catch (error) {
        ocultarSpinner(); // Asegurarse de ocultar el spinner en caso de error
        alert('Error al obtener estadísticas o puntos: ' + error.message);
    }
});

// Función para mostrar las estadísticas
async function mostrarEstadisticas(jugadores, valoresJugadores) {
    const jugadoresContainer = document.getElementById('jugadores-container');
    const rankingsContainer = document.getElementById('rankings-container');

    // Mostrar el contenedor de estadísticas y ocultar el de rankings
    jugadoresContainer.style.display = 'block';
    rankingsContainer.style.display = 'none';

    renderizarJugadores(jugadores, valoresJugadores);
}

// Función para mostrar los rankings
async function mostrarRankings(jugadores) {
    const jugadoresContainer = document.getElementById('jugadores-container');
    const rankingsContainer = document.getElementById('rankings-container');

    // Mostrar el contenedor de rankings y ocultar el de estadísticas
    jugadoresContainer.style.display = 'none';
    rankingsContainer.style.display = 'block';

    renderizarRankings(jugadores);
}





// Helper function to render the points of the last 5 matches, with padding for missing matches
function renderUltimosPuntos(puntos) {
    // Fill missing points with 0 (or any placeholder like "-")
    const puntosJornadas = puntos.slice(1).slice(-5); // Ignore total points and take last 5
    const maxJornadas = 5;
    const puntosConPadding = [...puntosJornadas];

    while (puntosConPadding.length < maxJornadas) {
        puntosConPadding.unshift(0); // Add 0 for missing games at the start
    }


    // Generate HTML for the last 5 matches with CSS classes
    return puntosConPadding.map(punto => {
        let claseColor = punto > 0 ? 'punto-verde' : punto < 0 ? 'punto-rojo' : 'punto-amarillo';
        return `
            <div class="punto-box ${claseColor}">
                ${punto}
            </div>
        `;
    }).join('');
}


async function renderizarJugadores(jugadores, valoresJugadores) {
    const jugadoresContainer = document.getElementById('jugadores-container');
    jugadoresContainer.innerHTML = ''; // Limpiar el contenedor antes de agregar nuevos jugadores

    const puntosPorJugador = await obtenerPuntos(); // Obtener puntos de los jugadores

    for (const jugadorNombre of Object.keys(jugadores)) {
        // Verificar si el nombre del jugador es "Partidos" o si es inválido
        if (!jugadorNombre || jugadorNombre.trim() === '' || jugadorNombre === 'undefined' || jugadorNombre.toLowerCase() === 'partidos') {
            continue; // Saltar la fila "Partidos" o jugadores inválidos
        }

        const jugador = jugadores[jugadorNombre];  // Obtener estadísticas del jugador actual
        const ultimoValor = obtenerUltimoValorJugador(jugadorNombre, valoresJugadores);  // Obtener el valor de la última jornada

        const puntosJugador = puntosPorJugador[jugadorNombre] || [0]; // Si no tiene puntos, asignar [0]
        const puntosTotales = puntosJugador[0]; // El primer elemento es el total de puntos
        const jornadasJugadas = puntosJugador.length - 1; // Número de jornadas jugadas

        const nombreImagen = jugadorNombre.replace(/\s+/g, '_'); // Reemplazar espacios por guiones bajos

        // Crear la tarjeta de jugador
        const jugadorCard = document.createElement('div');
        jugadorCard.classList.add('jugador-card');

        // Plantilla de la tarjeta de jugador con botón para ver detalles
        jugadorCard.innerHTML = `
            <div class="jugador-info">
                <img src="img/${nombreImagen}.jpg" alt="${jugadorNombre}">
                <div>
                    <div class="jugador-nombre">${jugadorNombre}</div>
                    <div class="jugador-valor">Valor: ${ultimoValor}M €</div>
                    <div class="jugador-ultimos-puntos">
                        ${renderUltimosPuntos(puntosJugador)}
                    </div>
                </div>
            </div>
            <div class="jugador-stats">
                <div class="jugador-puntos-totales">Puntos totales: ${puntosTotales || 0}</div>
                <div class="jugador-puntos-media">Media: ${(puntosTotales / (jornadasJugadas || 1)).toFixed(2)}</div>
                <div class="jugador-actions">
                    <button onclick="toggleDetalles('${jugadorNombre}')">Detalles</button>
                </div>
            </div>
        `;

        // Crear el contenedor de estadísticas detalladas
        const estadisticasDetalladas = document.createElement('div');
        estadisticasDetalladas.classList.add('estadisticas-detalladas');
        estadisticasDetalladas.id = `detalles-${jugadorNombre}`;
        estadisticasDetalladas.style.display = 'none'; // Oculto por defecto

        estadisticasDetalladas.innerHTML = `
            <table>
                <tr>
                    <td>Minutos jugados</td><td>${jugador.minutos}</td>
                    <td>Titular</td><td>${jugador.titular}</td>
                </tr>
                <tr>
                    <td>Suplente</td><td>${jugador.suplente}</td>
                    <td>Victorias</td><td>${jugador.victorias}</td>
                </tr>
                <tr>
                    <td>Empates</td><td>${jugador.empates}</td>
                    <td>Derrotas</td><td>${jugador.derrotas}</td>
                </tr>
                <tr>
                    <td>Goles</td><td>${jugador.goles}</td>
                    <td>Asistencias</td><td>${jugador.asistencias}</td>
                </tr>
                <tr>
                    <td>Goles en contra</td><td>${jugador.golesEnContra}</td>
                    <td>G + A por Partido</td><td>${jugador.golesYAsistenciasPorPartido.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>Amarillas</td><td>${jugador.amarillas}</td>
                    <td>Rojas</td><td>${jugador.rojas}</td>
                    
                </tr>
                <tr>
                    <td>% Titular</td><td>${jugador.porcentajeTitular.toFixed(2)}%</td>
                    <td>% Victorias</td><td>${jugador.porcentajeVictorias.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>% Derrotas</td><td>${jugador.porcentajeDerrotas.toFixed(2)}%</td>
                    <td>% No Jugados</td><td>${jugador.porcentajeNP.toFixed(2)}%</td>
                    
                </tr>
            </table>
        `;

        // Append both player card and detailed statistics below it
        jugadoresContainer.appendChild(jugadorCard);
        jugadoresContainer.appendChild(estadisticasDetalladas);
    }
}

// Function to toggle the visibility of detailed statistics
function toggleDetalles(jugadorNombre) {
    const detalles = document.getElementById(`detalles-${jugadorNombre}`);
    if (detalles) {
        detalles.style.display = (detalles.style.display === 'none' || detalles.style.display === '') ? 'block' : 'none';
    }
}


// Toggle function to show/hide player details
function toggleDetalles(jugadorNombre) {
    const detallesDiv = document.getElementById(`detalles-${jugadorNombre}`);
    if (detallesDiv.style.display === 'none') {
        detallesDiv.style.display = 'block'; // Mostrar
    } else {
        detallesDiv.style.display = 'none';  // Ocultar
    }
}






// Función auxiliar para obtener el último valor del jugador
function obtenerUltimoValorJugador(jugadorNombre, valoresJugadores) {
    // Iteramos en el diccionario de valoresJugadores para encontrar el valor del jugador más reciente
    let ultimoValor = 5; // Valor por defecto si no se encuentra
    Object.keys(valoresJugadores).forEach(jornada => {
        valoresJugadores[jornada].forEach(jugador => {
            if (jugador.hasOwnProperty(jugadorNombre)) {
                ultimoValor = jugador[jugadorNombre];
            }
        });
    });
    return ultimoValor;
}


// Función para leer fechas de jornadas y devolver solo las ocurridas
async function obtenerJornadasOcurridas() {
    try {
        const response = await fetch('/fechas_jornadas.txt');
        const fechasTexto = await response.text();
        const fechasArray = fechasTexto.trim().split('\n');

        const jornadasOcurridas = [];
        const hoy = new Date();

        fechasArray.forEach(linea => {
            const [jornada, fecha] = linea.split(':');
            const [dia, mes, año] = fecha.trim().split('/');

            // Asegurarse de que el día y mes tengan siempre dos dígitos
            const diaFormateado = dia.padStart(2, '0');
            const mesFormateado = mes.padStart(2, '0');

            // Crear la fecha en formato ISO compatible (YYYY-MM-DD)
            const fechaJornada = new Date(`${año}-${mesFormateado}-${diaFormateado}`);

            // Si la fecha de la jornada es anterior o igual a hoy, la consideramos ocurrida
            if (fechaJornada <= hoy) {
                jornadasOcurridas.push(parseInt(jornada));
            }
        });


        return jornadasOcurridas;
    } catch (error) {
        console.error('Error al leer el archivo de jornadas:', error);
        return [];
    }
}


async function obtenerEstadisticas() {
    try {
        const response = await fetch('/estadisticas');
        const data = await response.json();

        // Creamos un diccionario/objeto donde almacenar las estadísticas
        const estadisticasPorJugador = {};

        // Recorrer los datos de los jugadores y guardarlos en el formato adecuado
        data.estadisticas.forEach(jugador => {
            estadisticasPorJugador[jugador.nombre] = {
                minutos: jugador.minutos,
                titular: jugador.titular,
                suplente: jugador.suplente,
                victorias: jugador.victorias,
                empates: jugador.empates,
                derrotas: jugador.derrotas,
                goles: jugador.goles,
                asistencias: jugador.asistencias,
                golesEnContra: jugador.golesEnContra,
                amarillas: jugador.amarillas,
                rojas: jugador.rojas,
                porcentajeTitular: jugador.porcentajeTitular,
                porcentajeNP: jugador.porcentajeNP,
                porcentajeVictorias: jugador.porcentajeVictorias,
                porcentajeDerrotas: jugador.porcentajeDerrotas,
                golesYAsistenciasPorPartido: jugador.golesYAsistenciasPorPartido
            };
        });

        // Devolver el diccionario/objeto con las estadísticas de todos los jugadores
        return estadisticasPorJugador;

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {};
    }
}


async function obtenerPuntos() {
    const puntosResponse = await fetch(`/obtener-puntos?cacheBuster=${Date.now()}`, { cache: 'no-store' });

    const puntosData = await puntosResponse.json();

    // Crear un diccionario para almacenar los puntos por jugador
    const puntosPorJugador = {};

    const jornadasOcurridas = await obtenerJornadasOcurridas();


    // Ignoramos el primer elemento (los encabezados) y verificamos que el nombre del jugador no esté vacío
    puntosData.slice(1).forEach(jugador => { // Usamos slice(1) para omitir los encabezados
        if (jugador[0] && jugador[0] !== 'undefined') { // Verifica que el nombre del jugador no esté vacío o indefinido
            const nombreJugador = jugador[0];
            const totalPuntos = jugador[1];

            // Obtenemos los puntos por cada jornada ocurrida
            let puntosPorJornada = jornadasOcurridas.map(jornada => {
                return jugador[jornada + 1] || 0; // jornada + 1 porque las jornadas empiezan en el índice 2
            });

            // Crear una lista que incluye los puntos totales y los puntos por jornada
            puntosPorJugador[nombreJugador] = [totalPuntos, ...puntosPorJornada];
            

        }
    });


    return puntosPorJugador;
}


// Función para obtener puntos acumulados por jornada
async function obtenerPuntosAcumulados() {
    const puntosResponse = await fetch('/obtener-puntos');
    const puntosData = await puntosResponse.json();

    // Ignorar la primera fila que contiene los headers
    const jugadoresPuntos = puntosData.slice(1);

    const puntosAcumuladosPorJugador = {};

    jugadoresPuntos.forEach(jugador => {
        let puntosAcumulados = [];
        let acumulado = 0;

        const nombreJugador = jugador[0]; // El nombre del jugador está en la columna 0
        const totalPuntos = jugador[1];   // La columna de total está en el índice 1

        // Calcular los puntos acumulados por jornada
        for (let i = 2; i < jugador.length; i++) {
            acumulado += jugador[i]; // Sumar los puntos de la jornada i
            puntosAcumulados.push(acumulado); // Añadir el valor acumulado
        }

        // Asignar al diccionario: Nombre del jugador como clave y [puntos_totales, puntos_acumulados...] como valor
        puntosAcumuladosPorJugador[nombreJugador] = [totalPuntos, ...puntosAcumulados];
    });

    return puntosAcumuladosPorJugador;
}


async function calcularRankingPorJornada() {
    const diccionarioPuntos = await obtenerPuntosAcumulados();  // Usar await porque la función es asíncrona

    // Obtenemos las jornadas que se han jugado (asumiendo que todas las listas tienen el mismo número de jornadas)
    const numJornadas = diccionarioPuntos[Object.keys(diccionarioPuntos)[0]].length - 1; // Asumimos que el primer elemento de la lista es el total

    // Diccionario que almacenará el ranking de jugadores por jornada
    const rankingPorJornada = {};

    // Iteramos sobre cada jornada
    for (let j = 1; j <= numJornadas; j++) {
        // Crear una lista con cada jugador y sus puntos en la jornada j
        let jugadoresEnJornada = Object.keys(diccionarioPuntos).map(nombre => {
            if (nombre && nombre !== 'undefined') { // Verificamos que el nombre no sea vacío ni "undefined"
                return {
                    nombre: nombre,  // Nombre del jugador
                    puntos: diccionarioPuntos[nombre][j] || 0  // Los puntos de la jornada j
                };
            }
        }).filter(jugador => jugador !== undefined); // Filtrar cualquier jugador que sea undefined

        // Ordenar la lista de jugadores de mayor a menor por los puntos en la jornada j
        jugadoresEnJornada.sort((a, b) => b.puntos - a.puntos);

        // Crear la lista con el formato {jugador:puntos}
        const rankingConPuntos = jugadoresEnJornada.map(jugador => {
            return { [jugador.nombre]: jugador.puntos };
        });

        // Asignar la lista al diccionario con la clave como el número de la jornada
        rankingPorJornada[j] = rankingConPuntos;
    }

    return rankingPorJornada;
}


async function asignarValoresParaJornadasOcurridas() {
    // Obtener el ranking por jornada de todas las jornadas
    const rankingPorJornada = await calcularRankingPorJornada();

    // Obtener solo las jornadas que ya han ocurrido
    const jornadasOcurridas = await obtenerJornadasOcurridas();

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

    // Diccionario que almacenará los valores por jornada
    const valoresPorJornadaOcurrida = {};

    // Iteramos solo sobre las jornadas que han ocurrido
    jornadasOcurridas.forEach(jornada => {
        const jugadoresEnJornada = rankingPorJornada[jornada]; // Jugadores ordenados por jornada

        let jugadorIndex = 0;
        valoresPorJornadaOcurrida[jornada] = []; // Crear una lista para cada jornada

        // Asignar los valores según los rangos de precios
        precios.forEach(({ rango, cantidad }) => {
            for (let i = 0; i < cantidad; i++) {
                if (jugadoresEnJornada[jugadorIndex]) {
                    const jugador = jugadoresEnJornada[jugadorIndex];
                    const nombreJugador = Object.keys(jugador)[0]; // Nombre del jugador
                    const puntosJugador = jugador[nombreJugador]; // Puntos del jugador

                    // Si los puntos del jugador son 0, asignar un valor fijo de 5 millones
                    if (puntosJugador === 0) {
                        valoresPorJornadaOcurrida[jornada].push({ [nombreJugador]: 5 });
                    } else {
                        // Asignar el valor según el rango
                        valoresPorJornadaOcurrida[jornada].push({ [nombreJugador]: rango });
                    }

                    jugadorIndex++;
                }
            }
        });

        // Asignar 5 millones a los jugadores restantes que no han sido cubiertos por los rangos y tienen 0 puntos
        while (jugadorIndex < jugadoresEnJornada.length) {
            const jugador = jugadoresEnJornada[jugadorIndex];
            const nombreJugador = Object.keys(jugador)[0];
            const puntosJugador = jugador[nombreJugador];

            valoresPorJornadaOcurrida[jornada].push({ [nombreJugador]: 5 });
            jugadorIndex++;
        }
    });

    // Devolver los valores por jornada que ya han ocurrido
    return valoresPorJornadaOcurrida;
}


// Función para obtener la posición de un jugador por su nombre
async function obtenerPosicionJugador(nombreJugador) {
    try {
        const response = await fetch(`/obtener-posicion-jugador/${encodeURIComponent(nombreJugador)}`);
        
        if (!response.ok) {
            throw new Error(`Error al obtener la posición del jugador: ${response.statusText}`);
        }

        const data = await response.json();
        return data.posicion; // Devuelve la posición del jugador
    } catch (error) {
        console.error('Error al obtener la posición del jugador:', error);
        return 'Posición no encontrada'; // En caso de error, devolver un mensaje por defecto
    }
}

function renderizarRankings(jugadores) {
    const rankingsContainer = document.getElementById('rankings-container');
    rankingsContainer.innerHTML = ''; // Limpiar el contenedor antes de agregar nuevos rankings

    // Definir las categorías para los rankings
    const categorias = [
        { key: 'minutos', titulo: 'Top 3 - Minutos Jugados' },
        { key: 'goles', titulo: 'Top 3 - Goles' },
        { key: 'asistencias', titulo: 'Top 3 - Asistencias' }, // Cambio aquí para usar solo asistencias
        { key: 'amarillas', titulo: 'Top 3 - Tarjetas Amarillas' },
        { key: 'rojas', titulo: 'Top 3 - Tarjetas Rojas' }
    ];

    // Generar rankings para cada categoría
    categorias.forEach(categoria => {
        const ranking = obtenerTop3(jugadores, categoria.key);
        if (ranking.length > 0) {
            rankingsContainer.insertAdjacentHTML('beforeend', `
                <div class="ranking-section">
                    <h2>${categoria.titulo}</h2>
                    ${ranking.map((jugador, index) => `
                        <div class="ranking-item">
                            <div class="ranking-position ${index === 0 ? 'ranking-oro' : index === 1 ? 'ranking-plata' : 'ranking-bronce'}">#${index + 1}</div>
                            <div class="ranking-info">
                                <span>${jugador.nombre} - ${jugador[categoria.key]}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `);
        }
    });
}

// Función para obtener el top 3 de jugadores según una categoría específica
function obtenerTop3(jugadores, categoria) {
    // Filtrar jugadores que tengan valores válidos para la categoría
    const jugadoresFiltrados = Object.keys(jugadores)
        .map(nombre => ({
            nombre: nombre,
            [categoria]: jugadores[nombre][categoria]
        }))
        .filter(jugador => jugador[categoria] !== undefined);

    // Ordenar los jugadores de mayor a menor según el valor de la categoría
    jugadoresFiltrados.sort((a, b) => b[categoria] - a[categoria]);

    // Retornar solo los primeros 3 jugadores
    return jugadoresFiltrados.slice(0, 3);
}


// Función para mostrar el spinner
function mostrarSpinner() {
    const spinner = document.getElementById('spinner');
    spinner.style.visibility = 'visible';
}

// Función para ocultar el spinner
function ocultarSpinner() {
    const spinner = document.getElementById('spinner');
    spinner.style.visibility = 'hidden';
}