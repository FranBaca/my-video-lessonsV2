import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from './firebase';
import { professorService } from './firebase-services';
import { Professor } from '../types/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface ProfessorAuthData {
  user: AuthUser;
  professor: Professor;
}

// Servicio de autenticación para profesores
export const authService = {
  // Login de profesor
  async loginProfessor(email: string, password: string): Promise<ProfessorAuthData> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Verificar que el usuario es un profesor
      const professor = await professorService.getById(user.uid);
      if (!professor) {
        throw new Error('Usuario no es un profesor registrado');
      }

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        professor
      };
    } catch (error) {
      console.error('Error en login de profesor:', error);
      throw error;
    }
  },

  // Registro de profesor (solo para administradores)
  async registerProfessor(
    email: string, 
    password: string, 
    professorData: Omit<Professor, 'id' | 'email' | 'createdAt'>
  ): Promise<ProfessorAuthData> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Crear el profesor en Firestore
      const professorId = await professorService.create({
        ...professorData,
        email: user.email!,
        isActive: true,
        createdAt: new Date()
      });

      // Obtener el profesor creado
      const professor = await professorService.getById(professorId);
      if (!professor) {
        throw new Error('Error al crear profesor');
      }

      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        },
        professor
      };
    } catch (error) {
      console.error('Error en registro de profesor:', error);
      throw error;
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  },

  // Resetear contraseña
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error al resetear contraseña:', error);
      throw error;
    }
  },

  // Obtener usuario actual
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Escuchar cambios en el estado de autenticación
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  // Verificar si el usuario es profesor
  async isProfessor(uid: string): Promise<boolean> {
    try {
      const professor = await professorService.getById(uid);
      return professor !== null;
    } catch (error) {
      console.error('Error verificando si es profesor:', error);
      return false;
    }
  }
}; 