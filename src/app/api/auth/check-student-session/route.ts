import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";

export const dynamic = 'force-dynamic';

async function findStudentByCode(code: string) {
  try {
    const professorsRef = adminDb.collection('professors');
    const professorsSnapshot = await professorsRef.get();
    
    for (const professorDoc of professorsSnapshot.docs) {
      const studentsRef = professorDoc.ref.collection('students');
      const studentsSnapshot = await studentsRef.where('code', '==', code).get();
      
      if (!studentsSnapshot.empty) {
        const studentDoc = studentsSnapshot.docs[0];
        return {
          id: `${professorDoc.id}/${studentDoc.id}`,
          ...studentDoc.data()
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding student:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get student code from cookies
    const studentCode = request.cookies.get("student_code")?.value;
    
    if (!studentCode) {
      return NextResponse.json({ 
        success: false, 
        message: "No active session" 
      }, { status: 401 });
    }

    // Find student by code
    const student = await findStudentByCode(studentCode);
    
    if (!student) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid session" 
      }, { status: 401 });
    }

    if (!student.authorized) {
      return NextResponse.json({ 
        success: false, 
        message: "Account not authorized" 
      }, { status: 403 });
    }

    // Get allowed subjects from cookies
    const allowedSubjectsCookie = request.cookies.get("allowed_subjects")?.value;
    const allowedSubjects = allowedSubjectsCookie ? JSON.parse(allowedSubjectsCookie) : [];

    return NextResponse.json({
      success: true,
      student: {
        name: student.name,
        allowedSubjects: allowedSubjects,
        code: studentCode
      }
    });

  } catch (error: any) {
    console.error("❌ Error checking student session:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 