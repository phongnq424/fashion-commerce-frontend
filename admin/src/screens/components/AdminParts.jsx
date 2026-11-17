import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@shared/components/common/Button';
import Dialog from '@shared/components/common/Dialog';
import EmptyState from '@shared/components/common/EmptyState';
import Icon from '@shared/components/common/Icon';
import Input from '@shared/components/common/Input';
import Textarea from '@shared/components/common/Textarea';
import { useLanguage } from '@shared/hooks/useLanguage';
import { getShopDirectory } from '../../services/platformService';

// Mã lỗi Backend -> câu thông báo (thiếu bản dịch -> câu chung)
export function useErrorText() {
  const { t } = useLanguage();
  return (error) =>
    error?.status === 403
      ? t('market.admin.noPermission')
      : t(`market.errors.${error?.code}`, { defaultValue: error?.message || t('account.actionError') });
}

// Trạng thái tải chung cho các bảng: đang tải / lỗi / không có quyền
export function ListState({ status, onRetry }) {
  const { t } = useLanguage();
  if (status === 'loading') return <div className="account-skeleton" />;
  if (status === 'forbidden') return <EmptyState icon="shield" title={t('market.admin.noPermission')} text={t('market.admin.noPermissionText')} />;
  if (status === 'error')
    return <EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={onRetry}>{t('common.retry')}</Button>} />;
  return null;
}

// Phân trang dạng "Trước / Sau" (Backend trả hasMore, không trả tổng số)
export function Pager({ page, hasMore, onChange }) {
  const { t } = useLanguage();
  if (page === 0 && !hasMore) return null;
  return (
    <nav className="pagination" aria-label={t('admin.pagination.label')}>
      <span className="cell-sub">{t('market.admin.page', { page: page + 1 })}</span>
      <div className="pagination__pages">
        <button type="button" className="pagination__btn" disabled={page === 0} aria-label={t('admin.pagination.prev')} onClick={() => onChange(page - 1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        <button type="button" className="pagination__btn" disabled={!hasMore} aria-label={t('admin.pagination.next')} onClick={() => onChange(page + 1)}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </nav>
  );
}

// Thanh lọc theo trạng thái (tab)
export function StatusTabs({ value, options, onChange, labelPrefix, allLabel }) {
  const { t } = useLanguage();
  const list = allLabel ? ['', ...options] : options;
  return (
    <div className="account-tabs" role="tablist">
      {list.map((id) => (
        <button key={id || 'all'} type="button" role="tab" className="account-tabs__tab" aria-selected={value === id} onClick={() => onChange(id)}>
          {id ? t(`${labelPrefix}.${id}`, { defaultValue: id }) : allLabel}
        </button>
      ))}
    </div>
  );
}

/**
 * Hộp thoại hỏi lý do trước khi thực hiện (Backend bắt buộc reason / note cho mọi thao tác kiểm duyệt).
 * - extraField: { key, label } ô nhập thêm (vd mã giao dịch khi xác nhận đã chi tiền)
 * - onConfirm({ reason, extra }) -> Promise
 */
export function ReasonDialog({ open, title, description, confirmLabel, danger = false, requireReason = true, extraField, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setExtra('');
    }
  }, [open]);

  const valid = (!requireReason || reason.trim()) && (!extraField || extra.trim());
  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onConfirm({ reason, extra });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button className={danger ? 'btn--danger' : undefined} disabled={!valid || busy} onClick={submit}>
            {busy ? t('common.loading') : confirmLabel}
          </Button>
        </>
      }
    >
      {extraField && <Input label={extraField.label} value={extra} maxLength={160} onChange={(e) => setExtra(e.target.value)} />}
      <Textarea label={t('market.admin.reason')} value={reason} maxLength={2000} rows={3} onChange={(e) => setReason(e.target.value)} />
    </Dialog>
  );
}

// Danh bạ shop (shopId -> shop) cho các bảng chỉ có shopId. null = đang tải; Map rỗng = lỗi / không có quyền.
export function useShopDirectory() {
  const [shops, setShops] = useState(null);
  useEffect(() => {
    let active = true;
    getShopDirectory()
      .then((map) => active && setShops(map))
      .catch(() => active && setShops(new Map()));
    return () => {
      active = false;
    };
  }, []);
  return shops;
}

// Ô "Shop": logo + tên + /slug (+ trạng thái nếu không hoạt động). Bấm -> trang Shop lọc đúng shop đó.
export function ShopCell({ shopId, shops, compact = false }) {
  const { t } = useLanguage();
  const shop = shops?.get(shopId);
  if (!shopId) return '—';
  if (!shops) return <span className="cell-sub">…</span>;
  const name = shop?.name ?? t('admin.platform.shopRef.unknown', { id: shopId.slice(0, 8) });
  return (
    <Link to={`/shops?shop=${shopId}`} className={`admin-shop ${compact ? 'admin-shop--compact' : ''}`} title={t('admin.platform.shopRef.open')}>
      <span className="admin-shop__logo" aria-hidden="true">
        {shop?.logoUrl ? <img src={shop.logoUrl} alt="" /> : name.charAt(0).toUpperCase()}
      </span>
      <span className="admin-shop__text">
        <span className="admin-shop__name">{name}</span>
        {!compact && shop && (
          <span className="cell-sub">
            /{shop.slug}
            {shop.status !== 'ACTIVE' && <> · {t(`seller.shopStatus.${shop.status}`, { defaultValue: shop.status })}</>}
          </span>
        )}
      </span>
    </Link>
  );
}
