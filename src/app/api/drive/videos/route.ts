import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceAuth, listFolderVideos } from "@/app/lib/google-auth";
import { Subject, Video } from "@/app/types";
import students from "@/app/data/students.json";
import studentsBenjaYSonia from "@/app/data/studentsBenjaYSonia.json";
import { Student } from "@/app/types";

// Definir los IDs de las carpetas
const FOLDER_IDS = {
  anatomia: process.env.GOOGLE_DRIVE_FOLDER_MATH!,
  histologia: process.env.GOOGLE_DRIVE_FOLDER_SCIENCE!,
  fisiologia: process.env.GOOGLE_DRIVE_FOLDER_PHYSIOLOGY!,
  anatomia2: process.env.GOOGLE_DRIVE_FOLDER_ANATOMIA2!,
  histologia2: process.env.GOOGLE_DRIVE_FOLDER_HISTOLOGIA2!,
  fisiologia2: process.env.GOOGLE_DRIVE_FOLDER_FISIOLOGIA2!,
  // BENJA HISTOLOGIA SALTA
  "histologia-salta": process.env.GOOGLE_DRIVE_FOLDER_HISTOLOGIA_SALTA!,
  // BENJA Y SONIA
  biofisica: process.env.GOOGLE_DRIVE_FOLDER_BIOFISICA!,
  biologia: process.env.GOOGLE_DRIVE_FOLDER_BIOLOGIA!,
  bioquimica: process.env.GOOGLE_DRIVE_FOLDER_BIOQUIMICA!,
  // BENJA Y SONIA PARCIAL 2
  biofisica2: process.env.GOOGLE_DRIVE_FOLDER_BIOFISICA2!,
  biologia2: process.env.GOOGLE_DRIVE_FOLDER_BIOLOGIA2!,
  bioquimica2: process.env.GOOGLE_DRIVE_FOLDER_BIOQUIMICA2!,
};

export async function GET(request: NextRequest) {
  try {
    // Leer cookies para obtener el código de estudiante y materias permitidas
    const cookieStore = cookies();
    const studentCode = cookieStore.get("student_code")?.value;
    const allowedSubjectsStr = cookieStore.get("allowed_subjects")?.value;

    if (!studentCode) {
      return NextResponse.json(
        {
          success: false,
          message: "No student code found",
        },
        { status: 403 }
      );
    }

    // Verificar que el estudiante existe y está autorizado
    const student =
      (students as Student[]).find((s) => s.code === studentCode) ||
      (studentsBenjaYSonia as Student[]).find((s) => s.code === studentCode);
    if (!student || !student.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized student",
        },
        { status: 403 }
      );
    }

    let allowedSubjects: string[] = [];
    if (allowedSubjectsStr) {
      try {
        allowedSubjects = JSON.parse(allowedSubjectsStr);
      } catch (e) {
        console.error("Error parsing allowed subjects:", e);
      }
    }

    if (allowedSubjects.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No subjects allowed for this student",
        },
        { status: 403 }
      );
    }

    const subjects: Subject[] = [];

    // Usar la cuenta de servicio para acceder a Drive
    for (const [subjectName, folderId] of Object.entries(FOLDER_IDS)) {
      if (!allowedSubjects.includes(subjectName)) {
        continue;
      }

      const sections = await listFolderVideos(folderId);

      subjects.push({
        id: folderId,
        name:
          subjectName === "anatomia"
            ? "Anatomía Parcial 1"
            : subjectName === "histologia"
            ? "Histología Parcial 1"
            : subjectName === "histologia-salta"
            ? "Histología Salta"
            : subjectName === "biofisica"
            ? "Biofísica"
            : subjectName === "biologia"
            ? "Biología"
            : subjectName === "bioquimica"
            ? "Bioquímica"
            : subjectName === "anatomia2"
            ? "Anatomía Parcial 2"
            : subjectName === "histologia2"
            ? "Histología Parcial 2"
            : subjectName === "fisiologia2"
            ? "Fisiología Parcial 2"
            : subjectName === "biofisica2"
            ? "Biofísica Parcial 2"
            : subjectName === "biologia2"
            ? "Biología Parcial 2"
            : subjectName === "bioquimica2"
            ? "Bioquímica Parcial 2"
            : "Fisiología Parcial 1",
        sections,
      });
    }

    // Configurar la respuesta
    const response = NextResponse.json({
      success: true,
      subjects,
      studentName: student.name,
    });

    return response;
  } catch (error) {
    console.error("Videos fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch videos",
      },
      { status: 500 }
    );
  }
}
