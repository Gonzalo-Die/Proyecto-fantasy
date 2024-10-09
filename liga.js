// Función para mostrar el spinner de carga
function mostrarSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.classList.remove('hidden');
    }
}

// Función para ocultar el spinner de carga
function ocultarSpinner() {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

// Función para cargar el ranking de usuarios y sus puntos totales
async function cargarRanking() {
    try {
        mostrarSpinner(); // Mostrar el spinner antes de la solicitud
        
        // Hacer la solicitud al backend para obtener y actualizar el ranking
        const response = await fetch('/actualizar-ranking');
        
        // Comprobar si la solicitud fue exitosa
        if (!response.ok) {
            throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Obtener el contenedor del ranking
        const rankingContainer = document.getElementById('ranking-container');
        
        if (!rankingContainer) {
            throw new Error("Contenedor de ranking no encontrado en el DOM.");
        }
        
        rankingContainer.innerHTML = '';  // Limpiar el contenedor antes de llenarlo

        // Llenar el contenedor con los datos de los usuarios
        data.ranking.forEach((usuario, index) => {
            const rankingItem = document.createElement('div');
            rankingItem.classList.add('ranking-item');

            // Estructura del cuadro del usuario
            rankingItem.innerHTML = `
                <div class="posicion">${index + 1}</div>
                <div class="info-usuario">
                    <div class="nombre-usuario">${usuario.nombre}</div>
                    <div class="puntuacion-total">${usuario.puntuacion} puntos</div>
                </div>
            `;

            rankingContainer.appendChild(rankingItem);
        });

    } catch (error) {
        alert('Error al cargar el ranking: ' + error.message);
        console.error('Error al cargar el ranking:', error);
    } finally {
        ocultarSpinner(); // Ocultar el spinner después de completar la carga
    }
}

// Esperar a que el contenido del DOM se cargue para ejecutar la función de cargar ranking
document.addEventListener('DOMContentLoaded', () => {
    cargarRanking();  // Llamar a cargarRanking directamente cuando la página cargue
});