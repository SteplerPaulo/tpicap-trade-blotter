import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const apiTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3001";

  const usePolling = process.env.VITE_USE_POLLING === "true";

  return {
    plugins: [react()],

    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,

      watch: {
        usePolling,
        interval: 300,
      },

      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },

        "/socket.io": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
