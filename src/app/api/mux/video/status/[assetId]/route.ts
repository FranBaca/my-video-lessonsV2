import { NextRequest, NextResponse } from "next/server";
import { MuxUploadService } from "@/app/lib/mux-upload-service";
import { videoService } from "@/app/lib/firebase-services";

const uploadService = new MuxUploadService();

export async function GET(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const assetId = params.assetId;

    if (!assetId) {
      return NextResponse.json(
        { success: false, message: "Asset ID es requerido" },
        { status: 400 }
      );
    }

    console.log(`🔍 Verificando estado del asset ${assetId}...`);

    // Verificar estado en Mux
    const assetInfo = await uploadService.getAssetInfo(assetId);
    console.log(`📊 Asset ${assetId} - Estado en Mux: ${assetInfo.status}`);

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
        errors: assetInfo.errors
      }
    });

  } catch (error) {
    console.error("Error verificando estado del asset:", error);
    
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 