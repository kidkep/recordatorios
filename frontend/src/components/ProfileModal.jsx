import React, { useState } from 'react';
import axios from 'axios';
import API from '../api';

function ProfileModal({ usuario, onClose, onLogout, onProfileUpdate }) {
  const [email, setEmail] = useState(usuario?.email || '');
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (usuario?.email && !email.trim()) {
      setError('Si antes tenías un email, escríbelo de nuevo o deja el actual');
      return;
    }
    setCargandoPerfil(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API}/auth/perfil`,
        { email: email.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onProfileUpdate) {
        onProfileUpdate({ ...usuario, email: res.data.usuario.email, nombre: res.data.usuario.nombre });
      }
      setMensaje('¡Email actualizado correctamente!');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar el email');
    } finally {
      setCargandoPerfil(false);
    }
  };

  const cambiarClave = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');
    if (nuevaContrasena !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (nuevaContrasena.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres');
      return;
    }
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/auth/cambiar-clave`,
        { contrasena_actual: contrasenaActual, nueva_contrasena: nuevaContrasena },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMensaje('¡Contraseña actualizada correctamente!');
      setContrasenaActual('');
      setNuevaContrasena('');
      setConfirmar('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Mi cuenta</h2>

        <div className="profile-info">
          <div className="profile-avatar">👤</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{usuario?.nombre}</div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>@{usuario?.usuario}</div>
            {usuario?.email && (
              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>✉️ {usuario.email}</div>
            )}
            <div className="rm-category" style={{ background: '#EEF2FF', color: '#4F46E5', marginTop: '6px' }}>
              {usuario?.rol === 'admin' ? 'Administrador' : 'Usuario'}
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

        <h3 style={{ marginTop: 0 }}>Email de notificaciones</h3>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '-8px', marginBottom: '12px' }}>
          Este correo recibirá automáticamente tus recordatorios. Los demás usuarios tienen el suyo.
        </p>
        <form onSubmit={guardarPerfil}>
          <div className="form-group">
            <label>Mi correo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              required
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          {!error && mensaje && <div className="login-success">{mensaje}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={cargandoPerfil}>
            {cargandoPerfil ? 'Guardando...' : 'Guardar email'}
          </button>
        </form>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

        <h3>Cambiar contraseña</h3>
        <form onSubmit={cambiarClave}>
          <div className="form-group">
            <label>Contraseña actual</label>
            <input
              type="password"
              value={contrasenaActual}
              onChange={e => setContrasenaActual(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input
              type="password"
              value={nuevaContrasena}
              onChange={e => setNuevaContrasena(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={cargando}>
            {cargando ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>

        <div className="form-actions" style={{ marginTop: '20px' }}>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={onLogout}>
            Cerrar sesión
          </button>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;