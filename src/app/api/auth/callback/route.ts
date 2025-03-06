import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/app/lib/google-auth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    console.log("Callback de autenticación recibido");

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      console.log("No se proporcionó código de autorización");
      return NextResponse.json(
        {
          success: false,
          message: "No authorization code provided",
        },
        { status: 400 }
      );
    }

    console.log("Obteniendo tokens con el código de autorización");
    const tokens = await getTokens(code);
    console.log("Tokens obtenidos:", {
      accessToken: tokens.access_token ? "Presente" : "No presente",
      refreshToken: tokens.refresh_token ? "Presente" : "No presente",
      expiryDate: tokens.expiry_date,
    });

    // Crear la respuesta de redirección
    const response = NextResponse.redirect(new URL("/", request.url));
    console.log("Redirigiendo a la página principal");

    // Configurar las opciones de cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as "strict",
      path: "/",
    };

    // Establecer las cookies en la respuesta
    response.cookies.set("access_token", tokens.access_token!, {
      ...cookieOptions,
      maxAge: 3600, // 1 hour
    });
    console.log("Cookie de access_token establecida");

    if (tokens.refresh_token) {
      response.cookies.set("refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      console.log("Cookie de refresh_token establecida");
    }

    // Mantener el device_id si existe
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;
    if (deviceId) {
      response.cookies.set("device_id", deviceId, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      console.log("Cookie de device_id mantenida:", deviceId);
    } else {
      console.log("No se encontró device_id en las cookies");
    }

    return response;
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process authentication",
      },
      { status: 500 }
    );
  }
}
