import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hello-pangea/dnd"],
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3", "lucide-react"],
};

export default nextConfig;
