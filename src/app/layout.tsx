import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Video Lessons",
  description: "Plataforma de videos educativos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
