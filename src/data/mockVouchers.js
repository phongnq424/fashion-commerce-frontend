// =====================================================================
// MÃ GIẢM GIÁ GIẢ cho trang thanh toán. Sau này Backend trả về (GET /vouchers).
// label / description là NỘI DUNG khuyến mãi của shop -> viết ở đây, không đưa vào vi.js / en.js.
//   type: 'shipping' giảm phí ship theo %   | 'fixed' giảm số tiền cố định
//         'percent'  giảm % tiền hàng (có thể giới hạn maxDiscount)
//   minSubtotal: tiền hàng tối thiểu để dùng được mã
// =====================================================================
export const MOCK_VOUCHERS = [
  {
    code: 'FREESHIP',
    label: 'Giảm Ship 100%',
    description: 'Miễn phí vận chuyển cho mọi đơn hàng.',
    type: 'shipping',
    value: 100,
    minSubtotal: 0,
  },
  {
    code: 'TRENDY50K',
    label: 'Giảm 50K',
    description: 'Giảm 50.000₫ cho đơn từ 399.000₫.',
    type: 'fixed',
    value: 50000,
    minSubtotal: 399000,
  },
  {
    code: 'TRENDY10',
    label: 'Giảm 10%',
    description: 'Giảm 10% (tối đa 100.000₫) cho đơn từ 599.000₫.',
    type: 'percent',
    value: 10,
    maxDiscount: 100000,
    minSubtotal: 599000,
  },
];
