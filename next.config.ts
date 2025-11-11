import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Capacitor will use remote server (Vercel)
  // No need for static export with dynamic routes
};

export default nextConfig;
