import API from '../api';

export async function setupPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push no soportado en este navegador');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const publicKeyResponse = await fetch(`${API}/push/public-key`);
      const { publicKey } = await publicKeyResponse.json();

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    if (subscription) {
      await fetch(`${API}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      console.log('Suscripción push guardada');
    }
  } catch (err) {
    console.log('Error en suscripción push:', err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function scheduleBrowserNotification(titulo, descripcion, fecha, repetir) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();
  const delay = fecha - now;
  if (delay <= 0) return;

  try {
    const reg = await navigator.serviceWorker.ready;

    if ('showTrigger' in Notification.prototype) {
      await reg.showNotification(titulo, {
        body: descripcion || '¡Es hora de cumplir con tu recordatorio!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `reminder-${titulo}-${fecha}`,
        showTrigger: new NotificationTrigger({
          timestamp: fecha
        })
      });
      return;
    }
  } catch (e) {
    console.log('No se pudo programar notificación persistente');
  }

  scheduleFallbackNotification(titulo, descripcion, fecha, repetir);
}

function scheduleFallbackNotification(titulo, descripcion, fecha, repetir) {
  const maxDelay = 24 * 60 * 60 * 1000;
  const delay = fecha - Date.now();

  if (delay <= 0) return;
  if (delay > maxDelay && repetir === 'none') return;

  const timedOut = setTimeout(() => {
    try {
      if (Notification.permission === 'granted') {
        new Notification(titulo, {
          body: descripcion || '¡Es hora de cumplir con tu recordatorio!',
          icon: '/icon-192.png',
          badge: '/icon-192.png'
        });
      }
    } catch (e) {
      console.log('No se pudo mostrar la notificación');
    }
  }, Math.min(delay, maxDelay));

  window._scheduledNotifications = window._scheduledNotifications || [];
  window._scheduledNotifications.push(timedOut);
}
