// =====================================================================
// TIN NỔI BẬT CỦA 6 DANH MỤC Ở TRANG CHỦ (bấm vòng tròn -> mở tin dạng pop-up, kiểu Instagram Stories)
// ---------------------------------------------------------------------
// Đây là NỘI DUNG của shop (giống bài đăng) -> viết 1 ngôn ngữ, KHÔNG đưa vào vi.js / en.js.
// Khoá của object = id danh mục trong components/CategoryList/CategoryList.jsx (tshirts, shirts...).
//
// Mỗi tin (slide):
//   image     ảnh dọc (đẹp nhất 1080 x 1920, tỉ lệ 9:16). Ảnh trong public/ ghi '/thu-muc/ten-anh.jpg'
//   position  (tuỳ chọn) phần ảnh ưu tiên giữ lại khi cắt, vd 'center 20%'
//   tag       (tuỳ chọn) nhãn nhỏ phía trên tiêu đề, vd 'Mới về', 'Giảm 30%'
//   title     tiêu đề tin
//   text      nội dung ngắn (1–2 câu)
//   postedAt  thời điểm đăng (ISO) -> hiện "2 giờ trước"
//   cta       (tuỳ chọn) nút ở cuối tin: { label, to }. Không ghi -> dùng nút "Xem sản phẩm" tới trang danh mục
//   duration  (tuỳ chọn) số mili giây hiển thị tin này (mặc định 5000)
//
// Thêm tin: thêm 1 object vào mảng của danh mục đó. Muốn tin hiện "mới đăng": sửa postedAt.
// =====================================================================

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

export const CATEGORY_STORIES = {
  tshirts: [
    {
      image: '/categories/ao-thun.jpg',
      position: 'center 25%',
      tag: 'Mới về',
      title: 'Áo thun form rộng — 12 màu mới',
      text: 'Cotton 100% dày dặn, mặc mát cả ngày. Phối quần jeans hay chân váy đều xinh.',
      postedAt: hoursAgo(2),
    },
    {
      image: '/banners/banner-1.png',
      position: '65% center',
      tag: 'Mẹo phối đồ',
      title: 'Sơ vin áo thun sao cho gọn?',
      text: 'Nhét nhẹ phần trước vào quần, để phần sau buông tự nhiên — dáng cao hơn ngay.',
      postedAt: hoursAgo(5),
    },
  ],
  shirts: [
    {
      image: '/categories/ao-so-mi.jpg',
      position: 'center 25%',
      tag: 'Bán chạy',
      title: 'Sơ mi linen mùa thu',
      text: 'Chất linen thoáng, ít nhăn — đi làm hay đi chơi đều hợp.',
      postedAt: hoursAgo(3),
    },
    {
      image: '/banners/banner-3.png',
      tag: 'Giảm 20%',
      title: 'Ưu đãi cuối tuần',
      text: 'Giảm 20% cho áo sơ mi khi mua từ 2 sản phẩm. Áp dụng đến hết Chủ nhật.',
      postedAt: hoursAgo(8),
      cta: { label: 'Xem ưu đãi', to: '/collections/sale' },
    },
  ],
  jackets: [
    {
      image: '/categories/ao-khoac.jpg',
      position: 'center 25%',
      tag: 'Thu – Đông',
      title: 'Hoodie nỉ ép form boxy',
      text: 'Ấm mà không bí, unisex nam nữ đều mặc được. Có thêm màu hồng sữa và đỏ đô.',
      postedAt: hoursAgo(1),
    },
    {
      image: '/banners/banner-6.png',
      title: 'Freeship đơn từ 499K',
      text: 'Lên đồ khoác mùa lạnh, giao tận nhà miễn phí cho đơn từ 499.000đ.',
      postedAt: hoursAgo(10),
    },
  ],
  jeans: [
    {
      image: '/categories/quan-jeans.jpg',
      tag: 'Mới về',
      title: 'Jeans ống suông xanh nhạt',
      text: 'Lưng cao tôn dáng, chất denim mềm, không bai giãn sau nhiều lần giặt.',
      postedAt: hoursAgo(4),
    },
    {
      image: '/banners/banner-2.png',
      tag: 'Chọn size',
      title: 'Chọn size jeans chuẩn',
      text: 'Đo vòng eo và vòng mông, đối chiếu bảng size trên trang sản phẩm để chọn vừa nhất.',
      postedAt: hoursAgo(20),
      cta: { label: 'Xem hướng dẫn chọn size', to: '/help/size-guide' },
    },
  ],
  dresses: [
    {
      image: '/categories/dam.jpg',
      position: 'center 25%',
      tag: 'Bộ sưu tập',
      title: 'Đầm dạo phố cuối tuần',
      text: 'Những mẫu đầm nhẹ nhàng, nữ tính cho buổi hẹn cà phê hay dạo phố.',
      postedAt: hoursAgo(6),
    },
    {
      image: '/banners/banner-5.png',
      title: 'Đặt trước mẫu mới',
      text: 'Đầm maxi hoa nhí sắp về hàng — theo dõi để không bỏ lỡ nhé!',
      postedAt: hoursAgo(12),
    },
  ],
  skirts: [
    {
      image: '/categories/vay.jpg',
      tag: 'Xu hướng',
      title: 'Chân váy xếp ly quay lại',
      text: 'Kết hợp áo thun basic và sneaker — trẻ trung, dễ mặc mỗi ngày.',
      postedAt: hoursAgo(7),
    },
    {
      image: '/banners/banner-4.png',
      tag: 'Thành viên mới',
      title: 'Giảm 10% đơn đầu tiên',
      text: 'Tạo tài khoản TrendyLab để nhận ưu đãi cho đơn hàng đầu tiên.',
      postedAt: hoursAgo(24),
      cta: { label: 'Mua sắm ngay', to: '/products' },
    },
  ],
};

// Mặc định mỗi tin hiện 5 giây
export const STORY_DURATION_MS = 5000;
