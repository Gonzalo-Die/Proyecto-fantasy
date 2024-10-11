document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const usuario = urlParams.get('usuario');

    document.getElementById('nombre-usuario').textContent = usuario;

    try {
        // Obtener las jornadas pasadas
        const responseJornadas = await fetch('/fechas_jornadas.txt');
        const dataJornadas = await responseJornadas.text();
        const lineas = dataJornadas.split('\n');
        
        const equiposContainer = document.getElementById('equipos-container');
        equiposContainer.innerHTML = '';  // Limpiar antes de mostrar los datos
        
        let equiposMostrados = 0;

        // Obtener las jornadas pasadas y cargar los equipos para el usuario
        for (let linea of lineas) {
            const [jornada, fecha] = linea.split(':');
            const [dia, mes, anio] = fecha.trim().split('/');
            const fechaJornada = new Date(`${anio}-${mes}-${dia}`);
            const fechaActual = new Date();

            // Verificar si la jornada ya ocurrió
            if (fechaJornada < fechaActual) {
                const responseEquipo = await fetch(`/obtener-equipo/${jornada}`);
                const dataEquipo = await responseEquipo.json();

                if (dataEquipo && dataEquipo.equipo) {
                    equiposMostrados++;
                    equiposContainer.insertAdjacentHTML('beforeend', `
                        <div class="equipo-item">
                            <h2>Jornada ${jornada}</h2>
                            <p>Defensa: ${dataEquipo.equipo.defensa.nombre}</p>
                            <p>Medio: ${dataEquipo.equipo.medio.nombre}</p>
                            <p>Delantero: ${dataEquipo.equipo.delantero.nombre}</p>
                        </div>
                    `);
                }
            }
        }

        if (equiposMostrados === 0) {
            equiposContainer.innerHTML = '<p>No hay equipos seleccionados para este usuario en jornadas pasadas.</p>';
        }

    } catch (error) {
        alert('Error al obtener los equipos:', error);
    }
});
