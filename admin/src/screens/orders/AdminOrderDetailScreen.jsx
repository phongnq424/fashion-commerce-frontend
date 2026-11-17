import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Icon from '@shared/components/common/Icon';
import StatusBadge from '@shared/components/common/StatusBadge';
import { useLanguage } from '@shared/hooks/useLanguage';
import { getOrder } from '../../services/platformService';
import { formatAddressLine } from '@shared/services/addressService';
import { formatPrice } from '@shared/utils/format';
import { formatDateTime, formatOptions, statusTone } from '@shared/utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, ShopCell, useShopDirectory } from '../components/AdminParts';

/**
 * /admin/orders/:orderId — Chi tiết đơn (GET /admin/orders/{id}): người mua, thanh toán và
 * TỪNG ĐƠN CON THEO SHOP (shop nào, mã đơn con, trạng thái, hàng, phí ship, giảm giá của shop).
 */
function AdminOrderDetailScreen() {
  const { t, language } = useLanguage();
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const shops = useShopDirectory();
  const price = (v) => formatPrice(v ?? 0, language);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await getOrder(orderId));
      setStatus('success');
    } catch (error) {
      setStatus(error?.status === 403 ? 'forbidden' : 'error');
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const back = { to: '/orders', label: t('market.admin.nav.orders') };
  if (status !== 'success') return <AdminPage title={t('market.admin.orders.title')} back={back}><section className="account-card"><ListState status={status} onRetry={load} /></section></AdminPage>;

  const order = data.order;
  return (
    <AdminPage
      title={order.orderNumber}
      back={back}
      badge={<StatusBadge tone={statusTone(order.status)}>{t(`orderStatus.${order.status}`, { defaultValue: order.status })}</StatusBadge>}
    >
      <div className="admin-detail">
        <div className="admin-detail__main">
          {order.shops.length > 1 && <p className="account-muted">{t('admin.platform.shopRef.splitNote', { count: order.shops.length })}</p>}
          {order.shops.map((shop) => (
            <section key={shop.id} className="account-card">
              <div className="admin-suborder-head">
                <ShopCell shopId={shop.shopId} shops={shops} />
                <span className="admin-suborder-head__code">
                  <Icon name="receipt" size={16} />
                  {t('admin.platform.shopRef.subOrder')} <strong>{shop.shopOrderNumber}</strong>
                  <StatusBadge tone={statusTone(shop.status)}>{t(`shopOrderStatus.${shop.status}`, { defaultValue: shop.status })}</StatusBadge>
                </span>
              </div>
              <table className="admin-table">
                <tbody>
                  {shop.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}<span className="cell-sub">{formatOptions(item.options)} · SKU {item.sellerSku}</span></td>
                      <td className="num">x{item.quantity}</td>
                      <td className="num">{price(item.lineTotalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="account-muted">
                {t('checkout.shippingFee')}: {price(shop.shippingFeeMinor)} · {t('market.checkout.shopDiscount')}: −{price(shop.discountTotalMinor)} · <strong>{price(shop.totalMinor)}</strong>
              </p>
            </section>
          ))}
        </div>
        <aside className="admin-detail__side">
          <section className="account-card">
            <h2 className="account-card__title admin-section-title"><Icon name="user" size={18} />{t('market.admin.orders.buyer')}</h2>
            <p>{data.buyerEmail}</p>
            <p>
              <strong>{order.recipient?.recipientName}</strong> · {order.recipient?.recipientPhone}
              <br />
              <span className="account-muted">{formatAddressLine(order.recipient)}</span>
            </p>
            {order.buyerNote && <p className="account-muted">“{order.buyerNote}”</p>}
          </section>
          <section className="account-card">
            <h2 className="account-card__title admin-section-title"><Icon name="card" size={18} />{t('market.admin.orders.payment')}</h2>
            <dl className="checkout-review">
              <div className="checkout-review__row"><dt>{t('checkout.stepPayment')}</dt><dd>{t(`market.paymentMethods.${order.paymentMethod}`, { defaultValue: order.paymentMethod })}</dd></div>
              <div className="checkout-review__row"><dt>{t('market.admin.orders.paymentStatus')}</dt><dd>{order.payment?.status ?? '—'}</dd></div>
              <div className="checkout-review__row"><dt>{t('checkout.subtotal')}</dt><dd>{price(order.itemsSubtotalMinor)}</dd></div>
              <div className="checkout-review__row"><dt>{t('checkout.shippingFee')}</dt><dd>{price(order.shippingFeeMinor)}</dd></div>
              <div className="checkout-review__row"><dt>{t('market.checkout.discountTotal')}</dt><dd>−{price(order.discountTotalMinor)}</dd></div>
              <div className="checkout-review__row"><dt>{t('checkout.total')}</dt><dd><strong>{price(order.grandTotalMinor)}</strong></dd></div>
              <div className="checkout-review__row"><dt>{t('seller.orders.columns.placedAt')}</dt><dd>{formatDateTime(order.placedAt, language)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </AdminPage>
  );
}

export default AdminOrderDetailScreen;
