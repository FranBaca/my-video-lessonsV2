import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createDriveClient, listFolderVideos } from "@/app/lib/google-auth";
import { Subject, Video } from "@/app/types";

// Definir los IDs de las carpetas
const FOLDER_IDS = {
  anatomia: process.env.GOOGLE_DRIVE_FOLDER_MATH!,
  histologia: process.env.GOOGLE_DRIVE_FOLDER_SCIENCE!,
  fisiologia: process.env.GOOGLE_DRIVE_FOLDER_PHYSIOLOGY!,
};

// Verificar que los IDs de las carpetas estén definidos
console.log("IDs de carpetas configurados:", {
  anatomia: process.env.GOOGLE_DRIVE_FOLDER_MATH || "No definido",
  histologia: process.env.GOOGLE_DRIVE_FOLDER_SCIENCE || "No definido",
  fisiologia: process.env.GOOGLE_DRIVE_FOLDER_PHYSIOLOGY || "No definido",
});

export async function GET(request: NextRequest) {
  try {
    // Obtener headers para verificar si hay un deviceId enviado desde el cliente
    const clientDeviceId = request.headers.get("X-Device-Id");
    const clientStudentCode = request.headers.get("X-Student-Code");
    const clientAllowedSubjects = request.headers.get("X-Allowed-Subjects");

    console.log("Headers recibidos:", {
      clientDeviceId,
      clientStudentCode,
      clientAllowedSubjects,
    });

    // Leer cookies directamente de la solicitud
    const cookieStore = cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const studentCode =
      cookieStore.get("student_code")?.value || clientStudentCode;
    const allowedSubjectsStr =
      cookieStore.get("allowed_subjects")?.value || clientAllowedSubjects;
    const deviceId = cookieStore.get("device_id")?.value || clientDeviceId;

    console.log("Cookies encontradas:", {
      accessToken: accessToken ? "Presente" : "No presente",
      studentCode,
      allowedSubjectsStr,
      deviceId,
    });

    if (!accessToken) {
      console.log("No se encontró token de acceso");
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
          redirectUrl: "/api/auth", // URL para iniciar el proceso de autenticación
        },
        { status: 401 }
      );
    }

    if (!studentCode) {
      return NextResponse.json(
        {
          success: false,
          message: "No student code found",
        },
        { status: 403 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "No device ID found",
        },
        { status: 403 }
      );
    }

    // Verificar que el código de estudiante esté asociado con este dispositivo
    const studentDeviceId = cookieStore.get(`student_${studentCode}`)?.value;
    if (!studentDeviceId && process.env.NODE_ENV === "production") {
      // En producción, si no hay cookie pero tenemos deviceId del cliente, confiamos en él
      // Esto es para manejar el caso donde las cookies no funcionan correctamente en Vercel
      if (
        clientDeviceId &&
        clientStudentCode &&
        clientDeviceId === deviceId &&
        clientStudentCode === studentCode
      ) {
        // Aceptamos la autenticación basada en los headers del cliente
        console.log("Autenticación basada en headers del cliente");
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid device for this student code",
          },
          { status: 403 }
        );
      }
    } else if (studentDeviceId && studentDeviceId !== deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid device for this student code",
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

    const driveClient = createDriveClient(accessToken);
    const subjects: Subject[] = [];

    for (const [subjectName, folderId] of Object.entries(FOLDER_IDS)) {
      if (!allowedSubjects.includes(subjectName)) {
        continue;
      }

      const files = await listFolderVideos(folderId, driveClient);

      const videos: Video[] = files.map((file) => ({
        id: file.id,
        name: file.name,
        link: `https://drive.google.com/file/d/${file.id}/preview`,
        thumbnailLink: file.thumbnailLink,
        createdTime: file.createdTime,
      }));

      subjects.push({
        id: folderId,
        name:
          subjectName === "anatomia"
            ? "Anatomía"
            : subjectName === "histologia"
            ? "Histología"
            : "Fisiología",
        videos,
      });
    }

    // Configurar la respuesta con las cookies para reforzar la autenticación
    const response = NextResponse.json({
      success: true,
      subjects,
    });

    console.log("Enviando respuesta al frontend:", {
      success: true,
      subjects: JSON.parse(JSON.stringify(subjects)), // Convertir a JSON para ver la estructura completa
    });

    // Si no hay cookies pero hay información del cliente, establecer las cookies
    if (!cookieStore.get("device_id")?.value && clientDeviceId) {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as "strict",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      };

      response.cookies.set("device_id", clientDeviceId, cookieOptions);

      if (clientStudentCode) {
        response.cookies.set("student_code", clientStudentCode, cookieOptions);
        response.cookies.set(
          `student_${clientStudentCode}`,
          clientDeviceId,
          cookieOptions
        );
      }

      if (clientAllowedSubjects) {
        response.cookies.set(
          "allowed_subjects",
          clientAllowedSubjects,
          cookieOptions
        );
      }
    }

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
