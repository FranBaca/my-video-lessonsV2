import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  // HTML para incrustar el video de Drive con CSS personalizado
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Video Player</title>
        <meta name="robots" content="noindex, nofollow" />
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #000;
          }
          .video-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          .drive-frame {
            position: absolute;
            top: -50px;
            left: 0;
            width: 100%;
            height: calc(100% + 50px);
            border: none;
          }
          .header-block {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background-color: #000;
            z-index: 9999;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe 
            class="drive-frame"
            src="https://drive.google.com/file/d/${videoId}/preview"
            allow="autoplay; encrypted-media"
            allowfullscreen
          ></iframe>
          <div class="header-block"></div>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
