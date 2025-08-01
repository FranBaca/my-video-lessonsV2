import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Función para inicializar Firebase Admin
function initializeFirebaseAdmin() {
  // Verificar si ya hay apps inicializadas
  if (getApps().length > 0) {
    return;
  }

  // Validar que las variables de entorno requeridas estén presentes
  const requiredEnvVars = {
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID
  };

  // Verificar que todas las variables requeridas estén definidas
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    // En desarrollo, podemos continuar sin Firebase Admin
    if (process.env.NODE_ENV === 'development') {
      return;
    } else {
      throw new Error('Firebase Admin SDK requiere variables de entorno configuradas');
    }
  }

  // Configuración de Firebase Admin
  const serviceAccount: ServiceAccount = {
    projectId: requiredEnvVars.project_id!,
    privateKeyId: requiredEnvVars.private_key_id!,
    privateKey: requiredEnvVars.private_key?.replace(/\\n/g, '\n')!,
    clientEmail: requiredEnvVars.client_email!,
    clientId: requiredEnvVars.client_id!
  };

  try {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: requiredEnvVars.project_id!,
    });
  } catch (error) {
    throw error;
  }
}

// Inicializar Firebase Admin
initializeFirebaseAdmin();

// Exportar las instancias de Auth y Firestore
let adminAuth: any = null;
let adminDb: any = null;

try {
  adminAuth = getAuth();
  adminDb = getFirestore();
} catch (error) {
  // Firebase Admin not available
}

export { adminAuth, adminDb };
export default adminAuth; 