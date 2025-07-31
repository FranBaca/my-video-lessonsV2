import { NextRequest, NextResponse } from "next/server";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function POST(request: NextRequest) {
  try {
    const { fileSize } = await request.json();
    
    console.log('🧪 Test Upload: Creando Direct Upload URL...');
    console.log('File size:', fileSize, 'bytes');
    
    const upload = await uploadService.createDirectUploadUrl(fileSize || 1024 * 1024);
    
    console.log('🧪 Test Upload: Direct Upload URL creada:', {
      id: upload.id,
      url: upload.url,
      timeout: upload.timeout,
      cors_origin: upload.cors_origin
    });
    
    return NextResponse.json({
      success: true,
      data: {
        uploadId: upload.id,
        uploadUrl: upload.url,
        timeout: upload.timeout,
        cors_origin: upload.cors_origin,
        test: true
      }
    });
    
  } catch (error) {
    console.error('🧪 Test Upload: Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error desconocido',
        test: true
      },
      { status: 500 }
    );
  }
} 