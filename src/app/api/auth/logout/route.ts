import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada exitosamente",
  });

  // Clear cookies
  const cookieOptions = {
    httpOnly: true,
    secure: true, // Always secure - remove environment check
    sameSite: "strict" as "strict",
    path: "/",
  };

  response.cookies.set("student_code", "", cookieOptions);
  response.cookies.set("allowed_subjects", "", cookieOptions);

  return response;
}
