# Instrucciones para configurar correctamente el proyecto

## Error de redirect_uri_mismatch

Has encontrado un error de `redirect_uri_mismatch` que indica que la URL de redirección configurada en tu aplicación no coincide con las URLs autorizadas en la consola de Google Cloud.

## Pasos para solucionar el problema

### 1. Configurar Google Cloud Console

1. Ve a la [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a "APIs y servicios" > "Credenciales"
4. Edita tu cliente OAuth
5. En la sección "Orígenes de JavaScript autorizados", añade:
   ```
   https://my-video-lessons.vercel.app
   ```
6. En la sección "URIs de redirección autorizados", añade:
   ```
   https://my-video-lessons.vercel.app/api/auth/callback
   ```
7. Guarda los cambios

### 2. Configurar variables de entorno en Vercel

1. Ve al panel de control de Vercel
2. Selecciona tu proyecto
3. Ve a "Settings" > "Environment Variables"
4. Asegúrate de que las siguientes variables estén configuradas:
   - `GOOGLE_CLIENT_ID`: Tu ID de cliente de Google OAuth
   - `GOOGLE_CLIENT_SECRET`: Tu secreto de cliente de Google OAuth
   - `NEXTAUTH_URL`: `https://my-video-lessons.vercel.app`
   - `GOOGLE_DRIVE_FOLDER_MATH`: ID de la carpeta de Anatomía
   - `GOOGLE_DRIVE_FOLDER_SCIENCE`: ID de la carpeta de Histología
   - `GOOGLE_DRIVE_FOLDER_PHYSIOLOGY`: ID de la carpeta de Fisiología
   - `NEXTAUTH_SECRET`: Tu secreto para NextAuth
   - `COOKIE_PASSWORD`: Tu contraseña para cookies

### 3. Redespliega tu aplicación

Después de realizar estos cambios, redespliega tu aplicación en Vercel para que los cambios surtan efecto.

## Verificación

Una vez realizados estos cambios, intenta iniciar sesión nuevamente. El error de `redirect_uri_mismatch` debería desaparecer.

## Notas adicionales

- Asegúrate de que la URL de redirección sea exactamente la misma en ambos lugares (Google Cloud Console y tu código).
- Si sigues teniendo problemas, verifica los logs de la aplicación para obtener más información sobre el error.
- Recuerda que los cambios en la consola de Google Cloud pueden tardar unos minutos en propagarse.
