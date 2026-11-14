import { useEffect, useState } from 'react';
import Button from '../../../../components/common/Button';
import Dialog from '../../../../components/common/Dialog';
import Textarea from '../../../../components/common/Textarea';
import { useLanguage } from '../../../../hooks/useLanguage';

// Lý do hủy gợi ý (backend nhận chuỗi tự do, tối đa 500 ký tự)
const REASONS = ['changeAddress', 'changeProduct', 'foundCheaper', 'noLongerNeed', 'other'];

/**
 * Popup xác nhận hủy đơn: chọn lý do (gợi ý) hoặc tự ghi.
 * - onConfirm(reasonText) -> Promise
 */
function CancelOrderDialog({ open, orderNumber, onClose, onConfirm }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('changeProduct');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('changeProduct');
      setNote('');
    }
  }, [open]);

  const handleConfirm = async () => {
    const text = reason === 'other' ? note : t(`cancelOrder.reasons.${reason}`);
    setSaving(true);
    try {
      await onConfirm(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={t('cancelOrder.title')}
      description={t('cancelOrder.description', { number: orderNumber ?? '' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('cancelOrder.keep')}
          </Button>
          <Button className="btn--danger" onClick={handleConfirm} disabled={saving || (reason === 'other' && !note.trim())}>
            {saving ? t('common.saving') : t('cancelOrder.confirm')}
          </Button>
        </>
      }
    >
      <fieldset className="radio-list">
        <legend className="field__label">{t('cancelOrder.reasonLabel')}</legend>
        {REASONS.map((id) => (
          <label key={id} className="radio-list__item">
            <input type="radio" name="cancel-reason" checked={reason === id} onChange={() => setReason(id)} />
            <span>{t(`cancelOrder.reasons.${id}`)}</span>
          </label>
        ))}
      </fieldset>
      {reason === 'other' && (
        <Textarea
          className="cancel-note"
          label={t('cancelOrder.noteLabel')}
          value={note}
          maxLength={500}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
        />
      )}
    </Dialog>
  );
}

export default CancelOrderDialog;
