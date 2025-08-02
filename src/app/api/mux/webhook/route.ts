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
    const [timestampPart, signaturePart] = header.split(',');
    const timestamp = timestampPart?.split('=')[1];
    const signature = signaturePart?.split('=')[1];

    if (!timestamp || !signature) {
      return false;
    }

    const prehash = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(prehash)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    return isValid;
  } catch (error) {
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

    if (!signatureHeader) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // ✅ Verificar la firma usando el raw body
    const isValid = verifyMuxSignature(textBody, signatureHeader, webhookSecret);
    if (!isValid) {
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
    
    // Procesar el evento según su tipo
    switch (event.type) {
      case 'video.asset.ready':
        await handleAssetReady(event, assetData);
        break;
      case 'video.asset.errored':
        await handleAssetErrored(event, assetData);
        break;
      case 'video.upload.asset_created':
        await handleUploadAssetCreated(event, assetData);
        break;
      default:
        // Evento no manejado
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleAssetReady(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const playbackId = assetData.playback_ids?.[0]?.id;
    
    // Buscar el video en Firebase por muxAssetId
    const result = await videoService.findByMuxAssetId(assetId);
    
    if (result) {
      const { video, professorId, subjectId, videoId } = result;
      
      await videoService.update(professorId, subjectId, videoId, {
        muxPlaybackId: playbackId,
        duration: assetData.duration,
        aspectRatio: assetData.aspect_ratio,
        status: 'ready',
        isActive: true,
        updatedAt: new Date()
      });
    } else {
      await createDefaultVideo(assetId, assetData);
    }
  } catch (error) {
    // Error handling silently for production
  }
}

async function handleAssetErrored(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const errorMessage = assetData.errors?.message || 'Unknown error';
    
    // Buscar el video en Firebase por muxAssetId
    const result = await videoService.findByMuxAssetId(assetId);
    
    if (result) {
      const { video, professorId, subjectId, videoId } = result;
      
      await videoService.update(professorId, subjectId, videoId, {
        status: 'errored',
        isActive: false,
        updatedAt: new Date()
      });
    }
  } catch (error) {
    // Error handling silently for production
  }
}

async function handleUploadAssetCreated(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const uploadId = event.object?.id; // El uploadId está en event.object.id
    
    // Buscar el video por uploadId (que es como se guardó originalmente)
    const result = await videoService.findByMuxAssetId(uploadId);
    
    if (result) {
      const { video, professorId, subjectId, videoId } = result;
      
      // Actualizar el video con el assetId correcto
      await videoService.update(professorId, subjectId, videoId, {
        muxAssetId: assetId, // Cambiar uploadId por assetId
        status: 'processing',
        updatedAt: new Date()
      });
    } else {
      await createDefaultVideo(assetId, assetData);
    }
  } catch (error) {
    // Error handling silently for production
  }
}

async function handleAssetCreated(event: any, assetData: any) {
  try {
    const assetId = assetData.id;
    const uploadId = assetData.upload_id;
    
    // Buscar el video en Firebase por muxAssetId
    const result = await videoService.findByMuxAssetId(assetId);
    
    if (!result) {
      await createDefaultVideo(assetId, assetData);
    }
  } catch (error) {
    // Error handling silently for production
  }
}

async function createDefaultVideo(assetId: string, assetData: any) {
  try {
    
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
  } catch (error) {
    // Error handling silently for production
  }
} 