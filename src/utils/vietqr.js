// =====================================================================
// Nội dung mã VietQR (chuẩn EMVCo / NAPAS) để app ngân hàng quét là tự điền:
// ngân hàng + số tài khoản + số tiền + nội dung chuyển khoản.
// Chỉ tạo CHUỖI nội dung, việc vẽ mã QR nằm ở utils/qrcode.js
// =====================================================================

// 1 trường = mã (2 số) + độ dài (2 số) + giá trị
const field = (id, value) => `${id}${String(value.length).padStart(2, '0')}${value}`;

// CRC-16/CCITT-FALSE (bắt buộc ở cuối chuỗi VietQR)
function crc16(text) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Nội dung chuyển khoản trong QR: không dấu, chỉ chữ / số / khoảng trắng, tối đa 25 ký tự
// (nhiều ngân hàng cắt hoặc từ chối ký tự đặc biệt)
export function toTransferNote(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 25);
}

/**
 * bankBin: mã ngân hàng 6 số của NAPAS (Vietcombank = 970436)
 * accountNumber: số tài khoản nhận tiền
 * amount: số tiền (đồng). Bỏ trống -> khách tự nhập số tiền trong app
 * note: nội dung chuyển khoản
 */
export function buildVietQrPayload({ bankBin, accountNumber, amount, note }) {
  const beneficiary = field('00', bankBin) + field('01', accountNumber);
  const merchant = field('00', 'A000000727') + field('01', beneficiary) + field('02', 'QRIBFTTA');
  const cleanNote = toTransferNote(note);
  const hasAmount = Number.isFinite(amount) && amount > 0;

  let payload =
    field('00', '01') +
    field('01', hasAmount ? '12' : '11') + // 12 = mã dùng 1 lần (có số tiền), 11 = dùng nhiều lần
    field('38', merchant) +
    field('53', '704') + // VND
    (hasAmount ? field('54', String(Math.round(amount))) : '') +
    field('58', 'VN') +
    (cleanNote ? field('62', field('08', cleanNote)) : '');
  payload += '6304';
  return payload + crc16(payload);
}
