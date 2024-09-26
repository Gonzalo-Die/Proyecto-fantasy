DROP TABLE IF EXISTS JUGADORES;


-- Crear la tabla de jugadores
CREATE TABLE IF NOT EXISTS JUGADORES (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    dorsal INTEGER,
    posicion TEXT,
    foto TEXT
);

-- Insertar los datos de los jugadores
INSERT INTO JUGADORES (nombre, dorsal, posicion, foto) VALUES ('Die', 2, 'Delantero', 'Die.jpg');
INSERT INTO JUGADORES (nombre, dorsal, posicion, foto) VALUES ('Reina', 4, 'Defensa', 'Reina.jpg');
INSERT INTO JUGADORES (nombre, dorsal, posicion, foto) VALUES ('Hernan', 10, 'Medio', 'Hernan.jpg');
