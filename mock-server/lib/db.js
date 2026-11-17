// =====================================================================
// KHO DỮ LIỆU CỦA BE GIẢ
// Lưu ở mock-server/.data/db.json (tự tạo lần đầu từ seed.js). Web khách (5173) và trang
// quản trị (5174) cùng gọi vào server này nên dùng CHUNG một dữ liệu, giống như dùng chung database.
// Đặt lại dữ liệu demo: nút "Đặt lại dữ liệu demo" trên thanh DEMO, hoặc xoá thư mục .data rồi chạy lại.
// Mọi object có ĐÚNG DẠNG response của fashion-commerce-backend (xem docs/FRONTEND_API_CONTRACT.md của BE).
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeed } from './seed.js';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const VERSION = 6; // tăng số này khi đổi cấu trúc seed -> dữ liệu cũ tự được tạo lại

let cache = null;

export function loadDb() {
  if (cache) return cache;
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (data && data.version === VERSION) {
      cache = data;
      return cache;
    }
  } catch {
    /* chưa có file hoặc file hỏng -> tạo lại */
  }
  cache = buildSeed();
  cache.version = VERSION;
  saveDb();
  return cache;
}

export function saveDb() {
  if (!cache) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const text = JSON.stringify(cache);
  const temp = `${DATA_FILE}.tmp`;
  try {
    fs.writeFileSync(temp, text);
    fs.renameSync(temp, DATA_FILE);
  } catch {
    // Windows: đổi tên đè file có thể bị chặn (EPERM/EBUSY) -> ghi thẳng
    fs.writeFileSync(DATA_FILE, text);
    fs.rmSync(temp, { force: true });
  }
}

export function resetDb() {
  cache = null;
  fs.rmSync(DATA_FILE, { force: true });
  return loadDb();
}

export * from './util.js';
