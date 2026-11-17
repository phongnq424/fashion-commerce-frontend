import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// TRANG QUẢN TRỊ SÀN — app riêng, http://localhost:5174   (npm run dev:admin)
// - Mã nguồn: thư mục admin/. Dùng lại component/service chung của web qua alias @shared -> src/.
// - Cùng gọi /api/v1 tới cổng 8080 như web khách -> chung Backend, chung database.
// - Khác cổng = khác "origin" -> phiên đăng nhập, localStorage tách hẳn khỏi web mua sắm.
// - Build ra dist-admin/ (deploy lên tên miền / máy riêng, ví dụ admin.trendylab.vn).
const shared = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('./admin', import.meta.url)),
  envDir: fileURLToPath(new URL('.', import.meta.url)), // dùng chung file .env ở thư mục gốc
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@shared': shared } },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] },
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
  preview: { port: 4174 },
  build: { outDir: fileURLToPath(new URL('./dist-admin', import.meta.url)), emptyOutDir: true },
});
