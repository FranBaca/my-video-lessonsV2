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
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Professor, Video, Student, ApiResponse } from '../types/firebase';

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
        where('isActive', '==', true),
        orderBy('order')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Video[];
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
      // Buscar en todos los profesores
      const professors = await professorService.getAll();
      
      for (const professor of professors) {
        if (!professor.id) continue;
        
        const q = query(
          collection(db, 'professors', professor.id, 'students'),
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


}; 