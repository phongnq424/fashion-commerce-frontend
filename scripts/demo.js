// npm run demo -> bật cùng lúc: BE giả (8080) + web mua sắm (5173) + trang quản trị (5174).
// Nhấn Ctrl + C để tắt cả ba. Chỉ dùng thư viện có sẵn của Node.
//
// - Cổng 8080 đã có BE giả chạy sẵn (lần chạy trước) -> dùng luôn, không báo lỗi.
// - Cổng 8080 đang có Backend thật -> dùng Backend thật (không có tài khoản demo).
// - Cổng 5173 / 5174 đang bận -> báo rõ chương trình nào chiếm và cách tắt.
// - Tắt bằng Ctrl + C: trên Windows tắt cả "cây" tiến trình (taskkill /T), không để node chạy ngầm giữ cổng.
import { spawn, execSync } from 'node:child_process';
import net from 'node:net';

const isWindows = process.platform === 'win32';
const children = [];

// Cổng có đang bị chiếm không (thử mở server ở cổng đó)
function isPortBusy(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(true))
      .once('listening', () => tester.close(() => resolve(false)))
      .listen(port);
  });
}

// Cổng 8080 đang là gì: 'mock' (BE giả) | 'backend' (có trả lời nhưng không phải BE giả) | 'free'
async function probe8080() {
  if (!(await isPortBusy(8080))) return 'free';
  try {
    const res = await fetch('http://localhost:8080/api/v1/__mock/accounts', { signal: AbortSignal.timeout(2000) });
    if (res.ok) return 'mock';
  } catch {
    /* không trả lời HTTP */
  }
  return 'backend';
}

// Tên + PID chương trình đang giữ cổng (để người dùng biết mà tắt)
function whoUses(port) {
  try {
    if (isWindows) {
      const out = execSync(`netstat -ano -p tcp | findstr LISTENING | findstr :${port}`, { encoding: 'utf8' });
      const pid = out.trim().split(/\s+/).pop();
      const name = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' }).split(',')[0]?.replace(/"/g, '');
      return `${name || 'không rõ'} (PID ${pid})`;
    }
    return execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN | tail -n +2 | awk '{print $1" (PID "$2")"}'`, { encoding: 'utf8' }).trim() || 'không rõ';
  } catch {
    return 'không rõ';
  }
}

function killHint(port) {
  return isWindows
    ? `PowerShell: Get-NetTCPConnection -LocalPort ${port} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
    : `lsof -ti tcp:${port} | xargs kill`;
}

function start(name, script) {
  // Truyền cả câu lệnh 1 chuỗi (không có tham số do người dùng nhập) -> không còn cảnh báo DEP0190 của Node
  const child = spawn(`npm run ${script}`, { shell: true, env: process.env });
  const print = (stream) => (chunk) =>
    String(chunk)
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => stream.write(`[${name}] ${line}\n`));
  child.stdout.on('data', print(process.stdout));
  child.stderr.on('data', print(process.stderr));
  child.on('exit', (code) => {
    if (code) console.log(`[${name}] đã dừng (mã ${code})`);
  });
  children.push(child);
}

function stopAll() {
  children.forEach((child) => {
    if (!child.pid || child.exitCode !== null) return;
    try {
      if (isWindows) execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
      else child.kill('SIGTERM');
    } catch {
      /* đã tắt */
    }
  });
  process.exit(0);
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

const problems = [];

const backend = await probe8080();
if (backend === 'free') start('mock ', 'mock');
else if (backend === 'mock') console.log('[mock ] BE giả đã chạy sẵn ở cổng 8080 (từ lần trước) -> dùng luôn.');
else {
  console.log(`[mock ] Cổng 8080 đang có chương trình khác: ${whoUses(8080)}.`);
  console.log('[mock ] Nếu đó là Backend thật (Spring Boot) thì web sẽ dùng Backend thật — KHÔNG có tài khoản demo.');
  console.log(`[mock ] Muốn dùng BE giả: tắt chương trình đó rồi chạy lại.  ${killHint(8080)}`);
}

for (const [name, script, port] of [
  ['web  ', 'dev', 5173],
  ['admin', 'dev:admin', 5174],
]) {
  if (await isPortBusy(port)) {
    problems.push(`[${name}] Cổng ${port} đang bận bởi ${whoUses(port)} — có thể là lần chạy demo trước chưa tắt hẳn.\n        Mở thẳng http://localhost:${port} nếu nó vẫn chạy, hoặc tắt rồi chạy lại:  ${killHint(port)}`);
  } else {
    start(name, script);
  }
}

console.log('\nĐang bật demo:  web mua sắm http://localhost:5173  |  quản trị http://localhost:5174  |  BE giả http://localhost:8080');
console.log('Nhấn Ctrl + C để tắt tất cả.\n');
problems.forEach((p) => console.log(p));
