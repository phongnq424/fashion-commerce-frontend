// Bộ icon SVG nội tuyến: không cần cài thư viện, màu theo currentColor (tự đổi theo theme).
// Icon chỉ để trang trí -> aria-hidden. Tên truy cập do nút chứa nó cung cấp.
const PATHS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bag: <><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  hanger: <path d="M12 7a2 2 0 1 1 2-2c0 1-.8 1.6-2 2.4v1.3L21 15v2H3v-2l9-6.3" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  pause: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5.5v13l10-6.5-10-6.5Z" />,
  swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
  headset: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 14h3v5H5a1 1 0 0 1-1-1v-4ZM20 14h-3v5h2a1 1 0 0 0 1-1v-4Z" />
      <path d="M19 19c0 1.4-2.2 2-5 2" />
    </>
  ),
  // ----- Icon danh mục thời trang (nét mảnh, dùng với strokeWidth nhỏ) -----
  tshirt: <path d="M8.5 3.5 4 5.5 2.5 10l3 1L7 9.5V20.5h10V9.5l1.5 1.5 3-1L20 5.5l-4.5-2C15 5 13.7 6 12 6s-3-1-3.5-2.5Z" />,
  shirt: (
    <>
      <path d="M8.5 3.5 4 5.5 2.5 10l3 1L7 9.5V20.5h10V9.5l1.5 1.5 3-1L20 5.5l-4.5-2" />
      <path d="M8.5 3.5 12 7l3.5-3.5M12 7v13.5M10 3.5h4" />
      <path d="M12.8 10.5h.01M12.8 14h.01M12.8 17.5h.01" />
    </>
  ),
  jacket: (
    <>
      <path d="M8.5 3 4.5 5 3 20.5h7.5L12 11l1.5 9.5H21L19.5 5l-4-2" />
      <path d="M8.5 3 12 11l3.5-8M9.5 3h5" />
      <path d="M6 15h2.5M15.5 15H18" />
    </>
  ),
  pants: (
    <>
      <path d="M7 3h10l1.5 17.5H14L12 9.5 10 20.5H5.5L7 3Z" />
      <path d="M7 6h10M12 6v3.5" />
    </>
  ),
  dress: (
    <>
      <path d="M9.5 3v3.5L8 10M14.5 3v3.5L16 10" />
      <path d="M8 10h8l3.5 10.5h-15L8 10Z" />
      <path d="M8.8 6.5h6.4" />
    </>
  ),
  skirt: (
    <>
      <path d="M7 4h10v3H7z" />
      <path d="M7 7 4 19.5h16L17 7" />
      <path d="M10 7 9 19.5M14 7l1 12.5" />
    </>
  ),
  // Bông hoa 5 cánh trang trí (giống họa tiết hoa trong mẫu)
  flower: (
    <>
      <path d="M12 3.5a3 3 0 0 1 2.2 5 3 3 0 0 1 4.6 2.6 3 3 0 0 1-2.4 4.7 3 3 0 0 1-4.4 3.1 3 3 0 0 1-4.4-3.1 3 3 0 0 1-2.4-4.7 3 3 0 0 1 4.6-2.6 3 3 0 0 1 2.2-5Z" />
      <circle cx="12" cy="12.2" r="2" fill="var(--color-tint-deep)" stroke="none" />
    </>
  ),
};

// strokeWidth: độ dày nét vẽ (mặc định 1.8; icon danh mục dùng nét mảnh hơn)
function Icon({ name, size = 20, filled = false, strokeWidth = 1.8, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
