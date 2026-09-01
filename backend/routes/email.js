const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/config', (req, res) => {
  db.all('SELECT * FROM configuracion', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const config = {};
    rows.forEach(r => config[r.clave] = r.valor);
    res.json(config);
  });
});

router.post('/config', (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, email_remitente } = req.body;
  const entradas = {
    smtp_host: smtp_host,
    smtp_port: smtp_port,
    smtp_user: smtp_user,
    smtp_pass: smtp_pass,
    email_remitente: email_remitente
  };

  Object.entries(entradas).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null) {
      db.run('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)', [clave, String(valor)]);
    }
  });

  res.json({ message: 'Configuración guardada' });
});

module.exports = router;
