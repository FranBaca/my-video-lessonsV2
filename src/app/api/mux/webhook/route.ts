import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';
import { videoService } from "@/app/lib/firebase-services";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Configuración para obtener raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

// Verificar la firma del webhook de Mux
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verificando firma del webhook:', error);
    return false;
  }
}

// Función temporal para buscar video sin usar índices
async function findVideoByAssetIdDirect(assetId: string) {
  try {
    // Buscar en la ruta específica donde sabemos que está el video
    const videosQuery = query(
      collection(db, 'professors', 'test-professor', 'subjects', 'default-subject', 'videos'),
      where('assetId', '==', assetId)
    );

    const querySnapshot = await getDocs(videosQuery);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const video = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate()
    };

    return {
      video,
      professorId: 'test-professor',
      subjectId: 'default-subject',
      videoId: doc.id
    };
  } catch (error) {
    console.error('Error en búsqueda directa:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obtener el raw body para validar la firma
    const payload = await request.text();
    const signature = request.headers.get('mux-signature');
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

    console.log('🔔 Webhook recibido:', {
      hasSignature: !!signature,
      hasSecret: !!webhookSecret,
      payloadLength: payload.length
    });

    if (!signature || !webhookSecret) {
      console.error('❌ Missing webhook signature or secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar la firma del webhook
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(payload);
    console.log('✅ Webhook verificado, procesando evento:', event.type);

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
    console.error('❌ Error processing webhook:', error);
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

    // Buscar el video por muxAssetId usando el nuevo método
    let videoResult = await videoService.findByMuxAssetId(assetId);
    
    if (videoResult) {
      const { video, professorId, subjectId, videoId } = videoResult;
      
      console.log(`📝 Actualizando video ${videoId} como listo`);
      
      // Actualizar el video con información adicional del asset procesado
      await videoService.update(professorId, subjectId, videoId, {
        muxPlaybackId: playbackId,
        duration: data.duration,
        aspectRatio: data.aspect_ratio,
        status: 'ready',
        isActive: true, // Activar el video ahora que está listo
        updatedAt: new Date()
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

    // Buscar el video por muxAssetId usando el nuevo método
    let videoResult = await videoService.findByMuxAssetId(assetId);
    
    if (videoResult) {
      const { professorId, subjectId, videoId } = videoResult;
      
      console.log(`📝 Marcando video ${videoId} como fallido`);
      
      // Marcar el video como fallido
      await videoService.update(professorId, subjectId, videoId, {
        status: 'errored',
        errorMessage: errorMessage,
        isActive: false,
        updatedAt: new Date()
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

    // Buscar el video por muxAssetId usando el nuevo método
    let videoResult = await videoService.findByMuxAssetId(assetId);
    
    if (videoResult) {
      const { professorId, subjectId, videoId } = videoResult;
      
      console.log(`📝 Marcando video ${videoId} como procesando`);
      
      // Marcar que el asset fue creado y está en proceso
      await videoService.update(professorId, subjectId, videoId, {
        status: 'processing',
        updatedAt: new Date()
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
      professorId: "default-professor",
      muxAssetId: assetId,
      muxPlaybackId: assetData.playback_ids?.[0]?.id || '',
      tags: [],
      isActive: false,
      order: 0,
      createdAt: new Date(),
      status: 'processing',
      uploadConfirmed: true,
      duration: assetData.duration,
      aspectRatio: assetData.aspect_ratio,
    };

    const professorId = "default-professor";
    const subjectId = "default-subject";

    const videoId = await videoService.create(professorId, subjectId, videoData);
    
    console.log(`✅ Video por defecto creado: ${videoId}`);
    
  } catch (error) {
    console.error('❌ Error creating default video:', error);
  }
} 