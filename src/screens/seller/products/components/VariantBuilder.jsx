import { useEffect, useState } from 'react';
import Icon from '../../../../components/common/Icon';
import { useLanguage } from '../../../../hooks/useLanguage';

// Mã phân loại cho backend: "Xám trắng" -> "XAM_TRANG"
export const toCode = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'X';

const num = (value) => (value === '' || value == null ? '' : String(value).replace(/\D/g, ''));

/**
 * TẠO PHÂN LOẠI + BẢNG GIÁ / KHO (chỉ khi tạo sản phẩm mới).
 *   Kích cỡ: gõ rồi Enter (S, M, L...)   Màu sắc: tên + ô chọn màu
 *   -> tự sinh bảng tổ hợp (mỗi dòng 1 SKU): mã SKU, giá, giá gốc, tồn kho ban đầu, mức cảnh báo, cân nặng.
 *   Hàng "Áp dụng cho tất cả" để điền nhanh cùng 1 giá / kho cho mọi dòng.
 * - productCode: mã sản phẩm, dùng làm tiền tố SKU
 * - onChange({ options, variants }) — đúng dạng CreateProductRequest.options / variants
 */
function VariantBuilder({ productCode, onChange, error }) {
  const { t } = useLanguage();
  const [sizes, setSizes] = useState(['S', 'M', 'L']);
  const [sizeDraft, setSizeDraft] = useState('');
  const [colors, setColors] = useState([{ label: 'Đen', hex: '#1f2333' }]);
  const [colorDraft, setColorDraft] = useState({ label: '', hex: '#9aa6f5' });
  const [rows, setRows] = useState({}); // key "SIZE|COLOR" -> { sellerSku, priceMinor, compareAtPriceMinor, initialStock, reorderPoint, weightGrams }
  const [bulk, setBulk] = useState({ priceMinor: '', compareAtPriceMinor: '', initialStock: '', reorderPoint: '5', weightGrams: '300' });

  const combos = sizes.flatMap((size) => (colors.length ? colors.map((color) => ({ size, color })) : [{ size, color: null }]));
  const keyOf = (combo) => `${toCode(combo.size)}|${combo.color ? toCode(combo.color.label) : ''}`;
  const rowOf = (combo) => {
    const key = keyOf(combo);
    const prefix = toCode(productCode || 'SP');
    return {
      sellerSku: `${prefix}-${toCode(combo.size)}${combo.color ? `-${toCode(combo.color.label)}` : ''}`,
      priceMinor: '',
      compareAtPriceMinor: '',
      initialStock: '',
      reorderPoint: '5',
      weightGrams: '300',
      ...rows[key],
    };
  };

  // Báo ngược lên form cha mỗi khi phân loại / bảng thay đổi
  useEffect(() => {
    const options = [
      { type: 'SIZE', displayName: t('seller.productForm.size'), sortOrder: 0, values: sizes.map((s, i) => ({ code: toCode(s), label: s, hexColor: null, sortOrder: i })) },
    ];
    if (colors.length) {
      options.push({ type: 'COLOR', displayName: t('seller.productForm.color'), sortOrder: 1, values: colors.map((c, i) => ({ code: toCode(c.label), label: c.label, hexColor: c.hex, sortOrder: i })) });
    }
    const variants = combos.map((combo) => {
      const row = rowOf(combo);
      const selections = { SIZE: toCode(combo.size) };
      if (combo.color) selections.COLOR = toCode(combo.color.label);
      return {
        sellerSku: row.sellerSku,
        barcode: null,
        selections,
        priceMinor: Number(row.priceMinor) || 0,
        compareAtPriceMinor: row.compareAtPriceMinor ? Number(row.compareAtPriceMinor) : null,
        weightGrams: Number(row.weightGrams) || 300,
        initialStock: Number(row.initialStock) || 0,
        reorderPoint: Number(row.reorderPoint) || 0,
      };
    });
    onChange({ options, variants });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tính lại khi dữ liệu thay đổi
  }, [sizes, colors, rows, productCode]);

  const setCell = (combo, key, value) => setRows((current) => ({ ...current, [keyOf(combo)]: { ...rowOf(combo), [key]: value } }));

  const applyAll = () =>
    setRows((current) => {
      const next = { ...current };
      combos.forEach((combo) => {
        const row = rowOf(combo);
        next[keyOf(combo)] = Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key !== 'sellerSku' && bulk[key] !== '' ? bulk[key] : value]));
      });
      return next;
    });

  const addSize = () => {
    const value = sizeDraft.trim();
    if (value && !sizes.some((s) => toCode(s) === toCode(value))) setSizes([...sizes, value]);
    setSizeDraft('');
  };

  const addColor = () => {
    const label = colorDraft.label.trim();
    if (label && !colors.some((c) => toCode(c.label) === toCode(label))) setColors([...colors, { label, hex: colorDraft.hex }]);
    setColorDraft({ label: '', hex: colorDraft.hex });
  };

  return (
    <div className="variant-builder">
      <div className="variant-builder__option">
        <p className="field__label">{t('seller.productForm.size')}</p>
        <div className="tag-input">
          {sizes.map((size) => (
            <span key={size} className="tag-input__tag">
              {size}
              <button type="button" aria-label={t('common.delete')} onClick={() => sizes.length > 1 && setSizes(sizes.filter((s) => s !== size))}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
          <input
            value={sizeDraft}
            placeholder={t('seller.productForm.addSize')}
            aria-label={t('seller.productForm.addSize')}
            onChange={(e) => setSizeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addSize();
              }
            }}
            onBlur={addSize}
          />
        </div>
      </div>

      <div className="variant-builder__option">
        <p className="field__label">{t('seller.productForm.color')}</p>
        <div className="tag-input">
          {colors.map((color) => (
            <span key={color.label} className="tag-input__tag">
              <span className="tag-input__swatch" style={{ background: color.hex }} aria-hidden="true" />
              {color.label}
              <button type="button" aria-label={t('common.delete')} onClick={() => setColors(colors.filter((c) => c.label !== color.label))}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
          <input type="color" value={colorDraft.hex} aria-label={t('seller.productForm.colorHex')} onChange={(e) => setColorDraft({ ...colorDraft, hex: e.target.value })} />
          <input
            value={colorDraft.label}
            placeholder={t('seller.productForm.addColor')}
            aria-label={t('seller.productForm.addColor')}
            onChange={(e) => setColorDraft({ ...colorDraft, label: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addColor();
              }
            }}
          />
          <button type="button" className="text-btn" onClick={addColor}>
            {t('seller.productForm.add')}
          </button>
        </div>
        <p className="field__hint">{t('seller.productForm.colorOptional')}</p>
      </div>

      <div className="seller-table-wrap variant-builder__table">
        <table className="seller-table">
          <thead>
            <tr>
              <th>{t('seller.productForm.variant')}</th>
              <th>SKU</th>
              <th>{t('seller.productForm.price')}</th>
              <th>{t('seller.productForm.compareAt')}</th>
              <th>{t('seller.productForm.stock')}</th>
              <th>{t('seller.productForm.reorder')}</th>
              <th>{t('seller.productForm.weight')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="variant-builder__bulk">
              <td colSpan={2}>
                <button type="button" className="text-btn" onClick={applyAll}>
                  <Icon name="check" size={14} />
                  {t('seller.productForm.applyAll')}
                </button>
              </td>
              {['priceMinor', 'compareAtPriceMinor', 'initialStock', 'reorderPoint', 'weightGrams'].map((key) => (
                <td key={key}>
                  <input className="cell-input" inputMode="numeric" value={bulk[key]} aria-label={`${t('seller.productForm.applyAll')} ${key}`} onChange={(e) => setBulk({ ...bulk, [key]: num(e.target.value) })} />
                </td>
              ))}
            </tr>
            {combos.map((combo) => {
              const row = rowOf(combo);
              return (
                <tr key={keyOf(combo)}>
                  <td>
                    <strong>{combo.size}</strong>
                    {combo.color && (
                      <span className="cell-sub">
                        <span className="tag-input__swatch" style={{ background: combo.color.hex }} aria-hidden="true" /> {combo.color.label}
                      </span>
                    )}
                  </td>
                  <td>
                    <input className="cell-input cell-input--sku" value={row.sellerSku} aria-label="SKU" onChange={(e) => setCell(combo, 'sellerSku', e.target.value)} />
                  </td>
                  {['priceMinor', 'compareAtPriceMinor', 'initialStock', 'reorderPoint', 'weightGrams'].map((key) => (
                    <td key={key}>
                      <input className="cell-input" inputMode="numeric" value={row[key]} aria-label={key} onChange={(e) => setCell(combo, key, num(e.target.value))} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && (
        <p className="field__error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
    </div>
  );
}

export default VariantBuilder;
