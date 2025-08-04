import Mux from '@mux/mux-node';

export class MuxUploadService {
  private muxClient: Mux;

  constructor() {
    this.muxClient = new Mux({
      tokenId: process.env.MUX_TOKEN_ID!,
      tokenSecret: process.env.MUX_TOKEN_SECRET!,
    });
  }

  // Crear Direct Upload URL con configuración optimizada
  async createDirectUploadUrl(fileSize: number) {
    try {
      const upload = await this.muxClient.video.uploads.create({
        cors_origin: 'https://my-video-lessons-v2.vercel.app',
        new_asset_settings: {
          playback_policy: ['public'],
          // Basic assets don't support mp4_support setting
        },
        // Configuración para archivos grandes
        timeout: 3600, // 1 hora
        // Configuración adicional para evitar problemas de CORS
        test: false, // Asegurar que no es un upload de prueba
      });

      return upload;
    } catch (error) {
      // Manejar errores específicos de Mux
      if (error && typeof error === 'object' && 'status' in error) {
        if (error.status === 400) {
          const errorMessage = (error as any).message || '';
          
          // Detectar específicamente el error de límite de plan gratuito
          if (errorMessage.includes('Free plan is limited to 10 assets')) {
            throw new Error('Has alcanzado el límite de 10 videos del plan gratuito de Mux. Por favor, elimina algunos videos existentes o actualiza tu plan de Mux.');
          }
          
          throw new Error(`Error de configuración de Mux: ${errorMessage || 'Parámetros inválidos'}`);
        }
        if (error.status === 401) {
          throw new Error('Error de autenticación con Mux. Verifica las credenciales.');
        }
        if (error.status === 403) {
          throw new Error('Error de permisos con Mux. Verifica la configuración de la cuenta.');
        }
      }
      
      throw new Error(`Error creando Direct Upload URL: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Verificar estado del asset con reintentos optimizados
  async waitForAssetReady(uploadId: string, maxAttempts = 120, fastMode = true) {
    let attempts = 0;
    const startTime = Date.now();
    
    while (attempts < maxAttempts) {
      try {
        // Primero obtener el upload para verificar su estado
        const upload = await this.muxClient.video.uploads.retrieve(uploadId);
        
        if (upload.status === 'errored') {
          throw new Error(`Upload failed: ${(upload as any).error?.message || 'Error desconocido'}`);
        }
        
        if (upload.status === 'asset_created' && upload.asset_id) {
          // Ahora obtener el asset usando el asset_id del upload
          const asset = await this.muxClient.video.assets.retrieve(upload.asset_id);
          
          if (asset.status === 'ready') {
            return asset;
          } else if (asset.status === 'errored') {
            const errorMessage = (asset as any).errors?.message || 'Error desconocido';
            throw new Error(`Asset failed to process: ${errorMessage}`);
          }
        }
        
        // Esperar menos tiempo para checks más frecuentes
        const baseWaitTime = fastMode ? 200 : 500;
        const maxWaitTime = fastMode ? 2000 : 5000;
        const waitTime = Math.min(baseWaitTime * Math.pow(1.1, attempts), maxWaitTime);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts++;
      } catch (error) {
        attempts++;
        
        // Si es el último intento, lanzar el error
        if (attempts >= maxAttempts) {
          const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
          throw new Error(`⏰ Timeout esperando a que el asset esté listo después de ${elapsedTime}s`);
        }
        
        // Esperar menos tiempo en caso de error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    throw new Error(`⏰ Timeout esperando a que el asset esté listo después de ${elapsedTime}s`);
  }

  // Obtener información del asset
  async getAssetInfo(assetId: string) {
    try {
      const asset = await this.muxClient.video.assets.retrieve(assetId);
      return {
        id: asset.id,
        status: asset.status,
        playback_ids: asset.playback_ids,
        duration: asset.duration,
        aspect_ratio: asset.aspect_ratio,
        created_at: asset.created_at,
        errors: (asset as any).errors,
      };
    } catch (error) {
      throw new Error(`Error obteniendo información del asset: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Verificar si el upload existe y obtener su estado
  async getUploadStatus(uploadId: string) {
    try {
      const upload = await this.muxClient.video.uploads.retrieve(uploadId);
      return {
        id: upload.id,
        status: upload.status,
        asset_id: upload.asset_id,
        created_at: (upload as any).created_at,
        timeout: upload.timeout,
      };
    } catch (error) {
      throw new Error(`Error obteniendo estado del upload: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Obtener estadísticas de assets (para debugging)
  async getAssetsStats() {
    try {
      const assetsResponse = await this.muxClient.video.assets.list();
      const assets = assetsResponse.data || [];
      
      return {
        total: assets.length,
        ready: assets.filter((a: any) => a.status === 'ready').length,
        preparing: assets.filter((a: any) => a.status === 'preparing').length,
        errored: assets.filter((a: any) => a.status === 'errored').length,
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  // Eliminar asset de Mux
  async deleteAsset(assetId: string) {
    try {
      // Verificar que el asset existe antes de intentar eliminarlo
      const asset = await this.muxClient.video.assets.retrieve(assetId);
      
      if (!asset) {
        return;
      }

      // Eliminar el asset usando el método correcto
      await this.muxClient.video.assets.delete(assetId);
    } catch (error: any) {
      // Manejar errores específicos de Mux
      if (error && typeof error === 'object' && 'status' in error) {
        if (error.status === 404) {
          return; // No es un error crítico si ya no existe
        }
        if (error.status === 401) {
          throw new Error('Error de autenticación con Mux al eliminar asset');
        }
        if (error.status === 403) {
          throw new Error('Error de permisos con Mux al eliminar asset');
        }
      }
      
      throw new Error(`Error eliminando asset de Mux: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
} 