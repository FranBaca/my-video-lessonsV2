import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/app/lib/google-auth";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "No authorization code provided",
        },
        { status: 400 }
      );
    }

    const tokens = await getTokens(code);

    // Crear la respuesta de redirección
    const response = NextResponse.redirect(new URL("/", request.url));

    // Configurar las opciones de cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    };

    // Establecer las cookies en la respuesta
    response.cookies.set("access_token", tokens.access_token!, {
      ...cookieOptions,
      maxAge: 3600, // 1 hour
    });

    if (tokens.refresh_token) {
      response.cookies.set("refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    // Mantener el device_id si existe
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;
    if (deviceId) {
      response.cookies.set("device_id", deviceId, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
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
