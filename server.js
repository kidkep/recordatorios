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
const emailScheduler = require('./backend/services/emailScheduler');
const pushService = require('./backend/services/pushService');

app.use('/api/reminders', reminderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/push', pushRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
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

emailScheduler.start();
setInterval(() => pushService.checkAndSendDuePush(), 10000);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
