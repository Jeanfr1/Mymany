import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS project. The home directory also contains a
  // lockfile/git repo, which Next would otherwise infer as the root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
