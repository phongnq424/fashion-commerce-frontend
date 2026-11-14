import { useEffect, useId, useRef } from 'react';
import Icon from './Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './Dialog.css';

/**
 * Hộp thoại dùng chung (dùng thẻ <dialog> gốc: tự khoá focus, Esc để đóng).
 * - open, onClose
 * - title: tiêu đề (đã dịch)       - description: dòng mô tả nhỏ dưới tiêu đề (tuỳ chọn)
 * - footer: các nút ở cuối (tuỳ chọn)
 * - size: 'sm' (420px) | 'md' (560px, mặc định) | 'lg' (720px)
 * Trên mobile, hộp thoại trượt lên từ đáy màn hình (bottom sheet).
 */
function Dialog({ open, onClose, title, description, footer, size = 'md', children }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`dialog dialog--${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.(); // bấm ra vùng tối -> đóng
      }}
    >
      {open && (
        <div className="dialog__panel">
          <header className="dialog__head">
            <div>
              <h2 id={titleId} className="dialog__title">
                {title}
              </h2>
              {description && (
                <p id={descId} className="dialog__desc">
                  {description}
                </p>
              )}
            </div>
            <button type="button" className="icon-btn dialog__close" onClick={onClose} aria-label={t('common.close')}>
              <Icon name="close" />
            </button>
          </header>
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export default Dialog;
