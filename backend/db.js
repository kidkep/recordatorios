const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

let adapter;

if (DATABASE_URL) {
  adapter = initPostgres(Pool, DATABASE_URL);
} else {
  adapter = initSqlite(sqlite3, path);
}

adapter.initSchema = async function () {
  if (adapter._type === 'postgres') {
    await initSchemaPostgres(adapter);
  } else {
    await initSchemaSqlite(adapter);
  }
};

module.exports = adapter;

// ---------------- Esquema SQLite ----------------
async function initSchemaSqlite(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#4F46E5',
      icono TEXT DEFAULT '📁',
      fecha_creacion TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.run(`
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
      email_enviado INTEGER DEFAULT 0,
      creado_en INTEGER DEFAULT (strftime('%s','now') * 1000),
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS suscripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      keys TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migración: agregar email_enviado si no existe (versiones viejas)
  const cols = await db.all(`PRAGMA table_info(recordatorios)`, []);
  if (!cols.some(c => c.name === 'email_enviado')) {
    try {
      await db.run(`ALTER TABLE recordatorios ADD COLUMN email_enviado INTEGER DEFAULT 0`, []);
    } catch (e) { /* ya existe */ }
  }

  await seedPostgresOrSqlite(db, 'sqlite');
}

// ---------------- Esquema PostgreSQL ----------------
async function initSchemaPostgres(db) {
  await db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#4F46E5',
      icono TEXT DEFAULT '📁',
      fecha_creacion TEXT DEFAULT (to_char(now(),'YYYY-MM-DD HH24:MI:SS'))
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS recordatorios (
      id SERIAL PRIMARY KEY,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      categoria_id INTEGER,
      fecha BIGINT NOT NULL,
      repetir TEXT DEFAULT 'none',
      notificacion_push INTEGER DEFAULT 1,
      notificacion_email INTEGER DEFAULT 0,
      email_destino TEXT,
      email_enviado INTEGER DEFAULT 0,
      creado_en BIGINT DEFAULT (EXTRACT(EPOCH FROM now()) * 1000),
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS suscripciones (
      id SERIAL PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      keys TEXT NOT NULL,
      created_at TEXT DEFAULT to_char(now(),'YYYY-MM-DD HH24:MI:SS')
    )
  `);

  // Migración: agregar email_enviado si no existe (bases viejas)
  try {
    await db.run(`ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS email_enviado INTEGER DEFAULT 0`, []);
  } catch (e) { /* noop */ }

  await seedPostgresOrSqlite(db, 'postgres');
}

async function seedPostgresOrSqlite(db, type) {
  const rows = await db.all('SELECT COUNT(*) as count FROM categorias', []);
  const count = rows && rows.length ? Number(rows[0].count) : 0;
  if (count === 0) {
    const defaultCategories = [
      ['Trabajo', '#EF4444', '💼'],
      ['Clases', '#3B82F6', '📚'],
      ['Exámenes', '#F59E0B', '📝'],
      ['Personal', '#10B981', '🏠']
    ];
    for (const [nombre, color, icono] of defaultCategories) {
      await db.run('INSERT INTO categorias (nombre, color, icono) VALUES (?, ?, ?)', [nombre, color, icono]);
    }
    console.log('Categorías por defecto creadas');
  }
}

// ---------------- Adaptador PostgreSQL ----------------
function initPostgres(Pool, url) {
  const { types } = require('pg');

  // Convertir BIGINT (int8, OID 20) a número, para que fecha/creado_en sean números
  types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  pool.on('error', (err) => {
    console.error('Error de pool PostgreSQL:', err.message);
  });

  function convertParams(sql, params) {
    let index = 0;
    const converted = sql.replace(/\?/g, () => {
      index += 1;
      return `$${index}`;
    });
    return { sql: converted, params };
  }

  async function run(sql, params = []) {
    params = Array.isArray(params) ? params : [];
    let c = convertParams(sql, params);
    const trimmed = c.sql.trim().toUpperCase();

    // Para INSERT en PostgreSQL, pedir que devuelva el id para poder leer lastID
    if (trimmed.startsWith('INSERT') && !/RETURNING/i.test(c.sql)) {
      c.sql = c.sql + ' RETURNING id';
    }

    const client = await pool.connect();
    try {
      const res = await client.query(c.sql, c.params);
      let lastID;
      if (res.rows && res.rows.length) {
        lastID = res.rows[0].id;
      }
      return { lastID, changes: res.rowCount };
    } finally {
      client.release();
    }
  }

  async function all(sql, params = []) {
    params = Array.isArray(params) ? params : [];
    const c = convertParams(sql, params);
    const client = await pool.connect();
    try {
      const res = await client.query(c.sql, c.params);
      return res.rows;
    } finally {
      client.release();
    }
  }

  async function get(sql, params = []) {
    params = Array.isArray(params) ? params : [];
    const c = convertParams(sql, params);
    const client = await pool.connect();
    try {
      const res = await client.query(c.sql, c.params);
      return res.rows[0] || undefined;
    } finally {
      client.release();
    }
  }

  return { run, all, get, _type: 'postgres', pool };
}

// ---------------- Adaptador SQLite ----------------
function initSqlite(sqlite3, path) {
  const dbPath = path.join(__dirname, 'recordatorios.db');
  const db = new sqlite3.Database(dbPath);

  return {
    run(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    },
    all(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    },
    get(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
    },
    _type: 'sqlite',
    close() { db.close(); }
  };
}
