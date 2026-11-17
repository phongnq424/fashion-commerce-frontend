// =====================================================================
// BỘ ĐỊNH TUYẾN CỦA BE GIẢ
// Mỗi route khớp đúng method + đường dẫn của fashion-commerce-backend và trả về đúng dạng response,
// nên FE không cần biết đang chạy với BE giả hay BE thật.
// =====================================================================
import { loadDb, MockError, saveDb } from './db.js';
import { TOKEN_PREFIX } from './guard.js';
import { authRoutes } from './routes/auth.js';
import { buyerRoutes } from './routes/buyer.js';
import { sellerRoutes } from './routes/seller.js';
import { adminRoutes } from './routes/admin.js';

const ROUTES = [...authRoutes, ...buyerRoutes, ...sellerRoutes, ...adminRoutes].map(([method, pattern, handler]) => {
  const names = [];
  const regex = new RegExp(
    `^${pattern.replace(/\{(\w+)\}/g, (_, name) => {
      names.push(name);
      return '([^/]+)';
    })}$`,
  );
  return { method, regex, names, handler, pattern };
});

// Đọc người dùng từ "Authorization: Bearer mock-access.<userId>~<sessionId>"
function readIdentity(db, headers) {
  const token = String(headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token.startsWith(TOKEN_PREFIX)) return { me: null, sessionId: null };
  const [userId, sessionId] = token.slice(TOKEN_PREFIX.length).split('~');
  const session = (db.sessions ?? []).find((s) => s.id === sessionId && s.userId === userId);
  if (!session || session.revokedAt) return { me: null, sessionId: null };
  const user = db.users.find((u) => u.id === userId);
  if (!user || user.status !== 'ACTIVE') return { me: null, sessionId: null };
  session.lastUsedAt = new Date().toISOString();
  return { me: user, sessionId };
}

/**
 * method: 'GET' | 'POST' | ...   path: '/shops/123/orders?status=...' (không có /api/v1)
 * headers: object có hàm get(name). Trả về dữ liệu như Backend, hoặc ném MockError { status, code, message }.
 */
export async function handleMockRequest({ method, path, body, headers }) {
  const url = new URL(path, 'http://mock.local');
  const route = ROUTES.find((r) => r.method === method && r.regex.test(url.pathname));
  if (!route) throw new MockError(404, 'MOCK_ROUTE_NOT_FOUND', `BE giả chưa có ${method} ${url.pathname}`);
  const match = url.pathname.match(route.regex);
  const params = Object.fromEntries(route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]));
  const db = loadDb();
  const { me, sessionId } = readIdentity(db, headers);
  const ctx = { db, method, params, query: url.searchParams, body: body ?? {}, headers, me, sessionId };
  const result = await route.handler(ctx);
  if (method !== 'GET') saveDb();
  if (typeof result === 'string') return result;
  return result === undefined ? null : JSON.parse(JSON.stringify(result));
}

export const mockRoutes = () => ROUTES.map((r) => `${r.method} ${r.pattern}`);
