// =====================================================================
// DANH SÁCH BANNER TRANG CHỦ
// ---------------------------------------------------------------------
// Muốn THÊM banner: thêm 1 object vào mảng, rồi thêm chữ cho nó trong
//   vi.js / en.js -> home.hero.slides.<id>  (kicker, title, description, cta, imageAlt)
// Muốn ĐỔI THỨ TỰ: đổi thứ tự các object.
// Muốn XOÁ: xoá object (và key tương ứng trong từ điển nếu muốn).
//
// image:      ảnh đặt trong thư mục public/banners/ -> ghi '/banners/ten-anh.jpg'
//             (có thể dùng link ảnh online https://...)
// imagePosition: phần ảnh được ưu tiên giữ lại khi màn hình hẹp (CSS object-position)
// href:       nút CTA dẫn tới đâu
// textAlign:  'left' | 'right' -> hộp chữ nằm bên trái hay phải banner
// =====================================================================

export const HERO_SLIDES = [
  {
    id: 'newArrivals',
    image: 'public/banners/banner-1.png',
    imagePosition: '65% center',
    href: '#new-arrivals',
    textAlign: 'left',
  },
  {
    id: 'summer',                    
    image: 'public/banners/banner-2.png',  
    imagePosition: 'center',         
    href: '#summer',                 // nút CTA dẫn tới đâu
    textAlign: 'right',              // hộp chữ nằm 'left' hay 'right'
  },
   {
    id: 'sale',                    
    image: 'public/banners/banner-3.png',  
    imagePosition: 'center',         
    href: '#sale',                 
    textAlign: 'right',            
  },
  {
    id: 'member',
    image: 'public/banners/banner-4.png',
    imagePosition: 'center',
    href: '#account',
    textAlign: 'left',
  },
];

// Thời gian mỗi banner hiển thị trước khi tự chuyển (mili giây)
export const HERO_AUTOPLAY_MS = 5000;
