import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    const professorsSnapshot = await getDocs(collection(db, 'professors'));
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