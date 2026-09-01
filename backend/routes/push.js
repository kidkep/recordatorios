const express = require('express');
const router = express.Router();
const db = require('../db');
const pushService = require('../services/pushService');

router.get('/public-key', (req, res) => {
  res.json({ publicKey: pushService.getPublicKey() });
});

router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }
    await pushService.saveSubscription(subscription);
    res.json({ message: 'Suscripción guardada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    await pushService.removeSubscription(endpoint);
    res.json({ message: 'Suscripción eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
