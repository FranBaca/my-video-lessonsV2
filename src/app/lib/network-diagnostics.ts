// Network Diagnostics Utility
export class NetworkDiagnostics {
  
  // Verificar conectividad básica
  static async checkConnectivity(): Promise<{ success: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      });
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        return { success: true, latency };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  // Verificar velocidad de conexión aproximada
  static async checkConnectionSpeed(): Promise<{ speed: 'slow' | 'medium' | 'fast'; latency: number }> {
    const result = await this.checkConnectivity();
    
    if (!result.success || !result.latency) {
      return { speed: 'slow', latency: 0 };
    }
    
    if (result.latency < 100) {
      return { speed: 'fast', latency: result.latency };
    } else if (result.latency < 500) {
      return { speed: 'medium', latency: result.latency };
    } else {
      return { speed: 'slow', latency: result.latency };
    }
  }

  // Obtener recomendaciones basadas en la velocidad de conexión
  static getSpeedRecommendations(speed: 'slow' | 'medium' | 'fast'): string[] {
    switch (speed) {
      case 'slow':
        return [
          'Tu conexión es lenta. Considera:',
          '• Comprimir el video a una resolución menor',
          '• Usar una conexión más estable',
          '• Subir archivos más pequeños',
          '• Intentar en horarios de menor tráfico'
        ];
      case 'medium':
        return [
          'Tu conexión es moderada. Recomendaciones:',
          '• Evita subir archivos muy grandes',
          '• Cierra otras aplicaciones que usen internet',
          '• Usa una conexión cableada si es posible'
        ];
      case 'fast':
        return [
          'Tu conexión es buena. Puedes subir archivos grandes.',
          '• Aún así, considera comprimir videos muy pesados',
          '• Mantén una conexión estable durante el upload'
        ];
    }
  }

  // Verificar si el navegador soporta las características necesarias
  static checkBrowserSupport(): { supported: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Verificar XMLHttpRequest
    if (typeof XMLHttpRequest === 'undefined') {
      issues.push('XMLHttpRequest no está disponible');
    }
    
    // Verificar File API
    if (typeof File === 'undefined') {
      issues.push('File API no está disponible');
    }
    
    // Verificar FormData
    if (typeof FormData === 'undefined') {
      issues.push('FormData no está disponible');
    }
    
    // Verificar fetch
    if (typeof fetch === 'undefined') {
      issues.push('Fetch API no está disponible');
    }
    
    return {
      supported: issues.length === 0,
      issues
    };
  }

  // Obtener información del navegador
  static getBrowserInfo(): { userAgent: string; platform: string; connection?: any } {
    const info: any = {
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };
    
    // Información de conexión si está disponible
    if ('connection' in navigator) {
      info.connection = {
        effectiveType: (navigator as any).connection?.effectiveType,
        downlink: (navigator as any).connection?.downlink,
        rtt: (navigator as any).connection?.rtt
      };
    }
    
    return info;
  }

  // Generar reporte completo de diagnóstico
  static async generateDiagnosticReport(): Promise<{
    timestamp: string;
    connectivity: { success: boolean; latency?: number; error?: string };
    speed: { speed: 'slow' | 'medium' | 'fast'; latency: number };
    browser: { supported: boolean; issues: string[]; info: any };
    recommendations: string[];
  }> {
    const connectivity = await this.checkConnectivity();
    const speed = await this.checkConnectionSpeed();
    const browser = this.checkBrowserSupport();
    const browserInfo = this.getBrowserInfo();
    
    const recommendations = [
      ...this.getSpeedRecommendations(speed.speed),
      ...(browser.issues.length > 0 ? ['Actualiza tu navegador a la versión más reciente'] : [])
    ];
    
    return {
      timestamp: new Date().toISOString(),
      connectivity,
      speed,
      browser: { ...browser, info: browserInfo },
      recommendations
    };
  }
} 