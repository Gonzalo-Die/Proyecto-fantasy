document.addEventListener('DOMContentLoaded', async () => {
    // Obtener el nombre del usuario de los parámetros de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const usuario = urlParams.get('usuario');

    // Mostrar el nombre del usuario en la página
    document.getElementById('nombre-usuario').textContent = usuario;

    try {
        // Llamar a la ruta para obtener los equipos confirmados del usuario
        const responseEquipos = await fetch(`/obtener-equipos-confirmados/${encodeURIComponent(usuario)}`);
        const dataEquipos = await responseEquipos.json();
        
        const equiposContainer = document.getElementById('equipos-container');
        equiposContainer.innerHTML = '';  // Limpiar antes de mostrar los datos

        // Obtener las jornadas ocurridas
        const jornadasOcurridas = await obtenerJornadasOcurridas();
        
        if (dataEquipos.equipos && dataEquipos.equipos.length > 0) {
            // Filtrar equipos que pertenecen solo a jornadas ya ocurridas y están confirmados
            const equiposFiltrados = dataEquipos.equipos.filter(equipoInfo => 
                jornadasOcurridas.includes(parseInt(equipoInfo.jornada))
            );

            if (equiposFiltrados.length > 0) {
                // Obtener los puntos de todos los jugadores
                const puntosPorJugador = await obtenerPuntos();

                for (const equipoInfo of equiposFiltrados) {
                    const { jornada, equipo } = equipoInfo;
                    
                    // Obtener las imágenes y puntos de cada jugador
                    const imagenDefensa = obtenerImagenJugador(equipo.defensa);
                    const imagenMedio = obtenerImagenJugador(equipo.medio);
                    const imagenDelantero = obtenerImagenJugador(equipo.delantero);

                    const puntosDefensa = obtenerPuntosDeJugador(puntosPorJugador, equipo.defensa, jornada);
                    const puntosMedio = obtenerPuntosDeJugador(puntosPorJugador, equipo.medio, jornada);
                    const puntosDelantero = obtenerPuntosDeJugador(puntosPorJugador, equipo.delantero, jornada);

                    // Calcular los puntos totales de la jornada
                    const puntosTotales = puntosDefensa + puntosMedio + puntosDelantero;

                    equiposContainer.insertAdjacentHTML('beforeend', `
                        <div class="equipo-item">
                            <h2>Jornada ${jornada} <span class="puntos-totales">Puntos totales: ${puntosTotales}</span></h2>
                            <div class="jugador-info">
                                <img src="${imagenDefensa}" alt="${equipo.defensa}">
                                <p>Defensa: ${equipo.defensa} - <span class="puntos">${puntosDefensa} puntos</span></p>
                            </div>
                            <div class="jugador-info">
                                <img src="${imagenMedio}" alt="${equipo.medio}">
                                <p>Medio: ${equipo.medio} - <span class="puntos">${puntosMedio} puntos</span></p>
                            </div>
                            <div class="jugador-info">
                                <img src="${imagenDelantero}" alt="${equipo.delantero}">
                                <p>Delantero: ${equipo.delantero} - <span class="puntos">${puntosDelantero} puntos</span></p>
                            </div>
                        </div>
                    `);
                }
            } else {
                equiposContainer.innerHTML = '<p>No hay equipos confirmados para este usuario en jornadas ocurridas.</p>';
            }
        } else {
            equiposContainer.innerHTML = '<p>No hay equipos confirmados para este usuario en jornadas pasadas.</p>';
        }

    } catch (error) {
        alert('Error al obtener los equipos confirmados: ' + error.message);
        console.error('Error al obtener los equipos confirmados:', error);
    }
});

// Función para obtener la imagen de un jugador
function obtenerImagenJugador(nombreJugador) {
    const nombreImagen = nombreJugador.replace(/\s+/g, '_'); // Reemplazar espacios por guiones bajos
    return `img/${nombreImagen}.jpg`;
}

// Función para obtener los puntos de un jugador en una jornada específica
function obtenerPuntosDeJugador(puntosPorJugador, nombreJugador, jornada) {
    // Verificar si el jugador y la jornada están en el conjunto de datos
    if (puntosPorJugador[nombreJugador]) {
        const index = parseInt(jornada);
        return puntosPorJugador[nombreJugador][index] || 0; // Retornar los puntos o 0 si no hay datos
    }
    return 0;
}

// Función para obtener los puntos de todos los jugadores (igual que en estadisticas.js)
async function obtenerPuntos() {
    const puntosResponse = await fetch(`/obtener-puntos?cacheBuster=${Date.now()}`, { cache: 'no-store' });
    const puntosData = await puntosResponse.json();

    const puntosPorJugador = {};
    const jornadasOcurridas = await obtenerJornadasOcurridas();

    puntosData.slice(1).forEach(jugador => {
        if (jugador[0] && jugador[0] !== 'undefined') {
            const nombreJugador = jugador[0];
            const totalPuntos = jugador[1];

            let puntosPorJornada = jornadasOcurridas.map(jornada => {
                return jugador[jornada + 1] || 0; 
            });

            puntosPorJugador[nombreJugador] = [totalPuntos, ...puntosPorJornada];
        }
    });

    return puntosPorJugador;
}

// Función para obtener las jornadas ocurridas (igual que en estadisticas.js)
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

            const diaFormateado = dia.padStart(2, '0');
            const mesFormateado = mes.padStart(2, '0');

            const fechaJornada = new Date(`${año}-${mesFormateado}-${diaFormateado}`);

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
