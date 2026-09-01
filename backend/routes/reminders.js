const express = require('express');
const router = express.Router();
const db = require('../db');
const emailScheduler = require('../services/emailScheduler');
const { autenticar } = require('../auth');

router.use(autenticar);

// Obtener recordatorios del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT r.*, c.nombre as categoria_nombre, c.color as categoria_color, c.icono as categoria_icono
      FROM recordatorios r
      LEFT JOIN categorias c ON r.categoria_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.fecha ASC
    `, [req.usuario.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { titulo, descripcion, categoria_id, fecha, repetir, notificacion_push, notificacion_email, email_destino } = req.body;

  if (!titulo || !fecha) {
    return res.status(400).json({ error: 'Título y fecha son requeridos' });
  }

  try {
    const result = await db.run(`
      INSERT INTO recordatorios (titulo, descripcion, categoria_id, fecha, repetir, notificacion_push, notificacion_email, email_destino, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [titulo, descripcion, categoria_id, fecha, repetir, notificacion_push ? 1 : 0, notificacion_email ? 1 : 0, email_destino, req.usuario.id]);

    const id = result.lastID;
    const row = await db.get('SELECT * FROM recordatorios WHERE id = ? AND user_id = ?', [id, req.usuario.id]);
    emailScheduler.checkAndSchedule(id);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { titulo, descripcion, categoria_id, fecha, repetir, notificacion_push, notificacion_email, email_destino } = req.body;

  try {
    const result = await db.run(`
      UPDATE recordatorios
      SET titulo = ?, descripcion = ?, categoria_id = ?, fecha = ?, repetir = ?, notificacion_push = ?, notificacion_email = ?, email_destino = ?
      WHERE id = ? AND user_id = ?
    `, [titulo, descripcion, categoria_id, fecha, repetir, notificacion_push ? 1 : 0, notificacion_email ? 1 : 0, email_destino, req.params.id, req.usuario.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }
    const row = await db.get('SELECT * FROM recordatorios WHERE id = ? AND user_id = ?', [req.params.id, req.usuario.id]);
    emailScheduler.checkAndSchedule(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM recordatorios WHERE id = ? AND user_id = ?', [req.params.id, req.usuario.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }
    res.json({ message: 'Recordatorio eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  const now = Date.now();
  const tomorrow = now + 24 * 60 * 60 * 1000;
  try {
    const rows = await db.all(`
      SELECT r.*, c.nombre as categoria_nombre, c.color as categoria_color
      FROM recordatorios r
      LEFT JOIN categorias c ON r.categoria_id = c.id
      WHERE r.user_id = ? AND r.fecha BETWEEN ? AND ?
      ORDER BY r.fecha ASC
    `, [req.usuario.id, now, tomorrow]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
