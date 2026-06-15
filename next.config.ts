import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*"],
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:3001/socket.io/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
