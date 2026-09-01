const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const db = require('./backend/db');
const reminderRoutes = require('./backend/routes/reminders');
const categoryRoutes = require('./backend/routes/categories');
const emailRoutes = require('./backend/routes/email');
const pushRoutes = require('./backend/routes/push');
const authRoutes = require('./backend/routes/auth');
const emailScheduler = require('./backend/services/emailScheduler');
const pushService = require('./backend/services/pushService');

app.use('/api/auth', authRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/push', pushRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/diagnostico', async (req, res) => {
  const net = require('net');
  const dns = require('dns');

  const configVars = {
    SMTP_HOST: process.env.SMTP_HOST || '(no definido)',
    SMTP_PORT: process.env.SMTP_PORT || '(no definido)',
    SMTP_USER: process.env.SMTP_USER || '(no definido)',
    SMTP_PASS: process.env.SMTP_PASS ? '(definido, oculto)' : '(no definido)',
    EMAIL_REMITENTE: process.env.EMAIL_REMITENTE || '(no definido)',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? '(definido, oculto)' : '(no definido)',
    DATABASE_URL: process.env.DATABASE_URL ? '(definido)' : '(no definido)',
    TIPO_BD: db._type || 'desconocido'
  };

  const host = configVars.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;

  function testConn(host, port) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ ok: false, error: 'Timeout' }), 8000);
      const socket = net.createConnection({ host, port, timeout: 8000 }, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ ok: true });
      });
      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ ok: false, error: err.code || err.message });
      });
      socket.on('timeout', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ ok: false, error: 'Timeout' });
      });
    });
  }

  const resolucion = await new Promise((resolve) => {
    dns.lookup(host, (err, address) => {
      if (err) resolve({ error: err.code || 'DNS error' });
      else resolve({ address });
    });
  });

  const conectividad = await testConn(host, port);
  const conectividadResend = await testConn('smtp.resend.com', 465);

  res.json({
    variablesSMTP: configVars,
    resolucionDNS_host: resolucion,
    conexionDirecta_al_host: conectividad,
    conexionDirecta_a_smtpREsend_465: conectividadResend,
    recomendacion: conectividad.ok ? 'render_puede_conectar_al_host' : 'render_NO_puede_conectar_al_host_timeout'
  });
});

const distPath = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Sirviendo frontend desde frontend/dist');
}

async function init() {
  try {
    await db.initSchema();
    console.log(`Conectado a la base de datos (${db._type})`);
    emailScheduler.start();
    setInterval(() => pushService.checkAndSendDuePush(), 10000);
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('Error inicializando la BD:', err.message);
    process.exit(1);
  }
}

init();
