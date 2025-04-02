import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceAuth } from "@/app/lib/google-auth";
import { google } from "googleapis";
import { GaxiosError, GaxiosOptions } from "gaxios";
import { Readable } from "stream";

// Número máximo de reintentos para descargas fallidas
const MAX_RETRIES = 3;
// Timeout en ms para solicitudes a Google Drive
const REQUEST_TIMEOUT = 30000;

// Función para manejar los reintentos con backoff exponencial
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;

    console.log(`Reintentando operación, ${retries} intentos restantes...`);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return withRetry(fn, retries - 1, delay * 2);
  }
}

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

    console.log(`Iniciando solicitud de proxy para video ${videoId}`);

    // Obtener el servicio de autenticación
    const auth = await getServiceAuth();
    const drive = google.drive({
      version: "v3",
      auth,
      timeout: REQUEST_TIMEOUT,
      retryConfig: {
        retry: MAX_RETRIES,
        retryDelay: 1000,
        statusCodesToRetry: [[500, 599]],
      },
    });

    // Verificar que el archivo existe y es un video
    const fileMetadata = await withRetry(() =>
      drive.files.get({
        fileId: videoId,
        fields: "id,name,mimeType,size",
      })
    );

    if (!fileMetadata.data || !fileMetadata.data.mimeType) {
      console.error("Metadatos de archivo inválidos", fileMetadata);
      return new NextResponse("Archivo no encontrado", { status: 404 });
    }

    if (!fileMetadata.data.mimeType?.includes("video/")) {
      console.warn(`Archivo no es video: ${fileMetadata.data.mimeType}`);
      return new NextResponse("No es un archivo de video", { status: 400 });
    }

    // Obtener el rango solicitado del header
    const range = request.headers.get("range");
    const fileSize = Number(fileMetadata.data.size);

    if (!fileSize || isNaN(fileSize)) {
      console.error("Tamaño de archivo inválido", fileMetadata.data.size);
      return new NextResponse("Información de archivo incompleta", {
        status: 500,
      });
    }

    try {
      if (range) {
        // Manejar streaming por rangos
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1]
          ? parseInt(parts[1], 10)
          : Math.min(start + 5000000, fileSize - 1); // Limitar chunks a 5MB máximo
        const chunkSize = end - start + 1;

        console.log(`Solicitando rango de bytes ${start}-${end}/${fileSize}`);

        const options: GaxiosOptions = {
          responseType: "stream",
          timeout: REQUEST_TIMEOUT,
          headers: {
            Range: `bytes=${start}-${end}`,
            "Cache-Control": "no-store",
          },
        };

        const response = await withRetry(() =>
          drive.files.get(
            {
              fileId: videoId,
              alt: "media",
            },
            options
          )
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
        // Prevenir almacenamiento en caché del navegador para evitar problemas
        headers.set("Pragma", "no-cache");

        return new NextResponse(response.data as unknown as ReadableStream, {
          status: 206,
          headers,
        });
      } else {
        // Si no hay rango, enviar chunk inicial
        const chunkSize = Math.min(5000000, fileSize); // 5MB máximo para la primera carga

        console.log(`Enviando chunk inicial de ${chunkSize} bytes`);

        const options: GaxiosOptions = {
          responseType: "stream",
          timeout: REQUEST_TIMEOUT,
          headers: {
            Range: `bytes=0-${chunkSize - 1}`,
            "Cache-Control": "no-store",
          },
        };

        const response = await withRetry(() =>
          drive.files.get(
            {
              fileId: videoId,
              alt: "media",
            },
            options
          )
        );

        // Asegurarnos de que response.data es un Readable
        if (!(response.data instanceof Readable)) {
          throw new Error("La respuesta no es un stream");
        }

        const headers = new Headers();
        headers.set("Content-Type", fileMetadata.data.mimeType || "video/mp4");
        headers.set("Content-Length", chunkSize.toString());
        headers.set("Content-Range", `bytes 0-${chunkSize - 1}/${fileSize}`);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "public, max-age=3600");
        headers.set("Pragma", "no-cache");

        return new NextResponse(response.data as unknown as ReadableStream, {
          status: 206, // Responder con Partial Content para forzar que el navegador solicite el resto
          headers,
        });
      }
    } catch (downloadError: any) {
      console.error("Error al descargar el video:", {
        message: downloadError.message,
        status: downloadError.response?.status,
        data: downloadError.response?.data,
      });

      if (downloadError instanceof GaxiosError) {
        if (downloadError.code === "ECONNABORTED") {
          return new NextResponse(
            JSON.stringify({
              error: "Tiempo de espera agotado al descargar el video",
            }),
            {
              status: 504,
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
              },
            }
          );
        }
      }

      return new NextResponse(
        JSON.stringify({
          error: "Error al descargar el video",
          details: downloadError.message,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        }
      );
    }
  } catch (error: any) {
    console.error("Error al servir el video:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return new NextResponse(
      JSON.stringify({
        error: "Error al servir el video",
        details: error.message,
      }),
      {
        status: error.response?.status || 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
