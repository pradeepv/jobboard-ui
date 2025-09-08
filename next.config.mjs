/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep it simple: always proxy /api/* to backend in dev
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8082/api/:path*",
      },
    ];
  },

  // Add a header so we can confirm config is applied on any route
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Config-Loaded", value: "yes" }],
      },
    ];
  },
};

export default nextConfig;