import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { LOCALES } from '../../i18n';
import { formatPrice } from '../../utils/format';

// Biểu đồ cột doanh thu (1 chuỗi số liệu => 1 màu thương hiệu, không cần chú thích màu).
// Cột mảnh bo góc 4px ở đầu cột, lưới mờ, rê chuột vào cột để xem chi tiết; có bảng ẩn cho trình đọc màn hình.
const HEIGHT = 260;
const PAD = { top: 12, right: 8, bottom: 28, left: 56 };

// Số tiền gọn cho trục: 1.250.000 -> "1,3 tr" (vi) | "1.3M" (en)
function short(value, language) {
  const locale = LOCALES[language] ?? 'vi-VN';
  const fmt = (n) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  if (value >= 1e6) return language === 'vi' ? `${fmt(value / 1e6)} tr` : `${fmt(value / 1e6)}M`;
  if (value >= 1e3) return language === 'vi' ? `${fmt(value / 1e3)} N` : `${fmt(value / 1e3)}K`;
  return fmt(value);
}

// Mốc trục tròn số: chọn bước 1 / 2 / 5 × 10^n để có ~4 vạch
function niceMax(max) {
  if (max <= 0) return { top: 1000000, step: 250000 };
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
  return { top: Math.ceil(max / step) * step, step };
}

function RevenueChart({ buckets, unit = 'day' }) {
  const { t, language } = useLanguage();
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const locale = LOCALES[language] ?? 'vi-VN';
  const fmt = (time, options) => new Intl.DateTimeFormat(locale, options).format(new Date(time));
  const day = (time) => fmt(time, { day: '2-digit', month: '2-digit' });
  const fullDay = (time) => fmt(time, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const lastDay = (b) => b.end - 86400000;
  // Nhãn trục gọn (không năm) — năm hiển thị 1 lần ở góc trái trục ngang
  const tickOf = (b) => (unit === 'month' ? fmt(b.start, { month: 'short' }) : day(b.start));
  // Nhãn đầy đủ (có năm) cho tooltip và bảng ẩn
  const labelOf = (b) => {
    if (unit === 'month') return fmt(b.start, { month: 'long', year: 'numeric' });
    if (unit === 'week') return `${day(b.start)} – ${fullDay(lastDay(b))}`;
    return fullDay(b.start);
  };
  // Năm của dữ liệu: "2026" hoặc "2025–26" nếu khoảng thời gian vắt qua 2 năm
  const firstYear = new Date(buckets[0]?.start ?? Date.now()).getFullYear();
  const lastYear = new Date(buckets.length ? lastDay(buckets[buckets.length - 1]) : Date.now()).getFullYear();
  const yearLabel = firstYear === lastYear ? String(firstYear) : `${firstYear}–${String(lastYear).slice(-2)}`;
  const yearTitle = firstYear === lastYear ? t('admin.dashboard.year', { year: firstYear }) : `${t('admin.dashboard.year', { year: firstYear })} – ${lastYear}`;

  const { top, step } = niceMax(Math.max(...buckets.map((b) => b.revenue)));
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / buckets.length;
  const barW = Math.max(3, Math.min(28, band * 0.62));
  const y = (value) => PAD.top + plotH - (value / top) * plotH;
  const ticks = [];
  for (let v = 0; v <= top + 1; v += step) ticks.push(v);
  const every = Math.ceil(buckets.length / Math.max(2, Math.floor(plotW / 70)));

  // Cột bo tròn 4px ở đầu cột, chân cột thẳng trên trục
  const barPath = (x, value) => {
    const h = Math.max(0, (value / top) * plotH);
    if (h === 0) return '';
    const r = Math.min(4, h, barW / 2);
    const yTop = PAD.top + plotH - h;
    const yBase = PAD.top + plotH;
    return `M${x},${yBase} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${yBase} Z`;
  };

  const active = hover === null ? null : buckets[hover];
  const tipLeft = hover === null ? 0 : Math.min(Math.max(PAD.left + band * hover + band / 2, 90), width - 90);

  return (
    <div className="revenue-chart" ref={wrapRef} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={HEIGHT} role="img" aria-label={`${t('admin.dashboard.revenueTitle')} · ${yearTitle}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} className={v === 0 ? 'revenue-chart__axis' : 'revenue-chart__grid'} />
            <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="revenue-chart__tick">
              {short(v, language)}
            </text>
          </g>
        ))}
        {/* Năm của số liệu — góc dưới bên trái khung, ngang hàng nhãn ngày, dưới cột trục tiền */}
        <text x={0} y={HEIGHT - 8} textAnchor="start" className="revenue-chart__year">
          <title>{yearTitle}</title>
          {yearLabel}
        </text>
        {buckets.map((b, i) => {
          const x = PAD.left + band * i + (band - barW) / 2;
          return (
            <g key={b.start}>
              <path d={barPath(x, b.revenue)} className={`revenue-chart__bar ${hover !== null && hover !== i ? 'revenue-chart__bar--dim' : ''}`} />
              {i % every === 0 && (
                <text x={PAD.left + band * i + band / 2} y={HEIGHT - 8} textAnchor="middle" className="revenue-chart__tick">
                  {tickOf(b)}
                </text>
              )}
              {/* Vùng rê chuột rộng hơn cột để dễ trỏ */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${labelOf(b)}: ${formatPrice(b.revenue, language)}`}
              />
            </g>
          );
        })}
      </svg>

      {active && (
        <div className="revenue-chart__tip" style={{ left: tipLeft, top: Math.max(4, y(active.revenue) - 64) }} role="status">
          <span className="revenue-chart__tip-date">{labelOf(active)}</span>
          <strong>{formatPrice(active.revenue, language)}</strong>
          <span>{t('admin.dashboard.ordersCount', { count: active.orders })}</span>
        </div>
      )}

      <table className="visually-hidden">
        <caption>{`${t('admin.dashboard.revenueTitle')} · ${yearTitle}`}</caption>
        <thead>
          <tr>
            <th>{t('admin.dashboard.time')}</th>
            <th>{t('admin.dashboard.kpi.revenue')}</th>
            <th>{t('admin.dashboard.kpi.orders')}</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.start}>
              <td>{labelOf(b)}</td>
              <td>{formatPrice(b.revenue, language)}</td>
              <td>{b.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RevenueChart;
