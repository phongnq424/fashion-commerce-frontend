import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import Dialog from '../../../components/common/Dialog';
import Textarea from '../../../components/common/Textarea';
import { useLanguage } from '../../../hooks/useLanguage';
import { REPORT_REASONS, reportProduct } from '../../../services/reportService';

/**
 * Popup "Báo cáo sản phẩm" — POST /products/{productId}/reports (cần đăng nhập, nơi mở popup tự kiểm tra).
 * - product: { id, name }   - onDone(success: boolean, error?)
 */
function ReportProductDialog({ open, product, onClose, onDone }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reason) return;
    setSending(true);
    try {
      await reportProduct(product.id, { reason, description });
      onDone?.(true);
    } catch (error) {
      onDone?.(false, error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('report.title')}
      description={product?.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="report-form" disabled={!reason || sending || (reason === 'OTHER' && !description.trim())}>
            {sending ? t('common.saving') : t('report.submit')}
          </Button>
        </>
      }
    >
      <form id="report-form" className="report-form" onSubmit={handleSubmit}>
        <fieldset className="radio-list">
          <legend className="field__label">{t('report.reasonLabel')}</legend>
          {REPORT_REASONS.map((code) => (
            <label key={code} className="radio-list__item">
              <input type="radio" name="report-reason" checked={reason === code} onChange={() => setReason(code)} />
              <span>
                <strong>{t(`report.reasons.${code}.title`)}</strong>
                <span className="report-form__hint">{t(`report.reasons.${code}.hint`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Textarea
          label={t('report.description')}
          value={description}
          maxLength={2000}
          rows={3}
          placeholder={t('report.descriptionPlaceholder')}
          onChange={(event) => setDescription(event.target.value)}
        />
      </form>
    </Dialog>
  );
}

export default ReportProductDialog;
