const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const db = require('../db');

let schedulerInterval = null;

// Preferimos la API de Resend (HTTP) porque Render free bloquea SMTP saliente.
// Si RESEND_API_KEY esta definida, usamos API HTTP; si no, caemos a SMTP.

async function getConfig() {
  const rows = await db.all('SELECT * FROM configuracion', []);
  const config = {};

  // Ambientales primero (Render)
  config.smtp_host = process.env.SMTP_HOST || '';
  config.smtp_port = process.env.SMTP_PORT || '587';
  config.smtp_user = process.env.SMTP_USER || '';
  config.smtp_pass = process.env.SMTP_PASS || '';
  config.resend_api_key = process.env.RESEND_API_KEY || '';
  config.email_remitente = process.env.EMAIL_REMITENTE || '';

  // Si no hay RESEND_API_KEY pero SMTP_PASS parece una API key de Resend (empieza con re_), usarla
  if (!config.resend_api_key && config.smtp_pass && config.smtp_pass.startsWith('re_')) {
    config.resend_api_key = config.smtp_pass;
  }

  rows.forEach(r => {
    if (r.valor) {
      config[r.clave] = r.valor;
    }
  });

  return config;
}

function extraerRemitente(emailRemitente) {
  // Acepta "Nombre <correo@x.com>" o "correo@x.com"
  if (!emailRemitente) return { nombre: '', email: '' };
  const match = emailRemitente.match(/^([^<]*)<([^>]+)>/);
  if (match) {
    return { nombre: match[1].trim(), email: match[2].trim() };
  }
  return { nombre: '', email: emailRemitente.trim() };
}

async function enviarConResend(config, to, subject, text, html) {
  const resend = new Resend(config.resend_api_key);
  const remitente = extraerRemitente(config.email_remitente || config.smtp_user);
  const from = remitente.nombre
    ? `${remitente.nombre} <${remitente.email}>`
    : remitente.email;

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html: html || text
  });

  if (error) {
    throw new Error(error.message || 'Error API Resend');
  }
}

async function enviarConSMTP(config, to, subject, text, html) {
  const port = parseInt(config.smtp_port) || 587;
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port,
    secure,
    requireTLS: !secure && (config.smtp_host || '').toLowerCase().includes('gmail'),
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass
    },
    tls: secure ? {} : { rejectUnauthorized: false }
  });

  await transporter.sendMail({
    from: config.email_remitente || config.smtp_user,
    to,
    subject,
    text,
    html
  });
}

async function sendEmail(to, subject, text, html) {
  let config;
  try {
    config = await getConfig();
  } catch (err) {
    console.error('Error leyendo config:', err.message);
    return false;
  }

  const usarResend = !!(config.resend_api_key);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (usarResend) {
        await enviarConResend(config, to, subject, text, html);
        console.log(`[Resend] Email enviado a ${to} - "${subject}"`);
      } else {
        if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
          console.log('Email no configurado (ni Resend ni SMTP), omitiendo envío');
          return false;
        }
        await enviarConSMTP(config, to, subject, text, html);
        console.log(`Email enviado a ${to} - "${subject}"`);
      }
      return true;
    } catch (err) {
      const modo = usarResend ? 'Resend' : 'SMTP';
      console.error(`Error enviando email via ${modo} (intento ${attempt}/3): ${err.message}`);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 5000));
      }
    }
  }
  return false;
}

function buildReminderEmail(reminder, categoria) {
  const fecha = new Date(reminder.fecha);
  const fechaStr = fecha.toLocaleString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

  const catName = categoria ? categoria.nombre : 'General';
  const catColor = categoria ? categoria.color : '#4F46E5';

  let repetirTxt = '';
  if (reminder.repetir && reminder.repetir !== 'none') {
    repetirTxt = `<p style="margin:8px 0">🔄 <strong>Se repite:</strong> ${reminder.repetir}</p>`;
  }

  const text = `RECORDATORIO: ${reminder.titulo}\n\n${reminder.descripcion ? reminder.descripcion + '\n\n' : ''}Fecha: ${fechaStr}\nCategoría: ${catName}${reminder.repetir !== 'none' ? '\nSe repite: ' + reminder.repetir : ''}`;

  let html = `
    <div style="font-family:Arial, sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:16px;">
      <div style="background:#4F46E5;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:24px;">🔔 RECORDATORIO</h1>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <h2 style="margin:0 0 8px;color:#1f2937;">${reminder.titulo}</h2>
        ${reminder.descripcion ? `<p style="color:#6b7280;margin:0 0 16px;">${reminder.descripcion}</p>` : ''}
        <p style="margin:8px 0;color:#374151;">📅 <strong>Fecha:</strong> ${fechaStr}</p>
        <p style="margin:8px 0;color:#374151;"><strong>Categoría:</strong> <span style="color:${catColor};">${catName}</span></p>
        ${repetirTxt}
      </div>
    </div>
  `;

  return { text, html };
}

async function checkDueReminders() {
  const now = Date.now();
  // Ventana amplia para capturar avisos previos y recordatorios al momento
  const ventanaInicio = now - 15 * 60 * 1000;

  try {
    const reminders = await db.all(`
      SELECT r.*, c.nombre as categoria_nombre, c.color as categoria_color
      FROM recordatorios r
      LEFT JOIN categorias c ON r.categoria_id = c.id
      WHERE r.notificacion_email = 1
        AND r.email_destino IS NOT NULL
        AND r.email_destino != ''
        AND COALESCE(r.email_enviado, 0) = 0
        AND (
          -- Momento de aviso (fecha - aviso_minutos, o fecha si no hay aviso previo)
          (r.fecha - COALESCE(r.aviso_minutos, 0) * 60000) BETWEEN ? AND ?
        )
    `, [ventanaInicio, now]);

    if (!reminders) return;

    for (const reminder of reminders) {
      const categoria = reminder.categoria_nombre ? {
        nombre: reminder.categoria_nombre,
        color: reminder.categoria_color
      } : null;

      const { text, html } = buildReminderEmail(reminder, categoria);
      const enviado = await sendEmail(
        reminder.email_destino,
        `🔔 Recordatorio: ${reminder.titulo}`,
        text,
        html
      );

      // Marcar como notificado para evitar envíos duplicados (solo si se envió bien)
      if (enviado) {
        await db.run('UPDATE recordatorios SET email_enviado = 1 WHERE id = ?', [reminder.id]);
        if (reminder.repetir && reminder.repetir !== 'none') {
          await scheduleNextOccurrence(reminder);
        }
      }
    }
  } catch (err) {
    console.error('Error en checkDueReminders:', err.message);
  }
}

async function scheduleNextOccurrence(reminder) {
  const now = Date.now();
  let nextDate;

  switch (reminder.repetir) {
    case 'diario':
      nextDate = now + 24 * 60 * 60 * 1000;
      break;
    case 'semanal':
      nextDate = now + 7 * 24 * 60 * 60 * 1000;
      break;
    case 'mensual':
      nextDate = now + 30 * 24 * 60 * 60 * 1000;
      break;
    case 'cada 2 días':
      nextDate = now + 2 * 24 * 60 * 60 * 1000;
      break;
    case 'cada 3 días':
      nextDate = now + 3 * 24 * 60 * 60 * 1000;
      break;
    default:
      return;
  }

  try {
    await db.run(
      'UPDATE recordatorios SET fecha = ?, email_enviado = 0 WHERE id = ?',
      [nextDate, reminder.id]
    );
    console.log(`Recordatorio "${reminder.titulo}" reprogramado para ${new Date(nextDate).toLocaleString()}`);
  } catch (err) {
    console.error('Error reprogramando recordatorio:', err.message);
  }
}

function checkAndSchedule(reminderId) {
  try {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
    }
    schedulerInterval = setInterval(() => checkDueReminders(), 30000);
  } catch (err) {
    console.error('Error en scheduler:', err.message);
  }
}

function start() {
  checkAndSchedule();
  setInterval(() => checkDueReminders(), 30000);
  console.log('Email scheduler iniciado (Resend API si esta disponible)');
}

module.exports = { start, sendEmail, checkAndSchedule };
