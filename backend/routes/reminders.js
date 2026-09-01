const express = require('express');
const router = express.Router();
const db = require('../db');
const emailScheduler = require('../services/emailScheduler');

router.get('/', (req, res) => {
  db.all(`
    SELECT r.*, c.nombre as categoria_nombre, c.color as categoria_color, c.icono as categoria_icono
    FROM recordatorios r
    LEFT JOIN categorias c ON r.categoria_id = c.id
    ORDER BY r.fecha ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { titulo, descripcion, categoria_id, fecha, repetir, notificacion_push, notificacion_email, email_destino } = req.body;

  if (!titulo || !fecha) {
    return res.status(400).json({ error: 'Título y fecha son requeridos' });
  }

  db.run(`
    INSERT INTO recordatorios (titulo, descripcion, categoria_id, fecha, repetir, notificacion_push, notificacion_email, email_destino)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [titulo, descripcion, categoria_id, fecha, repetir, notificacion_push ? 1 : 0, notificacion_email ? 1 : 0, email_destino],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const id = this.lastID;
      db.get('SELECT * FROM recordatorios WHERE id = ?', [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        emailScheduler.checkAndSchedule(id);
        res.status(201).json(row);
      });
    });
});

router.put('/:id', (req, res) => {
  const { titulo, descripcion, categoria_id, fecha, repetir, notificacion_push, notificacion_email, email_destino } = req.body;

  db.run(`
    UPDATE recordatorios
    SET titulo = ?, descripcion = ?, categoria_id = ?, fecha = ?, repetir = ?, notificacion_push = ?, notificacion_email = ?, email_destino = ?
    WHERE id = ?
  `, [titulo, descripcion, categoria_id, fecha, repetir, notificacion_push ? 1 : 0, notificacion_email ? 1 : 0, email_destino, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Recordatorio no encontrado' });
      }
      db.get('SELECT * FROM recordatorios WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        emailScheduler.checkAndSchedule(req.params.id);
        res.json(row);
      });
    });
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM recordatorios WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }
    res.json({ message: 'Recordatorio eliminado' });
  });
});

router.get('/upcoming', (req, res) => {
  const now = Date.now();
  const tomorrow = now + 24 * 60 * 60 * 1000;
  db.all(`
    SELECT r.*, c.nombre as categoria_nombre, c.color as categoria_color
    FROM recordatorios r
    LEFT JOIN categorias c ON r.categoria_id = c.id
    WHERE r.fecha BETWEEN ? AND ?
    ORDER BY r.fecha ASC
  `, [now, tomorrow], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;
