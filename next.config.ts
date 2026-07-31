import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // @libsql/client loads native bindings for local `file:` databases; leaving it
  // unbundled keeps both the dev server and the production build working.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
