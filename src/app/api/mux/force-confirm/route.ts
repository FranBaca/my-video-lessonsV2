import { NextRequest, NextResponse } from "next/server";
import { videoService } from "@/app/lib/firebase-services";
import { Video as VideoType } from "@/app/types/firebase";

export async function POST(request: NextRequest) {
  try {
    const { assetId, metadata } = await request.json();

    if (!assetId || !metadata) {
      return NextResponse.json(
        { success: false, message: "Asset ID y metadata son requeridos" },
        { status: 400 }
      );
    }

    console.log('🔧 Forzando confirmación del video:', assetId);

    // Crear el video en la base de datos directamente
    const videoData: Omit<VideoType, "id"> = {
      name: metadata.name || "Video Subido",
      description: metadata.description || "Video subido automáticamente",
      subjectId: metadata.subjectId || "default-subject",
      professorId: metadata.professorId || "default-professor",
      muxAssetId: assetId,
      muxPlaybackId: '', // Se actualizará cuando esté listo
      tags: metadata.tags || [],
      isActive: false, // Temporalmente inactivo hasta que esté listo
      order: 0,
      createdAt: new Date(),
      fileSize: metadata.fileSize || 0,
      mimeType: metadata.mimeType || "video/mp4",
      status: 'processing',
      uploadConfirmed: true,
    };

    // Usar un professorId por defecto para pruebas
    const professorId = metadata.professorId || "default-professor";
    const subjectId = metadata.subjectId || "default-subject";

    const videoId = await videoService.create(professorId, subjectId, videoData);

    console.log('✅ Video creado exitosamente:', videoId);

    return NextResponse.json({
      success: true,
      message: "Video creado exitosamente en la base de datos",
      data: {
        id: videoId,
        name: videoData.name,
        description: videoData.description,
        subjectId: videoData.subjectId,
        muxAssetId: videoData.muxAssetId,
        muxPlaybackId: videoData.muxPlaybackId,
        tags: videoData.tags,
        createdAt: videoData.createdAt,
        status: videoData.status,
      }
    });

  } catch (error) {
    console.error('❌ Error forzando confirmación:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error interno del servidor", 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 