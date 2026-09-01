const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const reminderRoutes = require('./routes/reminders');
const categoryRoutes = require('./routes/categories');
const emailRoutes = require('./routes/email');
const pushRoutes = require('./routes/push');
const emailScheduler = require('./services/emailScheduler');
const pushService = require('./services/pushService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/reminders', reminderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/push', pushRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function init() {
  try {
    await db.initSchema();
    console.log(`Conectado a la base de datos (${db._type})`);
    emailScheduler.start();
    setInterval(() => pushService.checkAndSendDuePush(), 10000);
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error inicializando la BD:', err.message);
    process.exit(1);
  }
}

init();
