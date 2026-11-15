import { apiError, isOwner, now, requireShop, SHOP_ROLES, slice, transact, uuid } from './adminDb';

// =====================================================================
// NHÂN VIÊN CỬA HÀNG — GIẢ LẬP, đúng dạng backend (contract mục 6):
//   GET    /shops/{shopId}/members                      -> SliceResponse<MemberResponse>
//   GET    /shops/{shopId}/assignable-roles             -> RoleResponse[]
//   POST   /shops/{shopId}/members/invitations          { email, roles[] } -> MemberResponse (INVITED)
//   PUT    /shops/{shopId}/members/{memberId}/roles     { roles[] } -> MemberResponse
//   DELETE /shops/{shopId}/members/{memberId}           -> 204
//   DELETE /shops/{shopId}/members/me                   -> 204 (tự rời)
// TrendyLab chỉ có 1 cửa hàng nên không dùng các API lời mời / chuyển quyền sở hữu của backend.
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
