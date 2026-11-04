import { useEffect, useRef } from 'react';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { SIZE_CHART } from '../../../data/storePolicies';

const COLUMNS = ['size', 'height', 'weight', 'bust', 'waist'];

/**
 * Popup "Hướng dẫn chọn size": bảng số đo tham khảo (dữ liệu trong data/storePolicies.js).
 * - open, onClose
 */
function SizeGuideDialog({ open, onClose }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="size-guide"
      aria-labelledby="size-guide-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // bấm ra vùng tối -> đóng
      }}
    >
      <div className="size-guide__panel">
        <div className="size-guide__head">
          <h2 id="size-guide-title" className="size-guide__title">
            {t('productDetail.sizeGuideTitle')}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" />
          </button>
        </div>

        <div className="size-guide__table-wrap">
          <table className="size-guide__table">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col} scope="col">
                    {t(`productDetail.sizeCols.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row) => (
                <tr key={row.size}>
                  {COLUMNS.map((col) =>
                    col === 'size' ? (
                      <th key={col} scope="row">
                        {row.size}
                      </th>
                    ) : (
                      <td key={col}>{row[col]}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="size-guide__note">{t('productDetail.sizeGuideNote')}</p>
      </div>
    </dialog>
  );
}

export default SizeGuideDialog;
