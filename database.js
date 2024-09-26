const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('jugadores.db');

db.serialize(() => {
    // Eliminar la tabla JUGADORES si ya existe
    db.run(`DROP TABLE IF EXISTS JUGADORES`);

    // Crear la tabla JUGADORES
    db.run(`
        CREATE TABLE IF NOT EXISTS JUGADORES (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            dorsal INTEGER NOT NULL,
            posicion TEXT NOT NULL,
            foto TEXT
        )
    `);

    // Insertar algunos jugadores
    const insertStmt = db.prepare(`
        INSERT INTO JUGADORES (nombre, dorsal, posicion, foto) VALUES (?, ?, ?, ?)
    `);

    // Insertar los jugadores (puedes modificar o agregar más)
    insertStmt.run('Luis Moreno', 1, 'Defensa', 'Luis_Moreno.jpg');
    insertStmt.run('Die', 2, 'Defensa', 'Die.jpg');
    insertStmt.run('Reina', 93, 'Defensa', 'Reina.jpg');
    insertStmt.run('Richter', 7, 'Defensa', 'Richter.jpg');
    insertStmt.run('Torres', 15, 'Defensa', 'Torres.jpg');
    insertStmt.run('Arteta', 79, 'Defensa', 'Arteta.jpg');
    insertStmt.run('Juan', 3, 'Defensa', 'Juan.jpg');
    insertStmt.run('Hernan', 27, 'Defensa', 'Hernan.jpg');
    insertStmt.run('Montero', 16, 'Defensa', 'Montero.jpg');
    insertStmt.run('Roma', 5, 'Medio', 'Roma.jpg');
    insertStmt.run('Capape',99, 'Medio', 'Capape.jpg');
    insertStmt.run('Rome', 8, 'Medio', 'Rome.jpg');
    insertStmt.run('Jalons', 6, 'Medio', 'Jalons.jpg');
    insertStmt.run('Eslava', 35, 'Medio', 'Eslava.jpg');
    insertStmt.run('Chete', 21, 'Medio', 'Chete.jpg');
    insertStmt.run('Tomas', 9, 'Delantero', 'Tomas.jpg');
    insertStmt.run('Ignacio Die', 99, 'Delantero', 'Ignacio_Die.jpg');
    insertStmt.run('Siegrist', 25, 'Delantero', 'Siegrist.jpg');
    insertStmt.run('Rubira', 22, 'Delantero', 'Rubira.jpg');
    insertStmt.run('Jose Luis', 11, 'Delantero', 'Jose_Luis.jpg');
    insertStmt.run('Asier', 20, 'Delantero', 'Asier.jpg');
    insertStmt.run('Alfonso', 18, 'Delantero', 'Alfonso.jpg');
    insertStmt.run('Hugo', 99, 'Delantero', 'Hugo.jpg');
    insertStmt.run('Montis', 7, 'Medio', 'Montis.jpg');
    insertStmt.run('Berned', 14, 'Medio', 'Berned.jpg');
    insertStmt.run('Herrera', 77, 'Defensa', 'Herrera.jpg');
    insertStmt.run('Moreno', 10, 'Delantero', 'Moreno.jpg');
    // Finalizar la declaración preparada
    insertStmt.finalize();
});

// Exportar la base de datos para usarla en otros módulos
module.exports = db;
