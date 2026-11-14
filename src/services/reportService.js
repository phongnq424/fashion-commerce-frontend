import { apiClient } from './apiClient';

// Báo cáo sản phẩm vi phạm — POST /products/{productId}/reports (cần đăng nhập)
// ReportProductRequest: { reason, description?, evidenceKeys? }
export const REPORT_REASONS = ['COUNTERFEIT', 'PROHIBITED', 'MISLEADING', 'COPYRIGHT', 'INAPPROPRIATE', 'OTHER'];

export function reportProduct(productId, { reason, description }) {
  return apiClient.post(`/products/${encodeURIComponent(productId)}/reports`, {
    reason,
    description: description?.trim() || null,
  });
}
