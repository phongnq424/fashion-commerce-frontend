import {
  apiError,
  newShop,
  now,
  SELLER_POLICIES,
  SHIPPING_PROVIDERS,
  seedShopContent,
  seedStaff,
  slugify,
  transact,
  userBucket,
  uuid,
} from './sellerDb';

// =====================================================================
// ĐĂNG KÝ BÁN HÀNG (seller onboarding) — GIẢ LẬP, đúng dạng backend (contract mục 5):
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
//   POST /seller/onboarding/{id}/complete                     -> trạng thái PENDING_REVIEW (chờ kiểm duyệt)
// Quy tắc giống backend: chỉ sửa được khi DRAFT / REJECTED; tên trên CCCD phải khớp hồ sơ thuế;
// gửi duyệt cần đủ: shop, địa chỉ lấy hàng, ≥1 đơn vị vận chuyển, thuế, CCCD, mọi chính sách bắt buộc.
// =====================================================================

export const BUSINESS_TYPES = ['INDIVIDUAL', 'HOUSEHOLD_BUSINESS', 'ENTERPRISE'];

const normalizeName = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

function mine(db, me, onboardingId) {
  const bucket = userBucket(db, me);
  const row = bucket.onboarding;
  if (!row || (onboardingId && row.id !== onboardingId)) throw apiError(404, 'SELLER_ONBOARDING_NOT_FOUND');
  return row;
}

function editable(db, me, onboardingId) {
  const row = mine(db, me, onboardingId);
  if (!['DRAFT', 'REJECTED'].includes(row.status)) throw apiError(409, 'SELLER_ONBOARDING_NOT_EDITABLE');
  row.updatedAt = now();
  return row;
}

function shopProfile(request, current) {
  return {
    shopId: current?.shopId ?? uuid(),
    name: request.name.trim(),
    slug: current?.slug ?? slugify(request.name),
    email: request.email.trim(),
    phone: request.phone.replace(/[\s.]/g, ''),
    avatarKey: request.avatarKey || null,
    avatarUrl: request.avatarKey || null,
    description: request.description?.trim() || null,
    coverKey: request.coverKey || null,
    coverUrl: request.coverKey || null,
    status: 'DRAFT',
  };
}

export function startOnboarding(request) {
  return transact((db, me) => {
    const bucket = userBucket(db, me);
    if (bucket.onboarding && bucket.onboarding.status !== 'CANCELLED') throw apiError(409, 'SELLER_ONBOARDING_EXISTS');
    const at = now();
    bucket.onboarding = {
      id: uuid(),
      applicantUserId: me.userId,
      status: 'DRAFT',
      shop: shopProfile(request),
      pickupAddresses: [],
      shippingProviders: SHIPPING_PROVIDERS.map((p) => ({ ...p, available: true, enabled: false, pickupAddressId: null })),
      taxProfile: null,
      identityVerification: null,
      acceptedPolicyVersions: [],
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      completedAt: null,
      createdAt: at,
      updatedAt: at,
    };
    return bucket.onboarding;
  });
}

// Chưa có hồ sơ -> trả null (backend trả 404)
export function getMyOnboarding() {
  return transact((db, me) => userBucket(db, me).onboarding ?? null, 120);
}

export function updateShopProfile(onboardingId, request) {
  return transact((db, me) => {
    const row = editable(db, me, onboardingId);
    row.shop = shopProfile(request, row.shop);
    return row;
  });
}

export function savePickupAddress(onboardingId, request) {
  return transact((db, me) => {
    const row = editable(db, me, onboardingId);
    const address = {
      id: row.pickupAddresses[0]?.id ?? uuid(),
      contactName: request.contactName.trim(),
      contactPhone: request.contactPhone.replace(/[\s.]/g, ''),
      provinceCode: request.provinceCode || null,
      provinceName: request.provinceName,
      wardCode: request.wardCode || null,
      wardName: request.wardName,
      addressDetail: request.addressDetail.trim(),
      defaultPickup: true,
      active: true,
    };
    row.pickupAddresses = [address];
    row.shippingProviders = row.shippingProviders.map((p) => ({ ...p, pickupAddressId: p.enabled ? address.id : p.pickupAddressId }));
    return address;
  });
}

export function getShippingProviders(onboardingId) {
  return transact((db, me) => mine(db, me, onboardingId).shippingProviders, 100);
}

export function configureShipping(onboardingId, { pickupAddressId, providers }) {
  return transact((db, me) => {
    const row = editable(db, me, onboardingId);
    if (!row.pickupAddresses.some((a) => a.id === pickupAddressId)) throw apiError(400, 'PICKUP_ADDRESS_INVALID');
    if (!providers.some((p) => p.enabled)) throw apiError(400, 'SHIPPING_PROVIDER_REQUIRED');
    row.shippingProviders = row.shippingProviders.map((p) => {
      const enabled = Boolean(providers.find((item) => item.providerCode === p.code)?.enabled);
      return { ...p, enabled, pickupAddressId: enabled ? pickupAddressId : null };
    });
    return row.shippingProviders;
  });
}

export function saveTaxProfile(onboardingId, request) {
  return transact((db, me) => {
    const row = editable(db, me, onboardingId);
    const need = (value) => {
      if (!value || !String(value).trim()) throw apiError(400, 'SELLER_TAX_PROFILE_INVALID');
    };
    if (request.businessType === 'INDIVIDUAL') need(request.legalName);
    if (request.businessType === 'HOUSEHOLD_BUSINESS') need(request.legalName);
    if (request.businessType === 'ENTERPRISE') need(request.legalRepresentativeName);
    if (request.businessType !== 'INDIVIDUAL') {
      [request.businessName, request.businessRegistrationNumber, request.issuedDate, request.issuedBy, request.registrationDocumentKey].forEach(need);
    }
    row.taxProfile = { ...request, status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewNote: null };
    return row.taxProfile;
  });
}

export function submitIdentity(onboardingId, request) {
  return transact((db, me) => {
    const row = editable(db, me, onboardingId);
    const tax = row.taxProfile;
    if (!tax) throw apiError(409, 'SELLER_TAX_PROFILE_REQUIRED');
    const expected = tax.businessType === 'ENTERPRISE' ? tax.legalRepresentativeName : tax.legalName;
    if (normalizeName(expected) !== normalizeName(request.legalName)) throw apiError(400, 'IDENTITY_LEGAL_NAME_MISMATCH');
    row.identityVerification = { documentType: 'CCCD', ...request, status: 'PENDING', reviewedBy: null, reviewedAt: null, reviewNote: null };
    return row;
  });
}

export function getPolicies(onboardingId) {
  return transact((db, me) => {
    const row = mine(db, me, onboardingId);
    return SELLER_POLICIES.map((policy) => ({
      ...policy,
      effectiveAt: '2026-01-01T00:00:00Z',
      accepted: row.acceptedPolicyVersions.includes(policy.version),
    }));
  }, 100);
}

export function acceptPolicy(onboardingId, policyVersion) {
  return transact((db, me) => {
    const row = editable(db, me, onboardingId);
    if (!SELLER_POLICIES.some((p) => p.version === policyVersion)) throw apiError(400, 'SELLER_POLICY_VERSION_INVALID');
    if (!row.acceptedPolicyVersions.includes(policyVersion)) row.acceptedPolicyVersions.push(policyVersion);
    return row;
  });
}

// Bước nào đã xong (để wizard hiện dấu ✓ và nút "Gửi duyệt")
export function onboardingProgress(row) {
  if (!row) return { shop: false, pickup: false, shipping: false, tax: false, identity: false, policies: false };
  return {
    shop: Boolean(row.shop?.name),
    pickup: row.pickupAddresses.length > 0,
    shipping: row.shippingProviders.some((p) => p.enabled),
    tax: Boolean(row.taxProfile),
    identity: Boolean(row.identityVerification),
    policies: SELLER_POLICIES.filter((p) => p.required).every((p) => row.acceptedPolicyVersions.includes(p.version)),
  };
}

export function completeOnboarding(onboardingId) {
  return transact((db, me) => {
    const row = editable(db, me, onboardingId);
    if (!Object.values(onboardingProgress(row)).every(Boolean)) throw apiError(409, 'SELLER_ONBOARDING_INCOMPLETE');
    row.status = 'PENDING_REVIEW';
    row.submittedAt = now();
    row.reviewNote = null;
    const bucket = userBucket(db, me);
    bucket.applications = [
      {
        id: row.id,
        applicantUserId: me.userId,
        proposedShopName: row.shop.name,
        contactEmail: row.shop.email,
        status: 'UNDER_REVIEW',
        reviewedAt: null,
        createdAt: row.createdAt,
        updatedAt: row.submittedAt,
      },
    ];
    return row;
  });
}

// GET /seller/applications — lịch sử hồ sơ
export function getApplications() {
  return transact((db, me) => {
    const items = userBucket(db, me).applications;
    return { items, limit: 20, offset: 0, hasMore: false };
  }, 100);
}

// Hồ sơ được duyệt -> tạo shop ACTIVE kèm dữ liệu mẫu
function activateShop(db, me, row) {
  const shop = newShop({
    shopId: row.shop.shopId,
    ownerUserId: me.userId,
    ownerEmail: me.email,
    ownerName: me.displayName,
    name: row.shop.name,
    slug: row.shop.slug,
    email: row.shop.email,
    phone: row.shop.phone,
    description: row.shop.description,
    logoUrl: row.shop.avatarUrl,
    bannerUrl: row.shop.coverUrl,
    pickupAddresses: row.pickupAddresses,
    shippingProviders: row.shippingProviders,
    applicationId: row.id,
  });
  seedShopContent(shop, me.displayName);
  seedStaff(shop, me.userId);
  db.shops[shop.profile.id] = shop;
  return shop;
}

/**
 * CHỈ CÓ Ở BẢN GIẢ LẬP — mô phỏng người kiểm duyệt (admin) duyệt / từ chối hồ sơ,
 * để xem tiếp được các màn của shop. Backend thật: admin xử lý ở /admin/seller-onboardings/{id}/decision.
 */
export function simulateReviewDecision(onboardingId, decision, note) {
  return transact((db, me) => {
    const row = mine(db, me, onboardingId);
    if (row.status !== 'PENDING_REVIEW') throw apiError(409, 'SELLER_ONBOARDING_STATE_CONFLICT');
    row.reviewedAt = now();
    row.reviewedBy = 'moderator';
    const bucket = userBucket(db, me);
    if (decision === 'APPROVED') {
      row.status = 'COMPLETED';
      row.completedAt = row.reviewedAt;
      row.shop.status = 'ACTIVE';
      activateShop(db, me, row);
    } else {
      row.status = 'REJECTED';
      row.reviewNote = note || 'Ảnh CCCD bị mờ, vui lòng chụp lại rõ nét.';
    }
    bucket.applications = bucket.applications.map((app) => ({ ...app, status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED', reviewedAt: row.reviewedAt }));
    return row;
  });
}

/**
 * CHỈ CÓ Ở BẢN GIẢ LẬP — tạo ngay 1 shop mẫu đã duyệt (bỏ qua 6 bước) để xem thử Seller Center.
 */
export function createDemoShop() {
  return transact((db, me) => {
    const bucket = userBucket(db, me);
    const at = now();
    const pickup = { id: uuid(), contactName: me.displayName, contactPhone: '0901234567', provinceCode: '79', provinceName: 'TP. Hồ Chí Minh', wardCode: null, wardName: 'Phường Bến Nghé', addressDetail: '123 Nguyễn Văn Cừ', defaultPickup: true, active: true };
    bucket.onboarding = {
      id: uuid(),
      applicantUserId: me.userId,
      status: 'PENDING_REVIEW',
      shop: { shopId: uuid(), name: 'TrendyLab Official', slug: `trendylab-${Math.floor(Math.random() * 900 + 100)}`, email: me.email, phone: '0901234567', avatarKey: '/categories/ao-thun.jpg', avatarUrl: '/categories/ao-thun.jpg', description: 'Thời trang trẻ trung cho mọi ngày.', coverKey: '/banners/banner-1.png', coverUrl: '/banners/banner-1.png', status: 'DRAFT' },
      pickupAddresses: [pickup],
      shippingProviders: SHIPPING_PROVIDERS.map((p) => ({ ...p, available: true, enabled: p.code !== 'VIETTEL_POST', pickupAddressId: p.code !== 'VIETTEL_POST' ? pickup.id : null })),
      taxProfile: { businessType: 'INDIVIDUAL', legalName: me.displayName, taxCode: '0312345678', registeredAddress: { provinceName: 'TP. Hồ Chí Minh', wardName: 'Phường Bến Nghé', addressDetail: '123 Nguyễn Văn Cừ' }, invoiceEmail: me.email, status: 'APPROVED' },
      identityVerification: { documentType: 'CCCD', legalName: me.displayName, documentNumberLast4: '1234', status: 'APPROVED' },
      acceptedPolicyVersions: SELLER_POLICIES.map((p) => p.version),
      submittedAt: at,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      completedAt: null,
      createdAt: at,
      updatedAt: at,
    };
    const row = bucket.onboarding;
    row.status = 'COMPLETED';
    row.completedAt = at;
    row.reviewedAt = at;
    row.shop.status = 'ACTIVE';
    bucket.applications = [{ id: row.id, applicantUserId: me.userId, proposedShopName: row.shop.name, contactEmail: me.email, status: 'APPROVED', reviewedAt: at, createdAt: at, updatedAt: at }];
    return activateShop(db, me, row).profile;
  });
}
