// =====================================================================
// BE GIẢ (mock server) — chạy ở http://localhost:8080, ĐÚNG địa chỉ của Backend thật.
//
//   npm run mock      -> chỉ bật BE giả
//   npm run demo      -> bật BE giả + web khách (5173) + trang quản trị (5174)
//
// Web khách và trang quản trị đều gọi /api/v1/... qua proxy của Vite tới cổng 8080, nên:
//   - Đang chạy BE giả  -> dùng dữ liệu mẫu trong mock-server/.data/db.json (2 app dùng chung).
//   - Tắt BE giả, bật Backend thật (cũng cổng 8080) -> FE gọi thẳng BE thật, KHÔNG cần sửa code FE.
//
// Chỉ dùng thư viện có sẵn của Node (không cần cài thêm gói nào).
// =====================================================================
import http from 'node:http';
import { handleMockRequest, mockRoutes } from './lib/router.js';
import { loadDb, resetDb } from './lib/db.js';
import { DEMO_OTP, DEMO_PASSWORD, describeDemoAccounts } from './lib/seed.js';

const PORT = Number(process.env.MOCK_PORT ?? 8080);
const BASE = '/api/v1';
const MAX_BODY = 2 * 1024 * 1024;

function send(res, status, data, contentType = 'application/json; charset=utf-8') {
  const payload = data == null ? '' : typeof data === 'string' && !contentType.includes('json') ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    // Cho phép gọi thẳng (không qua proxy) từ 2 app khi dev
    'Access-Control-Allow-Origin': res.req.headers.origin ?? '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key, X-Device-Label',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  });
  res.end(status === 204 ? undefined : payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body quá lớn'), { status: 413, code: 'REQUEST_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text) return resolve(undefined);
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(Object.assign(new Error('JSON không hợp lệ'), { status: 400, code: 'REQUEST_INVALID' }));
      }
    });
    req.on('error', reject);
  });
}

const apiError = (status, code, message, path) => ({ timestamp: new Date().toISOString(), status, code, message, path });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') return send(res, 204, null);
  if (!url.pathname.startsWith(BASE)) {
    return send(res, 404, apiError(404, 'NOT_FOUND', 'BE giả chỉ phục vụ /api/v1', url.pathname));
  }
  const path = url.pathname.slice(BASE.length) + url.search;

  // ----- Route riêng của bản demo (BE thật KHÔNG có) -----
  if (url.pathname === `${BASE}/__mock/accounts` && req.method === 'GET') {
    return send(res, 200, { password: DEMO_PASSWORD, otp: DEMO_OTP, accounts: describeDemoAccounts(loadDb()) });
  }
  if (url.pathname === `${BASE}/__mock/reset` && req.method === 'POST') {
    resetDb();
    console.log('[mock] Đã đặt lại dữ liệu demo');
    return send(res, 204, null);
  }

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    const headers = { get: (name) => req.headers[String(name).toLowerCase()] ?? null };
    const result = await handleMockRequest({ method: req.method, path, body, headers });
    if (typeof result === 'string') return send(res, 200, result, 'text/csv; charset=utf-8');
    // BE thật trả 201 cho một số API tạo mới; FE chỉ kiểm tra response.ok nên BE giả trả 200 cho gọn.
    if (result == null) return send(res, 204, null);
    return send(res, 200, result);
  } catch (error) {
    const status = error?.status ?? 500;
    if (status >= 500) console.error('[mock] Lỗi', req.method, url.pathname, error);
    return send(res, status, apiError(status, error?.code ?? 'INTERNAL_ERROR', error?.message ?? 'Lỗi BE giả', url.pathname));
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n[mock] Cổng ${PORT} đang bận. Có thể Backend thật (hoặc một BE giả khác) đang chạy.`);
    console.error('[mock] Tắt chương trình đang dùng cổng đó, hoặc đặt MOCK_PORT=8081 và sửa proxy trong vite config.\n');
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
  loadDb();
  console.log(`\n[mock] BE giả đang chạy: http://localhost:${PORT}${BASE}  (${mockRoutes().length} route)`);
  console.log(`[mock] Dữ liệu: mock-server/.data/db.json  |  Mật khẩu demo: ${DEMO_PASSWORD}  |  OTP: ${DEMO_OTP}\n`);
});
