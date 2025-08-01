import { useState } from 'react';

interface UploadProgress {
  phase: 'preparing' | 'uploading' | 'processing';
  progress: number;
  message: string;
}

interface UploadMetadata {
  name: string;
  description: string;
  subjectId: string;
  tags: string[];
  fileSize: number;
  mimeType: string;
}

interface UploadResult {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  playbackId: string;
  assetId: string;
  tags: string[];
  createdAt: Date;
  duration?: number;
  aspectRatio?: string;
  status: 'ready' | 'processing';
}

export const useMuxUpload = () => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    phase: 'preparing',
    progress: 0,
    message: 'Preparando upload...'
  });

  const [isUploading, setIsUploading] = useState(false);

  const uploadToMux = async (
    file: File, 
    metadata: UploadMetadata, 
    authToken: string
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setUploadProgress({
      phase: 'preparing',
      progress: 0,
      message: 'Preparando video para subir...'
    });

    try {
      // 1. Obtener Direct Upload URL
      const formData = new FormData();
      formData.append('video', file);
      formData.append('name', metadata.name);
      formData.append('description', metadata.description);
      formData.append('subjectId', metadata.subjectId);
      formData.append('tags', JSON.stringify(metadata.tags));

      const response = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear Direct Upload URL');
      }

      const result = await response.json();
      const { uploadUrl, uploadId } = result.data;

      // 2. Subir archivo directamente a Mux
      
      setUploadProgress({
        phase: 'uploading',
        progress: 0,
        message: 'Subiendo video...'
      });

      await uploadFileToMux(uploadUrl, file);

      // 3. Confirmar upload y guardar en base de datos
              setUploadProgress({
          phase: 'processing',
          progress: 95,
          message: 'Finalizando subida...'
        });

      const confirmResponse = await fetch('/api/mux/upload/confirm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          metadata
        })
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Error al confirmar upload');
      }

      const confirmResult = await confirmResponse.json();
      
      // Verificar si el video está listo o aún procesándose
      if (confirmResult.status === 'processing') {
        setUploadProgress({
          phase: 'processing',
          progress: 100,
          message: '¡Upload completado! El video se está procesando...'
        });

        // El video aún se está procesando, devolver resultado con estado 'processing'
        return {
          id: confirmResult.data.id,
          name: metadata.name,
          description: metadata.description,
          subjectId: metadata.subjectId,
          playbackId: '', // Se actualizará cuando esté listo
          assetId: confirmResult.data.muxAssetId || '',
          tags: metadata.tags,
          createdAt: new Date(),
          status: 'processing'
        };
      }

      // Si el video está listo, usar los datos del resultado
      if (confirmResult.success && confirmResult.data) {
        setUploadProgress({
          phase: 'processing',
          progress: 100,
          message: '¡Upload completado!'
        });

        return {
          id: confirmResult.data.id,
          name: confirmResult.data.name,
          description: confirmResult.data.description,
          subjectId: confirmResult.data.subjectId,
          playbackId: confirmResult.data.muxPlaybackId,
          assetId: confirmResult.data.muxAssetId,
          tags: confirmResult.data.tags,
          createdAt: new Date(confirmResult.data.createdAt),
          duration: confirmResult.data.duration,
          aspectRatio: confirmResult.data.aspectRatio,
          status: 'ready'
        };
      }

      // Si no hay datos en el resultado, crear un objeto con la información disponible
      return {
        id: `temp_${Date.now()}`,
        name: metadata.name,
        description: metadata.description,
        subjectId: metadata.subjectId,
        playbackId: '',
        assetId: '',
        tags: metadata.tags,
        createdAt: new Date(),
        status: 'processing'
      };

    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Función para subir archivo directamente a Mux con retry logic
  const uploadFileToMux = async (uploadUrl: string, file: File, maxRetries = 3): Promise<void> => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        attempts++;
        
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          // Configurar progreso
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 90; // 90% para upload, 10% para procesamiento
              const fileSizeMB = file.size / (1024 * 1024);
              const uploadedMB = (event.loaded / (1024 * 1024)).toFixed(2);
              const totalMB = (event.total / (1024 * 1024)).toFixed(2);
              
              setUploadProgress(prev => ({
                ...prev,
                progress: Math.round(progress),
                message: `${uploadedMB}MB de ${totalMB}MB`
              }));
            }
          });

          // Configurar eventos
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(prev => ({
                ...prev,
                progress: 90,
                message: 'Video subido exitosamente'
              }));
              resolve();
            } else {
              let errorMessage = `Upload failed with status: ${xhr.status}`;
              if (xhr.status === 405) {
                errorMessage = 'Method Not Allowed - Error en la configuración de Mux. Contacta al administrador.';
              } else if (xhr.status === 403) {
                errorMessage = 'Forbidden - La URL de upload ha expirado o no es válida.';
              } else if (xhr.status === 413) {
                errorMessage = 'File too large - El archivo excede el tamaño máximo permitido.';
              }
              
              reject(new Error(errorMessage));
            }
          });

          xhr.addEventListener('error', (event) => {
            reject(new Error('Error de red durante el upload'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelado'));
          });

          xhr.addEventListener('timeout', () => {
            const fileSizeMB = file.size / (1024 * 1024);
            reject(new Error(`Timeout de upload - El archivo de ${fileSizeMB.toFixed(2)}MB es muy grande para tu conexión. Intenta con un archivo más pequeño o mejora tu conexión a internet.`));
          });

          // Configurar request con timeout extendido
          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          // No agregar headers adicionales que puedan causar problemas con CORS
          
          // Timeout dinámico basado en el tamaño del archivo
          const fileSizeMB = file.size / (1024 * 1024);
          let timeout = 600000; // 10 minutos por defecto
          
          if (fileSizeMB > 500) {
            timeout = 1800000; // 30 minutos para archivos > 500MB
          } else if (fileSizeMB > 100) {
            timeout = 1200000; // 20 minutos para archivos > 100MB
          }
          
          xhr.timeout = timeout;
          
          // Enviar archivo
          xhr.send(file);
        });
        
        // Si llegamos aquí, el upload fue exitoso
        return;
        
      } catch (error) {
        // Si es el último intento, lanzar el error
        if (attempts >= maxRetries) {
          throw error;
        }
        
        // Esperar antes del siguiente intento (backoff exponencial)
        const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
        
        setUploadProgress(prev => ({
          ...prev,
          message: `Reintentando...`
        }));
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  const resetProgress = () => {
    setUploadProgress({
      phase: 'preparing',
      progress: 0,
      message: 'Preparando upload...'
    });
    setIsUploading(false);
  };

  return {
    uploadProgress,
    isUploading,
    uploadToMux,
    resetProgress
  };
}; 