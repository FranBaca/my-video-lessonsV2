import { NextRequest, NextResponse } from "next/server";
import { MuxUploadService } from "@/app/lib/mux-upload-service";
import { videoService } from "@/app/lib/firebase-services";

const uploadService = new MuxUploadService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');
    const fileSizeMB = searchParams.get('fileSizeMB');

    if (!assetId) {
      return NextResponse.json(
        { success: false, message: "Asset ID es requerido" },
        { status: 400 }
      );
    }

    console.log(`🔍 Monitoreando asset ${assetId} (${fileSizeMB}MB)`);

    // Verificar estado en Mux con timeout extendido
    const timeoutMs = fileSizeMB && parseFloat(fileSizeMB) > 100 ? 45000 : 15000;
    
    console.log(`⏱️ Timeout de monitoreo: ${timeoutMs/1000}s`);

    const assetInfo = await Promise.race([
      uploadService.getAssetInfo(assetId),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout monitoreando asset')), timeoutMs)
      )
    ]) as any;

    console.log(`📊 Asset ${assetId} - Estado: ${assetInfo.status}`);

    // Buscar video en Firebase
    const videoResult = await videoService.findByMuxAssetId(assetId);
    
    let firebaseStatus = 'no encontrado';
    let firebaseData = null;
    
    if (videoResult) {
      const { video } = videoResult;
      firebaseStatus = video.status || 'sin estado';
      firebaseData = {
        id: video.id,
        name: video.name,
        status: video.status,
        isActive: video.isActive,
        muxPlaybackId: video.muxPlaybackId,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      };
    }

    // Análisis de estado
    const analysis = {
      assetId,
      muxStatus: assetInfo.status,
      firebaseStatus,
      fileSizeMB: fileSizeMB ? parseFloat(fileSizeMB) : null,
      isLargeFile: fileSizeMB ? parseFloat(fileSizeMB) > 100 : false,
      processingTime: null,
      recommendations: []
    };

    // Agregar recomendaciones basadas en el estado
    if (assetInfo.status === 'ready' && firebaseStatus === 'processing') {
      analysis.recommendations.push('✅ Asset listo pero Firebase no actualizado - usar endpoint de fuerza');
    } else if (assetInfo.status === 'preparing' && analysis.isLargeFile) {
      analysis.recommendations.push('⏳ Archivo grande procesándose - esperar 5-15 minutos');
    } else if (assetInfo.status === 'errored') {
      analysis.recommendations.push('❌ Asset falló - revisar logs de Mux');
    } else if (firebaseStatus === 'no encontrado') {
      analysis.recommendations.push('⚠️ Video no encontrado en Firebase - verificar upload');
    }

    return NextResponse.json({
      success: true,
      data: {
        assetId,
        muxStatus: assetInfo.status,
        firebaseStatus,
        firebaseData,
        playbackIds: assetInfo.playback_ids,
        duration: assetInfo.duration,
        aspectRatio: assetInfo.aspect_ratio,
        errors: assetInfo.errors,
        analysis
      }
    });

  } catch (error) {
    console.error("Error monitoreando archivo grande:", error);
    
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 