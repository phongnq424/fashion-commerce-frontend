// =====================================================================
// Kiểm tra thông tin thẻ ở trang thanh toán (chỉ kiểm tra định dạng trên trình duyệt).
// KHÔNG lưu, KHÔNG gửi số thẻ đi đâu. Khi có cổng thanh toán thật (VNPay, OnePay, Stripe...),
// số thẻ phải được nhập trong ô / trang của cổng đó, website chỉ nhận lại mã giao dịch.
// =====================================================================

const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');

// Nhận diện loại thẻ theo các số đầu
export function detectCardBrand(number) {
  const n = digitsOnly(number);
  if (/^9704/.test(n)) return 'napas'; // thẻ ATM nội địa Việt Nam
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^35(2[89]|[3-8]\d)/.test(n)) return 'jcb';
  return null;
}

const MAX_LENGTH = { amex: 15, napas: 19, default: 19 };

// "4111111111111111" -> "4111 1111 1111 1111" (Amex: 4-6-5)
export function formatCardNumber(value) {
  const brand = detectCardBrand(value);
  const n = digitsOnly(value).slice(0, MAX_LENGTH[brand] ?? MAX_LENGTH.default);
  if (brand === 'amex') return [n.slice(0, 4), n.slice(4, 10), n.slice(10)].filter(Boolean).join(' ');
  return n.replace(/(\d{4})(?=\d)/g, '$1 ');
}

// "0428" -> "04 / 28"
export function formatMonthYear(value) {
  const n = digitsOnly(value).slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)} / ${n.slice(2)}` : n;
}

// Thuật toán Luhn: phát hiện gõ nhầm 1 số / đảo 2 số
function passesLuhn(number) {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i -= 1) {
    let digit = Number(number[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function parseMonthYear(value) {
  const n = digitsOnly(value);
  if (n.length !== 4) return null;
  const month = Number(n.slice(0, 2));
  const year = 2000 + Number(n.slice(2));
  if (month < 1 || month > 12) return null;
  return { month, year };
}

/**
 * card: { number, expiry, cvc, holder, issueDate }
 * Trả về { tênÔ: 'key lỗi' } (giao diện dịch bằng t). Rỗng = hợp lệ.
 * Thẻ quốc tế: số thẻ + ngày hết hạn + mã bảo mật
 * Thẻ ATM nội địa (NAPAS 9704): số thẻ + tên chủ thẻ + ngày phát hành
 */
export function validateCard(card, now = new Date()) {
  const errors = {};
  const number = digitsOnly(card.number);
  const brand = detectCardBrand(number);

  if (!number) errors.number = 'checkout.card.errors.numberRequired';
  else if (brand === 'napas' ? ![16, 19].includes(number.length) : number.length < 13 || !passesLuhn(number)) {
    errors.number = 'checkout.card.errors.numberInvalid';
  }

  const thisMonth = now.getFullYear() * 12 + now.getMonth() + 1;
  if (brand === 'napas') {
    if (String(card.holder ?? '').trim().length < 2) errors.holder = 'checkout.card.errors.holderRequired';
    const issued = parseMonthYear(card.issueDate);
    if (!issued) errors.issueDate = 'checkout.card.errors.dateInvalid';
    else if (issued.year * 12 + issued.month > thisMonth) errors.issueDate = 'checkout.card.errors.issueFuture';
  } else {
    const expiry = parseMonthYear(card.expiry);
    if (!expiry) errors.expiry = 'checkout.card.errors.dateInvalid';
    else if (expiry.year * 12 + expiry.month < thisMonth) errors.expiry = 'checkout.card.errors.expired';
    const cvcLength = brand === 'amex' ? 4 : 3;
    if (digitsOnly(card.cvc).length !== cvcLength) errors.cvc = brand === 'amex' ? 'checkout.card.errors.cvc4' : 'checkout.card.errors.cvc3';
  }
  return errors;
}

// Chỉ giữ 4 số cuối để hiện lại ("•••• 4242"), không giữ số thẻ đầy đủ
export const cardLast4 = (number) => digitsOnly(number).slice(-4);
