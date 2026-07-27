import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next-build",
  transpilePackages: ["@hello-pangea/dnd"],
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  allowedDevOrigins: ["10.114.20.1", "10.114.20.1:3001"],
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    config.resolve.alias["lucide-react"] = path.resolve(
      process.cwd(),
      "node_modules/lucide-react/dist/cjs/lucide-react.js"
    );
    return config;
  },
};

export default nextConfig;
