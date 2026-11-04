import { mockProducts } from '../data/mockProducts';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asMockProduct = (product) => ({ ...product, source: 'mock' });

export async function getMockBestSellers(limit = 10) {
  await wait(600);
  return [...mockProducts]
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, limit)
    .map(asMockProduct);
}

export async function getMockProductById(productId) {
  await wait(400);
  const product = mockProducts.find((item) => item.id === productId);
  return product ? asMockProduct(product) : null;
}

export async function getMockRecommendations(limit = 10) {
  await wait(600);
  const score = (product) => (product.originalPrice ? 2 : 0) + (product.isBestSeller ? 1 : 0);

  return mockProducts
    .filter((product) => product.inStock)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
    .map(asMockProduct);
}

export async function getMockSaleProducts(limit = 50) {
  await wait(500);
  return mockProducts
    .filter((product) => product.originalPrice > product.price)
    .slice(0, limit)
    .map(asMockProduct);
}

export async function getMockRelatedProducts(product, limit = 10) {
  await wait(500);
  const others = mockProducts.filter((item) => item.id !== product.id);
  const sameCategory = others.filter((item) => item.category === product.category);
  const rest = others.filter((item) => item.category !== product.category);

  return [...sameCategory, ...rest].slice(0, limit).map(asMockProduct);
}
