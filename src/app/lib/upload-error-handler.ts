export class UploadErrorHandler {
  static handleNetworkError(error: any): string {
    // Errores específicos de red
    if (error.code === 'ENOBUFS') {
      return 'Error de red: El archivo es demasiado grande para la conexión actual. Intenta con una conexión más estable.';
    }
    if (error.code === 'ECONNRESET' || error.message?.includes('ERR_CONNECTION_RESET')) {
      return 'Conexión interrumpida durante el upload. Esto puede deberse a inestabilidad de red o timeout. Intenta nuevamente con una conexión más estable.';
    }
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return 'Timeout de conexión. El upload está tardando más de lo esperado. Verifica tu conexión a internet.';
    }
    if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
      return 'Error de red durante el upload. Verifica tu conexión e intenta nuevamente.';
    }
    if (error.message?.includes('aborted') || error.message?.includes('canceled')) {
      return 'Upload cancelado. Intenta nuevamente.';
    }
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      return 'El upload tardó demasiado tiempo. Esto puede deberse a un archivo muy grande o conexión lenta. Intenta con un archivo más pequeño o una conexión más estable.';
    }
    return 'Error de red durante el upload. Intenta nuevamente.';
  }

  static handleMuxError(error: any): string {
    // Errores específicos de Mux
    if (error.message?.includes('Asset failed to process')) {
      return 'Error en el procesamiento del video. Verifica que el archivo sea válido y no esté corrupto.';
    }
    if (error.message?.includes('Timeout')) {
      return 'El video está tardando más de lo esperado en procesarse. Intenta nuevamente en unos minutos.';
    }
    if (error.message?.includes('Direct Upload URL')) {
      return 'Error al crear la URL de upload. Intenta nuevamente.';
    }
    if (error.message?.includes('playback_id')) {
      return 'Error al obtener el ID de reproducción. El video puede no haberse procesado correctamente.';
    }
    if (error.message?.includes('Deprecated') || error.message?.includes('mp4_support')) {
      return 'Error de configuración de Mux. El sistema ha sido actualizado para resolver este problema.';
    }
    if (error.message?.includes('invalid_parameters')) {
      return 'Error de configuración en Mux. Contacta al administrador para verificar la configuración.';
    }
    if (error.message?.includes('Upload ID but this API requires a Asset ID')) {
      return 'Error interno del sistema: Conflicto de IDs en Mux. El sistema ha sido corregido.';
    }
    return 'Error en el procesamiento del video. Contacta al administrador.';
  }

  static handleValidationError(error: any): string {
    if (error.message?.includes('tamaño máximo')) {
      return 'El archivo excede el tamaño máximo de 2GB. Comprime el video o usa un archivo más pequeño.';
    }
    if (error.message?.includes('tipo de archivo')) {
      return 'Solo se permiten archivos de video. Verifica que el archivo sea un video válido.';
    }
    if (error.message?.includes('campos requeridos')) {
      return 'Por favor completa todos los campos requeridos (nombre y materia).';
    }
    if (error.message?.includes('materia no encontrada')) {
      return 'La materia seleccionada no existe. Selecciona una materia válida.';
    }
    return 'Error de validación. Verifica los datos ingresados.';
  }

  static handleAuthError(error: any): string {
    if (error.message?.includes('autenticación')) {
      return 'Error de autenticación. Por favor, inicia sesión nuevamente.';
    }
    if (error.message?.includes('profesor no encontrado')) {
      return 'No tienes permisos para subir videos. Contacta al administrador.';
    }
    return 'Error de autenticación. Verifica tu sesión.';
  }

  static handleGenericError(error: any): string {
    // Intentar clasificar el error
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return this.handleNetworkError(error);
    }
    if (error.message?.includes('Mux') || error.message?.includes('asset') || error.message?.includes('upload')) {
      return this.handleMuxError(error);
    }
    if (error.message?.includes('validación') || error.message?.includes('tamaño') || error.message?.includes('tipo')) {
      return this.handleValidationError(error);
    }
    if (error.message?.includes('auth') || error.message?.includes('profesor')) {
      return this.handleAuthError(error);
    }
    
    return 'Error inesperado. Intenta nuevamente o contacta al administrador.';
  }

  // Función principal para manejar cualquier error
  static handleError(error: any): string {
    try {
      return this.handleGenericError(error);
    } catch (fallbackError) {
      return 'Error inesperado. Intenta nuevamente.';
    }
  }

  // Función para obtener sugerencias de solución
  static getSuggestions(error: any): string[] {
    const suggestions: string[] = [];
    
    if (error.message?.includes('ENOBUFS') || error.message?.includes('grande')) {
      suggestions.push('Comprime el video a una resolución menor');
      suggestions.push('Usa una conexión de internet más estable');
      suggestions.push('Intenta subir el video en horarios de menor tráfico');
    }
    
    if (error.message?.includes('ERR_CONNECTION_RESET') || error.message?.includes('ECONNRESET')) {
      suggestions.push('Verifica tu conexión a internet');
      suggestions.push('Intenta con una conexión más estable (WiFi o cable)');
      suggestions.push('Cierra otras aplicaciones que usen internet');
      suggestions.push('Intenta nuevamente en unos minutos');
      suggestions.push('Considera usar un archivo más pequeño');
    }
    
    if (error.message?.includes('timeout') || error.message?.includes('lento')) {
      suggestions.push('Verifica tu conexión a internet');
      suggestions.push('Intenta nuevamente en unos minutos');
      suggestions.push('Considera usar un archivo más pequeño');
    }
    
    if (error.message?.includes('formato') || error.message?.includes('tipo')) {
      suggestions.push('Asegúrate de que el archivo sea un video válido');
      suggestions.push('Formatos soportados: MP4, WebM, MOV, AVI');
      suggestions.push('Verifica que el archivo no esté corrupto');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Intenta nuevamente en unos minutos');
      suggestions.push('Contacta al administrador si el problema persiste');
    }
    
    return suggestions;
  }
} 