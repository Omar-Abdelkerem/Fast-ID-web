import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET;

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: devProxyTarget
    ? {
        proxy: {
          "/api": {
            target: devProxyTarget,
            changeOrigin: true,
          },
        },
      }
    : undefined,
});
