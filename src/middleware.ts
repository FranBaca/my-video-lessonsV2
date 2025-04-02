import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Verificar si es una ruta pública que no requiere autenticación
  const publicPaths = [
    "/api/auth/verify",
    "/api/auth/validate",
    "/api/auth/callback",
    "/api/auth/refresh",
  ];
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Comprobar si el usuario está autenticado verificando la cookie
  const studentCode = request.cookies.get("student_code")?.value;

  // Si no hay código de estudiante y no es una ruta pública, redirigir a la página principal
  // donde se mostrará el formulario de inicio de sesión
  if (!studentCode && !request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Continuar con la solicitud
  const response = NextResponse.next();

  // Renovar las cookies si existen y la ruta no es de logout
  if (studentCode && !request.nextUrl.pathname.startsWith("/api/auth/logout")) {
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

export const config = {
  matcher: [
    // Rutas que requieren o pueden requerir autenticación
    "/",
    "/api/:path*",
  ],
};
