// Từ điển TIẾNG VIỆT. Mọi nhãn cố định trên giao diện phải nằm ở đây.
// Khi thêm key mới, nhớ thêm cùng key đó vào en.js.
// {tenBien} sẽ được thay bằng giá trị thật khi gọi t('key', { tenBien: ... }).
const vi = {
  meta: {
    title: 'TrendyLab',
  },
  common: {
    skipToContent: 'Bỏ qua đến nội dung chính',
    close: 'Đóng',
    loading: 'Đang tải…',
    retry: 'Thử lại',
    viewAll: 'Xem tất cả',
  },
  brand: {
    homeLabel: 'Giới thiệu.',
    tagline: 'Mang đến những xu hướng thời trang trẻ trung và hiện đại, thể hiện cá tính, phong cách riêng qua từng bộ trang phục.',
  },
  header: {
    announcement: 'Miễn phí giao hàng cho đơn từ 499.000₫ và đổi trả trong 30 ngày',
    mainNav: 'Điều hướng chính',
    openMenu: 'Mở menu',
    closeMenu: 'Đóng menu',
    openSearch: 'Mở ô tìm kiếm',
    closeSearch: 'Đóng ô tìm kiếm',
    account: 'Tài khoản',
    cart: 'Giỏ hàng, {count} sản phẩm',
  },
 nav: {
    home: 'Trang chủ',
    tops: 'Áo',
    bottoms: 'Quần',
    dresses: 'Đầm & Váy',
    contact: 'Liên hệ',
    viewAll: 'Tất cả {name}',
  },
  navSub: {
    tops: {
      tshirts: 'Áo thun',
      shirts: 'Áo sơ mi',
      polos: 'Áo polo',
      knitwear: 'Áo len',
      jackets: 'Áo khoác',
    },
    bottoms: {
      jeans: 'Quần jeans',
      trousers: 'Quần tây',
      wideLeg: 'Quần ống rộng',
      shorts: 'Quần short',
    },
    dresses: {
      midi: 'Đầm kiểu',
      maxi: 'Set bộ',
      miniSkirts: 'Váy ngắn',
      longSkirts: 'Váy dài',
    },
  },
    breadcrumb: {
    label: 'Đường dẫn trang',
    home: 'Trang chủ',
    category: 'Danh mục',
  },
  category: {
    count: '{count} sản phẩm',
    filterLabel: 'Lọc theo loại',
    all: 'Tất cả',
    empty: 'Chưa có sản phẩm trong mục này. Thử chọn loại khác ở trên.',
    error: 'Không tải được sản phẩm. Kiểm tra kết nối mạng rồi bấm Thử lại.',
  },
  contact: {
    title: 'Liên hệ',
    description: 'Trang liên hệ đang được xây dựng.',
  },
  notFound: {
    title: 'Không tìm thấy trang',
    description: 'Đường dẫn có thể đã sai hoặc trang đã bị xoá.',
    backHome: 'Về trang chủ',
  },
  search: {
    label: 'Tìm kiếm sản phẩm',
    placeholder: 'Tìm áo, quần, váy…',
    submit: 'Tìm',
    emptyQuery: 'Nhập tên sản phẩm để tìm.',
    pending: 'Trang kết quả cho “{query}” sẽ có khi làm xong trang Sản phẩm.',
  },
  theme: {
    toDark: 'Chuyển sang giao diện tối',
    toLight: 'Chuyển sang giao diện sáng',
  },
  language: {
    label: 'Ngôn ngữ',
    vi: 'Tiếng Việt',
    en: 'English',
  },
  home: {
        hero: {
      label: 'Banner khuyến mãi',
      slideOf: 'Banner {current} trên {total}',
      prev: 'Banner trước',
      next: 'Banner tiếp theo',
      goTo: 'Xem banner {number}',
      pause: 'Tạm dừng tự chuyển banner',
      play: 'Tiếp tục tự chuyển banner',
        slides: {
        everyday: {
          titleLine1: 'Mặc Xinh Mỗi Ngày.',
          titleLine2: 'Tự Tin Mỗi Khoảnh Khắc.',
          description: 'Đồ xinh cho mọi phong cách, tự tin tỏa sáng theo cách riêng.',
          imageAlt: 'Banner-1',
          buttons: {
            shopNow: 'Mua sắm ngay',
            newArrivals: 'Hàng mới về',
          },
        },
        freeship: {
          titleLine1: 'Shopping Thả Ga.',
          titleLine2: 'Freeship Tận Nhà!',
          description: 'Miễn phí vận chuyển cho đơn hàng từ 299K.',
          imageAlt: 'Banner-2',
        },
        outfitIdeas: {
          titleLine1: 'Phối Đồ Theo Gu',
          titleLine2: 'Tự Tin Chất Riêng',
          description: 'Outfit hợp gu, dễ phối, xinh mọi lúc.',
          imageAlt: 'Banner-3',
        },
        firstOrder: {
          titleLine1: 'Đơn Hàng Đầu Tiên',
          titleLine2: 'Giảm Ngay 30%',
          description: 'Ưu đãi đặc biệt dành cho đơn hàng đầu tiên tại TrendyLab.',
          imageAlt: 'Banner-4',
          buttons: {
            createAccount: 'Tạo tài khoản',
          },
        },
      },
    },
    categories: {
      title: 'Mua theo danh mục',
      shopNow: 'Mua ngay',
    },
    newArrivals: {
      title: 'Hàng mới về',
      error: 'Không tải được sản phẩm. Kiểm tra kết nối mạng rồi bấm Thử lại.',
      empty: 'Chưa có sản phẩm mới. Quay lại vào tuần sau.',
    },
    bestSellers: {
      title: 'Sản phẩm bán chạy',
      error: 'Không tải được sản phẩm bán chạy. Kiểm tra kết nối mạng rồi bấm Thử lại.',
      empty: 'Chưa có sản phẩm bán chạy.',
    },
    recommendations: {
      title: 'Gợi ý cho bạn',
      error: 'Không tải được gợi ý. Kiểm tra kết nối mạng rồi bấm Thử lại.',
      empty: 'Chưa có gợi ý nào cho bạn.',
    },
        lookbook: {
      // "Fashion" dùng font Italiana: chỉ có chữ Latin KHÔNG DẤU -> giữ tiếng Anh cho đẹp
      title: 'Fashion',
      titleScript: 'Collection',
      // Hàng chữ trên cùng (hình 1): 6 phong cách, ngang hàng nhau
      styles: {
        elegant: 'Thanh lịch',
        dynamic: 'Năng động',
        youthful: 'Trẻ trung',
        edgy: 'Cá tính',
        feminine: 'Nữ tính',
        minimal: 'Tối giản',
      },
      stripLabel: 'Xem bộ sưu tập hoodie nỉ bông',
      season: 'Winter 2026',
      handle: '@TrendyLab',
      eyebrow: 'TrendyLab Studio',
      featureLine1: 'Back in',
      featureLine2: 'stock',
      featureText: 'Mẫu hoodie khoá kéo bạn yêu thích đã có hàng trở lại!',
      // Chữ dưới 3 ô vuông
      looks: {
        look1: 'Nâu',   // ← chữ ô vuông 1
        look2: 'Đen',    // ← ô vuông 2
        look3: 'Xanh đậm',         // ← ô vuông 3
      },
      looksLabel: 'Các màu hoodie',
    },
    promo: {
      eyebrow: 'Ưu đãi đặc biệt',
      title: 'Giảm đến 50%',
      description: 'Làm mới tủ đồ với đợt sale theo mùa, số lượng có hạn.',
      cta: 'Mua hàng giảm giá',
    },
    benefits: {
      title: 'Mua sắm tại sợi.',
      shippingTitle: 'Giao hàng miễn phí',
      shippingText: 'Cho đơn từ 499.000₫, giao trong 2–4 ngày.',
      returnsTitle: 'Đổi trả 30 ngày',
      returnsText: 'Đổi size hoặc trả hàng còn nguyên tem.',
      paymentTitle: 'Thanh toán an toàn',
      paymentText: 'COD, thẻ ngân hàng hoặc ví điện tử.',
      supportTitle: 'Hỗ trợ 24/7',
      supportText: 'Luôn sẵn sàng giải đáp mọi thắc mắc.',
    },
    newsletter: {
      title: 'Đăng ký nhận ưu đãi độc quyền',
      description: 'Cập nhật bộ sưu tập mới, xu hướng thời trang và ưu đãi hấp dẫn dành riêng cho bạn.',
      emailLabel: 'Email',
      emailPlaceholder: 'Nhập email của bạn',
      submit: 'Đăng ký',
      submitting: 'Đang đăng ký…',
      success: 'Đã đăng ký. Kiểm tra hộp thư để xác nhận email.',
      errorEmpty: 'Nhập email để đăng ký.',
      errorInvalid: 'Email chưa đúng định dạng, ví dụ: ban@example.com',
    },
  },
  product: {
    addToCart: 'Thêm vào giỏ',
    addToCartLabel: 'Thêm {name} vào giỏ hàng',
    added: 'Đã thêm “{name}” vào giỏ hàng.',
    soldOut: 'Hết hàng',
    badgeBestSeller: 'Bán chạy',
    badgeNew: 'Mới',
    badgeSale: '-{percent}%',
    salePrice: 'Giá khuyến mãi',
    originalPrice: 'Giá gốc',
    price: 'Giá',
    addToWishlist: 'Thêm {name} vào yêu thích',
    removeFromWishlist: 'Bỏ {name} khỏi yêu thích',
    imageMissing: 'Chưa có ảnh sản phẩm',
  },
  collection: {
    sale: {
      title: 'Đang giảm giá',
      error: 'Không tải được sản phẩm giảm giá. Kiểm tra kết nối mạng rồi bấm Thử lại.',
      empty: 'Hiện chưa có sản phẩm nào đang giảm giá.',
    },
  },
  carousel: {
    prev: 'Xem các sản phẩm trước',
    next: 'Xem các sản phẩm tiếp theo',
  },
  productDetail: {
    error: 'Không tải được sản phẩm. Kiểm tra kết nối mạng rồi bấm Thử lại.',
    inStock: 'Còn hàng',
    outOfStock: 'Hết hàng',
    soldCount: 'Đã bán {count}',
    save: 'Tiết kiệm {percent}%',
    size: 'Kích cỡ',
    sizeRequired: 'Vui lòng chọn kích cỡ trước khi thêm vào giỏ.',
    quantity: 'Số lượng',
    decrease: 'Giảm số lượng',
    increase: 'Tăng số lượng',
    added: 'Đã thêm {quantity} × “{name}” (size {size}) vào giỏ hàng.',
    perkShipping: 'Miễn phí giao hàng cho đơn từ 499.000₫',
    perkReturns: 'Đổi trả miễn phí trong 30 ngày',
    perkPayment: 'Thanh toán khi nhận hàng (COD) hoặc chuyển khoản',
    description: 'Mô tả sản phẩm',
    material: 'Chất liệu',
  },
  notice: {
    success: 'Thành công',
    info: 'Thông tin',
    warning: 'Lưu ý',
    error: 'Lỗi',
  },
    footer: {
    // ----- Cột thương hiệu -----
    address: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
    phoneLabel: 'Số điện thoại',
    emailLabel: 'Email',
    social: {
      label: 'Mạng xã hội của TrendyLab',
      facebook: 'TrendyLab trên Facebook',
      instagram: 'TrendyLab trên Instagram',
      tiktok: 'TrendyLab trên TikTok',
    },
    // ----- Về TrendyLab -----
    aboutTitle: 'Về TrendyLab',
    about: 'Giới thiệu',
    story: 'Câu chuyện thương hiệu',
    contact: 'Liên hệ',
    careers: 'Tuyển dụng',
    // ----- Hỗ trợ khách hàng -----
    supportTitle: 'Hỗ trợ khách hàng',
    howToBuy: 'Hướng dẫn mua hàng',
    sizeGuide: 'Hướng dẫn chọn size',
    orderTracking: 'Tra cứu đơn hàng',
    faq: 'Câu hỏi thường gặp',
    // ----- Khám phá (Áo, Quần, Đầm & Váy dùng lại chữ của menu: nav) -----
    exploreTitle: 'Khám phá',
    newArrivals: 'Sản phẩm mới',
    collection: 'Bộ sưu tập',
    sale: 'Khuyến mãi',
    // ----- Chính sách -----
    policyTitle: 'Chính sách',
    returnPolicy: 'Chính sách đổi trả',
    shippingPolicy: 'Chính sách giao hàng',
    paymentPolicy: 'Chính sách thanh toán',
    privacyPolicy: 'Chính sách bảo mật',
    terms: 'Điều khoản sử dụng',
    copyright: '© {year} TrendyLab.',
  },
};

export default vi;
