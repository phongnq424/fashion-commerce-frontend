import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { getCodCollections } from '../../../services/seller/codService';
import { createDemoShop, onboardingProgress } from '../../../services/seller/onboardingService';
import { getShopOrders } from '../../../services/seller/sellerOrderService';
import { getShopProducts } from '../../../services/seller/sellerProductService';
import { getShopReturns } from '../../../services/seller/sellerReturnService';
import { getMyInvitations } from '../../../services/seller/staffService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import { ShopAvatar } from '../components/SellerLayout';
import SellerPage from '../components/SellerPage';

const STEPS = ['shop', 'pickup', 'shipping', 'tax', 'identity', 'policies'];

// Chưa có shop: trang giới thiệu + mời đăng ký (hoặc tiếp tục hồ sơ đang làm dở)
function Welcome({ onNotify }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { onboarding, refreshShops, refreshOnboarding } = useSeller();
  const [invites, setInvites] = useState(0);
  const [creating, setCreating] = useState(false);
  const progress = onboardingProgress(onboarding);
  const done = STEPS.filter((step) => progress[step]).length;

  useEffect(() => {
    getMyInvitations().then((items) => setInvites(items.length)).catch(() => {});
  }, []);

  const demo = async () => {
    setCreating(true);
    try {
      await createDemoShop();
      await Promise.all([refreshShops(), refreshOnboarding()]);
      onNotify?.('success', t('seller.welcome.demoCreated'));
      navigate('/seller');
    } catch (error) {
      console.error(error);
      onNotify?.('error', t('account.actionError'));
    } finally {
      setCreating(false);
    }
  };

  if (onboarding?.status === 'PENDING_REVIEW') {
    return (
      <div className="account-card seller-welcome seller-welcome--compact">
        <StatusBadge tone="warning">{t('seller.onboardingStatus.PENDING_REVIEW')}</StatusBadge>
        <h1 className="seller-welcome__title">{t('seller.welcome.pendingTitle')}</h1>
        <p className="account-muted">{t('seller.welcome.pendingText')}</p>
        <Button as={Link} to="/seller/register/status">{t('seller.noShop.viewStatus')}</Button>
      </div>
    );
  }

  return (
    <div className="seller-welcome-wrap">
      <section className="account-card seller-welcome">
        <span className="seller-welcome__icon" aria-hidden="true">
          <Icon name="store" size={30} />
        </span>
        <h1 className="seller-welcome__title">
          {onboarding ? t('seller.welcome.continueTitle') : t('seller.welcome.title')}
        </h1>
        <p className="seller-welcome__text">
          {onboarding ? t('seller.welcome.continueText', { done, total: STEPS.length }) : t('seller.welcome.text')}
        </p>
        {onboarding?.status === 'REJECTED' && (
          <p className="seller-note seller-note--danger">
            <Icon name="alert" size={18} />
            <span>
              {t('seller.status.rejectedNote')}: <strong>{onboarding.reviewNote}</strong>
            </span>
          </p>
        )}
        <div className="seller-welcome__actions">
          <Button as={Link} to="/seller/register">
            {onboarding ? t('seller.welcome.continue') : t('seller.welcome.start')}
            <Icon name="arrowRight" size={18} />
          </Button>
          <Button variant="outline" onClick={demo} disabled={creating}>
            {creating ? t('common.loading') : t('seller.welcome.demo')}
          </Button>
        </div>
        <p className="seller-welcome__demo-note">{t('seller.welcome.demoNote')}</p>
      </section>

      <section className="account-card">
        <h2 className="account-card__title">
          <Icon name="doc" size={18} />
          {t('seller.welcome.stepsTitle')}
        </h2>
        <ol className="seller-steps-list">
          {STEPS.map((step, index) => (
            <li key={step} className={progress[step] ? 'is-done' : ''}>
              <span className="seller-steps-list__num">{progress[step] ? <Icon name="check" size={14} /> : index + 1}</span>
              <span>
                <strong>{t(`seller.onboarding.steps.${step}`)}</strong>
                <span className="cell-sub">{t(`seller.onboarding.stepHints.${step}`)}</span>
              </span>
            </li>
          ))}
        </ol>
        {invites > 0 && (
          <Link to="/seller/invitations" className="seller-note seller-welcome__invite">
            <Icon name="mail" size={18} />
            <span>{t('seller.welcome.invites', { count: invites })}</span>
          </Link>
        )}
      </section>
    </div>
  );
}

// Đã có shop: tổng quan việc cần làm + đơn mới + hàng sắp hết
function Dashboard() {
  const { t, language } = useLanguage();
  const { shop, shopId } = useSeller();
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    setData(null);
    Promise.all([getShopOrders(shopId), getShopReturns(shopId), getCodCollections(shopId), getShopProducts(shopId)])
      .then(([orders, returns, cod, products]) => {
        if (!active) return;
        const count = (status) => orders.items.filter((o) => status.includes(o.status)).length;
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        setData({
          todo: [
            { id: 'toConfirm', value: count(['PENDING_CONFIRMATION']), to: '/seller/orders?status=PENDING_CONFIRMATION' },
            { id: 'toShip', value: count(['PROCESSING', 'READY_TO_SHIP']), to: '/seller/orders?status=PROCESSING' },
            { id: 'shipping', value: count(['SHIPPED']), to: '/seller/orders?status=SHIPPED' },
            { id: 'returns', value: returns.items.filter((r) => r.status === 'REQUESTED').length, to: '/seller/returns' },
            { id: 'codToCollect', value: cod.items.filter((c) => ['AWAITING_COLLECTION', 'COLLECTION_FAILED'].includes(c.status) && c.shopOrderStatus === 'COMPLETED').length, to: '/seller/cod' },
            { id: 'codToReconcile', value: cod.items.filter((c) => c.status === 'COLLECTED').length, to: '/seller/cod?status=COLLECTED' },
            { id: 'outOfStock', value: products.items.filter((p) => p.status === 'ACTIVE' && p.quantityOnHand - p.quantityReserved <= 0).length, to: '/seller/inventory?filter=out' },
            { id: 'drafts', value: products.items.filter((p) => p.status === 'DRAFT').length, to: '/seller/products?status=DRAFT' },
          ],
          revenue: orders.items.filter((o) => o.status === 'COMPLETED' && new Date(o.placedAt) >= monthStart).reduce((sum, o) => sum + o.totalMinor, 0),
          completed: count(['COMPLETED']),
          activeProducts: products.items.filter((p) => p.status === 'ACTIVE').length,
          recent: orders.items.slice(0, 5),
        });
      })
      .catch((error) => console.error(error));
    return () => {
      active = false;
    };
  }, [shopId]);

  return (
    <SellerPage title={t('seller.dashboard.title')} subtitle={t('seller.dashboard.subtitle')}>
      <section className="account-card seller-shop-hero">
        <ShopAvatar shop={shop} size={56} />
        <div>
          <p className="seller-shop-hero__name">{shop.name}</p>
          <p className="account-muted">
            trendylab.vn/shop/{shop.slug} · <StatusBadge tone={statusTone(shop.status)}>{t(`seller.shopStatus.${shop.status}`)}</StatusBadge>
          </p>
        </div>
        <div className="seller-shop-hero__stats">
          <span>
            <strong>{data ? formatPrice(data.revenue, language) : '—'}</strong>
            {t('seller.dashboard.revenue')}
          </span>
          <span>
            <strong>{data?.completed ?? '—'}</strong>
            {t('seller.dashboard.completed')}
          </span>
          <span>
            <strong>{data?.activeProducts ?? '—'}</strong>
            {t('seller.dashboard.activeProducts')}
          </span>
        </div>
      </section>

      <section className="account-card">
        <h2 className="account-card__title seller-section-title">
          <Icon name="clock" size={18} />
          {t('seller.dashboard.todo')}
        </h2>
        {!data ? (
          <div className="account-skeleton" />
        ) : (
          <ul className="seller-stats">
            {data.todo.map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="seller-stat">
                  <span className="seller-stat__value">{item.value}</span>
                  <span className="seller-stat__label">{t(`seller.dashboard.todoItems.${item.id}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="account-card seller-card">
        <div className="seller-toolbar">
          <h2 className="account-card__title">
            <Icon name="receipt" size={18} />
            {t('seller.dashboard.recentOrders')}
          </h2>
          <Link to="/seller/orders" className="account-link seller-toolbar__count">
            {t('common.viewAll')} <Icon name="chevronRight" size={14} />
          </Link>
        </div>
        <div className="seller-table-wrap">
          <table className="seller-table">
            <thead>
              <tr>
                <th>{t('seller.orders.columns.code')}</th>
                <th>{t('seller.orders.columns.buyer')}</th>
                <th className="num">{t('seller.orders.columns.total')}</th>
                <th>{t('seller.orders.columns.status')}</th>
                <th>{t('seller.orders.columns.placedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent ?? []).map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/seller/orders/${order.id}`} className="account-link">
                      {order.shopOrderNumber}
                    </Link>
                  </td>
                  <td>{order.recipientName}</td>
                  <td className="num">{formatPrice(order.totalMinor, language)}</td>
                  <td>
                    <StatusBadge tone={statusTone(order.status)}>{t(`shopOrderStatus.${order.status}`)}</StatusBadge>
                  </td>
                  <td>{formatDateTime(order.placedAt, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SellerPage>
  );
}

/**
 * /seller — Trang đầu Seller Center.
 *   Chưa có shop -> giới thiệu + đăng ký (hoặc tiếp tục hồ sơ / xem trạng thái chờ duyệt)
 *   Có shop      -> tổng quan: doanh thu tháng, việc cần làm, đơn mới
 */
function SellerDashboardScreen({ onNotify }) {
  const { shopId } = useSeller();
  return shopId ? <Dashboard /> : <Welcome onNotify={onNotify} />;
}

export default SellerDashboardScreen;
