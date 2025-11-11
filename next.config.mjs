/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Capacitor will use remote server (Vercel)
  // No need for static export with dynamic routes
};
export default nextConfig;
