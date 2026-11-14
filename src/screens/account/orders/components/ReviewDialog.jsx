import { useEffect, useState } from 'react';
import Button from '../../../../components/common/Button';
import Dialog from '../../../../components/common/Dialog';
import Input from '../../../../components/common/Input';
import Textarea from '../../../../components/common/Textarea';
import { useLanguage } from '../../../../hooks/useLanguage';
import { formatOptions } from '../../../../utils/status';
import ImageUrlField from './ImageUrlField';
import StarPicker from './StarPicker';

/**
 * Popup viết / sửa đánh giá cho 1 dòng hàng đã giao.
 * - item: OrderItemResponse (productName, options)
 * - review: ReviewResponse đã gửi trước đó (sửa) | null (viết mới)
 * - onSubmit({ rating, title, body, mediaKeys }) -> Promise
 */
function ReviewDialog({ open, item, review, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaKeys, setMediaKeys] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(review?.rating ?? 5);
    setTitle(review?.title ?? '');
    setBody(review?.body ?? '');
    setMediaKeys(review?.mediaKeys ?? []);
  }, [open, review]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ rating, title, body, mediaKeys });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={review ? t('reviewForm.editTitle') : t('reviewForm.title')}
      description={item ? [item.productName, formatOptions(item.options)].filter(Boolean).join(' · ') : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="review-form" disabled={saving || rating < 1}>
            {saving ? t('common.saving') : t('reviewForm.submit')}
          </Button>
        </>
      }
    >
      <form id="review-form" className="order-review-form" onSubmit={handleSubmit}>
        <StarPicker value={rating} onChange={setRating} />
        <Input
          label={t('reviewForm.headline')}
          value={title}
          maxLength={180}
          placeholder={t('reviewForm.headlinePlaceholder')}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          label={t('reviewForm.body')}
          value={body}
          maxLength={5000}
          rows={5}
          placeholder={t('reviewForm.bodyPlaceholder')}
          onChange={(event) => setBody(event.target.value)}
        />
        <ImageUrlField label={t('reviewForm.images')} value={mediaKeys} onChange={setMediaKeys} max={8} />
      </form>
    </Dialog>
  );
}

export default ReviewDialog;
