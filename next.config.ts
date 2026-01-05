import type { NextConfig } from 'next';

// Content Security Policy - adapté pour Firebase, Spotify, et les besoins de l'app
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.scdn.co https://www.googletagmanager.com https://js.stripe.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' blob: data: https://*.scdn.co https://*.spotifycdn.com https://i.scdn.co https://mosaic.scdn.co https://image-cdn-*.spotifycdn.com https://firebasestorage.googleapis.com;
  connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://api.spotify.com https://accounts.spotify.com https://api.revenuecat.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
  frame-src 'self' https://accounts.spotify.com https://sdk.scdn.co https://js.stripe.com;
  media-src 'self' https://*.scdn.co https://*.spotifycdn.com blob:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  // Force HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy
  },
  // Disable browser features we don't need
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()'
  },
  // XSS Protection (legacy but still useful)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Prevent DNS prefetching leaks
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  }
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Security headers for all routes
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // API routes - add CORS restrictions
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'https://letsqueeze.app'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ],
      }
    ];
  },

  // Capacitor will use remote server (Vercel)
  // No need for static export with dynamic routes
};

export default nextConfig;
