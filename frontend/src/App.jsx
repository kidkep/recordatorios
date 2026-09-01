import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FiBell, FiPlus, FiSettings, FiTrash2, FiEdit2, FiMail, FiUser } from 'react-icons/fi';
import ReminderModal from './components/ReminderModal';
import CategoryManager from './components/CategoryManager';
import SettingsModal from './components/SettingsModal';
import Login from './components/Login';
import ProfileModal from './components/ProfileModal';
import { setupPushSubscription } from './utils/notifications';
import API from './api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || 'null');
    } catch { return null; }
  });
  const [showProfile, setShowProfile] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [permissionRequested, setPermissionRequested] = useState(false);
  const firedReminders = useRef(new Set());

  const handleLogin = (nuevoToken, nuevoUsuario) => {
    localStorage.setItem('token', nuevoToken);
    localStorage.setItem('usuario', JSON.stringify(nuevoUsuario));
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    setShowProfile(false);
    setReminders([]);
    setCategories([]);
  };

  const loadData = async () => {
    try {
      const [remindersRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/reminders`),
        axios.get(`${API}/categories`)
      ]);
      setReminders(remindersRes.data);
      setCategories(categoriesRes.data);
      checkDueNotifications(remindersRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkDueNotifications = (remindersData) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const now = Date.now();
    remindersData.forEach(rem => {
      const firedKey = `${rem.id}-${rem.repetir}-${rem.fecha}`;
      if (firedReminders.current.has(firedKey)) return;

      const timeUntil = rem.fecha - now;
      if (timeUntil >= 0 && timeUntil <= 30000) {
        firedReminders.current.add(firedKey);
        try {
          new Notification(rem.titulo, {
            body: rem.descripcion || '¡Es hora de cumplir con tu recordatorio!',
            icon: '/icon-192.png',
            badge: '/icon-192.png'
          });
        } catch (e) {
          console.log('Error mostrando notificación');
        }
      }
    });
  };

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setPermissionRequested(true);
    if (permission === 'granted') {
      setupPushSubscription();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este recordatorio?')) return;
    try {
      await axios.delete(`${API}/reminders/${id}`);
      loadData();
    } catch (err) {
      console.error('Error eliminando:', err);
    }
  };

  const filterReminders = () => {
    if (filterCategory === 'all') return reminders;
    return reminders.filter(r => String(r.categoria_id) === String(filterCategory));
  };

  const getCategoryById = (id) => {
    return categories.find(c => String(c.id) === String(id));
  };

  const isUrgent = (reminder) => {
    const diff = reminder.fecha - Date.now();
    return diff > 0 && diff < 2 * 60 * 60 * 1000;
  };

  const isToday = (reminder) => {
    const rDate = new Date(reminder.fecha);
    const today = new Date();
    return rDate.toDateString() === today.toDateString();
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoy, ${time}`;
    if (isTomorrow) return `Mañana, ${time}`;
    return date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + time;
  };

  const filtered = filterReminders();
  const upcoming = reminders.filter(r => r.fecha >= Date.now()).length;
  const todayCount = reminders.filter(r => isToday(r) && r.fecha >= Date.now()).length;

  return (
    <div className="app">
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
      <>
      <div className="topbar">
        <h1><FiBell /> Recordatorios</h1>
        <div className="topbar-actions">
          <button className="btn-top" onClick={() => setShowProfile(true)} title="Mi cuenta">
            <FiUser />
          </button>
          <button className="btn-top" onClick={() => setShowSettings(true)}>
            <FiSettings />
          </button>
          <button className="btn-top" onClick={() => { setEditingReminder(null); setShowModal(true); }}>
            <FiPlus /> <span className="hide-mobile">Nuevo</span>
          </button>
        </div>
      </div>

      {('Notification' in window) && Notification.permission === 'default' && !permissionRequested && (
        <div style={{ background: '#EEF2FF', borderBottom: '1px solid #C7D2FE', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem', color: '#3730A3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiBell /> Activa las notificaciones para recibir alertas incluso cuando la app esté cerrada (PC y móvil).
          </div>
          <button
            onClick={requestNotificationPermission}
            style={{ background: '#4F46E5', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}
          >
            Activar 🔔
          </button>
        </div>
      )}

      <div className="container">
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-value">{reminders.length}</div>
            <div className="stat-label">Total recordatorios</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{upcoming}</div>
            <div className="stat-label">Próximos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{todayCount}</div>
            <div className="stat-label">Para hoy</div>
          </div>
        </div>

        <div className="section-title">Categorías</div>
        <div className="category-filters">
          <button
            className={`category-filter ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            📋 Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-filter ${String(filterCategory) === String(cat.id) ? 'active' : ''}`}
              onClick={() => setFilterCategory(String(cat.id))}
              style={String(filterCategory) === String(cat.id) ? { background: cat.color, borderColor: cat.color } : {}}
            >
              {cat.icono} {cat.nombre}
            </button>
          ))}
          <button className="category-filter" onClick={() => setShowCategories(true)}>
            + Gestionar
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Mis recordatorios</div>
          <button
            className="btn btn-secondary"
            onClick={() => { setEditingReminder(null); setShowModal(true); }}
          >
            <FiPlus /> Nuevo recordatorio
          </button>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p>Cargando recordatorios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>No hay recordatorios. ¡Crea el primero!</p>
          </div>
        ) : (
          <div className="reminder-list">
            {filtered.map(reminder => {
              const cat = getCategoryById(reminder.categoria_id);
              const urgent = isUrgent(reminder);
              const todayReminder = isToday(reminder);
              return (
                <div
                  key={reminder.id}
                  className={`reminder-card ${urgent ? 'urgent' : ''} ${todayReminder ? 'today-card' : ''}`}
                >
                  <div className="rm-icon">
                    <span style={{ fontSize: '2rem' }}>{cat?.icono || '📁'}</span>
                  </div>
                  <div className="rm-content">
                    <div className="rm-title">{reminder.titulo}</div>
                    {reminder.descripcion && (
                      <div className="rm-desc">{reminder.descripcion}</div>
                    )}
                    <div className="rm-meta">
                      {cat && (
                        <span
                          className="rm-category"
                          style={{ background: `${cat.color}20`, color: cat.color }}
                        >
                          {cat.nombre}
                        </span>
                      )}
                      <span>🕐 {formatDate(reminder.fecha)}</span>
                      {reminder.repetir !== 'none' && (
                        <span className="repeat-pill">🔁 Se repite {reminder.repetir}</span>
                      )}
                      {reminder.notificacion_push ? <span>📱</span> : null}
                      {reminder.notificacion_email ? <span>✉️</span> : null}
                    </div>
                  </div>
                  <div className="rm-actions">
                    <button
                      className="rm-action"
                      onClick={() => { setEditingReminder(reminder); setShowModal(true); }}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      className="rm-action delete"
                      onClick={() => handleDelete(reminder.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ReminderModal
          reminder={editingReminder}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadData(); }}
        />
      )}

      {showCategories && (
        <CategoryManager
          categories={categories}
          onClose={() => setShowCategories(false)}
          onSave={() => { loadData(); }}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}

      {showProfile && (
        <ProfileModal
          usuario={usuario}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}
      </>
      )}
    </div>
  );
}

export default App;
