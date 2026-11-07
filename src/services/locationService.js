import { MOCK_PROVINCES } from '../data/mockLocations';

// =====================================================================
// LẤY DANH SÁCH TỈNH / QUẬN / PHƯỜNG cho form giao hàng.
// Hiện dùng dữ liệu giả. Khi có Backend, thay phần thân mỗi hàm bằng fetch, ví dụ:
//   const res = await fetch(`${API}/locations/provinces`);
//   return res.json();   // [{ id, name }]
// Giao diện chỉ cần mảng [{ id, name }] nên không phải sửa component.
// =====================================================================

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
const pick = ({ id, name }) => ({ id, name });

// Backend: GET `${API}/locations/provinces`
export async function getProvinces() {
  await wait();
  return MOCK_PROVINCES.map(pick);
}

// Backend: GET `${API}/locations/provinces/${provinceId}/districts`
export async function getDistricts(provinceId) {
  await wait();
  const province = MOCK_PROVINCES.find((item) => item.id === provinceId);
  return (province?.districts ?? []).map(pick);
}

// Backend: GET `${API}/locations/districts/${districtId}/wards`
export async function getWards(districtId) {
  await wait();
  for (const province of MOCK_PROVINCES) {
    const district = province.districts.find((item) => item.id === districtId);
    if (district) return district.wards.map(pick);
  }
  return [];
}
