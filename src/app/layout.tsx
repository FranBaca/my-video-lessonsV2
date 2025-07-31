import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Video Lessons",
  description: "Plataforma de videos educativos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
