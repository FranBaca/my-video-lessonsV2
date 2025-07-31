import { NextRequest, NextResponse } from "next/server";
import { videoService } from "@/app/lib/firebase-services";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function POST(request: NextRequest) {
  try {
    const { minutes = 30 } = await request.json();

    console.log(`🔍 Verificando videos procesando por más de ${minutes} minutos...`);

    // Obtener videos que han estado procesando por más de X minutos
    const processingVideos = await videoService.getProcessingVideosOlderThan(minutes);
    
    if (processingVideos.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No hay videos procesando por más de ${minutes} minutos`,
        checkedCount: 0,
        updatedCount: 0
      });
    }

    console.log(`📊 Encontrados ${processingVideos.length} videos para verificar`);

    let updatedCount = 0;
    const results = [];

    for (const video of processingVideos) {
      try {
        console.log(`🔍 Verificando video ${video.id} (asset: ${video.muxAssetId})`);
        
        // Verificar estado del asset en Mux
        const assetInfo = await uploadService.getAssetInfo(video.muxAssetId);
        
        if (assetInfo.status === 'ready') {
          // Asset está listo, actualizar video
          await videoService.update(
            video.professorId, 
            video.subjectId, 
            video.id!, 
            {
              status: 'ready',
              muxPlaybackId: assetInfo.playback_ids?.[0]?.id || '',
              duration: assetInfo.duration,
              aspectRatio: assetInfo.aspect_ratio,
              isActive: true,
              updatedAt: new Date()
            }
          );
          
          console.log(`✅ Video ${video.id} actualizado como listo`);
          updatedCount++;
          results.push({
            videoId: video.id,
            status: 'ready',
            message: 'Video actualizado como listo'
          });
          
        } else if (assetInfo.status === 'errored') {
          // Asset falló, marcar como error
          await videoService.update(
            video.professorId, 
            video.subjectId, 
            video.id!, 
            {
              status: 'errored',
              errorMessage: assetInfo.errors?.message || 'Error desconocido',
              isActive: false,
              updatedAt: new Date()
            }
          );
          
          console.log(`❌ Video ${video.id} marcado como error`);
          updatedCount++;
          results.push({
            videoId: video.id,
            status: 'errored',
            message: 'Video marcado como error'
          });
          
        } else {
          // Asset aún procesando
          console.log(`⏳ Video ${video.id} aún procesando (${assetInfo.status})`);
          results.push({
            videoId: video.id,
            status: 'still_processing',
            message: `Asset aún procesando: ${assetInfo.status}`
          });
        }
        
      } catch (error) {
        console.error(`❌ Error verificando video ${video.id}:`, error);
        results.push({
          videoId: video.id,
          status: 'error',
          message: `Error verificando: ${error instanceof Error ? error.message : 'Error desconocido'}`
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Verificación completada`,
      checkedCount: processingVideos.length,
      updatedCount,
      results
    });

  } catch (error) {
    console.error('❌ Error en verificación de videos:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 