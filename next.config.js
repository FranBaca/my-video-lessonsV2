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
};

module.exports = nextConfig;
