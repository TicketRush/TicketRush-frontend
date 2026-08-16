// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Dev proxy to avoid CORS when backend runs on localhost:8080
    // Requests to `/api/*` will be forwarded to the backend.
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // 1031KB 청크가 1개로 묶여 경고가 떠서, vendor 라이브러리를 별도 청크로 분리.
    // manualChunks를 함수형으로 작성하면 타입 안전 + 유연한 매칭 가능.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("@tanstack/react-query")) {
              return "vendor-react-query";
            }
            if (id.includes("qrcode.react")) return "vendor-qrcode";
            if (id.includes("html2canvas")) return "vendor-html2canvas";
          }
          return undefined;
        },
      },
    },
    // 청크 크기 경고 기준 700KB로 상향 (vendor 청크는 자연스럽게 큼)
    chunkSizeWarningLimit: 700,
  },
});
