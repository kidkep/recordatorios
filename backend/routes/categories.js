const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.all('SELECT * FROM categorias ORDER BY nombre', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const { nombre, color, icono } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'Nombre es requerido' });
  }
  db.run('INSERT INTO categorias (nombre, color, icono) VALUES (?, ?, ?)',
    [nombre, color || '#4F46E5', icono || '📁'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM categorias WHERE id = ?', [this.lastID], (err, row) => {
        res.status(201).json(row);
      });
    });
});

router.put('/:id', (req, res) => {
  const { nombre, color, icono } = req.body;
  db.run('UPDATE categorias SET nombre = ?, color = ?, icono = ? WHERE id = ?',
    [nombre, color, icono, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Categoría actualizada' });
    });
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM categorias WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Categoría eliminada' });
  });
});

module.exports = router;
