app.get('/jugadores', (req, res) => {
    db.all("SELECT * FROM jugadores", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            data: rows
        });
    });
});
