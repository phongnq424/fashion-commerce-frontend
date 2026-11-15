import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import StatusBadge from '../../../components/common/StatusBadge';
import { useAdmin } from '../../../hooks/useAdmin';
import { useLanguage } from '../../../hooks/useLanguage';
import { getCodCollections } from '../../../services/admin/codService';
import { getShopOrders } from '../../../services/admin/orderAdminService';
import { getShopProduct, getShopProducts } from '../../../services/admin/productAdminService';
import { getShopReturns } from '../../../services/admin/returnAdminService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import AdminPage from '../components/AdminPage';
import RequireShop from '../components/RequireShop';
import RevenueChart from './RevenueChart';

// =====================================================================
// DASHBOARD QUẢN TRỊ (/admin)
// Backend CHƯA có API thống kê riêng, nên số liệu được tính ở frontend từ các API đã có:
//   GET /shops/{shopId}/orders, /products, /returns, /cod-payments
// Khi backend có API báo cáo, chỉ cần thay hàm buildStats bằng dữ liệu API trả về.
// =====================================================================

const PERIODS = [7, 30, 90];
const ORDER_STATUSES = ['PENDING_CONFIRMATION', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

const startOfDay = (time) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};
// Cộng/trừ ngày theo lịch (an toàn với giờ mùa hè, không cộng mili-giây thô)
const addDays = (time, n) => {
  const date = new Date(time);
  date.setDate(date.getDate() + n);
  return date.getTime();
};
const daysBetween = (from, to) => Math.round((to - from) / 86400000) + 1;
// 'YYYY-MM-DD' (giá trị của <input type="date">) <-> mốc thời gian theo giờ địa phương
const toInput = (time) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fromInput = (value) => {
  const [y, m, d] = (value ?? '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d).getTime() : null;
};
// Mức tồn kho — giống hệt trang Tồn kho để số liệu 2 nơi khớp nhau
const stockLevel = (v) => (v.availableQuantity <= 0 ? 'out' : v.availableQuantity <= v.reorderPoint ? 'low' : 'ok');

// Tính toàn bộ số liệu cho khoảng [from, to] (đầu ngày) + so sánh với kỳ liền trước cùng độ dài
function buildStats(orders, { from, to }) {
  const days = daysBetween(from, to);
  const end = addDays(to, 1);
  const prevFrom = addDays(from, -days);
  const placed = (order) => new Date(order.placedAt).getTime();
  const current = orders.filter((o) => placed(o) >= from && placed(o) < end);
  const previous = orders.filter((o) => placed(o) >= prevFrom && placed(o) < from);

  const summarize = (list) => {
    const valid = list.filter((o) => o.status !== 'CANCELLED');
    const revenue = valid.reduce((sum, o) => sum + o.totalMinor, 0);
    return {
      revenue,
      orders: valid.length,
      average: valid.length ? Math.round(revenue / valid.length) : 0,
      cancelRate: list.length ? (list.length - valid.length) / list.length : 0,
    };
  };

  // Biểu đồ: ≤ 31 ngày -> theo ngày; ≤ 180 ngày -> theo tuần; dài hơn -> theo tháng
  const unit = days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';
  const buckets = [];
  for (let start = from; start < end; ) {
    let next;
    if (unit === 'month') {
      const d = new Date(start);
      next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    } else {
      next = addDays(start, unit === 'week' ? 7 : 1);
    }
    buckets.push({ start, end: Math.min(next, end), revenue: 0, orders: 0 });
    start = next;
  }
  current
    .filter((o) => o.status !== 'CANCELLED')
    .forEach((o) => {
      const bucket = buckets.find((b) => placed(o) >= b.start && placed(o) < b.end);
      if (bucket) {
        bucket.revenue += o.totalMinor;
        bucket.orders += 1;
      }
    });

  // Sản phẩm bán chạy theo số lượng (không tính đơn hủy)
  const products = new Map();
  current
    .filter((o) => o.status !== 'CANCELLED')
    .forEach((o) =>
      o.items.forEach((item) => {
        const row = products.get(item.productId) ?? { id: item.productId, name: item.productName, imageUrl: item.imageUrl, quantity: 0, revenue: 0 };
        row.quantity += item.quantity;
        row.revenue += item.lineTotalMinor;
        products.set(item.productId, row);
      }),
    );

  const byStatus = ORDER_STATUSES.map((status) => ({ status, count: current.filter((o) => o.status === status).length }));

  return {
    current: summarize(current),
    previous: summarize(previous),
    hasPrevious: previous.length > 0,
    days,
    buckets,
    unit,
    byStatus,
    totalOrders: current.length,
    topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
  };
}

// Thẻ chỉ số: giá trị + % thay đổi so với kỳ trước (lên/xuống bằng mũi tên + chữ, không chỉ dùng màu)
function KpiCard({ icon, label, value, change, inverse = false, compareLabel }) {
  const { t } = useLanguage();
  const hasChange = change !== null && Number.isFinite(change);
  const good = hasChange && (inverse ? change <= 0 : change >= 0);
  return (
    <div className="account-card kpi-card">
      <div className="kpi-card__head">
        <span className="kpi-card__label">{label}</span>
        <span className="kpi-card__icon" aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="kpi-card__value">{value}</p>
      <p className="kpi-card__change">
        {hasChange ? (
          <span className={`kpi-card__delta ${good ? 'kpi-card__delta--good' : 'kpi-card__delta--bad'}`}>
            <Icon name={change >= 0 ? 'arrowUp' : 'arrowDown'} size={14} />
            {Math.abs(change * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="kpi-card__delta">—</span>
        )}
        <span className="cell-sub">{hasChange ? compareLabel : t('admin.dashboard.noCompare')}</span>
      </p>
    </div>
  );
}

// Tổng hợp tồn kho: số lượng chung + phân bố SKU theo tình trạng. Chi tiết từng SKU xem ở trang Tồn kho.
const STOCK_LEVELS = [
  { id: 'ok', to: '/admin/inventory' },
  { id: 'low', to: '/admin/inventory?filter=low' },
  { id: 'out', to: '/admin/inventory?filter=out' },
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
        <Link to="/admin/inventory" className="account-link">
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

      {/* Thanh phân bố SKU theo tình trạng (kèm số + chữ bên dưới, không chỉ dựa vào màu) */}
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

function Dashboard({ shopId }) {
  const { t, language } = useLanguage();
  // period: 7 | 30 | 90 | 'custom'. Với 'custom', draft là giá trị đang nhập; range chỉ đổi khi khoảng ngày hợp lệ
  const [period, setPeriod] = useState(30);
  const [draft, setDraft] = useState(() => ({ from: toInput(addDays(Date.now(), -29)), to: toInput(Date.now()) }));
  const [data, setData] = useState(null);
  const todayInput = toInput(Date.now());
  const draftFrom = fromInput(draft.from);
  const draftTo = fromInput(draft.to);
  const draftError = draftFrom === null || draftTo === null ? 'missing' : draftFrom > draftTo ? 'order' : draftTo > startOfDay(Date.now()) ? 'future' : null;
  const [customRange, setCustomRange] = useState(() => ({ from: fromInput(draft.from), to: fromInput(draft.to) }));
  useEffect(() => {
    if (!draftError) setCustomRange({ from: draftFrom, to: draftTo });
  }, [draftError, draftFrom, draftTo]);
  const range = useMemo(() => {
    if (period === 'custom') return customRange;
    const to = startOfDay(Date.now());
    return { from: addDays(to, -(period - 1)), to };
  }, [period, customRange]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [orders, products, returns, cod] = await Promise.all([
        getShopOrders(shopId, { limit: 1000 }),
        getShopProducts(shopId),
        getShopReturns(shopId),
        getCodCollections(shopId, { limit: 1000 }),
      ]);
      // Tổng hợp tồn kho: cùng phạm vi với trang Tồn kho (mọi SKU của sản phẩm chưa gỡ) để số liệu khớp khi bấm "Xem tất cả"
      const listed = products.items.filter((p) => p.status !== 'REMOVED');
      const details = await Promise.all(listed.map((p) => getShopProduct(shopId, p.id)));
      const variants = details.flatMap((product) => product.variants);
      const levels = { ok: 0, low: 0, out: 0 };
      variants.forEach((v) => {
        levels[stockLevel(v)] += 1;
      });
      const stock = {
        products: listed.length,
        skus: variants.length,
        onHand: variants.reduce((sum, v) => sum + v.quantityOnHand, 0),
        reserved: variants.reduce((sum, v) => sum + v.quantityReserved, 0),
        available: variants.reduce((sum, v) => sum + Math.max(0, v.availableQuantity), 0),
        levels,
      };
      if (active) setData({ orders: orders.items, products: products.items, returns: returns.items, cod: cod.items, stock });
    })().catch((error) => console.error(error));
    return () => {
      active = false;
    };
  }, [shopId]);

  const stats = useMemo(() => (data ? buildStats(data.orders, range) : null), [data, range]);
  if (!data || !stats) return <div className="account-skeleton" />;

  const change = (key) => (stats.hasPrevious && stats.previous[key] ? (stats.current[key] - stats.previous[key]) / stats.previous[key] : null);
  const compareLabel = t('admin.dashboard.vsPrevious', { days: stats.days });
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const fullDate = (time) => new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(time));
  const num = (value) => value.toLocaleString(locale);
  const count = (statuses) => data.orders.filter((o) => statuses.includes(o.status)).length;
  const todos = [
    { id: 'toConfirm', icon: 'clock', value: count(['PENDING_CONFIRMATION']), to: '/admin/orders?status=PENDING_CONFIRMATION' },
    { id: 'toShip', icon: 'package', value: count(['PROCESSING', 'READY_TO_SHIP']), to: '/admin/orders?status=PROCESSING' },
    { id: 'shipping', icon: 'truck', value: count(['SHIPPED']), to: '/admin/orders?status=SHIPPED' },
    { id: 'returns', icon: 'refresh', value: data.returns.filter((r) => r.status === 'REQUESTED').length, to: '/admin/returns' },
    { id: 'codToReconcile', icon: 'card', value: data.cod.filter((c) => c.status === 'COLLECTED').length, to: '/admin/cod?status=COLLECTED' },
    { id: 'outOfStock', icon: 'alert', value: data.stock.levels.out, to: '/admin/inventory?filter=out' },
  ];
  const maxStatus = Math.max(1, ...stats.byStatus.map((row) => row.count));
  const maxQuantity = Math.max(1, ...stats.topProducts.map((row) => row.quantity));
  const recent = [...data.orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 6);

  return (
    <div className="dashboard">
      {/* Chọn kỳ thống kê — 3 mốc nhanh + tùy chọn từ ngày … đến ngày */}
      <div className="dashboard__filterbar">
        <div className="dashboard__filters" role="group" aria-label={t('admin.dashboard.period')}>
          {PERIODS.map((value) => (
            <button key={value} type="button" className={`segmented__btn ${period === value ? 'segmented__btn--active' : ''}`} aria-pressed={period === value} onClick={() => setPeriod(value)}>
              {t('admin.dashboard.lastDays', { days: value })}
            </button>
          ))}
          <button type="button" className={`segmented__btn ${period === 'custom' ? 'segmented__btn--active' : ''}`} aria-pressed={period === 'custom'} onClick={() => setPeriod('custom')}>
            <Icon name="calendar" size={14} />
            {t('admin.dashboard.custom')}
          </button>
        </div>

        {period === 'custom' ? (
          <div className="date-range" role="group" aria-label={t('admin.dashboard.customRange')}>
            <label className="date-range__field">
              <span>{t('admin.dashboard.from')}</span>
              <input type="date" className="admin-select" value={draft.from} max={draft.to || todayInput} onChange={(e) => setDraft({ ...draft, from: e.target.value })} aria-invalid={draftError === 'order' || undefined} />
            </label>
            <label className="date-range__field">
              <span>{t('admin.dashboard.to')}</span>
              <input type="date" className="admin-select" value={draft.to} min={draft.from || undefined} max={todayInput} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-invalid={draftError === 'order' || undefined} />
            </label>
            {draftError ? (
              <span className="date-range__error" role="alert">
                {t(`admin.dashboard.rangeErrors.${draftError}`)}
              </span>
            ) : (
              <span className="cell-sub">{t('admin.dashboard.daysCount', { count: stats.days })}</span>
            )}
          </div>
        ) : (
          <span className="cell-sub dashboard__range">
            {fullDate(range.from)} – {fullDate(range.to)}
          </span>
        )}
      </div>

      <div className="kpi-grid">
        <KpiCard icon="receipt" label={t('admin.dashboard.kpi.revenue')} value={formatPrice(stats.current.revenue, language)} change={change('revenue')} compareLabel={compareLabel} />
        <KpiCard icon="bag" label={t('admin.dashboard.kpi.orders')} value={num(stats.current.orders)} change={change('orders')} compareLabel={compareLabel} />
        <KpiCard icon="tag" label={t('admin.dashboard.kpi.average')} value={formatPrice(stats.current.average, language)} change={change('average')} compareLabel={compareLabel} />
        <KpiCard
          icon="close"
          label={t('admin.dashboard.kpi.cancelRate')}
          value={`${(stats.current.cancelRate * 100).toFixed(1)}%`}
          change={stats.hasPrevious ? stats.current.cancelRate - stats.previous.cancelRate : null}
          inverse
          compareLabel={compareLabel}
        />
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
          <ul className="todo-list">
            {todos.map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="todo-list__item">
                  <span className="todo-list__icon" aria-hidden="true">
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="todo-list__label">{t(`admin.dashboard.todoItems.${item.id}`)}</span>
                  <span className={`todo-list__value ${item.value > 0 ? 'todo-list__value--active' : ''}`}>{item.value}</span>
                  <Icon name="chevronRight" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="dashboard__row">
        <section className="account-card dashboard-card">
          <div className="dashboard-card__head">
            <h2 className="account-card__title">{t('admin.dashboard.statusTitle')}</h2>
            <span className="cell-sub">{t('admin.dashboard.totalOrders', { count: stats.totalOrders })}</span>
          </div>
          <ul className="hbar-list">
            {stats.byStatus.map((row) => (
              <li key={row.status} className="hbar">
                <span className="hbar__label">{t(`shopOrderStatus.${row.status}`)}</span>
                <span className="hbar__track">
                  <span className="hbar__fill" style={{ width: `${(row.count / maxStatus) * 100}%` }} />
                </span>
                <span className="hbar__value">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="account-card dashboard-card">
          <div className="dashboard-card__head">
            <h2 className="account-card__title">{t('admin.dashboard.topTitle')}</h2>
            <Link to="/admin/products" className="account-link">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="account-muted">{t('admin.dashboard.noSales')}</p>
          ) : (
            <ol className="top-list">
              {stats.topProducts.map((row, index) => (
                <li key={row.id} className="top-list__item">
                  <span className="top-list__rank">{index + 1}</span>
                  <span className="top-list__thumb">{row.imageUrl ? <img src={row.imageUrl} alt="" /> : null}</span>
                  <span className="top-list__text">
                    <Link to={`/admin/products/${row.id}`} className="top-list__name">
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

      <div className="dashboard__row dashboard__row--wide">
        <section className="account-card admin-card">
          <div className="admin-toolbar">
            <h2 className="account-card__title">{t('admin.dashboard.recentOrders')}</h2>
            <Link to="/admin/orders" className="account-link admin-toolbar__end">
              {t('admin.dashboard.viewAll')}
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.orders.columns.code')}</th>
                  <th>{t('admin.orders.columns.buyer')}</th>
                  <th className="num">{t('admin.orders.columns.total')}</th>
                  <th>{t('admin.orders.columns.status')}</th>
                  <th>{t('admin.orders.columns.placedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/admin/orders/${order.id}`} className="account-link">
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

        <StockSummary stock={data.stock} num={num} />
      </div>
    </div>
  );
}

/**
 * /admin — Tổng quan (Dashboard). Bố cục phổ biến của trang quản trị bán hàng:
 *   [Chọn kỳ: 7 / 30 / 90 ngày / Tùy chọn từ ngày … đến ngày]
 *   [4 thẻ chỉ số: Doanh thu • Đơn hàng • Giá trị đơn TB • Tỉ lệ hủy — kèm % so với kỳ trước]
 *   [Biểu đồ doanh thu (2/3)            | Việc cần làm (1/3)]
 *   [Đơn theo trạng thái                | Sản phẩm bán chạy]
 *   [Đơn hàng mới (2/3)                 | Tổng hợp tồn kho (1/3)]
 */
function AdminDashboardScreen() {
  const { t } = useLanguage();
  const { admin } = useAdmin();
  return (
    <AdminPage title={t('admin.dashboard.title')} subtitle={t('admin.dashboard.greeting', { name: admin?.displayName ?? '' })}>
      <RequireShop>{(shopId) => <Dashboard shopId={shopId} />}</RequireShop>
    </AdminPage>
  );
}

export default AdminDashboardScreen;
