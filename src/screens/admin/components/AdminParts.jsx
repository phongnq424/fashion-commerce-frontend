import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';

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
