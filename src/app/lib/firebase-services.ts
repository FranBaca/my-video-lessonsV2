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
import { Professor, Video, Student, Subject, ApiResponse } from '../types/firebase';
import { auth } from './firebase';
import { adminDb } from './firebase-admin';

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
      throw error;
    }
  },

  async createWithId(id: string, professor: Omit<Professor, 'id'>): Promise<void> {
    try {
      const docRef = doc(db, 'professors', id);
      await setDoc(docRef, {
        ...professor,
        createdAt: Timestamp.now(),
        isActive: true
      });
    } catch (error) {
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
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', id);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  }
};

// Servicios para Materias
export const subjectService = {
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
      throw error;
    }
  },

  async delete(professorId: string, subjectId: string): Promise<void> {
    try {
      // Verificar si tiene videos
      const videos = await videoService.getBySubject(professorId, subjectId);
      if (videos.length > 0) {
        throw new Error('No se puede eliminar una materia que tiene videos');
      }

      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  },

  async checkNameExists(professorId: string, name: string, excludeId?: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'professors', professorId, 'subjects'),
        where('name', '==', name)
      );
      const querySnapshot = await getDocs(q);
      
      if (excludeId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeId);
      }
      
      return !querySnapshot.empty;
    } catch (error) {
      return false;
    }
  }
};

// Servicios para Videos
export const videoService = {
  async getByProfessor(professorId: string): Promise<Video[]> {
    try {
      // Obtener todas las materias del profesor
      const subjects = await subjectService.getByProfessor(professorId);
      const allVideos: Video[] = [];

      // Para cada materia, obtener sus videos
      for (const subject of subjects) {
        const videos = await this.getBySubject(professorId, subject.id!);
        allVideos.push(...videos);
      }

      // Ordenar todos los videos por order
      return allVideos.sort((a, b) => a.order - b.order);
    } catch (error) {
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
      throw error;
    }
  },

  async delete(professorId: string, subjectId: string, videoId: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'subjects', subjectId, 'videos', videoId);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  },

  async getByProfessorWithSubjects(professorId: string): Promise<(Video & { subject: Subject })[]> {
    try {
      const [videos, subjects] = await Promise.all([
        this.getByProfessor(professorId),
        subjectService.getByProfessor(professorId)
      ]);

      return videos.map(video => ({
        ...video,
        subject: subjects.find(s => s.id === video.subjectId)!
      }));
    } catch (error) {
      throw error;
    }
  },

  // Método simplificado para buscar por muxAssetId sin collectionGroup
  async findByMuxAssetId(muxAssetId: string): Promise<{ video: Video; professorId: string; subjectId: string; videoId: string } | null> {
    try {
      
      // Obtener todos los profesores
      const professorsSnapshot = await getDocs(collection(db, 'professors'));
      
      // Buscar en cada profesor
      for (const professorDoc of professorsSnapshot.docs) {
        const professorId = professorDoc.id;
        
        // Obtener todas las materias del profesor
        const subjectsSnapshot = await getDocs(collection(db, 'professors', professorId, 'subjects'));
        
        // Buscar en cada materia
        for (const subjectDoc of subjectsSnapshot.docs) {
          const subjectId = subjectDoc.id;
          
          // Buscar videos en esta materia
          const videosQuery = query(
            collection(db, 'professors', professorId, 'subjects', subjectId, 'videos'),
            where('muxAssetId', '==', muxAssetId)
          );
          
          const videosSnapshot = await getDocs(videosQuery);
          
          if (!videosSnapshot.empty) {
            const videoDoc = videosSnapshot.docs[0];
            const video = {
              id: videoDoc.id,
              ...videoDoc.data(),
              createdAt: videoDoc.data().createdAt?.toDate() || new Date(),
              updatedAt: videoDoc.data().updatedAt?.toDate()
            } as Video;
            
            return {
              video,
              professorId,
              subjectId,
              videoId: videoDoc.id
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  // Método de fallback usando búsqueda directa sin collectionGroup
  async findByAssetId(assetId: string): Promise<{ video: Video; professorId: string; subjectId: string; videoId: string } | null> {
    try {
      
      // Obtener todos los profesores
      const professorsSnapshot = await getDocs(collection(db, 'professors'));
      
      // Buscar en cada profesor
      for (const professorDoc of professorsSnapshot.docs) {
        const professorId = professorDoc.id;
        
        // Obtener todas las materias del profesor
        const subjectsSnapshot = await getDocs(collection(db, 'professors', professorId, 'subjects'));
        
        // Buscar en cada materia
        for (const subjectDoc of subjectsSnapshot.docs) {
          const subjectId = subjectDoc.id;
          
          // Buscar videos en esta materia
          const videosQuery = query(
            collection(db, 'professors', professorId, 'subjects', subjectId, 'videos'),
            where('assetId', '==', assetId),
            where('isActive', '==', true)
          );
          
          const videosSnapshot = await getDocs(videosQuery);
          
          if (!videosSnapshot.empty) {
            const videoDoc = videosSnapshot.docs[0];
            const video = {
              id: videoDoc.id,
              ...videoDoc.data(),
              createdAt: videoDoc.data().createdAt?.toDate() || new Date(),
              updatedAt: videoDoc.data().updatedAt?.toDate()
            } as Video;
            
            return {
              video,
              professorId,
              subjectId,
              videoId: videoDoc.id
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  // Método para buscar videos por muxPlaybackId
  async findByMuxPlaybackId(muxPlaybackId: string): Promise<{ video: Video; professorId: string; subjectId: string; videoId: string } | null> {
    try {
      if (!adminDb) {
        return null;
      }

      // Usar Firebase Admin SDK para búsqueda global
      const videosQuery = adminDb.collectionGroup('videos').where('muxPlaybackId', '==', muxPlaybackId);
      const querySnapshot = await videosQuery.get();
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0]; // Tomar el primer resultado
      const video = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as Video;
      
      // Extraer professorId y subjectId del path del documento
      const pathParts = doc.ref.path.split('/');
      const professorId = pathParts[1];
      const subjectId = pathParts[3];
      const videoId = pathParts[5];
      
      return {
        video,
        professorId,
        subjectId,
        videoId
      };
    } catch (error) {
      return null;
    }
  },

  // Método para obtener videos con estado específico
  async getByStatus(status: Video['status']): Promise<Video[]> {
    try {
      if (!adminDb) {
        return [];
      }

      const videosQuery = adminDb.collectionGroup('videos').where('status', '==', status);
      const querySnapshot = await videosQuery.get();
      
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Video[];
    } catch (error) {
      return [];
    }
  },

  // Método para obtener videos que han estado procesando por más de X minutos
  async getProcessingVideosOlderThan(minutes: number): Promise<Video[]> {
    try {
      if (!adminDb) {
        return [];
      }

      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      const videosQuery = adminDb.collectionGroup('videos')
        .where('status', '==', 'processing')
        .where('createdAt', '<', cutoffTime);
      
      const querySnapshot = await videosQuery.get();
      
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Video[];
    } catch (error) {
      return [];
    }
  },

  // Método para obtener videos de una materia específica desde todos los profesores
  async getBySubjectAcrossProfessors(subjectId: string): Promise<Video[]> {
    try {
      if (!adminDb) {
        return [];
      }

      // Buscar videos en la colección group que pertenezcan a la materia específica
      const videosQuery = adminDb.collectionGroup('videos')
        .where('subjectId', '==', subjectId)
        .where('status', '==', 'ready'); // Solo videos listos para reproducir
      
      const querySnapshot = await videosQuery.get();
      
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate()
      })) as Video[];
    } catch (error) {
      return [];
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
        allowedSubjects: student.allowedSubjects || [],
        }
      );
      return docRef.id;
    } catch (error) {
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
      throw error;
    }
  },

  async delete(professorId: string, studentId: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'students', studentId);
      await deleteDoc(docRef);
    } catch (error) {
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
      throw error;
    }
  }
}; 

// Servicio público para verificación de estudiantes (sin autenticación de profesor)
export const publicStudentService = {
  async getByCode(code: string): Promise<Student | null> {
    try {
      
      // Primero intentar con collectionGroup
      try {
        const q = query(
          collectionGroup(db, 'students'),
          where('code', '==', code)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          // Extraer el professorId del path del documento
          const pathParts = doc.ref.path.split('/');
          const professorId = pathParts[1]; // professors/{professorId}/students/{studentId}
          
          const studentData = {
            id: `${professorId}/${doc.id}`, // Incluir professorId en el id para referencia
            ...doc.data(),
            enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
            lastAccess: doc.data().lastAccess?.toDate()
          } as Student;
          
          return studentData;
        }
      } catch (collectionGroupError) {
        // Fallback to alternative search
      }
      
      // Si collectionGroup falla, buscar en múltiples profesores conocidos
      const knownProfessors = [
        'gaTy3CzW2AdQ8yGP74kUty1cc3K2',
        // Add other professor IDs here if needed
      ];
      
      for (const professorId of knownProfessors) {
        try {
          const q = query(
            collection(db, 'professors', professorId, 'students'),
            where('code', '==', code)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            
            const studentData = {
              id: `${professorId}/${doc.id}`,
              ...doc.data(),
              enrolledAt: doc.data().enrolledAt?.toDate() || new Date(),
              lastAccess: doc.data().lastAccess?.toDate()
            } as Student;
            
            return studentData;
          }
        } catch (error) {
          continue; // Try next professor
        }
      }
      
      return null;
    } catch (error) {
      return null; // Retornar null en lugar de throw para evitar errores
    }
  },

  async updateDeviceId(studentId: string, professorId: string, deviceId: string): Promise<void> {
    try {
      const docRef = doc(db, 'professors', professorId, 'students', studentId);
      await updateDoc(docRef, {
        deviceId,
        lastAccess: Timestamp.now()
      });
    } catch (error) {
      throw error;
    }
  }
}; 

// Servicios para Profesores (Admin SDK - para API routes)
export const professorServiceAdmin = {
  async getById(id: string): Promise<Professor | null> {
    try {
      if (!adminDb) {
        throw new Error("Firebase Admin SDK no está disponible");
      }
      
      const docRef = adminDb.collection('professors').doc(id);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date()
        } as Professor;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
};

// Servicios para Materias (Admin SDK - para API routes)
export const subjectServiceAdmin = {
  async getById(professorId: string, subjectId: string): Promise<Subject | null> {
    try {
      if (!adminDb) {
        throw new Error("Firebase Admin SDK no está disponible");
      }
      
      const docRef = adminDb.collection('professors').doc(professorId).collection('subjects').doc(subjectId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          createdAt: data?.createdAt?.toDate() || new Date(),
          updatedAt: data?.updatedAt?.toDate()
        } as Subject;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}; 