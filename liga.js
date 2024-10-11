const spinner = document.getElementById('spinner');
const rankingContainer = document.getElementById('ranking-container');

function toggleSpinner(show) {
    if (spinner) {
        spinner.classList.toggle('hidden', !show);
    }
}

async function cargarRanking() {
    try {
        toggleSpinner(true); 

        const response = await fetch('/actualizar-ranking');
        
        if (!response.ok) {
            throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!rankingContainer) {
            throw new Error("Contenedor de ranking no encontrado en el DOM.");
        }
        
        rankingContainer.innerHTML = ''; 

        data.ranking.forEach((usuario, index) => {
            rankingContainer.insertAdjacentHTML('beforeend', `
                <div class="ranking-item" onclick="location.href='equipos.html?usuario=${encodeURIComponent(usuario.nombre)}'">
                    <div class="posicion">${index + 1}</div>
                    <div class="info-usuario">
                        <div class="nombre-usuario">${usuario.nombre}</div>
                        <div class="puntuacion-total">${usuario.puntuacion} puntos</div>
                    </div>
                </div>
            `);
        });

    } catch (error) {
        alert('Error al cargar el ranking: ' + error.message);
        console.error('Error al cargar el ranking:', error);
    } finally {
        toggleSpinner(false); 
    }
}

document.addEventListener('DOMContentLoaded', cargarRanking);
