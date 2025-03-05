# My Video Lessons

Una aplicación Next.js para gestionar y visualizar clases en video almacenadas en Google Drive, con acceso mediante código único de estudiante.

## Características

- Autenticación con código único por estudiante
- Validación de dispositivo para prevenir acceso desde múltiples dispositivos
- Visualización de videos por asignatura (Anatomía e Histología)
- Acceso diferenciado según el tipo de código (solo Anatomía, solo Histología, o ambas)
- Interfaz intuitiva con sidebar de navegación
- Reproductor de video integrado
- Diseño responsive para todos los dispositivos
- **No requiere base de datos externa** - Funciona completamente con Vercel

## Requisitos Previos

- Node.js 18.14.2 o superior
- Cuenta de Google y acceso a Google Cloud Console
- Carpetas en Google Drive con los videos de las clases

## Configuración

1. Clona el repositorio:

   ```bash
   git clone <repository-url>
   cd my-video-lessons
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Configura las credenciales de Google:

   - Ve a [Google Cloud Console](https://console.cloud.google.com)
   - Crea un nuevo proyecto
   - Habilita la API de Google Drive
   - Crea credenciales OAuth 2.0
   - Configura la URI de redirección como `https://tu-dominio.vercel.app/api/auth/callback` (o `http://localhost:3000/api/auth/callback` para desarrollo)
   - Descarga el archivo de credenciales

4. Configura las variables de entorno:

   - Crea un archivo `.env.local` en la raíz del proyecto para desarrollo local
   - Añade las siguientes variables:
     ```
     GOOGLE_CLIENT_ID=your_client_id
     GOOGLE_CLIENT_SECRET=your_client_secret
     GOOGLE_DRIVE_FOLDER_MATH=your_anatomia_folder_id
     GOOGLE_DRIVE_FOLDER_SCIENCE=your_histologia_folder_id
     NEXTAUTH_URL=http://localhost:3000
     NEXTAUTH_SECRET=your_secret
     COOKIE_NAME=video_lessons_session
     COOKIE_PASSWORD=your_cookie_password
     ```

5. Configura los códigos de estudiantes:
   - Edita el archivo `src/app/data/students.json` para añadir los códigos únicos de los estudiantes autorizados

## Desarrollo

1. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

2. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura de Carpetas en Google Drive

Organiza tus videos en carpetas separadas por asignatura:

```
Google Drive/
├── Anatomía/
│   ├── Clase1.mp4
│   ├── Clase2.mp4
└── Histología/
    ├── Clase1.mp4
    └── Clase2.mp4
```

## Flujo de Trabajo

1. El estudiante ingresa su código único en la pantalla de login
2. El sistema valida el código y asocia el dispositivo al estudiante
3. Se muestra una pantalla de bienvenida personalizada según el tipo de acceso
4. Se muestran las carpetas de Anatomía y/o Histología según el tipo de acceso
5. El estudiante selecciona una asignatura y luego una clase
6. El video se reproduce en el reproductor integrado

## Tipos de Códigos

La aplicación soporta tres tipos de códigos:

1. **Códigos para Anatomía**: Dan acceso solo a los videos de Anatomía
2. **Códigos para Histología**: Dan acceso solo a los videos de Histología
3. **Códigos Completos**: Dan acceso a los videos de ambas materias

## Despliegue en Vercel

1. Crea una cuenta en [Vercel](https://vercel.com) si aún no tienes una

2. Prepara el proyecto para despliegue:

   ```bash
   npm run prepare-deploy
   ```

3. Despliega desde la línea de comandos (opcional):

   ```bash
   vercel
   ```

4. Alternativa: Conecta tu repositorio de GitHub con Vercel:

   - Sube tu código a GitHub
   - En Vercel, haz clic en "New Project"
   - Importa tu repositorio
   - Configura el proyecto:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: npm run build
     - Output Directory: .next

5. Configura las variables de entorno en Vercel:

   - En la configuración del proyecto, ve a "Environment Variables"
   - Añade todas las variables de entorno mencionadas anteriormente
   - Asegúrate de actualizar `NEXTAUTH_URL` con la URL de tu aplicación desplegada

6. Despliega la aplicación:
   - Vercel desplegará automáticamente tu aplicación
   - Cada vez que hagas push a la rama principal, se desplegará una nueva versión

## Cómo funciona sin base de datos

Esta aplicación está diseñada para funcionar sin necesidad de una base de datos externa:

1. **En desarrollo local**:

   - Utiliza archivos JSON para almacenar información de estudiantes y códigos utilizados
   - Permite probar todas las funcionalidades en un entorno local

2. **En producción (Vercel)**:
   - Utiliza cookies HTTP para almacenar la información de sesión y validación
   - Cada código de estudiante se asocia con un dispositivo específico mediante cookies
   - No requiere configuración de base de datos externa

### Limitaciones

- Las cookies tienen un tiempo de vida limitado (30 días por defecto)
- Si un usuario borra sus cookies, podrá volver a usar su código en ese dispositivo
- No hay persistencia entre diferentes despliegues de la aplicación

## Licencia

MIT
