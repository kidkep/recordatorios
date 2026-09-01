const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave-secreta-recordatorios-cambiar';

function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, usuario: usuario.usuario, rol: usuario.rol, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión.' });
  }

  try {
    const payload = verificarToken(token);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });
  }
}

module.exports = { generarToken, verificarToken, autenticar, JWT_SECRET };
