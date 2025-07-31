import { NextRequest, NextResponse } from "next/server";
import { videoService } from "@/app/lib/firebase-services";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const event = JSON.parse(payload);
    
    console.log('🧪 Webhook de prueba recibido:', event.type);

    // Procesar diferentes tipos de eventos
    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event);
        break;
      case 'video.asset.errored':
        await handleAssetErrored(event);
        break;
      case 'video.upload.asset_created':
        await handleAssetCreated(event);
        break;
      default:
        console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error processing test webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleAssetReady(event: any) {
  try {
    const { data } = event;
    const assetId = data.id;
    const playbackId = data.playback_ids?.[0]?.id;

    console.log(`🎬 Asset ${assetId} is ready with playback ID: ${playbackId}`);

    // Buscar el video por assetId
    const videoResult = await videoService.findByAssetId(assetId);
    
    if (videoResult) {
      const { video, professorId, subjectId, videoId } = videoResult;
      
      console.log(`📝 Actualizando video ${videoId} como listo`);
      
      // Actualizar el video con información adicional del asset procesado
      await videoService.update(professorId, subjectId, videoId, {
        playbackId: playbackId,
        duration: data.duration,
        aspectRatio: data.aspect_ratio,
        status: 'ready',
        isActive: true // Activar el video ahora que está listo
      });
      
      console.log(`✅ Video ${videoId} actualizado como listo`);
    } else {
      console.log(`⚠️ No se encontró video para asset ${assetId} - creando uno nuevo`);
      
      // Crear un video por defecto si no existe
      await createDefaultVideo(assetId, data);
    }
    
  } catch (error) {
    console.error('❌ Error handling asset ready event:', error);
  }
}

async function handleAssetErrored(event: any) {
  try {
    const { data } = event;
    const assetId = data.id;
    const errorMessage = data.errors?.message || 'Unknown error';

    console.error(`💥 Asset ${assetId} failed to process: ${errorMessage}`);

    // Buscar el video por assetId
    const videoResult = await videoService.findByAssetId(assetId);
    
    if (videoResult) {
      const { professorId, subjectId, videoId } = videoResult;
      
      console.log(`📝 Marcando video ${videoId} como fallido`);
      
      // Marcar el video como fallido
      await videoService.update(professorId, subjectId, videoId, {
        status: 'errored',
        errorMessage: errorMessage,
        isActive: false
      });
      
      console.log(`✅ Video ${videoId} marcado como fallido`);
    } else {
      console.log(`⚠️ No se encontró video para asset ${assetId} en error`);
    }
    
  } catch (error) {
    console.error('❌ Error handling asset errored event:', error);
  }
}

async function handleAssetCreated(event: any) {
  try {
    const { data } = event;
    const assetId = data.id;
    const uploadId = data.upload_id;

    console.log(`🔄 Asset ${assetId} created from upload ${uploadId}`);

    // Buscar el video por assetId
    const videoResult = await videoService.findByAssetId(assetId);
    
    if (videoResult) {
      const { professorId, subjectId, videoId } = videoResult;
      
      console.log(`📝 Marcando video ${videoId} como procesando`);
      
      // Marcar que el asset fue creado y está en proceso
      await videoService.update(professorId, subjectId, videoId, {
        status: 'processing'
      });
      
      console.log(`✅ Video ${videoId} marcado como procesando`);
    } else {
      console.log(`⚠️ No se encontró video para asset ${assetId} - creando uno nuevo`);
      
      // Crear un video por defecto si no existe
      await createDefaultVideo(assetId, data);
    }
    
  } catch (error) {
    console.error('❌ Error handling asset created event:', error);
  }
}

async function createDefaultVideo(assetId: string, assetData: any) {
  try {
    console.log(`🆕 Creando video por defecto para asset ${assetId}`);
    
    // Crear un video por defecto
    const videoData = {
      name: "Video Procesado",
      description: "Video procesado automáticamente por webhook",
      subjectId: "default-subject",
      playbackId: assetData.playback_ids?.[0]?.id || '',
      assetId: assetId,
      tags: [],
      isActive: false,
      order: 0,
      createdAt: new Date(),
      status: 'processing',
      duration: assetData.duration,
      aspectRatio: assetData.aspect_ratio,
    };

    const professorId = "test-professor";
    const subjectId = "default-subject";

    const videoId = await videoService.create(professorId, subjectId, videoData);
    
    console.log(`✅ Video por defecto creado: ${videoId}`);
    
  } catch (error) {
    console.error('❌ Error creating default video:', error);
  }
} 