import { mockProducts } from '../data/mockProducts';

// Lớp "service": nơi DUY NHẤT biết dữ liệu đến từ đâu.
// Hiện tại trả dữ liệu giả sau 600ms để mô phỏng độ trễ mạng.
// Khi nối Backend, thay thân hàm bằng:
//   const res = await fetch(`${import.meta.env.VITE_API_URL}/products?sort=newest&limit=8`);
//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   return res.json();
export async function getNewArrivals() {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return mockProducts;
}
