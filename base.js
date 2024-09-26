app.get('/jugadores', (req, res) => {
    db.all("SELECT * FROM jugadores", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        console.log(rows); // Añade esta línea para mostrar los datos en la consola
        res.json({
            data: rows
        });
    });
});
