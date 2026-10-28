// =====================================================================
// DANH SÁCH BANNER TRANG CHỦ
// ---------------------------------------------------------------------
// Mỗi banner = 1 object. Chữ của banner nằm trong vi.js / en.js:
//   home.hero.slides.<id>.titleLine1   dòng tiêu đề 1 (màu chữ đậm)
//   home.hero.slides.<id>.titleLine2   dòng tiêu đề 2 (màu thương hiệu)
//   home.hero.slides.<id>.description  dòng chữ nhỏ bên dưới
//   home.hero.slides.<id>.imageAlt     mô tả ảnh cho trình đọc màn hình
//   home.hero.slides.<id>.buttons.<buttonId>  chữ trên từng nút
//
// image:         ảnh trong thư mục public/banners/ -> ghi '/banners/ten-anh.jpg'
// imagePosition: phần ảnh ưu tiên giữ lại khi màn hình hẹp (CSS object-position)
// textAlign:     'left' | 'right' | 'top-center' -> vị trí khối chữ
// textAlign:     ... | 'bottom-center' -> chữ ở dưới, căn giữa
// textOffset:    (tuỳ chọn) khoảng cách chữ tới mép banner, chỉ cho riêng banner đó
// overlay:       (tuỳ chọn) false -> bỏ lớp phủ trắng mờ sau chữ, ảnh hiện rõ 100%
// buttons:       0, 1 hoặc 2 nút. variant: 'primary' (nền đậm) | 'outline' (chỉ viền)
// =====================================================================

export const HERO_SLIDES = [
  {
    id: 'everyday',
    image: '/banners/banner-1.png',
    imagePosition: '65% center',
    textAlign: 'left',
    buttons: [
      { id: 'shopNow', to: '/category/tops', variant: 'primary' },
      { id: 'newArrivals', to: '#new-arrivals', variant: 'outline' },
    ],
  },
  {
    id: 'freeship',
    image: '/banners/banner-2.png',
    imagePosition: 'center',
    textAlign: 'right',
    textOffset: 'clamp(2rem, 20vw, 26rem)', // đẩy chữ vào khoảng trống giữa ảnh
    overlay: false, // ảnh hiện rõ, không phủ trắng
    buttons: [],
  },
  {
    id: 'outfitIdeas',
    image: '/banners/banner-3.png',
    imagePosition: 'center',
    textAlign: 'bottom-center',
    buttons: [],
  },
  {
    id: 'firstOrder',
    image: '/banners/banner-4.png',
    imagePosition: 'center',
    textAlign: 'top-center',
    overlay: false, // ảnh hiện rõ, không phủ trắng
    buttons: [{ id: 'createAccount', to: '#account', variant: 'primary' }],
  },
];

// Thời gian mỗi banner hiển thị trước khi tự chuyển (mili giây)
export const HERO_AUTOPLAY_MS = 5000;
