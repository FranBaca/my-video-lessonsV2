import { NextResponse } from "next/server";
import { getAuthUrl } from "@/app/lib/google-auth";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    console.log("Iniciando proceso de autenticación");

    // Generate device ID if not exists
    const cookieStore = cookies();
    let deviceId = cookieStore.get("device_id")?.value;

    if (!deviceId) {
      deviceId = uuidv4();
      console.log("Generando nuevo device ID:", deviceId);
    } else {
      console.log("Usando device ID existente:", deviceId);
    }

    try {
      const authUrl = getAuthUrl();
      console.log("URL de autenticación generada:", authUrl);

      // Configurar la respuesta con las cookies
      const response = NextResponse.json({
        success: true,
        url: authUrl,
      });

      // Establecer la cookie de device_id en la respuesta
      response.cookies.set("device_id", deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as "strict",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });

      console.log("Respuesta de autenticación preparada");
      return response;
    } catch (authError) {
      console.error("Error al generar URL de autenticación:", authError);

      // Proporcionar una respuesta más detallada para ayudar a depurar
      return NextResponse.json(
        {
          success: false,
          message: "Error al generar URL de autenticación",
          error:
            authError instanceof Error
              ? authError.message
              : "Error desconocido",
          env: {
            nodeEnv: process.env.NODE_ENV,
            hasClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Authentication failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
