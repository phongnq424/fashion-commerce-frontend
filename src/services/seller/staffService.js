import { apiError, isOwner, now, requireShop, SHOP_ROLES, shopSummary, slice, transact, userBucket, uuid } from './sellerDb';

// =====================================================================
// NHÂN VIÊN, LỜI MỜI, CHUYỂN QUYỀN SỞ HỮU — GIẢ LẬP, đúng dạng backend (contract mục 6):
//   GET    /shops/{shopId}/members                      -> SliceResponse<MemberResponse>
//   GET    /shops/{shopId}/assignable-roles             -> RoleResponse[]
//   POST   /shops/{shopId}/members/invitations          { email, roles[] } -> MemberResponse (INVITED)
//   PUT    /shops/{shopId}/members/{memberId}/roles     { roles[] } -> MemberResponse
//   DELETE /shops/{shopId}/members/{memberId}           -> 204
//   DELETE /shops/{shopId}/members/me                   -> 204 (tự rời shop)
//   GET    /shop-invitations                            -> InvitationResponse[]
//   POST   /shop-invitations/{memberId}/accept|decline
//   POST   /shops/{shopId}/ownership-transfers          { newOwnerUserId, keepPreviousOwnerAsManager }
//   GET    /shops/{shopId}/ownership-transfers          -> OwnershipTransferResponse[]
//   GET    /shop-ownership-transfers                    -> chuyển nhượng gửi TỚI tôi
//   POST   /shop-ownership-transfers/{id}/accept|reject ; DELETE /shop-ownership-transfers/{id} (hủy)
// =====================================================================

export const ASSIGNABLE_ROLES = SHOP_ROLES.filter((role) => role.code !== 'SHOP_OWNER');

export function getMembers(shopId, { limit = 50, offset = 0 } = {}) {
  return transact((db, me) => slice(requireShop(db, me, shopId).members, limit, offset), 120);
}

export function getAssignableRoles(shopId) {
  return transact((db, me) => {
    requireShop(db, me, shopId);
    return ASSIGNABLE_ROLES;
  }, 60);
}

const validRoles = (roles) => {
  if (!roles?.length || roles.some((code) => !ASSIGNABLE_ROLES.some((role) => role.code === code))) {
    throw apiError(400, 'SHOP_ROLE_INVALID');
  }
};

export function inviteMember(shopId, { email, roles }) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    validRoles(roles);
    const normalized = email.trim().toLowerCase();
    if (shop.members.some((m) => m.email.toLowerCase() === normalized && m.status !== 'DECLINED')) {
      throw apiError(409, 'SHOP_MEMBER_EXISTS');
    }
    const member = {
      memberId: uuid(),
      userId: uuid(),
      email: normalized,
      displayName: normalized.split('@')[0],
      status: 'INVITED',
      invitedBy: me.userId,
      joinedAt: null,
      createdAt: now(),
      roles,
    };
    shop.members.push(member);
    return member;
  });
}

export function updateMemberRoles(shopId, memberId, roles) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    validRoles(roles);
    const member = shop.members.find((m) => m.memberId === memberId);
    if (!member) throw apiError(404, 'SHOP_MEMBER_NOT_FOUND');
    if (member.roles.includes('SHOP_OWNER')) throw apiError(409, 'SHOP_OWNER_ROLE_LOCKED');
    member.roles = roles;
    return member;
  });
}

export function removeMember(shopId, memberId) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    const member = shop.members.find((m) => m.memberId === memberId);
    if (!member) throw apiError(404, 'SHOP_MEMBER_NOT_FOUND');
    if (member.roles.includes('SHOP_OWNER')) throw apiError(409, 'SHOP_OWNER_ROLE_LOCKED');
    shop.members = shop.members.filter((m) => m.memberId !== memberId);
  });
}

export function leaveShop(shopId) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    if (isOwner(shop, me)) throw apiError(409, 'SHOP_OWNER_CANNOT_LEAVE');
    shop.members = shop.members.filter((m) => m.userId !== me.userId);
  });
}

// ----- Lời mời gửi tới tôi -----
export function getMyInvitations() {
  return transact((db, me) => userBucket(db, me).invitations, 120);
}

export function acceptInvitation(memberId) {
  return transact((db, me) => {
    const bucket = userBucket(db, me);
    const invitation = bucket.invitations.find((item) => item.memberId === memberId);
    if (!invitation) throw apiError(404, 'SHOP_INVITATION_NOT_FOUND');
    const shop = db.shops[invitation.shopId];
    const member = shop?.members.find((m) => m.memberId === memberId);
    if (!member) throw apiError(404, 'SHOP_INVITATION_NOT_FOUND');
    Object.assign(member, { status: 'ACTIVE', joinedAt: now() });
    bucket.invitations = bucket.invitations.filter((item) => item.memberId !== memberId);
    return member;
  });
}

export function declineInvitation(memberId) {
  return transact((db, me) => {
    const bucket = userBucket(db, me);
    const invitation = bucket.invitations.find((item) => item.memberId === memberId);
    if (!invitation) throw apiError(404, 'SHOP_INVITATION_NOT_FOUND');
    const member = db.shops[invitation.shopId]?.members.find((m) => m.memberId === memberId);
    if (member) member.status = 'DECLINED';
    bucket.invitations = bucket.invitations.filter((item) => item.memberId !== memberId);
  });
}

// ----- Chuyển quyền sở hữu -----
const expire = (transfer) => {
  if (transfer.status === 'PENDING' && new Date(transfer.expiresAt) < new Date()) transfer.status = 'EXPIRED';
  return transfer;
};

export function createOwnershipTransfer(shopId, { newOwnerUserId, keepPreviousOwnerAsManager }) {
  return transact((db, me) => {
    const shop = requireShop(db, me, shopId);
    if (!isOwner(shop, me)) throw apiError(403, 'SHOP_OWNER_REQUIRED');
    const target = shop.members.find((m) => m.userId === newOwnerUserId && m.status === 'ACTIVE');
    if (!target || target.userId === me.userId) throw apiError(400, 'OWNERSHIP_TARGET_INVALID');
    if (shop.transfers.some((t) => expire(t).status === 'PENDING')) throw apiError(409, 'OWNERSHIP_TRANSFER_PENDING');
    const transfer = {
      id: uuid(),
      shopId,
      shopName: shop.profile.name,
      fromOwnerUserId: me.userId,
      toUserId: target.userId,
      keepPreviousOwnerAsManager: Boolean(keepPreviousOwnerAsManager),
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      decidedAt: null,
      createdAt: now(),
      toUserName: target.displayName, // riêng bản giả lập: tên người nhận để hiển thị
    };
    shop.transfers.unshift(transfer);
    return transfer;
  });
}

export function getShopTransfers(shopId) {
  return transact((db, me) => requireShop(db, me, shopId).transfers.map(expire), 100);
}

export function getIncomingTransfers() {
  return transact((db, me) => {
    const ids = userBucket(db, me).incomingTransfers;
    return Object.values(db.shops)
      .flatMap((shop) => shop.transfers)
      .filter((t) => ids.includes(t.id) || t.toUserId === me.userId)
      .map(expire);
  }, 100);
}

function findTransfer(db, transferId) {
  for (const shop of Object.values(db.shops)) {
    const transfer = shop.transfers.find((t) => t.id === transferId);
    if (transfer) return { shop, transfer: expire(transfer) };
  }
  throw apiError(404, 'OWNERSHIP_TRANSFER_NOT_FOUND');
}

export function acceptOwnershipTransfer(transferId) {
  return transact((db, me) => {
    const { shop, transfer } = findTransfer(db, transferId);
    if (transfer.status !== 'PENDING') throw apiError(409, 'OWNERSHIP_TRANSFER_NOT_PENDING');
    const previousOwner = shop.profile.ownerUserId;
    shop.profile.ownerUserId = me.userId;
    let mine = shop.members.find((m) => m.userId === me.userId);
    if (!mine) {
      mine = { memberId: uuid(), userId: me.userId, email: me.email, displayName: me.displayName, status: 'ACTIVE', invitedBy: previousOwner, joinedAt: now(), createdAt: now(), roles: [] };
      shop.members.push(mine);
    }
    Object.assign(mine, { status: 'ACTIVE', roles: ['SHOP_OWNER'] });
    const old = shop.members.find((m) => m.userId === previousOwner);
    if (old) {
      if (transfer.keepPreviousOwnerAsManager) old.roles = ['SHOP_MANAGER'];
      else shop.members = shop.members.filter((m) => m.userId !== previousOwner);
    }
    Object.assign(transfer, { status: 'ACCEPTED', decidedAt: now() });
    return shopSummary(shop, me);
  });
}

export function rejectOwnershipTransfer(transferId) {
  return transact((db) => {
    const { transfer } = findTransfer(db, transferId);
    if (transfer.status !== 'PENDING') throw apiError(409, 'OWNERSHIP_TRANSFER_NOT_PENDING');
    Object.assign(transfer, { status: 'REJECTED', decidedAt: now() });
  });
}

export function cancelOwnershipTransfer(transferId) {
  return transact((db, me) => {
    const { shop, transfer } = findTransfer(db, transferId);
    if (!isOwner(shop, me)) throw apiError(403, 'SHOP_OWNER_REQUIRED');
    if (transfer.status !== 'PENDING') throw apiError(409, 'OWNERSHIP_TRANSFER_NOT_PENDING');
    Object.assign(transfer, { status: 'CANCELLED', decidedAt: now() });
  });
}
