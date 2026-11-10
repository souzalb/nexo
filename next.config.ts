import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow production checks without overwriting a running dev server's cache.
  distDir: process.env.NEXO_BUILD_DIR || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
