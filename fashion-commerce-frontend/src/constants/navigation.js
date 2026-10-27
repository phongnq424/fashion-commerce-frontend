// Cấu hình menu: chỉ lưu KEY dịch, không lưu chữ. Header và Footer đọc từ đây.
// href tạm dùng "#..." vì chưa cài React Router; sau này đổi thành "/women", "/men"...
export const MAIN_NAV = [
  { key: 'nav.newIn', href: '#new-arrivals' },
  { key: 'nav.women', href: '#women' },
  { key: 'nav.men', href: '#men' },
  { key: 'nav.accessories', href: '#accessories' },
  { key: 'nav.sale', href: '#sale', highlight: true },
];

export const FOOTER_NAV = [
  {
    titleKey: 'footer.support',
    links: [
      { key: 'footer.contact', href: '#contact' },
      { key: 'footer.sizeGuide', href: '#size-guide' },
      { key: 'footer.returnPolicy', href: '#returns' },
      { key: 'footer.faq', href: '#faq' },
    ],
  },
  {
    titleKey: 'footer.about',
    links: [
      { key: 'footer.story', href: '#story' },
      { key: 'footer.stores', href: '#stores' },
      { key: 'footer.careers', href: '#careers' },
    ],
  },
];
