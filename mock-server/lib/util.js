// Tiện ích dùng chung cho BE giả (không phụ thuộc kho dữ liệu)
// ----- tiện ích -----
export const now = () => new Date().toISOString();
export const daysAgo = (days, hour = 10) => {
  const d = new Date(Date.now() - days * 86400000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// UUID cố định sinh từ 1 chuỗi (để id sản phẩm mẫu không đổi giữa các lần tạo lại dữ liệu)
export function stableUuid(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(2);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Lỗi đúng dạng ApiError của Backend
export class MockError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const fail = (status, code, message) => {
  throw new MockError(status, code, message);
};
export const notFound = (code = 'NOT_FOUND') => fail(404, code, 'Not found');
export const forbidden = () => fail(403, 'AUTH_FORBIDDEN', 'Forbidden');
export const conflict = (code) => fail(409, code, code);
export const bad = (code = 'REQUEST_INVALID') => fail(400, code, code);

// SliceResponse { items, limit, offset, hasMore }
export function slice(list, query) {
  const limit = Math.min(100, Math.max(1, Number(query.get('limit') ?? 20)));
  const offset = Math.max(0, Number(query.get('offset') ?? 0));
  return { items: list.slice(offset, offset + limit), limit, offset, hasMore: offset + limit < list.length };
}

export const byNewest = (field = 'createdAt') => (a, b) => String(b[field] ?? '').localeCompare(String(a[field] ?? ''));

export const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

export function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function pushNotification(db, userId, type, title, body, payload = {}) {
  db.notifications.unshift({ id: uuid(), userId, type, title, body, payload, readAt: null, createdAt: now() });
}
