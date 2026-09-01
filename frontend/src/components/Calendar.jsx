import React, { useState } from 'react';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function Calendar({ reminders, categories, onSelectDay }) {
  const hoy = new Date();
  const [mesActual, setMesActual] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoy.toDateString());

  const anio = mesActual.getFullYear();
  const mes = mesActual.getMonth();

  // Primer día de la semana (lunes = 0)
  const primerDia = new Date(anio, mes, 1);
  const offset = (primerDia.getDay() + 6) % 7; // convertir domingo=0 a lunes=0

  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  // Agrupar recordatorios por día (string yyyy-mm-dd)
  const recordatoriosPorDia = {};
  reminders.forEach(r => {
    const d = new Date(r.fecha);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!recordatoriosPorDia[key]) recordatoriosPorDia[key] = [];
    recordatoriosPorDia[key].push(r);
  });

  const getCategory = (id) => categories.find(c => String(c.id) === String(id));

  const keyDeFecha = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const cambiarMes = (delta) => {
    setMesActual(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const irHoy = () => {
    const t = new Date();
    setMesActual(new Date(t.getFullYear(), t.getMonth(), 1));
    setDiaSeleccionado(t.toDateString());
  };

  // Recordatorios del día seleccionado
  const dSel = new Date(diaSeleccionado);
  const keySel = keyDeFecha(dSel);
  const recDelDia = (recordatoriosPorDia[keySel] || []).sort((a, b) => a.fecha - b.fecha);

  const celdas = [];
  for (let i = 0; i < offset; i++) {
    celdas.push(<div key={`v-${i}`} className="cal-day cal-vacio"></div>);
  }
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(anio, mes, d);
    const key = keyDeFecha(fecha);
    const recs = recordatoriosPorDia[key] || [];
    const esHoy = fecha.toDateString() === hoy.toDateString();
    const esSeleccionado = fecha.toDateString() === dSel.toDateString();
    celdas.push(
      <div
        key={key}
        className={`cal-day ${esHoy ? 'cal-hoy' : ''} ${esSeleccionado ? 'cal-seleccionado' : ''}`}
        onClick={() => { setDiaSeleccionado(fecha.toDateString()); }}
      >
        <span className="cal-num">{d}</span>
        {recs.length > 0 && (
          <div className="cal-marcas">
            {recs.slice(0, 3).map(r => {
              const cat = getCategory(r.categoria_id);
              return (
                <span
                  key={r.id}
                  className="cal-marca"
                  style={{ background: cat?.color || '#4F46E5' }}
                  title={r.titulo}
                ></span>
              );
            })}
            {recs.length > 3 && <span className="cal-mas">+{recs.length - 3}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="calendar-wrapper">
      <div className="calendar-grid">
        <div className="calendar-header">
          <button className="cal-nav" onClick={() => cambiarMes(-1)}>‹</button>
          <div className="cal-titulo">
            {MESES[mes]} {anio}
          </div>
          <button className="cal-nav" onClick={() => cambiarMes(1)}>›</button>
        </div>
        <div className="calendar-dias-semana">
          {DIAS_SEMANA.map(d => <div key={d} className="cal-dia-sem">{d}</div>)}
        </div>
        <div className="calendar-celdas">
          {celdas}
        </div>
        <div className="calendar-today-row">
          <button className="cal-hoy-btn" onClick={irHoy}>Hoy</button>
        </div>
      </div>

      <div className="calendar-day-detail">
        <div className="cal-detail-title">
          {dSel.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        {recDelDia.length === 0 ? (
          <div className="cal-detail-empty">Sin recordatorios este día</div>
        ) : (
          recDelDia.map(r => {
            const cat = getCategory(r.categoria_id);
            const hora = new Date(r.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={r.id} className="cal-rec-item" onClick={() => onSelectDay && onSelectDay(r)}>
                <div className="cal-rec-color" style={{ background: cat?.color || '#4F46E5' }}></div>
                <div className="cal-rec-info">
                  <div className="cal-rec-title">{r.titulo}</div>
                  <div className="cal-rec-meta">
                    <span className="cal-rec-hora">🕐 {hora}</span>
                    {cat && <span className="cal-rec-cat">{cat.nombre}</span>}
                    {r.repetir !== 'none' && <span className="cal-rec-rep">🔁</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Calendar;