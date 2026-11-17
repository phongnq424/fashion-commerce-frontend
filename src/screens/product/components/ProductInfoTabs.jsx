import { useLanguage } from '../../../hooks/useLanguage';
import { COLOR_NOTE, POLICIES } from '../../../data/storePolicies';

/**
 * 4 mục xổ xuống dưới nút mua: Mô tả sản phẩm | Chính sách đổi trả | giao hàng | thanh toán.
 * Dùng thẻ <details> gốc của HTML: bấm tiêu đề để mở / đóng, bàn phím dùng được sẵn.
 * Mô tả / chất liệu / bảo quản: dữ liệu của sản phẩm (Backend). Chính sách chung của sàn: data/storePolicies.js
 * Tiêu đề: vi.js / en.js (productDetail.tabs)
 */
function ProductInfoTabs({ product }) {
  const { t } = useLanguage();
  const care = product.care ?? []; // careInstructions của shop; không có thì không hiện mục này
  // Backend trả description là 1 chuỗi, đoạn cách nhau bằng dòng trống -> tách thành nhiều <p>
  const paragraphs = []
    .concat(product.description ?? [])
    .flatMap((text) => String(text).split(/\n{2,}/))
    .map((text) => text.trim())
    .filter(Boolean);

  return (
    <div className="info-tabs">
      {/* Mục đầu mở sẵn */}
      <details className="info-tabs__item" open>
        <summary className="info-tabs__summary">{t('productDetail.tabs.description')}</summary>
                <div className="info-tabs__body">
          {/* 1. MÔ TẢ: description là chuỗi hoặc mảng, mỗi phần tử 1 đoạn <p> */}
          {paragraphs.map((paragraph) => (
              <p key={paragraph} className="info-tabs__description">
                {paragraph}
              </p>
            ))}

          {/* 2. CHI TIẾT SẢN PHẨM: details = mảng, mỗi phần tử 1 gạch đầu dòng */}
          {product.details?.length > 0 && (
            <>
              <h3 className="info-tabs__heading">{t('productDetail.detailsTitle')}</h3>
              <ul className="info-tabs__list">
                {product.details.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {/* 3. CHẤT LIỆU (nếu có trường material) */}
          {product.material && (
            <p>
              <strong>{t('productDetail.material')}:</strong> {product.material}
            </p>
          )}

          {product.fitType && (
            <p>
              <strong>{t('market.product.fitType')}:</strong> {product.fitType}
            </p>
          )}

          {care.length > 0 && (
            <>
              <h3 className="info-tabs__heading">{t('productDetail.careTitle')}</h3>
              <ul className="info-tabs__list">
                {care.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
          <p>
            <strong>{t('productDetail.noteLabel')}:</strong> {COLOR_NOTE}
          </p>
        </div>
      </details>

      <details className="info-tabs__item">
        <summary className="info-tabs__summary">{t('productDetail.tabs.returns')}</summary>
        <div className="info-tabs__body">
          <ul className="info-tabs__list">
            {POLICIES.returns.items.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3 className="info-tabs__heading">{t('productDetail.noteLabel')}</h3>
          <ul className="info-tabs__list">
            {POLICIES.returns.notes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p>{POLICIES.returns.footer}</p>
        </div>
      </details>

      <details className="info-tabs__item">
        <summary className="info-tabs__summary">{t('productDetail.tabs.shipping')}</summary>
        <div className="info-tabs__body">
          <p>{POLICIES.shipping}</p>
        </div>
      </details>

      <details className="info-tabs__item">
        <summary className="info-tabs__summary">{t('productDetail.tabs.payment')}</summary>
        <div className="info-tabs__body">
          <p>{t('productDetail.paymentIntro')}</p>
          <ul className="info-tabs__list">
            {POLICIES.payment.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

export default ProductInfoTabs;
