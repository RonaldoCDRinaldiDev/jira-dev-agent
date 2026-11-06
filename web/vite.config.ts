import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: a UI roda em :5173 e faz proxy de /api para o backend (:7788).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:7788" },
  },
  build: { outDir: "dist" },
});
