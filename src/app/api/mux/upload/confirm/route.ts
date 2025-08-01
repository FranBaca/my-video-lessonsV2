import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { professorService, videoService, subjectService } from "@/app/lib/firebase-services";
import { Video as VideoType } from "@/app/types/firebase";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);

    const { uploadId, metadata } = await request.json();

    if (!uploadId || !metadata) {
      return NextResponse.json(
        { success: false, message: "Upload ID y metadata son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que la materia existe
    const subject = await subjectService.getById(professorId, metadata.subjectId);
    if (!subject) {
      return NextResponse.json(
        { success: false, message: "Materia no encontrada" },
        { status: 404 }
      );
    }

    console.log(`🔄 Confirmando upload ${uploadId} para archivo de ${(metadata.fileSize / (1024 * 1024)).toFixed(2)}MB`);

    // Verificar el estado del upload una sola vez con timeout extendido
    console.log(`Verificando estado del upload ${uploadId}...`);
    
    // Timeout más largo para archivos grandes
    const fileSizeMB = metadata.fileSize / (1024 * 1024);
    const timeoutMs = fileSizeMB > 100 ? 30000 : 10000; // 30s para archivos > 100MB
    
    console.log(`⏱️ Timeout configurado: ${timeoutMs/1000}s para archivo de ${fileSizeMB.toFixed(2)}MB`);
    
    const uploadStatus = await Promise.race([
      uploadService.getUploadStatus(uploadId),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout verificando upload')), timeoutMs)
      )
    ]) as any;
    
    console.log("Estado del upload:", uploadStatus);

    if (uploadStatus.status === 'errored') {
      return NextResponse.json(
        { success: false, message: "El upload falló. Intenta nuevamente." },
        { status: 500 }
      );
    }

    // Si el upload aún está esperando, guardar con estado 'processing'
    if (uploadStatus.status === 'waiting') {
      console.log("Upload aún en proceso, guardando video con estado 'processing'");
      return await saveVideoToDatabaseProcessing(professorId, metadata, null);
    }

    // Si el asset fue creado, verificar si está listo
    if (uploadStatus.status === 'asset_created' && uploadStatus.asset_id) {
      try {
        console.log(`📊 Verificando asset ${uploadStatus.asset_id}...`);
        
        // Verificar el estado del asset con timeout extendido
        const assetInfo = await Promise.race([
          uploadService.getAssetInfo(uploadStatus.asset_id),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout verificando asset')), timeoutMs)
          )
        ]) as any;
        
        console.log(`📊 Asset ${uploadStatus.asset_id} - Estado: ${assetInfo.status}`);
        
        if (assetInfo.status === 'ready') {
          // Asset está listo, proceder a guardar como 'ready'
          console.log("Asset listo, guardando video como 'ready'");
          return await saveVideoToDatabase(professorId, metadata, assetInfo);
        } else if (assetInfo.status === 'errored') {
          return NextResponse.json(
            { success: false, message: "Error en el procesamiento del video. Verifica que el archivo sea válido." },
            { status: 500 }
          );
        } else {
          // Asset aún se está procesando, guardar con estado 'processing'
          console.log("Asset creado pero aún procesándose, guardando video con estado 'processing'");
          return await saveVideoToDatabaseProcessing(professorId, metadata, uploadStatus.asset_id);
        }
      } catch (error) {
        console.error("Error verificando asset:", error);
        
        // Si es timeout, guardar como processing y confiar en webhook
        if (error instanceof Error && error.message.includes('Timeout')) {
          console.log("⏰ Timeout verificando asset, guardando como 'processing' y confiando en webhook");
          return await saveVideoToDatabaseProcessing(professorId, metadata, uploadStatus.asset_id);
        }
        
        // Si no podemos verificar el asset, guardar con estado 'processing'
        return await saveVideoToDatabaseProcessing(professorId, metadata, uploadStatus.asset_id);
      }
    }

    // Si llegamos aquí, el upload no está en un estado esperado
    return NextResponse.json(
      { success: false, message: "Estado del upload no reconocido. Intenta nuevamente." },
      { status: 500 }
    );

  } catch (error) {
    console.error("Error confirmando upload:", error);
    
    // Manejar errores específicos
    if (error instanceof Error) {
      if (error.message.includes('Timeout')) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Timeout verificando upload. El archivo puede estar procesándose. Los webhooks te notificarán cuando esté listo.",
            status: 'processing'
          },
          { status: 408 }
        );
      }
      if (error.message.includes('Asset failed to process')) {
        return NextResponse.json(
          { success: false, message: "Error en el procesamiento del video. Verifica que el archivo sea válido." },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

async function saveVideoToDatabase(professorId: string, metadata: any, assetInfo: any) {
  const { playback_ids, id: assetId } = assetInfo;
  const playback_id = playback_ids?.[0]?.id;

  // Verificar que Mux devolvió los datos necesarios
  if (!playback_id || !assetId) {
    console.error("Mux no devolvió playback_id o assetId:", assetInfo);
    return NextResponse.json(
      { success: false, message: "Error: Mux no devolvió los datos necesarios" },
      { status: 500 }
    );
  }

  // Guardar en Firestore con metadata completa
  const videoData: Omit<VideoType, "id"> = {
    name: metadata.name,
    description: metadata.description,
    subjectId: metadata.subjectId,
    professorId: professorId,
    muxAssetId: assetId,
    muxPlaybackId: playback_id,
    tags: metadata.tags,
    isActive: true,
    order: 0,
    createdAt: new Date(),
    fileSize: metadata.fileSize,
    mimeType: metadata.mimeType,
    status: 'ready',
    uploadConfirmed: true,
    duration: assetInfo.duration,
    aspectRatio: assetInfo.aspect_ratio,
  };

  const videoId = await videoService.create(professorId, metadata.subjectId, videoData);

  return NextResponse.json({
    success: true,
    data: {
      id: videoId,
      name: metadata.name,
      description: metadata.description,
      subjectId: metadata.subjectId,
      muxAssetId: assetId,
      muxPlaybackId: playback_id,
      tags: metadata.tags,
      createdAt: new Date(),
      // Información adicional del asset
      duration: assetInfo.duration,
      aspectRatio: assetInfo.aspect_ratio,
    },
    message: "Video procesado y guardado exitosamente",
  });
}

async function saveVideoToDatabaseProcessing(professorId: string, metadata: any, assetId: string | null) {
  // Guardar en Firestore con estado 'processing'
  const videoData: Omit<VideoType, "id"> = {
    name: metadata.name,
    description: metadata.description,
    subjectId: metadata.subjectId,
    professorId: professorId,
    muxAssetId: assetId || '', // Puede ser null si aún no se creó el asset
    muxPlaybackId: '', // Se actualizará cuando esté listo
    tags: metadata.tags,
    isActive: false, // Temporalmente inactivo hasta que esté listo
    order: 0,
    createdAt: new Date(),
    fileSize: metadata.fileSize,
    mimeType: metadata.mimeType,
    status: 'processing',
    uploadConfirmed: true,
  };

  const videoId = await videoService.create(professorId, metadata.subjectId, videoData);

  return NextResponse.json({
    success: true,
    status: 'processing',
    data: {
      id: videoId,
      name: metadata.name,
      description: metadata.description,
      subjectId: metadata.subjectId,
      muxAssetId: assetId || '',
      muxPlaybackId: '',
      tags: metadata.tags,
      createdAt: new Date(),
    },
    message: "Video guardado y procesándose. Los webhooks te notificarán cuando esté listo.",
  });
} 