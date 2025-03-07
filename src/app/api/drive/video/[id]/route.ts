import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceAuth } from "@/app/lib/google-auth";
import { google } from "googleapis";
import { Readable } from "stream";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const cookieStore = cookies();
    const studentCode = cookieStore.get("student_code")?.value;

    if (!studentCode) {
      return new NextResponse("No autorizado", { status: 401 });
    }

    const videoId = params.id;
    if (!videoId) {
      return new NextResponse("Se requiere ID del video", { status: 400 });
    }

    // Obtener el servicio de autenticación
    const auth = await getServiceAuth();
    const drive = google.drive({ version: "v3", auth });

    // Verificar que el archivo existe y es un video
    const fileMetadata = await drive.files.get({
      fileId: videoId,
      fields: "id,name,mimeType,size",
    });

    if (!fileMetadata.data.mimeType?.includes("video/")) {
      return new NextResponse("No es un archivo de video", { status: 400 });
    }

    const fileSize = parseInt(fileMetadata.data.size || "0");
    const range = request.headers.get("range");

    // Configurar los headers de la respuesta
    const headers = new Headers();
    headers.set("Content-Type", fileMetadata.data.mimeType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");

    // Headers CORS y seguridad
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range, Content-Type");
    headers.set("Cross-Origin-Resource-Policy", "same-site");
    headers.set("Cross-Origin-Embedder-Policy", "credentialless");

    // Si es una solicitud OPTIONS, devolver solo los headers
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { headers, status: 204 });
    }

    try {
      // Si no hay range, devolver el archivo completo
      if (!range) {
        headers.set("Content-Length", fileSize.toString());
        const response = await drive.files.get(
          {
            fileId: videoId,
            alt: "media",
          },
          { responseType: "stream" }
        );

        // Verificar que response.data es un Readable
        if (!(response.data instanceof Readable)) {
          throw new Error("La respuesta no es un stream");
        }

        return new NextResponse(response.data as unknown as ReadableStream, {
          status: 200,
          headers,
        });
      }

      // Procesar el range request
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0]);
      const end = parts[1]
        ? parseInt(parts[1])
        : Math.min(start + 1024 * 1024, fileSize - 1); // Limitar a 1MB por chunk
      const chunkSize = end - start + 1;

      headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      headers.set("Content-Length", chunkSize.toString());

      const response = await drive.files.get(
        {
          fileId: videoId,
          alt: "media",
        },
        {
          responseType: "stream",
          headers: {
            Range: `bytes=${start}-${end}`,
          },
        }
      );

      // Verificar que response.data es un Readable
      if (!(response.data instanceof Readable)) {
        throw new Error("La respuesta no es un stream");
      }

      return new NextResponse(response.data as unknown as ReadableStream, {
        status: 206,
        headers,
      });
    } catch (downloadError: any) {
      console.error("Error al descargar el video:", downloadError.message);
      return new NextResponse(
        JSON.stringify({ error: "Error al descargar el video" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error al servir el video:", error.message);
    return new NextResponse(
      JSON.stringify({ error: "Error al servir el video" }),
      {
        status: error.response?.status || 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
