import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// WEB MUA SẮM + KÊNH NGƯỜI BÁN (/seller) — http://localhost:5173   (npm run dev)
// Trang quản trị sàn là app riêng: vite.admin.config.js (npm run dev:admin, cổng 5174).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // /api/... -> cổng 8080: Backend thật, hoặc BE giả khi chạy `npm run mock`
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Cổng 8080 chưa có Backend / BE giả -> trả lỗi rõ ràng để màn hình báo "chưa bật Backend"
        configure: (proxy) => {
          proxy.on('error', (error, req, res) => {
            console.error(`
[proxy] Không kết nối được http://localhost:8080 (${error.code}). Chạy "npm run mock" (BE giả) hoặc bật Backend thật.
`);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ status: 503, code: 'BACKEND_UNREACHABLE', message: 'Backend chưa chạy ở cổng 8080', path: req.url }));
            }
          });
        },
      },
    },
  },
  preview: { port: 4173 },
  build: { outDir: 'dist' },
});
