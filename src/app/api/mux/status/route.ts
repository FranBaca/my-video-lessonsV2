import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { videoService } from "@/app/lib/firebase-services";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);



    // Obtener estadísticas de videos del profesor
    const allVideos = await videoService.getByProfessor(professorId);
    
    const videoStats = {
      total: allVideos.length,
      ready: allVideos.filter(v => v.status === 'ready').length,
      processing: allVideos.filter(v => v.status === 'processing').length,
      errored: allVideos.filter(v => v.status === 'errored').length,
      upload_failed: allVideos.filter(v => v.status === 'upload_failed').length,
      no_confirm: allVideos.filter(v => v.status === 'no_confirm').length,
    };

    // Obtener estadísticas de Mux (si está disponible)
    let muxStats = null;
    try {
      muxStats = await uploadService.getAssetsStats();
    } catch (error) {
      console.warn('⚠️ No se pudieron obtener estadísticas de Mux:', error);
    }

    // Obtener videos que han estado procesando por más de 30 minutos
    const staleProcessingVideos = await videoService.getProcessingVideosOlderThan(30);

    // Información del sistema
    const systemInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      muxConfigured: !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET),
      webhookConfigured: !!process.env.MUX_WEBHOOK_SECRET,
      firebaseAdminConfigured: !!(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL),
    };

    return NextResponse.json({
      success: true,
      data: {
        professorId,
        videoStats,
        muxStats,
        staleProcessingVideos: staleProcessingVideos.length,
        systemInfo
      },
      message: "Estadísticas obtenidas exitosamente"
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
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