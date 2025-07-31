import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';

export interface AuthenticatedRequest extends NextRequest {
  professorId?: string;
}

export async function verifyProfessorAuth(request: NextRequest): Promise<string> {
  try {
    // Verificar que Firebase Admin esté disponible
    if (!adminAuth) {
      throw new Error("Firebase Admin SDK no está configurado");
    }

    // Obtener el token del header Authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Token de autorización requerido");
    }

    const token = authHeader.split("Bearer ")[1];
    
    // Verificar el token con Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Verificar que el usuario existe y es un profesor
    if (!decodedToken.uid) {
      throw new Error("Token inválido");
    }

    return decodedToken.uid;
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    throw new Error("Autenticación fallida");
  }
}

export function createAuthMiddleware(handler: (request: AuthenticatedRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const professorId = await verifyProfessorAuth(request);
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.professorId = professorId;
      
      return await handler(authenticatedRequest);
    } catch (error: any) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: error.message || "Error de autenticación" 
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
} 