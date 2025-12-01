import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ===========================================
  // REDIRECTS
  // Configure route redirects for URL changes
  // ===========================================
  async redirects() {
    return [
      // Example: Redirect old blog URLs to new ones
      // {
      //   source: '/old-blog-post',
      //   destination: '/blog/new-blog-post',
      //   permanent: true, // 301 redirect
      // },
      
      // Redirect /login to /auth/signin
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/auth/signup',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/auth/signup',
        permanent: true,
      },
    ];
  },

  // ===========================================
  // REWRITES
  // For multi-domain routing (if needed)
  // ===========================================
  async rewrites() {
    return {
      beforeFiles: [
        // Handle app subdomain routing
        // This is configured via Vercel or your hosting provider
        // but you can add specific rewrites here if needed
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // ===========================================
  // HEADERS
  // Security and caching headers
  // ===========================================
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // Cache static assets
        source: '/(.*).(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // ===========================================
  // IMAGES
  // Configure image optimization domains
  // ===========================================
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bmmhzxnwveeeqpaujhrd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // ===========================================
  // EXPERIMENTAL FEATURES
  // ===========================================
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // ===========================================
  // ENVIRONMENT
  // ===========================================
  env: {
    // These will be available at build time
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://app.aitextspeak.com',
  },

  // ===========================================
  // TYPESCRIPT
  // ===========================================
  typescript: {
    // Set to true during development to see errors
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
