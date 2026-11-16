import { ApiError, apiClient } from '../apiClient';
import { enc } from './constants';

// =====================================================================
// ĐĂNG KÝ BÁN HÀNG (seller onboarding) — API thật
//   POST /seller/onboarding                                   ShopProfileRequest -> OnboardingResponse
//   GET  /seller/onboarding/me                                -> OnboardingResponse (404 nếu chưa có)
//   PUT  /seller/onboarding/{id}/shop                         ShopProfileRequest
//   PUT  /seller/onboarding/{id}/pickup-address               PickupAddressRequest -> PickupAddressResponse
//   GET  /seller/onboarding/{id}/shipping-providers           -> ShippingProviderResponse[]
//   PUT  /seller/onboarding/{id}/shipping                     ShippingConfigurationRequest
//   PUT  /seller/onboarding/{id}/tax                          TaxProfileRequest -> TaxProfileResponse
//   PUT  /seller/onboarding/{id}/identity                     IdentityVerificationRequest
//   GET  /seller/onboarding/{id}/policies                     -> PolicyVersionResponse[]
//   POST /seller/onboarding/{id}/policy-acceptances           { policyVersion, accepted: true }
//   POST /seller/onboarding/{id}/complete                     -> PENDING_REVIEW (chờ kiểm duyệt của sàn)
//   GET  /seller/applications                                 -> lịch sử hồ sơ
// Duyệt / từ chối là việc của nhân viên sàn ở trang /admin (POST /admin/seller-onboardings/{id}/decision).
// =====================================================================

export const BUSINESS_TYPES = ['INDIVIDUAL', 'HOUSEHOLD_BUSINESS', 'ENTERPRISE'];

const base = (id) => `/seller/onboarding/${enc(id)}`;
const trimOrNull = (value) => (value && String(value).trim() ? String(value).trim() : null);

const toShopProfile = (request) => ({
  name: request.name.trim(),
  email: request.email.trim(),
  phone: request.phone.replace(/[\s.]/g, ''),
  avatarKey: trimOrNull(request.avatarKey),
  description: trimOrNull(request.description),
  coverKey: trimOrNull(request.coverKey),
});

export function startOnboarding(request) {
  return apiClient.post('/seller/onboarding', toShopProfile(request));
}

// Chưa có hồ sơ -> null (Backend trả 404)
export async function getMyOnboarding() {
  try {
    return await apiClient.get('/seller/onboarding/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function updateShopProfile(onboardingId, request) {
  return apiClient.put(`${base(onboardingId)}/shop`, toShopProfile(request));
}

export function savePickupAddress(onboardingId, request) {
  return apiClient.put(`${base(onboardingId)}/pickup-address`, {
    contactName: request.contactName.trim(),
    contactPhone: request.contactPhone.replace(/[\s.]/g, ''),
    provinceCode: trimOrNull(request.provinceCode),
    provinceName: request.provinceName,
    wardCode: trimOrNull(request.wardCode),
    wardName: request.wardName,
    addressDetail: request.addressDetail.trim(),
    defaultPickup: request.defaultPickup ?? true,
  });
}

export function getShippingProviders(onboardingId) {
  return apiClient.get(`${base(onboardingId)}/shipping-providers`);
}

export function configureShipping(onboardingId, { pickupAddressId, providers }) {
  return apiClient.put(`${base(onboardingId)}/shipping`, { pickupAddressId, providers });
}

export function saveTaxProfile(onboardingId, request) {
  const address = request.registeredAddress ?? {};
  return apiClient.put(`${base(onboardingId)}/tax`, {
    businessType: request.businessType,
    legalName: trimOrNull(request.legalName),
    businessName: trimOrNull(request.businessName),
    legalRepresentativeName: trimOrNull(request.legalRepresentativeName),
    taxCode: String(request.taxCode ?? '').trim(),
    businessRegistrationNumber: trimOrNull(request.businessRegistrationNumber),
    issuedDate: trimOrNull(request.issuedDate),
    issuedBy: trimOrNull(request.issuedBy),
    registeredAddress: {
      provinceCode: trimOrNull(address.provinceCode),
      provinceName: address.provinceName,
      wardCode: trimOrNull(address.wardCode),
      wardName: address.wardName,
      addressDetail: String(address.addressDetail ?? '').trim(),
    },
    invoiceEmail: String(request.invoiceEmail ?? '').trim(),
    registrationDocumentKey: trimOrNull(request.registrationDocumentKey),
  });
}

export function submitIdentity(onboardingId, request) {
  return apiClient.put(`${base(onboardingId)}/identity`, {
    legalName: request.legalName.trim(),
    documentNumberLast4: request.documentNumberLast4,
    frontDocumentKey: request.frontDocumentKey,
    backDocumentKey: request.backDocumentKey,
    selfieDocumentKey: request.selfieDocumentKey,
  });
}

export function getPolicies(onboardingId) {
  return apiClient.get(`${base(onboardingId)}/policies`);
}

export function acceptPolicy(onboardingId, policyVersion) {
  return apiClient.post(`${base(onboardingId)}/policy-acceptances`, { policyVersion, accepted: true });
}

/**
 * Bước nào đã xong (wizard hiện dấu ✓ và nút "Gửi duyệt").
 * policies (tuỳ chọn): kết quả getPolicies — có thì kiểm tra đủ chính sách BẮT BUỘC,
 * chưa có thì coi là xong khi đã đồng ý ít nhất 1 chính sách (Backend kiểm tra lại khi gửi duyệt).
 */
export function onboardingProgress(row, policies = null) {
  if (!row) return { shop: false, pickup: false, shipping: false, tax: false, identity: false, policies: false };
  const accepted = row.acceptedPolicyVersions ?? [];
  return {
    shop: Boolean(row.shop?.name),
    pickup: (row.pickupAddresses ?? []).length > 0,
    shipping: (row.shippingProviders ?? []).some((p) => p.enabled),
    tax: Boolean(row.taxProfile),
    identity: Boolean(row.identityVerification),
    policies: policies
      ? policies.filter((p) => p.required).every((p) => p.accepted || accepted.includes(p.version))
      : accepted.length > 0,
  };
}

export function completeOnboarding(onboardingId) {
  return apiClient.post(`${base(onboardingId)}/complete`);
}

export function getApplications({ limit = 20, offset = 0 } = {}) {
  return apiClient.get(`/seller/applications?limit=${limit}&offset=${offset}`);
}
