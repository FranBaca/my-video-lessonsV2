export interface Professor {
  id?: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  settings?: {
    allowMultipleDevices: boolean;
    customBranding?: {
      primaryColor?: string;
      logoUrl?: string;
      customDomain?: string;
    };
  };
}

export interface Subject {
  id?: string;
  name: string;
  description: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Video {
  id?: string;
  name: string;
  description?: string;
  subjectId: string;  // Referencia a la materia
  professorId: string; // Referencia al profesor
  
  // Campos de Mux
  muxAssetId: string;    // Mux Asset ID
  muxPlaybackId: string; // Mux Playback ID
  
  // Estado del procesamiento
  status: 'processing' | 'ready' | 'errored' | 'upload_failed' | 'no_confirm';
  uploadConfirmed: boolean;
  
  // Metadata del video
  duration?: number;      // Duración en segundos
  aspectRatio?: string;   // Relación de aspecto
  thumbnailUrl?: string;  // URL del thumbnail
  fileSize?: number;      // Tamaño del archivo original
  mimeType?: string;      // Tipo de archivo original
  
  // Campos adicionales
  tags?: string[];
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt?: Date;
  
  // Campos de error (opcional)
  errorMessage?: string;
}

export interface Student {
  id?: string;
  code: string;
  name: string;
  email?: string;
  authorized: boolean;
  enrolledAt: Date;
  lastAccess?: Date;
  deviceId?: string;
  allowedVideos: string[];
  allowedSubjects?: string[];  // Nuevo campo para materias permitidas
}

export interface FirebaseError {
  code: string;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: FirebaseError;
} 