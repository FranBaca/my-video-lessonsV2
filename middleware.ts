import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Excluir rutas de API y rutas estáticas
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Obtener cookies de sesión
  const studentCode = request.cookies.get("student_code")?.value;
  const allowedSubjects = request.cookies.get("allowed_subjects")?.value;
  const deviceId = request.cookies.get("device_id")?.value;

  // Si ya está en la página principal y tiene cookies válidas, permitir el acceso
  if (
    request.nextUrl.pathname === "/" &&
    studentCode &&
    allowedSubjects &&
    deviceId
  ) {
    // Usuario con sesión válida, permitir acceso
    return NextResponse.next();
  }

  // No redirigir si está en la página principal
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next();
  }

  // Redirigir a la página principal si no tiene cookies válidas
  if (!studentCode || !allowedSubjects || !deviceId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Configurar las rutas a las que se aplicará el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes
     * - Static files (like images, js, css)
     * - favicon.ico
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
