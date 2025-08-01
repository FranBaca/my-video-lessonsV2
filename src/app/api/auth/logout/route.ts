import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada exitosamente",
  });

  // Limpiar las cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as "strict",
    maxAge: 0, // Esto hará que la cookie expire inmediatamente
    path: "/",
  };

  response.cookies.set("student_code", "", cookieOptions);
  response.cookies.set("allowed_subjects", "", cookieOptions);

  return response;
}
