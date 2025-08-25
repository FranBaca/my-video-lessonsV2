import { NextRequest, NextResponse } from "next/server";
import { professorService } from "@/app/lib/firebase-services";
import { Professor } from "@/app/types/firebase";
import { auth } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

import { verifyAdminAuth } from "@/app/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación de administrador
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Se requieren credenciales de administrador.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, settings, password } = body;

    // Validaciones básicas
    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          message: "Los campos name y email son obligatorios",
        },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Formato de email inválido",
        },
        { status: 400 }
      );
    }

    // Generar contraseña temporal si no se proporciona
    const tempPassword = password || Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + "!1";

    // Crear usuario en Firebase Auth primero
    let firebaseUser;
    try {
      firebaseUser = await createUserWithEmailAndPassword(auth, email, tempPassword);
    } catch (error: any) {
      // Si el usuario ya existe, intentar obtenerlo
      if (error.code === 'auth/email-already-in-use') {
        return NextResponse.json(
          {
            success: false,
            message: "El email ya está registrado en Firebase Auth",
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          message: "Error al crear usuario en Firebase Auth",
          error: error.message,
        },
        { status: 500 }
      );
    }

    // Crear el profesor en Firestore usando el UID de Firebase Auth
    const professorData: Omit<Professor, 'id'> = {
      name,
      email,
      isActive: true,
      createdAt: new Date(),
      settings: settings || {
        allowMultipleDevices: false
      }
    };

    // Usar el UID de Firebase Auth como ID en Firestore
    const professorId = firebaseUser.user.uid;
    
    try {
      await professorService.createWithId(professorId, professorData);
    } catch (error) {
      // Si falla la creación en Firestore, eliminar el usuario de Firebase Auth
      try {
        await firebaseUser.user.delete();
      } catch (deleteError) {
        // Error handling silently for production
      }
      throw error;
    }

    // Obtener el profesor creado para devolverlo
    const createdProfessor = await professorService.getById(professorId);

    return NextResponse.json({
      success: true,
      message: "Profesor creado exitosamente",
      data: {
        ...createdProfessor,
        firebaseUid: professorId,
        tempPassword: !password ? tempPassword : undefined // Solo devolver si no se proporcionó password
      }
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear el profesor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación de administrador
    const isAdmin = await verifyAdminAuth(request);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Se requieren credenciales de administrador.",
        },
        { status: 401 }
      );
    }

    const professors = await professorService.getAll();

    return NextResponse.json({
      success: true,
      data: professors
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener los profesores",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
} 