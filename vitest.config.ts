import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "lib/__tests__/mock-server-only.ts"),
    },
  },
  test: { include: ["lib/**/*.test.ts"], testTimeout: 60_000 },
});
