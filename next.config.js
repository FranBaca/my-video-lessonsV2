/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["googleapis"],
  },
  // Asegurarse de que los estilos se procesen correctamente
  webpack: (config) => {
    return config;
  },
  // Configuración para CSS
  images: {
    domains: ["drive.google.com"],
  },
  // Configuración para rutas dinámicas
  serverRuntimeConfig: {
    dynamicRoutes: [
      "/api/auth",
      "/api/auth/callback",
      "/api/auth/validate",
      "/api/drive/videos",
    ],
  },
};

module.exports = nextConfig;
