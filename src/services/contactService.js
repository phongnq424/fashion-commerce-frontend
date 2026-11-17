// =====================================================================
// Form "Liên hệ với chúng tôi".
// Backend CHƯA có API nhận liên hệ. Trước đây form giả vờ "gửi thành công" nhưng không lưu đi đâu.
// Nay form mở ứng dụng email của khách (mailto:) với nội dung đã điền sẵn, gửi tới email của sàn.
// Khi backend có API (vd POST /api/v1/contact-messages), thay buildContactMailto bằng lời gọi apiClient,
// giữ nguyên dữ liệu: { name, email, phone, message }.
// =====================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Số di động Việt Nam: 0xxxxxxxxx hoặc +84xxxxxxxxx (10 số), cho phép gõ khoảng trắng / dấu chấm
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 1000;

const cleanPhone = (value) => String(value ?? '').replace(/[\s.-]/g, '');

/**
 * form: { name, email, phone, message }
 * Trả về { tênÔ: 'key lỗi' } (giao diện dịch bằng t). Rỗng = hợp lệ.
 */
export function validateContactForm(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'contact.errors.nameRequired';

  if (!form.email.trim()) errors.email = 'contact.errors.emailRequired';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'contact.errors.emailInvalid';

  if (!form.phone.trim()) errors.phone = 'contact.errors.phoneRequired';
  else if (!PHONE_RE.test(cleanPhone(form.phone))) errors.phone = 'contact.errors.phoneInvalid';

  const message = form.message.trim();
  if (!message) errors.message = 'contact.errors.messageRequired';
  else if (message.length < MESSAGE_MIN) errors.message = 'contact.errors.messageShort';
  return errors;
}

// Link mailto: tới email của sàn, tiêu đề + nội dung điền sẵn từ form
export function buildContactMailto(form, toEmail, subject) {
  const body = [
    form.message.trim().slice(0, MESSAGE_MAX),
    '',
    '---',
    `${form.name.trim()} · ${cleanPhone(form.phone)} · ${form.email.trim()}`,
  ].join('\n');
  return `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
