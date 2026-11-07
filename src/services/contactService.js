// =====================================================================
// Gửi form "Liên hệ với chúng tôi".
// Backend hiện CHƯA có API nhận liên hệ -> tạm giả lập gửi thành công (không lưu đi đâu).
// Khi backend có API (vd POST /api/v1/contact-messages), thay phần giả lập trong
// sendContactMessage bằng lời gọi apiClient, giữ nguyên dữ liệu gửi lên: { name, email, phone, message }.
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

export async function sendContactMessage(form) {
  const payload = {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: cleanPhone(form.phone),
    message: form.message.trim().slice(0, MESSAGE_MAX),
  };
  // ----- GIẢ LẬP (xoá khi có API thật) -----
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { ok: true, payload };
}
