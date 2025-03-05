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
    const cookieStore = cookies();

    // Store tokens securely
    cookieStore.set("access_token", tokens.access_token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600, // 1 hour
    });

    if (tokens.refresh_token) {
      cookieStore.set("refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    // Redirect to home page after successful authentication
    return NextResponse.redirect(new URL("/", request.url));
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
