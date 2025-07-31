import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/firebase";
import { migrateVideosToNewStructure, checkMigrationNeeded } from "@/app/lib/migration";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token de autorización requerido" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const professorId = decodedToken.uid;

    // Verificar si la migración es necesaria
    const migrationNeeded = await checkMigrationNeeded();
    
    if (!migrationNeeded) {
      return NextResponse.json({
        success: true,
        message: "No se requiere migración - los videos ya están en la nueva estructura",
        data: { migrated: false }
      });
    }

    // Ejecutar la migración
    await migrateVideosToNewStructure();

    return NextResponse.json({
      success: true,
      message: "Migración completada exitosamente",
      data: { migrated: true }
    });

  } catch (error) {
    console.error("Error durante la migración:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error durante la migración",
        error: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación del profesor
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token de autorización requerido" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const professorId = decodedToken.uid;

    // Verificar si la migración es necesaria
    const migrationNeeded = await checkMigrationNeeded();

    return NextResponse.json({
      success: true,
      data: { 
        migrationNeeded,
        message: migrationNeeded 
          ? "Se requiere migración de videos a la nueva estructura" 
          : "Los videos ya están en la nueva estructura"
      }
    });

  } catch (error) {
    console.error("Error verificando migración:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error verificando migración",
        error: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
} 