# 📚 Aplicación de Recordatorios

Aplicación web PWA para gestionar tus clases, trabajos y tareas con notificaciones en tu **PC** y **móvil** (por push y correo).

## ✨ Funcionalidades

- 📝 **Crear recordatorios** con título, descripción, fecha y hora
- 🗂️ **Categorías** personalizables (Trabajo, Clases, Exámenes, Personal, etc.)
- 🔁 **Recordatorios repetitivos** (diario, semanal, mensual, cada 2/3 días)
- 🔔 **Notificaciones push** en PC y móvil (incluso con la app cerrada)
- ✉️ **Notificaciones por correo** (SMTP: Gmail, Outlook, etc.)
- 📱 **Instalable como app** en tu teléfono (PWA)
- 🎨 Interfaz moderna y responsive

## 🚀 Cómo iniciar

### Opción 1: Un solo clic (Windows)
1. Doble clic en **`iniciar.cmd`**
2. Se abren dos ventanas (backend y frontend)
3. Abre tu navegador en:
   - **PC**: `http://localhost:3000`
   - **Móvil**: `http://192.168.1.5:3000` (misma red WiFi)

### Opción 2: Manualmente
```bash
# Terminal 1 - Backend (puerto 4000)
cd backend
npm run dev

# Terminal 2 - Frontend (puerto 3000)
cd frontend
npm run dev
```

## 📱 Instalar en tu teléfono (como app nativa)
1. Desde tu móvil, abre la dirección del servidor (`http://192.168.1.5:3000`)
2. En el navegador, busca la opción **"Agregar a pantalla de inicio"** o **"Instalar app"**
   - Chrome: menú ⋮ → "Instalar aplicación" / "Agregar a pantalla principal"
   - Safari (iPhone): botón compartir → "Añadir a pantalla de inicio"
3. La app aparecerá en tu pantalla como una aplicación normal

## 🔔 Configurar notificaciones

### En PC y móvil (push)
1. Al abrir la app, verás un banner azul: **"Activar 🔔"**
2. Haz clic para permitir las notificaciones
3. ¡Listo! Recibirás alertas aunque la app esté cerrada

### Por correo
1. Haz clic en el ícono de ⚙️ (ajustes)
2. Configura tu servidor SMTP:

**Ejemplo con Gmail:**
| Campo | Valor |
|-------|-------|
| Servidor SMTP | `smtp.gmail.com` |
| Puerto | `587` |
| Email remitente | tu correo gmail |
| Usuario SMTP | tu correo gmail |
| Contraseña | tu contraseña de aplicación de Gmail |

> 💡 Para Gmail necesitas crear una **"Contraseña de aplicación"**:
> Cuenta Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación

3. Guarda la configuración
4. Al crear un recordatorio, activa la opción "✉️ Enviar por correo" y escribe tu email

## 📁 Estructura del proyecto

```
Default Project/
├── iniciar.cmd              # Inicia todo con un clic
├── backend/                 # API y base de datos
│   ├── server.js
│   ├── db.js                # Base de datos SQLite
│   ├── routes/              # Rutas de la API
│   └── services/            # Push y email senders
└── frontend/                # Interfaz de usuario
    ├── src/                 # Código React
    ├── public/              # PWA, iconos, service worker
    └── scripts/             # Utilidades
```

## 🛠️ Tecnologías

- **Frontend**: React 18 + Vite 5
- **Backend**: Node.js + Express
- **Base de datos**: SQLite
- **Notificaciones push**: Web Push + Service Worker (PWA)
- **Correos**: Nodemailer (SMTP)

## ❓ Problemas comunes

- **No recibo notificaciones en el móvil**: Debes dar permiso al navegador en el móvil y mantener el backend corriendo en tu PC
- **Los recordatorios solo funcionan cuando la PC está encendida**: El backend corre en tu PC, así que esta PC debe estar encendida para recibir las alertas
- **No funciona en redes externas**: Para usarla fuera de casa necesitas configurar un túnel o desplegarla en internet
