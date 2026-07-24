import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-build",
  transpilePackages: ["@hello-pangea/dnd"],
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  allowedDevOrigins: ["10.114.20.1", "10.114.20.1:3001"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
