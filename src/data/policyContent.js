// =====================================================================
// NỘI DUNG CÁC TRANG CHÍNH SÁCH (/policies/<id>)
// Đây là NỘI DUNG của shop (như mô tả sản phẩm) -> viết 1 ngôn ngữ, KHÔNG đưa vào vi.js / en.js.
// Tên trang lấy từ chữ của footer (footer.returnPolicy...) để menu và footer luôn khớp nhau.
// Số ngày đổi trả / phí ship thực tế do từng shop cài đặt trên backend (shop settings) — ở đây là quy định chung.
// Sửa nội dung: chỉ sửa file này.
// =====================================================================

export const POLICY_PAGES = [
  {
    id: 'returns',
    titleKey: 'footer.returnPolicy',
    updatedAt: '2026-11-01',
    sections: [
      {
        heading: '1. Điều kiện đổi trả',
        paragraphs: [
          'Sản phẩm còn nguyên tem, mác, chưa qua sử dụng, giặt hoặc sửa đổi.',
          'Yêu cầu được gửi trong thời hạn đổi trả của shop, tính từ khi đơn hàng được giao thành công (hiện trong trang Chi tiết đơn hàng).',
          'Sản phẩm thuộc chương trình xả kho hoặc đồ lót, phụ kiện cá nhân không áp dụng đổi trả, trừ khi lỗi từ nhà sản xuất.',
        ],
      },
      {
        heading: '2. Cách gửi yêu cầu',
        paragraphs: [
          'Vào Tài khoản → Đơn hàng của tôi → chọn đơn đã hoàn thành → bấm "Yêu cầu trả hàng".',
          'Chọn sản phẩm, số lượng, lý do và đính kèm hình ảnh (nếu có). Shop sẽ phản hồi trong vòng 2 ngày làm việc.',
          'Khi yêu cầu được duyệt, bạn gửi hàng về shop và nhập mã vận đơn ngay trong trang yêu cầu trả hàng.',
        ],
      },
      {
        heading: '3. Hoàn tiền',
        paragraphs: [
          'Sau khi shop nhận và kiểm tra hàng, tiền sẽ được hoàn theo phương thức thanh toán ban đầu.',
          'Với đơn thanh toán khi nhận hàng (COD), shop hoàn tiền qua chuyển khoản ngân hàng trong 3–5 ngày làm việc.',
        ],
      },
    ],
  },
  {
    id: 'shipping',
    titleKey: 'footer.shippingPolicy',
    updatedAt: '2026-11-01',
    sections: [
      {
        heading: '1. Phạm vi và thời gian giao hàng',
        paragraphs: [
          'Giao hàng toàn quốc. Nội thành 1–2 ngày, các tỉnh thành khác 2–5 ngày làm việc (không tính Chủ nhật, ngày lễ).',
          'Mỗi shop tự xử lý và gửi phần đơn của mình, nên một đơn có nhiều shop có thể đến thành nhiều kiện.',
        ],
      },
      {
        heading: '2. Phí vận chuyển',
        paragraphs: [
          'Phí vận chuyển được tính khi thanh toán và hiển thị rõ trong đơn hàng trước khi bạn đặt.',
          'Các chương trình miễn phí vận chuyển được áp dụng tự động khi đơn đủ điều kiện.',
        ],
      },
      {
        heading: '3. Theo dõi đơn',
        paragraphs: ['Trạng thái giao hàng được cập nhật trong Tài khoản → Đơn hàng của tôi và qua mục Thông báo.'],
      },
    ],
  },
  {
    id: 'payment',
    titleKey: 'footer.paymentPolicy',
    updatedAt: '2026-11-01',
    sections: [
      {
        heading: '1. Phương thức thanh toán',
        paragraphs: [
          'Thanh toán khi nhận hàng (COD): trả tiền mặt cho nhân viên giao hàng.',
          'Ví điện tử và cổng thanh toán (MoMo, ZaloPay, VNPay) sẽ được mở khi sẵn sàng; phương thức chưa dùng được sẽ không hiện ở bước thanh toán.',
        ],
      },
      {
        heading: '2. Hủy đơn và hoàn tiền',
        paragraphs: [
          'Bạn có thể tự hủy đơn khi shop chưa xử lý (trạng thái "Chờ thanh toán" hoặc "Đã đặt hàng").',
          'Đơn đã thanh toán trước sẽ được hoàn tiền theo phương thức ban đầu.',
        ],
      },
    ],
  },
  {
    id: 'privacy',
    titleKey: 'footer.privacyPolicy',
    updatedAt: '2026-11-01',
    sections: [
      {
        heading: '1. Thông tin chúng tôi thu thập',
        paragraphs: [
          'Họ tên, email, số điện thoại khi bạn đăng ký tài khoản.',
          'Địa chỉ nhận hàng và lịch sử đơn hàng để giao hàng và hỗ trợ sau bán.',
        ],
      },
      {
        heading: '2. Mục đích sử dụng',
        paragraphs: [
          'Xử lý đơn hàng, giao hàng, đổi trả và chăm sóc khách hàng.',
          'Gửi mã xác thực (OTP) và thông báo liên quan đến tài khoản, đơn hàng.',
        ],
      },
      {
        heading: '3. Bảo mật',
        paragraphs: [
          'Mật khẩu được mã hoá; mã OTP chỉ dùng một lần và có thời hạn.',
          'Chúng tôi không bán thông tin cá nhân. Thông tin chỉ chia sẻ với shop và đơn vị vận chuyển ở mức cần thiết để giao đơn.',
        ],
      },
      {
        heading: '4. Quyền của bạn',
        paragraphs: ['Bạn có thể xem, cập nhật địa chỉ trong Tài khoản, và liên hệ bộ phận hỗ trợ để yêu cầu xoá dữ liệu.'],
      },
    ],
  },
  {
    id: 'terms',
    titleKey: 'footer.terms',
    updatedAt: '2026-11-01',
    sections: [
      {
        heading: '1. Tài khoản',
        paragraphs: [
          'Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động trên tài khoản của mình.',
          'Mỗi email và số điện thoại chỉ đăng ký được một tài khoản.',
        ],
      },
      {
        heading: '2. Đặt hàng',
        paragraphs: [
          'Giá và tồn kho được kiểm tra lại khi đặt hàng. Nếu có thay đổi, hệ thống sẽ thông báo trước khi bạn xác nhận.',
          'Đơn hàng chỉ được coi là thành công khi bạn nhận được mã đơn hàng.',
        ],
      },
      {
        heading: '3. Đánh giá và báo cáo',
        paragraphs: [
          'Chỉ người đã mua và nhận hàng mới được đánh giá sản phẩm. Nội dung đánh giá phải trung thực, không xúc phạm.',
          'Bạn có thể báo cáo sản phẩm vi phạm (hàng giả, sai mô tả…) ngay trên trang sản phẩm.',
        ],
      },
    ],
  },
];

export const findPolicy = (id) => POLICY_PAGES.find((page) => page.id === id) ?? null;
