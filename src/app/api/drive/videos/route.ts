import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceAuth, listFolderVideos } from "@/app/lib/google-auth";
import { Subject, Video } from "@/app/types";
import { MATERIAS } from "@/app/lib/sheets";

// Definir los IDs de las carpetas
const FOLDER_IDS = {
  [MATERIAS.ANATOMIA]: process.env.GOOGLE_DRIVE_FOLDER_MATH!,
  [MATERIAS.HISTOLOGIA]: process.env.GOOGLE_DRIVE_FOLDER_SCIENCE!,
  [MATERIAS.FISIOLOGIA]: process.env.GOOGLE_DRIVE_FOLDER_PHYSIOLOGY!,
};

// Verificar que los IDs de las carpetas estén definidos
console.log("IDs de carpetas configurados:", {
  [MATERIAS.ANATOMIA]: process.env.GOOGLE_DRIVE_FOLDER_MATH || "No definido",
  [MATERIAS.HISTOLOGIA]:
    process.env.GOOGLE_DRIVE_FOLDER_SCIENCE || "No definido",
  [MATERIAS.FISIOLOGIA]:
    process.env.GOOGLE_DRIVE_FOLDER_PHYSIOLOGY || "No definido",
});

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

      const files = await listFolderVideos(folderId);

      const videos: Video[] = files.map((file) => ({
        id: file.id,
        name: file.name,
        link: `https://drive.google.com/file/d/${file.id}/preview`,
        thumbnailLink: file.thumbnailLink,
        createdTime: file.createdTime,
      }));

      // Convertir el nombre normalizado a nombre de presentación
      let displayName = "";
      switch (subjectName) {
        case MATERIAS.ANATOMIA:
          displayName = "Anatomía";
          break;
        case MATERIAS.HISTOLOGIA:
          displayName = "Histología";
          break;
        case MATERIAS.FISIOLOGIA:
          displayName = "Fisiología";
          break;
        default:
          displayName = subjectName;
      }

      subjects.push({
        id: folderId,
        name: displayName,
        videos,
      });
    }

    // Configurar la respuesta
    const response = NextResponse.json({
      success: true,
      subjects,
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
