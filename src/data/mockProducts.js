// DỮ LIỆU GIẢ, mô phỏng dữ liệu trả về từ Backend (fashion-commerce-backend).
// Tên, mô tả, chất liệu là DỮ LIỆU ĐỘNG -> KHÔNG đưa vào từ điển i18n, không tự dịch.
// Khi có API thật, chỉ cần sửa src/services/productService.js, component giữ nguyên.
//
// Các trường:
//   isNew      true  -> hiện trong "Hàng mới về"
//   isBestSeller true -> được gắn nhãn "Bán chạy" / "Best seller" (chỉ hiện ở mục Gợi ý cho bạn)
//   soldCount  số lượng đã bán -> "Sản phẩm bán chạy" lấy 10 sản phẩm có số này cao nhất
//   inStock    false -> nút "Hết hàng", không thêm vào giỏ được
//   sizes      các size có bán (trang chi tiết cho chọn)
//
// Ảnh lấy từ Unsplash; nếu ảnh lỗi, ProductCard tự hiện khung thay thế.
// Muốn dùng ảnh của bạn: bỏ ảnh vào public/products/ rồi ghi image: '/products/ten-anh.jpg'
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&h=800&q=75`;

export const mockProducts = [
  {
    id: 'p001',
    category: 'tops',
    subcategory: 'jackets',
    name: '[ NỈ ÉP MÙA THU ĐÔNG ] Áo Khoác Hoodie Zip Xuân Hè, Vải Nỉ Ép, Form Boxy Unisex Nam Nữ.',
    price: 459000,
    originalPrice: null,
    image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mfjq6j9qfrpr7d.webp',
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 312,
    sizes: ['S', 'M', 'L'],
    material: 'Nỉ',
    description:
      'Áo Khoác Hoodie Zip Thu Đông in nổi, dập nổi. Vải nỉ ép, form boxy unisex, nam nữ đều mặc được, có túi trong.',
    details: [
      'Chất liệu: Nỉ ép 2 lớp. Mặt trong là cotton thun (90% cotton) trơn mịn, mềm, mát, thấm hút mồ hôi tốt hơn nỉ xốp trơn. Mặt trong không có bông nên không lo đổ bông. Mặt ngoài là nỉ trơn phủ 1 lớp nhung mịn nhẹ, sờ mướt tay, không bị xù.',
      'Form dáng: Form BOXY to ngang và ngắn về chiều dài, hack dáng, trendy. Unisex form cánh dơi, tay rộng, phù hợp cả nam và nữ. Form mặc ngang V3, không chùm được V3.',
    ],
    rating: 5.0,              // điểm đánh giá -> hàng "5.0 ★★★★★"
    reviewCount: 509,         // "509 Đánh giá"
    soldCount: 2150,          // "Đã bán 2,1k"
    images: [                 // ảnh lớn + hàng ảnh nhỏ (ảnh đầu = ảnh chính)
      'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mfjq6j9qfrpr7d.webp',
    ],
    colors: [                 
      { 
        id: 'gray white', 
        name: 'Xám trắng', 
        hex: '#DBD9C9', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mfjq6j9qfrpr7d.webp' 
      },
      { id: 'Pastel pink', 
        name: 'Hồng sữa', 
        hex: '#F1CDC9', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mfjq3g3cp0qx44.webp' 
      },
      { id: 'Red wine', 
        name: 'Đỏ đô', 
        hex: '#561319', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mt6gx1z5qwhs08@resize_w900_nl.webp' 
      },
    ],
    gift: {                   
      name: 'Quà tặng - Dây buộc tóc nữ xinh xắn',
      image: 'https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mlgq3q62g6psee.webp',
      originalPrice: 17000,
      options: ['Ngẫu nhiên'],
    },
    care: 
      ['Lộn trái áo khi giặt máy, nên dùng nước giặt ariel giữ màu, sẽ giữ màu áo bền hơn.', 
        'Không dùng các loại bột giặt nhiều tẩy như : ô mô, surf, a ba',
        'Không dùng thuốc tẩy sẽ làm bay màu áo, hỏng áo',
        'Phơi trong mái che, bóng mát, tránh nắng gắt bạc màu áo nhanh ạ.'   
      ]
    },
  {
    id: 'p002',
    category: 'tops',
    subcategory: 'tshirts',
    name: 'Áo Thun Nữ Local Brand/The most famous.',
    price: 459000,
    originalPrice: null,
    image: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lq64vuldm4on74.webp',
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 312,
    sizes: ['S', 'M', 'L', 'XL'],
    material: 'Nỉ',
    description:
      'Áo Thun Nam Nữ Local Brand/The most famous',
    details: [
      'Mẫu: Trơn',
      'Phong cách: Thể thao, Cơ bản, Hàn Quốc, Đường phố.',
    ],
    rating: 5.0,              // điểm đánh giá -> hàng "5.0 ★★★★★"
    reviewCount: 509,         // "509 Đánh giá"
    soldCount: 2150,          // "Đã bán 2,1k"
    images: [                 // ảnh lớn + hàng ảnh nhỏ (ảnh đầu = ảnh chính)
      'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lq64vuldm4on74.webp',
    ],
    colors: [                 
      { 
        id: 'Black', 
        name: 'Đen', 
        hex: '#0B0402', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lq64vuldm4on74.webp' 
      },
      { id: 'Charcoal green', 
        name: 'Xanh than', 
        hex: '#0D1B36', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lq64vulcvfw7c9@resize_w900_nl.webp' 
      },
      { id: 'Red wine', 
        name: 'Đỏ đô', 
        hex: '#561319', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lwbrnc8pvtujd2.webp' 
      },
      { id: 'White', 
        name: 'Trắng', 
        hex: '#FFFFFF', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lq64vuld6o5uc6.webp' 
      },
      { id: 'Charcoal gray', 
        name: 'Xám chì', 
        hex: '#303236', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lq64vulcsmrbfb.webp' 
      },
      { id: 'pink',
        name: 'Hồng',
        hex: '#FEB7C6',
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lu0dkbrh1vkv06@resize_w900_nl.webp'
      }
    ],
    care: 
      ['Nên hòa tan xà bông giặt với nước và bỏ áo vào ngâm, tránh đổ trực tiếp lên áo sẽ làm áo bị loang màu.', 
        'Khi giặt và phơi bạn nên lộn trái sản phẩm sẽ giúp giữ màu sản phẩm được bền hơn, nên sử dụng túi giặt.',
        'Không giặt chung đồ màu với đồ trắng và ngược lại. ',
      ]
    },
  {
    id: 'p003',
    category: 'tops',
    subcategory: 'tshirts',
    name: '[NEW] Áo thun tay dài Glint.',
    price: 159000,
    originalPrice: 298000,
    image: 'https://bizweb.dktcdn.net/100/668/650/products/20ca999d93e94ecb809e1c3e4afd7ccb-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931458107',
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 312,
    sizes: ['M', 'L', 'XL'],
    material: '100% Cotton',
    description:
      'Áo thun boxy được hoàn thiện với đường may gọn gàng, sắc nét, tỉ mỉ ở từng chi tiết. Chất liệu 250gsm cotton 100% mềm mại, thoáng mát giúp mang lạicảm giác thoải mái suốt ngày dài. Hình in sử dụng mực chất lượng cao, hạn chế bong tróc và giữ màu bền đẹp theo thời gian. Hình ảnh hiển thị rõ nét, an toàn cho da và thân thiện với môi trường. Dáng boxy thời thượng, dễ phối đồ và phù hợp cho cả phong cách thường ngày lẫn những set đồ cá tính.',
    details: [
      'Định lượng: 250 gsm',
      'Dáng: boxy',
      'Color: Đen, Trắng, Nâu Penny, Xanh Navy, Xám than',
    ],
    rating: 5.0,              // điểm đánh giá
    reviewCount: 509,         // "Đánh giá"
    soldCount: 2150,          // "Đã bán"
    images: [                 // ảnh lớn + hàng ảnh nhỏ (ảnh đầu = ảnh chính)
      'https://bizweb.dktcdn.net/100/668/650/products/20ca999d93e94ecb809e1c3e4afd7ccb-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931458107',
      'https://bizweb.dktcdn.net/100/668/650/products/08b9a545811c4973b01429ca8041a616-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931458107',
    ],
    colors: [                 
      { 
        id: 'Black', 
        name: 'Đen', 
        hex: '#0B0402', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/318bc45d450349cb9d84e11db37b39dc-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931458107' 
      },
      { id: 'Dark gray', 
        name: 'Xám than', 
        hex: '#C4C2C0', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/4aa01829b270469791d8c06d0d2a3944-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931458107' 
      },
      { id: 'Nâu Penny', 
        name: 'Nâu Penny', 
        hex: '#4D3A31', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/9a7af6e5ef34473c9249aad9b3422894-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793928488247' 
      },
      { id: 'White', 
        name: 'Trắng', 
        hex: '#FFFFFF', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/1e3920608e444b4ab066f657aad900f9-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793928489620' 
      },
      { id: 'Xanh Navy', 
        name: 'Xanh Navy', 
        hex: '#10193F', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/1c93dd44ddfa4223aaeb6fb2c32f52b7-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793928489030' 
      },
    ],
    care: 
      ['Nên hòa tan xà bông giặt với nước và bỏ áo vào ngâm, tránh đổ trực tiếp lên áo sẽ làm áo bị loang màu.', 
        'Khi giặt và phơi bạn nên lộn trái sản phẩm sẽ giúp giữ màu sản phẩm được bền hơn, nên sử dụng túi giặt.',
        'Không giặt chung đồ màu với đồ trắng và ngược lại. ',
      ]
    },
  {
    id: 'p004',
    category: 'tops',
    subcategory: 'tshirts',
    name: '[NEW] Áo thun tay dài TRENDYLAB SPARK',
    price: 179000,
    originalPrice: 338000,
    image: 'https://bizweb.dktcdn.net/100/668/650/products/5926e777286a476385ad167706d542ba-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931459127',
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 312,
    sizes: ['M', 'L', 'XL'],
    material: '100% Cotton',
    description:
      'Áo thun boxy được hoàn thiện với đường may gọn gàng, sắc nét, tỉ mỉ ở từng chi tiết. Chất liệu 250gsm cotton 100% mềm mại, thoáng mát giúp mang lạicảm giác thoải mái suốt ngày dài. Hình in sử dụng mực chất lượng cao, hạn chế bong tróc và giữ màu bền đẹp theo thời gian. Hình ảnh hiển thị rõ nét, an toàn cho da và thân thiện với môi trường. Dáng boxy thời thượng, dễ phối đồ và phù hợp cho cả phong cách thường ngày lẫn những set đồ cá tính.',
    details: [
      'Định lượng: 250 gsm',
      'Dáng: boxy',
      'Color: Đen, Trắng, Nâu Penny, Xanh Navy, Xám than',
    ],
    rating: 5.0,              // điểm đánh giá
    reviewCount: 509,         // "Đánh giá"
    soldCount: 2150,          // "Đã bán"
    images: [                 // ảnh lớn + hàng ảnh nhỏ (ảnh đầu = ảnh chính)
      'https://bizweb.dktcdn.net/100/668/650/products/5926e777286a476385ad167706d542ba-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931459127',
      'https://bizweb.dktcdn.net/100/668/650/products/84e198d25c2042c6bd629560e286d482-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931459127',
      'https://bizweb.dktcdn.net/thumb/1024x1024/100/668/650/products/16b3387613a74d2a9714b2e5c1c65eb8-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931459127',
    ],
    colors: [                 
      { 
        id: 'Black', 
        name: 'Đen', 
        hex: '#0B0402', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/50b7349b3559455e872bb45cd36a28a0-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931459127' 
      },
      { id: 'Dark gray', 
        name: 'Xám than', 
        hex: '#C4C2C0', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/05c9f5df4e134b41bcd6b44167d61866-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793931459127' 
      },
      { id: 'Nâu Penny', 
        name: 'Nâu Penny', 
        hex: '#4D3A31', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/c0d7dd3b712d425991aa92909d12462b-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793928505540' 
      },
      { id: 'White', 
        name: 'Trắng', 
        hex: '#FFFFFF', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/4005ecb826684b5c9b735a74915330da-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793928506693' 
      },
      { id: 'Xanh Navy', 
        name: 'Xanh Navy', 
        hex: '#10193F', 
        image: 'https://bizweb.dktcdn.net/100/668/650/products/eabda34e2fd149728ac6e0fc9347a7a1-tplv-aphluv4xwc-origin-jpeg-jpeg.jpg?v=1793928506140' 
      },
    ],
    care: 
      ['Nên hòa tan xà bông giặt với nước và bỏ áo vào ngâm, tránh đổ trực tiếp lên áo sẽ làm áo bị loang màu.', 
        'Khi giặt và phơi bạn nên lộn trái sản phẩm sẽ giúp giữ màu sản phẩm được bền hơn, nên sử dụng túi giặt.',
        'Không giặt chung đồ màu với đồ trắng và ngược lại. ',
      ]
    },
  {
    id: 'p005',
    category: 'tops',
    subcategory: 'tshirts',
    name: 'Áo Thun Tay Dài kẻ sọc, Áo Thu Đông Raglan kẻ sọc Long Sleeve Boxy Cổ Tròn Unisex NEW',
    price: 79990,
    originalPrice: 139000,
    image: 'https://down-vn.img.susercontent.com/file/sg-11134201-825b0-mtift5evfgg44f.webp',
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 312,
    sizes: ['S', 'M', 'L', 'XL'],
    material: '100% Cotton',
    description:
      'ÁO THUN DÀI TAY KẺ SỌC CÚN XINH – LONG SLEEVE BOXY FORM RỘNG UNISEX SIÊU ĐẸP. Giới thiệu sản phẩmÁo thun dài tay kẻ sọc cún xinh (Long Sleeve) thiết kế form boxy rộng trẻ trung, unisex nam nữ mặc đều đẹp. Họa tiết cún dễ thương – phong cách Hàn Quốc, phù hợp mọi hoàn cảnh: đi học, đi chơi, chụp ảnh, dạo phố. Chất vải thun rib mềm, co giãn tốt, thoáng mát, cực kỳ thoải mái.',
    details: [
      'Mẫu: Kẻ sọc',
      'Cổ áo: Cổ tròn',
      'Chiều dài tay: Tay dài',
    ],
    rating: 4.1,              // điểm đánh giá
    reviewCount: 509,         // "Đánh giá"
    soldCount: 2150,          // "Đã bán"
    images: [                 // ảnh lớn + hàng ảnh nhỏ (ảnh đầu = ảnh chính)
      'https://down-vn.img.susercontent.com/file/sg-11134201-825b0-mtift5evfgg44f.webp',
    ],
    colors: [                 
      { 
        id: 'Black', 
        name: 'Kẻ đen sao chữ', 
        image: 'https://down-vn.img.susercontent.com/file/sg-11134201-825b0-mtift5evfgg44f.webp' 
      },
      { id: 'Pink', 
        name: 'Kẻ hồng sao chữ', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mht0fzgpgzd050.webp' 
      },
      { id: 'Gray', 
        name: 'Kẻ xám sao chữ', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mht0fzfv1cec76@resize_w900_nl.webp' 
      },
      { id: 'Blue', 
        name: 'Kẻ xanh sao chữ', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mht0fzfudgqrb2@resize_w900_nl.webp' 
      },
    ],
    care: 
      ['Nên hòa tan xà bông giặt với nước và bỏ áo vào ngâm, tránh đổ trực tiếp lên áo sẽ làm áo bị loang màu.', 
        'Khi giặt và phơi bạn nên lộn trái sản phẩm sẽ giúp giữ màu sản phẩm được bền hơn, nên sử dụng túi giặt.',
        'Không giặt chung đồ màu với đồ trắng và ngược lại. ',
      ]
    },
  {
    id: 'p006',
    category: 'tops',
    subcategory: 'tshirts',
    name: 'Áo thun unisex Local Brand - Tee Beat',
    price: 159000,
    originalPrice: 249000,
    image: 'https://down-vn.img.susercontent.com/file/85d5367aecdd1d1db35a75076dba6e15.webp',
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 312,
    sizes: ['S', 'M', 'L', 'XL'],
    material: '100% Cotton',
    description:
      'Áo thun unisex Local Brand Otis Club - Tee Beat',
    details: [
      'Giặt ko đổ lông hay bay màu, thấm hút mồ hôi và thoải mái ko gò bó khi vận động',
      'Form rộng tay lỡ thoải mái tạo nên sự trẻ trung năng động..',
      ' Áo có 3 size : M L XL',
    ],
    rating: 4.1,              // điểm đánh giá
    reviewCount: 509,         // "Đánh giá"
    soldCount: 2150,          // "Đã bán"
    images: [                 // ảnh lớn + hàng ảnh nhỏ (ảnh đầu = ảnh chính)
      'https://down-vn.img.susercontent.com/file/vn-11134207-7r98o-lp39yujl4ksuce.webp',
    ],
    colors: [                 
      { 
        id: 'Black', 
        name: 'Đen',
        hex: '#0B0A0C', 
        image: 'https://down-vn.img.susercontent.com/file/6ef4c643f470dc885602660edcec7e86.webp' 
      },
      { id: 'Blue', 
        name: 'Xanh', 
        hex:'#BAE4EF',
        image: 'https://down-vn.img.susercontent.com/file/b95b5c504df37723f6e3d8d69e8e5031.webp' 
      },
      { id: 'Cream', 
        name:'Kem', 
        hex: '#FAF3E3',
        image: 'https://down-vn.img.susercontent.com/file/9eb197283b4e0fdb38db20ffa395a3a3.webp' 
      },
      { id: 'Pink', 
        name: 'Hồng', 
        hex: '#F2C3CA',
        image: 'https://down-vn.img.susercontent.com/file/8e90badeb8483fd03f6ea0260d6c0137.webp' 
      },
      { id: 'Green',
        name: 'Xanh lá',
        hex: '#085045',
        image: 'https://down-vn.img.susercontent.com/file/1d76bf31f96ecaa3e8ca0451e939b74f.webp'
      },
      { id: 'Gray',
        name: 'Xám',
        hex: '#9B9B9B',
        image: 'https://down-vn.img.susercontent.com/file/sg-11134201-22120-3x19dwvaemlv42.webp'
      },
      { id: 'White',
        name: 'Trắng',
        hex: '#FFFFFF',
        image: 'https://down-vn.img.susercontent.com/file/372483fc9b5844ad043badf2bca24981.webp'
      },
    ],
    care: 
      ['Nên hòa tan xà bông giặt với nước và bỏ áo vào ngâm, tránh đổ trực tiếp lên áo sẽ làm áo bị loang màu.', 
        'Khi giặt và phơi bạn nên lộn trái sản phẩm sẽ giúp giữ màu sản phẩm được bền hơn, nên sử dụng túi giặt.',
        'Không giặt chung đồ màu với đồ trắng và ngược lại. ',
      ]
    },
{
    id: 'p007',
    category: 'dresses',
    subcategory: 'midi',
    name: 'Đầm Trắng Nữ Hở Vai Tay Bo 2 Lớp - Váy Nữ Cổ Yếm Dài Tay Dáng Ngắn Chất Voan',
    price: 149000,
    originalPrice: 199000,
    image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mj8p8t1abn5t6b.webp',
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 312,
    sizes: ['S', 'M', 'L', 'XL'],
    material: 'Voan',
    description:
      'Váy babydoll dáng xoè cổ yếm khoét vai chất voan tơ 2 lớp, Đầm công chúa xoè chữ A dài tay bồng tiểu thư đi chơi dụ tiệc.',
    details: [
      'Chất liệu: mềm mịn, co dãn tốt, mỏng ',
      'Kiểu dáng: form ôm tôn dáng dễ mix đồ',
      'Đường may chắc chắn tỉ mỉ không chỉ thừa',
      'Mix: quần ống rộng, quần jean hay chân váy ngắn đều siu siu xinh',
    ],
    rating: 3.9,              // điểm đánh giá
    reviewCount: 509,         // "Đánh giá"
    soldCount: 2150,          // "Đã bán"
    images: [                 // ảnh lớn + hàng ảnh nhỏ (ảnh đầu = ảnh chính)
      'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mj8p8t1abn5t6b.webp',
      'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mj9b1evlf6kn88.webp',
      'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mj9b1evlgl53e5.webp',
    ],
    colors: [                 
      { 
        id: 'White', 
        name: 'Trắng kem', 
        image: 'https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mj9b1evefqx20a@resize_w900_nl.webp' 
      },
    ],
    care: 
      ['Nên hòa tan xà bông giặt với nước và bỏ áo vào ngâm, tránh đổ trực tiếp lên áo sẽ làm áo bị loang màu.', 
        'Khi giặt và phơi bạn nên lộn trái sản phẩm sẽ giúp giữ màu sản phẩm được bền hơn, nên sử dụng túi giặt.',
        'Không giặt chung đồ màu với đồ trắng và ngược lại. ',
      ]
    },
  {
    id: 'p008',
    category: 'accessories',
    subcategory: 'bags',
    name: 'Túi tote canvas',
    price: 259000,
    originalPrice: null,
    image: null, // cố tình để trống để xem khung "chưa có ảnh"
    isNew: false,
    inStock: true,
    isBestSeller: false,
    soldCount: 140,
    sizes: ['Free size'],
    material: 'Canvas dày',
    description: 'Túi tote canvas dày dặn, đựng vừa laptop 14 inch. Có túi nhỏ bên trong để chìa khoá, điện thoại.',
  },
  {
    id: 'p009',
    category: 'bottoms',
    subcategory: 'jeans',
    name: 'Quần jeans ống đứng',
    price: 599000,
    originalPrice: 750000,
    image: img('photo-1541099649105-f69ad21f3246'),
    isNew: true,
    inStock: true,
    isBestSeller: true,
    soldCount: 690,
    sizes: ['26', '27', '28', '29', '30'],
    material: '98% cotton denim, 2% spandex',
    description:
      'Quần jeans ống đứng lưng cao, màu xanh wash nhẹ. Form tôn dáng, kéo dài chân, dễ mặc quanh năm.',
  },
  {
    id: 'p010',
    category: 'dresses',
    subcategory: 'maxi',
    name: 'Đầm maxi hoa nhí',
    price: 790000,
    originalPrice: null,
    image: img('photo-1496747611176-843222e1e57c'),
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 402,
    sizes: ['S', 'M', 'L'],
    material: 'Voan lụa',
    description:
      'Đầm maxi họa tiết hoa nhí, chất voan nhẹ có lớp lót. Rất hợp đi biển, du lịch hay dạo phố cuối tuần.',
  },
  {
    id: 'p011',
    category: 'tops',
    subcategory: 'jackets',
    name: 'Áo khoác da biker',
    price: 1290000,
    originalPrice: 1590000,
    image: img('photo-1551028719-00167b16eac5'),
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 233,
    sizes: ['S', 'M', 'L'],
    material: 'Da PU cao cấp',
    description: 'Áo khoác da dáng biker cá tính, khoá kéo lệch kim loại. Điểm nhấn mạnh mẽ cho mọi bộ trang phục.',
  },
  {
    id: 'p012',
    category: 'tops',
    subcategory: 'tshirts',
    name: 'Áo thun trơn form rộng',
    price: 199000,
    originalPrice: null,
    image: img('photo-1503342217505-b0a15ec3261c'),
    isNew: false,
    inStock: true,
    isBestSeller: true,
    soldCount: 760,
    sizes: ['M', 'L', 'XL'],
    material: '100% cotton',
    description: 'Áo thun form rộng vai rơi, vải dày vừa phải không bai nhão. Mặc thoải mái, dễ phối kiểu streetwear.',
  },
  {
    id: 'p013',
    category: 'bottoms',
    subcategory: 'jeans',
    name: 'Quần jeans ống loe',
    price: 649000,
    originalPrice: null,
    image: img('photo-1542272604-787c3835535d'),
    isNew: false,
    inStock: false,
    isBestSeller: true,
    soldCount: 510,
    sizes: ['26', '27', '28', '29'],
    material: '99% cotton denim, 1% spandex',
    description: 'Quần jeans ống loe phong cách retro, lưng cao tôn dáng. Kết hợp giày cao gót để chân trông dài hơn.',
  },
  {
    id: 'p014',
    category: 'dresses',
    subcategory: 'midi',
    name: 'Đầm suông cổ vuông',
    price: 690000,
    originalPrice: 860000,
    image: img('photo-1515886657613-9f3515b0c78f'),
    isNew: false,
    inStock: true,
    isBestSeller: true,
    soldCount: 588,
    sizes: ['S', 'M', 'L'],
    material: 'Linen pha',
    description: 'Đầm suông cổ vuông thanh lịch, dài qua gối. Che bụng tốt, mặc đi làm hay đi chơi đều phù hợp.',
  },
  {
    id: 'p015',
    category: 'tops',
    subcategory: 'shirts',
    name: 'Áo sơ mi lụa tay phồng',
    price: 489000,
    originalPrice: null,
    image: img('photo-1485968579580-b6d095142e6e'),
    isNew: true,
    inStock: true,
    isBestSeller: false,
    soldCount: 344,
    sizes: ['S', 'M', 'L'],
    material: 'Lụa tơ tằm nhân tạo',
    description: 'Áo sơ mi lụa tay phồng nữ tính, mặt vải bóng nhẹ. Sơ vin cùng chân váy hoặc quần tây đều sang.',
  },
];
