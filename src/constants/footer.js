// =====================================================================
// CẤU HÌNH FOOTER: chỉ lưu KEY dịch + đường dẫn, không lưu chữ.
// Chữ hiển thị nằm trong vi.js / en.js (mục footer, nav).
//
// - to: đường dẫn trang. Bắt đầu bằng "/" -> chuyển trang bằng React Router.
//       Trang nào chưa làm (vd /about) sẽ hiện trang "Không tìm thấy" cho tới khi bạn tạo.
// Muốn thêm / bớt link: thêm / xoá 1 dòng trong links + thêm chữ trong vi.js, en.js.
// =====================================================================

// Thông tin liên hệ: không cần dịch -> để ở đây cho dễ sửa
export const SHOP_CONTACT = {
  phone: '0901 234 567',
  phoneHref: 'tel:+84901234567', // bấm trên điện thoại -> gọi luôn
  email: 'hello@trendylab.vn',
};

// Mạng xã hội. icon: class của Font Awesome (đã nạp bằng thẻ <link> trong index.html)
//   brand: tên màu thương hiệu -> CSS .site-footer__social-link--<brand> (Footer.css)
export const SOCIAL_LINKS = [
  {
    id: 'facebook',
    icon: 'fa-brands fa-facebook',
    labelKey: 'footer.social.facebook',
    href: 'https://facebook.com/',
  },
  {
    id: 'instagram',
    icon: 'fa-brands fa-square-instagram',
    labelKey: 'footer.social.instagram',
    href: 'https://instagram.com/',
  },
  {
    id: 'tiktok',
    icon: 'fa-brands fa-tiktok',
    labelKey: 'footer.social.tiktok',
    href: 'https://tiktok.com/',
  },
];

// 4 cột link
export const FOOTER_COLUMNS = [
  {
    titleKey: 'footer.aboutTitle',
    links: [
      { key: 'footer.about', to: '/about' },
      { key: 'footer.story', to: '/about#story' },
      { key: 'footer.contact', to: '/contact' },
      { key: 'footer.careers', to: '/careers' },
    ],
  },
  {
    titleKey: 'footer.supportTitle',
    links: [
      { key: 'footer.howToBuy', to: '/help/how-to-buy' },
      { key: 'footer.sizeGuide', to: '/help/size-guide' },
      { key: 'footer.orderTracking', to: '/order-tracking' },
      { key: 'footer.faq', to: '/help/faq' },
    ],
  },
  {
    titleKey: 'footer.exploreTitle',
    links: [
      { key: 'footer.newArrivals', to: '/collections/new-arrivals' },
      // Dùng lại chữ của menu -> menu đổi tên thì footer đổi theo
      { key: 'nav.tops', to: '/category/tops' },
      { key: 'nav.bottoms', to: '/category/bottoms' },
      { key: 'nav.dresses', to: '/category/dresses' },
      { key: 'footer.collection', to: '/#lookbook' }, // cuộn tới khối Bộ sưu tập ở trang chủ
      { key: 'footer.sale', to: '/collections/sale' },
    ],
  },
  {
    titleKey: 'footer.policyTitle',
    links: [
      { key: 'footer.returnPolicy', to: '/policies/returns' },
      { key: 'footer.shippingPolicy', to: '/policies/shipping' },
      { key: 'footer.paymentPolicy', to: '/policies/payment' },
      { key: 'footer.privacyPolicy', to: '/policies/privacy' },
      { key: 'footer.terms', to: '/policies/terms' },
    ],
  },
];
