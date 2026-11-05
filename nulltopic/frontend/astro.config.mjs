import { defineConfig } from "astro/config";
export default defineConfig({
  server: { port: Number(process.env.FRONTEND_PORT || 4321) },
  vite: {
    server: {
      proxy: {
        "/api": {
          target: process.env.BACKEND_URL || "http://127.0.0.1:4322",
          changeOrigin: false,
          timeout: 0,
          proxyTimeout: 0,
        },
      },
    },
  },
});
