import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import students from "@/app/data/students.json";
import { Student } from "@/app/types";
import fs from "fs";
import path from "path";

// Simulamos una base de datos simple para almacenar los códigos ya utilizados
interface UsedCode {
  code: string;
  deviceId: string;
  subjects?: string[];
}

const DB_PATH = path.join(process.cwd(), "src/app/data/used_codes.json");

// Función para obtener los códigos utilizados
function getUsedCodes(): UsedCode[] {
  try {
    // En desarrollo, usamos el archivo local
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error reading used codes:", error);
    return [];
  }
}

// Función para guardar un código utilizado
function saveUsedCode(code: string, deviceId: string, subjects?: string[]) {
  try {
    // En desarrollo, guardamos en el archivo local
    const usedCodes = getUsedCodes();

    // Verificar si el código ya existe
    const existingIndex = usedCodes.findIndex((item) => item.code === code);

    if (existingIndex >= 0) {
      // Si existe, actualizar el deviceId
      usedCodes[existingIndex].deviceId = deviceId;
      if (subjects) {
        usedCodes[existingIndex].subjects = subjects;
      }
    } else {
      // Si no existe, añadir nuevo
      usedCodes.push({ code, deviceId, subjects });
    }

    // Asegurarse de que el directorio existe
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(usedCodes, null, 2));
  } catch (error) {
    console.error("Error saving used code:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Código no proporcionado",
        },
        { status: 400 }
      );
    }

    // Find student with the provided code
    const student = (students as Student[]).find((s) => s.code === code);

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "Código inválido",
        },
        { status: 401 }
      );
    }

    if (!student.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Estudiante no autorizado",
        },
        { status: 403 }
      );
    }

    // Generate device ID if not exists
    const cookieStore = cookies();
    let deviceId = cookieStore.get("device_id")?.value;

    if (!deviceId) {
      deviceId = uuidv4();
    }

    // Verificar si el código ya ha sido utilizado en otro dispositivo
    // Verificamos usando cookies
    const studentCodeCookie = cookieStore.get(`student_${code}`)?.value;

    if (studentCodeCookie && studentCodeCookie !== deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Este código ya ha sido utilizado en otro dispositivo",
          isDeviceUsed: true,
        },
        { status: 403 }
      );
    }

    // En desarrollo, también verificamos con el archivo
    if (process.env.NODE_ENV !== "production") {
      const usedCodes = getUsedCodes();
      const existingCode = usedCodes.find((item) => item.code === code);

      if (existingCode && existingCode.deviceId !== deviceId) {
        return NextResponse.json(
          {
            success: false,
            message: "Este código ya ha sido utilizado en otro dispositivo",
            isDeviceUsed: true,
          },
          { status: 403 }
        );
      }
    }

    // Store device ID and student code in cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    };

    // Configurar la respuesta con las cookies
    const response = NextResponse.json({
      success: true,
      student: {
        ...student,
        deviceId,
      },
    });

    // Establecer las cookies en la respuesta
    response.cookies.set("device_id", deviceId, cookieOptions);
    response.cookies.set("student_code", code, cookieOptions);
    response.cookies.set(`student_${code}`, deviceId, cookieOptions);

    // Guardar las materias permitidas en una cookie
    if (student.subjects && student.subjects.length > 0) {
      response.cookies.set(
        "allowed_subjects",
        JSON.stringify(student.subjects),
        cookieOptions
      );
    }

    // Guardar el código como utilizado (solo en desarrollo)
    if (process.env.NODE_ENV !== "production") {
      saveUsedCode(code, deviceId, student.subjects);
    }

    return response;
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al validar el código",
      },
      { status: 500 }
    );
  }
}
