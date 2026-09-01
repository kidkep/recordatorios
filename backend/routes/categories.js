const express = require('express');
const router = express.Router();
const db = require('../db');
const { autenticar } = require('../auth');

router.use(autenticar);

router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM categorias WHERE user_id = ? ORDER BY nombre', [req.usuario.id]);
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
    // Verificar duplicado por usuario
    const existente = await db.get('SELECT id FROM categorias WHERE nombre = ? AND user_id = ?', [nombre, req.usuario.id]);
    if (existente) {
      return res.status(409).json({ error: `Ya existe una categoría llamada "${nombre}"` });
    }
    const result = await db.run('INSERT INTO categorias (nombre, color, icono, user_id) VALUES (?, ?, ?, ?)',
      [nombre, color || '#4F46E5', icono || '📁', req.usuario.id]);
    const row = await db.get('SELECT * FROM categorias WHERE id = ?', [result.lastID]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nombre, color, icono } = req.body;
  try {
    // Verificar duplicado por usuario (si se cambia el nombre)
    if (nombre) {
      const existente = await db.get(
        'SELECT id FROM categorias WHERE nombre = ? AND user_id = ? AND id != ?',
        [nombre, req.usuario.id, req.params.id]
      );
      if (existente) {
        return res.status(409).json({ error: `Ya existe una categoría llamada "${nombre}"` });
      }
    }
    await db.run('UPDATE categorias SET nombre = ?, color = ?, icono = ? WHERE id = ? AND user_id = ?',
      [nombre, color, icono, req.params.id, req.usuario.id]);
    res.json({ message: 'Categoría actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM categorias WHERE id = ? AND user_id = ?', [req.params.id, req.usuario.id]);
    // Al eliminar una categoría, los recordatorios que la usaban quedan sin categoría
    await db.run('UPDATE recordatorios SET categoria_id = NULL WHERE categoria_id = ? AND user_id = ?', [req.params.id, req.usuario.id]);
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
