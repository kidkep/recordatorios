import React, { useState } from 'react';
import axios from 'axios';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import API from '../api';

const COLORS = ['#4F46E5', '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6', '#14B8A6'];

const ICONS = ['📁', '💼', '📚', '📝', '🏠', '📅', '💻', '🏋️', '🎨', '🎵', '🧪', '📊'];

function CategoryManager({ categories, onClose, onSave }) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newIcon, setNewIcon] = useState(ICONS[0]);
  const [saving, setSaving] = useState(false);

  const addCategory = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/categories`, {
        nombre: newName.trim(),
        color: newColor,
        icono: newIcon
      });
      setNewName('');
      onSave();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al crear categoría');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría?')) return;
    try {
      await axios.delete(`${API}/categories/${id}`);
      onSave();
    } catch (err) {
      alert('Error al eliminar categoría');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal category-modal" onClick={e => e.stopPropagation()}>
        <h2>Gestionar categorías</h2>

        <form onSubmit={addCategory}>
          <div className="form-group">
            <label>Nombre de la nueva categoría</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Ej: Deporte, Música..."
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {COLORS.map(color => (
                <div
                  key={color}
                  className={`color-dot ${newColor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setNewColor(color)}
                ></div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Icono</label>
            <div className="mobile-category-picker">
              {ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  className="category-filter"
                  style={{ fontSize: '1.2rem', ...(newIcon === icon ? { background: newColor, borderColor: newColor, color: 'white' } : {}) }}
                  onClick={() => setNewIcon(icon)}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
            <FiPlus /> {saving ? 'Creando...' : 'Crear categoría'}
          </button>
        </form>

        <div style={{ marginTop: '20px' }}>
          <div className="section-title">Categorías existentes</div>
          {categories.map(cat => (
            <div key={cat.id} className="category-item">
              <div className="category-dot" style={{ background: `${cat.color}20` }}>
                {cat.icono}
              </div>
              <div className="category-name">{cat.nombre}</div>
              <button
                className="rm-action delete"
                onClick={() => deleteCategory(cat.id)}
                style={{ display: cat.id <= 4 ? 'none' : 'inline-block' }}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default CategoryManager;
