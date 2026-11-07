// =====================================================================
// Tạo mã QR (chuẩn ISO/IEC 18004) — không cần thư viện ngoài.
// Chế độ byte (UTF-8), mức sửa lỗi M (~15%), tự chọn phiên bản 1-40 và mặt nạ tốt nhất.
// Dựa theo thuật toán của "QR Code generator" (Project Nayuki, MIT).
// Dùng: const matrix = createQrMatrix('nội dung');  // mảng 2 chiều true = ô đen
// =====================================================================

// Mức sửa lỗi M, chỉ số = phiên bản (0 không dùng)
const ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
const ECL_FORMAT_BITS = 0; // M

const getBit = (value, index) => ((value >>> index) & 1) !== 0;

function rawDataModules(version) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const dataCodewords = (version) =>
  Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[version] * NUM_BLOCKS[version];

// ----- Reed-Solomon trên GF(2^8) -----
function gfMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree) {
  const result = new Array(degree - 1).fill(0).concat([1]);
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data, divisor) {
  const result = divisor.map(() => 0);
  data.forEach((byte) => {
    const factor = byte ^ result.shift();
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMultiply(coef, factor);
    });
  });
  return result;
}

// ----- Mã hoá dữ liệu -> các codeword (đã thêm mã sửa lỗi + xen kẽ khối) -----
function encodeCodewords(bytes, version) {
  const bits = [];
  const push = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4); // chế độ byte
  push(bytes.length, version <= 9 ? 8 : 16);
  bytes.forEach((byte) => push(byte, 8));

  const capacityBits = dataCodewords(version) * 8;
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);

  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  const numBlocks = NUM_BLOCKS[version];
  const eccLen = ECC_PER_BLOCK[version];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = rsDivisor(eccLen);

  const blocks = [];
  for (let i = 0, k = 0; i < numBlocks; i += 1) {
    const block = data.slice(k, k + shortBlockLen - eccLen + (i < numShortBlocks ? 0 : 1));
    k += block.length;
    const ecc = rsRemainder(block, divisor);
    if (i < numShortBlocks) block.push(0);
    blocks.push(block.concat(ecc));
  }

  const result = [];
  for (let i = 0; i < blocks[0].length; i += 1) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - eccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

// ----- Vẽ ma trận -----
function buildMatrix(version, codewords, mask) {
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFunction = (x, y, dark) => {
    modules[y][x] = dark;
    isFunction[y][x] = true;
  };

  // Vạch định thời
  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  // 3 ô vuông định vị ở góc
  const drawFinder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFunction(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Ô căn chỉnh
  if (version > 1) {
    const numAlign = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const positions = [6];
    for (let pos = size - 7; positions.length < numAlign; pos -= step) positions.splice(1, 0, pos);
    positions.forEach((py, i) => {
      positions.forEach((px, j) => {
        const corner = (i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0);
        if (corner) return;
        for (let dy = -2; dy <= 2; dy += 1) {
          for (let dx = -2; dx <= 2; dx += 1) setFunction(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      });
    });
  }

  // Thông tin định dạng (mức sửa lỗi + mặt nạ)
  const drawFormat = () => {
    const data = (ECL_FORMAT_BITS << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i += 1) setFunction(8, i, getBit(bits, i));
    setFunction(8, 7, getBit(bits, 6));
    setFunction(8, 8, getBit(bits, 7));
    setFunction(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, getBit(bits, i));
    setFunction(8, size - 8, true);
  };
  drawFormat();

  // Thông tin phiên bản (từ phiên bản 7)
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, getBit(bits, i));
      setFunction(b, a, getBit(bits, i));
    }
  }

  // Dữ liệu (đi zigzag từ góc dưới phải)
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y][x] && bitIndex < codewords.length * 8) {
          modules[y][x] = getBit(codewords[bitIndex >>> 3], 7 - (bitIndex & 7));
          bitIndex += 1;
        }
      }
    }
  }

  // Mặt nạ
  const maskTest = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ][mask];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!isFunction[y][x] && maskTest(x, y)) modules[y][x] = !modules[y][x];
    }
  }
  return modules;
}

// Điểm phạt theo chuẩn (càng thấp càng dễ quét) -> chọn mặt nạ tốt nhất
function penalty(modules) {
  const size = modules.length;
  let score = 0;
  const runScore = (line) => {
    let total = 0;
    let run = 1;
    for (let i = 1; i <= line.length; i += 1) {
      if (i < line.length && line[i] === line[i - 1]) run += 1;
      else {
        if (run >= 5) total += 3 + (run - 5);
        run = 1;
      }
    }
    const pattern = [true, false, true, true, true, false, true];
    for (let i = 0; i + 7 <= line.length; i += 1) {
      if (pattern.every((v, k) => line[i + k] === v)) {
        const before = line.slice(Math.max(0, i - 4), i);
        const after = line.slice(i + 7, i + 11);
        if ((before.length === 4 && before.every((v) => !v)) || (after.length === 4 && after.every((v) => !v))) total += 40;
      }
    }
    return total;
  };
  for (let y = 0; y < size; y += 1) score += runScore(modules[y]);
  for (let x = 0; x < size; x += 1) score += runScore(modules.map((row) => row[x]));
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
    }
  }
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  score += Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10;
  return score;
}

export function createQrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 1;
  while (version <= 40 && bytes.length + (version <= 9 ? 2 : 3) > dataCodewords(version)) version += 1;
  if (version > 40) throw new Error('Nội dung quá dài để tạo mã QR');
  const codewords = encodeCodewords(bytes, version);

  let best = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const matrix = buildMatrix(version, codewords, mask);
    const score = penalty(matrix);
    if (score < bestScore) {
      best = matrix;
      bestScore = score;
    }
  }
  return best;
}
