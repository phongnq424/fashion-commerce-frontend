// =====================================================================
// DỮ LIỆU ĐỊA CHỈ GIẢ (vài tỉnh/thành mẫu) cho ô chọn Tỉnh / Quận / Phường ở trang thanh toán.
// Khi có Backend hoặc dùng API địa chỉ thật -> xoá file này, chỉ sửa locationService.js.
// Mỗi cấp chỉ cần { id, name }. Cấp con nằm trong mảng con (districts, wards).
// =====================================================================
export const MOCK_PROVINCES = [
  {
    id: 'hcm',
    name: 'TP. Hồ Chí Minh',
    districts: [
      {
        id: 'hcm-q1',
        name: 'Quận 1',
        wards: [
          { id: 'hcm-q1-bennghe', name: 'Phường Bến Nghé' },
          { id: 'hcm-q1-benthanh', name: 'Phường Bến Thành' },
          { id: 'hcm-q1-dakao', name: 'Phường Đa Kao' },
          { id: 'hcm-q1-tandinh', name: 'Phường Tân Định' },
          { id: 'hcm-q1-phamngulao', name: 'Phường Phạm Ngũ Lão' },
          { id: 'hcm-q1-cauonglanh', name: 'Phường Cầu Ông Lãnh' },
          { id: 'hcm-q1-cogiang', name: 'Phường Cô Giang' },
          { id: 'hcm-q1-caukho', name: 'Phường Cầu Kho' },
          { id: 'hcm-q1-nguyencutrinh', name: 'Phường Nguyễn Cư Trinh' },
          { id: 'hcm-q1-nguyenthaibinh', name: 'Phường Nguyễn Thái Bình' },
        ],
      },
      {
        id: 'hcm-q3',
        name: 'Quận 3',
        wards: [
          { id: 'hcm-q3-vts', name: 'Phường Võ Thị Sáu' },
          { id: 'hcm-q3-p1', name: 'Phường 1' },
          { id: 'hcm-q3-p2', name: 'Phường 2' },
          { id: 'hcm-q3-p3', name: 'Phường 3' },
          { id: 'hcm-q3-p4', name: 'Phường 4' },
          { id: 'hcm-q3-p5', name: 'Phường 5' },
          { id: 'hcm-q3-p6', name: 'Phường 6' },
          { id: 'hcm-q3-p7', name: 'Phường 7' },
          { id: 'hcm-q3-p8', name: 'Phường 8' },
          { id: 'hcm-q3-p9', name: 'Phường 9' },
          { id: 'hcm-q3-p10', name: 'Phường 10' },
          { id: 'hcm-q3-p11', name: 'Phường 11' },
          { id: 'hcm-q3-p12', name: 'Phường 12' },
          { id: 'hcm-q3-p13', name: 'Phường 13' },
          { id: 'hcm-q3-p14', name: 'Phường 14' },
        ],
      },
      {
        id: 'hcm-td',
        name: 'TP. Thủ Đức',
        wards: [
          { id: 'hcm-td-ankhanh', name: 'Phường An Khánh' },
          { id: 'hcm-td-anloidong', name: 'Phường An Lợi Đông' },
          { id: 'hcm-td-anphu', name: 'Phường An Phú' },
          { id: 'hcm-td-binhtrungdong', name: 'Phường Bình Trưng Đông' },
          { id: 'hcm-td-binhtrungtay', name: 'Phường Bình Trưng Tây' },
          { id: 'hcm-td-catlai', name: 'Phường Cát Lái' },
          { id: 'hcm-td-thaodien', name: 'Phường Thảo Điền' },
          { id: 'hcm-td-linhchieu', name: 'Phường Linh Chiểu' },
          { id: 'hcm-td-linhdong', name: 'Phường Linh Đông' },
          { id: 'hcm-td-linhtay', name: 'Phường Linh Tây' },
          { id: 'hcm-td-linhtrung', name: 'Phường Linh Trung' },
          { id: 'hcm-td-tambinh', name: 'Phường Tam Bình' },
          { id: 'hcm-td-tamphu', name: 'Phường Tam Phú' },
          { id: 'hcm-td-truongtho', name: 'Phường Trường Thọ' },
        ],
      },
    ],
  },
  {
    id: 'hn',
    name: 'Hà Nội',
    districts: [
      {
        id: 'hn-bd',
        name: 'Quận Ba Đình',
        wards: [
          { id: 'hn-bd-px', name: 'Phường Phúc Xá' },
          { id: 'hn-bd-tb', name: 'Phường Trúc Bạch' },
          { id: 'hn-bd-dbp', name: 'Phường Điện Biên' },
        ],
      },
      {
        id: 'hn-cg',
        name: 'Quận Cầu Giấy',
        wards: [
          { id: 'hn-cg-dv', name: 'Phường Dịch Vọng' },
          { id: 'hn-cg-nd', name: 'Phường Nghĩa Đô' },
          { id: 'hn-cg-yh', name: 'Phường Yên Hòa' },
        ],
      },
    ],
  },
  {
    id: 'dn',
    name: 'Đà Nẵng',
    districts: [
      {
        id: 'dn-hc',
        name: 'Quận Hải Châu',
        wards: [
          { id: 'dn-hc-tt', name: 'Phường Thạch Thang' },
          { id: 'dn-hc-hc1', name: 'Phường Hải Châu I' },
        ],
      },
      {
        id: 'dn-st',
        name: 'Quận Sơn Trà',
        wards: [
          { id: 'dn-st-ahb', name: 'Phường An Hải Bắc' },
          { id: 'dn-st-mt', name: 'Phường Mân Thái' },
        ],
      },
    ],
  },
];
