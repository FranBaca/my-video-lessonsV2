import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Block this endpoint in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        success: false, 
        message: "Endpoint not available in production" 
      }, { status: 404 });
    }

    // Check Firebase Admin SDK variables
    const firebaseConfigured = !!(
      process.env.FIREBASE_PRIVATE_KEY_ID &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_CLIENT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    );

    // Check Mux variables
    const muxConfigured = !!(
      process.env.MUX_TOKEN_ID &&
      process.env.MUX_TOKEN_SECRET
    );

    return NextResponse.json({
      success: true,
      firebaseConfigured,
      muxConfigured,
      hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasMuxTokenId: !!process.env.MUX_TOKEN_ID,
      hasMuxTokenSecret: !!process.env.MUX_TOKEN_SECRET,
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 