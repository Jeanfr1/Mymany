import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js-only marker packages; stub them out for the node test env.
      "server-only": fileURLToPath(new URL("./test/stubs/empty.ts", import.meta.url)),
      "client-only": fileURLToPath(new URL("./test/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
