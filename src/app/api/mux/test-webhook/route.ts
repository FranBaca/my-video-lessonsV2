import { NextRequest, NextResponse } from "next/server";
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { assetId, eventType } = await request.json();

    if (!assetId) {
      return NextResponse.json(
        { success: false, message: "Asset ID es requerido" },
        { status: 400 }
      );
    }

    console.log('🧪 Probando webhook para asset:', assetId, 'evento:', eventType);

    // Crear un payload de prueba
    let payload;
    let eventTypeToUse = eventType || 'video.asset.ready';

    switch (eventTypeToUse) {
      case 'video.asset.ready':
        payload = {
          type: 'video.asset.ready',
          data: {
            id: assetId,
            playback_ids: [{ id: 'test-playback-id-' + Date.now() }],
            duration: 120,
            aspect_ratio: '16:9'
          }
        };
        break;
      
      case 'video.asset.errored':
        payload = {
          type: 'video.asset.errored',
          data: {
            id: assetId,
            errors: {
              message: 'Error de prueba'
            }
          }
        };
        break;
      
      case 'video.upload.asset_created':
        payload = {
          type: 'video.upload.asset_created',
          data: {
            id: assetId,
            upload_id: 'test-upload-id'
          }
        };
        break;
      
      default:
        return NextResponse.json(
          { success: false, message: "Tipo de evento no válido" },
          { status: 400 }
        );
    }

    // Crear una firma de prueba
    const testSecret = 'test-secret';
    const signature = crypto
      .createHmac('sha256', testSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Hacer la petición al webhook
    const webhookUrl = 'http://localhost:3000/api/mux/webhook';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mux-signature': signature
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    console.log('📤 Resultado del webhook:', {
      status: response.status,
      result: result
    });

    return NextResponse.json({
      success: true,
      message: "Webhook probado exitosamente",
      webhookStatus: response.status,
      webhookResult: result,
      payload: payload
    });

  } catch (error) {
    console.error('❌ Error probando webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error probando webhook", 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 