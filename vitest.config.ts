import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Pure mobile helpers are tested here without loading Expo's native tsconfig.
  esbuild: {
    tsconfigRaw: JSON.stringify({
      compilerOptions: { target: "ES2020", jsx: "react-jsx" },
    }),
  },
  resolve: {
    // Cùng alias với tsconfig để test import được "@/lib/...".
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
