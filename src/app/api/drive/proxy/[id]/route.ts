import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceAuth } from "@/app/lib/google-auth";
import { google } from "googleapis";
import { GaxiosOptions } from "gaxios";
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

    // Obtener el rango solicitado del header
    const range = request.headers.get("range");
    const fileSize = Number(fileMetadata.data.size);

    try {
      if (range) {
        // Manejar streaming por rangos
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const options: GaxiosOptions = {
          responseType: "stream",
          headers: {
            Range: `bytes=${start}-${end}`,
          },
        };

        const response = await drive.files.get(
          {
            fileId: videoId,
            alt: "media",
          },
          options
        );

        // Asegurarnos de que response.data es un Readable
        if (!(response.data instanceof Readable)) {
          throw new Error("La respuesta no es un stream");
        }

        // Configurar headers para streaming
        const headers = new Headers();
        headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Content-Length", chunkSize.toString());
        headers.set("Content-Type", fileMetadata.data.mimeType || "video/mp4");
        headers.set("Cache-Control", "public, max-age=3600");

        return new NextResponse(response.data as unknown as ReadableStream, {
          status: 206,
          headers,
        });
      } else {
        // Si no hay rango, enviar todo el archivo
        const response = await drive.files.get(
          {
            fileId: videoId,
            alt: "media",
          },
          { responseType: "stream" }
        );

        // Asegurarnos de que response.data es un Readable
        if (!(response.data instanceof Readable)) {
          throw new Error("La respuesta no es un stream");
        }

        const headers = new Headers();
        headers.set("Content-Type", fileMetadata.data.mimeType || "video/mp4");
        headers.set("Content-Length", fileSize.toString());
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "public, max-age=3600");

        return new NextResponse(response.data as unknown as ReadableStream, {
          status: 200,
          headers,
        });
      }
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
