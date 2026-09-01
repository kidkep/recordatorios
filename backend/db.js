const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'recordatorios.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite');
    initTables();
  }
});

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#4F46E5',
      icono TEXT DEFAULT '📁',
      fecha_creacion TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recordatorios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      categoria_id INTEGER,
      fecha INTEGER NOT NULL,
      repetir TEXT DEFAULT 'none',
      notificacion_push INTEGER DEFAULT 1,
      notificacion_email INTEGER DEFAULT 0,
      email_destino TEXT,
      creado_en INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
    )
  `);

  // Migración: agregar columna email_enviado si no existe (para evitar envíos duplicados)
  db.get(`PRAGMA table_info(recordatorios)`, (err, cols) => {
    if (err) return;
    db.all(`PRAGMA table_info(recordatorios)`, (err, cols) => {
      if (err) return;
      const tiene = cols.some(c => c.name === 'email_enviado');
      if (!tiene) {
        db.run(`ALTER TABLE recordatorios ADD COLUMN email_enviado INTEGER DEFAULT 0`, (err) => {
          if (err) console.error('Error agregando email_enviado:', err.message);
          else console.log('Columna email_enviado agregada');
        });
      }
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS suscripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      keys TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `, (err) => {
    if (!err) {
      seedCategories();
    }
  });
}

function seedCategories() {
  db.get('SELECT COUNT(*) as count FROM categorias', (err, row) => {
    if (err) return;
    if (row.count === 0) {
      const defaultCategories = [
        ['Trabajo', '#EF4444', '💼'],
        ['Clases', '#3B82F6', '📚'],
        ['Exámenes', '#F59E0B', '📝'],
        ['Personal', '#10B981', '🏠']
      ];
      const stmt = db.prepare('INSERT INTO categorias (nombre, color, icono) VALUES (?, ?, ?)');
      defaultCategories.forEach(([nombre, color, icono]) => {
        stmt.run(nombre, color, icono);
      });
      stmt.finalize();
    }
  });
}

module.exports = db;
