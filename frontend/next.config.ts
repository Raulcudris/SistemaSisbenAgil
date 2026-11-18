import type { NextConfig } from 'next';

// URL interna del backend. El navegador siempre llama a `/api` en el mismo
// origen y Next.js reenvía la petición a este destino, así el kiosco funciona
// por localhost o por la IP del servidor sin recompilar el frontend.
// En Docker es el nombre del servicio: http://digiturno-backend:8088
// En desarrollo local: http://localhost:8088
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:8088';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // Genera un servidor autónomo mínimo para la imagen de producción.
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
