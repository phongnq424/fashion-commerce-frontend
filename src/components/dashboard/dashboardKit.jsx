import { useEffect, useMemo, useState } from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './Dashboard.css';

// =====================================================================
// BỘ DÙNG CHUNG CHO DASHBOARD — Kênh người bán (/seller) và Quản trị sàn (/admin).
//   usePeriod()   : chọn kỳ 7 / 30 / 90 ngày hoặc tùy chọn ngày -> { range: {from, to}, ... }
//   PeriodFilter  : thanh chọn kỳ
//   buildStats()  : chỉ số kỳ hiện tại + kỳ trước cùng độ dài, chia cột biểu đồ, đếm theo trạng thái
//   KpiCard       : thẻ chỉ số kèm % so với kỳ trước
// =====================================================================

export const PERIODS = [7, 30, 90];

export const startOfDay = (time) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};
export const addDays = (time, n) => {
  const date = new Date(time);
  date.setDate(date.getDate() + n);
  return date.getTime();
};
export const daysBetween = (from, to) => Math.round((to - from) / 86400000) + 1;
export const toInput = (time) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const fromInput = (value) => {
  const [y, m, d] = (value ?? '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d).getTime() : null;
};

/**
 * Số liệu của khoảng [from, to] (tính cả ngày `to`) và kỳ liền trước cùng độ dài.
 * @param orders  danh sách đơn có placedAt, status
 * @param options amount(o) -> số tiền của đơn; statuses -> thứ tự trạng thái để đếm;
 *                isCancelled(o) -> đơn hủy (không tính doanh thu, tính vào tỉ lệ hủy)
 */
export function buildStats(orders, { from, to }, { amount, statuses, isCancelled = (o) => o.status === 'CANCELLED' }) {
  const days = daysBetween(from, to);
  const end = addDays(to, 1);
  const prevFrom = addDays(from, -days);
  const placed = (order) => new Date(order.placedAt).getTime();
  const current = orders.filter((o) => placed(o) >= from && placed(o) < end);
  const previous = orders.filter((o) => placed(o) >= prevFrom && placed(o) < from);

  const summarize = (list) => {
    const valid = list.filter((o) => !isCancelled(o));
    const revenue = valid.reduce((sum, o) => sum + amount(o), 0);
    return { revenue, orders: valid.length, average: valid.length ? Math.round(revenue / valid.length) : 0, cancelRate: list.length ? (list.length - valid.length) / list.length : 0 };
  };

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
    .filter((o) => !isCancelled(o))
    .forEach((o) => {
      const bucket = buckets.find((b) => placed(o) >= b.start && placed(o) < b.end);
      if (bucket) {
        bucket.revenue += amount(o);
        bucket.orders += 1;
      }
    });

  const current$ = summarize(current);
  const previous$ = summarize(previous);
  const hasPrevious = previous.length > 0;
  return {
    current: current$,
    previous: previous$,
    hasPrevious,
    // % thay đổi so với kỳ trước (tỉ lệ hủy: chênh lệch điểm %)
    change: (key) => {
      if (!hasPrevious) return null;
      if (key === 'cancelRate') return current$.cancelRate - previous$.cancelRate;
      return previous$[key] ? (current$[key] - previous$[key]) / previous$[key] : null;
    },
    days,
    buckets,
    unit,
    byStatus: statuses.map((status) => ({ status, count: current.filter((o) => o.status === status).length })),
    totalOrders: current.length,
  };
}

/** Kỳ thống kê: 7 / 30 / 90 ngày gần nhất hoặc khoảng ngày tự chọn (đã kiểm tra hợp lệ). */
export function usePeriod(initial = 30) {
  const [period, setPeriod] = useState(initial);
  const [draft, setDraft] = useState(() => ({ from: toInput(addDays(Date.now(), -(initial - 1))), to: toInput(Date.now()) }));
  const draftFrom = fromInput(draft.from);
  const draftTo = fromInput(draft.to);
  const draftError = draftFrom === null || draftTo === null ? 'missing' : draftFrom > draftTo ? 'order' : draftTo > startOfDay(Date.now()) ? 'future' : null;
  const [customRange, setCustomRange] = useState(() => ({ from: draftFrom, to: draftTo }));
  useEffect(() => {
    if (!draftError) setCustomRange({ from: draftFrom, to: draftTo });
  }, [draftError, draftFrom, draftTo]);
  const range = useMemo(() => {
    if (period === 'custom') return customRange;
    const to = startOfDay(Date.now());
    return { from: addDays(to, -(period - 1)), to };
  }, [period, customRange]);
  return { period, setPeriod, draft, setDraft, draftError, range };
}

/** Thanh chọn kỳ: [7 ngày][30 ngày][90 ngày][Tùy chọn]  dd/mm/yyyy – dd/mm/yyyy */
export function PeriodFilter({ state, days }) {
  const { t, language } = useLanguage();
  const { period, setPeriod, draft, setDraft, draftError, range } = state;
  const todayInput = toInput(Date.now());
  const fullDate = (time) => new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(time));
  return (
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
            <input type="date" className="seller-select" value={draft.from} max={draft.to || todayInput} onChange={(e) => setDraft({ ...draft, from: e.target.value })} aria-invalid={draftError === 'order' || undefined} />
          </label>
          <label className="date-range__field">
            <span>{t('admin.dashboard.to')}</span>
            <input type="date" className="seller-select" value={draft.to} min={draft.from || undefined} max={todayInput} onChange={(e) => setDraft({ ...draft, to: e.target.value })} aria-invalid={draftError === 'order' || undefined} />
          </label>
          {draftError ? (
            <span className="date-range__error" role="alert">
              {t(`admin.dashboard.rangeErrors.${draftError}`)}
            </span>
          ) : (
            <span className="cell-sub">{t('admin.dashboard.daysCount', { count: days })}</span>
          )}
        </div>
      ) : (
        <span className="cell-sub dashboard__range">
          {fullDate(range.from)} – {fullDate(range.to)}
        </span>
      )}
    </div>
  );
}

export function KpiCard({ icon, label, value, change, inverse = false, compareLabel, hint }) {
  const { t } = useLanguage();
  const hasChange = change !== null && change !== undefined && Number.isFinite(change);
  const good = hasChange && (inverse ? change <= 0 : change >= 0);
  return (
    <div className="account-card kpi-card">
      <div className="kpi-card__head">
        <span className="kpi-card__label" title={hint}>
          {label}
        </span>
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

/** Danh sách "Việc cần làm": [{ id, icon, label, value, to }] */
export function TodoList({ items, LinkComponent }) {
  return (
    <ul className="todo-list">
      {items.map((item) => (
        <li key={item.id}>
          <LinkComponent to={item.to} className="todo-list__item">
            <span className="todo-list__icon" aria-hidden="true">
              <Icon name={item.icon} size={16} />
            </span>
            <span className="todo-list__label">{item.label}</span>
            <span className={`todo-list__value ${item.value > 0 || String(item.value).endsWith('+') ? 'todo-list__value--active' : ''}`}>{item.value ?? '—'}</span>
            <Icon name="chevronRight" size={16} />
          </LinkComponent>
        </li>
      ))}
    </ul>
  );
}

/** Thanh ngang theo trạng thái: [{ status, count }] */
export function StatusBars({ rows, labelOf }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className="hbar-list">
      {rows.map((row) => (
        <li key={row.status} className="hbar">
          <span className="hbar__label">{labelOf(row.status)}</span>
          <span className="hbar__track">
            <span className="hbar__fill" style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="hbar__value">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}
