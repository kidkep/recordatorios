const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM categorias ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nombre, color, icono } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es requerido' });
  }
  try {
    const result = await db.run('INSERT INTO categorias (nombre, color, icono) VALUES (?, ?, ?)',
      [nombre, color || '#4F46E5', icono || '📁']);
    const row = await db.get('SELECT * FROM categorias WHERE id = ?', [result.lastID]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, color, icono } = req.body;
  try {
    await db.run('UPDATE categorias SET nombre = ?, color = ?, icono = ? WHERE id = ?',
      [nombre, color, icono, req.params.id]);
    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM categorias WHERE id = ?', [req.params.id]);
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
