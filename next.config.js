/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ['@mux/mux-node', 'firebase-admin'],
    serverActions: true,
  },
  typescript: {
    ignoreBuildErrors: true, // ⚠️ Permite que el build se complete con errores de TS
  },
  images: {
    domains: ["stream.mux.com", "image.mux.com"],
  },
  async headers() {
    return [
      {
        source: '/api/mux/upload/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
