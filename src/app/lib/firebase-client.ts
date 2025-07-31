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
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Professor, Video, Student, Subject } from '../types/firebase';

// Servicios para Profesores (solo cliente)
export const professorServiceClient = {
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

  async create(professorData: Omit<Professor, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'professors'),
        {
          ...professorData,
          createdAt: Timestamp.now(),
          isActive: true
        }
      );
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
  }
};

// Servicios para Materias (solo cliente)
export const subjectServiceClient = {
  async getByProfessor(professorId: string): Promise<Subject[]> {
    try {
      const querySnapshot = await getDocs(
        collection(db, 'professors', professorId, 'subjects')
      );
      const subjects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Subject[];
      return subjects;
    } catch (error) {
      console.error('Error getting subjects:', error);
      throw error;
    }
  },

  async getById(professorId: string, subjectId: string): Promise<Subject | null> {
    try {
      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { 
          id: docSnap.id, 
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate() || new Date(),
          updatedAt: docSnap.data().updatedAt?.toDate()
        } as Subject;
      }
      return null;
    } catch (error) {
      console.error('Error getting subject:', error);
      throw error;
    }
  },

  async create(professorId: string, subject: Omit<Subject, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'professors', professorId, 'subjects'),
        {
          ...subject,
          createdAt: Timestamp.now(),
          isActive: true
        }
      );
      return docRef.id;
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  },

  async update(professorId: string, subjectId: string, data: Partial<Subject>): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating subject:', error);
      throw error;
    }
  },

  async delete(professorId: string, subjectId: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  }
};

// Servicios para Videos (solo cliente)
export const videoServiceClient = {
  async getByProfessor(professorId: string): Promise<Video[]> {
    try {
      // Obtener todas las materias del profesor
      const subjects = await subjectServiceClient.getByProfessor(professorId);
      const allVideos: Video[] = [];

      // Para cada materia, obtener sus videos
      for (const subject of subjects) {
        const videos = await this.getBySubject(professorId, subject.id!);
        allVideos.push(...videos);
      }

      // Ordenar todos los videos por order
      return allVideos.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Error getting videos:', error);
      throw error;
    }
  },

  async getBySubject(professorId: string, subjectId: string): Promise<Video[]> {
    try {
      // Consulta optimizada con índice compuesto: isActive + order
      const q = query(
        collection(db, 'professors', professorId, 'subjects', subjectId, 'videos'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Video[];
    } catch (error) {
      console.error('Error getting videos by subject:', error);
      throw error;
    }
  },

  async getById(professorId: string, subjectId: string, videoId: string): Promise<Video | null> {
    try {
      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId, 'videos', videoId);
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

  async create(professorId: string, subjectId: string, video: Omit<Video, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, 'professors', professorId, 'subjects', subjectId, 'videos'),
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

  async update(professorId: string, subjectId: string, videoId: string, data: Partial<Video>): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId, 'videos', videoId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  },

  async delete(professorId: string, subjectId: string, videoId: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId, 'videos', videoId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  },

  async getByProfessorWithSubjects(professorId: string): Promise<(Video & { subject: Subject })[]> {
    try {
      const [videos, subjects] = await Promise.all([
        this.getByProfessor(professorId),
        subjectServiceClient.getByProfessor(professorId)
      ]);

      return videos.map(video => ({
        ...video,
        subject: subjects.find(s => s.id === video.subjectId)!
      }));
    } catch (error) {
      console.error('Error getting videos with subjects:', error);
      throw error;
    }
  }
};

// Servicios para Estudiantes (solo cliente)
export const studentServiceClient = {
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
          allowedVideos: student.allowedVideos || [],
          allowedSubjects: student.allowedSubjects || []
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

  async getByCode(code: string): Promise<Student | null> {
    try {
      // Buscar en todos los profesores (esto es limitado sin Admin SDK)
      // Por ahora, retornamos null y manejamos la verificación en el servidor
      return null;
    } catch (error) {
      console.error('Error getting student by code:', error);
      return null;
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
  }
}; 