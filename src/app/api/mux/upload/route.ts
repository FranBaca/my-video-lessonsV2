import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { adminDb } from "@/app/lib/firebase-admin";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);

    // Verificar que el profesor existe usando Admin SDK
    const professorDoc = await adminDb.collection('professors').doc(professorId).get();
    if (!professorDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Profesor no encontrado" },
        { status: 404 }
      );
    }

    // Obtener metadata del JSON (NO el archivo)
    const body = await request.json();
    const { name, description, subjectId, tags, size, type } = body;

    // Validaciones
    if (!name || !subjectId || !size || !type) {
      return NextResponse.json(
        { success: false, message: "Nombre, materia, tamaño y tipo son requeridos" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!type.startsWith("video/")) {
      return NextResponse.json(
        { success: false, message: "Solo se permiten archivos de video" },
        { status: 400 }
      );
    }

    // Validar tamaño (2GB máximo)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (size > maxSize) {
      return NextResponse.json(
        { success: false, message: "El archivo excede el tamaño máximo de 2GB" },
        { status: 400 }
      );
    }

    // Verificar que la materia existe usando Admin SDK
    const subjectDoc = await adminDb.collection('professors').doc(professorId).collection('subjects').doc(subjectId).get();
    if (!subjectDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Materia no encontrada" },
        { status: 404 }
      );
    }

    // 1. Crear Direct Upload URL optimizada
    const upload = await uploadService.createDirectUploadUrl(size);

    // 2. Devolver la URL de upload para que el cliente suba directamente
    return NextResponse.json({
      success: true,
      data: {
        uploadId: upload.id,
        uploadUrl: upload.url,
        timeout: upload.timeout,
      },
      message: "Direct Upload URL creada exitosamente",
    });

  } catch (error) {
    console.error("Error creando Direct Upload URL:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 