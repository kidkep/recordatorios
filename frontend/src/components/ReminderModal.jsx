import React, { useState } from 'react';
import axios from 'axios';
import { scheduleBrowserNotification } from '../utils/notifications';
import API from '../api';

function ReminderModal({ reminder, categories, onClose, onSave, userEmail }) {
  const [form, setForm] = useState({
    titulo: reminder?.titulo || '',
    descripcion: reminder?.descripcion || '',
    categoria_id: reminder?.categoria_id || (categories[0]?.id || ''),
    fecha: reminder?.fecha ? new Date(reminder.fecha).toISOString().slice(0, 16) : '',
    repetir: reminder?.repetir || 'none',
    notificacion_push: reminder ? Boolean(reminder.notificacion_push) : true,
    notificacion_email: reminder ? Boolean(reminder.notificacion_email) : false,
    email_destino: reminder?.email_destino || userEmail || '',
    aviso_minutos: reminder?.aviso_minutos || ''
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.fecha) {
      alert('Por favor completa el título y la fecha');
      return;
    }

    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      categoria_id: form.categoria_id || null,
      fecha: new Date(form.fecha).getTime(),
      repetir: form.repetir,
      notificacion_push: form.notificacion_push,
      notificacion_email: form.notificacion_email,
      email_destino: form.notificacion_email ? form.email_destino.trim() : null
    };

    if (form.notificacion_email) payload.aviso_minutos = form.aviso_minutos ? Number(form.aviso_minutos) : null;

    if (form.notificacion_email && !form.email_destino.trim()) {
      alert('Ingresa tu email para recibir notificaciones');
      setSaving(false);
      return;
    }

    try {
      if (reminder) {
        await axios.put(`${API}/reminders/${reminder.id}`, payload);
      } else {
        await axios.post(`${API}/reminders`, payload);
        if (payload.notificacion_push) {
          scheduleBrowserNotification(payload.titulo, payload.descripcion, payload.fecha, payload.repetir);
        }
      }
      onSave();
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Hubo un error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{reminder ? 'Editar recordatorio' : 'Nuevo recordatorio'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => updateField('titulo', e.target.value)}
              placeholder="Ej: Entregar tarea de matemáticas"
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => updateField('descripcion', e.target.value)}
              placeholder="Detalles adicionales (opcional)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Categoría</label>
              <select
                value={form.categoria_id}
                onChange={e => updateField('categoria_id', e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icono} {cat.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha y hora *</label>
              <input
                type="datetime-local"
                value={form.fecha}
                onChange={e => updateField('fecha', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Repetir</label>
            <select
              value={form.repetir}
              onChange={e => updateField('repetir', e.target.value)}
            >
              <option value="none">No repetir</option>
              <option value="diario">Diario</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
              <option value="cada 2 días">Cada 2 días</option>
              <option value="cada 3 días">Cada 3 días</option>
            </select>
          </div>

          <div className="toggle-box">
            <div className="toggle-label">📱 Notificar en este dispositivo</div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.notificacion_push}
                onChange={e => updateField('notificacion_push', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="toggle-box">
            <div className="toggle-label">✉️ Enviar por correo</div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={form.notificacion_email}
                onChange={e => updateField('notificacion_email', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {form.notificacion_email && (
            <>
            <div className="form-group">
              <label>Email de destino</label>
              <input
                type="email"
                value={form.email_destino}
                onChange={e => updateField('email_destino', e.target.value)}
                placeholder="tucorreo@ejemplo.com"
              />
            </div>
            <div className="form-group">
              <label>Enviar correo</label>
              <select
                value={form.aviso_minutos}
                onChange={e => updateField('aviso_minutos', e.target.value)}
              >
                <option value="">A la hora exacta</option>
                <option value="5">5 minutos antes</option>
                <option value="10">10 minutos antes</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60">1 hora antes</option>
                <option value="1440">1 día antes</option>
              </select>
            </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : reminder ? 'Guardar cambios' : 'Crear recordatorio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReminderModal;
