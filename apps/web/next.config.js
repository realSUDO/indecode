/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/trpc/:path*",
        destination: process.env.NODE_ENV === "production" ? "http://api:8080/trpc/:path*" : "http://127.0.0.1:8000/trpc/:path*",
      },
      {
        source: "/api/:path*",
        destination: process.env.NODE_ENV === "production" ? "http://api:8080/api/:path*" : "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
