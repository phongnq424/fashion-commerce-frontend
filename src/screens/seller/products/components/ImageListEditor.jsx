import { useState } from 'react';
import Icon from '../../../../components/common/Icon';
import { useLanguage } from '../../../../hooks/useLanguage';

const URL = /^(https?:\/\/|\/)\S+$/i;

/**
 * Quản lý ảnh sản phẩm: lưới ảnh (ảnh chính có nhãn), nút ★ đặt ảnh chính, ← → đổi thứ tự, ✕ xoá,
 * ô dán link ảnh để thêm (backend chưa có API upload -> gửi URL trong storageKey). Tối đa 30 ảnh.
 * - images: [{ id, url, primary }]
 * - onAdd(url), onRemove(id), onPrimary(id), onMove(id, -1 | 1)   - busy: đang lưu
 */
function ImageListEditor({ images, onAdd, onRemove, onPrimary, onMove, busy, error }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [draftError, setDraftError] = useState('');

  const add = () => {
    const url = draft.trim();
    if (!URL.test(url)) return setDraftError(t('seller.errors.url'));
    if (images.some((img) => img.url === url)) return setDraft('');
    setDraftError('');
    setDraft('');
    onAdd(url);
  };

  return (
    <div className="image-editor">
      <ul className="image-editor__grid">
        {images.map((img, index) => (
          <li key={img.id} className={`image-editor__item ${img.primary ? 'image-editor__item--primary' : ''}`}>
            <img src={img.url} alt="" />
            {img.primary && <span className="image-editor__badge">{t('seller.productForm.primaryImage')}</span>}
            <div className="image-editor__tools">
              {!img.primary && (
                <button type="button" disabled={busy} onClick={() => onPrimary(img.id)} aria-label={t('seller.productForm.setPrimary')} title={t('seller.productForm.setPrimary')}>
                  <Icon name="star" size={14} />
                </button>
              )}
              <button type="button" disabled={busy || index === 0} onClick={() => onMove(img.id, -1)} aria-label={t('seller.productForm.moveLeft')}>
                <Icon name="chevronLeft" size={14} />
              </button>
              <button type="button" disabled={busy || index === images.length - 1} onClick={() => onMove(img.id, 1)} aria-label={t('seller.productForm.moveRight')}>
                <Icon name="chevronRight" size={14} />
              </button>
              <button type="button" disabled={busy} onClick={() => onRemove(img.id)} aria-label={t('common.delete')}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          </li>
        ))}
        {images.length === 0 && (
          <li className="image-editor__empty">
            <Icon name="image" size={28} />
            <span>{t('seller.productForm.noImages')}</span>
          </li>
        )}
      </ul>
      {images.length < 30 && (
        <div className="image-urls__add">
          <input
            type="url"
            className="field__input"
            value={draft}
            placeholder="https://..."
            aria-label={t('seller.productForm.imageUrl')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" className="btn btn--outline btn--md" disabled={busy} onClick={add}>
            <Icon name="plus" size={18} />
            {t('seller.productForm.addImage')}
          </button>
        </div>
      )}
      {draftError || error ? (
        <p className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {draftError || error}
        </p>
      ) : (
        <p className="field__hint">{t('seller.productForm.imageHint')}</p>
      )}
    </div>
  );
}

export default ImageListEditor;
