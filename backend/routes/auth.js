const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');
const { generarToken, autenticar } = require('../auth');

const CATEGORIAS_DEFECTO = [
  ['Trabajo', '#EF4444', '💼'],
  ['Clases', '#3B82F6', '📚'],
  ['Exámenes', '#F59E0B', '📝'],
  ['Personal', '#10B981', '🏠']
];

function usuarioPublico(u) {
  return { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol };
}

async function crearCategoriasDefecto(userId) {
  for (const [nombre, color, icono] of CATEGORIAS_DEFECTO) {
    // Verificar si ya tiene una con ese nombre para no duplicar
    const existente = await db.get(
      'SELECT id FROM categorias WHERE nombre = ? AND user_id = ?', [nombre, userId]
    );
    if (!existente) {
      await db.run('INSERT INTO categorias (nombre, color, icono, user_id) VALUES (?, ?, ?, ?)',
        [nombre, color, icono, userId]);
    }
  }
}

// POST /api/auth/register - Crear cuenta
router.post('/register', async (req, res) => {
  const { nombre, usuario, contrasena } = req.body;
  if (!usuario || !contrasena || !nombre) {
    return res.status(400).json({ error: 'Nombre, usuario y contraseña son requeridos' });
  }
  if (contrasena.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }
  try {
    const existe = await db.get('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
    if (existe) {
      return res.status(409).json({ error: 'Ese usuario ya existe. Elige otro.' });
    }
    const hash = bcrypt.hashSync(contrasena, 10);
    const result = await db.run(
      'INSERT INTO usuarios (nombre, usuario, contrasena, rol) VALUES (?, ?, ?, ?)',
      [nombre, usuario, hash, 'user']
    );
    await crearCategoriasDefecto(result.lastID);
    const nuevo = await db.get('SELECT * FROM usuarios WHERE id = ?', [result.lastID]);
    const token = generarToken(nuevo);
    res.status(201).json({ token, usuario: usuarioPublico(nuevo) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  if (!usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }
  try {
    const user = await db.get('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const valido = bcrypt.compareSync(contrasena, user.contrasena);
    if (!valido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const token = generarToken(user);
    res.json({ token, usuario: usuarioPublico(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/cambiar-clave - Cambiar contraseña (requiere login)
router.post('/cambiar-clave', autenticar, async (req, res) => {
  const { contrasena_actual, nueva_contrasena } = req.body;
  if (!contrasena_actual || !nueva_contrasena) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }
  if (nueva_contrasena.length < 4) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' });
  }
  try {
    const user = await db.get('SELECT * FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const valido = bcrypt.compareSync(contrasena_actual, user.contrasena);
    if (!valido) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }
    const hash = bcrypt.hashSync(nueva_contrasena, 10);
    await db.run('UPDATE usuarios SET contrasena = ? WHERE id = ?', [hash, user.id]);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me - Ver el usuario autenticado actual
router.get('/me', autenticar, async (req, res) => {
  try {
    const user = await db.get('SELECT id, nombre, usuario, rol FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ usuario: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
