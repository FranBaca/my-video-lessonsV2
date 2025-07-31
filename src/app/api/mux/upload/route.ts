import { NextRequest, NextResponse } from "next/server";
import { verifyProfessorAuth } from "@/app/lib/auth-utils";
import { professorService, subjectService } from "@/app/lib/firebase-services";
import { MuxUploadService } from "@/app/lib/mux-upload-service";

const uploadService = new MuxUploadService();

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const professorId = await verifyProfessorAuth(request);

    // Verificar que el profesor existe
    const professor = await professorService.getById(professorId);
    if (!professor) {
      return NextResponse.json(
        { success: false, message: "Profesor no encontrado" },
        { status: 404 }
      );
    }

    // Obtener datos del formulario
    const formData = await request.formData();
    const file = formData.get("video") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const subjectId = formData.get("subjectId") as string;
    const tags = formData.get("tags") ? JSON.parse(formData.get("tags") as string) : [];

    // Validaciones
    if (!file || !name || !subjectId) {
      return NextResponse.json(
        { success: false, message: "Archivo, nombre y materia son requeridos" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { success: false, message: "Solo se permiten archivos de video" },
        { status: 400 }
      );
    }

    // Validar tamaño (2GB máximo)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "El archivo excede el tamaño máximo de 2GB" },
        { status: 400 }
      );
    }

    // Verificar que la materia existe
    const subject = await subjectService.getById(professorId, subjectId);
    if (!subject) {
      return NextResponse.json(
        { success: false, message: "Materia no encontrada" },
        { status: 404 }
      );
    }

    // 1. Crear Direct Upload URL optimizada
    console.log("Creando Direct Upload URL optimizada...");
    const upload = await uploadService.createDirectUploadUrl(file.size);
    console.log("Direct Upload URL creada:", upload.id);

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