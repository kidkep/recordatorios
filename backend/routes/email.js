const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/config', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM configuracion');
    const config = {};
    rows.forEach(r => config[r.clave] = r.valor);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config', async (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, email_remitente } = req.body;
  const entradas = {
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_pass,
    email_remitente
  };

  try {
    for (const [clave, valor] of Object.entries(entradas)) {
      if (valor !== undefined && valor !== null) {
        // Compatible con SQLite y PostgreSQL
        await db.run('DELETE FROM configuracion WHERE clave = ?', [clave]);
        await db.run('INSERT INTO configuracion (clave, valor) VALUES (?, ?)', [clave, String(valor)]);
      }
    }
    res.json({ message: 'Configuración guardada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
