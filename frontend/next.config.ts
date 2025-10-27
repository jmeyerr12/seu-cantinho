import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

const nextConfig: NextConfig = {
  output: 'standalone', // facilita build e Docker
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/:path*` },
    ];
  },
};

export default nextConfig;
