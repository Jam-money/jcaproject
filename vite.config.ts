import { defineConfig } from "@lovable.dev/vite-tanstack-config/dist/index.js";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server", preset: "node" },
  },
  vite: {
    publicDir: "public",
    build: {
      outDir: "dist/client",
    },
  },
});