import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  setDoc,
  collectionGroup
} from 'firebase/firestore';
import { db } from './firebase';
import { Professor, Video, Student, ApiResponse } from '../types/firebase';
import { auth } from './firebase';

// Servicios para Profesores
export const professorService = {
  async getAll(): Promise<Professor[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'professors'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Professor[];
    } catch (error) {
      console.error('Error getting professors:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Professor | null> {
    try {
      const docRef = doc(db, 'professors', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { 
          id: docSnap.id, 
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date()
        } as Professor;
      }
      return null;
    } catch (error) {
      console.error('Error getting professor:', error);
      throw error;
    }
  },

  async create(professor: Omit<Professor, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'professors'), {
        ...professor,
        createdAt: Timestamp.now(),
        isActive: true
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating professor:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<Professor>): Promise<void> {
    try {
      const docRef = doc(db, 'professors', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating professor:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting professor:', error);
      throw error;
    }
  }
};

// Servicios para Videos
export const videoService = {
  async getByProfessor(professorId: string): Promise<Video[]> {
    try {
      const q = query(
        collection(db, 'professors', professorId, 'videos'),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const videos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Video[];
      
      // Ordenar en memoria en lugar de en la consulta
      return videos.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error('Error getting videos:', error);
      throw error;
    }
  },

  async getById(professorId: string, videoId: string): Promise<Video | null> {
    try {
      const docRef = doc(db, 'professors', professorId, 'videos', videoId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { 
          id: docSnap.id, 
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate()
        } as Video;
      }
      return null;
    } catch (error) {
      console.error('Error getting video:', error);
      throw error;
    }
  },

  async create(professorId: string, video: Omit<Video, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'professors', professorId, 'videos'),
        {
          ...video,
          createdAt: Timestamp.now(),
          isActive: true
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating video:', error);
      throw error;
    }
  },

  async update(professorId: string, videoId: string, data: Partial<Video>): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'videos', videoId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  },

  async delete(professorId: string, videoId: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'videos', videoId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }
};

// Servicios para Estudiantes
export const studentService = {
  async getByCode(code: string): Promise<Student | null> {
    try {
      // Versión que busca solo en el profesor actual para evitar problemas de permisos
      // Esto funciona sin necesidad de collectionGroup
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }

      const q = query(
        collection(db, 'professors', currentUser.uid, 'students'),
        where('code', '==', code)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { 
          id: doc.id, 
          ...doc.data(),
          enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
          lastAccess: doc.data().lastAccess?.toDate()
        } as Student;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting student by code:', error);
      throw error;
    }
  },

  async getByProfessor(professorId: string): Promise<Student[]> {
    try {
      const querySnapshot = await getDocs(
        collection(db, 'professors', professorId, 'students')
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
        lastAccess: doc.data().lastAccess?.toDate()
      })) as Student[];
    } catch (error) {
      console.error('Error getting students:', error);
      throw error;
    }
  },

  async create(professorId: string, student: Omit<Student, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'professors', professorId, 'students'),
        {
          ...student,
          enrolledAt: Timestamp.now(),
          authorized: true,
          allowedVideos: student.allowedVideos || []
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating student:', error);
      throw error;
    }
  },

  async createWithGeneratedCode(professorId: string, studentData: Omit<Student, 'id' | 'code'>): Promise<{ id: string; code: string }> {
    try {
      const code = await this.generateStudentCode(professorId);
      const studentId = await this.create(professorId, {
        ...studentData,
        code
      });
      return { id: studentId, code };
    } catch (error) {
      console.error('Error creating student with generated code:', error);
      throw error;
    }
  },

  async generateStudentCode(professorId: string): Promise<string> {
    const prefix = 'STU';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const baseCode = `${prefix}${timestamp}${random}`;
    
    try {
      // Verificar que el código no exista
      const existingStudent = await this.getByCode(baseCode);
      if (!existingStudent) {
        return baseCode;
      }
      
      // Si existe, agregar un número adicional
      let counter = 1;
      let newCode = baseCode;
      while (existingStudent) {
        newCode = `${baseCode}${counter}`;
        const checkStudent = await this.getByCode(newCode);
        if (!checkStudent) {
          return newCode;
        }
        counter++;
        if (counter > 10) break; // Evitar bucle infinito
      }
      
      return newCode;
    } catch (error) {
      // Si hay error en la verificación, usar el código generado
      return baseCode;
    }
  },

  async update(professorId: string, studentId: string, data: Partial<Student>): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'students', studentId);
      await updateDoc(docRef, {
        ...data,
        lastAccess: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  async delete(professorId: string, studentId: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'students', studentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  async updateAllowedVideos(professorId: string, studentId: string, videoIds: string[]): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'students', studentId);
      await updateDoc(docRef, {
        allowedVideos: videoIds,
        lastAccess: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating student allowed videos:', error);
      throw error;
    }
  }
}; 