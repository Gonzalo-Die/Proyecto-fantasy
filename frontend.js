let jugadoresDisponibles = {
    Defensa: [],
    Medio: [],
    Delantero: []
};

async function mostrarJugadores(posicion) {
    const listaJugadores = document.getElementById(`${posicion.toLowerCase()}-lista`);

    // Alternar la visibilidad de la lista de jugadores
    if (listaJugadores.style.display === 'block') {
        listaJugadores.style.display = 'none'; // Si ya está visible, ocultarla
        return; // No continuar ejecutando el resto de la función
    }

    listaJugadores.innerHTML = ''; // Limpiar la lista antes de mostrar jugadores

    try {
        // Hacer la solicitud al backend para obtener jugadores filtrados por posición
        const response = await fetch(`/jugadores/${posicion}`);
        const data = await response.json();
        const jugadores = data.jugadores;

        const jornadaSelect = document.getElementById("jornada-select");
        const jornada = jornadaSelect.value;
        
        let defensaAnterior = null;
        let medioAnterior = null;
        let delanteroAnterior = null;
        let equipoConfirmado = false;

        // Obtener el equipo de la jornada anterior
        try {
            const response1 = await fetch(`/obtener-equipo/${jornada - 1}`);
            const data1 = await response1.json();
            
            if (data1.equipo && data1.equipo.confirmado) {
                // Si el equipo de la jornada anterior está confirmado, obtener los jugadores
                defensaAnterior = data1.equipo.defensa.nombre;
                medioAnterior = data1.equipo.medio.nombre;
                delanteroAnterior = data1.equipo.delantero.nombre;
                equipoConfirmado = true; // Marcar que el equipo está confirmado
            }
        } catch (error) {
            
        }

        // Mostrar los jugadores en la lista
        for (const jugador of jugadores) {
            const valorJugador = await obtenerValorJugador(jugador.nombre);  // Usar await para obtener el valor
            const jugadorItem = document.createElement('div');
            jugadorItem.classList.add('jugador-item');
            jugadorItem.textContent = `${jugador.nombre} - Valor: ${valorJugador}M`;

            // Si el equipo anterior está confirmado y el jugador fue seleccionado, marcar en rojo
            if (equipoConfirmado && 
                (jugador.nombre === defensaAnterior || jugador.nombre === medioAnterior || jugador.nombre === delanteroAnterior)) {
                jugadorItem.style.color = 'red'; // Marcar en rojo
                jugadorItem.style.pointerEvents = 'none'; // Deshabilitar la selección
                jugadorItem.style.opacity = '0.6'; // Reducir la opacidad visualmente
            } else {
                // Al hacer clic en un jugador, seleccionarlo y mostrar sus datos
                jugadorItem.addEventListener('click', () => {
                    seleccionarJugador(posicion, jugador);
                    listaJugadores.style.display = 'none'; // Ocultar la lista de jugadores después de la selección
                });
            }

            listaJugadores.appendChild(jugadorItem);
        }

        // Mostrar la lista de jugadores
        listaJugadores.style.display = 'block';
    } catch (error) {
        console.error('Error al obtener los jugadores:', error);
    }
}



let valorTotalEquipo = 0; // Variable global para el valor total del equipo
let puntosTotales = 0;

async function seleccionarJugador(posicion, jugador) {
    const seleccionadoDiv = document.getElementById(`${posicion.toLowerCase()}-seleccionado`);

    const puntos = await obtenerPuntosPorJornada(jugador.nombre);

    // Verificar si la jornada ya ha ocurrido
    const jornadaOcurrida = await verificarJornadaOcurrida(); // Llama a la función que verifica si la jornada ya pasó
    

    if(jornadaOcurrida){
        seleccionadoDiv.innerHTML = `
        <div class="jugador-seleccionado">
            <img src="Img/${jugador.foto}" alt="${jugador.nombre}" loading="lazy" width="100" height="100">
            <p class="nombre-jugador">${jugador.nombre}</p>
            <p>Dorsal: ${jugador.dorsal}</p>
            <div class="puntos-jugador">Puntos: ${puntos !== null ? puntos : 'N/A'}</div>
        </div>
        `;

        const puntosElemento = seleccionadoDiv.querySelector(".puntos-jugador");
        puntosElemento.classList.remove('puntos-positivo', 'puntos-negativo', 'puntos-neutro');

        if (puntos > 0) {
            puntosElemento.classList.add('puntos-positivo');
        } else if (puntos < 0) {
            puntosElemento.classList.add('puntos-negativo');
        } else {
            puntosElemento.classList.add('puntos-neutro');
        }
    }
    else{
        // Obtener el valor del jugador si la jornada aún no ha ocurrido
        const valorJugador = await obtenerValorJugador(jugador.nombre);      
        seleccionadoDiv.innerHTML = `
            <div class="jugador-seleccionado">
                <img src="Img/${jugador.foto}" alt="${jugador.nombre}" loading="lazy" width="100" height="100">
                <p class="nombre-jugador">${jugador.nombre}</p>
                <p>Dorsal: ${jugador.dorsal}</p>
                <div class="Valor-jugador">Valor: ${valorJugador}M</div>
            </div>
        `;

    }
    

    // Guardar el equipo automáticamente después de seleccionar el jugador
    guardarEquipoSeleccionado();
}


// Función para actualizar el valor total del equipo
// Función para actualizar el valor total del equipo desde el archivo de usuarios
async function actualizarValorTotalDesdeArchivo(jornada) {
    try {
        const response = await fetch(`/obtener-equipo/${jornada}`);
        const data = await response.json();
        
        if (data.equipo) {
            const { defensa, medio, delantero } = data.equipo;

            // Inicializar el valor total
            let valorTotalEquipo = 0;

            // Obtener los valores de los jugadores y sumarlos
            if (defensa) {
                const valorDefensa = await obtenerValorJugador(defensa.nombre);
                valorTotalEquipo += parseFloat(valorDefensa);
            }
            if (medio) {
                const valorMedio = await obtenerValorJugador(medio.nombre);
                valorTotalEquipo += parseFloat(valorMedio);
            }
            if (delantero) {
                const valorDelantero = await obtenerValorJugador(delantero.nombre);
                valorTotalEquipo += parseFloat(valorDelantero);
            }

            
            // Actualizar el valor total en la interfaz
            actualizarTextoValorTotal(valorTotalEquipo);
        }
    } catch (error) {
        console.error('Error al actualizar el valor total desde el archivo:', error);
    }
}


// Función para actualizar el texto del valor total y habilitar/deshabilitar el botón de confirmación
function actualizarTextoValorTotal(valorTotalEquipo) {
    const totalEquipoDiv = document.getElementById('total-equipo');
    totalEquipoDiv.textContent = `Valor Total: ${valorTotalEquipo}M`;

    if (valorTotalEquipo > 50) {
        totalEquipoDiv.style.color = 'red';
        deshabilitarBotonConfirmacion("Botón no disponible");
    } else {
        totalEquipoDiv.style.color = 'green';

        
    }
}

// Función para obtener el valor de un jugador por su nombre
async function obtenerValorJugador(nombreJugador) {
    try {
        const jornadaSelect = document.getElementById("jornada-select");  // Obtenemos el select de jornada
        const jornada = jornadaSelect.value;  // Obtenemos la jornada seleccionada

        const response = await fetch(`/obtener-valor-jugador/${nombreJugador}?jornada=${jornada}`);
        const data = await response.json();
        return data.valor ;  // Devolver el valor o 'N/A' si no está disponible
    } catch (error) {
        console.error('Error al obtener el valor del jugador:', error);
        return 'N/A';  // En caso de error, devolver 'N/A'
    }
}


// Función para actualizar los puntos totales del equipo desde el archivo de usuarios
async function actualizarPuntosTotalesDesdeArchivo(jornada) {
    try {
        const response = await fetch(`/obtener-equipo/${jornada}`);
        const data = await response.json();
        
        if (data.equipo) {
            const { defensa, medio, delantero } = data.equipo;
            
            // Inicializar los puntos totales del equipo
            let puntosTotalesEquipo = 0;

            // Obtener los puntos de los jugadores y sumarlos
            if (defensa) {
                const puntosDefensa = await obtenerPuntosJugador(defensa.nombre, jornada);
                puntosTotalesEquipo += parseFloat(puntosDefensa);
            }
            if (medio) {
                const puntosMedio = await obtenerPuntosJugador(medio.nombre, jornada);
                puntosTotalesEquipo += parseFloat(puntosMedio);
            }
            if (delantero) {
                const puntosDelantero = await obtenerPuntosJugador(delantero.nombre, jornada);
                puntosTotalesEquipo += parseFloat(puntosDelantero);
            }

            // Actualizar los puntos totales en la interfaz
            actualizarTextoPuntosTotales(puntosTotalesEquipo);
        }
    } catch (error) {
        console.error('Error al actualizar los puntos totales desde el archivo:', error);
    }
}

// Función para actualizar el texto de los puntos totales
function actualizarTextoPuntosTotales(puntosTotalesEquipo) {
    const totalEquipoDiv = document.getElementById('total-equipo');
    totalEquipoDiv.textContent = `Puntos Totales: ${puntosTotalesEquipo}`;

    // Puedes añadir lógica adicional si necesitas realizar alguna verificación adicional sobre los puntos
}

// Función para actualizar el valor o los puntos totales del equipo, dependiendo de si la jornada ya ocurrió
async function actualizarTotalEquipo(jornada) {
    try {
        // Verificar si la jornada ya ha ocurrido
        const jornadaOcurrida = await verificarJornadaOcurrida();

        if (jornadaOcurrida) {
            // Si la jornada ya ha ocurrido, actualizar los puntos totales del equipo
            await actualizarPuntosTotalesDesdeArchivo(jornada);
        } else {
            // Si la jornada no ha ocurrido, actualizar el valor total del equipo
            await actualizarValorTotalDesdeArchivo(jornada);
        }
    } catch (error) {
        alert('Error al actualizar el total del equipo:');
    }
}





// Función para guardar automáticamente el equipo después de cada selección
async function guardarEquipoSeleccionado() {
    const jornadaSelect = document.getElementById("jornada-select");
    const jornada = jornadaSelect.value;

    // Obtener los jugadores seleccionados
    const defensa = document.querySelector("#defensa-seleccionado .nombre-jugador");
    const medio = document.querySelector("#medio-seleccionado .nombre-jugador");
    const delantero = document.querySelector("#delantero-seleccionado .nombre-jugador");

    const defensaNombre = defensa ? defensa.textContent : null;
    const medioNombre = medio ? medio.textContent : null;
    const delanteroNombre = delantero ? delantero.textContent : null;

    // Llamar a la función que guarda el equipo en el backend
    guardarEquipo(jornada, defensaNombre, medioNombre, delanteroNombre);
    await actualizarTotalEquipo(jornada);
}

// Función para hacer el `fetch` y enviar la selección del equipo al backend
function guardarEquipo(jornada, defensa, medio, delantero) {
    fetch('/guardar-equipo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jornada: jornada,
            defensa: defensa,
            medio: medio,
            delantero: delantero
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Equipo guardado correctamente');
        } else {
            console.error('Error al guardar el equipo');
        }
    })
    .catch(error => {
        console.error('Error en la solicitud para guardar el equipo:', error);
    });
}


// Ejecutar la función cargarEquipo cada vez que se selecciona una nueva jornada
document.getElementById('jornada-select').addEventListener('change', function() {
    const jornadaSeleccionada = this.value;
    if (jornadaSeleccionada) {
        cargarEquipo(jornadaSeleccionada);  // Llama a cargarEquipo con la jornada seleccionada
    } else {
        limpiarSeleccion();  // Limpiar si no hay jornada seleccionada
    }
});

// Función para deshabilitar los botones de selección de jugadores
function deshabilitarBotonesSeleccion() {
    const botones = document.querySelectorAll('button.seleccion-boton');
    botones.forEach(boton => {
        boton.disabled = true; // Deshabilita el botón
        boton.classList.add('boton-deshabilitado'); // Añadir clase para estilo visual si lo necesitas
    });


}

// Función para habilitar los botones de selección de jugadores
function habilitarBotonesSeleccion() {
    const botones = document.querySelectorAll('button.seleccion-boton');
    botones.forEach(boton => {
        boton.disabled = false; // Habilita el botón
        boton.classList.remove('boton-deshabilitado'); // Remover la clase de deshabilitado
    });


}


// Función para cargar el equipo desde el archivo de texto y seleccionar los jugadores automáticamente
async function cargarEquipo(jornada) {
    let defensaAnterior = null;
    let medioAnterior = null;
    let delanteroAnterior = null;
    let equipoConfirmado = false;

    // Obtener el equipo de la jornada anterior
    try {
        const responseAnterior = await fetch(`/obtener-equipo/${jornada - 1}`);
        const dataAnterior = await responseAnterior.json();

        if (dataAnterior.equipo && dataAnterior.equipo.confirmado) {
            // Si el equipo anterior está confirmado, guardar los nombres de los jugadores
            defensaAnterior = dataAnterior.equipo.defensa.nombre;
            medioAnterior = dataAnterior.equipo.medio.nombre;
            delanteroAnterior = dataAnterior.equipo.delantero.nombre;
            equipoConfirmado = true; // Marcar que el equipo de la jornada anterior está confirmado
            
        }
    } catch (error) {
        
    }

    // Obtener el equipo de la jornada actual
    try {
        const responseActual = await fetch(`/obtener-equipo/${jornada}`);
        const dataActual = await responseActual.json();

        if (dataActual.equipo) {
            const { defensa, medio, delantero } = dataActual.equipo;
            const confirmado = dataActual.equipo.confirmado; // Accedemos al campo confirmado
            
            // Verificar si los jugadores actuales son los mismos que en la jornada anterior
            if (defensa && (!equipoConfirmado || defensa.nombre !== defensaAnterior)) {
                seleccionarJugador('defensa', {
                    nombre: defensa.nombre,
                    foto: defensa.foto || 'default.jpg',
                    dorsal: defensa.dorsal || 'N/A'
                });
            }else {
                // Si el jugador es el mismo de la jornada anterior, limpiarlo
                limpiarSeleccionPosicion('defensa');
            }
            if (medio && (!equipoConfirmado || medio.nombre !== medioAnterior)) {
                seleccionarJugador('medio', {
                    nombre: medio.nombre,
                    foto: medio.foto || 'default.jpg',
                    dorsal: medio.dorsal || 'N/A'
                });
            }else {
                // Si el jugador es el mismo de la jornada anterior, limpiarlo
                limpiarSeleccionPosicion('medio');
            }
            if (delantero && (!equipoConfirmado || delantero.nombre !== delanteroAnterior)) {
                seleccionarJugador('delantero', {
                    nombre: delantero.nombre,
                    foto: delantero.foto || 'default.jpg',
                    dorsal: delantero.dorsal || 'N/A'
                });
            }else {
                // Si el jugador es el mismo de la jornada anterior, limpiarlo
                limpiarSeleccionPosicion('delantero');
            }

            // Verificar si el equipo está confirmado y deshabilitar los botones de selección
            if (confirmado) {
                deshabilitarBotonesSeleccion(); // Deshabilitar botones si el equipo está confirmado
                deshabilitarBotonConfirmacion("Equipo confirmado");  // Deshabilitar también el botón de confirmación
            } else {
                // Verificar el rango de fechas para habilitar o deshabilitar el botón de confirmación
                habilitarBotonesSeleccion();
                verificarRangoConfirmacion(jornada);
            }
        } else {
            limpiarSeleccion(); // Limpiar si no hay equipo guardado
            habilitarBotonesSeleccion(); // Asegurarse de que los botones estén habilitados si no hay equipo guardado
            verificarRangoConfirmacion(jornada); // Verificar fechas en caso de que no haya equipo guardado
        }

        await actualizarTotalEquipo(jornada);
        
    } catch (error) {
        limpiarSeleccion(); // Limpiar si no hay equipo guardado
        habilitarBotonesSeleccion(); // Asegurarse de que los botones estén habilitados si no hay equipo guardado
        verificarRangoConfirmacion(jornada); // Verificar fechas en caso de que no haya equipo guardado
        console.error('Error al obtener el equipo de la jornada actual:', error);
    }
}


// Función para limpiar la selección de una posición específica
function limpiarSeleccionPosicion(posicion) {
    const seleccionadoDiv = document.getElementById(`${posicion}-seleccionado`);
    seleccionadoDiv.innerHTML = `<div class="jugador-seleccionado"><p>Selecciona un ${posicion}</p></div>`;
}



// Función para limpiar la selección de jugadores
function limpiarSeleccion() {
    // Limpiar la selección de defensa
    const defensaSeleccionado = document.getElementById('defensa-seleccionado');
    defensaSeleccionado.innerHTML = `
        <div class="jugador-seleccionado">
            <p>Selecciona un defensa</p>
        </div>
    `;

    // Limpiar la selección de medio
    const medioSeleccionado = document.getElementById('medio-seleccionado');
    medioSeleccionado.innerHTML = `
        <div class="jugador-seleccionado">
            <p>Selecciona un medio</p>
        </div>
    `;

    // Limpiar la selección de delantero
    const delanteroSeleccionado = document.getElementById('delantero-seleccionado');
    delanteroSeleccionado.innerHTML = `
        <div class="jugador-seleccionado">
            <p>Selecciona un delantero</p>
        </div>
    `;
}




// Función para mostrar los datos del Excel
function mostrarDatosExcel() {
    console.log("Leyendo los datos del Excel...");  // Verificar si se llama a la función

    fetch('/datos_excel')
        .then(response => {
            console.log("Respuesta recibida del servidor:", response);
            return response.json();
        })
        .then(data => {
            console.log("Datos del Excel recibidos:", data);

            const datosExcel = data.data;

            // Mostrar los datos del Excel en un div específico
            const excelDiv = document.getElementById('datos-excel');
            if (!excelDiv) {
                console.error('No se encontró el contenedor #datos-excel');
                return;
            }

            excelDiv.innerHTML = '';  // Limpiar antes de mostrar nuevos datos

            datosExcel.forEach(jugador => {
                const jugadorInfo = document.createElement('div');
                jugadorInfo.textContent = `
                    Nombre: ${jugador.Jugador}, 
                    Puntos: ${jugador.Puntos || 0}
                `;
                excelDiv.appendChild(jugadorInfo);
            });

        })
        .catch(error => {
            console.error('Error al obtener los datos del Excel:', error);
        });
}

// Función para obtener los puntos de un jugador por su nombre
// Función para obtener los puntos de un jugador en una jornada específica
async function obtenerPuntosJugador(nombreJugador, jornada) {
    try {
        // Hacer la solicitud al backend para obtener los puntos de la jornada desde el Excel
        const response = await fetch('/puntos_jornada');
        const data = await response.json();
        const datosExcel = data.data;

        

        // Limpiar el nombre del jugador (eliminar espacios extra)
        const nombreJugadorLimpio = nombreJugador.trim();

        // Buscar al jugador por su nombre
        const jugador = datosExcel.find(jugador => jugador.Jugador.trim() === nombreJugadorLimpio);

        // Si encontramos el jugador, devolvemos sus puntos en la jornada seleccionada
        if (jugador) {
            // Extraer los puntos de la columna que corresponde a la jornada (C, D, E, ... = 1, 2, 3, ...)
            const puntosJornada = jugador[jornada] || 0;
            return puntosJornada;
        } else {
            console.log(`Jugador ${nombreJugadorLimpio} no encontrado`);
            return 0;  // Jugador no encontrado o no tiene puntos en esa jornada
        }
    } catch (error) {
        console.error('Error al obtener los datos del Excel:', error);
        return 0;  // Retornar 0 en caso de error
    }
}






// Función para obtener los puntos de un jugador en una jornada seleccionada
async function obtenerPuntosPorJornada(nombreJugador) {
    const jornadaSelect = document.getElementById("jornada-select");
    const jornada = jornadaSelect.value;

    // Verificar si la jornada está seleccionada
    if (jornada === "") {
        alert("Por favor selecciona una jornada");
        return null;
    }

    try {
        const response = await fetch('/puntos_jornada');
        const data = await response.json();
        const puntosJornada = data.data;

        // Buscar el jugador por su nombre
        const jugador = puntosJornada.find(jugador => jugador.Jugador === nombreJugador);

        // Si encontramos el jugador, devolvemos los puntos de la jornada seleccionada
        if (jugador) {
            const puntos = jugador[jornada] || 0;  // Si no tiene puntos, devolver 0
            return puntos;
        } else {
            console.log(`Jugador ${nombreJugador} no encontrado`);
            return null;  // Jugador no encontrado
        }
    } catch (error) {
        console.error('Error al obtener los puntos de la jornada:', error);
        return null;
    }
}


// Función para actualizar los puntos de los jugadores seleccionados cuando se cambia la jornada
async function actualizarPuntosJugadoresSeleccionados() {
    const posiciones = ['defensa', 'medio', 'delantero'];
    
    for (let posicion of posiciones) {
        const seleccionadoDiv = document.getElementById(`${posicion}-seleccionado`);

        if (seleccionadoDiv && seleccionadoDiv.querySelector(".nombre-jugador")) {
            const nombreJugador = seleccionadoDiv.querySelector(".nombre-jugador").textContent;
            const puntos = await obtenerPuntosPorJornada(nombreJugador);

            const puntosElemento = seleccionadoDiv.querySelector(".puntos-jugador");
            if (puntosElemento) {
                puntosElemento.textContent = `Puntos: ${puntos !== null ? puntos : 'N/A'}`;

                puntosElemento.classList.remove('puntos-positivo', 'puntos-negativo', 'puntos-neutro');

                if (puntos > 0) {
                    puntosElemento.classList.add('puntos-positivo');
                } else if (puntos < 0) {
                    puntosElemento.classList.add('puntos-negativo');
                } else {
                    puntosElemento.classList.add('puntos-neutro');
                }
            }
        }
    }
}


// Función para confirmar el equipo de la jornada seleccionada
function confirmarEquipo() {
    const jornadaSeleccionada = document.getElementById('jornada-select').value;

    // Hacer una solicitud POST para confirmar el equipo
    fetch('/confirmar-equipo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jornada: jornadaSeleccionada })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Equipo confirmado para la jornada ' + jornadaSeleccionada);
        } else {
            alert('Error al confirmar el equipo: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error al confirmar el equipo:', error);
    });
}

// Función para confirmar el equipo actual y marcarlo como confirmado en el archivo del usuario
document.getElementById('confirmar-equipo-btn').addEventListener('click', function() {
    const jornadaSeleccionada = document.getElementById('jornada-select').value;
    
    if (jornadaSeleccionada) {
        fetch('/confirmar-equipo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ jornada: jornadaSeleccionada })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Equipo confirmado para la jornada ' + jornadaSeleccionada);
                
                // Aquí llamamos a cargarEquipo nuevamente para actualizar la UI
                cargarEquipo(jornadaSeleccionada);
            } else {
                alert('Error al confirmar el equipo');
            }
        })
        .catch(error => {
            console.error('Error al confirmar equipo:', error);
        });
    } else {
        alert('Selecciona una jornada antes de confirmar el equipo.');
    }
});




// Función para obtener la fecha de la jornada y determinar si el botón debe estar habilitado o deshabilitado
function verificarRangoConfirmacion(jornada) {
    fetch(`/obtener-fecha-jornada/${jornada}`)
        .then(response => response.json())
        .then(data => {
            if (data.fecha) {
                const fechaJornada = data.fecha;
                const fechaJornadaObj = convertirFecha(fechaJornada);

                // Calcular fechas de habilitación y deshabilitación
                const fechaInicio = new Date(fechaJornadaObj);
                fechaInicio.setDate(fechaInicio.getDate() - 6); // 7 días antes
                const fechaFin = new Date(fechaJornadaObj);
                fechaFin.setDate(fechaFin.getDate() - 1); // 2 días antes

                const fechaActual = new Date();
                if (fechaActual >= fechaInicio && fechaActual <= fechaFin) {
                    // Dentro del rango de fechas, habilitamos los botones
                    habilitarBotonConfirmacion();
                }else if (fechaActual > fechaFin){
                    // Fuera del rango, deshabilitamos los botones
                    deshabilitarBotonConfirmacion("Jornada ya ocurrida");
                    deshabilitarBotonesSeleccion();                    
                } else {
                    // Fuera del rango, deshabilitamos los botones
                    deshabilitarBotonConfirmacion("No se puede confirmar equipo hasta  " + fechaInicio.toLocaleDateString());
                    
                }
            }
        })
        .catch(error => {
            console.error('Error al obtener la fecha de la jornada:', error);
        });
}


// Función para convertir la fecha de "dd/mm/yyyy" a un objeto Date
function convertirFecha(fechaStr) {
    const [dia, mes, año] = fechaStr.split('/');
    return new Date(`${año}-${mes}-${dia}`);
}

// Función para habilitar el botón
function habilitarBotonConfirmacion() {
    // Restablecer el botón de confirmar equipo
    const confirmarBtn = document.getElementById('confirmar-equipo-btn');
    confirmarBtn.textContent = 'Confirmar equipo';
    confirmarBtn.disabled = false;
    confirmarBtn.style.backgroundColor = '#007bff';  // Color original
    confirmarBtn.style.cursor = 'pointer';
}

// Función para deshabilitar el botón
function deshabilitarBotonConfirmacion(mensaje) {
    // Cambiar el texto y deshabilitar el botón de confirmar equipo
    const confirmarBtn = document.getElementById('confirmar-equipo-btn');
    confirmarBtn.textContent = mensaje;
    confirmarBtn.disabled = true;
    confirmarBtn.style.backgroundColor = '#d3d3d3';  // Botón más claro
    confirmarBtn.style.cursor = 'not-allowed'; // Cambiar cursor para mostrar que no se puede clicar
}




// Función para mostrar jugadores con precios fijos
function mostrarJugadoresConPrecios(posicion) {
    const listaJugadores = document.getElementById(`${posicion.toLowerCase()}-lista`);
    listaJugadores.innerHTML = ''; // Limpiar la lista antes de mostrar jugadores

    // Hacer la solicitud al backend para obtener jugadores con precios
    fetch(`/jugadores-con-precios`)
        .then(response => response.json())
        .then(data => {
            const jugadores = data.jugadores.filter(j => j.Posicion === posicion);

            // Mostrar los jugadores en la lista con sus precios
            jugadores.forEach(jugador => {
                const jugadorItem = document.createElement('div');
                jugadorItem.classList.add('jugador-item');
                jugadorItem.textContent = `${jugador.Nombre} - Precio: ${jugador.Precio}M`;

                // Al hacer clic en un jugador, seleccionarlo y mostrar sus datos
                jugadorItem.addEventListener('click', () => {
                    seleccionarJugador(posicion, jugador);
                    listaJugadores.style.display = 'none'; // Ocultar la lista de jugadores después de la selección
                });

                listaJugadores.appendChild(jugadorItem);
            });

            // Mostrar la lista de jugadores
            listaJugadores.style.display = 'block';
        })
        .catch(error => {
            console.error('Error al obtener los jugadores:', error);
        });
}



// Función para convertir una fecha string a objeto Date
function convertirFecha(fechaStr) {
    const [day, month, year] = fechaStr.split('/');
    return new Date(`${year}-${month}-${day}`);  // Convierte el string "dd/mm/yyyy" a Date
}

// Función para verificar si la fecha de la jornada ya ha ocurrido
function verificarJornadaOcurrida() {
    // Obtener el valor de la jornada seleccionada del dropdown
    const jornadaSelect = document.getElementById('jornada-select');
    const jornada = jornadaSelect.value;  // El valor de la jornada seleccionada

    return fetch(`/obtener-fecha-jornada/${jornada}`)
        .then(response => response.json())
        .then(data => {
            const fechaJornada = convertirFecha(data.fecha);  // Convierte la fecha de string a Date
            const fechaActual = new Date();  // Obtiene la fecha actual

            return fechaActual >= fechaJornada;  // Devuelve true si la jornada ya ha ocurrido, false si no
        })
        .catch(error => {
            console.error('Error al obtener la fecha de la jornada:', error);
            return false;  // En caso de error, devolver false
        });
}


// Función para actualizar los valores de los jugadores desde el servidor
async function actualizarValoresJugadores() {
    try {
        const response = await fetch('/actualizar-valores');
        const data = await response.json();
        if (data.success) {
            console.log('Valores de jugadores actualizados correctamente.');
        } else {
            console.error('Error al actualizar los valores de los jugadores.');
        }
    } catch (error) {
        console.error('Error en la solicitud para actualizar los valores:', error);
    }
}


// Ejecutar la actualización de valores de los jugadores al cargar la página
window.onload = function() {
    actualizarValoresJugadores();
};

