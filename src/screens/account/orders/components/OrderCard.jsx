import { Link } from 'react-router-dom';
import Button from '../../../../components/common/Button';
import Icon from '../../../../components/common/Icon';
import { useLanguage } from '../../../../hooks/useLanguage';
import { CANCELLABLE_ORDER_STATUSES } from '../../../../services/myOrderService';
import { formatDeliveryRange, getDeliveryEstimate } from '../../../../utils/delivery';
import { formatPrice } from '../../../../utils/format';
import { formatDateTime, formatOptions, statusTone } from '../../../../utils/status';

const MAX_ITEMS = 2; // mỗi thẻ hiện tối đa 2 sản phẩm, còn lại gom thành "+ n sản phẩm khác"

// Dòng tình trạng giao hàng (bên phải đầu thẻ, cạnh trạng thái đơn)
function deliveryLine(order, t, language) {
  if (order.status === 'COMPLETED') return { icon: 'truck', tone: 'success', text: t('orders.card.delivered') };
  if (['CANCELLED', 'PARTIALLY_CANCELLED'].includes(order.status))
    return { icon: 'info', tone: 'muted', text: t('orders.card.cancelled') };
  const estimate = getDeliveryEstimate(order);
  if (!estimate) return null;
  const shipping = ['SHIPPED', 'PARTIALLY_SHIPPED'].includes(order.status);
  return {
    icon: 'truck',
    tone: shipping ? 'success' : 'info',
    text: t(shipping ? 'orders.card.shippingEta' : 'orders.card.eta', { date: formatDeliveryRange(estimate, language) }),
  };
}

/**
 * Thẻ 1 đơn hàng trong "Đơn hàng của tôi" (bố cục kiểu các sàn TMĐT):
 *   [🏪 Shop · #mã đơn]                         [🚚 tình trạng giao | TRẠNG THÁI]
 *   [ảnh] Tên sản phẩm / Phân loại hàng / xSL                               giá
 *   ─────────────────────────────────────────────────────────────── nền nhạt ──
 *                                                         Thành tiền:  459.000đ
 *   Ngày đặt · phương thức thanh toán                    [nút phụ] [nút chính]
 * Nút đổi theo trạng thái: chờ xác nhận -> Hủy đơn | đang giao -> Theo dõi đơn |
 *   hoàn thành -> Đánh giá, Mua lại | đã hủy -> Mua lại.
 * - order: OrderSummaryResponse (+ shops nếu có)   - onCancel(order)
 */
function OrderCard({ order, onCancel }) {
  const { t, language } = useLanguage();
  const items = (order.shops ?? []).flatMap((shop) => shop.items ?? []);
  const shown = items.slice(0, MAX_ITEMS);
  const hiddenCount = items.length - shown.length;
  const detailUrl = `/account/orders/${order.id}`;
  const firstProduct = items.find((item) => !item.isGift)?.productId;
  const delivery = deliveryLine(order, t, language);
  const tone = statusTone(order.status);

  // Phương thức + tình trạng thanh toán (không lặp chữ khi 2 chữ giống nhau)
  const method = t(`paymentMethod.${order.paymentMethod}`);
  const payStatus = order.paymentStatus ? t(`paymentStatus.${order.paymentStatus}`) : '';
  const payment = payStatus && payStatus !== method ? `${method} · ${payStatus}` : method;

  const cancellable = CANCELLABLE_ORDER_STATUSES.includes(order.status);
  const shipping = ['PROCESSING', 'SHIPPED', 'PARTIALLY_SHIPPED'].includes(order.status);
  const completed = order.status === 'COMPLETED';
  const cancelled = ['CANCELLED', 'PARTIALLY_CANCELLED'].includes(order.status);

  return (
    <article className="order-card">
      <header className="order-card__head">
        <p className="order-card__shop">
          <Icon name="store" size={18} />
          <span className="order-card__shop-name">{t('orders.card.shopName')}</span>
          <span className="order-card__code">#{order.orderNumber}</span>
        </p>
        <div className="order-card__state">
          {delivery && (
            <span className={`order-card__delivery order-card__delivery--${delivery.tone}`}>
              <Icon name={delivery.icon} size={18} />
              {delivery.text}
            </span>
          )}
          <span className={`order-card__status order-card__status--${tone}`}>{t(`orderStatus.${order.status}`)}</span>
        </div>
      </header>

      {shown.length > 0 ? (
        <Link to={detailUrl} className="order-card__items" aria-label={t('orders.viewDetail')}>
          {shown.map((item) => (
            <div key={item.id} className="order-card__item">
              <span className="order-card__thumb">
                {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" /> : <Icon name="hanger" size={28} />}
              </span>
              <span className="order-card__info">
                <span className="order-card__name">{item.productName}</span>
                {item.isGift && (
                  <span className="order-card__gift">
                    <Icon name="gift" size={13} />
                    {t('checkout.giftTitle')}
                  </span>
                )}
                {formatOptions(item.options) && (
                  <span className="order-card__variant">
                    {t('orders.card.variant')}: {formatOptions(item.options)}
                  </span>
                )}
                <span className="order-card__qty">x{item.quantity}</span>
              </span>
              <span className="order-card__price">
                {item.discountMinor > 0 && <s>{formatPrice(item.unitPriceMinor, language)}</s>}
                {formatPrice(item.quantity ? item.lineTotalMinor / item.quantity : item.unitPriceMinor, language)}
              </span>
            </div>
          ))}
          {hiddenCount > 0 && <span className="order-card__more">{t('orders.card.moreItems', { count: hiddenCount })}</span>}
        </Link>
      ) : (
        // Không có danh sách sản phẩm (backend GET /orders) -> hiện số liệu tóm tắt
        <p className="order-card__summary">{t('orders.itemCount', { count: order.itemCount, shops: order.shopCount })}</p>
      )}

      <footer className="order-card__foot">
        <p className="order-card__total">
          {t('orders.card.total')}:<strong>{formatPrice(order.grandTotalMinor, language)}</strong>
        </p>
        <div className="order-card__bottom">
          <p className="order-card__note">
            {t('orders.card.placedOn', { date: formatDateTime(order.placedAt, language) })}
            <span>{payment}</span>
          </p>
          <div className="order-card__actions">
            {cancellable && (
              <>
                <Button variant="outline" className="order-card__btn" onClick={() => onCancel?.(order)}>
                  {t('orders.card.cancel')}
                </Button>
                <Button as={Link} to={detailUrl} className="order-card__btn">
                  {t('orders.viewDetail')}
                </Button>
              </>
            )}
            {shipping && (
              <Button as={Link} to={detailUrl} className="order-card__btn">
                {t('orders.card.track')}
              </Button>
            )}
            {completed && (
              <>
                <Button as={Link} to={detailUrl} variant="outline" className="order-card__btn">
                  {t('orders.viewDetail')}
                </Button>
                {firstProduct && (
                  <Button as={Link} to={`/product/${firstProduct}`} variant="outline" className="order-card__btn">
                    {t('orders.card.buyAgain')}
                  </Button>
                )}
                <Button as={Link} to={detailUrl} className="order-card__btn">
                  {t('orders.card.review')}
                </Button>
              </>
            )}
            {cancelled && (
              <>
                <Button as={Link} to={detailUrl} variant="outline" className="order-card__btn">
                  {t('orders.viewDetail')}
                </Button>
                {firstProduct && (
                  <Button as={Link} to={`/product/${firstProduct}`} className="order-card__btn">
                    {t('orders.card.buyAgain')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}

export default OrderCard;
