/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // If you set NEXT_PUBLIC_API_BASE, the frontend will call that directly.
    // Otherwise, proxy /api/* to your Spring backend on 8082.
    if (process.env.NEXT_PUBLIC_API_BASE) return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8082/api/:path*",
      },
    ];
  },
};

export default nextConfig;