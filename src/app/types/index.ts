export interface Video {
  id: string;
  name: string;
  link: string;
  thumbnailLink?: string;
  createdTime: string;
}

export interface Subject {
  id: string;
  name: string;
  videos: Video[];
}

export interface Student {
  code: string;
  name: string;
  authorized: boolean;
  deviceId?: string;
  isUsed?: boolean;
  subjects?: string[];
}

export interface User {
  id: string;
  deviceId: string;
  accessToken?: string;
  refreshToken?: string;
  studentCode?: string;
  subjects?: string[];
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  url?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  student?: Student;
  isDeviceUsed?: boolean;
}
