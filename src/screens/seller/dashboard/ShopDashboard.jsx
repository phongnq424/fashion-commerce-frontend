import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { getAllCodCollections } from '../../../services/seller/codService';
import { getTopProducts } from '../../../services/seller/financeService';
import { getAllShopOrders } from '../../../services/seller/sellerOrderService';
import { getAllShopProducts, getShopProduct } from '../../../services/seller/sellerProductService';
import { getAllShopReturns } from '../../../services/seller/sellerReturnService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import { ShopAvatar } from '../components/SellerLayout';
import RevenueChart from '../../../components/dashboard/RevenueChart';
import { buildStats, KpiCard, PeriodFilter, StatusBars, TodoList, toInput, usePeriod } from '../../../components/dashboard/dashboardKit';

// =====================================================================
// DASHBOARD CỦA 1 SHOP trong Kênh người bán (/seller) — theo thiết kế trang quản trị ban đầu:
//   [Chọn kỳ: 7 / 30 / 90 ngày / Tùy chọn]
//   [4 chỉ số: Doanh thu • Đơn hàng • Giá trị đơn TB • Tỉ lệ hủy — kèm % so với kỳ trước]
//   [Biểu đồ doanh thu (2/3)            | Việc cần làm (1/3)]
//   [Đơn theo trạng thái                | Sản phẩm bán chạy]
//   [Đơn hàng mới (2/3)                 | Tổng hợp tồn kho (1/3)]
// Số liệu theo SHOP ĐANG CHỌN (đổi shop ở góc trên). Nguồn:
//   GET /shops/{id}/orders, /products, /returns, /cod-payments, /reports/top-products
// API nào vai trò hiện tại không có quyền (vd nhân viên đơn hàng không xem sản phẩm / báo cáo) -> ẩn khối đó.
// =====================================================================

const ORDER_STATUSES = ['PENDING_CONFIRMATION', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

const stockLevel = (v) => (v.availableQuantity <= 0 ? 'out' : v.availableQuantity <= v.reorderPoint ? 'low' : 'ok');
const optional = (promise) => promise.catch(() => null); // 403 (không có quyền) -> null

const STOCK_LEVELS = [
  { id: 'ok', to: '/seller/inventory' },
  { id: 'low', to: '/seller/inventory?filter=low' },
  { id: 'out', to: '/seller/inventory?filter=out' },
];

function StockSummary({ stock, num }) {
  const { t } = useLanguage();
  const total = Math.max(1, stock.skus);
  const pct = (value) => `${Math.round((value / total) * 100)}%`;
  return (
    <section className="account-card dashboard-card">
      <div className="dashboard-card__head">
        <div>
          <h2 className="account-card__title">{t('admin.dashboard.stock.title')}</h2>
          <p className="cell-sub">{t('admin.dashboard.stock.scope', { skus: num(stock.skus), products: num(stock.products) })}</p>
        </div>
        <Link to="/seller/inventory" className="account-link">
          {t('admin.dashboard.viewAll')}
        </Link>
      </div>
      <dl className="stock-totals">
        <div className="stock-totals__main">
          <dt>{t('admin.dashboard.stock.available')}</dt>
          <dd>{num(stock.available)}</dd>
        </div>
        <div>
          <dt>{t('admin.inventory.onHand')}</dt>
          <dd>{num(stock.onHand)}</dd>
        </div>
        <div>
          <dt>{t('admin.inventory.reserved')}</dt>
          <dd>{num(stock.reserved)}</dd>
        </div>
      </dl>
      <div className="stock-bar" aria-hidden="true">
        {STOCK_LEVELS.map(({ id }) => (stock.levels[id] > 0 ? <span key={id} className={`stock-bar__seg stock-bar__seg--${id}`} style={{ width: pct(stock.levels[id]) }} /> : null))}
      </div>
      <ul className="stock-levels">
        {STOCK_LEVELS.map(({ id, to }) => (
          <li key={id}>
            <Link to={to} className="stock-levels__item">
              <span className={`stock-levels__dot stock-levels__dot--${id}`} aria-hidden="true" />
              <span className="stock-levels__label">{t(`admin.inventory.levels.${id}`)}</span>
              <span className="stock-levels__value">{t('admin.inventory.count', { count: num(stock.levels[id]) })}</span>
              <span className="stock-levels__pct">{pct(stock.levels[id])}</span>
              <Icon name="chevronRight" size={16} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Khi 1 người có nhiều shop: thẻ từng shop, bấm để chuyển sang dashboard của shop đó
function MyShops() {
  const { t } = useLanguage();
  const { shops, shopId, selectShop } = useSeller();
  if (shops.length < 2) return null;
  return (
    <section className="account-card dashboard-card">
      <div className="dashboard-card__head">
        <h2 className="account-card__title">{t('seller.dashboard.myShops', { count: shops.length })}</h2>
        <Link to="/seller/shops" className="account-link">
          {t('admin.dashboard.viewAll')}
        </Link>
      </div>
      <ul className="shop-switch">
        {shops.map((item) => (
          <li key={item.id}>
            <button type="button" className={`shop-switch__item ${item.id === shopId ? 'shop-switch__item--active' : ''}`} aria-pressed={item.id === shopId} onClick={() => selectShop(item.id)}>
              <ShopAvatar shop={item} size={36} />
              <span className="shop-switch__text">
                <strong>{item.name}</strong>
                <span className="cell-sub">{item.myRoles?.length ? item.myRoles.map((role) => t(`seller.roles.${role}`)).join(', ') : `/shop/${item.slug}`}</span>
              </span>
              <StatusBadge tone={statusTone(item.status)}>{t(`seller.shopStatus.${item.status}`, { defaultValue: item.status })}</StatusBadge>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ShopDashboard() {
  const { t, language } = useLanguage();
  const { shop, shopId } = useSeller();
  const periodState = usePeriod(30);
  const { range } = periodState;
  const [data, setData] = useState(null);
  const [top, setTop] = useState(null);

  // Dữ liệu của shop đang chọn (tải lại khi đổi shop)
  useEffect(() => {
    let active = true;
    setData(null);
    (async () => {
      const [orders, products, returns, cod] = await Promise.all([
        getAllShopOrders(shopId),
        optional(getAllShopProducts(shopId)),
        optional(getAllShopReturns(shopId)),
        optional(getAllCodCollections(shopId)),
      ]);
      let stock = null;
      if (products) {
        const listed = products.items.filter((p) => p.status !== 'REMOVED');
        const details = await Promise.all(listed.map((p) => optional(getShopProduct(shopId, p.id))));
        const variants = details.filter(Boolean).flatMap((product) => product.variants);
        const levels = { ok: 0, low: 0, out: 0 };
        variants.forEach((v) => {
          levels[stockLevel(v)] += 1;
        });
        stock = {
          products: listed.length,
          skus: variants.length,
          onHand: variants.reduce((sum, v) => sum + v.quantityOnHand, 0),
          reserved: variants.reduce((sum, v) => sum + v.quantityReserved, 0),
          available: variants.reduce((sum, v) => sum + Math.max(0, v.availableQuantity), 0),
          levels,
        };
      }
      if (active) setData({ orders: orders.items, products: products?.items ?? null, returns: returns?.items ?? [], cod: cod?.items ?? [], stock });
    })().catch((error) => {
      console.error(error);
      if (active) setData({ orders: [], products: null, returns: [], cod: [], stock: null, failed: true });
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  // Sản phẩm bán chạy theo kỳ: GET /reports/top-products (cần quyền xem báo cáo)
  useEffect(() => {
    let active = true;
    setTop(null);
    getTopProducts(shopId, { from: toInput(range.from), to: toInput(range.to) }, 5)
      .then((rows) => active && setTop(rows))
      .catch(() => active && setTop('forbidden'));
    return () => {
      active = false;
    };
  }, [shopId, range]);

  const stats = useMemo(() => (data ? buildStats(data.orders, range, { amount: (o) => o.totalMinor, statuses: ORDER_STATUSES }) : null), [data, range]);
  if (!data || !stats) return <div className="account-skeleton" />;

  const { change } = stats;
  const compareLabel = t('admin.dashboard.vsPrevious', { days: stats.days });
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const num = (value) => value.toLocaleString(locale);
  const count = (statuses) => data.orders.filter((o) => statuses.includes(o.status)).length;
  const todos = [
    { id: 'toConfirm', icon: 'clock', value: count(['PENDING_CONFIRMATION']), to: '/seller/orders?status=PENDING_CONFIRMATION' },
    { id: 'toShip', icon: 'package', value: count(['PROCESSING', 'READY_TO_SHIP']), to: '/seller/orders?status=PROCESSING' },
    { id: 'shipping', icon: 'truck', value: count(['SHIPPED']), to: '/seller/orders?status=SHIPPED' },
    { id: 'returns', icon: 'refresh', value: data.returns.filter((r) => r.status === 'REQUESTED').length, to: '/seller/returns' },
    { id: 'codToReconcile', icon: 'card', value: data.cod.filter((c) => c.status === 'COLLECTED').length, to: '/seller/cod?status=COLLECTED' },
    ...(data.stock ? [{ id: 'outOfStock', icon: 'alert', value: data.stock.levels.out, to: '/seller/inventory?filter=out' }] : []),
  ];
  const images = new Map((data.products ?? []).map((p) => [p.id, p.primaryImageUrl]));
  const topRows = Array.isArray(top) ? top.map((row) => ({ id: row.productId, name: row.productName, quantity: row.quantitySold, revenue: row.netItemRevenueMinor, imageUrl: images.get(row.productId) })) : [];
  const maxQuantity = Math.max(1, ...topRows.map((row) => row.quantity));
  const recent = [...data.orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 6);

  return (
    <div className="dashboard">
      {/* Shop đang xem (đổi shop ở góc trên bên phải hoặc ở khối "Các shop của bạn") */}
      <section className="account-card dashboard-shop">
        <ShopAvatar shop={shop} size={52} />
        <div className="dashboard-shop__text">
          <h2 className="dashboard-shop__name">{shop.name}</h2>
          <p className="cell-sub">
            trendylab.vn/shop/{shop.slug} · <StatusBadge tone={statusTone(shop.status)}>{t(`seller.shopStatus.${shop.status}`, { defaultValue: shop.status })}</StatusBadge>
          </p>
        </div>
        <Link to="/seller/profile" className="account-link">
          {t('seller.dashboard.editShop')}
        </Link>
      </section>

      <PeriodFilter state={periodState} days={stats.days} />

      <div className="kpi-grid">
        <KpiCard icon="receipt" label={t('admin.dashboard.kpi.revenue')} value={formatPrice(stats.current.revenue, language)} change={change('revenue')} compareLabel={compareLabel} />
        <KpiCard icon="bag" label={t('admin.dashboard.kpi.orders')} value={num(stats.current.orders)} change={change('orders')} compareLabel={compareLabel} />
        <KpiCard icon="tag" label={t('admin.dashboard.kpi.average')} value={formatPrice(stats.current.average, language)} change={change('average')} compareLabel={compareLabel} />
        <KpiCard icon="close" label={t('admin.dashboard.kpi.cancelRate')} value={`${(stats.current.cancelRate * 100).toFixed(1)}%`} change={change('cancelRate')} inverse compareLabel={compareLabel} />
      </div>

      <div className="dashboard__row dashboard__row--chart">
        <section className="account-card dashboard-card">
          <div className="dashboard-card__head">
            <div>
              <h2 className="account-card__title">{t('admin.dashboard.revenueTitle')}</h2>
              <p className="cell-sub">{t(`admin.dashboard.by.${stats.unit}`)}</p>
            </div>
            <p className="dashboard-card__total">{formatPrice(stats.current.revenue, language)}</p>
          </div>
          <RevenueChart buckets={stats.buckets} unit={stats.unit} />
        </section>

        <section className="account-card dashboard-card">
          <h2 className="account-card__title">{t('admin.dashboard.todo')}</h2>
          <TodoList items={todos.map((item) => ({ ...item, label: t(`admin.dashboard.todoItems.${item.id}`) }))} LinkComponent={Link} />
        </section>
      </div>

      <div className="dashboard__row">
        <section className="account-card dashboard-card">
          <div className="dashboard-card__head">
            <h2 className="account-card__title">{t('admin.dashboard.statusTitle')}</h2>
            <span className="cell-sub">{t('admin.dashboard.totalOrders', { count: stats.totalOrders })}</span>
          </div>
          <StatusBars rows={stats.byStatus} labelOf={(status) => t(`shopOrderStatus.${status}`)} />
        </section>

        <section className="account-card dashboard-card">
          <div className="dashboard-card__head">
            <h2 className="account-card__title">{t('admin.dashboard.topTitle')}</h2>
            <Link to="/seller/reports" className="account-link">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          {top === null ? (
            <div className="account-skeleton" />
          ) : top === 'forbidden' ? (
            <p className="account-muted">{t('market.seller.noPermission')}</p>
          ) : topRows.length === 0 ? (
            <p className="account-muted">{t('admin.dashboard.noSales')}</p>
          ) : (
            <ol className="top-list">
              {topRows.map((row, index) => (
                <li key={row.id} className="top-list__item">
                  <span className="top-list__rank">{index + 1}</span>
                  <span className="top-list__thumb">{row.imageUrl ? <img src={row.imageUrl} alt="" /> : null}</span>
                  <span className="top-list__text">
                    <Link to={`/seller/products/${row.id}`} className="top-list__name">
                      {row.name}
                    </Link>
                    <span className="hbar__track hbar__track--thin">
                      <span className="hbar__fill" style={{ width: `${(row.quantity / maxQuantity) * 100}%` }} />
                    </span>
                  </span>
                  <span className="top-list__nums">
                    <strong>{t('admin.dashboard.sold', { count: row.quantity })}</strong>
                    <span className="cell-sub">{formatPrice(row.revenue, language)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className={`dashboard__row ${data.stock ? 'dashboard__row--wide' : ''}`}>
        <section className="account-card seller-card">
          <div className="seller-toolbar">
            <h2 className="account-card__title">{t('admin.dashboard.recentOrders')}</h2>
            <Link to="/seller/orders" className="account-link seller-toolbar__end">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>{t('seller.orders.columns.code')}</th>
                  <th className="num">{t('market.seller.itemCount')}</th>
                  <th className="num">{t('seller.orders.columns.total')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('seller.orders.columns.placedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/seller/orders/${order.id}`} className="account-link">
                        {order.shopOrderNumber}
                      </Link>
                    </td>
                    <td className="num">{order.itemCount}</td>
                    <td className="num">{formatPrice(order.totalMinor, language)}</td>
                    <td>
                      <StatusBadge tone={statusTone(order.status)}>{t(`shopOrderStatus.${order.status}`)}</StatusBadge>
                    </td>
                    <td>{formatDateTime(order.placedAt, language)}</td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={5} className="seller-table__empty">
                      {t('seller.dashboard.noOrders')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {data.stock && <StockSummary stock={data.stock} num={num} />}
      </div>

      <MyShops />
    </div>
  );
}
