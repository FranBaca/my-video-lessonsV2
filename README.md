# My Video Lessons

Una aplicación Next.js completa para gestionar y visualizar clases en video, con sistema de autenticación diferenciado para estudiantes y profesores, integración con Mux para streaming de video, y panel de administración.

## 🚀 Características Principales

### Para Estudiantes
- **Autenticación con código único** por estudiante
- **Validación de dispositivo** para prevenir acceso desde múltiples dispositivos
- **Visualización de videos por asignatura** con interfaz intuitiva
- **Acceso diferenciado** según el tipo de código (solo Anatomía, solo Histología, o ambas)
- **Reproductor de video integrado** con HLS.js para streaming optimizado
- **Sidebar de navegación** con lista de asignaturas y videos
- **Diseño responsive** para todos los dispositivos

### Para Profesores
- **Panel de administración completo** con Firebase Authentication
- **Gestión de estudiantes** (crear, editar, listar) con **búsqueda en tiempo real**
- **Gestión de asignaturas** (crear, editar, eliminar) con **búsqueda en tiempo real**
- **Sistema de carga de videos** con integración a Mux
- **Gestión de videos** (subir, eliminar) con **búsqueda en tiempo real**
- **Monitoreo de estado de videos** (procesando, listo, error)
- **Gestión de profesores** y permisos
- **Recuperación de contraseñas** para profesores

### Tecnologías Avanzadas
- **Integración con Mux** para streaming de video profesional
- **Firebase Authentication** para profesores
- **Firebase Admin SDK** para gestión de datos
- **Fingerprinting de dispositivos** para seguridad
- **Sistema de notificaciones** en tiempo real
- **API RESTful** completa con endpoints para todas las funcionalidades

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 13, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Autenticación**: Firebase Auth
- **Base de Datos**: Firebase Firestore
- **Video Streaming**: Mux
- **Deployment**: Vercel
- **Notificaciones**: React Hot Toast

## 📋 Requisitos Previos

- Node.js 18.14.2 o superior
- Cuenta de Firebase
- Cuenta de Mux
- Cuenta de Google Cloud Console (para Google Drive)

## ⚙️ Configuración

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd my-video-lessons
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Habilita Authentication y Firestore
4. Configura los métodos de autenticación (Email/Password)
5. Descarga la configuración de Firebase

### 4. Configurar Mux

1. Ve a [Mux Dashboard](https://dashboard.mux.com)
2. Crea una cuenta y obtén tus credenciales
3. Configura webhooks para notificaciones de estado de video

### 5. Configurar Google Drive (Opcional)

Si usas Google Drive para almacenar videos:
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Habilita la API de Google Drive
3. Crea credenciales OAuth 2.0

### 6. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# Firebase Admin (para el servidor)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email

# Mux Configuration
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_webhook_secret

# App Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
COOKIE_NAME=video_lessons_session
COOKIE_PASSWORD=your_cookie_password
```

## 🚀 Desarrollo

### Iniciar servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Ejecutar linter
```

## 🏗️ Estructura del Proyecto

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── admin/             # Endpoints de administración
│   │   ├── auth/              # Autenticación
│   │   ├── mux/               # Integración con Mux
│   │   ├── student/           # Endpoints para estudiantes
│   │   └── health/            # Health checks
│   ├── components/             # Componentes React
│   │   ├── ProfessorDashboard.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── VideoUpload.tsx
│   │   └── ...
│   ├── config/                 # Configuraciones
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # Utilidades y servicios
│   ├── providers/              # Context providers
│   └── types/                  # TypeScript types
```

## 👥 Flujos de Usuario

### Para Estudiantes

1. **Acceso**: El estudiante ingresa su código único
2. **Validación**: Sistema valida el código y asocia el dispositivo
3. **Navegación**: Se muestra la lista de asignaturas disponibles
4. **Reproducción**: Selecciona una clase y reproduce el video
5. **Seguimiento**: Sistema registra el progreso y acceso

### Para Profesores

1. **Login**: Acceso con email y contraseña de Firebase
2. **Dashboard**: Panel principal con estadísticas y acciones rápidas
3. **Gestión de Contenido**: 
   - Crear/editar asignaturas
   - Subir videos con procesamiento automático
   - Monitorear estado de procesamiento
4. **Gestión de Usuarios**: Administrar estudiantes y otros profesores

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/verify` - Verificar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/check-student-session` - Verificar sesión de estudiante

### Estudiantes
- `GET /api/student/videos` - Obtener videos disponibles
- `GET /api/student/video/[id]` - Obtener video específico

### Administración
- `POST /api/admin/create-student` - Crear estudiante
- `GET /api/admin/students` - Listar estudiantes
- `PUT /api/admin/students/[studentId]` - Actualizar estudiante
- `POST /api/admin/subjects` - Crear asignatura
- `GET /api/admin/professors` - Listar profesores
- `POST /api/admin/forgot-password` - Recuperar contraseña

### Mux (Video Processing)
- `POST /api/mux/upload` - Subir video a Mux
- `POST /api/mux/confirm` - Confirmar procesamiento
- `GET /api/mux/status/[assetId]` - Estado del procesamiento
- `POST /api/mux/webhook` - Webhook para notificaciones

## 🎥 Integración con Mux

La aplicación utiliza Mux para el procesamiento y streaming de videos:

1. **Subida**: Los videos se suben directamente a Mux
2. **Procesamiento**: Mux procesa automáticamente los videos
3. **Streaming**: Los videos se reproducen usando HLS.js
4. **Monitoreo**: Webhooks notifican cambios de estado

## 🔐 Seguridad

- **Fingerprinting de dispositivos** para prevenir acceso múltiple
- **Autenticación Firebase** para profesores
- **Validación de códigos únicos** para estudiantes
- **Cookies seguras** para sesiones
- **Validación de permisos** en todos los endpoints

## 🚀 Despliegue en Vercel

### 1. Preparar el proyecto

```bash
npm run build
```

### 2. Configurar en Vercel

1. Conecta tu repositorio de GitHub con Vercel
2. Configura las variables de entorno en el dashboard de Vercel
3. Asegúrate de actualizar `NEXTAUTH_URL` con tu dominio

### 3. Variables de entorno en Vercel

Configura todas las variables de entorno mencionadas anteriormente en el dashboard de Vercel.

## 📊 Monitoreo y Mantenimiento

- **Health checks** en `/api/health`
- **Logs automáticos** en Vercel
- **Notificaciones** para errores de procesamiento
- **Dashboard de administración** para monitoreo

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

MIT

## 🆘 Soporte

Para soporte técnico o preguntas sobre la implementación, contacta al equipo de desarrollo.
