import { NextResponse } from "next/server";
import crypto from 'crypto';
import { videoService } from "@/app/lib/firebase-services";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

// Configuración para obtener raw body en App Router
export const dynamic = 'force-dynamic';

// Verificar la firma del webhook de Mux
function verifyMuxSignature(payload: string, header: string, secret: string): boolean {
  try {
    console.log('🔐 Verificando firma del webhook:', {
      payloadLength: payload.length,
      headerLength: header.length,
      secretLength: secret.length,
      header: header.substring(0, 20) + '...',
      secret: secret.substring(0, 4) + '...' + secret.substring(secret.length - 4)
    });

    const [timestampPart, signaturePart] = header.split(',');
    const timestamp = timestampPart?.split('=')[1];
    const signature = signaturePart?.split('=')[1];

    if (!timestamp || !signature) {
      console.error('❌ Formato de header inválido:', header);
      return false;
    }

    const prehash = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(prehash)
      .digest('hex');

    console.log('🔐 Firma esperada:', expectedSignature.substring(0, 10) + '...');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    console.log('🔐 Resultado de verificación:', isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA');

    if (!isValid) {
      console.error('🔍 Debug de firma inválida:', {
        receivedSignature: signature,
        expectedSignature: expectedSignature,
        payloadPreview: payload.substring(0, 100) + '...',
        secretPreview: secret.substring(0, 4) + '...' + secret.substring(secret.length - 4),
        timestamp: timestamp,
        prehash: prehash.substring(0, 50) + '...'
      });
    }
    return isValid;
  } catch (error) {
    console.error('❌ Error verificando firma del webhook:', error);
    console.error('🔍 Detalles del error:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      header: header?.substring(0, 20) + '...',
      payloadLength: payload?.length,
      secretLength: secret?.length
    });
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // ✅ Capturar el raw body sin consumirlo
    const rawBody = await req.arrayBuffer();
    const textBody = Buffer.from(rawBody).toString('utf-8');
    const signatureHeader = req.headers.get('mux-signature') || '';
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET || '';

    console.log('🔔 Webhook recibido:', {
      hasSignature: !!signatureHeader,
      hasSecret: !!webhookSecret,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent'),
      origin: req.headers.get('origin')
    });

    // 🔍 Debug: Verificar el header de firma
    console.log('🔐 Mux-Signature header recibido:', signatureHeader);

    if (!signatureHeader) {
      console.error('❌ No se recibió header mux-signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!webhookSecret) {
      console.error('❌ No se configuró MUX_WEBHOOK_SECRET');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    console.log('📦 Raw body capturado:', {
      payloadLength: textBody.length,
      payloadPreview: textBody.substring(0, 100) + '...'
    });

    // ✅ Verificar la firma usando el raw body
    const isValid = verifyMuxSignature(textBody, signatureHeader, webhookSecret);
    if (!isValid) {
      console.error('❌ Firma inválida del webhook');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // ✅ Ahora sí parsear el JSON
    const event = JSON.parse(textBody);
    
    // Según la documentación de Mux:
    // - event.object contiene información básica del asset (id, type)
    // - event.data contiene información detallada (playback_ids, duration, etc.)
    // Para el assetId, buscar primero en object, luego en data
    const assetId = event.object?.id || event.data?.id;
    const assetData = event.data || event.object; // Usar data si existe, sino object
    
    console.log('✅ Webhook verificado, procesando evento:', {
      type: event.type,
      assetId: assetId,
      hasObject: !!event.object,
      hasData: !!event.data,
      timestamp: new Date().toISOString()
    });

    // Procesar el evento según su tipo
    switch (event.type) {
      case 'video.asset.ready':
        console.log('🎬 Procesando evento video.asset.ready para asset:', assetId);
        await handleAssetReady(event, assetData);
        break;
      case 'video.asset.errored':
        console.log('💥 Procesando evento video.asset.errored para asset:', assetId);
        await handleAssetErrored(event, assetData);
        break;
      case 'video.upload.asset_created':
        console.log('📦 Procesando evento video.upload.asset_created para asset:', assetId);
        await handleUploadAssetCreated(event, assetData);
        break;
      default:
        console.log('⚠️ Evento no manejado:', event.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleAssetReady(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const playbackId = assetData.playback_ids?.[0]?.id;
    
    console.log('🎬 Asset listo:', {
      assetId: assetId,
      playbackId: playbackId,
      duration: assetData.duration,
      aspectRatio: assetData.aspect_ratio
    });

    // Buscar el video en Firebase por muxAssetId
    const result = await videoService.findByMuxAssetId(assetId);
    
    if (result) {
      const { video, professorId, subjectId, videoId } = result;
      console.log('✅ Video encontrado, actualizando estado a ready');
      
      await videoService.update(professorId, subjectId, videoId, {
        muxPlaybackId: playbackId,
        duration: assetData.duration,
        aspectRatio: assetData.aspect_ratio,
        status: 'ready',
        isActive: true,
        updatedAt: new Date()
      });
      
      console.log('✅ Video actualizado exitosamente');
    } else {
      console.log('⚠️ Video no encontrado, creando video por defecto');
      await createDefaultVideo(assetId, assetData);
    }
  } catch (error) {
    console.error('❌ Error en handleAssetReady:', error);
  }
}

async function handleAssetErrored(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const errorMessage = assetData.errors?.message || 'Unknown error';
    
    console.log('💥 Asset con error:', {
      assetId: assetId,
      error: errorMessage
    });

    // Buscar el video en Firebase por muxAssetId
    const result = await videoService.findByMuxAssetId(assetId);
    
    if (result) {
      const { video, professorId, subjectId, videoId } = result;
      console.log('✅ Video encontrado, actualizando estado a errored');
      
      await videoService.update(professorId, subjectId, videoId, {
        status: 'errored',
        isActive: false,
        updatedAt: new Date()
      });
      
      console.log('✅ Video marcado como errored');
    } else {
      console.log('⚠️ Video no encontrado para marcar como errored');
    }
  } catch (error) {
    console.error('❌ Error en handleAssetErrored:', error);
  }
}

async function handleUploadAssetCreated(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const uploadId = event.object?.id; // El uploadId está en event.object.id
    
    console.log('📦 Upload Asset Creado:', {
      assetId: assetId,
      uploadId: uploadId
    });

    // Buscar el video por uploadId (que es como se guardó originalmente)
    const result = await videoService.findByMuxAssetId(uploadId);
    
    if (result) {
      const { video, professorId, subjectId, videoId } = result;
      console.log('✅ Video encontrado por uploadId, actualizando con assetId');
      
      // Actualizar el video con el assetId correcto
      await videoService.update(professorId, subjectId, videoId, {
        muxAssetId: assetId, // Cambiar uploadId por assetId
        status: 'processing',
        updatedAt: new Date()
      });
      
      console.log('✅ Video actualizado con assetId correcto');
    } else {
      console.log('⚠️ Video no encontrado por uploadId, creando video por defecto');
      await createDefaultVideo(assetId, assetData);
    }
  } catch (error) {
    console.error('❌ Error en handleUploadAssetCreated:', error);
  }
}

async function handleAssetCreated(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const uploadId = assetData.upload_id;
    
    console.log('📦 Asset creado:', {
      assetId: assetId,
      uploadId: uploadId
    });

    // Buscar el video en Firebase por muxAssetId
    const result = await videoService.findByMuxAssetId(assetId);
    
    if (!result) {
      console.log('⚠️ Video no encontrado, creando video por defecto');
      await createDefaultVideo(assetId, assetData);
    } else {
      console.log('✅ Video ya existe, no se necesita crear');
    }
  } catch (error) {
    console.error('❌ Error en handleAssetCreated:', error);
  }
}

async function createDefaultVideo(assetId: string, assetData: any) {
  try {
    console.log('📝 Creando video por defecto para asset:', assetId);
    
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
      status: 'processing' as const,
      uploadConfirmed: true,
      duration: assetData.duration,
      aspectRatio: assetData.aspect_ratio,
    };

    // Buscar en todos los profesores y materias
    const professorsSnapshot = await getDocs(collection(db, 'professors'));
    for (const professorDoc of professorsSnapshot.docs) {
      const professorId = professorDoc.id;
      const subjectsSnapshot = await getDocs(collection(db, 'professors', professorId, 'subjects'));
      for (const subjectDoc of subjectsSnapshot.docs) {
        const subjectId = subjectDoc.id;
        const videosQuery = query(
          collection(db, 'professors', professorId, 'subjects', subjectId, 'videos'),
          where('muxAssetId', '==', assetId)
        );
        const videosSnapshot = await getDocs(videosQuery);
        if (!videosSnapshot.empty) {
          console.log('✅ Video encontrado por assetId, actualizando');
          const videoDoc = videosSnapshot.docs[0];
          await videoService.update(professorId, subjectId, videoDoc.id, {
            muxPlaybackId: assetData.playback_ids?.[0]?.id || '',
            duration: assetData.duration,
            aspectRatio: assetData.aspect_ratio,
            status: 'ready',
            isActive: true,
            updatedAt: new Date()
          });
          return;
        }
      }
    }

    console.log('⚠️ No se encontró video para actualizar');
  } catch (error) {
    console.error('❌ Error creando video por defecto:', error);
  }
} 