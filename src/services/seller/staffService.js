import { apiClient } from '../apiClient';
import { enc, SHOP_ROLES } from './constants';

// =====================================================================
// NHÂN VIÊN, LỜI MỜI, CHUYỂN QUYỀN SỞ HỮU — API thật
//   GET    /shops/{shopId}/members?limit=&offset=       -> SliceResponse<MemberResponse>
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
  return apiClient.get(`/shops/${enc(shopId)}/members?limit=${Math.min(limit, 100)}&offset=${offset}`);
}

export function getAssignableRoles(shopId) {
  return apiClient.get(`/shops/${enc(shopId)}/assignable-roles`);
}

export function inviteMember(shopId, { email, roles }) {
  return apiClient.post(`/shops/${enc(shopId)}/members/invitations`, { email: email.trim().toLowerCase(), roles });
}

export function updateMemberRoles(shopId, memberId, roles) {
  return apiClient.put(`/shops/${enc(shopId)}/members/${enc(memberId)}/roles`, { roles });
}

export function removeMember(shopId, memberId) {
  return apiClient.delete(`/shops/${enc(shopId)}/members/${enc(memberId)}`);
}

export function leaveShop(shopId) {
  return apiClient.delete(`/shops/${enc(shopId)}/members/me`);
}

// ----- Lời mời gửi tới tôi -----
export function getMyInvitations() {
  return apiClient.get('/shop-invitations');
}

export function acceptInvitation(memberId) {
  return apiClient.post(`/shop-invitations/${enc(memberId)}/accept`);
}

export function declineInvitation(memberId) {
  return apiClient.post(`/shop-invitations/${enc(memberId)}/decline`);
}

// ----- Chuyển quyền sở hữu -----
export function createOwnershipTransfer(shopId, { newOwnerUserId, keepPreviousOwnerAsManager }) {
  return apiClient.post(`/shops/${enc(shopId)}/ownership-transfers`, {
    newOwnerUserId,
    keepPreviousOwnerAsManager: Boolean(keepPreviousOwnerAsManager),
  });
}

export function getShopTransfers(shopId) {
  return apiClient.get(`/shops/${enc(shopId)}/ownership-transfers`);
}

export function getIncomingTransfers() {
  return apiClient.get('/shop-ownership-transfers');
}

export function acceptOwnershipTransfer(transferId) {
  return apiClient.post(`/shop-ownership-transfers/${enc(transferId)}/accept`);
}

export function rejectOwnershipTransfer(transferId) {
  return apiClient.post(`/shop-ownership-transfers/${enc(transferId)}/reject`);
}

export function cancelOwnershipTransfer(transferId) {
  return apiClient.delete(`/shop-ownership-transfers/${enc(transferId)}`);
}
