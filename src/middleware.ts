import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Comprobar si el usuario está autenticado verificando la cookie
  const studentCode = request.cookies.get("student_code")?.value;

  // Si no hay código de estudiante, redirigir a la página principal
  if (!studentCode) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Si hay código de estudiante, continuar con la solicitud y renovar cookies
  const response = NextResponse.next();

  // Renovar las cookies (excepto en logout)
  if (!request.nextUrl.pathname.startsWith("/api/auth/logout")) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      maxAge: 30 * 24 * 60 * 60, // 30 días
      path: "/",
    };

    // Renovar las cookies existentes
    response.cookies.set("student_code", studentCode, cookieOptions);

    // También renovar otras cookies si existen
    const allowedSubjects = request.cookies.get("allowed_subjects")?.value;
    if (allowedSubjects) {
      response.cookies.set("allowed_subjects", allowedSubjects, cookieOptions);
    }

    const deviceId = request.cookies.get("device_id")?.value;
    if (deviceId) {
      response.cookies.set("device_id", deviceId, cookieOptions);
    }

    const browserFingerprint = request.cookies.get(
      "browser_fingerprint"
    )?.value;
    if (browserFingerprint) {
      response.cookies.set("browser_fingerprint", browserFingerprint, {
        ...cookieOptions,
        httpOnly: false, // No es httpOnly para que pueda ser accedido por JavaScript
      });
    }
  }

  return response;
}

// Configurar el matcher para excluir explícitamente las rutas públicas
// y solo aplicar el middleware a rutas que requieren autenticación
export const config = {
  matcher: [
    // Rutas que requieren autenticación
    "/api/drive/:path*",
    "/api/admin/:path*",

    // Excluir explícitamente rutas de autenticación y la página principal
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
