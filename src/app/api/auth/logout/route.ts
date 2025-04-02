import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    {
      success: true,
      message: "Sesión cerrada exitosamente",
    },
    {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );

  // Limpiar las cookies - usar la expiración en el pasado para forzar la eliminación
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as "strict",
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  };

  // Eliminar todas las cookies utilizadas en la aplicación
  response.cookies.set("student_code", "", cookieOptions);
  response.cookies.set("allowed_subjects", "", cookieOptions);
  response.cookies.set("device_id", "", cookieOptions);
  response.cookies.set("browser_fingerprint", "", {
    ...cookieOptions,
    httpOnly: false,
  });
  response.cookies.set("access_token", "", cookieOptions);

  return response;
}
