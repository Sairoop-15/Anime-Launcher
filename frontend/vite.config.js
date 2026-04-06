import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /api calls to deployed backend on Render
      "/api": {
        target: "https://anime-launcher-4.onrender.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});