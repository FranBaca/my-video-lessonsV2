import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const professorsSnapshot = await adminDb.collection('professors').get();
    const professors = professorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({
      success: true,
      professors: professors
    });
    
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Error listing professors",
        error: error.message
      },
      { status: 500 }
    );
  }
} 