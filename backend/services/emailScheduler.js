const nodemailer = require('nodemailer');
const db = require('../db');

let schedulerInterval = null;

function getConfig() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM configuracion', (err, rows) => {
      if (err) {
        return reject(err);
      }
      const config = {};

      config.smtp_host = process.env.SMTP_HOST || '';
      config.smtp_port = process.env.SMTP_PORT || '587';
      config.smtp_user = process.env.SMTP_USER || '';
      config.smtp_pass = process.env.SMTP_PASS || '';
      config.email_remitente = process.env.EMAIL_REMITENTE || '';

      rows.forEach(r => {
        if (r.valor) {
          config[r.clave] = r.valor;
        }
      });

      resolve(config);
    });
  });
}

async function createTransporter() {
  try {
    const config = await getConfig();
    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
      return null;
    }
    return nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port) || 587,
      secure: (parseInt(config.smtp_port) || 587) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass
      }
    });
  } catch (err) {
    console.error('Error creando transporter:', err.message);
    return null;
  }
}

async function sendEmail(to, subject, text, html) {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      console.log('Email no configurado, omitiendo envío');
      return false;
    }
    const config = await getConfig();
    await transporter.sendMail({
      from: config.email_remitente || config.smtp_user,
      to,
      subject,
      text,
      html
    });
    console.log(`Email enviado a ${to} - "${subject}"`);
    return true;
  } catch (err) {
    console.error('Error enviando email:', err.message);
    return false;
  }
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
        <div style="margin-top:20px;text-align:center;">
          <a href="${process.env.APP_URL || ''}" style="background:#4F46E5;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver en la app</a>
        </div>
      </div>
    </div>
  `;

  return { text, html };
}

async function checkDueReminders() {
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  db.all(`
    SELECT r.*, c.nombre as categoria_nombre, c.color as categoria_color
    FROM recordatorios r
    LEFT JOIN categorias c ON r.categoria_id = c.id
    WHERE r.notificacion_email = 1
      AND r.email_destino IS NOT NULL
      AND r.email_destino != ''
      AND r.fecha BETWEEN ? AND ?
  `, [fiveMinAgo, now], async (err, reminders) => {
    if (err || !reminders) return;

    for (const reminder of reminders) {
      const categoria = reminder.categoria_nombre ? {
        nombre: reminder.categoria_nombre,
        color: reminder.categoria_color
      } : null;

      const { text, html } = buildReminderEmail(reminder, categoria);
      await sendEmail(
        reminder.email_destino,
        `🔔 Recordatorio: ${reminder.titulo}`,
        text,
        html
      );

      if (reminder.repetir && reminder.repetir !== 'none') {
        scheduleNextOccurrence(reminder);
      }
    }
  });
}

function scheduleNextOccurrence(reminder) {
  let nextDate;
  const now = Date.now();

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

  db.run(
    'UPDATE recordatorios SET fecha = ? WHERE id = ?',
    [nextDate, reminder.id],
    (err) => {
      if (err) {
        console.error('Error reprogramando recordatorio:', err.message);
      } else {
        console.log(`Recordatorio "${reminder.titulo}" reprogramado para ${new Date(nextDate).toLocaleString()}`);
      }
    }
  );
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
  console.log('Email scheduler iniciado');
}

module.exports = { start, sendEmail, checkAndSchedule };
