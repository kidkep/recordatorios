const webpush = require('web-push');
const db = require('../db');

const VAPID_PUBLIC_KEY = 'BB2S2RIfxjsPfbHHpnuwxEExf_IO4X0eKTRMtrFmCuZw-N9JaxCpzK6FzAYd_-HEtHyVVpDsR_X8HihpB07zCWw';
const VAPID_PRIVATE_KEY = 'b8SoFSKkpRpABHAqkSjErCNmXrF8xUVdyoJWzMEXo2U';

function getPublicKey() {
  return VAPID_PUBLIC_KEY;
}

webpush.setVapidDetails(
  'mailto:recordatorios@app.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

function getBaseUrl() {
  return process.env.APP_URL || '';
}

function getIconUrl() {
  const base = getBaseUrl();
  return base ? `${base}/icon-192.png` : '/icon-192.png';
}

async function saveSubscription(subscription) {
  // Compatible con SQLite y PostgreSQL (replace = borrar + insertar)
  await db.run('DELETE FROM suscripciones WHERE endpoint = ?', [subscription.endpoint]);
  await db.run('INSERT INTO suscripciones (endpoint, keys) VALUES (?, ?)',
    [subscription.endpoint, JSON.stringify(subscription.keys)]);
}

async function removeSubscription(endpoint) {
  await db.run('DELETE FROM suscripciones WHERE endpoint = ?', [endpoint]);
}

async function getAllSubscriptions() {
  const rows = await db.all('SELECT * FROM suscripciones', []);
  return rows.map(r => ({
    endpoint: r.endpoint,
    keys: JSON.parse(r.keys)
  }));
}

async function sendPushNotification(titulo, body) {
  const subscriptions = await getAllSubscriptions();
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: titulo,
    body: body,
    icon: getIconUrl(),
    badge: getIconUrl(),
    vibrate: [200, 100, 200],
    url: getBaseUrl() || '/'
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      console.log(`Push enviado a ${sub.endpoint}`);
    } catch (err) {
      console.log(`Error enviando push: ${err.message}`);
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removeSubscription(sub.endpoint);
      }
    }
  }
}

function reprocessPushReminder(reminder) {
  const now = Date.now();
  const diff = now - reminder.fecha;
  if (diff >= 0 && diff <= 15000) {
    sendPushNotification(
      `🔔 ${reminder.titulo}`,
      reminder.descripcion || '¡Es hora de cumplir con tu recordatorio!'
    );
  }
}

async function checkAndSendDuePush() {
  const now = Date.now();
  try {
    const reminders = await db.all('SELECT * FROM recordatorios WHERE notificacion_push = 1', []);
    for (const rem of reminders) {
      const diff = now - rem.fecha;
      if (diff >= 0 && diff <= 15000) {
        await sendPushNotification(
          `🔔 ${rem.titulo}`,
          (rem.descripcion || '¡Es hora de cumplir con tu recordatorio!')
        );
      }
    }
  } catch (err) {
    console.error('Error en checkAndSendDuePush:', err.message);
  }
}

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  getAllSubscriptions,
  sendPushNotification,
  checkAndSendDuePush,
  reprocessPushReminder
};
