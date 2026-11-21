import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "");
  // when the real API runs on another origin, the dev server forwards /api to it
  const proxyTarget = env.VITE_DEV_PROXY_TARGET;

  return {
    // the app can be served from a sub path (for example the GitHub Pages demo)
    base: env.VITE_BASE_PATH || "/",
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(rootDir, "src") } },
    server: proxyTarget ? { proxy: { "/api": { target: proxyTarget, changeOrigin: true } } } : {},
  };
});
