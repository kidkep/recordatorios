import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from '../api';

function SettingsModal({ onClose }) {
  const [config, setConfig] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    email_remitente: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await axios.get(`${API}/email/config`);
      if (res.data && Object.keys(res.data).length > 0) {
        setConfig({
          smtp_host: res.data.smtp_host || '',
          smtp_port: res.data.smtp_port || '587',
          smtp_user: res.data.smtp_user || '',
          smtp_pass: res.data.smtp_pass || '',
          email_remitente: res.data.email_remitente || ''
        });
      }
    } catch (err) {
      console.error('Error cargando config:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axios.post(`${API}/email/config`, config);
      setMessage('✅ Configuración guardada correctamente');
      setTimeout(onClose, 1500);
    } catch (err) {
      setMessage('❌ Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Configuración de notificaciones por correo</h2>
        <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '20px' }}>
          Configura tu servidor SMTP para recibir correos de recordatorios.
          Puedes usar Gmail, Outlook u otro proveedor de correo.
        </p>

        <div style={{ marginBottom: '16px', padding: '12px', background: '#F3F4F6', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong>💡 Para Gmail:</strong><br />
          Host: smtp.gmail.com<br />
          Puerto: 587<br />
          Usuario: tu correo de gmail<br />
          Contraseña: tu contraseña de aplicación
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Servidor SMTP</label>
            <input
              type="text"
              value={config.smtp_host}
              onChange={e => updateField('smtp_host', e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Puerto</label>
              <input
                type="number"
                value={config.smtp_port}
                onChange={e => updateField('smtp_port', e.target.value)}
                placeholder="587"
              />
            </div>
            <div className="form-group">
              <label>Email remitente</label>
              <input
                type="email"
                value={config.email_remitente}
                onChange={e => updateField('email_remitente', e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Usuario SMTP</label>
            <input
              type="email"
              value={config.smtp_user}
              onChange={e => updateField('smtp_user', e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña SMTP</label>
            <input
              type="password"
              value={config.smtp_pass}
              onChange={e => updateField('smtp_pass', e.target.value)}
              placeholder="contraseña o clave de aplicación"
            />
          </div>

          {message && (
            <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: message.startsWith('✅') ? '#D1FAE5' : '#FEE2E2', color: message.startsWith('✅') ? '#065F46' : '#991B1B' }}>
              {message}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SettingsModal;
