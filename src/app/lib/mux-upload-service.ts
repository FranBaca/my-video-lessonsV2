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
      console.log(`Creando Direct Upload URL para archivo de ${(fileSize / (1024 * 1024)).toFixed(2)}MB`);
      
      const upload = await this.muxClient.video.uploads.create({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
          // Basic assets don't support mp4_support setting
        },
        // Configuración para archivos grandes
        timeout: 3600, // 1 hora
        // Configuración adicional para evitar problemas de CORS
        test: false, // Asegurar que no es un upload de prueba
      });

      console.log(`Direct Upload URL creada exitosamente: ${upload.id}`);
      return upload;
    } catch (error) {
      console.error('Error creando Direct Upload URL:', error);
      
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
    console.log(`Esperando a que el asset del upload ${uploadId} esté listo...`);
    
    let attempts = 0;
    const startTime = Date.now();
    
    while (attempts < maxAttempts) {
      try {
        // Primero obtener el upload para verificar su estado
        const upload = await this.muxClient.video.uploads.retrieve(uploadId);
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Upload ${uploadId} - Estado: ${upload.status} (intento ${attempts + 1}/${maxAttempts}, ${elapsedSeconds}s transcurridos)`);
        
        if (upload.status === 'errored') {
          throw new Error(`Upload failed: ${(upload as any).error?.message || 'Error desconocido'}`);
        }
        
        if (upload.status === 'asset_created' && upload.asset_id) {
          // Ahora obtener el asset usando el asset_id del upload
          const asset = await this.muxClient.video.assets.retrieve(upload.asset_id);
          console.log(`Asset ${upload.asset_id} - Estado: ${asset.status}`);
          
          if (asset.status === 'ready') {
            const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Asset ${upload.asset_id} listo después de ${elapsedTime}s`);
            return asset;
          } else if (asset.status === 'errored') {
            const errorMessage = (asset as any).errors?.message || 'Error desconocido';
            throw new Error(`Asset failed to process: ${errorMessage}`);
          } else if (asset.status === 'preparing') {
            console.log(`🔄 Asset ${upload.asset_id} aún preparándose...`);
          }
        } else if (upload.status === 'waiting') {
          console.log(`🔄 Upload ${uploadId} aún esperando...`);
        } else if (upload.status === 'asset_created') {
          console.log(`📦 Upload ${uploadId} - Asset creado, esperando procesamiento...`);
        }
        
        // Esperar menos tiempo para checks más frecuentes
        const baseWaitTime = fastMode ? 200 : 500;
        const maxWaitTime = fastMode ? 2000 : 5000;
        const waitTime = Math.min(baseWaitTime * Math.pow(1.1, attempts), maxWaitTime);
        console.log(`⏳ Esperando ${waitTime}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts++;
      } catch (error) {
        console.error(`❌ Error verificando estado del upload ${uploadId} (intento ${attempts + 1}):`, error);
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
      console.error(`Error obteniendo información del asset ${assetId}:`, error);
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
      console.error(`Error obteniendo estado del upload ${uploadId}:`, error);
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
      console.error('Error obteniendo estadísticas de assets:', error);
      throw new Error(`Error obteniendo estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
} 