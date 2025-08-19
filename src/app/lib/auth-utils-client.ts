// Client-side authentication utility functions (no server-side imports)

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

// Enhanced email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, message: "El email es requerido" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: "Por favor ingresa un email válido" };
  }
  
  return { isValid: true, message: "" };
};

// Enhanced password validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password.trim()) {
    return { isValid: false, message: "La contraseña es requerida" };
  }
  
  if (password.length < 6) {
    return { isValid: false, message: "La contraseña debe tener al menos 6 caracteres" };
  }
  
  return { isValid: true, message: "" };
};

// Enhanced access code validation
export const validateAccessCode = (code: string): ValidationResult => {
  if (!code.trim()) {
    return { isValid: false, message: "El código es requerido" };
  }
  
  if (code.length < 3) {
    return { isValid: false, message: "El código debe tener al menos 3 caracteres" };
  }
  
  // Allow letters, numbers, hyphens, and underscores
  const codeRegex = /^[A-Z0-9_-]+$/;
  if (!codeRegex.test(code)) {
    return { isValid: false, message: "El código solo puede contener letras, números, guiones y guiones bajos" };
  }
  
  return { isValid: true, message: "" };
};

// Firebase auth error message mapping
export const getFirebaseErrorMessage = (errorCode: string, defaultMessage: string = 'Error de autenticación'): string => {
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'No existe una cuenta con este email',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-email': 'Email inválido',
    'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta nuevamente en unos minutos',
    'auth/network-request-failed': 'Error de conexión. Verifica tu internet e intenta nuevamente',
    'auth/user-disabled': 'Tu cuenta ha sido deshabilitada. Contacta al administrador',
    'auth/operation-not-allowed': 'Operación no permitida. Contacta al administrador',
    'auth/weak-password': 'La contraseña es demasiado débil',
    'auth/email-already-in-use': 'Este email ya está registrado',
    'auth/invalid-credential': 'Credenciales inválidas',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email usando otro método de autenticación',
    'auth/requires-recent-login': 'Por seguridad, debes iniciar sesión nuevamente',
    'auth/credential-already-in-use': 'Estas credenciales ya están en uso por otra cuenta'
  };
  
  return errorMessages[errorCode] || defaultMessage;
};

// Session validation helpers
export const isSessionExpired = (lastActivity: Date, maxAgeMinutes: number = 30): boolean => {
  const now = new Date();
  const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
  return diffInMinutes > maxAgeMinutes;
};

export const formatLastActivity = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Hace un momento';
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} horas`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `Hace ${diffInDays} días`;
};

// Device ID utilities
export const generateDeviceId = (): string => {
  // Simple device ID generation - in production, consider using more sophisticated fingerprinting
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
};

export const validateDeviceId = (deviceId: string): boolean => {
  if (!deviceId || typeof deviceId !== 'string') return false;
  
  // Basic validation - device ID should be at least 10 characters and contain alphanumeric + hyphens
  const deviceIdRegex = /^[a-zA-Z0-9-]{10,}$/;
  return deviceIdRegex.test(deviceId);
};

// Rate limiting utilities
export class RateLimiter {
  private attempts: Map<string, { count: number; timestamp: number; hourlyCount: number; hourlyTimestamp: number }> = new Map();
  
  constructor(
    private maxPerMinute: number = 5,
    private maxPerHour: number = 50
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const data = this.attempts.get(identifier);
    
    if (!data || now - data.timestamp > 60 * 1000) {
      // Reset per-minute counter
      const hourlyCount = data ? data.hourlyCount : 0;
      const hourlyTimestamp = data ? data.hourlyTimestamp : now;
      
      this.attempts.set(identifier, { 
        count: 1, 
        timestamp: now,
        hourlyCount: hourlyCount + 1,
        hourlyTimestamp: hourlyTimestamp
      });
      
      // Check hourly limit
      if (now - hourlyTimestamp > 60 * 60 * 1000) {
        // Reset hourly counter
        this.attempts.set(identifier, { 
          count: 1, 
          timestamp: now,
          hourlyCount: 1,
          hourlyTimestamp: now
        });
      } else if (hourlyCount >= this.maxPerHour) {
        return false; // Hourly limit exceeded
      }
      
      return true;
    }
    
    if (data.count >= this.maxPerMinute) {
      return false; // Per-minute limit exceeded
    }
    
    data.count++;
    data.hourlyCount++;
    return true;
  }
  
  getRemainingAttempts(identifier: string): { perMinute: number; perHour: number } {
    const data = this.attempts.get(identifier);
    if (!data) {
      return { perMinute: this.maxPerMinute, perHour: this.maxPerHour };
    }
    
    const now = Date.now();
    const perMinute = Math.max(0, this.maxPerMinute - data.count);
    const perHour = Math.max(0, this.maxPerHour - data.hourlyCount);
    
    return { perMinute, perHour };
  }
  
  clear(identifier: string): void {
    this.attempts.delete(identifier);
  }
}
