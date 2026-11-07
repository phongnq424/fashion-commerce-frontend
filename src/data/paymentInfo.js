// =====================================================================
// THÔNG TIN CHUYỂN KHOẢN NGÂN HÀNG (hiện khi khách chọn "Chuyển khoản ngân hàng" ở trang thanh toán)
// Đổi tài khoản nhận tiền -> sửa ở đây. Câu chữ xung quanh: vi.js / en.js -> checkout.bankTransfer
// "Nội dung chuyển khoản" tự điền số điện thoại khách nhập ở bước Thông tin giao hàng.
// =====================================================================

export const BANK_TRANSFER = {
  bankName: 'Vietcombank (TMCP Ngoại thương VN) – Chi nhánh Thủ Thiêm',
  accountNumber: '1086606495',
  accountName: 'HỘ KINH DOANH TRENDYLAB',

  // ----- Mã QR chuyển khoản (chuẩn VietQR — app ngân hàng nào ở VN cũng quét được) -----
  // Quét là app tự điền: ngân hàng + số tài khoản + số tiền của đơn + nội dung (số điện thoại khách).
  // bankBin: mã ngân hàng 6 số của NAPAS. Vietcombank = 970436
  //   (vài mã khác: Techcombank 970407, MB 970422, ACB 970416, VietinBank 970415, BIDV 970418)
  // QUAN TRỌNG: mã QR chuyển tiền THẬT vào tài khoản trên. Kiểm tra đúng số tài khoản trước khi chạy thật.
  showQr: true, // false -> ẩn mã QR, chỉ hiện chữ
  bankBin: '970436',
};

// =====================================================================
// THẺ ATM / VISA / MASTERCARD — ẢNH LOGO (dán link ảnh vào `logo` / `icon`)
//   - Link ngoài:  logo: 'https://.../visa.png'
//   - Ảnh trong project: bỏ file vào public/payments/ rồi ghi logo: '/payments/visa.png'
//     (KHÔNG ghi chữ /public ở đầu)
//   - Để trống '' -> hiện nhãn chữ thay thế (VISA, Mastercard...), không vỡ giao diện
// Nên dùng ảnh nền trong suốt (PNG / SVG). Logo thẻ cao ~30px, icon ví cao ~22px.
// =====================================================================

// Nhãn loại thẻ trong ô "Số thẻ" (loại khách đang gõ sẽ sáng lên, các loại khác mờ đi)
// id phải giữ nguyên (dùng để nhận diện thẻ theo số đầu): visa | mastercard | jcb | napas
export const CARD_BRANDS = [
  { id: 'visa', label: 'VISA', logo: 'https://i.pinimg.com/1200x/0f/a1/71/0fa171be7f8ba5bfa01f48bf6d1fa9de.jpg' },
  { id: 'mastercard', label: 'Mastercard', logo: 'https://i.pinimg.com/1200x/56/fd/48/56fd486a48ff235156b8773c238f8da9.jpg' },
  { id: 'jcb', label: 'JCB', logo: 'https://i.pinimg.com/1200x/03/6a/06/036a062dd6771dd3d4f82e42935f4687.jpg' },
];

// Nút ví điện tử (nền đen). Có icon -> hiện [icon] + chữ `textWithIcon` (vd quả táo + "Pay")
// Không có icon -> hiện cả chữ `label` (vd "Apple Pay")
export const WALLETS = [
  { id: 'applePay', label: 'Apple Pay', icon: 'https://i.pinimg.com/1200x/73/a0/e2/73a0e2862d272939f438eb2186d46b0e.jpg', textWithIcon: 'Pay' },
  { id: 'googlePay', label: 'Google Pay', icon: 'https://i.pinimg.com/736x/18/5a/e2/185ae2759b481e0e7a915e42028e4143.jpg', textWithIcon: 'Pay' },
];
