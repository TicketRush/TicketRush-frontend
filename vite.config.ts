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
  build: {
    // 1031KB 청크가 1개로 묶여 경고가 떠서, 도메인별로 청크 분리.
    // - admin: 관리자 영역(recharts 포함) 별도 청크
    // - vendor-charts: recharts는 크기가 커서 단독 분리
    // - vendor-react-query: tanstack 분리
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-qrcode": ["qrcode.react"],
        },
      },
    },
    // 청크 크기 경고 기준 700KB로 상향 (vendor 청크는 자연스럽게 큼)
    chunkSizeWarningLimit: 700,
  },
});
