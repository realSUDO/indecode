/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: 'output: standalone' removed - only needed for Docker/VPS deploys.
  // Vercel handles this automatically.
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/trpc/:path*",
        destination: `${apiUrl}/trpc/:path*`,
      },
      {
        source: "/api/webhooks/:path*",
        destination: `${apiUrl}/api/webhooks/:path*`,
      },
    ];
  },
};

export default nextConfig;
