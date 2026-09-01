import React, { useState } from 'react';
import axios from 'axios';
import API from '../api';

function Login({ onLogin }) {
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState({ nombre: '', usuario: '', contrasena: '', email: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const update = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (modo === 'login') {
        const res = await axios.post(`${API}/auth/login`, {
          usuario: form.usuario.trim(),
          contrasena: form.contrasena
        });
        onLogin(res.data.token, res.data.usuario);
      } else {
        const res = await axios.post(`${API}/auth/register`, {
          nombre: form.nombre.trim(),
          usuario: form.usuario.trim(),
          contrasena: form.contrasena,
          email: form.email.trim()
        });
        onLogin(res.data.token, res.data.usuario);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-icon">🔔</div>
        <h1>Recordatorios</h1>
        <p className="login-sub">Clases y trabajos al día</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${modo === 'login' ? 'active' : ''}`}
            onClick={() => { setModo('login'); setError(''); }}
          >
            Iniciar sesión
          </button>
          <button
            className={`login-tab ${modo === 'register' ? 'active' : ''}`}
            onClick={() => { setModo('register'); setError(''); }}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {modo === 'register' && (
            <>
            <div className="form-group">
              <label>Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => update('nombre', e.target.value)}
                placeholder="Tu nombre"
                required
              />
            </div>
            <div className="form-group">
              <label>Email (para recibir los recordatorios)</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>
            </>
          )}

          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={form.usuario}
              onChange={e => update('usuario', e.target.value)}
              placeholder="Elige tu usuario"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={form.contrasena}
              onChange={e => update('contrasena', e.target.value)}
              placeholder="Tu contraseña"
              required
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={cargando}>
            {cargando ? '...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
