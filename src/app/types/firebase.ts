export interface Professor {
  id?: string;
  name: string;
  email: string;
  profileImage?: string;
  bio?: string;
  isActive: boolean;
  googleDriveAccount: string;
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

export interface Video {
  id?: string;
  name: string;
  description?: string;
  googleDriveId: string;
  googleDriveFolderId: string;
  thumbnailUrl?: string;
  duration?: number;
  category: string;
  tags?: string[];
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt?: Date;
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